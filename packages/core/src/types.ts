import type { Store } from '@tanstack/store'

import type { EventBus } from './event-bus'
import type { HotkeyRegistry } from './hotkey-registry'
import type { I18n } from './i18n'
import type { MediaCapabilitiesSnapshot } from './media-capabilities'
import type { DashMediaEngineOptions, HlsMediaEngineOptions, MediaEngine } from './media-engine'
import type { PlaybackProgressOptions } from './playback-progress'
import type { PlayerPlugin } from './plugin-api'
import type { AspectRatioState, FlipState } from './plugin-api'
import type { PlayerSource } from './source-resolver'
import type { MediaState, PlaybackStatus, ResumeState } from './state/slices'
import type { Storage } from './storage'
import type {
  CaptionSettings,
  SubtitleProvider,
  SubtitleProviderResult,
  SubtitleSearchQuery,
  SubtitleTrack,
} from './subtitle-parser'

export type { MediaState, ResumeState }

/** OS media-control metadata overrides (Media Session → MPRIS). */
export interface MediaSessionMetadataOptions {
  /** Overrides the artwork sent to OS controls; falls back to `poster`. */
  artwork?: string
  /** Artist line shown under the title (e.g. studio or channel name). */
  artist?: string
  /** Album line; rarely meaningful for video, supported for completeness. */
  album?: string
}

export interface PlayerOptions {
  src: string
  /** MIME/content type hint used by source provider selection. */
  type?: string
  /** Title exposed to browser and operating-system media controls. */
  title?: string
  poster?: string
  /**
   * OS media-control overrides (Media Session → MPRIS), e.g. a scaled-down
   * artwork image when full-size posters are too big, or a studio name as
   * the artist line. Artwork falls back to `poster` when omitted.
   */
  mediaSession?: MediaSessionMetadataOptions
  subtitles?: SubtitleTrack[]
  subtitleProviders?: SubtitleProvider[]
  qualities?: string[]
  autoPlay?: boolean
  thumbnails?: string
  /** Transform raw thumbnail VTT content before it is parsed. */
  transformThumbnailVTT?: TransformThumbnailVTT
  /** UI language. Built-ins: en, es, pt-BR, ru, fr, de, zh-CN. Reactive; does not reload media. */
  lang?: string
  /** Overrides for the selected UI language; replaced when this option changes. */
  translations?: Record<string, string>
  plugins?: PlayerPlugin[]
  playbackProgress?: PlaybackProgressOptions
  persistPreferences?: boolean
  /** Externally managed caption preferences. Bypasses browser caption storage when provided. */
  captionSettings?: Partial<CaptionSettings>
  defaultHotkeys?: boolean
  reconnectMax?: number
  reconnectSleep?: number
  /** Optional hls.js config passed when an .m3u8 source needs Media Source Extensions. */
  hlsConfig?: HlsMediaEngineOptions['hlsConfig']
  /** Optional dash.js config passed when an .mpd source is used. */
  dashConfig?: DashMediaEngineOptions['dashConfig']
  onTimeUpdate?: (time: number) => void
  onEnded?: () => void
  onError?: (message: string) => void
  /**
   * Custom media engine or factory.
   *
   * - `MediaEngine` instance — used directly (must already be bound to a
   *   `<video>` element).
   * - `(video: HTMLVideoElement) => MediaEngine` — factory called at mount
   *   time with the player's `<video>` element.
   *
   * When omitted, a NativeVideoEngine is created automatically.
   *
   * @example
   * ```ts
   * // HLS via factory (recommended)
   * createPlayer({
   *   engine: (video) => new HlsMediaEngine(video, { src: '...' }),
   * })
   *
   * // Pre-configured instance
   * createPlayer({
   *   engine: new HlsMediaEngine(videoEl, { src: '...' }),
   * })
   * ```
   */
  engine?: MediaEngine | ((video: HTMLVideoElement) => MediaEngine)
  /**
   * Read the audio and subtitle tracks stored inside Matroska and WebM files, so the viewer can
   * choose between audio tracks (dual audio) and embedded subtitles. Off by default.
   *
   * When it is off nothing about it is loaded or requested. When it is on, opening a `.mkv`,
   * `.mka` or `.webm` source (or one with a matching `type`) loads the feature on demand, reads
   * the file's track list with a few range requests, and:
   *   - files with several audio tracks, or audio the browser cannot decode (E-AC-3), are played
   *     through Media Source Extensions so the audio track can be selected;
   *   - embedded text subtitles (SRT, ASS/SSA, WebVTT) are added to the subtitle list;
   *   - other files play exactly as they do with this option off.
   *
   * The source server must support HTTP range requests. Playback falls back to the plain file if
   * anything goes wrong.
   */
  embeddedTracks?: boolean
}

export type TransformThumbnailVTT = (content: string, responseUrl: string) => string | Promise<string>

export type { PlaybackStatus }

export type { MediaCapabilitiesSnapshot, PlayerSource }

