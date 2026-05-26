"use client"

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useStore } from '@tanstack/react-store'
import clsx from 'clsx'
import { UNSAFE_PortalProvider } from 'react-aria'
import { mergeLabels, mergeIcons } from '@vplayer/framework'
import { defaultPlayerIcons, defaultPlayerLabels } from '@vplayer/core'
import { PlayerContext } from './context'
import { usePlayer } from './hooks/use-player'
import { useControlsVisibility } from './hooks/use-controls-visibility'
import { usePlayerGestures } from './hooks/use-mobile-gestures'
import { DefaultVideoLayout } from './layout/default-video-layout'
import { TopGradient } from './overlays'
import { MiniProgressBar } from './components/mini-progress-bar'
import { ErrorOverlay } from './components/error-overlay'
import { ContextMenu } from './components/context-menu'
import { InfoPanel } from './components/info-panel'
import { AutoResumeOverlay } from './components/auto-resume-overlay'
import type { PlayerProps, PlayerContextValue } from './types'
import { createPluginAPI } from './plugin-api'

export function VideoPlayer({
  className = '',
  children,
  ...options
}: PlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const src = options.src
  const poster = options.poster
  const autoPlay = options.autoPlay
  const subtitles = options.subtitles
  const qualities = options.qualities
  const thumbnails = options.thumbnails
  const plugins = options.plugins
  const labelsProp = options.labels
  const iconsProp = options.icons
  const slots = options.slots ?? {}

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
    instance.updateOptions({ subtitles, qualities })
  }, [subtitles, qualities, instance])

  useEffect(() => {
    instance.setThumbnails(thumbnails)
  }, [thumbnails, instance])

  // ── Initialize plugins ──
  useEffect(() => {
    return instance.initPlugins(plugins ?? [])
  }, [plugins, instance])

  // ── Controls auto-hide (UI concern) ──
  const controls = useControlsVisibility(instance.store)
  const controlsVisible = useStore(instance.store, (s) => s.controlsVisible)

  // ── Keyboard events through core's hotkey registry ──
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement).isContentEditable
      ) return
      controls.showControls()
      instance.hotkeys.handleKeyDown(event as unknown as KeyboardEvent)
    },
    [instance.hotkeys, controls],
  )

  // ── Resolve labels, icons ──
  const labels = useMemo(
    () => mergeLabels(defaultPlayerLabels, labelsProp),
    [labelsProp],
  )
  const iconMap = useMemo(
    () => mergeIcons(defaultPlayerIcons, iconsProp),
    [iconsProp],
  )

  // ── Video element props ──
  const videoProps = useMemo(
    () => ({
      ref: videoRef,
      className: 'vplayer__video',
      poster,
      autoPlay,
      preload: 'metadata' as const,
      playsInline: true,
      onClick: instance.remote.togglePlay,
      ...instance.videoHandlers,
    }),
    [poster, autoPlay, instance.remote.togglePlay, instance.videoHandlers],
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
  const onTouchMove = useCallback(
    (e: React.TouchEvent) => gestures.onTouchMove(e as unknown as TouchEvent),
    [gestures],
  )
  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => gestures.onTouchEnd(e as unknown as TouchEvent),
    [gestures],
  )

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
      instance,
      createPluginAPI,
    }),
    [instance, labels, iconMap, slots, createPluginAPI],
  )

  return (
    <PlayerContext.Provider value={ctx}>
      <div
        ref={containerRef}
        tabIndex={0}
        className={clsx('vplayer', !controlsVisible && 'vplayer--controls-hidden', className)}
        onKeyDown={onKeyDown}
        onMouseMove={controls.rootHandlers.onMouseMove}
        onMouseEnter={controls.rootHandlers.onMouseEnter}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onDoubleClick={instance.remote.toggleFullscreen}
      >
        <UNSAFE_PortalProvider
          getContainer={() =>
            document.fullscreenElement ? containerRef.current : document.body
          }
        >
          <video {...videoProps}>
            <source src={src ?? ''} />
          </video>

          {children ?? <DefaultVideoLayout />}
          <TopGradient />

          {/* Overlays & floating UI */}
          <MiniProgressBar />
          <ErrorOverlay />
          <AutoResumeOverlay />
          <ContextMenu />
          <InfoPanel />

          {/* Click layer to toggle play when controls are hidden */}
          <div
            className={clsx(
              'vplayer__click-layer',
              controlsVisible && 'vplayer__click-layer--hidden',
            )}
            onClick={instance.remote.togglePlay}
          />
        </UNSAFE_PortalProvider>
      </div>
    </PlayerContext.Provider>
  )
}
