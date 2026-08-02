// Render a disposable visual comparison sheet for alternative Mixer note marks.
//
// This intentionally does not import or alter mixer-entry.js. It uses the current
// visible arrangement as a small, explicit fixture so the five treatments can be
// compared without changing saved songs, editing gestures, or production CSS.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'scratchpad');
const outFile = join(outDir, 'mixer-note-visual-comparison.svg');

const W = 1600;
const PANEL_H = 268;
const HEADER_H = 74;
const GAP = 18;
const LEFT = 236;
const RIGHT = 30;
const CONTENT_W = W - LEFT - RIGHT;
const BARS = 8;
const STEPS_PER_BAR = 8;
const STEPS = BARS * STEPS_PER_BAR;
const STEP_W = CONTENT_W / STEPS;
const ROW_H = 22;
const ROW_GAP = 5;
const ROWS_Y = 82;

const lanes = [
  { name: 'Kick', color: '#a83d31', family: 'DRUMS', notes: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62].map((at) => ({ at, len: 1, intensity: at % 8 === 0 ? 0.95 : 0.72 })) },
  { name: 'Hats-Closed', color: '#b0912b', family: 'DRUMS', notes: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47, 49, 51, 53, 55, 57, 59, 61, 63].map((at) => ({ at, len: 1, intensity: at % 4 === 1 ? 0.72 : 0.48 })) },
  { name: 'Rim', color: '#9d6025', family: 'DRUMS', notes: [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60].map((at, i) => ({ at, len: i % 4 === 3 ? 2 : 1, intensity: i % 4 === 3 ? 0.9 : 0.58 })) },
  { name: 'Bass', color: '#4e9e27', family: 'MELODIC', notes: [
    { at: 0, len: 12, intensity: 0.82 }, { at: 12, len: 4, intensity: 0.68 },
    { at: 16, len: 16, intensity: 0.88 }, { at: 32, len: 12, intensity: 0.78 },
    { at: 44, len: 4, intensity: 0.64 }, { at: 48, len: 16, intensity: 0.92 },
  ] },
  { name: 'Lead', color: '#29ad9f', family: 'MELODIC', notes: [
    { at: 0, len: 16, intensity: 0.7 }, { at: 16, len: 16, intensity: 0.76 },
    { at: 32, len: 8, intensity: 0.64 }, { at: 40, len: 16, intensity: 0.86 },
    { at: 56, len: 8, intensity: 0.8 },
  ] },
  { name: 'Lead-Harmony', color: '#2ea5b4', family: 'MELODIC', notes: [
    { at: 32, len: 16, intensity: 0.78 }, { at: 48, len: 16, intensity: 0.92 },
  ] },
  { name: 'Chords', color: '#2865a7', family: 'MELODIC', notes: [
    { at: 0, len: 2, intensity: 0.66, tones: 3 }, { at: 4, len: 2, intensity: 0.58, tones: 3 },
    { at: 8, len: 2, intensity: 0.7, tones: 3 }, { at: 12, len: 2, intensity: 0.64, tones: 3 },
    { at: 16, len: 4, intensity: 0.82, tones: 4 }, { at: 24, len: 2, intensity: 0.62, tones: 3 },
    { at: 32, len: 2, intensity: 0.7, tones: 3 }, { at: 36, len: 2, intensity: 0.62, tones: 3 },
    { at: 40, len: 4, intensity: 0.84, tones: 4 }, { at: 48, len: 2, intensity: 0.66, tones: 3 },
    { at: 52, len: 2, intensity: 0.58, tones: 3 }, { at: 56, len: 4, intensity: 0.88, tones: 4 },
    { at: 62, len: 2, intensity: 0.7, tones: 3 },
  ] },
];

// Normalise the compact drum fixture into the same shape used by the sustained lanes.
for (const lane of lanes) lane.notes = lane.notes.map((n) => typeof n === 'number' ? { at: n, len: 1, intensity: 0.7 } : n);

