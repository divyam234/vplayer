import type { PlayerIcons, PlayerLabels } from '@vplayer/core'

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export function mergeLabels(defaults: PlayerLabels, overrides?: DeepPartial<PlayerLabels>): PlayerLabels {
  return { ...defaults, ...overrides }
}

export function mergeIcons(defaults: PlayerIcons, overrides?: DeepPartial<PlayerIcons>): PlayerIcons {
  return { ...defaults, ...overrides }
}
