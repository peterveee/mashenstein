// FROST — more of the fortress (BAKE-OFF IDEAS, not wired into the game). Peter, 24 Sep
// 2026: "Also more ideas for the frost levels in the gallery also."
//
// Same shape as src/dev/neon-japan-ideas.js: each idea is a painter and a PLACE — `bg`
// scenery drawn over the shipped watercolor backdrop in screen space, `lane` hazards on
// the road at world scale beside the hero, `air` at a drone's height. Sketches for
// judging the idea at game size, in the watercolor pack's pale ink.
import { W } from '../engine/renderer.js';
import { GROUND_Y } from '../engine/camera.js';

const INK = '#46627e';
const SNOW = '#f4faff';
const ICE = '#bfe2f6';
const TAU = Math.PI * 2;
function shape(ctx, fill, path, line = 0.8, ink = INK) {
  ctx.beginPath(); path(ctx);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (line) { ctx.lineWidth = line; ctx.strokeStyle = ink; ctx.lineJoin = 'round'; ctx.stroke(); }
}
const oval = (x, y, rx, ry) => (c) => c.ellipse(x, y, rx, ry, 0, 0, TAU);
const rect = (x, y, w, h, r = 0) => (c) => c.roundRect(x, y, w, h, r);
const drift = (base, camX, f = 0.12, pad = 40) => {
  const span = W + pad * 2;
  return ((base - camX * f) % span + span) % span - pad;
};
// Far things are drawn through the sky's own haze, so they sit behind the ridges.
function far(ctx, alpha, draw) { ctx.save(); ctx.globalAlpha *= alpha; draw(); ctx.restore(); }

// ---------------------------------------------------------------- background
function iceFortress(ctx, t, camX) {
  const x = drift(260, camX, 0.04, 70);
  const base = GROUND_Y - 62;
  far(ctx, 0.8, () => {
    const towers = [[-58, 40, 12], [-30, 64, 16], [0, 92, 20], [30, 64, 16], [58, 40, 12]];
    shape(ctx, '#d6ecfa', rect(x - 66, base - 30, 132, 30), 0.7);
    for (const [dx, h, w] of towers) {
      shape(ctx, '#e4f2fc', rect(x + dx - w / 2, base - h, w, h), 0.7);
      shape(ctx, '#9cc8e8', (c) => { c.moveTo(x + dx - w / 2 - 2, base - h); c.lineTo(x + dx, base - h - w * 1.1); c.lineTo(x + dx + w / 2 + 2, base - h); c.closePath(); }, 0.7);
      // Pennant, flapping.
      const tip = base - h - w * 1.1;
      ctx.strokeStyle = INK; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(x + dx, tip); ctx.lineTo(x + dx, tip - 8); ctx.stroke();
      shape(ctx, '#5aa0d8', (c) => { c.moveTo(x + dx, tip - 8); c.lineTo(x + dx + 7, tip - 6.5 + Math.sin(t * 5 + dx) * 1.2); c.lineTo(x + dx, tip - 5); c.closePath(); }, 0);
      ctx.fillStyle = '#7ab4dc'; ctx.fillRect(x + dx - 1.5, base - h * 0.6, 3, 5);
    }
    shape(ctx, '#6f8fae', (c) => { c.moveTo(x - 9, base); c.lineTo(x - 9, base - 16); c.arc(x, base - 16, 9, Math.PI, 0); c.lineTo(x + 9, base); c.closePath(); }, 0.7);
  });
}

function frozenFalls(ctx, t, camX) {
  const x = drift(120, camX, 0.08, 50);
  const top = GROUND_Y - 120; const base = GROUND_Y - 30;
  far(ctx, 0.85, () => {
    shape(ctx, '#8aa4bc', (c) => { c.moveTo(x - 50, base); c.lineTo(x - 40, top - 10); c.lineTo(x - 14, top); c.lineTo(x - 14, base); c.closePath(); }, 0.7);
    shape(ctx, '#8aa4bc', (c) => { c.moveTo(x + 50, base); c.lineTo(x + 42, top - 6); c.lineTo(x + 14, top); c.lineTo(x + 14, base); c.closePath(); }, 0.7);
    shape(ctx, ICE, (c) => {
      c.moveTo(x - 14, top);
      for (let k = 0; k <= 7; k++) c.lineTo(x - 14 + k * 4, base + (k % 2 ? -6 : 2));
      c.lineTo(x + 14, top); c.closePath();
    }, 0.7);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1;
    for (const dx of [-8, -1, 6]) { ctx.beginPath(); ctx.moveTo(x + dx, top + 4); ctx.lineTo(x + dx + 1, base - 10); ctx.stroke(); }
    // A glint travelling down the ice.
    const g = (t * 0.4) % 1;
    ctx.fillStyle = '#ffffff'; ctx.globalAlpha *= 1 - g;
    ctx.fillRect(x - 2, top + g * (base - top - 10), 3, 3);
  });
}

