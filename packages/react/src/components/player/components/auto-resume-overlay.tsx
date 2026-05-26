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
    <div className="vplayer__auto-resume-overlay absolute inset-0 z-30 flex items-center justify-center bg-black/60">
      <div
        className="vplayer__auto-resume-content flex flex-col items-center gap-4 rounded-xl px-8 py-6 shadow-2xl"
        style={{
          background: 'color-mix(in srgb, black 90%, transparent)',
          border: '1px solid color-mix(in srgb, white 14%, transparent)',
        }}
      >
        <p className="vplayer__auto-resume-text text-sm text-white/80">
          {labels.continuePlay} <span className="font-medium text-white tabular-nums">{formatTime(savedTime)}</span>?
        </p>
        <div className="vplayer__auto-resume-actions flex items-center gap-3">
          <button
            onClick={handleContinue}
            className="vplayer__auto-resume-btn vplayer__auto-resume-btn--primary rounded-full px-5 py-1.5 text-sm text-white transition-colors hover:bg-white/20"
            style={{
              background: 'color-mix(in srgb, white 12%, transparent)',
              border: '1px solid color-mix(in srgb, white 14%, transparent)',
            }}
          >
            {labels.continue}
          </button>
          <button
            onClick={handleStartOver}
            className="vplayer__auto-resume-btn rounded-full px-5 py-1.5 text-sm text-white/60 transition-colors hover:text-white"
          >
            {labels.continueStartOver}
          </button>
        </div>
      </div>
    </div>
  )
}
