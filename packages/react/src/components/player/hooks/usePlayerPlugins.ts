/**
 * Initializes all registered plugins and wires up the event bus,
 * storage persistence, i18n, hotkey registry, and the PluginAPI.
 */
import { useCallback, useEffect, useRef } from 'react'
import type { Store } from '@tanstack/store'
import { EventBus } from '../event-bus'
import { HotkeyRegistry } from '../hotkey-registry'
import { I18n } from '../i18n'
import { Storage, STORAGE_KEYS } from '../storage'
import type {
  AspectRatioState,
  ContextMenuItem,
  ControlRegistration,
  FlipState,
  LayerRegistration,
  PlayerPlugin,
  PluginAPI,
  RemoteRef,
  SettingRegistration,
} from '../plugin-api'
import type { MediaRemote, MediaState, PlayerContextValue } from '../types'

export interface PlayerSystems {
  events: EventBus
  storage: Storage
  i18n: I18n
  hotkeys: HotkeyRegistry
}

export function createPlayerSystems(lang?: string, translations?: Record<string, string>): PlayerSystems {
  const events = new EventBus()
  const storage = new Storage()
  const i18n = new I18n(lang)
  if (translations) {
    i18n.addTranslations(lang ?? 'en', translations)
  }
  const hotkeys = new HotkeyRegistry()
  return { events, storage, i18n, hotkeys }
}

/** Build a RemoteRef from a MediaRemote */
function toRemoteRef(remote: MediaRemote): RemoteRef {
  return {
    play: remote.play,
    pause: remote.pause,
    togglePlay: remote.togglePlay,
    seek: remote.seek,
    skip: remote.skip,
    setVolume: remote.setVolume,
    toggleMute: remote.toggleMute,
    setPlaybackRate: remote.setPlaybackRate,
    toggleFullscreen: remote.toggleFullscreen,
    togglePiP: remote.togglePiP,
    takeScreenshot: remote.takeScreenshot,
    setFlip: remote.setFlip,
    setAspectRatio: remote.setAspectRatio,
    toggleLoop: remote.toggleLoop,
    toggleInfoPanel: remote.toggleInfoPanel,
  }
}

function createPluginAPI(
  pluginName: string,
  store: Store<MediaState>,
  remote: MediaRemote,
  systems: PlayerSystems,
  context: PlayerContextValue,
): PluginAPI {
  const { events, storage, hotkeys, i18n } = systems
  const remoteRef = toRemoteRef(remote)

  const addControl = (def: ControlRegistration): (() => void) => {
    store.setState((prev) => ({
      ...prev,
      controls: [...prev.controls.filter((c) => c.name !== def.name), def],
    }))
    return () => removeControl(def.name)
  }

  const removeControl = (name: string): void => {
    store.setState((prev) => ({
      ...prev,
      controls: prev.controls.filter((c) => c.name !== name),
    }))
  }

  const addSetting = (def: SettingRegistration): (() => void) => {
    store.setState((prev) => ({
      ...prev,
      settings: [...prev.settings.filter((s) => s.name !== def.name), def],
    }))
    return () => removeSetting(def.name)
  }

  const removeSetting = (name: string): void => {
    store.setState((prev) => ({
      ...prev,
      settings: prev.settings.filter((s) => s.name !== name),
    }))
  }

  const addLayer = (def: LayerRegistration): (() => void) => {
    store.setState((prev) => ({
      ...prev,
      layers: [...prev.layers.filter((l) => l.name !== def.name), def],
    }))
    return () => removeLayer(def.name)
  }

  const removeLayer = (name: string): void => {
    store.setState((prev) => ({
      ...prev,
      layers: prev.layers.filter((l) => l.name !== name),
    }))
  }

  return {
    name: pluginName,
    store,
    remote: remoteRef,
    events,
    storage,
    hotkeys,
    i18n,
    context: {
      containerRef: context.containerRef,
      videoRef: context.videoRef,
    },
    addControl,
    removeControl,
    addSetting,
    removeSetting,
    addLayer,
    removeLayer,
    addHotkey: (binding) => hotkeys.register({ ...binding }),
    addContextMenuItems: (items: ContextMenuItem[]): (() => void) => {
      store.setState((prev) => ({
        ...prev,
        contextMenuItems: [...prev.contextMenuItems, ...items],
      }))
      return () => {
        store.setState((prev) => ({
          ...prev,
          contextMenuItems: prev.contextMenuItems.filter(
            (existing) => !items.includes(existing),
          ),
        }))
      }
    },
    notify: (message: string, duration = 3000) => {
      store.setState((prev) => ({ ...prev, notification: { message, duration } }))
    },
  }
}

export function usePlayerPlugins(
  plugins: PlayerPlugin[] | undefined,
  store: Store<MediaState>,
  remote: MediaRemote,
  systems: PlayerSystems,
  context: PlayerContextValue,
) {
  const cleanupsRef = useRef<Array<() => void>>([])

  const initPlugins = useCallback(() => {
    // Clean up previous plugins
    for (const cleanup of cleanupsRef.current) {
      try { cleanup() } catch (e) { console.error('[vplayer] plugin cleanup error:', e) }
    }
    cleanupsRef.current = []

    if (!plugins || plugins.length === 0) return

    for (const plugin of plugins) {
      const api = createPluginAPI(plugin.name, store, remote, systems, context)
      try {
        const cleanup = plugin.setup?.(api)
        if (typeof cleanup === 'function') {
          cleanupsRef.current.push(cleanup)
        }
      } catch (err) {
        console.error(`[vplayer] Plugin "${plugin.name}" setup error:`, err)
      }
    }

    systems.events.emit('pluginregistered')
  }, [plugins, store, remote, systems, context])

  // Initialize plugins on mount
  useEffect(() => {
    initPlugins()
    return () => {
      for (const cleanup of cleanupsRef.current) {
        try { cleanup() } catch (e) { console.error('[vplayer] plugin cleanup error:', e) }
      }
      cleanupsRef.current = []
    }
  }, [initPlugins])
}

