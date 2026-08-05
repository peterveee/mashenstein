// One character's complete visual spec, as a standalone page for Claude Design.
// Built by tools/build-design-handoff.js into work/local/design-handoff/<id>.html.
//
// Design cannot import src/ or run the game, so the REAL painter is bundled in
// and every canvas here calls drawToon() exactly as the game does. The point of
// the page is the round trip: everything adjustable is shown beside the code
// name that controls it, so a change can come back as `key: old -> new` and be
// applied without a translation pass.
import { HERO_SPRITES } from '../src/sprites/heroes.js';
import {
  TOON_SPECS, drawToon, drawToonFace, INK, RIM, CONTOUR, setInkScale, setInkDensity,
} from '../src/sprites/toons.js';

// Injected by the builder rather than imported: importing HERO_DRAW_H from
// src/game/draw.js pulls the entire game into the bundle (2 MB) for a handful
// of integers, and these pages have to stay light enough to be a preview card.
const {
  heroDrawH: HERO_DRAW_H, zoom: ZOOM, frameW: FRAME_W, frameH: FRAME_H,
  tutorialZoom: TUTORIAL_ZOOM,
} = window.__GEOM__;
const ID = window.__HERO_ID__;

// What the hero ACTUALLY measures on a screen. HERO_DRAW_H is world units, not
// pixels: the camera draws the world at ZOOM into a FRAME_W x FRAME_H frame, and
// renderer.js then scales that frame to fill the viewport (letterboxed, any
// fractional scale). So the on-screen height is heroDrawH * ZOOM * fit-scale,
// and the hero is never anywhere near HERO_DRAW_H physical pixels.
const FRAME_PX = HERO_DRAW_H * ZOOM;                     // height within the frame
const heroCssPx = (vw, vh) => FRAME_PX * Math.min(vw / FRAME_W, vh / FRAME_H);

const CONTEXTS = [
  { label: 'iPhone 15, landscape', vw: 852, vh: 393, dpr: 3 },
  { label: 'iPad, landscape', vw: 1180, vh: 820, dpr: 2 },
  { label: 'Laptop browser window', vw: 1440, vh: 810, dpr: 2 },
  { label: 'Studio Display, full screen', vw: 2560, vh: 1440, dpr: 2 },
];
const SPEC = TOON_SPECS[ID];
const PAL = HERO_SPRITES[ID].pal;

// Same shape poseFromPlayer() hands drawToon() in a real run.
function pose(kind, t, extra = {}) {
  return {
    kind, phase: (t * 1.6) % 1, time: t, vy: kind === 'jump' ? -160 : 0,
    grounded: kind !== 'jump', squash: 0, lean: 0, roll: false, float: false,
    stomp: false, headless: false, facing: 1, ...extra,
  };
}

const anims = [];
const DPR = Math.min(2, window.devicePixelRatio || 1);

// Ink weight is NOT a function of how big the cell is. toons.js floors every
// stroke in logical 480x270 px and tapers the body contour by the square root of
// the draw scale, so the pen thins as the camera pushes in — that is why the
// tutorial's push-in looks thin and is correct. A cell that merely MAGNIFIES the
// hero is not a camera push-in and must not be inked like one, so every paint
// here declares the zoom it is simulating (the run camera, ZOOM) and the device
// density it is painting through. Without this the big cards measure their own
// transform, mistake magnification for zoom, and come back over-inked.
function canvas(w, h, paint, { animated = true, inkScale = ZOOM } = {}) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * DPR); c.height = Math.ceil(h * DPR);
  c.style.width = `${w}px`; c.style.height = `${h}px`;
  const ctx = c.getContext('2d');
  const frame = (t) => {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, w, h);
    setInkDensity(DPR);
    setInkScale(inkScale);
    paint(ctx, t);
    setInkScale();
    setInkDensity();
  };
  if (animated) anims.push(frame); else frame(0);
  return c;
}

