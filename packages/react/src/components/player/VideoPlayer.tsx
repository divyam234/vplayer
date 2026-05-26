"use client"

import { useStore } from '@tanstack/react-store'
import clsx from 'clsx'
import { UNSAFE_PortalProvider } from 'react-aria'
import { PlayerContext } from './context'
import { useControlsVisibility } from './hooks/useControlsVisibility'
import { useFullscreenState } from './hooks/useFullscreenState'
import { useMediaPropsSync } from './hooks/useMediaPropsSync'
import { usePlayerKeyboardShortcuts } from './hooks/usePlayerKeyboardShortcuts'
import { useThumbnailCues } from './hooks/useThumbnailCues'
import { useVideoController } from './hooks/useVideoController'
import { DefaultVideoLayout } from './layout/DefaultVideoLayout'
import { TopGradient } from './overlays'
import type { PlayerProps } from './types'

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
  })
  const ctx = state.contextValue
  useMediaPropsSync({ subtitles, qualities }, state.mediaStore)
  useFullscreenState(state.mediaStore)
  useThumbnailCues(thumbnails, state.mediaStore)
  const controls = useControlsVisibility(state.mediaStore)
  const keyboardProps = usePlayerKeyboardShortcuts(ctx)
  const controlsVisible = useStore(ctx.mediaStore, (media) => media.controlsVisible)

  return (
    <PlayerContext.Provider value={ctx}>
      <div
        {...state.rootProps}
        {...keyboardProps}
        {...controls.rootHandlers}
        className={clsx('vplayer', !controlsVisible && 'vplayer--controls-hidden', className)}
      >
        <UNSAFE_PortalProvider
          getContainer={() => document.fullscreenElement ? ctx.containerRef.current : document.body}
        >
        <video {...state.videoProps}>
          <source src={src} />
        </video>

        {children ?? <DefaultVideoLayout />}
        <TopGradient />

        <div
          className={clsx('vplayer__click-layer', controlsVisible && 'vplayer__click-layer--hidden')}
          onClick={ctx.mediaRemote.togglePlay}
        />
        </UNSAFE_PortalProvider>
      </div>
    </PlayerContext.Provider>
  )
}
