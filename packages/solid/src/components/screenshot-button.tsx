import 'iconify-icon'
import { Tooltip } from '@ark-ui/solid/tooltip'

import { usePlayerContext } from '../context'

/**
 * Screenshot button. Delegates capture to the core's remote.takeScreenshot()
 * instead of duplicating the canvas logic.
 */
export function ScreenshotButton() {
  const { labels, icons, mediaRemote } = usePlayerContext()

  return (
    <Tooltip.Root openDelay={400} closeDelay={150}>
      <Tooltip.Trigger onClick={() => mediaRemote.takeScreenshot()} aria-label={labels.screenshot} class="vplayer__button">
        <iconify-icon icon={icons.screenshot} width="16"></iconify-icon>
      </Tooltip.Trigger>
      <Tooltip.Positioner>
        <Tooltip.Content class="vplayer__tooltip">
          <Tooltip.Arrow>
            <Tooltip.ArrowTip />
          </Tooltip.Arrow>
          {labels.screenshot}
        </Tooltip.Content>
      </Tooltip.Positioner>
    </Tooltip.Root>
  )
}
