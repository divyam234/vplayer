import { useEffect } from 'react'
import type { Store } from '@tanstack/store'
import type { MediaState } from '../types'
import type { SubtitleTrack } from '../subtitle-parser'

interface MediaPropsSyncInput {
  subtitles?: SubtitleTrack[]
  qualities?: string[]
}

export function useMediaPropsSync({ subtitles, qualities }: MediaPropsSyncInput, mediaStore: Store<MediaState>) {
  useEffect(() => {
    mediaStore.setState((prev) => ({
      ...prev,
      subtitleTracks: subtitles ?? [],
      qualities: qualities ?? [],
      activeSubtitle:
        prev.activeSubtitle && (subtitles ?? []).some((track) => track.lang === prev.activeSubtitle?.lang)
          ? prev.activeSubtitle
          : subtitles?.find((s) => s.default) ?? subtitles?.[0] ?? null,
      activeQuality: (qualities ?? []).includes(prev.activeQuality)
        ? prev.activeQuality
        : qualities?.[0] ?? 'Auto',
    }))
  }, [subtitles, qualities, mediaStore])
}
