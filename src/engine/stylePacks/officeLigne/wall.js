// Corporate Kombat: LIGNE ’89 wall painter. Shared with the preserved bake-off.
import { box, line, LWF, LW, poly, fs, hash, TAU, textPath, GL, rrPath, neon, W, pen, M89, squiggle, letters, lines, circ, grid, mod, ell, confetti, rbox, copies } from './line.js';
import { WALL_BASE, LANE_TOP, MID_BASE } from '../officeClimb.js';
import { OFFICE_FONT } from './line.js';

function glassBlocks(g, x, y, w, h, P, cell = 8) {
  box(g, x, y, w, h, P.gbLine);
  for (let by = y; by < y + h - 0.5; by += cell) {
    for (let bx = x; bx < x + w - 0.5; bx += cell) {
      const bw = Math.min(cell, x + w - bx);
      const bh = Math.min(cell, y + h - by);
      box(g, bx + 0.6, by + 0.6, bw - 1.2, bh - 1.2, P.gb);
      if (bw > 4.5 && bh > 4.5) {
        box(g, bx + 2, by + 2, bw - 4, bh - 4, P.gbLt);
        line(g, bx + 2.4, by + bh - 2.6, bx + bw - 2.6, by + 2.4, P.gbLine, 0.35);
      }
    }
  }
  box(g, x, y, w, h, null, P.ink, LWF);
}

function nagelPrint(g, h, P) {
  const { x, y, w } = h;
  const hh = h.h;
  const variant = h.variant;
  box(g, x + 1.2, y + 1.6, w, hh, 'rgba(0,0,0,0.14)');
  box(g, x, y, w, hh, P.chrome, P.ink, LW);
  box(g, x + 1.6, y + 1.6, w - 3.2, hh - 3.2, '#ffffff', P.ink, LWF);
  const ix = x + 4;
  const iy = y + 4;
  const iw = w - 8;
  const ih = hh - 8;
  g.save();
  g.beginPath();
  g.rect(ix, iy, iw, ih);
  g.clip();
  box(g, ix, iy, iw, ih, variant ? '#f7b9d2' : '#9fdcd6');
  poly(g, [ix + iw * 0.5, iy, ix + iw, iy, ix + iw, iy + ih * 0.66], variant ? '#b39ae6' : '#f6df4a');
  if (variant) {
    for (const [bx, bh] of [[0, 9], [5, 15], [10, 7], [15, 19], [21, 11], [26, 14]]) box(g, ix + (bx * iw) / 30, iy + ih - bh, iw * 0.18, bh, '#8a74b4', P.ink, 0.3);
  }
  const s = iw / 30;
  const cx = ix + iw * 0.5;
  const cy = iy + ih * 0.4;
  const skin = '#f8f4f2';
  const jet = '#141218';
  poly(g, [cx - 2 * s, cy + 6 * s, cx + 3 * s, cy + 6 * s, cx + 4 * s, cy + 12 * s, cx + 14 * s, cy + 16 * s, cx + 14 * s, iy + ih + 1,
    cx - 12 * s, iy + ih + 1, cx - 10 * s, cy + 15 * s, cx - 3 * s, cy + 12 * s], skin, P.ink, 0.45);
  poly(g, [cx - 12 * s, iy + ih + 1, cx - 9 * s, cy + 17.5 * s, cx + 2 * s, cy + 19.5 * s, cx + 14 * s, cy + 17.5 * s, cx + 14 * s, iy + ih + 1], jet, P.ink, 0.45);
  g.beginPath();
  g.moveTo(cx + 4 * s, cy - 9 * s);
  g.lineTo(cx - 3.5 * s, cy - 8 * s);
  g.lineTo(cx - 5 * s, cy - 2 * s);
  g.lineTo(cx - 6.8 * s, cy + 1.6 * s);
  g.lineTo(cx - 5 * s, cy + 2.4 * s);
  g.lineTo(cx - 5.4 * s, cy + 4 * s);
  g.lineTo(cx - 4.6 * s, cy + 5.2 * s);
  g.lineTo(cx - 3.4 * s, cy + 7 * s);
  g.lineTo(cx + 2 * s, cy + 7.6 * s);
  g.lineTo(cx + 5 * s, cy + 2 * s);
  g.closePath();
  fs(g, skin, P.ink, 0.45);
  poly(g, [cx - 5.3 * s, cy + 3.6 * s, cx - 3.6 * s, cy + 3.2 * s, cx - 3.4 * s, cy + 4.8 * s, cx - 4.8 * s, cy + 5.2 * s], '#e0203a');
  line(g, cx - 3.9 * s, cy - 2.4 * s, cx - 0.4 * s, cy - 2.9 * s, jet, 0.7);
  poly(g, [cx - 3.4 * s, cy - 2.2 * s, cx - 0.9 * s, cy - 2.6 * s, cx - 1.6 * s, cy - 1.5 * s], jet);
  poly(g, [cx - 4 * s, cy - 7.8 * s, cx - 2 * s, cy - 12 * s, cx + 6 * s, cy - 13 * s, cx + 11 * s, cy - 9 * s, cx + 12 * s, cy + 6 * s,
    cx + 6 * s, cy + 9 * s, cx + 3.4 * s, cy + 2 * s, cx + 2 * s, cy - 4.5 * s, cx - 3.6 * s, cy - 4.4 * s], jet, P.ink, 0.45);
  poly(g, [cx + 3 * s, cy - 11.6 * s, cx + 8.4 * s, cy - 10 * s, cx + 5 * s, cy - 9.2 * s], '#ffffff');
  g.restore();
}

const PROF_NAGEL = {
  skin: '#faf3f1', skinDk: '#ecdcdc', stubble: '#f0e6e6', chin: '#ffffff',
  tones: [['#ffffff', '#e4e4ee'], ['#eef0f6', '#d4d6e2'], ['#dcdee8', '#c2c4d2']],
  stache: '#e8eaf2', rim: '#141218', lens: '#bfe9f6', cape: '#141218', capeIn: '#e0203a', shirt: '#ffffff',
};

function rake(g, x0, x1, top, bottom, seed, a = 0.13) {
  const h = bottom - top;
  g.save();
  g.beginPath();
  g.rect(x0, top, x1 - x0, h);
  g.clip();
  g.fillStyle = `rgba(255,255,255,${a})`;
  g.beginPath();
  for (let k = 0, x = x0 - h * 0.7 + hash(seed) * 50; x < x1; k++, x += 80 + hash(seed + k * 3.3) * 50) {
    const w1 = 6 + hash(seed + k) * 6;
    g.moveTo(x, bottom); g.lineTo(x + w1, bottom); g.lineTo(x + w1 + h * 0.7, top); g.lineTo(x + h * 0.7, top); g.closePath();
    const x2 = x + w1 + 4;
    g.moveTo(x2, bottom); g.lineTo(x2 + 2.6, bottom); g.lineTo(x2 + 2.6 + h * 0.7, top); g.lineTo(x2 + h * 0.7, top); g.closePath();
  }
  g.fill();
  g.restore();
}

function crownPath(b) {
  const x = b.x;
  const w = b.w;
  const t = b.top;
  const cx = x + w / 2;
  const p = new Path2D();
  if (b.roof === 'spire') {
    p.moveTo(cx - w * 0.32, t - 10); p.lineTo(cx + w * 0.32, t - 10);
    p.moveTo(cx - w * 0.18, t - 18); p.lineTo(cx, t - 44); p.lineTo(cx + w * 0.18, t - 18);
  } else if (b.roof === 'stepped') {
    p.moveTo(x + w * 0.14, t - 12); p.lineTo(x + w * 0.86, t - 12);
    p.moveTo(x + w * 0.3, t - 22); p.lineTo(x + w * 0.7, t - 22);
  }
  p.moveTo(x + 0.6, t + 0.6);
  p.lineTo(x + w - 0.6, t + 0.6);
  if (b.i % 2 === 0) { p.moveTo(x + 0.6, t + 0.6); p.lineTo(x + 0.6, b.base); } else { p.moveTo(x + w - 0.6, t + 0.6); p.lineTo(x + w - 0.6, b.base); }
  return p;
}

const SIGN = { cache: null };

function signPaths() {
  if (SIGN.cache) return SIGN.cache;
  const ex = 22;
  const ey = 28;
  const egg = new Path2D();
  egg.ellipse(ex, ey + 2.2, 10, 13.5 - 2.2, 0, 0, Math.PI);
  egg.ellipse(ex, ey + 2.2, 10, 13.5 + 2.2, 0, Math.PI, TAU);
  const crack = new Path2D();
  crack.moveTo(ex - 7, ey + 1); crack.lineTo(ex - 3.5, ey - 2.5); crack.lineTo(ex - 0.5, ey + 1.6); crack.lineTo(ex + 3, ey - 2.4); crack.lineTo(ex + 6.6, ey + 1);
  const size = 15;
  const track = 1.3;
  const s = size / 6;
  const word = 'EGGCORP';
  let ox = 46;
  const chars = [];
  for (const ch of word) {
    chars.push(textPath(ch, ox, 35, size, { slant: 0.16 }));
    ox += ((GL[ch] || GL[' ']).w + track) * s;
  }
  SIGN.cache = { egg, crack, chars };
  return SIGN.cache;
}

function buzz(t, seed) {
  const c = (((t + seed) % 6.7) + 6.7) % 6.7;
  if (c > 5.1 && c < 5.8) return hash(Math.floor(t * 22) + seed) > 0.45 ? 1 : 0;
  return 1;
}

function signNeon(ctx, f, P) {
  for (const h of f.wall.hangs) {
    if (h.kind !== 'logo') continue;
    const { x, y, w } = h;
    const hh = h.h;
    ctx.save();
    ctx.fillStyle = 'rgba(255,79,168,0.07)';
    ctx.beginPath();
    rrPath(ctx, x - 16, y - 12, w + 32, hh + 24, 10);
    ctx.rect(x, y, w, hh);
    ctx.fill('evenodd');
    ctx.fillStyle = 'rgba(255,79,168,0.08)';
    ctx.beginPath();
    rrPath(ctx, x - 7, y - 5, w + 14, hh + 10, 6);
    ctx.rect(x, y, w, hh);
    ctx.fill('evenodd');
    ctx.translate(x, y);
    const S = signPaths();
    neon(ctx, S.egg, P.neonB, 1.1, 3);
    neon(ctx, S.crack, P.neonA, 0.8, 2);
    S.chars.forEach((p, i) => neon(ctx, p, P.neonA, 1.25, 3, i === 5 ? buzz(f.t, 0) : 1));
    ctx.restore();
  }
}

function floorLights(ctx, f, P) {
  const top = WALL_BASE;
  ctx.save();
  ctx.beginPath();
  ctx.rect(-2, top, f.W + 4, LANE_TOP - top);
  ctx.clip();
  for (const h of f.wall.hangs) {
    if (h.kind === 'lift' && h.open > 0.02) {
      const cx = h.x + h.w / 2;
      const hw = (h.w / 2 - 2) * h.open;
      poly(ctx, [cx - hw, top, cx + hw, top, cx + hw * 2.2, top + 12, cx - hw * 2.2, top + 12], 'rgba(255,232,244,0.16)');
      poly(ctx, [cx - hw, top, cx + hw, top, cx + hw * 1.5, top + 7, cx - hw * 1.5, top + 7], 'rgba(255,240,248,0.24)');
    } else if (h.kind === 'trophyCase') {
      poly(ctx, [h.x + 4, top, h.x + h.w - 4, top, h.x + h.w + 8, top + 10, h.x - 8, top + 10], 'rgba(255,200,232,0.14)');
      poly(ctx, [h.x + 8, top, h.x + h.w - 8, top, h.x + h.w, top + 5, h.x, top + 5], 'rgba(255,214,238,0.18)');
    } else if (h.kind === 'logo') {
      for (const [a, b, al] of [[h.x + 46, h.x + h.w - 6, 0.16], [h.x + 10, h.x + 34, 0.12]]) {
        ctx.fillStyle = `rgba(255,79,168,${al})`;
        for (const [y0, hgt] of [[0.5, 3.6], [5.4, 2.4], [9.2, 1.4], [12, 0.7]]) ctx.fillRect(a, top + y0, b - a, hgt);
      }
    }
  }
  ctx.restore();
}

function glints(ctx, f) {
  const pts = [];
  for (const h of f.wall.hangs) {
    if (h.kind === 'lift') { pts.push([h.x - 1.5, h.y - 1.5, h.i * 3.1]); pts.push([h.x + h.w + 1.5, h.y + 6, h.i * 5.7]); }
    if (h.kind === 'trophyCase') { pts.push([h.x + h.w * 0.3, h.y + 18, 11]); pts.push([h.x + h.w * 0.7, h.y + 52, 17]); }
    if (h.kind === 'portrait') pts.push([h.x + h.w, h.y, 23]);
    if (h.kind === 'clock') pts.push([h.cx - h.r * 0.7, h.cy - h.r * 0.7, 29]);
  }
  for (const c of f.wall.columns) pts.push([c.x + 2, f.ceilingY + 4, c.i * 7.3]);
  ctx.fillStyle = '#ffffff';
  for (const [x, y, seed] of pts) {
    const v = Math.sin(f.t * 1.3 + seed * 2.7);
    if (v < 0.9) continue;
    const s = 1 + ((v - 0.9) / 0.1) * 2.2;
    ctx.beginPath();
    ctx.moveTo(x - s, y); ctx.lineTo(x - s * 0.18, y - s * 0.18); ctx.lineTo(x, y - s); ctx.lineTo(x + s * 0.18, y - s * 0.18);
    ctx.lineTo(x + s, y); ctx.lineTo(x + s * 0.18, y + s * 0.18); ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.18, y + s * 0.18);
    ctx.closePath();
    ctx.fill();
  }
}

function sunShafts(ctx, f) {
  const G = f.glass;
  const outer = new Path2D();
  const inner = new Path2D();
  const end = 222;
  for (const b of f.wall.bays) {
    if (b.type !== 'glass') continue;
    for (const [fx, w] of [[0.12, 34], [0.52, 20], [0.76, 28]]) {
      const x = b.x0 + (b.x1 - b.x0) * fx;
      outer.moveTo(x, G.top + 8); outer.lineTo(x + w, G.top + 8); outer.lineTo(x + w + 52, end); outer.lineTo(x + 52, end); outer.closePath();
      inner.moveTo(x + w * 0.3, G.top + 8); inner.lineTo(x + w * 0.62, G.top + 8); inner.lineTo(x + w * 0.62 + 52, end); inner.lineTo(x + w * 0.3 + 52, end); inner.closePath();
    }
  }
  ctx.fillStyle = 'rgba(255,252,232,0.1)';
  ctx.fill(outer);
  ctx.fillStyle = 'rgba(255,252,232,0.08)';
  ctx.fill(inner);
}

