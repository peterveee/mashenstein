// THE GOOSE, MORE DETAILED (BAKE-OFF, not wired into the game). Peter, 24 Sep 2026:
// "mock up more detailed geese please for a bakeoff".
//
// The shipped goose is `goose(ctx, w, h, frame)` in src/sprites/animals.js. Every
// candidate here is a painter with that same signature, drawn in the same units (beak
// tip to tail 26.2, wing tip to feet 17.2, fitted to the box the same way) and on the
// same 10-frame, 22fps ring, so a winner can drop straight into ANIMAL_PAINTERS. They
// all keep the shipped goose's rule for the neck: body, neck and head are ONE
// silhouette — every part is inked first and every part filled over it, so the only
// line left is the outside of the whole bird and the neck grows out of the chest.
//
// Same idea contract as src/dev/plumber-ideas.js (see src/dev/idea-scene.js): `lane`
// ideas, paint(ctx, t, x, g, info), the art sized exactly as drawWorldEntity sizes the
// shipped one — the 16x11 box, 4/3 inflation, PROP_TALL 1.35, PROP_VISUAL_SCALE 1.1.
import { PROP_PAINTERS } from '../sprites/props.js';
import { drawSoftContactShadow } from '../engine/shadows.js';

const TAU = Math.PI * 2;
const lerp = (a, b, k) => a + (b - a) * k;
const BOX = { w: 16, h: 11 };
const ART_W = BOX.w * 4 / 3 * 1.1;
const ART_H = BOX.h * 4 / 3 * 1.35 * 1.1;
const FRAMES = 10, FPS = 22;
// The shipped goose's own span, so every candidate is fitted identically.
const SPAN = { left: 16.4, right: 9.8, top: 17.2 };

// ---------------------------------------------------------------- drawing helpers
function stroke(ctx, color, lw, path) {
  ctx.beginPath(); path(ctx);
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
}
function fill(ctx, color, path) { ctx.beginPath(); path(ctx); ctx.fillStyle = color; ctx.fill(); }
function inked(ctx, color, lw, ink, path) {
  ctx.beginPath(); path(ctx);
  if (color) { ctx.fillStyle = color; ctx.fill(); }
  ctx.strokeStyle = ink; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
}
function clipTo(ctx, path, fn) { ctx.save(); ctx.beginPath(); path(ctx); ctx.clip(); fn(); ctx.restore(); }
// A pointed feather from its base (x, y) along angle `a`.
function featherPath(c, x, y, a, len, wid) {
  const ca = Math.cos(a), sa = Math.sin(a), nx = -sa * wid / 2, ny = ca * wid / 2;
  const tx = x + ca * len, ty = y + sa * len;
  c.moveTo(x + nx * 0.6, y + ny * 0.6);
  c.quadraticCurveTo(x + ca * len * 0.55 + nx * 1.4, y + sa * len * 0.55 + ny * 1.4, tx, ty);
  c.quadraticCurveTo(x + ca * len * 0.55 - nx * 1.4, y + sa * len * 0.55 - ny * 1.4, x - nx * 0.6, y - ny * 0.6);
  c.closePath();
}

