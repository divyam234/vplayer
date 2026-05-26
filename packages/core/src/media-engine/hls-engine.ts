/**
 * HlsMediaEngine — MediaEngine backed by hls.js.
 *
 * Uses HLS.js to play HTTP Live Streaming (HLS) sources via MSE.
 * Falls through to native playback in browsers with native HLS support (Safari).
 *
 * Usage:
 * ```ts
 * const player = createPlayer({
 *   engine: (video) => new HlsMediaEngine(video, {
 *     src: 'https://example.com/stream.m3u8',
 *   }),
 * })
 * ```
 */

import type Hls from 'hls.js'

import { BaseMediaEngine } from './base-engine'

export interface HlsMediaEngineOptions {
  /** Source URL (.m3u8 playlist). */
  src?: string
  /** Optional hls.js configuration (Partial<import('hls.js').HlsConfig>). */
  hlsConfig?: Partial<import('hls.js').HlsConfig>
}

export class HlsMediaEngine extends BaseMediaEngine {
  private hls: Hls | null = null
  private hlsSrc: string | undefined
  private hlsConfig: Partial<import('hls.js').HlsConfig> | undefined

  constructor(video: HTMLVideoElement, options?: HlsMediaEngineOptions) {
    super(video)
    this.hlsSrc = options?.src
    this.hlsConfig = options?.hlsConfig
    if (this.hlsSrc) {
      this.initHls()
    }
  }

  private initHls(): void {
    // Dynamic import so hls.js is only loaded when this engine is used.
    this.initHlsAsync().catch((err) => {
      console.error('[vplayer] HlsMediaEngine: failed to initialise hls.js', err)
      this.emit('error', {
        message: err instanceof Error ? err.message : 'Failed to initialise hls.js',
      })
    })
  }

  private async initHlsAsync(): Promise<void> {
    if (this.destroyed || !this.hlsSrc) return

    const hlsModule = await import('hls.js')
    const HlsClass: typeof Hls = hlsModule.default ?? hlsModule

    if (this.destroyed) return

    // Check if HLS is natively supported (Safari) – use native playback instead.
    if (HlsClass.isSupported()) {
      this.hls = new HlsClass(this.hlsConfig ?? {})

      this.hls.on(HlsClass.Events.MANIFEST_PARSED, () => {
        const levelCount = this.hls!.levels.length
        this.emit('manifestparsed' as any, { levels: levelCount })
      })

      this.hls.on(HlsClass.Events.LEVEL_SWITCHED, (_event: any, data: any) => {
        this.emit('levelswitched' as any, { level: data.level })
      })

      this.hls.on(HlsClass.Events.ERROR, (_event: any, data: any) => {
        if (data.fatal) {
          switch (data.type) {
            case HlsClass.ErrorTypes.NETWORK_ERROR:
              // Try to recover network errors.
              this.hls?.startLoad()
              break
            case HlsClass.ErrorTypes.MEDIA_ERROR:
              // Try to recover media errors.
              this.hls?.recoverMediaError()
              break
            default:
              this.emit('error', {
                message: `HLS fatal error: ${data.type} — ${data.details}`,
              })
              break
          }
        }
      })

      this.hls.attachMedia(this.element)
      this.hls.loadSource(this.hlsSrc)
    } else if (this.element.canPlayType('application/vnd.apple.mpegurl') !== '') {
      // Native HLS support (Safari) — set src directly.
      this.element.src = this.hlsSrc
    } else {
      this.emit('error', {
        message: 'HLS is not supported in this browser',
      })
    }
  }

  override load(): void {
    if (this.hls && this.hlsSrc) {
      this.hls.loadSource(this.hlsSrc)
    } else if (this.hlsSrc) {
      // HLS not yet initialised – try again.
      this.initHls()
    } else {
      super.load()
    }
  }

  override destroy(): void {
    if (this.destroyed) return
    // The base destroy() sets destroyed=true, detaches DOM listeners, clears event map.
    super.destroy()
    if (this.hls) {
      this.hls.destroy()
      this.hls = null
    }
  }
}