/**
 * Persist user preferences to storage on state changes.
 */
export function useStorageSync(
  store: Store<MediaState>,
  storage: Storage,
) {
  useEffect(() => {
    const unsub1 = store.subscribe(() => {
      const s = store.state
      if (s.volume !== 1) storage.set(STORAGE_KEYS.VOLUME, s.volume)
      if (s.isMuted) storage.set(STORAGE_KEYS.MUTED, true)
      if (s.playbackRate !== 1) storage.set(STORAGE_KEYS.PLAYBACK_RATE, s.playbackRate)
      if (s.activeSubtitle) storage.set(STORAGE_KEYS.SUBTITLE_LANG, s.activeSubtitle.lang)
      if (s.activeQuality && s.activeQuality !== 'Auto') storage.set(STORAGE_KEYS.QUALITY, s.activeQuality)
      if (s.isLooping) storage.set(STORAGE_KEYS.LOOP, true)
      if (!s.isLooping) storage.remove(STORAGE_KEYS.LOOP)
      if (s.flip !== 'normal') storage.set(STORAGE_KEYS.FLIP, s.flip)
      if (s.flip === 'normal') storage.remove(STORAGE_KEYS.FLIP)
      if (s.aspectRatio !== 'default') storage.set(STORAGE_KEYS.ASPECT_RATIO, s.aspectRatio)
      if (s.aspectRatio === 'default') storage.remove(STORAGE_KEYS.ASPECT_RATIO)
    })

    // Restore persisted settings
    const volume = storage.get<number>(STORAGE_KEYS.VOLUME)
    const muted = storage.get<boolean>(STORAGE_KEYS.MUTED)
    const rate = storage.get<number>(STORAGE_KEYS.PLAYBACK_RATE)
    const subLang = storage.get<string>(STORAGE_KEYS.SUBTITLE_LANG)
    const quality = storage.get<string>(STORAGE_KEYS.QUALITY)

    const loop = storage.get<boolean>(STORAGE_KEYS.LOOP)
    const flip = storage.get<FlipState>(STORAGE_KEYS.FLIP)
    const aspectRatio = storage.get<AspectRatioState>(STORAGE_KEYS.ASPECT_RATIO)

    store.setState((prev) => ({
      ...prev,
      volume: volume ?? prev.volume,
      isMuted: muted ?? prev.isMuted,
      playbackRate: rate ?? prev.playbackRate,
      activeSubtitle: subLang
        ? prev.subtitleTracks.find((t) => t.lang === subLang) ?? prev.activeSubtitle
        : prev.activeSubtitle,
      activeQuality: quality && prev.qualities.includes(quality) ? quality : prev.activeQuality,
      isLooping: loop ?? prev.isLooping,
      flip: flip ?? prev.flip,
      aspectRatio: aspectRatio ?? prev.aspectRatio,
    }))

    return () => unsub1()
  }, [store, storage])
}

/**
 * Default hotkeys for the player.
 */
export function registerDefaultHotkeys(
  hotkeys: HotkeyRegistry,
  remote: MediaRemote,
  store: Store<MediaState>,
): Array<() => void> {
  return [
    hotkeys.register({ key: 'Space', description: 'Toggle play/pause', handler: (e) => { e.preventDefault(); remote.togglePlay() } }),
    hotkeys.register({ key: 'KeyK', description: 'Toggle play/pause', handler: (e) => { e.preventDefault(); remote.togglePlay() } }),
    hotkeys.register({ key: 'KeyL', description: 'Toggle loop', handler: (e) => { e.preventDefault(); remote.toggleLoop() } }),
    hotkeys.register({ key: 'KeyI', description: 'Toggle info panel', handler: (e) => { e.preventDefault(); remote.toggleInfoPanel() } }),
    hotkeys.register({ key: 'KeyF', description: 'Toggle fullscreen', handler: (e) => { e.preventDefault(); remote.toggleFullscreen() } }),
    hotkeys.register({ key: 'KeyM', description: 'Toggle mute', handler: (e) => { e.preventDefault(); remote.toggleMute() } }),
    hotkeys.register({ key: 'ArrowLeft', description: 'Seek backward 5s', handler: (e) => { e.preventDefault(); remote.skip(-5) } }),
    hotkeys.register({ key: 'ArrowRight', description: 'Seek forward 5s', handler: (e) => { e.preventDefault(); remote.skip(5) } }),
    hotkeys.register({
      key: 'ArrowUp', description: 'Volume up 10%', handler: (e) => {
        e.preventDefault()
        const v = Math.min(1, store.state.volume + 0.1)
        remote.setVolume(v)
      },
    }),
    hotkeys.register({
      key: 'ArrowDown', description: 'Volume down 10%', handler: (e) => {
        e.preventDefault()
        const v = Math.max(0, store.state.volume - 0.1)
        remote.setVolume(v)
      },
    }),
  ]
}
