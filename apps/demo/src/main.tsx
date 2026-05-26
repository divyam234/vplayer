import { VideoPlayer } from '@vplayer/react'
import { StrictMode, useMemo, useState } from 'react'
import { Input, Label, Switch, TextField } from 'react-aria-components'
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
            <TextField value={src} onChange={setSrc} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Label className="rac-label">Video URL</Label>
              <Input className="rac-input" />
            </TextField>
            <TextField
              value={poster}
              onChange={setPoster}
              style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
            >
              <Label className="rac-label">Poster URL</Label>
              <Input className="rac-input" />
            </TextField>
          </Panel>

          <Panel title="Configuration">
            <Switch isSelected={autoPlay} onChange={setAutoPlay} className="config-row">
              <span>Autoplay</span>
              <div className="switch-track">
                <span className="switch-knob" />
              </div>
            </Switch>
            <Switch isSelected={showPoster} onChange={setShowPoster} className="config-row">
              <span>Poster visible</span>
              <div className="switch-track">
                <span className="switch-knob" />
              </div>
            </Switch>
            <Switch isSelected={qualities} onChange={setQualities} className="config-row">
              <span>Quality menu</span>
              <div className="switch-track">
                <span className="switch-knob" />
              </div>
            </Switch>
            <Switch isSelected={thumbnails} onChange={setThumbnails} className="config-row">
              <span>Thumbnail previews</span>
              <div className="switch-track">
                <span className="switch-knob" />
              </div>
            </Switch>
            <Switch isSelected={rounded} onChange={setRounded} className="config-row">
              <span>Rounded frame</span>
              <div className="switch-track">
                <span className="switch-knob" />
              </div>
            </Switch>
            <TextField
              value={accent}
              onChange={setAccent}
              style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
            >
              <Label className="rac-label">Accent color</Label>
              <div className="accent-row">
                <span className="accent-swatch" style={{ background: accent }} />
                <Input className="rac-input" />
              </div>
            </TextField>
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
