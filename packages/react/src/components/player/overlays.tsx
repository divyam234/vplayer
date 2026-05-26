import type { FC } from 'react'
import clsx from 'clsx'
import { Icon } from '@iconify/react'
import { Button } from 'react-aria-components'
import { usePlayerRemote, usePlayerState, usePlayerContext } from './context'

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
      <div className="vplayer__pause-orb"><Icon icon={icons.play} className="vplayer__pause-icon" fill="currentColor" /></div>
    </div>
  )
}

export const BufferingOverlay: FC = () => {
  const isBuffering = usePlayerState('isBuffering')
  const { icons } = usePlayerContext()
  return (
    <div className={clsx('vplayer__overlay', !isBuffering && 'vplayer__overlay--hidden')}>
      <Icon icon={icons.spinner} className="vplayer__spinner" />
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
      <Button onPress={remote.togglePlay} className="vplayer__ended-button">
        <Icon icon={icons.replay} width={16} />
        {labels.replay}
      </Button>
    </div>
  )
}
