import type { FC, ReactNode } from 'react'
import clsx from 'clsx'
import { Toolbar } from 'react-aria-components'
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
import { useMediaState, usePlayerContext } from '../context'

export const ControlsBar: FC<{ children?: ReactNode }> = ({ children }) => {
  const controlsVisible = useMediaState('controlsVisible')
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
    <ControlsBar>
      {slots.seekBar ?? <SeekBar />}
      <Toolbar aria-label="Playback controls" className="vplayer__controls-row">
        {slots.playButton ?? <PlayButton />}
        <SkipButton seconds={-10} />
        <SkipButton seconds={10} />
        {slots.volumeControl ?? <VolumeControl />}
        <Spacer />
        {slots.timeDisplay ?? <TimeDisplay />}
        {slots.settingsButton ?? <SettingsTrigger />}
        {slots.pipButton ?? <PiPButton />}
        {slots.fullscreenButton ?? <FullscreenButton />}
      </Toolbar>
    </ControlsBar>
  )
}
