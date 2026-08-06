// The voice library: shape, then the only question that matters — does every preset
// actually make a sound when the engine is rendered offline, on every lane?
//
// That second half is not paranoia. Every WAV, stem and video is produced by
// rendering this engine under an OfflineAudioContext, and Tone has classes that work
// perfectly in a browser and render pure silence there: PluckSynth and PolySynth both
// do (see the sweep at the top of src/engine/voices.js). A preset that fails this way
// fails quietly — it sounds right while you choose it on the desk and is simply
// missing from everything you export.
//
// The render half is sampled rather than exhaustive: every preset is rendered once,
// and every LANE is covered, but not all 65 × 13 combinations. What that would catch
// beyond this is a lane-specific failure in a preset that works elsewhere, and the
// engine has no per-lane code left for one to hide in — `playVoice` is the same call
// for all thirteen.
import { openRenderer, SR } from '../tools/lib/render-bank-browser.js';
import { homeLane } from '../tools/lib/measure-voice.js';
import { SONG_STYLES } from '../tools/lib/song-styles.js';
import {
  VOICES, VOICE_LANES, VOICE_CATEGORIES, PERCUSSION_LANES,
  voicesFor, voicesByCategory, voiceOf, voiceGain, engineBankKeys, defaultVoiceOf,
  normalizeVoiceCategory, registerSongVoice, isKitVoice,
} from '../src/data/voices.js';
import { quotesInPlay, offeredVoices, offeredByCategory } from '../src/data/voices-in-play.js';
import { LANE_KEYS } from '../src/engine/lanes.js';
import { resolveTrack } from '../src/data/tracks.js';

let failed = 0;
const assert = (cond, msg) => {
  if (cond) { console.log(`ok: ${msg}`); } else { console.error(`FAIL: ${msg}`); failed++; }
};

// The allowlist lives in the engine module, which imports Tone and so cannot be
// loaded in Node. It is short and it is the thing the catalogue must agree with, so
// it is restated here — if they drift, the render half of this suite fails anyway.
// GameSynth and AdditiveSynth are not Tone classes: they are native Web Audio, dispatched
// by name in `play()` before the Tone allowlist is reached, and they read `$` keys off the
// entry rather than an `options` bag. They are in the same list because it is the same
// question — what may a preset's `synth` say.
const ALLOWED = ['GameSynth', 'AdditiveSynth', 'LayerSynth', 'Synth', 'MonoSynth', 'FMSynth', 'AMSynth', 'DuoSynth', 'MembraneSynth', 'MetalSynth'];
// The waveforms an OscillatorNode will take. `pwm` and `pulse` are Tone's and throw on a
// native oscillator — see NATIVE_WAVES in src/engine/voices.js.
const NATIVE_WAVES = ['sine', 'square', 'sawtooth', 'triangle'];
// A LAYER takes one more: `noise` is a waveform on that path, not a special case — the
// seeded buffer through a bandpass whose centre follows the note, so RATIO, DETUNE, the
// pitch envelope, glide and FM all still mean something. See `isNoise` in `_playLayer`.
// The panel offers it (LAYER_WAVES in tools/mixer-voice-editor.js); this list is why a
// preset using it can be saved.
const LAYER_WAVES = [...NATIVE_WAVES, 'noise'];
const DRAWBARS = 9;

const all = Object.values(VOICES);
const tone = all.filter((v) => v.kind === 'tone');
const engine = all.filter((v) => v.kind === 'engine');
const noise = all.filter((v) => v.kind === 'noise');
const drum = all.filter((v) => v.kind === 'drum');
const KIT = ['Kick', 'Snare', 'Hats', 'Clap', 'Tom', 'Crash', 'Perc'];
const OLD_CATEGORIES = [
  'Basses', 'Leads', 'Pads', 'Organs', 'Bells & Mallets', 'Plucks',
  'Brass & Strings', 'Rough & Electric', 'Kicks', 'Snares', 'Claps',
  'Percussion', 'Audition',
];

// ---- shape -----------------------------------------------------------------
assert(tone.length > 0 && engine.length > 0 && noise.length > 0 && drum.length > 0,
  `the library holds all four kinds (${engine.length} engine, ${tone.length} tone,`
  + ` ${noise.length} noise, ${drum.length} drum)`);
// The snares, claps and hats. Their absence was the library's biggest hole: the
// engine has exactly one of each with no parameters, so they cannot come from
// harvesting — only from a preset built on the seeded noise buffer.
for (const c of KIT) {
  assert(all.filter((v) => v.category === c).length >= 3,
    `${c}: has enough entries to be its own column`
    + ` (${all.filter((v) => v.category === c).length})`);
}
// Snares, claps and hats were the library's biggest hole: the engine has exactly one
// of each with no parameters, so they cannot come from harvesting — only from a
// preset built on the seeded noise buffer.
for (const c of ['Snare', 'Clap', 'Hats']) {
  assert(noise.some((v) => v.category === c), `${c}: is covered by noise presets`);
}
assert(!all.some((v) => OLD_CATEGORIES.includes(v.category)),
  'no loaded preset remains in an old or internal category');
// A drum lane opens on its own kind. The category order is lane-aware rather than
// alphabetical.
for (const [lane, want] of [['kick', 'Kick'], ['snare', 'Snare'], ['clap', 'Clap'],
  ['hats', 'Hats'], ['crash', 'Crash'], ['tom', 'Tom']]) {
  assert(voicesByCategory(lane)[0]?.[0] === want,
    `${lane}: opens on ${want}, not on whatever is first alphabetically`);
}

