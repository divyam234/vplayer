/**
 * ── Adapter Contract Types ──────────────────────────────────
 *
 * These types define the SHAPE every framework adapter follows.
 * They are NOT a uniform interface — each framework expresses these
 * concepts using its own idioms (hooks, composables, stores, signals).
 *
 * Instead, the contract is a CONVENTION: every adapter package exports
 * these named symbols with these responsibilities.
 */

import type { Store } from '@tanstack/store'
import type {
  PlayerInstance,
  PlayerOptions,
  MediaState,
  MediaRemote,
  GestureHandlers,
  PlayerLabels,
} from '@vplayer/core'

// ── 1. usePlayer() result ──────────────────────────────────
//
// Every adapter's main entry point (usePlayer / useVideoPlayer / etc.)
// returns a value with the following shape:

export interface UsePlayerResult {
  /** Reactive player state — framework bridges Store subscription → reactive value */
  state: MediaState

  /** Stable command dispatcher — never changes identity */
  remote: MediaRemote

  /**
   * Bind player to real DOM elements.
   * Called after refs are resolved (useEffect / onMounted / onMount).
   */
  attach(container: HTMLDivElement, video: HTMLVideoElement): void

  /** Unbind from DOM. Player instance survives for re-attach. */
  detach(): void

  /** Register and initialize a plugin. */
  use(plugin: import('@vplayer/core').PlayerPlugin): void

  /** Re-create player with new options (destroys + re-inits). */
  updateOptions(opts: PlayerOptions): void

  /** Full PlayerInstance — escape hatch for advanced use. */
  instance: PlayerInstance
}

// ── 2. Framework component type bridge ──────────────────────
//
// Core uses `render: unknown` for plugin component references.
// Each adapter casts to the framework's native component type:
//   React:  ComponentType<any>
//   Vue:    Component
//   Svelte: ConstructorOf<Component>
//   Solid:  Component<any>

export type FrameworkComponent = unknown

// ── 3. Adapter Context Value ────────────────────────────────
//
// Every adapter's provider/injection mechanism exposes at minimum:

export interface AdapterContextValue {
  /** The full PlayerInstance */
  instance: PlayerInstance

  /** Resolved DOM refs (null until mount) */
  containerEl: HTMLElement | null
  videoEl: HTMLVideoElement | null

  /** Resolved labels */
  labels: PlayerLabels

  /** Plugin API builder */
  createPluginAPI: import('./plugin-api').PluginAPIBuilder
}

// ── 4. Store bridge ────────────────────────────────────────
//
// @vplayer/core uses @tanstack/store's Store<MediaState>.
// Each adapter must bridge Store.subscribe() to the framework's
// reactivity model:
//
//   React:   useSyncExternalStore(store.subscribe, () => store.state)
//   Vue:     shallowRef() + triggerRef() on subscribe callback
//   Svelte:  readable(store.state, (set) => store.subscribe(() => set(store.state)))
//   Solid:   createSignal(store.state) + update on subscribe callback

/** @internal — Documents the reactivity bridge pattern */
export type StoreBridge<S> = Store<S> & {
  subscribe: (listener: () => void) => () => void
  state: S
}

// ── CONVENTION: What every adapter MUST export ──────────────
//
// Each @vplayer/<framework> package's public API MUST include:
//
//   usePlayer(options, ...rest)     → UsePlayerResult
//   usePlayerState(selector?)       → MediaState slice
//   usePlayerRemote()               → MediaRemote
//   usePlayerGestures()             → GestureHandlers
//   PlayerProvider (if JSX-able)    → Context provider component
//   usePlayerContext()              → AdapterContextValue
//
// The rest (components, layouts, CSS) is framework-native and
// follows no shared contract — it is re-implemented per framework.

// ── Re-exports for convenience ──────────────────────────────
//
// Each adapter should re-export from core so users can import
// everything from one package.
