import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { usePlayerRemote, usePlayerState } from '../components/player'
import { renderTestPlayer } from './test-utils/render-player'

function CustomControls() {
  const isPlaying = usePlayerState('isPlaying')
  const remote = usePlayerRemote()
  return (
    <button type="button" onClick={remote.togglePlay}>
      {isPlaying ? 'custom pause' : 'custom play'}
    </button>
  )
}

describe('React custom controls', () => {
  it('allows users to replace the default layout with custom controls', async () => {
    const user = userEvent.setup()
    renderTestPlayer({ children: <CustomControls /> })

    const button = screen.getByRole('button', { name: 'custom play' })
    await user.click(button)

    expect(await screen.findByRole('button', { name: 'custom pause' })).toBeInTheDocument()
  })
})
