/**
 * PluginAPI builder — shared helper for all framework adapters.
 *
 * Each adapter's context/provider holds the player's systems.
 * When a plugin registers, the adapter calls createPluginAPIBuilder
 * to produce the PluginAPI object the plugin's setup() receives.
 *
 * This is the SAME logic that core's createPlayer() uses internally,
 * extracted so adapters don't have to reimplement it.
 */

import type { Store } from '@tanstack/store'
import type {
  MediaState,
  MediaRemote,
  RemoteRef,
  EventBus,
  Storage,
  I18n,
  HotkeyRegistry,
  PluginAPI,
  ContextMenuItem,
} from '@vplayer/core'

/**
 * The raw systems a framework adapter's context holds.
 * Pass these to `buildPluginAPI(name, ctx)` inside plugin setup.
 */
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

/**
 * Builder that creates the PluginAPI object for a given plugin.
 */
export interface PluginAPIBuilder {
  (name: string, ctx: PluginAPIContext): PluginAPI
}

/**
 * Creates a PluginAPI builder.
 *
 * Usage in a framework adapter:
 *
 *   const buildAPI = createPluginAPIBuilder()
 *   const api = buildAPI(plugin.name, {
 *     store: ctx.store,
 *     remote: ctx.remote,
 *     events: ctx.events,
 *     storage: ctx.storage,
 *     i18n: ctx.i18n,
 *     hotkeys: ctx.hotkeys,
 *     containerEl: containerRef.current,
 *     videoEl: videoRef.current,
 *   })
 */
export function createPluginAPIBuilder(): PluginAPIBuilder {
  return function buildPluginAPI(name: string, ctx: PluginAPIContext): PluginAPI {
    return {
      name,
      store: ctx.store,
      remote: ctx.remote as unknown as RemoteRef,
      events: ctx.events,
      storage: ctx.storage,
      hotkeys: ctx.hotkeys,
      i18n: ctx.i18n,
      context: {
        containerRef: { get current() { return ctx.containerEl } },
        videoRef: { get current() { return ctx.videoEl } },
      },
      addControl: (def) => {
        ctx.store.setState((prev) => ({
          ...prev,
          controls: [...prev.controls.filter((c) => c.name !== def.name), def],
        }))
        return () => {
          ctx.store.setState((prev) => ({
            ...prev,
            controls: prev.controls.filter((c) => c.name !== def.name),
          }))
        }
      },
      removeControl: (name) => {
        ctx.store.setState((prev) => ({
          ...prev,
          controls: prev.controls.filter((c) => c.name !== name),
        }))
      },
      addSetting: (def) => {
        ctx.store.setState((prev) => ({
          ...prev,
          settings: [...prev.settings.filter((s) => s.name !== def.name), def],
        }))
        return () => {
          ctx.store.setState((prev) => ({
            ...prev,
            settings: prev.settings.filter((s) => s.name !== def.name),
          }))
        }
      },
      removeSetting: (name) => {
        ctx.store.setState((prev) => ({
          ...prev,
          settings: prev.settings.filter((s) => s.name !== name),
        }))
      },
      addLayer: (def) => {
        ctx.store.setState((prev) => ({
          ...prev,
          layers: [...prev.layers.filter((l) => l.name !== def.name), def],
        }))
        return () => {
          ctx.store.setState((prev) => ({
            ...prev,
            layers: prev.layers.filter((l) => l.name !== def.name),
          }))
        }
      },
      removeLayer: (name) => {
        ctx.store.setState((prev) => ({
          ...prev,
          layers: prev.layers.filter((l) => l.name !== name),
        }))
      },
      addHotkey: (binding) => ctx.hotkeys.register({ ...binding }),
      addContextMenuItems: (items: ContextMenuItem[]) => {
        ctx.store.setState((prev) => ({
          ...prev,
          contextMenuItems: [...prev.contextMenuItems, ...items],
        }))
        return () => {
          ctx.store.setState((prev) => ({
            ...prev,
            contextMenuItems: prev.contextMenuItems.filter(
              (existing) => !items.includes(existing),
            ),
          }))
        }
      },
      notify: (message, duration = 3000) => {
        ctx.store.setState((prev) => ({
          ...prev,
          notification: { message, duration },
        }))
      },
    }
  }
}
