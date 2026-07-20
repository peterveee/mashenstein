// Pooled particles. One flat array, no per-frame allocation in the hot loop.
const MAX = 400;
const pool = [];
for (let i = 0; i < MAX; i++) {
  pool.push({
    live: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, color: '#fff', size: 1, grav: 0,
    // shards are chunks of the thing that just broke: they tumble, land, and skid.
    shard: false, w: 1, h: 1, rot: 0, spin: 0, floor: 0,
  });
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
  p.shard = false;
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
  p.shard = true; p.w = w; p.h = h; p.rot = 0; p.spin = spin; p.floor = floor;
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

export function updateParticles(dt) {
  for (const p of pool) {
    if (!p.live) continue;
    p.life -= dt;
    if (p.life <= 0) { p.live = false; continue; }
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

export function drawParticles(ctx, camX = 0) {
  for (const p of pool) {
    if (!p.live) continue;
    const a = p.life / p.maxLife;
    ctx.globalAlpha = a > 0.5 ? 1 : a * 2;
    ctx.fillStyle = p.color;
    if (p.shard) {
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
