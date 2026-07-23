import type { PlayerLabels } from '@vplayer/core'

import type { PlayerIcons } from '../icon'

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export function mergeLabels(defaults: PlayerLabels, overrides?: DeepPartial<PlayerLabels>): PlayerLabels {
  return { ...defaults, ...overrides }
}

export function mergeIcons(defaults: PlayerIcons, overrides?: Partial<PlayerIcons>): PlayerIcons {
  return { ...defaults, ...overrides }
}
