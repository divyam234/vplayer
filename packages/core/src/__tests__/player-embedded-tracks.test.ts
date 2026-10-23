/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { MediaEngine, MediaEngineError, MediaEngineEvent, MediaEngineEventHandler } from '../media-engine'
import { MatroskaMediaEngine, NativeVideoEngine } from '../media-engine'
import { createPlayer } from '../player'
import { STORAGE_KEYS } from '../storage'
import type { SubtitleTrack } from '../subtitle-parser'
import { fixture, serve } from './fixtures/helpers'

type Served = Awaited<ReturnType<typeof serve>>

class FakeEngine implements MediaEngine {
  readonly element: HTMLVideoElement
  currentTime = 0
  duration = 120
  volume = 1
  muted = false
  playbackRate = 1
  paused = true
  ended = false
  looping = false
  buffered = { length: 0, start: () => 0, end: () => 0 } as TimeRanges
  videoWidth = 1920
  videoHeight = 1080
  error: MediaEngineError | null = null
  audioSwitches: number[] = []
  subtitleSwitches: Array<string | null> = []
  /** Track ids this engine refuses to play. */
  refuse = new Set<number>()
  private listeners = new Map<string, Set<MediaEngineEventHandler>>()

  constructor(video: HTMLVideoElement) {
    this.element = video
  }

  async play() {}
  pause() {}
  seek() {}
  setVolume() {}
  setMuted() {}
  setPlaybackRate() {}
  setLooping() {}
  load() {}
  async requestPictureInPicture() {}
  async exitPictureInPicture() {}
  async screenshot() {
    return null
  }
  async selectAudioTrack(id: number) {
    this.audioSwitches.push(id)
    if (this.refuse.has(id)) return false
    this.emit('audiotrackchange', { id })
    return true
  }
  selectSubtitleTrack(id: string | null) {
    this.subtitleSwitches.push(id)
  }
  on(event: MediaEngineEvent, handler: MediaEngineEventHandler) {
    const set = this.listeners.get(event) ?? new Set<MediaEngineEventHandler>()
    set.add(handler)
    this.listeners.set(event, set)
    return () => set.delete(handler)
  }
  destroy() {
    this.listeners.clear()
  }
  emit(event: MediaEngineEvent, ...args: unknown[]) {
    this.listeners.get(event)?.forEach((handler) => handler(...args))
  }
}

function mountPlayer(options: Parameters<typeof createPlayer>[0]) {
  const player = createPlayer(options)
  player.mount(document.createElement('video'), document.createElement('div'))
  return player
}

const round = (cues: Array<{ index: number; start: number; end: number; text: string }>) =>
  cues.map((cue) => ({ ...cue, start: Math.round(cue.start * 1000) / 1000, end: Math.round(cue.end * 1000) / 1000 }))

// What the viewer is told while the file is read before playback can start.
const stagesOf = (player: ReturnType<typeof mountPlayer>) => {
  const seen: Array<string | null> = [player.store.state.loadStage]
  player.store.subscribe(() => {
    const stage = player.store.state.loadStage
    if (seen.at(-1) !== stage) seen.push(stage)
  })
  return seen
}

