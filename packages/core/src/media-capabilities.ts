export interface MediaCapabilitiesSnapshot {
  mse: boolean
  nativeHls: boolean
  fullscreen: boolean
  pictureInPicture: boolean
  textTracks: boolean
}

export function canUseMSE(): boolean {
  return typeof window !== 'undefined' && 'MediaSource' in window
}

export function canUseNativeHLS(video?: HTMLVideoElement | null): boolean {
  if (!video) return false
  return video.canPlayType('application/vnd.apple.mpegurl') !== '' || video.canPlayType('application/x-mpegURL') !== ''
}

export function canUseFullscreen(container?: HTMLElement | null): boolean {
  const el = container as (HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }) | null | undefined
  return !!el && (typeof el.requestFullscreen === 'function' || typeof el.webkitRequestFullscreen === 'function')
}

export function canUsePictureInPicture(video?: HTMLVideoElement | null): boolean {
  if (!video || typeof document === 'undefined') return false
  return (
    'pictureInPictureEnabled' in document &&
    Boolean(document.pictureInPictureEnabled) &&
    'requestPictureInPicture' in video
  )
}

export function canUseTextTracks(video?: HTMLVideoElement | null): boolean {
  return !!video && 'textTracks' in video
}

export function getMediaCapabilities(
  video?: HTMLVideoElement | null,
  container?: HTMLElement | null,
): MediaCapabilitiesSnapshot {
  return {
    mse: canUseMSE(),
    nativeHls: canUseNativeHLS(video),
    fullscreen: canUseFullscreen(container),
    pictureInPicture: canUsePictureInPicture(video),
    textTracks: canUseTextTracks(video),
  }
}

export function isFiniteDuration(value: number): boolean {
  return Number.isFinite(value) && value > 0
}
