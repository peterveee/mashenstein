// THE CLUB'S BEACH BALL — the VINYL look, picked from the bake-off (Peter, 4 Oct 2026:
// "vinyl please"; the other candidates are in src/dev/beachball-candidates.js, the lab
// gallery's "beach ball looks").
//
// A beach ball is GORES — panels running pole to pole — so its stripes curve round the
// sphere and meet at a white cap. Each gore is traced on a real sphere, clipped to the half
// facing the viewer, and the ball spins about a leaning axis so the panels sweep round in
// depth as it flies. VINYL adds what makes it an inflatable: light welded seams, a valve,
// a window caught across the top, and a squash where it lands on a head.

export const TAU = Math.PI * 2;
export const INK = '#1b1828';   // the cast's contour ink

/** Rotation by `a` about the unit axis `k` (Rodrigues), as a 3x3 row-major matrix. */
export function rotAbout([kx, ky, kz], a) {
  const c = Math.cos(a), s = Math.sin(a), v = 1 - c;
  return [
    [c + kx * kx * v, kx * ky * v - kz * s, kx * kz * v + ky * s],
    [ky * kx * v + kz * s, c + ky * ky * v, ky * kz * v - kx * s],
    [kz * kx * v - ky * s, kz * ky * v + kx * s, c + kz * kz * v],
  ];
}
const mul = (A, B) => A.map((row) => [0, 1, 2].map((j) => row[0] * B[0][j] + row[1] * B[1][j] + row[2] * B[2][j]));
const norm = ([x, y, z]) => { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; };

// At rest the top pole leans toward the viewer and up-left, so a cap shows and the gores
// fan out from it — the pose every beach ball in a picture is drawn in.
const REST = mul(rotAbout([0, 0, 1], -0.45), rotAbout([1, 0, 0], -0.8));

/** The ball's orientation: spun about an axis that is mostly into the screen (a roll, the
 *  way a tossed ball turns as it travels) but leans, so the gores sweep round in depth. */
export function orient(spin, dir) {
  return mul(rotAbout(norm([0.35 * dir, -0.55, 1]), spin * dir), REST);
}

/** A body-space point (latitude, longitude) on the unit sphere, rotated to screen space
 *  (x right, y down, z toward the viewer). The north pole is body -y: up. */
export function onSphere(M, la, lo) {
  const p = [Math.cos(la) * Math.cos(lo), -Math.sin(la), Math.cos(la) * Math.sin(lo)];
  return [0, 1, 2].map((i) => M[i][0] * p[0] + M[i][1] * p[1] + M[i][2] * p[2]);
}

/** Trace a closed polygon of unit-sphere points (screen space), clipped to the half facing
 *  the viewer: where the outline goes round the back, it follows the ball's edge instead,
 *  from where it left the front to where it comes back. Every shape traced here (a 60°
 *  gore, a cap) meets the edge in an arc of 180° or less, so the short way round is right.
 *  Returns false when none of it faces the viewer. */
export function frontPath(ctx, pts, x, y, r) {
  const n = pts.length;
  const start = pts.findIndex((p) => p[2] >= 0);
  if (start < 0) return false;
  ctx.beginPath();
  let first = true, exitA = 0;
  const to = (px, py) => { if (first) { ctx.moveTo(px, py); first = false; } else ctx.lineTo(px, py); };
  const edge = (a, b) => {
    const k = a[2] / (a[2] - b[2]);
    const ex = a[0] + (b[0] - a[0]) * k, ey = a[1] + (b[1] - a[1]) * k;
    return Math.atan2(ey, ex);
  };
  for (let s = 0; s < n; s++) {
    const a = pts[(start + s) % n], b = pts[(start + s + 1) % n];
    if (a[2] >= 0) to(x + a[0] * r, y + a[1] * r);
    if (a[2] >= 0 && b[2] < 0) {
      exitA = edge(a, b);
      to(x + Math.cos(exitA) * r, y + Math.sin(exitA) * r);
    } else if (a[2] < 0 && b[2] >= 0) {
      const entryA = edge(a, b);
      let d = entryA - exitA;
      d -= TAU * Math.round(d / TAU);
      const steps = Math.max(2, Math.ceil(Math.abs(d) / 0.12));
      for (let k = 1; k <= steps; k++) {
        const ang = exitA + d * k / steps;
        to(x + Math.cos(ang) * r, y + Math.sin(ang) * r);
      }
    }
  }
  ctx.closePath();
  return true;
}

const STEPS = 22;
/** One gore's outline: down one seam and back up the next. */
export function gorePath(ctx, M, x, y, r, lo0, lo1) {
  const pts = [];
  for (let k = 0; k <= STEPS; k++) pts.push(onSphere(M, -Math.PI / 2 + Math.PI * k / STEPS, lo0));
  for (let k = STEPS - 1; k > 0; k--) pts.push(onSphere(M, -Math.PI / 2 + Math.PI * k / STEPS, lo1));
  return frontPath(ctx, pts, x, y, r);
}

/** A pole cap, `size` radians across. */
export function capPath(ctx, M, x, y, r, north, size) {
  const la = (north ? 1 : -1) * (Math.PI / 2 - size);
  const pts = [];
  for (let k = 0; k < 28; k++) pts.push(onSphere(M, la, TAU * k / 28));
  return frontPath(ctx, pts, x, y, r);
}

