# 三维测量工具 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing 3D length and diameter toolbar actions create visible two-point measurements with endpoints, lines, and millimetre labels, while making new/undo/clear/close work correctly.

**Architecture:** Keep the current `InteractiveTools` and `ToolRecords` pipeline. Route measurement toolbar commands through `ViewerShell` into `ViewerEngine`, keep anchors in model-local coordinates, and add the missing overlay styles/classes so the already projected labels are visible above the canvas.

**Tech Stack:** React 19, TypeScript, Three.js, Vitest, Testing Library, Playwright, Vite.

---

## File map

- Modify `front/src/features/viewer/ViewerShell.tsx`: route `new`, `undo`, and `clear` toolbar commands to the engine while preserving the existing move-layer undo path.
- Modify `front/packages/rendering-core/src/tools/InteractiveTools.ts`: give measurement labels an explicit measurement class/data attribute and keep measurement overlay behavior distinct from annotation labels.
- Modify `front/src/styles/global.css`: style projected measurement labels so they are positioned above the canvas, readable, and non-interactive.
- Modify `front/packages/rendering-core/src/tools/ToolRecords.test.ts`: add regression coverage for diameter records and per-tool clearing/undo behavior.
- Modify `front/packages/rendering-core/src/tools/InteractiveTools.test.ts`: add regression coverage for real two-point length/diameter picking, background rejection, and hidden/clipped hit rejection.
- Modify `front/src/features/viewer/ViewerShell.test.tsx`: prove measurement toolbar commands reach the engine and that length/diameter buttons become active.
- Create `front/tests/e2e/measurement-tools.spec.ts`: exercise the real loaded viewer and assert visible measurement labels after two model clicks, plus the toolbar commands.

### Task 1: Lock down the record and picking behavior

**Files:**
- Modify: `front/packages/rendering-core/src/tools/ToolRecords.test.ts`
- Modify: `front/packages/rendering-core/src/tools/InteractiveTools.test.ts`
- Test command: `front/packages/rendering-core/src/tools/ToolRecords.test.ts`, `front/packages/rendering-core/src/tools/InteractiveTools.test.ts`

- [ ] **Step 1: Add the failing record regression tests**

Extend the existing tests with these behaviors:

```ts
test('diameter commits a two-point record with a millimetre label', () => {
  const records = new ToolRecords()
  records.add('diameter', point(-2, 0))
  records.add('diameter', point(2, 0))
  expect(records.items).toHaveLength(1)
  expect(records.items[0]).toMatchObject({ tool: 'diameter', label: '4.00 mm' })
})

test('clearing a measurement tool leaves other measurement types and annotations intact', () => {
  const records = new ToolRecords()
  records.add('length', point(0, 0))
  records.add('length', point(3, 4))
  records.add('diameter', point(0, 0))
  records.add('diameter', point(2, 0))
  records.add('annotation', point(1, 1), '保留')

  records.clear('length')

  expect(records.items.map(item => item.tool)).toEqual(['diameter', 'annotation'])
  records.undo()
  expect(records.items.map(item => item.tool)).toEqual(['length', 'diameter', 'annotation'])
})
```

In `InteractiveTools.test.ts`, add a pointer helper that accepts coordinates and a test fixture that activates `length`:

```ts
test('two model clicks create a visible length record', () => {
  const f = fixture()
  f.tools.activate('length')
  f.pointerAt('pointerdown', 92, 100)
  f.pointerAt('pointerup', 92, 100)
  f.pointerAt('pointerdown', 108, 100)
  f.pointerAt('pointerup', 108, 100)

  expect(f.tools.records.items).toHaveLength(1)
  expect(f.tools.records.items[0].tool).toBe('length')
  expect(f.tools.records.items[0].label).toMatch(/mm$/)
  expect(f.tools.overlay.children.length).toBeGreaterThanOrEqual(3)
  f.dispose()
})

test('background, hidden, and clipped hits do not create a measurement point', () => {
  const f = fixture({ clipped: () => true })
  f.tools.activate('diameter')
  f.pointerAt('pointerdown', 5, 5)
  f.pointerAt('pointerup', 5, 5)
  expect(f.tools.records.pending).toHaveLength(0)
  f.dispose()
})
```

