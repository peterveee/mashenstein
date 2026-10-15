// Corporate Kombat: the crypt's zombies, found work on floor 23. A callback from Crypt Shift
// (cabinet 5) in cabinet 8 — Peter, 15 Oct 2026, the bake-off in src/dev/office-zombie-
// candidates.js, then "ok, ship them".
//
// They are the crypt's own drawing (crypt-enemies.js drawCryptZombie, the lane's vacant stare),
// never redrawn — a redraw in the office's hand was "not recognisable as being from the earlier
// level" — with the office's look laid on top: its thin ink, its flat light (a lit rim down the
// window side and a shade band down the other, cut from the figure's own silhouette), its
// colours eased toward the floor's pastels (SOFT); and proportions nearer the office's people
// (ZOMBIE_SHAPE: a smaller head, a longer body and longer legs, a little narrower, a thinner
// reaching sleeve). Three appearances, each a different zombie:
//   - the usher, lift attendant at last, in the open car of the first lift bank (liftCar.js);
//   - the clerk's purple-suited colleague (raspberry suit, teal tie, a mug) shuffling toward the
//     two eating in the STAFF CANTEEN (rooms.js);
//   - the clerk, EMPLOYEE OF THE MONTH for the last three months by the real calendar, on the wall
//     over the middle of a cube farm about two thirds along, and the man himself at the water
//     cooler at the end of that farm.
// They are there whether or not the player has been to the crypt (Peter: "they're corporate
// zombies, the gag works even if you haven't played the crypt").
import { canvas, box, rbox, letters, PAL } from './line.js';
import { FACTORS, OFFICE_ZOOM, MID_BASE } from '../officeClimb.js';
// (progression.js reaches this module through liftCar.js; its corridors are only read at draw time)
import { OFFICE_CORRIDORS, officeLandmarks, officeFurnitureCuts, officeFounderPlan, officeIsWallSection } from './progression.js';
import { cooler } from './room.js';
import { drawCryptZombie, CRYPT_ART_STYLES } from '../../../sprites/crypt-enemies.js';

const LWM = 0.5;

// The office treatments, cumulative: INK the floor's thin outline, LIGHT the rims, SOFT the colours.
export const ZOMBIE_TWEAKS = {
  asis: {},
  ink: { ink: true },
  lit: { ink: true, light: true },
  soft: { ink: true, light: true, soft: true },
};
// Head scale, leg length, body length, width, reaching-sleeve thickness, and the height it stands
// in the furniture row, where an office worker is 51 (bake-off R).
export const ZOMBIE_SHAPE = { head: 0.68, legs: 1.43, torso: 1.15, slim: 0.88, arm: 0.72, h: 51 };
// The clerk dressed differently for its second appearance: an 80s raspberry suit, a teal tie,
// auburn hair, no glasses, a coffee mug in place of the briefcase.
export const TEMP_OUTFIT = { cloth: '#c4577c', dark: '#8e3a5a', tie: '#35c2b6', hair: '#b8502a', glasses: false, carry: 'mug' };

// drawCryptZombie's authored height for each role (crypt-enemies.js drawSelectedCryptEnemy)
const AUTHORED = { clerk: 116, usher: 129, gardener: 129 };
// the drawing's reach in its own units once its feet are at 0: the reaching hand at x -39, what
// it carries out to +45, the usher's hat at -127 (higher on longer legs)
const BOX = { x0: -58, x1: 58, y0: -160, y1: 8 };
// the drawing's height for a shape: 68 to the neck, the legs adding 30 for each 1 of length and
// the body 38, the head (and hat) above the neck scaled with it
export const zombieHeightOf = (role, shape) =>
  68 + 30 * ((shape.legs ?? 1) - 1) + 38 * ((shape.torso ?? 1) - 1) + (AUTHORED[role] - 68) * (shape.head ?? 1);

