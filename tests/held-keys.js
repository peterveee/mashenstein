/**
 * THREE KEYS DOWN, ONE LET GO.
 *
 * A held note is the one kind the rack does not know the length of, and a MONO or LEGATO
 * preset answers every key on a lane through ONE instrument. Which note that instrument
 * plays is LAST NOTE PRIORITY, and this suite is the two things that follow from it:
 *
 *   · a key that is not the one SPEAKING comes up in silence — the note it opened
 *     belongs to somebody else now, and releasing it stops a sound two other fingers
 *     are still asking for;
 *   · the key that IS speaking hands the note back rather than ending it. Letting go
 *     never STARTS a note, so the pitch moves and the envelope stays where it stands.
 *
 * Every path in the rack that can sound a held note is asked the same question here,
 * because each of them had a different half of it wrong: the pooled Tone classes cut the
 * sound on ANY key coming up (hold a chord on an FMSynth, let go of one key, silence),
 * while MRDR-3 and TNGR-2 ignored the older keys correctly and cut the note when the key
 * holding it came up. POLY is in the table too, and its answer is the plain one: the
 * other two notes keep sounding, which is also the pooled path's proof that a third key
 * no longer takes the first key's slot away.
 *
 * Nothing SEQUENCED can reach any of this. A played note has a length and no note-off,
 * so no render, no bounce and no baseline can see it — it exists only under a finger,
 * which is why it survived this long and why the whole suite is written as key presses.
 *
 * Measured per PITCH rather than as one level: "the sound stopped" and "the wrong note
 * survived" are different failures and a single RMS number cannot tell them apart. A
 * Goertzel on a Hann window at each of the three fundamentals is enough to name what is
 * sounding, and it is exact enough that a semitone's neighbour cannot be mistaken for it.
 */
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { renderTngr2, frameAt, TNGR2_DEFAULT_ENV } from '../src/engine/tngr2/dsp.js';
import { packTngr2Tables } from '../src/engine/tngr2/tables.js';
import { VoiceRack } from '../src/engine/voices.js';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));

const RATE = 44100;
const HZ = { C: 261.63, D: 293.66, E: 329.63 };
const KEYS = ['C', 'D', 'E'];

// What should still be sounding once one of the three keys is up. POLY keeps the other
// two; one instrument keeps the most recent key still down.
const expected = (mode, lift) => {
  const down = KEYS.filter((k) => k !== lift);
  return (mode === 'poly' ? down : [down[down.length - 1]]).join('');
};

// Energy at one frequency over one window, as source text a browser can be handed too.
const TONE = `
const tone = (d, f, a, b, rate) => {
  const i0 = Math.floor(a * rate), i1 = Math.floor(b * rate), N = i1 - i0;
  const w = 2 * Math.PI * Math.round(f * N / rate) / N;
  const coeff = 2 * Math.cos(w);
  let s1 = 0, s2 = 0;
  for (let i = 0; i < N; i++) {
    const win = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
    const s = d[i0 + i] * win + coeff * s1 - s2;
    s2 = s1; s1 = s;
  }
  return Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - coeff * s1 * s2)) / (N / 4);
};
`;
// eslint-disable-next-line no-new-func
const tone = new Function(`${TONE}return tone;`)();
const HEARD = 0.01;
const heard = (data, from, to, rate = RATE) =>
  KEYS.filter((k) => tone(data, HZ[k], from, to, rate) > HEARD).join('');

// ---- TNGR-2, browserless ----------------------------------------------------
//
// The rack posts the events and the reference renderer plays them, so what is measured
// is the note-offs the desk actually sends. The worklet runs this same core string — see
// tests/tngr2-dsp-parity.js — so proving it here proves it there.
{
  const tables = packTngr2Tables(['basic', 'sawForm', 'crystal']);
  const patchFor = (mode) => ({
    mode, glide: 0, amp: { ...TNGR2_DEFAULT_ENV, sustain: 0.8, release: 0.3 },
    filter: { cutoff: 8000 },
    oscA: { table: 'basic', position: 0.25, level: 1, unison: 1 },
  });

  for (const mode of ['legato', 'mono', 'poly']) {
    for (const lift of KEYS) {
      const posted = [];
      const rack = Object.create(VoiceRack.prototype);
      rack.ctx = { currentTime: 0, sampleRate: RATE };
      rack._heldNative = new Map();
      rack._activePreviews = new Map();
      const lane = {
        nextEventId: 0,
        ctx: { sampleRate: RATE },
        node: { port: { postMessage: (m) => posted.push(m) } },
      };
      // The two lines `_playTngr2Node` writes when a key goes down. Written out here
      // because the rest of that method wants a real worklet lane to talk to; the note-off
      // below, which is the half that was wrong, is the rack's own.
      const press = (name, at) => {
        rack.ctx.currentTime = at;
        const eventId = (lane.nextEventId += 1);
        const fingers = mode !== 'poly' ? rack._tngr2Fingers('lead') : null;
        posted.push({ type: 'noteOn', frame: frameAt(at, RATE), hz: HZ[name], velocity: 1, eventId });
        rack._heldNative.set(`lead|${HZ[name].toFixed(2)}`, { tngr2: { lane, eventId, at, lead: 0, fingers } });
        if (fingers) fingers.fingers.push({ key: `lead|${HZ[name].toFixed(2)}`, hz: HZ[name] });
      };
      press('C', 0.05); press('D', 0.20); press('E', 0.35);
      rack.ctx.currentTime = 0.5;
      rack.releasePreview('lead', HZ[lift]);
      const render = renderTngr2({
        tables, patch: patchFor(mode), sampleRate: RATE, seconds: 2,
        events: posted.filter((m) => m.frame < RATE * 2),
      });
      const data = render.channels[0];
      // The three keys are down and the pitch has followed them: a MONO or LEGATO lane
      // used to leave every note after the first playing the FIRST note's pitch whenever
      // GLIDE was at zero, because nothing copied the new increment onto the oscillators.
      assert(heard(data, 0.42, 0.49) === (mode === 'poly' ? 'CDE' : 'E'),
        `TNGR-2 ${mode}: three keys down sound ${mode === 'poly' ? 'as three notes' : 'as the last one pressed'}`);
      assert(heard(data, 0.62, 0.95) === expected(mode, lift),
        `TNGR-2 ${mode}: letting go of ${lift} leaves ${expected(mode, lift)} sounding`);
    }
  }
}

