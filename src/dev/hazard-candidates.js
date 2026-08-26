// Gallery-only STATIONARY HAZARD concepts. Ten families, three variations each.
//
// The obstacle sheet next door asks "what could a cabinet throw at you"; this
// one asks a narrower question. Every candidate here is a thing that is simply
// THERE — it does not chase, it does not spawn from off-screen, and most of it
// does not move at all. That constraint is the whole point: a hazard that
// stands still has to be legible from its silhouette alone, because the player
// gets no motion cue to classify it with. If a study only reads once it starts
// animating, it has failed the test this sheet exists to run.
//
// So none of these carry the red spike-frame the obstacle sheet paints behind
// its candidates. That marker was there to make neutral props (a drawer, a
// crate, a spool) declare themselves dangerous. Spikes, fire and teeth do not
// need help declaring themselves dangerous, and borrowing the frame would hide
// exactly the failure we are looking for: a hazard whose own shape is mute.
//
// Nothing here is registered as a gameplay entity. Each painter fills a local
// 0..w by 0..h box with the ground line at y = h, so the gallery can place one
// by translation and the art envelope in the table below is a PROPOSAL — no
// hitbox is committed until a look wins. Port a winner by copying one painter
// body into sprites/props.js; delete this file when the sheet is settled.

const TAU = Math.PI * 2;

// ------------------------------------------------------------------ palettes
// Fire is drawn as three nested tongues rather than a gradient: outer, mid,
// core, plus an ink for the outer edge. A gradient reads as a glow at detail
// size and as a beige smudge at lane size; separate value steps survive both.
const FIRE = ['#f2621d', '#ffb02e', '#ffef9e', '#6d2410'];
const GAS = ['#2f7ff2', '#66c8ff', '#e6fbff', '#12325e'];
const TOXIC = ['#4fbf3a', '#a8ec5c', '#eaffc0', '#1c4a17'];

const INK = '#171522';
const STEEL = '#98a3b1';
const STEEL_MID = '#5d6774';
const STEEL_DARK = '#333b46';
const RUST = '#a4603a';
const WOOD = '#8a5a35';
const WOOD_DARK = '#5b3a22';

// ------------------------------------------------------------------- helpers
function path(c, fill, stroke, line, fn) {
  c.beginPath();
  fn(c);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) {
    c.strokeStyle = stroke; c.lineWidth = line;
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.stroke();
  }
}

function rr(c, x, y, w, h, r) {
  const q = Math.min(r, w / 2, h / 2);
  c.moveTo(x + q, y);
  c.lineTo(x + w - q, y); c.quadraticCurveTo(x + w, y, x + w, y + q);
  c.lineTo(x + w, y + h - q); c.quadraticCurveTo(x + w, y + h, x + w - q, y + h);
  c.lineTo(x + q, y + h); c.quadraticCurveTo(x, y + h, x, y + h - q);
  c.lineTo(x, y + q); c.quadraticCurveTo(x, y, x + q, y); c.closePath();
}

function box(c, x, y, w, h, r, fill, ink = INK, line = 0.6) {
  path(c, fill, ink, line, (p) => rr(p, x, y, w, h, r));
}

function line(c, color, width, fn) { path(c, null, color, width, fn); }

function dot(c, x, y, r, fill, ink = null, width = 0.5) {
  path(c, fill, ink, width, (p) => p.arc(x, y, Math.max(0.05, r), 0, TAU));
}

function tri(c, x, y, halfW, height, fill, ink = INK, width = 0.5) {
  path(c, fill, ink, width, (p) => {
    p.moveTo(x - halfW, y); p.lineTo(x, y - height); p.lineTo(x + halfW, y); p.closePath();
  });
}

function shadow(c, w, h, spread = 0.4, alpha = 0.26) {
  c.save(); c.globalAlpha = alpha; c.fillStyle = '#070912';
  c.beginPath(); c.ellipse(w * 0.5, h - h * 0.012, w * spread, Math.max(0.6, h * 0.045), 0, 0, TAU);
  c.fill(); c.restore();
}

// A warm pool on the ground under anything burning. Without it a fire floats:
// the flame is the brightest thing in the tile and nothing else acknowledges it.
function glowPool(c, x, y, rx, ry, color = '#ff9a3c', alpha = 0.3) {
  c.save(); c.globalAlpha = alpha; c.fillStyle = color;
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); c.restore();
}

// One tongue of flame, three layers deep. Each layer licks on its own phase so
// the fire never looks like a single shape being scaled.
function flame(c, x, base, w, h, t, seed = 0, pal = FIRE) {
  for (let layer = 0; layer < 3; layer++) {
    const k = 1 - layer * 0.3;
    const wob = Math.sin(t * 6.2 + seed * 1.7 + layer * 1.9) * w * 0.11;
    const tip = base - h * k * (0.9 + 0.14 * Math.sin(t * 5.1 + seed + layer * 0.8));
    path(c, pal[layer], layer === 0 ? pal[3] : null, Math.max(0.12, w * 0.035), (p) => {
      p.moveTo(x - w * 0.5 * k, base);
      p.quadraticCurveTo(x - w * 0.62 * k + wob, base - h * k * 0.42, x + wob * 0.7, tip);
      p.quadraticCurveTo(x + w * 0.62 * k + wob, base - h * k * 0.42, x + w * 0.5 * k, base);
      p.closePath();
    });
  }
}

function embers(c, x, base, w, h, t, n = 5, seed = 0, color = '#ffca55') {
  for (let i = 0; i < n; i++) {
    const p = (t * 0.42 + i / n + seed * 0.31) % 1;
    const ex = x + Math.sin(seed + i * 2.1 + p * 4.6) * w * 0.45;
    const ey = base - p * h;
    c.save(); c.globalAlpha = Math.max(0, 1 - p) * 0.9;
    dot(c, ex, ey, Math.max(0.12, w * 0.05 * (1 - p * 0.55)), color);
    c.restore();
  }
}

function smoke(c, x, base, w, h, t, n = 3, seed = 0) {
  for (let i = 0; i < n; i++) {
    const p = (t * 0.2 + i / n + seed * 0.17) % 1;
    c.save(); c.globalAlpha = 0.22 * (1 - p);
    dot(c, x + Math.sin(seed + i + p * 3) * w * 0.4, base - p * h, w * (0.12 + 0.28 * p), '#c9cddb');
    c.restore();
  }
}

// A jagged arc between two points, re-cut on a step clock. Electricity that
// wiggles smoothly reads as a rope; it has to SNAP between shapes.
function arc(c, x0, y0, x1, y1, t, seed, color, width, chaos = 0.28) {
  const step = Math.floor(t * 14 + seed);
  line(c, color, width, (p) => {
    p.moveTo(x0, y0);
    for (let i = 1; i < 5; i++) {
      const k = i / 5;
      const nx = Math.sin(step * 2.7 + i * 5.1 + seed) * chaos;
      const ny = Math.sin(step * 1.9 + i * 3.3 + seed * 2) * chaos;
      p.lineTo(x0 + (x1 - x0) * k + (y1 - y0) * nx, y0 + (y1 - y0) * k + (x1 - x0) * ny);
    }
    p.lineTo(x1, y1);
  });
}

// The three-band hazard chevron used on plate steel throughout the sheet.
function hazardStripe(c, x, y, w, h, phase = 0) {
  c.save();
  c.beginPath(); rr(c, x, y, w, h, Math.min(h * 0.3, 0.6)); c.clip();
  c.fillStyle = '#f2c53c'; c.fillRect(x, y, w, h);
  c.fillStyle = '#1d1c26';
  const band = h * 1.1;
  for (let bx = -h * 2 + (phase % (band * 2)); bx < w + h * 2; bx += band * 2) {
    path(c, '#1d1c26', null, 0, (p) => {
      p.moveTo(x + bx, y + h); p.lineTo(x + bx + h, y);
      p.lineTo(x + bx + h + band, y); p.lineTo(x + bx + band, y + h); p.closePath();
    });
  }
  c.restore();
}

function rivet(c, x, y, r) {
  dot(c, x, y, r, '#c3ccd6', '#2a303a', Math.max(0.12, r * 0.4));
}

// ============================================================ 1. SPIKE FAMILY
function drawSpikeStrip(c, w, h, t) {
  shadow(c, w, h, 0.46);
  const teethY = h * 0.72;
  box(c, w * 0.03, teethY, w * 0.94, h - teethY - h * 0.02, h * 0.08, STEEL_DARK);
  hazardStripe(c, w * 0.06, teethY + h * 0.07, w * 0.88, h * 0.11);
  const n = 7;
  for (let i = 0; i < n; i++) {
    const x = w * (0.1 + i * 0.8 / (n - 1));
    tri(c, x, teethY + h * 0.02, w * 0.045, h * 0.66, i % 2 ? '#b9c4d0' : STEEL, '#232a34', Math.max(0.15, w * 0.012));
    // A single travelling glint is the only motion a fixed spike gets, and it
    // is what stops the row reading as printed-on scenery.
    const glint = (t * 0.5) % 1;
    if (Math.abs(glint - i / n) < 0.08) {
      line(c, '#ffffff', Math.max(0.18, w * 0.016), (p) => {
        p.moveTo(x - w * 0.012, teethY - h * 0.4); p.lineTo(x + w * 0.004, teethY - h * 0.56);
      });
    }
  }
}

function drawPopSpikes(c, w, h, t) {
  // Two-thirds down, one-third up: a trap that is safe more often than not is
  // a timing puzzle; one that is up more often than not is just a wall.
  const cycle = (t * 0.55) % 1;
  const up = cycle < 0.34 ? Math.min(1, cycle / 0.09) : Math.max(0, 1 - (cycle - 0.34) / 0.09);
  shadow(c, w, h, 0.44);
  const plateY = h * 0.74;
  const n = 5;
  for (let i = 0; i < n; i++) {
    const x = w * (0.16 + i * 0.68 / (n - 1));
    c.save();
    c.beginPath(); c.rect(0, -h, w, plateY + h); c.clip();
    tri(c, x, plateY + h * 0.03, w * 0.055, h * (0.06 + 0.62 * up), '#cfd8e2', '#232a34', Math.max(0.15, w * 0.012));
    c.restore();
  }
  box(c, w * 0.05, plateY, w * 0.9, h * 0.2, h * 0.06, '#454f5c');
  for (let i = 0; i < n; i++) {
    const x = w * (0.16 + i * 0.68 / (n - 1));
    // The slot stays visible when the spike is down: that hole IS the warning.
    box(c, x - w * 0.06, plateY + h * 0.03, w * 0.12, h * 0.05, h * 0.02, '#12161d', '#2b323c', Math.max(0.12, w * 0.01));
  }
  box(c, w * 0.05, plateY + h * 0.13, w * 0.9, h * 0.05, h * 0.02, null, '#232a34', Math.max(0.12, w * 0.01));
  hazardStripe(c, w * 0.07, plateY + h * 0.13, w * 0.86, h * 0.055, up * 3);
  rivet(c, w * 0.09, plateY + h * 0.09, Math.max(0.2, w * 0.018));
  rivet(c, w * 0.91, plateY + h * 0.09, Math.max(0.2, w * 0.018));
}

