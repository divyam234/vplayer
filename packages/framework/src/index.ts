/**
 * @vplayer/framework — Adapter contract for bridging @vplayer/core to any UI framework.
 *
 * This package defines the **pattern** every framework adapter follows.
 * It provides shared types, helpers, and a documented contract so that
 * writing @vplayer/react, @vplayer/vue, @vplayer/svelte, @vplayer/solid, etc.
 * is mechanical, not exploratory.
 *
 * ── Architecture ───────────────────────────────────────────
 *
 *   @vplayer/core        → Pure logic. Zero framework imports.
 *   @vplayer/framework   → Contract types + helpers. Zero framework imports.
 *   @vplayer/react       → Implements contract for React.
 *   @vplayer/vue         → Implements contract for Vue.
 *   @vplayer/svelte      → Implements contract for Svelte.
 *   ...
 *
 * ── The Contract (each adapter MUST provide) ───────────────
 *
 *   1. usePlayer()           — create + lifecycle + reactivity
 *   2. usePlayerState()      — selective store subscription
 *   3. usePlayerRemote()     — stable command dispatcher
 *   4. usePlayerGestures()   — gesture engine pre-wired to player
 *   5. PlayerProvider        — context provider component
 *   6. usePlayerContext()    — context consumer hook
 *   7. createPluginAPI()     — builds PluginAPI for plugin setup()
 *
 * See ADAPTER_CONTRACT.md for the full specification.
 */

export { createPluginAPIBuilder } from './plugin-api'
export type { PluginAPIBuilder, PluginAPIContext } from './plugin-api'

export { mergeLabels, mergeIcons } from './merge'
export type { DeepPartial } from './merge'

export type { UsePlayerResult, FrameworkComponent, AdapterContextValue } from './types'
