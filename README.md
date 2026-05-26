# VPlayer

**Framework-agnostic video player with a pluggable media engine architecture.**

Built for React and Solid. Designed for extensibility — swap the media source, add plugins, customize every control.

```tsx
<VideoPlayer src="https://example.com/video.mp4" />
```

---

## Features

- **🎮 Dual framework** — React and Solid packages with matching APIs
- **🎨 Fully customizable** — Slots, labels, icons, accent color, CSS custom properties
- **🔌 Plugin system** — Register controls, settings, layers, hotkeys, context menu items
- **🎬 Swappable MediaEngine** — Native video, HLS, DASH, or a mock engine for tests
- **📜 Subtitles & thumbnails** — SRT/VTT parsing, thumbnail previews on seek
- **⌨️ Keyboard shortcuts** — Play/pause, seek, volume, fullscreen, PiP, loop
- **📱 Touch gestures** — Swipe to seek, vertical volume, double-tap skip
- **💾 Preference persistence** — Volume, playback rate, subtitles, aspect ratio (opt-in)
- **🔄 Auto-reconnect** — Exponential backoff on playback errors
- **🎞️ Picture-in-Picture** — Browser PiP support
- **📸 Screenshot capture** — Frame-accurate canvas snapshots

---

## Architecture

```
@vplayer/core          → Pure logic. Zero framework imports.
@vplayer/framework     → Adapter contract types + helpers.
@vplayer/react         → React components, hooks, context.
@vplayer/solid         → Solid components, hooks, context.
```

### Core layers

```
PlayerInstance
 ├── store        → Reactive state (TanStack Store, organized into slices)
 ├── engine       → Media playback abstraction (MediaEngine)
 ├── events       → Typed event bus for plugin communication
 ├── storage      → Persistence layer (localStorage + fallback)
 ├── i18n         → Internationalization
 └── hotkeys      → Keyboard shortcut registry
```

The player delegates all media I/O to a **MediaEngine** — a strategy interface that wraps the underlying media source. The default `NativeVideoEngine` wraps `<video>`. Custom engines (HLS.js, DASH.js, mock) can be injected for testing or advanced playback.

---

## Packages

| Package | Description |
|---|---|
| `@vplayer/core` | Player factory, state management, plugin API, subtitle parser, gesture engine |
| `@vplayer/framework` | Adapter contract types and helpers |
| `@vplayer/react` | React `<VideoPlayer>`, `usePlayer` hook, context, controls |
| `@vplayer/solid` | Solid `<VideoPlayer>`, `usePlayer` hook, context, controls |

---

## Quick Start

### React

```bash
bun add @vplayer/react
```

```tsx
import { VideoPlayer } from '@vplayer/react'
import '@vplayer/react/player.css'

function App() {
  return (
    <VideoPlayer
      src="https://example.com/video.mp4"
      poster="https://example.com/poster.jpg"
      qualities={['Auto', '1080p', '720p', '480p']}
      onEnded={() => console.log('Done!')}
    />
  )
}
```

### Solid

```bash
bun add @vplayer/solid
```

```tsx
import { VideoPlayer } from '@vplayer/solid'
import '@vplayer/solid/player.css'

function App() {
  return (
    <VideoPlayer
      src="https://example.com/video.mp4"
      poster="https://example.com/poster.jpg"
      qualities={['Auto', '1080p', '720p', '480p']}
    />
  )
}
```

---

## Usage

### `<VideoPlayer>` (full UI)

The simplest way to get a player with all built-in controls (play/pause, seek bar, volume, quality, subtitles, fullscreen, PiP, settings):

```tsx
<VideoPlayer
  src="video.mp4"
  poster="poster.jpg"
  autoPlay
  qualities={['Auto', '1080p', '720p']}
  subtitles={[
    { lang: 'en', label: 'English', src: '/subtitles/en.vtt', default: true },
    { lang: 'es', label: 'Español', src: '/subtitles/es.vtt' },
  ]}
  thumbnails="/thumbnails.vtt"
  lang="en"
  translations={{ play: 'Spielen' }}
  plugins={[myPlugin]}
  persistPreferences
  onTimeUpdate={(t) => console.log(t)}
  onEnded={() => console.log('finished')}
  onError={(msg) => console.error(msg)}
/>
```

