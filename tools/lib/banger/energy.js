// Arrangement density, independent of riff variation and mix loudness.
import { P, cut, diatonic, hasNotes } from './theory.js';

export const BANGER_ENERGIES = Object.freeze(['lean', 'full', 'huge', 'maximum']);
export const energyOf = (value) => BANGER_ENERGIES.includes(value) ? value : 'full';

// Keep signature replies in Lean. Huge uses percussion from each style's own kit:
// house sparkle, trance pulse, Shibuya hand percussion, electro cowbell, console ride.
const PROFILES = {
  'big-room': { perc: 'tambourine' },
  trance: { perc: 'tambourine', keep: ['arp'] },
  'future-bass': { perc: 'tambourine' },
  eurobeat: { perc: 'tambourine', keep: ['counter'] },
  shibuya: { perc: 'congas', keep: ['counter'] },
  dnb: { perc: 'shaker' },
  electro: { perc: 'cowbell' },
  megadrive: { perc: 'ride', keep: ['megaSaw'] },
  synthwave: { perc: 'tambourine', keep: ['arp'] },
  'deep-house': { perc: 'congas', keep: ['counter'] },
  'nu-disco': { perc: 'congas', keep: ['arp'] },
  downtempo: { perc: 'shaker' },
  eurodance: { perc: 'tambourine' },
  'italo-disco': { perc: 'tambourine', keep: ['arp'] },
  'electro-funk': { perc: 'cowbell', keep: ['counter'] },
  'french-house': { perc: 'shaker', keep: ['arp'] },
  reggaeton: { perc: 'congas', keep: ['counter'] },
  chipstep: { perc: 'tambourine' },
};
const DECORATION = ['square', 'bell', 'megaSaw', 'arp', 'choir', 'third', 'counter',
  'shaker', 'tambourine', 'congas', 'cowbell', 'ride'];
const DROPS = new Set(['drop', 'drop2', 'drop3', 'reprise']);

/** Applied before a section's key lift. No random draws, fader or core-part edits. */
export function arrangeEnergy({ options, style, form, scale }, sec, bars, events) {
  const energy = energyOf(options.energy);
  if (energy === 'full') return;
  const profile = PROFILES[style.id] || PROFILES[style.base] || PROFILES['big-room'];
  const from = sec.from - 1;
  if (energy === 'lean') {
    for (let b = from; b < sec.to; b++) {
      for (const role of DECORATION) if (!profile.keep?.includes(role)) delete bars[b][role];
    }
    return;
  }
  const final = sec === form.findLast((s) => DROPS.has(s.role));
  const maximum = energy === 'maximum';
  const activeDrop = maximum ? DROPS.has(sec.role) : final;
  const build = ['build', 'build2', 'preChorus'].includes(sec.role);
  if (!activeDrop && !build) return;
  const pattern = style.drums.perc?.[profile.perc];
  for (let b = from; b < sec.to; b++) {
    const i = b - from;
    // Builds acquire the extra pulse halfway through; the final chorus gets the
    // pulse first and its harmony in the second half. Earlier drops stay as written.
    if (build && i < Math.floor(sec.bars / 2)) continue;
    const stop = events.stops.find((e) => e.bar === b + 1)?.step;
    const end = stop ?? (build && b === sec.to - 1 ? 12 : 16);
    if (pattern && !hasNotes(bars[b][profile.perc])) bars[b][profile.perc] = cut(P(pattern), end);
    if (activeDrop && (maximum || i >= Math.floor(sec.bars / 2)) && hasNotes(bars[b].hook) && !hasNotes(bars[b].third)) {
      bars[b].third = cut(diatonic(bars[b].hook, -2, scale), end);
    }
  }
}
