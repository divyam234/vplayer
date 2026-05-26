/**
 * Typed event bus for player-wide communication.
 * Companion to TanStack Store: store = state, event bus = actions/notifications.
 */
export type PlayerEventName =
  | 'play'
  | 'pause'
  | 'seeked'
  | 'timeupdate'
  | 'ended'
  | 'volumechange'
  | 'ratechange'
  | 'fullscreenchange'
  | 'pipchange'
  | 'controlschange'
  | 'settingchange'
  | 'pluginregistered'
  | 'error'
  | 'sourcechange'
  | (string & {})

export type PlayerEventHandler = (...args: any[]) => void

export class EventBus {
  private listeners = new Map<PlayerEventName, Set<PlayerEventHandler>>()

  /** Subscribe to an event. Returns an unsubscribe function. */
  on(event: PlayerEventName, handler: PlayerEventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler)
    return () => this.off(event, handler)
  }

  /** Subscribe to an event for one invocation only. */
  once(event: PlayerEventName, handler: PlayerEventHandler): () => void {
    const wrapper = (...args: any[]) => {
      handler(...args)
      this.off(event, wrapper)
    }
    return this.on(event, wrapper)
  }

  /** Unsubscribe a handler. If no handler given, removes all. */
  off(event: PlayerEventName, handler?: PlayerEventHandler): void {
    if (!handler) {
      this.listeners.delete(event)
      return
    }
    const set = this.listeners.get(event)
    if (set) {
      set.delete(handler)
      if (set.size === 0) this.listeners.delete(event)
    }
  }

  /** Emit an event with payload. */
  emit(event: PlayerEventName, ...args: any[]): void {
    this.listeners.get(event)?.forEach((handler) => {
      try {
        handler(...args)
      } catch (err) {
        console.error(`[vplayer] EventBus error in "${event}":`, err)
      }
    })
  }

  /** Remove all listeners. */
  clear(): void {
    this.listeners.clear()
  }

  /** Number of listeners for an event (or total if no event given). */
  listenerCount(event?: PlayerEventName): number {
    if (event) return this.listeners.get(event)?.size ?? 0
    let count = 0
    this.listeners.forEach((set) => (count += set.size))
    return count
  }
}