function drawCaltrops(c, w, h, t) {
  shadow(c, w, h, 0.48, 0.2);
  const set = [[0.2, 0.86, 1], [0.5, 0.92, 1.25], [0.78, 0.84, 0.95], [0.36, 0.97, 0.8]];
  for (let i = 0; i < set.length; i++) {
    const [fx, fy, s] = set[i];
    const x = w * fx, y = h * fy, r = h * 0.3 * s;
    const tip = Math.sin(t * 1.4 + i * 2) * 0.05;
    c.save(); c.translate(x, y); c.rotate(tip);
    for (const a of [-2.55, -0.6, -1.57, 0.15]) {
      line(c, i % 2 ? '#b0632f' : RUST, Math.max(0.22, r * 0.24), (p) => {
        p.moveTo(0, 0); p.lineTo(Math.cos(a) * r, Math.sin(a) * r * (a === 0.15 ? 0.35 : 1));
      });
      tri(c, Math.cos(a) * r, Math.sin(a) * r * (a === 0.15 ? 0.35 : 1) + r * 0.1, r * 0.14, r * 0.3, '#d8dde4', '#2b2118', Math.max(0.1, r * 0.06));
    }
    dot(c, 0, 0, r * 0.2, '#8c4f26', '#2b2118', Math.max(0.1, r * 0.07));
    c.restore();
  }
}

// ============================================================= 2. SMALL FIRES
function drawLogFire(c, w, h, t) {
  shadow(c, w, h, 0.44, 0.18);
  glowPool(c, w * 0.5, h * 0.95, w * 0.52, h * 0.09, '#ff8a2c', 0.34);
  // Logs first so the flame sits INSIDE the pile rather than on top of it.
  for (const [x0, y0, x1, y1, col] of [
    [0.14, 0.94, 0.7, 0.78, WOOD], [0.86, 0.94, 0.3, 0.78, WOOD_DARK], [0.24, 0.86, 0.78, 0.9, '#7a4c2c'],
  ]) {
    line(c, '#2c1a10', Math.max(0.3, w * 0.13), (p) => { p.moveTo(w * x0, h * y0); p.lineTo(w * x1, h * y1); });
    line(c, col, Math.max(0.22, w * 0.1), (p) => { p.moveTo(w * x0, h * y0); p.lineTo(w * x1, h * y1); });
  }
  flame(c, w * 0.5, h * 0.86, w * 0.5, h * 0.66, t, 0);
  flame(c, w * 0.31, h * 0.9, w * 0.26, h * 0.34, t, 2.4);
  flame(c, w * 0.68, h * 0.9, w * 0.23, h * 0.3, t, 4.1);
  embers(c, w * 0.5, h * 0.5, w, h * 0.5, t, 5, 1);
  smoke(c, w * 0.52, h * 0.3, w * 0.5, h * 0.32, t, 3, 0.5);
}

function drawGasJet(c, w, h, t) {
  // Off, then a hard on. A jet that merely breathes is scenery; the whole
  // gameplay claim of this one is that there is a window with no flame in it.
  const cycle = (t * 0.62) % 1;
  const on = cycle < 0.46 ? Math.min(1, cycle / 0.06) : Math.max(0, 1 - (cycle - 0.46) / 0.05);
  shadow(c, w, h, 0.42);
  const grateY = h * 0.86;
  box(c, w * 0.06, grateY, w * 0.88, h * 0.13, h * 0.02, '#3c444f');
  for (let i = 0; i < 5; i++) {
    box(c, w * (0.12 + i * 0.155), grateY + h * 0.025, w * 0.1, h * 0.08, h * 0.012, '#151a21', '#4d5763', Math.max(0.12, w * 0.02));
  }
  if (on > 0.02) {
    glowPool(c, w * 0.5, grateY + h * 0.06, w * 0.55 * on, h * 0.05, '#66c8ff', 0.4 * on);
    c.save(); c.globalAlpha = Math.min(1, on * 1.2);
    // Blue at the root, orange at the tip: a gas flame is two fires stacked,
    // and painting only the orange half loses what makes it read as a JET.
    flame(c, w * 0.5, grateY + h * 0.01, w * 0.34, h * 0.86 * on, t, 0, GAS);
    flame(c, w * 0.5, grateY - h * 0.44 * on, w * 0.24, h * 0.42 * on, t, 1.6, FIRE);
    c.restore();
    embers(c, w * 0.5, grateY - h * 0.5 * on, w * 0.6, h * 0.4, t, 4, 2, '#bfe8ff');
  } else {
    // The tell during the safe window: heat shimmer over live vents.
    c.save(); c.globalAlpha = 0.5;
    for (let i = 0; i < 3; i++) {
      line(c, '#7fd0ff', Math.max(0.14, w * 0.02), (p) => {
        const x = w * (0.3 + i * 0.2);
        p.moveTo(x, grateY - h * 0.02);
        p.quadraticCurveTo(x + Math.sin(t * 5 + i) * w * 0.05, grateY - h * 0.12, x, grateY - h * 0.2);
      });
    }
    c.restore();
  }
}

function drawEmberPatch(c, w, h, t) {
  shadow(c, w, h, 0.5, 0.14);
  glowPool(c, w * 0.5, h * 0.9, w * 0.5, h * 0.28, '#ff6a22', 0.34);
  path(c, '#2a1b16', '#170f0c', Math.max(0.15, h * 0.05), (p) => {
    p.moveTo(w * 0.05, h * 0.99);
    p.quadraticCurveTo(w * 0.22, h * 0.6, w * 0.46, h * 0.68);
    p.quadraticCurveTo(w * 0.72, h * 0.56, w * 0.96, h * 0.99);
    p.closePath();
  });
  for (let i = 0; i < 9; i++) {
    const x = w * (0.1 + (i * 0.0917) % 0.82);
    const y = h * (0.78 + ((i * 7) % 3) * 0.06);
    const heat = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 3.2 + i * 1.9));
    c.save(); c.globalAlpha = 0.45 + 0.55 * heat;
    dot(c, x, y, h * 0.11, heat > 0.7 ? '#ffcf5c' : '#e2521c');
    c.restore();
  }
  // One lick every second or so: proof the bed is alive, not a painted decal.
  const lick = (t * 0.8) % 1;
  if (lick < 0.3) {
    c.save(); c.globalAlpha = Math.sin(lick / 0.3 * Math.PI);
    flame(c, w * (0.3 + 0.4 * ((Math.floor(t * 0.8) * 0.37) % 1)), h * 0.8, w * 0.2, h * 0.85, t, 3);
    c.restore();
  }
  embers(c, w * 0.5, h * 0.72, w * 0.9, h * 0.55, t, 4, 0.7);
}

// ================================================================= 3. BARRELS
function barrelBody(c, x, y, bw, bh, fill, dark, bandCol = '#4a5460') {
  box(c, x, y, bw, bh, bw * 0.14, fill);
  path(c, dark, null, 0, (p) => rr(p, x + bw * 0.72, y + bh * 0.03, bw * 0.24, bh * 0.94, bw * 0.1));
  for (const f of [0.16, 0.5, 0.84]) {
    box(c, x - bw * 0.03, y + bh * f - bh * 0.045, bw * 1.06, bh * 0.09, bh * 0.02, bandCol, INK, Math.max(0.12, bw * 0.02));
  }
}

function drawFireBarrel(c, w, h, t) {
  shadow(c, w, h, 0.4);
  glowPool(c, w * 0.5, h * 0.97, w * 0.55, h * 0.035, '#ff8a2c', 0.3);
  const bx = w * 0.16, by = h * 0.36, bw = w * 0.68, bh = h * 0.62;
  barrelBody(c, bx, by, bw, bh, RUST, '#7c4526');
  // Rust-through holes lit from inside. This is the detail that says the fire
  // is IN the drum rather than balanced on the rim.
  for (const [fx, fy, r] of [[0.32, 0.42, 0.055], [0.6, 0.66, 0.045], [0.44, 0.78, 0.035]]) {
    dot(c, bx + bw * fx, by + bh * fy, w * r, '#ffb03a', '#5e2f16', Math.max(0.12, w * 0.014));
  }
  path(c, '#2a1a12', '#120c09', Math.max(0.15, w * 0.02), (p) => {
    p.ellipse(bx + bw * 0.5, by, bw * 0.5, bh * 0.09, 0, 0, TAU);
  });
  flame(c, w * 0.5, by + h * 0.02, w * 0.56, h * 0.42, t, 0);
  flame(c, w * 0.36, by + h * 0.02, w * 0.24, h * 0.2, t, 2.2);
  flame(c, w * 0.64, by + h * 0.01, w * 0.22, h * 0.24, t, 3.9);
  embers(c, w * 0.5, by - h * 0.06, w * 0.8, h * 0.34, t, 5, 1.3);
  smoke(c, w * 0.52, by - h * 0.24, w * 0.5, h * 0.3, t, 3, 0.9);
}

function drawTippedBarrel(c, w, h, t) {
  shadow(c, w, h, 0.46);
  const bx = w * 0.04, by = h * 0.42, bw = w * 0.5, bh = h * 0.5;
  // Rotated 90 degrees: same barrel painter, laid on its side so the family
  // reads as one object in three states rather than three different props.
  c.save(); c.translate(bx + bw * 0.5, by + bh * 0.5); c.rotate(Math.PI / 2);
  barrelBody(c, -bh * 0.5, -bw * 0.5, bh, bw, '#9c5b34', '#6f3f21');
  c.restore();
  path(c, '#2a1a12', '#120c09', Math.max(0.15, w * 0.018), (p) => {
    p.ellipse(bx + bw * 0.98, by + bh * 0.5, bw * 0.07, bh * 0.42, 0, 0, TAU);
  });
  // The spill is the hazard; the barrel is only where it came from.
  glowPool(c, w * 0.66, h * 0.94, w * 0.36, h * 0.07, '#ff7a1e', 0.42);
  path(c, '#3a1c10', '#1b0d08', Math.max(0.12, w * 0.015), (p) => {
    p.moveTo(w * 0.5, h * 0.98);
    p.quadraticCurveTo(w * 0.62, h * 0.82, w * 0.8, h * 0.88);
    p.quadraticCurveTo(w * 0.97, h * 0.92, w * 0.99, h * 0.99);
    p.closePath();
  });
  for (let i = 0; i < 4; i++) {
    const x = w * (0.58 + i * 0.11);
    flame(c, x, h * 0.95, w * 0.15, h * (0.26 + 0.1 * Math.sin(t * 3 + i * 2)), t, i * 1.7);
  }
  flame(c, bx + bw * 1.02, by + bh * 0.5, w * 0.12, h * 0.2, t, 5.2);
  embers(c, w * 0.72, h * 0.7, w * 0.5, h * 0.4, t, 4, 2.1);
}

