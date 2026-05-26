import { STORAGE_KEYS, formatTime } from '@vplayer/core'
import { useCallback, useEffect, useState, type FC } from 'react'

import { usePlayerState, usePlayerContext, usePluginAPI } from '../context'

export const AutoResumeOverlay: FC = () => {
  const duration = usePlayerState('duration')
  const isPlaying = usePlayerState('isPlaying')
  const { labels } = usePlayerContext()
  const api = usePluginAPI()
  const [savedTime, setSavedTime] = useState<number | null>(null)

  useEffect(() => {
    const saved = api.storage.get<{ time: number; duration: number }>(STORAGE_KEYS.PLAYBACK_PROGRESS)
    if (saved && saved.time > 3 && Math.abs(saved.duration - duration) < 1) {
      setSavedTime(saved.time)
    }
  }, [api.storage, duration])

  const handleContinue = useCallback(() => {
    if (savedTime !== null) {
      api.remote.seek(savedTime)
      api.remote.play()
    }
    setSavedTime(null)
  }, [savedTime, api.remote])

  const handleStartOver = useCallback(() => {
    api.storage.remove(STORAGE_KEYS.PLAYBACK_PROGRESS)
    setSavedTime(null)
  }, [api.storage])

  if (savedTime === null || isPlaying) return null

  return (
    <div className="vplayer__auto-resume-overlay">
      <div className="vplayer__auto-resume-content">
        <p className="vplayer__auto-resume-text">
          {labels.continuePlay} <span className="font-medium text-white tabular-nums">{formatTime(savedTime)}</span>?
        </p>
        <div className="vplayer__auto-resume-actions">
          <button onClick={handleContinue} className="vplayer__auto-resume-btn vplayer__auto-resume-btn--primary">
            {labels.continue}
          </button>
          <button onClick={handleStartOver} className="vplayer__auto-resume-btn">
            {labels.continueStartOver}
          </button>
        </div>
      </div>
    </div>
  )
}
