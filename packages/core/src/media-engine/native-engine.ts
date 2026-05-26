/**
 * NativeVideoEngine — MediaEngine backed by an HTMLVideoElement.
 *
 * Manages event listener lifecycle internally and exposes a clean
 * async/sync API for the player core.
 */

import type { MediaEngine, MediaEngineError, MediaEngineEvent, MediaEngineEventHandler } from './types'

type ListenerMap = Map<string, Set<MediaEngineEventHandler>>

export class NativeVideoEngine implements MediaEngine {
  readonly element: HTMLVideoElement
  private listeners: ListenerMap = new Map()
  private domListeners: Array<{ event: string; handler: EventListener }> = []
  private destroyed = false

  constructor(video: HTMLVideoElement) {
    this.element = video
    this.attachDOMListeners()
  }

  // ── Commands ────────────────────────────────────────────

  async play(): Promise<void> {
    try {
      await this.element.play()
    } catch {
      // AbortError is expected when play() is interrupted by pause()
      // Swallow silently — the consumer checks isPaused() to confirm state.
    }
  }

  pause(): void {
    this.element.pause()
  }

  seek(time: number): void {
    this.element.currentTime = time
  }

  setVolume(volume: number): void {
    this.element.volume = volume
  }

  setMuted(muted: boolean): void {
    this.element.muted = muted
  }

  setPlaybackRate(rate: number): void {
    this.element.playbackRate = rate
  }

  setLooping(loop: boolean): void {
    this.element.loop = loop
  }

  load(): void {
    this.element.load()
  }

  async requestPictureInPicture(): Promise<void> {
    try {
      await this.element.requestPictureInPicture()
    } catch {
      // Browser may reject PiP — swallow
    }
  }

  async exitPictureInPicture(): Promise<void> {
    try {
      await document.exitPictureInPicture()
    } catch {
      // May not be in PiP mode — swallow
    }
  }

  async screenshot(): Promise<Blob | null> {
    if (this.element.videoWidth === 0 || this.element.videoHeight === 0) return null
    const canvas = document.createElement('canvas')
    canvas.width = this.element.videoWidth
    canvas.height = this.element.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(this.element, 0, 0)
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png')
    })
  }

  // ── Read-only state ─────────────────────────────────────

  get currentTime(): number {
    return this.element.currentTime
  }

  get duration(): number {
    return this.element.duration
  }

  get volume(): number {
    return this.element.volume
  }

  get muted(): boolean {
    return this.element.muted
  }

  get playbackRate(): number {
    return this.element.playbackRate
  }

  get paused(): boolean {
    return this.element.paused
  }

  get ended(): boolean {
    return this.element.ended
  }

  get looping(): boolean {
    return this.element.loop
  }

  get buffered(): TimeRanges {
    return this.element.buffered
  }

  get videoWidth(): number {
    return this.element.videoWidth
  }

  get videoHeight(): number {
    return this.element.videoHeight
  }

  get error(): MediaEngineError | null {
    const elErr = this.element.error
    if (!elErr) return null
    return {
      message: elErr.message ?? 'Video playback error',
      code: elErr.code,
    }
  }

  // ── Events ──────────────────────────────────────────────

  on(event: MediaEngineEvent, handler: MediaEngineEventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler)
    return () => {
      this.listeners.get(event)?.delete(handler)
    }
  }

  private emit(event: MediaEngineEvent, ...args: any[]): void {
    if (this.destroyed) return
    this.listeners.get(event)?.forEach((handler) => {
      try {
        handler(...args)
      } catch (err) {
        console.error(`[vplayer] NativeVideoEngine error in "${event}":`, err)
      }
    })
  }

  // ── DOM listener wiring ─────────────────────────────────

  private attachDOMListeners(): void {
    const el = this.element
    const map: [string, MediaEngineEvent][] = [
      ['play', 'play'],
      ['pause', 'pause'],
      ['ended', 'ended'],
      ['timeupdate', 'timeupdate'],
      ['loadedmetadata', 'loadedmetadata'],
      ['progress', 'progress'],
      ['waiting', 'waiting'],
      ['canplay', 'canplay'],
      ['error', 'error'],
    ]

    for (const [domEvent, engineEvent] of map) {
      const handler = () => this.emit(engineEvent)
      el.addEventListener(domEvent, handler)
      this.domListeners.push({ event: domEvent, handler })
    }
  }

  private detachDOMListeners(): void {
    for (const { event, handler } of this.domListeners) {
      this.element.removeEventListener(event, handler)
    }
    this.domListeners = []
  }

  // ── Lifecycle ───────────────────────────────────────────

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.detachDOMListeners()
    this.listeners.clear()
  }
}
