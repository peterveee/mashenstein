// GROUP BUSES, THE DATA: the four fixed groups, their keys, and "Assign by family".
//
// The pure half of the feature — src/data/group-buses.js — which the save path, the mix
// signature, the engine and the desk all read. Node only. What the groups SOUND like is
// tests/group-buses.js (rendered), and what is saved is tests/mix.js (round trip).
import {
  GROUP_BUSES, GROUP_IDS, groupKey, groupIdOf, isGroupKey, groupSettings, laneGroup, familyGroup,
  GROUP_DEFAULTS,
} from '../src/data/group-buses.js';
import { LANES } from '../src/engine/lanes.js';

let failed = false;
const assert = (cond, msg) => {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
};

assert(GROUP_BUSES.length === 4 && GROUP_IDS.join() === 'group1,group2,group3,group4'
  && GROUP_BUSES.map((g) => g.name).join() === 'Group 1,Group 2,Group 3,Group 4',
  'four groups, Group 1 to Group 4, in that order');
assert(groupKey('group2') === '__group:group2' && groupIdOf('__group:group2') === 'group2',
  'a group key round-trips to its id');
assert(groupIdOf('__group:group9') === null && groupIdOf('group1') === null && groupIdOf('__master') === null,
  'a key that is not one of the four groups names none');
assert(isGroupKey('__group:group9') && !isGroupKey('kick') && !isGroupKey('__master'),
  'anything in the group namespace is a group key — never a lane to build');
assert(!LANES.some((l) => isGroupKey(l.key)), 'no lane key can be mistaken for a group');
assert(laneGroup({ group: 'group3' }) === 'group3' && laneGroup({ group: 'group9' }) === null
  && laneGroup({}) === null && laneGroup(null) === null,
  'a lane is in one of the four groups or in none');
const g = groupSettings({ gain: -3, eq: { high: 2 } });
assert(g.gain === -3 && g.pan === 0 && g.mute === false && g.eq.low === 0 && g.eq.high === 2
  && Array.isArray(g.effects) && !g.effects.length,
  'a stored group reads over its defaults');
assert(JSON.stringify(groupSettings(null)) === JSON.stringify({ ...GROUP_DEFAULTS, eq: { ...GROUP_DEFAULTS.eq }, effects: [] }),
  'no stored group is a group at its defaults');

// ---- Assign by family -------------------------------------------------------------
//
// Peter's example song: drums, bass, piano chords and three leads. The drums go to
// Group 1 and the leads to Group 2; the bass and the chords stay on the mix.
const fam = (key) => LANES.find((l) => l.key === key)?.group ?? 'melodic';
const song = [
  ['kick', 'Kick'], ['snare', 'Snare'], ['hats', 'Hats'],
  ['bass', 'Bass'], ['chords', 'Keys'],
  ['lead', 'Lead'], ['lead2', 'Lead'], ['lead3', 'Lead'],
];
const got = Object.fromEntries(song.map(([key, category]) => [key, familyGroup({
  category, family: fam(key.replace(/\d+$/, '')), base: key.replace(/\d+$/, ''),
})]));
assert(got.kick === 'group1' && got.snare === 'group1' && got.hats === 'group1',
  `the drums go to Group 1 (${got.kick}, ${got.snare}, ${got.hats})`);
assert(got.lead === 'group2' && got.lead2 === 'group2' && got.lead3 === 'group2',
  'the three leads go to Group 2');
assert(got.bass === null && got.chords === null, 'the bass and the chords stay on the mix');
assert(familyGroup({ category: 'Lead', family: 'drums', base: 'tom' }) === 'group2',
  'the sound decides first: a tom layer playing a lead preset goes with the leads');
assert(familyGroup({ family: 'drums', base: 'crash' }) === 'group1'
  && familyGroup({ family: 'fx', base: 'sweeps' }) === 'group3'
  && familyGroup({ family: 'vocal', base: 'vox' }) === 'group4'
  && familyGroup({ category: 'Lead', family: 'vocal', base: 'shout' }) === 'group4'
  && familyGroup({ family: 'melodic', base: 'twinkle' }) === 'group2'
  && familyGroup({ family: 'melodic', base: 'organChords' }) === null,
  'without a sound the family decides: drums 1, the lead lanes 2, FX 3, vocals 4, the rest none');

if (failed) { console.error('GROUP BUSES DATA: FAILED'); process.exit(1); }
console.log('GROUP BUSES DATA: PASSED');
