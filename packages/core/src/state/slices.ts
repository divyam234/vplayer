/**
 * State Slices — Logical groupings of MediaState properties.
 *
 * These types DOCUMENT the slice boundaries within the flat MediaState.
 * At runtime the store keeps a flat state for backward compat, but the
 * slice types make ownership clear and enable future per-slice subscriptions.
 *
 * Migration path toward separate sub-stores:
 *   1. Define slices here (done ✓)
 *   2. Use createMediaStore() for initialization (done ✓)
 *   3. Eventually migrate to separate Store instances per slice
 */

import { Store } from '@tanstack/store'

import type { ControlRegistration, ContextMenuItem, FlipState, AspectRatioState } from '../plugin-api'
import type { LayerRegistration, SettingRegistration } from '../plugin-api'
import type { SubtitleTrack, ThumbnailCue } from '../subtitle-parser'

// ── Slice 1: Media playback ───────────────────────────────

export interface MediaSlice {
  isPlaying: boolean
  isPaused: boolean
  isBuffering: boolean
  isEnded: boolean
  currentTime: number
  duration: number
  bufferedPercent: number
  playbackRate: number
}

// ── Slice 2: Audio ────────────────────────────────────────

export interface AudioSlice {
  volume: number
  isMuted: boolean
}

// ── Slice 3: Preferences / display options ────────────────

export interface PreferencesSlice {
  isLooping: boolean
  flip: FlipState
  aspectRatio: AspectRatioState
  activeSubtitle: SubtitleTrack | null
  subtitleTracks: SubtitleTrack[]
  activeQuality: string
  qualities: string[]
}

// ── Slice 4: UI state ─────────────────────────────────────

export interface UISlice {
  controlsVisible: boolean
  isFullscreen: boolean
  infoPanelVisible: boolean
  notification: { message: string; duration: number } | null
}

// ── Slice 5: Plugin registrations ─────────────────────────

export interface PluginSlice {
  controls: ControlRegistration[]
  settings: SettingRegistration[]
  layers: LayerRegistration[]
  contextMenuItems: ContextMenuItem[]
  contextMenuEnabled: boolean
}

// ── Slice 6: Thumbnails ───────────────────────────────────

export interface ThumbnailSlice {
  thumbnailCues: ThumbnailCue[]
}

// ── Slice 7: Error state ──────────────────────────────────

export interface ErrorSlice {
  error: { message: string; reconnectAttempt: number; isReconnecting: boolean } | null
}

// ── Composed MediaState ───────────────────────────────────

/**
 * Full MediaState — flat at runtime, logically organized here.
 *
 * Consumers can reference MediaState or individual slices depending
 * on how granular they need to be.
 */
export interface MediaState extends MediaSlice, AudioSlice, PreferencesSlice, UISlice, PluginSlice, ThumbnailSlice, ErrorSlice {}

// ── Store factory ─────────────────────────────────────────

export type PlayerStore = Store<MediaState>

export function createMediaStore(): PlayerStore {
  return new Store<MediaState>(getInitialMediaState())
}

export function getInitialMediaState(): MediaState {
  return {
    // Media
    isPlaying: false,
    isPaused: true,
    isBuffering: false,
    isEnded: false,
    currentTime: 0,
    duration: 0,
    bufferedPercent: 0,
    playbackRate: 1,

    // Audio
    volume: 1,
    isMuted: false,

    // Preferences
    isLooping: false,
    flip: 'normal' as FlipState,
    aspectRatio: 'default' as AspectRatioState,
    activeSubtitle: null,
    subtitleTracks: [],
    activeQuality: 'Auto',
    qualities: [],

    // UI
    controlsVisible: true,
    isFullscreen: false,
    infoPanelVisible: false,
    notification: null,

    // Plugins
    controls: [],
    settings: [],
    layers: [],
    contextMenuItems: [],
    contextMenuEnabled: true,

    // Thumbnails
    thumbnailCues: [],

    // Error
    error: null,
  }
}

// ── Optional selectors for granular subscriptions ─────────
// These are identity functions that explicitly narrow the type.
// Consumers use them with useStore(store, selector) or store.subscribe().

export const selectMedia = (s: MediaState) => ({
  isPlaying: s.isPlaying,
  isPaused: s.isPaused,
  isBuffering: s.isBuffering,
  isEnded: s.isEnded,
  currentTime: s.currentTime,
  duration: s.duration,
  bufferedPercent: s.bufferedPercent,
  playbackRate: s.playbackRate,
})

export const selectAudio = (s: MediaState) => ({ volume: s.volume, isMuted: s.isMuted })
export const selectPreferences = (s: MediaState) => ({
  isLooping: s.isLooping,
  flip: s.flip,
  aspectRatio: s.aspectRatio,
  activeSubtitle: s.activeSubtitle,
  subtitleTracks: s.subtitleTracks,
  activeQuality: s.activeQuality,
  qualities: s.qualities,
})
export const selectUI = (s: MediaState) => ({
  controlsVisible: s.controlsVisible,
  isFullscreen: s.isFullscreen,
  infoPanelVisible: s.infoPanelVisible,
  notification: s.notification,
})
export const selectPlugins = (s: MediaState) => ({
  controls: s.controls,
  settings: s.settings,
  layers: s.layers,
  contextMenuItems: s.contextMenuItems,
  contextMenuEnabled: s.contextMenuEnabled,
})
export const selectThumbnails = (s: MediaState) => ({ thumbnailCues: s.thumbnailCues })
export const selectError = (s: MediaState) => s.error
