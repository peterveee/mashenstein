// A scene change FADES the old song out, and only then puts the new song's mix on.
//
// setBank always took the old song down over SONG_FADE, and it was never heard doing it:
// the new song's mix went onto the mixer in the same call, under the old song at full
// level. Strips and returns stepped to the new settings, and a master chain rebuilt with
// lookahead started from an empty delay line — so leaving a level dropped the music to
// digital silence for ~10ms and then let it back in, through the NEW master, for the
// twenty-odd milliseconds of main thread setBank took to reach its own fade (Peter, 8 Oct
// 2026: "a bit of a cut in the audio when transitioning from one scene to another").
//
// The game now fades first (Audio.fadeSongChanges; songOut; _mixToGraph). Claims, LIVE —
// the fade is a live-only path, so this plays real songs on a real-time context in
// Chromium, muted, and records the master with an AudioWorklet:
//
//   1. THE CALL LEAVES THE GRAPH ALONE. setBank under a sounding song does not reset the
//      mixer; the held mix goes on once the fade has run, once.
//   2. THE OLD SONG FADES AND STAYS GONE. From the change, the output reaches silence
//      within the fade (plus the master's lookahead) and nothing comes back up before
//      the new song — the cut-then-return is the click.
//   3. NOTHING IS LOST TO THE HOLD. A mixer edit made straight after the change (the
//      getter applies the held mix first) survives, afterMix runs after the mix, and the
//      new song plays.
//   4. THE DESK IS UNCHANGED. With the flag off, the mix goes on inside the call.
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const REC = `
class Rec extends AudioWorkletProcessor {
  constructor() { super(); this.on = false; this.port.onmessage = (e) => { this.on = e.data; }; }
  process(inputs) {
    const i = inputs[0];
    if (this.on && i && i.length) this.port.postMessage({ f: currentFrame, l: i[0].slice(), r: (i[1] || i[0]).slice() });
    return true;
  }
}
registerProcessor('rec', Rec);`;

const ENTRY = `
import { Audio } from ${JSON.stringify(join(ROOT, 'src/engine/audio.js'))};
import { CABINET_BY_ID, HUB_THEME } from ${JSON.stringify(join(ROOT, 'src/data/cabinets.js'))};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
window.__run = async ({ fadeSongChanges, edit }) => {
  Audio.setMixerMeteringEnabled(false);
  Audio.setCaptureEnabled(false);
  Audio.fadeSongChanges = fadeSongChanges;
  Audio.ensure();
  try { await Audio.ctx.resume(); } catch {}
  if (Audio.mixer) await Audio.mixer.ready;
  const ctx = Audio.ctx;
  await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([${JSON.stringify(REC)}], { type: 'application/javascript' })));
  const rec = new AudioWorkletNode(ctx, 'rec', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2, channelCountMode: 'explicit' });
  const blocks = [];
  rec.port.onmessage = (e) => blocks.push(e.data);
  const sink = ctx.createGain(); sink.gain.value = 0; rec.connect(sink); sink.connect(ctx.destination);
  Audio.master.connect(rec);

  const mixer = Audio._mixer;
  const log = [];
  const reset = mixer.reset.bind(mixer);
  mixer.reset = () => { log.push('reset'); return reset(); };

  Audio.setBank(CABINET_BY_ID.plumber.music);
  await sleep(2200);
  rec.port.postMessage(true);
  await sleep(600);
  const resetsBefore = log.length;
  const t0 = ctx.currentTime;
  Audio.setBank(HUB_THEME);
  const resetsInCall = log.length - resetsBefore;
  const held = !!Audio._pendingMix;
  Audio.afterMix(() => log.push('afterMix'));
  // A treatment put on straight after the change, the way a screen would — through the
  // getter, which has to apply the held mix first or reset() wipes this a moment later.
  if (edit) Audio.mixer.setTreatment([{ id: 'tremolo', params: { rateSync: 1, rateDivision: 1, depth: 0.5 } }], 120);
  await sleep(1500);
  rec.port.postMessage(false);
  await sleep(50);
  return {
    t0Frame: Math.round(t0 * ctx.sampleRate), sr: ctx.sampleRate, blocks,
    resetsInCall, held, log: log.slice(resetsBefore),
    treatment: (Audio._mixer.treatment || []).map((l) => l.def?.id || l.id),
  };
};`;

