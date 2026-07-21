// CONCEPT PAGE — not wired into the game.
// Renders the current Kirby-style Poyo (via the REAL drawToon) beside a new
// Pikachu-style variant (drawPika, defined locally here). Pure display: nothing
// in src/ is touched. Built by scratchpad bundling into galleries/.
import { drawToon } from '../src/sprites/toons.js';

// ---- pikachu palette -------------------------------------------------------
const PK = {
  body: '#ff6f5e',   // coral
  belly: '#ffc4b8',  // lighter coral underside
  ear: '#7a4bb0',    // PURPLE ear tips (callback to original Poyo)
  tuft: '#7a4bb0',   // purple cowlick curl
  cheek: '#ff4d7d',  // pink cheeks
  eye: '#2a1622',    // near-black
  shine: '#ffffff',
  mouth: '#8e2f42',
  tailStar: '#7a4bb0', // purple star tip, matches the ears
  outline: '#5a2018',  // dark coral-brown outline
};

// A couple of coral fine-tunes (cheek/accent brightness). Idle + run of each.
const BODY_OPTIONS = [
  { name: 'Coral (rose cheeks)', body: '#ff6f5e', belly: '#ffb9ac', ear: '#7a4bb0', tuft: '#7a4bb0', tailStar: '#7a4bb0', cheek: '#8e2f52', mouth: '#8e2f42', outline: '#5a2018' },
  { name: 'Coral (pink cheeks)', body: '#ff6f5e', belly: '#ffc4b8', ear: '#7a4bb0', tuft: '#7a4bb0', tailStar: '#7a4bb0', cheek: '#ff4d7d', mouth: '#8e2f42', outline: '#5a2018' },
  { name: 'Coral + gold accents', body: '#ff6f5e', belly: '#ffb9ac', ear: '#f5c518', tuft: '#f5c518', tailStar: '#f5c518', cheek: '#8e2f52', mouth: '#8e2f42', outline: '#5a2018' },
];

let OUT = PK.outline; // current outline color; drawPika sets it per palette
function outlined(ctx, fill, ow, pathFn) {
  ctx.beginPath();
  pathFn(ctx);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = ow;
  ctx.lineJoin = 'round';
  ctx.stroke();
}
function dot(ctx, x, y, r, fill) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
}

// Expression cribbed from the blob's clock so the concept blinks/grins on the
// same cadence the real toons do.
function pikaExpr(pose) {
  const t = pose.time || 0;
  const blink = (t % 3.3) < 0.12;
  const joy = pose.kind === 'celebrate';
  const cheer = joy && Math.sin(t * 7) > 0.3;
  const surprise = pose.float || pose.kind === 'jump';
  return { blink, joy, cheer, surprise };
}

function pikaEyes(ctx, u, cx, cy, ex) {
  const sep = 0.11 * u;
  if (ex.blink) {
    ctx.strokeStyle = PK.eye; ctx.lineWidth = Math.max(0.9, 0.025 * u); ctx.lineCap = 'round';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * sep - 0.04 * u, cy);
      ctx.quadraticCurveTo(cx + sx * sep, cy + 0.02 * u, cx + sx * sep + 0.04 * u, cy);
      ctx.stroke();
    }
    return;
  }
  if (ex.joy && !ex.cheer) {
    // ^ ^ delight eyes
    ctx.strokeStyle = PK.eye; ctx.lineWidth = Math.max(1, 0.03 * u); ctx.lineCap = 'round';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * sep - 0.045 * u, cy + 0.02 * u);
      ctx.quadraticCurveTo(cx + sx * sep, cy - 0.06 * u, cx + sx * sep + 0.045 * u, cy + 0.02 * u);
      ctx.stroke();
    }
    return;
  }
  const rY = ex.surprise ? 0.085 : 0.07;
  for (const sx of [-1, 1]) {
    outlined(ctx, PK.eye, Math.max(0.5, 0.012 * u), (c) =>
      c.ellipse(cx + sx * sep, cy, 0.05 * u, rY * u, 0, 0, Math.PI * 2));
    dot(ctx, cx + sx * sep - 0.016 * u, cy - 0.022 * u, 0.02 * u, PK.shine);
  }
}