function gondola(ctx, t, camX) {
  const y0 = 50; const y1 = 130;
  ctx.strokeStyle = 'rgba(70,98,126,0.8)'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(-10, y0); ctx.lineTo(W + 10, y1); ctx.stroke();
  for (let i = 0; i < 2; i++) {
    const u = ((t * 0.035 + i * 0.5) % 1);
    const x = -10 + u * (W + 20); const y = y0 + u * (y1 - y0);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 9); ctx.stroke();
    shape(ctx, i ? '#e8503a' : '#f6c23c', rect(x - 7, y + 9, 14, 11, 3));
    ctx.fillStyle = '#dff0fa'; ctx.fillRect(x - 5, y + 11, 4, 4); ctx.fillRect(x + 1, y + 11, 4, 4);
  }
}

function logCabin(ctx, t, camX) {
  const x = drift(340, camX, 0.3, 32);
  const base = GROUND_Y - 4;
  shape(ctx, '#8a5a3a', rect(x - 24, base - 22, 48, 22), 0.8);
  ctx.strokeStyle = 'rgba(60,34,20,0.5)'; ctx.lineWidth = 0.6;
  for (let y = base - 18; y < base; y += 4) { ctx.beginPath(); ctx.moveTo(x - 24, y); ctx.lineTo(x + 24, y); ctx.stroke(); }
  shape(ctx, SNOW, (c) => { c.moveTo(x - 30, base - 20); c.lineTo(x, base - 40); c.lineTo(x + 30, base - 20); c.quadraticCurveTo(x, base - 24, x - 30, base - 20); }, 0.8);
  shape(ctx, '#6a4030', rect(x + 10, base - 42, 6, 12), 0.7);
  ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#ffe6a0'; ctx.beginPath(); ctx.arc(x - 10, base - 11, 9, 0, TAU); ctx.fill(); ctx.restore();
  shape(ctx, '#ffd870', rect(x - 14, base - 15, 8, 7), 0.6);
  // Smoke curling off the chimney.
  ctx.save(); ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 5; i++) {
    const k = ((t * 0.3 + i / 5) % 1);
    ctx.globalAlpha = 0.6 * (1 - k);
    ctx.beginPath(); ctx.arc(x + 13 + k * 18 + Math.sin(k * 6 + t) * 3, base - 46 - k * 40, 2.5 + k * 5, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function wolves(ctx, t, camX) {
  const x = drift(200, camX, 0.1, 60);
  const ridge = GROUND_Y - 84;
  const WOLF = '#3f5670';
  far(ctx, 0.95, () => {
    [[-26, 1.5], [0, 1.8], [24, 1.4]].forEach(([dx, s], i) => {
      const howl = i === 1 ? -0.75 : Math.sin(t * 0.8 + i) * 0.12;
      ctx.save(); ctx.translate(x + dx, ridge + Math.abs(dx) * 0.15); ctx.scale(s, s);
      // Side view facing right, feet on y = 0.
      shape(ctx, WOLF, oval(0, -6, 6, 2.6), 0);
      shape(ctx, WOLF, oval(4, -6.6, 3, 3.2), 0);
      ctx.fillStyle = WOLF;
      for (const lx of [-4.6, -3, 3, 4.6]) ctx.fillRect(lx - 0.6, -5, 1.2, 5);
      shape(ctx, WOLF, (c) => { c.moveTo(-5.5, -7.5); c.quadraticCurveTo(-9, -7, -10.5, -3.5); c.quadraticCurveTo(-8, -5, -5.5, -5.5); c.closePath(); }, 0);
      ctx.translate(6, -8.5); ctx.rotate(howl);
      shape(ctx, WOLF, (c) => {
        c.moveTo(-1.5, 1); c.lineTo(0.5, -1.6); c.lineTo(0.8, -4.2); c.lineTo(2, -2); c.lineTo(3, -2);
        c.lineTo(6, -1.2); c.lineTo(6, 0); c.lineTo(3, 0.6); c.lineTo(1.5, 2.5); c.closePath();
      }, 0);
      ctx.restore();
    });
  });
}

function reindeer(ctx, t, camX) {
  const base = GROUND_Y - 38;
  far(ctx, 0.75, () => {
    for (let i = 0; i < 5; i++) {
      const x = ((i * 42 + t * 26) % (W + 120)) - 60;
      const bob = Math.abs(Math.sin(t * 8 + i)) * 1.5;
      const y = base + (i % 2) * 5 - bob;
      shape(ctx, '#6a5446', oval(x, y, 7, 3.2), 0);
      shape(ctx, '#6a5446', oval(x + 7, y - 4, 2.6, 2), 0);
      ctx.strokeStyle = '#6a5446'; ctx.lineWidth = 1;
      const s = Math.sin(t * 8 + i) * 2;
      ctx.beginPath();
      ctx.moveTo(x - 4, y + 2); ctx.lineTo(x - 4 - s, y + 7); ctx.moveTo(x + 4, y + 2); ctx.lineTo(x + 4 + s, y + 7);
      ctx.moveTo(x + 5, y - 2); ctx.lineTo(x + 7, y - 4);
      ctx.moveTo(x + 7, y - 5); ctx.lineTo(x + 5, y - 10); ctx.lineTo(x + 3, y - 12); ctx.moveTo(x + 5, y - 10); ctx.lineTo(x + 8, y - 12);
      ctx.stroke();
    }
  });
}

function skatingPond(ctx, t, camX) {
  const x = drift(250, camX, 0.2, 72);
  const y = GROUND_Y - 22;
  shape(ctx, '#d2ecfa', oval(x, y, 70, 9), 0.7);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.ellipse(x, y, 40, 4, 0, 0.3, 2.6); ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const a = t * 0.9 + i * 2.1;
    const sx = x + Math.cos(a) * 44; const sy = y + Math.sin(a) * 5 - 1;
    const col = ['#e8503a', '#3a78c8', '#f6c23c'][i];
    shape(ctx, col, rect(sx - 1.5, sy - 8, 3, 6, 1), 0);
    shape(ctx, '#f0d8c0', oval(sx, sy - 9.5, 1.6, 1.6), 0);
    ctx.strokeStyle = INK; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(sx, sy - 2); ctx.lineTo(sx - 2, sy + 1); ctx.moveTo(sx, sy - 2); ctx.lineTo(sx + 2 * Math.sign(Math.sin(a)), sy); ctx.stroke();
  }
}

// ---------------------------------------------------------------- the lane
function igloo(ctx, t, x, g) {
  shape(ctx, SNOW, (c) => { c.moveTo(x - 10, g); c.arc(x, g, 10, Math.PI, 0); c.closePath(); });
  ctx.strokeStyle = 'rgba(70,98,126,0.45)'; ctx.lineWidth = 0.5;
  for (const r of [3.5, 7]) { ctx.beginPath(); ctx.moveTo(x - Math.sqrt(100 - r * r), g - r); ctx.lineTo(x + Math.sqrt(100 - r * r), g - r); ctx.stroke(); }
  shape(ctx, '#58728e', (c) => { c.moveTo(x + 3, g); c.arc(x + 6, g, 3, Math.PI, 0); c.closePath(); }, 0.5);
}

function penguin(ctx, t, x, g) {
  // Waddles toward the hero; a second form would belly-SLIDE fast (see note).
  const w = Math.sin(t * 10) * 0.18;
  ctx.save(); ctx.translate(x, g); ctx.rotate(w);
  shape(ctx, '#2a3446', oval(0, -7, 5, 7));
  shape(ctx, '#ffffff', oval(-1, -6, 3, 5.2), 0);
  shape(ctx, '#2a3446', oval(0, -13.5, 3.8, 3.4));
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(-1.4, -14, 0.9, 0, TAU); ctx.fill();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(-1.6, -14, 0.45, 0, TAU); ctx.fill();
  shape(ctx, '#f6a23c', (c) => { c.moveTo(-3.5, -13.5); c.lineTo(-6.5, -12.8); c.lineTo(-3.5, -12.3); c.closePath(); }, 0.3);
  shape(ctx, '#f6a23c', oval(-2, -0.4, 2.2, 0.9), 0.3);
  ctx.restore();
}

function iceCrystals(ctx, t, x, g) {
  const spikes = [[-5, 10, -0.35], [0, 15, 0], [5, 11, 0.3], [-2, 7, -0.15], [3, 8, 0.15]];
  for (const [dx, h, a] of spikes) {
    ctx.save(); ctx.translate(x + dx, g); ctx.rotate(a);
    shape(ctx, 'rgba(191,226,246,0.9)', (c) => { c.moveTo(-2.2, 0); c.lineTo(-2, -h * 0.8); c.lineTo(0, -h); c.lineTo(2, -h * 0.8); c.lineTo(2.2, 0); c.closePath(); }, 0.6);
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(-1.2, -h * 0.75, 0.8, h * 0.6);
    ctx.restore();
  }
  const tw = (Math.sin(t * 2.3) + 1) / 2;
  ctx.fillStyle = `rgba(255,255,255,${tw})`; ctx.fillRect(x - 0.5, g - 15, 1, 1);
}

function snowball(ctx, t, x, g) {
  // Rolling toward the hero and GROWING — a jump that gets harder the longer you wait.
  const r = 5 + (Math.sin(t * 0.6) + 1) * 2.5;
  const x2 = x + Math.sin(t * 0.6) * 12;
  shape(ctx, SNOW, oval(x2, g - r, r, r));
  ctx.save(); ctx.translate(x2, g - r); ctx.rotate(-t * 4);
  ctx.strokeStyle = 'rgba(70,98,126,0.35)'; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0.2, 1.6); ctx.stroke();
  ctx.fillStyle = '#6a5446'; ctx.fillRect(r * 0.3, -r * 0.5, 1.4, 1.4); ctx.fillRect(-r * 0.5, r * 0.2, 1.2, 1.2);
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (let i = 0; i < 3; i++) ctx.fillRect(x2 + r + 1 + i * 2, g - 1 - (i % 2), 1.2, 1.2);
}

