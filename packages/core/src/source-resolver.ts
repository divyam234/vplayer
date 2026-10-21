import { canUseNativeHLS } from './media-capabilities'
import { DashMediaEngine, HlsMediaEngine, MatroskaMediaEngine, NativeVideoEngine } from './media-engine'
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

/** Matroska and WebM, by MIME type or by file extension. */
export function isMatroskaSource(source: PlayerSource): boolean {
  const type = source.type?.toLowerCase().split(';', 1)[0]?.trim() ?? ''
  if (['video/x-matroska', 'audio/x-matroska', 'video/webm', 'audio/webm'].includes(type)) return true
  return /\.(mkv|mka|webm)$/i.test(getPath(source.src))
}

export function toPlayerSource(options: Pick<PlayerOptions, 'src' | 'type'>): PlayerSource {
  return { src: options.src, type: options.type }
}

/** Things the player knows that an engine may use. */
export interface MediaEngineContext {
  /** Locale for language names, e.g. "en". */
  locale?: string
  /** Name for an embedded track that has neither a title nor a language. */
  trackName?: (number: number) => string
  /** Language to start on when an embedded file has an audio track in it. */
  preferredAudioLanguage?: string
}

export function createResolvedMediaEngine(
  video: HTMLVideoElement,
  options: Pick<PlayerOptions, 'src' | 'type' | 'engine' | 'hlsConfig' | 'dashConfig' | 'embeddedTracks'>,
  context: MediaEngineContext = {},
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

  // Opt-in: only Matroska/WebM sources, and only when the player asked for their tracks.
  if (options.embeddedTracks === true && isMatroskaSource(source)) {
    return new MatroskaMediaEngine(video, { src: source.src, ...context })
  }

  video.src = source.src
  return new NativeVideoEngine(video)
}
