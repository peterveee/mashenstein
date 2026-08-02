// What one note of a preset reaches through the render pipeline — the one definition.
//
// Two callers need this number and they must not merely nearly agree: tools/
// measure-voices.js measures the whole library in a batch, and the mixing desk measures
// one preset as it is saved (tools/mixer.js, /voice-save). A preset saved from the desk
// and the same preset from a full re-measure have to be the SAME number, or the library
// quietly holds two conventions and the difference between them is a mix nobody can
// account for. So the bank, the lane, the note and the arithmetic live here, once.
//
// The number itself is explained in src/data/voices.js, over `voiceGain`: it is energy,
// not peak, because the engine's own voices decay across a note and Tone's sustain
// through it, and matching peaks put an eleven-decibel spread between two lanes of a
// song nobody had touched.
import { noteLevel } from './loudness.js';
import { VOICE_LANES, PERCUSSION_LANES, voiceGain } from '../../src/data/voices.js';

// A2 is low enough that a bass preset is in its range and high enough that a bell is
// not absurd; the point is a number that is comparable across presets, not a musical
// audition. A percussion lane ignores it and strikes its own note — see `homeLane`.
export const A2 = 110;

const CHORD_LANES = ['chords', 'organChords'];

/**
 * A single note on one lane, with nothing else in the song, and no echo.
 *
 * Three shapes, because a bank holds three: percussion is booleans, the two chord lanes
 * hold an ARRAY of frequencies per step, and everything else holds one. A bare number on
 * a chord lane is not a quiet chord — `for (const cf of 110)` throws, and the render
 * dies with a page error rather than a bad number.
 *
 * One note and one bar, at one tempo, every time: `noteLevel` is an ungated mean over
 * the whole render, so two of these are comparable only while the window is the same
 * length. Nothing may vary the bpm, the step count or the tail.
 */
export const oneNote = (lane) => {
  const value = PERCUSSION_LANES.includes(lane) ? true
    : CHORD_LANES.includes(lane) ? [A2] : A2;
  const rest = PERCUSSION_LANES.includes(lane) ? false : null;
  return {
    bpm: 120,
    // The melodic lanes reach the delay by default (see ECHO_OPT_IN in lanes.js), and an
    // echo tail is energy the lane added, not energy the preset made. Both halves of the
    // calibration are measured dry, so the send cancels rather than being divided into
    // somebody's level.
    echoLevel: 0,
    [lane]: Array.from({ length: 32 }, (_, i) => (i === 0 ? value : rest)),
  };
};

/**
 * The lane a preset is measured on: the one its CATEGORY says it is for.
 *
 * It matters for percussion and only for percussion. Lane strips are flat and at unity
 * by default and every render here is dry, so two melodic lanes are the same
 * measurement — but a percussion lane supplies the note the voice is struck at, and a
 * kick at 55 Hz is not a kick at A2. Measuring the kit on the bass lane, which is what
 * this did until the levels were re-derived, levelled every drum in the library against
 * a pitch nothing plays it at.
 *
 * A preset's own `homeLane` wins: the Perc category holds the claves and the drums
 * together, and a technical tom lane can still carry a named percussion sound.
 *
 * `rim` is a measuring lane here even though the desk's audition bench refuses it — the
 * bench's objection is that rim always taps the echo bus, and `oneNote` turns the echo
 * off outright, so the one thing that makes it a bad bench cannot reach this.
 * Anything else measures on the bass lane, which is where the whole library was
 * measured before and keeps the melodic half of the table comparable across the change.
 */
export const HOME_LANES = {
  Kick: 'kick', Snare: 'snare', Clap: 'clap', Hats: 'hats', Tom: 'tom', Crash: 'crash',
  Perc: 'rim',
};
export const homeLane = (v) => {
  // `dsZap` has a special crash audition render, but remains FX rather than a drum.
  // Old song-local copies may retain that technical home lane, so do not let it
  // change measurement routing after category normalization.
  if (v?.category === 'FX' && PERCUSSION_LANES.includes(v.homeLane)) return 'bass';
  return v?.homeLane || HOME_LANES[v?.category] || 'bass';
};

/**
 * One preset, on its lane, at unity — measured through the path it is really played by.
 *
 * There is no way to ask for unity on a percussion lane: those lanes have no gain key,
 * so `playVoice` always levels them with `voiceGain`. Rather than force unity on the
 * melodic lanes and take a different path for the kit, every render is made at whatever
 * gain the engine chooses and that gain is divided back out. It is the same arithmetic
 * the desk's live estimate does, for the same reason.
 *
 * Exact wherever the path is linear, which is the whole of it for a Tone voice: gains,
 * filters and sends, and no limiter, which is off by default. NOT quite exact for the
 * noise and drum bodies — `_playNoise` floors its envelope at 1e-4 and ramps to a fixed
 * 0.0001 rather than to a fixed fraction of the level, so their decay shape moves very
 * slightly with the gain they are played at. Measured: a re-run moves those by 0.2–0.4
 * dB and converges, because each run renders nearer the gain the last one settled on.
 * Which is the honest answer for a voice that is not scale-invariant — the number is
 * its level at the level it is played at.
 *
 * `render` is `openRenderer().render`. The preset must already be in the catalogue, or
 * reachable through `mix.voiceParams`, because the render runs the real engine over the
 * real file: there is nothing here that can measure a sound the engine cannot find.
 */
export async function measureVoiceAt(render, voice, lane = homeLane(voice), { mix = null } = {}) {
  // The preset's own TRIM comes out too, and it has to: the engine plays a preset at
  // `voiceGain × dbToGain(trim)`, so a measurement that divided out only the first half
  // would fold the trim into the level — and `voiceGain` divides by that level next
  // time, cancelling the trim exactly. A preset trimmed -1.8 dB would measure 1.8 dB
  // quiet, be boosted 1.8 dB to compensate, and arrive exactly where it started.
  //
  // Which is not hypothetical: `= Shop Kick` and `= Megamix Kick` are the engine's kick
  // at SHORTER tunings, and shorter means less energy. The lane's target was measured
  // at the default tuning, so the level system — whose whole job is "arrive where the
  // voice you replaced arrived" — normalises them back up to it. Trim is the only way
  // a preset can say "quieter than the lane's own voice", and it only works if it
  // survives being measured.
  const applied = voiceGain(voice, lane) * 10 ** ((voice.trim ?? 0) / 20);
  if (!(applied > 0)) {
    throw new Error(`${voice.id || voice.label || 'this preset'}: the engine would play it at ${applied}`);
  }
  const bank = mix ? oneNote(lane) : { ...oneNote(lane), [VOICE_LANES[lane].voiceKey]: voice.id };
  const out = await render(bank, { repeat: 1, mix, trackId: null });
  return {
    level: noteLevel([out.outL, out.outR]) / applied,
    peak: out.peak / applied,
    frames: out.outL.length,
  };
}
