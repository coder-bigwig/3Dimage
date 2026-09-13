#!/usr/bin/env node
/**
 * 对照基线截图脚本（reference capture harness）
 * ------------------------------------------------------------------
 * 目的：把「原站 hexaviewcase」与「本地复刻查看器」在同一宽度下左右拼成一张
 *       对照长图，作为后续所有视觉修改的判据（避免盲调）。
 *
 * 依赖：复用 front/ 已安装的 Playwright，无需额外安装。
 *
 * 用法（在仓库根目录执行）：
 *   node scripts/reference/capture.mjs
 *
 * 环境变量（均可选）：
 *   REFERENCE_URL   原站链接；缺省时读取 front/.env.local 的 VITE_REFERENCE_VIEWER_URL
 *   LOCAL_URL       本地地址，默认 http://localhost:5173/public-data
 *   WIDTHS          宽度列表，默认 390,768,1440
 *   OUT_DIR         输出目录，默认 front/
 *   SETTLE_MS       每页加载后额外等待毫秒，默认 4000
 *   NAV_TIMEOUT_MS  单页导航超时毫秒，默认 45000
 *
 * 输出：<OUT_DIR>/reference-strip-<width>.png
 * 注意：原站含病例数据与访问凭证。生成的截图属本地对照产物，不要提交进仓库。
 */
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..', '..')
const frontDir = path.join(repoRoot, 'front')

const require = createRequire(path.join(frontDir, 'package.json'))
let chromium
try {
  ;({ chromium } = require('@playwright/test'))
} catch {
  console.error('[capture] 找不到 Playwright。请先在 front/ 安装依赖：pnpm --dir front install')
  process.exit(1)
}

const WIDTH_HEIGHTS = { 390: 844, 414: 896, 480: 900, 768: 1024, 1024: 768, 1280: 800, 1440: 900, 1709: 960 }

function parseWidths(value) {
  return value
    .split(',')
    .map(item => Number(item.trim()))
    .filter(width => Number.isFinite(width) && width > 0)
}

function readEnvLocal(key) {
  const envLocal = path.join(frontDir, '.env.local')
  if (!existsSync(envLocal)) return undefined
  for (const line of readFileSync(envLocal, 'utf8').split(/\r?\n/)) {
    const match = new RegExp(`^\\s*${key}\\s*=\\s*(.+?)\\s*$`).exec(line)
    if (match) return match[1].replace(/^["']|["']$/g, '')
  }
  return undefined
}

const widths = parseWidths(process.env.WIDTHS ?? '390,768,1440')
const localUrl = process.env.LOCAL_URL ?? 'http://localhost:5173/public-data'
const referenceUrl = process.env.REFERENCE_URL ?? readEnvLocal('VITE_REFERENCE_VIEWER_URL')
const outDir = path.resolve(process.env.OUT_DIR ?? frontDir)
const settleMs = Number(process.env.SETTLE_MS ?? 4000)
const navTimeout = Number(process.env.NAV_TIMEOUT_MS ?? 45000)
const referenceTheme = process.env.REFERENCE_THEME ?? 'light'

if (widths.length === 0) {
  console.error('[capture] WIDTHS 为空，无法截图。')
  process.exit(1)
}

// The reference viewer toggles its own theme; pin it so captures stay comparable.
async function pinReferenceTheme(page, theme) {
  if (!theme) return
  await page.evaluate(value => {
    document.body.classList.remove('lightTheme', 'darkTheme')
    document.body.classList.add(`${value}Theme`)
  }, theme).catch(() => {})
}

async function capturePage(page, url, { theme } = {}) {
  let navigationError
  try {
    await page.goto(url, { waitUntil: 'load', timeout: navTimeout })
    if (theme) await pinReferenceTheme(page, theme)
    await page.waitForLoadState('networkidle', { timeout: navTimeout }).catch(() => {})
    await page.waitForTimeout(settleMs)
    if (theme) await pinReferenceTheme(page, theme)
  } catch (error) {
    navigationError = error instanceof Error ? error.message : String(error)
  }
  try {
    const buffer = await page.screenshot({ type: 'png' })
    return { ok: !navigationError, buffer, error: navigationError }
  } catch (error) {
    return { ok: false, buffer: undefined, error: navigationError ?? (error instanceof Error ? error.message : String(error)) }
  }
}

async function composeStrip(page, width, height, parts) {
  const usable = parts.filter(part => part.buffer)
  if (usable.length === 0) return undefined
  const columns = usable
    .map(
      part => `<figure style="margin:0;flex:1 1 0;min-width:0">
        <figcaption style="font:12px/1.6 system-ui,-apple-system,Segoe UI,sans-serif;color:#333;padding:6px 2px">${part.label} · ${width}×${height}</figcaption>
        <img src="data:image/png;base64,${part.buffer.toString('base64')}" style="display:block;width:100%;border:1px solid #bbb;background:#fff" />
      </figure>`,
    )
    .join('')
  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f4">
    <div id="strip" style="display:flex;gap:8px;align-items:flex-start;padding:8px">${columns}</div>
  </body></html>`
  await page.setViewportSize({ width: width * usable.length + 64, height: height + 72 })
  await page.setContent(html, { waitUntil: 'load' })
  await page.waitForTimeout(250)
  return page.locator('#strip').screenshot({ type: 'png' })
}

const browser = await chromium.launch()
mkdirSync(outDir, { recursive: true })
if (!referenceUrl) console.warn('[capture] 未提供 REFERENCE_URL，且 front/.env.local 无 VITE_REFERENCE_VIEWER_URL，将只截本地。')

const summary = []
for (const width of widths) {
  const height = WIDTH_HEIGHTS[width] ?? Math.round(width * 1.6)
  const mobile = width <= 480
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, colorScheme: 'light' })
  const page = await context.newPage()

  const reference = referenceUrl ? await capturePage(page, referenceUrl, { theme: referenceTheme }) : undefined
  const local = await capturePage(page, localUrl)

  const parts = []
  if (reference) parts.push({ label: '原站 reference', buffer: reference.buffer })
  parts.push({ label: '本地 local', buffer: local.buffer })

  const strip = await composeStrip(page, width, height, parts)
  const file = path.join(outDir, `reference-strip-${width}.png`)
  if (strip) {
    await writeFile(file, strip)
    summary.push({ width, file: path.relative(repoRoot, file), reference: reference ? (reference.ok ? 'ok' : `失败: ${reference.error}`) : '未配置', local: local.ok ? 'ok' : `失败: ${local.error}` })
  } else {
    summary.push({ width, file: '(无输出)', reference: reference ? (reference.ok ? 'ok' : '失败') : '未配置', local: local.ok ? 'ok' : `失败: ${local.error}` })
  }
  await context.close()
}
await browser.close()

console.log('[capture] 对照截图完成：')
for (const row of summary) console.log(`  ${row.width}px -> ${row.file}  [原站 ${row.reference} | 本地 ${row.local}]`)
if (summary.every(row => row.local !== 'ok')) {
  console.error(`[capture] 本地页面不可达，请先启动前端：pnpm --dir front dev（默认 ${localUrl}）`)
  process.exitCode = 1
}
