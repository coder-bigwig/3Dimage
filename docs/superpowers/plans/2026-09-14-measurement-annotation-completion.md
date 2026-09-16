# Measurement and Annotation Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Deliver and verify the existing local measurement tools and persisted 2D/3D annotation workflow, while keeping Send disabled and removing generated verification artifacts.

**Architecture:** Keep measurements in the viewer's ToolRecords/InteractiveTools session state, with model-local anchors and projected labels. Keep annotations in the existing versioned shared-viewer annotation document API, using the current SVG drawing layer and Three.js label projection. Do not add a Send endpoint or expand the permission model.

**Tech Stack:** React, TypeScript, Three.js, Vitest, Playwright, Spring Boot, MyBatis, PostgreSQL, Flyway, Docker Compose.

---

### Task 1: Establish a clean verification baseline

**Files:**
- Read: docs/superpowers/specs/2026-09-14-measurement-annotation-completion-design.md
- Read: front/packages/rendering-core/src/tools/ToolRecords.test.ts
- Read: front/packages/rendering-core/src/tools/InteractiveTools.test.ts
- Read: front/tests/e2e/measurement-tools.spec.ts
- Read: front/tests/e2e/annotations.spec.ts
- Read: backend/src/test/java/com/medical3d/viewer/modules/annotation/AnnotationDocumentTest.java
- Read: backend/src/test/java/com/medical3d/viewer/modules/annotation/AnnotationIntegrationTest.java

- [ ] **Step 1: Record the current worktree boundary**

Run:

~~~
git status --short
git diff --name-only
git ls-files --others --exclude-standard
~~~

Expected: existing feature files are listed as worktree changes; no unrelated files are staged.

- [ ] **Step 2: Run the focused frontend tests before changing code**

Run:

~~~
npm test -- ToolRecords.test.ts InteractiveTools.test.ts
~~~

Expected: the command reports the current measurement/interaction baseline. If it fails, use the failure as the first red test and fix the implementation without weakening the assertion.

- [ ] **Step 3: Run the existing backend annotation tests**

Run from the repository root:

~~~
.\mvnw.cmd -pl backend test -Dtest=AnnotationDocumentTest,AnnotationIntegrationTest
~~~

Expected: backend annotation unit and integration tests pass against the configured test database, or the missing environment is recorded as a verification blocker rather than hidden.

### Task 2: Complete and test all four measurement tools

**Files:**
- Modify: front/tests/e2e/measurement-tools.spec.ts
- Modify only if a failing test requires it: front/packages/rendering-core/src/tools/ToolRecords.ts
- Modify only if a failing test requires it: front/packages/rendering-core/src/tools/InteractiveTools.ts
- Test: front/packages/rendering-core/src/tools/ToolRecords.test.ts
- Test: front/packages/rendering-core/src/tools/InteractiveTools.test.ts

- [ ] **Step 1: Add a failing unit test for angle and area record completion**

Add tests that create three anchors for angle, create at least three anchors followed by finishArea(), and assert the formatted labels use degrees and mm². Run the focused test and verify it fails only if the current behavior is missing or incorrect.

- [ ] **Step 2: Add a failing interaction test for pending-point undo and clear**

Assert that undo removes a pending point before removing a completed measurement, and that clear removes only the active measurement tool's records. Run the focused test and verify the expected failure.

- [ ] **Step 3: Implement the minimal measurement behavior required by the failing tests**

Preserve the existing ToolRecords API. Use the existing measureAngle, measureClosedArea, and model-local resolve functions; do not introduce a second measurement state store or persistence API.

- [ ] **Step 4: Extend the browser test to cover length, diameter, angle, and area**

Use real model ray-picking candidates, assert each visible label's unit/value, then exercise undo, clear, and close. Keep the test independent of hard-coded model coordinates by trying the existing candidate points.

- [ ] **Step 5: Run the focused unit tests and typecheck**

Run:

~~~
npm test -- ToolRecords.test.ts InteractiveTools.test.ts
npm run typecheck
~~~

Expected: all focused tests pass and TypeScript reports no errors.

### Task 3: Verify the annotation persistence and conflict workflow

**Files:**
- Read first: front/src/features/viewer/annotations/useAnnotations.ts
- Read first: front/src/features/viewer/annotations/DrawingCanvas.tsx
- Read first: front/src/features/viewer/annotations/AnnotationToolbar.tsx
- Read first: front/src/api/annotations.ts
- Read first: backend/src/main/java/com/medical3d/viewer/modules/annotation/controller/AnnotationDocumentController.java
- Read first: backend/src/main/java/com/medical3d/viewer/modules/annotation/service/AnnotationDocumentService.java
- Modify only if a failing test requires it: the annotation source files listed in this task
- Test: front/src/features/viewer/annotations/annotations.test.ts
- Test: front/src/features/viewer/annotations/useAnnotations.test.ts
- Test: front/src/features/viewer/annotations/AnnotationReload.test.tsx
- Test: front/tests/e2e/annotations.spec.ts
- Test: front/tests/e2e/annotation-touch.spec.ts

