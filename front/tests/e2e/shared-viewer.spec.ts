import { expect, test } from '@playwright/test'

test('valid share renders the viewer and first layer', async ({ page }) => {
  await page.goto('/share/demo-valid-token-00000000000000000000')
  await expect(page.getByTestId('viewer-canvas')).toHaveAttribute('data-load-state', 'ready', { timeout: 30_000 })
  await expect(page.getByText('右上叶')).toBeVisible()
  await expect(page.getByTestId('layer-right-upper-lobe')).toHaveAttribute('data-load-state', 'ready')
  await page.getByRole('button', { name: '测量' }).click()
  await expect(page.getByRole('button', { name: '直径' })).toBeVisible()
})

test('expired share displays the expired state', async ({ page }) => {
  await page.goto('/share/demo-expired-token-000000000000000000')
  await expect(page.getByText('分享链接已失效')).toBeVisible()
})

test('both reset buttons restore the initial lung rendering after a drag', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/share/demo-valid-token-00000000000000000000')
  await page.waitForLoadState('networkidle')
  const canvas = page.getByTestId('viewer-canvas')
  await expect(canvas).toBeVisible()
  const pixels = () => canvas.evaluate(element => (element as HTMLCanvasElement).toDataURL())
  const initial = await pixels()
  const bounds = (await canvas.boundingBox())!
  for (const name of ['重置', '恢复视角']) {
    await page.mouse.move(bounds.x + bounds.width * 0.4, bounds.y + bounds.height * 0.5)
    await page.mouse.down()
    await page.mouse.move(bounds.x + bounds.width * 0.65, bounds.y + bounds.height * 0.6)
    await page.mouse.up()
    expect(await pixels()).not.toBe(initial)
    await page.getByRole('button', { name, exact: true }).click()
    await expect.poll(pixels).toBe(initial)
  }
})
