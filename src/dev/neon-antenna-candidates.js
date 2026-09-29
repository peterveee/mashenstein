// TERMINAL VELOCITY — better rooftop antennas (BAKE-OFF, not wired into the game).
// Peter, 29 Sep 2026: "bakeoff. better antennas in terminal velocity buildings".
//
// What ships: a tower taller than 78% of its row's roof range gets one 13px tube off
// the middle of its roof and a 2px lamp on top, blinking on its own clock; every other
// roof is bare. Each candidate below is a painter for neonWireRow's `antenna` seam
// (context.neonAntenna = { middle, near }), which owns EVERY roof in the row — so a
// candidate can dress the short towers too, not only the tall ones.
//
// The painter is handed the tower (x, top, bw, h against the row's minH..maxH), its
// ink, the row's stroke and glow, the clock, and the pack's own tube and hash, so
// everything is drawn as the city's neon: a wide faint stroke for the light and a thin
// bright one for the glass. ctx.globalAlpha arrives set to the row's alpha (the middle
// row is dimmed to 0.46) and every mark here multiplies it, never replaces it.

const LAMP_RED = '#ff3b4e';
const WHITE = '#fff0f8';

// Where in its row's range a tower's roof is: 0 the shortest, 1 the tallest.
const tallness = (a) => (a.h - a.minH) / Math.max(1, a.maxH - a.minH);
// A tower's own noise, stable for as long as it is on screen — per building along
// the street (the row's repeat, `block`), not per slot, so the pattern does not
// come round again every screen.
const r = (a, k) => a.hash(a.seed * 31 + a.i * 7 + a.block * 101 + k);

