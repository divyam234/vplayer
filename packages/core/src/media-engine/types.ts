/**
 * MediaEngine — Strategy interface for media playback.
 *
 * Abstracts away the underlying media source (native <video>, HLS, DASH, etc.)
 * so that the player core operates against a stable contract.
 *
 * Implementations own their event listeners and must clean up on destroy().
 */

export interface MediaEngineDimensions {
  width: number
  height: number
}

export interface MediaEngineError {
  message: string
  code?: number
}

/** Events emitted by every MediaEngine implementation. */
export type MediaEngineEvent =
  | 'play'
  | 'pause'
  | 'ended'
  | 'timeupdate'
  | 'loadedmetadata'
  | 'loadeddata'
  | 'durationchange'
  | 'progress'
  | 'seeking'
  | 'seeked'
  | 'waiting'
  | 'stalled'
  | 'playing'
  | 'canplay'
  | 'canplaythrough'
  | 'volumechange'
  | 'ratechange'
  | 'playblocked'
  | 'error'
  | (string & {})

export type MediaEngineEventHandler = (...args: any[]) => void

export interface MediaEngine {
  /** The underlying media element (e.g. HTMLVideoElement). */
  readonly element: HTMLElement

  // ── Commands ────────────────────────────────────────────

  play(): Promise<void>
  pause(): void
  seek(time: number): void
  setVolume(volume: number): void
  setMuted(muted: boolean): void
  setPlaybackRate(rate: number): void
  setLooping(loop: boolean): void
  /** Reload the current source. */
  load(): void
  requestPictureInPicture(): Promise<void>
  exitPictureInPicture(): Promise<void>
  /** Capture a still frame from the current video frame. */
  screenshot(): Promise<Blob | null>

  // ── Read-only state (live reads from the underlying element) ──

  readonly currentTime: number
  readonly duration: number
  readonly volume: number
  readonly muted: boolean
  readonly playbackRate: number
  readonly paused: boolean
  readonly ended: boolean
  readonly looping: boolean
  readonly buffered: TimeRanges
  readonly videoWidth: number
  readonly videoHeight: number
  readonly error: MediaEngineError | null

  // ── Events ──────────────────────────────────────────────

  on(event: MediaEngineEvent, handler: MediaEngineEventHandler): () => void

  // ── Lifecycle ───────────────────────────────────────────

  destroy(): void
}
