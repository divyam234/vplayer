import { usePlayerContext } from '../../context'
import { BufferingOverlay, EndOverlay, PauseOverlay } from '../overlays'
import { PlayerChrome } from './player-chrome'

export function DefaultVideoLayout() {
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
