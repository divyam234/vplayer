import { useEffect } from 'react'
import type { Store } from '@tanstack/store'
import type { MediaState } from '../types'

export function useFullscreenState(mediaStore: Store<MediaState>) {
  useEffect(() => {
    const handler = () => {
      mediaStore.setState((prev) => ({ ...prev, isFullscreen: !!document.fullscreenElement }))
    }
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [mediaStore])
}