Adapt the existing fixture only by making its pointer helper accept `x`, `y`, and a configurable `clipped` callback; do not remove the existing touch double-tap tests.

- [ ] **Step 2: Run the focused tests and verify the correct failure**

Run from `D:\3Dimage`:

```powershell
pnpm --dir front exec vitest run packages/rendering-core/src/tools/ToolRecords.test.ts packages/rendering-core/src/tools/InteractiveTools.test.ts
```

Expected: the record tests pass against the existing core behavior, while the new picking test initially fails only if the fixture/helper exposes a setup issue. If it passes immediately, retain it as a regression test and use the later UI command test as the required red test for the missing behavior; do not change production code in this task.

- [ ] **Step 3: Make only the minimal core changes required by the failing test**

If the pointer regression exposes a real defect, fix the smallest affected method in `front/packages/rendering-core/src/tools/InteractiveTools.ts`. Preserve these invariants: save hit points in layer-local coordinates, reject invisible/clipped hits before `records.add`, and call `refresh()` after every accepted or rejected interaction so the status event is current.

- [ ] **Step 4: Re-run the focused core tests**

Run the same Vitest command. Expected output: all tests in both files pass with no unhandled errors.

- [ ] **Step 5: Commit only the core test/fix files if they changed**

Review `git diff -- front/packages/rendering-core/src/tools/ToolRecords.test.ts front/packages/rendering-core/src/tools/InteractiveTools.test.ts front/packages/rendering-core/src/tools/InteractiveTools.ts`, then stage only those paths and commit:

```powershell
git add -- front/packages/rendering-core/src/tools/ToolRecords.test.ts front/packages/rendering-core/src/tools/InteractiveTools.test.ts front/packages/rendering-core/src/tools/InteractiveTools.ts
git commit -m "test: cover 3d measurement picking"
```

If no production core file changed, commit only the test paths.

### Task 2: Route measurement toolbar commands

**Files:**
- Modify: `front/src/features/viewer/ViewerShell.tsx`
- Modify: `front/src/features/viewer/ViewerShell.test.tsx`

- [ ] **Step 1: Add a failing UI test for command routing and active tool switching**

Import `ViewerEngine` and `vi` in the test, spy on `ViewerEngine.prototype.toolCommand`, render the existing manifest, then assert:

```tsx
test('routes measurement commands to the active engine tool', () => {
  const command = vi.spyOn(ViewerEngine.prototype, 'toolCommand').mockImplementation(() => {})
  render(<ViewerShell manifest={manifest} />)
  fireEvent.click(screen.getByRole('button', { name: '测量' }))
  fireEvent.click(screen.getByRole('button', { name: '长度' }))
  expect(screen.getByRole('button', { name: '长度' })).toHaveClass('is-active')
  fireEvent.click(screen.getByRole('button', { name: '新建' }))
  fireEvent.click(screen.getByRole('button', { name: '撤销' }))
  fireEvent.click(screen.getByRole('button', { name: '清空' }))
  expect(command).toHaveBeenNthCalledWith(1, 'new')
  expect(command).toHaveBeenNthCalledWith(2, 'undo')
  expect(command).toHaveBeenNthCalledWith(3, 'clear')
  command.mockRestore()
})
```

Add a second assertion in the same test or a separate test that clicking `直径` changes the active class from `长度` to `直径`. Keep the existing toolbar visibility test unchanged.

- [ ] **Step 2: Run the new test and confirm it fails for the missing route**

Run:

```powershell
pnpm --dir front exec vitest run src/features/viewer/ViewerShell.test.tsx -t "routes measurement commands"
```

Expected: FAIL because `ViewerShell.action()` currently ignores `new`, `undo`, and `clear` unless the active tool is `moveLayer`.

