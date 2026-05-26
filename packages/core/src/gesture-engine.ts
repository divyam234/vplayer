/**
 * Framework-agnostic touch gesture engine for media players.
 *
 * Detects horizontal swipe (seek), vertical swipe (volume on right half),
 * single tap, and double-tap (skip left/right 10s).
 *
 * Returns plain DOM event handlers — works with any framework.
 */

export interface GestureEngineCallbacks {
  seek: (time: number) => void
  setVolume: (v: number) => void
  skip: (seconds: number) => void
}

export interface GestureHandlers {
  onTouchStart: (e: TouchEvent) => void
  onTouchMove: (e: TouchEvent) => void
  onTouchEnd: (e: TouchEvent) => void
}

type GestureType = 'seek' | 'volume' | null

interface GestureState {
  startX: number
  startY: number
  startTime: number
  startCurrentTime: number
  startVolume: number
  gesture: GestureType
}

export function createGestureEngine(
  getState: () => { currentTime: number; volume: number; duration: number },
  callbacks: GestureEngineCallbacks,
): GestureHandlers {
  let gestureRef: GestureState | null = null
  let lastTap: { time: number } | null = null
  let containerEl: HTMLElement | null = null

  const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window

  function onTouchStart(e: TouchEvent): void {
    if (!isTouchDevice || e.touches.length !== 1) return
    const touch = e.touches[0]
    const state = getState()
    containerEl = e.currentTarget as HTMLElement
    gestureRef = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      startCurrentTime: state.currentTime,
      startVolume: state.volume,
      gesture: null,
    }
  }

  function onTouchMove(e: TouchEvent): void {
    const s = gestureRef
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
      const { duration } = getState()
      if (duration <= 0) return
      const seekDelta = (dx / 300) * duration
      const newTime = Math.max(0, Math.min(duration, s.startCurrentTime + seekDelta))
      callbacks.seek(newTime)
    } else if (s.gesture === 'volume') {
      const container = containerEl
      if (!container) return
      const rect = container.getBoundingClientRect()
      const relX = touch.clientX - rect.left
      // Vertical swipe only on right half of player
      if (relX < rect.width / 2) return
      e.preventDefault()
      const volDelta = -dy / 200
      const newVol = Math.max(0, Math.min(1, s.startVolume + volDelta))
      callbacks.setVolume(newVol)
    }
  }

  function onTouchEnd(e: TouchEvent): void {
    const s = gestureRef
    if (!s) return

    const elapsed = Date.now() - s.startTime
    const isTap = elapsed < 300 && Math.abs(e.changedTouches[0].clientX - s.startX) < 20

    if (isTap) {
      const now = Date.now()

      if (lastTap && now - lastTap.time < 350) {
        // Double tap — skip left/right half
        e.preventDefault()
        const container = containerEl
        if (container) {
          const rect = container.getBoundingClientRect()
          const relX = s.startX - rect.left
          if (relX < rect.width / 2) {
            callbacks.skip(-10)
          } else {
            callbacks.skip(10)
          }
        }
        lastTap = null
      } else {
        lastTap = { time: now }
      }
    }

    gestureRef = null
  }

  return { onTouchStart, onTouchMove, onTouchEnd }
}
