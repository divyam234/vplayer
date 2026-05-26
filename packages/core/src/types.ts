import type { Store } from '@tanstack/store'
import type { EventBus } from './event-bus'
import type { HotkeyRegistry } from './hotkey-registry'
import type { I18n } from './i18n'
import type { Storage } from './storage'
import type { SubtitleTrack, ThumbnailCue } from './subtitle-parser'
import type { PlayerPlugin } from './plugin-api'
import type {
  AspectRatioState,
  ControlRegistration,
  ContextMenuItem,
  FlipState,
  LayerRegistration,
  SettingRegistration,
} from './plugin-api'

export interface PlayerOptions {
  src: string
  poster?: string
  subtitles?: SubtitleTrack[]
  qualities?: string[]
  autoPlay?: boolean
  thumbnails?: string
  lang?: string
  translations?: Record<string, string>
  plugins?: PlayerPlugin[]
  persistPreferences?: boolean
  defaultHotkeys?: boolean
  reconnectMax?: number
  reconnectSleep?: number
  onTimeUpdate?: (time: number) => void
  onEnded?: () => void
  onError?: (message: string) => void
}

export interface PlayerError {
  message: string
  reconnectAttempt: number
  isReconnecting: boolean
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
  controls: ControlRegistration[]
  settings: SettingRegistration[]
  layers: LayerRegistration[]
  notification: { message: string; duration: number } | null
  flip: FlipState
  aspectRatio: AspectRatioState
  error: PlayerError | null
  contextMenuItems: ContextMenuItem[]
  contextMenuEnabled: boolean
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

export interface PlayerSystems {
  events: EventBus
  storage: Storage
  i18n: I18n
  hotkeys: HotkeyRegistry
}

export interface PlayerInstance {
  store: Store<MediaState>
  remote: MediaRemote
  events: EventBus
  storage: Storage
  i18n: I18n
  hotkeys: HotkeyRegistry
  videoHandlers: {
    onPlay: () => void
    onPause: () => void
    onEnded: () => void
    onTimeUpdate: () => void
    onLoadedMetadata: () => void
    onProgress: () => void
    onWaiting: () => void
    onCanPlay: () => void
    onError: () => void
  }
  updateOptions(opts: { subtitles?: SubtitleTrack[]; qualities?: string[] }): void
  setThumbnails(url?: string): void
  initPlugins(plugins: PlayerPlugin[]): () => void
  mount(videoEl: HTMLVideoElement, containerEl: HTMLDivElement): void
  unmount(): void
  destroy(): void
}
