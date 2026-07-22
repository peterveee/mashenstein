// The wall behind the cabinets. THE LAST FUNCTIONING FOOD COURT used to be a
// flat #241c30 rectangle from the ceiling to the floor line, which read as
// "dark" rather than as "derelict" — nothing in it said anyone had ever worked
// here. These are candidate dressings for that band: five ways to fill it,
// drawn in the same flat-cartoon vector language as props.js and arcade.js
// (whose helpers this borrows rather than forking).
//
// Every painter is laid out against a BAY — one ceiling-light span of wall,
// 130 wide by the wall's own 150 tall — and takes its placement as fractions of
// that box, so a bay can be drawn at any size and the dressing moves with it.
// Painters are deliberately side-effect free and deterministic: they are called
// every frame, so a Math.random() anywhere here would make the wall crawl.
import { rr, shape, plain, stroke } from './props.js';
import { GENRE_MOTIFS } from './arcade.js';
import { TOON_SPECS, drawToon } from './toons.js';
import { drawText, drawTextCentered, textWidth } from '../engine/sprites.js';

// Who is on the poster for which machine. A cover needs a face — the genre icon
// alone is a pictogram, and three pictograms in a row is signage, not
// advertising. The obvious castings are the joke (the plumber game fronts the
// plumber, the speed game fronts the needlemouse, the blaster game fronts the
// blastbot); the rest are a straight one-per-cabinet spread so no hero fronts
// two machines. Nothing downstream depends on this being canon — an id that is
// not a real toon just falls back to the genre motif.
const CABINET_STAR = {
  plumber: 'lorenzo', speed: 'gnash', neon: 'b33p', frost: 'fernwick',
  crypt: 'grumpos', rhythm: 'mochi', cardboard: 'raymn', office: 'chompo',
  surge: 'gary',
};

// What the poster actually says: the star's name, and a tagline under it. Both
// have to survive being about 30 logical px wide, so the rule is hard — the
// name as it appears on the cast list, and a second line of at most a dozen
// characters. Every one of them is that hero's own running joke filed down to
// a marquee: Fernwick is the HERO OF THYME, Ray M'n is APPENDAGE-OPTIONAL,
// Mochi is EXTRA FULL OF AIR, Gary is LEGALLY DISTINCT. A poster promising
// nothing is just a rectangle; a poster promising BATTERY LOW is a joke.
const POSTER_COPY = {
  plumber: ['LORENZO', 'UNLICENSED'],
  speed: ['GNASH', 'NEEDS A NAP'],
  neon: ['B-33P', 'BATTERY LOW'],
  frost: ['FERNWICK', 'MOSTLY HERB'],
  crypt: ['GRUMPOS', 'DAD OF BOY'],
  rhythm: ['MOCHI', 'ALL AIR'],
  cardboard: ["RAY M'N", 'NO ELBOWS'],
  office: ['MISS CHOMP', 'STILL HUNGRY'],
  surge: ['GARY', 'NOT A COPY'],
};

// Largest scale that fits `str` in `maxW`, capped. textWidth is linear in
// scale, so one measurement at 1 gives the answer outright. `style` has to
// match what the caller will draw in — the marker face is much wider per
// character than the body face, so measuring one and setting the other
// overruns the measure.
function fitScale(str, maxW, cap, style = 'ui') {
  const w = textWidth(String(str), 1, style);
  return Math.min(cap, w > 0 ? maxW / w : cap);
}

// A poster is a still image, so its hero is rendered once and stamped after
// that. Drawing a dozen live toons a frame — three posters a bay, several bays
// on screen — to animate artwork that is nailed to a wall would be paying for
// motion nobody can see. Supersampled so the plate stays clean under the hub's
// zoom, and keyed by size so one cache serves the hub and the gallery.
// Sizes are quantised to a 4px grid before they become a key. Every caller
// stamps the plate into an explicit destination rect, so a plate rendered at
// the next step up is invisible — but without this the tap-to-read zoom, which
// tweens the sheet's width every frame it opens, minted a fresh supersampled
// toon render per frame and kept every one of them forever. A dozen sizes is a
// cache; a continuum is a leak.
const STAR_PLATES = new Map();
function starPlate(id, w, h) {
  const q = (v) => Math.max(4, Math.round(v / 4) * 4);
  w = q(w); h = q(h);
  const key = `${id}|${w}x${h}`;
  if (STAR_PLATES.has(key)) return STAR_PLATES.get(key);
  let plate = null;
  try {
    if (typeof document !== 'undefined' && TOON_SPECS[id] && w > 0 && h > 0) {
      const S = 3;
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(w * S));
      cv.height = Math.max(1, Math.round(h * S));
      const cx = cv.getContext('2d');
      if (cx && cx.save) {
        cx.scale(S, S);
        drawToon(cx, id, {
          kind: 'idle', phase: 0, time: 0, grounded: true, facing: 1,
          vy: 0, squash: 0, lean: 0,
        }, w / 2, h, h * 0.94);
        plate = cv;
      }
    }
  } catch { plate = null; } // headless/stubbed canvas: fall back to the motif
  STAR_PLATES.set(key, plate);
  return plate;
}

