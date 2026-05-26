import type { Store } from '@tanstack/store'
import type {
  EventBus, HotkeyRegistry, I18n, MediaEngine, MediaRemote, MediaState,
  PlayerIcons, PlayerLabels, PlayerInstance, PlayerOptions, Storage,
} from '@vplayer/core'
import type { PluginAPIBuilder } from '@vplayer/framework'
import type { JSX } from 'solid-js'

export type { MediaState, MediaRemote, PlayerIcons, PlayerLabels, PlayerOptions }
export type { EventBus, HotkeyRegistry, I18n, Storage }

export interface PlayerSlots {
  playButton?: JSX.Element
  seekBar?: JSX.Element
  volumeControl?: JSX.Element
  timeDisplay?: JSX.Element
  settingsButton?: JSX.Element
  fullscreenButton?: JSX.Element
  pipButton?: JSX.Element
  bufferingOverlay?: JSX.Element
  pauseOverlay?: JSX.Element
  endOverlay?: JSX.Element
}

export interface PlayerProps extends PlayerOptions {
  class?: string
  children?: JSX.Element
  labels?: Partial<PlayerLabels>
  icons?: Partial<PlayerIcons>
  slots?: PlayerSlots
}

export interface PlayerContextValue {
  containerRef: { current: HTMLDivElement | null }
  videoRef: { current: HTMLVideoElement | null }
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
}
