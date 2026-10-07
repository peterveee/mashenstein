// MAKE A BANGER — FUSIONS. 7 Oct 2026.
//
// One style's SOUND over another style's GROOVE (Peter's names, 7 Oct 2026). In the code they are the
// `music` and the `beat`, because `sound` already names the sounds table. Peter asked whether styles
// could be combined, and of the ways two styles could meet he chose this one: every part comes from
// exactly one of the two, so its sound, its channel and its fader are the ones its own style's seed
// set for it, and nothing is invented.
//   · The GROOVE style (`beat`) brings the drums and percussion, the bass line's rhythm and sound, the
//     tempo and swing, and the sidechain pump.
//   · The SOUND style (`music` — the one picked as the style) brings the chords and moods, the hook's
//     doubles, the arp, the pad and the choir, the arrangement, the FX moves and the master.
// The song plays at the groove's tempo (Peter chose it): a dembow at 138 is not a dembow.
//
// A fusion is a recipe like a flavour: made from the two (each a style, a Sound Set or a flavour),
// never listed, and named `fusion:<music>+<beat>` so styleFor can make it again from a saved take.
// Its sounds are the two rows of sounds.js slot by slot (sound-rules.js fusionRow); its channels and
// fader references are the two seeds' role by role (index.js, levels.js).
// Browser-safe: no `node:*` imports.
import { balanceForStyle } from '../style-balance.js';

/** The roles the GROOVE (`beat`) plays — the kit, the percussion and the bass. Every other role is the SOUND's. */
export const BEAT_ROLES = Object.freeze(['kick', 'snare', 'clap', 'hats', 'hatsSoft', 'ohats', 'crash', 'impact', 'fill',
  'shaker', 'tambourine', 'cowbell', 'congas', 'ride', 'rim', 'bass', 'sub', 'bassEcho']);
const BEAT_ROLE_SET = new Set(BEAT_ROLES);
/** Whether `role` (a strip, label, fader reference or section-FX rule's) is the beat's. */
export const isBeatRole = (role) => BEAT_ROLE_SET.has(role);

/**
 * Where each recipe key comes from. Every key any recipe holds is in exactly one list — the test
 * (tests/banger-fusion.js) fails on a new one until it is placed, so nothing is dropped unseen.
 */
export const FUSION_KEYS = Object.freeze({
  // The groove: its tempo and feel, its drums (half- and full-time drops too), the pump on the kick.
  beat: Object.freeze(['bpm', 'tempoRange', 'tempoFeel', 'swing', 'drums', 'pump', 'bassFixed', 'wobbleSub', 'halfTimeUntil', 'fullTimeFrom']),
  // The song: harmony, arrangement, the parts over the beat, the FX moves and the master.
  music: Object.freeze(['progressions', 'moods', 'modeHarmony', 'breakdown', 'breakdownHook', 'enter', 'arpFixed', 'padUnder',
    'master', 'exciter', 'sectionLabels', 'form', 'machineGunSweep', 'layers', 'grooveParts', 'harmony', 'script', 'blips']),
  // Shared out part by part, below.
  split: Object.freeze(['rhythms', 'centres', 'strips', 'labels', 'defaults', 'remapParts', 'remap', 'balance', 'phone']),
  // A fusion's own, or left behind: it has no flavours and no seed song of its own.
  own: Object.freeze(['id', 'label', 'note', 'title', 'base', 'flavour', 'soundSet', 'flavours', 'flavourByMood', 'seed']),
});
/** The rhythms that are the bass line's (its half-time drop's too)... */
export const BEAT_RHYTHMS = Object.freeze(['offbeat', 'rolling', 'sub', 'subOff', 'pedal', 'halfTime']);
/** ...and the music's: the arp and the stabs. */
export const MUSIC_RHYTHMS = Object.freeze(['arp', 'pianoStabs', 'counterStabs']);
/** The registers the bass sits in. */
const BEAT_CENTRES = new Set(['bassFloor', 'subFloor']);
/** The switches the beat brings: the whole drum group, the bass and sub, and the pump. */
export const isBeatSwitch = (group, key) => group === 'drums' || (group === 'parts' && (key === 'bass' || key === 'sub'))
  || (group === 'fx' && key === 'pump');

/** `music`'s entries, with those `isBeat` claims taken from `beat` instead. Null when both are empty. */
function byKey(music, beat, isBeat) {
  const out = {};
  for (const [k, v] of Object.entries(music || {})) if (!isBeat(k)) out[k] = v;
  for (const [k, v] of Object.entries(beat || {})) if (isBeat(k)) out[k] = v;
  return Object.keys(out).length ? out : null;
}
/** A per-role table (strips, labels, fader references) put together from the two. */
export const fuseRoles = (music, beat) => byKey(music, beat, isBeatRole) || {};

