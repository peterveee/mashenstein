// THE HARD FILLS — spike beds and gear works — as shipped from the 24 Sep 2026
// bake-off (src/dev/pit-spikes-gears-candidates.js). game/pitFill.js imports
// `spikes` and `gears` from here and names them in its FILLS table; the fill id
// in data stays 'spikes' / 'gears', and which bed or which machine a hole gets
// is decided here, per pit, and is purely a painting detail.
//
// Peter picked: spikes B (staggered steel), C (rusted stakes) and D (piston
// bed); gears B (meshed train) and C (grinder). "The rusted spikes look
// fantastic in the speed zone" — so SPEED ZONE's spike pits are all stakes, and
// everywhere else the winners are MIXED for variety.
//
// Every painter keeps the shipped contract, which is why the landing heights
// did not move:
//   - it draws into the fill's local box: x 0..w, y 0 at the flat groundline
//     down to y = d, and never across the open top of the break — the sky and
//     parallax read straight through it;
//   - a spike bed's TALLEST tips stand at SPIKE_TIPS of the apron and a gear
//     train's highest tooth at GEAR_TOPS, which is where game/run.js stops a
//     falling hero (FILL_SURFACE) — he lands on what the eye was measuring;
//   - portrait closes the dry bay with hardFillCutoff()'s line rather than
//     running the shaft to the bottom of the phone.
//
// `env` is what drawPitFill is handed beyond the box (see drawPitFills in
// engine/stylePacks): `seed` (the pit's world x), `cab` (cabinet id),
// `crossing` (the stepping-stone layout, when the hole is one), `beat` (the
// song clock, for the piston) and `paperSlab` (the pack's paper finish, which
// the gear works wear on the plumber cabinet). All optional.
import {
  SPIKE_TIPS, GEAR_TOPS, HARD_FILL_LANDSCAPE_DEPTH, hardFillCutoff, liquidSurfaceDepth,
} from './pitFill.js';

const TAU = Math.PI * 2;
const INK = '#232a34';

function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

// ------------------------------------------------------------ the mixing
//
// PER BAY, where a bay is the stretch of a hole between two stepping stones —
// so an ordinary pit is one bay, and a crossing is as many bays as it has
// jumps. The two sets of hard fills are drawn only in crossings (speed-3 and
// surge-2 spikes, plumber-2 gears; RHYTHM's LCD pack cuts its own cogs), one
// crossing per stage, so keying the pick on the whole pit would have put ONE
// design in the game per stage and the mix nowhere. Cutting at the middle of
// each stone puts the seam under a slab, where the eye is on the stone.
//
// Deterministic: the first bay's pick is a hash of the pit's world x (stable
// across frames, rewinds and checkpoint restores — the hole is re-cut at the
// same x), and each next bay steps to the next design, so neighbours always
// differ.
const SPIKE_BEDS = [spikesSteel, spikesStakes, spikesPiston];
const GEAR_WORKS = [gearsMeshed, gearsGrinder];
// A cabinet that wears one design everywhere instead of the mix.
const HOUSE_SPIKES = { speed: spikesStakes };

/** Which painter each bay of a pit gets — exported for tests and the docs. */
export function hardFillPlan(id, w, env = null) {
  const set = id === 'spikes'
    ? (HOUSE_SPIKES[env?.cab] ? [HOUSE_SPIKES[env.cab]] : SPIKE_BEDS)
    : GEAR_WORKS;
  const cuts = set.length > 1 ? bayCuts(w, env) : [0, w];
  const start = Math.floor(hash(Math.round(env?.seed ?? 0) * 0.0137) * set.length) % set.length;
  const bays = [];
  for (let i = 0; i + 1 < cuts.length; i++) {
    bays.push({ x0: cuts[i], x1: cuts[i + 1], paint: set[(start + i) % set.length] });
  }
  return bays;
}

function bayCuts(w, env) {
  const cuts = [0];
  const stones = env?.crossing?.stones;
  if (Array.isArray(stones) && Number.isFinite(env?.seed)) {
    for (const s of stones) {
      const c = s.x + s.w / 2 - env.seed;
      // A bay too narrow to hold a design is not a bay; leave it to its neighbour.
      if (c > 24 && c < w - 24 && c - cuts[cuts.length - 1] > 24) cuts.push(c);
    }
  }
  cuts.push(w);
  return cuts;
}

