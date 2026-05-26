/**
 * Merge helpers for labels and other plain-data configs.
 *
 * Every framework adapter merges default + user-provided configs.
 * These helpers do it in a framework-agnostic way.
 *
 * Note: PlayerIcons and PlayerSlots are NOT included here because
 * they are framework-specific (icons depend on icon library, slots
 * use framework component types). Each adapter handles those itself.
 */

import type { PlayerIcons, PlayerLabels } from '@vplayer/core'

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * Merge user-provided labels over the defaults.
 */
export function mergeLabels(
  defaults: PlayerLabels,
  overrides?: DeepPartial<PlayerLabels>,
): PlayerLabels {
  return { ...defaults, ...overrides }
}

/**
 * Merge user-provided icon overrides over the defaults.
 * Icons are plain Iconify icon IDs — simple spread.
 */
export function mergeIcons(
  defaults: PlayerIcons,
  overrides?: DeepPartial<PlayerIcons>,
): PlayerIcons {
  return { ...defaults, ...overrides }
}
