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
    <div className="vplayer__error-overlay absolute inset-0 z-30 flex items-center justify-center bg-black/60">
      <div className="vplayer__error-overlay-content flex flex-col items-center gap-3 px-6 text-center">
        <p className="vplayer__error-overlay-message text-sm font-medium text-white/90">{labels.error}</p>
        <p className="vplayer__error-overlay-detail max-w-xs text-xs text-white/60">{error.message}</p>
        <button
          onClick={handleRetry}
          className="vplayer__error-overlay-retry mt-2 rounded-full px-5 py-1.5 text-sm text-white transition-colors hover:bg-white/20"
          style={{
            background: 'color-mix(in srgb, white 12%, transparent)',
            border: '1px solid color-mix(in srgb, white 14%, transparent)',
          }}
        >
          {labels.retry}
        </button>
      </div>
    </div>
  )
}
