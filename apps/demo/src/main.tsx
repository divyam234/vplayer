import { StrictMode, useMemo, useState, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { VideoPlayer } from "@vplayer/react"
import "@vplayer/react/player.css"
import "./playground.css"

const SAMPLE_VIDEO = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
const SAMPLE_POSTER = "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80"

function App() {
  const [src, setSrc] = useState(SAMPLE_VIDEO)
  const [poster, setPoster] = useState(SAMPLE_POSTER)
  const [autoPlay, setAutoPlay] = useState(false)
  const [showPoster, setShowPoster] = useState(true)
  const [thumbnails, setThumbnails] = useState(false)
  const [qualities, setQualities] = useState(true)
  const [rounded, setRounded] = useState(true)
  const [accent, setAccent] = useState("oklch(0.75 0.12 78)")
  const [eventLog, setEventLog] = useState<string[]>([])

  const qualityList = useMemo(() => qualities ? ["Auto", "1080p", "720p", "480p"] : [], [qualities])

  const log = (event: string) => {
    const now = new Date()
    const time = now.toLocaleTimeString("en-US", { minute: "2-digit", second: "2-digit" })
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

        <div className="stage-card" style={{ ["--vplayer-accent" as string]: accent, ["--vplayer-radius" as string]: rounded ? "18px" : "4px" }}>
          <VideoPlayer
            src={src}
            poster={showPoster ? poster : undefined}
            autoPlay={autoPlay}
            qualities={qualityList}
            thumbnails={thumbnails ? "/thumbnails.vtt" : undefined}
            labels={{ endedTitle: "Thanks for watching" }}
            onTimeUpdate={(time) => {
              if (Math.floor(time) % 15 === 0) log(`time ${Math.floor(time)}s`)
            }}
            onEnded={() => log("ended")}
          />
        </div>
      </section>

      {/* Controls */}
      <section className="controls-section">
        <div className="controls-grid">
          <Panel title="Sources">
            <label>
              Video URL
              <input value={src} onChange={(e) => setSrc(e.target.value)} spellCheck={false} />
            </label>
            <label>
              Poster URL
              <input value={poster} onChange={(e) => setPoster(e.target.value)} spellCheck={false} />
            </label>
          </Panel>

          <Panel title="Configuration">
            <Toggle label="Autoplay" checked={autoPlay} onChange={setAutoPlay} />
            <Toggle label="Poster visible" checked={showPoster} onChange={setShowPoster} />
            <Toggle label="Quality menu" checked={qualities} onChange={setQualities} />
            <Toggle label="Thumbnail previews" checked={thumbnails} onChange={setThumbnails} />
            <Toggle label="Rounded frame" checked={rounded} onChange={setRounded} />
            <label>
              Accent color
              <div className="accent-row">
                <span className="accent-swatch" style={{ background: accent }} />
                <input value={accent} onChange={(e) => setAccent(e.target.value)} spellCheck={false} />
              </div>
            </label>
          </Panel>

          <Panel title="Event Log">
            <div className="event-log">
              {eventLog.length === 0 ? (
                <span className="event-log-empty">No events yet — play the video</span>
              ) : (
                eventLog.map((entry) => {
                  const idx = entry.indexOf("  ")
                  const time = idx > 0 ? entry.slice(0, idx) : ""
                  const event = idx > 0 ? entry.slice(idx + 2) : entry
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

/* ─── Panel ─── */
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="config-panel">
      <h2>{title}</h2>
      {children}
    </div>
  )
}

/* ─── Custom Toggle Switch ─── */
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <div
        className="toggle-switch"
        data-on={checked}
        onClick={(e) => { e.preventDefault(); onChange(!checked) }}
      >
        <div className="toggle-switch-knob" />
      </div>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
