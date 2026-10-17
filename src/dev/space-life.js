// SPACE CABINET — life outside the windows (lab only). Peter, 12 Oct 2026:
// "how do we populate the outside areas to make them alive?" … "go crazy i
// want it to look very exciting outside". Everything here is painted inside
// the window clip by the airbrushed-room vista (space-look-candidates.js),
// in four passes by depth:
//
//   sky    — behind the mountains: ships, satellites, meteors, aurora,
//            the mothership, a distant dogfight
//   ground — between the far and near ridges: outposts, towers with dishes
//            and searchlights, a launch pad, pumpjacks, a lander
//   front  — on the nearest ground: rovers, landing-light posts
//   near   — on the station hull, right by the glass: the tethered
//            astronaut and his drone, cargo pods on a line
//
// The rule: nothing out here may read as a hazard. Motion is slow or high,
// small, and never in the gate colours. Flat facets plus a little glow, so
// the whole lot costs a few dozen shapes a frame.
import { marsSaucer, saucerFleet, martianStanding, FLEET_SHAPES } from './mars-attacks-candidates.js';
// A flight's shape and size from its seed; `small` targets get one or two.
function flight(seed, small = false) {
  if (small) return hash(seed) < 0.55 ? { shape: 'single', n: 1 } : { shape: 'pair', n: 2 };
  const shape = FLEET_SHAPES[Math.floor(hash(seed) * FLEET_SHAPES.length)];
  return { shape, n: 3 + Math.floor(hash(seed + 1) * 3) };
}
const TAU = Math.PI * 2;
const hash = n => ((Math.sin(n * 78.233 + 12.9) * 43758.5453) % 1 + 1) % 1;
const clamp01 = v => Math.max(0, Math.min(1, v));
function poly(c, pts, fill) {
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath(); c.fillStyle = fill; c.fill();
}
function rect(c, x, y, w, h, fill) { c.fillStyle = fill; c.fillRect(x, y, w, h); }
function grad(c, x0, y0, x1, y1, stops) {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  for (const [o, col] of stops) g.addColorStop(o, col);
  return g;
}
function glow(c, x, y, r, rgb, a) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
}
function stroke(c, pts, ink, w) {
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.strokeStyle = ink; c.lineWidth = w; c.stroke();
}
// A periodic event: which occurrence we are in and how far into it.
function event(t, period, offset = 0) {
  const ev = Math.floor((t + offset) / period);
  return { ev, age: t + offset - ev * period };
}
// Visible items on a parallax layer: layer-space positions every `step`.
function* along(s, f, step, pad = 60) {
  const shift = s.cam * f;
  for (let k = Math.floor((shift - pad) / step) - 1; k * step < shift + s.view + pad; k++) yield [k, k * step - shift];
}
// POP-OUT TRACE. Nothing outside may appear or vanish while on screen (Peter,
// 13 Oct: "we must not have background items popping in or out while on
// screen"). When on, each object painter logs its name and view-space x per
// frame; tests/space-no-popout.js walks whole stages and fails on any object
// that appears or disappears with its whole width inside the frame.
export const OUTSIDE_TRACE = { on: false, frame: [] };
// `ending` marks an object being destroyed on screen (it explodes): its going is
// the picture, so the test excuses it.
// `y`, when given, lets the test see that something is still above the glass.
export function traceAt(name, x, half = 10, ending = false, y = null) { if (OUTSIDE_TRACE.on) OUTSIDE_TRACE.frame.push({ name, x, half, ending, y }); }
const HULL = { hi: '#f6f8fb', lit: '#e2e6ec', pale: '#c6ccd5', mid: '#a4acb8', dull: '#7f8794', dark: '#5e6672', deep: '#353b46' };
// Higher-poly pass (Peter, 13 Oct: "all the space life to have higher polygons
// and be more detailed"): five hull tones instead of three, every craft split
// into lit bands, canopies with a highlight facet, panel seams, nozzles,
// antennae and running lights. Same outlines and sizes as before.
const GLASS = ['#9fe6ff', '#e4f9ff', '#4aa6c8'];
function seams(c, pts, ink = 'rgba(20,24,34,0.3)', w = 0.25) {
  c.strokeStyle = ink; c.lineWidth = w; c.beginPath();
  for (const [x0, y0, x1, y1] of pts) { c.moveTo(x0, y0); c.lineTo(x1, y1); }
  c.stroke();
}
const WARM = '255,206,140', RED = '255,80,80', CYAN = '120,220,255';

// ------------------------------------------------------------- the craft
function shuttle(c, x, y, sc, dir, eng) {
  c.save(); c.translate(x, y); c.scale(sc * dir, sc);
  // Exhaust trail from twin nozzles.
  for (const ey of [-1.6, 1.6]) {
    c.fillStyle = grad(c, -15, ey, -46, ey, [[0, `rgba(${eng},0.55)`], [1, `rgba(${eng},0)`]]);
    c.beginPath(); c.moveTo(-15, ey - 1.3); c.lineTo(-46, ey); c.lineTo(-15, ey + 1.3); c.fill();
  }
  // Dorsal fin: two facets and a lit leading edge.
  poly(c, [[-3, -4.6], [-11, -11.5], [-13, -11.5], [-8, -4.8]], HULL.mid);
  poly(c, [[-3, -4.6], [-11, -11.5], [-10, -11.5], [-2, -4.4]], HULL.hi);
  poly(c, [[-13, -11.5], [-10, -11.5], [-10.5, -12.4], [-12.6, -12.4]], '#d4553e');
  // Fuselage in four bands, spine to belly.
  poly(c, [[20, 0], [12, -3], [2, -4.4], [-10, -5], [-14, -3.6], [-14, -2], [-10, -2.6], [2, -2.2], [12, -1.2]], HULL.hi);
  poly(c, [[20, 0], [12, -1.2], [2, -2.2], [-10, -2.6], [-14, -2], [-14, 0.4], [-10, 0.6], [2, 0.6], [12, 0.4]], HULL.lit);
  poly(c, [[20, 0], [12, 0.4], [2, 0.6], [-10, 0.6], [-14, 0.4], [-14, 2.6], [-10, 4.6], [2, 4.2], [12, 2.6]], HULL.pale);
  poly(c, [[12, 2.6], [2, 4.2], [-10, 4.6], [-9, 5.4], [2, 5], [10, 3.4]], HULL.dull);
  // Nose cap and a livery stripe.
  poly(c, [[20, 0], [16.5, -1.6], [16.5, 1.4]], '#d4553e');
  poly(c, [[2, -2.2], [-10, -2.6], [-10, -1.8], [2, -1.5]], '#d4553e');
  // Canopy: glass with a bright facet.
  poly(c, [[13.5, -1.2], [9, -3.3], [4.5, -3.4], [6, -1.4]], GLASS[0]);
  poly(c, [[9, -3.3], [4.5, -3.4], [6.2, -4.1]], GLASS[1]);
  poly(c, [[13.5, -1.2], [10, -1.4], [9, -2.2]], GLASS[2]);
  // Swept lower wing, three facets, and a wingtip light.
  poly(c, [[1, 2.4], [-9, 9], [-13, 9.4], [-8, 3.2]], HULL.mid);
  poly(c, [[1, 2.4], [-9, 9], [-7.5, 9], [2.4, 2.4]], HULL.lit);
  poly(c, [[-9, 9], [-13, 9.4], [-12.4, 10.3], [-9.5, 10]], HULL.dark);
  // Engine block with two nozzles.
  rect(c, -16, -3.2, 2.4, 6.4, HULL.dark);
  for (const ey of [-1.6, 1.6]) { rect(c, -16.6, ey - 1.1, 1.2, 2.2, HULL.deep); rect(c, -16.8, ey - 0.6, 0.6, 1.2, `rgba(${eng},0.95)`); }
  // Seams and portholes.
  seams(c, [[8, -2.8, 8, 2.4], [-2, -4.2, -2, 4], [-8, -4.8, -8, 4.4], [-14, 0.5, 12, 0.5]]);
  for (let i = 0; i < 5; i++) rect(c, -6 + i * 2.6, -1.2, 1, 0.7, `rgba(${WARM},0.9)`);
  glow(c, -12.8, 9.8, 1.5, RED, 0.75);   // steady: these have no clock
  glow(c, -17, 0, 5.5, eng, 0.95);
  c.restore();
}
function fighter(c, x, y, sc, dir, eng) {
  c.save(); c.translate(x, y); c.scale(sc * dir, sc);
  c.fillStyle = grad(c, -5, 0, -28, 0, [[0, `rgba(${eng},0.55)`], [1, `rgba(${eng},0)`]]);
  c.fillRect(-28, -0.7, 23, 1.4);
  // Upper and lower swept wings, each two facets.
  poly(c, [[1, -0.8], [-5, -5.6], [-7, -5.6], [-4, -0.8]], HULL.mid);
  poly(c, [[1, -0.8], [-5, -5.6], [-4.2, -5.6], [2, -0.8]], HULL.hi);
  poly(c, [[1, 0.8], [-5, 5.6], [-7, 5.6], [-4, 0.8]], HULL.dark);
  poly(c, [[-5, 5.6], [-7, 5.6], [-6.4, 6.3]], HULL.deep);
  // Fuselage: spine, flank, belly; a needle nose.
  poly(c, [[9, 0], [3, -1.4], [-5, -1.6], [-5, 0]], HULL.hi);
  poly(c, [[9, 0], [-5, 0], [-5, 1.5], [3, 1.3]], HULL.pale);
  poly(c, [[9, 0], [11.5, 0.1], [9, 0.4]], HULL.dark);
  poly(c, [[4.5, -0.6], [1.5, -2.2], [-0.6, -1.6]], GLASS[0]);
  poly(c, [[1.5, -2.2], [-0.6, -1.6], [0.4, -2.4]], GLASS[1]);
  rect(c, -6, -1.1, 1.4, 2.2, HULL.deep);
  glow(c, -5.5, 0, 3, eng, 0.9);
  c.restore();
}
function hauler(c, x, y, sc, dir) {
  traceAt('hauler', x, 32);
  c.save(); c.translate(x, y); c.scale(sc * dir, sc);
  // Spine truss the containers clamp to.
  rect(c, -46, -6.4, 52, 1, HULL.dull);
  seams(c, Array.from({ length: 13 }, (_, i) => [-46 + i * 4, -6.4, -44 + i * 4, -5.4]), HULL.dark, 0.25);
  // Cab: four facets, glass, a light bar.
  poly(c, [[21, -2], [14, -6.4], [6, -6.6], [6, -2.4]], HULL.hi);
  poly(c, [[21, -2], [6, -2.4], [6, 1.6], [20, 1]], HULL.lit);
  poly(c, [[20, 1], [6, 1.6], [6, 5.2], [12, 5.2]], HULL.pale);
  poly(c, [[12, 5.2], [6, 5.2], [6, 6], [10, 6]], HULL.dark);
  poly(c, [[17, -2.8], [13, -5.2], [9.5, -5.2], [9.5, -2.8]], GLASS[0]);
  poly(c, [[13, -5.2], [9.5, -5.2], [10.5, -5.9]], GLASS[1]);
  for (let i = 0; i < 4; i++) rect(c, 8 + i * 2.6, 2.6, 1.6, 0.7, `rgba(${WARM},0.9)`);
  rect(c, 6, -6.8, 4, 0.5, '#d4553e');
  // Containers: ribbed, lit top half and shaded lower half, corner fittings.
  const cols = [['#e6a25a', '#b9783a', '#7a4c22'], ['#6cc0b8', '#3e8e88', '#245a56'], ['#e27c68', '#b0503e', '#6e2e24'], ['#e8d27a', '#b8a24a', '#76662a']];
  for (let i = 0; i < 4; i++) {
    const bx = 4 - (i + 1) * 11, col = cols[i];
    rect(c, bx, -5, 10, 3.4, col[0]); rect(c, bx, -1.6, 10, 3.6, col[1]); rect(c, bx, 2, 10, 3, col[2]);
    for (let r = 1; r < 5; r++) rect(c, bx + r * 2, -5, 0.4, 10, 'rgba(0,0,0,0.16)');
    for (const [fx, fy] of [[bx, -5], [bx + 9.2, -5], [bx, 4.2], [bx + 9.2, 4.2]]) rect(c, fx, fy, 0.8, 0.8, HULL.deep);
    rect(c, bx + 10, -0.8, 1.2, 1.6, HULL.deep);
  }
  // Engine pod and nozzles.
  poly(c, [[-40, -4], [-46, -3], [-46, 3], [-40, 4]], HULL.dark);
  for (const ey of [-1.8, 1.8]) rect(c, -47, ey - 0.9, 1.2, 1.8, '#bff4ff');
  glow(c, -47, 0, 6, CYAN, 0.85);
  glow(c, 21, -2, 1.6, RED, 0.75);
  c.restore();
}

// ------------------------------------------------------------- more craft
// In place of the monorail (Peter, 13 Oct: "maybe it is too much and we have
// more flying vehicles"): skiffs skimming the ridges, a tug towing a
// container, and a lander that drops onto the ground and lifts off again.
function skiff(c, x, y, dir, t) {
  c.save(); c.translate(x, y); c.scale(dir, 1);
  c.fillStyle = grad(c, -6, 1, -40, 3, [[0, 'rgba(255,230,190,0.35)'], [1, 'rgba(255,230,190,0)']]);
  c.beginPath(); c.moveTo(-6, 0); c.lineTo(-40, 2.5); c.lineTo(-6, 2); c.closePath(); c.fill();
  // Hull: spine, flank, keel; outrigger fins.
  poly(c, [[10, 0], [3, -2.4], [-5, -2.6], [-8, -1.2], [-8, 0]], HULL.hi);
  poly(c, [[10, 0], [-8, 0], [-7, 1.4], [5, 1.4]], HULL.pale);
  poly(c, [[5, 1.4], [-7, 1.4], [-6, 2.2], [3, 2.2]], HULL.dull);
  poly(c, [[-4, -2.4], [-8, -5], [-9.4, -5], [-7, -2]], HULL.mid);
  poly(c, [[-4, 1.6], [-9, 3.6], [-10, 3.4], [-7, 1.4]], HULL.dark);
  poly(c, [[4, -1.2], [0, -3.8], [-2.6, -3.4], [-2, -1.6]], GLASS[0]);
  poly(c, [[0, -3.8], [-2.6, -3.4], [-1.6, -4.3]], GLASS[1]);
  rect(c, 8, -0.7, 2, 0.6, '#d4553e');
  rect(c, -9, -0.9, 1.2, 1.8, HULL.deep);
  glow(c, -9.4, 0, 3, CYAN, 0.8);
  glow(c, -1, 3, 4, '120,220,255', 0.5 + 0.2 * Math.sin(t * 12));
  c.restore();
}
function skiffPair(c, s, u, ev) {
  const dir = 1, pad = 100;
  const x = dir > 0 ? -pad + u * (s.view + pad * 2) : s.view + pad - u * (s.view + pad * 2);
  const y = -104 - hash(ev + 120) * 14 + (u - 0.5) * -14;      // upper sky, climbing
  traceAt('skiffs', x - 9, 20);
  const bank = -dir * 0.12 + Math.sin(s.t * 4 + ev) * 0.04;
  for (const [dx, dy, dt] of [[0, 0, 0], [-dir * 18, 5, 1]]) {
    c.save(); c.translate(x + dx, y + dy + Math.sin(s.t * 5 + dt) * 0.8); c.rotate(bank);
    skiff(c, 0, 0, dir, s.t + dt); c.restore();
  }
}
function skiffs(c, s) {
  const { ev, age } = event(s.t, 7, 3);
  if (age > 3.2) return;
  skiffPair(c, s, age / 3.2, ev);
}
function tug(c, x, y, dir, t) {
  traceAt('tug', x, 42);
  c.save(); c.translate(x, y); c.scale(dir, 1);
  const sway = Math.sin(t * 0.9) * 1.5;
  stroke(c, [[-5, 0], [-14, 2 + sway * 0.5], [-24, 3 + sway]], 'rgba(220,220,210,0.8)', 0.4);
  c.save(); c.translate(-30, 3 + sway); c.rotate(sway * 0.03);
  rect(c, -7, -4, 14, 2.6, '#e6a25a'); rect(c, -7, -1.4, 14, 2.8, '#b9783a'); rect(c, -7, 1.4, 14, 2.6, '#7a4c22');
  for (let i = 1; i < 7; i++) rect(c, -7 + i * 2, -4, 0.35, 8, 'rgba(0,0,0,0.18)');
  for (const [fx, fy] of [[-7, -4], [6.2, -4], [-7, 3.2], [6.2, 3.2]]) rect(c, fx, fy, 0.8, 0.8, HULL.deep);
  rect(c, -1, -4.8, 2, 0.8, HULL.dark);   // lifting eye
  c.restore();
  // Tug body: cab, flank, belly; a winch at the back, a light mast.
  poly(c, [[7, -1], [3, -4.4], [-5, -4.4], [-5, -1.6]], HULL.hi);
  poly(c, [[7, -1], [-5, -1.6], [-5, 1.2], [6, 0.6]], HULL.lit);
  poly(c, [[6, 0.6], [-5, 1.2], [-5, 2.6], [4, 2.6]], HULL.pale);
  poly(c, [[4, 2.6], [-5, 2.6], [-4, 3.4], [3, 3.4]], HULL.dull);
  poly(c, [[5, -1.4], [2.4, -3.6], [0, -3.6], [0, -1.6]], GLASS[0]);
  poly(c, [[2.4, -3.6], [0, -3.6], [0.8, -4.1]], GLASS[1]);
  c.beginPath(); c.arc(-5, 0, 1.6, 0, TAU); c.fillStyle = HULL.dark; c.fill();
  c.beginPath(); c.arc(-5, 0, 0.7, 0, TAU); c.fillStyle = HULL.mid; c.fill();
  rect(c, -3, -4.4, 6, 0.5, '#f0b23c'); rect(c, -2, -4.4, 1, 0.5, '#2b313c'); rect(c, 0, -4.4, 1, 0.5, '#2b313c');
  stroke(c, [[2, -4.4], [2, -7]], HULL.dark, 0.35);
  for (const ey of [-2.6, 1.4]) rect(c, -6.2, ey, 1, 1.4, HULL.deep);
  glow(c, -6.6, -1, 3, '255,190,90', 0.9);
  if (Math.sin(t * 5) > 0) glow(c, 2, -7, 2, RED, 0.9);
  c.restore();
}
function tugs(c, s) {
  const { ev, age } = event(s.t, 17, 11);
  if (age > 12) return;
  const u = age / 12, dir = ev % 2 ? -1 : 1, y = -70 - hash(ev + 140) * 20;
  tug(c, dir > 0 ? -60 + u * (s.view + 120) : s.view + 60 - u * (s.view + 120), y, dir, s.t);
}
function lander(c, x, y, t, legs) {
  const fire = 0.6 + 0.4 * Math.sin(t * 20);
  c.fillStyle = grad(c, x, y + 3, x, y + 14, [[0, `rgba(255,210,150,${0.5 * fire})`], [1, 'rgba(255,210,150,0)']]);
  c.beginPath(); c.moveTo(x - 4, y + 3); c.lineTo(x - 7, y + 14); c.lineTo(x + 7, y + 14); c.lineTo(x + 4, y + 3); c.closePath(); c.fill();
  // Four legs (two seen edge-on), struts and pads.
  for (const sx of [-1, 1]) {
    const fx = x + sx * (4 + legs * 3.4), fy = y + 5 + legs * 2;
    stroke(c, [[x + sx * 3, y + 2], [fx, fy]], HULL.dark, 0.7);
    stroke(c, [[x + sx * 4.4, y - 0.6], [x + sx * (3.4 + legs * 2.2), y + 3.4 + legs]], HULL.dull, 0.4);
    rect(c, fx - 1.1, fy - 0.3, 2.2, 0.7, HULL.deep);
  }
  // Descent stage: octagonal skirt in three facets, gold foil band.
  poly(c, [[x - 5.6, y + 3.4], [x - 6.4, y + 0.6], [x - 2, y + 0.6], [x - 2, y + 3.4]], HULL.pale);
  poly(c, [[x - 2, y + 0.6], [x + 2, y + 0.6], [x + 2, y + 3.4], [x - 2, y + 3.4]], HULL.mid);
  poly(c, [[x + 2, y + 0.6], [x + 6.4, y + 0.6], [x + 5.6, y + 3.4], [x + 2, y + 3.4]], HULL.dark);
  rect(c, x - 6, y + 1.4, 12, 0.9, '#d8a84a'); rect(c, x - 6, y + 1.4, 3, 0.9, '#f2cc70');
  // Ascent stage: faceted cabin, glass, dish, RCS quads.
  poly(c, [[x - 6, y + 0.6], [x - 5, y - 3], [x - 2, y - 5.4], [x - 1, y + 0.6]], HULL.hi);
  poly(c, [[x - 1, y + 0.6], [x - 2, y - 5.4], [x + 3, y - 5.4], [x + 3, y + 0.6]], HULL.lit);
  poly(c, [[x + 3, y + 0.6], [x + 3, y - 5.4], [x + 5, y - 3.6], [x + 6, y + 0.6]], HULL.dull);
  poly(c, [[x - 1, y - 3.8], [x + 2.4, y - 3.8], [x + 2.4, y - 2], [x - 1, y - 2]], GLASS[0]);
  rect(c, x - 1, y - 3.8, 3.4, 0.5, GLASS[1]);
  stroke(c, [[x + 4, y - 4.6], [x + 5.4, y - 7]], HULL.dark, 0.35);
  c.beginPath(); c.ellipse(x + 5.6, y - 7.3, 1.6, 0.9, -0.5, 0, TAU); c.fillStyle = HULL.lit; c.fill();
  for (const sx of [-1, 1]) rect(c, x + sx * 5.6 - 0.6, y - 2.4, 1.2, 1.2, HULL.deep);
  glow(c, x, y + 4, 4, '255,200,140', 0.8 * fire);
  if (Math.sin(t * 4) > 0) glow(c, x + 6, y - 1, 1.8, '120,255,140', 0.95);
}
function landers(c, s) {
  // Down out of the sky, sits with its lights on, lifts off: every 16 s.
  const { ev, age } = event(s.t, 16, 5);
  if (age > 9) return;
  const x = s.view * (0.2 + hash(ev + 150) * 0.6), ground = GROUND_Y - 7;
  const down = age < 3 ? 1 - age / 3 : age < 6 ? 0 : (age - 6) / 3;
  if (down < 0.25) glow(c, x, GROUND_Y, 14 * (0.25 - down) * 4 + 0.1, '255,220,170', 0.35);
  lander(c, x, ground - down * down * 90, s.t, 1 - Math.min(1, down * 3));
}

