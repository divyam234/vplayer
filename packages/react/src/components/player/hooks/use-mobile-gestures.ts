/**
 * React adapter for the framework-agnostic GestureEngine from @vplayer/core.
 *
 * ## Usage from inside VideoPlayer / PlayerProvider (no context yet)
 * ```ts
 * const gestures = usePlayerGestures(instance.store, instance.remote)
 * ```
 *
 * ## Usage from descendant consumer components (context available)
 * ```ts
 * const gestures = usePlayerGestures() // reads from PlayerContext automatically
 * ```
 */
import { useMemo } from 'react'
import { createGestureEngine } from '@vplayer/core'
import { usePlayerContext, usePlayerRemote } from '../context'
import type { GestureHandlers, MediaRemote, MediaState } from '@vplayer/core'
import type { Store } from '@tanstack/store'

export function usePlayerGestures(
  store?: Store<MediaState>,
  remote?: MediaRemote,
): GestureHandlers {
  // When called with args from inside VideoPlayer, usePlayerContext is
  // short-circuited by ?? — it's never evaluated. Only when called without
  // args from consumer components does it read from context.
  const s = store ?? usePlayerContext().mediaStore
  const r = remote ?? usePlayerRemote()

  const engine = useMemo(
    () =>
      createGestureEngine(
        () => {
          const st = s.state
          return {
            currentTime: st.currentTime,
            volume: st.volume,
            duration: st.duration,
          }
        },
        {
          seek: r.seek,
          setVolume: r.setVolume,
          skip: r.skip,
        },
      ),
    [s, r],
  )

  return engine
}
