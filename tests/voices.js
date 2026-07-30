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
import { openRenderer } from '../tools/lib/render-bank-browser.js';
import {
  VOICES, VOICE_LANES, VOICE_CATEGORIES, PERCUSSION_LANES,
  voicesFor, voicesByCategory, voiceOf, voiceGain, engineBankKeys, defaultVoiceOf,
} from '../src/data/voices.js';
import { LANE_KEYS } from '../src/engine/lanes.js';
import { resolveTrack } from '../src/data/tracks.js';

let failed = 0;
const assert = (cond, msg) => {
  if (cond) { console.log(`ok: ${msg}`); } else { console.error(`FAIL: ${msg}`); failed++; }
};

// The allowlist lives in the engine module, which imports Tone and so cannot be
// loaded in Node. It is short and it is the thing the catalogue must agree with, so
// it is restated here — if they drift, the render half of this suite fails anyway.
const ALLOWED = ['Synth', 'MonoSynth', 'FMSynth', 'AMSynth', 'DuoSynth', 'MembraneSynth', 'MetalSynth'];

const all = Object.values(VOICES);
const tone = all.filter((v) => v.kind === 'tone');
const engine = all.filter((v) => v.kind === 'engine');
const noise = all.filter((v) => v.kind === 'noise');
const drum = all.filter((v) => v.kind === 'drum');
const KIT = ['Kicks', 'Snares', 'Claps', 'Hats', 'Percussion'];

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
for (const c of ['Snares', 'Claps', 'Hats']) {
  assert(noise.some((v) => v.category === c), `${c}: is covered by noise presets`);
}
// A drum lane opens on its own kind. Eleven columns with the drums last was the
// reason this ordering exists at all.
for (const [lane, want] of [['kick', 'Kicks'], ['snare', 'Snares'], ['clap', 'Claps'],
  ['hats', 'Hats'], ['crash', 'Percussion']]) {
  assert(voicesByCategory(lane)[0]?.[0] === want,
    `${lane}: opens on ${want}, not on whatever is first alphabetically`);
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
  // The measured peak. A preset left at exactly 1 has never been through
  // tools/measure-voices.js, and will arrive at the wrong level on every lane.
  assert(v.peak > 0 && v.peak !== 1,
    `${v.id}: carries a measured peak (${v.peak}), not the placeholder`);
  assert(v.options && typeof v.options === 'object', `${v.id}: has constructor options`);
}

for (const v of noise) {
  assert(v.noise && typeof v.noise === 'object', `${v.id}: has a noise burst to build`);
  assert(v.noise.decay > 0 && v.noise.decay < 3, `${v.id}: decays in a plausible time`);
  assert(v.peak > 0 && v.peak !== 1,
    `${v.id}: carries a measured peak (${v.peak}), not the placeholder`);
  assert(!v.synth, `${v.id}: is native nodes on the engine's seeded buffer, not a Tone class`);
  if (v.taps) {
    assert(Array.isArray(v.taps) && v.taps.length > 1 && v.taps[0] === 0,
      `${v.id}: taps start at the hit and repeat after it`);
  }
}

// The drum synth: two optional sources, so the shape rule is "at least one".
for (const v of drum) {
  assert(v.osc || v.noise, `${v.id}: a drum preset has an oscillator, noise, or both`);
  assert(!v.synth, `${v.id}: is native nodes, not a Tone class`);
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
  assert(v.drive === undefined || (v.drive >= 0 && v.drive <= 1),
    `${v.id}: drive stays on the knob's 0–1 range`);
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

for (const v of engine) {
  assert(v.bank || v.osc, `${v.id}: an engine preset is bank keys, a waveform, or both`);
  assert(v.peak === undefined,
    `${v.id}: an engine preset needs no measured peak — it plays at the lane's own gain`);
}

// ---- the seam --------------------------------------------------------------
for (const [lane, seam] of Object.entries(VOICE_LANES)) {
  assert(LANE_KEYS.includes(lane), `${lane}: is a real lane`);
  assert(seam.voiceKey === `${lane}Voice`,
    `${lane}: opts in through ${lane}Voice, the name the desk and mix files write`);
  assert(voicesFor(lane).length > 10,
    `${lane}: offers the library, not a lane-specific handful (${voicesFor(lane).length})`);
  assert(voiceGain({ peak: 0.5 }, lane) > 0, `${lane}: has a measured target to scale presets to`);
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

// The finale changes its lead waveform section by section, so the lane has no one
// voice to name — the bank on its own would say square, which the song never plays.
assert(defaultVoiceOf(resolveTrack('finale').bank, 'lead') === null,
  'a lane its sections keep changing is left unnamed rather than named after the bank');

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
    const lane = usable[i++ % usable.length];
    const bank = { ...oneNote(lane), [VOICE_LANES[lane].voiceKey]: v.id };
    const { peak } = await renderer.render(bank, { repeat: 1, mix: null, trackId: null });
    assert(peak > refs[lane] / 20,
      `${v.id} on ${lane}: renders offline at peak ${peak.toFixed(4)}`
      + ` (the lane's own is ${refs[lane].toFixed(4)})`);
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
