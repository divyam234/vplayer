export { VideoPlayer } from './player'

export { ControlsBar, PlayerChrome } from './layout/player-chrome'

export { DefaultVideoLayout } from './layout/default-video-layout'

export { CompactVideoLayout } from './layout/compact-video-layout'

export { LargeVideoLayout } from './layout/large-video-layout'

export {
  SeekBar,
  PlayButton,
  SkipButton,
  TimeDisplay,
  VolumeControl,
  SettingsTrigger,
  PiPButton,
  FullscreenButton,
} from './controls'

export { TopGradient, PauseOverlay, BufferingOverlay, EndOverlay } from './overlays'

export { usePlayerContext, usePlayerState, usePlayerRemote, usePluginAPI } from './context'

export { usePlayerGestures } from './hooks/use-mobile-gestures'

export { usePlayer } from './hooks/use-player'
export { PlayerProvider } from './player-provider'
export type { PlayerProviderProps } from './player-provider'

export type {
  PlayerProps,
  PlayerSlots,
  PlayerLabels,
  PlayerIcons,
  MediaState,
  MediaRemote,
  PlayerContextValue,
} from './types'

export type { UsePlayerResult } from '@vplayer/framework'

// ── Framework contract helpers ──────────────────────────────
export { createPluginAPIBuilder } from '@vplayer/framework'
export type { PluginAPIBuilder, PluginAPIContext } from '@vplayer/framework'
export { createPluginAPI } from './plugin-api'

// ── Core re-exports (framework-agnostic) ────────────────────
export {
  createPlayer,
  createGestureEngine,
  EventBus,
  Storage,
  STORAGE_KEYS,
  I18n,
  HotkeyRegistry,
  defaultPlayerLabels,
  defaultPlayerIcons,
  formatTime,
} from '@vplayer/core'
export {
  parseSRT,
  parseVTT,
  fetchSubtitles,
  getActiveCue,
  fetchThumbnails,
  parseThumbnailVTT,
  getThumbnailAtTime,
} from '@vplayer/core'
export type {
  PlayerOptions,
  PlayerInstance,
  PlayerSystems,
  PlayerError,
  PlayerEventName,
  PlayerEventHandler,
  SubtitleCue,
  SubtitleTrack,
  ThumbnailCue,
  LanguageDict,
  HotkeyBinding,
  ControlRegistration,
  SettingRegistration,
  LayerRegistration,
  SettingItem,
  ContextMenuItem,
  ContextMenuRegistration,
  PlayerPlugin,
  PluginAPI,
  RemoteRef,
  PlayerContextRef,
  FlipState,
  AspectRatioState,
} from '@vplayer/core'

export {
  PluginControlsLeft,
  PluginControlsRight,
  PluginControlsTop,
  PluginControlsCenter,
  PluginLayers,
  PluginSettings,
  NotificationOverlay,
} from './plugin-renderer'

export { MiniProgressBar } from './components/mini-progress-bar'

export { ScreenshotButton } from './components/screenshot-button'

export { ErrorOverlay } from './components/error-overlay'

export { AutoResumeOverlay } from './components/auto-resume-overlay'

export { ContextMenu } from './components/context-menu'
