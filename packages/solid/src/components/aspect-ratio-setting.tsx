import type { PluginAPI, AspectRatioState } from '@vplayer/core'

import { usePlayerState } from '../context'

const ASPECT_RATIO_OPTIONS: { value: AspectRatioState; labelKey: string }[] = [
  { value: 'default', labelKey: 'aspectRatioDefault' },
  { value: '16:9', labelKey: 'aspectRatio16' },
  { value: '4:3', labelKey: 'aspectRatio4' },
  { value: 'fill', labelKey: 'aspectRatioFill' },
]

/**
 * Settings panel item for video aspect ratio.
 *
 * Renders four radio-style options (Default / 16:9 / 4:3 / Fill)
 * and calls `api.remote.setAspectRatio()` on change.
 *
 * Designed to be registered via `api.addSetting()` from a plugin.
 */
export function AspectRatioSetting(props: { api: PluginAPI }) {
  const aspectRatio = usePlayerState('aspectRatio')

  return (
    <div class="vplayer__aspect-ratio-setting">
      {ASPECT_RATIO_OPTIONS.map((option) => (
        <button
          type="button"
          class={`vplayer__aspect-ratio-option${aspectRatio() === option.value ? ' vplayer__aspect-ratio-option--active' : ''}`}
          onClick={() => props.api.remote.setAspectRatio(option.value)}
        >
          {aspectRatio() === option.value ? '✓ ' : ''}
          {props.api.i18n.t(option.labelKey)}
        </button>
      ))}
    </div>
  )
}
