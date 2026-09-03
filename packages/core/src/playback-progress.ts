import { Storage } from './storage'

export interface PlaybackProgress {
  time: number
  duration: number
}

export interface PlaybackProgressStore {
  load(mediaId: string): Promise<PlaybackProgress | null>
  save(mediaId: string, progress: PlaybackProgress): Promise<void>
  clear(mediaId: string): Promise<void>
}

export interface PlaybackProgressOptions {
  id?: string
  store?: PlaybackProgressStore
  /** Normalize the media URL used as the progress key. Defaults to true. */
  normalizeUrl?: boolean
  /** Milliseconds before the resume prompt dismisses itself. Use 0 to keep it visible. Defaults to 5000. */
  resumePromptTimeout?: number
}

export class LocalPlaybackProgressStore implements PlaybackProgressStore {
  private readonly storage: Storage
  private readonly maxEntries: number

  constructor(storage = new Storage(), maxEntries = 100) {
    this.storage = storage
    this.maxEntries = maxEntries
  }

  async load(mediaId: string): Promise<PlaybackProgress | null> {
    return this.storage.get<Record<string, PlaybackProgress>>('progress')?.[mediaId] ?? null
  }

  async save(mediaId: string, progress: PlaybackProgress): Promise<void> {
    const entries = this.storage.get<Record<string, PlaybackProgress>>('progress') ?? {}
    delete entries[mediaId]
    entries[mediaId] = progress

    const keys = Object.keys(entries)
    while (keys.length > this.maxEntries) {
      const oldest = keys.shift()
      if (oldest !== undefined) delete entries[oldest]
    }

    this.storage.set('progress', entries)
  }

  async clear(mediaId: string): Promise<void> {
    const entries = this.storage.get<Record<string, PlaybackProgress>>('progress') ?? {}
    delete entries[mediaId]
    if (Object.keys(entries).length === 0) this.storage.remove('progress')
    else this.storage.set('progress', entries)
  }
}