function paintBays(id, ctx, w, d, t, lift, env) {
  const bays = hardFillPlan(id, w, env);
  if (bays.length === 1) { bays[0].paint(ctx, w, d, t, lift, env); return; }
  for (let i = 0; i < bays.length; i++) {
    const { x0, x1, paint } = bays[i];
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, -lift - 1, x1 - x0, d + lift + 2); ctx.clip();
    ctx.translate(x0, 0);
    // Each bay a little out of step with the next, the way separate pits are.
    paint(ctx, x1 - x0, d, t + i * 0.37, lift, env);
    ctx.restore();
  }
}

export function spikes(ctx, w, d, t, lift = 0, env = null) { paintBays('spikes', ctx, w, d, t, lift, env); }
export function gears(ctx, w, d, t, lift = 0, env = null) { paintBays('gears', ctx, w, d, t, lift, env); }

// ------------------------------------------------------------ shared bits

// The dry bay: landscape gets a banded plate from `y` down, portrait gets only
// the closing line at hardFillCutoff and leaves the background showing below
// (drawPitFill has already laid the level's ground under that line).
function plate(ctx, w, d, y, bottom, top = '#232a34', body = '#171522') {
  const end = Math.max(y + 2, Math.min(d, bottom));
  if (d > HARD_FILL_LANDSCAPE_DEPTH) {
    ctx.fillStyle = '#59636f'; ctx.fillRect(0, end, w, 1);
    ctx.fillStyle = '#232a34'; ctx.fillRect(0, end + 1, w, 1);
    return;
  }
  const detailD = liquidSurfaceDepth(d);
  const band = Math.max(2, detailD * 0.06);
  ctx.fillStyle = top; ctx.fillRect(0, y, w, band);
  ctx.fillStyle = body; ctx.fillRect(0, y + band, w, Math.max(0, end - (y + band)));
}

