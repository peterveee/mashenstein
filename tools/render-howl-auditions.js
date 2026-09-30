// Audition sweep: synthesised howls for the Speed Zone coyote and the frost wolves.
//
// A howl is a sung vowel: it starts closed (ooh), opens (aw) as the head goes back,
// scoops UP into its long note and falls away at the end. JMJR-4 already has every
// part of that — MORPH TO with MORPH TIME opens the vowel, BEND scoops a fresh note,
// LEGATO + GLIDE carry one breath through the rise and the fall, vibrato does the
// wobble — so each candidate here is a JMJR-4 preset plus the notes it plays, and
// the notes are what a song lane would hold. That is the point of doing it on a desk
// synth rather than as a one-off cue: a preset can sit in a lane, in key, on the beat.
//
//   howl-a-lone-wolf     one voice, ooh opening to aw, rise-hold-fall. The control.
//   howl-b-coyote-yips   three scooped yips, then the howl. The cartoon coyote.
//   howl-c-pack          three loose voices joining one after another, a pack.
//   howl-d-chip          the lone wolf through the arcade crusher, kin to the SFX.
//   howl-e-awoo-beat     short "a-WOO" figures cut to the grid, then one long one:
//                        the candidate written to be played rhythmically.
//   howl-f-mrdr3-choir   MRDR-3's BEST Choir Aah played legato with a glide — the
//                        no-new-synth answer, for comparison.
//
// Each candidate renders twice: <id>.wav alone, and <id>-on-beat.wav placed on bar 2
// of four bars of a plain kick/hat bed at Speed Zone's 128 BPM, E minor, so the
// rhythmic question can be heard. All six solo takes share ONE peak ceiling (the
// loudest at 0.89), so level differences are the candidates'.
//
// Usage: node tools/render-howl-auditions.js [outDir]   (default work/auditions/howls)
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { wavBuffer, SR } from './lib/wav.js';

const require = createRequire(import.meta.url);
const root = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
const outDir = resolve(process.argv[2] || join(root, 'work', 'auditions', 'howls'));

const BPM = 128;
const BEAT = 60 / BPM;
const BAR = 4 * BEAT;

// E minor, Speed Zone's key
const HZ = (n) => {
  const m = /^([A-G])(#?)(\d)$/.exec(n);
  const semi = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0);
  return 440 * 2 ** ((semi + 12 * (+m[3] + 1) - 69) / 12);
};

// A phrase is [beat, note, beats]. Legato notes overlap the next by a hair so the gate
// is still open when it arrives; a gap closes it and the next note strikes afresh.
const TIE = 0.06;

const RISE_HOLD_FALL = (lo, hi, fall) => [
  [0, lo, 0.5 + TIE], [0.5, hi, 3 + TIE], [3.5, fall, 1.5],
];