// ------------------------------------------------------------- visitors
// Peter, 13 Oct: "how about adding a Martian style and/or flying saucer like
// vehicle and/or alien?" … then: the Martian at the saucer's controls, bigger;
// no plateau aliens, no tripod. A saucer that drops in, beams the ground and
// zips off.
function saucer(c, x, y, t, beam = 0, sc = 1.25, smile = 1) {
  traceAt('saucer', x, 18);
  // After Peter's reference (13 Oct, "perhaps along these lines"): a mint
  // saucer with a dark collar ring under a tall glass dome, ringed lime
  // portholes, a dark rim band and a glowing belly; at the controls a green
  // one-eyed blob filling the dome, grinning.
  if (beam > 0) {
    c.fillStyle = grad(c, x, y + 8, x, y + 84, [[0, `rgba(170,255,190,${0.45 * beam})`], [1, 'rgba(170,255,190,0)']]);
    c.beginPath(); c.moveTo(x - 6, y + 8); c.lineTo(x + 6, y + 8); c.lineTo(x + 20, y + 84); c.lineTo(x - 20, y + 84); c.closePath(); c.fill();
  }
  c.save(); c.translate(x, y); c.scale(sc, sc);
  // A roomier dome (13 Oct: "more glass so he's not so cramped").
  const R = 12, D = 8.2, DH = 15.6, DY = -4.2;   // the dome sits on the bowl's crown
  const MINT = ['#eafaf5', '#c9eee4', '#a6ddd0', '#82c6b8', '#5ea79a', '#3f8076'];
  glow(c, 0, 4, 11, '150,255,220', 0.3);
  const shoulder = x2 => -4.2 * (1 - Math.pow(x2 / R, 2)) - 0.4;   // a deep bowl, as in the reference
  // Upper hull: eight panels from the rim up to the collar, lit from the left.
  for (let i = 0; i < 8; i++) {
    const x0 = -R + i * (R * 2 / 8), x1 = x0 + R * 2 / 8;
    const top0 = shoulder(x0), top1 = shoulder(x1);
    poly(c, [[x0, 0], [x0, top0], [x1, top1], [x1, 0]], MINT[[1, 0, 0, 1, 1, 2, 3, 4][i]]);
  }
  seams(c, Array.from({ length: 7 }, (_, i) => { const xx = -R + (i + 1) * 3; return [xx, 0, xx * 0.92, shoulder(xx)]; }), 'rgba(40,90,82,0.35)', 0.18);
  // Portholes: three big across the front, two small at the sides.
  for (const [px, pr] of [[-6, 1.05], [0, 1.2], [6, 1.05], [-9.6, 0.6], [9.6, 0.6]]) {
    const py = -1.6 + Math.abs(px) * 0.06;
    c.beginPath(); c.arc(px, py, pr + 0.35, 0, TAU); c.fillStyle = '#56606a'; c.fill();
    c.beginPath(); c.arc(px, py, pr, 0, TAU); c.fillStyle = grad(c, px, py - pr, px, py + pr, [[0, '#e8ff9a'], [1, '#86c43a']]); c.fill();
    c.beginPath(); c.arc(px - pr * 0.35, py - pr * 0.35, pr * 0.3, 0, TAU); c.fillStyle = 'rgba(255,255,255,0.8)'; c.fill();
  }
  // Dome: glass back, pilot, glass front with a highlight.
  c.save(); c.beginPath(); c.ellipse(0, DY, D, DH, 0, Math.PI, 0); c.closePath(); c.clip();
  c.fillStyle = 'rgba(200,240,235,0.32)'; c.fillRect(-D, DY - DH, D * 2, DH);
  c.save(); c.translate(0, DY); c.scale(0.78, 0.78); cyclops(c, 0, 0, t, smile); c.restore();
  c.fillStyle = grad(c, -D, DY - DH, D, DY, [[0, 'rgba(255,255,255,0.3)'], [0.3, 'rgba(255,255,255,0.06)'], [1, 'rgba(255,255,255,0)']]);
  c.fillRect(-D, DY - DH, D * 2, DH);
  c.restore();
  c.beginPath(); c.ellipse(0, DY, D, DH, 0, Math.PI, 0); c.strokeStyle = 'rgba(225,250,245,0.9)'; c.lineWidth = 0.3; c.stroke();
  c.beginPath(); c.ellipse(-3.4, DY - 9, 0.8, 2.6, 0.25, 0, TAU); c.fillStyle = 'rgba(255,255,255,0.55)'; c.fill();
  c.beginPath(); c.ellipse(3.8, DY - 4, 0.45, 1.3, -0.2, 0, TAU); c.fillStyle = 'rgba(255,255,255,0.4)'; c.fill();
  // Collar ring at the dome's foot.
  c.beginPath(); c.roundRect(-D - 1.6, DY - 0.6, (D + 1.6) * 2, 1.8, 0.9); c.fillStyle = '#56606a'; c.fill();
  rect(c, -D - 1, DY - 0.6, (D + 1) * 2, 0.4, '#8a96a0');
  // Rim band, then the underside and its glowing bulb.
  c.beginPath(); c.moveTo(-R - 0.6, 0); c.lineTo(R + 0.6, 0); c.lineTo(R - 0.2, 1.6); c.lineTo(-R + 0.2, 1.6); c.closePath(); c.fillStyle = '#4a545e'; c.fill();
  rect(c, -R - 0.4, 0, R * 2 + 0.8, 0.35, '#7e8a94');
  for (let i = 0; i < 9; i++) { const lx = -R + 1.4 + i * 2.65, on = ((t * 10 - i) % 9 + 9) % 9 < 2; if (on) glow(c, lx, 0.9, 1.4, '255,230,140', 0.95); }
  poly(c, [[-R + 0.2, 1.6], [R - 0.2, 1.6], [7.6, 4.6], [-7.6, 4.6]], MINT[4]);
  poly(c, [[-R + 0.2, 1.6], [-3, 1.6], [-2.4, 4.6], [-7.6, 4.6]], MINT[3]);
  rect(c, -7.6, 4.4, 15.2, 0.5, MINT[5]);
  c.beginPath(); c.ellipse(0, 4.9, 4, 1.7, 0, 0, Math.PI); c.fillStyle = grad(c, 0, 3.9, 0, 5.6, [[0, '#bff6ff'], [1, '#4cc8e8']]); c.fill();
  glow(c, 0, 5.8, 5, '150,240,255', 0.5 + 0.2 * Math.sin(t * 6));
  c.restore();
}
function cyclops(c, x, base, t, smile = 1) {
  // A green one-eyed blob: a rounded body filling the dome, a huge eye with a
  // blue iris that glances about and blinks, a toothy grin, two bobble
  // antennae, and tentacles slumped over the collar.
  const G = ['#b6ec6c', '#8ccf44', '#62a32e', '#3f7420'];
  const bob = Math.sin(t * 2.4) * 0.3, look = Math.sin(t * 0.9) * 0.7, blink = ((t % 3.7) + 3.7) % 3.7 < 0.14;
  c.save(); c.translate(x, base + bob);
  // Antennae.
  for (const sx of [-1, 1]) {
    c.beginPath(); c.moveTo(sx * 2, -11.6); c.quadraticCurveTo(sx * 2.6, -13.6, sx * 3.6, -14.4);
    c.strokeStyle = G[1]; c.lineWidth = 0.8; c.stroke();
    c.beginPath(); c.arc(sx * 3.7, -14.5, 1, 0, TAU); c.fillStyle = G[1]; c.fill();
    c.beginPath(); c.arc(sx * 3.4, -14.8, 0.35, 0, TAU); c.fillStyle = G[0]; c.fill();
  }
  // Body.
  c.beginPath(); c.moveTo(-5.4, 0.4); c.lineTo(-5.4, -7); c.bezierCurveTo(-5.4, -13.4, 5.4, -13.4, 5.4, -7); c.lineTo(5.4, 0.4); c.closePath();
  c.fillStyle = G[1]; c.fill();
  c.save(); c.clip();
  c.beginPath(); c.ellipse(-2.4, -8, 3.4, 6, 0, 0, TAU); c.fillStyle = G[0]; c.globalAlpha = 0.55; c.fill(); c.globalAlpha = 1;
  c.fillStyle = G[2]; c.fillRect(3.6, -12, 2, 13);
  c.restore();
  // The eye: green rim, white, blue iris with streaks, pupil, glints.
  const ex = 0, ey = -8.2;
  c.beginPath(); c.arc(ex, ey, 3.6, 0, TAU); c.fillStyle = G[2]; c.fill();
  c.beginPath(); c.arc(ex, ey, 3.15, 0, TAU); c.fillStyle = '#fbfff4'; c.fill();
  if (blink) {
    c.beginPath(); c.arc(ex, ey, 3.2, 0, TAU); c.fillStyle = G[1]; c.fill();
    c.beginPath(); c.moveTo(ex - 3, ey + 0.2); c.quadraticCurveTo(ex, ey + 1.4, ex + 3, ey + 0.2); c.strokeStyle = G[3]; c.lineWidth = 0.35; c.stroke();
  } else {
    const ix = ex + look, iy = ey + 0.15;
    c.beginPath(); c.arc(ix, iy, 2, 0, TAU); c.fillStyle = grad(c, ix, iy - 2, ix, iy + 2, [[0, '#8fd8f4'], [1, '#2f86b8']]); c.fill();
    c.strokeStyle = 'rgba(30,90,140,0.5)'; c.lineWidth = 0.12; c.beginPath();
    for (let i = 0; i < 16; i++) { const a = i * TAU / 16; c.moveTo(ix + Math.cos(a) * 1, iy + Math.sin(a) * 1); c.lineTo(ix + Math.cos(a) * 1.9, iy + Math.sin(a) * 1.9); }
    c.stroke();
    c.beginPath(); c.arc(ix, iy, 0.95, 0, TAU); c.fillStyle = '#0b0f14'; c.fill();
    c.beginPath(); c.arc(ix + 0.75, iy - 0.75, 0.42, 0, TAU); c.fillStyle = '#ffffff'; c.fill();
    c.beginPath(); c.arc(ix + 1.2, iy - 0.1, 0.18, 0, TAU); c.fill();
  }
  // The grin with its teeth.
  // `smile` 0 is a small flat mouth; 1 the full toothy grin (he breaks into
  // it as he flies past).
  const m = Math.max(0, Math.min(1, smile)), half = 1.6 + 1.8 * m, lip = -3.4 - 0.4 * m;
  c.beginPath(); c.moveTo(-half, lip); c.quadraticCurveTo(0, lip + 0.4 + 2.2 * m, half, lip); c.quadraticCurveTo(0, lip + 0.3 + 1 * m, -half, lip); c.closePath();
  c.fillStyle = G[3]; c.fill();
  if (m < 0.2) { c.beginPath(); c.moveTo(-half, lip); c.quadraticCurveTo(0, lip + 0.5, half, lip); c.strokeStyle = G[3]; c.lineWidth = 0.35; c.stroke(); }
  if (m > 0.3) {
    c.save(); c.globalAlpha *= Math.min(1, (m - 0.3) / 0.4);
    for (const [tx, tw, th] of [[-2.4, 0.8, 1], [-1, 0.8, 1.3], [0.5, 0.8, 1.2], [1.9, 0.8, 1]]) {
      const kx = tx * half / 3.4, ty = lip + 0.5 + Math.abs(kx) * 0.12;
      poly(c, [[kx - tw / 2, ty], [kx + tw / 2, ty], [kx, ty + th * m]], '#fff3c8');
    }
    c.restore();
  }
  if (m > 0.6) for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * (half + 0.3), lip - 0.6, 0.7, 0.35, sx * 0.6, 0, TAU); c.fillStyle = 'rgba(255,140,150,0.35)'; c.fill(); }
  // Tentacles slumped over the collar.
  for (const [tx, s2] of [[-5.6, -1], [-3, 1], [3, -1], [5.6, 1]]) {
    c.beginPath(); c.ellipse(tx, 0.2 + Math.sin(t * 3 + tx) * 0.15, 1.6, 0.9, s2 * 0.3, 0, TAU); c.fillStyle = G[1]; c.fill();
    c.beginPath(); c.ellipse(tx - 0.4, -0.05, 0.8, 0.35, s2 * 0.3, 0, TAU); c.fillStyle = G[0]; c.fill();
  }
  c.restore();
}

// ------------------------------------------------------------- sky
const ENGINES = ['255,120,200', CYAN, '255,190,90'];
const engine = n => ENGINES[((n % 3) + 3) % 3];
function ships(c, s) {
  // Shuttles: one every 9 s, alternating direction, high in the sky.
  {
    const { ev, age } = event(s.t, 9, 2);
    if (age < 5) {
      const u = age / 5, dir = ev % 2 ? 1 : -1;
      const x = dir > 0 ? -40 + u * (s.view + 80) : s.view + 40 - u * (s.view + 80);
      shuttle(c, x, -118 + hash(ev * 3 + 1) * 34, 0.5 + hash(ev * 3 + 2) * 0.3, dir, engine(ev));
    }
  }
  // A container hauler crawls through every 23 s.
  {
    const { ev, age } = event(s.t, 23, 9);
    if (age < 16) {
      const u = age / 16, dir = ev % 2 ? -1 : 1;
      const x = dir > 0 ? -60 + u * (s.view + 120) : s.view + 60 - u * (s.view + 120);
      hauler(c, x, -86 - hash(ev + 40) * 14, 0.55, dir);
    }
  }
  // A V of three fighters streaks over every 13 s.
  {
    const { ev, age } = event(s.t, 13, 6);
    if (age < 2.2) {
      const u = age / 2.2, dir = ev % 2 ? 1 : -1, y = -124 + hash(ev + 70) * 16;
      const x = dir > 0 ? -50 + u * (s.view + 100) : s.view + 50 - u * (s.view + 100);
      for (const [dx, dy] of [[0, 0], [-9, -5], [-9, 5]]) fighter(c, x + dx * dir, y + dy, 0.7, dir, engine(ev + 1));
    }
  }
}
function satellites(c, s) {
  for (const [k, x] of along(s, 0.02, 170)) {
    satellite(c, x + hash(k) * 60, -122 + hash(k + 11) * 44, s.t, k);
  }
}
function satellite(c, sx, y, t, k, sc = 1.6) {
  traceAt('satellite', sx, 22);
  // 1.6x since 13 Oct ("satellites work … possibly a bit bigger").
  c.save(); c.translate(sx, y); c.scale(sc, sc); c.translate(-sx, -y);
  satelliteBody(c, sx, y, t, k);
  c.restore();
}
function satelliteBody(c, sx, y, t, k) {
  const r = t * 0.5 + k, cs = Math.cos(r);
  const pw = 9 * Math.abs(cs), front = cs > 0;
  // Two solar wings: cells in a grid, a frame, a boom to the body.
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? sx - 2.6 - pw : sx + 2.6;
    rect(c, x0, y - 1.8, pw, 3.6, front ? '#4f78c0' : '#22325e');
    if (pw > 2) {
      for (let i = 1; i < 4; i++) rect(c, x0 + pw * i / 4, y - 1.8, 0.25, 3.6, front ? '#7fa2e0' : '#1a2648');
      rect(c, x0, y - 0.1, pw, 0.25, front ? '#7fa2e0' : '#1a2648');
      rect(c, x0, y - 1.8, pw, 0.35, front ? '#a8c4f0' : '#2e4070');
    }
    rect(c, side < 0 ? sx - 2.6 : sx + 2, y - 0.25, 0.6, 0.5, HULL.dark);
  }
  // Body: a three-faced box with gold foil, a dish and a whip antenna.
  poly(c, [[sx - 2, y - 2.4], [sx - 1, y - 3.2], [sx + 2.6, y - 3.2], [sx + 2, y - 2.4]], HULL.hi);
  rect(c, sx - 2, y - 2.4, 4, 4.6, '#d8a84a'); rect(c, sx - 2, y - 2.4, 1.6, 4.6, '#f2cc70');
  poly(c, [[sx + 2, y - 2.4], [sx + 2.6, y - 3.2], [sx + 2.6, y + 1.4], [sx + 2, y + 2.2]], '#8a6420');
  seams(c, [[sx - 2, y, sx + 2, y]], 'rgba(0,0,0,0.25)', 0.25);
  c.beginPath(); c.ellipse(sx, y + 3.4, 1.8, 0.8, 0, 0, TAU); c.fillStyle = HULL.lit; c.fill();
  stroke(c, [[sx, y + 2.2], [sx, y + 3.4]], HULL.dark, 0.3);
  stroke(c, [[sx + 1, y - 3.2], [sx + 2.8, y - 6.6]], HULL.dull, 0.25);
  if (((t + k) % 1.6 + 1.6) % 1.6 < 0.2) glow(c, sx + 2.8, y - 6.6, 2.5, RED, 0.9);
}
function meteors(c, s) {
  const { ev, age } = event(s.t, 21, 4);
  if (age > 2.2) return;
  for (let i = 0; i < 7; i++) {
    const p = (age - i * 0.18) / 0.8;
    if (p < 0 || p > 1) continue;
    const hx = s.view * (0.25 + hash(i + ev * 7) * 0.8) - p * 90, hy = -132 + p * 50 + hash(i + ev * 5) * 12;
    meteor(c, hx, hy);
  }
}
function meteor(c, hx, hy) {
  c.strokeStyle = grad(c, hx, hy, hx + 20, hy - 11, [[0, 'rgba(255,245,220,0.85)'], [1, 'rgba(255,245,220,0)']]);
  c.lineWidth = 0.9; c.lineCap = 'round';
  c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + 20, hy - 11); c.stroke();
  glow(c, hx, hy, 2.5, '255,240,210', 0.9);
}
const AURORA = { DUSK: ['255,120,220', '255,180,120'], 'AMBER & TEAL': ['120,255,220', '255,210,120'],
  'COLD DAWN': ['160,200,255', '220,180,255'], JADE: ['110,255,160', '235,120,255'] };
