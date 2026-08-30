# VPlayer

A React video player with an independent, browser-safe TypeScript core. Use the default accessible controls, replace individual slots, or build a fully custom player on the same state and command APIs.

## Features

- Native MP4, WebM, and Ogg playback
- HLS and DASH source selection from file extensions or MIME hints
- React controls with keyboard shortcuts, fullscreen, Picture-in-Picture, mini-player, screenshots, and responsive layouts
- WebVTT and SRT captions from configured URLs, consumer-provided catalogs, or local files
- Caption size, color, background, and opacity controls
- Persisted playback progress with explicit resume behavior
- Thumbnail VTT previews, including sprite sheets with `#xywh=x,y,w,h`
- Headless core, React hooks, slots, custom layouts, and plugins
- CSS-variable theming with one distributable stylesheet

## Install

```bash
bun add @vplayer/react
```

Import the player and its base stylesheet:

```tsx
import { VideoPlayer } from '@vplayer/react'
import '@vplayer/react/player.css'

export function App() {
  return <VideoPlayer src="/video.mp4" poster="/poster.jpg" />
}
```

React 18.3 or newer is required.

## Default player

```tsx
import { VideoPlayer } from '@vplayer/react'
import '@vplayer/react/player.css'

export function LessonPlayer() {
  return (
    <VideoPlayer
      src="/lesson.m3u8"
      type="application/vnd.apple.mpegurl"
      title="Introduction"
      poster="/lesson-poster.jpg"
      subtitles={[
        {
          id: 'english',
          src: '/captions/lesson.en.vtt',
          lang: 'en',
          label: 'English',
          default: true,
        },
      ]}
      thumbnails="/thumbnails.vtt"
      playbackProgress={{ id: 'lesson-1' }}
      persistPreferences
      onError={(message) => console.error(message)}
    />
  )
}
```

The default UI includes playback, seeking, volume, speed, quality labels, captions, mini-player, screenshot, Picture-in-Picture, fullscreen, and keyboard controls.

### Controls

| Control            | Behavior                                                                        |
| ------------------ | ------------------------------------------------------------------------------- |
| Play / Pause       | Starts or pauses playback; replay is shown after completion                     |
| Skip               | Moves backward or forward by 10 seconds                                         |
| Seekbar            | Seeks through finite media and shows thumbnail previews when configured         |
| Volume             | Changes volume and toggles mute                                                 |
| Settings           | Opens playback speed, quality labels, captions, flip, and aspect-ratio controls |
| Screenshot         | Captures the current video frame when the active engine supports it             |
| Mini-player        | Switches to the compact in-page player                                          |
| Picture-in-Picture | Uses the browser Picture-in-Picture API when available                          |
| Fullscreen         | Enters or exits browser fullscreen                                              |

Keyboard shortcuts run only while focus is inside the player and never intercept text fields:

| Key            | Action                             |
| -------------- | ---------------------------------- |
| `Space` or `K` | Play or pause                      |
| `←` / `→`      | Seek backward or forward 5 seconds |
| `↑` / `↓`      | Raise or lower volume by 10%       |
| `M`            | Mute or unmute                     |
| `F`            | Toggle fullscreen                  |
| `L`            | Toggle looping                     |
| `A`            | Cycle aspect ratio                 |
| `I`            | Toggle playback information        |

Set `defaultHotkeys={false}` to disable the built-in bindings.

## Captions

### URL tracks

Provide WebVTT or SRT tracks directly:

```tsx
<VideoPlayer
  src="/video.mp4"
  subtitles={[
    { id: 'en', src: '/captions/en.vtt', lang: 'en', label: 'English', default: true },
    { id: 'es', src: '/captions/es.srt', lang: 'es', label: 'Español' },
  ]}
/>
```

Track IDs should be stable and unique. Multiple tracks may use the same language.

### Remote subtitle catalogs

Applications can decide how available tracks are discovered. Implement `SubtitleCatalog` and pass it to the player:

```tsx
import { VideoPlayer, type SubtitleCatalog } from '@vplayer/react'

const subtitleCatalog: SubtitleCatalog = {
  async list(signal) {
    const response = await fetch('/api/videos/lesson-1/subtitles', { signal })
    if (!response.ok) throw new Error(`Subtitle catalog failed: ${response.status}`)
    return response.json()
  },
}

export function Player() {
  return <VideoPlayer src="/video.mp4" subtitleCatalog={subtitleCatalog} />
}
```

The catalog returns `SubtitleTrack[]`. VPlayer handles loading state, cancellation, errors, retry, and merging catalog entries with configured and local tracks.

### Local files

The default Captions menu always includes **Load subtitle file…**. Users can select `.vtt` or `.srt` files from their device. Files are read in the browser with `File.text()` and are never uploaded, assigned a blob URL, or persisted. Local tracks are discarded when the player is destroyed.

The Caption appearance panel provides a VLC-style live preview and controls for:

