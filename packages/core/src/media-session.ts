/**
 * media-session — Media Session API integration.
 *
 * Browsers project this to OS media controls (MPRIS on Linux desktops),
 * which drive system notifications, lock-screen controls, and media keys.
 * Metadata alone is not enough: without `playbackState` and action
 * handlers the OS entry goes stale and its buttons are dead.
 */

import { isFiniteDuration } from './media-capabilities'
import type { MediaRemote, MediaSessionMetadataOptions } from './types'

const SEEK_FALLBACK_SECONDS = 10
const POSITION_SYNC_THRESHOLD_SECONDS = 1

type SessionPlaybackState = 'playing' | 'paused'

const HANDLED_ACTIONS = ['play', 'pause', 'seekbackward', 'seekforward', 'seekto'] as const

export interface MediaSessionController {
  setup(remote: MediaRemote): void
  syncMetadata(title: string | undefined, metadata?: MediaSessionMetadataOptions, poster?: string): void
  setPlaybackState(state: SessionPlaybackState): void
  syncPosition(duration: number, currentTime: number, playbackRate: number, force?: boolean): void
  readonly hasMetadata: boolean
  teardown(): void
}

function getSession(): MediaSession | null {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return null
  return navigator.mediaSession
}

function trySetActionHandler(
  session: MediaSession,
  action: MediaSessionAction,
  handler: MediaSessionActionHandler | null,
): void {
  if (typeof session.setActionHandler !== 'function') return
  try {
    session.setActionHandler(action, handler)
  } catch {
    // Unsupported action on this platform — non-fatal.
  }
}

export function createMediaSessionController(): MediaSessionController {
  let metadata: MediaMetadata | null = null
  let lastTitle: string | undefined
  let lastArtwork: string | undefined
  let lastArtist: string | undefined
  let lastAlbum: string | undefined
  let handlersRegistered = false
  let lastSyncedPosition = Number.NaN
  let lastSyncedDuration = Number.NaN
  let lastSyncedRate = Number.NaN

  function clearMetadata(): void {
    const session = getSession()
    if (session && metadata && session.metadata === metadata) {
      session.metadata = null
    }
    metadata = null
    lastTitle = undefined
    lastArtwork = undefined
    lastArtist = undefined
    lastAlbum = undefined
  }

  function setup(remote: MediaRemote): void {
    const session = getSession()
    if (!session || handlersRegistered) return
    trySetActionHandler(session, 'play', () => remote.play())
    trySetActionHandler(session, 'pause', () => remote.pause())
    trySetActionHandler(session, 'seekbackward', (details) => {
      remote.skip(-(details.seekOffset ?? SEEK_FALLBACK_SECONDS))
    })
    trySetActionHandler(session, 'seekforward', (details) => {
      remote.skip(details.seekOffset ?? SEEK_FALLBACK_SECONDS)
    })
    trySetActionHandler(session, 'seekto', (details) => {
      if (typeof details.seekTime === 'number') remote.seek(details.seekTime)
    })
    handlersRegistered = true
  }

  function syncMetadata(title: string | undefined, overrides?: MediaSessionMetadataOptions, poster?: string): void {
    const session = getSession()
    if (!session || typeof MediaMetadata === 'undefined') return

    const normalizedTitle = title?.trim() || undefined
    const normalizedArtwork = overrides?.artwork ?? poster
    const normalizedArtist = overrides?.artist?.trim() || undefined
    const normalizedAlbum = overrides?.album?.trim() || undefined
    if (!normalizedTitle) {
      clearMetadata()
      return
    }
    // Avoid recreating metadata (which resets the OS notification) when unchanged.
    if (
      metadata &&
      session.metadata === metadata &&
      lastTitle === normalizedTitle &&
      lastArtwork === normalizedArtwork &&
      lastArtist === normalizedArtist &&
      lastAlbum === normalizedAlbum
    ) {
      return
    }

    const next = new MediaMetadata({
      title: normalizedTitle,
      ...(normalizedArtist ? { artist: normalizedArtist } : {}),
      ...(normalizedAlbum ? { album: normalizedAlbum } : {}),
      artwork: normalizedArtwork ? [{ src: normalizedArtwork }] : [],
    })
    session.metadata = next
    metadata = next
    lastTitle = normalizedTitle
    lastArtwork = normalizedArtwork
    lastArtist = normalizedArtist
    lastAlbum = normalizedAlbum
  }

  function setPlaybackState(state: SessionPlaybackState): void {
    const session = getSession()
    if (!session) return
    session.playbackState = state
  }

  function syncPosition(duration: number, currentTime: number, playbackRate: number, force = false): void {
    const session = getSession()
    if (!session || typeof session.setPositionState !== 'function') return
    if (!isFiniteDuration(duration) || !Number.isFinite(currentTime) || currentTime < 0) return
    if (
      !force &&
      Number.isFinite(lastSyncedPosition) &&
      Math.abs(currentTime - lastSyncedPosition) < POSITION_SYNC_THRESHOLD_SECONDS &&
      duration === lastSyncedDuration &&
      playbackRate === lastSyncedRate
    ) {
      return
    }
    try {
      session.setPositionState({
        duration,
        playbackRate,
        position: Math.min(currentTime, duration),
      })
      lastSyncedPosition = currentTime
      lastSyncedDuration = duration
      lastSyncedRate = playbackRate
    } catch {
      // Throws when no metadata is set — non-fatal.
    }
  }

  function teardown(): void {
    const session = getSession()
    if (session) {
      if (handlersRegistered) {
        for (const action of HANDLED_ACTIONS) trySetActionHandler(session, action, null)
        handlersRegistered = false
      }
      session.playbackState = 'none'
    }
    clearMetadata()
    lastSyncedPosition = Number.NaN
    lastSyncedDuration = Number.NaN
    lastSyncedRate = Number.NaN
  }

  return {
    setup,
    syncMetadata,
    setPlaybackState,
    syncPosition,
    get hasMetadata() {
      return metadata !== null
    },
    teardown,
  }
}
