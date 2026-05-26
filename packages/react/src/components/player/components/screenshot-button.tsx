import { Tooltip } from '@ark-ui/react/tooltip'
import { Icon } from '@iconify/react'
import { type FC } from 'react'

import { usePlayerContext } from '../context'

/**
 * Screenshot button. Delegates capture to the core's remote.takeScreenshot()
 * instead of duplicating the canvas logic.
 */
export const ScreenshotButton: FC = () => {
  const { labels, icons, mediaRemote } = usePlayerContext()

  return (
    <Tooltip.Root openDelay={400} closeDelay={150}>
      <Tooltip.Trigger
        onClick={() => mediaRemote.takeScreenshot()}
        aria-label={labels.screenshot}
        className="vplayer__button"
      >
        <Icon icon={icons.screenshot} width={16} />
      </Tooltip.Trigger>
      <Tooltip.Positioner>
        <Tooltip.Content className="vplayer__tooltip">
          <Tooltip.Arrow>
            <Tooltip.ArrowTip />
          </Tooltip.Arrow>
          {labels.screenshot}
        </Tooltip.Content>
      </Tooltip.Positioner>
    </Tooltip.Root>
  )
}
