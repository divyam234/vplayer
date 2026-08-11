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
}

export class LocalPlaybackProgressStore implements PlaybackProgressStore {
  private readonly storage: Storage

  constructor(storage = new Storage({ prefix: 'vplayer:progress' })) {
    this.storage = storage
  }

  async load(mediaId: string): Promise<PlaybackProgress | null> {
    return this.storage.get<PlaybackProgress>(encodeURIComponent(mediaId)) ?? null
  }

  async save(mediaId: string, progress: PlaybackProgress): Promise<void> {
    this.storage.set(encodeURIComponent(mediaId), progress)
  }

  async clear(mediaId: string): Promise<void> {
    this.storage.remove(encodeURIComponent(mediaId))
  }
}
