// SPACE CABINET — Mars Attacks! background candidates (lab only). Peter,
// 13 Oct 2026: "can you create some background objects that are in the style
// of Mars Attacks? perhaps a different alien? just for the lab/gallery to see
// what might work". The 1996 film's Martians, after the 1962 trading cards:
// a skull face under a huge exposed brain, inside a glass bubble helmet with a
// collar ring, a high-collared suit; silver 50s saucers with chasing rim
// lights; the ray gun that leaves a green skeleton-flash zap. Flat facets and
// a little glow, like the rest of the space look, and lane-safe: nothing here
// is ever in the hero's lane.

const TAU = Math.PI * 2;
const hash = n => ((Math.sin(n * 78.233 + 12.9) * 43758.5453) % 1 + 1) % 1;
function poly(c, pts, fill) {
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath(); c.fillStyle = fill; c.fill();
}
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
const SKIN = ['#d6f0b8', '#a9d68a', '#78ad62', '#4d7a40'];
const BRAIN = ['#ffd0dc', '#f4a3bb', '#d27494', '#9c4a6a'];
const SILVER = ['#f6f8fb', '#d6dbe3', '#a9b1bd', '#7c8592', '#4f5763'];
const SUIT = ['#7ee0c8', '#3fb5a0', '#227866', '#134a40'];

