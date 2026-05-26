import { Store } from '@tanstack/store'
import { EventBus } from './event-bus'
import { HotkeyRegistry } from './hotkey-registry'
import { I18n } from './i18n'
import { Storage, STORAGE_KEYS } from './storage'
import { fetchThumbnails } from './subtitle-parser'
import type { PlayerOptions, MediaState, MediaRemote, PlayerInstance } from './types'
import type { PluginAPI, PlayerPlugin, ContextMenuItem, FlipState, AspectRatioState, RemoteRef } from './plugin-api'
import type { SubtitleTrack } from './subtitle-parser'

function createMediaStore(options: PlayerOptions): Store<MediaState> {
  return new Store<MediaState>({
    isPlaying: false,
    isPaused: true,
    isBuffering: false,
    isEnded: false,
    isLooping: false,
    currentTime: 0,
    duration: 0,
    bufferedPercent: 0,
    volume: 1,
    isMuted: false,
    playbackRate: 1,
    isFullscreen: false,
    activeSubtitle: options.subtitles?.find((s) => s.default) ?? options.subtitles?.[0] ?? null,
    subtitleTracks: options.subtitles ?? [],
    activeQuality: options.qualities?.[0] ?? 'Auto',
    qualities: options.qualities ?? [],
    thumbnailCues: [],
    controlsVisible: true,
    controls: [],
    settings: [],
    layers: [],
    notification: null,
    flip: 'normal',
    aspectRatio: 'default',
    error: null,
    contextMenuItems: [],
    contextMenuEnabled: true,
    infoPanelVisible: false,
  })
}