// A four-point star: the one mark that says "sharp steel caught the light"
// without a gradient. Additive, so it can only ever brighten what it lands on.
function sparkle(ctx, x, y, r, a, color = '#ffffff') {
  if (a <= 0.01 || r <= 0.05) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(1, a);
  ctx.fillStyle = color;
  ctx.beginPath();
  const k = r * 0.18;
  ctx.moveTo(x, y - r); ctx.lineTo(x + k, y - k); ctx.lineTo(x + r, y); ctx.lineTo(x + k, y + k);
  ctx.lineTo(x, y + r); ctx.lineTo(x - k, y + k); ctx.lineTo(x - r, y); ctx.lineTo(x - k, y - k);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// The cabinet's paper finish when it has one (the plumber pack does): a close
// contact shadow under the silhouette and the cardstock grain over it — the
// same two passes drawRoutes gives a slab.
function paperContact(ctx, env, pathFn) {
  const ps = env?.paperSlab;
  if (ps?.contact) ps.contact(ctx, () => pathFn(ctx), { subtle: true });
}
function paperFinish(ctx, env, pathFn) {
  const ps = env?.paperSlab;
  if (ps?.finish) ps.finish(ctx, () => pathFn(ctx));
}

// ===================================================================== SPIKES
// Every bed: tallest tip at SPIKE_TIPS, base on the plate at half the apron,
// fixed pitch so a 60px pit and a 600px crossing read the same.

// B — STAGGERED STEEL. The tooth as a faceted blade, not a flat triangle: a lit
// face and a shadow face split down the ridge is what makes a 3px triangle read
// as a three-dimensional point from across the frame. Heights run in a
// tall-short-mid-short figure so the row has a rhythm rather than a comb, and
// the teeth stand in a bolted rail. The glint is a star that walks the row,
// popping on one TIP at a time — light caught on a point, not a smear.
function spikesSteel(ctx, w, d, t) {
  const detailD = liquidSurfaceDepth(d);
  const base = detailD * 0.5;
  plate(ctx, w, d, base, hardFillCutoff('spikes', w, d));
  const tip = detailD * SPIKE_TIPS;
  const pitch = 7;
  const n = Math.max(3, Math.round(w / pitch));
  const step = w / n;
  const FIG = [1, 0.62, 0.82, 0.55];
  const tall = base - tip;
  const tips = [];
  for (let i = 0; i < n; i++) {
    const cx = step * (i + 0.5);
    const h = tall * FIG[i % 4];
    const half = step * (FIG[i % 4] > 0.9 ? 0.36 : 0.3);
    const ty = base - h;
    // shadow face (right) then lit face (left) then one ink outline.
    ctx.fillStyle = '#6f7b8b';
    ctx.beginPath(); ctx.moveTo(cx, ty); ctx.lineTo(cx + half, base); ctx.lineTo(cx, base); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#eef3f8';
    ctx.beginPath(); ctx.moveTo(cx, ty); ctx.lineTo(cx, base); ctx.lineTo(cx - half, base); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 0.42;
    ctx.beginPath(); ctx.moveTo(cx - half, base); ctx.lineTo(cx, ty); ctx.lineTo(cx + half, base); ctx.stroke();
    tips.push([cx, ty]);
  }
  // The rail: a dark bar with a lit top edge and a bolt head between teeth.
  const rh = 2.4;
  ctx.fillStyle = '#39414d'; ctx.fillRect(0, base - 0.6, w, rh);
  ctx.fillStyle = '#9aa6b5'; ctx.fillRect(0, base - 0.6, w, 0.45);
  ctx.fillStyle = INK; ctx.fillRect(0, base - 0.6 + rh, w, 0.4);
  for (let i = 0; i < n; i += 2) {
    const bx = step * (i + 1);
    if (bx >= w - 0.5) continue;
    ctx.fillStyle = '#c3ccd7';
    ctx.beginPath(); ctx.arc(bx, base + 0.6, 0.55, 0, TAU); ctx.fill();
  }
  // The walking glint: one tall tip at a time, a quick flare and fade.
  const talls = tips.filter((_, i) => i % 4 === 0);
  if (talls.length) {
    const k = t * 2.6;
    const at = Math.floor(k) % (talls.length + 2);
    const f = k - Math.floor(k);
    if (at < talls.length) {
      const [gx, gy] = talls[at];
      const a = f < 0.25 ? f / 0.25 : 1 - (f - 0.25) / 0.75;
      sparkle(ctx, gx, gy + 0.3, 2.2 * a + 0.4, a * 0.95);
    }
  }
}

// C — RUSTED STAKES. The trap somebody set a long time ago. Iron stakes, each
// leaning its own few degrees so the row is a hand-planted thing, rust-dark
// with a filed bright point — the metal is only clean where it is sharp, which
// puts the one light value exactly where the danger is. Barbed wire strung
// between them, and a skull and a thigh bone at their feet: the fastest "this
// kills you" in the whole vocabulary. The wire's sway is the motion.
function spikesStakes(ctx, w, d, t) {
  const detailD = liquidSurfaceDepth(d);
  const base = detailD * 0.5;
  plate(ctx, w, d, base, hardFillCutoff('spikes', w, d), '#3a2a22', '#1c1512');
  const tip = detailD * SPIKE_TIPS;
  const pitch = 8;
  const n = Math.max(3, Math.round(w / pitch));
  const step = w / n;
  const boneEvery = Math.max(3, Math.round(40 / step));
  const stakes = [];
  for (let i = 0; i < n; i++) {
    const seed = i * 7.31 + 3.7;
    const cx = step * (i + 0.5) + (hash(seed) - 0.5) * step * 0.3;
    const lean = (hash(seed + 1) - 0.5) * 0.36;
    // Every other stake reaches the full height; the rest fall short, so the
    // tips form a ragged line whose TOP is SPIKE_TIPS.
    const h = (base - tip) * (i % 2 === 0 ? 1 : 0.7 + hash(seed + 2) * 0.2) / Math.cos(lean);
    const sx = Math.sin(lean), sy = -Math.cos(lean); // unit vector up the stake
    const nx = -sy, ny = sx;                          // across it
    const half = 1.35;
    const tx = cx + sx * h, ty = base + sy * h;
    stakes.push({ cx, sx, sy, h });
    // One long tapered spike, not a shaft with a cone on it: a shaft and a
    // cone is a pencil. Dark rust on the shadow side, a lit rust edge, and the
    // top third filed back to bright steel — clean only where it is sharp.
    const L = [cx - nx * half, base - ny * half], R = [cx + nx * half, base + ny * half];
    ctx.fillStyle = '#4a2416';
    ctx.beginPath(); ctx.moveTo(L[0], L[1]); ctx.lineTo(tx, ty); ctx.lineTo(R[0], R[1]); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a2552c';
    ctx.beginPath(); ctx.moveTo(L[0], L[1]); ctx.lineTo(tx, ty); ctx.lineTo(cx, base); ctx.closePath(); ctx.fill();
    // filed point: bright steel over the top 38%
    const k = 0.62;
    const fx = cx + sx * h * k, fy = base + sy * h * k;
    const fh = half * (1 - k);
    ctx.fillStyle = '#b9c0c8';
    ctx.beginPath(); ctx.moveTo(fx - nx * fh, fy - ny * fh); ctx.lineTo(tx, ty); ctx.lineTo(fx + nx * fh, fy + ny * fh); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f4f1ea';
    ctx.beginPath(); ctx.moveTo(fx - nx * fh, fy - ny * fh); ctx.lineTo(tx, ty); ctx.lineTo(fx, fy); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#1a1210'; ctx.lineWidth = 0.42;
    ctx.beginPath(); ctx.moveTo(L[0], L[1]); ctx.lineTo(tx, ty); ctx.lineTo(R[0], R[1]); ctx.stroke();
  }
  // BARBED WIRE strung stake to stake a third of the way up, sagging between
  // them and swaying a hair. It crosses the top band of the break where the
  // camera can see it from the road, and wire between stakes is what turns a
  // row of points into a TRAP somebody built.
  const wireAt = 0.55;
  ctx.strokeStyle = '#c9ccd0'; ctx.lineWidth = 0.38;
  for (let i = 0; i + 1 < stakes.length; i++) {
    const a = stakes[i], b = stakes[i + 1];
    const ha = Math.min(a.h, b.h) * wireAt;
    const ax = a.cx + a.sx * ha, ay = base + a.sy * ha;
    const bx = b.cx + b.sx * ha, by = base + b.sy * ha;
    const sag = 1.4 + Math.sin(t * 2.3 + i * 1.7) * 0.35;
    const mx = (ax + bx) / 2, my = (ay + by) / 2 + sag;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my + sag * 0.3, bx, by); ctx.stroke();
    // two barbs per span, each a little X
    for (const u of [0.33, 0.67]) {
      const px = (1 - u) * (1 - u) * ax + 2 * u * (1 - u) * mx + u * u * bx;
      const py = (1 - u) * (1 - u) * ay + 2 * u * (1 - u) * (my + sag * 0.3) + u * u * by;
      ctx.beginPath();
      ctx.moveTo(px - 0.7, py - 0.7); ctx.lineTo(px + 0.7, py + 0.7);
      ctx.moveTo(px + 0.7, py - 0.7); ctx.lineTo(px - 0.7, py + 0.7);
      ctx.stroke();
    }
  }
  // Bones at the foot of the row: a skull, then a thigh bone, alternating.
  for (let i = 1; i < n - 1; i += boneEvery) {
    const bx = step * (i + 1);
    if (((i / boneEvery) | 0) % 2 === 0) drawSkull(ctx, bx, base, hash(i + 5) > 0.5 ? 1 : -1);
    else drawBone(ctx, bx, base - 0.9, (hash(i + 6) - 0.5) * 0.5);
  }
}

