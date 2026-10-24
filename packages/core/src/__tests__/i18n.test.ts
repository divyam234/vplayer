import { describe, expect, it } from 'vitest'

import { I18n } from '../i18n'

describe('player languages', () => {
  it.each(['en', 'es', 'pt-BR', 'ru', 'fr', 'de', 'zh-CN'])(
    'ships a complete %s dictionary with matching placeholders',
    (lang) => {
      const english = new I18n('en').getCurrentDict()
      const localized = new I18n(lang).getCurrentDict()
      expect(Object.keys(localized).toSorted()).toEqual(Object.keys(english).toSorted())
      for (const [key, message] of Object.entries(english)) {
        expect(localized[key].length, key).toBeGreaterThan(0)
        expect(localized[key].match(/\{\w+\}/g)?.toSorted() ?? [], key).toEqual(
          message.match(/\{\w+\}/g)?.toSorted() ?? [],
        )
      }
    },
  )

  it('normalizes language tags, falls back to the base language and then English', () => {
    expect(new I18n('PT_br').t('settings')).toBe('Configurações')
    expect(new I18n('pt').t('settings')).toBe('Configurações')
    expect(new I18n('de-DE').t('settings')).toBe('Einstellungen')
    expect(new I18n('zh-CN').t('captionSave')).toBe('保存')
    expect(new I18n('unknown').t('settings')).toBe('Settings')
  })

  it('keeps custom dictionaries, consumer overrides and built-in fallback separate', () => {
    const i18n = new I18n('de')
    i18n.addTranslations('de', { pluginAction: 'Aktion' })
    i18n.setOverrides({ settings: 'Custom settings' })
    expect(i18n.getPlayerLabels().settings).toBe('Custom settings')
    expect(i18n.t('pluginAction')).toBe('Aktion')
    i18n.setOverrides()
    expect(i18n.t('settings')).toBe('Einstellungen')
    expect(i18n.t('pluginAction')).toBe('Aktion')
    i18n.addTranslations('custom', { play: 'Custom play' })
    i18n.setLanguage('custom')
    expect(i18n.t('play')).toBe('Custom play')
    expect(i18n.t('pause')).toBe('Pause')
    expect(i18n.t('playBtn')).toBe('Custom play')
  })

  it('supports changing the language and interpolating messages at runtime', () => {
    const i18n = new I18n('en')
    i18n.setLanguage('fr')
    expect(i18n.t('skipForward', undefined, { seconds: 10 })).toBe('Avancer de 10s')
    expect(i18n.getPlayerLabels().captionAppearance).toBe('Apparence des sous-titres')
    expect(i18n.getAvailableLanguages().toSorted()).toEqual(['de', 'en', 'es', 'fr', 'pt-br', 'ru', 'zh-cn'])
  })
})
