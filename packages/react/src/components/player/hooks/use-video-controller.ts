/**
 * Creates the player instance and wires React refs to core lifecycle.
 * After refactoring: delegates state machine + remote commands + video handlers to @vplayer/core.
 */
import { useEffect, useMemo, useRef } from 'react'
import { createPlayer, defaultPlayerLabels } from '@vplayer/core'
import type { PlayerInstance } from '@vplayer/core'
import { defaultPlayerIcons } from '../defaults'
import type { PlayerProps } from '../types'

export interface VideoControllerResult {
  containerRef: React.RefObject<HTMLDivElement | null>
  videoRef: React.RefObject<HTMLVideoElement | null>
  player: PlayerInstance
  rootProps: {
    ref: React.RefObject<HTMLDivElement | null>
    tabIndex: number
    onDoubleClick: () => void
  }
  videoProps: {
    ref: React.RefObject<HTMLVideoElement | null>
    className: string
    poster?: string
    autoPlay?: boolean
    preload: 'metadata'
    playsInline: boolean
    onClick: () => void
    onPlay: () => void
    onPause: () => void
    onEnded: () => void
    onTimeUpdate: () => void
    onLoadedMetadata: () => void
    onProgress: () => void
    onWaiting: () => void
    onCanPlay: () => void
  }
  labels: Record<string, string>
  icons: Record<string, React.ComponentType>
  slots: PlayerProps['slots']
}

export function useVideoController(props: PlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // Create the core player instance — owns store, remote, event bus, storage, i18n, hotkeys, videoHandlers
  const player = useMemo(
    () =>
      createPlayer({
        src: props.src,
        poster: props.poster,
        subtitles: props.subtitles,
        qualities: props.qualities,
        autoPlay: props.autoPlay,
        thumbnails: props.thumbnails,
        lang: props.lang,
        translations: props.translations,
        onTimeUpdate: props.onTimeUpdate,
        onEnded: props.onEnded,
        onError: props.onError,
      }),
    // These are player-construction options. Re-creating would lose state, so we only create once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // Wire React refs into the core player so video/container operations work
  useEffect(() => {
    const video = videoRef.current
    const container = containerRef.current
    if (video && container) {
      player.mount(video, container)
    }
    return () => {
      player.unmount()
    }
  }, [player])

  const rootProps = useMemo(
    () => ({
      ref: containerRef,
      tabIndex: 0,
      onDoubleClick: player.remote.toggleFullscreen,
    }),
    [player.remote.toggleFullscreen],
  )

  const videoProps = useMemo(
    () => ({
      ref: videoRef,
      className: 'vplayer__video',
      poster: props.poster,
      autoPlay: props.autoPlay,
      preload: 'metadata' as const,
      playsInline: true,
      onClick: player.remote.togglePlay,
      ...player.videoHandlers,
    }),
    [props.poster, props.autoPlay, player.remote.togglePlay, player.videoHandlers],
  )

  const labels = useMemo(() => ({ ...defaultPlayerLabels, ...props.labels }), [props.labels])
  const icons = useMemo(() => ({ ...defaultPlayerIcons, ...props.icons }), [props.icons])
  const slots = props.slots ?? {}

  return {
    containerRef,
    videoRef,
    player,
    labels,
    icons,
    slots,
    rootProps,
    videoProps,
  }
}
