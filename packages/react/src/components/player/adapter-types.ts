import type { Store } from '@tanstack/store'
import type {
  EventBus,
  HotkeyRegistry,
  I18n,
  MediaRemote,
  MediaState,
  PlayerInstance,
  PlayerLabels,
  PlayerOptions,
  PluginAPI,
  Storage,
} from '@vplayer/core'

export interface UsePlayerResult {
  state: MediaState
  remote: MediaRemote
  attach(container: HTMLDivElement, video: HTMLVideoElement): void
  detach(): void
  use(plugin: import('@vplayer/core').PlayerPlugin): void
  updateOptions(opts: Partial<PlayerOptions>): void
  instance: PlayerInstance
}

export interface PluginAPIContext {
  store: Store<MediaState>
  remote: MediaRemote
  events: EventBus
  storage: Storage
  i18n: I18n
  hotkeys: HotkeyRegistry
  containerEl: HTMLDivElement | null
  videoEl: HTMLVideoElement | null
}

export interface PluginAPIBuilder {
  (name: string, ctx: PluginAPIContext): PluginAPI
}

export interface AdapterContextValue {
  instance: PlayerInstance
  containerEl: HTMLElement | null
  videoEl: HTMLVideoElement | null
  labels: PlayerLabels
  createPluginAPI: PluginAPIBuilder
}
