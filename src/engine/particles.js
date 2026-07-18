// Pooled particles. One flat array, no per-frame allocation in the hot loop.
const MAX = 400;
const pool = [];
for (let i = 0; i < MAX; i++) pool.push({ live: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, color: '#fff', size: 1, grav: 0 });
let cursor = 0;

export function spawn(x, y, vx, vy, life, color, size = 1, grav = 0) {
  const p = pool[cursor];
  cursor = (cursor + 1) % MAX;
  p.live = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy;
  p.life = life; p.maxLife = life; p.color = color; p.size = size; p.grav = grav;
}

export function burst(x, y, count, speed, life, color, size = 1, grav = 120, rand = Math.random) {
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const s = speed * (0.4 + rand() * 0.6);
    spawn(x, y, Math.cos(a) * s, Math.sin(a) * s - speed * 0.3, life * (0.6 + rand() * 0.6), color, size, grav);
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
  }
}

export function drawParticles(ctx, camX = 0) {
  for (const p of pool) {
    if (!p.live) continue;
    const a = p.life / p.maxLife;
    ctx.globalAlpha = a > 0.5 ? 1 : a * 2;
    ctx.fillStyle = p.color;
    const s = Math.max(1, Math.round(p.size * (0.5 + a * 0.5)));
    ctx.fillRect(Math.round(p.x - camX), Math.round(p.y), s, s);
  }
  ctx.globalAlpha = 1;
}

export function clearParticles() { for (const p of pool) p.live = false; }
