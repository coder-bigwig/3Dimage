import { expect, test } from '@playwright/test'

test('real API persists 2D drawings and editable 3D anchors through reload, undo, deletion and clear', async ({ page, request }) => {
  test.setTimeout(300_000)
  const token = process.env.ANNOTATION_TEST_TOKEN ?? 'demo-valid-token-00000000000000000000'
  const endpoint = `/api/v1/shared-viewers/${token}/annotations`
  const originalResponse = await request.get(endpoint)
  expect(originalResponse.ok()).toBeTruthy()
  const original = await originalResponse.json()
  // Run only against the synthetic demo; preserve its starting document after the test.
  const read = async () => (await request.get(endpoint)).json()
  const enter = async (name: string) => {
    await page.getByRole('button', { name: '标注', exact: true }).click()
    await page.getByRole('menuitem', { name }).click()
  }
  try {
    const clear = await request.put(endpoint, { data: { version: original.version, drawings: [], models: [] } })
    expect(clear.ok()).toBeTruthy()
    await page.goto(process.env.ANNOTATION_TEST_ENTRY ?? `/share/${token}`)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByTestId('viewer-canvas')).toHaveAttribute('data-load-state', 'ready', { timeout: 120_000 })
    await enter('二维标注')
    await expect(page.getByRole('button', { name: '发送', exact: true })).toBeDisabled()
    const surface = page.getByLabel('二维标注画布')
    const box = (await surface.boundingBox())!
    await page.getByRole('button', { name: '工具', exact: true }).click()
    for (const name of ['画笔', '直线', '箭头', '圆', '矩形']) {
      await page.getByRole('button', { name, exact: true }).click()
      await page.mouse.move(box.x + box.width * .15, box.y + box.height * .2)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width * .6, box.y + box.height * .5, { steps: 5 })
      await page.mouse.up()
    }
    await page.getByRole('button', { name: '文字', exact: true }).click()
    await surface.click({ position: { x: box.width * .2, y: box.height * .65 } })
    await page.getByRole('textbox', { name: '二维标注文字' }).fill('二维测试')
    await page.getByRole('button', { name: '确定', exact: true }).click()
    await expect.poll(async () => (await read()).drawings.length).toBe(6)
    await page.screenshot({ path: 'test-results/annotations-2d-working.png' })
    await page.getByRole('button', { name: '撤销', exact: true }).click()
    await expect.poll(async () => (await read()).drawings.length).toBe(5)
    await page.getByRole('button', { name: '关闭', exact: true }).click()
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await enter('二维标注')
    await expect(surface.locator('polyline')).toHaveCount(3)
    await expect(surface.locator('ellipse')).toHaveCount(1)
    await expect(surface.locator('rect')).toHaveCount(1)
    await page.getByRole('button', { name: '清空', exact: true }).click()
    await expect.poll(async () => (await read()).drawings.length).toBe(0)
    await page.getByRole('button', { name: '关闭', exact: true }).click()
    await enter('三维标注')
    await page.getByRole('textbox', { name: '标注文字', exact: true }).fill('三维测试')
    const canvas = page.getByTestId('viewer-canvas'), bounds = (await canvas.boundingBox())!
    // Search visible model pixels by actual ray picking; no mocked engine events.
    for (const [x, y] of [[.45, .5], [.55, .5], [.4, .6], [.6, .6], [.35, .4], [.65, .4]]) {
      await canvas.dblclick({ position: { x: bounds.width * x, y: bounds.height * y } })
      if (await page.locator('.model-annotation-label').count()) break
    }
    const label = page.locator('.model-annotation-label').first()
    await expect(label).toHaveText('三维测试')
    await label.click()
    await page.getByRole('textbox', { name: '标注文字', exact: true }).fill('三维已编辑')
    await expect(label).toHaveText('三维已编辑')
    await expect.poll(async () => (await read()).models[0]?.text).toBe('三维已编辑')
    const anchor = (await read()).models[0].position
    const labelBox = (await label.boundingBox())!
    await page.mouse.move(labelBox.x + 12, labelBox.y + 12)
    await page.mouse.down()
    await page.waitForTimeout(450)
    await page.mouse.move(labelBox.x + 72, labelBox.y + 42, { steps: 8 })
    await page.mouse.up()
    await expect.poll(async () => (await read()).models[0]?.offset[0]).toBe(115)
    expect((await read()).models[0].position).toEqual(anchor)
    await page.screenshot({ path: 'test-results/annotations-3d-working.png' })
    await page.getByRole('button', { name: '更多', exact: true }).click()
    await expect(page.getByRole('dialog', { name: '操作提示' })).toBeVisible()
    await page.getByRole('button', { name: '知道了' }).click()
    await page.getByRole('button', { name: '关闭', exact: true }).click()
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await enter('三维标注')
    await expect(label).toHaveText('三维已编辑')
    await label.click()
    await page.getByRole('button', { name: '删除', exact: true }).click()
    await expect(label).toHaveCount(0)
    await expect.poll(async () => (await read()).models.length).toBe(0)
    await page.getByRole('button', { name: '撤销', exact: true }).click()
    await expect(label).toHaveText('三维已编辑')
    await expect.poll(async () => (await read()).models.length).toBe(1)
    await page.getByRole('button', { name: '清空', exact: true }).click()
    await expect.poll(async () => (await read()).models.length).toBe(0)
    await page.screenshot({ path: 'test-results/annotations-complete.png' })
  } finally {
    const current = await read()
    const restored = await request.put(endpoint, { data: { ...original, version: current.version } })
    expect(restored.ok()).toBeTruthy()
    await page.close()
  }
})
