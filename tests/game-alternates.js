import { GAME_ALTERNATES, gameAlternate } from '../src/data/game-alternates.js';

let failed = false;
const assert = (condition, message) => {
  if (!condition) { console.error('FAIL:', message); failed = true; }
  else console.log('ok:', message);
};

const entries = Object.values(GAME_ALTERNATES);
assert(entries.length >= 4, 'the authored game alternates are explicitly registered');
for (const song of entries) {
  assert(song.id && song.alternateOf && song.bank && song.mix && song.arrangement,
    `${song.id} carries a complete game-song payload`);
  assert(gameAlternate(song.id, song.alternateOf) === song,
    `${song.id} resolves only against its declared parent`);
  assert(!gameAlternate(song.id, '__not_a_parent__'),
    `${song.id} rejects an unrelated cabinet parent`);
}

if (failed) process.exitCode = 1;

