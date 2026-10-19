import { drawGarbageCube, drawVacuumAssembly, drawVacuumDebris, vacuumBrushPose } from './vacuum-compactor.js';
// Gameplay-owned props and ambience. The station painting remains independent.
const INK = '#14222b', STEEL = '#526b79', LIGHT = '#d9ece7';
const GOLD = '#e8b947', PURPLE = '#b072cb', HOT = '#ff8061';
export const VACUUM_SHOT_AHEAD = 202;
export const VACUUM_ROBOT_AHEAD = 202;
export function vacuumRobotAheadForView(view) {
  const width=Number(view) || 480;
  // Keep the compact shell inside portrait's right edge (player x=59,
  // half-width=25), while letting it hover farther ahead on wider screens.
  return Math.min(VACUUM_ROBOT_AHEAD, Math.max(96, width * 0.6), width - 88);
}
export function vacuumShotAheadForView(view) {
  return vacuumRobotAheadForView(view) - (VACUUM_ROBOT_AHEAD - VACUUM_SHOT_AHEAD);
}
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
function box(c, x, y, w, h, fill, r = 1.5) {
  c.beginPath(); c.roundRect(x, y, w, h, r);
  c.fillStyle = fill; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke();
}
function line(c, x, y, xx, yy, color, width) {
  c.beginPath(); c.moveTo(x, y); c.lineTo(xx, yy); c.strokeStyle = color; c.lineWidth = width; c.stroke();
}
function disc(c, x, y, radius, color) {
  c.beginPath(); c.arc(x, y, radius, 0, Math.PI * 2); c.fillStyle = color; c.fill();
  c.strokeStyle = INK; c.lineWidth = 0.7; c.stroke();
}
function tape(c, x, y, w, h) {
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.fillStyle = GOLD; c.fillRect(x, y, w, h);
  for (let xx = x - h; xx < x + w; xx += 9) line(c, xx, y + h, xx + h, y, INK, 3);
  c.restore();
}

// One drifting nut or bolt, i its index, f its 0..1 seed.
function looseHardware(c, i, f, x, y, t, k = 1) {
  c.save(); c.translate(x, y); c.rotate(t * (0.45 + f * 0.4) * (i % 2 ? -1 : 1) + i * 1.4);
  const size = (0.24 + f * 0.16) * (i % 5 === 0 ? 1.3 : 1) * k; c.scale(size, size);
  if (i % 3 === 0) {
    c.beginPath();
    for (let j = 0; j < 6; j++) {
      const a = j * Math.PI / 3, xx = Math.cos(a) * 3.6, yy = Math.sin(a) * 3.6;
      if (j) c.lineTo(xx, yy); else c.moveTo(xx, yy);
    }
    c.closePath(); c.fillStyle = '#9fb9bb'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke();
    disc(c, 0, 0, 1.4, '#28494d');
  } else {
    box(c, -1.15, -1, 2.3, 7, '#8ba7af', 0.3);
    for (let j = 0; j < 4; j++) line(c, -1.5, j * 1.4, 1.5, j * 1.4 - 0.6, '#d2e0db', 0.55);
    box(c, -3, -3.5, 6, 3, LIGHT, 0.8);
    line(c, -1.7, -2.8, 1.7, -2.8, '#ffffff', 0.6);
  }
  c.restore();
}
const frac = (n) => n - Math.floor(n);
export function drawFloatingBolts(c, cam, view, t, corridor) {
  // Small, plentiful loose hardware drifting behind both playable rails.
  // World-indexed parallax avoids pops when the camera crosses a wrap boundary.
  // More of them and smaller (Peter, 13 Oct): one every 12 units, about two
  // thirds the old size, a third of them a touch bigger for variety.
  const travel = cam * 0.22, step = 12;
  c.save(); c.globalAlpha = 0.64;
  for (let i = Math.floor((travel - 28) / step) - 1; i * step < travel + view + step + 28; i++) {
    const f = frac(Math.sin(i * 12.9898 + 4.3) * 43758.5453);
    const x = i * step - travel + 18 * Math.sin(t * (0.5 + f * 0.2) + i)
      + 5 * Math.sin(t * 0.29 + i * 2.7);
    const y = -corridor * (0.3 + f * 0.42) + Math.sin(t * 0.75 + i * 2.1) * 12
      + Math.cos(t * 0.34 + i) * 5;
    if (x >= -5 && x <= view + 5) looseHardware(c, i, f, x, y, t);
  }
  // A cloud of it at the start of the level (Peter, 14 Oct: "a lot more
  // floating bolts and screws at the beginning … they can lessen as we start
  // to run"): a second, denser drift — three to every one above, spread over
  // the whole height — that thins out over the first ~15 s of running. Each
  // piece's keep is fixed to its own place in the drift, so the thinning is
  // in where they are, and nothing on screen ever winks out.
  const STEP2 = 4, FULL = 120, GONE = 420;
  for (let i = Math.max(0, Math.floor((travel - 28) / STEP2) - 1); i * STEP2 < Math.min(GONE, travel + view + STEP2 + 28); i++) {
    const p = i * STEP2, keep = clamp(1 - (p - FULL) / (GONE - FULL), 0, 1);
    const f = frac(Math.sin(i * 78.233 + 1.7) * 43758.5453);
    if (frac(f * 91.7) >= keep) continue;
    const x = p - travel + 14 * Math.sin(t * (0.4 + f * 0.25) + i * 1.3) + 4 * Math.sin(t * 0.31 + i * 2.2);
    const y = -corridor * (0.12 + frac(f * 7.3) * 0.78) + Math.sin(t * 0.6 + i * 1.7) * 9 + Math.cos(t * 0.27 + i) * 4;
    if (x >= -5 && x <= view + 5) looseHardware(c, i + 7, f, x, y, t, 0.8 + frac(f * 13.1) * 0.5);
  }
  c.restore();
}

