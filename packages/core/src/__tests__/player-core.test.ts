/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { MediaEngine, MediaEngineError, MediaEngineEvent, MediaEngineEventHandler } from '../media-engine'
import { LocalPlaybackProgressStore } from '../playback-progress'
import type { PlaybackProgress, PlaybackProgressStore } from '../playback-progress'
import { createPlayer } from '../player'
import type { SubtitleSearchItem } from '../subtitle-parser'

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
  beforeEach(() => localStorage.clear())
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

  it('publishes configured title and poster to the active media session', async () => {
    const mediaSessionDescriptor = Object.getOwnPropertyDescriptor(navigator, 'mediaSession')
    const mediaSession = { metadata: null as MediaMetadata | null }
    Object.defineProperty(navigator, 'mediaSession', { configurable: true, value: mediaSession })
    vi.stubGlobal(
      'MediaMetadata',
      class {
        title: string
        artwork: readonly MediaImage[]

        constructor(init: MediaMetadataInit = {}) {
          this.title = init.title ?? ''
          this.artwork = init.artwork ?? []
        }
      },
    )

    try {
      const player = createPlayer({
        src: '/video.mp4',
        title: 'First episode',
        poster: '/first.jpg',
        engine: (video) => new FakeEngine(video),
      })
      player.mount(document.createElement('video'), document.createElement('div'))

      expect(mediaSession.metadata).toBeNull()
      await player.remote.play()
      expect(mediaSession.metadata).toMatchObject({
        title: 'First episode',
        artwork: [{ src: '/first.jpg' }],
      })

      player.updateOptions({ title: 'Second episode', poster: '/second.jpg' })
      expect(mediaSession.metadata).toMatchObject({
        title: 'Second episode',
        artwork: [{ src: '/second.jpg' }],
      })

      player.unmount()
      expect(mediaSession.metadata).toBeNull()
    } finally {
      vi.unstubAllGlobals()
      if (mediaSessionDescriptor) Object.defineProperty(navigator, 'mediaSession', mediaSessionDescriptor)
      else Reflect.deleteProperty(navigator, 'mediaSession')
    }
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

  it('persists default progress per media and restores it after reload', async () => {
    const first = createPlayer({ src: '/video-a.mp4', engine: (video) => new FakeEngine(video) })
    first.mount(document.createElement('video'), document.createElement('div'))
    const firstEngine = first.engine as FakeEngine
    firstEngine.emit('loadedmetadata')
    await first.remote.play()
    first.remote.seek(42)
    first.remote.pause()
    await vi.waitFor(() => {
      expect(JSON.parse(localStorage.getItem('vplayer:progress') ?? '{}')).toEqual({
        'http://localhost:3000/video-a.mp4': { time: 42, duration: 120 },
      })
    })
    first.destroy()

    const second = createPlayer({ src: '/video-a.mp4', engine: (video) => new FakeEngine(video) })
    second.mount(document.createElement('video'), document.createElement('div'))
    ;(second.engine as FakeEngine).emit('loadedmetadata')
    await vi.waitFor(() =>
      expect(second.store.state.resumeState).toEqual({ status: 'prompt', progress: { time: 42, duration: 120 } }),
    )
    second.destroy()
  })

  it('stores bounded progress entries together and refreshes recently used entries', async () => {
    const progressStore = new LocalPlaybackProgressStore(undefined, 2)
    await progressStore.save('/a.mp4', { time: 10, duration: 120 })
    await progressStore.save('/b.mp4', { time: 20, duration: 120 })
    await progressStore.save('/a.mp4', { time: 30, duration: 120 })
    await progressStore.save('/c.mp4', { time: 40, duration: 120 })

    expect(JSON.parse(localStorage.getItem('vplayer:progress') ?? '{}')).toEqual({
      '/a.mp4': { time: 30, duration: 120 },
      '/c.mp4': { time: 40, duration: 120 },
    })
    expect(await progressStore.load('/b.mp4')).toBeNull()
  })

  it('restores progress when streamed media duration becomes finite after metadata', async () => {
    const adapter: PlaybackProgressStore = {
      load: vi.fn(async () => ({ time: 42, duration: 120 })),
      save: async () => {},
      clear: async () => {},
    }
    const player = createPlayer({
      src: '/video.mp4',
      playbackProgress: { id: 'streamed-video', store: adapter },
      engine: (video) => new FakeEngine(video),
    })
    player.mount(document.createElement('video'), document.createElement('div'))
    const engine = player.engine as FakeEngine
    engine.duration = Number.POSITIVE_INFINITY
    engine.emit('loadedmetadata')
    expect(adapter.load).not.toHaveBeenCalled()

    engine.duration = 120
    engine.emit('durationchange')

    await vi.waitFor(() =>
      expect(player.store.state.resumeState).toEqual({ status: 'prompt', progress: { time: 42, duration: 120 } }),
    )
    player.destroy()
  })

  it('isolates explicit progress identities', async () => {
    const store = new Map<string, PlaybackProgress>()
    const adapter: PlaybackProgressStore = {
      load: async (id) => store.get(id) ?? null,
      save: async (id, progress) => void store.set(id, progress),
      clear: async (id) => void store.delete(id),
    }
    store.set('episode-a', { time: 42, duration: 120 })
    const player = createPlayer({
      src: '/video.mp4',
      playbackProgress: { id: 'episode-b', store: adapter },
      engine: (video) => new FakeEngine(video),
    })
    player.mount(document.createElement('video'), document.createElement('div'))
    ;(player.engine as FakeEngine).emit('loadedmetadata')
    await vi.waitFor(() => expect(player.store.state.resumeState).toEqual({ status: 'idle' }))
    player.destroy()
  })

  it('normalizes URL progress identities by default and allows exact URLs', async () => {
    const load = vi.fn(async () => null)
    const adapter: PlaybackProgressStore = { load, save: async () => {}, clear: async () => {} }
    const normalized = createPlayer({
      src: '/video.mp4?token=temporary#chapter',
      playbackProgress: { store: adapter },
      engine: (video) => new FakeEngine(video),
    })
    normalized.mount(document.createElement('video'), document.createElement('div'))
    ;(normalized.engine as FakeEngine).emit('loadedmetadata')
    await vi.waitFor(() => expect(load).toHaveBeenCalledWith('http://localhost:3000/video.mp4'))
    normalized.destroy()

    const exact = createPlayer({
      src: '/video.mp4?quality=1080#chapter',
      playbackProgress: { store: adapter, normalizeUrl: false },
      engine: (video) => new FakeEngine(video),
    })
    exact.mount(document.createElement('video'), document.createElement('div'))
    ;(exact.engine as FakeEngine).emit('loadedmetadata')
    await vi.waitFor(() => expect(load).toHaveBeenLastCalledWith('/video.mp4?quality=1080#chapter'))
    exact.destroy()
  })

  it('does not recreate or overwrite saved progress when starting over or closing the prompt', async () => {
    const save = vi.fn(async () => {})
    const clear = vi.fn(async () => {})
    const adapter: PlaybackProgressStore = {
      load: async () => ({ time: 42, duration: 120 }),
      save,
      clear,
    }
    const player = createPlayer({
      src: '/video.mp4',
      playbackProgress: { id: 'episode-a', store: adapter },
      engine: (video) => new FakeEngine(video),
    })
    player.mount(document.createElement('video'), document.createElement('div'))
    const engine = player.engine as FakeEngine
    engine.emit('loadedmetadata')
    await vi.waitFor(() => expect(player.store.state.resumeState.status).toBe('prompt'))

    player.remote.startPlaybackOver()
    engine.emit('seeked')
    player.destroy()

    await vi.waitFor(() => expect(clear).toHaveBeenCalledWith('episode-a'))
    expect(save).not.toHaveBeenCalled()
  })

  it.each([
    { time: Number.NaN, duration: 120 },
    { time: -1, duration: 120 },
    { time: 3, duration: 120 },
    { time: 117, duration: 120 },
    { time: 42, duration: 0 },
    { time: 42, duration: Number.POSITIVE_INFINITY },
    { time: 42, duration: 122 },
  ])('rejects invalid saved progress %#', async (saved) => {
    const adapter: PlaybackProgressStore = {
      load: async () => saved,
      save: async () => {},
      clear: async () => {},
    }
    const player = createPlayer({
      src: '/video.mp4',
      playbackProgress: { store: adapter },
      engine: (video) => new FakeEngine(video),
    })
    player.mount(document.createElement('video'), document.createElement('div'))
    ;(player.engine as FakeEngine).emit('loadedmetadata')
    await Promise.resolve()
    expect(player.store.state.resumeState).toEqual({ status: 'idle' })
    player.destroy()
  })

  it('ignores stale async loads and keeps playback usable after a load rejection', async () => {
    let resolveFirstLoad!: (progress: PlaybackProgress | null) => void
    const firstLoadPromise = new Promise<PlaybackProgress | null>((resolve) => {
      resolveFirstLoad = resolve
    })
    const load = vi
      .fn<PlaybackProgressStore['load']>()
      .mockImplementationOnce(() => firstLoadPromise)
      .mockRejectedValueOnce(new Error('offline'))
    const adapter: PlaybackProgressStore = { load, save: vi.fn(async () => {}), clear: vi.fn(async () => {}) }
    const player = createPlayer({
      src: '/a.mp4',
      playbackProgress: { id: 'a', store: adapter },
      engine: (video) => new FakeEngine(video),
    })
    player.mount(document.createElement('video'), document.createElement('div'))
    ;(player.engine as FakeEngine).emit('loadedmetadata')
    player.updateOptions({ src: '/b.mp4', playbackProgress: { id: 'b', store: adapter } })
    ;(player.engine as FakeEngine).emit('loadedmetadata')
    resolveFirstLoad({ time: 42, duration: 120 })
    await vi.waitFor(() => expect(player.store.state.resumeState).toEqual({ status: 'idle' }))
    player.remote.play()
    expect(player.store.state.isPlaying).toBe(true)
    player.destroy()
  })

  it('orders completion clear after an in-flight save and flushes pagehide', async () => {
    let releaseSave!: () => void
    const saveGate = new Promise<void>((resolve) => {
      releaseSave = resolve
    })
    const calls: string[] = []
    const adapter: PlaybackProgressStore = {
      load: async () => null,
      save: async (_id, progress) => {
        calls.push(`save:${progress.time}`)
        await saveGate
      },
      clear: async () => void calls.push('clear'),
    }
    const player = createPlayer({
      src: '/video.mp4',
      playbackProgress: { store: adapter },
      engine: (video) => new FakeEngine(video),
    })
    player.mount(document.createElement('video'), document.createElement('div'))
    const engine = player.engine as FakeEngine
    engine.emit('loadedmetadata')
    engine.currentTime = 21
    window.dispatchEvent(new Event('pagehide'))
    await vi.waitFor(() => expect(calls).toEqual(['save:21']))
    engine.ended = true
    engine.emit('ended')
    expect(calls).toEqual(['save:21'])
    releaseSave()
    await vi.waitFor(() => expect(calls).toEqual(['save:21', 'clear']))
    player.destroy()
  })

  it('checkpoints moving playback from time updates and flushes important transitions', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(10_000)
    const save = vi.fn<PlaybackProgressStore['save']>(async () => {})
    const adapter: PlaybackProgressStore = { load: async () => null, save, clear: async () => {} }
    const player = createPlayer({
      src: '/video.mp4',
      playbackProgress: { store: adapter },
      engine: (video) => new FakeEngine(video),
    })
    player.mount(document.createElement('video'), document.createElement('div'))
    const engine = player.engine as FakeEngine
    await engine.play()

    engine.currentTime = 10
    engine.emit('timeupdate')
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1))

    now.mockReturnValue(13_000)
    engine.currentTime = 20
    engine.emit('timeupdate')
    expect(save).toHaveBeenCalledTimes(1)

    now.mockReturnValue(15_000)
    engine.emit('timeupdate')
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(2))

    engine.currentTime = 25
    engine.pause()
    await vi.waitFor(() =>
      expect(save).toHaveBeenLastCalledWith('http://localhost:3000/video.mp4', { time: 25, duration: 120 }),
    )

    engine.currentTime = 35
    engine.emit('seeked')
    await vi.waitFor(() =>
      expect(save).toHaveBeenLastCalledWith('http://localhost:3000/video.mp4', { time: 35, duration: 120 }),
    )

    player.destroy()
    now.mockRestore()
  })

  it('parses selected local subtitle tracks and clamps caption settings', async () => {
    const player = createPlayer({
      src: '/video.mp4',
      engine: (video) => new FakeEngine(video),
    })
    player.mount(document.createElement('video'), document.createElement('div'))

    player.remote.addSubtitleTrack({
      id: 'local-file',
      content: '1\n00:00:01,000 --> 00:00:03,000\nLocal caption',
      format: 'srt',
      lang: 'und',
      label: 'movie.srt',
      local: true,
    })
    await vi.waitFor(() => expect(player.store.state.subtitleStatus).toBe('ready'))
    expect(player.store.state.activeSubtitle?.id).toBe('local-file')
    expect(player.store.state.subtitleCues[0]?.text).toBe('Local caption')

    player.remote.setCaptionSettings({
      fontSize: 'large',
      fontScale: 300,
      textOpacity: -1,
      backgroundOpacity: 2,
      position: 50,
      lineHeight: 4,
      delay: -20,
    })
    expect(player.store.state.captionSettings).toMatchObject({
      fontSize: 'large',
      fontScale: 200,
      textOpacity: 0,
      backgroundOpacity: 1,
      position: 30,
      lineHeight: 2,
      delay: -10,
    })
    player.destroy()
  })

  it('searches subtitle providers and lazily fetches the selected result', async () => {
    const search = vi.fn(async () => [
      { id: 'remote-es', language: 'es', label: 'Spanish.srt', format: 'srt' as const, downloads: 42 },
    ])
    const fetch = vi.fn(async (_item: SubtitleSearchItem, _signal: AbortSignal) => ({
      content: '1\n00:00:01,000 --> 00:00:03,000\nRemote caption',
      format: 'srt' as const,
    }))
    const player = createPlayer({
      src: '/video.mp4',
      title: 'Example Movie',
      subtitleProviders: [{ id: 'remote', label: 'Remote Subtitles', search, fetch }],
      engine: (video) => new FakeEngine(video),
    })
    player.mount(document.createElement('video'), document.createElement('div'))

    expect(player.store.state.subtitleProviders).toEqual([{ id: 'remote', label: 'Remote Subtitles' }])
    expect(search).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()

    player.remote.searchSubtitles({ languages: ['es'] })
    await vi.waitFor(() => expect(player.store.state.subtitleSearchStatus).toBe('ready'))
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Example Movie', languages: ['es'] }),
      expect.any(AbortSignal),
    )
    expect(player.store.state.subtitleSearchResults).toEqual([
      expect.objectContaining({ id: 'remote-es', providerId: 'remote', providerLabel: 'Remote Subtitles' }),
    ])
    expect(fetch).not.toHaveBeenCalled()

    const result = player.store.state.subtitleSearchResults[0]
    expect(result).toBeDefined()
    player.remote.selectSubtitleResult(result!)

    await vi.waitFor(() => expect(player.store.state.subtitleStatus).toBe('ready'))
    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch.mock.calls[0]?.[0]).toEqual(expect.objectContaining({ id: 'remote-es', providerId: 'remote' }))
    expect(player.store.state.activeSubtitle).toEqual(
      expect.objectContaining({ id: 'provider:remote:remote-es', lang: 'es', label: 'Spanish.srt' }),
    )
    expect(player.store.state.subtitleCues[0]?.text).toBe('Remote caption')

    player.destroy()
  })
})