function sled(ctx, t, x, g) {
  shape(ctx, '#c8402e', rect(x - 9, g - 6, 18, 3.5, 1));
  ctx.strokeStyle = '#8a5a3a'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x - 9, g - 1); ctx.lineTo(x + 7, g - 1); ctx.quadraticCurveTo(x + 11, g - 1, x + 10, g - 5); ctx.stroke();
  ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x - 6, g - 2.5); ctx.lineTo(x - 6, g - 1); ctx.moveTo(x + 4, g - 2.5); ctx.lineTo(x + 4, g - 1); ctx.stroke();
  shape(ctx, '#3a78c8', rect(x - 7, g - 11, 9, 5, 1), 0.6);
  shape(ctx, '#f6c23c', rect(x + 1, g - 10, 6, 4, 1), 0.6);
}

function frozenBarrel(ctx, t, x, g) {
  shape(ctx, 'rgba(191,226,246,0.85)', rect(x - 8, g - 16, 16, 16, 2));
  shape(ctx, '#e88a3a', (c) => { c.moveTo(x - 5, g - 8); c.quadraticCurveTo(x, g - 12, x + 3, g - 8); c.lineTo(x + 6, g - 11); c.lineTo(x + 6, g - 5); c.lineTo(x + 3, g - 8); c.quadraticCurveTo(x, g - 4, x - 5, g - 8); }, 0.5);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x - 3, g - 8.5, 0.6, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(x - 6, g - 14, 1.2, 10); ctx.fillRect(x - 4, g - 14, 3, 1.2);
}

