/**
 * usePlayer — Low-level hook per @vplayer/framework adapter contract.
 *
 * Creates a PlayerInstance and subscribes to state via
 * @tanstack/react-store's useStore. Returns a UsePlayerResult.
 *
 * Unlike the <VideoPlayer> component, this hook gives you full control
 * over rendering. Use it when building custom player UIs.
 *
 * @example
 * ```tsx
 * function MyPlayer({ src }: { src: string }) {
 *   const { attach, detach, remote, state } = usePlayer({ src })
 *   const containerRef = useRef<HTMLDivElement>(null)
 *   const videoRef = useRef<HTMLVideoElement>(null)
 *
 *   useEffect(() => {
 *     attach(containerRef.current!, videoRef.current!)
 *     return () => detach()
 *   }, [attach, detach])
 *
 *   return (
 *     <div ref={containerRef}>
 *       <video ref={videoRef} />
 *       <button onClick={() => remote.togglePlay()}>
 *         {state.isPlaying ? 'Pause' : 'Play'}
 *       </button>
 *     </div>
 *   )
 * }
 * ```
 */

import { useCallback, useEffect, useMemo } from 'react'
import { useStore } from '@tanstack/react-store'
import { createPlayer } from '@vplayer/core'
import type { PlayerOptions, PlayerPlugin } from '@vplayer/core'
import type { UsePlayerResult } from '@vplayer/framework'

export function usePlayer(options: PlayerOptions): UsePlayerResult {
  const player = useMemo(() => createPlayer(options), [])

  // ── Reactive state via @tanstack/react-store ──
  const state = useStore(player.store)

  // ── All callbacks are stable (player never changes) ──
  const remote = useMemo(() => player.remote, [player])

  const attach = useCallback(
    (container: HTMLDivElement, video: HTMLVideoElement) => player.mount(video, container),
    [player],
  )

  const detach = useCallback(
    () => player.unmount(),
    [player],
  )

  const usePlugin = useCallback(
    (plugin: PlayerPlugin) => { player.initPlugins([plugin]) },
    [player],
  )

  const updateOptions = useCallback(
    (opts: PlayerOptions) => {
      player.updateOptions({
        subtitles: opts.subtitles,
        qualities: opts.qualities,
      })
    },
    [player],
  )

  // ── Cleanup on unmount ──
  useEffect(() => () => player.destroy(), [player])

  return {
    state,
    remote,
    attach,
    detach,
    use: usePlugin,
    updateOptions,
    instance: player,
  }
}
