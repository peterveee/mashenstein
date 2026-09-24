// NEON — more of Tokyo (BAKE-OFF IDEAS, not wired into the game). Peter, 24 Sep 2026:
// "Any other ideas for more Tokyo or japan themed background items or obstacles for the
// neon levels? Give me a bunch of ideas as a bake-off."
//
// Each idea is a small painter and a PLACE: `bg` ideas are scenery, drawn over the
// shipped city in background space; `lane` ideas stand on the road where a hazard
// would, at world scale beside the hero; `air` ideas fly at a drone's height. Quick
// sketches — enough to judge the idea at the game's real size, not finished art.
import { W, H } from '../engine/renderer.js';
import { GROUND_Y } from '../engine/camera.js';

const INK = '#1a1028';
const TAU = Math.PI * 2;
function shape(ctx, fill, path, line = 0.9, ink = INK) {
  ctx.beginPath(); path(ctx);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (line) { ctx.lineWidth = line; ctx.strokeStyle = ink; ctx.lineJoin = 'round'; ctx.stroke(); }
}
const oval = (x, y, rx, ry) => (c) => c.ellipse(x, y, rx, ry, 0, 0, TAU);
const rect = (x, y, w, h, r = 0) => (c) => c.roundRect(x, y, w, h, r);
function glowLine(ctx, color, width, draw, glow = 0.35) {
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.globalAlpha *= glow; ctx.lineWidth = width * 4; ctx.beginPath(); draw(ctx); ctx.stroke();
  ctx.globalAlpha /= glow; ctx.lineWidth = width; ctx.beginPath(); draw(ctx); ctx.stroke();
  ctx.restore();
}
// Background items drift with the far city, so they read as scenery. `pad` is the item's
// half-width: it wraps as soon as it leaves, so a gallery tile never catches it off-screen.
const drift = (base, camX, f = 0.12, pad = 40) => {
  const span = W + pad * 2;
  return ((base - camX * f) % span + span) % span - pad;
};
// A soft light pool: a radial falloff rather than a flat disc, which reads as a stain.
function halo(ctx, x, y, r, rgb, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

// ---------------------------------------------------------------- background
function tokyoTower(ctx, t, camX) {
  const x = drift(300, camX, 0.05, 30);
  const base = GROUND_Y - 30;
  const top = 30;
  const red = '#ff5a3c';
  const lattice = (c) => {
    c.moveTo(x - 26, base); c.lineTo(x - 5, top + 40); c.lineTo(x - 2, top);
    c.moveTo(x + 26, base); c.lineTo(x + 5, top + 40); c.lineTo(x + 2, top);
    for (let k = 0; k < 9; k++) {
      const y = base - k * (base - top - 40) / 9;
      const half = 26 - 21 * (k / 9);
      c.moveTo(x - half, y); c.lineTo(x + half, y);
    }
  };
  glowLine(ctx, red, 1.2, lattice);
  // The two observation decks, white.
  for (const [y, w] of [[base - 70, 14], [top + 42, 8]]) {
    ctx.fillStyle = '#fff4e8'; ctx.fillRect(x - w / 2, y, w, 4);
  }
  ctx.fillStyle = Math.sin(t * 3) > 0 ? '#ffffff' : '#ff5a3c';
  ctx.fillRect(x - 1, top - 3, 2, 2);
}

function mountFuji(ctx) {
  ctx.save();
  ctx.globalAlpha = 0.55;
  const cx = W * 0.62; const base = GROUND_Y - 60; const peak = 70;
  shape(ctx, '#3a2f6e', (c) => { c.moveTo(cx - 230, base); c.lineTo(cx - 34, peak); c.lineTo(cx + 34, peak); c.lineTo(cx + 230, base); c.closePath(); }, 0);
  shape(ctx, '#f0f4ff', (c) => {
    c.moveTo(cx - 34, peak); c.lineTo(cx + 34, peak); c.lineTo(cx + 62, peak + 32);
    for (let k = 0; k <= 6; k++) c.lineTo(cx + 62 - k * 20.6, peak + 32 + (k % 2 ? 8 : 0));
    c.closePath();
  }, 0);
  ctx.restore();
}

function toriiGate(ctx, t, camX) {
  const x = drift(140, camX, 0.25, 36);
  const base = GROUND_Y - 6; const h = 70; const red = '#ff3b3b';
  glowLine(ctx, red, 2, (c) => {
    c.moveTo(x - 24, base); c.lineTo(x - 20, base - h);
    c.moveTo(x + 24, base); c.lineTo(x + 20, base - h);
    c.moveTo(x - 34, base - h - 6); c.quadraticCurveTo(x, base - h - 12, x + 34, base - h - 6);
    c.moveTo(x - 28, base - h + 10); c.lineTo(x + 28, base - h + 10);
  });
}

function lanternString(ctx, t, camX) {
  const off = -((camX * 0.3) % 36);
  ctx.strokeStyle = 'rgba(40,30,60,0.9)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 60); ctx.quadraticCurveTo(W / 2, 92, W, 60); ctx.stroke();
  for (let x = off; x < W + 36; x += 36) {
    const k = x / W;
    const y = 60 + 32 * 4 * k * (1 - k) * 0.5 + 6;
    const sway = Math.sin(t * 1.4 + x) * 1.2;
    halo(ctx, x + sway, y + 7, 14, '255,177,74', 0.45);
    shape(ctx, '#ff4a3a', oval(x + sway, y + 7, 6, 8), 0.8);
    ctx.fillStyle = '#2a2a30'; ctx.fillRect(x + sway - 4, y - 1, 8, 2); ctx.fillRect(x + sway - 4, y + 14, 8, 2);
  }
}

function sakura(ctx, t, camX) {
  const x = drift(330, camX, 0.35, 32);
  const base = GROUND_Y;
  shape(ctx, '#5a3a2e', (c) => { c.moveTo(x - 3, base); c.lineTo(x - 2, base - 40); c.lineTo(x + 2, base - 40); c.lineTo(x + 4, base); c.closePath(); }, 0.8);
  for (const [dx, dy, r] of [[-18, -48, 16], [0, -58, 20], [18, -46, 15], [-6, -40, 12], [10, -40, 12]]) {
    shape(ctx, '#ffc0dc', oval(x + dx, base + dy, r, r * 0.8), 0.6, '#c06a90');
  }
  ctx.fillStyle = '#ffd6e8';
  for (let i = 0; i < 18; i++) {
    const px = ((i * 53 + t * 20) % (W + 40)) - 20;
    const py = ((i * 37 + t * 26) % (GROUND_Y + 20));
    ctx.save(); ctx.translate(px + Math.sin(t * 2 + i) * 6, py); ctx.rotate(t * 2 + i);
    ctx.fillRect(-1.5, -1, 3, 2); ctx.restore();
  }
}

function koinobori(ctx, t, camX) {
  const x = drift(90, camX, 0.3, 30) - 20;
  const top = GROUND_Y - 110;
  ctx.fillStyle = '#c8c0b0'; ctx.fillRect(x - 1, top, 2, GROUND_Y - top);
  [['#2a58d8', 0], ['#e8403a', 22], ['#ff8fb0', 42]].forEach(([col, dy], i) => {
    const y = top + 8 + dy;
    const len = 44 - i * 6;
    const wave = (u) => Math.sin(t * 4 - u * 5 + i) * 3 * u;
    shape(ctx, col, (c) => {
      c.moveTo(x, y - 5);
      for (let u = 0; u <= 1; u += 0.2) c.lineTo(x + u * len, y - 5 + wave(u));
      c.lineTo(x + len + 6, y + wave(1)); c.lineTo(x + len, y + 5 + wave(1));
      for (let u = 1; u >= 0; u -= 0.2) c.lineTo(x + u * len, y + 5 + wave(u));
      c.closePath();
    }, 0.8);
    shape(ctx, '#ffffff', oval(x + 6, y + wave(0.1), 2.5, 2.5), 0.5);
  });
}

function bigScreen(ctx, t, camX) {
  const w = 90; const h = 52;
  const x = drift(250, camX, 0.2, 50) - w / 2;
  const y = 70;
  shape(ctx, '#0a0a18', rect(x - 4, y - 4, w + 8, h + 8, 2), 1, '#38d8f8');
  const hue = (t * 40) % 360;
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, `hsl(${hue},90%,60%)`); g.addColorStop(1, `hsl(${(hue + 120) % 360},90%,55%)`);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.font = "800 16px 'M PLUS Rounded 1c', 'Hiragino Maru Gothic ProN', sans-serif";
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('ようこそ', x + w / 2, y + h / 2 - 4);
  ctx.font = "700 7px sans-serif";
  ctx.fillText('WELCOME TO SHIBUYA', x + w / 2, y + h / 2 + 12);
}

