# Default Front Camera Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make initial model loading and reset restore the same centered, upright front view shown in the reference screenshot.

**Architecture:** Keep camera framing inside `ViewerEngine`. Extend the existing bounds-based fit operation so it always restores the canonical front direction and world-up orientation; both `load()` and `reset()` already share this operation.

**Tech Stack:** TypeScript, Three.js, Vitest

---

### Task 1: Lock the default camera contract with a regression test

**Files:**
- Modify: `front/packages/rendering-core/src/ViewerEngine.test.ts`

- [ ] **Step 1: Write the failing test**

Capture the camera supplied to the mocked `OrbitControls`, load the fallback model, change to the top view, reset, and assert that the camera is again on the positive Z axis relative to the target with `up = (0, 1, 0)`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- packages/rendering-core/src/ViewerEngine.test.ts`

Expected: FAIL because reset leaves the top-view camera up vector in place.

### Task 2: Restore the canonical front camera during fitting

**Files:**
- Modify: `front/packages/rendering-core/src/ViewerEngine.ts`

- [ ] **Step 1: Write minimal implementation**

In `fitToVisibleLayers()`, set the camera up vector to `(0, 1, 0)`, position it at the bounds center plus positive Z distance, call `lookAt(center)`, and update controls. This single path applies to both initial loading and reset.

- [ ] **Step 2: Run focused test to verify it passes**

Run: `npm test -- packages/rendering-core/src/ViewerEngine.test.ts`

Expected: PASS.

- [ ] **Step 3: Run frontend verification**

Run: `npm test && npm run typecheck && npm run build`

Expected: all commands exit successfully.
