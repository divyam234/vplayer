import { clsx } from 'clsx'
import { useEffect, useRef, type FC, type ReactNode } from 'react'

import { ScreenshotButton } from '../components/screenshot-button'
import { usePlayerState, usePlayerContext } from '../context'
import {
  FullscreenButton,
  MiniPlayerButton,
  PiPButton,
  PlayButton,
  SeekBar,
  SettingsTrigger,
  SkipButton,
  TimeDisplay,
  VolumeControl,
} from '../controls'
import { Icon } from '../icon'
import {
  NotificationOverlay,
  PluginControlsCenter,
  PluginControlsLeft,
  PluginControlsRight,
  PluginControlsTop,
  PluginLayers,
} from '../plugin-renderer'

function releaseControls(releaseRef: { current: (() => void) | null }) {
  releaseRef.current?.()
  releaseRef.current = null
}

export const ControlsBar: FC<{ children?: ReactNode }> = ({ children }) => {
  const controlsVisible = usePlayerState('controlsVisible')
  const { controlsVisibility } = usePlayerContext()
  const hoverReleaseRef = useRef<(() => void) | null>(null)
  const focusReleaseRef = useRef<(() => void) | null>(null)

  const pin = (releaseRef: typeof hoverReleaseRef) => {
    releaseRef.current ??= controlsVisibility.pinControls()
  }

  useEffect(
    () => () => {
      releaseControls(hoverReleaseRef)
      releaseControls(focusReleaseRef)
    },
    [],
  )

  return (
    <div
      className={clsx('vplayer__controls', !controlsVisible && 'vplayer__controls--hidden')}
      onDoubleClick={(event) => event.stopPropagation()}
      onMouseEnter={() => pin(hoverReleaseRef)}
      onMouseLeave={() => releaseControls(hoverReleaseRef)}
      onFocus={() => pin(focusReleaseRef)}
      onBlur={(event) => {
        if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
          releaseControls(focusReleaseRef)
        }
      }}
    >
      <div className="vplayer__controls-backdrop" />
      <div className="vplayer__controls-content">{children}</div>
    </div>
  )
}

export const Spacer: FC = () => <div className="vplayer__spacer" />

export const MiniPlayerControls: FC = () => {
  const controlsVisible = usePlayerState('controlsVisible')
  const isPlaying = usePlayerState('isPlaying')
  const { labels, icons, slots, miniPlayer } = usePlayerContext()

  return (
    <>
      <PluginControlsTop />
      <div
        className={clsx('vplayer__mini-controls', !controlsVisible && isPlaying && 'vplayer__mini-controls--hidden')}
      >
        <div className="vplayer__mini-topbar">
          <span className="vplayer__mini-title">{labels.miniPlayer}</span>
          <button
            type="button"
            aria-label={labels.exitMiniPlayer}
            className="vplayer__mini-close"
            onClick={miniPlayer.exit}
          >
            <Icon icon={icons.close} width={16} />
          </button>
        </div>
        <div role="toolbar" aria-label="Mini player controls" className="vplayer__mini-center-controls">
          {slots.playButton ?? <PlayButton size={24} />}
        </div>
        <div className="vplayer__mini-bottom-controls">{slots.seekBar ?? <SeekBar />}</div>
      </div>
      <PluginLayers />
      <NotificationOverlay />
    </>
  )
}

export const PlayerControls: FC = () => {
  const { slots, miniPlayer } = usePlayerContext()

  if (miniPlayer.active) return <MiniPlayerControls />

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
          {slots.miniPlayerButton ?? <MiniPlayerButton />}
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