function drawSkull(ctx, x, base, face) {
  const r = 2.1;
  const cy = base - r * 0.95;
  ctx.fillStyle = '#efe6cf';
  ctx.strokeStyle = INK; ctx.lineWidth = 0.35;
  ctx.beginPath(); ctx.ellipse(x, cy, r * 1.05, r, 0, 0, TAU); ctx.fill(); ctx.stroke();
  // jaw
  ctx.beginPath(); ctx.rect(x - r * 0.55 + face * 0.3, cy + r * 0.55, r * 1.1, r * 0.5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(x - r * 0.38 + face * 0.35, cy + 0.05, r * 0.3, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.38 + face * 0.35, cy + 0.05, r * 0.3, 0, TAU); ctx.fill();
  ctx.fillRect(x + face * 0.35 - 0.2, cy + r * 0.45, 0.4, 0.5);
}

function drawBone(ctx, x, y, a) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = '#efe6cf'; ctx.strokeStyle = INK; ctx.lineWidth = 0.32;
  const L = 3.2;
  ctx.beginPath();
  ctx.rect(-L, -0.45, L * 2, 0.9);
  for (const sx of [-L, L]) {
    ctx.moveTo(sx + 0.75, -0.75); ctx.arc(sx, -0.6, 0.75, 0, TAU);
    ctx.moveTo(sx + 0.75, 0.6); ctx.arc(sx, 0.6, 0.75, 0, TAU);
  }
  ctx.fill(); ctx.stroke();
  ctx.fillRect(-L + 0.3, -0.4, L * 2 - 0.6, 0.8);
  ctx.restore();
}