const CANDIDATES = [
  {
    id: 'howl-a-lone-wolf', name: 'LONE WOLF',
    note: 'One voice on a smaller-than-human throat, ooh opening to aw over half a second, B4 up to E5, held, falling back to B4.',
    voice: {
      synth: 'JMJR-4', mode: 'legato', portamento: 0.28,
      jmjr4: { voice: 'announcer', line: 'ooh', morphTo: 'AW', morph: 100, morphTime: 0.6,
        tract: 1.2, breath: 0.4, tilt: 2, unison: 1,
        amp: { attack: 0.12, decay: 0.3, sustain: 1, release: 0.45 } },
      vibrato: { depth: 0.28, rate: 5.4, delay: 0.5 },
    },
    lines: [RISE_HOLD_FALL('B4', 'E5', 'B4')],
  },
  {
    id: 'howl-b-coyote-yips', name: 'COYOTE YIPS',
    note: 'Three short eeh yips, each scooping up a fifth, then the howl on the small throat: E5 up to B5, falling to G5.',
    voice: {
      synth: 'JMJR-4', mode: 'legato', portamento: 0.22,
      jmjr4: { voice: 'small', line: 'eeh eeh eeh ooh ooh ooh', morphTo: 'AW', morph: 100, morphTime: 0.5,
        bend: -7, bendTime: 0.07, tract: 1.15, breath: 0.35, unison: 1,
        amp: { attack: 0.01, decay: 0.2, sustain: 1, release: 0.25 } },
      vibrato: { depth: 0.35, rate: 6, delay: 0.35 },
    },
    lines: [[
      [0, 'B5', 0.2], [0.5, 'B5', 0.2], [1, 'B5', 0.2],
      [1.5, 'E5', 0.5 + TIE], [2, 'B5', 2.5 + TIE], [4.5, 'G5', 1.25],
    ]],
  },
  {
    id: 'howl-c-pack', name: 'PACK',
    note: 'Three loose voices (unison 2 each, wide spread) joining a beat apart on B4, E5 and G5 — the frost wolves, leader first.',
    voice: {
      synth: 'JMJR-4', mode: 'legato', portamento: 0.3,
      jmjr4: { voice: 'chorister', line: 'ooh', morphTo: 'AW', morph: 100, morphTime: 0.7,
        tract: 1.12, breath: 0.45, tilt: 3, unison: 2, spread: 45, resonance: 40,
        amp: { attack: 0.15, decay: 0.3, sustain: 1, release: 0.6 } },
      vibrato: { depth: 0.3, rate: 5.1, delay: 0.5 },
    },
    lines: [
      RISE_HOLD_FALL('G4', 'B4', 'G4'),
      RISE_HOLD_FALL('B4', 'E5', 'B4').map(([b, n, d]) => [b + 1, n, d]),
      RISE_HOLD_FALL('D5', 'G5', 'D5').map(([b, n, d]) => [b + 2, n, d]),
    ],
    gain: 0.6,
  },
  {
    id: 'howl-d-chip', name: 'CHIP',
    note: 'The lone wolf on the robot throat, no breath, through BITS 6 / RATE 11 kHz, faster vibrato: a howl from the same box as the SFX.',
    voice: {
      synth: 'JMJR-4', mode: 'legato', portamento: 0.25,
      jmjr4: { voice: 'robot', line: 'ooh', morphTo: 'AW', morph: 100, morphTime: 0.5,
        tract: 1.2, breath: 0, unison: 1, bits: 6, rate: 11,
        amp: { attack: 0.05, decay: 0.3, sustain: 1, release: 0.3 } },
      vibrato: { depth: 0.4, rate: 7, delay: 0.3 },
    },
    lines: [RISE_HOLD_FALL('B4', 'E5', 'B4')],
  },
  {
    id: 'howl-e-awoo-beat', name: 'AWOO ON THE BEAT',
    note: 'Written for the grid: "a-WOO" on beat 1 and beat 3, a sixteenth pickup scooping into each, then a long one over the next bar that falls on its last beat.',
    voice: {
      synth: 'JMJR-4', mode: 'legato', portamento: 0.08,
      jmjr4: { voice: 'announcer', line: 'wah ooh', morphTo: 'AW', morph: 100, morphTime: 0.25,
        bend: -3, bendTime: 0.06, tract: 1.2, breath: 0.35, unison: 2, spread: 18,
        amp: { attack: 0.01, decay: 0.25, sustain: 0.9, release: 0.18 } },
      vibrato: { depth: 0.25, rate: 5.3, delay: 0.25 },
    },
    // the phrase starts a sixteenth early so the WOO lands ON the beat
    lines: [[
      [-0.25, 'B4', 0.25 + TIE], [0, 'E5', 1.1],
      [1.75, 'B4', 0.25 + TIE], [2, 'E5', 1.1],
      [3.75, 'B4', 0.25 + TIE], [4, 'G5', 3 + TIE], [7, 'E5', 1],
    ]],
  },
  {
    id: 'howl-f-mrdr3-choir', name: 'MRDR-3 CHOIR, LEGATO',
    note: 'The shipped BEST Choir Aah with KEY MODE legato and a 0.28 s glide, same notes as the lone wolf. No vowel movement: MRDR-3\'s formants are fixed.',
    voice: 'bestChoirAah',
    override: { mode: 'legato', portamento: 0.28 },
    lines: [RISE_HOLD_FALL('B4', 'E5', 'B4')],
  },
];

// ---- the page -----------------------------------------------------------------------

