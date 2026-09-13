# Reference Viewer Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing React viewer into a local demo that reproduces the observable Image3D viewer shell and interactions while keeping the current Three.js engine.

**Architecture:** The React shell owns the site header, model/download tabs, contextual toolbars, view menu, responsive panel layout, and layer strip. The existing rendering core remains responsible for the WebGL canvas. A self-contained CT preview provides a non-patient demo surface for the desktop lower pane; it is hidden on narrow mobile viewports.

**Tech Stack:** React 19, TypeScript, Three.js, CSS, Vitest, Testing Library, Vite.

---

### Task 1: Define the demo interaction contract

**Files:**
- Modify: `front/src/features/viewer/ViewerShell.test.tsx`

- [x] **Step 1: Add failing tests** for the site header, model/download tabs, view menu selection, and desktop CT preview.
- [x] **Step 2: Run the focused test and confirm it fails because the new controls are absent.**

### Task 2: Implement the local viewer shell

**Files:**
- Create: `front/src/features/viewer/CtPreview.tsx`
- Modify: `front/src/features/viewer/ViewerShell.tsx`
- Modify: `front/src/features/viewer/ContextToolbar.tsx`
- Modify: `front/src/features/viewer/toolbarDefinitions.ts`

- [x] **Step 1:** Add local state for active tab, active view, and the view menu.
- [x] **Step 2:** Render the website header, tabs, contextual toolbar, model canvas, CT demo, and download panel.
- [x] **Step 3:** Make view options keyboard/touch accessible and keep the selected option visible.
- [x] **Step 4:** Keep all existing layer, plan, measurement, and canvas commands wired to the existing engine.

### Task 3: Match responsive presentation

**Files:**
- Modify: `front/src/styles/global.css`

- [x] **Step 1:** Style the website-only header and reference-like light toolbar controls.
- [x] **Step 2:** Add the desktop stacked 3D/CT layout and hide the CT pane below the mobile breakpoint.
- [x] **Step 3:** Preserve safe-area handling, touch targets, horizontal tool/layer scrolling, and no body scrolling.

### Task 4: Verify the demo

- [x] **Step 1:** Run the focused ViewerShell tests.
- [x] **Step 2:** Run frontend lint, typecheck, unit tests, and production build.
- [x] **Step 3:** Report the remaining limitation: CT and model visuals are demo surfaces until authorized model/CT assets are supplied.
