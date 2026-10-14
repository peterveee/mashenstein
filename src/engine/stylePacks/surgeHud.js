// THE SURGE PUTS THE HUD IN THE WRONG PLACE now and then (Peter, 14 Oct 2026: "what if the hud
// elements were in the wrong place now and then ... a bit more drama, like the top hud sliding down
// the screen for a bit or melting"). From the lab bake-off `surge-hud-bakeoff`; he picked G SLIDE
// DOWN, H MELT, I DROP + BOUNCE, K SHRED and C WRONG CORNER, and ruled: "we must never move the
// progress indicator" and "leave the ability bar alone too". So only the TOP of the HUD moves: the
// lives-and-coins pill (with its hero disc) and the goal and bonus panels. In portrait the two are
// one stack and move together.
//
// The HUD is painted as it always is, into a scratch canvas the size of the overlay, and the top
// regions are cut out of it and laid back moved (slid, dripped, dropped, shredded, swapped). The rest
// is composited in place. Movement only: nothing brightens or flashes, an event runs 0.45 to 0.9 s
// (the corner swap about half that), surge-1 gets one a look, surge-2 one or two, surge-3 two or
// three, and none ever falls on a look change, the opening, the bar-5 burst, the flip, a pause, a
// death or the finish.
import { SURGE_SLOT_BEATS, SURGE_BPM } from './surgeCut.js';

const SPB = 60 / SURGE_BPM;
const mod = (a, n) => ((a % n) + n) % n;
function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
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
const smooth01 = (v) => { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); };
// 0 -> 1 over the first fifth of an event, held, and back to 0 over the last fifth.
const env = (u) => smooth01(u / 0.2) * (1 - smooth01((u - 0.8) / 0.2));

// ------------------------------------------------------------------ the schedule
export const SURGE_HUD_LEVELS = Object.freeze({
  // `chance` is the share of looks (four bars, 7.3 s) that carry any (Peter, 14 Oct: "they seem to
  // happen very frequently"): surge-1 one look in three, surge-3 three in four, and then one or two.
  1: { chance: 0.3, per: [1], lens: [1] },
  2: { chance: 0.5, per: [1, 1, 2], lens: [1, 1.5] },
  3: { chance: 0.75, per: [1, 1, 2], lens: [1.5, 2] },
});
export const SURGE_HUD_KINDS = Object.freeze({
  1: ['slide', 'melt', 'corner'],
  2: ['slide', 'melt', 'corner', 'drop', 'shred'],
  3: ['slide', 'melt', 'corner', 'drop', 'shred'],
});
// How often each is drawn (Peter, 14 Oct: "less melting and slide down and drop and bounce"): the three big
// sinkers come up about a third as often as shred and the corner swap.
export const SURGE_HUD_WEIGHTS = Object.freeze({ slide: 0.35, melt: 0.3, drop: 0.35, shred: 1, corner: 1 });
// One look's events, in beats from its downbeat: from beat 1.5 to 14, on the quarter beat, never
// two running without a beat clear, never the same kind twice running.
export function surgeHudEvents(slot, level, seed) {
  const lv = Math.max(1, Math.min(3, Math.round(level) || 1));
  const L = SURGE_HUD_LEVELS[lv], pool = SURGE_HUD_KINDS[lv];
  const r = rng(seed * 211 + slot * 29 + lv * 13 + 0.5);
  const has = r() < L.chance;
  const n = has ? L.per[Math.floor(r() * L.per.length)] : 0;
  const out = [];
  const room = (14 - 1.5) / n;
  let at = 1.5 + Math.floor(r() * 3) * 0.25, last = null;
  for (let i = 0; i < n; i++) {
    const kinds = pool.filter((k) => k !== last);
    let pick = r() * kinds.reduce((a, k) => a + SURGE_HUD_WEIGHTS[k], 0);
    const kind = kinds.find((k) => (pick -= SURGE_HUD_WEIGHTS[k]) < 0) || kinds[kinds.length - 1];
    const len = Math.min(L.lens[Math.floor(r() * L.lens.length)], kind === 'corner' ? 1 : 9);
    const start = Math.min(at, 14 - len);
    out.push({ kind, start, len, seed: r() * 1000 });
    at = Math.max(start + len + 1, start + room * (0.6 + 0.8 * r()));
    last = kind;
  }
  return out;
}
// The event on at `beat` of the Surge's cycle (each stage opens three looks on), or null.
export function surgeHudAt(beat, { level = 1, seed = 1 } = {}) {
  if (!(beat >= 0)) return null;
  const lv = Math.max(1, Math.min(3, Math.round(level) || 1));
  const slot = Math.floor(beat / SURGE_SLOT_BEATS) + (lv - 1) * 3;
  const since = beat - Math.floor(beat / SURGE_SLOT_BEATS) * SURGE_SLOT_BEATS;
  for (const e of surgeHudEvents(slot, lv, seed)) {
    if (since >= e.start && since < e.start + e.len) return { ...e, level: lv, u: (since - e.start) / e.len };
  }
  return null;
}

