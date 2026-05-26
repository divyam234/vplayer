import 'iconify-icon'
import { Menu } from '@ark-ui/solid/menu'
import { Slider } from '@ark-ui/solid/slider'
import { Tooltip } from '@ark-ui/solid/tooltip'
import { getThumbnailAtTime, formatTime } from '@vplayer/core'
import clsx from 'clsx'
import { createEffect, createSignal, type JSX } from 'solid-js'

import { usePlayerRemote, usePlayerState, usePlayerContext } from '../context'

// ── IconButton ─────────────────────────────────────────────────

function IconButton(props: { label: string; tooltip: string; onClick?: () => void; children?: JSX.Element }) {
  return (
    <Tooltip.Root openDelay={400} closeDelay={150}>
      <Tooltip.Trigger onClick={props.onClick} aria-label={props.label} class="vplayer__button">
        {props.children}
      </Tooltip.Trigger>
      <Tooltip.Positioner>
        <Tooltip.Content class="vplayer__tooltip">
          <Tooltip.Arrow>
            <Tooltip.ArrowTip />
          </Tooltip.Arrow>
          {props.tooltip}
        </Tooltip.Content>
      </Tooltip.Positioner>
    </Tooltip.Root>
  )
}

// ── IconToggle ─────────────────────────────────────────────────

function IconToggle(props: {
  label: string
  tooltip: string
  selected: boolean
  onChange: () => void
  children?: JSX.Element
}) {
  return (
    <Tooltip.Root openDelay={400} closeDelay={150}>
      <Tooltip.Trigger
        onClick={props.onChange}
        aria-label={props.label}
        aria-pressed={props.selected}
        class="vplayer__button"
      >
        {props.children}
      </Tooltip.Trigger>
      <Tooltip.Positioner>
        <Tooltip.Content class="vplayer__tooltip">
          <Tooltip.Arrow>
            <Tooltip.ArrowTip />
          </Tooltip.Arrow>
          {props.tooltip}
        </Tooltip.Content>
      </Tooltip.Positioner>
    </Tooltip.Root>
  )
}

// ── SeekBar ────────────────────────────────────────────────────

export function SeekBar() {
  const currentTime = usePlayerState('currentTime')
  const duration = usePlayerState('duration')
  const bufferedPercent = usePlayerState('bufferedPercent')
  const thumbnailCues = usePlayerState('thumbnailCues')
  const remote = usePlayerRemote()

  const [hoverPercent, setHoverPercent] = createSignal<number | null>(null)
  const [overrideValue, setOverrideValue] = createSignal<number | null>(null)

  const progress = () => (duration() > 0 ? (currentTime() / duration()) * 100 : 0)
  const displayValue = () => overrideValue() ?? progress()
  const hoverTime = () => (hoverPercent() !== null ? hoverPercent()! * duration() : null)
  const thumbnailCue = () => (hoverTime() !== null ? getThumbnailAtTime(thumbnailCues(), hoverTime()!) : null)

  createEffect(() => {
    const ov = overrideValue()
    if (ov !== null && Math.abs(progress() - ov) <= 0.5) {
      setOverrideValue(null)
    }
  })

  const handlePointerMove = (e: PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setHoverPercent(pct)
  }

  return (
    <div class="vplayer__seek" onMouseLeave={() => setHoverPercent(null)}>
      {hoverPercent() !== null && thumbnailCue() && (
        <div class="vplayer__seek-preview" style={{ left: `${hoverPercent()! * 100}%` }}>
          <div class="vplayer__seek-preview-inner">
            <div class="vplayer__seek-preview-image">
              <div
                class="vplayer__seek-preview-image"
                style={`width:${thumbnailCue()!.w}px; height:${thumbnailCue()!.h}px; background-image:url(${thumbnailCue()!.src}); background-position:-${thumbnailCue()!.x}px -${thumbnailCue()!.y}px;`}
              />
            </div>
            <span class="vplayer__seek-preview-time">{formatTime(hoverTime() ?? 0)}</span>
            <div class="vplayer__seek-preview-arrow" />
          </div>
        </div>
      )}

      <Slider.Root
        value={[displayValue()]}
        onValueChange={(d) => setOverrideValue(d.value[0])}
        onValueChangeEnd={(d) => remote.seek((d.value[0] / 100) * duration())}
        min={0}
        max={100}
        step={0.01}
        class="vplayer__seek-slider"
      >
        <Slider.Control class="vplayer__seek-slider-control" onPointerMove={handlePointerMove}>
          <Slider.Track class="vplayer__seek-track">
            <div class="vplayer__seek-buffered" style={{ width: `${bufferedPercent()}%` }} />
            <Slider.Range class="vplayer__seek-progress" />
          </Slider.Track>
          <Slider.Thumb index={0} class="vplayer__seek-thumb">
            <Slider.HiddenInput />
          </Slider.Thumb>
        </Slider.Control>
      </Slider.Root>

      {hoverPercent() !== null && !thumbnailCue() && (
        <div class="vplayer__seek-tooltip" style={{ left: `${hoverPercent()! * 100}%` }}>
          {formatTime(hoverTime() ?? 0)}
        </div>
      )}
    </div>
  )
}

