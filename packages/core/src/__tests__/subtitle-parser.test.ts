import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchThumbnails, getThumbnailAtTime, parseThumbnailVTT, parseTimestamp, parseVTT } from '../subtitle-parser'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('subtitle and thumbnail parsing', () => {
  it('parses VTT cues without dropping all text lines', () => {
    const cues = parseVTT(`WEBVTT\n\n00:00:01.000 --> 00:00:03.500\nHello world\nSecond line\n`)

    expect(cues).toEqual([
      {
        index: 1,
        start: 1,
        end: 3.5,
        text: 'Hello world\nSecond line',
      },
    ])
  })

  it('parses comma and dot timestamps', () => {
    expect(parseTimestamp('00:01:02.500')).toBe(62.5)
    expect(parseTimestamp('00:01:02,250')).toBe(62.25)
  })

  it('parses sprite and non-sprite thumbnail VTT cues', () => {
    const cues = parseThumbnailVTT(
      `WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nthumbs.jpg#xywh=160,90,160,90\n\n00:00:05.000 --> 00:00:10.000\nthumb-0002.jpg\n`,
    )

    expect(cues[0]).toMatchObject({ src: 'thumbs.jpg', x: 160, y: 90, w: 160, h: 90 })
    expect(cues[1]).toMatchObject({ src: 'thumb-0002.jpg', x: 0, y: 0, w: 160, h: 90 })
    expect(getThumbnailAtTime(cues, 7)?.src).toBe('thumb-0002.jpg')
  })

  it('transforms raw thumbnail VTT before parsing and URL resolution', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      url: 'https://media.example.com/video/thumbs.vtt',
      text: () => Promise.resolve('WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nthumbs/sheet.jpg#xywh=0,0,160,90\n'),
    }) as typeof fetch
    const transform = vi.fn(async (content: string, responseUrl: string) => {
      expect(responseUrl).toBe('https://media.example.com/video/thumbs.vtt')
      return content.replace('thumbs/sheet.jpg', 'https://cdn.example.com/sheet.jpg')
    })

    const cues = await fetchThumbnails('/redirecting-thumbs.vtt', undefined, transform)

    expect(transform).toHaveBeenCalledOnce()
    expect(cues[0]).toMatchObject({ src: 'https://cdn.example.com/sheet.jpg', x: 0, y: 0, w: 160, h: 90 })
  })
})
