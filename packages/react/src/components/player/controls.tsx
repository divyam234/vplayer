import { useCallback, useEffect, useState, type FC, type PointerEvent, type ReactNode } from 'react'
import clsx from 'clsx'
import { Icon } from '@iconify/react'
import { useHover } from '@react-aria/interactions'
import {
  Button,
  Menu,
  MenuItem,
  MenuTrigger,
  OverlayArrow,
  Popover,
  Slider,
  SliderThumb,
  SliderTrack,
  ToggleButton,
  Tooltip,
  TooltipTrigger,
} from 'react-aria-components'
import { usePlayerRemote, usePlayerState, usePlayerContext } from './context'
import { getThumbnailAtTime, formatTime } from '@vplayer/core'

interface IconButtonProps {
  label: string
  tooltip: string
  children: ReactNode
  onPress?: () => void
}

function IconButton({ label, tooltip, children, onPress }: IconButtonProps) {
  return (
    <TooltipTrigger delay={800}>
      <Button onPress={onPress} aria-label={label} className="vplayer__button">
        {children}
      </Button>
      <Tooltip offset={2} className="vplayer__tooltip">
        <OverlayArrow>
          <svg width={8} height={8} viewBox="0 0 8 8" className="vplayer__tooltip-arrow" strokeWidth="1">
            <path d="M0 0 L4 4 L8 0" />
          </svg>
        </OverlayArrow>
        {tooltip}
      </Tooltip>
    </TooltipTrigger>
  )
}

interface IconToggleProps {
  label: string
  tooltip: string
  selected: boolean
  onChange: () => void
  children: ReactNode
}

function IconToggle({ label, tooltip, selected, onChange, children }: IconToggleProps) {
  return (
    <TooltipTrigger delay={800}>
      <ToggleButton isSelected={selected} onChange={onChange} aria-label={label} className="vplayer__button">
        {children}
      </ToggleButton>
      <Tooltip offset={2} className="vplayer__tooltip">
        <OverlayArrow>
          <svg width={8} height={8} viewBox="0 0 8 8" className="vplayer__tooltip-arrow" strokeWidth="1">
            <path d="M0 0 L4 4 L8 0" />
          </svg>
        </OverlayArrow>
        {tooltip}
      </Tooltip>
    </TooltipTrigger>
  )
}

export const SeekBar: FC = () => {
  const currentTime = usePlayerState('currentTime')
  const duration = usePlayerState('duration')
  const bufferedPercent = usePlayerState('bufferedPercent')
  const thumbnailCues = usePlayerState('thumbnailCues')
  const remote = usePlayerRemote()
  const [hoverPercent, setHoverPercent] = useState<number | null>(null)
  const [overrideValue, setOverrideValue] = useState<number | null>(null)

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const displayValue = overrideValue ?? progress
  const hoverTime = hoverPercent !== null ? hoverPercent * duration : null
  const thumbnailCue = hoverTime !== null ? getThumbnailAtTime(thumbnailCues, hoverTime) : null

  useEffect(() => {
    if (overrideValue !== null && Math.abs(progress - overrideValue) <= 0.5) {
      setOverrideValue(null)
    }
  }, [progress, overrideValue])

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setHoverPercent(pct)
  }, [])

  const { hoverProps } = useHover({
    onHoverEnd: () => setHoverPercent(null),
  })

  return (
    <div className="vplayer__seek" {...hoverProps}>
      {hoverPercent !== null && thumbnailCue && (
        <div className="vplayer__seek-preview" style={{ left: `${hoverPercent * 100}%` }}>
          <div className="vplayer__seek-preview-inner">
            <div className="vplayer__seek-preview-image">
              <div
                className="vplayer__seek-preview-image"
                style={{
                  width: thumbnailCue.w,
                  height: thumbnailCue.h,
                  maxWidth: 240,
                  maxHeight: 135,
                  backgroundImage: `url(${thumbnailCue.src})`,
                  backgroundPosition: `-${thumbnailCue.x}px -${thumbnailCue.y}px`,
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: 'auto',
                }}
              />
            </div>
            <span className="vplayer__seek-preview-time">{formatTime(hoverTime ?? 0)}</span>
            <div className="vplayer__seek-preview-arrow" />
          </div>
        </div>
      )}

      <Slider
        value={displayValue}
        onChange={(v) => setOverrideValue(v)}
        onChangeEnd={(v) => remote.seek((v / 100) * duration)}
        minValue={0}
        maxValue={100}
        step={0.01}
        aria-label="Seek"
        className="vplayer__seek-slider"
        onPointerMove={handlePointerMove}
      >
        <SliderTrack className="vplayer__seek-track">
          {({ state }) => (
            <>
              <div className="vplayer__seek-buffered" style={{ width: `${bufferedPercent}%` }} />
              <div className="vplayer__seek-progress" style={{ width: `${state.getThumbPercent(0) * 100}%` }} />
              <SliderThumb className="vplayer__seek-thumb" />
            </>
          )}
        </SliderTrack>
      </Slider>

      {hoverPercent !== null && !thumbnailCue && (
        <div className="vplayer__seek-tooltip" style={{ left: `${hoverPercent * 100}%`, pointerEvents: 'none' }}>
          {formatTime(hoverTime ?? 0)}
        </div>
      )}
    </div>
  )
}

