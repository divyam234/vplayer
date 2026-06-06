import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { PlaygroundClient } from './playground-client'

describe('VPlayer docs playground', () => {
  it('renders a configurable player lab with presets, source controls, and generated JSX', () => {
    render(<PlaygroundClient />)

    expect(screen.getByRole('heading', { name: /configure every important player path/i })).toBeInTheDocument()
    expect(screen.getByRole('application', { name: /video player/i })).toBeInTheDocument()
    expect((screen.getByLabelText(/video url/i) as HTMLInputElement).value).toContain('big-buck-bunny')
    expect(screen.getByTestId('generated-code')).toHaveTextContent('<VideoPlayer')
  })

  it('applies presets and updates the generated code snippet', async () => {
    const user = userEvent.setup()
    render(<PlaygroundClient />)

    await user.click(screen.getByRole('button', { name: /plain mp4, no extras/i }))

    expect(screen.getByLabelText(/poster url/i)).toHaveValue('')
    expect(screen.getByLabelText(/subtitle vtt url/i)).toHaveValue('')
    expect(screen.getByTestId('generated-code')).not.toHaveTextContent('captions.en.vtt')
  })

  it('switches to the minimal custom-controls layout', async () => {
    const user = userEvent.setup()
    render(<PlaygroundClient />)

    await user.click(screen.getByRole('button', { name: /^minimal$/i }))

    expect(screen.getByRole('toolbar', { name: /minimal custom controls/i })).toBeInTheDocument()
    expect(
      within(screen.getByRole('toolbar', { name: /minimal custom controls/i })).getByRole('button', {
        name: /^play$/i,
      }),
    ).toBeInTheDocument()
  })

  it('lets users tune mini-player behavior from form controls', async () => {
    const user = userEvent.setup()
    render(<PlaygroundClient />)

    const player = screen.getByRole('application', { name: /video player/i })
    expect(player).toHaveAttribute('data-mini-player-position', 'bottom-right')

    await user.click(screen.getByRole('button', { name: /top left/i }))
    expect(player).toHaveAttribute('data-mini-player-position', 'top-left')

    await user.click(screen.getByLabelText(/enable mini-player button/i))
    expect(screen.queryByRole('button', { name: /mini player/i })).not.toBeInTheDocument()
  })

  it('uses the single base player stylesheet in generated JSX', () => {
    render(<PlaygroundClient />)

    expect(screen.getByRole('application', { name: /video player/i })).not.toHaveAttribute('data-skin')
    expect(screen.queryByRole('group', { name: /player skin selector/i })).not.toBeInTheDocument()
    expect(screen.getByTestId('generated-code')).toHaveTextContent("import '@vplayer/react/player.css'")
    expect(screen.getByTestId('generated-code')).not.toHaveTextContent('skin=')
  })

  it('keeps event log and theme controls accessible', async () => {
    const user = userEvent.setup()
    render(<PlaygroundClient />)

    await user.click(screen.getByRole('button', { name: /ember/i }))
    const log = screen.getByRole('list', { name: /playground event log/i })

    expect(within(log).getByText(/theme ember/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/accent oklch/i)).toHaveValue('oklch(0.72 0.18 35)')
  })
})