// D — PISTON BED. The spikes as a machine that FIRES: the bed is cut into
// blocks of three teeth, each on a ram, and on every beat one block slams to
// full height and eases back while the next one along loads. Never lower than
// four fifths — always lethal, the motion is a threat not a window — but the
// snap is the thing the eye catches from the lane, and it lands on the music:
// `env.beat` is the song clock, and without one it keeps 120 bpm off `t`.
// Yellow-and-ink chevrons on the ram faces are the hazard stripe the lane's
// own spike plate already wears.
function spikesPiston(ctx, w, d, t, lift, env) {
  const detailD = liquidSurfaceDepth(d);
  const base = detailD * 0.5;
  plate(ctx, w, d, base, hardFillCutoff('spikes', w, d));
  const tip = detailD * SPIKE_TIPS;
  const beat = Number.isFinite(env?.beat) ? env.beat : t * 2;
  const TEETH = 3;
  const pitch = 7;
  const nb = Math.max(1, Math.round(w / (pitch * TEETH)));
  const bw = w / nb;
  const ramH = 4;
  const full = base - tip - ramH * 0.35; // tooth height at full extension
  for (let b = 0; b < nb; b++) {
    // Which block fires: a wave that walks the bed, one block per beat,
    // four blocks apart so a long crossing has several going at once.
    const since = ((beat - b) % 4 + 4) % 4; // beats since this block last fired
    const kick = since < 1 ? Math.pow(1 - since, 3) : 0; // snap out, ease home
    const ext = 0.8 + 0.2 * kick;
    const x0 = b * bw + 0.5, x1 = (b + 1) * bw - 0.5;
    const ry = base - ramH + (1 - ext) * full;
    // the ram head, with a hazard stripe
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, ry, x1 - x0, base - ry + 0.2); ctx.clip();
    ctx.fillStyle = '#e8c23a'; ctx.fillRect(x0, ry, x1 - x0, base - ry + 0.2);
    ctx.fillStyle = INK;
    for (let s = x0 - 6; s < x1 + 2; s += 3) {
      ctx.beginPath(); ctx.moveTo(s, base + 0.2); ctx.lineTo(s + 1.4, base + 0.2);
      ctx.lineTo(s + 1.4 + ramH, ry); ctx.lineTo(s + ramH, ry); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = 0.4;
    ctx.strokeRect(x0, ry, x1 - x0, base - ry);
    // the teeth
    const tstep = (x1 - x0) / TEETH;
    for (let k = 0; k < TEETH; k++) {
      const cx = x0 + tstep * (k + 0.5);
      const h = full * (k === 1 ? 1 : 0.84);
      const half = tstep * 0.36;
      const ty = ry - h;
      ctx.fillStyle = '#707c8c';
      ctx.beginPath(); ctx.moveTo(cx, ty); ctx.lineTo(cx + half, ry); ctx.lineTo(cx, ry); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#eef3f8';
      ctx.beginPath(); ctx.moveTo(cx, ty); ctx.lineTo(cx, ry); ctx.lineTo(cx - half, ry); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 0.42;
      ctx.beginPath(); ctx.moveTo(cx - half, ry); ctx.lineTo(cx, ty); ctx.lineTo(cx + half, ry); ctx.stroke();
      if (kick > 0.35 && k === 1) sparkle(ctx, cx, ty + 0.2, 2.6 * kick, kick);
    }
  }
}

