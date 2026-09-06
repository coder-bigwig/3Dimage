import { expect, test } from '@playwright/test'

test('valid share renders the viewer and first layer', async ({ page }) => {
  await page.goto('/share/demo-valid-token-00000000000000000000')
  await expect(page.getByTestId('viewer-canvas')).toBeVisible()
  await expect(page.getByText('右上叶')).toBeVisible()
  await expect(page.getByTestId('layer-right-upper-lobe')).toHaveAttribute('data-load-state', 'ready')
  await page.getByRole('button', { name: '测量' }).click()
  await expect(page.getByRole('button', { name: '直径' })).toBeVisible()
})

test('expired share displays the expired state', async ({ page }) => {
  await page.goto('/share/demo-expired-token-000000000000000000')
  await expect(page.getByText('分享链接已失效')).toBeVisible()
})
