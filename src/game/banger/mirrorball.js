// THE CLUB'S MIRROR BALL — the DISCO look, picked from the bake-off (Peter, 3 Oct 2026:
// chrome first, then corrected to disco; the other candidates are in
// src/dev/mirrorball-candidates.js, the lab gallery's "mirror ball looks").
//
// Each tile is a quad ON THE SPHERE — its four corners projected — not a flat rectangle,
// and it is shaded by what it REFLECTS: the view bounced off the tile and out into the
// room, bright where it looks up at the ceiling's lights, dark where it looks at the floor,
// with a glint where it catches the key light. DISCO's lower half catches the floor's
// colours, wheeling round as it turns. Four-point sparkles twinkle over it.

const TAU = Math.PI * 2;
const hash = (a, b, c = 0) => { const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return s - Math.floor(s); };

/** Every visible tile of a ball of `bands` rows: its corners, its normal at the middle. */
export function forTiles(x, y, r, bands, rot, fn) {
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
/** A tile, added to the current path a little inside its corners so the dark between them reads as grout. */
export function quadPath(ctx, c, inset = 0.86) {
  const cx = (c[0][0] + c[1][0] + c[2][0] + c[3][0]) / 4, cy = (c[0][1] + c[1][1] + c[2][1] + c[3][1]) / 4;
  c.forEach(([px, py], k) => { const qx = cx + (px - cx) * inset, qy = cy + (py - cy) * inset; if (k) ctx.lineTo(qx, qy); else ctx.moveTo(qx, qy); });
  ctx.closePath();
}
/** One tile as its own path. */
export function quad(ctx, c, inset = 0.86) { ctx.beginPath(); quadPath(ctx, c, inset); }
/** The view reflected off a tile: which way it looks out into the room (y up is negative). */
export const reflectOf = ([nx, ny, nz]) => [2 * nz * nx, 2 * nz * ny, 2 * nz * nz - 1];
/** A four-point sparkle. */
export function star(ctx, x, y, s, alpha) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.16, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.16, y); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x, y + s * 0.16); ctx.lineTo(x + s, y); ctx.lineTo(x, y - s * 0.16); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, s * 0.18, 0, TAU); ctx.fill();
  ctx.restore();
}
export function sparkles(ctx, x, y, r, t, count, seed = 0) {
  for (let k = 0; k < count; k++) {
    const ph = (t * 0.9 + hash(k, seed, 1) * 7) % 1;
    const a = Math.sin(ph * Math.PI);
    if (a < 0.2) continue;
    const ang = hash(k, seed, 2) * TAU, d = Math.sqrt(hash(k, seed, 3)) * r * 0.8;
    star(ctx, x + Math.cos(ang) * d - r * 0.15, y + Math.sin(ang) * d - r * 0.2, r * (0.16 + 0.12 * hash(k, seed, 4)) * a, a);
  }
}
export function rim(ctx, x, y, r, accent, pulse) {
  ctx.strokeStyle = accent; ctx.globalAlpha = 0.5 + 0.3 * pulse; ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.beginPath(); ctx.arc(x, y, r * 0.97, 0.1, 1.5); ctx.stroke(); ctx.globalAlpha = 1;
}

/** The chrome ball (a bake-off candidate) at (x, y), radius r, turning with `t`; `accent` is the rim light. */
export function drawChromeBall(ctx, x, y, r, { t, pulse = 0, accent = '#c9a0ff' }) {
  ctx.save();
  ctx.fillStyle = '#0d0b14'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  forTiles(x, y, r, 16, t * 0.6, ({ i, j, corners, nrm }) => {
    const R = reflectOf(nrm);
    const up = Math.max(0, -R[1]), side = 1 - Math.abs(R[1]);
    const glint = Math.pow(Math.max(0, -0.5 * R[0] - 0.6 * R[1] + 0.6 * R[2]), 18);
    let v = 0.18 + 0.6 * up + 0.2 * side * hash(i, j);
    v = Math.min(1, v + glint);
    const c = Math.round(40 + 215 * v);
    ctx.fillStyle = `rgb(${c},${c},${Math.min(255, c + 22)})`;
    quad(ctx, corners); ctx.fill();
  });
  const sh = ctx.createRadialGradient(x, y, r * 0.6, x, y, r);
  sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  sparkles(ctx, x, y, r, t, 4, 1);
  rim(ctx, x, y, r, accent, pulse);
  ctx.restore();
}