// AN AVIATION LAMP: a hot core and a soft bloom, on or dim. `on` is 0..1.
// Both are discs on the pole's own centre (`x` is a px() centre, n + 0.5). A 2px
// square cannot be centred on a 1px pole: it lands half a pixel to one side.
function lamp(ctx, x, y, on, color = LAMP_RED, size = 1) {
  const A = ctx.globalAlpha;
  ctx.fillStyle = color;
  ctx.globalAlpha = A * (0.18 + 0.82 * on);
  ctx.beginPath(); ctx.arc(x, y, 1.2 * size, 0, Math.PI * 2); ctx.fill();
  if (on > 0) {
    ctx.globalAlpha = A * on * 0.28;
    ctx.beginPath(); ctx.arc(x, y, 3.5 * size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = A;
}
// Each tower's own blink, as the shipped one: out of step with its neighbours.
const ownBlink = (a, k = 0) => (Math.sin(a.t * 2.2 + a.i + k) > 0 ? 1 : 0);
// TOKYO'S RED LIGHTS: the rooftop aviation lamps across the skyline flash together,
// a slow on and a long dark — the thing a night view of Shinjuku is remembered by.
const syncBlink = (t, k = 0) => {
  const u = ((t + k) % 1.7) / 1.7;
  return u < 0.3 ? Math.sin((u / 0.3) * Math.PI) : 0;
};
const px = (v) => Math.round(v) + 0.5;

// ------------------------------------------------------------ the shipped mast
// As neonWireRow paints it, lamp centred on the pole.
function shippedMast(ctx, a) {
  if (a.h <= a.maxH * 0.78) return;
  const cx = Math.floor(a.x + a.bw / 2) + 0.5;
  a.tube(ctx, a.ink, a.stroke, a.glow * 0.6, (c) => { c.moveTo(cx, a.top + 0.5); c.lineTo(cx, a.top - 12.5); });
  const A = ctx.globalAlpha;
  ctx.globalAlpha = A * (ownBlink(a) ? 1 : 0.2);
  ctx.fillStyle = a.lamp;
  ctx.beginPath(); ctx.arc(cx, a.top - 14, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = A;
}

// ------------------------------------------------------------ A: lattice mast
// A tapering steel truss standing on the roof: two legs converging, a zig-zag of
// bracing between them, a needle out of the top. The Tokyo Tower's language at the
// scale of a rooftop, so the landmark and the city read as one place.
function latticeMast(ctx, a, { height = 22, lampOn = ownBlink(a) } = {}) {
  const cx = px(a.x + a.bw / 2 + (r(a, 1) - 0.5) * a.bw * 0.3);
  const base = a.top;
  const half = Math.max(2.5, Math.min(5, a.bw * 0.12));
  const trussTop = base - height * 0.72;
  const tip = base - height;
  const at = (y) => half * (y - trussTop) / (base - trussTop) + 0.6;
  a.tube(ctx, a.ink, a.stroke, a.glow * 0.7, (c) => {
    c.moveTo(cx - half, base); c.lineTo(cx - 0.6, trussTop);
    c.moveTo(cx + half, base); c.lineTo(cx + 0.6, trussTop);
    c.moveTo(cx, trussTop); c.lineTo(cx, tip);
  });
  const A = ctx.globalAlpha;
  ctx.globalAlpha = A * 0.7;
  a.tube(ctx, a.ink, a.stroke * 0.55, 0, (c) => {
    let side = -1;
    c.moveTo(cx - at(base), base);
    for (let y = base - 3; y > trussTop + 1; y -= 3) { c.lineTo(cx + side * at(y), y); side = -side; }
  });
  ctx.globalAlpha = A;
  lamp(ctx, cx, tip - 1, lampOn);
  lamp(ctx, cx, trussTop, lampOn ? 0 : 0.6, '#ffb347', 0.7);
}
function candA(ctx, a) {
  const k = tallness(a);
  if (k < 0.6) return;
  latticeMast(ctx, a, { height: 14 + k * 12 });
}

// ------------------------------------------------------------ B: stepped spire
// The Shinjuku skyscraper crown: the roof steps back twice before a needle. Adds mass
// at the top of the tall towers, so the skyline gets silhouettes, not just sticks.
function steppedCrown(ctx, a, { needle = 12, steps = 2, lampOn = ownBlink(a) } = {}) {
  // Every step an EVEN width about one pixel centre, so the needle stands dead
  // in the middle of each and its lamp on the needle.
  const cx = Math.floor(a.x + a.bw / 2) + 0.5;
  let y = Math.round(a.top) + 0.5;
  let w = a.bw;
  for (let s = 0; s < steps; s++) {
    w = Math.max(4, 2 * Math.round(w * 0.29));
    const hh = 4 + s;
    a.tube(ctx, a.ink, a.stroke, a.glow * 0.7, (c) => c.rect(cx - w / 2, y - hh, w, hh));
    y -= hh;
  }
  if (needle <= 0) return y;
  a.tube(ctx, a.ink, a.stroke * 0.9, a.glow * 0.6, (c) => { c.moveTo(cx, y); c.lineTo(cx, y - needle); });
  lamp(ctx, cx, y - needle - 1, lampOn);
  return y;
}
function candB(ctx, a) {
  const k = tallness(a);
  if (k >= 0.72) steppedCrown(ctx, a, { needle: 8 + k * 8, steps: 2 });
  else if (k >= 0.4) steppedCrown(ctx, a, { needle: 0, steps: 1, lampOn: 0 });
}

// ------------------------------------------------------------ C: aerial farm
// Rooftop clutter, on most roofs: whips of different heights, a TV aerial with its
// crossbars, a dish on its side. What a real city's roofline is covered in, and it
// makes every building look lived-in instead of only the tall ones.
function whip(ctx, a, x, h, lampOn) {
  a.tube(ctx, a.ink, a.stroke * 0.7, a.glow * 0.5, (c) => { c.moveTo(px(x), a.top); c.lineTo(px(x), a.top - h); });
  if (lampOn != null) lamp(ctx, px(x), a.top - h - 1, lampOn, LAMP_RED, 0.8);
}
function yagi(ctx, a, x, h) {
  a.tube(ctx, a.ink, a.stroke * 0.7, a.glow * 0.5, (c) => {
    c.moveTo(px(x), a.top); c.lineTo(px(x), a.top - h);
    for (let k = 0; k < 3; k++) {
      const y = px(a.top - h + 1 + k * 2.5);
      const w = 4 - k;
      c.moveTo(px(x) - w, y); c.lineTo(px(x) + w, y);
    }
  });
}
function dish(ctx, a, x, s = 3.5) {
  a.tube(ctx, a.ink, a.stroke * 0.7, a.glow * 0.5, (c) => {
    c.moveTo(x, a.top); c.lineTo(x, a.top - s);
    c.moveTo(x - s * 0.7, a.top - s * 2.1);
    c.quadraticCurveTo(x + s * 0.8, a.top - s * 1.4, x + s * 0.2, a.top - s * 0.3);
    c.closePath();
  });
}
function aerialFarm(ctx, a, k, sync = null) {
  const inset = 3;
  const span = a.bw - inset * 2;
  // One piece per 10px of roof at most: packed tighter, a TV aerial and a dish
  // tangle into one mark that reads as a kana.
  const n = Math.max(1, Math.min(1 + Math.round(k * 2), Math.floor(span / 10)));
  for (let j = 0; j < n; j++) {
    const x = a.x + inset + span * ((j + 0.3 + r(a, 10 + j) * 0.4) / n);
    const h = 5 + Math.round((0.3 + r(a, 20 + j) * 0.7) * (6 + k * 14));
    const kind = r(a, 30 + j);
    if (kind < 0.3 && h < 14) yagi(ctx, a, x, h);
    else if (kind < 0.45 && j > 0) dish(ctx, a, x);
    else whip(ctx, a, x, h, j === 0 && k > 0.6 ? (sync ? syncBlink(a.t) : ownBlink(a, j)) : null);
  }
}
function candC(ctx, a) {
  const k = tallness(a);
  if (k < 0.25) return;
  aerialFarm(ctx, a, k);
}

// ------------------------------------------------------------ D: guyed mast
// A tall, thin broadcast mast held up by guy wires to the roof corners, with a pair
// of crossarms carrying cellular panels. Two lamps, top and middle, blinking
// alternately. The tallest in the bake-off: one strong vertical per tall tower.
function guyedMast(ctx, a, { height = 26, lampOn = null } = {}) {
  const cx = px(a.x + a.bw / 2);
  const tip = a.top - height;
  const mid = a.top - height * 0.55;
  const A = ctx.globalAlpha;
  ctx.globalAlpha = A * 0.45;
  a.tube(ctx, a.ink, a.stroke * 0.5, 0, (c) => {
    c.moveTo(a.x + 1.5, a.top); c.lineTo(cx, mid);
    c.moveTo(a.x + a.bw - 1.5, a.top); c.lineTo(cx, mid);
    c.moveTo(a.x + a.bw * 0.25, a.top); c.lineTo(cx, tip + height * 0.15);
    c.moveTo(a.x + a.bw * 0.75, a.top); c.lineTo(cx, tip + height * 0.15);
  });
  ctx.globalAlpha = A;
  a.tube(ctx, a.ink, a.stroke * 0.8, a.glow * 0.6, (c) => {
    c.moveTo(cx, a.top); c.lineTo(cx, tip);
    for (const y of [tip + 4, tip + 8]) { c.moveTo(cx - 3.5, px(y)); c.lineTo(cx + 3.5, px(y)); }
  });
  ctx.fillStyle = WHITE;
  ctx.globalAlpha = A * 0.8;
  for (const y of [tip + 4, tip + 8]) for (const dx of [-3.5, 3.5]) ctx.fillRect(Math.round(cx + dx - 0.5), Math.round(y) - 1, 1, 3);
  ctx.globalAlpha = A;
  const on = lampOn ?? ownBlink(a);
  lamp(ctx, cx, tip - 1, on);
  lamp(ctx, cx, mid, 1 - on, LAMP_RED, 0.8);
}
function candD(ctx, a) {
  const k = tallness(a);
  if (k < 0.7) return;
  guyedMast(ctx, a, { height: 18 + k * 12 });
}

// ------------------------------------------------------------ E: a mixed skyline
// Every tall tower picks its own crown off its hash — a truss, a stepped spire, a
// guyed mast — and the rest of the roofs get a little aerial clutter. The variety is
// the point: a skyline where no two tall towers wear the same hat.
function mixed(ctx, a, sync) {
  const k = tallness(a);
  const on = sync ? syncBlink(a.t) : ownBlink(a);
  if (k >= 0.7) {
    const pick = r(a, 50);
    if (pick < 0.34) latticeMast(ctx, a, { height: 14 + k * 12, lampOn: on });
    else if (pick < 0.67) steppedCrown(ctx, a, { needle: 8 + k * 8, steps: 2, lampOn: on });
    else guyedMast(ctx, a, { height: 18 + k * 12, lampOn: on });
  } else if (k >= 0.3) {
    aerialFarm(ctx, a, k * 0.7, sync);
  }
  // Tokyo puts a red lamp on the corners of every tall roof, not only on the mast.
  if (sync && k >= 0.55) {
    const on2 = syncBlink(a.t);
    lamp(ctx, a.x + 1.5, a.top - 1, on2, LAMP_RED, 0.7);
    lamp(ctx, a.x + a.bw - 0.5, a.top - 1, on2, LAMP_RED, 0.7);
  }
}
const candE = (ctx, a) => mixed(ctx, a, false);

// ------------------------------------------------------------ F: E + Tokyo's red lights
// E's skyline, with the aviation lamps doing what Tokyo's do: every one in the city
// flashes together — slow, soft on, long dark — and the tall roofs carry them on
// their corners too, so the skyline pulses as one.
const candF = (ctx, a) => mixed(ctx, a, true);

// ------------------------------------------------------------ G: 0 + B + C
// SHIPPED 29 Sep 2026 at 1 in 3 and 1 in 5 ("do 1 in 3 for b and 1 in 5 for C... ship it"):
// see neonRoofPlan / neonRoofKit in stylePacks/index.js. This card keeps the 1-in-4 round.
// Peter, 29 Sep 2026: "a mix of 0 and B and C. say 1 in 4 have B and 1 in 6 have C".
// Each building draws its lot off its own hash: a quarter wear B's stepped crown, a
// sixth C's aerial clutter, and the rest are the shipped roof (the lone mast on the
// tallest, bare below). B and C keep their own height rules, so a short building
// that draws either stays bare, as it would have anyway.
function candG(ctx, a) {
  const u = r(a, 70);
  if (u < 1 / 4) {
    const k = tallness(a);
    if (k >= 0.72) steppedCrown(ctx, a, { needle: 8 + k * 8, steps: 2 });
    else if (k >= 0.4) steppedCrown(ctx, a, { needle: 0, steps: 1, lampOn: 0 });
    else shippedMast(ctx, a);
  } else if (u < 1 / 4 + 1 / 6) {
    if (tallness(a) >= 0.25) aerialFarm(ctx, a, tallness(a));
  } else {
    shippedMast(ctx, a);
  }
}

const both = (fn) => ({ middle: fn, near: fn });
export const NEON_ANTENNA_CANDIDATES = [
  { id: '0', label: '0 SHIPPED', antenna: null,
    note: 'What ships since 29 Sep: G at a third spires and a fifth aerials (neonRoofPlan / neonRoofKit). Before it: a lone 13px mast on the tallest towers only.' },
  { id: 'A', label: 'A LATTICE MAST', antenna: both(candA),
    note: 'A tapering steel truss with zig-zag bracing and a needle on the tall towers — the Tokyo Tower\'s language at rooftop scale. Red lamp on top, amber at the waist, alternating.' },
  { id: 'B', label: 'B STEPPED SPIRE', antenna: both(candB),
    note: 'Shinjuku skyscraper crowns: the tall towers step back twice before a needle and lamp; mid-height towers get a single setback. Silhouette, not sticks.' },
  { id: 'C', label: 'C AERIAL FARM', antenna: both(candC),
    note: 'Rooftop clutter on most roofs: whips of different heights, TV aerials with crossbars, dishes. The tallest whip on a tall roof carries the lamp.' },
  { id: 'D', label: 'D GUYED MAST', antenna: both(candD),
    note: 'A tall thin broadcast mast with guy wires to the roof, two crossarms of white cell panels, lamps at the top and middle blinking alternately.' },
  { id: 'E', label: 'E MIXED SKYLINE', antenna: both(candE),
    note: 'Each tall tower picks its own crown by hash (A, B or D); mid-height roofs get C\'s clutter, lighter. No two tall towers alike.' },
  { id: 'F', label: 'F MIXED + TOKYO RED LIGHTS', antenna: both(candF),
    note: 'E, with every aviation lamp in the city flashing together (slow on, long dark) and red lamps on the corners of the tall roofs — the synchronised red blink of a Tokyo night skyline.' },
  { id: 'G', label: 'G MIX: 0 + B + C', antenna: both(candG),
    note: 'Asked 29 Sep: a quarter of the buildings wear B\'s stepped crown, a sixth C\'s aerial clutter, the rest the shipped roof (the lone mast on the tallest). Chosen per building along the street.' },
];
