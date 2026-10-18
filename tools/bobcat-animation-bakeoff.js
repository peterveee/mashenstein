import { BOBCAT_ANIMATION_CANDIDATES, drawBobcatAnimationStudy } from '../src/dev/bobcat-animation-candidates.js';
const cards = BOBCAT_ANIMATION_CANDIDATES.map(cand => {
  const card = document.createElement('article');
  const h = document.createElement('h2'); h.textContent = `${cand.id} — ${cand.name}`;
  const p = document.createElement('p'); p.textContent = cand.note;
  const canvas = document.createElement('canvas');
  card.append(h, p, canvas); document.querySelector('main').append(card);
  return { cand, canvas };
});
let playing = !matchMedia('(prefers-reduced-motion: reduce)').matches, t = 0, last = null, phase = null;
const play = document.querySelector('#play'), scrub = document.querySelector('#phase');
function label() { play.textContent = playing ? 'Pause' : 'Play'; }
play.onclick = () => { playing = !playing; phase = null; label(); };
scrub.oninput = () => { playing = false; phase = Number(scrub.value) / 16; label(); draw(); };
document.querySelector('#step').onclick = () => {
  playing = false; phase = ((phase == null ? 0 : Math.round(phase * 16)) + 1) % 16 / 16;
  scrub.value = phase * 16; label(); draw();
};
function draw() {
  for (const { cand, canvas } of cards) {
    const cssW = canvas.clientWidth || 640;
    const cssH = cssW * 360 / 640;
    const density = Math.max(2, window.devicePixelRatio || 1);
    const rw = Math.round(cssW * density), rh = Math.round(cssH * density);
    if (canvas.width !== rw || canvas.height !== rh) { canvas.width = rw; canvas.height = rh; }
    const g = canvas.getContext('2d'); g.setTransform(rw / 640, 0, 0, rh / 360, 0, 0);
    drawBobcatAnimationStudy(g, t, cand, 640, 360, phase);
  }
}
function tick(now) {
  if (playing && last != null) t += Math.min((now - last) / 1000, .08) * Number(document.querySelector('#speed').value);
  last = now; draw(); requestAnimationFrame(tick);
}
window.bobcatBakeoff = {
  freeze(p = .25) { playing = false; phase = p; scrub.value = Math.floor(p * 16); label(); draw(); },
  candidates: BOBCAT_ANIMATION_CANDIDATES.map(c => c.id),
};
label(); requestAnimationFrame(tick);
