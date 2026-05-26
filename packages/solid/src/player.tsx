import { defaultPlayerIcons, defaultPlayerLabels } from '@vplayer/core'
import { mergeLabels, mergeIcons } from '@vplayer/framework'
import clsx from 'clsx'
import { createEffect, createMemo, onCleanup, onMount } from 'solid-js'

import { AutoResumeOverlay } from './components/auto-resume-overlay'
import { ContextMenu } from './components/context-menu'
import { ErrorOverlay } from './components/error-overlay'
import { InfoPanel } from './components/info-panel'
import { DefaultVideoLayout } from './components/layout/default-video-layout'
import { MiniProgressBar } from './components/mini-progress-bar'
import { TopGradient } from './components/overlays'
import { PlayerContext } from './context'
import { useControlsVisibility } from './hooks/use-controls-visibility'
import { usePlayerGestures } from './hooks/use-mobile-gestures'
import { usePlayer } from './hooks/use-player'
import { useStoreSignal } from './hooks/use-store'
import { createPluginAPI } from './plugin-api'
import type { PlayerProps, PlayerContextValue } from './types'

export function VideoPlayer(props: PlayerProps) {
  const containerRef = { current: null as HTMLDivElement | null }
  const videoRef = { current: null as HTMLVideoElement | null }

  const { children, slots: slotsProp, class: className, ...options } = props
  const slots = slotsProp ?? {}

  // ── Core player via contract hook ──
  const { instance, attach, detach } = usePlayer(options)

  // ── Mount/unmount lifecycle ──
  onMount(() => {
    const video = videoRef.current
    const container = containerRef.current
    if (video && container) {
      attach(container, video)
    }
  })
  onCleanup(() => detach())

  // ── Sync reactive props to core ──
  createEffect(() => {
    instance.updateOptions({
      subtitles: options.subtitles,
      qualities: options.qualities,
    })
  })

  createEffect(() => {
    instance.setThumbnails(options.thumbnails)
  })

  // ── Initialize plugins ──
  createEffect(() => {
    const cleanup = instance.initPlugins(options.plugins ?? [])
    onCleanup(() => cleanup())
  })

  // ── Controls auto-hide (UI concern) ──
  const controls = useControlsVisibility(instance.store)
  const controlsVisible = useStoreSignal(instance.store, (s) => s.controlsVisible)

  // ── Keyboard events through core's hotkey registry ──
  const onKeyDown = (event: KeyboardEvent) => {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      (event.target as HTMLElement).isContentEditable
    )
      return
    controls.showControls()
    instance.hotkeys.handleKeyDown(event)
  }

  // ── Resolve labels, icons ──
  const labels = createMemo(() => mergeLabels(defaultPlayerLabels, options.labels))
  const iconMap = createMemo(() => mergeIcons(defaultPlayerIcons, options.icons))

  // ── Gestures: touch → show controls + forward gesture events ──
  const gestures = usePlayerGestures(instance.store, instance.remote)
  const onTouchStart = (e: TouchEvent) => {
    controls.showControls()
    gestures.onTouchStart(e)
  }
  const onTouchMove = (e: TouchEvent) => gestures.onTouchMove(e)
  const onTouchEnd = (e: TouchEvent) => gestures.onTouchEnd(e)

  // ── Context value ──
  const ctx: PlayerContextValue = {
    containerRef,
    videoRef,
    labels: labels(),
    icons: iconMap(),
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

  return (
    <PlayerContext.Provider value={ctx}>
      <div
        ref={(el) => {
          containerRef.current = el as HTMLDivElement
        }}
        tabIndex={0}
        class={clsx('vplayer', !controlsVisible() && 'vplayer--controls-hidden', className)}
        onKeyDown={onKeyDown}
        onMouseMove={controls.rootHandlers.onMouseMove}
        onMouseEnter={controls.rootHandlers.onMouseEnter}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onDblClick={() => instance.remote.toggleFullscreen()}
      >
        {/* Media event handlers managed internally by engine (NativeVideoEngine) */}
        <video
          ref={(el) => {
            videoRef.current = el as HTMLVideoElement
          }}
          class="vplayer__video"
          poster={options.poster}
          autoplay={options.autoPlay}
          preload="metadata"
          playsinline
          onClick={() => instance.remote.togglePlay()}
        >
          <source src={options.src ?? ''} />
        </video>

        {children ?? <DefaultVideoLayout />}
        <TopGradient />

        {/* Overlays & floating UI */}
        <MiniProgressBar />
        <ErrorOverlay />
        <AutoResumeOverlay />
        <ContextMenu />
        <InfoPanel />

        {/* Click layer to toggle play when controls are hidden */}
        <div
          class={clsx('vplayer__click-layer', controlsVisible() && 'vplayer__click-layer--hidden')}
          onClick={() => instance.remote.togglePlay()}
        />
      </div>
    </PlayerContext.Provider>
  )
}
