import { canUseNativeHLS } from './media-capabilities'
import { DashMediaEngine, HlsMediaEngine, NativeVideoEngine } from './media-engine'
import type { MediaEngine } from './media-engine'
import type { PlayerOptions } from './types'

export type SourceKind = 'native' | 'hls' | 'dash' | 'unknown'

export interface PlayerSource {
  src: string
  type?: string
}

function getPath(url: string): string {
  try {
    return new URL(
      url,
      typeof window !== 'undefined' ? window.location.href : 'http://localhost',
    ).pathname.toLowerCase()
  } catch {
    return url.toLowerCase().split('?')[0].split('#')[0]
  }
}

export function detectSourceKind(source: PlayerSource): SourceKind {
  const type = source.type?.toLowerCase() ?? ''
  const path = getPath(source.src)
  if (type.includes('mpegurl') || type.includes('hls') || path.endsWith('.m3u8')) return 'hls'
  if (type.includes('dash') || path.endsWith('.mpd')) return 'dash'
  if (/\.(mp4|m4v|webm|ogv|ogg|mov)$/i.test(path) || type.startsWith('video/')) return 'native'
  return 'unknown'
}

export function toPlayerSource(options: Pick<PlayerOptions, 'src' | 'type'>): PlayerSource {
  return { src: options.src, type: options.type }
}

export function createResolvedMediaEngine(
  video: HTMLVideoElement,
  options: Pick<PlayerOptions, 'src' | 'type' | 'engine' | 'hlsConfig' | 'dashConfig'>,
): MediaEngine {
  if (options.engine) {
    return typeof options.engine === 'function' ? options.engine(video) : options.engine
  }

  const source = toPlayerSource(options)
  const kind = detectSourceKind(source)

  if (kind === 'hls' && !canUseNativeHLS(video)) {
    return new HlsMediaEngine(video, { src: source.src, hlsConfig: options.hlsConfig })
  }

  if (kind === 'dash') {
    return new DashMediaEngine(video, { src: source.src, dashConfig: options.dashConfig })
  }

  video.src = source.src
  return new NativeVideoEngine(video)
}