// The borealis only shows for part of the stage (Peter, 13 Oct): it fades in
// from 10% and out by 40%, before the mothership has its
// turn. Without a progress (the objects page) it is always on.
const AURORA_SPAN = [0.08, 0.3], AURORA_FADE = 0.05;
function auroraAmount(s) {
  if (s.progress == null) return 1;
  const [a, b] = AURORA_SPAN;
  return clamp01(Math.min((s.progress - a) / AURORA_FADE, (b - s.progress) / AURORA_FADE));
}
function aurora(c, s, look) {
  const amount = auroraAmount(s);
  if (amount <= 0) return;
  // A borealis curtain: each ribbon is a run of thin vertical rays, brightest
  // at the lower hem and fading upward, added with 'lighter' so it glows over
  // the sky. Ray brightness flickers along the ribbon, and the hem ripples.
  const cols = AURORA[look.pal?.name] ?? AURORA.DUSK;
  c.save(); c.globalCompositeOperation = 'lighter';
  cols.forEach((col, j) => {
    const strength = (j ? 0.16 : 0.32) * amount, tall = j ? 16 : 26;
    for (let x = -4; x <= s.view + 4; x += 3) {
      const hem = -104 - j * 12 + 6 * Math.sin(x / 41 + s.t * 0.3 + j * 2 + s.cam * 0.004) + 3 * Math.sin(x / 15 - s.t * 0.45 + j);
      const h = tall + 8 * Math.sin(x / 23 + s.t * 0.5 + j * 3);
      const ray = 0.55 + 0.45 * Math.sin(x * 0.9 + s.t * 1.7 + j * 5) * Math.sin(x * 0.23 - s.t * 0.6);
      const g = c.createLinearGradient(0, hem, 0, hem - h);
      g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(0.08, `rgba(${col},${strength * ray})`);
      g.addColorStop(0.35, `rgba(${col},${strength * ray * 0.5})`); g.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = g; c.fillRect(x, hem - h, 3.2, h + 1);
    }
  });
  c.restore();
}
// The borealis in facets (Peter, 13 Oct: "would a polygonic borealis work?"):
// the same curtain cut into flat triangles — a strip of quads whose tops lean
// left and right like folds, each triangle one stepped brightness, added with
// 'lighter'. A bright hem of small triangles runs along the bottom edge.
function auroraFacets(c, s, look) {
  const amount = auroraAmount(s);
  if (amount <= 0) return;
  const cols = AURORA[look.pal?.name] ?? AURORA.DUSK;
  c.save(); c.globalCompositeOperation = 'lighter';
  cols.forEach((col, j) => {
    const step = 11, strength = (j ? 0.14 : 0.26) * amount, tall = j ? 15 : 24;
    const pts = [];
    for (let x = -step * 2; x <= s.view + step * 2; x += step) {
      const hem = -104 - j * 12 + 6 * Math.sin(x / 41 + s.t * 0.3 + j * 2 + s.cam * 0.004) + 3 * Math.sin(x / 15 - s.t * 0.45 + j);
      const h = tall + 7 * Math.sin(x / 23 + s.t * 0.5 + j * 3);
      const lean = 5 * Math.sin(x / 9 + s.t * 0.7 + j);
      pts.push({ x, hem, top: [x + lean, hem - h] });
    }
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1];
      // Stepped brightness per facet: three levels, drifting along the ribbon.
      const lv = k => [0.35, 0.65, 1][Math.floor(((Math.sin(i * 1.7 + k + s.t * 0.9 + j * 4) + 1) / 2) * 2.999)];
      poly(c, [[a.x, a.hem], a.top, [b.x, b.hem]], `rgba(${col},${strength * lv(0)})`);
      poly(c, [a.top, b.top, [b.x, b.hem]], `rgba(${col},${strength * 0.55 * lv(2)})`);
      // The hem: a thin bright sawtooth along the bottom edge.
      const mx = (a.x + b.x) / 2, my = (a.hem + b.hem) / 2;
      poly(c, [[a.x, a.hem], [mx, my - 3.5], [b.x, b.hem], [mx, my + 0.6]], `rgba(${col},${strength * 1.5 * lv(4)})`);
    }
  });
  c.restore();
}