// SOFT is CSS saturate(0.78) brightness(1.06), applied to each colour as it is drawn (a canvas
// filter is not there on every Safari, and this costs nothing once a colour is seen).
const SAT = 0.78, BRIGHT = 1.06, SOFT_MEMO = new Map();
export function softColour(col) {
  let out = SOFT_MEMO.get(col);
  if (out) return out;
  let r, g, b, a = 1;
  const hex = /^#([0-9a-f]{6})$/i.exec(col);
  const fn = /^rgba?\(([^)]+)\)$/i.exec(col);
  if (hex) { const n = parseInt(hex[1], 16); r = n >> 16; g = (n >> 8) & 255; b = n & 255; }
  else if (fn) { [r, g, b, a = 1] = fn[1].split(',').map(Number); }
  else return col;
  const s = SAT, k = BRIGHT, c = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  out = `rgba(${c((0.213 + 0.787 * s) * r + (0.715 - 0.715 * s) * g + (0.072 - 0.072 * s) * b)},`
    + `${c((0.213 - 0.213 * s) * r + (0.715 + 0.285 * s) * g + (0.072 - 0.072 * s) * b)},`
    + `${c((0.213 - 0.213 * s) * r + (0.715 - 0.715 * s) * g + (0.072 + 0.928 * s) * b)},${a})`;
  SOFT_MEMO.set(col, out);
  return out;
}

// The figure is drawn on its own card for the light pass. The cards are kept and reused by size:
// one zombie is on screen at a time, at one or two sizes.
const CARDS = new Map();
function card(key, W, H) {
  let c = CARDS.get(key);
  if (!c || c.width !== W || c.height !== H) {
    if (CARDS.size > 12) CARDS.clear();
    c = canvas(W, H);
    CARDS.set(key, c);
  }
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, W, H);
  return [c, g];
}

// One of the crypt's zombies, feet at the current origin, in a `shape` (`h` tall unless given),
// with the office `tweak`s. facing -1 turns it to face right; idle stands it swaying, otherwise
// `phase` walks it. `outfit` dresses a clerk differently (drawCryptZombie).
export function drawOfficeZombie(g, t, role, { shape = ZOMBIE_SHAPE, h = shape.h, tweak = ZOMBIE_TWEAKS.soft, outfit = null, facing = 1, idle = true, phase = null, ink = PAL.open.inkM } = {}) {
  const sc = h / zombieHeightOf(role, shape);
  const base = CRYPT_ART_STYLES[0];
  const style = tweak.ink ? { ...base, ink, edge: LWM / sc } : { ...base };
  if (tweak.soft) { style.map = softColour; style.skin = softColour(style.skin); style.shade = softColour(style.shade); }
  const paint = (c) => {
    c.scale(sc * (shape.slim ?? 1) * (facing < 0 ? -1 : 1), sc);
    c.translate(-24, 0);
    drawCryptZombie(c, t, role, style, { vacant: true, idle, phase, head: shape.head ?? 1, legs: shape.legs ?? 1,
      torso: shape.torso ?? 1, arm: shape.arm ?? 1, outfit });
  };
  if (!tweak.light) { g.save(); paint(g); g.restore(); return; }
  // the light pass works on the finished figure, drawn at the density it lands on screen
  const m = g.getTransform(), k = Math.hypot(m.a, m.b) || 1;
  const W = Math.ceil((BOX.x1 - BOX.x0) * sc * k) + 2, H = Math.ceil((BOX.y1 - BOX.y0) * sc * k) + 2;
  const [cv, c] = card('fig', W, H);
  c.setTransform(k, 0, 0, k, -BOX.x0 * sc * k, -BOX.y0 * sc * k);
  paint(c);
  c.setTransform(1, 0, 0, 1, 0, 0);
  // the rims are the figure less itself shifted: lit down the left (the window side, as the office
  // lights its people), a wider shade band down the right. Their widths go with the figure's size,
  // in its own units, so a zombie drawn bigger (the usher in the lift) is not edged heavier; and
  // they are fine lines, not bands (Peter, 15 Oct 2026: "the zombies have quite thick lines on the
  // top left? do these need to be reduced to match the reduced proportions?").
  const fill = (col) => (tweak.soft ? softColour(col) : col), per = h / 51;
  // As faint as the office's own people's light (room.js cubicleBack, seatedBack: a white sliver at
  // about a fifth, a shade band at about a sixth): "could they be a little softer still".
  const lit = rim(cv, W, H, 'lit', 0.75 * per * k, fill('rgba(255,251,242,0.2)'));
  c.globalCompositeOperation = 'source-atop';
  c.drawImage(lit, 0, 0);
  const dark = rim(cv, W, H, 'dark', -2.4 * per * k, fill('rgba(24,18,36,0.14)'));
  c.drawImage(dark, 0, 0);
  c.globalCompositeOperation = 'source-over';
  g.drawImage(cv, BOX.x0 * sc, BOX.y0 * sc, W / k, H / k);
}
// The rim is cut from the figure as it stood before either rim went on: the shade's is cut after
// the lit rim is laid, which only differs where the two would overlap (they never do).
function rim(src, W, H, key, dx, color) {
  const [r, c] = card(key, W, H);
  c.drawImage(src, 0, 0);
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = color; c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'destination-out';
  c.drawImage(src, dx, 0);
  c.globalCompositeOperation = 'source-over';
  return r;
}

