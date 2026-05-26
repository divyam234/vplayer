export {
  VideoPlayer,
} from './VideoPlayer'

export {
  ControlsBar,
  PlayerChrome,
} from './layout/PlayerChrome'

export {
  DefaultVideoLayout,
} from './layout/DefaultVideoLayout'

export {
  CompactVideoLayout,
} from './layout/CompactVideoLayout'

export {
  LargeVideoLayout,
} from './layout/LargeVideoLayout'

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

export {
  TopGradient,
  PauseOverlay,
  BufferingOverlay,
  EndOverlay,
} from './overlays'

export {
  usePlayerContext,
  useMediaState,
  useMediaRemote,
  usePluginAPI,
} from './context'

export {
  usePlayerKeyboardShortcuts,
} from './hooks/usePlayerKeyboardShortcuts'

export {
  useMobileGestures,
} from './hooks/useMobileGestures'

export {
  useErrorHandler,
} from './hooks/useErrorHandler'

export {
  useAutoPlayback,
} from './hooks/useAutoPlayback'

export {
  formatTime,
} from './utils'

export type {
  PlayerProps,
  PlayerSlots,
  PlayerLabels,
  PlayerIcons,
  MediaState,
  MediaRemote,
  PlayerContextValue,
} from './types'

export {
  parseSRT,
  parseVTT,
  fetchSubtitles,
  getActiveCue,
} from './subtitle-parser'

export type {
  SubtitleCue,
  SubtitleTrack,
  ThumbnailCue,
} from './subtitle-parser'
export {
  fetchThumbnails,
  parseThumbnailVTT,
  getThumbnailAtTime,
} from './subtitle-parser'

// ── Plugin system exports ────────────────────────────────────

export type {
  ControlRegistration,
  SettingRegistration,
  LayerRegistration,
  PlayerPlugin,
  PluginAPI,
} from './plugin-api'

export {
  EventBus,
} from './event-bus'
export type {
  PlayerEventName,
  PlayerEventHandler,
} from './event-bus'

export {
  Storage,
  STORAGE_KEYS,
} from './storage'

export {
  I18n,
} from './i18n'
export type {
  LanguageDict,
} from './i18n'

export {
  HotkeyRegistry,
} from './hotkey-registry'
export type {
  HotkeyBinding,
} from './hotkey-registry'

export {
  PluginControlsLeft,
  PluginControlsRight,
  PluginControlsTop,
  PluginControlsCenter,
  PluginLayers,
  PluginSettings,
  NotificationOverlay,
} from './plugin-renderer'

export {
  MiniProgressBar,
} from './components/MiniProgressBar'

export {
  ScreenshotButton,
} from './components/ScreenshotButton'

export {
  ErrorOverlay,
} from './components/ErrorOverlay'

export {
  AutoResumeOverlay,
} from './components/AutoResumeOverlay'

export {
  ContextMenu,
} from './components/ContextMenu'