// The big moment: a capital ship slides across the whole sky mid-stage.
function mothership(c, s) {
  const u = (s.progress - 0.5) / 0.3;
  if (u < -0.6 || u > 0.6) return;
  mothershipAt(c, s.view / 2 - u * (s.view + 340), -92, s.t, 0.72); // masts to keel inside the glass
}
// The capital ship (Peter, 13 Oct: "needs a huge amount of additional detail
// to justify being there"). Local units, nose to the right: about 300 long.
// Layers back to front: engine plumes, hull facets, panel seams, stripe and
// registry, superstructure (towers, bridge, dish, masts, comms array), the
// hangar with traffic, sponsons and turrets, window decks, running lights,
// a belly searchlight and two escorts flying station.
function block(c, x, y, w, h, lip = 2) {
  poly(c, [[x, y], [x + lip, y - lip], [x + w + lip, y - lip], [x + w, y]], HULL.lit);   // roof
  rect(c, x, y, w, h, HULL.mid);
  poly(c, [[x + w, y], [x + w + lip, y - lip], [x + w + lip, y + h - lip], [x + w, y + h]], HULL.dark);
}
function mothershipAt(c, x, y, t, sc = 1) {
  c.save(); c.translate(x, y); c.scale(sc, sc);
  // Engines: three nozzles with pulsing plumes behind the hull.
  const pulse = 0.75 + 0.25 * Math.sin(t * 9);
  for (const ey of [-11, -2, 7]) {
    c.fillStyle = grad(c, -160, ey, -215, ey, [[0, `rgba(${CYAN},${0.55 * pulse})`], [1, `rgba(${CYAN},0)`]]);
    c.beginPath(); c.moveTo(-160, ey - 3.5); c.lineTo(-215, ey); c.lineTo(-160, ey + 3.5); c.closePath(); c.fill();
    poly(c, [[-150, ey - 4], [-161, ey - 3], [-161, ey + 3], [-150, ey + 4]], HULL.deep);
    rect(c, -161.5, ey - 2.4, 1.6, 4.8, '#bff4ff');
    glow(c, -162, ey, 8, CYAN, 0.8 * pulse);
  }
  // Hull: a long prow, a mid hull, a stepped belly, all flat facets.
  poly(c, [[-150, -6], [-120, -16], [40, -18], [110, -6], [150, -2], [110, 0], [-150, 0]], HULL.mid);
  poly(c, [[-120, -16], [-80, -26], [10, -26], [40, -18]], HULL.lit);
  poly(c, [[40, -18], [110, -6], [150, -2], [104, -9]], '#c9ced6');
  poly(c, [[-150, 0], [110, 0], [150, -2], [90, 9], [-130, 10]], HULL.dark);
  poly(c, [[-130, 10], [90, 9], [60, 15], [-110, 15]], HULL.deep);
  // Panel seams and a deck line.
  c.strokeStyle = 'rgba(20,24,34,0.28)'; c.lineWidth = 0.35; c.beginPath();
  for (let px = -140; px < 100; px += 11) { c.moveTo(px, -15); c.lineTo(px + 1, 0); }
  for (let px = -126; px < 80; px += 14) { c.moveTo(px, 0.5); c.lineTo(px - 2, 9); }
  c.moveTo(-148, -7.5); c.lineTo(108, -7.5); c.stroke();
  for (let i = 0; i < 40; i++) if (hash(i + 500) > 0.6) rect(c, -140 + i * 6, -14 + hash(i + 520) * 12, 3 + hash(i + 540) * 4, 1.2, 'rgba(255,255,255,0.12)');
  // Livery: a red stripe and the registry.
  rect(c, -70, -12.6, 150, 1.6, '#d4553e'); rect(c, -70, -11, 150, 0.5, '#f0b23c');
  c.fillStyle = '#2b313c'; c.font = 'bold 4px sans-serif'; c.fillText('MSV-88  TITAN', 52, -14);
  // Superstructure along the spine.
  block(c, -112, -22, 14, 6); block(c, -95, -30, 10, 10); block(c, -14, -30, 12, 6); block(c, 14, -24, 18, 6);
  poly(c, [[-60, -26], [-52, -38], [-28, -38], [-22, -26]], HULL.lit);                 // bridge tower
  poly(c, [[-28, -38], [-22, -26], [-19, -27], [-25, -38]], HULL.dark);
  rect(c, -51, -36, 22, 2.2, '#7fd8ff'); rect(c, -51, -36, 22, 0.6, 'rgba(255,255,255,0.7)');
  for (let i = 0; i < 6; i++) rect(c, -50 + i * 3.6, -32, 1.4, 0.8, `rgba(${WARM},0.9)`);
  // Masts with blinking tips, a comms array, a turning dish.
  for (const [mx, top] of [[-40, -48], [-90, -40], [22, -34]]) {
    stroke(c, [[mx, -26], [mx, top]], HULL.mid, 0.5);
    if (Math.sin(t * 4 + mx) > 0.3) glow(c, mx, top, 3, RED, 0.95);
  }
  for (let i = 0; i < 6; i++) stroke(c, [[-8 + i * 1.6, -30], [-8 + i * 1.6, -34 - (i % 2) * 2]], HULL.dark, 0.35);
  const turn = Math.cos(t * 0.8);
  stroke(c, [[-88, -30], [-88, -33]], HULL.dark, 0.6);
  c.beginPath(); c.ellipse(-88, -36, 4.5 * Math.abs(turn) + 0.5, 4.5, 0.2, 0, TAU);
  c.fillStyle = turn > 0 ? HULL.lit : HULL.dark; c.fill();
  // Hangar: a lit mouth with landing lights; a shuttle comes and goes.
  rect(c, -8, -9, 28, 8.5, '#141820');
  c.fillStyle = grad(c, 6, -1, 6, -9, [[0, `rgba(${WARM},0.55)`], [1, `rgba(${WARM},0.08)`]]); c.fillRect(-8, -9, 28, 8.5);
  for (let i = 0; i < 6; i++) if (((t * 5 - i) % 6 + 6) % 6 < 1) glow(c, -6 + i * 5, -0.6, 1.8, '255,220,120', 0.95);
  {
    const { ev, age } = event(t, 7, 2);
    if (age < 3) {
      const out = ev % 2, u = age / 3, sx = out ? 6 + u * 60 : 66 - u * 60, sy = -5 + (out ? u : 1 - u) * 14;
      shuttle(c, sx, sy, 0.22, out ? 1 : -1, CYAN);
    }
  }
  // Sponsons under the belly, each with a turret.
  for (const sx of [-92, 28]) {
    poly(c, [[sx, 11], [sx + 22, 11], [sx + 18, 17], [sx + 4, 17]], HULL.mid);
    poly(c, [[sx + 4, 17], [sx + 18, 17], [sx + 16, 18.5], [sx + 6, 18.5]], HULL.deep);
    rect(c, sx + 8, 17.5, 5, 2, HULL.dark);
    stroke(c, [[sx + 10.5, 19], [sx + 10.5 + Math.cos(t * 0.6 + sx) * 6, 21 + Math.sin(t * 0.6 + sx) * 1.5]], HULL.dark, 0.7);
  }
  // Window decks: three rows on the hull, one along the belly.
  for (let i = 0; i < 74; i++) {
    if (hash(i * 3) < 0.4 || (i > 37 && i < 46)) continue;
    rect(c, -140 + i * 3.4, -9 + (i % 3) * 3.5, 1.4, 0.8, `rgba(${WARM},${0.7 + 0.3 * hash(i + Math.floor(t / 3))})`);
  }
  for (let i = 0; i < 40; i++) if (hash(i * 7 + 3) > 0.5) rect(c, -120 + i * 5, 4.5, 1.6, 0.7, 'rgba(150,220,255,0.8)');
  // Running lights chasing along the keel; red to port, green at the bow.
  for (let i = 0; i < 18; i++) if (((t * 9 - i) % 18 + 18) % 18 < 1.5) glow(c, -125 + i * 12, 14.5, 2.2, '255,240,200', 0.95);
  if (Math.sin(t * 3) > 0) { glow(c, 150, -2, 4, '120,255,140', 0.95); glow(c, -150, -6, 4, RED, 0.9); }
  // A searchlight sweeping down from the belly.
  {
    const a = Math.PI / 2 + Math.sin(t * 0.5) * 0.45, len = 70;
    const o = [-20, 15], p1 = [o[0] + Math.cos(a - 0.06) * len, o[1] + Math.sin(a - 0.06) * len], p2 = [o[0] + Math.cos(a + 0.06) * len, o[1] + Math.sin(a + 0.06) * len];
    c.fillStyle = grad(c, o[0], o[1], (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, [[0, 'rgba(255,245,215,0.22)'], [1, 'rgba(255,245,215,0)']]);
    c.beginPath(); c.moveTo(...o); c.lineTo(...p1); c.lineTo(...p2); c.closePath(); c.fill();
  }
  // Two escorts flying station off the bow.
  fighter(c, 170 + Math.sin(t * 0.9) * 3, -16 + Math.sin(t * 1.3) * 2, 0.45, 1, CYAN);
  fighter(c, 160 + Math.sin(t * 0.9 + 1) * 3, 6 + Math.sin(t * 1.1) * 2, 0.45, 1, CYAN);
  c.restore();
}
function dogfight(c, s) {
  const { ev, age } = event(s.t, 15, 3);
  if (age > 5) return;
  dogfightAt(c, s.view * (0.25 + hash(ev + 90) * 0.5), -116 + hash(ev + 91) * 10, age);
}
function dogfightAt(c, cx, cy, age) {
  // Not traced: the dogfight fades in and out (its director entry), it never pops.
  const pos = a => [cx + 26 * Math.cos(a), cy + 8 * Math.sin(2 * a)];
  const a = age * 1.8, p1 = pos(a), p2 = pos(a - 0.5);
  if (age < 4) {
    fighter(c, p1[0], p1[1], 0.35, Math.sin(a) < 0 ? 1 : -1, '255,190,90');
    fighter(c, p2[0], p2[1], 0.35, Math.sin(a - 0.5) < 0 ? 1 : -1, CYAN);
    if ((age * 4) % 1 < 0.35) stroke(c, [p2, [p2[0] + (p1[0] - p2[0]) * 0.7, p2[1] + (p1[1] - p2[1]) * 0.7]], 'rgba(255,90,200,0.9)', 0.5);
  } else {
    const q = (age - 4) / 1;
    glow(c, p1[0], p1[1], 3 + q * 9, '255,170,80', 0.9 * (1 - q));
    for (let i = 0; i < 6; i++) rect(c, p1[0] + Math.cos(i) * q * 10, p1[1] + Math.sin(i * 1.7) * q * 6, 0.7, 0.7, `rgba(255,220,160,${1 - q})`);
  }
}

// ------------------------------------------------------------- ground
// The foot of the glass is at -10: things stand on -11 and read in front of
// every mountain row (Peter, 13 Oct: ground stuff wasn't reading).
// Standing on the near ridge row's solid foot (its fill starts at -7), each
// building on its own earth mound, so nothing shows mountain through its
// base (Peter, 13 Oct: "objects aren't planted properly and seem to be
// floating").
const GROUND_F = 0.14, GROUND_Y = -7, MOUND_Y = -14, MOUND_D = 14;
const NEAR_TONES = { JADE: ['#b8c27a', '#3a4a2c'], 'AMBER & TEAL': ['#d0904a', '#4a3a28'],
  'COLD DAWN': ['#b6cce0', '#3a4c6e'], DUSK: ['#c96e5e', '#5a2a48'] };
function mixHex(a, b, t) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
// A faceted mound of the near ground under [x0, x1]: lit left slope, shaded
// body, a pale lip, and a soft shadow where the building meets it.
function plinth(c, look, x0, x1, y, depth = 6) {
  const [lit, dark] = NEAR_TONES[look?.pal?.name] ?? NEAR_TONES.JADE;
  const run = depth * 1.4;
  poly(c, [[x0 - run, y + depth], [x0 - 2, y], [x1 + 2, y], [x1 + run, y + depth]], mixHex(dark, lit, 0.25));
  poly(c, [[x0 - run, y + depth], [x0 - 2, y], [x0 + 3, y], [x0 - run * 0.4, y + depth]], lit);
  poly(c, [[x1 + 2, y], [x1 + run, y + depth], [x1 + run * 0.45, y + depth]], dark);
  // Two facet breaks across the face so the mound reads as rock, not a slab.
  poly(c, [[x0 + 3, y], [(x0 + x1) / 2, y + depth * 0.55], [x0 - run * 0.4, y + depth]], mixHex(dark, lit, 0.4));
  poly(c, [[(x0 + x1) / 2, y + depth * 0.55], [x1 + 2, y], [x1 + run * 0.45, y + depth]], mixHex(dark, lit, 0.12));
  rect(c, x0 - 2, y - 0.4, x1 - x0 + 4, 0.6, mixHex(lit, '#ffffff', 0.25));
  c.fillStyle = 'rgba(0,0,0,0.28)'; c.beginPath(); c.ellipse((x0 + x1) / 2, y + 0.3, (x1 - x0) / 2 + 1, 0.9, 0, 0, TAU); c.fill();
}
function domes(c, x, y, k) {
  traceAt('domes', x, 18);
  // Three habitat domes: seven facets each over a base ring, an airlock, lit
  // windows, and a connecting tube.
  const tones = [HULL.hi, HULL.lit, HULL.lit, HULL.pale, HULL.mid, HULL.dull, HULL.dark];
  const rs = [0, 1, 2].map(i => 4 + hash(k * 7 + i) * 4);
  rect(c, x - 9, y - 2.6, 18, 1.4, HULL.dull); rect(c, x - 9, y - 2.6, 18, 0.5, HULL.pale);   // tube
  for (let i = 0; i < 3; i++) {
    const r = rs[i], dx = x + i * 9 - 9;
    rect(c, dx - r - 0.4, y - 1, r * 2 + 0.8, 1, HULL.dark);                  // base ring
    for (let f = 0; f < 7; f++) {
      const a0 = Math.PI + f * Math.PI / 7, a1 = a0 + Math.PI / 7;
      poly(c, [[dx, y - 1], [dx + Math.cos(a0) * r, y - 1 + Math.sin(a0) * r], [dx + Math.cos(a1) * r, y - 1 + Math.sin(a1) * r]], tones[f]);
    }
    // Ribs between the facets, and a cap.
    seams(c, Array.from({ length: 6 }, (_, f) => { const a = Math.PI + (f + 1) * Math.PI / 7; return [dx, y - 1, dx + Math.cos(a) * r, y - 1 + Math.sin(a) * r]; }), 'rgba(30,36,48,0.35)', 0.2);
    rect(c, dx - 0.8, y - 1 - r - 0.6, 1.6, 0.8, HULL.dark);
    for (let w = 0; w < 4; w++) rect(c, dx - r * 0.66 + w * r * 0.42, y - 1 - r * 0.38, 0.8, 0.7, `rgba(${WARM},0.95)`);
    if (i === 1) { rect(c, dx - 1.2, y - 3.6, 2.4, 2.6, HULL.deep); rect(c, dx - 1.2, y - 3.6, 2.4, 0.5, HULL.mid); glow(c, dx, y - 2.4, 2, WARM, 0.5); }
  }
}
function tower(c, x, y, t, k) {
  traceAt('tower', x + 5, 16);
  // A three-leg lattice mast with platforms, a beacon, a slewing dish with
  // a feed horn on struts, and a searchlight.
  rect(c, x - 4, y - 1, 8, 1, HULL.dark);
  stroke(c, [[x - 3, y - 1], [x - 0.6, y - 26]], HULL.lit, 0.55);
  stroke(c, [[x + 3, y - 1], [x + 0.6, y - 26]], HULL.dull, 0.55);
  stroke(c, [[x, y - 1], [x, y - 26]], HULL.mid, 0.35);
  for (let j = 0; j < 6; j++) {
    const ya = y - 1 - j * 4.2, yb = ya - 4.2, wa = 3 - j * 0.4, wb = 3 - (j + 1) * 0.4;
    stroke(c, [[x - wa, ya], [x + wb, yb]], HULL.dark, 0.25); stroke(c, [[x + wa, ya], [x - wb, yb]], HULL.dark, 0.25);
  }
  for (const py of [y - 13, y - 22]) { rect(c, x - 2.4, py, 4.8, 0.7, HULL.mid); rect(c, x - 2.4, py, 4.8, 0.25, HULL.hi); }
  rect(c, x - 0.6, y - 28, 1.2, 2, HULL.dark);
  if (Math.sin(t * 3 + k) > 0.2) glow(c, x, y - 28.4, 4, RED, 0.95);
  // The dish: a dish face of four facets that turns, a rim, feed and struts.
  const turn = Math.cos(t * 0.7 + k), rx = 6 * Math.abs(turn) + 0.6, cx = x + 9, cy = y - 12;
  rect(c, cx - 0.5, cy, 1, 11, HULL.dark); rect(c, cx - 2, y - 1.6, 4, 1.6, HULL.mid);
  c.save(); c.translate(cx, cy); c.rotate(0.3);
  const face = turn > 0 ? [HULL.hi, HULL.lit, HULL.pale, HULL.mid] : [HULL.mid, HULL.dull, HULL.dark, HULL.deep];
  for (let q = 0; q < 4; q++) {
    c.beginPath(); c.moveTo(0, 0); c.ellipse(0, 0, rx, 6, 0, Math.PI / 2 + q * Math.PI / 2, Math.PI / 2 + (q + 1) * Math.PI / 2); c.closePath();
    c.fillStyle = face[q]; c.fill();
  }
  c.beginPath(); c.ellipse(0, 0, rx, 6, 0, 0, TAU); c.strokeStyle = HULL.dark; c.lineWidth = 0.35; c.stroke();
  const fx = 4.5 * turn;
  stroke(c, [[0, -5.6], [fx, -1.4]], HULL.dark, 0.25); stroke(c, [[0, 5.6], [fx, -1.4]], HULL.dark, 0.25);
  rect(c, fx - 0.7, -2, 1.4, 1.4, HULL.deep);
  c.restore();
  // A searchlight sweeping the sky from the top of the mast.
  const a = -Math.PI / 2 + Math.sin(t * 0.45 + k) * 0.6, len = 110;
  const p0 = [x, y - 26], p1 = [x + Math.cos(a - 0.07) * len, y - 26 + Math.sin(a - 0.07) * len], p2 = [x + Math.cos(a + 0.07) * len, y - 26 + Math.sin(a + 0.07) * len];
  c.fillStyle = grad(c, p0[0], p0[1], (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, [[0, 'rgba(255,245,215,0.2)'], [1, 'rgba(255,245,215,0)']]);
  c.beginPath(); c.moveTo(...p0); c.lineTo(...p1); c.lineTo(...p2); c.closePath(); c.fill();
  rect(c, x - 1.2, y - 26.8, 2.4, 1.2, HULL.dull); glow(c, x, y - 26.2, 2, '255,245,215', 0.8);
}
function launchPad(c, x, y, t, k) {
  traceAt('launchPad', x, 16);
  // A stepped pad with hazard chevrons, blast deflectors, a lattice gantry
  // with a swing arm, two fuel tanks, and the chasing edge lights.
  poly(c, [[x - 15, y], [x - 13, y - 2.6], [x + 13, y - 2.6], [x + 15, y]], HULL.dull);
  rect(c, x - 13, y - 2.6, 26, 0.6, HULL.pale);
  for (let i = 0; i < 6; i++) poly(c, [[x - 11 + i * 4, y - 2], [x - 9.6 + i * 4, y - 2], [x - 8.6 + i * 4, y - 1], [x - 10 + i * 4, y - 1]], i % 2 ? '#f0b23c' : '#2b313c');
  poly(c, [[x - 4, y - 2.6], [x - 2, y - 4], [x + 2, y - 4], [x + 4, y - 2.6]], HULL.dark);
  for (let i = 0; i < 6; i++) if (((t * 6 - i) % 6 + 6) % 6 < 1) glow(c, x - 12 + i * 4.8, y - 2.8, 2, '255,200,80', 0.95);
  // Gantry.
  stroke(c, [[x + 9.5, y - 2.6], [x + 9.5, y - 20]], HULL.mid, 0.5); stroke(c, [[x + 12, y - 2.6], [x + 12, y - 20]], HULL.dull, 0.5);
  for (let j = 0; j < 7; j++) stroke(c, [[x + 9.5, y - 2.6 - j * 2.5], [x + 12, y - 5.1 - j * 2.5]], HULL.dark, 0.25);
  rect(c, x + 9, y - 20.6, 3.6, 0.8, HULL.pale);
  rect(c, x + 3, y - 15, 6.5, 0.8, HULL.dull);   // swing arm
  if (Math.sin(t * 3 + k) > 0) glow(c, x + 10.8, y - 21, 2.2, RED, 0.9);
  // Fuel tanks.
  for (const [tx, tw] of [[x - 13, 3], [x - 9.4, 2.4]]) {
    rect(c, tx, y - 8.6, tw, 6, HULL.lit); rect(c, tx + tw * 0.6, y - 8.6, tw * 0.4, 6, HULL.mid);
    c.beginPath(); c.arc(tx + tw / 2, y - 8.6, tw / 2, Math.PI, 0); c.fillStyle = HULL.hi; c.fill();
  }
  // The rocket is always there (Peter, 13 Oct: "should already be sitting
  // there before blast off"). A 16 s cycle: it stands on the pad, ignites and
  // climbs away, the pad sits empty a moment, then the next one rises up out
  // of the pad on its elevator, clipped at the deck so nothing pops in.
  const { ev, age } = event(t, 16, k * 3);
  const deck = y - 2.6, stand = y - 7.2, eng = engine(ev);
  const rocket = (yy, e) => { c.save(); c.translate(x, yy); c.rotate(-Math.PI / 2); shuttle(c, 0, 0, 0.32, 1, e); c.restore(); };
  if (age < 8) {
    rocket(stand, eng);                                         // waiting on the pad
    if (age > 7) glow(c, x, y - 2, 6 * (age - 7), '255,220,170', 0.45);
  } else if (age < 12) {
    const a = age - 8, lift = Math.max(0, a - 0.6), yy = stand - lift * lift * 10;
    if (a < 1.6) glow(c, x, y - 2, 10 * (1.6 - a), '255,220,170', 0.5);
    c.fillStyle = grad(c, x, yy + 6, x, y, [[0, 'rgba(255,200,140,0.55)'], [1, 'rgba(255,200,140,0)']]);
    c.beginPath(); c.moveTo(x - 1.5, yy + 6); c.lineTo(x + 1.5, yy + 6); c.lineTo(x + 4, y); c.lineTo(x - 4, y); c.closePath(); c.fill();
    rocket(yy, eng);
  } else if (age > 13) {
    const rise = Math.min(1, (age - 13) / 2.5), yy = stand + (1 - rise) * 14;
    c.save(); c.beginPath(); c.rect(x - 20, deck - 40, 40, 40); c.clip(); rocket(yy, engine(ev + 1)); c.restore();
    rect(c, x - 3, deck - 0.4, 6, 0.4, '#f0b23c');
  }
}
function pumpjack(c, x, y, t, k) {
  traceAt('pumpjack', x, 16);
  // Skid, motor house, crank with counterweights turning, pitman arm, the
  // Samson post A-frame, walking beam and horsehead, polished rod, wellhead.
  const crank = t * 1.6 + k, rock = 0.35 * Math.sin(crank);
  rect(c, x - 16, y - 1, 30, 1, HULL.dark); rect(c, x - 16, y - 1, 30, 0.35, HULL.mid);
  rect(c, x - 15, y - 4.6, 5, 3.6, HULL.lit); rect(c, x - 11.6, y - 4.6, 1.6, 3.6, HULL.mid);
  rect(c, x - 15, y - 4.6, 5, 0.6, HULL.hi); rect(c, x - 14, y - 3.4, 1.4, 0.8, `rgba(${WARM},0.9)`);
  const cx = x - 6, cy = y - 4;
  c.save(); c.translate(cx, cy); c.rotate(crank);
  poly(c, [[-0.8, -0.8], [4, -2.2], [4, 2.2], [-0.8, 0.8]], '#c8973c'); poly(c, [[4, -2.2], [5.2, -1], [5.2, 1], [4, 2.2]], '#7a5a22');
  c.restore();
  c.beginPath(); c.arc(cx, cy, 0.8, 0, TAU); c.fillStyle = HULL.deep; c.fill();
  const pinX = cx + Math.cos(crank) * 4, pinY = cy + Math.sin(crank) * 4;
  const beamEndX = x - 9 * Math.cos(rock), beamEndY = y - 10 - 9 * Math.sin(rock);
  stroke(c, [[pinX, pinY], [beamEndX, beamEndY]], '#6a5228', 0.6);
  poly(c, [[x - 4, y - 1], [x - 0.6, y - 10], [x + 0.6, y - 10], [x + 4, y - 1]], '#c8973c');
  poly(c, [[x + 0.6, y - 10], [x + 4, y - 1], [x + 2.4, y - 1]], '#7a5a22');
  stroke(c, [[x - 2.2, y - 5], [x + 2.2, y - 5]], '#7a5a22', 0.4);
  c.save(); c.translate(x, y - 10); c.rotate(rock);
  rect(c, -9, -1, 18, 1.2, '#e2b45a'); rect(c, -9, 0.2, 18, 0.8, '#a8823e');
  poly(c, [[9, -2.2], [12.4, -1.4], [12.8, 1.2], [12, 3.4], [9, 2]], '#d6aa50');
  poly(c, [[12.4, -1.4], [12.8, 1.2], [12, 3.4], [11.6, 1]], '#8a6a30');
  c.restore();
  c.beginPath(); c.arc(x, y - 10, 0.7, 0, TAU); c.fillStyle = HULL.deep; c.fill();
  const headX = x + 12.6 * Math.cos(rock), headY = y - 10 + 12.6 * Math.sin(rock) + 3;
  stroke(c, [[headX, headY], [headX, y - 2.4]], HULL.pale, 0.35);
  rect(c, headX - 1.2, y - 2.6, 2.4, 1.6, HULL.dark); rect(c, headX - 0.4, y - 3.4, 0.8, 0.8, HULL.mid);
}
function outposts(c, s, look) {
  for (const [k, x0] of along(s, GROUND_F, 150)) {
    const x = x0 + hash(k * 5) * 50, kind = Math.floor(hash(k * 9 + 2) * 5);
    if (kind === 0) { plinth(c, look, x - 17, x + 17, MOUND_Y, MOUND_D); domes(c, x, MOUND_Y, k); }
    else if (kind === 1) { plinth(c, look, x - 5, x + 16, MOUND_Y, MOUND_D); tower(c, x, MOUND_Y, s.t, k); }
    else if (kind === 2) { plinth(c, look, x - 16, x + 16, MOUND_Y, MOUND_D); launchPad(c, x, MOUND_Y, s.t, k); }
    else if (kind === 3) { plinth(c, look, x - 16, x + 15, MOUND_Y, MOUND_D); pumpjack(c, x, MOUND_Y, s.t, k); }
    else { plinth(c, look, x - 17, x + 32, MOUND_Y, MOUND_D); domes(c, x, MOUND_Y, k); tower(c, x + 16, MOUND_Y, s.t, k + 1); }
  }
}
// ------------------------------------------------------------- front
const FRONT_F = 0.14;
function rovers(c, s) {
  for (const [k, x0] of along(s, FRONT_F, 230)) {
    rover(c, x0 + hash(k + 300) * 60 + (s.t * 5) % 230 - 115, GROUND_Y + 0.4, s.t, k); // on the solid foot
  }
}
function rover(c, x, y, t, k) {
  {
    c.fillStyle = grad(c, x + 9, y - 3, x + 40, y - 3, [[0, 'rgba(255,245,210,0.3)'], [1, 'rgba(255,245,210,0)']]);
    c.beginPath(); c.moveTo(x + 9, y - 4); c.lineTo(x + 40, y - 9); c.lineTo(x + 40, y + 3); c.lineTo(x + 9, y - 2); c.closePath(); c.fill();
    // Chassis in three bands, a cab with glass, a cargo bed with a crate.
    poly(c, [[x - 8, y - 3.4], [x + 8, y - 3.4], [x + 9, y - 2.2], [x - 9, y - 2.2]], HULL.lit);
    poly(c, [[x - 9, y - 2.2], [x + 9, y - 2.2], [x + 8.4, y - 1], [x - 8.4, y - 1]], HULL.dull);
    poly(c, [[x + 0.5, y - 3.4], [x + 2, y - 7.4], [x + 6, y - 7.4], [x + 8, y - 3.4]], HULL.hi);
    poly(c, [[x + 6, y - 7.4], [x + 8, y - 3.4], [x + 7, y - 3.4], [x + 5.4, y - 6.8]], HULL.pale);
    poly(c, [[x + 2.6, y - 6.8], [x + 5.6, y - 6.8], [x + 6.8, y - 4.2], [x + 2.2, y - 4.2]], GLASS[0]);
    poly(c, [[x + 2.6, y - 6.8], [x + 5.6, y - 6.8], [x + 5.8, y - 6.2], [x + 2.5, y - 6.2]], GLASS[1]);
    rect(c, x - 7, y - 5.6, 5, 2.2, '#e6a25a'); rect(c, x - 7, y - 4.4, 5, 1, '#b9783a');
    // Solar panel on a hinge, a dish, a camera mast.
    poly(c, [[x - 8, y - 6.2], [x - 1, y - 7.4], [x - 1, y - 6.8], [x - 8, y - 5.6]], '#4f78c0');
    stroke(c, [[x - 4, y - 7], [x - 4, y - 3.4]], HULL.dark, 0.3);
    stroke(c, [[x - 1.5, y - 3.4], [x - 2.4, y - 12]], HULL.dark, 0.4);
    c.beginPath(); c.ellipse(x - 2.6, y - 12.4, 1.4, 0.6, -0.4, 0, TAU); c.fillStyle = HULL.lit; c.fill();
    rect(c, x + 6.4, y - 9.4, 0.5, 2, HULL.dark); rect(c, x + 6, y - 10.2, 1.4, 0.9, HULL.deep);
    // Six wheels on bogies, with hubs and treads.
    stroke(c, [[x - 7, y - 1], [x - 2.6, y - 1.8], [x + 1.8, y - 1], [x + 6, y - 1.8]], HULL.dark, 0.4);
    for (const wx of [-7, -3, 1.2, 5.4]) {
      c.beginPath(); c.arc(x + wx, y - 0.2, 1.7, 0, TAU); c.fillStyle = HULL.deep; c.fill();
      c.beginPath(); c.arc(x + wx, y - 0.2, 0.7, 0, TAU); c.fillStyle = HULL.mid; c.fill();
      for (let s2 = 0; s2 < 4; s2++) { const a = t * 3 + s2 * Math.PI / 2; rect(c, x + wx + Math.cos(a) * 1.4 - 0.25, y - 0.2 + Math.sin(a) * 1.4 - 0.25, 0.5, 0.5, HULL.dark); }
    }
    if (((t + k) % 1.2 + 1.2) % 1.2 < 0.6) glow(c, x - 2.4, y - 12.4, 2, '120,255,140', 0.95);
    glow(c, x + 9, y - 3, 2.5, '255,250,220', 0.95);
    glow(c, x - 9, y - 2.6, 1.4, RED, 0.8);
  }
}
function landingLights(c, s) {
  for (const [k, x] of along(s, FRONT_F, 26)) {
    lightPost(c, x, -16, ((s.t * 8 - k) % 12 + 12) % 12 < 1.2);
  }
}
function lightPost(c, x, y, on) {
  {
    rect(c, x, y, 0.7, 6, HULL.dark);
    glow(c, x + 0.35, y - 0.4, on ? 4 : 1.6, '255,200,90', on ? 0.95 : 0.55);
  }
}

// ------------------------------------------------------------- near (hull)
function astronaut(c, s) {
  for (const [k, x0] of along(s, 1, 610, 40)) {
    spacewalker(c, x0 + 300, -70 + Math.sin(s.t * 0.8 + k) * 5, s.t, k, -127);
  }
}
// THE ASTRONAUT'S POSE (Peter, 14 Oct: "do a bakeoff for the spaceman outside..
// would prefer to see both arms"). 'now' is one arm (the welder, or a wave);
// the others show the far arm too. The lab picks one with setWalkerPose.
export const WALKER_POSES = ['now', 'grip', 'wave2', 'thumbs', 'drift'];
let walkerPose = 'drift';
// How fast he turns while drifting, radians a second: from four o'clock he is
// upside down about four seconds in.
const DRIFT_TURN = 0.25;
export function setWalkerPose(p) { walkerPose = p; }
// The far arm, behind the torso: shoulder at (-1.4, -3.4), `a` the angle down the arm.
// Its upper arm is a unit longer than the near one's: the shoulder sits inside the
// torso, so that much of it is hidden, and drawn the same length it read as the
// short arm (Peter, 14 Oct: "arms aren't same length... one is a little short").
function farArm(c, suit, a, bend = 0) {
  c.save(); c.translate(-1.2, -3.4); c.rotate(a);
  rect(c, 0, -0.85, 3.5, 1.7, suit[2]); rect(c, 3.3, -0.85, 0.6, 1.7, suit[3]);
  c.translate(3.8, 0); c.rotate(bend);
  rect(c, 0, -0.75, 2.1, 1.5, suit[2]); rect(c, 2.1, -0.85, 1.1, 1.7, '#c88a34');
  c.restore();
}
// The near arm in the same terms, from the near shoulder (2.6, -3.2).
function nearArm(c, suit, a, bend = 0, glove = '#e0a040', thumb = false) {
  c.save(); c.translate(2.6, -3.2); c.rotate(a);
  rect(c, 0, -0.9, 2.6, 1.8, suit[1]); rect(c, 2.4, -0.9, 0.6, 1.8, suit[3]);
  c.translate(3, 0); c.rotate(bend);
  rect(c, 0, -0.8, 2, 1.6, suit[2]); rect(c, 2, -0.9, 1.1, 1.8, glove);
  if (thumb) rect(c, 2.3, -2.1, 0.6, 1.4, glove);
  c.restore();
}
// The other astronauts (the welder layer, the catalogue) keep 'now'; finishWalker
// hands in the picked pose.
function spacewalker(c, x, y, t, k, tetherTop, pose = 'now', turn = null) {
  if (pose !== 'now') { spacewalkerPosed(c, x, y, t, k, tetherTop, pose, turn); return; }
  traceAt('astronaut', x, 20);
  const s = { t };
  {
    c.beginPath(); c.moveTo(x - 12, tetherTop);
    c.quadraticCurveTo(x - 16 + Math.sin(s.t * 0.6) * 4, (y + tetherTop) / 2 + 6, x - 2, y - 3);
    c.strokeStyle = 'rgba(230,230,220,0.8)'; c.lineWidth = 0.5; c.stroke();
    const waving = Math.sin(s.t * 0.5 + k) > 0.55;
    const suit = ['#ffffff', '#eceeee', '#cdd0d2', '#9ea2a6'];
    c.save(); c.translate(x, y); c.rotate(Math.sin(s.t * 0.7 + k) * 0.15);
    // Life-support pack: three facets, vents and a tank.
    poly(c, [[-5, -4.6], [-2, -4.6], [-2, 2.6], [-5, 2.2]], suit[2]); rect(c, -5, -4.6, 1.2, 6.8, suit[3]);
    rect(c, -4.6, -3.4, 2, 0.4, suit[3]); rect(c, -4.6, -2.4, 2, 0.4, suit[3]);
    // Torso with a chest unit, and shoulder rings.
    poly(c, [[-2, -4.4], [1, -4.6], [1.4, 3], [-2.4, 3]], suit[0]);
    poly(c, [[1, -4.6], [3, -4], [3.2, 3], [1.4, 3]], suit[2]);
    rect(c, -1.2, -2.2, 3.2, 2.2, suit[3]); rect(c, -0.8, -1.8, 0.7, 0.6, '#ff6a50'); rect(c, 0.2, -1.8, 0.7, 0.6, '#7fe07f'); rect(c, -0.8, -0.9, 2.4, 0.4, '#7fd8ff');
    rect(c, -2.2, 2.4, 5.4, 0.8, suit[3]);
    // Legs: thigh, knee ring, boot.
    poly(c, [[-2.2, 3.2], [-0.2, 3.2], [-0.4, 6], [-2.2, 6]], suit[1]); rect(c, -2.2, 5.6, 1.9, 0.5, suit[3]); poly(c, [[-2.4, 6.1], [-0.2, 6.1], [0.4, 7.8], [-2.6, 7.8]], suit[2]);
    poly(c, [[0.4, 3.2], [2.6, 3.2], [2.8, 5.8], [0.6, 5.8]], suit[2]); rect(c, 0.6, 5.4, 2.1, 0.5, suit[3]); poly(c, [[0.5, 5.9], [2.9, 5.9], [3.4, 7.4], [0.4, 7.4]], suit[3]);
    // Helmet: shell facets, a gold visor with a highlight, a lamp.
    c.beginPath(); c.arc(0.4, -6.8, 3, 0, TAU); c.fillStyle = suit[0]; c.fill();
    c.beginPath(); c.arc(0.4, -6.8, 3, -0.2, Math.PI * 0.6); c.fillStyle = suit[2]; c.fill();
    c.beginPath(); c.ellipse(1.3, -6.7, 2, 1.7, 0, 0, TAU);
    c.fillStyle = grad(c, 0, -8.4, 2.8, -5, [[0, '#ffe7a0'], [0.45, '#e0a040'], [1, '#2a6a70']]); c.fill();
    c.beginPath(); c.ellipse(0.7, -7.6, 0.7, 0.35, -0.5, 0, TAU); c.fillStyle = 'rgba(255,255,255,0.8)'; c.fill();
    rect(c, -1.6, -9.6, 1.2, 0.8, suit[3]); glow(c, -1, -9.2, 1.6, '255,250,220', 0.7);
    // Arm: upper arm, elbow, glove — waving, or holding the welder.
    const arm = waving ? -2.2 + Math.sin(s.t * 6) * 0.5 : 0.5;
    c.save(); c.translate(2.6, -3.2); c.rotate(arm);
    rect(c, 0, -0.9, 2.6, 1.8, suit[1]); rect(c, 2.4, -0.9, 0.6, 1.8, suit[3]); rect(c, 3, -0.8, 2, 1.6, suit[2]); rect(c, 5, -0.9, 1.1, 1.8, '#e0a040');
    if (!waving) { rect(c, 5.6, -0.3, 2, 0.6, HULL.dark); }
    c.restore();
    c.restore();
    if (!waving) {
      const hx = x + 9, hy = y - 1.6;
      if ((s.t * 7) % 1 < 0.6) {
        glow(c, hx, hy, 5, '180,230,255', 0.9);
        for (let i = 0; i < 6; i++) {
          const a = hash(Math.floor(s.t * 14) + i) * TAU, r = 2 + hash(i + Math.floor(s.t * 14) * 3) * 4;
          rect(c, hx + Math.cos(a) * r, hy + Math.sin(a) * r, 0.6, 0.6, 'rgba(255,230,140,0.95)');
        }
      }
    }
    // His drone: a faceted pod with two rotor rings and a camera eye.
    const dx = x + Math.cos(s.t * 1.3 + k) * 13, dy = y - 4 + Math.sin(s.t * 1.3 + k) * 5;
    poly(c, [[dx - 2, dy], [dx - 1.2, dy - 1.3], [dx + 1.2, dy - 1.3], [dx + 2, dy]], HULL.hi);
    poly(c, [[dx - 2, dy], [dx + 2, dy], [dx + 1.2, dy + 1.1], [dx - 1.2, dy + 1.1]], HULL.dull);
    for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(dx + sx * 3, dy - 0.6, 1.4, 0.4, 0, 0, TAU); c.strokeStyle = HULL.mid; c.lineWidth = 0.3; c.stroke(); }
    rect(c, dx + 0.6, dy - 0.4, 0.8, 0.7, '#7fd8ff');
    if (s.t % 0.8 < 0.3) glow(c, dx, dy - 1.6, 2, '120,255,140', 0.95);
  }
}
// The both-arms poses for the bake-off: the same suit, pack, helmet and drone as
// 'now', with the far arm drawn behind the torso.
function spacewalkerPosed(c, x, y, t, k, tetherTop, pose, turn = null) {
  traceAt('astronaut', x, 20);
  const suit = ['#ffffff', '#eceeee', '#cdd0d2', '#9ea2a6'];
  const drift = pose === 'drift';
  // The tether: in 'grip' it drapes down and up to his waist at the back, not his
  // hand (Peter, 14 Oct: "the cable should be attached to his waist or back not
  // arm"); slack to the back otherwise.
  const gripHand = pose === 'grip' ? [x - 2.2, y + 1.2] : null;
  c.beginPath(); c.moveTo(x - 12, tetherTop);
  // Held in his hand, the cord drapes: slack, it loops down below his hand before it
  // reaches him (Peter, 14 Oct: "with a draping cord"), swaying a little.
  if (gripHand) {
    const sw = Math.sin(t * 0.6) * 3;
    c.bezierCurveTo(x - 24 + sw, tetherTop + (gripHand[1] - tetherTop) * 0.55, gripHand[0] - 12 + sw, gripHand[1] + 22,
      gripHand[0], gripHand[1]);
  }
  else c.quadraticCurveTo(x - 16 + Math.sin(t * 0.6) * 4, (y + tetherTop) / 2 + (drift ? 14 : 6), x - 2, y - 3);
  c.strokeStyle = 'rgba(230,230,220,0.8)'; c.lineWidth = 0.5; c.stroke();
  c.save(); c.translate(x, y);
  c.rotate(drift ? (turn ?? t * DRIFT_TURN) : Math.sin(t * 0.7 + k) * 0.15);
  // The far arm first, so the torso covers its shoulder.
  const w = Math.sin(t * 6);
  if (pose === 'grip') farArm(c, suit, 1.7, -0.5);                  // far arm at rest, the tether is on his belt
  else if (pose === 'wave2') farArm(c, suit, -2.3 + Math.sin(t * 6 + 1.6) * 0.45, -0.3);
  else if (pose === 'thumbs') farArm(c, suit, 1.9, -1.6);            // hand on hip
  // drift: out wide, arms flailing quick and out of step, as if he has lost
  // control (Peter, 14 Oct: "can his arms and legs move while he's floating" …
  // "maybe he moves his arms quicker as if out of control"); legs kick slower.
  else farArm(c, suit, -2.8 + Math.sin(t * 2.7) * 0.45 + Math.sin(t * 4.3 + 1) * 0.2, 0.2 + Math.sin(t * 3.6 + 1) * 0.45);
  // Torso, chest unit, belt — no life-support pack on these (Peter, 14 Oct: "a
  // little bulky - probably don't need the back pack").
  poly(c, [[-2, -4.4], [1, -4.6], [1.4, 3], [-2.4, 3]], suit[0]);
  poly(c, [[1, -4.6], [3, -4], [3.2, 3], [1.4, 3]], suit[2]);
  rect(c, -1.2, -2.2, 3.2, 2.2, suit[3]); rect(c, -0.8, -1.8, 0.7, 0.6, '#ff6a50'); rect(c, 0.2, -1.8, 0.7, 0.6, '#7fe07f'); rect(c, -0.8, -0.9, 2.4, 0.4, '#7fd8ff');
  rect(c, -2.2, 2.4, 5.4, 0.8, suit[3]);
  // Legs: apart and bent a little in 'drift'.
  const spread = drift ? 0.35 : 0;
  const kick = drift ? Math.sin(t * 1.6) * 0.3 : 0;
  c.save(); c.translate(-1.2, 3.2); c.rotate(spread + kick);
  poly(c, [[-1, 0], [1, 0], [0.8, 2.8], [-1, 2.8]], suit[1]); rect(c, -1, 2.4, 1.9, 0.5, suit[3]); poly(c, [[-1.2, 2.9], [1, 2.9], [1.6, 4.6], [-1.4, 4.6]], suit[2]);
  c.restore();
  c.save(); c.translate(1.5, 3.2); c.rotate(-spread + (drift ? Math.sin(t * 1.9 + 2.2) * 0.3 : 0));
  poly(c, [[-1.1, 0], [1.1, 0], [1.3, 2.6], [-0.9, 2.6]], suit[2]); rect(c, -0.9, 2.2, 2.1, 0.5, suit[3]); poly(c, [[-1, 2.7], [1.4, 2.7], [1.9, 4.2], [-1.1, 4.2]], suit[3]);
  c.restore();
  // Helmet.
  c.beginPath(); c.arc(0.4, -6.8, 3, 0, TAU); c.fillStyle = suit[0]; c.fill();
  c.beginPath(); c.arc(0.4, -6.8, 3, -0.2, Math.PI * 0.6); c.fillStyle = suit[2]; c.fill();
  c.beginPath(); c.ellipse(1.3, -6.7, 2, 1.7, 0, 0, TAU);
  c.fillStyle = grad(c, 0, -8.4, 2.8, -5, [[0, '#ffe7a0'], [0.45, '#e0a040'], [1, '#2a6a70']]); c.fill();
  c.beginPath(); c.ellipse(0.7, -7.6, 0.7, 0.35, -0.5, 0, TAU); c.fillStyle = 'rgba(255,255,255,0.8)'; c.fill();
  rect(c, -1.6, -9.6, 1.2, 0.8, suit[3]); glow(c, -1, -9.2, 1.6, '255,250,220', 0.7);
  // The near arm.
  let welding = false;
  if (pose === 'grip') {
    const waving = Math.sin(t * 0.5 + k) > 0.55;
    if (waving) nearArm(c, suit, -2.2 + w * 0.5, -0.3);
    else { nearArm(c, suit, 0.5, -0.2); rect(c, 5.6, 0.6, 2, 0.6, HULL.dark); welding = true; }
  } else if (pose === 'wave2') nearArm(c, suit, -2.3 + w * 0.45, -0.3);
  else if (pose === 'thumbs') {
    const waving = Math.sin(t * 0.6 + k) > 0.6;
    if (waving) nearArm(c, suit, -2.2 + w * 0.5, -0.3);
    else nearArm(c, suit, -0.4, -1.5, '#e0a040', true);              // thumbs up
  } else nearArm(c, suit, -0.4 + Math.sin(t * 3.1 + 2) * 0.45 + Math.sin(t * 5.2) * 0.2, -0.2 + Math.sin(t * 3.9 + 3) * 0.45);    // drift
  c.restore();
  if (welding && (t * 7) % 1 < 0.6) {
    const hx = x + 9, hy = y - 0.4;
    glow(c, hx, hy, 5, '180,230,255', 0.9);
    for (let i = 0; i < 6; i++) {
      const a = hash(Math.floor(t * 14) + i) * TAU, r = 2 + hash(i + Math.floor(t * 14) * 3) * 4;
      rect(c, hx + Math.cos(a) * r, hy + Math.sin(a) * r, 0.6, 0.6, 'rgba(255,230,140,0.95)');
    }
  }
  // His drone.
  const dx = x + Math.cos(t * 1.3 + k) * 13, dy = y - 4 + Math.sin(t * 1.3 + k) * 5;
  poly(c, [[dx - 2, dy], [dx - 1.2, dy - 1.3], [dx + 1.2, dy - 1.3], [dx + 2, dy]], HULL.hi);
  poly(c, [[dx - 2, dy], [dx + 2, dy], [dx + 1.2, dy + 1.1], [dx - 1.2, dy + 1.1]], HULL.dull);
  for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(dx + sx * 3, dy - 0.6, 1.4, 0.4, 0, 0, TAU); c.strokeStyle = HULL.mid; c.lineWidth = 0.3; c.stroke(); }
  rect(c, dx + 0.6, dy - 0.4, 0.8, 0.7, '#7fd8ff');
  if (t % 0.8 < 0.3) glow(c, dx, dy - 1.6, 2, '120,255,140', 0.95);
}
function cargo(c, s) {
  for (const [k, x0] of along(s, 0.35, 400)) {
    cargoLine(c, x0 + 100 + (s.t * 3) % 400 - 200, -96 + Math.sin(s.t * 0.3 + k) * 3, s.t, k);
  }
}
function cargoLine(c, x, y, t, k) {
  traceAt('cargo', x - 16, 26);
  const s = { t };
  {
    const pts = [];
    for (let i = 0; i < 4; i++) pts.push([x - i * 11, y + i * 3 + Math.sin(s.t * 0.9 + i) * 1.2]);
    stroke(c, pts, 'rgba(200,200,190,0.7)', 0.4);
    const cols = [['#e6a25a', '#b9783a', '#7a4c22'], ['#6cc0b8', '#3e8e88', '#245a56'], ['#e27c68', '#b0503e', '#6e2e24'], ['#e8d27a', '#b8a24a', '#76662a']];
    pts.forEach(([px, py], i) => {
      c.save(); c.translate(px, py); c.rotate(Math.sin(s.t * 0.5 + i + k) * 0.3);
      const col = cols[((i + k) % 4 + 4) % 4];
      // A ribbed box: lit top face, two side bands, corner fittings, a stencil.
      poly(c, [[-3.5, -3], [-2.6, -3.8], [4.4, -3.8], [3.5, -3]], col[0]);
      rect(c, -3.5, -3, 7, 3, col[1]); rect(c, -3.5, 0, 7, 3, col[2]);
      poly(c, [[3.5, -3], [4.4, -3.8], [4.4, 2.2], [3.5, 3]], col[2]);
      for (let r = 1; r < 4; r++) rect(c, -3.5 + r * 1.75, -3, 0.3, 6, 'rgba(0,0,0,0.18)');
      for (const [fx, fy] of [[-3.5, -3], [2.9, -3], [-3.5, 2.4], [2.9, 2.4]]) rect(c, fx, fy, 0.6, 0.6, HULL.deep);
      rect(c, -2, -1.2, 2.6, 0.6, 'rgba(255,255,255,0.4)');
      c.restore();
    });
    if (s.t % 1.4 < 0.3) glow(c, x + 4, y - 2, 2.5, RED, 0.95);
  }
}