describe('embedded tracks (the embeddedTracks option)', () => {
  let server: Served

  beforeEach(async () => {
    localStorage.clear()
    server = await serve(fixture('multi-track.mkv'))
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await server.close()
  })

  describe('when it is off', () => {
    it('plays Matroska with the native engine and requests nothing itself', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch')
      const player = mountPlayer({ src: server.url, type: 'video/x-matroska' })

      expect(player.engine).toBeInstanceOf(NativeVideoEngine)
      expect(player.engine?.element.getAttribute('src')).toBe(server.url)
      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(fetchSpy).not.toHaveBeenCalled()
      expect(server.requests).toEqual([])
      expect(player.store.state.audioTracks).toEqual([])
      expect(player.store.state.subtitleTracks).toEqual([])
      player.destroy()
    })

    it('does not use the option unless it is exactly true', async () => {
      const player = mountPlayer({ src: server.url, embeddedTracks: undefined })
      expect(player.engine).toBeInstanceOf(NativeVideoEngine)
      player.destroy()
    })
  })

  describe('when it is on', () => {
    it('leaves other kinds of files alone', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch')
      const player = mountPlayer({ src: '/clip.mp4', embeddedTracks: true })
      expect(player.engine).toBeInstanceOf(NativeVideoEngine)
      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(fetchSpy).not.toHaveBeenCalled()
      player.destroy()
    })

    it('recognizes Matroska by type as well as by extension', () => {
      const byType = mountPlayer({ src: '/download?id=7', type: 'video/x-matroska', embeddedTracks: true })
      expect(byType.engine).toBeInstanceOf(MatroskaMediaEngine)
      byType.destroy()
      const byExtension = mountPlayer({ src: '/clip.webm?token=1', embeddedTracks: true })
      expect(byExtension.engine).toBeInstanceOf(MatroskaMediaEngine)
      byExtension.destroy()
    })

    it('says what is being done before playback starts, in order, and stops once there is something to play', async () => {
      const player = mountPlayer({ src: server.url, type: 'video/x-matroska', embeddedTracks: true })
      const seen = stagesOf(player)
      // Reading the file starts at once, so it is already the stage the viewer sees.
      expect(player.store.state.loadStage).toBe('tracks')

      // This file has several audio tracks, so the audio is prepared before it starts.
      await vi.waitFor(() => expect(seen).toEqual(['tracks', 'preparing', 'starting']))
      player.engine?.element.dispatchEvent(new Event('canplay'))
      await vi.waitFor(() => expect(player.store.state.loadStage).toBeNull())
      expect(seen).toEqual(['tracks', 'preparing', 'starting', null])
      player.destroy()
    })

    it('goes straight from reading to starting when there is nothing to prepare', async () => {
      const single = await serve(fixture('single-track.mkv'))
      try {
        const player = mountPlayer({ src: single.url, type: 'video/x-matroska', embeddedTracks: true })
        const seen = stagesOf(player)
        await vi.waitFor(() => expect(seen).toEqual(['tracks', 'starting']))
        player.engine?.element.dispatchEvent(new Event('playing'))
        await vi.waitFor(() => expect(player.store.state.loadStage).toBeNull())
        player.destroy()
      } finally {
        await single.close()
      }
    })

    it('still ends the stage for a file that cannot be read, and for a failure', async () => {
      const garbage = await serve(Buffer.from('not a matroska file'))
      try {
        const player = mountPlayer({ src: garbage.url, type: 'video/x-matroska', embeddedTracks: true })
        const seen = stagesOf(player)
        await vi.waitFor(() => expect(seen).toEqual(['tracks', 'starting']))
        // A load error also ends it, so a failed start does not leave the viewer waiting.
        player.engine?.element.dispatchEvent(new Event('error'))
        await vi.waitFor(() => expect(player.store.state.loadStage).toBeNull())
        player.destroy()
      } finally {
        await garbage.close()
      }
    })

    it('shows no stage for an engine that has none, and none after the player is torn down', async () => {
      const plain = mountPlayer({ src: '/clip.mp4', embeddedTracks: true })
      expect(plain.store.state.loadStage).toBeNull()
      plain.destroy()

      const player = mountPlayer({ src: server.url, type: 'video/x-matroska', embeddedTracks: true })
      expect(player.store.state.loadStage).toBe('tracks')
      player.unmount()
      expect(player.store.state.loadStage).toBeNull()
      player.destroy()
    })

    it('lists the embedded subtitles and plays the file', async () => {
      const player = mountPlayer({ src: server.url, type: 'video/x-matroska', embeddedTracks: true })
      expect(player.engine).toBeInstanceOf(MatroskaMediaEngine)

      await vi.waitFor(() => expect(player.store.state.subtitleTracks).toHaveLength(2))
      expect(player.store.state.subtitleTracks).toEqual([
        { id: 'embedded:6', lang: 'eng', label: 'English', embedded: true, unsupported: false },
        { id: 'embedded:7', lang: 'jpn', label: 'Japanese (ASS)', embedded: true, unsupported: false },
      ])
      // Without Media Source (as in this test environment) the plain file is played.
      await vi.waitFor(() => expect(player.engine?.element.getAttribute('src')).toBe(server.url))
      expect(player.store.state.audioTracks).toEqual([])
      player.destroy()
    })

    it('reads the selected embedded subtitle track and shows its cues', async () => {
      const player = mountPlayer({ src: server.url, type: 'video/x-matroska', embeddedTracks: true })
      await vi.waitFor(() => expect(player.store.state.subtitleTracks).toHaveLength(2))
      const [english, japanese] = player.store.state.subtitleTracks as [SubtitleTrack, SubtitleTrack]

      player.remote.setActiveSubtitle(english)
      expect(player.store.state.activeSubtitle?.id).toBe('embedded:6')
      expect(player.store.state.subtitleStatus).toBe('loading')
      await vi.waitFor(() => expect(player.store.state.subtitleStatus).toBe('ready'))
      expect(round(player.store.state.subtitleCues)).toEqual([
        { index: 0, start: 1, end: 3, text: 'Hello from the first subtitle' },
        { index: 1, start: 4, end: 6.5, text: 'Second line & more\nwith a break' },
        { index: 2, start: 9, end: 11, text: 'Late line near the end' },
      ])

      // Another embedded track replaces it; overlapping ASS lines are combined into one caption.
      player.remote.setActiveSubtitle(japanese)
      await vi.waitFor(() => expect(player.store.state.activeSubtitle?.id).toBe('embedded:7'))
      await vi.waitFor(() => expect(player.store.state.subtitleStatus).toBe('ready'))
      expect(player.store.state.subtitleCues.map((cue) => cue.text)).toEqual([
        'ASS first, with styling tags',
        'ASS first, with styling tags\nOverlapping, second\nline break',
        'Overlapping, second\nline break',
        'Comma, inside, the, text, field, yes',
      ])
      player.destroy()
    })

    it('stops reading when subtitles are switched off', async () => {
      const player = mountPlayer({ src: server.url, type: 'video/x-matroska', embeddedTracks: true })
      await vi.waitFor(() => expect(player.store.state.subtitleTracks).toHaveLength(2))
      player.remote.setActiveSubtitle(player.store.state.subtitleTracks[0] as SubtitleTrack)
      await vi.waitFor(() => expect(player.store.state.subtitleStatus).toBe('ready'))

      player.remote.setActiveSubtitle(null)
      expect(player.store.state.activeSubtitle).toBeNull()
      expect(player.store.state.subtitleCues).toEqual([])
      expect(player.store.state.subtitleStatus).toBe('idle')

      // Seeking now reads nothing.
      const requests = server.requests.length
      player.engine?.element.dispatchEvent(new Event('timeupdate'))
      await new Promise((resolve) => setTimeout(resolve, 200))
      expect(server.requests.length).toBe(requests)
      player.destroy()
    })

    it('stops reading embedded subtitles when a subtitle file is loaded instead', async () => {
      const player = mountPlayer({ src: server.url, type: 'video/x-matroska', embeddedTracks: true })
      await vi.waitFor(() => expect(player.store.state.subtitleTracks).toHaveLength(2))
      player.remote.setActiveSubtitle(player.store.state.subtitleTracks[0] as SubtitleTrack)
      await vi.waitFor(() => expect(player.store.state.subtitleStatus).toBe('ready'))

      player.remote.addSubtitleTrack({
        id: 'local:1',
        content: '1\n00:00:01,000 --> 00:00:02,000\nFrom a file\n',
        format: 'srt',
        lang: 'und',
        label: 'extra.srt',
        local: true,
      })
      await vi.waitFor(() => expect(player.store.state.subtitleCues.map((cue) => cue.text)).toEqual(['From a file']))
      expect(player.store.state.activeSubtitle?.id).toBe('local:1')
      // The embedded tracks are still listed next to it.
      expect(player.store.state.subtitleTracks.map((track) => track.id)).toEqual([
        'embedded:6',
        'embedded:7',
        'local:1',
      ])

      // Late cues from the abandoned embedded track must not replace the file's cues.
      player.engine?.element.dispatchEvent(new Event('timeupdate'))
      await new Promise((resolve) => setTimeout(resolve, 400))
      expect(player.store.state.subtitleCues.map((cue) => cue.text)).toEqual(['From a file'])
      player.destroy()
    })

    it('drops the tracks of the previous media when the source changes', async () => {
      const player = mountPlayer({ src: server.url, type: 'video/x-matroska', embeddedTracks: true })
      await vi.waitFor(() => expect(player.store.state.subtitleTracks).toHaveLength(2))
      player.remote.setActiveSubtitle(player.store.state.subtitleTracks[0] as SubtitleTrack)

      player.updateOptions({ src: '/other.mp4', type: 'video/mp4' })

      expect(player.engine).toBeInstanceOf(NativeVideoEngine)
      expect(player.store.state.subtitleTracks).toEqual([])
      expect(player.store.state.activeSubtitle).toBeNull()
      expect(player.store.state.subtitleCues).toEqual([])
      player.destroy()
    })

    it('can be switched on and off while the player exists', async () => {
      const player = mountPlayer({ src: server.url, type: 'video/x-matroska' })
      expect(player.engine).toBeInstanceOf(NativeVideoEngine)

      player.updateOptions({ embeddedTracks: true })
      expect(player.engine).toBeInstanceOf(MatroskaMediaEngine)
      await vi.waitFor(() => expect(player.store.state.subtitleTracks).toHaveLength(2))

      player.updateOptions({ embeddedTracks: false })
      expect(player.engine).toBeInstanceOf(NativeVideoEngine)
      expect(player.store.state.subtitleTracks).toEqual([])
      player.destroy()
    })

    it('copes with a source that is not Matroska and plays it as it is', async () => {
      const garbage = await serve(Buffer.from('this is not a video file'))
      try {
        const player = mountPlayer({ src: garbage.url, type: 'video/x-matroska', embeddedTracks: true })
        await vi.waitFor(() => expect(player.engine?.element.getAttribute('src')).toBe(garbage.url))
        expect(player.store.state.subtitleTracks).toEqual([])
        expect(player.store.state.audioTracks).toEqual([])
        expect(player.store.state.error).toBeNull()
        player.destroy()
      } finally {
        await garbage.close()
      }
    })
  })

  describe('remembered choices (persistPreferences)', () => {
    it('turns the same subtitle language on again, and keeps it off once switched off', async () => {
      const first = mountPlayer({
        src: server.url,
        type: 'video/x-matroska',
        embeddedTracks: true,
        persistPreferences: true,
      })
      await vi.waitFor(() => expect(first.store.state.subtitleTracks).toHaveLength(2))
      first.remote.setActiveSubtitle(first.store.state.subtitleTracks[1] as SubtitleTrack)
      expect(first.engine?.element).toBeDefined()
      expect(first.storage.get(STORAGE_KEYS.SUBTITLE_LANG)).toBe('jpn')
      first.destroy()

      // The next video starts with the same language.
      const second = mountPlayer({
        src: server.url,
        type: 'video/x-matroska',
        embeddedTracks: true,
        persistPreferences: true,
      })
      await vi.waitFor(() => expect(second.store.state.activeSubtitle?.id).toBe('embedded:7'))
      second.remote.setActiveSubtitle(null)
      expect(second.storage.get(STORAGE_KEYS.SUBTITLE_LANG)).toBe('off')
      second.destroy()

      const third = mountPlayer({
        src: server.url,
        type: 'video/x-matroska',
        embeddedTracks: true,
        persistPreferences: true,
      })
      await vi.waitFor(() => expect(third.store.state.subtitleTracks).toHaveLength(2))
      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(third.store.state.activeSubtitle).toBeNull()
      third.destroy()
    })

    it('remembers nothing without persistPreferences', async () => {
      const player = mountPlayer({ src: server.url, type: 'video/x-matroska', embeddedTracks: true })
      await vi.waitFor(() => expect(player.store.state.subtitleTracks).toHaveLength(2))
      player.remote.setActiveSubtitle(player.store.state.subtitleTracks[0] as SubtitleTrack)
      expect(player.storage.get(STORAGE_KEYS.SUBTITLE_LANG)).toBeUndefined()
      player.destroy()
    })
  })
})

