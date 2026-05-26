import { useCallback, useRef } from 'react'
import { useMediaRemote, usePlayerContext } from '../context'

type GestureType = 'seek' | 'volume' | null

interface GestureState {
  startX: number
  startY: number
  startTime: number
  startCurrentTime: number
  startVolume: number
  gesture: GestureType
}

export function useMobileGestures() {
  const remote = useMediaRemote()
  const { mediaStore } = usePlayerContext()
  const gestureRef = useRef<GestureState | null>(null)
  const lastTapRef = useRef<{ time: number; x: number } | null>(null)
  const isTouchDeviceRef = useRef(
    typeof window !== 'undefined' && 'ontouchstart' in window,
  )

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isTouchDeviceRef.current || e.touches.length !== 1) return
      const touch = e.touches[0]
      const ms = mediaStore.state
      gestureRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        startCurrentTime: ms.currentTime,
        startVolume: ms.volume,
        gesture: null,
      }
    },
    [mediaStore],
  )

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const s = gestureRef.current
      if (!s || e.touches.length !== 1) return

      const touch = e.touches[0]
      const dx = touch.clientX - s.startX
      const dy = touch.clientY - s.startY
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)

      // Determine gesture direction once enough movement is detected
      if (!s.gesture) {
        if (absDx > absDy && absDx > 20) {
          s.gesture = 'seek'
        } else if (absDy > absDx && absDy > 20) {
          s.gesture = 'volume'
        }
      }

      if (s.gesture === 'seek') {
        e.preventDefault()
        const { duration } = mediaStore.state
        if (duration <= 0) return
        // Map horizontal swipe proportionally over 300px for full range
        const seekDelta = (dx / 300) * duration
        const newTime = Math.max(
          0,
          Math.min(duration, s.startCurrentTime + seekDelta),
        )
        remote.seek(newTime)
      } else if (s.gesture === 'volume') {
        const rect = e.currentTarget.getBoundingClientRect()
        const relX = touch.clientX - rect.left
        // Vertical swipe only on right half of player
        if (relX < rect.width / 2) return
        e.preventDefault()
        const volDelta = -dy / 200
        const newVol = Math.max(
          0,
          Math.min(1, s.startVolume + volDelta),
        )
        remote.setVolume(newVol)
      }
    },
    [mediaStore, remote],
  )

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const s = gestureRef.current
      if (!s) return

      const elapsed = Date.now() - s.startTime
      const isTap =
        elapsed < 300 &&
        Math.abs(e.changedTouches[0].clientX - s.startX) < 20

      if (isTap) {
        const now = Date.now()
        const last = lastTapRef.current

        if (last && now - last.time < 350) {
          // Double tap — skip left/right half
          e.preventDefault()
          const rect = e.currentTarget.getBoundingClientRect()
          const relX = s.startX - rect.left
          if (relX < rect.width / 2) {
            remote.skip(-10)
          } else {
            remote.skip(10)
          }
          lastTapRef.current = null
        } else {
          lastTapRef.current = { time: now, x: s.startX }
        }
      }

      gestureRef.current = null
    },
    [remote],
  )

  return { onTouchStart, onTouchMove, onTouchEnd }
}
