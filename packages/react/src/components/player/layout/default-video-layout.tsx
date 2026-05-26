import type { FC } from 'react'
import { usePlayerContext } from '../context'
import { BufferingOverlay, EndOverlay, PauseOverlay } from '../overlays'
import { PlayerChrome } from './player-chrome'

export const DefaultVideoLayout: FC = () => {
  const { slots } = usePlayerContext()
  return (
    <>
      <PlayerChrome />
      {slots.pauseOverlay ?? <PauseOverlay />}
      {slots.bufferingOverlay ?? <BufferingOverlay />}
      {slots.endOverlay ?? <EndOverlay />}
    </>
  )
}
