import type { ComponentType, ReactNode, RefObject } from 'react'
import type { Store } from '@tanstack/store'
import type { PluginAPIBuilder } from '@vplayer/framework'
import type {
  EventBus,
  HotkeyRegistry,
  I18n,
  MediaRemote,
  MediaState,
  PlayerIcons,
  PlayerLabels,
  PlayerInstance,
  PlayerOptions,
  SvgIcon,
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

export type { MediaState, MediaRemote, PlayerIcons, PlayerLabels, PlayerOptions, SvgIcon }
export type { AspectRatioState, ControlRegistration, ContextMenuItem, FlipState, LayerRegistration, PlayerPlugin, PluginAPI, SettingRegistration }
export type { EventBus, HotkeyRegistry, I18n, Storage, SubtitleTrack, ThumbnailCue }

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
  instance: PlayerInstance
  createPluginAPI: PluginAPIBuilder
}
