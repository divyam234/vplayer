import { formatTime } from '@vplayer/core'
import { type FC } from 'react'

import { usePlayerState, usePlayerContext, usePlayerRemote } from '../context'

export const AutoResumeOverlay: FC = () => {
  const resumeProgress = usePlayerState('resumeProgress')
  const isPlaying = usePlayerState('isPlaying')
  const { labels } = usePlayerContext()
  const remote = usePlayerRemote()

  if (resumeProgress === null || isPlaying) return null

  return (
    <div className="vplayer__auto-resume-overlay">
      <div className="vplayer__auto-resume-content">
        <p className="vplayer__auto-resume-text">
          {labels.continuePlay}{' '}
          <span className="font-medium text-white tabular-nums">{formatTime(resumeProgress.time)}</span>?
        </p>
        <div className="vplayer__auto-resume-actions">
          <button
            onClick={remote.resumeFromSavedProgress}
            className="vplayer__auto-resume-btn vplayer__auto-resume-btn--primary"
          >
            {labels.continue}
          </button>
          <button onClick={remote.startPlaybackOver} className="vplayer__auto-resume-btn">
            {labels.continueStartOver}
          </button>
        </div>
      </div>
    </div>
  )
}
