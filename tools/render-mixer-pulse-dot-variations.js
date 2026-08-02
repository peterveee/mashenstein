// Render dot-based Mixer note variations. This is a comparison-only fixture.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'scratchpad');
const outFile = join(outDir, 'mixer-pulse-fine-chord-variants.svg');

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
const GRID = '#303846';
const INK = '#f3f7fb';
const DOT_DIM = '#11161d';
const DOT_EDGE = '#05080d';
const DOT_HIGHLIGHT = '#39424d';

const lanes = [
  { name: 'Kick', color: '#d84d40', family: 'DRUMS', notes: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62].map((at) => ({ at, len: 1, intensity: at % 8 === 0 ? 0.95 : 0.72 })) },
  { name: 'Hats-Closed', color: '#e0b832', family: 'DRUMS', notes: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47, 49, 51, 53, 55, 57, 59, 61, 63].map((at) => ({ at, len: 1, intensity: at % 4 === 1 ? 0.72 : 0.48 })) },
  { name: 'Rim', color: '#d67a2a', family: 'DRUMS', notes: [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60].map((at, i) => ({ at, len: i % 4 === 3 ? 2 : 1, intensity: i % 4 === 3 ? 0.9 : 0.58 })) },
  { name: 'Bass', color: '#67c53a', family: 'MELODIC', notes: [
    { at: 0, len: 12, intensity: 0.82, pitch: 0.72 }, { at: 12, len: 4, intensity: 0.68, pitch: 0.52 },
    { at: 16, len: 16, intensity: 0.88, pitch: 0.38 }, { at: 32, len: 12, intensity: 0.78, pitch: 0.62 },
    { at: 44, len: 4, intensity: 0.64, pitch: 0.44 }, { at: 48, len: 16, intensity: 0.92, pitch: 0.25 },
  ] },
  { name: 'Lead', color: '#49d6c6', family: 'MELODIC', notes: [
    { at: 0, len: 16, intensity: 0.7, pitch: 0.62 }, { at: 16, len: 16, intensity: 0.76, pitch: 0.36 },
    { at: 32, len: 8, intensity: 0.64, pitch: 0.5 }, { at: 40, len: 16, intensity: 0.86, pitch: 0.2 },
    { at: 56, len: 8, intensity: 0.8, pitch: 0.42 },
  ] },
  { name: 'Lead-Harmony', color: '#42c5db', family: 'MELODIC', notes: [
    { at: 32, len: 16, intensity: 0.78, pitch: 0.42 }, { at: 48, len: 16, intensity: 0.92, pitch: 0.25 },
  ] },
  { name: 'Chords', color: '#4c8ee2', family: 'MELODIC', notes: [
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
  { mode: 'pulse', title: 'FINE PULSE DOTS', subtitle: 'smaller heads · pitch stays legible' },
  { mode: 'trail', title: 'FINE ELASTIC TRAILS', subtitle: 'small dots · duration leaves a soft tail' },
  { mode: 'pill', title: 'CHORD PILLS', subtitle: 'one dark capsule · duration and weight together' },
  { mode: 'bead', title: 'CHORD BEAD CLUSTERS', subtitle: 'small dots · a loose general chord shape' },
];

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const f = (n) => Number(n.toFixed(2));
const xAt = (step) => LEFT + step * STEP_W;
const laneY = (row) => ROWS_Y + row * (ROW_H + ROW_GAP);
const noteY = (lane, y, note) => lane.family === 'MELODIC' ? y + 5 + (note.pitch ?? 0.5) * (ROW_H - 10) : y + ROW_H / 2;
const noteX = (note) => xAt(note.at) + STEP_W * 0.5;
const noteEnd = (note) => xAt(Math.min(STEPS, note.at + note.len));
const activeBar = (lane, bar) => lane.notes.some((n) => n.at < (bar + 1) * STEPS_PER_BAR && n.at + n.len > bar * STEPS_PER_BAR);

function defs() {
  const clips = panels.map((_, p) => {
    const top = HEADER_H + p * (PANEL_H + GAP);
    return `<clipPath id="pulsePanelClip${p}"><rect x="${LEFT}" y="${top + 62}" width="${CONTENT_W}" height="${PANEL_H - 76}" rx="2" /></clipPath>`;
  }).join('');
  return `<defs>
    <filter id="dotGlow" x="-100%" y="-120%" width="300%" height="340%">
      <feGaussianBlur stdDeviation="3.2" result="blur" />
      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <filter id="smallDotGlow" x="-100%" y="-120%" width="300%" height="340%">
      <feGaussianBlur stdDeviation="1.4" result="blur" />
      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    ${clips}
  </defs>`;
}

function panelChrome(panel, p) {
  const top = HEADER_H + p * (PANEL_H + GAP);
  const bottom = top + PANEL_H;
  const right = LEFT + CONTENT_W;
  const out = [`<rect x="0" y="${top}" width="${W}" height="${PANEL_H}" rx="8" fill="#1a1e25" stroke="#3a414d" />`];
  out.push(`<text x="24" y="${top + 28}" fill="#f0f2f6" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="18" font-weight="700" letter-spacing="1.2">${esc(panel.title)}</text>`);
  out.push(`<text x="24" y="${top + 51}" fill="#8993a4" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12">${esc(panel.subtitle)}</text>`);
  out.push(`<text x="${W - 30}" y="${top + 28}" text-anchor="end" fill="#657080" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11">same pattern · relative pitch held</text>`);
  out.push(`<line x1="${LEFT}" y1="${top + 60}" x2="${right}" y2="${top + 60}" stroke="#566071" stroke-width="1" />`);
  for (let b = 0; b <= BARS; b++) {
    const x = xAt(b * STEPS_PER_BAR);
    out.push(`<line x1="${f(x)}" y1="${top + 60}" x2="${f(x)}" y2="${bottom - 14}" stroke="#586272" stroke-width="${b === 0 || b === BARS ? 2 : 1}" opacity="${b === 0 || b === BARS ? 0.75 : 0.58}" />`);
    if (b < BARS) out.push(`<text x="${f(x + 7)}" y="${top + 52}" fill="#b3bac7" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11">${b + 1}</text>`);
  }
  for (let s = 1; s < STEPS; s++) {
    if (s % STEPS_PER_BAR === 0) continue;
    const x = xAt(s);
    out.push(`<line x1="${f(x)}" y1="${top + 61}" x2="${f(x)}" y2="${bottom - 14}" stroke="${GRID}" stroke-width="1" opacity="${s % 2 === 0 ? 0.58 : 0.3}" />`);
  }
  return out.join('');
}

function rowChrome(lane, row, p) {
  const top = HEADER_H + p * (PANEL_H + GAP);
  const y = top + laneY(row);
  const out = [];
  for (let bar = 0; bar < BARS; bar++) {
    const bx = xAt(bar * STEPS_PER_BAR);
    out.push(`<rect x="${f(bx + 1)}" y="${y}" width="${f(STEPS_PER_BAR * STEP_W - 2)}" height="${ROW_H}" fill="${lane.color}" opacity="${activeBar(lane, bar) ? 0.92 : 0.035}" />`);
  }
  out.push(`<rect x="${LEFT}" y="${y}" width="${CONTENT_W}" height="${ROW_H}" rx="3" fill="none" stroke="#313844" />`);
  out.push(`<circle cx="26" cy="${y + 17}" r="5" fill="${lane.color}" />`);
  out.push(`<text x="42" y="${y + 20}" fill="#e1e5ec" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" font-weight="600">${esc(lane.name)}</text>`);
  out.push(`<text x="190" y="${y + 20}" fill="#7f8999" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="9" text-anchor="end">${lane.family}</text>`);
  return out.join('');
}

function dot(x, y, r, color, opacity = 0.95) {
  return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 1.35)}" fill="${DOT_EDGE}" opacity="0.22" filter="url(#dotGlow)" />
    <circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${DOT_DIM}" stroke="${DOT_EDGE}" stroke-width="1.1" opacity="${opacity}" />
    <circle cx="${f(x - r * 0.2)}" cy="${f(y - r * 0.2)}" r="${f(Math.max(0.7, r * 0.15))}" fill="${DOT_HIGHLIGHT}" opacity="0.42" />`;
}

function pulseRing(x, y, r, color) {
  return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r + 4)}" fill="none" stroke="${DOT_DIM}" stroke-width="1" opacity="0.76" />`;
}

