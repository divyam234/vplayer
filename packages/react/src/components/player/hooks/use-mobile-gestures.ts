import type { Store } from '@tanstack/store'
import { createGestureEngine } from '@vplayer/core'
import type { GestureHandlers, MediaRemote, MediaState } from '@vplayer/core'
/**
 * React adapter for the framework-agnostic GestureEngine from @vplayer/core.
 *
 * ## Usage
 * ```ts
 * const gestures = usePlayerGestures() // reads from PlayerContext
 * const internalGestures = usePlayerGestures(instance.store, instance.remote)
 * ```
 */
import { useContext, useMemo } from 'react'

import { PlayerContext } from '../context'

export function usePlayerGestures(store?: Store<MediaState>, remote?: MediaRemote): GestureHandlers {
  const context = useContext(PlayerContext)
  const resolvedStore = store ?? context?.mediaStore
  const resolvedRemote = remote ?? context?.mediaRemote

  const engine = useMemo(() => {
    if (!resolvedStore || !resolvedRemote) return null
    return createGestureEngine(
      () => {
        const state = resolvedStore.state
        return {
          currentTime: state.currentTime,
          volume: state.volume,
          duration: state.duration,
        }
      },
      {
        seek: resolvedRemote.seek,
        setVolume: resolvedRemote.setVolume,
        skip: resolvedRemote.skip,
      },
    )
  }, [resolvedRemote, resolvedStore])

  if (!engine) throw new Error('usePlayerGestures requires PlayerContext or explicit store and remote arguments')
  return engine
}
