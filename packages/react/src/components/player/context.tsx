import { createContext, useContext } from 'react'
import { useStore } from '@tanstack/react-store'
import type { PluginAPI } from './plugin-api'
import type { MediaRemote, MediaState, PlayerContextValue } from './types'

export const PlayerContext = createContext<PlayerContextValue | null>(null)

export function usePlayerContext(): PlayerContextValue {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('Player sub-components must be inside <VideoPlayer>')
  return ctx
}

export function useMediaState(): MediaState
export function useMediaState<K extends keyof MediaState>(key: K): MediaState[K]
export function useMediaState<TSelected>(selector: (state: MediaState) => TSelected): TSelected
export function useMediaState<K extends keyof MediaState, TSelected>(
  keyOrSelector?: K | ((state: MediaState) => TSelected),
) {
  const ctx = usePlayerContext()
  if (typeof keyOrSelector === 'function') {
    return useStore(ctx.mediaStore, keyOrSelector)
  }
  if (!keyOrSelector) {
    return useStore(ctx.mediaStore, (state) => state)
  }
  return useStore(ctx.mediaStore, (state) => state[keyOrSelector])
}

export function useMediaRemote(): MediaRemote {
  return usePlayerContext().mediaRemote
}

/**
 * Hook for components that need access to the PluginAPI.
 * Note: addControl/addSetting/addLayer/addHotkey will log warnings
 * when called outside plugin setup — plugins should only register
 * during their setup() callback.
 */
export function usePluginAPI(): PluginAPI {
  const ctx = usePlayerContext()
  const { mediaStore, mediaRemote, events, storage, hotkeys, i18n } = ctx
  return {
    name: '__internal__',
    store: mediaStore,
    remote: mediaRemote,
    events,
    storage,
    hotkeys,
    i18n,
    context: {
      containerRef: ctx.containerRef,
      videoRef: ctx.videoRef,
    },
    addControl: () => { console.warn('[vplayer] addControl only available during plugin setup'); return () => {} },
    removeControl: () => {},
    addSetting: () => { console.warn('[vplayer] addSetting only available during plugin setup'); return () => {} },
    removeSetting: () => {},
    addLayer: () => { console.warn('[vplayer] addLayer only available during plugin setup'); return () => {} },
    removeLayer: () => {},
    addHotkey: () => { console.warn('[vplayer] addHotkey only available during plugin setup'); return () => {} },
    addContextMenuItems: () => { console.warn('[vplayer] addContextMenuItems only available during plugin setup'); return () => {} },
    notify: () => {},
  }
}