// ------------------------------------------------------------- starfield
// The title page's starfield (Peter, 13 Oct: "can we do the proper starfield
// effect, like on the title page?"): three parallax layers — far and faint,
// near and bright — each star a soft core and halo, warm or cool, the
// brightest with a diffraction cross; each layer twinkles on its own slow
// pulse; a shooting star in half of every 6.5 s window. The layers are baked
// once (as menus.js bakes the title's) and only scrolled each frame.
const STAR_TILE = 560, STAR_TOP = -140, STAR_H = 132, STAR_SS = 2;
const starLayers = [];
// Where each layer's stars are on its canvas: rects (in tile units, snapped to the bake's pixel
// grid) round every star's glow, overlapping ones merged. A layer is ~108 small soft dots on a
// 560 x 132 sheet that is otherwise empty, and drawing the whole sheet magnified three times a
// frame was the costliest thing in Gravity Grid's room (15 Oct 2026); drawing just these rects
// from the same canvas, mapped the same way, puts down the same pixels.
const starRects = [];
function starRectsFor(layer, spec) {
  const snap = (v, up) => (up ? Math.ceil(v * STAR_SS) : Math.floor(v * STAR_SS)) / STAR_SS;
  const rs = [];
  for (let i = 0; i < spec.n; i++) {
    const sx = hash(i * 3 + layer * 101) * STAR_TILE, sy = 2 + hash(i * 5 + layer * 211) * (STAR_H - 4);
    const mag = hash(i * 7 + layer * 307), rad = spec.r[0] + mag * (spec.r[1] - spec.r[0]), spread = rad * spec.spread;
    const half = Math.max(spread, layer === 2 && mag > 0.86 ? rad * 3 : 0) + 1 / STAR_SS;
    rs.push([snap(Math.max(0, sx - half)), snap(Math.max(0, sy - half)), snap(Math.min(STAR_TILE, sx + half), true), snap(Math.min(STAR_H, sy + half), true)]);
  }
  // merge any that touch, so no pixel is drawn twice
  let merged = true;
  while (merged) {
    merged = false;
    for (let a = 0; a < rs.length && !merged; a++) for (let b = a + 1; b < rs.length; b++) {
      const A = rs[a], B = rs[b];
      if (A[0] <= B[2] && B[0] <= A[2] && A[1] <= B[3] && B[1] <= A[3]) {
        rs[a] = [Math.min(A[0], B[0]), Math.min(A[1], B[1]), Math.max(A[2], B[2]), Math.max(A[3], B[3])];
        rs.splice(b, 1); merged = true; break;
      }
    }
  }
  return rs.map(([x0, y0, x1, y1]) => ({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }));
}
function bakeStars(limit = 3) {
  if (starLayers.length >= limit || typeof document === 'undefined') return starLayers.length > 0;
  // Subtler since 13 Oct ("more subtle stars"): smaller, dimmer, tighter halos.
  const specs = [{ n: 60, r: [0.18, 0.3], spread: 2.0, a: 0.35 }, { n: 34, r: [0.22, 0.42], spread: 2.2, a: 0.5 }, { n: 14, r: [0.32, 0.6], spread: 2.5, a: 0.7 }];
  for (let layer = starLayers.length; layer < limit; layer++) {
    const spec = specs[layer];
    const cv = document.createElement('canvas');
    cv.width = STAR_TILE * STAR_SS; cv.height = STAR_H * STAR_SS;
    const x = cv.getContext && cv.getContext('2d');
    if (!x || !x.createRadialGradient) return false;
    x.scale(STAR_SS, STAR_SS);
    for (let i = 0; i < spec.n; i++) {
      const sx = hash(i * 3 + layer * 101) * STAR_TILE, sy = 2 + hash(i * 5 + layer * 211) * (STAR_H - 4);
      const mag = hash(i * 7 + layer * 307), rad = spec.r[0] + mag * (spec.r[1] - spec.r[0]), spread = rad * spec.spread;
      const core = mag > 0.82 ? '255,234,196' : mag < 0.3 ? '200,220,255' : '238,243,255';
      const g = x.createRadialGradient(sx, sy, 0, sx, sy, spread);
      g.addColorStop(0, `rgba(${core},${spec.a})`); g.addColorStop(0.22, `rgba(${core},${spec.a * 0.7})`); g.addColorStop(1, `rgba(${core},0)`);
      x.fillStyle = g; x.fillRect(sx - spread, sy - spread, spread * 2, spread * 2);
      if (layer === 2 && mag > 0.86) {
        x.fillStyle = `rgba(${core},0.35)`;
        x.fillRect(sx - rad * 3, sy - 0.15, rad * 6, 0.3); x.fillRect(sx - 0.15, sy - rad * 3, 0.3, rad * 6);
      }
    }
    starRects[layer] = starRectsFor(layer, spec);
    starLayers.push(cv);
  }
  return true;
}
// Separate jobs fit the briefing's cooperative warmup budget.
export const gravityStarWarmJobs = () => [1, 2, 3].map(limit => () => bakeStars(limit));
export function titleStarfield(c, s) {
  if (!bakeStars()) return;
  [0.008, 0.016, 0.028].forEach((f, layer) => {
    const off = -(((s.cam * f + s.t * (0.4 + layer * 0.5)) % STAR_TILE) + STAR_TILE) % STAR_TILE;
    c.save();
    c.globalAlpha *= 0.72 + Math.sin(s.t * (0.55 + layer * 0.17) + layer * 2.1) * 0.1;
    const cv = starLayers[layer], rects = starRects[layer];
    for (let x = off; x < s.view + 10; x += STAR_TILE) {
      if (!rects) { c.drawImage(cv, x, STAR_TOP, STAR_TILE, STAR_H); continue; }
      for (const r of rects) {
        const dx = x + r.x;
        if (dx > s.view + 10 || dx + r.w < -70) continue;
        c.drawImage(cv, r.x * STAR_SS, r.y * STAR_SS, r.w * STAR_SS, r.h * STAR_SS, dx, STAR_TOP + r.y, r.w, r.h);
      }
    }
    c.restore();
  });
  // Shooting star: one in half of the 6.5 s windows, upper sky, down-right.
  const cyc = Math.floor(s.t / 6.5), ph = s.t - cyc * 6.5;
  if (hash(cyc * 3 + 1) > 0.45) {
    const travel = (ph - 0.4) * 160;
    if (travel > 0 && travel < 260) {
      c.save(); c.globalAlpha *= Math.min(1, travel / 40, (260 - travel) / 60);   // fade, never pop
      const dx = 0.92, dy = 0.39, hx = s.view * (hash(cyc + 9) * 0.5) - 40 + dx * travel, hy = -130 + hash(cyc + 13) * 26 + dy * travel;
      c.strokeStyle = grad(c, hx, hy, hx - dx * 26, hy - dy * 26, [[0, 'rgba(230,240,255,0.6)'], [1, 'rgba(230,240,255,0)']]);
      c.lineWidth = 0.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx - dx * 26, hy - dy * 26); c.stroke();
      glow(c, hx, hy, 1.6, '235,245,255', 0.7);
      c.restore();
    }
  }
}

