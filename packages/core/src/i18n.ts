/**
 * Runtime-switchable i18n system.
 * Plugins can add their own translations via addTranslations().
 */

export type LanguageDict = Record<string, string>

/** Built-in English labels */
const EN: LanguageDict = {
  play: 'Play',
  pause: 'Pause',
  replay: 'Replay',
  mute: 'Mute',
  unmute: 'Unmute',
  settings: 'Settings',
  pip: 'Picture in Picture',
  pipExit: 'Exit Picture in Picture',
  fullscreen: 'Fullscreen',
  fullscreenExit: 'Exit fullscreen',
  speed: 'Speed',
  quality: 'Quality',
  subtitles: 'Subtitles',
  off: 'Off',
  endedTitle: "You've reached the end",
  skipForward: 'Skip forward {seconds}s',
  skipBack: 'Skip back {seconds}s',
  seek: 'Seek',
  volume: 'Volume',
  loading: 'Loading…',
  error: 'Video load failed',
  reconnect: 'Reconnecting… ({attempt}/{max})',
  replayBtn: 'Replay',
  playBtn: 'Play',
  pauseBtn: 'Pause',
}

/** Simplified Chinese */
const ZH_CN: LanguageDict = {
  play: '播放',
  pause: '暂停',
  replay: '重播',
  mute: '静音',
  unmute: '取消静音',
  settings: '设置',
  pip: '画中画',
  pipExit: '退出画中画',
  fullscreen: '全屏',
  fullscreenExit: '退出全屏',
  speed: '速度',
  quality: '画质',
  subtitles: '字幕',
  off: '关闭',
  endedTitle: '已播放完毕',
  skipForward: '快进 {seconds} 秒',
  skipBack: '快退 {seconds} 秒',
  seek: '进度',
  volume: '音量',
  loading: '加载中…',
  error: '视频加载失败',
  reconnect: '重新连接… ({attempt}/{max})',
  replayBtn: '重新播放',
  playBtn: '播放',
  pauseBtn: '暂停',
}

/** Built-in language map */
const BUILTIN_LANGUAGES: Record<string, LanguageDict> = {
  en: EN,
  'zh-cn': ZH_CN,
}

export class I18n {
  private languages: Record<string, LanguageDict> = { ...BUILTIN_LANGUAGES }
  private currentLang: string = 'en'
  private currentDict: LanguageDict = EN

  constructor(initialLang?: string) {
    if (initialLang) this.setLanguage(initialLang)
  }

  /** Get the current language code */
  getLanguage(): string {
    return this.currentLang
  }

  /** Set language by BCP 47 code (e.g. 'en', 'zh-cn', 'fr') */
  setLanguage(lang: string): void {
    this.currentLang = lang.toLowerCase()
    this.currentDict = this.languages[this.currentLang] ?? this.languages['en'] ?? EN
  }

  /** Add or override translations for a language */
  addTranslations(lang: string, dict: LanguageDict): void {
    const code = lang.toLowerCase()
    this.languages[code] = { ...(this.languages[code] ?? {}), ...dict }
    if (code === this.currentLang) {
      this.currentDict = this.languages[code]
    }
  }

  /** Translate a key. Supports simple {placeholder} substitution. */
  t(key: string, fallback?: string, params?: Record<string, string | number>): string {
    let msg = this.currentDict[key] ?? fallback ?? key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        msg = msg.replace(`{${k}}`, String(v))
      }
    }
    return msg
  }

  /** Get a copy of the current dict */
  getCurrentDict(): LanguageDict {
    return { ...this.currentDict }
  }

  /** Get available language codes */
  getAvailableLanguages(): string[] {
    return Object.keys(this.languages)
  }
}
