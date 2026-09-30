// The Frost sleigh's carol: fired once per approach on frost-3 only; its first strong note
// on the downbeat of an odd bar (1, 3, 5, …); the whole phrase inside ONE key of the song, coming in
// early or late to manage it; and taken away when a checkpoint undoes the approach.
import assert from 'node:assert/strict';
import { installDom } from './dom-stub.js';

installDom();

const { RunState } = await import('../src/game/run.js');
const { save } = await import('../src/engine/save.js');
const { STAGE_BY_ID } = await import('../src/data/stages.js');
const { Audio, SLEIGH_CAROLS, SLEIGH_CAROL } = await import('../src/engine/audio.js');
const { FROST_FLYPAST_LEAD } = await import('../src/sprites/sleigh.js');

save.load(); save.newSlot(0, 0);

const fired = [];
let stopped = 0;
Audio.sfx = (name, opt = {}) => { if (name === 'sleighCarol') fired.push(opt); };
Audio.stopSleighCarol = () => { stopped++; };

// Frost's shape: D minor, with bars 17-20 and 29-32 (beats 64-79, 112-127) up to F#.
const D = 73.42, FS = 92.5;
let heard = 0;
const tonicOf = (b) => { const m = ((b % 128) + 128) % 128; return (m >= 64 && m < 80) || m >= 112 ? FS : D; };
Audio.songTonic = (ahead = 0) => tonicOf(heard + ahead);

const carol = SLEIGH_CAROLS[SLEIGH_CAROL];
const span = Math.max(...carol.notes.map(([b, , d]) => b + d));

function setup(stageId, songBeat) {
  fired.length = 0;
  const run = new RunState({ stage: STAGE_BY_ID[stageId], save, seed: 5, difficulty: 1,
    skipRunIn: true, onEnd: () => {} });
  run.enter();
  Audio.sourceBank = run.cabinet.music;
  heard = songBeat;
  Audio.songBeat = () => heard;
  Audio.bpm = run.cabinet.music.bpm;
  Audio.tempo = 1;
  Audio.cueLeadSec = () => 0.15;   // built-in output's latency plus the cue lead
  run.obstacles = []; run.pickups = [];
  return run;
}

function check(label, beat) {
  assert.equal(fired.length, 1, `${label}: one carol`);
  const start = beat + fired[0].inBeats;
  const strong = start + carol.downbeat;
  assert.ok(fired[0].inBeats > 0, `${label}: placed ahead, not in the past`);
  assert.ok(Math.abs(strong / 8 - Math.round(strong / 8)) < 1e-6,
    `${label}: the strong note lands on an odd bar's downbeat (beat ${strong}, bar ${strong / 4 + 1})`);
  const keys = new Set([...carol.notes.map(([b]) => tonicOf(start + b)), tonicOf(start + span - 0.05)]);
  assert.equal(keys.size, 1, `${label}: the whole phrase is in one key (from beat ${start})`);
  return start;
}

// Every phrase is playable, and the shipped one exists.
assert.ok(carol, `SLEIGH_CAROL names a phrase (${SLEIGH_CAROL})`);
for (const [name, c] of Object.entries(SLEIGH_CAROLS)) {
  assert.ok(Number.isFinite(c.downbeat) && c.notes.length > 4, `${name} is a phrase`);
  assert.ok(c.notes.some(([b]) => Math.abs(b - c.downbeat) < 1e-9), `${name}'s downbeat is a note`);
}

// At the flypast's own arming (the fallback path), all round the song.
for (let beat = 0.3; beat < 128; beat += 1.25) {
  const run = setup('frost-3', beat);
  run.camX = run.distance = run.finishCameraX();
  run.armFlypast(0);
  const start = check(`flypast at beat ${beat}`, beat);
  assert.ok((start - beat) * 60 / Audio.bpm < 0.8 + 4.8 + 1.2,
    `beat ${beat}: no later than the window allows (${(start - beat).toFixed(2)} beats)`);
  run.armFlypast(0);
  assert.equal(fired.length, 1, 'arming again does not play it twice');
  const before = stopped;
  run.restoreSnapshot(run.makeSnapshot());
  assert.equal(stopped, before + 1, 'a restore stops the carol');
  assert.equal(run.carolArmed, false, 'and lets the next approach play it again');
}

// Ahead of the flypast: armed by the approach, so it may come in before the team.
{
  const beat = 57;   // F# from 64: the refrain goes in early, in D, or waits for F#
  const run = setup('frost-3', beat);
  const speed = Math.max(1, run.speed);
  run.camX = run.distance = run.finishCameraX() - (FROST_FLYPAST_LEAD + 2) * speed;
  run.armSleighCarol();
  check('approach', beat);
  run.camX = run.distance = run.finishCameraX();
  run.armFlypast(0);
  assert.equal(fired.length, 1, 'the flypast does not bring a second carol');
}

// Nowhere else.
for (const id of ['frost-1', 'frost-2']) {
  const run = setup(id, 12);
  run.camX = run.distance = run.finishCameraX();
  run.armSleighCarol(); run.armFlypast(0);
  assert.equal(fired.length, 0, `${id} has no sleigh and no carol`);
}

console.log('SLEIGH CAROL: PASSED');
