// What belongs to a NOTE besides its pitch and length: its velocity and its mute.
//
// Both sit in parallel arrays beside the notes (`bassVelocity`, `bassMute`) the way
// `bassLen` does, and the bug this suite was written against is the one lengths had
// already been fixed for: every edit that moved a note carried its length and left its
// velocity on the step it came from — so a moved note lost its accent, a note drawn onto
// that step picked it up, and a deleted track left its accents for the next track of
// that name. The claims:
//
//   1. EVERY EDIT CARRIES THEM. Copy, paste, move, duplicate, delete-track and the arp
//      render take velocities and mutes with the notes, and an edit that does not know
//      they exist clears them from the steps whose notes it changed — never anywhere else.
//   2. A FORK DOES NOT RESURRECT ITS BASE. The game's own songs carry velocities in base
//      sections; a cleared fork must say null rather than inherit them again.
//   3. A MUTED NOTE IS A REST TO THE ENGINE, AND NOTHING ELSE. It is taken out of the
//      section once, cached, and a song without mutes plays the very section object it
//      always did. A chord tone mutes on its own and takes its length with it.
//   4. IT REACHES THE SPEAKERS. A muted note renders sample-identical to no note at all.
import {
  NOTE_ATTRS, muteKey, isMuteKey, attrSays, withoutMuted, resolvePlayingSection,
  unmutedValue, songBars, velocityKey,
} from '../src/engine/lanes.js';
import { resolveSection } from '../src/data/arrangements.js';
import {
  draftOf, writeBarNotes, writeBarNotesShared, entryOf, removeLanes, copyLaneBars,
  copyLaneTrack, pasteLaneTrack, moveLaneBars, readBarLane, readBarAttrs, duplicateLaneContent,
} from '../tools/lib/arrangement-edit.js';
import { noteAttr, noteAttrsOf, midiFreq, freqMidi } from '../tools/mixer-piano-roll.js';
import { laneShapeAttrs } from '../tools/lib/note-recorder.js';
import { bankSource } from '../tools/lib/song-source.js';
import { openRenderer } from '../tools/lib/render-bank-browser.js';
import { seq, n } from '../src/engine/notes.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const json = (v) => JSON.stringify(v);
const A2 = n('A2');
const C3 = n('C3');
const E3 = n('E3');
const G3 = n('G3');
const rest16 = () => new Array(16).fill(null);
const nulls = (len) => new Array(len).fill(null);
const VEL = NOTE_ATTRS.find((a) => a.suffix === 'Velocity');
const MUTE = NOTE_ATTRS.find((a) => a.suffix === 'Mute');

// ---- the vocabulary -----------------------------------------------------------------
assert(muteKey('bass') === 'bassMute' && isMuteKey('chords2Mute') && !isMuteKey('frppPalmMuted'),
  'a lane’s mutes are `${lane}Mute` — and a voice’s `palmMuted` is not one of them');
assert(attrSays(0) && attrSays(true) && !attrSays(false) && !attrSays(null)
  && attrSays([null, true]) && !attrSays([null, false]),
  'a velocity of 0 says something; a false or a null does not');
assert(!VEL.perTone && MUTE.perTone,
  'velocity is per step — a chord is struck once — and a mute is per tone');