- [ ] **Step 3: Implement the minimal command routing**

In `ViewerShell.action`, keep the existing close branch and move-layer special case, then add the measurement/annotation command path before the `item.tool` branch:

```ts
if (item.command === 'undo' && activeTool === 'moveLayer') {
  engineRef.current?.toolCommand('undo')
  return
}
if (item.command === 'new' || item.command === 'undo' || item.command === 'clear') {
  engineRef.current?.toolCommand(item.command)
  return
}
```

Do not route `close`, `plan`, `reset`, or `view` through `toolCommand`.

- [ ] **Step 4: Run the focused UI test and the nearby shell tests**

Run:

```powershell
pnpm --dir front exec vitest run src/features/viewer/ViewerShell.test.tsx
```

Expected: all ViewerShell tests pass, including the new command-routing regression.

- [ ] **Step 5: Commit the routing change**

Review the diff because `ViewerShell.tsx` already contains unrelated working-tree changes. Stage only the intentional hunks in `ViewerShell.tsx` and the test file, then commit:

```powershell
git add -- front/src/features/viewer/ViewerShell.tsx front/src/features/viewer/ViewerShell.test.tsx
git commit -m "fix: route measurement toolbar commands"
```

### Task 3: Make projected measurement labels visible

**Files:**
- Modify: `front/packages/rendering-core/src/tools/InteractiveTools.ts`
- Modify: `front/src/styles/global.css`

- [ ] **Step 1: Add the explicit measurement label class/data contract**

In `InteractiveTools.refresh()`, create measurement labels with a stable class and tool marker before the annotation-specific branch:

```ts
const isAnnotation = record.tool === 'annotation'
element.className = isAnnotation ? 'model-tool-label model-annotation-label' : 'model-tool-label model-measurement-label'
if (!isAnnotation) element.dataset.measurementTool = record.tool
element.textContent = record.label
```

Keep the existing annotation drag/select behavior unchanged and remove the later unconditional `element.className = 'model-tool-label'` assignment so it does not overwrite the measurement class.

- [ ] **Step 2: Add the overlay styles**

Append focused rules to `front/src/styles/global.css`:

```css
.model-tool-label {
  position: absolute;
  z-index: 5;
  pointer-events: none;
  transform: translate(-50%, -50%);
  white-space: nowrap;
  font: 600 13px/1.2 Arial, sans-serif;
}
.model-measurement-label {
  padding: 3px 7px;
  border: 1px solid #ffd166;
  border-radius: 4px;
  color: #111;
  background: rgb(255 236 150 / 94%);
  box-shadow: 0 1px 3px rgb(0 0 0 / 28%);
}
```

The existing `.viewer-stage`/`.viewer-canvas-wrap` positioning keeps `left` and `top` relative to the canvas. Do not add pointer events to measurement labels; clicks must continue to reach the canvas.

- [ ] **Step 3: Add a DOM overlay regression assertion**

In `InteractiveTools.test.ts`, after the two accepted clicks, assert that the canvas parent contains `.model-measurement-label` with text matching the record label. This must be a real DOM assertion against `f.tools.overlay`/canvas parent, not a mocked renderer assertion.

- [ ] **Step 4: Run core tests and typecheck**

Run:

```powershell
pnpm --dir front exec vitest run packages/rendering-core/src/tools/InteractiveTools.test.ts
pnpm --dir front run typecheck
```

Expected: both commands pass without TypeScript errors.

- [ ] **Step 5: Commit only the overlay changes**

Inspect the diff for the existing CSS modifications before staging. Commit only the intentional label class/style changes:

```powershell
git add -- front/packages/rendering-core/src/tools/InteractiveTools.ts front/src/styles/global.css front/packages/rendering-core/src/tools/InteractiveTools.test.ts
git commit -m "fix: show 3d measurement labels"
```

### Task 4: Verify the real viewer flow in a browser

**Files:**
- Create: `front/tests/e2e/measurement-tools.spec.ts`

