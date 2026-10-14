// SPACE CABINET — plateaus (lab only). Peter, 13 Oct 2026: "perhaps we need
// plateaus and that's where mining stuff might work" … "i like the jade, but
// can we bake off the plateaus". Four ways to give the jade ridges flat tops,
// each carrying the base and mining kit on them instead of on the ground line:
//
//   mesas    — flat-topped mesas standing among the middle row's peaks
//   shelf    — a long table-land shelf in front, broken by gaps
//   terraces — open-pit benches stepped into the middle row
//   buttes   — tall narrow buttes rising out of the near row
//
// Spaced well apart (13 Oct: "much more minimal").
// The ridge rows themselves are the bake-off's (same bases, colours and
// parallax); each variant only adds its flat ground and what stands on it.
import { domes, tower, launchPad, pumpjack, rover, HULL, WARM, RED, traceAt, invasionStrike, boom, gagCraft } from './space-life.js';
import { martianSuited, SUIT_PALETTES } from './martian-candidates.js';

const TAU = Math.PI * 2;
const hash = n => ((Math.sin(n * 78.233 + 12.9) * 43758.5453) % 1 + 1) % 1;
function poly(c, pts, fill) {
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath(); c.fillStyle = fill; c.fill();
}
function rect(c, x, y, w, h, fill) { c.fillStyle = fill; c.fillRect(x, y, w, h); }
function glow(c, x, y, r, rgb, a) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
}
function line(c, pts, ink, w) {
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.strokeStyle = ink; c.lineWidth = w; c.stroke();
}
// Mix two #rrggbb colours.
function mix(a, b, t) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
// The bake-off's ridge row, verbatim.
function polyRidge(c, s, f, base, amp, sp, lit, dark, seed) {
  const shift = s.cam * f;
  const k0 = Math.floor((shift - 60) / sp), k1 = Math.ceil((shift + s.view + 60) / sp);
  const valley = k => [k * sp - shift, base - amp * 0.18 * hash(k * 7 + seed)];
  rect(c, -60, base - 1, s.view + 120, 8 - base, dark);
  for (let k = k0; k <= k1; k++) {
    const v0 = valley(k), v1 = valley(k + 1);
    const px = k * sp - shift + sp * (0.4 + hash(k * 13 + seed) * 0.25);
    const top = [px, base - amp * (0.45 + 0.55 * hash(k * 31 + seed))];
    poly(c, [v0, top, [px, base + 2]], lit);
    poly(c, [top, v1, [px, base + 2]], dark);
  }
}
function* along(s, f, step, pad = 80) {
  const shift = s.cam * f;
  for (let k = Math.floor((shift - pad) / step) - 1; k * step < shift + s.view + pad; k++) yield [k, k * step - shift];
}

