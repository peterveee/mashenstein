// GROUP BUSES — the four fixed subgroups a channel can be routed into.
//
// A channel assigned to a group stops feeding the mix directly: its output (the strip's
// `monitor`, after its fader, EQ, inserts and width) goes into the group instead, and the
// group sums its members through its own EQ, insert chain, Spot FX sections, fader and pan
// into the same music bus every other channel feeds. One processor for the whole group —
// a bus compressor over the drums, a filter sweep over everything but the bass — where
// the alternative was one per track. See docs/group-buses-handover.md for the design and
// docs/SONG_MIXER.md "Group buses" for how it is used.
//
// In a song's mix:
//
//   lanes:  { kick: { group: 'group1' }, snare: { group: 'group1' }, … }
//   groups: { group1: { gain: -2, pan: 0, mute: false, eq: { low: 0, mid: 0, high: 0 },
//                       effects: [{ id: 'compressor', params: {…} }] } }
//
// A lane with no `group` (or one that is not a group here) is unassigned and goes straight
// to the mix, which is every lane of every song that has not asked. A group keeps its
// settings with no members, so taking the last track out and putting one back finds the
// group as it was. Its Spot FX sections live on the arrangement under `__group:<id>`, like
// the master's under `__master`: sections only, no level line and no cuts.
//
// "Group" here is the ROUTING group. A lane's family — drums, melodic, fx, vocal, which
// the desk filters and draws icons by — is `LANES[].group` in src/engine/lanes.js and is
// a different thing; code that handles both calls this one a route or a bus.
//
// No imports: the save path, the signature and the node tests all read this file.

/** The four groups, in the order they are offered and drawn. Names are fixed. */
export const GROUP_BUSES = Object.freeze([
  { id: 'group1', index: 1, name: 'Group 1' },
  { id: 'group2', index: 2, name: 'Group 2' },
  { id: 'group3', index: 3, name: 'Group 3' },
  { id: 'group4', index: 4, name: 'Group 4' },
].map((g) => Object.freeze(g)));

export const GROUP_IDS = Object.freeze(GROUP_BUSES.map((g) => g.id));
export const GROUP_BY_ID = Object.freeze(Object.fromEntries(GROUP_BUSES.map((g) => [g.id, g])));

/** A group's key wherever a lane key goes: effect targets and arrangement automation. */
export const GROUP_KEY_PREFIX = '__group:';
export const groupKey = (id) => `${GROUP_KEY_PREFIX}${id}`;

/** The group a key names, or null — a key that is not a group, or a group that is not one of the four. */
export function groupIdOf(key) {
  if (typeof key !== 'string' || !key.startsWith(GROUP_KEY_PREFIX)) return null;
  const id = key.slice(GROUP_KEY_PREFIX.length);
  return GROUP_BY_ID[id] ? id : null;
}

/** Any key in the group namespace, valid or not — what must never be built as a lane. */
export const isGroupKey = (key) => typeof key === 'string' && key.startsWith(GROUP_KEY_PREFIX);

/** A group's settings when nothing has been stored: unity, centred, flat, no effects. */
export const GROUP_DEFAULTS = Object.freeze({
  gain: 0, pan: 0, mute: false, eq: Object.freeze({ low: 0, mid: 0, high: 0 }),
});

/** A stored group entry over the defaults — what the engine and the desk read. */
export function groupSettings(entry) {
  const e = entry && typeof entry === 'object' ? entry : {};
  return {
    gain: Number.isFinite(e.gain) ? e.gain : GROUP_DEFAULTS.gain,
    pan: Number.isFinite(e.pan) ? Math.max(-1, Math.min(1, e.pan)) : GROUP_DEFAULTS.pan,
    mute: !!e.mute,
    eq: { ...GROUP_DEFAULTS.eq, ...(e.eq && typeof e.eq === 'object' ? e.eq : {}) },
    effects: Array.isArray(e.effects) ? e.effects : [],
  };
}

/** The group a lane's mix entry is routed to, or null. An id that is not a group is unassigned. */
export function laneGroup(laneEntry) {
  const id = laneEntry && typeof laneEntry === 'object' ? laneEntry.group : null;
  return typeof id === 'string' && GROUP_BY_ID[id] ? id : null;
}

/**
 * ASSIGN BY FAMILY — the group a track goes in when the desk fills the groups for you.
 *
 *   Group 1  drums      Kick, Snare, Clap, Rim, Hats, Crash, Tom, Perc
 *   Group 2  leads      Lead, Pluck, Bells, Blip
 *   Group 3  FX         FX, Sweep
 *   Group 4  vocals     (the vocal lanes)
 *   none     bass, keys, pads, organ, orchestra — they stay on the mix
 *
 * The SOUND decides first (`category`, the preset's picker category), because a layer is
 * named after the lane it copies and can play anything — a `tom2` playing a lead preset
 * belongs with the leads. Without a category the lane's family decides (`family`, from
 * LANES[].group, and `base`, the lane a layer copies): drums to 1, the lead lanes to 2,
 * FX to 3, vocals to 4, and bass, chords and organ stay unassigned.
 */
const CATEGORY_GROUP = Object.freeze({
  Kick: 'group1', Snare: 'group1', Clap: 'group1', Rim: 'group1', Hats: 'group1',
  Crash: 'group1', Tom: 'group1', Perc: 'group1',
  Lead: 'group2', Pluck: 'group2', Bells: 'group2', Blip: 'group2',
  FX: 'group3', Sweep: 'group3',
  Bass: null, Keys: null, Pad: null, Organ: null, Orch: null,
});
const LEAD_LANES = new Set(['lead', 'leadHarm', 'twinkle']);

export function familyGroup({ category = null, family = null, base = null } = {}) {
  if (family === 'vocal') return 'group4';
  if (category && Object.prototype.hasOwnProperty.call(CATEGORY_GROUP, category)) {
    return CATEGORY_GROUP[category];
  }
  if (family === 'drums') return 'group1';
  if (family === 'fx') return 'group3';
  if (LEAD_LANES.has(base)) return 'group2';
  return null;
}
