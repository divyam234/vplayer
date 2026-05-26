import clsx from 'clsx'
import type { FC, ReactNode } from 'react'

import { ScreenshotButton } from '../components/screenshot-button'
import { usePlayerState, usePlayerContext } from '../context'
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
} from '../plugin-renderer'

export const ControlsBar: FC<{ children?: ReactNode }> = ({ children }) => {
  const controlsVisible = usePlayerState('controlsVisible')
  return (
    <div className={clsx('vplayer__controls', !controlsVisible && 'vplayer__controls--hidden')}>
      <div className="vplayer__controls-backdrop" />
      <div className="vplayer__controls-content">{children}</div>
    </div>
  )
}

export const Spacer: FC = () => <div className="vplayer__spacer" />

export const PlayerChrome: FC = () => {
  const { slots } = usePlayerContext()
  return (
    <>
      {/* Top-zone plugin controls (e.g. progress bar additions) */}
      <PluginControlsTop />

      <ControlsBar>
        {slots.seekBar ?? <SeekBar />}
        <div role="toolbar" aria-label="Playback controls" className="vplayer__controls-row">
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
