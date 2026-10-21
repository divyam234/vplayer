/**
 * Entry point of the embedded-tracks feature. Loaded on demand by MatroskaMediaEngine; nothing
 * else imports this module statically, so it stays out of the default bundle.
 */
export { createEmbeddedTracks, subtitleId } from './controller'
export type {
  AudioChoice,
  EmbeddedTracks,
  EmbeddedTracksOptions,
  PlaybackSource,
  SubtitleChoice,
  TracksSnapshot,
} from './controller'
