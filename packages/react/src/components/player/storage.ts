/**
 * Lightweight localStorage wrapper with in-memory fallback.
 * Persists user preferences: volume, playback rate, subtitle, etc.
 */
const DEFAULT_KEY_PREFIX = 'vplayer'

export interface StorageOptions {
  prefix?: string
}

export class Storage {
  private fallback = new Map<string, string>()
  private prefix: string

  constructor(options: StorageOptions = {}) {
    this.prefix = options.prefix ?? DEFAULT_KEY_PREFIX
  }

  private fullKey(key: string): string {
    return `${this.prefix}:${key}`
  }

  get<T = unknown>(key: string): T | undefined {
    const fk = this.fullKey(key)
    try {
      const raw = window.localStorage.getItem(fk)
      return raw !== null ? (JSON.parse(raw) as T) : undefined
    } catch {
      const raw = this.fallback.get(fk)
      return raw !== undefined ? (JSON.parse(raw) as T) : undefined
    }
  }

  set<T = unknown>(key: string, value: T): void {
    const fk = this.fullKey(key)
    try {
      window.localStorage.setItem(fk, JSON.stringify(value))
    } catch {
      this.fallback.set(fk, JSON.stringify(value))
    }
  }

  remove(key: string): void {
    const fk = this.fullKey(key)
    try {
      window.localStorage.removeItem(fk)
    } catch {
      /* ignore */
    }
    this.fallback.delete(fk)
  }

  clear(): void {
    // Only clear keys with our prefix
    try {
      const toRemove: string[] = []
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i)
        if (k?.startsWith(this.prefix + ':')) toRemove.push(k)
      }
      toRemove.forEach((k) => window.localStorage.removeItem(k))
    } catch {
      /* ignore */
    }
    this.fallback.clear()
  }
}

/** Pre-defined persistence keys */
export const STORAGE_KEYS = {
  VOLUME: 'volume',
  MUTED: 'muted',
  PLAYBACK_RATE: 'playbackRate',
  SUBTITLE_LANG: 'subtitleLang',
  QUALITY: 'quality',
  PLAYBACK_PROGRESS: 'playbackProgress', // auto-resume
  LOOP: 'loop',
  FLIP: 'flip',
  ASPECT_RATIO: 'aspectRatio',
} as const
