// Gallery-only SURGE HUD GLITCHES — the HUD in the wrong place now and then (13 Oct 2026).
// Peter: "what if the hud elements were in the wrong place now and then?" — in the Surge
// levels only: surge-1 mild, surge-2 more, surge-3 the most, with a hint of it before then.
//
// THE RULES EVERY OPTION KEEPS (so the pick is about taste, not safety):
//   - Movement and corruption only. Nothing is brightened or flashed: ghosts are plain
//     alpha copies, the crunch averages (never lifts) the pixels. The Surge is already at
//     the photosensitivity limit (3 flashes a second), so the HUD adds none.
//   - Beat-locked like surgeGlitches/surgeBlips: events start on a quarter beat of the
//     Surge song (132 BPM), last a quarter or a half beat (0.11 / 0.23 s, never more) and
//     are at least a quarter beat apart. Nothing is on screen for more than a half beat.
//   - Nothing leaves the frame, and in portrait nothing climbs above HUD_TOP (82 css px,
//     see ios-status-bar-wash-measured): every move is clamped, and checkSafe() throws.
//   - Only the canvas HUD (hud.js) moves. The touch discs and buttons are DOM chrome and
//     are not in this model at all.
//   - The HUD is clean under pause, death, finish and results — in the run that is one
//     `glitch = null` at those states; here it is the NOW row.
//
// The HUD is drawn by hud.js's OWN painters wherever they are exported (drawStatusPill,
// drawObjectivePanel), so what is shown is the shipped chrome. The ability plate and the
// progress bar are small private blocks inside drawHud(); they are re-drawn here from
// the same numbers. Shipping an option means splitting drawHud() into these four calls
// and giving each a {dx, dy, alpha} — the model below is exactly that.
import { SURGE_BPM } from '../engine/stylePacks/surgeCut.js';
import { drawStatusPill, drawObjectivePanel, OBJ_RIGHT, OBJ_ROW_Y } from '../game/hud.js';
import { drawPanel, drawTextForPresentation, textWidth, textYForMid } from '../engine/sprites.js';
import { HERO_BY_ID } from '../data/heroes.js';
import { drawSurgeTreatment } from './surge-tint-candidates.js';

const SPB = 60 / SURGE_BPM;
export const HUD_FRAMES = 8;           // a strip = 8 quarter beats = 2 beats = 0.91 s
export const HUD_STEP_BEATS = 0.25;
export const HUD_LEVELS = [
  { id: 'hint', name: 'the hint (stage before)' },
  { id: 'surge-1', name: 'surge-1' },
  { id: 'surge-2', name: 'surge-2' },
  { id: 'surge-3', name: 'surge-3' },
];

const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
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

// ------------------------------------------------------------------ the schedule
// One look's four bars (16 beats) of HUD events, laid out like surgeGlitches: from beat
// 1.5 to 14, on the quarter beat, clear of the look changes either side. `per` is how many
// a look carries, `lens` what each lasts in beats. Events never overlap and keep a quarter
// beat of clean HUD between them, so a half-beat event is never followed by another at once.
export const HUD_EVENT_LEVELS = [
  { per: [1], lens: [0.25] },                                   // hint: one tiny blink a look
  { per: [1, 2, 2], lens: [0.25, 0.25, 0.5] },                  // surge-1: a couple a look
  { per: [3, 4, 4], lens: [0.25, 0.5, 0.5] },                   // surge-2: every bar or so
  { per: [5, 6, 7], lens: [0.25, 0.5, 0.5, 0.5] },              // surge-3: nearly every beat late on
];
// The DRAMATIC options (Peter, 14 Oct: "a bit more drama, like the top hud sliding down the screen for
// a bit or melting") run long and rare: a beat to two beats (0.45 to 0.9 s) an event.
export const HUD_DRAMA_LEVELS = [
  { per: [1], lens: [0.5] },
  { per: [1], lens: [1] },
  { per: [1, 2], lens: [1, 1.5] },
  { per: [2, 3], lens: [1.5, 2] },
];
export function hudEvents(level, seed = 7, slot = 0, big = false) {
  const L = (big ? HUD_DRAMA_LEVELS : HUD_EVENT_LEVELS)[level];
  const r = rng(seed * 211 + slot * 29 + level * 13 + 0.5);
  const n = L.per[Math.floor(r() * L.per.length)];
  const out = [];
  let at = 1.5 + Math.floor(r() * 3) * 0.25;
  const room = (14 - 1.5) / n;
  for (let i = 0; i < n; i++) {
    const len = L.lens[Math.floor(r() * L.lens.length)];
    const start = Math.min(at, 14 - len);
    out.push({ start, len, seed: r() * 1000, pick: r(), nth: i });
    at = start + len + 0.25 + Math.floor(r() * (room / 0.25 - 1)) * 0.25;
    at = Math.max(at, start + len + 0.25);
  }
  return out;
}
// The 2-beat window of a look with the most events in it (ties: earliest), from a
// quarter beat before the first of them.
export function hudWindow(level, seed = 7, slot = 0, big = false) {
  const ev = hudEvents(level, seed, slot, big);
  let best = null;
  for (const e of ev) {
    const w0 = e.start - 0.25;
    const inside = ev.filter((x) => x.start >= w0 && x.start < w0 + HUD_FRAMES * HUD_STEP_BEATS).length;
    if (!best || inside > best.inside) best = { w0, inside };
  }
  return { events: ev, w0: best.w0, inside: best.inside };
}
const activeAt = (events, beat) => {
  for (const e of events) if (beat >= e.start - 1e-6 && beat < e.start + e.len - 1e-6) return { e, u: (beat - e.start) / e.len };
  return null;
};

