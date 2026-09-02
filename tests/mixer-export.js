// The desk's two exports — Bounce and Export MIDI — and the one property that
// makes them possible in the deployed build: every byte on the way out is written by
// code that runs in a BROWSER.
//
// That property is invisible at the call site and easy to lose. `Buffer` is in scope
// in Node and nowhere else, so a `Buffer.concat` added to the WAV or MIDI writer keeps
// every command-line tool and every test passing while silently breaking the one build
// that has no Node behind it — the deployed desk at /TRK24/, where the failure is
// a tester pressing Export MIDI and getting nothing. Same for the render walk: the
// moment there are two copies of it, one of them is the stale one.
//
// So this suite pins the seams rather than the sound. What the exports SOUND like is
// tests/null-test.js's job, and what they contain is tests/note-duration.js's.
import { readFileSync } from 'node:fs';
import { wavBuffer } from '../tools/lib/wav.js';
import { midiBuffer, MIDI_UNSUPPORTED_LANES } from '../tools/lib/render-midi-bank.js';
import { resolveTrack } from '../tools/lib/tracks.js';
import { barPlan, songBars, sequenceValue, LANE_KEYS } from '../src/engine/lanes.js';
import { baseLane, isLayer } from '../src/data/voices.js';
import {
  applyArrangement, loopOf, loopSteps, resolutionOf, ARRANGEMENTS,
} from '../src/data/arrangements.js';
import {
  draftOf, entryOf, silenceBars, setLanesOff, duplicateBars, deleteBars, insertSilence,
} from '../tools/lib/arrangement-edit.js';

let failed = 0;
const assert = (cond, msg) => {
  console.log(`${cond ? 'ok' : 'FAIL'}: ${msg}`);
  if (!cond) failed++;
};
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

// ---- browser-safe by construction -------------------------------------------
// Comments may say the word; code may not use the global.
const usesBuffer = (text) => text
  .split('\n')
  .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
  .some((l) => /\bBuffer\s*\.\s*(from|alloc|concat|isBuffer)\b/.test(l));

for (const path of [
  'tools/lib/wav.js',
  'tools/lib/render-midi-bank.js',
  'tools/lib/loudness.js',
  'tools/lib/render-bank-page.js',
  'tools/mixer-bounce.js',
  'tools/mixer-render-entry.js',
]) {
  assert(!usesBuffer(src(path)), `${path} uses no Node Buffer — it is bundled into the browser`);
}

// Nothing on the desk's side of the render may reach for Node's filesystem either.
for (const path of ['tools/mixer-bounce.js', 'tools/lib/render-bank-page.js', 'tools/mixer-render-entry.js']) {
  assert(!/from '(node:)?(fs|path|os|child_process)'/.test(src(path)),
    `${path} imports no Node built-ins`);
}

// ---- one render walk, not two ------------------------------------------------
const page = src('tools/lib/render-bank-page.js');
assert(/OfflineAudioContext/.test(page) && /Audio\.scheduleStep\(\)/.test(page),
  'the render walk lives in lib/render-bank-page.js');
assert(/render-bank-page\.js/.test(src('tools/lib/render-bank-browser.js')),
  'the Chromium renderer imports that walk rather than restating it');
assert(/render-bank-page\.js/.test(src('tools/mixer-render-entry.js')),
  'the desk render frame imports the same walk');
assert(!/new OfflineAudioContext/.test(src('tools/lib/render-bank-browser.js')),
  'and the Chromium renderer no longer carries a copy of it');
assert(/scheduledCalls: r\.scheduledCalls/.test(src('tools/lib/render-bank-browser.js'))
  && /expectedScheduleCalls: r\.expectedScheduleCalls/.test(src('tools/lib/render-bank-browser.js')),
  'the browser renderer preserves render-walk completeness metadata');