### Layout variants

```tsx
import { DefaultVideoLayout, CompactVideoLayout, LargeVideoLayout } from '@vplayer/react'

<VideoPlayer src="video.mp4">
  <CompactVideoLayout />
</VideoPlayer>
```

### Slots (custom controls)

Replace individual controls:

```tsx
<VideoPlayer
  src="video.mp4"
  slots={{
    playButton: <MyPlayButton />,
    seekBar: <MySeekBar />,
    volumeControl: <MyVolume />,
    timeDisplay: <MyTimeDisplay />,
    fullscreenButton: <MyFsButton />,
    settingsButton: <MySettings />,
    pipButton: <MyPipButton />,
  }}
/>
```

### `usePlayer` hook (headless)

Full control over rendering:

```tsx
import { usePlayer } from '@vplayer/react'
import { useEffect, useRef } from 'react'

function CustomPlayer({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const { state, remote, attach, detach } = usePlayer({ src })

  useEffect(() => {
    attach(containerRef.current!, videoRef.current!)
    return () => detach()
  }, [attach, detach])

  return (
    <div ref={containerRef}>
      <video ref={videoRef} />
      <button onClick={() => remote.togglePlay()}>
        {state.isPlaying ? 'Pause' : 'Play'}
      </button>
      <span>{formatTime(state.currentTime)} / {formatTime(state.duration)}</span>
    </div>
  )
}
```

### `PlayerProvider` (context + custom UI)

```tsx
import { PlayerProvider, DefaultVideoLayout } from '@vplayer/react'

<PlayerProvider options={{ src: 'video.mp4', qualities: ['Auto', '1080p'] }}>
  <DefaultVideoLayout />
</PlayerProvider>
```

---

## Player Options

| Prop | Type | Default | Description |
|---|---|---|---|
| `src` | `string` | — | Video source URL |
| `poster` | `string` | — | Poster image URL |
| `autoPlay` | `boolean` | `false` | Auto-start playback |
| `qualities` | `string[]` | `[]` | Available quality levels |
| `subtitles` | `SubtitleTrack[]` | `[]` | Subtitle tracks |
| `thumbnails` | `string` | — | Thumbnail VTT URL |
| `lang` | `string` | `'en'` | UI language |
| `translations` | `Record<string, string>` | — | Translation overrides |
| `plugins` | `PlayerPlugin[]` | `[]` | Plugin registrations |
| `persistPreferences` | `boolean` | `false` | Persist volume, rate, etc. |
| `defaultHotkeys` | `boolean` | `true` | Enable default keyboard shortcuts |
| `reconnectMax` | `number` | `3` | Max auto-reconnect attempts |
| `reconnectSleep` | `number` | `1500` | Base delay between reconnects (ms) |
| `onTimeUpdate` | `(time: number) => void` | — | Current time callback |
| `onEnded` | `() => void` | — | Playback ended callback |
| `onError` | `(message: string) => void` | — | Error callback |

---

## Styling

VPlayer uses CSS custom properties for theming. Override them at the player container level:

```css
.vplayer {
  --vplayer-accent: oklch(0.75 0.12 78);
  --vplayer-radius: 18px;
  --vplayer-bg: oklch(0.05 0.02 240);
}
```

Import the stylesheet:

```tsx
// React
import '@vplayer/react/player.css'

// Solid
import '@vplayer/solid/player.css'
```

---

## Plugin System

Plugins register controls, settings, layers, hotkeys, and context menu items during their `setup()` callback:

