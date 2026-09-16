# Area Measurement Guidance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the hidden “完成” step of 3D area measurement discoverable without adding a permanent visual element.

**Architecture:** Add a hint string to the area toolbar action. `ContextToolbar` renders a fixed-position tooltip only while that action is hovered or focused, so the existing horizontally scrolling toolbar does not clip it. `ViewerShell` shows a temporary status hint after entering area mode, covering touch devices that have no hover state.

**Tech Stack:** React, TypeScript, CSS, Vitest, Testing Library.

---

### Task 1: Add the area action hint contract and tooltip behavior

**Files:**
- Modify: `front/src/features/viewer/toolbarDefinitions.ts`
- Modify: `front/src/features/viewer/ContextToolbar.tsx`
- Test: `front/src/features/viewer/ViewerShell.test.tsx`

- [ ] **Step 1: Write the failing test**

Add assertions to the measurement toolbar test that the area action exposes the exact instructional tooltip, and add a test that it is hidden before hover and visible after pointer entry.

- [ ] **Step 2: Run the focused test and verify it fails**

Run `npm test -- --run src/features/viewer/ViewerShell.test.tsx` from `front/`.

Expected failure: no element with role `tooltip` and the area instruction exists.

- [ ] **Step 3: Implement the minimal tooltip**

Extend `ToolbarAction` with `hint?: string`, set the area action hint to `面积测量：在模型表面点击至少 3 个点，完成后点击“完成”生成面积`, and have `ContextToolbar` track one hovered/focused hint with the button's viewport position. Render the tooltip outside the scrolling nav with `role="tooltip"`, `aria-describedby`, and mouse/focus enter/leave handlers. Only the area action receives a hint.

- [ ] **Step 4: Run the focused test and verify it passes**

Run `npm test -- --run src/features/viewer/ViewerShell.test.tsx` and confirm the new tooltip assertions pass with the existing tests.

- [ ] **Step 5: Commit the isolated change**

Run `git add front/src/features/viewer/toolbarDefinitions.ts front/src/features/viewer/ContextToolbar.tsx front/src/features/viewer/ViewerShell.test.tsx && git commit -m "feat: explain area measurement completion"`.

### Task 2: Show a temporary hint after entering area mode

**Files:**
- Modify: `front/src/features/viewer/ViewerShell.tsx`
- Modify: `front/src/styles/global.css`
- Test: `front/src/features/viewer/ViewerShell.test.tsx`

- [ ] **Step 1: Write the failing test**

Click `测量`, then `面积`, and assert a live status message with `请在模型表面点击至少 3 个点，然后点击“完成”` is visible. Assert it is not rendered in the initial browse view.

- [ ] **Step 2: Run the focused test and verify it fails**

Run `npm test -- --run src/features/viewer/ViewerShell.test.tsx` from `front/`.

Expected failure: the status message is not present after selecting area.

- [ ] **Step 3: Implement the transient status**

Add a timer-backed boolean in `ViewerShell`, show the status only after the `closedArea` toolbar action is selected, clear it when another tool or close action is selected, and clean up the timer on unmount. Render it near the top of the model stage with `role="status"` and `aria-live="polite"`; style it as a subtle non-blocking banner.

- [ ] **Step 4: Run focused tests and verify they pass**

Run `npm test -- --run src/features/viewer/ViewerShell.test.tsx` and confirm all tests pass.

- [ ] **Step 5: Commit the isolated change**

Run `git add front/src/features/viewer/ViewerShell.tsx front/src/styles/global.css front/src/features/viewer/ViewerShell.test.tsx && git commit -m "feat: show area measurement guidance"`.

### Task 3: Verify the complete front-end change

**Files:**
- No additional files.

- [ ] **Step 1: Run all front-end unit tests**

Run `npm test` from `front/`; expected result is zero failed test files and zero failed tests.

- [ ] **Step 2: Run type checking, lint, and production build**

Run `npm run typecheck`, `npm run lint`, and `npm run build` from `front/`; each command must exit with code 0.

- [ ] **Step 3: Inspect the final diff**

Run `git diff HEAD~2..HEAD --stat` and `git status --short`; confirm only the area guidance feature and its tests/docs are changed and no generated artifacts are present.
