# Interactive Three.js Fallback Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the non-interactive CSS lung illustration with a procedural Three.js lung model that remains draggable when the manifest has no usable external assets.

**Architecture:** `ViewerEngine` will always own the canvas in the no-asset state and will add a small grouped procedural lung model to its scene. The existing `OrbitControls` will provide mouse drag, wheel zoom, and pan; the React fallback overlay will be removed so all pointer input reaches the canvas.

**Tech Stack:** React 19, TypeScript, Three.js `0.185`, Vitest, Testing Library, Vite.

---

### Task 1: Lock the fallback rendering contract with tests

**Files:**
- Create: `front/packages/rendering-core/src/fallback/ProceduralLungModel.test.ts`
- Modify: `front/packages/rendering-core/src/ViewerEngine.test.ts`

- [x] **Step 1: Add a failing procedural-model test** asserting the factory returns a named `Group` containing visible meshes for the trachea and both lungs.
- [x] **Step 2: Add a failing engine test** asserting `ViewerEngine.load()` with an empty layer list adds a visible fallback group and `reset()` remains callable.
- [x] **Step 3: Run the focused tests** with `pnpm vitest run packages/rendering-core/src/fallback/ProceduralLungModel.test.ts packages/rendering-core/src/ViewerEngine.test.ts`; confirm failure is caused by the missing fallback implementation, not test setup.

### Task 2: Implement the procedural Three.js lung model

**Files:**
- Create: `front/packages/rendering-core/src/fallback/ProceduralLungModel.ts`
- Modify: `front/packages/rendering-core/src/index.ts`

- [x] **Step 1:** Export `createProceduralLungModel(): Group` that builds a lightweight lung pair from Three.js primitives, assigns stable names, uses transparent colored materials, and adds a trachea plus segment/vessel accents.
- [x] **Step 2:** Keep the fallback visual-only: no measurement metadata, no external requests, and no medical geometry claims.
- [x] **Step 3:** Dispose geometry and materials through the existing `ResourceDisposer` path when the scene is cleared.
- [x] **Step 4:** Re-run the procedural-model test and confirm it passes.

### Task 3: Make `ViewerEngine` own the interactive fallback

**Files:**
- Modify: `front/packages/rendering-core/src/ViewerEngine.ts`
- Modify: `front/src/features/viewer/ViewerCanvas.tsx`

- [x] **Step 1:** Add a private fallback group field and a `load()` branch that inserts it when no layer is ready after asset loading, including the empty-manifest case.
- [x] **Step 2:** Include the fallback group in `fitToVisibleLayers()` so the camera frames it and `reset()` restores a useful view.
- [x] **Step 3:** Remove the CSS `anatomy-demo` overlay and its failure-state rendering from `ViewerCanvas`; keep only the canvas and engine error state needed for actual WebGL initialization failures.
- [x] **Step 4:** Preserve canvas `touch-action: none`, `OrbitControls`, auto-rotate, background, and visibility APIs so drag input is handled by Three.js.
- [x] **Step 5:** Run the engine and viewer tests and confirm the empty-manifest case no longer renders the CSS fallback.

### Task 4: Verify the full frontend

**Files:**
- Modify only if verification exposes a regression in the touched code.

- [x] **Step 1:** Run `pnpm typecheck` from `front`.
- [x] **Step 2:** Run `pnpm lint` from `front`.
- [x] **Step 3:** Run `pnpm test` from `front`.
- [x] **Step 4:** Run `pnpm build` from `front`.
- [x] **Step 5:** Inspect `git diff` and confirm the static CSS fallback was removed while the existing viewer shell and CT preview remain unchanged.
