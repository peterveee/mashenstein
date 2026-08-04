// Render a disposable comparison sheet for negative-space Mixer note marks.
//
// The lane field is solid wherever the lane has content. Notes are then carved out
// of that field, so the marks use the row's full vertical space without becoming
// brighter chips on top of a muted strip. This is a visual study only: it does not
// import or alter the production Mixer renderer, saved songs, or editing gestures.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'work', 'local');
const outFile = join(outDir, 'mixer-negative-note-comparison.svg');

const W = 1600;
const PANEL_H = 350;
const HEADER_H = 74;
const GAP = 18;
const LEFT = 236;
const RIGHT = 30;
const CONTENT_W = W - LEFT - RIGHT;
const BARS = 8;
const STEPS_PER_BAR = 8;
const STEPS = BARS * STEPS_PER_BAR;
const STEP_W = CONTENT_W / STEPS;
const ROW_H = 34;
const ROW_GAP = 5;
const ROWS_Y = 78;
const CUT = '#11151b';
const CUT_EDGE = '#06090d';
const INK = '#edf1f4';

const lanes = [
  { name: 'Kick', color: '#a83d31', family: 'DRUMS', notes: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62].map((at) => ({ at, len: 1, intensity: at % 8 === 0 ? 0.95 : 0.72 })) },
  { name: 'Hats-Closed', color: '#b0912b', family: 'DRUMS', notes: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47, 49, 51, 53, 55, 57, 59, 61, 63].map((at) => ({ at, len: 1, intensity: at % 4 === 1 ? 0.72 : 0.48 })) },
  { name: 'Rim', color: '#9d6025', family: 'DRUMS', notes: [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60].map((at, i) => ({ at, len: i % 4 === 3 ? 2 : 1, intensity: i % 4 === 3 ? 0.9 : 0.58 })) },
  { name: 'Bass', color: '#4e9e27', family: 'MELODIC', notes: [
    { at: 0, len: 12, intensity: 0.82, pitch: 0.72 }, { at: 12, len: 4, intensity: 0.68, pitch: 0.52 },
    { at: 16, len: 16, intensity: 0.88, pitch: 0.38 }, { at: 32, len: 12, intensity: 0.78, pitch: 0.62 },
    { at: 44, len: 4, intensity: 0.64, pitch: 0.44 }, { at: 48, len: 16, intensity: 0.92, pitch: 0.25 },
  ] },
  { name: 'Lead', color: '#29ad9f', family: 'MELODIC', notes: [
    { at: 0, len: 16, intensity: 0.7, pitch: 0.62 }, { at: 16, len: 16, intensity: 0.76, pitch: 0.36 },
    { at: 32, len: 8, intensity: 0.64, pitch: 0.5 }, { at: 40, len: 16, intensity: 0.86, pitch: 0.2 },
    { at: 56, len: 8, intensity: 0.8, pitch: 0.42 },
  ] },
  { name: 'Lead-Harmony', color: '#2ea5b4', family: 'MELODIC', notes: [
    { at: 32, len: 16, intensity: 0.78, pitch: 0.42 }, { at: 48, len: 16, intensity: 0.92, pitch: 0.25 },
  ] },
  { name: 'Chords', color: '#2865a7', family: 'MELODIC', notes: [
    { at: 0, len: 2, intensity: 0.66, tones: 3, pitch: 0.68 }, { at: 4, len: 2, intensity: 0.58, tones: 3, pitch: 0.57 },
    { at: 8, len: 2, intensity: 0.7, tones: 3, pitch: 0.46 }, { at: 12, len: 2, intensity: 0.64, tones: 3, pitch: 0.55 },
    { at: 16, len: 4, intensity: 0.82, tones: 4, pitch: 0.35 }, { at: 24, len: 2, intensity: 0.62, tones: 3, pitch: 0.48 },
    { at: 32, len: 2, intensity: 0.7, tones: 3, pitch: 0.58 }, { at: 36, len: 2, intensity: 0.62, tones: 3, pitch: 0.44 },
    { at: 40, len: 4, intensity: 0.84, tones: 4, pitch: 0.27 }, { at: 48, len: 2, intensity: 0.66, tones: 3, pitch: 0.5 },
    { at: 52, len: 2, intensity: 0.58, tones: 3, pitch: 0.39 }, { at: 56, len: 4, intensity: 0.88, tones: 4, pitch: 0.19 },
    { at: 62, len: 2, intensity: 0.7, tones: 3, pitch: 0.32 },
  ] },
];

