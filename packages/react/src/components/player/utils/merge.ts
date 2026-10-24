import { I18n, type PlayerLabels } from '@vplayer/core'

import type { PlayerIcons } from '../icon'

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export function mergeLabels(defaults: PlayerLabels, overrides?: DeepPartial<PlayerLabels>): PlayerLabels {
  return { ...defaults, ...overrides }
}

export function localizedLabels(
  lang?: string,
  translations?: Record<string, string>,
  overrides?: DeepPartial<PlayerLabels>,
) {
  const i18n = new I18n(lang)
  i18n.setOverrides(translations)
  return mergeLabels(i18n.getPlayerLabels(), overrides)
}

export function mergeIcons(defaults: PlayerIcons, overrides?: Partial<PlayerIcons>): PlayerIcons {
  return { ...defaults, ...overrides }
}
