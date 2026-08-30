import { clsx } from 'clsx'
import type { FC } from 'react'

import { usePlayerState } from '../context'

export const MiniProgressBar: FC = () => {
  const controlsVisible = usePlayerState('controlsVisible')
  const currentTime = usePlayerState('currentTime')
  const duration = usePlayerState('duration')
  const bufferedPercent = usePlayerState('bufferedPercent')

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className={clsx('vplayer__mini-progress', controlsVisible ? 'opacity-0' : 'opacity-100')} aria-hidden="true">
      <div className="vplayer__mini-progress-buffered" style={{ width: `${bufferedPercent}%` }} />
      <div className="vplayer__mini-progress-played" style={{ width: `${progress}%` }} />
    </div>
  )
}
