import type { Store } from '@tanstack/store'

import type { EventBus } from './event-bus'
import type { HotkeyRegistry, HotkeyBinding } from './hotkey-registry'
import type { I18n } from './i18n'
import type { Storage } from './storage'

export interface RemoteRef {
  play: () => void
  pause: () => void
  togglePlay: () => void
  seek: (time: number) => void
  resumeFromSavedProgress: () => void
  startPlaybackOver: () => void
  dismissSavedProgress: () => void
  skip: (seconds: number) => void
  setVolume: (v: number) => void
  toggleMute: () => void
  setPlaybackRate: (rate: number) => void
  toggleFullscreen: () => void
  togglePiP: () => void
  takeScreenshot: () => void
  setFlip: (flip: FlipState) => void
  setAspectRatio: (ratio: AspectRatioState) => void
  cycleAspectRatio: () => void
  toggleLoop: () => void
  toggleInfoPanel: () => void
}

export interface PlayerContextRef {
  containerRef: { readonly current: HTMLDivElement | null }
  videoRef: { readonly current: HTMLVideoElement | null }
}

export interface ControlRegistration {
  name: string
  position: 'left' | 'right' | 'top' | 'center'
  index: number
  render: unknown // Framework-specific component, cast by adapter
}

export interface SettingItem {
  label: string
  value: string
}

export interface SettingRegistration {
  name: string
  label: string
  items?: SettingItem[]
  render?: unknown // Framework-specific component, cast by adapter
}

export interface LayerRegistration {
  name: string
  render: unknown // Framework-specific component, cast by adapter
}

export interface ContextMenuItem {
  label: string
  onAction: () => void
  separator?: boolean
  disabled?: boolean
}

export interface ContextMenuRegistration {
  name: string
  items: ContextMenuItem[]
}

export type FlipState = 'normal' | 'horizontal' | 'vertical'
export type AspectRatioState = 'default' | '16:9' | '4:3' | '21:9' | 'cover' | 'fill'

export interface PluginAPI {
  readonly name: string
  readonly store: Store<any>
  readonly remote: RemoteRef
  readonly events: EventBus
  readonly storage: Storage
  readonly hotkeys: HotkeyRegistry
  readonly i18n: I18n
  readonly context: PlayerContextRef
  addControl(def: ControlRegistration): () => void
  removeControl(name: string): void
  addSetting(def: SettingRegistration): () => void
  removeSetting(name: string): void
  addLayer(def: LayerRegistration): () => void
  removeLayer(name: string): void
  addHotkey(binding: HotkeyBinding): () => void
  addContextMenuItems(items: ContextMenuItem[]): () => void
  notify(message: string, duration?: number): void
}

export interface PlayerPlugin {
  name: string
  setup?: (api: PluginAPI) => void | (() => void)
}
