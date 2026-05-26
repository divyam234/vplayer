import { useEffect, useRef } from 'react'
import { useMediaState, usePlayerContext } from '../context'
import { STORAGE_KEYS } from '../storage'

/**
 * Periodically saves playback progress to storage while the video is playing.
 *
 * Writes `{ time, duration }` to `STORAGE_KEYS.PLAYBACK_PROGRESS` every 5 seconds,
 * enabling auto-resume on subsequent visits.
 */
export function useAutoPlayback(): void {
  const currentTime = useMediaState('currentTime')
  const duration = useMediaState('duration')
  const isPlaying = useMediaState('isPlaying')
  const { storage } = usePlayerContext()

  // Use refs so the interval callback always reads the latest values
  // without needing currentTime in the effect dependency array.
  const currentTimeRef = useRef(currentTime)
  const durationRef = useRef(duration)

  currentTimeRef.current = currentTime
  durationRef.current = duration

  useEffect(() => {
    if (!isPlaying || durationRef.current <= 0) return

    const interval = setInterval(() => {
      storage.set(STORAGE_KEYS.PLAYBACK_PROGRESS, {
        time: currentTimeRef.current,
        duration: durationRef.current,
      })
    }, 5000)

    return () => clearInterval(interval)
  }, [isPlaying, storage])
}
