import type { FC } from 'react'
import clsx from 'clsx'
import { useMediaState } from '../context'

export const MiniProgressBar: FC = () => {
  const controlsVisible = useMediaState('controlsVisible')
  const currentTime = useMediaState('currentTime')
  const duration = useMediaState('duration')
  const bufferedPercent = useMediaState('bufferedPercent')

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      className={clsx(
        'vplayer__mini-progress',
        'pointer-events-none absolute bottom-0 left-0 right-0 z-30 h-[3px] transition-opacity duration-300',
        controlsVisible ? 'opacity-0' : 'opacity-100',
      )}
      aria-hidden="true"
    >
      <div
        className="vplayer__mini-progress-buffered absolute inset-0 rounded-full"
        style={{
          width: `${bufferedPercent}%`,
          background: 'color-mix(in srgb, white 35%, transparent)',
        }}
      />
      <div
        className="vplayer__mini-progress-played absolute inset-0 rounded-full"
        style={{
          width: `${progress}%`,
          background: 'var(--vplayer-accent)',
        }}
      />
    </div>
  )
}
