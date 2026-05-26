"use client"

import { useCallback, useEffect, useMemo } from 'react'
import { useStore } from '@tanstack/react-store'
import clsx from 'clsx'
import { UNSAFE_PortalProvider } from 'react-aria'
import { PlayerContext } from './context'
import { useControlsVisibility } from './hooks/use-controls-visibility'
import { useVideoController } from './hooks/use-video-controller'
import { useMobileGestures } from './hooks/use-mobile-gestures'
import { DefaultVideoLayout } from './layout/default-video-layout'
import { TopGradient } from './overlays'
import { MiniProgressBar } from './components/mini-progress-bar'
import { ErrorOverlay } from './components/error-overlay'
import { ContextMenu } from './components/context-menu'
import { InfoPanel } from './components/info-panel'
import { AutoResumeOverlay } from './components/auto-resume-overlay'
import type { PlayerProps, PlayerContextValue } from './types'
import type { MediaRemote } from '@vplayer/core'

export function VideoPlayer({
  src,
  poster,
  subtitles,
  qualities,
  thumbnails,
  className = '',
  children,
  autoPlay,
  onTimeUpdate: _onTimeUpdate,
  onEnded: _onEnded,
  onError: _onError,
  plugins: pluginInputs,
  lang,
  translations,
}: PlayerProps) {
  const state = useVideoController({
    src,
    poster,
    subtitles,
    qualities,
    autoPlay,
    thumbnails,
    onTimeUpdate: _onTimeUpdate,
    onEnded: _onEnded,
    onError: _onError,
  })

  const { player } = state

  // Sync reactive props to core (handles subtitle/quality changes)
  useEffect(() => {
    player.updateOptions({ subtitles, qualities })
  }, [subtitles, qualities, player])

  // Sync thumbnails to core
  useEffect(() => {
    player.setThumbnails(thumbnails)
  }, [thumbnails, player])

  // Initialize plugins — delegates to core's initPlugins()
  useEffect(() => {
    return player.initPlugins(pluginInputs ?? [])
  }, [pluginInputs, player])

  // Controls auto-hide (UI concern, stays in React)
  const controls = useControlsVisibility(player.store)
  const controlsVisible = useStore(player.store, (media) => media.controlsVisible)

  // Keyboard events through core's hotkey registry
  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      (event.target as HTMLElement).isContentEditable
    ) return
    controls.showControls()
    player.hotkeys.handleKeyDown(event as unknown as KeyboardEvent)
  }, [player.hotkeys, controls])

  // Build context value
  const enhancedCtx: PlayerContextValue = useMemo(() => ({
    containerRef: state.containerRef,
    videoRef: state.videoRef,
    labels: state.labels,
    icons: state.icons,
    slots: state.slots,
    mediaStore: player.store,
    mediaRemote: player.remote,
    events: player.events,
    storage: player.storage,
    i18n: player.i18n,
    hotkeys: player.hotkeys,
  }), [state, player])

  return (
    <PlayerContext.Provider value={enhancedCtx}>
      <PlayerShell
        rootProps={state.rootProps}
        src={src}
        controls={controls}
        controlsVisible={controlsVisible}
        className={className}
        containerRef={state.containerRef}
        mediaRemote={player.remote}
        videoProps={state.videoProps}
        onKeyDown={onKeyDown}
      >
        {children}
      </PlayerShell>
    </PlayerContext.Provider>
  )
}

// ── Inner component that mounts inside PlayerContext.Provider ──
interface PlayerShellProps {
  rootProps: Record<string, any>
  src: string
  controls: ReturnType<typeof useControlsVisibility>
  controlsVisible: boolean
  className: string
  containerRef: React.RefObject<HTMLDivElement | null>
  mediaRemote: MediaRemote
  videoProps: Record<string, any>
  onKeyDown: (e: React.KeyboardEvent) => void
  children?: React.ReactNode
}

function PlayerShell({
  rootProps,
  src,
  controls,
  controlsVisible,
  className,
  containerRef,
  mediaRemote,
  videoProps,
  onKeyDown,
  children,
}: PlayerShellProps) {
  const gestures = useMobileGestures()

  const onTouchStartHandler = (e: React.TouchEvent) => {
    controls.showControls()
    gestures.onTouchStart(e as unknown as TouchEvent)
  }

  return (
    <div
      {...rootProps}
      onKeyDown={onKeyDown}
      onMouseMove={controls.rootHandlers.onMouseMove}
      onMouseEnter={controls.rootHandlers.onMouseEnter}
      onTouchStart={onTouchStartHandler}
      onTouchMove={(e) => gestures.onTouchMove(e as unknown as TouchEvent)}
      onTouchEnd={(e) => gestures.onTouchEnd(e as unknown as TouchEvent)}
      className={clsx('vplayer', !controlsVisible && 'vplayer--controls-hidden', className)}
    >
      <UNSAFE_PortalProvider
        getContainer={() => document.fullscreenElement ? containerRef.current : document.body}
      >
      <video {...videoProps}>
        <source src={src} />
      </video>

      {children ?? <DefaultVideoLayout />}
      <TopGradient />

      <MiniProgressBar />
      <ErrorOverlay />
      <AutoResumeOverlay />
      <ContextMenu />
      <InfoPanel />

      <div
        className={clsx('vplayer__click-layer', controlsVisible && 'vplayer__click-layer--hidden')}
        onClick={mediaRemote.togglePlay}
      />
      </UNSAFE_PortalProvider>
    </div>
  )
}