// ---------------------------------------------------------------- the rig
// One detailed charging goose, facing left, feet at y 0, in the shipped goose's units.
// Everything that differs between the candidates is in `o`:
//   pal       colours (body, shade, wing, wingShade, primary, ink, beak, beakDark, leg,
//             legDark, mouth, eye, tongue, and optional back/stripe/bar/vent)
//   stretch   0..1, how far the neck is thrust out straight (1 = level, full reach)
//   spread    0..1, wings raised and fanned wide instead of half up
//   knob      a Chinese goose's knob on the beak   dewlap  a Toulouse's dewlap
//   brows     angry cartoon brows and a big glaring eye
//   stripe    a dark stripe down the back of the neck (Chinese)
//   barred    barred wing coverts (Toulouse)       head    head scale
function gooseRig(ctx, w, h, frame, o) {
  const P = o.pal;
  const u = ((frame % FRAMES) / FRAMES) * TAU;
  const bob = Math.abs(Math.sin(u)) * 0.8;
  const s = Math.min(w / (SPAN.left + SPAN.right), h / SPAN.top);
  const st = o.stretch || 0, sp = o.spread || 0, hs = o.head || 1;
  ctx.save();
  ctx.translate(w - SPAN.right * s, h);
  ctx.scale(s, s);

  // ---- legs and webbed feet, paddling (far one darker): thigh, a hock joint, shank,
  // and a foot of three toes with the web between them. A lifted foot folds its toes.
  const leg = (side) => {
    const k = u + side * Math.PI;
    const fx = -0.5 + Math.cos(k) * 2.8 + (side ? 1.4 : -1.2);
    const lift = Math.max(0, Math.sin(k)) * 1.7;
    const hx = side ? 0.8 : -0.6, hy = -5.4 - bob;
    const fy = -0.8 - lift;
    const jx = lerp(hx, fx, 0.45) + 0.7, jy = lerp(hy, fy, 0.45);
    const col = side ? P.leg : P.legDark;
    stroke(ctx, col, 0.85, (c) => { c.moveTo(hx, hy); c.lineTo(jx, jy); c.lineTo(fx, fy); });
    fill(ctx, col, (c) => c.arc(jx, jy, 0.45, 0, TAU));
    const fold = lift / 1.7;
    const toe = (dx, dy) => [fx + dx * (1 - fold * 0.45), fy + 0.6 + dy + fold * 0.9];
    const [ax, ay] = toe(-2.6, 0.1), [bx, by] = toe(-2.3, 0.55), [cx, cy] = toe(-1.5, 0.75);
    inked(ctx, col, 0.3, P.legInk || '#9a4c14', (c) => {
      c.moveTo(fx + 0.5, fy + 0.2);
      c.lineTo(ax, ay); c.quadraticCurveTo((ax + bx) / 2 + 0.3, (ay + by) / 2 - 0.05, bx, by);
      c.quadraticCurveTo((bx + cx) / 2 + 0.2, (by + cy) / 2 - 0.1, cx, cy);
      c.lineTo(fx + 0.6, fy + 0.7); c.closePath();
    });
    stroke(ctx, P.legInk || '#9a4c14', 0.22, (c) => { c.moveTo(fx + 0.3, fy + 0.4); c.lineTo(ax + 0.2, ay); c.moveTo(fx + 0.3, fy + 0.45); c.lineTo(bx + 0.1, by - 0.05); });
  };
  leg(0);
  leg(1);

  ctx.translate(0, -6.2 - bob);
  const flap = Math.sin(u + 1);
  const nb = Math.sin(u * 2) * 0.5 * (1 - st * 0.6);

  // ---- a detailed wing in its own frame: the shoulder at the origin, the axis to the
  // tip along +x, the trailing edge toward +y. Coverts over the base in scalloped rows,
  // secondaries along the trailing edge, primaries fanned at the tip.
  const drawWing = (lift, far) => {
    const a = -0.9 - lift * (0.5 + sp * 0.35) - (far ? 0.25 + sp * 0.2 : 0) - sp * 0.35;
    const L = 8.4 + sp * 2.2;
    ctx.save();
    ctx.translate(far ? 0.2 : 0.8, -2.2);
    ctx.rotate(a);
    const shade = far ? P.wingShade : P.wing;
    const prim = [], sec = [];
    const fan = 0.18 + sp * 0.22 + Math.max(0, -lift) * 0.08;
    for (let i = 0; i < 5; i++) prim.push([L * 0.55 + i * 0.35, 0.2 + i * 0.4, i * fan * 0.5, L * 0.52 - i * 0.35, 1.05]);
    for (let i = 0; i < 4; i++) sec.push([1.2 + i * 1.3, 1.1, 1.05 - i * 0.08, 2.5 + (far ? 0 : 0.2), 1.05]);
    const coverts = (c) => { c.ellipse(L * 0.34, 0.25, L * 0.45, 1.75, 0.04, 0, TAU); };
    // Ink every feather, then fill every feather: one clean silhouette.
    for (const f of [...sec, ...prim]) stroke(ctx, P.ink, 0.95, (c) => featherPath(c, ...f));
    stroke(ctx, P.ink, 0.95, coverts);
    for (const f of sec) fill(ctx, far ? P.wingShade : P.secondary || P.wingShade, (c) => featherPath(c, ...f));
    for (const f of prim) fill(ctx, P.primary, (c) => featherPath(c, ...f));
    fill(ctx, shade, coverts);
    // Feather shafts and the covert rows.
    stroke(ctx, P.shaft || 'rgba(90,84,74,0.45)', 0.2, (c) => { for (const [x, y, aa, len] of prim) { c.moveTo(x, y); c.lineTo(x + Math.cos(aa) * len * 0.9, y + Math.sin(aa) * len * 0.9); } });
    clipTo(ctx, coverts, () => {
      if (o.barred) {
        for (let r = 0; r < 3; r++) stroke(ctx, P.bar, 0.5, (c) => { for (let k = 0; k < 5; k++) { const x = 0.4 + k * 1.3 + r * 0.6; c.moveTo(x - 0.7, -0.9 + r * 0.9); c.quadraticCurveTo(x, -0.1 + r * 0.9, x + 0.7, -0.9 + r * 0.9); } });
      } else {
        stroke(ctx, P.scallop || 'rgba(120,112,100,0.45)', 0.28, (c) => {
          for (let r = 0; r < 3; r++) for (let k = 0; k < 5 - r; k++) {
            const x = 0.8 + k * 1.25 + r * 0.7, y = -0.8 + r * 0.8;
            c.moveTo(x - 0.6, y); c.quadraticCurveTo(x, y + 0.6, x + 0.6, y);
          }
        });
      }
      fill(ctx, 'rgba(255,255,255,0.35)', (c) => c.ellipse(L * 0.2, -1.1, L * 0.25, 0.35, 0, 0, TAU));
    });
    ctx.restore();
  };
  drawWing(flap, true);

  // ---- body, neck and head: ONE silhouette.
  const body = (c) => {
    c.moveTo(-4.2, -2.4); c.quadraticCurveTo(-5.8, 2.8, 0.8, 3); c.quadraticCurveTo(5.8, 3, 7.2, -1);
    // A spread of tail feathers rather than one spike.
    c.lineTo(9.6, -3.6); c.lineTo(8.1, -3.3); c.lineTo(9.3, -5.1); c.lineTo(7.6, -4.2); c.lineTo(8.2, -5.8);
    c.lineTo(6.4, -3.8); c.quadraticCurveTo(2, -4.4, -4.2, -2.4); c.closePath();
  };
  // The neck's head end: thrust further and straighter as `stretch` rises.
  const hx = -10.2 - st * 2.2, hy = lerp(-3.8, -2.6, st) + nb;
  const neck = (c) => {
    c.moveTo(-0.6, -3.8);
    c.bezierCurveTo(-4.2, -4.9 + st * 0.6, lerp(-6.4, -7, st), -4.8 + nb + st * 1.4, hx, hy);
    c.lineTo(hx - 0.4, hy + 2.5);
    c.bezierCurveTo(lerp(-7.4, -8, st), -1.6 + nb + st * 0.4, -5.8, -0.4, -3.2, 1.8);
    c.closePath();
  };
  const hcx = hx - 1 - (hs - 1) * 1.2, hcy = hy + 1.3;
  const head = (c) => c.ellipse(hcx, hcy, 2.2 * hs, 1.7 * hs, -0.1, 0, TAU);
  const dewlap = (c) => { c.moveTo(hcx + 0.4, hcy + 1.2 * hs); c.quadraticCurveTo(hcx - 0.4, hcy + 3.2 * hs, hcx - 1.8 * hs, hcy + 1.4 * hs); c.closePath(); };
  const parts = o.dewlap ? [body, neck, head, dewlap] : [body, neck, head];
  for (const part of parts) stroke(ctx, P.ink, 1.1, part);
  for (const part of parts) fill(ctx, P.body, part);
  // Back and belly tones, a white vent under the tail.
  clipTo(ctx, body, () => {
    if (P.back) fill(ctx, P.back, (c) => c.ellipse(2.6, -4.4, 7.4, 3.2, -0.08, 0, TAU));
    fill(ctx, P.shade, (c) => c.ellipse(1.6, 2.8, 7.4, 2.2, 0, 0, TAU));
    if (P.vent) fill(ctx, P.vent, (c) => c.ellipse(6.6, 0.6, 2.4, 1.8, -0.4, 0, TAU));
    // The breast: rows of little feather scallops catching the light.
    stroke(ctx, P.breast || 'rgba(170,162,148,0.55)', 0.28, (c) => {
      for (let r = 0; r < 4; r++) for (let k = 0; k < 5; k++) {
        const x = -4.3 + k * 1.15 + (r % 2) * 0.55 + r * 0.5, y = -1.3 + r * 0.95;
        c.moveTo(x - 0.5, y); c.quadraticCurveTo(x, y + 0.5, x + 0.5, y);
      }
    });
    // Tail feather lines.
    stroke(ctx, P.ink, 0.25, (c) => { c.moveTo(6.6, -3.7); c.lineTo(8.6, -3.4); c.moveTo(6.6, -3.9); c.lineTo(8.3, -5); });
  });
  clipTo(ctx, neck, () => {
    if (o.stripe) fill(ctx, P.stripe, (c) => { c.moveTo(-0.6, -4.2); c.bezierCurveTo(-4.2, -5.3 + st * 0.6, -6.6, -5.2 + nb + st * 1.4, hx, hy - 0.4); c.lineTo(hx, hy + 0.7); c.bezierCurveTo(-6.4, -4 + nb + st * 1.4, -4.2, -4 + st * 0.6, -0.6, -3); c.closePath(); });
    if (P.back && !o.stripe) fill(ctx, P.neck || P.back, (c) => c.rect(-12, -7, 12, 4.2 + st));
    fill(ctx, P.shade, (c) => {
      c.moveTo(hx - 0.6, hy + 2.6); c.bezierCurveTo(-7.4, -1.4 + nb, -5.8, -0.2, -3.2, 2.2);
      c.lineTo(-2.6, 0.6); c.bezierCurveTo(-5.6, -1.6, -7.6, -2.2 + nb, hx - 0.6, hy + 1.8); c.closePath();
    });
    // Neck furrows: the ridged feathering a goose's neck has.
    stroke(ctx, P.furrow || 'rgba(150,142,128,0.5)', 0.25, (c) => { for (let k = 0; k < 4; k++) { const x = -3.6 - k * 1.5 - st * k * 0.4; c.moveTo(x, -4.3 + k * 0.1); c.quadraticCurveTo(x - 0.5, -2.6, x + 0.2, -1.2 + k * 0.1); } });
  });
  if (P.headCol) clipTo(ctx, head, () => fill(ctx, P.headCol, (c) => c.rect(hcx - 4, hcy - 3, 8, 6)));

  // ---- the beak: upper and lower mandibles, serrations along the gape, a nostril,
  // and a knob on a Chinese goose. The honk opens it on the stride.
  const gape = (0.5 + Math.abs(Math.sin(u)) * 0.8) * (1 + st * 0.5);
  const bx = hcx - 1.2 * hs, by = hcy - 0.1;
  const tip = 3.6 + st * 0.3;
  fill(ctx, P.mouth, (c) => { c.moveTo(bx - 0.2, by); c.lineTo(bx - tip + 0.4, by - gape * 0.45); c.lineTo(bx - tip + 0.6, by + 1.8 + gape * 0.5); c.closePath(); });
  if (P.tongue) fill(ctx, P.tongue, (c) => c.ellipse(bx - tip * 0.55, by + 0.8 + gape * 0.15, tip * 0.35, 0.35, 0.1, 0, TAU));
  // Deep at the base and tapering, the upper mandible hooked over at the nail.
  const upper = (c) => { c.moveTo(bx + 0.2, by - 1.3); c.quadraticCurveTo(bx - tip * 0.6, by - 1.5 - gape * 0.3, bx - tip - 0.2, by - 0.25 - gape * 0.55); c.quadraticCurveTo(bx - tip * 0.5, by + 0.35 - gape * 0.3, bx + 0.2, by + 0.45); c.closePath(); };
  const lower = (c) => { c.moveTo(bx + 0.2, by + 0.55); c.quadraticCurveTo(bx - tip * 0.5, by + 0.65 + gape * 0.35, bx - tip + 0.4, by + 1.25 + gape * 0.55); c.quadraticCurveTo(bx - tip * 0.45, by + 1.85 + gape * 0.45, bx + 0.3, by + 1.7); c.closePath(); };
  inked(ctx, P.beak, 0.35, P.beakDark, lower);
  inked(ctx, P.beak, 0.35, P.beakDark, upper);
  // The nail at the tip, the nostril, and the serrated edge of each mandible.
  fill(ctx, P.nail || '#e8d6b8', (c) => c.ellipse(bx - tip + 0.35, by - 0.4 - gape * 0.5, 0.45, 0.3, 0.3, 0, TAU));
  fill(ctx, P.beakDark, (c) => c.ellipse(bx - tip * 0.42, by - 0.55 - gape * 0.18, 0.42, 0.18, 0.1, 0, TAU));
  stroke(ctx, P.serration || 'rgba(150,64,14,0.7)', 0.2, (c) => {
    for (let k = 1; k <= 4; k++) { const q = k / 5, ux = lerp(bx, bx - tip, q), uy = lerp(by + 0.3, by - 0.35 - gape * 0.55, q); c.moveTo(ux, uy); c.lineTo(ux - 0.15, uy + 0.35); }
    for (let k = 1; k <= 3; k++) { const q = k / 4.5, lx = lerp(bx, bx - tip + 0.4, q), ly = lerp(by + 0.5, by + 1.2 + gape * 0.55, q); c.moveTo(lx, ly); c.lineTo(lx - 0.15, ly - 0.35); }
  });
  if (o.knob) inked(ctx, P.knob, 0.35, P.beakDark, (c) => c.ellipse(bx - 0.4, by - 1.2, 1.1, 0.95, 0, 0, TAU));

  // ---- the eye: a dark bead with a glint and a pale ring, or a cartoon glare.
  const ex = hcx - 0.2 * hs, ey = hcy - 0.5 * hs;
  if (o.brows) {
    fill(ctx, '#fffdf6', (c) => c.ellipse(ex, ey, 0.95 * hs, 0.8 * hs, 0, 0, TAU));
    stroke(ctx, P.ink, 0.3, (c) => c.ellipse(ex, ey, 0.95 * hs, 0.8 * hs, 0, 0, TAU));
    fill(ctx, '#1a1816', (c) => c.arc(ex - 0.35 * hs, ey + 0.05, 0.42 * hs, 0, TAU));
    fill(ctx, '#ffffff', (c) => c.arc(ex - 0.5 * hs, ey - 0.12, 0.13 * hs, 0, TAU));
    // A heavy brow slammed down toward the beak, and the vein of fury.
    inked(ctx, P.brow || '#3a3530', 0.25, P.ink, (c) => { c.moveTo(ex - 1.7 * hs, ey - 0.1 * hs); c.lineTo(ex + 1.2 * hs, ey - 1.6 * hs); c.lineTo(ex + 1.45 * hs, ey - 0.85 * hs); c.lineTo(ex - 1.5 * hs, ey + 0.45 * hs); c.closePath(); });
    stroke(ctx, '#d8453a', 0.3, (c) => { const vx = hcx + 1.2 * hs, vy = hcy - 1.2 * hs; c.moveTo(vx - 0.5, vy); c.lineTo(vx + 0.5, vy); c.moveTo(vx, vy - 0.5); c.lineTo(vx, vy + 0.5); });
  } else {
    fill(ctx, P.eyeRing || '#f0a24a', (c) => c.arc(ex, ey, 0.62, 0, TAU));
    fill(ctx, '#1a1816', (c) => c.arc(ex, ey, 0.45, 0, TAU));
    fill(ctx, '#ffffff', (c) => c.arc(ex - 0.15, ey - 0.17, 0.14, 0, TAU));
    stroke(ctx, P.ink, 0.5, (c) => { c.moveTo(ex - 1.1, ey - 1.1); c.lineTo(ex + 0.9, ey - 0.6); });
  }

  drawWing(flap * 0.8, false);
  ctx.restore();
}