// ---------------------------------------------------------------- the Martian
// Head and helmet in local units: origin at the collar, the head about 14 tall.
// `talk` 0..1 opens the jaw (ACK! ACK!); `look` -1..1 shifts the pupils.
// `helmet: false` leaves off the bubble — for a pilot already under the
// saucer's dome, where two layers of glass only fog the face (Peter, 14 Oct).
// `collar: null` leaves off the suit's pointed collar round the neck — a plain
// head in a plain helmet (Peter, 14 Oct: "remove embellishments around the face
// and neck").
// `flat: true` lights the eyes with a flat disc rather than a glow, for the obstacles' flat hand
// (gravityProps.js: the head in the specimen case).
export function martianHead(c, x, y, sc, t, { talk = 0, look = 0, helmet = true, collar = SUIT, flat = false } = {}) {
  c.save(); c.translate(x, y); c.scale(sc, sc);
  // The plain head (no collar) wears the film's helmet (Peter, 14 Oct, with the
  // lifesize-bust reference: "more space for the head and it flares up and
  // out, not quite an oval"): narrow at a fine ring on the neck, the sides
  // flaring up and out to their widest above the brow, then a tall rounded
  // dome with room above the brain (a little less tall, 14 Oct).
  const snug = !collar;
  const bell = (closed) => {
    c.beginPath(); c.moveTo(-4.3, -0.6);
    c.quadraticCurveTo(-5.6, -6, -7.4, -10.8);
    c.bezierCurveTo(-8, -16, -4.8, -19.6, 0, -19.6);
    c.bezierCurveTo(4.8, -19.6, 8, -16, 7.4, -10.8);
    c.quadraticCurveTo(5.6, -6, 4.3, -0.6);
    if (closed) c.closePath();
  };
  const glass = () => { if (snug) bell(true); else { c.beginPath(); c.arc(0, -8, 8.4, 0, TAU); } };
  // Helmet glass, back half: a faint tint behind the head.
  if (helmet) { glass(); c.fillStyle = 'rgba(190,240,255,0.14)'; c.fill(); }
  // Skull face: cheekbones, hollow temples, a narrow jaw.
  poly(c, [[-3.6, -6.8], [-3.9, -4.6], [-2.6, -2.2], [-1.4, -1.2], [1.4, -1.2], [2.6, -2.2], [3.9, -4.6], [3.6, -6.8]], SKIN[1]);
  poly(c, [[-3.6, -6.8], [-3.9, -4.6], [-2.6, -2.2], [-1.4, -1.2], [0, -1.2], [0, -6.8]], SKIN[0]);
  poly(c, [[3.6, -6.8], [3.9, -4.6], [2.6, -2.2], [1.6, -1.6], [2.4, -4.4]], SKIN[2]);
  // Eye sockets: huge, black, with a small green pupil that glances about.
  for (const sx of [-1, 1]) {
    c.beginPath(); c.ellipse(sx * 1.75, -5.4, 1.35, 1.55, sx * -0.2, 0, TAU); c.fillStyle = '#0b0f0b'; c.fill();
    if (flat) { c.beginPath(); c.arc(sx * 1.75 + look * 0.45, -5.3, 0.55, 0, TAU); c.fillStyle = '#a0ff8c'; c.fill(); }
    else glow(c, sx * 1.75 + look * 0.45, -5.3, 0.9, '160,255,140', 0.9);
    c.beginPath(); c.arc(sx * 1.75 + look * 0.45 - 0.3, -5.8, 0.22, 0, TAU); c.fillStyle = '#ffffff'; c.fill();
  }
  // Nose holes.
  for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * 0.35, -3.6, 0.22, 0.4, sx * 0.3, 0, TAU); c.fillStyle = SKIN[3]; c.fill(); }
  // The grin: two rows of skeleton teeth, the lower jaw dropping as it talks.
  const drop = talk * 1.1;
  c.fillStyle = '#1a0e14'; c.fillRect(-2.2, -2.7, 4.4, 1.1 + drop);
  for (let i = 0; i < 7; i++) {
    const tx = -2.1 + i * 0.62;
    c.fillStyle = '#fbfaf0'; c.fillRect(tx, -2.75, 0.5, 0.62); c.fillRect(tx, -2.05 + drop, 0.5, 0.6);
  }
  poly(c, [[-2.6, -2.2 + drop * 0.6], [-1.4, -1.2 + drop], [1.4, -1.2 + drop], [2.6, -2.2 + drop * 0.6], [1.4, -1.6 + drop], [-1.4, -1.6 + drop]], SKIN[2]);
  // The brain: a big dome over the brow, two hemispheres, folds, a seam.
  c.beginPath(); c.ellipse(0, -10, 5.3, 4.5, 0, Math.PI * 0.98, Math.PI * 2.02); c.lineTo(3.7, -6.6); c.lineTo(-3.7, -6.6); c.closePath();
  c.fillStyle = BRAIN[1]; c.fill();
  c.save(); c.clip();
  c.beginPath(); c.ellipse(-1.6, -11, 3.4, 3, 0, 0, TAU); c.fillStyle = BRAIN[0]; c.fill();
  c.strokeStyle = BRAIN[3]; c.lineWidth = 0.28; c.lineCap = 'round';
  for (const [x0, y0, x1, y1, x2, y2] of [[-4.6, -9.4, -3.4, -11.6, -2, -10], [-3.8, -12.4, -2.2, -13.6, -1, -12.2], [-4, -7.8, -2.6, -8.8, -1.2, -7.6],
    [1, -12.6, 2.6, -13.6, 3.6, -12], [1.4, -10, 3, -11.4, 4.4, -9.6], [1.2, -7.8, 2.8, -8.8, 4, -7.6], [-2.4, -9.4, -1.4, -10.4, -0.8, -9]]) {
    c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(x1, y1, x2, y2); c.stroke();
  }
  c.strokeStyle = BRAIN[2]; c.lineWidth = 0.4;
  c.beginPath(); c.moveTo(0, -14.4); c.quadraticCurveTo(0.4, -10.4, 0, -6.8); c.stroke();
  c.restore();
  // Brow ridge where brain meets skull.
  poly(c, [[-3.8, -6.9], [3.8, -6.9], [3.4, -6.3], [-3.4, -6.3]], SKIN[2]);
  // High suit collar with its points, and the helmet's collar ring.
  if (collar) {
    poly(c, [[-6.4, 0.6], [-5.2, -3.6], [-3.4, -1.4], [-1.6, -0.6], [1.6, -0.6], [3.4, -1.4], [5.2, -3.6], [6.4, 0.6]], collar[1]);
    poly(c, [[-6.4, 0.6], [-5.2, -3.6], [-3.4, -1.4], [-4.4, 0.6]], collar[0]);
    poly(c, [[6.4, 0.6], [5.2, -3.6], [3.4, -1.4], [4.4, 0.6]], collar[2]);
  }
  if (!helmet) { c.restore(); return; }
  // The helmet's collar ring: wide under the round bubble, fine and at the neck
  // under the snug one.
  if (snug) {
    c.beginPath(); c.ellipse(0, -0.5, 4.6, 0.65, 0, 0, TAU); c.fillStyle = SILVER[3]; c.fill();
    c.beginPath(); c.ellipse(0, -0.65, 4.6, 0.42, 0, Math.PI, 0); c.fillStyle = SILVER[1]; c.fill();
  } else {
    c.beginPath(); c.ellipse(0, 0.2, 6.2, 1.3, 0, 0, TAU); c.fillStyle = SILVER[3]; c.fill();
    c.beginPath(); c.ellipse(0, -0.1, 6.2, 1, 0, Math.PI, 0); c.fillStyle = SILVER[1]; c.fill();
  }
  // Helmet glass, front: a rim and two highlights.
  if (snug) {
    bell(false); c.strokeStyle = 'rgba(230,250,255,0.75)'; c.lineWidth = 0.35; c.stroke();
    // Two tall streaks of window light down the upper glass, as on the bust,
    // and a small glint low on the right.
    c.fillStyle = 'rgba(255,255,255,0.6)';
    c.beginPath(); c.ellipse(-2.4, -15.2, 0.35, 2.8, 0.12, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.45)';
    c.beginPath(); c.ellipse(-0.9, -15.9, 0.25, 2.1, 0.08, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.beginPath(); c.ellipse(5.6, -7.4, 0.35, 1.3, -0.35, 0, TAU); c.fill();
  } else {
    c.beginPath(); c.arc(0, -8, 8.4, Math.PI * 0.08, Math.PI * 0.92, true);
    c.strokeStyle = 'rgba(230,250,255,0.75)'; c.lineWidth = 0.35; c.stroke();
    c.beginPath(); c.ellipse(-4.6, -11.4, 1, 2.6, 0.55, 0, TAU); c.fillStyle = 'rgba(255,255,255,0.55)'; c.fill();
    c.beginPath(); c.ellipse(5.2, -6, 0.45, 1.2, -0.3, 0, TAU); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fill();
  }
  c.restore();
}

