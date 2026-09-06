# Interactive 3D Rotation Design

## Goal

Make the viewer genuinely interactive in both cases:

- When a GLB layer is available, the loaded model can be rotated, zoomed, and panned.
- When the manifest has no usable asset, the fallback is a real Three.js procedural lung model rather than a static CSS illustration.

Both paths must use the same camera and interaction behavior so users do not lose 3D controls in the demo state.

## Interaction contract

- Mouse left drag and one-finger drag orbit the camera around the model.
- Mouse wheel and two-finger pinch zoom the camera.
- Mouse right drag and two-finger movement pan the camera.
- The viewer prevents browser scrolling/gesture navigation inside the canvas.
- Reset restores the initial target and camera distance.
- Auto-rotate continues to work for both loaded and fallback models.
- Tool modes remain isolated: browse orbits; move-layer and clip modes keep their existing specialized callbacks; measure/annotate preserve picking behavior.

## Architecture

`ViewerEngine` owns the Three.js renderer, camera, scene, controls, and fallback model. It always creates the engine when a canvas is available, even when the manifest has no assets. `load()` clears the scene, loads available layers, and adds the procedural model when there are no ready layers or when all asset loads fail.

`TouchController` is attached to the canvas by `ViewerEngine` and translates pointer input into orbit, zoom, pan, layer movement, picking, or clip manipulation callbacks. `OrbitControls` remains the mouse-capable camera controller for the normal browse mode; the custom controller handles touch and mode-specific behavior without React render-loop state.

The procedural demo model is intentionally small and self-contained: a grouped trachea, two rounded lung volumes, and a few segment/vessel accents built from Three.js primitives. It is a visual fallback only and must never be used for medical measurement.

`ViewerCanvas` reports a failure only when the engine cannot initialize or a manifest with assets has no ready layer and the fallback cannot be rendered. It no longer overlays a CSS model on top of a non-interactive canvas in the normal no-asset state.

## State and lifecycle

- The React shell continues to own toolbar mode and calls the stable engine handle for reset, background, visibility, and auto-rotation.
- The engine switches controller mode when the shell changes mode; this is exposed through the canvas handle.
- Pointer listeners, controls, renderer resources, fallback geometry, and animation frames are disposed together on unmount.
- Loading an updated manifest aborts prior requests and removes old layer/fallback resources before rendering the new state.

## Error handling

- A failed individual layer remains an error in the layer snapshot while other layers continue loading.
- If no layer becomes ready, the engine shows the procedural demo and the page remains interactive.
- WebGL initialization failure keeps the existing page-level error path; no fake interactive state is presented as a real 3D scene.

## Testing

- Add unit tests for pointer orbit, pinch zoom, and pointer cleanup in `TouchController`.
- Add engine-level tests or test seams proving fallback geometry is added for an empty manifest and that reset/auto-rotate operate on it.
- Preserve existing toolbar and layer visibility tests.
- Run frontend typecheck, lint, unit tests, and production build.

## Scope boundaries

This change does not add external model files, alter backend APIs, or implement medical geometry/measurement on the fallback model. It focuses on making the current viewer genuinely draggable and rotatable while keeping existing tool modes intact.
