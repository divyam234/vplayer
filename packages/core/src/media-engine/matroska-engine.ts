/**
 * MatroskaMediaEngine — MediaEngine for Matroska and WebM files whose embedded tracks are used.
 *
 * Browsers expose neither the audio tracks nor the subtitles stored inside a Matroska file, and
 * play only its first audio track. This engine reads the file's track list over range requests and
 * either plays the file natively (when there is nothing to choose) or through Media Source
 * Extensions with the chosen audio track. It also reads embedded text subtitles on demand.
 *
 * Everything lives behind a dynamic import, so a player that does not set `embeddedTracks` never
 * loads it, and neither does one that opens another kind of file.
 *
 * Events, in addition to the usual ones:
 *   - `tracks`            { audioTracks, activeAudioTrack, subtitleTracks }
 *   - `audiotrackchange`  { id }
 *   - `subtitlecues`      { id, cues, status }   (cues read so far for the selected subtitle track)
 *   - `loadstage`         { stage }              (what is being done before playback starts; null when it has)
 */

import type { EmbeddedTracks, TracksSnapshot } from '../embedded-tracks/controller'
import type { LoadStage } from '../state/slices'
import type { SubtitleCue } from '../subtitle-parser'
import { BaseMediaEngine } from './base-engine'

export interface MatroskaMediaEngineOptions {
  src: string
  /** Locale for language names such as "Japanese". */
  locale?: string
  /** Name for a track that has neither a title nor a language. */
  trackName?: (number: number) => string
  /** Language (e.g. "jpn") to start on when the file has an audio track in it. */
  preferredAudioLanguage?: string
}

export interface EngineAudioTrack {
  id: number
  label: string
  detail: string
  lang?: string
  unsupported: boolean
}

export interface EngineSubtitleTrack {
  id: string
  label: string
  lang?: string
  unsupported: boolean
}

export interface EngineTracksEvent {
  audioTracks: EngineAudioTrack[]
  activeAudioTrack: number | null
  subtitleTracks: EngineSubtitleTrack[]
}

export interface EngineSubtitleCuesEvent {
  id: string
  cues: SubtitleCue[]
  status: 'loading' | 'ready' | 'error'
}

export class MatroskaMediaEngine extends BaseMediaEngine {
  private tracks: EmbeddedTracks | null = null
  private unsubscribe: (() => void) | null = null
  private abort: AbortController | null = null
  private sentAudio: TracksSnapshot['audio'] | null = null
  private sentSubtitles: TracksSnapshot['subtitles'] | null = null
  private sentActiveAudio: number | undefined
  private sentCues: TracksSnapshot['cues'] | null = null
  private sentStatus: TracksSnapshot['subtitleStatus'] | null = null
  private sentActiveSubtitle: number | undefined
  private remuxed = false
  /** Reading the file starts at once, so that is where loading starts. */
  loadStage: LoadStage | null = 'tracks'
  private readonly options: MatroskaMediaEngineOptions
  /** Resolves once the element has its source (or the plain file was chosen after a failure). */
  private ready: Promise<void>
  private markReady: () => void = () => {}

  constructor(video: HTMLVideoElement, options: MatroskaMediaEngineOptions) {
    super(video)
    this.options = options
    this.ready = new Promise((resolve) => {
      this.markReady = resolve
    })
    video.addEventListener('timeupdate', this.onTimeUpdate)
    // Playback has started once there is something to show, or it has failed.
    for (const event of ['canplay', 'playing', 'error'] as const) this.on(event, () => this.setStage(null))
    void this.start()
  }

  /** The source is only known after the file has been inspected, so playing waits for it. */
  override async play(): Promise<void> {
    await this.ready
    if (this.destroyed) return
    return super.play()
  }

  private setStage(stage: LoadStage | null): void {
    if (this.destroyed || this.loadStage === stage) return
    this.loadStage = stage
    this.emit('loadstage', { stage })
  }

  private onTimeUpdate = (): void => {
    this.tracks?.setPlayhead(this.element.currentTime)
  }

