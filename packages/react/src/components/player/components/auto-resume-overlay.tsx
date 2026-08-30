import { formatTime } from '@vplayer/core'
import { type FC } from 'react'

import { usePlayerState, usePlayerContext, usePlayerRemote } from '../context'

export const AutoResumeOverlay: FC = () => {
  const resumeState = usePlayerState('resumeState')
  const { labels } = usePlayerContext()
  const remote = usePlayerRemote()

  if (resumeState.status !== 'prompt') return null

  return (
    <div className="vplayer__auto-resume-overlay">
      <div className="vplayer__auto-resume-content">
        <p className="vplayer__auto-resume-text">
          {labels.continuePlay}{' '}
          <span className="font-medium text-white tabular-nums">{formatTime(resumeState.progress.time)}</span>?
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
