import { useCallback, useEffect, useMemo, useState, type RefObject } from 'react'

import type { MiniPlayerOptions, MiniPlayerState } from '../types'

function normalizeMiniPlayerOptions(miniPlayer?: boolean | MiniPlayerOptions): Required<MiniPlayerOptions> {
  if (miniPlayer === true) {
    return { enabled: true, auto: false, position: 'bottom-right', width: 360 }
  }

  if (!miniPlayer) {
    return { enabled: false, auto: false, position: 'bottom-right', width: 360 }
  }

  return {
    enabled: miniPlayer.enabled ?? true,
    auto: miniPlayer.auto ?? false,
    position: miniPlayer.position ?? 'bottom-right',
    width: miniPlayer.width ?? 360,
  }
}

export function useMiniPlayerState(
  anchorRef: RefObject<HTMLElement | null>,
  miniPlayer?: boolean | MiniPlayerOptions,
): MiniPlayerState {
  const config = useMemo(() => normalizeMiniPlayerOptions(miniPlayer), [miniPlayer])
  const [active, setActive] = useState(false)
  const [previousEnabled, setPreviousEnabled] = useState(config.enabled)

  if (previousEnabled !== config.enabled) {
    setPreviousEnabled(config.enabled)
    if (!config.enabled) setActive(false)
  }

  const enter = useCallback(() => {
    if (config.enabled) setActive(true)
  }, [config.enabled])

  const exit = useCallback(() => setActive(false), [])

  const toggle = useCallback(() => {
    if (!config.enabled) return
    setActive((prev) => !prev)
  }, [config.enabled])

  useEffect(() => {
    if (!config.enabled || !config.auto) return
    const anchor = anchorRef.current
    if (!anchor || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        const shouldMini = !entry.isIntersecting && entry.boundingClientRect.top < 0
        setActive(shouldMini)
      },
      { threshold: 0.1 },
    )

    observer.observe(anchor)
    return () => observer.disconnect()
  }, [anchorRef, config.auto, config.enabled])

  return useMemo(
    () => ({
      enabled: config.enabled,
      active: config.enabled && active,
      auto: config.auto,
      position: config.position,
      width: config.width,
      enter,
      exit,
      toggle,
    }),
    [active, config.auto, config.enabled, config.position, config.width, enter, exit, toggle],
  )
}

export function createDisabledMiniPlayerState(): MiniPlayerState {
  return {
    enabled: false,
    active: false,
    auto: false,
    position: 'bottom-right',
    width: 360,
    enter: () => {},
    exit: () => {},
    toggle: () => {},
  }
}
