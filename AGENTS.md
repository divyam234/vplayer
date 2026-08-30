# VPlayer — Agent Guide

## Commands

Run all commands from the repository root with Bun:

```sh
bun run dev         # Vite playground
bun run build       # core → react → playground
bun run typecheck   # core → react → playground
bun run test        # core and React Vitest suites
bun run lint        # oxlint
bun run format      # oxfmt
```

For one workspace:

```sh
bun run --cwd packages/core typecheck
bun run --cwd packages/react test
bun run --cwd apps/playground build
```

## Workspace layout

| Workspace             | Purpose                                                                | Entry                                           |
| --------------------- | ---------------------------------------------------------------------- | ----------------------------------------------- |
| `@vplayer/core`       | Headless player state, engine, events, providers, parsers, and plugins | `packages/core/src/index.ts`                    |
| `@vplayer/react`      | React provider, hooks, controls, layouts, and player stylesheet        | `packages/react/src/components/player/index.ts` |
| `@vplayer/playground` | Minimal Vite app for manual player development                         | `apps/playground/src/main.tsx`                  |

There is no Next.js or documentation application.

## Architecture

- `createPlayer()` returns the headless `PlayerInstance`.
- `MediaEngine` is the playback strategy; `NativeVideoEngine` is the default browser implementation.
- Core owns behavior and state. React owns rendering and CSS.
- `VideoPlayer` composes the provider, media element, default layout, custom controls, and plugins.
- Player theming uses CSS variables such as `--vplayer-accent`, `--vplayer-radius`, and `--vplayer-bg`.

## Build details

- Core builds with Vite.
- React emits declarations with TypeScript, bundles with Vite, then builds `dist/player.css` with Tailwind CSS 4.
- Playground type-checks with TypeScript and builds with Vite.
- Build order matters because the playground consumes the package outputs.

## Validation

After meaningful changes, run the narrowest relevant check, then:

```sh
bun run format
bun run typecheck
bun run lint
bun run build
```
