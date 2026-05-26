import { type FC } from 'react'
import { Button, OverlayArrow, Tooltip, TooltipTrigger } from 'react-aria-components'
import { usePlayerContext } from '../context'

/**
 * Screenshot button. Delegates capture to the core's remote.takeScreenshot()
 * instead of duplicating the canvas logic.
 */
export const ScreenshotButton: FC = () => {
  const { labels, icons, mediaRemote } = usePlayerContext()
  const ScreenshotIcon = icons.screenshot

  return (
    <TooltipTrigger delay={800}>
      <Button
        onPress={() => mediaRemote.takeScreenshot()}
        aria-label={labels.screenshot}
        className="vplayer__button"
      >
        <ScreenshotIcon size={16} />
      </Button>
      <Tooltip offset={2} className="vplayer__tooltip">
        <OverlayArrow>
          <svg width={8} height={8} viewBox="0 0 8 8" className="vplayer__tooltip-arrow" strokeWidth="1">
            <path d="M0 0 L4 4 L8 0" />
          </svg>
        </OverlayArrow>
        {labels.screenshot}
      </Tooltip>
    </TooltipTrigger>
  )
}