// ── PlayButton ─────────────────────────────────────────────────

export function PlayButton(_props: { size?: number }) {
  const isPlaying = usePlayerState('isPlaying')
  const isEnded = usePlayerState('isEnded')
  const { labels, icons } = usePlayerContext()
  const remote = usePlayerRemote()

  return (
    <IconToggle
      selected={isPlaying()}
      onChange={() => remote.togglePlay()}
      label={isPlaying() ? labels.pause : labels.play}
      tooltip={isPlaying() ? `${labels.pause} (k)` : `${labels.play} (k)`}
    >
      {isEnded() ? (
        <iconify-icon icon={icons.replay} width="20"></iconify-icon>
      ) : (
        <iconify-icon icon={isPlaying() ? icons.pause : icons.play} width="20"></iconify-icon>
      )}
    </IconToggle>
  )
}

// ── SkipButton ─────────────────────────────────────────────────

export function SkipButton(props: { seconds: number }) {
  const { icons } = usePlayerContext()
  const remote = usePlayerRemote()
  const forward = props.seconds > 0
  const label = forward ? `Skip forward ${props.seconds}s` : `Skip back ${Math.abs(props.seconds)}s`
  return (
    <IconButton label={label} tooltip={label} onClick={() => remote.skip(props.seconds)}>
      <iconify-icon icon={forward ? icons.skipForward : icons.skipBack} width="18"></iconify-icon>
    </IconButton>
  )
}

// ── TimeDisplay ────────────────────────────────────────────────

export function TimeDisplay() {
  const currentTime = usePlayerState('currentTime')
  const duration = usePlayerState('duration')
  return (
    <span class="vplayer__time">
      {formatTime(currentTime())} / {formatTime(duration())}
    </span>
  )
}

// ── VolumeControl ──────────────────────────────────────────────

