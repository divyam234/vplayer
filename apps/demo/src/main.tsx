import { Switch } from '@ark-ui/react/switch'
import { VideoPlayer } from '@vplayer/react'
import { StrictMode, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'

import '@vplayer/react/player.css'
import './playground.css'

const SAMPLE_VIDEO = 'https://cdn.jsdelivr.net/npm/big-buck-bunny-1080p@0.0.6/video.mp4'
const SAMPLE_POSTER = 'https://cdn.jsdelivr.net/npm/big-buck-bunny-1080p@0.0.6/poster.jpg'

function App() {
  const [src, setSrc] = useState(SAMPLE_VIDEO)
  const [poster, setPoster] = useState(SAMPLE_POSTER)
  const [autoPlay, setAutoPlay] = useState(false)
  const [showPoster, setShowPoster] = useState(true)
  const [thumbnails, setThumbnails] = useState(false)
  const [qualities, setQualities] = useState(true)
  const [rounded, setRounded] = useState(true)
  const [accent, setAccent] = useState('oklch(0.75 0.12 78)')
  const [eventLog, setEventLog] = useState<string[]>([])

  const qualityList = useMemo(() => (qualities ? ['Auto', '1080p', '720p', '480p'] : []), [qualities])

  const log = (event: string) => {
    const now = new Date()
    const time = now.toLocaleTimeString('en-US', { minute: '2-digit', second: '2-digit' })
    setEventLog((items) => [`${time}  ${event}`, ...items].slice(0, 10))
  }

  return (
    <main className="demo-shell">
      {/* Header */}
      <header className="demo-header">
        <a className="demo-brand" href="#">
          <span className="demo-brand-icon">▶</span>
          <span className="demo-brand-text">VPlayer</span>
        </a>
        <span className="demo-header-version">v0.0.0</span>
      </header>

      {/* Player Stage */}
      <section className="hero-section">
        <div className="hero-label">
          <span className="hero-label-dot" />
          Playground
        </div>

        <div
          className="stage-card"
          style={
            {
              ['--vplayer-accent' as string]: accent,
              ['--vplayer-radius' as string]: rounded ? '18px' : '4px',
            } as React.CSSProperties
          }
        >
          <VideoPlayer
            src={src}
            poster={showPoster ? poster : undefined}
            autoPlay={autoPlay}
            qualities={qualityList}
            thumbnails={thumbnails ? '/thumbnails.vtt' : undefined}
            labels={{ endedTitle: 'Thanks for watching' }}
            onTimeUpdate={(time) => {
              if (Math.floor(time) % 15 === 0) log(`time ${Math.floor(time)}s`)
            }}
            onEnded={() => log('ended')}
          />
        </div>
      </section>

      {/* Controls */}
      <section className="controls-section">
        <div className="controls-grid">
          <Panel title="Sources">
            <label className="field-row">
              <span className="field-label">Video URL</span>
              <input value={src} onChange={(e) => setSrc(e.target.value)} className="field-input" />
            </label>
            <label className="field-row">
              <span className="field-label">Poster URL</span>
              <input value={poster} onChange={(e) => setPoster(e.target.value)} className="field-input" />
            </label>
          </Panel>

          <Panel title="Configuration">
            <Switch.Root checked={autoPlay} onCheckedChange={(d) => setAutoPlay(d.checked)} className="config-row">
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Switch.Label>Autoplay</Switch.Label>
            </Switch.Root>
            <Switch.Root checked={showPoster} onCheckedChange={(d) => setShowPoster(d.checked)} className="config-row">
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Switch.Label>Poster visible</Switch.Label>
            </Switch.Root>
            <Switch.Root checked={qualities} onCheckedChange={(d) => setQualities(d.checked)} className="config-row">
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Switch.Label>Quality menu</Switch.Label>
            </Switch.Root>
            <Switch.Root checked={thumbnails} onCheckedChange={(d) => setThumbnails(d.checked)} className="config-row">
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Switch.Label>Thumbnail previews</Switch.Label>
            </Switch.Root>
            <Switch.Root checked={rounded} onCheckedChange={(d) => setRounded(d.checked)} className="config-row">
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Switch.Label>Rounded frame</Switch.Label>
            </Switch.Root>
            <label className="field-row">
              <span className="field-label">Accent color</span>
              <div className="accent-row">
                <span className="accent-swatch" style={{ background: accent }} />
                <input value={accent} onChange={(e) => setAccent(e.target.value)} className="field-input" />
              </div>
            </label>
          </Panel>

          <Panel title="Event Log">
            <div className="event-log">
              {eventLog.length === 0 ? (
                <span className="event-log-empty">No events yet — play the video</span>
              ) : (
                eventLog.map((entry) => {
                  const sep = entry.indexOf('  ')
                  const time = sep > 0 ? entry.slice(0, sep) : ''
                  const event = sep > 0 ? entry.slice(sep + 2) : entry
                  return (
                    <span key={entry} className="event-log-entry">
                      {time && <span className="event-log-entry-time">{time}</span>}
                      <span>{event}</span>
                    </span>
                  )
                })
              )}
            </div>
          </Panel>
        </div>
      </section>
    </main>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="config-panel">
      <h2>{title}</h2>
      {children}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
