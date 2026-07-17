import type { Page } from '@playwright/test'

export async function installMediaMock(page: Page) {
  await page.addInitScript(() => {
    const state = new WeakMap<
      HTMLMediaElement,
      { paused: boolean; currentTime: number; volume: number; muted: boolean; rate: number }
    >()

    const getState = (element: HTMLMediaElement) => {
      let value = state.get(element)
      if (!value) {
        value = { paused: true, currentTime: 0, volume: 1, muted: false, rate: 1 }
        state.set(element, value)
      }
      return value
    }

    Object.defineProperties(HTMLMediaElement.prototype, {
      paused: {
        configurable: true,
        get() {
          return getState(this).paused
        },
      },
      ended: {
        configurable: true,
        get() {
          return false
        },
      },
      duration: {
        configurable: true,
        get() {
          return 120
        },
      },
      currentTime: {
        configurable: true,
        get() {
          return getState(this).currentTime
        },
        set(value: number) {
          getState(this).currentTime = value
          this.dispatchEvent(new Event('seeking'))
          this.dispatchEvent(new Event('timeupdate'))
          this.dispatchEvent(new Event('seeked'))
        },
      },
      volume: {
        configurable: true,
        get() {
          return getState(this).volume
        },
        set(value: number) {
          getState(this).volume = value
          this.dispatchEvent(new Event('volumechange'))
        },
      },
      muted: {
        configurable: true,
        get() {
          return getState(this).muted
        },
        set(value: boolean) {
          getState(this).muted = value
          this.dispatchEvent(new Event('volumechange'))
        },
      },
      playbackRate: {
        configurable: true,
        get() {
          return getState(this).rate
        },
        set(value: number) {
          getState(this).rate = value
          this.dispatchEvent(new Event('ratechange'))
        },
      },
      buffered: {
        configurable: true,
        get() {
          return { length: 1, start: () => 0, end: () => 60 }
        },
      },
      videoWidth: {
        configurable: true,
        get() {
          return 1920
        },
      },
      videoHeight: {
        configurable: true,
        get() {
          return 1080
        },
      },
    })

    HTMLMediaElement.prototype.play = async function () {
      getState(this).paused = false
      this.dispatchEvent(new Event('play'))
      this.dispatchEvent(new Event('playing'))
    }

    HTMLMediaElement.prototype.pause = function () {
      getState(this).paused = true
      this.dispatchEvent(new Event('pause'))
    }

    HTMLMediaElement.prototype.load = function () {
      queueMicrotask(() => {
        this.dispatchEvent(new Event('loadedmetadata'))
        this.dispatchEvent(new Event('loadeddata'))
        this.dispatchEvent(new Event('canplay'))
        this.dispatchEvent(new Event('progress'))
      })
    }

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get() {
        return document.querySelector('[data-fullscreen="true"]')
      },
    })

    Element.prototype.requestFullscreen = async function () {
      this.setAttribute('data-fullscreen', 'true')
      document.dispatchEvent(new Event('fullscreenchange'))
    }

    document.exitFullscreen = async () => {
      document.querySelector('[data-fullscreen="true"]')?.removeAttribute('data-fullscreen')
      document.dispatchEvent(new Event('fullscreenchange'))
    }
  })
}
