import {
  DefaultVideoLayout,
  FullscreenButton,
  MiniPlayerButton,
  PiPButton,
  PlayButton,
  SeekBar,
  SettingsTrigger,
  TimeDisplay,
  VideoPlayer,
  VolumeControl,
  useMiniPlayer,
} from '@vplayer/react'
import type { PlayerProps, SubtitleTrack, ThumbnailPreviewOptions } from '@vplayer/react'
import { Check, ChevronDown, CirclePlay, Code2, Copy, MonitorPlay, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'

const SAMPLE_VIDEO = 'https://cdn.jsdelivr.net/npm/big-buck-bunny-1080p@0.0.6/video.mp4'
const SAMPLE_POSTER = 'https://cdn.jsdelivr.net/npm/big-buck-bunny-1080p@0.0.6/poster.jpg'
const LOCAL_THUMBNAILS = '/thumbnails.vtt'
const LOCAL_SUBTITLES = '/captions.en.vtt'
const THUMBNAIL_SPRITE = { id: '/thumbs/thumb' }

type LayoutMode = 'default' | 'minimal' | 'cinema'
type ThemeMode = 'neutral' | 'warm' | 'cyan'
type MiniPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

type Preset = {
  id: string
  label: string
  description: string
  src: string
  poster: string
  subtitles: string
  thumbnails: string
  qualities: string
}

const PRESETS: Preset[] = [
  {
    id: 'complete',
    label: 'Complete demo',
    description: 'Poster, captions, thumbnail previews, and quality labels.',
    src: SAMPLE_VIDEO,
    poster: SAMPLE_POSTER,
    subtitles: LOCAL_SUBTITLES,
    thumbnails: LOCAL_THUMBNAILS,
    qualities: 'Auto,1080p,720p,480p',
  },
  {
    id: 'plain',
    label: 'Plain MP4',
    description: 'The smallest native playback configuration.',
    src: SAMPLE_VIDEO,
    poster: '',
    subtitles: '',
    thumbnails: '',
    qualities: 'Auto',
  },
  {
    id: 'broken',
    label: 'Error state',
    description: 'A missing source for checking retry and error UI.',
    src: '/missing-video-file.mp4',
    poster: SAMPLE_POSTER,
    subtitles: '',
    thumbnails: '',
    qualities: 'Auto',
  },
]

const THEMES: Record<ThemeMode, { accent: string; bg: string; radius: string }> = {
  neutral: { accent: 'oklch(0.78 0.02 260)', bg: 'oklch(0.11 0.008 260)', radius: '16px' },
  warm: { accent: 'oklch(0.78 0.14 72)', bg: 'oklch(0.11 0.016 45)', radius: '20px' },
  cyan: { accent: 'oklch(0.78 0.13 205)', bg: 'oklch(0.11 0.018 220)', radius: '18px' },
}

export function Playground() {
  const [activePreset, setActivePreset] = useState('complete')
  const [src, setSrc] = useState(SAMPLE_VIDEO)
  const [poster, setPoster] = useState(SAMPLE_POSTER)
  const [subtitleUrl, setSubtitleUrl] = useState(LOCAL_SUBTITLES)
  const [thumbnailUrl, setThumbnailUrl] = useState(LOCAL_THUMBNAILS)
  const [qualitiesText, setQualitiesText] = useState('Auto,1080p,720p,480p')
  const [layout, setLayout] = useState<LayoutMode>('default')
  const [theme, setTheme] = useState<ThemeMode>('neutral')
  const [autoPlay, setAutoPlay] = useState(false)
  const [captionsEnabled, setCaptionsEnabled] = useState(true)
  const [thumbnailsEnabled, setThumbnailsEnabled] = useState(true)
  const [hotkeysEnabled, setHotkeysEnabled] = useState(true)
  const [miniEnabled, setMiniEnabled] = useState(true)
  const [miniAuto, setMiniAuto] = useState(false)
  const [miniPosition, setMiniPosition] = useState<MiniPosition>('bottom-right')
  const [miniWidth, setMiniWidth] = useState(360)
  const [previewWidth, setPreviewWidth] = useState(180)
  const [previewHeight, setPreviewHeight] = useState(101)
  const [copied, setCopied] = useState(false)

  const qualities = useMemo(
    () =>
      qualitiesText
        .split(',')
        .map((quality) => quality.trim())
        .filter(Boolean),
    [qualitiesText],
  )

  const subtitles = useMemo<SubtitleTrack[]>(
    () =>
      captionsEnabled && subtitleUrl.trim()
        ? [{ src: subtitleUrl.trim(), label: 'English', lang: 'en', default: true }]
        : [],
    [captionsEnabled, subtitleUrl],
  )

  const thumbnailPreview = useMemo<ThumbnailPreviewOptions>(
    () => ({
      enabled: thumbnailsEnabled,
      width: previewWidth,
      height: previewHeight,
      gap: 8,
      showTime: true,
      fit: 'cover',
    }),
    [previewHeight, previewWidth, thumbnailsEnabled],
  )

  const playerProps: PlayerProps = {
    src,
    type: 'video/mp4',
    poster: poster.trim() || undefined,
    autoPlay,
    defaultHotkeys: hotkeysEnabled,
    subtitles,
    thumbnails: thumbnailsEnabled ? thumbnailUrl.trim() || undefined : undefined,
    transformThumbnailVTT: THUMBNAIL_SPRITE?.id
      ? (content) => content.replaceAll('#image', THUMBNAIL_SPRITE.id)
      : undefined,
    thumbnailPreview,
    qualities,
    miniPlayer: { enabled: miniEnabled, auto: miniAuto, position: miniPosition, width: miniWidth },
  }

  const playerKey = `${src}|${poster}|${subtitleUrl}|${thumbnailUrl}|${qualities.join('|')}`
  const themeTokens = {
    '--vplayer-accent': THEMES[theme].accent,
    '--vplayer-bg': THEMES[theme].bg,
    '--vplayer-radius': THEMES[theme].radius,
  } as CSSProperties

  const code = buildSnippet({
    src,
    poster,
    autoPlay,
    qualities,
    subtitles,
    thumbnails: thumbnailsEnabled ? thumbnailUrl : '',
    miniEnabled,
    miniAuto,
    miniPosition,
    miniWidth,
    thumbnailPreview,
  })

  function applyPreset(preset: Preset) {
    setActivePreset(preset.id)
    setSrc(preset.src)
    setPoster(preset.poster)
    setSubtitleUrl(preset.subtitles)
    setThumbnailUrl(preset.thumbnails)
    setQualitiesText(preset.qualities)
    setCaptionsEnabled(Boolean(preset.subtitles))
    setThumbnailsEnabled(Boolean(preset.thumbnails))
  }

  async function copyCode() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-5 flex items-center gap-3 border-b border-white/10 pb-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-zinc-950">
            <CirclePlay className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">VPlayer Playground</h1>
            <p className="hidden text-xs text-zinc-500 sm:block">
              Configure the player and copy the exact React setup.
            </p>
          </div>
        </header>

        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 space-y-4" id="stage">
            <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Preset sources">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={activePreset === preset.id}
                  onClick={() => applyPreset(preset)}
                  className={`min-w-44 flex-1 rounded-xl border px-4 py-3 text-left transition ${
                    activePreset === preset.id
                      ? 'border-white/30 bg-white/10'
                      : 'border-white/10 bg-white/[0.025] hover:border-white/20 hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <strong className="text-sm font-medium text-zinc-100">{preset.label}</strong>
                    {activePreset === preset.id && <Check className="size-4 shrink-0" />}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-zinc-500">{preset.description}</span>
                </button>
              ))}
            </div>

            <div
              className="min-w-0 rounded-2xl border border-white/10 bg-black p-2 shadow-2xl shadow-black/40 sm:p-3"
              style={themeTokens}
            >
              <VideoPlayer key={playerKey} {...playerProps}>
                {layout === 'minimal' ? <MinimalControls /> : <DefaultVideoLayout />}
                {layout === 'cinema' && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(circle_at_center,transparent_45%,rgb(0_0_0/0.5))]"
                  />
                )}
              </VideoPlayer>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <MonitorPlay className="size-4 text-zinc-400" />
                    <h2 className="text-sm font-semibold">Player mode</h2>
                  </div>
                  <span className="text-xs text-zinc-500">Live preview</span>
                </div>
                <ChoiceGroup
                  label="Layout"
                  value={layout}
                  options={[
                    ['default', 'Default'],
                    ['minimal', 'Minimal'],
                    ['cinema', 'Cinema'],
                  ]}
                  onChange={(value) => setLayout(value as LayoutMode)}
                />
                <ChoiceGroup
                  label="Theme"
                  value={theme}
                  options={[
                    ['neutral', 'Neutral'],
                    ['warm', 'Warm'],
                    ['cyan', 'Cyan'],
                  ]}
                  onChange={(value) => setTheme(value as ThemeMode)}
                />
              </section>

              <section className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                <div className="mb-4 flex items-center gap-2">
                  <Code2 className="size-4 text-zinc-400" />
                  <h2 className="text-sm font-semibold">Generated React</h2>
                </div>
                <div className="relative">
                  <pre
                    data-testid="generated-code"
                    className="max-h-72 overflow-auto rounded-lg bg-black/50 p-3 text-xs leading-5 text-zinc-300"
                  >
                    <code>{code}</code>
                  </pre>
                  <button
                    type="button"
                    onClick={copyCode}
                    className="absolute top-2 right-2 flex items-center gap-1.5 rounded-md border border-white/10 bg-zinc-900 px-2 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-800"
                  >
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </section>
            </div>
          </section>

          <aside
            className="min-w-0 xl:sticky xl:top-5 xl:max-h-[calc(100vh-2.5rem)] xl:overflow-y-auto"
            id="settings"
            aria-label="Playground settings"
          >
            <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 backdrop-blur-xl sm:p-5">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/5">
                  <SlidersHorizontal className="size-4" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold">Configuration</h2>
                  <p className="text-xs text-zinc-500">Changes apply immediately.</p>
                </div>
              </div>

              <div className="space-y-4">
                <Field label="Video URL" value={src} onChange={setSrc} />
                <Field label="Poster URL" value={poster} onChange={setPoster} />

                <div className="grid grid-cols-2 gap-2">
                  <Toggle label="Captions" checked={captionsEnabled} onChange={setCaptionsEnabled} />
                  <Toggle label="Thumbnails" checked={thumbnailsEnabled} onChange={setThumbnailsEnabled} />
                  <Toggle label="Autoplay" checked={autoPlay} onChange={setAutoPlay} />
                  <Toggle label="Hotkeys" checked={hotkeysEnabled} onChange={setHotkeysEnabled} />
                  <Toggle label="Mini-player" checked={miniEnabled} onChange={setMiniEnabled} />
                  <Toggle label="Auto mini" checked={miniAuto} onChange={setMiniAuto} />
                </div>

                <details className="group rounded-xl border border-white/10 bg-black/15">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-sm font-medium text-zinc-300">
                    Advanced settings
                    <ChevronDown className="size-4 transition group-open:rotate-180" />
                  </summary>
                  <div className="space-y-4 border-t border-white/10 p-3">
                    <Field label="Subtitle VTT URL" value={subtitleUrl} onChange={setSubtitleUrl} />
                    <Field label="Thumbnail VTT URL" value={thumbnailUrl} onChange={setThumbnailUrl} />
                    <Field label="Quality labels" value={qualitiesText} onChange={setQualitiesText} />
                    <ChoiceGroup
                      label="Mini-player position"
                      value={miniPosition}
                      options={[
                        ['bottom-right', 'Bottom right'],
                        ['bottom-left', 'Bottom left'],
                        ['top-right', 'Top right'],
                        ['top-left', 'Top left'],
                      ]}
                      onChange={(value) => setMiniPosition(value as MiniPosition)}
                    />
                    <Range
                      label="Mini-player width"
                      value={miniWidth}
                      min={260}
                      max={520}
                      step={10}
                      onChange={setMiniWidth}
                    />
                    <Range
                      label="Preview width"
                      value={previewWidth}
                      min={96}
                      max={420}
                      step={4}
                      onChange={setPreviewWidth}
                    />
                    <Range
                      label="Preview height"
                      value={previewHeight}
                      min={54}
                      max={236}
                      step={4}
                      onChange={setPreviewHeight}
                    />
                  </div>
                </details>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}

function MinimalControls() {
  const mini = useMiniPlayer()
  return (
    <div
      role="toolbar"
      aria-label="Minimal custom controls"
      className="absolute right-3 bottom-3 left-3 z-40 flex items-center gap-2 rounded-xl border border-white/10 bg-black/80 p-2 backdrop-blur-xl"
    >
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

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-zinc-400">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-10 w-full rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-zinc-200 transition outline-none placeholder:text-zinc-600 focus:border-white/30 focus:ring-2 focus:ring-white/10"
      />
    </label>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-white"
      />
    </label>
  )
}

function ChoiceGroup({
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
    <fieldset className="mb-4 last:mb-0">
      <legend className="mb-2 text-xs font-medium text-zinc-500">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map(([option, text]) => (
          <button
            key={option}
            type="button"
            aria-pressed={option === value}
            onClick={() => onChange(option)}
            className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
              option === value
                ? 'border-white bg-white text-zinc-950'
                : 'border-white/10 bg-white/[0.025] text-zinc-400 hover:border-white/20 hover:text-white'
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function Range({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <label className="grid gap-2">
      <span className="flex items-center justify-between text-xs font-medium text-zinc-400">
        {label}
        <strong className="font-mono text-zinc-200">{value}px</strong>
      </span>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-white"
      />
    </label>
  )
}

function buildSnippet({
  src,
  poster,
  autoPlay,
  qualities,
  subtitles,
  thumbnails,
  miniEnabled,
  miniAuto,
  miniPosition,
  miniWidth,
  thumbnailPreview,
}: {
  src: string
  poster: string
  autoPlay: boolean
  qualities: string[]
  subtitles: SubtitleTrack[]
  thumbnails: string
  miniEnabled: boolean
  miniAuto: boolean
  miniPosition: MiniPosition
  miniWidth: number
  thumbnailPreview: ThumbnailPreviewOptions
}) {
  return `import { VideoPlayer } from '@vplayer/react'
import '@vplayer/react/player.css'

<VideoPlayer
  src=${JSON.stringify(src)}${poster ? `\n  poster=${JSON.stringify(poster)}` : ''}
  autoPlay={${autoPlay}}
  qualities={${JSON.stringify(qualities)}}${subtitles.length ? `\n  subtitles={${JSON.stringify(subtitles, null, 2)}}` : ''}${thumbnails ? `\n  thumbnails=${JSON.stringify(thumbnails)}` : ''}
  miniPlayer={{ enabled: ${miniEnabled}, auto: ${miniAuto}, position: ${JSON.stringify(miniPosition)}, width: ${miniWidth} }}
  thumbnailPreview={${JSON.stringify(thumbnailPreview)}}
/>`
}
