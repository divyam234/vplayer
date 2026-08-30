export type SubtitleFormat = 'vtt' | 'srt'

export interface SubtitleCue {
  index: number
  start: number
  end: number
  text: string
  id?: string
  settings?: string
}

export interface SubtitleTrack {
  id?: string
  src?: string
  content?: string
  lang: string
  label: string
  format?: SubtitleFormat
  default?: boolean
  local?: boolean
}

export interface SubtitleCatalog {
  list(signal: AbortSignal): Promise<SubtitleTrack[]>
}

export interface CaptionSettings {
  fontSize: 'small' | 'medium' | 'large'
  fontScale: number
  fontFamily: 'sans' | 'serif' | 'monospace'
  textColor: string
  textOpacity: number
  backgroundColor: string
  backgroundOpacity: number
  edgeStyle: 'none' | 'shadow' | 'outline'
  edgeColor: string
  position: number
  lineHeight: number
  delay: number
}

export const DEFAULT_CAPTION_SETTINGS: CaptionSettings = {
  fontSize: 'medium',
  fontScale: 100,
  fontFamily: 'sans',
  textColor: '#ffffff',
  textOpacity: 1,
  backgroundColor: '#000000',
  backgroundOpacity: 0.75,
  edgeStyle: 'shadow',
  edgeColor: '#000000',
  position: 0,
  lineHeight: 1.35,
  delay: 0,
}

export interface SubtitleParseError {
  code: 'unsupported-format' | 'malformed'
  message: string
}

export type SubtitleParseResult =
  | { ok: true; format: SubtitleFormat; cues: SubtitleCue[] }
  | { ok: false; format?: undefined; error: SubtitleParseError }

const TIMESTAMP_SOURCE = '(?:\\d{2}:)?\\d{2}:\\d{2}[.,]\\d{3}'
const TIMING_PATTERN = new RegExp(`^(${TIMESTAMP_SOURCE})\\s*-->\\s*(${TIMESTAMP_SOURCE})(?:\\s+(.*))?$`)

function normalizeSubtitleText(content: string): string {
  return content.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
}

/** Parse HH:MM:SS.mmm, MM:SS.mmm, and comma-separated variants. */
export function parseTimestamp(timestamp: string): number {
  const parts = timestamp.replace(',', '.').split(':').map(Number)
  if (parts.some((part) => !Number.isFinite(part))) return Number.NaN
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0]
}

function parseCueBlocks(content: string, format: SubtitleFormat): SubtitleCue[] {
  let text = normalizeSubtitleText(content).trim()
  if (format === 'vtt') {
    const firstBreak = text.indexOf('\n')
    text = (firstBreak === -1 ? '' : text.slice(firstBreak + 1)).trim()
  }

  const cues: SubtitleCue[] = []
  for (const block of text.split(/\n{2,}/)) {
    const lines = block.split('\n').map((line) => line.trimEnd())
    const first = lines[0]?.trim()
    if (!first || first.startsWith('NOTE') || first === 'STYLE' || first === 'REGION') continue
    const timingIndex = lines.findIndex((line) => TIMING_PATTERN.test(line.trim()))
    if (timingIndex === -1) continue
    const match = TIMING_PATTERN.exec(lines[timingIndex].trim())
    if (!match) continue
    const start = parseTimestamp(match[1])
    const end = parseTimestamp(match[2])
    const cueText = lines
      .slice(timingIndex + 1)
      .filter((line) => line.trim().length > 0)
      .join('\n')
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !cueText) continue
    const id = timingIndex > 0 ? lines[timingIndex - 1]?.trim() : undefined
    cues.push({
      index: cues.length + 1,
      start,
      end,
      text: cueText,
      ...(id && !/^\d+$/.test(id) ? { id } : {}),
      ...(match[3] ? { settings: match[3] } : {}),
    })
  }
  return cues
}

export function parseSRT(content: string): SubtitleCue[] {
  return parseCueBlocks(content, 'srt')
}

export function parseVTT(content: string): SubtitleCue[] {
  return parseCueBlocks(content, 'vtt')
}

export function parseSubtitles(
  content: string,
  hint: { format?: SubtitleFormat; fileName?: string; mimeType?: string } = {},
): SubtitleParseResult {
  const normalized = normalizeSubtitleText(content).trimStart()
  const extension = hint.fileName?.toLowerCase().match(/\\.(vtt|srt)$/)?.[1] as SubtitleFormat | undefined
  const mimeFormat = hint.mimeType === 'text/vtt' ? 'vtt' : hint.mimeType === 'application/x-subrip' ? 'srt' : undefined
  const detected = normalized.startsWith('WEBVTT')
    ? 'vtt'
    : TIMING_PATTERN.test(normalized.split('\n')[0] ?? '')
      ? 'srt'
      : undefined
  const format = hint.format ?? mimeFormat ?? extension ?? detected
  if (!format)
    return { ok: false, error: { code: 'unsupported-format', message: 'Expected a WebVTT or SRT subtitle file.' } }
  const cues = format === 'vtt' ? parseVTT(normalized) : parseSRT(normalized)
  if (cues.length === 0)
    return { ok: false, error: { code: 'malformed', message: `No valid ${format.toUpperCase()} cues were found.` } }
  return { ok: true, format, cues }
}