// Perceptual-ish brightness, for deciding whether artwork printed on a given
// paper wants dark ink or light. Cabinet bodies run from near-black to pale, so
// a fixed choice would lose the illustration on half the concourse.
function luma(c) {
  const s = String(c).replace('#', '');
  const n = parseInt(s.length === 3 ? s.split('').map((k) => k + k).join('') : s, 16);
  return (((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) / 255;
}

// The wall band, mirroring hub/index.js' HUB_WALL_Y0/HUB_WALL_Y1: ceiling at
// 40, skirting at 210. Kept in step with the hub by hand — the gallery has to
// frame these at the height the concourse actually gives them or the mockups lie
// about fit.
//
// BAY_W is the width one dressing is laid out against, and nothing more. It was
// also "one ceiling-light span", back when the hub spaced its fixtures every 130
// to match; the hub now hangs them off its own furniture (see ceilingFixtures)
// and the two numbers have no relationship left.
export const WALL_Y0 = 40, WALL_Y1 = 210, WALL_H = WALL_Y1 - WALL_Y0;
export const BAY_W = 130;

// The hub's own wall colours, so a dressed bay sits on exactly the surface the
// concourse already paints rather than a lookalike.
export const WALL_BASE = '#241c30';
export const WALL_TRIM = '#38304a';
const INK = '#100c18';
// The marker somebody has been correcting this place with. One pen, two values:
// the bright one for the dark surfaces it is usually written on (the menu's
// backlit panel), the deep one for anything printed on pale stock — a teal that
// reads beautifully on a black lightbox is invisible on a cream grade card.
const MARKER_INK = '#48e0c8';
const MARKER_INK_DARK = '#0f6f66';

// Outline unit: props.js scales its black line as 0.055 * max(w,h), tuned for
// 13px obstacles. A 130px bay would come out with a 7px border, so — as
// arcade.js does — these pass their own unit to keep the line at about 0.7px.
const olU = (w) => Math.max(10, w * 0.5);

// A small stable number per (seed, index). Bays need to differ from each other
// without differing between frames, so every wobble in here is a lookup rather
// than a roll.
function rnd(seed, i) {
  const n = Math.sin((seed + 1) * 12.9898 + i * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

// ---------------------------------------------------------------- lighting
// The reveal: how lit the wall is at a given x, given which ceiling lights are
// working. Falls off with distance from the nearest LIT fixture, so walking
// from a powered bay into a dead one dims the wall — and everything painted on
// it — instead of flipping a switch. Returns 0..1.
//
// This is the piece that makes the dressings worth drawing: detail is painted
// once and the light decides how much of it you get to see.
export function wallLitAt(x, litCount, spacing = BAY_W, reach = spacing * 1.15) {
  const xs = [];
  for (let i = 0; i < litCount; i++) xs.push(i * spacing + spacing / 2);
  return wallLitFrom(x, xs, reach);
}

// The same falloff against fixtures whose positions are known outright. The hub
// hands over the screen x of each of its ceiling fixtures rather than deriving
// them from an index, because what is over your head depends on which stretch of
// concourse you are looking at.
//
// A fixture is either a bare number (fully lit) or `{ x, k }`, where k is 0..1.
// The fractional form is what lets the service end sit at a dim baseline and
// come up with your plug count instead of being on or off — a partly-powered
// room is the whole premise, and the flat list could only ever say "on".
//
// `reach` runs well past one bay on purpose. At 1.15 a fixture lit its own bay
// and quit, so adjacent pools met at a visible trough and the concourse read as
// a row of stage spotlights. Overlapping them is what a ceiling of strip lights
// actually does: the pools blend, the dead stretches are the ones genuinely far
// from any working tube, and the falloff is something you notice having crossed
// rather than something you can point at.
export function wallLitFrom(x, positions, reach = BAY_W * 1.55) {
  if (!positions || !positions.length) return 0;
  let best = 0;
  for (const p of positions) {
    const px = typeof p === 'number' ? p : p.x;
    const k = typeof p === 'number' ? 1 : (p.k ?? 1);
    if (k <= 0) continue;
    const d = Math.abs(x - px);
    if (d >= reach) continue;
    // Smoothstep the falloff — a linear ramp reads as a hard cone edge. Scaled
    // by the fixture's own level, so a dim tube throws a dim pool rather than a
    // smaller one: brightness falls off, the cone does not shrink.
    const t = 1 - d / reach;
    best = Math.max(best, k * t * t * (3 - 2 * t));
  }
  return best;
}

// Darken a region to `amount` of full brightness (1 = fully lit). Drawn OVER
// the art rather than baked into its colours, which is what lets one painter
// serve both a powered bay and a dead one — and what lets the same pass darken
// the cabinets and cast standing in front of the wall, so the whole concourse
// dims together instead of the wall dimming behind lit furniture.
//
// `amount` may be a number (flat) or a function of x (a falloff). Sampling the
// function into a gradient keeps the ramp smooth across a bay boundary: shading
// each bay by its own centre value banded visibly at the seams.
export function shadeWall(ctx, x, y, w, h, amount) {
  const alphaAt = (amt) => Math.max(0, Math.min(1, 1 - amt)) * 0.88;
  ctx.save();
  if (typeof amount === 'function') {
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    const STOPS = 24;
    for (let i = 0; i <= STOPS; i++) {
      const s = i / STOPS;
      g.addColorStop(s, `rgba(11,8,18,${alphaAt(amount(x + w * s)).toFixed(3)})`);
    }
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  } else {
    const a = alphaAt(amount);
    if (a > 0.001) {
      ctx.globalAlpha = a;
      ctx.fillStyle = '#0b0812';
      ctx.fillRect(x, y, w, h);
    }
  }
  ctx.restore();
}

// The undressed wall: flat panel, a scuffed skirting band along the floor line.
// Every dressing paints on top of this.
export function drawWallBase(ctx, x, y, w, h) {
  plain(ctx, WALL_BASE, (c) => c.rect(x, y, w, h));
  // Faint vertical seams — plasterboard joins. Enough to stop a big flat fill
  // from reading as a void, not enough to become a pattern.
  ctx.save();
  ctx.globalAlpha = 0.35;
  for (let i = 1; i < 3; i++) {
    stroke(ctx, '#2b2338', Math.max(0.5, w * 0.006), (c) => {
      const sx = Math.round(x + (w * i) / 3);
      c.moveTo(sx, y); c.lineTo(sx, y + h);
    });
  }
  ctx.restore();
  plain(ctx, WALL_TRIM, (c) => c.rect(x, y + h - h * 0.045, w, h * 0.045));
}

// ============================================================== 1. conduit
// Exposed wiring and a breaker box: the in-fiction reason the lights flicker.
// The cord feeding the room is stapled to the wall in plain sight, half of it
// hanging loose, and the box it lands in has its door open and one breaker
// already thrown.
function paintConduit(ctx, x, y, w, h, o) {
  const X = (f) => x + w * f, Y = (f) => y + h * f;
  const u = olU(w);
  const boxX = X(0.60), boxY = Y(0.20), boxW = w * 0.24, boxH = h * 0.20;

  // Main conduit run, stapled across the wall under the ceiling.
  shape(ctx, '#3a3446', u, (c) => rr(c, X(0.02), Y(0.075), w * 0.96, h * 0.035, h * 0.017));
  plain(ctx, '#4c455e', (c) => c.rect(X(0.02), Y(0.082), w * 0.96, h * 0.010));
  for (const f of [0.12, 0.38, 0.86]) {
    plain(ctx, '#2a2438', (c) => c.rect(X(f), Y(0.066), w * 0.028, h * 0.055));
  }

  // Drop into the breaker box.
  shape(ctx, '#3a3446', u, (c) => rr(c, boxX + boxW * 0.42, Y(0.10), w * 0.035, boxY - Y(0.10) + 2, w * 0.016));

  // The box: body, open door hinged to the left, dark interior.
  shape(ctx, '#4a4358', u, (c) => rr(c, boxX, boxY, boxW, boxH, w * 0.012));
  plain(ctx, '#15111f', (c) => c.rect(boxX + boxW * 0.10, boxY + boxH * 0.12, boxW * 0.80, boxH * 0.76));
  // Breaker switches — one thrown, and it is the red one.
  for (let i = 0; i < 3; i++) {
    const by = boxY + boxH * (0.22 + i * 0.24);
    const thrown = i === 1;
    plain(ctx, thrown ? '#e04848' : '#c8c8d8',
      (c) => c.rect(boxX + boxW * (thrown ? 0.46 : 0.20), by, boxW * 0.30, boxH * 0.15));
  }
  // Door, swung open to the left and catching a little light on its inside face.
  ctx.save();
  ctx.globalAlpha = 0.95;
  shape(ctx, '#565070', u, (c) => {
    c.moveTo(boxX, boxY);
    c.lineTo(boxX - boxW * 0.42, boxY + boxH * 0.16);
    c.lineTo(boxX - boxW * 0.42, boxY + boxH * 0.90);
    c.lineTo(boxX, boxY + boxH);
    c.closePath();
  });
  ctx.restore();

  // Loose wires drooping out of the box and away along the wall. Catenaries,
  // because a straight line reads as installed and a sagging one reads as loose.
  const wires = [['#c8503c', 0.30], ['#f6d33c', 0.40], ['#48c0e0', 0.34]];
  wires.forEach(([col, sag], i) => {
    const x0 = boxX + boxW * 0.12, y0 = boxY + boxH * 0.92;
    const x1 = X(0.06 + i * 0.05), y1 = Y(0.42 + i * 0.10);
    stroke(ctx, col, Math.max(0.6, w * 0.012), (c) => {
      c.moveTo(x0, y0);
      c.quadraticCurveTo((x0 + x1) / 2, y0 + h * sag, x1, y1);
    });
    // Stripped copper end.
    plain(ctx, '#e8b45a', (c) => c.arc(x1, y1, Math.max(0.7, w * 0.014), 0, Math.PI * 2));
  });

  // A wire nut still capping one lead, left dangling.
  plain(ctx, '#e8863c', (c) => rr(c, X(0.30), Y(0.50), w * 0.035, h * 0.030, w * 0.012));
}

// ============================================================ 2. water damage
// Nobody has fixed the roof. Stains bloom out of the ceiling line, the
// plasterboard has cracked under them, and one patch has given up and peeled,
// showing the dark cavity behind. A bucket sits under the worst of it.
function paintDecay(ctx, x, y, w, h, o) {
  const X = (f) => x + w * f, Y = (f) => y + h * f;
  const u = olU(w);

  // Stains: concentric irregular blooms, darkest at the centre. The edge is a
  // sum of two out-of-phase sinusoids rather than per-vertex noise — noise at
  // this vertex count came out as a visible polygon, where harmonics give the
  // continuous tide-mark wobble a spreading damp patch actually has.
  const blot = (cx, cy, r, seed) => {
    const p1 = rnd(seed, 1) * Math.PI * 2, p2 = rnd(seed, 2) * Math.PI * 2;
    const k1 = 3 + Math.floor(rnd(seed, 3) * 2), k2 = 5 + Math.floor(rnd(seed, 4) * 3);
    for (let ring = 0; ring < 3; ring++) {
      const rr2 = r * (1 - ring * 0.26);
      ctx.beginPath();
      const steps = 44;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const wob = 1 + 0.16 * Math.sin(a * k1 + p1) + 0.09 * Math.sin(a * k2 + p2);
        const px = cx + Math.cos(a) * rr2 * wob;
        const py = cy + Math.sin(a) * rr2 * wob * 0.72;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = ['rgba(128,96,58,0.16)', 'rgba(120,88,52,0.18)', 'rgba(96,70,42,0.20)'][ring];
      ctx.fill();
    }
  };
  blot(X(0.30), Y(0.10), w * 0.30, o.seed + 1);
  blot(X(0.78), Y(0.06), w * 0.20, o.seed + 7);

  // Cracks spidering down out of the wet patch.
  const crack = (x0, y0, len, dir, seed) => {
    stroke(ctx, '#181322', Math.max(0.5, w * 0.008), (c) => {
      c.moveTo(x0, y0);
      let cx = x0, cy = y0;
      for (let i = 0; i < 5; i++) {
        cx += (rnd(seed, i) - 0.5) * w * 0.09 + dir * w * 0.012;
        cy += len / 5;
        c.lineTo(cx, cy);
      }
    });
  };
  crack(X(0.26), Y(0.16), h * 0.30, 1, o.seed + 3);
  crack(X(0.38), Y(0.13), h * 0.20, -1, o.seed + 11);
  crack(X(0.80), Y(0.12), h * 0.16, 1, o.seed + 5);

  // A sheet of plasterboard that has let go: dark cavity, with the peeled
  // corner curling off it, paler on its back face. The cavity is torn rather
  // than rectangular — a clean rect read as a doorway, not as damage.
  const px0 = X(0.52), py0 = Y(0.22), pw = w * 0.18, ph = h * 0.17;
  plain(ctx, '#0e0a16', (c) => {
    c.moveTo(px0 + pw * 0.06, py0 + ph * 0.10);
    c.lineTo(px0 + pw * 0.55, py0);
    c.lineTo(px0 + pw, py0 + ph * 0.16);
    c.lineTo(px0 + pw * 0.88, py0 + ph * 0.66);
    c.lineTo(px0 + pw * 0.96, py0 + ph);
    c.lineTo(px0 + pw * 0.34, py0 + ph * 0.92);
    c.lineTo(px0, py0 + ph * 0.52);
    c.closePath();
  });
  // A batten showing through the hole — the only thing back there.
  plain(ctx, '#241a2c', (c) => c.rect(px0 + pw * 0.40, py0 + ph * 0.04, pw * 0.13, ph * 0.90));
  plain(ctx, '#2e2740', (c) => {
    c.moveTo(px0 + pw, py0);
    c.lineTo(px0 + pw * 1.42, py0 + ph * 0.30);
    c.lineTo(px0 + pw * 1.10, py0 + ph * 0.86);
    c.lineTo(px0 + pw, py0 + ph * 0.52);
    c.closePath();
  });

  // The drip, and what someone put under it. The droplet rides the hub's own
  // clock so the bucket is clearly still being earned.
  const dripT = (o.t * 0.55) % 1;
  plain(ctx, '#7fd8e8', (c) => {
    const dy = Y(0.20) + dripT * h * 0.52;
    c.ellipse(X(0.305), dy, w * 0.012, h * 0.016, 0, 0, Math.PI * 2);
  });
  const bkX = X(0.24), bkY = Y(0.80), bkW = w * 0.13, bkH = h * 0.10;
  shape(ctx, '#3f4a58', u, (c) => {
    c.moveTo(bkX, bkY);
    c.lineTo(bkX + bkW, bkY);
    c.lineTo(bkX + bkW * 0.84, bkY + bkH);
    c.lineTo(bkX + bkW * 0.16, bkY + bkH);
    c.closePath();
  });
  plain(ctx, '#2a4a52', (c) => c.rect(bkX + bkW * 0.08, bkY + bkH * 0.18, bkW * 0.84, bkH * 0.22));
}

// ============================================================== 3. posters
// One sheet of promo art for one machine. Exported on its own because the hub
// hangs these per CABINET rather than per bay: three-to-a-bay tiled down the
// wall read as wallpaper, and the whole point of a poster is that it belongs to
// the machine underneath it. Draws from `cx` (the sheet's horizontal centre, so
// callers can line it up with a cabinet) down from `topY`.
export function drawPoster(ctx, cx, topY, pw, ph, { pal = {}, tilt = 0, torn = false, lit = 1 } = {}) {
  const u = olU(pw * 3);
  const paper = pal.body || '#5a4a7a';   // the stock, from the cabinet's chassis
  const plate = pal.screen || '#101018'; // art plate: the one value that always contrasts it
  const ink = pal.button || '#f6d33c';   // wordmark — dull on a locked machine, gold on a live one

  ctx.save();
  ctx.translate(cx, topY + ph / 2);
  ctx.rotate(tilt);
  ctx.translate(-pw / 2, -ph / 2);
  // Sheet, with the torn corner cut out of the silhouette itself.
  shape(ctx, paper, u, (c) => {
    c.moveTo(0, 0);
    c.lineTo(pw, 0);
    if (torn) {
      c.lineTo(pw, ph * 0.62);
      c.lineTo(pw * 0.72, ph * 0.78);
      c.lineTo(pw * 0.80, ph);
    } else c.lineTo(pw, ph);
    c.lineTo(0, ph);
    c.closePath();
  });
  // A composition, not a stack of bars. What made this read as "basic" was that
  // every element was the same thing — a flat rectangle on a flat rectangle —
  // with the one piece of artwork printed in a dark ink barely a shade off the
  // paper, so it disappeared. What fixed it was contrast and a subject, not
  // more frame: an art plate a DIFFERENT value from the stock, a face on it,
  // and a wordmark.
  //
  // There WAS a printed margin ruled inside the sheet edge here. Between the
  // sheet's own outline and the art plate's edge that made three nested
  // rectangles inside 40px, which at this size reads as fussy rather than
  // designed — the eye counts borders before it reads the poster. The sheet
  // edge already does that job, so the margin is simply gone.
  // The art plate, in the cabinet's SCREEN colour — the one value in the
  // palette guaranteed to contrast its body. This is what the
  // dark-green-icon-on-green version was missing.
  const ax = pw * 0.09, ay = ph * 0.12, aw = pw * 0.82, ah = ph * 0.50;
  plain(ctx, plate, (c) => c.rect(ax, ay, aw, ah));

  // The star, stamped from a cached plate. Full-colour character art against a
  // flat plate does the heavy lifting: it is the only element with more than
  // one hue in it, so the eye reads it as the subject immediately.
  const star = starPlate(CABINET_STAR[pal.motif], aw * 0.62, ah * 0.94);
  if (star) ctx.drawImage(star, ax + aw * 0.19, ay + ah * 0.06, aw * 0.62, ah * 0.94);
  // The genre motif keeps a place, demoted to a corner badge — a logo ON the
  // artwork rather than instead of it.
  const art = GENRE_MOTIFS[pal.motif];
  if (art) {
    const s = Math.min(aw, ah) * 0.30;
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.translate(ax + aw - s * 1.05, ay + ah - s * 1.05);
    art(ctx, s, s, luma(plate) > 0.42 ? 'rgba(14,10,20,0.75)' : 'rgba(240,238,248,0.72)', plate);
    ctx.restore();
  }

  // The wordmark, in actual type. These were two blank gold bars standing in
  // for a title — which is legible as "a title goes here" and nothing else. The
  // sheet is only ~30px wide, so both lines are scaled to fit their own width
  // rather than set at a fixed size: the name always fills the measure, and the
  // tagline sits under it at a smaller weight, the way a real one-sheet reads.
  const copy = POSTER_COPY[pal.motif];
  if (copy) {
    // The wordmark goes in the display face — a one-sheet's title is set in
    // display type, and it keeps in-world print from reading in the same voice
    // as the HUD. The tagline stays in the body face underneath it, which is
    // the contrast a real poster is built on.
    // Both caps are proportional to the sheet, not fixed in absolute scale
    // units. The hub hangs these 40px wide and the tap-to-read view blows the
    // same sheet up past four times that; with a fixed cap the wordmark came
    // out the same physical size on both, so the big version was a large
    // poster with the wall poster's tiny title still printed on it. Against
    // the sheet's own width, the blown-up read is simply this poster larger —
    // which is the entire point of being able to open one.
    const k = pw / POSTER_W;
    const nameS = fitScale(copy[0], pw * 0.80, 0.62 * k, 'title');
    drawTextCentered(ctx, copy[0], pw * 0.5, ph * 0.665, ink, nameS, 'title');
    const tagS = fitScale(copy[1], pw * 0.76, 0.44 * k);
    drawTextCentered(ctx, copy[1], pw * 0.5, ph * 0.79,
      luma(paper) > 0.42 ? 'rgba(14,10,20,0.62)' : 'rgba(240,238,248,0.60)', tagS);
  }
  // Small print: the one line that stays an unreadable rule, because at this
  // size the legal boilerplate on a poster is unreadable in real life too.
  plain(ctx, luma(paper) > 0.42 ? 'rgba(14,10,20,0.28)' : 'rgba(240,238,248,0.22)',
    (c) => c.rect(pw * 0.24, ph * 0.90, pw * 0.52, ph * 0.028));

  // A fold crease down the sheet — the one line that says "printed, folded into
  // a box, and put up by hand" rather than rendered. Faint: it is texture, and
  // with the printed margin gone it is the only ruled line left on the sheet,
  // so it earns its place only by staying near the threshold of noticing.
  stroke(ctx, 'rgba(255,255,255,0.09)', Math.max(0.3, pw * 0.010),
    (c) => { c.moveTo(pw * 0.62, 0); c.lineTo(pw * 0.58, ph); });
  // Bleached by whatever light still reaches it — but lightly. At 0.14 the wash
  // greyed the stock enough that nine differently-coloured cabinets all
  // advertised on the same beige, which cost the thing the palette was for.
  plain(ctx, 'rgba(232,228,240,0.08)', (c) => c.rect(0, 0, pw, ph));
  // Tape, over the top of the sheet so it reads as holding it up.
  for (const tx of [0.06, 0.78]) {
    plain(ctx, 'rgba(236,236,246,0.30)', (c) => c.rect(pw * tx, -ph * 0.05, pw * 0.16, ph * 0.10));
  }
  // Shaded in the sheet's own rotated space, so the falloff follows the tilt.
  shadeWall(ctx, 0, 0, pw, ph, lit);
  ctx.restore();
}

// How a poster is proportioned against the machine it advertises. Narrower than
// the cabinet so it reads as paper on a wall rather than a second machine.
// Widened from 34x50 once the wordmark became real type: a name has to fit
// across the measure, and 34px could not hold MISS CHOMP at a readable weight.
// Still clearly narrower than the 48-wide cabinet, so it reads as paper on a
// wall rather than a second machine.
export const POSTER_W = 40, POSTER_H = 54;

// Bay dressing form, for the gallery bake-off: one sheet, centred. The hub does
// not use this path — see drawPoster and the per-cabinet loop in hub/index.js.
function paintPosters(ctx, x, y, w, h, o) {
  drawPoster(ctx, x + w * 0.5, y + h * 0.14, POSTER_W, POSTER_H, {
    pal: o.pal || {}, tilt: -0.04, torn: true,
  });
}

// ============================================================ 4. menu board
// The food court's actual menu, still bolted up over a room that has not served
// food in years. Half the items are struck through; what replaced them is
// written in a different hand.
//
// The rows used to be blank bars — legible as "a menu goes here" and nothing
// else, the same failure the posters had before they got real type. What sells
// it is the pricing: plugs are what a REPAIR costs, so every item on this board
// is quietly bidding against your own build, and a board that charges nine of
// them for chips is funny before any single line has to be.
//
// `strike: 'all'` is an item that is gone; `'price'` strikes only the number,
// which is the one correction on the board in a hand that was fixing a price
// rather than deleting a product — somebody was still turning up to work.
const MENU_ROWS = [
  { item: 'CHEEZ SLICE', price: '2 PLUGS' },
  { item: 'HOT DOG', price: '3 PLUGS', strike: 'all', note: 'COLD DOG' },
  { item: 'NACHOS', price: '4 PLUGS', strike: 'all' },
  { item: 'FRIES', price: '1 PLUG', strike: 'price', note: '9 PLUGS', noteOver: 'price' },
  { item: 'WATER', price: 'MARKET PRICE' },
];

// Hand-lettering at two pixels of cap height. Setting the marker FACE and
// stopping there does not work: at the size this board sets its corrections,
// every typeface — marker, script, or the body face in a different colour —
// samples down to the same row of blobs, and the scrawls read as printed text
// that happens to be teal. The face is still worth having (the gallery frames
// these bays several times larger, and it costs one entry in a font request
// that already exists), but what carries the read at hub scale is GEOMETRY,
// because geometry displaces whole pixels where a letterform's wobble does
// not: a baseline that wanders, letters that lean at their own angles and sit
// at their own sizes, and a line that was never level to begin with.
//
// Every offset is a lookup on the shared `rnd`, not a roll — these are painted
// every frame, and handwriting that reshuffles itself sixty times a second is
// not handwriting.
function drawScrawl(ctx, str, x, y, color, s, seed) {
  const chars = String(str);
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === ' ') continue;
    // Start of this glyph: the measure of everything before it, plus the
    // tracking that textWidth trims off its last character.
    const cx = x + (i ? textWidth(chars.slice(0, i), s, 'marker') + s * 0.5 : 0);
    const cw = textWidth(chars[i], s, 'marker');
    ctx.save();
    // Rotate each letter about its own middle, or it swings off the line.
    ctx.translate(cx + cw * 0.5, y + s * 4 + (rnd(seed, i) - 0.5) * s * 1.5);
    ctx.rotate((rnd(seed, i + 40) - 0.5) * 0.26);
    drawText(ctx, chars[i], -cw * 0.5, -s * 4, color, s * (0.92 + rnd(seed, i + 80) * 0.18), 'marker');
    ctx.restore();
  }
}

// A line somebody drew, rather than a rule somebody printed. Overshoots both
// ends, bows in the middle, and does not finish at the height it started —
// which at this size is far more of the read than the strike's colour is.
function handStrike(ctx, x0, x1, y, lw, seed, col = '#e04848') {
  const over = (x1 - x0) * 0.035;
  const a = x0 - over, b = x1 + over;
  const lift = lw * 1.6;
  stroke(ctx, col, lw, (c) => {
    c.moveTo(a, y + (rnd(seed, 1) - 0.5) * lift);
    c.quadraticCurveTo((a + b) / 2, y - lift * 0.55 + (rnd(seed, 2) - 0.5) * lift,
      b, y + (rnd(seed, 3) - 0.5) * lift);
  });
}

// Where the lit panel sits inside its bay. Named because hubWallBays has to
// hang the BOARD over the serving counter, and the board is not centred in its
// own bay — the counter display and the grade card take up the right third.
// Placing the bay by its own centre put the panel half a counter to the left.
const MENU_PANEL_X = 0.06, MENU_PANEL_W = 0.66;
export const MENU_PANEL_CENTRE = MENU_PANEL_X + MENU_PANEL_W / 2;

function paintMenuBoard(ctx, x, y, w, h, o) {
  const X = (f) => x + w * f, Y = (f) => y + h * f;
  const u = olU(w);
  const bx = X(MENU_PANEL_X), by = Y(0.07), bw = w * MENU_PANEL_W, bh = h * 0.50;

  // Housing, with the light box behind the panel still faintly on.
  shape(ctx, '#2a2438', u, (c) => rr(c, bx, by, bw, bh, w * 0.012));
  plain(ctx, '#161022', (c) => c.rect(bx + bw * 0.03, by + bh * 0.06, bw * 0.94, bh * 0.88));
  ctx.save();
  ctx.globalAlpha = 0.18;
  plain(ctx, '#f6d33c', (c) => c.rect(bx + bw * 0.03, by + bh * 0.06, bw * 0.94, bh * 0.88));
  ctx.restore();

  // Header strip. The only true statement on the board, and only because the
  // lightbox behind it still runs warm.
  const hy = by + bh * 0.10, hh = bh * 0.13;
  plain(ctx, '#e04848', (c) => c.rect(bx + bw * 0.06, hy, bw * 0.88, hh));
  // Set in the display face, not the UI face. Signage inside the fiction and
  // the game's own interface reading in the same type flattens the illusion —
  // and this is a headline, which is what a display face is for.
  const hs = fitScale('HOT & FRESH', bw * 0.72, 0.60, 'title');
  drawTextCentered(ctx, 'HOT & FRESH', bx + bw * 0.5, hy + hh * 0.5 - hs * 4.6, '#2c1016', hs, 'title');

  // One type size for the whole board: a menu whose lines are each set to their
  // own measure reads as a ransom note, so the narrowest fit wins and every row
  // is set at it. The 4-space gap is the minimum leader between item and price.
  const colX = bx + bw * 0.07, colR = bx + bw * 0.93;
  let S = 0.5;
  for (const r of MENU_ROWS) S = Math.min(S, fitScale(`${r.item}    ${r.price}`, colR - colX, 0.5));
  // Glyphs are drawn from the top of a cell whose em box starts one unit down
  // (see glyphSprite in engine/sprites.js), so for a line of capitals set at
  // scale S: the cap top lands about 3S below the draw y, the cap bottom about
  // 7.2S, and the middle — where a strike belongs — about 5.1S.
  const capTop = (ry) => ry + S * 3, mid = (ry) => ry + S * 5.1, base = (ry) => ry + S * 7.2;

  MENU_ROWS.forEach((r, i) => {
    const ry = by + bh * (0.29 + i * 0.145);
    const gone = r.strike === 'all';
    const pw = textWidth(r.price, S);
    // Struck items stay legible. Faded to 0.38 they went under the strike rule
    // and the row read as a red line over a smudge — but the joke is in the
    // words, so a deleted item has to be one you can still read.
    drawText(ctx, r.item, colX, ry, gone ? 'rgba(200,200,216,0.58)' : '#c8c8d8', S);
    drawText(ctx, r.price, colR - pw, ry,
      r.strike ? 'rgba(246,211,60,0.58)' : '#f6d33c', S);

    // Dot leader. A menu's rows are bound left-to-right by these; without them
    // the item and the price read as two separate columns of words.
    const d1 = colR - pw - w * 0.014, dot = Math.max(0.3, w * 0.004);
    for (let dx = colX + textWidth(r.item, S) + w * 0.014; dx < d1; dx += w * 0.018) {
      plain(ctx, gone ? 'rgba(200,200,216,0.13)' : 'rgba(200,200,216,0.28)',
        (c) => c.rect(dx, base(ry), dot, dot));
    }

    if (r.strike) {
      const priceOnly = r.strike === 'price';
      handStrike(ctx,
        priceOnly ? colR - pw - w * 0.008 : bx + bw * 0.05,
        priceOnly ? colR + w * 0.008 : bx + bw * 0.95,
        mid(ry), Math.max(0.5, w * 0.007), o.seed + i * 7);
    }
    if (r.note) {
      // The correction, in an actual marker hand, off the baseline and off the
      // level — the three things that separate handwriting from a second print
      // run. Set a little smaller than the print it corrects: Permanent Marker
      // carries far more ink per character than Fredoka, so matching sizes made
      // the scrawl louder than the menu it was annotating.
      const ns = Math.min(S * 0.80, fitScale(r.note, (colR - colX) * 0.5, 0.40, 'marker'));
      const nx = r.noteOver === 'price'
        ? colR - textWidth(r.note, ns, 'marker') : colX + w * 0.02;
      // Sat so the scrawl's own cap bottom clears the printed line's cap top —
      // written in the gap above the row, the way a correction actually is.
      // The whole line leans harder than a typographic tilt would: -0.04 was
      // two degrees, which at eight pixels of word is a rounding error.
      ctx.save();
      ctx.translate(nx, capTop(ry) - h * 0.015 - ns * 7.2);
      ctx.rotate(-0.10);
      drawScrawl(ctx, r.note, 0, 0, MARKER_INK, ns, o.seed + i * 13);
      ctx.restore();
    }
  });

  // The counter display, still counting. Nobody has taken a number in years,
  // which is the only reason it is still accurate.
  const sx = X(0.74), sy = Y(0.10), sw = w * 0.20, sh = h * 0.26;
  shape(ctx, '#1e1a2c', u, (c) => rr(c, sx, sy, sw, sh, w * 0.010));
  const ss = fitScale('SERVING', sw * 0.80, 0.40);
  drawTextCentered(ctx, 'NOW', sx + sw * 0.5, sy + sh * 0.10, 'rgba(200,200,216,0.65)', ss);
  drawTextCentered(ctx, 'SERVING', sx + sw * 0.5, sy + sh * 0.10 + ss * 10, 'rgba(200,200,216,0.65)', ss);
  drawTextCentered(ctx, '0', sx + sw * 0.5, sy + sh * 0.48, '#f6d33c', ss * 2.6);

  // The health grade, hung where a health grade is hung, and re-graded by the
  // same marker that has been fixing the prices.
  const gx = X(0.755), gy = Y(0.42), gw = w * 0.20, gh = h * 0.17;
  shape(ctx, '#ded8c8', u, (c) => rr(c, gx, gy, gw, gh, w * 0.008));
  const gs = fitScale('GRADE', gw * 0.62, 0.32);
  drawTextCentered(ctx, 'GRADE', gx + gw * 0.5, gy + gh * 0.09, 'rgba(20,16,28,0.70)', gs);
  // The printed grade, crossed out, and the one the marker awarded instead —
  // stacked rather than overlaid, because a re-grade written ON the C just
  // reads as a smudge at this size.
  const cs = gs * 3.0, cy = gy + gh * 0.22;
  drawTextCentered(ctx, 'C', gx + gw * 0.5, cy, '#2c2438', cs);
  handStrike(ctx, gx + gw * 0.26, gx + gw * 0.74, cy + cs * 5,
    Math.max(0.4, w * 0.006), o.seed + 3, '#c83c3c');
  const as = Math.min(gs * 1.15, fitScale('A+++', gw * 0.72, 0.4, 'marker'));
  ctx.save();
  ctx.translate(gx + gw * 0.5 - textWidth('A+++', as, 'marker') / 2, gy + gh * 0.74);
  ctx.rotate(-0.13);
  drawScrawl(ctx, 'A+++', 0, 0, MARKER_INK_DARK, as, o.seed + 9);
  ctx.restore();
}

// ========================================================== 5. party decor
// Left over from a promotion nobody remembers. The bunting has come off its
// pin at one end and hangs down the wall; the string lights above it are mostly
// dead bulbs, and the few that work are on the same failing circuit as
// everything else in here.
function paintPartyDecor(ctx, x, y, w, h, o) {
  const X = (f) => x + w * f, Y = (f) => y + h * f;

  // String lights: a catenary of bulbs, most burnt out. The live ones pulse on
  // the room's clock so they read as sharing the ceiling's bad power.
  const lx0 = X(-0.02), lx1 = X(1.02), ly = Y(0.10), sag = h * 0.13;
  stroke(ctx, '#1c1728', Math.max(0.5, w * 0.008), (c) => {
    c.moveTo(lx0, ly);
    c.quadraticCurveTo((lx0 + lx1) / 2, ly + sag * 2, lx1, ly);
  });
  const BULBS = 9;
  for (let i = 0; i <= BULBS; i++) {
    const s = i / BULBS;
    // Point on the quadratic, so the bulbs hang off the wire rather than a line.
    const bx = (1 - s) * (1 - s) * lx0 + 2 * (1 - s) * s * ((lx0 + lx1) / 2) + s * s * lx1;
    const byy = (1 - s) * (1 - s) * ly + 2 * (1 - s) * s * (ly + sag * 2) + s * s * ly;
    const live = rnd(o.seed + 40, i) > 0.62;
    const pulse = live ? 0.55 + 0.45 * Math.sin(o.t * 3 + i * 1.7) : 0;
    if (live) {
      ctx.save();
      ctx.globalAlpha = 0.22 * pulse;
      plain(ctx, '#f6d33c', (c) => c.arc(bx, byy + h * 0.02, w * 0.045, 0, Math.PI * 2));
      ctx.restore();
    }
    plain(ctx, live ? '#f6d33c' : '#3a3446',
      (c) => c.ellipse(bx, byy + h * 0.022, w * 0.014, h * 0.020, 0, 0, Math.PI * 2));
  }

  // Bunting: a swag of triangular flags pinned at the left, and the same swag
  // giving up at the right — the loose end hangs straight down the wall.
  const ax = X(0.04), ay = Y(0.30), mx = X(0.52), my = Y(0.44), cxE = X(0.86), cyE = Y(0.26);
  const flagCols = ['#e04848', '#f6d33c', '#48c0e0', '#48c848', '#f890b8'];
  const swag = (x0, y0, xm, ym, x1, y1, n, startIdx) => {
    stroke(ctx, '#c8c8d8', Math.max(0.4, w * 0.006), (c) => {
      c.moveTo(x0, y0); c.quadraticCurveTo(xm, ym, x1, y1);
    });
    for (let i = 0; i < n; i++) {
      const s = (i + 0.5) / n;
      const fx = (1 - s) * (1 - s) * x0 + 2 * (1 - s) * s * xm + s * s * x1;
      const fy = (1 - s) * (1 - s) * y0 + 2 * (1 - s) * s * ym + s * s * y1;
      const fw = w * 0.045, fh = h * 0.075;
      plain(ctx, flagCols[(startIdx + i) % flagCols.length], (c) => {
        c.moveTo(fx - fw / 2, fy);
        c.lineTo(fx + fw / 2, fy);
        c.lineTo(fx, fy + fh);
        c.closePath();
      });
    }
  };
  swag(ax, ay, mx, my, cxE, cyE, 6, 0);
  // The detached end, hanging plumb.
  swag(cxE, cyE, cxE + w * 0.02, cyE + h * 0.16, cxE - w * 0.01, cyE + h * 0.34, 3, 2);
  // The pin it tore off, still in the wall.
  plain(ctx, '#8a8a98', (c) => c.arc(X(0.90), Y(0.22), w * 0.010, 0, Math.PI * 2));

  // A balloon that did not survive the decade.
  ctx.save();
  ctx.translate(X(0.30), Y(0.66));
  ctx.rotate(0.5);
  plain(ctx, '#7a3450', (c) => c.ellipse(0, 0, w * 0.035, h * 0.030, 0, 0, Math.PI * 2));
  stroke(ctx, '#4a4358', Math.max(0.4, w * 0.005), (c) => {
    c.moveTo(0, h * 0.028); c.quadraticCurveTo(w * 0.03, h * 0.07, w * 0.01, h * 0.11);
  });
  ctx.restore();
}

// ---------------------------------------------------------------- registry
// Ordered as they were pitched. `note` is the one-line case for each, which the
// gallery prints under the tile so the mockups argue for themselves.
export const WALL_DRESSINGS = {
  conduit: {
    name: 'Exposed wiring + breaker box',
    note: 'Says out loud why the lights flicker. One breaker already thrown.',
    paint: paintConduit,
  },
  decay: {
    name: 'Water damage + peeled board',
    note: 'Stains, cracks, a live drip and the bucket under it. Cheap to draw, scales with how dark the bay is.',
    paint: paintDecay,
  },
  posters: {
    name: 'Faded cabinet posters',
    note: 'Takes each cabinet\'s own palette, so nine bays differ for free. Sun-bleached, taped crooked, one torn corner.',
    paint: paintPosters,
  },
  menuboard: {
    name: 'Food court menu board',
    note: 'The literal food court, still advertising — priced in plugs, so lunch bids against your own repairs. Items struck through and re-priced in marker.',
    paint: paintMenuBoard,
    selfLit: 0.42, // backlit: dim in a dead stretch, never invisible
  },
  partydecor: {
    name: 'Leftover party decor',
    note: 'Bunting off its pin, string lights mostly dead. The live bulbs pulse on the same bad power as the ceiling.',
    paint: paintPartyDecor,
  },
};

// What actually hangs where, in hub world x. Posters are NOT in this list: they
// hang one per cabinet (see drawPoster and the station loop in hub/index.js),
// because a poster belongs to a machine, not to a span of wall. What is left
// here is the furniture that belongs to the ROOM — currently the menu board,
// with everything past it left bare, because the far end of the concourse
// should read as the part nobody bothered to decorate.
//
// The board used to hang in the empty plaza between the last cabinet and the
// service doors: the best available answer while the repair bench was still a
// door, and a sign advertising a counter that was not in the room. The counter
// exists now, so the rule is the obvious one.
//
// Derived from the live station list rather than written down as a fixed x —
// the concourse gets re-spaced whenever the furniture changes, and the cabinets
// have already moved from 64 apart to 88 once, which silently dropped a
// hardcoded bay into the middle of the arcade bank.
export function hubWallBays(stations) {
  const bays = [];
  // The board hangs over the SERVING COUNTER, which is the only place a menu
  // board has ever hung. Placed by its own PANEL rather than by its bay: the lit
  // panel occupies only the left two-thirds of a bay (the NOW SERVING readout
  // and the grade card take the rest), so centring the BAY on the counter hung
  // the actual board half a counter to the left of it.
  const counter = stations.find((s) => s.type === 'bench');
  if (counter) {
    bays.push({ x: counter.x - BAY_W * MENU_PANEL_CENTRE, id: 'menuboard' });
    return bays;
  }
  // No counter in the room — older station lists, and the stubs the hub tests
  // build. Falls back to the plaza after the last cabinet, where it used to
  // hang: the next fixture along, whatever it happens to be, with the plaza the
  // gap between the two. With nothing past the machines it hangs just clear of
  // the last one instead.
  const cabs = stations.filter((s) => s.type === 'cabinet');
  if (!cabs.length) return bays;
  const last = cabs[cabs.length - 1];
  const next = stations.find((s) => s.type !== 'cabinet' && s.x > last.x);
  const centre = next ? (last.x + next.x) / 2 : last.x + BAY_W * 0.75;
  bays.push({ x: centre - BAY_W / 2, id: 'menuboard' });
  return bays;
}

// Paint one dressed bay: wall, dressing, then the light falloff over the top.
// `lit` is 0..1 (see wallLitAt); `pal` is a cabinet palette for the dressings
// that colour themselves from the machine in front of them.
export function drawWallBay(ctx, x, y, w, h, id, { t = 0, seed = 0, lit = 1, pal = null, base = true } = {}) {
  const d = WALL_DRESSINGS[id];
  if (base) drawWallBase(ctx, x, y, w, h);
  if (d) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    d.paint(ctx, x, y, w, h, { t, seed, pal });
    ctx.restore();
  }
  // A dressing that carries its own power never goes fully dark, however far it
  // is from a working ceiling light — the menu board is a lightbox, and the one
  // thing still running in an abandoned food court being the menu is the joke.
  const floor = d ? (d.selfLit || 0) : 0;
  shadeWall(ctx, x, y, w, h,
    typeof lit === 'function' ? (lx) => Math.max(floor, lit(lx)) : Math.max(floor, lit));
}