- [ ] **Step 1: Add the failing end-to-end scenario**

Use the existing public Blender viewer setup from `blender-entry.spec.ts` and write a focused test:

```ts
import { expect, test } from '@playwright/test'

test('length and diameter measurements show endpoints, line, and value', async ({ page }) => {
  test.setTimeout(300_000)
  await page.goto('/share/viewer')
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('viewer-canvas')).toHaveAttribute('data-load-state', 'ready')

  await page.getByRole('button', { name: '测量', exact: true }).click()
  const canvas = page.getByTestId('viewer-canvas')
  const bounds = (await canvas.boundingBox())!

  await page.getByRole('button', { name: '长度', exact: true }).click()
  await page.mouse.click(bounds.x + bounds.width * .45, bounds.y + bounds.height * .50)
  await page.mouse.click(bounds.x + bounds.width * .55, bounds.y + bounds.height * .50)
  await expect(page.locator('.model-measurement-label[data-measurement-tool="length"]')).toBeVisible()
  await expect(page.locator('.model-measurement-label[data-measurement-tool="length"]')).toHaveText(/mm$/)

  await page.getByRole('button', { name: '新建', exact: true }).click()
  await page.getByRole('button', { name: '直径', exact: true }).click()
  await page.mouse.click(bounds.x + bounds.width * .43, bounds.y + bounds.height * .58)
  await page.mouse.click(bounds.x + bounds.width * .57, bounds.y + bounds.height * .58)
  await expect(page.locator('.model-measurement-label[data-measurement-tool="diameter"]')).toBeVisible()
  await expect(page.locator('.model-measurement-label[data-measurement-tool="diameter"]')).toHaveText(/mm$/)
})
```

If a chosen coordinate lands on background for the real fixture, keep the test deterministic by probing the same small set of model-relative points used by the existing Blender annotation test until a label appears; do not weaken the assertion to merely checking the toolbar.

- [ ] **Step 2: Run the focused browser test and inspect failures**

Start the project in the repository's existing way, then run:

```powershell
pnpm --dir front run test:e2e -- measurement-tools.spec.ts --project=desktop-chrome
```

Expected: the test passes and finds both labelled measurement records. If it fails, inspect the Playwright trace/screenshot and correct only hit coordinates or measurement overlay logic, not the acceptance assertion.

- [ ] **Step 3: Add command behavior checks to the browser test**

After a completed measurement, click `撤销` and assert that the corresponding measurement label disappears; create another measurement, click `清空`, and assert no `.model-measurement-label` remains. Click `关闭`, then assert the measurement toolbar is gone and the canvas remains visible.

- [ ] **Step 4: Re-run the browser test on desktop and mobile**

Run:

```powershell
pnpm --dir front run test:e2e -- measurement-tools.spec.ts --project=desktop-chrome --project=mobile-chrome --project=mobile-safari
```

Expected: all three projects pass, including touch pointer input and label visibility.

- [ ] **Step 5: Commit the end-to-end coverage**

```powershell
git add -- front/tests/e2e/measurement-tools.spec.ts
git commit -m "test: verify 3d measurement workflow"
```

### Task 5: Full verification and handoff

**Files:**
- No new files; verify the files changed above.

- [ ] **Step 1: Run the full frontend unit suite**

```powershell
pnpm --dir front test
```

Expected: all Vitest tests pass with no unhandled errors.

- [ ] **Step 2: Run lint, typecheck, and production build**

```powershell
pnpm --dir front run lint
pnpm --dir front run typecheck
pnpm --dir front run build
```

Expected: all three commands exit successfully.

- [ ] **Step 3: Review the final diff and worktree**

```powershell
git diff HEAD~4..HEAD --stat
git status --short
```

Confirm the final commits contain only the measurement design/implementation/test files and that all pre-existing unrelated modifications remain intact.

- [ ] **Step 4: Report evidence**

Summarize the implemented interaction, list the exact verification commands that passed, and call out any browser environment limitation instead of claiming an unrun test passed.