function drawToxicBarrel(c, w, h, t) {
  // The odd one out on purpose: no flame at all, so the sheet can test whether
  // colour alone (acid green against warm cabinets) carries the same warning
  // that fire does. If it does not, this family is a fire family.
  shadow(c, w, h, 0.4);
  const bx = w * 0.2, by = h * 0.3, bw = w * 0.6, bh = h * 0.6;
  glowPool(c, w * 0.5, h * 0.95, w * 0.6, h * 0.06, '#7ee03a', 0.3);
  path(c, '#2f4a1c', '#1b2f11', Math.max(0.12, w * 0.015), (p) => {
    p.moveTo(w * 0.06, h * 0.99);
    p.quadraticCurveTo(w * 0.3, h * 0.88, w * 0.52, h * 0.93);
    p.quadraticCurveTo(w * 0.82, h * 0.86, w * 0.96, h * 0.99);
    p.closePath();
  });
  path(c, TOXIC[1], TOXIC[3], Math.max(0.12, w * 0.015), (p) => {
    p.moveTo(w * 0.1, h * 0.99);
    p.quadraticCurveTo(w * 0.32, h * 0.9, w * 0.54, h * 0.95);
    p.quadraticCurveTo(w * 0.8, h * 0.89, w * 0.92, h * 0.99);
    p.closePath();
  });
  for (let i = 0; i < 4; i++) {
    const p = (t * 0.6 + i * 0.27) % 1;
    c.save(); c.globalAlpha = 1 - p;
    dot(c, w * (0.2 + i * 0.2), h * (0.95 - p * 0.12), w * 0.035 * (0.4 + p), TOXIC[2], TOXIC[3], Math.max(0.08, w * 0.008));
    c.restore();
  }
  barrelBody(c, bx, by, bw, bh, '#3f7a2a', '#27541a', '#7f8a95');
  // Trefoil: three wedges around a hub, the one symbol nobody has to be taught.
  const cx = bx + bw * 0.45, cy = by + bh * 0.44, r = bw * 0.3;
  dot(c, cx, cy, r * 1.05, '#12200c', null, 0);
  for (let i = 0; i < 3; i++) {
    const a = i * TAU / 3 - Math.PI / 2;
    path(c, TOXIC[1], null, 0, (p) => {
      p.moveTo(cx, cy); p.arc(cx, cy, r, a - 0.5, a + 0.5); p.closePath();
    });
  }
  dot(c, cx, cy, r * 0.26, '#12200c');
  const drip = (t * 0.5) % 1;
  dot(c, bx + bw * 0.88, by + bh * (0.3 + drip * 0.72), w * 0.03 * (1 - drip * 0.3), TOXIC[1], TOXIC[3], Math.max(0.08, w * 0.008));
}

// ================================================================= 4. BRAZIER
function drawTripodBrazier(c, w, h, t) {
  shadow(c, w, h, 0.4);
  glowPool(c, w * 0.5, h * 0.96, w * 0.5, h * 0.04, '#ff9a3c', 0.28);
  const bowlY = h * 0.5;
  for (const s of [-1, 0.15, 1]) {
    line(c, STEEL_DARK, Math.max(0.2, w * 0.06), (p) => {
      p.moveTo(w * (0.5 + s * 0.14), bowlY + h * 0.06);
      p.lineTo(w * (0.5 + s * 0.32), h * 0.97);
    });
  }
  line(c, STEEL_MID, Math.max(0.15, w * 0.035), (p) => {
    p.moveTo(w * 0.24, h * 0.76); p.lineTo(w * 0.76, h * 0.76);
  });
  path(c, '#4d4038', '#231b16', Math.max(0.15, w * 0.03), (p) => {
    p.moveTo(w * 0.2, bowlY); p.lineTo(w * 0.8, bowlY);
    p.quadraticCurveTo(w * 0.72, bowlY + h * 0.2, w * 0.5, bowlY + h * 0.21);
    p.quadraticCurveTo(w * 0.28, bowlY + h * 0.2, w * 0.2, bowlY); p.closePath();
  });
  path(c, '#6a5a4c', '#231b16', Math.max(0.12, w * 0.025), (p) => {
    p.ellipse(w * 0.5, bowlY, w * 0.3, h * 0.05, 0, 0, TAU);
  });
  for (let i = 0; i < 5; i++) {
    const heat = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7);
    dot(c, w * (0.32 + i * 0.09), bowlY + h * 0.005, w * 0.045, heat > 0.6 ? '#ffbe4c' : '#d3491a');
  }
  flame(c, w * 0.5, bowlY - h * 0.005, w * 0.44, h * 0.44, t, 0);
  flame(c, w * 0.37, bowlY, w * 0.2, h * 0.2, t, 2.7);
  flame(c, w * 0.63, bowlY, w * 0.18, h * 0.22, t, 4.4);
  embers(c, w * 0.5, bowlY - h * 0.1, w * 0.7, h * 0.36, t, 5, 1.1);
}

function drawTorchPost(c, w, h, t) {
  shadow(c, w, h, 0.34);
  const headY = h * 0.3;
  line(c, WOOD_DARK, Math.max(0.25, w * 0.16), (p) => { p.moveTo(w * 0.5, h * 0.98); p.lineTo(w * 0.5, headY); });
  line(c, WOOD, Math.max(0.15, w * 0.08), (p) => { p.moveTo(w * 0.47, h * 0.96); p.lineTo(w * 0.47, headY); });
  for (const f of [0.42, 0.56]) {
    box(c, w * 0.34, h * f, w * 0.32, h * 0.035, h * 0.012, '#3b3129', INK, Math.max(0.1, w * 0.02));
  }
  path(c, '#c9b68e', '#4a3d2c', Math.max(0.12, w * 0.03), (p) => {
    p.moveTo(w * 0.36, headY + h * 0.06);
    p.quadraticCurveTo(w * 0.3, headY - h * 0.03, w * 0.5, headY - h * 0.05);
    p.quadraticCurveTo(w * 0.7, headY - h * 0.03, w * 0.64, headY + h * 0.06);
    p.closePath();
  });
  flame(c, w * 0.5, headY - h * 0.02, w * 0.62, h * 0.32, t, 0);
  flame(c, w * 0.42, headY, w * 0.28, h * 0.16, t, 3.1);
  embers(c, w * 0.5, headY - h * 0.1, w * 0.7, h * 0.24, t, 4, 0.6);
  // A drip of burning pitch keeps the ground under it dangerous too, which is
  // the argument for a torch over a brazier: it threatens two heights at once.
  const drip = (t * 0.55) % 1;
  if (drip > 0.15) {
    c.save(); c.globalAlpha = Math.min(1, (drip - 0.15) * 4);
    dot(c, w * 0.58, headY + h * 0.06 + drip * h * 0.6, w * 0.05 * (1 - drip * 0.4), '#ff8a2c', '#6d2410', Math.max(0.08, w * 0.01));
    c.restore();
  }
  glowPool(c, w * 0.5, h * 0.97, w * 0.4, h * 0.02, '#ff9a3c', 0.24);
}

function drawHangLantern(c, w, h, t) {
  // The only mover in the family: hung from the ceiling on a chain, so it
  // occupies a height a standing hazard cannot and telegraphs by swinging.
  const sway = Math.sin(t * 1.55) * 0.24;
  c.save(); c.translate(w * 0.5, 0); c.rotate(sway);
  line(c, STEEL_MID, Math.max(0.15, w * 0.035), (p) => { p.moveTo(0, 0); p.lineTo(0, h * 0.3); });
  for (let i = 0; i < 4; i++) {
    dot(c, 0, h * (0.05 + i * 0.065), w * 0.04, null, STEEL, Math.max(0.1, w * 0.022));
  }
  const cy = h * 0.32, ch = h * 0.5, cw = w * 0.56;
  path(c, '#3a4049', INK, Math.max(0.12, w * 0.03), (p) => {
    p.moveTo(-cw * 0.34, cy); p.lineTo(cw * 0.34, cy);
    p.lineTo(cw * 0.5, cy + ch * 0.2); p.lineTo(cw * 0.42, cy + ch);
    p.lineTo(-cw * 0.42, cy + ch); p.lineTo(-cw * 0.5, cy + ch * 0.2); p.closePath();
  });
  c.save();
  c.beginPath();
  c.moveTo(-cw * 0.34, cy); c.lineTo(cw * 0.34, cy);
  c.lineTo(cw * 0.5, cy + ch * 0.2); c.lineTo(cw * 0.42, cy + ch);
  c.lineTo(-cw * 0.42, cy + ch); c.lineTo(-cw * 0.5, cy + ch * 0.2); c.closePath();
  c.clip();
  glowPool(c, 0, cy + ch * 0.6, cw * 0.5, ch * 0.45, '#ffb03a', 0.5);
  flame(c, 0, cy + ch * 0.92, cw * 0.5, ch * 0.72, t, 0);
  c.restore();
  for (let i = 1; i < 4; i++) {
    line(c, '#20252c', Math.max(0.1, w * 0.022), (p) => {
      p.moveTo(-cw * 0.5 + cw * i * 0.25, cy + ch * 0.14); p.lineTo(-cw * 0.46 + cw * i * 0.25, cy + ch);
    });
  }
  line(c, '#20252c', Math.max(0.1, w * 0.022), (p) => { p.moveTo(-cw * 0.47, cy + ch * 0.55); p.lineTo(cw * 0.47, cy + ch * 0.55); });
  c.restore();
  c.save(); c.globalAlpha = 0.22;
  c.fillStyle = '#ff9a3c';
  c.beginPath(); c.ellipse(w * 0.5 + Math.sin(sway) * h * 0.7, h * 0.98, w * 0.4, h * 0.02, 0, 0, TAU); c.fill();
  c.restore();
}

// ==================================================================== 5. SAWS
function bladeDisc(c, x, y, r, t, spin, teeth = 12) {
  c.save(); c.translate(x, y); c.rotate(t * spin);
  path(c, '#c9d3de', '#2b323c', Math.max(0.12, r * 0.06), (p) => {
    for (let i = 0; i < teeth; i++) {
      const a = i * TAU / teeth;
      const a2 = (i + 0.5) * TAU / teeth;
      if (i === 0) p.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else p.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      p.lineTo(Math.cos(a2) * r * 0.82, Math.sin(a2) * r * 0.82);
    }
    p.closePath();
  });
  dot(c, 0, 0, r * 0.62, '#98a3b1', '#2b323c', Math.max(0.1, r * 0.05));
  for (let i = 0; i < 3; i++) {
    const a = i * TAU / 3 + 0.4;
    dot(c, Math.cos(a) * r * 0.38, Math.sin(a) * r * 0.38, r * 0.12, '#4a535e');
  }
  dot(c, 0, 0, r * 0.14, '#333b46');
  c.restore();
}