  private async start(): Promise<void> {
    const abort = new AbortController()
    this.abort = abort
    try {
      // Loaded on demand: this is what keeps the feature out of the default bundle.
      const { createEmbeddedTracks } = await import('../embedded-tracks')
      if (this.destroyed) return
      const tracks = createEmbeddedTracks({
        url: this.options.src,
        locale: this.options.locale ?? 'en',
        trackName: this.options.trackName ?? ((number) => `Track ${number}`),
        preferredAudioLanguage: this.options.preferredAudioLanguage,
        onStage: (stage) => this.setStage(stage),
      })
      this.tracks = tracks
      this.unsubscribe = tracks.subscribe(() => this.publish())
      // If remuxed playback breaks, carry on with the plain file from the same position.
      tracks.onFallback(() => this.useDirectSource(tracks.takeResumeTime()))
      const source = await tracks.load(abort.signal)
      if (this.destroyed) {
        tracks.dispose()
        return
      }
      this.remuxed = source.src !== this.options.src
      tracks.attachVideo(this.element)
      this.element.src = source.src
      this.setStage('starting')
      this.markReady()
      this.publish()
    } catch (error) {
      if (this.destroyed) return
      // Anything unexpected: play the file as the player would have without this engine.
      console.warn('[vplayer] embedded tracks are unavailable:', error)
      this.useDirectSource()
    }
  }

  private useDirectSource(resumeAt?: number): void {
    this.remuxed = false
    const video = this.element
    if (resumeAt) {
      video.addEventListener(
        'loadedmetadata',
        () => {
          video.currentTime = resumeAt
        },
        { once: true },
      )
    }
    video.src = this.options.src
    this.setStage('starting')
    this.markReady()
    this.publish()
  }

  /** Mirrors the controller's state as events, only for what changed. */
  private publish(): void {
    const tracks = this.tracks
    if (!tracks || this.destroyed) return
    const snapshot = tracks.getSnapshot()

    const listsChanged = snapshot.audio !== this.sentAudio || snapshot.subtitles !== this.sentSubtitles
    const audioChanged = snapshot.activeAudio !== this.sentActiveAudio
    this.sentAudio = snapshot.audio
    this.sentSubtitles = snapshot.subtitles
    this.sentActiveAudio = snapshot.activeAudio
    if (listsChanged) {
      const event: EngineTracksEvent = {
        // A single audio track needs no menu, so audio is only listed when there is a choice.
        audioTracks: snapshot.audio.length > 1 ? snapshot.audio.map(toEngineAudio) : [],
        activeAudioTrack: snapshot.activeAudio ?? null,
        subtitleTracks: snapshot.subtitles.map((track) => ({
          id: track.id,
          label: track.label,
          lang: track.language,
          unsupported: !track.supported,
        })),
      }
      this.emit('tracks', event)
    } else if (audioChanged && snapshot.activeAudio !== undefined) {
      this.emit('audiotrackchange', { id: snapshot.activeAudio })
    }

    const id = snapshot.activeSubtitle === undefined ? undefined : `embedded:${snapshot.activeSubtitle}`
    if (
      id !== undefined &&
      (snapshot.cues !== this.sentCues ||
        snapshot.subtitleStatus !== this.sentStatus ||
        snapshot.activeSubtitle !== this.sentActiveSubtitle)
    ) {
      this.sentCues = snapshot.cues
      this.sentStatus = snapshot.subtitleStatus
      this.sentActiveSubtitle = snapshot.activeSubtitle
      const event: EngineSubtitleCuesEvent = {
        id,
        cues: snapshot.cues.map((cue, index) => ({ index, start: cue.start, end: cue.end, text: cue.text })),
        status: snapshot.subtitleStatus === 'idle' ? 'loading' : snapshot.subtitleStatus,
      }
      this.emit('subtitlecues', event)
    } else if (id === undefined) {
      this.sentCues = null
      this.sentStatus = null
      this.sentActiveSubtitle = undefined
    }
  }

  async selectAudioTrack(id: number): Promise<boolean> {
    return (await this.tracks?.selectAudio(id)) ?? false
  }

  selectSubtitleTrack(id: string | null): void {
    const number = id?.startsWith('embedded:') ? Number(id.slice('embedded:'.length)) : undefined
    this.tracks?.selectSubtitle(Number.isInteger(number) ? number : undefined)
  }

  override load(): void {
    // The player reloads after an error. A remuxed source cannot be reloaded; the plain file can.
    if (this.remuxed) this.useDirectSource(this.tracks?.takeResumeTime() ?? (this.element.currentTime || undefined))
    else if (this.element.getAttribute('src')) super.load()
    else void this.start()
  }

  override destroy(): void {
    if (this.destroyed) return
    this.element.removeEventListener('timeupdate', this.onTimeUpdate)
    this.abort?.abort()
    this.unsubscribe?.()
    this.tracks?.dispose()
    this.tracks = null
    this.markReady()
    super.destroy()
  }
}

function toEngineAudio(track: TracksSnapshot['audio'][number]): EngineAudioTrack {
  return {
    id: track.id,
    label: track.label,
    detail: track.detail,
    lang: track.language,
    unsupported: track.mode === 'unsupported',
  }
}
