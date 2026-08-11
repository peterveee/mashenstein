// Editing a preset over a playing song: what the rack does with the change, and what
// it does to the note you are listening to while it does it.
//
// The desk's preset editor calls `Audio.refreshVoice` on every touch of every control,
// and the rack used to answer all of them the same way — dispose the pool. To the rack
// that is a cache being dropped. To the ear it is the note that was sounding, stopped
// dead, plus every note already booked in the quarter-second lookahead going missing. Turning
// one knob cost you the bar you were listening to, which is the bar the question was
// about.
//
// So `refresh` now has three answers, and this suite is the line between them:
//
//   nothing    the edit is read per note anyway — LENGTH, TRANSPOSE, FINE,
//              TAPS, FALLOFF, VOICING. Most of the panel, and none of it reaches Tone.
//   set        push it onto the standing synths — envelopes, filters, waveforms,
//              ratios. Same instances before and after: nothing was rebuilt, so there
//              was nothing to cut off.
//   retire     a different synth class, or a vibrato appearing in front of one. Out of
//              the pool map at once so the next note is new; disposed later, so the
//              note that IS playing finishes.
//
// Run in Chromium against a real AudioContext rather than under Node, for the same
// reason tests/voices.js is: Tone is the thing being asserted about, and a stub of
// `synth.set` would prove only that the stub works.
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const ENTRY = `
import { VoiceRack } from ${JSON.stringify(join(ROOT, 'src/engine/voices.js'))};
import { VOICES } from ${JSON.stringify(join(ROOT, 'src/data/voices.js'))};
window.__VoiceRack = VoiceRack;
window.__VOICES = VOICES;
`;