// ------------------------------------------------------------- the director
// Peter, 13 Oct: "we have gone WAY overboard … much more minimal and only
// have things appear now and then and never everything at once". So for the
// L/M/plateau looks one director decides what's outside: time runs in 10 s
// slots; in two slots of every three ONE thing happens (never the same thing
// twice running), the third is empty; and nothing happens at all while a big
// moment — the borealis or the mothership — is up. Everything else outside
// is the mountains, the stars and the planets.
const SLOT = 10;
// Pads are generous: a trail or glow behind a craft must be off screen too.
const across = (s, u, dir, pad = 100) => dir > 0 ? -pad + u * (s.view + pad * 2) : s.view + pad - u * (s.view + pad * 2);
const EVENTS = [
  // Everything that flies goes LEFT TO RIGHT, with the hero and against the
  // scroll (Peter, 13 Oct: a shuttle heading left at about the scenery's pace
  // read as parked, and as if it were in the lane). Quicker, too.
  { id: 'shuttle', pass: 'sky', dur: 2.6, draw: (c, s, a, ev) => shuttle(c, (() => { const x = across(s, a / 2.6, 1); traceAt('shuttle', x, 30); return x; })(), -64 - hash(ev * 3 + 1) * 14 + Math.sin(a * 2) * 2, 0.6, 1, engine(ev)) },
  { id: 'hauler', pass: 'sky', dur: 5, draw: (c, s, a, ev) => hauler(c, across(s, a / 5, 1), -96 - hash(ev + 40) * 12, 0.55, 1) },
  // High in the sky, always a pair, climbing as they cross (13 Oct: a lone skiff
  // low over the ridges sat at head height and read as something in the lane).
  { id: 'skiffs', pass: 'sky', dur: 3.2, draw: (c, s, a, ev) => skiffPair(c, s, a / 3.2, ev) },
  { id: 'tug', pass: 'sky', dur: 5.5, draw: (c, s, a, ev) => tug(c, across(s, a / 5.5, 1), -82 - hash(ev + 140) * 14, 1, s.t) },
  { id: 'meteors', pass: 'sky', dur: 2.2, draw: (c, s, a, ev) => {
    for (let i = 0; i < 7; i++) { const p = (a - i * 0.18) / 0.8; if (p < 0 || p > 1) continue;
      c.save(); c.globalAlpha *= Math.min(1, p / 0.2, (1 - p) / 0.25);   // fade, never pop
      meteor(c, s.view * (0.25 + hash(i + ev * 7) * 0.8) - p * 90, -132 + p * 50 + hash(i + ev * 5) * 12); c.restore(); } } },
  { id: 'dogfight', pass: 'sky', dur: 5, draw: (c, s, a, ev) => { c.save(); c.globalAlpha *= Math.min(1, a / 0.8, (5 - a) / 0.6); dogfightAt(c, s.view * (0.3 + hash(ev + 90) * 0.4), -114 + hash(ev + 91) * 10, a); c.restore(); } },
  { id: 'satellite', pass: 'sky', dur: 8, draw: (c, s, a, ev) => satellite(c, across(s, a / 8, ev % 2 ? 1 : -1, 50), -118 + hash(ev + 11) * 30, s.t, ev) },
  // The Martian fleet, here and there in every level (Peter, 13 Oct).
  { id: 'fleet', pass: 'front', dur: 4, draw: (c, s, a, ev) => { const x = across(s, a / 4, 1, 90), fl = flight(ev * 3 + 11); traceAt('fleet', x - 22, 26); saucerFleet(c, x, -118 + hash(ev + 210) * 10 + a * 2, s.t, fl.n, 0.17, fl.shape); } },
  { id: 'cargo', pass: 'near', dur: 8, draw: (c, s, a, ev) => cargoLine(c, across(s, a / 8, 1, 90), -94, s.t, ev) },
];
function bigMoment(s, secondsAgo = 0) {
  if (s.progress == null) return false;
  // Judged at the moment an event STARTED, never now: a craft already on screen
  // always finishes its crossing (Peter, 13 Oct: nothing may pop in or out on
  // screen). Progress moves at a steady rate, so its value `secondsAgo` back is
  // a straight extrapolation.
  const rate = s.t > 0.5 ? s.progress / s.t : 0, p = s.progress - rate * secondsAgo;
  // Level 3's ending belongs to the lone Martian's gag and the saucer: nothing
  // new starts in the last tenth.
  if (s.stage === 3 && p > 0.86) return true;
  return p > AURORA_SPAN[0] - 0.02 && p < AURORA_SPAN[1] + 0.02;
}
// ONE SET PIECE AT A TIME in the invasion levels (Peter, 14 Oct: "make sure we don't
// have multiple set pieces occur at the same time? eg. martians shooting ships while
// others shoot a plateau or butte … or a single martian ship shooting other
// fighters"). In order of precedence: a strike on a shelf or butte (space-plateaus.js
// tells us, setStrikeBusy), then the director's hunt, then each sortie lane. Each is a
// pure function of the scene clock, so the same thing is decided every frame, and a
// later one only starts if its whole run is clear of the earlier ones.
let strikeBusy = null;
export function setStrikeBusy(fn) { strikeBusy = fn; }
const war = (s) => s.stage === 2 || s.stage === 3;
// Progress at scene time t, extrapolated at the run's steady rate.
const progressAt = (s, t) => s.progress + (s.t > 0.5 ? s.progress / s.t : 0) * (t - s.t);
function strikeDuring(s, t0, t1) {
  if (!strikeBusy) return false;
  for (let t = t0; t <= t1 + 1e-6; t += 0.4) if (strikeBusy(s, progressAt(s, t))) return true;
  return false;
}
// The director's event running over [t0, t1], if any slot's event overlaps it.
function huntDuring(s, t0, t1) {
  for (let slot = Math.floor(t0 / SLOT) - 1; slot <= Math.floor(t1 / SLOT); slot++) {
    if (((slot % 3) + 3) % 3 === 2) continue;
    const e = (s.stage === 3 ? pick3 : pick)(slot), a = slot * SLOT + 1, b = a + e.dur;
    if (b < t0 || a > t1) continue;
    if (bigMoment(s, s.t - a) || strikeDuring(s, a, b)) continue;
    return true;
  }
  return false;
}
const SORTIES = [[5, 1.3], [7.5, 4.1]];
// (Only a CHASED sortie — level 3's, a saucer on its tail — is a set piece; plain
// fighters may pass over anything.)
function sortieDuring(s, lane, t0, t1) {
  if (s.stage !== 3) return false;
  const [period, offset] = SORTIES[lane], dur = 2.5;
  for (let ev = Math.floor((t0 + offset) / period) - 1; ev <= Math.floor((t1 + offset) / period); ev++) {
    const a = ev * period - offset, b = a + dur;
    if (b >= t0 && a <= t1 && !sortieBlocked(s, lane, a, b)) return true;
  }
  return false;
}
function sortieBlocked(s, lane, a, b) {
  if (!war(s)) return false;
  return strikeDuring(s, a, b) || huntDuring(s, a, b) || (lane === 1 && sortieDuring(s, 0, a, b));
}
function pick(slot) {
  const n = EVENTS.length, i = Math.floor(hash(slot * 7 + 3) * n), prev = Math.floor(hash((slot - 1) * 7 + 3) * n);
  return EVENTS[i === prev ? (i + 1) % n : i];
}
function directed(c, s, pass) {
  const slot = Math.floor(s.t / SLOT);
  if (((slot % 3) + 3) % 3 === 2) return;               // an empty slot
  const e = (s.stage === 3 ? pick3 : pick)(slot), age = s.t - slot * SLOT - 1;     // a beat of quiet first
  if (age < 0 || age > e.dur || bigMoment(s, age)) return;
  if (war(s) && strikeDuring(s, s.t - age, s.t - age + e.dur)) return;
  if (e.pass === pass) e.draw(c, s, age, slot);
}
// The ground buildings, sparse: one every ~420 units of ground, no launch pads
// (a pad is a pad because something lifts off it, and that's an event now).
function sparseOutposts(c, s, look) {
  for (const [k, x0] of along(s, GROUND_F, 420, 200)) {   // wide pad: masts' beams reach far
    const x = x0 + hash(k * 5) * 120, kind = Math.floor(hash(k * 9 + 2) * 3);
    if (kind === 0) { plinth(c, look, x - 17, x + 17, MOUND_Y, MOUND_D); domes(c, x, MOUND_Y, k); }
    else if (kind === 1) { plinth(c, look, x - 5, x + 16, MOUND_Y, MOUND_D); tower(c, x, MOUND_Y, s.t, k); }
    else { plinth(c, look, x - 16, x + 15, MOUND_Y, MOUND_D); pumpjack(c, x, MOUND_Y, s.t, k); }
  }
}
// Little fighters, here and there (Peter, 13 Oct: "lose the mother ship and
// have lots of little fighters appear here and there … they kind of look like
// the Asteroids game, which I like"). Their own channel beside the director:
// two staggered lanes, each a short sortie every few seconds — one, two or
// three ships in from an edge on a gentle bank, gone in under two seconds.
function sortie(c, s, period, offset, lane) {
  // Level 3: every sortie has a Martian saucer on its tail, firing — it brings
  // the lead ship down about half the time and misses the rest (Peter, 13 Oct:
  // "they should be trying to destroy everything"). The chaser lags, so the
  // run lasts a little longer for it to clear the frame too.
  // Sorties may fly over another set piece (Peter, 14 Oct: "perhaps there can be some
  // overlap for the sorties") — but then as plain fighters passing, with no saucer on
  // their tail, so there is still only one fight on screen.
  const base = 1.9;
  const { ev, age } = event(s.t, period, offset);
  const chased = s.stage === 3 && !sortieBlocked(s, lane, s.t - age, s.t - age + 2.5);
  const war = chased, dur = war ? 2.5 : base;
  if (age > dur || bigMoment(s, age)) return;
  const seed = ev * 13 + lane * 101, u = age / base;
  const fromLeft = hash(seed) > 0.5, dir = fromLeft ? 1 : -1;
  const y0 = -128 + hash(seed + 1) * 70, climb = (hash(seed + 2) - 0.5) * 70, bank = (hash(seed + 3) - 0.5) * 1.2;
  const x0 = fromLeft ? -50 : s.view + 50, run = s.view + 140 + hash(seed + 4) * 80;   // always clears the frame
  const n = 1 + Math.floor(hash(seed + 5) * 3), eng = engine(ev + lane);
  const at = (uu, i = 0) => [x0 + dir * uu * run, y0 + climb * uu + bank * 30 * uu * uu + (i ? (i % 2 ? -5 : 5) : 0)];
  const hit = war && hash(seed + 9) < 0.55, KILL = 0.62;
  for (let i = 0; i < n; i++) {
    const uu = u - i * 0.06; if (uu < 0) continue;
    const [x, y] = at(uu, i);
    if (hit && i === 0 && uu >= KILL) {
      const [kx, ky] = at(KILL), p = (uu - KILL) / 0.5;
      if (p < 1) { traceAt('boom', kx, 30); boom(c, kx + dir * p * 14, ky + p * p * 18, p, 0.9); }
      continue;
    }
    traceAt(`fighter${lane}.${i}`, x, 8);
    const heading = Math.atan2(climb + bank * 60 * uu, dir * run);
    c.save(); c.translate(x, y); c.rotate(dir > 0 ? heading : heading - Math.PI);
    fighter(c, 0, 0, 0.5, dir > 0 ? 1 : -1, eng);
    c.restore();
  }
  if (!war) return;
  const cu = u - 0.24;
  if (cu < -0.1) return;
  const [cx, cy] = at(cu); const chY = cy - 6;
  traceAt(`chaser${lane}`, cx, 14);
  marsSaucer(c, cx, chY, 0.26, s.t, { pilot: false });
  // Bolts at the lead ship while it is in range; a miss streaks past it.
  if (u > 0.28 && u < (hit ? KILL : 0.85)) {
    const [tx, ty] = at(Math.min(u, hit ? KILL : u)), miss = hit ? 0 : 7 + hash(seed + Math.floor(s.t * 3)) * 8;
    for (let k = 0; k < 2; k++) {
      const ph = ((s.t * 3.2 + k * 0.5) % 1 + 1) % 1;
      const ex = tx + dir * miss * 1.6, ey = ty - miss * (k ? 1 : -1) * 0.6;
      const x1 = cx + (ex - cx) * ph, y1 = chY + (ey - chY) * ph, x2 = cx + (ex - cx) * Math.min(1, ph + 0.16), y2 = chY + (ey - chY) * Math.min(1, ph + 0.16);
      c.strokeStyle = 'rgba(170,255,140,0.9)'; c.lineWidth = 0.7; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
      glow(c, x2, y2, 2, '170,255,140', 0.7);
    }
  }
}
// The astronaut works the hull by the finish line (Peter, 13 Oct: "perhaps the
// astronaut appears near the finish line"), fixed to the station so he scrolls in
// with it. Since later on 13 Oct ("make sure in the final windows before the finish
// jump there is something … at the moment it is very bare") he hangs FINISH_BACK
// units short of the stage's end: in the windows through the finish jump and in the
// frame the camera parks on (finishCameraX is the stage length less ~222), where at
// 95% of the stage he had already scrolled away.
// The saucer is the late-stage moment now (Peter, 13 Oct: "appears near the
// end"; later the same day, "i would like the alien to appear later in general"):
// one flight, centred on 94% of the stage: it hangs over the finish jump (the run
// asks for the floor ~2.9 s before the parked frame) and zips off as the
// astronaut's windows come in. It drifts in from the right,
// hangs a moment beaming the ground while its pilot breaks into a grin,
// then zips away up-left. Tied to stage progress, never to a slot.
const SAUCER_AT = 0.94, SAUCER_SPAN = 0.06;
function lateSaucer(c, s) {
  // The friendly cyclops is level 1's alone (Peter, 13 Oct): not in level 2's
  // foretaste of the invasion, nor in the invasion itself.
  if (s.progress == null || s.stage !== 1) return;
  const u = (s.progress - SAUCER_AT) / SAUCER_SPAN + 0.5;     // 0..1 over its visit
  if (u < 0 || u > 1) return;
  const hx = s.view * 0.55, hy = -74;
  let x, y, beam = 0;
  if (u < 0.3) { const e = 1 - Math.pow(1 - u / 0.3, 2); x = s.view + 80 + (hx - s.view - 80) * e; y = -118 + (hy + 118) * e; }
  else if (u < 0.7) { x = hx + Math.sin(s.t * 3) * 1.2; y = hy + Math.sin(s.t * 2) * 1.5; beam = Math.min(1, (u - 0.34) * 12, (0.7 - u) * 12); }
  else { const v = (u - 0.7) / 0.3; x = hx - v * v * (hx + 120); y = hy - v * v * 70; }
  const smile = Math.min(1, Math.max(0, (u - 0.25) / 0.25));
  saucer(c, x, y, s.t, Math.max(0, beam), 1.25, smile);
}
const FINISH_BACK = 40;
function finishWalker(c, s) {
  if (s.progress == null) return;
  // Anchored to a window in the parked finish frame, so he scrolls in with
  // the station and remains there through the finish hold.
  const len = s.length ?? 4680;
  const finishOffset = ((s.finishProgress ?? 0.97) - s.progress) * len;
  const anchor = (s.finishWalkerPaneX ?? s.view * 0.5) + finishOffset;
  if (anchor < -140 || anchor > s.view + 140) return;
  let x = anchor, top = -134;
  // Callers that haven't preselected a finish pane keep the old nearest-pane
  // fallback; production room draws pass a pane fixed to the parked camera.
  if (s.finishWalkerPaneX == null && s.panes?.length) {
    const panes = [...s.panes].sort((a, b) => a[0] - b[0]);
    const pitch = panes.length > 1 ? panes[1][0] - panes[0][0] : 0;
    const at = anchor - pitch;
    const [px, pw] = panes.reduce((best, p) => Math.abs(p[0] + p[1] / 2 - at) < Math.abs(best[0] + best[1] / 2 - at) ? p : best);
    if (Math.abs(px + pw / 2 - at) > pw / 2 + 6) return;
    x = px + pw / 2 - 2;
  }
  // The astronaut ends level 1 (the friendly saucer is gone — too like the
  // dangerous ones, Peter, 13 Oct); level 2 ends on a hovering flight of
  // small saucers, level 3 on the big Martian saucer.
  if (s.stage !== 1) return;
  // Drifting (picked from the pose bake-off, 14 Oct: "astronaut drifting is
  // perfect"), and turned to about four o'clock as he comes into view so he goes
  // through upside down while you watch ("perhaps he's at like 4 o'clock when he
  // appears on screen so we see him upside down for a bit"): his turn is counted
  // from the moment he crosses the right edge, then on through the finish hold.
  const since = Math.max(0, s.view + 25 - x) / ((s.speed || 120) / (s.sceneS || 1)) + (s.holdT || 0);
  spacewalker(c, x, -72 + Math.sin(s.t * 0.8) * 4, s.t, 3, top, walkerPose, Math.PI * 2 / 3 + since * DRIFT_TURN);
}
// A calmer astronaut half way through level 1 (Peter, 14 Oct: "can we have a not out
// of control spaceman around half way in level 1 in a section that is perhaps a
// little quiet right now?"): fixed to the station at MID_AT of the stage, one hand
// on his tether, welding the hull and now and then waving, centred in a window.
const MID_AT = 0.52;
function midWalker(c, s) {
  if (s.progress == null || s.stage !== 1) return;
  const len = s.length ?? 4680;
  const anchor = s.view * 0.5 + (MID_AT - s.progress) * len;
  if (anchor < -140 || anchor > s.view + 140) return;
  let x = anchor;
  if (s.panes?.length) {
    const [px, pw] = s.panes.reduce((best, p) => Math.abs(p[0] + p[1] / 2 - anchor) < Math.abs(best[0] + best[1] / 2 - anchor) ? p : best);
    if (Math.abs(px + pw / 2 - anchor) > pw / 2 + 6) return;
    x = px + pw / 2 - 2;
  }
  spacewalker(c, x, -66 + Math.sin(s.t * 0.7) * 3, s.t, 5, -134, 'grip');   // lower in the glass (14 Oct)
}
function flights(c, s) {
  sortie(c, s, ...SORTIES[0], 0);
  sortie(c, s, ...SORTIES[1], 1);
}
// The friendly cyclops saucer is out of the levels (Peter, 13 Oct: "too
// confusing with the dangerous ones"); it stays on the lab sheet.
export const DIRECTED_LIFE = ['auroraFacets', 'flights', 'finishSaucer', 'finishWalker', 'midWalker', 'sparseOutposts'];

