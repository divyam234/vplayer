import { useEffect, useState, type FC } from 'react'

import packageMetadata from '../../../../package.json'
import { usePlayerState, usePlayerContext } from '../context'

const NETWORK_LABELS = ['Empty', 'Idle', 'Loading', 'No Source'] as const
const READY_LABELS = ['Nothing', 'Metadata', 'Current Data', 'Future Data', 'Enough Data'] as const

interface VideoMeta {
  width: number
  height: number
  droppedFrames: number | null
  totalFrames: number | null
  networkState: number
  readyState: number
}

type VideoWithWebKitMetrics = HTMLVideoElement & {
  webkitDroppedFrameCount?: number
  webkitDecodedFrameCount?: number
}

/**
 * Debug overlay panel rendered in the top-right corner of the player.
 *
 * Displays version, duration, resolution, current time, volume,
 * playback rate, dropped frames, and network state in a compact
 * monospace grid.
 */
export const InfoPanel: FC = () => {
  const state = usePlayerState()
  const infoPanelVisible = usePlayerState('infoPanelVisible')
  const { videoRef } = usePlayerContext()
  const [meta, setMeta] = useState<VideoMeta>({
    width: 0,
    height: 0,
    droppedFrames: null,
    totalFrames: null,
    networkState: 0,
    readyState: 0,
  })

  useEffect(() => {
    if (!infoPanelVisible) return
    const video = videoRef.current
    if (!video) return

    const update = () => {
      const quality = typeof video.getVideoPlaybackQuality === 'function' ? video.getVideoPlaybackQuality() : null
      const webkitVideo = video as VideoWithWebKitMetrics
      setMeta({
        width: video.videoWidth,
        height: video.videoHeight,
        droppedFrames: quality?.droppedVideoFrames ?? webkitVideo.webkitDroppedFrameCount ?? null,
        totalFrames: quality?.totalVideoFrames ?? webkitVideo.webkitDecodedFrameCount ?? null,
        networkState: video.networkState,
        readyState: video.readyState,
      })
    }

    update()
    video.addEventListener('loadedmetadata', update)
    const interval = setInterval(update, 1000)

    return () => {
      video.removeEventListener('loadedmetadata', update)
      clearInterval(interval)
    }
  }, [infoPanelVisible, videoRef])

  if (!infoPanelVisible) return null

  return (
    <div className="vplayer__info-panel">
      <div>Version: {packageMetadata.version}</div>
      <div>Status: {state.status}</div>
      <div className="vplayer__info-source" title={state.source?.src}>
        Source: {state.source?.src ?? 'N/A'}
      </div>
      <div>Type: {state.source?.type ?? 'Auto-detect'}</div>
      <div>Quality: {state.activeQuality || 'N/A'}</div>
      <div>Duration: {state.duration > 0 ? `${state.duration.toFixed(2)}s` : 'N/A'}</div>
      <div>Resolution: {meta.width > 0 && meta.height > 0 ? `${meta.width}×${meta.height}` : 'N/A'}</div>
      <div>Current: {state.currentTime.toFixed(2)}s</div>
      <div>Buffered: {state.bufferedPercent.toFixed(1)}%</div>
      <div>Volume: {(state.volume * 100).toFixed(0)}%</div>
      <div>Rate: {state.playbackRate}x</div>
      <div>
        Frames: {meta.droppedFrames ?? 'N/A'} dropped / {meta.totalFrames ?? 'N/A'} total
      </div>
      <div>Network: {NETWORK_LABELS[meta.networkState] ?? meta.networkState}</div>
      <div>Ready: {READY_LABELS[meta.readyState] ?? meta.readyState}</div>
      <div>Fullscreen: {state.isFullscreen ? 'Yes' : 'No'}</div>
    </div>
  )
}