function chordDots(note, lane, y, style = 'stack') {
  const x = noteX(note);
  const cy = noteY(lane, y, note);
  const tones = note.tones || 3;
  const out = [];
  for (let t = 0; t < tones; t++) {
    let dx = 0;
    let dy = (t - (tones - 1) / 2) * 6;
    if (style === 'orbit') {
      const angle = (t / tones) * Math.PI * 2 - Math.PI / 2;
      dx = Math.cos(angle) * 5;
      dy = Math.sin(angle) * 5;
    }
    if (style === 'fan') dx = (t - (tones - 1) / 2) * 3;
    out.push(dot(x + dx, cy + dy, 1.9 + note.intensity * 1.25, lane.color, 0.94));
  }
  out.push(pulseRing(x, cy, 3.5 + note.intensity * 1.5, lane.color));
  return out.join('');
}

function chordPill(note, lane, y) {
  const x = xAt(note.at) + 2;
  const end = Math.max(x + 8, noteEnd(note) - 2);
  const cy = noteY(lane, y, note);
  const h = 5 + (note.tones || 3) * 1.4;
  const lines = [];
  for (let t = 1; t < (note.tones || 3); t++) {
    const yy = cy + (t - ((note.tones || 3) + 1) / 2) * 2.2;
    lines.push(`<line x1="${f(x + 5)}" y1="${f(yy)}" x2="${f(end - 5)}" y2="${f(yy)}" stroke="${DOT_HIGHLIGHT}" stroke-width="0.7" opacity="0.48" />`);
  }
  return `<rect x="${f(x)}" y="${f(cy - h / 2)}" width="${f(end - x)}" height="${f(h)}" rx="${f(h / 2)}" fill="${DOT_DIM}" stroke="${DOT_EDGE}" stroke-width="1.2" opacity="0.95" />${lines.join('')}`;
}

