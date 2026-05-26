import { STORAGE_KEYS, formatTime } from '@vplayer/core'
import { createEffect, createSignal, Show } from 'solid-js'

import { usePlayerState, usePlayerContext, usePluginAPI } from '../context'

export function AutoResumeOverlay() {
  const duration = usePlayerState('duration')
  const isPlaying = usePlayerState('isPlaying')
  const { labels } = usePlayerContext()
  const api = usePluginAPI()
  const [savedTime, setSavedTime] = createSignal<number | null>(null)

  createEffect(() => {
    const saved = api.storage.get<{ time: number; duration: number }>(STORAGE_KEYS.PLAYBACK_PROGRESS)
    if (saved && saved.time > 3 && Math.abs(saved.duration - duration()) < 1) {
      setSavedTime(saved.time)
    }
  })

  const handleContinue = () => {
    if (savedTime() !== null) {
      api.remote.seek(savedTime()!)
      api.remote.play()
    }
    setSavedTime(null)
  }

  const handleStartOver = () => {
    api.storage.remove(STORAGE_KEYS.PLAYBACK_PROGRESS)
    setSavedTime(null)
  }

  return (
    <Show when={savedTime() !== null && !isPlaying()}>
      <div class="vplayer__auto-resume-overlay">
        <div class="vplayer__auto-resume-content">
          <p class="vplayer__auto-resume-text">
            {labels.continuePlay}{' '}
            <span class="font-medium text-white tabular-nums">{formatTime(savedTime() ?? 0)}</span>?
          </p>
          <div class="vplayer__auto-resume-actions">
            <button onClick={handleContinue} class="vplayer__auto-resume-btn vplayer__auto-resume-btn--primary">
              {labels.continue}
            </button>
            <button onClick={handleStartOver} class="vplayer__auto-resume-btn">
              {labels.continueStartOver}
            </button>
          </div>
        </div>
      </div>
    </Show>
  )
}
