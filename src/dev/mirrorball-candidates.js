// MIRROR BALL BAKE-OFF — candidate looks for the club's ball. 3 Oct 2026.
//
// Peter: "could we do a bake off of different mirrorball looks… I think it could look a lot
// nicer." Candidates only; the club's own painter (club.js drawBall) is what ships until one
// is picked. Each is (ctx, x, y, r, { t, pulse, accent }) — the ball alone, its centre at
// (x, y), r its radius; the string, mount and the room's spots stay the club's.
//
// The better ones draw each tile as a QUAD ON THE SPHERE (its four corners projected), not a
// flat rectangle, and shade it by what it REFLECTS — bright ceiling above, coloured floor
// below — which is what a mirror ball actually shows.

const TAU = Math.PI * 2;
const hash = (a, b, c = 0) => { const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return s - Math.floor(s); };
const DISCO = ['#ff4fa3', '#3fb8ff', '#ffd23f', '#7cff6b', '#c9a0ff', '#ff7a59'];
const mix = (a, b, k) => {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(',')})`;
};

/** Every visible tile of a ball of `bands` rows: its corners, its normal at the middle. */
function forTiles(x, y, r, bands, rot, fn) {
  for (let i = 0; i < bands; i++) {
    const la0 = -Math.PI / 2 + i * Math.PI / bands, la1 = la0 + Math.PI / bands, lam = (la0 + la1) / 2;
    const n = Math.max(4, Math.round(bands * 2 * Math.cos(lam)));
    for (let j = 0; j < n; j++) {
      const off = (i % 2) * 0.5;
      const lo0 = (j + off) / n * TAU + rot, lo1 = (j + 1 + off) / n * TAU + rot, lom = (lo0 + lo1) / 2;
      if (Math.cos(lom) * Math.cos(lam) <= 0.04) continue;
      const pt = (la, lo) => [x + r * Math.cos(la) * Math.sin(lo), y + r * Math.sin(la)];
      const nrm = [Math.cos(lam) * Math.sin(lom), Math.sin(lam), Math.cos(lam) * Math.cos(lom)];
      fn({ i, j, n, corners: [pt(la0, lo0), pt(la0, lo1), pt(la1, lo1), pt(la1, lo0)], nrm, lam, lom });
    }
  }
}
function quad(ctx, c, inset = 0.86) {
  const cx = (c[0][0] + c[1][0] + c[2][0] + c[3][0]) / 4, cy = (c[0][1] + c[1][1] + c[2][1] + c[3][1]) / 4;
  ctx.beginPath();
  c.forEach(([px, py], k) => { const qx = cx + (px - cx) * inset, qy = cy + (py - cy) * inset; if (k) ctx.lineTo(qx, qy); else ctx.moveTo(qx, qy); });
  ctx.closePath();
}
/** The view reflected off a tile: which way it looks out into the room (y up is negative). */
const reflectOf = ([nx, ny, nz]) => [2 * nz * nx, 2 * nz * ny, 2 * nz * nz - 1];
/** A four-point sparkle. */
function star(ctx, x, y, s, alpha) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.16, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.16, y); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x, y + s * 0.16); ctx.lineTo(x + s, y); ctx.lineTo(x, y - s * 0.16); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, s * 0.18, 0, TAU); ctx.fill();
  ctx.restore();
}
function sparkles(ctx, x, y, r, t, count, seed = 0) {
  for (let k = 0; k < count; k++) {
    const ph = (t * 0.9 + hash(k, seed, 1) * 7) % 1;
    const a = Math.sin(ph * Math.PI);
    if (a < 0.2) continue;
    const ang = hash(k, seed, 2) * TAU, d = Math.sqrt(hash(k, seed, 3)) * r * 0.8;
    star(ctx, x + Math.cos(ang) * d - r * 0.15, y + Math.sin(ang) * d - r * 0.2, r * (0.16 + 0.12 * hash(k, seed, 4)) * a, a);
  }
}
function rim(ctx, x, y, r, accent, pulse) {
  ctx.strokeStyle = accent; ctx.globalAlpha = 0.5 + 0.3 * pulse; ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.beginPath(); ctx.arc(x, y, r * 0.97, 0.1, 1.5); ctx.stroke(); ctx.globalAlpha = 1;
}

import { drawChromeBall, drawDiscoBall } from '../game/banger/mirrorball.js';

export const MIRRORBALL_CANDIDATES = Object.freeze({
  /** CHROME — the candidate first picked; it lives beside the club's in src/game/banger/mirrorball.js. */
  chrome: drawChromeBall,
  /** DISCO: the same sphere of tiles, but the floor's colours caught in the lower half, wheeling. */
  disco: drawDiscoBall,

  /** CARTOON: fewer, bigger tiles, flat three-tone, an inked outline and a shine blob — the cast's look. */
  cartoon(ctx, x, y, r, { t, pulse, accent }) {
    ctx.save();
    ctx.fillStyle = '#2a2838'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    forTiles(x, y, r, 9, t * 0.5, ({ i, j, corners, nrm }) => {
      const d = -0.5 * nrm[0] - 0.6 * nrm[1] + 0.6 * nrm[2];
      const tone = d > 0.55 ? '#f2f4fa' : d > 0.15 ? '#b8bccc' : '#7c8094';
      ctx.fillStyle = hash(i, j, 5) < 0.12 ? DISCO[(i + j) % DISCO.length] : tone;
      quad(ctx, corners, 0.82); ctx.fill();
    });
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.22, r * 0.12, -0.6, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#1b1828'; ctx.lineWidth = Math.max(1, r * 0.07);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    sparkles(ctx, x, y, r, t, 3, 3);
    rim(ctx, x, y, r * 0.93, accent, pulse);
    ctx.restore();
  },

  /** GEM: a low-poly faceted sphere, each triangle flat-shaded — a cut crystal rather than tiles. */
  gem(ctx, x, y, r, { t, pulse, accent }) {
    ctx.save();
    const rot = t * 0.6, bands = 7;
    for (let i = 0; i < bands; i++) {
      const la0 = -Math.PI / 2 + i * Math.PI / bands, la1 = la0 + Math.PI / bands;
      const n = 12;
      for (let j = 0; j < n; j++) {
        const lo0 = (j + (i % 2) * 0.5) / n * TAU + rot, lo1 = lo0 + TAU / n;
        const P = (la, lo) => [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
        for (const tri of [[P(la0, lo0), P(la0, lo1), P(la1, lo0)], [P(la0, lo1), P(la1, lo1), P(la1, lo0)]]) {
          const nx = tri.reduce((s, p) => s + p[0], 0), ny = tri.reduce((s, p) => s + p[1], 0), nz = tri.reduce((s, p) => s + p[2], 0);
          if (nz <= 0) continue;
          const l = Math.hypot(nx, ny, nz);
          const d = (-0.5 * nx - 0.6 * ny + 0.6 * nz) / l;
          const R = reflectOf([nx / l, ny / l, nz / l]);
          let fill = mix('#2a3050', '#e8f0ff', Math.max(0, Math.min(1, 0.2 + d * 0.8)));
          if (R[1] > 0.3) fill = mix('#2a3050', DISCO[(i * 2 + j) % DISCO.length], 0.55);
          if (Math.pow(Math.max(0, d), 12) > 0.5) fill = '#ffffff';
          ctx.fillStyle = fill; ctx.strokeStyle = 'rgba(10,10,20,0.35)'; ctx.lineWidth = 0.6;
          ctx.beginPath(); tri.forEach((p, k) => (k ? ctx.lineTo(x + p[0] * r, y + p[1] * r) : ctx.moveTo(x + p[0] * r, y + p[1] * r)));
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      }
    }
    sparkles(ctx, x, y, r, t, 4, 4);
    rim(ctx, x, y, r, accent, pulse);
    ctx.restore();
  },

  /** MIDNIGHT: a dark ball, most tiles near-black, a bright specular band sweeping across as it turns. */
  midnight(ctx, x, y, r, { t, pulse, accent }) {
    ctx.save();
    ctx.fillStyle = '#07060c'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    const sweep = Math.sin(t * 0.9) * 0.5;
    forTiles(x, y, r, 18, t * 0.6, ({ i, j, corners, nrm }) => {
      const R = reflectOf(nrm);
      const band = Math.exp(-Math.pow((R[0] - sweep) * 3.2, 2)) * Math.max(0, -R[1] + 0.2);
      const v = Math.min(1, 0.08 + 0.95 * band + 0.1 * hash(i, j));
      const c = Math.round(20 + 235 * v);
      ctx.fillStyle = hash(i, j, 7) < 0.06 ? accent : `rgb(${c},${c},${Math.min(255, c + 30)})`;
      quad(ctx, corners, 0.84); ctx.fill();
    });
    sparkles(ctx, x, y, r, t, 6, 5);
    rim(ctx, x, y, r, accent, pulse);
    ctx.restore();
  },
});
