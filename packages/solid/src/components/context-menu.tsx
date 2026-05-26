import type { ContextMenuItem } from '@vplayer/core'
import { createEffect, createSignal, onCleanup, Show } from 'solid-js'

import { usePlayerRemote, usePlayerState, usePlayerContext } from '../context'

export function ContextMenu() {
  const isPlaying = usePlayerState('isPlaying')
  const isLooping = usePlayerState('isLooping')
  const contextMenuItems = () => (usePlayerState('contextMenuItems')() ?? []) as ContextMenuItem[]
  const contextMenuEnabled = () => usePlayerState('contextMenuEnabled')() !== false
  const { labels } = usePlayerContext()
  const remote = usePlayerRemote()
  const containerRef = usePlayerContext().containerRef

  let menuRef: HTMLDivElement | undefined

  const [open, setOpen] = createSignal(false)
  const [position, setPosition] = createSignal({ x: 0, y: 0 })

  // Prevent browser default context menu on the player container
  createEffect(() => {
    const container = containerRef.current
    if (!container || !contextMenuEnabled()) return

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setPosition({ x: e.clientX, y: e.clientY })
      setOpen(true)
    }

    container.addEventListener('contextmenu', handleContextMenu)
    onCleanup(() => container.removeEventListener('contextmenu', handleContextMenu))
  })

  // Close on click outside or Escape
  createEffect(() => {
    if (!open()) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef && !menuRef.contains(e.target as Node)) {
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
    onCleanup(() => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    })
  })

  const close = () => setOpen(false)

  // Built-in context menu items
  const builtInItems: ContextMenuItem[] = [
    {
      label: isPlaying() ? labels.contextMenuPause : labels.contextMenuPlay,
      onAction: () => {
        remote.togglePlay()
      },
    },
    {
      label: `${isLooping() ? '✓ ' : ''}${labels.contextMenuLoop}`,
      onAction: () => {
        remote.toggleLoop()
      },
    },
  ]

  const allItems = (): ContextMenuItem[] => [...builtInItems, ...contextMenuItems()]

  return (
    <Show when={open()}>
      <div
        ref={(el) => {
          menuRef = el
        }}
        class="vplayer__contextmenu"
        style={`left:${position().x}px; top:${position().y}px;`}
        role="menu"
        onKeyDown={(e) => {
          if (e.key === 'Escape') close()
        }}
      >
        {allItems().map((item, i) =>
          item.separator ? (
            <div class="vplayer__contextmenu-separator" role="separator" />
          ) : (
            <button
              class="vplayer__contextmenu-item"
              disabled={item.disabled}
              onClick={() => {
                item.onAction()
                close()
              }}
              style={`cursor: ${item.disabled ? 'default' : 'pointer'};`}
            >
              {item.label}
            </button>
          ),
        )}
      </div>
    </Show>
  )
}