// ---- the pikachu-style poyo ------------------------------------------------
// Same silhouette language as the blob rig (round body, arm nubs, feet stubs),
// re-skinned: long black-tipped ears, red cheeks, a lightning-bolt tail.
function drawPika(ctx, cx, feetY, h, pose = {}, palette = {}) {
  const C = { ...PK, ...palette };
  OUT = C.outline;
  const u = h;
  const ow = Math.max(0.5, 0.02 * h);
  const t = pose.time || 0;
  const ph = (pose.phase || 0) * Math.PI * 2;
  const kind = pose.kind || 'idle';
  const duck = kind === 'duck';

  let rx = 0.36 * u, ry = 0.37 * u, cy = -0.42 * u;
  let sx = 1, sy = 1;
  if (kind === 'jump') { sy = 1.16; sx = 0.9; }
  if (kind === 'run') { const b = Math.sin(2 * ph) * 0.03 * u; ry += b; rx -= b * 0.7; }
  if (kind === 'idle') { cy -= 0.015 * u * (1 + Math.sin(t * 3)) * 0.5; }
  if (duck) { rx = 0.42 * u; ry = 0.24 * u; cy = -0.24 * u; }
  const celebrate = kind === 'celebrate';
  if (celebrate) { const b = Math.sin(t * 7); ry *= 1 + 0.1 * b; rx *= 1 - 0.08 * b; cy -= 0.03 * u * Math.max(0, b); }

  ctx.save();
  ctx.translate(cx, feetY);
  ctx.scale(sx, sy);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const earsUp = !duck;
  const armsUp = celebrate || pose.float;

  // --- tail (behind body): a curved stalk topped with a little star ---------
  // Deliberately NOT a lightning bolt — reads as its own character. The runner
  // travels left->right, so the tail trails on the LEFT (mirror the geometry).
  if (!duck) {
    const wag = Math.sin(t * 4 + (kind === 'run' ? ph : 0)) * 0.05;
    ctx.save();
    ctx.translate(-rx * 0.7, cy + ry * 0.35);
    ctx.scale(-1, 1);
    const s = u;
    // curved yellow stalk sweeping up-and-out
    ctx.strokeStyle = C.outline;
    ctx.lineCap = 'round';
    ctx.lineWidth = 0.12 * s + ow * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0.02 * s);
    ctx.quadraticCurveTo(0.16 * s, -0.02 * s, 0.20 * s, -0.20 * s + wag * s);
    ctx.stroke();
    ctx.strokeStyle = C.body;
    ctx.lineWidth = 0.12 * s;
    ctx.stroke();
    // 5-point star at the tip
    const tx = 0.20 * s, ty = -0.24 * s + wag * s, R = 0.11 * s, r = 0.045 * s;
    outlined(ctx, C.tailStar, ow * 0.9, (c) => {
      for (let i = 0; i < 10; i++) {
        const ang = -Math.PI / 2 + (i * Math.PI) / 5;
        const rad = i % 2 ? r : R;
        const px = tx + Math.cos(ang) * rad, py = ty + Math.sin(ang) * rad;
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.closePath();
    });
    ctx.restore();
  }

  // --- ears (behind head, poking up) ----------------------------------------
  // Shorter and rounder than a mouse's, with a rounded PURPLE bulb tip.
  if (earsUp) {
    for (const side of [-1, 1]) {
      const baseX = side * rx * 0.5;
      const baseY = cy - ry * 0.78;
      const lean = side * 0.12 * u;              // ears splay outward
      const wob = celebrate ? 0.03 * u * Math.max(0, Math.sin(t * 7)) : 0;
      const tipX = baseX + lean + side * 0.06 * u;
      const tipY = baseY - 0.36 * u - wob;
      const halfBase = 0.11 * u, halfTip = 0.075 * u;
      // one rounded-bulb ear path, reused for the yellow body and purple cap
      const earPath = (c) => {
        c.moveTo(baseX - side * halfBase, baseY + 0.02 * u);
        c.quadraticCurveTo(baseX + lean * 0.3 - side * halfTip, (baseY + tipY) / 2,
          tipX - side * halfTip, tipY + 0.03 * u);
        c.quadraticCurveTo(tipX + side * 0.005 * u, tipY - 0.07 * u,   // rounded tip
          tipX + side * halfTip, tipY + 0.03 * u);
        c.quadraticCurveTo(baseX + lean * 0.5 + side * halfTip, (baseY + tipY) / 2,
          baseX + side * halfBase, baseY + 0.02 * u);
        c.closePath();
      };
      outlined(ctx, C.body, ow, earPath);
      // purple cap: clip to the ear, fill the top ~45%
      ctx.save();
      ctx.beginPath(); earPath(ctx); ctx.clip();
      ctx.fillStyle = C.ear;
      ctx.beginPath();
      ctx.rect(tipX - 0.2 * u, tipY - 0.1 * u, 0.4 * u, 0.26 * u);
      ctx.fill();
      ctx.restore();
      // re-stroke the outline over the cap seam
      ctx.strokeStyle = C.outline; ctx.lineWidth = ow;
      ctx.beginPath(); earPath(ctx); ctx.stroke();
    }
    // --- cowlick tuft between the ears: a small gold curl --------------------
    const tuftY = cy - ry * 0.88;
    const sway = Math.sin(t * 3 + 1) * 0.02 * u + (kind === 'run' ? Math.sin(ph) * 0.012 * u : 0);
    outlined(ctx, C.tuft, ow * 0.9, (c) => {
      c.moveTo(-0.055 * u, tuftY + 0.04 * u);
      c.quadraticCurveTo(-0.075 * u, tuftY - 0.10 * u, 0.01 * u + sway, tuftY - 0.15 * u);
      c.quadraticCurveTo(0.065 * u + sway, tuftY - 0.17 * u, 0.055 * u + sway * 0.6, tuftY - 0.10 * u);
      c.quadraticCurveTo(0.03 * u, tuftY - 0.10 * u, 0.04 * u, tuftY - 0.04 * u);
      c.quadraticCurveTo(0.05 * u, tuftY + 0.01 * u, 0.055 * u, tuftY + 0.04 * u);
      c.closePath();
    });
  }

  // --- feet stubs -----------------------------------------------------------
  const step = kind === 'run' ? Math.sin(ph) * 0.06 * u : 0;
  outlined(ctx, C.body, ow, (c) => c.ellipse(-0.14 * u + step, -0.03 * u, 0.08 * u, 0.05 * u, 0, 0, Math.PI * 2));
  outlined(ctx, C.body, ow, (c) => c.ellipse(0.14 * u - step, -0.03 * u, 0.08 * u, 0.05 * u, 0, 0, Math.PI * 2));

  // --- body -----------------------------------------------------------------
  outlined(ctx, C.body, ow, (c) => c.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2));
  // lighter belly
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = C.belly;
  ctx.beginPath();
  ctx.ellipse(0, cy + ry * 0.42, rx * 0.72, ry * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // --- arm nubs -------------------------------------------------------------
  const nubY = armsUp ? cy - ry * 0.5 : cy + ry * 0.2;
  outlined(ctx, C.body, ow * 0.9, (c) => c.arc(-rx - 0.005 * u, nubY, 0.08 * u, 0, Math.PI * 2));
  outlined(ctx, C.body, ow * 0.9, (c) => c.arc(rx + 0.005 * u, nubY, 0.08 * u, 0, Math.PI * 2));

  // --- face -----------------------------------------------------------------
  const ex = pikaExpr(pose);
  // The whole face rides a little vertical bounce on the run (twice per stride,
  // in step with the feet), so the head no longer floats stiff above the legs.
  const faceBob = kind === 'run' ? Math.sin(2 * ph) * 0.03 * u : 0;
  const faceY = cy - ry * 0.08 + faceBob;
  pikaEyes(ctx, u, 0, faceY, ex);
  // Cheeks: soft mass, so they lag the head slightly (secondary motion) and
  // squash on the down-beat — a real jiggle instead of sitting stone-still.
  const jig = kind === 'run' ? Math.sin(2 * ph - 0.7) : 0;
  const cheekY = faceY + 0.11 * u + jig * 0.035 * u;
  const cheekRx = 0.055 * u * (1 + jig * 0.2);
  const cheekRy = 0.055 * u * (1 - jig * 0.2);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 0.24 * u, cheekY, cheekRx, cheekRy, 0, 0, Math.PI * 2);
    ctx.fillStyle = C.cheek; ctx.fill();
  }
  // nose + mouth
  dot(ctx, 0, faceY + 0.08 * u, 0.012 * u, PK.eye);
  ctx.strokeStyle = C.mouth; ctx.lineWidth = Math.max(0.8, 0.02 * u); ctx.lineCap = 'round';
  if (ex.joy || ex.surprise) {
    // open happy mouth
    outlined(ctx, C.mouth, Math.max(0.6, 0.014 * u), (c) =>
      c.ellipse(0, faceY + 0.15 * u, 0.05 * u, ex.cheer ? 0.06 * u : 0.04 * u, 0, 0, Math.PI * 2));
  } else {
    // 3-stroke smile (w shape)
    ctx.beginPath();
    ctx.moveTo(-0.05 * u, faceY + 0.12 * u);
    ctx.quadraticCurveTo(-0.025 * u, faceY + 0.16 * u, 0, faceY + 0.13 * u);
    ctx.quadraticCurveTo(0.025 * u, faceY + 0.16 * u, 0.05 * u, faceY + 0.12 * u);
    ctx.stroke();
  }

  ctx.restore();
}