// ------------------------------------------------------------------ the HUD, in pieces
export const SAFE_TOP_PORTRAIT = 82 / 0.8125;      // css 82 -> logical px (frame scale 0.8125)
const PORT_S = 8 / 3 * 1;                          // portraitPanelScale at 390 wide (2.667)
const PORT_LEFT = 14.77, PORT_RAIL_Y = 1033.85, PORT_RAIL_H = 4.92, PORT_LABEL_Y = 1012;
const EDGE = 6;

export const ORIENT = {
  land: { w: 480, h: 270, ids: ['pill', 'goal', 'ability', 'prog'], top: 0 },
  port: { w: 480, h: 1039, ids: ['pill', 'ability', 'prog'], top: SAFE_TOP_PORTRAIT },
};

const HEROES = () => Object.keys(HERO_BY_ID);
const baseContent = () => ({
  coins: 42, battery: 3, hero: 'lorenzo',
  goal: 'COLLECT COINS 7/20', ability: 'PIPE WRENCH', prog: 0.4,
});

function runFor(c) {
  return {
    oneHit: false, maxBattery: () => 3, battery: c.battery, coins: c.coins,
    totalDist: Infinity, distance: 0, tRun: 1, flipCoins: null,
    relay: { current: c.hero, next: 'rusty', tagT: null, prev: 'rusty' },
    player: { abilityCd: 0, hero: { ability: { cooldown: 3 } } },
  };
}
const ABILITY_CY = 270 - 2 - 3 - 7;               // hud.js bottomCy() at H = 270

function paintEl(ctx, orient, id, c) {
  if (orient === 'land') {
    if (id === 'pill') drawStatusPill(ctx, runFor(c));
    else if (id === 'goal') drawObjectivePanel(ctx, 'GOAL', '#74c947', c.goal, '#ffffff', OBJ_ROW_Y, 1, 0, OBJ_RIGHT);
    else if (id === 'ability') {
      const LP = 5, LH = 14, lw = LP * 2 + textWidth(c.ability, 1, 'bold');
      drawPanel(ctx, EDGE, ABILITY_CY - LH / 2, lw, LH, 4, undefined, { border: 'rgba(255,255,255,0.14)', shadow: true });
      drawTextForPresentation(ctx, c.ability, EDGE + LP, textYForMid(ABILITY_CY, 1), '#48e0c8', 1, 'bold');
    } else if (id === 'prog') {
      ctx.fillStyle = '#6495ed'; ctx.fillRect(0, 268, 480 * c.prog, 2);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(480 * c.prog - 1, 268, 3, 2);
    }
    return;
  }
  ctx.save();
  if (id === 'pill') {
    // hud.js drawPortraitHud: translate to (left, statusY), scale by the panel scale.
    // statusY here is the SAFE_TOP line, not the lab stub's 24.6 (a real phone's top inset).
    ctx.translate(PORT_LEFT - 6 * PORT_S, SAFE_TOP_PORTRAIT - 3 * PORT_S);
    ctx.scale(PORT_S, PORT_S);
    drawStatusPill(ctx, runFor(c));
  } else if (id === 'ability') {
    // drawPortraitNameStrip: a 0.95-scale label on a 14px plate at the action scale, centred on its disc.
    const s = 1.8, w = textWidth(c.ability, 0.95, 'bold') + 12;
    ctx.translate(372 - (w * s) / 2, PORT_LABEL_Y);
    ctx.scale(s, s);
    drawPanel(ctx, 0, -7, w, 14, 4, undefined, { border: 'rgba(255,255,255,0.14)', shadow: true });
    drawTextForPresentation(ctx, c.ability, 6, textYForMid(0, 0.95), '#48e0c8', 0.95, 'bold');
  } else if (id === 'prog') {
    ctx.fillStyle = '#6495ed'; ctx.fillRect(0, PORT_RAIL_Y, 480 * c.prog, PORT_RAIL_H);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(480 * c.prog - PORT_RAIL_H / 2, PORT_RAIL_Y, PORT_RAIL_H, PORT_RAIL_H);
  }
  ctx.restore();
}