// ---------------------------------------------------------------- the candidates
const PAL_WHITE = {
  body: '#f6f3ec', shade: '#d8d2c6', wing: '#eeeae1', wingShade: '#cbc4b6', secondary: '#dcd6ca',
  primary: '#bdb5a6', ink: 'rgba(74,70,64,0.9)', beak: '#f08a2c', beakDark: '#c4611a', leg: '#f59a36',
  legDark: '#c96e1e', mouth: '#8a2a1e', tongue: '#e0707a', eyeRing: '#f0a24a',
};
const PAL_TOULOUSE = {
  body: '#8f8a84', back: '#6e6962', neck: '#7a746e', shade: '#a9a39b', wing: '#6d675f', wingShade: '#56514b',
  secondary: '#5f5a53', primary: '#4a4642', bar: 'rgba(236,230,218,0.75)', vent: '#f1eee6',
  ink: 'rgba(44,40,36,0.95)', beak: '#f07a28', beakDark: '#b6531a', leg: '#f08a36', legDark: '#b8621e',
  mouth: '#7a2418', tongue: '#dc6a72', breast: 'rgba(210,204,194,0.6)', furrow: 'rgba(60,56,52,0.55)',
  scallop: 'rgba(210,202,190,0.5)', eyeRing: '#e08a3a',
};
const PAL_CHINESE = {
  body: '#e8dcc6', shade: '#cdbfa4', wing: '#b39676', wingShade: '#8f7658', secondary: '#9e8264', primary: '#6f5a44',
  back: '#c9b596', stripe: '#6e4f36', knob: '#3a2d25', ink: 'rgba(70,56,44,0.92)', beak: '#3a2d25', serration: 'rgba(200,180,160,0.5)',
  beakDark: '#1d1612', nail: '#6a5a4e', leg: '#f08a36', legDark: '#b8621e', mouth: '#6a2018', tongue: '#d86a70',
  breast: 'rgba(160,136,106,0.55)', scallop: 'rgba(232,216,190,0.55)', eyeRing: '#caa46a',
};
const PAL_CARTOON = {
  ...PAL_WHITE, body: '#fbf9f3', shade: '#dcd7cb', ink: 'rgba(40,36,34,1)', beak: '#ff8a1c', beakDark: '#c8560c',
};

