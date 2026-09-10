// Pure contracts for the bounded portrait framing milestone. No DOM or
// browser is needed: presentation geometry, camera transforms and control
// hit-testing are all deterministic from a viewport/config.
import assert from 'node:assert/strict';
import {
  frameForViewport, cameraForFrame, worldToLogical, logicalToWorld,
  cssToLogical, logicalToCss, setActiveFrame, defaultFrame,
} from '../src/engine/frame.js';
import {
  portraitTouchLayout, portraitHitTest, clearPortraitInput,
  PORTRAIT_CONTROL_DIAMETERS,
} from '../src/engine/portrait-input.js';
import { H, screen as rendererScreen, setPresentationFrame } from '../src/engine/renderer.js';

const close = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-9, `${message}: ${a} ~= ${b}`);

assert.equal(H, 270, 'the production renderer keeps its landscape height by default');
assert.equal(defaultFrame().height, 270, 'the default frame remains landscape');

const A = 2.2;
const frame = frameForViewport({
  mode: 'phone-portrait', viewportWidth: 390, viewportHeight: 844,
  safeInsets: { top: 59, right: 0, bottom: 34, left: 0 }, revision: 4,
});
close(frame.height, 844 * 480 / 390, 'portrait logical height follows the CSS aspect ratio');
close(frame.scale, 390 / 480, 'portrait scale is CSS px per logical unit');
close(frame.groundScreenY, frame.safeRect.top + frame.safeRect.height * 0.62,
  'portrait ground anchor starts at 62% of the usable safe frame');
const lowerFrame = frameForViewport({
  mode: 'phone-portrait', viewportWidth: 390, viewportHeight: 844,
  safeInsets: { top: 59, right: 0, bottom: 34, left: 0 }, groundAnchorRatio: 0.66,
});
close(lowerFrame.groundScreenY, lowerFrame.safeRect.top + lowerFrame.safeRect.height * 0.66,
  'portrait ground anchor follows the selected safe-frame ratio');
const lowClamped = frameForViewport({
  mode: 'phone-portrait', viewportWidth: 390, viewportHeight: 844,
  safeInsets: { top: 59, bottom: 34 }, groundAnchorRatio: 0,
});
const highClamped = frameForViewport({
  mode: 'phone-portrait', viewportWidth: 390, viewportHeight: 844,
  safeInsets: { top: 59, bottom: 34 }, groundAnchorRatio: 1,
});
close(lowClamped.groundScreenY, lowClamped.safeRect.top + lowClamped.safeRect.height * 0.55,
  'portrait ground anchor clamps at 55%');
close(highClamped.groundScreenY, highClamped.safeRect.top + highClamped.safeRect.height * 0.75,
  'portrait ground anchor clamps at 75%');
close(frame.safeRect.top, 59 / frame.scale, 'top safe inset converts with the frame scale');
close(frame.safeRect.bottom, frame.height - 34 / frame.scale, 'bottom safe inset converts with the frame scale');
assert.equal(frame.revision, 4, 'frame revision is carried through unchanged');
setPresentationFrame(frame);
close(H, frame.height, 'the opt-in renderer adopts the portrait logical height');
assert.equal(rendererScreen.frameRevision, frame.revision, 'the renderer carries the active frame revision');
close(rendererScreen.groundScreenY, frame.groundScreenY, 'the renderer carries the portrait ground anchor');
setPresentationFrame(defaultFrame());
assert.equal(H, 270, 'restoring the default frame returns the shipped height');

const target = frameForViewport({
  mode: 'phone-portrait', viewportWidth: 390, viewportHeight: 844, revision: 5,
});
const baselineCamera = cameraForFrame({ frame: target, camX: 73, zoom: A, pan: 0, floorY: 232 });
const targetCamera = cameraForFrame({ frame: target, camX: 73, zoom: A * 1.0625, pan: 0, floorY: 232 });
close(baselineCamera.bounds.width, 480 / A, 'A visible world width is derived from uniform zoom');
close(targetCamera.bounds.width / baselineCamera.bounds.width, 16 / 17,
  'A target world-width ratio is exactly 16/17');
