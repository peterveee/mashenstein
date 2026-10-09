// MAKE A BANGER — the kinds of section a song can be made of.
//
// A form is a list of sections, each one of these TYPES. The Club form (form.js, today's
// build-and-drop banger) names its sections by ROLE — drop, drop2, build2 … — because the
// drop machinery in sections.js is keyed by which drop it is; every role maps to a type
// here. The other forms (templates.js) and a form drawn in the dialog's editor are lists
// of types, and form.js gives each one the role its renderer reads.
//
// `energy` (0–1) is how hard a section hits by default: what the transitions between
// sections are chosen by (transitions.js), and what the editor draws as a block's height.
// `hook` says the section carries the hook at full strength — what the level matching
// listens to first. Browser-safe.

import { BREAKDOWN_WAYS } from './breakdown-ways.js';
import { BUILD_WAYS } from './build-ways.js';

// `note` is the short line the section lists show beside each kind; `title` the whole of
// what it does, for the tooltips. A variant is [id, label, what it plays].
export const SECTION_TYPES = Object.freeze({
  intro: { label: 'Intro', colour: '#5d7ea3', hook: false, energy: 0.3, min: 2, max: 32,
    note: 'Opens the song',
    title: 'Opens the song — the riff as written, a filtered quote of the chorus, the parts arriving one at a time, or drums and bass alone',
    variants: [['riff', 'The Riff', 'The riff as you played it, the kick and hats joining'],
      ['quote', 'Chorus Quote', 'The chorus\'s hook and chords through a low-pass that opens across it'],
      ['layers', 'In Layers', 'The parts arriving one at a time — kick, kit, bass, chords, the hook last'],
      ['groove', 'Drums & Bass', 'The beat and the bass alone, so the next section comes in all at once']] },
  verse: { label: 'Verse', colour: '#3f9a86', hook: false, energy: 0.45, min: 4, max: 32,
    note: 'A lower, sparser tune on other chords',
    title: 'A new line grown from the hook\'s own rhythm, sung lower and sparser over chords the chorus never plays, on a lighter kit — verse 2 is the same tune, its second half a step up' },
  preChorus: { label: 'Pre-Chorus', colour: '#c2a031', hook: false, energy: 0.62, min: 2, max: 16,
    note: 'Climbs into the chorus',
    title: 'The hook\'s opening sequenced up a step a bar over a climbing walk that lands on the dominant; the music opens up and the snare rolls into the chorus' },
  build: { label: 'Build', colour: '#d0852f', hook: false, energy: 0.6, min: 2, max: 16,
    note: 'Snare roll and riser',
    title: 'A snare roll accelerating, the arp and the square double joining for the second half, a riser and a stutter into the drop',
    // '' is the Build Type switch's (More Options → Form) — what an undrawn build shows. Rebuild is
    // the arp from the first bar, climbing the switch's way.
    variants: [['', 'As Build Type', 'Whatever More Options → Build Type says — Varied: a different way each build'],
      ['rebuild', 'Rebuild', 'A longer build with the arp from its first bar — after a long breakdown'],
      ...BUILD_WAYS.map((w) => [w.id, w.label, w.note])] },
  chorus: { label: 'Chorus', colour: '#d1445e', hook: true, energy: 0.8, min: 4, max: 128,
    note: 'The hook in full, full time',
    title: 'The hook in full — its doubles, the chords, the bass and the whole kit, full time. Each chorus hits harder than the last; the last one gets the octave hook, the choir and the ride' },
  drop: { label: 'Drop', colour: '#b42f4a', hook: true, energy: 0.85, min: 4, max: 128,
    note: 'The hook with everything, full time',
    title: 'The drop: the hook with everything, the kick on every beat — full time. Each drop hits harder than the last; the last gets the octave hook, the choir and the ride' },
  halfDrop: { label: 'Half-Time Drop', colour: '#a2456f', hook: true, energy: 0.75, min: 4, max: 128,
    note: 'The drop with the drums at half time',
    title: 'The drop played half time: the hook and the chords at full speed, the kick and the backbeat at half the pace — the heavy, swaggering drop. Chipstep and Future Bass open on one' },
  breakdown: { label: 'Breakdown', colour: '#7861b5', hook: false, energy: 0.25, min: 4, max: 32,
    note: 'Drums out, the hook over a pad',
    title: 'The drums out: the hook over a held pedal and an open pad, the choir above it',
    // '' is no choice of its own — the Breakdown Hook switch's (More Options → Form) — and is what an
    // undrawn breakdown shows.
    variants: [['', 'As Breakdown Hook', 'Whatever More Options → Breakdown Hook says — Varied: a different way each take'],
      ['pedal', 'Half-Speed Hook', 'The hook at half speed — every note twice as long'],
      ['written', 'Hook As Written', 'The hook at its own speed over the pad, the choir and the pedal'],
      ['exposed', 'Hook Alone', 'The hook as written over the pad alone; the choir and the pedal join halfway'],
      ['none', 'No Hook', 'The pad, the choir and the pedal alone — the hook rests'],
      // ...and every other way (breakdown-ways.js), by its own id.
      ...BREAKDOWN_WAYS.filter((w) => !['half', 'written', 'none'].includes(w.id)).map((w) => [w.id, w.label, w.note])] },
  middle8: { label: 'Middle 8', colour: '#3d8cc2', hook: false, energy: 0.5, min: 4, max: 16,
    note: 'Somewhere new before the last chorus',
    title: 'Somewhere new: chords the chorus never plays, the hook\'s tail motif developed, half-time drums and a walking bass — ending on the dominant with the hook\'s first notes as a pickup into the chorus' },
  groove: { label: 'Groove', colour: '#6e983f', hook: false, energy: 0.6, min: 4, max: 64,
    note: 'One groove, layers by energy',
    title: 'One groove with as many of the style\'s layers as its energy asks for — a part more for each step up',
    variants: [['build', 'Layers by Energy', 'As many layers as the energy asks for'], ['dip', 'Drums Out', 'Everything but the drums']] },
  falseEnding: { label: 'False Ending', colour: '#6b6b74', hook: false, energy: 0.15, min: 2, max: 8,
    note: 'Stops dead, then comes back',
    title: 'Everything stops dead on a crash and a held chord, the hook alone in the silence, then the roll brings it all back' },
  outro: { label: 'Outro', colour: '#4b5b6c', hook: false, energy: 0.35, min: 2, max: 32,
    note: 'Ends the song',
    title: 'Ends the song — the riff as written, a tag of the chorus landing home, a fade, a cold stop, or the layers leaving',
    variants: [['riff', 'The Riff', 'The riff as you played it over the kit, a fill at the end'],
      ['tag', 'Chorus Tag', 'The chorus\'s last two bars, then everything holding the home chord'],
      ['fade', 'Fade Out', 'The chorus played on, fading to nothing'],
      ['cold', 'Cold End', 'The chorus stopping dead on the last bar\'s third beat, one low hit of home'],
      ['layers', 'In Layers', 'The parts leaving one at a time, the kick last']] },
});
export const SECTION_TYPE_IDS = Object.freeze(Object.keys(SECTION_TYPES));

