export interface SubtitleCue {
  index: number
  start: number // seconds
  end: number // seconds
  text: string
}

export interface SubtitleTrack {
  src: string
  lang: string
  label: string
  default?: boolean
}

/** Parse HH:MM:SS.mmm or HH:MM:SS,mmm timestamp → total seconds */
export function parseTimestamp(ts: string): number {
  const cleaned = ts.replace(',', '.')
  const parts = cleaned.split(':')
  if (parts.length === 3) {
    return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2])
  }
  if (parts.length === 2) {
    return Number(parts[0]) * 60 + Number(parts[1])
  }
  return Number(parts[0])
}

/** Parse SRT format text into cues */
export function parseSRT(content: string): SubtitleCue[] {
  const blocks = content.trim().replace(/\r\n/g, '\n').split(/\n\n+/)
  return blocks
    .map((block) => {
      const lines = block.split('\n')
      if (lines.length < 3) return null

      const index = Number.parseInt(lines[0], 10)
      if (Number.isNaN(index)) return null

      const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})/)
      if (!timeMatch) return null

      const text = lines.slice(2).join('\n')
      return {
        index,
        start: parseTimestamp(timeMatch[1]),
        end: parseTimestamp(timeMatch[2]),
        text,
      }
    })
    .filter((c): c is SubtitleCue => c !== null)
}

/** Parse VTT format text into cues */
export function parseVTT(content: string): SubtitleCue[] {
  // Remove WEBVTT header and metadata
  let text = content.replace(/\r\n/g, '\n')
  const headerEnd = text.indexOf('\n\n')
  if (headerEnd > 0) {
    text = text.slice(headerEnd + 2)
  }

  const blocks = text.trim().split(/\n\n+/)
  let index = 0
  return blocks
    .map((block) => {
      const lines = block.split('\n')

      // Skip notes and styles
      if (lines[0]?.startsWith('NOTE') || lines[0]?.startsWith('STYLE')) return null

      const timeLineIndex = lines.findIndex((l) => l.includes('-->'))
      if (timeLineIndex === -1) return null

      const timeMatch = lines[timeLineIndex].match(/(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})/)
      if (!timeMatch) return null

      const textLines = lines.slice(timeLineIndex + 1).filter((l) => l.trim().length > 0)
      if (textLines.length === 0) return null

      index++
      return {
        index,
        start: parseTimestamp(timeMatch[1]),
        end: parseTimestamp(timeMatch[2]),
        text: textLines.join('\n'),
      }
    })
    .filter((c): c is SubtitleCue => c !== null)
}

/** Fetch and parse subtitles from URL */
export async function fetchSubtitles(track: SubtitleTrack): Promise<SubtitleCue[]> {
  const resp = await fetch(track.src)
  const text = await resp.text()

  if (track.src.endsWith('.srt')) {
    return parseSRT(text)
  }
  return parseVTT(text)
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