const panels = [
  { title: 'INK STROKES', subtitle: 'tapered marks · duration becomes gesture' },
  { title: 'PULSE BLOOMS', subtitle: 'glow, halo and release · attacks stay visible' },
  { title: 'WOVEN RIBBONS', subtitle: 'continuous strands · phrases become material' },
  { title: 'CONSTELLATIONS', subtitle: 'sparks and trails · rests become negative space' },
  { title: 'TOPOGRAPHIC WAVES', subtitle: 'activity contours · density becomes terrain' },
];

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const f = (n) => Number(n.toFixed(2));
const xAt = (step) => LEFT + step * STEP_W;
const laneY = (row) => ROWS_Y + row * (ROW_H + ROW_GAP);
const alpha = (value) => Math.max(0.08, Math.min(1, value));
const blend = (color, opacity) => `${color}`;

function defs() {
  const clips = panels.map((_, p) => {
    const top = HEADER_H + p * (PANEL_H + GAP);
    return `<clipPath id="panelContentClip${p}"><rect x="${LEFT}" y="${top + 60}" width="${CONTENT_W}" height="${PANEL_H - 74}" rx="2" /></clipPath>`;
  }).join('');
  return `<defs>
    <filter id="softGlow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="5" result="blur" />
      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <filter id="smallGlow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="2.2" result="blur" />
      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <linearGradient id="paperFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#222831" />
      <stop offset="1" stop-color="#15181e" />
    </linearGradient>
    ${clips}
  </defs>`;
}

function panelChrome(panel, p) {
  const top = HEADER_H + p * (PANEL_H + GAP);
  const bottom = top + PANEL_H;
  const contentRight = LEFT + CONTENT_W;
  const out = [];
  out.push(`<rect x="0" y="${top}" width="${W}" height="${PANEL_H}" rx="8" fill="url(#paperFade)" stroke="#3a414d" />`);
  out.push(`<text x="24" y="${top + 28}" fill="#f0f2f6" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="18" font-weight="700" letter-spacing="1.2">${esc(panel.title)}</text>`);
  out.push(`<text x="24" y="${top + 51}" fill="#8993a4" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12">${esc(panel.subtitle)}</text>`);
  out.push(`<line x1="${LEFT}" y1="${top + 59}" x2="${contentRight}" y2="${top + 59}" stroke="#566071" stroke-width="1" />`);
  for (let b = 0; b <= BARS; b++) {
    const x = xAt(b * STEPS_PER_BAR);
    out.push(`<line x1="${f(x)}" y1="${top + 59}" x2="${f(x)}" y2="${bottom - 14}" stroke="#586272" stroke-width="${b === 0 || b === BARS ? 2 : 1}" opacity="${b === 0 || b === BARS ? 0.75 : 0.58}" />`);
    if (b < BARS) out.push(`<text x="${f(x + 7)}" y="${top + 52}" fill="#b3bac7" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11">${b + 1}</text>`);
  }
  for (let s = 1; s < STEPS; s++) {
    if (s % STEPS_PER_BAR === 0) continue;
    const x = xAt(s);
    out.push(`<line x1="${f(x)}" y1="${top + 60}" x2="${f(x)}" y2="${bottom - 14}" stroke="#333a46" stroke-width="1" opacity="${s % 2 === 0 ? 0.58 : 0.3}" />`);
  }
  return out.join('');
}

function rowChrome(row, p) {
  const top = HEADER_H + p * (PANEL_H + GAP);
  const y = top + laneY(row);
  const lane = lanes[row];
  const out = [];
  out.push(`<rect x="${LEFT}" y="${y}" width="${CONTENT_W}" height="${ROW_H}" rx="3" fill="${lane.color}" opacity="0.12" />`);
  out.push(`<rect x="${LEFT}" y="${y}" width="${CONTENT_W}" height="${ROW_H}" rx="3" fill="none" stroke="#313844" />`);
  out.push(`<circle cx="26" cy="${y + 11}" r="5" fill="${lane.color}" />`);
  out.push(`<text x="42" y="${y + 14}" fill="#e1e5ec" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" font-weight="600">${esc(lane.name)}</text>`);
  out.push(`<text x="190" y="${y + 14}" fill="#7f8999" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="9" text-anchor="end">${lane.family}</text>`);
  return out.join('');
}