assert(normalizeVoiceCategory({ id: 'tom', category: 'Percussion' }) === 'Tom',
  'old tom metadata normalizes to Tom');
assert(normalizeVoiceCategory({ id: 'ds808Cowbell', category: 'Audition', homeLane: 'tom', label: 'Cowbell' }) === 'Perc',
  'cowbell audition metadata normalizes to Perc');
assert(normalizeVoiceCategory({ id: 'breathPad', category: 'Pads' }) === 'Orch',
  'vocal-like pad metadata normalizes to Orch');
for (const [old, next] of Object.entries({
  Basses: 'Bass', Leads: 'Lead', Pads: 'Pad', Keys: 'Keys', Plucks: 'Pluck',
  Organs: 'Organ', 'Bells & Mallets': 'Bells', 'Brass & Strings': 'Orch',
  'Rough & Electric': 'FX', Kicks: 'Kick', Snares: 'Snare', Hats: 'Hats',
  Claps: 'Clap', Percussion: 'Perc',
})) {
  assert(normalizeVoiceCategory({ category: old }) === next,
    `${old} song metadata normalizes to ${next}`);
}
assert(normalizeVoiceCategory({ id: 'dsZap', category: 'Audition', homeLane: 'crash' }) === 'FX',
  'old crash-lane zap metadata remains FX');

const legacySongVoice = registerSongVoice('legacy-tom', 'category-migration', {
  id: 'tom', kind: 'tone', category: 'Percussion', homeLane: 'tom',
  synth: 'MonoSynth', dur: 1, level: 1, peak: 1, options: {},
});
assert(VOICES[legacySongVoice]?.category === 'Tom',
  'song-local old tom copies load with the Tom category');
delete VOICES[legacySongVoice];
assert(!isKitVoice(VOICES.dsZap) && homeLane(VOICES.dsZap) === 'bass',
  'FX zap remains non-drum outside its special crash audition render');
for (const [id, lane] of [['tom', 'tom'], ['crashEngine', 'crash'], ['ds808Cowbell', 'tom']]) {
  assert(homeLane(VOICES[id]) === lane, `${id}: measures on its correct home lane`);
}

for (const v of all) {
  assert(typeof v.label === 'string' && v.label.length > 0, `${v.id}: has a label for the desk`);
  assert(VOICE_CATEGORIES.includes(v.category), `${v.id}: is in a real category (${v.category})`);
  assert(typeof v.note === 'string' && v.note.length > 10,
    `${v.id}: says what it is for, which is how anyone chooses between 65 of them`);
  // Lane-agnostic is the rule; a `lanes` list is the exception and has to be real.
  assert(!v.lanes || (Array.isArray(v.lanes) && v.lanes.length
    && v.lanes.every((k) => LANE_KEYS.includes(k) && VOICE_LANES[k])),
  `${v.id}: any lane restriction names real voiceable lanes`);
}

for (const v of tone) {
  assert(ALLOWED.includes(v.synth), `${v.id}: ${v.synth} is on the offline-verified allowlist`);
  assert(v.dur > 0 && v.dur <= 16, `${v.id}: dur ${v.dur} is a plausible number of 16th steps`);
  // The measured level. A preset left at the placeholder has never been through
  // tools/measure-voices.js, and will arrive at the wrong level on every lane — see
  // the note over `voiceGain` for why this is energy and not the peak beside it.
  assert(v.level > 0, `${v.id}: carries a measured level (${v.level}), not the placeholder`);
  assert(v.peak > 0 && v.peak !== 1,
    `${v.id}: carries a measured peak (${v.peak}), not the placeholder`);
  assert(v.synth === 'GameSynth' || v.synth === 'AdditiveSynth' || v.synth === 'LayerSynth'
    || (v.options && typeof v.options === 'object'),
    `${v.id}: has constructor options or native synth parameters`);
}

// The layer stack. As with the additive block above, every failure here is SILENCE
// rather than a wrong sound: a preset with no layers, or every layer at gain 0, builds
// nothing and `_playLayer` returns false without a word.
for (const v of tone.filter((x) => x.synth === 'LayerSynth')) {
  const L = v.layer;
  assert(L && typeof L === 'object', `${v.id}: has a layer stack to build`);
  const oscs = [L?.osc1, L?.osc2, L?.osc3].filter(Boolean);
  assert(oscs.length > 0, `${v.id}: has at least one layer`);
  assert(oscs.some((o) => (o.gain ?? 1) > 0), `${v.id}: at least one layer is audible`);
  for (const o of oscs) {
    assert(!o.type || LAYER_WAVES.includes(o.type),
      `${v.id}: names a waveform a layer takes (${o.type})`);
    assert((o.ratio ?? 1) > 0, `${v.id}: every layer ratio is above zero`);
    assert((o.len ?? 1) > 0, `${v.id}: every layer length multiplier is above zero`);
    assert((o.unison ?? 1) >= 1 && (o.unison ?? 1) <= 5,
      `${v.id}: unison stays within the engine's cap`);
    if (o.pitch) {
      assert((o.pitch.from ?? 1) > 0 && (o.pitch.to ?? 1) > 0,
        `${v.id}: bends between two real pitches — an exponential ramp cannot reach zero`);
    }
    if (o.filter) assert((o.filter.freq ?? 0) > 0, `${v.id}: a filter has a cutoff`);
    if (o.fm) assert((o.fm.ratio ?? 1.4) > 0, `${v.id}: an FM ratio is above zero`);
  }
  if (L?.lfo) {
    assert(['filter', 'level'].includes(L.lfo.target ?? 'filter'),
      `${v.id}: the LFO points at filter or level — pitch wobble is the vibrato key`);
  }
}

