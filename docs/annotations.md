# Functional annotations

The shared viewer supports 2D screen drawings and model-local 3D annotations. The **Send** control is deliberately disabled; it does not issue a network request. Edits are saved separately and automatically.

## Use

- Open an authorized `/share/{token}` URL, select 标注 → 二维标注 or 三维标注.
- 2D: choose a color and pen, line, arrow, ellipse, rectangle or text. Drag to draw; click and confirm to place text. Undo, Clear and Close operate on the drawing document.
- 3D: enter text and double-click/double-tap a visible model surface. Empty new text creates a default 标注 label. Select an existing label to edit it or use Delete. Hold a label for 350 ms before dragging. Its leader retains the original layer-local anchor while the text box moves. Drag the model to rotate it.
- The toolbar reports loading, pending, saving, saved or error status. On a version conflict, reload the server document explicitly; the confirmation warns that unsaved edits will be discarded. Reload also resets undo history.
- Closing the tools retains annotations. Resetting the view retains 3D annotations. Refreshing the redacted `/share/viewer` address resumes the same authorized share through this tab's session storage, rather than switching to the static preview.

## API contract

`GET /api/v1/shared-viewers/{token}/annotations` returns an empty version-0 document when no annotations have been saved. `PUT` accepts the same shape with the currently read version and returns the saved document with version incremented by one:

```json
{
  "version": 0,
  "drawings": [{
    "id": "50000000-0000-0000-0000-000000000001",
    "kind": "arrow",
    "color": "#ff0000",
    "points": [{ "x": 0.1, "y": 0.2 }, { "x": 0.8, "y": 0.7 }],
    "text": ""
  }],
  "models": [{
    "id": "50000000-0000-0000-0000-000000000002",
    "layerId": "20000000-0000-0000-0000-000000000001",
    "position": [1, 2, 3],
    "text": "右上叶",
    "offset": [55, -45]
  }]
}
```

2D coordinates are normalized to the viewport (0–1). 3D positions are coordinates within the referenced model layer, independent of camera rotation. Label offsets are CSS pixels relative to the projected anchor. Labels are kept within the visible viewport. 2D drawings are screen annotations; they do not follow model rotation like 3D anchors.

The backend checks `view` for reading and `annotate` for writing; saving annotations does not require `savePlan`. Every 3D layer must belong to the shared result. Limits are 200 drawings, 200 model annotations, 200 characters per label, 2,000 points per stroke, 20,000 total drawing points, and a serialized document of at most 1,000,000 characters. Non-finite coordinates, duplicate IDs and unknown tools/layers are rejected. Concurrent writes return HTTP 409 and cannot silently overwrite the newer version.

Flyway migration V4 creates `viewer_annotation_document`, one document per result. The version comparison and write execute atomically in PostgreSQL. The browser serializes autosaves and sends edits made during an in-flight request using the returned version. Load failures prevent editing an unknown server document; save failures retain the local unsaved changes and offer retry.

Static public datasets have no share authorization and remain outside this server workflow. With `VITE_ENABLE_BLENDER_DEMO=true`, a fresh `/share/viewer` opens the same eight-layer Blender refined model through its server-backed demo share. Migration V5 registers the original model assets, colors, volumes and clinical rendering style; the MinIO initializer seeds those GLBs. A tab with an existing authorized share resumes that share instead.

## Verification

- Frontend unit/component tests cover tool menus, label edit/undo, serialized saves, failure handling and conflict reload history.
- Backend tests use an actual PostgreSQL Testcontainer and the HTTP controller/security stack to verify read/create/edit/clear, foreign-layer rejection, expiry, permissions and stale versions.
- `pnpm --dir front exec playwright test tests/e2e/annotations.spec.ts --project=mobile-chrome --workers=1` exercises drawing, actual model ray picking, editing, label dragging, refresh, deletion, undo and clear against the running API/database. It uses the synthetic demo and restores its starting annotation document; run against a development environment.
- `pnpm --dir front exec playwright test tests/e2e/annotation-touch.spec.ts --project=mobile-chrome --workers=1` additionally exercises real touch double-tap and long-press inputs.
- `pnpm --dir front exec playwright test tests/e2e/blender-entry.spec.ts --project=desktop-chrome --workers=1 --trace=off` exercises the fresh `/share/viewer` entry, original refined model, 2D drawing, 3D marking, API persistence and restoration after refresh. Passed on 2026-09-14 in 1.7 minutes. Screenshots are in `artifacts/annotation-verification/`.
- Set `ANNOTATION_TEST_TOKEN=demo-blender-token-000000000000000000` and `ANNOTATION_TEST_ENTRY=/share/viewer` to run the touch workflow against the refined model as well.

On 2026-09-14 the refined-model touch workflow also passed in 1.1 minutes: double tap added a persisted label, long press moved its offset while preserving its model anchor, and deletion reached the API. This used mobile Chromium device emulation, not a physical phone. The frontend suite passed all 117 tests; typecheck passed and lint reported zero errors (one existing Fast Refresh warning).

Touch verification uses Chromium's input protocol with explicit input timestamps (160 ms for two taps). Two sequential high-level automation tap calls were observed 1.18 seconds apart under software rendering and therefore did not describe a double tap. Recognition now compares pointer-event timestamps, resets cancelled gestures, and consumes the compatibility mouse double-click synthesized after touch to prevent duplicate marks. Regression tests cover delayed delivery, slow single taps, cancellation, duplicate compatibility events and switching back to a real mouse.

Verified on 2026-09-13: the complete real-API workflow passed (mobile Chromium layout); the touch double-tap/long-press/save/delete workflow passed in 29.4 seconds. Backend integration tests passed against PostgreSQL. These are browser/device-emulation tests, not tests on a physical phone.

Use the Compose stack described in README to run the frontend and API together; rebuilding/restarting the backend applies V4 and V5 automatically.
