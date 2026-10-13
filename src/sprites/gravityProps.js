// GRAVITY GRID's obstacles — drawn in the station's flat-shaded hand: faceted
// bodies (lit face / mid face / shade face), a slate ink round each silhouette
// so it stands off the pale rails and the jade sky, amber status lamps (the
// rails' own) and hot orange for whatever hurts.
//
// Picked 13 Oct 2026 from the gravity obstacle bake-off (src/dev/gravity-
// obstacle-candidates.js). Peter: "these are great. replace all existing ones
// with the new ones... spread throughout". Each pair stands in for one thing
// the playtest dealt, and data/gravity-stages.js alternates the two through
// the three levels:
//
//   stands in for    candidates
//   crate            foilCrate, specimenCase
//   magCargo         fuelCell, maintenanceBot
//   oxygenRack       coolantRadiator, valveManifold
//   serviceLaser     weldingDrone, looseToolkit      (duck under)
//   popSpikes        plasmaVents, magClamps          (the field behind a gate)
//
// Boxes and flags are in game/entities.js and copy what each replaces. Every
// painter is authored in its PAINTED ENVELOPE in world units — box x 4/3 x
// PROP_TALL x PROP_VISUAL_SCALE — with the ground at y = h, on a clock `t` it
// quantises to its own ring; the registry wrapper below hands it frame/fps and
// scales the envelope onto the raster props.js gives it. Ceiling copies are the
// same art mirrored by draw.js, so steam that rises on the floor falls toward
// the floor on the ceiling. Like officeProps.js, nothing here imports props.js.

const frameOf = (t, n, fps) => ((Math.floor(t * fps + 1e-6) % n) + n) % n;

const TAU = Math.PI * 2;

// ------------------------------------------------------------------ palette
const INK = '#14222b';
const LW = 0.5, LWI = 0.3;
const HOT = '#ff5a3c', HOT_LT = '#ffb27a', HOT_WH = '#fff2e0', HOT_DK = '#b8261a';
const AMBER = '#f2a33a', AMBER_LT = '#ffd98a';
const CHROME = '#e4eeec', CHROME_MD = '#b4c6c6', CHROME_DK = '#7c9196';
const SLATE = '#3e5563', SLATE_LT = '#587486', SLATE_DK = '#24353f';
const FOIL = '#e6b748', FOIL_LT = '#fbe39a', FOIL_MD = '#cf9530', FOIL_DK = '#94631c';
const ICE = '#cfe6f4', ICE_MD = '#93bcd6', ICE_DK = '#5d86a3', ICE_GLOW = '#9fe2ff';
const TAPE_Y = '#f2c94c', TAPE_K = '#1c1c1c';
const RED = '#e5413a', RED_LT = '#ff8a7a', RED_DK = '#8f1d1a';
const GOO = '#a6f05a', GOO_DK = '#4f9a2a';

// ------------------------------------------------------------------ helpers
function pen(c, col, lw) { c.strokeStyle = col; c.lineWidth = lw; c.lineJoin = 'round'; c.lineCap = 'round'; }
function fs(c, fill, ink, lw = LW) {
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (ink) { pen(c, ink, lw); c.stroke(); }
}
function poly(c, pts, fill, ink = null, lw = LW) {
  c.beginPath(); c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath(); fs(c, fill, ink, lw);
}
function box(c, x, y, w, h, fill, ink = null, lw = LW) { c.beginPath(); c.rect(x, y, w, h); fs(c, fill, ink, lw); }
function rbox(c, x, y, w, h, r, fill, ink = null, lw = LW) { c.beginPath(); c.roundRect(x, y, w, h, r); fs(c, fill, ink, lw); }
function circ(c, x, y, r, fill, ink = null, lw = LW) { c.beginPath(); c.arc(x, y, r, 0, TAU); fs(c, fill, ink, lw); }
function line(c, x0, y0, x1, y1, col, lw) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); pen(c, col, lw); c.stroke(); }
const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
// Hazard tape across a band, clipped to it.
function tape(c, x, y, w, h, step = 2.4) {
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  box(c, x, y, w, h, TAPE_Y);
  c.fillStyle = TAPE_K;
  for (let k = x - h; k < x + w + h; k += step * 2) {
    c.beginPath(); c.moveTo(k, y + h); c.lineTo(k + step, y + h); c.lineTo(k + step + h, y); c.lineTo(k + h, y); c.closePath(); c.fill();
  }
  c.restore();
}
// A puff of vapour: three overlapping discs, white, fading with age 0..1.
function puff(c, x, y, r, age) {
  c.save(); c.globalAlpha = Math.max(0, 0.85 * (1 - age));
  circ(c, x, y, r, '#f4fbff'); circ(c, x - r * 0.7, y + r * 0.3, r * 0.7, '#f4fbff'); circ(c, x + r * 0.6, y + r * 0.35, r * 0.65, '#e2f1f8');
  c.restore();
}

