import 'iconify-icon'
import clsx from 'clsx'
import { Show } from 'solid-js'

import { usePlayerRemote, usePlayerState, usePlayerContext } from '../context'

export function TopGradient() {
  const controlsVisible = usePlayerState('controlsVisible')
  return <div class={clsx('vplayer__top-gradient', !controlsVisible() && 'vplayer__top-gradient--hidden')} />
}

export function PauseOverlay() {
  const isPlaying = usePlayerState('isPlaying')
  const isEnded = usePlayerState('isEnded')
  const controlsVisible = usePlayerState('controlsVisible')
  const { icons } = usePlayerContext()
  const show = () => !isPlaying() && !isEnded() && controlsVisible()
  return (
    <div class={clsx('vplayer__overlay', !show() && 'vplayer__overlay--hidden')}>
      <div class="vplayer__pause-orb">
        <iconify-icon icon={icons.play} class="vplayer__pause-icon" width="20"></iconify-icon>
      </div>
    </div>
  )
}

export function BufferingOverlay() {
  const isBuffering = usePlayerState('isBuffering')
  const { icons } = usePlayerContext()
  return (
    <div class={clsx('vplayer__overlay', !isBuffering() && 'vplayer__overlay--hidden')}>
      <iconify-icon icon={icons.spinner} class="vplayer__spinner" width="24"></iconify-icon>
    </div>
  )
}

export function EndOverlay() {
  const isEnded = usePlayerState('isEnded')
  const { labels, icons } = usePlayerContext()
  const remote = usePlayerRemote()
  return (
    <Show when={isEnded()}>
      <div class="vplayer__overlay vplayer__overlay--ended">
        <p class="vplayer__ended-title">{labels.endedTitle}</p>
        <button onClick={() => remote.togglePlay()} class="vplayer__ended-button">
          <iconify-icon icon={icons.replay} width="16"></iconify-icon>
          {labels.replay}
        </button>
      </div>
    </Show>
  )
}
