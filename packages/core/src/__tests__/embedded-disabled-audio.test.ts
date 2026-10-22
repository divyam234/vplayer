import { ALL_FORMATS, Input, UrlSource } from 'mediabunny'
import { describe, expect, it } from 'vitest'

import { MatroskaFile, RangeReader } from '../embedded-tracks/matroska'
import { fetchWithEnabledFlags } from '../embedded-tracks/patched-fetch'
import { fixture, serve } from './fixtures/helpers'

// Some releases mark the alternate-language audio as disabled (FlagEnabled = 0), which players list
// but do not start on. Mediabunny drops such tracks, so without help the audio menu would offer only
// one language. disabled-audio.mkv is multi-track.mkv with its Japanese track marked that way.

const body = (...chunks: number[][]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new Uint8Array(chunk))
      controller.close()
    },
  })
const read = async (response: Response) => [...new Uint8Array(await response.arrayBuffer())]

describe('audio tracks that the file marks as disabled', () => {
  it('are listed by the reader, with the place of the byte that says so', async () => {
    const data = fixture('disabled-audio.mkv')
    const server = await serve(data)
    try {
      const mkv = await MatroskaFile.open(new RangeReader(server.url))
      const audio = mkv.info.tracks.filter((track) => track.type === 'audio')
      expect(audio.map((track) => [track.number, track.language, track.isEnabled])).toEqual([
        [2, 'eng', true],
        [3, 'jpn', false],
        [4, 'ger', true],
        [5, 'fre', true],
      ])
      const offset = audio[1].disabledFlagOffset
      expect(offset).toBeDefined()
      // The element is FlagEnabled (B9), one byte long (81), and that byte is 0.
      expect([data[offset! - 2], data[offset! - 1], data[offset!]]).toEqual([0xb9, 0x81, 0x00])
      expect(audio[0].disabledFlagOffset).toBeUndefined()
    } finally {
      await server.close()
    }
  })

  it('are seen by Mediabunny only when the flag is read as enabled', async () => {
    const data = fixture('disabled-audio.mkv')
    const server = await serve(data)
    try {
      const mkv = await MatroskaFile.open(new RangeReader(server.url))
      const offsets = mkv.info.tracks.flatMap((track) =>
        track.disabledFlagOffset === undefined ? [] : [track.disabledFlagOffset],
      )

      const plain = new Input({ source: new UrlSource(server.url), formats: ALL_FORMATS })
      expect((await plain.getAudioTracks()).length).toBe(3)
      plain.dispose()

      const patched = new Input({
        source: new UrlSource(server.url, { fetchFn: fetchWithEnabledFlags(offsets) }),
        formats: ALL_FORMATS,
      })
      const tracks = await patched.getAudioTracks()
      expect(tracks.length).toBe(4)
      expect(await Promise.all(tracks.map((track) => track.getLanguageCode()))).toEqual(['eng', 'jpn', 'ger', 'fre'])
      patched.dispose()
    } finally {
      await server.close()
    }
  })
})

describe('fetchWithEnabledFlags', () => {
  it('changes a 0 at a given offset to 1, wherever the chunk boundaries fall', async () => {
    const base = (async () => new Response(body([5, 5, 0], [0, 0], [7, 0, 9]), { status: 200 })) as typeof fetch
    // Whole file, so offsets are positions in the body: 2 (in the first chunk), 3 (first byte of the second), 6.
    const response = await fetchWithEnabledFlags([2, 3, 6], base)('http://x/file')
    expect(await read(response)).toEqual([5, 5, 1, 1, 0, 7, 1, 9])
  })

  it('uses the start of a range answer to know where the body is in the file', async () => {
    const base = (async () =>
      new Response(body([0, 0, 0, 0]), {
        status: 206,
        headers: { 'Content-Range': 'bytes 100-103/1000' },
      })) as typeof fetch
    const response = await fetchWithEnabledFlags([101, 500], base)('http://x/file', {
      headers: { Range: 'bytes=100-103' },
    })
    expect(await read(response)).toEqual([0, 1, 0, 0])
    expect(response.status).toBe(206)
    expect(response.headers.get('Content-Range')).toBe('bytes 100-103/1000')
  })

  it('leaves alone a byte that is not 0, and answers that start after the last offset', async () => {
    const notZero = (async () => new Response(body([9, 9, 9]), { status: 200 })) as typeof fetch
    expect(await read(await fetchWithEnabledFlags([1], notZero)('http://x/file'))).toEqual([9, 9, 9])

    const original = new Response(body([0, 0]), { status: 206, headers: { 'Content-Range': 'bytes 50-51/100' } })
    const later = (async () => original) as typeof fetch
    // Nothing to change after offset 10, so the answer is passed on as it is.
    expect(await fetchWithEnabledFlags([10], later)('http://x/file')).toBe(original)
  })

  it('does nothing without offsets', () => {
    const base = (async () => new Response('x')) as typeof fetch
    expect(fetchWithEnabledFlags([], base)).toBe(base)
  })
})