// A whole Martian standing, about 26 tall at sc 1: legs, belted suit, the
// head and helmet above, a ray gun that fires a ring-zap now and then.
// `aim` (radians, up is negative) and `shooting` (0..1 through a shot) let a
// scene point the gun and time the zap itself.
export function martianStanding(c, x, y, sc, t, { fire = true, face = 1, aim: aimAt = null, shooting = null } = {}) {
  c.save(); c.translate(x, y); c.scale(sc * face, sc);
  const shot = shooting != null ? shooting * 0.5 : fire ? ((t % 3.4) + 3.4) % 3.4 : 9, firing = shot < 0.5;
  // Legs and boots.
  poly(c, [[-2.4, -8], [-0.6, -8], [-0.8, -1.2], [-2.4, -1.2]], SUIT[2]);
  poly(c, [[0.6, -8], [2.4, -8], [2.4, -1.2], [0.8, -1.2]], SUIT[3]);
  poly(c, [[-2.8, -1.4], [-0.4, -1.4], [-0.2, 0], [-3, 0]], SILVER[3]);
  poly(c, [[0.6, -1.4], [3, -1.4], [3.4, 0], [0.6, 0]], SILVER[4]);
  // Body: suit with a chest V, belt with a buckle.
  poly(c, [[-3.4, -15.6], [3.4, -15.6], [2.8, -8], [-2.8, -8]], SUIT[1]);
  poly(c, [[-3.4, -15.6], [0, -15.6], [0, -8], [-2.8, -8]], SUIT[0]);
  poly(c, [[-1.6, -15.6], [0, -12.6], [1.6, -15.6]], SUIT[3]);
  c.fillStyle = SILVER[3]; c.fillRect(-2.9, -9, 5.8, 1);
  c.fillStyle = '#f0b23c'; c.fillRect(-0.6, -9.1, 1.2, 1.2);
  // Back arm hangs; the gun arm is raised and aimed.
  poly(c, [[-3.6, -15], [-2.6, -15.2], [-2.8, -10.4], [-3.8, -10.6]], SUIT[2]);
  const aim = aimAt != null ? aimAt : firing ? -0.15 : -0.05 + Math.sin(t * 1.3) * 0.08;
  c.save(); c.translate(2.8, -14.2); c.rotate(aim);
  c.fillStyle = SUIT[1]; c.fillRect(0, -0.6, 4.2, 1.3);
  // Ray gun: a finned barrel with a bulb and three rings.
  c.fillStyle = SILVER[1]; c.fillRect(3.8, -1.2, 3.8, 1.6);
  c.fillStyle = SILVER[3]; c.fillRect(3.8, 0.1, 3.8, 0.4);
  for (const rx of [4.6, 5.6, 6.6]) { c.fillStyle = '#d4553e'; c.fillRect(rx, -1.5, 0.35, 2.2); }
  c.beginPath(); c.arc(8, -0.4, 0.8, 0, TAU); c.fillStyle = firing ? '#eaffd8' : '#7fe07f'; c.fill();
  if (firing) {
    const p = shot / 0.5;
    glow(c, 8.6, -0.4, 4 + p * 4, '150,255,120', 0.8 * (1 - p));
    for (let i = 0; i < 3; i++) {
      const rx = 9 + p * 26 + i * 4;
      c.beginPath(); c.ellipse(rx, -0.4, 0.8, 2 - i * 0.4, 0, 0, TAU);
      c.strokeStyle = `rgba(170,255,140,${0.9 * (1 - p)})`; c.lineWidth = 0.5; c.stroke();
    }
  }
  c.restore();
  martianHead(c, 0, -15.4, 0.82, t, { talk: Math.max(0, Math.sin(t * 7)) * (firing ? 1 : 0.4), look: Math.sin(t * 0.8) });
  c.restore();
}

