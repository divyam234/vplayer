import type { PluginAPI, FlipState } from '@vplayer/core'

import { usePlayerState } from '../context'

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
export function FlipSetting(props: { api: PluginAPI }) {
  const flip = usePlayerState('flip')

  return (
    <div class="vplayer__flip-setting">
      {FLIP_OPTIONS.map((option) => (
        <button
          type="button"
          class={`vplayer__flip-option${flip() === option.value ? ' vplayer__flip-option--active' : ''}`}
          onClick={() => props.api.remote.setFlip(option.value)}
        >
          {flip() === option.value ? '✓ ' : ''}
          {props.api.i18n.t(option.labelKey)}
        </button>
      ))}
    </div>
  )
}
