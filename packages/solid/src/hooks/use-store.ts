/**
 * Solid store bridge — connects @tanstack/store to Solid's reactivity.
 *
 * `useStoreSignal` returns a getter function `() => S` that reads a signal.
 * The signal is updated whenever the store changes via subscription.
 *
 * Usage:
 * ```ts
 * const state = useStoreSignal(store)           // () => T — full state
 * const time = useStoreSignal(store, s => s.currentTime)  // () => number — slice
 * ```
 *
 * In Solid JSX, call the getter inside expressions to track reactivity:
 * ```tsx
 * <div>{state().currentTime}</div>
 * ```
 */

import type { Store } from '@tanstack/store'
import { createSignal, onCleanup } from 'solid-js'

export function useStoreSignal<T>(store: Store<T>): () => T
export function useStoreSignal<T, S>(store: Store<T>, selector: (state: T) => S): () => S
export function useStoreSignal<T, S>(store: Store<T>, selector?: (state: T) => S): () => T | S {
  const select = selector ?? ((s: T) => s as unknown as S)
  const [value, setValue] = createSignal(select(store.state))

  const unsub = store.subscribe(() => {
    setValue(() => select(store.state))
  })
  onCleanup(unsub)

  return value
}
