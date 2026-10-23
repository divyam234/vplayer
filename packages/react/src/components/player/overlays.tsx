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
  const loadStage = usePlayerState('loadStage')
  const { icons } = usePlayerContext()
  // While the file is being read the loading bars are what is shown; a play button on top of them
  // would sit on the text.
  const show = !isPlaying && !isEnded && controlsVisible && loadStage === null
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
  const loadStage = usePlayerState('loadStage')
  const { labels } = usePlayerContext()
  // Before playback starts, an engine that has work to do (reading the file's tracks, preparing the
  // audio) says what it is doing, so the wait is not a blank screen.
  const note =
    loadStage === 'tracks'
      ? labels.loadingTracks
      : loadStage === 'preparing'
        ? labels.preparingPlayback
        : loadStage === 'starting'
          ? labels.startingPlayback
          : null
  const show = isBuffering || loadStage !== null
  return (
    <div className={clsx('vplayer__overlay', !show && 'vplayer__overlay--hidden')}>
      <div className="vplayer__loading">
        <div className="vplayer__buffering-bars" role="status" aria-label={note ?? 'Loading video'}>
          <span />
          <span />
          <span />
        </div>
        {note && <p className="vplayer__loading-note">{note}</p>}
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
