/**
 * React adapter for the framework-agnostic GestureEngine from @vplayer/core.
 *
 * Bridges the TouchEvent type and wires the gesture engine to the player's remote.
 */
import { useMemo } from 'react'
import { createGestureEngine } from '@vplayer/core'
import { useMediaRemote, usePlayerContext } from '../context'

export function useMobileGestures() {
  const remote = useMediaRemote()
  const { mediaStore } = usePlayerContext()

  const engine = useMemo(
    () =>
      createGestureEngine(
        () => {
          const s = mediaStore.state
          return {
            currentTime: s.currentTime,
            volume: s.volume,
            duration: s.duration,
          }
        },
        {
          seek: remote.seek,
          setVolume: remote.setVolume,
          skip: remote.skip,
        },
      ),
    [mediaStore, remote],
  )

  return engine
}
