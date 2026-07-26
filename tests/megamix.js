// The procedural jukebox Megamix: a four-bar drum intro followed by a
// key-matched, four-bar mash-up spotlight for every existing song.
import {
  MEGAMIX_KEY_SHIFTS,
  MEGAMIX_LEAD_GAIN,
  MEGAMIX_SOURCE_TRACKS,
  MEGAMIX_THEME,
} from '../src/data/megamix.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const audible = (lane) => lane?.some(Boolean);
const intro = MEGAMIX_THEME.sections.slice(0, 2);
const sourceNames = new Set(MEGAMIX_SOURCE_TRACKS.map((track) => track.name));
const songSections = MEGAMIX_THEME.sections.filter((section) => sourceNames.has(section.sourceName));
const resetSections = MEGAMIX_THEME.sections
  .filter((section) => section.sourceName === 'BASS + CHORD RESET');

assert(MEGAMIX_SOURCE_TRACKS.length === 13,
  'Megamix draws from all thirteen pre-existing jukebox songs');
assert(MEGAMIX_THEME.bpm === 120 && MEGAMIX_THEME.sections.length === 32
  && MEGAMIX_THEME.order.every((section, index) => section === index),
  'Megamix runs for 64 bars in sequential two-bar blocks at 120 BPM');
assert(intro.length === 2 && intro.every((section) =>
  section.sourceName === 'FOUR-BAR DRUM INTRO'
    && !audible(section.bass) && !audible(section.chords)
    && !audible(section.lead) && !audible(section.leadHarm) && !audible(section.twinkle)),
  'the first four bars are a deliberately simple drums-only house intro');
assert(intro.every((section) => {
  const effective = { ...MEGAMIX_THEME, ...section };
  return effective.kick === MEGAMIX_THEME.kick
    && effective.kick.filter(Boolean).length === 8
    && !audible(effective.rim);
}), 'the four-bar intro keeps the four-on-the-floor kick and contains no rimshot');
assert(!audible(intro[0].snare)
  && intro[1].snare.filter(Boolean).length === 6
  && [4, 12, 20].every((step) => intro[1].snare[step])
  && intro[1].snare[28] && !intro[1].snare[29]
  && intro[1].snare[30] && intro[1].snare[31],
  'two snareless bars lead to a backbeat and one final fill');
assert(MEGAMIX_SOURCE_TRACKS.every((track) =>
  songSections.filter((section) => section.sourceName === track.name).length === 2),
  'every source owns exactly four bars of the mash-up');
assert(resetSections.length === 4 && resetSections.every((section) =>
  audible(section.bass) && audible(section.chords)
    && !audible(section.lead) && !audible(section.leadHarm) && !audible(section.twinkle)
    && !audible(section.kick) && !audible(section.hats) && !audible(section.ohats)
    && !audible(section.clap) && !audible(section.snare) && !audible(section.rim)
    && !audible(section.crash) && !audible(section.sweeps) && !audible(section.electroFx)
    && !audible(section.organSwoop) && !audible(section.gliss) && !audible(section.keyGliss)),
  'two four-bar act breaks contain only the shared bass and chord stabs');
assert(songSections.every((section) => audible(section.lead)),
  'every source contributes an audible transposed melody');
assert(songSections.every((section) => section.leadGain === MEGAMIX_LEAD_GAIN
  && section.leadType === 'triangle'
  && section.leadDur === 1.25 && section.leadAttack === 0.008),
  'all thirteen main hooks use one prominent voice, level and envelope');
assert(MEGAMIX_LEAD_GAIN === 0.064
  && songSections.filter((section) => section.phase === 'hook')
    .every((section) => !audible(section.leadHarm) && !audible(section.twinkle)),
  'source-specific harmony layers cannot make individual hooks dominate the mix');
assert(MEGAMIX_KEY_SHIFTS.length === MEGAMIX_SOURCE_TRACKS.length
  && MEGAMIX_KEY_SHIFTS.some((shift) => shift !== 0),
  'the arrangement defines explicit key/register moves for every source');
assert(songSections.filter((section) => section.phase === 'transition').every((section) =>
  section.leadHarm.slice(0, 16).every((note) => !note)
    && section.leadHarm.slice(16).some(Boolean)),
  'each transition previews the next key-matched hook during its final bar');
assert(MEGAMIX_THEME.kick.filter(Boolean).length === 8
  && MEGAMIX_THEME.hats.filter(Boolean).length === 8
  && MEGAMIX_THEME.ohats.filter(Boolean).length === 4
  && MEGAMIX_THEME.clap.filter(Boolean).length === 0
  && MEGAMIX_THEME.snare.filter(Boolean).length === 4,
  'base house kit contains kick, closed hat, open hat and snare without premature claps');
const firstActNames = new Set(MEGAMIX_SOURCE_TRACKS.slice(0, 4).map((track) => track.name));
assert(songSections.filter((section) => firstActNames.has(section.sourceName))
  .every((section) => !audible(section.clap))
  && songSections.filter((section) => !firstActNames.has(section.sourceName))
    .every((section) => section.clap.filter(Boolean).length === 1 && section.clap[28]),
  'one clap every two bars enters only after the first act and its reset');
assert(MEGAMIX_THEME.bassFilteredSaw && !MEGAMIX_THEME.bassEcho
  && MEGAMIX_THEME.bassGain === 0.07 && MEGAMIX_THEME.chordGain === 0.045
  && audible(MEGAMIX_THEME.bass) && audible(MEGAMIX_THEME.chords),
  'the trimmed dry filtered bass and raised chord bed glue the imported hooks together');
assert(MEGAMIX_THEME.kickGain === 0.8 && MEGAMIX_THEME.kickKnock === 0.56,
  'the consistent four-on-the-floor kick has a stronger body and knock');
assert(MEGAMIX_THEME.drumGain === 0.53,
  'the simple drum kit is restrained beneath the louder lead and chord bed');
assert(MEGAMIX_THEME.musicTrim === 2.24,
  'the complete Monster Mix receives a final jukebox-level loudness trim');
assert(songSections.every((section) => section.kick == null
  && section.hats == null && section.ohats == null)
  && songSections.filter((section) =>
    section.phase === 'transition' || section.phase === 'act-close' || section.phase === 'final-close')
    .every((section) => section.snare.filter(Boolean).length > MEGAMIX_THEME.snare.filter(Boolean).length)
  && songSections.some((section) => audible(section.rim))
  && songSections.some((section) => audible(section.crash)),
  'the kick and house kit stay fixed while transition-only snare, rim and crash fills add movement');
const fxLanes = ['electroFx', 'organSwoop', 'sweeps', 'gliss', 'keyGliss'];
const fxSections = songSections.filter((section) => fxLanes.some((lane) => audible(section[lane])));
assert(fxSections.length === 7 && fxSections.every((section) =>
  section.phase === 'transition' || section.phase === 'final-close')
  && fxLanes
    .every((lane) => songSections.some((section) => audible(section[lane]))),
  'seven planned handoffs carry all five synth-noise, sweep and swoop families');

console.log(failed ? 'MEGAMIX: FAILED' : 'MEGAMIX: PASSED');
process.exit(failed ? 1 : 0);
