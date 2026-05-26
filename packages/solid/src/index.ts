// ── Components ─────────────────────────────────────────────────
export { VideoPlayer } from './player'
export { PlayerProvider } from './player-provider'
export { ControlsBar, PlayerChrome, Spacer } from './components/layout/player-chrome'
export { DefaultVideoLayout } from './components/layout/default-video-layout'
export { CompactVideoLayout } from './components/layout/compact-video-layout'
export { LargeVideoLayout } from './components/layout/large-video-layout'
export {
  SeekBar,
  PlayButton,
  SkipButton,
  TimeDisplay,
  VolumeControl,
  SettingsTrigger,
  PiPButton,
  FullscreenButton,
} from './components/controls'
export { TopGradient, PauseOverlay, BufferingOverlay, EndOverlay } from './components/overlays'
export { ScreenshotButton } from './components/screenshot-button'
export { ErrorOverlay } from './components/error-overlay'
export { AutoResumeOverlay } from './components/auto-resume-overlay'
export { MiniProgressBar } from './components/mini-progress-bar'
export { ContextMenu } from './components/context-menu'
export { InfoPanel } from './components/info-panel'
export { FlipSetting } from './components/flip-setting'
export { AspectRatioSetting } from './components/aspect-ratio-setting'
export {
  PluginControlsLeft,
  PluginControlsRight,
  PluginControlsTop,
  PluginControlsCenter,
  PluginLayers,
  PluginSettings,
  NotificationOverlay,
} from './plugin-renderer'

// ── Hooks / Context ────────────────────────────────────────────
export { usePlayerContext, usePlayerState, usePlayerRemote, usePluginAPI } from './context'
export { usePlayerGestures } from './hooks/use-mobile-gestures'
export { usePlayer } from './hooks/use-player'
export type { SolidUsePlayerResult } from './hooks/use-player'

export type { PlayerProps, PlayerSlots, PlayerLabels, PlayerIcons, MediaState, MediaRemote, PlayerContextValue } from './types'
export type { UsePlayerResult } from '@vplayer/framework'
export type { PlayerProviderProps } from './player-provider'

// ── Framework contract helpers ──────────────────────────────
export { createPluginAPIBuilder } from '@vplayer/framework'
export type { PluginAPIBuilder, PluginAPIContext } from '@vplayer/framework'
export { createPluginAPI } from './plugin-api'

// ── Core re-exports (framework-agnostic) ────────────────────
export {
  createPlayer, createGestureEngine, EventBus, Storage, STORAGE_KEYS,
  I18n, HotkeyRegistry, defaultPlayerLabels, defaultPlayerIcons, formatTime,
} from '@vplayer/core'
export {
  parseSRT, parseVTT, fetchSubtitles, getActiveCue,
  fetchThumbnails, parseThumbnailVTT, getThumbnailAtTime,
} from '@vplayer/core'
export type {
  PlayerOptions, PlayerInstance, PlayerSystems, PlayerError,
  PlayerEventName, PlayerEventHandler, SubtitleCue, SubtitleTrack,
  ThumbnailCue, LanguageDict, HotkeyBinding, ControlRegistration,
  SettingRegistration, LayerRegistration, SettingItem, ContextMenuItem,
  ContextMenuRegistration, PlayerPlugin, PluginAPI, RemoteRef,
  PlayerContextRef, FlipState, AspectRatioState,
} from '@vplayer/core'
