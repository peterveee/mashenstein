import { drawToon, TOON_SPECS, poseFromPlayer, BOW_AIM_T, supportsShoulderJoinPreview } from '../src/sprites/toons.js';
import { HEROES } from '../src/data/heroes.js';
import { RUSTY_W3B, PANDA_PAL } from '../src/dev/hero-candidates.js';

const control = (id) => document.getElementById(id);
const rows = new Map(HEROES.map((hero) => [hero.id, hero]));
rows.set('rusty', { id: 'rusty', short: 'RUSTY · CANDIDATE', ability: { type: 'shoot', label: 'BAMBOO THROW' } });
const ids = [...Object.keys(TOON_SPECS)];
ids.splice(ids.indexOf('gnash') + 1, 0, 'rusty');
const names = { gary: 'GARY', dolores: 'DOLORES', mochi: 'MOCHI', chompo: 'MISS CHOMP' };
const notes = {
  fernwick: 'Fitted near-arm socket and gown shoulder join; the quiver sling follows the socket. Hand targets and far arm retained.',
  grumpos: 'Returning axe: the current pose removes the back-mounted axe; there is no separate throwing-arm gesture.',
  raymn: 'Rocket fist: the current pose detaches the glove. There is no connected shoulder to alter.',
  lorenzo: 'Ground attack: wrench smash. Switch attack to airborne to inspect the stomp.',
  gnash: 'Spin dash uses the current running lean; it is not a shooting pose.',
  rusty: 'Uses Rusty’s selected candidate rig and its existing cane draw/throw.',
  mochi: 'No shooting animation. Idle shown in the attack column.',
  gary: 'No shooting animation. Idle shown in the attack column.',
  dolores: 'No shooting animation. Idle shown in the attack column.',
  chompo: 'Existing bite animation; no projectile shot.',
};
const CYCLE_SECONDS = 1.6;
let time = 0.18, paused = false, last = null;
const tiles = [];
for (const id of ids) {
  const hero = rows.get(id) || { id, short: names[id] || id.toUpperCase() };
  const spec = id === 'rusty' ? RUSTY_W3B : TOON_SPECS[id];
  const eligible = supportsShoulderJoinPreview(spec);
  const article = document.createElement('article'); article.dataset.hero = id;
  const title = document.createElement('h2'); title.textContent = hero.short;
  const description = document.createElement('p');
  description.textContent = `${eligible ? 'Near-arm join preview' : 'Existing shoulder treatment · special rig or garment'}. ${notes[id] || ''}`;
  article.append(title, description);
  const grid = document.createElement('div'); grid.className = 'poses'; article.append(grid);
  for (const mode of ['run', 'jump', 'shoot']) {
    const panel = document.createElement('section'); panel.dataset.pose = mode;
    const heading = document.createElement('h3');
    heading.textContent = mode === 'shoot' ? (hero.ability?.label || (id === 'chompo' ? 'BITE' : 'NO SHOOT ANIMATION')) : mode.toUpperCase();
    const canvas = document.createElement('canvas');
    panel.append(heading, canvas); grid.append(panel);
    tiles.push({ id, hero, spec, eligible, mode, panel, canvas, article, visible: true });
  }
  document.querySelector('main').append(article);
  const option = document.createElement('option'); option.value = id; option.textContent = hero.short;
  control('character').append(option);
}
// A long cast sheet should only rasterize the rows near the viewport.
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) for (const tile of tiles) if (tile.article === entry.target) tile.visible = entry.isIntersecting;
}, { rootMargin: '400px' });
for (const article of document.querySelectorAll('article')) observer.observe(article);

