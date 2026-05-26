"use client"

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useStore } from '@tanstack/react-store'
import clsx from 'clsx'
import { UNSAFE_PortalProvider } from 'react-aria'
import { PlayerContext } from './context'
import { useControlsVisibility } from './hooks/useControlsVisibility'
import { useFullscreenState } from './hooks/useFullscreenState'
import { useMediaPropsSync } from './hooks/useMediaPropsSync'
import {
  type PlayerSystems,
  createPlayerSystems,
  registerDefaultHotkeys,
  usePlayerPlugins,
  useStorageSync,
} from './hooks/usePlayerPlugins'
import { useThumbnailCues } from './hooks/useThumbnailCues'
import { useVideoController } from './hooks/useVideoController'
import { useMobileGestures } from './hooks/useMobileGestures'
import { useErrorHandler } from './hooks/useErrorHandler'
import { useAutoPlayback } from './hooks/useAutoPlayback'
import { DefaultVideoLayout } from './layout/DefaultVideoLayout'
import { TopGradient } from './overlays'
import { MiniProgressBar } from './components/MiniProgressBar'
import { ErrorOverlay } from './components/ErrorOverlay'
import { ContextMenu } from './components/ContextMenu'
import { InfoPanel } from './components/InfoPanel'
import { AutoResumeOverlay } from './components/AutoResumeOverlay'
import type { MediaRemote, PlayerProps, PlayerContextValue } from './types'

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

  useMediaPropsSync({ subtitles, qualities }, state.mediaStore)
  useFullscreenState(state.mediaStore)
  useThumbnailCues(thumbnails, state.mediaStore)
  const controls = useControlsVisibility(state.mediaStore)
  const controlsVisible = useStore(state.mediaStore, (media) => media.controlsVisible)

  // ── Plugin infrastructure ──────────────────────────────────
  const systemsRef = useRef<PlayerSystems | null>(null)
  if (!systemsRef.current) {
    systemsRef.current = createPlayerSystems(lang, translations)
  }
  const systems = systemsRef.current

  // Persist preferences
  useStorageSync(state.mediaStore, systems.storage)

  // Register default hotkeys
  useEffect(() => {
    const unsubs = registerDefaultHotkeys(systems.hotkeys, state.mediaRemote, state.mediaStore)
    return () => { for (const u of unsubs) u() }
  }, [systems.hotkeys, state.mediaRemote, state.mediaStore])

  // Handle keyboard events through hotkey registry + show controls
  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      (event.target as HTMLElement).isContentEditable
    ) return
    controls.showControls()
    systems.hotkeys.handleKeyDown(event as unknown as KeyboardEvent)
  }, [systems.hotkeys, controls])

  // Build the full context value
  const enhancedCtx: PlayerContextValue = useMemo(() => ({
    containerRef: state.containerRef,
    videoRef: state.videoRef,
    labels: state.labels,
    icons: state.icons,
    slots: state.slots,
    mediaStore: state.mediaStore,
    mediaRemote: state.mediaRemote,
    events: systems.events,
    storage: systems.storage,
    i18n: systems.i18n,
    hotkeys: systems.hotkeys,
  }), [state, systems])

  // Initialize plugins
  usePlayerPlugins(pluginInputs, state.mediaStore, state.mediaRemote, systems, enhancedCtx)

  return (
    <PlayerContext.Provider value={enhancedCtx}>
      <PlayerInner
        rootProps={state.rootProps}
        src={src}
        controls={controls}
        controlsVisible={controlsVisible}
        className={className}
        containerRef={state.containerRef}
        mediaRemote={state.mediaRemote}
        videoProps={state.videoProps}
        onKeyDown={onKeyDown}
      >
        {children}
      </PlayerInner>
    </PlayerContext.Provider>
  )
}

// ── Inner component that mounts inside PlayerContext.Provider ──
interface PlayerInnerProps {
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

function PlayerInner({
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
}: PlayerInnerProps) {
  const gestures = useMobileGestures()
  useErrorHandler()
  useAutoPlayback()

  const onTouchStartHandler = (e: React.TouchEvent) => {
    controls.showControls()
    gestures.onTouchStart(e)
  }

  return (
    <div
      {...rootProps}
      onKeyDown={onKeyDown}
      onMouseMove={controls.rootHandlers.onMouseMove}
      onMouseEnter={controls.rootHandlers.onMouseEnter}
      onTouchStart={onTouchStartHandler}
      onTouchMove={gestures.onTouchMove}
      onTouchEnd={gestures.onTouchEnd}
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
