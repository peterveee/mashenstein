// NEON — the major-key opening (BAKE-OFF CANDIDATES, not wired into the game).
//
// Peter, 23 Sep 2026: the new theme (SESERAGI) opens on the JR East jingle in a
// bright MAJOR key and turns MINOR at bar 15. What if the first level's background
// turned with it? The night city that ships is the REAL background — the one the
// song turns into. These are four candidates for what it looks like BEFORE the
// turn, and a neon lightning strike that converts one into the other.
//
// Each candidate is a MOOD for the shipped painter (the `neonMood` seam in
// src/engine/stylePacks/index.js): a sky, an optional sky hook for a sun / clouds /
// aurora, and the inks of the same city. Same towers, same parallax, same
// composition bands — only the light changes, which is the point: the conversion
// has to read as the SAME city going dark, not as a cut to somewhere else.
import { W, H } from '../engine/renderer.js';

const TAU = Math.PI * 2;
// The horizon, near enough, in the background's own screen space.
const HORIZON = H * 0.86;

function softDisc(ctx, x, y, r, inner, outer, glow = 2.6) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * glow);
  g.addColorStop(0, inner);
  g.addColorStop(1 / glow, outer);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r * glow, y - r * glow, r * glow * 2, r * glow * 2);
}

// A — the synthwave sunrise: the striped retro sun, the city's own genre.
function sunriseSky(ctx, t) {
  const x = W * 0.62;
  const y = HORIZON - 34;
  const r = 58;
  softDisc(ctx, x, y, r, 'rgba(255,190,120,0.55)', 'rgba(255,110,150,0.18)', 2.2);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y - r, 0, y + r);
  g.addColorStop(0, '#fff2a8');
  g.addColorStop(0.55, '#ffb35c');
  g.addColorStop(1, '#ff4f9a');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  // The bands: thicker toward the bottom, and drifting down very slowly, which is
  // what makes a striped sun read as rising rather than as a sticker.
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 7; i++) {
    const k = ((i + (t * 0.08) % 1) / 7);
    const by = y + k * r;
    ctx.fillRect(x - r, by, r * 2, 1 + k * 5);
  }
  ctx.restore();
}

// B — the clear day: a white sun top right and a few slow clouds.
function daySky(ctx, t) {
  softDisc(ctx, W * 0.84, H * 0.16, 16, 'rgba(255,255,240,1)', 'rgba(255,255,220,0.35)', 3.4);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  const clouds = [[0.1, 0.22, 1], [0.42, 0.14, 0.8], [0.66, 0.3, 1.2], [0.92, 0.36, 0.7]];
  for (const [fx, fy, s] of clouds) {
    const x = ((fx * W + t * 4 * s) % (W + 120)) - 60;
    const y = fy * H;
    ctx.globalAlpha = 0.75;
    for (const [dx, dy, r] of [[0, 0, 12], [13, -5, 15], [28, 0, 11], [14, 4, 12]]) {
      ctx.beginPath();
      ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// C — golden hour: a low warm sun and long rays across the city.
function goldenSky(ctx, t) {
  const x = W * 0.2;
  const y = HORIZON - 18;
  softDisc(ctx, x, y, 26, 'rgba(255,250,210,1)', 'rgba(255,200,120,0.4)', 4);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI * 0.08 - i * 0.11 + Math.sin(t * 0.2 + i) * 0.01;
    ctx.globalAlpha = 0.05 + (i % 3) * 0.02;
    ctx.fillStyle = '#fff0c0';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a - 0.02) * W, y + Math.sin(a - 0.02) * W);
    ctx.lineTo(x + Math.cos(a + 0.02) * W, y + Math.sin(a + 0.02) * W);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// D — the hopeful night: the same dark, lit by an aurora rather than smog.
function auroraSky(ctx, t) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const bands = [['#3bf5c8', 0.26, 0.2], ['#7ab8ff', 0.36, 0.14], ['#b07cff', 0.2, 0.1]];
  for (const [col, fy, alpha] of bands) {
    for (let x = 0; x < W; x += 3) {
      const y = H * fy + Math.sin(x * 0.018 + t * 0.35 + fy * 9) * 14 + Math.sin(x * 0.05 + t * 0.2) * 5;
      const h = 34 + Math.sin(x * 0.03 + t * 0.5) * 10;
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.35, col);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = alpha;
      ctx.fillStyle = g;
      ctx.fillRect(x, y, 3, h);
    }
  }
  ctx.restore();
}