let failed = false;
const assert = (cond, msg) => {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
};

// 1 ms RMS windows of the recording, indexed from the change.
function windows({ t0Frame, sr, blocks }) {
  blocks.sort((a, b) => a.f - b.f);
  const start = blocks[0].f;
  const n = blocks[blocks.length - 1].f + 128 - start;
  const L = new Float32Array(n), R = new Float32Array(n);
  for (const b of blocks) { L.set(b.l, b.f - start); R.set(b.r, b.f - start); }
  const win = Math.round(sr / 1000);
  const at = t0Frame - start;
  const rms = (ms) => {
    const a = at + ms * win;
    let e = 0;
    for (let i = a; i < a + win; i++) e += L[i] * L[i] + R[i] * R[i];
    return Math.sqrt(e / (2 * win));
  };
  return { rms, beforeMs: Math.floor(at / win), afterMs: Math.floor((n - at) / win) - 1 };
}

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
  const html = '<!doctype html><meta charset="utf-8">'
    + `<script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}<\/script>`;
  const browser = await chromium.launch({
    headless: true, args: ['--mute-audio', '--autoplay-policy=no-user-gesture-required'],
  });
  const errors = [];
  // A fresh page per run: Audio is a singleton bound to one context. An https origin,
  // because an AudioWorklet will not load anywhere else.
  const run = async (cfg) => {
    const page = await browser.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route('https://mashenstein.test/', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: html }));
    await page.goto('https://mashenstein.test/');
    const out = await page.evaluate((c) => window.__run(c), cfg);
    await page.close();
    return out;
  };

  try {
    const game = await run({ fadeSongChanges: true, edit: false });
    const w = windows(game);
    const level = (from, to) => { let m = 0; for (let ms = from; ms < to; ms++) m = Math.max(m, w.rms(ms)); return m; };
    const playing = level(-200, -1);
    assert(playing > 1e-3, `the control: the old song is playing up to the change (peak 1 ms RMS ${playing.toFixed(4)})`);

    assert(game.resetsInCall === 0 && game.held,
      `the change leaves the mixer alone inside the call (resets in call: ${game.resetsInCall}, held: ${game.held})`);
    assert(game.log.filter((x) => x === 'reset').length === 1,
      `the held mix goes on once (${game.log.join(', ')})`);
    assert(game.log.indexOf('afterMix') > game.log.indexOf('reset'),
      'afterMix runs after the held mix');

    // Silence by the end of the fade plus the master's lookahead, and nothing back up
    // until the new song's half-second gap is over.
    let silentAt = -1;
    for (let ms = 0; ms < 120; ms++) if (w.rms(ms) < 1e-5) { silentAt = ms; break; }
    // SONG_FADE is 12 ms: silent much sooner than that is a cut, not a fade.
    assert(silentAt >= 8 && silentAt <= 40, `the old song fades out, gone ${silentAt} ms after the change`);
    const back = silentAt < 0 ? Infinity : level(silentAt, 440);
    assert(back < 1e-4, `and stays gone until the new song (peak ${back.toExponential(1)} after it went quiet)`);
    const next = level(600, Math.min(1400, w.afterMs));
    assert(next > 1e-3, `the new song plays (peak 1 ms RMS ${next.toFixed(4)})`);

    const edited = await run({ fadeSongChanges: true, edit: true });
    assert(edited.treatment.includes('tremolo'),
      `a mixer edit straight after the change survives the held mix (treatment: ${edited.treatment.join(',') || 'none'})`);

    const desk = await run({ fadeSongChanges: false, edit: false });
    assert(desk.resetsInCall === 1 && !desk.held,
      `with the flag off (the desk) the mix goes on inside the call, as it always did (resets in call: ${desk.resetsInCall})`);
  } finally {
    await browser.close();
  }
  if (errors.length) { console.error('FAIL: page errors:', errors); failed = true; }
  console.log(failed ? 'SONG CHANGE FADE: FAILED' : 'SONG CHANGE FADE: PASSED');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