const results = [];
const assert = (cond, msg) => results.push({ ok: !!cond, msg });

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
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setContent(
    `<!doctype html><meta charset="utf-8">`
    + `<script>${bundleJs.replace(/<\/script>/gi, '<\\/script>')}<\/script>`,
    { waitUntil: 'load' },
  );

  const out = await page.evaluate(() => {
    const VoiceRack = window.__VoiceRack;
    const VOICES = window.__VOICES;
    const said = [];
    const say = (ok, msg) => said.push({ ok, msg });

    // A rack on a real context with real strip nodes, which is the shape `_pool` keys
    // on. Suspended is fine and is what a page with no gesture gives you: nodes build,
    // Tone sets values, and nothing here listens to the output.
    const ctx = new AudioContext();
    const strip = () => ctx.createGain();

    // One editable copy per case, so a case cannot inherit the last one's edits. The
    // desk edits VOICES[id] in place — that object IS what the rack reads — so a test
    // preset has to live there too.
    let seq = 0;
    const install = (base) => {
      const id = `__test${seq++}`;
      VOICES[id] = JSON.parse(JSON.stringify(base));
      VOICES[id].id = id;
      return id;
    };

    // Where a live param is HEADED, once its 20 ms glide has run. `p.value` is where it
    // is right now, which during a ramp is still most of the way back at the old value —
    // so anything asking "did the edit land" has to ask about the destination.
    const settled = (p) => p.getValueAtTime(ctx.currentTime + 0.1);

    const dry = strip(), wet = strip();
    const rack = new VoiceRack(ctx);
    const poolOf = (laneKey, id) => rack.pools.get(`${laneKey}|${id}|1`);
    // A note far enough ahead that it is still to come — the lookahead case, which is
    // the one that used to lose notes outright.
    const hit = (laneKey, id) => rack.play(laneKey, id, 220, {
      time: ctx.currentTime + 0.05, dur: 0.4, gain: 0.5, dry, wet, echo: true,
    });

    // ---- 1. an edit that is read per note reaches Tone not at all ----------------
    {
      const id = install(VOICES.acidSquelch);
      hit('bass', id);
      const before = poolOf('bass', id);
      const synth = before.slots[0].synth;
      // Every control on the panel that is NOT built into a synth.
      VOICES[id].dur = 3.5;
      VOICES[id].transpose = -12;
      VOICES[id].fine = 7;
      VOICES[id].taps = [0, 0.02];
      VOICES[id].tapFalloff = 0.6;
      VOICES[id].mono = true;
      rack.refresh(id);
      const after = poolOf('bass', id);
      say(after === before, 'length/tuning/taps/voicing: the pool is untouched');
      say(after && after.slots[0].synth === synth && !synth.disposed,
        'length/tuning/taps/voicing: the synth is the same one, still alive');
    }

    // ---- 2. envelopes, filters, waveforms: set on the standing synth -------------
    {
      const id = install(VOICES.acidSquelch);
      hit('bass', id);
      const pool = poolOf('bass', id);
      const synth = pool.slots[0].synth;
      VOICES[id].options.envelope.release = 1.75;
      VOICES[id].options.filter.Q = 14;
      VOICES[id].options.oscillator.type = 'square';
      VOICES[id].options.filterEnvelope.baseFrequency = 900;
      const t0 = ctx.currentTime;
      rack.refresh(id);
      say(poolOf('bass', id) === pool && pool.slots[0].synth === synth && !synth.disposed,
        'envelope/filter/waveform: nothing was rebuilt, so nothing was cut off');
      say(Math.abs(synth.envelope.release - 1.75) < 1e-6, '...and the release actually moved');
      say(Math.abs(settled(synth.filter.Q) - 14) < 1e-3, '...and the resonance actually moved');
      // A live param GLIDES to its new value rather than stepping to it — see
      // SMOOTH_PARAMS. Sixty steps a second on a sounding filter is zipper noise, and
      // this is the assertion that says the drag arrives as a slide instead: at the
      // instant of the edit the filter is still where it was, and it is only 20 ms
      // later that it has arrived. (`.value` cannot answer this — Tone's getter reads
      // a lookahead ahead of the context, which is already past the end of the ramp.)
      say(Math.abs(synth.filter.Q.getValueAtTime(t0) - 14) > 1e-3,
        '...and it got there by ramping, not by jumping');
      say(synth.oscillator.type === 'square', '...and the waveform actually moved');
      say(Math.abs(synth.filterEnvelope.baseFrequency - 900) < 1e-3,
        '...and the filter envelope actually moved');
      // The pool's record of itself has to move with the synths, or the next edit
      // diffs against what it used to be and finds a change that is already applied.
      say(pool.spec.opts.filter.Q === 14, '...and the pool now says what its synths hold');
      rack.refresh(id);
      say(poolOf('bass', id) === pool, 'a second refresh with nothing changed does nothing');
    }

    // ---- 3. glide back to zero is said out loud ---------------------------------
    {
      const id = install(VOICES.acidSquelch);
      VOICES[id].mono = true;
      VOICES[id].portamento = 0.2;
      hit('bass', id);
      const synth = poolOf('bass', id).slots[0].synth;
      say(Math.abs(synth.portamento - 0.2) < 1e-6, 'glide is built onto the synth');
      VOICES[id].portamento = 0;
      rack.refresh(id);
      say(synth.portamento === 0, 'glide dragged back to zero clears rather than sticking');
    }

    // ---- 4. every class in the allowlist takes a live edit -----------------------
    {
      const bad = [];
      for (const base of Object.values(VOICES)) {
        if (base.kind !== 'tone' || !base.options || String(base.id).startsWith('__test')) continue;
        const id = install(base);
        hit('lead', id);
        const pool = poolOf('lead', id);
        if (!pool) continue;                       // a class the rack does not build
        const synth = pool.slots[0].synth;
        // Nudge whatever the preset actually has, so the edit is one this preset
        // could really receive from the panel.
        const env = VOICES[id].options.envelope || VOICES[id].options.voice0?.envelope;
        if (!env) continue;
        env.release = (env.release ?? 0.3) + 0.11;
        rack.refresh(id);
        if (poolOf('lead', id) !== pool || pool.slots[0].synth !== synth || synth.disposed) {
          bad.push(`${base.id} (${base.synth})`);
        }
      }
      say(bad.length === 0,
        `every catalogue preset takes an envelope edit without a rebuild${bad.length ? `: ${bad.join(', ')}` : ''}`);
    }

    // ---- 5. a change of class rebuilds — but lets the old note finish ------------
    {
      const id = install(VOICES.acidSquelch);
      hit('bass', id);
      const pool = poolOf('bass', id);
      const synth = pool.slots[0].synth;
      VOICES[id].synth = 'FMSynth';
      rack.refresh(id);
      say(poolOf('bass', id) === undefined, 'a change of class takes the pool out of service');
      say(!synth.disposed, '...but does NOT dispose it: the note that is playing plays out');
      say(rack._retired.size === 1, '...and it is held for disposal rather than leaked');
      hit('bass', id);
      const rebuilt = poolOf('bass', id);
      say(rebuilt && rebuilt !== pool && rebuilt.spec.synth === 'FMSynth',
        '...and the next note is built on the new class');
    }

    // ---- 6. a vibrato appearing is a rewire, and retires the same way ------------
    {
      const id = install(VOICES.acidSquelch);
      hit('bass', id);
      const pool = poolOf('bass', id);
      const synth = pool.slots[0].synth;
      say(pool.slots[0].vib === null, 'no vibrato node until a preset asks for one');
      VOICES[id].vibrato = { depth: 0.4, rate: 5 };
      rack.refresh(id);
      say(poolOf('bass', id) === undefined && !synth.disposed,
        'a vibrato appearing retires the pool rather than cutting it');
      hit('bass', id);
      const rebuilt = poolOf('bass', id);
      say(rebuilt && rebuilt.slots[0].vib, '...and the next note has the vibrato node');
      // Depth and rate are signals on a node that already exists: settable, no rebuild.
      const vibbed = rebuilt.slots[0].synth;
      VOICES[id].vibrato.depth = 0.8;
      VOICES[id].vibrato.rate = 3;
      rack.refresh(id);
      say(poolOf('bass', id) === rebuilt && rebuilt.slots[0].synth === vibbed,
        'moving an existing vibrato does not rebuild');
      say(Math.abs(settled(rebuilt.slots[0].vib.depth) - 0.8) < 1e-3
        && Math.abs(settled(rebuilt.slots[0].vib.frequency) - 3) < 1e-3,
        '...and the wobble actually moved');
    }

    // ---- 7. changing which voice a lane plays retires it too ---------------------
    {
      const a = install(VOICES.acidSquelch);
      // Any second Tone preset will do — the case is about the LANE changing hands.
      // (`subSine` was named here once; no preset by that id exists in the library.)
      const b = install(VOICES.roundMono);
      hit('bass', a);
      const pool = poolOf('bass', a);
      const synth = pool.slots[0].synth;
      rack.prune((laneKey) => (laneKey === 'bass' ? b : null));
      say(poolOf('bass', a) === undefined, 'prune takes the old lane pool out of service');
      say(!synth.disposed && [...rack._retired.values()].includes(pool),
        '...without cutting the note the lane is still ringing');
    }

    // ---- 8. a note may never be booked behind one already scheduled ---------------
    //
    // Tone keeps a state timeline per oscillator and refuses a state added before one
    // already on it — it throws, inside the sequencer, and takes the page with it. Two
    // ways that happens here, and both are ordinary desk use:
    //
    //   · a note DRAWN LONG over a part playing sixteenths — the ringing note holds a
    //     slot and the pool has to find another one;
    //   · a KEY PRESSED WHILE THE SONG PLAYS — the sequencer has scheduled a quarter-second into
    //     the future and a preview lands at now + 20ms, which is behind it.
    {
      const id = install(VOICES.acidSquelch);
      const t0 = ctx.currentTime + 0.5;
      const long = (t, dur) => rack.play('bass', id, 220, {
        time: t, dur, gain: 0.4, dry, wet, echo: true,
      });
      // Eight sixteenths at 120bpm, every one of them two beats long: by the third the
      // first is still ringing, and every slot the pool started with is booked.
      let threw = null;
      try {
        for (let i = 0; i < 8; i++) long(t0 + i * 0.125, 1);
      } catch (e) { threw = e.message; }
      const pool = poolOf('bass', id);
      say(!threw, `eight overlapping long notes schedule without throwing${threw ? ` — ${threw}` : ''}`);
      say(pool.slots.length === 2,
        `and the pool does NOT grow to hold them (${pool.slots.length} voices): polyphony`
        + ' is the preset\'s, and a note that outlasts its slot is cut off — which is what'
        + ' the roll draws and what the engine has always done');
      // Backwards on the same instance is the case Tone refuses outright. One note goes
      // missing; the exception it replaces stopped the page mid-bar.
      let backwardsThrew = null;
      try { long(t0 - 0.4, 1); } catch (e) { backwardsThrew = e.message; }
      say(!backwardsThrew,
        `a note booked behind everything on its instance is dropped, not thrown${backwardsThrew ? ` — ${backwardsThrew}` : ''}`);

      // Now the preview case: the same lane, a note in the PAST relative to what is
      // already scheduled. It must not throw, and it must not land on the song's synths.
      let previewThrew = null;
      try {
        rack.play('bass', id, 330, {
          time: t0 - 0.4, dur: 0.2, gain: 0.4, dry, wet, echo: true, preview: true,
        });
      } catch (e) { previewThrew = e.message; }
      say(!previewThrew,
        `a preview behind the song's schedule does not throw${previewThrew ? ` — ${previewThrew}` : ''}`);
      const previewPool = rack.pools.get(`bass|${id}|1|preview`);
      say(previewPool && previewPool !== pool,
        'because it plays on its own instances — the song\'s timeline is never written'
        + ' to out of order');
    }

    // ---- 8b. the game synth's tone filter is absent until asked for --------------
    //
    // The whole promise of an OPTIONAL section is that leaving it off costs nothing —
    // no node, no change to a preset that shipped before it existed. That is invisible
    // from the outside, so it is counted here: the rack is asked to build a note with
    // the filter absent, present, and steeper, and the biquads it creates are tallied.
    {
      const made = [];
      const realBiquad = ctx.createBiquadFilter.bind(ctx);
      ctx.createBiquadFilter = () => { const f = realBiquad(); made.push(f); return f; };
      const count = (id) => { made.length = 0; hit('lead', id); return made.length; };

      const plain = install(VOICES.toneSquare);
      VOICES[plain].vibrato = null;
      say(count(plain) === 0, 'a game-synth note with no filter builds no filter node');

      VOICES[plain].filter = { type: 'lowpass', freq: 900, Q: 0.7 };
      say(count(plain) === 1, 'switching the filter on builds exactly one');
      VOICES[plain].filter.Q = 12;
      VOICES[plain].filter.slope = -24;
      say(count(plain) === 2, 'a steeper slope is stages of the same filter, not a new kind');
      // Shape and resonance are set outright and readable now; the FREQUENCY is
      // scheduled for the note's own start time, so `.value` still reads the node's
      // default here and asserting on it would be asserting on Web Audio's clock.
      // Resonance lands on the first stage only — the ones behind it are there for the
      // slope and would multiply the peak if they resonated too.
      say(made.every((f) => f.type === 'lowpass'), '...and every stage is the shape asked for');
      say(Math.abs(made[0].Q.value - 12) < 1e-3 && Math.abs(made[1].Q.value - 0.7071) < 1e-3,
        '...with the resonance on the first stage and the rest flat');

      // Noise carries its own pitch bandpass, so the tone filter is a SECOND node — the
      // two must not be the same one, or filtering the tone would detune the note. This
      // path needs the seeded buffer to play at all, hence a rack of its own.
      const nrack = new VoiceRack(ctx, ctx.createBuffer(1, 4410, ctx.sampleRate));
      const noisy = install(VOICES.toneSquare);
      VOICES[noisy].waveform = 'noise';
      VOICES[noisy].vibrato = null;
      const nhit = () => {
        made.length = 0;
        nrack.play('lead', noisy, 220, {
          time: ctx.currentTime + 0.05, dur: 0.4, gain: 0.5, dry, wet, echo: true,
        });
        return made.length;
      };
      const bare = nhit();
      say(bare === 1, 'a noise note builds the one bandpass that gives it its pitch');
      VOICES[noisy].filter = { type: 'highpass', freq: 3000, Q: 0.7 };
      say(nhit() === bare + 1, '...and the tone filter arrives beside it, not instead of it');
      nrack.dispose();
    }

    // ---- 9. nothing survives the rack ------------------------------------------
    {
      const before = rack._retired.size;
      say(before > 0, 'there are retired pools still waiting to be disposed');
      const held = [...rack._retired.values()].flatMap((p) => p.slots.map((s) => s.synth));
      const live = [...rack.pools.values()].flatMap((p) => p.slots.map((s) => s.synth));
      rack.dispose();
      say(rack.pools.size === 0 && rack._retired.size === 0, 'dispose clears both books');
      say([...held, ...live].every((s) => s.disposed),
        '...and every synth goes with it, retired or not — nothing is left on the graph');
    }

    ctx.close();
    return said;
  });

  for (const r of out) assert(r.ok, r.msg);
  await browser.close();

  if (errors.length) assert(false, `page errors: ${errors.join('; ')}`);

  let failed = 0;
  for (const r of results) {
    if (r.ok) console.log(`ok: ${r.msg}`);
    else { console.error(`FAIL: ${r.msg}`); failed++; }
  }
  console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(`FAIL: ${e.message}`); process.exit(1); });
