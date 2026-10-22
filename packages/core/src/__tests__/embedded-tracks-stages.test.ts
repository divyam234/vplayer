import { describe, expect, it } from 'vitest'

import { EmbeddedTracks } from '../embedded-tracks/controller'
import { fixture, serve } from './fixtures/helpers'

// The stage the controller reports while loading, for the player to show (see LoadStage).

describe('embedded tracks loading stages', () => {
  it('reports the preparing stage only for a file whose audio has to be prepared', async () => {
    const stages: string[] = []
    const options = {
      locale: 'en',
      trackName: (n: number) => `Track ${n}`,
      onStage: (stage: string) => stages.push(stage),
    }
    const several = await serve(fixture('multi-track.mkv'))
    try {
      const tracks = new EmbeddedTracks({ url: several.url, ...options })
      await tracks.load(new AbortController().signal)
      expect(stages).toEqual(['preparing'])
      tracks.dispose()
    } finally {
      await several.close()
    }

    stages.length = 0
    const single = await serve(fixture('single-track.mkv'))
    try {
      const tracks = new EmbeddedTracks({ url: single.url, ...options })
      await tracks.load(new AbortController().signal)
      // One audio track the browser plays by itself: nothing to prepare.
      expect(stages).toEqual([])
      tracks.dispose()
    } finally {
      await single.close()
    }
  })
})