// ---------------------------------------------------------------- the saucer
// The film's flying saucer: a wide flat silver disc in faceted bands, a ring of
// chasing lights round the rim, a spinning band below, a clear dome with the
// Martian inside, and a heat-ray emitter underneath. About 50 wide at sc 1.
// `rayLen` (local units) stretches the heat ray to exactly reach a target.
// The pilot sits bare-headed under the dome, in the trooper's crimson (Peter,
// 14 Oct: "remove the helmet from the saucer pilot").
const PILOT_COLLAR = ['#ff6a5c', '#d8343a', '#9a1c28'];
export function marsSaucer(c, x, y, sc, t, { pilot = true, ray = 0, rayLen = 70, pilotHelmet = false, pilotSc = 0.58, tractor = 0, tractorLen = 70 } = {}) {
  c.save(); c.translate(x, y); c.scale(sc, sc);
  const R = 25, wob = Math.sin(t * 1.7) * 0.04;
  c.rotate(wob);
  if (ray > 0) {
    // The heat ray: a narrow green beam with rings travelling down it.
    // Solid all the way down, a hot splash where it lands.
    const L = rayLen;
    c.fillStyle = grad(c, 0, 5, 0, L, [[0, `rgba(170,255,140,${0.8 * ray})`], [0.85, `rgba(170,255,140,${0.6 * ray})`], [1, `rgba(200,255,170,${0.75 * ray})`]]);
    c.beginPath(); c.moveTo(-1.4, 5); c.lineTo(1.4, 5); c.lineTo(3, L); c.lineTo(-3, L); c.closePath(); c.fill();
    c.fillStyle = `rgba(240,255,225,${0.8 * ray})`; c.fillRect(-0.45, 5, 0.9, L - 5);
    for (let i = 0; i < 4; i++) {
      const ry = 8 + ((t * 60 + i * 15) % Math.max(10, L - 10));
      c.beginPath(); c.ellipse(0, ry, 2.6 + ry * 0.03, 0.8, 0, 0, TAU);
      c.strokeStyle = `rgba(200,255,170,${0.7 * ray})`; c.lineWidth = 0.4; c.stroke();
    }
    glow(c, 0, L, 6, '200,255,170', 0.8 * ray);
    c.beginPath(); c.ellipse(0, L, 4, 1.2, 0, 0, TAU); c.fillStyle = `rgba(235,255,220,${0.7 * ray})`; c.fill();
  }
  if (tractor > 0) {
    // The tractor beam: a wide pale cone from the belly to the ground, rings
    // and motes travelling UP it — pulling, not burning (Peter, 14 Oct: the
    // finish saucer "start his tractor beam once he arrives").
    const L = tractorLen, half = 6 + L * 0.32;
    c.fillStyle = grad(c, 0, 4, 0, L, [[0, `rgba(200,255,230,${0.42 * tractor})`], [0.7, `rgba(170,255,210,${0.2 * tractor})`], [1, `rgba(170,255,210,${0.08 * tractor})`]]);
    c.beginPath(); c.moveTo(-4, 4.4); c.lineTo(4, 4.4); c.lineTo(half, L); c.lineTo(-half, L); c.closePath(); c.fill();
    for (let i = 0; i < 5; i++) {
      const u = 1 - (((t * 0.45 + i / 5) % 1) + 1) % 1, ry = 6 + u * (L - 6), rw = 4 + (half - 4) * (ry - 4.4) / (L - 4.4);
      c.beginPath(); c.ellipse(0, ry, rw, 1 + rw * 0.12, 0, 0, TAU);
      c.strokeStyle = `rgba(220,255,235,${0.55 * tractor * Math.min(1, u * 4, (1 - u) * 4)})`; c.lineWidth = 0.5; c.stroke();
    }
    for (let i = 0; i < 9; i++) {
      const u = 1 - (((t * (0.25 + hash(i) * 0.2) + hash(i + 9)) % 1) + 1) % 1, my = 6 + u * (L - 6);
      const mx = (hash(i + 20) - 0.5) * 1.6 * (4 + (half - 4) * (my - 4.4) / (L - 4.4));
      c.fillStyle = `rgba(240,255,245,${0.8 * tractor * Math.min(1, u * 3)})`; c.fillRect(mx - 0.4, my - 0.4, 0.8, 0.8);
    }
    glow(c, 0, L, half, '200,255,220', 0.35 * tractor);
  }
  glow(c, 0, 1, 30, '170,255,200', 0.12);
  // Dome with the pilot.
  c.save(); c.beginPath(); c.ellipse(0, -2.6, 8.6, 9.4, 0, Math.PI, 0); c.closePath(); c.clip();
  if (pilot) {
    c.fillStyle = 'rgba(170,230,240,0.32)'; c.fillRect(-9, -12, 18, 10);
    martianHead(c, 0, -2.6, pilotSc, t, { talk: Math.max(0, Math.sin(t * 6)) * 0.6, look: Math.sin(t * 0.9), helmet: pilotHelmet, collar: pilotHelmet ? SUIT : PILOT_COLLAR });
  } else {
    // Frosted: no seeing in (Peter, 13 Oct) — the Martian is level 3's reveal,
    // so the small saucers keep their crews hidden. A milky glass, lit from the
    // upper left, with a faint shadow of something moving inside.
    c.fillStyle = grad(c, -8, -12, 6, -2, [[0, '#eef8f6'], [0.5, '#c4e2de'], [1, '#86aaa6']]); c.fillRect(-9, -12, 18, 10);
    c.beginPath(); c.ellipse(Math.sin(t * 0.7) * 1.4, -4.6, 2.6, 3.2, 0, 0, Math.PI * 2); c.fillStyle = 'rgba(70,110,90,0.22)'; c.fill();
  }
  c.restore();
  c.beginPath(); c.ellipse(0, -2.6, 8.6, 9.4, 0, Math.PI, 0); c.strokeStyle = 'rgba(235,255,255,0.8)'; c.lineWidth = 0.3; c.stroke();
  c.beginPath(); c.ellipse(-4, -7.6, 1, 2.6, 0.5, 0, TAU); c.fillStyle = 'rgba(255,255,255,0.5)'; c.fill();
  // Upper disc: four bands of facets, lit from the left.
  for (let band = 0; band < 2; band++) {
    const r0 = band ? 16 : 9.4, r1 = band ? R : 16, y0 = band ? -1.6 : -2.8, y1 = band ? 0 : -1.6;
    for (let f = 0; f < 10; f++) {
      const a0 = -1 + f * 0.2, a1 = a0 + 0.2;
      poly(c, [[a0 * r0, y0], [a1 * r0, y0], [a1 * r1, y1], [a0 * r1, y1]], SILVER[Math.min(4, Math.floor(f / 2.5))]);
    }
  }
  // The rim: a dark band with the chasing lights.
  c.fillStyle = SILVER[4]; c.fillRect(-R, -0.2, R * 2, 1.6);
  for (let i = 0; i < 14; i++) {
    const lx = -R + 1.8 + i * 3.47, on = ((t * 12 - i) % 7 + 7) % 7 < 1.6;
    c.beginPath(); c.arc(lx, 0.6, 0.5, 0, TAU); c.fillStyle = on ? '#fff2a0' : '#a8e080'; c.fill();
    if (on) glow(c, lx, 0.6, 2, '255,240,150', 0.8);
  }
  // Underside and its spinning band.
  poly(c, [[-R, 1.4], [R, 1.4], [14, 4.2], [-14, 4.2]], SILVER[2]);
  poly(c, [[-R, 1.4], [-6, 1.4], [-4, 4.2], [-14, 4.2]], SILVER[1]);
  for (let i = 0; i < 6; i++) {
    const sx = -13 + (((t * 14 + i * 4.6) % 27.6) + 27.6) % 27.6;
    c.fillStyle = SILVER[4]; c.fillRect(sx, 2.6, 1.6, 1.2);
  }
  c.beginPath(); c.ellipse(0, 4.4, 4, 1.1, 0, 0, TAU); c.fillStyle = SILVER[4]; c.fill();
  c.beginPath(); c.ellipse(0, 4.6, 2.4, 0.7, 0, 0, TAU); c.fillStyle = ray > 0 || tractor > 0 ? '#eaffd8' : '#7fe07f'; c.fill();
  c.restore();
}

