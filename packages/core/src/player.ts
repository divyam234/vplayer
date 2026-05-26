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
import { NativeVideoEngine } from './media-engine'
import type { MediaEngine } from './media-engine'
import type { PluginAPI, PlayerPlugin, ContextMenuItem, FlipState, AspectRatioState, RemoteRef } from './plugin-api'
import { createMediaStore } from './state/slices'
import { Storage, STORAGE_KEYS } from './storage'
import { fetchThumbnails } from './subtitle-parser'
import type { SubtitleTrack } from './subtitle-parser'
import type { PlayerOptions, MediaRemote, PlayerInstance } from './types'

export function createPlayer(options: PlayerOptions): PlayerInstance {
  // ── Core services ──────────────────────────────────────────
  const store = createMediaStore()
  const events = new EventBus()
  const storage = new Storage()
  const i18n = new I18n(options.lang)
  if (options.translations) {
    i18n.addTranslations(options.lang ?? 'en', options.translations)
  }
  const hotkeys = new HotkeyRegistry()

  const reconnectMax = options.reconnectMax ?? 3
  const reconnectSleep = options.reconnectSleep ?? 1500

  // ── Mutable state (not in store — engine refs, timers) ────
  let containerEl: HTMLDivElement | null = null
  let engine: MediaEngine | null = null
  let fullscreenHandler: (() => void) | null = null
  let progressTimer: ReturnType<typeof setInterval> | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempt = 0
  let thumbnailAbort = false

  // ── Helper: safe engine access ───────────────────────────
  function getEngine(): MediaEngine {
    if (!engine) throw new Error('[vplayer] Player not mounted — engine unavailable')
    return engine
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
  if (options.defaultHotkeys !== false) registerDefaultHotkeys()

  // ── Remote: commands that translate to engine calls ───────
  const remote: MediaRemote = {
    play: () => getEngine().play(),
    pause: () => getEngine().pause(),
    togglePlay: () => {
      const e = engine
      if (!e) return
      if (e.paused || e.ended) e.play()
      else e.pause()
    },
    seek: (time: number) => getEngine().seek(time),
    skip: (seconds: number) => {
      const e = engine
      if (!e) return
      const newTime = Math.max(0, Math.min(e.currentTime + seconds, e.duration || 0))
      e.seek(newTime)
    },
    setVolume: (v: number) => {
      const e = engine
      if (!e) return
      e.setVolume(v)
      if (v > 0) e.setMuted(false)
      store.setState((prev) => ({ ...prev, volume: v, isMuted: e.muted }))
    },
    toggleMute: () => {
      const e = engine
      if (!e) return
      e.setMuted(!e.muted)
      store.setState((prev) => ({ ...prev, isMuted: e.muted }))
    },
    setPlaybackRate: (rate: number) => {
      getEngine().setPlaybackRate(rate)
      store.setState((prev) => ({ ...prev, playbackRate: rate }))
    },
    toggleFullscreen: () => {
      if (!containerEl) return
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      } else {
        containerEl.requestFullscreen().catch(() => {})
      }
    },
    togglePiP: () => {
      const e = engine
      if (!e) return
      if (document.pictureInPictureElement) {
        e.exitPictureInPicture()
      } else {
        e.requestPictureInPicture()
      }
    },
    setActiveSubtitle: (track) => {
      store.setState((prev) => ({ ...prev, activeSubtitle: track }))
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
      const el = engine?.element as HTMLVideoElement | null
      if (!el) return
      let objectFit = 'contain'
      if (ratio === 'fill') objectFit = 'fill'
      if (ratio === '16:9' || ratio === '4:3') {
        el.style.aspectRatio = ratio
      } else {
        el.style.aspectRatio = ''
      }
      el.style.objectFit = objectFit
      store.setState((prev) => ({ ...prev, aspectRatio: ratio }))
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
        store.setState((prev) => ({
          ...prev,
          isPlaying: true,
          isPaused: false,
          isEnded: false,
          error: null,
        }))
        reconnectAttempt = 0
      }),

      eng.on('pause', () => {
        store.setState((prev) => ({
          ...prev,
          isPlaying: false,
          isPaused: !prev.isEnded,
          controlsVisible: true,
        }))
      }),

      eng.on('ended', () => {
        store.setState((prev) => ({
          ...prev,
          isPlaying: false,
          isPaused: false,
          isEnded: true,
          controlsVisible: true,
        }))
        options.onEnded?.()
      }),

      eng.on('timeupdate', () => {
        store.setState((prev) => ({ ...prev, currentTime: eng.currentTime }))
        options.onTimeUpdate?.(eng.currentTime)
      }),

      eng.on('loadedmetadata', () => {
        store.setState((prev) => ({
          ...prev,
          duration: eng.duration,
          volume: eng.volume,
          isMuted: eng.muted,
          playbackRate: eng.playbackRate,
        }))
      }),

      eng.on('progress', () => {
        const buf = eng.buffered
        if (buf.length === 0) return
        const end = buf.end(buf.length - 1)
        store.setState((prev) => ({
          ...prev,
          bufferedPercent: eng.duration > 0 ? (end / eng.duration) * 100 : 0,
        }))
      }),

      eng.on('waiting', () => {
        store.setState((prev) => ({ ...prev, isBuffering: true }))
      }),

      eng.on('canplay', () => {
        store.setState((prev) => ({ ...prev, isBuffering: false }))
      }),

      eng.on('error', () => {
        const err = eng.error
        const message = err?.message ?? 'Video playback error'
        store.setState((prev) => ({
          ...prev,
          error: { message, reconnectAttempt, isReconnecting: false },
        }))
        options.onError?.(message)
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
            store.setState((prev) => ({
              ...prev,
              error: { message, reconnectAttempt, isReconnecting: false },
            }))
            events.emit('video:reconnect', { attempt: reconnectAttempt })
            eng.load()
          }, reconnectSleep)
        }
      }),
    ]
  }

  // ── Progress persistence ─────────────────────────────────
  function startProgressSave(): void {
    stopProgressSave()
    progressTimer = setInterval(() => {
      const e = engine
      if (!e) return
      storage.set(STORAGE_KEYS.PLAYBACK_PROGRESS, {
        time: e.currentTime,
        duration: e.duration,
      })
    }, 5000)
  }

  function stopProgressSave(): void {
    if (progressTimer !== null) {
      clearInterval(progressTimer)
      progressTimer = null
    }
  }

  const unsubProgress = store.subscribe(() => {
    const s = store.state
    if (s.isPlaying && s.duration > 0) {
      if (progressTimer === null) startProgressSave()
    } else {
      stopProgressSave()
    }
  })

  // ── Preference persistence (opt-in) ──────────────────────
  let unsubPersist: (() => void) | null = null

  function setupPreferencePersistence(): void {
    if (!options.persistPreferences) return

    const volume = storage.get<number>(STORAGE_KEYS.VOLUME)
    const muted = storage.get<boolean>(STORAGE_KEYS.MUTED)
    const rate = storage.get<number>(STORAGE_KEYS.PLAYBACK_RATE)
    const loop = storage.get<boolean>(STORAGE_KEYS.LOOP)
    const flip = storage.get<FlipState>(STORAGE_KEYS.FLIP)
    const aspectRatio = storage.get<AspectRatioState>(STORAGE_KEYS.ASPECT_RATIO)
    store.setState((prev) => ({
      ...prev,
      volume: volume ?? prev.volume,
      isMuted: muted ?? prev.isMuted,
      playbackRate: rate ?? prev.playbackRate,
      isLooping: loop ?? prev.isLooping,
      flip: flip ?? prev.flip,
      aspectRatio: aspectRatio ?? prev.aspectRatio,
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
    thumbnailAbort = true
    if (!url) {
      store.setState((prev) => ({ ...prev, thumbnailCues: [] }))
      return
    }
    thumbnailAbort = false
    fetchThumbnails(url)
      .then((cues) => {
        if (!thumbnailAbort) {
          store.setState((prev) => ({ ...prev, thumbnailCues: cues }))
        }
      })
      .catch(() => {
        if (!thumbnailAbort) {
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

  // ── Player lifecycle ─────────────────────────────────────
  const player: PlayerInstance = {
    store,
    remote,
    events,
    storage,
    i18n,
    hotkeys,
    engine: null as unknown as MediaEngine, // populated after mount

    updateOptions(opts: { subtitles?: SubtitleTrack[]; qualities?: string[] }): void {
      store.setState((prev) => {
        const subtitleTracks = opts.subtitles ?? prev.subtitleTracks
        const qualities = opts.qualities ?? prev.qualities
        return {
          ...prev,
          subtitleTracks,
          qualities,
          activeSubtitle: opts.subtitles
            ? prev.activeSubtitle && opts.subtitles.some((t) => t.lang === prev.activeSubtitle!.lang)
              ? prev.activeSubtitle
              : (opts.subtitles.find((s) => s.default) ?? opts.subtitles[0] ?? null)
            : prev.activeSubtitle,
          activeQuality: opts.qualities
            ? opts.qualities.includes(prev.activeQuality)
              ? prev.activeQuality
              : (opts.qualities[0] ?? 'Auto')
            : prev.activeQuality,
        }
      })
    },

    setThumbnails(url?: string): void {
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
      containerEl = container

      // Create the media engine (custom or default NativeVideoEngine)
      const eng = options.engine
        ? typeof options.engine === 'function'
          ? (options.engine as (v: HTMLVideoElement) => MediaEngine)(video)
          : (options.engine as MediaEngine)
        : new NativeVideoEngine(video)
      engine = eng
      ;(player as any).engine = eng

      // Wire engine events → store updates
      const cleanups = wireEngineEvents(eng)
      engineEventCleanups = cleanups

      // Track fullscreen state
      fullscreenHandler = () => {
        store.setState((prev) => ({ ...prev, isFullscreen: !!document.fullscreenElement }))
      }
      document.addEventListener('fullscreenchange', fullscreenHandler)

      // Auto-fetch thumbnails
      doFetchThumbnails(options.thumbnails)

      // Preference persistence (opt-in)
      setupPreferencePersistence()
    },

    unmount(): void {
      // Clean up engine event wiring
      for (const cleanup of engineEventCleanups) cleanup()
      engineEventCleanups = []

      // Destroy engine
      if (engine) {
        engine.destroy()
        engine = null
        ;(player as any).engine = null
      }

      containerEl = null
      stopProgressSave()
      thumbnailAbort = true
      teardownPreferencePersistence()

      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      if (fullscreenHandler) {
        document.removeEventListener('fullscreenchange', fullscreenHandler)
        fullscreenHandler = null
      }
    },

    destroy(): void {
      this.unmount()
      unsubProgress()
      events.clear()
    },
  }

  // ── Engine event cleanup tracker ────────────────────────
  let engineEventCleanups: Array<() => void> = []

  return player
}
