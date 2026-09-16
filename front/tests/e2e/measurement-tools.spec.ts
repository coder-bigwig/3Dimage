import { expect, test } from '@playwright/test'

test('all 3D measurement tools show model results and support completion controls', async ({ page }) => {
  test.setTimeout(300_000)
  await page.goto('/share/viewer')
  await page.waitForLoadState('domcontentloaded')
  await expect(page.getByTestId('viewer-canvas')).toHaveAttribute('data-load-state', 'ready', { timeout: 120_000 })

  const clickToolbar = async (name: string) => {
    const button = page.getByRole('button', { name, exact: true })
    await button.evaluate((element) => (element as HTMLButtonElement).click())
  }

  await clickToolbar('测量')
  const canvas = page.getByTestId('viewer-canvas')
  const bounds = (await canvas.boundingBox())!

  const measure = async (tool: '长度' | '直径' | '角度' | '面积', points: number, finish = false) => {
    await clickToolbar(tool)
    const toolId = tool === '长度' ? 'length' : tool === '直径' ? 'diameter' : tool === '角度' ? 'angle' : 'closedArea'
    const selector = '.model-measurement-label[data-measurement-tool="' + toolId + '"]'
    const label = page.locator(selector)
    const candidates = points === 2
      ? [[[.45, .5], [.55, .5]], [[.4, .6], [.6, .6]], [[.35, .4], [.65, .4]], [[.45, .65], [.55, .65]]]
      : points === 3
        ? [[[.45, .5], [.55, .5], [.55, .6]], [[.4, .6], [.6, .6], [.6, .7]], [[.35, .4], [.65, .4], [.65, .5]]]
        : [[[.35, .4], [.65, .4], [.65, .6], [.35, .6]], [[.4, .45], [.6, .45], [.6, .65], [.4, .65]]]
    for (const candidate of candidates) {
      await clickToolbar('新建')
      for (const [x, y] of candidate) await page.mouse.click(bounds.x + bounds.width * x, bounds.y + bounds.height * y)
      if (finish) await clickToolbar('完成')
      try {
        await expect(label).toHaveCount(1, { timeout: 2_000 })
        await expect(label).toBeVisible()
        return label
      } catch {
        // Probe the next model-relative point set when a point landed on background.
      }
    }
    throw new Error('Could not pick ' + points + ' visible model points for ' + tool)
  }

  const lengthLabel = await measure('长度', 2)
  await expect(lengthLabel).toHaveText(/mm$/)
  await clickToolbar('撤销')
  await expect(page.locator('.model-measurement-label[data-measurement-tool="length"]')).toHaveCount(0)

  const diameterLabel = await measure('直径', 2)
  await expect(diameterLabel).toHaveText(/mm$/)
  const angleLabel = await measure('角度', 3)
  await expect(angleLabel).toHaveText(/°$/)
  const areaLabel = await measure('面积', 4, true)
  await expect(areaLabel).toHaveText(/mm²$/)
  await clickToolbar('清空')
  await expect(page.locator('.model-measurement-label')).toHaveCount(0)

  await clickToolbar('关闭')
  await expect(page.getByRole('button', { name: '测量', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '长度', exact: true })).toHaveCount(0)
  await expect(canvas).toBeVisible()
})
