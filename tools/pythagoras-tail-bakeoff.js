import { PYTHAGORAS_TAIL_CANDIDATES, drawPythagorasTailStudy } from '../src/dev/pythagoras-tail-candidates.js';

const cards = PYTHAGORAS_TAIL_CANDIDATES.map(candidate => {
  const article = document.createElement('article');
  const heading = document.createElement('h2'); heading.textContent = `${candidate.id} — ${candidate.name}`;
  const note = document.createElement('p'); note.textContent = candidate.note;
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-label', heading.textContent);
  article.append(heading, note, canvas); document.querySelector('main').append(article);
  return { candidate, canvas };
});
let playing = !matchMedia('(prefers-reduced-motion: reduce)').matches, t = 0, last = null;
const play = document.querySelector('#play'), scrub = document.querySelector('#phase');
function label() { play.textContent = playing ? 'Pause' : 'Play'; }
play.onclick = () => { playing = !playing; label(); };
scrub.oninput = () => { playing = false; t = Number(scrub.value) / 12; label(); draw(); };
document.querySelector('#step').onclick = () => {
  playing = false; t = ((Math.round(t * 12) + 1) % 24) / 12;
  scrub.value = Math.round(t * 12); label(); draw();
};
function draw() {
  for (const { candidate, canvas } of cards) {
    const width = canvas.clientWidth || 640;
    const density = Math.max(2, devicePixelRatio || 1);
    const rw = Math.round(width * density), rh = Math.round(width * 360 / 640 * density);
    if (canvas.width !== rw || canvas.height !== rh) { canvas.width = rw; canvas.height = rh; }
    const ctx = canvas.getContext('2d'); ctx.setTransform(rw / 640, 0, 0, rh / 360, 0, 0);
    drawPythagorasTailStudy(ctx, t, candidate, 640, 360, { smooth: document.querySelector('#cadence').value === 'smooth' });
  }
}
function tick(now) {
  if (playing && last != null) {
    t = (t + Math.min((now - last) / 1000, 0.08) * Number(document.querySelector('#speed').value)) % 2;
    scrub.value = Math.floor(t * 12);
  }
  last = now; draw(); requestAnimationFrame(tick);
}
window.pythagorasTailBakeoff = {
  freeze(seconds = 0.25) { playing = false; t = seconds; label(); draw(); },
  candidates: PYTHAGORAS_TAIL_CANDIDATES.map(c => c.id),
};
label(); requestAnimationFrame(tick);
