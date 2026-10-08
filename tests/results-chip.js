// 8-BIT RESULTS — the results screen's switch of the level's song onto the 8-Bit Sound Set
// (src/game/results-chip.js), the trims it was levelled with (tools/lib/chip-results-trims.js),
// and the 8-bit alternates the mixes live in (tools/lib/chip-results-mixes.js).
//
// Every cabinet song has something to switch, onto presets that exist; the robot voice and the
// risers stay as they are; the tune is the square and the bass stays bass; every song the game
// plays at a results screen has measured trims, inside the tool's clamp, and an 8-bit alternate
// whose export the game ships, in step with it; a mix patch lays back to the mix it came from;
// and with no audio running the results are shown at once rather than waiting on a beat.
import { CABINETS } from '../src/data/cabinets.js';
import { MIX } from '../src/data/mix.js';
import { trackIdOf } from '../src/data/tracks.js';
import { applyArrangement } from '../src/data/arrangements.js';
import { deskBank } from '../src/engine/lanes.js';
import { VOICES, voiceOf, registerSongVoice, engineBankKeys, VOICE_LANES } from '../src/data/voices.js';
import { BANGER_SOUNDS } from '../tools/lib/banger/sounds.js';
import { CHIP_SET } from '../src/game/banger/club-voices.js';
import { chipRole, chipVoices, chipResults, resultsOnTheBeat, mixPatch, patchMix } from '../src/game/results-chip.js';
import { CHIP_RESULT_TRIMS } from '../tools/lib/chip-results-trims.js';
import { CHIP_RESULT_MIXES } from '../src/game/results-chip-mixes.js';
import { exportChipMixes, chipAltId, chipParents } from '../tools/lib/chip-results-mixes.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; } else console.log('ok:', msg);
}

// The song as the game plays it — audio.js's withVoices, which it keeps to itself.
function played(cab) {
  const id = trackIdOf(cab.music);
  const entry = MIX[id] || null;
  const out = { ...deskBank(applyArrangement(cab.music, id), entry), ...(entry?.voice || {}) };
  for (const [vk, params] of Object.entries(entry?.voiceParams || {})) {
    const vid = registerSongVoice(vk, id, params);
    if (vid) out[vk] = vid;
  }
  for (const key of Object.keys(VOICE_LANES)) {
    const keys = engineBankKeys(voiceOf(out, key), key);
    if (keys) Object.assign(out, keys);
  }
  return { id, bank: out };
}

const set = Object.values(BANGER_SOUNDS[CHIP_SET].parts);
assert(chipRole('lead', VOICES.mrdrElectricGrand) === 'hook', 'the tune is the square, whatever plays it');
assert(chipRole('bass', { category: 'Lead' }) === 'bass' && chipRole('bass2', { category: 'Pad' }) === 'sub', 'the bass lanes stay bass');
assert(chipRole('lead4', { category: 'Orch' }) === 'pad' && chipRole('chords2', { category: 'Pluck' }) === 'bell', 'a layer goes by what its sound is');
assert(chipRole('lead5', { synth: 'JMJR-4', category: 'Pad' }) === null, 'the robot voice keeps its words');
assert(chipRole('crash2', { kind: 'drum', category: 'Sweep' }) === null && chipRole('tom', { kind: 'drum', category: 'FX' }) === null, 'risers and FX stay as they are');

for (const cab of CABINETS) {
  if (!cab.music) continue;
  const { id, bank } = played(cab);
  const swaps = chipVoices(bank);
  const bad = [...swaps].filter(([, v]) => !VOICES[v]);
  const vocal = [...swaps.keys()].filter((lane) => voiceOf(bank, lane)?.synth === 'JMJR-4');
  assert(swaps.size > 0 && !bad.length && !vocal.length, `${cab.id}: ${swaps.size} parts switch, onto real presets, no voice among them`);
  assert(swaps.get('lead') === BANGER_SOUNDS[CHIP_SET].parts.square || !swaps.has('lead'), `${cab.id}: its lead goes onto the square`);
  assert([...swaps.values()].every((v) => set.includes(v) || VOICES[v]?.kind === 'drum'), `${cab.id}: every tuned part is on the 8-Bit set`);
  const trims = CHIP_RESULT_TRIMS[id];
  assert(!!trims && Object.values(trims).every((db) => db >= -15 && db <= 12) && Object.keys(trims).every((lane) => swaps.has(lane)),
    `${cab.id}: measured trims, inside the clamp, only on lanes that switch`);
}

// ---- the alternates and the game's copy of them
// Keys sorted, and an empty block the same as none — the desk's file writer drops empty ones.
const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x)
  ? Object.fromEntries(Object.keys(x).sort().filter((key) => !(x[key] && typeof x[key] === 'object'
    && !Array.isArray(x[key]) && !Object.keys(x[key]).length)).map((key) => [key, x[key]])) : x));
for (const parentId of chipParents()) {
  const [parent, alt] = await Promise.all([
    import(`../src/data/songs/${parentId}.js`), import(`../src/data/imported/${chipAltId(parentId)}.js`).catch(() => null),
  ]);
  assert(alt?.alternateOf === parentId, `${parentId}: has its 8-bit alternate, ${chipAltId(parentId)}`);
  if (!alt) continue;
  const patch = CHIP_RESULT_MIXES[parentId];
  assert(!!patch && Object.values(patch.voice || {}).every((v) => v === null || VOICES[v]), `${parentId}: the game ships its 8-bit mix, onto presets that exist`);
  assert(canon(patchMix(parent.mix, mixPatch(parent.mix, alt.mix))) === canon(alt.mix), `${parentId}: the patch lays back to the alternate's mix exactly`);
}
const exported = await exportChipMixes(process.cwd(), { dry: true });
assert(!exported.changed, 'the game\'s copy matches the alternates (else: node tools/chip-results-alternates.js export)');

assert(chipResults.on === true, 'on unless the dev menu turned it off');
let shown = null;
resultsOnTheBeat((chip) => { shown = chip; }, { bar: true });
assert(shown && shown.phase === 'off', 'with no audio running the results come up at once');

if (failed) { console.error('\nresults-chip: FAILED'); process.exit(1); }
console.log('\nresults-chip: all passed');
