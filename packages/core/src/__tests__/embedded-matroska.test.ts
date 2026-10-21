import { describe, expect, it } from 'vitest'

import { languageKey, languageName, trackTitle } from '../embedded-tracks/labels'
import { MatroskaFile, RangeReader } from '../embedded-tracks/matroska'
import {
  assEventText,
  blockToCue,
  mergeOverlapping,
  subtitleFormat,
  type TextCue,
} from '../embedded-tracks/subtitle-text'
import { fixture, readTrack, round, serve } from './fixtures/helpers'

// These tests read real Matroska files over HTTP range requests, like the player does, but need
// no browser.

describe('Matroska reader', () => {
  it('reads in large blocks, so a server that is slow to answer is not waited on 20 times for 10 MiB', async () => {
    // Servers that fetch from remote storage take over a second to answer the first byte; with
    // 512 KiB blocks that made reading subtitles slower than playing the video.
    const size = 12 * 1024 * 1024
    const server = await serve(Buffer.alloc(size))
    try {
      const reader = new RangeReader(server.url)
      for (let offset = 0; offset < 10 * 1024 * 1024; offset += 100 * 1024) {
        // oxlint-disable-next-line eslint/no-await-in-loop -- a sequential walk is the point
        await reader.read(offset, 100 * 1024)
      }
      expect(server.requests[0].end - server.requests[0].start + 1).toBe(4 * 1024 * 1024)
      // 10 MiB walked sequentially: three 4 MiB blocks, at most one more read ahead.
      expect(server.requests.length).toBeLessThanOrEqual(4)
    } finally {
      await server.close()
    }
  })

  it('lists tracks with their language, title and flags', async () => {
    const server = await serve(fixture('multi-track.mkv'))
    try {
      const mkv = await MatroskaFile.open(new RangeReader(server.url))
      expect(mkv.info.durationSeconds).toBeCloseTo(12, 0)
      expect(mkv.info.tracks.map((t) => [t.number, t.type, t.codecId, t.language, t.name, t.isDefault])).toEqual([
        [1, 'video', 'V_VP9', undefined, undefined, false],
        [2, 'audio', 'A_OPUS', 'eng', 'English', true],
        [3, 'audio', 'A_OPUS', 'jpn', 'Japanese', false],
        [4, 'audio', 'A_AAC', 'ger', 'Deutsch', false],
        [5, 'audio', 'A_EAC3', 'fre', 'Francais (E-AC-3)', false],
        [6, 'subtitle', 'S_TEXT/UTF8', 'eng', 'English', false],
        [7, 'subtitle', 'S_TEXT/ASS', 'jpn', 'Japanese (ASS)', false],
      ])
      // Opening reads the header only, never the whole file.
      expect(server.bytesRequested()).toBeLessThan(2 * 1024 * 1024)
    } finally {
      await server.close()
    }
  })

  it('reads SRT subtitles, dropping markup and decoding entities', async () => {
    const server = await serve(fixture('multi-track.mkv'))
    try {
      const mkv = await MatroskaFile.open(new RangeReader(server.url))
      expect(round(await readTrack(mkv, 6))).toEqual([
        { start: 1, end: 3, text: 'Hello from the first subtitle' },
        { start: 4, end: 6.5, text: 'Second line & more\nwith a break' },
        { start: 9, end: 11, text: 'Late line near the end' },
      ])
    } finally {
      await server.close()
    }
  })

  it('reads ASS subtitles: strips overrides, keeps commas, skips drawings', async () => {
    const server = await serve(fixture('multi-track.mkv'))
    try {
      const mkv = await MatroskaFile.open(new RangeReader(server.url))
      const cues = await readTrack(mkv, 7)
      expect(round(cues)).toEqual([
        { start: 1.5, end: 3.5, text: 'ASS first, with styling tags' },
        { start: 2, end: 5, text: 'Overlapping, second\nline break' },
        { start: 6, end: 8, text: 'Comma, inside, the, text, field, yes' },
      ])
      // The player shows one cue at a time, so overlapping lines become combined cues.
      expect(round(mergeOverlapping(cues))).toEqual([
        { start: 1.5, end: 2, text: 'ASS first, with styling tags' },
        {
          start: 2,
          end: 3.5,
          text: 'ASS first, with styling tags\nOverlapping, second\nline break',
        },
        { start: 3.5, end: 5, text: 'Overlapping, second\nline break' },
        { start: 6, end: 8, text: 'Comma, inside, the, text, field, yes' },
      ])
    } finally {
      await server.close()
    }
  })

  it('uses the cue index to start near a time instead of at the beginning', async () => {
    const data = fixture('long-subs.mkv')
    const server = await serve(data)
    try {
      const mkv = await MatroskaFile.open(new RangeReader(server.url))
      const offset = await mkv.clusterOffsetFor(400)
      expect(offset).toBeGreaterThan(mkv.info.firstClusterOffset ?? 0)
      const cues: TextCue[] = []
      await mkv.scan(offset ?? 0, new Set([2]), {
        onCluster: (time) => time <= 420,
        onBlock: (block) => {
          const cue = blockToCue(block, 'srt')
          if (cue) cues.push(cue)
        },
      })
      const texts = cues.map((cue) => cue.text)
      expect(texts).toContain('Cue 40')
      expect(texts).toContain('Cue 41')
      expect(texts).not.toContain('Cue 0')
      expect(texts).not.toContain('Cue 20')
    } finally {
      await server.close()
    }
  })

  it('rejects data that is not Matroska, and servers that ignore ranges', async () => {
    const text = await serve(Buffer.from('this is not a video file at all'))
    try {
      await expect(MatroskaFile.open(new RangeReader(text.url))).rejects.toThrow()
    } finally {
      await text.close()
    }
    const noRanges = await serve(fixture('multi-track.mkv'), { ranges: false })
    try {
      await expect(MatroskaFile.open(new RangeReader(noRanges.url))).rejects.toThrow(/Range request failed/)
    } finally {
      await noRanges.close()
    }
  })

  it('copes with a truncated file', async () => {
    const data = fixture('multi-track.mkv')
    const server = await serve(data.subarray(0, 6000))
    try {
      // The headers fit in the first 6 KB; the clusters are cut off. Reading must end cleanly.
      const mkv = await MatroskaFile.open(new RangeReader(server.url))
      expect(mkv.info.tracks.length).toBe(7)
      const cues = await readTrack(mkv, 6)
      expect(Array.isArray(cues)).toBe(true)
    } finally {
      await server.close()
    }
  })
})

