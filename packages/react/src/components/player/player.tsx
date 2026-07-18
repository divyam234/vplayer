/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions -- Media-player root intentionally owns keyboard/mouse shortcuts while remaining focusable and labelled. */
'use client'

import { useStore } from '@tanstack/react-store'
import { defaultPlayerIcons, defaultPlayerLabels } from '@vplayer/core'
import clsx from 'clsx'
import { useCallback, useEffect, useMemo, useRef, type CSSProperties } from 'react'

import { AutoResumeOverlay } from './components/auto-resume-overlay'
import { ContextMenu } from './components/context-menu'
import { ErrorOverlay } from './components/error-overlay'
import { InfoPanel } from './components/info-panel'
import { MiniProgressBar } from './components/mini-progress-bar'
import { PlayerContext } from './context'
import { useControlsVisibility } from './hooks/use-controls-visibility'
import { useMiniPlayerState } from './hooks/use-mini-player-state'
import { usePlayerGestures } from './hooks/use-mobile-gestures'
import { usePlayer } from './hooks/use-player'
import { DefaultVideoLayout } from './layout/default-video-layout'
import { TopGradient } from './overlays'
import { createPluginAPI } from './plugin-api'
import type {
  NormalizedThumbnailPreviewOptions,
  PlayerContextValue,
  PlayerProps,
  ThumbnailPreviewOptions,
} from './types'
import { mergeLabels, mergeIcons } from './utils/merge'

function normalizeThumbnailPreviewOptions(
  thumbnailPreview?: boolean | ThumbnailPreviewOptions,
): NormalizedThumbnailPreviewOptions {
  if (thumbnailPreview === false) {
    return { enabled: false, width: 180, height: 101, gap: 10, showTime: true, fit: 'cover' }
  }

  if (thumbnailPreview === true || thumbnailPreview === undefined) {
    return { enabled: true, width: 180, height: 101, gap: 10, showTime: true, fit: 'cover' }
  }

  return {
    enabled: thumbnailPreview.enabled ?? true,
    width: Math.max(96, Math.min(420, thumbnailPreview.width ?? 180)),
    height: Math.max(54, Math.min(236, thumbnailPreview.height ?? 101)),
    gap: Math.max(0, Math.min(48, thumbnailPreview.gap ?? 10)),
    showTime: thumbnailPreview.showTime ?? true,
    fit: thumbnailPreview.fit ?? 'cover',
  }
}

