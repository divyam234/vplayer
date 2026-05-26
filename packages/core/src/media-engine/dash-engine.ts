/**
 * DashMediaEngine — MediaEngine backed by dash.js (MPEG-DASH).
 *
 * Uses dash.js to play DASH streams via MSE.
 *
 * Usage:
 * ```ts
 * const player = createPlayer({
 *   engine: (video) => new DashMediaEngine(video, {
 *     src: 'https://example.com/stream.mpd',
 *   }),
 * })
 * ```
 */

import type { MediaPlayerClass, MediaPlayerSettingClass } from 'dashjs'

import { BaseMediaEngine } from './base-engine'

export interface DashMediaEngineOptions {
  /** Source URL (.mpd manifest). */
  src?: string
  /** Optional dash.js settings (MediaPlayerSettingClass). */
  dashConfig?: MediaPlayerSettingClass
}

export class DashMediaEngine extends BaseMediaEngine {
  private dashPlayer: MediaPlayerClass | null = null
  private dashSrc: string | undefined
  private dashConfig?: MediaPlayerSettingClass

  constructor(video: HTMLVideoElement, options?: DashMediaEngineOptions) {
    super(video)
    this.dashSrc = options?.src
    this.dashConfig = options?.dashConfig
    if (this.dashSrc) {
      this.initDash()
    }
  }

  private initDash(): void {
    this.initDashAsync().catch((err) => {
      console.error('[vplayer] DashMediaEngine: failed to initialise dash.js', err)
      this.emit('error', {
        message: err instanceof Error ? err.message : 'Failed to initialise dash.js',
      })
    })
  }

  private async initDashAsync(): Promise<void> {
    if (this.destroyed || !this.dashSrc) return

    const dashModule = await import('dashjs')
    const {
      MediaPlayer: MediaPlayerFactory,
      MediaPlayer: { events: PlayerEvents },
    } = dashModule

    if (this.destroyed) return

    this.dashPlayer = MediaPlayerFactory().create()

    // Apply optional config before initialisation.
    if (this.dashConfig) {
      this.dashPlayer.updateSettings(this.dashConfig)
    }

    // Map dash.js playback events to engine events.
    this.dashPlayer.on(PlayerEvents.PLAYBACK_PLAYING, () => this.emit('play'))
    this.dashPlayer.on(PlayerEvents.PLAYBACK_PAUSED, () => this.emit('pause'))
    this.dashPlayer.on(PlayerEvents.PLAYBACK_ENDED, () => this.emit('ended'))
    this.dashPlayer.on(PlayerEvents.PLAYBACK_TIME_UPDATED, () => this.emit('timeupdate'))
    this.dashPlayer.on(PlayerEvents.PLAYBACK_WAITING, () => this.emit('waiting'))
    this.dashPlayer.on(PlayerEvents.PLAYBACK_LOADED_DATA, () => this.emit('canplay'))
    this.dashPlayer.on(PlayerEvents.PLAYBACK_METADATA_LOADED, () => this.emit('loadedmetadata'))
    this.dashPlayer.on(PlayerEvents.ERROR, () => {
      this.emit('error', {
        message: 'DASH playback error',
      })
    })

    // Attach to the video element and load the source.
    this.dashPlayer.attachView(this.element)
    this.dashPlayer.attachSource(this.dashSrc)
  }

  override load(): void {
    if (this.dashPlayer && this.dashSrc) {
      this.dashPlayer.attachSource(this.dashSrc)
    } else if (this.dashSrc) {
      // DASH not yet initialised – try again.
      this.initDash()
    } else {
      super.load()
    }
  }

  override destroy(): void {
    if (this.destroyed) return
    // The base destroy() sets destroyed=true, detaches DOM listeners, clears event map.
    super.destroy()
    if (this.dashPlayer) {
      this.dashPlayer.destroy()
      this.dashPlayer = null
    }
  }
}