- small, default, or large base size;
- precise scaling from 50% to 200%;
- sans-serif, serif, or monospace fonts;
- text color and opacity;
- background color and opacity;
- no edge, drop shadow, or outline with a configurable edge color;
- vertical position and line spacing;
- subtitle delay from −10 to +10 seconds in 0.1-second steps;
- reset to defaults.

Positive subtitle delay displays cues later; negative delay displays them earlier. Appearance and sync preferences persist only when `persistPreferences` is enabled.

### Parsing captions directly

The framework-independent parser detects WebVTT and SRT from an explicit format, MIME type, filename, or content signature:

```ts
import { parseSubtitles } from '@vplayer/core'

const result = parseSubtitles(sourceText, { fileName: 'captions.srt' })

if (result.ok) {
  console.log(result.format, result.cues)
} else {
  console.error(result.error.code, result.error.message)
}
```

## Playback progress

Progress is stored per media source by default, or under an explicit ID:

```tsx
<VideoPlayer src="/episode.mp4" playbackProgress={{ id: 'series-1:episode-4' }} />
```

You may inject your own asynchronous store:

```ts
import type { PlaybackProgressStore } from '@vplayer/react'

const progressStore: PlaybackProgressStore = {
  async load(id) {
    return database.loadProgress(id)
  },
  async save(id, progress) {
    await database.saveProgress(id, progress)
  },
  async clear(id) {
    await database.clearProgress(id)
  },
}
```

```tsx
<VideoPlayer src="/episode.mp4" playbackProgress={{ id: 'episode-4', store: progressStore }} />
```

Manual playback presents Continue and Start over choices. Autoplay restores valid progress automatically. Progress checkpoints are throttled during playback and flushed on pause, seek, page hide, source changes, and teardown.

## Thumbnail previews

Provide a thumbnail WebVTT file:

```tsx
<VideoPlayer src="/video.mp4" thumbnails="/thumbnails.vtt" />
```

Sprite-sheet cue:

```vtt
WEBVTT

00:00:00.000 --> 00:00:05.000
thumbs.jpg#xywh=0,0,160,90
```

Plain image cues are also supported. Relative image URLs are resolved against the thumbnail VTT response URL.

## Theming

Override scoped CSS variables or stable `.vplayer*` classes in your application stylesheet:

```css
.vplayer {
  --vplayer-accent: #ff3b5c;
  --vplayer-radius: 14px;
  --vplayer-bg: #08090c;
}

.vplayer__button {
  border-radius: 9999px;
}
```

There is no skin prop or separate theme bundle.

## Mini-player

```tsx
<VideoPlayer src="/video.mp4" miniPlayer={{ enabled: true, auto: true, position: 'bottom-right', width: 360 }} />
```

Mini-player mode uses a compact play button, seekbar, progress indicator, and close control.

## Customize the UI

### Replace individual controls

Use slots when most of the default layout should remain:

```tsx
<VideoPlayer
  src="/video.mp4"
  slots={{
    playButton: <MyPlayButton />,
    seekBar: <MySeekBar />,
    volumeControl: <MyVolumeControl />,
    fullscreenButton: <MyFullscreenButton />,
  }}
/>
```

### Replace the layout

Children replace the default layout while preserving the internal video element, context, overlays, and lifecycle:

```tsx
import { VideoPlayer, usePlayerRemote, usePlayerState } from '@vplayer/react'

function MyControls() {
  const isPlaying = usePlayerState('isPlaying')
  const remote = usePlayerRemote()

  return (
    <div className="my-controls">
      <button type="button" onClick={remote.togglePlay}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <button type="button" onClick={() => remote.skip(-10)}>
        Back 10s
      </button>
      <button type="button" onClick={() => remote.skip(10)}>
        Forward 10s
      </button>
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

### Own all markup

Use `usePlayer` when your application should own the container and `<video>` element:

```tsx
import { useEffect, useRef } from 'react'
import { usePlayer } from '@vplayer/react'

function HeadlessPlayer({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const player = usePlayer({ src })

  useEffect(() => {
    player.attach(containerRef.current!, videoRef.current!)
    return player.detach
  }, [player.attach, player.detach])

  useEffect(() => {
    player.updateOptions({ src })
  }, [player.updateOptions, src])

  return (
    <div ref={containerRef}>
      <video ref={videoRef} playsInline />
      <button type="button" onClick={player.remote.togglePlay}>
        {player.state.isPlaying ? 'Pause' : 'Play'}
      </button>
    </div>
  )
}
```

## Packages

```text
@vplayer/core   Headless state, engines, events, source resolution, parsers, progress, and plugins
@vplayer/react  React provider, hooks, controls, layouts, overlays, and stylesheet
playground      Vite application for manual development
```

Core owns behavior and state. React owns rendering and CSS.

## Development

This repository uses Bun workspaces:

```bash
bun install
bun run dev
```

Validation commands:

```bash
bun run format
bun run typecheck
bun run lint
bun run test
bun run build
```

`bun run dev` starts the Vite playground. There is no Next.js or documentation application.
