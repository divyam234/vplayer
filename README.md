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

### Remote subtitle providers

Applications can plug in any subtitle backend while VPlayer owns the search, source filtering, result list, and selection UI. Implement one or more `SubtitleProvider`s:

```tsx
import { VideoPlayer, type SubtitleProvider } from '@vplayer/react'

const subtitleProvider: SubtitleProvider = {
  id: 'my-api',
  label: 'My subtitle service',

  async search(query, signal) {
    const response = await fetch('/api/subtitles/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(query),
      signal,
    })
    if (!response.ok) throw new Error(`Subtitle search failed: ${response.status}`)
    return response.json()
  },

  async fetch(item, signal) {
    const response = await fetch(`/api/subtitles/${encodeURIComponent(item.id)}`, { signal })
    if (!response.ok) throw new Error(`Subtitle fetch failed: ${response.status}`)
    return { content: await response.text(), format: item.format }
  },
}

export function Player() {
  return (
    <VideoPlayer
      src="/video.mp4"
      title="Example movie"
      subtitleProviders={[subtitleProvider]}
      subtitleSearchDefaultQuery="Example Movie 2026"
    />
  )
}
```

`search()` returns subtitle metadata (`id`, `label`, `language`, plus optional release/download/accessibility metadata). VPlayer does not download those results eagerly. When the user chooses a result, VPlayer calls that provider's `fetch()` and accepts either raw subtitle `content` or a browser-fetchable `src`. Multiple providers are searched together by default and can be filtered by source in the UI.

Set `subtitleSearchDefaultQuery` to prefill the default search box and use that value for the automatic search when **Find subtitles online** opens.

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

Progress is stored in one localStorage record and keyed by normalized media URL by default. Query parameters and fragments are removed, which keeps expiring signed URLs stable. An explicit ID takes priority:

```tsx
<VideoPlayer src="/episode.mp4" playbackProgress={{ id: 'series-1:episode-4' }} />
```

Preserve the exact source URL or customize how long the non-blocking resume banner remains visible:

```tsx
<VideoPlayer src="/episode.mp4?quality=1080" playbackProgress={{ normalizeUrl: false, resumePromptTimeout: 10_000 }} />
```

The timeout defaults to 5 seconds. Set `resumePromptTimeout` to `0` to keep the banner visible until the user acts.

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

Playback presents a non-blocking Continue and Start over banner, including during autoplay. Saved progress is restored only when the user chooses Continue. Progress checkpoints are throttled during playback and flushed on pause, seek, page hide, source changes, and teardown.

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