function sparks(c, x, y, r, t, seed, n = 5) {
  for (let i = 0; i < n; i++) {
    const p = (t * 2.4 + i / n + seed) % 1;
    const a = -1.9 + Math.sin(seed + i * 3.1) * 0.9;
    c.save(); c.globalAlpha = 1 - p;
    line(c, i % 2 ? '#fff0b0' : '#ffb03a', Math.max(0.1, r * 0.08), (p2) => {
      p2.moveTo(x + Math.cos(a) * r * p * 2.2, y + Math.sin(a) * r * p * 2.2 + p * p * r * 1.6);
      p2.lineTo(x + Math.cos(a) * r * p * 2.5, y + Math.sin(a) * r * p * 2.5 + p * p * r * 1.9);
    });
    c.restore();
  }
}

function drawFloorSaw(c, w, h, t) {
  shadow(c, w, h, 0.46);
  const slotY = h * 0.78;
  c.save();
  c.beginPath(); c.rect(0, -h, w, slotY + h); c.clip();
  bladeDisc(c, w * 0.5, slotY + h * 0.16, Math.min(w * 0.32, h * 0.72), t, 4.2);
  c.restore();
  box(c, w * 0.04, slotY, w * 0.92, h * 0.2, h * 0.05, '#454f5c');
  box(c, w * 0.22, slotY + h * 0.02, w * 0.56, h * 0.06, h * 0.02, '#10141a', '#2b323c', Math.max(0.1, w * 0.012));
  hazardStripe(c, w * 0.06, slotY + h * 0.11, w * 0.88, h * 0.06, t * 2);
  sparks(c, w * 0.3, slotY, Math.min(w, h) * 0.14, t, 1.2, 4);
  sparks(c, w * 0.7, slotY, Math.min(w, h) * 0.14, t, 3.4, 4);
}

function drawPendulumBlade(c, w, h, t) {
  // Stationary in X, huge in Y: the family's answer to "can a hazard own a
  // whole lane column without ever moving down it".
  const swing = Math.sin(t * 1.7) * 0.62;
  const pivotY = h * 0.08;
  box(c, w * 0.3, 0, w * 0.4, h * 0.09, h * 0.02, STEEL_DARK);
  dot(c, w * 0.5, pivotY, Math.max(0.3, w * 0.06), '#6d7783', INK, Math.max(0.1, w * 0.018));
  c.save(); c.translate(w * 0.5, pivotY); c.rotate(swing);
  const armLen = h * 0.6;
  line(c, INK, Math.max(0.2, w * 0.09), (p) => { p.moveTo(0, 0); p.lineTo(0, armLen); });
  line(c, STEEL_MID, Math.max(0.15, w * 0.05), (p) => { p.moveTo(0, 0); p.lineTo(0, armLen); });
  bladeDisc(c, 0, armLen + h * 0.16, Math.min(w * 0.44, h * 0.2), t, -5.5, 14);
  c.restore();
  // The trail is the tell: a still frame has to show where this thing has been.
  c.save(); c.globalAlpha = 0.16;
  path(c, '#8ec6ff', null, 0, (p) => {
    p.arc(w * 0.5, pivotY, h * 0.78, Math.PI / 2 - 0.62, Math.PI / 2 + 0.62);
    p.arc(w * 0.5, pivotY, h * 0.6, Math.PI / 2 + 0.62, Math.PI / 2 - 0.62, true);
    p.closePath();
  });
  c.restore();
  shadow(c, w, h, 0.24, 0.18);
}

function drawBuzzPost(c, w, h, t) {
  shadow(c, w, h, 0.36);
  box(c, w * 0.3, h * 0.74, w * 0.4, h * 0.24, h * 0.03, '#3f4854');
  box(c, w * 0.16, h * 0.94, w * 0.68, h * 0.06, h * 0.02, STEEL_DARK);
  const bx = w * 0.5, by = h * 0.44, r = Math.min(w * 0.36, h * 0.26);
  bladeDisc(c, bx, by, r, t, 6.2, 14);
  // A guard hood over the top half is what makes this a MACHINE rather than a
  // blade someone left standing up, and it caps the silhouette convincingly.
  path(c, '#5a6470', INK, Math.max(0.14, w * 0.035), (p) => {
    p.arc(bx, by, r * 1.22, Math.PI * 1.05, Math.PI * 1.95);
    p.arc(bx, by, r * 0.92, Math.PI * 1.95, Math.PI * 1.05, true);
    p.closePath();
  });
  box(c, w * 0.36, h * 0.62, w * 0.28, h * 0.16, h * 0.03, '#6c7683');
  dot(c, w * 0.5, h * 0.7, w * 0.06, (Math.floor(t * 6) % 2) ? '#ff493d' : '#5a1f22', INK, Math.max(0.1, w * 0.016));
  sparks(c, bx - r * 0.7, by + r * 0.6, r * 0.4, t, 2.2, 5);
}

// =============================================================== 6. ELECTRICS
function drawTeslaCoil(c, w, h, t) {
  shadow(c, w, h, 0.36);
  box(c, w * 0.22, h * 0.78, w * 0.56, h * 0.2, h * 0.02, '#3d4652');
  hazardStripe(c, w * 0.25, h * 0.86, w * 0.5, h * 0.06);
  box(c, w * 0.36, h * 0.34, w * 0.28, h * 0.45, w * 0.04, '#6b4e2e');
  for (let i = 0; i < 9; i++) {
    line(c, i % 2 ? '#d8a24c' : '#a87b32', Math.max(0.1, h * 0.014), (p) => {
      p.moveTo(w * 0.36, h * (0.37 + i * 0.047)); p.lineTo(w * 0.64, h * (0.37 + i * 0.047));
    });
  }
  const ball = h * 0.1;
  dot(c, w * 0.5, h * 0.26, ball, '#b9c4d0', '#2b323c', Math.max(0.12, w * 0.02));
  dot(c, w * 0.46, h * 0.23, ball * 0.35, '#eef3f8');
  const live = 0.5 + 0.5 * Math.sin(t * 3.4);
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i - 1) * 1.05 + Math.sin(t * 2 + i) * 0.25;
    const len = h * (0.16 + 0.1 * live);
    arc(c, w * 0.5, h * 0.26, w * 0.5 + Math.cos(a) * len * 1.4, h * 0.26 + Math.sin(a) * len,
      t, i * 3.1, '#9ef0ff', Math.max(0.12, w * 0.03));
    arc(c, w * 0.5, h * 0.26, w * 0.5 + Math.cos(a) * len * 1.4, h * 0.26 + Math.sin(a) * len,
      t, i * 3.1, '#ffffff', Math.max(0.06, w * 0.012));
  }
  c.restore();
  c.save(); c.globalAlpha = 0.2 * live; dot(c, w * 0.5, h * 0.26, ball * 2.6, '#7ee8ff'); c.restore();
}

function drawLiveWire(c, w, h, t) {
  shadow(c, w, h, 0.5, 0.2);
  // The severed end whips; the rest of the cable is dead weight on the floor.
  const whip = Math.sin(t * 4.4) * h * 0.3;
  line(c, '#1b1f27', Math.max(0.25, h * 0.16), (p) => {
    p.moveTo(0, h * 0.94);
    p.quadraticCurveTo(w * 0.24, h * 0.99, w * 0.46, h * 0.86);
    p.quadraticCurveTo(w * 0.62, h * 0.74, w * 0.78, h * 0.62 + whip * 0.4);
  });
  line(c, '#3a4250', Math.max(0.15, h * 0.09), (p) => {
    p.moveTo(0, h * 0.93);
    p.quadraticCurveTo(w * 0.24, h * 0.98, w * 0.46, h * 0.85);
    p.quadraticCurveTo(w * 0.62, h * 0.73, w * 0.78, h * 0.61 + whip * 0.4);
  });
  const ex = w * 0.82, ey = h * 0.58 + whip * 0.45;
  for (const [dx, dy, col] of [[-0.02, -0.1, '#c9682f'], [0.03, -0.02, '#c9c2a8'], [-0.01, 0.08, '#7fa8c9']]) {
    line(c, col, Math.max(0.1, h * 0.05), (p) => {
      p.moveTo(ex - w * 0.05, ey); p.lineTo(ex + w * dx * 3, ey + h * dy * 2.2);
    });
  }
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 2; i++) {
    arc(c, ex, ey, ex - w * 0.14, h * 0.95, t, i * 4.7, '#9ef0ff', Math.max(0.12, h * 0.045), 0.35);
    arc(c, ex, ey, ex - w * 0.14, h * 0.95, t, i * 4.7, '#ffffff', Math.max(0.06, h * 0.018), 0.35);
  }
  c.restore();
  // Scorch marks say the wire has been arcing here for a while — a hazard that
  // has already damaged the floor is one the player believes without a label.
  c.save(); c.globalAlpha = 0.4;
  for (const [fx, r] of [[0.66, 0.1], [0.74, 0.07], [0.58, 0.06]]) {
    dot(c, w * fx, h * 0.96, w * r, '#141018');
  }
  c.restore();
  sparks(c, ex, ey, h * 0.2, t, 1.7, 5);
}

function drawJunctionBox(c, w, h, t) {
  shadow(c, w, h, 0.4);
  // Two splayed legs and a wide foot, not a single post: a sign is a thing you
  // read, a cabinet is a thing you walk into, and only one of those is a hazard.
  for (const s of [-1, 1]) {
    line(c, STEEL_DARK, Math.max(0.16, w * 0.05), (p) => {
      p.moveTo(w * (0.5 + s * 0.12), h * 0.7); p.lineTo(w * (0.5 + s * 0.26), h * 0.97);
    });
  }
  box(c, w * 0.16, h * 0.94, w * 0.68, h * 0.06, w * 0.02, STEEL_DARK);
  box(c, w * 0.12, h * 0.14, w * 0.76, h * 0.58, w * 0.05, '#586374');
  box(c, w * 0.19, h * 0.2, w * 0.62, h * 0.46, w * 0.03, '#1b212a');
  // Door off one hinge, swung wide to the left so the guts are fully exposed.
  c.save(); c.translate(w * 0.13, h * 0.17); c.rotate(-0.62);
  box(c, -w * 0.34, 0, w * 0.34, h * 0.52, w * 0.04, '#6c7784');
  hazardStripe(c, -w * 0.29, h * 0.18, w * 0.24, h * 0.09);
  c.restore();
  for (let i = 0; i < 3; i++) {
    const x = w * (0.31 + i * 0.19);
    box(c, x - w * 0.05, h * 0.26, w * 0.1, h * 0.34, w * 0.015, '#8c96a3', INK, Math.max(0.1, w * 0.014));
    dot(c, x, h * 0.3, w * 0.028, '#d8a24c');
    dot(c, x, h * 0.56, w * 0.028, '#d8a24c');
  }
  // Arcs jump BETWEEN terminals, and the bloom is dialled back to a rim: at
  // full strength it swallowed the cabinet it is supposed to be damaging.
  c.save(); c.globalAlpha = 0.1 + 0.1 * Math.sin(t * 9);
  dot(c, w * 0.5, h * 0.43, w * 0.3, '#7ee8ff'); c.restore();
  c.save(); c.globalCompositeOperation = 'lighter';
  arc(c, w * 0.31, h * 0.3, w * 0.5, h * 0.3, t, 0.9, '#9ef0ff', Math.max(0.1, w * 0.028), 0.22);
  arc(c, w * 0.5, h * 0.56, w * 0.69, h * 0.56, t, 3.6, '#c9f4ff', Math.max(0.08, w * 0.02), 0.22);
  c.restore();
  // Scorch above the door line: the box has been failing for a while.
  c.save(); c.globalAlpha = 0.45;
  path(c, '#12151b', null, 0, (p) => {
    p.moveTo(w * 0.24, h * 0.2);
    p.quadraticCurveTo(w * 0.5, h * 0.02, w * 0.76, h * 0.2);
    p.closePath();
  });
  c.restore();
  sparks(c, w * 0.5, h * 0.64, w * 0.14, t, 2.6, 4);
}

