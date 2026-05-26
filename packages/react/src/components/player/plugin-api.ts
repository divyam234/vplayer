/**
 * Plugin API types and runtime.
 * Defines what plugins can register (controls, settings, layers, hotkeys)
 * and the PluginAPI interface passed to every plugin.
 *
 * NOTE: This file must NOT import from ./types to avoid circular deps.
 */
import type { ComponentType } from 'react'
import type { Store } from '@tanstack/store'
import type { EventBus } from './event-bus'
import type { HotkeyRegistry, HotkeyBinding } from './hotkey-registry'
import type { I18n } from './i18n'
import type { Storage } from './storage'

// ── Minimal context ref (avoids importing PlayerContextValue) ──
// These are the pieces from PlayerContextValue that PluginAPI needs.

export interface PlayerContextRef {
  containerRef: { readonly current: HTMLDivElement | null }
  videoRef: { readonly current: HTMLVideoElement | null }
}

// ── Remote ref (subset of MediaRemote) ────────────────────────

export interface RemoteRef {
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
  takeScreenshot: () => void
  setFlip: (flip: FlipState) => void
  setAspectRatio: (ratio: AspectRatioState) => void
  toggleLoop: () => void
  toggleInfoPanel: () => void
}

// ── Registration types ────────────────────────────────────────

export interface ControlRegistration {
  name: string
  position: 'left' | 'right' | 'top' | 'center'
  index: number
  component: ComponentType<{ api: PluginAPI }>
}

export interface SettingItem {
  label: string
  value: string
}

export interface SettingRegistration {
  name: string
  label: string
  items?: SettingItem[]
  component?: ComponentType<{ api: PluginAPI }>
}

export interface LayerRegistration {
  name: string
  component: ComponentType<{ api: PluginAPI }>
}

// ── Context menu ─────────────────────────────────────────────

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

// ── Aspect ratio & flip types ─────────────────────────────────

export type FlipState = 'normal' | 'horizontal' | 'vertical'
export type AspectRatioState = 'default' | '16:9' | '4:3' | 'fill'

// ── Plugin API ────────────────────────────────────────────────

export interface PluginAPI {
  readonly name: string
  readonly store: Store<any>
  readonly remote: RemoteRef
  readonly events: EventBus
  readonly storage: Storage
  readonly hotkeys: HotkeyRegistry
  readonly i18n: I18n
  readonly context: PlayerContextRef

  /** Register a control button. Returns an unregister function. */
  addControl(def: ControlRegistration): () => void
  /** Remove a previously registered control by name. */
  removeControl(name: string): void
  /** Register a settings panel item. Returns an unregister function. */
  addSetting(def: SettingRegistration): () => void
  /** Remove a previously registered setting by name. */
  removeSetting(name: string): void
  /** Register a layer (overlay component rendered inside player). Returns an unregister function. */
  addLayer(def: LayerRegistration): () => void
  /** Remove a previously registered layer by name. */
  removeLayer(name: string): void
  /** Register a hotkey. Convenience wrapper around hotkeys.register(). */
  addHotkey(binding: HotkeyBinding): () => void
  /** Show a notification overlay. */
  notify(message: string, duration?: number): void
  /** Add items to the right-click context menu. Returns an unregister function. */
  addContextMenuItems(items: ContextMenuItem[]): () => void
}

// ── Plugin definition ─────────────────────────────────────────

export interface PlayerPlugin {
  name: string
  /**
   * Called once when the plugin mounts (player becomes ready).
   * Return a cleanup function to be called on unmount.
   */
  setup?: (api: PluginAPI) => void | (() => void)
}
