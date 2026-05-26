/**
 * Solid context + hooks for @vplayer/solid.
 *
 * ⚠️ Solid convention — usePlayerState() returns a **getter function** `() => T`,
 * NOT a raw value. Call the getter in JSX to track reactivity:
 *
 * ```tsx
 * const currentTime = usePlayerState('currentTime')
 * return <div>{currentTime()}</div>
 * ```
 *
 * This is because Solid components don't re-run like React components;
 * they track signal reads in expressions.
 */

import type { PluginAPI } from '@vplayer/core'
import { createContext, useContext } from 'solid-js'

import { useStoreSignal } from './hooks/use-store'
import type { MediaRemote, MediaState, PlayerContextValue } from './types'

export const PlayerContext = createContext<PlayerContextValue | null>(null)

export function usePlayerContext(): PlayerContextValue {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('Player sub-components must be inside <VideoPlayer>')
  return ctx
}

/**
 * Reactive store accessor.
 *
 * Overloads:
 * - `usePlayerState()` → getter for full MediaState
 * - `usePlayerState('currentTime')` → getter for a specific key
 * - `usePlayerState(fn)` → getter for a derived value
 */
export function usePlayerState(): () => MediaState
export function usePlayerState<K extends keyof MediaState>(key: K): () => MediaState[K]
export function usePlayerState<TSelected>(selector: (state: MediaState) => TSelected): () => TSelected
export function usePlayerState<K extends keyof MediaState, TSelected>(
  keyOrSelector?: K | ((state: MediaState) => TSelected),
): () => MediaState | MediaState[K] | TSelected {
  const ctx = usePlayerContext()

  if (typeof keyOrSelector === 'function') {
    return useStoreSignal(ctx.mediaStore, keyOrSelector)
  }
  if (keyOrSelector) {
    return useStoreSignal(ctx.mediaStore, (state) => state[keyOrSelector])
  }
  return useStoreSignal(ctx.mediaStore, (state) => state)
}

export function usePlayerRemote(): MediaRemote {
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
    addControl: () => {
      console.warn('[vplayer] addControl only available during plugin setup')
      return () => {}
    },
    removeControl: () => {},
    addSetting: () => {
      console.warn('[vplayer] addSetting only available during plugin setup')
      return () => {}
    },
    removeSetting: () => {},
    addLayer: () => {
      console.warn('[vplayer] addLayer only available during plugin setup')
      return () => {}
    },
    removeLayer: () => {},
    addHotkey: () => {
      console.warn('[vplayer] addHotkey only available during plugin setup')
      return () => {}
    },
    addContextMenuItems: () => {
      console.warn('[vplayer] addContextMenuItems only available during plugin setup')
      return () => {}
    },
    notify: () => {},
  }
}