export const NEON_MOOD_CANDIDATES = [
  {
    id: 'sunrise', name: 'A · synthwave sunrise',
    note: 'The striped retro sun coming up behind the city — the neon genre\'s own dawn. Warm magenta '
      + 'and gold tubes, windows lit pale. The furthest from the night, so the strike has the most to do.',
    mood: {
      sky: ['#3b1466', '#ff8a6b'], skyExtra: sunriseSky, stars: 0.25, moon: false,
      haze: { color: '#ff6fa0', alpha: 0.25 },
      mass: { fill: '#4a1f6e', crown: '#ffd27a', crownAlpha: 0.6 },
      wire: { inkA: '#ff5fc8', inkB: '#ffd166', lit: '#fff3c4', lamp: '#ffffff' },
      veil: { tint: '#b8488a', alpha: 0.55 },
    },
  },
  {
    id: 'day', name: 'B · clear day',
    note: 'Blue sky, a white sun, slow clouds; the tubes are still lit but it is daytime. The most '
      + 'literally optimistic — and the one that most needs checking against the drones and targets '
      + 'in the hazard band, which were drawn for a dark sky.',
    mood: {
      sky: ['#2f8ff0', '#bfe9ff'], skyExtra: daySky, stars: 0, moon: false,
      haze: { color: '#ffffff', alpha: 0.3 },
      mass: { fill: '#7da6d8', crown: '#ffffff', crownAlpha: 0.7 },
      wire: { inkA: '#ff4fa3', inkB: '#00b8ff', lit: '#fff8d0', lamp: '#ff3b5c' },
      veil: { tint: '#cfefff', alpha: 0.55 },
    },
  },
  {
    id: 'golden', name: 'C · golden hour',
    note: 'A low sun on the left, long rays across the towers, white-and-gold tubes. The warmest; '
      + 'reads as the end of a good day rather than a morning.',
    mood: {
      sky: ['#ff9a6b', '#ffe0a0'], skyExtra: goldenSky, stars: 0, moon: false,
      haze: { color: '#fff0c0', alpha: 0.35 },
      mass: { fill: '#b8606e', crown: '#fff4c0', crownAlpha: 0.8 },
      wire: { inkA: '#ffffff', inkB: '#ffcf5a', lit: '#ffffff', lamp: '#ff5a7a' },
      veil: { tint: '#ffc08a', alpha: 0.5 },
    },
  },
  {
    id: 'aurora', name: 'D · aurora night',
    note: 'Still night — but clear, starry, lit by an aurora, the tubes mint and ice. The smallest '
      + 'change from the real background, so the conversion is a change of LIGHT rather than of time '
      + 'of day: the aurora goes out and the smog comes in.',
    mood: {
      sky: ['#061b3a', '#1a5a7a'], skyExtra: auroraSky, stars: 1, moon: true,
      haze: { color: '#3bf5c8', alpha: 0.14 },
      mass: { fill: '#12385a', crown: '#7dfccf', crownAlpha: 0.5 },
      wire: { inkA: '#7dfccf', inkB: '#b8f3ff', lit: '#fff6c8', lamp: '#7dfccf' },
      veil: { tint: '#1a5a7a', alpha: 0.6 },
    },
  },
];

// ------------------------------------------------------------ the strike
// Deterministic per seed, so a looping tile draws the same bolt every cycle.
const rnd = (seed) => { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** The bolt's path: jagged from the top of the frame to (x, y), with two forks. */
function boltPath(x, y, seed) {
  const pts = [[x + (rnd(seed) - 0.5) * 60, 0]];
  const n = 9;
  for (let i = 1; i <= n; i++) {
    const k = i / n;
    pts.push([pts[0][0] + (x - pts[0][0]) * k + (i < n ? (rnd(seed + i) - 0.5) * 26 : 0), y * k]);
  }
  return pts;
}

/**
 * THE STRIKE. `u` is 0..1 through it: the bolt is drawn solid for the first
 * fifth, then fades; the flash is a white wash that peaks on contact and is gone
 * by the half. Drawn over everything, in screen space.
 */
export function drawNeonStrike(ctx, u, x, y, seed = 1) {
  if (u < 0 || u > 1) return;
  const pts = boltPath(x, y, seed);
  const forkAt = [3, 6];
  const bolt = (c, width, color, alpha) => {
    c.globalAlpha = alpha;
    c.strokeStyle = color;
    c.lineWidth = width;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.beginPath();
    pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
    for (const f of forkAt) {
      const [fx, fy] = pts[f];
      c.moveTo(fx, fy);
      c.lineTo(fx + (rnd(seed + f * 7) - 0.3) * 40, fy + 22);
      c.lineTo(fx + (rnd(seed + f * 9) - 0.3) * 56, fy + 40);
    }
    c.stroke();
  };
  const life = u < 0.2 ? 1 : Math.max(0, 1 - (u - 0.2) / 0.5);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  bolt(ctx, 14, '#38d8f8', 0.22 * life);
  bolt(ctx, 6, '#8cf0ff', 0.55 * life);
  bolt(ctx, 2.2, '#ffffff', life);
  ctx.restore();
  const flash = u < 0.5 ? Math.pow(1 - u / 0.5, 2) : 0;
  if (flash > 0) {
    ctx.save();
    ctx.globalAlpha = flash * 0.85;
    ctx.fillStyle = '#eafcff';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

/**
 * How far the night has spread from the strike point, as a radius — the city
 * converting outward from where the bolt landed rather than all at once.
 */
export function strikeWipeRadius(u) {
  const k = Math.max(0, Math.min(1, u / 0.7));
  return (1 - (1 - k) ** 3) * Math.hypot(W, H);
}