function trainWires(ctx, t, camX) {
  const span = 110;
  const off = -((camX * 0.9) % span);
  const top = GROUND_Y - 64;
  for (let x = off; x < W + span; x += span) {
    ctx.fillStyle = '#3a3f58'; ctx.fillRect(x, top, 3, GROUND_Y - top);
    ctx.fillRect(x - 8, top + 4, 22, 2);
  }
  ctx.strokeStyle = 'rgba(80,90,120,0.9)'; ctx.lineWidth = 1;
  for (const dy of [6, 12]) {
    ctx.beginPath();
    for (let x = off; x < W + span; x += span) {
      ctx.moveTo(x, top + dy); ctx.quadraticCurveTo(x + span / 2, top + dy + 6, x + span, top + dy);
    }
    ctx.stroke();
  }
}

function yatai(ctx, t, camX) {
  const x = drift(360, camX, 0.45, 40);
  const base = GROUND_Y;
  // Cart, roof, noren curtain, lantern, steam.
  shape(ctx, '#8a5a38', rect(x - 26, base - 20, 52, 16, 2));
  for (const wx of [x - 18, x + 18]) shape(ctx, '#3a2a20', oval(wx, base - 3, 4, 4));
  shape(ctx, '#c8402e', (c) => { c.moveTo(x - 32, base - 44); c.lineTo(x + 32, base - 44); c.lineTo(x + 28, base - 50); c.lineTo(x - 28, base - 50); c.closePath(); });
  ctx.fillStyle = '#6a4a30'; ctx.fillRect(x - 28, base - 44, 2, 24); ctx.fillRect(x + 26, base - 44, 2, 24);
  for (let k = 0; k < 4; k++) shape(ctx, '#2a3050', rect(x - 24 + k * 12, base - 44, 11, 11), 0.5, '#9aa4d0');
  ctx.fillStyle = '#ffffff'; ctx.font = "800 7px 'M PLUS Rounded 1c', sans-serif"; ctx.textAlign = 'center';
  ctx.fillText('らーめん', x, base - 36);
  shape(ctx, '#ff4a3a', oval(x + 34, base - 34, 4, 6), 0.6);
  ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 3; i++) { const y = base - 24 - ((t * 10 + i * 7) % 20); ctx.beginPath(); ctx.arc(x - 8 + i * 6 + Math.sin(t + i) * 2, y, 3, 0, TAU); ctx.fill(); }
  ctx.restore();
}

