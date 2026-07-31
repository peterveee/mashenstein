// Opening a song STOPS the song that was playing.
//
// `setBank` has always answered that with half a second of silence: the trim is
// slammed down, the new song is scheduled behind the gap, and whatever was left in
// the 120ms lookahead dies unheard. That worked for as long as every note was shorter
// than the gap — a bass note is 1.8 steps, a lead 1.2 — but a note is a source node
// with its own stop time, and nothing was ever holding one. When the trim came back
// up, anything still running came back up with it.
//
// The piano roll's per-note lengths turned that from a technicality into the bug you
// could hear: a drawn note can be bars long, so opening another song left the old
// one's chord ringing over the new one's downbeat. Sweeps, crashes and the sustained
// organ were always long enough to do it too.
//
// So the sequencer's notes now play through a per-lane gate that the next song
// disconnects — see `_laneGate` in src/engine/audio.js. This suite is the proof, and
// it is measured in samples rather than asserted about the graph, because "the old
// song is not audible" is a claim about the output and nothing else:
//
//   1. A HELD NOTE IS AUDIBLE. The control. A twenty-second note is still sounding
//      three seconds in, or the other two cases prove nothing at all.
//   2. OPENING ANOTHER SONG SILENCES IT. Same render, one `setBank` at two seconds,
//      and everything after the half-second gap is silence — not the old note under
//      the new song, and not the old note fading.
//   3. SO DOES STOPPING. `setBank(null)` is the desk's Pause and the game's "no song";
//      it goes through the same door and has to leave the same silence.
//
// Chromium, because the claim is about Web Audio's own rendering. Offline, so the
// five seconds render in a fraction of one — `ctx.suspend(t)` is what makes the song
// change land at an exact time inside the render, which realtime could only
// approximate.
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

// One bass note, twenty seconds long, at the top of a two-bar bank. Long enough that
// its own envelope has barely moved by the end of the render, so anything the window
// after the switch picks up is the note and not a tail.
const HELD_STEPS = 160;
const SECONDS = 5;
const SWITCH_AT = 2;
// The gap `setBank` opens is 0.5s. Measure from 0.6 so the window is entirely after
// the trim has come back up — which is the moment the bug was audible.
const LISTEN_FROM = SWITCH_AT + 0.6;

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
      const held = () => { const a = rest(); a[0] = 220; return a; };
      const lens = () => { const a = rest(); a[0] = cfg.heldSteps; return a; };
      // No mix, so no sends: nothing in the render but the lane itself, and therefore
      // no reverb or echo tail to argue about afterwards.
      const HELD = { bpm: 120, bass: held(), bassLen: lens(), bassGain: 0.5 };
      const NEXT = { bpm: 120, bass: rest() };

      const ctx = new OfflineAudioContext(2, SR * cfg.seconds, SR);
      Audio.setCaptureEnabled(false);
      Audio.setNoiseSeed(1);
      Audio.ensure(ctx);
      if (Audio.mixer) await Audio.mixer.ready;

      Audio.setBank(HELD, null);
      // From sample zero at full trim, like every other offline render here: the gap
      // setBank opens is for live playback, and this render starts from silence.
      Audio.nextTime = 0;
      Audio.songTrim.gain.cancelScheduledValues(0);
      Audio.songTrim.gain.setValueAtTime(Audio.musicTrim, 0);
      const spb = (60 / HELD.bpm) / 4;
      for (let t = 0; t < cfg.switchAt; t += spb) Audio.scheduleStep();

      if (cfg.mode !== 'control') {
        const reached = ctx.suspend(cfg.switchAt);
        const done = ctx.startRendering();
        await reached;
        // The song change itself, at a real point in the render: `ctx.currentTime` is
        // the suspend time, so the engine mutes and re-opens exactly where a player
        // clicking another song would have put it.
        Audio.setBank(cfg.mode === 'stop' ? null : NEXT, null);
        ctx.resume();
        const buf = await done;
        return peaks(buf, cfg);
      }
      const buf = await ctx.startRendering();
      return peaks(buf, cfg);

      function peaks(rendered, c) {
        const L = rendered.getChannelData(0);
        const R = rendered.numberOfChannels > 1 ? rendered.getChannelData(1) : L;
        const peak = (from, to) => {
          let p = 0;
          for (let i = Math.floor(from * SR); i < Math.min(Math.floor(to * SR), L.length); i++) {
            const a = Math.abs(L[i]), b = Math.abs(R[i]);
            if (a > p) p = a;
            if (b > p) p = b;
          }
          return p;
        };
        return {
          before: peak(0, c.switchAt),
          after: peak(c.listenFrom, c.seconds),
        };
      }
    }, {
      mode, seconds: SECONDS, switchAt: SWITCH_AT, listenFrom: LISTEN_FROM, heldSteps: HELD_STEPS,
    });
    await page.close();
    return out;
  }

  const control = await render('control');
  const opened = await render('open');
  const stopped = await render('stop');
  await browser.close();

  for (const e of errors) assert(false, `page error — ${e}`);

  // ---- 1. a held note is audible ---------------------------------------------
  assert(control.before > 0.01, `the note sounds while it plays (peak ${control.before.toExponential(2)})`);
  assert(control.after > 0.01,
    `and is still sounding ${LISTEN_FROM}s in, with nothing to stop it (peak ${control.after.toExponential(2)})`);

  // ---- 2. opening another song silences it ------------------------------------
  assert(opened.before > 0.01, 'the note sounds up to the moment another song is opened');
  assert(opened.after < 1e-4,
    `opening another song leaves silence behind it, not the old note (peak ${opened.after.toExponential(2)})`);
  assert(opened.after < control.after / 100,
    'and the difference is the whole note, not a fade');

  // ---- 3. so does stopping -----------------------------------------------------
  assert(stopped.after < 1e-4,
    `setBank(null) stops what is sounding too (peak ${stopped.after.toExponential(2)})`);

  console.log(failed ? 'SONG SWITCH: FAILED' : 'SONG SWITCH: PASSED');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