// The additive stack. Every one of these failures is silence rather than a wrong sound,
// which is why they are asserted rather than left to the render half to notice: a stack
// with no bars pulled out builds no oscillators at all, and `_playAdditive` returns false
// without a word.
for (const v of tone.filter((x) => x.synth === 'AdditiveSynth')) {
  const a = v.additive;
  assert(a && typeof a === 'object', `${v.id}: has an additive stack to build`);
  assert(Array.isArray(a.bars) && a.bars.length === DRAWBARS,
    `${v.id}: states all ${DRAWBARS} drawbars (has ${a.bars?.length})`);
  assert(a.bars.every((b) => typeof b === 'number' && b >= 0),
    `${v.id}: every drawbar is a level, not a ratio or a gap`);
  assert(a.bars.some((b) => b > 0), `${v.id}: pulls at least one drawbar out — otherwise silent`);
  // An override has to line up with the bars it is levelling, or the tail of the longer
  // array is read against `undefined` and those partials silently never sound.
  assert(!a.ratios || (Array.isArray(a.ratios) && a.ratios.length === a.bars.length),
    `${v.id}: a ratio override is as long as its bars`);
  assert(!a.ratios || a.ratios.every((r) => r > 0), `${v.id}: every ratio is above zero`);
  assert(!a.type || NATIVE_WAVES.includes(a.type),
    `${v.id}: names a waveform an OscillatorNode takes (${a.type})`);
  // Zero is legal on both — it means "across the note" — but a negative one would ramp
  // backwards, and Web Audio takes that as an event before the one it follows.
  assert((a.decay ?? 0) >= 0 && (a.attack ?? 0) >= 0 && (a.release ?? 0) >= 0,
    `${v.id}: has no negative envelope stage`);
  if (a.pitch) {
    assert(a.pitch.from > 0 && a.pitch.to > 0,
      `${v.id}: bends between two real pitches — an exponential ramp cannot reach zero`);
  }
  if (a.perc) assert(a.perc.ratio > 0, `${v.id}: strikes a partial above the fundamental`);
}

for (const v of noise) {
  assert(v.noise && typeof v.noise === 'object', `${v.id}: has a noise burst to build`);
  assert(v.noise.decay > 0 && v.noise.decay < 3, `${v.id}: decays in a plausible time`);
  assert(v.level > 0, `${v.id}: carries a measured level (${v.level}), not the placeholder`);
  assert(v.peak > 0 && v.peak !== 1,
    `${v.id}: carries a measured peak (${v.peak}), not the placeholder`);
  assert(!v.synth, `${v.id}: is native nodes on the engine's seeded buffer, not a Tone class`);
  if (v.taps) {
    assert(Array.isArray(v.taps) && v.taps.length > 1 && v.taps[0] === 0,
      `${v.id}: taps start at the hit and repeat after it`);
  }
}

// The drum synth: four optional sources, so the shape rule is "at least one".
for (const v of drum) {
  assert(v.osc || v.noise || v.ring || v.metal || v.knock > 0,
    `${v.id}: a drum preset has at least one source`);
  assert(v.knock === undefined || (v.knock >= 0 && v.knock <= 2),
    `${v.id}: the knock is a level, on the knob's range`);
  for (const [name, sec] of [['osc', v.osc], ['noise', v.noise], ['ring', v.ring], ['metal', v.metal]]) {
    if (!sec || sec.sag === undefined) continue;
    // A sag of 1 is no sag and a sag of 0 is silence at the knee — both are ways of
    // writing "one plain decay" that read as a two-stage one.
    assert(sec.sag > 0 && sec.sag < 1, `${v.id}: ${name}'s sag falls to a real fraction`);
    assert((sec.sagAt ?? 0.02) > 0 && (sec.sagAt ?? 0.02) < (sec.decay ?? 0.5),
      `${v.id}: ${name} sags before its own decay ends`);
  }
  assert(!v.synth, `${v.id}: is native nodes, not a Tone class`);
  assert(v.level > 0, `${v.id}: carries a measured level (${v.level}), not the placeholder`);
  assert(v.peak > 0 && v.peak !== 1,
    `${v.id}: carries a measured peak (${v.peak}), not the placeholder`);
  if (v.osc) {
    assert(v.osc.from > 0 && v.osc.to > 0,
      `${v.id}: pitch sweeps between real frequencies (${v.osc.from} → ${v.osc.to})`);
    assert((v.osc.decay ?? 0.35) > 0 && (v.osc.decay ?? 0.35) < 3,
      `${v.id}: osc decays in a plausible time`);
  }
  if (v.noise) {
    assert((v.noise.decay ?? 0.12) > 0 && (v.noise.decay ?? 0.12) < 3,
      `${v.id}: noise decays in a plausible time`);
  }
  if (v.ring) {
    assert(v.ring.freq > 0, `${v.id}: the resonator has a pitch to ring at`);
    // Below about ten a bandpass colours rather than rings, and a resonator that does
    // not ring is a noise section with extra steps.
    assert((v.ring.Q ?? 40) >= 5, `${v.id}: the resonator is narrow enough to ring`);
    assert((v.ring.hit ?? 0.002) > 0 && (v.ring.hit ?? 0.002) <= 0.08,
      `${v.id}: the strike is a strike, not a burst`);
  }
  if (v.metal) {
    assert(v.metal.freq > 0, `${v.id}: the cluster is built from a real frequency`);
    assert(!v.metal.ratios || (Array.isArray(v.metal.ratios) && v.metal.ratios.every((r) => r > 0)),
      `${v.id}: its partials are real ratios`);
  }
  assert(v.drive === undefined || (v.drive >= 0 && v.drive <= 1),
    `${v.id}: drive stays on the knob's 0–1 range`);
  assert(!v.shape || ['tanh', 'fold', 'crush'].includes(v.shape),
    `${v.id}: names a shaper the engine builds`);
  assert(!v.noise?.color || ['white', 'pink', 'brown', 'blue', 'violet'].includes(v.noise.color),
    `${v.id}: names a noise colour the engine mixes`);
  if (v.taps) {
    assert(Array.isArray(v.taps) && v.taps.length > 1 && v.taps[0] === 0,
      `${v.id}: taps start at the hit and repeat after it`);
  }
}
// The Microtonic argument in one assertion: a preset with both sources exists, and
// so do the two degenerate cases — because "either half can be switched off" is a
// claim about the catalogue, not just about the editor.
assert(drum.some((v) => v.osc && v.noise) && drum.some((v) => v.osc && !v.noise)
  && drum.some((v) => !v.osc && v.noise),
'the drum table exercises both sources together and each on its own');