/** The front-facing run of one seam, for stroking. */
export function seamPath(ctx, M, x, y, r, lo, capSize) {
  ctx.beginPath();
  let pen = false;
  const lim = Math.PI / 2 - capSize;
  for (let k = 0; k <= STEPS * 2; k++) {
    const w = onSphere(M, -lim + 2 * lim * k / (STEPS * 2), lo);
    if (w[2] < 0) { pen = false; continue; }
    const px = x + w[0] * r, py = y + w[1] * r;
    if (pen) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    pen = true;
  }
}

/** Every candidate's sphere: gores in `cols`, white (or `cap`) caps, clipped to the ball. */
export function gores(ctx, M, x, y, r, cols, { cap = '#ffffff', capSize = 0.3, seam = null, seamW = 0.03 } = {}) {
  const n = cols.length;
  cols.forEach((c, i) => {
    ctx.fillStyle = c;
    if (gorePath(ctx, M, x, y, r, i * TAU / n, (i + 1) * TAU / n)) ctx.fill();
  });
  if (seam) {
    ctx.strokeStyle = seam; ctx.lineWidth = Math.max(0.5, r * seamW); ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) { seamPath(ctx, M, x, y, r, i * TAU / n, capSize); ctx.stroke(); }
  }
  ctx.fillStyle = cap;
  for (const north of [true, false]) if (capPath(ctx, M, x, y, r, north, capSize)) ctx.fill();
}

/** Soft key light from the upper left, falling off to a cool shade at the lower right. */
export function softShade(ctx, x, y, r, dark = 'rgba(30,14,60,0.5)') {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x - r * 0.1, y - r * 0.1, r * 1.25);
  g.addColorStop(0, 'rgba(255,255,255,0.28)');
  g.addColorStop(0.45, 'rgba(255,255,255,0)');
  g.addColorStop(0.8, 'rgba(0,0,0,0)');
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}
/** A glossy highlight: a soft bloom with a hard white core. */
export function gloss(ctx, x, y, r, a = 1) {
  const hx = x - r * 0.4, hy = y - r * 0.45;
  const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, r * 0.42);
  g.addColorStop(0, `rgba(255,255,255,${0.7 * a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy, r * 0.42, 0, TAU); ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${0.95 * a})`;
  ctx.beginPath(); ctx.ellipse(hx, hy, r * 0.16, r * 0.09, -0.7, 0, TAU); ctx.fill();
}
export function outline(ctx, x, y, r, w, col = INK) {
  ctx.strokeStyle = col; ctx.lineWidth = w;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
}
export function clipBall(ctx, x, y, r) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
}

export const BEACH_BALL_COLOURS = Object.freeze(['#ee2b3b', '#ffffff', '#ffcf24', '#ffffff', '#2f8cf0', '#ffffff']);
/** The second ball's, when two cross together: the same ball in other colours. */
export const BEACH_BALL_COLOURS_2 = Object.freeze(['#a35cf0', '#ffffff', '#3fd2c8', '#ffffff', '#ff8c2a', '#ffffff']);

/** The ball alone, centre (x, y), radius r: `spin` its turn so far (radians), `dir` ±1 the
 *  way it travels, `squash` 0 in the air rising to 1 at the instant it lands on a head. */
export function drawBeachBall(ctx, x, y, r, { spin = 0, dir = 1, squash = 0, colours = BEACH_BALL_COLOURS } = {}) {
  const M = orient(spin, dir);
  ctx.save();
  // squash and stretch about the bottom of the ball, where it meets the head
  const sq = 0.16 * squash;
  ctx.translate(x, y + r); ctx.scale(1 + sq, 1 - sq); ctx.translate(-x, -y - r);
  ctx.save(); clipBall(ctx, x, y, r);
  gores(ctx, M, x, y, r, colours, { seam: 'rgba(255,255,255,0.55)', seamW: 0.025, capSize: 0.28 });
  // the valve, on the white gore nearest the equator
  const v = onSphere(M, 0.22, TAU * 1.5 / 6);
  if (v[2] > 0.15) {
    ctx.fillStyle = '#e8e2d6'; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = Math.max(0.5, r * 0.02);
    ctx.beginPath(); ctx.ellipse(x + v[0] * r, y + v[1] * r, r * 0.07 * v[2], r * 0.07, Math.atan2(v[1], v[0]), 0, TAU);
    ctx.fill(); ctx.stroke();
  }
  softShade(ctx, x, y, r, 'rgba(30,14,60,0.42)');
  // a window caught on the vinyl: a rounded pane, bent by the curve
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.save(); ctx.translate(x - r * 0.3, y - r * 0.5); ctx.rotate(-0.35);
  ctx.beginPath(); ctx.ellipse(0, 0, r * 0.3, r * 0.13, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.ellipse(0, r * 0.05, r * 0.22, r * 0.06, 0, Math.PI * 1.9, Math.PI * 1.1, true); ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath(); ctx.ellipse(x + r * 0.42, y + r * 0.5, r * 0.14, r * 0.05, -0.8, 0, TAU); ctx.fill();
  ctx.restore();
  outline(ctx, x, y, r, Math.max(1, r * 0.04));
  ctx.restore();
}