// ---- the pooled Tone classes and MRDR-3, in Chromium ------------------------
//
// Rendered rather than inspected, and offline rather than live: the note-off has to be
// called from inside the render — `OfflineAudioContext.suspend` is the only place its
// `currentTime` means anything — and what it proves is samples.
const ENTRY = `
import { VoiceRack } from ${JSON.stringify(join(ROOT, 'src/engine/voices.js'))};
import { VOICES } from ${JSON.stringify(join(ROOT, 'src/data/voices.js'))};
window.__VoiceRack = VoiceRack;
window.__VOICES = VOICES;
`;

const PRESETS = {
  // The class the fault was reported on, and the one whose modulator envelope makes a
  // re-strike unmistakable.
  FMSynth: {
    synth: 'FMSynth',
    options: {
      harmonicity: 3, modulationIndex: 4,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.8, release: 0.4 },
      modulation: { type: 'sine' },
      modulationEnvelope: { attack: 0.2, decay: 0.1, sustain: 0.8, release: 0.4 },
    },
  },
  // The native path, which is a graph per note rather than an instrument per slot.
  'MRDR-3': {
    synth: 'MRDR-3',
    layer: {
      osc1: {
        type: 'sawtooth', ratio: 1, detune: 0, gain: 0.6,
        attack: 0.01, decay: 0.2, sustain: 0.8, release: 0.4,
      },
    },
  },
};

async function browserHalf() {
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
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setContent(
    '<!doctype html><meta charset="utf-8">'
    + `<script>${bundleJs.replace(/<\/script>/gi, '<\\/script>')}<\/script>`,
    { waitUntil: 'load' },
  );

  const rows = await page.evaluate(async ({ presets, rate, hz, keys, toneSrc }) => {
    const VoiceRack = window.__VoiceRack;
    const VOICES = window.__VOICES;
    // eslint-disable-next-line no-new-func
    const tone = new Function(`${toneSrc}return tone;`)();
    const out = [];
    let seq = 0;
    for (const [name, preset] of Object.entries(presets)) {
      for (const mode of ['legato', 'mono', 'poly']) {
        for (const lift of keys) {
          const ctx = new OfflineAudioContext(1, rate * 2, rate);
          const rack = new VoiceRack(ctx);
          const id = `__held${seq++}`;
          VOICES[id] = JSON.parse(JSON.stringify(preset));
          VOICES[id].id = id;
          VOICES[id].mode = mode;
          VOICES[id].dur = 1;
          const dry = ctx.createGain();
          dry.gain.value = 1;
          dry.connect(ctx.destination);
          // Three keys, pressed in order and none of them let go — `hold` is the finger.
          for (const [k, at] of [['C', 0.05], ['D', 0.20], ['E', 0.35]]) {
            rack.play('lead', id, hz[k], {
              time: at, dur: 0.5, gain: 0.5, dry, wet: null, echo: false,
              preview: true, hold: true,
            });
          }
          // Booked before the render starts; it resolves when the render REACHES 0.5s,
          // which is the only place a note-off can be called with a sane currentTime.
          const reached = ctx.suspend(0.5);
          const rendering = ctx.startRendering();
          await reached;
          rack.releasePreview('lead', hz[lift]);
          ctx.resume();
          const data = (await rendering).getChannelData(0);
          const heard = (a, b) => keys.filter((k) => tone(data, hz[k], a, b, rate) > 0.01).join('');
          out.push({ name, mode, lift, before: heard(0.42, 0.49), after: heard(0.62, 0.95) });
        }
      }
    }
    return out;
  }, { presets: PRESETS, rate: RATE, hz: HZ, keys: KEYS, toneSrc: TONE });

  await browser.close();
  for (const e of errors) fail(`page error: ${e}`);
  for (const { name, mode, lift, before, after } of rows) {
    assert(before === (mode === 'poly' ? 'CDE' : 'E'),
      `${name} ${mode}: three keys down sound ${mode === 'poly' ? 'as three notes' : 'as the last one pressed'}`);
    assert(after === expected(mode, lift),
      `${name} ${mode}: letting go of ${lift} leaves ${expected(mode, lift)} sounding`);
  }
}

await browserHalf();
console.log(failed ? `HELD KEYS: ${failed} FAILED` : 'HELD KEYS: PASSED');
process.exit(failed ? 1 : 0);
