# VPlayer

A React-first video player with a browser-safe headless TypeScript core.

```tsx
import { VideoPlayer } from '@vplayer/react'
import '@vplayer/react/player.css'

export function App() {
  return <VideoPlayer src="/video.mp4" poster="/poster.jpg" thumbnails="/thumbs.vtt" />
}
```

## Architecture

```txt
@vplayer/core   -> headless playback/state/events/providers/parsers/plugins
@vplayer/react  -> React provider, hooks, default UI, custom controls
apps/playground -> Vite playground for manual development and generated examples
```

Removed intentionally:

```txt
@vplayer/framework
@vplayer/solid
Next.js/Fumadocs documentation app
```

The rule is simple: **core owns behavior, React owns rendering**. Core never renders buttons, menus, sliders, icons, or CSS. React renders the UI and talks to core through the stable remote/store/plugin API.

## Features

- Native `<video>` engine with automatic source setup.
- HLS/DASH provider selection via source extension/MIME hints.
- Browser capability detection for MSE, native HLS, fullscreen, PiP, and text tracks.
- Safe `play()` handling for autoplay/user-gesture rejections.
- Nullable engine contract before mount and after unmount.
- VTT/SRT subtitle parsing.
- Thumbnail VTT preview parsing, including sprite URLs with `#xywh=x,y,w,h` and plain image cues.
- AbortController cleanup for thumbnail fetch changes/unmounts.
- Plugin registration for controls, settings, layers, hotkeys, notifications, and context menu items.
- React slots and children for custom controls while preserving the current default UI.
- Compact YouTube-like mini-player layout with auto-hiding controls.
- Single default stylesheet with stable class names and CSS variables for app-level overrides.
- Vitest unit/component tests and Playwright cross-browser smoke-test config.

## Quick start

```bash
bun install
bun run dev
```

## Scripts

```bash
bun run typecheck   # TypeScript for core, React, and playground
bun run test        # Vitest unit/component tests
bun run lint        # oxlint
bun run build       # production builds for packages and Vite playground
bun run test:e2e    # Playwright against the Vite preview
bun run test:all    # typecheck + tests + build + e2e
```

Before running Playwright locally or in CI, install browsers once:

```bash
bunx playwright install chromium
```

## Playground

The repository contains one application: `apps/playground`, a minimal React + Vite app for configuring and manually exercising `@vplayer/react`.

```bash
bun run dev
```

Vite serves the playground at `/`. There is no Next.js or documentation application.

## React default UI

```tsx
<VideoPlayer
  src="/video.mp4"
  type="video/mp4"
  poster="/poster.jpg"
  qualities={['Auto', '1080p', '720p', '480p']}
  subtitles={[{ lang: 'en', label: 'English', src: '/subs/en.vtt', default: true }]}
  thumbnails="/thumbs.vtt"
  onTimeUpdate={(time) => console.log(time)}
  onEnded={() => console.log('ended')}
  onError={(message) => console.error(message)}
/>
```

## Styling

Import the single base stylesheet:

```tsx
import '@vplayer/react/player.css'
```

There is no built-in skin prop or extra skin bundle. Consumers can override the stable `.vplayer*` classes and CSS variables from their app stylesheet:

```css
.vplayer {
  --vplayer-accent: #ff0033;
  --vplayer-radius: 12px;
}

.vplayer__button {
  border-radius: 9999px;
}
```

## Mini-player

The default layout switches to a compact mini-player chrome when mini mode is active. It does not render the big play overlay, skip buttons, volume slider, settings, screenshot, PiP, or fullscreen controls. It keeps only:

```txt
close / restore button
center play-pause button
compact seekbar
bottom mini progress
```

```tsx
<VideoPlayer src="/video.mp4" miniPlayer={{ enabled: true, auto: true, position: 'bottom-right', width: 360 }} />
```

## Custom controls

Pass children to replace the default layout while keeping the internal video element, provider, overlays, and player lifecycle.

```tsx
import { VideoPlayer, usePlayerRemote, usePlayerState } from '@vplayer/react'

function MyControls() {
  const isPlaying = usePlayerState('isPlaying')
  const remote = usePlayerRemote()

  return (
    <div className="my-controls">
      <button onClick={remote.togglePlay}>{isPlaying ? 'Pause' : 'Play'}</button>
      <button onClick={() => remote.skip(-10)}>Back 10s</button>
      <button onClick={() => remote.skip(10)}>Forward 10s</button>
    </div>
  )
}

export function CustomPlayer() {
  return (
    <VideoPlayer src="/video.mp4">
      <MyControls />
    </VideoPlayer>
  )
}
```

## Slots

Replace individual default controls without replacing the whole layout.

```tsx
<VideoPlayer
  src="/video.mp4"
  slots={{
    playButton: <MyPlayButton />,
    seekBar: <MySeekBar />,
    volumeControl: <MyVolume />,
    fullscreenButton: <MyFullscreen />,
  }}
/>
```

## Headless hook

Use `usePlayer` when you want to own all markup, including the `<video>` element.

```tsx
import { usePlayer } from '@vplayer/react'
import { useEffect, useRef } from 'react'

function HeadlessPlayer({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const { state, remote, attach, detach, updateOptions } = usePlayer({ src })

  useEffect(() => {
    attach(containerRef.current!, videoRef.current!)
    return () => detach()
  }, [attach, detach])

  useEffect(() => {
    updateOptions({ src })
  }, [src, updateOptions])

  return (
    <div ref={containerRef}>
      <video ref={videoRef} playsInline />
      <button onClick={remote.togglePlay}>{state.isPlaying ? 'Pause' : 'Play'}</button>
    </div>
  )
}
```

## Thumbnail VTT

Sprite thumbnails:

```vtt
WEBVTT

00:00:00.000 --> 00:00:05.000
thumbs.jpg#xywh=0,0,160,90

00:00:05.000 --> 00:00:10.000
thumbs.jpg#xywh=160,0,160,90
```

Plain image thumbnails are also accepted:

```vtt
WEBVTT

00:00:00.000 --> 00:00:05.000
thumb-0001.jpg
```

Relative thumbnail URLs are resolved against the VTT file URL.

## Provider/source behavior

```txt
.mp4/.webm/.ogg or video/* -> native video
.m3u8 / MPEGURL type       -> native HLS on Safari, hls.js elsewhere
.mpd / DASH type           -> dash.js provider
custom engine              -> supplied engine/factory
```

The active `player.engine` is `null` before mount and after unmount. This avoids pretending the media element exists before React refs are available.

## Testing coverage added

Core Vitest:

- VTT parser regression for the previous `startsWith('')` bug.
- Timestamp parser coverage.
- Thumbnail sprite and plain-image cue parsing.
- Source resolver native/HLS/DASH detection.
- Player mount/unmount nullable engine contract.
- Engine event to store-state updates.
- Thumbnail request abort behavior.

React Vitest:

- Custom children can replace the default layout and control the player through hooks.

Playwright:

- Demo smoke test.
- Playground setting toggle interaction.
- Configured for Chromium, Firefox, WebKit, mobile Chrome, and mobile Safari emulation.
