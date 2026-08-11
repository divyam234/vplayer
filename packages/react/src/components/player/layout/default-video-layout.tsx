import type { FC } from 'react'

import { usePlayerContext } from '../context'
import { BufferingOverlay, EndOverlay, PauseOverlay } from '../overlays'
import { PlayerControls } from './player-controls'

export const DefaultVideoLayout: FC = () => {
  const { slots, miniPlayer } = usePlayerContext()
  const compactMini = miniPlayer.active

  return (
    <>
      <PlayerControls />
      {!compactMini && (slots.pauseOverlay ?? <PauseOverlay />)}
      {!compactMini && (slots.bufferingOverlay ?? <BufferingOverlay />)}
      {!compactMini && (slots.endOverlay ?? <EndOverlay />)}
    </>
  )
}
