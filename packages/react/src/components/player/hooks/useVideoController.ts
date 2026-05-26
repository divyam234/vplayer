import { useCallback, useMemo, useRef } from 'react'
import { defaultPlayerIcons, defaultPlayerLabels } from '../defaults'
import { createMediaStore } from '../media-store'
import type { AspectRatioState, FlipState } from '../plugin-api'
import type { PlayerProps } from '../types'

export interface VideoControllerResult {
  containerRef: React.RefObject<HTMLDivElement | null>
  videoRef: React.RefObject<HTMLVideoElement | null>
  mediaStore: ReturnType<typeof createMediaStore>
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
  labels: ReturnType<typeof buildLabels>
  icons: ReturnType<typeof buildIcons>
  slots: PlayerProps['slots']
}

function buildLabels(props: PlayerProps) {
  return { ...defaultPlayerLabels, ...props.labels }
}

function buildIcons(props: PlayerProps) {
  return { ...defaultPlayerIcons, ...props.icons }
}

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

  const takeScreenshot = useCallback(() => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vplayer-screenshot-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }, [videoRef])

  const setFlip = useCallback((flip: FlipState) => {
    const video = videoRef.current
    if (!video) return
    let transform = ''
    if (flip === 'horizontal') transform = 'scaleX(-1)'
    if (flip === 'vertical') transform = 'scaleY(-1)'
    if (flip === 'normal') transform = ''
    video.style.transform = transform
    mediaStore.setState((prev) => ({ ...prev, flip }))
  }, [mediaStore, videoRef])

  const setAspectRatio = useCallback((ratio: AspectRatioState) => {
    const video = videoRef.current
    if (!video) return
    let objectFit = 'contain'
    if (ratio === 'fill') objectFit = 'fill'
    if (ratio === '16:9' || ratio === '4:3') {
      objectFit = 'contain'
      video.style.aspectRatio = ratio
    } else {
      video.style.aspectRatio = ''
    }
    video.style.objectFit = objectFit
    mediaStore.setState((prev) => ({ ...prev, aspectRatio: ratio }))
  }, [mediaStore, videoRef])

  const toggleLoop = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.loop = !video.loop
    mediaStore.setState((prev) => ({ ...prev, isLooping: video.loop }))
  }, [mediaStore, videoRef])

  const toggleInfoPanel = useCallback(() => {
    mediaStore.setState((prev) => ({ ...prev, infoPanelVisible: !prev.infoPanelVisible }))
  }, [mediaStore])

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

  const labels = useMemo(() => buildLabels(props), [props.labels])
  const icons = useMemo(() => buildIcons(props), [props.icons])
  const slots = props.slots ?? {}

  const mediaRemote = useMemo(
    () => ({
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
      takeScreenshot,
      setFlip,
      setAspectRatio,
      toggleLoop,
      toggleInfoPanel,
    }),
    [
      play, pause, togglePlay, seek, skip,
      setVolume, toggleMute, setPlaybackRate,
      toggleFullscreen, togglePiP, takeScreenshot,
      setFlip, setAspectRatio, toggleLoop, toggleInfoPanel,
      setActiveSubtitle, setActiveQuality,
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
      onError: () => {
        const video = videoRef.current
        const message = video?.error?.message ?? 'Video playback error'
        mediaStore.setState((prev) => ({
          ...prev,
          error: { message, reconnectAttempt: (prev.error?.reconnectAttempt ?? 0) },
        }))
        props.onError?.(message)
      },
    }),
    [mediaStore, props.onEnded, props.onTimeUpdate, props.onError],
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

  return {
    containerRef,
    videoRef,
    mediaStore,
    mediaRemote,
    labels,
    icons,
    slots,
    rootProps,
    videoProps,
  }
}
