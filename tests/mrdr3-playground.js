import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VOICES } from '../src/data/voices.js';
import { offeredByEngine } from '../src/data/voices-in-play.js';
import { encodePatch, decodePatch } from '../tools/mrdr3-patch.js';
import { posToDb as faderPosToDb, dbToPos as faderDbToPos } from '../tools/mrdr3-master-meter.js';
import { benchLane } from '../tools/mixer-voice-library.js';
import { keyGeometry } from '../tools/mixer-synth-keyboard.js';
import { deskNoteName, deskNoteNameHz } from '../tools/mixer-note-names.js';
import { noteName as engineNoteName, n } from '../src/engine/notes.js';
import { voiceGain } from '../src/data/voices.js';

const ok = (message) => console.log(`ok: ${message}`);
const mrdr = offeredByEngine('MRDR-3');
assert(mrdr.length > 0 && mrdr.every((voice) => voice.synth === 'MRDR-3'));
assert(!mrdr.some((voice) => voice.kind === 'engine' || voice.starter || voice.draft || voice.songLocal));
ok('the MRDR-3 selector contains only eligible same-engine library/user presets');

const drum = offeredByEngine('drum');
assert(drum.length > 0 && drum.every((voice) => voice.kind === 'drum'));
assert(!drum.some((voice) => voice.synth === 'MRDR-3'));
ok('the Drum selector cannot cross into MRDR-3 presets');

const source = VOICES.bestVowelPad;
const snapshot = JSON.parse(JSON.stringify({
  ...source,
  label: 'Shared ✓',
  layer: { ...source.layer, osc1: { ...source.layer?.osc1, level: 0 } },
}));
delete snapshot.id; delete snapshot.kind; delete snapshot.level; delete snapshot.peak;
delete snapshot.factory; delete snapshot.user; delete snapshot.draft; delete snapshot.songLocal;
const encoded = encodePatch(snapshot);
assert.deepEqual(decodePatch(encoded), snapshot);
ok('MRDR-3 share snapshots round-trip nested values, arrays and meaningful zeroes');
const largest = mrdr.reduce((best, voice) => {
  const clean = JSON.parse(JSON.stringify(voice));
  for (const key of [
    'id', 'kind', 'level', 'peak', 'factory', 'user', 'draft', 'songLocal', 'starter',
    'quoted', 'nameOnly', 'songOrigin', 'songSourceId',
  ]) {
    delete clean[key];
  }
  const candidate = encodePatch(clean);
  return !best || candidate.length > best.encoded.length ? { clean, encoded: candidate } : best;
}, null);
assert.deepEqual(decodePatch(largest.encoded), largest.clean);
ok('the largest eligible MRDR-3 preset also round-trips through the share codec');
assert.equal(decodePatch('not-a-patch'), null);
assert.equal(decodePatch(encoded.slice(0, -2)), null);
const pack = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const wrongEngine = pack({ v: 1, engine: 'drum', voice: { synth: 'MRDR-3' } });
const wrongVersion = pack({ v: 99, engine: 'MRDR-3', voice: snapshot });
assert.equal(decodePatch(wrongEngine), null);
assert.equal(decodePatch(wrongVersion), null);
ok('malformed share payloads fail closed');

const full = readFileSync(new URL('../tools/mixer-synth-full.js', import.meta.url), 'utf8');
const keyboard = readFileSync(new URL('../tools/mixer-synth-keyboard.js', import.meta.url), 'utf8');
const standalone = readFileSync(new URL('../tools/mrdr3-entry.js', import.meta.url), 'utf8');
const mixerEntry = readFileSync(new URL('../tools/mixer-entry.js', import.meta.url), 'utf8');
const performance = readFileSync(new URL('../tools/mrdr3-performance.js', import.meta.url), 'utf8');
const editor = readFileSync(new URL('../tools/mixer-voice-editor.js', import.meta.url), 'utf8');
const voicesEngine = readFileSync(new URL('../src/engine/voices.js', import.meta.url), 'utf8');
const shell = readFileSync(new URL('../tools/mixer-shell.html', import.meta.url), 'utf8');
const mixerServer = readFileSync(new URL('../tools/mixer.js', import.meta.url), 'utf8');
assert(/sfpresetselect/.test(full) && /sfpresetpicker/.test(full)
  && /sfpresetsearch/.test(full) && /sfpresetresults/.test(full)
  && /choices\.sort/.test(full)
  && /kit\.confirmDiscard/.test(full) && /kit\.selectPreset/.test(full));
