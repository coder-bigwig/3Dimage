# 二维标注取色器 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为二维标注工具增加一个不依赖第三方库、支持色谱/色相/RGB/HEX 和确定取消语义的自定义取色器。

**Architecture:** 颜色转换保持在纯函数模块中，`ColorPicker` 只管理一次打开期间的草稿颜色和交互，`AnnotationToolbar` 负责把确认后的颜色交给现有 `onColor` 回调。颜色仍由 `ViewerShell` 保存，并在创建新二维 `Drawing` 时读取，因此不改后端数据格式和已有标注。

**Tech Stack:** React 19、TypeScript、CSS、Vitest、Testing Library、现有 Vite 前端工程。

---

## 文件边界

- Create: `front/src/features/viewer/annotations/colorUtils.ts` — HEX、RGB、HSV 转换、规范化和输入校验。
- Test: `front/src/features/viewer/annotations/colorUtils.test.ts` — 颜色转换和边界行为。
- Create: `front/src/features/viewer/annotations/ColorPicker.tsx` — 草稿取色面板、色谱、色相条、RGB/HEX 输入、预览和提交/取消。
- Test: `front/src/features/viewer/annotations/ColorPicker.test.tsx` — 面板交互和无副作用取消。
- Modify: `front/src/features/viewer/annotations/AnnotationToolbar.tsx` — 打开自定义取色器，保留快捷色块立即生效。
- Modify: `front/src/features/viewer/annotations/annotations.css` — 参考截图风格的面板、渐变、输入和窄屏规则。
- Test: `front/src/features/viewer/annotations/AnnotationToolbar.test.tsx` — 工具栏接入和快捷色块回归。

### Task 1: 先建立颜色转换的失败测试

**Files:**
- Create: `front/src/features/viewer/annotations/colorUtils.test.ts`
- Create: `front/src/features/viewer/annotations/colorUtils.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, test } from 'vitest'
import { hexToRgb, hsvToRgb, normalizeHex, rgbToHex, rgbToHsv } from './colorUtils'

describe('color conversion', () => {
  test('normalizes six-digit HEX values and rejects invalid values', () => {
    expect(normalizeHex(' ff00AA ')).toBe('#ff00aa')
    expect(normalizeHex('#123456')).toBe('#123456')
    expect(normalizeHex('#12ab')).toBeNull()
    expect(normalizeHex('gggggg')).toBeNull()
  })

  test('converts HEX and RGB in both directions', () => {
    expect(hexToRgb('#ff8000')).toEqual({ r: 255, g: 128, b: 0 })
    expect(rgbToHex({ r: 255, g: 128, b: 0 })).toBe('#ff8000')
  })

  test('round-trips a hue, saturation and value color', () => {
    const hsv = rgbToHsv({ r: 25, g: 100, b: 200 })
    expect(hsvToRgb(hsv)).toEqual({ r: 25, g: 100, b: 200 })
  })

  test('clamps RGB channel values before encoding', () => {
    expect(rgbToHex({ r: -1, g: 260, b: 12.6 })).toBe('#00ff0d')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails for the intended reason**

Run: `pnpm --dir front exec vitest run src/features/viewer/annotations/colorUtils.test.ts`

Expected: FAIL because `colorUtils.ts` and its exported conversion functions do not exist yet.

- [ ] **Step 3: Implement the minimal conversion module**

Implement these exact exports in `colorUtils.ts`:

```ts
export interface Rgb { r: number; g: number; b: number }
export interface Hsv { h: number; s: number; v: number }

export function normalizeHex(value: string): string | null
export function hexToRgb(value: string): Rgb | null
export function rgbToHex(value: Rgb): string
export function rgbToHsv(value: Rgb): Hsv
export function hsvToRgb(value: Hsv): Rgb
```

`normalizeHex` trims whitespace, removes one optional `#`, accepts exactly six hexadecimal digits, and returns lowercase `#rrggbb` or `null`. RGB conversion rounds channels to integers and clamps each channel to 0–255. HSV uses hue degrees 0–360 and saturation/value in 0–1.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --dir front exec vitest run src/features/viewer/annotations/colorUtils.test.ts`

Expected: PASS with all color conversion tests green.

- [ ] **Step 5: Commit the focused utility change**

```bash
git add front/src/features/viewer/annotations/colorUtils.ts front/src/features/viewer/annotations/colorUtils.test.ts
git commit -m "test: define annotation color conversion behavior"
```

### Task 2: Build the取色面板 through component tests

**Files:**
- Create: `front/src/features/viewer/annotations/ColorPicker.test.tsx`
- Create: `front/src/features/viewer/annotations/ColorPicker.tsx`

- [ ] **Step 1: Write the failing component tests**

Cover these behaviors with Testing Library: the panel starts from `#ff0000`, RGB edits update HEX, valid HEX edits update RGB, invalid HEX disables confirm, cancel/`Escape` does not call `onCommit`, and confirm calls `onCommit('#00ff80')` once.

The test setup must render the component with `value="#ff0000"`, `onCommit={vi.fn()}`, and `onCancel={vi.fn()}`; query controls by their labels (`红色(R)`, `绿色(G)`, `蓝色(B)`, `HEX`, `确定`, `取消`). Use `fireEvent.change` for text inputs and `fireEvent.click`/`fireEvent.keyDown` for actions.

- [ ] **Step 2: Run the focused test and confirm the expected failure**

Run: `pnpm --dir front exec vitest run src/features/viewer/annotations/ColorPicker.test.tsx`

