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
import type { DeepPartial } from '@vplayer/framework'
import { mergeLabels, mergeIcons } from '@vplayer/framework'
import { createEffect, createMemo, onCleanup, onMount, type JSX } from 'solid-js'

import { PlayerContext } from './context'
import { usePlayer } from './hooks/use-player'
import { createPluginAPI } from './plugin-api'
import type { PlayerContextValue, PlayerSlots } from './types'

export interface PlayerProviderProps {
  options: Parameters<typeof usePlayer>[0]
  labels?: DeepPartial<PlayerLabels>
  icons?: DeepPartial<PlayerIcons>
  slots?: PlayerSlots
  children?: JSX.Element
}

export function PlayerProvider(props: PlayerProviderProps) {
  const containerRef = { current: null as HTMLDivElement | null }
  const videoRef = { current: null as HTMLVideoElement | null }

  const { instance, attach, detach } = usePlayer(props.options)
  const slots = props.slots ?? {}

  // ── Mount/unmount lifecycle ──
  onMount(() => {
    const container = containerRef.current
    const video = videoRef.current
    if (container && video) {
      attach(container, video)
    }
  })
  onCleanup(() => detach())

  // ── Sync reactive props to core ──
  createEffect(() => {
    instance.updateOptions({
      subtitles: props.options.subtitles,
      qualities: props.options.qualities,
    })
  })

  createEffect(() => {
    instance.setThumbnails(props.options.thumbnails)
  })

  // ── Initialize plugins ──
  createEffect(() => {
    const cleanup = instance.initPlugins(props.options.plugins ?? [])
    onCleanup(() => cleanup())
  })

  // ── Resolve labels, icons ──
  const labels = createMemo(() => mergeLabels(defaultPlayerLabels, props.labels))
  const icons = createMemo(() => mergeIcons(defaultPlayerIcons, props.icons))

  const ctx: PlayerContextValue = {
    containerRef,
    videoRef,
    labels: labels(),
    icons: icons(),
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
  }

  return <PlayerContext.Provider value={ctx}>{props.children}</PlayerContext.Provider>
}
