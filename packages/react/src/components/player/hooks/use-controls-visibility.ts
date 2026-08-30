import type { Store } from '@tanstack/store'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import type { MediaState } from '../types'

const DEFAULT_HIDE_DELAY = 3000
const MINI_HIDE_DELAY = 1400

export function useControlsVisibility(mediaStore: Store<MediaState>) {
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPlayingRef = useRef(mediaStore.state.isPlaying)
  const pinCountRef = useRef(0)

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  const hideControls = useCallback(() => {
    clearHideTimer()
    if (pinCountRef.current === 0 && mediaStore.state.isPlaying) {
      mediaStore.setState((prev) => ({ ...prev, controlsVisible: false }))
    }
  }, [clearHideTimer, mediaStore])

  const scheduleHide = useCallback(
    (delay = DEFAULT_HIDE_DELAY) => {
      clearHideTimer()
      if (pinCountRef.current > 0) return
      hideTimerRef.current = setTimeout(() => {
        hideTimerRef.current = null
        if (pinCountRef.current === 0 && mediaStore.state.isPlaying) {
          mediaStore.setState((prev) => ({ ...prev, controlsVisible: false }))
        }
      }, delay)
    },
    [clearHideTimer, mediaStore],
  )

  const showControls = useCallback(
    (delay = DEFAULT_HIDE_DELAY) => {
      mediaStore.setState((prev) => ({ ...prev, controlsVisible: true }))
      if (mediaStore.state.isPlaying) scheduleHide(delay)
      else clearHideTimer()
    },
    [clearHideTimer, mediaStore, scheduleHide],
  )

  const pinControls = useCallback(() => {
    pinCountRef.current += 1
    clearHideTimer()
    mediaStore.setState((prev) => ({ ...prev, controlsVisible: true }))

    let released = false
    return () => {
      if (released) return
      released = true
      pinCountRef.current = Math.max(0, pinCountRef.current - 1)
      if (pinCountRef.current === 0 && mediaStore.state.isPlaying) scheduleHide()
    }
  }, [clearHideTimer, mediaStore, scheduleHide])

  useEffect(() => {
    const subscription = mediaStore.subscribe(() => {
      const isPlaying = mediaStore.state.isPlaying
      if (isPlaying === lastPlayingRef.current) return
      lastPlayingRef.current = isPlaying

      if (isPlaying) scheduleHide(DEFAULT_HIDE_DELAY)
      else {
        clearHideTimer()
        mediaStore.setState((prev) => ({ ...prev, controlsVisible: true }))
      }
    })

    return () => subscription.unsubscribe()
  }, [clearHideTimer, mediaStore, scheduleHide])

  useEffect(() => {
    return () => clearHideTimer()
  }, [clearHideTimer])

  const rootHandlers = useMemo(
    () => ({
      onMouseMove: () => showControls(),
      onMouseEnter: () => showControls(),
      onMouseLeave: () => scheduleHide(MINI_HIDE_DELAY),
      onFocus: () => showControls(),
      onBlur: () => scheduleHide(MINI_HIDE_DELAY),
    }),
    [scheduleHide, showControls],
  )

  return useMemo(
    () => ({ clearHideTimer, hideControls, pinControls, rootHandlers, scheduleHide, showControls }),
    [clearHideTimer, hideControls, pinControls, rootHandlers, scheduleHide, showControls],
  )
}
