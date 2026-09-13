import { expect, test } from '@playwright/test'

test('public MSD lung manifest loads all five GLB layers', async ({ page }) => {
  const failedAssetResponses: string[] = []
  const pageErrors: string[] = []
  page.on('response', response => {
    if (response.url().includes('/public-data/') && !response.ok()) failedAssetResponses.push(`${response.status()} ${response.url()}`)
  })
  page.on('pageerror', error => pageErrors.push(error.message))

  await page.goto('/public-data')
  await expect(page.getByRole('main', { name: 'Public CT · lung_001' })).toBeVisible()
  await expect(page.getByTestId('viewer-canvas')).toHaveAttribute('data-load-state', 'ready')
  await expect(page.locator('.measurement-item')).toHaveCount(5)
  await page.waitForTimeout(1500)

  expect(failedAssetResponses).toEqual([])
  expect(pageErrors).toEqual([])
})