export interface PlayerError {
  message: string
  reconnectAttempt: number
  isReconnecting: boolean
}

export interface MediaRemote {
  play: () => void
  pause: () => void
  togglePlay: () => void
  resumeFromSavedProgress: () => void
  startPlaybackOver: () => void
  dismissSavedProgress: () => void
  seek: (time: number) => void
  skip: (seconds: number) => void
  setVolume: (v: number) => void
  toggleMute: () => void
  setPlaybackRate: (rate: number) => void
  toggleFullscreen: () => void
  togglePiP: () => void
  setActiveSubtitle: (track: SubtitleTrack | null) => void
  /** Select an audio track listed in `audioTracks` (see the `embeddedTracks` option). */
  setAudioTrack: (id: number) => void
  addSubtitleTrack: (track: SubtitleTrack) => void
  removeSubtitleTrack: (id: string) => void
  searchSubtitles: (query?: SubtitleSearchQuery) => void
  selectSubtitleResult: (result: SubtitleProviderResult) => void
  clearSubtitleSearch: () => void
  setCaptionSettings: (patch: Partial<CaptionSettings>) => void
  resetCaptionSettings: () => void
  saveCaptionSettings: () => void
  setActiveQuality: (q: string) => void
  takeScreenshot: () => void
  setFlip: (flip: FlipState) => void
  setAspectRatio: (ratio: AspectRatioState) => void
  cycleAspectRatio: () => void
  toggleLoop: () => void
  toggleInfoPanel: () => void
}

export interface PlayerLabels {
  play: string
  pause: string
  replay: string
  mute: string
  unmute: string
  settings: string
  pip: string
  pipExit: string
  miniPlayer: string
  exitMiniPlayer: string
  fullscreen: string
  fullscreenExit: string
  speed: string
  quality: string
  subtitles: string
  off: string
  loadSubtitleFile: string

  findSubtitlesOnline: string
  subtitleSearch: string
  subtitleSearchPlaceholder: string
  subtitleSource: string
  subtitleAllSources: string
  subtitleLanguage: string
  subtitleAllLanguages: string
  subtitleNoResults: string
  subtitleSearching: string
  captionAppearance: string
  captionSize: string
  captionTextColor: string
  captionBackgroundColor: string
  captionBackgroundOpacity: string
  captionSmall: string
  captionMedium: string
  captionLarge: string
  captionFontFamily: string
  captionFontScale: string
  captionTextOpacity: string
  captionEdgeStyle: string
  captionEdgeNone: string
  captionEdgeShadow: string
  captionEdgeOutline: string
  captionEdgeColor: string
  captionPosition: string
  captionLineHeight: string
  captionDelay: string
  captionPreview: string
  captionReset: string
  captionSave: string
  captionSaved: string
  subtitleLoadError: string
  endedTitle: string
  screenshot: string
  flip: string
  flipNormal: string
  flipHorizontal: string
  flipVertical: string
  aspectRatio: string
  aspectRatioDefault: string
  aspectRatio16: string
  aspectRatio4: string
  aspectRatioFill: string
  aspectRatioCover: string
  aspectRatio21: string
  continue: string
  continuePlay: string
  continueStartOver: string
  dismiss: string
  error: string
  retry: string
  contextMenuPlay: string
  contextMenuPause: string
  contextMenuLoop: string
  infoPanel: string
  loop: string
  audio: string
  audioUnsupported: string
  subtitleUnsupported: string
  /** Shown while the file's audio tracks and subtitles are being read, before playback starts. */
  loadingTracks: string
  /** Shown while the audio is being prepared (converted, for formats the browser cannot play). */
  preparingPlayback: string
  /** Shown from when everything is ready until the first picture is there. */
  startingPlayback: string
}

export interface PlayerSystems {
  events: EventBus
  storage: Storage
  i18n: I18n
  hotkeys: HotkeyRegistry
}

export interface PlayerInstance {
  store: Store<MediaState>
  remote: MediaRemote
  events: EventBus
  storage: Storage
  i18n: I18n
  hotkeys: HotkeyRegistry
  /** The active media engine. Null before mount and after unmount. */
  engine: MediaEngine | null
  updateOptions(
    opts: Partial<
      Pick<
        PlayerOptions,
        | 'src'
        | 'type'
        | 'title'
        | 'poster'
        | 'mediaSession'
        | 'autoPlay'
        | 'subtitles'
        | 'subtitleProviders'
        | 'qualities'
        | 'thumbnails'
        | 'transformThumbnailVTT'
        | 'playbackProgress'
        | 'embeddedTracks'
        | 'lang'
        | 'translations'
        | 'captionSettings'
      >
    >,
  ): void
  setThumbnails(url?: string): void
  initPlugins(plugins: PlayerPlugin[]): () => void
  mount(videoEl: HTMLVideoElement, containerEl: HTMLDivElement): void
  unmount(): void
  destroy(): void
}
