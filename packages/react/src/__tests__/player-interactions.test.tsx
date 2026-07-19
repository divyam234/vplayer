import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DefaultVideoLayout, SeekBar, usePlayerContext } from '../components/player'
import { renderTestPlayer } from './test-utils/render-player'

let latestCtx: ReturnType<typeof usePlayerContext> | null = null
const fullscreenElementDescriptor = Object.getOwnPropertyDescriptor(document, 'fullscreenElement')
const requestFullscreenDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'requestFullscreen')
const exitFullscreenDescriptor = Object.getOwnPropertyDescriptor(document, 'exitFullscreen')

function restoreProperty(target: object, key: PropertyKey, descriptor?: PropertyDescriptor) {
  if (descriptor) Object.defineProperty(target, key, descriptor)
  else Reflect.deleteProperty(target, key)
}

function ContextProbe() {
  latestCtx = usePlayerContext()
  return null
}

function DefaultLayoutForTest() {
  return <DefaultVideoLayout />
}

function ThumbnailFixture() {
  const ctx = usePlayerContext()
  useEffect(() => {
    const id = setTimeout(() => {
      ctx.mediaStore.setState((prev) => ({
        ...prev,
        duration: 100,
        thumbnailCues: [
          {
            start: 0,
            end: 100,
            src: '/thumbs.jpg',
            x: 160,
            y: 90,
            w: 160,
            h: 90,
          },
        ],
      }))
    }, 0)
    return () => clearTimeout(id)
  }, [ctx.mediaStore])
  return <SeekBar />
}

