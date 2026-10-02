// RE-APPLYING A MIX IS NOT A REBUILD — the drum-preset glitch of 2 Oct 2026.
//
// Every preset picked on the desk runs applyMix, and applyMix resets every strip — every
// effect chain emptied — and then lays the mix back over them. The chains used to be
// disposed and built again in between, and the audio thread renders against whatever the
// graph is at that instant: a master of mbCompN and l7 came back with empty lookahead
// lines, and the whole mix went to digital silence for 9ms on every choice. Measured live:
// three silent render quanta after every applyMix, none after a re-bank.
//
// The claims, in samples and in nodes: the same mix re-applied mid-song changes no sample
// and keeps every link it had; a mix that changes a chain still builds it new; a chain the
// mix takes away is disposed; and a set onto a STANDING chain still rebuilds it, because
// that is how the desk's audio watchdog replaces a chain a NaN has poisoned.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const SR = 44100;
const Q = 128;

const { chromium } = require('playwright');
const esbuild = require('esbuild');
const built = await esbuild.build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
  bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
});
const html = '<!doctype html><meta charset="utf-8">'
  + `<script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}<\/script>`;
const browser = await chromium.launch({ headless: true, args: ['--mute-audio'] });
const errors = [];

async function freshPage(label) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  await page.route('**/*', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: html }));
  await page.goto('https://mashenstein.render/', { waitUntil: 'load' });
  return page;
}

const rest = () => new Array(32).fill(null);
const held = (hz) => {
  const notes = rest(); const lens = rest();
  for (const s of [0, 16]) { notes[s] = hz; lens[s] = 16; }
  return [notes, lens];
};
const [leadN, leadL] = held(440);
const [bassN, bassL] = held(110);
const bank = { bpm: 120, lead: leadN, leadLen: leadL, bass: bassN, bassLen: bassL, order: [{ s: 0, bars: 2 }] };

// Lookahead on the master — the shape that made the gap — and an insert on a lane.
const MASTER = [
  { id: 'mbCompN', params: { 'low.threshold': -26, 'mid.threshold': -22, 'high.threshold': -26 } },
  { id: 'gain', params: { gain: -3 } },
  { id: 'l7', params: { threshold: -6, ceiling: -0.3, release: 0.06, lookahead: 3, arc: 1 } },
];
const LEAD_FX = [{ id: 'chorus', params: { wet: 0.5 } }];
const mix = { masterEffects: MASTER, lanes: { lead: { effects: LEAD_FX } } };

/**
 * One render, with `reapply` run inside a suspend at `at` seconds — what a preset choice
 * does to a playing song. The microtask queue is flushed before the render resumes, as it
 * is on the desk long before the next callback.
 */
async function render(label, { reapply = null, at = 1, seconds = 2.5 } = {}) {
  const page = await freshPage(label);
  const out = await page.evaluate(async (c) => {
    const Audio = window.__Audio;
    const ctx = new OfflineAudioContext(2, 44100 * c.seconds, 44100);
    Audio.setCaptureEnabled(false);
    Audio.setNoiseSeed(1);
    Audio.ensure(ctx);
    if (Audio.mixer) await Audio.mixer.ready;
    Audio.setBank(c.bank, c.mix);
    Audio.nextTime = 0;
    Audio.songTrim.gain.cancelScheduledValues(0);
    Audio.songTrim.gain.setValueAtTime(Audio.musicTrim, 0);
    for (let i = 0; i < 32; i++) Audio.scheduleStep();
    const m = Audio.mixer;
    const probe = {};
    if (c.reapply) {
      ctx.suspend(c.at).then(async () => {
        const before = { master: m.masterEffects.slice(), lead: m.lane('lead').effects.slice() };
        if (c.reapply === 'same') Audio.applyMix(c.bank, c.mix);
        await new Promise((r) => setTimeout(r, 0));
        probe.masterKept = m.masterEffects.length === before.master.length
          && m.masterEffects.every((l, i) => l === before.master[i]);
        probe.leadKept = m.lane('lead').effects.length === before.lead.length
          && m.lane('lead').effects.every((l, i) => l === before.lead[i]);
        ctx.resume();
      });
    }
    const buf = await ctx.startRendering();
    return { probe, x: Array.from(buf.getChannelData(0)) };
  }, { bank, mix, reapply, at, seconds });
  await page.close();
  return out;
}