// ============================================================== 7. FLOOR PITS
function drawSpikePit(c, w, h, t) {
  // A hole is the hardest hazard to draw in a side-on runner: there is no
  // silhouette above the floor line at all. The lip boards are the fix — they
  // give the pit a raised edge to be recognised by before you reach it.
  const pitY = h * 0.5;
  path(c, '#0d1017', null, 0, (p) => {
    p.moveTo(w * 0.08, pitY); p.lineTo(w * 0.92, pitY);
    p.lineTo(w * 0.86, h); p.lineTo(w * 0.14, h); p.closePath();
  });
  for (let i = 0; i < 6; i++) {
    const x = w * (0.18 + i * 0.128);
    // Pale teeth over a black pit. Steel-on-shadow is the correct colour and
    // the wrong drawing: inside a hole, value contrast is all there is.
    tri(c, x, h * 0.99, w * 0.035, h * 0.4, i % 2 ? '#e4eaf1' : '#b6c0cc', '#12161c', Math.max(0.1, w * 0.01));
  }
  // Shade only the top of the shaft, so the teeth stay in the lit half.
  c.save(); c.globalAlpha = 0.5; c.fillStyle = '#05070c';
  c.fillRect(w * 0.1, pitY, w * 0.8, h * 0.14); c.restore();
  for (const s of [-1, 1]) {
    const x = s < 0 ? w * 0.02 : w * 0.86;
    box(c, x, pitY - h * 0.09, w * 0.12, h * 0.12, w * 0.01, WOOD, '#3b2717', Math.max(0.1, w * 0.012));
    line(c, '#3b2717', Math.max(0.1, w * 0.012), (p) => {
      p.moveTo(x + w * 0.02, pitY - h * 0.06); p.lineTo(x + w * 0.1, pitY - h * 0.055);
    });
  }
  // Two broken planks left over the mouth: this was covered, and it gave way.
  c.save(); c.translate(w * 0.2, pitY); c.rotate(0.42);
  box(c, 0, 0, w * 0.2, h * 0.05, w * 0.008, '#7a5230', '#3b2717', Math.max(0.1, w * 0.012));
  c.restore();
  c.save(); c.translate(w * 0.84, pitY - h * 0.01); c.rotate(-0.5);
  box(c, -w * 0.18, 0, w * 0.18, h * 0.05, w * 0.008, '#8a5e38', '#3b2717', Math.max(0.1, w * 0.012));
  c.restore();
  const glint = (t * 0.6) % 1;
  if (glint < 0.5) {
    c.save(); c.globalAlpha = Math.sin(glint * 2 * Math.PI) * 0.8;
    line(c, '#ffffff', Math.max(0.12, w * 0.012), (p) => {
      const x = w * (0.2 + glint * 1.2);
      p.moveTo(x, h * 0.72); p.lineTo(x + w * 0.012, h * 0.63);
    });
    c.restore();
  }
}

function drawTarPit(c, w, h, t) {
  path(c, '#0f0c12', null, 0, (p) => {
    p.moveTo(w * 0.02, h * 0.62);
    p.quadraticCurveTo(w * 0.3, h * 0.48, w * 0.54, h * 0.6);
    p.quadraticCurveTo(w * 0.8, h * 0.5, w * 0.98, h * 0.64);
    p.lineTo(w * 0.98, h); p.lineTo(w * 0.02, h); p.closePath();
  });
  c.save(); c.globalAlpha = 0.35;
  path(c, '#4b3f5c', null, 0, (p) => {
    p.ellipse(w * 0.42, h * 0.78, w * 0.22, h * 0.08, 0.1, 0, TAU);
  });
  c.restore();
  for (let i = 0; i < 4; i++) {
    // Bubbles inflate, then pop into a ring. A flat black puddle is indistinct
    // from a shadow; the pop is what says "this is a liquid, and it is alive".
    const p = (t * 0.55 + i * 0.27) % 1;
    const x = w * (0.16 + i * 0.22), y = h * (0.74 + (i % 2) * 0.1);
    if (p < 0.72) {
      const r = Math.min(w * 0.06, h * 0.3) * (0.25 + p);
      dot(c, x, y - r * 0.4, r, '#241c2c', '#0a0810', Math.max(0.08, w * 0.008));
      dot(c, x - r * 0.3, y - r * 0.7, r * 0.24, '#6a5b7d');
    } else {
      const k = (p - 0.72) / 0.28;
      c.save(); c.globalAlpha = 1 - k;
      dot(c, x, y - h * 0.05, Math.min(w * 0.08, h * 0.35) * (0.4 + k), null, '#5b4d6e', Math.max(0.1, w * 0.012));
      c.restore();
    }
  }
  c.save(); c.globalAlpha = 0.22;
  for (let i = 0; i < 2; i++) {
    const p = (t * 0.16 + i * 0.5) % 1;
    dot(c, w * (0.34 + i * 0.32), h * (0.58 - p * 0.5), w * (0.06 + 0.12 * p), '#8a7f99');
  }
  c.restore();
  // A bone sticking out of it. One prop does more storytelling than any amount
  // of surface detail, and it also raises the silhouette off the floor line.
  line(c, '#e6ddc6', Math.max(0.18, h * 0.07), (p) => {
    p.moveTo(w * 0.72, h * 0.82); p.lineTo(w * 0.78, h * 0.42);
  });
  dot(c, w * 0.775, h * 0.41, Math.max(0.2, h * 0.07), '#efe7d2', '#3b3529', Math.max(0.08, w * 0.008));
  dot(c, w * 0.8, h * 0.46, Math.max(0.16, h * 0.055), '#efe7d2', '#3b3529', Math.max(0.08, w * 0.008));
}

function drawLavaGrate(c, w, h, t) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 1.9);
  path(c, '#3a0f08', null, 0, (p) => { rr(p, w * 0.04, h * 0.4, w * 0.92, h * 0.6, h * 0.06); });
  c.save();
  c.beginPath(); rr(c, w * 0.04, h * 0.4, w * 0.92, h * 0.6, h * 0.06); c.clip();
  for (let i = 0; i < 5; i++) {
    const heat = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 2.6 + i * 1.4));
    glowPool(c, w * (0.14 + i * 0.18), h * 0.95, w * 0.12, h * 0.4 * heat, heat > 0.7 ? '#ffd24c' : '#ff5a12', 0.85);
  }
  c.restore();
  for (let i = 0; i < 6; i++) {
    box(c, w * (0.06 + i * 0.155), h * 0.4, w * 0.055, h * 0.6, h * 0.02, '#2e343d', '#12161c', Math.max(0.1, w * 0.008));
  }
  box(c, w * 0.02, h * 0.34, w * 0.96, h * 0.09, h * 0.03, '#4a535e');
  hazardStripe(c, w * 0.05, h * 0.355, w * 0.9, h * 0.05, t);
  // Heat haze above the grate: the only part of this hazard that exists above
  // the floor line, and therefore the only part that can be seen coming.
  c.save(); c.globalAlpha = 0.28 + 0.2 * pulse;
  for (let i = 0; i < 4; i++) {
    line(c, '#ffb35c', Math.max(0.12, h * 0.05), (p) => {
      const x = w * (0.16 + i * 0.22);
      p.moveTo(x, h * 0.3);
      p.quadraticCurveTo(x + Math.sin(t * 4 + i * 1.3) * w * 0.05, h * 0.16, x, h * 0.02);
    });
  }
  c.restore();
  embers(c, w * 0.5, h * 0.34, w * 0.9, h * 0.36, t, 5, 1.9);
}

// ================================================================== 8. THORNS
function drawCactus(c, w, h, t) {
  shadow(c, w, h, 0.34);
  const sway = Math.sin(t * 1.2) * 0.03;
  c.save(); c.translate(w * 0.5, h); c.rotate(sway); c.translate(-w * 0.5, -h);
  path(c, '#3f8c4a', '#1d3f24', Math.max(0.14, w * 0.035), (p) => {
    rr(p, w * 0.38, h * 0.12, w * 0.26, h * 0.87, w * 0.13);
  });
  for (const s of [-1, 1]) {
    const bx = w * (0.5 + s * 0.13), by = h * (s < 0 ? 0.46 : 0.56);
    path(c, '#3f8c4a', '#1d3f24', Math.max(0.14, w * 0.035), (p) => {
      p.moveTo(bx, by);
      p.lineTo(bx + s * w * 0.2, by);
      p.quadraticCurveTo(bx + s * w * 0.3, by, bx + s * w * 0.3, by - h * 0.1);
      p.lineTo(bx + s * w * 0.3, by - h * 0.24);
      p.quadraticCurveTo(bx + s * w * 0.3, by - h * 0.34, bx + s * w * 0.2, by - h * 0.34);
      p.quadraticCurveTo(bx + s * w * 0.11, by - h * 0.34, bx + s * w * 0.11, by - h * 0.24);
      p.lineTo(bx + s * w * 0.11, by - h * 0.12);
      p.quadraticCurveTo(bx + s * w * 0.11, by - h * 0.02, bx, by - h * 0.06);
      p.closePath();
    });
  }
  line(c, '#59ad60', Math.max(0.1, w * 0.03), (p) => {
    p.moveTo(w * 0.44, h * 0.2); p.lineTo(w * 0.44, h * 0.94);
    p.moveTo(w * 0.57, h * 0.2); p.lineTo(w * 0.57, h * 0.94);
  });
  // Spines in pairs, every rib. Without them this is a friendly green plant.
  for (let i = 0; i < 9; i++) {
    const y = h * (0.2 + i * 0.085);
    for (const s of [-1, 1]) {
      line(c, '#f0e6c2', Math.max(0.08, w * 0.018), (p) => {
        p.moveTo(w * (0.5 + s * 0.13), y); p.lineTo(w * (0.5 + s * 0.2), y - h * 0.025);
      });
    }
  }
  for (const [x, y] of [[0.2, 0.32], [0.8, 0.22]]) {
    for (let i = 0; i < 4; i++) {
      line(c, '#f0e6c2', Math.max(0.08, w * 0.016), (p) => {
        p.moveTo(w * x, h * (y + i * 0.06)); p.lineTo(w * (x + (x < 0.5 ? -0.07 : 0.07)), h * (y + i * 0.06 - 0.02));
      });
    }
  }
  dot(c, w * 0.51, h * 0.1, w * 0.09, '#e8557f', '#7a2340', Math.max(0.1, w * 0.02));
  dot(c, w * 0.51, h * 0.1, w * 0.035, '#ffe07a');
  c.restore();
}

