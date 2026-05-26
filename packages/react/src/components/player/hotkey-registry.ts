/**
 * Extensible keyboard shortcut registry.
 * Built-in hotkeys are registered by default; plugins can add/remove.
 */

export interface HotkeyBinding {
  /** KeyboardEvent.code (e.g. 'Space', 'KeyK', 'ArrowLeft') */
  key: string
  /** Human-readable description */
  description: string
  /** Handler. Return false to prevent default propagation to other bindings of same key. */
  handler: (event: KeyboardEvent) => void
  /** If true, fires even when an input/textarea is focused (default: false) */
  allowWhenEditing?: boolean
}

type BindingMap = Map<string, HotkeyBinding[]>

export class HotkeyRegistry {
  private bindings: BindingMap = new Map()
  private enabled: boolean = true

  /** Register a hotkey binding. Returns an unsubscribe function. */
  register(binding: HotkeyBinding): () => void {
    const { key } = binding
    if (!this.bindings.has(key)) {
      this.bindings.set(key, [])
    }
    this.bindings.get(key)!.push(binding)
    return () => this.unregister(binding)
  }

  /** Unregister a specific binding. */
  unregister(binding: HotkeyBinding): void {
    const { key } = binding
    const list = this.bindings.get(key)
    if (!list) return
    const idx = list.indexOf(binding)
    if (idx !== -1) {
      list.splice(idx, 1)
      if (list.length === 0) this.bindings.delete(key)
    }
  }

  /** Remove all bindings for a key. */
  unregisterAll(key: string): void {
    this.bindings.delete(key)
  }

  /** Clear all registered bindings. */
  clear(): void {
    this.bindings.clear()
  }

  /** Enable/disable hotkey processing. */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  /** Process a keydown event. Returns true if a binding handled it. */
  handleKeyDown(event: KeyboardEvent): boolean {
    if (!this.enabled) return false
    const list = this.bindings.get(event.code)
    if (!list || list.length === 0) return false

    const isEditing =
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      (event.target as HTMLElement)?.isContentEditable

    let handled = false
    for (const binding of list) {
      if (isEditing && !binding.allowWhenEditing) continue
      binding.handler(event)
      handled = true
    }
    return handled
  }

  /** Get all registered bindings (for debug display). */
  getBindings(): HotkeyBinding[] {
    const result: HotkeyBinding[] = []
    this.bindings.forEach((list) => result.push(...list))
    return result
  }

}
