/**
 * Renders plugin-registered controls, settings, and layers.
 */
import { useEffect, useState, type FC } from 'react'
import { useMediaState, usePluginAPI } from './context'
import type { ControlRegistration, LayerRegistration, PluginAPI, SettingRegistration } from '@vplayer/core'

// ── Plugin Controls ───────────────────────────────────────────

export const PluginControlsLeft: FC = () => {
  const controls = useMediaState('controls')
  return <>{controls.filter((c) => c.position === 'left').sort(byIndex).map(renderControl)}</>
}

export const PluginControlsRight: FC = () => {
  const controls = useMediaState('controls')
  return <>{controls.filter((c) => c.position === 'right').sort(byIndex).map(renderControl)}</>
}

export const PluginControlsTop: FC = () => {
  const controls = useMediaState('controls')
  return <>{controls.filter((c) => c.position === 'top').sort(byIndex).map(renderControl)}</>
}

export const PluginControlsCenter: FC = () => {
  const controls = useMediaState('controls')
  return <>{controls.filter((c) => c.position === 'center').sort(byIndex).map(renderControl)}</>
}

function byIndex(a: { index: number }, b: { index: number }) {
  return a.index - b.index
}

const PluginControlItem: FC<{ def: ControlRegistration }> = ({ def }) => {
  const api = usePluginAPI()
  const Component = def.render as React.ComponentType<{ api: PluginAPI }>
  return <Component api={api} />
}

function renderControl(def: ControlRegistration) {
  return <PluginControlItem key={def.name} def={def} />
}

// ── Plugin Layers ─────────────────────────────────────────────

export const PluginLayers: FC = () => {
  const layers = useMediaState('layers')
  if (layers.length === 0) return null
  const api = usePluginAPI()
  return (
    <>
      {layers.map((layer) => {
        const Component = layer.render as React.ComponentType<{ api: PluginAPI }>
        return <Component key={layer.name} api={api} />
      })}
    </>
  )
}

// ── Plugin Settings ───────────────────────────────────────────

export const PluginSettings: FC = () => {
  const settings = useMediaState('settings')
  if (settings.length === 0) return null
  const api = usePluginAPI()
  return (
    <>
      {settings.map((setting) => {
        if (setting.render) {
          const Component = setting.render as React.ComponentType<{ api: PluginAPI }>
          return <Component key={setting.name} api={api} />
        }
        return null
      })}
    </>
  )
}

// ── Notification (Notice) Overlay ─────────────────────────────

export const NotificationOverlay: FC = () => {
  const notification = useMediaState('notification')
  const store = usePluginAPI().store
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!notification) {
      setVisible(false)
      return
    }
    setVisible(true)
    const timer = setTimeout(() => {
      setVisible(false)
      store.setState((prev) => ({ ...prev, notification: null }))
    }, notification.duration)
    return () => clearTimeout(timer)
  }, [notification, store])

  if (!visible || !notification) return null

  return (
    <div className="vplayer__notice">
      <div className="vplayer__notice-inner">{notification.message}</div>
    </div>
  )
}
