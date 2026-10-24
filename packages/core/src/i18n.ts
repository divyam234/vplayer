/**
 * Runtime-switchable i18n system.
 * Plugins can add their own translations via addTranslations().
 */

import { defaultPlayerLabels } from './defaults'
import { builtinLanguages, englishMessages } from './translations'
import type { PlayerLabels } from './types'

export type LanguageDict = Record<string, string>

function normalizeLanguage(lang: string) {
  return lang.toLowerCase().replaceAll('_', '-')
}

export class I18n {
  private languages: Record<string, LanguageDict> = { ...builtinLanguages }
  private currentLang: string = 'en'
  private currentDict: LanguageDict = englishMessages
  private overrides: LanguageDict = {}

  constructor(initialLang?: string) {
    if (initialLang) this.setLanguage(initialLang)
  }

  /** Get the current language code */
  getLanguage(): string {
    return this.currentLang
  }

  /** Set language by BCP 47 code (e.g. 'en', 'zh-cn', 'fr') */
  setLanguage(lang: string): void {
    this.currentLang = normalizeLanguage(lang)
    const base = this.currentLang.split('-')[0]
    this.currentDict =
      this.languages[this.currentLang] ??
      this.languages[base] ??
      (base === 'pt' ? this.languages['pt-br'] : undefined) ??
      englishMessages
  }

  /** Consumer overrides replace the previous prop value; plugin dictionaries stay registered. */
  setOverrides(translations?: LanguageDict): void {
    this.overrides = { ...translations }
  }

  /** Add or override translations for a language */
  addTranslations(lang: string, dict: LanguageDict): void {
    const code = normalizeLanguage(lang)
    this.languages[code] = { ...this.languages[code], ...dict }
    this.setLanguage(this.currentLang)
  }

  /** Translate a key. Supports simple {placeholder} substitution. */
  t(key: string, fallback?: string, params?: Record<string, string | number>): string {
    const alias = { playBtn: 'play', pauseBtn: 'pause', replayBtn: 'replay' }[key]
    let msg =
      this.overrides[key] ??
      this.currentDict[key] ??
      (alias ? (this.overrides[alias] ?? this.currentDict[alias]) : undefined) ??
      fallback ??
      englishMessages[key as keyof typeof englishMessages] ??
      key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        msg = msg.replace(`{${k}}`, String(v))
      }
    }
    return msg
  }

  /** Get a copy of the current dict */
  getCurrentDict(): LanguageDict {
    return { ...englishMessages, ...this.currentDict, ...this.overrides }
  }

  /** Labels consumed by the default React layouts; explicit `labels` props can override these. */
  getPlayerLabels(): PlayerLabels {
    return Object.fromEntries(
      Object.entries(defaultPlayerLabels).map(([key, value]) => [key, this.t(key, value)]),
    ) as unknown as PlayerLabels
  }

  /** Get available language codes */
  getAvailableLanguages(): string[] {
    return Object.keys(this.languages)
  }
}
