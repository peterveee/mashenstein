// Measure the realtime CPU cost of every Tone/noise/drum voice preset, the same way
// tools/measure-new-effects.js measures the built-in effects: render offline, time
// the render, and report the delta as a percentage of one core at realtime.
//
// The delta is against the SAME lane playing nothing but its own engine default —
// not a bare oscillator — because that is the actual choice a preset stands in for
// on the desk: swapping a voice replaces what the lane already had, so what matters
// is the difference, and a preset lighter than the lane's default legitimately reads
// negative.
//
// Usage: node tools/measure-voice-cost.js          measure and write src/data/voices.js
//        node tools/measure-voice-cost.js --dry     print them, change nothing
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { openRenderer } from './lib/render-bank-browser.js';
import { oneNote, homeLane } from './lib/measure-voice.js';
import { VOICES, VOICE_LANES } from '../src/data/voices.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(ROOT, 'src/data/voices.js');
const DRY = process.argv.includes('--dry');
const REPS = 3;

// The same set measure-voices.js levels: everything built on Tone or a native node,
// not the engine's own hand-written presets (those are `cost: 0` in the VOICES
// assembly, not in this table at all).
const tone = Object.values(VOICES).filter((v) => ['tone', 'noise', 'drum'].includes(v.kind));

const renderer = await openRenderer();
let frames = 0;
const sameWindow = (n, what) => {
  if (!frames) frames = n;
  else if (n !== frames) throw new Error(`${what} rendered ${n} frames, not ${frames} — `
    + 'the timings are not comparable across a window that changed size');
};

async function timeRender(bank) {
  let best = Infinity; let n = 0;
  for (let i = 0; i < REPS; i++) {
    const t0 = performance.now();
    const out = await renderer.render(bank, { repeat: 1, mix: null, trackId: null });
    const ms = performance.now() - t0;
    n = out.outL.length;
    if (ms < best) best = ms;
  }
  return { ms: best, n };
}

try {
  // Half the calibration: how long each lane's OWN engine default takes to render one
  // note, on the fixed one-bar window oneNote() builds — the baseline every preset's
  // render is compared against.
  const baseMs = {};
  console.log('lane baselines (engine default, one note):');
  for (const lane of Object.keys(VOICE_LANES)) {
    const { ms, n } = await timeRender(oneNote(lane));
    sameWindow(n, `lane ${lane}`);
    baseMs[lane] = ms;
    console.log(`  ${lane.padEnd(13)} ${ms.toFixed(1)}ms`);
  }
  const audioMs = (frames / 44100) * 1000;
  console.log(`\nrender window: ${audioMs.toFixed(0)}ms of audio, ${tone.length} presets to measure\n`);

  const costs = {};
  const silent = [];
  for (const v of tone) {
    const lane = homeLane(v);
    const seam = VOICE_LANES[lane];
    const bank = { ...oneNote(lane), [seam.voiceKey]: v.id };
    let ms; let n;
    try {
      ({ ms, n } = await timeRender(bank));
    } catch (e) {
      silent.push(v.id);
      console.log(`  ${v.id.padEnd(20)} ** render failed: ${e.message} **`);
      continue;
    }
    sameWindow(n, v.id);
    const cost = ((ms - baseMs[lane]) / audioMs) * 100;
    costs[v.id] = cost;
    console.log(`  ${v.id.padEnd(20)} ${lane.padEnd(8)} ${ms.toFixed(1).padStart(7)}ms`
      + `  vs ${baseMs[lane].toFixed(1)}ms base  =  ${cost >= 0 ? '+' : ''}${cost.toFixed(2)}%`);
  }

  if (silent.length) {
    console.error(`\n${silent.length} preset(s) failed to render: ${silent.join(', ')}`);
  }

  if (DRY) {
    console.log('\n--dry: src/data/voices.js not written.');
  } else {
    const rows = [];
    let line = ' ';
    for (const [id, c] of Object.entries(costs)) {
      const piece = ` ${id}: ${Number(c.toFixed(2))},`;
      if (line.length + piece.length > 80) { rows.push(line); line = ' '; }
      line += piece;
    }
    rows.push(line.replace(/,$/, ''));
    const block = `const COSTS = {\n${rows.join('\n')}\n};`;

    const src = readFileSync(FILE, 'utf8');
    const next = src.replace(/const COSTS = \{[\s\S]*?\n\};/, () => block);
    if (next === src) {
      console.error('\nCould not find the COSTS block in src/data/voices.js — not written.');
      process.exit(1);
    }
    // The lazy match above stops at the FIRST `\n};` it finds after `const COSTS = {`.
    // Reliable once COSTS already spans multiple lines, which every write after this
    // one leaves it in — but not for a single-line empty seed (`const COSTS = {};`
    // has no `\n` before its own `}`), where the match silently overshoots to the
    // NEXT `\n};` anywhere later in the file. Confirmed the hard way once: an inline
    // seed made this eat the entire STARTER table. Guard it structurally rather than
    // trust the seed is shaped right — the block right after COSTS must still be there.
    if (!next.includes('\nconst STARTER = {')) {
      console.error('\nThe COSTS replacement ate past its own block — src/data/voices.js not written.');
      process.exit(1);
    }
    writeFileSync(FILE, next);
    console.log(`\nwrote ${Object.keys(costs).length} preset costs into src/data/voices.js`);
  }
  process.exit(silent.length ? 1 : 0);
} finally {
  await renderer.close();
}
