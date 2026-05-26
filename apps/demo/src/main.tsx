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
    setEventLog((items) => [`${new Date().toLocaleTimeString()} ${event}`, ...items].slice(0, 8))
  }

  return (
    <main className="demo-shell dark">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">VPlayer React</p>
          <h1>Performance-focused video player playground</h1>
          <p>
            Test source URLs, poster behavior, autoplay, quality menus, controls, and callbacks against the package build.
          </p>
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

      <section className="controls-grid">
        <Panel title="Sources">
          <label>
            Video URL
            <input value={src} onChange={(event) => setSrc(event.target.value)} />
          </label>
          <label>
            Poster URL
            <input value={poster} onChange={(event) => setPoster(event.target.value)} />
          </label>
        </Panel>

        <Panel title="Configuration">
          <Toggle label="Autoplay" checked={autoPlay} onChange={setAutoPlay} />
          <Toggle label="Poster" checked={showPoster} onChange={setShowPoster} />
          <Toggle label="Quality menu" checked={qualities} onChange={setQualities} />
          <Toggle label="Thumbnail previews" checked={thumbnails} onChange={setThumbnails} />
          <Toggle label="Rounded frame" checked={rounded} onChange={setRounded} />
          <label>
            Accent (oklch/rgb/hex)
            <input value={accent} onChange={(event) => setAccent(event.target.value)} />
          </label>
        </Panel>

        <Panel title="Event Log">
          <div className="event-log">
            {eventLog.length === 0 ? <span>No events yet</span> : eventLog.map((item) => <span key={item}>{item}</span>)}
          </div>
        </Panel>
      </section>
    </main>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="config-panel">
      <h2>{title}</h2>
      {children}
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
