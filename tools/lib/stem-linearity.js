// STEM LINEARITY — whether a song's stems can be expected to add back up to its mix.
//
// tools/render-stems.js renders every lane on its own and checks the stems sum to the
// full mix. That promise holds through anything LINEAR in its input — gain, EQ, filters,
// pan, delays, reverbs: process(a + b) = process(a) + process(b), so a lane rendered alone
// through it is exactly that lane's share of the processed whole. Time-varying is fine
// (an LFO, a tempo-locked gate, a stutter): the modulation follows the song's clock, which
// is the same in every render, not the signal.
//
// A GROUP bus breaks it when its processing is not linear. The group processes the SUM of
// its members (src/data/group-buses.js), and a compressor, saturator, crusher or level gate
// does something to kick + snare that is not what it does to the kick plus what it does to
// the snare. That is bus compression working, not a bug — but those stems will not sum,
// and the export has to say why (docs/group-buses-handover.md §7.1).
//
// Only processing shared by TWO or more stems can do this. A lane's own inserts see the
// same signal in its stem as in the mix, and so does a group with one audible stem in it:
// alone in the stem render or alone in the group, it is the same input to the same chain.
//
// Pure, no I/O: render-stems and tests/stem-linearity.js both read it.
import { EFFECTS, EFFECT_BY_ID } from '../../src/engine/effects.js';
import { GROUP_IDS, GROUP_BY_ID, groupKey, groupSettings, laneGroup } from '../../src/data/group-buses.js';

// The rule is an ALLOW list: an effect is linear only if it is named here, so any effect
// added to EFFECTS later counts as nonlinear until someone checks it and lists it. Wrong
// that way round costs a warning that was not needed; wrong the other way round is the
// unexplained residual this file exists to prevent.
//
// `autowah` is left out on purpose: in its free mode the filter follows an envelope taken
// from the input's own level, so it opens differently on the sum than on each part.
const LINEAR_CANDIDATES = [
  'gain', 'peq', 'bell', 'vowel', 'filter', 'autofilter',
  'delay', 'pingpong', 'chandelay',
  'chorus', 'chorus2', 'flanger', 'phaser', 'tremolo', 'vibrato', 'autopanner', 'ringmod',
  'widener', 'doubler', 'shifter', 'pitch',
  'ambience', 'spring', 'reverb',
  'rhythmgate', 'stutter',
];
const KNOWN = new Set(EFFECTS.map((def) => def.id));
// An id that is not (or is no longer) an effect is dropped rather than trusted.
export const LINEAR_EFFECTS = new Set(LINEAR_CANDIDATES.filter((id) => KNOWN.has(id)));

// A listed effect with a nonlinear stage behind one knob: the Vowel Filter's EXCITE feeds
// a WaveShaper (makeVowelFilter in src/engine/effects.js). At 0, its default, that path is
// silent and the filter is linear; above it, it is a saturator like any other.
const NONLINEAR_WHEN = {
  vowel: (params) => Number(params?.excite) > 0,
};

/** True when an effect entry `{ id, params }` distributes over a sum of inputs. */
export function isLinearEffect(effect) {
  const id = effect?.id;
  if (!LINEAR_EFFECTS.has(id)) return false;
  return !NONLINEAR_WHEN[id]?.(effect.params);
}

// Bypassed is out of the signal path. Muted passes the DRY signal only (the chain's
// muteDry/muteWet pair in src/engine/mixer.js), which is linear whatever the effect is.
const inPath = (effect) => !!effect && typeof effect.id === 'string' && !effect.bypass && !effect.mute;

/**
 * Every nonlinear effect a group runs across two or more of the stems being exported.
 *
 *   mix          the song's mix entry (MIX[id]) — lane routing, `off`, and the groups'
 *                insert chains
 *   arrangement  the arrangement entry whose `automation['__group:<id>'].fx` holds the
 *                groups' Spot FX sections, or null to check the inserts only
 *   stemLanes    the lane keys being rendered as stems (any iterable)
 *
 * A lane is a member when its mix entry routes it to the group and it is neither deleted
 * (`mix.off`, which the engine never routes) nor muted (silent in the stem and in the mix
 * alike). A muted group is skipped for the same reason.
 *
 * @returns {{ group: string, effect: string, where: 'insert' | 'Spot FX', members: string[] }[]}
 *   one entry per effect, groups in their fixed order, inserts before sections.
 */
export function nonlinearGroupEffects(mix, arrangement, stemLanes) {
  const lanes = mix?.lanes || {};
  const deleted = new Set(mix?.off || []);
  const stems = [...(stemLanes || [])];
  const out = [];
  for (const group of GROUP_IDS) {
    const settings = groupSettings(mix?.groups?.[group]);
    if (settings.mute) continue;
    const members = stems.filter((key) => !deleted.has(key)
      && laneGroup(lanes[key]) === group && !lanes[key].mute);
    if (members.length < 2) continue;
    const add = (effect, where) => {
      if (inPath(effect) && !isLinearEffect(effect)) out.push({ group, effect: effect.id, where, members });
    };
    for (const effect of settings.effects) add(effect, 'insert');
    for (const section of arrangement?.automation?.[groupKey(group)]?.fx || []) {
      for (const effect of section?.chain || []) add(effect, 'Spot FX');
    }
  }
  return out;
}

/**
 * The same findings folded to one line's worth per group, for printing:
 * `{ group, name: 'Group 1', effects: ['Compressor', 'Distortion (Spot FX)'], members }`.
 * An effect named twice (two sections with the same chain) is named once.
 */
export function nonlinearGroupSummary(found) {
  const byGroup = new Map();
  for (const { group, effect, where, members } of found) {
    if (!byGroup.has(group)) {
      byGroup.set(group, { group, name: GROUP_BY_ID[group]?.name || group, effects: [], members });
    }
    const label = `${EFFECT_BY_ID[effect]?.name || effect}${where === 'Spot FX' ? ' (Spot FX)' : ''}`;
    const entry = byGroup.get(group);
    if (!entry.effects.includes(label)) entry.effects.push(label);
  }
  return [...byGroup.values()];
}