function noonShafts(ctx, f) {
  const G = f.glass;
  const lean = 34;
  const land = 223;
  const yt = G.top + 6;
  const k = (MID_BASE - yt) / (land - yt);
  const air = new Path2D();
  const patch = new Path2D();
  for (const [x, w] of noonSpans(f)) {
    air.moveTo(x, yt); air.lineTo(x + w, yt); air.lineTo(x + w + lean, land); air.lineTo(x + lean, land); air.closePath();
    patch.moveTo(x + lean * k, MID_BASE); patch.lineTo(x + w + lean * k, MID_BASE); patch.lineTo(x + w + lean, land); patch.lineTo(x + lean, land); patch.closePath();
  }
  ctx.fillStyle = 'rgba(255,252,236,0.075)';
  ctx.fill(air);
  ctx.fillStyle = 'rgba(255,252,236,0.17)';
  ctx.fill(patch);
}

function noonWall(ctx, f) {
  const G = f.glass;
  ctx.fillStyle = 'rgba(255,252,236,0.24)';
  ctx.beginPath();
  for (const [x, w] of noonSpans(f)) {
    ctx.moveTo(x + 2, G.bottom + 6); ctx.lineTo(x + 2 + w, G.bottom + 6); ctx.lineTo(x + 8 + w, WALL_BASE - 1); ctx.lineTo(x + 8, WALL_BASE - 1); ctx.closePath();
  }
  ctx.fill();
}

function noonSpans(f) {
  const G = f.glass;
  const out = [];
  for (const b of f.wall.bays) {
    if (b.type !== 'glass') continue;
    const n = Math.max(1, Math.round((b.x1 - b.x0) / G.mullion));
    const pitch = (b.x1 - b.x0) / n;
    const cover = b.x0 + Math.max(6, (b.x1 - b.x0) * b.blinds);
    for (let i = 0; i < n; i++) {
      const a = b.x0 + i * pitch + 1.6;
      const c = b.x0 + (i + 1) * pitch - 1.4;
      let x = a;
      for (; x < Math.min(c, cover); x += 4.2) out.push([x, Math.min(1.5, c - x)]);
      if (x < c) out.push([x, c - x]);
    }
  }
  return out;
}

function lobbyCornice(g, x0, x1, P) {
  box(g, x0, 14, x1 - x0, 8, P.ceilDk, P.ink, LW);
  box(g, x0, 19.4, x1 - x0, 2.6, P.brass, P.ink, LWF);
  g.beginPath();
  for (let x = x0 + 2; x < x1; x += 4) { g.moveTo(x, 14.4); g.lineTo(x, 18); }
  pen(g, P.wallJoint, 0.9);
  g.stroke();
}

function lobbyWallBay(g, x0, x1, P) {
  box(g, x0, 14, x1 - x0, 190, P.wall);
  // glass block above the frieze, with the morning coming through it
  glassBlocks(g, x0, 22, x1 - x0, 70.5, P, 8.8);
  // pink granite below, flecked, in big polished slabs
  const w = x1 - x0;
  for (let k = 0; k < Math.round(w * 1.6); k++) {
    const px = x0 + hash(w * 0.13 + k * 3.17) * w;
    const py = 99 + hash(w * 0.29 + k * 5.71) * 95;
    g.fillStyle = P.fleck[k % 3];
    g.fillRect(px, py, 0.7 + (k % 2) * 0.4, 0.7);
  }
  g.beginPath();
  for (let y = 98.5 + 32; y < 195; y += 32) { g.moveTo(x0, y); g.lineTo(x1, y); }
  for (let x = x0 + 46; x < x1 - 4; x += 46) { g.moveTo(x, 98.5); g.lineTo(x, 195); }
  pen(g, P.wallJoint, 0.55);
  g.stroke();
  lobbyCornice(g, x0, x1, P);
  // the black lacquer frieze, a pink pinstripe and a teal squiggle along it
  box(g, x0, 92.5, x1 - x0, 6, P.band, P.ink, LW);
  line(g, x0, 93.7, x1, 93.7, M89.pink, 0.5);
  squiggle(g, x0 + 2, x1 - 2, 96.3, 0.9, 6, M89.teal, 0.6);
  box(g, x0, 195, x1 - x0, 9, P.marble, P.ink, LW);
  line(g, x0, 196.6, x1, 196.6, P.chrome, 0.6);
}

function lobbyGlass(g, x0, x1, b, P, F) {
  const G = F.glass;
  lobbyCornice(g, x0, x1, P);
  const n = Math.max(1, Math.round((x1 - x0) / G.mullion));
  const pitch = (x1 - x0) / n;
  const door = b.revolvingDoor;
  rake(g, x0, x1, G.top, G.bottom, b.seed, 0.12);
  const bar = P.frame;
  for (let i = 0; i <= n; i++) {
    const mx = x0 + i * pitch;
    const nearDoor = door != null && Math.abs(mx - door) < 28;
    box(g, mx - 1.1, G.top, 2.2, (nearDoor ? G.transom : G.bottom) - G.top, bar, P.ink, LWF);
    line(g, mx - 0.4, G.top + 2, mx - 0.4, (nearDoor ? G.transom : G.bottom) - 2, 'rgba(255,220,240,0.35)', 0.4);
  }
  box(g, x0, G.top, x1 - x0, 2.4, bar, P.ink, LWF);
  box(g, x0, G.transom - 1.6, x1 - x0, 3.2, bar, P.ink, LWF);
  line(g, x0, G.transom - 0.6, x1, G.transom - 0.6, P.frameLt, 0.5);
  if (G.bottom < WALL_BASE) {
    // a pink granite upstand under the glass, capped and skirted like the wall bays
    box(g, x0, G.bottom, x1 - x0, WALL_BASE - G.bottom, P.wall, P.ink, LWF);
    for (let x = x0 + 46; x < x1 - 4; x += 46) line(g, x, G.bottom, x, 195, P.wallJoint, 0.55);
    box(g, x0, 195, x1 - x0, 9, P.marble, P.ink, LW);
    line(g, x0, 196.6, x1, 196.6, P.chrome, 0.6);
  }
  box(g, x0, G.bottom - 3, x1 - x0, 3, P.marble, P.ink, LWF);
  if (door != null) {
    box(g, door - 25, G.transom + 1.6, 50, 7, P.brass, P.ink, LW);
    box(g, door - 25, G.transom + 7, 50, 1.6, P.brassDk, P.ink, LWF);
    letters(g, 'EGGCORP', door, G.transom + 6.6, 3.6, { ink: P.ink, lw: 0.5, align: 'center' });
    for (const s of [-1, 1]) box(g, door + s * 23 - 1.5, G.transom + 8.6, 3, G.bottom - G.transom - 11.6, P.brass, P.ink, LWF);
    box(g, door - 22, G.bottom - 4.6, 44, 1.6, '#5a4a3a', P.ink, LWF);
    letters(g, 'IN', door - 32, G.transom + 40, 3, { ink: P.brassDk, lw: 0.45, align: 'center' });
    letters(g, 'OUT', door + 33, G.transom + 40, 3, { ink: P.brassDk, lw: 0.45, align: 'center' });
  }
}

function lobbyColumn(g, x, w, P) {
  box(g, x, 14, w, 190, P.column, P.ink, LW);
  g.beginPath();
  for (let k = 1; k < 4; k++) { g.moveTo(x + (w * k) / 4, 30); g.lineTo(x + (w * k) / 4, 186); }
  pen(g, P.columnDk, 0.6);
  g.stroke();
  // the lacquer's sheen: a flat lit stripe down the side toward the glass, a hairline beside it
  box(g, x + 1.6, 24, 2.2, 162, 'rgba(255,190,225,0.2)');
  line(g, x + 4.6, 26, x + 4.6, 184, 'rgba(255,255,255,0.28)', 0.4);
  box(g, x - 1.5, 14, w + 3, 9, P.brass, P.ink, LW);
  lines(g, [x - 1.5, 17, x + w + 1.5, 17, x - 1.5, 20, x + w + 1.5, 20], P.brassDk, 0.5);
  box(g, x - 1.5, 92.5, w + 3, 6, P.band, P.ink, LW);
  box(g, x - 2, 188, w + 4, 16, P.marble, P.ink, LW);
  box(g, x - 2, 188, w + 4, 2, P.brass, P.ink, LWF);
}

function lobbyLift(g, h, P) {
  const { x, y, w } = h;
  const hh = h.h;
  // a postmodern ziggurat in black lacquer, lined in chrome
  poly(g, [x - 5, WALL_BASE, x - 5, y - 4, x - 2, y - 4, x - 2, y - 16, x + w / 2 - 6, y - 16, x + w / 2 - 6, y - 21,
    x + w / 2 + 6, y - 21, x + w / 2 + 6, y - 16, x + w + 2, y - 16, x + w + 2, y - 4, x + w + 5, y - 4, x + w + 5, WALL_BASE], P.marble, P.ink, LW);
  lines(g, [x - 3.4, y - 2, x - 3.4, WALL_BASE, x + w + 3.4, y - 2, x + w + 3.4, WALL_BASE], M89.pink, 0.5);
  poly(g, [x + w / 2 - 4, y - 16, x + w / 2, y - 20, x + w / 2 + 4, y - 16], M89.teal);
  box(g, x - 1.5, y - 1.5, w + 3, hh + 1.5, P.chrome, P.ink, LWF);
  box(g, x, y, w, hh, P.carLit, P.ink, LWF);
  poly(g, [x, y, x + 5, y + 5, x + 5, y + hh - 6, x, y + hh], P.carSide, P.ink, LWF);
  poly(g, [x + w, y, x + w - 5, y + 5, x + w - 5, y + hh - 6, x + w, y + hh], P.carSide, P.ink, LWF);
  poly(g, [x, y + hh, x + 5, y + hh - 6, x + w - 5, y + hh - 6, x + w, y + hh], P.carFloor, P.ink, LWF);
  // (the car's back wall — its poster and call panel — is liftCar.js; no handrail across it,
  // Peter 14 Oct: "would it be cleaner without now we will have art?")
  // the LED panel over the doors (its digits are lit per frame)
  box(g, x + w / 2 - 8, y - 13, 16, 8, '#18161e', P.ink, LWF);
  box(g, x + w / 2 - 8, y - 13, 16, 8, null, P.chrome, 0.5);
  // the call buttons (a bank of lifts shares one panel: `buttons: false`)
  if (h.buttons === false) return;
  box(g, x + w + 1.6, y + hh * 0.48, 2.6, 6, P.chrome, P.ink, LWF);
  circ(g, x + w + 2.9, y + hh * 0.48 + 1.7, 0.7, M89.pink);
  circ(g, x + w + 2.9, y + hh * 0.48 + 4.3, 0.7, M89.teal);
}

function lobbyLogo(g, h, P) {
  const { x, y, w } = h;
  const hh = h.h;
  box(g, x + 1.4, y + 1.8, w, hh, P.wallShade);
  box(g, x, y, w, hh, '#1b1a22', P.ink, LW);
  grid(g, x + 2, y + 2, w - 4, hh - 4, 6, '#1b1a22', '#2c2a36', 0.4);
  box(g, x, y, w, hh, null, P.chrome, 0.7);
  line(g, x + 46, y + 41.5, x + w - 6, y + 41.5, P.chrome, 0.7);
  letters(g, 'WORLD HEADQUARTERS', x + 46 + (w - 52) / 2, y + 49.5, 4.2, { ink: P.chrome, lw: 0.5, align: 'center', track: 1.3, slant: 0.16 });
}

function clockFace(g, cx, cy, r, bezel, face, P, roman = false) {
  circ(g, cx + 0.6, cy + 0.8, r + 1.6, 'rgba(0,0,0,0.08)');
  circ(g, cx, cy, r + 1.6, bezel, P.ink, LW);
  circ(g, cx, cy, r, face, P.ink, LWF);
  g.beginPath();
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU;
    const r0 = k % 3 === 0 ? r * 0.7 : r * 0.82;
    g.moveTo(cx + Math.sin(a) * r0, cy - Math.cos(a) * r0);
    g.lineTo(cx + Math.sin(a) * r * 0.94, cy - Math.cos(a) * r * 0.94);
  }
  pen(g, P.ink, roman ? 0.55 : 0.45);
  g.stroke();
}

function cityPainting(g, h, P) {
  nagelPrint(g, { ...h, variant: 1 }, P);
}

function openWallBay(g, x0, x1, P, F) {
  box(g, x0, F.ceilingY, x1 - x0, WALL_BASE - F.ceilingY, P.wall);
  openDado(g, x0, x1, P);
  openBulkhead(g, x0, x1, P, F);
  // sockets on the dado, every so often
  for (let x = x0 + 30; x < x1 - 10; x += 74) {
    box(g, x, 186, 5, 4, '#eeeadc', P.ink, LWF);
    lines(g, [x + 1.6, 187.2, x + 1.6, 188.6, x + 3.4, 187.2, x + 3.4, 188.6], P.ink, 0.35);
  }
}

function openDado(g, x0, x1, P) {
  box(g, x0, 168, x1 - x0, 30, P.dado);
  box(g, x0, 165.5, x1 - x0, 3, P.rail, P.ink, LWF);
  box(g, x0, 197, x1 - x0, 7, P.skirting, P.ink, LW);
}

function openBulkhead(g, x0, x1, P, F) {
  box(g, x0, F.ceilingY + 3, x1 - x0, 2.6, '#dcd8e2', P.ink, LWF);
  g.beginPath();
  for (let x = x0 + 8; x < x1; x += 24) { g.moveTo(x, F.ceilingY + 5.6); g.lineTo(x, F.ceilingY + 8); }
  pen(g, P.ink, 0.4);
  g.stroke();
  // a band of pastel blocks, the decade's favourite trim
  // the blocks keep one phase along the whole floor, so neighbouring bays meet colour to colour
  const cols = [M89.pink, M89.teal, M89.lemon, M89.lilac];
  for (let x = Math.floor(x0 / 12) * 12; x < x1; x += 12) {
    const a = Math.max(x, x0), b = Math.min(x + 12, x1);
    if (b > a) box(g, a, F.ceilingY + 10, b - a, 3.2, cols[((Math.round(x / 12) % 4) + 4) % 4]);
  }
  box(g, x0, F.ceilingY + 10, x1 - x0, 3.2, null, P.ink, LWF);
  line(g, x0, F.ceilingY + 0.5, x1, F.ceilingY + 0.5, P.ink, LW);
}