// ---------------------------------------------------------------- the lane
function daruma(ctx, t, x, g) {
  const rock = Math.sin(t * 3) * 0.15;
  ctx.save(); ctx.translate(x, g); ctx.rotate(rock);
  shape(ctx, '#e0302a', oval(0, -8, 7.5, 8));
  shape(ctx, '#fff4e8', oval(0, -10, 4.6, 4), 0.6);
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(-1.6, -10.5, 0.9, 0, TAU); ctx.fill();          // one eye filled, one blank —
  ctx.lineWidth = 0.5; ctx.beginPath(); ctx.arc(1.6, -10.5, 0.9, 0, TAU); ctx.stroke();   // the wish not yet granted
  ctx.fillStyle = '#f6d33c'; ctx.fillRect(-3, -4, 6, 1.2);
  ctx.restore();
}

function manekiNeko(ctx, t, x, g) {
  // The beckoning paw, raised beside the face and waving from the wrist.
  const a = Math.sin(t * 6) * 0.35;
  ctx.save(); ctx.translate(x + 6.5, g - 8); ctx.rotate(0.15 + a);
  shape(ctx, '#fff8f0', rect(-1.8, -9, 3.6, 9, 1.8), 0.6);
  ctx.restore();
  shape(ctx, '#fff8f0', rect(x - 6, g - 10, 12, 10, 3));
  shape(ctx, '#fff8f0', oval(x, g - 14, 6.5, 5.5));
  for (const dx of [-4.2, 4.2]) shape(ctx, '#fff8f0', (c) => { c.moveTo(x + dx - 2, g - 17); c.lineTo(x + dx, g - 21); c.lineTo(x + dx + 2, g - 17); c.closePath(); }, 0.6);
  ctx.fillStyle = INK; for (const dx of [-2.2, 2.2]) { ctx.beginPath(); ctx.arc(x + dx, g - 14.5, 0.8, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#e0302a'; ctx.fillRect(x - 5, g - 9.5, 10, 1.4);
  shape(ctx, '#f6d33c', oval(x, g - 7, 1.8, 1.8), 0.4);
}

function fumikiri(ctx, t, x, g) {
  // A level-crossing arm across the lane at head height: SLIDE under it. The post's
  // twin red lamps alternate, like the real thing's bell.
  for (let y = g - 30; y < g; y += 3) { ctx.fillStyle = (y - g) % 6 ? '#f6d33c' : INK; ctx.fillRect(x - 1, y, 2, 3); }
  // The crossbuck, yellow and black, over the lamps.
  for (const r of [0.6, -0.6]) {
    ctx.save(); ctx.translate(x, g - 38); ctx.rotate(r);
    shape(ctx, '#f6d33c', rect(-6, -1, 12, 2), 0.5); ctx.restore();
  }
  ctx.fillStyle = INK; ctx.fillRect(x - 5, g - 33, 10, 1.5);
  const on = Math.floor(t * 3) % 2;
  for (const [dx, lit] of [[-3.5, on], [3.5, 1 - on]]) {
    if (lit) halo(ctx, x + dx, g - 30, 8, '255,59,59', 0.7);
    shape(ctx, lit ? '#ff4a3a' : '#5a1a1a', oval(x + dx, g - 30, 2.2, 2.2), 0.5);
  }
  // The arm: yellow and black stripes, out over the lane.
  ctx.save(); ctx.beginPath(); ctx.rect(x - 40, g - 17, 40, 3); ctx.clip();
  ctx.fillStyle = '#f6d33c'; ctx.fillRect(x - 40, g - 17, 40, 3);
  ctx.fillStyle = INK; for (let s = x - 40; s < x; s += 6) ctx.fillRect(s, g - 17, 3, 3);
  ctx.restore();
}

function tanuki(ctx, t, x, g) {
  shape(ctx, '#8a6a48', oval(x, g - 7, 7, 7.5));
  shape(ctx, '#e8d4b0', oval(x, g - 5, 4.5, 5), 0.5);
  shape(ctx, '#8a6a48', oval(x, g - 16, 5.5, 4.8));
  shape(ctx, '#2a2a30', oval(x, g - 16, 4, 2), 0);
  ctx.fillStyle = '#ffffff'; for (const dx of [-1.8, 1.8]) { ctx.beginPath(); ctx.arc(x + dx, g - 16.2, 0.8, 0, TAU); ctx.fill(); }
  // Straw hat and sake bottle.
  shape(ctx, '#d8b060', (c) => { c.moveTo(x - 7, g - 19); c.lineTo(x, g - 25); c.lineTo(x + 7, g - 19); c.closePath(); }, 0.6);
  shape(ctx, '#f4f0e8', rect(x + 5, g - 10, 3, 6, 1), 0.5);
}

// ---------------------------------------------------------------- the air
function paperCrane(ctx, t, x, y) {
  const flap = Math.sin(t * 7) * 5;
  shape(ctx, '#fff4f8', (c) => { c.moveTo(x - 9, y); c.lineTo(x, y - 2); c.lineTo(x + 9, y - 1); c.lineTo(x, y + 3); c.closePath(); }, 0.6);
  shape(ctx, '#ffd6e8', (c) => { c.moveTo(x - 2, y - 1); c.lineTo(x - 5, y - 8 - flap); c.lineTo(x + 3, y - 1); c.closePath(); }, 0.6);
  shape(ctx, '#ffffff', (c) => { c.moveTo(x + 8, y - 1); c.lineTo(x + 12, y - 5); c.lineTo(x + 10, y); c.closePath(); }, 0.5);
}

function lanternGhost(ctx, t, x, y) {
  // Chōchin-obake: the paper-lantern yokai — one eye, a split, a long tongue.
  const bob = Math.sin(t * 2) * 2;
  y += bob;
  halo(ctx, x, y, 16, '255,177,74', 0.5);
  shape(ctx, '#ffe4b8', oval(x, y, 7, 9));
  ctx.strokeStyle = 'rgba(26,16,40,0.4)'; ctx.lineWidth = 0.5;
  for (const dy of [-5, -2, 1, 4]) { ctx.beginPath(); ctx.moveTo(x - 6.5, y + dy); ctx.lineTo(x + 6.5, y + dy); ctx.stroke(); }
  ctx.fillStyle = '#2a2a30'; ctx.fillRect(x - 4, y - 10, 8, 2); ctx.fillRect(x - 4, y + 8, 8, 2);
  shape(ctx, '#ffffff', oval(x - 1, y - 3, 2.6, 2.6), 0.5);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x - 0.6, y - 3, 1.1, 0, TAU); ctx.fill();
  shape(ctx, '#ff5a7a', (c) => { c.moveTo(x - 1, y + 3); c.quadraticCurveTo(x + 6, y + 10 + Math.sin(t * 4) * 2, x + 2, y + 12); c.lineTo(x + 1, y + 4); c.closePath(); }, 0.5);
}

export const NEON_JAPAN_IDEAS = [
  { id: 'tower', place: 'bg', depth: 'sky', name: 'SHIPS · Tokyo Tower', paint: tokyoTower,
    note: 'The red-and-white lattice on the far skyline, lamp blinking at the top. One landmark says "Tokyo" before any word does.' },
  { id: 'fuji', place: 'bg', depth: 'sky', mood: 'golden', name: 'SHIPS · Mt Fuji behind the city', paint: mountFuji,
    note: 'A snow-capped silhouette behind the far towers — gorgeous in the golden hour, a ghost at night.' },
  { id: 'torii', place: 'bg', name: 'Neon torii gate', paint: toriiGate,
    note: 'A shrine gate drawn in red tube, standing between the towers.' },
  { id: 'lanterns', place: 'bg', name: 'Lantern strings', paint: lanternString,
    note: 'Red chōchin strung across the street overhead, swaying and glowing — a festival street.' },
  { id: 'sakura', place: 'bg', name: 'Sakura and falling petals', paint: sakura,
    note: 'A cherry tree by the road and petals drifting across the whole screen. Maybe neon-2 only, as a season.' },
  { id: 'koinobori', place: 'bg', mood: 'golden', name: 'Koinobori (carp streamers)', paint: koinobori,
    note: 'Carp windsocks on a pole, rippling — Children\'s Day, and pure motion for the skyline.' },
  { id: 'screen', place: 'bg', name: 'Shibuya big screen', paint: bigScreen,
    note: 'A building-sized video wall cycling colour, ようこそ (welcome). Could show the hero\'s face after a combo.' },
  { id: 'wires', place: 'bg', name: 'Overhead train wires', paint: trainWires,
    note: 'Catenary poles and sagging wires along the line — the thing every Tokyo railway photo has.' },
  { id: 'yatai', place: 'bg', name: 'Ramen stall (yatai)', paint: yatai,
    note: 'A street cart with a noren curtain, a red lantern and steam, parked by the road as scenery.' },
  { id: 'daruma', place: 'lane', name: 'Daruma doll (obstacle)', paint: daruma,
    note: 'Red, round, one eye painted in. Rocks in place — or ROLLS down the lane as a moving hazard.' },
  { id: 'neko', place: 'lane', name: 'Maneki-neko (obstacle)', paint: manekiNeko,
    note: 'The beckoning lucky cat, paw waving. Breakable, and it could drop coins when broken.' },
  { id: 'fumikiri', place: 'lane', name: 'Level crossing arm (slide)', paint: fumikiri, zoom: 3, cx: 20,
    note: 'A railway crossing barrier across the lane at head height, lamps flashing — the neon cabinet\'s own SLIDE-under hazard.' },
  { id: 'tanuki', place: 'lane', name: 'Tanuki statue (obstacle)', paint: tanuki,
    note: 'The straw-hatted raccoon-dog outside every izakaya, sake bottle in paw.' },
  { id: 'crane', place: 'air', name: 'Paper crane (flyer)', paint: paperCrane,
    note: 'An origami crane flapping at drone height — a softer, stranger replacement for the drones.' },
  { id: 'obake', place: 'air', name: 'Lantern ghost (flyer)', paint: lanternGhost, zoom: 4,
    note: 'Chōchin-obake, the paper-lantern yokai: one eye, a long tongue, bobbing. A shooter-drone with folklore.' },
];