function drawThornBush(c, w, h, t) {
  shadow(c, w, h, 0.46, 0.2);
  const breathe = 1 + 0.015 * Math.sin(t * 1.6);
  c.save(); c.translate(w * 0.5, h); c.scale(breathe, breathe); c.translate(-w * 0.5, -h);
  path(c, '#1f3324', '#0e1a11', Math.max(0.14, w * 0.02), (p) => {
    p.moveTo(w * 0.04, h * 0.99);
    p.quadraticCurveTo(w * 0.06, h * 0.42, w * 0.3, h * 0.3);
    p.quadraticCurveTo(w * 0.5, h * 0.1, w * 0.72, h * 0.32);
    p.quadraticCurveTo(w * 0.95, h * 0.44, w * 0.96, h * 0.99);
    p.closePath();
  });
  for (let i = 0; i < 11; i++) {
    const a = -2.8 + i * 0.26;
    const r0 = Math.min(w, h) * 0.16, r1 = Math.min(w, h) * (0.42 + 0.12 * ((i * 5) % 3));
    line(c, '#2d4a32', Math.max(0.12, w * 0.02), (p) => {
      p.moveTo(w * 0.5 + Math.cos(a) * r0, h * 0.86 + Math.sin(a) * r0 * 0.8);
      p.quadraticCurveTo(
        w * 0.5 + Math.cos(a + 0.3) * r1 * 0.7, h * 0.86 + Math.sin(a + 0.3) * r1 * 0.6,
        w * 0.5 + Math.cos(a) * r1, h * 0.86 + Math.sin(a) * r1 * 0.85);
    });
  }
  // Pale thorns on a dark mass: the value contrast is doing all the work here,
  // which is what has to be checked against the darker cabinets.
  for (let i = 0; i < 16; i++) {
    const a = -2.9 + (i * 0.19) % 2.9;
    const r = Math.min(w, h) * (0.24 + ((i * 7) % 5) * 0.06);
    const x = w * 0.5 + Math.cos(a) * r, y = h * 0.86 + Math.sin(a) * r * 0.82;
    tri(c, x, y + Math.min(w, h) * 0.04, Math.min(w, h) * 0.025, Math.min(w, h) * 0.1,
      '#e8e2c8', '#2b2a1e', Math.max(0.06, w * 0.008));
  }
  for (const [fx, fy] of [[0.3, 0.6], [0.62, 0.5], [0.46, 0.74]]) {
    dot(c, w * fx, h * fy, Math.min(w, h) * 0.045, '#c2334a', '#5c1522', Math.max(0.08, w * 0.01));
  }
  c.restore();
}

function drawBrambleArch(c, w, h, t) {
  // The only thorn candidate that leaves a gap: a hazard you go THROUGH rather
  // than over. Whether that gap reads at lane size is the question it asks.
  const sway = Math.sin(t * 1.1) * 0.02;
  shadow(c, w, h, 0.46, 0.16);
  c.save(); c.translate(w * 0.5, h); c.rotate(sway); c.translate(-w * 0.5, -h);
  // Leaf mass along the arch first: a bare curve reads as a drawn line, and a
  // line is not an object. The clumps are what make this a plant.
  for (let i = 0; i <= 9; i++) {
    const k = i / 9, u = 1 - k;
    const lx = w * (u * u * 0.06 + 2 * u * k * 0.32 + k * k * 0.95);
    const ly = h * (u * u * 0.99 + 2 * u * k * 0.05 + k * k * 0.99);
    const r = Math.min(w, h) * (0.11 + 0.05 * ((i * 5) % 3));
    dot(c, lx, ly, r, '#1e3315', '#0e1a0b', Math.max(0.08, w * 0.008));
    dot(c, lx - r * 0.25, ly - r * 0.3, r * 0.55, '#33521f');
  }
  for (const [lw, col] of [[0.075, '#16240f'], [0.045, '#3d5c2a']]) {
    line(c, col, Math.max(0.16, w * lw), (p) => {
      p.moveTo(w * 0.06, h * 0.99);
      p.quadraticCurveTo(w * 0.1, h * 0.3, w * 0.4, h * 0.14);
      p.quadraticCurveTo(w * 0.7, h * 0.02, w * 0.9, h * 0.28);
      p.quadraticCurveTo(w * 0.99, h * 0.44, w * 0.95, h * 0.99);
    });
  }
  line(c, '#2c4420', Math.max(0.12, w * 0.03), (p) => {
    p.moveTo(w * 0.14, h * 0.98);
    p.quadraticCurveTo(w * 0.34, h * 0.62, w * 0.5, h * 0.68);
    p.quadraticCurveTo(w * 0.7, h * 0.74, w * 0.86, h * 0.5);
  });
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    const k = i / 20, u = 1 - k;
    pts.push([
      w * (u * u * 0.06 + 2 * u * k * 0.32 + k * k * 0.95),
      h * (u * u * 0.99 + 2 * u * k * 0.05 + k * k * 0.99),
    ]);
  }
  for (let i = 1; i < pts.length; i += 2) {
    const [x, y] = pts[i];
    const [px, py] = pts[i - 1];
    const a = Math.atan2(y - py, x - px) + (i % 4 < 2 ? 1.6 : -1.6);
    const s = Math.min(w, h) * 0.05;
    c.save(); c.translate(x, y); c.rotate(a - Math.PI / 2);
    tri(c, 0, s * 0.4, s * 0.3, s * 1.5, '#efe9cf', '#2b2a1e', Math.max(0.06, w * 0.006));
    c.restore();
  }
  for (const [fx, fy] of [[0.26, 0.5], [0.56, 0.2], [0.84, 0.6]]) {
    dot(c, w * fx, h * fy, Math.min(w, h) * 0.05, '#8a3fb0', '#3c1a4f', Math.max(0.08, w * 0.008));
    dot(c, w * fx - Math.min(w, h) * 0.02, h * fy - Math.min(w, h) * 0.02, Math.min(w, h) * 0.016, '#d59df0');
  }
  c.restore();
}

// ==================================================================== 9. JUNK
function drawCrateStack(c, w, h, t) {
  shadow(c, w, h, 0.42);
  const jitter = Math.sin(t * 2.2) * 0.012;
  box(c, w * 0.08, h * 0.5, w * 0.84, h * 0.49, w * 0.03, WOOD, '#3b2717', Math.max(0.15, w * 0.03));
  line(c, '#6b4527', Math.max(0.12, w * 0.025), (p) => {
    p.moveTo(w * 0.1, h * 0.52); p.lineTo(w * 0.9, h * 0.97);
    p.moveTo(w * 0.9, h * 0.52); p.lineTo(w * 0.1, h * 0.97);
  });
  c.save(); c.translate(w * 0.5, h * 0.5); c.rotate(jitter); c.translate(-w * 0.5, -h * 0.5);
  box(c, w * 0.18, h * 0.06, w * 0.6, h * 0.45, w * 0.03, '#9c6a3e', '#3b2717', Math.max(0.15, w * 0.03));
  // The top crate is split, which is what licenses the nails: a crate nobody
  // has broken has no business being a hazard.
  line(c, '#3b2717', Math.max(0.14, w * 0.028), (p) => {
    p.moveTo(w * 0.3, h * 0.07); p.lineTo(w * 0.42, h * 0.3); p.lineTo(w * 0.34, h * 0.5);
  });
  for (let i = 0; i < 5; i++) {
    const x = w * (0.24 + i * 0.13), y = h * (0.07 - ((i * 3) % 2) * 0.02);
    line(c, '#b9c4d0', Math.max(0.09, w * 0.018), (p) => {
      p.moveTo(x, h * 0.1); p.lineTo(x + w * 0.01, y - h * 0.09);
    });
    dot(c, x + w * 0.01, y - h * 0.1, w * 0.022, '#d6dee7', '#2b323c', Math.max(0.06, w * 0.008));
  }
  c.restore();
  for (const [fx, fy] of [[0.14, 0.55], [0.86, 0.55], [0.14, 0.94], [0.86, 0.94]]) {
    rivet(c, w * fx, h * fy, Math.max(0.14, w * 0.02));
  }
}

function drawRebarChunk(c, w, h, t) {
  shadow(c, w, h, 0.46);
  path(c, '#8d939c', '#3c4149', Math.max(0.15, w * 0.025), (p) => {
    p.moveTo(w * 0.1, h * 0.99); p.lineTo(w * 0.16, h * 0.52);
    p.lineTo(w * 0.42, h * 0.44); p.lineTo(w * 0.58, h * 0.56);
    p.lineTo(w * 0.84, h * 0.48); p.lineTo(w * 0.92, h * 0.99); p.closePath();
  });
  path(c, '#a8aeb7', null, 0, (p) => {
    p.moveTo(w * 0.16, h * 0.53); p.lineTo(w * 0.42, h * 0.45);
    p.lineTo(w * 0.44, h * 0.56); p.lineTo(w * 0.18, h * 0.62); p.closePath();
  });
  for (const [fx, fy] of [[0.28, 0.72], [0.62, 0.78], [0.46, 0.9], [0.76, 0.66]]) {
    dot(c, w * fx, h * fy, Math.min(w, h) * 0.04, '#6f757e');
  }
  // Bent rebar. Straight bars read as a fence; the kink is what says wreckage.
  const bars = [[0.24, 0.5, -0.3, 0.42], [0.46, 0.45, 0.12, 0.5], [0.7, 0.5, 0.34, 0.38]];
  for (let i = 0; i < bars.length; i++) {
    const [fx, fy, lean, len] = bars[i];
    const bx = w * fx, by = h * fy, tipY = by - h * len;
    line(c, '#5c3a22', Math.max(0.16, w * 0.028), (p) => {
      p.moveTo(bx, by);
      p.quadraticCurveTo(bx + w * lean * 0.3, by - h * len * 0.6, bx + w * lean * 0.55, tipY);
    });
    line(c, '#a2653a', Math.max(0.09, w * 0.014), (p) => {
      p.moveTo(bx - w * 0.006, by);
      p.quadraticCurveTo(bx + w * lean * 0.3, by - h * len * 0.6, bx + w * lean * 0.55, tipY);
    });
    // Ribbing: rebar is knurled, and at detail size a smooth rod looks wrong.
    for (let j = 1; j < 5; j++) {
      const k = j / 5;
      line(c, '#4a2e1a', Math.max(0.06, w * 0.008), (p) => {
        const rx = bx + w * lean * 0.55 * k * k, ry = by - h * len * k;
        p.moveTo(rx - w * 0.016, ry + h * 0.012); p.lineTo(rx + w * 0.016, ry - h * 0.012);
      });
    }
    const glint = (t * 0.45 + i * 0.33) % 1;
    if (glint < 0.14) {
      c.save(); c.globalAlpha = Math.sin(glint / 0.14 * Math.PI);
      dot(c, bx + w * lean * 0.55, tipY, Math.max(0.14, w * 0.025), '#ffffff');
      c.restore();
    }
  }
}

