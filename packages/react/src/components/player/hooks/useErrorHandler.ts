import { useEffect, useRef, useState } from 'react'
import { useMediaState, usePlayerContext } from '../context'

export interface UseErrorHandlerOptions {
  reconnectSleep?: number
  reconnectMax?: number
}

/**
 * Watches for video errors and attempts automatic reconnection.
 *
 * On error:
 *  1. Emits `video:error` on the event bus
 *  2. Waits `reconnectSleep` ms
 *  3. Calls `video.load()` to retry
 *  4. Emits `video:reconnect` on the event bus
 *
 * Resets attempt count when playback resumes or the error is cleared.
 */
export function useErrorHandler(
  options?: UseErrorHandlerOptions,
): { reconnectAttempt: number; isReconnecting: boolean } {
  const error = useMediaState('error')
  const isPlaying = useMediaState('isPlaying')
  const { videoRef, events } = usePlayerContext()

  const reconnectSleep = options?.reconnectSleep ?? 1500
  const reconnectMax = options?.reconnectMax ?? 3

  const [reconnectAttempt, setReconnectAttempt] = useState(0)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptRef = useRef(0)

  useEffect(() => {
    // Reset state when playback succeeds or error is cleared
    if (isPlaying) {
      attemptRef.current = 0
      setReconnectAttempt(0)
      setIsReconnecting(false)
      return
    }

    if (!error) return

    // Error is present and not playing — start reconnection flow
    events.emit('video:error', { message: error.message })

    if (attemptRef.current < reconnectMax) {
      setIsReconnecting(true)

      timerRef.current = setTimeout(() => {
        const video = videoRef.current
        if (!video) return

        attemptRef.current += 1
        setReconnectAttempt(attemptRef.current)
        events.emit('video:reconnect', { attempt: attemptRef.current })

        video.load()
      }, reconnectSleep)

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current)
          timerRef.current = null
        }
      }
    }
  }, [error, isPlaying, videoRef, events, reconnectSleep, reconnectMax])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { reconnectAttempt, isReconnecting }
}
