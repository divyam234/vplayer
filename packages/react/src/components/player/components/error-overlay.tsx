import { useCallback, type FC } from 'react'

import { usePlayerState, usePlayerContext } from '../context'

export const ErrorOverlay: FC = () => {
  const error = usePlayerState('error')
  const { labels, videoRef } = usePlayerContext()

  const handleRetry = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.load()
  }, [videoRef])

  if (!error) return null

  return (
    <div className="vplayer__error-overlay">
      <div className="vplayer__error-overlay-content">
        <p className="vplayer__error-overlay-message">{labels.error}</p>
        <p className="vplayer__error-overlay-detail">{error.message}</p>
        <button onClick={handleRetry} className="vplayer__error-overlay-retry">
          {labels.retry}
        </button>
      </div>
    </div>
  )
}
