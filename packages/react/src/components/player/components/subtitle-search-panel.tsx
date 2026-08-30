import { Menu } from '@ark-ui/react/menu'
import { useCallback, useEffect, useMemo, useState, type FC, type FormEvent } from 'react'

import { usePlayerContext, usePlayerRemote, usePlayerState } from '../context'
import { Icon } from '../icon'

interface SubtitleSearchPanelProps {
  onBack: () => void
}

export const SubtitleSearchPanel: FC<SubtitleSearchPanelProps> = ({ onBack }) => {
  const { labels, icons, subtitleSearchDefaultQuery } = usePlayerContext()
  const remote = usePlayerRemote()
  const providers = usePlayerState('subtitleProviders')
  const results = usePlayerState('subtitleSearchResults')
  const status = usePlayerState('subtitleSearchStatus')
  const error = usePlayerState('subtitleSearchError')
  const [query, setQuery] = useState(subtitleSearchDefaultQuery)
  const [providerId, setProviderId] = useState('')
  const [language, setLanguage] = useState('')

  const languages = useMemo(
    () =>
      [...new Set([language, ...results.map((result) => result.language)])]
        .filter((code) => code.length > 0)
        .toSorted((a, b) => a.localeCompare(b)),
    [language, results],
  )

  const runSearch = useCallback(
    (nextProviderId = providerId, nextLanguage = language) => {
      remote.searchSubtitles({
        query: query.trim() || undefined,
        providerId: nextProviderId || undefined,
        languages: nextLanguage ? [nextLanguage] : undefined,
      })
    },
    [language, providerId, query, remote],
  )

  useEffect(() => {
    remote.searchSubtitles({ query: subtitleSearchDefaultQuery.trim() || undefined })
    return () => remote.clearSubtitleSearch()
  }, [remote, subtitleSearchDefaultQuery])

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    runSearch()
  }

  return (
    <div className="vplayer__subtitle-search-panel">
      <Menu.Item value="subtitle-search-back" className="vplayer__menu-item">
        <Icon icon={icons.chevronLeft} width={14} className="vplayer__menu-icon" />
        <span className="vplayer__menu-label">{labels.findSubtitlesOnline}</span>
      </Menu.Item>
      <Menu.Separator className="vplayer__menu-separator" />

      <form className="vplayer__subtitle-search-form" onSubmit={onSubmit}>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder={labels.subtitleSearchPlaceholder}
          aria-label={labels.subtitleSearchPlaceholder}
          className="vplayer__subtitle-search-input"
        />
        <button type="submit" className="vplayer__subtitle-search-button">
          {labels.subtitleSearch}
        </button>
      </form>

      {(providers.length > 1 || languages.length > 0) && (
        <div className="vplayer__subtitle-search-filters">
          {providers.length > 1 && (
            <label className="vplayer__subtitle-search-filter">
              <span>{labels.subtitleSource}</span>
              <select
                value={providerId}
                onChange={(event) => {
                  const nextProviderId = event.currentTarget.value
                  setProviderId(nextProviderId)
                  runSearch(nextProviderId, language)
                }}
              >
                <option value="">{labels.subtitleAllSources}</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {languages.length > 0 && (
            <label className="vplayer__subtitle-search-filter">
              <span>{labels.subtitleLanguage}</span>
              <select
                value={language}
                onChange={(event) => {
                  const nextLanguage = event.currentTarget.value
                  setLanguage(nextLanguage)
                  runSearch(providerId, nextLanguage)
                }}
              >
                <option value="">{labels.subtitleAllLanguages}</option>
                {languages.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {status === 'loading' && (
        <div className="vplayer__menu-status" role="status">
          {labels.subtitleSearching}
        </div>
      )}
      {error && (
        <div className="vplayer__menu-error" role="status" aria-live="polite">
          {error}
        </div>
      )}
      {status === 'ready' && results.length === 0 && (
        <div className="vplayer__menu-status">{labels.subtitleNoResults}</div>
      )}

      {results.length > 0 && (
        <div className="vplayer__subtitle-search-results">
          {results.map((result) => (
            <button
              key={`${result.providerId}:${result.id}`}
              type="button"
              className="vplayer__subtitle-search-result"
              onClick={() => {
                remote.selectSubtitleResult(result)
                onBack()
              }}
            >
              <span className="vplayer__subtitle-search-result-title">{result.label}</span>
              {result.release && <span className="vplayer__subtitle-search-result-release">{result.release}</span>}
              <span className="vplayer__subtitle-search-result-meta">
                <span>{result.language}</span>
                <span>{result.providerLabel}</span>
                {result.downloads !== undefined && <span>↓ {result.downloads.toLocaleString()}</span>}
                {result.hearingImpaired && <span>HI</span>}
                {result.machineTranslated && <span>MT</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