// ---------------------------------------------------------------- where they are
// EMPLOYEE OF THE MONTH hangs on the wall over the start of a cube farm, and the clerk himself
// stands at the water cooler beyond the end of that farm (Peter, 15 Oct 2026: "I want the employee of
// the month in the middle of a cube farm and for the water cooler at the end of that cube farm to
// have the zombie next to it"). Floor 23's farms with a cooler at their end (officeClimb.js), about
// two thirds along: the instance of one
// nearest that whose desks and cooler no room clears (officeFurnitureCuts) with a plain wall bay —
// no window, no room — passing over its middle while it is in view. The board hangs in that bay,
// and the bay's own print comes down (artwork.js).
// Met before office-2's third alarm (0.70) can be pulled, so the clerk's gag plays out on a
// floor still at its desks (Peter, 15 Oct: "i want the employee of the month vignette to play
// out before alarm 3"): between the training room and the first lift, about the first
// checkpoint, since the lift and the canteen keep the middle of the floor clear (BOARD_CLEAR).
const BOARD_AT = 0.57, BOARD_EARLIEST = 0.08, BOARD_LATEST = 0.64;
// The board keeps a picture wall between it and a wall section such as the canteen (Peter, 15 Oct
// 2026: "space it out so the employee of the month is not immediately to the right of the
// canteen"): a window, a wall bay with its print, a window, in the wall's own units. A room or a
// lift only has to keep off its bay.
const BOARD_CLEAR = 470;
// a place's stretch of wall, absolute, at camera camX
const spanOf = (l, camX, wallRate) => (l.section ? [l.section.u0, l.section.u1] : [l.x + camX * wallRate, l.x + l.w + camX * wallRate]);
const crowded = (lms, bay, camX, wallRate) => lms.some((l) => {
  // the picture wall is kept from a built-in (the canteen); a room or a lift only keeps off its bay
  const [a, b] = spanOf(l, camX, wallRate), clear = officeIsWallSection('open', l.kind) ? BOARD_CLEAR : 300;
  return a < bay.u1 + clear && b > bay.u0 - clear;
});
const FARM_PICKS = new Map();
const VIEW = { left: 0, right: 480 };
function farmPlan(floor, T) {
  const key = `${floor}@${T}`;
  if (FARM_PICKS.has(key)) return FARM_PICKS.get(key);
  if (FARM_PICKS.size > 16) FARM_PICKS.clear();
  const F = OFFICE_CORRIDORS[floor], mid = F.mid, wall = F.wall;
  const midRate = (mid.factor ?? FACTORS.mid) * OFFICE_ZOOM, wallRate = (wall.factor ?? FACTORS.wall) * OFFICE_ZOOM;
  // the farms with a cooler at their end (one has a plant before it)
  const coolerAt = (c) => mid.items.find((q) => q.kind === 'cooler' && q.u > c.u1 && q.u - c.u1 < 90);
  const farms = mid.items.filter((q) => q.kind === 'cubicles' && coolerAt(q)).map((q) => ({ farm: q, cooler: coolerAt(q) }));
  // The wall moves slower than the furniture, so a wall bay passes over the farm's middle at one
  // camera position: for each farm, nearest the two-thirds mark first, the bays that do so while
  // the farm is in view, in order of how near that is to the mark.
  let out = null;
  if (Number.isFinite(T) && T > 0) {
    // never where the founder's portrait waits at the finish
    const fin = officeFounderPlan(floor, T)?.finish;
    const rel = midRate - wallRate, options = [];
    for (const { farm, cooler } of farms) {
    const n0 = Math.round((240 + BOARD_AT * T * midRate - farm.u) / mid.period);
    for (let n = n0 - 4; n <= n0 + 4; n++) {
      // the farm's first desk: the board hangs over it, the farm runs on past, the clerk waits at
      // the cooler beyond (Peter: "this works better if the poster is at the start of a cube farm
      // and the water cooler is beyond that")
      const fc = farm.u + n * mid.period;
      for (const q of wall.bays.filter((b) => b.type === 'wall')) {
        const bc0 = (q.u + q.u1) / 2;
        for (let j = Math.floor((fc - 0.99 * T * rel - bc0) / wall.period) - 1; j <= Math.ceil((fc - (BOARD_EARLIEST - 0.02) * T * rel - bc0) / wall.period) + 1; j++) {
          // the board within 70 of the farm's start while that is well in view: the camera that does
          // both and puts the board nearest the start
          // ...and the board itself well inside the picture then
          const bc = bc0 + j * wall.period, lo = Math.max((fc - bc - 70) / rel, (fc - 360) / midRate, (bc - 420) / wallRate);
          const hi = Math.min((fc - bc + 70) / rel, (fc - 60) / midRate, (bc - 60) / wallRate);
          if (lo > hi) continue;
          const camX = Math.max(lo, Math.min(hi, (fc - bc) / rel));
          if (camX < BOARD_EARLIEST * T || camX > BOARD_LATEST * T) continue;
          options.push({ farm, cooler, n, camX, bay: { u0: q.u + j * wall.period, u1: q.u1 + j * wall.period } });
        }
      }
    }
    }
    options.sort((p, q) => Math.abs(p.camX - BOARD_AT * T) - Math.abs(q.camX - BOARD_AT * T));
    for (const { farm, cooler, n, camX, bay } of options) {
      // the desks and the cooler, with room for the clerk, all standing; no room in front of the bay
      const lms = officeLandmarks(floor, camX, T), cuts = officeFurnitureCuts({ floor, mid: { shift: camX * midRate }, coverage: VIEW }, lms);
      const a = farm.u + n * mid.period - camX * midRate, b = cooler.u + n * mid.period - camX * midRate + 60;
      if (cuts.some(([p, q]) => q > a && p < b)) continue;
      if (crowded(lms, bay, camX, wallRate)) continue;
      if (fin && bay.u0 < fin.u1 + 20 && bay.u1 > fin.u0 - 20) continue;
      // the copier that stands just past that cooler goes, there only, to give the clerk his room
      // (Peter: "just the one where the zombie was standing")
      const copier = mid.items.find((q) => q.kind === 'copier' && q.u > cooler.u && q.u - cooler.u < 90);
      out = { camX, board: bay, cooler: cooler.u + n * mid.period,
        cut: copier && [copier.u + n * mid.period - 3, copier.u + (copier.w || 40) + n * mid.period + 3] };
      break;
    }
    // A stage too short for any of that (ASSIST SPEED 80%) keeps the gag by giving up a cube farm
    // (Peter: "would rather not lose that gag, can sacrifice a cube farm for this"): the plain wall
    // bay nearest the mark that no room stands in front of, the furniture under it taken away, whole
    // pieces only, and a cooler of the clerk's own put there, with him at it.
    if (!out) {
      const bays = [];
      for (const q of wall.bays.filter((b) => b.type === 'wall')) {
        const n0 = Math.round((240 + BOARD_AT * T * wallRate - (q.u + q.u1) / 2) / wall.period);
        for (let j = n0 - 4; j <= n0 + 4; j++) bays.push({ u0: q.u + j * wall.period, u1: q.u1 + j * wall.period });
      }
      const camOf = (b) => ((b.u0 + b.u1) / 2 - 240) / wallRate;
      bays.sort((p, q) => Math.abs(camOf(p) - BOARD_AT * T) - Math.abs(camOf(q) - BOARD_AT * T));
      for (const bay of bays) {
        const camX = camOf(bay);
        if (camX < BOARD_EARLIEST * T || camX > BOARD_LATEST * T) continue;
        if (fin && bay.u0 < fin.u1 + 20 && bay.u1 > fin.u0 - 20) continue;
        if (crowded(officeLandmarks(floor, camX, T), bay, camX, wallRate)) continue;
        // clear the row under the board (a room going by may have cleared it already), whole
        // pieces, so nothing is sliced
        const shift = camX * midRate;
        let a = 170 + shift, b = 350 + shift;
        for (let grew = true; grew;) {
          grew = false;
          for (let j = Math.floor(a / mid.period) - 1; j <= Math.floor(b / mid.period) + 1; j++) for (const it of mid.items) {
            const p0 = it.u + j * mid.period, p1 = (it.u1 ?? it.u + (it.w ?? 40)) + j * mid.period;
            if (p1 > a && p0 < b && (p0 < a || p1 > b)) { a = Math.min(a, p0 - 2); b = Math.max(b, p1 + 2); grew = true; }
          }
        }
        // and no other cooler just along from his own
        for (let j = Math.floor(a / mid.period) - 1; j <= Math.floor(b / mid.period) + 1; j++) for (const it of mid.items) {
          const p0 = it.u + j * mid.period;
          if (it.kind === 'cooler' && p0 > b && p0 < b + 160) b = p0 + (it.w ?? 17) + 3;
          if (it.kind === 'cooler' && p0 < a && p0 > a - 160) a = p0 - 3;
        }
        out = { camX, board: bay, cooler: 270 + shift, own: true, cut: [a, b] };
        break;
      }
    }
  }
  FARM_PICKS.set(key, out);
  return out;
}
// The plan itself, for the tests: {camX, board, cooler, cut, own}.
export const zombieFarmPlan = (floor, T) => farmPlan(floor, T);
// Where the camera is as the farm crosses the middle of the view (the gallery and the tests).
export function zombieMeetings(floor, T) {
  const p = farmPlan(floor, T), F = OFFICE_CORRIDORS[floor];
  return { board: p ? p.camX : null, cooler: p ? (p.cooler - 240) / ((F.mid.factor ?? FACTORS.mid) * OFFICE_ZOOM) : null };
}
// The board's wall bay, {u0, u1} in the wall's own coordinates, or null: the frame's monthBoard.
export function officeMonthBoard(f) {
  return f.floor === 'open' ? farmPlan(f.floor, f.totalDist)?.board ?? null : null;
}
// Furniture left out for the zombies, as screen spans to add to the room cuts (index.js): the copier
// by the clerk's cooler, or on a short stage the cube farm given up for his own.
export function zombieFurnitureCuts(f) {
  const p = f.floor === 'open' && farmPlan(f.floor, f.totalDist);
  return p && p.cut ? [[p.cut[0] - f.mid.shift, p.cut[1] - f.mid.shift]] : [];
}
// Stretches of wall, in the wall's own coordinates, that hang no print (artwork.js): the board's
// bay, and the wall behind the purple clerk as he creeps up on the canteen — nothing there to take
// the eye off him (Peter: "Don't have a sign near the purple clerk, it is distracting from him").
export function zombieWallClear(f) {
  if (f.floor !== 'open') return [];
  const out = [];
  if (f.monthBoard) out.push([f.monthBoard.u0, f.monthBoard.u1]);
  const canteen = f.landmarks?.find((l) => l.kind === 'canteen');
  if (canteen) out.push([canteen.x + f.wall.shift - 200, canteen.x + f.wall.shift + 10]);
  return out;
}
// The wall's radiators that would pass behind the clerk while he is in view come away (Peter:
// "would love to lose the aircon behind the zombie here"): the wall moves slower than the floor he
// stands on, so as he crosses the view from one side to the other the wall behind him slides by,
// and every radiator in that stretch is painted out with the dado it hangs on (wall.js openGlass:
// under each window run, rn of them, rp apart, 12 in, 42 wide, 174 to 195).
function paintOutRadiators(g, f, P, p) {
  const F = OFFICE_CORRIDORS[f.floor], wall = F.wall;
  const m = (F.mid.factor ?? FACTORS.mid) * OFFICE_ZOOM, w = (wall.factor ?? FACTORS.wall) * OFFICE_ZOOM;
  // the wall under the clerk (the cooler's x to 60 past it) as the cooler crosses from -60 to 520
  const a = -65 + (p.cooler + 60) * w / m, b = 580 + (p.cooler - 520) * w / m;
  const sections = (f.landmarks || []).filter((l) => l.section).map((l) => [l.section.u0, l.section.u1]);
  for (const q of wall.bays.filter((x) => x.type === 'glass')) {
    for (let j = Math.floor((a - q.u1) / wall.period); j <= Math.ceil((b - q.u) / wall.period); j++) {
      const x0 = q.u + j * wall.period, x1 = q.u1 + j * wall.period;
      if (sections.some(([s0, s1]) => s0 < x1 && s1 > x0)) continue;
      const rn = Math.max(1, Math.round((x1 - x0) / 190)), rp = (x1 - x0) / rn, rw = Math.min(42, rp - 24);
      for (let i = 0; i < rn; i++) {
        const rx = x0 + i * rp + 12;
        if (rx + rw < a || rx > b) continue;
        box(g, rx - 1 - f.wall.shift, 173.4, rw + 2, 22.2, P.dado);
      }
    }
  }
}
// On the wall over the farm, with the pictures (index.js, after paintOfficeArtwork).
export function paintMonthBoardOnWall(g, f, P) {
  const p = f.floor === 'open' && farmPlan(f.floor, f.totalDist);
  if (p) paintOutRadiators(g, f, P, p);
  const b = f.monthBoard;
  if (!b) return;
  const x0 = b.u0 - f.wall.shift, x1 = b.u1 - f.wall.shift;
  if (x1 < f.coverage.left - 40 || x0 > f.coverage.right + 40) return;
  paintMonthBoard(g, (x0 + x1) / 2, 76, P);
}
// In the furniture row, after the furniture: the clerk at the cooler at the end of the farm, its
// hand out toward it, clear floor between it and the next desks.
export function paintCoolerZombie(g, f, P) {
  const p = f.floor === 'open' && farmPlan(f.floor, f.totalDist);
  if (!p) return;
  const x = p.cooler - f.mid.shift;
  if (x < f.coverage.left - 80 || x > f.coverage.right + 40) return;
  if (p.own) cooler(g, { x }, P);
  g.save();
  g.translate(x + 34, MID_BASE);
  drawOfficeZombie(g, f.t, 'clerk', { ink: P.inkM });
  g.restore();
}

