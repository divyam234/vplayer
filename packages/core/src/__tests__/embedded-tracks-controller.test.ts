import { describe, expect, it, vi } from 'vitest'

import { EmbeddedTracks } from '../embedded-tracks/controller'
import { MatroskaFile } from '../embedded-tracks/matroska'
import { fixture, round, serve } from './fixtures/helpers'

// The track controller against real files served over HTTP range requests, without a browser.

/** Waits until the subtitle track being read has been read as far as it will be for now. */
async function settle(tracks: EmbeddedTracks, status: 'ready' | 'error' = 'ready') {
  await vi.waitFor(() => expect(tracks.getSnapshot().subtitleStatus).toBe(status), { timeout: 10_000 })
}

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('embedded subtitles controller', () => {
  it('reads what is about to be shown first, then the captions that began just before the playhead, then the rest ahead', async () => {
    const server = await serve(fixture('long-subs.mkv'))
    try {
      const tracks = new EmbeddedTracks({ url: server.url, locale: 'en', trackName: (n) => `Track ${n}` })
      await tracks.load(new AbortController().signal)
      // A file whose clusters start at these times; an "offset" here is just the cluster time.
      const clusters = [780, 785, 790, 795, 800, 803.8, 809, 814, 820, 830, 850, 900, 940, 1000]
      const scans: { from: number; announced: { time: number; go: boolean }[] }[] = []
      const mkv = tracks as unknown as { mkv: Record<string, unknown> }
      mkv.mkv.clusterOffsetFor = async (time: number) => clusters.toReversed().find((c) => c <= time) ?? clusters[0]
      mkv.mkv.prefetch = () => undefined
      mkv.mkv.scan = async (
        offset: number,
        _wanted: unknown,
        handlers: { onCluster: (time: number) => boolean | Promise<boolean> },
      ) => {
        const scan = { from: offset, announced: [] as { time: number; go: boolean }[] }
        scans.push(scan)
        for (const time of clusters.filter((c) => c >= offset)) {
          // oxlint-disable-next-line eslint/no-await-in-loop -- clusters arrive one after another
          const go = await handlers.onCluster(time)
          scan.announced.push({ time, go })
          if (!go) break
        }
        return { endOffset: offset, reachedEnd: false }
      }

      tracks.setPlayhead(805)
      tracks.selectSubtitle(2)
      await settle(tracks)

      // First what is about to be shown, from the cluster that holds one second before the playhead...
      expect(scans[0].from).toBe(803.8)
      expect(scans[0].announced.at(-1)?.time).toBeGreaterThan(805 + 10)
      // ...then back from eight seconds before it, up to but not into what was just read...
      expect(scans[1].from).toBe(795)
      expect(scans[1].announced.at(-1)).toEqual({ time: 803.8, go: false })
      // ...and only then the rest of the lookahead.
      expect(scans[2].from).toBeGreaterThan(805 + 10 - 6)
      expect(scans.length).toBe(3)
      tracks.dispose()
    } finally {
      await server.close()
    }
  })

  it('starts reading right before the playhead, not seconds earlier', async () => {
    // Everything read before the first caption can show is waited for, so reading starts as close
    // as the cue index allows.
    const server = await serve(fixture('long-subs.mkv'))
    const spy = vi.spyOn(MatroskaFile.prototype, 'clusterOffsetFor')
    try {
      const tracks = new EmbeddedTracks({ url: server.url, locale: 'en', trackName: (n) => `Track ${n}` })
      await tracks.load(new AbortController().signal)
      tracks.setPlayhead(300)
      tracks.selectSubtitle(2)
      await settle(tracks)
      expect(spy.mock.calls[0][0]).toBe(299)
      expect(tracks.getSnapshot().cues.some((cue) => cue.text === 'Cue 30')).toBe(true)
      tracks.dispose()
    } finally {
      spy.mockRestore()
      await server.close()
    }
  })

  it('reads the cue index while loading when there are subtitles to choose from, and only then', async () => {
    // Choosing a subtitle starts at the index, so it is read before the choice is made.
    const spy = vi.spyOn(MatroskaFile.prototype, 'loadCues')
    const options = { locale: 'en', trackName: (n: number) => `Track ${n}` }
    try {
      const withSubtitles = await serve(fixture('multi-track.mkv'))
      try {
        const tracks = new EmbeddedTracks({ url: withSubtitles.url, ...options })
        await tracks.load(new AbortController().signal)
        expect(spy).toHaveBeenCalledTimes(1)
        tracks.dispose()
      } finally {
        await withSubtitles.close()
      }

      spy.mockClear()
      const without = await serve(fixture('eac3-only.mkv'))
      try {
        const tracks = new EmbeddedTracks({ url: without.url, ...options })
        await tracks.load(new AbortController().signal)
        expect(tracks.getSnapshot().subtitles).toEqual([])
        expect(spy).not.toHaveBeenCalled()
        tracks.dispose()
      } finally {
        await without.close()
      }
    } finally {
      spy.mockRestore()
    }
  })

  it('stops saying "loading" once what is about to be shown has been read', async () => {
    const server = await serve(fixture('long-subs.mkv'))
    try {
      const tracks = new EmbeddedTracks({ url: server.url, locale: 'en', trackName: (n) => `Track ${n}` })
      await tracks.load(new AbortController().signal)
      // A scan that reads clusters at 0 s, 5 s, 20 s and 40 s and then waits, like a slow server.
      const { promise: gate, resolve: release } = deferred()
      const seen: number[] = []
      const mkv = (tracks as unknown as { mkv: { scan: unknown } }).mkv
      mkv.scan = async (
        offset: number,
        _wanted: unknown,
        handlers: { onCluster: (time: number) => boolean | Promise<boolean> },
      ) => {
        for (const time of [0, 5, 20, 40]) {
          // oxlint-disable-next-line eslint/no-await-in-loop -- clusters arrive one after another
          await handlers.onCluster(time)
          seen.push(time)
        }
        await gate
        return { endOffset: offset, reachedEnd: true }
      }

      tracks.selectSubtitle(2)
      tracks.setPlayhead(0)
      await vi.waitFor(() => expect(seen).toEqual([0, 5, 20, 40]))
      // The next 15 s are covered (20 s and 40 s were read), though reading goes on.
      expect(tracks.getSnapshot().subtitleStatus).toBe('ready')

      release()
      await settle(tracks)
      tracks.dispose()
    } finally {
      await server.close()
    }
  })

  it('lists subtitles and plays the file directly when audio is playable as is', async () => {
    const server = await serve(fixture('single-track.mkv'))
    try {
      const tracks = new EmbeddedTracks({ url: server.url, locale: 'en', trackName: (n) => `Track ${n}` })
      const source = await tracks.load(new AbortController().signal)
      // One Opus track: nothing to choose, no remuxing.
      expect(source).toEqual({ src: server.url })
      expect(tracks.getSnapshot().audio).toEqual([])
      expect(tracks.getSnapshot().subtitles).toMatchObject([
        { id: 'embedded:3', number: 3, label: 'English', language: 'eng', supported: true },
      ])
      tracks.dispose()
    } finally {
      await server.close()
    }
  })

  it('falls back to the plain file for data it cannot read', async () => {
    const server = await serve(Buffer.from('garbage'))
    try {
      const tracks = new EmbeddedTracks({ url: server.url, locale: 'en', trackName: (n) => `Track ${n}` })
      expect(await tracks.load(new AbortController().signal)).toEqual({ src: server.url })
      tracks.dispose()
    } finally {
      await server.close()
    }
  })

  it('reads only the part of the subtitles ahead of the playhead', async () => {
    const data = fixture('long-subs.mkv')
    const server = await serve(data)
    try {
      const tracks = new EmbeddedTracks({ url: server.url, locale: 'en', trackName: (n) => `Track ${n}` })
      await tracks.load(new AbortController().signal)
      const headerBytes = server.bytesRequested()

      tracks.selectSubtitle(2)
      tracks.setPlayhead(0)
      await settle(tracks)
      const first = tracks.getSnapshot().cues.map((cue) => cue.text)
      // Cues for the next minute or so are there, the far end of the file is not.
      expect(first).toContain('Cue 0')
      expect(first).toContain('Cue 5')
      expect(first).not.toContain('Cue 50')
      expect(server.bytesRequested() - headerBytes).toBeLessThan(data.length)

      // A seek far ahead reads there and shows those cues.
      tracks.setPlayhead(400)
      await expect
        .poll(() => tracks.getSnapshot().cues.some((cue) => cue.text === 'Cue 40'), {
          timeout: 10_000,
        })
        .toBe(true)
      await settle(tracks)

      // Going back to a region that has been read costs no new requests.
      const requestsBefore = server.requests.length
      tracks.setPlayhead(2)
      await settle(tracks)
      await new Promise((resolve) => setTimeout(resolve, 400))
      expect(server.requests.length).toBe(requestsBefore)
      expect(tracks.getSnapshot().cues.map((cue) => cue.text)).toContain('Cue 0')

      // Deselecting stops reading and clears the cues.
      tracks.selectSubtitle(undefined)
      expect(tracks.getSnapshot().cues).toEqual([])
      tracks.dispose()
    } finally {
      await server.close()
    }
  })

  it('falls back to the plain file and resumes where playback was', async () => {
    const server = await serve(fixture('single-track.mkv'))
    try {
      const tracks = new EmbeddedTracks({ url: server.url, locale: 'en', trackName: (n) => `Track ${n}` })
      await tracks.load(new AbortController().signal)
      // Stand in for a remuxed session that has been playing for 42 s and then breaks.
      let disposed = false
      const internals = tracks as unknown as Record<string, unknown>
      internals.session = { dispose: () => (disposed = true), attach: () => undefined }
      tracks.attachVideo({ currentTime: 42 } as HTMLVideoElement)
      const fallbacks: unknown[] = []
      tracks.onFallback((source) => fallbacks.push(source))

      ;(internals.fallBack as () => void).call(tracks)

      expect(fallbacks).toEqual([{ src: server.url }])
      expect(disposed).toBe(true)
      expect(tracks.getSnapshot().audio).toEqual([])
      expect(tracks.takeResumeTime()).toBe(42)
      expect(tracks.takeResumeTime()).toBeUndefined() // only once
      tracks.dispose()
    } finally {
      await server.close()
    }
  })

  it('subtitles from the last file are the same cues for a second selection', async () => {
    const server = await serve(fixture('multi-track.mkv'))
    try {
      const tracks = new EmbeddedTracks({ url: server.url, locale: 'en', trackName: (n) => `Track ${n}` })
      await tracks.load(new AbortController().signal)
      expect(tracks.getSnapshot().subtitles.map((s) => [s.number, s.label, s.supported])).toEqual([
        [6, 'English', true],
        [7, 'Japanese (ASS)', true],
      ])
      tracks.selectSubtitle(7)
      tracks.setPlayhead(0)
      await settle(tracks)
      expect(round(tracks.getSnapshot().cues).map((cue) => cue.text)).toEqual([
        'ASS first, with styling tags',
        'ASS first, with styling tags\nOverlapping, second\nline break',
        'Overlapping, second\nline break',
        'Comma, inside, the, text, field, yes',
      ])
      // Switching tracks gives that track's cues.
      tracks.selectSubtitle(6)
      await settle(tracks)
      expect(tracks.getSnapshot().cues.map((cue) => cue.text)).toContain('Hello from the first subtitle')
      tracks.dispose()
    } finally {
      await server.close()
    }
  })
})