/** An ASS event as stored in Matroska, with the given text field. */
const line = (text: string) => `0,0,Default,,0,0,0,,${text}`

/** Name for a track that has neither a title nor a language. */
const fallback = (n: number) => `Track ${n}`

describe('subtitle text', () => {
  it('ASS events', () => {
    expect(assEventText(line('{\\an8}Top {\\i1}line{\\i0}'))).toBe('Top line')
    expect(assEventText(line('One\\NTwo\\nThree'))).toBe('One\nTwo\nThree')
    expect(assEventText(line('a,b,c,d,e'))).toBe('a,b,c,d,e')
    expect(assEventText(line('{\\p1}m 0 0 l 1 1{\\p0}'))).toBeUndefined()
    expect(assEventText(line('{\\pos(10,10)}'))).toBeUndefined()
    expect(assEventText('not an event')).toBeUndefined()
  })

  it('merging cues', () => {
    expect(mergeOverlapping([])).toEqual([])
    // Back to back cues with the same text are joined, different text is not.
    expect(
      mergeOverlapping([
        { start: 0, end: 1, text: 'a' },
        { start: 1, end: 2, text: 'a' },
        { start: 2, end: 3, text: 'b' },
      ]),
    ).toEqual([
      { start: 0, end: 2, text: 'a' },
      { start: 2, end: 3, text: 'b' },
    ])
    // A cue wholly inside another one.
    expect(
      mergeOverlapping([
        { start: 0, end: 10, text: 'long' },
        { start: 4, end: 5, text: 'short' },
      ]),
    ).toEqual([
      { start: 0, end: 4, text: 'long' },
      { start: 4, end: 5, text: 'long\nshort' },
      { start: 5, end: 10, text: 'long' },
    ])
    // Unsorted input; a gap between cues stays a gap.
    expect(
      mergeOverlapping([
        { start: 5, end: 6, text: 'later' },
        { start: 0, end: 1, text: 'first' },
      ]),
    ).toEqual([
      { start: 0, end: 1, text: 'first' },
      { start: 5, end: 6, text: 'later' },
    ])
  })

  it('bitmap subtitle codecs are not text', () => {
    expect(subtitleFormat({ codecId: 'S_HDMV/PGS' })).toBeUndefined()
    expect(subtitleFormat({ codecId: 'S_VOBSUB' })).toBeUndefined()
    expect(subtitleFormat({ codecId: 'S_TEXT/ASS' })).toBe('ass')
  })
})

