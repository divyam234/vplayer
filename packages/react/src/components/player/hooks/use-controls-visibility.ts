import type { Store } from '@tanstack/store'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import type { MediaState } from '../types'

export function useControlsVisibility(mediaStore: Store<MediaState>) {
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showControls = useCallback(() => {
    mediaStore.setState((prev) => ({ ...prev, controlsVisible: true }))
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => {
      if (mediaStore.state.isPlaying) {
        mediaStore.setState((prev) => ({ ...prev, controlsVisible: false }))
      }
    }, 3000)
  }, [mediaStore])

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [])

  const rootHandlers = useMemo(
    () => ({
      onMouseMove: showControls,
      onMouseEnter: showControls,
    }),
    [showControls],
  )

  return { rootHandlers, showControls }
}
