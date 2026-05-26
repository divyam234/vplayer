/**
 * usePlayer — Low-level hook per @vplayer/framework adapter contract.
 *
 * Creates a PlayerInstance via createPlayer() from @vplayer/core and bridges
 * its @tanstack/store to Solid's reactivity via createSignal + onCleanup.
 *
 * Unlike the <VideoPlayer> component, this hook gives you full control
 * over rendering. Use it when building custom player UIs.
 *
 * ⚠️ Solid convention — `state` is a getter function `() => MediaState`,
 * NOT a direct value. Call `state()` in JSX to track reactivity:
 *
 * ```tsx
 * const { state, remote } = usePlayer({ src: 'video.mp4' })
 * return <div>{state().currentTime}</div>
 * ```
 *
 * @example
 * ```tsx
 * function MyPlayer(props: { src: string }) {
 *   let containerRef: HTMLDivElement | undefined
 *   let videoRef: HTMLVideoElement | undefined
 *   const { attach, detach, remote, state } = usePlayer(props)
 *
 *   onMount(() => {
 *     attach(containerRef!, videoRef!)
 *   })
 *   onCleanup(() => detach())
 *
 *   return (
 *     <div ref={containerRef}>
 *       <video ref={videoRef} />
 *       <button onClick={() => remote.togglePlay()}>
 *         {state().isPlaying ? 'Pause' : 'Play'}
 *       </button>
 *     </div>
 *   )
 * }
 * ```
 */

import { createPlayer } from '@vplayer/core'
import type { MediaState, PlayerOptions, PlayerPlugin } from '@vplayer/core'
import type { UsePlayerResult } from '@vplayer/framework'
import { createMemo, onCleanup } from 'solid-js'

import { useStoreSignal } from './use-store'

/**
 * Solid-specific return type override.
 * In Solid, reactive values are getter functions `() => T`.
 * The framework contract's UsePlayerResult.state is typed as a plain value
 * (React idiom), so we override `state` to be a getter.
 */
export interface SolidUsePlayerResult extends Omit<UsePlayerResult, 'state'> {
  state: () => MediaState
}

export function usePlayer(options: PlayerOptions): SolidUsePlayerResult {
  // Player instance is created once via createMemo (stable identity)
  const player = createMemo(() => createPlayer(options))
  const p = player()

  // ── Reactive state via Solid store bridge ──
  // Returns a getter: call state() in JSX
  const state = useStoreSignal(p.store, (s) => s)

  // ── Stable references (player identity never changes) ──
  const remote = p.remote
  const attach = (container: HTMLDivElement, video: HTMLVideoElement) => p.mount(video, container)
  const detach = () => p.unmount()
  const usePlugin = (plugin: PlayerPlugin) => {
    p.initPlugins([plugin])
  }
  const updateOptions = (opts: PlayerOptions) => {
    p.updateOptions({
      subtitles: opts.subtitles,
      qualities: opts.qualities,
    })
  }

  // ── Cleanup on unmount ──
  onCleanup(() => p.destroy())

  return {
    state,
    remote,
    attach,
    detach,
    use: usePlugin,
    updateOptions,
    instance: p,
  }
}