const panels = [
  { mode: 'carved', title: 'CARVED INK', subtitle: 'broad incisions · duration becomes the cut' },
  { mode: 'pinhole', title: 'PINHOLE PULSES', subtitle: 'deep apertures · attacks read as wells' },
  { mode: 'groove', title: 'BRAIDED GROOVES', subtitle: 'parallel channels · phrases become woven cuts' },
  { mode: 'relief', title: 'TOPOGRAPHIC RELIEF', subtitle: 'contour valleys · rhythm and pitch shape the field' },
];

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const f = (n) => Number(n.toFixed(2));
const xAt = (step) => LEFT + step * STEP_W;
const laneY = (row) => ROWS_Y + row * (ROW_H + ROW_GAP);
const noteY = (lane, y, note) => lane.family === 'MELODIC'
  ? y + 5 + (note.pitch ?? 0.5) * (ROW_H - 10)
  : y + ROW_H / 2;
const barHasNotes = (lane, bar) => lane.notes.some((note) => note.at < (bar + 1) * STEPS_PER_BAR && note.at + note.len > bar * STEPS_PER_BAR);

function defs() {
  const clips = panels.map((_, p) => {
    const top = HEADER_H + p * (PANEL_H + GAP);
    return `<clipPath id="negativePanelClip${p}"><rect x="${LEFT}" y="${top + 62}" width="${CONTENT_W}" height="${PANEL_H - 76}" rx="2" /></clipPath>`;
  }).join('');
  return `<defs>
    <filter id="cutShadow" x="-30%" y="-60%" width="160%" height="220%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
      <feOffset dy="1" result="offset" />
      <feFlood flood-color="#020407" flood-opacity="0.85" />
      <feComposite in2="offset" operator="in" />
      <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <filter id="cutSoft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="1.4" />
    </filter>
    ${clips}
  </defs>`;
}

function panelChrome(panel, p) {
  const top = HEADER_H + p * (PANEL_H + GAP);
  const bottom = top + PANEL_H;
  const right = LEFT + CONTENT_W;
  const out = [];
  out.push(`<rect x="0" y="${top}" width="${W}" height="${PANEL_H}" rx="8" fill="#1a1e25" stroke="#3a414d" />`);
  out.push(`<text x="24" y="${top + 28}" fill="#f0f2f6" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="18" font-weight="700" letter-spacing="1.2">${esc(panel.title)}</text>`);
  out.push(`<text x="24" y="${top + 51}" fill="#8993a4" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12">${esc(panel.subtitle)}</text>`);
  out.push(`<text x="${W - 30}" y="${top + 28}" text-anchor="end" fill="#657080" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11">same geometry · negative note marks</text>`);
  out.push(`<line x1="${LEFT}" y1="${top + 60}" x2="${right}" y2="${top + 60}" stroke="#566071" stroke-width="1" />`);
  for (let b = 0; b <= BARS; b++) {
    const x = xAt(b * STEPS_PER_BAR);
    out.push(`<line x1="${f(x)}" y1="${top + 60}" x2="${f(x)}" y2="${bottom - 14}" stroke="#586272" stroke-width="${b === 0 || b === BARS ? 2 : 1}" opacity="${b === 0 || b === BARS ? 0.75 : 0.58}" />`);
    if (b < BARS) out.push(`<text x="${f(x + 7)}" y="${top + 52}" fill="#b3bac7" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11">${b + 1}</text>`);
  }
  for (let s = 1; s < STEPS; s++) {
    if (s % STEPS_PER_BAR === 0) continue;
    const x = xAt(s);
    out.push(`<line x1="${f(x)}" y1="${top + 61}" x2="${f(x)}" y2="${bottom - 14}" stroke="#333a46" stroke-width="1" opacity="${s % 2 === 0 ? 0.58 : 0.3}" />`);
  }
  return out.join('');
}