function yeti(ctx, t, x, g) {
  const breathe = Math.sin(t * 2) * 0.6;
  shape(ctx, SNOW, (c) => {
    c.moveTo(x - 8, g); c.lineTo(x - 9, g - 14 - breathe); c.quadraticCurveTo(x - 9, g - 24 - breathe, x, g - 24 - breathe);
    c.quadraticCurveTo(x + 9, g - 24 - breathe, x + 9, g - 14 - breathe); c.lineTo(x + 8, g); c.closePath();
  });
  shape(ctx, '#9cc0dc', oval(x, g - 18 - breathe, 4.5, 3.5), 0.5);
  ctx.fillStyle = INK; for (const dx of [-1.6, 1.6]) { ctx.beginPath(); ctx.arc(x + dx, g - 19 - breathe, 0.7, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1.8, g - 16.6 - breathe, 1, 1.2); ctx.fillRect(x + 0.8, g - 16.6 - breathe, 1, 1.2);
  const arm = Math.sin(t * 3) * 0.3;
  for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(x + s * 8, g - 16 - breathe); ctx.rotate(s * (0.3 + arm));
    shape(ctx, SNOW, rect(-2.2, 0, 4.4, 10, 2), 0.7); ctx.restore();
  }
}

function icicles(ctx, t, x, g) {
  // Hung from an ice bridge over the lane: SLIDE under — or they drop on a beat.
  for (const dx of [-22, 18]) shape(ctx, 'rgba(214,236,250,0.55)', rect(x + dx, g - 32, 4, 32, 1), 0.5, 'rgba(70,98,126,0.5)');
  shape(ctx, '#d6ecfa', rect(x - 22, g - 34, 44, 6, 2), 0.7);
  ctx.fillStyle = '#f4faff'; ctx.fillRect(x - 20, g - 35, 40, 2);
  const drop = (t % 2.4) > 1.8 ? ((t % 2.4) - 1.8) * 40 : 0;
  [[-15, 8], [-9, 12], [-3, 16], [3, 14], [9, 10], [15, 7]].forEach(([dx, h], i) => {
    const dy = i === 2 ? Math.min(drop, 26) : 0;
    shape(ctx, 'rgba(191,226,246,0.95)', (c) => { c.moveTo(x + dx - 2.2, g - 28 + dy); c.lineTo(x + dx, g - 28 + h + dy); c.lineTo(x + dx + 2.2, g - 28 + dy); c.closePath(); }, 0.6);
  });
}