// ================================================================ STACKS (crate)
// A — FOIL CRATE. The crate wrapped in gold thermal blanket, as satellites are:
// crumpled facets, two black tie-down straps, a white manifest tag. One facet
// catches the light a ring.
function foilCrate(c, w, h, t) {
  const x0 = 0.8, x1 = w - 0.8, y0 = 1.4, y1 = h;
  // The crumple: a 3x3 lattice of jittered points, each cell two triangles.
  const cols = 3, rows = 3, P = [];
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
    const edge = i === 0 || i === cols || j === 0 || j === rows;
    const jx = edge ? 0 : (hash(i * 7 + j) - 0.5) * 2.4, jy = edge ? 0 : (hash(i * 3 + j * 11) - 0.5) * 2.2;
    P.push([x0 + (x1 - x0) * i / cols + jx, y0 + (y1 - y0) * j / rows + jy]);
  }
  const shades = [FOIL, FOIL_MD, FOIL_LT, FOIL_DK, FOIL, FOIL_MD];
  const glint = frameOf(t, 18, 6);
  let n = 0, sparkle = null;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const a = P[j * 4 + i], b = P[j * 4 + i + 1], d = P[(j + 1) * 4 + i], e = P[(j + 1) * 4 + i + 1];
    for (const tri of [[a, b, e], [a, e, d]]) {
      const lit = n === glint;
      poly(c, tri.flat(), lit ? '#fff6cf' : shades[Math.floor(hash(n * 5.3) * shades.length)]);
      if (lit) {
        // The glint itself: a small four-point star on the facet's centre.
        const gx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, gy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
        sparkle = [gx, gy];
      }
      n++;
    }
  }
  poly(c, [x0, y0, x1, y0, x1, y1, x0, y1], null, INK);
  if (sparkle) {
    const [gx, gy] = sparkle;
    poly(c, [gx, gy - 1.3, gx + 0.3, gy - 0.3, gx + 1.3, gy, gx + 0.3, gy + 0.3, gx, gy + 1.3, gx - 0.3, gy + 0.3, gx - 1.3, gy, gx - 0.3, gy - 0.3], '#ffffff');
  }
  // Straps and their buckles.
  for (const sx of [x0 + 3, x1 - 4.2]) {
    box(c, sx, y0, 1.2, y1 - y0, TAPE_K);
    box(c, sx - 0.3, y0 + (y1 - y0) * 0.45, 1.8, 1.6, CHROME_MD, INK, LWI);
  }
  // Manifest tag with a barcode.
  box(c, w / 2 - 1.9, y0 + 2.2, 3.8, 2.8, '#f6f6f0', INK, LWI);
  for (let k = 0; k < 5; k++) box(c, w / 2 - 1.4 + k * 0.62, y0 + 2.7, k % 2 ? 0.22 : 0.36, 1.8, TAPE_K);
}

