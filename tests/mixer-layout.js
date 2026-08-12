// The mixer has four adjustable vertical boundaries: Timeline/Arrangement,
// Arrangement/Mixer, Mixer/Notes and Notes/Effects. Keep the live page contract in a
// small source test so a future shell edit cannot leave a border unrendered, uncounted
// by the layout math, or detached from its drag code.
import { readFileSync } from 'node:fs';

const shell = readFileSync(new URL('../tools/mixer-shell.html', import.meta.url), 'utf8');
const entry = readFileSync(new URL('../tools/mixer-entry.js', import.meta.url), 'utf8');
const librarySource = readFileSync(new URL('../tools/mixer-voice-library.js', import.meta.url), 'utf8');
const editor = readFileSync(new URL('../tools/mixer-voice-editor.js', import.meta.url), 'utf8');
const voiceSource = readFileSync(new URL('../src/data/voices.js', import.meta.url), 'utf8');
const server = readFileSync(new URL('../tools/mixer.js', import.meta.url), 'utf8');
const mixerBuilder = readFileSync(new URL('../tools/build-mixer-static.js', import.meta.url), 'utf8');
const seq = readFileSync(new URL('../tools/mixer-step-seq.js', import.meta.url), 'utf8');
const piano = readFileSync(new URL('../tools/mixer-piano-roll.js', import.meta.url), 'utf8');
const barGrid = readFileSync(new URL('../tools/mixer-bar-grid.js', import.meta.url), 'utf8');
const audio = readFileSync(new URL('../src/engine/audio.js', import.meta.url), 'utf8');
const freezeSpanSource = readFileSync(new URL('../tools/lib/freeze-span.js', import.meta.url), 'utf8');
const touchedBody = /const touched = \(\) => \{[\s\S]*?\n  \};/.exec(editor)?.[0] || '';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

assert(!/schedulePreview|previewNote/.test(touchedBody)
  && !/let previewTimer|const schedulePreview/.test(editor),
  'editing a drum or noise parameter does not schedule an unsolicited note preview');

assert(/const armBarOverride = \(\) => \{\s*if \(mode\) mode\.value = 'on';\s*\};/.test(entry)
  && /\[strumOn, strumDir, gap, arpOn, arpDir, arpRate, octaves,\s*repeat, gate, retrigger, latch\][\s\S]{0,100}?addEventListener\('input', armBarOverride\)/.test(entry),
  'editing any bar Note FX control automatically enables that bar override');
{
  const noteFxEditor = entry.slice(entry.indexOf('function openNoteFxEditor'),
    entry.indexOf('function openBarEffectsEditor'));
  const regionEditor = entry.slice(entry.indexOf('function openRegionEditor'),
    entry.indexOf('function openNoteFxEditor'));
  assert(/notefxrender[\s\S]*Render Arp to Notes[\s\S]*renderArpToNotes/.test(noteFxEditor)
    && !regionEditor.includes("label: 'Render Arp to Notes'"),
  'Render Arp to Notes lives inside the Note FX popup rather than the region menu');
}
assert(/const repeat = check\('Repeat pattern', current\.arp\?\.repeat !== false\)/.test(entry)
  && /repeat: repeat\.checked/.test(entry),
  'the Arpeggiator exposes a saved Repeat pattern option that defaults on');

