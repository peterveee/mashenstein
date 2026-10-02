// VOLUME AUTOMATION AND CUTS, MEASURED OFF THE RENDERED SAMPLES.
//
// The format is src/data/automation.js; the playing of it is `_automationTick` and the
// cut doors in src/engine/audio.js. Every claim here is about what Web Audio actually
// rendered — Chromium and an OfflineAudioContext, like tests/bar-gain.js — because the
// two ways this goes wrong are both invisible in the graph: a line that is right on
// paper and lands a sixteenth late, and a cut that silences the note and then lets its
// tail back in under the next one.
//
//   1. A FADE IS THE CURVE. Every sixteenth of an Even fade-out, an Equal-power fade-in
//      and an S-curve, measured against the same song with no automation, sits within a
//      decibel of what src/data/automation.js says the line is at that point — and the
//      line HOLDS past its ends: silent after a fade-out, silent before a fade-in.
//   2. A CUT IS A CHOKE, on every kind of voice the engine plays. What was ringing is
//      gone within a few milliseconds of the cut; the note after it sounds exactly as it
//      does in a render where the note before it never existed — so nothing of the old
//      tail comes back under the new note; and nothing before the cut moved at all.
//   3. NOTHING ASKED, NOTHING CHANGED. An empty automation map renders the samples the
//      song renders without one.
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { laneCurve, curveLevelAt } from '../src/data/automation.js';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const ENTRY = `
import { Audio } from ${JSON.stringify(join(ROOT, 'src/engine/audio.js'))};
window.__Audio = Audio;
`;

let failed = false;
const assert = (cond, msg) => {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
};
const dB = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);

// 120 BPM: a sixteenth is 0.125s and a bar is 2s.
const BPM = 120;
const SPB = 60 / BPM / 4;