function openGlass(g, x0, x1, b, P, F) {
  const G = F.glass;
  box(g, x0, F.ceilingY, x1 - x0, G.top - F.ceilingY, P.wall);
  openBulkhead(g, x0, x1, P, F);
  box(g, x0, G.bottom, x1 - x0, WALL_BASE - G.bottom, P.wall);
  openDado(g, x0, x1, P);
  const n = Math.max(1, Math.round((x1 - x0) / G.mullion));
  const pitch = (x1 - x0) / n;
  const gh = G.bottom - G.top;
  g.save();
  g.beginPath();
  g.rect(x0, G.top, x1 - x0, gh);
  g.clip();
  g.beginPath();
  for (let i = 0; i < n; i++) {
    if (hash(b.seed * 0.31 + i * 2.3) < 0.5) continue;
    const px = x0 + i * pitch;
    const yy = G.top + gh * (0.45 + 0.3 * hash(i * 7 + b.seed));
    g.moveTo(px + 8, yy + 16); g.lineTo(px + 24, yy - 4);
    g.moveTo(px + 13, yy + 17); g.lineTo(px + 27, yy);
  }
  pen(g, 'rgba(255,255,255,0.5)', 0.9);
  g.stroke();
  g.restore();
  rake(g, x0, x1, G.top, G.bottom, b.seed, 0.12);
  for (let i = 0; i <= n; i++) box(g, x0 + i * pitch - 1, G.top, 2, gh, P.frame, P.ink, LWF);
  box(g, x0, G.top, x1 - x0, 1.6, P.frame, P.ink, LWF);
  // vertical blinds: louvres hung from a headrail, drawn across part of the window, the
  // rest stacked at the side; a bead chain along their feet
  // (no daylight wash on the wall above the glass: it is the same wall as the stretches
  // between the windows, and a paler band over each window read as a different material)
  box(g, x0, G.top - 2.4, x1 - x0, 2.4, P.frameLt, P.ink, LWF);
  const cover = Math.max(6, (x1 - x0) * b.blinds);
  const slat = b.blinds > 0 ? 2.6 : 1.4;
  const step = b.blinds > 0 ? 4.2 : 1.6;
  for (let x = x0 + 0.4; x < x0 + cover - 0.5; x += step) {
    box(g, x, G.top, slat, gh - 1, P.blind);
    line(g, x + slat, G.top, x + slat, G.top + gh - 1, P.blindDk, 0.5);
  }
  line(g, x0, G.top + gh - 3, x0 + cover, G.top + gh - 3, P.blindDk, 0.4);
  box(g, x0, G.top, cover, gh - 1, null, P.ink, 0.35);
  // A few compact radiators under each long glass run. Repeating one below
  // every narrow window made them read as a row of air conditioners.
  box(g, x0 - 1, G.bottom, x1 - x0 + 2, 3.2, P.sill, P.ink, LW);
  box(g, x0, G.bottom + 3.2, x1 - x0, 1.6, P.wallShade);
  const rn = Math.max(1, Math.round((x1 - x0) / 190));
  const rp = (x1 - x0) / rn;
  for (let i = 0; i < rn; i++) radiator(g, x0 + i * rp + 12, Math.min(42, rp - 24), P);
}

function radiator(g, x, w, P) {
  const y0 = 174;
  const y1 = 195;
  box(g, x, y0, w, y1 - y0, P.radiator, P.ink, LWF);
  g.beginPath();
  for (let y = y0 + 2.5; y < y0 + 12; y += 2.2) { g.moveTo(x + 3, y); g.lineTo(x + w - 14, y); }
  pen(g, P.radLine, 0.55);
  g.stroke();
  box(g, x + w - 11, y0 + 3, 8, 9, '#c9c0ad', P.ink, 0.35);
  circ(g, x + w - 7, y0 + 7.5, 2, '#e8e2d4', P.ink, 0.3);
  line(g, x + w - 7, y0 + 7.5, x + w - 6, y0 + 6, M89.pink, 0.5);
  box(g, x, y1 - 3, w, 3, '#2a2833', P.ink, LWF);
}

function openColumn(g, x, w, P, F) {
  box(g, x, F.ceilingY, w, WALL_BASE - F.ceilingY, P.column, P.ink, LW);
  lines(g, [x + 1.8, F.ceilingY + 2, x + 1.8, WALL_BASE - 8, x + w - 1.8, F.ceilingY + 2, x + w - 1.8, WALL_BASE - 8], P.columnDk, 0.55);
  box(g, x, 165.5, w, 3, P.rail, P.ink, LWF);
  box(g, x - 0.5, 197, w + 1, 7, P.skirting, P.ink, LW);
  // a switch plate on some of them
  if (Math.round(mod(x, F.wall.period)) % 3 === 0) box(g, x + w / 2 - 2, 128, 4, 6, '#eeeadc', P.ink, LWF);
}

function steelLift(g, h, P, wood = false) {
  const { x, y, w } = h;
  const hh = h.h;
  const surround = wood ? P.woodDk : P.steelDk;
  box(g, x - 4, y - 4, w + 8, hh + 4, surround, P.ink, LW);
  box(g, x - 1.5, y - 1.5, w + 3, hh + 1.5, wood ? P.brassDk : P.steel, P.ink, LWF);
  box(g, x, y, w, hh, P.carLit, P.ink, LWF);
  poly(g, [x, y, x + 5, y + 5, x + 5, y + hh - 6, x, y + hh], P.carSide, P.ink, LWF);
  poly(g, [x + w, y, x + w - 5, y + 5, x + w - 5, y + hh - 6, x + w, y + hh], P.carSide, P.ink, LWF);
  poly(g, [x, y + hh, x + 5, y + hh - 6, x + w - 5, y + hh - 6, x + w, y + hh], P.carFloor, P.ink, LWF);
  // the indicator panel
  box(g, x + w / 2 - 8, y - 13, 16, 8, wood ? P.brass : '#2e3036', P.ink, LWF);
  // call buttons (a bank of lifts shares one panel: `buttons: false`)
  if (h.buttons === false) return;
  box(g, x + w + 6, y + hh * 0.46, 3, 7, wood ? P.brass : P.steelLt, P.ink, LWF);
  // floor 88 is the top floor: a down button only
  if (wood) circ(g, x + w + 7.5, y + hh * 0.46 + 3.5, 0.9, '#f6ecd0', P.ink, 0.25);
  else {
    circ(g, x + w + 7.5, y + hh * 0.46 + 2, 0.8, '#f6ecd0', P.ink, 0.25);
    circ(g, x + w + 7.5, y + hh * 0.46 + 5, 0.8, '#f6ecd0', P.ink, 0.25);
  }
}

function whiteboard(g, h, P) {
  const { x, y, w } = h;
  const hh = h.h;
  box(g, x + 1, y + 1.2, w, hh, P.wallShade);
  box(g, x, y, w, hh, P.frame, P.ink, LW);
  box(g, x + 2, y + 2, w - 4, hh - 4, '#f8f8f1', P.ink, LWF);
  // axes, bars, and the line that only goes up
  const ax = x + 12;
  const ay = y + hh - 10;
  lines(g, [ax, y + 9, ax, ay, ax, ay, x + w - 8, ay], '#3a5aa8', 0.6);
  const bars = [6, 9, 8, 13, 18, 25];
  bars.forEach((v, k) => box(g, ax + 5 + k * 11, ay - v, 6, v, null, '#3c8a5a', 0.55));
  g.beginPath();
  g.moveTo(ax + 3, ay - 6);
  [[14, -9], [25, -8], [36, -15], [47, -19], [58, -26], [70, -36]].forEach(([dx, dy]) => g.lineTo(ax + dx, ay + dy));
  pen(g, '#c8433a', 0.8);
  g.stroke();
  poly(g, [ax + 70, ay - 36, ax + 66, ay - 35.5, ax + 69, ay - 32], '#c8433a', '#c8433a', 0.4);
  letters(g, 'GROWTH!', x + 15, y + 11, 4.2, { ink: '#c8433a', lw: 0.6, slant: 0.1 });
  letters(g, 'BASED ON VIBES', x + w - 4, y + 10, 2, { ink: '#c8433a', lw: 0.35, align: 'right', track: 0.35 });
  letters(g, 'Q1 Q2 Q3 Q4', ax + 33, ay + 6, 2.6, { ink: '#3a5aa8', lw: 0.4, align: 'center' });
  // the tray: markers and an eraser
  box(g, x + 4, y + hh - 1, w - 8, 2.2, P.frame, P.ink, LWF);
  [['#c8433a', 18], ['#3a5aa8', 26], ['#3c8a5a', 33]].forEach(([c, dx]) => { box(g, x + dx, y + hh - 2.6, 6, 1.6, '#eeeee6', P.ink, 0.3); box(g, x + dx, y + hh - 2.6, 1.6, 1.6, c); });
  box(g, x + w - 22, y + hh - 3.4, 9, 2.4, '#3d3f48', P.ink, 0.3);
}