// Where each element sits when clean: measured off a scratch paint, so the effects work
// from the real painted extents (shadow included) and not from numbers that could drift.
const rects = {};
function rectOf(orient, id) {
  const key = orient + id;
  if (rects[key]) return rects[key];
  const o = ORIENT[orient], cv = document.createElement('canvas');
  cv.width = o.w; cv.height = o.h;
  const g = cv.getContext('2d', { willReadFrequently: true });
  paintEl(g, orient, id, baseContent());
  const d = g.getImageData(0, 0, o.w, o.h).data;
  let x0 = o.w, y0 = o.h, x1 = 0, y1 = 0;
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) {
    if (d[(y * o.w + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x + 1 > x1) x1 = x + 1; if (y < y0) y0 = y; if (y + 1 > y1) y1 = y + 1; }
  }
  return (rects[key] = { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 });
}

// ------------------------------------------------------------------ passes
// A pass = a draw of some elements: {ids, dx, dy, a, clip:[y0,y1], over:{content}, pix}.
// An element in no pass of a frame is not drawn (it has moved); `plain` fills in the rest.
const P = (ids, extra = {}) => ({ ids, dx: 0, dy: 0, a: 1, clip: null, over: null, pix: 0, ...extra });
const plain = (o, passes) => {
  const moved = new Set(passes.filter((p) => !p.ghost).flatMap((p) => p.ids));
  const rest = ORIENT[o].ids.filter((i) => !moved.has(i));
  // Ghosts go under the real element; moved elements are drawn after the ones left at home.
  const under = passes.filter((p) => p.ghost), over = passes.filter((p) => !p.ghost);
  return rest.length ? [...under, P(rest), ...over] : [...under, ...over];
};
// Put element `id` with its centre at (cx, cy), kept inside the frame (and, in portrait,
// below the status-bar wash). Returns the pass offset.
function centreAt(o, id, cx, cy) {
  const r = rectOf(o, id), top = ORIENT[o].top;
  const half = r.w / 2, hh = r.h / 2;
  const x = Math.max(EDGE + half, Math.min(480 - EDGE - half, cx));
  const y = Math.max(top + hh, Math.min(ORIENT[o].h - 1 - hh, cy));
  return { dx: x - r.cx, dy: y - r.cy };
}
const pickOf = (arr, e, salt = 0) => arr[Math.floor(hash(e.seed + salt) * arr.length)];
const sgn = (e, salt = 0) => (hash(e.seed * 1.7 + salt) < 0.5 ? -1 : 1);
// Inward for an element hugging a side: left-hugging goes right, right-hugging left.
const inward = (o, id) => (rectOf(o, id).cx < 240 ? 1 : -1);

// ------------------------------------------------------------------ the options
// Each returns the passes for one frame inside an event: (o = orientation, L = 0..3
// level, e = the event, u = 0..1 through it).
function slip(o, L, e, u) {
  // The whole HUD jumps and eases home. dx is held inside the 6px edge margin, so the
  // strength comes from dy and from the tear bands, which are local and may go further.
  const amp = [[2, 0], [2, 0], [4, 1], [5, 3]][L];
  const fall = (1 - u) * (1 - u);
  const s = sgn(e);
  const dx = amp[0] * fall * s, dy = amp[1] * fall * (o === 'port' ? 1 : sgn(e, 3));
  // Tears: a few-pixel band through each HUD row shifted further than the rest.
  const rows = o === 'land' ? [[3, 21], [247, 265]] : [[SAFE_TOP_PORTRAIT, SAFE_TOP_PORTRAIT + 48], [1000, 1025]];
  const nT = [0, 1, 2, 2][L];
  const tdx = [0, 6, 9, 14][L] * (1 - 0.5 * u);
  const bands = rows.slice(0, nT).map(([a, b], i) => {
    const h = 3 + Math.floor(hash(e.seed + i) * 3);
    const y = a + hash(e.seed * 3 + i) * (b - a - h);
    return [y, y + h];
  });
  const all = ORIENT[o].ids;
  const cuts = [0, ...bands.flat(), ORIENT[o].h];
  const out = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const inBand = i % 2 === 1;
    out.push(P(all, { dx: dx + (inBand ? tdx * sgn(e, i) : 0), dy, clip: [cuts[i], cuts[i + 1]] }));
  }
  return out;
}

function ghost(o, L, e, u) {
  // A dim copy of each element beside the real one, drifting away; the real one never moves.
  const a = [0.22, 0.3, 0.4, 0.45][L], off = [2, 4, 7, 10][L], dy = [0, 1, 2, 3][L];
  const out = [];
  for (const id of ORIENT[o].ids) {
    const d = inward(o, id), k = 0.6 + 0.4 * u;
    out.push(P([id], { dx: d * off * k, dy: o === 'port' ? Math.abs(dy) : dy * sgn(e, 5), a, ghost: true }));
    if (L === 3) out.push(P([id], { dx: -d * off * 0.6 * k, dy: o === 'port' ? 0 : -dy, a: a * 0.7, ghost: true }));
  }
  return plain(o, out);
}