// B — SPECIMEN CASE. A chamfered chrome cube with a round porthole; inside, in green
// gel, something small with two eyes bobs and blinks. Amber lamp on the corner.
function specimenCase(c, w, h, t) {
  const x0 = 0.8, x1 = w - 0.8, y0 = 1.2, y1 = h, ch = 2.2;
  poly(c, [x0 + ch, y0, x1 - ch, y0, x1, y0 + ch, x1, y1, x0, y1, x0, y0 + ch], CHROME_MD, INK);
  // Faces: lit left bevel, shaded right.
  poly(c, [x0 + ch, y0, x1 - ch, y0, x1 - ch - 0.6, y0 + 1.2, x0 + ch + 0.6, y0 + 1.2], CHROME);
  poly(c, [x1 - ch, y0, x1, y0 + ch, x1, y1, x1 - 1.4, y1, x1 - 1.4, y0 + ch + 0.6, x1 - ch - 0.6, y0 + 1.2], CHROME_DK);
  box(c, x0, y1 - 1.6, x1 - x0, 1.6, SLATE);
  // The porthole.
  const cx = w / 2 - 0.4, cy = y0 + (y1 - y0) * 0.52, r = 4.4;
  circ(c, cx, cy, r + 0.9, SLATE_DK, INK, LWI);
  circ(c, cx, cy, r, '#2f6b3a');
  c.save(); c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.clip();
  box(c, cx - r, cy - r, 2 * r, 2 * r * 0.35, '#3f8a46');
  const f = frameOf(t, 16, 8), bob = Math.sin(f / 16 * TAU) * 0.9;
  const by = cy + 0.8 + bob;
  c.beginPath(); c.ellipse(cx, by, 2.6, 2.1, 0, 0, TAU); fs(c, GOO, GOO_DK, LWI);
  const blink = f === 11;
  for (const ex of [cx - 1, cx + 1]) {
    if (blink) line(c, ex - 0.45, by - 0.5, ex + 0.45, by - 0.5, INK, 0.35);
    else { circ(c, ex, by - 0.5, 0.62, '#ffffff'); circ(c, ex + 0.15, by - 0.45, 0.3, INK); }
  }
  // Bubbles climbing.
  for (let k = 0; k < 3; k++) {
    const u = ((f / 16) + k / 3) % 1;
    circ(c, cx - 2.6 + k * 2.3, cy + r - u * 2 * r, 0.32, 'rgba(220,255,200,0.75)');
  }
  // The glass sheen.
  c.globalAlpha = 0.35; poly(c, [cx - r, cy - 1, cx - 1, cy - r, cx + 0.6, cy - r, cx - r, cy + 0.6], '#ffffff'); c.globalAlpha = 1;
  c.restore();
  circ(c, cx, cy, r, null, INK, LWI);
  // Status lamp.
  const on = frameOf(t, 4, 2) < 2;
  circ(c, x1 - 1.6, y0 + 2.3, 0.75, on ? AMBER_LT : AMBER, INK, 0.25);
}

// ================================================================ CARGO (magCargo)
// C — FUEL CELL. A faceted canister standing on a tape-banded foot, an orange
// charge band round its waist that pulses, a red flammable diamond.
function fuelCell(c, w, h, t) {
  const x0 = 2.2, x1 = w - 2.2, y0 = 1.2, y1 = h, mid = (x0 + x1) / 2;
  // Cap.
  poly(c, [x0 + 1.6, y0 + 1.2, x0 + 2.6, y0, x1 - 2.6, y0, x1 - 1.6, y0 + 1.2], SLATE, INK, LWI);
  // Three vertical faces.
  const top = y0 + 1.2, foot = y1 - 2.6;
  poly(c, [x0, top + 0.6, x0 + 2.6, top, x0 + 2.6, foot, x0, foot], CHROME);
  poly(c, [x0 + 2.6, top, x1 - 2.6, top, x1 - 2.6, foot, x0 + 2.6, foot], CHROME_MD);
  poly(c, [x1 - 2.6, top, x1, top + 0.6, x1, foot, x1 - 2.6, foot], CHROME_DK);
  poly(c, [x0, top + 0.6, x0 + 2.6, top, x1 - 2.6, top, x1, top + 0.6, x1, foot, x0, foot], null, INK);
  // Charge band.
  const p = frameOf(t, 8, 6), glow = [0, 0.3, 0.6, 1, 1, 0.6, 0.3, 0][p];
  const by = top + (foot - top) * 0.32;
  c.save(); c.globalAlpha = 0.35 * glow; box(c, x0 - 0.8, by - 1.2, x1 - x0 + 1.6, 4.4, HOT_LT); c.restore();
  box(c, x0, by, x1 - x0, 2, glow > 0.5 ? HOT_LT : HOT, INK, LWI);
  box(c, x0 + 2.6, by + 0.5, x1 - x0 - 5.2, 0.6, glow > 0.5 ? HOT_WH : HOT_LT);
  // A charge tick running round the band.
  box(c, x0 + 0.3 + (p / 8) * (x1 - x0 - 1.6), by + 0.3, 1, 1.4, HOT_WH);
  // Flammable diamond.
  const dy = top + (foot - top) * 0.68;
  poly(c, [mid, dy - 1.6, mid + 1.6, dy, mid, dy + 1.6, mid - 1.6, dy], RED, INK, LWI);
  poly(c, [mid, dy - 0.7, mid + 0.4, dy + 0.4, mid - 0.4, dy + 0.4], '#ffffff');
  // Foot.
  tape(c, x0 - 0.6, foot, x1 - x0 + 1.2, y1 - foot);
  box(c, x0 - 0.6, foot, x1 - x0 + 1.2, y1 - foot, null, INK, LWI);
}

