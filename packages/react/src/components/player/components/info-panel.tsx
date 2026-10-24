import { useEffect, useState, type FC } from 'react'

import packageMetadata from '../../../../package.json'
import { usePlayerRemote, usePlayerState, usePlayerContext } from '../context'

// Technical HTMLMediaElement constants, not untranslated UI descriptions.
const NETWORK_LABELS = ['NETWORK_EMPTY', 'NETWORK_IDLE', 'NETWORK_LOADING', 'NETWORK_NO_SOURCE'] as const
const READY_LABELS = [
  'HAVE_NOTHING',
  'HAVE_METADATA',
  'HAVE_CURRENT_DATA',
  'HAVE_FUTURE_DATA',
  'HAVE_ENOUGH_DATA',
] as const

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
  const { videoRef, i18n, labels } = usePlayerContext()
  const remote = usePlayerRemote()
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
      <button
        type="button"
        className="vplayer__info-panel-close"
        aria-label={i18n.t('closeDebugStats')}
        onClick={remote.toggleInfoPanel}
      >
        ×
      </button>
      <div>
        {i18n.t('debugVersion')}: {packageMetadata.version}
      </div>
      <div>
        {i18n.t('debugStatus')}: {state.status}
      </div>
      <div className="vplayer__info-source" title={state.source?.src}>
        {i18n.t('debugSource')}: {state.source?.src ?? '—'}
      </div>
      <div>
        {i18n.t('debugType')}: {state.source?.type ?? i18n.t('autoDetect')}
      </div>
      <div>
        {labels.quality}: {state.activeQuality || '—'}
      </div>
      <div>
        {i18n.t('debugDuration')}: {state.duration > 0 ? `${state.duration.toFixed(2)}s` : '—'}
      </div>
      <div>
        {i18n.t('debugResolution')}: {meta.width > 0 && meta.height > 0 ? `${meta.width}×${meta.height}` : '—'}
      </div>
      <div>
        {i18n.t('debugCurrent')}: {state.currentTime.toFixed(2)}s
      </div>
      <div>
        {i18n.t('debugBuffered')}: {state.bufferedPercent.toFixed(1)}%
      </div>
      <div>
        {i18n.t('volume')}: {(state.volume * 100).toFixed(0)}%
      </div>
      <div>
        {i18n.t('debugRate')}: {state.playbackRate}x
      </div>
      <div>
        {i18n.t('debugFrames')}:{' '}
        {i18n.t('debugDroppedFrames', undefined, {
          dropped: meta.droppedFrames ?? '—',
          total: meta.totalFrames ?? '—',
        })}
      </div>
      <div>
        {i18n.t('debugNetwork')}: {NETWORK_LABELS[meta.networkState] ?? meta.networkState}
      </div>
      <div>
        {i18n.t('debugReady')}: {READY_LABELS[meta.readyState] ?? meta.readyState}
      </div>
      <div>
        {labels.fullscreen}: {i18n.t(state.isFullscreen ? 'yes' : 'no')}
      </div>
    </div>
  )
}