// ===================================================================== GEARS
// Every machine: highest tooth at GEAR_TOPS, bay plate from there down.

// One spur gear: `n` teeth on pitch radius r, tooth depth `dep`, rotated `a`.
function gearPath(ctx, cx, cy, r, n, a, dep) {
  const ro = r + dep * 0.5, ri = r - dep * 0.5;
  const tw = TAU / n;
  for (let k = 0; k < n; k++) {
    const c = a + k * tw;
    // trapezoid tooth: root half-width 0.3 pitch, tip half-width 0.17 pitch
    const pts = [[c - tw * 0.5, ri], [c - tw * 0.29, ri], [c - tw * 0.16, ro], [c + tw * 0.16, ro], [c + tw * 0.29, ri]];
    for (let p = 0; p < pts.length; p++) {
      const [ang, rad] = pts[p];
      const x = cx + Math.cos(ang) * rad, y = cy + Math.sin(ang) * rad;
      if (k === 0 && p === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
}

// A wheel with spoke windows cut through (evenodd), so the bay shows through
// the gear and the eye reads a real part, not a disc with a sticker on it.
function spokedWheel(ctx, cx, cy, r, n, a, dep, spokes, env, pal) {
  const build = (c) => {
    gearPath(c, cx, cy, r, n, a, dep);
    // spoke windows: annular sectors between the hub and the rim
    const rin = r * 0.34, rout = r - dep * 0.5 - Math.max(0.9, r * 0.14);
    if (spokes && rout > rin + 0.8) {
      for (let s = 0; s < spokes; s++) {
        const s0 = a + (s / spokes) * TAU + 0.14 * (TAU / spokes);
        const s1 = s0 + (TAU / spokes) * 0.62;
        c.moveTo(cx + Math.cos(s0) * rout, cy + Math.sin(s0) * rout);
        c.arc(cx, cy, rout, s0, s1);
        c.arc(cx, cy, rin, s1, s0, true);
        c.closePath();
      }
    }
  };
  paperContact(ctx, env, (c) => { c.beginPath(); build(c); });
  ctx.beginPath(); build(ctx);
  ctx.fillStyle = pal.body; ctx.fill('evenodd');
  // top light: a lit rim band on the upper half only (clip to the wheel).
  ctx.save();
  ctx.beginPath(); build(ctx); ctx.clip('evenodd');
  ctx.fillStyle = pal.lit;
  ctx.beginPath(); ctx.ellipse(cx - r * 0.12, cy - r * 0.55, r * 1.05, r * 0.75, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = pal.body;
  ctx.beginPath(); ctx.ellipse(cx + r * 0.05, cy - r * 0.2, r * 0.98, r * 0.8, 0, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.beginPath(); build(ctx);
  ctx.strokeStyle = pal.ink; ctx.lineWidth = Math.max(0.35, r * 0.045); ctx.stroke();
  paperFinish(ctx, env, (c) => { c.beginPath(); build(c); });
  // hub
  ctx.fillStyle = pal.hub;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.26, 0, TAU); ctx.fill();
  ctx.strokeStyle = pal.ink; ctx.lineWidth = Math.max(0.3, r * 0.04); ctx.stroke();
  ctx.fillStyle = pal.ink;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.1, 0, TAU); ctx.fill();
  // one bright bolt on the hub: turning is visible even where spokes are not
  ctx.fillStyle = pal.hubLit;
  ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r * 0.17, cy + Math.sin(a) * r * 0.17, r * 0.055 + 0.2, 0, TAU); ctx.fill();
}

// Lay a meshing train along the top line: tops aligned at `top`, neighbour
// centres exactly r1 + r2 apart (so pitch circles touch), each angle derived
// from its neighbour's so teeth fall into gaps. Returns the wheels.
function meshTrain(w, top, dep, specs, t, speed) {
  // specs: tooth counts to cycle; module m sets pitch radius r = n*m/2.
  const m = 1.55;
  const wheels = [];
  let x = null;
  for (let i = 0; i <= 200; i++) {
    const n = specs[i % specs.length];
    const r = n * m / 2;
    const cy = top + dep * 0.5 + r;
    if (x === null) x = r + 1;
    else {
      const p = wheels[wheels.length - 1];
      const dy = cy - p.cy;
      x = p.cx + Math.sqrt(Math.max(0, (p.r + r) ** 2 - dy * dy));
    }
    if (x + r > w + r * 0.6 && wheels.length >= 2) break;
    wheels.push({ cx: x, cy, r, n });
  }
  // Centre the train in the bay.
  const span = wheels[wheels.length - 1].cx - wheels[0].cx;
  const shift = (w - span) / 2 - wheels[0].cx;
  for (const g of wheels) g.cx += shift;
  // Angles: wheel 0 turns at `speed` rad/s; each next derived by the mesh rule
  // θj = φ + π − π/Nj + (Ni/Nj)(φ − θi), φ = direction from i to j.
  wheels[0].a = t * speed;
  for (let k = 1; k < wheels.length; k++) {
    const gi = wheels[k - 1], gj = wheels[k];
    const phi = Math.atan2(gj.cy - gi.cy, gj.cx - gi.cx);
    gj.a = phi + Math.PI - Math.PI / gj.n + (gi.n / gj.n) * (phi - gi.a);
  }
  return wheels;
}

const IRON = { body: '#5d6672', lit: '#aeb8c4', hub: '#d9a441', hubLit: '#fff1b8', ink: '#1b2028' };

// B — THE MESHED TRAIN. Tooth counts from the radius (one module across the
// train), pitch circles exactly touching, and every wheel's angle DERIVED from
// its neighbour's, so the teeth really fall into each other's gaps and the
// ratio is right — the small wheel spins faster, visibly, because it has to.
// Spoke windows cut through the steel let the bay show through, which is what
// makes a disc read as a wheel; the brass hub is the one warm moving thing.
function gearsMeshed(ctx, w, d, t, lift, env) {
  const detailD = liquidSurfaceDepth(d);
  const top = detailD * GEAR_TOPS;
  const dep = 1.7;
  plate(ctx, w, d, top + 1.5, hardFillCutoff('gears', w, d));
  const wheels = meshTrain(w, top, dep, [13, 8, 11, 8], t, 0.9);
  for (const g of wheels) {
    spokedWheel(ctx, g.cx, g.cy, g.r, g.n, g.a, dep, g.n >= 10 ? 5 : 4, env, IRON);
  }
}

// C — THE GRINDER. One long toothed drum laid across the bay, seen side-on:
// rows of hooked teeth come up over its crest toward you and roll down the
// front. Its motion reads with NO rotation to track — the crest of teeth is a
// moving saw edge, which is what the eye sees from the road — and the whole
// width is one machine rather than a row of parts. Drum body banded
// dark-light-dark for the curve; teeth drawn proud of the silhouette only at
// the crest.
function gearsGrinder(ctx, w, d, t, lift, env) {
  const detailD = liquidSurfaceDepth(d);
  const top = detailD * GEAR_TOPS;
  const toothH = 4.2;
  const R = 9; // drum radius (side-on, so a band 2R tall)
  const crest = top + toothH; // top of the drum body
  const cy = crest + R;
  plate(ctx, w, d, crest + 2, hardFillCutoff('gears', w, d));
  const x0 = 3, x1 = w - 3;
  const drumPath = (c) => { c.beginPath(); c.rect(x0, crest, x1 - x0, R * 2); };
  paperContact(ctx, env, drumPath);
  // Dark steel, one bright band just under the crest for the curve. The
  // teeth are the bright thing; a light drum under light teeth was a tube.
  const bands = [['#2b3139', 0], ['#6f7985', 0.06], ['#9aa4b0', 0.13], ['#56606c', 0.24], ['#3a414c', 0.4], ['#262b33', 0.7]];
  for (let b = 0; b < bands.length; b++) {
    const y0 = crest + bands[b][1] * R * 2;
    const y1 = b + 1 < bands.length ? crest + bands[b + 1][1] * R * 2 : crest + R * 2;
    ctx.fillStyle = bands[b][0];
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
  // Rows of teeth at angle θ round the drum (0 = crest, positive = toward the
  // viewer and down). Only the front half is drawn. At the crest a tooth is a
  // silhouette standing proud of the drum; on the face it is seen end-on.
  const ROWS = 10;
  const spin = t * 2.2;
  const pitchX = 7;
  const rows = [];
  for (let rI = 0; rI < ROWS; rI++) {
    const th = (((rI / ROWS) * TAU + spin) % TAU + TAU) % TAU;
    const ang = th > Math.PI ? th - TAU : th;
    if (Math.abs(ang) > Math.PI / 2) continue;
    rows.push({ ang, off: (rI % 2) * pitchX * 0.5 });
  }
  rows.sort((a, b) => Math.abs(b.ang) - Math.abs(a.ang));
  for (const { ang, off } of rows) {
    const y = cy - R * Math.cos(ang);
    const sq = Math.cos(ang);
    for (let x = x0 + 2 + off; x < x1 - 1.5; x += pitchX) {
      if (Math.abs(ang) < 0.62) {
        // standing tooth: a hooked carbide pick raked toward the viewer's side
        const h = toothH * Math.cos(ang * 2.4);
        if (h <= 0.25) continue;
        const by = crest + 0.6 + (y - (cy - R)) * 0.8;
        ctx.fillStyle = '#9aa4b0';
        ctx.beginPath();
        ctx.moveTo(x - 2, by); ctx.lineTo(x + 0.7, by - h); ctx.lineTo(x + 2, by - h + 1.2); ctx.lineTo(x + 1.8, by);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#f4f7fa';
        ctx.beginPath();
        ctx.moveTo(x - 0.6, by - h * 0.55); ctx.lineTo(x + 0.7, by - h); ctx.lineTo(x + 2, by - h + 1.2); ctx.lineTo(x + 0.9, by - h * 0.5);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.moveTo(x - 2, by); ctx.lineTo(x + 0.7, by - h); ctx.lineTo(x + 2, by - h + 1.2); ctx.lineTo(x + 1.8, by);
        ctx.stroke();
      } else {
        // a tooth on the face, end-on: a bright wedge squashed by the curve,
        // shadowed on the underside of the drum
        ctx.fillStyle = ang < 0 ? '#dfe5ec' : '#8a94a1';
        ctx.beginPath();
        ctx.moveTo(x - 1.8, y); ctx.lineTo(x, y - 2.2 * sq); ctx.lineTo(x + 1.8, y); ctx.lineTo(x, y + 0.7 * sq);
        ctx.closePath(); ctx.fill();
      }
    }
  }
  ctx.strokeStyle = INK; ctx.lineWidth = 0.45;
  ctx.strokeRect(x0, crest, x1 - x0, R * 2);
  paperFinish(ctx, env, drumPath);
  // bearing blocks at each end, with a turning bolt so the spin has a clock
  for (const ex of [0, w - 3]) {
    ctx.fillStyle = '#39414d'; ctx.fillRect(ex, crest - 0.5, 3, R * 2 + 1);
    ctx.strokeStyle = INK; ctx.lineWidth = 0.4; ctx.strokeRect(ex, crest - 0.5, 3, R * 2 + 1);
    ctx.fillStyle = '#d9a441';
    ctx.beginPath(); ctx.arc(ex + 1.5, cy - R * 0.45, 1.1, 0, TAU); ctx.fill();
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.arc(ex + 1.5 + Math.cos(spin) * 0.6, cy - R * 0.45 + Math.sin(spin) * 0.6, 0.3, 0, TAU); ctx.fill();
  }
  // Chips thrown off the crest, up and toward the near side, falling back.
  const nChip = Math.max(2, Math.ceil(w / 22));
  for (let i = 0; i < nChip; i++) {
    const p = ((t * 1.5 + hash(i * 3.1)) % 1 + 1) % 1;
    const x = (i + 0.5) * (w / nChip) + (hash(i) - 0.5) * 8 + p * 3;
    const y = crest - 0.5 - Math.sin(p * Math.PI) * 6;
    ctx.globalAlpha = 1 - p * 0.6;
    ctx.fillStyle = i % 2 ? '#e9dcb6' : '#8e6a3e';
    ctx.fillRect(x, y, 0.9, 0.9);
    ctx.globalAlpha = 1;
  }
}