// D — MAINTENANCE BOT. A boxy station robot on two tread pods, parked across the
// rail: a dome head whose red visor eye scans, an antenna lamp, a wrench arm.
function maintenanceBot(c, w, h, t) {
  const f = frameOf(t, 12, 6);
  // Treads.
  for (const tx of [1, w - 6.2]) {
    rbox(c, tx, h - 3.2, 5.2, 3.2, 1.6, SLATE_DK, INK, LWI);
    for (let k = 0; k < 3; k++) circ(c, tx + 1.2 + k * 1.4, h - 1.6, 0.5, CHROME_DK);
  }
  // Torso: faceted box.
  const x0 = 2, x1 = w - 2, y0 = 6, y1 = h - 3;
  poly(c, [x0, y0, x1, y0, x1, y1, x0, y1], AMBER, INK);
  poly(c, [x0, y0, x0 + 2.4, y0, x0 + 2.4, y1, x0, y1], AMBER_LT);
  poly(c, [x1 - 2.4, y0, x1, y0, x1, y1, x1 - 2.4, y1], '#c47c22');
  tape(c, x0 + 0.3, y1 - 1.6, x1 - x0 - 0.6, 1.3, 1.4);
  box(c, x0 + 3.4, y0 + 1.4, 4, 2.4, SLATE_DK, INK, LWI);           // vent
  for (let k = 0; k < 3; k++) line(c, x0 + 3.9, y0 + 1.9 + k * 0.7, x0 + 6.9, y0 + 1.9 + k * 0.7, SLATE_LT, 0.25);
  // Head.
  const hx = w / 2 + 0.6, hy = y0;
  c.beginPath(); c.arc(hx, hy, 4, Math.PI, 0); c.closePath(); fs(c, CHROME, INK);
  c.beginPath(); c.arc(hx, hy, 4, -0.6, 0); c.lineTo(hx, hy); c.closePath(); fs(c, CHROME_DK);
  rbox(c, hx - 3, hy - 2.7, 6, 1.6, 0.8, TAPE_K);
  const sweep = [0, 0.5, 1, 1.5, 2, 2.5, 3, 2.5, 2, 1.5, 1, 0.5][f];
  c.save(); c.globalAlpha = 0.45; circ(c, hx - 2.4 + sweep * 1.6, hy - 1.9, 1.4, HOT); c.restore();
  circ(c, hx - 2.4 + sweep * 1.6, hy - 1.9, 0.62, HOT_WH);
  // Antenna.
  line(c, hx + 2, hy - 3.4, hx + 3.2, hy - 6.4, INK, 0.35);
  circ(c, hx + 3.2, hy - 6.6, 0.6, f % 6 < 3 ? AMBER_LT : AMBER, INK, 0.2);
  // Wrench arm, forward (toward the hero), raising and lowering a notch.
  const ay = y0 + 3 + (f < 6 ? 0 : -0.6);
  line(c, x0, y0 + 3, x0 - 1.2, ay, CHROME_DK, 0.9);
  line(c, x0 - 1.2, ay, x0 - 1.2, ay - 2.6, CHROME, 0.7);
  c.beginPath(); c.arc(x0 - 1.2, ay - 3.1, 0.9, 0.6, Math.PI * 2 - 0.6 + Math.PI); pen(c, CHROME, 0.6); c.stroke();
}