/** The style's defaults, with the beat's drum switches, bass, sub and pump. */
function fuseDefaults(music = {}, beat = {}) {
  const out = {};
  for (const [group, v] of Object.entries(music)) {
    if (group === 'drums') continue;
    out[group] = v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).filter(([k]) => !isBeatSwitch(group, k))) : v;
  }
  for (const [group, v] of Object.entries(beat)) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) continue;
    for (const [k, x] of Object.entries(v)) if (isBeatSwitch(group, k)) (out[group] ||= {})[k] = x;
  }
  return out;
}

/** A flavour's `remap` ({ group: { key: { from: to } } }) put together: each switch from its owner. */
function fuseRemap(music = {}, beat = {}) {
  const out = {};
  for (const [owner, isOwner] of [[music, (g, k) => !isBeatSwitch(g, k)], [beat, isBeatSwitch]]) {
    for (const [group, keys] of Object.entries(owner || {})) {
      for (const [k, swap] of Object.entries(keys)) if (isOwner(group, k)) (out[group] ||= {})[k] = swap;
    }
  }
  return Object.keys(out).length ? out : null;
}

/** The fusion's id: `fusion:<music>+<beat>`. */
export const fusionId = (music, beat) => `fusion:${music}+${beat}`;
/** The two recipe ids a fusion's id names, or null for any other id. */
export function fusionIds(id) {
  const m = /^fusion:([a-z0-9][a-z0-9-]*)\+([a-z0-9][a-z0-9-]*)$/.exec(String(id ?? ''));
  return m ? { music: m[1], beat: m[2] } : null;
}

/**
 * `music` played over `beat` (each a recipe — a style, a Sound Set or a flavour, its shared moods
 * in), as a recipe of its own. `fusion` names the two; `base` is the music's style, whose per-style
 * tables (energy, production, section FX) the song follows.
 */
export function makeFusion(music, beat) {
  const mBal = balanceForStyle(music);
  const bBal = balanceForStyle(beat);
  const pick = (keys, from) => Object.fromEntries(keys.filter((k) => from[k] !== undefined).map((k) => [k, from[k]]));
  const remapParts = byKey(music.remapParts, beat.remapParts, (k) => k === 'bass' || k === 'sub');
  const remap = fuseRemap(music.remap, beat.remap);
  return Object.freeze({
    ...pick(FUSION_KEYS.music, music),
    ...pick(FUSION_KEYS.beat, beat),
    id: fusionId(music.id, beat.id),
    label: `${music.label} × ${beat.label}`,
    note: `${beat.bpm} · ${music.label} sounds over a ${beat.label} groove`,
    title: `${music.label}'s chords, hook, arp and pads over ${beat.label}'s drums and bass, at ${beat.bpm} BPM`,
    base: music.base || music.id,
    fusion: Object.freeze({ music: music.id, beat: beat.id }),
    rhythms: byKey(music.rhythms, beat.rhythms, (k) => BEAT_RHYTHMS.includes(k)) || {},
    centres: byKey(music.centres, beat.centres, (k) => BEAT_CENTRES.has(k)) || {},
    strips: fuseRoles(music.strips, beat.strips),
    labels: fuseRoles(music.labels, beat.labels),
    defaults: fuseDefaults(music.defaults, beat.defaults),
    balance: { ...mBal, roleGainDb: fuseRoles(mBal.roleGainDb, bBal.roleGainDb) },
    // A phone can carry it only if it can carry both.
    ...(music.phone && beat.phone ? { phone: true } : {}),
    ...(remapParts ? { remapParts } : {}),
    ...(remap ? { remap } : {}),
  });
}

/** Two seeds' channels (channels.js) put together: strips and section FX role by role, the pump the beat's. */
export function fuseChannels(music, beat) {
  if (!music && !beat) return null;
  const rules = [...(music?.sectionFx?.rules || []).filter((r) => !isBeatRole(r.role)),
    ...(beat?.sectionFx?.rules || []).filter((r) => isBeatRole(r.role))];
  const sectionFx = music?.sectionFx || beat?.sectionFx ? { ...(music?.sectionFx || beat.sectionFx), rules } : undefined;
  return {
    strips: fuseRoles(music?.strips, beat?.strips),
    ...(music?.master ? { master: music.master } : {}),
    ...(beat?.pump ? { pump: beat.pump } : {}),
    ...(music?.exciter ? { exciter: music.exciter } : {}),
    ...(sectionFx ? { sectionFx } : {}),
  };
}