async function main() {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    console.error('FAIL: playwright is required: npm install');
    process.exit(1);
  }
  const esbuild = require('esbuild');
  const built = await esbuild.build({
    stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
    bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
  });
  const bundleJs = built.outputFiles[0].text;
  const html = '<!doctype html><meta charset="utf-8">'
    + `<script>${bundleJs.replace(/<\/script>/gi, '<\\/script>')}<\/script>`;
  const browser = await chromium.launch({ headless: true, args: ['--mute-audio'] });
  const errors = [];

  // One render: a bank, an optional arrangement entry, how many sixteenths to schedule,
  // and how long to render. Returns both channels' samples folded to one RMS helper's
  // worth of windows, asked for by the caller in seconds.
  async function render(label, cfg) {
    // A secure origin, served from memory, as tools/lib/render-bank-browser.js does: on
    // `about:blank` Chromium gives an AudioContext no `audioWorklet` at all, and TNGR-2 —
    // one of the voices a cut has to reach by message — would render silence.
    const page = await browser.newPage();
    page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
    await page.route('**/*', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: html }));
    await page.goto('https://mashenstein.render/', { waitUntil: 'load' });
    const out = await page.evaluate(async (c) => {
      const Audio = window.__Audio;
      const SR = 44100;
      const ctx = new OfflineAudioContext(2, SR * c.seconds, SR);
      Audio.setCaptureEnabled(false);
      Audio.setNoiseSeed(1);
      Audio.ensure(ctx);
      if (Audio.mixer) await Audio.mixer.ready;
      Audio.setBank(c.bank, c.mix ?? null, c.arrangement ?? undefined);
      Audio.nextTime = 0;
      Audio.songTrim.gain.cancelScheduledValues(0);
      Audio.songTrim.gain.setValueAtTime(Audio.musicTrim, 0);
      for (let i = 0; i < c.steps; i++) Audio.scheduleStep();
      await Audio.voices?.flushTngr2Offline?.();
      const buf = await ctx.startRendering();
      const L = buf.getChannelData(0);
      const R = buf.getChannelData(1);
      const rms = ([from, to]) => {
        const a = Math.max(0, Math.floor(from * SR));
        const b = Math.min(L.length, Math.floor(to * SR));
        let sum = 0;
        for (let i = a; i < b; i++) sum += L[i] * L[i] + R[i] * R[i];
        return b > a ? Math.sqrt(sum / ((b - a) * 2)) : 0;
      };
      return {
        windows: c.windows.map(rms),
        samples: c.samples ? [Array.from(L.subarray(0, c.samples)), Array.from(R.subarray(0, c.samples))] : null,
      };
    }, cfg);
    await page.close();
    return out;
  }

  const rest = () => new Array(32).fill(null);

  // ---- 1. fades ---------------------------------------------------------------------
  //
  // A held lead note across four bars, re-struck every bar so the reference has a level
  // to measure against in every window. The automated render divided by the plain one
  // is the line itself, whatever the note's own envelope is doing.
  {
    const notes = rest();
    const lens = rest();
    for (const s of [0, 16]) { notes[s] = 220; lens[s] = 16; }
    const bank = { bpm: BPM, lead: notes, leadLen: lens, order: [{ s: 0, bars: 2 }, { s: 0, bars: 2 }] };
    const sixteenths = Array.from({ length: 64 }, (_, i) => i);
    // Each window is the middle half of one sixteenth, so a window never straddles a
    // re-strike and the line is close to straight across it.
    const windows = sixteenths.map((i) => [(i + 0.25) * SPB, (i + 0.75) * SPB]);
    const base = { bank, steps: 64, seconds: 8.5, windows };
    const plain = await render('fade:plain', base);
    const cases = [
      { name: 'Even fade-out over bars 2–3', automation: { lead: { points: [[2, 0, 0], [4, 0, null]] } } },
      { name: 'Equal-power fade-in over bars 2–3', automation: { lead: { points: [[2, 0, null], [4, 0, 0, 'equal']] } } },
      { name: 'S-curve from 0 to -24 dB over bar 2', automation: { lead: { points: [[2, 0, 0], [3, 0, -24, 's']] } } },
    ];
    for (const c of cases) {
      const got = await render(`fade:${c.name}`, { ...base, arrangement: { automation: c.automation } });
      const curve = laneCurve(c.automation.lead);
      let worst = 0;
      let worstAt = -1;
      let heldSilent = true;
      for (const i of sixteenths) {
        if (!(plain.windows[i] > 1e-4)) continue;
        const want = curveLevelAt(curve, i + 0.5);
        const ratio = got.windows[i] / plain.windows[i];
        if (want < 10 ** (-40 / 20)) {
          // Down in the floor: silent is what is asked, and ≤ -40 dB is what counts.
          if (want === 0 && ratio > 10 ** (-60 / 20)) heldSilent = false;
          continue;
        }
        const err = Math.abs(dB(ratio) - dB(want));
        if (err > worst) { worst = err; worstAt = i; }
      }
      assert(worst < 1, `${c.name}: every sixteenth within 1 dB of the curve `
        + `(worst ${worst.toFixed(2)} dB at sixteenth ${worstAt + 1})`);
      assert(heldSilent, `${c.name}: silent wherever the line holds at −∞`);
    }
  }

  // ---- 2. cuts ----------------------------------------------------------------------
  //
  // Note A struck at the top of bar 1 and drawn long enough to ring right across bar 2;
  // a cut at bar 1, beat 3; note B at the top of bar 2. Three renders per voice: with the
  // cut, without it, and B on its own.
  const CUT_AT = 8 * SPB;            // bar 1, step 8 — one second in
  const B_AT = 16 * SPB;             // bar 2, step 0 — two seconds in
  const voices = [
    { name: 'engine square (hand-written lead)', lane: 'lead' },
    { name: 'RMND-2 epiano (pooled Tone)', lane: 'twinkle', voice: 'epiano' },
    { name: 'MRDR-3 breathPad (native layers)', lane: 'twinkle', voice: 'breathPad' },
    { name: 'WNDR-9 addDrawbar (additive organ)', lane: 'twinkle', voice: 'addDrawbar' },
    { name: 'KNDO-5 toneSquare', lane: 'twinkle', voice: 'toneSquare' },
    { name: 'JMJR-4 jmjrChoirAah (voice)', lane: 'twinkle', voice: 'jmjrChoirAah' },
    { name: 'TNGR-2 tngrOrangeCurrent (worklet)', lane: 'twinkle', voice: 'tngrOrangeCurrent' },
    { name: 'crash808Long (drum)', lane: 'crash', voice: 'crash808Long', drum: true },
  ];
  for (const v of voices) {
    const bankFor = (withA) => {
      const notes = rest();
      const lens = rest();
      if (v.drum) {
        if (withA) notes[0] = true;
        notes[16] = true;
      } else {
        if (withA) { notes[0] = 330; lens[0] = 32; }
        notes[16] = 440; lens[16] = 4;
      }
      const bank = { bpm: BPM, [v.lane]: notes, order: [{ s: 0, bars: 2 }] };
      if (!v.drum) bank[`${v.lane}Len`] = lens;
      if (v.voice) bank[`${v.lane}Voice`] = v.voice;
      return bank;
    };
    const windows = [
      [0.05, CUT_AT - 0.02],              // before the cut
      [CUT_AT + 0.03, B_AT - 0.01],       // between the cut and B
      [B_AT, B_AT + 0.6],                 // B
    ];
    const cfg = { steps: 32, seconds: 4, windows };
    const cutArr = { automation: { [v.lane]: { cuts: [[1, 8]] } } };
    const withCut = await render(`cut:${v.name}`, { ...cfg, bank: bankFor(true), arrangement: cutArr });
    const noCut = await render(`nocut:${v.name}`, { ...cfg, bank: bankFor(true) });
    const onlyB = await render(`onlyB:${v.name}`, { ...cfg, bank: bankFor(false) });
    const [before, gap, afterB] = [0, 1, 2];

    assert(noCut.windows[gap] > 1e-4,
      `${v.name}: note A is still ringing where the cut goes (rms ${noCut.windows[gap].toExponential(2)}) — the case is real`);
    assert(Math.abs(dB(withCut.windows[before] / noCut.windows[before])) < 0.2,
      `${v.name}: nothing before the cut moves `
      + `(${dB(withCut.windows[before] / noCut.windows[before]).toFixed(3)} dB)`);
    assert(withCut.windows[gap] < Math.max(1e-5, noCut.windows[gap] * 10 ** (-50 / 20)),
      `${v.name}: silent after the cut `
      + `(${dB(withCut.windows[gap]).toFixed(1)} dBFS against ${dB(noCut.windows[gap]).toFixed(1)} uncut)`);
    const bRatio = dB(withCut.windows[afterB] / onlyB.windows[afterB]);
    assert(Math.abs(bRatio) < 0.5,
      `${v.name}: the next note sounds as it does with nothing before it — no tail comes back `
      + `(${bRatio.toFixed(3)} dB against B alone)`);
  }

  // ---- 2b. the channel's own echoes ------------------------------------------------
  //
  // A cut stops the notes in front of the strip; a Delay ON the strip would go on
  // repeating what it already had. So a cut empties it — and must not take the repeats of
  // a note struck on the cut itself, which is exactly where a cut usually goes.
  //
  // Note A, short, at the top of bar 1; a cut at beat 3; note B on the cut. An eighth-note
  // delay at 120bpm is 0.25s, so A's repeats would carry on through the gap after the cut.
  for (const fx of [
    { id: 'chandelay', params: { sync: 1, division: 0.5, feedback: 0.6, mix: 0.7 } },
    { id: 'delay', params: { sync: 1, division: 0.5, feedback: 0.6, wet: 0.7 } },
    { id: 'pingpong', params: { sync: 1, division: 0.5, feedback: 0.6, wet: 0.7 } },
  ]) {
    const D = 0.25;
    const turns = fx.id === 'pingpong' ? 2 : 1;
    const bankFor = (withA, withB) => {
      const notes = rest();
      const lens = rest();
      if (withA) { notes[0] = 330; lens[0] = 1; }
      if (withB) { notes[8] = 440; lens[8] = 1; }
      return { bpm: BPM, lead: notes, leadLen: lens, order: [{ s: 0, bars: 2 }] };
    };
    const mix = { lanes: { lead: { effects: [fx] } } };
    const cutArr = { automation: { lead: { cuts: [[1, 8]] } } };
    // The gap: after A's own note and before B, measured where only repeats can be.
    const gapWin = [CUT_AT + 0.03, CUT_AT + D * turns - 0.02];
    // B's repeats, from its very first one — one delay time after the cut, which on a
    // Ping-Pong is while the right side is still being emptied.
    const bWin = [CUT_AT + D + 0.005, CUT_AT + D + 0.6];
    const cfg = { steps: 32, seconds: 4, mix };
    const echoesOfA = await render(`echo:${fx.id}:a-nocut`, { ...cfg, bank: bankFor(true, false), windows: [gapWin, [CUT_AT + 0.03, 2.5]] });
    const aCut = await render(`echo:${fx.id}:a-cut`, { ...cfg, bank: bankFor(true, false), arrangement: cutArr, windows: [gapWin, [CUT_AT + 0.03, 2.5]] });
    const bothCut = await render(`echo:${fx.id}:ab-cut`, { ...cfg, bank: bankFor(true, true), arrangement: cutArr, windows: [bWin] });
    const onlyB = await render(`echo:${fx.id}:b`, { ...cfg, bank: bankFor(false, true), windows: [bWin] });
    assert(echoesOfA.windows[1] > 1e-3,
      `${fx.id}: without a cut, A's repeats ring on past it (rms ${echoesOfA.windows[1].toExponential(2)}) — the case is real`);
    assert(aCut.windows[1] < Math.max(1e-5, echoesOfA.windows[1] * 10 ** (-40 / 20)),
      `${fx.id}: a cut empties the channel's delay — nothing of A repeats after it `
      + `(${dB(aCut.windows[1]).toFixed(1)} dBFS against ${dB(echoesOfA.windows[1]).toFixed(1)} uncut)`);
    const ratio = dB(bothCut.windows[0] / onlyB.windows[0]);
    assert(Math.abs(ratio) < 0.5,
      `${fx.id}: a note struck on the cut keeps its repeats (${ratio.toFixed(3)} dB against B alone)`);
  }

  // ---- 3. nothing asked -------------------------------------------------------------
  {
    const notes = rest();
    const lens = rest();
    for (const s of [0, 4, 8, 12, 16, 20, 24, 28]) { notes[s] = 220 * 2 ** (s / 48); lens[s] = 3; }
    const bank = { bpm: BPM, twinkle: notes, twinkleLen: lens, twinkleVoice: 'celeste2', order: [{ s: 0, bars: 2 }] };
    const SAMPLES = 44100 * 4;
    const a = await render('null:none', { bank, steps: 32, seconds: 4, windows: [], samples: SAMPLES });
    const b = await render('null:empty', { bank, steps: 32, seconds: 4, windows: [], samples: SAMPLES, arrangement: { automation: {} } });
    let maxDiff = 0;
    for (let ch = 0; ch < 2; ch++) {
      for (let i = 0; i < SAMPLES; i++) maxDiff = Math.max(maxDiff, Math.abs(a.samples[ch][i] - b.samples[ch][i]));
    }
    assert(maxDiff === 0, `an empty automation map renders the same samples (max diff ${maxDiff})`);
  }

  assert(!errors.length, `no page errors${errors.length ? `: ${errors.join('; ')}` : ''}`);
  await browser.close();
  if (failed) process.exit(1);
  console.log('\nmix-automation: all claims hold');
}

main().catch((e) => { console.error(e); process.exit(1); });