// ---------------------------------------------------------------- the air
function snowyOwl(ctx, t, x, y) {
  const flap = Math.sin(t * 6);
  y += Math.sin(t * 1.5) * 2;
  shape(ctx, SNOW, (c) => { c.moveTo(x - 2, y - 1); c.quadraticCurveTo(x - 10, y - 4 - flap * 6, x - 14, y + 1 - flap * 4); c.quadraticCurveTo(x - 8, y + 1, x - 2, y + 2); }, 0.6);
  shape(ctx, SNOW, (c) => { c.moveTo(x + 2, y - 1); c.quadraticCurveTo(x + 10, y - 4 - flap * 6, x + 14, y + 1 - flap * 4); c.quadraticCurveTo(x + 8, y + 1, x + 2, y + 2); }, 0.6);
  shape(ctx, SNOW, oval(x, y, 4.5, 5), 0.7);
  ctx.fillStyle = '#f6c23c'; for (const dx of [-1.6, 1.6]) { ctx.beginPath(); ctx.arc(x + dx, y - 1.5, 1.1, 0, TAU); ctx.fill(); }
  ctx.fillStyle = INK; for (const dx of [-1.6, 1.6]) ctx.fillRect(x + dx - 0.35, y - 1.9, 0.7, 0.8);
  ctx.fillStyle = 'rgba(70,98,126,0.5)'; ctx.fillRect(x - 2, y + 1.5, 1, 1); ctx.fillRect(x + 1, y + 2.5, 1, 1);
}