function card(parent, label, node, sub) {
  const d = document.createElement('div');
  d.className = 'card';
  d.appendChild(node);
  const l = document.createElement('div');
  l.className = 'lab';
  l.textContent = label;
  d.appendChild(l);
  if (sub) {
    const s = document.createElement('div');
    s.className = 'sub';
    s.textContent = sub;
    d.appendChild(s);
  }
  parent.appendChild(d);
  return d;
}

function section(title, note) {
  const s = document.createElement('section');
  const h = document.createElement('h2');
  h.textContent = title;
  s.appendChild(h);
  if (note) {
    const p = document.createElement('p');
    p.className = 'note';
    p.textContent = note;
    s.appendChild(p);
  }
  const g = document.createElement('div');
  g.className = 'grid';
  s.appendChild(g);
  document.querySelector('main').appendChild(s);
  return g;
}

const POSES = ['idle', 'run', 'jump', 'duck', 'celebrate'];

// ------------------------------------------------------------ scale ladder
// Real presented sizes, not multipliers. Judging this character at a size it is
// never shown at is the fastest way to get a note that helps nothing.
{
  const lo = Math.round(heroCssPx(CONTEXTS[0].vw, CONTEXTS[0].vh));
  const hi = Math.round(heroCssPx(CONTEXTS[3].vw, CONTEXTS[3].vh));
  const g = section('Scale — the sizes this character is actually shown at',
    `The game renders a ${FRAME_W}x${FRAME_H} frame and scales it to fill the viewport, so the hero `
    + `is ${lo}-${hi} CSS px tall depending on the screen — roughly ${lo * CONTEXTS[0].dpr}-`
    + `${hi * CONTEXTS[3].dpr} device px on retina. Each card below is drawn at the true height for `
    + 'that device. Judge the character here, at these sizes; the enlargements further down are for '
    + 'reading detail, not for deciding.');
  for (const c of CONTEXTS) {
    const hh = heroCssPx(c.vw, c.vh);
    const w = hh * 0.95, h = hh * 1.34;
    card(g, c.label, canvas(w, h, (ctx, t) => {
      drawToon(ctx, ID, pose('idle', t), w / 2, h - hh * 0.05, hh);
    }), `${Math.round(hh)} css px · ${Math.round(hh * c.dpr)} device px`);
  }
}

// ------------------------------------------------------------ detail zoom
{
  const g = section('Detail — enlarged for reading only',
    'Above shipping scale. Useful for seeing how a shape is constructed; not a size any player sees. '
    + 'Line weight here is the weight the game really draws at the run camera, simply displayed '
    + 'larger — it is not re-inked for the enlargement. Stroke widths are floored in logical '
    + 'frame pixels and the body contour thins by the square root of the camera zoom, so the pen '
    + 'gets finer as the camera pushes in. That is automatic; it is not a per-character setting.');
  for (const hh of [240, 400]) {
    const w = hh * 0.95, h = hh * 1.34;
    card(g, `${hh}px`, canvas(w, h, (ctx, t) => {
      drawToon(ctx, ID, pose('idle', t), w / 2, h - hh * 0.05, hh);
    }), null);
  }
}

// ------------------------------------------------------------ ink by camera
// Line weight is deliberately NOT constant across the game, which surprises
// people who have only seen the tutorial. Show the three cameras side by side at
// one display size so the difference is the ink and nothing else.
{
  const g = section('Line weight — why the tutorial looks thinner',
    'Stroke width is a function of camera zoom, on purpose. Widths are floored in logical frame '
    + 'pixels, so as the camera pushes in the floor stops dominating and marks return to their '
    + 'intended proportions; and the body contour thins by the square root of the zoom, the way a '
    + 'drawing blown up to a poster is not re-inked with a bigger pen. All three below are the same '
    + 'character at the same display size — only the simulated camera differs. This is automatic '
    + 'and global; there is no per-character line-weight setting, and asking for "thinner lines" on '
    + 'one hero is not a change this system can express.');
  const CAMERAS = [
    ['Menus, hub, HUD', 1],
    ['Gameplay run camera', ZOOM],
    ['Tutorial intro push-in', TUTORIAL_ZOOM],
  ];
  const HH = 300;
  for (const [label, z] of CAMERAS) {
    const w = HH * 0.95, h = HH * 1.34;
    card(g, label, canvas(w, h, (ctx, t) => {
      drawToon(ctx, ID, pose('idle', t), w / 2, h - HH * 0.05, HH);
    }, { inkScale: z }), `zoom ${z}x`);
  }
}

