import { render } from '@testing-library/react'
import type { ReactNode } from 'react'

import { VideoPlayer, type PlayerProps } from '../../components/player'
import { FakeEngine } from './fake-engine'

export function renderTestPlayer(props: Partial<PlayerProps> & { children?: ReactNode } = {}) {
  let engine: FakeEngine | null = null
  const result = render(
    <VideoPlayer
      src="/video.mp4"
      engine={(video) => {
        engine = new FakeEngine(video)
        return engine
      }}
      {...props}
    />,
  )

  if (!engine) throw new Error('Fake engine was not created')
  return { ...result, engine: engine as FakeEngine }
}
