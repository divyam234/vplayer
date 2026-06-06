/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest'

import type { MediaEngine, MediaEngineEvent, MediaEngineEventHandler } from '../media-engine'
import { createPlayer } from '../player'

class FakeEngine implements MediaEngine {
  readonly element: HTMLVideoElement
  currentTime = 0
  duration = 120
  volume = 1
  muted = false
  playbackRate = 1
  paused = true
  ended = false
  looping = false
  buffered = { length: 0, start: () => 0, end: () => 0 } as TimeRanges
  videoWidth = 1920
  videoHeight = 1080
  error = null
  destroyed = false
  private listeners = new Map<string, Set<MediaEngineEventHandler>>()

  constructor(video: HTMLVideoElement) {
    this.element = video
  }

  async play() {
    this.paused = false
    this.emit('play')
  }
  pause() {
    this.paused = true
    this.emit('pause')
  }
  seek(time: number) {
    this.currentTime = time
    this.emit('timeupdate')
  }
  setVolume(volume: number) {
    this.volume = volume
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
    this.destroyed = true
    this.listeners.clear()
  }
  emit(event: MediaEngineEvent, ...args: unknown[]) {
    this.listeners.get(event)?.forEach((handler) => handler(...args))
  }
}

describe('createPlayer core contract', () => {
  it('mounts with a nullable engine contract and updates state from engine events', async () => {
    const player = createPlayer({ src: '/video.mp4', engine: (video) => new FakeEngine(video) })
    expect(player.engine).toBeNull()

    const container = document.createElement('div')
    const video = document.createElement('video')
    player.mount(video, container)

    expect(player.engine).toBeInstanceOf(FakeEngine)
    expect(player.store.state.source).toEqual({ src: '/video.mp4', type: undefined })
    await player.remote.play()
    expect(player.store.state.isPlaying).toBe(true)
    expect(player.store.state.status).toBe('playing')

    player.remote.seek(42)
    expect(player.store.state.currentTime).toBe(42)

    player.unmount()
    expect(player.engine).toBeNull()
    expect(player.store.state.status).toBe('idle')
  })

  it('aborts old thumbnail requests when thumbnail URL changes', async () => {
    const abortSpy = vi.fn()
    const originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      init?.signal?.addEventListener('abort', abortSpy)
      return new Promise(() => {})
    }) as typeof fetch

    const player = createPlayer({ src: '/video.mp4', engine: (video) => new FakeEngine(video) })
    player.setThumbnails('/a.vtt')
    player.setThumbnails('/b.vtt')

    expect(abortSpy).toHaveBeenCalledTimes(1)
    globalThis.fetch = originalFetch
    player.destroy()
  })
})
