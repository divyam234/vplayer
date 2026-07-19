import { Menu } from '@ark-ui/react/menu'
import { Slider } from '@ark-ui/react/slider'
import { Tooltip } from '@ark-ui/react/tooltip'
import { Icon } from '@iconify/react'
import { getThumbnailAtTime, formatTime } from '@vplayer/core'
import clsx from 'clsx'
import { useCallback, useEffect, useState, type CSSProperties, type FC, type PointerEvent, type ReactNode } from 'react'

import { useMiniPlayer, usePlayerRemote, usePlayerState, usePlayerContext } from './context'
import type { PlayerLabels } from './types'

interface IconButtonProps {
  label: string
  tooltip: string
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
}

function IconButton({ label, tooltip, children, onClick, disabled = false }: IconButtonProps) {
  return (
    <Tooltip.Root openDelay={400} closeDelay={150}>
      <Tooltip.Trigger
        type="button"
        onClick={disabled ? undefined : onClick}
        aria-label={label}
        aria-disabled={disabled}
        disabled={disabled}
        className="vplayer__button"
      >
        {children}
      </Tooltip.Trigger>
      <Tooltip.Positioner>
        <Tooltip.Content className="vplayer__tooltip">
          <Tooltip.Arrow>
            <Tooltip.ArrowTip />
          </Tooltip.Arrow>
          {tooltip}
        </Tooltip.Content>
      </Tooltip.Positioner>
    </Tooltip.Root>
  )
}

interface IconToggleProps {
  label: string
  tooltip: string
  selected: boolean
  onChange: () => void
  children: ReactNode
  disabled?: boolean
}

function IconToggle({ label, tooltip, selected, onChange, children, disabled = false }: IconToggleProps) {
  return (
    <Tooltip.Root openDelay={400} closeDelay={150}>
      <Tooltip.Trigger
        type="button"
        onClick={disabled ? undefined : onChange}
        aria-label={label}
        aria-pressed={selected}
        aria-disabled={disabled}
        disabled={disabled}
        className="vplayer__button"
      >
        {children}
      </Tooltip.Trigger>
      <Tooltip.Positioner>
        <Tooltip.Content className="vplayer__tooltip">
          <Tooltip.Arrow>
            <Tooltip.ArrowTip />
          </Tooltip.Arrow>
          {tooltip}
        </Tooltip.Content>
      </Tooltip.Positioner>
    </Tooltip.Root>
  )
}

