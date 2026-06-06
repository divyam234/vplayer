'use client'

import {
  DefaultVideoLayout,
  FullscreenButton,
  MiniPlayerButton,
  PiPButton,
  PlayButton,
  SeekBar,
  SettingsTrigger,
  TimeDisplay,
  useMiniPlayer,
  usePlayerRemote,
  usePlayerState,
  VideoPlayer,
  VolumeControl,
} from '@vplayer/react'
import type { PlayerProps, SubtitleTrack, ThumbnailPreviewOptions } from '@vplayer/react'
import { useMemo, useState, type CSSProperties } from 'react'

const SAMPLE_VIDEO = 'https://cdn.jsdelivr.net/npm/big-buck-bunny-1080p@0.0.6/video.mp4'
const SAMPLE_POSTER = 'https://cdn.jsdelivr.net/npm/big-buck-bunny-1080p@0.0.6/poster.jpg'
const LOCAL_THUMBNAILS = '/thumbnails.vtt'
const LOCAL_SUBTITLES = '/captions.en.vtt'

type DemoPreset = {
  id: string
  label: string
  description: string
  src: string
  type: string
  poster: string
  subtitles: string
  thumbnails: string
  qualities: string
}

type LayoutMode = 'default' | 'debug' | 'minimal' | 'cinema'
type ThemeMode = 'obsidian' | 'aurora' | 'zinc' | 'ember'
type MiniPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

const PRESETS: DemoPreset[] = [
  {
    id: 'bunny',
    label: 'Big Buck Bunny MP4',
    description: 'Stable MP4 fixture for native playback, poster, captions, and thumbnail VTT.',
    src: SAMPLE_VIDEO,
    type: 'video/mp4',
    poster: SAMPLE_POSTER,
    subtitles: LOCAL_SUBTITLES,
    thumbnails: LOCAL_THUMBNAILS,
    qualities: 'Auto,1080p,720p,480p',
  },
  {
    id: 'plain',
    label: 'Plain MP4, no extras',
    description: 'Use this to test the bare minimum native player path.',
    src: SAMPLE_VIDEO,
    type: 'video/mp4',
    poster: '',
    subtitles: '',
    thumbnails: '',
    qualities: 'Auto',
  },
  {
    id: 'broken',
    label: 'Broken source state',
    description: 'For error overlay, retry button, and failed media loading checks.',
    src: '/missing-video-file.mp4',
    type: 'video/mp4',
    poster: SAMPLE_POSTER,
    subtitles: LOCAL_SUBTITLES,
    thumbnails: LOCAL_THUMBNAILS,
    qualities: 'Auto,720p',
  },
]

const THEME_MAP: Record<ThemeMode, { accent: string; bg: string; radius: string }> = {
  obsidian: {
    accent: 'oklch(0.76 0.12 78)',
    bg: 'oklch(0.105 0.014 268)',
    radius: '20px',
  },
  aurora: {
    accent: 'oklch(0.78 0.17 176)',
    bg: 'oklch(0.12 0.023 232)',
    radius: '26px',
  },
  zinc: {
    accent: 'oklch(0.82 0.03 260)',
    bg: 'oklch(0.15 0.006 260)',
    radius: '14px',
  },
  ember: {
    accent: 'oklch(0.72 0.18 35)',
    bg: 'oklch(0.115 0.02 24)',
    radius: '22px',
  },
}