function makePose(tile) {
  const { id, hero, mode } = tile;
  const attack = mode === 'shoot';
  const type = hero.ability?.type || (id === 'chompo' ? 'eat' : null);
  const q = ((time % CYCLE_SECONDS) + CYCLE_SECONDS) % CYCLE_SECONDS;
  const budget = type === 'bow' ? BOW_AIM_T : type === 'eat' ? 0.5 : 0.3;
  const airborne = mode === 'jump' || (attack && type && control('attack').value === 'air');
  const active = attack && !!type && q < budget;
  const pose = poseFromPlayer({
    hero, anim: time * 1.6, grounded: !airborne, jumps: airborne ? 1 : 0,
    vy: airborne ? 220 * Math.cos(time * 3) : 0,
    powerType: type, powerPoseT: active ? budget - q : 0,
    dashT: attack && type === 'dash' ? Math.max(0, 0.4 - q) : 0,
    fistThrown: attack && type === 'fist' && q < 0.85,
    axeThrown: attack && (type === 'axe' || id === 'rusty') && q >= (id === 'rusty' ? 0.2 : 0) && q < 0.85,
    abilityCd: attack && q < 0.85 ? 1 : 0,
    stomping: active && type === 'stomp' && airborne,
  }, time);
  if (attack && !type) { pose.kind = 'stand'; pose.headTurn = 0; }
  pose.facing = Number(control('facing').value);
  if (mode === 'run') pose.walk = control('gait').value === 'walk';
  return pose;
}
function paint(force = false) {
  const character = control('character').value, selected = control('pose').value;
  for (const tile of tiles) {
    const show = (character === 'all' || character === tile.id) && (selected === 'all' || selected === tile.mode);
    tile.article.hidden = character !== 'all' && character !== tile.id;
    tile.panel.hidden = selected !== 'all' && selected !== tile.mode;
    if (tile.mode === 'run') {
      const heading = tile.panel.querySelector('h3'), label = control('gait').value.toUpperCase();
      if (heading.textContent !== label) heading.textContent = label;
    }
    if (!show || (!force && !tile.visible)) continue;
    const { canvas, id, spec, eligible } = tile;
    const ctx = canvas.getContext('2d'), width = canvas.clientWidth;
    if (!width) continue;
    const close = selected !== 'all', viewHeight = close ? 480 : 350;
    const density = window.devicePixelRatio || 1;
    const pixels = Math.round(width * density), height = Math.round(viewHeight * density);
    if (canvas.width !== pixels || canvas.height !== height) { canvas.width = pixels; canvas.height = height; }
    ctx.setTransform(density, 0, 0, density, 0, 0); ctx.clearRect(0, 0, width, viewHeight);
    const pose = makePose(tile);
    for (const [i, smooth] of [false, true].entries()) {
      const x = width * (0.25 + i * 0.5);
      ctx.textAlign = 'center'; ctx.font = '11px system-ui';
      ctx.fillStyle = smooth && eligible ? '#acd8b4' : '#bdc5d0';
      ctx.fillText(smooth ? (eligible ? 'SMOOTH JOIN' : 'UNCHANGED') : 'CURRENT', x, 18);
      const opts = { spec: smooth ? { ...spec, shoulderJoinPreview: 'smooth' } : spec,
        ...(id === 'rusty' ? { pal: PANDA_PAL } : {}) };
      drawToon(ctx, id, pose, x, close ? 306 : 232, Math.min(close ? 236 : 166, width * 0.39), opts);
      ctx.fillStyle = '#aeb9c9'; ctx.fillText('GAMEPLAY SIZE', x, close ? 358 : 266);
      ctx.save(); ctx.translate(x, close ? 437 : 335); ctx.scale(2, 2);
      drawToon(ctx, id, pose, 0, 0, 24, opts); ctx.restore();
    }
  }
}
function setPaused(value) { paused = value; control('play').textContent = paused ? 'Play' : 'Pause'; }
// Frame numbers match the contact sheets: 32 frames per cycle, #0 at phase 0.
const FRAMES = 32;
const frameOf = () => Math.floor((((time % CYCLE_SECONDS) + CYCLE_SECONDS) % CYCLE_SECONDS) / CYCLE_SECONDS * FRAMES + 1e-6) % FRAMES;
function showFrame() {
  const n = frameOf();
  control('frame').value = paused ? `#${n}` : `#${n} ~`;
  control('frame').title = `phase ${(frameOf() / FRAMES).toFixed(4)} · ${FRAMES} frames per cycle`;
}
function stepFrame(delta) {
  setPaused(true);
  const n = (frameOf() + delta + FRAMES) % FRAMES;
  time = n / FRAMES * CYCLE_SECONDS;
  control('phase').value = n / FRAMES;
  showFrame(); paint(true);
}
control('play').onclick = () => { setPaused(!paused); showFrame(); };
control('prev').onclick = () => stepFrame(-1);
control('next').onclick = () => stepFrame(1);
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.key === 'ArrowLeft') stepFrame(-1);
  else if (e.key === 'ArrowRight') stepFrame(1);
  else if (e.key === ' ') { e.preventDefault(); setPaused(!paused); showFrame(); }
});
control('phase').oninput = () => { setPaused(true); time = Number(control('phase').value) * CYCLE_SECONDS; showFrame(); paint(true); };
for (const id of ['character', 'pose', 'facing', 'gait', 'attack']) control(id).onchange = () => {
  document.querySelector('main').classList.toggle('single-pose', control('pose').value !== 'all'); paint(true);
};
function frame(now) {
  if (!paused && last !== null) time += Math.min((now - last) / 1000, 0.05) * Number(control('speed').value);
  last = now; control('phase').value = (time % CYCLE_SECONDS) / CYCLE_SECONDS;
  showFrame();
  paint(); requestAnimationFrame(frame);
}
window.shoulderPreview = {
  freeze(t = 0.18, pose = 'all', facing = 1, character = 'all') {
    time = t; setPaused(true); control('pose').value = pose; control('facing').value = facing; control('character').value = character;
    document.querySelector('main').classList.toggle('single-pose', pose !== 'all'); showFrame(); paint(true);
  },
  poses() { return tiles.map(tile => ({ id: tile.id, mode: tile.mode, eligible: tile.eligible, pose: makePose(tile) })); },
};
requestAnimationFrame(frame);
