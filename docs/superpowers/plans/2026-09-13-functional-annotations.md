# Functional annotations implementation plan

**Goal:** Implement the supplied 2D/3D annotation interactions with server persistence; Send remains disabled.

**Architecture:** React owns normalized 2D drawings and annotation editing controls. Three.js resolves model-local anchors and projects draggable labels. A versioned annotation document per result is read/written through the shared-viewer API with annotate permissions and optimistic locking, stored in PostgreSQL. Public static datasets have no authorized server result and must explicitly identify local-only storage.

**Tech Stack:** React, TypeScript, SVG, Three.js, Spring Boot, MyBatis, PostgreSQL, Vitest, Playwright.

- [x] Add failing tests for menu modes, record editing/undo and API round-trip contract.
- [x] Define matching frontend/backend DTOs for normalized 2D drawings and model-local 3D annotations; reject invalid coordinates, missing layers, duplicate IDs and excessive payloads.
- [x] Add GET/PUT shared-viewer annotations endpoint, migration and atomic version checks; test permissions and conflicts.
- [x] Implement 2D SVG drawing surface with pen/line/arrow/ellipse/rectangle/text, palette/custom color, undo, clear, close, disabled Send.
- [x] Implement double-click model marking, selected text editing/deletion, long-press label dragging with leaders and projected anchors.
- [x] Wire load/save/retry/reload states into viewer; serialize writes and retain changes made during a save. Do not overwrite on load/save failure or conflict.
- [x] Run frontend unit/type/lint/build checks and backend tests; run browser against real backend and PostgreSQL to verify create/edit/drag/delete/clear and reload persistence, record results.
