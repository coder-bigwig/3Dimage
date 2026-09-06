# View Mode Reference Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each view-menu option render the model/CT combination shown in the supplied screenshots, while permanently removing the website header.

**Architecture:** Keep selection state in `ViewerShell`; map view names to model-only, image-only, or stacked layouts. Pass a typed CT orientation to `CtPreview`, and use CSS modifiers for the three orientations.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, CSS.

---

### Task 1: Add failing view-layout regression tests

**Files:** Modify `front/src/features/viewer/ViewerShell.test.tsx`.

- [ ] Add a parameterized test for these exact cases: `三维` model only; `影像` image only; `三维+横断面` model plus transverse image; `冠状面` image only; `矢状面` image only; `三维+冠状面` model plus coronal image; `三维+矢状面` model plus sagittal image. Open the view menu, click each item, and assert `viewer-model-panel` and `ct-preview` presence with explicit `if` branches.
- [ ] Add a test that the `网站标题` banner is absent while the `模型` button, `下载` button, and `查看器工具` navigation remain.
- [ ] Run `pnpm --dir front test -- src/features/viewer/ViewerShell.test.tsx` and confirm the new tests fail because the header is still rendered and every mode currently renders both panels.

### Task 2: Implement view-to-layout mapping

**Files:** Modify `front/src/features/viewer/ViewerShell.tsx` and `front/src/features/viewer/CtPreview.tsx`.

- [ ] Remove only the `viewer-site-header` JSX from `ViewerShell`; keep the model/download tabs and toolbar.
- [ ] Add typed view mappings: `影像`, `冠状面`, `矢状面` map to image-only orientations; `三维+横断面`, `三维+冠状面`, `三维+矢状面` map to stacked layouts; `三维` stays model-only. Preserve the current model panel for `三维+AR` and `裁剪框` because no supplied screenshot defines a replacement.
- [ ] Change `CtPreview` to accept `orientation: '横断面' | '冠状面' | '矢状面'`, expose it in its accessible label, preserve slice controls and `data-testid="ct-preview"`, and add an orientation class.
- [ ] Run the focused ViewerShell test and confirm it passes.

### Task 3: Match the panel sizing and orientation presentation

**Files:** Modify `front/src/styles/global.css`.

- [ ] Add explicit model-only, image-only, and stacked workspace modifiers. Model-only and image-only fill the available workspace; stacked layouts keep equal model/image rows.
- [ ] Keep the current black transverse CT presentation and add deterministic coronal and sagittal presentation classes so selecting them does not accidentally use the transverse state.
- [ ] Run `pnpm --dir front lint` and `pnpm --dir front typecheck`; both must exit successfully.

### Task 4: Full verification

**Files:** None beyond the files above.

- [ ] Run `pnpm --dir front test` and confirm all Vitest tests pass.
- [ ] Run `pnpm --dir front build` and confirm TypeScript and Vite production build succeed.
- [ ] Review `git diff -- front/src/features/viewer/ViewerShell.tsx front/src/features/viewer/ViewerShell.test.tsx front/src/features/viewer/CtPreview.tsx front/src/styles/global.css` and `git status --short`; do not reset or overwrite unrelated existing workspace changes.