export const PlayButton: FC<{ size?: number }> = ({ size = 20 }) => {
  const isPlaying = usePlayerState('isPlaying')
  const isEnded = usePlayerState('isEnded')
  const { labels, icons } = usePlayerContext()
  const remote = usePlayerRemote()

  return (
    <IconToggle
      selected={isPlaying}
      onChange={remote.togglePlay}
      label={isPlaying ? labels.pause : labels.play}
      tooltip={isPlaying ? `${labels.pause} (k)` : `${labels.play} (k)`}
    >
      {isEnded
        ? <Icon icon={icons.replay} width={size} />
        : <Icon icon={isPlaying ? icons.pause : icons.play} width={size} fill="currentColor" />
      }
    </IconToggle>
  )
}

export const SkipButton: FC<{ seconds: number }> = ({ seconds }) => {
  const { icons } = usePlayerContext()
  const remote = usePlayerRemote()
  const forward = seconds > 0
  const label = forward ? `Skip forward ${seconds}s` : `Skip back ${Math.abs(seconds)}s`
  return (
    <IconButton label={label} tooltip={label} onPress={() => remote.skip(seconds)}>
      <Icon icon={forward ? icons.skipForward : icons.skipBack} width={18} />
    </IconButton>
  )
}

export const TimeDisplay: FC = () => {
  const currentTime = usePlayerState('currentTime')
  const duration = usePlayerState('duration')
  return <span className="vplayer__time">{formatTime(currentTime)} / {formatTime(duration)}</span>
}

export const VolumeControl: FC = () => {
  const volume = usePlayerState('volume')
  const isMuted = usePlayerState('isMuted')
  const { labels, icons } = usePlayerContext()
  const remote = usePlayerRemote()
  const { hoverProps, isHovered } = useHover({})

  return (
    <div className="vplayer__volume" {...hoverProps}>
      <IconToggle
        selected={!isMuted}
        onChange={remote.toggleMute}
        label={isMuted ? labels.unmute : labels.mute}
        tooltip={isMuted ? `${labels.unmute} (m)` : `${labels.mute} (m)`}
      >
        <Icon icon={isMuted || volume === 0 ? icons.volumeOff : volume < 0.5 ? icons.volumeLow : icons.volumeHigh} width={16} />
      </IconToggle>
      <div className={clsx('vplayer__volume-slider', isHovered && 'vplayer__volume-slider--visible')}>
        <Slider value={isMuted ? 0 : volume * 100} onChange={(v) => remote.setVolume(v / 100)} minValue={0} maxValue={100} step={1} aria-label="Volume" className="vplayer__volume-slider-track">
          <SliderTrack className="vplayer__seek-track">
            {({ state }) => (
              <>
                <div className="vplayer__volume-fill" style={{ width: `${state.getThumbPercent(0) * 100}%` }} />
                <SliderThumb className="vplayer__volume-thumb" />
              </>
            )}
          </SliderTrack>
        </Slider>
      </div>
    </div>
  )
}