function noteCenter(note) {
  return xAt(note.at) + STEP_W * 0.5;
}

function inkMark(note, lane, y, index) {
  const x = xAt(note.at) + 1;
  const w = Math.max(STEP_W * 0.72, note.len * STEP_W - 2);
  const h = 7 + note.intensity * 8;
  const wobble = ((index * 17) % 7) - 3;
  const y0 = y + ROW_H / 2 + wobble * 0.22;
  const end = x + w;
  const d = `M ${f(x)} ${f(y0 + h * 0.15)} C ${f(x + w * 0.22)} ${f(y0 - h * 0.55)}, ${f(x + w * 0.65)} ${f(y0 + h * 0.56)}, ${f(end)} ${f(y0 - h * 0.05)} C ${f(end - w * 0.12)} ${f(y0 + h * 0.64)}, ${f(x + w * 0.2)} ${f(y0 + h * 0.62)}, ${f(x)} ${f(y0 + h * 0.15)} Z`;
  return `<path d="${d}" fill="${lane.color}" opacity="${alpha(0.48 + note.intensity * 0.45)}" />`;
}

function bloom(note, lane, y) {
  const x = noteCenter(note);
  const cy = y + ROW_H / 2;
  const radius = 4 + note.intensity * 5;
  const reach = Math.max(STEP_W * 0.6, note.len * STEP_W);
  return `<ellipse cx="${f(x + reach * 0.22)}" cy="${f(cy)}" rx="${f(Math.max(radius * 1.3, reach * 0.42))}" ry="${f(radius * 0.55)}" fill="${lane.color}" opacity="0.16" filter="url(#softGlow)" />
    <circle cx="${f(x)}" cy="${f(cy)}" r="${f(radius)}" fill="${lane.color}" opacity="${alpha(0.54 + note.intensity * 0.42)}" filter="url(#smallGlow)" />
    <circle cx="${f(x)}" cy="${f(cy)}" r="${f(radius * 0.28)}" fill="#f4f5f7" opacity="0.75" />
    <path d="M ${f(x + radius + 2)} ${f(cy)} C ${f(x + reach * 0.42)} ${f(cy - radius * 0.8)}, ${f(x + reach * 0.78)} ${f(cy + radius * 0.8)}, ${f(x + reach)} ${f(cy)}" fill="none" stroke="${lane.color}" stroke-width="2" opacity="0.36" />`;
}

function ribbon(note, lane, y, index) {
  const x = noteCenter(note);
  const cy = y + ROW_H / 2;
  const width = Math.max(3, note.len * STEP_W * 0.82);
  const thick = 2.8 + note.intensity * 5;
  const bend = ((index * 13) % 9) - 4;
  const d = `M ${f(x - width * 0.48)} ${f(cy)} C ${f(x - width * 0.22)} ${f(cy + bend)}, ${f(x + width * 0.22)} ${f(cy - bend)}, ${f(x + width * 0.5)} ${f(cy)}`;
  return `<path d="${d}" fill="none" stroke="${lane.color}" stroke-width="${f(thick)}" stroke-linecap="round" opacity="${alpha(0.54 + note.intensity * 0.4)}" />
    <circle cx="${f(x)}" cy="${f(cy)}" r="${f(1.8 + note.intensity * 2)}" fill="#eef2f5" opacity="0.62" />`;
}