export function VideoPlayer({ className = '', children, ...options }: PlayerProps) {
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const src = options.src
  const poster = options.poster
  const type = options.type
  const autoPlay = options.autoPlay
  const subtitles = options.subtitles
  const qualities = options.qualities
  const thumbnails = options.thumbnails
  const transformThumbnailVTT = options.transformThumbnailVTT
  const plugins = options.plugins
  const labelsProp = options.labels
  const iconsProp = options.icons
  const slots = options.slots ?? {}
  const miniPlayerProp = options.miniPlayer
  const thumbnailPreviewProp = options.thumbnailPreview

  // ── Core player via contract hook ──
  const player = usePlayer(options)
  const { instance } = player

  // ── Mount/unmount lifecycle ──
  // Use stable function references for deps — player.attach/detach
  // are useCallback'd inside usePlayer and never change identity.
  useEffect(() => {
    const video = videoRef.current
    const container = containerRef.current
    if (video && container) {
      player.attach(container, video)
    }
    return () => player.detach()
  }, [player.attach, player.detach])

  // ── Sync reactive props to core ──
  useEffect(() => {
    instance.updateOptions({ src, type, subtitles, qualities, thumbnails, transformThumbnailVTT, autoPlay })
  }, [src, type, subtitles, qualities, thumbnails, transformThumbnailVTT, autoPlay, instance])

  // ── Initialize plugins ──
  useEffect(() => {
    return instance.initPlugins(plugins ?? [])
  }, [plugins, instance])

  // ── Controls auto-hide (UI concern) ──
  const controls = useControlsVisibility(instance.store)
  const controlsVisible = useStore(instance.store, (s) => s.controlsVisible)
  const isPlaying = useStore(instance.store, (s) => s.isPlaying)
  const miniPlayer = useMiniPlayerState(anchorRef, miniPlayerProp)
  const thumbnailPreview = useMemo(() => normalizeThumbnailPreviewOptions(thumbnailPreviewProp), [thumbnailPreviewProp])

  useEffect(() => {
    if (miniPlayer.active) {
      controls.showControls()
      controls.scheduleHide(1400)
    }
  }, [controls, miniPlayer.active])

  useEffect(() => {
    if (!isPlaying) {
      controls.showControls()
      return
    }

    const delay = miniPlayer.active ? 1400 : 3000
    controls.scheduleHide(delay)
    const id = setTimeout(() => {
      if (instance.store.state.isPlaying) {
        instance.store.setState((prev) => ({ ...prev, controlsVisible: false }))
      }
    }, delay)

    return () => clearTimeout(id)
  }, [controls, instance.store, isPlaying, miniPlayer.active])

  // ── Keyboard events through core's hotkey registry ──
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement).isContentEditable
      )
        return
      controls.showControls()
      instance.hotkeys.handleKeyDown(event as unknown as KeyboardEvent)
    },
    [instance.hotkeys, controls],
  )

  // ── Resolve labels, icons ──
  const labels = useMemo(() => mergeLabels(defaultPlayerLabels, labelsProp), [labelsProp])
  const iconMap = useMemo(() => mergeIcons(defaultPlayerIcons, iconsProp), [iconsProp])

  // ── Video element props ──
  // Media event handlers are managed internally by the engine (NativeVideoEngine)
  // created during mount(). The engine attaches its own DOM listeners and wires them
  // to the store.
  const videoProps = useMemo(
    () => ({
      ref: videoRef,
      className: 'vplayer__video',
      poster,
      autoPlay,
      preload: 'metadata' as const,
      playsInline: true,
      onClick: instance.remote.togglePlay,
    }),
    [poster, autoPlay, instance.remote.togglePlay],
  )

  // ── Gestures: touch → show controls + forward gesture events ──
  // Pass store/remote explicitly since PlayerContext isn't available yet
  // (VideoPlayer provides the context, so we're inside the provider)
  const gestures = usePlayerGestures(instance.store, instance.remote)
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      controls.showControls()
      gestures.onTouchStart(e as unknown as TouchEvent)
    },
    [controls, gestures],
  )
  const onTouchMove = useCallback((e: React.TouchEvent) => gestures.onTouchMove(e as unknown as TouchEvent), [gestures])
  const onTouchEnd = useCallback((e: React.TouchEvent) => gestures.onTouchEnd(e as unknown as TouchEvent), [gestures])

  // ── Context value ──
  const ctx: PlayerContextValue = useMemo(
    () => ({
      containerRef,
      videoRef,
      labels,
      icons: iconMap,
      slots,
      mediaStore: instance.store,
      mediaRemote: instance.remote,
      events: instance.events,
      storage: instance.storage,
      i18n: instance.i18n,
      hotkeys: instance.hotkeys,
      engine: instance.engine,
      instance,
      createPluginAPI,
      miniPlayer,
      thumbnailPreview,
    }),
    [instance, labels, iconMap, slots, miniPlayer, thumbnailPreview],
  )

  const miniPlayerStyle = useMemo(
    () => ({
      '--vplayer-mini-width': typeof miniPlayer.width === 'number' ? `${miniPlayer.width}px` : miniPlayer.width,
      '--vplayer-thumbnail-width': `${thumbnailPreview.width}px`,
      '--vplayer-thumbnail-height': `${thumbnailPreview.height}px`,
      '--vplayer-thumbnail-gap': `${thumbnailPreview.gap}px`,
    }),
    [miniPlayer.width, thumbnailPreview.gap, thumbnailPreview.height, thumbnailPreview.width],
  ) as CSSProperties

  return (
    <PlayerContext.Provider value={ctx}>
      <div ref={anchorRef} className="vplayer__anchor">
        <div
          ref={containerRef}
          tabIndex={0}
          role="application"
          aria-label="Video player"
          data-testid="vplayer-root"
          data-mini-player={miniPlayer.active ? 'true' : 'false'}
          data-mini-player-position={miniPlayer.position}
          className={clsx(
            'vplayer',
            !controlsVisible && 'vplayer--controls-hidden',
            miniPlayer.enabled && 'vplayer--mini-enabled',
            miniPlayer.active && 'vplayer--mini',
            miniPlayer.active && `vplayer--mini-${miniPlayer.position}`,
            className,
          )}
          style={miniPlayerStyle}
          onKeyDown={onKeyDown}
          onMouseMove={controls.rootHandlers.onMouseMove}
          onMouseEnter={controls.rootHandlers.onMouseEnter}
          onMouseLeave={controls.rootHandlers.onMouseLeave}
          onFocus={controls.rootHandlers.onFocus}
          onBlur={controls.rootHandlers.onBlur}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onDoubleClick={instance.remote.toggleFullscreen}
        >
          <div className="vplayer__media-viewport" data-testid="vplayer-media-viewport">
            <video {...videoProps} />
          </div>

          {children ?? <DefaultVideoLayout />}
          <TopGradient />

          {/* Overlays & floating UI */}
          {miniPlayer.active && <MiniProgressBar />}
          <ErrorOverlay />
          <AutoResumeOverlay />
          <ContextMenu />
          <InfoPanel />

          {/* Click layer to toggle play when controls are hidden */}
          <div
            className={clsx('vplayer__click-layer', controlsVisible && 'vplayer__click-layer--hidden')}
            onClick={instance.remote.togglePlay}
          />
        </div>
      </div>
    </PlayerContext.Provider>
  )
}
