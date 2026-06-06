import { describe, expect, it } from 'vitest'

import { detectSourceKind } from '../source-resolver'

describe('source resolver', () => {
  it('detects native video files', () => {
    expect(detectSourceKind({ src: 'https://example.com/video.mp4' })).toBe('native')
    expect(detectSourceKind({ src: '/clip.webm?token=1' })).toBe('native')
  })

  it('detects HLS and DASH sources by extension or content type', () => {
    expect(detectSourceKind({ src: '/stream/master.m3u8' })).toBe('hls')
    expect(detectSourceKind({ src: '/stream', type: 'application/vnd.apple.mpegurl' })).toBe('hls')
    expect(detectSourceKind({ src: '/manifest.mpd' })).toBe('dash')
    expect(detectSourceKind({ src: '/manifest', type: 'application/dash+xml' })).toBe('dash')
  })

  it('returns unknown for unhinted custom URLs', () => {
    expect(detectSourceKind({ src: '/download?id=123' })).toBe('unknown')
  })
})