// ---- and it does not stall the desk that opened it ----------------------------
// The frame is same-origin, so it is a document boundary and not a thread one: the
// walk runs on the desk's own main thread, the one the live sequencer is scheduled
// from. Pressing Bounce stops playback, but nothing stops you pressing Play again
// while it renders — `rendering` only guards a second bounce — and on a busy import
// (the SMW banks reach 20 lanes) an unsliced walk holds that thread for seconds while
// the sequencer has a quarter-second of lookahead in front of it.
assert(/await yieldToEventLoop\(\)/.test(page)
  && /const scheduleCalls = steps \* \(Audio\.transportResolution \/ 16\)/.test(page)
  && /while \(stepAt < scheduleCalls && Audio\.nextTime < limit\) \{[\s\S]{0,400}?Audio\.scheduleStep\(\)/.test(page)
  && !/for \(let i = 0; i < steps; i\+\+\) Audio\.scheduleStep\(\);/.test(page),
  'the render walk yields the main thread instead of queueing every step in one block');
// THE TRANSPORT, not the bank — and pinned here as source text because the sliced walk
// above is pinned the same way and the two are the same line. The count of scheduleStep
// CALLS is a question only `transportResolution` answers: a 16-step bank with a 1/32
// arpeggiator anywhere runs a 32-step transport, and asking the bank gave that song half
// the calls it needed and a render that stopped at the halfway bar. What it SOUNDS like
// is tests/render-length.js; this is the line that has to stay written that way.
assert(!/scheduleCalls = steps \* \(Audio\.bank/.test(page),
  'and it sizes that walk off the transport, which the bank is only one of three ways to promote');
assert(/performance\.now\(\) - sliceAt < SLICE_MS/.test(page),
  'it slices by time, so a step costing more on a busy song yields sooner rather than later');
// The walk is just-in-time against the render head: the graph stands a fixed horizon
// ahead of the suspended context instead of the whole song standing from sample zero,
// which is what keeps a dense import's bounce in seconds instead of minutes. The
// no-suspend fallback (Firefox) still builds everything up front — slower, never wrong.
assert(/ctx\.suspend\(frame \/ sampleRate\)/.test(page)
  && /await buildUntil\(frame \/ sampleRate \+ HORIZON_S\)/.test(page)
  // `resume` in a finally, and its own failure caught: an un-resumed render never
  // settles at all, so the bounce would hang rather than fail.
  && /\} finally \{[\s\S]{0,600}?ctx\.resume\(\)/.test(page),
  'the walk schedules just-in-time under suspend/resume, a horizon ahead of the render head');
assert(/if \(!canSuspend\) \{\s*\n\s*await buildUntil\(Infinity\);/.test(page),
  'and a browser without OfflineAudioContext.suspend still gets the whole walk up front');
// THE CHECK THAT MAKES JIT SAFE TO SHIP. Every way the walk can go wrong ends in
// steps that were never scheduled, and the render is then SILENT from that second on
// while reporting nothing — silence being a legitimate thing to render, no other
// check can tell a broken bounce from a quiet song. Sabotage harness:
// work/local/verify-jit-failure.js (suspend that rejects, rejects midway, or never
// settles — all three refused; one that resolves at once is correctly kept).
assert(/if \(stepAt < scheduleCalls\) \{/.test(page) && /render walk incomplete/.test(page),
  'a walk that did not schedule every transport call refuses to return a file');
assert(/suspendRejected/.test(page) && !/\.catch\(\(\) => \{\}\);/.test(page),
  'and no suspension rejection is swallowed — each one is recorded for that refusal to name');
assert(/upfront = false,/.test(page) && /const canSuspend = !upfront &&/.test(page),
  'the walk takes an `upfront` option, so a retry can ask for the walk that cannot half-happen');
// Both callers act on that refusal, in a fresh frame/page: a partial schedule cannot
// be finished, only replaced.
const bounce = src('tools/mixer-bounce.js');
assert(/render walk incomplete/.test(bounce) && /\{ \.\.\.args, upfront: true \}/.test(bounce),
  'the desk bounce retries once with the whole walk up front');
const cli = src('tools/lib/render-bank-browser.js');
assert(/render walk incomplete/.test(cli) && /upfront = true;/.test(cli) && /page = await openPage\(\)/.test(cli),
  'and so does the command-line renderer, on a fresh page');
// Code lines only, the same way `usesBuffer` reads them: the comment above the helper
// names the timer it is avoiding, and a test that cannot tell the two apart would be
// failed by its own explanation.
const pageCode = page.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
assert(/new MessageChannel\(\)/.test(pageCode) && !/setTimeout\s*\(/.test(pageCode),
  'and yields by message rather than a nested timer the browser would clamp to 4ms');

// ---- the desk exports without a server ---------------------------------------
const entry = src('tools/mixer-entry.js');
assert(/import \{ bounceWav \} from '\.\/mixer-bounce\.js'/.test(entry)
  && /await bounceWav\(bank, \{/.test(entry),
  'Bounce renders in this browser');
assert(/import \{ midiBuffer \} from '\.\/lib\/render-midi-bank\.js'/.test(entry)
  && /midiBuffer\(bank, \{/.test(entry),
  'Export MIDI builds the file in this browser');
assert(!/fetch\(`?\/midi/.test(entry) && !/renderJob\(\$\('renderwav'\)/.test(entry),
  'neither one asks a server for the bytes any more');
// From `viewBank()`, which is the song AS PLAYED. The composition bank is a two-bar
// loop of the lanes the file's literal holds, so a song that builds its form in layer
// sections used to export one block of a fraction of its parts.
assert(/\$\('midi'\)\.onclick[\s\S]{0,900}?const bank = viewBank\(\);/.test(entry),
  'and Export MIDI walks the arranged bank, not the composition bank');
// STATIC_BUILD, not STATIC: `?static=1` makes a local desk WEAR the deployed desk's
// shape, and a tab doing that still has a server behind it. Addressing the frame off
// the shape would send it after a sibling file the local server does not serve, and
// Render WAV would 404 in the one mode somebody is using to check the shipped desk.
assert(/const RENDER_FRAME_URL = STATIC_BUILD \? 'render-frame\.html' : '\/render-frame'/.test(entry),
  'the render frame is addressed per BUILD, not per shape — a file when deployed, a route in development');

// A bounce is a snapshot of the desk at the click, not a reference to it. `mixFor` and
// `arrFor` hand back the live objects the faders write into, and the frame does not
// copy them until it has loaded — measured at ~75ms — so without this a fader still
// moving when you press OK lands in the file.
assert(/const bank = structuredClone\(source\)/.test(entry)
  && /const mix = structuredClone\(mixFor\(id\)\)/.test(entry)
  && /const arrangement = structuredClone\(arrFor\(id\) \?\? null\)/.test(entry),
  'the render copies the song, the mix and the arrangement before it starts');
assert(/mix, arrangement,/.test(entry) && !/mix: mixFor\(id\), arrangement: arrFor\(id\)/.test(entry),
  'and renders those copies rather than reaching for the live objects again');

// Playing while rendering makes the two audio contexts fight for one thread: measured
// on THE FOOD COURT, 37s stopped against 65s playing, for the same bytes.
assert(/const wasPlaying = playing;\n\s*if \(wasPlaying\) setPlaying\(false\);/.test(entry),
  'the transport stops for the render, which is worth about 40% of the wait');

// ---- and it is called Bounce, everywhere -------------------------------------
//
// "Bounce" is what the rest of the world calls printing a mix to a file, so it is what
// the desk calls it. The value of a standard word is entirely in being used
// consistently, so this checks the label, the tooltip, the section heading, the dialog
// and every state the button passes through — the places a rename usually half-lands.
const shell = src('tools/mixer-shell.html');
assert(/id="renderwav" title="Bounce this song[^"]*">Bounce</.test(shell),
  'the button says Bounce, and so does its tooltip');
assert(/<span>Bounce \/ Files<\/span>/.test(shell), 'the section it sits in says Bounce too');
assert(/askRenderPasses\('Bounce'\)/.test(entry)
  && /btn\.textContent = 'Bouncing…'/.test(entry)
  && /toast\(`Bouncing \$\{title\}/.test(entry)
  && /Bounce failed/.test(entry)
  && /A bounce is already running/.test(entry),
  'the dialog, the running button, the progress line and both failures agree');
assert(!/'Render WAV'|Rendering \$\{|A render is already running|`Render failed/.test(entry),
  'and nothing user-facing still says Render');

// The number never stands on its own. The button lives in a drawer section that can be
// scrolled half out of view, and a lone "30%" there is a percentage of nothing in
// particular — it has to keep saying what is counting.
assert(/btn\.textContent = pct == null \? 'Bouncing…' : `Bouncing… \$\{pct\}%`/.test(entry),
  'the progress percentage stays attached to the word Bouncing');

// The static desk keeps the exports and drops only what genuinely cannot work.
assert(!/\[data-drawer-section="files"\]'\)\?\.setAttribute\('hidden'/.test(entry),
  'the deployed desk keeps its Bounce / Files section');
assert(/\$\('auditionwav'\)\?\.setAttribute\('hidden', ''\)/.test(entry)
  && /\$\('importmidi'\)\?\.setAttribute\('hidden', ''\)/.test(entry),
  'and hides only Audition (a plugin host) and Import MIDI (a disk)');

// Both documents ship, or the button points at a 404.
const builder = src('tools/build-mixer-static.js');
assert(/'index\.html'/.test(builder) && /'render-frame\.html'/.test(builder),
  'the static build emits the desk AND its render frame');
assert(/mixer-render-shell\.html/.test(src('tools/mixer.js'))
  && /'\/render-frame'/.test(src('tools/mixer.js')),
  'and the dev server serves the same pair');

// The bounce lands where renders have always landed when there is a disk to land on.
assert(/\/write-render/.test(entry) && /req\.url\.startsWith\('\/write-render'\)/.test(src('tools/mixer.js')),
  'a dev bounce is written to dist/ by the server, not dropped in Downloads');

// ---- the bounce is as long as the song the desk is playing --------------------
//
// `bounceWav` sizes the render itself, on this side of the frame, because everything
// needing a track identity has to be resolved before the bank is structured-cloned.
// The bank it is handed is the COMPOSITION — the desk snapshots resolveTrack(id).bank
// — and the bar edits live in the arrangement beside it, so the count has to come off
// the arranged form or the two disagree. The sequencer walks `plan[bar % plan.length]`,
// which means the disagreement is not a truncated file in one direction and a long one
// in the other: a song shortened on the desk gets its own opening bars printed onto the
// end of the WAV.
//
// Muting bars is deliberately in the list and deliberately unchanged: a silenced bar
// keeps its place in time, so the mute mask is the one bar edit that must NOT move the
// length. It is what the render frame's scheduleStep nulls out lane by lane; the length
// is a separate question and this is where they meet.
const bounceSource = src('tools/mixer-bounce.js');
assert(/const bars = barPlan\(applyArrangement\(bank, trackId, table\)\)\.length/.test(bounceSource)
  && !/songBlocks\(bank, repeat\)/.test(bounceSource),
  'the bounce counts bars off the arranged form, not off the composed order');
assert(/const ranged = rangeStart != null && rangeEnd > rangeStart/.test(bounceSource)
  && /const steps = ranged \? rangeEnd - rangeStart : loop/.test(bounceSource)
  && /ranged \? \{ startStep: rangeStart \}/.test(bounceSource)
  && /Number\.isFinite\(startStep\)[\s\S]*?Audio\.step = Math\.max\(0, startStep\)/.test(page),
  'a sparse freeze starts the shared render walk at its original song step instead of walking leading silence');

{
  // bounceWav's own arithmetic, restated against the same helpers it uses. A copy on
  // purpose: the function itself only runs in a browser (it opens an iframe), and the
  // property worth pinning is the number, not the postMessage around it.
  const bounceSteps = (bank, id, arrangement, repeat = 1) => {
    const table = { [id]: arrangement };
    const bars = barPlan(applyArrangement(bank, id, table)).length;
    const loop = loopSteps(loopOf(bank, id, table), bars);
    return loop
      ? (loop.loop
        ? loop.loop.start - loop.start + repeat * (loop.loop.end - loop.loop.start)
        : bars * 16 - loop.start)
      : bars * repeat * 16;
  };
  const played = (bank, id, arrangement) =>
    barPlan(applyArrangement(bank, id, { [id]: arrangement })).length * 16;

  const id = 'hub';
  const bank = resolveTrack(id).bank;
  const edits = [
    ['as composed', (d) => d],
    ['with bars 3-4 muted', (d) => silenceBars(d, 3, 4)],
    ['with one lane muted in bars 3-4', (d) => setLanesOff(d, 3, 4, ['snare'], true)],
    ['with bars 1-2 duplicated', (d) => duplicateBars(d, 1, 2)],
    ['with bars 3-4 deleted', (d) => deleteBars(d, 3, 4)],
    ['with four silent bars inserted at 5', (d) => insertSilence(d, 5, 4)],
  ];
  for (const [what, edit] of edits) {
    const draft = edit(draftOf(bank, null));
    const arrangement = entryOf(bank, draft);
    for (const repeat of [1, 2]) {
      assert(bounceSteps(bank, id, arrangement, repeat) === played(bank, id, arrangement) * repeat,
        `a bounce of a song ${what} walks every bar of it and no more (×${repeat})`);
    }
  }

  // And the mute mask itself still reaches the walk: `off` is what the frame's
  // scheduleStep nulls, lane by lane, on the bar it names.
  // Bar indices, as every operation in arrangement-edit takes them — counted from 0.
  const muted = entryOf(bank, silenceBars(draftOf(bank, null), 3, 4));
  const plan = barPlan(applyArrangement(bank, id, { [id]: muted }));
  assert(plan[3]?.off?.includes('snare') && plan[4]?.off?.includes('snare')
    && !plan[2]?.off && !plan[5]?.off,
    'a muted bar carries its mute mask into the plan the render walks, and its neighbours do not');
  assert(/if \(bar\.off \|\| bar\.delete\) \{[\s\S]{0,300}?b\[k\] = null;/.test(src('src/engine/audio.js')),
    'and the sequencer nulls those lanes for the bar, so the bounce prints silence there');
}

// ---- a muted strip costs nothing to bounce ------------------------------------
//
// The desk skips building notes for lanes the mix has silenced, and its render frame
// does the same, so a bounce costs what the desk costs — measured on THE FOOD COURT with
// 7 of 13 lanes muted, 13% of the wall clock. The samples are unchanged: a mute zeroes
// `pres` and every send taps downstream of it, so the skipped notes reached no output.
// Verified against tests/null-test.js's own tolerance in work/local — the difference
// from an unskipped render is the same 1e-7 the engine shows against ITSELF between two
// runs, which is float summation order and not the skip.
//
// In the FRAME, not in the shared walk: lib/render-bank-page.js is also the command-line
// renderer's, and that one renders game variants and transitions — where a treatment may
// ramp a muted lane back up at an audio time and a skipped note cannot be un-skipped.
const frame = src('tools/mixer-render-entry.js');
assert(/Audio\.setSilentLaneSkip\(true\)/.test(frame),
  'the desk render frame skips lanes the mix has silenced, as the desk itself does');
assert(!/setSilentLaneSkip/.test(page) && !/setSilentLaneSkip/.test(src('tools/lib/render-bank-browser.js')),
  'and neither the shared walk nor the command-line renderer turns it on');

// ---- the bytes are real files ------------------------------------------------
const L = new Float32Array(1000), R = new Float32Array(1000);
for (let i = 0; i < L.length; i++) { L[i] = Math.sin(i / 5) * 0.5; R[i] = -L[i]; }
const wav = wavBuffer([L, R], 1);
const wv = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
const tag = (at) => String.fromCharCode(...wav.subarray(at, at + 4));
assert(wav instanceof Uint8Array, 'wavBuffer returns a Uint8Array, which both a disk and a Blob accept');
assert(tag(0) === 'RIFF' && tag(8) === 'WAVE' && tag(12) === 'fmt ' && tag(36) === 'data',
  'the WAV carries RIFF/WAVE/fmt/data in order');
assert(wv.getUint16(22, true) === 2 && wv.getUint32(24, true) === 44100 && wv.getUint16(34, true) === 16,
  'stereo, 44100 Hz, 16-bit');
assert(wv.getUint32(40, true) === 1000 * 2 * 2 && wav.length === 44 + 1000 * 2 * 2,
  'the data chunk length matches the samples written');
assert(wv.getUint32(4, true) === wav.length - 8, 'and the RIFF size counts everything after it');

// The arranged bank, as every export route now builds it: rhythm's form is eighty
// bars of layer sections and its bank literal is a two-bar loop of seven lanes, so
// this is the song that catches an export walking the composition bank instead.
const composed = midiBuffer(resolveTrack('rhythm').bank, { title: 'test', patches: true });
const arranged = midiBuffer(
  applyArrangement(resolveTrack('rhythm').bank, 'rhythm'), { title: 'test', patches: true });
assert(composed.blocks === 1 && composed.trackNames.length === 7,
  'the composition bank alone is one block of seven parts');
assert(arranged.blocks > 30 && arranged.trackNames.length > 15,
  `and the arrangement is what makes it a song (${arranged.blocks} blocks, ${arranged.trackNames.length} tracks)`);

// ---- the walk is BAR by bar, and a bar's edits are part of the song -----------
//
// `songBlocks` keeps the first of every pair of bars, which is the song only when
// every order entry is a whole two-bar section. rhythm is eighty one-bar entries and
// speed twenty-four, so the export dropped half of each and wrote the surviving
// section at full length — a blank bar between every bar of music — and threw the
// per-bar mute mask away on the way past.
//
// The oracle is the sequencer's own formula, spelled out here rather than borrowed:
// slot `bar.half * resolution + s`, off/delete nulled, read through `sequenceValue`
// so a lane written on a coarser grid than the song's clock is read at its stride.
// If this and the walk ever disagree, the file is not the song.
const laneKeyOfTrack = (name) => {
  const [, base, ordinal = ''] = name.replace(/^Drums: /, '').match(/^(.+?)(?: (\d+))?$/);
  const named = {
    Bass: 'bass', Lead: 'lead', 'Lead Harmony': 'leadHarm', Chords: 'chords',
    Organ: 'organChords', Twinkle: 'twinkle', 'Electro FX': 'electroFx',
    'Gliss FX': 'gliss', 'Organ Swoop': 'organSwoop', Vox: 'vox', Shout: 'shout',
    'Key Gliss': 'keyGliss', 'Organ Gliss': 'organGliss',
  }[base] || base;
  return named + ordinal;
};
// A gliss lane writes the whole run — eight scale steps into the target — for one value.
const NOTES_PER_VALUE = { keyGliss: 8, organGliss: 8 };
for (const id of ['rhythm', 'speed']) {
  const bank = applyArrangement(resolveTrack(id).bank, id);
  const resolution = resolutionOf(bank);
  const expected = new Map();
  for (const { b, half, off, delete: del } of songBars(bank, 1)) {
    const silenced = new Set([...(off || []), ...(del || [])]);
    // Every key the bars hold, not `activeLanes`: a layer lane that exists only inside
    // an arrangement's sections is not in `__layers`, and it is exactly the kind of
    // part this export used to lose.
    for (const key of Object.keys(b)) {
      if (!LANE_KEYS.includes(key) && !isLayer(key)) continue;
      if (silenced.has(key) || !Array.isArray(b[key])) continue;
      for (let s = 0; s < resolution; s++) {
        const v = sequenceValue(b, key, half * resolution + s, resolution);
        if (!v) continue;
        const tones = (Array.isArray(v) ? v : [v]).filter((hz) => hz === true || hz > 0).length;
        if (!tones) continue;
        expected.set(key, (expected.get(key) || 0)
          + tones * (NOTES_PER_VALUE[baseLane(key)] || 1));
      }
    }
  }
  const walked = midiBuffer(bank, { title: 'test' });
  assert(walked.bars === barPlan(bank, 1).length,
    `${id} exports every bar of its form (${walked.bars})`);
  const got = new Map(walked.tracks.map((t) => [laneKeyOfTrack(t.name), t.notes]));
  // `sweeps` is unpitched noise and is dropped from MIDI by design.
  for (const lane of MIDI_UNSUPPORTED_LANES) expected.delete(lane);
  const wrong = [...expected].filter(([key, n]) => got.get(key) !== n)
    .map(([key, n]) => `${key} ${got.get(key) ?? 'missing'}≠${n}`);
  assert(!wrong.length && got.size === expected.size,
    `and every note the sequencer plays in ${id}, once each `
    + `(${expected.size} lanes, ${[...expected.values()].reduce((a, b2) => a + b2, 0)} notes`
    + `${wrong.length ? ` — ${wrong.join(', ')}` : ''})`);
}

// A per-bar transpose belongs to the notes, so it has to reach the file: same notes,
// in the same places, at different pitches. speed drops its bass an octave all through.
const speedBank = applyArrangement(resolveTrack('speed').bank, 'speed');
const flatArr = ARRANGEMENTS.speed;
const untransposed = applyArrangement(resolveTrack('speed').bank, 'speed', {
  speed: { ...flatArr, order: flatArr.order.map((e) => (typeof e === 'number' ? e : { ...e, transpose: undefined })) },
});
const withT = midiBuffer(speedBank, { title: 'test' });
const noT = midiBuffer(untransposed, { title: 'test' });
assert(JSON.stringify(withT.tracks.map((t) => t.notes)) === JSON.stringify(noT.tracks.map((t) => t.notes))
  && Buffer.compare(Buffer.from(withT.buffer), Buffer.from(noT.buffer)) !== 0,
  'and a bar transpose moves the pitches without moving a note');

const midi = midiBuffer(resolveTrack('hub').bank, { title: 'test', patches: true, bpm: 90 });
assert(midi.buffer instanceof Uint8Array, 'midiBuffer returns a Uint8Array too');
assert(String.fromCharCode(...midi.buffer.subarray(0, 4)) === 'MThd'
  && String.fromCharCode(...midi.buffer.subarray(14, 18)) === 'MTrk',
  'the MIDI opens with a header chunk and a track chunk');
assert(midi.trackNames.length > 1 && midi.buffer.length > 1000,
  `and holds every part (${midi.trackNames.length} tracks, ${midi.buffer.length} bytes)`);

console.log(failed ? `MIXER EXPORT: ${failed} FAILED` : 'MIXER EXPORT: OK');
process.exit(failed ? 1 : 0);