describe('tracks reported by an engine', () => {
  beforeEach(() => localStorage.clear())

  function setup(options: Partial<Parameters<typeof createPlayer>[0]> = {}) {
    let engine!: FakeEngine
    const player = mountPlayer({
      src: '/video.mkv',
      engine: (video) => (engine = new FakeEngine(video)),
      ...options,
    })
    return { player, engine }
  }

  const audio = [
    { id: 2, label: 'English', detail: 'AAC Stereo', lang: 'eng', unsupported: false },
    { id: 3, label: 'Japanese', detail: 'E-AC-3 5.1', lang: 'jpn', unsupported: false },
    { id: 4, label: 'Commentary', detail: 'DTS 5.1', lang: 'eng', unsupported: true },
  ]

  it('exposes audio tracks and switches between them', async () => {
    const { player, engine } = setup()
    engine.emit('tracks', { audioTracks: audio, activeAudioTrack: 2, subtitleTracks: [] })

    expect(player.store.state.audioTracks.map((track) => track.label)).toEqual(['English', 'Japanese', 'Commentary'])
    expect(player.store.state.activeAudioTrack).toBe(2)

    player.remote.setAudioTrack(3)
    expect(engine.audioSwitches).toEqual([3])
    await vi.waitFor(() => expect(player.store.state.activeAudioTrack).toBe(3))
    player.destroy()
  })

  it('stays on the current track when the engine cannot play the one chosen', async () => {
    const { player, engine } = setup({ persistPreferences: true })
    engine.emit('tracks', { audioTracks: audio, activeAudioTrack: 2, subtitleTracks: [] })
    engine.refuse.add(4)

    player.remote.setAudioTrack(4)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(player.store.state.activeAudioTrack).toBe(2)
    expect(player.storage.get(STORAGE_KEYS.AUDIO_LANG)).toBeUndefined()
    player.destroy()
  })

  it('remembers the language of the chosen audio track', async () => {
    const { player, engine } = setup({ persistPreferences: true })
    engine.emit('tracks', { audioTracks: audio, activeAudioTrack: 2, subtitleTracks: [] })

    player.remote.setAudioTrack(3)
    await vi.waitFor(() => expect(player.storage.get(STORAGE_KEYS.AUDIO_LANG)).toBe('jpn'))
    player.destroy()
  })

  it('does nothing for audio when the engine has no tracks', () => {
    const player = mountPlayer({
      src: '/video.mp4',
      engine: (video) => {
        const engine = new FakeEngine(video)
        ;(engine as { selectAudioTrack?: unknown }).selectAudioTrack = undefined
        return engine
      },
    })
    expect(() => player.remote.setAudioTrack(1)).not.toThrow()
    player.destroy()
  })

  it('lists tracks it cannot show, without letting them be selected', () => {
    const { player, engine } = setup()
    engine.emit('tracks', {
      audioTracks: [],
      activeAudioTrack: null,
      subtitleTracks: [
        { id: 'embedded:3', label: 'English', lang: 'eng', unsupported: false },
        { id: 'embedded:4', label: 'English (PGS)', lang: 'eng', unsupported: true },
      ],
    })
    const [text, bitmap] = player.store.state.subtitleTracks as [SubtitleTrack, SubtitleTrack]
    expect(bitmap.unsupported).toBe(true)

    player.remote.setActiveSubtitle(bitmap)
    expect(player.store.state.activeSubtitle).toBeNull()
    expect(engine.subtitleSwitches).toEqual([])

    player.remote.setActiveSubtitle(text)
    expect(player.store.state.activeSubtitle?.id).toBe('embedded:3')
    expect(engine.subtitleSwitches).toEqual(['embedded:3'])
    player.destroy()
  })

  it('ignores cues of a track that is no longer selected', () => {
    const { player, engine } = setup()
    engine.emit('tracks', {
      audioTracks: [],
      activeAudioTrack: null,
      subtitleTracks: [
        { id: 'embedded:3', label: 'One', lang: 'eng', unsupported: false },
        { id: 'embedded:4', label: 'Two', lang: 'fra', unsupported: false },
      ],
    })
    const [one, two] = player.store.state.subtitleTracks as [SubtitleTrack, SubtitleTrack]
    player.remote.setActiveSubtitle(one)
    player.remote.setActiveSubtitle(two)

    engine.emit('subtitlecues', {
      id: 'embedded:3',
      cues: [{ index: 0, start: 0, end: 1, text: 'late' }],
      status: 'ready',
    })
    expect(player.store.state.subtitleCues).toEqual([])

    engine.emit('subtitlecues', {
      id: 'embedded:4',
      cues: [{ index: 0, start: 0, end: 1, text: 'current' }],
      status: 'ready',
    })
    expect(player.store.state.subtitleCues.map((cue) => cue.text)).toEqual(['current'])
    expect(player.store.state.subtitleStatus).toBe('ready')
    player.destroy()
  })

  it('reports a failed read of embedded subtitles', () => {
    const { player, engine } = setup()
    engine.emit('tracks', {
      audioTracks: [],
      activeAudioTrack: null,
      subtitleTracks: [{ id: 'embedded:3', label: 'One', lang: 'eng', unsupported: false }],
    })
    player.remote.setActiveSubtitle(player.store.state.subtitleTracks[0] as SubtitleTrack)
    engine.emit('subtitlecues', { id: 'embedded:3', cues: [], status: 'error' })
    expect(player.store.state.subtitleStatus).toBe('error')
    expect(player.store.state.subtitleError).toMatch(/subtitles/i)
    player.destroy()
  })
})