// ------------------------------------------------------------- catalogue
// Every object on its own, for the lab page (Peter, 13 Oct: "a lab/gallery
// page to show all the objects"). draw(c, t, w, h) paints at the origin of a
// world-unit tile; `w`/`h` are the tile's world size. Same painters as the
// layers, so what the page shows is what flies past the windows.
const loop = (t, period) => ((t % period) + period) % period;
export const SPACE_LIFE_OBJECTS = [
  { id: 'shuttle', name: 'Shuttle', layer: 'Traffic', w: 120, h: 60,
    draw: (c, t, w, h) => ['255,120,200', CYAN, '255,190,90'].forEach((e, i) => shuttle(c, 30 + i * 32 + Math.sin(t + i) * 2, h / 2 - 12 + i * 12, 0.6, 1, e)) },
  { id: 'hauler', name: 'Container hauler', layer: 'Traffic', w: 120, h: 40, draw: (c, t, w, h) => hauler(c, w / 2 + 22, h / 2, 0.9, 1) },
  { id: 'fighters', name: 'Fighters (a V of three)', layer: 'Traffic', w: 120, h: 40,
    draw: (c, t, w, h) => { for (const [dx, dy] of [[0, 0], [-9, -5], [-9, 5]]) fighter(c, w / 2 + 10 + dx, h / 2 + dy, 0.9, 1, CYAN); } },
  { id: 'satellite', name: 'Satellite', layer: 'Satellites', w: 60, h: 40, draw: (c, t, w, h) => satellite(c, w / 2, h / 2, t, 0) },
  { id: 'meteor', name: 'Meteor', layer: 'Meteor shower', w: 60, h: 40,
    draw: (c, t, w, h) => { const p = loop(t, 1.2) / 1.2; meteor(c, w - 10 - p * 40, 8 + p * 24); } },
  { id: 'dogfight', name: 'Dogfight', layer: 'Distant dogfight', w: 80, h: 40, draw: (c, t, w, h) => dogfightAt(c, w / 2, h / 2, loop(t, 5)) },
  { id: 'auroraFacets', name: 'Aurora, faceted (borealis)', layer: 'Aurora, faceted', w: 240, h: 60,
    draw: (c, t, w, h) => { c.save(); c.translate(0, 140); auroraFacets(c, { t, view: w, cam: 0 }, { pal: { name: 'JADE' } }); c.restore(); } },
  { id: 'aurora', name: 'Aurora, soft rays (borealis)', layer: 'Aurora, soft rays', w: 240, h: 60,
    draw: (c, t, w, h) => { c.save(); c.translate(0, 140); aurora(c, { t, view: w, cam: 0 }, { pal: { name: 'JADE' } }); c.restore(); } },
  { id: 'mothership', name: 'Mothership', layer: 'Mothership', w: 420, h: 90, draw: (c, t, w, h) => mothershipAt(c, w / 2 + 8, 50, t, 0.92) },
  { id: 'domes', name: 'Domes', layer: 'Outposts', w: 60, h: 30, draw: (c, t, w, h) => { plinth(c, null, w / 2 - 17, w / 2 + 17, h - 6); domes(c, w / 2, h - 6, 1); } },
  { id: 'tower', name: 'Mast, dish and searchlight', layer: 'Outposts', w: 80, h: 80, draw: (c, t, w, h) => { plinth(c, null, w / 2 - 11, w / 2 + 10, h - 6); tower(c, w / 2 - 6, h - 6, t, 1); } },
  { id: 'pad', name: 'Launch pad (waits, lifts off, next rocket rises — 16 s)', layer: 'Outposts', w: 60, h: 80, draw: (c, t, w, h) => launchPad(c, w / 2, h - 6, t, 0) },
  { id: 'pumpjack', name: 'Pumpjack', layer: 'Outposts', w: 60, h: 30, draw: (c, t, w, h) => { plinth(c, null, w / 2 - 12, w / 2 + 19, h - 6); pumpjack(c, w / 2 + 4, h - 6, t, 0); } },
  { id: 'skiff', name: 'Skiffs', layer: 'Skiffs', w: 90, h: 30,
    draw: (c, t, w, h) => { skiff(c, w / 2 + 14, h / 2 - 2, 1, t); skiff(c, w / 2 - 2, h / 2 + 4, 1, t + 1); } },
  { id: 'tug', name: 'Tug towing a container', layer: 'Tug and container', w: 90, h: 30, draw: (c, t, w, h) => tug(c, w / 2 + 18, h / 2 - 2, 1, t) },
  { id: 'lander', name: 'Lander (down, wait, up)', layer: 'Lander', w: 60, h: 90,
    draw: (c, t, w, h) => { const a = ((t % 9) + 9) % 9, d = a < 3 ? 1 - a / 3 : a < 6 ? 0 : (a - 6) / 3;
      rect(c, 0, h - 6, w, 6, '#2a5a48'); lander(c, w / 2, h - 11 - d * d * 70, t, 1 - Math.min(1, d * 3)); } },
  { id: 'saucer', name: 'Flying saucer, Martian at the controls, and beam', layer: 'Director', w: 80, h: 110,
    draw: (c, t, w, h) => { const p = ((t % 6) + 6) % 6; saucer(c, w / 2, 36, t, p > 3 && p < 5 ? 1 : 0, 1.25, Math.min(1, Math.max(0, (p - 1) / 1.5))); } },
  { id: 'rover', name: 'Rover', layer: 'Rovers', w: 80, h: 30, draw: (c, t, w, h) => rover(c, w / 2 - 12, h - 8, t, 0) },
  { id: 'post', name: 'Landing-light posts', layer: 'Landing lights', w: 80, h: 24,
    draw: (c, t, w, h) => { for (let k = 0; k < 6; k++) lightPost(c, 8 + k * 13, h - 10, ((t * 8 - k) % 12 + 12) % 12 < 1.2); } },
  { id: 'cargo', name: 'Cargo pods on a line', layer: 'Cargo pods', w: 80, h: 40, draw: (c, t, w, h) => cargoLine(c, w / 2 + 20, h / 2 - 6, t, 0) },
  { id: 'astronaut', name: 'Astronaut, drone and tether', layer: 'Astronaut', w: 70, h: 70, draw: (c, t, w, h) => spacewalker(c, w / 2, h / 2 + 8, t, 0, 0) },
];

// ------------------------------------------------------------- registry
export const SPACE_LIFE = [
  { id: 'auroraFacets', name: 'Aurora, faceted', pass: 'sky', draw: auroraFacets, note: 'the borealis cut into flat stepped triangles with a bright sawtooth hem; shows from 10% to 40% of the stage' },
  { id: 'aurora', name: 'Aurora, soft rays', pass: 'sky', draw: aurora, note: 'thin vertical rays, bright at the hem, fading up' },
  { id: 'lateSaucer', name: 'The saucer, near the end', pass: 'front', draw: lateSaucer, note: 'one visit at 94% of the stage, over the finish jump: drifts in, beams, the pilot grins, zips off' },
  { id: 'finishSaucer', name: 'Saucer over the finish (level 3)', pass: 'front', draw: finishSaucer, note: 'the invasion won: the Martian saucer hovers by the airlock' },
  { id: 'finishWalker', name: 'Astronaut at the finish', pass: 'near', draw: finishWalker, note: 'on the hull by the airlock: through the finish jump and in the final frame' },
  { id: 'midWalker', name: 'Astronaut half way', pass: 'near', draw: midWalker, note: 'level 1, about half way: a calm one, gripping his tether and welding' },
  { id: 'flights', name: 'Fighters, here and there', pass: 'sky', draw: flights, note: 'one to three little ships in from an edge on a bank, every few seconds on two staggered lanes' },
  { id: 'satellites', name: 'Satellites', pass: 'sky', draw: satellites, note: 'tumbling, panels catching the light, red blink' },
  { id: 'mothership', name: 'Mothership', pass: 'sky', draw: mothership, note: 'the mid-stage moment: a capital ship slides across every window (stage 30–70%)' },
  { id: 'ships', name: 'Traffic', pass: 'sky', draw: ships, note: 'a shuttle every 9 s, a container hauler every 23 s, a V of fighters every 13 s' },
  { id: 'meteors', name: 'Meteor shower', pass: 'sky', draw: meteors, note: 'seven streaks every 21 s' },
  { id: 'dogfight', name: 'Distant dogfight', pass: 'sky', draw: dogfight, note: 'two specks circling and firing, one goes pop — every 15 s' },
  { id: 'skiffs', name: 'Skiffs', pass: 'sky', draw: skiffs, note: 'a pair of skimmers banking across the upper sky every 7 s' },
  { id: 'tugs', name: 'Tug and container', pass: 'sky', draw: tugs, note: 'a tug towing a swinging container across the sky every 17 s' },
  { id: 'landers', name: 'Lander', pass: 'ground', draw: landers, note: 'drops onto the ground on its thrusters, waits, lifts off — every 16 s' },
  { id: 'sparseOutposts', name: 'Outposts, sparse', pass: 'ground', draw: sparseOutposts, note: 'one dome, mast or pumpjack every ~420 units of ground; no pads' },
  { id: 'outposts', name: 'Outposts', pass: 'ground', draw: outposts, note: 'domes with lit windows, masts with beacons, turning dishes and searchlights, a launch pad (a rocket waits, lifts off, the next rises), pumpjacks' },
  { id: 'rovers', name: 'Rovers', pass: 'front', draw: rovers, note: 'crawling with headlights and a blinking antenna' },
  { id: 'lights', name: 'Landing lights', pass: 'front', draw: landingLights, note: 'a chasing row of posts along the near ground' },
  { id: 'cargo', name: 'Cargo pods', pass: 'near', draw: cargo, note: 'a train of containers on a line, drifting past the glass' },
  { id: 'astronaut', name: 'Astronaut', pass: 'near', draw: astronaut, note: 'tethered to the hull, welding — and waving at you now and then — with his drone' },
];
const BY_ID = Object.fromEntries(SPACE_LIFE.map(l => [l.id, l]));
// The landing lights stay on the sheet but out of the full set: clutter.
// The faceted aurora stands in for the soft one in the full set.
export const ALL_LIFE = SPACE_LIFE.map(l => l.id).filter(id => id !== 'lights' && id !== 'aurora' && id !== 'sparseOutposts');
export function lifePass(c, s, look, pass) {
  if (look.director) directed(c, s, pass);
  if (!look.life) return;
  for (const id of look.life) { const l = BY_ID[id]; if (l && l.pass === pass) l.draw(c, s, look); }
}

// ------------------------------------------------------------- the invasion
// Level 3 is a full Martian invasion (Peter, 13 Oct: "the fleet destroys the
// other ships and equipment … B flies in to help destroy things on land, then
// hovers near the finish … one Martian on a plateau near the end after
// everything has been destroyed — the Martians have won"). The friendly
// cyclops saucer does not fly here.
//
// Ships: the director's craft are hunted — a fleet comes in behind, bolts
// stitch across, the craft goes up in a fireball and its pieces fall away.

