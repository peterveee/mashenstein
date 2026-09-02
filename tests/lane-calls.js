// The song announcing itself: BASS! on the beat the bass arrives, and not otherwise.
//
// Two halves, tested separately because they fail differently. `laneEntryBeats` is a
// question about the SONG — where does this part come in — and is pure data. The
// crossing rule is a question about the RUN — has the heard clock just gone past one
// — and its whole job is to say no to the three ways a beat clock moves that are not
// the music playing forward: the first frame, the loop coming round, and a seek.
import { installDom } from './dom-stub.js';
installDom();

const { Audio } = await import('../src/engine/audio.js');
const { laneEntryBeats } = await import('../src/engine/lanes.js');
const { applyArrangement } = await import('../src/data/arrangements.js');
const { RunState } = await import('../src/game/run.js');
const RHYTHM = await import('../src/data/songs/rhythm.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// ---- where a part comes in ---------------------------------------------------
const seq16 = (steps) => {
  const lane = new Array(32).fill(null);
  for (const s of steps) lane[s] = 110;
  return lane;
};

// A bar of bass, a bar of rest, a bar of bass. One entry at the top and one at the
// return; the rest inside a bar is phrasing and says nothing.
const twoBars = {
  bpm: 120,
  bass: [...seq16([0, 4, 8, 12]), ...new Array(16).fill(null)],
  sections: [{}],
  order: [{ s: 0, bars: 1 }, { s: 0, bars: 1, from: 1 }, { s: 0, bars: 1 }],
};
assert(JSON.stringify(laneEntryBeats(twoBars, 'bass')) === '[0,8]',
  'a part entering, resting a bar and returning has two entries — not one per note');

// A bar the arrangement silences is a bar the lane is not in, so the bar after it is
// an arrival. This is the whole reason the mask cannot be skipped: the notes are in
// the section either way.
const muted = {
  ...twoBars,
  order: [{ s: 0, bars: 1, off: ['bass'] }, { s: 0, bars: 1 }, { s: 0, bars: 1 }],
};
assert(JSON.stringify(laneEntryBeats(muted, 'bass')) === '[4]',
  'and a muted bar counts as absence — the entry is where the mute ends');

// The gap is the knob. At two bars the return above is inside the silence the lane is
// allowed, so only the opening counts.
assert(JSON.stringify(laneEntryBeats(twoBars, 'bass', { gapBeats: 12 })) === '[0]',
  'gapBeats decides how long a part has to have been out to be arriving');

// The song this was asked for. RHYTHM BANKRUPTCY holds its bass out for eight bars —
// `off: ["bass", ...]` on every one of them — and drops it at bar 9, which is beat 32.
const rhythm = applyArrangement(RHYTHM.bank, 'rhythm', { rhythm: RHYTHM.arrangement });
assert(JSON.stringify(laneEntryBeats(rhythm, 'bass')) === '[32]',
  'RHYTHM BANKRUPTCY drops its bass once, at bar 9 (beat 32)');

// ---- and the run catching it -------------------------------------------------
const announce = RunState.prototype.announceLaneEntries;
const said = [];
const run = {
  laneCallBank: null, laneCallBeats: null, laneCallLastBeat: null,
  floatText: (text, color) => said.push(`${text} ${color}`),
};
const oldBank = Audio.bank;
const oldSongBeat = Audio.songBeat;
let heard = null;
Audio.bank = rhythm;
Audio.songBeat = () => heard;

const play = (beats) => { for (const b of beats) { heard = b; announce.call(run); } };

play([31.6, 31.9]);
assert(!said.length, 'nothing is said on the approach');
play([32.1]);
assert(said.length === 1 && said[0] === 'BASS! #f6d33c', 'and BASS! lands on the beat it arrives');

// The loop coming round is a jump BACKWARDS, and the seek that follows a bank handoff
// is a jump forwards. Neither is a part arriving, and a card for either is a card the
// player cannot account for.
said.length = 0;
play([80, 20, 20.1]);
assert(!said.length, 'a loop wrapping past the entry says nothing');
play([31.9, 40]);
assert(!said.length, 'and neither does a seek across it');

// A clock that goes away — no context, no song — must not leave the crossing armed:
// the first beat after it is a first frame again, not a leap from wherever it stopped.
said.length = 0;
heard = 31.9; announce.call(run);
heard = null; announce.call(run);
heard = 32.1; announce.call(run);
assert(!said.length, 'a clock that drops out re-arms rather than firing across the gap');

// And a song with no such moment says nothing at all, however it is played.
said.length = 0;
Audio.bank = { bpm: 120, lead: seq16([0]), sections: [{}], order: [0] };
for (let b = 0; b <= 8; b += 0.25) { heard = b; announce.call(run); }
assert(!said.length, 'a song whose bass never comes in never announces one');

Audio.bank = oldBank;
Audio.songBeat = oldSongBeat;

console.log(failed ? 'LANE CALLS: FAILED' : 'LANE CALLS: PASSED');
if (failed) process.exit(1);