const envelopeTimeRows = editor.match(/envTime\(/g) || [];
assert(/const ENV_MAX_SECONDS = 10;/.test(editor)
  && /const ENV_TIME_TAPER = 'log';/.test(editor)
  && /const ENV_TIME_STEP = 0\.001;/.test(editor)
  && /n\(path, label, min, ENV_MAX_SECONDS, ENV_TIME_STEP/.test(editor)
  && /\{ \.\.\.opts, taper: ENV_TIME_TAPER, floor: ENV_TIME_STEP \}/.test(editor)
  && envelopeTimeRows.length >= 19
  && /SUSTAIN', 0, 100, 1/.test(editor)
  && /write: \(v\) => v \/ 100/.test(editor),
  'every envelope time shares the 10-second maximum, the millisecond step and the log '
  + 'taper, and sustain is edited as 0–100%');

// The step is not a per-call argument any more, so no envelope pot can be built coarser
// than a millisecond, and none may start above the floor the taper begins at: a decay
// that could not go under 10ms was the whole complaint this range answers.
{
  const mins = [...editor.matchAll(/envTime\([^,]+, [^,]+, ([^,]+), secs,/g)].map((m) => m[1].trim());
  // 0.0001 is the noise ATTACK's floor alone: dsKickHard ships attack 0.000343 and the
  // engine takes the value raw, so a 1ms floor was a pot that rewrote a factory preset
  // on first touch — the exact failure tests/pot-coverage.js exists to catch.
  assert(mins.length === envelopeTimeRows.length
    && mins.every((m) => m === '0' || m === '0.001' || m === '0.0001' || m === 'min'),
    `every envelope time starts at zero or at its taper floor (${new Set(mins).size} distinct)`);
}

// A decade per quarter turn. The landmarks are the point of the taper — 10ms, 100ms, 1s
// and 10s evenly spaced — so they are pinned as arithmetic rather than as prose.
{
  const lo = 0.001;
  const span = Math.log(10 / lo);
  const at = (pos) => lo * Math.exp(span * pos);
  assert(Math.abs(at(0.25) - 0.01) < 1e-9 && Math.abs(at(0.5) - 0.1) < 1e-9
    && Math.abs(at(0.75) - 1) < 1e-9 && Math.abs(at(1) - 10) < 1e-9,
    'the envelope time taper reads 10ms at a quarter turn, 100ms at half, 1s at three '
    + 'quarters and 10s at the stop');
}

// The short time pots span a fraction of a second, not ten, and are already in
// milliseconds across their whole travel, so they keep the quadratic rather than taking
// a taper shaped for a range twenty times wider.
assert(/const SHORT_TIME_SCALE = 2;/.test(editor)
  && !/'DROP TIME'[\s\S]{0,120}taper:/.test(editor)
  && !/'STRIKE'[\s\S]{0,120}taper:/.test(editor)
  && /'DROP TIME', 0\.001, 0\.5, 0\.001/.test(editor)
  && /'GLIDE', 0, 0\.5, ENV_TIME_STEP/.test(editor),
  'the sub-second time pots (DROP TIME, STRIKE, GLIDE) keep their own shorter taper and '
  + 'are still dialled to the millisecond');

const entrySource = readFileSync(new URL('../tools/mixer-entry.js', import.meta.url), 'utf8');
const mrdrKnob = readFileSync(new URL('../tools/mrdr3-knob.js', import.meta.url), 'utf8');
assert(/id="importtracks"/.test(shell)
  && /async function importTracks()/.test(entrySource)
  && /Pick tracks from/.test(entrySource)
  && /input\[name="importtracks-lane"\]:checked/.test(entrySource)
  && entrySource.includes('insertSilence(destinationDraft, destinationDraft.plan.length')
  && /independent: true/.test(entrySource),
  'Import Tracks opens a song picker, then a checked-track picker, grows the destination, and adds independent layers');
assert(/function knob\(\{ min, max, step, value, fmt, onInput, reset, scale = 1, origin = null,\s*taper = null, floor = 0, onStart = null, onEnd = null \}\)/
  .test(entrySource)
  && /const pos = clamp\(position, 0, 1\);/.test(entrySource)
  && /return min \+ \(max - min\) \* Math\.pow\(pos, curve\);/.test(entrySource)
  && /dragPos = clamp\(dragPos \+ \(px \/ 150\)/.test(entrySource)
  && /setPosition\(dragPos\)/.test(entrySource)
  // A row's `scale` may be a function of the voice — a taper that depends on what the
  // preset is — so what is pinned here is that whatever it resolves to is handed to the
  // shared knob beside the row's own origin, not the literal shape of the expression.
  && /typeof row\.scale === 'function' \? row\.scale\(state\.voice\) : row\.scale/.test(editor)
  && /scale, origin: row\.origin, taper: row\.taper, floor: row\.floor/.test(editor)
  // The log branch, in the shared knob and in the standalone copy of it, so the two
  // surfaces cannot disagree about what a position means.
  && /return pos <= 0 \? min : logLo \* Math\.exp\(logSpan \* pos\);/.test(entrySource)
  && /return pos <= 0 \? min : logLo \* Math\.exp\(logSpan \* pos\);/.test(mrdrKnob)
  && /const logLo = logTaper \? Math\.max\(min, floor > 0 \? floor : step, 1e-6\) : 0;/
    .test(entrySource)
  && /const logLo = logTaper \? Math\.max\(min, floor > 0 \? floor : step, 1e-6\) : 0;/
    .test(mrdrKnob),
  'all envelope controls use the shared non-linear knob response');

// A tapered BIPOLAR pot curves about its origin rather than across its span. Applied to
// the whole range instead, the centre detent slides off twelve o'clock — on -10..+10 at
// curve 3 the middle of the travel reads -7.5 — which would make ENV AMOUNT's zero a
// place you could not find by eye. Both halves taper, and only `scale` WITH `origin`
// takes the branch: every pot that had one or neither keeps the arithmetic it had.
assert(/const bipolar = Number\.isFinite\(origin\) && curve !== 1;/.test(entrySource)
  && /const originFrac = /.test(entrySource)
  && /return origin \+ \(max - origin\) \* Math\.pow\(f, curve\);/.test(entrySource)
  && /return origin - \(origin - min\) \* Math\.pow\(f, curve\);/.test(entrySource)
  && /const ENV_OCT_MAX = 10;/.test(editor)
  && /const ENV_OCT_SCALE = 2;/.test(editor)
  && /'ENV AMOUNT', -ENV_OCT_MAX, ENV_OCT_MAX/.test(editor)
  && /origin: 0, scale: ENV_OCT_SCALE/.test(editor),
  'a bipolar pot tapers about its origin, so ENV AMOUNT reaches ten octaves with zero still centred');

// The drum oscillator states its pitch envelope the way the machine it models does:
// a tuning, a signed DEPTH in semitones, and a time. The depth is a view of the two
// stored frequencies — nothing in the catalogue or the engine changed shape for it —
// so the pot has to fill from the centre and the tuning has to carry the destination.
assert(/oscHz\('\$osc\.from', 'FREQUENCY'/.test(editor)
  && /'AMOUNT', -AMOUNT_SEMIS, AMOUNT_SEMIS, 0\.5, semis, 0, 'semi'/.test(editor)
  && /const AMOUNT_SEMIS = 96;/.test(editor)
  && /origin: 0,/.test(editor)
  && /read: \(_to, v\) => amountOf\(v\)/.test(editor)
  && /write: \(x, v\) => toneAt\(oscFrom\(v\), x\)/.test(editor)
  && /setAt\(v, '\$osc\.to', toneAt\(now, 12 \* Math\.log2/.test(editor)
  && /envTime\('\$osc\.sweep', 'SWEEP TIME'/.test(editor)
  && /arcPath\(originDeg, deg\)/.test(entrySource),
  'the drum oscillator is FREQUENCY / AMOUNT (±96 semi, centred) / SWEEP TIME over the stored hertz');

// ---- Off is a bypass, not a delete -------------------------------------------
//
// A switched-off section comes back exactly as it was left. This one is run rather than
// grepped: "it forgot my oscillator" is a behaviour, and the ways to get it wrong —
// seeding defaults over a hold, handing one preset's section to another, letting a
// nested hold outlive its parent — all pass a regex that only checks the words.
//
// The real functions, lifted out of the module. Importing it is not on: the editor is a
// browser module that reaches for `document` at load.
const lift = (re, what) => {
  const m = re.exec(editor);
  if (!m) throw new Error(`mixer-layout: could not lift ${what} out of the editor source`);
  return m[0];
};
const bypass = new Function(`
  ${lift(/const rootOf = [^\n]*;/, 'rootOf')}
  ${lift(/const keysOf = [^\n]*;/, 'keysOf')}
  ${lift(/function getAt\(preset, path\) \{[\s\S]*?\n\}/, 'getAt')}
  ${lift(/function setAt\(preset, path, value\) \{[\s\S]*?\n\}/, 'setAt')}
  ${lift(/const BODY_DEFAULT = [^\n]*;/, 'BODY_DEFAULT')}
  ${lift(/const FM_INDEX_SEED = [^\n]*;/, 'FM_INDEX_SEED')}
  ${lift(/const SECTION_DEFAULTS = \{[\s\S]*?\n\};/, 'SECTION_DEFAULTS')}
  ${lift(/const HELD = [^\n]*;/, 'HELD')}
  ${lift(/const holdOn = [^\n]*;/, 'holdOn')}
  ${lift(/const copy = [^\n]*;/, 'copy')}
  ${lift(/function addSection\([\s\S]*?\n\}/, 'addSection')}
  ${lift(/function dropSection\([\s\S]*?\n\}/, 'dropSection')}
  ${lift(/function releaseHold\([\s\S]*?\n\}/, 'releaseHold')}
  return { addSection, dropSection, SECTION_DEFAULTS };
`)();

{
  const { addSection, dropSection, SECTION_DEFAULTS } = bypass;

  // The report itself: tune it, switch it off, switch it back on.
  const kick = { osc: { type: 'sine', from: 2000, to: 500, sweep: 0.07 } };
  dropSection(kick, 'osc');
  assert(kick.osc === undefined, 'switching a section off takes it out of the preset entirely');
  assert(kick.bypassed?.osc?.from === 2000,
    '...and onto `bypassed`, which is on the preset and therefore in the file');
  addSection(kick, 'osc');
  assert(kick.osc?.from === 2000 && kick.osc?.to === 500,
    'switching it back on returns the values it was left at, not the factory ones');
  assert(kick.bypassed === undefined,
    'and the bag goes with the last hold in it — a preset that uses no switch carries none');

  // ...and a section that has never been on still opens on the sound the engine implied.
  const fresh = {};
  addSection(fresh, 'osc');
  assert(fresh.osc?.from === SECTION_DEFAULTS.osc.from,
    'a section switched on for the first time still seeds from the engine defaults');

  // Nested: FM lives inside the oscillator, and each remembers its own.
  const rim = { osc: { from: 400, to: 400, fm: { ratio: 5.2, index: 3 } } };
  dropSection(rim, 'osc.fm');
  dropSection(rim, 'osc');
  addSection(rim, 'osc');
  assert(rim.osc.from === 400 && rim.osc.fm === undefined,
    'a section switched off after its child comes back without it — that is how it was left');
  addSection(rim, 'osc.fm');
  assert(rim.osc.fm?.ratio === 5.2,
    'and the child is still held separately, at the values it had when it went off');

  // Switching a CHILD on where the parent is bypassed brings the parent's hold with it,
  // rather than seeding a default oscillator over the top of one that was tuned.
  const clave = { osc: { from: 1200, to: 900, fm: { ratio: 7, index: 2 } } };
  dropSection(clave, 'osc');
  addSection(clave, 'osc.fm');
  assert(clave.osc.from === 1200 && clave.osc.fm?.ratio === 7,
    'turning a nested section on rebuilds its parent from the hold, not from defaults');

  // A hold belongs to the preset it is on, so a copy carries its own — which is what
  // Save as New, a lane copy and a song's own version of a sound all are.
  const hat = { osc: { from: 8000, to: 8000 } };
  dropSection(hat, 'osc');
  const hat2 = JSON.parse(JSON.stringify(hat));
  addSection(hat2, 'osc');
  addSection(hat, 'osc');
  assert(hat2.osc.from === 8000 && hat.osc.from === 8000,
    'a copy of a preset carries the holds too — each switch answers for its own preset');

  // The engine never reads `bypassed`, so a preset carrying holds must be, to the ear,
  // the same preset with them deleted.
  const played = { kind: 'drum', osc: { from: 60, to: 40 }, noise: { freq: 3000 } };
  dropSection(played, 'noise');
  const { bypassed, ...audible } = played;
  assert(bypassed?.noise?.freq === 3000 && JSON.stringify(audible)
    === JSON.stringify({ kind: 'drum', osc: { from: 60, to: 40 } }),
    'a hold is inert — everything the engine reads is what it would be with no hold at all');

  // Switching FM on is a COLOUR, not a different instrument. INDEX is depth in hertz as
  // a multiple of the carrier, so 1 swings the oscillator by its whole starting
  // frequency: measured on dsKick, dsSnare and dsRim that changes about half the render's
  // own energy, and the switch was seeded there. The pot still reaches 8 — `rimClang` and
  // `clapFm`, the only two presets in the catalogue that use drum FM, sit at 2.2 — but
  // that is somewhere you go, not where a switch drops you.
  assert(SECTION_DEFAULTS['osc.fm'].index > 0 && SECTION_DEFAULTS['osc.fm'].index <= 0.5,
    'the drum FM switch comes on as a colour — audible, and still the same drum');
}

// ...and the pot's own reset agrees with it, or "put it back" would be a third value that
// throwing the switch never produces.
assert(/const FM_INDEX_SEED = [\d.]+;/.test(editor)
  && /'osc\.fm': \{ type: 'sine', ratio: 1\.4, index: FM_INDEX_SEED, decay: 0\.35 \}/.test(editor)
  && /'\$osc\.fm\.index', 'INDEX', 0, 8, 0\.05, fixed\(2\), FM_INDEX_SEED/.test(editor),
  'the FM card opens on the same depth its INDEX pot resets to — one number, named once');

// An FM section at zero depth is no FM section. `_playLayer` has always read it that way;
// `_playDrum` built the operator regardless, so a modulator swinging the carrier by a
// ten-thousandth of a hertz was constructed per tap for no audible reason — and "wind
// INDEX down" meant something different on the two synths.
const voicesEngine = readFileSync(new URL('../src/engine/voices.js', import.meta.url), 'utf8');
assert(/if \(o\.fm && \(o\.fm\.index \?\? 1\) > 0\) \{/.test(voicesEngine)
  && /if \(!hardSynced && spec\.fm && \(spec\.fm\.index \?\? 1\) > 0\) \{/.test(voicesEngine),
  'INDEX at zero builds no modulator, on the drum path and the layer path alike');

// The taps stepper redraws THE SURFACE IT IS ON. Everything about the card changes with
// the count — the readout, the TIME offsets, FALLOFF, the walks, the per-tap overrides —
// so it cannot patch itself in place, and it is reachable from the full window only: a
// Drum Synth strip opens on Quick and never carries this card. Calling the strip's
// `build` was therefore a repaint of the one surface the button is not on.
assert(/const tapsGroup = \(repaint = build\) => \{/.test(editor)
  && /if \(group\.taps\) \{ card\.append\(tapsGroup\(repaint\)\); return card; \}/.test(editor)
  && !/\n      touched\(\);\n      build\(\);\n      undoHistory\.end\(\);/.test(editor),
  'the TAPS stepper repaints the surface that drew it, so the full window shows the count it just set');

assert(/const SOURCES = \[[\s\S]*?label: 'Library'[\s\S]*?label: 'My presets'/.test(
  librarySource)
  && /const keepSource = SOURCES\.find/.test(
    librarySource)
  && /className = 'vsource'/.test(
    librarySource),
  'the preset library distinguishes read-only Library sounds from editable My presets');
// The claim is the ORDER of the last two, not the whole row: the header has gained
// chips since (usage counts), and will gain more, but search stays the thing directly
// before the close so the eye lands on it in the same place every time.
assert(/head\.append\(title, sources,[^)]*search, close\)/.test(
  librarySource)
  && /#voicelib \.vlclose \{ margin-left: auto; \}/.test(shell)
  && !/const searchRow = document\.createElement\('div'\)/.test(
    librarySource),
  'the preset search sits in the top header immediately before the far-right close');
assert(/searchInput = search/.test(librarySource)
  && /searchInput\?\.focus\(\{ preventScroll: true \}\)/.test(librarySource),
  'opening the preset library focuses the Search presets field');
assert(/if \(voiceLibrary\.isCollapsed\('edit'\)\) voiceLibrary\.collapse\('edit', false\)/.test(entry)
  // The remembered flag is read into `libraryReopened` because the tour reads it too —
  // somebody who left the library open is not on a first visit and is not offered one.
  && /const libraryReopened = sessionMatches[\s\S]*?savedDeskSession\.libraryOpen === true[\s\S]*?localStorage\.getItem\('mash-mixer-library-open'\)/.test(entry)
  && /if \(libraryReopened\) openPresetLibrary\(\)/.test(entry),
  'opening or restoring the preset library reveals its blank editor workspace');
assert(!shell.includes('id="panicbtn"') && !/#panicbtn/.test(shell)
  && !/\$\('panicbtn'\)/.test(entry),
  'Panic is a key, not a button — the header no longer carries one to aim a mouse at');
assert(/if \(e\.key === 'Escape'\) \{[\s\S]{0,300}?panicAll\(\)/.test(entry)
  && /id="stop"[^>]*data-tipsays="[^"]*⎋ is the panic version of this/.test(shell),
  '⎋ runs the panic from the desk, and Stop’s tooltip is where the key is written down');
assert(/function silenceAll\(\)[\s\S]*?Audio\.panic\(\)/.test(entry)
  && /function panicAll\(\)[\s\S]*?const restoreMidi = midiOn[\s\S]*?setMidi\(false, \{ announce: false \}\)[\s\S]*?silenceAll\(\)[\s\S]*?if \(restoreMidi\) setMidi\(true, \{ announce: false \}\)/.test(entry)
  && /async function setMidi\(on, \{ announce = true \} = \{\}\)/.test(entry),
  'Panic temporarily disables MIDI input and restores it only when it was already on');
assert(/toast\(restoreMidi[\s\S]*?MIDI restored[\s\S]*?MIDI off/.test(entry),
  'Panic reports whether MIDI was restored or left off');
const stopClick = /\$\('stop'\)\.onclick = \(\) => \{[\s\S]*?\n\};/.exec(entry)?.[0] || '';
assert(/function silenceAll\(\)[\s\S]*?releaseOskSources\('m:'\)/.test(entry)
  && /silenceAll\(\)[\s\S]*?jumpTo\(at, \{ immediate: true \}\)/.test(stopClick)
  && !/setMidi\(/.test(stopClick)
  && /id="stop"[^>]*data-tipsays="[^"]*release held notes and silence every live sound/.test(shell)
  && !/id="stop"[^>]*data-tipsays="[^"]*turn off MIDI input/.test(shell),
  'Stop silences held notes without changing MIDI and explains its silence-only behavior');
// The desk does not rewind, so it must not be running the recorder that rewinding
// needs. `captureEnabled` defaults to true and only a caller that knows better turns it
// off, so the desk staying silent about it meant a ScriptProcessorNode — a main-thread
// callback every 2048 samples — sitting on the master output of a window that has no
// rewind control on it. Before ensure(), which is the only moment the tap is built.
assert(/Audio\.setCaptureEnabled\(false\)/.test(entry)
  && entry.indexOf('Audio.setCaptureEnabled(false)') < entry.indexOf('Audio.ensure()'),
  'the desk turns the rewind capture tap off before it builds its graph — it has no rewind');
assert(/_startCapture\(\)[\s\S]{0,400}?createScriptProcessor/.test(audio),
  'and that tap is still the ScriptProcessorNode this is worth avoiding');
assert(/panic\(\)[\s\S]*?this\._cutLaneGates\(\)[\s\S]*?this\.voices\.dispose\(\)[\s\S]*?this\.bank = null/.test(audio)
  && /resumeAfterPanic\(\)[\s\S]*?this\.levels\.master/.test(audio)
  && /previewNote\([^\n]*\)[\s\S]*?this\.resumeAfterPanic\(\)/.test(audio),
  'the audio engine cuts live buses and held voices, then restores on a deliberate preview');
assert(/const SEQUENCER_LOOKAHEAD = 0\.25;/.test(audio)
  && /const SEQUENCER_LOOKAHEAD_OPTIONS = Object\.freeze\(\[0\.25, 0\.5, 1\]\)/.test(audio)
  && /this\.sequencerLookahead = SEQUENCER_LOOKAHEAD/.test(audio)
  && /setSequencerLookahead\(seconds\)[\s\S]*?SEQUENCER_LOOKAHEAD_OPTIONS\.includes\(value\)/.test(audio)
  && /lookahead\(\) \{/.test(audio)
  && /const ahead = this\.lookahead\(\);[\s\S]{0,120}?while \(this\.nextTime < this\.ctx\.currentTime \+ ahead\)/.test(audio),
  'the realtime scheduler keeps a configurable foreground safety margin while the desk lays out');
// The other half of that bargain. A quarter-second is short because a seek has to be
// heard, and that reasoning only holds for a window somebody is attending to. FOCUS is
// the test, not visibility: switch to another app on a Mac and the Chrome window is
// usually still in plain sight, so `document.hidden` stays false while the process has
// already been demoted — gating on `hidden` alone covers the case nobody listens through
// and misses the one the desk is actually used in.
assert(/const BACKGROUND_LOOKAHEAD = 1\.5;/.test(audio)
  && /document\.hidden \|\| !document\.hasFocus\(\)\s*\n?\s*\?\s*Math\.max\(BACKGROUND_LOOKAHEAD, foreground\)\s*:\s*foreground/.test(audio),
  'an unattended desk queues at least the background safety margin');
// And the desk stops DRAWING the audio when nobody is watching it. Meters, playhead,
// clocks and the four following grids are a picture of the sound; sixty of those a
// second on a twenty-lane song is real layout, and spending it on a window whose owner
// is in another app was enough that scrolling in that other app put a hole in the song.
// The two transport syncs stay above the return — arming a loop and landing a seek are
// not pictures, and a seek that waits for you to look back is a broken seek.
assert(/syncLoopAnchor\(\);\s*\n\s*syncPendingSeek\(\);\s*\n\s*if \(typeof document !== 'undefined' && !document\.hasFocus\(\)\) \{\s*\n\s*requestAnimationFrame\(tick\);\s*\n\s*return;/.test(entry),
  'an unattended desk keeps its transport running and stops drawing meters at it');
// And it asks the browser for room to be late in, which the game must not inherit: a
// small buffer is right for a jump sound and wrong for a desk that plays through a
// twenty-lane section with another app in front of it.
assert(/setLatencyHint\(hint\)/.test(audio)
  && /setSequencerLookahead\(seconds\)/.test(audio)
  && /if \(this\.latencyHint\) opts\.latencyHint = this\.latencyHint;/.test(audio)
  && /if \(this\.sampleRateHint\) opts\.sampleRate = this\.sampleRateHint;/.test(audio)
  && /Object\.keys\(opts\)\.length \? new AC\(opts\) : new AC\(\)/.test(audio)
  // The desk's default is still `playback`; it now offers a visible localStorage
  // preference plus a numeric maximum-safety request. See LATENCY_KEY.
  && /const LATENCY_KEY = 'mash-mixer-latency'/.test(entry)
  && /const LOOKAHEAD_KEY = 'mash-mixer-lookahead'/.test(entry)
  && /AUDIO_LATENCY_OPTIONS[\s\S]*?id: '0\.1'[\s\S]*?Maximum safety/.test(entry)
  && /AUDIO_LATENCY_DEFAULT = 'playback'/.test(entry)
  && /AUDIO_LOOKAHEAD_DEFAULT = 0\.25/.test(entry)
  && /const normalizeLatency = \(raw\)/.test(entry)
  && /const normalizeLookahead = \(raw\)[\s\S]*?AUDIO_LOOKAHEAD_DEFAULT/.test(entry)
  && /Audio\.setLatencyHint\(selectedLatencyOption\.hint\)/.test(entry)
  && /Audio\.setSequencerLookahead\(readAheadPreference\)/.test(entry)
  && /id="audiosettingsopen"[^>]*aria-haspopup="dialog"/.test(shell)
  && /id="audiosettingsdialog"[^>]*role="dialog"/.test(shell)
  && /id="audiosettingsdialog"[\s\S]*id="audiolatency"/.test(shell)
  && /id="audiosettingsdialog"[\s\S]*id="audioahead"/.test(shell)
  && /Output stage\.[\s\S]*Scheduling stage\.[\s\S]*How they work together/.test(shell)
  && !/<details class="draweradvanced">/.test(shell)
  && /id="audiolatency"/.test(shell)
  && /id="audioahead"/.test(shell)
  && /id="audiosettingsstatus"[^>]*role="status"/.test(shell)
  && /function openAudioSettings\(\)[\s\S]*showModal\(\)/.test(entry)
  && /function closeAudioSettings[\s\S]*audioSettingsDialog\.close\(\)/.test(entry)
  && /audioSettingsSummary\.textContent/.test(entry)
  && /function applyAudioSettings\(\)[\s\S]*localStorage\.setItem\(LOOKAHEAD_KEY/.test(entry)
  && /audioSettingsApply\.onclick = applyAudioSettings/.test(entry)
  && /id="audiosettingsapply"/.test(shell)
  && /id="audiosettingscancel"/.test(shell)
  && /audioLatencySel\.onchange = updateAudioSettingsDraft/.test(entry)
  && /audioAheadSel\.onchange = updateAudioSettingsDraft/.test(entry)
  && /location\.reload\(\)/.test(entry)
  && !/setLatencyHint/.test(readFileSync(new URL('../src/main.js', import.meta.url), 'utf8')),
  'the desk exposes saved output-buffer and read-ahead choices without changing game latency');
// Both options are requests a browser may refuse, and a desk with no audio is worse
// than a desk at the wrong rate.
assert(/catch \(e\) \{\s*\n\s*console\.warn\('\[audio\] context options refused'/.test(audio)
  && /this\.ctx = new AC\(\);/.test(audio),
  'a refused context option falls back to the browser default instead of losing audio');
// The desk monitors at the rate its bounces render (tools/lib/wav.js SR = 44100), so
// the mix being heard is the file being kept — and the graph costs ~8% less than at
// 48k. The game keeps the device default, exactly like the latency hint.
assert(/Audio\.setSampleRate\(44100\)/.test(entry)
  && !/setSampleRate/.test(readFileSync(new URL('../src/main.js', import.meta.url), 'utf8')),
  'the desk monitors at the bounce sample rate and the game keeps the device default');
// A silenced lane costs nothing: the desk opts in to the scheduler skipping muted
// lanes and the losers of a channel solo — states whose synthesis reaches no output
// at all (mute zeroes the fader every send taps below; solo zeroes the gate above
// everything). The skip nulls lanes AFTER the percussion tally so visualizers keep
// following the arrangement, and never during a preview. The game never sets the
// flag, so every game path is untouched.
assert(/setSilentLaneSkip\(on\)/.test(audio)
  && /this\.silentLaneSkip && this\.mixer && !this\._previewing/.test(audio)
  && /Audio\.setSilentLaneSkip\(true\)/.test(entry)
  && !/setSilentLaneSkip/.test(readFileSync(new URL('../src/main.js', import.meta.url), 'utf8')),
  'the desk skips synthesis for lanes the mix has silenced; the game never does');
assert(/laneSilent\(key\)/.test(readFileSync(new URL('../src/engine/mixer.js', import.meta.url), 'utf8'))
  && /soloed\.size > 0 && !soloed\.has\(key\)/.test(readFileSync(new URL('../src/engine/mixer.js', import.meta.url), 'utf8')),
  'a lane is silent to the skip when muted or losing a channel solo — never for an aux solo');
// A deliberate heavy UI build must not drain the sequencer's queue: expanding the
// whole-song roll blocks the main thread ~320ms against a 250ms lookahead, which is
// "expanding the roll sometimes glitches". The engine can queue ahead ON REQUEST
// (prefill — the notes that were coming anyway, earlier), and every known-heavy
// open asks first. The playhead's own two-bar page flip deliberately does NOT: it
// runs mid-playback on its own schedule, and widening the window there is how a
// freshly painted note stops being heard on its own bar.
assert(/prefill\(seconds = 1\)/.test(audio)
  && /this\._previewing\) return;/.test(audio)
  && /takeSchedulerHealth\(\)/.test(audio)
  && /if \(margin < 0\) this\._schedLate\+\+;/.test(audio),
  'the engine can prefill its queue on request and counts the passes that ran late');
// One implementation of "protect the audio and record the cost", imported by every
// surface that has a heavy build — rather than a prefill number copied into three
// files, which is three places for it to drift.
const heavyUiSrc = readFileSync(new URL('../tools/lib/heavy-ui.js', import.meta.url), 'utf8');
assert(/export const HEAVY_UI_PREFILL_S = 2/.test(heavyUiSrc)
  && /Audio\.prefill\(HEAVY_UI_PREFILL_S\)/.test(heavyUiSrc)
  && /export function heavyUi\(label, fn\)/.test(heavyUiSrc)
  && /export function lastHeavyBuild\(/.test(heavyUiSrc),
  'lib/heavy-ui.js owns the prefill window and the record of what the stall was for');
assert((barGrid.match(/heavyUi\(/g) || []).length === 4
  && /heavyUi\(`open \$\{ns\}`, build\)/.test(barGrid)
  && !/Audio\.prefill/.test(barGrid),
  'grid open, refresh, redraw and the scope toggle go through heavyUi — four sites, no more');
assert(/heavyUi\('open preset library'/.test(entry)
  && /heavyUi\('open full synth editor'/.test(editor),
  'the preset library and the full synth editor announce their own big builds');
assert(/takeSchedulerHealth/.test(entry) && /pass\(es\) after it emptied/.test(entry)
  && /lastHeavyBuild\(\)/.test(entry) && /surface not yet protected/.test(entry),
  'the watchdog reports a starved scheduler in numbers and names the build or recent control');
// ---- the load readout says nothing until something is wrong -------------------
//
// The clock ratio is a DEADLINE, not a gauge: it reads 1.00 whether the graph is
// nearly empty or nearly full, and measuring it with a timer wobbles a percent
// either way. Shown as a status it therefore read "GOOD 1.00×" on an empty song —
// which looks like a limit — and tripped "NEAR LIMIT" on its own jitter. So it may
// only ever raise an alarm, on a real shortfall sustained for seconds.
assert(/const behind = Audio\.bank && \(ratio < 0\.95 \|\| instant < 0\.90\);/.test(entry)
  && /const STRUGGLE_MS = 500;/.test(entry) && /const OVERLOAD_MS = 2000;/.test(entry)
  && /if \(!behind && ratio > 0\.98\) health\.behindSince = 0;/.test(entry),
  'a real shortfall warns at half a second and is called overloaded at two, clearing at 0.98');
// A severe shortfall needs no averaging: a 250ms tick would have to be 28ms late to
// read 0.90, and a graph over its budget reads 0.4.
assert(/const instant = over\(1\);/.test(entry),
  'and a single sample under 0.90 counts at once, so a bad overload is not waited out');
// Staged on purpose: by the time a shortfall is certain you have already heard it, so
// the first stage fires while the queue may still be covering the gap.
assert(/health\.audioStruggling \? 'AUDIO STRUGGLING'/.test(entry)
  && /MISSING ITS DEADLINE/.test(entry),
  'and the early stage says it is at the edge rather than already broken');
// Sampled four times a second, judged over two samples: fast enough to warn early,
// averaged enough that one late timer is not a verdict.
assert(/const HEALTH_TICK_MS = 250;/.test(entry)
  && /setInterval\(checkAudioHealth, HEALTH_TICK_MS\)/.test(entry)
  && /const ratio = over\(2\);/.test(entry),
  'the watchdog samples at 250ms and judges the clock over half a second');
// The dead-output tiers are written in seconds against that tick — they were literal
// tick counts once, and a faster tick would have quartered every one of them.
assert(/const DEAD_TIER_1 = 3 \* 1000 \/ HEALTH_TICK_MS;/.test(entry)
  && !/health\.deadRuns === 3\b/.test(entry),
  'and its escalation is expressed in seconds, not in ticks');
// Code lines only: the comment above the rewrite quotes the old wording to explain
// what was wrong with it, and a test that could not tell the two apart would be
// failed by its own explanation.
const entryCode = entry.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
assert(!/NEAR LIMIT/.test(entryCode) && !/'GOOD/.test(entryCode),
  'and there is no reassuring verdict to be misread as a limit');
// Two different faults, two different answers: the mix is the thing to change only
// when the AUDIO thread is behind. A stalled main thread is the machine, not the song.
assert(/health\.audioBehind \? 'AUDIO OVERLOADED'/.test(entry)
  && /health\.uiStalled \? 'MACHINE BUSY'/.test(entry)
  && /THE AUDIO IS FINE BUT THE BROWSER IS BUSY/.test(entry),
  'the readout names which of the two causes it is, because they need opposite responses');
assert(/el\.classList\.toggle\('dirty', !!trouble\)/.test(entry),
  'and the estimate never lights the lamp — it is a guess about one machine');
// Silence the desk ASKED for is not a fault. Without this the watchdog would rebuild
// the graph because the transport is stopped, which is the desk repairing obedience.
assert(/const quiet = !playing \? 'transport stopped'/.test(entry)
  && /Audio\.muted \? 'desk muted'/.test(entry)
  && /Audio\.panicked \? 'panicked'/.test(entry)
  && /const dead = !quiet &&/.test(entry),
  'the watchdog only counts dead-output strikes while output is actually expected');
assert(/!Number\.isFinite\(v\)/.test(entry),
  'and it treats an Infinity as poison too, not only a NaN');
assert(/const preNonFinite = preValues\.some/.test(entry)
  && /nan \|\| preNonFinite \|\| clockStalled/.test(entry),
  'and a poisoned pre-master meter is preserved as non-finite rather than coerced to zero');
// A non-finite sample stops at the first compressor downstream, so WHICH chain it
// came from is the whole question — answered by walking meters that already exist.
assert(/const poisoned = \[\]/.test(entry)
  && /Audio\.mixer\.auxLevel\(a\.id\)/.test(entry)
  && /recentFilterWrites\?\.\(\)/.test(entry),
  'a dead output names the poisoned chains and dumps the filter writes that led there');
const voicesSrc = readFileSync(new URL('../src/engine/voices.js', import.meta.url), 'utf8');
assert(/recentFilterWrites\(\)/.test(voicesSrc),
  'the rack keeps that record — the "unstable filter" warning names nothing on its own');

// ---- the note cache ---------------------------------------------------------
//
// Rendered notes for the pooled Tone voices, which measurement says is where the
// dense song's cost actually is: one sixteenth-note pluck layer is 0.14 of a core,
// and taking it apart says essentially all of that is per-note synthesis rather than
// the instrument standing idle. Proven bit-identical against the live pool by
// work/local/verify-note-cache.js.
assert(/_cacheablePool\(v, mode, preview, hold\)/.test(voicesSrc)
  && /setNoteCache\(on\)/.test(audio)
  && /Audio\.setNoteCache\(/.test(entry)
  && !/setNoteCache/.test(readFileSync(new URL('../src/main.js', import.meta.url), 'utf8')),
  'the desk can play pooled Tone voices from rendered notes; the game never does');
assert(/id="notecachetoggle"[^>]*aria-pressed="true"[^>]*hidden/.test(shell)
  && /const NOTE_CACHE_KEY = 'mash-mixer-note-cache'/.test(entry)
  && /noteCacheToggle\.hidden = !DEV_USER/.test(entry)
  && /Audio\.setNoteCache\(noteCacheEnabled\)/.test(entry)
  && /localStorage\.setItem\(NOTE_CACHE_KEY, noteCacheEnabled \? '1' : '0'\)/.test(entry),
  'DEV exposes a saved hamburger toggle for live-synth versus note-cache playback');
assert(/this\.loopListeners = \[\]/.test(audio)
  && /onLoop\(fn\)/.test(audio)
  && /const loop = \{ when: this\.nextTime, start: this\.loopStart, end: this\.loopEnd \}/.test(audio)
  && /const formEnd = plan\.length \* 16/.test(audio)
  && /for \(const fn of this\.loopListeners\) fn\(loop\)/.test(audio),
  'the engine publishes genuine scheduler wraps with their audible AudioContext time');
assert(/id="looplogopen"[^>]*aria-haspopup="dialog"[^>]*hidden/.test(shell)
  && /id="looplogdialog"[^>]*role="dialog"/.test(shell)
  && /id="looplogtext"[^>]*readonly[^>]*aria-label="Loop diagnostics in CSV format"/.test(shell)
  && /const LOOP_LOG_KEY = 'mash-mixer-loop-log'/.test(entry)
  && /Audio\.onLoop\?\.\(\(loop\)/.test(entry)
  && /\(loop\.when - Audio\.ctx\.currentTime\) \* 1000/.test(entry)
  && /localStorage\.setItem\(LOOP_LOG_KEY, JSON\.stringify\(loopLogRecords\)\)/.test(entry)
  && /navigator\.clipboard\.writeText\(csv\)/.test(entry)
  && /mashenstein-loop-diagnostics-\$\{loopLogSession\}\.csv/.test(entry),
  'DEV records one persisted row at each audible loop and exposes copy/download without a console');
assert(/runtimeHealth\(\)/.test(voicesSrc)
  && /cachedSources: this\._cachedPlayback\.size/.test(voicesSrc)
  && /this\._cachedPlayback\.delete\(active\)/.test(voicesSrc)
  && /loopHealthWindow\.overloaded/.test(entry)
  && /dropoutsDelta/.test(entry),
  'loop rows compare existing health and cache telemetry, including live cached sources');
assert(/recordType', 'status'/.test(entry)
  && /function appendDiagnosticEvent\(/.test(entry)
  && /AUDIO OUTPUT RECOVERED/.test(entry)
  && /recoveryTier: 'fresh context'/.test(entry)
  && /Audio\.rebuildRealtimeContext\(\)/.test(entry)
  && /appendDiagnosticEvent\('PLAYBACK INTERRUPTED'/.test(entry)
  && /function lastDiagnosticAction\(/.test(entry)
  && /stallSource: heavy\?\.label \|\| action\?\.label \|\| 'unattributed'/.test(entry),
  'diagnostics persist output death, recovery tiers, and attributed scheduler holes immediately');
// Each exclusion is load-bearing: a mono/legato note retargets the one still
// sounding, a vibrato pool's LFO free-runs across notes, and a held note has no
// length until a finger says so — none of those is a pure function of (preset,
// pitch, length), which is the only thing that can be cached.
assert(/mode === 'poly'/.test(voicesSrc)
  && /!\(v\.vibrato && v\.vibrato\.depth > 0\)/.test(voicesSrc)
  && /!preview && !hold/.test(voicesSrc)
  && /v\.kind !== 'drum' && v\.kind !== 'noise'/.test(voicesSrc),
  'and it refuses every voice whose note is not a pure function of (preset, pitch, length)');
// A bounce must synthesise, not replay: the file IS the reference for what the song
// sounds like, and a cache miss inside one would put a rendered note beside a live one.
assert(/if \(typeof ctx\.startRendering === 'function'\) return false;/.test(voicesSrc),
  'an offline render never replays from the cache');
// A replayed buffer is a LIVE NODE for its whole length, and a note is rendered for
// `dur + tailOf`, whose floor is over a second — so an untrimmed pluck held a source
// alive five times longer than its sound, and the graph carried five times the
// concurrent nodes the pool would have. Measured at half of every buffer and 18MB;
// and because it only bites once the cache is warm, it arrived AFTER the first
// complete loop, in the busiest bars, which is precisely how it was reported.
assert(/function trimSilence\(buffer\)/.test(voicesSrc)
  && /trimSilence\(await ctx\.startRendering\(\)\)/.test(voicesSrc)
  && /const CACHE_SILENCE_FLOOR = 1e-5;/.test(voicesSrc),
  'a rendered note is trimmed to where its sound ends, not to its retirement window');
assert(/Math\.max\(128, last \+ 1 \+ Math\.ceil\(CACHE_TAIL_GUARD_S \* buffer\.sampleRate\)\)/.test(voicesSrc),
  'with a guard past the last audible sample, and never a zero-length buffer');
assert(/const entries = \[\];/.test(voicesSrc)
  && /if \(!entry\?\.buffer\) return false;/.test(voicesSrc)
  && /for \(const entry of entries\)/.test(voicesSrc),
  'a partially cached chord falls back before starting any cached tone');
assert(/const NOTE_RENDER_JOBS = 1;/.test(voicesSrc)
  && /state\.playbackActive/.test(voicesSrc)
  && /setNoteCachePlaybackActive\(state, active\)/.test(voicesSrc),
  'offline cache preparation is single-filed and paused during transport playback');
assert(/setNoteCachePreparationHeld\(held\)/.test(audio)
  && /const NOTE_CACHE_PREPARE_BUDGET_MS = 1800/.test(entry)
  && /async function playFromBeginning\(\)/.test(entry)
  && /Audio\.prepareNoteCache\?\.\(engineBank\(\), range/.test(entry)
  && /Audio\.setNoteCachePreparationHeld\(true\)[\s\S]{0,100}?if \(playing\) setPlaying\(false\)/.test(entry)
  && /Audio\.setNoteCachePreparationHeld\(true\)/.test(entry)
  && /if \(held && !health\.rendering\) break;/.test(entry)
  && /\$\('playstart'\)\.onclick = playFromBeginning/.test(entry),
  'Start from beginning prepares queued notes for a bounded time and starts between cache jobs');
assert(/prepareNoteCache\(bank, \{ startStep = 0, endStep = null \} = \{\}\)/.test(audio)
  && /for \(let step = Math\.floor\(from \/ tick\) \* tick; step < to; step \+= tick\)/.test(audio)
  && /rack\.prepareNoteCache\(voice\.id, freq, duration\(\)/.test(audio)
  && /rack\.prioritisePreparedNotes\(\)/.test(audio)
  && /prepareNoteCache\(voiceId, freq, dur/.test(voicesSrc)
  && /preparePriority/.test(voicesSrc),
  'a cold Start from beginning inventories the resolved arrangement silently and prioritises late notes');
assert(/async function playFromParked\(\)[\s\S]*?loopOn \? currentLoopBounds\(\) : null[\s\S]*?prepareAndStart\(\{ fromStep: parkedAt, range: bounds, control: 'play' \}\)/.test(entry)
  && /startStep: range\.start, endStep: range\.end/.test(entry)
  && /\$\('play'\)\.onclick = \(\) => \{ if \(!playing\) void playFromParked\(\); \}/.test(entry),
  'Play inventories and warms only the armed locator loop before starting it');
assert(/createNoteCacheState\(\)/.test(voicesSrc)
  && /new VoiceRack\(this\.ctx, this\.noiseBuf, this\.crashBuf, this\.noteCacheState\)/.test(audio)
  && /setNoteCachePlaybackActive\(noteCacheState, !!bank \|\| this\.noteCachePreparationHeld\)/.test(audio),
  'the desk cache survives rack replacement and follows the transport state');
assert(/cacheEntryCurrent\(state, job\)/.test(voicesSrc)
  && /state\.bytes = Math\.max\(0, state\.bytes -/.test(voicesSrc)
  && /entry\.evicted = true/.test(voicesSrc),
  'stale renders cannot commit or inflate the cache byte total');
// The panel edits VOICES[id] in place, so the cache has to be told; `refresh` is the
// one door every edit comes through.
assert(/this\._specRev\.set\(voiceId, \(this\._specRev\.get\(voiceId\) \|\| 0\) \+ 1\)/.test(voicesSrc),
  'editing a preset invalidates its cached notes');
// Tone's context is global: building the throwaway rack redirects every Tone node
// built afterwards, including the live pools the sequencer is still filling. Found
// by playing the desk, not by reading the code.
//
// Checked as the INVARIANT rather than as one line's spelling: the borrow is put back
// before the function yields, so no scheduling pass can run while Tone points at a
// throwaway context. Both renderers are held to it — whatever sits between the two
// (the layer one returns early on a preset that plays nothing) has to be synchronous.
{
  const renderers = voicesSrc.match(/async _render\w*Note\([\s\S]*?\n {2}\}/g) || [];
  assert(renderers.length === 2, 'there are two offline note renderers to check');
  for (const body of renderers) {
    const restored = body.indexOf('Tone.setContext(prevToneCtx);');
    const yields = body.indexOf('await ctx.startRendering()');
    assert(body.includes('const prevToneCtx = Tone.getContext()')
      && restored > 0 && yields > restored
      && !body.slice(restored, yields).includes('await'),
      'the note renderer puts Tone’s global context back before it yields');
  }
}

// ---- and the same for MRDR-3, which is where this song's cost actually is --------
//
// Nine of the dense song's lanes are layer presets and its last bars measure at or
// over the one core Web Audio gets. The gate is SEPARATE from the pooled one rather
// than widened, because two of that one's exclusions do not mean the same thing here —
// MRDR-3 builds its vibrato per note-on at phase zero, so a vibrato without SPREAD is
// the same wobble every time, and the song's busiest lane is a lead with one.
assert(/_cacheableLayer\(v, mode, preview, hold\)/.test(voicesSrc)
  && /export function layerVariesWithTime\(v\)/.test(voicesSrc),
  'the desk can play MRDR-3 notes from rendered notes too');
// Each of these is a way for a note to depend on something other than its own pitch
// and length. The humanise keys and the sample-and-hold LFO are seeded from the note's
// TIME (`hitRandom`); a tempo-synced LFO reads `spb`, which is not in the key; a noise
// layer would be silently DROPPED by a render rack that has no noise buffers; a lit
// solo changes which oscillators exist at all.
assert(/\(hum\.entry \?\? 0\) > 0/.test(voicesSrc)
  && /\(v\?\.vibrato\?\.depth \?\? 0\) > 0 && \(v\.vibrato\.spread \?\? 0\) > 0/.test(voicesSrc)
  && /lfo\.type === 'samplehold'/.test(voicesSrc)
  && /lfo\.sync === 'tempo'/.test(voicesSrc)
  && /v\.layer\[key\]\.type === 'noise'/.test(voicesSrc)
  && /const solo = this\.soloLayers\?\.get\(v\.id\)/.test(voicesSrc),
  'and it refuses every layer note that is not a pure function of (preset, pitch, length)');
// A chord's tones sum into ONE drive shaper per note-on, and a shaper is not linear:
// three separately-rendered tones added at replay would drop the intermodulation that
// makes a driven stack read as one instrument.
assert(/_layerCacheEntry\(v, voiceId, notes, dur, detune\)/.test(voicesSrc)
  && /parts\.push\('r'\)/.test(voicesSrc),
  'a layer note-on is cached whole, chord and rests together, never tone by tone');
// The width IS the sound on the patches worth caching — a per-oscillator spread, a
// chorus panned apart — and a mono render would collapse it without a sound to show
// for it. Stored mono only when both channels came back identical.
assert(/new OAC\(2, Math\.ceil\(seconds \* sr\), sr\)/.test(voicesSrc)
  && /function collapseMono\(buffer\)/.test(voicesSrc),
  'a layer note renders in stereo, and is kept in stereo when it is one');
// `tailOf` reads `v.options`, which MRDR-3 presets do not have, so it returns its
// one-second floor for all of them — and this song's string pad holds a 3.1s release.
assert(/function layerNoteSeconds\(v, dur\)/.test(voicesSrc)
  && /layerNoteSeconds\(v, longest\)/.test(voicesSrc),
  'and for as long as its own release, not the floor tailOf would have given it');
// A solo is monitoring, so it never reaches `refresh` — but it changes what a note IS.
assert(/_forgetRenderedNotes\(voiceId\)/.test(audio)
  && /setLayerSolo\(voiceId, layerKey, on\)[\s\S]*?_forgetRenderedNotes\(voiceId\)/.test(audio),
  'lighting a layer solo makes the cache forget what it rendered without one');

// ---- the one way this gate can rot, closed ----------------------------------
//
// `layerVariesWithTime` is a hand-written list of the preset keys that reach
// `hitRandom`, and the note cache trusts it to decide which patches may be frozen into
// a buffer. It cannot drift as PRESETS change — it reads the same keys the engine reads
// — but it drifts the moment somebody adds a NEW randomness path to `_playLayer` and
// does not think of it here. The failure is silent and it is the bad direction: a patch
// that was written to breathe gets cached as one frozen draw of itself.
//
// `work/local/probe-layer-determinism.js` catches exactly that by measurement, and it
// found `syncRazorLead` this way — but it needs Playwright and takes minutes over
// seventy presets, so it is not in any suite and its header asks to be remembered.
// Discipline is not a guard. This is: count the call sites, and require every humanised
// one to name a key the predicate actually reads.
{
  const at = voicesSrc.indexOf('  _playLayer(v, {');
  assert(at > 0, 'there is a _playLayer to check');
  // Close the PARAMETER list before taking the body brace — the signature destructures,
  // so the first `{` after the name belongs to the options bag, not to the method.
  let i = voicesSrc.indexOf('(', at);
  for (let paren = 0; i < voicesSrc.length; i++) {
    if (voicesSrc[i] === '(') paren++;
    else if (voicesSrc[i] === ')' && --paren === 0) break;
  }
  const open = voicesSrc.indexOf('{', i);
  let end = -1;
  for (let j = open, depth = 0; j < voicesSrc.length; j++) {
    if (voicesSrc[j] === '{') depth++;
    else if (voicesSrc[j] === '}' && --depth === 0) { end = j; break; }
  }
  const body = voicesSrc.slice(open, end);
  const sites = [...body.matchAll(/(?:hitRandom|vary)\(/g)].length;
  // Ten, and each one is accounted for in `layerVariesWithTime`'s comment: the vibrato
  // rate and phase (spread), the sample-and-hold seed and its per-step draws, the
  // legato retarget bend, the note's own gain/pitch/filter humanise, and the unison
  // entry stagger. A new one is not necessarily wrong — it needs a key here.
  assert(sites === 10,
    `_playLayer has ${sites} randomness call sites, not the 10 layerVariesWithTime`
    + ' accounts for. ADDED one? Give it a preset key, teach layerVariesWithTime to'
    + ' refuse a patch that uses it, and run work/local/probe-layer-determinism.js.'
    + ' MOVED one into a helper? The predicate still has to see it — the count lives'
    + ' here because this method is where a note is built, not because ten is magic.'
    + ' Either way, run the probe before changing this number');
  // The humanised ones must name a key the predicate reads. `hitRandom` is called with a
  // TIME rather than a key, so it is the count above that covers those; `vary` carries
  // the amount, and an amount from somewhere the predicate never looks at is precisely
  // the silent drift.
  const known = /^(vibSpread|hum\.(gain|pitch|filter)|\(v\.humanize \|\| \{\}\)\.pitch)/;
  for (const m of body.matchAll(/vary\(([^,]+),/g)) {
    assert(known.test(m[1].trim()),
      `vary(${m[1].trim()}) is humanised from something layerVariesWithTime does not read`);
  }
}

// ---- the native multiband compressor ----------------------------------------
const fx = readFileSync(new URL('../src/engine/effects.js', import.meta.url), 'utf8');
assert(/id: 'mbCompN'/.test(fx) && /id: 'mbComp'/.test(fx),
  'the native multiband compressor is a SECOND entry — the Tone one stays, so the two can be A/B’d');
{
  const params = (id) => fx.match(new RegExp(`id: '${id}'[\\s\\S]*?params: \\[([\\s\\S]*?)\\]`))?.[1]
    .replace(/\s+/g, ' ').trim();
  assert(params('mbComp') === params('mbCompN'),
    'with identical controls in identical order — the same idea spelled one way');
}
assert(/const strip = this\.mixer && this\.mixer\.lane\(key\);/.test(audio)
  && /this\._previewing && !strip/.test(audio)
  && /this\._laneGate\(key, strip \? strip\.dry : this\.musicBus/.test(audio),
  'keyboard previews keep their separate synth timeline but use the selected channel strip');
assert(/setLoopAtBoundary\([\s\S]*?const nextBar[\s\S]*?const boundary = Math\.min\(this\.loopEnd, nextBar\)/.test(audio)
  && /applyPendingLoop\([\s\S]*?this\.pendingLoop\.boundary[\s\S]*?this\.loopStart = this\.pendingLoop\.start[\s\S]*?this\.pendingLoop = null/.test(audio)
  && /this\.applyPendingLoop\(\)[\s\S]*?else if \(this\.loopEnd/.test(audio),
  'a loop-range change is applied by the audio scheduler at the next bar boundary');
assert(/setStepAtBoundary\([\s\S]*?const nextBar[\s\S]*?this\.pendingStep/.test(audio)
  && /applyPendingStep\([\s\S]*?this\.pendingStep\.boundary[\s\S]*?this\.step = this\.pendingStep\.step[\s\S]*?this\.pendingStep = null/.test(audio)
  && /function jumpTo\([\s\S]*?Audio\.setStepAtBoundary\(within\)/.test(entry),
  'a normal playing seek is applied by the audio scheduler at the next bar boundary');
assert(/const isLibraryPreset = \(voice\) =>/.test(editor)
  && /const isUserPreset = \(voice\) =>/.test(editor)
  && /const libraryOwner =/.test(editor)
  && /v\.songOrigin === 'library'/.test(editor)
  && /const songOrigin = params\.songOrigin/.test(voiceSource)
  && /const songSourceId = params\.songSourceId/.test(voiceSource)
  && /draft: true/.test(editor)
  && /if \(draft\) \{\s*delete VOICES\[fromId\]/.test(editor)
  && /librarySource: isNew && !laneKey \? voiceId : null/.test(editor)
  && /if \(isLibraryPreset\(from\) && !isNew/.test(editor)
  && /const canDelete = !state\.laneKey && !state\.librarySource/.test(editor)
  && /isDevUser\(\) && isLibraryPreset\(v\)/.test(editor)
  && /foot\.revertBtn\.disabled = dev \? !state\.dirty : false/.test(editor)
  && /if \(state\.isNew\) \{[\s\S]*?delete VOICES\[state\.id\]/.test(editor)
  && /del\.textContent = 'Delete'/.test(editor)
  && /if \(!isUserPreset\(v\) && !devLibrary\)/.test(editor)
  && /const ok = await ask\(/.test(editor)
  && !/confirm\(state\.isNew/.test(editor)
  && /function blank\(\)/.test(editor)
  && /No preset selected/.test(editor)
  && /if \(libraryWindow\) \{ blank\(\); onChanged\(\); \}/.test(editor)
  && /const nameClash = \(wanted\) =>/.test(editor)
  && /wanted !== state\.id && clash !== state\.voice/.test(editor)
  && /userTableFor\(v\.kind\)/.test(editor)
  && /asNew\.textContent = 'Save as New'/.test(editor)
  && !/Save User Preset/.test(editor)
  && /asNew\.title = isLibrary && canUpdateLibrary/.test(editor)
  && /libraryUpdate/.test(editor)
  && /libraryTableFor/.test(editor)
  && /state\.libraryNew/.test(editor)
  && /requestedLibrary/.test(server)
  && /devLibraryCreate/.test(server)
  && /const devDelete =/.test(server)
  && !/confirm\(`Save preset as/.test(editor)
  && editor.indexOf('if (state.laneKey && assign) assign(state.laneKey, newId);')
    < editor.indexOf('await commit({ keepLane: true });')
  && /state\.voice\?\.songLocal/.test(touchedBody)
  && /VOICES\[state\.id\] = state\.voice;/.test(touchedBody)
  && touchedBody.indexOf('VOICES[state.id] = state.voice;')
    < touchedBody.indexOf('refresh(state.id);')
  && /const songUserSource = !!\(v\.songLocal && v\.songOrigin === 'user'/.test(editor)
  && /const canUpdate = !state\.isNew && \(v\.songLocal/.test(editor)
  && /const songUserUpdate = !state\.isNew && v\.songLocal/.test(editor)
  && /const saveId = songUserUpdate \? v\.songSourceId : state\.id/.test(editor)
  && /const btn = foot\.saveBtn \|\| foot\.updateBtn \|\| foot\.saveNewBtn/.test(editor)
  && /const canSubmit = libraryDraft \|\| state\.isNew \|\| canUpdate/.test(editor)
  && /const userLibraryEditor = !isDevUser\(\) && !state\.laneKey/.test(editor)
  && /const userLibraryCancel = !isDevUser\(\) && !state\.laneKey/.test(editor)
  && /revert\.textContent = userLibraryCancel \? 'Cancel' : 'Revert'/.test(editor)
  && /state\.voice\?\.songLocal\n\s*\? 'Save this song-local copy/.test(editor)
  && /saveNew\.onclick = \(\) => openSaveSheet\('new'\)/.test(editor)
  && /update\.onclick = \(\) => openSaveSheet\('update'\)/.test(editor)
  // `filing &&` is the no-server gate: the deployed desk has nowhere to file a preset,
  // so its footer is Revert alone rather than four buttons that POST into a 404.
  && /if \(filing && userLibraryEditor\) \{[\s\S]*?bar\.append\(saveNew\)[\s\S]*?bar\.append\(update\)/.test(editor)
  && /const filing = canFile\(\)/.test(editor)
  && /async function openSaveSheet\(action = 'choose'\)/.test(editor)
  && /const showAsNew = offerFork/.test(editor)
  && /const showCommit = canSubmit/.test(editor)
  && /const DEV_USER = true/.test(server)
  && /allowLibraryUpdate/.test(entry)
  && shell.includes('window.__MASH_MIXER_DEV_USER__ = /*__MIXER_DEV_USER__*/;')
  && /const _urlDev = new URLSearchParams\(location\.search\)\.get\('dev'\)/.test(entry)
  && /const DEV_USER = _urlDev === '0' \? false : globalThis\.__MASH_MIXER_DEV_USER__ === true/.test(entry)
  // The deployed desk is a USER desk. That substitution used to be written out in
  // build/build.js as well as in the mixer's own builder; the production build now
  // calls the builder rather than repeating it, so the guarantee is checked where it
  // is made — plus the delegation itself, or a copy could quietly come back.
  && /\.replace\('\/\*__MIXER_DEV_USER__\*\/', 'false'\)/.test(mixerBuilder)
  && /buildSongMixer/.test(readFileSync(new URL('../build/build.js', import.meta.url), 'utf8'))
  && /if \(!Object\.values\(USER_TABLES\)\.includes\(sourceTable\) && !\(devDelete && libraryTable\)\)/.test(server),
  'library presets use one hidden editor draft, role-specific save/delete rules, and deletes use the desk dialog');
assert(shell.indexOf('<span id="songrole"') > shell.indexOf('<span id="nowsong"')
  && /const role = \$\('songrole'\)/.test(entry)
  && /role\.textContent = DEV_USER \? 'DEV' : 'USER'/.test(entry),
  'the footer identifies the current mixer role after the song name');
assert(/id="clockmin"/.test(shell)
  && /songRatioMin: Infinity/.test(entry)
  && /health\.songRatioMin = Math\.min\(health\.songRatioMin, ratio\)/.test(entry)
  && /function resetSongClockMinimum\(\)/.test(entry)
  && /track = resolveTrack\(id\);\s*\n\s*resetSongClockMinimum\(\);/.test(entry)
  && /clockMin\.textContent = Number\.isFinite\(health\.songRatioMin\)/.test(entry),
  'the status bar shows the song-load audio-clock minimum and resets it between songs');
assert(/v\.kind === 'engine' \|\| v\.songLocal \|\| v\.draft/.test(
  readFileSync(new URL('../tools/mixer-voice-library.js', import.meta.url), 'utf8'))
  && /!v\.songLocal && !v\.draft/.test(
    readFileSync(new URL('../tools/mixer-voice-library.js', import.meta.url), 'utf8'))
  && /voiceEditor\.librarySource === id/.test(entry)
  && /const scrollTop = el\.querySelector\('\.vlresults'\)\?\.scrollTop/.test(
    readFileSync(new URL('../tools/mixer-voice-library.js', import.meta.url), 'utf8'))
  && /if \(results\) results\.scrollTop = scrollTop/.test(
    readFileSync(new URL('../tools/mixer-voice-library.js', import.meta.url), 'utf8'))
  && /ev\.detail >= 2 && collapsed\.edit/.test(
    readFileSync(new URL('../tools/mixer-voice-library.js', import.meta.url), 'utf8'))
  && /setCollapsed\('edit', false\)/.test(
    readFileSync(new URL('../tools/mixer-voice-library.js', import.meta.url), 'utf8'))
  && /let heard = null/.test(
    readFileSync(new URL('../tools/mixer-voice-library.js', import.meta.url), 'utf8'))
  && /player\.setVoice\(heard\)/.test(
    readFileSync(new URL('../tools/mixer-voice-library.js', import.meta.url), 'utf8'))
  && /const id = editing\?\.\(\) \|\| heard \|\| picked/.test(
    readFileSync(new URL('../tools/mixer-voice-library.js', import.meta.url), 'utf8')),
  'unsaved library drafts stay out of the preset list, repeated source clicks reuse them, and every audition path follows the editable draft');
assert(/const FOLD_KEY = 'mash-mixer-voicelib-folds'/.test(
  readFileSync(new URL('../tools/mixer-voice-library.js', import.meta.url), 'utf8'))
  && /localStorage\.setItem\(FOLD_KEY/.test(
    readFileSync(new URL('../tools/mixer-voice-library.js', import.meta.url), 'utf8'))
  && /if \(!voiceLibrary\.isCollapsed\('edit'\)\)/.test(entry)
  && /voiceEditor\.blank\(\)/.test(entry)
  && /onBlank: \(\) => voiceLibrary\.clearPick\(\)/.test(entry)
  && /\n  ask,/.test(entry),
  'the library restores the editor unless explicitly hidden and keeps a blank editor after deletion');

// Arrangement, Notes, Mixer, Effects. Notes is above the rack because it is driven
// from both sides of that position: the arrangement's double-click opens it and the
// selected strip below scopes it. Effects stays last, hanging off the rack it belongs
// to. Order is asserted here because both resize handlers depend on it — each border
// sizes the panel above it, so moving a panel silently repoints a drag.
const arrangePanel = shell.indexOf('<div id="arrange">');
const notes = shell.indexOf('<div id="notes">');
const mixhead = shell.indexOf('<div id="mixhead">');
const rack = shell.indexOf('<div id="rackwrap">');
const devices = shell.indexOf('<div id="devices"');
assert(arrangePanel >= 0 && notes > arrangePanel && mixhead > notes && rack > mixhead
  && devices > rack
  && !shell.includes('id="arrsplit"') && !shell.includes('id="devsplit"'),
  'the resizable panels meet directly, Notes between Arrangement and Mixer, no splitter bars');
// One rule per boundary. #arrange draws the Arrangement/Notes line and #mixhead draws
// the Notes/Mixer one; a border-top on #notes as well would double the first to 2px.
assert(!/#notes \{[^}]*border-top/s.test(shell)
  && /#mixhead \{[^}]*border-top:\s*1px solid var\(--line\)/s.test(shell)
  && /#arrange \{[^}]*border-bottom:\s*1px solid var\(--line\)/s.test(shell),
  'each panel boundary is drawn by exactly one border');
assert(/#mixhead::before,[\s\S]*?#notes::before \{[^}]*pointer-events:\s*none/s.test(shell)
  && /#mixhead\.edge-resizable::before,[\s\S]*?#notes\.edge-resizable::before \{[^}]*pointer-events:\s*auto[^}]*cursor:\s*ns-resize[^}]*touch-action:\s*none/s.test(shell),
  'panel borders have invisible, touch-safe resize hit areas');
assert(/#timeline::after \{[^}]*pointer-events:\s*none/s.test(shell)
  && /#timeline\.edge-resizable::after \{[^}]*pointer-events:\s*auto[^}]*cursor:\s*ns-resize[^}]*touch-action:\s*none/s.test(shell)
  && /#devices::before \{[^}]*pointer-events:\s*none/s.test(shell)
  && /#devices\.edge-resizable::before \{[^}]*pointer-events:\s*auto[^}]*cursor:\s*ns-resize[^}]*touch-action:\s*none/s.test(shell),
  'Timeline and Effects borders also have transparent, touch-safe resize hit areas');
assert(/#rack,\s*\n\s*:is\(#stepseq, #pianoroll, #kitroll\) \.ssqscroll \{[^}]*position:\s*relative[^}]*z-index:\s*4/s.test(shell)
  && /#devices::before \{[^}]*z-index:\s*3/s.test(shell),
  'horizontal scrollbars stack above the overlapping splitter hit zones');

// The three heights are written together, through one function, or the window stamp
// they are scaled by on the next load describes only whichever one was dragged last.
const rememberHeights = /function rememberDeskHeights\(\)[\s\S]*?\n\}/.exec(entry)?.[0] || '';
assert(entry.includes("const DEV_KEY = 'mash-mixer-devh'")
  && rememberHeights.includes('set(ARR_KEY, userArrH)')
  && rememberHeights.includes('set(DEV_KEY, userDevH)')
  && rememberHeights.includes('set(FX_KEY, userFxH)')
  && rememberHeights.includes('localStorage.removeItem(key)')
  && rememberHeights.includes('localStorage.setItem(DESK_VH_KEY'),
  'panel heights are remembered and resettable, all three at once with the window they were chosen on');
// Absolute pixels, so the same screen gets the same desk back. A shorter window scales
// them down rather than letting a desktop-sized Notes panel eat a laptop screen — and
// only down, and only in memory: the stored numbers still describe the big screen.
assert(/const deskScale = [\s\S]*?Math\.min\(1, innerHeight \/ storedDeskVh\)/.test(entry)
  && /const restoredDeskH = \(value, floor\) =>[\s\S]*?value \* deskScale/.test(entry)
  && entry.includes('let userArrH = restoredDeskH(storedArrH')
  && entry.includes('let userDevH = restoredDeskH(storedDevH')
  && entry.includes('let userFxH = restoredDeskH(storedFxH'),
  'remembered heights come back at their own size, scaled down only when the window is shorter than the one they were set on');
// Which panels you left shut is desk furniture, not song data: it is global, and it is
// applied at load. Notes is the exception — it belongs to the song, and restoreSongLayout
// carries it. Written only when the fold actually changes, because the border drags call
// these setters on every pointermove.
assert(/const LOWER_VIEW_KEY = 'mash-mixer-lower-view'/.test(entry)
  && /const LOWER_VIEWS = new Set\(\['mixer', 'roll', 'pattern'\]\)/.test(entry)
  && /setLowerView\(lowerView, \{ remember: false \}\)/.test(entry)
  && /#tlfold, #arrfold, #notefold, #mixfold \{ display: none !important; \}/.test(shell),
  'the desk remembers one lower-workspace view and exposes no panel-collapse controls');
assert(/#devices \{[^}]*position:\s*fixed[^}]*inset:\s*0 0 0 auto[^}]*width:\s*min\(400px,[^}]*height:\s*auto !important[^}]*resize:\s*none/s.test(shell)
  && /#devices \{[^}]*border-right:\s*0[^}]*border-radius:\s*8px 0 0 8px[^}]*box-shadow:\s*-18px 0/s.test(shell)
  && !entry.includes("win.style.transform = 'none'")
  && !entry.includes('event.clientX - dx'),
  'Effects is a fixed full-height inspector flush with the right edge, not a draggable floating dialog');
assert(/#devices #devrack \{[^}]*overflow-x:\s*hidden[^}]*overflow-y:\s*auto[^}]*flex-direction:\s*column[^}]*align-items:\s*stretch/s.test(shell)
  && /#devices \.device \{[^}]*width:\s*100%[^}]*align-self:\s*stretch/s.test(shell)
  && /#devices \.devgrid \{[^}]*grid-auto-flow:\s*row[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s.test(shell)
  && /@media \(max-width:\s*620px\)[\s\S]*?#devices \.devgrid \{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/.test(shell),
  'the effect chain stacks vertically and each plugin reflows to two compact columns, then one on narrow windows');
assert(/#fxpicker\.show \{[^}]*display:\s*grid[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s.test(shell)
  && /const inInspector = !!anchor\?\.closest\?\.\('#devices'\)[\s\S]*?getBoundingClientRect\(\)\.left - r\.width - 6/.test(entry),
  'the compact effect catalogue opens to the left of the inspector rather than covering its chain');
for (const [fn, key] of []) {
  const body = new RegExp(`function ${fn}\\([\\s\\S]*?\\n\\}`).exec(entry)?.[0] || '';
  // Either shape of the same gate: `if (changed) setItem(...)`, or an early
  // `if (!changed) return;` with the write below it.
  const guarded = new RegExp(`if \\(changed\\) localStorage\\.setItem\\(${key}`).test(body)
    || new RegExp(`if \\(!changed\\) return;[\\s\\S]*?localStorage\\.setItem\\(${key}`).test(body);
  assert(/const changed = /.test(body) && guarded,
    `${fn} writes its fold only when the fold moved, not on every frame of a drag`);
}
assert(entry.includes("const edge = $('mixhead')")
  && entry.includes("const edge = $('notes')")
  && entry.includes("const edge = $('devices')")
  && !entry.includes("const edge = $('timeline')")
  && (entry.match(/edge\.addEventListener\('pointerdown'/g) || []).length >= 3
  && (entry.match(/edge\.addEventListener\('pointermove'/g) || []).length >= 3
  && (entry.match(/edge\.addEventListener\('dblclick'/g) || []).length >= 2,
  'the three legacy adjustable panel borders retain drag/reset gestures while the one-row Timeline has none');
// Bounded to the function's own body. `[\s\S]*?` is lazy but unbounded, so a regex
// anchored on `function notesRoom(` happily reaches unrelated layout code below and
// passes however notesRoom is written.
const notesRoomBody = /function notesRoom\([\s\S]*?\n\}/.exec(entry)?.[0] || '';
assert(notesRoomBody.includes("h($('mixhead'))")
  && !notesRoomBody.includes("h($('arrsplit'))")
  && !notesRoomBody.includes("h($('devsplit'))"),
  'layout calculations leave no height for standalone splitter bars');
assert(entry.includes('function syncPanelResizeEdges()')
  && /\$\('mixhead'\)\.classList\.add\('edge-resizable'\)/.test(entry)
  && /\$\('notes'\)\.classList\.add\('edge-resizable'\)/.test(entry)
  && /\$\('timeline'\)\.classList\.add\('edge-resizable'\)/.test(entry)
  && /\$\('devices'\)\.classList\.add\('edge-resizable'\)/.test(entry)
  && /function setDevicesFolded[\s\S]*?syncPanelResizeEdges\(\)/.test(entry)
  && /function setMixerFolded[\s\S]*?syncPanelResizeEdges\(\)/.test(entry)
  && /function setArrangeCollapsed[\s\S]*?syncPanelResizeEdges\(\)/.test(entry),
  'resize hit areas follow the adjacent panels’ fold state');
assert(/const splitter = \$\('worksplitter'\)/.test(entry)
  && /splitter\.addEventListener\('pointerdown'/.test(entry)
  && /splitter\.addEventListener\('pointermove'/.test(entry)
  && /--upper-work-height/.test(entry)
  && /function setResizeDeferred\(on\)[\s\S]*?resizeDirty/.test(barGrid),
  'one upper/lower splitter resizes the permanent workspaces and the roll defers rebuilds while moving');
assert(/function fitStrips\(\)[\s\S]*?scheduleMarkClipped\(\)/.test(entry)
  && /function scheduleMarkClipped\(\)[\s\S]*?requestIdleCallback/.test(entry),
  'nonessential clipping reads are deferred out of the panel-fold task');
assert(/function notesOpenInLayout\([\s\S]*?layout\.notes[\s\S]*?layout\.view/.test(entry)
  && /const hasSongLayout = !!songLayouts\[id\];[\s\S]*?notesOpenInLayout\(songLayouts\[id\]\) === false[\s\S]*?setNotesFolded\(true, false\)/.test(entry),
  'a remembered folded Notes panel stays lazy during the song load');
assert(/function showStepSeq\(on\)[\s\S]*?scheduleStepSeqOpen\(\)/.test(entry)
  && /function scheduleStepSeqOpen\(\)[\s\S]*?requestIdleCallback/.test(entry)
  && /function scheduleStepSeqOpen\(\)[\s\S]*?stepSeq\.open\(true\)/.test(entry),
  'the first step-grid open is deferred out of the playback click task');
// Notes is now sized from the border BELOW it, so every sign in its handler is the
// mirror of the old one: a downward drag grows it and opens it when folded, and it is
// an UPWARD drag that hands room back to the Mixer underneath. Pinned because getting
// a sign wrong here inverts a gesture without breaking anything that throws.
const notesDrag = /const edge = \$\('mixhead'\)[\s\S]*?\n\}\)\(\);/.exec(entry)?.[0] || '';
assert(notesDrag.includes("const panel = $('notes')")
  && /startH = h\(panel\)/.test(notesDrag)
  && /startCollapsed && dy > 0\s*\?\s*MIN\.notes\(\) \+ dy\s*:\s*startH \+ dy/.test(notesDrag)
  && /asked <= MIN\.notes\(\)[\s\S]*?setNotesFolded\(true, false\)[\s\S]*?userDevH = null/.test(notesDrag)
  && /asked <= MIN\.notes\(\)[\s\S]*?setNotesFolded\(false, false\)[\s\S]*?userDevH = clampDeviceH\(asked\)/.test(notesDrag)
  && /startCollapsed && dy > 0[\s\S]*?setNotesFolded\(false, false\)[\s\S]*?userDevH = clampDeviceH\(asked\)/.test(notesDrag)
  && /mixerCollapsed && dy < 0[\s\S]*?setMixerFolded\(false, false\)/.test(notesDrag)
  && !/mixerCollapsed && dy > 0/.test(notesDrag),
  'the Notes/Mixer border grows Notes downward and reopens the Mixer on an upward drag');
// The Arrangement keeps its original sense — its border moved from the Mixer's top
// edge to the Notes panel's, but it is the same physical boundary, so a downward drag
// still grows it. What changed is which panel it reopens on the way up.
const arrDrag = /const edge = \$\('notes'\)[\s\S]*?\n\}\)\(\);/.exec(entry)?.[0] || '';
assert(/startH = h\(\$\('arrange'\)\)/.test(arrDrag)
  && /const asked = startH \+ dy/.test(arrDrag)
  && /lanesIn\(asked\) < 1[\s\S]*?setArrangeCollapsed\(true\)[\s\S]*?userArrH = null/.test(arrDrag)
  && /notesCollapsed && dy < 0[\s\S]*?setNotesFolded\(false, false\)/.test(arrDrag),
  'the Arrangement/Notes border sizes the Arrangement and reopens Notes when it folds');
// Taking lanes away must not take away the one being worked on. The scroller keeps its
// scrollTop as the panel shrinks, so without this the lanes that fall out of sight are
// the ones nearest the hand — including, as often as not, the selected one. It has to
// run inside the fit: applyDesk writes the height a frame after the drag asks for it.
assert(/keepLanePending = true;\s*\n\s*scheduleDeskFit\(\);/.test(arrDrag)
  && /keepLanePending = true;\s*\n\s*scheduleDeskFit\(true\);/.test(arrDrag)
  && /function fitStrips\(\)[\s\S]*?applyDesk\(planDesk\(\)\)[\s\S]*?if \(keepLanePending\) \{[\s\S]*?keepLanePending = false;[\s\S]*?keepSelectedLaneVisible\(\);/.test(entry),
  'resizing the Arrangement scrolls the selected lane back into view after the fit');
// Index arithmetic, not a rect: .arrrow measures from #arrange, so a rect would carry
// the header with it. Nothing but rows goes into the scroller, which is what makes the
// index reliable — see buildArrangement.
assert(/function keepSelectedLaneVisible\(\)[\s\S]*?classList\.contains\('collapsed'\)\) return;/.test(entry)
  && /findIndex\(\(el\) => el\.classList\.contains\('sel'\)\)[\s\S]*?if \(index < 0\) return;/.test(entry)
  && /const top = index \* \(row \+ laneRowGap\(\)\);/.test(entry)
  && /if \(bottom > grid\.scrollTop \+ view\) grid\.scrollTop = Math\.min\(bottom - view, top\);/.test(entry)
  && /else if \(top < grid\.scrollTop\) grid\.scrollTop = top;/.test(entry),
  'the lane is found by index off the same row height and gap the snap uses, and a '
  + 'window too short for a whole row shows the lane\'s top rather than its feet');
assert(/function syncArrangementLaneSelection[\s\S]*?const selected = el\.dataset\.lane === selectedLane;[\s\S]*?classList\.toggle\('sel', selected\)[\s\S]*?if \(reveal\) keepSelectedLaneVisible\(\)/.test(entry)
  && /function selectLane\(key\)[\s\S]*?syncArrangementLaneSelection\(\{ reveal: true \}\)/.test(entry)
  && /function loadTrack\(id\)[\s\S]*?buildArrangement\(\);[\s\S]{0,300}?syncArrangementLaneSelection\(\{ reveal: true \}\)/.test(entry)
  && /function buildArrangement\(\)[\s\S]*?syncArrangementLaneSelection\(\);\s*\n\s*redrawSelection\(\)/.test(entry),
  'channel selection and song load reveal the selected track while rebuilds preserve its mark');
assert(/function selectLane\(key\)[\s\S]*?classList\.toggle\('selected', selected\)[\s\S]*?dataset\.lowerView === 'mixer'[\s\S]*?rack\.scrollLeft/.test(entry),
  'selecting an arrangement track highlights and reveals its channel whenever the Mixer is visible');
assert(entry.includes("const FX_KEY = 'mash-mixer-fxh'")
  && /let userFxH =/.test(entry)
  && /effectsNaturalHeight[\s\S]*?userFxH != null/.test(entry)
  && /function fitDevices\([\s\S]*?if \(userFxH != null\) return/.test(entry)
  && /const byHand = [\s\S]*?userFxH != null/.test(entry),
  'Effects remembers a dragged height and keeps automatic fitting from overwriting it');
assert(/const edge = \$\('devices'\)[\s\S]*?startCollapsed && dy < 0[\s\S]*?setDevicesFolded\(false, false\)[\s\S]*?userFxH = clampEffectsH/.test(entry)
  && /const edge = \$\('devices'\)[\s\S]*?asked <= MIN\.devices\(\)[\s\S]*?setDevicesFolded\(true, false\)[\s\S]*?userFxH = null/.test(entry),
  'dragging upward on folded Effects opens and grows it, while dragging to its floor folds it');
assert(!shell.includes('id="blocks"')
  && !/#timeline\.sections|#blocks \.blk/.test(shell)
  && !/SECTIONS_KEY|function setSectionsShown/.test(entry)
  && /#timeline \{[^}]*height:\s*30px/s.test(shell),
  'Timeline is one ruler row with no coloured section strip or reclaimable blank band');

// ---- the desk column: a pinned footer and one elastic region ---------------------
// The footer used to travel. #rackwrap was the only flex:1 child of the page column
// and folding the mixer is display:none, so with nothing elastic left the column
// stacked from the top and the footer floated into the middle of the screen. The fix
// is structural: the four resizable regions live in #desk, the footer is outside it,
// and which region is elastic is a class the desk sets on every fit.
const deskAt = shell.indexOf('<main id="desk"');
const deskEnd = shell.indexOf('</main>');
const footerAt = shell.indexOf('<footer>');
assert(deskAt > 0 && deskEnd > deskAt && footerAt > deskEnd,
  'the resizable regions are inside #desk and the footer is structurally after it');
assert(shell.indexOf('<section id="upperwork"') > deskAt
  && shell.indexOf('<div id="timeline"') > shell.indexOf('<section id="upperwork"')
  && shell.indexOf('<div id="arrange">') > shell.indexOf('<div id="timeline"')
  && shell.indexOf('<div id="worksplitter"') > shell.indexOf('<div id="arrange">')
  && shell.indexOf('<section id="lowerwork"') > shell.indexOf('<div id="worksplitter"')
  && shell.indexOf('<div id="rackwrap">') < deskEnd,
  'timeline and arrangement share the upper workspace above one resizable lower workspace');
assert(/#desk \{[^}]*flex: 1 1 auto[^}]*min-height: 0[^}]*flex-direction: column[^}]*overflow: hidden/s.test(shell),
  '#desk takes the window, can be squeezed below its content, and clips itself first');
assert(/#lowerwork \{[^}]*flex:\s*1 1 auto[^}]*min-height:\s*132px/s.test(shell)
  && /#mixerview, #lowerwork #notes \{[^}]*flex:\s*1 1 auto/s.test(shell),
  'the selected lower view is the elastic region beneath the fixed upper ratio');
assert(shell.includes('#deskslack { display: none; }')
  && /#deskslack\.greedy \{[^}]*background: var\(--panel\)/s.test(shell),
  'the empty band is desk-coloured and exists only while it is the elastic one');
assert(/function fitStrips\(\)[\s\S]*?if \(\$\('upperwork'\) && \$\('lowerwork'\)\)[\s\S]*?dataset\.lowerView === 'mixer'[\s\S]*?sizeStrips/.test(entry)
  && /function setLowerView\(next[\s\S]*?\$\('desk'\)\.dataset\.lowerView = view/.test(entry),
  'every fit reapplies the selected lower workspace before fitting its mixer or editor');
const lowerViewSetter = entry.slice(entry.indexOf('function setLowerView(next'),
  entry.indexOf("$('mixviewbtn').onclick", entry.indexOf('function setLowerView(next')));
assert(/function laneForLowerView\(view\) \{\s*\n\s*if \(!track/.test(entry)
  && /if \(track\) \{[\s\S]*?syncNotesPanel\(\)/.test(lowerViewSetter)
  && lowerViewSetter.indexOf('if (track)') < lowerViewSetter.indexOf('syncNotesPanel()'),
  'the shell may restore its lower view before the asynchronous first song exists');
assert(/function laneForLowerView\(view\)[\s\S]*?const wanted = view === 'pattern' \? 'kit' : 'roll';[\s\S]*?lane\.key === selectedLane[\s\S]*?editorFor\(lane\.key\) === wanted[\s\S]*?lanes\.find\(\(lane\) => editorFor\(lane\.key\) === wanted\)/.test(entry)
  && /const viewLane = laneForLowerView\(view\);[\s\S]*?\$\('desk'\)\.dataset\.lowerView = view;[\s\S]*?if \(viewLane && viewLane !== selectedLane\) selectLane\(viewLane\);[\s\S]*?syncArrangementLaneSelection\(\{ reveal: true \}\);[\s\S]*?keepLanePending = true;/.test(lowerViewSetter),
  'Piano Roll selects a real pitched track, Pattern selects a drum track, and either '
  + 'workspace switch reveals that track in the arrangement before and after fitting');
// The arrangement is snapped to whole lanes, so it can never be the flex:1 one — and
// what it cannot use has to pass DOWN the chain rather than stopping at the band. It
// used to stop there, which boxed the piano roll into its own content height with a
// slab of dead desk under it whenever the mixer was folded.
assert(/DESK_CHAIN\s*\.filter\(\(id\) => id !== 'arrange'\)\s*\.find\(/.test(entry),
  'the arrangement takes lanes, not slack, and passes the rest to the effects panel');
assert(/#desk\.cramped \{[^}]*overflow-y: auto/s.test(shell)
  && /classList\.toggle\('cramped', cramped\)/.test(entry),
  'a window too short for every minimum scrolls the desk — the footer is never clipped');
assert(/footer \{[^}]*margin-top: auto/s.test(shell)
  && /#err \{[^}]*max-height: 30vh[^}]*overflow: auto/s.test(shell),
  'the footer cannot float even if the chain fails, and a stack trace cannot eat the desk');
assert(!/id="(?:pos|section)"/.test(shell)
  && !/\$\('(?:pos|section)'\)/.test(entry)
  && /id="peakinfo"/.test(shell)
  && /\$\('peakinfo'\)\.textContent/.test(entry),
  'the footer keeps the master peak but omits live beat and selection readouts');

// ---- one minimum table, not six constants in five functions ----------------------
const minBody = /const MIN = \{[\s\S]*?\n\};/.exec(entry)?.[0] || '';
const wantBody = /const WANT = \{[\s\S]*?\n\};/.exec(entry)?.[0] || '';
assert(['timeline', 'arrange', 'mixer', 'notes', 'devices']
  .every((k) => new RegExp(`^\\s*${k}:`, 'm').test(minBody))
  && ['arrange', 'notes'].every((k) => new RegExp(`^\\s*${k}:`, 'm').test(wantBody))
  && !entry.includes('Math.max(140,')
  && !entry.includes('function arrangementFloor')
  && !entry.includes('function capDevices'),
  'every per-panel minimum lives in one table; the 140px floor and the eight-lane "floor" are gone');
assert(entry.includes('const deskPool = () => innerHeight')
  && !entry.includes('const pageChrome')
  && !/const deskPool[\s\S]{0,300}?\$\('devices'\)/.test(entry),
  'the pool is the window less the four things outside the desk — the effects panel is not chrome');

// ---- a handle moves only the panels it borders -----------------------------------
// deviceRoom() used to subtract a hypothetical one-lane arrangement while fitStrips
// measured the ceiling against the effects panel's live height. Two different worlds,
// and the reason dragging the effects handle shrank the arrangement instead.
assert(/function rackFloor\(\) \{ return bareChrome\(\) \+ FADER_FLOOR \+ rackPad\(\); \}/.test(entry)
  && notesRoomBody.includes('MIN.mixer()')
  && !notesRoomBody.includes('FADER_MIN')
  && !notesRoomBody.includes('laneRowHeight()'),
  'the notes handle clamps against the rack floor alone and cannot reach the arrangement');
// And it cannot reach it by construction, not just by not mentioning it: the arrangement
// height arrives as an ARGUMENT, so the handle trades rack for notes and the arrangement
// stays exactly where it is.
assert(/function notesRoom\(arrH = plannedArrangeHeight\(\)\)/.test(entry)
  && /const clampDeviceH = \(value, max = notesRoom\(\)\) => clamp\(value, MIN\.notes\(\), max\);/.test(entry),
  'the notes height is clamped between its own minimum and that room, nothing else');
assert(/function planDesk[\s\S]*?let rackH = room - arrH - notesH/.test(entry),
  'the arrangement and the notes panel are sized independently and the rack takes the difference');
// The effects panel is not in the elastic chain — it takes its natural height or a
// remembered manual height, and the Mixer yields room for either one.
assert(/function planDesk[\s\S]*?const fxH = effectsNaturalHeight\(\);/.test(entry)
  && /effectsNaturalHeight[\s\S]*?userFxH/.test(entry)
  && /const byHand = [\s\S]*?userFxH != null/.test(entry)
  && !/const DESK_CHAIN = \[[^\]]*'devices'/.test(entry),
  'Effects has a natural or dragged height outside the elastic chain, with Mixer give-up space');

// ---- the shrink ladder ------------------------------------------------------------
// A short window sheds whole BLOCKS, in one fixed order, and says on the header switch
// that it has. It never scrolls a strip body: the old floor reserved a whole
// uncompressed strip precisely because .stripbody scrolls with no scrollbar, so a row
// that went out of sight went without saying so.
assert(entry.includes("const SHED_ORDER = ['effects', 'sends', 'eq']")
  && /const shedClass = \(id\) => STRIP_PARTS\.find\(\(p\) => p\.id === id\)\.cls\.replace\('no-', 'shed-'\)/.test(entry),
  'the ladder sheds inserts, then sends, then EQ — named once, in the switches own ids');
assert(/#rackwrap\.no-eq \.eqrow,\s*#rackwrap\.shed-eq \.eqrow,\s*#rackwrap\.no-sends \.sendrow,\s*#rackwrap\.shed-sends \.sendrow,\s*#rackwrap\.no-fx \.fxbtns,\s*#rackwrap\.shed-fx \.fxbtns \{ display: none; \}/.test(shell),
  'shed-* hides exactly what no-* hides, as a separate set of classes');
// No strip collapses its body on its own any more. A channel body that vanished while
// a send return still carried its device summary put those two faders on different
// lines, which is the one thing --bodyh exists to prevent: the band is the same band on
// every strip, and when every body is empty it measures ~0 and costs nothing.
assert(!/\.stripbody \{ display: none; \}/.test(shell),
  'no strip hides its body while another strip still has one — that is what put the faders off line');
assert(!/#rackwrap\.(squeezed|compact)|\.stripsum/.test(shell)
  && !/compactStripHeight|summaryChip|paintSummary|openFullStrips|classList\.(add|toggle)\('(compact|squeezed)'/.test(entry),
  'nothing scrolls and no summary chip: a shed block is hidden outright, not squeezed');
assert(/classList\.toggle\(shedClass\(id\), gone\.includes\(id\)\)/.test(entry)
  && !/\.strip\.shed-/.test(shell),
  'the rung is a state of the whole rack, so every fader in it stays on one line');
// The affordance the whole ladder rests on: it may hide a block because it says so.
assert(entry.includes('function markShedParts(gone)')
  && /b\.classList\.toggle\('shed', shed\)/.test(entry)
  && /#partfilter button\.shed \.lbl \{ text-decoration: line-through; \}/.test(shell)
  && /b\.dataset\.part = p\.id/.test(entry),
  'a block the desk hid is struck through on its own switch, distinct from one you turned off');
// Two fader numbers, not one. With only the comfortable minimum to bargain with, the
// ladder shed two blocks to save five pixels and handed the freed height to the fader.
assert(entry.includes('const FADER_MIN = 48')
  && entry.includes('const FADER_FLOOR = 34')
  && /while \(shed < SHED_ORDER\.length && strips < stripChromeAt\(shed\) \+ FADER_FLOOR\) shed\+\+/.test(entry)
  && /const fader = Math\.max\(FADER_FLOOR, strips - chrome\)/.test(entry)
  // The applied floor and the one the shed loop bargains with have to be the SAME
  // number, or a strip is handed more content than height and its body scrolls.
  && /rackWant = [\s\S]{0,400}?chrome \+ FADER_MIN \+ rackPad\(\)/.test(entry),
  'the fader compresses past its comfortable minimum to keep one more block on screen');
// Every number the ladder is steered by is measured at a NAMED rung rather than at
// whichever one the rack is standing on, or the fit becomes a function of its own last
// answer — a latch, where a short window once meant a short window forever.
const atShedFn = /function atShed\(n, fn\)[^]*?\n\}/.exec(entry)?.[0] || '';
assert(atShedFn.includes('wrap.classList.remove(...SHED_ORDER.map(shedClass))')
  && atShedFn.includes("wrap.classList.add(...SHED_ORDER.slice(0, n).map(shedClass), 'measuring')")
  && atShedFn.includes("wrap.style.setProperty('--faderh'")
  && atShedFn.includes('finally'),
  'measurements name the rung they want and always put the real one back');
assert(/function measureRungAt\(n\) \{\s*return atShed\(n,/.test(entry)
  && /chromeRungs = SHED_ORDER\.map\(\(_, i\) => measureRungAt\(i\)\)/.test(entry)
  && /const stripChromeAt = \(n\) => stripRungAt\(n\)\.chrome;/.test(entry)
  && /function rackFloor\(\) \{ return bareChrome\(\) \+ FADER_FLOOR \+ rackPad\(\); \}/.test(entry)
  && shell.includes('#rackwrap.measuring .voicepair { height: auto; }'),
  'one chrome height per rung, measured off the ladder, and the floor is the last of them');
// ---- one line for every fader ------------------------------------------------------
// The foot is bottom-anchored, so pan, mute/solo and the limiter always landed
// together; the fader between them is the strip's shock absorber, so a master with an
// empty body was handed the height the channels' send rows had already spent and its
// fader stood taller than theirs. --bodyh is the tallest body in the rack, held on
// every strip: same top, same length, same bottom.
assert(/\.strip \.stripbody \{[^}]*height:\s*var\(--bodyh, auto\)/s.test(shell)
  && /root\.setProperty\('--bodyh', `\$\{stripRungAt\(shed\)\.body\}px`\)/.test(entry)
  && /body = Math\.max\(body, naturalHeight\(b\)\)/.test(entry)
  && /return \{ body: Math\.ceil\(body\), chrome: Math\.ceil\(body \+ rest\) \+ 2 \}/.test(entry),
  'every strip reserves the tallest body in the rack, so every fader starts on one line');
// A body held at the last rung's height would report that height back and --bodyh would
// only ever climb — the same latch --faderh is pinned to avoid.
assert(shell.includes('#rackwrap.measuring .stripbody { height: auto; }'),
  'the body is measured free of the height the last fit gave it');
// The head is the other half of where a fader starts. A strip carries one caption or
// the other — the preset's category, or BUS/SEND — and with different line boxes the
// two kinds of head stood a pixel and a bit apart.
assert(/\.strip \.stripsub \{[^}]*line-height:\s*1;[^}]*margin:\s*3px 0 3px/s.test(shell)
  && /\.strip \.grp-tag \{[^}]*line-height:\s*1;[^}]*margin:\s*3px 0 3px/s.test(shell),
  'the group tag and the preset category are the same box, so every strip head is one height');
assert(entry.includes('return { chrome: [230, 190, 150, 110][n], body: 0 };')
  && !entry.includes('return [260, 220, 180, 140][n]')
  && !entry.includes('body.append(voiceRow(key))'),
  'the pre-build strip sizing estimate matches the selector-free channel layout');
// A block hidden by hand has no height left for the ladder to save by hiding it again.
assert(/function applyStripParts\(\)[\s\S]*?forgetStripMetrics\(\)/.test(entry)
  && /function buildRack\(\)[\s\S]*?forgetStripMetrics\(\)/.test(entry),
  'the cached rungs are dropped when a part switch or a rack rebuild moves them')

const arrangeHead = shell.indexOf('<div id="arrhead">');
const addTrack = shell.indexOf('id="addtrackbtn"');
assert(arrangeHead >= 0 && addTrack > arrangeHead
  && shell.slice(arrangeHead, addTrack).includes('Arrangement'),
  'the Add Track plus lives in the Arrangement header');
assert(/--arrrow-compact:\s*26px/.test(shell)
  && /--arrrow-main:\s*24px/.test(shell)
  && /--arrgap:\s*4px/.test(shell)
  && /--arrrow:\s*48px/.test(shell)
  && /--arrgrid-pad:\s*8px/.test(shell)
  && /#arrange\.compact\s*\{[^}]*--arrrow:\s*var\(--arrrow-compact\); --arrrow-main:\s*var\(--arrrow-compact\)/s.test(shell)
  && /#arrange\.compact \.arrtrack-bottom\s*\{\s*display:\s*none;/.test(shell),
  'arrangement rows use the compact height without losing the named compact mode');
// The control line keeps the row's landing under it: at 44px with no padding the mute
// and solo buttons ended flush on the row's bottom edge.
assert(/\.arrtrack-bottom \{[^}]*padding-bottom:\s*6px/s.test(shell)
  && /\.arrpresetcat \{[^}]*top:\s*-1px/s.test(shell),
  'the control line lands above the row edge and the preset category is optically centred');
assert(/\.arrrow\.sel \{[^}]*z-index:\s*4/s.test(shell)
  && /\.arrrow\.sel::after \{[^}]*z-index:\s*8[^}]*pointer-events:\s*none[^}]*border:/s.test(shell)
  && /\.arrrow\.sel \.arrname \{[^}]*font-weight:\s*500/s.test(shell)
  && /\.strip\.selected h3 \{[^}]*font-weight:\s*600/s.test(shell),
  'selected track labels use semibold rather than extra-bold width');
assert(/\.arrrow \{[^}]*flex-direction:\s*column[^}]*height:\s*var\(--arrrow\)[^}]*min-height:\s*var\(--arrrow\)/s.test(shell)
  && /\.arrrow-main \{[^}]*flex:\s*0 0 var\(--arrrow\)/s.test(shell)
  && /--arrhead-gap:\s*8px/.test(shell)
  && /--arrnum:\s*18px/.test(shell)
  && /\.arrhead-cell \{[^}]*width:\s*calc\(var\(--arrname\) \+ var\(--gut\) \+ 4px - var\(--foldx\)\)[^}]*display:\s*grid[^}]*grid-template-columns:\s*var\(--arrnum\) 17px var\(--arrhead-gap\) minmax\(0, 1fr\)[^}]*padding-left:\s*4px; padding-right:\s*var\(--arrhead-gap\)/s.test(shell)
  && /\.arrtrack-icon \{[^}]*grid-column:\s*2[^}]*grid-row:\s*1 \/ span 2/s.test(shell)
  && /\.arrtrack-top, \.arrtrack-bottom \{[^}]*grid-column:\s*4/s.test(shell)
  && /\.arrtrack-top \{[^}]*grid-row:\s*1/s.test(shell)
  && /\.arrtrack-bottom \{[^}]*grid-row:\s*2/s.test(shell)
  && /#arrange \{[^}]*max-height:\s*calc\(var\(--arrhead-h\)\s*\+ var\(--arrrow\) \* var\(--arrmax-lanes\)\s*\+ var\(--arrgap\) \* \(var\(--arrmax-lanes\) - 1\)\s*\+ var\(--arrgrid-pad\) \+ 1px\)/s.test(shell)
  && /#arrgrid \{[^}]*padding:\s*0 0 0 calc\(var\(--foldx\) - 4px\)[^}]*row-gap:\s*var\(--arrgap\)/s.test(shell)
  && /const preset = presetForLane\(row\.key\)[\s\S]*?const displayLabel = customTrackLabel\(row\.key\) \|\| preset\?\.label \|\| row\.label[\s\S]*?preset\?\.category/.test(entry)
  && /const top = document\.createElement\('div'\)[\s\S]*?top\.className = 'arrtrack-top'[\s\S]*?category\.className = 'arrpresetcat'[\s\S]*?const bottom = document\.createElement\('div'\)[\s\S]*?bottom\.className = 'arrtrack-bottom'[\s\S]*?top\.append\(name\)[\s\S]*?if \(frozen\) top\.append\(freezeMark\('arrfreeze', '❄'\)\)[\s\S]*?top\.append\(category\)[\s\S]*?bottom\.append\(btns\)[\s\S]*?header\.append\(num, icon, top, bottom\)[\s\S]*?bottom\.append\(gainWrap\)[\s\S]*?main\.append\(header, bars\)[\s\S]*?el\.append\(main\)/.test(entry),
  'arrangement track headers use Logic-style identity and control rows');
assert(/const laneRowGap = \(\) => px\(\$\('arrgrid'\), 'rowGap'\);/.test(entry)
  && /const laneStackHeight = \(count\) => count \* laneRowHeight\(\)[\s\S]*?Math\.max\(0, count - 1\) \* laneRowGap\(\)/.test(entry)
  && /const laneLanding = \(\) => px\(\$\('arrange'\), 'paddingBottom'\);/.test(entry)
  && /const arrangeChrome = \(\) => h\(\$\('arrhead'\)\) \+ laneLanding\(\)[\s\S]*?borderBottomWidth/.test(entry)
  && /const lanesIn = \(px, round = Math\.round\) => \{[\s\S]*?const body = px - arrangeChrome\(\)[\s\S]*?return round\(\(body \+ gap\) \/ \(row \+ gap\) \+ 1e-6\)/.test(entry)
  && /const arrangeSnap = \(px, round = Math\.round\) => arrangeChrome\(\)[\s\S]*?laneStackHeight\(/.test(entry)
  && /arrangeChrome\(\) \+ laneStackHeight\(ARR_AUTO_LANES\(\)\)/.test(entry)
  && /const lane = laneRowHeight\(\) \+ laneRowGap\(\)/.test(entry),
  'arrangement resizing snaps to the rendered row stack, including its inter-row gap')
// The landing under the last row is the panel's padding, not the scroller's. Inside
// #arrgrid it was scroll content, so a mid-scroll arrangement spent it on the gap and
// the top sliver of the next lane — the panel showed part of a row it had not sized
// for. Everything the snap depends on is measured or written off the shell variables,
// so a future change to --arrrow moves the cap, the fit and the landing together.
assert(/#arrange \{[^}]*padding-bottom:\s*var\(--arrgrid-pad\)/s.test(shell)
  && /#arrange\.collapsed \{ padding-bottom: 0; \}/.test(shell)
  && !/#arrgrid \{[^}]*padding:[^;]*var\(--arrgrid-pad\)/s.test(shell)
  && /--arrhead-h:\s*calc\(var\(--ctlh\) \+ var\(--arrhead-pad\) \* 2\)/.test(shell)
  && /--arrmax-lanes:\s*8/.test(shell)
  && /#arrhead \{[^}]*padding:\s*var\(--arrhead-pad\) var\(--rgut\) var\(--arrhead-pad\) var\(--foldx\)/s.test(shell)
  && /const ARR_AUTO_LANES = \(\) => \{[\s\S]*?getPropertyValue\('--arrmax-lanes'\)[\s\S]*?Number\.isFinite\(n\) && n >= 1 \? n : 8/.test(entry)
  && /return arrangeChrome\(\) \+ \$\('arrgrid'\)\.scrollHeight;/.test(entry),
  'the arrangement landing is fixed panel chrome, so every scroll position shows whole lanes')
// The track separator. A pseudo-element in the gap, not a border: a border would add
// height and put the panel back off its lane boundaries. `+` so it never draws above
// the first row or below the last, and ink-mixed so the one rule serves the light
// themes as well as the dark ones.
assert(/\.arrrow \+ \.arrrow::before \{[^}]*position:\s*absolute[^}]*height:\s*1px[^}]*top:\s*calc\(var\(--arrgap\) \/ -2 - 0\.5px\)[^}]*background:\s*color-mix\(in srgb, var\(--ink\) 6%, transparent\)/s.test(shell)
  && !/\.arrrow \{[^}]*border-top/s.test(shell),
  'tracks are divided by a hairline in the row gap that costs no height');
assert(/#arrhead \{[^}]*position:\s*relative/s.test(shell)
  && /#arrhead #addtrackbtn \{[^}]*left:\s*calc\(var\(--arrname\) \+ var\(--gut\) \+ var\(--namegap\) - 24px\)[^}]*transform:\s*translateY\(-50%\)/s.test(shell)
  && /#addtrackbtn \{[^}]*color:\s*var\(--ctl-hi\)[^}]*font:\s*400 19px\/1/s.test(shell),
  'Add Track is right-aligned immediately before the arrangement bars');
assert(/#addtrackbtn \{[^}]*color:\s*var\(--ctl-hi\)[^}]*font:\s*400 19px\/1/s.test(shell)
  && !shell.slice(0, addTrack).includes('class="addtrackicon"'),
  'Add Track is a light theme-coloured plus rather than a heavy icon button');
assert(/\.arrrow \.arrgain \{[^}]*width:\s*96px[^}]*height:\s*16px[^}]*display:\s*block/s.test(shell)
  && /\.arrrow \.arrgain::-webkit-slider-thumb \{[^}]*width:\s*14px[^}]*height:\s*14px/s.test(shell)
  && /\.arrrow \.arrgain::-webkit-slider-runnable-track \{[^}]*height:\s*8px[^}]*background:\s*transparent/s.test(shell)
  && /\.arrvumeter \{[^}]*height:\s*8px[^}]*background:\s*var\(--deep\)/s.test(shell)
  && /\.arrvumeter i \{[^}]*width:\s*0%[^}]*linear-gradient/s.test(shell)
  && /\.arrpresetcat \{[^}]*margin-left:\s*auto[^}]*text-align:\s*right/s.test(shell)
  && /#arrgrid \{[^}]*display:\s*flex[^}]*flex-direction:\s*column[^}]*row-gap:\s*var\(--arrgap\)/s.test(shell)
  && /\.arrbars \{[^}]*align-self:\s*stretch[^}]*gap:\s*4px[^}]*height:\s*auto/s.test(shell)
  && /\.arrbar \{[^}]*padding-inline:\s*4px/s.test(shell)
  && /\.arrbar \{[^}]*border-radius:\s*3px/s.test(shell)
  && /\.arrbar \.arrcell:last-child \{[^}]*margin-right:\s*0/s.test(shell),
  'arrangement track volume controls share the VU rail and bars have an equal visual inset');
assert(/gainSlider\.className = 'arrgain'[\s\S]*?gainWrap\.append\(vu, gainSlider, gainReadout\);\s*arrangementMeters\.set\(row\.key[\s\S]*?bottom\.append\(gainWrap\);[\s\S]*?main\.append\(header, bars\);\s*el\.append\(main\)/.test(entry),
  'each volume control combines the fader and live VU meter in the lower header row');
assert(/\.arrgainreadout \{[^}]*position:\s*absolute[^}]*bottom:\s*calc\(100% \+ 4px\)[^}]*font-variant-numeric:\s*tabular-nums/s.test(shell)
  && /gainReadout\.className = 'arrgainreadout'[\s\S]*?pointerdown[\s\S]*?gainReadout\.classList\.add\('show'\)[\s\S]*?pointerup/.test(entry),
  'the hidden arrangement gain readout appears with the dB value only while dragging');
assert(/\.arrtrack-bottom \{[^}]*gap:\s*var\(--arrhead-gap\)/s.test(shell)
  && /\.arrgainwrap \{[^}]*display:\s*flex[^}]*flex:\s*1 1 auto[^}]*width:\s*auto[^}]*min-width:\s*96px/s.test(shell)
  && /\.arrgainwrap \.arrgain \{[^}]*flex:\s*1 1 auto[^}]*width:\s*100%/s.test(shell)
  && !entry.includes('track-gain-visible')
  && !shell.includes('track-gain-visible'),
  'arrangement volume controls remain visible while the Mixer is open or collapsed');
assert(/function updateArrangementMeter\(readout, lin, now, dt\)[\s\S]*?readout\.fill\.style\.width[\s\S]*?readout\.peak\.style\.left[\s\S]*?readout\.meter\.classList\.toggle\('clip'/.test(entry)
  && /const arrangementMeters = new Map\(\)/.test(entry)
  && /for \(const \[key, readout\] of arrangementMeters\)[\s\S]*?updateArrangementMeter\(readout, lin, now, dt\)/.test(entry),
  'arrangement VU fills and peak markers follow the live lane meter path');
assert(/\$\('addtrackbtn'\)\.onclick[\s\S]*?addBlankTrack\(ev\.currentTarget\)/.test(entry)
  && !entry.includes('missingKitPieces')
  && !entry.includes('openAddTrackPicker'),
  'the plus opens one new track and its preset selector without a choice menu — which'
  + ' sound it is IS the choice, and the library is where that is made');
assert(/function openVoicePicker[\s\S]*?className = 'voiceclose popclose'[\s\S]*?closeMenu\(\)/.test(entry)
  && /function openVoicePicker[\s\S]*?draw\(''\);[\s\S]*?el\.classList\.add\('show'\);[\s\S]*?search\.focus\(\{ preventScroll: true \}\)/.test(entry)
  && /#voicepicker button\.voiceclose \{[^}]*width:\s*34px[^}]*height:\s*34px[^}]*font-size:\s*23px/s.test(shell),
  'the preset selector has the large close button and focuses Search presets');
assert(/id="font"[^>]*>[\s\S]*?<\/select>\s*<\/label>\s*<label[^>]*>\s*<span>Theme<\/span>\s*<select id="theme"/s.test(shell),
  'the colour theme selector sits beside the font selector in Desk settings');
assert(entry.includes("const THEME_KEY = 'mash-mixer-theme'")
  && entry.includes('document.documentElement.dataset.mixerTheme')
  && entry.includes('localStorage.setItem(THEME_KEY'),
  'the selected mixer theme is applied to the document and remembered');
assert(shell.includes(':root[data-mixer-theme="light"]')
  && entry.includes("['light', 'Light Paper']"),
  'the theme list includes a light desk palette');
assert(shell.includes(':root[data-mixer-theme="midday"]')
  && entry.includes("['midday', 'Midday']")
  && entry.includes("['dawn', 'Dawn']")
  && entry.includes("['dusk', 'Dusk']"),
  'the theme list includes additional light and dark mixed palettes');
assert(shell.includes(':root[data-mixer-theme="oscar"]')
  && entry.includes("['oscar', 'Oscar']")
  && /data-mixer-theme="oscar"[\s\S]*?--accent: #f0a63a/.test(shell)
  && /data-mixer-theme="oscar"[\s\S]*?--ctl: #bdb6a6/.test(shell)
  && /oscar: \['#b8a89a'/.test(entry),
  'Oscar is a monochrome hardware palette: cream knobs, an amber ON lamp, unlit legends');
assert(!entry.includes('midday: [')
  && /data-mixer-theme="midday"[\s\S]*?--accent: #4ec9b0/.test(shell),
  'Midday keeps Midnight\'s bright track colour path and signal accents');
assert(/data-mixer-theme="midday"[\s\S]*?--selected-ink: #27323a[\s\S]*?--lane-ink: #1e3035/.test(shell)
  && shell.includes('.arrrow.sel .arrname { color: var(--selected-ink)')
  && shell.includes('.strip.selected h3 { color: var(--selected-ink)'),
  'Midday uses dark text for selected tracks and lane labels on its light surfaces');
// A struck note flashes away from the field it sits on, and on paper that is the
// opposite direction from slate: the marks are lighter than their bar there, so a
// hardcoded brightness(0) inverted them for a tenth of a second.
assert(/:root \{[\s\S]*?--note-flash: 0; --note-flash-soft: \.2;/.test(shell)
  && ['light', 'midday', 'dawn'].every((theme) => new RegExp(
    `data-mixer-theme="${theme}"[\\s\\S]*?--note-flash: 2\\.2; --note-flash-soft: 1\\.7;`).test(shell))
  && !/filter: brightness\(0\)/.test(shell)
  && /@keyframes arrTrailEcho[\s\S]*?brightness\(var\(--note-flash, 0\)\)[\s\S]*?brightness\(var\(--note-flash-soft, \.2\)\)/.test(shell),
  'the arrangement note flash is the theme\'s own direction — ink on the dark desks, white on the light ones');
assert(/#arrange \.arrbar:not\(\.has-notes\) \{ background-color: var\(--cell\); \}/.test(shell)
  && /#arrange \.arrbar:not\(\.has-notes\) \.arrcell \{ background: transparent; \}/.test(shell),
  'a silent bar is the same rectangle as a playing one, in the neutral cell colour');
assert(entry.includes('const TRACK_PALETTES = {')
  && entry.includes('themeTrackColour')
  && entry.includes('arrangementBarColour')
  && entry.includes('refreshThemeColours'),
  'alternate themes use finite track palettes and refresh shared track views');
assert(/id="notevisual"[^>]*>/.test(shell)
  && /id="noteanimation"[^>]*type="checkbox"/.test(shell),
  'Desk settings expose note visual language and an animation toggle beside Theme');
assert(entry.includes("const NOTE_VISUAL_KEY = 'mash-mixer-note-visual'")
  && entry.includes("const NOTE_ANIMATION_KEY = 'mash-mixer-note-animation'")
  && entry.includes("['solid', 'Solid']")
  && entry.includes("['pulse', 'Fine Pulse Dots']")
  && entry.includes("['trail', 'Elastic Trails']")
  && !entry.includes("['trail-muted'")
  && !entry.includes("['trail-line'")
  && !entry.includes("['trail-soft'")
  && /applyNoteVisualPreferences\(\{ render: false \}\)/.test(entry),
  'the three note languages and animation preference are persisted as desk state');
assert(/data-note-visual="solid"/.test(shell)
  && /data-note-visual="pulse"/.test(shell)
  && /data-note-visual="trail"/.test(shell)
  && !/data-note-visual="trail-(muted|line|soft)"/.test(shell)
  && !/#arrange\[data-note-visual="solid"\] \.arrbar\.has-notes \{/.test(shell)
  && /data-note-animation="on"/.test(shell)
  && /arrPulseBloom/.test(shell)
  && /arrTrailTug/.test(shell)
  && /arrTrailEcho/.test(shell)
  && /\.arrcell\.note\.echoing::before/.test(shell)
  && /@keyframes arrTrailTug[\s\S]*?scale\(2\); filter: brightness\(var\(--note-flash, 0\)\)[\s\S]*?100%[\s\S]*?filter: brightness\(1\)/.test(shell)
  && /@keyframes arrTrailEcho[\s\S]*?opacity: var\(--trail-dot-opacity, \.98\)[\s\S]*?100%[\s\S]*?opacity: var\(--trail-dot-opacity, \.98\)/.test(shell)
  && /arrPercussionFlash/.test(shell)
  && /#arrange \{[^}]*--arr-note-size:\s*5px/.test(shell)
  && /\.arrcell\.note \.arrhit[\s\S]*?width:\s*var\(--arr-note-size\); height:\s*var\(--arr-note-size\)[\s\S]*?border-radius:\s*50%/.test(shell)
  && /\.arrcell\.note\.percussion \{[^}]*overflow:\s*visible/.test(shell)
  && /\.arrcell\.note\.percussion::before[\s\S]*?display:\s*none/.test(shell)
  && /\.arrcell\.note::before[\s\S]*?width:\s*var\(--arr-note-size\); height:\s*var\(--arr-note-size\)/.test(shell)
  && /\.arrmicrodot \{[^}]*width:\s*var\(--arr-note-size\); height:\s*var\(--arr-note-size\)/.test(shell)
  && /\.arrcell\.note\.micro-notes::before[\s\S]*?display:\s*none !important/.test(shell)
  && /micro-notes\.playing \.arrmicrodot[\s\S]*?animation:\s*arrPulseBloom/.test(shell)
  && /micro-notes\.playing \.arrmicrodot[\s\S]*?animation:\s*arrTrailTug/.test(shell)
  && /#arrange\[data-note-visual="trail"\] \.arrmelodyline \{[^}]*display:\s*block/.test(shell)
  && /\.arrmelodyline \{[^}]*inset:\s*0; width:\s*100%/.test(shell)
  && /#arrange\[data-note-visual="trail"\] \.arrbar \.arrcell \{[^}]*margin-right:\s*0/.test(shell)
  && /--trail-dot:\s*color-mix\(in srgb, var\(--bar-colour, var\(--lane\)\) 45%, var\(--deep\)\)/.test(shell)
  && /--trail-thread:\s*color-mix\(in srgb, var\(--bar-colour, var\(--lane\)\) 82%, var\(--deep\)\)/.test(shell)
  && /var\(--deep\)/.test(shell),
  'the three note languages use bright fields with tinted Elastic Trails marks and playback animation is opt-in');
assert(/box\.className = `arrbar\$\{playing \? ' has-notes' : ''\}\$\{barFrozen \? ' frozen' : ''\}`/.test(entry)
  && /const barColour = arrangementBarField\(row\.key\)[\s\S]*?box\.style\.setProperty\('--bar-colour', barColour\)/.test(entry)
  && /c\.className = 'arrcell'[\s\S]*?note \? ' note' : ''/.test(entry)
  && /const perBar = \[16, 8, 4, 2, 1\]\.find\(\(cells\) => plan\.length \* cells <= 256\)/.test(entry)
  && /function noteVisualGeometry\(values, range\)/.test(entry)
  && /const y = 12 \+ \(1 - \(\(centre - range\.min\) \/ range\.span\)\) \* 76/.test(entry)
  && /function melodicMovementPoints\(steps, range\)/.test(entry)
  && /function melodicDotPoints\(steps, range\)/.test(entry)
  && /function melodicMovementTailPath\(last, next\)/.test(entry)
  && /function percussionHitPositions\(values\)/.test(entry)
  && /hit\.className = 'arrhit'/.test(entry)
  && /document\.createElementNS\('http:\/\/www\.w3\.org\/2000\/svg', 'svg'\)/.test(entry)
  && /classList\.add\('arrmelodyline'\)/.test(entry)
  && /const barSteps = row\.steps\.slice\(bar \* perBar, \(bar \+ 1\) \* perBar\)[\s\S]*?melodicMovementPath\(barSteps, pitchRanges/.test(entry)
  && /const nextBarPoints = row\.group === 'melodic'[\s\S]*?const tail = melodicMovementTailPath\(barPoints\.at\(-1\), nextBarPoints\[0\]\)/.test(entry)
  && /classList\.add\('arrtrailtail'\)/.test(entry)
  && /gradient\.setAttribute\('x1', '94'\)[\s\S]*?gradient\.setAttribute\('x2', '100'\)[\s\S]*?gradientUnits', 'userSpaceOnUse'/.test(entry)
  && /c\.classList\.add\('percussion'\)/.test(entry)
  && /c\.classList\.add\('micro-notes'\)/.test(entry)
  && /dot\.className = 'arrmicrodot'/.test(entry)
  && /dot\.dataset\.cell = String\(point\.cellIndex\)/.test(entry)
  && /dot\.dataset\.slot = String\(point\.slot\)/.test(entry)
  && /hit\.dataset\.slot = String\(index\)/.test(entry)
  && /const hasChord = values\.some\(\(value\) => Array\.isArray\(value\)/.test(entry)
  && /--note-y/.test(entry)
  && /function followArrangementVisual\(step\)/.test(entry)
  && /const selectedArrangementLane = selectedLane[\s\S]*?arrCells\.some\(\(row\) => row\.key === selectedLane\)/.test(entry)
  && /arrmicrodot\[data-cell="\$\{cellIndex\}"\]\[data-slot="\$\{slot\}"\]/.test(entry)
  && /if \(selectedArrangementLane && row\.key !== selectedArrangementLane\) continue/.test(entry)
  && /function markRecordedVisual\(lane, bar, step, open\)/.test(entry),
  'arrangement visuals keep fine timing and pitch-aware marks on the existing cells');

// A drawn cell is not a sixteenth once a song is long enough to compress them, so the
// playback accent has to be aimed at the ATTACK inside it, not at the box.
assert(/c\.dataset\.hits = \(values\.length \? values : \[true\]\)/.test(entry)
  && /const perCell = 16 \/ arrCellsPerBar;[\s\S]*?const cellIndex = Math\.floor\(within \/ perCell\);[\s\S]*?const slot = within - cellIndex \* perCell;/.test(entry)
  && /const hits = cell\.dataset\.hits;\s*\n\s*if \(hits && hits\[slot\] !== '1'\) continue;/.test(entry)
  && /arrhit\[data-slot="\$\{slot\}"\]/.test(entry),
  'a note on the second half of a compressed cell is set off when it sounds, not when'
  + ' the playhead reaches the cell it is drawn in');

// Two attacks on the same mark are two events. Without the step in the comparison the
// second one inherits the first one's flourish and never restarts.
assert(/let arrPlayingAt = null;/.test(entry)
  && /if \(same && at === arrPlayingAt\) return;/.test(entry)
  && /const rehit = next\.some\(\(cell\) => arrPlayingCells\.includes\(cell\)\)/.test(entry)
  && /if \(rehit\) void \$\('arrange'\)\.offsetWidth;/.test(entry)
  && /arrPlayingAt = at;/.test(entry),
  'a re-struck mark restarts its animation rather than holding the previous one');
assert(/const arrEchoCells = new Set\(\)/.test(entry)
  && /function startArrangementEcho\(cell\)/.test(entry)
  && /cell\.classList\.add\('echoing'\)/.test(entry)
  && /if \(!nextSet\.has\(cell\)\) startArrangementEcho\(cell\)/.test(entry),
  'selected-track playback leaves a short fading visual echo behind each note');
assert(/function updateArrangementNoteScale\(\)[\s\S]*?const size = clamp\(width \* 0\.12, 3, 5\)/.test(entry)
  && /redrawSelection\(\);[\s\S]*?updateArrangementNoteScale\(\);/.test(entry)
  && /fitStrips\(\);[\s\S]*?updateArrangementNoteScale\(\);/.test(entry),
  'arrangement note marks scale down with rendered bar width while five pixels remains the maximum');
assert(/recordNote\([\s\S]*?markRecordedVisual\(laneKey, bar, inBar, true\)/.test(entry)
  && /recordOff\([\s\S]*?markRecordedVisual\(held\.lane, held\.bar, held\.step, false\)/.test(entry)
  && /function flushTake\([\s\S]*?render: !live/.test(entry),
  'recorded notes appear immediately while beat commits still avoid full desk redraws');

// ---- the theme ramp ---------------------------------------------------------------
// The desk used to carry about two hundred hardcoded slate hexes, which is why every
// theme but Midnight kept a black toolbar, lost its grid lines and stayed teal in a
// hundred small places. Everything below is the shape that stops that coming back.
const css = shell.slice(shell.indexOf('<style>'), shell.indexOf('</style>'));
const rules = css.slice(css.indexOf('* { box-sizing: border-box; }')).replace(/\/\*[\s\S]*?\*\//g, '');
for (const v of ['--tray', '--traybtn', '--well', '--deep', '--seam', '--line2',
                 '--grid', '--faint', '--faintest', '--accent-line', '--on-accent']) {
  assert(new RegExp(`\\n\\s*${v}:`).test(css) && rules.includes(`var(${v})`),
    `${v} is defined once on the ramp and used by the rules`);
}
assert(/--on-accent: #eafaf5/.test(shell),
  'Light Paper writes a light ink on its dark accent rather than Midnight\'s dark one');
// The chrome that was black on every light desk, and the ticks that were invisible.
assert(/\.transport \{[^}]*background: var\(--tray\)/s.test(rules)
  && /\.transport button \{[^}]*background: var\(--traybtn\)/s.test(rules)
  && /#ruler \.tick \{[^}]*background: var\(--grid\)/s.test(rules)
  && rules.includes('.arrcell.barstart { box-shadow: none; }'),
  'the transport tray and ruler ticks take their colour from the theme, while bar gaps replace inset ticks');
// A cast shadow the width of the desk, from a drawer that is shut.
assert(!/#navdrawer \{[^}]*box-shadow/s.test(rules)
  && /#navdrawer\.show \{[^}]*box-shadow/s.test(rules),
  'the drawer casts a shadow only while it is open');
// What is left is deliberate and should stay small. Three things are allowed to be a
// fixed colour: the two keyboards, because a piano is black and white whatever the
// desk is; the moulded fader cap, because it is a physical object rather than a
// surface; and the dark ink on the mute and section badges, which is legible on a
// saturated fill in any theme. Anything beyond that is a theme hardcoded again.
//
// The ceiling moved 42 → 43 when the Advanced window grew its own keyboard. Every one
// of the 43 was accounted for at that point, and the count is the whole audit:
//
//   30  the keyboards — #synthfull .sfk*, #osk .oskkey*, #pianoroll .rollblack
//   10  the moulded fader cap — its radial gradient and rim
//    3  the badge inks — #0d1013, #5a101d, #230d0d
//
// A number is a poor guard on its own, so raise it only after doing that sum again. A
// colour that does not land in one of those three rows is the thing this is here to
// catch, and it will still trip on the next one.
const strayHexes = (rules.match(/#[0-9a-fA-F]{6}\b/g) || []).length;
assert(strayHexes <= 43, `the rules carry ${strayHexes} literal hexes; only the keyboards, the fader cap and the badge inks should be fixed`);
assert(!/hsl\(\$\{laneHue\(key\)\} 3[02]% 1[25]%\)/.test(entry)
  && entry.includes('let panelIsLight = false')
  && /const arrangementBarColour = \(key, shade = 56\) => \{[\s\S]*?const themed = themeTrackColour\(key\)[\s\S]*?58%/.test(entry)
  && /const arrangementBarField = \(key\) => arrangementBarColour\(key, 56\)/.test(entry),
  'lane tints and active bars use the original strong theme-aware Solid colour');
assert(/colour: hueColour\(hue\), tint: hueTint\(hue\)/.test(entry),
  'the send returns take the theme\'s palette rather than a raw teal and purple');
const addTrackFn = entry.match(/function addBlankTrack\(anchor = null, \{ drumsOnly = false \} = \{\}\) \{[\s\S]*?\n\}/)?.[0] || '';
assert(/pendingAddTrack = \{[\s\S]*?openVoicePicker\(x, y, newKey\)/.test(addTrackFn)
  && !addTrackFn.includes('editMix(')
  && /const emptyLaneMix = \(\) =>/.test(entry)
  && /m\.lanes\[pending\.key\] = emptyLaneMix\(\)/.test(entry)
  && /function commitPendingAddTrack[\s\S]*?m\.layers[\s\S]*?m\.lanes\[pending\.key\][\s\S]*?voice\[seam\.voiceKey\]/.test(entry)
  && /const pick = \(id\)[\s\S]*?commitPendingAddTrack\(laneKey, id\)[\s\S]*?closeMenu\(\)/.test(entry),
  'Add Track waits for a preset before creating the independent lane');
assert(/\$\('addtrackbtn'\)\.onclick[\s\S]*?addBlankTrack\(ev\.currentTarget\)/.test(entry)
  && /const plusRect = anchor\?\.getBoundingClientRect/.test(entry),
  'the new-track preset selector opens beside the Arrangement plus');
// The preset the user picked is what the track IS. A pitched one re-keys it to a melodic
// lane; a kit one re-keys it onto the piece of the kit it belongs to, which is what hands
// it that drum's figures, its place in the row order and its share of a groove.
assert(/const CATEGORY_LANE = \{[\s\S]*?Kick: 'kick'/.test(entry)
  && /function kitLaneOf\(voice\)[\s\S]*?if \(voice\.homeLane\) return voice\.homeLane;/.test(entry)
  && /voice\.category === 'Hats' && \/open\/i\.test/.test(entry)
  && /const home = voice && isKitVoice\(voice\) \? kitLaneOf\(voice\) : 'lead';/.test(entry)
  && /if \(voice && home && home !== pendingAddTrack\.from && !blocked\)/.test(entry),
  'an added track is re-keyed onto the lane its chosen preset belongs to — a clap staged'
  + ' as a tom would stay a tom playing a clap, offered tom figures');
// Everything the PATTERN EDITOR's plus can make is a drum. The picker is where a new
// track decides what it is, and a pad chosen there would re-key itself to a melodic lane
// — a channel the grid it was added from cannot show a single note of.
assert((entry.match(/addInstrument: \(anchor\) => addBlankTrack\(anchor, \{ drumsOnly: true \}\)/g) || []).length === 2
  && /\$\('addtrackbtn'\)\.onclick[\s\S]*?addBlankTrack\(ev\.currentTarget\);/.test(entry)
  && /const drumsOnly = pending\s*\n\s*\? !!pendingAddTrack\?\.drumsOnly\s*\n\s*: PERCUSSION_LANES\.includes\(baseLane\(laneKey\)\)/.test(entry)
  && /const KINDS = drumsOnly \? \[\{ id: 'drums', label: 'Drums', keep: isDrumChoice \}\]/.test(entry)
  // A drum lane is booleans: a step says a hit happens and carries no pitch, so a melodic
  // preset there is a synth struck at one note over and over. Every route into the picker
  // — the strip, the row menu, the drum editor — refuses it, in both directions of the
  // rule: the lane's own preset is still shown, or a drum would have no entry to be on.
  && /const isDrumChoice = \(v\) => isKitVoice\(v\) \|\| \(chosen && v\?\.id === chosen\)/.test(entry)
  && /if \(!drumsOnly\) for \(const k of KINDS\) chips\.append\(chipFor\(k\)\)/.test(entry)
  && /const blocked = home === 'lead' && pendingAddTrack\.drumsOnly;/.test(entry),
  'both pattern editors can only add drums — the picker holds nothing but the kit and the'
  + ' re-key to a melodic lane is refused, while the arrangement plus stays neutral');
// And the duplicate names the lane it actually copies. A copy of an added track or of
// another duplicate is a copy of THAT part, not of the engine lane its key is named
// after — see duplicateLane, which now records `from: key`.
assert(/const isIndependentLane = \(key\)[\s\S]*?const layer = isLayer\(laneKey\) && !independent/.test(entry)
  && /\?\.from\s*\n?\s*\|\| baseLane\(laneKey\);[\s\S]*?A duplicate of \$\{targetLabel\(source\)\}/.test(entry),
  'independent tracks are not presented as duplicates of Tom in the voice picker');
assert(/function duplicateLane\(key\)[\s\S]*?duplicateLaneContent\(editBank\(\), arr, key, newKey\)[\s\S]*?\{ key: newKey, from, independent: true/.test(entry),
  'Duplicate snapshots the source pattern and declares the new track independent');
assert(/function openVoicePicker[\s\S]*?const pending = pendingAddTrack\?\.key === laneKey[\s\S]*?let kind = drumsOnly \? 'drums' : pending \? 'all'[\s\S]*?else if \(pending\)[\s\S]*?Choose a preset for this new track/.test(entry),
  'the plus picker starts on All without presenting the Tom engine default');
assert(/async function deleteLane[\s\S]*?bankCache\.sig = null;[\s\S]*?localStorage\.removeItem\(LANE_KEY\)[\s\S]*?rebuildForShape\(\)/.test(entry)
  // Two words on the button, the track named in the confirmation — which is the step you
  // cannot take back and the only place the name has to be right.
  && /label: 'Delete Track', danger: true,[\s\S]*?run: \(\) => deleteLane\(laneKey\)/.test(entry)
  && /ask\(`Delete \$\{number \? `track \$\{number\}, ` : ''\}\$\{escapeHtml\(label\)\}\?`/.test(entry)
  && /The other tracks and all song bars stay in place/.test(entry)
  && /function rebuildForShape\(\) \{[\s\S]*?bankCache = \{ bank: null, sig: null, arr: null, out: null \};[\s\S]*?buildRack\(\);[\s\S]*?buildArrangement\(\);[\s\S]*?rebank\(\)/.test(entry)
  && /const mixRemoved = layer[\s\S]*?\.arrrow\[data-lane=[\s\S]*?\.strip\[data-lane=/.test(entry),
  'deleting a track invalidates its shaped view, clears selection, and lives on the track menu');
assert(/const layersOf = \(key\) => \{[\s\S]*?if \(l\.independent\) continue;[\s\S]*?if \(!sources\.has\(l\.from\)\) continue;/.test(entry)
  && /m\.layers = \(m\.layers \|\| \[\]\)\.filter\(\(l\) => !drop\.has\(l\.key\)[\s\S]*?l\.independent \|\| !drop\.has\(l\.from\)/.test(entry),
  'deleting either side of an independent duplicate preserves the other track');
// `drop` is a Set, and this is the first thing deleteLane does with it. Handing a Set
// to something expecting an array threw before a single line of the delete had run:
// no mix edit, no repaint, and a strip that stayed exactly where it was.
assert(/removeLanes\(currentArrangement, \[\.\.\.drop\]\)/.test(entry),
  'the arrangement clean-up is handed the dropped lanes as an array, not the raw Set');
// One right-click, one scope. The bar panel edits the bars it was opened on and
// cannot remove the track or reach across the song; the switch that used to let it
// is gone, along with the labels that had to keep explaining which mode was on.
const regionFn = entry.match(/\nfunction openRegionEditor\([\s\S]*?\n\}\n/)?.[0] || '';
const barBranch = regionFn.match(/\} else if \(!wholeTrack\) \{[\s\S]*?\n  \} else if \(wholeTrack\) \{/)?.[0] || '';
const trackBranch = regionFn.match(/\} else if \(wholeTrack\) \{[\s\S]*?\n  \}\n/)?.[0] || '';
assert(regionFn && barBranch && trackBranch
  // Same verb as the track panel, scoped to these bars — and it EMPTIES them. Forked
  // rather than shared: clearing bar 3 must not empty the other bars of its pattern.
  && /label: 'Erase Notes', danger: true,[\s\S]*?clearLaneBars\(laneKey, from, to, `\$\{laneLabel\} erased in \$\{span\.toLowerCase\(\)\}`\)/.test(barBranch)
  && /label: 'Copy Notes'[\s\S]*?label: 'Paste Notes'/.test(barBranch)
  && !/'Delete here'|'Restore here'|'Clear'|setLanesDeleted\([^)]*true\)/.test(barBranch)
  // Edit notes… is gone from BOTH panels: two buttons, two keys, and a double-click on
  // the bar itself already open the editor on the channel the right-click selected.
  && !/label: 'Edit notes…'/.test(regionFn)
  && /box\.ondblclick = \(\) => openNoteEditor\(row\.key, bar\)/.test(entry)
  && !/deleteLane|duplicateLane|Change preset|Reset channel/.test(barBranch)
  && !/regscope/.test(entry) && !/regscope/.test(shell)
  && !/textContent = 'Entire track'/.test(entry)
  && !/Selected bars? \$\{/.test(entry),
'the bar panel is scoped to the bars it was opened on, with no scope switch, no track removal and no channel actions');
// Tracks do track things, channels do channel things, and WHERE you right-clicked is what
// decides which — the arrangement row is the track, the mixer strip is its signal path.
// Both used to open the track panel, which put one set of buttons behind two gestures and
// made the result of a right-click unguessable from the thing under the pointer.
assert(/function openTrackEditor\(x, y, key, options = \{\}\)[\s\S]*?wholeTrack: true, \.\.\.options/.test(entry)
  && /function trackMenu\(el, key\)[\s\S]*?openTrackEditor\(ev\.clientX, ev\.clientY, key\)/.test(entry)
  && /trackMenu\(header, row\.key\)/.test(entry)
  && !/openTrackEditor/.test(entry.slice(entry.indexOf('function stripMenu'),
    entry.indexOf('function trackMenu')))
  && !entry.includes('trackMenuItems')
  && !/label: 'Adjust entire track…'/.test(entry),
'the arrangement row opens the track panel and the strip no longer does');
// The strip gets what the master and the sends have always had: five items about the
// signal path, built by the one function all three share.
assert(/function stripMenu\(el, key, kind\)[\s\S]*?label: `Copy \$\{Kind\}`[\s\S]*?label: `Reset \$\{Kind\}`/.test(entry)
  && /const Kind = kind\[0\]\.toUpperCase\(\) \+ kind\.slice\(1\)/.test(entry)
  && /stripMenu\(el, key, 'channel'\)/.test(entry)
  && /stripMenu\(el, key, 'send'\)/.test(entry)
  && /stripMenu\(el, '__master', 'master'\)/.test(entry),
'a channel strip gets the same channel menu as the master and the send returns');
assert(/actionSection\('Sound', \[[\s\S]*?label: 'Preset'[\s\S]*?openVoicePickerFor\(laneKey\)[\s\S]*?label: 'Edit Preset'[\s\S]*?editVoice\(laneKey\)/.test(trackBranch)
  && !/isNew: true/.test(trackBranch)
  && /label: 'Channel Effects'[\s\S]*?openChannelEffects\(laneKey\)/.test(trackBranch)
  && /label: 'Duplicate',\s*title: layersOf\(laneKey\)\.length/.test(trackBranch)
  // Clear EMPTIES the lane rather than flagging it: rests written into every bar, the
  // right rest for the lane's kind, and the delete flags taken off with them. A flag
  // left the notes in the file and in the roll, and Reset track undid the clear. Both
  // panels go through the one helper — shared here, forked in the bar panel.
  //
  // The note LENGTHS go with the notes, and the write says so explicitly: cleared bars
  // that kept their lengths would give the next note drawn on one of those steps the
  // length of whatever used to be there.
  && /label: 'Erase Notes'[\s\S]*?clearLaneBars\(laneKey, from, to, `\$\{laneLabel\} erased`, \{ shared: true \}\)/.test(trackBranch)
  && /function clearLaneBars\(laneKey, from, to, what, \{ shared = false \} = \{\}\) \{[\s\S]*?PERCUSSION_LANES\.includes\(baseLane\(laneKey\)\) \? false : null[\s\S]*?const write = shared \? writeBarNotesShared : writeBarNotes[\s\S]*?setLanesDeleted\(arrDraftOf\(\), from, to, \[laneKey\], false\)[\s\S]*?write\(eb, next, bar, laneKey, empty, noLengths\)/.test(entry)
  && !/setLanesDeleted\(arrDraftOf\(\), from, to, \[laneKey\], true\)/.test(entry)
  // No duplicate Channel action section and no Edit notes…: channel effects has one
  // requested navigation shortcut, while the strip keeps the copy/paste/reset actions.
  // The note editor has a toolbar button and a key of its own. Mute and solo stay out.
  && !/actionSection\('Channel'/.test(trackBranch)
  && !/copyStrip|pasteStrip|pasteEffects|resetTarget/.test(trackBranch)
  && /label: 'Copy Track'[\s\S]*?copyTrack\(laneKey\)/.test(trackBranch)
  && /label: 'Paste Track'[\s\S]*?pasteTrack\(\)/.test(trackBranch)
  // The item, not the word — the branch explains in a comment why it no longer has one.
  && !/label: 'Edit notes…'/.test(trackBranch)
  && !/setLaneMute|setLaneSolo/.test(trackBranch),
'the track panel carries the sound and part actions plus one channel-effects shortcut');
assert(/function openChannelEffects\(key\) \{[\s\S]*?selectLane\(key\);[\s\S]*?setDevicesFolded\(false\);[\s\S]*?\}/.test(entry),
  'Channel Effects selects that exact track and opens its effects inspector');
// ---- one vocabulary across all three panels --------------------------------------
//
// Every button in the three right-click panels is Title Case, and the destructive ones
// name the noun they act on. `Clear` / `Reset` / `Delete` were three words for "less
// than there was" whose difference you had to already know; `Erase Notes`, `Reset
// Adjustments` and `Delete Track` say it. The same verb means the same thing in the bar
// panel and the track panel — only the heading's scope differs.
const panelLabels = [...regionFn.matchAll(/label: (?:[\w?.\s]+\?\s*)?'([^']+)'(?:\s*:\s*'([^']+)')?/g)]
  .flatMap((m) => [m[1], m[2]]).filter(Boolean);
assert(panelLabels.length >= 12
  && panelLabels.every((label) => label.split(' ').every((word) => /^(?:[A-Z]|\d|from$|in$|to$)/.test(word))),
`every panel button is Title Case (${panelLabels.filter((l) => !l.split(' ').every((w) => /^(?:[A-Z]|\d|from$|in$|to$)/.test(w))).join(', ') || 'none stray'})`);
assert(!/label: '(?:Clear|Reset|Reset track|Delete)'/.test(regionFn)
  && panelLabels.includes('Erase Notes') && panelLabels.includes('Reset Edits')
  && panelLabels.includes('Delete Track') && panelLabels.includes('Delete Bars')
  && panelLabels.filter((l) => l === 'Erase Notes').length === 2
  && panelLabels.filter((l) => l === 'Copy Notes').length === 2,
'the destructive verbs name what they act on, and the notes verbs are shared by both lane panels');
const pickerAnchor = entry.slice(entry.indexOf('function openVoicePickerFor'), entry.indexOf('/**\n * The preset editor', entry.indexOf('function openVoicePickerFor')));
assert(/#arrgrid \.arrrow\[data-lane=/.test(pickerAnchor)
  && /const assetArea = row\?\.querySelector\('\.arrbars'\) \|\| row/.test(pickerAnchor)
  && /openVoicePicker\(r \? r\.right \+ 6 : innerWidth \/ 2, r \? r\.top : 120, laneKey\)/.test(pickerAnchor),
'the track-menu preset picker anchors beside the arrangement asset area, not the mixer strip');
// Timing and gain are per-track. Across every melodic track at once they are a no-op and
// the master fader respectively, so the timeline panel does not offer them.
assert(/if \(laneKey\) \{\s*addControl\(\{ field: 'offset'[\s\S]*?addControl\(\{ field: 'gain'/.test(entry)
  && /if \(!laneKey \|\| melodic\.includes\(laneKey\)\) \{\s*addControl\(\{ field: 'transpose'/.test(entry),
'the timeline adjusts transpose only; timing and gain belong to a single track');
// The right-click editor remains a scope editor; the richer identity belongs to the
// hover card shared by bars and track names.
assert(/heading\.textContent = laneKey[\s\S]*?wholeTrack \? `\$\{number \? `Track \$\{number\}\. ` : ''\}\$\{laneLabel\}`/.test(entry)
  && /if \(!\(laneKey && wholeTrack\)\) \{[\s\S]*?regtarget/.test(entry)
  && /section\(wholeTrack \? 'Adjust' : `Adjust \$\{laneLabel\}`\)/.test(entry),
'the track panel is titled by number and name, with the explanatory lines gone');
assert(/\.regfoot \{[^}]*position:\s*sticky[^}]*bottom:\s*0/s.test(shell)
  && /#regionedit \{[^}]*max-height:\s*calc\(100vh - 12px\)[^}]*overflow:\s*auto/s.test(shell),
  'the taller track panel scrolls with Apply and Cancel pinned to its bottom edge');
assert(/const nameInput = laneKey && wholeTrack/.test(entry)
  && /const wrap = section\('Track name'\)/.test(entry)
  && /nameChanged = !!next[\s\S]*?updateApply\(\)/.test(entry)
  && /if \(nameChanged && label\)[\s\S]*?m\.labels = \{ \.\.\.\(m\.labels \|\| \{\}\), \[laneKey\]: label \}[\s\S]*?applyArrangementEdit\(next[\s\S]*?undo: !nameChanged/.test(entry)
  && /label: 'Rename Track…'[\s\S]*?focusName: true/.test(entry)
  && !/async function renameLane/.test(entry)
  && !/customLayerLabel/.test(entry)
  && !/label: VOICES\[voiceId\]\.label/.test(entry),
  'the track panel can name every track without changing its playback key or storing a stale preset name');
assert(entry.includes("const SONG_LAYOUT_KEY = 'mash-mixer-song-layout'")
  && /function currentSongLayout\(\) \{[\s\S]*?const notes = !\$\('notes'\)\.classList\.contains\('collapsed'\)[\s\S]*?keyboard:\s*oskShown\(\)[^}]*?notes,[^}]*?grid:\s*stepSeq\.isOpen\(\)/.test(entry)
  && /function loadTrack\(id\)[\s\S]*?rememberSongLayout\(trackId\)[\s\S]*?restoreSongLayout\(id\)/.test(entry),
  'keyboard and both note editors are remembered as separate facts, and restored per song');
assert(/function currentSongLayout\(\)[\s\S]*?lane:\s*notes && notesRollUp\(\) \? rollShownLane\(\) : null/.test(entry)
  && /function loadTrack\(id\)[\s\S]*?const layoutLane = notesOpenInLayout\(songLayouts\[id\]\) === true[\s\S]*?if \(layoutLane\) selectedLane = layoutLane;[\s\S]*?buildRack\(\)/.test(entry),
  'an open piano roll restores its own track selection before the mixer and arrangement build');
assert(/function showStepSeq\(on\)[\s\S]*?rememberSongLayout\(\)/.test(entry)
  && /function showPianoRoll\(on\)[\s\S]*?rememberSongLayout\(\)/.test(entry)
  && /function showOsk\(on\)[\s\S]*?rememberSongLayout\(\)/.test(entry),
  'opening and closing the keyboard or either note editor updates its song layout');
assert(/const DESK_SESSION_KEY = 'mash-mixer-desk-session'/.test(entry)
  && /function currentDeskSession\(\)[\s\S]*?song: trackId[\s\S]*?lane: selectedLane[\s\S]*?selection: selectedBar[\s\S]*?position:[\s\S]*?loop: \{ on: loopOn, locA, locB \}[\s\S]*?lowerView[\s\S]*?effectsOpen[\s\S]*?voiceEditor[\s\S]*?popup: currentPopupSession\(\)/.test(entry)
  && /addEventListener\('beforeunload'[\s\S]*?rememberDeskSession\(\)/.test(entry)
  && /document\.addEventListener\('visibilitychange'[\s\S]*?rememberDeskSession\(\)/.test(entry),
  'one versioned desk snapshot captures transport, selections, windows and popups on reload or tab discard');
assert(/function restoreDeskSession\([\s\S]*?session\.song !== trackId[\s\S]*?selectLane\(lane\)[\s\S]*?markBar\([\s\S]*?loopOn = session\.loop\?\.on === true;[\s\S]*?jumpTo\([\s\S]*?setLowerView\([\s\S]*?setDevicesFolded\([\s\S]*?restoreDeskPopup/.test(entry)
  && /if \(sessionMatches\) restoreDeskSession\(savedDeskSession\)/.test(entry),
  'session restore waits for the song, then parks without autoplay and restores the working loop and surfaces');
assert(/viewState: \(\) => \(\{[\s\S]*?top: scrollAt\.top, left: scrollAt\.left, followX,[\s\S]*?selection: \[\.\.\.selection\]/.test(barGrid)
  && /restoreViewState\(state\)[\s\S]*?scroll\.scrollTop[\s\S]*?scroll\.scrollLeft/.test(barGrid)
  && /viewState: grid\.viewState/.test(piano)
  && /viewState: grid\.viewState/.test(seq),
  'piano-roll and pattern viewports expose reload-safe scroll and note-selection state');

// The two note editors, and the effects rack, are THREE separate places.
//
// This began as one panel with two views and one button, which made the roll and the kit
// exclusive — you could not look at the bassline and the drums together. Splitting the
// views apart fixed that; the roll then became its own panel (`#notes`) rather than a view
// hosted inside the effects region, which is what removed `deskView` altogether.
//
// So the claim is no longer "the roll is a view inside the effects region". It is that
// there are three independent surfaces and none of them can put another away:
//   #notes    a desk region, in the elastic chain, holding the piano roll
//   #devices  a desk region of its own, natural or dragged height, outside the chain
//   #stepseq  a floating window, outside #desk entirely
const notesAt = shell.indexOf('<div id="notes">');
const rollAt = shell.indexOf('<div id="pianoroll">');
const stepseqAt = shell.indexOf('<div id="stepseq">');
assert(notesAt > 0 && rollAt > notesAt && rollAt < devices,
  'the piano roll lives in its OWN desk region (#notes), above the effects panel');
assert(devices > notesAt,
  'and the effects panel is a sibling of it, not its host — no view switch between them');
const rollSrc = readFileSync(new URL('../tools/mixer-piano-roll.js', import.meta.url), 'utf8');
// The roll's header row is empty, and that is the point. It once held a lane picker (the
// channel is chosen on the desk), an octave nudge (the whole instrument is there to
// scroll), a root and a scale (the on-screen keyboard owns the key), `Find the part`, and
// the grid's scope switch — every one of them either a second way to do something the desk
// already does or a decision the roll should not be asking for, on the row that has to stay
// readable while notes are drawn under it.
assert(!/ssqlane-pick|ssqoctbtn|ssqscalekind|ssqroot|Find the part/.test(rollSrc)
  && !/setLane|setScale|SCALES\b|headerExtra/.test(rollSrc),
  'the roll puts nothing in the notes header');
// `headerHost` stays: it is also what keeps the grid from building a second header inside
// the scroll area, and a host given nothing to hold gets no bar at all rather than an
// empty span holding a gap open in someone else\'s header.
assert(/headerHost:\s*\(\)\s*=>\s*document\.getElementById\('notehead'\)/.test(rollSrc)
  && /if \(kids\.length\) \{/.test(barGrid),
  'and an empty host bar is never appended');
// What is left — note length, zoom, and what the mouse does — sits in the blank left half
// of the key column, beside the field each control acts on rather than at the far end of
// a header row. The fields themselves are pinned further down, with the rest of that gutter's rules;
// this is the one measurement that keeps them OFF the keys: `.ssqkey` starts at 50% + 3px,
// so that is where the panel has to stop.
assert(/#pianoroll \.rollzoom-panel \{[^}]*width:\s*calc\(50% \+ 3px\)/s.test(shell),
  'the control gutter ends exactly where the key faces begin');
assert(/scopeToggle:\s*false/.test(rollSrc)
  && /scopeToggle = true/.test(barGrid)
  && /let linked = scopeToggle &&/.test(barGrid),
  'the roll edits the bar you click, with no scope switch and nothing remembered to'
  + ' change that behind its back');
assert(/const previewNotes = new Map\(\)[\s\S]*?const releaseRollNotes = \(\) => \{[\s\S]*?Audio\.releasePreviewNote\(laneKey, freq\)/.test(rollSrc)
  && /preview: previewRollNote,[\s\S]*?previewRelease: releaseRollNotes/.test(rollSrc),
  'piano-roll previews release every sustained pitch when the drawing gesture ends');
assert(/pointerdown[\s\S]*?previewRollNote\(row\)[\s\S]*?pointerup[\s\S]*?endRollGesture/.test(rollSrc),
  'piano-roll key previews also have an explicit pointer note-off');
// A sweep up the keyboard is one gesture looking for one note: the key you leave comes
// up as the key you arrive at goes down. `elementFromPoint` is the only thing that can
// say which key that is — the pointer is captured by the key you pressed, so neither
// `pointerenter` nor `:hover` ever reaches the rest of the board.
assert(/key\.addEventListener\('pointermove'[\s\S]*?document\.elementFromPoint[\s\S]*?closest\?\.\('\.ssqkey'\)/.test(rollSrc)
  && /if \(!next \|\| next === heldKey\) return;[\s\S]*?releaseRollNotes\(\);[\s\S]*?previewRollNote\(/.test(rollSrc)
  && /setPointerCapture/.test(rollSrc),
  'sweeping the roll’s keyboard glides — the note you were holding is released as the'
  + ' next one sounds, and the gesture is captured so it can end off the board');
// The one that matters: a triggerAttack with no release is a tone that runs under the
// whole song. Every ending has to reach the same teardown, INCLUDING the endings the
// key element cannot see — a virtual redraw can destroy it mid-gesture, and a listener
// on a node that no longer exists releases nothing.
assert(/const endRollGesture = \(\) => \{\s*releaseRollNotes\(\);\s*holdRollKey\(null\);/.test(rollSrc)
  && /for \(const type of \['pointerup', 'pointercancel'\]\) \{\s*addEventListener\(type, endRollGesture\);/.test(rollSrc)
  && /addEventListener\('blur', endRollGesture\)/.test(rollSrc)
  && /if \(document\.hidden\) endRollGesture\(\)/.test(rollSrc)
  && /pointerdown[\s\S]*?endRollGesture\(\);\s*previewRollNote\(row\)/.test(rollSrc),
  'and no sweep can leave a note stuck: pointer up, cancel, the window losing focus, the'
  + ' tab going away and the next key press all run the same release');
// Your finger and the playhead are two different lights. `playing` is cleared wholesale
// every step, so a held key drawn with it would go dark twice a beat while the song runs.
assert(/heldKey\?\.classList\.remove\('held'\)/.test(rollSrc)
  && /heldKey\?\.classList\.add\('held'\)/.test(rollSrc)
  && /#pianoroll \.rollwhite \.ssqkey\.held \{[^}]*background-color:\s*var\(--accent\)/s.test(shell)
  && shell.indexOf('.ssqkey.held') > shell.indexOf('.ssqkey.playing'),
  'the key under your finger has its own mark, declared after playback so it wins while'
  + ' the song is running under it');
// The roll's own control row is still gone — including `#devhead .ssqhostbar`, which
// styled it back when the roll and the effect cards were two views of one region. The
// only `.ssqhostbar` the stylesheet knows about now is the KIT's, in its own strip.
assert(!/#devhead \.ssqhostbar/.test(shell)
  && /#notehead \.ssqhostbar \{/.test(shell),
  'the only control row with rules is the one that is built');
assert(stepseqAt > shell.indexOf('</main>'),
  'while the step grid is a floating window outside the desk regions altogether');
assert(/#stepseq \{[^}]*position:\s*fixed[^}]*z-index:\s*13/s.test(shell)
  && /#stepseq \.ssqhead \{[^}]*cursor:\s*grab/s.test(shell)
  // The WINDOW hands the grid no host, so the grid builds it that header. The docked kit
  // is the same factory with a host, and it is the flag that tells the two apart.
  && /createStepSeq\(\{[\s\S]*?el: \$\('stepseq'\)[\s\S]*?\n\}\);/.exec(entry)?.[0]
       .includes('headerHost') === false,
  'the step grid is a draggable window with a header of its own, not a hosted view');

// ---- the kit, docked in the Notes panel ------------------------------------------
//
// The same pattern editor, in the room a percussion channel used to leave empty. Second
// INSTANCE, not second file: the house figures, the kits, the row order and the write
// path are the kit itself and there has to be one of each.
const kitAt = shell.indexOf('<div id="kitroll">');
assert(kitAt > shell.indexOf('<div id="pianoroll">') && kitAt < shell.indexOf('<div id="mixhead">')
  && kitAt < shell.indexOf('</main>'),
  'the kit is the roll\'s sibling inside the Notes panel, not a third region and not a window');
assert(/createStepSeq\(\{[\s\S]*?el: \$\('stepseq'\)/.test(entry)
  && /createStepSeq\(\{[\s\S]*?el: \$\('kitroll'\)/.test(entry)
  && !entry.includes('mixer-drum-roll.js')
  && /const kitRoll = createStepSeq\(\{[\s\S]*?docked: true,\s*\n\s*wholeSong: true,\s*\n\s*scopeToggle: false/.test(entry)
  && /const kitRoll = createStepSeq\(\{[\s\S]*?headerHost: \(\) => \$\('notehead'\)/.test(entry),
  'one factory and two instances: the window keeps its bars and its shared-editing switch,'
  + ' the docked kit shows the whole song and edits the bar you click');
// The kit is the pattern editor and looks like it: pads, a gap on every beat, a wider
// one at every bar line, a ring round the playing square. So the FIELD's geometry cannot
// be arithmetic — a grid whose bars are not all the same width (the first has no bar line
// in front of it) has no bar width to multiply by, and a spacer sized that way walks the
// song away from the ruler it is counted by. It is measured off the ruler instead, which
// is built whole while the rows are windowed.
assert(!/#kitroll \.ssqcell \{/.test(shell)
  && !/#kitroll \.gap/.test(shell)
  && !/#kitroll \.ssqcells \{/.test(shell)
  && /function fieldX\(b, i\)[\s\S]*?if \(cell\) return cell\.offsetLeft - cells\[0\]\.offsetLeft;/.test(barGrid)
  && /function barGap\(\)[\s\S]*?parseFloat\(getComputedStyle\(cell\)\.marginLeft\) \|\| 0/.test(barGrid)
  && /function colWindow\(\)[\s\S]*?edges\.push\(edgeAt\(b\) \?\? 0\)/.test(barGrid)
  // And it is read off one held element rather than a querySelectorAll per bar: this
  // runs on every scroll frame and again on every step of playback.
  // Its own list, not the container's `children`: the selection band lives in that
  // container too, so `children[0]` was the band and every measurement taken off "cell
  // zero" was taken off the thing the measurement was positioning.
  && /const rulerCells = \(\) => barCells;/.test(barGrid)
  && /if \(cls === 'ssqbars'\) barCells\.push\(n\);/.test(barGrid),
  'the docked kit keeps the pattern editor\'s own pads and spacing, and the field measures'
  + ' the ruler rather than multiplying a step width by sixteen');
// The kit's controls go in the panel's own header row, beside its name — the row a region
// already has, rather than a second row of chrome under it eating the field. They are
// built only when there are any, so the roll gets no bar and no gap where one would be,
// and they go with the editor: a folded panel has nothing on screen to control.
assert(/#notehead \.ssqhostbar \{[^}]*display:\s*flex/s.test(shell)
  && /#notes\.collapsed #notehead \.ssqhostbar \{[^}]*display:\s*none/s.test(shell)
  // A hidden editor is not rebuilt, so its controls have to be taken out of the header
  // by the same class that took its field out of the panel.
  && /#notes\.kitless #notehead \.ssqhostbar\[data-of="kit"\] \{[^}]*display:\s*none/s.test(shell)
  && /bar\.dataset\.of = ns;/.test(barGrid)
  && /headerHost: \(\) => \$\('notehead'\)/.test(entry)
  && /const kids = \[\.\.\.lead\(c\), \.\.\.headerExtra\(c\), \.\.\.scopeEls\];\s*\n\s*if \(kids\.length\) \{/.test(barGrid)
  && !/rulerHeaderAt/.test(barGrid)
  && !shell.includes('id="kitbar"')
  && /#kitroll \{[^}]*--keys:\s*calc\(var\(--contentx\) - var\(--capx\)\)/s.test(shell),
  'the kit\'s controls sit in the panel header and fold away with it, and a panel with no'
  + ' controls to contribute gets no bar at all');
// How far a one-bar figure goes, and what it does to what is already there. Both are
// CHOSEN — in the menu about to act, cycled in place so the change is visible before a
// figure is picked — and both are remembered, so the same click keeps meaning one thing.
assert(/const scope = \(\) => \{[\s\S]*?actionRange \? \(actionRange\(\) \|\| range\) : \(wholeSong \? sel\(\) : range\)/.test(barGrid)
  && /actionRange: applyBars \? \(\) => applyBars\(figureScope\) : null/.test(seq)
  && /applyBars: \(kind\) => \{[\s\S]*?if \(kind === 'song'\) return null;[\s\S]*?if \(kind === 'selection' && selectedBar\)/.test(entry)
  && /function layDown\(byLane, \{ add = false \} = \{\}\) \{[\s\S]*?const a = scope\(\);[\s\S]*?for \(let b = a\.from; b <= a\.to; b\+\+\)/.test(barGrid)
  && /const was = add \? readBar\(b, lane\) : null;[\s\S]*?figure\.map\(\(on, i\) => \(on \|\| !!was\?\.\[i\]\)\)/.test(barGrid)
  && /function toggleMute\(lane\) \{[\s\S]*?setLanesOff\(draft\(\), a\.from, a\.to/.test(barGrid)
  // And the title says which bars, in words, above the items about to write them.
  && /\? 'the whole song' : barWords\(a\)/.test(barGrid),
  'a figure lands in the bar being played, the bars you select or the whole song, and'
  + ' either replaces what the row plays or adds to it');
// And the RULER says which bars they are — the timeline's own way of saying it about
// the same selection, rather than a wash over the steps you are trying to read. Both
// note editors draw it, and both let you make it: the ruler is a control here as it is
// on the timeline, with the same shift-extend and the same drag.
assert(/n\.className = 'ssqbarnum' \+ stepClasses\(b, i\) \+ \(inSel \? ' insel' : ''\)/.test(barGrid)
  && /const picked = selectedBars\?\.\(\) \|\| null;/.test(barGrid)
  && !barGrid.includes('scopeBand')
  // The timeline's own gradient, drawn as ONE band per strip: 45° stripes on a 22px box
  // restart at every box, which is a seam every twenty-two pixels instead of a hatch.
  // One band over the whole ruler, not one per strip: two of them is two blocks with a
  // seam and the hatch angle starting again in the second.
  && /function placeSelBand\(\)[\s\S]*?selBand\.classList\.add\('show'\)/.test(barGrid)
  && /:is\(#pianoroll,#kitroll\) \.ssqselclip \{[^}]*z-index:\s*11[^}]*overflow:\s*hidden[^}]*left:\s*calc\(var\(--keys\) \+ var\(--keyseam\)\)/s.test(shell)
  && /:is\(#pianoroll,#kitroll\) \.ssqselband \{[^}]*translateX\(calc\(-1 \* var\(--roll-scroll-x, 0px\)\)\)/s.test(shell)
  && /:is\(#pianoroll,#kitroll\) \.ssqselband \{[^}]*repeating-linear-gradient\(45deg,/s.test(shell)
  && /:is\(#pianoroll,#kitroll\) \.ssqselband \{[\s\S]*?var\(--selected-ink\) 13%/s.test(shell)
  && /#selregion \{[^}]*repeating-linear-gradient\(45deg,/s.test(shell)
  && /:is\(#pianoroll,#kitroll\) \.ssqruler \.ssqbarnum \{[^}]*cursor:\s*pointer/s.test(shell),
  'the bars picked out are hatched on the ruler exactly as the timeline hatches the same'
  + ' selection — not washed over the steps');
// The drag is delegated from the panel root and finished on the window, because marking
// a selection repaints the panel: a listener on the cell would hear one move and no more.
assert(/if \(onSelectBars\) \{[\s\S]*?el\.addEventListener\('pointerdown'[\s\S]*?if \(ev\.shiftKey && cur\) \{ rulerDrag = \{ anchor: cur\.from \}; onSelectBars\(cur\.from, b\); return; \}/.test(barGrid)
  && /addEventListener\('pointermove', \(ev\) => \{\s*\n\s*if \(!rulerDrag/.test(barGrid)
  && /const cell = document\.elementFromPoint\(ev\.clientX, ev\.clientY\)\?\.closest\?\.\('\.ssqbarnum'\)/.test(barGrid)
  && (entry.match(/onSelectBars: \(from, to\) => markBar\(selectedBar\?\.key \?\? null, from, to, \{ focus: false \}\)/g) || []).length === 2
  // …and without re-centring: the bars are already in front of you, and centring on
  // every move of that drag walks the field out from under the pointer.
  && /function markBar\(key, from, to = from, \{ focus = true, deferEditors = false \} = \{\}\)/.test(entry)
  && /if \(focus\) \{\s*\n\s*pianoRoll\.focusRange/.test(entry)
  && /selectedBars, onSelectBars,/.test(piano),
  'and both editors can SET it from their ruler — one selection, changed wherever you'
  + ' happen to be looking');
assert(/timelineDrag = \{ anchor, moved: false, last: bar \}/.test(entry)
  && /if \(bar === timelineDrag\.last\) return;[\s\S]*?deferEditors: true/.test(entry)
  && /function scheduleSelectionEditors\(\{ defer = false \} = \{\}\)[\s\S]*?selectionEditorsDirty = true;[\s\S]*?if \(defer\) return;/.test(entry)
  && /function markBar\(key, from, to = from, \{ focus = true, deferEditors = false \} = \{\}\)[\s\S]*?scheduleSelectionEditors\(\{ defer: deferEditors \}\)/.test(entry)
  && /\$\('barsarea'\)\.onpointerup = \(\) => \{\s*if \(timelineDrag\) scheduleSelectionEditors\(\)/.test(entry)
  && /box\.onpointerenter = \(\) => \{[\s\S]*?deferEditors: true/.test(entry)
  && /addEventListener\('pointerup', \(\) => \{\s*if \(dragSel\?\.moved\) scheduleSelectionEditors\(\)/.test(entry),
  'range drags update their lightweight bands per changed bar and rebuild note editors once on release');
// And put it away again. A ruler that can only ever select has no way out of a selection,
// and every action on this panel reads "the bars I select" differently once there are none.
assert(/if \(cur && b >= cur\.from && b <= cur\.to\) \{ rulerDrag = \{ anchor: b, armed: true \}; return; \}/.test(barGrid)
  && /if \(rulerDrag\.armed\) \{\s*\n\s*if \(b === rulerDrag\.anchor\) return;\s*\n\s*rulerDrag\.armed = false;/.test(barGrid)
  && /const endDrag = \(\) => \{\s*\n\s*if \(rulerDrag\?\.armed\) onSelectBars\(null\);/.test(barGrid)
  && /function markBar\(key, from, to = from, \{ focus = true, deferEditors = false \} = \{\}\) \{\s*\n\s*selectedBar = from != null \?/.test(entry),
  'a click on a region you already have puts it away, while holding the press and'
  + ' dragging starts a new one from that bar');
// And a way out that needs no aim. A selection is a mode — it decides what a groove lands
// in, what a region edit acts on, what the loop plays — so the toolbar names it beside the
// bar and the tempo, and carries the one control that unambiguously means "put it away".
assert(/<button id="selclear"/.test(shell)
  && /function syncSelReadout\(\)[\s\S]*?stat\.hidden = !selectedBar;[\s\S]*?from === to \? `\$\{from \+ 1\}` : `\$\{from \+ 1\}-\$\{to \+ 1\}`/.test(entry)
  && /function redrawSelection\(\) \{\s*\n\s*syncSelReadout\(\);/.test(entry)
  && /\$\('selclear'\)\.onclick = \(ev\) => \{ ev\.stopPropagation\(\); markBar\(null, null\); \}/.test(entry),
  'the toolbar names the bars picked out and carries the ✕ that clears them');
// And the loop, on that same readout: `currentLoopBounds` reads the picked-out bars
// before anything else, so "loop" has always meant "loop these" — it was only the UI that
// kept them apart. Two buttons over one state, so the readout hears about either.
// One control, two halves: the switch, and the bars it switches over. They were always
// one thing — `currentLoopBounds` reads the picked-out bars before anything else — and
// standing at opposite ends of the toolbar was the only reason they did not look it.
assert(/<span class="loopsel">\s*\n\s*<button id="looptoggle"/.test(shell)
  && /<span class="selrange" id="selstat" hidden/.test(shell)
  && /\.loopsel #looptoggle \{[^}]*border-top-right-radius:\s*0/s.test(shell)
  && /\.selrange \{[^}]*border-radius:\s*0 6px 6px 0/s.test(shell)
  && /\.selrange\[hidden\] \{[^}]*display:\s*none/s.test(shell)
  && /function currentLoopBounds\(\)[\s\S]*?if \(selectedBar\) \{/.test(entry)
  && /function syncLoopButton\(\)[\s\S]*?syncSelReadout\(\);/.test(entry)
  && /\$\('looptoggle'\)\.title = loopOn/.test(entry),
  'the loop switch and the bars it plays are one control, and the range half goes away'
  + ' when there are no bars to name');
// The note editors are drawn from the bar list, so an edit to the SHAPE has to reach
// them — repeating bars used to repaint the arrangement and leave the editor below it
// drawing the bars the song no longer had.
assert(/const planBefore = render \? JSON\.stringify\(arrDraftOf\(\)\?\.plan \?\? null\) : null;/.test(entry)
  && /if \(JSON\.stringify\(next\?\.plan \?\? null\) !== planBefore\) \{\s*\n\s*stepSeq\.refresh\(\);\s*\n\s*pianoRoll\.refresh\(\);\s*\n\s*kitRoll\.refresh\(\);/.test(entry),
  'a change to the bars themselves repaints the note editors, and a note edit does not —'
  + ' the panel that made it has already redrawn, and a whole-song field is not cheap');
assert(/const SCOPES = \[\s*\n\s*\['bar', 'the bar being played'\]/.test(seq)
  && /let figureScope = readStored\(SCOPE_KEY/.test(seq)
  && /let figureAdds = readStored\(MODE_KEY/.test(seq)
  && /function scopeButton\(\)[\s\S]*?Apply to: \$\{at\[1\]\} ▾[\s\S]*?setFigureScope\(id\); grid\.refresh\(\);/.test(seq)
  && /function modeButton\(\)[\s\S]*?figureAdds \? 'Add' : 'Replace'[\s\S]*?setFigureAdds\(!figureAdds\)/.test(seq)
  && /headerExtra: \(\) => \[kitButton\(\), grooveButton\(\), \.\.\.\(docked \? \[scopeButton\(\)\] : \[\]\), modeButton\(\)\]/.test(seq)
  && !seq.includes('settingItems'),
  'both settings are controls on that strip rather than lines inside the menus they'
  + ' govern — the scope only where a panel shows more than it acts on');
// One list of rhythms, the same on every row. Per-lane figure lists meant the same menu
// in the same place held something different on each line, so there was nothing to learn.
assert(/const FIGURES = \[/.test(seq)
  && !seq.includes('PATTERNS')
  && /const items = FIGURES\.map\(\(\[label, s\]\) => \(\{/.test(seq)
  && /\['Sixteenths', 'xxxxxxxxxxxxxxxx'\]/.test(seq)
  && /\['On the 4', '\.\.\.\.\.\.\.\.\.\.\.\.x\.\.\.'\]/.test(seq)
  // Named the way the figures are said out loud, and no near-duplicates: the & of 2
  // and 4 is two hits of the offbeat, and belongs to the House grooves rather than to
  // a row's own list.
  && /\['Offbeat', OFFBEAT\]/.test(seq)
  && /\['Four on the floor', FOUR\]/.test(seq)
  && /add: figureAdds/.test(seq)
  && !/\[[^\]]*', AND\]/.test(/const FIGURES = \[[\s\S]*?\];/.exec(seq)?.[0] || ''),
  'every drum is offered the same rhythms — a rhythm is not the property of a drum, and'
  + ' a menu that holds a different list on every row is one you have to open to read');
assert(/onPickLane: \(lane, el\) => \{[\s\S]*?selectLane\(lane\);[\s\S]*?openVoicePicker\(/.test(entry)
  && /if \(onPickLane\) \{[\s\S]*?name\.onclick = \(ev\) => onPickLane\(row\.lane, ev\.currentTarget\);[\s\S]*?\} else \{[\s\S]*?name\.onclick = \(\) => grid\.toggleMute\(row\.lane\);/.test(seq)
  && /#kitroll \.ssqlane\.current \.ssqhead-cell \{[^}]*var\(--accent\)/s.test(shell),
  'docked, a track name is the channel AND its preset — it puts the desk on that drum and'
  + ' opens the library at it; in the window it is still the arrangement mute it was');
// A kit is SOUNDS. One edit, so one ⌘Z takes the whole kit back off — a loop over
// setLaneVoice would be six edits, six re-banks and six steps to undo.
const applyKitFn = /function applyKit\(name, voices\)[\s\S]*?\n\}/.exec(entry)?.[0] || '';
assert(applyKitFn.match(/editMix\(/g)?.length === 1
  && !applyKitFn.includes('setLaneVoice(')
  && /applyKit: \(name, voices\) => applyKit\(name, voices\)/.test(entry)
  && /export const KITS = \[/.test(seq),
  'a whole kit of sounds is one mix edit and one undo step, and never touches a step');
assert(/kitRoll\.songChanged\(\)/.test(entry)
  && /function paintSelectionEditors\(\)[\s\S]*?kitRoll\.refresh\(\)/.test(entry)
  && /pianoRoll\.armFollow\?\.\(\);\s*\n\s*kitRoll\.armFollow\?\.\(\);/.test(entry)
  && /pianoRoll\.focusRange\(([^;\n]+)\);\s*\n(\s*\/\/[^\n]*\n)*\s*kitRoll\.focusRange\(\1\);/.test(entry),
  'and the kit is wired wherever the roll is: the song changing, the selection moving,'
  + ' the transport arming and following');
// A window needs the desk's standard close, and this one wears `.popclose` — but an ID in
// front of a class beats a bare class, so the panel's own small-control rule was silently
// shrinking it back to the 11px × that `.popclose` exists to abolish. The `:not()` is what
// keeps them apart, and `.ssqx.ssqadd` is what stops the guard outranking the `+`.
assert(/createBarGrid[\s\S]*?shut\.className = 'ssqx popclose'/.test(
  readFileSync(new URL('../tools/mixer-bar-grid.js', import.meta.url), 'utf8')),
  'the window\'s close is the desk\'s shared one, not a mark of its own');
assert(/:is\(#stepseq,#pianoroll,#kitroll\) \.ssqx:not\(\.popclose\)/.test(shell)
  && !/:is\(#stepseq,#pianoroll,#kitroll\) \.ssqx \{/.test(shell)
  && /:is\(#stepseq,#pianoroll,#kitroll\) \.ssqx\.ssqadd \{[^}]*font-size:\s*17px/s.test(shell),
  'and the panel\'s small controls cannot shrink it, nor the guard shrink the +');
// Mixer, Piano Roll and Pattern are mutually exclusive lower-workspace views. Their
// DOM survives the switch, preserving scroll/selection state without panel collapse.
assert(/\$\('seqbtn'\)\.onclick = \(\) => setLowerView\('pattern'\)/.test(entry),
  'the Pattern button selects the lower Pattern workspace');
assert(/\$\('rollbtn'\)\.onclick = \(\) => setLowerView\('roll'\)/.test(entry),
  'and the Piano Roll button selects the lower Piano Roll workspace');
assert(/\$\('mixviewbtn'\)\.onclick = \(\) => setLowerView\('mixer'\)/.test(entry)
  && /for \(const \[id, on\] of \[\['mixviewbtn',[\s\S]*?\['rollbtn',[\s\S]*?\['seqbtn'/.test(entry),
  'the three toolbar buttons are one mutually exclusive lower-workspace switch');
assert(/function setNotesFolded[\s\S]*?needsBuild = !on && !pianoRoll\.isOpen\(\)/.test(entry)
  && /function schedulePianoRollOpen\([\s\S]*?pianoRoll\.open\(true\)/.test(entry),
  'opening Notes after a folded startup initializes the roll after the layout task');

// The header's controls. They had grown five different heights and four different widths,
// which reads as a row that was never set. One variable governs the height of everything
// in it, and the icon-only buttons are square at that number — so a new button cannot
// quietly reintroduce a fifth size by carrying its own padding.
// The variable is on :root rather than on `header`: the panel folds down the left edge
// are the same square as the hamburger, and a header-scoped variable put them out of reach.
assert(/--ctlh: 30px; --ctlicon: 17px;/.test(shell)
  && /header button, header select \{ height: var\(--ctlh\)/.test(shell)
  && /header \.iconbtn \{ width: var\(--ctlh\); padding: 0;/s.test(shell)
  && /header \.iconbtn > svg \{ width: var\(--ctlicon\); height: var\(--ctlicon\); \}/.test(shell),
  'one control height across the header, with square icon buttons at that height');
// Lane numbers begin at the panel-caption edge and reserve only enough room for two
// digits. The fold buttons are hidden in this layout, so spending their full 30px square
// on every number only pushed the useful track identity/control area to the right.
assert(/\.foldbtn \{ width: var\(--ctlh\); height: var\(--ctlh\);/.test(shell)
  && /\.arrnum \{[^}]*grid-column:\s*1[^}]*grid-row:\s*1 \/ span 2[^}]*width:\s*var\(--arrnum\)[^}]*text-align:\s*left/s.test(shell),
  'the panel folds keep the hamburger square while lane numbers align to the caption edge');
const header = shell.slice(shell.indexOf('<header>'), shell.indexOf('</header>'));
const iconOnly = ['navbtn', 'playstart', 'stop', 'play', 'pause', 'clearsolo',
  'oskbtn', 'seqbtn', 'rollbtn', 'presetbtn'];
assert(iconOnly.every((id) => new RegExp(`id="${id}"[^>]*class="[^"]*\\biconbtn\\b`)
  .test(header) || new RegExp(`class="[^"]*\\biconbtn\\b[^"]*"[^>]*id="${id}"`).test(header)),
  'every icon-only header button wears the square box');
assert(!/\.transport button \{[^}]*(width|height):/s.test(shell)
  && !/#clearsolo \{[^}]*(width|height):/s.test(shell)
  && !/#presetbtn \{[^}]*(width|height):/s.test(shell)
  // `(?<!-)` so `stroke-width` on the hamburger is not read as a size.
  && !/\.(oskicon|seqicon|rollicon|preseticon|hamburger) \{[^}]*(?<!-)width:/s.test(shell),
  'and none of them sizes itself, so the row cannot drift apart again');
assert(/<div id="mastertoolbar" class="grp"[^>]*aria-label="Master volume"><\/div>/.test(header)
  && /function masterToolbarBlock\(\{ value, onInput, onReset, title \}\)/.test(entry)
  && /master-fader-rail/.test(entry)
  && /master-fader-readout/.test(entry)
  && !/mastertoolbar-label/.test(entry)
  && /meter\.className = 'meter stereo toolbar-meter'/.test(entry)
  && /function setMasterControlValue\(value, tag = null\)[\s\S]*?Audio\.mixer\?\.setMasterTrim\(value\)[\s\S]*?syncMasterControls\(value\)/.test(entry)
  && /meters\.push\(\{ key: '__master-toolbar', master: true, horizontal: true,[\s\S]*?masterToolbarControl\.chans/.test(entry)
  && /mt\.horizontal\) ch\.fill\.style\.width/.test(entry)
  && /const v = mt\.master \|\| mt\.key === '__master' \? Audio\.mixer\.masterLevels\(\)/.test(entry)
  && /#mastertoolbar \.master-fader-rail \{[^}]*height:\s*34px/s.test(shell)
  && /header \.sp \{[^}]*display:\s*none/s.test(shell)
  && /#mastertoolbar \{[^}]*flex:\s*1 1 250px/s.test(shell)
  && /#mastertoolbar \{[^}]*justify-content:\s*center/s.test(shell)
  && /#mastertoolbar \.mastertoolbar-control \{[^}]*width:\s*min\(100%,\s*300px\)/s.test(shell)
  && /#mastertoolbar input\.master-fader::-webkit-slider-thumb \{[^}]*border-radius:\s*50%/s.test(shell)
  && /#mastertoolbar \.meter\.toolbar-meter \{[^}]*height:\s*18px/s.test(shell),
  'the toolbar exposes one larger horizontal stereo master slider on the shared master bus');
// The two-pixel top and bottom are written through --roll-rowpad-top and
// --roll-rowpad-bottom, which are zero on every row but the field's first and last —
// those two are taller than their pitch by the keyboard's caps (see renderRows), and a
// note in them must still be drawn the size of every other note.
assert(/#pianoroll \.ssqcell\.on::before \{[\s\S]*?inset:\s*calc\(2px \+ var\(--roll-rowpad-top, 0px\)\) auto\s*calc\(2px \+ var\(--roll-rowpad-bottom, 0px\)\) 1px;[\s\S]*?width:\s*(?:max\(2px,\s*)?calc\(var\(--len, 1\) \* 100% - 2px\)\)?/.test(shell)
  && /#pianoroll \.ssqcell\.on\.atedge::after \{[\s\S]*?top:\s*calc\(2px \+ var\(--roll-rowpad-top, 0px\)\);[\s\S]*?bottom:\s*calc\(2px \+ var\(--roll-rowpad-bottom, 0px\)\)/.test(shell),
  'piano-roll note marks leave a clear vertical gap and a smaller horizontal gap');
assert(/export function quantiseLength\(len, grid = 1\)/.test(barGrid)
  && /export const MIN_NOTE_LENGTH = 0\.25/.test(barGrid)
  && /const next = Math\.max\(MIN_NOTE_LENGTH,[\s\S]*?toFixed\(6\)\)\);/.test(barGrid)
  && /function quantiseLengths\(scopeKind, grid = 1\)/.test(barGrid)
  && /quantiseLengths: \(\{ scope = 'selection', grid: gridSize = 1 \}/.test(piano)
  && /grid\.quantiseLengths\(\{ scope, grid: gridSize \}\)/.test(piano)
  && /Quantise lengths to 16ths/.test(entry)
  && /Custom transform all notes/.test(entry)
  && /title="Transform selected piano-roll notes"/.test(shell),
  'piano-roll lengths stay freehand by default, with transform and exact quantise commands');
assert(/const openNoteLengthAdjust = \(scopeKind, x, y\) => \{[\s\S]*?heading\.textContent = 'Adjust note lengths'[\s\S]*?range\.type = 'range'[\s\S]*?number\.type = 'number'[\s\S]*?Apply length[\s\S]*?closeMenu\(\);/.test(entry)
  && /openNoteLengthAdjust\('selection', r\.left, r\.bottom \+ 4\)/.test(entry)
  && /openNoteLengthAdjust\('all', r\.left, r\.bottom \+ 4\)/.test(entry)
  && /number\.min = '1'; number\.step = '1'/.test(entry)
  && !/\bprompt\(/.test(entry)
  && /#regionedit/.test(shell),
  'note-length adjustment uses the mixer inspector with exact numeric input and no browser prompt');
// A row carrying a cap is taller than its pitch, so the nearest-row arbitration takes the
// cap back off before it measures a centre — and the scroller keeps no air under the
// field, or the rules stop short of the bar the field scrolls on.
assert(/const lead = Number\(rowEl\.dataset\.lead\) \|\| 0/.test(barGrid)
  && /const trail = Number\(rowEl\.dataset\.trail\) \|\| 0/.test(barGrid)
  && /const centre = rect\.top \+ lead \+ \(rect\.height - lead - trail\) \/ 2/.test(barGrid)
  && /#pianoroll \.ssqscroll \{[^}]*padding-bottom:\s*0/s.test(shell),
  'the folded caps move no note hit region, and the field runs down to the scrollbar');
// --keytrim narrows the key column and shifts the roll left by the same number of
// pixels, so it has to come off BOTH the width and the panel's left padding.
assert(/#pianoroll \{[^}]*--keytrim:\s*\d+(?:\.\d+)?px/s.test(shell)
  && /#pianoroll \{[^}]*--keys:\s*calc\(var\(--contentx\) - var\(--capx\) \+ 6px - var\(--keytrim\)\)/s.test(shell)
  // The LEFT is what this is about — the top and bottom are air and free to change.
  && /#pianoroll \{[^}]*padding:[^;]*calc\(var\(--capx\) - 6px - var\(--keytrim\)\)/s.test(shell)
  && !/ssqrules/.test(shell)
  && /#pianoroll \.ssqcell \{ box-shadow:\s*inset 1px 0 0 var\(--seam\); \}/.test(shell)
  && /#pianoroll \.ssqcell\.beat \{ box-shadow:\s*inset 1px 0 0 var\(--grid\); \}/.test(shell)
  && /#pianoroll \.ssqcell\.downbeat \{[\s\S]*?box-shadow:\s*inset 1px 0 0 color-mix\(in srgb, var\(--grid\) 75%, var\(--grid-hi\)\)/.test(shell)
  && /#pianoroll \.ssqcell\.barstart \{ box-shadow:\s*inset 2px 0 0 var\(--grid-hi\); \}/.test(shell)
  && !/#pianoroll \.ssqbarnum[^}]*box-shadow/s.test(shell)
  && /#pianoroll \.ssqkey \{[^}]*left:\s*calc\(50% \+ 3px\); right:\s*0/s.test(shell)
  && /#pianoroll \.ssqkey\.keyblack \{[^}]*left:\s*calc\(50% \+ 3px\)[^}]*width:\s*31\.5%/s.test(shell),
  'the piano faces and direct beat rules share the fixed keyboard field origin');
// The rule under the count is the field's top edge, so it starts at the field's own x=0
// rather than running across the ZOOM gutter and the head of the keyboard — and it is a
// divider, `--line`, not the bar line's `--grid-hi`.
assert(!/#pianoroll \.ssqruler \{[^}]*border-bottom/s.test(shell)
  && /#pianoroll \.ssqruler::after \{[^}]*left:\s*calc\(var\(--keys\) \+ var\(--keyseam\)\)[^}]*background:\s*var\(--line\)/s.test(shell),
  'the ruler closes over the note field only, at the same origin the field starts at');
// The key column's header cells paint nothing: the gutter beside the keys is the panel's
// own colour, and a `--panel2` strip in front of it is a stripe down the left of the roll.
assert(!/#pianoroll \.rollwhite \.ssqhead-cell \{[^}]*panel2/s.test(shell)
  && !/#pianoroll \.rollblack \.ssqhead-cell \{[^}]*panel2/s.test(shell)
  && /#pianoroll \.rollwhite \.ssqhead-cell \{[^}]*background:\s*none/s.test(shell)
  && /#pianoroll \.ssqlane:hover \.ssqhead-cell \{[^}]*background:\s*none/s.test(shell),
  'nothing paints a bed in front of the key column gutter');
// The chassis strip at the key ends must cover a GUTTER, never live canvas: a note on
// step 1 draws 1px into its cell, so an overlay sitting straight on the field clips its
// leading edge. Both scrollers carry the same --keyseam margin — the ruler as well as the
// note viewport, or the bar numbers come off their bar lines.
assert(/#pianoroll \{[^}]*--keyseam:\s*\d+(?:\.\d+)?px/s.test(shell)
  && /#pianoroll \.ssqdock::after \{[^}]*left:\s*var\(--keys\)[^}]*width:\s*var\(--keyseam\)/s.test(shell)
  && /#pianoroll \.ssqruler-track \{[^}]*margin:\s*0 0 0 var\(--keyseam\)/s.test(shell)
  && /#pianoroll \.ssqdock \.ssqscroll \{[^}]*margin-left:\s*var\(--keyseam\)/s.test(shell),
  'the key-end chassis strip covers a gutter both scrollers leave, not the first step');
assert(/#pianoroll \.ssqcell\.on \{[^}]*translateY\(var\(--roll-note-y, 0px\)\)/s.test(shell)
  && !/#pianoroll \.ssqcell\.on::before \{[^}]*translateY/s.test(shell)
  && !/#pianoroll \.ssqcell\.on\.atedge::after \{[^}]*translateY/s.test(shell)
  && /rowHeightOf:\s*\(row\) => row\.height/.test(piano)
  && /const layout = pianoLayout\(low, high, pitchUnit\)/.test(piano)
  && /rowHeight:\s*\(\) => pitchUnit/.test(piano)
  && /rowPadding:\s*\(\) => rollPadding/.test(piano)
  && /rulerHeader:\s*\(\) =>/.test(piano)
  // Four pitch factors are enough for the keyboard; the time axis has its own
  // discrete buttons so dragging cannot queue whole-song rebuilds.
  && /for \(const factor of \[0\.5, 1, 1\.5, 2\]\)/.test(piano)
  && /button\.textContent = `\$\{factor\}×`/.test(piano)
  // Which is only true while the buttons DIVIDE the gutter rather than each demanding
  // its own text's width — a fifth factor must stay a one-line change.
  && /#pianoroll \.rollzoom \{[^}]*width:\s*100%/s.test(shell)
  && /#pianoroll \.rollzoom-button \{[^}]*flex:\s*1 1 0[^}]*min-width:\s*0/s.test(shell)
  && /setPitchSize\(ROW_H \* factor\)/.test(piano)
  && /height, keyFace/.test(piano)
  && /const setPitchSize = \(next\)/.test(piano)
  && /const anchor = grid\.captureRowAnchor\(\)/.test(piano)
  && /grid\.restoreRowAnchor\(anchor\)/.test(piano)
  && /setPitchSize,/.test(piano)
  && /#pianoroll \.ssqrow\.ssqlane \{ height: var\(--roll-pitch-unit, 19px\); \}/.test(shell)
  && /#pianoroll \.rollzoom-button\.on \{[^}]*var\(--accent\)/s.test(shell)
  && /cssVars:\s*\{ '--roll-note-y': '0px' \}/.test(piano)
  && /hitOffset:\s*0/.test(piano)
  && /if \(row\.cssVars\)[\s\S]*?rowEl\.style\.setProperty\(name, value\)/.test(barGrid)
  && /const rowHeightAt = \(row\)/.test(barGrid)
  && /rowPositions = \[0\]/.test(barGrid)
  && /rowPadding = \(\) => \(\{ before: 0, after: 0 \}\)/.test(barGrid)
  && /captureRowAnchor/.test(barGrid)
  && /restoreRowAnchor/.test(barGrid)
  && /rowEl\.style\.height = `\$\{height \+ lead \+ trail\}px`/.test(barGrid),
  'the piano-roll uses grouped per-pitch row geometry without moving note hit regions');
// The room the top and bottom key faces need beyond their own rows is the KEY COLUMN'S.
// The field folds it into its first and last rows instead of opening and closing with
// cell-less spacers, so the time rules reach both edges of the panel while every row
// bottom in between stays where it was — and the key column keeps its spacers.
assert(/const headroom = win\.from === 0 \? win\.padTop : 0/.test(barGrid)
  && /const footroom = win\.to === list\.length - 1 \? win\.padBottom : 0/.test(barGrid)
  && /appendPad\(win\.padTop, \{ field: !headroom \}\)/.test(barGrid)
  && /appendPad\(win\.padBottom, \{ field: !footroom \}\)/.test(barGrid)
  && /const lead = firstRowOfField \? headroom : 0/.test(barGrid)
  && /const trail = row === rows\[rows\.length - 1\] \? footroom : 0/.test(barGrid)
  && /rowEl\.style\.setProperty\('--roll-rowpad-top', `\$\{lead\}px`\)/.test(barGrid)
  && /rowEl\.style\.setProperty\('--roll-rowpad-bottom', `\$\{trail\}px`\)/.test(barGrid)
  && /fixedRow\.style\.height = `\$\{height\}px`/.test(barGrid),
  'the field folds the keyboard caps into its end rows, so the grid reaches top and bottom');
assert(/const cellAt = \(x, y\) => \{[\s\S]*?direct\.classList\.contains\('on'\)[\s\S]*?getBoundingClientRect\(\)[\s\S]*?Number\.isFinite\(offset\)[\s\S]*?cellFor\(nearest\.key, direct\.dataset\.bar, direct\.dataset\.step\)/.test(barGrid)
  && /pointerdown', \(ev\) => \{[\s\S]*?const cell = cellAt\(ev\.clientX, ev\.clientY\)/.test(barGrid)
  && /pointermove', \(ev\) => \{[\s\S]*?const cell = cellAt\(ev\.clientX, ev\.clientY\)/.test(barGrid)
  && /const dRow = targetRow[\s\S]*?rowAtOf\(targetRow\.key\) - rowAtOf\(drag\.row\.key\)/.test(barGrid),
  'piano-roll clicks, hover and vertical drags resolve through the physical key hit map');
assert(/#pianoroll \.ssqhead-cell \{[^}]*pointer-events:\s*none/s.test(shell)
  && /#pianoroll \.ssqkey \{[^}]*pointer-events:\s*auto/s.test(shell)
  && /#pianoroll \.rollwhite \.ssqhead-cell \{[^}]*background:\s*none/s.test(shell)
  && /#pianoroll \.rollblack \.ssqhead-cell \{[^}]*background:\s*none/s.test(shell),
  'transparent pitch headers leave the tiled white faces visible and clickable beneath black keys');
assert(/if \(ruler\) \{[\s\S]*?ruler\.className = 'ssqruler'[\s\S]*?surface\.append\(keys, scroll\)/.test(barGrid)
  && /const zoom = document\.createElement\('div'\)[\s\S]*?zoom\.className = 'rollzoom-panel'[\s\S]*?zoom\.append\(\.\.\.rulerHeader\(c\)\)/.test(barGrid)
  && /if \(docked\) \{[\s\S]*?const track = document\.createElement\('div'\)[\s\S]*?track\.className = 'ssqruler-track'/.test(barGrid)
  && /rulerHeader:\s*\(\) =>/.test(piano)
  && /const fieldLabel = \(text\) => \{[\s\S]*?el\.className = 'rollzoom-label'[\s\S]*?el\.textContent = text/.test(piano)
  && /return \[fieldLabel\('CHANNEL'\), voicePicker\(\),[\s\S]*?fieldLabel\('QUANTISE'\), quantisePicker\(\),[\s\S]*?fieldLabel\('DRAW LENGTH'\), lengthPicker\(\), fieldLabel\('PITCH ZOOM'\), zoom,[\s\S]*?fieldLabel\('TIME ZOOM'\), timeZoomPicker\(\),[\s\S]*?fieldLabel\('TOOL'\), toolPicker\(\)\]/.test(piano)
  && /const TIME_ZOOM_OPTIONS = \[0\.5, 1, 1\.5, 2, 4\]/.test(piano)
  && /grid\.reflow\(\)/.test(piano)
  && /const customPicker = \(\{ label, title, idPrefix, options, value, chooseValue \}\)/.test(piano)
  && /customPicker\(\{[\s\S]*?label: 'Piano-roll quantisation'/.test(piano)
  && /customPicker\(\{[\s\S]*?idPrefix: `rollchord-\$\{kind\}`/.test(piano)
  && !/document\.createElement\('select'\)/.test(piano)
  && /export const NOTE_LENGTH_OPTIONS = \[[\s\S]*?\{ value: 0\.5, label: '1\/32' \},[\s\S]*?\{ value: 1, label: '1\/16' \},[\s\S]*?\{ value: 2, label: '1\/8' \},[\s\S]*?\{ value: 16, label: '1' \},/.test(piano)
  && /let noteAddLength = 1/.test(piano)
  && /addLength: \(\) => \(rollResizable\(lane\(\)\) \? noteAddLength : null\)/.test(piano)
  && /const drawn = paint && !isOn\(row, value\) \? addLength\(row\) \/ slotUnit\(\) : null/.test(barGrid)
  && /showLen\(cell, paint \? \(cellSpan\(row, pair\.notes\[i\] \?\? null, pair\.lengths\[i\] \?\? null, b, i\) \|\| 1\) : 1\)/.test(barGrid)
  && /const noteDrawLength = \(row, value, len\) => \{[\s\S]*?if \(drawn != null \|\| !perNoteLengthLane\(row\.lane\)\) return drawn;[\s\S]*?return 1;/.test(piano)
  && !/return effectiveToneLength\(/.test(piano)
  && /for \(const factor of \[0\.5, 1, 1\.5, 2\]\)/.test(piano)
  && /button\.dataset\.zoom = String\(factor\)/.test(piano),
  'quantise, note length, compact pitch zoom, button-based time zoom and mouse mode are titled fields in the keyboard gutter');
assert(/#pianoroll \.ssqruler-label \{[^}]*position:\s*relative[^}]*padding:\s*0/s.test(shell)
  // On the arrangement's own right-hand tag column, written as the variables that put it
  // there — the header cell's padding and the gap after it, less the roll's own trim.
  && /#pianoroll \.ssqruler-label-text \{[^}]*right:\s*calc\(var\(--namegap\) \+ var\(--arrhead-gap\) - var\(--keytrim\)\)/s.test(shell)
  && !/#pianoroll \.ssqruler-label-text \{[^}]*left:/s.test(shell)
  // `.arrpresetcat` value for value — the label it now stands under.
  && /\.arrpresetcat \{[^}]*font-size:\s*9px/s.test(shell)
  && /\.arrpresetcat \{[^}]*letter-spacing:\s*\.04em/s.test(shell)
  && /#pianoroll \.ssqruler-label \{[^}]*font-size:\s*9px[^}]*letter-spacing:\s*\.04em[^}]*line-height:\s*13px/s.test(shell)
  && /#pianoroll \.ssqruler \.ssqruler-label \{[^}]*justify-content:\s*flex-end[^}]*text-align:\s*right/s.test(shell)
  && /#pianoroll \.rollzoom-panel \{[^}]*flex-direction:\s*column[^}]*align-items:\s*flex-start/s.test(shell)
  && /#pianoroll \.rollzoom-panel \{[^}]*position:\s*absolute[^}]*pointer-events:\s*none/s.test(shell)
  && /#pianoroll \.rollzoom-panel > \* \{[^}]*pointer-events:\s*auto/s.test(shell)
  && /#pianoroll \.rollzoom-label \{[^}]*text-transform:\s*none/s.test(shell)
  // The channel strip's own row label, matched value for value — see `.row .k`.
  && /#pianoroll \.rollzoom-label \{[^}]*font-size:\s*9\.5px/s.test(shell)
  && /#pianoroll \.rollzoom-label \{[^}]*letter-spacing:\s*\.03em/s.test(shell)
  && /#pianoroll \.rollzoom-label \{[^}]*color:\s*var\(--dim\)/s.test(shell)
  // A visibly wider gap between the three fields than between a label and its control.
  && /#pianoroll \.rolltool \+ \.rollzoom-label \{[^}]*margin-top:\s*14px/s.test(shell)
  && /#pianoroll \.rollzoom \+ \.rollzoom-label \{[^}]*margin-top:\s*14px/s.test(shell),
  'the piano-roll labels sit flush against their fields with clear gaps between the three controls');
// The ruler names each strip once, in its corner, and the numbers below are bare — so a
// bar number stacks on the `1` of its own first beat instead of being pushed four
// characters right of the barline by a word the corner already said. The floating step
// grid has no corner label, so it keeps the prefix on every number.
assert(/grid\.setRulerLabel\('Bar'\)/.test(piano)
  && /strip\('ssqbars', rulerLabel, \(b, i\) => \(i === 0 \? \(rulerLabel \? `\$\{b \+ 1\}` : `Bar \$\{b \+ 1\}`\) : null\)\)/.test(barGrid)
  && /strip\('ssqnums', 'Beat',/.test(barGrid)
  && !/setRulerLabel\('Keys'\)/.test(piano)
  // And the INK lands where the box does. The boxes never disagreed — ruler cell n and
  // lane cell n are the same per-step div with every margin zeroed — but tabular figures
  // centre a `1` in a `0`-wide advance, which floated beat 1's digit off the barline its
  // cell starts on while a `6` stacked above it sat almost on one. The tracking and the
  // uppercasing went with the word they were for.
  && /#pianoroll \.ssqbarnum \{[^}]*font-variant-numeric:\s*normal/s.test(shell)
  && /#pianoroll \.ssqbars \.ssqbarnum \{[^}]*letter-spacing:\s*0[^}]*text-transform:\s*none/s.test(shell)
  // The docked kit numbers its bars the same way, for the same reason.
  && /#kitroll \.ssqbarnum \{[^}]*font-variant-numeric:\s*normal/s.test(shell)
  && /#kitroll \.ssqbars \.ssqbarnum \{[^}]*letter-spacing:\s*0[^}]*text-transform:\s*none/s.test(shell)
  // The step grid keeps both — there the number is still the phrase "Bar 12".
  && /:is\(#stepseq,#pianoroll,#kitroll\) \.ssqbarnum \{[^}]*tabular-nums/s.test(shell)
  && /:is\(#stepseq,#pianoroll,#kitroll\) \.ssqbars \.ssqbarnum \{[^}]*letter-spacing:\s*\.05em[^}]*text-transform:\s*uppercase/s.test(shell),
  'the docked roll names its ruler BAR once in the corner and numbers the bars bare, over their own beat 1');
// The mouse-mode picker is the desk's, not the platform's — and the point of that is
// the LIST. `appearance: none` only ever styled the closed box; the popup a `<select>`
// opens is the OS's, in the OS's colours, on a desk that has nine themes.
assert(/field\.className = 'rolltool'/.test(piano)
  && /menu\.className = 'rolltool-menu'/.test(piano)
  && /const toolPicker = \(\) => \{[\s\S]*?menu\.setAttribute\('role', 'listbox'\)/.test(piano)
  && /const toolPicker = \(\) => \{[\s\S]*?o\.setAttribute\('role', 'option'\)/.test(piano)
  && /#pianoroll \.rollzoom-panel \.rolltool \{[^}]*background:\s*var\(--input\)/s.test(shell)
  && /#pianoroll \.rollzoom-panel \.rolltool::after \{[^}]*currentColor/s.test(shell)
  && /#pianoroll \.rollzoom-panel \.rolltool::after \{[^}]*pointer-events:\s*none/s.test(shell)
  // Our list, drawn from the same variables as the strip, and hideable — `hidden` is a
  // display:none that the menu's own `display: flex` would otherwise beat.
  && /\.rolltool-menu \{[^}]*position:\s*fixed/s.test(shell)
  && /\.rolltool-menu \{[^}]*background:\s*var\(--panel\)/s.test(shell)
  && /\.rolltool-menu\[hidden\] \{ display: none; \}/.test(shell)
  // Where the cursor is and which tool you are in are two states, never one colour.
  && /\.rolltool-option\.active \{[^}]*var\(--hover\)/s.test(shell)
  && /\.rolltool-option\.on \{[^}]*var\(--accent\)/s.test(shell),
  'the roll tool picker is a listbox of the desk’s own, closed field and open list alike');
// A select swallowed the arrows, Escape and the space bar by being a select. A button
// has to say so, or arrowing down the tool list nudges the notes behind it, Escape drops
// the selection and space starts the transport.
assert(/field\.onkeydown = \(ev\) =>/.test(piano)
  && /\['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '\]\.includes\(ev\.key\)/.test(piano)
  && /ev\.preventDefault\(\);\s*ev\.stopPropagation\(\);/.test(piano)
  && /if \(ev\.key === 'Tab'\) \{ closeMenu\(\); return; \}/.test(piano)
  // The list is dismissed on anything that moves the field out from under it, and the
  // listeners come off with it — an open menu must never outlive its own picker.
  && /document\.addEventListener\('pointerdown', onDocDown, true\)/.test(piano)
  && /document\.removeEventListener\('pointerdown', onDocDown, true\)/.test(piano)
  && /window\.addEventListener\('scroll', onDismiss, true\)/.test(piano)
  && /window\.removeEventListener\('scroll', onDismiss, true\)/.test(piano)
  // Chosen on pointerdown, because the dismissal listens on pointerdown too: a click
  // would land after the list had gone, on the note field underneath it.
  && /o\.addEventListener\('pointerdown', \(ev\) => \{[\s\S]*?choose\(t\.id\)/.test(piano)
  // And it flips up when there is no room below, rather than off the bottom of the window.
  && /const flip = below < height \+ 8 && r\.top > below/.test(piano),
  'the picker carries the keyboard, dismissal and flip-up a native select gave for free');
assert(/let followEnabled = true/.test(barGrid)
  && /setFollow\(enabled\)/.test(barGrid)
  && /followEnabled: \(\) => followEnabled/.test(barGrid)
  && /followEnabled && followX/.test(barGrid)
  && /id="rollfollowbtn"/.test(shell)
  && /rollFollowButton\.onclick = \(\) =>/.test(entry)
  && /pianoRoll\.setFollow\(!pianoRoll\.followEnabled\(\)\)/.test(entry)
  && /#notes\.rollless #notehead #rollfollowbtn/.test(shell)
  && /#notehead #rollfollowbtn\.on \{[^}]*var\(--accent\)/s.test(shell),
  'the piano-roll toolbar offers an icon toggle to hold the view instead of auto-following playback');
assert(/function openNoteEditor\(laneKey, bar\)[\s\S]*?if \(kind === 'roll' && bar != null\) \{[\s\S]*?pianoRollFocusPending = \{ from: bar, to: bar \};[\s\S]*?if \(playing\) \{[\s\S]*?pianoRoll\.setFollow\(false\);[\s\S]*?syncRollFollowButton\(\);/.test(entry)
  && /const frozen = !pianoRoll\.followEnabled\(\);[\s\S]*?rollFollowButton\.classList\.toggle\('on', frozen\)/.test(entry)
  && /title="Freeze the piano roll view"/.test(shell),
  'double-clicking a bar during playback opens the piano roll on that bar and arms its Freeze toggle');
assert(/follow\(step\) \{[\s\S]*?grid\.follow\(step\);[\s\S]*?syncPlayingKeys\(step\);\s*\}/.test(piano)
  && !/follow\(step\) \{[^}]*grid\.follow\(step\);[^}]*syncSelectedKeys\(\);[^}]*\}/.test(piano),
  'piano-roll playback does not re-project unchanged selected keys every animation frame');
assert(/#pianoroll \.rollwhite \.ssqkey\.playing \{[^}]*var\(--accent\)/s.test(shell)
  && /#pianoroll \.ssqkey\.keyblack\.playing \{[^}]*var\(--accent\)/s.test(shell),
  'playback colours both white and black piano-key faces');
assert(/selectionChanged\s*=\s*\(\)\s*=>\s*{}/.test(barGrid)
  && /cell\.classList\.toggle\('sel'[\s\S]*?selectionChanged\(\)/.test(barGrid)
  && /let editedKey = null/.test(barGrid)
  && /if \(on\) editedKey = edit[\s\S]*?else editedKey = null/.test(barGrid)
  && /cell\.classList\.toggle\('edited', paint\)/.test(barGrid)
  && /f\.on && editedKey === noteKey\(f\.b, f\.i, row\.key\)/.test(barGrid)
  && /if \(!keys\.length \|\| keys\.some\(\(key\) => key !== editedKey\)\) editedKey = null/.test(barGrid)
  && /selectionChanged:\s*\(\)\s*=>\s*syncSelectedKeys\(\)/.test(piano)
  && /\.ssqkeys \.ssqkey\[data-row="\$\{cell\.dataset\.row\}"\]/.test(piano)
  && /\.ssqkey\.selected\s*\{[^}]*var\(--accent\)/s.test(shell)
  && /\.ssqlane:has\(\.ssqcell\.on\.edited\) \.ssqkey/.test(shell)
  && /\.rollwhite\.ssqlane:has\(\.ssqcell\.on\.edited\) \.ssqkey[\s\S]*?background-color:[^;]*var\(--accent\)/.test(shell)
  && /\.rollblack\.ssqlane:has\(\.ssqcell\.on\.edited\) \.ssqkey[\s\S]*?background-color:[^;]*var\(--accent\)/.test(shell)
  // The note you just drew is RINGED, never refilled: `--lane` is the channel, and a
  // note in a colour no channel has is the roll pointing at the wrong strip. The fill
  // is therefore absent from this rule, and playback puts no mark on a roll note at
  // all — the playhead already says where we are.
  && /#pianoroll \.ssqcell\.on\.edited::before \{(?:(?!\}|background)[\s\S])*var\(--accent\)/.test(shell)
  && !/\.ssqcell\.on:is\([^)]*\.playing[^)]*\)::before/.test(shell),
  'selected and edited notes keep the playback-style highlight on their matching physical keys, '
  + 'and are marked on the note by a ring rather than by a fill that loses the lane colour');
assert(/#barnow \{[^}]*white-space:\s*nowrap[^}]*text-align:\s*right/s.test(shell)
  && /const barDigits = String\(Math\.max\(1, plan\.length\)\)\.length;/.test(entry)
  && /barnow'\)\.style\.width = `\$\{barDigits \* 2 \+ 1\}ch`/.test(entry),
  'the bar counter reserves its widest current/total value so digit changes do not move the header');

// The panel buttons are pictures, so the tooltip is the only place their NAME and their
// purpose are written down. Two ways for that to rot silently: a button loses its
// `data-tipsays` and falls back to a bare name, or one keeps a `title` as well and the OS
// draws a second, uglier tooltip on top a second later. Both are invisible in a diff.
for (const id of ['oskbtn', 'seqbtn', 'rollbtn', 'presetbtn', 'ab', 'undo']) {
  const tag = header.match(new RegExp(`<button id="${id}"[\\s\\S]*?>`))?.[0] || '';
  assert(/\bdata-tip="[^"]+"/.test(tag) && /\bdata-tipsays="[^"]{40,}"/.test(tag)
    && !/\btitle=/.test(tag),
    `${id} explains itself in the tooltip, and carries no second one from the browser`);
}
assert(/data-tipkey="G"/.test(header) && /data-tipkey="N"/.test(header)
  && /data-tipkey="⌘Z"/.test(header),
  'the tooltips carry the keys as chips rather than as more sentence');
assert(shell.includes('<div id="tip" role="tooltip"')
  && /#tip \{[^}]*position:\s*fixed[^}]*pointer-events:\s*none/s.test(shell)
  && /#tip \.tiparrow \{[^}]*transform:\s*rotate\(45deg\)/s.test(shell)
  && /#tip \.tiparrow\.under \{/.test(shell),
  'one tooltip card, click-through, with an arrow that can point either way');
// The measuring lives in `placeCard` now, shared with the tour: the two have the same
// two problems — a card sized by its own sentence, and a card clamped to a window the
// anchor is not — and one copy of the answer is enough.
assert(/function showTip\(el\)[\s\S]*?tip\.classList\.add\('show'\);\s*\n\s*placeCard\(tip, el, arrow\)/.test(entry)
  && /function placeCard\(card, el, arrow[\s\S]*?getBoundingClientRect/.test(entry)
  && /const below = r\.bottom \+ gap \+ box\.height <= innerHeight - edge/.test(entry)
  && /arrow\.style\.left/.test(entry),
  'the card is measured before it is placed, and the arrow tracks the button, not the card');
// Beside, not over: a tour card stays up while four lines of it are read, and below a
// channel strip it lies straight across the thing it is pointing at.
assert(/prefer = 'below'/.test(entry)
  && /if \(prefer === 'side'\)/.test(entry)
  && /#tut \.tutarrow\.beside \{/.test(shell)
  && /#tut \.tutarrow\.beside\.after \{/.test(shell),
  'the tour card can sit beside its anchor instead of under it, and the arrow follows');
assert(/addEventListener\('pointerdown', hideTip, true\)/.test(entry)
  && /addEventListener\('scroll', hideTip, true\)/.test(entry)
  && /addEventListener\('focusin'[\s\S]*?:focus-visible[\s\S]*?showTip\(el\)/.test(entry),
  'it goes away on the click it belongs to, and comes up for the keyboard too');

// The strip-part switches. Three moving pieces that only work together: the rows have
// to carry the class the CSS hides, the switches have to sit on the strip grid with the
// family ones, and hiding must be a class on the rack rather than a rebuild — a strip
// part that stopped hiding, or a switch that lost its width, would look like a layout
// bug rather than a broken toggle.
const partfilter = shell.indexOf('<div id="partfilter">');
const lanefilter = shell.indexOf('<div id="lanefilter">');
assert(partfilter > 0 && lanefilter > partfilter,
  'the strip-part switches come before the track-family switches in the header');
assert(/#partfilter button,\s*#lanefilter button \{[^}]*width:\s*var\(--stripw\)/s.test(shell),
  'both sets of switches are one strip wide, so they line up with the channels');
assert(/#rackwrap\.no-eq \.eqrow,[\s\S]{0,200}?#rackwrap\.no-fx \.fxbtns,\s*#rackwrap\.shed-fx \.fxbtns \{ display: none; \}/
  .test(shell), 'the rack classes hide the EQ rows, the send rows and the insert slots');
assert(/function eqRow[\s\S]*?classList\.add\('eqrow'\)/.test(entry)
  && /SHORT\[aux\.id\][\s\S]*?classList\.add\('sendrow'\)/.test(entry),
  'the EQ and send rows carry the classes those rules hide');
// The gap above the fader belongs to the foot. It used to be the insert block's top
// margin, which meant switching Effects off took it away and stood the fader hard
// against the last send row.
assert(/\.strip \.stripfoot \{[^}]*padding-top:\s*10px/s.test(shell),
  'the foot reserves the air above whatever it starts with');
assert(/\.strip \.stripbody \{[^}]*flex:\s*0 0 auto/s.test(shell)
  && /\.strip \.stripfoot \{[^}]*flex:\s*1 1 auto[^}]*display:\s*flex[^}]*flex-direction:\s*column/s.test(shell)
  && /\.faderrow \{[^}]*align-items:\s*stretch[^}]*flex:\s*1 1 auto[^}]*min-height:\s*var\(--faderh\)/s.test(shell)
  && /\.strip \.faderrow \.faderwrap \{[^}]*flex:\s*1 1 auto[^}]*height:\s*auto/s.test(shell)
  && /\.strip \.faderrow \.fader,[\s\S]*?\.strip \.faderrow \.meter \{[^}]*height:\s*100%/s.test(shell),
  'channel strips give spare height to the fader while pan and mute/solo stay pinned below');
assert(/\.fxbtns \{[^}]*margin:\s*0 0 8px/s.test(shell),
  'the insert block carries only the gap under it, so hiding it cannot take the one above');
// Device summaries still get their body spacing, but channel identity now belongs in
// the header. The picker button and its old stepping arrows must not return as a second
// channel control.
assert(/\.stripbody > \.devlink \{\s*margin: 5px 0 6px/.test(shell),
  'device summaries keep their body spacing');
assert(/function presetForLane\(laneKey\)[\s\S]*?defaultVoiceOf\(track\?\.bank, laneKey\)/.test(entry)
  && /function presetHeadingFor\(laneKey\)[\s\S]*?String\(preset\.category\)\.toUpperCase\(\)/.test(entry)
  && /function renderPresetHeading\(el, laneKey\)[\s\S]*?laneNumbers\.get\(laneKey\)[\s\S]*?panelnumber/.test(entry)
  && /function updatePanelTitles\(\)[\s\S]*?renderPresetHeading\(\$\('devtitle'\), selectedLane\)/.test(entry)
  && /function selectLane\(key\)[\s\S]*?buildDevices\(\)[\s\S]*?pianoRoll\.refresh\(\)/.test(entry)
  && /#devhead \.panelpreset \{[^}]*text-transform:\s*none/s.test(shell)
  && /#devhead \.paneltype \{[^}]*text-transform:\s*uppercase/s.test(shell),
  'the effects heading carries the track number, active preset name and uppercase type, and strip selection refreshes the roll');
// The Notes header is the word, and then the preset whose part is ON SCREEN — which is
// not always the selected strip: with the master selected the roll still shows a lane.
// On the kit it is the selected drum, the one whose row the column marks. Only a channel
// with neither editor leaves the word standing alone.
const notesPanelSync = /function syncNotesPanel\([\s\S]*?\n\}/.exec(entry)?.[0] || '';
assert(!entry.includes("$('notetitle')") && !shell.includes('notetitle')
  && /<span class="label" id="notelabel">Notes<\/span>[\s\S]*?<span id="notepreset"><\/span>/.test(shell)
  && /#notehead #notepreset \{[^}]*text-transform:\s*none/s.test(shell)
  && /#notehead #notepreset:empty \{[^}]*display:\s*none/s.test(shell)
  && /<span class="label" id="notelabel">Notes<\/span>/.test(shell)
  && /\$\('notelabel'\)\.textContent = kind === 'kit' \? 'Pattern' : 'Piano Roll';/.test(notesPanelSync)
  && /\$\('notepreset'\)\.textContent = kind === 'roll' \? presetHeadingFor\(rollShownLane\(\)\)\.name : '';/.test(notesPanelSync),
  'the panel is named for what is in it — Notes and the preset on the roll, or the Drum'
  + ' editor, which is every drum in the song at once and so names no channel at all');

// A drum channel takes the roll out of the panel and puts the KIT in, rather than
// falling through to the first melodic lane. The PANEL does not move: not its fold, not
// its height, not the desk around it — clicking between a drum strip and a melodic one
// must not resize anything. A channel with neither editor leaves it empty, as before.
assert(/const editorFor = \(key\) => \{[\s\S]*?if \(PERCUSSION_LANES\.includes\(baseLane\(key\)\)\) return 'kit';[\s\S]*?return rollEditable\(key\) \? 'roll' : null;/.test(entry)
  && /const laneHidesRoll = \(key\) => editorFor\(key\) !== 'roll'/.test(entry)
  && /const notesRollUp = \(\) => notesOpen\(\) && \$\('desk'\)\.dataset\.lowerView === 'roll'[\s\S]*?editorFor\(selectedLane\) === 'roll'/.test(entry)
  && /const notesKitUp = \(\) => notesOpen\(\) && \$\('desk'\)\.dataset\.lowerView === 'pattern'/.test(entry)
  && /\$\('notes'\)\.classList\.toggle\('rollless', kind !== 'roll'\)/.test(notesPanelSync)
  && /\$\('notes'\)\.classList\.toggle\('kitless', kind !== 'kit'\)/.test(notesPanelSync)
  && !notesPanelSync.includes('setNotesFolded')
  && !notesPanelSync.includes('scheduleDeskFit')
  && !notesPanelSync.includes('style.height')
  && /function selectLane\(key\)[\s\S]*?syncNotesPanel\(\)[\s\S]*?pianoRoll\.refresh\(\)[\s\S]*?kitRoll\.refresh\(\)/.test(entry)
  && /#notes\.rollless #pianoroll \{[^}]*display:\s*none/s.test(shell)
  && /#notes\.kitless #kitroll \{[^}]*display:\s*none/s.test(shell)
  && !/#notes\.rollless \{/.test(shell)
  && !/#notes\.kitless \{/.test(shell),
  'a percussion channel swaps the roll for the kit and leaves the panel exactly where it was');
// Two things follow from the roll being absent rather than folded: nothing builds a
// roll for a channel that has none, and the panel's floor cannot fall by the height of
// the strip that went with it — a cramped desk would claw the difference back on every
// click onto the kick.
// The window the roll is scrolled to survives neither trip: `display: none` — the fold
// uses it and so does rollless — destroys the scroll box, and the roll comes back at
// the top of the keyboard. fitLane only reacts to the LANE changing, and coming back to
// the lane you left is not a change, so the roll has to be told the window itself went
// away. Drums → the melodic channel you were just on was the case that landed on C8.
const rollFit = /const fitLane = \(\)[\s\S]*?\n  \};/.exec(piano)?.[0] || '';
assert(/forgetFit\(\) \{ fittedLane = null; \}/.test(piano)
  && /if \(key === fittedLane\) return;/.test(rollFit)
  && /pianoRoll\.forgetFit\(\);[\s\S]{0,400}?schedulePianoRollOpen\(\);/.test(notesPanelSync + entry.slice(entry.indexOf('function syncNotesPanel')))
  && /const reopening = !on && !needsBuild && hasRoll && pianoRoll\.isOpen\(\)/.test(entry)
  && /\} else if \(reopening\) \{\s*pianoRoll\.forgetFit\(\);\s*pianoRoll\.refresh\(\);/.test(entry)
  && /if \(view === 'roll'\)[\s\S]*?else pianoRoll\.refresh\(\);/.test(lowerViewSetter),
  'a roll that was taken off screen is re-fitted to its part when it comes back, on either trip');
assert(/let pianoRollFocusPending = null;/.test(entry)
  && /function spendPianoRollFocus\(\)[\s\S]*?requestAnimationFrame\(\(\) => pianoRoll\.focusRange\(focus\.from, focus\.to\)\)/.test(entry)
  && /function schedulePianoRollOpen\(\)[\s\S]*?pianoRoll\.open\(true\);\s*\n\s*spendPianoRollFocus\(\);/.test(entry)
  && /function openNoteEditor\(laneKey, bar\)[\s\S]*?pianoRollFocusPending = \{ from: bar, to: bar \}[\s\S]*?setLowerView/.test(entry),
  'opening the piano roll from a bar spends its pitch-and-time focus only after the lazy first build');
assert(/function schedulePianoRollOpen\([\s\S]*?if \(!notesRollUp\(\) \|\| pianoRoll\.isOpen\(\)\) return/.test(entry)
  && /function setNotesFolded\([\s\S]*?const hasRoll = !laneHidesRoll\(selectedLane\);[\s\S]*?const needsBuild = !on && !pianoRoll\.isOpen\(\) && hasRoll;/.test(entry)
  && /notes: \(\) => h\(\$\('notehead'\)\) \+ rollScopeH\(\) \+ DEV_MIN_ROLL/.test(entry)
  && /function rollScopeH\(\) \{[\s\S]*?if \(now\) lastRollScopeH = now;[\s\S]*?return lastRollScopeH;/.test(entry),
  'no roll is built for a channel that has none, and the panel floor survives its absence');
const channelStrip = entry.slice(entry.indexOf('function channelStrip'), entry.indexOf('function sendStrip'));
assert(channelStrip.includes('label: customTrackLabel(key) || preset?.label || lane.label')
  && channelStrip.includes('sublabel: preset?.category || null')
  && channelStrip.includes("presetName.classList.add('strippreset')")
  && channelStrip.includes('openVoicePicker(ev.clientX, ev.clientY, key)')
  && !entry.includes('function voiceRow')
  && !entry.includes('function stepVoice')
  && !shell.includes('.voicestep'),
  'channel strips show the current preset above its type and use that name to choose');
assert(/function fillEffectControls\(\{[\s\S]*?visibleParams\(def, entryParams\)[\s\S]*?paramRange\(pname, def\)/.test(entry)
  && /function buildDevices\(\)[\s\S]*?fillEffectControls\(\{[\s\S]*?grid, def, entry, patch, replaceParams/.test(entry)
  && /function openBarEffectsEditor[\s\S]*?card\.className = `device barfxdevice[\s\S]*?fillEffectControls\(\{[\s\S]*?patch: \(params\)[\s\S]*?replaceParams: \(params\)/.test(entry)
  && /bypass\.onclick = \(\) => \{ chain\[index\] = \{ \.\.\.chain\[index\], bypass: !effect\.bypass \}; draw\(\); \}/.test(entry)
  && /\[chain\[index - 1\], chain\[index\]\] = \[chain\[index\], chain\[index - 1\]\]/.test(entry)
  && /foot\.append\(snapshot, clear, closeButton, applyPlay\);[\s\S]*?panel\.append\(guide, foot\)/.test(entry)
  && /foot\.className = 'regfoot barfxfoot'/.test(entry)
  && /#regionedit\.barfxmodal \.barfxcontrols \{[^}]*gap:\s*8px[^}]*padding:\s*10px 12px 12px/s.test(shell)
  && /#regionedit\.barfxmodal \.barfxcontrols \.regcontrol > span \{ font-size:\s*10\.5px; \}/.test(shell)
  && /#regionedit:is\(\.notefxmodal, \.barfxmodal\) :is\(\.notefxfoot, \.barfxfoot\) button \{[^}]*font-size:\s*9\.5px[^}]*padding:\s*6px 9px/s.test(shell)
  && /#regionedit\.barfxmodal \.barfxdevice \.devgrid \{[^}]*grid-auto-flow:\s*row[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/s.test(shell),
  'Bar Effects uses the channel insert parameter surface in staged, narrow editable cards with bypass and ordering');
assert(/const freezeState = freezeLaneState\(trackId, row\.key\);[\s\S]*?el\.className = `arrrow\$\{frozen \? ' frozen' : ''\}\$\{freezeState === 'partial' \? ' partially-frozen' : ''\}`/.test(entry)
  && /if \(frozen\) top\.append\(freezeMark\('arrfreeze', '❄'\)\)/.test(entry)
  && /frozen \? \{ text: 'Frozen render', tone: 'ice' \}/.test(entry)
  && /const barFrozen = freezeCoversBar\(trackId, row\.key, bar\)/.test(entry)
  && /barOperationGroups\(plan\[bar\], row\.key, \{ frozen: barFrozen \}\)/.test(entry)
  && /\.arrbar\.frozen:not\(\.bardeleted\) \{[^}]*background-color:\s*color-mix\(in srgb, var\(--freeze\) 58%, var\(--bar-colour, var\(--cell\)\)\) !important[^}]*box-shadow:/s.test(shell)
  && /\.arrbar\.frozen:not\(\.bardeleted\) \.arrcell \{ background: transparent !important; \}/.test(shell)
  && /\.arrfreeze \{[^}]*color:\s*var\(--freeze\)/s.test(shell),
  'whole and selected-bar freezes carry the correct icy bars, a partial track state, a snowflake and tooltip explanation');
assert(/function syncFrozenLaneUi\(lane\)[\s\S]*?strip\.classList\.toggle\('frozen', frozen\)[\s\S]*?row\.classList\.toggle\('frozen', frozen\)[\s\S]*?freezeMark\('arrfreeze', '❄'\)/.test(entry)
  && /bar\.classList\.toggle\('frozen', freezeCoversBar/.test(entry)
  && /function unfreezeLane\(lane[\s\S]*?syncFrozenLaneUi\(lane\)/.test(entry)
  && /function reconcileFrozen\(id[\s\S]*?syncFrozenLaneUi\(frozen\.lane\)/.test(entry)
  && /function installFrozenSegment[\s\S]*?frozenTracks\.set\(key, frozen\)/.test(entry)
  && /'❄ PARTIAL' : '❄ FROZEN'/.test(entry),
  'freezing, unfreezing and source invalidation update both track surfaces immediately');
const freezeFingerprint = entry.slice(entry.indexOf('function freezeFingerprint'), entry.indexOf('function unfreezeLane'));
assert(/arrangement: arrFor\(id\) \|\| null/.test(freezeFingerprint)
  && /layers: m\.layers \|\| \[\], off: m\.off \|\| \[\]/.test(freezeFingerprint)
  && !/\border:\s*m\.order/.test(freezeFingerprint),
  'reordering channel strips does not invalidate an otherwise unchanged frozen lane');
assert(/const FROZEN_INTENT_KEY = 'mash-mixer-frozen-tracks'/.test(entry)
  && /function rememberFrozenIntent\(id, lane, scope, frozen\)[\s\S]*?persistFrozenIntent\(\)/.test(entry)
  && /const FREEZE_HANDLE_DB = 'mash-mixer-freeze-files'/.test(entry)
  && /function openFreezeHandleDb[\s\S]*?indexedDB\.open\(FREEZE_HANDLE_DB/.test(entry)
  && /async function rememberFreezeBundle[\s\S]*?freezeBundleKey\(id\)[\s\S]*?handle/.test(entry)
  && /async function readFreezeBundle[\s\S]*?getFile\(\)[\s\S]*?decodeMashFreezeBundle/.test(entry)
  && /function installDecodedFreeze[\s\S]*?checkedFreezeMetadata[\s\S]*?installFrozenSegment/.test(entry)
  && /function queueFrozenRestorePrompt\(id = trackId\)[\s\S]*?Load saved freezes\?[\s\S]*?await readFreezeBundle[\s\S]*?await freezeLane\(item\.lane, \{ id, restoring: true, scope: item\.scope \}\)/.test(entry)
  && /freezeRestoreReady = true;\s*\n\s*queueFrozenRestorePrompt\(trackId\)/.test(entry)
  && /function unfreezeLane\(lane[\s\S]*?rememberFrozenIntent\(trackId, lane, segment\.scope, false\)/.test(entry),
  'one user-selected bundle handle is remembered, reload validates its entries, and missing or stale entries retain the refreeze fallback');
assert(/id="exportfreezes"/.test(shell) && /id="importfreezes"/.test(shell)
  && /async function exportFreezes[\s\S]*?Approximately \$\{estimate\}[\s\S]*?showSaveFilePicker[\s\S]*?writeMashFreezeBundle[\s\S]*?rememberFreezeBundle/.test(entry)
  && /FREEZE EXPORT START[\s\S]*?FREEZE EXPORT END[\s\S]*?FREEZE EXPORT FAILED/.test(entry)
  && /async function importFreezes[\s\S]*?showOpenFilePicker[\s\S]*?decodeMashFreezeBundle[\s\S]*?installDecodedFreeze/.test(entry)
  && !/Save Selected Freeze…/.test(entry)
  && !/Save Frozen Ranges…/.test(entry)
  && !/offerFreezeSave/.test(entry)
  && !/fetch\('\/freeze-cache/.test(entry),
  'the hamburger exports all current freezes in one size-warned bundle and imports it without per-range save prompts or an automatic cache');
assert(/id="profiletrackload"/.test(shell)
  && /function trackProfileRange[\s\S]*?laneActivity\(bank, 1, 1\)/.test(entry)
  && /function trackProfilePrerollSeconds[\s\S]*?return Math\.max\(0\.05, \(-earliest \* spb \/ 2\) \+ 0\.02\)/.test(entry)
  && /measureOnly: true, prerollSeconds/.test(entry)
  && /function trackProfileCheckpoint/.test(entry)
  && /if \(completedTracks\.has\(identity\.number\)\) continue;/.test(entry)
  && /Persist at the checkpoint[\s\S]{0,500}?appendDiagnosticEvent\('TRACK LOAD PROFILE'/.test(entry)
  && /function isolatedTrackProfileMix[\s\S]*?mute: item\.key !== lane/.test(entry)
  && /function profileTrackLoad[\s\S]*?measureOnly: true[\s\S]*?withoutInserts: true[\s\S]*?TRACK LOAD PROFILE/.test(entry)
  && /Track \$\{number\} — \$\{visibleName\}/.test(entry)
  && /profileFullMs/.test(entry) && /profileFxDeltaMs/.test(entry),
  'DEV diagnostics profiles the shared densest window with timing-offset preroll, persists each track for resume, and separates its insert-chain cost');
assert(/function freezeSpanFor\(id, lane, scope[\s\S]*?freezeRenderSpan\(bank, lane/.test(entry)
  && /function silentFrozenSegment\(id, lane, fingerprint, scope[\s\S]*?new Float32Array\(1\)/.test(entry)
  && /async function freezeLane\(lane[\s\S]*?const span = freezeSpanFor\(id, lane, normalizedScope\);[\s\S]*?if \(!span\) \{[\s\S]*?silentFrozenSegment\(id, lane, fingerprint, normalizedScope\)[\s\S]*?return true;[\s\S]*?bounceWav/.test(entry),
  'a wholly silent selected range or arranged track installs a tiny silent freeze before the offline renderer is reached');
assert(/FREEZE RENDER START/.test(entry)
  && /FREEZE RENDER END/.test(entry)
  && /FREEZE RENDER FAILED/.test(entry)
  && /expectedBytes = predictedFrames \* 2 \* Float32Array\.BYTES_PER_ELEMENT \* 2/.test(entry)
  && /used \+ keptBytes \+ expectedBytes > FREEZE_MEMORY_CAP[\s\S]*?bounceWav/.test(entry),
  'freeze renders persist outcomes and reject an over-cap allocation before opening the renderer');
assert(/createNoteFxProcessor/.test(freezeSpanSource)
  && /startStep, endStep, steps: endStep - startStep, tailSeconds/.test(freezeSpanSource)
  && /tail: span\.tailSeconds, range: span/.test(entry)
  && /segmentStartStep: out\.range\?\.startStep/.test(entry)
  && /Number\.isFinite\(state\.segmentStartStep\)/.test(audio),
  'a sparse freeze renders its Note-FX-aware active span and anchors the short PCM at its song step');
assert(/\.strip h3\.strippreset \{[^}]*cursor:\s*pointer/s.test(shell)
  && /\.strip \.stripsub \{[^}]*text-transform:\s*uppercase/s.test(shell)
  && /\.strip \.stripsub \{[^}]*margin:\s*3px 0 3px/s.test(shell),
  'the preset title is clickable and the preset type is an uppercase, spaced subheader');
// The row and the strip are two copies of one name, so both have to answer a click the
// same way and both have to be repainted when the answer changes. Choosing a preset used
// to repaint only the rack, which left the row you had just right-clicked still reading
// the preset it no longer played.
assert(/function setLaneVoice[\s\S]*?if \(independent\) buildArrangement\(\); else refreshLaneIdentity\(laneKey\);[\s\S]*?stepSeq\.refresh\(\);[\s\S]*?pianoRoll\.refresh\(\);/
  .test(entry)
  && /function refreshLaneIdentity\(laneKey\)[\s\S]*?\.arrname[\s\S]*?\.arrpresetcat[\s\S]*?delete name\.dataset\.full;[\s\S]*?markClipped\(row\);[\s\S]*?category\.textContent = preset\?\.category/
    .test(entry),
  'choosing a preset renames the arrangement row as well as the strip');
// A click on a track selects it wherever it lands. Half a header that answered a click
// and half that did not read as a dead row.
//
// The name is the exception, and it is a TWO-step: the row and the strip are two copies
// of one name, so both change what plays the track the same way. The safety is in the
// arming — on a row you are not on, the first click only arms and falls through to the
// header, which selects it, so the picker can only ever open on a track you are already
// looking at. One click opening it outright is what this used to be, and landing on a
// name you meant to point at cost you a sound.
const arrangementFn = entry.slice(entry.indexOf('function buildArrangement'));
assert(/header\.addEventListener\('click', \(\) => selectLane\(row\.key\)\)/.test(arrangementFn)
  && /header\.addEventListener\('dblclick'[\s\S]*?closest\('\.arrbtns, \.arrgain'\)[\s\S]*?playFromLaneStart\(row\.key\)/
    .test(arrangementFn)
  // Armed first, and the un-armed click returns WITHOUT stopping propagation — that
  // fall-through is what lets the header underneath do the selecting.
  && /name\.addEventListener\('click', \(ev\) => \{\s*\n(?:\s*\/\/[^\n]*\n)*\s*if \(!presetArmed\(row\.key\)\) \{ armPreset\(row\.key\); return; \}\s*\n\s*ev\.stopPropagation\(\);\s*\n\s*openVoicePicker\(ev\.clientX, ev\.clientY, row\.key\);/
    .test(arrangementFn)
  && /name\.setAttribute\('role', 'button'\)/.test(arrangementFn)
  // Two clicks of the name are not a double-click on the track, which would play from
  // where the lane comes in — not what the second click meant.
  && /name\.addEventListener\('dblclick', \(ev\) => ev\.stopPropagation\(\)\)/.test(arrangementFn)
  && /mute\.onclick = \(ev\) => \{\s*ev\.stopPropagation\(\)/.test(entry)
  && /solo\.onclick = \(ev\) => \{\s*ev\.stopPropagation\(\)/.test(entry),
  'anywhere on a track header selects the track, M/S and the level opt out, and the name opens the picker only on the second click');
const arrangementBarClick = /box\.onclick = \(ev\) => \{[\s\S]*?\n\s*\};/.exec(arrangementFn)?.[0] || '';
assert(!arrangementBarClick.includes('jumpTo(')
  && /playButton\.className = 'arrbarplay'[\s\S]*?jumpTo\(at, \{ start: true, immediate: true \}\)/.test(arrangementFn)
  && /\.arrbar:hover \.arrbarplay, \.arrbarplay:focus-visible/.test(shell)
  && /\.arrbarplay \{[^}]*right:\s*2px[^}]*top:\s*2px[^}]*width:\s*18px[^}]*height:\s*18px[^}]*border-radius:\s*3px/s.test(shell),
  'a bar click only selects, while its small top-right hover button explicitly starts playback there');
assert(/function barOperationGroups\(barPlanEntry, key/.test(entry)
  && /function trackHoverGroups\(preset/.test(entry)
  && /resolveNoteFx\(laneMix\.noteFx, barPlanEntry, key\)/.test(entry)
  && /label: 'Note FX'[\s\S]*?label: 'Insert FX'/.test(entry)
  && /box\.dataset\.tipkind = 'bar'/.test(arrangementFn)
  && /box\.dataset\.tip = displayLabel/.test(arrangementFn)
  && /box\.dataset\.tipkey = trackNumber \? `Track \$\{trackNumber\}` : 'Track'/.test(arrangementFn)
  && /box\.dataset\.tipcontext = `Bar \$\{bar \+ 1\}`/.test(arrangementFn)
  && /label: 'Synthesiser'[\s\S]*?\.\.\.barOperationGroups\(plan\[bar\], row\.key, \{ frozen: barFrozen \}\)/.test(arrangementFn)
  && /name\.dataset\.tipkind = 'track'/.test(arrangementFn)
  && /name\.dataset\.tipgroups = JSON\.stringify\(trackHoverGroups\(preset, \{ frozen \}\)\)/.test(arrangementFn)
  && /box\.dataset\.tiphints = JSON\.stringify\(\[[\s\S]*?\{ key: 'Drag', text: 'Move' \}[\s\S]*?\{ key: '⌘ Drag', text: 'Copy' \}[\s\S]*?\{ key: 'Right-click', text: 'Edit' \}/.test(arrangementFn)
  && !/const notes = Array\.from\([^\n]*cellNotes\(row/.test(arrangementFn)
  && !/box\.title = `\$\{where\}/.test(arrangementFn),
  'bar hover uses a structured operational summary for playback, transforms, Note FX and inserts, without dumping notes');
assert(/tip\.classList\.toggle\('bartip', el\.dataset\.tipkind === 'bar'\)/.test(entry)
  && /tip\.classList\.toggle\('tracktip', el\.dataset\.tipkind === 'track'\)/.test(entry)
  && /JSON\.parse\(el\.dataset\.tipgroups\)/.test(entry)
  && /#tip\.bartip \{[^}]*max-width:\s*390px/s.test(shell)
  && /#tip\.tracktip \{[^}]*max-width:\s*340px/s.test(shell)
  && /#tip \.tipgroup \{[^}]*grid-template-columns:\s*82px minmax\(0, 1fr\)/s.test(shell)
  && /#tip \.tipchip\.bypassed \{[^}]*text-decoration:\s*line-through/s.test(shell)
  && /#tip \.tiphint kbd \{[^}]*background:\s*var\(--well\)/s.test(shell),
  'the bar summary is a styled, theme-aware card with labelled rows and clear bypass state');
assert(/const barCopyModifier = \(ev\) => ev\.metaKey \|\| ev\.altKey/.test(entry)
  && /barDrag\.copy = barCopyModifier\(ev\)/.test(entry)
  && /copy: barCopyModifier\(ev\)/.test(arrangementFn),
  'Command-drag copies bars as advertised, while the existing Option modifier remains compatible');
assert(/if \(!playing\) \{[\s\S]*?dragSel = \{ key: row\.key, from: bar, moved: false \};[\s\S]*?return;\s*\}/.test(arrangementFn)
  && /if \(!playing\) \{[\s\S]*?return;\s*\}[\s\S]*?const selectedRange = selectedBar\?\.key === row\.key/.test(arrangementFn),
  'dragging an empty bar keeps the range-selection gesture, while note-bearing bars own move/copy');
assert(entry.includes("const PARTS_KEY = 'mash-mixer-hidden-parts'")
  && entry.includes('localStorage.setItem(PARTS_KEY'),
  'which parts are hidden is remembered across reloads');
assert(/function applyStripParts\(\)[\s\S]*?wrap\.classList\.toggle\(p\.cls[\s\S]*?requestAnimationFrame\(fitStrips\)/
  .test(entry) && !/function applyStripParts\(\)[\s\S]*?buildRack\(\)/.test(entry.slice(
    entry.indexOf('function applyStripParts()'), entry.indexOf('function buildPartFilter'))),
  'toggling a part re-fits the strips by class, without rebuilding the rack');
assert(/buildLaneFilter\(all\);[\s\S]{0,120}?buildPartFilter\(\);[\s\S]{0,80}?applyStripParts\(\)/.test(entry),
  'a rack rebuild redraws the switches and re-applies the hidden parts');

// A docked voice editor collapses, it does not close: beside a strip it folds back into
// the strip that opens it, in the library it folds to the rail. Only the floating window
// — which has neither a lane nor a dock — keeps the ✕.
assert(/const folds = el\.classList\.contains\('vedocked'\) \|\| !!state\.laneKey;/.test(editor),
  'the editor folds whenever it is docked — beside a strip as well as in the library');
assert(/if \(folds\) shut\.append\(foldIcon\('left'\)\); else shut\.textContent = '✕';/.test(editor),
  'folding shows the « that mirrors the » which opened it, closing keeps the ✕');
assert(/#voiceedit \.veclose\.vefold \{[^}]*width:\s*28px[^}]*height:\s*28px/s.test(shell),
  'the fold mark is the same box wherever the panel is docked');
// The » on the strip head and the « in the editor are one pair, so they are one box in
// one corner: same size, same offsets, measured identical on the live page (top 223,
// centre 237). Kept as literals here because the whole point is that the two agree.
assert(/\.stripedit \{[^}]*top:\s*4px;\s*right:\s*2px;\s*width:\s*28px;\s*height:\s*28px/s.test(shell)
  && /#voiceedit \.veclose\.vefold \{[^}]*right:\s*2px/s.test(shell)
  && /#voiceedit \.veclose \{[^}]*top:\s*4px/s.test(shell),
  'the strip’s » sits in the same 28px corner box as the editor’s «, so they line up');
assert(/\.stripedit \{[^}]*z-index:\s*2[^}]*background:\s*color-mix/s.test(shell),
  'the » draws over the strip name with its own backing rather than blending into it');
assert(/\.voicepair > \.strip \.striphead:hover \.stripedit,\s*\.voicepair > \.strip \.stripedit \{\s*display: none/s
  .test(shell), 'the » is gone while the panel it opens is out, hover included');
assert(/function placeVoiceEditor\(\)[\s\S]*?voicepairhead[\s\S]*?strip\.querySelector\('\.striphead h3'\)[\s\S]*?sharedTitle\.addEventListener\('click', choosePreset\)[\s\S]*?strip\.querySelector\('\.striphead \.stripsub'\)/.test(entry)
  && /\.voicepair \{[^}]*position:\s*relative/s.test(shell)
  && /\.voicepairhead \{[^}]*align-items:\s*center/s.test(shell)
  && /\.voicepair > \.strip \.striphead > h3,[\s\S]*?\.voicepair > #voiceedit \.vehead > \.vetag \{ visibility: hidden; \}/.test(shell),
  'an expanded channel uses one centered strip identity instead of a separate editor preset heading');

// ---- recording ---------------------------------------------------------------------
//
// The take buffer and the clock are unit-tested in tests/note-recorder.js. What cannot
// be tested there is the WIRING, and every assertion below is here because the failure
// it catches is invisible in a diff and audible only as "the recorder is broken".

// The arm lives in the keyboard's own title bar, next to the two inputs it decides the
// fate of, and it is built in JS like the other two rather than sitting in the markup.
assert(/recBtn\.className = 'oskrec';/.test(entry)
  && /head\.append\(title, warn, sp, midiBtn, catchBtn, recBtn, close\);/.test(entry),
  'the Record button is built into the OSK head, between MIDI/Keyboard and the close');
assert(/#osk \.oskrec\.on \{[^}]*var\(--solo\)/s.test(shell)
  && /#osk \.oskrec\.live \{[^}]*var\(--hot\)/s.test(shell),
  'armed and recording are two different colours, and both are the desk’s own state'
  + ' variables so every theme including the light ones already defines them');
assert(/#osk \.oskrec::before \{/.test(shell),
  'the armed/recording state dot is a pseudo-element, so the button has no extra badge element');

// THE assertion. A glide across the keys and a roll across the pads arrive as
// pointermove and fire as fast as the pointer does; recording them puts sixteen
// semitones in a bar every time somebody goes looking for a note.
assert(/function oskPlay\(midi, \{ record = true, src = null, chord = true \} = \{\}\) \{/.test(entry),
  'oskPlay takes a record option, so a gesture can say it is not a note');
assert(/function oskHit\(laneKey, \{ record = true, src = null \} = \{\}\) \{/.test(entry),
  'and so does oskHit');
assert(/keys\.addEventListener\('pointermove'[\s\S]{0,300}?oskHeldVisuals\.get\(src\) === k[\s\S]{0,300}?releasePreview\(src\)[\s\S]{0,200}?oskPlay\([\s\S]{0,200}?\{ record: false, src \}\)/
  .test(entry), 'a GLIDE releases the previous preview and is not recorded');
assert(/pads\.addEventListener\('pointermove'[\s\S]{0,400}?oskHit\([^)]*\{ record: false \}\)/
  .test(entry), 'and neither is a ROLL across the pads');

// All three inputs name the finger they came from, or a note-off cannot find its
// note-on and every note in the take would take the length of the last one.
assert(/const src = `p:\$\{ev\.pointerId\}`;[\s\S]{0,120}?oskPlay\(Number\(k\.dataset\.midi\), \{ src \}\)/.test(entry),
  'a clicked key records under its pointer id');
assert(/const src = `k:\$\{key\}`;[\s\S]{0,120}?oskPlay\(midi, \{ src \}\)/.test(entry),
  'a typed key records under the letter, which is what keyup will report');
assert(/const src = `m:\$\{note\}`;[\s\S]{0,120}?oskPlay\(note, \{ src \}\)/.test(entry),
  'a MIDI note records under its note number');
assert(/function oskHoldVisual\(src, el\)[\s\S]{0,300}?classList\.add\('held'\)/.test(entry)
  && /function oskReleaseVisual\(src\)[\s\S]{0,250}?classList\.remove\('held'\)/.test(entry)
  && /\.oskkey\.white\.held/.test(shell) && /\.oskpad\.held/.test(shell),
  'a held input keeps its key or pad highlighted until its release');
// One release closes both halves of a held preview: the recording token, when armed,
// and the audio voice, which is what mouse release used to miss.
assert(/function releasePreview\(src\)[\s\S]{0,180}Audio\.releasePreviewNote\(held\.laneKey, held\.freq\)/
  .test(entry)
  && /function oskRelease\(src\)[\s\S]{0,300}releasePreview\(src\)/.test(entry)
  && /pads\.addEventListener\(type, \(ev\) => oskRelease\(`p:\$\{ev\.pointerId\}`\)\)/.test(entry)
  && /keys\.addEventListener\(type, \(ev\) => oskRelease\(`p:\$\{ev\.pointerId\}`\)/.test(entry),
  'mouse release closes both the recording token and the sounding preview note');
// The note-off half, which did not exist at all until recording had a use for it. Both
// spellings of a note-off, and it must actually release — checked by slicing the branch
// rather than by matching its exact wording, so that adding the damper to it (which
// introduced a `src` local) does not read as the handler having been lost.
{
  const at = entry.indexOf('if (kind === 0x80 || (kind === 0x90 && !vel))');
  const body = at < 0 ? '' : entry.slice(at, at + 1400);
  assert(at >= 0, 'a MIDI note-off is an actual 0x80 OR a note-on at velocity zero — most'
    + ' keyboards send the second, and reading only the first loses every length');
  assert(body.includes('oskRelease(src)') && body.includes('return;'),
    'and it releases the note it names');
}
assert(/addEventListener\('keyup'[\s\S]{0,300}?oskRelease\(`k:\$\{key\}`\)/.test(entry),
  'a computer key gets its length from the keyup that already stopped auto-repeat');
assert(/for \(const type of \['pointerup', 'pointercancel'\]\)/.test(entry),
  'and a pointer gets it from pointerup — pointercancel too, or a gesture ending some'
  + ' other way leaves the note open and it takes the whole take’s length');

// The one invariant that would be catastrophic and is cheap to reintroduce.
assert(/function recordNote\([\s\S]*?\n\}/.test(entry)
  && !/function recordNote\([\s\S]*?\n\}/.exec(entry)[0].includes('applyArrangementEdit'),
  'recordNote NEVER commits — applyArrangementEdit pushes undo, revalidates the whole'
  + ' arrangement and rebuilds the timeline, so a per-note commit would mean one undo'
  + ' step per note and a desk rebuild on every key');
assert(/function flushTake\([\s\S]*?writeBarNotesShared\(eb, d, bar, lane, notes16, lengths16\)/
  .test(entry),
  'a take is written SHARED — recording into a loop changes the pattern, or a note'
  + ' played into bar 1 of a four-bar section returns every fourth pass');
assert(/let locA = null[\s\S]*?let locB = null/.test(entry)
  && /function currentLoopBounds\(\)[\s\S]*?selectedBar[\s\S]*?16/.test(entry)
  && /function applyLoop\([\s\S]*?currentLoopBounds\(\)[\s\S]*?Audio\.setLoop\(start, end\)/.test(entry)
  && /function applyLoopNoJump\([\s\S]*?Audio\.setLoop\(start, end\)[\s\S]*?Audio\.step = 0/.test(entry)
  && /function jumpTo\([\s\S]*?start && within === 0[\s\S]*?setPlaying\(false\)[\s\S]*?setPlaying\(true, 0\)/.test(entry)
  && /function syncLoopButton\([\s\S]*?button\.textContent = loopOn[\s\S]*?bars === 1[\s\S]*?Loop Off/.test(entry)
  && /function syncLoopAnchor\([\s\S]*?Audio\.loopStart === pendingLoopAnchor\.start[\s\S]*?loopAnchor = pendingLoopAnchor\.start/.test(entry)
  && !/function syncLoopAnchor\(\) \{[^}]*currentLoopBounds\(\)/.test(entry)
  && /function markBar\([\s\S]*?Audio\.setLoopAtBoundary\(bounds\.start, bounds\.end\)[\s\S]*?classList\.add\('pending'\)/.test(entry)
  && /function markBar\([\s\S]*?scheduleSelectionEditors\(\)/.test(entry)
  && /function scheduleSelectionEditors\([\s\S]*?requestIdleCallback/.test(entry)
  && /function setPlaying\([\s\S]*?flushSelectionEditors\(\)/.test(entry)
  && /function syncLoopAnchor\([\s\S]*?classList\.remove\('pending'\)/.test(entry)
  && /function syncPendingSeek\([\s\S]*?Audio\.pendingStep[\s\S]*?selregion[\s\S]*?classList\.remove\('pending'\)/.test(entry)
  && /function jumpTo\([\s\S]*?Audio\.setStepAtBoundary\(within\)[\s\S]*?pendingSeekStep = within[\s\S]*?selregion[\s\S]*?classList\.add\('pending'\)/.test(entry)
  && /function markBar\([\s\S]*?pendingSeekStep = null[\s\S]*?selregion[\s\S]*?Audio\.setLoopAtBoundary/.test(entry)
  && /\$\('timeline'\)\.onclick = \(e\) => \{[\s\S]*?const target = bar \* 16[\s\S]*?if \(!\(playing && loopOn\)\) jumpTo\(playing \? target : at\)/.test(entry)
  && /id="looptoggle"[^>]*aria-pressed="false"[^>]*>Loop Off<\/button>/.test(shell)
  && /#loopregion \{[^}]*border: 1px solid color-mix\(in srgb, var\(--accent\) 58%, transparent\)/.test(shell)
  && /#loopregion\.pending/.test(shell)
  && /#selregion\.pending/.test(shell)
  && /@keyframes loopPendingPulse/.test(shell),
  'the loop uses the highlighted bar range before locator fallback, keeps song-relative'
  + ' bounds, and Play from start restores step 0 after arming so the intro is heard');
assert(/function hideLoopUi\([\s\S]*?showLocatorUi\(\)/.test(entry)
  && /function showLocatorUi\([\s\S]*?step == null \? 'none' : '(?:block)?'/.test(entry)
  && /if \(e\.altKey\) \{[\s\S]*?toggleLocator\(at\)/.test(entry),
  'locator pins remain visible when looping is off and Alt-click is their placement gesture');
assert(!/id="loopbars"/.test(shell)
  && !/1\/2\/4\/8\/0[^<]*Loop bars/.test(shell),
  'the old loop-bars control and keyboard hint are gone');

// The flush boundaries. Each one of these is a way a take can be silently lost.
for (const [fn, why] of [
  ['function setPlaying', 'the transport stopping ends the take'],
  ['function undo', 'undo writes the take first, so ⌘Z removes what you just played'],
]) {
  const body = new RegExp(`${fn}\\([\\s\\S]*?\\n\\}`).exec(entry)?.[0] || '';
  assert(/endTake\(/.test(body), why);
}

// ---- the BEAT is the boundary, not the bar ----------------------------------------
//
// It was the bar line, and that was too slow to play against: at 120bpm you could play a
// note and watch two seconds of nothing before it appeared in the roll — long enough to
// think it had been missed and play it again. A beat is four times sooner and free,
// because the undo steps coalesce.
assert(/function recordFollow\([\s\S]*?Math\.floor\(heardStep \/ 4\)/.test(entry),
  'the flush boundary is the BEAT — a bar line is two seconds at 120bpm, which is long'
  + ' enough to look like the recorder missing the note');
assert(/function recordFollow\([\s\S]*?if \(beat !== recLastBeat \|\| heardStep < recLastHeard\)/
  .test(entry),
  'and time going BACKWARDS counts as a crossing too — on a short loop the wrap is the'
  + ' only signal there is');
assert(!/recLastBar/.test(entry),
  'and nothing still reads the bar counter it replaced — a stale one leaves the beat'
  + ' tracking unseeded and flushes once for nothing on every play');
assert(/undoTag: 'record'/.test(entry)
  && /if \(undoable\) pushUndo\(undoTag\);/.test(entry),
  'four writes a bar are free because they COALESCE — pushUndo already merges same-tagged'
  + ' edits inside 700ms, so a continuous phrase is one ⌘Z rather than one per beat');

// ---- everything the recorder uses is actually imported ---------------------------
//
// Twice now a function has been used here and left out of the import list. esbuild
// bundles it happily — an undefined global is legal JavaScript until it runs — so the
// first sign is a ReferenceError on the first recorded note. Cheap to check, and it
// checks the whole module rather than the two that got caught by hand.
{
  const recorder = readFileSync(new URL('../tools/lib/note-recorder.js', import.meta.url), 'utf8');
  const exported = [...recorder.matchAll(/^export (?:function|const) (\w+)/gm)].map((m) => m[1]);
  // `[^}]*` rather than `[\s\S]*?`: an import list holds no braces, and a lazy match
  // anchored on the first `import {` in the file swallows every import above this one.
  const importRe = /import \{([^}]*)\} from '\.\/lib\/note-recorder\.js';/;
  const importBlock = importRe.exec(entry)?.[1] || '';
  const imported = new Set(importBlock.split(',').map((s) => s.trim()).filter(Boolean));
  assert(imported.size > 0, 'the desk imports from note-recorder.js at all');
  const body = entry.replace(importRe, '');
  const missing = exported.filter((name) => new RegExp(`\\b${name}\\s*\\(`).test(body) && !imported.has(name));
  assert(missing.length === 0,
    `every note-recorder function the desk calls is in its import list (missing: ${JSON.stringify(missing)})`);
  const unused = [...imported].filter((name) => !new RegExp(`\\b${name}\\s*\\(`).test(body));
  assert(unused.length === 0,
    `and nothing is imported that is not called (dead: ${JSON.stringify(unused)})`);
}
assert(/function flushTake\([\s\S]*?applyArrangementEdit\(d, null, \{/.test(entry),
  'and EVERY write is silent — a toast four times a bar is not notice, it is weather');
{
  const body = /function flushTake\([\s\S]*?\n\}/.exec(entry)?.[0] || '';
  assert(/const live = reason === 'beat'/.test(body)
    && /render: !live/.test(body)
    && /persist: !live/.test(body)
    && /rearmLoop: !live/.test(body),
    'beat recording commits keep the live arrangement current without rebuilding the desk,'
    + ' writing storage, or re-arming the loop on every boundary');
  assert(/function finalizeLiveTake\([\s\S]*?localStorage\.setItem\(ARRANGE_KEY/.test(entry),
    'the deferred recording persistence and redraw happen once when the take ends');
}
// The summary has to hang off the take ending, not off the last write: a beat flush has
// almost always emptied the buffer by the time you disarm, so a toast on the final write
// fired only if you stopped within half a second of playing.
assert(/function endTake\([\s\S]*?if \(announce && recSessionNotes > 0\)[\s\S]*?toast\(/.test(entry),
  'the "Recorded N notes" summary comes from endTake and the session totals, so it fires'
  + ' whenever a take ends rather than only when the buffer happened to be non-empty');
assert(/if \(recArmed\) endTake\('undo', \{ announce: false \}\);/.test(entry),
  'except on undo — "Recorded 6 notes" a moment before taking them away is a lie about'
  + ' what just happened');
assert(/function discardTake\(\)[\s\S]*?recSessionNotes = 0;/.test(entry),
  'and a discarded take resets the totals, or endTake announces one that was abandoned');

// ---- a key still down when the take is flushed ------------------------------------
//
// The regression the beat flush caused, and the reason it is pinned here rather than left
// to be noticed: clearing the take threw away the open-note tokens with it, so a note-off
// arriving after a flush had nothing to attach a length to and the note kept the roll's
// one-step default. Nearly invisible at a two-second bar flush — most notes are released
// inside their own bar. Near-universal at 500ms.
{
  const body = /function flushTake\([\s\S]*?\n\}/.exec(entry)?.[0] || '';
  assert(!/recOpen\.clear\(\)/.test(body),
    'a flush does NOT clear the held-note map — a key that is still down has not finished'
    + ' being a note, and dropping it made every held note come out a sixteenth long');
  assert(/carryHeld\(\)/.test(body),
    'it re-adds the held notes to the fresh take instead, so their eventual note-off'
    + ' still has somewhere to write a length');
  assert(body.indexOf('applyArrangementEdit') < body.indexOf('carryHeld()'),
    'and it does that AFTER the write, so the re-seeded notes read a draft that holds them');
}
assert(/function carryHeld\(\)[\s\S]*?recOpen\.set\(src, \{ \.\.\.held, token \}\)/.test(entry),
  'carryHeld repoints the token and keeps everything else — `at` above all, so the length'
  + ' is still measured from the original press rather than from the last flush');
assert(/if \(src\) recOpen\.set\(src, \{ token, at: heard, bar, lane: laneKey, step: inBar, midi, freq \}\);/
  .test(entry),
  'which is why a held note records where it is as well as when — a re-add needs the bar,'
  + ' lane, step and pitch, not just the token');
assert(!/function recCount\(/.test(entry) && !/recCount\(\)/.test(entry)
  && !/Record · \$\{n\}/.test(entry) && !/data-count/.test(entry) && !/data-count/.test(shell),
  'recording has no live note-count badge; the transport only communicates armed/recording state');
assert(/let recSessionNotes = 0;[\s\S]*?if \(announce && recSessionNotes > 0\)[\s\S]*?toast\(/.test(entry),
  'the completion toast still keeps the session total and reports what was recorded when the take ends');

// ---- a chord stays a chord --------------------------------------------------------
assert(/chordAnchor\(recChord, performance\.now\(\)/.test(entry),
  'notes are anchored to the first of a cluster, or a chord whose notes land either side'
  + ' of a rounding boundary splits into a note plus a dyad a step later');
assert(/!polyLane\(editBank\(\), laneKey\) && laneKind\(laneKey\) !== 'perc' && !recChordWarned/
  .test(entry),
  'and a chord played into a lane that genuinely cannot hold one says so — one note out'
  + ' of three kept silently is indistinguishable from the recorder dropping them');

// ---- which lanes can hold a chord --------------------------------------------------
//
// Not `CHORD_LANES`. That named the two lanes whose hand-written playback loops over the
// step, and it was the whole answer until the rack arrived — the rack is deliberately
// lane-agnostic about polyphony, so what decides it is which code plays the step.
assert(/stacks: \(lane\) => polyLane\(editBank\(\), lane\)/.test(entry),
  'the recorder asks polyLane which lanes stack');
{
  const voices = readFileSync(new URL('../src/data/voices.js', import.meta.url), 'utf8');
  const body = /export function polyLane\([\s\S]*?\n\}/.exec(voices)?.[0] || '';
  assert(/PERCUSSION_LANES\.includes\(base\)\) return false/.test(body)
    && /!MONO_LANES\.includes\(base\)/.test(body),
    'and polyLane is now about the LANE alone — percussion holds booleans, the gesture'
    + ' and word lanes hold one shape per step, and everything pitched can hold a chord');
  assert(!/v\.kind !== 'engine'/.test(body),
    'with no preset test left in it: the four hand-written pitched bodies loop over the'
    + ' step now, so "which code plays it" no longer changes the answer');
  const audio = readFileSync(new URL('../src/engine/audio.js', import.meta.url), 'utf8');
  assert(/const tonesOf = \(v\) => \(Array\.isArray\(v\)/.test(audio),
    'scheduleStep resolves a step to a LIST of frequencies');
  const noteVars = { lead: 'leadNote', bass: 'bassNote', leadHarm: 'harmNote', twinkle: 'twinkleNote' };
  for (const lane of ['lead', 'bass', 'leadHarm', 'twinkle']) {
    assert(new RegExp(`for \\(const \\[[^\\]]+\\] of tonesOf\\(${noteVars[lane]}\\)\\.entries\\(\\)\\)`).test(audio),
      `and ${lane}'s hand-written body runs once per tone — free, because play() builds`
      + ' its own oscillator per call, which is why two keys at once always sounded');
  }
  assert(/const bassRoot = tonesOf\(bassNote\)\[0\];/.test(audio),
    'and the star arpeggio takes a chord\u2019s lowest tone as its root rather than the'
    + ' whole array, which would have broken it');
}
// The roll asks the CHANNEL switch, not the lane's identity. Mono is still the default
// everywhere but the chord lanes — most rack-voiced lanes in the game are bass and lead,
// single-note parts where clicking a new pitch on an occupied step is how you CORRECT a
// note — but Poly is now a switch away rather than out of reach.
{
  const roll = readFileSync(new URL('../tools/mixer-piano-roll.js', import.meta.url), 'utf8');
  assert(/const isChord = \(value\) => modeFor\(lane\(\)\) === 'poly' \|\| Array\.isArray\(value\);/.test(roll),
    'the roll decides chord-ness from the CHANNEL switch, or from a step that already'
    + ' holds a chord — never flattening a recorded chord because the switch says Mono');
  assert(/export const defaultVoiceMode = \(laneKey\) =>\s*\(CHORD_LANES\.includes\(baseLane\(laneKey\)\) \? 'poly' : 'mono'\);/.test(roll),
    'and a channel starts Mono unless it is a chord lane, so the default is never the mode'
    + ' that stacks onto a note you meant to correct');
  assert(/const canStack = \(key\) => polyLane\(editBank\(\), key\);/.test(roll)
    && /const modeFor = \(key\) => \(canStack\(key\)[\s\S]*?: 'mono'\);/.test(roll),
    'Poly is gated on polyLane — the same authority the recorder asks — so vox and shout'
    + ' cannot be handed a chord the engine would drop');
  assert(/const voiceModes = new Map\(\);/.test(roll)
    && /voiceModes\.get\(baseLane\(key\)\) \?\? defaultVoiceMode\(key\)/.test(roll),
    'the switch is remembered per channel and holds only what was CHANGED, so selecting'
    + ' chords after setting bass to Poly still gives a poly chord lane');
  assert(!/localStorage[^\n]*voice/i.test(roll),
    'and it is not persisted: a stale Poly on bass next week turns the click that corrects'
    + ' a note into the click that stacks onto it');
}

// ---- MIDI and Record reach the song without the keyboard open ---------------------
//
// The gate was there so a song could not change for reasons you cannot see. The arm is
// in the header now and stays lit whatever is shut, which serves that better than making
// you open a window you are not looking at.
for (const id of ['midibtn', 'recbtn']) {
  assert(new RegExp(`id="${id}"[^>]*class="[^"]*\\biconbtn\\b`).test(shell),
    `${id} is an icon button in the header, in the row with the other four`);
  assert(new RegExp(`\\$\\('${id}'\\)\\.onclick`).test(entry),
    `and ${id} is wired to the same function the keyboard's own button calls`);
}
const midiBody = /function onMidiMessage\([\s\S]*?\n\}/.exec(entry)?.[0] || '';
assert(!/if \(!oskShown\(\) \|\| !oskPlayable/.test(midiBody)
  && /if \(!oskPlayable\(selectedLane\)\) return;/.test(midiBody),
  'MIDI is NOT gated on the keyboard being open — a MIDI keyboard is a real instrument'
  + ' and your eyes are on your hands, not on a drawn one. A channel to play is still'
  + ' required, because that is where the notes would go.');
// The one remaining `oskShown` in here is a guard on LIGHTING a drawn key, and it has to
// sit after the note has sounded — in front of it, it would be the old gate again.
assert(midiBody.indexOf('oskPlay(note') < midiBody.indexOf('if (!oskShown()) return;'),
  'and the only thing still asking whether the keyboard is open is the key-lighting,'
  + ' after the note has already played');
assert(/const kit = oskKitLanes\(\);/.test(midiBody)
  && !/querySelectorAll\('\.oskpad'\)/.test(midiBody),
  'and a drum arrives off the SONG’s kit rather than off the drawn pads, so General MIDI'
  + ' still lands on the right channel with the window shut');
assert(/function oskTypedKey\(e\) \{\s*if \(!oskCatch \|\| !oskShown\(\)\) return false;/.test(entry),
  'while the COMPUTER keys keep their gate — the desk’s letters are its shortcuts, and'
  + ' oskCatch is the negotiated hand-over');
const showOskBody = /function showOsk\([\s\S]*?\n\}/.exec(entry)?.[0] || '';
assert(!/recArmed = false/.test(showOskBody),
  'closing the keyboard no longer disarms: the arm is in the header and closing a window'
  + ' you were not playing with is not a reason to end a take');
// Record belongs WITH the transport, not with the panel toggles on the right: those are
// windows you open, this arms what the transport is about to do. Which side of the
// transport group's closing tag it sits on is a spacing decision and deliberately not
// pinned here — what matters is that it follows the transport and precedes the loop tray,
// rather than living over by A/B and Undo where it started.
{
  const at = (id) => shell.indexOf(`id="${id}"`);
  assert(at('recbtn') > at('pause'),
    'Record comes after Pause — where a record button has been on every deck since tape');
  assert(at('recbtn') < at('looptoggle') && at('recbtn') < at('ab'),
    'and stays on the transport side of the header, not out with the panel toggles');
  assert(at('midibtn') > at('rollbtn'),
    'while MIDI stays over with the panel toggles — it answers which instrument plays the'
    + ' channel, the same question the ⌨ button answers');
}
// Red dot at rest, white dot on red while rolling. The colour is the state.
assert(/\.recicon \.body \{ fill: var\(--hot\); \}/.test(shell),
  'the dot is red at rest — `--hot`, the desk’s own red, defined in all nine themes');
assert(/#recbtn\.live \{[^}]*background: var\(--hot\)/s.test(shell)
  && /#recbtn\.live \.body \{ fill: #fff/.test(shell),
  'and recording is a WHITE dot on a RED button — the one state that must never be'
  + ' mistaken for another');
// The bug in the screenshot: `#midibtn.on { color: var(--accent) }` against
// `button.on { background: var(--accent) }` is teal on teal, and the button lit up as a
// solid block with the socket invisible inside it.
assert(!/#midibtn\.on/.test(shell),
  'MIDI has NO colour rule for its lit state — `button.on` already paints teal and sets'
  + ' `--on-accent` for what is drawn on it, and overriding it was teal-on-teal');
assert(/\.midiicon \.ring \{[^}]*stroke: currentColor/s.test(shell)
  && /\.midiicon \.pin \{[^}]*fill: currentColor/s.test(shell),
  'and the socket is drawn entirely in currentColor, so it inherits that contrast');
assert(/recordFollow\(heardStep\);/.test(entry),
  'and it is driven from the desk’s own playhead, so it sees the same step the line does');

// One clock, hoisted, because two copies drift the moment anybody nudges [ or ].
assert(/function heardStepNow\(\) \{[\s\S]*?phOffset \/ 1000/.test(entry),
  'the heard step is one function, phOffset trim included');
assert(/const PH_DEFAULT = 70;/.test(entry)
  && /id="phoffset" type="number"[^>]*value="70"/.test(shell),
  'the default playhead correction gives the piano roll a modest visual lead');
assert(/const ARRANGEMENT_PAINT_LEAD_MS = 24;/.test(entry)
  && /const NOTE_VISUAL_LEAD_MS = \{ solid: 0, pulse: 10, trail: 45 \};/.test(entry)
  && /function arrangementVisualLeadMs\(\) \{[\s\S]*?ARRANGEMENT_PAINT_LEAD_MS \+ \(NOTE_VISUAL_LEAD_MS\[noteVisualMode\] \?\? 0\)/.test(entry)
  && /const lead = arrangementVisualLeadMs\(\) \/ 1000 \/ spb;/.test(entry)
  && /const visualStep = arrangementVisualStep\(heardStep\)/.test(entry)
  && /followArrangementVisual\(visualStep\)/.test(entry),
  'arrangement highlights lead the attack by a frame plus the language’s own ramp,'
  + ' so the mark peaks on the beat instead of after it');

// The lead used to be clamped only at the END OF THE SONG, so a loop that stopped
// mid-song had the lead spill past its last bar and light the first note of the bar
// after — a note the transport never plays.
assert(/function playbackWrapRange\(step, totalSteps\) \{[\s\S]*?const \{ loopStart, loopEnd \} = Audio;[\s\S]*?step >= loopStart && step < loopEnd\) \{[\s\S]*?start: loopStart, end: Math\.min\(loopEnd, totalSteps\)/.test(entry)
  && /function playbackWrapStep\(step, totalSteps\) \{\s*return playbackWrapRange\(step, totalSteps\)\.end;/.test(entry)
  && /return Math\.min\(playbackWrapStep\(step, totalSteps\) - 1e-6, step \+ lead\);/.test(entry),
  'and the lead stops at the LOOP’s end, not just the song’s, so looping never lights'
  + ' the first note of the bar after the loop');

// …and neither does the playhead itself. `phOffset` is a lead too — the screen trim —
// and applied to the last few milliseconds of a lap it lands past the end of the loop.
// Modulo against the whole song cannot catch that, because the song is longer than the
// loop: for phOffset milliseconds every lap the desk read a step in the bar AFTER the
// loop and lit its first note in the arrangement, the roll and the step grid at once.
assert(/function heardStepNow\(\) \{[\s\S]*?const at = beat \* 4;[\s\S]*?const led = Math\.max\(0, at \+ \(phOffset \/ 1000\) \/ spb\);[\s\S]*?return wrappedPlaybackStep\(led, at, totalSteps\);/.test(entry)
  && !/return Math\.max\(0, \(beat \* 4\) \+ \(phOffset \/ 1000\) \/ spb\) % totalSteps;/.test(entry),
  'the heard step wraps against the range the transport turns round in, not against the'
  + ' whole song, so the screen trim can never carry the line past the loop’s end');

// The arithmetic itself, run rather than matched.
{
  const src = /function playbackWrapRange\(step, totalSteps\) \{[\s\S]*?\nfunction wrappedPlaybackStep\(led, at, totalSteps\) \{[\s\S]*?\n\}/.exec(entry)?.[0] || '';
  const build = (loopStart, loopEnd) => new Function('Audio', `${src}
    return { playbackWrapRange, playbackWrapStep, wrappedPlaybackStep };`)({ loopStart, loopEnd });
  const near = (a, b) => Math.abs(a - b) < 1e-9;

  // 64 steps of song, no loop: the trim still wraps at the end of the song.
  const song = build(null, null);
  assert(near(song.wrappedPlaybackStep(64.4, 63.6, 64), 0.4)
    && near(song.wrappedPlaybackStep(20.4, 20, 64), 20.4)
    && song.playbackWrapStep(20, 64) === 64,
    'with no loop armed the trim wraps at the end of the song, exactly as it always did');

  // Bars 2–3 of that song looped. The trim carries the line off the end of bar 3 —
  // it must come back at bar 2, never appear in bar 4.
  const mid = build(16, 32);
  assert(near(mid.wrappedPlaybackStep(32.4, 31.6, 64), 16.4)
    && near(mid.wrappedPlaybackStep(31.9, 31.6, 64), 31.9)
    && mid.playbackWrapStep(20, 64) === 32,
    'a trim that runs off the end of a mid-song loop lands at the loop’s start, not in'
    + ' the bar after it');

  // A negative trim — [ pulled the line back — at the top of a lap belongs at the END
  // of the loop, which is the music playing then, not at the end of the song.
  assert(near(mid.wrappedPlaybackStep(15.8, 16.05, 64), 31.8),
    'and a trim pulled the other way lands at the loop’s end, not the song’s');

  // The case that makes a single range function load-bearing: a loop whose end IS the
  // song's end. Read the end and the start separately and they disagree about which
  // range this step is in, and the line wraps to the top of the SONG mid-loop.
  const tail = build(48, 64);
  assert(near(tail.wrappedPlaybackStep(64.2, 63.6, 64), 48.2),
    'a loop ending on the song’s last bar still wraps to the LOOP’s start');

  // Outside the region — the intro before the loop is reached, or the lookahead still
  // draining after Loop was armed — nothing drags the line into the loop.
  assert(near(mid.wrappedPlaybackStep(8.4, 8, 64), 8.4)
    && mid.playbackWrapStep(8, 64) === 64,
    'and a step outside the region is never dragged into it');
}
assert(/const heardStep = heardStepNow\(\)/.test(entry),
  'the playhead reads it');
assert(/function recordNote\([\s\S]*?heardStepNow\(\)/.test(entry),
  'and so does the recorder — Audio.step is the scheduler’s FUTURE and carries a cycle'
  + ' offset, so it must never be the thing a note is quantised against');

// Shift is how ⇧R gets through hands that are on the notes.
assert(/function oskTypedKey\(e\) \{[\s\S]{0,400}?if \(e\.shiftKey\) return false;/.test(entry),
  'the keyboard declines everything shifted, which frees the shifted alphabet for good');
const shortcuts = /addEventListener\('keydown', \(e\) => \{[\s\S]*?\n\}\);/.exec(entry)?.[0] || '';
assert(shortcuts.indexOf("e.shiftKey && key === 'r'") > 0
  && shortcuts.indexOf("e.shiftKey && key === 'r'") < shortcuts.indexOf("key === 'r'"),
  '⇧R is tested BEFORE the plain-R reset — this handler lowercases the key and does not'
  + ' look at Shift, so the wrong order resets the channel every time you try to arm');
assert(/const dropped = recArmed \? discardTake\(\) : 0;\s*\n\s*panicAll\(\)/.test(entry)
  && !/if \(key === 'escape'\)[\s\S]{0,200}?discardTake\(\)/.test(entry),
  'the panic takes the unwritten end of a take with it, and the on-screen keyboard no'
  + ' longer claims ⎋ for itself — an emergency cut that stops working when a window is'
  + ' up is not one you can reach for');

// Solo is per-song monitoring, and the desk deliberately keeps it across a mix
// re-apply (reapplySolo). A song switch is the one boundary it must NOT cross: the
// clear has to land before buildRack draws the new S buttons and before
// applyToEngine hands reapplySolo the chance to put it back.
const loadTrackBody = /function loadTrack\(id\) \{[\s\S]*?\n\}/.exec(entry)?.[0] || '';
assert(loadTrackBody.includes('dropSolo()'),
  'opening a song clears solo — it belongs to the mix you left, not the one you opened');
assert(loadTrackBody.indexOf('dropSolo()') < loadTrackBody.indexOf('buildRack()')
  && loadTrackBody.indexOf('dropSolo()') < loadTrackBody.indexOf('applyToEngine('),
  'and clears it before the rack is rebuilt and before reapplySolo could push it back');
assert(/function dropSolo\(\) \{[\s\S]*?soloed\.delete\(key\)[\s\S]*?soloedAux\.delete\(id\)[\s\S]*?\n\}/.test(entry)
  && !/function dropSolo\(\) \{[\s\S]*?\n\}/.exec(entry)[0].includes('toast('),
  'dropSolo empties both solo sets — lanes and sends — and says nothing, because a'
  + ' song switch is not the user clicking S');
assert(/function clearAllSolo\(\) \{[\s\S]*?dropSolo\(\)[\s\S]*?toast\('Solo cleared'\)/.test(entry),
  'while the S button still reports, over the same one implementation');

// ---- layer solo -------------------------------------------------------------------
//
// The same gesture one level down: S on a layer card plays that layer on its own. It is
// monitoring, so the whole of its correctness is that it never becomes part of the
// preset — and that it cannot outlive the panel that is showing it.
const engineSource = readFileSync(new URL('../src/engine/audio.js', import.meta.url), 'utf8');
const rackSource = readFileSync(new URL('../src/engine/voices.js', import.meta.url), 'utf8');

for (const i of [1, 2, 3]) {
  assert(editor.includes(`solo: \`osc${i}\``) || editor.includes('solo: `osc${i}`'),
    `layer ${i} offers a solo button — a stack you cannot take apart by ear needs one`);
}
// The map lives on the singleton, NOT on the rack. The rack is disposed with the context
// and rebuilt on demand, so solo kept there would empty itself while the desk still
// showed lit buttons — the whole reason this is stated in two files rather than one.
assert(/this\.soloLayers = new Map\(\);/.test(engineSource),
  'AudioSys owns the solo map, which outlives every rack it hands it to');
assert(/this\.soloLayers = null;/.test(rackSource)
  && /this\.voices\.soloLayers = this\.soloLayers;/.test(engineSource),
  'and the rack only holds a REFERENCE to it, re-pointed each time one is built');
// Never a preset key. `_playLayer` reads it off the rack, so nothing reaches `v.` — which
// is what keeps tests/pot-coverage.js from seeing a hidden parameter, and what keeps a
// solo out of every save, every song copy and every measured level.
assert(!/v\.solo|voice\.solo/.test(rackSource),
  'solo is never read off the preset — it is monitoring, not a parameter');
// Clicking S has not changed the sound, only what you are hearing of it.
const soloBtn = /if \(group\.solo\) \{[\s\S]*?bar\.append\(s\);/.exec(editor)?.[0] || '';
assert(soloBtn && !soloBtn.includes('touched()'),
  'soloing a layer does not mark the preset dirty — nothing about it has been edited');
// One way out, and it drops solo on the way — and takes the full window with it, which
// draws the same preset and would otherwise be a modal over a panel that is gone.
assert(/const closePanel = \(\) => \{ full\?\.close\(\); dropSolo\(\); close\(\); \};/.test(editor),
  'every exit from the panel goes through closePanel, which shuts the full window and'
  + ' drops solo first');
// And nothing calls the INJECTED close() around it. `full?.close()` is the overlay's own
// and a different function, hence the dot in the excluded set.
assert(!/[^a-zA-Z.?]close\(\);/.test(editor.replace(/const closePanel = [^\n]*\n/, '')),
  'and nothing calls the raw close() around it, which would leave a solo ringing');
assert(/if \(!id\) Audio\.clearLayerSolo\(\);/.test(entry),
  'a null id from the panel clears every layer solo on the engine');

// ---- the damper pedal ---------------------------------------------------------------
//
// CC 64 is the pedal under every MIDI keyboard, and its whole job is to stop note-offs
// arriving. The rack can sustain now (see `_heldNative`), so a pedal that did nothing
// would be the one part of the chain still pretending notes have fixed lengths.
assert(/kind === 0xB0 && note === 64/.test(entry),
  'the damper (CC 64) is read — a controller message is no longer dropped on the floor');
assert(/vel >= 64/.test(entry),
  'and it uses the MIDI convention for down: at or above 64');
// Sliced by index rather than matched by a regex that would have to span braces and
// newlines: the note-off branch is short, and 700 characters is comfortably all of it.
const offAt = entry.indexOf('if (kind === 0x80 || (kind === 0x90 && !vel))');
const offBody = offAt < 0 ? '' : entry.slice(offAt, offAt + 700);
assert(offBody.includes('sustainDown') && offBody.includes('sustainHeld.add'),
  'a note-off while the pedal is down is HELD rather than played out');
assert(offBody.includes('recordOff') && offBody.includes('oskReleaseVisual'),
  'while the key still lifts and the recorder still closes the note at the length played —'
  + ' a part that grew because a foot was down is a part nobody played');
assert(/sustainHeld\.delete\(`m:\$\{note\}`\)/.test(entry),
  'and re-pressing a held key takes it back, as it does on a piano');
const midiOffAt = entry.indexOf("for (const input of midiInputs()) input.onmidimessage = null;");
const midiOffBody = midiOffAt < 0 ? '' : entry.slice(midiOffAt, midiOffAt + 900);
assert(midiOffBody.includes('dropSustain()')
  && midiOffBody.indexOf('dropSustain()') < midiOffBody.indexOf("releaseOskSources('m:')"),
'switching MIDI off drops the pedal before releasing what it was holding');

// ---- the full-window editor -----------------------------------------------------------
//
// Two claims about wiring that are invisible from inside either file, and both of which
// fail SILENTLY — one at the ear and one at the eye.

// 1. ⎋ order. The overlay's Escape listener calls `stopImmediatePropagation` so PANIC does
// not also fire, and that only stops listeners registered AFTER it on the same target.
// Registered the wrong way round, closing the editor also silences every voice.
const escAt = entry.indexOf("voiceEditor.closeFull();");
const panicAt = entry.indexOf('PANIC — what the red button');
assert(escAt > 0 && panicAt > 0 && escAt < panicAt,
  'the full editor takes ⎋ BEFORE the PANIC handler — stopImmediatePropagation only stops'
  + ' listeners added after it, so registered the other way round Escape would also kill'
  + ' every voice');

// 1b. The overlay may never be shown-but-empty. `#synthfull.show` is full-screen with
// `pointer-events: auto`, so an empty one sits invisibly over the desk and swallows every
// click — on the strip panel too. The symptom reads as "the whole mixer stopped
// responding", which points nowhere near this file. Two guards, both asserted here
// because both were live bugs: the deferred `show` must re-check that it is still wanted,
// and a `render()` that throws must tear the shell down rather than leave it up.
const full = readFileSync(new URL('../tools/mixer-synth-full.js', import.meta.url), 'utf8');
const shellCss = readFileSync(new URL('../tools/mixer-shell.html', import.meta.url), 'utf8');
// The callback does more than add the class now — it is also the first frame with real
// column widths, so the label fit and the graphs run in it — so what is asserted is the
// GUARD: nothing in that callback happens unless the window is still wanted.
assert(/requestAnimationFrame\(\(\) => \{\s*if \(!showing\) return;\s*el\.classList\.add\('show'\);/.test(full),
  'the deferred show re-checks that the window is still wanted — an open/close inside one'
  + ' frame must not re-show an overlay that has already gone');
assert(/try \{\s*render\(\);\s*\} catch/.test(full),
  'a render() that throws closes the window rather than leaving an empty full-screen'
  + ' element over the desk');

// 1c. Folding is a class, not a rebuild, and the class has to actually win. A folded
// card grows the instant its DEPTH leaves zero — which happens on the first pixel of the
// drag doing it, so rebuilding there would drop the pot out from under the pointer. And
// `.vehidden` competes with five row-layout rules at higher specificity: without the
// `!important` the pots hid and the pills did not, which is how this first shipped.
assert(/\.vehidden \{ display: none !important; \}/.test(shellCss),
  'a folded row is hidden by a class that beats the row layout rules — .devgrid .segrow'
  + ' sets display:flex at higher specificity');
assert(/guards\.push\(wrap, \(v\) => !folding\(v\), true\)/.test(editor),
  'folding registers a hide-guard, so the card opens on the next write rather than on the'
  + ' next build — a rebuild would drop the drag that is opening it');

// 2. One control, one rule. The pots and pills are styled once for both surfaces, against
// `:is(#voiceedit, #synthfull)` — same specificity as the `#voiceedit` it replaced, so the
// strip cannot have shifted. A control rule scoped to one surface is a control that can
// drift into looking like two.
const CONTROL_RULES = ['.devgrid', '.potrow', '.vepot', '.segbtn', '.seg ', '.segrow',
  '.vedisabled', '.veswitch', '.vesolo'];
for (const sel of CONTROL_RULES) {
  const orphan = new RegExp(`#voiceedit \\${sel.trim()}[\\s{.:>,]`).test(shellCss);
  assert(!orphan, `${sel.trim()} is styled for both surfaces, not just the strip`
    + ' — see :is(#voiceedit, #synthfull)');
}

// 3. A flex container that also carries `row` must say which way it runs.
//
// THE BUG THIS PINS, because it is silent and it looks like nothing at all: every choice
// row in the full window is built as `div('row sfchoice …')`, and the desk's own `.row` is
// `display: flex; flex-direction: column`. So a rule that says `display: flex` and stops
// there inherits COLUMN — the label lands above its options, and a pair of them meant to
// sit side by side stacks instead. Nothing errors, nothing overflows, and the CSS comment
// one line above says "the label left, the options right", so reading the file tells you
// the opposite of what the browser is doing. It survived three rounds of "put them on one
// line" before anyone thought to measure a bounding box.
//
// `.sfglyphrow` already had its `flex-direction: row` — it was the one row that looked
// right, and that was the clue.
for (const sel of ['.sfchoice', '.sfpair']) {
  const rule = new RegExp(`#synthfull \\${sel} \\{[^}]*\\}`).exec(shellCss)?.[0] || '';
  assert(/display:\s*flex/.test(rule) && /flex-direction:\s*row/.test(rule),
    `#synthfull ${sel} declares flex-direction — it carries the desk's .row class, which`
    + ' is flex-direction: column, so an unstated direction stacks it');
}

// 4. The strip panel reports the synth class; it does not choose it.
//
// The class dropdown reseeds the preset from that class's defaults — every card below the
// head becomes a different card. That is a library act, done where the preset is built.
// Beside a channel strip the panel is aimed at the sound the lane is playing RIGHT NOW,
// and a dropdown one row under the preset's name is far too easy a way to replace it.
assert(/if \(state\.laneKey\) \{[\s\S]{0,600}?vesynth veclass[\s\S]{0,400}?\} else \{[\s\S]{0,200}?fxsel vesynth/.test(editor),
  'docked against a strip the SYNTH row is a badge, not a class dropdown — only the'
  + ' library panel can change what a preset is built from');

// A song-local copy is keyed by lane and song, so its id does NOT move when the lane is
// put on another preset — `registerSongVoice` writes a new object under the same key. The
// follow therefore has to compare the object the panel is holding, or picking MRDR-3 while
// the editor is on a DuoSynth leaves DuoSynth's cards over an MRDR-3 lane.
assert(/get voice\(\) \{ return state\?\.voice \|\| null; \}/.test(editor),
  'the editor exposes the preset OBJECT it is drawing, not just its id');
assert(/if \(chosen === voiceEditor\.editing && preset === voiceEditor\.voice\) return false;/.test(entry)
  && /const choiceChanged = chosen !== voiceEditor\.editing \|\| preset !== voiceEditor\.voice;/.test(entry),
  'the editor follows its lane by preset OBJECT — a song-local id stays put across a'
  + ' change of preset, so an id comparison reads a new synth as the old one');

// And the other half of the same rule: the lane can still change presets under the panel,
// so the panel has to follow or go. A refused `open` leaves the OLD surface — MRDR-3's
// Quick macros on a strip now playing a GameSynth — which is the state the badge above
// makes unreachable from the panel and this makes unreachable from the lane.
assert(/if \(!voiceEditor\.open\(chosen, \{ laneKey, laneLabel: targetLabel\(laneKey\) \}\)\) \{\s*\n\s*dismissVoiceEditor\(\);\s*\n\s*return true;/.test(entry),
  'a lane whose preset the editor cannot open takes the panel down rather than leaving'
  + ' the previous preset\'s surface attached to it');

// ---- a generated song's own instruments are editable ---------------------------------
//
// A style pack writes its sounds into the COMPOSITION — `bassVoice: 'stRoundMono'` in the
// bank — where a desk-chosen preset lands in the mix. The strip reads the bank back and
// names the sound, so the pen is there and the picker shows it as the one in play; the pen
// then answered "this lane is on the engine's own voice", because the mix names nothing.
// Every lane of every new song was un-editable, and the sounds it names are frozen
// starters that cannot be edited in the library either — so there was no way in at all.
//
// Asserted in two halves: the source takes the bank's name as the thing to fork, and the
// fork really does produce an editable preset — a starter's copy is not a starter.
assert(/const named = chosen \? null : defaultVoiceOf\(track\?\.bank, laneKey\);/.test(entry)
  && /const source = chosen \? VOICES\[chosen\] : \(named\?\.kind === 'engine' \? null : named\);/.test(entry)
  && /\[seam\.voiceKey\]: JSON\.parse\(JSON\.stringify\(source\)\)/.test(entry),
  'the pen on a generated song forks the preset the BANK names, not only one the mix does');

const { VOICES: CATALOGUE, defaultVoiceOf: defaultVoice, registerSongVoice: registerCopy } = await import('../src/data/voices.js');
const generated = { kickVoice: 'stKickPunch', bassVoice: 'stRoundMono' };
const bankNamed = defaultVoice(generated, 'bass');
const copyId = bankNamed && registerCopy('bassVoice', 'a-new-song', JSON.parse(JSON.stringify(bankNamed)));
const copy = copyId && CATALOGUE[copyId];
assert(bankNamed?.id === 'stRoundMono' && bankNamed.starter === true
  && !!copy && copy.starter === false && copy.songLocal === true
  && copy.songOrigin === 'library' && CATALOGUE.stRoundMono.starter === true,
  'a starter named by the bank forks into a song-local copy that is editable, and the'
  + ' frozen starter itself is left alone');
delete CATALOGUE[copyId];

console.log(failed ? 'MIXER LAYOUT: FAILED' : 'MIXER LAYOUT: OK');
process.exit(failed ? 1 : 0);
