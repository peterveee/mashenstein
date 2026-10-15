// The cat SFX bench's page (tools/cat-sfx-bench.js serves it). Every slider is a field
// of a shape in engine/audio.js — SWIPE_SHAPES for the paw, MEOW_SHAPES for the meows
// and hisses — and Play fires the REAL cue through the real engine with that shape, so
// what you hear here is what the game would play. COPY gives the line to paste back.
import { Audio, SWIPE_SHAPES, MEOW_SHAPES, CAT_SWIPE_DEFAULT, CAT_MEOW } from '../src/engine/audio.js';

const CUES = {
  catSwipe: { label: 'SWIPE', shapes: SWIPE_SHAPES, start: CAT_SWIPE_DEFAULT, params: [
    ['level', 0.1, 4, 0.01], ['dur', 0.05, 1.5, 0.01], ['f0', 100, 6000, 10], ['f1', 100, 8000, 10], ['f2', 100, 6000, 10],
    ['peakAt', 0.05, 0.95, 0.01], ['q', 0.3, 12, 0.1], ['air', 0, 1.5, 0.01], ['body', 0, 2, 0.01], ['tone', 0, 1, 0.01],
    ['pan', 0, 1, 0.01], ['claws', 0, 6, 1], ['clawAt', 0, 1, 0.01], ['clawGap', 0.005, 0.08, 0.001],
    ['clawHz', 800, 9000, 50], ['clawLevel', 0, 2, 0.01], ['ring', 0, 1.5, 0.01], ['ringHz', 800, 8000, 10],
  ] },
  catMeow: { label: 'MEOW / HISS', shapes: MEOW_SHAPES, start: CAT_MEOW, params: [
    ['level', 0.1, 4, 0.01], ['dur', 0.05, 2, 0.01], ['f0', 80, 1200, 1], ['p0', 0.4, 2, 0.01], ['p1', 0.4, 2, 0.01], ['p2', 0.4, 2, 0.01],
    ['peakAt', 0.05, 0.95, 0.01], ['f1a', 150, 2500, 10], ['f1b', 150, 2500, 10], ['f1c', 150, 2500, 10],
    ['f2a', 400, 4500, 10], ['f2b', 400, 4500, 10], ['f2c', 400, 4500, 10], ['rough', 0, 1, 0.01], ['roughHz', 4, 120, 1],
    ['sub', 0, 1, 0.01], ['dist', 0, 1, 0.01], ['breath', 0, 1, 0.01], ['hiss', 0, 1.5, 0.01], ['hissHz', 1000, 9000, 50],
    ['hissRise', 0.005, 0.5, 0.005], ['hissHold', 0, 1, 0.01], ['spit', 0, 1.5, 0.01], ['spitAt', 0, 1, 0.01],
  ] },
};

let cue = 'catSwipe';
let shape = {};
let pitch = 1;
const $ = (h) => { const d = document.createElement('div'); d.innerHTML = h.trim(); return d.firstChild; };
document.body.append($(`<div id="app">
  <h1>CAT SFX BENCH</h1>
  <div class="row">
    <span class="seg" id="cues"></span>
    <select id="preset"></select>
    <button id="play">PLAY <small>(space)</small></button>
    <label class="chk"><input type="checkbox" id="auto" checked> play on change</label>
  </div>
  <div id="sliders"></div>
  <div class="row"><label class="lab">pitch</label><input type="range" id="pitch" min="0.5" max="2" step="0.01" value="1"><span id="pitchV">1.00</span>
    <label class="chk"><input type="checkbox" id="voice"> voice (meow only)</label></div>
  <pre id="out"></pre>
  <div class="row"><button id="copy">COPY</button><span id="copied"></span></div>
</div>`));

function line() {
  const body = Object.entries(shape).map(([k, v]) => `${k}: ${typeof v === 'number' ? +v.toFixed(4) : JSON.stringify(v)}`).join(', ');
  return `  mine: { ${body} },`;
}
function show() { document.getElementById('out').textContent = `${cue === 'catSwipe' ? 'SWIPE_SHAPES' : 'MEOW_SHAPES'}\n${line()}`; }

async function play() {
  Audio.ensure();
  if (Audio.ctx.state !== 'running') await Audio.ctx.resume();
  if (Audio.mixer) await Audio.mixer.ready;
  Audio.sfx(cue, { shape: { ...shape }, pitch });
}

function build() {
  const C = CUES[cue];
  const cues = document.getElementById('cues');
  cues.innerHTML = '';
  for (const [id, c] of Object.entries(CUES)) {
    const b = $(`<button class="${id === cue ? 'on' : ''}">${c.label}</button>`);
    b.onclick = () => { cue = id; load(CUES[id].start); };
    cues.append(b);
  }
  const sel = document.getElementById('preset');
  sel.innerHTML = Object.keys(C.shapes).map((k) => `<option ${k === sel.dataset.cur ? 'selected' : ''}>${k}</option>`).join('');
  const box = document.getElementById('sliders');
  box.innerHTML = '';
  for (const [k, lo, hi, step] of C.params) {
    const v = shape[k] ?? 0;
    const r = $(`<div class="row"><label class="lab">${k}</label><input type="range" min="${lo}" max="${hi}" step="${step}" value="${v}"><span class="val">${v}</span></div>`);
    const input = r.querySelector('input'), val = r.querySelector('.val');
    input.oninput = () => { shape[k] = Number(input.value); val.textContent = input.value; show(); };
    input.onchange = () => { if (document.getElementById('auto').checked) play(); };
    box.append(r);
  }
  const voice = document.getElementById('voice');
  voice.disabled = cue !== 'catMeow';
  voice.checked = cue === 'catMeow' && shape.voice !== false;
  show();
}
function load(name) {
  const C = CUES[cue];
  shape = { ...C.shapes[name] };
  // A hiss has no voice fields; borrow the rowr's, so ticking VOICE on has a voice to play.
  const base = cue === 'catMeow' ? MEOW_SHAPES.rowr : {};
  for (const [k] of C.params) if (shape[k] == null) shape[k] = base[k] ?? 0;
  document.getElementById('preset').dataset.cur = name;
  build();
}

document.getElementById('preset').onchange = (e) => { load(e.target.value); play(); };
document.getElementById('play').onclick = play;
document.getElementById('pitch').oninput = (e) => { pitch = Number(e.target.value); document.getElementById('pitchV').textContent = pitch.toFixed(2); };
document.getElementById('pitch').onchange = () => { if (document.getElementById('auto').checked) play(); };
document.getElementById('voice').onchange = (e) => { if (e.target.checked) delete shape.voice; else shape.voice = false; show(); play(); };
document.getElementById('copy').onclick = async () => {
  const text = line();
  try { await navigator.clipboard.writeText(text); document.getElementById('copied').textContent = ' copied'; }
  catch { document.getElementById('copied').textContent = ' (select the text above)'; }
};
addEventListener('keydown', (e) => { if (e.code === 'Space' && e.target.tagName !== 'SELECT') { e.preventDefault(); play(); } });
load(CUES[cue].start);