// Explosions in the planets' own language (Peter, 13 Oct: "rendered like 3D
// like the planets"): flat-shaded low-poly. A faceted fireball — a lat/long
// mesh, back faces culled, each facet one step of a fire ramp lit from the
// upper left — swells and cools from white-hot to ember red; faceted rock
// chunks tumble out, each a little lit polyhedron; a grey low-poly smoke ball
// rises and thins. `p` 0..1 over about a second.
const FIRE = ['#3a1410', '#7a2414', '#c4441c', '#f07a26', '#ffb648', '#ffe68a', '#fffbe0'];
const SMOKE = ['#2a2e2e', '#3c4242', '#555c5b', '#717876', '#8e9592'];
const LIT = (() => { const v = [-0.55, -0.6, 0.6], l = Math.hypot(...v); return v.map(x => x / l); })();
function facetBall(c, x, y, R, ramp, spin, alpha = 1, heat = 0, nLat = 5, nLon = 9) {
  if (R <= 0.2 || alpha <= 0) return;
  const tilt = 0.35, ct = Math.cos(tilt), st = Math.sin(tilt);
  const sph = (la, lo) => { const X = Math.cos(la) * Math.sin(lo + spin), Y = Math.sin(la), Z = Math.cos(la) * Math.cos(lo + spin); return [X, Y * ct - Z * st, Y * st + Z * ct]; };
  c.save(); c.globalAlpha *= alpha;
  for (let i = 0; i < nLat; i++) {
    const la0 = -Math.PI / 2 + i * Math.PI / nLat, la1 = la0 + Math.PI / nLat;
    for (let j = 0; j < nLon; j++) {
      const lo0 = j * TAU / nLon, lo1 = lo0 + TAU / nLon, n = sph((la0 + la1) / 2, (lo0 + lo1) / 2);
      if (n[2] <= 0.02) continue;
      const lit = n[0] * LIT[0] + n[1] * LIT[1] + n[2] * LIT[2];
      const k = Math.max(0, Math.min(ramp.length - 1, Math.round((lit * 0.5 + 0.5) * (ramp.length - 1) * 0.75 + heat * (ramp.length - 1) * 0.35 + (hash(i * 9 + j) - 0.5) * 1.2)));
      const pts = [sph(la0, lo0), sph(la0, lo1), sph(la1, lo1), sph(la1, lo0)].map(q => [x + q[0] * R, y + q[1] * R]);
      poly(c, pts, ramp[k]);
    }
  }
  c.restore();
}
function facetChunk(c, x, y, r, spin, ramp) {
  const pts = [];
  for (let i = 0; i < 5; i++) { const a = spin + i * TAU / 5, rr = r * (0.7 + hash(i + Math.floor(r * 10)) * 0.5); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  const apex = [x - r * 0.25, y - r * 0.25];
  for (let i = 0; i < 5; i++) {
    const p = pts[i], q = pts[(i + 1) % 5], mx = (p[0] + q[0]) / 2 - x, my = (p[1] + q[1]) / 2 - y, l = Math.hypot(mx, my) || 1;
    const d = (mx * -0.62 + my * -0.55) / l;
    poly(c, [apex, p, q], ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(1.5 + d * 1.5)))]);
  }
}
export function boom(c, x, y, p, size = 1) {
  if (p <= 0 || p >= 1) return;
  if (p < 0.12) glow(c, x, y, 10 * size, '255,250,220', 0.9 * (1 - p / 0.12));
  // Smoke first, behind the fire: two grey low-poly puffs climbing and thinning.
  if (p > 0.35) {
    const q = (p - 0.35) / 0.65;
    facetBall(c, x - 2 * size - q * 3, y - (6 + q * 18) * size, (3 + q * 6) * size, SMOKE, q * 1.5, 0.8 * (1 - q), 0, 4, 8);
    facetBall(c, x + 3 * size, y - (3 + q * 12) * size, (2.4 + q * 4.5) * size, SMOKE, -q * 1.2, 0.7 * (1 - q), 0, 4, 7);
  }
  // The fireball: a billowing cluster of faceted balls, swelling outward fast,
  // then shrinking and cooling to embers and gone by three-quarters through.
  const grow = p < 0.25 ? p / 0.25 : Math.max(0, 1 - (p - 0.25) / 0.55);
  const R = (2 + 7.5 * grow) * size, heat = 1 - Math.min(1, p * 1.6), fade = 1 - Math.max(0, (p - 0.5) / 0.3);
  if (fade > 0 && R > 0.4) {
    glow(c, x, y, R * 2.2, '255,150,60', 0.4 * fade);
    const puffs = [[0, 0, 1, 0], [-0.75, 0.25, 0.62, 1], [0.7, 0.35, 0.58, 2], [0.15, -0.7, 0.55, 3], [-0.35, -0.5, 0.45, 4]];
    for (const [ox, oy, rs, k] of puffs) {
      const spread = 0.6 + 0.6 * Math.min(1, p / 0.25);
      facetBall(c, x + ox * R * spread, y + oy * R * spread, R * rs, FIRE, p * (2 + k) + k, fade, Math.max(0, heat - k * 0.08), 4, 8);
    }
  }
  // Faceted chunks flung clear of the fire, tumbling and falling.
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * (0.05 + 0.9 * hash(i + 21)), v = (16 + hash(i + 5) * 16) * size;
    const dist = v * Math.min(1, p * 1.5);
    if (dist < R * 0.95) continue;
    const cx = x + Math.cos(a) * dist, cy = y + Math.sin(a) * dist + p * p * 26 * size;
    c.save(); c.globalAlpha *= Math.min(1, (1 - p) / 0.3);   // they fade, never blink out
    facetChunk(c, cx, cy, (0.9 + hash(i) * 1.1) * size, p * 9 + i, i % 3 === 0 ? SMOKE : ['#3a1410', '#7a2414', '#c4441c', '#f07a26']);
    c.restore();
  }
}
// Green ray bolts from a fleet to a target.
function bolts(c, fx, fy, tx, ty, t, a = 1) {
  for (let i = 0; i < 3; i++) {
    const ph = ((t * 3 + i * 0.33) % 1 + 1) % 1, sx = fx - i * 13, sy = fy + (i ? (i % 2 ? -6 : 6) : 0);
    const x0 = sx + (tx - sx) * ph, y0 = sy + (ty - sy) * ph, x1 = sx + (tx - sx) * Math.min(1, ph + 0.18), y1 = sy + (ty - sy) * Math.min(1, ph + 0.18);
    c.strokeStyle = `rgba(170,255,140,${0.9 * a})`; c.lineWidth = 0.8; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    glow(c, x1, y1, 2.4, '170,255,140', 0.7 * a);
  }
}
const FLEET3 = 0.34;   // the invasion's fleet: nearer and bigger
// `band`: [highest, lowest] y it may fly at.
const hunted = (id, dur, paint, band = [-100, -70]) => ({ id: `hunt-${id}`, pass: 'front', dur, draw: (c, s, a, ev) => {
  const u = a / dur, kill = 0.55;
  const y = band[1] - hash(ev + 300) * (band[1] - band[0]);
  const x = across(s, Math.min(u, kill), 1, 100);
  if (u < kill) { traceAt(id, x, 30); paint(c, x, y, s.t, ev); }
  else {
    // Blown up mid-sky: the fireball, then pieces tumbling away below.
    const p = (u - kill) / (1 - kill);
    traceAt(id, x, 30, true);
    boom(c, x, y, Math.min(0.999, p * 1.6), 1.2);
    for (let i = 0; i < 4; i++) rect(c, x + (hash(i + ev) - 0.5) * 30 * p, y + p * p * 70 + i * 2, 2.2, 1.2, `rgba(164,172,184,${Math.max(0, 1 - p * 1.3)})`);
  }
  // The fleet, in behind, closing and then sweeping on through the smoke.
  const dive = Math.exp(-Math.pow((u - kill + 0.04) / 0.22, 2));
  const fx = across(s, Math.min(1, u * 1.15), 1, 150) - 50, fy = -126 + (y - 14 + 126) * dive;
  traceAt('fleet', fx - 40, 46);
  const fl = flight(ev * 5 + 23);
  saucerFleet(c, fx, fy, s.t, fl.n, FLEET3, fl.shape);
  if (u > kill - 0.18 && u < kill) bolts(c, fx, fy + 2, x, y, s.t);
} });
const EVENTS3 = [
  hunted('shuttle', 4.5, (c, x, y, t, ev) => shuttle(c, x, y, 0.6, 1, engine(ev))),
  hunted('hauler', 6, (c, x, y) => hauler(c, x, y, 0.55, 1)),
  // The tug flies lower than the others (Peter, 14 Oct: "too near the top").
  hunted('tug', 6, (c, x, y, t) => tug(c, x, y, 1, t), [-66, -52]),
  { id: 'fleet', pass: 'front', dur: 4, draw: (c, s, a, ev) => { const x = across(s, a / 4, 1, 120), fl = flight(ev * 3 + 17); traceAt('fleet', x - 40, 46); saucerFleet(c, x, -124 + Math.sin(Math.PI * a / 4) * (58 + hash(ev + 210) * 20), s.t, fl.n, FLEET3, fl.shape); } },
];
function pick3(slot) { const n = EVENTS3.length, i = Math.floor(hash(slot * 7 + 3) * n), prev = Math.floor(hash((slot - 1) * 7 + 3) * n); return EVENTS3[i === prev ? (i + 1) % n : i]; }

// Land: every shelf and butte is struck as it passes (space-plateaus.js asks
// for each formation, `f` = { x0, x1, top } its kit's span and top, `d` the
// camera travel since it was mid-frame). The fleet takes the first half,
// bolting across each base left to right; the saucer (B) is held back for the
// second half — a surprise — and sweeps its heat ray left to right; either way
// each piece goes up on its own as the attack passes over it. The last butte
// is left whole for the lone Martian. 'state' returns { mode, sweepX }: pieces
// left of sweepX are destroyed.
export function invasionStrike(c, s, i, f, d, pass) {
  // The saucer comes once, late (Peter, 13 Oct: "later and not so often").
  // Level 2 gets one foretaste: a lone Martian craft takes out the shelf near
  // its end (Peter, 13 Oct: "sell it by having a Martian craft blow up
  // something near the end of the new level 2").
  // Level 2's one raid is on the last butte, seconds from the end (Peter, 13 Oct:
  // "very close to the end … certainly past the 3rd checkpoint").
  const striker = s.stage === 2 ? (i === 8 ? 'fleet' : null) : i < 7 ? 'fleet' : i < 8 ? 'saucer' : 'martian';
  if (!striker) return pass === 'state' ? { mode: 'intact', sweepX: -Infinity } : undefined;
  if (striker === 'martian') {
    if (pass === 'state') return { mode: 'martian' };
    if (pass === 'sky') martianGag(c, s, f, d);
    return;
  }
  const fleetX = -130 + (d + 560) / 1120 * (s.view + 300);
  let sweepX;
  if (striker === 'fleet') sweepX = d < -560 ? -Infinity : d > 560 ? Infinity : fleetX + 14;
  else sweepX = d < -120 ? -Infinity : d > 120 ? Infinity : f.x0 + (f.x1 - f.x0) * (d + 120) / 240;
  if (pass === 'state') return { mode: 'sweep', sweepX };
  if (pass !== 'sky') return;
  if (striker === 'fleet') {
    if (d < -560 || d > 560) return;
    // A swoop: in high, diving low over the base while it bolts it, then
    // climbing away (Peter, 13 Oct: "swoop down to attack").
    const dive = Math.exp(-Math.pow((d + 40) / 300, 2));
    const fy = -126 + (f.top - 30 + 126) * dive;
    traceAt('fleet', fleetX - 40, 46);
    // A small target gets one or two; level 2's single raid is always small.
    const fl = flight(i * 7 + 31, s.stage === 2 || f.x1 - f.x0 < 40);
    saucerFleet(c, fleetX, fy, s.t, fl.n, FLEET3, fl.shape);
    // Level 2 is a precise raid: one aimed bolt per object, drawn by the base's
    // painter (space-plateaus.js aimedBolt), not this stream.
    if (s.stage !== 2 && sweepX > f.x0 - 6 && sweepX < f.x1 + 6) bolts(c, fleetX, fy + 4, sweepX, f.top - 3, s.t);
    return;
  }
  // The saucer: in from the upper left to hover over the kit's left end, then
  // track across it with the beam on, then away up and right. The pilot cackles
  // as the beam comes on (pilotHook, once per run — the listener dedupes).
  const hoverY = f.top - 46;
  let x, y, beam = 0;
  if (d < -440) return;
  if (d < -120) { const e = 1 - Math.pow(1 - (d + 440) / 320, 2); x = -90 + (f.x0 + 90) * e; y = -150 + (hoverY + 150) * e; }
  else if (d < 120) { x = sweepX; y = hoverY + Math.sin(s.t * 2) * 1.2; beam = Math.min(1, (d + 120) / 30, (120 - d) / 30); }
  else if (d < 560) { const v = (d - 120) / 440; x = f.x1 + v * v * (s.view + 170 - f.x1); y = hoverY - v * v * 90; }
  else return;
  traceAt('saucerB', x, 32);
  // Every frame he is up, so his line can ride along with him (pilotHook decides).
  pilotHook?.(speakerAt(c, x, y - 12), beam > 0.5, speakerAt(c, x - 40, y - 4));
  marsSaucer(c, x, y, 0.9, s.t, { ray: Math.max(0, beam), rayLen: (f.top - 1 - y) / 0.9 });   // reaches the plateau top
}
// The lone Martian's gag: a craft flies low over his butte, he swings his ray
// gun up and blasts it out of the sky. One function says where the craft is,
// so the gun (space-plateaus.js) and the craft agree on the aim.
// The shot lands GAG_LEAD camera units before the finish, while the butte is
// still coming on from the right, and the blast (GAG_BOOM long) is over before
// the camera stops — it runs on camera travel, so it would freeze in the hold.
// 0 since the lone Martian rests a screen before the finish: he fires at the
// moment he is centred in his window, frames clear (Peter, 13 Oct).
export const GAG_LEAD = 0, GAG_BOOM = 82;
export function gagCraft(f, d) {
  const mx = (f.x0 + f.x1) / 2 - 2, hitX = mx + 22, y = f.top - 44, dd = d + GAG_LEAD;
  return { mx, hitX, y, x: hitX + dd * 1.4, alive: dd < 0, dd };
}
function martianGag(c, s, f, d) {
  const g = gagCraft(f, d);
  if (g.alive) {
    if (g.x < -120) return;
    traceAt('gagShuttle', g.x, 30);
    shuttle(c, g.x, g.y + Math.sin(s.t * 3) * 0.8, 0.6, 1, engine(2));
  } else if (g.dd < GAG_BOOM) {
    const p = g.dd / GAG_BOOM;
    traceAt('gagShuttle', g.hitX, 30, true);
    boom(c, g.hitX + p * 10, g.y + p * p * 30, Math.min(0.999, p * 1.5), 1.3);
    for (let i = 0; i < 5; i++) rect(c, g.hitX + (hash(i + 7) - 0.5) * 36 * p, g.y + p * p * (40 + i * 6), 2, 1.2, `rgba(220,226,234,${Math.max(0, 1 - p * 1.2)})`);
  }
}
// The saucer (B) hovering over the finish of level 3, the invasion won.
// Level 2's ending (Peter, 13 Oct: "lots of Martian ships converge and hover on
// screen when we reach the finish … have more appear as we are on the finish
// line so it looks like an invasion"). A clock that starts a few seconds before
// the finish and keeps running through the hold; flights arrive on it one after
// another from the edges and the top, swoop to a hover point and stay, bobbing.
// "Even more … in varying sizes" (Peter, 13 Oct): 28 flights, a few arriving
// every second once the finish is near, sizes from far-off specks to big
// near ones; small ones sit higher (further away), big ones lower and nearer.
// "As many as possible" (Peter, 13 Oct): 64 flights, the far ones on the
// cheap painter, arriving faster and faster through the held finish.
const ARRIVALS = Array.from({ length: 64 }, (_, i) => {
  const depth = Math.pow(hash(i + 430), 1.6);            // 0 far … 1 near; mostly far
  return {
    at: Math.pow(i, 0.8) * 0.2 + hash(i + 400) * 0.15,   // faster (Peter, 13 Oct): all 64 in ~5 s
    from: ['left', 'right', 'top', 'right', 'left', 'top', 'top'][i % 7],
    hx: 0.05 + ((i * 0.371 + hash(i + 410) * 0.17) % 0.9),
    hy: -132 + depth * 70 + (hash(i + 420) - 0.5) * 22,
    sc: 0.12 + depth * depth * 0.5,
    shape: ['single', 'pair', 'line', 'single', 'echelon', 'pair', 'loose', 'single', 'v'][i % 9],
  };
}).sort((a, b) => a.sc - b.sc);                          // far ones painted first
function convergence(c, s) {
  if (s.progress == null) return;
  // Not until the finish line is in view (~0.9 s before the camera parks).
  const fp = s.finishProgress ?? 0.98, lead = 0.9;
  const clock = Math.min(s.progress, fp) * s.length / (s.speed || 120) - (fp * s.length / (s.speed || 120) - lead) + (s.holdT || 0);
  if (clock < 0) return;
  const vis = s.view - 60;
  ARRIVALS.forEach((a, i) => {
    const age = clock - a.at;
    if (age < 0) return;
    // Spread either side of the finish line (Peter, 13 Oct), the frame's whole
    // width in portrait; in landscape the line sits right, so spread across all.
    // The whole painted width (s.view): in portrait the lane is shifted left and
    // the frame shows more on the right than `vis` assumed (Peter, 13 Oct).
    const hx = 6 + a.hx * (s.view - 12), hy = a.hy;
    const sx = a.from === 'left' ? -70 : a.from === 'right' ? s.view + 70 : hx + (hash(i) - 0.5) * 80;
    const sy = a.from === 'top' ? -190 : hy - 30 - hash(i + 3) * 30;
    const u = Math.min(1, age / 1.5), e = 1 - Math.pow(1 - u, 3);
    const x = sx + (hx - sx) * e + (u >= 1 ? Math.sin(s.t * 0.5 + i) * 6 : 0);
    const y = sy + (hy - sy) * e + Math.sin(s.t * 0.9 + i * 1.7) * 2.5 + (1 - e) * Math.sin(e * Math.PI) * 18;
    traceAt(`arrival${i}`, x, 30);
    saucerFleet(c, x, y, s.t + i, a.shape === 'single' ? 1 : 3, a.sc, a.shape);
  });
}
function finishSaucer(c, s) {
  if ((s.stage !== 3 && s.stage !== 2) || s.progress == null) return;
  const x = s.view * 0.62 - (s.progress - (s.finishProgress ?? 0.975)) * (s.length ?? 4680) * 0.3;
  if (s.stage === 2) { convergence(c, s); return; }
  // Level 3: as the finish line comes into view the Martian swoops in on an arc
  // from the top left — down, then gliding right — to hover in the window just
  // left of the finish line (Peter, 13 Oct: "a little slower so we get the full
  // effect").
  const fp = s.finishProgress ?? 0.98, spd = s.speed || 120, lead = 0.9;   // the finish line enters view ~0.9 s before the camera parks
  const clock = Math.min(s.progress, fp) * s.length / spd - (fp * s.length / spd - lead) + (s.holdT || 0);
  if (clock < 0) return;
  if (s.portrait) {
    // Portrait has no room for the arc: he drops straight down from above the
    // finish line and settles to hover over it (Peter, 13 Oct).
    const D = 1.8, u = Math.min(1, clock / D), e = 1 - Math.pow(1 - u, 3);
    // Whole dome inside the glass: tall glass draws the view 1.3× (14 Oct), and
    // at the old -114 he hovered above the window, out of sight but for his
    // tractor beam. Now just under the glass top, right of the finish line
    // (the screen's open side in portrait), clear of the flag pole.
    const px = (s.finishLine ?? s.view * 0.6) + 34, py = (s.glassTop ?? -134) + 16, fy0 = -230;
    const fy = fy0 + (py - fy0) * e, settle = Math.min(1, Math.max(0, clock - D) / 1.2);
    traceAt('saucerB-finish', px, 50, false, fy);
    marsSaucer(c, px + Math.sin(s.t * 0.5) * 4 * settle, fy + Math.sin(s.t * 0.8) * 3 * settle, 1, s.t, { ray: 0 });   // no tractor beam in portrait: too close to the hero (14 Oct)
    if (settle > 0.25) finishAckHook?.(s.t, speakerAt(c, px, fy - 14));
    return;
  }
  const DUR = 2.6, u = Math.min(1, clock / DUR), e = u * u * (3 - 2 * u);
  const tx = s.finishPaneX ?? s.view * 0.5, ty = -80;
  const p0 = [-90, -215], p1 = [tx * 0.15, ty + 26], p2 = [tx, ty];     // dive down, then glide right
  const fx = (1 - e) * (1 - e) * p0[0] + 2 * (1 - e) * e * p1[0] + e * e * p2[0];
  const fy = (1 - e) * (1 - e) * p0[1] + 2 * (1 - e) * e * p1[1] + e * e * p2[1];
  const drift = u >= 1 ? 1 : 0;
  const settle = Math.min(1, Math.max(0, clock - DUR) / 1.2);       // the hover bob eases in
  traceAt('saucerB-finish', fx, 50, false, fy);
  c.save();
  c.translate(fx, fy); c.rotate((1 - e) * 0.35 * Math.sin(e * Math.PI) + Math.sin(s.t * 0.9) * 0.03 * settle); c.translate(-fx, -fy);
  marsSaucer(c, fx + Math.sin(s.t * 0.5) * 6 * settle * drift, fy + Math.sin(s.t * 0.8) * 3 * settle, 1, s.t, { ray: 0, ...tractorOn(clock - DUR, fy) });
  c.restore();
  if (settle > 0.25) finishAckHook?.(s.t, speakerAt(c, fx, fy - 14));
}
// What the finish saucer says once it has settled (Peter, 14 Oct: "the spaceship
// at the end can say ACK! ACK!" — then "just have the acks appear in our standard
// float, not an actual bubble", and "the repeated ACKs like the bubble had"): the run
// hears it here, with the scene clock, and floats the words on the bubble's cycle.
let finishAckHook = null;
// Where a speaker is, in device pixels, for the run to pin his words over him
// (Peter, 14 Oct: "can the acks be tied to the martian in the ship and the martian
// standing … so it's obviously coming from them").
export function speakerAt(c, x, y) {
  if (typeof c.getTransform !== 'function') return null;
  const m = c.getTransform();
  return m ? { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f } : null;
}
export function setFinishAckHook(fn) { finishAckHook = fn; }
// Once the finish saucer has arrived he switches on his tractor beam, down to
// the ground (Peter, 14 Oct), fading up over half a second. `y` is his hover
// height; the ground outside is at −6.
function tractorOn(since, y) {
  if (since < 0.3) return {};
  return { tractor: Math.min(1, (since - 0.3) / 0.5), tractorLen: -6 - y - 4 };
}
export { martianStanding };
// Level 3's saucer pilot: told when his beam comes on, for his ACK! ACK! ACK!
// ACK! (Peter, 14 Oct).
let pilotHook = null;
export function setPilotHook(fn) { pilotHook = fn; }

// The base kit, for the plateau bake-off (space-plateaus.js) to stand on mesas.
export { domes, tower, launchPad, pumpjack, rover, HULL, WARM, RED, CYAN };