function snowCloud(ctx, t, x, y) {
  // A little grumpy cloud that tracks the hero and dumps a flurry — a Lakitu for frost.
  y -= 8;
  shape(ctx, '#f0f6fc', (c) => { c.arc(x - 6, y, 5, 0, TAU); c.moveTo(x + 11, y); c.arc(x + 6, y, 5, 0, TAU); c.moveTo(x + 7, y - 4); c.arc(x, y - 4, 7, 0, TAU); }, 0.7);
  shape(ctx, '#f0f6fc', oval(x, y + 1, 10, 4), 0);
  ctx.fillStyle = INK; ctx.fillRect(x - 3, y - 3, 1.2, 1.2); ctx.fillRect(x + 2, y - 3, 1.2, 1.2);
  ctx.fillRect(x - 3.5, y - 4.5, 2, 0.6); ctx.fillRect(x + 1.8, y - 4.5, 2, 0.6);
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 8; i++) {
    const k = (t * 1.2 + i / 8) % 1;
    ctx.fillRect(x - 8 + (i * 2.3) % 16, y + 5 + k * 26, 1.3, 1.3);
  }
}

export const FROST_IDEAS = [
  { id: 'fortress', place: 'bg', name: 'THE fortress — an ice palace', paint: iceFortress,
    note: 'The hills carry small dark keeps; this is the one the cabinet is named for. Ice towers and pennants on the horizon, nearer each level — frost-3 could END at its gate.' },
  { id: 'falls', place: 'bg', name: 'Frozen waterfall', paint: frozenFalls,
    note: 'A waterfall stopped mid-fall between two cliffs, a glint running down the ice.' },
  { id: 'gondola', place: 'bg', name: 'SHIPS · Ski gondola', paint: gondola,
    note: 'Cable cars crossing the sky on a long diagonal — slow, constant motion high in the frame.' },
  { id: 'cabin', place: 'bg', name: 'Log cabin, smoking chimney', paint: logCabin,
    note: 'Warm window, snow on the roof, smoke curling off. The one warm colour on the cabinet.' },
  { id: 'wolves', place: 'bg', name: 'Wolves on a ridge', paint: wolves,
    note: 'Three silhouettes on a far ridge, one howling. Could howl on the last bar before a checkpoint.' },
  { id: 'reindeer', place: 'bg', name: 'SHIPS · Reindeer herd', paint: reindeer,
    note: 'A herd galloping across the far snowfield, overtaking you — the sleigh\'s cousins, with no sleigh.' },
  { id: 'pond', place: 'bg', name: 'Skating pond', paint: skatingPond,
    note: 'A frozen pond by the road with little skaters circling — life in the background.' },
  { id: 'igloo', place: 'lane', name: 'Igloo (obstacle)', paint: igloo,
    note: 'A snow-block dome to jump. A second, bigger one for the tall slot where the big snowman stands now.' },
  { id: 'penguin', place: 'lane', name: 'Penguin (moving)', paint: penguin,
    note: 'Waddles toward you; in a second form it BELLY-SLIDES in fast along the ice. Stompable, pops out a coin.' },
  { id: 'crystals', place: 'lane', name: 'SHIPS · Ice crystal cluster', paint: iceCrystals,
    note: 'Sharp, glinting and breakable — shatters into ice debris like the snowman does into snow.' },
  { id: 'snowball', place: 'lane', name: 'Rolling snowball', paint: snowball, zoom: 4,
    note: 'Rolls at you and GROWS as it comes: jump it early while it is small.' },
  { id: 'sled', place: 'lane', name: 'Parked sled', paint: sled,
    note: 'A red sled loaded with presents — the sleigh\'s cargo, fallen off. Break it for coins.' },
  { id: 'barrel', place: 'lane', name: 'Fish frozen in ice', paint: frozenBarrel,
    note: 'A block of ice with a surprised fish in it. Breakable; the fish flops out.' },
  { id: 'yeti', place: 'lane', name: 'Yeti', paint: yeti,
    note: 'A tall one, the big-snowman slot, waving its arms. Could stand up out of a snowbank as you approach.' },
  { id: 'icicles', place: 'lane', name: 'Icicle bridge (slide)', paint: icicles, zoom: 3,
    note: 'An ice arch over the lane with icicles hanging to head height — frost\'s own SLIDE-under. One drops on the beat.' },
  { id: 'owl', place: 'air', name: 'Snowy owl (flyer)', paint: snowyOwl,
    note: 'Replaces the drone on frost: white, golden-eyed, gliding at drone height.' },
  { id: 'cloud', place: 'air', name: 'Grumpy snow cloud (flyer)', paint: snowCloud, zoom: 4,
    note: 'Hovers over the lane and dumps a flurry — a hazard column you run under, like a small blizzard.' },
];