const point = { x: 91.25, y: 184.5 };
const screen = worldToLogical(baselineCamera, point.x, point.y);
const world = logicalToWorld(baselineCamera, screen.x, screen.y);
close(world.x, point.x, 'world X round-trips through the camera');
close(world.y, point.y, 'world Y round-trips through the camera');
const pannedCamera = cameraForFrame({ frame: target, camX: 73, zoom: A, pan: 12, floorY: 232 });
close(pannedCamera.bounds.top, baselineCamera.bounds.top - 12 / A,
  'camera bounds follow the same vertical pan as the transform');
close(pannedCamera.bounds.bottom - pannedCamera.bounds.top, target.height / A,
  'panned camera bounds retain their world height');
const pannedScreen = worldToLogical(pannedCamera, point.x, point.y);
const pannedWorld = logicalToWorld(pannedCamera, pannedScreen.x, pannedScreen.y);
close(pannedWorld.y, point.y, 'panned world Y still round-trips through the camera');
const css = logicalToCss(target, 40, 120);
const logical = cssToLogical(target, css.x, css.y);
close(logical.x, 40, 'UI X round-trips independently of the world camera');
close(logical.y, 120, 'UI Y round-trips independently of the world camera');
assert.equal(baselineCamera.frameRevision, 5, 'camera records its frame revision');

const landscape = frameForViewport({ mode: 'landscape', viewportWidth: 852, viewportHeight: 393 });
assert.equal(landscape.width, 480, 'landscape logical width remains 480');
assert.equal(landscape.height, 270, 'landscape logical height remains 270');
assert.equal(landscape.groundScreenY, 232, 'landscape ground anchor remains shipped');

for (const [width, height, top, bottom] of [[375, 667, 47, 21], [390, 844, 59, 34], [430, 932, 59, 34]]) {
  const f = frameForViewport({
    mode: 'phone-portrait', viewportWidth: width, viewportHeight: height,
    safeInsets: { top, bottom }, groundAnchorRatio: 0.66, revision: 10,
  });
  close(f.height, height * 480 / width, `${width}x${height} keeps uniform portrait aspect`);
  close(f.groundScreenY, f.safeRect.top + f.safeRect.height * 0.66,
    `${width}x${height} anchors ground inside its safe rect`);
  assert.equal(f.revision, 10, `${width}x${height} carries its frame revision`);
}
const rotated = frameForViewport({ mode: 'landscape', viewportWidth: 844, viewportHeight: 390, revision: 11 });
assert.equal(rotated.height, 270, 'rotation back to horizontal restores 480x270');
assert.equal(rotated.mode, 'landscape', 'rotation back to horizontal restores landscape mode');

const controls = portraitTouchLayout({ viewportWidth: 390, viewportHeight: 844, safeInsets: { top: 59, bottom: 34 }, revision: 8 });
for (const [id, diameter] of Object.entries(PORTRAIT_CONTROL_DIAMETERS)) {
  assert.equal(controls.controls[id].diameter, diameter, `${id} control has its locked CSS diameter`);
  assert.ok(controls.controls[id].cy >= controls.safe.top && controls.controls[id].cy <= 844 - controls.safe.bottom,
    `${id} control clears the safe viewport`);
}
assert.equal(portraitHitTest(controls, controls.controls.use.cx, controls.controls.use.cy).action,
  'ability', 'USE wins over its broad thumb zone');
assert.equal(portraitHitTest(controls, 24, 780).action, 'jump', 'left lower zone maps to JUMP');
assert.equal(portraitHitTest(controls, 366, 780).action, 'slide', 'right lower zone maps to SLIDE');
assert.equal(portraitHitTest(controls, 366, 90).action, 'escape', 'PAUSE is an explicit top-right target');
assert.equal(portraitHitTest(controls, 195, 350), null, 'the middle world remains free of generic zones');
const active = new Map([[1, 'jump'], [2, 'slide']]);
assert.deepEqual(clearPortraitInput(active).sort(), ['jump', 'slide'], 'resize cancellation returns held actions');
assert.equal(active.size, 0, 'resize cancellation clears stale pointer state');

setActiveFrame(defaultFrame());
console.log('PORTRAIT FRAMING: PASSED');
