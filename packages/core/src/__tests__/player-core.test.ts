/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest'

import type { MediaEngine, MediaEngineError, MediaEngineEvent, MediaEngineEventHandler } from '../media-engine'
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
  error: MediaEngineError | null = null
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

  it('hides transient load errors and clears them when metadata becomes ready', () => {
    let engine: FakeEngine | null = null
    const player = createPlayer({
      src: '/video.mp4',
      reconnectSleep: 1,
      engine: (video) => {
        engine = new FakeEngine(video)
        return engine
      },
    })
    player.mount(document.createElement('video'), document.createElement('div'))

    engine!.error = { message: 'Temporary startup failure' }
    engine!.emit('error')
    expect(player.store.state.error).toMatchObject({ isReconnecting: true })

    engine!.emit('loadedmetadata')
    expect(player.store.state.status).toBe('ready')
    expect(player.store.state.error).toBeNull()

    player.destroy()
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

  it('uses an updated VTT transform on the next thumbnail request', async () => {
    const originalFetch = globalThis.fetch
    try {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        url: 'https://media.example.com/thumbs.vtt',
        text: () => Promise.resolve('WEBVTT\n\n00:00:00.000 --> 00:00:05.000\noriginal.jpg\n'),
      }) as typeof fetch
      const transform = vi.fn((content: string) =>
        content.replace('original.jpg', 'https://cdn.example.com/replaced.jpg'),
      )
      const player = createPlayer({ src: '/video.mp4', engine: (video) => new FakeEngine(video) })

      player.updateOptions({ transformThumbnailVTT: transform })
      player.setThumbnails('/thumbs.vtt')

      await vi.waitFor(() => {
        expect(player.store.state.thumbnailCues[0]?.src).toBe('https://cdn.example.com/replaced.jpg')
      })
      expect(transform).toHaveBeenCalledOnce()
      player.destroy()
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('refetches thumbnails when the VTT transform changes', async () => {
    const originalFetch = globalThis.fetch
    try {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        url: 'https://media.example.com/thumbs.vtt',
        text: () => Promise.resolve('WEBVTT\n\n00:00:00.000 --> 00:00:05.000\noriginal.jpg\n'),
      }) as typeof fetch
      const transform = vi.fn((content: string) => content.replace('original.jpg', 'transformed.jpg'))
      const player = createPlayer({
        src: '/video.mp4',
        thumbnails: '/thumbs.vtt',
        engine: (video) => new FakeEngine(video),
      })

      player.updateOptions({ transformThumbnailVTT: transform })

      await vi.waitFor(() => expect(transform).toHaveBeenCalledOnce())
      expect(player.store.state.thumbnailCues[0]?.src).toBe('https://media.example.com/transformed.jpg')
      player.destroy()
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
