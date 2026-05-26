import { createContext, useContext } from 'react'
import { useStore } from '@tanstack/react-store'
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