export const SeekBar: FC = () => {
  const currentTime = usePlayerState('currentTime')
  const duration = usePlayerState('duration')
  const bufferedPercent = usePlayerState('bufferedPercent')
  const thumbnailCues = usePlayerState('thumbnailCues')
  const { containerRef, thumbnailPreview } = usePlayerContext()
  const remote = usePlayerRemote()
  const [hoverPercent, setHoverPercent] = useState<number | null>(null)
  const [previewPosition, setPreviewPosition] = useState(0)
  const [overrideValue, setOverrideValue] = useState<number | null>(null)

  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0
  const progress = safeDuration > 0 ? (currentTime / safeDuration) * 100 : 0
  const displayValue = overrideValue ?? progress
  const hoverTime = hoverPercent !== null && safeDuration > 0 ? hoverPercent * safeDuration : null
  const thumbnailCue =
    thumbnailPreview.enabled && hoverTime !== null ? getThumbnailAtTime(thumbnailCues, hoverTime) : null
  const thumbnailScale = thumbnailCue
    ? thumbnailPreview.fit === 'contain'
      ? Math.min(thumbnailPreview.width / thumbnailCue.w, thumbnailPreview.height / thumbnailCue.h)
      : Math.max(thumbnailPreview.width / thumbnailCue.w, thumbnailPreview.height / thumbnailCue.h)
    : 1
  const scaledThumbnailWidth = thumbnailCue ? thumbnailCue.w * thumbnailScale : 0
  const scaledThumbnailHeight = thumbnailCue ? thumbnailCue.h * thumbnailScale : 0

  useEffect(() => {
    if (overrideValue !== null && Math.abs(progress - overrideValue) <= 0.5) {
      setOverrideValue(null)
    }
  }, [progress, overrideValue])

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const pointerX = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
      const playerRect = containerRef.current?.getBoundingClientRect() ?? rect
      const previewHalfWidth = (thumbnailPreview.width + 6) / 2
      const minCenter = playerRect.left + previewHalfWidth
      const maxCenter = playerRect.right - previewHalfWidth
      const previewCenter =
        minCenter <= maxCenter
          ? Math.max(minCenter, Math.min(maxCenter, e.clientX))
          : playerRect.left + playerRect.width / 2
      setHoverPercent(rect.width > 0 ? pointerX / rect.width : 0)
      setPreviewPosition(previewCenter - rect.left)
    },
    [containerRef, thumbnailPreview.width],
  )

  return (
    <div className="vplayer__seek" onMouseLeave={() => setHoverPercent(null)}>
      {hoverPercent !== null && thumbnailCue && (
        <div
          className="vplayer__seek-preview"
          style={{ '--vplayer-seek-preview-position': `${previewPosition}px` } as CSSProperties}
        >
          <div className="vplayer__seek-preview-inner">
            <div
              className="vplayer__seek-preview-frame"
              style={{
                width: thumbnailPreview.width,
                height: thumbnailPreview.height,
              }}
            >
              <div
                className="vplayer__seek-preview-sprite"
                style={{
                  width: thumbnailCue.w,
                  height: thumbnailCue.h,
                  backgroundImage: `url(${thumbnailCue.src})`,
                  backgroundPosition: `-${thumbnailCue.x}px -${thumbnailCue.y}px`,
                  transform: `translate(${(thumbnailPreview.width - scaledThumbnailWidth) / 2}px, ${(thumbnailPreview.height - scaledThumbnailHeight) / 2}px) scale(${thumbnailScale})`,
                }}
              />
              {thumbnailPreview.showTime && (
                <span className="vplayer__seek-preview-time">{formatTime(hoverTime ?? 0)}</span>
              )}
            </div>
          </div>
        </div>
      )}

      <Slider.Root
        value={[displayValue]}
        onValueChange={(d) => setOverrideValue(d.value[0])}
        onValueChangeEnd={(d) => remote.seek(safeDuration ? (d.value[0] / 100) * safeDuration : currentTime)}
        min={0}
        max={100}
        step={0.01}
        className="vplayer__seek-slider"
      >
        <Slider.Control className="vplayer__seek-slider-control" onPointerMove={handlePointerMove}>
          <Slider.Track className="vplayer__seek-track">
            <div className="vplayer__seek-buffered" style={{ width: `${bufferedPercent}%` }} />
            <Slider.Range className="vplayer__seek-progress" />
          </Slider.Track>
          <Slider.Thumb index={0} className="vplayer__seek-thumb">
            <Slider.HiddenInput />
          </Slider.Thumb>
        </Slider.Control>
      </Slider.Root>

      {hoverPercent !== null && !thumbnailCue && (
        <div className="vplayer__seek-tooltip" style={{ left: `${hoverPercent * 100}%` }}>
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
      {isEnded ? (
        <Icon icon={icons.replay} width={size} />
      ) : (
        <Icon icon={isPlaying ? icons.pause : icons.play} width={size} fill="currentColor" />
      )}
    </IconToggle>
  )
}

export const SkipButton: FC<{ seconds: number }> = ({ seconds }) => {
  const { icons } = usePlayerContext()
  const remote = usePlayerRemote()
  const forward = seconds > 0
  const label = forward ? `Skip forward ${seconds}s` : `Skip back ${Math.abs(seconds)}s`
  return (
    <IconButton label={label} tooltip={label} onClick={() => remote.skip(seconds)}>
      <Icon icon={forward ? icons.skipForward : icons.skipBack} width={18} />
    </IconButton>
  )
}

export const TimeDisplay: FC = () => {
  const currentTime = usePlayerState('currentTime')
  const duration = usePlayerState('duration')
  return (
    <span className="vplayer__time">
      {formatTime(currentTime)} / {formatTime(duration)}
    </span>
  )
}

export const VolumeControl: FC = () => {
  const volume = usePlayerState('volume')
  const isMuted = usePlayerState('isMuted')
  const { labels, icons } = usePlayerContext()
  const remote = usePlayerRemote()
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div className="vplayer__volume" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <IconToggle
        selected={!isMuted}
        onChange={remote.toggleMute}
        label={isMuted ? labels.unmute : labels.mute}
        tooltip={isMuted ? `${labels.unmute} (m)` : `${labels.mute} (m)`}
      >
        <Icon
          icon={isMuted || volume === 0 ? icons.volumeOff : volume < 0.5 ? icons.volumeLow : icons.volumeHigh}
          width={16}
        />
      </IconToggle>
      <div className={clsx('vplayer__volume-slider', isHovered && 'vplayer__volume-slider--visible')}>
        <Slider.Root
          value={[isMuted ? 0 : volume * 100]}
          onValueChange={(d) => remote.setVolume(d.value[0] / 100)}
          min={0}
          max={100}
          step={1}
          className="vplayer__volume-slider-track"
        >
          <Slider.Control className="vplayer__seek-slider-control">
            <Slider.Track className="vplayer__seek-track">
              <Slider.Range className="vplayer__volume-fill" />
            </Slider.Track>
            <Slider.Thumb index={0} className="vplayer__volume-thumb">
              <Slider.HiddenInput />
            </Slider.Thumb>
          </Slider.Control>
        </Slider.Root>
      </div>
    </div>
  )
}

