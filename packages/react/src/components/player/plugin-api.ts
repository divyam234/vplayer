/**
 * createPluginAPI — Thin wrapper per @vplayer/framework adapter contract.
 *
 * The contract (ADAPTER_CONTRACT.md #6) requires every adapter to export
 * a `createPluginAPI(name, ctx)` function that produces a PluginAPI object
 * for a given plugin.
 *
 * @example
 * ```tsx
 * const api = createPluginAPI('my-plugin', {
 *   store: ctx.mediaStore,
 *   remote: ctx.mediaRemote,
 *   events: ctx.events,
 *   storage: ctx.storage,
 *   i18n: ctx.i18n,
 *   hotkeys: ctx.hotkeys,
 *   containerEl: containerRef.current,
 *   videoEl: videoRef.current,
 * })
 * ```
 */

import { createPluginAPIBuilder } from '@vplayer/framework'
import type { PluginAPIBuilder } from '@vplayer/framework'

const buildAPI = createPluginAPIBuilder()

export const createPluginAPI: PluginAPIBuilder = (name, ctx) => {
  return buildAPI(name, ctx)
}
