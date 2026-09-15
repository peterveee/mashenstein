// THE PICTURE'S RIGHT-HAND EDGE IS NOT camX + VIEW_W.
//
// `VIEW_W` is the width of the view and nothing else, so using it as an edge
// assumes the picture starts at the camera. In landscape it does. Portrait
// shifts the whole presentation left by `heroAnchorX - PLAYER_X` to buy the
// hero runway, so there the real edge is forty-odd world units further on —
// and twelve culls, wakes, retires and sweeps in run.js used to quote the
// short number. Everything in that band was being retired, woken and swept
// with the player looking straight at it.
//
// This suite holds the seam itself: viewRightDx/viewRightX must describe the
// frame that is actually on screen, in both orientations, and no cull may be
// spelled off VIEW_W again.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installDom } from './dom-stub.js';
installDom();

const { RunState, ZOOM_NORMAL } = await import('../src/game/run.js');
const { PLAYER_X } = await import('../src/game/player.js');
const { PORTRAIT_CONFIG } = await import('../src/engine/portrait-config.js');
const { W } = await import('../src/engine/renderer.js');
const { VIEW_W } = await import('../src/engine/camera.js');

// The seam is arithmetic on two numbers the run already owns, so it is checked
// against a bare object rather than a booted stage: a RunState is not needed
// to say what the edge of a picture is, and pinning one here would make the
// test about stage loading.
const edgeFor = (camX, camZoom, worldXOffset) => {
  const probe = {
    camX,
    camZoom,
    portraitWorldXOffset: () => worldXOffset,
    viewRightDx: RunState.prototype.viewRightDx,
    viewRightX: RunState.prototype.viewRightX,
  };
  return { dx: probe.viewRightDx(), x: probe.viewRightX() };
};

// ---- landscape: the edge IS the view width -------------------------------
{
  const { dx, x } = edgeFor(1000, ZOOM_NORMAL, 0);
  assert.equal(dx, W / ZOOM_NORMAL, 'with no shift the edge is the view width');
  assert.equal(x, 1000 + W / ZOOM_NORMAL, 'and the world x is that past the camera');
}

// ---- portrait: the edge is further on, by exactly the shift ---------------
{
  const zoom = PORTRAIT_CONFIG.worldZoom;
  const offset = PORTRAIT_CONFIG.heroAnchorX - PLAYER_X;
  assert.ok(offset < 0, 'portrait shifts the picture LEFT of the camera');
  const { dx } = edgeFor(0, zoom, offset);
  assert.ok(dx > W / zoom,
    `the portrait edge (${dx.toFixed(1)}) is past the view width (${(W / zoom).toFixed(1)})`);
  assert.ok(Math.abs(dx - (W / zoom - offset)) < 1e-9,
    'and it is past it by exactly the shift');
  // The size of the mistake, stated so a future shift cannot quietly grow it
  // without this number moving too.
  const stale = dx - W / zoom;
  assert.ok(stale > 30,
    `the band a VIEW_W cull would wrongly discard is ${stale.toFixed(0)} world units`);
  // The hero has to be inside the picture with the runway on the right side of
  // him, which is the whole point of paying for the shift.
  const heroDx = PLAYER_X + offset;
  assert.ok(heroDx > 0, 'the hero is drawn inside the picture');
  assert.ok(dx - PLAYER_X > W / zoom - PLAYER_X,
    'and sees more road ahead than the short edge would allow');
}

// ---- the edge moves with the zoom ----------------------------------------
{
  const a = edgeFor(0, 2, -35).dx;
  const b = edgeFor(0, 4, -35).dx;
  assert.ok(a > b, 'a closer framing shows less road, shift included');
}

// ---- and nothing culls off VIEW_W any more -------------------------------
//
// A grep rather than a behavioural probe, deliberately: the failure mode is a
// NEW cull written the old way, which no fixture can anticipate. VIEW_W has
// exactly one legitimate use left — where the finish tape parks on screen,
// which is a framing question and not an edge.
{
  const src = readFileSync(new URL('../src/game/run.js', import.meta.url), 'utf8');
  const offenders = src.split('\n')
    .map((line, i) => ({ line, n: i + 1 }))
    .filter(({ line }) => !line.trim().startsWith('//') && !line.trim().startsWith('*'))
    .filter(({ line }) => /camX \+ VIEW_W|camX \+ W \/ this\.camZoom/.test(line));
  assert.deepEqual(offenders.map((o) => `${o.n}: ${o.line.trim()}`), [],
    'no cull spells the picture edge off VIEW_W or W/camZoom');
  assert.ok(/const finishLineX = \(\) => Math\.max\(VIEW_W - 72/.test(src),
    'the finish tape still parks against the view, which is a framing question');
  assert.ok(VIEW_W > 0, 'VIEW_W itself is still the view width it always was');
}

console.log('VIEW RIGHT EDGE: PASSED');