const ASPECT_RATIO_OPTIONS = ['default', '16:9', '4:3', '21:9', 'cover', 'fill'] as const

function getAspectRatioLabel(labels: PlayerLabels, value: (typeof ASPECT_RATIO_OPTIONS)[number]) {
  if (value === 'default') return labels.aspectRatioDefault
  if (value === '16:9') return labels.aspectRatio16
  if (value === '4:3') return labels.aspectRatio4
  if (value === '21:9') return labels.aspectRatio21
  if (value === 'cover') return labels.aspectRatioCover
  return labels.aspectRatioFill
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
    <Menu.Root
      open={isOpen}
      onOpenChange={(d) => {
        setIsOpen(d.open)
        if (d.open) setView('main')
      }}
      closeOnSelect={false}
      positioning={{ placement: 'top-end' }}
    >
      <Menu.Trigger className="vplayer__button vplayer__button--trigger" aria-label={labels.settings}>
        <Icon icon={icons.settings} width={18} />
      </Menu.Trigger>
      <Menu.Positioner className="vplayer__menu-positioner">
        <Menu.Content className="vplayer__menu-popover vplayer__menu">
          {view === 'main' && (
            <>
              <Menu.Item value="speed" onSelect={() => setView('speed')} className="vplayer__menu-item">
                <span className="vplayer__menu-label">{labels.speed}</span>
                <span className="vplayer__menu-value">{playbackRate}x</span>
              </Menu.Item>
              {qualities.length > 0 && (
                <Menu.Item value="quality" onSelect={() => setView('quality')} className="vplayer__menu-item">
                  <span className="vplayer__menu-label">{labels.quality}</span>
                  <span className="vplayer__menu-value">{activeQuality}</span>
                </Menu.Item>
              )}
              {subtitleTracks.length > 0 && (
                <Menu.Item value="subtitles" onSelect={() => setView('subtitles')} className="vplayer__menu-item">
                  <span className="vplayer__menu-label">{labels.subtitles}</span>
                  <span className="vplayer__menu-value vplayer__menu-value--truncate">
                    {activeSubtitle?.label ?? labels.off}
                  </span>
                </Menu.Item>
              )}
              <Menu.Item value="flip" onSelect={() => setView('flip')} className="vplayer__menu-item">
                <Icon icon={icons.flip} width={14} className="vplayer__menu-icon" />
                <span className="vplayer__menu-label">{labels.flip}</span>
                <span className="vplayer__menu-value">{labels.flipNormal}</span>
              </Menu.Item>
              <Menu.Item value="aspectRatio" onSelect={() => setView('aspectRatio')} className="vplayer__menu-item">
                <Icon icon={icons.aspectRatio} width={14} className="vplayer__menu-icon" />
                <span className="vplayer__menu-label">{labels.aspectRatio}</span>
                <span className="vplayer__menu-value">{getAspectRatioLabel(labels, aspectRatio)}</span>
              </Menu.Item>
            </>
          )}
          {view === 'speed' && (
            <>
              <Menu.Item value="back" onSelect={() => setView('main')} className="vplayer__menu-item">
                <Icon icon={icons.chevronLeft} width={14} className="vplayer__menu-icon" />
                <span className="vplayer__menu-label">{labels.speed}</span>
              </Menu.Item>
              <Menu.Separator className="vplayer__menu-separator" />
              {speeds.map((speed) => (
                <Menu.Item
                  key={String(speed)}
                  value={`speed-${speed}`}
                  onSelect={() => {
                    remote.setPlaybackRate(Number(speed))
                    setIsOpen(false)
                  }}
                  className="vplayer__menu-item"
                >
                  <span
                    className={playbackRate === speed ? 'vplayer__menu-value--active' : 'vplayer__menu-value--inactive'}
                  >
                    {speed}x
                  </span>
                  {playbackRate === speed && <Icon icon={icons.check} width={14} className="vplayer__menu-check" />}
                </Menu.Item>
              ))}
            </>
          )}
          {view === 'quality' && (
            <>
              <Menu.Item value="back" onSelect={() => setView('main')} className="vplayer__menu-item">
                <Icon icon={icons.chevronLeft} width={14} className="vplayer__menu-icon" />
                <span className="vplayer__menu-label">{labels.quality}</span>
              </Menu.Item>
              <Menu.Separator className="vplayer__menu-separator" />
              {qualities.map((q) => (
                <Menu.Item
                  key={q}
                  value={`quality-${q}`}
                  onSelect={() => {
                    remote.setActiveQuality(q)
                    setIsOpen(false)
                  }}
                  className="vplayer__menu-item"
                >
                  <span
                    className={activeQuality === q ? 'vplayer__menu-value--active' : 'vplayer__menu-value--inactive'}
                  >
                    {q}
                  </span>
                  {activeQuality === q && <Icon icon={icons.check} width={14} className="vplayer__menu-check" />}
                </Menu.Item>
              ))}
            </>
          )}
          {view === 'flip' && (
            <>
              <Menu.Item value="back" onSelect={() => setView('main')} className="vplayer__menu-item">
                <Icon icon={icons.chevronLeft} width={14} className="vplayer__menu-icon" />
                <span className="vplayer__menu-label">{labels.flip}</span>
              </Menu.Item>
              <Menu.Separator className="vplayer__menu-separator" />
              {(['normal', 'horizontal', 'vertical'] as const).map((val) => (
                <Menu.Item
                  key={val}
                  value={`flip-${val}`}
                  onSelect={() => {
                    remote.setFlip(val)
                    setIsOpen(false)
                  }}
                  className="vplayer__menu-item"
                >
                  <span className={flip === val ? 'vplayer__menu-value--active' : 'vplayer__menu-value--inactive'}>
                    {val === 'normal'
                      ? labels.flipNormal
                      : val === 'horizontal'
                        ? labels.flipHorizontal
                        : labels.flipVertical}
                  </span>
                  {flip === val && <Icon icon={icons.check} width={14} className="vplayer__menu-check" />}
                </Menu.Item>
              ))}
            </>
          )}
          {view === 'aspectRatio' && (
            <>
              <Menu.Item value="back" onSelect={() => setView('main')} className="vplayer__menu-item">
                <Icon icon={icons.chevronLeft} width={14} className="vplayer__menu-icon" />
                <span className="vplayer__menu-label">{labels.aspectRatio}</span>
              </Menu.Item>
              <Menu.Separator className="vplayer__menu-separator" />
              {ASPECT_RATIO_OPTIONS.map((val) => (
                <Menu.Item
                  key={val}
                  value={`aspect-${val}`}
                  onSelect={() => {
                    remote.setAspectRatio(val)
                    setIsOpen(false)
                  }}
                  className="vplayer__menu-item"
                >
                  <span
                    className={aspectRatio === val ? 'vplayer__menu-value--active' : 'vplayer__menu-value--inactive'}
                  >
                    {getAspectRatioLabel(labels, val)}
                  </span>
                  {aspectRatio === val && <Icon icon={icons.check} width={14} className="vplayer__menu-check" />}
                </Menu.Item>
              ))}
            </>
          )}
          {view === 'subtitles' && (
            <>
              <Menu.Item value="back" onSelect={() => setView('main')} className="vplayer__menu-item">
                <Icon icon={icons.chevronLeft} width={14} className="vplayer__menu-icon" />
                <span className="vplayer__menu-label">{labels.subtitles}</span>
              </Menu.Item>
              <Menu.Separator className="vplayer__menu-separator" />
              <Menu.Item
                value="off"
                onSelect={() => {
                  remote.setActiveSubtitle(null)
                  setIsOpen(false)
                }}
                className="vplayer__menu-item"
              >
                <span className={!activeSubtitle ? 'vplayer__menu-value--active' : 'vplayer__menu-value--inactive'}>
                  {labels.off}
                </span>
                {!activeSubtitle && <Icon icon={icons.check} width={14} className="vplayer__menu-check" />}
              </Menu.Item>
              {subtitleTracks.map((track) => (
                <Menu.Item
                  key={track.lang}
                  value={`sub-${track.lang}`}
                  onSelect={() => {
                    remote.setActiveSubtitle(subtitleTracks.find((t) => t.lang === track.lang) ?? null)
                    setIsOpen(false)
                  }}
                  className="vplayer__menu-item"
                >
                  <span
                    className={
                      activeSubtitle?.lang === track.lang
                        ? 'vplayer__menu-value--active'
                        : 'vplayer__menu-value--inactive'
                    }
                  >
                    {track.label}
                  </span>
                  {activeSubtitle?.lang === track.lang && (
                    <Icon icon={icons.check} width={14} className="vplayer__menu-check" />
                  )}
                </Menu.Item>
              ))}
            </>
          )}
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  )
}