// ------------------------------------------------------------ pose sheet
{
  const g = section('Poses — every state the rig has to hold',
    'A silhouette tuned on the idle frame routinely breaks the run or the duck. All five are '
    + 'drawn by the same painter, so all five move together. Celebrate is the results-screen '
    + 'routine: signature bounce, then the big move.');
  const HH = Math.round(heroCssPx(1440, 810)); // the common laptop case
  for (const kind of POSES) {
    const th = kind === 'celebrate' ? HH * 1.62 : HH * 1.34;
    card(g, kind, canvas(HH * 0.95, th, (ctx, t) => {
      drawToon(ctx, ID, pose(kind, t, kind === 'celebrate' ? { menu: true } : {}),
        (HH * 0.95) / 2, th - HH * 0.05, HH);
    }), 'drawToon()');
  }
}

// ------------------------------------------------------------ silhouette
// Flat-black fill of the same draw. This is the read at speed: in a run the
// player parses the shape, not the palette.
{
  const g = section('Silhouette — the read at speed',
    'The same draws filled flat black. During play the shape is what the player parses; '
    + 'if two heroes share a silhouette, no amount of colour separates them. Shown at the '
    + 'smallest and the most common real sizes.');
  const SIL = [
    ['phone', Math.round(heroCssPx(CONTEXTS[0].vw, CONTEXTS[0].vh))],
    ['laptop', Math.round(heroCssPx(1440, 810))],
  ];
  for (const [where, hh] of SIL) {
    for (const kind of POSES) {
      const w = hh * 0.95, h = hh * 1.34;
      card(g, `${kind} · ${where}`, canvas(w, h, (ctx, t) => {
        drawToon(ctx, ID, pose(kind, t), w / 2, h - hh * 0.05, hh);
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
      }), null);
    }
  }
}

// ------------------------------------------------------------ face
{
  const g = section('Face — the hub and dialogue crop',
    'drawToonFace() is a separate entry point used by menus, the hub and speech. It reads the '
    + 'same palette but crops to the head, so a head change lands in two places.');
  // Menus and the hub draw at 1:1, not through the run camera, so these crops
  // pin scale 1 — the ink a face actually carries where a face is actually used.
  for (const s of [48, 96, 160]) {
    card(g, `${s}px`, canvas(s, s, (ctx, t) => {
      drawToonFace(ctx, ID, 0, 0, s, s, { time: t });
    }, { inkScale: 1 }), 'drawToonFace()');
  }
}

// ------------------------------------------------------------ parameters
// Read live off the real exported objects, so the table cannot drift from code.
function table(parent, rows, cols) {
  const t = document.createElement('table');
  const hd = document.createElement('tr');
  for (const c of cols) {
    const th = document.createElement('th');
    th.textContent = c;
    hd.appendChild(th);
  }
  t.appendChild(hd);
  for (const r of rows) {
    const tr = document.createElement('tr');
    for (const cell of r) {
      const td = document.createElement('td');
      if (cell && cell.swatch) {
        const sw = document.createElement('span');
        sw.className = 'swatch';
        sw.style.background = cell.swatch;
        td.appendChild(sw);
        td.appendChild(document.createTextNode(cell.text));
      } else {
        td.textContent = String(cell);
      }
      tr.appendChild(td);
    }
    t.appendChild(tr);
  }
  parent.appendChild(t);
}

