import clsx from 'clsx'
import { type JSX } from 'solid-js'

import { ScreenshotButton } from '../screenshot-button'
import { usePlayerState, usePlayerContext } from '../../context'
import {
  FullscreenButton,
  PiPButton,
  PlayButton,
  SeekBar,
  SettingsTrigger,
  SkipButton,
  TimeDisplay,
  VolumeControl,
} from '../controls'
import {
  NotificationOverlay,
  PluginControlsCenter,
  PluginControlsLeft,
  PluginControlsRight,
  PluginControlsTop,
  PluginLayers,
} from '../../plugin-renderer'

export function ControlsBar(props: { children?: JSX.Element }) {
  const controlsVisible = usePlayerState('controlsVisible')
  return (
    <div class={clsx('vplayer__controls', !controlsVisible() && 'vplayer__controls--hidden')}>
      <div class="vplayer__controls-backdrop" />
      <div class="vplayer__controls-content">{props.children}</div>
    </div>
  )
}

export function Spacer() {
  return <div class="vplayer__spacer" />
}

export function PlayerChrome() {
  const { slots } = usePlayerContext()
  return (
    <>
      {/* Top-zone plugin controls (e.g. progress bar additions) */}
      <PluginControlsTop />

      <ControlsBar>
        {slots.seekBar ?? <SeekBar />}
        <div role="toolbar" aria-label="Playback controls" class="vplayer__controls-row">
          {/* Plugin left controls before built-ins */}
          <PluginControlsCenter />
          {slots.playButton ?? <PlayButton />}
          <SkipButton seconds={-10} />
          <SkipButton seconds={10} />
          <PluginControlsLeft />
          {slots.volumeControl ?? <VolumeControl />}
          <Spacer />
          {slots.timeDisplay ?? <TimeDisplay />}
          <ScreenshotButton />
          {slots.settingsButton ?? <SettingsTrigger />}
          <PluginControlsRight />
          {slots.pipButton ?? <PiPButton />}
          {slots.fullscreenButton ?? <FullscreenButton />}
        </div>
      </ControlsBar>

      {/* Plugin layers (overlays, extra UI) */}
      <PluginLayers />
      {/* Notification overlay */}
      <NotificationOverlay />
    </>
  )
}