// The drawn width of `letters(g, text, …, size, { weight: 600, track })`.
function measureLetters(g, text, size, track) {
  g.save();
  g.font = `600 ${size * 1.18}px ${OFFICE_FONT}`;
  if ('letterSpacing' in g) g.letterSpacing = `${size * 0.06 + track * size / 6}px`;
  const w = g.measureText(text).width || text.length * size * 0.7;
  g.restore();
  return w;
}
const POSTER_DESIGN = { w: 32, h: 42 };
const KITTEN_DESIGN = { w: 32, h: 46 };
// The black-bordered motivational print every office had: a photo, a title in spaced capitals,
// and a line underneath that undercuts it.
const CLASSIC_POSTERS = {
  TEAMWORK: 'BLAME IS SHARED',
  SUCCESS: 'SOMEONE ELSE\'S',
  LEADERSHIP: 'FOLLOW THE ONE IN FRONT',
  EXCELLENCE: 'CANCELLED: BUDGET',
  INNOVATION: 'IF NOTHING CHANGES',
  PERSEVERANCE: 'ONLY 40 YEARS TO GO',
  OPPORTUNITY: 'UNPAID, OF COURSE',
};
function classicPoster(g, ix, iy, iw, ih, label, sub) {
  box(g, ix, iy, iw, ih, '#121117');
  const px = ix + 3, py = iy + 3, pw = iw - 6, ph = ih * 0.6;
  g.save();
  g.beginPath();
  g.rect(px, py, pw, ph);
  g.clip();
  if (label === 'TEAMWORK') {
    // a rowing eight at dawn
    box(g, px, py, pw, ph, '#f2b27a');
    box(g, px, py + ph * 0.55, pw, ph * 0.45, '#3f6f8f');
    circ(g, px + pw * 0.7, py + ph * 0.5, 4, '#ffe2a8');
    box(g, px + 2, py + ph * 0.62, pw - 4, 1.6, '#1b1a22');
    for (let k = 0; k < 5; k++) {
      const rx = px + 4 + k * (pw - 8) / 4;
      circ(g, rx, py + ph * 0.5, 0.9, '#1b1a22');
      line(g, rx, py + ph * 0.52, rx, py + ph * 0.62, '#1b1a22', 0.8);
      line(g, rx, py + ph * 0.58, rx - 3, py + ph * 0.8, '#1b1a22', 0.4);
    }
  } else if (label === 'SUCCESS') {
    // a climber planting a flag on the summit
    box(g, px, py, pw, ph, '#8fc4e8');
    poly(g, [px, py + ph, px + pw * 0.5, py + ph * 0.28, px + pw, py + ph], '#5b6475');
    poly(g, [px + pw * 0.38, py + ph * 0.46, px + pw * 0.5, py + ph * 0.28, px + pw * 0.62, py + ph * 0.46, px + pw * 0.5, py + ph * 0.4], '#f4f6fa');
    line(g, px + pw * 0.5, py + ph * 0.28, px + pw * 0.5, py + ph * 0.08, '#1b1a22', 0.5);
    poly(g, [px + pw * 0.5, py + ph * 0.08, px + pw * 0.66, py + ph * 0.12, px + pw * 0.5, py + ph * 0.17], '#e2483e');
    circ(g, px + pw * 0.44, py + ph * 0.21, 0.9, '#1b1a22');
    line(g, px + pw * 0.44, py + ph * 0.23, px + pw * 0.45, py + ph * 0.3, '#1b1a22', 0.8);
  } else if (label === 'EXCELLENCE') {
    // an eagle soaring over the peaks
    box(g, px, py, pw, ph, '#9fc9e6');
    poly(g, [px, py + ph, px + pw * 0.25, py + ph * 0.6, px + pw * 0.45, py + ph * 0.8, px + pw * 0.7, py + ph * 0.5, px + pw, py + ph], '#6f7f97');
    const ex = px + pw * 0.5, ey = py + ph * 0.35;
    poly(g, [ex - 9, ey - 2, ex - 2, ey + 1, ex, ey - 0.5, ex + 2, ey + 1, ex + 9, ey - 2, ex + 3, ey + 2.6, ex, ey + 3.4, ex - 3, ey + 2.6], '#3a2c22');
    circ(g, ex, ey - 0.8, 1.1, '#f4f1ea');
  } else if (label === 'INNOVATION') {
    // a lit bulb on a dark ground
    box(g, px, py, pw, ph, '#26314d');
    circ(g, px + pw * 0.5, py + ph * 0.42, 9, 'rgba(255,230,140,0.25)');
    circ(g, px + pw * 0.5, py + ph * 0.42, 5.4, '#ffe58a', '#1b1a22', 0.4);
    box(g, px + pw * 0.5 - 2.6, py + ph * 0.42 + 4.6, 5.2, 4.4, '#b9bcc8', '#1b1a22', 0.35);
    lines(g, [px + pw * 0.5 - 1.4, py + ph * 0.42 + 1.6, px + pw * 0.5, py + ph * 0.42 - 1.4, px + pw * 0.5, py + ph * 0.42 - 1.4, px + pw * 0.5 + 1.4, py + ph * 0.42 + 1.6], '#c9862a', 0.5);
  } else if (label === 'PERSEVERANCE') {
    // a lighthouse holding out against the waves
    box(g, px, py, pw, ph, '#5d6b8a');
    box(g, px, py + ph * 0.72, pw, ph * 0.28, '#2f4a6b');
    poly(g, [px + pw * 0.44, py + ph * 0.75, px + pw * 0.47, py + ph * 0.3, px + pw * 0.57, py + ph * 0.3, px + pw * 0.6, py + ph * 0.75], '#f1ece0', '#1b1a22', 0.35);
    box(g, px + pw * 0.455, py + ph * 0.42, pw * 0.13, ph * 0.06, '#d24a4a');
    box(g, px + pw * 0.465, py + ph * 0.22, pw * 0.11, ph * 0.08, '#ffe58a', '#1b1a22', 0.3);
    poly(g, [px + pw * 0.57, py + ph * 0.24, px + pw, py + ph * 0.12, px + pw, py + ph * 0.34], 'rgba(255,240,180,0.35)');
    squiggle(g, px, px + pw, py + ph * 0.74, 1.2, 4, '#e8f1f7', 0.6);
  } else if (label === 'OPPORTUNITY') {
    // a door standing open on a sunny field
    box(g, px, py, pw, ph, '#a9d8ef');
    box(g, px, py + ph * 0.7, pw, ph * 0.3, '#7fc27a');
    box(g, px + pw * 0.36, py + ph * 0.22, pw * 0.28, ph * 0.52, '#fff4c2', '#1b1a22', 0.4);
    poly(g, [px + pw * 0.64, py + ph * 0.22, px + pw * 0.76, py + ph * 0.28, px + pw * 0.76, py + ph * 0.8, px + pw * 0.64, py + ph * 0.74], '#a9714a', '#1b1a22', 0.35);
    circ(g, px + pw * 0.73, py + ph * 0.52, 0.6, '#f2c94c');
  } else {
    // geese in a V across a sunset
    box(g, px, py, pw, ph, '#f0a46c');
    box(g, px, py + ph * 0.5, pw, ph * 0.5, '#d9786a');
    box(g, px, py + ph * 0.82, pw, ph * 0.18, '#5b4a66');
    for (let k = -3; k <= 3; k++) {
      const gx = px + pw * 0.5 + k * 3.4, gy = py + ph * 0.3 + Math.abs(k) * 2.2;
      lines(g, [gx - 1.4, gy - 0.6, gx, gy, gx, gy, gx + 1.4, gy - 0.6], '#1b1a22', 0.5);
    }
  }
  g.restore();
  box(g, px, py, pw, ph, null, '#d8d2c4', 0.35);
  const fit = (text, size, track) => Math.min(size, (iw - 4) * size / measureLetters(g, text, size, track));
  const s1 = fit(label, 4.2, 0.9), s2 = fit(sub, 2.2, 0.3);
  letters(g, label, ix + iw / 2, py + ph + 6.4, s1, { ink: '#f4efe2', lw: s1 * 0.12, weight: 600, align: 'center', track: 0.9 });
  letters(g, sub, ix + iw / 2, py + ph + 11.6, s2, { ink: '#c9c1ae', lw: s2 * 0.12, weight: 600, align: 'center', track: 0.3 });
}
function poster(g, h, P) {
  // Posters are drawn on their design grid (32 x 42; the kitten 32 x 46, its caption below it)
  // and scaled to the size they hang at.
  const D = h.label === 'HANG IN THERE' ? KITTEN_DESIGN : POSTER_DESIGN;
  if (h.w !== D.w || h.h !== D.h) {
    g.save();
    g.translate(h.x, h.y);
    g.scale(h.w / D.w, h.h / D.h);
    poster(g, { ...h, x: 0, y: 0, ...D }, P);
    g.restore();
    return;
  }
  const { x, y, w, label } = h;
  const hh = h.h;
  box(g, x + 1, y + 1.2, w, hh, P.wallShade || 'rgba(0,0,0,0.1)');
  box(g, x, y, w, hh, '#1b1a22', P.ink, LW);
  const ix = x + 1.4;
  const iy = y + 1.4;
  const iw = w - 2.8;
  const ih = hh - 2.8;
  g.save();
  g.beginPath();
  g.rect(ix, iy, iw, ih);
  g.clip();
  if (label === 'SYNERGY') {
    grid(g, ix, iy, iw, ih, 3.4, '#ffffff', '#1b1a22', 0.35);
    circ(g, ix + iw * 0.38, iy + ih * 0.36, iw * 0.24, M89.pink, P.ink, LWF);
    poly(g, [ix + iw * 0.42, iy + ih * 0.62, ix + iw * 0.66, iy + ih * 0.12, ix + iw * 0.9, iy + ih * 0.62], M89.teal, P.ink, LWF);
    squiggle(g, ix + 2, ix + iw - 2, iy + ih * 0.7, 1.2, 4, '#1b1a22', 0.7);
    box(g, ix, iy + ih - 9, iw, 9, M89.lemon, P.ink, LWF);
    letters(g, 'SYNERGY', ix + iw / 2, iy + ih - 2.4, 4, { ink: '#1b1a22', lw: 0.62, align: 'center', track: 0.7, slant: 0.18 });
    letters(g, 'ASK SOMEONE ELSE', ix + iw / 2, iy + 5.2, 1.6, { ink: '#1b1a22', lw: 0.3, align: 'center', track: 0.25 });
  } else if (CLASSIC_POSTERS[label]) {
    classicPoster(g, ix, iy, iw, ih, label, h.sub || CLASSIC_POSTERS[label]);
  } else if (label === 'HANG IN THERE') {
    box(g, ix, iy, iw, ih, h.bg || '#cdb9ef');
    // Keep the poster confetti behind the figure.
    confetti(g, ix, iy + 8, iw, 12, 6, 31, [M89.pink, M89.teal, M89.lemon], 1.4, 0.5);
    // The branch belongs behind the paws: the kitten is holding on, not floating
    // underneath it.
    g.beginPath();
    g.moveTo(ix, iy + 5.4);
    g.quadraticCurveTo(ix + iw * 0.5, iy + 3.6, ix + iw, iy + 6.6);
    pen(g, '#6b4a30', 1.2);
    g.stroke();
    const kx = ix + iw * 0.5;
    // The whole kitten, paws to toes, fits above the caption band.
    g.save();
    g.translate(kx, iy);
    g.scale(0.62, 0.62);
    g.translate(-kx, -iy);
    const fur = '#858a98';
    const furLight = '#b8bac5';
    const furDark = '#686d7b';
    const outline = '#444653';
    const headY = iy + 16.8;
    const bodyY = iy + 31.5;

    // Tail and hind legs sit behind the body, with a relaxed hooked tail.
    g.beginPath();
    g.moveTo(kx + 4.2, bodyY + 2);
    g.bezierCurveTo(kx + 10.8, bodyY + 4.8, kx + 10, bodyY + 12.5, kx + 5.7, bodyY + 12.3);
    pen(g, outline, 3.9);
    g.stroke();
    g.beginPath();
    g.moveTo(kx + 4.2, bodyY + 2);
    g.bezierCurveTo(kx + 10.8, bodyY + 4.8, kx + 10, bodyY + 12.5, kx + 5.7, bodyY + 12.3);
    pen(g, fur, 2.7);
    g.stroke();
    g.beginPath();
    g.moveTo(kx - 3.5, bodyY + 7.2);
    g.quadraticCurveTo(kx - 5.8, bodyY + 10.8, kx - 4.1, bodyY + 13.3);
    pen(g, outline, 3.5);
    g.stroke();
    g.beginPath();
    g.moveTo(kx - 3.5, bodyY + 7.2);
    g.quadraticCurveTo(kx - 5.8, bodyY + 10.8, kx - 4.1, bodyY + 13.3);
    pen(g, fur, 2.4);
    g.stroke();
    ell(g, kx - 3.7, bodyY + 13.1, 2.2, 1.5, fur, outline, 0.45);
    g.beginPath();
    g.moveTo(kx + 3.5, bodyY + 7.2);
    g.quadraticCurveTo(kx + 5.8, bodyY + 10.8, kx + 4.1, bodyY + 13.3);
    pen(g, outline, 3.5);
    g.stroke();
    g.beginPath();
    g.moveTo(kx + 3.5, bodyY + 7.2);
    g.quadraticCurveTo(kx + 5.8, bodyY + 10.8, kx + 4.1, bodyY + 13.3);
    pen(g, fur, 2.4);
    g.stroke();
    ell(g, kx + 3.7, bodyY + 13.1, 2.2, 1.5, fur, outline, 0.45);

    // Arms reach up from the shoulders and curl over the wood in two visible paws.
    // Arms reach up and out from the shoulders, well clear of the ears.
    for (const side of [-1, 1]) {
      g.beginPath();
      g.moveTo(kx + side * 4.2, iy + 24.2);
      g.quadraticCurveTo(kx + side * 7.4, iy + 17, kx + side * 8.6, iy + 8.2);
      pen(g, outline, 3.7);
      g.stroke();
      g.beginPath();
      g.moveTo(kx + side * 4.2, iy + 24.2);
      g.quadraticCurveTo(kx + side * 7.4, iy + 17, kx + side * 8.6, iy + 8.2);
      pen(g, fur, 2.6);
      g.stroke();
      ell(g, kx + side * 8.8, iy + 7.2, 2.15, 1.8, fur, outline, 0.5);
      // Toe arcs make the grip clear at poster size.
      g.beginPath();
      g.moveTo(kx + side * 7.8, iy + 6.3);
      g.quadraticCurveTo(kx + side * 8.7, iy + 4.7, kx + side * 9.6, iy + 6.1);
      pen(g, furLight, 0.55);
      g.stroke();
    }

    // A larger hanging body, with a pale bib and soft shoulder highlight.
    ell(g, kx, bodyY, 6.6, 10.7, fur, outline, 0.65, -0.06);
    ell(g, kx - 0.35, bodyY + 0.8, 3.7, 7.2, '#d4d1db', null, 0, -0.04);
    ell(g, kx - 2.4, bodyY - 5.2, 1.5, 3.3, furLight, null, 0, -0.18);

    // Head, tall ears, and inner-ear color give the silhouette a real cat shape.
    // Pointed ears on top of the head, splayed clear of the raised arms.
    for (const side of [-1, 1]) {
      poly(g, [kx + side * 1.0, headY - 4.6, kx + side * 3.6, headY - 8.8, kx + side * 4.8, headY - 2.4], fur, outline, 0.6);
      poly(g, [kx + side * 1.9, headY - 4.4, kx + side * 3.5, headY - 7.4, kx + side * 4.2, headY - 3.2], '#e2a3b4', null, 0);
    }
    ell(g, kx, headY, 5.25, 5.7, fur, outline, 0.65);
    ell(g, kx - 3.45, headY + 2.2, 1.65, 1.65, furLight, null, 0);
    ell(g, kx + 3.45, headY + 2.2, 1.65, 1.65, furLight, null, 0);
    ell(g, kx - 1.75, headY - 0.55, 1.25, 1.65, '#f3edce', outline, 0.24);
    ell(g, kx + 1.75, headY - 0.55, 1.25, 1.65, '#f3edce', outline, 0.24);
    ell(g, kx - 1.7, headY - 0.35, 0.66, 1.15, '#6c957d', null, 0);
    ell(g, kx + 1.7, headY - 0.35, 0.66, 1.15, '#6c957d', null, 0);
    ell(g, kx - 1.7, headY - 0.28, 0.28, 0.83, '#272731', null, 0);
    ell(g, kx + 1.7, headY - 0.28, 0.28, 0.83, '#272731', null, 0);
    circ(g, kx - 1.9, headY - 0.9, 0.28, '#ffffff');
    circ(g, kx + 1.5, headY - 0.9, 0.28, '#ffffff');
    lines(g, [kx - 0.7, headY - 4.2, kx - 0.25, headY - 3.2, kx + 0.05, headY - 4.25, kx + 0.35, headY - 3.2, kx + 0.75, headY - 4.1, kx + 0.62, headY - 3.1], furDark, 0.65);
    ell(g, kx - 1.2, headY + 2.05, 1.75, 1.35, '#e5e1e8', null, 0);
    ell(g, kx + 1.2, headY + 2.05, 1.75, 1.35, '#e5e1e8', null, 0);
    poly(g, [kx - 0.65, headY + 1.55, kx + 0.65, headY + 1.55, kx, headY + 2.35], '#b97988', outline, 0.28);
    line(g, kx, headY + 2.25, kx, headY + 2.8, outline, 0.38);
    g.beginPath();
    g.moveTo(kx, headY + 2.8);
    g.quadraticCurveTo(kx - 1.1, headY + 3.6, kx - 1.75, headY + 2.95);
    g.moveTo(kx, headY + 2.8);
    g.quadraticCurveTo(kx + 1.1, headY + 3.6, kx + 1.75, headY + 2.95);
    pen(g, outline, 0.4);
    g.stroke();
    lines(g, [kx - 2.4, headY + 2.1, kx - 5.6, headY + 1.3, kx - 2.5, headY + 2.8, kx - 5.5, headY + 3.2, kx + 2.4, headY + 2.1, kx + 5.6, headY + 1.3, kx + 2.5, headY + 2.8, kx + 5.5, headY + 3.2], furDark, 0.38);

    // Fine wood grain and a soft top edge keep the grip grounded in the scene.
    line(g, ix + 7, iy + 6.25, ix + iw * 0.33, iy + 5.45, '#9a775e', 0.3);
    line(g, ix + iw * 0.69, iy + 6.15, ix + iw - 6, iy + 8.05, '#9a775e', 0.3);
    g.restore();
    // Both lines fit inside the frame with a margin, on a band below the kitten.
    const fit = (text, size, track) => Math.min(size, (iw - 4) * size / measureLetters(g, text, size, track));
    const sub = h.sub || 'UNTIL FRIDAY';
    const s1 = fit('HANG IN', 5.2, 0.55), s2 = fit(sub, 4.2, 0.36);
    box(g, ix, iy + ih - 15, iw, 15, 'rgba(255,255,255,0.7)');
    letters(g, 'HANG IN', ix + iw / 2, iy + ih - 10, s1, { ink: '#1b1a22', lw: s1 * 0.14, weight: 600, align: 'center', track: 0.55 });
    letters(g, sub, ix + iw / 2, iy + ih - 3, s2, { ink: '#1b1a22', lw: s2 * 0.14, weight: 600, align: 'center', track: 0.36 });
  } else {
    box(g, ix, iy, iw, ih, M89.teal);
    circ(g, ix + iw * 0.7, iy + ih * 0.28, iw * 0.2, M89.pink, P.ink, LWF);
    const wy = iy + ih * 0.6;
    box(g, ix, wy, iw, ih * 0.4, '#7fd6cc');
    poly(g, [ix + 2, wy - 1, ix + iw - 2, wy - 1, ix + iw - 5, wy + 1.4, ix + 4, wy + 1.4], '#1b1a22', P.ink, 0.35);
    for (let k = 0; k < 4; k++) {
      const rx = ix + 6 + (k * (iw - 12)) / 3;
      circ(g, rx, wy - 4.6, 1.2, '#1b1a22');
      box(g, rx - 0.9, wy - 3.6, 1.8, 2.6, '#1b1a22');
      line(g, rx + 0.5, wy - 2.4, rx - 4, wy + 3, '#1b1a22', 0.5);
    }
    squiggle(g, ix + 2, ix + iw - 2, wy + 4.4, 0.9, 4, '#ffffff', 0.5);
    letters(g, 'CREDIT UPSTAIRS', ix + iw / 2, iy + ih - 3.6, 2.15, { ink: '#ffffff', lw: 0.4, align: 'center', track: 0.35, slant: 0.18 });
  }
  g.restore();
}

