import { useCallback, useMemo, useRef } from 'react'
import { defaultPlayerIcons, defaultPlayerLabels } from '../defaults'
import { createMediaStore } from '../media-store'
import type { PlayerContextValue, PlayerProps } from '../types'

export function useVideoController(props: PlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const mediaStore = useMemo(() => createMediaStore(props), [])

  const play = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.play().catch(() => {})
  }, [])

  const pause = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.pause()
  }, [])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused || video.ended) {
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [])

  const seek = useCallback((time: number) => {
    const video = videoRef.current
    if (video) video.currentTime = time
  }, [])

  const skip = useCallback((seconds: number) => {
    const video = videoRef.current
    if (!video) return
    const newTime = Math.max(0, Math.min(video.currentTime + seconds, video.duration || 0))
    video.currentTime = newTime
  }, [])

  const setVolume = useCallback((v: number) => {
    const video = videoRef.current
    if (!video) return
    video.volume = v
    if (v > 0) {
      video.muted = false
    }
    mediaStore.setState((prev) => ({ ...prev, volume: v, isMuted: video.muted }))
  }, [mediaStore])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    mediaStore.setState((prev) => ({ ...prev, isMuted: video.muted }))
  }, [mediaStore])

  const setPlaybackRate = useCallback((rate: number) => {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = rate
    mediaStore.setState((prev) => ({ ...prev, playbackRate: rate }))
  }, [mediaStore])

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else {
      containerRef.current.requestFullscreen().catch(() => {})
    }
  }, [])

  const togglePiP = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {})
    } else {
      video.requestPictureInPicture().catch(() => {})
    }
  }, [])

  const setActiveSubtitle = useCallback(
    (track: (typeof mediaStore.state)['activeSubtitle']) => {
      mediaStore.setState((prev) => ({ ...prev, activeSubtitle: track }))
    },
    [mediaStore],
  )

  const setActiveQuality = useCallback(
    (q: string) => {
      mediaStore.setState((prev) => ({ ...prev, activeQuality: q }))
    },
    [mediaStore],
  )

  const contextValue: PlayerContextValue = useMemo(
    () => ({
      containerRef,
      videoRef,
      labels: { ...defaultPlayerLabels, ...props.labels },
      icons: { ...defaultPlayerIcons, ...props.icons },
      slots: props.slots ?? {},
      mediaStore,
      mediaRemote: {
        play,
        pause,
        togglePlay,
        seek,
        skip,
        setVolume,
        toggleMute,
        setPlaybackRate,
        toggleFullscreen,
        togglePiP,
        setActiveSubtitle,
        setActiveQuality,
      },
    }),
    [
      props.labels,
      props.icons,
      props.slots,
      mediaStore,
      play,
      pause,
      togglePlay,
      seek,
      skip,
      setVolume,
      toggleMute,
      setPlaybackRate,
      toggleFullscreen,
      togglePiP,
      setActiveSubtitle,
      setActiveQuality,
    ],
  )

  const videoHandlers = useMemo(
    () => ({
      onPlay: () => mediaStore.setState((prev) => ({ ...prev, isPlaying: true, isPaused: false, isEnded: false })),
      onPause: () => mediaStore.setState((prev) => ({ ...prev, isPlaying: false, isPaused: !prev.isEnded, controlsVisible: true })),
      onEnded: () => {
        mediaStore.setState((prev) => ({ ...prev, isPlaying: false, isPaused: false, isEnded: true, controlsVisible: true }))
        props.onEnded?.()
      },
      onTimeUpdate: () => {
        const video = videoRef.current
        if (!video) return
        mediaStore.setState((prev) => ({ ...prev, currentTime: video.currentTime }))
        props.onTimeUpdate?.(video.currentTime)
      },
      onLoadedMetadata: () => {
        const video = videoRef.current
        if (!video) return
        mediaStore.setState((prev) => ({
          ...prev,
          duration: video.duration,
          volume: video.volume,
          isMuted: video.muted,
          playbackRate: video.playbackRate,
        }))
      },
      onProgress: () => {
        const video = videoRef.current
        if (!video || video.buffered.length === 0) return
        const end = video.buffered.end(video.buffered.length - 1)
        mediaStore.setState((prev) => ({ ...prev, bufferedPercent: video.duration > 0 ? (end / video.duration) * 100 : 0 }))
      },
      onWaiting: () => mediaStore.setState((prev) => ({ ...prev, isBuffering: true })),
      onCanPlay: () => mediaStore.setState((prev) => ({ ...prev, isBuffering: false })),
    }),
    [mediaStore, props.onEnded, props.onTimeUpdate],
  )

  const rootProps = useMemo(
    () => ({
      ref: containerRef,
      tabIndex: 0,
      onDoubleClick: toggleFullscreen,
    }),
    [toggleFullscreen],
  )

  const videoProps = useMemo(
    () => ({
      ref: videoRef,
      className: 'vplayer__video',
      poster: props.poster,
      autoPlay: props.autoPlay,
      preload: 'metadata' as const,
      playsInline: true,
      onClick: togglePlay,
      ...videoHandlers,
    }),
    [props.poster, props.autoPlay, togglePlay, videoHandlers],
  )

  return { contextValue, mediaStore, rootProps, videoProps }
}
