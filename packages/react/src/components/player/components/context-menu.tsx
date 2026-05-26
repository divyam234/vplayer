import type { ContextMenuItem } from '@vplayer/core'
import { useCallback, useEffect, useRef, useState, type FC } from 'react'

import { usePlayerRemote, usePlayerState, usePlayerContext } from '../context'

export const ContextMenu: FC = () => {
  const isPlaying = usePlayerState('isPlaying')
  const isLooping = usePlayerState('isLooping')
  const contextMenuItems = (usePlayerState('contextMenuItems') ?? []) as ContextMenuItem[]
  const contextMenuEnabled = usePlayerState('contextMenuEnabled') !== false
  const { labels } = usePlayerContext()
  const remote = usePlayerRemote()
  const containerRef = usePlayerContext().containerRef
  const menuRef = useRef<HTMLDivElement>(null)

  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  // Prevent browser default context menu on the player container
  useEffect(() => {
    const container = containerRef.current
    if (!container || !contextMenuEnabled) return

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setPosition({ x: e.clientX, y: e.clientY })
      setOpen(true)
    }

    container.addEventListener('contextmenu', handleContextMenu)
    return () => container.removeEventListener('contextmenu', handleContextMenu)
  }, [containerRef, contextMenuEnabled])

  // Close on click outside or Escape
  useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const close = useCallback(() => setOpen(false), [])

  // Built-in context menu items
  const builtInItems: ContextMenuItem[] = [
    {
      label: isPlaying ? labels.contextMenuPause : labels.contextMenuPlay,
      onAction: () => {
        remote.togglePlay()
      },
    },
    {
      label: `${isLooping ? '✓ ' : ''}${labels.contextMenuLoop}`,
      onAction: () => {
        remote.toggleLoop()
      },
    },
  ]

  const allItems: ContextMenuItem[] = [...builtInItems, ...contextMenuItems]

  if (!open) return null

  return (
    <div
      ref={menuRef}
      className="vplayer__contextmenu"
      style={{ left: position.x, top: position.y }}
      role="menu"
      onKeyDown={(e) => {
        if (e.key === 'Escape') close()
      }}
    >
      {allItems.map((item, i) =>
        item.separator ? (
          <div key={`sep-${i}`} className="vplayer__contextmenu-separator" role="separator" />
        ) : (
          <button
            key={`item-${i}`}
            className="vplayer__contextmenu-item"
            disabled={item.disabled}
            onClick={() => {
              item.onAction()
              close()
            }}
            style={{ cursor: item.disabled ? 'default' : 'pointer' }}
          >
            {item.label}
          </button>
        ),
      )}
    </div>
  )
}