// The clerk's purple-suited colleague in the STAFF CANTEEN (rooms.js), on the far side of the
// two at lunch from the hatch, creeping toward them from the left and never getting there (Peter,
// 15 Oct 2026: "he should be left of the seated workers and moving towards them (but a short
// distance away - he is never too near them)"). x0 is where it starts and x1 where it stops, short
// of their booth, in the canteen's own units; `u` runs 0 to 1 as the canteen comes in at the right
// and leaves at the left, so it is always mid-creep while the canteen is in view. Facing right, the
// crypt's step-and-drag, its feet keeping pace with the floor; it never turns round.
export const CREEP = [0.12, 0.78], CREEP_STRIDE = 7;
export function paintCanteenZombie(g, x0, x1, u, t, ink) {
  const k = Math.max(0, Math.min(1, (u - CREEP[0]) / (CREEP[1] - CREEP[0]))), x = x0 + (x1 - x0) * k;
  g.save();
  g.translate(x, MID_BASE);
  drawOfficeZombie(g, t, 'clerk', { outfit: TEMP_OUTFIT, facing: -1, idle: k <= 0 || k >= 1, phase: (x - x0) / CREEP_STRIDE, ink });
  g.restore();
}

// The usher in an open lift car (car units, before the bank's 1.2: 24.7 to the metre, liftCar.js),
// about 1.85 m to the top of its hat, turned to the call panel on the car's side wall with its
// hand on the buttons, its lantern still lit. The caller paints the panel first.
const PER_M = 24.7, FOOT = 3.4;
export function paintLiftUsher(g, car, t, ink) {
  const h = 1.85 * PER_M, sc = h / zombieHeightOf('usher', ZOMBIE_SHAPE);
  const handX = 39 * sc * ZOMBIE_SHAPE.slim;
  g.save();
  g.translate(car.x + car.w - 2.5 - handX - 0.6, car.y + car.h - FOOT);
  drawOfficeZombie(g, t, 'usher', { h, facing: -1, ink });
  g.restore();
}

