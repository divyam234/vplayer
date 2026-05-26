# VPlayer — Agent Guide

## Monorepo Commands

```sh
bun run dev           # demo app only (React)
bun run build         # core → react → solid → demo (order matters)
bun run typecheck     # all 5 packages sequentially
bun run lint          # oxlint (root only)
bun run format        # oxfmt
```

- All commands run from root via `bun run --filter @vplayer/<name>`
- To check a single package: `bun run --filter @vplayer/core typecheck`

## Package Boundaries

| Package              | Depends on                                                  | Entry                            |
| -------------------- | ----------------------------------------------------------- | -------------------------------- |
| `@vplayer/core`      | `@tanstack/store` only                                      | `src/index.ts`                   |
| `@vplayer/framework` | `@vplayer/core`, `@tanstack/store`                          | `src/index.ts`                   |
| `@vplayer/react`     | `@vplayer/core`, `@vplayer/framework`; peer: react >=18.3   | `src/components/player/index.ts` |
| `@vplayer/solid`     | `@vplayer/core`, `@vplayer/framework`; peer: solid-js >=1.8 | `src/index.ts`                   |
| `@vplayer/demo`      | `@vplayer/react` only                                       | `apps/demo/src/main.tsx`         |

`packages/components/` is empty (placeholders only).

## Build Quirks

- React build runs **3 steps**: `tsc --build tsconfig.build.json` (emit declarations) → `vite build` (bundle) → `tailwindcss` (dist/player.css)
- Solid build runs **2 steps**: `vite build` → `tailwindcss` (dist/player.css)
- Core build: `vite build` only
- Framework has no build step — consumed as raw TS source
- CSS for each framework is built separately via `tailwindcss -i ./src/player.css -o ./dist/player.css --minify`
- React externals: `react`, `react-dom`, `react/jsx-runtime`
- Solid externals: `solid-js`, `solid-js/web`, `@tanstack/store`, `@ark-ui/solid`, `@iconify/solid`, `@vplayer/core`, `@vplayer/framework`, `clsx`

## Architecture

- **Core factory** `createPlayer()` → `PlayerInstance` with: `store` (TanStack Store), `engine` (MediaEngine), `events` (EventBus), `storage`, `i18n`, `hotkeys`
- **MediaEngine** is a strategy interface. Default is `NativeVideoEngine` wrapping HTMLVideoElement. Swap for HLS/DASH/mock.
- **State slices** for granular subscriptions: `selectMedia`, `selectAudio`, `selectPreferences`, `selectUI`, `selectPlugins`, `selectThumbnails`, `selectError` — exported from `@vplayer/core`
- **Plugin system**: `createPluginAPIBuilder` from `@vplayer/framework` builds the PluginAPI each plugin's `setup()` receives
- **CSS theming** via custom properties: `--vplayer-accent`, `--vplayer-radius`, `--vplayer-bg`

## Testing

No test runner or tests exist. Any test setup is from scratch.

## Toolchain

| Tool           | Config                       | Notes                                                                                |
| -------------- | ---------------------------- | ------------------------------------------------------------------------------------ |
| TypeScript 6   | Per-package `tsconfig.json`  | `moduleResolution: "Bundler"`, `strict: true`, `--noEmit` for typecheck              |
| oxlint         | Root `.oxlintrc.json`        | Many jsx-a11y/react rules explicitly disabled; `correctness` + `suspicious` as error |
| oxfmt          | Root `.oxfmtric.json`        | Run via `bun run format`                                                             |
| TailwindCSS v4 | Root `postcss.config.mjs`    | Uses `@tailwindcss/postcss` plugin                                                   |
| Vite 8         | Per-package `vite.config.ts` | Each library package builds as ESM                                                   |

## No CI

No GitHub Actions, no husky, no pre-commit hooks. All verification is manual (`typecheck` + `lint` + `build`).