/** The structural claims, on a live-shaped mixer with nothing rendering. */
async function structure() {
  const page = await freshPage('structure');
  const out = await page.evaluate(async (c) => {
    const Audio = window.__Audio;
    const ctx = new OfflineAudioContext(2, 44100, 44100);
    Audio.setCaptureEnabled(false);
    Audio.ensure(ctx);
    if (Audio.mixer) await Audio.mixer.ready;
    Audio.setBank(c.bank, c.mix);
    const m = Audio.mixer;
    const tick = () => new Promise((r) => setTimeout(r, 0));
    const same = (a, b) => a.length === b.length && a.every((l, i) => l === b[i]);
    const r = {};

    const m0 = m.masterEffects.slice();
    const l0 = m.lane('lead').effects.slice();
    Audio.applyMix(c.bank, c.mix);
    r.reapplyKeepsMaster = same(m.masterEffects, m0);
    r.reapplyKeepsLane = same(m.lane('lead').effects, l0);
    await tick();
    r.stillKeptAfterTask = same(m.masterEffects, m0) && !l0[0].node.disposed;

    // One parameter moved: that chain is a different chain, built new. The lane's is not.
    const moved = JSON.parse(JSON.stringify(c.mix));
    moved.masterEffects[1].params.gain = -4;
    Audio.applyMix(c.bank, moved);
    r.changedMasterRebuilt = m.masterEffects.length === m0.length && m.masterEffects.every((l, i) => l !== m0[i]);
    r.unchangedLaneKept = same(m.lane('lead').effects, l0);
    await tick();

    // The lane's chain taken away: gone from `chain` at once, disposed when the task ends.
    const bare = JSON.parse(JSON.stringify(moved));
    delete bare.lanes.lead.effects;
    Audio.applyMix(c.bank, bare);
    r.removedReadsEmpty = m.lane('lead').effects.length === 0;
    await tick();
    r.removedDisposed = !!l0[0].node.disposed;

    // The watchdog's repair: a set onto the standing chain, same list, builds it new.
    const m1 = m.masterEffects.slice();
    m.setMasterEffects(moved.masterEffects, c.bank.bpm);
    r.standingSetRebuilds = m.masterEffects.length === m1.length && m.masterEffects.every((l, i) => l !== m1[i]);
    return r;
  }, { bank, mix });
  await page.close();
  return out;
}

try {
  // ---- 1. the same mix re-applied mid-song changes no sample ----------------------------
  const plain = await render('plain');
  const again = await render('reapply', { reapply: 'same' });
  let diff = 0;
  for (let i = 0; i < plain.x.length; i++) diff = Math.max(diff, Math.abs(plain.x[i] - again.x[i]));
  assert(diff < 1e-6,
    `re-applying the same mix while the song plays changes no sample (max diff ${diff.toExponential(2)})`);
  let silent = 0;
  for (let q = Math.floor(0.95 * SR / Q); q < Math.floor(1.1 * SR / Q); q++) {
    let peak = 0;
    for (let i = q * Q; i < (q + 1) * Q; i++) peak = Math.max(peak, Math.abs(again.x[i]));
    if (peak < 1e-4) silent++;
  }
  assert(silent === 0, `and leaves no silent quantum where it happened (${silent}; it was three, on every preset choice)`);
  assert(again.probe.masterKept && again.probe.leadKept,
    'the master\'s lookahead chain and the lane insert are the same links afterwards, not new ones');

  // ---- 2. what still builds new, and what is disposed -------------------------------------
  const s = await structure();
  assert(s.reapplyKeepsMaster && s.reapplyKeepsLane, 'applyMix with the same mix keeps every chain\'s links');
  assert(s.stillKeptAfterTask, 'and they are still there, undisposed, once the task has ended');
  assert(s.changedMasterRebuilt, 'a chain whose settings changed is built new');
  assert(s.unchangedLaneKept, 'while an unchanged chain beside it is kept through the same apply');
  assert(s.removedReadsEmpty, 'a chain the mix takes away reads empty at once');
  assert(s.removedDisposed, 'and its nodes are disposed when the task ends — kept nodes are not leaked ones');
  assert(s.standingSetRebuilds,
    'a set onto a standing chain still rebuilds it, even to the same list — the watchdog\'s repair');

  assert(errors.length === 0, `no page errors${errors.length ? `: ${errors.join('; ')}` : ''}`);
} finally {
  await browser.close();
}

if (failed) { console.error('\nCHAIN REAPPLY: FAILED'); process.exit(1); }
console.log('\nCHAIN REAPPLY: ok');