function meetingDoor(g, h, P) {
  const { x, y, w } = h;
  const hh = h.h;
  box(g, x - 3, y - 3, w + 6, hh + 3, P.chrome, P.ink, LW);
  box(g, x, y, w, hh, '#25232e', P.ink, LWF);
  // a glass-block vision panel, the name on a chrome plate over it
  glassBlocks(g, x + 5, y + 14, w - 10, hh * 0.38, { ...P, gb: '#cfe4ec', gbLt: '#eef9fb', gbLine: '#9fbfcc' }, 5.6);
  box(g, x + 3, y + 3, w - 6, 9.6, P.chrome, P.ink, LWF);
  letters(g, 'MEETING 4B', x + w / 2, y + 9.6, 3.3, { ink: '#1b1a22', lw: 0.5, align: 'center', slant: 0.12 });
  box(g, x + w - 7, y + hh * 0.56, 4, 1.6, P.chrome, P.ink, 0.35);
  line(g, x + 3, y + hh * 0.72, x + w - 3, y + hh * 0.72, M89.pink, 0.6);
  box(g, x + w / 2 - 10, y - 11, 20, 6.4, '#1b1a22', P.ink, LWF);
  box(g, x + w / 2 - 8.8, y - 9.9, 17.6, 4.2, '#ff3b5a');
  letters(g, 'IN USE', x + w / 2, y - 6.4, 2.8, { ink: '#fff2f6', lw: 0.42, align: 'center' });
  letters(g, 'NO END TIME', x + w / 2, y + hh * 0.88, 2, { ink: '#f6d6e1', lw: 0.35, align: 'center', track: 0.25 });
  box(g, x + w + 5, y + 30, 4, 6, '#eeeaf2', P.ink, LWF);
  box(g, x + w + 5.3, y + 39, 3.4, 5, '#1b1a22', P.ink, LWF);
  circ(g, x + w + 7, y + 40.5, 0.6, '#6cd06a');
  rbox(g, x - 15, y + 22, 7, 9, 1.5, '#e8e2d4', P.ink, LWF);
  circ(g, x - 11.5, y + 26.5, 2.2, '#d6d0c2', P.ink, 0.3);
  line(g, x - 11.5, y + 26.5, x - 10.3, y + 25, M89.pink, 0.45);
  box(g, x + w / 2 - 9, y - 26, 18, 7, '#2f8a4e', P.ink, LWF);
  letters(g, 'EXIT', x + w / 2, y - 20.6, 3.8, { ink: '#f2f8ee', lw: 0.6, align: 'center' });
}

function extinguisher(g, h, P) {
  const { x, y, w } = h;
  const hh = h.h;
  box(g, x - 1, y + 4, w + 2, 2, '#4a4a50', P.ink, 0.35);
  rbox(g, x, y + 2, w, hh - 2, 2.5, '#d23c30', P.ink, LW);
  box(g, x + 2, y - 1, w - 4, 3.4, '#2e2c2a', P.ink, LWF);
  g.beginPath();
  g.moveTo(x + w - 2, y + 0.5);
  g.quadraticCurveTo(x + w + 3, y + 4, x + w + 1.5, y + 11);
  pen(g, '#2e2c2a', 0.9);
  g.stroke();
  box(g, x + 1.5, y + 7, w - 3, 4.5, '#f2e6d2', P.ink, 0.3);
  letters(g, 'FIRE', x + w / 2, y + 10.3, 2, { ink: '#b52e2a', lw: 0.3, align: 'center' });
  // the call point above it
  box(g, x - 1, y - 18, 8, 8, '#d23c30', P.ink, LWF);
  box(g, x + 1, y - 16, 4, 4, '#f2e6d2', P.ink, 0.3);
}

// THE FIRE ALARM SIGN on floor 23 (Peter, 15 Oct): a call point on the wall with
// a plate beside it telling you not to hit it — on the wall rather than in the
// lane so it moves slowly enough to read, and so office-2's alarms are known.
function alarmSign(g, h, P) {
  const { x, y, w } = h;
  const hh = h.h;
  // The call point, drawn as the lane's own alarm is: red box, white band, white T handle.
  const cw = 13, ch = 16, cy = y + (hh - ch) / 2;
  box(g, x, cy, cw, ch, '#e0203a', P.ink, LW);
  box(g, x + cw - 3, cy + 0.4, 2.6, ch - 0.8, '#a3162c');
  box(g, x + 1.8, cy + 2, cw - 3.6, 2.6, '#ffffff', P.ink, LWF);
  box(g, x + cw / 2 - 0.8, cy + 5.4, 1.6, 4, '#2a2833');
  box(g, x + 3, cy + 9.4, cw - 6, 2.4, '#ffffff', P.ink, 0.35);
  const px = x + cw + 4, pw = w - cw - 4;
  box(g, px + 0.8, y + 1, pw, hh, P.wallShade || 'rgba(0,0,0,0.1)');
  box(g, px, y, pw, hh, '#fbfbf4', P.ink, LW);
  box(g, px + 1.4, y + 1.4, pw - 2.8, hh - 2.8, null, '#d23c30', 0.8);
  letters(g, 'DO NOT HIT', px + pw / 2, y + hh * 0.43, 5, { ink: '#b52e2a', lw: 0.5, align: 'center' });
  letters(g, 'THE FIRE ALARMS', px + pw / 2, y + hh * 0.8, 5, { ink: '#b52e2a', lw: 0.5, align: 'center' });
}

// THE FIRE EXIT on floor 23's back wall by the finish (Peter, 15 Oct): a steel
// door standing open on the stairwell, the green FIRE EXIT sign over it. The
// evacuating floor walks off towards it (room.js setOfficeEvacuation).
function fireExitDoor(g, x, P, base = WALL_BASE, leafOnly = false) {
  const w = 40, h = 74, y = base - h;
  if (leafOnly) {
    // the open door again, over whoever has just walked in behind it
    box(g, x + w - 2, y, 10, h, '#e0203a', P.ink, LW);
    box(g, x + w + 6, y, 2, h, '#a3162c');
    box(g, x + w + 3, y + h * 0.5, 4, 2, '#c9ced8', P.ink, LWF);
    return;
  }
  box(g, x - 3, y - 3, w + 6, h + 3, '#c9ced8', P.ink, LW);
  box(g, x, y, w, h, '#2a2440', P.ink, LWF);
  for (let i = 0; i < 5; i++) {
    const sy = y + h * (0.3 + i * 0.13);
    line(g, x + 2 + i * 4, sy, x + w * 0.62 + i * 4, sy, '#3e3658', 1.4);
  }
  box(g, x + w - 2, y, 10, h, '#e0203a', P.ink, LW);
  box(g, x + w + 6, y, 2, h, '#a3162c');
  box(g, x + w + 3, y + h * 0.5, 4, 2, '#c9ced8', P.ink, LWF);
  const sy = y - 22, sw = 64;
  // the sign is lit, as an emergency exit sign is: a soft green halo on the wall round it
  const gx = x + w / 2, gy = sy + 7;
  const glow = g.createRadialGradient(gx, gy, 4, gx, gy, 52);
  glow.addColorStop(0, 'rgba(120,255,160,0.32)');
  glow.addColorStop(1, 'rgba(120,255,160,0)');
  g.fillStyle = glow;
  g.fillRect(gx - 54, gy - 30, 108, 60);
  box(g, x + w / 2 - sw / 2, sy, sw, 14, '#2f8a4e', P.ink, LW);
  letters(g, 'FIRE EXIT', x + w / 2 + 6, sy + 10.2, 6, { ink: '#f2f8ee', lw: 0.7, align: 'center' });
  const mx = x + w / 2 - sw / 2 + 6, my = sy + 3;
  circ(g, mx + 3.6, my + 1, 1.2, '#f2f8ee');
  lines(g, [mx + 3.2, my + 2.4, mx + 2.2, my + 5.6, mx + 2.2, my + 5.6, mx + 4.4, my + 8.4, mx + 2.2, my + 5.6, mx, my + 8.4,
    mx + 3, my + 3.6, mx + 5.6, my + 4.6, mx + 3, my + 3.6, mx + 0.4, my + 4.4], '#f2f8ee', 0.9);
}

const EXEC_PANEL = 60;
// the height of the panelling's rail: the window sill where the glass stops short of the floor
function execSill(F) {
  return F.glass.bottom < WALL_BASE - 20 ? F.glass.bottom : 150;
}
// Floor 88's wall and windows share one header, one rail and one wainscot, so a run of
// panelling and a run of glass read as the same wall: the cornice tube and its trims run
// straight through, and the rail sits on the window sill.
function execHeader(g, x0, x1, top, P) {
  box(g, x0, top, x1 - x0, 7, P.woodDk, P.ink, LW);
  box(g, x0, top + 5, x1 - x0, 2, P.chrome, P.ink, LWF);
  const tube = new Path2D();
  tube.moveTo(x0, top + 10);
  tube.lineTo(x1, top + 10);
  neon(g, tube, P.neonB, 0.7, 3);
}
function execPanelRow(g, x0, x1, y0, y1, P) {
  const n = Math.max(1, Math.round((x1 - x0) / EXEC_PANEL));
  const pw = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const ix = x0 + i * pw + 2.5;
    const iw = pw - 5;
    box(g, ix, y0, iw, y1 - y0, P.panel, P.ink, LWF);
    box(g, ix, y0, iw, 1.6, P.panelLt);
    box(g, ix + 1.2, y0 + 1.2, iw - 2.4, y1 - y0 - 2.4, null, P.chrome, 0.35);
  }
}
function execRailAndSkirting(g, x0, x1, sill, P) {
  box(g, x0, sill - 1.5, x1 - x0, 4, P.woodLt, P.ink, LWF);
  line(g, x0, sill + 0.5, x1, sill + 0.5, M89.pink, 0.5);
  box(g, x0, 196, x1 - x0, 8, P.woodDk, P.ink, LW);
  line(g, x0, 197.5, x1, 197.5, P.chrome, 0.6);
}
function execPanels(g, x0, x1, P, F) {
  const top = F.ceilingY;
  const sill = execSill(F);
  box(g, x0, top, x1 - x0, WALL_BASE - top, P.wood);
  // the cornice tube washes the suede under it teal, in two flat steps
  box(g, x0, top + 10, x1 - x0, 22, 'rgba(63,224,208,0.07)');
  box(g, x0, top + 10, x1 - x0, 10, 'rgba(63,224,208,0.08)');
  execPanelRow(g, x0, x1, Math.max(top + 13, F.glass.top), sill - 4, P);
  execPanelRow(g, x0, x1, sill + 5, 193, P);
  execHeader(g, x0, x1, top, P);
  execRailAndSkirting(g, x0, x1, sill, P);
}
// The solid wall above the native cornice, in the floor's own finish: floor 88's raised panels,
// the lobby's flecked granite slabs; floor 23 is plain plaster and needs nothing more.
// It lines up with the windows beside it: `glassTop` is the windows' top edge and `bars` their
// transom bars (every 90 up from `barBase`), so panel rows and slab joints meet the glazing's lines.
function upperWall(ctx, floor, P, x0, x1, y0, y1, u0, glassTop = y0, barBase = y1) {
  if (y1 - y0 < 6) return;
  const bars = [];
  for (let y = barBase - 90; y > glassTop + 8; y -= 90) if (y < y1 - 8) bars.push(y);
  if (floor === 'exec') {
    // one row of panels per pane of glass: from the window head down to the cornice, split at
    // each transom bar
    // (the top row starts at the window head even where the ceiling trim then covers its edge)
    const edges = [glassTop, ...bars.slice().reverse(), y1];
    for (let i = 0; i + 1 < edges.length; i++) {
      const a = edges[i] + (i ? 2.5 : 0), b = edges[i + 1] - (i + 2 < edges.length ? 2.5 : 0);
      if (b - a > 6) execPanelRow(ctx, x0, x1, a, b, P);
    }
  } else if (floor === 'lobby') {
    // flecks scattered from the cornice up, fixed to the slab, so they don't swim as it grows
    const w = x1 - x0, H = 600;
    const seed = Math.round(u0);
    for (let k = 0; k < Math.round(w * H / 60); k++) {
      const py = y1 - hash(seed * 0.29 + k * 5.71) * H;
      if (py < y0) continue;
      ctx.fillStyle = P.fleck[k % 3];
      ctx.fillRect(x0 + hash(seed * 0.13 + k * 3.17) * w, py, 0.7 + (k % 2) * 0.4, 0.7);
    }
    ctx.beginPath();
    // slab courses: one at each transom bar, halved between them, and at the window head
    for (let y = barBase - 45; y > y0; y -= 45) if (y < y1 - 6) { ctx.moveTo(x0, y); ctx.lineTo(x1, y); }
    if (glassTop > y0 && glassTop < y1) { ctx.moveTo(x0, glassTop); ctx.lineTo(x1, glassTop); }
    for (let x = x0 + 46; x < x1 - 4; x += 46) { ctx.moveTo(x, y0); ctx.lineTo(x, y1); }
    pen(ctx, P.wallJoint, 0.55);
    ctx.stroke();
  }
}

function execGlass(g, x0, x1, b, P, F) {
  const G = F.glass;
  const top = F.ceilingY;
  const n = Math.max(1, Math.round((x1 - x0) / G.mullion));
  const pitch = (x1 - x0) / n;
  const gh = G.bottom - G.top;
  box(g, x0, top, x1 - x0, G.top - top, P.wood);
  rake(g, x0, x1, G.top, G.bottom, b.seed, 0.07);
  for (let i = 0; i <= n; i++) {
    box(g, x0 + i * pitch - 0.9, G.top, 1.8, gh, P.frame, P.ink, LWF);
    line(g, x0 + i * pitch - 0.2, G.top + 2, x0 + i * pitch - 0.2, G.bottom - 2, 'rgba(255,150,190,0.45)', 0.4);
  }
  box(g, x0, G.top, x1 - x0, 1.6, P.frame, P.ink, LWF);
  execHeader(g, x0, x1, top, P);
  if (WALL_BASE - G.bottom > 20) {
    // under the sill, the same wainscot as the solid wall
    box(g, x0, G.bottom, x1 - x0, WALL_BASE - G.bottom, P.wood);
    execPanelRow(g, x0, x1, G.bottom + 5, 193, P);
    execRailAndSkirting(g, x0, x1, G.bottom, P);
  } else {
    box(g, x0, G.bottom, x1 - x0, WALL_BASE - G.bottom, P.woodDk, P.ink, LW);
    line(g, x0, G.bottom + 1.2, x1, G.bottom + 1.2, P.brass, 0.6);
  }
}

function execColumn(g, x, w, P, F) {
  box(g, x, F.ceilingY, w, WALL_BASE - F.ceilingY, P.column, P.ink, LW);
  box(g, x + 3, F.ceilingY + 10, w - 6, WALL_BASE - F.ceilingY - 22, P.columnDk, P.ink, LWF);
  for (const y of [F.ceilingY + 6, 148, 194]) box(g, x - 1, y, w + 2, 3, P.brass, P.ink, LWF);
}

const PROF = {
  skin: '#eec9a8', skinDk: '#e0b68e', stubble: '#dcbc9e', chin: '#e6e1dc',
  tones: [['#dfe2ea', '#c6cbd9'], ['#cdd3e0', '#b1b9ca'], ['#bcc3d2', '#a0a8bb']],
  stache: '#cdd3e0', rim: '#3d3d48', lens: '#c8e0f8', cape: '#23232e', capeIn: '#b8202a', shirt: '#eceef4',
};

const PROF_MANE = {
  back: [[-158, 0.85, 15, 14], [-172, 0.7, 13, 18], [166, 0.62, 14, 26], [148, 0.5, 15, 30],
    [-26, 0.8, 14, -16], [-8, 0.72, 13, -20], [12, 0.6, 14, -26], [32, 0.48, 15, -30]],
  front: [[-128, 1.05, 19, 22], [-104, 1.18, 18, 20], [-80, 1.0, 17, 16], [-58, 0.82, 17, 10],
    [-146, 0.62, 14, 26], [-38, 0.56, 14, 8]],
};

