import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { VideoPlayer } from '../components/player'
import { FakeEngine } from './test-utils/fake-engine'
import { renderTestPlayer } from './test-utils/render-player'

/** An engine that reports tracks, like MatroskaMediaEngine does. */
class TrackEngine extends FakeEngine {
  audioSwitches: number[] = []
  subtitleSwitches: Array<string | null> = []

  async selectAudioTrack(id: number) {
    this.audioSwitches.push(id)
    this.emit('audiotrackchange', { id })
    return true
  }

  selectSubtitleTrack(id: string | null) {
    this.subtitleSwitches.push(id)
  }
}

const audio = [
  { id: 2, label: 'English', detail: 'AAC Stereo', lang: 'eng', unsupported: false },
  { id: 3, label: 'Japanese', detail: 'E-AC-3 5.1', lang: 'jpn', unsupported: false },
  { id: 4, label: 'Commentary', detail: 'DTS 5.1', lang: 'eng', unsupported: true },
]

function renderWithTracks(props: Parameters<typeof renderTestPlayer>[0] = {}) {
  let engine: TrackEngine | null = null
  const result = render(
    <VideoPlayer
      src="/video.mkv"
      engine={(video) => {
        engine = new TrackEngine(video)
        return engine
      }}
      {...props}
    />,
  )
  if (!engine) throw new Error('engine was not created')
  return { ...result, engine: engine as TrackEngine }
}

async function openSettings(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Settings' }))
}

/** An engine that is still reading the file, like MatroskaMediaEngine before playback starts. */
class StagedEngine extends TrackEngine {
  loadStage: 'tracks' | 'preparing' | 'starting' | null = 'tracks'
}

describe('loading stages before playback', () => {
  it('shows what is being done under the loading bars, and nothing once playback can start', () => {
    let engine: StagedEngine | null = null
    render(
      <VideoPlayer
        src="/video.mkv"
        engine={(video) => {
          engine = new StagedEngine(video)
          return engine
        }}
      />,
    )
    // The stage the engine is in when the player mounts is shown at once.
    expect(screen.getByText('Reading audio tracks and subtitles…')).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Reading audio tracks and subtitles…' })).toBeInTheDocument()

    act(() => engine!.emit('loadstage', { stage: 'preparing' }))
    expect(screen.getByText('Preparing audio…')).toBeInTheDocument()
    expect(screen.queryByText('Reading audio tracks and subtitles…')).not.toBeInTheDocument()

    act(() => engine!.emit('loadstage', { stage: 'starting' }))
    expect(screen.getByText('Starting playback…')).toBeInTheDocument()

    act(() => engine!.emit('loadstage', { stage: null }))
    expect(screen.queryByText('Starting playback…')).not.toBeInTheDocument()
    // The bars stay in the page but hidden, as before.
    expect(screen.getByRole('status', { name: 'Loading video' })).toBeInTheDocument()
  })

  it('hides the play button while a stage is shown, so it does not sit on the loading text', () => {
    let engine: StagedEngine | null = null
    const { container } = render(
      <VideoPlayer
        src="/video.mkv"
        engine={(video) => {
          engine = new StagedEngine(video)
          return engine
        }}
      />,
    )
    const pauseOrb = () => container.querySelector('.vplayer__pause-orb')!.parentElement!
    expect(pauseOrb()).toHaveClass('vplayer__overlay--hidden')

    // Once loading is over a paused player offers the play button again.
    act(() => engine!.emit('loadstage', { stage: null }))
    expect(pauseOrb()).not.toHaveClass('vplayer__overlay--hidden')
  })

  it('can be given other wording through labels', () => {
    render(
      <VideoPlayer
        src="/video.mkv"
        labels={{ loadingTracks: 'Lecture des pistes…' }}
        engine={(video) => new StagedEngine(video)}
      />,
    )
    expect(screen.getByText('Lecture des pistes…')).toBeInTheDocument()
  })
})