// ================================================================ TALL RACK (oxygenRack)
// E — COOLANT RADIATOR. A stack of fins the station dumps heat through: blue-steel,
// frosted at the foot, a glowing ice-blue core seam, and a cold vapour plume off
// the top on a slow cycle. Cold, not hot: it hurts by the frost, so the danger is
// the seam's tape and the plume, not red.
function coolantRadiator(c, w, h, t) {
  const x0 = 1.6, x1 = w - 1.6, base = h, top = h - 17.5;
  box(c, x0 - 0.4, base - 2, x1 - x0 + 0.8, 2, SLATE_DK, INK, LWI);
  const fins = 7, fh = (base - 2 - top) / fins;
  for (let k = 0; k < fins; k++) {
    const y = top + k * fh;
    poly(c, [x0, y + 0.3, x1, y + 0.3, x1 - 0.6, y + fh, x0 + 0.6, y + fh], k % 2 ? ICE_MD : ICE, INK, LWI);
    box(c, x1 - 2.4, y + 0.3, 1.8, fh - 0.3, ICE_DK);
  }
  // Core seam.
  const p = frameOf(t, 10, 5);
  const cx = w / 2 - 0.4;
  box(c, cx - 1, top, 2, base - 2 - top, SLATE_DK, INK, LWI);
  for (let k = 0; k < fins; k++) box(c, cx - 0.5, top + k * fh + 0.6, 1, fh - 1.2, (k + p) % 5 === 0 ? '#ffffff' : ICE_GLOW);
  // Frost at the foot.
  for (let k = 0; k < 6; k++) poly(c, [x0 + k * 2.4, base - 2, x0 + k * 2.4 + 1.2, base - 3.4 - hash(k) * 1.2, x0 + k * 2.4 + 2.4, base - 2], '#f4fbff');
  // Cap and the vapour plume.
  box(c, x0 + 2, top - 1.4, x1 - x0 - 4, 1.4, CHROME_DK, INK, LWI);
  for (let k = 0; k < 3; k++) {
    const u = ((p / 10) + k / 3) % 1;
    puff(c, w / 2 + Math.sin(u * 5 + k) * 1.2, top - 2.2 - u * 3.2, 1.1 + u * 1.2, u);
  }
}

// F — VALVE MANIFOLD. Three pipes out of the deck tied into a header, amber flange
// rings, a red valve wheel that turns, a pressure gauge with its needle shaking in
// the red, and a steam jet spitting from a joint.
function valveManifold(c, w, h, t) {
  const f = frameOf(t, 8, 8);
  const pipes = [[2.2, h - 13], [w / 2 - 1.4, h - 17.5], [w - 5.0, h - 11]];
  for (const [px, py] of pipes) {
    box(c, px, py, 2.8, h - py, CHROME_MD, INK);
    box(c, px, py, 0.9, h - py, CHROME);
    box(c, px + 1.9, py, 0.9, h - py, CHROME_DK);
    box(c, px - 0.5, py + 1.2, 3.8, 1.1, AMBER, INK, LWI);
    box(c, px - 0.5, h - 1.6, 3.8, 1.6, AMBER, INK, LWI);
  }
  // Header pipe.
  const hy = h - 10.4;
  box(c, 2.2, hy, w - 4.4, 2.6, CHROME_MD, INK);
  box(c, 2.2, hy, w - 4.4, 0.8, CHROME);
  // Gauge on the tall pipe.
  const gx = pipes[1][0] + 1.4, gy = pipes[1][1] + 4.6;
  circ(c, gx, gy, 2.1, '#f6f6f0', INK, LWI);
  c.beginPath(); c.arc(gx, gy, 1.6, -0.5, 0.6); pen(c, RED, 0.6); c.stroke();
  const a = 0.05 + [0, 0.18, -0.08, 0.22, 0.02, 0.14, -0.04, 0.2][f];
  line(c, gx, gy, gx + Math.cos(a) * 1.7, gy + Math.sin(a) * 1.7, INK, 0.35);
  // Valve wheel on the header, turning.
  const vx = w / 2 + 2.6, vy = hy + 1.3, r = 2.6, rot = f / 8 * TAU / 3;
  circ(c, vx, vy, r, null, RED_DK, 1.1);
  circ(c, vx, vy, r, null, RED, 0.7);
  for (let k = 0; k < 3; k++) {
    const ang = rot + k * TAU / 3;
    line(c, vx, vy, vx + Math.cos(ang) * r, vy + Math.sin(ang) * r, RED, 0.5);
  }
  circ(c, vx, vy, 0.6, RED_LT, INK, 0.2);
  // Steam from the left joint.
  for (let k = 0; k < 3; k++) {
    const u = ((f / 8) + k / 3) % 1;
    puff(c, 1 + 0.4 * k, hy - 1 - u * 4.5, 0.7 + u, u);
  }
}