function profHeadPath(g, cx, cy, rx, ry, taper = 0.7, widest = -0.16) {
  const wy = cy + ry * widest;
  const top = cy - ry;
  const bot = cy + ry;
  const k = 0.56;
  g.moveTo(cx, top);
  g.bezierCurveTo(cx + rx * k, top, cx + rx, wy - (wy - top) * k, cx + rx, wy);
  g.bezierCurveTo(cx + rx, wy + (bot - wy) * k * 0.92, cx + rx * taper * 0.9, bot - (bot - wy) * 0.1, cx, bot);
  g.bezierCurveTo(cx - rx * taper * 0.9, bot - (bot - wy) * 0.1, cx - rx, wy + (bot - wy) * k * 0.92, cx - rx, wy);
  g.bezierCurveTo(cx - rx, wy - (wy - top) * k, cx - rx * k, top, cx, top);
  g.closePath();
}

// The founder in two parts so a piece of art can pose him: the cape and collar, then the head.
function professorBody(g, cx, hy, s, ink, pal = PROF) {
  const lw = 0.42;
  const fine = 0.32;
  // the cape's collar standing up behind him, black without, red within
  for (const sd of [-1, 1]) {
    g.beginPath();
    g.moveTo(cx + sd * 6 * s, hy + 12.5 * s);
    g.quadraticCurveTo(cx + sd * 13.5 * s, hy + 9 * s, cx + sd * 17 * s, hy - 3.5 * s);
    g.quadraticCurveTo(cx + sd * 20 * s, hy + 5 * s, cx + sd * 18.4 * s, hy + 16 * s);
    g.closePath();
    fs(g, pal.cape, ink, lw);
    g.beginPath();
    g.moveTo(cx + sd * 7 * s, hy + 12.6 * s);
    g.quadraticCurveTo(cx + sd * 13.2 * s, hy + 9.4 * s, cx + sd * 16.2 * s, hy - 0.8 * s);
    g.quadraticCurveTo(cx + sd * 17.8 * s, hy + 6 * s, cx + sd * 16.2 * s, hy + 14.6 * s);
    g.closePath();
    fs(g, pal.capeIn, ink, fine);
  }
  // the cape over his shoulders
  ell(g, cx, hy + 21.5 * s, 16.5 * s, 9.5 * s, pal.cape, ink, lw);
  line(g, cx - 11 * s, hy + 19 * s, cx - 8 * s, hy + 26 * s, '#3a3a4a', 0.5);
  line(g, cx + 11 * s, hy + 19 * s, cx + 8 * s, hy + 26 * s, '#3a3a4a', 0.5);
  // the neck and the collar's two white points
  box(g, cx - 2.6 * s, hy + 7 * s, 5.2 * s, 6 * s, pal.skinDk, ink, fine);
  for (const sd of [-1, 1]) {
    poly(g, [cx + sd * 1.2 * s, hy + 12.6 * s, cx + sd * 8.4 * s, hy + 12 * s, cx + sd * 5 * s, hy + 18.5 * s], pal.shirt, ink, fine);
  }
}

// `o`: mouth ('frown' | 'shout' | 'grin' | 'smirk'), look (-1..1, where the pupils go),
// skinFx(g, cx, hy, R, RY) painted over the skin inside the head (halftone, hatching).
function professorHead(g, cx, hy, s, ink, pal = PROF, o = {}) {
  const R = 7.4 * s;
  const RY = 9.4 * s;
  const lw = 0.42;
  const fine = 0.32;
  const rad = Math.PI / 180;
  // the mane: a lock is a blade from two roots on the skull out to a curled tip
  const hcx = cx;
  const hcy = hy - RY * 0.12;
  const hrx = R * 0.98;
  const hry = RY * 0.93;
  const lock = ([deg, len, spread, curl], fill) => {
    const px = (d, k) => hcx + Math.cos(d * rad) * hrx * k;
    const py = (d, k) => hcy + Math.sin(d * rad) * hry * k;
    const tip = deg + curl;
    g.beginPath();
    g.moveTo(px(deg - spread, 0.86), py(deg - spread, 0.86));
    g.quadraticCurveTo(px(deg - spread * 0.5, 1 + len * 0.55), py(deg - spread * 0.5, 1 + len * 0.55), px(tip, 1 + len), py(tip, 1 + len));
    g.quadraticCurveTo(px(deg + spread * 1.15, 1 + len * 0.3), py(deg + spread * 1.15, 1 + len * 0.3), px(deg + spread, 0.86), py(deg + spread, 0.86));
    g.closePath();
    fs(g, fill, ink, fine);
  };
  PROF_MANE.back.forEach((l, i) => lock(l, pal.tones[i % 3][1]));
  // ears, the egg of a head
  for (const sd of [-1, 1]) {
    ell(g, cx + sd * R * 0.95, hy + RY * 0.02, R * 0.22, RY * 0.25, pal.skin, ink, fine, sd * 0.28);
    g.beginPath();
    g.ellipse(cx + sd * R * 0.98, hy + RY * 0.02, R * 0.1, RY * 0.12, sd * 0.28, -1.9, 1.5);
    pen(g, 'rgba(120,80,60,0.6)', 0.3);
    g.stroke();
  }
  g.beginPath();
  profHeadPath(g, cx, hy, R, RY);
  fs(g, pal.skin, null, 0);
  // the stubble over the jaw and the pale patch on the chin, inside the head
  g.save();
  g.beginPath();
  profHeadPath(g, cx, hy, R, RY);
  g.clip();
  g.beginPath();
  g.moveTo(cx - R, hy + RY * 0.23);
  g.quadraticCurveTo(cx, hy + RY * 0.5, cx + R, hy + RY * 0.23);
  g.lineTo(cx + R, hy + RY * 1.2);
  g.lineTo(cx - R, hy + RY * 1.2);
  g.closePath();
  g.fillStyle = pal.stubble;
  g.fill();
  g.beginPath();
  g.moveTo(cx - R * 0.45, hy + RY * 0.72);
  g.quadraticCurveTo(cx, hy + RY * 0.92, cx + R * 0.45, hy + RY * 0.72);
  g.lineTo(cx + R * 0.4, hy + RY * 1.1);
  g.lineTo(cx - R * 0.4, hy + RY * 1.1);
  g.closePath();
  g.fillStyle = pal.chin;
  g.fill();
  if (o.skinFx) o.skinFx(g, cx, hy, R, RY);
  g.restore();
  g.beginPath();
  profHeadPath(g, cx, hy, R, RY);
  fs(g, null, ink, lw);
  PROF_MANE.front.forEach((l, i) => lock(l, pal.tones[i % 3][0]));
  // thick angry brows, inner ends down
  for (const sd of [-1, 1]) {
    g.save();
    g.translate(cx + sd * R * 0.42, hy - RY * 0.53);
    g.scale(sd, 1);
    g.rotate(-0.38);
    const bw = R * 0.36;
    const bh = RY * 0.15;
    g.beginPath();
    g.moveTo(-bw, bh * 0.6);
    g.quadraticCurveTo(0, -bh * 1.1, bw, bh * 0.4);
    g.quadraticCurveTo(0, bh * 1.4, -bw, bh * 1.5);
    g.closePath();
    fs(g, '#d0d5e1', ink, 0.4);
    g.restore();
  }
  // the specs: two trapezoid lenses, a bridge, temples back to the ears
  const sy = hy - RY * 0.14;
  const hw = R * 0.4;
  const lh = RY * 0.17;
  const off = R * 0.43;
  for (const sd of [-1, 1]) {
    const lx = cx + sd * off;
    line(g, lx + sd * hw, sy - lh * 0.6, cx + sd * R * 0.97, sy + lh * 0.1, pal.rim, 0.35);
    g.beginPath();
    g.moveTo(lx - sd * hw, sy - lh);
    g.lineTo(lx + sd * hw, sy - lh);
    g.lineTo(lx + sd * hw * 0.82, sy + lh - 0.4);
    g.quadraticCurveTo(lx + sd * hw * 0.78, sy + lh, lx + sd * hw * 0.5, sy + lh);
    g.lineTo(lx - sd * hw * 0.55, sy + lh);
    g.quadraticCurveTo(lx - sd * hw * 0.78, sy + lh, lx - sd * hw * 0.8, sy + lh - 0.4);
    g.closePath();
    fs(g, pal.lens, pal.rim, 0.45);
    circ(g, lx - sd * hw * 0.1 + (o.look || 0) * hw * 0.38, sy + lh * 0.1, 0.62 * s, '#1a1028');
    line(g, lx - hw * 0.55, sy - lh * 0.35, lx - hw * 0.15, sy - lh * 0.35, 'rgba(255,255,255,0.8)', 0.35);
  }
  box(g, cx - off - hw, sy - lh - 0.3, (off + hw) * 2, 0.75, pal.rim);
  // nose, moustache, frown
  ell(g, cx, hy + RY * 0.06, R * 0.15, RY * 0.19, pal.skinDk);
  g.beginPath();
  g.ellipse(cx, hy + RY * 0.06, R * 0.15, RY * 0.19, 0, 0.12 * Math.PI, 0.88 * Math.PI);
  pen(g, 'rgba(120,80,60,0.7)', 0.3);
  g.stroke();
  const my = hy + RY * 0.39;
  const span = R * 0.74;
  const drop = RY * 0.2;
  for (const sd of [-1, 1]) {
    g.beginPath();
    g.moveTo(cx, my - drop * 0.3);
    g.quadraticCurveTo(cx + sd * span * 0.45, my - drop * 0.95, cx + sd * span, my - drop * 0.1);
    g.quadraticCurveTo(cx + sd * span * 1.04, my + drop * 0.9, cx + sd * span * 0.86, my + drop * 1.3);
    g.quadraticCurveTo(cx + sd * span * 0.6, my + drop * 0.5, cx + sd * span * 0.3, my + drop * 0.62);
    g.quadraticCurveTo(cx + sd * span * 0.12, my + drop * 0.72, cx, my + drop * 0.5);
    g.closePath();
    fs(g, pal.stache, ink, fine);
  }
  const mouth = o.mouth || 'frown';
  const my2 = hy + RY * 0.62;
  if (mouth === 'shout') {
    ell(g, cx, my2 + RY * 0.02, R * 0.3, RY * 0.13, '#3a1420', '#3a2a30', 0.35);
    ell(g, cx, my2 + RY * 0.08, R * 0.17, RY * 0.06, '#d0505c');
  } else if (mouth === 'grin') {
    g.beginPath();
    g.moveTo(cx - R * 0.36, my2 - RY * 0.04);
    g.quadraticCurveTo(cx, my2 + RY * 0.2, cx + R * 0.36, my2 - RY * 0.04);
    g.closePath();
    fs(g, '#fffdf8', '#3a2a30', 0.45);
    line(g, cx - R * 0.3, my2 + RY * 0.03, cx + R * 0.3, my2 + RY * 0.03, '#3a2a30', 0.25);
  } else if (mouth === 'smirk') {
    g.beginPath();
    g.moveTo(cx - R * 0.26, my2 + RY * 0.02);
    g.quadraticCurveTo(cx + R * 0.05, my2 + RY * 0.05, cx + R * 0.3, my2 - RY * 0.05);
    pen(g, '#3a2a30', 0.6);
    g.stroke();
  } else {
    line(g, cx - R * 0.26, my2, cx + R * 0.26, my2, '#3a2a30', 0.6);
  }
}

function professor(g, cx, hy, s, ink, pal = PROF) {
  professorBody(g, cx, hy, s, ink, pal);
  professorHead(g, cx, hy, s, ink, pal);
}

// A gallery picture light: a long brass hood on a short arm over the top of the frame, lit along
// its lip, a soft halo on the wall above it, and the warm light it throws down over the picture in
// two flat steps that fade before the foot. Drawn AFTER the picture, since the light lies on it.
const PL_BRASS = '#d7b975', PL_BRASS_DK = '#927041', PL_BRASS_LT = '#ffe9b0';
function pictureLight(g, x, y, w, h, P) {
  const cx = x + w / 2, hw = Math.min(w * 0.34, 15);
  poly(g, [cx - hw, y - 6, cx + hw, y - 6, x + w + 2, y + h * 0.82, x - 2, y + h * 0.82], 'rgba(255,226,170,0.11)');
  poly(g, [cx - hw * 0.8, y - 6, cx + hw * 0.8, y - 6, x + w * 0.86, y + h * 0.5, x + w * 0.14, y + h * 0.5], 'rgba(255,238,200,0.13)');
  ell(g, cx, y - 9, hw + 6, 3.6, 'rgba(255,220,170,0.12)');
  box(g, cx - 1.8, y - 3.4, 3.6, 3, PL_BRASS, P.ink, 0.3);
  line(g, cx, y - 2.6, cx, y - 7.4, PL_BRASS_DK, 0.9);
  rbox(g, cx - hw, y - 10.4, hw * 2, 3.4, 1.5, PL_BRASS, P.ink, 0.4);
  line(g, cx - hw + 1.2, y - 9.6, cx + hw - 1.2, y - 9.6, PL_BRASS_LT, 0.5);
  box(g, cx - hw + 1.4, y - 7.4, hw * 2 - 2.8, 0.9, '#fff3cc');
}

// An Art Deco wall sconce for the executive suite: a brass backplate and a stepped fan of frosted
// glass opening upward, glowing warm, washing a tall flat fan of light up the wall and a short one
// down it.
function decoSconce(g, x, y, P) {
  poly(g, [x - 4, y - 3, x + 4, y - 3, x + 15, y - 46, x - 15, y - 46], 'rgba(255,214,160,0.09)');
  poly(g, [x - 3, y - 3, x + 3, y - 3, x + 8, y - 38, x - 8, y - 38], 'rgba(255,230,190,0.12)');
  poly(g, [x - 3, y + 6, x + 3, y + 6, x + 7, y + 22, x - 7, y + 22], 'rgba(255,214,160,0.08)');
  rbox(g, x - 3, y - 4, 6, 14, 1.2, PL_BRASS, P.ink, 0.4);
  line(g, x, y - 2, x, y + 8, PL_BRASS_DK, 0.5);
  for (const [r, col] of [[9.5, '#f6d08a'], [7, '#ffe6b0'], [4.4, '#fff4d8']]) {
    g.beginPath();
    g.ellipse(x, y, r, r * 0.92, 0, Math.PI, Math.PI * 2);
    g.closePath();
    fs(g, col, P.ink, 0.35);
  }
  for (const a of [-0.6, 0, 0.6]) line(g, x, y, x + Math.sin(a) * 9.2, y - Math.cos(a) * 8.6, PL_BRASS_DK, 0.35);
  box(g, x - 10, y - 0.6, 20, 1.6, PL_BRASS, P.ink, 0.35);
}

