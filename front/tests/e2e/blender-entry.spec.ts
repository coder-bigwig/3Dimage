import { expect, test } from '@playwright/test'

test('fresh /share/viewer preserves the refined model and persists usable 2D and 3D annotations', async ({ page, request }) => {
  test.setTimeout(300_000)
  const endpoint = '/api/v1/shared-viewers/demo-blender-token-000000000000000000/annotations'
  const read = async () => (await request.get(endpoint)).json()
  const original = await read()
  const text = `精修模型标注-${Date.now()}`
  const enter = async (name: string) => {
    await page.getByRole('button', { name: '标注', exact: true }).click()
    await page.getByRole('menuitem', { name }).click()
  }
  try {
    await page.goto('/share/viewer')
    await expect(page.getByRole('main', { name: '公开肺部 CT · Blender 精修模型' })).toBeVisible()
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByTestId('viewer-canvas')).toHaveAttribute('data-load-state', 'ready', { timeout: 120_000 })
    await enter('二维标注')
    await page.getByRole('button', { name: '工具', exact: true }).click()
    await page.getByRole('button', { name: '箭头', exact: true }).click()
    await expect(page.getByRole('button', { name: '发送', exact: true })).toBeDisabled()
    const bounds = (await page.getByLabel('二维标注画布').boundingBox())!
    await page.mouse.move(bounds.x + bounds.width * .25, bounds.y + bounds.height * .3)
    await page.mouse.down()
    await page.mouse.move(bounds.x + bounds.width * .45, bounds.y + bounds.height * .5, { steps: 3 })
    await page.mouse.up()
    await expect.poll(async () => (await read()).drawings.length).toBe(original.drawings.length + 1)
    await page.screenshot({ path: 'test-results/blender-2d-annotation.png' })
    await page.getByRole('button', { name: '关闭', exact: true }).click()
    await enter('三维标注')
    await page.getByRole('textbox', { name: '标注文字', exact: true }).fill(text)
    const canvas = page.getByTestId('viewer-canvas'), modelBounds = (await canvas.boundingBox())!
    for (const [x, y] of [[.45, .5], [.55, .5], [.45, .65]]) {
      await canvas.dblclick({ position: { x: modelBounds.width * x, y: modelBounds.height * y } })
      if (await page.locator('.model-annotation-label').filter({ hasText: text }).count()) break
    }
    const label = page.locator('.model-annotation-label').filter({ hasText: text })
    await expect(label).toBeVisible({ timeout: 120_000 })
    await expect.poll(async () => (await read()).models.some((m: { text: string }) => m.text === text)).toBe(true)
    await page.screenshot({ path: 'test-results/blender-3d-annotation.png' })
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('main', { name: '公开肺部 CT · Blender 精修模型' })).toBeVisible()
    await expect(page.getByTestId('viewer-canvas')).toHaveAttribute('data-load-state', 'ready', { timeout: 120_000 })
    await expect(label).toBeVisible({ timeout: 120_000 })
    await enter('二维标注')
    await expect(page.getByLabel('二维标注画布').locator('polyline')).not.toHaveCount(0)
    await expect.poll(async () => (await read()).drawings.length).toBe(original.drawings.length + 1)
  } finally {
    await page.close()
    const current = await read()
    expect((await request.put(endpoint, { data: { ...original, version: current.version } })).ok()).toBeTruthy()
  }
})