// ================================================================ DUCK UNDER (serviceLaser)
// G — WELDING DRONE. A flat faceted service drone, two jade-lit thrusters under it,
// a weld arm forward with a white-hot tip and orange sparks spraying down.
function weldingDrone(c, w, h, t) {
  const f = frameOf(t, 6, 12);
  const cx = w / 2 + 1, cy = h * 0.42;
  // Hull: a flat hexagon, faceted.
  const hull = [cx - 7, cy, cx - 5, cy - 3, cx + 5, cy - 3, cx + 7, cy, cx + 5, cy + 2.6, cx - 5, cy + 2.6];
  poly(c, hull, SLATE, INK);
  poly(c, [cx - 7, cy, cx - 5, cy - 3, cx + 5, cy - 3, cx + 7, cy], SLATE_LT);
  poly(c, [cx - 2.4, cy - 3, cx + 2.4, cy - 3, cx + 1.6, cy - 4.6, cx - 1.6, cy - 4.6], CHROME_MD, INK, LWI);
  box(c, cx - 4.2, cy - 0.7, 8.4, 1.1, TAPE_K);
  circ(c, cx - 2.6, cy - 0.15, 0.55, HOT_WH);
  // Thrusters.
  for (const tx of [cx - 4.8, cx + 4.8]) {
    rbox(c, tx - 1.4, cy + 2.2, 2.8, 1.6, 0.5, CHROME_DK, INK, LWI);
    c.save(); c.globalAlpha = 0.5 + 0.3 * (f % 2); poly(c, [tx - 1, cy + 3.8, tx + 1, cy + 3.8, tx, cy + 6], '#9ff0d2'); c.restore();
  }
  // Weld arm toward the hero and its tip.
  const ax = cx - 7.6, ay = cy + 2.8;
  line(c, cx - 5.6, cy + 1.6, ax, ay, CHROME_DK, 0.8);
  c.save(); c.globalAlpha = 0.4; circ(c, ax - 0.4, ay + 0.6, 1.8, HOT_LT); c.restore();
  circ(c, ax - 0.4, ay + 0.6, 0.7, HOT_WH);
  for (let k = 0; k < 5; k++) {
    const s = hash(k * 13 + f * 7), u = (k / 5 + f / 6) % 1;
    const sx = ax - 0.4 + (s - 0.6) * 4 * u, sy = ay + 0.6 + u * 4.4;
    line(c, sx, sy, sx + (s - 0.5) * 0.8, sy + 0.9, u < 0.5 ? HOT_WH : HOT_LT, 0.3);
  }
}

