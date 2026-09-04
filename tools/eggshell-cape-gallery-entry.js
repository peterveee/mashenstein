import { eggshellCopterArt } from '../src/sprites/props.js';
import { EGGSHELL_CAPES } from '../src/dev/eggshell-redesigns.js';

const root = document.getElementById('root');
const LOGICAL_W = 200, LOGICAL_H = 96, DENSITY = 6;
const BOX = 36, GROUND_Y = 82, DETAIL_X = 106, DETAIL_W = 88, DETAIL_H = 86;
const DETAIL_SCALE = Math.min(DETAIL_W / BOX, DETAIL_H / BOX);
const DETAIL_SIZE = BOX * DETAIL_SCALE;

function frameAt(t) {
  return Math.floor(t * 2 * 24) % 12;
}

function label(ctx, text, x, y, align = 'left') {
  ctx.fillStyle = 'rgba(255,255,255,.62)';
  ctx.font = '4px ui-monospace, monospace';
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

function paint(canvas, candidate, t) {
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  ctx.scale(DENSITY, DENSITY);

  ctx.fillStyle = '#20283c';
  ctx.fillRect(0, 0, 100, LOGICAL_H);
  ctx.fillStyle = '#262c3c';
  ctx.fillRect(DETAIL_X - 6, 0, LOGICAL_W - DETAIL_X + 6, LOGICAL_H);
  ctx.strokeStyle = 'rgba(255,255,255,.14)';
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(0, GROUND_Y + 6); ctx.lineTo(100, GROUND_Y + 6); ctx.stroke();

  const bob = Math.sin(t * 2.4) * 1.5;
  const bx = 44, by = GROUND_Y - 10 - BOX + bob;
  label(ctx, 'LANE · 36u', 4, 7);
  ctx.save(); ctx.translate(bx, by);
  eggshellCopterArt(ctx, BOX, BOX, frameAt(t), {
    parts: candidate.parts, mastTo: candidate.mastTo, hy: candidate.hy,
  });
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.3)';
  ctx.lineWidth = 0.45;
  ctx.setLineDash([1.5, 1.5]); ctx.strokeRect(bx, by, BOX, BOX); ctx.setLineDash([]);

  label(ctx, `DETAIL ${DETAIL_SCALE.toFixed(1)}x`, DETAIL_X, 5);
  ctx.save();
  ctx.translate(DETAIL_X + (DETAIL_W - DETAIL_SIZE) / 2, 6 + (DETAIL_H - DETAIL_SIZE) / 2);
  eggshellCopterArt(ctx, DETAIL_SIZE, DETAIL_SIZE, frameAt(t), {
    parts: candidate.parts, mastTo: candidate.mastTo, hy: candidate.hy,
  });
  ctx.restore();
}

const cards = EGGSHELL_CAPES.map((candidate) => {
  const card = document.createElement('article');
  card.className = 'card';
  const title = document.createElement('h2');
  title.textContent = candidate.label;
  const note = document.createElement('p');
  note.textContent = `${candidate.id} · ${candidate.note}`;
  const canvas = document.createElement('canvas');
  canvas.width = LOGICAL_W * DENSITY;
  canvas.height = LOGICAL_H * DENSITY;
  canvas.title = `${candidate.label} — click to save PNG`;
  canvas.addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = `${candidate.id}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  });
  card.append(title, note, canvas);
  root.appendChild(card);
  return { candidate, canvas };
});

const start = performance.now();
function animate(now) {
  const t = (now - start) / 1000;
  for (const card of cards) paint(card.canvas, card.candidate, t);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
