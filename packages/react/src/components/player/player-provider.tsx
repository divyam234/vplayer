/**
 * PlayerProvider — Standalone context provider per @vplayer/framework contract.
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
import { mergeLabels, mergeIcons } from '@vplayer/framework'
import type { DeepPartial } from '@vplayer/framework'
import { useRef, useEffect, type FC, type ReactNode } from 'react'

import { PlayerContext } from './context'
import { usePlayer } from './hooks/use-player'
import { createPluginAPI } from './plugin-api'
import type { PlayerContextValue, PlayerSlots } from './types'

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

  const subtitles = options.subtitles
  const qualities = options.qualities
  const thumbnails = options.thumbnails
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
    instance.updateOptions({ subtitles, qualities })
  }, [subtitles, qualities, instance])

  useEffect(() => {
    instance.setThumbnails(thumbnails)
  }, [thumbnails, instance])

  // ── Initialize plugins ──
  useEffect(() => {
    return instance.initPlugins(plugins ?? [])
  }, [plugins, instance])

  // ── Resolve labels, icons ──
  const labels = mergeLabels(defaultPlayerLabels, labelOverrides)
  const icons = mergeIcons(defaultPlayerIcons, iconOverrides)

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
    instance,
    createPluginAPI,
  }

  return <PlayerContext.Provider value={ctx}>{children}</PlayerContext.Provider>
}