function wrongCorner(o, L, e) {
  // One element is somewhere else for the event; its home is empty meanwhile.
  const pool = o === 'land'
    ? [['ability'], ['ability', 'goal'], ['ability', 'goal', 'pill'], ['ability', 'goal', 'pill']][L]
    : [['ability'], ['ability'], ['ability', 'pill'], ['ability', 'pill']][L];
  const id = pickOf(pool, e, 2);
  const passes = [];
  const place = (el) => {
    if (o === 'land') {
      const R = (i) => rectOf('land', i);
      const dest = {
        pill: { cx: 480 - EDGE - R('pill').w / 2, cy: 270 - 6 - R('pill').h / 2 },    // bottom right
        goal: { cx: EDGE + R('goal').w / 2, cy: R('ability').y0 - 3 - R('goal').h / 2 },   // above the ability plate
        ability: { cx: 480 - EDGE - R('ability').w / 2, cy: R('goal').y1 + 4 + R('ability').h / 2 }, // under the goal
      }[el];
      passes.push(P([el], centreAt(o, el, dest.cx, dest.cy)));
    } else {
      const R = (i) => rectOf('port', i);
      // Portrait has no free corner: the pill goes to the right edge and the ability plate
      // to the left, each in its own row, so nothing climbs toward the status bar.
      const cx = el === 'pill' ? 480 - 15 - R('pill').w / 2 : 15 + R('ability').w / 2;
      passes.push(P([el], centreAt(o, el, cx, R(el).cy)));
    }
  };
  place(id);
  // L3 sends a second one on the biggest events.
  if (L === 3 && e.len >= 0.5) { const other = pool.filter((x) => x !== id); if (other.length) place(pickOf(other, e, 9)); }
  return plain(o, passes);
}

const FUZZ = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
function garble(str, frac, seed) {
  return [...str].map((ch, i) => (ch === ' ' || ch === '/' || hash(seed + i * 3.1) > frac ? ch : FUZZ[Math.floor(hash(seed * 1.3 + i) * FUZZ.length)])).join('');
}
function scramble(o, L, e, u) {
  // Everything stays put; what it says is wrong. A new wrong value every eighth of a beat.
  const step = Math.floor(u * e.len * 8), sd = e.seed + step * 17.3;
  const c = baseContent(), over = {};
  const digits = () => Math.floor(hash(sd) * 900) + 11;
  if (L >= 0) over.coins = digits();
  if (L >= 2) { over.goal = garble(c.goal, 0.55, sd); over.ability = garble(c.ability, 0.5, sd + 1); }
  if (L >= 3) {
    over.battery = Math.floor(hash(sd + 2) * 4);
    over.hero = HEROES()[Math.floor(hash(sd + 3) * HEROES().length)];
    over.prog = hash(sd + 4);
    over.coins = Math.floor(hash(sd) * 9000) + 100;
  }
  return [P(ORIENT[o].ids, { over })];
}

function swap(o, L, e) {
  // Two elements trade places for the event. Surge-3 sometimes rotates all three.
  const R = (i) => rectOf(o, i);
  const move = (a, b) => [
    P([a], centreAt(o, a, R(b).cx, R(b).cy)),
    P([b], centreAt(o, b, R(a).cx, R(a).cy)),
  ];
  if (o === 'port') return plain(o, move('pill', 'ability'));
  const pairs = [['pill', 'goal'], ['pill', 'ability'], ['goal', 'ability']];
  const pair = L <= 1 ? pairs[0] : pickOf(pairs, e, 4);
  if (L === 3 && hash(e.seed + 8) < 0.4 && e.len >= 0.5) {
    return plain(o, [
      P(['pill'], centreAt(o, 'pill', R('goal').cx, R('goal').cy)),
      P(['goal'], centreAt(o, 'goal', R('ability').cx, R('ability').cy)),
      P(['ability'], centreAt(o, 'ability', R('pill').cx, R('pill').cy)),
    ]);
  }
  return plain(o, move(pair[0], pair[1]));
}

function crunch(o, L, e, u) {
  // The element is re-sampled into big blocks (the Surge's own pixel glitch); optional
  // 1px jolt. No movement beyond that, and nothing brighter than it was.
  const cell = [2, 3, 4, 6][L];
  const ids = ORIENT[o].ids;
  const n = [1, 1, 2, ids.length][L];
  const first = Math.floor(hash(e.seed + 1) * ids.length);
  const hit = Array.from({ length: n }, (_, i) => ids[(first + i) % ids.length]);
  const jolt = L >= 2 ? Math.round(sgn(e) * (1 - u)) : 0;
  return plain(o, hit.map((id) => P([id], { pix: cell, dx: id === 'prog' ? 0 : jolt })));
}