function chordBeads(note, lane, y) {
  const x = noteX(note);
  const cy = noteY(lane, y, note);
  const tones = note.tones || 3;
  const out = [`<line x1="${f(x)}" y1="${f(cy - (tones - 1) * 2.6)}" x2="${f(x)}" y2="${f(cy + (tones - 1) * 2.6)}" stroke="${DOT_DIM}" stroke-width="1.2" opacity="0.8" />`];
  for (let t = 0; t < tones; t++) {
    const yy = cy + (t - (tones - 1) / 2) * 5.2;
    out.push(dot(x + (t % 2 ? 1.2 : -1.2), yy, 1.75 + note.intensity * 1.1, lane.color, 0.94));
  }
  return out.join('');
}

function pulseLane(lane, y, variant) {
  const out = [];
  lane.notes.forEach((note) => {
    const x = noteX(note);
    const cy = noteY(lane, y, note);
    if (lane.name === 'Chords') {
      if (variant === 'pill') out.push(chordPill(note, lane, y));
      else if (variant === 'bead') out.push(chordBeads(note, lane, y));
      else out.push(chordDots(note, lane, y, 'stack'));
      return;
    }
    const r = 2.2 + note.intensity * 2.2;
    out.push(dot(x, cy, r, lane.color, 0.9 + note.intensity * 0.1));
    out.push(pulseRing(x, cy, r, lane.color));
    if (variant === 'trail' && note.len > 1) {
      out.push(`<path d="M ${f(x + r + 2)} ${f(cy)} C ${f(x + note.len * STEP_W * 0.3)} ${f(cy - 3)}, ${f(x + note.len * STEP_W * 0.7)} ${f(cy + 3)}, ${f(noteEnd(note))} ${f(cy)}" fill="none" stroke="${DOT_DIM}" stroke-width="${f(1.5 + note.intensity * 1.5)}" opacity="0.84" />`);
    }
    if (variant === 'petal') {
      out.push(`<ellipse cx="${f(x)}" cy="${f(cy)}" rx="${f(r * 2)}" ry="${f(r * 0.4)}" fill="none" stroke="${DOT_DIM}" stroke-width="1.2" opacity="0.84" />`);
      out.push(`<ellipse cx="${f(x)}" cy="${f(cy)}" rx="${f(r * 0.4)}" ry="${f(r * 2)}" fill="none" stroke="${DOT_DIM}" stroke-width="1.2" opacity="0.84" />`);
    }
  });
  if (variant === 'bead' && lane.family === 'MELODIC' && lane.name !== 'Chords' && lane.notes.length > 1) {
    const points = lane.notes.map((n) => `${f(noteX(n))},${f(noteY(lane, y, n))}`);
    out.push(`<polyline points="${points.join(' ')}" fill="none" stroke="${DOT_DIM}" stroke-width="1.4" opacity="0.88" />`);
  }
  return out.join('');
}

function drawPanel(panel, p) {
  const out = [panelChrome(panel, p)];
  lanes.forEach((lane, row) => {
    out.push(rowChrome(lane, row, p));
    const y = HEADER_H + p * (PANEL_H + GAP) + laneY(row);
    const variant = panel.mode === 'pulse' ? 'pulse' : panel.mode === 'trail' ? 'trail' : panel.mode === 'pill' ? 'pill' : 'bead';
    out.push(`<g clip-path="url(#pulsePanelClip${p})">${pulseLane(lane, y, variant)}</g>`);
  });
  return out.join('');
}

const H = HEADER_H + panels.length * PANEL_H + (panels.length - 1) * GAP + 24;
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defs()}
  <rect width="${W}" height="${H}" fill="#101318" />
  <text x="24" y="31" fill="#f1f3f6" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="22" font-weight="700" letter-spacing="1.4">MIXER FINE DOTS / CHORD VARIATIONS</text>
  <text x="24" y="55" fill="#8c96a5" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12">Bright bar content · finer dark dots · smooth tails · pills or bead groups for chords</text>
  ${panels.map((panel, p) => drawPanel(panel, p)).join('')}
</svg>
`;

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, svg);
console.log(`${outFile} written (${W}×${H})`);
