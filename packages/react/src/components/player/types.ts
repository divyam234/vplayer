import type { ComponentType, ReactNode, RefObject } from 'react'
import type { Store } from '@tanstack/store'
import type { SubtitleTrack, ThumbnailCue } from './subtitle-parser'

export type IconComponent = ComponentType<{ size?: number; className?: string; fill?: string }>

export interface PlayerIcons {
  play: IconComponent
  pause: IconComponent
  replay: IconComponent
  skipBack: IconComponent
  skipForward: IconComponent
  volumeHigh: IconComponent
  volumeLow: IconComponent
  volumeOff: IconComponent
  settings: IconComponent
  pip: IconComponent
  fullscreen: IconComponent
  fullscreenExit: IconComponent
  chevronLeft: IconComponent
  check: IconComponent
  spinner: IconComponent
}

export interface PlayerLabels {
  play: string
  pause: string
  replay: string
  mute: string
  unmute: string
  settings: string
  pip: string
  pipExit: string
  fullscreen: string
  fullscreenExit: string
  speed: string
  quality: string
  subtitles: string
  off: string
  endedTitle: string
}

export interface PlayerSlots {
  playButton?: ReactNode
  seekBar?: ReactNode
  volumeControl?: ReactNode
  timeDisplay?: ReactNode
  settingsButton?: ReactNode
  settingsMenu?: ReactNode
  fullscreenButton?: ReactNode
  pipButton?: ReactNode
  bufferingOverlay?: ReactNode
  pauseOverlay?: ReactNode
  endOverlay?: ReactNode
}

export interface PlayerProps {
  src: string
  poster?: string
  subtitles?: SubtitleTrack[]
  qualities?: string[]
  className?: string
  children?: ReactNode
  onTimeUpdate?: (time: number) => void
  onEnded?: () => void
  autoPlay?: boolean
  thumbnails?: string
  labels?: Partial<PlayerLabels>
  icons?: Partial<PlayerIcons>
  slots?: PlayerSlots
}

export interface MediaState {
  isPlaying: boolean
  isPaused: boolean
  isBuffering: boolean
  isEnded: boolean
  currentTime: number
  duration: number
  bufferedPercent: number
  volume: number
  isMuted: boolean
  playbackRate: number
  isFullscreen: boolean
  activeSubtitle: SubtitleTrack | null
  subtitleTracks: SubtitleTrack[]
  activeQuality: string
  qualities: string[]
  thumbnailCues: ThumbnailCue[]
  controlsVisible: boolean
}

export interface MediaRemote {
  play: () => void
  pause: () => void
  togglePlay: () => void
  seek: (time: number) => void
  skip: (seconds: number) => void
  setVolume: (v: number) => void
  toggleMute: () => void
  setPlaybackRate: (rate: number) => void
  toggleFullscreen: () => void
  togglePiP: () => void
  setActiveSubtitle: (track: SubtitleTrack | null) => void
  setActiveQuality: (q: string) => void
}

export interface PlayerContextValue {
  containerRef: RefObject<HTMLDivElement | null>
  videoRef: RefObject<HTMLVideoElement | null>
  labels: PlayerLabels
  icons: PlayerIcons
  slots: PlayerSlots
  mediaStore: Store<MediaState>
  mediaRemote: MediaRemote
}