// ------------------------------------------------------------- mining kit
function drillRig(c, x, y, t, k, cabin = true) {
  // A lattice derrick on a skid: two lit legs and a shaded one, cross braces,
  // a crown block, a travelling block riding up and down on its cable, a
  // turning rotary table with sparks, and a doghouse cabin with a light.
  rect(c, x - 5, y - 1.2, 10, 1.2, HULL.dark); rect(c, x - 5, y - 1.2, 10, 0.4, HULL.mid);
  line(c, [[x - 4.2, y - 1.2], [x - 1, y - 21]], HULL.lit, 0.55);
  line(c, [[x + 4.2, y - 1.2], [x + 1, y - 21]], '#7f8794', 0.55);
  for (let j = 0; j < 5; j++) {
    const ya = y - 1.2 - j * 4, yb = ya - 4, wa = 4.2 - j * 0.64, wb = 4.2 - (j + 1) * 0.64;
    line(c, [[x - wa, ya], [x + wb, yb]], HULL.dark, 0.25); line(c, [[x + wa, ya], [x - wb, yb]], HULL.dark, 0.25);
    line(c, [[x - wa, ya], [x + wa, ya]], HULL.dark, 0.2);
  }
  rect(c, x - 2.4, y - 22.4, 4.8, 1.6, '#d6aa50'); rect(c, x - 2.4, y - 22.4, 4.8, 0.5, '#f2cc70');
  const hook = y - 19 + (Math.sin(t * 0.8 + k) + 1) * 6;
  line(c, [[x, y - 21], [x, hook]], HULL.pale, 0.25);
  rect(c, x - 1, hook, 2, 1.6, '#c8973c');
  const turn = t * 6 + k;
  rect(c, x - 2.6, y - 2.4, 5.2, 1.2, HULL.dull);
  for (let i = 0; i < 3; i++) { const a = turn + i * 2.1; line(c, [[x, y - 1.8], [x + Math.cos(a) * 2.6, y - 1.8 + Math.sin(a) * 0.6]], '#8a6a30', 0.5); }
  if (cabin) {
    rect(c, x + 4.6, y - 5, 4.4, 3.8, HULL.lit); rect(c, x + 7.6, y - 5, 1.4, 3.8, HULL.mid); rect(c, x + 4.6, y - 5.4, 4.4, 0.5, HULL.hi);
    rect(c, x + 5.4, y - 4, 1.4, 1, `rgba(${WARM},0.95)`);
  }
  if (Math.sin(t * 3 + k) > 0.3) glow(c, x, y - 22.6, 3.5, RED, 0.95);
  if ((t * 7 + k) % 1 < 0.5) glow(c, x + 1, y - 2, 3, '255,200,120', 0.7);
}
function oreHeap(c, x, y, lit, dark) {
  // A pile of faceted ore: five facets and a few loose rocks.
  poly(c, [[x - 8, y], [x - 4, y - 3.2], [x - 2, y - 5.4], [x - 1, y]], lit);
  poly(c, [[x - 2, y - 5.4], [x + 1.6, y - 4.4], [x + 1, y], [x - 1, y]], mix(lit, dark, 0.4));
  poly(c, [[x + 1.6, y - 4.4], [x + 6, y], [x + 1, y]], dark);
  poly(c, [[x + 1, y], [x + 4, y - 3], [x + 6.4, y - 2.2], [x + 9.4, y]], lit);
  poly(c, [[x + 6.4, y - 2.2], [x + 9.4, y], [x + 7, y]], dark);
  for (const [rx, rr] of [[-9.6, 0.9], [10.8, 0.7], [-6, 0.6]]) poly(c, [[x + rx - rr, y], [x + rx, y - rr * 1.4], [x + rx + rr, y]], mix(lit, dark, 0.5));
}
function conveyor(c, x0, y0, x1, y1, t) {
  line(c, [[x0, y0], [x1, y1]], HULL.dark, 1.2);
  line(c, [[x0, y0 - 0.8], [x1, y1 - 0.8]], HULL.mid, 0.4);
  const n = Math.max(2, Math.floor(Math.hypot(x1 - x0, y1 - y0) / 5));
  for (let i = 0; i < n; i++) {
    const u = ((i / n + t * 0.25) % 1 + 1) % 1;
    rect(c, x0 + (x1 - x0) * u - 0.6, y0 + (y1 - y0) * u - 1.8, 1.2, 1, '#b08848');
  }
  for (const [px, py] of [[x0, y0], [(x0 + x1) / 2, (y0 + y1) / 2]]) rect(c, px - 0.4, py, 0.8, 3, HULL.dark);
}
function silo(c, x, y) {
  // A storage silo: lit and shaded staves, hoops, a domed cap, a ladder.
  rect(c, x - 2.6, y - 11, 5.2, 11, HULL.mid); rect(c, x - 2.6, y - 11, 1.6, 11, HULL.lit); rect(c, x - 1, y - 11, 1.4, 11, '#c6ccd5');
  rect(c, x + 1.4, y - 11, 1.2, 11, '#7f8794');
  for (const hy of [y - 9, y - 6, y - 3]) rect(c, x - 2.6, hy, 5.2, 0.45, 'rgba(0,0,0,0.25)');
  c.beginPath(); c.arc(x, y - 11, 2.6, Math.PI, 0); c.fillStyle = HULL.lit; c.fill();
  c.beginPath(); c.arc(x, y - 11, 2.6, Math.PI * 1.5, 0); c.fillStyle = HULL.mid; c.fill();
  rect(c, x - 0.3, y - 14.2, 0.6, 0.8, HULL.dark);
  for (let r = 0; r < 6; r++) rect(c, x + 2.7, y - 1.5 - r * 1.8, 0.9, 0.25, HULL.dark);
  line(c, [[x + 2.7, y], [x + 2.7, y - 11]], HULL.dark, 0.2); line(c, [[x + 3.6, y], [x + 3.6, y - 11]], HULL.dark, 0.2);
}
// What stands on one plateau top, by kind.
// More pieces, packed to fit (Peter, 13 Oct: "things must fit properly on the
// buttes" … "more variety on the plateaus — very samey"). Each piece knows its
// footprint; the packer walks a top left to right and only places what still
// fits, with breathing gaps, so nothing ever hangs off an edge.
function dome1(c, x, y, rad) {
  const tones = [HULL.hi, HULL.lit, HULL.pale, '#a4acb8', '#7f8794', HULL.dark];
  rect(c, x - rad - 0.3, y - 0.8, rad * 2 + 0.6, 0.8, HULL.dark);
  for (let f = 0; f < 6; f++) {
    const a0 = Math.PI + f * Math.PI / 6, a1 = a0 + Math.PI / 6;
    poly(c, [[x, y - 0.8], [x + Math.cos(a0) * rad, y - 0.8 + Math.sin(a0) * rad], [x + Math.cos(a1) * rad, y - 0.8 + Math.sin(a1) * rad]], tones[f]);
  }
  rect(c, x - rad * 0.5, y - 0.8 - rad * 0.4, 0.8, 0.7, `rgba(${WARM},0.95)`); rect(c, x + rad * 0.1, y - 0.8 - rad * 0.4, 0.8, 0.7, `rgba(${WARM},0.95)`);
}
function mast(c, x, y, t, k) {
  line(c, [[x - 1.6, y], [x, y - 15]], HULL.lit, 0.45); line(c, [[x + 1.6, y], [x, y - 15]], '#7f8794', 0.45);
  for (let j = 1; j < 4; j++) line(c, [[x - 1.6 + j * 0.4, y - j * 3.6], [x + 1.6 - j * 0.4, y - j * 3.6]], HULL.dark, 0.25);
  if (Math.sin(t * 3 + k * 1.7) > 0.1) glow(c, x, y - 15.4, 3, RED, 0.95);
}
function dishOnPost(c, x, y, t, k, rad = 4) {
  const turn = Math.cos(t * 0.6 + k);
  rect(c, x - 0.4, y - 5, 0.8, 5, HULL.dark); rect(c, x - 1.5, y - 1, 3, 1, '#7f8794');
  c.beginPath(); c.ellipse(x, y - 7, rad * Math.abs(turn) + 0.4, rad, 0.25, 0, Math.PI * 2);
  c.fillStyle = turn > 0 ? HULL.lit : '#7f8794'; c.fill();
  line(c, [[x, y - 7], [x + rad * 0.8 * turn, y - 8.4]], HULL.dark, 0.3);
}
function solarArray(c, x, y) {
  for (let i = 0; i < 3; i++) {
    const px = x + i * 5.4;
    rect(c, px + 1.8, y - 2.2, 0.5, 2.2, HULL.dark);
    poly(c, [[px, y - 2.2], [px + 4.6, y - 4.4], [px + 4.6, y - 3.4], [px, y - 1.4]], '#4f78c0');
    line(c, [[px + 1.5, y - 2.7], [px + 1.5, y - 1.8]], '#7fa2e0', 0.2); line(c, [[px + 3, y - 3.4], [px + 3, y - 2.5]], '#7fa2e0', 0.2);
  }
}
function habitat(c, x, y, t, k) {
  rect(c, x, y - 6, 13, 6, HULL.lit); rect(c, x + 9, y - 6, 4, 6, '#a4acb8');
  poly(c, [[x, y - 6], [x + 1.4, y - 7.4], [x + 14.4, y - 7.4], [x + 13, y - 6]], HULL.hi);
  poly(c, [[x + 13, y - 6], [x + 14.4, y - 7.4], [x + 14.4, y - 1.4], [x + 13, y]], '#7f8794');
  for (let i = 0; i < 3; i++) rect(c, x + 1.4 + i * 2.6, y - 4.4, 1.6, 1.2, `rgba(${WARM},${0.75 + 0.25 * hash(i + k + Math.floor(t / 3))})`);
  rect(c, x + 10, y - 3.2, 2, 3.2, HULL.dark);
  line(c, [[x + 3, y - 7.4], [x + 3, y - 10]], HULL.dark, 0.3); rect(c, x + 2.4, y - 10.6, 1.2, 0.6, '#d4553e');
}
function greenhouse(c, x, y, t) {
  const cx = x + 6, rad = 5.6;
  glow(c, cx, y - 2.4, 7, '150,255,160', 0.25 + 0.05 * Math.sin(t));
  c.beginPath(); c.arc(cx, y, rad, Math.PI, 0); c.fillStyle = 'rgba(170,240,200,0.35)'; c.fill();
  c.strokeStyle = 'rgba(230,255,240,0.7)'; c.lineWidth = 0.3;
  c.beginPath(); c.arc(cx, y, rad, Math.PI, 0); c.stroke();
  for (let i = 1; i < 4; i++) { const a = Math.PI + i * Math.PI / 4; c.beginPath(); c.moveTo(cx, y); c.lineTo(cx + Math.cos(a) * rad, y + Math.sin(a) * rad); c.stroke(); }
  for (let i = 0; i < 4; i++) rect(c, cx - 4 + i * 2.2, y - 1.6 - hash(i + 3) * 1.4, 1.2, 1.6 + hash(i + 3) * 1.4, '#5fbf6a');
  rect(c, x, y - 0.6, 12, 0.6, HULL.dark);
}
function tanks(c, x, y) {
  for (const ty of [y - 2, y - 4.6]) {
    c.beginPath(); c.roundRect(x, ty - 2.4, 10, 2.4, 1.2); c.fillStyle = HULL.lit; c.fill();
    rect(c, x + 1, ty - 1, 8, 1, '#a4acb8');
  }
  rect(c, x + 1, y - 0.6, 0.8, 0.6, HULL.dark); rect(c, x + 8, y - 0.6, 0.8, 0.6, HULL.dark);
  rect(c, x + 3, y - 7.2, 4, 0.5, '#f0b23c');
}
const PIECES = [
  { w: 9, draw: (c, x, y, t, k) => dome1(c, x + 4.5, y, 4) },
  { w: 13, draw: (c, x, y, t, k) => dome1(c, x + 6.5, y, 6) },
  { w: 34, draw: (c, x, y, t, k) => domes(c, x + 17, y, k) },
  { w: 21, draw: (c, x, y, t, k) => tower(c, x + 5, y, t, k) },
  { w: 5, draw: (c, x, y, t, k) => mast(c, x + 2.5, y, t, k) },
  { w: 10, draw: (c, x, y, t, k) => dishOnPost(c, x + 5, y, t, k) },
  { w: 7, draw: (c, x, y) => silo(c, x + 3, y) },
  { w: 14, draw: (c, x, y) => { silo(c, x + 3, y); silo(c, x + 10, y); } },
  { w: 12, draw: (c, x, y, t, k) => drillRig(c, x + 6, y, t, k, false) },
  { w: 21, draw: (c, x, y, t, k) => drillRig(c, x + 6, y, t, k, true) },
  { w: 20, draw: (c, x, y, t, k, r) => oreHeap(c, x + 10, y, mix(r[2][0], '#c8b070', 0.4), mix(r[2][1], '#3a2a18', 0.4)) },
  { w: 31, draw: (c, x, y, t, k) => pumpjack(c, x + 16, y, t, k) },
  { w: 32, draw: (c, x, y, t, k) => launchPad(c, x + 16, y, t, k) },
  { w: 16, draw: (c, x, y) => solarArray(c, x, y) },
  { w: 15, draw: (c, x, y, t, k) => habitat(c, x, y, t, k) },
  { w: 12, draw: (c, x, y, t) => greenhouse(c, x, y, t) },
  { w: 24, draw: (c, x, y, t, k) => { dishOnPost(c, x + 4, y, t, k, 3); dishOnPost(c, x + 12, y, t, k + 1, 3); dishOnPost(c, x + 20, y, t, k + 2, 3); } },
  { w: 11, draw: (c, x, y) => tanks(c, x, y) },
];
// Level 3's invasion leaves the bases in ruins: charred rubble, snapped masts,
// small fires and smoke climbing away. `kitMode` is set per formation by
// occasional(); 'martian' is a ruin with the lone Martian stood on it.
let kitMode = 'intact';
function ruinKit(c, x0, x1, y, t, k) {
  const w = x1 - x0;
  for (let i = 0; i < Math.max(2, Math.floor(w / 9)); i++) {
    const rx = x0 + 2 + (i + hash(k * 5 + i) * 0.6) * (w - 4) / Math.max(2, Math.floor(w / 9)), rh = 1.6 + hash(k + i * 3) * 3;
    poly(c, [[rx - 4, y], [rx - 1.4, y - rh], [rx + 1.2, y - rh * 0.7], [rx + 4, y]], i % 2 ? '#2b2a2c' : '#3c3a3b');
    if (hash(k * 7 + i) > 0.55) { c.save(); c.translate(rx, y - rh * 0.6); c.rotate((hash(i + k) - 0.5) * 1.6); rect(c, -0.4, -6, 0.8, 6, '#4a4a50'); c.restore(); }
    if (hash(k * 11 + i) > 0.5) {
      const fl = 0.6 + 0.4 * Math.sin(t * 9 + i * 2.3 + k);
      glow(c, rx, y - rh - 0.6, 2.4 + fl, '255,150,60', 0.75 * fl);
      poly(c, [[rx - 1, y - rh], [rx, y - rh - 2.4 * fl], [rx + 1, y - rh]], '#ffd27a');
    }
  }
  // Smoke columns, drifting up and leaning with the wind.
  for (let i = 0; i < 2; i++) {
    const sx = x0 + w * (0.3 + i * 0.4);
    for (let j = 0; j < 5; j++) {
      const ph = ((t * 0.35 + j / 5 + i * 0.5) % 1 + 1) % 1;
      glow(c, sx + ph * 8, y - 4 - ph * 34, 3 + ph * 6, '70,76,74', 0.35 * (1 - ph));
    }
  }
}
// `sweepX`: in level 3 an attack crosses each kit left to right; a piece whose
// centre it has passed is rubble, with its own fireball for a moment after.
let sweepX = -Infinity;
const BOOM_RUN = 60;
function destroyed(cx, w, y, t, k) {
  if (cx >= sweepX) { aimedBolt(c_, cx, y - 5, `kit${k}`); return false; }
  ruinKit(c_, cx - w / 2, cx + w / 2, y, t, k);
  const p = (sweepX - cx) / BOOM_RUN;
  if (p < 1) blastHook?.(`kit${k}`);
  if (p < 1) { traceAt('boom', cx, w / 2 + 8); boom(c_, cx, y - 5, p, Math.min(1.4, 0.5 + w / 26)); }
  return true;
}
let c_ = null;
// Called once per piece as it starts to blow up (a run sets it to play the
// explosion sound — one per object, Peter 13 Oct). Keyed so a piece is only
// ever reported once however many frames its fireball lasts.
let blastHook = null;
export function setBlastHook(fn) { blastHook = fn; }
// Level 2's raid is precise (Peter, 13 Oct: "very accurate … 1 shot for each
// item destroyed"): the saucers fire one bolt per object, timed to land as the
// attack reaches it. `raidGun` is where they fire from this frame (set by
// occasional()); `shotHook` hears each shot once, for its pew.
let raidGun = null, shotHook = null;
export function setShotHook(fn) { shotHook = fn; }
// Level 3's lone Martian: `ackHook` hears him open fire on the low craft, for
// his ACK! ACK! ACK! (Peter, 14 Oct). Called every frame he is shooting; the
// listener says it once.
let ackHook = null;
export function setAckHook(fn) { ackHook = fn; }
const BOLT_LEAD = 20;      // sweep units of flight: ~0.28 s
function aimedBolt(c, cx, cy, key) {
  if (!raidGun) return;
  const ahead = cx - sweepX;
  if (ahead <= 0 || ahead > BOLT_LEAD) return;
  shotHook?.(key);
  const u = 1 - ahead / BOLT_LEAD, x1 = raidGun.x + (cx - raidGun.x) * u, y1 = raidGun.y + (cy - raidGun.y) * u;
  const back = Math.max(0, u - 0.25), x0 = raidGun.x + (cx - raidGun.x) * back, y0 = raidGun.y + (cy - raidGun.y) * back;
  c.strokeStyle = 'rgba(170,255,140,0.95)'; c.lineWidth = 0.9; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  glow(c, x1, y1, 2.4, '190,255,160', 0.8);
}
function plateauKit(c, x0, x1, y, t, k, r) {
  c_ = c;
  if (kitMode === 'martian') return;   // a bare top: occasional() stands the lone Martian on it
  if (kitMode === 'ruin') { ruinKit(c, x0, x1, y, t, k); return; }
  let x = x0 + 1, i = 0;
  while (x < x1 - 4 && i < 12) {
    const room = x1 - x, fits = PIECES.filter(p => p.w <= room);
    if (!fits.length) break;
    if (i > 0 && hash(k * 41 + i * 7) < 0.18) { x += 5; i++; continue; }      // a breathing gap
    const p = fits[Math.floor(hash(k * 31 + i * 13 + 5) * fits.length)];
    if (!destroyed(x + p.w / 2, p.w, y, t, k * 7 + i)) p.draw(c, x, y, t, k * 7 + i, r);
    x += p.w + 1.5 + hash(k * 17 + i) * 3; i++;
  }
  // Lights strung along the edge of the top, so it reads as occupied.
  for (let lx = x0 + 3; lx < x1 - 2; lx += 6) if (lx > sweepX && ((t * 4 + lx * 0.2) % 4 + 4) % 4 < 0.6) glow(c, lx, y - 0.5, 1.6, WARM, 0.9);
}

