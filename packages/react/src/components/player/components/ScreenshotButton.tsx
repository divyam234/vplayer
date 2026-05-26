import { useCallback, type FC } from 'react'
import { Button, OverlayArrow, Tooltip, TooltipTrigger } from 'react-aria-components'
import { usePlayerContext } from '../context'

export const ScreenshotButton: FC = () => {
  const { labels, icons, videoRef } = usePlayerContext()
  const ScreenshotIcon = icons.screenshot

  const handleScreenshot = useCallback(() => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `screenshot-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }, [videoRef])

  return (
    <TooltipTrigger delay={800}>
      <Button
        onPress={handleScreenshot}
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
