import { useEffect } from 'react'
import type { Store } from '@tanstack/store'
import { fetchThumbnails } from '../subtitle-parser'
import type { MediaState } from '../types'

export function useThumbnailCues(thumbnails: string | undefined, mediaStore: Store<MediaState>) {
  useEffect(() => {
    if (!thumbnails) {
      mediaStore.setState((prev) => ({ ...prev, thumbnailCues: [] }))
      return
    }
    let cancelled = false
    fetchThumbnails(thumbnails)
      .then((cues) => {
        if (!cancelled) {
          mediaStore.setState((prev) => ({ ...prev, thumbnailCues: cues }))
        }
      })
      .catch(() => {
        if (!cancelled) {
          mediaStore.setState((prev) => ({ ...prev, thumbnailCues: [] }))
        }
      })
    return () => {
      cancelled = true
    }
  }, [thumbnails, mediaStore])
}