// ------------------------------------------------------------------ the moves
// `bands`: { W, H, port, pill: {x0,y0,x1,y1}, goal: {…} | null }, frame units. Returns passes, each a
// slice of a region and where it goes: { r: 'pill'|'goal', sx0, sx1, sy0, sy1, dx, dy, a }.
const EDGE = 6;
export function surgeHudPasses(ev, bands) {
  const { kind, u, level: L, seed } = ev;
  const regions = ['pill', 'goal'].filter((k) => bands[k]);
  const whole = (k, extra = {}) => ({ r: k, sx0: bands[k].x0, sx1: bands[k].x1, sy0: bands[k].y0, sy1: bands[k].y1, dx: 0, dy: 0, a: 1, ...extra });
  // How far down it may go: the share of the screen the level allows, never onto the bottom band.
  const room = (k) => Math.max(0, bands.H * 0.8 - bands[k].y1);
  const travel = (k) => Math.min(room(k), [0, 0.2, 0.4, 0.6][L] * (bands.H - bands[k].y1 + (bands[k].y1 - bands[k].y0)) * (bands.port ? 0.5 : 1));
  const out = [];
  if (kind === 'slide') {
    for (const k of regions) out.push(whole(k, { dy: env(u) * travel(k) }));
  } else if (kind === 'melt') {
    // Every 4px column sags by its own amount with a fainter smear behind it.
    for (const k of regions) {
      const b = bands[k], sag = travel(k) * 0.55;
      for (let x = Math.floor(b.x0), i = 0; x < b.x1; x += 4, i++) {
        const dy = env(u) * sag * (0.2 + 0.8 * hash(seed + i * 1.7 + (k === 'goal' ? 9 : 0)));
        const col = { r: k, sx0: x, sx1: Math.min(x + 4, b.x1), sy0: b.y0, sy1: b.y1 };
        if (dy > 1) out.push({ ...col, dx: 0, dy: dy * 0.5, a: 0.45 });
        out.push({ ...col, dx: 0, dy, a: 1 });
      }
    }
  } else if (kind === 'drop') {
    // The HUD falls, bounces twice and flies home, each region a hair after the last.
    const fall = (v) => {
      if (v < 0.3) return (v / 0.3) ** 2;
      if (v < 0.45) return 1 - 0.3 * Math.sin(Math.PI * (v - 0.3) / 0.15);
      if (v < 0.55) return 1 - 0.1 * Math.sin(Math.PI * (v - 0.45) / 0.1);
      if (v < 0.7) return 1;
      return 1 - smooth01((v - 0.7) / 0.3);
    };
    const share = [0, 0.4, 0.75, 1][L];
    regions.forEach((k, i) => out.push(whole(k, { dy: fall(Math.max(0, Math.min(1, (u - i * 0.06) / 0.88))) * room(k) * share })));
  } else if (kind === 'shred') {
    // 4px strips slide off to either side in turn and come back; more of them at each level.
    const share = [0, 0.5, 0.8, 1][L];
    for (const k of regions) {
      const b = bands[k];
      for (let y = Math.floor(b.y0), i = 0; y < b.y1; y += 4, i++) {
        const moves = hash(seed + i * 3.1 + (k === 'goal' ? 7 : 0)) < share;
        const dir = hash(seed + i * 5.3) < 0.5 ? -1 : 1;
        out.push({ r: k, sx0: b.x0, sx1: b.x1, sy0: y, sy1: Math.min(y + 4, b.y1), dy: 0, a: 1,
          dx: moves ? dir * (30 + 200 * hash(seed + i * 1.9)) * env(u) : 0 });
      }
    }
  } else if (kind === 'corner') {
    // The pill and the goal swap sides for the event. In portrait the stack hops across.
    const p = bands.pill, g = bands.goal;
    if (g) {
      out.push(whole('pill', { dx: bands.W - EDGE - p.x1 }));
      out.push(whole('goal', { dx: EDGE - g.x0 }));
    } else out.push(whole('pill', { dx: bands.W - EDGE - (p.cx1 ?? p.x1) }));
  }
  return out;
}