export function VolumeControl() {
  const volume = usePlayerState('volume')
  const isMuted = usePlayerState('isMuted')
  const { labels, icons } = usePlayerContext()
  const remote = usePlayerRemote()
  const [isHovered, setIsHovered] = createSignal(false)

  return (
    <div class="vplayer__volume" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <IconToggle
        selected={!isMuted()}
        onChange={() => remote.toggleMute()}
        label={isMuted() ? labels.unmute : labels.mute}
        tooltip={isMuted() ? `${labels.unmute} (m)` : `${labels.mute} (m)`}
      >
        <iconify-icon
          icon={isMuted() || volume() === 0 ? icons.volumeOff : volume() < 0.5 ? icons.volumeLow : icons.volumeHigh}
          width="16"
        ></iconify-icon>
      </IconToggle>
      <div class={clsx('vplayer__volume-slider', isHovered() && 'vplayer__volume-slider--visible')}>
        <Slider.Root
          value={[isMuted() ? 0 : volume() * 100]}
          onValueChange={(d) => remote.setVolume(d.value[0] / 100)}
          min={0}
          max={100}
          step={1}
          class="vplayer__volume-slider-track"
        >
          <Slider.Control class="vplayer__seek-slider-control">
            <Slider.Track class="vplayer__seek-track">
              <Slider.Range class="vplayer__volume-fill" />
            </Slider.Track>
            <Slider.Thumb index={0} class="vplayer__volume-thumb">
              <Slider.HiddenInput />
            </Slider.Thumb>
          </Slider.Control>
        </Slider.Root>
      </div>
    </div>
  )
}

// ── SettingsTrigger ────────────────────────────────────────────

type SettingsView = 'main' | 'speed' | 'quality' | 'subtitles' | 'flip' | 'aspectRatio'

