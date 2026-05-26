import { useKeyboard } from '@react-aria/interactions'
import type { HTMLAttributes } from 'react'
import type { PlayerContextValue } from '../types'

export function usePlayerKeyboardShortcuts(ctx: PlayerContextValue): HTMLAttributes<HTMLElement> {
  const { mediaRemote, mediaStore } = ctx
  const { keyboardProps } = useKeyboard({
    onKeyDown: (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key.toLowerCase()) {
        case 'k':
        case ' ':
          e.preventDefault()
          mediaRemote.togglePlay()
          break
        case 'f':
          e.preventDefault()
          mediaRemote.toggleFullscreen()
          break
        case 'm':
          e.preventDefault()
          mediaRemote.toggleMute()
          break
        case 'arrowleft':
          e.preventDefault()
          mediaRemote.skip(-5)
          break
        case 'arrowright':
          e.preventDefault()
          mediaRemote.skip(5)
          break
        case 'arrowup':
          e.preventDefault()
          mediaRemote.setVolume(Math.min(1, mediaStore.state.volume + 0.1))
          break
        case 'arrowdown':
          e.preventDefault()
          mediaRemote.setVolume(Math.max(0, mediaStore.state.volume - 0.1))
          break
      }
    },
  })

  return keyboardProps
}