describe('VideoPlayer interactions', () => {
  afterEach(() => {
    latestCtx = null
    vi.useRealTimers()
    vi.restoreAllMocks()
    restoreProperty(document, 'fullscreenElement', fullscreenElementDescriptor)
    restoreProperty(HTMLElement.prototype, 'requestFullscreen', requestFullscreenDescriptor)
    restoreProperty(document, 'exitFullscreen', exitFullscreenDescriptor)
  })

  it('calls an inline thumbnail VTT transform without repeatedly restarting the request', async () => {
    const transform = vi.fn((content: string, id: string) => content.replaceAll('#image', id))
    const thumbnailSprite = { id: 'sprite.jpg' }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      url: 'https://media.example.com/thumbs.vtt',
      text: () => Promise.resolve('WEBVTT\n\n00:00:00.000 --> 00:00:05.000\n#image\n'),
    })
    vi.stubGlobal('fetch', fetchMock)

    renderTestPlayer({
      thumbnails: '/thumbs.vtt',
      transformThumbnailVTT: thumbnailSprite?.id ? (content) => transform(content, thumbnailSprite.id) : undefined,
    })

    await waitFor(() => expect(transform).toHaveBeenCalledOnce())
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('exposes a YouTube-like mini-player mode from the default controls', async () => {
    const user = userEvent.setup()
    renderTestPlayer({ miniPlayer: true })

    const root = screen.getByTestId('vplayer-root')
    expect(root).toHaveAttribute('data-mini-player', 'false')
    expect(root.querySelector('.vplayer__mini-progress')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /mini player/i }))
    expect(root).toHaveAttribute('data-mini-player', 'true')
    expect(root).toHaveClass('vplayer--mini')
    expect(screen.getByRole('toolbar', { name: /mini player controls/i })).toBeInTheDocument()
    expect(screen.queryByRole('toolbar', { name: /^playback controls$/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/skip forward/i)).not.toBeInTheDocument()
    expect(root.querySelector('.vplayer__pause-orb')).not.toBeInTheDocument()
    expect(root.querySelector('.vplayer__mini-progress')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /exit mini player/i }))
    expect(root).toHaveAttribute('data-mini-player', 'false')
  })

  it('does not enter mini-player mode while fullscreen', async () => {
    const user = userEvent.setup()
    let fullscreenElement: Element | null = null

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => fullscreenElement,
    })
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: vi.fn(() => {
        fullscreenElement = document.querySelector('[data-testid="vplayer-root"]')
        document.dispatchEvent(new Event('fullscreenchange'))
        return Promise.resolve()
      }),
    })

    renderTestPlayer({ miniPlayer: true })

    const root = screen.getByTestId('vplayer-root')
    await user.click(screen.getByRole('button', { name: /^fullscreen/i }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /exit fullscreen/i }).getAttribute('aria-pressed')).toBe('true'),
    )

    expect(screen.queryByRole('button', { name: /^mini player$/i })).toBeNull()

    expect(screen.getByRole('button', { name: /exit fullscreen/i }).getAttribute('aria-pressed')).toBe('true')
    expect(root.getAttribute('data-mini-player')).toBe('false')
  })

  it('only toggles fullscreen when double-clicking the player surface, not controls', async () => {
    const requestFullscreen = vi.fn(() => Promise.resolve())
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    })

    renderTestPlayer()

    fireEvent.doubleClick(screen.getByRole('toolbar', { name: /playback controls/i }))
    expect(requestFullscreen).not.toHaveBeenCalled()

    fireEvent.doubleClick(screen.getByTestId('vplayer-root'))
    await waitFor(() => expect(requestFullscreen).toHaveBeenCalledOnce())
  })

  it('runs keyboard shortcuts only when focus is inside the player, not editing text', async () => {
    const user = userEvent.setup()
    const { engine } = renderTestPlayer({
      children: <input aria-label="caption search" />,
    })

    const root = screen.getByRole('application', { name: /video player/i })
    root.focus()
    expect(root).toHaveFocus()

    await user.keyboard('[Space]')
    await waitFor(() => expect(engine.playCalls).toBe(1))

    await user.keyboard('[ArrowRight]')
    expect(engine.seekCalls.at(-1)).toBe(5)

    const input = screen.getByRole('textbox', { name: /caption search/i })
    await user.click(input)
    await user.keyboard('[Space]')
    expect(engine.playCalls).toBe(1)
  })

  it('keeps focus on the player and updates state after fullscreen toggles', async () => {
    const user = userEvent.setup()
    let fullscreenElement: Element | null = null

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => fullscreenElement,
    })

    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: vi.fn(() => {
        fullscreenElement = document.querySelector('[data-testid="vplayer-root"]')
        document.dispatchEvent(new Event('fullscreenchange'))
        return Promise.resolve()
      }),
    })

    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: vi.fn(() => {
        fullscreenElement = null
        document.dispatchEvent(new Event('fullscreenchange'))
        return Promise.resolve()
      }),
    })

    renderTestPlayer()
    const root = screen.getByRole('application', { name: /video player/i })

    await user.click(screen.getByRole('button', { name: /^fullscreen/i }))
    await waitFor(() => expect(root).toHaveFocus())
    expect(screen.getByRole('button', { name: /exit fullscreen/i })).toHaveAttribute('aria-pressed', 'true')

    await user.keyboard('f')
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^fullscreen/i })).toHaveAttribute('aria-pressed', 'false'),
    )
  })

  it('clamps volume and exposes mute through keyboard shortcuts', async () => {
    const user = userEvent.setup()
    const { engine } = renderTestPlayer()
    const root = screen.getByRole('application', { name: /video player/i })

    root.focus()
    await user.keyboard('[ArrowDown][ArrowDown]m')

    expect(engine.volume).toBeCloseTo(0.8)
    expect(engine.muted).toBe(true)
  })

  it('only shows the error overlay for terminal errors', () => {
    renderTestPlayer({ children: <ContextProbe /> })

    act(() => {
      latestCtx?.mediaStore.setState((prev) => ({
        ...prev,
        error: { message: 'Temporary startup failure', reconnectAttempt: 0, isReconnecting: true },
      }))
    })
    expect(screen.queryByText('Temporary startup failure')).toBeNull()

    act(() => {
      latestCtx?.mediaStore.setState((prev) => ({
        ...prev,
        error: { message: 'Permanent load failure', reconnectAttempt: 3, isReconnecting: false },
      }))
    })
    expect(screen.getByText('Permanent load failure').textContent).toBe('Permanent load failure')
  })

  it('toggles debug stats from the context menu', async () => {
    const user = userEvent.setup()
    const { container } = renderTestPlayer()
    const root = screen.getByTestId('vplayer-root')
    const video = container.querySelector('video') as HTMLVideoElement
    Object.defineProperties(video, {
      videoWidth: { configurable: true, value: 1920 },
      videoHeight: { configurable: true, value: 1080 },
      networkState: { configurable: true, value: 2 },
      readyState: { configurable: true, value: 4 },
      getVideoPlaybackQuality: {
        configurable: true,
        value: () => ({ droppedVideoFrames: 2, totalVideoFrames: 120 }),
      },
    })

    fireEvent.contextMenu(root, { clientX: 20, clientY: 20 })
    await user.click(screen.getByRole('menuitem', { name: /debug stats/i }))
    expect(screen.queryByText(/Version:/i)).not.toBeNull()
    expect(screen.queryByText('Version: 0.1.6')).not.toBeNull()
    expect(screen.queryByText('Resolution: 1920×1080')).not.toBeNull()
    expect(screen.queryByText('Frames: 2 dropped / 120 total')).not.toBeNull()
    expect(screen.queryByText('Network: Loading')).not.toBeNull()
    expect(screen.queryByText('Ready: Enough Data')).not.toBeNull()

    fireEvent.contextMenu(root, { clientX: 20, clientY: 20 })
    await user.click(screen.getByRole('menuitem', { name: /debug stats/i }))
    expect(screen.queryByText(/Version:/i)).toBeNull()
  })

  it('fades a loaded poster out after playback starts', async () => {
    const { engine } = renderTestPlayer({ poster: '/poster.jpg' })
    const poster = screen.getByTestId('vplayer-poster')

    expect(poster.classList.contains('vplayer__poster--loaded')).toBe(false)
    fireEvent.load(poster)
    expect(poster.classList.contains('vplayer__poster--loaded')).toBe(true)

    await act(() => engine.play())
    expect(poster.classList.contains('vplayer__poster--hidden')).toBe(true)
  })

  it('configures thumbnail preview size, fit, and seekbar gap from props', async () => {
    const { container } = renderTestPlayer({
      thumbnailPreview: { width: 220, height: 124, gap: 4, fit: 'contain', showTime: true },
      children: <ThumbnailFixture />,
    })

    const root = screen.getByTestId('vplayer-root')
    root.getBoundingClientRect = () =>
      ({ left: 0, width: 400, right: 400, top: 0, bottom: 225, height: 225, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
    expect(root).toHaveStyle({ '--vplayer-thumbnail-width': '220px' })
    expect(root).toHaveStyle({ '--vplayer-thumbnail-height': '124px' })
    expect(root).toHaveStyle({ '--vplayer-thumbnail-gap': '4px' })

    const slider = container.querySelector('.vplayer__seek-slider-control') as HTMLElement
    slider.getBoundingClientRect = () =>
      ({
        left: 100,
        width: 200,
        right: 300,
        top: 0,
        bottom: 10,
        height: 10,
        x: 100,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect

    fireEvent.pointerMove(slider, { clientX: 200, pointerId: 1 })

    await waitFor(() => expect(container.querySelector('.vplayer__seek-preview-frame')).toBeInTheDocument())
    const frame = container.querySelector('.vplayer__seek-preview-frame') as HTMLElement
    expect(frame).toHaveStyle({ width: '220px', height: '124px' })
    expect(container.querySelector('.vplayer__seek-preview')).toHaveStyle({
      '--vplayer-seek-preview-position': '100px',
    })
    expect(frame.querySelector('.vplayer__seek-preview-time')).toHaveTextContent('0:50')
  })

  it('keeps thumbnail previews inside the player frame while time follows the pointer', async () => {
    const { container } = renderTestPlayer({
      thumbnailPreview: { width: 100, height: 56, showTime: true },
      children: <ThumbnailFixture />,
    })
    const root = screen.getByTestId('vplayer-root')
    root.getBoundingClientRect = () =>
      ({ left: 0, width: 300, right: 300, top: 0, bottom: 169, height: 169, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
    const slider = container.querySelector('.vplayer__seek-slider-control') as HTMLElement
    slider.getBoundingClientRect = () =>
      ({ left: 50, width: 200, right: 250, top: 0, bottom: 10, height: 10, x: 50, y: 0, toJSON: () => ({}) }) as DOMRect

    fireEvent.pointerMove(slider, { clientX: 51, pointerId: 1 })
    await waitFor(() => expect(container.querySelector('.vplayer__seek-preview')).not.toBeNull())
    const preview = container.querySelector('.vplayer__seek-preview') as HTMLElement
    expect(preview.style.getPropertyValue('--vplayer-seek-preview-position')).toBe('3px')
    expect(preview.querySelector('.vplayer__seek-preview-time')?.textContent).toBe('0:00')

    fireEvent.pointerMove(slider, { clientX: 249, pointerId: 1 })
    expect(preview.style.getPropertyValue('--vplayer-seek-preview-position')).toBe('197px')
    expect(preview.querySelector('.vplayer__seek-preview-time')?.textContent).toBe('1:39')
  })

  it('cycles common VLC-style aspect ratios inside the media viewport only', async () => {
    const user = userEvent.setup()
    const { container } = renderTestPlayer()
    const root = screen.getByRole('application', { name: /video player/i })
    const video = container.querySelector('video') as HTMLVideoElement
    const viewport = screen.getByTestId('vplayer-media-viewport')

    root.focus()
    await user.keyboard('a')
    expect(video.style.objectFit).toBe('contain')
    expect(video.style.getPropertyValue('--vplayer-media-aspect-ratio')).toBe('16 / 9')
    expect(root).toHaveClass('vplayer--media-16-9')
    expect(root.style.getPropertyValue('--vplayer-aspect-ratio')).toBe('')
    expect(viewport).toBeInTheDocument()

    await user.keyboard('a')
    expect(video.style.getPropertyValue('--vplayer-media-aspect-ratio')).toBe('4 / 3')
    expect(root).toHaveClass('vplayer--media-4-3')
  })

  it('auto-hides mini-player controls after playback starts', async () => {
    vi.useFakeTimers()
    const { engine } = renderTestPlayer({
      miniPlayer: true,
      children: (
        <>
          {' '}
          <DefaultLayoutForTest /> <ContextProbe />{' '}
        </>
      ),
    })

    const root = screen.getByTestId('vplayer-root')
    fireEvent.click(screen.getByRole('button', { name: /mini player/i }))
    expect(root).toHaveClass('vplayer--mini')

    await act(async () => {
      await engine.play()
    })
    await act(async () => {})
    expect(vi.getTimerCount()).toBeGreaterThan(0)
    await act(async () => {
      vi.advanceTimersByTime(3200)
    })

    expect(latestCtx?.mediaStore.state.isPlaying).toBe(true)
    expect(latestCtx?.mediaStore.state.controlsVisible).toBe(false)
    expect(root).toHaveClass('vplayer--controls-hidden')
  })
})
