import { clsx } from 'clsx'
import type { FC } from 'react'

import { usePlayerRemote, usePlayerState, usePlayerContext } from './context'
import { Icon } from './icon'

export const TopGradient: FC = () => {
  const controlsVisible = usePlayerState('controlsVisible')
  return <div className={clsx('vplayer__top-gradient', !controlsVisible && 'vplayer__top-gradient--hidden')} />
}

export const PauseOverlay: FC = () => {
  const isPlaying = usePlayerState('isPlaying')
  const isEnded = usePlayerState('isEnded')
  const controlsVisible = usePlayerState('controlsVisible')
  const { icons } = usePlayerContext()
  const show = !isPlaying && !isEnded && controlsVisible
  return (
    <div className={clsx('vplayer__overlay', !show && 'vplayer__overlay--hidden')}>
      <div className="vplayer__pause-orb">
        <Icon icon={icons.play} className="vplayer__pause-icon" fill="currentColor" />
      </div>
    </div>
  )
}

export const BufferingOverlay: FC = () => {
  const isBuffering = usePlayerState('isBuffering')
  return (
    <div className={clsx('vplayer__overlay', !isBuffering && 'vplayer__overlay--hidden')}>
      <div className="vplayer__buffering-bars" role="status" aria-label="Loading video">
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}

export const EndOverlay: FC = () => {
  const isEnded = usePlayerState('isEnded')
  const { labels, icons } = usePlayerContext()
  const remote = usePlayerRemote()
  if (!isEnded) return null
  return (
    <div className="vplayer__overlay vplayer__overlay--ended">
      <p className="vplayer__ended-title">{labels.endedTitle}</p>
      <button onClick={remote.togglePlay} className="vplayer__ended-button">
        <Icon icon={icons.replay} width={16} />
        {labels.replay}
      </button>
    </div>
  )
}
