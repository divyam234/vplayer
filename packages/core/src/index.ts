export { createPlayer } from './player'
export { createGestureEngine } from './gesture-engine'
export type { GestureEngineCallbacks, GestureHandlers } from './gesture-engine'
export { EventBus } from './event-bus'
export type { PlayerEventName, PlayerEventHandler } from './event-bus'
export { Storage, STORAGE_KEYS } from './storage'
export { LocalPlaybackProgressStore } from './playback-progress'
export type { PlaybackProgress, PlaybackProgressStore, PlaybackProgressOptions } from './playback-progress'
export { I18n } from './i18n'
export type { LanguageDict } from './i18n'
export { HotkeyRegistry } from './hotkey-registry'
export type { HotkeyBinding } from './hotkey-registry'
export {
  parseSRT,
  parseVTT,
  fetchSubtitles,
  getActiveCue,
  fetchThumbnails,
  parseThumbnailVTT,
  getThumbnailAtTime,
  parseTimestamp,
} from './subtitle-parser'
export type { SubtitleCue, SubtitleTrack, ThumbnailCue } from './subtitle-parser'
export { detectSourceKind, toPlayerSource, createResolvedMediaEngine } from './source-resolver'
export type { PlayerSource, SourceKind } from './source-resolver'
export {
  canUseMSE,
  canUseNativeHLS,
  canUseFullscreen,
  canUsePictureInPicture,
  canUseTextTracks,
  getMediaCapabilities,
  isFiniteDuration,
} from './media-capabilities'
export type { MediaCapabilitiesSnapshot } from './media-capabilities'
export { formatTime } from './utils'
export { defaultPlayerLabels } from './defaults'

// ── Media Engine ──────────────────────────────────────────
export { BaseMediaEngine, NativeVideoEngine, HlsMediaEngine, DashMediaEngine } from './media-engine'
export type {
  MediaEngine,
  MediaEngineDimensions,
  MediaEngineError,
  MediaEngineEvent,
  MediaEngineEventHandler,
  HlsMediaEngineOptions,
  DashMediaEngineOptions,
} from './media-engine'

// ── State slices (advanced selectors) ─────────────────────
export {
  createMediaStore,
  getInitialMediaState,
  selectMedia,
  selectAudio,
  selectPreferences,
  selectUI,
  selectPlugins,
  selectThumbnails,
  selectError,
} from './state/slices'

// ── Types ─────────────────────────────────────────────────
export type {
  PlayerOptions,
  TransformThumbnailVTT,
  MediaState,
  MediaRemote,
  PlayerLabels,
  PlayerInstance,
  PlayerSystems,
  PlayerError,
  PlaybackStatus,
} from './types'

export type {
  ControlRegistration,
  SettingRegistration,
  LayerRegistration,
  ContextMenuItem,
  ContextMenuRegistration,
  PlayerPlugin,
  PluginAPI,
  RemoteRef,
  PlayerContextRef,
  FlipState,
  AspectRatioState,
  SettingItem,
} from './plugin-api'