// The VL-1 trio is deliberately plain: these are the hardware's three little rhythm
// syllables, not modern kit variations. Keep the recipes pinned here so a later editor
// change cannot quietly turn Pi/Po into a generic rim or Sha into an unfiltered hat.
const vl1Pi = VOICES.vl1Pi;
const vl1Po = VOICES.vl1Po;
const vl1Sha = VOICES.vl1Sha;
assert(vl1Pi?.category === 'Perc' && vl1Po?.category === 'Perc' && vl1Sha?.category === 'Perc',
  'VL-1 Pi, Po and Sha are grouped as percussion');
assert(vl1Pi?.osc?.type === 'square' && vl1Pi.osc.from === 1000 && vl1Pi.osc.to === 1000
  && vl1Pi.osc.decay === 0.02 && vl1Pi.tone?.type === 'highpass'
  && vl1Pi.tone.freq === 800,
  'VL-1 Pi is the higher, twenty-millisecond filtered square tick');
assert(vl1Po?.osc?.type === 'square' && vl1Po.osc.from === 500 && vl1Po.osc.to === 500
  && vl1Po.osc.decay === 0.03 && vl1Po.tone?.type === 'lowpass'
  && vl1Po.tone.freq === 2500,
  'VL-1 Po is the lower, thirty-millisecond low-passed square pop');
assert(!vl1Sha?.osc && vl1Sha?.noise?.type === 'highpass' && vl1Sha.noise.freq === 3000
  && vl1Sha.noise.decay === 0.16,
  'VL-1 Sha is a filtered white-noise burst with a 160-millisecond decay');

for (const v of engine) {
  // ...or a name for a body with no keys to set at all. The snare, clap, hats and rim
  // read nothing but their gain trims, so naming what they play and offering a choice
  // are different acts — `nameOnly` is the one without the other, and it must be the
  // only way an engine preset expands to nothing.
  assert(v.bank || v.osc || v.nameOnly,
    `${v.id}: an engine preset is bank keys, a waveform, or a name for neither`);
  assert(!v.nameOnly || !v.bank,
    `${v.id}: a name-only preset has nothing to merge — bank keys would make it a choice`);
  assert(v.level === undefined && v.peak === undefined,
    `${v.id}: an engine preset needs no measurement — it plays at the lane's own gain`);
}
// A preset nobody can pick is a label, and a label has to be reachable some other way:
// the picker's `Engine default` row reads defaultVoiceOf, which is what shows it.
for (const v of engine.filter((x) => x.nameOnly)) {
  assert(!voicesFor(v.lanes[0]).includes(v),
    `${v.id}: is not offered in the picker — choosing it would change no sound`);
}

// ---- the frozen starter set -------------------------------------------------
//
// What the New Song generator is written for. The claim is not that these sound good,
// it is that they cannot CHANGE: a pack naming an editable preset is a starter that an
// edit three tabs away can break, for every song generated after it.
const starters = Object.values(VOICES).filter((v) => v.starter);
assert(starters.length > 20, `the starter set is populated (${starters.length} presets)`);
for (const v of starters) {
  assert(['tone', 'noise', 'drum'].includes(v.kind),
    `${v.id}: states its own kind — STARTER holds all three, so the table cannot say`);
  assert(Object.keys(VOICE_LANES).every((lane) => !voicesFor(lane).some((x) => x.id === v.id)),
    `${v.id}: is not offered in any picker — it would be a second row for one sound`);
}
// The packs name these and nothing else. A pack that slipped back to a library id is
// the failure this whole table exists to prevent, and it is invisible by ear.
for (const style of SONG_STYLES) {
  for (const [key, id] of Object.entries(style.bank)) {
    if (!key.endsWith('Voice')) continue;
    assert(VOICES[id]?.starter,
      `${style.id}/${key}: names a frozen starter (${id}), not an editable library preset`);
  }
}

// ---- the seam --------------------------------------------------------------
for (const [lane, seam] of Object.entries(VOICE_LANES)) {
  assert(LANE_KEYS.includes(lane), `${lane}: is a real lane`);
  assert(seam.voiceKey === `${lane}Voice`,
    `${lane}: opts in through ${lane}Voice, the name the desk and mix files write`);
  assert(voicesFor(lane).length > 10,
    `${lane}: offers the library, not a lane-specific handful (${voicesFor(lane).length})`);
  assert(voiceGain({ level: 0.02, peak: 0.5 }, lane) > 0,
    `${lane}: has a measured target to scale presets to`);
  // The fallback, which is the only thing standing between a song copy saved before
  // levels existed and a lane 30 dB out. It has to answer, and it has to answer
  // differently from the level path, or it is not the old behaviour at all.
  assert(voiceGain({ peak: 0.5 }, lane) > 0,
    `${lane}: still levels a preset that carries only a peak`);
}