- [ ] **Step 1: Add or confirm failing tests for the remaining acceptance edges**

Cover: disabled Send remains disabled, save failure retains dirty drawings, HTTP 409 requires explicit reload, and reload clears undo history. Run each focused test and verify a missing behavior fails before implementation changes.

- [ ] **Step 2: Implement only the failing behavior**

Keep the existing versioned GET/PUT contract, serialized saves, model-local anchor coordinates, and server validation. Do not silently overwrite a newer server version and do not enable Send.

- [ ] **Step 3: Run the full frontend suite**

Run:

~~~
npm run typecheck
npm test
npm run lint
npm run build
~~~

Expected: all tests pass, lint has zero errors, and the production build exits successfully. Record any pre-existing warning separately.

### Task 4: Run backend, Compose, and real browser verification

**Files:**
- Read: README.md
- Read: deploy/compose/docker-compose.yml
- Read: front/playwright.config.ts
- Modify only if environment/test setup is broken: front/playwright.config.ts or the Compose configuration

- [ ] **Step 1: Run backend annotation tests**

Run:

~~~
.\mvnw.cmd -pl backend test
~~~

Expected: backend tests pass, including authorization, invalid payloads, expiry, foreign layer rejection, and stale-version conflict behavior.

- [ ] **Step 2: Start the documented local stack**

Use the repository's documented Compose command and wait for the frontend, API, PostgreSQL, and MinIO health checks before running browser tests. Do not change production data outside the local Compose volumes.

- [ ] **Step 3: Run measurement and annotation browser tests**

Run:

~~~
npm exec playwright test tests/e2e/measurement-tools.spec.ts --project=mobile-chrome --workers=1
npm exec playwright test tests/e2e/annotations.spec.ts --project=mobile-chrome --workers=1
npm exec playwright test tests/e2e/annotation-touch.spec.ts --project=mobile-chrome --workers=1
npm exec playwright test tests/e2e/blender-entry.spec.ts --project=desktop-chrome --workers=1 --trace=off
~~~

Expected: real API/database tests pass for add/edit/delete/drag/clear/reload, the Send button stays disabled, and touch double-tap/long-press behavior does not duplicate marks.

### Task 5: Clean generated artifacts and prepare the delivery commit

**Files:**
- Delete only: D:\3Dimage\artifacts\annotation-verification\* and other files confirmed to be generated under D:\3Dimage\artifacts\
- Modify if needed: docs/annotations.md with final verification commands/results
- Stage: the measurement/annotation implementation, tests, migrations, docs, and deployment changes belonging to this task

- [ ] **Step 1: Verify the cleanup target**

Run:

~~~
$target = (Resolve-Path 'D:\3Dimage\artifacts').Path
if ($target -notlike 'D:\3Dimage\artifacts*') { throw "Unexpected cleanup target: $target" }
Get-ChildItem -LiteralPath $target -Recurse -Force
~~~

Expected: only generated verification outputs are listed.

- [ ] **Step 2: Remove the generated artifacts**

After the target check, remove the exact D:\3Dimage\artifacts directory and leave source assets and test fixtures untouched.

- [ ] **Step 3: Review the final diff boundary**

Run:

~~~
git status --short
git diff --check
git diff --stat
~~~

Expected: no whitespace errors, no generated artifacts, and no unrelated user changes included in the staging set.

- [ ] **Step 4: Create the final feature commit**

Stage the verified files under backend/src/main/java/com/medical3d/viewer/modules/annotation, backend/src/main/resources/db/migration/V4__annotation_document.sql, backend/src/main/resources/mapper/annotation, backend/src/test/java/com/medical3d/viewer/modules/annotation, front/packages/rendering-core/src/tools, front/src/api/annotations.ts, front/src/features/viewer/annotations, front/tests/e2e, plus the explicitly reviewed viewer/share/deployment files changed by this task. Commit with:

~~~
git add backend/src/main/java/com/medical3d/viewer/modules/annotation backend/src/main/resources/db/migration/V4__annotation_document.sql backend/src/main/resources/mapper/annotation backend/src/test/java/com/medical3d/viewer/modules/annotation front/packages/rendering-core/src/tools front/src/api/annotations.ts front/src/features/viewer/annotations front/tests/e2e docs/annotations.md
git commit -m "feat: complete viewer measurement and annotation tools"
~~~

- [ ] **Step 5: Verify the commit and clean worktree**

Run:

~~~
git show --stat --oneline HEAD
git status --short
~~~

Expected: HEAD contains the verified feature commit and the worktree is clean, except for explicitly identified unrelated user changes that were intentionally left unstaged.
