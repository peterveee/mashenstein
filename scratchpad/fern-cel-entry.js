// Frame-strip of hero celebration cycles. Static frames so the whole routine
// can be read at once instead of watched. Nothing in src/ is touched.
import { drawToon } from '../src/sprites/toons.js';

const CYCLE = 2.6;
const SEED = { lorenzo: 0.2, gnash: 1.1, fernwick: 2.4, b33p: 3.2, mochi: 4.1, chompo: 5.3, gary: 0.8, raymn: 2.9, grumpos: 4.7, dolores: 1.7 };

const root = document.getElementById('root');

function pose(kind, t, extra = {}) {
  return {
    kind, phase: (t * 1.6) % 1, time: t, vy: 0,
    grounded: true, squash: 0, lean: 0, roll: false, float: false,
    stomp: false, headless: false, facing: 1, ...extra,
  };
}

function strip(title, note, id, extra = {}, opts = {}) {
  const N = opts.n || 8;
  const HH = opts.hh || 220;
  const off = (SEED[id] || 0) * 0.4;
  const sec = document.createElement('section');
  sec.innerHTML = `<h2>${title}</h2><p class="note">${note}</p>`;
  const row = document.createElement('div');
  row.className = 'row';
  sec.appendChild(row);
  root.appendChild(sec);
  const from = opts.from == null ? 0 : opts.from;
  const to = opts.to == null ? 1 : opts.to;
  for (let i = 0; i < N; i++) {
    const c = from + (to - from) * (i / N);
    const t = c * CYCLE - off + CYCLE * 4;
    const card = document.createElement('div');
    card.className = 'card';
    const cv = document.createElement('canvas');
    const w = Math.round(HH * 1.25), h = Math.round(HH * 1.75);
    cv.width = w; cv.height = h;
    const cap = document.createElement('div');
    cap.className = 'cap';
    cap.textContent = `${c.toFixed(2)}${c < 0.6 ? ' sig' : ' BIG'}`;
    card.append(cv, cap);
    row.appendChild(card);
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    try {
      drawToon(ctx, id, pose('celebrate', t, { menu: true, ...extra }), w / 2, h - HH * 0.06, HH);
    } catch (e) { console.error(e); }
  }
}

const which = new URLSearchParams(location.search).get('who') || 'both';

if (which === 'gnash' || which === 'both') {
  strip('Gnash — signature half (0.00–0.56)', 'Point at sky (near arm, screen LEFT) + hand on hip.', 'gnash', {}, { from: 0, to: 0.56, n: 8 });
  strip('Gnash — big move half (0.60–1.00)', 'stepturn.', 'gnash', {}, { from: 0.6, to: 1, n: 8 });
}
if (which === 'fernwick' || which === 'both') {
  strip('Fernwick — signature half (0.00–0.56)', 'Champion\'s clasp.', 'fernwick', {}, { from: 0, to: 0.56, n: 8 });
  strip('Fernwick — big move half (0.60–1.00)', 'present.', 'fernwick', {}, { from: 0.6, to: 1, n: 8 });
}
if (which === 'cast' || which === 'legacy') {
  const style = which === 'legacy' ? { celebrateStyle: 'legacy' } : {};
  for (const id of ['lorenzo', 'gnash', 'fernwick', 'b33p', 'mochi', 'chompo', 'gary', 'raymn', 'grumpos', 'dolores']) {
    strip(`${id} — celebrate (${which})`, '', id, style, { n: 8, hh: 120 });
  }
}
if (which === 'zoom') {
  strip('Fernwick — present, zoomed', 'Four frames through the hold.', 'fernwick', {}, { from: 0.7, to: 0.98, n: 4, hh: 460 });
}