export function SettingsTrigger() {
  const { labels, icons } = usePlayerContext()
  const remote = usePlayerRemote()
  const playbackRate = usePlayerState('playbackRate')
  const qualities = usePlayerState('qualities')
  const activeQuality = usePlayerState('activeQuality')
  const subtitleTracks = usePlayerState('subtitleTracks')
  const activeSubtitle = usePlayerState('activeSubtitle')
  const flip = usePlayerState('flip')
  const aspectRatio = usePlayerState('aspectRatio')
  const [isOpen, setIsOpen] = createSignal(false)
  const [view, setView] = createSignal<SettingsView>('main')
  const speeds = [0.5, 1, 1.25, 1.5, 2]

  return (
    <Menu.Root
      open={isOpen()}
      onOpenChange={(d: { open: boolean }) => {
        setIsOpen(d.open)
        if (d.open) setView('main')
      }}
      closeOnSelect={false}
      positioning={{ placement: 'top-end' }}
    >
      <Menu.Trigger class="vplayer__button vplayer__button--trigger">
        <iconify-icon icon={icons.settings} width="18"></iconify-icon>
      </Menu.Trigger>
      <Menu.Positioner>
        <Menu.Content class="vplayer__menu-popover vplayer__menu">
          {view() === 'main' && (
            <>
              <Menu.Item value="speed" onSelect={() => setView('speed')} class="vplayer__menu-item">
                <span class="vplayer__menu-label">{labels.speed}</span>
                <span class="vplayer__menu-value">{playbackRate()}x</span>
              </Menu.Item>
              {qualities().length > 0 && (
                <Menu.Item value="quality" onSelect={() => setView('quality')} class="vplayer__menu-item">
                  <span class="vplayer__menu-label">{labels.quality}</span>
                  <span class="vplayer__menu-value">{activeQuality()}</span>
                </Menu.Item>
              )}
              {subtitleTracks().length > 0 && (
                <Menu.Item value="subtitles" onSelect={() => setView('subtitles')} class="vplayer__menu-item">
                  <span class="vplayer__menu-label">{labels.subtitles}</span>
                  <span class="vplayer__menu-value vplayer__menu-value--truncate">
                    {activeSubtitle()?.label ?? labels.off}
                  </span>
                </Menu.Item>
              )}
              <Menu.Item value="flip" onSelect={() => setView('flip')} class="vplayer__menu-item">
                <iconify-icon icon={icons.flip} width="14" class="vplayer__menu-icon"></iconify-icon>
                <span class="vplayer__menu-label">{labels.flip}</span>
                <span class="vplayer__menu-value">{labels.flipNormal}</span>
              </Menu.Item>
              <Menu.Item value="aspectRatio" onSelect={() => setView('aspectRatio')} class="vplayer__menu-item">
                <iconify-icon icon={icons.aspectRatio} width="14" class="vplayer__menu-icon"></iconify-icon>
                <span class="vplayer__menu-label">{labels.aspectRatio}</span>
                <span class="vplayer__menu-value">{labels.aspectRatioDefault}</span>
              </Menu.Item>
            </>
          )}
          {view() === 'speed' && (
            <>
              <Menu.Item value="back" onSelect={() => setView('main')} class="vplayer__menu-item">
                <iconify-icon icon={icons.chevronLeft} width="14" class="vplayer__menu-icon"></iconify-icon>
                <span class="vplayer__menu-label">{labels.speed}</span>
              </Menu.Item>
              <Menu.Separator class="vplayer__menu-separator" />
              {speeds.map((speed) => (
                <Menu.Item
                  value={`speed-${speed}`}
                  onSelect={() => {
                    remote.setPlaybackRate(Number(speed))
                    setIsOpen(false)
                  }}
                  class="vplayer__menu-item"
                >
                  <span
                    class={playbackRate() === speed ? 'vplayer__menu-value--active' : 'vplayer__menu-value--inactive'}
                  >
                    {speed}x
                  </span>
                  {playbackRate() === speed && (
                    <iconify-icon icon={icons.check} width="14" class="vplayer__menu-check"></iconify-icon>
                  )}
                </Menu.Item>
              ))}
            </>
          )}
          {view() === 'quality' && (
            <>
              <Menu.Item value="back" onSelect={() => setView('main')} class="vplayer__menu-item">
                <iconify-icon icon={icons.chevronLeft} width="14" class="vplayer__menu-icon"></iconify-icon>
                <span class="vplayer__menu-label">{labels.quality}</span>
              </Menu.Item>
              <Menu.Separator class="vplayer__menu-separator" />
              {qualities().map((q) => (
                <Menu.Item
                  value={`quality-${q}`}
                  onSelect={() => {
                    remote.setActiveQuality(q)
                    setIsOpen(false)
                  }}
                  class="vplayer__menu-item"
                >
                  <span class={activeQuality() === q ? 'vplayer__menu-value--active' : 'vplayer__menu-value--inactive'}>
                    {q}
                  </span>
                  {activeQuality() === q && (
                    <iconify-icon icon={icons.check} width="14" class="vplayer__menu-check"></iconify-icon>
                  )}
                </Menu.Item>
              ))}
            </>
          )}
          {view() === 'flip' && (
            <>
              <Menu.Item value="back" onSelect={() => setView('main')} class="vplayer__menu-item">
                <iconify-icon icon={icons.chevronLeft} width="14" class="vplayer__menu-icon"></iconify-icon>
                <span class="vplayer__menu-label">{labels.flip}</span>
              </Menu.Item>
              <Menu.Separator class="vplayer__menu-separator" />
              {(['normal', 'horizontal', 'vertical'] as const).map((val) => (
                <Menu.Item
                  value={`flip-${val}`}
                  onSelect={() => {
                    remote.setFlip(val)
                    setIsOpen(false)
                  }}
                  class="vplayer__menu-item"
                >
                  <span class={flip() === val ? 'vplayer__menu-value--active' : 'vplayer__menu-value--inactive'}>
                    {val === 'normal'
                      ? labels.flipNormal
                      : val === 'horizontal'
                        ? labels.flipHorizontal
                        : labels.flipVertical}
                  </span>
                  {flip() === val && (
                    <iconify-icon icon={icons.check} width="14" class="vplayer__menu-check"></iconify-icon>
                  )}
                </Menu.Item>
              ))}
            </>
          )}
          {view() === 'aspectRatio' && (
            <>
              <Menu.Item value="back" onSelect={() => setView('main')} class="vplayer__menu-item">
                <iconify-icon icon={icons.chevronLeft} width="14" class="vplayer__menu-icon"></iconify-icon>
                <span class="vplayer__menu-label">{labels.aspectRatio}</span>
              </Menu.Item>
              <Menu.Separator class="vplayer__menu-separator" />
              {(['default', '16:9', '4:3', 'fill'] as const).map((val) => (
                <Menu.Item
                  value={`aspect-${val}`}
                  onSelect={() => {
                    remote.setAspectRatio(val)
                    setIsOpen(false)
                  }}
                  class="vplayer__menu-item"
                >
                  <span class={aspectRatio() === val ? 'vplayer__menu-value--active' : 'vplayer__menu-value--inactive'}>
                    {val === 'default'
                      ? labels.aspectRatioDefault
                      : val === '16:9'
                        ? labels.aspectRatio16
                        : val === '4:3'
                          ? labels.aspectRatio4
                          : labels.aspectRatioFill}
                  </span>
                  {aspectRatio() === val && (
                    <iconify-icon icon={icons.check} width="14" class="vplayer__menu-check"></iconify-icon>
                  )}
                </Menu.Item>
              ))}
            </>
          )}
          {view() === 'subtitles' && (
            <>
              <Menu.Item value="back" onSelect={() => setView('main')} class="vplayer__menu-item">
                <iconify-icon icon={icons.chevronLeft} width="14" class="vplayer__menu-icon"></iconify-icon>
                <span class="vplayer__menu-label">{labels.subtitles}</span>
              </Menu.Item>
              <Menu.Separator class="vplayer__menu-separator" />
              <Menu.Item
                value="off"
                onSelect={() => {
                  remote.setActiveSubtitle(null)
                  setIsOpen(false)
                }}
                class="vplayer__menu-item"
              >
                <span class={!activeSubtitle() ? 'vplayer__menu-value--active' : 'vplayer__menu-value--inactive'}>
                  {labels.off}
                </span>
                {!activeSubtitle() && (
                  <iconify-icon icon={icons.check} width="14" class="vplayer__menu-check"></iconify-icon>
                )}
              </Menu.Item>
              {subtitleTracks().map((track) => (
                <Menu.Item
                  value={`sub-${track.lang}`}
                  onSelect={() => {
                    remote.setActiveSubtitle(subtitleTracks().find((t) => t.lang === track.lang) ?? null)
                    setIsOpen(false)
                  }}
                  class="vplayer__menu-item"
                >
                  <span
                    class={
                      activeSubtitle()?.lang === track.lang
                        ? 'vplayer__menu-value--active'
                        : 'vplayer__menu-value--inactive'
                    }
                  >
                    {track.label}
                  </span>
                  {activeSubtitle()?.lang === track.lang && (
                    <iconify-icon icon={icons.check} width="14" class="vplayer__menu-check"></iconify-icon>
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

// ── PiPButton ──────────────────────────────────────────────────

export function PiPButton() {
  const { labels, icons } = usePlayerContext()
  const remote = usePlayerRemote()
  const active = typeof document !== 'undefined' && !!document.pictureInPictureElement
  return (
    <IconToggle
      selected={active}
      onChange={() => remote.togglePiP()}
      label={active ? labels.pipExit : labels.pip}
      tooltip={active ? labels.pipExit : labels.pip}
    >
      <iconify-icon icon={icons.pip} width="16"></iconify-icon>
    </IconToggle>
  )
}

// ── FullscreenButton ───────────────────────────────────────────

export function FullscreenButton() {
  const isFullscreen = usePlayerState('isFullscreen')
  const { labels, icons } = usePlayerContext()
  const remote = usePlayerRemote()
  return (
    <IconToggle
      selected={isFullscreen()}
      onChange={() => remote.toggleFullscreen()}
      label={isFullscreen() ? labels.fullscreenExit : labels.fullscreen}
      tooltip={isFullscreen() ? `${labels.fullscreenExit} (f)` : `${labels.fullscreen} (f)`}
    >
      <iconify-icon icon={isFullscreen() ? icons.fullscreenExit : icons.fullscreen} width="18"></iconify-icon>
    </IconToggle>
  )
}