// The low-gravity sign as it shipped (Peter, 14 Oct: "lets put it outside so it
// moves slower … option 3 showing the percentage … a sign mounted in the
// ground"): the dial-and-readout panel standing on the ground outside the
// windows on two plain legs, the reading in flickering neon (Peter, 14 Oct:
// "could the sign have 2 plain legs and can the gravity reading be flickering
// neon"). (x, y) is the foot, in the view's units; it is about 52 wide and 40 tall.
// `reading` is what the panel says, per level (Peter, 14 Oct: "perhaps we need this
// in levels 1 & 2 with an appropriate reading"): the words and where the needle
// sits, 0..1 across the dial.
// Level 1's is live, and reads the GATES, not the hero: gravity turns UP once the first
// arrow's chevrons are on screen and close (about the middle of the frame), not
// before ("dont change it to up until the up chevrons are visible and we are close"),
// whether or not you have jumped, and until you have, the
// sign says so — GRAVITY: UP and JUMP! taking turns (Peter, 14 Oct: "maybe gravity up
// changes regardless of whether we jump... perhaps we say gravity: UP JUMP!"). The
// needle swings across the dial to match. Level 2 is mid-clean ("service mode").
const READINGS = {
  2: { text: 'SERVICE MODE', pct: 1 },
  3: { text: 'GRAVITY 18%', pct: 0.18 },
};
// Level 3's falls as you go (Peter, 14 Oct: "decreasing as we move along so 20, 19,
// 18, 17 … and the needle move a little (we can exaggerate its movement)"): a point
// every 1.8% of the stage, about every second and a half, from 20% down to a floor of
// 17% ("gravity should end up around 17% so dont make it drop so fast"), the needle at
// two and a half times the reading so the drop shows.
const LOW_G_START = 20, LOW_G_FLOOR = 17, LOW_G_STEP = 0.018, LOW_G_NEEDLE = 2.5;
export function gravityReading(stage, gateLane = 0, heroLane = gateLane, t = 0, progress = 0) {
  if (stage === 3) {
    const v = Math.max(LOW_G_FLOOR, LOW_G_START - Math.floor(Math.max(0, progress) / LOW_G_STEP));
    return { text: `GRAVITY ${v}%`, pct: Math.min(1, v / 100 * LOW_G_NEEDLE), live: true };
  }
  if (stage === 1) {
    const dir = gateLane ? 'UP' : 'DOWN', jump = heroLane !== gateLane;
    return { text: jump && t % 1 >= 0.55 ? 'JUMP!' : `GRAVITY: ${dir}`, pct: gateLane ? 0 : 1, live: true };
  }
  return READINGS[stage] || null;
}
// The needle eases to its reading rather than jumping (one sign on screen at a time).
let needle = null;
export function drawLowGravityPost(c, x, y, t, font = 'sans-serif', reading = READINGS[3]) {
  const W = 52, H = 17, top = y - 40;
  // Two plain legs.
  for (const lx of [x - W / 2 + 8, x + W / 2 - 8]) box(c, lx - 1.2, top + H - 1, 2.4, 40 - H + 1, '#6e8590', 0.3);
  // A beacon on top that blinks.
  const on = Math.sin(t * 3.2) > 0.4;
  disc(c, x + W / 2 - 4, top - 2, 1.4, on ? '#ff8061' : '#7a3a30');
  if (on) {
    const g = c.createRadialGradient(x + W / 2 - 4, top - 2, 0, x + W / 2 - 4, top - 2, 6);
    g.addColorStop(0, 'rgba(255,128,97,0.6)'); g.addColorStop(1, 'rgba(255,128,97,0)');
    c.fillStyle = g; c.fillRect(x + W / 2 - 10, top - 8, 12, 12);
  }
  // The panel: dial on the left, readout on the right.
  const left = x - W / 2;
  box(c, left, top, W, H, '#20303a', 1.6);
  const dx = left + 9, dy = top + 11.5, r = 6;
  c.beginPath(); c.arc(dx, dy, r, Math.PI, 0); c.strokeStyle = '#84a2ae'; c.lineWidth = 0.8; c.stroke();
  needle = needle == null || !reading.live ? reading.pct : needle + (reading.pct - needle) * 0.12;
  const pct = needle;
  c.beginPath(); c.arc(dx, dy, r, Math.PI, Math.PI * (1 + pct)); c.strokeStyle = pct < 0.5 ? '#ff8061' : '#7dffc0'; c.lineWidth = 1.3; c.stroke();
  const a = Math.PI * (1 + pct + Math.sin(t * 3.1) * 0.02);
  line(c, dx, dy, dx + Math.cos(a) * (r - 1.2), dy + Math.sin(a) * (r - 1.2), '#ffffff', 0.7);
  disc(c, dx, dy, 0.8, '#ffffff');
  c.fillStyle = '#0c151a'; c.fillRect(left + 17, top + 3, W - 20, H - 6);
  // The reading as a neon tube: a glow, the colour, and a white-hot core. It holds
  // mostly lit and stutters now and then — a dip, or a quick off-on-off — on a
  // clock of its own, so two signs never flicker together.
  const tick = Math.floor(t * 14), roll = Math.abs(Math.sin(tick * 12.9898) * 43758.5453) % 1;
  const lit = roll > 0.93 ? 0.12 : roll > 0.86 ? 0.55 : 1;
  const tx = left + 17 + (W - 20) / 2, ty = top + H / 2 + 0.4;
  // Sized to the readout window: 'GRAVITY ±100%' is longer than 'GRAVITY 18%'.
  c.font = `700 5.6px ${font}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  const fit = Math.min(5.6, 5.6 * (W - 23) / Math.max(1, c.measureText(reading.text).width || 1));
  c.font = `700 ${fit.toFixed(2)}px ${font}`;
  c.save();
  c.shadowColor = `rgba(125,255,192,${0.85 * lit})`; c.shadowBlur = 4 * lit;
  c.fillStyle = `rgba(125,255,192,${0.2 + 0.8 * lit})`;
  c.fillText(reading.text, tx, ty);
  c.restore();
  if (lit > 0.5) {
    c.save(); c.globalAlpha = 0.55 * lit; c.fillStyle = '#eafff4';
    c.font = `700 ${(fit * 0.93).toFixed(2)}px ${font}`; c.fillText(reading.text, tx, ty); c.restore();
  }
}

// The sign at the start of the low-gravity level (Peter, 14 Oct: "perhaps we
// need a sign at the beginning of the level to indicate gravity is low or
// off?"). Hangs from the ceiling rail on two cables at world x `wx`, behind the
// lane, swaying a touch. Three styles for the bake-off:
//   'hazard'  — a station placard: hazard-striped edges, LOW GRAVITY in amber
//   'neon'    — a tube sign that flickers on: GRAVITY OFF
//   'readout' — a dial and a digital readout, the needle down at 18%
export const LOW_G_SIGNS = ['hazard', 'neon', 'readout'];
export function drawLowGravitySign(c, cam, t, corridor, { wx = 250, style = 'hazard', font = 'sans-serif' } = {}) {
  const x = wx - cam;
  if (x < -80 || x > 600) return;
  const W = 74, H = 24, top = -corridor + 14, sway = Math.sin(t * 0.9) * 0.025;
  c.save(); c.translate(x, -corridor); c.rotate(sway); c.translate(-x, corridor);
  // Cables from the rail.
  for (const dx of [-W / 2 + 8, W / 2 - 8]) line(c, x + dx, -corridor, x + dx, top, '#5e6c74', 0.8);
  const left = x - W / 2;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  if (style === 'hazard') {
    box(c, left, top, W, H, '#1a2328', 2);
    for (const yy of [top, top + H - 3.5]) tape(c, left + 1, yy + 0.5, W - 2, 3);
    c.fillStyle = '#ffc84a'; c.font = `700 8px ${font}`;
    c.fillText('LOW GRAVITY', x + 5, top + H / 2 + 0.5);
    // A little warning triangle with a floating figure-less "!".
    c.beginPath(); c.moveTo(left + 7, top + 16); c.lineTo(left + 11.5, top + 7.5); c.lineTo(left + 16, top + 16); c.closePath();
    c.fillStyle = '#ffc84a'; c.fill();
    c.fillStyle = '#1a2328'; c.fillRect(left + 11, top + 10, 1, 3.4); c.fillRect(left + 11, top + 14, 1, 1);
  } else if (style === 'neon') {
    box(c, left, top, W, H, '#0e1418', 3);
    // Flickers on as the level opens, then holds with the odd stutter.
    const on = t < 0.6 ? (Math.sin(t * 60) > 0 ? 1 : 0.15) : (Math.sin(t * 23) > 0.97 ? 0.4 : 1);
    c.save(); c.shadowColor = `rgba(255,90,200,${0.9 * on})`; c.shadowBlur = 6 * on;
    c.fillStyle = `rgba(255,${130 + 80 * on},${230},${0.25 + 0.75 * on})`; c.font = `700 8.5px ${font}`;
    c.fillText('GRAVITY OFF', x, top + H / 2 + 0.5);
    c.restore();
    c.strokeStyle = `rgba(120,240,255,${0.3 + 0.5 * on})`; c.lineWidth = 0.7;
    c.beginPath(); c.roundRect(left + 2.5, top + 2.5, W - 5, H - 5, 2); c.stroke();
  } else {
    box(c, left, top, W, H, '#20303a', 2);
    // Dial: an arc from 0 to 1 g, the needle wobbling low.
    const dx = left + 13, dy = top + 15, r = 8;
    c.beginPath(); c.arc(dx, dy, r, Math.PI, 0); c.strokeStyle = '#84a2ae'; c.lineWidth = 1; c.stroke();
    c.beginPath(); c.arc(dx, dy, r, Math.PI, Math.PI * 1.18); c.strokeStyle = '#ff8061'; c.lineWidth = 1.6; c.stroke();
    const a = Math.PI * (1 + 0.18 + Math.sin(t * 3.1) * 0.02);
    line(c, dx, dy, dx + Math.cos(a) * (r - 1.5), dy + Math.sin(a) * (r - 1.5), '#ffffff', 0.8);
    disc(c, dx, dy, 1, '#ffffff');
    c.fillStyle = '#0c151a'; c.fillRect(left + 25, top + 4, W - 29, H - 8);
    c.fillStyle = '#7dffc0'; c.font = `700 7px ${font}`;
    c.fillText('GRAVITY 18%', left + 25 + (W - 29) / 2, top + H / 2 + 0.5);
  }
  c.restore();
}

// THE WRONG RAIL'S LIVE WIRE (railPulse). Taut, with a kink setting off from each
// end, crossing in the middle and going back (Peter, 14 Oct); on the wall clock, so
// it is alive through the intro and the finish hold. `railStyle` picks the look —
// the production one is 'tesla' (PICKED C, 14 Oct: copper coil studs, a jagged
// white-blue arc); the others are the bake-off's (src/dev/rail-wire-candidates.js),
// switched in with setRailStyle.
export const RAIL_STYLES = ['now', 'insulator', 'clamp', 'tesla', 'laser', 'plasma', 'leak'];
let railStyle = 'tesla';
export function setRailStyle(id) { railStyle = id; }
function wirePoints(e, t, amp = 2.2, y = -3.5, inset = 6) {
  const n = Math.max(8, Math.round(e.w / 1.2)), pts = [];
  const sweep = Math.max(1.5, e.w / 60);
  const u = 0.5 - 0.5 * Math.cos((t + e.x * 0.013) * Math.PI * 2 / sweep);
  const kinks = [inset + (e.w - inset * 2) * u, e.w - inset - (e.w - inset * 2) * u];
  for (let i = 0; i <= n; i++) {
    const xx = i * e.w / n;
    const k = Math.max(0, ...kinks.map((at) => 1 - Math.abs(xx - at) / 7));
    pts.push([xx, y + Math.sin(i * 1.4 + t * 24) * amp * k]);
  }
  return pts;
}
function strokePts(c, pts, layers, x0 = -Infinity, x1 = Infinity) {
  for (const [col, width] of layers) {
    c.beginPath(); let started = false;
    for (const [xx, yy] of pts) {
      if (xx < x0 || xx > x1) continue;
      if (started) c.lineTo(xx, yy); else { c.moveTo(xx, yy); started = true; }
    }
    c.strokeStyle = col; c.lineWidth = width; c.lineCap = 'butt'; c.stroke();
  }
}
function railWire(c, e, t, style) {
  if (typeof performance !== 'undefined') t = performance.now() / 1000;
  const W = e.w;
  if (style === 'insulator') {
    // A: ceramic insulator stacks on stubby posts, the wire strung between their tops.
    const pts = wirePoints(e, t, 2, -6.5, 7);
    strokePts(c, pts, [['#654294', 3.6], [PURPLE, 2], ['#fff0ff', 0.8]], 3, W - 3);
    for (const xx of [2.5, W - 2.5]) {
      box(c, xx - 0.8, -6, 1.6, 6, STEEL, 0.3);
      for (let k = 0; k < 3; k++) { c.beginPath(); c.ellipse(xx, -2 - k * 1.7, 2.2 - k * 0.2, 0.75, 0, 0, Math.PI * 2); c.fillStyle = k % 2 ? '#e6eef0' : '#c8d6da'; c.fill(); }
      disc(c, xx, -7, 1, LIGHT);
    }
    return;
  }
  if (style === 'clamp') {
    // B: steel U-clamps bolted to the rail with an amber lamp; the current electric blue.
    const pts = wirePoints(e, t, 2.2, -3.5, 7);
    strokePts(c, pts, [['#1d4e8a', 4], ['#4fb8ff', 2.2], ['#e8f8ff', 0.8]], 3.5, W - 3.5);
    for (const [xx, dir] of [[0, 1], [W, -1]]) {
      box(c, xx - (dir > 0 ? 0 : 4), -7, 4, 7, '#3e5563', 0.6);
      box(c, xx + (dir > 0 ? 0.6 : -3.4), -6.2, 2.8, 1.4, '#24353f', 0.3);
      disc(c, xx + dir * 2, -7.6, 0.9, Math.sin(t * 4) > 0 ? '#ffd98a' : '#f2a33a');
    }
    return;
  }
  if (style === 'tesla') {
    // C, picked 14 Oct, laid along the rail PIPE itself rather than above it (Peter:
    // "i thought these would be overlaid on the pipes themselves to clear the window
    // frames"): copper contact clamps round the pipe at each end, and the jagged
    // white-blue arc crackling along the pipe between them, re-forming several times
    // a second, the two kinks riding it, centred on the pipe ("would like it centred").
    const tick = Math.floor(t * 9), mid = 0;
    const pts = wirePoints(e, t, 0.9, mid, 6).map(([xx, yy], i) => [xx, Math.max(-1.3, Math.min(1.3, yy + (Math.sin(i * 12.9898 + tick * 78.233) * 43758.5453 % 1) * 0.9 - 0.45))]);
    // A dark ink under the arc and a saturated cyan, so it stands off the pale pipe
    // (14 Oct: "a different colour to make it stand out more against the pipe").
    strokePts(c, pts, [['rgba(10,30,60,0.85)', 2.8], ['#1fa8ff', 1.7], ['#e8fbff', 0.6]], 3, W - 3);
    for (const xx of [2.2, W - 2.2]) {
      box(c, xx - 1.6, -2, 3.2, 4, '#b8743e', 0.5);
      for (let k = 0; k < 2; k++) box(c, xx - 1.6, -1.2 + k * 1.8, 3.2, 0.6, '#e0a66a', 0.2);
      disc(c, xx, mid, 0.8, '#eaf4ff');
    }
    return;
  }
  if (style === 'laser') {
    // D: hazard-taped emitter boxes and a red beam, the kinks as bright pulses.
    const pts = wirePoints(e, t, 1.6, -4, 8);
    strokePts(c, pts, [['rgba(180,30,40,0.6)', 3.6], ['#ff4a4a', 1.8], ['#ffe0d0', 0.7]], 4, W - 4);
    for (const [xx, dir] of [[0, 1], [W, -1]]) {
      const bx = dir > 0 ? xx : xx - 5;
      box(c, bx, -8, 5, 8, '#243540', 0.6);
      tape(c, bx + 0.4, -1.6, 4.2, 1.2);
      disc(c, xx + dir * 4.6, -4, 1, '#ffc2a8');
    }
    return;
  }
  if (style === 'plasma') {
    // E: a glass tube on two saddle feet with a plasma band rolling inside it.
    const pts = wirePoints(e, t, 1.3, -4, 6);
    c.fillStyle = 'rgba(200,240,255,0.18)'; c.fillRect(1, -6.6, W - 2, 5.2);
    strokePts(c, pts, [['rgba(255,90,170,0.55)', 3], ['#ff9ad0', 1.6], ['#fff0f8', 0.6]], 2, W - 2);
    c.strokeStyle = 'rgba(230,250,255,0.75)'; c.lineWidth = 0.5;
    c.beginPath(); c.moveTo(1, -6.6); c.lineTo(W - 1, -6.6); c.moveTo(1, -1.4); c.lineTo(W - 1, -1.4); c.stroke();
    for (const xx of [3, W - 3]) { box(c, xx - 2, -1.6, 4, 1.6, STEEL, 0.4); box(c, xx - 1.2, -7.2, 2.4, 6.4, 'rgba(82,107,121,0.5)', 0.4); }
    for (const xx of [0.6, W - 0.6]) disc(c, xx, -4, 1.6, '#d9ece7');
    return;
  }
  if (style === 'leak') {
    // F: E made dangerous (Peter, 14 Oct: "i like the look of the plasma tube but it
    // doesn't scream keep off"): hot orange-white plasma, the tube cracked in two
    // places with sparks spitting out of the cracks and the open ends, hazard tape
    // on the feet, and every so often the whole thing flares as if about to blow.
    const flare = Math.max(0, Math.sin(t * 1.7 + e.x * 0.01)) ** 12;
    const pts = wirePoints(e, t, 1.3 + flare, -4, 6);
    c.fillStyle = `rgba(255,170,90,${0.16 + 0.3 * flare})`; c.fillRect(1, -6.6, W - 2, 5.2);
    strokePts(c, pts, [[`rgba(255,80,30,${0.6 + 0.3 * flare})`, 3.2 + flare * 1.6], ['#ffb27a', 1.7], ['#fff2e0', 0.7]], 2, W - 2);
    c.strokeStyle = 'rgba(230,250,255,0.7)'; c.lineWidth = 0.5;
    c.beginPath(); c.moveTo(1, -6.6); c.lineTo(W - 1, -6.6); c.moveTo(1, -1.4); c.lineTo(W - 1, -1.4); c.stroke();
    // Cracks, and what leaks out of them.
    const tick = Math.floor(t * 14);
    const rnd = (k) => { const v = Math.sin(k * 12.9898 + tick * 78.233) * 43758.5453; return v - Math.floor(v); };
    const cracks = [W * 0.3, W * 0.68];
    c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 0.35;
    for (const cx of cracks) { c.beginPath(); c.moveTo(cx - 1, -6.6); c.lineTo(cx + 0.6, -5.4); c.lineTo(cx - 0.4, -4.6); c.stroke(); }
    for (const [sx, sy, dir] of [[cracks[0], -6.6, -1], [cracks[1], -6.6, -1], [1, -4, -1], [W - 1, -4, 1]]) {
      for (let k = 0; k < 3; k++) {
        const a = rnd(sx + k) * Math.PI - (dir < 0 && sy < -6 ? Math.PI : 0), r = 1 + rnd(sx + k + 9) * 3.5;
        if (rnd(sx * 3 + k) < 0.35) continue;
        line(c, sx, sy, sx + Math.cos(a) * r * (sy < -6 ? 1 : dir), sy + Math.sin(a) * r, k ? '#ffd780' : '#ffffff', 0.45);
      }
    }
    for (const xx of [3, W - 3]) { box(c, xx - 2, -1.6, 4, 1.6, '#243540', 0.4); tape(c, xx - 1.8, -1.4, 3.6, 1.1); }
    for (const xx of [0.6, W - 0.6]) disc(c, xx, -4, 1.6, flare > 0.3 ? '#fff2e0' : '#ffb27a');
    return;
  }
  // NOW: the purple zigzag between two round white nodes. The glow stops short of the
  // nodes' outer edge, so two wires laid end to end read as two (Peter, 14 Oct:
  // "prefer they not be joined like this... gaps").
  const pts = wirePoints(e, t);
  strokePts(c, pts, [['#654294', 5], [PURPLE, 3], ['#fff0ff', 1]], 1, W - 1);
  disc(c, 1, -3.5, 2, LIGHT); disc(c, W - 1, -3.5, 2, LIGHT);
}

export function drawGravityHazard(c, e, x, bottom, t) {
  if (x + e.w < -12 || x > 520) return;
  c.save(); c.translate(x, bottom); c.lineJoin = 'round'; c.lineCap = 'round';
  // The ceiling entity renderer mirrors floor art before it reaches us. Move
  // the mirrored wire into the slim pipe so its arc and end clamps seat on it.
  if(e.type === 'railPulse' && e.gravityMounted) c.translate(0,2);
  if (e.type === 'floatSpikes') {
    box(c, -1, -2, e.w + 2, 3, STEEL, 0.7);
    const n = Math.max(3, Math.round(e.w / 7)), step = e.w / n;
    for (let i = 0; i < n; i++) {
      const xx = i * step;
      c.beginPath(); c.moveTo(xx, -2); c.lineTo(xx + step / 2, -10); c.lineTo(xx + step, -2); c.closePath();
      c.fillStyle = LIGHT; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.7; c.stroke();
      line(c, xx + step / 2, -8, xx + step - 1, -2.5, '#6f929d', 1.2);
    }
    tape(c, 0, 0, e.w, 1.8);
  } else if (e.type === 'floatLaser') {
    box(c, -1, -2, e.w + 2, 3, '#243540', 0.8);
    tape(c, 0, 0, e.w, 2);
    for (const xx of [0, e.w - 6]) {
      box(c, xx, -10, 6, 10, STEEL, 1);
      disc(c, xx + 3, -6, 1.8, '#ffc2a8');
    }
    line(c, 5, -6, e.w - 5, -6, '#b42e33', 5);
    line(c, 5, -6, e.w - 5, -6, '#ff654c', 3);
    line(c, 5, -6, e.w - 5, -6, '#fff0c7', 1.2);
    // Travelling energy knots make the continuous live beam easy to read.
    for (let xx = 8 + (t * 30 % 24); xx < e.w - 6; xx += 24) disc(c, xx, -6, 1.2, '#fff3d5');
  } else if (e.type === 'maintenanceBrush') {
    // Art clears the upright head in the game's tall slide pose. The standard
    // 13px underside collision still catches standing, clears ducking.
    const lift = 8, h = e.h;
    box(c, 0, -h - lift, e.w, h, '#684580', 3);
    for (let i = 3; i < e.w - 2; i += 2.2) {
      const phase = t * 16 + i;
      line(c, i, -h - lift + 2, i + Math.sin(phase) * 1.4, -lift - 1, i % 4 < 2 ? PURPLE : '#d7a4e4', 1.4);
    }
    box(c, -3, -h - lift + 1, 6, h - 2, GOLD, 2);
    disc(c, 0, -h / 2 - lift, 3, STEEL);
    box(c, e.w - 2, -h - lift + 1, 5, h - 2, GOLD, 2);
    box(c, 1, -h - lift - 3, e.w - 2, 4, STEEL);
    tape(c, 4, -h - lift - 2.5, e.w - 8, 2.5);
  } else if (e.type === 'railPulse') {
    railWire(c, e, t, railStyle);
  } else if (e.type === 'maintenancePulse') {
    const pts = [];
    for (let i = 0; i <= 8; i++) pts.push([i * e.w / 8, -3.5 + Math.sin(i * 2.6 + t * 24) * 2.2]);
    for (const [col, width] of [['#654294', 5], [PURPLE, 3], ['#fff0ff', 1]]) {
      c.beginPath(); pts.forEach(([xx, yy], i) => i ? c.lineTo(xx, yy) : c.moveTo(xx, yy));
      c.strokeStyle = col; c.lineWidth = width; c.stroke();
    }
    disc(c, 1, -3.5, 2, LIGHT); disc(c, e.w - 1, -3.5, 2, LIGHT);
  } else if (e.type === 'vacuumShot') {
    drawGarbageCube(c, e.w / 2, -e.h / 2);
  } else if (e.type === 'maintenanceRollers') {
    // Exposed counter-rotating cutter drums. Teeth break the upper silhouette;
    // no protective bar or fan spokes suggest a safe surface to stand on.
    // Drawn for a 22-high bed and scaled to the bed's height: the run caps it at
    // 16 since the corridor shrank, and at full size the teeth were clipped off
    // the top (Peter, 14 Oct: "these aren't scaled properly and are chopped off").
    // The drums fit the bed end to end, the first and last whole inside it (14 Oct:
    // "this is cut off on the right"), spaced as near the meshing pitch as fits.
    const k = e.h / 22, R = 11 * k;
    const n = Math.max(1, Math.round((e.w - 2 * R) / (20 * k)) + 1);
    const pitch = n > 1 ? (e.w - 2 * R) / (n - 1) : 0;
    box(c, -1, -e.h + 4 * k, e.w + 2, e.h - 3 * k, '#243540', 1);
    c.save(); c.beginPath(); c.rect(-2, -e.h - 2, e.w + 4, e.h + 3); c.clip();
    let drum = 0;
    for (let xx = n > 1 ? R : e.w / 2; drum < n; xx += pitch, drum++) {
      const turn = t * 3.8 * (drum % 2 ? -1 : 1);
      c.save(); c.translate(xx, -11 * k); c.scale(k, k); c.rotate(turn);
      c.beginPath();
      for (let j = 0; j < 12; j++) {
        const a = j * Math.PI / 6;
        for (const [offset, radius] of [[0, 8.2], [0.1, 11], [0.31, 11], [0.4, 8.2]]) {
          const px = Math.cos(a + offset) * radius, py = Math.sin(a + offset) * radius;
          if (j === 0 && offset === 0) c.moveTo(px, py); else c.lineTo(px, py);
        }
      }
      c.closePath(); c.fillStyle = '#d6e1df'; c.fill();
      c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke();
      disc(c, 0, 0, 7, '#8d4b3b'); disc(c, 0, 0, 4.5, '#e37445');
      for (let j = 0; j < 3; j++) {
        const a = j * Math.PI * 2 / 3;
        disc(c, Math.cos(a) * 5.5, Math.sin(a) * 5.5, 0.8, INK);
      }
      disc(c, 0, 0, 1.8, STEEL); c.restore();
      // A few small sparks where neighbouring cutters bite together.
      if (drum % 3 === 0) {
        const age = (t * 2 + drum * 0.37) % 1;
        c.save(); c.globalAlpha = 1 - age;
        line(c, xx + (9 + age * 3) * k, (-15 - age * 7) * k,
          xx + (10 + age * 4) * k, (-16 - age * 8) * k, '#ffd780', 0.7);
        c.restore();
      }
    }
    c.restore(); tape(c, 0, -1, e.w, 3);

  }
  c.restore();
}

// Debris belongs to fixed world positions, including before the robot arrives.
// The brush consumes each batch once; rewind simply draws the earlier phase.
function drawVacuumBonusCoin(c, x, y, scale=1) {
  c.save(); c.translate(x,y); c.scale(scale,scale);
  c.beginPath();c.ellipse(0,0,3.3,4.2,0,0,Math.PI*2);
  c.fillStyle='#eab440';c.fill();c.strokeStyle='#51371e';c.lineWidth=.7;c.stroke();
  c.beginPath();c.ellipse(-.5,-.5,1.8,2.8,0,0,Math.PI*2);
  c.strokeStyle='#fff0aa';c.lineWidth=.7;c.stroke();c.restore();
}

export function drawMaintenanceVacuum(c, { view, time, seconds, corridor, playerX, attacks, sequences, departAt=null, lane=0, flip=null, flipPrep=0, sweep=[], debrisPatches=[], bonusCoins=[] }) {
  const last = sequences.at(-1).end;
  const exitAt = departAt ?? last, exitDuration = 1.25;
  const arrival = clamp((2 - seconds) / 1.5, 0, 1);
  const departure = clamp((seconds - exitAt) / exitDuration, 0, 1);
  const x = playerX + vacuumRobotAheadForView(view) + (arrival + departure) * (view + 60);
  const y = -corridor * .5;
  const reducedMotion = typeof window !== 'undefined'
    && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const active = attacks.find(a => a.sourceLane === 1-lane
    && a.phase !== 'waiting' && a.phase !== 'launched');
  const attack = active || {phase:'sweep',progress:.5,lane,sourceLane:1-lane};
  const brush = vacuumBrushPose({ x, y, corridor, attack });
  const bonusById=new Map(bonusCoins.map(a=>[a.id,a]));
  for(const patch of debrisPatches) {
    if(patch.x < -40 || patch.x > view+40) continue;
    const onRail = brush.sourceLane === patch.lane
      && Math.abs(brush.y - (patch.lane ? -corridor : 0)) < 18;
    const progress=onRail ? clamp((brush.x-patch.x+20)/36,0,1) : 0;
    const railY=patch.lane?-corridor:0;
    drawVacuumDebris(c, {x:patch.x,railY,lane:patch.lane,progress,brushX:brush.x});
    if(bonusById.has(patch.id) && progress<1)
      drawVacuumBonusCoin(c,patch.x+3+(brush.x-patch.x-3)*progress,
        railY+(patch.lane?5:-7),1-progress*.55);
  }
  for(const a of sweep) {
    if(a.sourceX < -40 || a.sourceX > view+40) continue;
    drawVacuumDebris(c,{x:a.sourceX,railY:a.sourceLane?-corridor:0,lane:a.sourceLane,
      progress:clamp((seconds-a.at+.18)/.36,0,1),brushX:x-35});
  }
  for (const a of attacks) {
    if(a.phase !== 'waiting' && a.phase !== 'suction') continue;
    if(a.sourceX < -40 || a.sourceX > view+40) continue;
    const brush = vacuumBrushPose({ x, y, corridor, attack: a });
    drawVacuumDebris(c, { x:a.sourceX, railY:a.sourceLane ? -corridor : 0,
      lane:a.sourceLane, progress:a.phase === 'suction' ? a.progress : 0, brushX:brush.x });
  }
  if(seconds < .5 || seconds > exitAt + exitDuration) return;
  drawVacuumAssembly(c, { x, y, corridor, attack, time, lane, flip, flipPrep, reducedMotion });
  for(const coin of bonusCoins) {
    if(seconds < coin.ejectAt-.22 || seconds >= coin.ejectAt) continue;
    const p=clamp((seconds-(coin.ejectAt-.22))/.22,0,1);
    const surface=coin.lane?-corridor+8:-8;
    drawVacuumBonusCoin(c,coin.landingX,
      (y+(coin.lane?-29:29))*(1-p)+surface*p,1);
  }
}