export const MiniPlayerButton: FC = () => {
  const { labels, icons } = usePlayerContext()
  const miniPlayer = useMiniPlayer()
  const isFullscreen = usePlayerState('isFullscreen')

  if (!miniPlayer.enabled || isFullscreen) return null

  return (
    <IconToggle
      selected={miniPlayer.active}
      onChange={miniPlayer.toggle}
      label={miniPlayer.active ? labels.exitMiniPlayer : labels.miniPlayer}
      tooltip={miniPlayer.active ? labels.exitMiniPlayer : labels.miniPlayer}
    >
      <Icon icon={miniPlayer.active ? icons.close : icons.miniPlayer} width={16} />
    </IconToggle>
  )
}

export const PiPButton: FC = () => {
  const { labels, icons } = usePlayerContext()
  const capabilities = usePlayerState('capabilities')
  const remote = usePlayerRemote()
  const active = typeof document !== 'undefined' && !!document.pictureInPictureElement
  return (
    <IconToggle
      selected={active}
      onChange={remote.togglePiP}
      label={active ? labels.pipExit : labels.pip}
      tooltip={active ? labels.pipExit : labels.pip}
      disabled={!capabilities.pictureInPicture}
    >
      <Icon icon={icons.pip} width={16} />
    </IconToggle>
  )
}

export const FullscreenButton: FC = () => {
  const isFullscreen = usePlayerState('isFullscreen')
  const capabilities = usePlayerState('capabilities')
  const { labels, icons } = usePlayerContext()
  const remote = usePlayerRemote()
  return (
    <IconToggle
      selected={isFullscreen}
      onChange={remote.toggleFullscreen}
      label={isFullscreen ? labels.fullscreenExit : labels.fullscreen}
      tooltip={isFullscreen ? `${labels.fullscreenExit} (f)` : `${labels.fullscreen} (f)`}
      disabled={!capabilities.fullscreen}
    >
      <Icon icon={isFullscreen ? icons.fullscreenExit : icons.fullscreen} width={18} />
    </IconToggle>
  )
}