// ---------------------------------------------------------------- the dramatic ones
const smooth01 = (v) => { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); };
// 0 -> 1 over the first fifth of an event, held, and back to 0 over the last fifth.
const env = (u) => smooth01(u / 0.2) * (1 - smooth01((u - 0.8) / 0.2));
const topGroup = (o) => ORIENT[o].ids.filter((id) => rectOf(o, id).cy < ORIENT[o].h / 2);
const botGroup = (o) => ORIENT[o].ids.filter((id) => rectOf(o, id).cy >= ORIENT[o].h / 2);
// A move kept on the screen (and below the status bar in portrait).
function clampMove(o, id, dx, dy) {
  const r = rectOf(o, id), top = ORIENT[o].top;
  return { dx: Math.max(EDGE - r.x0, Math.min(480 - EDGE - r.x1, dx)), dy: Math.max(top - r.y0, Math.min(ORIENT[o].h - 2 - r.y1, dy)) };
}
// How far down the screen the drama goes, as a share of the frame under the HUD line.
const travel = (o, L) => [0.08, 0.2, 0.4, 0.6][L] * (ORIENT[o].h - ORIENT[o].top) * (o === 'port' ? 0.5 : 1);

function slideDown(o, L, e, u) {
  // The top HUD sinks down the screen, hangs there, and rises back. Surge-3 sends the bottom
  // elements up the screen the other way at the same time.
  const out = topGroup(o).map((id) => P([id], clampMove(o, id, 0, env(u) * travel(o, L))));
  if (L === 3) botGroup(o).forEach((id) => out.push(P([id], clampMove(o, id, 0, -env(u) * travel(o, L) * 0.6))));
  return plain(o, out);
}

function melt(o, L, e, u) {
  // The top HUD melts: each 4px column sags by its own amount, with a fainter smear behind it.
  // The sag grows to the middle of the event and the columns climb back in the last fifth.
  const sag = travel(o, L) * 0.55;
  const out = [];
  for (const id of topGroup(o)) {
    const r = rectOf(o, id);
    for (let x = Math.floor(r.x0), i = 0; x < r.x1; x += 4, i++) {
      const k = 0.2 + 0.8 * hash(e.seed + i * 1.7 + id.length * 9);
      const dy = clampMove(o, id, 0, env(u) * sag * k).dy;
      if (dy > 1) out.push(P([id], { clipX: [x, x + 4], dy: dy * 0.5, a: 0.45, ghost: true }));
      out.push(P([id], { clipX: [x, x + 4], dy }));
    }
  }
  return plain(o, out);
}

function dropBounce(o, L, e, u) {
  // The HUD falls to the bottom of the screen, bounces twice, and flies back home. Each element
  // leaves a hair after the last. Bottom elements go the other way (up) from surge-2.
  const fall = (v) => {
    if (v < 0.3) return (v / 0.3) ** 2;
    if (v < 0.45) return 1 - 0.3 * Math.sin(Math.PI * (v - 0.3) / 0.15);
    if (v < 0.55) return 1 - 0.1 * Math.sin(Math.PI * (v - 0.45) / 0.1);
    if (v < 0.7) return 1;
    return 1 - smooth01((v - 0.7) / 0.3);
  };
  const share = [0.15, 0.4, 0.75, 1][L];
  const out = [];
  [...topGroup(o), ...(L >= 2 ? botGroup(o) : [])].forEach((id, i) => {
    const down = rectOf(o, id).cy < ORIENT[o].h / 2;
    const v = Math.max(0, Math.min(1, (u - i * 0.06) / 0.8));
    const full = down ? ORIENT[o].h - 2 - rectOf(o, id).y1 : ORIENT[o].top - rectOf(o, id).y0;
    out.push(P([id], clampMove(o, id, 0, fall(v) * full * share)));
  });
  return plain(o, out);
}

function seasick(o, L, e, u) {
  // The whole HUD rolls about like it is on a boat: each element sways in its own phase.
  const amp = [3, 10, 22, 36][L];
  return plain(o, ORIENT[o].ids.map((id, i) => {
    const a = 2 * Math.PI * (u * (1.5 + L * 0.5) + i * 0.23);
    return P([id], clampMove(o, id, Math.cos(a) * amp * 1.4 * env(u), Math.sin(a) * amp * env(u)));
  }));
}