// ---- 1. an edit that does not know about them -----------------------------------------
const accented = {
  bpm: 120,
  bass: seq('A2 . . . A2 . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  bassVelocity: [0.4, null, null, null, 1, ...nulls(27)],
  order: [0],
};
{
  // Move the first note one step on, as the recorder or a hand-written call would —
  // passing notes and nothing else.
  const notes = readBarLane(accented, draftOf(accented), 0, 'bass');
  notes[0] = null; notes[1] = A2;
  const e = entryOf(accented, writeBarNotes(accented, draftOf(accented), 0, 'bass', notes));
  const sec = e.sections.find((s) => s.bass);
  assert(sec.bassVelocity?.[0] === null,
    'a note moved by an edit that says nothing about velocity does not leave its accent behind');
  assert(sec.bassVelocity?.[1] === null,
    'nor is its new step given one it never had');
  assert(sec.bassVelocity?.[4] === 1,
    'and the note nobody touched keeps its own');
}

// ---- 2. a fork does not resurrect its base --------------------------------------------
const based = {
  bpm: 120,
  sections: [{
    bass: seq('A2 . . . . . . . . . . . . . . . | A2 . . . . . . . . . . . . . . .'),
    bassVelocity: [0.5, ...nulls(15), 0.5, ...nulls(15)],
  }],
  order: [0],
};
{
  const cleared = writeBarNotes(based, draftOf(based), 0, 'bass', rest16(), rest16(),
    { Velocity: null, Mute: null });
  const e = entryOf(based, cleared);
  const fork = e.sections.find((s) => s.base === 0 || s.bass);
  assert(Array.isArray(fork?.bassVelocity) && fork.bassVelocity.slice(0, 16).every((v) => v === null),
    'a fork that clears its velocities writes the nulls, rather than deleting the key and'
    + ' playing its base section’s accents again');
}

// ---- 1, continued: everything that moves notes takes them along -----------------------
const muted = {
  bpm: 120,
  bass: seq('A2 . . . C3 . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  bassVelocity: [0.3, ...nulls(31)],
  bassMute: [null, null, null, null, true, ...nulls(27)],
  order: [0],
};
{
  const d = draftOf(muted);
  const attrs = readBarAttrs(muted, d, 0, 'bass');
  assert(attrs.Velocity[0] === 0.3 && attrs.Mute[4] === true,
    'a bar’s velocities and mutes read through the same chain as its notes');

  const clip = copyLaneBars(muted, d, 0, 0, 'bass');
  assert(clip.attrs?.[0]?.Velocity?.[0] === 0.3 && clip.attrs[0].Mute[4] === true,
    'a copied clip carries them');

  const moved = entryOf(muted, moveLaneBars(muted, d, 0, 0, 'bass', 'lead', 0));
  const sec = moved.sections.find((s) => Array.isArray(s.lead) && s.lead[0] === A2);
  assert(sec?.leadVelocity?.[0] === 0.3 && sec?.leadMute?.[4] === true,
    'a bar dragged onto another lane arrives with them');
  assert(!moved.sections.some((s) => attrSays(s.bassVelocity?.slice(0, 16))
    || attrSays(s.bassMute?.slice(0, 16))),
  'and leaves none of them on the lane it left');

  const track = copyLaneTrack(muted, d, 0, 0, 'bass');
  const pasted = entryOf(muted, pasteLaneTrack(muted, draftOf(muted), 0, 'bass2', track));
  const pastedSec = pasted?.sections.find((s) => Array.isArray(s.bass2));
  assert(pastedSec?.bass2Velocity?.[0] === 0.3 && pastedSec?.bass2Mute?.[4] === true,
    'a whole track pasted onto a new lane brings them');

  const duplicated = entryOf(muted, duplicateLaneContent(muted, d, 'bass', 'bass3'));
  assert(duplicated?.sections.some((s) => s.bass3Mute?.[4] === true && s.bass3Velocity?.[0] === 0.3),
    'Duplicate track copies them');

  const withAttrs = { sections: [{ bass: [A2], bassLen: [4], bassVelocity: [1], bassMute: [true] }], plan: [] };
  const stripped = removeLanes(withAttrs, ['bass']).sections[0];
  assert(stripped.bassVelocity === undefined && stripped.bassMute === undefined,
    'deleting a track deletes them — a new track of that name starts with none');
}

// ---- 3. the engine's view ---------------------------------------------------------------
{
  const plain = { bass: [A2, null], bassVelocity: [1, null] };
  assert(withoutMuted(plain) === plain,
    'a section without mutes is handed back as itself — no copy, nothing changes');
  const mono = { bass: [A2, C3], bassMute: [true, null] };
  assert(json(withoutMuted(mono).bass) === json([null, C3]), 'a muted note is a rest');
  const kit = { kick: [true, true], kickMute: [null, true] };
  assert(json(withoutMuted(kit).kick) === json([true, false]),
    'a muted drum hit is a drum rest — false, as the lane is written');
  const chord = { chords: [[C3, E3, G3]], chordsLen: [[4, 2, 8]], chordsMute: [[null, true, null]] };
  const played = withoutMuted(chord);
  assert(json(played.chords) === json([[C3, G3]]) && json(played.chordsLen) === json([[4, 8]]),
    'a muted chord tone leaves the chord and takes its own length with it');
  assert(json(withoutMuted({ chords: [[C3, E3]], chordsMute: [true] }).chords) === json([null]),
    'a scalar mute on a chord step mutes the whole chord');
  assert(json(chord.chords) === json([[C3, E3, G3]]), 'and the written section is not touched');
  assert(unmutedValue([C3, E3], [true, true]) === null && unmutedValue(A2, null) === A2,
    'one step at a time, the same answer');

  const bank = { bpm: 120, sections: [{ bass: [A2], bassMute: [true] }, { bass: [A2] }], order: [0, 1] };
  const first = resolvePlayingSection(bank, 0);
  assert(first !== resolveSection(bank, 0) && first.bass[0] === null,
    'the engine plays a muted section with the note out');
  assert(resolvePlayingSection(bank, 0) === first,
    'and works that out once — the second tick reads the cache');
  assert(resolvePlayingSection(bank, 1) === resolveSection(bank, 1),
    'a section with no mutes is the section the engine always played');

  const bars = songBars(bank);
  const heard = songBars(bank, 1, { playing: true });
  assert(bars[0].b.bass[0] === A2 && heard[0].b.bass[0] === null,
    'songBars says what the song CONTAINS unless asked what it plays — a lane muted'
    + ' throughout must still have a strip to be unmuted from');
}

// ---- the roll's chord pairing ------------------------------------------------------------
{
  const row = (note) => ({ midi: freqMidi(note), freq: midiFreq(freqMidi(note)), chord: true });
  const chord = [C3, E3, G3];
  // Mute E3, then add a note below everything: the flags must stay with their tones.
  const one = noteAttr(row(E3), MUTE, chord, null, true, true);
  assert(json(one) === json([null, true, null]), 'muting one tone of a chord flags that tone');
  const added = noteAttr(row(A2), MUTE, chord, one, true, undefined);
  assert(json(added) === json([null, null, true, null]),
    'a tone added below the chord does not slide the mute onto its neighbour');
  const unmuted = noteAttr(row(E3), MUTE, chord, one, true, null);
  assert(unmuted === null, 'unmuting the last muted tone leaves nothing written');
  const erased = noteAttr(row(E3), MUTE, chord, one, false, undefined);
  assert(erased === null, 'erasing the muted tone takes its flag with it');
  assert(noteAttr(row(E3), VEL, chord, 0.6, false, undefined) === 0.6,
    'a chord’s velocity stays while any of it is left');
  const picked = noteAttrsOf(row(E3), NOTE_ATTRS, chord, { Velocity: 0.6, Mute: one });
  assert(picked.Mute === true && picked.Velocity === 0.6,
    'one note’s attributes read out of its step: its own mute, the chord’s velocity');
  const mono = { midi: freqMidi(A2), freq: A2, chord: false };
  assert(noteAttr(mono, MUTE, C3, true, false, undefined) === true,
    'an eraser dragged past a different pitch leaves that note’s mute alone');
  assert(noteAttr(mono, MUTE, C3, true, true, undefined) === null,
    'and a new note replacing it on a mono lane starts unmuted');
  assert(json(laneShapeAttrs('gliss', { Velocity: [0.5], Mute: [[true, null]] }))
    === json({ Velocity: [0.5], Mute: [true] }),
  'a chord pasted onto a mono lane keeps the mute of the tone that survives');
  assert(json(laneShapeAttrs('bass', { Mute: [[true, null]] })) === json({ Mute: [[true, null]] }),
    'and onto a lane that keeps the chord, keeps every tone’s');
}

// ---- the file ------------------------------------------------------------------------------
{
  const src = bankSource({ bpm: 120, kick: seq('x . . . x . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
    kickMute: [null, null, null, null, true, ...nulls(27)] });
  assert(/kickMute: \[null,null,null,null,true/.test(src),
    'a mute array is written as plain JSON, not as a drum pattern that reads as one');
}

// ---- 4. the speakers ------------------------------------------------------------------------
const same = (a, b) => a.outL.length === b.outL.length && a.outL.every((v, i) => v === b.outL[i]);
const energy = (r) => r.outL.reduce((s, v) => s + v * v, 0);
const renderer = await openRenderer();
try {
  const play = (bank) => renderer.render({ bpm: 120, ...bank }, { repeat: 1, mix: null, trackId: null });
  const twoNotes = seq('A2 . . . . . . . C3 . . . . . . . | . . . . . . . . . . . . . . . .');
  const oneNote = seq('A2 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .');
  const withMute = await play({ sections: [{ bass: twoNotes, bassMute: [...nulls(8), true, ...nulls(23)] }], order: [0] });
  const without = await play({ sections: [{ bass: oneNote }], order: [0] });
  const both = await play({ sections: [{ bass: twoNotes }], order: [0] });
  assert(same(withMute, without),
    'a muted note renders sample-identical to no note at all');
  assert(!same(both, without) && energy(both) > energy(without),
    'and unmuted, the same note is heard');
} finally {
  await renderer.close();
}

console.log(failed ? 'NOTE ATTRS: FAILED' : 'NOTE ATTRS: PASSED');
process.exit(failed ? 1 : 0);