// Percussion holds booleans, so a preset needs a pitch to be struck at.
for (const lane of PERCUSSION_LANES) {
  assert(VOICE_LANES[lane]?.note > 0, `${lane}: has a note for a synth to be struck at`);
}

// The whole point of the rewrite: a bass preset is available on the lead lane.
assert(voicesFor('lead').some((v) => v.id === 'roundMono'),
  'a bass preset is offered on the lead lane — categories describe, they do not restrict');
assert(voicesFor('bass').some((v) => KIT.includes(v.category)),
  'a drum preset is offered on the bass lane');
// ...and the exceptions are real ones.
assert(!voicesFor('lead').some((v) => v.id === 'engFilteredSaw'),
  'a bass-only engine path is not offered on the lead, where it would do nothing');

assert(voicesByCategory('lead').length > 5, 'the picker gets several populated columns');
assert(voicesByCategory('lead').every(([, list]) => list.length),
  'no empty column reaches the picker');

// ---- quotations have to still be quoting something -------------------------
//
// An engine preset mined from one song is worth a row while that song still makes the
// sound, and is a name for nothing afterwards. The library keeps every one of them —
// a mix that named one goes on playing it, and the strip of the audition it came from
// goes on naming it — but the selector only offers the ones a cabinet or a game theme
// plays. The engine's own constructions are never touched by this: they are what the
// engine can be asked to do, whether or not a song happens to be sitting on one.
const quotations = engine.filter((v) => v.quoted);
const played = quotesInPlay();
const dropped = quotations.filter((v) => !played.has(v.id));
assert(quotations.length > 20 && played.size >= 15,
  `most of the library's quotations are still in the game (${played.size} of ${quotations.length})`);
assert(dropped.length,
  `and some are not, or this rule would be untested (${dropped.length} dropped)`);
for (const v of dropped) {
  const lane = v.lanes ? v.lanes[0] : 'lead';
  assert(!offeredVoices(lane).some((x) => x.id === v.id)
    && !offeredByCategory(lane).some(([, l]) => l.some((x) => x.id === v.id)),
  `${v.id}: nothing in the game plays it, so the selector does not offer it`);
  assert(VOICES[v.id] && voicesFor(lane).some((x) => x.id === v.id),
    `${v.id}: is still in the library, so a mix that chose it still resolves`);
  assert(offeredVoices(lane, { keep: v.id }).some((x) => x.id === v.id),
    `${v.id}: comes back the moment it is what the lane is playing`);
}
for (const v of engine.filter((x) => !x.quoted && !x.nameOnly)) {
  const lane = v.lanes ? v.lanes[0] : (v.osc ? 'lead' : 'bass');
  assert(offeredVoices(lane).some((x) => x.id === v.id),
    `${v.id}: is the engine's own, so it is offered whether a song sits on it or not`);
}
// The parked shop auditions are openable on the desk and are not the game. These
// three are played there and nowhere else, so the counter sounds are the proof that
// "in the game" means a cabinet or a theme rather than "in the registry".
assert(['engLayawayOrgan', 'engCounterLead', 'engCounterKick']
  .every((id) => dropped.some((v) => v.id === id)),
'a sound surviving only in a parked audition does not hold a row in the selector');

// ---- lookup and engine expansion -------------------------------------------
assert(voiceOf({ bassVoice: 'roundMono' }, 'bass')?.id === 'roundMono', 'voiceOf finds a real preset');
assert(voiceOf({ bassVoice: 'deleted-in-2027' }, 'bass') === null, 'voiceOf ignores an unknown id');
assert(voiceOf({ leadVoice: 'engFilteredSaw' }, 'lead') === null,
  'voiceOf ignores a preset named on a lane it does not apply to');
assert(voiceOf({}, 'bass') === null && voiceOf(null, 'bass') === null,
  'voiceOf handles a bank with no voice');

// An engine preset IS its bank keys — that is the whole mechanism, and it is what
// lets a hand-written voice be a preset with no engine code behind it.
assert(engineBankKeys(VOICES.engFilteredSaw, 'bass')?.bassFilteredSaw === true,
  'an engine preset expands to the bank keys the hand-written voice already reads');
assert(engineBankKeys(VOICES.engSaw, 'lead')?.leadType === 'sawtooth'
  && engineBankKeys(VOICES.engSaw, 'chords')?.chordType === 'sawtooth',
'a waveform preset writes each lane’s OWN type key, which is what makes it lane-agnostic');
assert(engineBankKeys(VOICES.roundMono, 'bass') === null,
  'a tone preset expands to nothing — it is played, not merged');

// ---- naming what a lane already plays ---------------------------------------
// The read behind the strip's label. It must never claim a name it cannot back up:
// a wrong name is worse than ENGINE, which is at least true of every bank ever
// written. See defaultVoiceOf.
assert(defaultVoiceOf(resolveTrack('shop').bank, 'bass')?.id === 'engShopBass',
  'a song whose bank matches a preset exactly is named by it');
assert(defaultVoiceOf(resolveTrack('title').bank, 'lead')?.id === 'engTitleLead',
  'and so is the one the preset was mined from');

// A bank with no timbre keys is not nameless — the engine reads `b.leadType ||
// 'square'`, which is what every imported .mid plays on every lane.
assert(defaultVoiceOf({ lead: [] }, 'lead')?.id === 'engSquare',
  'a bank that says nothing about a lane is the arcade square, and says so');