/** The type each of the Club form's roles is. */
export const ROLE_TYPE = Object.freeze({
  intro: 'intro', build: 'build', build2: 'build', drop: 'drop', drop2: 'drop', drop3: 'drop', reprise: 'drop',
  breakdown: 'breakdown', false: 'falseEnding', outro: 'outro', groove: 'groove',
});
/** The roles that are drops, by which drop they are. */
export const DROP_INDEX = Object.freeze({ drop: 0, drop2: 1, drop3: 2, reprise: 3 });
/** Can a section of `type` carry the Club role `role`? A drop may be played half time. */
export const roleFits = (role, type) => !!role && (ROLE_TYPE[role] === type || (type === 'halfDrop' && role in DROP_INDEX));
/** Does a section carry the hook at full strength (a drop, a chorus, a groove at its peak)? */
export const isHookSection = (sec) => sec.role in DROP_INDEX || !!sec.hook;
/** A section's type: its own, or its role's. */
export const typeOf = (sec) => sec.type || ROLE_TYPE[sec.role] || sec.role;

/** The most sections a drawn form may have. */
export const MAX_SECTIONS = 40;
/**
 * A drawn form (the dialog's editor), checked and tidied: `{ sections, issues }`. Every
 * section a known type, its bars even and inside the type's range, a short label, an
 * energy 0–1; at least one section that carries the hook. The total is checked against
 * the length limits by the caller.
 */
export function normaliseSections(raw) {
  const issues = [];
  if (!Array.isArray(raw)) return { sections: null, issues: ['a drawn form is a list of sections'] };
  if (!raw.length) return { sections: null, issues: ['a drawn form needs at least one section'] };
  if (raw.length > MAX_SECTIONS) issues.push(`a form has at most ${MAX_SECTIONS} sections, not ${raw.length}`);
  const sections = [];
  raw.slice(0, MAX_SECTIONS).forEach((s, i) => {
    const def = SECTION_TYPES[s?.type];
    if (!def) { issues.push(`section ${i + 1}: there is no kind of section called "${s?.type}"`); return; }
    const bars = Number(s.bars);
    if (!Number.isInteger(bars) || bars % 2 || bars < def.min || bars > def.max) {
      issues.push(`section ${i + 1} (${def.label}) is ${def.min}–${def.max} bars in twos, not ${s.bars}`);
      return;
    }
    const out = { type: s.type, bars };
    if (typeof s.id === 'string' && s.id.length && s.id.length <= 160) out.id = s.id;
    if (out.id && sections.some(x => x.id === out.id)) issues.push(`section ${i + 1}: duplicate identity`);
    if (typeof s.label === 'string' && s.label.trim()) out.label = s.label.trim().slice(0, 24);
    if (s.energy != null) {
      const e = Number(s.energy);
      if (Number.isFinite(e) && e >= 0 && e <= 1) out.energy = Math.round(e * 100) / 100;
      else issues.push(`section ${i + 1}: energy is 0–1, not ${s.energy}`);
    }
    if (s.lift) out.lift = true;
    if (s.variant != null) {
      if ((def.variants || []).some(([id]) => id === s.variant)) out.variant = s.variant;
      else issues.push(`section ${i + 1} (${def.label}) has no "${s.variant}"`);
    }
    if (typeof s.role === 'string' && roleFits(s.role, s.type)) out.role = s.role;
    sections.push(out);
  });
  if (sections.length && !sections.some((s) => SECTION_TYPES[s.type].hook || s.type === 'groove')) {
    issues.push('a form needs a chorus, a drop or a groove — somewhere the hook plays');
  }
  return { sections: issues.length ? null : sections, issues };
}