function shred(o, L, e, u) {
  // The top HUD is cut into 4px strips and the strips slide off to the sides in turn, then
  // slide back. A share of the strips move, more of them at each level.
  const share = [0.3, 0.5, 0.8, 1][L], out = [];
  for (const id of topGroup(o)) {
    const r = rectOf(o, id);
    for (let y = Math.floor(r.y0), i = 0; y < r.y1; y += 4, i++) {
      const moves = hash(e.seed + i * 3.1 + id.length) < share;
      const dir = hash(e.seed + i * 5.3) < 0.5 ? -1 : 1;
      out.push(P([id], { clip: [y, y + 4], dx: moves ? dir * (30 + 200 * hash(e.seed + i * 1.9)) * env(u) : 0 }));
    }
  }
  return plain(o, out);
}

export const SURGE_HUD_CANDIDATES = [
  { letter: 'A', id: 'slip', name: 'SLIP', fx: slip,
    note: 'The whole HUD jumps a few pixels and eases back home, with a tear band or two torn further through it. Surge-1: a small jump. Surge-2: a bigger jump and a tear through each row. Surge-3: the biggest jump, longer tears.' },
  { letter: 'B', id: 'ghost', name: 'GHOST', fx: ghost,
    note: 'A dim copy of each element drifts out beside the real one, which never moves. Nothing is ever unreadable. Surge-1: one faint copy a few px away. Surge-2: stronger and further. Surge-3: a copy on each side.' },
  { letter: 'C', id: 'corner', name: 'WRONG CORNER', fx: wrongCorner,
    note: 'One element is in another corner for the event, then snaps home. Surge-1: only the ability plate wanders. Surge-2: the plate or the goal. Surge-3: any of the three, including the lives and coins pill, and sometimes two at once. Portrait has no free corner, so the pill and plate hop to the opposite side of their own row.' },
  { letter: 'D', id: 'scramble', name: 'SCRAMBLE', fx: scramble,
    note: 'Everything stays where it is; what it says goes wrong, with a new wrong value every eighth of a beat. Surge-1: the coin count only. Surge-2: also the goal and the ability name in letter noise. Surge-3: also the lives, the hero portrait and the progress bar.' },
  { letter: 'E', id: 'swap', name: 'SWAP', fx: swap,
    note: 'Two elements trade places for the event. Surge-1: always the two top corners (pill and goal). Surge-2: any pair. Surge-3: any pair, and sometimes all three rotate. In portrait the pill and the ability plate trade rows.' },
  { letter: 'F', id: 'crunch', name: 'CRUNCH', fx: crunch,
    note: 'A new idea: no movement. An element is re-sampled into chunky blocks, the Surge\'s own pixel glitch applied to the HUD. Surge-1: one element in small blocks. Surge-2: two, bigger. Surge-3: all of them, biggest, with a 1px jolt.' },
  { letter: 'G', id: 'slide', name: 'SLIDE DOWN', big: true, fx: slideDown,
    note: 'DRAMATIC. The top HUD (lives and coins, goal) sinks down the screen, hangs there, and rises back, 0.45 s to 0.9 s a go. Surge-1: a short slide, once a look. Surge-2: well down the screen. Surge-3: most of the way down, twice or three times a look, and the ability name and progress bar rise the other way at the same time.' },
  { letter: 'H', id: 'melt', name: 'MELT', big: true, fx: melt,
    note: 'DRAMATIC. The top HUD melts: every 4px column sags by its own amount with a fainter smear behind it, then climbs back. Surge-1: a small sag. Surge-2: drips well down the screen. Surge-3: long drips, the deepest of all.' },
  { letter: 'I', id: 'drop', name: 'DROP + BOUNCE', big: true, fx: dropBounce,
    note: 'DRAMATIC. The HUD falls to the bottom of the screen, bounces twice and flies home, each element leaving a hair after the last. Surge-1: a short fall. Surge-2: a long fall. Surge-3: all the way down, and the bottom elements fly up to the top as the top ones fall.' },
  { letter: 'J', id: 'seasick', name: 'SEASICK', big: true, fx: seasick,
    note: 'DRAMATIC. The HUD rolls about as if on a boat, each element swaying in its own phase. Surge-1: a wobble. Surge-2: a slow roll. Surge-3: a big, fast one across the whole HUD.' },
  { letter: 'K', id: 'shred', name: 'SHRED', big: true, fx: shred,
    note: 'DRAMATIC. The top HUD is cut into 4px strips and the strips slide off to either side and come back. Surge-1: a third of the strips. Surge-3: all of them, flying out up to 230px.' },
];
export const NOW_CANDIDATE = { letter: 'NOW', id: 'now', name: 'CLEAN HUD (as shipped)', fx: () => [], note: 'The HUD as it is today. Every option returns to exactly this between events, and under pause, death, the finish and the results.' };