// ------------------------------------------------------------- variants
// Each `land(c, s, look, r)` paints the three bake-off rows plus its plateaus
// and their kit. `r` is the scheme's ridge colours, far → near.
function mesas(c, s, look, r) {
  polyRidge(c, s, 0.03, -26, 30, 34, r[0][0], r[0][1], 1);
  polyRidge(c, s, 0.065, -16, 22, 26, r[1][0], r[1][1], 2);
  // Flat-topped mesas among the middle row: lit left slope, a pale table top,
  // a shaded right face banded with strata.
  for (const [k, x] of along(s, 0.065, 300)) {
    const cx = x + hash(k + 800) * 50, top = -30 - hash(k + 810) * 6, half = 16 + hash(k + 820) * 10;
    const l = cx - half, rr = cx + half;
    poly(c, [[l - 9, -14], [l, top], [cx, top], [cx, -14]], r[1][0]);
    poly(c, [[cx, top], [rr, top], [rr + 9, -14], [cx, -14]], r[1][1]);
    for (let i = 1; i < 4; i++) { const yy = top + i * 4; rect(c, cx, yy, (rr + 9 * (yy - top) / (-14 - top)) - cx, 0.6, 'rgba(0,0,0,0.14)'); }
    rect(c, l, top - 0.8, rr - l, 0.9, mix(r[1][0], '#ffffff', 0.35));
    plateauKit(c, l + 2, rr - 2, top - 0.8, s.t, k, r);
  }
  polyRidge(c, s, 0.12, -6, 16, 19, r[2][0], r[2][1], 3);
}
function shelf(c, s, look, r) {
  polyRidge(c, s, 0.03, -26, 30, 34, r[0][0], r[0][1], 1);
  polyRidge(c, s, 0.065, -16, 22, 26, r[1][0], r[1][1], 2);
  polyRidge(c, s, 0.12, -6, 16, 19, r[2][0], r[2][1], 3);
  // A long table-land in front, broken by gaps: a pale top, a cliff face of
  // two-tone strata, slanted ends lit and shaded.
  for (const [k, x] of along(s, 0.14, 480)) shelfAt(c, s, r, x + hash(k + 900) * 30, k);
}
function shelfAt(c, s, r, a, k) {
  traceAt(`shelf${k}`, a + 100, 108);
  // Four shapes: plain table, stepped (a higher block on part of it), a long
  // ramp face, and notched (a cut through the middle). Heights and lengths vary.
  const style = Math.floor(hash(k + 930) * 4), b = a + 110 + hash(k + 910) * 90, top = -19 - hash(k + 920) * 10;
  const face = r[2][1], lit = r[2][0], lip = mix(lit, '#ffffff', 0.25);
  const strata = (x0, x1, y0) => { for (let i = 0; i < 5; i++) rect(c, x0, y0 + 3 + i * 3.2, x1 - x0, 1.2 + hash(k + i) * 0.8, i % 2 ? 'rgba(0,0,0,0.13)' : 'rgba(255,255,255,0.05)'); };
  // Style 3 is a split table: two blocks with a real gap between them, the
  // ridges showing through (it was a dark V notch, which read as nothing).
  const nx = a + (b - a) * 0.55, gap = 9;
  poly(c, [[a - 8, -6], [a, top], [a + 4, -6]], lit);
  if (style === 3) {
    rect(c, a, top, nx - gap / 2 - a, -6 - top + 1, face); strata(a, nx - gap / 2, top);
    rect(c, nx + gap / 2, top, b - nx - gap / 2, -6 - top + 1, face); strata(nx + gap / 2, b, top);
    poly(c, [[nx - gap / 2, top], [nx - gap / 2 + 3, -6], [nx - gap / 2, -6]], mix(face, '#000000', 0.3));   // shaded inner face
    poly(c, [[nx + gap / 2, top], [nx + gap / 2 - 3, -6], [nx + gap / 2, -6]], lit);                       // lit inner face
  } else { rect(c, a, top, b - a, -6 - top + 1, face); strata(a, b, top); }
  if (style === 2) poly(c, [[b, top], [b + 26, -6], [b - 4, -6]], mix(face, lit, 0.35));
  else poly(c, [[b, top], [b + 8, -6], [b - 4, -6]], mix(face, '#000000', 0.3));
  if (style === 3) { rect(c, a, top - 1, nx - gap / 2 - a, 1.2, lip); rect(c, nx + gap / 2, top - 1, b - nx - gap / 2, 1.2, lip); }
  else rect(c, a, top - 1, b - a, 1.2, lip);
  let kitA = a, kitB = a + (b - a) * 0.62, roadA = a + (b - a) * 0.64, roadB = b, roadY = top;
  if (style === 1) {
    // A higher block on the left part; the base on it, the road on the lower tier.
    const bx = a + (b - a) * 0.5, ht = top - 7 - hash(k + 940) * 5;
    rect(c, a + 4, ht, bx - a - 4, top - ht, mix(face, lit, 0.15)); strata(a + 4, bx, ht);
    poly(c, [[bx, ht], [bx + 6, top], [bx - 2, top]], mix(face, '#000000', 0.3));
    rect(c, a + 4, ht - 1, bx - a - 4, 1.2, lip);
    plateauKit(c, a + 5, bx - 1, ht - 1, s.t, k, r);
    kitA = kitB = null; roadA = bx + 8;
  } else if (style === 3) {
    // The base on the left block, the road on the right.
    kitB = nx - gap / 2 - 2; roadA = nx + gap / 2 + 2;
  }
  if (kitA != null) plateauKit(c, kitA, kitB, top - 1, s.t, k, r);
  if (kitMode === 'intact' && roadB - roadA > 30) {
    // A rover patrols the flat: vehicles only on flat ground (Peter, 13 Oct).
    const ph = s.t * 0.22 + k, span = roadB - roadA - 22, rx = roadA + 11 + (Math.sin(ph) + 1) / 2 * span, facing = Math.cos(ph) >= 0 ? 1 : -1;
    aimedBolt(c, rx, roadY - 4, `rover${k}`);
    if (rx < sweepX) { const p = (sweepX - rx) / BOOM_RUN; if (p < 1) { blastHook?.(`rover${k}`); traceAt('boom', rx, 18); boom(c, rx, roadY - 4, p, 0.8); } }
    else { c.save(); c.translate(rx, 0); c.scale(facing, 1); rover(c, 0, roadY - 0.6, s.t, k); c.restore(); }
  }
}
function terraces(c, s, look, r) {
  polyRidge(c, s, 0.03, -26, 30, 34, r[0][0], r[0][1], 1);
  polyRidge(c, s, 0.065, -16, 22, 26, r[1][0], r[1][1], 2);
  // Open-pit benches stepped into the hillside: each step a pale tread and a
  // shaded riser, a rig on the top bench and a conveyor running down.
  for (const [k, x] of along(s, 0.065, 340)) {
    const cx = x + hash(k + 1000) * 60, steps = 4, sw = 9, sh = 5;
    const base = -14, topY = base - steps * sh;
    for (let i = 0; i < steps; i++) {
      const y = base - (i + 1) * sh, l = cx - (steps - i) * sw - 6, rr = cx + (steps - i) * sw * 0.7 + 6;
      rect(c, l, y, rr - l, sh + 0.5, i % 2 ? r[1][1] : mix(r[1][1], r[1][0], 0.35));
      rect(c, l, y, rr - l, 1, mix(r[1][0], '#ffffff', 0.3));
    }
    poly(c, [[cx - steps * sw - 16, base], [cx - steps * sw - 6, base - sh]], r[1][0]);
    const l = cx - sw - 6, rr = cx + sw * 0.7 + 6;
    drillRig(c, cx - 2, topY, s.t, k);
    conveyor(c, cx + 4, topY - 2, cx + steps * sw * 0.7 + 10, base - 1, s.t);
    oreHeap(c, cx + steps * sw * 0.7 + 14, base, mix(r[2][0], '#c8b070', 0.4), mix(r[2][1], '#3a2a18', 0.4));
    for (let i = 0; i < steps; i++) if (((s.t * 3 + i) % 4) < 0.7) glow(c, cx - (steps - i) * sw, base - (i + 1) * sh, 1.6, WARM, 0.9);
    void l; void rr;
  }
  polyRidge(c, s, 0.12, -6, 16, 19, r[2][0], r[2][1], 3);
}
function buttes(c, s, look, r) {
  polyRidge(c, s, 0.03, -26, 30, 34, r[0][0], r[0][1], 1);
  polyRidge(c, s, 0.065, -16, 22, 26, r[1][0], r[1][1], 2);
  polyRidge(c, s, 0.12, -6, 16, 19, r[2][0], r[2][1], 3);
  // Tall narrow buttes rising from the near row: sheer faces, strata, a scree
  // apron, and a small base on each top.
  for (const [k, x] of along(s, 0.14, 360)) butteAt(c, s, r, x + hash(k + 1100) * 60, k);
}
function butteAt(c, s, r, cx, k, forceStyle = null) {
  traceAt(`butte${k}`, cx, 40);
  // Four shapes: plain, a caprock that overhangs, twin columns on a saddle,
  // and a wide tapering mesa. Widths and heights vary; the kit is packed to fit.
  const style = forceStyle ?? Math.floor(hash(k + 1130) * 4);
  const lit = r[2][0], dark = r[2][1], lip = mix(lit, '#ffffff', 0.35);
  const column = (x, half, top, taper = 1) => {
    const l = x - half, rr = x + half;
    poly(c, [[l - 7 * taper, -6], [l - 1, top + 6], [l, top], [x, top], [x, -6]], lit);
    poly(c, [[x, top], [rr, top], [rr + 1, top + 6], [rr + 7 * taper, -6], [x, -6]], dark);
    for (let i = 1; i < 6; i++) rect(c, l, top + i * 5.5, rr - l, 0.7, 'rgba(0,0,0,0.13)');
    rect(c, l, top - 0.8, rr - l, 0.9, lip);
    return [l, rr];
  };
  poly(c, [[cx - 30, -6], [cx - 20, -12], [cx, -9], [cx + 20, -12], [cx + 30, -6]], mix(dark, lit, 0.3));   // scree
  if (style === 2) {
    const t1 = -40 - hash(k + 1120) * 8, t2 = t1 + 4 + hash(k + 1121) * 6;
    poly(c, [[cx - 8, -6], [cx - 6, -22], [cx + 6, -22], [cx + 8, -6]], mix(dark, lit, 0.2));
    const [l1, r1] = column(cx - 10, 7, t1), [l2, r2] = column(cx + 10, 6, t2);
    plateauKit(c, l1 + 0.5, r1 - 0.5, t1 - 0.8, s.t, k, r); plateauKit(c, l2 + 0.5, r2 - 0.5, t2 - 0.8, s.t, k + 50, r);
    return;
  }
  const half = style === 3 ? 18 + hash(k + 1110) * 8 : 9 + hash(k + 1110) * 8;
  const top = style === 3 ? -30 - hash(k + 1120) * 6 : -40 - hash(k + 1120) * 12;
  const [l, rr] = column(cx, half, top, style === 3 ? 2 : 1);
  let kt = top - 0.8;
  if (style === 1) {
    // Caprock: a darker slab overhanging both faces.
    rect(c, l - 2.5, top - 3, rr - l + 5, 3, mix(dark, '#000000', 0.15)); rect(c, l - 2.5, top - 3, (rr - l + 5) / 2, 3, mix(lit, dark, 0.3));
    rect(c, l - 2.5, top - 3.8, rr - l + 5, 0.9, lip);
    kt = top - 3.8;
    plateauKit(c, l - 2, rr + 2, kt, s.t, k, r);
  } else plateauKit(c, l + 0.5, rr - 0.5, kt, s.t, k, r);
}
// P5 (Peter, 13 Oct: "P2 and P4 but only very occasionally, perhaps once or
// twice each within a level"): the bake-off rows alone, and a shelf and a
// butte each turning up twice, at fixed points in the stage, riding the near
// parallax across the windows like everything else on that row.
// They ride a foreground layer (0.6 of the camera) rather than the near
// ridges' 0.14: at 0.14 each lingered for half the stage and they overlapped;
// at 0.6 each crosses the frame in about a sixth of it, and they read as
// nearer than the ridges, which they are.
// More of them (Peter, 13 Oct: "more plateau and buttes"): eight a stage,
// alternating, sometimes a pair of buttes together.
const OCCASIONAL = [{ kind: 'shelf', at: 0.06 }, { kind: 'butte', at: 0.17 }, { kind: 'shelf', at: 0.3 }, { kind: 'butte', at: 0.41 },
  { kind: 'butte', at: 0.45 }, { kind: 'shelf', at: 0.56 }, { kind: 'butte', at: 0.68 }, { kind: 'shelf', at: 0.8 }, { kind: 'butte', at: 0.92 }];
