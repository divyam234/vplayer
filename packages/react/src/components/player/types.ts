import type { ComponentType, ReactNode, RefObject } from 'react'
import type { Store } from '@tanstack/store'
import type {
  EventBus,
  HotkeyRegistry,
  I18n,
  MediaRemote,
  MediaState,
  PlayerLabels,
  PlayerOptions,
  Storage,
  SubtitleTrack,
  ThumbnailCue,
} from '@vplayer/core'
import type {
  AspectRatioState,
  ControlRegistration,
  ContextMenuItem,
  FlipState,
  LayerRegistration,
  PlayerPlugin,
  PluginAPI,
  SettingRegistration,
} from '@vplayer/core'

export type { MediaState, MediaRemote, PlayerLabels, PlayerOptions }
export type { AspectRatioState, ControlRegistration, ContextMenuItem, FlipState, LayerRegistration, PlayerPlugin, PluginAPI, SettingRegistration }
export type { EventBus, HotkeyRegistry, I18n, Storage, SubtitleTrack, ThumbnailCue }

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

export interface PlayerProps extends PlayerOptions {
  className?: string
  children?: ReactNode
  labels?: Partial<PlayerLabels>
  icons?: Partial<PlayerIcons>
  slots?: PlayerSlots
}

export interface PlayerContextValue {
  containerRef: RefObject<HTMLDivElement | null>
  videoRef: RefObject<HTMLVideoElement | null>
  labels: PlayerLabels
  icons: PlayerIcons
  slots: PlayerSlots
  mediaStore: Store<MediaState>
  mediaRemote: MediaRemote
  events: EventBus
  storage: Storage
  i18n: I18n
  hotkeys: HotkeyRegistry
}