/** Fetch and parse subtitles from URL. */
export async function fetchSubtitles(track: SubtitleTrack, signal?: AbortSignal): Promise<SubtitleCue[]> {
  if (track.content !== undefined) {
    const result = parseSubtitles(track.content, { format: track.format, fileName: track.label })
    if (!result.ok) throw new Error(result.error.message)
    return result.cues
  }
  if (!track.src) throw new Error('Subtitle track has no source.')
  const response = await fetch(track.src, { signal })
  if (!response.ok) throw new Error(`Failed to fetch subtitles: ${response.status}`)
  const result = parseSubtitles(await response.text(), {
    format: track.format,
    fileName: track.src,
    mimeType: response.headers.get('content-type')?.split(';')[0],
  })
  if (!result.ok) throw new Error(result.error.message)
  return result.cues
}

/** Get active cue at a given time */
export function getActiveCue(cues: SubtitleCue[], time: number): SubtitleCue | null {
  // Binary search for efficiency
  let lo = 0
  let hi = cues.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const cue = cues[mid]
    if (time < cue.start) {
      hi = mid - 1
    } else if (time > cue.end) {
      lo = mid + 1
    } else {
      return cue
    }
  }
  return null
}

// ── Thumbnail preview support ────────────────────────────────

export interface ThumbnailCue {
  start: number
  end: number
  /** Sprite sheet image URL */
  src: string
  /** Crop x on sprite */
  x: number
  /** Crop y on sprite */
  y: number
  /** Crop width */
  w: number
  /** Crop height */
  h: number
}

/** Extract #xywh=x,y,w,h fragment from a URL */
function parseSpriteFragment(url: string): { src: string; x: number; y: number; w: number; h: number } | null {
  const match = url.match(/#xywh=(\d+),(\d+),(\d+),(\d+)/)
  if (!match) return null
  return {
    src: url.replace(/#xywh=.*$/, ''),
    x: Number(match[1]),
    y: Number(match[2]),
    w: Number(match[3]),
    h: Number(match[4]),
  }
}

/** Parse a VTT thumbnail sprite file into cues */
export function parseThumbnailVTT(content: string): ThumbnailCue[] {
  let text = content.replace(/\r\n/g, '\n')
  const headerEnd = text.indexOf('\n\n')
  if (headerEnd > 0) text = text.slice(headerEnd + 2)

  const blocks = text.trim().split(/\n\n+/)

  return blocks
    .map((block) => {
      const lines = block.split('\n')
      const timeLineIndex = lines.findIndex((l) => l.includes('-->'))
      if (timeLineIndex === -1) return null

      const timeMatch = lines[timeLineIndex].match(/(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})/)
      if (!timeMatch) return null

      const urlLine = lines.slice(timeLineIndex + 1).find((l) => l.trim().length > 0)
      if (!urlLine) return null

      const rawUrl = urlLine.trim()
      const fragment = parseSpriteFragment(rawUrl)
      const start = parseTimestamp(timeMatch[1])
      const end = parseTimestamp(timeMatch[2])
      if (fragment) {
        return {
          start,
          end,
          src: fragment.src,
          x: fragment.x,
          y: fragment.y,
          w: fragment.w,
          h: fragment.h,
        }
      }

      return {
        start,
        end,
        src: rawUrl,
        x: 0,
        y: 0,
        w: 160,
        h: 90,
      }
    })
    .filter((c): c is ThumbnailCue => c !== null)
}

/** Fetch and parse a VTT thumbnail file */
function resolveUrl(value: string, baseUrl: string): string {
  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return value
  }
}

export async function fetchThumbnails(
  url: string,
  signal?: AbortSignal,
  transform?: (content: string, responseUrl: string) => string | Promise<string>,
): Promise<ThumbnailCue[]> {
  const resp = await fetch(url, { signal })
  if (!resp.ok) throw new Error(`Failed to fetch thumbnail VTT: ${resp.status}`)
  const responseUrl = resp.url || url
  const rawText = await resp.text()
  const text = transform ? await transform(rawText, responseUrl) : rawText
  return parseThumbnailVTT(text).map((cue) => {
    cue.src = resolveUrl(cue.src, responseUrl)
    return cue
  })
}

/** Find the matching thumbnail cue for a given time */
export function getThumbnailAtTime(cues: ThumbnailCue[], time: number): ThumbnailCue | null {
  if (cues.length === 0) return null
  let lo = 0
  let hi = cues.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const cue = cues[mid]
    if (time < cue.start) {
      hi = mid - 1
    } else if (time >= cue.end) {
      lo = mid + 1
    } else {
      return cue
    }
  }
  return null
}
