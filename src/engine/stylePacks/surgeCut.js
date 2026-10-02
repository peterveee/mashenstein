// THE SURGE'S CUTS AND GLITCHES — the cabinet failing as the act goes on.
//
// Peter, 1 Oct 2026 (bake-offs `surge-look-changes` and `surge-glitching`): the Surge
// changes look on its own song's bar line, four bars a look, each change a move drawn at
// random (never the same twice running) from plumber-1's power-down and the megamix's
// cuts; and between the changes the picture glitches, worse from surge-1 to surge-3, and
// from surge-2 on reaching down over the lane. The hero is never touched: he is drawn on
// the overlay layer, after all of this.
//
// EVERYTHING HERE WORKS ON THE CANVAS'S OWN PIXELS, in device space. What is painted so
// far is copied off and laid back crunched, torn, rolled or squashed. That is what makes
// it portrait-proof without a frame-space pyramid, costs one copy and one blit a glitch,
// and lets the lane's glitches run in post() over the lane, its hazards and the dust,
// exactly as drawn. Only the moves that need a second look paint one.
//
// Lane glitches are held to the two kinds that keep a hazard where it is and still a
// shape: a pixel crunch no coarser than 8 frame px, and a tear of a few px. Nothing that
// blacks the lane out or moves it up and down.
import { W, H, shake } from '../renderer.js';
import { cellTile, grilleSoftTile, arcadeLandingDrop } from '../arcadeIntro.js';
import { TapeRewindEffect } from '../../game/rewindFx.js';
import { GROUND_Y } from '../camera.js';
import { drawNeonBolt, neonStrikeFlash, NEON_STRIKE_SECONDS } from './neonMoods.js';

export const SURGE_BPM = 132;
export const SURGE_SLOT_BEATS = 16; // four bars a look
const SPB = 60 / SURGE_BPM;

