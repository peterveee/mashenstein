// Pooled particles. One flat array, no per-frame allocation in the hot loop.
const MAX = 400;
const pool = [];
for (let i = 0; i < MAX; i++) {
  pool.push({
    live: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, color: '#fff', size: 1, grav: 0,
    // shards are chunks of the thing that just broke: they tumble, land, and skid.
    shard: false, w: 1, h: 1, rot: 0, spin: 0, floor: 0,
    // foil is paper: confetti and streamers. See spawnFoil().
    foil: false, ribbon: false, flip: 0, flipRate: 0, twist: 0,
    swayA: 0, swayF: 0, swayP: 0, vt: 0, len: 0, lean: 0, settled: false,
    back: '#888', edge: '#fff', dim: 1,
  });
}

// Lighten (amt > 0) or darken (amt < 0) a #rrggbb toward white/black. Memoised
// because paper wants three tones per colour and the alternative is building
// strings inside the draw loop.
const shadeCache = new Map();
function shade(hex, amt) {
  if (typeof hex !== 'string' || hex.length !== 7) return hex;
  const key = hex + amt;
  const hit = shadeCache.get(key);
  if (hit) return hit;
  const n = parseInt(hex.slice(1), 16);
  const target = amt < 0 ? 0 : 255;
  const k = Math.abs(amt);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v + (target - v) * k)));
  const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
  const out = `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
  shadeCache.set(key, out);
  return out;
}
let cursor = 0;

function take() {
  const p = pool[cursor];
  cursor = (cursor + 1) % MAX;
  return p;
}

export function spawn(x, y, vx, vy, life, color, size = 1, grav = 0) {
  const p = take();
  p.live = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy;
  p.life = life; p.maxLife = life; p.color = color; p.size = size; p.grav = grav;
  p.shard = false; p.foil = false;
}

export function burst(x, y, count, speed, life, color, size = 1, grav = 120, rand = Math.random) {
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const s = speed * (0.4 + rand() * 0.6);
    spawn(x, y, Math.cos(a) * s, Math.sin(a) * s - speed * 0.3, life * (0.6 + rand() * 0.6), color, size, grav);
  }
}

// One tumbling chunk. `floor` is the screen y it settles on (Infinity = never lands).
export function spawnShard(x, y, vx, vy, life, color, w, h, spin, grav = 300, floor = Infinity) {
  const p = take();
  p.live = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy;
  p.life = life; p.maxLife = life; p.color = color; p.grav = grav;
  p.shard = true; p.foil = false;
  p.w = w; p.h = h; p.rot = 0; p.spin = spin; p.floor = floor;
  p.size = Math.max(w, h);
}

// The thing coming apart: `count` chunks thrown outward, biased upward so the
// break reads as a pop rather than a puddle. `colors` cycles per chunk so one
// object can shed two or three materials.
export function shardBurst(x, y, count, speed, life, colors, opts = {}) {
  const { size = 3, grav = 340, floor = Infinity, rand = Math.random, spread = Math.PI * 2 } = opts;
  const list = Array.isArray(colors) ? colors : [colors];
  for (let i = 0; i < count; i++) {
    const a = spread >= Math.PI * 2 ? rand() * Math.PI * 2 : -Math.PI / 2 + (rand() - 0.5) * spread;
    const s = speed * (0.45 + rand() * 0.75);
    const w = size * (0.5 + rand() * 0.9);
    const h = size * (0.5 + rand() * 0.9);
    spawnShard(
      x, y,
      Math.cos(a) * s, Math.sin(a) * s - speed * 0.45,
      life * (0.7 + rand() * 0.6),
      list[i % list.length],
      w, h,
      (rand() - 0.5) * 22,
      grav, floor,
    );
  }
}

// ---- foil: confetti and streamers ------------------------------------------
//
// A rotating rectangle is not paper. Three things separate the two, and all
// three are in here:
//
//   * paper FLIPS. A confetto tumbles about its own long axis, so what you see
//     is a face squashing to a line and opening out again — and when it turns
//     over you are looking at the BACK of it, which is the same colour in
//     shadow. That flip, and the dark back face, is most of the effect.
//   * paper does not accelerate. It reaches terminal velocity almost at once
//     and then falls at a walking pace, faster edge-on (it slips through the
//     air) and stalling face-on (it catches it), which is what makes the
//     descent pulse instead of drop.
//   * paper wanders. A sine sway with a per-piece period and phase, so no two
//     pieces ever share a path and the fall reads as a room's worth of air
//     rather than a spawner's worth of downward velocity.
//
// Streamers are the same physics with a body: a strip drawn as a chain of
// segments whose widths follow the twist, which is what draws the helix of a
// curled ribbon. They land draped flat rather than standing on end.
//
// Colours are shaded once at spawn — face, back, and a near-white edge that is
// deliberately bright enough to cross glfx's bloom threshold, so an edge-on
// piece throws a glint on the frame it flashes past.
export function spawnFoil(x, y, color, opts = {}) {
  const {
    vx = 0, vy = 18, life = 6, w = 2.4, h = 2.4, ribbon = false, len = 10,
    floor = Infinity, vt = 34, rand = Math.random,
  } = opts;
  const p = take();
  // Depth. Everything falls in one plane otherwise, and a single plane of paper
  // is the thing that makes stock confetti look like a screensaver. Far pieces
  // are smaller, slower and knocked back toward the dark; near ones are bigger,
  // quicker and keep their full colour, so the air between them has thickness.
  const depth = 0.68 + rand() * 0.72;
  const far = depth < 1;
  p.live = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy;
  p.life = life; p.maxLife = life; p.grav = 0;
  p.shard = false; p.foil = true; p.ribbon = ribbon;
  p.w = w * depth; p.h = h * depth; p.len = len * depth;
  p.floor = floor; p.vt = vt * (0.72 + 0.38 * depth);
  p.size = Math.max(p.w, p.h);
  p.color = far ? shade(color, -(1 - depth) * 0.9) : color;
  p.back = shade(p.color, -0.42);
  p.edge = shade(p.color, far ? 0.5 : 0.72);
  p.dim = far ? 0.78 + 0.22 * depth : 1;
  p.rot = rand() * Math.PI * 2;
  // Confetti cartwheels in-plane as well as flipping; a streamer only leans,
  // because a strip that spins end over end reads as a stick, not as paper.
  p.spin = ribbon ? 0 : (rand() - 0.5) * 5;
  p.flip = rand() * Math.PI * 2;
  p.flipRate = (ribbon ? 2.2 : 5.5) * (0.6 + rand() * 0.9) * (rand() < 0.5 ? -1 : 1);
  p.twist = 0.5 + rand() * 0.55;      // radians of twist per ribbon segment
  p.swayA = (ribbon ? 16 : 11) * (0.5 + rand());
  p.swayF = 1.5 + rand() * 1.9;
  p.swayP = rand() * Math.PI * 2;
  p.lean = 0;
  p.settled = false;
  return p;
}

// The throw: a handful launched upward that turns into fall on the way down.
// Speed is the launch, not the descent — foil forgets its initial velocity
// within a beat, which is exactly what confetti out of a cannon does.
export function foilBurst(x, y, count, speed, colors, opts = {}) {
  const { rand = Math.random, life = 6, floor = Infinity, size = 2.4, ribbonChance = 0.35 } = opts;
  const list = Array.isArray(colors) ? colors : [colors];
  for (let i = 0; i < count; i++) {
    const a = -Math.PI / 2 + (rand() - 0.5) * 1.9;
    const s = speed * (0.55 + rand() * 0.7);
    const ribbon = rand() < ribbonChance;
    spawnFoil(x, y, list[i % list.length], {
      vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: life * (0.75 + rand() * 0.5),
      w: ribbon ? size * 0.62 : size * (0.72 + rand() * 0.6),
      h: size * (0.72 + rand() * 0.6),
      ribbon, len: size * (3.2 + rand() * 2.4),
      floor, vt: 30 + rand() * 20, rand,
    });
  }
}

export function updateParticles(dt) {
  for (const p of pool) {
    if (!p.live) continue;
    p.life -= dt;
    if (p.life <= 0) { p.live = false; continue; }
    if (p.foil) { updateFoil(p, dt); continue; }
    p.vy += p.grav * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (!p.shard) continue;
    p.rot += p.spin * dt;
    if (p.y >= p.floor && p.vy > 0) {
      // land: most of the energy goes into the dirt, the rest into a skid
      p.y = p.floor;
      p.vy *= -0.32;
      p.vx *= 0.55;
      p.spin *= 0.4;
      if (Math.abs(p.vy) < 12) { p.vy = 0; p.grav = 0; p.spin = 0; }
    }
  }
}

function updateFoil(p, dt) {
  if (p.settled) {
    // Landed paper is still paper: it keeps a slow breathing twist so the pile
    // on the floor isn't a row of dead rectangles, but it goes nowhere.
    p.flip += p.flipRate * 0.12 * dt;
    return;
  }
  p.flip += p.flipRate * dt;
  p.rot += p.spin * dt;
  p.swayP += p.swayF * dt;
  // Face-on catches the air, edge-on slips through it. The fall speed chases
  // that target rather than being set to it, so the piece has some weight.
  const face = Math.abs(Math.cos(p.flip));
  const target = p.vt * (1.15 - 0.55 * face);
  p.vy += (target - p.vy) * Math.min(1, dt * 5.5);
  // The throw dies off — a foilBurst piece arcs for a beat and then it is
  // simply falling, like everything else in the air.
  p.vx -= p.vx * Math.min(1, dt * 1.6);
  const sway = Math.cos(p.swayP) * p.swayA;
  p.x += (p.vx + sway) * dt;
  p.y += p.vy * dt;
  // A streamer leans into its own drift instead of spinning; the lean is what
  // makes the strip look like it is being carried by the sway.
  if (p.ribbon) p.lean = Math.sin(p.swayP) * 0.5 + (p.vx + sway) * 0.006;
  if (p.y >= p.floor && p.vy > 0) {
    p.y = p.floor;
    p.settled = true;
    p.vx = 0; p.vy = 0; p.spin = 0;
    // Face-up and flat. A streamer drapes across the ground, so its strip goes
    // horizontal — the whole point of the sweep two beats later is that the
    // floor is visibly covered.
    p.flip = p.flip < 0 || Math.cos(p.flip) < 0 ? Math.PI : 0;
    if (p.ribbon) p.lean = Math.PI / 2 + (Math.cos(p.swayP) * 0.35);
  }
}

// One curled streamer, drawn as a continuous quad strip rather than a stack of
// rectangles. The distinction matters: a rectangle per segment leaves the
// corners unconnected, and a strip that changes width and offset down its
// length then reads as a pixel staircase instead of paper. Joining each
// segment's edges to its neighbour's gives the band a real silhouette, and the
// canvas antialiases the diagonals for free.
//
// The twist itself is width plus tone: a facet turned toward you is wide and
// lit, one turned away is narrow and in shadow, and the alternation down the
// strip IS the helix of a curled ribbon. No curve maths anywhere.
const RIB_NODES = 11;
const ribX = new Float32Array(RIB_NODES);
const ribW = new Float32Array(RIB_NODES);
const ribC = new Float32Array(RIB_NODES);
function drawRibbon(ctx, p, alpha) {
  const segH = p.len / (RIB_NODES - 1);
  const y0 = -p.len / 2;
  for (let i = 0; i < RIB_NODES; i++) {
    const ph = p.flip + i * p.twist;
    ribC[i] = Math.cos(ph);
    // Never fully closed: a ribbon seen exactly edge-on is a hairline, not a
    // gap, and letting it reach zero snaps the strip into disconnected chunks.
    ribW[i] = Math.max(0.35, p.w * Math.abs(ribC[i]));
    ribX[i] = Math.sin(ph * 0.55) * p.w * 0.85;   // the snake across the strip
  }
  for (let i = 0; i < RIB_NODES - 1; i++) {
    const yA = y0 + i * segH, yB = yA + segH;
    const c = (ribC[i] + ribC[i + 1]) * 0.5;
    ctx.fillStyle = c >= 0 ? p.color : p.back;
    ctx.beginPath();
    ctx.moveTo(ribX[i] - ribW[i] / 2, yA);
    ctx.lineTo(ribX[i] + ribW[i] / 2, yA);
    ctx.lineTo(ribX[i + 1] + ribW[i + 1] / 2, yB);
    ctx.lineTo(ribX[i + 1] - ribW[i + 1] / 2, yB);
    ctx.closePath();
    ctx.fill();
    // The crest of each turn catches the light down one edge of the band.
    if (Math.abs(c) > 0.72) {
      ctx.globalAlpha = alpha * 0.55 * (Math.abs(c) - 0.72) / 0.28;
      ctx.fillStyle = p.edge;
      ctx.beginPath();
      ctx.moveTo(ribX[i] - ribW[i] / 2, yA);
      ctx.lineTo(ribX[i] - ribW[i] / 2 + ribW[i] * 0.3, yA);
      ctx.lineTo(ribX[i + 1] - ribW[i + 1] / 2 + ribW[i + 1] * 0.3, yB);
      ctx.lineTo(ribX[i + 1] - ribW[i + 1] / 2, yB);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = alpha;
    }
  }
}

// One confetto: a face that squashes to a line as it turns over, the back of
// the paper in shadow on the reverse, a lit top edge, and a glint on the frame
// it passes edge-on.
function drawConfetto(ctx, p, alpha) {
  const c = Math.cos(p.flip);
  const face = Math.abs(c);
  const w = Math.max(1, p.w);
  const h = Math.max(0.55, p.h * face);
  ctx.fillStyle = c >= 0 ? p.color : p.back;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  // Lit edge: the near side of the fold, only worth drawing while there is
  // enough face left to put it on.
  if (h > 1.4) {
    ctx.globalAlpha = alpha * (0.35 + 0.5 * face);
    ctx.fillStyle = p.edge;
    ctx.fillRect(-w / 2, -h / 2, w, Math.max(0.5, h * 0.22));
    ctx.globalAlpha = alpha;
  }
  // Edge-on flash. Additive and near-white so the bloom pass picks it up: the
  // piece all but vanishes for a frame or two and leaves a spark behind it,
  // which is what sells a room full of foil rather than a room full of dots.
  if (face < 0.2) {
    const op = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * (1 - face / 0.2) * 0.85;
    ctx.fillStyle = p.edge;
    ctx.fillRect(-w * 0.62, -0.5, w * 1.24, 1);
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = op;
  }
}

export function drawParticles(ctx, camX = 0) {
  for (const p of pool) {
    if (!p.live) continue;
    const a = p.life / p.maxLife;
    ctx.globalAlpha = a > 0.5 ? 1 : a * 2;
    ctx.fillStyle = p.color;
    if (p.foil) {
      const alpha = ctx.globalAlpha * p.dim;
      ctx.globalAlpha = alpha;
      ctx.save();
      ctx.translate(p.x - camX, p.y);
      ctx.rotate(p.ribbon ? p.lean : p.rot);
      if (p.ribbon) drawRibbon(ctx, p, alpha); else drawConfetto(ctx, p, alpha);
      ctx.restore();
      ctx.globalAlpha = alpha;
    } else if (p.shard) {
      // chunks keep their size as they die — they fade out, they don't evaporate
      const w = Math.max(1, p.w), h = Math.max(1, p.h);
      ctx.save();
      ctx.translate(p.x - camX, p.y);
      ctx.rotate(p.rot);
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    } else {
      // round, antialiased puffs — they shrink and fade as they die
      const r = Math.max(0.4, p.size * (0.5 + a * 0.5) * 0.6);
      ctx.beginPath();
      ctx.arc(p.x - camX + r, p.y + r, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

export function clearParticles() { for (const p of pool) p.live = false; }
