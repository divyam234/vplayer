import type { ContextMenuItem } from '@vplayer/core'
import { useCallback, useEffect, useRef, useState, type FC } from 'react'
import { Button } from 'react-aria-components'

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
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 9999,
        minWidth: 160,
        borderRadius: 8,
        padding: 6,
        background: 'color-mix(in srgb, black 90%, transparent)',
        border: '1px solid color-mix(in srgb, white 14%, transparent)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(18px)',
        outline: 'none',
      }}
      role="menu"
      onKeyDown={(e) => {
        if (e.key === 'Escape') close()
      }}
    >
      {allItems.map((item, i) =>
        item.separator ? (
          <div
            key={`sep-${i}`}
            className="vplayer__contextmenu-separator my-1 border-t"
            style={{ borderColor: 'color-mix(in srgb, white 14%, transparent)' }}
            role="separator"
          />
        ) : (
          <Button
            key={`item-${i}`}
            className="vplayer__contextmenu-item flex w-full items-center rounded-md px-2.5 py-1.5 text-sm text-white/80 transition-colors outline-none hover:bg-white/10 data-[focused]:bg-white/10"
            isDisabled={item.disabled}
            onPress={() => {
              item.onAction()
              close()
            }}
            style={{ cursor: item.disabled ? 'default' : 'pointer' }}
          >
            {item.label}
          </Button>
        ),
      )}
    </div>
  )
}
