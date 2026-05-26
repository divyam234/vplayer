import type { FC } from 'react'
import clsx from 'clsx'
import { Button } from 'react-aria-components'
import { useMediaRemote, useMediaState, usePlayerContext } from './context'

export const TopGradient: FC = () => {
  const controlsVisible = useMediaState('controlsVisible')
  return <div className={clsx('vplayer__top-gradient', !controlsVisible && 'vplayer__top-gradient--hidden')} />
}

export const PauseOverlay: FC = () => {
  const isPlaying = useMediaState('isPlaying')
  const isEnded = useMediaState('isEnded')
  const controlsVisible = useMediaState('controlsVisible')
  const { icons } = usePlayerContext()
  const PlayIcon = icons.play
  const show = !isPlaying && !isEnded && controlsVisible
  return (
    <div className={clsx('vplayer__overlay', !show && 'vplayer__overlay--hidden')}>
      <div className="vplayer__pause-orb"><PlayIcon className="vplayer__pause-icon" fill="currentColor" /></div>
    </div>
  )
}

export const BufferingOverlay: FC = () => {
  const isBuffering = useMediaState('isBuffering')
  const { icons } = usePlayerContext()
  const SpinnerIcon = icons.spinner
  return (
    <div className={clsx('vplayer__overlay', !isBuffering && 'vplayer__overlay--hidden')}>
      <SpinnerIcon className="vplayer__spinner" />
    </div>
  )
}

export const EndOverlay: FC = () => {
  const isEnded = useMediaState('isEnded')
  const { labels, icons } = usePlayerContext()
  const remote = useMediaRemote()
  const ReplayIcon = icons.replay
  if (!isEnded) return null
  return (
    <div className="vplayer__overlay vplayer__overlay--ended">
      <p className="vplayer__ended-title">{labels.endedTitle}</p>
      <Button onPress={remote.togglePlay} className="vplayer__ended-button">
        <ReplayIcon size={16} />
        {labels.replay}
      </Button>
    </div>
  )
}
