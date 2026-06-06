import type { FC } from 'react'

import { usePlayerContext } from '../context'
import { BufferingOverlay, EndOverlay, PauseOverlay } from '../overlays'
import { PlayerChrome } from './player-chrome'

export const DefaultVideoLayout: FC = () => {
  const { slots, miniPlayer } = usePlayerContext()
  const compactMini = miniPlayer.active

  return (
    <>
      <PlayerChrome />
      {!compactMini && (slots.pauseOverlay ?? <PauseOverlay />)}
      {!compactMini && (slots.bufferingOverlay ?? <BufferingOverlay />)}
      {!compactMini && (slots.endOverlay ?? <EndOverlay />)}
    </>
  )
}
