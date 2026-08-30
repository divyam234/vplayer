/**
 * @vplayer/core — Player factory.
 *
 * Architecture:
 *   createPlayer() → PlayerInstance
 *     ├── store        → Reactive state (TanStack Store)
 *     ├── engine       → Media playback abstraction (MediaEngine)
 *     ├── events       → Typed event bus for plugin communication
 *     ├── storage      → Persistence layer (localStorage + fallback)
 *     ├── i18n         → Internationalization
 *     └── hotkeys      → Keyboard shortcut registry
 *
 * The player delegates all media I/O to a swappable MediaEngine.
 * At mount time, a NativeVideoEngine wraps the <video> element.
 * Custom engines (HLS, DASH, mock) can be injected for testing or
 * advanced playback scenarios.
 */

import { EventBus } from './event-bus'
import { HotkeyRegistry } from './hotkey-registry'
import { I18n } from './i18n'
import { getMediaCapabilities, isFiniteDuration } from './media-capabilities'
import type { MediaEngine } from './media-engine'
import { LocalPlaybackProgressStore } from './playback-progress'
import type { PlaybackProgress, PlaybackProgressStore } from './playback-progress'
import type { PluginAPI, PlayerPlugin, ContextMenuItem, FlipState, AspectRatioState, RemoteRef } from './plugin-api'
import { createResolvedMediaEngine, toPlayerSource } from './source-resolver'
import { createMediaStore } from './state/slices'
import { Storage, STORAGE_KEYS } from './storage'
import { DEFAULT_CAPTION_SETTINGS, fetchSubtitles, fetchThumbnails } from './subtitle-parser'
import type { CaptionSettings, SubtitleTrack } from './subtitle-parser'
import type { PlayerOptions, MediaRemote, PlayerInstance } from './types'

const ASPECT_RATIO_CYCLE: AspectRatioState[] = ['default', '16:9', '4:3', '21:9', 'cover', 'fill']
const PROGRESS_CHECKPOINT_INTERVAL_MS = 5000
const PROGRESS_CHECKPOINT_DELTA_SECONDS = 2

const ASPECT_RATIO_CSS: Partial<Record<AspectRatioState, string>> = {
  '16:9': '16 / 9',
  '4:3': '4 / 3',
  '21:9': '21 / 9',
}

const ASPECT_RATIO_CLASS: Record<AspectRatioState, string> = {
  default: 'default',
  '16:9': '16-9',
  '4:3': '4-3',
  '21:9': '21-9',
  cover: 'cover',
  fill: 'fill',
}

function clearAspectRatioClasses(el: HTMLDivElement): void {
  el.classList.remove(
    'vplayer--media-default',
    'vplayer--media-16-9',
    'vplayer--media-4-3',
    'vplayer--media-21-9',
    'vplayer--media-cover',
    'vplayer--media-fill',
  )
}

function normalizeAspectRatio(ratio: unknown): AspectRatioState {
  return typeof ratio === 'string' && ratio in ASPECT_RATIO_CLASS ? (ratio as AspectRatioState) : 'default'
}

function objectFitForAspectRatio(ratio: AspectRatioState): 'contain' | 'cover' | 'fill' {
  if (ratio === 'cover') return 'cover'
  if (ratio === 'fill') return 'fill'
  return 'contain'
}

function normalizeSubtitleTrack(track: SubtitleTrack): SubtitleTrack {
  return {
    ...track,
    id: track.id ?? `${track.local ? 'local' : 'track'}:${track.src ?? track.label}:${track.lang}`,
  }
}

