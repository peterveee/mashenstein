import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VOICES } from '../src/data/voices.js';
import { offeredByEngine } from '../src/data/voices-in-play.js';
import { encodePatch, decodePatch } from '../tools/mrdr3-patch.js';
import { auditionLevel, PEAK_LEAN } from '../tools/mrdr3-level.js';
import { posToDb as faderPosToDb, dbToPos as faderDbToPos } from '../tools/mrdr3-master-meter.js';
import { benchLane } from '../tools/mixer-voice-library.js';
import { voiceGain, laneTarget } from '../src/data/voices.js';

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
assert(/keyboard: \{ octaves: 7, initialOctave: 2, minOctave: 0, maxOctave: 2 \}/.test(mixerEntry),
  'the Song Mixer Advanced editor uses the same seven-octave compact keyboard range');
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
assert(/const gf = held\('global\.filter', v\.global\?\.filter\) \? null : \(v\.global\?\.filter \|\| null\)/.test(voicesEngine)
  && /const sectionBypassed = \(voice, key, section = null\)/.test(voicesEngine)
  && /section\?\.enabled === false/.test(voicesEngine)
  && /held\('global\.filter', v\.global\?\.filter\)/.test(voicesEngine)
  && /if \(gf\) \{[\s\S]*?filterEnv\(chain\.stages, gf\.env/.test(voicesEngine)
  && /if \(spec\.filter && !held\(`layer\.\$\{layerKey\}\.filter`, spec\.filter\)\)/.test(voicesEngine),
  'MRDR-3 gates the global filter and every layer filter independently, using the same envelope path');
assert(/'global\.vca': \{ attack: 0, decay: 0, sustain: 1, release: 0 \}/.test(editor)
  && /const attack = Math\.max\(0, e\.attack \?\? 0\.01\)/.test(voicesEngine)
  && /if \(attack > 0\)/.test(voicesEngine)
  && /param\.setValueAtTime\(level, t\)/.test(voicesEngine),
  'MRDR-3 envelope bypass is neutral: instant attack, no decay/release and full sustain');
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
// How far a preset's own crest sits from the crest of the lane's hand-written voice —
// the whole of what separates the energy answer from the peak answer, in dB.
const tiltOf = (v, lane = benchLane(v)) => {
  const t = laneTarget(lane);
  return db((t.level * v.peak) / (t.peak * v.level));
};
assert.equal(PEAK_LEAN, 0.5);
{
  const t = laneTarget('bass');
  // A preset already sitting at the lane's own crest is already the answer both metrics
  // agree on, so the lean must leave it exactly where it is.
  const neutral = { level: t.level, peak: t.peak };
  assert(Math.abs(auditionLevel(neutral, 'bass') - neutral.level) < 1e-12);
  // Half the tilt, in dB, in both directions.
  const blip = { level: t.level / 8, peak: t.peak };        // eight times the lane's crest
  const pad = { level: t.level * 4, peak: t.peak };         // a quarter of it
  for (const v of [blip, pad]) {
    assert(Math.abs(db(auditionLevel(v, 'bass') / v.level) - tiltOf(v, 'bass') / 2) < 1e-9);
  }
  // A blip is levelled DOWN from where the energy metric would have put it and a
  // sustained sound UP — which is the complaint this exists to answer, in both
  // directions at once.
  assert(auditionLevel(blip, 'bass') > blip.level);
  assert(auditionLevel(pad, 'bass') < pad.level);
  assert(db(voiceGain({ level: auditionLevel(blip, 'bass') }, 'bass')) < db(voiceGain(blip, 'bass')));
  assert(db(voiceGain({ level: auditionLevel(pad, 'bass') }, 'bass')) > db(voiceGain(pad, 'bass')));
}
assert.equal(auditionLevel({ level: 0, peak: 1 }, 'bass'), null);
assert.equal(auditionLevel({ level: 1, peak: 0 }, 'bass'), null);
assert.equal(auditionLevel({ level: 1, peak: 1 }, 'nosuchlane'), null);
ok('the audition lean is neutral at lane crest, halves the tilt, and fails closed');

{
  // The library, end to end: every preset must move, none may move further than half
  // its own tilt, and the spread of what a note peaks at after levelling must close up.
  const before = mrdr.map((v) => tiltOf(v));
  const after = mrdr.map((v) => db(
    (laneTarget(benchLane(v)).level * v.peak)
    / (laneTarget(benchLane(v)).peak * auditionLevel(v, benchLane(v))),
  ));
  const spread = (a) => Math.max(...a) - Math.min(...a);
  assert(spread(before) > 17 && spread(before) < 18, `catalogue tilt spread ${spread(before)}`);
  assert(Math.abs(spread(after) - spread(before) / 2) < 1e-6, 'the lean halves the spread');
  for (let i = 0; i < mrdr.length; i++) {
    assert(Math.abs(after[i]) <= Math.abs(before[i]) + 1e-9, `${mrdr[i].id} leaned the wrong way`);
  }
  // And the catalogue itself is untouched — `auditionLevel` returns, it never writes.
  assert(mrdr.every((v) => v.level === VOICES[v.id].level));
}
ok('the MRDR-3 library halves its post-levelling crest spread without the catalogue moving');

const masterMeter = readFileSync(new URL('../tools/mrdr3-master-meter.js', import.meta.url), 'utf8');
const mrdrShell = readFileSync(new URL('../tools/mrdr3-shell.html', import.meta.url), 'utf8');
assert(/import \{ auditionLevel \}/.test(standalone)
  && /function withAuditionLevel/.test(standalone)
  && /withAuditionLevel\(sourceId, \(\) => voiceEditor\.open\(sourceId, \{ isNew: true \}\)\)/.test(standalone)
  && /try \{ return open\(\); \} finally \{ voice\.level = was; \}/.test(standalone),
  'the standalone leans the level around open, and always puts the catalogue value back');
assert(!/auditionLevel|mrdr3-level/.test(mixerEntry) && !/auditionLevel/.test(editor),
  'the audition lean stays out of the Song Mixer and the shared editor');

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