// ------------------------------------------------------------------ painting a frame
function backdrop(ctx, o) {
  const { w, h } = ORIENT[o];
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#1d1445'); g.addColorStop(0.35, '#3a2a78'); g.addColorStop(0.7, '#17375a'); g.addColorStop(1, '#0a1226');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // A busy backdrop under the chrome, so a ghost or a block has something to fight.
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let x = 0; x < w; x += 24) ctx.fillRect(x, 0, 1, h);
  ctx.fillStyle = 'rgba(120,220,255,0.10)';
  const bands = o === 'land' ? [14, 249, 259] : [SAFE_TOP_PORTRAIT + 10, SAFE_TOP_PORTRAIT + 60, 1005, 1022];
  for (const y of bands) ctx.fillRect(0, y, w, 3);
}

const tmp = {};
function crunchPaint(ctx, o, id, c, cell) {
  const r = rectOf(o, id), m = 3;
  const m4 = ctx.getTransform(), ds = Math.hypot(m4.a, m4.b) || 1;
  const bw = Math.ceil((r.w + m * 2) / cell) * cell, bh = Math.ceil((r.h + m * 2) / cell) * cell;
  const big = (tmp.big ||= document.createElement('canvas')), sm = (tmp.sm ||= document.createElement('canvas'));
  big.width = Math.ceil(bw * ds); big.height = Math.ceil(bh * ds);
  sm.width = bw / cell; sm.height = bh / cell;
  const g = big.getContext('2d');
  g.clearRect(0, 0, big.width, big.height);
  g.save(); g.scale(ds, ds); g.translate(m - r.x0, m - r.y0);
  paintEl(g, o, id, c);
  g.restore();
  const s = sm.getContext('2d');
  s.clearRect(0, 0, sm.width, sm.height);
  s.imageSmoothingEnabled = true; s.imageSmoothingQuality = 'high';
  s.drawImage(big, 0, 0, sm.width, sm.height);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sm, r.x0 - m, r.y0 - m, bw, bh);
  ctx.restore();
}

function paintPasses(ctx, o, passes) {
  for (const p of passes) {
    ctx.save();
    if (p.clip) { ctx.beginPath(); ctx.rect(-50, p.clip[0], 580, p.clip[1] - p.clip[0]); ctx.clip(); }
    if (p.clipX) { ctx.beginPath(); ctx.rect(p.clipX[0], -50, p.clipX[1] - p.clipX[0], 1200); ctx.clip(); }
    ctx.translate(p.dx, p.dy);
    ctx.globalAlpha = p.a;
    const c = p.over ? { ...baseContent(), ...p.over } : baseContent();
    for (const id of p.ids) {
      if (p.pix) crunchPaint(ctx, o, id, c, p.pix);
      else paintEl(ctx, o, id, c);
    }
    ctx.restore();
  }
}

// Throws if a pass puts a whole element outside the frame, or (portrait) above the safe line.
// Tear bands and ghosts are clipped slices of an element, not new elements, so they are not
// tested; the element-moving options (C, E) are, which is where position is the whole idea.
function checkSafe(o, passes) {
  const top = ORIENT[o].top;
  for (const p of passes) {
    if (p.clip || p.clipX || p.ghost) continue;
    for (const id of p.ids) {
      const r = rectOf(o, id);
      const x0 = r.x0 + p.dx, x1 = r.x1 + p.dx, y0 = r.y0 + p.dy, y1 = r.y1 + p.dy;
      if (x0 < -0.5 || x1 > 480.5 || y1 > ORIENT[o].h + 0.5 || y0 < Math.min(top, r.y0) - 0.5) {
        throw new Error(`HUD ${id} left the safe area (${o}): ${x0.toFixed(1)},${y0.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`);
      }
    }
  }
}

// One cell of the strip: a label row, the top band of the screen, the bottom band.
const BANDS = {
  land: { top: [0, 32], bot: [238, 270] },
  port: { top: [0, 168], bot: [990, 1039] },
};
const LABEL_H = 11, GAP_BETWEEN = 3, CELL_GAP = 8, COLS = 2;
export function stripSize(o) {
  const b = BANDS[o];
  const cellH = LABEL_H + (b.top[1] - b.top[0]) + GAP_BETWEEN + (b.bot[1] - b.bot[0]);
  const rows = Math.ceil(HUD_FRAMES / COLS);
  return { cellW: 480, cellH, w: COLS * 480 + (COLS - 1) * CELL_GAP, h: rows * cellH + (rows - 1) * CELL_GAP };
}