function drawTvStack(c, w, h, t) {
  // MASHENSTEIN is an arcade, so its junk should be screens. Two dead CRTs and
  // one still half-alive, which is where the hazard lives.
  shadow(c, w, h, 0.42);
  const live = Math.floor(t * 9) % 7 === 0;
  box(c, w * 0.1, h * 0.6, w * 0.8, h * 0.39, w * 0.05, '#5a5f68', INK, Math.max(0.15, w * 0.03));
  box(c, w * 0.16, h * 0.65, w * 0.56, h * 0.26, w * 0.04, '#171b22', '#0c0e13', Math.max(0.1, w * 0.02));
  c.save(); c.globalAlpha = 0.3;
  path(c, '#3f4a5c', null, 0, (p) => { rr(p, w * 0.18, h * 0.66, w * 0.24, h * 0.1, w * 0.02); });
  c.restore();
  dot(c, w * 0.81, h * 0.72, w * 0.03, '#3d4650');
  dot(c, w * 0.81, h * 0.82, w * 0.03, '#3d4650');
  c.save(); c.translate(w * 0.52, h * 0.6); c.rotate(-0.13); c.translate(-w * 0.52, -h * 0.6);
  box(c, w * 0.14, h * 0.22, w * 0.74, h * 0.38, w * 0.05, '#6b7079', INK, Math.max(0.15, w * 0.03));
  box(c, w * 0.2, h * 0.27, w * 0.52, h * 0.26, w * 0.04, live ? '#cfe6f2' : '#12161d', '#0c0e13', Math.max(0.1, w * 0.02));
  if (live) {
    for (let i = 0; i < 5; i++) {
      c.fillStyle = i % 2 ? '#ff49dc' : '#52eafa';
      c.fillRect(w * 0.2, h * (0.28 + i * 0.05), w * 0.52, h * 0.016);
    }
  }
  // Broken glass along the bottom edge of the dead tube.
  for (let i = 0; i < 4; i++) {
    tri(c, w * (0.26 + i * 0.13), h * 0.53, w * 0.03, -h * 0.06, '#9fd4e8', '#2b4a56', Math.max(0.06, w * 0.008));
  }
  c.restore();
  line(c, '#22272f', Math.max(0.14, w * 0.028), (p) => {
    p.moveTo(w * 0.86, h * 0.5);
    p.quadraticCurveTo(w * 1.0, h * 0.74, w * 0.9, h * 0.98);
  });
  if (live) {
    c.save(); c.globalCompositeOperation = 'lighter';
    arc(c, w * 0.2, h * 0.36, w * 0.1, h * 0.56, t, 1.4, '#9ef0ff', Math.max(0.1, w * 0.022));
    c.restore();
  }
  sparks(c, w * 0.24, h * 0.5, Math.min(w, h) * 0.1, t, 3.1, 3);
}

// ==================================================================== 10. JAWS
function jawTeeth(c, x0, x1, y, n, height, fill, up = true) {
  const step = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    tri(c, x0 + step * (i + 0.5), y, step * 0.42, up ? height : -height, fill, '#2b2118', Math.max(0.06, Math.abs(height) * 0.08));
  }
}

function drawBearTrap(c, w, h, t) {
  // Held open, with a snap every few seconds so a still frame shows the danger
  // and a live one shows the consequence.
  //
  // The jaws hinge at the ENDS of the base plate and stand up like a clamshell,
  // rather than pivoting from the middle — a centre pivot makes both jaws sweep
  // through the same space and the trap reads as one fan of teeth.
  const cycle = (t * 0.42) % 1;
  const shut = cycle > 0.86 ? Math.min(1, (cycle - 0.86) / 0.05) : 0;
  const open = 1 - shut;
  shadow(c, w, h, 0.44, 0.24);

  const py = h * 0.88, hingeDX = w * 0.28;
  line(c, '#4d5561', Math.max(0.18, h * 0.09), (p) => {
    p.moveTo(w * 0.06, h * 0.99);
    p.quadraticCurveTo(w * 0.0, h * 0.84, w * 0.14, h * 0.8);
  });
  for (let i = 0; i < 3; i++) {
    dot(c, w * (0.05 + i * 0.032), h * (0.98 - i * 0.06), h * 0.05, null, '#6d7783', Math.max(0.08, h * 0.03));
  }

  // Base plate, then springs at each end — the springs are what say a trap
  // rather than a hinge, and they sit under the jaws so nothing occludes them.
  path(c, '#3f4854', '#232a34', Math.max(0.12, w * 0.012), (p) => {
    p.ellipse(w * 0.5, py, w * 0.36, h * 0.13, 0, 0, TAU);
  });
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      dot(c, w * 0.5 + s * (hingeDX + i * w * 0.025), py - h * 0.02, h * 0.09,
        null, '#7d8794', Math.max(0.1, h * 0.045));
    }
  }

  for (const s of [-1, 1]) {
    c.save();
    c.translate(w * 0.5 + s * hingeDX, py);
    c.scale(s, 1);
    c.rotate(open * 0.92); // 0 = jaws upright and shut, 0.92 = laid back open
    const jw = w * 0.055, len = h * 0.66;
    path(c, STEEL, '#232a34', Math.max(0.12, w * 0.014), (p) => {
      rr(p, -jw * 0.5, -len, jw, len + h * 0.05, jw * 0.35);
    });
    // Teeth on the inner face only. A jaw with teeth on both edges is a saw.
    for (let i = 0; i < 4; i++) {
      const ty = -len * (0.18 + i * 0.24);
      path(c, '#eef2f7', '#232a34', Math.max(0.08, w * 0.01), (p) => {
        p.moveTo(-jw * 0.4, ty - h * 0.06);
        p.lineTo(-jw * 0.4 - w * 0.075, ty);
        p.lineTo(-jw * 0.4, ty + h * 0.06);
        p.closePath();
      });
    }
    c.restore();
  }

  // Pressure pan last, so it sits in the mouth of the trap where it belongs.
  path(c, '#5c6673', '#232a34', Math.max(0.12, w * 0.012), (p) => {
    p.ellipse(w * 0.5, py - h * 0.05, w * 0.15, h * 0.075, 0, 0, TAU);
  });
  dot(c, w * 0.5, py - h * 0.05, Math.max(0.16, w * 0.028), '#a82d35', INK, Math.max(0.08, w * 0.01));

  if (shut > 0) {
    c.save(); c.globalAlpha = shut * 0.75;
    for (let i = 0; i < 5; i++) {
      const a = -2.5 + i * 0.5;
      line(c, '#fff0b0', Math.max(0.1, h * 0.05), (p) => {
        p.moveTo(w * 0.5 + Math.cos(a) * w * 0.14, py - h * 0.3 + Math.sin(a) * h * 0.24);
        p.lineTo(w * 0.5 + Math.cos(a) * w * 0.22, py - h * 0.3 + Math.sin(a) * h * 0.42);
      });
    }
    c.restore();
  }
}

function drawSnapVice(c, w, h, t) {
  // Open for most of the cycle, a fast close, a short hold, a slower reopen.
  const cycle = (t * 0.5) % 1;
  const gap = cycle < 0.66 ? 1
    : cycle < 0.72 ? 1 - (cycle - 0.66) / 0.06
      : cycle < 0.86 ? 0
        : (cycle - 0.86) / 0.14;
  shadow(c, w, h, 0.4);
  box(c, w * 0.06, h * 0.9, w * 0.88, h * 0.1, h * 0.02, STEEL_DARK);
  for (const s of [0, 1]) {
    const x = s ? w * 0.82 : w * 0.06;
    box(c, x, h * 0.1, w * 0.12, h * 0.82, w * 0.02, '#4d5561');
  }
  const topY = h * (0.14 + 0.22 * gap);
  const botY = h * (0.86 - 0.2 * gap);
  box(c, w * 0.16, topY - h * 0.1, w * 0.68, h * 0.12, w * 0.02, '#7a8492', INK, Math.max(0.12, w * 0.02));
  jawTeeth(c, w * 0.18, w * 0.82, topY + h * 0.02, 6, -h * 0.11, '#e2e8ef', false);
  box(c, w * 0.16, botY, w * 0.68, h * 0.12, w * 0.02, '#7a8492', INK, Math.max(0.12, w * 0.02));
  jawTeeth(c, w * 0.18, w * 0.82, botY - h * 0.01, 6, h * 0.11, '#e2e8ef');
  hazardStripe(c, w * 0.18, topY - h * 0.08, w * 0.64, h * 0.05);
  hazardStripe(c, w * 0.18, botY + h * 0.04, w * 0.64, h * 0.05, 2);
  // Hydraulics tell you which way it is about to go without any UI at all.
  for (const s of [0, 1]) {
    const x = s ? w * 0.88 : w * 0.12;
    line(c, '#c3ccd6', Math.max(0.12, w * 0.03), (p) => { p.moveTo(x, topY - h * 0.06); p.lineTo(x, botY + h * 0.06); });
    dot(c, x, topY - h * 0.06, Math.max(0.14, w * 0.032), '#98a3b1', INK, Math.max(0.08, w * 0.012));
  }
  dot(c, w * 0.5, h * 0.95, Math.max(0.16, w * 0.03), gap < 0.4 ? '#ff493d' : '#57e0a8', INK, Math.max(0.08, w * 0.012));
}

