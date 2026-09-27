// CRYPT style bake-off — CLEAN INK LINE. Flat fills, one outline weight on everything,
// no gradients except the sky. Depth is carried by value alone: each layer back is a
// step paler and bluer, the near bank almost black. The lamp is the only warm colour.
//
// Also the reference for how a style consumes cryptFrame(): every kind in CRYPT_KINDS
// is drawn here, in plan order, back to front.

const INK = '#0c0916';
const LINE = 1.3;
const SKY_TOP = '#171230';
const SKY_LOW = '#3b2d5c';
const MOON = '#f1e6c4';
const MOON_SHADE = '#d8c99e';
const CLOUD = '#4b3d70';
const LAYER = {
  bg: { fill: '#43386a', lit: '#56497f' },
  mid: { fill: '#2e2549', lit: '#40345f' },
  fg: { fill: '#18122a', lit: '#241c3a' },
};
const STONE = '#6d6590';
const FOG = 'rgba(176,160,214,0.22)';
const LAMP = '#ffcf6a';

function seeded(i) {
  const x = Math.sin(i * 91.7 + 17.3) * 43758.5453;
  return x - Math.floor(x);
}

// Outlined strokes: every ink pass first, then every fill pass, so joints merge into
// one silhouette with a single outline round the whole thing.
function inkedStrokes(ctx, paths, fill, w) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const pass of [[INK, w + LINE * 2], [fill, w]]) {
    ctx.strokeStyle = pass[0];
    for (const p of paths) {
      ctx.lineWidth = pass[1] * (p.w ?? 1);
      ctx.beginPath();
      ctx.moveTo(p.pts[0], p.pts[1]);
      for (let k = 2; k < p.pts.length; k += 2) ctx.lineTo(p.pts[k], p.pts[k + 1]);
      ctx.stroke();
    }
  }
}

function fillInk(ctx, fill) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = LINE;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

