import { Store } from '@tanstack/store'
import type { MediaState, PlayerProps } from './types'

export function createMediaStore(props: PlayerProps) {
  return new Store<MediaState>({
    isPlaying: false,
    isPaused: true,
    isBuffering: false,
    isEnded: false,
    currentTime: 0,
    duration: 0,
    bufferedPercent: 0,
    volume: 1,
    isMuted: false,
    playbackRate: 1,
    isFullscreen: false,
    activeSubtitle: props.subtitles?.find((s) => s.default) ?? props.subtitles?.[0] ?? null,
    subtitleTracks: props.subtitles ?? [],
    activeQuality: props.qualities?.[0] ?? 'Auto',
    qualities: props.qualities ?? [],
    thumbnailCues: [],
    controlsVisible: true,
  })
}