// H — LOOSE TOOLKIT. Somebody's tool roll, drifting at head height in the zero-g
// bit of the corridor, turning slowly, a spanner and three bolts orbiting it.
function looseToolkit(c, w, h, t) {
  const f = frameOf(t, 16, 6);
  const cx = w / 2, cy = h * 0.48, a = (f / 16) * TAU;
  // Orbiters behind.
  const orbit = (k, front) => {
    const ang = a * 1.4 + k * TAU / 4, z = Math.sin(ang);
    if ((z > 0) !== front) return;
    const ox = cx + Math.cos(ang) * 8.6, oy = cy + Math.sin(ang) * 2.4;
    if (k === 0) {
      c.save(); c.translate(ox, oy); c.rotate(ang * 2);
      line(c, -2.2, 0, 2.2, 0, CHROME, 0.9);
      c.beginPath(); c.arc(-2.4, 0, 1.1, 0.7, TAU - 0.7); pen(c, CHROME, 0.75); c.stroke();
      circ(c, 2.4, 0, 0.8, CHROME_MD, INK, 0.2);
      c.restore();
    } else {
      poly(c, [ox - 0.9, oy - 0.5, ox, oy - 1, ox + 0.9, oy - 0.5, ox + 0.9, oy + 0.5, ox, oy + 1, ox - 0.9, oy + 0.5], AMBER, INK, 0.25);
    }
  };
  for (let k = 0; k < 4; k++) orbit(k, false);
  // The roll, turning a few degrees either way.
  c.save(); c.translate(cx, cy); c.rotate(Math.sin(a) * 0.35);
  rbox(c, -5, -2.8, 10, 5.6, 1.4, '#2d3a44', INK);
  box(c, -5, -0.6, 10, 1.2, AMBER);
  box(c, -1, -2.8, 2, 5.6, SLATE_DK);
  for (const tx of [-3.6, 2.3]) { line(c, tx, -2.8, tx, -4.2, CHROME, 0.6); line(c, tx + 0.8, -2.8, tx + 1.1, -3.8, CHROME_DK, 0.5); }
  c.restore();
  for (let k = 0; k < 4; k++) orbit(k, true);
}

// ================================================================ IN THE RAIL (popSpikes)
// I — PLASMA VENTS. A grate plate set in the rail with three nozzles that fire
// short orange-white jets on a stagger — never all down at once, never below the
// box.
function plasmaVents(c, w, h, t) {
  const f = frameOf(t, 9, 9);
  const n = 3, gap = w / n;
  for (let k = 0; k < n; k++) {
    const x = gap * (k + 0.5), ph = ((f + k * 3) % 9) / 9;
    const jh = 8 + 6 * Math.sin(ph * Math.PI);
    c.save(); c.globalAlpha = 0.45; poly(c, [x - 2.4, h - 3, x + 2.4, h - 3, x + 0.9, h - 3 - jh - 1.5, x - 0.9, h - 3 - jh - 1.5], HOT); c.restore();
    poly(c, [x - 1.7, h - 3, x + 1.7, h - 3, x + 0.6, h - 3 - jh, x - 0.6, h - 3 - jh], HOT_LT);
    poly(c, [x - 0.8, h - 3, x + 0.8, h - 3, x, h - 3 - jh * 0.8], HOT_WH);
  }
  // The plate.
  box(c, 0.6, h - 3.4, w - 1.2, 3.4, SLATE_DK, INK, LWI);
  tape(c, 0.9, h - 3.2, w - 1.8, 0.9, 1.2);
  for (let k = 0; k < n; k++) {
    const x = gap * (k + 0.5);
    rbox(c, x - 2, h - 2.2, 4, 1.6, 0.4, CHROME_DK, INK, 0.2);
    box(c, x - 1.2, h - 1.8, 2.4, 0.6, HOT);
  }
}

