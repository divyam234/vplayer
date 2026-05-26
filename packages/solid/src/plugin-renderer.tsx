import type { ControlRegistration, PluginAPI } from '@vplayer/core'
import { createEffect, createSignal, onCleanup, Show, type JSX } from 'solid-js'

import { usePlayerState, usePluginAPI } from './context'

// ── Plugin Controls ────────────────────────────────────────────

export function PluginControlsLeft() {
  const controls = usePlayerState('controls')
  return (
    <>
      {controls()
        .filter((c) => c.position === 'left')
        .slice()
        .sort(byIndex)
        .map(renderControl)}
    </>
  )
}

export function PluginControlsRight() {
  const controls = usePlayerState('controls')
  return (
    <>
      {controls()
        .filter((c) => c.position === 'right')
        .slice()
        .sort(byIndex)
        .map(renderControl)}
    </>
  )
}

export function PluginControlsTop() {
  const controls = usePlayerState('controls')
  return (
    <>
      {controls()
        .filter((c) => c.position === 'top')
        .slice()
        .sort(byIndex)
        .map(renderControl)}
    </>
  )
}

export function PluginControlsCenter() {
  const controls = usePlayerState('controls')
  return (
    <>
      {controls()
        .filter((c) => c.position === 'center')
        .slice()
        .sort(byIndex)
        .map(renderControl)}
    </>
  )
}

function byIndex(a: { index: number }, b: { index: number }) {
  return a.index - b.index
}

function PluginControlItem(props: { def: ControlRegistration }) {
  const api = usePluginAPI()
  const Component = props.def.render as (props: { api: PluginAPI }) => JSX.Element
  return <Component api={api} />
}

function renderControl(def: ControlRegistration) {
  return <PluginControlItem def={def} />
}

// ── Plugin Layers ──────────────────────────────────────────────

export function PluginLayers() {
  const layers = usePlayerState('layers')
  const api = usePluginAPI()
  return (
    <Show when={layers().length > 0}>
      {layers().map((layer) => {
        const Component = layer.render as (props: { api: PluginAPI }) => JSX.Element
        return <Component api={api} />
      })}
    </Show>
  )
}

// ── Plugin Settings ────────────────────────────────────────────

export function PluginSettings() {
  const settings = usePlayerState('settings')
  const api = usePluginAPI()
  return (
    <Show when={settings().length > 0}>
      {settings().map((setting) => {
        if (setting.render) {
          const Component = setting.render as (props: { api: PluginAPI }) => JSX.Element
          return <Component api={api} />
        }
        return null
      })}
    </Show>
  )
}

// ── Notification (Notice) Overlay ──────────────────────────────

export function NotificationOverlay() {
  const notification = usePlayerState('notification')
  const store = usePluginAPI().store
  const [visible, setVisible] = createSignal(false)

  createEffect(() => {
    const notif = notification()
    if (!notif) {
      setVisible(false)
      return
    }
    setVisible(true)
    const timer = setTimeout(() => {
      setVisible(false)
      store.setState((prev) => ({ ...prev, notification: null }))
    }, notif.duration)
    onCleanup(() => clearTimeout(timer))
  })

  return (
    <Show when={visible() && notification()}>
      <div class="vplayer__notice">
        <div class="vplayer__notice-inner">{notification()!.message}</div>
      </div>
    </Show>
  )
}