const DESIGNS = {
  feathered: { pal: PAL_WHITE },
  toulouse: { pal: PAL_TOULOUSE, dewlap: true, barred: true },
  chinese: { pal: PAL_CHINESE, knob: true, stripe: true, stretch: 0.3 },
  angry: { pal: PAL_CARTOON, brows: true, head: 1.25 },
  honk: { pal: PAL_WHITE, stretch: 1, spread: 1 },
};
const painterFor = (name) => (ctx, w, h, frame) => gooseRig(ctx, w, h, frame, DESIGNS[name]);

// A lane idea from a (ctx, w, h, frame) painter, sized and animated exactly as the lane
// draws the shipped goose, with its contact shadow.
function asLane(painter) {
  return (ctx, t, x, g) => {
    drawSoftContactShadow(ctx, x, g - 1, Math.max(5, BOX.w * 0.68), 2.4, { alpha: 0.34 });
    ctx.save();
    ctx.translate(x - ART_W / 2, g - ART_H);
    painter(ctx, ART_W, ART_H, Math.floor(t * FPS) % FRAMES);
    ctx.restore();
  };
}
const sealed = (fn) => (ctx, ...args) => { ctx.save(); try { fn(ctx, ...args); } finally { ctx.restore(); } };

export const GOOSE_CANDIDATES = [
  { id: 'goose-ships', place: 'lane', name: 'SHIPS · current goose', paint: sealed(asLane((ctx, w, h, f) => PROP_PAINTERS.goose(ctx, w, h, f))),
    note: 'The goose in the game now (animals.js), drawn at its real lane size and cadence for comparison.' },
  { id: 'goose-feathered', place: 'lane', name: 'A · Feathered white', paint: sealed(asLane(painterFor('feathered'))),
    note: 'The shipped white goose with real feathering: scalloped coverts over secondaries and fanned primaries, a scaled breast, ridged neck, split tail, and a proper beak (nail, nostril, serrated edges) over webbed three-toed feet that fold as they lift.' },
  { id: 'goose-toulouse', place: 'lane', name: 'B · Grey Toulouse', paint: sealed(asLane(painterFor('toulouse'))),
    note: 'A grey-brown Toulouse: dark back and barred wing coverts, a heavy dewlap under the beak, white vent under the tail. Heavier and darker, so it reads against the pale sky.' },
  { id: 'goose-chinese', place: 'lane', name: 'C · Chinese goose with a knob', paint: sealed(asLane(painterFor('chinese'))),
    note: 'A buff Chinese goose: black beak with the breed\'s knob, a chocolate stripe down the back of the neck, brown wings — and its neck already half thrust out.' },
  { id: 'goose-angry', place: 'lane', name: 'D · Cartoon fury', paint: sealed(asLane(painterFor('angry'))),
    note: 'The white goose played for laughs: a bigger head, a glaring eye under a brow slammed down, a cross-popping vein, beak wide with the tongue showing.' },
  { id: 'goose-honk', place: 'lane', name: 'E · Full honk', paint: sealed(asLane(painterFor('honk'))),
    note: 'Mid-honk at full reach: neck thrust out straight and level, wings spread high and fanned, beak gaping. The most aggressive silhouette; the beak reaches about 2px further forward than the others.' },
];
