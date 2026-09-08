import { drawToon, TOON_SPECS } from '../src/sprites/toons.js';

let paused = false, time = 0.18, last = null;
const control = (id) => document.getElementById(id);
const tiles = ['gary', 'dolores'].map((id) => {
  const card = document.createElement('article');
  const heading = document.createElement('h2');
  heading.textContent = id === 'gary' ? 'Gary' : 'Dolores';
  const canvas = document.createElement('canvas');
  card.append(heading, canvas); document.querySelector('main').append(card);
  return { id, canvas };
});

function paint() {
  const selected = control('pose').value;
  const kind = selected === 'raised' ? 'celebrate' : ['walk', 'shoot'].includes(selected) ? 'run' : selected;
  const facing = Number(control('facing').value);
  const pose = {
    kind, phase: (time * 1.6) % 1, time, facing,
    grounded: kind !== 'jump', vy: kind === 'jump' ? -180 * Math.cos(time * 3) : 0,
    squash: 0, lean: 0,
    walk: selected === 'walk',
    ...(selected === 'shoot' ? { menuAction: 'aim', actionTime: time % 0.3 } : {}),
    ...(selected === 'raised' ? { celebrateStyle: 'legacy' } : {}),
  };
  for (const { id, canvas } of tiles) {
    const ctx = canvas.getContext('2d');
    const width = canvas.clientWidth, density = window.devicePixelRatio || 1;
    const pixels = Math.round(width * density), height = Math.round(480 * density);
    if (canvas.width !== pixels || canvas.height !== height) { canvas.width = pixels; canvas.height = height; }
    ctx.setTransform(density, 0, 0, density, 0, 0); ctx.clearRect(0, 0, width, 480);
    ctx.textAlign = 'center'; ctx.font = '14px system-ui';
    for (const [i, smooth] of [false, true].entries()) {
      const x = width * (0.25 + i * 0.5);
      ctx.fillStyle = smooth ? '#acd8b4' : '#bdc5d0';
      ctx.fillText(smooth ? 'SMOOTH JOIN' : 'CURRENT', x, 26);
      const spec = { ...TOON_SPECS[id], ...(selected === 'shoot' ? { pistol: 'single' } : {}) };
      const opts = { spec: smooth ? { ...spec, shoulderJoinPreview: 'smooth' } : spec };
      drawToon(ctx, id, pose, x, 306, Math.min(236, width * 0.39), opts);
      ctx.fillStyle = '#aeb9c9'; ctx.font = '12px system-ui';
      ctx.fillText('GAMEPLAY SIZE', x, 358);
      ctx.save(); ctx.translate(x, 437); ctx.scale(2, 2);
      drawToon(ctx, id, pose, 0, 0, 24, opts); ctx.restore();
    }
  }
}
function setPaused(value) {
  paused = value; control('play').textContent = paused ? 'Play' : 'Pause';
}
control('play').onclick = () => setPaused(!paused);
control('phase').oninput = () => { setPaused(true); time = Number(control('phase').value) / 1.6; paint(); };
for (const id of ['pose', 'facing']) control(id).onchange = paint;
function frame(now) {
  if (!paused && last !== null) time += Math.min((now - last) / 1000, 0.05) * Number(control('speed').value);
  last = now; control('phase').value = (time * 1.6) % 1;
  paint(); requestAnimationFrame(frame);
}
// Deterministic screenshot/animation checks, using the same UI render path.
window.shoulderPreview = {
  freeze(t = 0.18, pose = 'run', facing = 1) {
    time = t; setPaused(true); control('pose').value = pose; control('facing').value = facing; paint();
  },
};
requestAnimationFrame(frame);