const DISCO = ['#ff4fa3', '#3fb8ff', '#ffd23f', '#7cff6b', '#c9a0ff', '#ff7a59'];
const mix = (a, b, k) => {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(',')})`;
};

/**
 * THE CLUB'S BALL: the disco ball at (x, y), radius r — the floor's colours caught in its
 * lower half. `hits` are where lasers land on it ({ x, y, colour, a }): the mirrors round
 * each hit flare in the laser's colour, and a scatter of facets across the ball catch it too
 * (Peter, 3 Oct 2026). `lights`, while the rig plays a light show ({ colour(i), k, step }: the
 * colour of can i, left to right, how far the show has faded, the sixteenth it is on), are caught
 * in the top half, which mirrors the rig: a scatter of facets in the colour of the can each one
 * looks up at, a new scatter every sixteenth as the colours chase (Peter, 5 Oct 2026).
 *
 * Tiles of the same shade are drawn as ONE path, one fill: a quarter of a thousand separate
 * fills a frame was the second-biggest cost in the club on a phone, and a ball of a dozen
 * greys looks the same as one of two hundred and fifty.
 */
export function drawDiscoBall(ctx, x, y, r, { t, pulse = 0, hits = [], bands = 16, lights = null }) {
  ctx.save();
  ctx.fillStyle = '#0d0b14'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  const buckets = new Map();       // fill colour -> corner lists
  const overlay = new Map();       // `colour|alpha` -> corner lists (the laser hits)
  const put = (map, key, corners) => { const l = map.get(key); if (l) l.push(corners); else map.set(key, [corners]); };
  forTiles(x, y, r, bands, t * 0.6, ({ i, j, corners, nrm, lom }) => {
    const R = reflectOf(nrm);
    const up = Math.max(0, -R[1]);
    const glint = Math.pow(Math.max(0, -0.5 * R[0] - 0.6 * R[1] + 0.6 * R[2]), 16);
    const base = Math.round((50 + 180 * up) / 12) * 12;
    let fill = `rgb(${base},${base},${Math.min(255, base + 24)})`;
    if (R[1] > 0.1) {
      const hue = DISCO[Math.floor(((lom / TAU) * 6 + t * 0.5 + i * 0.3) % 6 + 6) % 6];
      // shade quantised to eighths so tiles of a hue share a fill
      fill = mix('#20202c', hue, Math.round(Math.min(1, 0.35 + R[1] * 0.8) * (0.7 + 0.3 * pulse) * 8) / 8);
    }
    if (lights && R[1] < -0.1 && hash(i, j, 31 + lights.step) < 0.6 * lights.k) {
      const can = Math.max(0, Math.min(5, Math.round((R[0] + 1) * 2.5)));
      fill = mix('#30303c', lights.colour(can), Math.round(Math.min(1, 0.5 + up * 0.6) * 4) / 4);
    }
    if (glint > 0.4) fill = '#ffffff';
    put(buckets, fill, corners);
    for (const h of hits) {
      const cx = (corners[0][0] + corners[2][0]) / 2, cy = (corners[0][1] + corners[2][1]) / 2;
      const near = 1 - Math.hypot(cx - h.x, cy - h.y) / (r * 0.55);
      const caught = near > 0 ? near : hash(i, j, 9 + Math.floor(t * 6)) < 0.07 ? 0.6 : 0;
      if (caught > 0) {
        const alpha = Math.round(Math.min(1, caught * 1.3) * (h.a ?? 1) * 4) / 4;
        if (alpha > 0) put(overlay, `${near > 0.75 ? '#ffffff' : h.colour}|${alpha}`, corners);
      }
    }
  });
  const fillAll = (list) => {
    ctx.beginPath();
    for (const c of list) quadPath(ctx, c);
    ctx.fill();
  };
  for (const [fill, list] of buckets) { ctx.fillStyle = fill; fillAll(list); }
  for (const [key, list] of overlay) {
    const [colour, alpha] = key.split('|');
    ctx.globalAlpha = Number(alpha); ctx.fillStyle = colour; fillAll(list);
  }
  ctx.globalAlpha = 1;
  const sh = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
  sh.addColorStop(0, 'rgba(255,255,255,0.35)'); sh.addColorStop(0.3, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  sparkles(ctx, x, y, r, t, 5, 2);
  // no accent rim: the purple arc round its lower right read as a mark, not light (Peter, 5 Oct 2026)
  ctx.restore();
}