// One cell: a label row, the top band of the screen, the bottom band, at `beat`.
function drawCell(ctx, o, cand, level, evs, beat, secs) {
  const { cellW, cellH } = stripSize(o);
  const b = BANDS[o];
  const act = activeAt(evs, beat);
  const passes = act ? cand.fx(o, level, act.e, act.u) : null;
  const frame = passes ? (checkSafe(o, passes), passes) : [P(ORIENT[o].ids)];
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, cellW, cellH); ctx.clip();
  // label row
  ctx.fillStyle = '#0b0b14'; ctx.fillRect(0, 0, cellW, LABEL_H);
  ctx.font = '8px ui-monospace, monospace'; ctx.textBaseline = 'middle';
  ctx.fillStyle = act ? '#ffd23c' : '#7f8aa8';
  ctx.fillText(`+${secs.toFixed(2)}s  beat ${(beat % 4 + 1).toFixed(2)}${act ? `  GLITCH ${(act.e.len * SPB).toFixed(2)}s` : ''}`, 4, LABEL_H / 2 + 0.5);
  for (const [band, y0] of [[b.top, LABEL_H], [b.bot, LABEL_H + (b.top[1] - b.top[0]) + GAP_BETWEEN]]) {
    ctx.save();
    ctx.translate(0, y0 - band[0]);
    ctx.beginPath(); ctx.rect(0, band[0], cellW, band[1] - band[0]); ctx.clip();
    backdrop(ctx, o);
    if (o === 'port') {
      // the iOS status-bar wash, and the 82pt line the HUD keeps below
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, cellW, SAFE_TOP_PORTRAIT);
      ctx.fillStyle = 'rgba(255,90,90,0.55)'; ctx.fillRect(0, SAFE_TOP_PORTRAIT - 0.5, cellW, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '8px ui-monospace, monospace'; ctx.textBaseline = 'top';
      if (band === b.top) ctx.fillText('status bar  /  HUD line at 82', 4, 4);
    }
    paintPasses(ctx, o, frame);
    ctx.restore();
  }
  ctx.restore();
}

export function drawHudStrip(ctx, o, cand, level, seed = 7) {
  const { cellW, cellH } = stripSize(o);
  const { events, w0 } = hudWindow(level, seed, 0);
  const evs = cand.id === 'now' ? [] : events;
  ctx.fillStyle = '#05050a'; ctx.fillRect(0, 0, stripSize(o).w, stripSize(o).h);
  for (let i = 0; i < HUD_FRAMES; i++) {
    ctx.save();
    ctx.translate((i % COLS) * (cellW + CELL_GAP), Math.floor(i / COLS) * (cellH + CELL_GAP));
    drawCell(ctx, o, cand, level, evs, w0 + i * HUD_STEP_BEATS, i * HUD_STEP_BEATS * SPB);
    ctx.restore();
  }
}

// ONE LIVE CELL, ANIMATED (Peter, 14 Oct: "a zillion near identical pictures ... is it meant to
// be animated?"). Loops the busiest stretch of a look, HUD_LOOP_BEATS long, in real time at the
// Surge's 132 BPM, so the glitches play as they would in a run.
export const HUD_LOOP_BEATS = 8;
export const HUD_LOOP_SECONDS = HUD_LOOP_BEATS * SPB;
export function liveSize(o) { return { w: ORIENT[o].w, h: ORIENT[o].h }; }
// The whole frame: a real look under a hero and a crate (the tint bake-off's scene), the HUD on top,
// so the glitch is judged where it happens. Portrait stands the 16:9 scene in the middle of the tall
// frame on its own sky.
const NOOP_TREATMENT = { apply() {} };
export function drawHudLive(ctx, o, cand, level, t, seed = 7) {
  const { w0 } = hudWindow(level, seed, 0, !!cand.big);
  const evs = cand.id === 'now' ? [] : hudEvents(level, seed, 0, !!cand.big);
  const start = Math.max(0, w0 - 0.75);
  // quantised to the sixteenth, as the Surge's own clock steps its glitches
  const u = (t % HUD_LOOP_SECONDS) / SPB;
  const beat = start + Math.floor(u * 16) / 16;
  const { w, h } = ORIENT[o];
  ctx.save();
  if (o === 'port') {
    ctx.fillStyle = '#a9d4ff'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#4c7a2e'; ctx.fillRect(0, (h + 270) / 2, w, h);
    ctx.translate(0, (h - 270) / 2);
    drawSurgeTreatment(ctx, t, 'pixel', NOOP_TREATMENT);
    ctx.translate(0, -(h - 270) / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, w, SAFE_TOP_PORTRAIT);
    ctx.fillStyle = 'rgba(255,90,90,0.55)'; ctx.fillRect(0, SAFE_TOP_PORTRAIT - 0.5, w, 1);
  } else {
    drawSurgeTreatment(ctx, t, 'pixel', NOOP_TREATMENT);
  }
  const act = activeAt(evs, beat);
  const passes = act ? cand.fx(o, level, act.e, act.u) : null;
  paintPasses(ctx, o, passes ? (checkSafe(o, passes), passes) : [P(ORIENT[o].ids)]);
  if (act) {
    ctx.font = '8px ui-monospace, monospace'; ctx.textBaseline = 'top'; ctx.fillStyle = '#ffd23c';
    ctx.fillText(`GLITCH ${(act.e.len * SPB).toFixed(2)}s`, 4, o === 'port' ? SAFE_TOP_PORTRAIT + 4 : 262 - 8 - 22);
  }
  ctx.restore();
}
