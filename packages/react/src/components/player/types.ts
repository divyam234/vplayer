import type { ComponentType, ReactNode, RefObject } from 'react'
import type { Store } from '@tanstack/store'
import type { EventBus } from './event-bus'
import type { HotkeyRegistry } from './hotkey-registry'
import type { I18n } from './i18n'
import type { Storage } from './storage'
import type { SubtitleTrack, ThumbnailCue } from './subtitle-parser'
import type {
  AspectRatioState,
  ControlRegistration,
  ContextMenuItem,
  FlipState,
  LayerRegistration,
  PlayerPlugin,
  SettingRegistration,
} from './plugin-api'

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
  screenshot: IconComponent
  flip: IconComponent
  aspectRatio: IconComponent
  info: IconComponent
  loop: IconComponent
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
  screenshot: string
  flip: string
  flipNormal: string
  flipHorizontal: string
  flipVertical: string
  aspectRatio: string
  aspectRatioDefault: string
  aspectRatio16: string
  aspectRatio4: string
  aspectRatioFill: string
  continue: string
  continuePlay: string
  continueStartOver: string
  error: string
  retry: string
  contextMenuPlay: string
  contextMenuPause: string
  contextMenuLoop: string
  infoPanel: string
  loop: string
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
  onError?: (message: string) => void
  autoPlay?: boolean
  thumbnails?: string
  labels?: Partial<PlayerLabels>
  icons?: Partial<PlayerIcons>
  slots?: PlayerSlots
  /** Registered plugins. Initialized when player becomes ready. */
  plugins?: PlayerPlugin[]
  /** Initial language for i18n. */
  lang?: string
  /** Custom translations for i18n. */
  translations?: Record<string, string>
}

export interface MediaState {
  isPlaying: boolean
  isPaused: boolean
  isBuffering: boolean
  isEnded: boolean
  isLooping: boolean
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
  /** Plugin-registered controls */
  controls: ControlRegistration[]
  /** Plugin-registered settings */
  settings: SettingRegistration[]
  /** Plugin-registered layers */
  layers: LayerRegistration[]
  /** Active notification (from plugin API) */
  notification: { message: string; duration: number } | null
  /** Video flip state */
  flip: FlipState
  /** Video aspect ratio */
  aspectRatio: AspectRatioState
  /** Error state */
  error: { message: string; reconnectAttempt: number } | null
  /** Context menu items (registrations from plugins) */
  contextMenuItems: ContextMenuItem[]
  /** Whether context menu is enabled */
  contextMenuEnabled: boolean
  /** Whether debug info panel is visible */
  infoPanelVisible: boolean
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
  takeScreenshot: () => void
  setFlip: (flip: FlipState) => void
  setAspectRatio: (ratio: AspectRatioState) => void
  toggleLoop: () => void
  toggleInfoPanel: () => void
}

export interface PlayerContextValue {
  containerRef: RefObject<HTMLDivElement | null>
  videoRef: RefObject<HTMLVideoElement | null>
  labels: PlayerLabels
  icons: PlayerIcons
  slots: PlayerSlots
  mediaStore: Store<MediaState>
  mediaRemote: MediaRemote
  /** Event bus for plugin communication */
  events: EventBus
  /** Persistence layer */
  storage: Storage
  /** I18n instance */
  i18n: I18n
  /** Hotkey registry */
  hotkeys: HotkeyRegistry
}