// ---- page framework --------------------------------------------------------
const root = document.getElementById('root');
const tiles = [];

function poseObj(kind, t) {
  return {
    kind, phase: (t * 1.6) % 1, time: t, vy: kind === 'jump' ? -160 : 0,
    grounded: kind !== 'jump', squash: 0, facing: 1,
    menu: kind === 'celebrate' ? true : undefined,
  };
}

function makeTile(row, label, w, h, draw) {
  const card = document.createElement('div');
  card.className = 'card';
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.style.width = w * 4 + 'px';
  canvas.style.height = h * 4 + 'px';
  const cap = document.createElement('div');
  cap.className = 'cap';
  cap.textContent = label;
  card.append(canvas, cap);
  row.appendChild(card);
  const ctx = canvas.getContext('2d');
  tiles.push({ ctx, canvas, draw });
}

const HH = 54;
const KINDS = ['idle', 'run', 'jump', 'duck', 'celebrate'];

function block(title, note, drawFor) {
  const sec = document.createElement('section');
  sec.innerHTML = `<h2>${title}</h2><p class="note">${note}</p>`;
  const row = document.createElement('div');
  row.className = 'row';
  sec.appendChild(row);
  root.appendChild(sec);
  for (const kind of KINDS) {
    const th = kind === 'celebrate' ? HH * 1.7 : HH * 1.55;
    makeTile(row, kind, HH * 1.0, th, (ctx, t) => {
      drawFor(ctx, kind, t, th);
    });
  }
}