assert(defaultVoiceOf({ leadType: 'triangle' }, 'leadHarm')?.id === 'engTriangle',
  'the harmony follows the lead’s waveform when it has none of its own, as the engine does');

// One number past a preset is not that preset.
assert(defaultVoiceOf({ ...resolveTrack('shop').bank, bassFilterOpen: 1101 }, 'bass') === null,
  'one key off a preset is not named by it');

// ---- the arcade kit ----------------------------------------------------------
// A drum lane is the case the melodic rules did not cover: a bare `kick: [...]` is
// the whole of what most banks say, and every named kick preset was a song's tuning
// of it. Nothing to match meant `ENGINE` on a strip whose sound the engine has always
// spelled out in one place.
const beat = { bpm: 120, kick: [true], snare: [true], clap: [true], hats: [true], ohats: [true], rim: [true], tom: [true], crash: [true] };
for (const [lane, id] of Object.entries({
  kick: 'engKick', snare: 'engSnare', clap: 'engClap', hats: 'engHat',
  ohats: 'engOpenHat', rim: 'engRim', tom: 'engTom', crash: 'engCrash',
})) {
  assert(defaultVoiceOf(beat, lane)?.id === id,
    `${lane}: an untuned drum lane is named after the engine's own kit voice`);
}

// The knobbed half of the kit, both ways round: absent and spelled-out are one sound,
// so they are one name — and a song's own tuning still beats the default it departs
// from, which is the whole reason the kick presets exist.
assert(defaultVoiceOf({ ...beat, kickTail: 0.2, kickKnock: 1 }, 'kick')?.id === 'engKick',
  'a bank spelling out the engine’s own defaults is named by them, not left as ENGINE');
assert(defaultVoiceOf({ ...beat, kickTail: 0.15, kickKnock: 0.5 }, 'kick')?.id === 'engShopKick',
  'and a bank that tuned the kick is still named after the tuning');
assert(defaultVoiceOf({ ...beat, kickTail: 0.17 }, 'kick') === null,
  'a kick tuned past every preset is unnamed rather than called the arcade one');

// The other half sets nothing because there is nothing to set — which is exactly why
// it can be claimed for every bank ever written.
assert(defaultVoiceOf({ ...beat, drumGain: 0.4, snareDur: 2 }, 'snare')?.id === 'engSnare',
  'a trim is not a voice: the snare is the same body however loud the kit is set');

// ---- sections, and which of them get a vote ---------------------------------
// The hub changes its bass waveform between sections that both have notes in them:
// square in some, saw in others. There is no one voice to name, and the bank on its
// own would say square — which is half the song.
assert(defaultVoiceOf(resolveTrack('hub').bank, 'bass') === null,
  'a lane its sections keep changing is left unnamed rather than named after the bank');

// But a section the lane is SILENT in does not get a vote, because it is not a sound
// anyone can disagree with. The megamix holds an empty lead in six of its sections and
// plays the same triangle in the other twenty-six; reading the arcade square off the
// six is how a song with one lead in it came to say ENGINE.
assert(defaultVoiceOf(resolveTrack('megamix').bank, 'lead')?.id === 'engMegamixLead',
  'a lane silent in some sections is named after the ones you can hear');
assert(defaultVoiceOf(resolveTrack('finale').bank, 'lead')?.id === 'engFinaleLead',
  'and the finale’s lead, which only three of its sections play, is named too');
// The degenerate case of the same rule: ONE audible section, which is therefore the
// whole of what the lane is. It must be matched against that section rather than
// against the bank the section overrides.
assert(defaultVoiceOf(resolveTrack('finale').bank, 'crash')?.id === 'engFinaleCrash',
  'a crash that sounds once in the song is named after the section that sounds it');

assert(defaultVoiceOf(resolveTrack('shop').bank, 'bass2') === null,
  'a layer has no engine voice to name — it plays nothing until it is given a preset');
assert(defaultVoiceOf(null, 'bass') === null && defaultVoiceOf({}, 'keyGliss') === null,
  'no bank, or a lane with no seam at all, is not an error');

// It is a READ. The desk calls it on every repaint, on the game's own bank objects.
const untouched = resolveTrack('shop').bank;
const before = JSON.stringify(Object.keys(untouched));
defaultVoiceOf(untouched, 'bass');
assert(JSON.stringify(Object.keys(untouched)) === before,
  'naming a lane changes nothing about the bank it read');

// ---- does it sound? --------------------------------------------------------
const A2 = 110;
const CHORD_LANES = ['chords', 'organChords'];
const oneNote = (lane) => {
  const v = PERCUSSION_LANES.includes(lane) ? true : CHORD_LANES.includes(lane) ? [A2] : A2;
  const rest = PERCUSSION_LANES.includes(lane) ? false : null;
  return { bpm: 120, [lane]: Array.from({ length: 32 }, (_, i) => (i % 8 === 0 ? v : rest)) };
};