export const SettingsTrigger: FC = () => {
  const { labels, icons } = usePlayerContext()
  const remote = usePlayerRemote()
  const playbackRate = usePlayerState('playbackRate')
  const qualities = usePlayerState('qualities')
  const activeQuality = usePlayerState('activeQuality')
  const subtitleTracks = usePlayerState('subtitleTracks')
  const activeSubtitle = usePlayerState('activeSubtitle')
  const flip = usePlayerState('flip')
  const aspectRatio = usePlayerState('aspectRatio')
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState<'main' | 'speed' | 'quality' | 'subtitles' | 'flip' | 'aspectRatio'>('main')
  const speeds = [0.5, 1, 1.25, 1.5, 2]

  return (
    <MenuTrigger isOpen={isOpen} onOpenChange={(open) => { setIsOpen(open); if (open) setView('main') }}>
      <IconButton label={labels.settings} tooltip={labels.settings}><Icon icon={icons.settings} width={18} /></IconButton>
      <Popover placement="top end" className="vplayer__menu-popover">
        <Menu key={view} className="vplayer__menu" shouldCloseOnSelect={false}>
          {view === 'main' ? (
            <>
              <MenuItem onAction={() => setView('speed')} className="vplayer__menu-item"><span className="vplayer__menu-label">{labels.speed}</span><span className="vplayer__menu-value">{playbackRate}x</span></MenuItem>
              {qualities.length > 0 && <MenuItem onAction={() => setView('quality')} className="vplayer__menu-item"><span className="vplayer__menu-label">{labels.quality}</span><span className="vplayer__menu-value">{activeQuality}</span></MenuItem>}
              {subtitleTracks.length > 0 && <MenuItem onAction={() => setView('subtitles')} className="vplayer__menu-item"><span className="vplayer__menu-label">{labels.subtitles}</span><span className="vplayer__menu-value vplayer__menu-value--truncate">{activeSubtitle?.label ?? labels.off}</span></MenuItem>}
              <MenuItem onAction={() => setView('flip')} className="vplayer__menu-item"><Icon icon={icons.flip} width={14} className="vplayer__menu-icon" /><span className="vplayer__menu-label">{labels.flip}</span><span className="vplayer__menu-value">{labels.flipNormal}</span></MenuItem>
              <MenuItem onAction={() => setView('aspectRatio')} className="vplayer__menu-item"><Icon icon={icons.aspectRatio} width={14} className="vplayer__menu-icon" /><span className="vplayer__menu-label">{labels.aspectRatio}</span><span className="vplayer__menu-value">{labels.aspectRatioDefault}</span></MenuItem>
            </>
          ) : view === 'speed' ? (
            <>
              <MenuItem onAction={() => setView('main')} className="vplayer__menu-item"><Icon icon={icons.chevronLeft} width={14} className="vplayer__menu-icon" /><span className="vplayer__menu-label">{labels.speed}</span></MenuItem>
              {speeds.map((speed) => <MenuItem key={String(speed)} onAction={() => { remote.setPlaybackRate(Number(speed)); setIsOpen(false) }} className="vplayer__menu-item"><span className={playbackRate === speed ? 'vplayer__menu-value--active' : 'vplayer__menu-value--inactive'}>{speed}x</span>{playbackRate === speed && <Icon icon={icons.check} width={14} className="vplayer__menu-check" />}</MenuItem>)}
            </>
          ) : view === 'quality' ? (
            <>
              <MenuItem onAction={() => setView('main')} className="vplayer__menu-item"><Icon icon={icons.chevronLeft} width={14} className="vplayer__menu-icon" /><span className="vplayer__menu-label">{labels.quality}</span></MenuItem>
              {qualities.map((q) => <MenuItem key={q} onAction={() => { remote.setActiveQuality(q); setIsOpen(false) }} className="vplayer__menu-item"><span className={activeQuality === q ? 'vplayer__menu-value--active' : 'vplayer__menu-value--inactive'}>{q}</span>{activeQuality === q && <Icon icon={icons.check} width={14} className="vplayer__menu-check" />}</MenuItem>)}
            </>
          ) : view === 'flip' ? (
            <>
              <MenuItem onAction={() => setView('main')} className="vplayer__menu-item"><Icon icon={icons.chevronLeft} width={14} className="vplayer__menu-icon" /><span className="vplayer__menu-label">{labels.flip}</span></MenuItem>
              {(['normal', 'horizontal', 'vertical'] as const).map((val) => (
                <MenuItem key={val} onAction={() => { remote.setFlip(val); setIsOpen(false) }} className="vplayer__menu-item">
                  <span className={flip === val ? 'vplayer__menu-value--active' : 'vplayer__menu-value--inactive'}>
                    {val === 'normal' ? labels.flipNormal : val === 'horizontal' ? labels.flipHorizontal : labels.flipVertical}
                  </span>
                  {flip === val && <Icon icon={icons.check} width={14} className="vplayer__menu-check" />}
                </MenuItem>
              ))}
            </>
          ) : view === 'aspectRatio' ? (
            <>
              <MenuItem onAction={() => setView('main')} className="vplayer__menu-item"><Icon icon={icons.chevronLeft} width={14} className="vplayer__menu-icon" /><span className="vplayer__menu-label">{labels.aspectRatio}</span></MenuItem>
              {(['default', '16:9', '4:3', 'fill'] as const).map((val) => (
                <MenuItem key={val} onAction={() => { remote.setAspectRatio(val); setIsOpen(false) }} className="vplayer__menu-item">
                  <span className={aspectRatio === val ? 'vplayer__menu-value--active' : 'vplayer__menu-value--inactive'}>
                    {val === 'default' ? labels.aspectRatioDefault : val === '16:9' ? labels.aspectRatio16 : val === '4:3' ? labels.aspectRatio4 : labels.aspectRatioFill}
                  </span>
                  {aspectRatio === val && <Icon icon={icons.check} width={14} className="vplayer__menu-check" />}
                </MenuItem>
              ))}
            </>
          ) : (
            <>
              <MenuItem onAction={() => setView('main')} className="vplayer__menu-item"><Icon icon={icons.chevronLeft} width={14} className="vplayer__menu-icon" /><span className="vplayer__menu-label">{labels.subtitles}</span></MenuItem>
              <MenuItem onAction={() => { remote.setActiveSubtitle(null); setIsOpen(false) }} className="vplayer__menu-item"><span className={!activeSubtitle ? 'vplayer__menu-value--active' : 'vplayer__menu-value--inactive'}>{labels.off}</span>{!activeSubtitle && <Icon icon={icons.check} width={14} className="vplayer__menu-check" />}</MenuItem>
              {subtitleTracks.map((track) => <MenuItem key={track.lang} onAction={() => { remote.setActiveSubtitle(subtitleTracks.find((t) => t.lang === track.lang) ?? null); setIsOpen(false) }} className="vplayer__menu-item"><span className={activeSubtitle?.lang === track.lang ? 'vplayer__menu-value--active' : 'vplayer__menu-value--inactive'}>{track.label}</span>{activeSubtitle?.lang === track.lang && <Icon icon={icons.check} width={14} className="vplayer__menu-check" />}</MenuItem>)}
            </>
          )}
        </Menu>
      </Popover>
    </MenuTrigger>
  )
}

export const PiPButton: FC = () => {
  const { labels, icons } = usePlayerContext()
  const remote = usePlayerRemote()
  const active = typeof document !== 'undefined' && !!document.pictureInPictureElement
  return <IconToggle selected={active} onChange={remote.togglePiP} label={active ? labels.pipExit : labels.pip} tooltip={active ? labels.pipExit : labels.pip}><Icon icon={icons.pip} width={16} /></IconToggle>
}

export const FullscreenButton: FC = () => {
  const isFullscreen = usePlayerState('isFullscreen')
  const { labels, icons } = usePlayerContext()
  const remote = usePlayerRemote()
  return <IconToggle selected={isFullscreen} onChange={remote.toggleFullscreen} label={isFullscreen ? labels.fullscreenExit : labels.fullscreen} tooltip={isFullscreen ? `${labels.fullscreenExit} (f)` : `${labels.fullscreen} (f)`}><Icon icon={isFullscreen ? icons.fullscreenExit : icons.fullscreen} width={18} /></IconToggle>
}