function constellation(lane, y) {
  const out = [];
  let previous = null;
  lane.notes.forEach((note, index) => {
    const x = noteCenter(note);
    const cy = y + ROW_H / 2 + (((index * 11) % 7) - 3) * 0.55;
    if (previous) {
      const dx = x - previous.x;
      const d = `M ${f(previous.x)} ${f(previous.y)} Q ${f(previous.x + dx * 0.5)} ${f((previous.y + cy) * 0.5 - 5)} ${f(x)} ${f(cy)}`;
      out.push(`<path d="${d}" fill="none" stroke="${lane.color}" stroke-width="1.4" opacity="0.42" />`);
    }
    if ((note.tones || 1) > 1) {
      for (let t = 1; t < note.tones; t++) {
        const orbit = 4 + t * 3;
        out.push(`<circle cx="${f(x + Math.cos(t * 2.3) * orbit)}" cy="${f(cy + Math.sin(t * 2.3) * orbit)}" r="${f(1.6 + note.intensity * 1.3)}" fill="${lane.color}" opacity="0.58" />`);
      }
    }
    out.push(`<circle cx="${f(x)}" cy="${f(cy)}" r="${f(3 + note.intensity * 4)}" fill="${lane.color}" opacity="${alpha(0.58 + note.intensity * 0.4)}" filter="url(#smallGlow)" />`);
    if (note.len > 1) out.push(`<path d="M ${f(x + 6)} ${f(cy)} C ${f(x + note.len * STEP_W * 0.3)} ${f(cy - 5)}, ${f(x + note.len * STEP_W * 0.65)} ${f(cy + 5)}, ${f(x + note.len * STEP_W)} ${f(cy)}" fill="none" stroke="${lane.color}" stroke-width="2" opacity="0.28" />`);
    previous = { x, y: cy };
  });
  return out.join('');
}

function topography(lane, y) {
  const base = y + ROW_H - 3;
  const top = y + 3;
  const density = new Array(STEPS).fill(0);
  lane.notes.forEach((note) => {
    for (let s = note.at; s < Math.min(STEPS, note.at + note.len); s++) density[s] = Math.max(density[s], note.intensity);
  });
  const points = [];
  for (let s = 0; s <= STEPS; s++) {
    const prev = density[Math.max(0, s - 1)] || 0;
    const here = density[Math.min(STEPS - 1, s)] || 0;
    const next = density[Math.min(STEPS - 1, s + 1)] || 0;
    const smooth = (prev + here * 2 + next) / 4;
    const x = xAt(s);
    const py = base - smooth * (ROW_H - 6);
    points.push(`${f(x)},${f(Math.max(top, py))}`);
  }
  const d = `M ${points[0]} L ${points.slice(1).join(' L ')} L ${f(xAt(STEPS))},${f(base)} L ${f(xAt(0))},${f(base)} Z`;
  return `<path d="${d}" fill="${lane.color}" opacity="0.68" />
    <path d="M ${points.join(' L ')}" fill="none" stroke="#f3f5f7" stroke-width="1.2" opacity="0.52" />`;
}

function drawPanel(mode, p) {
  const out = [panelChrome(panels[p], p)];
  lanes.forEach((lane, row) => {
    out.push(rowChrome(row, p));
    const y = HEADER_H + p * (PANEL_H + GAP) + laneY(row);
    const marks = [];
    if (mode === 'ink') lane.notes.forEach((note, i) => marks.push(inkMark(note, lane, y, i)));
    if (mode === 'bloom') lane.notes.forEach((note) => marks.push(bloom(note, lane, y)));
    if (mode === 'ribbon') lane.notes.forEach((note, i) => marks.push(ribbon(note, lane, y, i)));
    if (mode === 'constellation') marks.push(constellation(lane, y));
    if (mode === 'topography') marks.push(topography(lane, y));
    out.push(`<g clip-path="url(#panelContentClip${p})">${marks.join('')}</g>`);
  });
  const top = HEADER_H + p * (PANEL_H + GAP);
  out.push(`<text x="${W - 30}" y="${top + 28}" text-anchor="end" fill="#657080" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11">same notes · same timing · same lanes</text>`);
  return out.join('');
}

const modes = ['ink', 'bloom', 'ribbon', 'constellation', 'topography'];
const H = HEADER_H + panels.length * PANEL_H + (panels.length - 1) * GAP + 24;
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defs()}
  <rect width="${W}" height="${H}" fill="#101318" />
  <text x="24" y="31" fill="#f1f3f6" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="22" font-weight="700" letter-spacing="1.4">MIXER NOTE VISUAL STUDIES</text>
  <text x="24" y="55" fill="#8c96a5" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12">Current visible arrangement pattern · eight bars · timing and lane geometry held constant</text>
  ${modes.map((mode, p) => drawPanel(mode, p)).join('')}
</svg>
`;

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, svg);
console.log(`${outFile} written (${W}×${H})`);