function rowChrome(lane, row, p) {
  const top = HEADER_H + p * (PANEL_H + GAP);
  const y = top + laneY(row);
  const out = [];
  for (let bar = 0; bar < BARS; bar++) {
    const bx = xAt(bar * STEPS_PER_BAR);
    const active = barHasNotes(lane, bar);
    out.push(`<rect x="${f(bx + 1)}" y="${y}" width="${f(STEPS_PER_BAR * STEP_W - 2)}" height="${ROW_H}" fill="${lane.color}" opacity="${active ? 0.48 : 0.1}" />`);
  }
  out.push(`<rect x="${LEFT}" y="${y}" width="${CONTENT_W}" height="${ROW_H}" rx="3" fill="none" stroke="#313844" />`);
  out.push(`<circle cx="26" cy="${y + 17}" r="5" fill="${lane.color}" />`);
  out.push(`<text x="42" y="${y + 20}" fill="#e1e5ec" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" font-weight="600">${esc(lane.name)}</text>`);
  out.push(`<text x="190" y="${y + 20}" fill="#7f8999" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="9" text-anchor="end">${lane.family}</text>`);
  return out.join('');
}

function cutEdge(path) {
  return `<path d="${path}" fill="${CUT}" stroke="${CUT_EDGE}" stroke-width="1.5" filter="url(#cutShadow)" />`;
}

function carvedInk(note, lane, y, index) {
  const x = xAt(note.at) + 1;
  const w = Math.max(STEP_W * 0.64, note.len * STEP_W - 2);
  const h = 11 + note.intensity * 12;
  const wobble = ((index * 17) % 7) - 3;
  const cy = noteY(lane, y, note) + wobble * 0.25;
  const d = `M ${f(x)} ${f(cy - h * 0.36)} C ${f(x + w * 0.2)} ${f(cy - h * 0.78)}, ${f(x + w * 0.7)} ${f(cy + h * 0.72)}, ${f(x + w)} ${f(cy + h * 0.24)} C ${f(x + w * 0.74)} ${f(cy + h * 0.78)}, ${f(x + w * 0.22)} ${f(cy + h * 0.56)}, ${f(x)} ${f(cy - h * 0.36)} Z`;
  return `${cutEdge(d)}<path d="M ${f(x + 2)} ${f(cy - h * 0.22)} C ${f(x + w * 0.35)} ${f(cy - h * 0.48)}, ${f(x + w * 0.7)} ${f(cy + h * 0.35)}, ${f(x + w - 2)} ${f(cy + h * 0.06)}" fill="none" stroke="${lane.color}" stroke-width="1" opacity="0.23" />`;
}

function pinholePulse(note, lane, y) {
  const x = xAt(note.at) + STEP_W * 0.5;
  const cy = noteY(lane, y, note);
  const r = 5 + note.intensity * 6;
  const rx = Math.max(r, note.len * STEP_W * 0.42);
  return `<ellipse cx="${f(x)}" cy="${f(cy)}" rx="${f(rx + 3)}" ry="${f(r + 3)}" fill="none" stroke="${lane.color}" stroke-width="1" opacity="0.2" />
    <ellipse cx="${f(x)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(r)}" fill="${CUT}" stroke="${CUT_EDGE}" stroke-width="1.5" filter="url(#cutShadow)" />
    <ellipse cx="${f(x - r * 0.18)}" cy="${f(cy - r * 0.18)}" rx="${f(Math.max(1.5, rx * 0.22))}" ry="${f(Math.max(1.2, r * 0.16))}" fill="${INK}" opacity="0.18" filter="url(#cutSoft)" />`;
}

