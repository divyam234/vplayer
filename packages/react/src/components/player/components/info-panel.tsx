import { useEffect, useState, type FC } from 'react'

import { usePlayerState, usePlayerContext } from '../context'

const NETWORK_LABELS = ['Empty', 'Idle', 'Loading', 'No Source'] as const

interface VideoMeta {
  width: number
  height: number
  droppedFrames: number
  networkState: number
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

  if (!infoPanelVisible) return null
  const [meta, setMeta] = useState<VideoMeta>({
    width: 0,
    height: 0,
    droppedFrames: 0,
    networkState: 0,
  })

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const update = () => {
      setMeta({
        width: video.videoWidth,
        height: video.videoHeight,
        droppedFrames: (video as any).webkitDroppedFrameCount ?? 0,
        networkState: video.networkState,
      })
    }

    update()
    video.addEventListener('loadedmetadata', update)
    const interval = setInterval(update, 1000)

    return () => {
      video.removeEventListener('loadedmetadata', update)
      clearInterval(interval)
    }
  }, [videoRef])

  return (
    <div
      className="vplayer__info-panel"
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 50,
        padding: '8px 12px',
        borderRadius: 6,
        fontSize: 12,
        fontFamily: 'monospace',
        lineHeight: 1.6,
        background: 'rgba(0,0,0,0.7)',
        color: 'rgba(255,255,255,0.85)',
      }}
    >
      <div>Version: 1.0.0</div>
      <div>Duration: {state.duration.toFixed(2)}s</div>
      <div>
        Resolution: {meta.width}&times;{meta.height}
      </div>
      <div>Current: {state.currentTime.toFixed(2)}s</div>
      <div>Volume: {(state.volume * 100).toFixed(0)}%</div>
      <div>Rate: {state.playbackRate}x</div>
      <div>Dropped: {meta.droppedFrames}</div>
      <div>Network: {NETWORK_LABELS[meta.networkState] ?? meta.networkState}</div>
    </div>
  )
}