const STAGE_NEAR = 4680 * 0.6;
function occasional(c, s, look, r) {
  polyRidge(c, s, 0.03, -26, 30, 34, r[0][0], r[0][1], 1);
  polyRidge(c, s, 0.065, -16, 22, 26, r[1][0], r[1][1], 2);
  polyRidge(c, s, 0.12, -6, 16, 19, r[2][0], r[2][1], 3);
  if (s.progress == null) return;
  OCCASIONAL.forEach((o, i) => {
    const f = formationAt(s, o, i);
    if (f.x < -340 || f.x > s.view + 160) return;   // wide: searchlights on top reach well past the rock
    if (s.stage === 3 || s.stage === 2) { const st = invasionStrike(c, s, i, f, f.d, 'state'); kitMode = st.mode === 'martian' ? 'martian' : 'intact'; sweepX = st.sweepX ?? -Infinity; }
    // Level 2's raid fires from the lead saucer (same path invasionStrike flies).
    raidGun = s.stage === 2 && i === OCCASIONAL.length - 1 && f.d > -560 && f.d < 560
      ? { x: -130 + (f.d + 560) / 1120 * (s.view + 300), y: -126 + (f.top - 30 + 126) * Math.exp(-Math.pow((f.d + 40) / 300, 2)) + 4 } : null;
    const lone = s.stage === 3 && kitMode === 'martian';
    if (kindOf(s, o, i) === 'shelf') shelfAt(c, s, r, f.x - 60, i + 3); else butteAt(c, s, r, f.x, i + 7, lone ? 0 : null);
    if (lone) loneMartian(c, s, f);
    kitMode = 'intact'; sweepX = -Infinity; raidGun = null;
  });
}
// Where formation i is now: its screen x, how far the camera is past its
// mid-frame moment (d), and the span and top its kit sits on (what a strike
// sweeps across).
// The lone Martian on level 3's last butte: he tracks the low craft (gagCraft)
// with his gun and fires as it passes overhead; the zap meets it at its hit
// point and the craft goes up (space-life.js martianGag paints that half).
function loneMartian(c, s, f) {
  const g = gagCraft(f, f.d), mx = g.mx, y = f.top - 0.8, sc = 0.8;
  const tx = g.alive ? g.x : g.hitX, ty = g.y;
  const shoulderX = mx + 2.8 * sc, shoulderY = y - 14.2 * sc;
  // Tracks it on the way in, fires, holds the aim a beat, then lowers the gun.
  const aim = g.dd > -420 && g.dd < 30 ? Math.max(-1.45, Math.min(0, Math.atan2(ty - shoulderY, tx - shoulderX))) : null;
  const shooting = g.dd > -50 && g.dd < 10 ? (g.dd + 50) / 60 : null;
  traceAt('loneMartian', mx, 10);
  // The crimson-and-gold suit, plain head and helmet (Peter, 14 Oct: B) — off
  // the jade, where the teal one sank.
  martianSuited(c, mx, y, sc, s.t, { pal: SUIT_PALETTES.crimson, face: 1, aim, shooting });
  if (shooting != null) ackHook?.();
  if (shooting != null) {
    const gx = shoulderX + Math.cos(aim) * 8.4 * sc, gy = shoulderY + Math.sin(aim) * 8.4 * sc, k = Math.min(1, shooting * 1.6);
    c.strokeStyle = 'rgba(180,255,150,0.95)'; c.lineWidth = 1; c.lineCap = 'round';
    c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx + (tx - gx) * k, gy + (ty - gy) * k); c.stroke();
  }
}
// Level 2's last formation is a shelf (a plateau), so its one raid near the end
// destroys a base on a plateau, not a butte (Peter, 13 Oct).
function kindOf(s, o, i) { return s.stage === 2 && i === OCCASIONAL.length - 1 ? 'shelf' : o.kind; }
function formationAt(s, o, i) {
  const d = (s.progress - o.at) * (s.length ?? 4680), x = s.view * 0.55 - d * 0.6;
  if (s.stage === 3 && i === OCCASIONAL.length - 1) {
    // The lone Martian's butte: a single plain column that comes to rest, whole,
    // inside a window when the camera stops at the finish (s.loneRestX).
    const k = i + 7, half = 9 + hash(k + 1110) * 8, top = -40 - hash(k + 1120) * 12;
    const dl = (s.progress - (s.loneProgress ?? 0.9)) * (s.length ?? 4680), xl = (s.loneRestX ?? s.view * 0.55) - dl * 0.6;
    return { x: xl, d: dl, x0: xl - half, x1: xl + half, top };
  }
  if (kindOf(s, o, i) === 'shelf') {
    const k = i + 3, a = x - 60, b = a + 110 + hash(k + 910) * 90, top = -19 - hash(k + 920) * 10;
    return { x, d, x0: a, x1: b, top };
  }
  const k = i + 7, style = Math.floor(hash(k + 1130) * 4);
  const half = style === 3 ? 18 + hash(k + 1110) * 8 : 9 + hash(k + 1110) * 8;
  const top = style === 3 ? -30 - hash(k + 1120) * 6 : -40 - hash(k + 1120) * 12;
  return style === 2 ? { x, d, x0: x - 17, x1: x + 16, top: -46 } : { x, d, x0: x - half, x1: x + half, top };
}
// Whether level 2's raid is firing its bolts now (the same test its painter
// uses), for the run to play the pew sound in step with the picture.
// Returns { firing, sweep } where sweep is how far across the base the bolts
// have reached (0..1), so the run can pop a small explosion as each piece goes.
export function stage2RaidFiring(s) {
  if (s.progress == null) return { firing: false, sweep: 0 };
  const i = OCCASIONAL.length - 1, f = formationAt({ ...s, stage: 2 }, OCCASIONAL[i], i);
  if (f.d < -560 || f.d > 560) return { firing: false, sweep: 0 };
  const sweepX = -130 + (f.d + 560) / 1120 * (s.view + 300) + 14;
  return { firing: sweepX > f.x0 - 6 && sweepX < f.x1 + 6, sweep: (sweepX - f.x0) / Math.max(1, f.x1 - f.x0), width: f.x1 - f.x0 };
}
// The sky half of level 3's strikes (the saucer and the fleet come in behind
// the land), painted from the vista's sky pass.
export function invasionSky(c, s) {
  if ((s.stage !== 3 && s.stage !== 2) || s.progress == null) return;
  OCCASIONAL.forEach((o, i) => { const f = formationAt(s, o, i); invasionStrike(c, s, i, f, f.d, 'sky'); });
}
export const PLATEAU_VARIANTS = [
  { id: 'mesas', letter: 'P1', name: 'MESAS AMONG THE PEAKS', land: mesas,
    note: 'Flat-topped mesas standing in the middle row between peaks; rigs, domes, silos and pads on their tables.' },
  { id: 'shelf', letter: 'P2', name: 'A TABLE-LAND SHELF', land: shelf,
    note: 'A long flat shelf in front of all three rows, broken by gaps, banded cliff face; the base strung along its top.' },
  { id: 'terraces', letter: 'P3', name: 'OPEN-PIT TERRACES', land: terraces,
    note: 'Mining benches stepped into the middle row: a derrick on the top bench, a conveyor running down to an ore heap.' },
  { id: 'buttes', letter: 'P4', name: 'TALL BUTTES', land: buttes,
    note: 'Narrow sheer buttes rising out of the near row, each with a small base or rig on its top.' },
  { id: 'occasional', letter: 'P5', name: 'SHELVES AND BUTTES', land: occasional, moments: OCCASIONAL.map(o => o.at),
    note: 'P2’s shelf (with a rover patrolling its top) and P4’s buttes, coming by now and then — nine through a stage, alternating, once a pair of buttes together; each in view for about a sixth of the stage.' },
];