// ------------------------------------------------------------------ painting
let scratch = null;
// Paints the HUD with `drawHud(ctx, run)` as it is, but with its top regions moved by the event.
// `getBands(run)` is called AFTER the HUD is drawn, so it can read the panels' real edges.
export function paintHudGlitched(ctx, run, ev, drawHud, getBands) {
  const cv = ctx.canvas;
  if (!cv || typeof document === 'undefined' || typeof ctx.getTransform !== 'function') { drawHud(ctx, run); return; }
  if (!scratch) scratch = document.createElement('canvas');
  if (scratch.width !== cv.width || scratch.height !== cv.height) { scratch.width = cv.width; scratch.height = cv.height; }
  const g = scratch.getContext('2d');
  if (!g || typeof g.drawImage !== 'function') { drawHud(ctx, run); return; }
  const m = ctx.getTransform();
  if (!m || !Number.isFinite(m.a)) { drawHud(ctx, run); return; }
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, scratch.width, scratch.height);
  g.setTransform(m);
  drawHud(g, run);
  const bands = getBands(run);
  if (!bands) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(scratch, 0, 0); ctx.restore(); return; }
  const passes = surgeHudPasses(ev, bands);
  // A frame rect in device pixels (the transform has scale and shift only, mirrored or not).
  const dev = (x0, y0, x1, y1) => {
    const xa = m.a * x0 + m.e, xb = m.a * x1 + m.e, ya = m.d * y0 + m.f, yb = m.d * y1 + m.f;
    return [Math.min(xa, xb), Math.min(ya, yb), Math.abs(xb - xa), Math.abs(yb - ya)];
  };
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // Everything except the regions that move, as it was drawn.
  ctx.beginPath();
  ctx.rect(0, 0, cv.width, cv.height);
  for (const k of ['pill', 'goal']) if (bands[k]) ctx.rect(...dev(bands[k].x0, bands[k].y0, bands[k].x1, bands[k].y1));
  ctx.clip('evenodd');
  ctx.drawImage(scratch, 0, 0);
  ctx.restore();
  for (const p of passes) {
    const [sx, sy, sw, sh] = dev(p.sx0, p.sy0, p.sx1, p.sy1);
    if (sw < 1 || sh < 1) continue;
    const [tx, ty] = dev(p.sx0 + p.dx, p.sy0 + p.dy, p.sx1 + p.dx, p.sy1 + p.dy);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (p.a < 1) ctx.globalAlpha = p.a;
    ctx.drawImage(scratch, sx, sy, sw, sh, tx, ty, sw, sh);
    ctx.restore();
  }
}