assert(/pointercancel/.test(keyboard) && /velocity === 0/.test(keyboard)
  && /type === 'sustain'/.test(keyboard) && /event\.repeat/.test(keyboard)
  && /input\?\.id/.test(keyboard) && /disconnected/.test(keyboard)
  && /const loseFocus/.test(keyboard) && /blur', loseFocus/.test(keyboard));
assert(/bestChoirAah/.test(standalone) && /#patch=/.test(standalone)
  && /createWebMidiRouter/.test(standalone) && /beforeunload/.test(standalone));
assert(/setLimiter\(true\)/.test(standalone)
  && /const liveCompensationOn =/.test(editor)
  && /if \(!liveCompensationOn\(\) \|\| !state/.test(editor)
  && /liveCompensation: false/.test(standalone)
  && /liveCompensation: \(\) => !!Audio\.mixer && !Audio\.mixer\.limiterOn/.test(mixerEntry),
  'standalone disables live compensation and enables its permanent safety limiter');
// A synth you play live is the last place to leave main-thread work in the audio path.
// `captureEnabled` defaults to true, so a window that never says otherwise gets the
// rewind tap — a ScriptProcessorNode on the master output, whose callback runs on the
// main thread every 2048 samples — to feed a ring buffer nothing here reads. Before
// `ensure()`, which is the only place the tap is built, and there is only one of those.
assert(/Audio\.setCaptureEnabled\(false\);\s*\n\s*Audio\.ensure\(\);/.test(standalone),
  'the standalone playground turns the rewind capture tap off before it builds its graph');
assert((standalone.match(/Audio\.ensure\(\)/g) || []).length === 1,
  'and there is still only the one door to ensure() for that line to sit in front of');
assert(/keyboard: \{ octaves: 7, initialOctave: 2 \}/.test(mixerEntry),
  'the Song Mixer Advanced editor uses the same seven-octave compact keyboard range');
// The whole board is on screen, so there is no octave shift and no PANIC to press; a
// drag across the keys glides, which per-key `pointerenter` could not do under capture.
assert(!/sfkoct|sfkpanic|PANIC/.test(keyboard) && !/minOctave|maxOctave/.test(mixerEntry),
  'the performance keyboard has no octave shift and no PANIC button');
assert(/board\.addEventListener\('pointermove'/.test(keyboard)
  && /elementFromPoint/.test(keyboard) && !/addEventListener\('pointerenter'/.test(keyboard),
  'a drag across the keys glides from note to note');

// ---- the board is actually a piano ------------------------------------------
//
// Counted rather than grepped, because the way this broke was arithmetic: every black
// key drew one white key right of where it belonged, which leaves the 2-and-3 grouping
// intact and only moves where the board APPEARS to start. It played the right notes the
// whole time — the C label simply sat on the B below it, and you had to count from an
// end of the board to see it. So this counts.
{
  const board = keyGeometry(7, 36);
  assert.equal(board.whiteCount, 49);
  assert.equal(board.white.length, 49);
  assert.equal(board.black.length, 35);
  assert.equal(board.white[0].midi, 36);
  assert.equal(board.white.at(-1).midi, 119);
  // Every key on the board exactly once, no gaps: 36…119 is 84 semitones.
  const midis = [...board.white, ...board.black].map((k) => k.midi).sort((a, b) => a - b);
  assert.deepEqual(midis, Array.from({ length: 84 }, (_, i) => 36 + i));
  const byIndex = new Map(board.white.map((k, i) => [i, k]));
  for (const key of board.black) {
    // THE INVARIANT. A black key sits immediately after the white key one semitone below
    // it — C♯ after C, F♯ after F. Off by one in either direction and this fails.
    assert.equal(byIndex.get(key.after).midi, key.midi - 1,
      `black ${key.midi} should sit after white ${key.midi - 1}`);
    // ...and its centre lands on the seam between that white key and the next.
    assert.ok(Math.abs((key.left + key.width / 2) * board.whiteCount - (key.after + 1)) < 1e-9,
      `black ${key.midi} should straddle the seam, not sit on a key`);
    // Nothing hangs off the end to be clipped: the top A♯ used to.
    assert.ok(key.left >= 0 && key.left + key.width <= 1);
  }
  // Whites run edge to edge in order, and only the Cs are labelled.
  board.white.forEach((key, i) => {
    assert.ok(Math.abs(key.left - i / 49) < 1e-9);
    if (key.midi % 12 === 0) assert.equal(deskNoteName(key.midi), `C${Math.floor(key.midi / 12) - 2}`);
  });
  // The desk spells middle C as C3 — a bank file still spells it C4. See
  // tools/mixer-note-names.js for why those cannot be one function.
  assert.equal(deskNoteName(60), 'C3');
  assert.equal(deskNoteNameHz(440), 'A3');
  assert.equal(engineNoteName(440), 'A4');
  assert.equal(n('A4'), 440);
  ok('the performance keyboard is a piano: blacks on the seams, Cs labelled, C3 in the middle');
}
assert(/octaves: 7/.test(standalone) && /min-width: 1400px/.test(readFileSync(
  new URL('../tools/mrdr3-shell.html', import.meta.url), 'utf8')));
assert(/html, body[\s\S]*overflow-y: auto/.test(readFileSync(
  new URL('../tools/mrdr3-shell.html', import.meta.url), 'utf8'))
  && /#synthfull \.sfbody \{ flex: none; min-height: 0; overflow: visible;/.test(
    readFileSync(new URL('../tools/mrdr3-shell.html', import.meta.url), 'utf8')),
  'the standalone editor uses document flow so the keyboard follows without an inner scrollbar');
assert(/el\.append\(body\);[\s\S]*el\.append\(keyboard\.root\)/.test(full),
  'the performance keyboard remains directly beneath the preset editor body');
assert(/createPatternPlayer/.test(standalone) && /createEffect/.test(standalone)
  && /BPM/.test(performance) && /BASE KEY/.test(performance)
  && /PATTERN_GATE/.test(performance) && /createGatePot/.test(performance)
  && /onGate/.test(performance) && /patternPlayer\?\.setGate\(percent\)/.test(standalone)
  && /option\.value \?\? option\.id \?\? option\.midi/.test(performance)
  && /rootMidi = 48/.test(performance)
  && /document\.createElement\('select'\)/.test(performance)
  && !/onSelectFocus|onRootFocus/.test(performance)
  && /onRoot: \(\) => patternPlayer\?\.silence\?\.\(\)/.test(standalone)
  && /onPattern: \(id\) =>/.test(standalone)
  && /patternPlayer\?\.silence\?\.\(\)/.test(standalone)
  && /adjustSlowRate: false/.test(standalone) && /patternPlayer\?\.stop\(\)/.test(standalone)
  && /AUDITION FX/.test(performance) && /REVERB/.test(performance) && /DELAY/.test(performance)
  && /sfpdevice/.test(performance) && /devbar/.test(performance) && /devgrid/.test(performance)
  && /devtoggle/.test(performance) && /effectRangeRow/.test(performance) && /fxsel/.test(performance)
  && /if \(!state\.effects\[name\]\.enabled\)/.test(performance)
  && /state\.effects\[name\]\.enabled = true/.test(performance)
  && /sfpfx.*on/.test(readFileSync(new URL('../tools/mrdr3-shell.html', import.meta.url), 'utf8'))
  && /reverb/.test(performance) && /chandelay/.test(performance));
assert(/patternPlayer\?\.setVoice\(opened\)/.test(standalone));
// Changing preset under a running figure stops it, swaps the patch, and starts it again
// on the new sound — comparing two presets means HEARING the second one. `resumeAuto`
// is module state rather than a local because a shared-link load awaits a measurement in
// the middle of all this: a second load beginning inside that window would find an
// already-stopped player, read "was not playing", and lose the figure.
assert(/let resumeAuto = false/.test(standalone)
  && /resumeAuto = resumeAuto \|\| !!patternPlayer\?\.running\(\)/.test(standalone)
  && /if \(resumeAuto\) \{[\s\S]*?resumeAuto = false;[\s\S]*?patternPlayer\.start\(opened\)[\s\S]*?performancePanel\.setPlaying\(true\)/.test(standalone)
  && /toast\('That MRDR-3 preset could not be opened'\);[\s\S]*?resumeAuto = false/.test(standalone),
  'a preset change restarts auto-play only if it was already playing, and not if the open failed');
assert(/const gf = held\('global\.filter', v\.global\?\.filter\) \? null : \(v\.global\?\.filter \|\| null\)/.test(voicesEngine)
  && /const sectionBypassed = \(voice, key, section = null\)/.test(voicesEngine)
  && /section\?\.enabled === false/.test(voicesEngine)
  && /held\('global\.filter', v\.global\?\.filter\)/.test(voicesEngine)
  && /if \(gf\) \{[\s\S]*?filterEnv\(chain\.stages, gf\.env/.test(voicesEngine)
  && /if \(spec\.filter && !held\(`layer\.\$\{layerKey\}\.filter`, spec\.filter\)\)/.test(voicesEngine),
  'MRDR-3 gates the global filter and every layer filter independently, using the same envelope path');
// The bypass still writes a zero attack, and the engine still adds no shape to it — but
// zero used to reach the AudioParam as `setValueAtTime(level, t)`, silence to full in one
// sample, which is a step and which a low note has no top end to hide. So the floor: a
// quarter of the note's own cycle, taken linearly because an exponential out of 1e-4
// spends a short attack crawling and then jumps. Neutral now means "as immediate as this
// note can be without clicking" rather than "instant" — and it is measured in cycles
// rather than milliseconds, because that is what decides whether a gate is audible.
assert(/'global\.vca': \{ attack: 0, decay: 0, sustain: 1, release: 0 \}/.test(editor)
  && /const GATE_MIN_ATTACK = 0\.001/.test(voicesEngine)
  && /const gateFloor = \(freq\) => \(freq > 0/.test(voicesEngine)
  && /Math\.min\(GATE_MAX_ATTACK_FLOOR, Math\.max\(GATE_MIN_ATTACK, 0\.25 \/ freq\)\)/.test(voicesEngine)
  && /const minAttack = gateFloor\(freq\)/.test(voicesEngine)
  && /const attack = Math\.max\(minAttack, e\.attack \?\? 0\.01\)/.test(voicesEngine)
  && /param\.setValueAtTime\(0, t\);\s*\n\s*if \(attackLin\) \{\s*\n\s*for \(const u of RAISED_COS\) param\.linearRampToValueAtTime\(level \* cosAt\(u\), t \+ attack \* u\);/.test(voicesEngine)
  && /const cosAt = \(u\) => 0\.5 \* \(1 - Math\.cos\(Math\.PI \* Math\.min\(1, Math\.max\(0, u\)\)\)\)/.test(voicesEngine),
  'MRDR-3 envelope bypass is neutral: no decay/release, full sustain, and an attack floored'
  + ' at a quarter of the note’s own period so a zero-attack gate is a slope, not a step');
// ...and every gate that opens on a note knows which note it is, or the floor above has
// nothing to measure itself against and silently falls back to the millisecond.
assert(/gateAdsr\(g\.gain, t, stackHolds \? t \+ HOLD_SECONDS : end,\s*\n\s*level, shape, stackHolds, partial\)/.test(voicesEngine)
  && /gateAdsr\(vg\.gain, t, vcaHolds \? holdEnd : gEnd, 1, gv, vcaHolds, base\)/.test(voicesEngine)
  && /gateAdsr\(g\.gain, lt, layerHolds \? holdEnd : end,\s*\n\s*spec\.gain \?\? 1, spec, layerHolds, target\)/.test(voicesEngine),
  'every amp gate is given its own frequency — the additive partial, the note under the '
  + 'global VCA, and the layer at its ratio');
assert(/onSectionChange = \(\) => \{\}/.test(editor)
  && /onSectionChange\(group\.optional\)/.test(editor)
  && /onSectionChange\(key\)/.test(editor)
  && /const previous = getAt\(state\.voice, row\.path\)/.test(editor)
  && /const current = getAt\(state\.voice, row\.path\)/.test(editor)
  && /const heldValue = \(voice, path\) =>/.test(editor)
  && /raw === undefined \? heldValue\(state\.voice, row\.path\) : raw/.test(editor)
  && /row\.path\?\.endsWith\('\.filter\.env\.octaves'\)/.test(editor)
  && /row\.path\?\.endsWith\('\.vca'\)/.test(editor)
  && /onSectionChange: \(\) => \{[\s\S]*?patternPlayer\?\.silence\?\.\(\)[\s\S]*?Audio\.stopPreview\?\.\(\)/.test(standalone)
  && /onSectionChange: \(\) => \{[\s\S]*?applyPreviewEffects\(previewFxState, \{ rebuild: true \}\)/.test(standalone)
  && /onSectionChange: \(\) => \{[\s\S]*?Audio\.stopPreview\?\.\(\)/.test(
    readFileSync(new URL('../tools/mixer-entry.js', import.meta.url), 'utf8')),
  'filter/VCA section switches clear queued audition notes while preserving schedulers');
// ---- a pot has to move the note you are hearing, finger or no finger ---------
//
// The gate is what made this a question. A MRDR-3 note is a heap of one-shot nodes built
// at note-on, so the only thing a drag can still move on one already sounding is what was
// written once and left: the filter cutoffs and their resonance. That reach was hung off
// `_heldNative` — notes with a FINGER on them — which was every previewed note back when
// the bench held everything it played. Gated auto-play notes are not held, so nothing
// found them, and dragging a cutoff under a running figure went dead until the next note:
// a quarter of a second at 1/8, two whole seconds at 1/1.
//
// `_liveNotes` is the same reach for a note nobody is holding. It carries when the note
// is over, because no note-off is coming to delete it — and it is swept on the way IN, or
// a figure left running would pin a note's worth of filter nodes per step forever.
assert(/this\._liveNotes = \[\]/.test(voicesEngine)
  && /_registerLiveNote\(voiceId, live, until\)/.test(voicesEngine)
  && /if \(preview\) this\._registerLiveNote\(v\.id, heldLive, Math\.max\(gEnd, lastOff\)\)/.test(voicesEngine)
  && /_registerLiveNote[\s\S]*?this\._sweepLiveNotes\(\);\s*\n\s*this\._liveNotes\.push/.test(voicesEngine)
  && /for \(const live of this\._liveNotes\) \{[\s\S]*?this\._walkLiveFilters\(live\.live\)/.test(voicesEngine)
  && !/if \(hold\) heldLive\.push/.test(voicesEngine),
  'a live cutoff drag reaches gated auto-play notes, not only notes held by a finger');
assert(/level: base\?\.level \?\? 1/.test(standalone) && /peak: base\?\.peak \?\? 1/.test(standalone));
assert(/normalizeSharedMeasurements/.test(standalone) && /measureRaw\(base\.id/.test(standalone)
  && /patchVoice\.level = base\.level/.test(standalone),
  'shared links remeasure edited patches against their base preset before audition');
assert(/\/MRDR3\//.test(mixerServer) && /buildMrdr3Page/.test(mixerServer));
ok('Advanced selector, keyboard source cleanup, MIDI protocol, and standalone link hooks exist');

// ---- the audition level ------------------------------------------------------
//
// The playground leans the measured level halfway from energy-matching toward
// peak-matching, because the energy is measured over a FIXED window and a preset that
// only occupies a sliver of it reads as near-silent and is handed a gain that makes it
// shout. What is checked here is that the lean does that and nothing else: the same
// direction every time, half the deviation, and no reach outside the standalone.
const db = (x) => 20 * Math.log10(x);

// `voiceGain` answers three ways, and all three are reachable from outside: a voice with
// only a level gets the pure ENERGY answer, one with only a peak gets the pure PEAK
// answer, and one carrying both gets the lean between them. So the lean can be pinned
// without reaching for LANE_TARGETS — the two ends ARE the public API.
const energyGain = (level, lane) => voiceGain({ level }, lane);
const peakGain = (peak, lane) => voiceGain({ peak }, lane);
// A lane's own measurements, recovered the same way: dividing by one leaves the target.
const laneLevel = (lane) => energyGain(1, lane);
const lanePeak = (lane) => peakGain(1, lane);

{
  const L = laneLevel('bass');
  const P = lanePeak('bass');
  // A preset that already arrives exactly where the lane's own voice arrives — same
  // energy, same peak — is the one case both metrics agree on, so the lean must be a
  // no-op there and the gain must be exactly unity.
  assert(Math.abs(voiceGain({ level: L, peak: P }, 'bass') - 1) < 1e-12);

  // THE identity: the answer is the geometric mean of the two ends, which is the
  // midpoint between them in dB. This is what PEAK_LEAN = 0.5 means, stated as behaviour
  // rather than as a constant, so the number cannot drift away from the claim.
  //
  // Every pair here stays inside MAX_LEVEL_BOOST at BOTH ends on purpose. A capped end
  // is no longer the answer it stands for, so the midpoint between them is not the
  // midpoint of anything — the ceiling is checked on its own below.
  for (const [level, peak] of [[L / 3, P], [L * 4, P], [L, P / 3], [L * 2, P * 5]]) {
    const leaned = voiceGain({ level, peak }, 'bass');
    const ends = Math.sqrt(energyGain(level, 'bass') * peakGain(peak, 'bass'));
    assert(Math.abs(db(leaned / ends)) < 1e-9, `lean is not the midpoint at ${level}/${peak}`);
  }

  // And it runs the right way round. A blip — most of the measuring window is silence,
  // so its energy reads low — is pulled DOWN from where energy alone would have put it;
  // a sound that sustains through the window is pushed UP. That inversion is the whole
  // complaint this answers.
  const blip = { level: L / 3, peak: P };
  const pad = { level: L * 4, peak: P };
  assert(voiceGain(blip, 'bass') < energyGain(blip.level, 'bass'));
  assert(voiceGain(pad, 'bass') > energyGain(pad.level, 'bass'));

  // The ceiling still bounds it: a measurement that came out absurdly small cannot buy
  // more than MAX_LEVEL_BOOST however the two answers are combined.
  assert.equal(voiceGain({ level: 1e-9, peak: 1e-9 }, 'bass'), 4);
}
// The fallbacks are unchanged, and an unknown lane still says nothing.
assert.equal(voiceGain({ level: 0, peak: lanePeak('bass') }, 'bass'), 1);
assert(Math.abs(voiceGain({ level: laneLevel('bass'), peak: 0 }, 'bass') - 1) < 1e-12);
assert.equal(voiceGain({ level: 1, peak: 1 }, 'nosuchlane'), 0);
ok('voiceGain leans exactly halfway between energy and peak, and keeps both fallbacks');

{
  // The library, end to end. What a note PEAKS at after levelling, against the peak the
  // lane's own voice reaches, is the thing that was spread wide: it is large for a blip
  // and small for a pad, and levelling by energy alone did nothing to close it.
  const crest = (v, gain) => db((v.peak * gain) / lanePeak(benchLane(v)));
  const rows = mrdr
    .map((v) => ({
      before: crest(v, energyGain(v.level, benchLane(v))),
      after: crest(v, voiceGain(v, benchLane(v))),
      capped: voiceGain(v, benchLane(v)) === 4 || energyGain(v.level, benchLane(v)) === 4,
    }))
    .filter((r) => !r.capped);
  const spread = (a) => Math.max(...a) - Math.min(...a);
  const before = spread(rows.map((r) => r.before));
  const after = spread(rows.map((r) => r.after));
  assert(before > 17 && before < 18, `MRDR-3 crest spread was ${before.toFixed(1)} dB`);
  assert(Math.abs(after - before / 2) < 1e-6, `spread should halve, got ${after.toFixed(1)} dB`);
  // Every preset moves toward parity, never away from it.
  for (const r of rows) assert(Math.abs(r.after) <= Math.abs(r.before) + 1e-9);
}
ok('the MRDR-3 library halves its post-levelling crest spread');

const masterMeter = readFileSync(new URL('../tools/mrdr3-master-meter.js', import.meta.url), 'utf8');
const mrdrShell = readFileSync(new URL('../tools/mrdr3-shell.html', import.meta.url), 'utf8');
// One place decides how loud a preset arrives, for the game and the playground alike.
// A second opinion living in the standalone is exactly what made the same preset two
// different loudnesses depending on where it was heard.
const voicesData = readFileSync(new URL('../src/data/voices.js', import.meta.url), 'utf8');
assert(/const PEAK_LEAN = 0\.5;/.test(voicesData)
  && /energy \*\* \(1 - PEAK_LEAN\) \* peakParity \*\* PEAK_LEAN/.test(voicesData),
  'the lean lives in voiceGain, where every play path already goes');
assert(!/auditionLevel|mrdr3-level|withAuditionLevel/.test(standalone)
  && !/auditionLevel|mrdr3-level/.test(mixerEntry) && !/auditionLevel/.test(editor),
  'no surface carries a second, private answer to the same question');

// The FX chain is rebuilt only when the set of enabled effects changes. A knob turn
// reaches the live `set` instead, or a drag stops every sounding note and regenerates
// the reverb's impulse response once per pixel.
assert(/previewFx\.signature === signature/.test(standalone)
  && /setPreviewEffect\(name, next\[name\]\.params \|\| \{\}, bpm\)/.test(standalone)
  && /\{ rebuild = false \} = \{\}/.test(standalone)
  && /applyPreviewEffects\(previewFxState, \{ rebuild: true \}\)/.test(standalone),
  'audition FX knobs set live parameters and only a topology change rebuilds the chain');
assert(/const IR_KEYS = \['decay', 'preDelay'\]/.test(standalone)
  && /for \(const key of IR_KEYS\) delete cheap\[key\];/.test(standalone)
  && /effect\.set\(cheap, bpm\);/.test(standalone)
  && /clearTimeout\(irTimer\); irTimer = 0; irPending = null;/.test(standalone),
  'the two reverb controls that regenerate an impulse response are coalesced, the rest are not');
assert(/if \(liveCompensationOn\(\)\) \{\s*\n\s*measureRaw\(id, noiseBuf\(\), sampleRate\(\)\)/.test(editor),
  'the open-time reference render is skipped where nothing will ever read it');
assert(/if \(!id\) Audio\.clearLayerSolo\(\);/.test(standalone)
  && /else Audio\.setLayerSolo\(id, key, on\);/.test(standalone),
  'layer solo reaches the engine in the standalone as it does on the desk');
assert(/if \(patch\) delete VOICES\[sourceId\];\s*\n\s*return;/.test(standalone),
  'a shared link that fails to open does not leave its temporary source in the catalogue');
assert(/await normalizeSharedMeasurements[\s\S]{0,400}?removeSession\(\);\s*\n\s*const opened/.test(standalone),
  'the live session survives until a shared-patch measurement has proved it is current');
ok('responsiveness, solo and shared-link lifetime fixes are in place');

// The monitor fader is the desk's master control reused whole — same law, same range,
// same ballistics. Two meters that fall at different rates are two desks to learn.
assert(/\[0, -60\], \[0\.15, -35\], \[0\.3, -20\], \[0\.5, -10\], \[0\.75, 0\], \[1, 6\]/.test(masterMeter)
  && /\[0, -60\], \[0\.15, -35\], \[0\.3, -20\], \[0\.5, -10\], \[0\.75, 0\], \[1, 6\]/.test(mixerEntry),
  'the playground fader uses the desk fader law verbatim');
for (const [name, value] of [['METER_FALL', 55], ['PEAK_HOLD', 1400], ['PEAK_FALL', 30]]) {
  const re = new RegExp(`${name} = ${value}`);
  assert(re.test(masterMeter) && re.test(mixerEntry), `${name} matches the desk`);
}
// The law itself, not just its table: every position must survive the round trip, the
// printed landmarks must land where the desk prints them, and both ends must clamp.
for (let p = 0; p <= 1.0001; p += 0.01) {
  const q = Math.min(1, p);
  assert(Math.abs(faderDbToPos(faderPosToDb(q)) - q) < 1e-9, `fader law not invertible at ${q}`);
}
for (const [pos, want] of [[0, -60], [0.15, -35], [0.3, -20], [0.5, -10], [0.75, 0], [1, 6]]) {
  assert(Math.abs(faderPosToDb(pos) - want) < 1e-9, `fader landmark ${pos} should be ${want} dB`);
}
assert.equal(faderPosToDb(-5), -60);
assert.equal(faderPosToDb(9), 6);
assert.equal(faderDbToPos(-999), 0);
assert.equal(faderDbToPos(999), 1);
// Unity sits three quarters up, which is the whole point of the taper.
assert.equal(faderDbToPos(0), 0.75);
ok('the playground fader law is invertible, hits every printed landmark and clamps');

assert(/masterLevels\(\)/.test(masterMeter) && /setMasterTrim\(db\)/.test(masterMeter)
  && /mash-mrdr3-master-db/.test(masterMeter) && /root\.isConnected/.test(masterMeter)
  && /meter stereo toolbar-meter/.test(masterMeter) && /master-fader-rail/.test(masterMeter)
  && /root\.id = 'mastertoolbar'/.test(masterMeter)
  && /classList\.toggle\('clip', loudest >= 1\)/.test(masterMeter),
  'the meter reads the engine, reuses the desk classes and keeps its clip light');
assert(/#mastertoolbar \{/.test(shell) && /#mastertoolbar \.meter\.toolbar-meter/.test(shell),
  'the desk stylesheet the standalone inlines is what draws it');
assert(/#synthfull #mastertoolbar \{ flex: 0 0 auto/.test(mrdrShell),
  'the standalone gives the fader a lane of its own rather than letting it grow');
assert(/headExtra = null,/.test(full) && /const extra = headExtra\?\.\(\);/.test(full)
  && /bar\.append\(undo, span\('sfspace'\)\);\s*\n\s*const extra/.test(full)
  && /headExtra: \(\) => masterMeter\.root/.test(standalone)
  && !/headExtra/.test(mixerEntry),
  'the title bar takes one extra control, and only the playground passes one');
ok('the standalone toolbar carries the desk master fader and its stereo VU pair');
