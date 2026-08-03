// What a treatment handing over actually SOUNDS like, measured in samples.
//
// tests/music-variant.js proves the clock is untouched, which is a claim about counters.
// This is the other half and the one that caught a real bug: a lane the cabinet screen
// silenced has to come BACK when the level starts. Arming a treatment goes through
// applyMix and leaving it goes through a ramp, and while those two wrote a lane's level
// to two different nodes, the lead never returned — visible nowhere except here, because
// every counter was correct the whole time.
//
// The mirror image of tests/song-switch.js. There, a bank change must leave a held note
// at under 1e-4: gone. Here, a treatment change must leave one still sounding. Same
// measurement, opposite sign, and between them they say what the two primitives are for.
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

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
  const browser = await chromium.launch({ headless: true });
  const errors = [];

  // A fresh page per render: Audio is a singleton and `ensure` binds one context for
  // its lifetime, exactly as tests/song-switch.js and render-bank-browser.js explain.
  async function render(mode) {
    const page = await browser.newPage();
    page.on('pageerror', (e) => errors.push(`${mode}: ${e.message}`));
    await page.setContent(
      `<!doctype html><meta charset="utf-8">`
      + `<script>${bundleJs.replace(/<\/script>/gi, '<\\/script>')}<\/script>`,
      { waitUntil: 'load' },
    );
    const out = await page.evaluate(async (m) => {
      const Audio = window.__Audio;
      const SR = 44100;
      const SECONDS = 4;
      const AT = 2;                       // where the level starts

      // Two lanes, each one note held across the whole render, so the level of what is
      // sounding is flat and any change in it is the change under test rather than the
      // song moving on. The lead is still ringing when the treatment lets go of it,
      // which is the case that clicks if a snap is a true step.
      const rest = () => new Array(32).fill(null);
      const held = (hz) => { const a = rest(); a[0] = hz; return a; };
      const lens = () => { const a = rest(); a[0] = 64; return a; };
      const BANK = {
        bpm: 120,
        bass: held(110), bassLen: lens(), bassGain: 0.4,
        lead: held(440), leadLen: lens(), leadGain: 0.4,
      };
      // The cabinet screen: the tune sits out, and what is left goes to the reverb.
      const TREATMENT = { lanes: { lead: { mute: true }, bass: { send: { reverb: 0.7 } } } };
      // The level: the song's own mix, which for this bank says nothing at all.
      const LEVEL = null;

      const ctx = new OfflineAudioContext(2, SR * SECONDS, SR);
      Audio.setCaptureEnabled(false);
      Audio.setNoiseSeed(1);
      Audio.ensure(ctx);
      if (Audio.mixer) await Audio.mixer.ready;

      // The treatment LEG, for the filter case: a high-pass that the level fades away
      // from rather than switching out. Armed before the render starts, exactly as
      // MusicDirector.play does after a bank change.
      if (m === 'filter' || m === 'filterHeld') {
        Audio.mixer.setTreatment([{ id: 'filter', params: { type: 'highpass', frequency: 520, Q: 0.9 } }], BANK.bpm);
        Audio.mixer.rampTreatment(1, 0, 0);
      }
      Audio.setBank(BANK, TREATMENT);
      if (m === 'filter' || m === 'filterHeld') {
        // setBank resets the desk, the treatment leg with it — so re-arm after.
        Audio.mixer.setTreatment([{ id: 'filter', params: { type: 'highpass', frequency: 520, Q: 0.9 } }], BANK.bpm);
        Audio.mixer.rampTreatment(1, 0, 0);
      }
      // From sample zero at full trim: the gap setBank opens is for live playback, and
      // this render starts from silence anyway.
      Audio.nextTime = 0;
      Audio.songTrim.gain.cancelScheduledValues(0);
      Audio.songTrim.gain.setValueAtTime(Audio.musicTrim, 0);
      const spb = (60 / BANK.bpm) / 4;
      for (let t = 0; t < SECONDS; t += spb) Audio.scheduleStep();

      let buf;
      if (m === 'control' || m === 'filterHeld') {
        buf = await ctx.startRendering();
      } else {
        const reached = ctx.suspend(AT);
        const done = ctx.startRendering();
        await reached;
        // The handover, at a real point in the render and aimed at the moment the
        // render has reached — the same call MusicDirector makes on a bar line.
        // Half a bar, not a whole one: a bar at 120bpm is two seconds, which would still
        // be fading when this four-second render ran out and leave nothing settled to
        // measure. The length under test is that it takes time and arrives, not the number.
        Audio.rampMix(LEVEL, ctx.currentTime, m === 'crossfade' ? 1.0 * (60 / BANK.bpm) : 0);
        // The filter opens INTO the level rather than being switched off it.
        if (m === 'filter') Audio.mixer.rampTreatment(0, ctx.currentTime, 0.5);
        ctx.resume();
        buf = await done;
      }

      const L = buf.getChannelData(0);
      const R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;
      const rms = (from, to) => {
        let s = 0; let n = 0;
        for (let i = Math.floor(from * SR); i < Math.min(Math.floor(to * SR), L.length); i++) {
          const v = (L[i] + R[i]) / 2; s += v * v; n++;
        }
        return n ? Math.sqrt(s / n) : 0;
      };
      const peak = (from, to) => {
        let p = 0;
        for (let i = Math.floor(from * SR); i < Math.min(Math.floor(to * SR), L.length); i++) {
          p = Math.max(p, Math.abs(L[i]), Math.abs(R[i]));
        }
        return p;
      };
      // Sample-to-sample jump, which is what a click IS — a step in the waveform. A
      // held tone at these frequencies moves far less than this between samples.
      const maxJump = (from, to) => {
        let d = 0;
        for (let i = Math.floor(from * SR) + 1; i < Math.min(Math.floor(to * SR), L.length); i++) {
          d = Math.max(d, Math.abs(L[i] - L[i - 1]));
        }
        return d;
      };
      // Energy below ~300Hz, through a one-pole lowpass — the band a high-pass takes
      // away, and the only measurement that can tell "the filter came off" from "it got
      // louder". A broadband RMS cannot: the filter removes level AND bottom together.
      const lowRms = (from, to) => {
        const a = Math.exp(-2 * Math.PI * 300 / SR);
        let y = 0; let sum = 0; let n = 0;
        const i0 = Math.floor(from * SR);
        for (let i = Math.max(0, i0 - SR / 10); i < Math.min(Math.floor(to * SR), L.length); i++) {
          y = (1 - a) * ((L[i] + R[i]) / 2) + a * y;
          if (i >= i0) { sum += y * y; n++; }
        }
        return n ? Math.sqrt(sum / n) : 0;
      };
      return {
        lowBefore: lowRms(0.5, 1.8),
        lowAfter: lowRms(2.6, 3.6),
        before: rms(0.5, 1.8),
        after: rms(2.2, 3.5),
        // Past the end of the longest fade under test, so a crossfade can be asked
        // whether it ARRIVED as well as whether it moved.
        late: rms(3.2, 3.9),
        boundaryPeak: peak(AT - 0.015, AT + 0.015),
        sidePeak: Math.max(peak(AT - 0.25, AT - 0.05), peak(AT + 0.05, AT + 0.25)),
        boundaryJump: maxJump(AT - 0.015, AT + 0.015),
        settledJump: maxJump(AT + 0.3, AT + 0.6),
      };
    }, mode);
    await page.close();
    return out;
  }

  const control = await render('control');
  const filt = await render('filter');
  const filtHeld = await render('filterHeld');
  const snap = await render('snap');
  const fade = await render('crossfade');
  await browser.close();

  for (const error of errors) assert(false, `page error — ${error}`);

  // Measured against the SAME WINDOW of the control render, never against the window
  // before the change in its own. These notes decay, so a before/after inside one render
  // is reading the envelope and would call a treatment that never let go a success.
  assert(control.after > 0.001,
    `with no handover the treatment holds and something is still sounding (rms ${control.after.toFixed(4)})`);

  assert(snap.after > control.after * 1.4,
    `a lane the treatment muted comes back when the level starts `
    + `(rms ${control.after.toFixed(4)} held → ${snap.after.toFixed(4)} handed over)`);
  assert(Math.abs(snap.before - control.before) / control.before < 0.01,
    'and nothing moved before the boundary — the two renders are the same song until then');

  assert(snap.boundaryJump < snap.settledJump * 2.5,
    `bringing it back does not click — the biggest sample step at the boundary (${snap.boundaryJump.toExponential(2)}) `
    + `is in line with the settled signal (${snap.settledJump.toExponential(2)})`);
  assert(snap.boundaryPeak <= snap.sidePeak * 1.2,
    'and nothing overshoots across the change');

  assert(fade.late > control.late * 1.4 && Math.abs(fade.late - snap.late) / snap.late < 0.05,
    `a crossfade arrives at the same place as a snap, only later `
    + `(settled rms ${snap.late.toFixed(4)} snapped vs ${fade.late.toFixed(4)} faded)`);
  assert(fade.after < snap.after && fade.boundaryJump <= snap.boundaryJump,
    'by a gentler route — still on its way where the snap had already got there, and never edgier at the boundary');

  assert(filtHeld.lowAfter < filtHeld.lowBefore * 1.6,
    `a treatment high-pass holds the bottom end out for as long as it is up `
    + `(low-band rms ${filtHeld.lowBefore.toFixed(5)} -> ${filtHeld.lowAfter.toFixed(5)})`);
  assert(filt.lowAfter > filtHeld.lowAfter * 3,
    `and fading away from it brings the bottom back `
    + `(low-band rms ${filtHeld.lowAfter.toFixed(5)} held -> ${filt.lowAfter.toFixed(5)} opened)`);
  assert(Math.abs(filt.lowBefore - filtHeld.lowBefore) / filtHeld.lowBefore < 0.01,
    'and nothing moved before the boundary — the two renders are the same until then');

  console.log(failed ? 'MUSIC VARIANT RENDER: FAILED' : 'MUSIC VARIANT RENDER: PASSED');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
