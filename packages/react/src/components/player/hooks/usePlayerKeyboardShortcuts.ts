/**
 * @deprecated Keyboard shortcuts are now handled automatically by the player
 * via the HotkeyRegistry. This hook is kept for backward compatibility
 * but no longer needs to be called manually.
 */
import { useCallback, type HTMLAttributes } from 'react'
import type { PlayerContextValue } from '../types'

export function usePlayerKeyboardShortcuts(_ctx?: PlayerContextValue): HTMLAttributes<HTMLElement> {
  // Keyboard handling is now done in VideoPlayer via the hotkey registry.
  // Return empty props — the player handles it.
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    // This is a no-op; actual handling is in VideoPlayer's onKeyDown
  }, [])

  return { onKeyDown }
}