function braidedGroove(note, lane, y, index) {
  const x = xAt(note.at) - 2;
  const end = xAt(Math.min(STEPS, note.at + note.len)) + 2;
  const cy = noteY(lane, y, note);
  const bend = ((index * 13) % 9) - 4;
  const width = Math.max(5, end - x);
  const cuts = [];
  for (let strand = 0; strand < (note.tones || 2); strand++) {
    const offset = (strand - ((note.tones || 2) - 1) / 2) * 6;
    const d = `M ${f(x)} ${f(cy + offset)} C ${f(x + width * 0.25)} ${f(cy + offset + bend)}, ${f(x + width * 0.7)} ${f(cy + offset - bend)}, ${f(end)} ${f(cy + offset)}`;
    cuts.push(`<path d="${d}" fill="none" stroke="${CUT_EDGE}" stroke-width="${f(5 + note.intensity * 4)}" stroke-linecap="round" filter="url(#cutShadow)" />`);
    cuts.push(`<path d="${d}" fill="none" stroke="${CUT}" stroke-width="${f(3 + note.intensity * 4)}" stroke-linecap="round" />`);
  }
  return cuts.join('');
}

function reliefCarving(lane, y) {
  const density = new Array(STEPS).fill(0);
  const pitch = new Array(STEPS).fill(0.5);
  lane.notes.forEach((note) => {
    for (let s = note.at; s < Math.min(STEPS, note.at + note.len); s++) {
      density[s] = Math.max(density[s], note.intensity);
      pitch[s] = note.pitch ?? 0.5;
    }
  });
  const out = [];
  for (let contour = 0; contour < 3; contour++) {
    const points = [];
    for (let s = 0; s <= STEPS; s++) {
      const i = Math.min(STEPS - 1, s);
      const prev = density[Math.max(0, i - 1)] || 0;
      const here = density[i] || 0;
      const next = density[Math.min(STEPS - 1, i + 1)] || 0;
      const amount = (prev + here * 2 + next) / 4;
      const py = y + 5 + (pitch[i] ?? 0.5) * (ROW_H - 10) + (contour - 1) * 5 - amount * (5 + contour * 2);
      points.push(`${f(xAt(s))},${f(Math.max(y + 2, Math.min(y + ROW_H - 2, py)))}`);
    }
    out.push(`<path d="M ${points.join(' L ')}" fill="none" stroke="${CUT_EDGE}" stroke-width="${5 - contour}" opacity="0.92" filter="url(#cutShadow)" />`);
    out.push(`<path d="M ${points.join(' L ')}" fill="none" stroke="${CUT}" stroke-width="${3 - contour * 0.4}" opacity="0.98" />`);
  }
  return out.join('');
}

function drawPanel(panel, p) {
  const out = [panelChrome(panel, p)];
  lanes.forEach((lane, row) => {
    out.push(rowChrome(lane, row, p));
    const y = HEADER_H + p * (PANEL_H + GAP) + laneY(row);
    let marks = '';
    if (panel.mode === 'carved') marks = lane.notes.map((note, i) => carvedInk(note, lane, y, i)).join('');
    if (panel.mode === 'pinhole') marks = lane.notes.map((note) => pinholePulse(note, lane, y)).join('');
    if (panel.mode === 'groove') marks = lane.notes.map((note, i) => braidedGroove(note, lane, y, i)).join('');
    if (panel.mode === 'relief') marks = reliefCarving(lane, y);
    out.push(`<g clip-path="url(#negativePanelClip${p})">${marks}</g>`);
  });
  const top = HEADER_H + p * (PANEL_H + GAP);
  return out.join('');
}

const H = HEADER_H + panels.length * PANEL_H + (panels.length - 1) * GAP + 24;
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defs()}
  <rect width="${W}" height="${H}" fill="#101318" />
  <text x="24" y="31" fill="#f1f3f6" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="22" font-weight="700" letter-spacing="1.4">MIXER NEGATIVE-SPACE NOTE STUDIES</text>
  <text x="24" y="55" fill="#8c96a5" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12">Solid activity fields · note timing, duration and melodic contour held constant</text>
  ${panels.map((panel, p) => drawPanel(panel, p)).join('')}
</svg>
`;

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, svg);
console.log(`${outFile} written (${W}×${H})`);
