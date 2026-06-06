import type { MediaEngine, MediaEngineEvent, MediaEngineEventHandler } from '@vplayer/core'

export class FakeEngine implements MediaEngine {
  readonly element: HTMLVideoElement
  currentTime = 0
  duration = 100
  volume = 1
  muted = false
  playbackRate = 1
  paused = true
  ended = false
  looping = false
  buffered = { length: 0, start: () => 0, end: () => 0 } as TimeRanges
  videoWidth = 1280
  videoHeight = 720
  error = null
  playCalls = 0
  pauseCalls = 0
  seekCalls: number[] = []
  private listeners = new Map<string, Set<MediaEngineEventHandler>>()

  constructor(video: HTMLVideoElement) {
    this.element = video
  }

  async play() {
    this.playCalls += 1
    this.paused = false
    this.ended = false
    this.emit('play')
    this.emit('playing')
  }

  pause() {
    this.pauseCalls += 1
    this.paused = true
    this.emit('pause')
  }

  seek(time: number) {
    this.seekCalls.push(time)
    this.currentTime = time
    this.emit('seeking')
    this.emit('timeupdate')
    this.emit('seeked')
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume))
    this.emit('volumechange')
  }

  setMuted(muted: boolean) {
    this.muted = muted
    this.emit('volumechange')
  }

  setPlaybackRate(rate: number) {
    this.playbackRate = rate
    this.emit('ratechange')
  }

  setLooping(loop: boolean) {
    this.looping = loop
  }

  load() {
    this.emit('loadedmetadata')
    this.emit('canplay')
  }

  async requestPictureInPicture() {}
  async exitPictureInPicture() {}
  async screenshot() {
    return null
  }

  on(event: MediaEngineEvent, handler: MediaEngineEventHandler) {
    const set = this.listeners.get(event) ?? new Set<MediaEngineEventHandler>()
    set.add(handler)
    this.listeners.set(event, set)
    return () => set.delete(handler)
  }

  destroy() {
    this.listeners.clear()
  }

  emit(event: MediaEngineEvent, ...args: unknown[]) {
    this.listeners.get(event)?.forEach((handler) => handler(...args))
  }
}
