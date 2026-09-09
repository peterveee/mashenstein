// The page behind dist/fernwick-hair.html — see build-fernwick-hair-bakeoff.js.
//
// Every option is the shipped Fernwick drawn by the shipped painter, differing
// only in `spec.hairStreaks` (src/dev/fernwick-hair-candidates.js). Each card
// shows the head at the size a look is JUDGED at, the figure at the size it is
// PLAYED at, and the 24u lane sprite at 2x, because a strand that reads
// beautifully on the crop can vanish or turn into a smear on the sprite, and
// the sprite is the one that ships.
import { drawToon, poseFromPlayer } from '../src/sprites/toons.js';
import { HERO_BY_ID } from '../src/data/heroes.js';
import { FERNWICK_HAIR_CANDIDATES, FERNWICK_HAIR_PALETTES } from '../src/dev/fernwick-hair-candidates.js';

const control = (id) => document.getElementById(id);
const hero = HERO_BY_ID.fernwick;
const CYCLE = 1.6;
let time = 0.18, paused = false, last = null;
const tiles = [];

for (const candidate of FERNWICK_HAIR_CANDIDATES) {
  const article = document.createElement('article');
  const title = document.createElement('h2');
  title.textContent = candidate.name;
  const note = document.createElement('p');
  note.textContent = candidate.note;
  const canvas = document.createElement('canvas');
  article.append(title, note, canvas);
  document.querySelector('main').append(article);
  tiles.push({ candidate, article, canvas, visible: true });
}

// A long sheet only rasterizes the cards near the viewport.
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) for (const tile of tiles) if (tile.article === entry.target) tile.visible = entry.isIntersecting;
}, { rootMargin: '400px' });
for (const article of document.querySelectorAll('article')) observer.observe(article);

function makePose() {
  const mode = control('pose').value;
  const airborne = mode === 'jump';
  const pose = poseFromPlayer({
    hero, anim: time * 1.6, grounded: !airborne, jumps: airborne ? 1 : 0,
    vy: airborne ? 220 * Math.cos(time * 3) : 0,
  }, time);
  if (mode === 'stand') { pose.kind = 'stand'; pose.headTurn = 0; }
  pose.facing = Number(control('facing').value);
  return pose;
}

function palFor(candidate) {
  const swatch = FERNWICK_HAIR_PALETTES.find((v) => v.id === control('palette').value);
  if (!swatch?.pal && !candidate.pal) return null;
  return { ...(candidate.pal || {}), ...(swatch?.pal || {}) };
}

function paint(force = false) {
  const pose = makePose();
  for (const tile of tiles) {
    if (!force && !tile.visible) continue;
    const { canvas, candidate } = tile;
    const ctx = canvas.getContext('2d');
    const width = canvas.clientWidth;
    if (!width) continue;
    // The whole card is drawn through one scale, so a zoomed sheet is the same
    // layout inspected closer rather than a second set of sizes to keep in step.
    const z = Number(control("zoom").value);
    // HEADS ONLY drops the figure and the lane sprite and keeps the head, so
    // eleven options fit one screen and can be compared as a set. Every
    // judgement about whether a mark survives still comes off the full card.
    const heads = control('view').value === 'heads';
    const height = Math.round((heads ? 210 : 300) * z);
    const density = window.devicePixelRatio || 1;
    const px = Math.round(width * density), py = Math.round(height * density);
    if (canvas.width !== px || canvas.height !== py) { canvas.width = px; canvas.height = py; }
    // The card GROWS with the zoom rather than squashing the same box: a
    // zoomed sheet that keeps its height is a cropped sheet.
    if (canvas.style.height !== height + 'px') canvas.style.height = height + 'px';
    ctx.setTransform(density * z, 0, 0, density * z, 0, 0);
    ctx.clearRect(0, 0, width / z, height / z);
    const opts = { spec: candidate.spec, pal: palFor(candidate) };
    // The head, large. NOT drawToonFace: the HUD crop is cut tight to the
    // face and takes the top off the crown, which is where half of these
    // options do their work. This is the shipped figure drawn big and clipped
    // to a frame with the head in it, so what is judged is the hair as painted
    // and not a crop of it.
    const face = 168;
    ctx.save();
    ctx.beginPath();
    ctx.rect(14, 18, face, face);
    ctx.clip();
    const tall = face * 1.4;
    drawToon(ctx, 'fernwick', pose, 14 + face / 2, 18 + face * 0.52 + tall * 0.855, tall, opts);
    ctx.restore();
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#93a0b4';
    if (heads) { ctx.fillText('HEAD', 14 + face / 2, 200); continue; }
    // The figure at the size it is played at, and the lane sprite beside it.
    drawToon(ctx, 'fernwick', pose, 14 + face + 92, 250, 166, opts);
    ctx.save();
    ctx.translate(14 + face + 190, 250);
    ctx.scale(2, 2);
    drawToon(ctx, 'fernwick', pose, 0, 0, 24, opts);
    ctx.restore();
    ctx.fillText('HEAD', 14 + face / 2, 274);
    ctx.fillText('GAMEPLAY', 14 + face + 92, 274);
    ctx.fillText('LANE 24u ×2', 14 + face + 190, 274);
  }
}

function setPaused(value) { paused = value; control('play').textContent = paused ? 'Play' : 'Pause'; }
control('play').onclick = () => setPaused(!paused);
control('phase').oninput = () => { setPaused(true); time = Number(control('phase').value) * CYCLE; paint(true); };
for (const id of ['pose', 'facing', 'palette', 'zoom', 'view']) control(id).onchange = () => {
  // One column once a zoomed card carries the whole row, or the layout crops
  // the zoom away. A heads-only sheet is narrow enough to stay in its grid,
  // which is the point of it.
  document.querySelector('main').classList.toggle('wide',
    Number(control('zoom').value) > 1 && control('view').value === 'full');
  paint(true);
};
for (const swatch of FERNWICK_HAIR_PALETTES) {
  const option = document.createElement('option');
  option.value = swatch.id; option.textContent = swatch.name;
  control('palette').append(option);
}

function frame(now) {
  if (!paused && last !== null) time += Math.min((now - last) / 1000, 0.05);
  last = now;
  control('phase').value = (time % CYCLE) / CYCLE;
  paint();
  requestAnimationFrame(frame);
}
window.hairBakeoff = {
  freeze(t = 0.18, pose = 'stand', palette = 'stock', zoom = 1, view = 'full') {
    time = t; setPaused(true);
    control('view').value = view;
    control('pose').value = pose; control('palette').value = palette;
    control('zoom').value = String(zoom);
    document.querySelector('main').classList.toggle('wide', zoom > 1 && view === 'full');
    paint(true);
  },
};
requestAnimationFrame(frame);
