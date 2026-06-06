import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

class TestResizeObserver implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  value: TestResizeObserver,
  configurable: true,
})

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = vi.fn()
}

if (!HTMLMediaElement.prototype.load) {
  HTMLMediaElement.prototype.load = vi.fn()
}

Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  configurable: true,
  value: vi.fn(() => Promise.resolve()),
})

Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  value: vi.fn(),
})

afterEach(() => cleanup())

Object.defineProperty(globalThis, 'fetch', {
  configurable: true,
  value: vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('thumbnails.vtt')) {
      return new Response(
        `WEBVTT

00:00:00.000 --> 00:00:10.000
/thumbs/thumb-1.svg
`,
        { status: 200 },
      )
    }
    if (url.includes('captions.en.vtt')) {
      return new Response(
        `WEBVTT

00:00:00.000 --> 00:00:02.000
Demo caption
`,
        { status: 200 },
      )
    }
    return new Response('', { status: 404 })
  }),
})