// J — MAG CLAMPS. Three heavy horseshoe magnets, red with chrome pole tips, pumping
// up out of the rail a beat apart with a crackle of field between their poles. The
// gravity station's own trap: the thing that holds you to the floor.
function magClamps(c, w, h, t) {
  const f = frameOf(t, 12, 8);
  const n = 3, gap = w / n;
  for (let k = 0; k < n; k++) {
    const x = gap * (k + 0.5), ph = ((f + k * 4) % 12) / 12;
    const up = 10 + 4 * Math.max(0, Math.sin(ph * TAU)); // never below the box
    const top = h - 1 - up, r = 2.4, legW = 1.5;
    // Legs and the U.
    c.beginPath();
    c.moveTo(x - r, h); c.lineTo(x - r, top + r); c.arc(x, top + r, r, Math.PI, 0); c.lineTo(x + r, h);
    c.lineTo(x + r - legW, h); c.lineTo(x + r - legW, top + r); c.arc(x, top + r, r - legW, 0, Math.PI, true);
    c.lineTo(x - r + legW, h); c.closePath(); fs(c, RED, INK, LWI);
    box(c, x - r + 0.2, top + r, 0.5, h - top - r, RED_LT);
    // The open end is down in the rail, so the chrome goes on the crown, the part
    // that reaches you.
    c.beginPath(); c.arc(x, top + r, r, Math.PI, 0); c.arc(x, top + r, r - legW, 0, Math.PI, true); c.closePath(); fs(c, CHROME, INK, 0.25);
    // Field crackle over the crown.
    if ((f + k) % 3 === 0) {
      c.beginPath(); c.moveTo(x - r, top + 1); c.lineTo(x - 0.6, top - 1.4); c.lineTo(x + 0.4, top - 0.2); c.lineTo(x + r, top - 1.8);
      pen(c, '#d9f2ff', 0.35); c.stroke();
    }
  }
  box(c, 0.4, h - 2.2, w - 0.8, 2.2, SLATE_DK, INK, LWI);
  tape(c, 0.7, h - 2, w - 1.4, 0.9, 1.2);
}

// ================================================================ the registry
const SPECS = {
  foilCrate: { box: [12, 11], frames: 18, fps: 6, paint: foilCrate },
  specimenCase: { box: [12, 11], frames: 16, fps: 8, paint: specimenCase },
  fuelCell: { box: [12, 11], frames: 8, fps: 6, paint: fuelCell },
  maintenanceBot: { box: [12, 11], frames: 12, fps: 6, paint: maintenanceBot },
  coolantRadiator: { box: [13, 14], tall: 1.25, frames: 10, fps: 5, paint: coolantRadiator },
  valveManifold: { box: [13, 14], tall: 1.25, frames: 8, fps: 8, paint: valveManifold },
  weldingDrone: { box: [12, 7], visual: 1.35, frames: 6, fps: 12, paint: weldingDrone },
  looseToolkit: { box: [12, 7], visual: 1.35, frames: 16, fps: 6, paint: looseToolkit },
  plasmaVents: { box: [15, 7], tall: 1.75, frames: 9, fps: 9, paint: plasmaVents },
  magClamps: { box: [15, 7], tall: 1.75, frames: 12, fps: 8, paint: magClamps },
};

export function gravityPropEnvelope(name) {
  const s = SPECS[name];
  const vis = s.visual || 1;
  return { w: Math.round(s.box[0] * 4 / 3 * vis), h: Math.round(s.box[1] * 4 / 3 * (s.tall || 1) * vis) };
}

export const GRAVITY_PROP_NAMES = Object.keys(SPECS);
export const GRAVITY_PROP_PAINTERS = {};
export const GRAVITY_PROP_FRAMES = {};
export const GRAVITY_PROP_FPS = {};
export const GRAVITY_PROP_TALL = {};
export const GRAVITY_PROP_VISUAL = {};
export const GRAVITY_PROP_DETAIL = {};
for (const [name, s] of Object.entries(SPECS)) {
  const env = gravityPropEnvelope(name);
  const n = s.frames || 1;
  GRAVITY_PROP_PAINTERS[name] = (ctx, w, h, frame = 0) => {
    ctx.save();
    ctx.scale(w / env.w, h / env.h);
    s.paint(ctx, env.w, env.h, (((Math.floor(frame) % n) + n) % n) / s.fps);
    ctx.restore();
  };
  if (n > 1) { GRAVITY_PROP_FRAMES[name] = n; GRAVITY_PROP_FPS[name] = s.fps; }
  if (s.tall && s.tall !== 1) GRAVITY_PROP_TALL[name] = s.tall;
  if (s.visual) GRAVITY_PROP_VISUAL[name] = s.visual;
  GRAVITY_PROP_DETAIL[name] = 2;
}

// The bake-off sheet paints these directly on its own clock.
export { foilCrate, specimenCase, fuelCell, maintenanceBot, coolantRadiator, valveManifold,
  weldingDrone, looseToolkit, plasmaVents, magClamps };