```typescript
import type { PlayerPlugin } from '@vplayer/core'

const myPlugin: PlayerPlugin = {
  name: 'my-plugin',
  setup: (api) => {
    // Add a custom control button
    const dispose = api.addControl({
      name: 'my-button',
      position: 'right',
      index: 10,
      render: <button onClick={() => api.notify('Hello!')}>Hi</button>,
    })

    // Add a keyboard shortcut
    api.addHotkey({
      key: 'KeyH',
      description: 'Say hello',
      handler: () => api.notify('Hello!'),
    })

    // Cleanup on plugin teardown
    return () => dispose()
  },
}
```

### Plugin API

| Method | Description |
|---|---|
| `addControl(def)` | Register a control button (returns disposer) |
| `removeControl(name)` | Remove a control by name |
| `addSetting(def)` | Register a settings menu entry (returns disposer) |
| `removeSetting(name)` | Remove a setting by name |
| `addLayer(def)` | Register a UI layer (returns disposer) |
| `removeLayer(name)` | Remove a layer by name |
| `addHotkey(binding)` | Register a keyboard shortcut (returns disposer) |
| `addContextMenuItems(items)` | Add context menu entries (returns disposer) |
| `notify(message, duration?)` | Show a notification toast |

---

## MediaEngine (Custom Engines)

The `MediaEngine` interface abstracts the media source. Swap it for HLS, DASH, or a mock for testing:

```typescript
import type { MediaEngine, MediaEngineEvent } from '@vplayer/core'

class HLSEngine implements MediaEngine {
  readonly element: HTMLVideoElement

  constructor(video: HTMLVideoElement, src: string) {
    this.element = video
    // Initialize hls.js
  }

  play() { return this.element.play() }
  pause() { this.element.pause() }
  get currentTime() { return this.element.currentTime }
  // ... implement the full MediaEngine interface
  destroy() { /* cleanup hls.js instance */ }
}
```

Access the engine after mount via the `PlayerInstance`:

```typescript
const { instance } = usePlayer(options)
// After mount: instance.engine is a NativeVideoEngine
```

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` / `K` | Toggle play/pause |
| `F` | Toggle fullscreen |
| `M` | Toggle mute |
| `L` | Toggle loop |
| `I` | Toggle info panel |
| `ArrowLeft` | Seek back 5s |
| `ArrowRight` | Seek forward 5s |
| `ArrowUp` | Volume up 10% |
| `ArrowDown` | Volume down 10% |

---

## State Selectors

State is organized into logical slices for granular subscriptions:

```typescript
import { selectMedia, selectAudio, selectUI } from '@vplayer/core'

// In a component:
const { currentTime, isPlaying } = useStore(store, selectMedia)
const { volume, isMuted } = useStore(store, selectAudio)
```

Available selectors:

| Selector | Returns |
|---|---|
| `selectMedia` | `isPlaying`, `isPaused`, `currentTime`, `duration`, `bufferedPercent`, `playbackRate` |
| `selectAudio` | `volume`, `isMuted` |
| `selectPreferences` | `isLooping`, `flip`, `aspectRatio`, subtitle, quality |
| `selectUI` | `controlsVisible`, `isFullscreen`, `infoPanelVisible`, `notification` |
| `selectPlugins` | `controls`, `settings`, `layers`, `contextMenuItems` |
| `selectThumbnails` | `thumbnailCues` |
| `selectError` | `error` (or `null`) |

---

## Development

```bash
# Install dependencies
bun install

# Run typecheck across all packages
bun run typecheck

# Build all packages
bun run build

# Start the demo app
bun run dev

# Lint
bun run lint

# Format
bun run format
```

### Package structure

```
apps/
  demo/                        React demo app
packages/
  core/src/                    Player factory, types, engine
    media-engine/              MediaEngine interface + NativeVideoEngine
    state/                     State slices and selectors
  framework/src/               Adapter contract types + helpers
  react/src/                   React components + hooks
    components/player/         VideoPlayer, controls, overlays
  solid/src/                   Solid components + hooks
    components/                VideoPlayer, controls, overlays
  components/                  Shared UI components (WIP)
```

---

## License

MIT
