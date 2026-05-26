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
} from './context'

export {
  useMediaState,
} from './hooks/useMediaState'

export {
  useMediaRemote,
} from './hooks/useMediaRemote'

export {
  usePlayerKeyboardShortcuts,
} from './hooks/usePlayerKeyboardShortcuts'

export {
  formatTime,
} from './utils'

export type {
  PlayerProps,
  PlayerSlots,
  PlayerLabels,
  PlayerIcons,
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
