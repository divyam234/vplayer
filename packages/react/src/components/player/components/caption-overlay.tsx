import { getActiveCue } from '@vplayer/core'
import type { CSSProperties, FC } from 'react'

import { usePlayerState } from '../context'

const FONT_SIZE: Record<'small' | 'medium' | 'large', string> = {
  small: 'clamp(0.75rem, 1.7vw, 1rem)',
  medium: 'clamp(0.95rem, 2.2vw, 1.35rem)',
  large: 'clamp(1.2rem, 2.8vw, 1.75rem)',
}

const FONT_FAMILY: Record<'sans' | 'serif' | 'monospace', string> = {
  sans: 'ui-sans-serif, system-ui, sans-serif',
  serif: 'Georgia, Cambria, serif',
  monospace: 'ui-monospace, SFMono-Regular, monospace',
}

function scaledFontSize(size: keyof typeof FONT_SIZE, scale: number): string {
  const multiplier = scale / 100
  if (size === 'small') return `clamp(${0.75 * multiplier}rem, ${1.7 * multiplier}vw, ${multiplier}rem)`
  if (size === 'large') return `clamp(${1.2 * multiplier}rem, ${2.8 * multiplier}vw, ${1.75 * multiplier}rem)`
  return `clamp(${0.95 * multiplier}rem, ${2.2 * multiplier}vw, ${1.35 * multiplier}rem)`
}

export const CaptionOverlay: FC = () => {
  const cues = usePlayerState('subtitleCues')
  const currentTime = usePlayerState('currentTime')
  const settings = usePlayerState('captionSettings')
  const activeCue = getActiveCue(cues, currentTime - settings.delay)

  if (!activeCue) return null

  const edge =
    settings.edgeStyle === 'outline'
      ? `-1px -1px 0 ${settings.edgeColor}, 1px -1px 0 ${settings.edgeColor}, -1px 1px 0 ${settings.edgeColor}, 1px 1px 0 ${settings.edgeColor}`
      : settings.edgeStyle === 'shadow'
        ? `0 2px 3px ${settings.edgeColor}`
        : 'none'
  const style = {
    '--vplayer-caption-size': scaledFontSize(settings.fontSize, settings.fontScale),
    '--vplayer-caption-font': FONT_FAMILY[settings.fontFamily],
    '--vplayer-caption-color': `color-mix(in srgb, ${settings.textColor} ${Math.round(settings.textOpacity * 100)}%, transparent)`,
    '--vplayer-caption-background': `color-mix(in srgb, ${settings.backgroundColor} ${Math.round(settings.backgroundOpacity * 100)}%, transparent)`,
    '--vplayer-caption-position': `calc(5rem + ${settings.position}vh)`,
    '--vplayer-caption-line-height': settings.lineHeight,
    '--vplayer-caption-edge': edge,
  } as CSSProperties

  return (
    <div className="vplayer__captions" style={style} aria-hidden="true">
      <span className="vplayer__caption-cue">{activeCue.text}</span>
    </div>
  )
}