// A V of small saucers, far off, banking as a flight.
// `sc` sets how near the flight is: small and far off in levels 1 and 2, nearer
// and bigger in the level-3 invasion.
// `shape` mixes the flights up (Peter, 13 Oct: "not always in a V"): v, line
// (abreast), trail (nose to tail), echelon, diamond, pair, single, loose. The
// lead saucer is at (x, y); `n` is how many fly.
export const FLEET_SHAPES = ['v', 'line', 'trail', 'echelon', 'diamond', 'pair', 'single', 'loose'];
export function fleetOffsets(shape, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const row = Math.ceil(i / 2), side = i % 2 ? -1 : 1;
    if (shape === 'line') out.push([-(i % 2) * 4, (i - (n - 1) / 2) * 9]);
    else if (shape === 'trail') out.push([-i * 17, Math.sin(i * 1.3) * 2]);
    else if (shape === 'echelon') out.push([-i * 12, i * 7]);
    else if (shape === 'diamond') out.push([[0, 0], [-12, -7], [-12, 7], [-24, 0], [-36, 0]][i] ?? [-i * 12, 0]);
    else if (shape === 'loose') out.push([-i * 14 - (i * 37 % 9), ((i * 53) % 17) - 8]);
    else out.push([-row * 13, i ? side * row * 6 : 0]);
  }
  return out;
}
// A cheap saucer for the far, small ones (no gradients, no glows, no pilot):
// a handful of flat shapes, so a sky can hold dozens of them.
export function marsSaucerLite(c, x, y, sc, t) {
  c.save(); c.translate(x, y); c.scale(sc, sc);
  // Frosted dome (see marsSaucer): milky, not see-through.
  c.beginPath(); c.ellipse(0, -2.6, 8.6, 8, 0, Math.PI, 0); c.fillStyle = '#c4e2de'; c.fill();
  c.beginPath(); c.ellipse(-2.6, -6.4, 2.4, 2.2, 0, 0, Math.PI * 2); c.fillStyle = '#eef8f6'; c.fill();
  c.beginPath(); c.moveTo(-25, 0); c.lineTo(-9, -2.8); c.lineTo(9, -2.8); c.lineTo(25, 0); c.closePath(); c.fillStyle = SILVER[1]; c.fill();
  c.beginPath(); c.moveTo(-25, 0); c.lineTo(25, 0); c.lineTo(14, 4.2); c.lineTo(-14, 4.2); c.closePath(); c.fillStyle = SILVER[3]; c.fill();
  c.fillStyle = SILVER[4]; c.fillRect(-25, -0.4, 50, 1.4);
  const on = Math.floor(((t * 12) % 7 + 7) % 7);
  c.fillStyle = '#fff2a0';
  for (let i = on % 2; i < 14; i += 2) c.fillRect(-23.6 + i * 3.47, 0, 1.2, 1.2);
  c.fillStyle = '#7fe07f'; c.fillRect(-2.4, 4, 4.8, 1.2);
  c.restore();
}
export function saucerFleet(c, x, y, t, n = 5, sc = 0.22, shape = 'v') {
  const k = sc / 0.22;
  const count = shape === 'single' ? 1 : shape === 'pair' ? 2 : shape === 'diamond' ? Math.min(n, 4) : n;
  fleetOffsets(shape === 'pair' ? 'echelon' : shape, count).forEach(([ox, oy], i) => {
    const sx = x + ox * k, sy = y + oy * k + Math.sin(t * 2 + i) * 0.8 * k;
    if (sc < 0.3) marsSaucerLite(c, sx, sy, sc, t + i * 0.37); else marsSaucer(c, sx, sy, sc, t + i * 0.37, { pilot: false });
  });
}