block('Current Poyo — Kirby-style blob', 'The real drawToon(\'mochi\') as it ships today.',
  (ctx, kind, t, th) => {
    drawToon(ctx, 'mochi', poseObj(kind, t), (HH * 1.0) / 2, th - HH * 0.06, HH);
  });

block('Proposed Poyo — its own character', 'Concept drawPika(): coral body with PURPLE accents (ear tips, small cowlick, star tail) — the purple nods to the original Poyo. Pink cheeks that bob + squash on the run. Not wired into the game.',
  (ctx, kind, t, th) => {
    drawPika(ctx, (HH * 1.0) / 2, th - HH * 0.06, HH, poseObj(kind, t));
  });

// --- body color options -----------------------------------------------------
{
  const sec = document.createElement('section');
  sec.innerHTML = `<h2>Coral fine-tunes</h2><p class="note">Cheek brightness and purple-vs-gold accents. Idle + run of each.</p>`;
  const row = document.createElement('div');
  row.className = 'row';
  sec.appendChild(row);
  root.appendChild(sec);
  const OH = 60;
  for (const opt of BODY_OPTIONS) {
    const th = OH * 1.55;
    makeTile(row, opt.name, OH * 1.7, th, (ctx, t) => {
      drawPika(ctx, OH * 0.5, th - OH * 0.06, OH, poseObj('idle', t), opt);
      drawPika(ctx, OH * 1.2, th - OH * 0.06, OH, poseObj('run', t), opt);
    });
  }
}

// bigger side-by-side hero shot
{
  const sec = document.createElement('section');
  sec.innerHTML = `<h2>Side by side — idle</h2><p class="note">Same size, same baseline.</p>`;
  const row = document.createElement('div');
  row.className = 'row';
  sec.appendChild(row);
  root.appendChild(sec);
  const BH = 96;
  makeTile(row, 'Kirby-style (current)', BH * 1.1, BH * 1.7, (ctx, t) =>
    drawToon(ctx, 'mochi', poseObj('idle', t), BH * 0.55, BH * 1.6, BH));
  makeTile(row, 'Pikachu-style (concept)', BH * 1.1, BH * 1.7, (ctx, t) =>
    drawPika(ctx, BH * 0.55, BH * 1.6, BH, poseObj('idle', t)));
  makeTile(row, 'Pikachu — celebrate', BH * 1.1, BH * 1.9, (ctx, t) =>
    drawPika(ctx, BH * 0.55, BH * 1.7, BH, poseObj('celebrate', t)));
}

function paint(tile, t) {
  const { ctx, canvas } = tile;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  try { tile.draw(ctx, t); } catch (e) { console.error(e); }
}

let start = performance.now();
function frame(now) {
  const t = Math.max(0, (now - start) / 1000);
  for (const tile of tiles) paint(tile, t);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
