import clsx from 'clsx'

import { usePlayerState } from '../context'

export function MiniProgressBar() {
  const controlsVisible = usePlayerState('controlsVisible')
  const currentTime = usePlayerState('currentTime')
  const duration = usePlayerState('duration')
  const bufferedPercent = usePlayerState('bufferedPercent')

  const progress = () => (duration() > 0 ? (currentTime() / duration()) * 100 : 0)

  return (
    <div
      class={clsx(
        'vplayer__mini-progress',
        controlsVisible() ? 'opacity-0' : 'opacity-100',
      )}
      aria-hidden="true"
    >
      <div
        class="vplayer__mini-progress-buffered"
        style={{ width: `${bufferedPercent()}%` }}
      />
      <div
        class="vplayer__mini-progress-played"
        style={{ width: `${progress()}%` }}
      />
    </div>
  )
}