// Spread the presets over the lanes so every preset renders once and every lane is
// exercised, rather than 845 renders to prove the same call site works.
const LANES = Object.keys(VOICE_LANES);
const renderer = await openRenderer();
try {
  const refs = {};
  for (const lane of LANES) {
    const { peak } = await renderer.render(oneNote(lane), { repeat: 1, mix: null, trackId: null });
    refs[lane] = peak;
    assert(peak > 0.001, `${lane}: its own voice sounds, at peak ${peak.toFixed(4)}`);
  }

  let i = 0;
  for (const v of all) {
    // Round-robin over the lanes this preset is allowed on.
    const usable = LANES.filter((l) => voicesFor(l).some((x) => x.id === v.id));
    // A name-only preset is offered nowhere, and there is nothing here to prove about
    // it: it expands to no bank keys, so what it renders as IS the lane's own voice,
    // which the reference pass above already rendered.
    //
    // A STARTER is offered nowhere either, and there is everything to prove about it:
    // it is what every generated song plays, so it is reachable through the packs
    // rather than through the picker, and a silent one would be a whole lane of every
    // new song in a style. It renders here on its own home lane.
    //
    // Anything else falling out of every picker is a preset nobody can reach at all,
    // and that is a failure.
    if (!usable.length) {
      assert(v.nameOnly || v.starter,
        `${v.id}: is offered on some lane — a preset no picker lists is unreachable`);
      if (!v.starter) continue;
    }
    const lane = usable.length ? usable[i++ % usable.length] : homeLane(v);
    const bank = { ...oneNote(lane), [VOICE_LANES[lane].voiceKey]: v.id };
    const { peak } = await renderer.render(bank, { repeat: 1, mix: null, trackId: null });
    // What the catalogue SAYS this preset peaks at on this lane: its measured peak,
    // scaled by the gain the engine will play it at. Compared against that rather than
    // against a fraction of the lane's own peak, because the two are different
    // quantities and the difference bites on quiet lanes.
    //
    // `voiceGain` matches a preset to the lane's ENERGY, so a low-crest synth — an
    // AMSynth is peak/level ≈ 5 where the hand-written voices are ≈ 20 — lands well
    // under the lane's peak while being at exactly the right level. On a loud lane the
    // old margin absorbed that; on `electroFx`, whose own voice is the quietest in the
    // game (gain 0.012 against the lead's 0.06), it did not: `tpHarmonics` renders at
    // 0.0018 against a threshold of 0.0019 and is neither silent nor wrong.
    //
    // Prediction is lane-independent and catches more: silence still fails, and so now
    // does a preset arriving at the wrong level, which the old rule could not see.
    const predicted = v.level > 0 && v.peak > 0 ? v.peak * voiceGain(v, lane) : 0;
    assert(predicted > 0 ? peak > predicted * 0.35 : peak > refs[lane] / 20,
      `${v.id} on ${lane}: renders offline at peak ${peak.toFixed(4)}`
      + (predicted > 0 ? ` (measurement predicts ${predicted.toFixed(4)})`
        : ` (the lane's own is ${refs[lane].toFixed(4)})`));
  }

  // A preset REPLACES the lane rather than layering over it, and the seam is inert
  // when nothing names one. The null test proves the second for whole songs against a
  // recorded baseline; this proves it for the exact bank shape used above, so a
  // failure here points straight at playVoice rather than at the engine.
  const plain = await renderer.render(oneNote('bass'), { repeat: 1, mix: null, trackId: null });
  const again = await renderer.render(oneNote('bass'), { repeat: 1, mix: null, trackId: null });
  let maxDiff = 0;
  for (let n = 0; n < plain.outL.length; n++) {
    maxDiff = Math.max(maxDiff, Math.abs(plain.outL[n] - again.outL[n]));
  }
  assert(maxDiff < 5e-6,
    `a bank naming no preset renders deterministically (max diff ${maxDiff.toExponential(2)})`);

  // The drum synth's reason for building on the seeded buffer rather than Tone.Noise:
  // two renders of the same drum-voice bank are the same samples, which is what lets
  // stems sum back to the mix. dsSnare exercises every path at once — oscillator,
  // noise and the drive between them.
  const drumBank = { ...oneNote('snare'), snareVoice: 'dsSnare' };
  const d1 = await renderer.render(drumBank, { repeat: 1, mix: null, trackId: null });
  const d2 = await renderer.render(drumBank, { repeat: 1, mix: null, trackId: null });
  let drumDiff = 0;
  for (let n = 0; n < d1.outL.length; n++) {
    drumDiff = Math.max(drumDiff, Math.abs(d1.outL[n] - d2.outL[n]));
  }
  assert(drumDiff < 5e-6,
    `a drum-synth voice renders deterministically (max diff ${drumDiff.toExponential(2)})`);

  // ---- humanise is variation, and it is still deterministic -----------------
  //
  // Both halves have to be true at once, and each on its own would be easy: a preset
  // that varies per hit but not per render is what a player sounds like; one that
  // varies per render breaks stems summing back to the mix; one that varies neither
  // is the machine gun this was added to fix. `hitRandom` derives the variation from
  // the hit's scheduled TIME rather than from a counter, which is what buys both.
  const fourHits = (lane, voice) => ({
    bpm: 120,
    [lane]: Array.from({ length: 32 }, (_, i) => i % 8 === 0),
    [VOICE_LANES[lane].voiceKey]: voice,
  });
  // The PEAK of each hit rather than its energy: a window that starts a sample either
  // side of the transient moves an RMS by a tenth of a decibel, and the whole question
  // here is a difference of that order. Four hits, because two draws of a ±12% jitter
  // land close together often enough that a pair proves nothing either way.
  const spreadOf = (out) => {
    const step = Math.round(SR * (60 / 120) / 4);   // a 16th, from the tempo
    const peaks = [0, 8, 16, 24].map((s) => {
      let p = 0;
      for (let i = s * step; i < s * step + 4400 && i < out.length; i++) p = Math.max(p, Math.abs(out[i]));
      return p;
    });
    return 20 * Math.log10(Math.max(...peaks) / (Math.min(...peaks) || 1));
  };
  const h1 = await renderer.render(fourHits('snare', 'snarePink'), { repeat: 1, mix: null, trackId: null });
  const h2 = await renderer.render(fourHits('snare', 'snarePink'), { repeat: 1, mix: null, trackId: null });
  let humDiff = 0;
  for (let n = 0; n < h1.outL.length; n++) {
    humDiff = Math.max(humDiff, Math.abs(h1.outL[n] - h2.outL[n]));
  }
  assert(humDiff < 5e-6,
    `a humanised preset renders identically twice (max diff ${humDiff.toExponential(2)})`);
  const varied = spreadOf(h1.outL);
  const flat = spreadOf((await renderer.render(fourHits('snare', 'dsSnare'),
    { repeat: 1, mix: null, trackId: null })).outL);
  // The floor is the render's own transient jitter, measured at 0.08 dB on a preset
  // with no variation at all — so the claim is that humanise is several times that.
  assert(varied > 0.25 && varied > flat * 3,
    `and its four hits are four different hits (${varied.toFixed(2)} dB apart)`);
  assert(flat < 0.15,
    `while a preset without it plays the same hit every time (${flat.toFixed(2)} dB apart)`);

  // ---- layers --------------------------------------------------------------
  // A track duplicated on the desk. tests/layers.js proves the bank comes out with
  // the right lanes on it; only a render proves the sequencer PLAYS them — the loop
  // that does it is eight lines at the end of scheduleStep, and it is reached through
  // the mix, so nothing else in the suite would notice if it stopped being reached.
  const rms = (o) => {
    let sum = 0;
    for (const v of o.outL) sum += v * v;
    return Math.sqrt(sum / o.outL.length);
  };
  const bass = oneNote('bass');
  const layer = [{ key: 'bass2', from: 'bass' }];
  const bare = rms(await renderer.render(bass, { repeat: 1, mix: null, trackId: null }));
  const silent = rms(await renderer.render(bass,
    { repeat: 1, mix: { layers: layer }, trackId: null }));
  const sounding = rms(await renderer.render(bass,
    { repeat: 1, mix: { layers: layer, voice: { bass2Voice: 'roundMono' } }, trackId: null }));
  const muted = rms(await renderer.render(bass,
    { repeat: 1, mix: { layers: layer, voice: { bass2Voice: 'roundMono' }, lanes: { bass2: { mute: true } } }, trackId: null }));
  const trimmed = rms(await renderer.render(bass,
    { repeat: 1, mix: { layers: layer, voice: { bass2Voice: 'roundMono' }, lanes: { bass2: { gain: -12 } } }, trackId: null }));
  const stripped = rms(await renderer.render(bass,
    { repeat: 1, mix: { off: ['bass'] }, trackId: null }));

  assert(Math.abs(silent - bare) < 1e-9,
    'a duplicated track with no voice adds nothing at all — it is a strip, not a second copy');
  assert(sounding > bare * 1.05,
    `a duplicated track with a voice is audibly there (rms ${bare.toFixed(5)} → ${sounding.toFixed(5)})`);
  assert(Math.abs(muted - bare) < 1e-9, 'and its M takes it straight back out');
  assert(trimmed > bare && trimmed < sounding,
    'and its fader moves it, like every other channel');
  assert(stripped < bare * 0.01, 'a deleted track is gone from the render, not just from the desk');

  // ---- and it SURVIVES an arrangement edit ----------------------------------
  // Every note and bar edit on the desk goes through `Audio.setArrangement`, which
  // patches the bank being played rather than rebuilding it. A duplicated lane and a
  // deleted one are per-SECTION decisions, so that patch has to shape the sections it
  // splices in — it once spliced the song's own, raw, which took a duplicated track
  // out of every bar the edit had not itself written and put a deleted one back.
  //
  // The lane lives ONLY in a section here, which is what every song written on the
  // desk looks like and what makes the failure total silence rather than wrong notes:
  // with nothing at the top level, a section with no layer lane has nothing to fall
  // back to. The patch is what forking bar 1 produces — a delta over section 0 with
  // only that bar pointed at it — and it changes no note, so the render must not move.
  const sectioned = { bpm: 120, sections: [{ bass: bass.bass }], order: [0] };
  const forkBar1 = { order: [{ s: 1, bars: 1 }, { s: 0, bars: 1, from: 1 }], sections: [{ base: 0 }] };
  const dupMix = { layers: layer, voice: { bass2Voice: 'roundMono' } };
  const secBare = rms(await renderer.render(sectioned, { repeat: 1, mix: null, trackId: null }));
  const secDup = rms(await renderer.render(sectioned, { repeat: 1, mix: dupMix, trackId: null }));
  const secEdited = rms(await renderer.render(sectioned,
    { repeat: 1, mix: dupMix, trackId: null, arrangement: forkBar1 }));
  const secGone = rms(await renderer.render(sectioned,
    { repeat: 1, mix: { off: ['bass'] }, trackId: null, arrangement: forkBar1 }));

  assert(secDup > secBare * 1.05,
    `a lane that lives only in a section still duplicates (rms ${secBare.toFixed(5)} → ${secDup.toFixed(5)})`);
  assert(Math.abs(secEdited - secDup) < secDup * 0.02,
    `an arrangement edit leaves the duplicate playing in the bars it did not touch`
    + ` (rms ${secDup.toFixed(5)} → ${secEdited.toFixed(5)})`);
  assert(secGone < secBare * 0.01,
    'and a deleted track stays deleted through one, rather than coming back');
} finally {
  await renderer.close();
}

console.log(failed ? `\nVOICES: ${failed} FAILED` : '\nVOICES: PASSED');
process.exit(failed ? 1 : 0);