describe('embedded tracks in the settings menu', () => {
  it('has no Audio entry when there is nothing to choose', async () => {
    const user = userEvent.setup()
    const { engine } = renderWithTracks()
    act(() => engine.emit('tracks', { audioTracks: [], activeAudioTrack: null, subtitleTracks: [] }))

    await openSettings(user)
    expect(screen.getByText('Speed')).toBeInTheDocument()
    expect(screen.queryByText('Audio')).not.toBeInTheDocument()
  })

  it('lists audio tracks with their codec, marks the current one, and switches', async () => {
    const user = userEvent.setup()
    const { engine } = renderWithTracks()
    act(() => engine.emit('tracks', { audioTracks: audio, activeAudioTrack: 2, subtitleTracks: [] }))

    await openSettings(user)
    // The main menu shows the current track next to the entry.
    expect(screen.getByText('Audio')).toBeInTheDocument()
    expect(screen.getByText('English')).toBeInTheDocument()

    await user.click(screen.getByText('Audio'))
    expect(screen.getByText('AAC Stereo')).toBeInTheDocument()
    expect(screen.getByText('E-AC-3 5.1')).toBeInTheDocument()

    await user.click(screen.getByText('Japanese'))
    await waitFor(() => expect(engine.audioSwitches).toEqual([3]))
    // Choosing a track closes the menu, like choosing a speed does.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Settings' })).toHaveAttribute('aria-expanded', 'false'),
    )

    // The new track is the current one.
    await openSettings(user)
    expect(screen.getByText('Japanese')).toBeInTheDocument()
  })

  it('shows tracks the browser cannot play as disabled, and does not select them', async () => {
    const user = userEvent.setup()
    const { engine } = renderWithTracks()
    act(() => engine.emit('tracks', { audioTracks: audio, activeAudioTrack: 2, subtitleTracks: [] }))

    await openSettings(user)
    await user.click(screen.getByText('Audio'))
    expect(screen.getByText('Not supported by this browser')).toBeInTheDocument()

    await user.click(screen.getByText('Commentary'))
    expect(engine.audioSwitches).toEqual([])
  })

  it('lists embedded subtitles next to the others and shows the cues that arrive', async () => {
    const user = userEvent.setup()
    const { engine } = renderWithTracks()
    act(() =>
      engine.emit('tracks', {
        audioTracks: [],
        activeAudioTrack: null,
        subtitleTracks: [
          { id: 'embedded:3', label: 'English (Full)', lang: 'eng', unsupported: false },
          { id: 'embedded:4', label: 'English (PGS)', lang: 'eng', unsupported: true },
        ],
      }),
    )

    await openSettings(user)
    await user.click(screen.getByText('Subtitles'))
    expect(screen.getByText('English (Full)')).toBeInTheDocument()
    expect(screen.getByText('English (PGS)')).toBeInTheDocument()
    expect(screen.getByText('Not supported')).toBeInTheDocument()
    expect(screen.getByText('Load subtitle file…')).toBeInTheDocument()

    // The image-based track cannot be chosen.
    await user.click(screen.getByText('English (PGS)'))
    expect(engine.subtitleSwitches).toEqual([])

    await user.click(screen.getByText('English (Full)'))
    expect(engine.subtitleSwitches).toEqual(['embedded:3'])

    // Cues are drawn as they are read, with the player's own captions.
    act(() => {
      engine.emit('subtitlecues', {
        id: 'embedded:3',
        cues: [{ index: 0, start: 1, end: 3, text: 'Read from the file' }],
        status: 'ready',
      })
      engine.currentTime = 2
      engine.emit('timeupdate')
    })
    expect(screen.getByText('Read from the file')).toBeInTheDocument()
  })

  it('forwards the embeddedTracks option, so it can be turned on in an app settings page', async () => {
    let created = 0
    const engine = (video: HTMLVideoElement) => {
      created += 1
      return new TrackEngine(video)
    }
    const { rerender } = render(<VideoPlayer src="/video.mkv" engine={engine} embeddedTracks={false} />)
    expect(created).toBe(1)

    // A change of the option replaces the engine for the current source...
    rerender(<VideoPlayer src="/video.mkv" engine={engine} embeddedTracks={true} />)
    await waitFor(() => expect(created).toBe(2))

    // ...and an unchanged one does not.
    rerender(<VideoPlayer src="/video.mkv" engine={engine} embeddedTracks={true} />)
    expect(created).toBe(2)
  })
})
