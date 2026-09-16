import { expect, test } from '@playwright/test'

test('touch double-tap marks the model and long-press moves only the label', async ({ page, request, browserName }) => {
  test.skip(browserName !== 'chromium', 'Uses Chromium touch input to exercise long-press gestures')
  test.setTimeout(120_000)
  const token = process.env.ANNOTATION_TEST_TOKEN ?? 'demo-valid-token-00000000000000000000', text = `触摸验证-${Date.now()}`
  const endpoint = `/api/v1/shared-viewers/${token}/annotations`
  const read = async () => (await request.get(endpoint)).json()
  try {
    await page.goto(process.env.ANNOTATION_TEST_ENTRY ?? `/share/${token}`)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByTestId('viewer-canvas')).toHaveAttribute('data-load-state', 'ready', { timeout: 120_000 })
    await page.getByRole('button', { name: '标注', exact: true }).tap()
    await page.getByRole('menuitem', { name: '三维标注' }).tap()
    await page.getByRole('textbox', { name: '标注文字', exact: true }).fill(text)
    const bounds = (await page.getByTestId('viewer-canvas').boundingBox())!
    const x = bounds.x + bounds.width * .45, y = bounds.y + bounds.height * .5
    const cdp = await page.context().newCDPSession(page)
    const start = Date.now() / 1000
    // Protocol timestamps describe one actual double tap. Awaiting two high-level tap()
    // calls can add over a second of rendering/automation delay between the touches.
    for (const [type, offset] of [['touchStart', 0], ['touchEnd', .04], ['touchStart', .12], ['touchEnd', .16]] as const) {
      await cdp.send('Input.dispatchTouchEvent', { type, timestamp: start + offset, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] })
    }
    const label = page.locator('.model-annotation-label').filter({ hasText: text })
    await expect(label).toBeVisible()
    await expect.poll(async () => (await read()).models.some((m: { text: string }) => m.text === text)).toBe(true)
    const anchor = (await read()).models.find((m: { text: string }) => m.text === text).position
    const rect = (await label.boundingBox())!
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: rect.x + 10, y: rect.y + 10 }] })
    await page.waitForTimeout(450)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: rect.x + 40, y: rect.y + 30 }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect.poll(async () => (await read()).models.find((m: { text: string }) => m.text === text)?.offset[0]).toBe(85)
    expect((await read()).models.find((m: { text: string }) => m.text === text).position).toEqual(anchor)
    await page.screenshot({ path: 'test-results/annotation-touch.png' })
    await label.tap()
    await page.getByRole('button', { name: '删除', exact: true }).tap()
    await expect(label).toHaveCount(0)
    await expect.poll(async () => (await read()).models.some((m: { text: string }) => m.text === text)).toBe(false)
  } finally {
    await page.close()
    const current = await read()
    const models = current.models.filter((m: { text: string }) => m.text !== text)
    if (models.length !== current.models.length) expect((await request.put(endpoint, { data: { ...current, models } })).ok()).toBeTruthy()
  }
})
