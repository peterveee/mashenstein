// A PER-BAR GAIN TRIM MUST NOT SILENCE THE BAR.
//
// The desk can lower or lift one lane over a range of bars — `gainBars` writes a dB
// number onto the plan, and `scheduleStep` answers it by routing that lane's notes
// through a gain pair on the way to its channel strip. That much was right.
//
// What was wrong is that the pair was BUILT PER STEP. A pooled Tone preset is wired
// to the `dry`/`wet` it was constructed with, and `VoiceRack._pool` reads a different
// pair as a different graph: it threw the pool away and built another. So every note
// on a trimmed lane disposed the synths the PREVIOUS notes were booked on — and the
// sequencer books a quarter-second ahead, so those notes were still in the future.
// They never sounded. Live, a trimmed bar played its first note and went silent for
// the rest of the bar; offline, where every step is scheduled before a sample is
// rendered, only the last note of the lane survived at all.
//
// It showed up first on celeste2 — a long-tailed bell on the twinkle lane — which is
// why that is the preset here. It is not about that preset: any lane the voice rack
// pools is the same, which is every `tone` preset in the library.
//
// Two claims, both measured off the rendered samples rather than asserted about the
// graph:
//
//   1. EVERY NOTE IN A TRIMMED BAR SOUNDS. Four notes, four windows, all audible.
//      This is the regression: before the fix, windows 1-3 were silence.
//   2. THE TRIM IS THE TRIM. A bar trimmed -6 dB renders what the same song renders
//      with the lane's own gain lowered 6 dB instead. A bar that plays every note at
//      the wrong level would pass the first claim on its own.
//
// Chromium and OfflineAudioContext, like tests/song-switch.js, for the same reason:
// the claim is about what Web Audio actually rendered.
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

// 120 BPM: a sixteenth is 0.125s and a bar is 2s. Notes on the four beats of each
// bar — steps 0, 4, 8, 12 — so a window per note is a quarter of a bar wide.
const BPM = 120;
const TRIM_DB = -6;
const SECONDS = 5;

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
  // its lifetime, exactly as tools/lib/render-bank-browser.js explains.
  async function render(mode) {
    const page = await browser.newPage();
    page.on('pageerror', (e) => errors.push(`${mode}: ${e.message}`));
    await page.setContent(
      `<!doctype html><meta charset="utf-8">`
      + `<script>${bundleJs.replace(/<\/script>/gi, '<\\/script>')}<\/script>`,
      { waitUntil: 'load' },
    );
    const out = await page.evaluate(async (cfg) => {
      const Audio = window.__Audio;
      const SR = 44100;
      const rest = () => new Array(32).fill(null);
      // Four notes to the bar, an octave apart from each other so a window cannot be
      // confused with the tail of the note before it by pitch alone. Only the first
      // bar is measured; the second is there so the plan is a real two-bar entry.
      const notes = rest();
      const lens = rest();
      [0, 4, 8, 12].forEach((s, i) => { notes[s] = 440 * (2 ** (i / 12)); lens[s] = 3; });
      // The lane's own level, stated rather than derived, so the two renders differ in
      // exactly one thing: where the 6 dB comes off.
      const BASE_GAIN = 0.25;
      const scale = 10 ** (cfg.trimDb / 20);
      const bank = {
        bpm: cfg.bpm,
        twinkle: notes,
        twinkleLen: lens,
        twinkleVoice: 'celeste2',
        twinkleGain: cfg.mode === 'lane-gain' ? BASE_GAIN * scale : BASE_GAIN,
        // The bar trim, on the arrangement rather than on the bank — this is what
        // `gainBars` writes and what `expandOrder` carries onto each bar.
        order: cfg.mode === 'bar-trim'
          ? [{ s: 0, bars: 2, gain: { twinkle: cfg.trimDb } }]
          : [{ s: 0, bars: 2 }],
      };

      const ctx = new OfflineAudioContext(2, SR * cfg.seconds, SR);
      Audio.setCaptureEnabled(false);
      Audio.setNoiseSeed(1);
      Audio.ensure(ctx);
      if (Audio.mixer) await Audio.mixer.ready;

      Audio.setBank(bank, null);
      // From sample zero at full trim, like every other offline render here: the gap
      // setBank opens is for live playback, and this render starts from silence.
      Audio.nextTime = 0;
      Audio.songTrim.gain.cancelScheduledValues(0);
      Audio.songTrim.gain.setValueAtTime(Audio.musicTrim, 0);
      const spb = (60 / cfg.bpm) / 4;
      // Two bars — the whole plan — scheduled before a sample is rendered, which is
      // what an offline bounce does and what made the bug total rather than partial.
      for (let i = 0; i < 32; i++) Audio.scheduleStep();

      const buf = await ctx.startRendering();
      const L = buf.getChannelData(0);
      const R = buf.getChannelData(1);
      // RMS over a window, both channels: the lane is panned by whatever the default
      // strip does, and neither channel alone is the note.
      const rms = (from, to) => {
        const a = Math.max(0, Math.floor(from * SR));
        const b = Math.min(L.length, Math.floor(to * SR));
        let sum = 0;
        for (let i = a; i < b; i++) sum += L[i] * L[i] + R[i] * R[i];
        return b > a ? Math.sqrt(sum / ((b - a) * 2)) : 0;
      };
      // One window per note: from its onset to just before the next. A window holds
      // its own note's attack plus whatever is left of the one before, which is why
      // the two renders are compared window for window rather than against a constant.
      const windows = [0, 4, 8, 12].map((s) => rms(s * spb, (s + 4) * spb));
      // The noise floor to call "silent" against: the last half second of the render,
      // long after the fourth note's 1.6s release has run out.
      const floor = rms(cfg.seconds - 0.5, cfg.seconds);
      return { windows, floor };
    }, { bpm: BPM, trimDb: TRIM_DB, seconds: SECONDS, mode });
    await page.close();
    return out;
  }

  const trimmed = await render('bar-trim');
  const reference = await render('lane-gain');

  assert(!errors.length, `no page errors${errors.length ? `: ${errors.join('; ')}` : ''}`);

  // 1. Every note in the trimmed bar sounds.
  trimmed.windows.forEach((level, i) => {
    assert(level > Math.max(trimmed.floor * 20, 1e-4),
      `note ${i + 1} of a ${TRIM_DB} dB bar is audible `
      + `(rms ${level.toExponential(2)}, floor ${trimmed.floor.toExponential(2)})`);
  });

  // 2. The trim is worth what it says. Window for window against the same song with
  //    the 6 dB taken off the lane's own gain instead: same notes, same envelopes,
  //    one multiply in a different place, so these are the same render.
  trimmed.windows.forEach((level, i) => {
    const want = reference.windows[i];
    const ratio = want > 0 ? level / want : Infinity;
    assert(Math.abs(ratio - 1) < 0.02,
      `note ${i + 1} at ${TRIM_DB} dB on the bar matches ${TRIM_DB} dB on the lane `
      + `(ratio ${ratio.toFixed(4)})`);
  });

  await browser.close();
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