const mod = (a, n) => ((a % n) + n) % n;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (v) => v * v * (3 - 2 * v);
const easeIn = (s) => s * s * s;
function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
const slot2seed = (n, at) => n * 31.7 + at * 3.3;
function rng(seed) {
  let a = Math.floor(seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ------------------------------------------------------------------- the moves
// lead/tail: beats before and after the downbeat the move takes. `shake` fires the
// game's own shake on the downbeat; `flash` and `tape` are laid over the frame in post().
export const SURGE_MOVES = {
  'power-down': { lead: 2, tail: 0.6, shake: [3, 0.25] },
  'power-cycle': { lead: 1, tail: 1.5, shake: [4, 0.3] },
  'flash-cut': { lead: 0.75, tail: 0.75, shake: [4, 0.3], flash: true },
  'beat-stutter': { lead: 2, tail: 0 },
  'block-shatter': { lead: 2, tail: 0 },
  'tape-rewind': { lead: 2, tail: 1, shake: [3, 0.25], tape: true },
  'zoom-through': { lead: 1.5, tail: 0.3, shake: [3, 0.25] },
};
const MOVE_IDS = Object.keys(SURGE_MOVES);

// Every change a move at random, never the one just played; seeded per run, so a frame
// is painted from the clock alone.
// Each draw steps 1 to N-1 places on from the last, so it can never land where it was.
const MOVE_CHAINS = new Map();
export function surgeMove(seed, change) {
  const c = Math.max(0, Math.floor(change));
  let chain = MOVE_CHAINS.get(seed);
  if (!chain) {
    if (MOVE_CHAINS.size > 8) MOVE_CHAINS.clear();
    MOVE_CHAINS.set(seed, (chain = [Math.floor(hash(seed * 7919) * MOVE_IDS.length)]));
  }
  while (chain.length <= c) {
    const n = chain.length;
    chain.push((chain[n - 1] + 1 + Math.floor(hash(seed * 7919 + n * 104.729) * (MOVE_IDS.length - 1))) % MOVE_IDS.length);
  }
  return MOVE_IDS[chain[c]];
}

// ---------------------------------------------------------------- the glitches
export const SURGE_GLITCH_LEVELS = Object.freeze({
  1: { per: [0, 1, 1, 1, 2], lens: [0.25, 0.5, 0.5, 1], full: 0, lane: 0, shake: 0,
    kinds: ['tear', 'pixel', 'flicker', 'ghost'] },
  2: { per: [1, 1, 2, 2, 3], lens: [0.25, 0.5, 1, 1, 2], full: 0.3, lane: 0.25, shake: 0,
    kinds: ['tear', 'pixel', 'pixel', 'flicker', 'ghost', 'blocks', 'roll'] },
  3: { per: [2, 3, 3, 4, 5], lens: [0.25, 0.5, 1, 2, 2, 4], full: 0.55, lane: 0.7, shake: 2.5,
    kinds: ['tear', 'pixel', 'pixel', 'flicker', 'ghost', 'blocks', 'roll', 'roll'] },
});
const LANE_KINDS = ['pixel', 'tear'];

// One look's four bars of glitches, in beats from its downbeat, clear of the moves
// either side. A band is in frame fractions of the backdrop's height (0 top, 1 the lane).
//
// SURGE-3 GETS WORSE AS IT GOES (Peter, 1 Oct 2026: "more frequent as we progress, to the
// point where they're very frequent by the end"). `progress` (0..1 through the stage)
// adds up to RAMP_EXTRA more glitches a look by the finish, on a curve that keeps the
// opening near the table and spends most of the climb in the back half. Every glitch
// takes the same draws from the look's stream, so the extras are APPENDED: a look's
// earlier glitches never change as the count rises under them.
const RAMP_EXTRA = 9;
export function surgeGlitches(slot, level, seed, count, progress = 0) {
  const L = SURGE_GLITCH_LEVELS[level] || SURGE_GLITCH_LEVELS[1];
  const r = rng(seed * 131 + slot * 17 + level * 7 + 0.5);
  const ramp = level >= 3 ? Math.pow(clamp01(progress), 1.6) : 0;
  const n = L.per[Math.floor(r() * L.per.length)] + Math.round(ramp * RAMP_EXTRA);
  const out = [];
  for (let i = 0; i < n; i++) {
    const len = L.lens[Math.floor(r() * L.lens.length)];
    const start = 1.5 + Math.floor(r() * (14 - len - 1.5) * 4) / 4;
    const full = r() < L.full;
    const lane = r() < L.lane;
    const h = 0.06 + r() * 0.24;
    const y = r() * (1 - h);
    const kind = L.kinds[Math.floor(r() * L.kinds.length)];
    out.push({
      kind: lane ? LANE_KINDS[Math.floor(r() * 2)] : kind,
      start, len, lane, full,
      band: { y, h },
      lv: 2 + Math.floor(r() * 3),
      other: mod(slot + 1 + Math.floor(r() * (count - 1)), count),
      seed: r() * 1000,
      shake: L.shake,
    });
  }
  return out;
}

// THE SCREEN UPSIDE DOWN (Peter, 1 Oct 2026: "completely flip the entire screen upside
// down periodically to make it a little bit diabolical"). surge-3 only, and not in its
// opening fifth. From there a look may turn the screen over on its second or third bar
// line and right it on a later one, never across a move; the chance climbs with the
// stage, from one look in four to three in four, and late on it stays over for two bars
// instead of one. It is a vertical flip, so the hero still runs left to right; a jump
// just goes down. Each turn is announced half a beat ahead by a tear across the screen
// and a jolt, and the same marks the turn back.
export function surgeFlip(slot, level, seed, progress = 0) {
  if (level < 3 || !(progress >= 0.2)) return null;
  const r = rng(seed * 59 + slot * 23 + 0.25);
  const chance = 0.25 + 0.5 * clamp01((progress - 0.2) / 0.8);
  const roll = r(), early = r() < 0.5, long = r() < progress;
  if (roll >= chance) return null;
  const start = early ? 4 : 8;
  return { start, end: start + (early && long ? 8 : 4) };
}

// OTHER CABINETS' WEATHER, ON THE WRONG SCREEN (Peter, 2 Oct 2026: "overlay the snow
// layers from frost and the lightning from neon in the surge levels as part of it
// glitching out... ideally on screens they don't belong, eg. snow on speed levels").
// A look may be crossed by Frost's blizzard (a bar or two of it, cut in and out with a
// stutter like a bad signal) or by Neon's strike (the sky crawler and its bolt, landing
// on a beat). Neither ever falls on its home look: no snow on the watercolor look, no
// bolt on the neon one. Both sit clear of the moves either side, like the glitches.
// Chance a look is crossed, by level, and climbing with surge-3's progress.
export const SURGE_INTRUDERS = Object.freeze({
  snow: { home: 'watercolor' },
  bolt: { home: 'neon' },
});
const INTRUDE_CHANCE = { 1: 0.3, 2: 0.45, 3: 0.55 };
const BOLT_BEATS = NEON_STRIKE_SECONDS / SPB;
export function surgeIntrusions(slot, level, seed, lookName = null, progress = 0) {
  const lv = Math.max(1, Math.min(3, Math.round(level) || 1));
  const r = rng(seed * 97 + slot * 29 + 0.75);
  const ramp = lv >= 3 ? 0.35 * Math.pow(clamp01(progress), 1.6) : 0;
  const kinds = Object.keys(SURGE_INTRUDERS).filter((k) => SURGE_INTRUDERS[k].home !== lookName);
  const out = [];
  // surge-3 can take both in one look, the strike inside the snow.
  const tries = lv >= 3 ? 2 : 1;
  for (let i = 0; i < tries && kinds.length; i++) {
    const roll = r(), pick = r(), when = r(), x = r(), long = r();
    if (roll >= (i ? 0.35 + ramp : INTRUDE_CHANCE[lv] + ramp)) break;
    const kind = kinds.splice(Math.floor(pick * kinds.length), 1)[0];
    if (kind === 'snow') {
      // A bar from the second or third bar line, or two bars late in surge-2/3.
      const len = lv >= 2 && long < 0.4 ? 8 : 4;
      const start = len === 8 ? 4 : (when < 0.5 ? 4 : 8);
      out.push({ kind, start, len, strength: [0, 0.9, 1.15, 1.4][lv] });
    } else {
      // On a beat, its 2.4 s done before the last bar's move.
      const start = 2 + Math.floor(when * Math.floor(14 - BOLT_BEATS - 2 + 1));
      out.push({ kind, start, len: BOLT_BEATS, x: 0.18 + x * 0.64, seed: 11 + Math.floor(long * 89) });
    }
  }
  return out;
}

// How much of the snow is on, b beats into its run of len: it cuts in and out on a
// stutter of sixteenths, a bad signal finding the channel and losing it.
export function surgeSnowOn(b, len) {
  if (!(b >= 0 && b < len)) return 0;
  const edge = Math.min(b, len - b);
  if (edge >= 0.75) return 1;
  return Math.floor(edge * 4) % 2 === 0 ? 1 : 0;
}

// Where the act is: the look, and any move or glitches under way. `beat` is quarter
// notes of THE SURGE's song; each stage opens three looks on from the last.
// `names` (the cycle's style names) lets a look refuse its own cabinet's weather.
export function surgePhase(beat, { level = 1, seed = 1, count = 8, progress = 0, names = null } = {}) {
  const lv = Math.max(1, Math.min(3, Math.round(level) || 1));
  const n = Math.floor(beat / SURGE_SLOT_BEATS) + (lv - 1) * 3;
  const since = beat - Math.floor(beat / SURGE_SLOT_BEATS) * SURGE_SLOT_BEATS;
  const toNext = SURGE_SLOT_BEATS - since;
  const next = surgeMove(seed, n + 1), last = surgeMove(seed, n);
  const ph = { n, look: mod(n, count), level: lv, seed, count, move: null, u: 0, change: 0, glitches: [], intrusions: [] };
  if (toNext <= SURGE_MOVES[next].lead) Object.assign(ph, { move: next, u: -toNext, change: n + 1 });
  else if (since < SURGE_MOVES[last].tail) Object.assign(ph, { move: last, u: since, change: n });
  else {
    ph.glitches = surgeGlitches(n, lv, seed, count, progress)
      .filter((g) => since >= g.start && since < g.start + g.len)
      .map((g) => ({ ...g, b: since - g.start }));
  }
  ph.intrusions = surgeIntrusions(n, lv, seed, names?.[ph.look] ?? null, progress)
    .filter((x) => since >= x.start && since < x.start + x.len)
    .map((x) => ({ ...x, b: since - x.start }));
  const flip = surgeFlip(n, lv, seed, progress);
  if (flip) {
    ph.flip = since >= flip.start && since < flip.end;
    // The warning tear, half a beat before each turn.
    for (const at of [flip.start, flip.end]) {
      const b = since - (at - 0.5);
      if (b >= 0 && b < 0.5) {
        ph.glitches.push({ kind: 'tear', start: at - 0.5, len: 0.5, b, lane: false, full: true,
          band: { y: 0, h: 1 }, lv: 3, other: ph.look, seed: slot2seed(n, at), shake: 2.5 });
      }
    }
  }
  if (ph.move) {
    ph.out = mod(ph.change - 1, count);
    ph.in = mod(ph.change, count);
  }
  ph.sec = ph.u * SPB;
  return ph;
}

// ------------------------------------------------------------- device-space ops
// Two scratch canvases the size of the frame, shared by every surge pack.
const scratch = [null, null];
function sheet(i, w, h) {
  if (typeof document === 'undefined') return null;
  let c = scratch[i];
  if (!c) c = scratch[i] = document.createElement('canvas');
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const g = c.getContext('2d');
  if (!g || typeof g.drawImage !== 'function') return null;
  g.setTransform(1, 0, 0, 1, 0, 0);
  return { c, g };
}
function region(ctx, r) {
  const cw = ctx.canvas?.width || 0, ch = ctx.canvas?.height || 0;
  if (!r) return { x: 0, y: 0, w: cw, h: ch };
  const y = Math.max(0, Math.floor(r.y)), y1 = Math.min(ch, Math.ceil(r.y + r.h));
  return { x: 0, y, w: cw, h: Math.max(0, y1 - y) };
}
// Copy what is painted in R off the canvas.
function snapshot(ctx, R) {
  const s = sheet(0, Math.max(1, R.w), Math.max(1, R.h));
  if (!s) return null;
  s.g.clearRect(0, 0, R.w, R.h);
  s.g.drawImage(ctx.canvas, R.x, R.y, R.w, R.h, 0, 0, R.w, R.h);
  return s.c;
}
function inDevice(ctx, fn) {
  if (!ctx.canvas || typeof ctx.setTransform !== 'function') return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  try { fn(); } finally { ctx.restore(); }
}
const BLACK = '#050607';

// The picture in R averaged into cells `cell` device px across, nearest-neighbour back.
function pixelate(ctx, R, cell, soft = false) {
  if (R.w < 1 || R.h < 1 || cell < 1.5) return;
  const sw = Math.max(1, Math.round(R.w / cell)), sh = Math.max(1, Math.round(R.h / cell));
  const s = sheet(1, sw, sh);
  if (!s) return;
  s.g.imageSmoothingEnabled = true;
  s.g.imageSmoothingQuality = 'high';
  s.g.clearRect(0, 0, sw, sh);
  s.g.drawImage(ctx.canvas, R.x, R.y, R.w, R.h, 0, 0, sw, sh);
  ctx.imageSmoothingEnabled = soft;
  ctx.drawImage(s.c, 0, 0, sw, sh, R.x, R.y, R.w, R.h);
  ctx.imageSmoothingEnabled = true;
}
// Plumber-1's soft aperture grille over R, multiplied, and a little lift back.
function grille(ctx, R, k) {
  const tile = cellTile('grilleSoft', 3, 3, k, grilleSoftTile);
  const p = ctx.createPattern?.(tile, 'repeat');
  if (!p) return;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = p;
  ctx.fillRect(R.x, R.y, R.w, R.h);
  ctx.restore();
}
// The set switching off across s 0..1 (arcadeIntro.js switchOff, in device space): the
// picture squashes to a bright line, the line pulls in to a dot, on black.
function squash(ctx, R, s) {
  const shot = snapshot(ctx, R);
  if (!shot) return;
  const a = clamp01(s / 0.6), b = clamp01((s - 0.6) / 0.4);
  const sy = Math.max(0.006, 1 - easeIn(a) * 0.994);
  const sx = 1 - easeIn(b) * 0.99;
  ctx.fillStyle = BLACK;
  ctx.fillRect(R.x, R.y, R.w, R.h);
  const w = R.w * sx, h = R.h * sy;
  const x = R.x + (R.w - w) / 2, y = R.y + (R.h - h) / 2;
  ctx.save();
  ctx.globalAlpha = 1 - b * 0.6;
  ctx.drawImage(shot, 0, 0, R.w, R.h, x, y, w, h);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = clamp01((0.25 - sy) / 0.2) * (1 - b);
  ctx.fillStyle = '#e8f4ff';
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}
// Bands of R slid sideways; `amp` device px at most.
function tear(ctx, R, k, seed, tick, amp, black = true) {
  const shot = snapshot(ctx, R);
  if (!shot) return;
  const band = Math.max(2, Math.round((4 + (Math.floor(seed) % 3) * 2) * k));
  if (black) { ctx.fillStyle = BLACK; ctx.fillRect(R.x, R.y, R.w, R.h); }
  for (let y = 0; y < R.h; y += band) {
    const q = hash(seed + Math.floor(y / band) * 3.1 + tick * 11.7);
    const dx = (q * 2 - 1) * (q > 0.55 ? amp : amp * 0.2);
    ctx.drawImage(shot, 0, y, R.w, Math.min(band, R.h - y), R.x + dx, R.y + y, R.w, Math.min(band, R.h - y));
  }
}
// R loses vertical hold: rolled up by `off` of its height, a black bar between copies.
function roll(ctx, R, off) {
  const shot = snapshot(ctx, R);
  if (!shot) return;
  const gap = Math.round(R.h * 0.05);
  const y = Math.round(off * (R.h + gap)) % (R.h + gap);
  ctx.fillStyle = BLACK;
  ctx.fillRect(R.x, R.y, R.w, R.h);
  ctx.save();
  ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
  ctx.drawImage(shot, R.x, R.y - y);
  ctx.drawImage(shot, R.x, R.y - y + R.h + gap);
  ctx.restore();
}
function wash(ctx, R, color, a) {
  if (!(a > 0.002)) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, a);
  ctx.fillStyle = color;
  ctx.fillRect(R.x, R.y, R.w, R.h);
  ctx.restore();
}
function scaleOf(m) { return Math.hypot(m.a, m.b) || 1; }

// ---------------------------------------------------------------- the backdrop
// Called by the surge pack's bg() in place of one look's bg(). `paint(i, dy, scrub)`
// paints look i's backdrop on ctx under its own transform, dy frame px down and its
// camera scrubbed `scrub` px back. Returns what post() needs.
export function paintSurgeBackdrop(ctx, ph, paint) {
  // A recording or stub context can have the method and hand back nothing (tests/boss.js).
  const m = (typeof ctx.getTransform === 'function' && ctx.getTransform()) || { a: 1, b: 0, d: 1, f: 0 };
  const k = scaleOf(m);
  // Where the lane's top edge lands on the canvas: the line the lane glitches start at.
  const laneTop = m.d * 232 + m.f;
  const top = Math.max(0, m.f + m.d * -40);
  const live = { laneTop, k };
  const full = () => region(ctx, null);
  const band = (b) => region(ctx, { y: top + (laneTop - top) * b.y, h: (laneTop - top) * b.h });
  const step = (u, from, n) => Math.min(n - 1, Math.floor((u - from) * 4));

  if (!ph.move) {
    paint(ph.look);
    for (const x of ph.intrusions) if (x.kind === 'bolt') surgeBolt(ctx, x);
    for (const g of ph.glitches) if (!g.lane) glitchBackdrop(ctx, g, g.full ? full() : band(g.band), k, paint);
    return live;
  }
  const u = ph.u;
  switch (ph.move) {
    case 'power-down':
      if (u < -1) {
        paint(ph.out);
        inDevice(ctx, () => { const R = full(); pixelate(ctx, R, [2, 4, 8, 8][step(u, -2, 4)] * k); grille(ctx, R, k); });
      } else if (u < 0) {
        paint(ph.out);
        inDevice(ctx, () => { const R = full(); pixelate(ctx, R, 8 * k); grille(ctx, R, k); squash(ctx, R, u + 1); });
      } else {
        ctx.save();
        ctx.translate(0, arcadeLandingDrop(ph.sec) / (m.d / k || 1));
        paint(ph.in);
        ctx.restore();
      }
      break;
    case 'power-cycle':
      if (u < 0) {
        paint(ph.out);
        inDevice(ctx, () => squash(ctx, full(), u + 1));
      } else {
        paint(ph.in);
        inDevice(ctx, () => {
          const R = full();
          if (u < 0.5) { pixelate(ctx, R, 16 * k); grille(ctx, R, k); squash(ctx, R, 1 - u / 0.5); }
          else { pixelate(ctx, R, [16, 8, 4, 2][step(u, 0.5, 4)] * k); grille(ctx, R, k); }
        });
      }
      break;
    case 'flash-cut':
      paint(u < 0 ? ph.out : ph.in);
      break;
    case 'beat-stutter': {
      const f = (u + 2) * 4;
      const s = Math.min(7, Math.floor(f));
      const onNew = (i) => i >= 6 || (i > 0 && hash(ph.change * 31 + i) < 0.15 + i * 0.1);
      paint(onNew(s) ? ph.in : ph.out);
      if (s === 0 || onNew(s) !== onNew(s - 1)) inDevice(ctx, () => wash(ctx, full(), '#ffffff', Math.pow(1 - (f - s), 5) * 0.35));
      break;
    }
    case 'block-shatter': {
      paint(ph.out);
      const f = (u + 2) * 4;
      const s = Math.min(8, Math.floor(f + 1e-6));
      if (!s) break;
      const cols = 16, rows = 9, n = cols * rows;
      const order = Array.from({ length: n }, (_, i) => i)
        .sort((a, b) => hash(ph.change * 977 + a) - hash(ph.change * 977 + b));
      const shown = Math.round(s / 8 * n);
      const R = full();
      const cw = R.w / cols, ch = R.h / rows;
      const boxes = (a, b, inset) => {
        for (let i = a; i < b; i++) {
          const c = order[i];
          ctx.rect((c % cols) * cw + inset, Math.floor(c / cols) * ch + inset, cw - inset * 2, ch - inset * 2);
        }
      };
      // The blocks are laid out in device space; a path keeps the transform it was
      // built under, so the clip holds once the look's own transform is back.
      ctx.save();
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.beginPath();
      boxes(0, shown, -0.5);
      ctx.restore();
      ctx.clip();
      paint(ph.in);
      ctx.restore();
      const glow = (1 - (f - s)) * 0.8;
      if (glow > 0.02) inDevice(ctx, () => {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255,236,200,${glow.toFixed(3)})`;
        ctx.lineWidth = 1.25 * k;
        ctx.beginPath();
        boxes(Math.round((s - 1) / 8 * n), shown, 0.5 * k);
        ctx.stroke();
      });
      break;
    }
    case 'tape-rewind':
      if (u < 0) {
        const a = smooth((u + 2) / 2);
        paint(ph.out, 0, 1400 * a * a);
        inDevice(ctx, () => {
          const R = full();
          pixelate(ctx, R, 2 * k, true);
          tear(ctx, R, k, ph.change * 13.7, Math.floor(ph.sec * 24), 16 * k * a * a + 10 * k * a);
        });
      } else paint(ph.in);
      break;
    case 'zoom-through': {
      if (u >= 0) { paint(ph.in); break; }
      // The old look, kept off-canvas; the new one painted; the old one blown up past
      // the camera over it, fading.
      paint(ph.out);
      let keep = null;
      inDevice(ctx, () => {
        const R = full();
        const shot = snapshot(ctx, R);
        keep = shot && sheet(1, R.w, R.h);
        if (keep) { keep.g.clearRect(0, 0, R.w, R.h); keep.g.drawImage(shot, 0, 0); }
      });
      paint(ph.in);
      if (keep) inDevice(ctx, () => {
        const R = full(), z = smooth((u + 1.5) / 1.5);
        const s = 1 + z * z * 2.6;
        const cx = R.w / 2, cy = R.h * 0.42;
        ctx.globalAlpha = 1 - z;
        ctx.drawImage(keep.c, cx - cx * s, cy - cy * s, R.w * s, R.h * s);
      });
      break;
    }
  }
  return live;
}

// Neon's strike over a look that is not Neon's: the crawler across the top of the sky
// and the bolt down onto the horizon, in the backdrop's own frame space, so the lane and
// the hero stand in front of it and the glitches after it tear it with the rest.
function surgeBolt(ctx, x) {
  const s = x.b * SPB;
  const cov = ctx.__mashBackgroundCoverage || { left: 0, width: W };
  const band = ctx.__mashBackgroundBand;
  const tall = band && Number.isFinite(band.top);
  const hitX = cov.left + cov.width * x.x;
  const hitY = tall ? band.top + (GROUND_Y - band.top) * 0.4 : GROUND_Y - 70;
  const top = tall ? band.top + (GROUND_Y - band.top) * 0.08 : -34;
  drawNeonBolt(ctx, s, hitX, hitY, x.seed, { left: cov.left - 20, right: cov.left + cov.width + 20, top, thin: true });
  const flash = neonStrikeFlash(s);
  if (flash > 0) {
    ctx.save();
    ctx.globalAlpha = flash * 0.8;
    ctx.fillStyle = '#eafcff';
    ctx.fillRect(cov.left - 40, -40, cov.width + 80, H + 80);
    ctx.restore();
  }
}

function glitchBackdrop(ctx, g, R, k, paint) {
  const tick = Math.floor(g.b * 8);
  inDevice(ctx, () => {
    ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
    switch (g.kind) {
      case 'pixel': pixelate(ctx, R, (1 << g.lv) * k); grille(ctx, R, k); break;
      case 'roll': pixelate(ctx, R, 2 * k, true); roll(ctx, R, (g.b / g.len) * (1 + (Math.floor(g.seed) % 2))); grille(ctx, R, k); break;
      case 'tear': tear(ctx, R, k, g.seed, tick, 34 * k); break;
      case 'flicker': if (hash(g.seed + tick * 5.3) < 0.55) { ctx.fillStyle = BLACK; ctx.fillRect(R.x, R.y, R.w, R.h); } break;
      case 'ghost': case 'blocks': break;
    }
  });
  if (g.kind === 'ghost' || g.kind === 'blocks') {
    // Another cabinet's picture through the band, or through a scatter of blocks (a
    // fresh one every eighth, some of them dropped to black).
    ctx.save();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.beginPath();
    if (g.kind === 'ghost') ctx.rect(R.x, R.y, R.w, R.h);
    else {
      const cols = 16, rows = 9, cw = R.w / cols, ch = R.h / rows, e = Math.floor(g.b * 2);
      for (let c = 0; c < cols * rows; c++) {
        const p = hash(g.seed + c * 1.37 + e * 91.1);
        if (p < 0.12) { ctx.fillStyle = BLACK; ctx.fillRect(R.x + (c % cols) * cw, R.y + Math.floor(c / cols) * ch, cw, ch); }
        else if (hash(g.seed + c * 1.37 + e * 91.1 + 3) < 0.14) ctx.rect(R.x + (c % cols) * cw, R.y + Math.floor(c / cols) * ch, cw, ch);
      }
    }
    ctx.restore();
    ctx.clip();
    if (g.kind === 'ghost') ctx.translate((hash(g.seed + tick) * 2 - 1) * 3, 0);
    paint(g.other);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------- post()
// After the lane, its hazards and the dust are drawn, before the hero's overlay: the
// lane's glitches, the flash and the tape over the frame, and the shakes.
export function surgePost(ctx, ph, live, state) {
  if (!ph || !ctx.canvas) return;
  const k = live?.k || 1;
  inDevice(ctx, () => {
    const all = region(ctx, null);
    const lane = region(ctx, { y: live?.laneTop ?? all.h * 0.86, h: all.h });
    for (const g of ph.glitches) {
      if (!g.lane) continue;
      const tick = Math.floor(g.b * 8);
      if (g.kind === 'pixel') { pixelate(ctx, lane, Math.min(8, 1 << g.lv) * k); grille(ctx, lane, k); }
      else tear(ctx, lane, k, g.seed, tick, 6 * k, false);
    }
    if (ph.move === 'flash-cut') {
      const near = 1 - Math.abs(ph.u) / 0.75;
      wash(ctx, all, '#fff6ec', Math.pow(clamp01(near), 2.2) * 0.85);
    }
    if (ph.move === 'tape-rewind') {
      const a = ph.u < 0 ? smooth((ph.u + 2) / 2) : Math.pow(1 - ph.u, 2);
      const tape = state.tape || (state.tape = new TapeRewindEffect());
      tape._t = 0.22 * clamp01(a);
      tape._runT = ph.sec + ph.change * 7;
      ctx.scale(all.w / W, all.h / H);
      tape.render(ctx, W, H);
    }
  });
  // The shakes: a move's landing on its downbeat, and at surge-3 each glitch's first
  // instant. Once each, by identity.
  const hit = (id, power, secs) => {
    if (state.shook === id) return;
    state.shook = id;
    shake(power, secs);
  };
  const move = ph.move && SURGE_MOVES[ph.move];
  if (move?.shake && ph.u >= 0 && ph.u < 0.25) hit(`m${ph.change}`, move.shake[0], move.shake[1]);
  for (const g of ph.glitches) if (g.shake && g.b < 0.2) hit(`g${ph.n}:${g.start}`, g.shake, 0.18);
}
