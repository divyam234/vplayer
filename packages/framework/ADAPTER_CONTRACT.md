# @vplayer/framework — Adapter Contract

> How to write a `@vplayer/<framework>` adapter that bridges `@vplayer/core` to
> any UI framework (React, Vue, Svelte, Solid, etc.).

## What you need to build

A framework adapter has **6 responsibilities**. Each is small (~20–50 lines).

After building these 6, you add **UI components** (controls, overlays, layouts)
written in your framework — those are NOT part of the contract (they're fully
framework-native).

## The 6 responsibilities

### 1. `usePlayer()` — Main composable

Creates a `PlayerInstance`, wires it to framework lifecycle, returns reactive state.

```ts
// CONTRACT — every adapter exports this
function usePlayer(options: PlayerOptions): {
  state: MediaState       // reactive — changes trigger re-render
  remote: MediaRemote     // stable — never changes identity
  attach(el, video): void // call after DOM is ready
  detach(): void          // unbind without destroying
  use(plugin): void       // register & init plugin
  instance: PlayerInstance // escape hatch
}
```

#### React
```ts
function usePlayer(options: PlayerOptions) {
  const [state, setState] = useState(initialState)
  const player = useMemo(() => createPlayer(options), [])
  const remote = useMemo(() => player.remote, [player])
  // Store → React state via useSyncExternalStore
  const subscribe = useCallback((cb) => player.store.subscribe(cb), [player])
  const getSnapshot = useCallback(() => ({ ...player.store.state }), [player])
  const state = useSyncExternalStore(subscribe, getSnapshot)
  // Lifecycle
  const attach = useCallback((el, video) => player.mount(video, el), [player])
  const detach = useCallback(() => player.unmount(), [player])
  const use = useCallback((p) => player.initPlugins([p]), [player])
  // Cleanup on unmount
  useEffect(() => () => player.destroy(), [player])
  return { state, remote, attach, detach, use, instance: player }
}
```

#### Vue
```ts
function usePlayer(options: PlayerOptions) {
  const player = createPlayer(options)
  const state = reactive(player.store.state)
  const remote = player.remote
  player.store.subscribe(() => Object.assign(state, player.store.state))
  onUnmounted(() => player.destroy())
  return {
    state: readonly(state),
    remote,
    attach: (el, video) => player.mount(video, el),
    detach: () => player.unmount(),
    use: (p) => player.initPlugins([p]),
    instance: player,
  }
}
```

#### Svelte
```ts
function usePlayer(options: PlayerOptions) {
  const player = createPlayer(options)
  const state = readable(player.store.state, (set) => {
    return player.store.subscribe(() => set({ ...player.store.state }))
  })
  onDestroy(() => player.destroy())
  // ...same shape
}
```

#### Solid
```ts
function usePlayer(options: PlayerOptions) {
  const player = createPlayer(options)
  const [state, setState] = createSignal(player.store.state)
  onCleanup(player.store.subscribe(() => setState({ ...player.store.state })))
  onCleanup(() => player.destroy())
  // ...same shape, with state as accessor
}
```

### 2. `usePlayerState(selector?)` — Reactive store access

Selective subscription to the store. Returns only the slice you need.

| Framework | Implementation |
|---|---|
| React | `useSyncExternalStore(store.subscribe, () => selector(store.state))` |
| Vue | `computed(() => selector(store.state))` |
| Svelte | `derived(store, s => selector(s))` |
| Solid | `createMemo(() => selector(store.state))` |

### 3. `usePlayerRemote()` — Stable command dispatcher

Returns the `MediaRemote` object. Never changes identity — safe to pass as a
dependency without causing re-execution.

```ts
// Identical in every framework:
function usePlayerRemote(): MediaRemote {
  return usePlayerContext().instance.remote
}
```

### 4. `usePlayerGestures()` — Gesture bridge

Creates `createGestureEngine()` from core, pre-wired to the player's store and
remote. Returns `GestureHandlers` (`onTouchStart`, `onTouchMove`, `onTouchEnd`).

```ts
// Same logic in every framework — only lifecycle varies:
function usePlayerGestures(): GestureHandlers {
  const ctx = usePlayerContext()
  return createGestureEngine(
    () => ({
      currentTime: ctx.instance.store.state.currentTime,
      volume: ctx.instance.store.state.volume,
      duration: ctx.instance.store.state.duration,
    }),
    {
      seek: ctx.instance.remote.seek,
      setVolume: ctx.instance.remote.setVolume,
      skip: ctx.instance.remote.skip,
    },
  )
}
```

### 5. `PlayerProvider` / `usePlayerContext` — Context propagation

Makes the player instance and resolved config available to all descendant
components.

| Framework | Implementation |
|---|---|
| React | `createContext` + `<Provider>` + `useContext` |
| Vue | `provide('player', ...)` + `inject('player')` |
| Svelte | `setContext('player', ...)` + `getContext('player')` |
| Solid | `createContext` + `<Provider>` + `useContext` |

The provider **owns the player lifecycle** — it calls `usePlayer`, then provides
the result via context.

### 6. `createPluginAPI(pluginName, ctx)` — Plugin API builder

Uses `createPluginAPIBuilder()` from `@vplayer/framework`. The ctx comes from
the adapter's context value.

```ts
import { createPluginAPIBuilder } from '@vplayer/framework'

const buildPluginAPI = createPluginAPIBuilder()
const api = buildPluginAPI(plugin.name, {
  store: ctx.instance.store,
  remote: ctx.instance.remote,
  events: ctx.instance.events,
  storage: ctx.instance.storage,
  i18n: ctx.instance.i18n,
  hotkeys: ctx.instance.hotkeys,
  containerEl: ctx.containerEl,
  videoEl: ctx.videoEl,
})
```

## What you DON'T build

- **Player logic** — `createPlayer()` from core does all of it
- **Gesture detection** — `createGestureEngine()` from core
- **Storage, i18n, hotkeys** — all in core
- **Plugin API** — `createPluginAPIBuilder()` from `@vplayer/framework`
- **Label/icon merging** — `mergeLabels()`, `mergeIcons()` from `@vplayer/framework`

You ONLY build:
1. The 6 bridges above (~150 lines total)
2. UI components (framework-native, same as any app)

## Minimal adapter reference

A complete `@vplayer/<framework>` adapter is:

```
packages/<framework>/
  src/
    index.ts         # Public API — re-exports everything below
    use-player.ts    # #1 — main composable
    use-player-state.ts   # #2
    use-player-remote.ts  # #3
    use-player-gestures.ts # #4
    provider.tsx      # #5 — context provider
    plugin-api.ts     # #6 — thin wrapper around createPluginAPIBuilder()
    types.ts          # Re-exports from @vplayer/core + framework types
  package.json       # { "dependencies": { "@vplayer/core": "workspace:*" } }
```

Plus a `components/` directory (framework-native — no contract).

## Checklist for adding a new framework

- [ ] `usePlayer()` — creates PlayerInstance, returns reactive `state` + stable `remote`
- [ ] `usePlayerState(selector?)` — selective store subscription
- [ ] `usePlayerRemote()` — stable dispatcher
- [ ] `usePlayerGestures()` — gesture engine bridge
- [ ] `PlayerProvider` — context propagation
- [ ] `usePlayerContext()` — context consumer
- [ ] `createPluginAPI(name, ctx)` — plugin API builder
- [ ] Re-exports core types (`PlayerOptions`, `MediaState`, `PlayerPlugin`, etc.)
