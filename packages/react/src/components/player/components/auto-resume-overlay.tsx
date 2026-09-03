import { formatTime } from '@vplayer/core'
import { useEffect, type FC } from 'react'

import { usePlayerState, usePlayerContext, usePlayerRemote } from '../context'

export interface AutoResumeOverlayProps {
  /** Milliseconds before dismissing the prompt. Use 0 to keep it visible. */
  timeout?: number
}

export const AutoResumeOverlay: FC<AutoResumeOverlayProps> = ({ timeout = 5000 }) => {
  const resumeState = usePlayerState('resumeState')
  const { labels } = usePlayerContext()
  const remote = usePlayerRemote()

  useEffect(() => {
    if (resumeState.status !== 'prompt' || timeout <= 0) return
    const timer = window.setTimeout(remote.dismissSavedProgress, timeout)
    return () => window.clearTimeout(timer)
  }, [remote, resumeState, timeout])

  if (resumeState.status !== 'prompt') return null

  return (
    <div className="vplayer__auto-resume-overlay" role="status">
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
          <button onClick={remote.dismissSavedProgress} className="vplayer__auto-resume-btn">
            {labels.dismiss}
          </button>
        </div>
      </div>
    </div>
  )
}
