import { Show } from 'solid-js'

import { usePlayerState, usePlayerContext } from '../context'

export function ErrorOverlay() {
  const error = usePlayerState('error')
  const { labels } = usePlayerContext()
  const videoRef = usePlayerContext().videoRef

  const handleRetry = () => {
    const video = videoRef.current
    if (!video) return
    video.load()
  }

  return (
    <Show when={error()}>
      <div class="vplayer__error-overlay">
        <div class="vplayer__error-overlay-content">
          <p class="vplayer__error-overlay-message">{labels.error}</p>
          <p class="vplayer__error-overlay-detail">{error()!.message}</p>
          <button
            onClick={handleRetry}
            class="vplayer__error-overlay-retry"
          >
            {labels.retry}
          </button>
        </div>
      </div>
    </Show>
  )
}