export function PlaygroundClient() {
  const [src, setSrc] = useState(SAMPLE_VIDEO)
  const [type, setType] = useState('video/mp4')
  const [poster, setPoster] = useState(SAMPLE_POSTER)
  const [subtitleUrl, setSubtitleUrl] = useState(LOCAL_SUBTITLES)
  const [subtitleLabel, setSubtitleLabel] = useState('English')
  const [subtitleLang, setSubtitleLang] = useState('en')
  const [thumbnailUrl, setThumbnailUrl] = useState(LOCAL_THUMBNAILS)
  const [qualitiesText, setQualitiesText] = useState('Auto,1080p,720p,480p')
  const [autoPlay, setAutoPlay] = useState(false)
  const [showPoster, setShowPoster] = useState(true)
  const [defaultHotkeys, setDefaultHotkeys] = useState(true)
  const [persistPreferences, setPersistPreferences] = useState(false)
  const [miniEnabled, setMiniEnabled] = useState(true)
  const [miniAuto, setMiniAuto] = useState(false)
  const [miniPosition, setMiniPosition] = useState<MiniPosition>('bottom-right')
  const [miniWidth, setMiniWidth] = useState(360)
  const [thumbnailPreviewEnabled, setThumbnailPreviewEnabled] = useState(true)
  const [thumbnailPreviewWidth, setThumbnailPreviewWidth] = useState(180)
  const [thumbnailPreviewHeight, setThumbnailPreviewHeight] = useState(101)
  const [thumbnailPreviewGap, setThumbnailPreviewGap] = useState(8)
  const [thumbnailPreviewShowTime, setThumbnailPreviewShowTime] = useState(true)
  const [thumbnailPreviewFit, setThumbnailPreviewFit] = useState<'cover' | 'contain'>('cover')
  const [layout, setLayout] = useState<LayoutMode>('debug')
  const [theme, setTheme] = useState<ThemeMode>('obsidian')
  const [accent, setAccent] = useState(THEME_MAP.obsidian.accent)
  const [radius, setRadius] = useState(THEME_MAP.obsidian.radius)
  const [endedTitle, setEndedTitle] = useState('Thanks for watching')
  const [showDebugHud, setShowDebugHud] = useState(true)
  const [eventLog, setEventLog] = useState<string[]>([])

  const qualities = useMemo(
    () =>
      qualitiesText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    [qualitiesText],
  )

  const subtitles = useMemo<SubtitleTrack[]>(() => {
    if (!subtitleUrl.trim()) return []
    return [
      {
        id: 'demo-subtitle',
        src: subtitleUrl.trim(),
        label: subtitleLabel.trim() || 'Custom subtitles',
        lang: subtitleLang.trim() || 'en',
        default: true,
      },
    ]
  }, [subtitleUrl, subtitleLabel, subtitleLang])

  const thumbnailPreview = useMemo<ThumbnailPreviewOptions>(
    () => ({
      enabled: thumbnailPreviewEnabled,
      width: thumbnailPreviewWidth,
      height: thumbnailPreviewHeight,
      gap: thumbnailPreviewGap,
      showTime: thumbnailPreviewShowTime,
      fit: thumbnailPreviewFit,
    }),
    [
      thumbnailPreviewEnabled,
      thumbnailPreviewFit,
      thumbnailPreviewGap,
      thumbnailPreviewHeight,
      thumbnailPreviewShowTime,
      thumbnailPreviewWidth,
    ],
  )

  const playerKey = useMemo(
    () => `${src}|${type}|${subtitleUrl}|${thumbnailUrl}|${qualities.join('|')}`,
    [src, type, subtitleUrl, thumbnailUrl, qualities],
  )

  const playerProps: PlayerProps = {
    src,
    type: type || undefined,
    poster: showPoster && poster.trim() ? poster : undefined,
    autoPlay,
    defaultHotkeys,
    persistPreferences,
    subtitles,
    thumbnails: thumbnailUrl.trim() || undefined,
    thumbnailPreview,
    qualities,
    miniPlayer: {
      enabled: miniEnabled,
      auto: miniAuto,
      position: miniPosition,
      width: miniWidth,
    },
    labels: { endedTitle },
    onTimeUpdate: (time) => {
      if (Math.floor(time) > 0 && Math.floor(time) % 20 === 0) log(`timeupdate ${Math.floor(time)}s`)
    },
    onEnded: () => log('ended'),
    onError: (message) => log(`error ${message}`),
  }

  const themeTokens = {
    '--vplayer-accent': accent,
    '--vplayer-bg': THEME_MAP[theme].bg,
    '--vplayer-radius': radius,
  } as CSSProperties

  function applyPreset(preset: DemoPreset) {
    setSrc(preset.src)
    setType(preset.type)
    setPoster(preset.poster)
    setSubtitleUrl(preset.subtitles)
    setThumbnailUrl(preset.thumbnails)
    setQualitiesText(preset.qualities)
    log(`preset ${preset.label}`)
  }

  function applyTheme(nextTheme: ThemeMode) {
    setTheme(nextTheme)
    setAccent(THEME_MAP[nextTheme].accent)
    setRadius(THEME_MAP[nextTheme].radius)
    log(`theme ${nextTheme}`)
  }

  function log(event: string) {
    const now = new Date()
    const time = now.toLocaleTimeString('en-US', { hour12: false })
    setEventLog((items) => [`${time}  ${event}`, ...items].slice(0, 18))
  }

  const codeSnippet = buildSnippet({
    src,
    type,
    poster: showPoster ? poster : '',
    subtitles,
    thumbnailUrl,
    qualities,
    autoPlay,
    miniEnabled,
    miniAuto,
    miniPosition,
    miniWidth,
    thumbnailPreview,
  })

  return (
    <main className="demo-shell">
      <header className="demo-header">
        <a className="demo-brand" href="#playground" aria-label="VPlayer playground home">
          <span className="demo-brand-mark">▶</span>
          <span>
            <span className="demo-eyebrow">Interactive lab</span>
            <strong>VPlayer Playground</strong>
          </span>
        </a>
        <nav className="demo-nav" aria-label="Demo sections">
          <a href="#presets">Presets</a>
          <a href="#config">Configure</a>
          <a href="#inspect">Inspect</a>
        </nav>
      </header>

      <section className="hero" id="playground">
        <div className="hero-copy">
          <span className="hero-kicker">Production demo surface</span>
          <h1>Configure every important player path from one page.</h1>
          <p>
            Change source URLs, captions, thumbnail VTT, quality labels, layout mode, mini-player settings, theme
            tokens, hotkeys, and persistence. The live player, event log, state HUD, and generated JSX update together.
          </p>
        </div>
        <div className="hero-scorecard" aria-label="Demo coverage summary">
          <Metric label="Inputs" value="25+" />
          <Metric label="Layouts" value="4" />
          <Metric label="Fixtures" value="VTT" />
        </div>
      </section>

      <section className="player-lab" aria-label="Player preview">
        <div className="stage-card" style={themeTokens}>
          <div className="stage-toolbar">
            <div>
              <span className="section-kicker">Live preview</span>
              <h2>Player stage</h2>
            </div>
            <div className="stage-pills" aria-label="Active player options">
              <span>{layout}</span>
              <span>{miniEnabled ? 'mini on' : 'mini off'}</span>
              <span>{subtitles.length ? 'captions' : 'no captions'}</span>
              <span>{thumbnailUrl ? 'thumbnails' : 'no thumbs'}</span>
            </div>
          </div>

          <VideoPlayer key={playerKey} {...playerProps}>
            {renderLayout(layout)}
            {(showDebugHud || layout === 'debug') && <PlayerStateHud />}
          </VideoPlayer>
        </div>
      </section>

      <section className="demo-grid" id="presets">
        <Panel title="Presets" description="One click paths for normal playback, clean native mode, and errors.">
          <div className="preset-grid">
            {PRESETS.map((preset) => (
              <button key={preset.id} type="button" className="preset-card" onClick={() => applyPreset(preset)}>
                <strong>{preset.label}</strong>
                <span>{preset.description}</span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel
          title="Layout"
          description="Switch between the default UI, debug overlay, cinema shell, and custom controls."
        >
          <SegmentedControl
            label="Layout mode"
            value={layout}
            options={[
              ['default', 'Default'],
              ['debug', 'Debug'],
              ['cinema', 'Cinema'],
              ['minimal', 'Minimal'],
            ]}
            onChange={(value) => setLayout(value as LayoutMode)}
          />
          <Toggle checked={showDebugHud} label="Show state HUD" onChange={setShowDebugHud} />
        </Panel>
      </section>

      <section className="config-grid" id="config">
        <Panel title="Source" description="Paste your own MP4, WebM, HLS, DASH, poster, caption, and thumbnail files.">
          <TextField label="Video URL" value={src} onChange={setSrc} placeholder="https://example.com/video.mp4" />
          <TextField
            label="MIME type"
            value={type}
            onChange={setType}
            placeholder="video/mp4 or application/x-mpegURL"
          />
          <TextField
            label="Poster URL"
            value={poster}
            onChange={setPoster}
            placeholder="https://example.com/poster.jpg"
          />
          <TextField
            label="Subtitle VTT URL"
            value={subtitleUrl}
            onChange={setSubtitleUrl}
            placeholder="/captions.en.vtt"
          />
          <div className="two-column-fields">
            <TextField label="Subtitle label" value={subtitleLabel} onChange={setSubtitleLabel} />
            <TextField label="Subtitle lang" value={subtitleLang} onChange={setSubtitleLang} />
          </div>
          <TextField
            label="Thumbnail VTT URL"
            value={thumbnailUrl}
            onChange={setThumbnailUrl}
            placeholder="/thumbnails.vtt"
          />
          <TextField
            label="Quality labels"
            value={qualitiesText}
            onChange={setQualitiesText}
            placeholder="Auto,1080p,720p"
          />
        </Panel>

        <Panel
          title="Behavior"
          description="Exercise autoplay, mini-player, hotkeys, persistence, and poster behavior."
        >
          <Toggle
            checked={autoPlay}
            label="Autoplay"
            help="May be blocked by the browser unless muted/user initiated."
            onChange={setAutoPlay}
          />
          <Toggle checked={showPoster} label="Show poster" onChange={setShowPoster} />
          <Toggle checked={defaultHotkeys} label="Default keyboard shortcuts" onChange={setDefaultHotkeys} />
          <Toggle checked={persistPreferences} label="Persist preferences" onChange={setPersistPreferences} />
          <Toggle checked={miniEnabled} label="Enable mini-player button" onChange={setMiniEnabled} />
          <Toggle checked={miniAuto} label="Auto mini-player when offscreen" onChange={setMiniAuto} />
          <SegmentedControl
            label="Mini-player corner"
            value={miniPosition}
            options={[
              ['bottom-right', 'Bottom right'],
              ['bottom-left', 'Bottom left'],
              ['top-right', 'Top right'],
              ['top-left', 'Top left'],
            ]}
            onChange={(value) => setMiniPosition(value as MiniPosition)}
          />
          <RangeField
            label="Mini-player width"
            min={260}
            max={520}
            step={10}
            value={miniWidth}
            onChange={setMiniWidth}
          />
        </Panel>

        <Panel
          title="Thumbnail preview"
          description="Tune seekbar preview size, sprite fit, time pill, and distance from the seekbar."
        >
          <Toggle
            checked={thumbnailPreviewEnabled}
            label="Enable thumbnail previews"
            onChange={setThumbnailPreviewEnabled}
          />
          <div className="two-column-fields">
            <RangeField
              label="Thumbnail width"
              min={96}
              max={420}
              step={4}
              value={thumbnailPreviewWidth}
              onChange={setThumbnailPreviewWidth}
            />
            <RangeField
              label="Thumbnail height"
              min={54}
              max={236}
              step={4}
              value={thumbnailPreviewHeight}
              onChange={setThumbnailPreviewHeight}
            />
          </div>
          <RangeField
            label="Seekbar gap"
            min={0}
            max={36}
            step={1}
            value={thumbnailPreviewGap}
            onChange={setThumbnailPreviewGap}
          />
          <Toggle
            checked={thumbnailPreviewShowTime}
            label="Show preview time pill"
            onChange={setThumbnailPreviewShowTime}
          />
          <SegmentedControl
            label="Thumbnail fit"
            value={thumbnailPreviewFit}
            options={[
              ['cover', 'Cover'],
              ['contain', 'Contain'],
            ]}
            onChange={(value) => setThumbnailPreviewFit(value as 'cover' | 'contain')}
          />
        </Panel>

        <Panel title="Theme tokens" description="Edit real CSS variables and labels used by the player component.">
          <SegmentedControl
            label="Token preset"
            value={theme}
            options={[
              ['obsidian', 'Obsidian'],
              ['aurora', 'Aurora'],
              ['zinc', 'Zinc'],
              ['ember', 'Ember'],
            ]}
            onChange={(value) => applyTheme(value as ThemeMode)}
          />
          <TextField label="Accent OKLCH" value={accent} onChange={setAccent} />
          <TextField label="Corner radius" value={radius} onChange={setRadius} />
          <TextField label="Ended title" value={endedTitle} onChange={setEndedTitle} />
        </Panel>
      </section>

      <section className="inspect-grid" id="inspect">
        <Panel title="Event log" description="Recent callbacks and playground actions.">
          <EventLog items={eventLog} />
        </Panel>
        <Panel title="Generated JSX" description="Copy this into a React app using @vplayer/react.">
          <pre className="code-block" data-testid="generated-code">
            <code>{codeSnippet}</code>
          </pre>
        </Panel>
        <Panel title="Keyboard checklist" description="Focus the player, then try these shortcuts.">
          <ul className="shortcut-list">
            <li>
              <kbd>Space</kbd> or <kbd>K</kbd>
              <span>Play / pause</span>
            </li>
            <li>
              <kbd>←</kbd> / <kbd>→</kbd>
              <span>Seek backward / forward</span>
            </li>
            <li>
              <kbd>↑</kbd> / <kbd>↓</kbd>
              <span>Volume up / down</span>
            </li>
            <li>
              <kbd>M</kbd>
              <span>Mute</span>
            </li>
            <li>
              <kbd>F</kbd>
              <span>Fullscreen</span>
            </li>
            <li>
              <kbd>A</kbd>
              <span>Cycle VLC-style aspect ratio</span>
            </li>
          </ul>
        </Panel>
      </section>
    </main>
  )
}

function renderLayout(layout: LayoutMode) {
  if (layout === 'minimal') return <MinimalControls />
  if (layout === 'cinema') {
    return (
      <>
        <div className="cinema-vignette" aria-hidden="true" />
        <DefaultVideoLayout />
      </>
    )
  }
  return <DefaultVideoLayout />
}

function MinimalControls() {
  const mini = useMiniPlayer()
  return (
    <div className="minimal-controls" role="toolbar" aria-label="Minimal custom controls">
      <PlayButton />
      <SeekBar />
      <TimeDisplay />
      <VolumeControl />
      <SettingsTrigger />
      {mini.enabled && <MiniPlayerButton />}
      <PiPButton />
      <FullscreenButton />
    </div>
  )
}

function PlayerStateHud() {
  const state = usePlayerState()
  const remote = usePlayerRemote()
  const mini = useMiniPlayer()
  const safeDuration = Number.isFinite(state.duration) && state.duration > 0 ? state.duration : 0
  const progress = safeDuration ? Math.min(100, (state.currentTime / safeDuration) * 100) : 0

  return (
    <aside className="state-hud" aria-label="Player state inspector">
      <div className="state-hud-header">
        <strong>{state.status}</strong>
        <span>{state.source?.type || 'native'}</span>
      </div>
      <dl>
        <div>
          <dt>time</dt>
          <dd>
            {formatSeconds(state.currentTime)} / {formatSeconds(state.duration)}
          </dd>
        </div>
        <div>
          <dt>volume</dt>
          <dd>
            {Math.round(state.volume * 100)}% {state.isMuted ? 'muted' : ''}
          </dd>
        </div>
        <div>
          <dt>rate</dt>
          <dd>{state.playbackRate}x</dd>
        </div>
        <div>
          <dt>quality</dt>
          <dd>{state.activeQuality}</dd>
        </div>
        <div>
          <dt>captions</dt>
          <dd>{state.activeSubtitle?.label ?? 'off'}</dd>
        </div>
        <div>
          <dt>aspect</dt>
          <dd>{state.aspectRatio}</dd>
        </div>
        <div>
          <dt>thumbs</dt>
          <dd>{state.thumbnailCues.length}</dd>
        </div>
        <div>
          <dt>mini</dt>
          <dd>{mini.active ? 'active' : mini.enabled ? 'ready' : 'off'}</dd>
        </div>
      </dl>
      <div className="state-progress" aria-label="Playback progress">
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="state-hud-actions">
        <button type="button" onClick={remote.togglePlay}>
          {state.isPlaying ? 'Pause' : 'Play'}
        </button>
        <button type="button" onClick={() => remote.skip(-10)}>
          -10s
        </button>
        <button type="button" onClick={() => remote.skip(10)}>
          +10s
        </button>
      </div>
    </aside>
  )
}

function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="config-panel">
      <div className="panel-heading">
        <span className="section-kicker">{title}</span>
        {description && <p>{description}</p>}
      </div>
      {children}
    </section>
  )
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="field-row">
      <span>{label}</span>
      <input
        className="field-input"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function RangeField({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="field-row">
      <span>
        {label}: <strong>{value}px</strong>
      </span>
      <input
        className="range-input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function Toggle({
  checked,
  label,
  help,
  onChange,
}: {
  checked: boolean
  label: string
  help?: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="toggle-row">
      <span>
        <strong>{label}</strong>
        {help && <small>{help}</small>}
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  )
}

function SegmentedControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Array<[string, string]>
  onChange: (value: string) => void
}) {
  return (
    <fieldset className="segmented-field">
      <legend>{label}</legend>
      <div className="segmented-control">
        {options.map(([option, text]) => (
          <button
            key={option}
            type="button"
            className={option === value ? 'is-active' : ''}
            aria-pressed={option === value}
            onClick={() => onChange(option)}
          >
            {text}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function EventLog({ items }: { items: string[] }) {
  if (!items.length)
    return <p className="empty-state">No events yet. Play, seek, switch presets, or toggle settings.</p>
  return (
    <ol className="event-log" aria-label="Playground event log">
      {items.map((entry, index) => {
        const [time, event] = entry.split('  ')
        return (
          <li key={`${entry}-${index}`}>
            <time>{time}</time>
            <span>{event}</span>
          </li>
        )
      })}
    </ol>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function buildSnippet({
  src,
  type,
  poster,
  subtitles,
  thumbnailUrl,
  qualities,
  autoPlay,
  miniEnabled,
  miniAuto,
  miniPosition,
  miniWidth,
  thumbnailPreview,
}: {
  src: string
  type: string
  poster: string
  subtitles: SubtitleTrack[]
  thumbnailUrl: string
  qualities: string[]
  autoPlay: boolean
  miniEnabled: boolean
  miniAuto: boolean
  miniPosition: MiniPosition
  miniWidth: number
  thumbnailPreview: ThumbnailPreviewOptions
}) {
  return `import { VideoPlayer } from '@vplayer/react'
import '@vplayer/react/player.css'

<VideoPlayer
  src=${JSON.stringify(src)}
  type=${JSON.stringify(type)}${poster ? `\n  poster=${JSON.stringify(poster)}` : ''}
  autoPlay={${autoPlay}}
  qualities={${JSON.stringify(qualities)}}${subtitles.length ? `\n  subtitles={${JSON.stringify(subtitles, null, 2)}}` : ''}${thumbnailUrl ? `\n  thumbnails=${JSON.stringify(thumbnailUrl)}` : ''}
  miniPlayer={{ enabled: ${miniEnabled}, auto: ${miniAuto}, position: ${JSON.stringify(miniPosition)}, width: ${miniWidth} }}
  thumbnailPreview={${JSON.stringify(thumbnailPreview)}}
/>`
}

function formatSeconds(value: number) {
  if (!Number.isFinite(value) || value < 0) return '00:00'
  const total = Math.floor(value)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}
