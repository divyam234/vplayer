import { expect, test } from '@playwright/test'

test('docs home promotes docs and playground', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /build video experiences that survive real users/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /open playground/i })).toHaveAttribute('href', '/playground')
  await expect(page.getByRole('link', { name: /start building/i })).toHaveAttribute('href', '/docs/getting-started')
})

test('playground renders the configurable player lab inside docs', async ({ page }) => {
  await page.goto('/playground')
  await expect(page.getByRole('heading', { name: /configure every important player path/i })).toBeVisible()
  await expect(page.getByRole('application', { name: /video player/i })).toBeVisible()
  await expect(page.getByLabel(/video url/i)).toBeVisible()
  await expect(page.getByTestId('generated-code')).toContainText('<VideoPlayer')
})

test('playground controls update layout, source preset, and mini-player config', async ({ page }) => {
  await page.goto('/playground')

  await page.getByRole('button', { name: /plain mp4, no extras/i }).click()
  await expect(page.getByLabel(/poster url/i)).toHaveValue('')
  await expect(page.getByTestId('generated-code')).not.toContainText('captions.en.vtt')

  await page.getByRole('button', { name: /^minimal$/i }).click()
  await expect(page.getByRole('toolbar', { name: /minimal custom controls/i })).toBeVisible()

  await page.getByRole('button', { name: /top left/i }).click()
  await expect(page.getByRole('application', { name: /video player/i })).toHaveAttribute(
    'data-mini-player-position',
    'top-left',
  )

  await expect(page.getByRole('group', { name: /player skin selector/i })).toHaveCount(0)
  await expect(page.getByRole('application', { name: /video player/i })).not.toHaveAttribute('data-skin', /.+/)
  await expect(page.getByTestId('generated-code')).toContainText("import '@vplayer/react/player.css'")
  await expect(page.getByTestId('generated-code')).not.toContainText('skin=')

  await page.getByRole('button', { name: /^debug$/i }).click()
  await page.getByRole('button', { name: /^mini player$/i }).click()
  await expect(page.getByRole('toolbar', { name: /mini player controls/i })).toBeVisible()
  await expect(page.getByRole('toolbar', { name: /^playback controls$/i })).toHaveCount(0)
})