function founderPortrait(g, h, P) {
  const { x, y, w } = h;
  const hh = h.h;
  box(g, x + 1.5, y + 2, w, hh, 'rgba(0,0,0,0.25)');
  box(g, x, y, w, hh, P.chrome, P.ink, LW);
  box(g, x + 2, y + 2, w - 4, hh - 4, '#ffffff', P.ink, LWF);
  const ix = x + 5;
  const iy = y + 5;
  const iw = w - 10;
  const ih = hh - 10;
  g.save();
  g.beginPath();
  g.rect(ix, iy, iw, ih);
  g.clip();
  box(g, ix, iy, iw, ih, '#ff7ab4');
  poly(g, [ix, iy + ih * 0.15, ix + iw * 0.55, iy, ix + iw * 0.3, iy, ix, iy], '#b39ae6');
  poly(g, [ix + iw * 0.6, iy + ih, ix + iw, iy + ih * 0.5, ix + iw, iy + ih], '#b39ae6');
  box(g, ix + iw - 6, iy, 3, ih * 0.6, '#141218');
  professor(g, ix + iw / 2, iy + ih * 0.44, 1.12, '#141218', PROF_NAGEL);
  g.restore();
  line(g, x + 2.5, y + 3, x + 2.5, y + hh * 0.5, 'rgba(255,255,255,0.8)', 0.6);
  box(g, x + w / 2 - 17, y + hh + 4, 34, 13, P.chrome, P.ink, LWF);
  box(g, x + w / 2 - 15.6, y + hh + 5.4, 31.2, 10.2, null, P.brassDk, 0.4);
  letters(g, 'FOUNDER', x + w / 2, y + hh + 11.2, 4.2, { ink: '#1b1a22', lw: 0.6, align: 'center', slant: 0.12 });
  letters(g, 'DON K. EGGSHELL PH.D.', x + w / 2, y + hh + 14.6, 1.9, { ink: '#1b1a22', lw: 0.32, align: 'center', track: 0.9 });
  pictureLight(g, x, y, w, hh, P);
}

// The CEO's case holds everything he has ever come close to winning: rosettes for second and
// third, a runner-up ribbon, a participation certificate, and on the top shelf a velvet plinth
// kept free for the trophy that has never come.
function rosette(g, cx, cy, petals, centre, label, P) {
  poly(g, [cx - 2.6, cy + 2, cx - 4.2, cy + 10, cx - 2.6, cy + 8.6, cx - 1.4, cy + 10, cx - 0.4, cy + 2], petals, P.ink, 0.3);
  poly(g, [cx + 0.4, cy + 2, cx + 1.4, cy + 10, cx + 2.6, cy + 8.6, cx + 4.2, cy + 10, cx + 2.6, cy + 2], petals, P.ink, 0.3);
  circ(g, cx, cy, 5, petals, P.ink, 0.35);
  circ(g, cx, cy, 3.3, centre, P.ink, 0.3);
  letters(g, label, cx, cy + 1, 2, { ink: P.ink, lw: 0.3, weight: 600, align: 'center' });
}
function runnerUpShelf(g, ix, iw, by, s, P) {
  const at = (fx) => ix + iw * fx;
  if (s === 0) {
    rosette(g, at(0.18), by - 13, '#c9ccd6', '#eef0f4', '2ND', P);
    // the plinth reserved for a first prize
    box(g, at(0.5) - 8, by - 6, 16, 6, '#6a1f3a', P.ink, 0.4);
    box(g, at(0.5) - 6, by - 4.4, 12, 2.6, P.brass, P.ink, 0.25);
    letters(g, 'RESERVED', at(0.5), by - 2.4, 1.5, { ink: P.ink, lw: 0.2, weight: 600, align: 'center' });
    g.save();
    g.setLineDash([1.2, 1.2]);
    g.beginPath();
    g.moveTo(at(0.5) - 4.5, by - 19); g.quadraticCurveTo(at(0.5) - 4.5, by - 10.5, at(0.5), by - 10.5);
    g.quadraticCurveTo(at(0.5) + 4.5, by - 10.5, at(0.5) + 4.5, by - 19); g.closePath();
    g.moveTo(at(0.5), by - 10.5); g.lineTo(at(0.5), by - 6);
    pen(g, 'rgba(120,90,110,0.55)', 0.4);
    g.stroke();
    g.restore();
    rosette(g, at(0.82), by - 13, '#c98a52', '#f1d2b0', '3RD', P);
  } else if (s === 1) {
    // a runner-up ribbon and a participation certificate in a small frame
    poly(g, [at(0.14), by - 18, at(0.38), by - 18, at(0.38), by - 6, at(0.33), by - 8.4, at(0.29), by - 6, at(0.29), by - 13, at(0.14), by - 13], '#4f7fc4', P.ink, 0.3);
    letters(g, 'RUNNER UP', at(0.26), by - 14.6, 1.7, { ink: '#ffffff', lw: 0.25, weight: 600, align: 'center' });
    box(g, at(0.56), by - 17, iw * 0.34, 17, P.wood, P.ink, 0.35);
    box(g, at(0.56) + 1.5, by - 15.5, iw * 0.34 - 3, 14, '#f6efdc', P.ink, 0.25);
    letters(g, 'THANKS FOR', at(0.73), by - 10, 1.6, { ink: P.ink, lw: 0.22, weight: 600, align: 'center' });
    letters(g, 'TAKING PART', at(0.73), by - 6.8, 1.6, { ink: P.ink, lw: 0.22, weight: 600, align: 'center' });
  } else {
    // more seconds and thirds, a participation medal on its ribbon
    rosette(g, at(0.16), by - 12, '#c9ccd6', '#eef0f4', '2ND', P);
    poly(g, [at(0.44) - 3, by - 19, at(0.44) + 3, by - 19, at(0.44) + 1.4, by - 11, at(0.44) - 1.4, by - 11], '#d24a6a', P.ink, 0.3);
    circ(g, at(0.44), by - 8, 3.4, '#b9b5a6', P.ink, 0.35);
    letters(g, 'P', at(0.44), by - 6.9, 2.4, { ink: P.ink, lw: 0.3, weight: 600, align: 'center' });
    rosette(g, at(0.66), by - 12, '#c98a52', '#f1d2b0', '3RD', P);
    rosette(g, at(0.87), by - 12, '#c9ccd6', '#eef0f4', '2ND', P);
  }
}
function trophyCase(g, h, P) {
  const { x, y, w } = h;
  const hh = h.h;
  rbox(g, x - 12, y - 10, w + 24, hh + 10, 10, 'rgba(255,190,226,0.06)');
  rbox(g, x - 6, y - 5, w + 12, hh + 5, 6, 'rgba(255,200,232,0.08)');
  box(g, x, y, w, hh, P.woodDk, P.ink, LW);
  box(g, x - 2, y - 3, w + 4, 4, P.wood, P.ink, LW);
  const ix = x + 4;
  const iw = w - 8;
  const iy = y + 4;
  const ih = hh - 22;
  box(g, ix, iy, iw, ih, '#fde4f0', P.ink, LWF);
  box(g, ix, iy, iw, 3, '#f6c4dc');
  const shelves = 3;
  const sh = ih / shelves;
  for (let s = 0; s < shelves; s++) {
    const sy = iy + sh * (s + 1);
    box(g, ix, sy - 2, iw, 2, P.woodLt, P.ink, LWF);
    if (h.runnerUp) {
      runnerUpShelf(g, ix, iw, sy - 2, s, P);
      continue;
    }
    // the silverware: cups, a plaque, a golfer, a statuette
    const items = [[0.16, 'cup'], [0.42, s === 1 ? 'plaque' : 'cup2'], [0.66, s === 0 ? 'star' : 'cup'], [0.86, 'statue']];
    items.forEach(([fx, kind], k) => {
      const cx = ix + iw * fx;
      const by = sy - 2;
      const big = (s + k) % 2 ? 1 : 0.8;
      if (kind === 'cup' || kind === 'cup2') {
        const hgt = 13 * big;
        box(g, cx - 3, by - 2.4, 6, 2.4, '#5a3a2a', P.ink, 0.35);
        box(g, cx - 0.8, by - hgt * 0.45, 1.6, hgt * 0.45 - 2.4, P.brass, P.ink, 0.35);
        g.beginPath();
        g.moveTo(cx - 4 * big, by - hgt);
        g.quadraticCurveTo(cx - 4 * big, by - hgt * 0.42, cx, by - hgt * 0.42);
        g.quadraticCurveTo(cx + 4 * big, by - hgt * 0.42, cx + 4 * big, by - hgt);
        g.closePath();
        fs(g, kind === 'cup2' ? '#f2c94c' : P.brass, P.ink, 0.4);
        g.beginPath();
        for (const sgn of [-1, 1]) { g.moveTo(cx + sgn * 3.6 * big, by - hgt * 0.9); g.quadraticCurveTo(cx + sgn * 6.4 * big, by - hgt * 0.8, cx + sgn * 2.6 * big, by - hgt * 0.58); }
        pen(g, P.ink, 0.45);
        g.stroke();
      } else if (kind === 'plaque') {
        rbox(g, cx - 5, by - 12, 10, 12, 1.2, P.wood, P.ink, 0.4);
        box(g, cx - 3.4, by - 9.6, 6.8, 6, P.brass, P.ink, 0.3);
        letters(g, 'ME', cx, by - 4.8, 2, { ink: P.ink, lw: 0.3, align: 'center' });
      } else if (kind === 'star') {
        box(g, cx - 2.5, by - 3, 5, 3, '#5a3a2a', P.ink, 0.35);
        g.beginPath();
        for (let q = 0; q < 10; q++) {
          const a = -Math.PI / 2 + (q / 10) * TAU;
          const r = q % 2 ? 1.8 : 4.2;
          const px = cx + Math.cos(a) * r;
          const py = by - 8 + Math.sin(a) * r;
          if (q) g.lineTo(px, py); else g.moveTo(px, py);
        }
        g.closePath();
        fs(g, P.brass, P.ink, 0.4);
      } else {
        box(g, cx - 2.4, by - 3.4, 4.8, 3.4, '#2a2420', P.ink, 0.35);
        circ(g, cx, by - 11, 1.4, P.brass, P.ink, 0.3);
        poly(g, [cx - 1.4, by - 9.6, cx + 1.4, by - 9.6, cx + 1, by - 3.4, cx - 1, by - 3.4], P.brass, P.ink, 0.3);
        line(g, cx + 1.2, by - 9, cx + 3.6, by - 12.4, P.brass, 0.7);
      }
    });
  }
  // the glass doors and their shine
  line(g, x + w / 2, iy, x + w / 2, iy + ih, P.brassDk, 0.7);
  g.beginPath();
  g.moveTo(ix + 4, iy + 30); g.lineTo(ix + 16, iy + 12);
  g.moveTo(ix + 7, iy + 32); g.lineTo(ix + 18, iy + 16);
  g.moveTo(ix + iw / 2 + 5, iy + 64); g.lineTo(ix + iw / 2 + 18, iy + 44);
  pen(g, 'rgba(255,255,255,0.6)', 0.8);
  g.stroke();
  // the cupboard below
  for (const dx of [0, iw / 2]) {
    box(g, ix + dx + 1, iy + ih + 3, iw / 2 - 2, 13, P.wood, P.ink, LWF);
    circ(g, ix + dx + (dx ? 4 : iw / 2 - 4), iy + ih + 9.5, 0.9, P.brass, P.ink, 0.3);
  }
}

function bookshelf(g, h, P) {
  const { x, y, w } = h;
  const hh = h.h;
  box(g, x - 2, y - 4, w + 4, 5, P.woodDk, P.ink, LW);
  box(g, x, y, w, hh, P.woodDk, P.ink, LW);
  const n = 6;
  const sh = (hh - 8) / n;
  // VHS tapes in their black sleeves and paperbacks in muted pastel, so the case stays calm
  const spines = ['#2a2833', '#d9aac1', '#9fcfc8', '#ddd196', '#b9a9dc', '#e6e2ec', '#2a2833', '#8f9fd0'];
  for (let s = 0; s < n; s++) {
    const y0 = y + 3 + s * sh;
    const y1 = y0 + sh - 2;
    box(g, x + 3, y0, w - 6, sh - 2, '#3e2015');
    let bx = x + 4;
    let k = 0;
    while (bx < x + w - 6) {
      const r = hash(s * 41 + k * 7.3);
      if (s === 2 && bx > x + w * 0.55 && bx < x + w * 0.8) {
        // a bust of the founder, of course, and a little globe
        const cx = x + w * 0.66;
        // in marble: the egg of a head, the mane standing up in five spikes
        poly(g, [cx - 4, y1, cx + 4, y1, cx + 3, y1 - 3, cx - 3, y1 - 3], '#d9d2c2', P.ink, 0.35);
        poly(g, [cx - 3.6, y1 - 9, cx - 5.4, y1 - 12, cx - 2.4, y1 - 11.4, cx - 2, y1 - 14.4, cx, y1 - 12.2,
          cx + 2.2, y1 - 14.6, cx + 2.4, y1 - 11.4, cx + 5.4, y1 - 12.2, cx + 3.6, y1 - 9], '#e6e0d2', P.ink, 0.35);
        g.beginPath();
        profHeadPath(g, cx, y1 - 7.6, 3, 4);
        fs(g, '#d9d2c2', P.ink, 0.35);
        line(g, cx - 2.2, y1 - 8.2, cx + 2.2, y1 - 8.2, P.ink, 0.35);
        g.beginPath();
        g.moveTo(cx - 1.8, y1 - 6.2); g.quadraticCurveTo(cx, y1 - 7.2, cx + 1.8, y1 - 6.2);
        pen(g, P.ink, 0.4);
        g.stroke();
        // a boombox
        box(g, x + w * 0.72, y1 - 6, 11, 6, '#24222c', P.ink, 0.35);
        circ(g, x + w * 0.72 + 2.6, y1 - 3, 1.8, '#5a5868', P.ink, 0.3);
        circ(g, x + w * 0.72 + 8.4, y1 - 3, 1.8, '#5a5868', P.ink, 0.3);
        box(g, x + w * 0.72 + 4.6, y1 - 5, 1.8, 1.2, M89.pink);
        line(g, x + w * 0.72 + 1, y1 - 6, x + w * 0.72 + 10, y1 - 6, P.chrome, 0.8);
        bx = x + w * 0.82;
        continue;
      }
      if (s === 4 && k === 3) {
        // a leaning run
        const bw = 3.2;
        poly(g, [bx, y1, bx + bw, y1, bx + bw + 3, y1 - sh + 5, bx + 3, y1 - sh + 5], spines[(k + s) % 8], P.ink, 0.35);
        bx += 7;
        k++;
        continue;
      }
      const bw = 2.4 + r * 2.2;
      const bh = sh - 4 - hash(s * 13 + k) * 4;
      const c = spines[Math.floor(r * 8)];
      box(g, bx, y1 - bh, bw, bh, c, P.ink, 0.35);
      if (bw > 3) lines(g, [bx + 0.4, y1 - bh + 2, bx + bw - 0.4, y1 - bh + 2, bx + 0.4, y1 - 2.2, bx + bw - 0.4, y1 - 2.2], P.brassLt, 0.4);
      bx += bw + 0.25;
      k++;
    }
    box(g, x + 1, y1, w - 2, 2, P.wood, P.ink, LWF);
  }
  // the library ladder on its brass rail
  line(g, x - 1, y + 10, x + w + 1, y + 10, P.brass, 1);
  line(g, x - 1, y + 10, x + w + 1, y + 10, P.ink, 0.25);
  const lx = x + w * 0.18;
  lines(g, [lx, y + 8, lx - 9, y + hh, lx + 8, y + 8, lx - 1, y + hh], P.woodLt, 1.6);
  lines(g, [lx, y + 8, lx - 9, y + hh, lx + 8, y + 8, lx - 1, y + hh], P.ink, 0.3);
  g.beginPath();
  for (let k = 1; k < 12; k++) {
    const t = k / 12;
    g.moveTo(lx - 9 * t, y + 8 + (hh - 8) * t);
    g.lineTo(lx + 8 - 9 * t, y + 8 + (hh - 8) * t);
  }
  pen(g, P.woodLt, 1);
  g.stroke();
  circ(g, lx + 4, y + 9, 1.4, P.brass, P.ink, 0.3);
}