// ------------------------------------------------------------------ sky
function sky(ctx, f) {
  const g = ctx.createLinearGradient(0, 0, 0, f.laneTop);
  g.addColorStop(0, SKY_TOP);
  g.addColorStop(1, SKY_LOW);
  ctx.fillStyle = g;
  ctx.fillRect(-40, -80, f.W + 80, f.H + 160);
  ctx.fillStyle = MOON;
  for (const s of f.stars) {
    ctx.globalAlpha = s.twinkle;
    ctx.fillRect(s.x, s.y, s.s, s.s);
  }
  ctx.globalAlpha = 1;
  const m = f.moon;
  ctx.beginPath();
  ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
  fillInk(ctx, MOON);
  ctx.fillStyle = MOON_SHADE;
  for (const [dx, dy, r] of [[-8, -5, 5], [6, 7, 4], [9, -9, 2.5], [-3, 10, 2]]) {
    ctx.beginPath();
    ctx.arc(m.x + dx, m.y + dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const c of f.clouds) cloud(ctx, c);
  for (const b of f.bats) bat(ctx, b);
}

function cloud(ctx, c) {
  const lobes = [[0.18, 0.55, 0.22], [0.4, 0.35, 0.3], [0.64, 0.5, 0.24], [0.84, 0.62, 0.16]];
  const paths = lobes.map(([u, v, r]) => ({ pts: [c.x + u * c.w - r * c.w * 0.6, c.y + v * c.h, c.x + u * c.w + r * c.w * 0.6, c.y + v * c.h], w: r * 2.2 }));
  inkedStrokes(ctx, paths, CLOUD, c.h * 0.9);
}

function bat(ctx, b) {
  const up = Math.cos(b.flap * Math.PI * 2);
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.scale(b.s, b.s);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-5, -4 * up - 2, -10, -6 * up);
  ctx.quadraticCurveTo(-7, -1, -6, 1);
  ctx.quadraticCurveTo(-3, 0, 0, 2);
  ctx.quadraticCurveTo(3, 0, 6, 1);
  ctx.quadraticCurveTo(7, -1, 10, -6 * up);
  ctx.quadraticCurveTo(5, -4 * up - 2, 0, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 0.5, 1.6, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------------ land
function ridge(ctx, L, fill) {
  ctx.beginPath();
  ctx.moveTo(L.crest[0].x, 300);
  for (const p of L.crest) ctx.lineTo(p.x, p.y);
  ctx.lineTo(L.crest[L.crest.length - 1].x, 300);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.beginPath();
  L.crest.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.strokeStyle = INK;
  ctx.lineWidth = LINE;
  ctx.stroke();
}

function lancet(ctx, x, y, w, h) {
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x - w / 2, y - h + w * 0.6);
  ctx.quadraticCurveTo(x - w / 2, y - h, x, y - h - w * 0.3);
  ctx.quadraticCurveTo(x + w / 2, y - h, x + w / 2, y - h + w * 0.6);
  ctx.lineTo(x + w / 2, y);
  ctx.closePath();
}

function abbey(ctx, it, pal, skyHole) {
  ctx.save();
  ctx.translate(it.x, it.y);
  ctx.scale(it.s, it.s);
  // Nave: a long wall, its top broken off in steps.
  ctx.beginPath();
  ctx.moveTo(-54, 2);
  ctx.lineTo(-54, -24); ctx.lineTo(-48, -30); ctx.lineTo(-40, -28); ctx.lineTo(-34, -36);
  ctx.lineTo(-22, -34); ctx.lineTo(-16, -40); ctx.lineTo(-8, -37); ctx.lineTo(2, -40);
  ctx.lineTo(2, 2);
  ctx.closePath();
  fillInk(ctx, pal.fill);
  ctx.beginPath();
  for (const x of [-42, -27, -12]) lancet(ctx, x, -6, 8, 20);
  fillInk(ctx, skyHole);
  // Tower and spire.
  ctx.beginPath();
  ctx.rect(2, -54, 16, 56);
  fillInk(ctx, pal.lit);
  ctx.beginPath();
  ctx.moveTo(0, -54); ctx.lineTo(10, -86); ctx.lineTo(20, -54); ctx.closePath();
  fillInk(ctx, pal.fill);
  ctx.beginPath();
  lancet(ctx, 10, -38, 5, 10);
  fillInk(ctx, skyHole);
  // Roofless transept with a rose window.
  ctx.beginPath();
  ctx.moveTo(18, 2); ctx.lineTo(18, -26); ctx.lineTo(28, -34); ctx.lineTo(32, -30);
  ctx.lineTo(38, -36); ctx.lineTo(50, -24); ctx.lineTo(50, 2); ctx.closePath();
  fillInk(ctx, pal.fill);
  ctx.beginPath();
  ctx.arc(34, -17, 4.5, 0, Math.PI * 2);
  fillInk(ctx, skyHole);
  ctx.restore();
}

function deadTree(ctx, x, y, s, lean, fill, w = 2.4) {
  const L = lean;
  inkedStrokes(ctx, [
    { pts: [x, y + 1, x + L * 4 * s, y - 26 * s, x + L * 8 * s, y - 50 * s], w: 1.3 },
    { pts: [x + L * 3 * s, y - 20 * s, x - 12 * s, y - 32 * s, x - 17 * s, y - 42 * s], w: 0.8 },
    { pts: [x - 12 * s, y - 32 * s, x - 21 * s, y - 34 * s], w: 0.55 },
    { pts: [x + L * 5 * s, y - 30 * s, x + 13 * s, y - 40 * s, x + 20 * s, y - 42 * s], w: 0.8 },
    { pts: [x + 13 * s, y - 40 * s, x + 15 * s, y - 49 * s], w: 0.55 },
    { pts: [x + L * 7 * s, y - 42 * s, x - 3 * s, y - 52 * s], w: 0.55 },
  ], fill, w * s);
}

function grove(ctx, it, pal) {
  const n = 3 + (it.i % 3);
  for (let k = 0; k < n; k++) {
    const dx = (k - (n - 1) / 2) * 12 * it.s + (seeded(it.i * 7 + k) - 0.5) * 6;
    const sc = (0.42 + seeded(it.i * 11 + k) * 0.24) * it.s;
    deadTree(ctx, it.x + dx, it.y + 2, sc, (seeded(k + it.i) - 0.5) * 0.6, pal.fill, 2.2);
  }
}

function mausoleum(ctx, it, pal) {
  ctx.save();
  ctx.translate(it.x, it.y);
  ctx.scale(it.s, it.s);
  ctx.beginPath(); ctx.rect(-24, -4, 48, 6); fillInk(ctx, pal.lit);
  ctx.beginPath(); ctx.rect(-20, -8, 40, 4); fillInk(ctx, pal.lit);
  ctx.beginPath(); ctx.rect(-18, -32, 36, 24); fillInk(ctx, pal.fill);
  for (const x of [-15, 11]) { ctx.beginPath(); ctx.rect(x, -31, 4, 23); fillInk(ctx, pal.lit); }
  ctx.beginPath();
  lancet(ctx, 0, -8, 12, 16);
  fillInk(ctx, INK);
  if (it.variant === 1) {
    ctx.beginPath(); ctx.rect(-20, -36, 40, 4); fillInk(ctx, pal.lit);
    ctx.beginPath(); ctx.arc(0, -36, 14, Math.PI, 0); ctx.closePath(); fillInk(ctx, pal.fill);
    ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(0, -56); ctx.moveTo(-3, -53); ctx.lineTo(3, -53);
    ctx.strokeStyle = INK; ctx.lineWidth = LINE; ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(-22, -32); ctx.lineTo(0, -44); ctx.lineTo(22, -32); ctx.closePath();
    fillInk(ctx, pal.lit);
  }
  ctx.restore();
}

function stone(ctx, it) {
  ctx.save();
  ctx.translate(it.x, it.y + 1);
  ctx.rotate((seeded(it.i * 3.3) - 0.5) * 0.26);
  ctx.scale(it.s, it.s);
  ctx.beginPath();
  if (it.variant === 2) {
    ctx.rect(-4, -3, 8, 3);
    ctx.moveTo(-2.6, -3); ctx.lineTo(-1.8, -18); ctx.lineTo(0, -21); ctx.lineTo(1.8, -18); ctx.lineTo(2.6, -3);
  } else if (it.variant === 1) {
    ctx.moveTo(-5, 0); ctx.lineTo(-5, -12); ctx.lineTo(-1.5, -12); ctx.lineTo(0, -14);
    ctx.lineTo(1.5, -12); ctx.lineTo(5, -12); ctx.lineTo(5, 0);
  } else {
    ctx.moveTo(-4.5, 0); ctx.lineTo(-4.5, -9); ctx.arc(0, -9, 4.5, Math.PI, 0); ctx.lineTo(4.5, 0);
  }
  ctx.closePath();
  fillInk(ctx, STONE);
  ctx.restore();
}

function cross(ctx, it) {
  ctx.save();
  ctx.translate(it.x, it.y + 1);
  ctx.rotate((seeded(it.i * 5.1) - 0.5) * 0.18);
  ctx.scale(it.s, it.s);
  const celtic = it.i % 2 === 0;
  if (celtic) {
    ctx.beginPath(); ctx.arc(0, -15, 4.2, 0, Math.PI * 2);
    ctx.strokeStyle = INK; ctx.lineWidth = 3.2; ctx.stroke();
    ctx.strokeStyle = STONE; ctx.lineWidth = 1.4; ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-1.6, 0); ctx.lineTo(-1.6, -11); ctx.lineTo(-6, -11); ctx.lineTo(-6, -14.5);
  ctx.lineTo(-1.6, -14.5); ctx.lineTo(-1.6, -20); ctx.lineTo(1.6, -20); ctx.lineTo(1.6, -14.5);
  ctx.lineTo(6, -14.5); ctx.lineTo(6, -11); ctx.lineTo(1.6, -11); ctx.lineTo(1.6, 0);
  ctx.closePath();
  fillInk(ctx, STONE);
  ctx.restore();
}

function gnarl(ctx, it, pal) {
  const s = it.s;
  const x = it.x;
  const y = it.y + 2;
  const flip = it.variant === 1 ? -1 : 1;
  const X = (dx) => x + dx * s * flip;
  const Y = (dy) => y + dy * s;
  inkedStrokes(ctx, [
    { pts: [X(0), Y(0), X(-4), Y(-30), X(4), Y(-58), X(0), Y(-84)], w: 1.6 },
    { pts: [X(2), Y(-50), X(24), Y(-66), X(44), Y(-64), X(58), Y(-74)], w: 0.9 },
    { pts: [X(44), Y(-64), X(52), Y(-56), X(62), Y(-58)], w: 0.5 },
    { pts: [X(30), Y(-66), X(36), Y(-82), X(48), Y(-92)], w: 0.55 },
    { pts: [X(0), Y(-80), X(-14), Y(-100), X(-26), Y(-104)], w: 0.8 },
    { pts: [X(-14), Y(-100), X(-12), Y(-114)], w: 0.45 },
    { pts: [X(1), Y(-84), X(14), Y(-104), X(30), Y(-112), X(38), Y(-124)], w: 0.7 },
    { pts: [X(20), Y(-107), X(28), Y(-100), X(36), Y(-102)], w: 0.4 },
    { pts: [X(-2), Y(-36), X(-18), Y(-46), X(-26), Y(-44)], w: 0.6 },
    { pts: [X(-6), Y(0), X(-14), Y(3)], w: 0.9 },
    { pts: [X(5), Y(0), X(14), Y(3)], w: 0.9 },
  ], pal.fill, 7 * s);
}

function fence(ctx, it, L, pal) {
  const bars = [];
  const gateHalf = 15;
  for (let x = it.x0; x <= it.x1; x += 7) {
    if (it.gate != null && Math.abs(x - it.gate) < gateHalf + 2) continue;
    bars.push(x);
  }
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (const x of bars) {
    const b = L.ridge(x);
    ctx.moveTo(x, b + 1); ctx.lineTo(x, b - 20);
  }
  ctx.stroke();
  ctx.beginPath();
  for (const x of bars) {
    const b = L.ridge(x);
    ctx.moveTo(x - 2, b - 20); ctx.lineTo(x, b - 25); ctx.lineTo(x + 2, b - 20); ctx.closePath();
  }
  ctx.fill();
  // Rails, broken at the gate.
  const runs = it.gate == null ? [[it.x0, it.x1]] : [[it.x0, it.gate - gateHalf], [it.gate + gateHalf, it.x1]];
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (const [a, b] of runs) {
    for (const h of [5, 16]) {
      for (let x = a; x <= b; x += 4) {
        const y = L.ridge(x) - h;
        x === a ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
    }
  }
  ctx.stroke();
  if (it.gate != null) {
    const g = it.gate;
    const b = L.foot(g, gateHalf);
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(g - gateHalf, b + 1); ctx.lineTo(g - gateHalf, b - 32);
    ctx.moveTo(g + gateHalf, b + 1); ctx.lineTo(g + gateHalf, b - 32);
    ctx.stroke();
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(g - gateHalf, b - 26);
    ctx.quadraticCurveTo(g, b - 40, g + gateHalf, b - 26);
    for (let x = g - gateHalf + 5; x < g + gateHalf - 2; x += 5) { ctx.moveTo(x, b); ctx.lineTo(x, b - 26 - 6 * Math.cos((x - g) / gateHalf * 1.4)); }
    ctx.moveTo(g - gateHalf, b - 12); ctx.lineTo(g + gateHalf, b - 12);
    ctx.stroke();
    for (const x of [g - gateHalf, g + gateHalf]) {
      ctx.beginPath(); ctx.arc(x, b - 34, 2.4, 0, Math.PI * 2); ctx.fill();
    }
  }
  void pal;
}

function lamp(ctx, it, t) {
  const x = it.x;
  const y = it.y + 1;
  const s = it.s;
  const flicker = 0.9 + 0.1 * Math.sin(t * 11 + it.i) * Math.sin(t * 7.3);
  const glow = ctx.createRadialGradient(x, y - 40 * s, 1, x, y - 40 * s, 30 * s);
  glow.addColorStop(0, `rgba(255,200,110,${0.38 * flicker})`);
  glow.addColorStop(1, 'rgba(255,200,110,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 32 * s, y - 72 * s, 64 * s, 64 * s);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath(); ctx.rect(-1.4, -34, 2.8, 34); fillInk(ctx, LAYER.fg.lit);
  ctx.beginPath(); ctx.rect(-3.5, -3, 7, 3); fillInk(ctx, LAYER.fg.lit);
  ctx.beginPath(); ctx.moveTo(-5, -36); ctx.lineTo(5, -36); ctx.lineTo(4, -45); ctx.lineTo(-4, -45); ctx.closePath();
  fillInk(ctx, LAMP);
  ctx.beginPath(); ctx.moveTo(-6, -45); ctx.lineTo(0, -50); ctx.lineTo(6, -45); ctx.closePath();
  fillInk(ctx, LAYER.fg.lit);
  ctx.restore();
}

function grass(ctx, it, pal) {
  const blades = [];
  for (let k = 0; k < 7; k++) {
    const dx = (k - 3) * 2.2 * it.s;
    const h = (7 + seeded(it.i * 13 + k) * 7) * it.s;
    const bend = (seeded(it.i + k * 5) - 0.4) * 6 * it.s;
    blades.push({ pts: [it.x + dx, it.y + 2, it.x + dx + bend * 0.4, it.y - h * 0.6, it.x + dx + bend, it.y - h], w: 0.6 });
  }
  inkedStrokes(ctx, blades, pal.lit, 1.6);
}

function fogBand(ctx, band) {
  ctx.fillStyle = FOG;
  ctx.beginPath();
  for (const p of band.puffs) {
    ctx.moveTo(p.x + p.rx, p.y);
    ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
  }
  ctx.fill();
}

function layer(ctx, f, name, skyHole) {
  const L = f.layers[name];
  const pal = LAYER[name];
  // Buildings stand behind their own ridge line, so the crest overlaps their foot.
  for (const it of L.items) if (it.kind === 'abbey') abbey(ctx, it, pal, skyHole);
  ridge(ctx, L, pal.fill);
  for (const it of L.items) {
    if (it.kind === 'grove') grove(ctx, it, pal);
    else if (it.kind === 'mausoleum') mausoleum(ctx, it, pal);
    else if (it.kind === 'tree') deadTree(ctx, it.x, it.y, it.s, it.variant === 1 ? -0.8 : 0.2, pal.fill);
    else if (it.kind === 'stone') stone(ctx, it);
    else if (it.kind === 'cross') cross(ctx, it);
    else if (it.kind === 'gnarl') gnarl(ctx, it, pal);
    else if (it.kind === 'fence') fence(ctx, it, L, pal);
    else if (it.kind === 'lamp') lamp(ctx, it, f.t);
    else if (it.kind === 'grass') grass(ctx, it, pal);
  }
}

export const STYLE = {
  id: 'ink',
  name: 'CLEAN INK LINE',
  note: 'Flat fills and one outline weight on everything, no texture. Depth by value only: each layer back is a '
    + 'step paler and bluer, the near bank almost black. The gas lamp is the one warm colour.',
  paint(ctx, f) {
    sky(ctx, f);
    layer(ctx, f, 'bg', '#4a3b6c');
    layer(ctx, f, 'mid', '#4a3b6c');
    fogBand(ctx, f.fog[0]);
    layer(ctx, f, 'fg', '#4a3b6c');
    fogBand(ctx, f.fog[1]);
  },
};
