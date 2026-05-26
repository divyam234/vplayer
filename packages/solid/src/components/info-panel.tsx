import { createEffect, createSignal, Show } from 'solid-js'

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
export function InfoPanel() {
  const state = usePlayerState()
  const infoPanelVisible = usePlayerState('infoPanelVisible')
  const { videoRef } = usePlayerContext()
  const [meta, setMeta] = createSignal<VideoMeta>({
    width: 0,
    height: 0,
    droppedFrames: 0,
    networkState: 0,
  })

  createEffect(() => {
    if (!infoPanelVisible()) return
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
  })

  return (
    <Show when={infoPanelVisible()}>
      <div class="vplayer__info-panel">
        <div>Version: 1.0.0</div>
        <div>Duration: {state().duration.toFixed(2)}s</div>
        <div>
          Resolution: {meta().width}&times;{meta().height}
        </div>
        <div>Current: {state().currentTime.toFixed(2)}s</div>
        <div>Volume: {(state().volume * 100).toFixed(0)}%</div>
        <div>Rate: {state().playbackRate}x</div>
        <div>Dropped: {meta().droppedFrames}</div>
        <div>Network: {NETWORK_LABELS[meta().networkState] ?? meta().networkState}</div>
      </div>
    </Show>
  )
}
