import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VOICES } from '../src/data/voices.js';
import { offeredByEngine } from '../src/data/voices-in-play.js';
import { encodePatch, decodePatch } from '../tools/mrdr3-patch.js';

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
  && /onSectionChange: \(\) => \{[\s\S]*?applyPreviewEffects\(previewFxState\)/.test(standalone)
  && /onSectionChange: \(\) => \{[\s\S]*?Audio\.stopPreview\?\.\(\)/.test(
    readFileSync(new URL('../tools/mixer-entry.js', import.meta.url), 'utf8')),
  'filter/VCA section switches clear queued audition notes while preserving schedulers');
assert(/level: base\?\.level \?\? 1/.test(standalone) && /peak: base\?\.peak \?\? 1/.test(standalone));
assert(/normalizeSharedMeasurements/.test(standalone) && /measureRaw\(base\.id/.test(standalone)
  && /patchVoice\.level = base\.level/.test(standalone),
  'shared links remeasure edited patches against their base preset before audition');
assert(/\/MRDR3\//.test(mixerServer) && /buildMrdr3Page/.test(mixerServer));
ok('Advanced selector, keyboard source cleanup, MIDI protocol, and standalone link hooks exist');
