import { type FC } from 'react'
import { useMediaState } from '../context'
import type { PluginAPI, FlipState } from '@vplayer/core'

const FLIP_OPTIONS: { value: FlipState; labelKey: string }[] = [
  { value: 'normal', labelKey: 'flipNormal' },
  { value: 'horizontal', labelKey: 'flipHorizontal' },
  { value: 'vertical', labelKey: 'flipVertical' },
]

/**
 * Settings panel item for video flip orientation.
 *
 * Renders three radio-style options (normal / horizontal / vertical)
 * and calls `api.remote.setFlip()` on change.
 *
 * Designed to be registered via `api.addSetting()` from a plugin.
 */
export const FlipSetting: FC<{ api: PluginAPI }> = ({ api }) => {
  const flip = useMediaState('flip')

  return (
    <div className="vplayer__flip-setting">
      {FLIP_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`vplayer__flip-option${flip === option.value ? ' vplayer__flip-option--active' : ''}`}
          onClick={() => api.remote.setFlip(option.value)}
        >
          {flip === option.value ? '✓ ' : ''}
          {api.i18n.t(option.labelKey)}
        </button>
      ))}
    </div>
  )
}
