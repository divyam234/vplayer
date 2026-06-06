import type { ContextMenuItem, PluginAPI, RemoteRef } from '@vplayer/core'

import type { PluginAPIBuilder, PluginAPIContext } from './adapter-types'

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
        containerRef: {
          get current() {
            return ctx.containerEl
          },
        },
        videoRef: {
          get current() {
            return ctx.videoEl
          },
        },
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
      removeControl: (nameToRemove) => {
        ctx.store.setState((prev) => ({
          ...prev,
          controls: prev.controls.filter((c) => c.name !== nameToRemove),
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
      removeSetting: (nameToRemove) => {
        ctx.store.setState((prev) => ({
          ...prev,
          settings: prev.settings.filter((s) => s.name !== nameToRemove),
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
      removeLayer: (nameToRemove) => {
        ctx.store.setState((prev) => ({
          ...prev,
          layers: prev.layers.filter((l) => l.name !== nameToRemove),
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
            contextMenuItems: prev.contextMenuItems.filter((existing) => !items.includes(existing)),
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

const buildAPI = createPluginAPIBuilder()

export const createPluginAPI: PluginAPIBuilder = (name, ctx) => buildAPI(name, ctx)
