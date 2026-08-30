import type { Store } from '@tanstack/store'
import type {
  CaptionSettings,
  EventBus,
  HotkeyRegistry,
  I18n,
  MediaEngine,
  MediaRemote,
  MediaState,
  PlayerLabels,
  PlayerInstance,
  PlayerOptions,
  Storage,
  SubtitleCatalog,
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
import type { ReactNode, RefObject } from 'react'

import type { PluginAPIBuilder } from './adapter-types'
import type { PlayerIcons } from './icon'

export type { MediaState, MediaRemote, PlayerLabels, PlayerOptions }
export type { IconComponent, PlayerIcons } from './icon'
export type {
  AspectRatioState,
  ControlRegistration,
  ContextMenuItem,
  FlipState,
  LayerRegistration,
  PlayerPlugin,
  PluginAPI,
  SettingRegistration,
}
export type { CaptionSettings, EventBus, HotkeyRegistry, I18n, Storage, SubtitleCatalog, SubtitleTrack, ThumbnailCue }

export interface PlayerSlots {
  playButton?: ReactNode
  seekBar?: ReactNode
  volumeControl?: ReactNode
  timeDisplay?: ReactNode
  settingsButton?: ReactNode
  miniPlayerButton?: ReactNode
  settingsMenu?: ReactNode
  fullscreenButton?: ReactNode
  pipButton?: ReactNode
  bufferingOverlay?: ReactNode
  pauseOverlay?: ReactNode
  endOverlay?: ReactNode
}

export type MiniPlayerPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

export interface MiniPlayerOptions {
  /** Enables YouTube-like floating mini-player mode. */
  enabled?: boolean
  /** Automatically enter mini-player when the player leaves the viewport. Defaults to false. */
  auto?: boolean
  /** Floating corner. Defaults to bottom-right. */
  position?: MiniPlayerPosition
  /** CSS width for the mini player. Defaults to 360px. */
  width?: number | string
}

export interface ThumbnailPreviewOptions {
  /** Enables seekbar thumbnail previews. Defaults to true when thumbnails are configured. */
  enabled?: boolean
  /** Preview viewport width in pixels. Defaults to 180. */
  width?: number
  /** Preview viewport height in pixels. Defaults to 101. */
  height?: number
  /** Gap from the seekbar in pixels. Defaults to 10. */
  gap?: number
  /** Show the time pill under the preview. Defaults to true. */
  showTime?: boolean
  /** How scaled sprite regions should fit the preview viewport. Defaults to cover. */
  fit?: 'cover' | 'contain'
}

export interface NormalizedThumbnailPreviewOptions {
  enabled: boolean
  width: number
  height: number
  gap: number
  showTime: boolean
  fit: 'cover' | 'contain'
}

export interface MiniPlayerState {
  enabled: boolean
  active: boolean
  auto: boolean
  position: MiniPlayerPosition
  width: number | string
  enter: () => void
  exit: () => void
  toggle: () => void
}

export interface PlayerProps extends PlayerOptions {
  className?: string
  children?: ReactNode
  labels?: Partial<PlayerLabels>
  icons?: Partial<PlayerIcons>
  slots?: PlayerSlots
  miniPlayer?: boolean | MiniPlayerOptions
  thumbnailPreview?: boolean | ThumbnailPreviewOptions
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
  engine: MediaEngine | null
  instance: PlayerInstance
  createPluginAPI: PluginAPIBuilder
  controlsVisibility: {
    pinControls: () => () => void
  }
  miniPlayer: MiniPlayerState
  thumbnailPreview: NormalizedThumbnailPreviewOptions
}