const PAL_MEANING = {
  o: 'outline', s: 'skin', h: 'hat / hair', b: 'body / torso', p: 'pants / lower',
  f: 'feet', w: 'white / highlight', e: 'eye', a: 'accent', m: 'mouth / mustache',
  n: 'nose', g: 'gold / metal trim', hand: 'hands', arm: 'upper arm',
  hair: 'hair', belly: 'belly', ear: 'ear', cheek: 'cheek', star: 'star mark',
};

const FLAG_MEANING = {
  rig: 'which body painter draws this character (SHARED — changing it re-skeletons the hero)',
  head: 'head decoration variant',
  mouth: 'mouth variant',
  nose: 'draws the big nose',
  mustache: 'draws the mustache',
  straps: 'overall straps over the torso',
  plumber: 'plumber detailing pass',
  stout: 'wider, shorter body proportion',
  slim: 'narrower body proportion',
  heavy: 'heaviest body proportion',
  armDepth: 'near/far arm split so arms read in front of and behind the torso',
  hands: 'draws distinct hands rather than tapering the arm',
  pants: 'lower body drawn as pants',
  tunic: 'lower body drawn as a tunic',
  apron: 'apron over the torso',
  tail: 'draws the tail',
  beard: 'draws the beard',
  pecs: 'chest shaping',
  back: 'item carried on the back',
  cannon: 'arm-mounted cannon',
  nameTag: 'name tag on the chest',
  rollDuck: 'duck pose is a roll',
  shoulders: 'shoulder width multiplier (1 = rig default)',
  taper: 'torso taper, 0..1 — lower is more V-shaped',
  armLen: 'arm length multiplier (1 = rig default)',
  tatSide: 'which side markings sit on: -1 screen-left, +1 screen-right',
};

{
  const s = document.createElement('section');
  s.innerHTML = '<h2>Parameters — the only vocabulary for a change</h2>';
  const p = document.createElement('p');
  p.className = 'note';
  p.textContent = 'Every row is a real name in the source. Propose changes as '
    + '`name: current -> proposed`. If you want something no row can express, say so as a new '
    + 'name and describe what it should control — that is a useful answer, not a failure.';
  s.appendChild(p);
  document.querySelector('main').appendChild(s);

  const h3 = (txt) => {
    const e = document.createElement('h3');
    e.textContent = txt;
    s.appendChild(e);
  };

  h3(`TOON_SPECS.${ID} — per-character, src/sprites/toons.js`);
  table(s, Object.entries(SPEC).map(([k, v]) => [
    k, JSON.stringify(v), FLAG_MEANING[k] || '',
    k === 'rig' ? 'shared painter' : 'this hero only',
  ]), ['key', 'value', 'controls', 'scope']);

  h3(`HERO_SPRITES.${ID}.pal — per-character, src/sprites/heroes.js`);
  table(s, Object.entries(PAL).map(([k, v]) => [
    k, { swatch: v, text: v }, PAL_MEANING[k] || '', 'this hero only',
  ]), ['key', 'value', 'controls', 'scope']);

  h3('Global ink — SHARED BY THE WHOLE CAST, src/sprites/toons.js');
  const shared = [];
  for (const [k, v] of Object.entries(INK)) shared.push([`INK.${k}`, JSON.stringify(v), 'setInk()', 'ALL 10 HEROES']);
  for (const [k, v] of Object.entries(RIM)) shared.push([`RIM.${k}`, JSON.stringify(v), 'setRim()', 'ALL 10 HEROES']);
  for (const [k, v] of Object.entries(CONTOUR)) shared.push([`CONTOUR.${k}`, JSON.stringify(v), 'setContour()', 'ALL 10 HEROES']);
  table(s, shared, ['key', 'value', 'setter', 'scope']);
}

// ------------------------------------------------------------ run
let t0 = null;
function tick(now) {
  if (t0 === null) t0 = now;
  const t = (now - t0) / 1000;
  for (const f of anims) f(t);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