function ceoDoor(g, h, P) {
  const { x, y, w } = h;
  const hh = h.h;
  // architrave with a pediment
  box(g, x - 4, y - 4, w + 8, hh + 4, P.woodLt, P.ink, LW);
  poly(g, [x - 7, y - 4, x + w / 2, y - 13, x + w + 7, y - 4], P.woodLt, P.ink, LW);
  poly(g, [x - 3, y - 5, x + w / 2, y - 10.5, x + w + 3, y - 5], P.woodDk, P.ink, LWF);
  box(g, x, y, w, hh, P.wood, P.ink, LWF);
  line(g, x + w / 2, y, x + w / 2, y + hh, P.ink, LWF);
  for (const dx of [0, w / 2]) {
    for (const [py, ph] of [[6, hh * 0.38], [hh * 0.5, hh * 0.42]]) {
      const px = x + dx + 3;
      const pw = w / 2 - 6;
      box(g, px, y + py, pw, ph, P.panel, P.ink, LWF);
      poly(g, [px + pw, y + py, px + pw, y + py + ph, px, y + py + ph, px + 1.5, y + py + ph - 1.5, px + pw - 1.5, y + py + ph - 1.5, px + pw - 1.5, y + py + 1.5], P.woodDk);
    }
  }
  circ(g, x + w / 2 - 2.6, y + hh * 0.52, 1.2, P.brass, P.ink, 0.35);
  circ(g, x + w / 2 + 2.6, y + hh * 0.52, 1.2, P.brass, P.ink, 0.35);
  box(g, x + w / 2 - 9, y + hh * 0.43, 18, 6.4, P.brass, P.ink, LWF);
  letters(g, 'CEO', x + w / 2, y + hh * 0.43 + 5, 3.6, { ink: P.ink, lw: 0.55, align: 'center' });
}

function abstractPainting(g, h, P) {
  const { x, y, w } = h;
  const hh = h.h;
  poly(g, [x + 6, y - 3, x + w - 6, y - 3, x + w + 6, y + hh * 0.6, x - 6, y + hh * 0.6], P.warm);
  box(g, x + 1.5, y + 2, w, hh, 'rgba(0,0,0,0.2)');
  box(g, x, y, w, hh, '#141218', P.ink, LW);
  const ix = x + 2.5;
  const iy = y + 2.5;
  const iw = w - 5;
  const ih = hh - 5;
  box(g, ix, iy, iw, ih, '#ffffff', P.ink, LWF);
  g.save();
  g.beginPath();
  g.rect(ix, iy, iw, ih);
  g.clip();
  grid(g, ix, iy + ih * 0.55, iw * 0.38, ih * 0.45, 3, '#ffffff', '#141218', 0.4);
  poly(g, [ix + iw * 0.45, iy + ih, ix + iw * 0.72, iy + ih * 0.3, ix + iw, iy + ih], M89.teal, P.ink, LWF);
  circ(g, ix + iw * 0.3, iy + ih * 0.32, ih * 0.2, M89.lemon, P.ink, LWF);
  box(g, ix + iw * 0.68, iy + ih * 0.1, iw * 0.22, ih * 0.22, M89.pink, P.ink, LWF);
  squiggle(g, ix + 2, ix + iw - 2, iy + ih * 0.5, 2.2, 7, '#141218', 0.9);
  confetti(g, ix, iy, iw, ih * 0.45, 9, 77, ['#141218', M89.cobalt, M89.pink], 1.6, 0.6);
  g.restore();
}

function paintWall(g, F, P, u0, u1) {
  const Wl = F.wall;
  const per = Wl.period;
  for (const b of Wl.bays) {
    for (const x0 of copies(b.u, b.u1 - b.u, per, u0, u1)) {
      const x1 = x0 + (b.u1 - b.u);
      // `seed` is the bay's own u, so its copy one period on is drawn identically
      const bb = { ...b, u: x0, seed: b.u, revolvingDoor: b.revolvingDoor == null ? null : x0 + (b.revolvingDoor - b.u) };
      if (F.id === 'lobby') { if (b.type === 'wall') lobbyWallBay(g, x0, x1, P); else lobbyGlass(g, x0, x1, bb, P, F); }
      if (F.id === 'open') { if (b.type === 'wall') openWallBay(g, x0, x1, P, F); else openGlass(g, x0, x1, bb, P, F); }
      if (F.id === 'exec') { if (b.type === 'wall') execPanels(g, x0, x1, P, F); else execGlass(g, x0, x1, bb, P, F); }
    }
  }
  for (const c of Wl.columns) {
    for (const x of copies(c.u, c.w, per, u0, u1)) {
      if (F.id === 'lobby') lobbyColumn(g, x, c.w, P);
      if (F.id === 'open') openColumn(g, x, c.w, P, F);
      if (F.id === 'exec') execColumn(g, x, c.w, P, F);
    }
  }
  for (const h of Wl.hangs) {
    const hw = h.w || (h.r || 10) * 2;
    const left = h.kind === 'clock' ? h.u - h.r - 4 : h.u - 12;
    for (const x of copies(left, hw + 24, per, u0, u1)) {
      const hx = x + (h.u - left);
      const it = { ...h, x: hx, y: h.y ?? WALL_BASE - h.h, w: h.w ?? 0, h: h.h ?? 0 };
      switch (h.kind) {
        case 'lift': if (F.id === 'lobby') lobbyLift(g, it, P); else steelLift(g, it, P, F.id === 'exec'); break;
        case 'logo': lobbyLogo(g, it, P); break;
        case 'clock':
          if (F.id === 'lobby') clockFace(g, hx, h.y, h.r, P.brass, '#f6ecd2', P, true);
          else if (F.id === 'open') clockFace(g, hx, h.y, h.r, '#2e3036', '#fbfbf4', P);
          else clockFace(g, hx, h.y, h.r, P.brass, '#f3e7c8', P, true);
          break;
        case 'painting': if (h.variant === 1) cityPainting(g, it, P); else abstractPainting(g, it, P); break;
        case 'whiteboard': whiteboard(g, it, P); break;
        case 'poster': poster(g, it, P); break;
        case 'door': if (F.id === 'exec') ceoDoor(g, it, P); else meetingDoor(g, it, P); break;
        case 'extinguisher': extinguisher(g, it, P); break;
        case 'portrait': founderPortrait(g, it, P); break;
        case 'trophyCase': trophyCase(g, it, P); break;
        case 'bookshelf': bookshelf(g, it, P); break;
        default: break;
      }
    }
  }
}

function liftDoors(ctx, f, P) {
  for (const h of f.wall.hangs) {
    if (h.kind !== 'lift') continue;
    const { x, y, w } = h;
    const hh = h.h;
    const gap = h.open * (w / 2 - 1);
    const lit = h.open > 0.02;
    const panels = [[x, x + w / 2 - gap], [x + w / 2 + gap, x + w]];
    panels.forEach(([a, b], k) => {
      const pw = b - a;
      if (pw < 0.3) return;
      const ox = k === 0 ? b - w / 2 : a;
      ctx.save();
      ctx.beginPath();
      ctx.rect(a, y, pw, hh);
      ctx.clip();
      if (f.floor === 'lobby') {
        // brushed steel leaves with a Memphis motif: a pink half-disc, a teal wedge, a squiggle
        box(ctx, ox, y, w / 2, hh, '#c6cbd6', P.ink, LWF);
        const sx = k === 0 ? ox + w / 2 : ox;
        ctx.beginPath();
        ctx.arc(sx, y + hh * 0.34, 7, k === 0 ? Math.PI * 0.5 : -Math.PI * 0.5, k === 0 ? Math.PI * 1.5 : Math.PI * 0.5);
        ctx.closePath();
        fs(ctx, '#f6a8c8', P.ink, 0.4);
        const tx = k === 0 ? ox + 3 : ox + w / 2 - 3;
        poly(ctx, [tx, y + hh * 0.62, tx + (k === 0 ? 10 : -10), y + hh * 0.62, tx, y + hh * 0.5], '#8fd8cf', P.ink, 0.4);
        squiggle(ctx, ox + 3, ox + w / 2 - 3, y + hh * 0.8, 1, 4.4, '#1f1d26', 0.5);
        line(ctx, ox + (k === 0 ? 1.2 : w / 2 - 1.2), y + 1, ox + (k === 0 ? 1.2 : w / 2 - 1.2), y + hh - 1, '#eef0f4', 0.6);
      } else if (f.floor === 'open') {
        box(ctx, ox, y, w / 2, hh, P.steel, P.ink, LWF);
        line(ctx, ox + (k === 0 ? 2 : w / 2 - 2), y + 2, ox + (k === 0 ? 2 : w / 2 - 2), y + hh - 2, P.steelLt, 0.8);
        box(ctx, ox + 3, y + hh * 0.45, w / 2 - 6, 1.2, M89.teal);
      } else {
        box(ctx, ox, y, w / 2, hh, '#25232e', P.ink, LWF);
        box(ctx, ox + 2.5, y + 4, w / 2 - 5, hh - 8, null, P.chrome, 0.5);
        line(ctx, ox + 3, y + hh * 0.5, ox + w / 2 - 3, y + hh * 0.5, M89.pink, 0.6);
      }
      ctx.restore();
      box(ctx, a, y, pw, hh, null, P.ink, LWF);
    });
    // the red LED floor number, and its arrow, bright while the car is here
    const cx = x + w / 2;
    const ly = f.floor === 'lobby' ? y - 6.4 : y - 6.8;
    letters(ctx, h.label, cx - 1, ly, 4.4, { ink: lit ? '#ff3b5a' : '#5a2a3a', lw: 0.75, align: 'center', slant: 0.1 });
    // the arrow shows the way the car came: up, even on the top floor (its call panel has a down
    // button only)
    poly(ctx, [cx + 5.6, ly - 3, cx + 3.8, ly - 1, cx + 7.4, ly - 1], lit ? '#ff3b5a' : '#5a2a3a');
  }
}

function clockHands(ctx, f, P) {
  for (const h of f.wall.hangs) {
    if (h.kind !== 'clock') continue;
    const { cx, cy, r } = h;
    const hand = (a, l, wdt, c) => line(ctx, cx - Math.sin(a) * l * 0.18, cy + Math.cos(a) * l * 0.18, cx + Math.sin(a) * l, cy - Math.cos(a) * l, c, wdt);
    hand(f.clock.hourA, r * 0.52, 1.3, P.ink);
    hand(f.clock.minuteA, r * 0.8, 0.85, P.ink);
    hand(f.clock.secondA, r * 0.86, 0.45, '#ff4f9a');
    circ(ctx, cx, cy, 0.9, '#ff4f9a');
  }
}

function revolvingDoor(ctx, f, P) {
  for (const b of f.wall.bays) {
    if (b.revolvingDoor == null) continue;
    const cx = b.revolvingDoor;
    const G = f.glass;
    const y0 = G.transom + 8.8;
    const y1 = G.bottom - 4.6;
    const R = 21;
    // the drum: its curved head and its floor ring, seen a little from below and above
    ctx.beginPath();
    ctx.ellipse(cx, y0, 23, 2.2, 0, 0, Math.PI);
    pen(ctx, P.brassDk, 0.8);
    ctx.stroke();
    ell(ctx, cx, y1 + 0.6, 23, 1.6, 'rgba(90,70,50,0.35)', P.ink, 0.35);
    const wings = [0, 1, 2, 3].map((q) => {
      const a = f.revolving * Math.PI + q * Math.PI / 2;
      return { a, x: Math.cos(a) * R, z: Math.sin(a) };
    }).sort((p, q) => q.z - p.z);
    const mid = y0 + (y1 - y0) * 0.52;
    const drawWing = (wg) => {
      const front = wg.z < 0;
      const x1 = cx + wg.x;
      const lo = Math.min(cx, x1);
      const wdt = Math.abs(x1 - cx);
      if (wdt > 0.6) {
        box(ctx, lo, y0 + 2, wdt, y1 - y0 - 4, front ? 'rgba(214,236,246,0.42)' : 'rgba(170,200,215,0.3)');
        // the frame: head rail, bottom rail with its kick plate, push bar, and a glint
        lines(ctx, [lo, y0 + 2, lo + wdt, y0 + 2, lo, y1 - 2, lo + wdt, y1 - 2], front ? P.brass : P.brassDk, 1.3);
        box(ctx, lo, y1 - 7, wdt, 5, front ? P.brass : P.brassDk);
        line(ctx, lo + 0.8, mid, lo + wdt - 0.8, mid, front ? P.brass : P.brassDk, 1.1);
        if (front && wdt > 8) line(ctx, lo + wdt * 0.3, mid - 8, lo + wdt * 0.6, mid - 26, 'rgba(255,255,255,0.75)', 0.8);
        box(ctx, lo, y0 + 2, wdt, y1 - y0 - 4, null, P.ink, 0.35);
      }
      line(ctx, x1, y0 + 1, x1, y1 - 1, front ? P.brass : P.brassDk, 1.8);
      line(ctx, x1, y0 + 1, x1, y1 - 1, P.ink, 0.3);
    };
    for (const wg of wings) if (wg.z >= 0) drawWing(wg);
    box(ctx, cx - 1.2, y0, 2.4, y1 - y0, P.brassDk, P.ink, 0.35);
    for (const wg of wings) if (wg.z < 0) drawWing(wg);
  }
}

export { alarmSign, fireExitDoor, pictureLight, decoSconce, glassBlocks, nagelPrint, PROF_NAGEL, rake, crownPath, SIGN, signPaths, buzz, signNeon, floorLights, glints, sunShafts, noonShafts, noonWall, noonSpans, lobbyCornice, lobbyWallBay, lobbyGlass, lobbyColumn, lobbyLift, lobbyLogo, clockFace, cityPainting, openWallBay, openDado, openBulkhead, openGlass, radiator, openColumn, steelLift, whiteboard, poster, meetingDoor, extinguisher, execPanels, upperWall, execGlass, execColumn, PROF, PROF_MANE, profHeadPath, professor, professorBody, professorHead, founderPortrait, trophyCase, bookshelf, ceoDoor, abstractPainting, paintWall, liftDoors, clockHands, revolvingDoor };
