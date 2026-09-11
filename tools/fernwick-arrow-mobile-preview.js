import { drawRangedProjectile, drawToon, TOON_SPECS } from '../src/sprites/toons.js';

const CANDIDATES = [
  {
    id: 'current',
    title: 'CURRENT',
    note: 'Shipped geometry · shaft 1.00 · head 1.00 · fletch 1.00',
    spec: {},
  },
  {
    id: 'broadhead',
    title: 'BROADHEAD · SHIPPED',
    note: 'Approved mobile read · shaft 1.25 · head 1.30 · fletch 1.15',
    spec: { arrowShaft: 1.25, arrowHead: 1.3, arrowVane: 1.15 },
  },
  {
    id: 'signal',
    title: 'SIGNAL',
    note: 'Maximum separation · shaft 1.35 · head 1.45 · fletch 1.35',
    spec: { arrowShaft: 1.35, arrowHead: 1.45, arrowVane: 1.35 },
  },
];

const W = 312, EXACT_H = 84, STUDY_H = 132;
const pose = (actionTime) => ({
  kind: 'run', phase: 0.2, time: 0.2, grounded: true, facing: 1,
  menuAction: 'aim', actionTime, squash: 0, lean: 0,
});

function grid(ctx, w, h, scale = 1) {
  ctx.fillStyle = '#111a22'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#30414b'; ctx.lineWidth = 1 / scale;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 6) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
  for (let y = 0; y <= h; y += 6) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
  ctx.stroke();
  ctx.strokeStyle = '#81949b'; ctx.setLineDash([3 / scale, 3 / scale]);
  ctx.strokeRect(0.5 / scale, 0.5 / scale, w - 1 / scale, h - 1 / scale);
  ctx.setLineDash([]);
}

function arrow(ctx, candidate, x, y, scale = 1) {
  drawRangedProjectile(ctx, 'arrow', x, y, {
    hero: 'fernwick', flying: true, rot: -0.16,
    scale: 1,
    shaftScale: candidate.spec.arrowShaft,
    headScale: candidate.spec.arrowHead,
    vaneScale: candidate.spec.arrowVane,
  });
  if (scale === 1) {
    ctx.fillStyle = '#9bb0b4'; ctx.font = '8px ui-monospace, monospace';
    ctx.fillText('FLIGHT', x - 15, y + 18);
  }
}

function renderCard(canvas, candidate, zoom) {
  const scale = zoom;
  const logicalW = W;
  const logicalH = zoom === 1 ? EXACT_H : STUDY_H;
  canvas.width = W * scale; canvas.height = logicalH * scale;
  canvas.style.width = `${W}px`; canvas.style.height = `${logicalH}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = false;
  grid(ctx, logicalW, logicalH, scale);
  ctx.fillStyle = '#9bb0b4'; ctx.font = `${8 / scale}px ui-monospace, monospace`;
  ctx.fillText(zoom === 1 ? 'EXACT 24u' : '4x INSPECTION', 7, 12);

  const feet = zoom === 1 ? 69 : 111;
  const left = zoom === 1 ? 50 : 78;
  const right = zoom === 1 ? 166 : 205;
  const h = 24;
  const spec = { ...TOON_SPECS.fernwick, ...candidate.spec };
  drawToon(ctx, 'fernwick', pose(0.17), left, feet, h, { spec });
  arrow(ctx, candidate, right, zoom === 1 ? 40 : 63, scale);
  ctx.fillStyle = '#d8e4d5'; ctx.font = `${8 / scale}px ui-monospace, monospace`;
  ctx.fillText('HELD', left - 10, feet + 10);
  ctx.fillText('FLYING', right - 15, (zoom === 1 ? 40 : 63) + 28);
  if (zoom !== 1) {
    // The second hero is the same candidate at the release edge, where the
    // arrow's head and feathers must survive the first frame after the hand.
    drawToon(ctx, 'fernwick', pose(0.185), 148, feet, h, { spec });
    arrow(ctx, candidate, 182, 63, scale);
    ctx.fillStyle = '#9bb0b4'; ctx.fillText('RELEASE', 133, feet + 10);
  }
}

for (const candidate of CANDIDATES) {
  const article = document.createElement('article');
  article.className = `candidate candidate-${candidate.id}`;
  article.innerHTML = `<h2>${candidate.title}</h2><p>${candidate.note}</p>`;
  const exact = document.createElement('canvas');
  const study = document.createElement('canvas');
  article.append(exact, study);
  document.querySelector('main').append(article);
  renderCard(exact, candidate, 1);
  renderCard(study, candidate, 4);
}

window.fernwickArrowPreview = { candidates: CANDIDATES.map(({ id, title, note }) => ({ id, title, note })) };