// The ray gun's zap landing on a rock: a white flash, a green skeleton-flicker
// burst and rings, then smoke. `p` 0..1 over the hit.
export function zapImpact(c, x, y, p) {
  if (p <= 0 || p >= 1) return;
  glow(c, x, y, 6 + p * 20, '170,255,140', 0.9 * (1 - p));
  if (p < 0.25) glow(c, x, y, 5, '255,255,255', 1 - p * 4);
  for (let i = 0; i < 3; i++) {
    const r = 3 + p * (14 + i * 6);
    c.beginPath(); c.ellipse(x, y, r, r * 0.4, 0, 0, TAU);
    c.strokeStyle = `rgba(190,255,160,${0.8 * (1 - p)})`; c.lineWidth = 0.6; c.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI * (0.1 + 0.8 * hash(i + 3)), r = p * (10 + hash(i) * 14);
    c.fillStyle = `rgba(230,255,200,${1 - p})`; c.fillRect(x + Math.cos(a) * r, y + Math.sin(a) * r, 0.8, 0.8);
  }
  if (p > 0.4) { const q = (p - 0.4) / 0.6; glow(c, x, y - q * 10, 5 + q * 6, '120,140,130', 0.4 * (1 - q)); }
}

// ---------------------------------------------------------------- the sheet
// Each candidate as a lab object (alone, at in-run size) and as a scene inside
// the real window: `scene(c, s, w)` paints in the vista's coordinates, into the
// sky pass (`sky`) or in front of the near ridges (`ground`).
export const MARS_CANDIDATES = [
  { letter: 'A', id: 'head', name: 'MARTIAN, HEAD AND HELMET', w: 40, h: 40,
    note: 'Skull face, huge exposed brain, black eye sockets with glowing pupils, a skeleton grin that chatters ACK! ACK!, in a glass bubble helmet with a high suit collar.',
    alone: (c, t, w, h) => martianHead(c, w / 2, h - 6, 1.7, t, { talk: Math.max(0, Math.sin(t * 6)), look: Math.sin(t * 0.8) }) },
  { letter: 'B', id: 'saucer', name: 'THE SAUCER', w: 90, h: 70,
    note: 'Wide flat silver disc in faceted bands, chasing rim lights, a spinning under-band, the Martian in the dome; the heat ray fires down from the belly.',
    alone: (c, t, w, h) => marsSaucer(c, w / 2, 24, 1.3, t, { ray: ((t % 4) + 4) % 4 < 1.6 ? 1 : 0 }),
    scene: { sky(c, s, w) { const u = ((s.t / 8) % 1 + 1) % 1, x = -60 + u * (w + 120);
      marsSaucer(c, x, -84 + Math.sin(s.t * 1.3) * 2, 1, s.t, { ray: u > 0.4 && u < 0.6 ? 1 : 0 }); } } },
  { letter: 'C', id: 'fleet', name: 'A FLEET, FAR OFF', w: 90, h: 40,
    note: 'A V of five small saucers banking across the upper sky as one flight — the invasion arriving, never close.',
    alone: (c, t, w, h) => saucerFleet(c, w / 2 + 26, h / 2 - 4, t),
    scene: { sky(c, s, w) { const u = ((s.t / 7) % 1 + 1) % 1; saucerFleet(c, -40 + u * (w + 110), -118 + u * 8, s.t); } } },
  { letter: 'D', id: 'standing', name: 'MARTIAN ON THE PLATEAU', w: 50, h: 50,
    note: 'The whole Martian, suit and belt and ray gun, standing on a shelf top and firing the odd ring-zap off into the sky. Big enough to read at the window’s depth.',
    alone: (c, t, w, h) => martianStanding(c, w / 2 - 6, h - 4, 1.4, t),
    scene: { ground(c, s, w) {
      // On his own small mesa in front of the ridges, riding the near parallax.
      const span = w + 200, x = ((w * 0.6 - s.cam * 0.14) % span + span) % span - 100;
      poly(c, [[x - 22, -6], [x - 14, -21], [x + 14, -21], [x + 22, -6]], '#3a4a2c');
      poly(c, [[x - 22, -6], [x - 14, -21], [x - 6, -21], [x - 12, -6]], '#b8c27a');
      c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(x - 14, -21.6, 28, 0.8);
      martianStanding(c, x - 3, -21, 0.9, s.t); } } },
  { letter: 'E', id: 'zap', name: 'RAY-GUN ZAP ON A RIDGE', w: 70, h: 50,
    note: 'From somewhere off-frame a saucer’s ray hits the ridges: white flash, green rings, sparks, a puff of smoke. A beat of drama that never touches the lane.',
    alone: (c, t, w, h) => { c.fillStyle = '#2a5a48'; c.beginPath(); c.moveTo(0, h); c.lineTo(w * 0.4, h - 22); c.lineTo(w * 0.7, h - 12); c.lineTo(w, h); c.fill(); zapImpact(c, w * 0.42, h - 22, ((t % 2.2) + 2.2) % 2.2 / 1.4); },
    scene: { ground(c, s, w) { const p = ((s.t % 3.5) + 3.5) % 3.5 / 1.6; zapImpact(c, w * 0.66, -30, p); } } },
];