const ENTRY = `
import { VOICES } from ${JSON.stringify(join(root, 'src/data/voices.js'))};
import { VoiceRack } from ${JSON.stringify(join(root, 'src/engine/voices.js'))};
window.__render = async ({ id, voice, override, lines, seconds, lead, bed, beat, gain }) => {
  const RATE = ${SR};
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * RATE), RATE);
  const base = typeof voice === 'string' ? VOICES[voice] : voice;
  if (!base) throw new Error('no voice ' + voice);
  const v = { ...base, ...(override || {}), id, label: id };
  VOICES[id] = v;
  const rack = new VoiceRack(ctx);
  const dry = ctx.createGain(); dry.connect(ctx.destination);
  let step = 0;
  lines.forEach((line, li) => line.forEach(([t, hz, d]) => {
    rack.play('howl' + li, id, hz, { time: lead + t, dur: d, gain: 0.8 * (gain ?? 1), dry, wet: null, echo: false, step: step++ });
  }));
  if (bed) {
    // four bars of four-on-the-floor and offbeat hats, the plainest possible clock
    const noise = ctx.createBuffer(1, RATE, RATE);
    const nd = noise.getChannelData(0);
    let s = 0x2545f491;
    for (let i = 0; i < nd.length; i++) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; nd[i] = ((s >>> 0) / 4294967296) * 2 - 1; }
    for (let b = 0; b < 16; b++) {
      const t = b * beat + 0.02;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime(0.55, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.32);
      const h = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), hg = ctx.createGain();
      h.buffer = noise; hp.type = 'highpass'; hp.frequency.value = 7000;
      const ht = t + beat / 2;
      hg.gain.setValueAtTime(0.12, ht); hg.gain.exponentialRampToValueAtTime(0.001, ht + 0.05);
      h.connect(hp); hp.connect(hg); hg.connect(ctx.destination); h.start(ht); h.stop(ht + 0.06);
    }
  }
  const r = await ctx.startRendering();
  return { l: Array.from(r.getChannelData(0)), r: Array.from(r.getChannelData(1)) };
};
`;

const { chromium } = require('playwright');
const esbuild = require('esbuild');
const built = await esbuild.build({ stdin: { contents: ENTRY, resolveDir: root, loader: 'js' }, bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent' });
const html = '<!doctype html><meta charset="utf-8">' + `<script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}<\/script>`;

const peakOf = (a) => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const rmsDb = (a) => 20 * Math.log10(Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length) + 1e-9);

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('PAGEERROR:', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.route('**/*', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: html }));
  await page.goto('https://howl-audition.test/', { waitUntil: 'load' });

  const solo = [];
  for (const c of CANDIDATES) {
    const lines = c.lines.map((line) => line.map(([b, n, d]) => [b * BEAT, HZ(n), d * BEAT]));
    const end = Math.max(...lines.flat().map(([t, , d]) => t + d));
    const common = { id: c.id, voice: c.voice, override: c.override, lines, gain: c.gain };
    const alone = await page.evaluate((a) => window.__render(a), { ...common, lead: 0.3, seconds: 0.3 + end + 1.5 });
    const onBeat = await page.evaluate((a) => window.__render(a), { ...common, lead: BAR + 0.02, seconds: 4 * BAR + 1, bed: true, beat: BEAT });
    if (peakOf(alone.l) < 1e-4) console.error(`${c.id}: SILENT`);
    solo.push({ c, alone, onBeat });
  }

  // one ceiling for the solo set; the on-beat takes use the same scale, so the howl sits
  // at the same level against the same bed in every one of them
  const scale = 0.89 / Math.max(...solo.map((s) => peakOf(s.alone.l)));
  const rows = [];
  for (const { c, alone, onBeat } of solo) {
    const f = (x) => Float32Array.from(x, (v) => v * scale);
    const L = f(alone.l);
    writeFileSync(join(outDir, `${c.id}.wav`), wavBuffer([L, f(alone.r)]));
    writeFileSync(join(outDir, `${c.id}-on-beat.wav`), wavBuffer([f(onBeat.l), f(onBeat.r)]));
    const line = `${c.id.padEnd(22)} peak ${peakOf(L).toFixed(2)}  rms ${rmsDb(L).toFixed(1)} dB`;
    console.log(line);
    rows.push(`| ${c.id} | ${c.name} | ${c.note} |`);
  }
  writeFileSync(join(outDir, 'README.md'), [
    '# Howl bake-off',
    '',
    `Rendered by \`node tools/render-howl-auditions.js\`. Each candidate alone, and \`-on-beat\` on bar 2 of four bars of kick/hat at ${BPM} BPM (Speed Zone), E minor. One peak ceiling across the set.`,
    '',
    '| File | Name | What it is |',
    '| --- | --- | --- |',
    ...rows,
    '',
  ].join('\n'));
} finally {
  await browser.close();
}
console.log(`\nwrote ${CANDIDATES.length * 2} files to ${outDir}`);