describe('track labels', () => {
  it('languages', () => {
    expect(languageKey('fre')).toBe('fra')
    expect(languageKey('fra')).toBe('fra')
    expect(languageKey('fr-CA')).toBe('fr')
    expect(languageKey('und')).toBeUndefined()
    expect(languageName('jpn', 'en')).toBe('Japanese')
    expect(languageName('ger', 'en')).toBe('German')
    expect(languageName('fre', 'fr')).toBe('français')
    expect(languageName('xx-not-a-language', 'en')).toBeUndefined()
  })

  it('titles', () => {
    expect(trackTitle({ name: 'English', language: 'eng' }, 0, 'en', fallback)).toBe('English')
    expect(trackTitle({ name: 'Commentary', language: 'eng' }, 0, 'en', fallback)).toBe('Commentary (English)')
    expect(trackTitle({ language: 'jpn' }, 1, 'en', fallback)).toBe('Japanese')
    expect(trackTitle({}, 2, 'en', fallback)).toBe('Track 3')
  })
})

async function scanAll(data: Buffer) {
  const server = await serve(data)
  try {
    const mkv = await MatroskaFile.open(new RangeReader(server.url))
    const cues: TextCue[] = []
    await mkv.scan(mkv.info.firstClusterOffset ?? 0, new Set([1]), {
      onBlock: (b) => {
        const cue = blockToCue(b, 'srt')
        if (cue) cues.push(cue)
      },
    })
    return { cues, bytesRequested: server.bytesRequested() }
  } finally {
    await server.close()
  }
}

// Builders for hand-made Matroska files with damaged sizes.
const bytes = (hex: string) => Buffer.from(hex, 'hex')
// An eight byte size field, which can express any size up to 2^48 here.
const sizeOf = (n: number) => {
  const out = Buffer.alloc(8)
  out[0] = 0x01
  out.writeUIntBE(n, 2, 6)
  return out
}
const element = (id: string, payload: Buffer, declared = payload.length) =>
  Buffer.concat([bytes(id), sizeOf(declared), payload])

const header = element('1A45DFA3', element('4282', Buffer.from('matroska')))
const tracks = element(
  '1654AE6B',
  element(
    'AE',
    Buffer.concat([
      element('D7', Buffer.from([1])), // track number
      element('83', Buffer.from([17])), // subtitle
      element('86', Buffer.from('S_TEXT/UTF8')),
    ]),
  ),
)
// A block for track 1: track number, timecode 0, flags 0, then the text.
const block = (text: string) => Buffer.concat([Buffer.from([0x81, 0, 0, 0]), Buffer.from(text)])
const file = (clusterChildren: Buffer[]) =>
  Buffer.concat([
    header,
    bytes('18538067'),
    bytes('01ffffffffffffff'), // a segment of unknown size
    tracks,
    element('1F43B675', Buffer.concat(clusterChildren)),
  ])

// Hand-built files with damaged sizes, which a corrupt or hostile video could contain. Reading
// must end cleanly without trying to load what the sizes claim.
describe('damaged Matroska files', () => {
  it('control: a well-formed block is read', async () => {
    const { cues } = await scanAll(file([element('E7', Buffer.from([0])), element('A3', block('hi'))]))
    expect(cues.map((c) => c.text)).toEqual(['hi'])
  })

  it('a block that claims to be gigabytes long is skipped, not loaded', async () => {
    const { cues, bytesRequested } = await scanAll(
      file([element('E7', Buffer.from([0])), element('A3', block('hi'), 0x7fffffff)]),
    )
    expect(cues).toEqual([])
    expect(bytesRequested).toBeLessThan(2 * 1024 * 1024)
  })

  it('integer fields wider than eight bytes are ignored', async () => {
    const { cues, bytesRequested } = await scanAll(
      file([element('E7', Buffer.from([0]), 2 ** 40), element('A3', block('hi'))]),
    )
    expect(cues).toEqual([])
    expect(bytesRequested).toBeLessThan(2 * 1024 * 1024)
  })

  it('an oversized duration is ignored and the block is still read', async () => {
    const group = element('A0', Buffer.concat([element('A1', block('hi')), element('9B', Buffer.from([1]), 2 ** 40)]))
    const { cues, bytesRequested } = await scanAll(file([element('E7', Buffer.from([0])), group]))
    // Shown for the default time, since the stated duration cannot be trusted.
    expect(cues.map((cue) => [cue.text, cue.end - cue.start])).toEqual([['hi', 4]])
    expect(bytesRequested).toBeLessThan(2 * 1024 * 1024)
  })

  it('a track list that claims to be enormous is refused', async () => {
    const data = Buffer.concat([
      header,
      bytes('18538067'),
      bytes('01ffffffffffffff'),
      element('1654AE6B', Buffer.alloc(8), 2 ** 40),
    ])
    const server = await serve(data)
    try {
      await expect(MatroskaFile.open(new RangeReader(server.url))).rejects.toThrow()
      expect(server.bytesRequested()).toBeLessThan(2 * 1024 * 1024)
    } finally {
      await server.close()
    }
  })
})
