/**
 * PlayerProvider — Standalone context provider per @vplayer/react contract.
 *
 * Creates a PlayerInstance via usePlayer() and makes it available
 * to all descendant components via PlayerContext.
 *
 * Handles mount/unmount lifecycle, reactive option syncing (subtitles,
 * qualities, thumbnails), and plugin initialization — giving you a
 * complete player context without opinionated UI.
 *
 * Use this when you want <VideoPlayer>'s component tree but need
 * to control the player instance lifecycle yourself.
 *
 * @example
 * ```tsx
 * <PlayerProvider options={{ src: 'video.mp4' }}>
 *   <DefaultVideoLayout />
 * </PlayerProvider>
 * ```
 */

import { defaultPlayerIcons, defaultPlayerLabels } from '@vplayer/core'
import type { PlayerIcons, PlayerLabels } from '@vplayer/core'
import { useRef, useEffect, useMemo, type FC, type ReactNode } from 'react'

import { PlayerContext } from './context'
import { createDisabledMiniPlayerState } from './hooks/use-mini-player-state'
import { usePlayer } from './hooks/use-player'
import { createPluginAPI } from './plugin-api'
import type { PlayerContextValue, PlayerSlots } from './types'
import { mergeLabels, mergeIcons } from './utils/merge'
import type { DeepPartial } from './utils/merge'

export interface PlayerProviderProps {
  options: Parameters<typeof usePlayer>[0]
  labels?: DeepPartial<PlayerLabels>
  icons?: DeepPartial<PlayerIcons>
  slots?: PlayerSlots
  children?: ReactNode
}

export const PlayerProvider: FC<PlayerProviderProps> = ({
  options,
  labels: labelOverrides,
  icons: iconOverrides,
  slots = {},
  children,
}) => {
  const player = usePlayer(options)
  const { instance } = player
  const containerRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const src = options.src
  const type = options.type
  const title = options.title
  const poster = options.poster
  const autoPlay = options.autoPlay
  const subtitles = options.subtitles
  const qualities = options.qualities
  const thumbnails = options.thumbnails
  const transformThumbnailVTT = options.transformThumbnailVTT
  const hasThumbnailVTTTransform = transformThumbnailVTT !== undefined
  const plugins = options.plugins

  // ── Mount/unmount lifecycle ──
  useEffect(() => {
    const container = containerRef.current
    const video = videoRef.current
    if (container && video) {
      player.attach(container, video)
    }
    return () => player.detach()
  }, [player.attach, player.detach])

  // ── Sync reactive props to core ──
  useEffect(() => {
    instance.updateOptions({
      src,
      type,
      title,
      poster,
      autoPlay,
      subtitles,
      qualities,
      thumbnails,
      transformThumbnailVTT,
    })
  }, [src, type, title, poster, autoPlay, subtitles, qualities, thumbnails, hasThumbnailVTTTransform, instance])

  // ── Initialize plugins ──
  useEffect(() => {
    return instance.initPlugins(plugins ?? [])
  }, [plugins, instance])

  // ── Resolve labels, icons ──
  const labels = mergeLabels(defaultPlayerLabels, labelOverrides)
  const icons = mergeIcons(defaultPlayerIcons, iconOverrides)
  const miniPlayer = useMemo(() => createDisabledMiniPlayerState(), [])
  const thumbnailPreview = useMemo(
    () => ({ enabled: true, width: 180, height: 101, gap: 10, showTime: true, fit: 'cover' as const }),
    [],
  )

  const ctx: PlayerContextValue = {
    containerRef,
    videoRef,
    labels,
    icons,
    slots,
    mediaStore: instance.store,
    mediaRemote: instance.remote,
    events: instance.events,
    storage: instance.storage,
    i18n: instance.i18n,
    hotkeys: instance.hotkeys,
    engine: instance.engine,
    instance,
    createPluginAPI,
    controlsVisibility: { pinControls: () => () => {} },
    miniPlayer,
    thumbnailPreview,
  }

  return <PlayerContext.Provider value={ctx}>{children}</PlayerContext.Provider>
}