export function createPlayer(options: PlayerOptions): PlayerInstance {
  // ── Core services ──────────────────────────────────────────
  const store = createMediaStore()
  let currentOptions: PlayerOptions = { ...options }
  const events = new EventBus()
  const storage = new Storage()
  const i18n = new I18n(currentOptions.lang)
  if (currentOptions.translations) {
    i18n.addTranslations(currentOptions.lang ?? 'en', currentOptions.translations)
  }
  const hotkeys = new HotkeyRegistry()

  const reconnectMax = currentOptions.reconnectMax ?? 3
  const reconnectSleep = currentOptions.reconnectSleep ?? 1500

  // ── Mutable state (not in store — engine refs, timers) ────
  let containerEl: HTMLDivElement | null = null
  let engine: MediaEngine | null = null
  let fullscreenHandler: (() => void) | null = null
  let lastProgressSaveAt = 0
  let lastProgressTime = Number.NaN
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempt = 0
  let thumbnailAbortController: AbortController | null = null
  let subtitleAbortController: AbortController | null = null
  let subtitleCatalogAbortController: AbortController | null = null
  let mediaSessionMetadata: MediaMetadata | null = null
  const defaultProgressStore = new LocalPlaybackProgressStore()
  let progressGeneration = 0
  let progressLoaded = false
  let playbackBegun = false
  let pagehideHandler: (() => void) | null = null

  interface ProgressTarget {
    generation: number
    id: string
    store: PlaybackProgressStore
  }

  type ProgressOperation =
    | { kind: 'save'; target: ProgressTarget; progress: PlaybackProgress }
    | { kind: 'clear'; target: ProgressTarget }

  const progressOperations: ProgressOperation[] = []
  let progressOperationRunning = false

  function resolveProgressTarget(opts: PlayerOptions): ProgressTarget {
    return {
      generation: progressGeneration,
      id: opts.playbackProgress?.id ?? opts.src,
      store: opts.playbackProgress?.store ?? defaultProgressStore,
    }
  }

  let activeProgressTarget = resolveProgressTarget(currentOptions)

  function drainProgressOperations(): void {
    if (progressOperationRunning) return
    const operation = progressOperations.shift()
    if (!operation) return
    progressOperationRunning = true
    const promise =
      operation.kind === 'save'
        ? operation.target.store.save(operation.target.id, operation.progress)
        : operation.target.store.clear(operation.target.id)
    void promise
      .catch((error) => {
        console.warn(
          operation.kind === 'save'
            ? '[vplayer] playback progress save failed:'
            : '[vplayer] playback progress clear failed:',
          error,
        )
      })
      .finally(() => {
        progressOperationRunning = false
        drainProgressOperations()
      })
  }

  function enqueueProgressSave(target: ProgressTarget, progress: PlaybackProgress): void {
    const last = progressOperations.at(-1)
    if (last?.kind === 'save' && last.target.generation === target.generation) last.progress = progress
    else progressOperations.push({ kind: 'save', target, progress })
    drainProgressOperations()
  }

  function enqueueProgressClear(target: ProgressTarget): void {
    progressOperations.push({ kind: 'clear', target })
    drainProgressOperations()
  }

  function flushProgress(target = activeProgressTarget, eng: MediaEngine | null = engine): void {
    if (
      !eng ||
      eng.ended ||
      !Number.isFinite(eng.currentTime) ||
      eng.currentTime < 0 ||
      !isFiniteDuration(eng.duration)
    ) {
      return
    }
    lastProgressSaveAt = Date.now()
    lastProgressTime = eng.currentTime
    enqueueProgressSave(target, { time: eng.currentTime, duration: eng.duration })
  }

  function checkpointProgress(eng: MediaEngine): void {
    if (!store.state.isPlaying || Date.now() - lastProgressSaveAt < PROGRESS_CHECKPOINT_INTERVAL_MS) return
    if (
      Number.isFinite(lastProgressTime) &&
      Math.abs(eng.currentTime - lastProgressTime) < PROGRESS_CHECKPOINT_DELTA_SECONDS
    )
      return
    flushProgress(activeProgressTarget, eng)
  }

  function resetProgressGeneration(): void {
    progressGeneration++
    activeProgressTarget = resolveProgressTarget(currentOptions)
    progressLoaded = false
    playbackBegun = false
    lastProgressSaveAt = 0
    lastProgressTime = Number.NaN
    store.setState((prev) => ({ ...prev, resumeState: { status: 'idle' } }))
  }

  function loadProgress(eng: MediaEngine): void {
    if (progressLoaded || !isFiniteDuration(eng.duration)) return
    progressLoaded = true
    const target = activeProgressTarget
    const duration = eng.duration
    store.setState((prev) => ({ ...prev, resumeState: { status: 'loading' } }))
    void target.store
      .load(target.id)
      .then((progress) => {
        const autoResume = currentOptions.autoPlay === true
        if (target.generation !== progressGeneration || eng !== engine) return
        if (
          !progress ||
          (!autoResume && (playbackBegun || eng.currentTime !== 0)) ||
          !Number.isFinite(progress.time) ||
          !Number.isFinite(progress.duration) ||
          progress.time <= 3 ||
          progress.time >= duration - 3 ||
          Math.abs(progress.duration - duration) > Math.max(1, duration * 0.01)
        ) {
          store.setState((prev) => ({ ...prev, resumeState: { status: 'idle' } }))
          return
        }
        if (autoResume) {
          eng.seek(progress.time)
          store.setState((prev) => ({ ...prev, resumeState: { status: 'idle' } }))
        } else store.setState((prev) => ({ ...prev, resumeState: { status: 'prompt', progress } }))
      })
      .catch((error) => {
        if (target.generation === progressGeneration && eng === engine) {
          store.setState((prev) => ({ ...prev, resumeState: { status: 'idle' } }))
        }
        console.warn('[vplayer] playback progress load failed:', error)
      })
  }

  function mergeSubtitleTracks(tracks: SubtitleTrack[]): void {
    store.setState((prev) => {
      const merged = new Map(prev.subtitleTracks.map((track) => [track.id, track]))
      for (const track of tracks) {
        const normalized = normalizeSubtitleTrack(track)
        merged.set(normalized.id, normalized)
      }
      return { ...prev, subtitleTracks: [...merged.values()] }
    })
  }

  function loadSubtitleTrack(track: SubtitleTrack): void {
    subtitleAbortController?.abort()
    const controller = new AbortController()
    subtitleAbortController = controller
    store.setState((prev) => ({
      ...prev,
      activeSubtitle: track,
      subtitleCues: [],
      subtitleStatus: 'loading',
      subtitleError: null,
    }))
    void fetchSubtitles(track, controller.signal).then(
      (cues) => {
        if (controller.signal.aborted) return
        store.setState((prev) => ({ ...prev, subtitleCues: cues, subtitleStatus: 'ready', subtitleError: null }))
      },
      (error) => {
        if (controller.signal.aborted) return
        store.setState((prev) => ({
          ...prev,
          subtitleCues: [],
          subtitleStatus: 'error',
          subtitleError: error instanceof Error ? error.message : String(error),
        }))
      },
    )
  }

  function loadSubtitleCatalog(): void {
    subtitleCatalogAbortController?.abort()
    const catalog = currentOptions.subtitleCatalog
    if (!catalog) {
      store.setState((prev) => ({ ...prev, subtitleCatalogStatus: 'idle', subtitleCatalogError: null }))
      return
    }
    const controller = new AbortController()
    subtitleCatalogAbortController = controller
    store.setState((prev) => ({ ...prev, subtitleCatalogStatus: 'loading', subtitleCatalogError: null }))
    void catalog.list(controller.signal).then(
      (tracks) => {
        if (controller.signal.aborted) return
        mergeSubtitleTracks(tracks)
        store.setState((prev) => ({ ...prev, subtitleCatalogStatus: 'ready', subtitleCatalogError: null }))
      },
      (error) => {
        if (controller.signal.aborted) return
        store.setState((prev) => ({
          ...prev,
          subtitleCatalogStatus: 'error',
          subtitleCatalogError: error instanceof Error ? error.message : String(error),
        }))
      },
    )
  }

  if (currentOptions.subtitles?.length) mergeSubtitleTracks(currentOptions.subtitles)

  function clearMediaSessionMetadata(): void {
    if (
      mediaSessionMetadata &&
      typeof navigator !== 'undefined' &&
      'mediaSession' in navigator &&
      navigator.mediaSession.metadata === mediaSessionMetadata
    ) {
      navigator.mediaSession.metadata = null
    }
    mediaSessionMetadata = null
  }

  function syncMediaSessionMetadata(): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') {
      return
    }

    const title = currentOptions.title?.trim()
    if (!title) {
      clearMediaSessionMetadata()
      return
    }

    const metadata = new MediaMetadata({
      title,
      artwork: currentOptions.poster ? [{ src: currentOptions.poster }] : [],
    })
    navigator.mediaSession.metadata = metadata
    mediaSessionMetadata = metadata
  }

  // ── Default keyboard shortcuts ────────────────────────────
  function registerDefaultHotkeys(): void {
    hotkeys.register({
      key: 'Space',
      description: 'Toggle play/pause',
      handler: (e) => {
        e.preventDefault()
        remote.togglePlay()
      },
    })
    hotkeys.register({
      key: 'KeyK',
      description: 'Toggle play/pause',
      handler: (e) => {
        e.preventDefault()
        remote.togglePlay()
      },
    })
    hotkeys.register({
      key: 'KeyL',
      description: 'Toggle loop',
      handler: (e) => {
        e.preventDefault()
        remote.toggleLoop()
      },
    })
    hotkeys.register({
      key: 'KeyI',
      description: 'Toggle info panel',
      handler: (e) => {
        e.preventDefault()
        remote.toggleInfoPanel()
      },
    })
    hotkeys.register({
      key: 'KeyF',
      description: 'Toggle fullscreen',
      handler: (e) => {
        e.preventDefault()
        remote.toggleFullscreen()
      },
    })
    hotkeys.register({
      key: 'KeyA',
      description: 'Cycle aspect ratio',
      handler: (e) => {
        e.preventDefault()
        remote.cycleAspectRatio()
      },
    })
    hotkeys.register({
      key: 'KeyM',
      description: 'Toggle mute',
      handler: (e) => {
        e.preventDefault()
        remote.toggleMute()
      },
    })
    hotkeys.register({
      key: 'ArrowLeft',
      description: 'Seek backward 5s',
      handler: (e) => {
        e.preventDefault()
        remote.skip(-5)
      },
    })
    hotkeys.register({
      key: 'ArrowRight',
      description: 'Seek forward 5s',
      handler: (e) => {
        e.preventDefault()
        remote.skip(5)
      },
    })
    hotkeys.register({
      key: 'ArrowUp',
      description: 'Volume up 10%',
      handler: (e) => {
        e.preventDefault()
        const v = Math.min(1, store.state.volume + 0.1)
        remote.setVolume(v)
      },
    })
    hotkeys.register({
      key: 'ArrowDown',
      description: 'Volume down 10%',
      handler: (e) => {
        e.preventDefault()
        const v = Math.max(0, store.state.volume - 0.1)
        remote.setVolume(v)
      },
    })
  }
  if (currentOptions.defaultHotkeys !== false) registerDefaultHotkeys()

  function syncFullscreenState(): void {
    if (typeof document === 'undefined') return
    const webkitDocument = document as Document & { webkitFullscreenElement?: Element | null }
    store.setState((prev) => ({
      ...prev,
      isFullscreen: Boolean(document.fullscreenElement || webkitDocument.webkitFullscreenElement),
      capabilities: getMediaCapabilities((engine?.element as HTMLVideoElement | null) ?? undefined, containerEl),
    }))
  }

  // ── Remote: commands that translate to engine calls ───────
  const remote: MediaRemote = {
    play: () => {
      void engine?.play()
    },
    pause: () => engine?.pause(),
    togglePlay: () => {
      const e = engine
      if (!e) return
      if (e.paused || e.ended) void e.play()
      else e.pause()
    },
    resumeFromSavedProgress: () => {
      const resumeState = store.state.resumeState
      if (resumeState.status !== 'prompt') return
      store.setState((prev) => ({ ...prev, resumeState: { status: 'idle' } }))
      engine?.seek(resumeState.progress.time)
      void engine?.play()
    },
    startPlaybackOver: () => {
      const target = activeProgressTarget
      store.setState((prev) => ({ ...prev, resumeState: { status: 'idle' } }))
      engine?.seek(0)
      enqueueProgressClear(target)
    },
    seek: (time: number) => engine?.seek(time),
    skip: (seconds: number) => {
      const e = engine
      if (!e) return
      const duration = isFiniteDuration(e.duration) ? e.duration : Number.POSITIVE_INFINITY
      const newTime = Math.max(0, Math.min(e.currentTime + seconds, duration))
      e.seek(newTime)
    },
    setVolume: (v: number) => {
      const e = engine
      if (!e) return
      const volume = Math.max(0, Math.min(1, v))
      e.setVolume(volume)
      if (volume > 0) e.setMuted(false)
      store.setState((prev) => ({ ...prev, volume, isMuted: e.muted }))
    },
    toggleMute: () => {
      const e = engine
      if (!e) return
      e.setMuted(!e.muted)
      store.setState((prev) => ({ ...prev, isMuted: e.muted }))
    },
    setPlaybackRate: (rate: number) => {
      const e = engine
      if (!e) return
      e.setPlaybackRate(rate)
      store.setState((prev) => ({ ...prev, playbackRate: e.playbackRate }))
    },
    toggleFullscreen: () => {
      if (!containerEl || typeof document === 'undefined') return
      const webkitContainer = containerEl as HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> | void }
      const webkitDocument = document as Document & {
        webkitFullscreenElement?: Element | null
        webkitExitFullscreen?: () => Promise<void> | void
      }
      const isFullscreen = Boolean(document.fullscreenElement || webkitDocument.webkitFullscreenElement)
      const onSettled = () => {
        containerEl?.focus({ preventScroll: true })
        syncFullscreenState()
      }
      const request = isFullscreen
        ? typeof document.exitFullscreen === 'function'
          ? document.exitFullscreen()
          : webkitDocument.webkitExitFullscreen?.()
        : typeof containerEl.requestFullscreen === 'function'
          ? containerEl.requestFullscreen()
          : webkitContainer.webkitRequestFullscreen?.()

      Promise.resolve(request).then(onSettled, onSettled)
    },
    togglePiP: () => {
      const e = engine
      if (!e || typeof document === 'undefined') return
      if (document.pictureInPictureElement) {
        void e.exitPictureInPicture()
      } else {
        void e.requestPictureInPicture()
      }
    },
    setActiveSubtitle: (track) => {
      if (!track) {
        subtitleAbortController?.abort()
        store.setState((prev) => ({
          ...prev,
          activeSubtitle: null,
          subtitleCues: [],
          subtitleStatus: 'idle',
          subtitleError: null,
        }))
        return
      }
      loadSubtitleTrack(track)
    },
    addSubtitleTrack: (track) => {
      const normalized = normalizeSubtitleTrack(track)
      mergeSubtitleTracks([normalized])
      loadSubtitleTrack(normalized)
    },
    removeSubtitleTrack: (id) => {
      if (store.state.activeSubtitle?.id === id) remote.setActiveSubtitle(null)
      store.setState((prev) => ({ ...prev, subtitleTracks: prev.subtitleTracks.filter((track) => track.id !== id) }))
    },
    reloadSubtitleCatalog: loadSubtitleCatalog,
    setCaptionSettings: (patch) => {
      store.setState((prev) => ({
        ...prev,
        captionSettings: {
          ...prev.captionSettings,
          ...patch,
          fontScale: Math.max(50, Math.min(200, patch.fontScale ?? prev.captionSettings.fontScale)),
          textOpacity: Math.max(0, Math.min(1, patch.textOpacity ?? prev.captionSettings.textOpacity)),
          backgroundOpacity: Math.max(
            0,
            Math.min(1, patch.backgroundOpacity ?? prev.captionSettings.backgroundOpacity),
          ),
          position: Math.max(-20, Math.min(30, patch.position ?? prev.captionSettings.position)),
          lineHeight: Math.max(1, Math.min(2, patch.lineHeight ?? prev.captionSettings.lineHeight)),
          delay: Math.max(-10, Math.min(10, patch.delay ?? prev.captionSettings.delay)),
        },
      }))
    },
    resetCaptionSettings: () => {
      store.setState((prev) => ({ ...prev, captionSettings: { ...DEFAULT_CAPTION_SETTINGS } }))
    },
    setActiveQuality: (q: string) => {
      store.setState((prev) => ({ ...prev, activeQuality: q }))
    },
    takeScreenshot: async () => {
      const e = engine
      if (!e) return
      const blob = await e.screenshot()
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vplayer-screenshot-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
    },
    setFlip: (flip: FlipState) => {
      const el = engine?.element as HTMLVideoElement | null
      if (!el) return
      let transform = ''
      if (flip === 'horizontal') transform = 'scaleX(-1)'
      if (flip === 'vertical') transform = 'scaleY(-1)'
      el.style.transform = transform
      store.setState((prev) => ({ ...prev, flip }))
    },
    setAspectRatio: (ratio: AspectRatioState) => {
      const normalizedRatio = normalizeAspectRatio(ratio)
      const el = engine?.element as HTMLVideoElement | null
      if (!el) return
      const cssRatio = ASPECT_RATIO_CSS[normalizedRatio]
      if (cssRatio) {
        el.style.setProperty('--vplayer-media-aspect-ratio', cssRatio)
      } else {
        el.style.removeProperty('--vplayer-media-aspect-ratio')
      }
      el.style.objectFit = objectFitForAspectRatio(normalizedRatio)
      el.style.setProperty('--vplayer-media-object-fit', objectFitForAspectRatio(normalizedRatio))
      if (containerEl) {
        clearAspectRatioClasses(containerEl)
        containerEl.classList.add(`vplayer--media-${ASPECT_RATIO_CLASS[normalizedRatio]}`)
      }
      store.setState((prev) => ({ ...prev, aspectRatio: normalizedRatio }))
    },
    cycleAspectRatio: () => {
      const current = store.state.aspectRatio
      const index = ASPECT_RATIO_CYCLE.indexOf(current)
      const next = ASPECT_RATIO_CYCLE[(index + 1) % ASPECT_RATIO_CYCLE.length] ?? 'default'
      remote.setAspectRatio(next)
    },
    toggleLoop: () => {
      const e = engine
      if (!e) return
      e.setLooping(!e.looping)
      store.setState((prev) => ({ ...prev, isLooping: e.looping }))
    },
    toggleInfoPanel: () => {
      store.setState((prev) => ({ ...prev, infoPanelVisible: !prev.infoPanelVisible }))
    },
  }

  // ── Engine event wiring → store updates ──────────────────
  //
  // This is the canonical path for media state synchronization.
  // Engine DOM listeners fire → engine emits typed events →
  // handlers below update the store.
  function wireEngineEvents(eng: MediaEngine): Array<() => void> {
    return [
      eng.on('play', () => {
        playbackBegun = true
        store.setState((prev) => ({ ...prev, resumeState: { status: 'idle' } }))
        syncMediaSessionMetadata()
        store.setState((prev) => ({
          ...prev,
          status: 'playing',
          isPlaying: true,
          isPaused: false,
          isBuffering: false,
          isEnded: false,
          error: null,
        }))
        reconnectAttempt = 0
      }),

      eng.on('pause', () => {
        store.setState((prev) => ({
          ...prev,
          status: prev.isEnded ? 'ended' : 'paused',
          isPlaying: false,
          isPaused: !prev.isEnded,
          isBuffering: false,
          controlsVisible: true,
        }))
        if (!eng.ended) flushProgress(activeProgressTarget, eng)
      }),

      eng.on('ended', () => {
        lastProgressSaveAt = 0
        lastProgressTime = Number.NaN
        for (let index = progressOperations.length - 1; index >= 0; index--) {
          const operation = progressOperations[index]
          if (operation?.kind === 'save' && operation.target.generation === activeProgressTarget.generation) {
            progressOperations.splice(index, 1)
          }
        }
        enqueueProgressClear(activeProgressTarget)
        store.setState((prev) => ({
          ...prev,
          status: 'ended',
          isPlaying: false,
          isPaused: false,
          isBuffering: false,
          isEnded: true,
          controlsVisible: true,
          resumeState: { status: 'idle' },
        }))
        currentOptions.onEnded?.()
      }),

      eng.on('timeupdate', () => {
        store.setState((prev) => ({ ...prev, currentTime: eng.currentTime }))
        currentOptions.onTimeUpdate?.(eng.currentTime)
        checkpointProgress(eng)
      }),

      eng.on('loadedmetadata', () => {
        if (reconnectTimer !== null) {
          clearTimeout(reconnectTimer)
          reconnectTimer = null
        }
        reconnectAttempt = 0
        store.setState((prev) => ({
          ...prev,
          status:
            prev.status === 'idle' || prev.status === 'loading' || prev.status === 'error' ? 'ready' : prev.status,
          duration: isFiniteDuration(eng.duration) ? eng.duration : 0,
          isLive: !isFiniteDuration(eng.duration),
          volume: eng.volume,
          isMuted: eng.muted,
          playbackRate: eng.playbackRate,
          error: null,
        }))
        loadProgress(eng)
      }),

      eng.on('progress', () => {
        const buf = eng.buffered
        if (buf.length === 0) return
        const end = buf.end(buf.length - 1)
        store.setState((prev) => ({
          ...prev,
          bufferedPercent: isFiniteDuration(eng.duration) ? (end / eng.duration) * 100 : 0,
        }))
      }),

      eng.on('waiting', () => {
        store.setState((prev) => ({ ...prev, status: 'buffering', isBuffering: true }))
      }),

      eng.on('canplay', () => {
        if (reconnectTimer !== null) {
          clearTimeout(reconnectTimer)
          reconnectTimer = null
        }
        reconnectAttempt = 0
        store.setState((prev) => ({
          ...prev,
          status: prev.isPlaying ? 'playing' : 'ready',
          isBuffering: false,
          error: null,
        }))
      }),

      eng.on('durationchange', () => {
        store.setState((prev) => ({
          ...prev,
          duration: isFiniteDuration(eng.duration) ? eng.duration : 0,
          isLive: !isFiniteDuration(eng.duration),
        }))
        loadProgress(eng)
      }),

      eng.on('seeking', () => {
        store.setState((prev) => ({ ...prev, status: 'seeking' }))
      }),

      eng.on('seeked', () => {
        store.setState((prev) => ({ ...prev, status: prev.isPlaying ? 'playing' : 'ready' }))
        flushProgress(activeProgressTarget, eng)
      }),

      eng.on('playing', () => {
        playbackBegun = true
        store.setState((prev) => ({
          ...prev,
          status: 'playing',
          isPlaying: true,
          isPaused: false,
          isBuffering: false,
          resumeState: { status: 'idle' },
        }))
      }),

      eng.on('volumechange', () => {
        store.setState((prev) => ({ ...prev, volume: eng.volume, isMuted: eng.muted }))
      }),

      eng.on('ratechange', () => {
        store.setState((prev) => ({ ...prev, playbackRate: eng.playbackRate }))
      }),

      eng.on('playblocked', (err) => {
        const message = err?.message ?? 'Playback was blocked by the browser'
        store.setState((prev) => ({
          ...prev,
          status: prev.isPlaying ? prev.status : 'paused',
          error: { message, reconnectAttempt, isReconnecting: false },
        }))
        currentOptions.onError?.(message)
      }),

      eng.on('error', () => {
        const err = eng.error
        const message = err?.message ?? 'Video playback error'
        store.setState((prev) => ({
          ...prev,
          status: 'error',
          error: { message, reconnectAttempt, isReconnecting: false },
        }))
        currentOptions.onError?.(message)
        events.emit('video:error', { message })

        // Auto-reconnect with backoff
        if (reconnectAttempt < reconnectMax) {
          store.setState((prev) => ({
            ...prev,
            error: { message, reconnectAttempt, isReconnecting: true },
          }))
          events.emit('video:reconnecting', { attempt: reconnectAttempt + 1 })

          if (reconnectTimer !== null) clearTimeout(reconnectTimer)
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null
            reconnectAttempt++
            events.emit('video:reconnect', { attempt: reconnectAttempt })
            eng.load()
          }, reconnectSleep)
        }
      }),
    ]
  }

  // ── Preference persistence (opt-in) ──────────────────────
  let unsubPersist: (() => void) | null = null

  function setupPreferencePersistence(): void {
    if (!currentOptions.persistPreferences) return

    const volume = storage.get<number>(STORAGE_KEYS.VOLUME)
    const muted = storage.get<boolean>(STORAGE_KEYS.MUTED)
    const rate = storage.get<number>(STORAGE_KEYS.PLAYBACK_RATE)
    const loop = storage.get<boolean>(STORAGE_KEYS.LOOP)
    const flip = storage.get<FlipState>(STORAGE_KEYS.FLIP)
    const aspectRatio = storage.get<AspectRatioState>(STORAGE_KEYS.ASPECT_RATIO)
    const captionSettings = storage.get<CaptionSettings>(STORAGE_KEYS.CAPTION_SETTINGS)
    store.setState((prev) => ({
      ...prev,
      volume: volume ?? prev.volume,
      isMuted: muted ?? prev.isMuted,
      playbackRate: rate ?? prev.playbackRate,
      isLooping: loop ?? prev.isLooping,
      flip: flip ?? prev.flip,
      aspectRatio: normalizeAspectRatio(aspectRatio),
      captionSettings: captionSettings
        ? {
            ...DEFAULT_CAPTION_SETTINGS,
            ...captionSettings,
            backgroundOpacity: Math.max(0, Math.min(1, captionSettings.backgroundOpacity)),
          }
        : prev.captionSettings,
    }))

    unsubPersist = store.subscribe(() => {
      const s = store.state
      if (s.volume !== 1) storage.set(STORAGE_KEYS.VOLUME, s.volume)
      if (s.isMuted) storage.set(STORAGE_KEYS.MUTED, true)
      if (s.playbackRate !== 1) storage.set(STORAGE_KEYS.PLAYBACK_RATE, s.playbackRate)
      if (s.isLooping) storage.set(STORAGE_KEYS.LOOP, true)
      else storage.remove(STORAGE_KEYS.LOOP)
      if (s.flip !== 'normal') storage.set(STORAGE_KEYS.FLIP, s.flip)
      else storage.remove(STORAGE_KEYS.FLIP)
      if (s.aspectRatio !== 'default') storage.set(STORAGE_KEYS.ASPECT_RATIO, s.aspectRatio)
      else storage.remove(STORAGE_KEYS.ASPECT_RATIO)
      storage.set(STORAGE_KEYS.CAPTION_SETTINGS, s.captionSettings)
    })
  }

  function teardownPreferencePersistence(): void {
    if (unsubPersist) {
      unsubPersist()
      unsubPersist = null
    }
  }

  // ── Thumbnail fetching ───────────────────────────────────
  function doFetchThumbnails(url?: string): void {
    thumbnailAbortController?.abort()
    thumbnailAbortController = null

    if (!url) {
      store.setState((prev) => ({ ...prev, thumbnailCues: [] }))
      return
    }

    const controller = new AbortController()
    thumbnailAbortController = controller
    fetchThumbnails(url, controller.signal, currentOptions.transformThumbnailVTT)
      .then((cues) => {
        if (!controller.signal.aborted) {
          store.setState((prev) => ({ ...prev, thumbnailCues: cues }))
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.warn('[vplayer] thumbnail VTT failed:', err)
          store.setState((prev) => ({ ...prev, thumbnailCues: [] }))
        }
      })
  }

  // ── Plugin API factory ───────────────────────────────────
  function createPluginAPI(pluginName: string): PluginAPI {
    return {
      name: pluginName,
      store: store as any,
      remote: remote as unknown as RemoteRef,
      events,
      storage,
      hotkeys,
      i18n,
      context: {
        containerRef: {
          get current() {
            return containerEl
          },
        },
        videoRef: {
          get current() {
            return engine?.element as HTMLVideoElement | null
          },
        },
      },
      addControl: (def) => {
        store.setState((prev) => ({
          ...prev,
          controls: [...prev.controls.filter((c) => c.name !== def.name), def],
        }))
        return () => {
          store.setState((prev) => ({
            ...prev,
            controls: prev.controls.filter((c) => c.name !== def.name),
          }))
        }
      },
      removeControl: (name) => {
        store.setState((prev) => ({
          ...prev,
          controls: prev.controls.filter((c) => c.name !== name),
        }))
      },
      addSetting: (def) => {
        store.setState((prev) => ({
          ...prev,
          settings: [...prev.settings.filter((s) => s.name !== def.name), def],
        }))
        return () => {
          store.setState((prev) => ({
            ...prev,
            settings: prev.settings.filter((s) => s.name !== def.name),
          }))
        }
      },
      removeSetting: (name) => {
        store.setState((prev) => ({
          ...prev,
          settings: prev.settings.filter((s) => s.name !== name),
        }))
      },
      addLayer: (def) => {
        store.setState((prev) => ({
          ...prev,
          layers: [...prev.layers.filter((l) => l.name !== def.name), def],
        }))
        return () => {
          store.setState((prev) => ({
            ...prev,
            layers: prev.layers.filter((l) => l.name !== def.name),
          }))
        }
      },
      removeLayer: (name) => {
        store.setState((prev) => ({
          ...prev,
          layers: prev.layers.filter((l) => l.name !== name),
        }))
      },
      addHotkey: (binding) => hotkeys.register({ ...binding }),
      addContextMenuItems: (items: ContextMenuItem[]) => {
        store.setState((prev) => ({
          ...prev,
          contextMenuItems: [...prev.contextMenuItems, ...items],
        }))
        return () => {
          store.setState((prev) => ({
            ...prev,
            contextMenuItems: prev.contextMenuItems.filter((existing) => !items.includes(existing)),
          }))
        }
      },
      notify: (message, duration = 3000) => {
        store.setState((prev) => ({
          ...prev,
          notification: { message, duration },
        }))
      },
    }
  }

  // ── Engine lifecycle helpers ─────────────────────────────
  let engineEventCleanups: Array<() => void> = []

  function cleanupEngine(flushBeforeDestroy = true): void {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    reconnectAttempt = 0

    for (const cleanup of engineEventCleanups) cleanup()
    engineEventCleanups = []

    if (engine) {
      if (flushBeforeDestroy) flushProgress(activeProgressTarget, engine)
      engine.destroy()
      engine = null
      player.engine = null
    }
  }

  function mountEngine(video: HTMLVideoElement): void {
    const source = toPlayerSource(currentOptions)
    const eng = createResolvedMediaEngine(video, currentOptions)
    engine = eng
    player.engine = eng
    engineEventCleanups = wireEngineEvents(eng)

    video.playsInline = true
    video.autoplay = Boolean(currentOptions.autoPlay)
    video.preload = video.preload || 'metadata'

    store.setState((prev) => ({
      ...prev,
      status: 'loading',
      source,
      isPlaying: false,
      isPaused: true,
      isBuffering: false,
      isEnded: false,
      currentTime: 0,
      duration: 0,
      bufferedPercent: 0,
      capabilities: getMediaCapabilities(video, containerEl),
      error: null,
    }))

    if (currentOptions.autoPlay) {
      void eng.play()
    }
  }

  function replaceEngineForCurrentSource(flushBeforeCleanup = true): void {
    const video = engine?.element as HTMLVideoElement | null
    if (!video) return
    cleanupEngine(flushBeforeCleanup)
    video.pause()
    video.removeAttribute('src')
    while (video.firstChild) video.removeChild(video.firstChild)
    video.load()
    mountEngine(video)
  }

  // ── Player lifecycle ─────────────────────────────────────
  const player: PlayerInstance = {
    store,
    remote,
    events,
    storage,
    i18n,
    hotkeys,
    engine: null,

    updateOptions(opts): void {
      const srcChanged = typeof opts.src === 'string' && opts.src !== currentOptions.src
      const typeChanged = Object.hasOwn(opts, 'type') && opts.type !== currentOptions.type
      const thumbnailsChanged = Object.hasOwn(opts, 'thumbnails') && opts.thumbnails !== currentOptions.thumbnails
      const thumbnailTransformChanged =
        Object.hasOwn(opts, 'transformThumbnailVTT') &&
        opts.transformThumbnailVTT !== currentOptions.transformThumbnailVTT
      const subtitleCatalogChanged =
        Object.hasOwn(opts, 'subtitleCatalog') && opts.subtitleCatalog !== currentOptions.subtitleCatalog
      const nextOptions = { ...currentOptions, ...opts }
      const nextTarget = resolveProgressTarget(nextOptions)
      const progressTargetChanged =
        nextTarget.id !== activeProgressTarget.id || nextTarget.store !== activeProgressTarget.store
      if (srcChanged || progressTargetChanged) flushProgress(activeProgressTarget, engine)
      currentOptions = nextOptions
      if (srcChanged || progressTargetChanged) resetProgressGeneration()

      if (store.state.isPlaying || mediaSessionMetadata) {
        syncMediaSessionMetadata()
      }

      store.setState((prev) => {
        const qualities = opts.qualities ?? prev.qualities
        return {
          ...prev,
          qualities,
          activeQuality: opts.qualities
            ? opts.qualities.includes(prev.activeQuality)
              ? prev.activeQuality
              : (opts.qualities[0] ?? 'Auto')
            : prev.activeQuality,
        }
      })
      if (opts.subtitles) {
        mergeSubtitleTracks(opts.subtitles)
        if (!store.state.activeSubtitle) {
          const initialTrack = opts.subtitles.find((track) => track.default) ?? null
          if (initialTrack) remote.setActiveSubtitle(normalizeSubtitleTrack(initialTrack))
        }
      }
      if (subtitleCatalogChanged) loadSubtitleCatalog()

      if (thumbnailsChanged || thumbnailTransformChanged) {
        doFetchThumbnails(currentOptions.thumbnails)
      }

      if (srcChanged || typeChanged) {
        replaceEngineForCurrentSource(!(srcChanged || progressTargetChanged))
      } else if (progressTargetChanged && engine && isFiniteDuration(engine.duration)) {
        loadProgress(engine)
      }
    },

    setThumbnails(url?: string): void {
      currentOptions = { ...currentOptions, thumbnails: url }
      doFetchThumbnails(url)
    },

    initPlugins(plugins: PlayerPlugin[]): () => void {
      const cleanups: Array<() => void> = []
      for (const plugin of plugins) {
        const api = createPluginAPI(plugin.name)
        try {
          const cleanup = plugin.setup?.(api)
          if (typeof cleanup === 'function') cleanups.push(cleanup)
        } catch (err) {
          console.error(`[vplayer] Plugin "${plugin.name}" setup error:`, err)
        }
      }
      events.emit('pluginregistered')
      return () => {
        for (const cleanup of cleanups) {
          try {
            cleanup()
          } catch (e) {
            console.error('[vplayer] plugin cleanup error:', e)
          }
        }
      }
    },

    mount(video: HTMLVideoElement, container: HTMLDivElement): void {
      if (engine) this.unmount()
      containerEl = container

      mountEngine(video)

      fullscreenHandler = syncFullscreenState
      document.addEventListener('fullscreenchange', fullscreenHandler)
      document.addEventListener('webkitfullscreenchange', fullscreenHandler as EventListener)
      pagehideHandler = () => flushProgress()
      window.addEventListener('pagehide', pagehideHandler)

      doFetchThumbnails(currentOptions.thumbnails)
      loadSubtitleCatalog()
      const defaultSubtitle = store.state.subtitleTracks.find((track) => track.default)
      if (defaultSubtitle) remote.setActiveSubtitle(defaultSubtitle)
      setupPreferencePersistence()
      remote.setAspectRatio(store.state.aspectRatio)
    },

    unmount(): void {
      cleanupEngine()
      resetProgressGeneration()
      clearMediaSessionMetadata()
      containerEl = null
      thumbnailAbortController?.abort()
      thumbnailAbortController = null
      subtitleAbortController?.abort()
      subtitleAbortController = null
      subtitleCatalogAbortController?.abort()
      subtitleCatalogAbortController = null
      teardownPreferencePersistence()

      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      if (fullscreenHandler) {
        document.removeEventListener('fullscreenchange', fullscreenHandler)
        document.removeEventListener('webkitfullscreenchange', fullscreenHandler as EventListener)
        fullscreenHandler = null
      }
      if (pagehideHandler) {
        window.removeEventListener('pagehide', pagehideHandler)
        pagehideHandler = null
      }

      store.setState((prev) => ({
        ...prev,
        activeSubtitle: null,
        subtitleTracks: prev.subtitleTracks.filter((track) => !track.local),
        subtitleCues: [],
        subtitleStatus: 'idle',
        subtitleError: null,
        status: 'idle',
        isPlaying: false,
        isPaused: true,
        isBuffering: false,
        isEnded: false,
      }))
    },

    destroy(): void {
      this.unmount()
      events.clear()
    },
  }

  return player
}