export function createPlayer(options: PlayerOptions): PlayerInstance {
  const store = createMediaStore(options)
  const events = new EventBus()
  const storage = new Storage()
  const i18n = new I18n(options.lang)
  if (options.translations) {
    i18n.addTranslations(options.lang ?? 'en', options.translations)
  }
  const hotkeys = new HotkeyRegistry()

  // ── Register default keyboard shortcuts ────────────────────
  function registerDefaultHotkeys(): void {
    hotkeys.register({ key: 'Space', description: 'Toggle play/pause', handler: (e) => { e.preventDefault(); remote.togglePlay() } })
    hotkeys.register({ key: 'KeyK', description: 'Toggle play/pause', handler: (e) => { e.preventDefault(); remote.togglePlay() } })
    hotkeys.register({ key: 'KeyL', description: 'Toggle loop', handler: (e) => { e.preventDefault(); remote.toggleLoop() } })
    hotkeys.register({ key: 'KeyI', description: 'Toggle info panel', handler: (e) => { e.preventDefault(); remote.toggleInfoPanel() } })
    hotkeys.register({ key: 'KeyF', description: 'Toggle fullscreen', handler: (e) => { e.preventDefault(); remote.toggleFullscreen() } })
    hotkeys.register({ key: 'KeyM', description: 'Toggle mute', handler: (e) => { e.preventDefault(); remote.toggleMute() } })
    hotkeys.register({ key: 'ArrowLeft', description: 'Seek backward 5s', handler: (e) => { e.preventDefault(); remote.skip(-5) } })
    hotkeys.register({ key: 'ArrowRight', description: 'Seek forward 5s', handler: (e) => { e.preventDefault(); remote.skip(5) } })
    hotkeys.register({ key: 'ArrowUp', description: 'Volume up 10%', handler: (e) => { e.preventDefault(); const v = Math.min(1, store.state.volume + 0.1); remote.setVolume(v) } })
    hotkeys.register({ key: 'ArrowDown', description: 'Volume down 10%', handler: (e) => { e.preventDefault(); const v = Math.max(0, store.state.volume - 0.1); remote.setVolume(v) } })
  }
  if (options.defaultHotkeys !== false) {
    registerDefaultHotkeys()
  }

  const reconnectMax = options.reconnectMax ?? 3
  const reconnectSleep = options.reconnectSleep ?? 1500

  let videoEl: HTMLVideoElement | null = null
  let containerEl: HTMLDivElement | null = null
  let fullscreenHandler: (() => void) | null = null
  let progressTimer: ReturnType<typeof setInterval> | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempt = 0
  let thumbnailAbort = false

  // ── Remote commands ───────────────────────────────────────
  const remote: MediaRemote = {
    play: () => { videoEl?.play().catch(() => {}) },
    pause: () => { videoEl?.pause() },
    togglePlay: () => {
      if (!videoEl) return
      if (videoEl.paused || videoEl.ended) {
        videoEl.play().catch(() => {})
      } else {
        videoEl.pause()
      }
    },
    seek: (time: number) => { if (videoEl) videoEl.currentTime = time },
    skip: (seconds: number) => {
      if (!videoEl) return
      const newTime = Math.max(0, Math.min(videoEl.currentTime + seconds, videoEl.duration || 0))
      videoEl.currentTime = newTime
    },
    setVolume: (v: number) => {
      const el = videoEl
      if (!el) return
      el.volume = v
      if (v > 0) el.muted = false
      store.setState((prev) => ({ ...prev, volume: v, isMuted: el.muted }))
    },
    toggleMute: () => {
      const el = videoEl
      if (!el) return
      el.muted = !el.muted
      store.setState((prev) => ({ ...prev, isMuted: el.muted }))
    },
    setPlaybackRate: (rate: number) => {
      if (!videoEl) return
      videoEl.playbackRate = rate
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
      if (!videoEl) return
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {})
      } else {
        videoEl.requestPictureInPicture().catch(() => {})
      }
    },
    setActiveSubtitle: (track) => {
      store.setState((prev) => ({ ...prev, activeSubtitle: track }))
    },
    setActiveQuality: (q: string) => {
      store.setState((prev) => ({ ...prev, activeQuality: q }))
    },
    takeScreenshot: () => {
      if (!videoEl || videoEl.videoWidth === 0 || videoEl.videoHeight === 0) return
      const canvas = document.createElement('canvas')
      canvas.width = videoEl.videoWidth
      canvas.height = videoEl.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(videoEl, 0, 0)
      canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `vplayer-screenshot-${Date.now()}.png`
        a.click()
        URL.revokeObjectURL(url)
      }, 'image/png')
    },
    setFlip: (flip: FlipState) => {
      if (!videoEl) return
      let transform = ''
      if (flip === 'horizontal') transform = 'scaleX(-1)'
      if (flip === 'vertical') transform = 'scaleY(-1)'
      if (flip === 'normal') transform = ''
      videoEl.style.transform = transform
      store.setState((prev) => ({ ...prev, flip }))
    },
    setAspectRatio: (ratio: AspectRatioState) => {
      if (!videoEl) return
      let objectFit = 'contain'
      if (ratio === 'fill') objectFit = 'fill'
      if (ratio === '16:9' || ratio === '4:3') {
        objectFit = 'contain'
        videoEl.style.aspectRatio = ratio
      } else {
        videoEl.style.aspectRatio = ''
      }
      videoEl.style.objectFit = objectFit
      store.setState((prev) => ({ ...prev, aspectRatio: ratio }))
    },
    toggleLoop: () => {
      const el = videoEl
      if (!el) return
      el.loop = !el.loop
      store.setState((prev) => ({ ...prev, isLooping: el.loop }))
    },
    toggleInfoPanel: () => {
      store.setState((prev) => ({ ...prev, infoPanelVisible: !prev.infoPanelVisible }))
    },
  }

  // ── Video event handlers ─────────────────────────────────
  const videoHandlers = {
    onPlay: () => {
      store.setState((prev) => ({
        ...prev, isPlaying: true, isPaused: false, isEnded: false,
        // Clear error on successful play (e.g. after reconnect)
        error: null,
      }))
      reconnectAttempt = 0
    },
    onPause: () => store.setState((prev) => ({ ...prev, isPlaying: false, isPaused: !prev.isEnded, controlsVisible: true })),
    onEnded: () => {
      store.setState((prev) => ({ ...prev, isPlaying: false, isPaused: false, isEnded: true, controlsVisible: true }))
      options.onEnded?.()
    },
    onTimeUpdate: () => {
      const el = videoEl
      if (!el) return
      store.setState((prev) => ({ ...prev, currentTime: el.currentTime }))
      options.onTimeUpdate?.(el.currentTime)
    },
    onLoadedMetadata: () => {
      const el = videoEl
      if (!el) return
      store.setState((prev) => ({
        ...prev,
        duration: el.duration,
        volume: el.volume,
        isMuted: el.muted,
        playbackRate: el.playbackRate,
      }))
    },
    onProgress: () => {
      const el = videoEl
      if (!el || el.buffered.length === 0) return
      const end = el.buffered.end(el.buffered.length - 1)
      store.setState((prev) => ({ ...prev, bufferedPercent: el.duration > 0 ? (end / el.duration) * 100 : 0 }))
    },
    onWaiting: () => store.setState((prev) => ({ ...prev, isBuffering: true })),
    onCanPlay: () => store.setState((prev) => ({ ...prev, isBuffering: false })),
    onError: () => {
      const message = videoEl?.error?.message ?? 'Video playback error'
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
          videoEl?.load()
        }, reconnectSleep)
      }
    },
  }

  // ── Progress save helpers ─────────────────────────────────
  function startProgressSave(): void {
    stopProgressSave()
    progressTimer = setInterval(() => {
      const el = videoEl
      if (!el) return
      storage.set(STORAGE_KEYS.PLAYBACK_PROGRESS, {
        time: el.currentTime,
        duration: el.duration,
      })
    }, 5000)
  }

  function stopProgressSave(): void {
    if (progressTimer !== null) {
      clearInterval(progressTimer)
      progressTimer = null
    }
  }

  // Watch isPlaying to start/stop progress saving
  const unsubProgress = store.subscribe(() => {
    const s = store.state
    if (s.isPlaying && s.duration > 0) {
      if (progressTimer === null) startProgressSave()
    } else {
      stopProgressSave()
    }
  })

  // ── Persist preferences (opt-in via options) ──────────────
  let unsubPersist: (() => void) | null = null

  function setupPreferencePersistence(): void {
    if (!options.persistPreferences) return

    // Read saved preferences into store
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

    // Subscribe to store changes → write to storage
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

  // ── Thumbnail fetch helper ────────────────────────────────
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

  // ── Plugin API factory ────────────────────────────────────
  function createPluginAPI(pluginName: string): PluginAPI {
    return {
      name: pluginName,
      store,
      remote: remote as unknown as RemoteRef,
      events,
      storage,
      hotkeys,
      i18n,
      context: {
        containerRef: { get current() { return containerEl } },
        videoRef: { get current() { return videoEl } },
      },
      addControl: (def) => {
        store.setState((prev) => ({ ...prev, controls: [...prev.controls.filter((c) => c.name !== def.name), def] }))
        return () => { store.setState((prev) => ({ ...prev, controls: prev.controls.filter((c) => c.name !== def.name) })) }
      },
      removeControl: (name) => { store.setState((prev) => ({ ...prev, controls: prev.controls.filter((c) => c.name !== name) })) },
      addSetting: (def) => {
        store.setState((prev) => ({ ...prev, settings: [...prev.settings.filter((s) => s.name !== def.name), def] }))
        return () => { store.setState((prev) => ({ ...prev, settings: prev.settings.filter((s) => s.name !== def.name) })) }
      },
      removeSetting: (name) => { store.setState((prev) => ({ ...prev, settings: prev.settings.filter((s) => s.name !== name) })) },
      addLayer: (def) => {
        store.setState((prev) => ({ ...prev, layers: [...prev.layers.filter((l) => l.name !== def.name), def] }))
        return () => { store.setState((prev) => ({ ...prev, layers: prev.layers.filter((l) => l.name !== def.name) })) }
      },
      removeLayer: (name) => { store.setState((prev) => ({ ...prev, layers: prev.layers.filter((l) => l.name !== name) })) },
      addHotkey: (binding) => hotkeys.register({ ...binding }),
      addContextMenuItems: (items: ContextMenuItem[]) => {
        store.setState((prev) => ({ ...prev, contextMenuItems: [...prev.contextMenuItems, ...items] }))
        return () => {
          store.setState((prev) => ({ ...prev, contextMenuItems: prev.contextMenuItems.filter((existing) => !items.includes(existing)) }))
        }
      },
      notify: (message, duration = 3000) => {
        store.setState((prev) => ({ ...prev, notification: { message, duration } }))
      },
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────
  const player: PlayerInstance = {
    store,
    remote,
    events,
    storage,
    i18n,
    hotkeys,
    videoHandlers,

    updateOptions(opts: { subtitles?: SubtitleTrack[]; qualities?: string[] }): void {
      store.setState((prev) => {
        const subtitleTracks = opts.subtitles ?? prev.subtitleTracks
        const qualities = opts.qualities ?? prev.qualities
        return {
          ...prev,
          subtitleTracks,
          qualities,
          activeSubtitle: opts.subtitles
            ? (
                prev.activeSubtitle && opts.subtitles.some((t) => t.lang === prev.activeSubtitle!.lang)
                  ? prev.activeSubtitle
                  : opts.subtitles.find((s) => s.default) ?? opts.subtitles[0] ?? null
              )
            : prev.activeSubtitle,
          activeQuality: opts.qualities
            ? (opts.qualities.includes(prev.activeQuality) ? prev.activeQuality : opts.qualities[0] ?? 'Auto')
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
          try { cleanup() } catch (e) { console.error('[vplayer] plugin cleanup error:', e) }
        }
      }
    },

    mount(video: HTMLVideoElement, container: HTMLDivElement): void {
      videoEl = video
      containerEl = container

      // Track fullscreen state
      fullscreenHandler = () => {
        store.setState((prev) => ({ ...prev, isFullscreen: !!document.fullscreenElement }))
      }
      document.addEventListener('fullscreenchange', fullscreenHandler)

      // Auto-fetch thumbnails if configured
      doFetchThumbnails(options.thumbnails)

      // Preference persistence (opt-in)
      setupPreferencePersistence()
    },

    unmount(): void {
      videoEl = null
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

  return player
}