// EMPLOYEE OF THE MONTH: the clerk, three months running — the three before this one by the real
// calendar — framed in gold on its own wall bay. A still: baked once per month and scale.
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export const lastThreeMonths = (now = new Date()) => [3, 2, 1].map((k) => MONTHS[(now.getMonth() - k + 12) % 12]);
const BOARD = { w: 92, h: 66 };
const BOARD_BAKED = new Map();
function boardCanvas(P, k) {
  const months = lastThreeMonths(), key = `${months.join()}@${k}`;
  let cv = BOARD_BAKED.get(key);
  if (cv) return cv;
  if (BOARD_BAKED.size > 3) BOARD_BAKED.clear();
  cv = canvas(Math.ceil((BOARD.w + 4) * k), Math.ceil((BOARD.h + 4) * k));
  const g = cv.getContext('2d');
  g.scale(k, k);
  g.translate(2 + BOARD.w / 2, 2);
  paintBoard(g, P.inkM, months);
  BOARD_BAKED.set(key, cv);
  return cv;
}
// the board with its top centre at the origin
function paintBoard(g, ink, months) {
  rbox(g, -46, 0, 92, 11, 1.2, '#2b2836', ink, 0.45);
  letters(g, 'EMPLOYEE OF THE MONTH', 0, 7.6, 4.4, { ink: '#f6df4a', lw: 0.55, align: 'center', track: 0.3 });
  months.forEach((month, k) => {
    const x = -44 + k * 30, y = 15, w = 28, h = 36;
    box(g, x + 0.8, y + 1, w, h, 'rgba(30,20,40,0.18)');
    box(g, x, y, w, h, '#d9b45a', ink, 0.5);
    box(g, x + 1.8, y + 1.8, w - 3.6, h - 9, '#a9c4f0');
    g.save();
    g.beginPath(); g.rect(x + 1.8, y + 1.8, w - 3.6, h - 9); g.clip();
    // the clerk's head as the crypt draws it (about (6, -89) once its feet are at 0), centred
    // in the picture: a portrait, so the crypt's own proportions
    const hh = 44, sc = hh / AUTHORED.clerk;
    g.translate(x + w / 2 - 6 * sc - 0.6, y + 10.4 + 89 * sc);
    drawOfficeZombie(g, 2.4, 'clerk', { shape: { h: hh }, ink });
    g.restore();
    box(g, x + 2.4, y + h - 6.4, w - 4.8, 4.6, '#f6f0dc', ink, 0.25);
    letters(g, month, x + w / 2, y + h - 2.6, 2.8, { ink: '#2a2433', lw: 0.4, align: 'center', track: 0.25 });
  });
}
// On its own stretch of wall (progression.js paints the 'monthBoard' place through this), its top
// centre at (cx, top), baked at the density it lands on screen.
// It hangs a quarter larger than its drawing: the wall is its own, and it is the one thing on it.
const BOARD_SCALE = 1.25;
export function paintMonthBoard(g, cx, top, P) {
  const m = g.getTransform(), k = Math.max(1, Math.ceil(Math.hypot(m.a, m.b) * BOARD_SCALE * 2) / 2);
  const cv = boardCanvas(P, k), s = BOARD_SCALE / k;
  g.drawImage(cv, cx - (BOARD.w / 2 + 2) * BOARD_SCALE, top - 2 * BOARD_SCALE, cv.width * s, cv.height * s);
}