function drawMegaMouseTrap(c, w, h, t) {
  // The joke candidate, and the sheet is better for having one: MASHENSTEIN is
  // a game made of borrowed parts, and an oversized mousetrap is the most
  // instantly-understood "do not step here" object that exists.
  const cycle = (t * 0.38) % 1;
  const snap = cycle > 0.9 ? Math.min(1, (cycle - 0.9) / 0.04) : 0;
  // Cocked back over the board, not past its left edge — the first pass put
  // the bar outside the art envelope, which is a hitbox lie waiting to happen.
  const barA = -0.05 + (1 - snap) * -1.2;
  shadow(c, w, h, 0.46);
  box(c, w * 0.04, h * 0.66, w * 0.92, h * 0.32, w * 0.02, '#c19a63', '#6b4527', Math.max(0.15, w * 0.02));
  for (let i = 0; i < 3; i++) {
    line(c, '#a37f4c', Math.max(0.08, w * 0.01), (p) => {
      p.moveTo(w * 0.06, h * (0.72 + i * 0.08)); p.lineTo(w * 0.94, h * (0.73 + i * 0.08));
    });
  }
  box(c, w * 0.68, h * 0.58, w * 0.2, h * 0.1, w * 0.02, '#9aa3af', '#39424f', Math.max(0.1, w * 0.014));
  c.save(); c.translate(w * 0.12, h * 0.68); c.rotate(barA);
  const barL = w * 0.46;
  line(c, '#39424f', Math.max(0.2, w * 0.05), (p) => {
    p.moveTo(0, 0); p.lineTo(barL, 0);
  });
  line(c, '#b9c4d0', Math.max(0.12, w * 0.028), (p) => {
    p.moveTo(0, -w * 0.008); p.lineTo(barL, -w * 0.008);
  });
  line(c, '#39424f', Math.max(0.16, w * 0.04), (p) => {
    p.moveTo(barL, 0); p.lineTo(barL, h * 0.16);
  });
  c.restore();
  for (let i = 0; i < 5; i++) {
    dot(c, w * (0.13 + i * 0.012), h * 0.68, Math.max(0.14, w * 0.035), null, '#8d97a4', Math.max(0.08, w * 0.018));
  }
  // Cheese: the bait is the reason a player walks into it, so it has to be the
  // brightest thing on the prop.
  const cx = w * 0.52, cy = h * 0.62;
  path(c, '#f2c53c', '#8a6a1c', Math.max(0.1, w * 0.014), (p) => {
    p.moveTo(cx - w * 0.11, cy + h * 0.05); p.lineTo(cx - w * 0.06, cy - h * 0.06);
    p.lineTo(cx + w * 0.11, cy - h * 0.06); p.lineTo(cx + w * 0.11, cy + h * 0.05); p.closePath();
  });
  path(c, '#ffe07a', null, 0, (p) => {
    p.moveTo(cx - w * 0.06, cy - h * 0.06); p.lineTo(cx + w * 0.11, cy - h * 0.06);
    p.lineTo(cx + w * 0.11, cy - h * 0.03); p.lineTo(cx - w * 0.055, cy - h * 0.03); p.closePath();
  });
  dot(c, cx - w * 0.02, cy - h * 0.005, Math.max(0.1, w * 0.02), '#c79a20');
  dot(c, cx + w * 0.06, cy + h * 0.02, Math.max(0.08, w * 0.014), '#c79a20');
  if (snap > 0) {
    c.save(); c.globalAlpha = snap;
    for (let i = 0; i < 4; i++) {
      line(c, '#fff0b0', Math.max(0.1, w * 0.016), (p) => {
        const a = -2.2 + i * 0.5;
        p.moveTo(w * 0.5 + Math.cos(a) * w * 0.16, h * 0.6 + Math.sin(a) * h * 0.16);
        p.lineTo(w * 0.5 + Math.cos(a) * w * 0.24, h * 0.6 + Math.sin(a) * h * 0.26);
      });
    }
    c.restore();
  }
}

// ------------------------------------------------------------------- registry
const DRAW = {
  spikeStrip: drawSpikeStrip, popSpikes: drawPopSpikes, caltrops: drawCaltrops,
  logFire: drawLogFire, gasJet: drawGasJet, emberPatch: drawEmberPatch,
  fireBarrel: drawFireBarrel, tippedBarrel: drawTippedBarrel, toxicBarrel: drawToxicBarrel,
  tripodBrazier: drawTripodBrazier, torchPost: drawTorchPost, hangLantern: drawHangLantern,
  floorSaw: drawFloorSaw, pendulumBlade: drawPendulumBlade, buzzPost: drawBuzzPost,
  teslaCoil: drawTeslaCoil, liveWire: drawLiveWire, junctionBox: drawJunctionBox,
  spikePit: drawSpikePit, tarPit: drawTarPit, lavaGrate: drawLavaGrate,
  cactus: drawCactus, thornBush: drawThornBush, brambleArch: drawBrambleArch,
  crateStack: drawCrateStack, rebarChunk: drawRebarChunk, tvStack: drawTvStack,
  bearTrap: drawBearTrap, snapVice: drawSnapVice, megaMouseTrap: drawMegaMouseTrap,
};

// family, id, letter, name, [art envelope w,h in world units], motion, note.
// The envelope is what the gallery draws into and what a port would start from;
// MOTION states honestly how much movement the concept needs to work, because
// "mostly stationary" is the brief and a candidate that only reads while moving
// has answered a different question.
export const HAZARD_CANDIDATES = [
  ['spikes', 'spikeStrip', 'A', 'SPIKE STRIP', [20, 7], 'still', 'a fixed row of teeth in a plate — nothing moves but a glint'],
  ['spikes', 'popSpikes', 'B', 'POP-UP SPIKES', [16, 11], 'cycles', 'down two beats, up one; the empty slots are the warning'],
  ['spikes', 'caltrops', 'C', 'CALTROPS', [18, 6], 'still', 'scattered jacks, low profile — the hardest of the three to see coming'],
  ['fire', 'logFire', 'A', 'CAMPFIRE', [16, 14], 'burns', 'crossed logs and a settled flame; warm pool on the floor'],
  ['fire', 'gasJet', 'B', 'GAS JET', [11, 18], 'cycles', 'floor grate, hard on/off — blue root, orange tip, a real safe window'],
  ['fire', 'emberPatch', 'C', 'EMBER BED', [20, 6], 'smoulders', 'a wide low burn with the occasional lick; almost no silhouette'],
  ['barrel', 'fireBarrel', 'A', 'BURNING BARREL', [14, 22], 'burns', 'the drum fire — rust-through holes lit from inside'],
  ['barrel', 'tippedBarrel', 'B', 'TIPPED BARREL', [22, 12], 'burns', 'on its side with a burning spill; the spill is the hazard'],
  ['barrel', 'toxicBarrel', 'C', 'TOXIC DRUM', [14, 19], 'drips', 'no flame at all — tests whether acid green warns as hard as fire'],
  ['brazier', 'tripodBrazier', 'A', 'IRON BRAZIER', [16, 24], 'burns', 'a bowl of coals on three legs; chest-height fire'],
  ['brazier', 'torchPost', 'B', 'TORCH POST', [11, 28], 'burns', 'tall and thin, dripping pitch — threatens two heights at once'],
  ['brazier', 'hangLantern', 'C', 'HANGING LANTERN', [13, 22], 'swings', 'caged flame on a chain from above; the family\'s only real mover'],
  ['saw', 'floorSaw', 'A', 'FLOOR SAW', [18, 10], 'spins', 'half-buried blade in a slotted plate, throwing sparks both ways'],
  ['saw', 'pendulumBlade', 'B', 'PENDULUM BLADE', [20, 28], 'swings', 'fixed in place, owns a whole lane column; arc trail shows the sweep'],
  ['saw', 'buzzPost', 'C', 'BUZZ POST', [14, 20], 'spins', 'a guarded blade on a stand — a machine, not a dropped blade'],
  ['electric', 'teslaCoil', 'A', 'TESLA COIL', [14, 26], 'arcs', 'coil, ball, three arcs re-cut on a step clock'],
  ['electric', 'liveWire', 'B', 'LIVE WIRE', [22, 9], 'whips', 'severed cable arcing to the floor, scorch marks already under it'],
  ['electric', 'junctionBox', 'C', 'JUNCTION BOX', [15, 18], 'arcs', 'door hanging open on one hinge; the failure IS the hazard'],
  ['pit', 'spikePit', 'A', 'SPIKE PIT', [24, 9], 'still', 'lip boards and broken planks give a hole something to be seen by'],
  ['pit', 'tarPit', 'B', 'TAR PIT', [24, 8], 'bubbles', 'bubbles inflate and pop; a bone in it does the storytelling'],
  ['pit', 'lavaGrate', 'C', 'LAVA GRATE', [22, 8], 'pulses', 'glow under steel bars, heat haze the only part above the floor'],
  ['thorns', 'cactus', 'A', 'CACTUS', [14, 24], 'still', 'the classic — ribs, paired spines, one flower for colour'],
  ['thorns', 'thornBush', 'B', 'THORN BUSH', [18, 15], 'breathes', 'pale thorns on a dark mass; check it against the dark cabinets'],
  ['thorns', 'brambleArch', 'C', 'BRAMBLE ARCH', [24, 20], 'sways', 'a hazard with a gap — go through it, not over it'],
  ['junk', 'crateStack', 'A', 'NAILED CRATES', [16, 21], 'settles', 'a split top crate with nails out of it; breakable-looking on purpose'],
  ['junk', 'rebarChunk', 'B', 'REBAR CHUNK', [18, 15], 'still', 'broken concrete with bent knurled bar — pure wreckage silhouette'],
  ['junk', 'tvStack', 'C', 'DEAD CRT STACK', [16, 22], 'flickers', 'arcade junk: two dead tubes, one still arcing, glass on the floor'],
  ['jaws', 'bearTrap', 'A', 'BEAR TRAP', [18, 9], 'snaps', 'held open on the floor, snaps every few seconds'],
  ['jaws', 'snapVice', 'B', 'SNAP VICE', [16, 17], 'snaps', 'two toothed plates on hydraulics; the lamp says which way it is going'],
  ['jaws', 'megaMouseTrap', 'C', 'GIANT MOUSETRAP', [22, 13], 'snaps', 'the cheese is the bait and the brightest thing on the prop'],
].map(([family, id, letter, name, box, motion, note]) => ({ family, id, letter, name, box, motion, note }));

export const HAZARD_FAMILIES = [
  ['spikes', 'SPIKES', 'Fixed teeth. The question is how low a hazard can sit and still be read in time.'],
  ['fire', 'SMALL FIRES', 'Ground-level burning. All three share the flame painter; they differ in silhouette and safe window.'],
  ['barrel', 'BARRELS', 'One object in three states — upright and burning, tipped and spilling, sealed and leaking.'],
  ['brazier', 'RAISED FIRE', 'Fire lifted off the floor, so it threatens a height a jump cannot clear.'],
  ['saw', 'BLADES', 'Rotating steel. Shared disc painter, three housings.'],
  ['electric', 'ELECTRICS', 'Arcs re-cut on a step clock — electricity has to snap between shapes, not wiggle.'],
  ['pit', 'FLOOR PITS', 'The hardest case: no silhouette above the floor line. Each solves that differently.'],
  ['thorns', 'THORNS', 'Organic hazards, pale points on dark mass. The value contrast is the whole read.'],
  ['junk', 'WRECKAGE', 'Things that became dangerous by breaking.'],
  ['jaws', 'JAWS', 'Traps that close. Still until they are not, which is the most alarming thing on the sheet.'],
];

export function drawHazardCandidate(ctx, id, w, h, t = 0) {
  const draw = DRAW[id];
  if (!draw) return;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  draw(ctx, w, h, t);
  ctx.restore();
}
