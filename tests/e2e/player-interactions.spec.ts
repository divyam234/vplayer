import { expect, test } from '@playwright/test'

import { installMediaMock } from './support/media-mock'

test.beforeEach(async ({ page }) => {
  await installMediaMock(page)
  await page.goto('/')
  await expect(page.getByRole('application', { name: 'Video player' })).toBeVisible()
})

test('playback controls respond to clicks and hotkeys', async ({ page }) => {
  const player = page.getByRole('application', { name: 'Video player' })

  await player.getByLabel('Play', { exact: true }).click()
  await expect(player.getByLabel('Pause', { exact: true })).toBeVisible()

  await player.focus()
  await page.keyboard.press('ArrowRight')
  await expect(player).toContainText('0:05 / 2:00')

  await page.keyboard.press('KeyM')
  await expect(player.getByRole('button', { name: 'Unmute' })).toBeVisible()

  await page.keyboard.press('Space')
  await expect(player.getByLabel('Play', { exact: true })).toBeVisible()
})

test('settings and playground controls update the player', async ({ page }) => {
  const player = page.getByRole('application', { name: 'Video player' })
  const settings = player.getByLabel('Settings', { exact: true })

  await settings.click()
  await page.getByRole('menuitem', { name: /Speed/ }).click()
  await page.getByRole('menuitem', { name: '1.5x' }).click()
  await settings.click()
  await expect(page.getByRole('menuitem', { name: /Speed.*1\.5x/ })).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Minimal' }).click()
  await expect(page.getByRole('toolbar', { name: 'Minimal custom controls' })).toBeVisible()

  await page.getByText('Advanced settings', { exact: true }).click()
  await page.getByRole('button', { name: 'Top left' }).click()
  await expect(player).toHaveAttribute('data-mini-player-position', 'top-left')

  await page.getByRole('button', { name: /Plain MP4/ }).click()
  await expect(page.getByLabel('Poster URL')).toHaveValue('')
  await expect(page.getByTestId('generated-code')).not.toContainText('captions.en.vtt')
})

test('fullscreen can be entered and exited', async ({ page }) => {
  const player = page.getByRole('application', { name: 'Video player' })

  await player.getByRole('button', { name: 'Fullscreen' }).click()
  await expect(player).toHaveAttribute('data-fullscreen', 'true')

  await player.getByRole('button', { name: 'Exit fullscreen' }).click()
  await expect(player).not.toHaveAttribute('data-fullscreen')
})