Expected: FAIL because `ColorPicker.tsx` does not exist and the requested controls are not rendered.

- [ ] **Step 3: Implement the minimal controlled panel**

Implement `ColorPicker` with this public contract:

```ts
export function ColorPicker({
  value,
  onCommit,
  onCancel,
}: {
  value: string
  onCommit(value: string): void
  onCancel(): void
}): JSX.Element
```

On mount, normalize `value`, derive RGB/HSV, and store the normalized color as both `currentColor` and `draftColor`. Update all representations together when a valid RGB/HEX/color-surface/hue value changes. Keep the raw HEX text while it is being edited and expose `aria-invalid` plus an error message when it is not a valid six-digit HEX value. Clamp RGB on blur. Confirm only when the draft is valid; call `onCommit` with lowercase six-digit HEX, then let the parent close the panel. Cancel and `Escape` call only `onCancel`.

Render a `role="dialog"` with `aria-modal="false"` and `aria-label="自定义颜色"`; use a color-surface element with `role="slider"` for saturation/value and a second slider for hue. Give both sliders keyboard arrow handling and CSS gradients. Render the two preview swatches with labels `新增` and `当前`.

- [ ] **Step 4: Run the focused test to verify the component passes**

Run: `pnpm --dir front exec vitest run src/features/viewer/annotations/ColorPicker.test.tsx`

Expected: PASS with all component behaviors green.

- [ ] **Step 5: Commit the standalone picker**

```bash
git add front/src/features/viewer/annotations/ColorPicker.tsx front/src/features/viewer/annotations/ColorPicker.test.tsx
git commit -m "feat: add custom annotation color picker"
```

### Task 3: Integrate the picker into the annotation toolbar

**Files:**
- Create: `front/src/features/viewer/annotations/AnnotationToolbar.test.tsx`
- Modify: `front/src/features/viewer/annotations/AnnotationToolbar.tsx`
- Modify: `front/src/features/viewer/annotations/annotations.css`

- [ ] **Step 1: Write the failing toolbar integration tests**

Render `AnnotationToolbar` in `mode="2d"` with `color="#ff0000"` and no-op handlers. Assert that clicking `调色` opens `自定义颜色`, clicking the fixed `颜色 #13b019` button calls `onColor('#13b019')` immediately, and confirming a custom `00ff80` color calls `onColor('#00ff80')`. Assert that closing with `取消` leaves the parent callback untouched.

- [ ] **Step 2: Run the integration test to confirm it fails**

Run: `pnpm --dir front exec vitest run src/features/viewer/annotations/AnnotationToolbar.test.tsx`

Expected: FAIL because the toolbar currently has no custom picker dialog and `调色` only selects the fixed-color panel.

- [ ] **Step 3: Wire the component without changing existing drawing data flow**

Add a boolean `colorPickerOpen` state. Make `调色` set that state to true; keep the fixed palette buttons calling `onColor` directly. Replace the native `input type="color"` interaction with a button that displays the current custom color and opens `ColorPicker`. On picker commit, call `onColor(value)` and close; on cancel, only close. Keep the tools panel and all 3D controls unchanged.

- [ ] **Step 4: Add the reference-style and responsive CSS**

Add styles under `.annotation-color-picker` for a white rounded panel with shadow, a 352px-by-150px saturation/value gradient, a 16px-by-150px vertical hue gradient, labeled RGB/HEX rows, preview swatches, and blue `确定`/neutral `取消` buttons. Set the popup above the toolbar when necessary with `position: absolute`, and under `@media (max-width: 520px)` use `width: min(100vw - 24px, 390px)` and reduce the surface to fit without horizontal overflow.

- [ ] **Step 5: Run the integration test to verify it passes**

Run: `pnpm --dir front exec vitest run src/features/viewer/annotations/AnnotationToolbar.test.tsx`

Expected: PASS with custom picker and fixed palette behavior green.

- [ ] **Step 6: Commit the toolbar integration**

```bash
git add front/src/features/viewer/annotations/AnnotationToolbar.tsx front/src/features/viewer/annotations/AnnotationToolbar.test.tsx front/src/features/viewer/annotations/annotations.css
git commit -m "feat: integrate annotation color picker"
```

### Task 4: Verify the full frontend behavior

**Files:**
- Test: `front/src/features/viewer/annotations/colorUtils.test.ts`
- Test: `front/src/features/viewer/annotations/ColorPicker.test.tsx`
- Test: `front/src/features/viewer/annotations/AnnotationToolbar.test.tsx`
- Test: `front/src/features/viewer/ViewerShell.test.tsx`

- [ ] **Step 1: Run the complete frontend unit suite**

Run: `pnpm --dir front test`

Expected: all existing and new tests pass with no test failures.

- [ ] **Step 2: Run type checking and linting**

Run: `pnpm --dir front typecheck; pnpm --dir front lint`

Expected: TypeScript exits 0 and ESLint reports no new errors.

- [ ] **Step 3: Run the production build**

Run: `pnpm --dir front build`

Expected: TypeScript and Vite build both exit 0 and produce the normal `front/dist` output.

- [ ] **Step 4: Review the final diff and commit verification if needed**

Run: `git diff HEAD~3 -- front/src/features/viewer/annotations front/src/features/viewer/ViewerShell.tsx` and `git status --short`.

Confirm the diff only changes二维标注取色器相关文件 and that existing user changes outside this feature remain untouched.

