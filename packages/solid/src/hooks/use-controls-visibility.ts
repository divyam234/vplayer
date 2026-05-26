import type { Store } from '@tanstack/store'
import { createMemo, createSignal, onCleanup } from 'solid-js'

import type { MediaState } from '../types'

export function useControlsVisibility(mediaStore: Store<MediaState>) {
  const [hideTimer, setHideTimer] = createSignal<ReturnType<typeof setTimeout> | null>(null)

  const showControls = () => {
    mediaStore.setState((prev) => ({ ...prev, controlsVisible: true }))
    const current = hideTimer()
    if (current) clearTimeout(current)
    const timer = setTimeout(() => {
      if (mediaStore.state.isPlaying) {
        mediaStore.setState((prev) => ({ ...prev, controlsVisible: false }))
      }
    }, 3000)
    setHideTimer(timer)
  }

  onCleanup(() => {
    const current = hideTimer()
    if (current) clearTimeout(current)
  })

  const rootHandlers = {
    onMouseMove: showControls,
    onMouseEnter: showControls,
  }

  return { rootHandlers, showControls }
}
