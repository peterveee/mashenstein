// MAKE A BANGER — the joins between sections, for every form but Club (whose builds,
// stops and risers are its own, in sections.js).
//
// Each boundary is chosen by how much the ENERGY changes across it (form-types.js):
//
//   a big rise into a chorus or drop   a riser, and one of: the beat dropping out for the
//                                      last two beats, stop-time on the last beat, the
//                                      mix stuttering, or — into the final chorus — the
//                                      pause; and a pickup in the hook leading in
//   a smaller rise into one            a fill, and the pickup
//   a rise into anything else          a fill
//   level                              a fill (a groove's own phrases already have them)
//   a fall                             an echo thrown off the hook's last note, or the
//                                      last bar at half time
//
// The existing switches still say yes or no: Fills, Riser, Hard Stop, Stutter, Delay
// Throws. Every move is recorded in `events.transitions` — the tests and the song's note
// read them. Browser-safe.
import { P, cut, blank, isDrumPart, nameOf, midi, chordSym, grindOf, parseChord } from './theory.js';
import { pitchesOf } from './cohesion.js';

export const TRANSITIONS = Object.freeze({
  fill: 'Fill', riser: 'Riser', dropout: 'Drop-Out', stopTime: 'Stop-Time', stutter: 'Stutter',
  pause: 'The Pause', pickup: 'Pickup', throw: 'Delay Throw', halfTimeBar: 'Half-Time Bar',
});
const DRUM_ROLES = ['kick', 'clap', 'snare', 'hats', 'ohats', 'fill', 'shaker', 'tambourine', 'congas', 'cowbell', 'ride'];

/** The parts that hold a bar's harmony, and its bass. */
const HARMONY_ROLES = ['pad', 'saws', 'piano', 'choir', 'chords'];
const pcOf = (m) => ((m % 12) + 12) % 12;

/**
 * The chord sounding at `step` of a bar, read off its harmony parts — the triad (and seventh) that
 * takes in most of what is held, on the bass's note where it can — or null where none is clear.
 */
function chordUnder(bar, step) {
  const held = new Set();
  const sounding = (part) => {
    let at = null;
    part.notes.forEach((v, i) => { if (v != null && i <= step && i + (part.lens[i] ?? 1) > step) at = v; });
    return at == null ? [] : [].concat(at).map(midi);
  };
  for (const role of HARMONY_ROLES) if (bar[role] && !isDrumPart(bar[role])) sounding(bar[role]).forEach((m) => held.add(pcOf(m)));
  const bass = bar.bass && !isDrumPart(bar.bass) ? sounding(bar.bass).map(pcOf) : [];
  // A root with its third, and its fifth, its seventh or the bass under it (a V7 often drops its fifth).
  let best = null;
  for (let r = 0; r < 12; r++) {
    const third = held.has((r + 4) % 12) ? 4 : held.has((r + 3) % 12) ? 3 : null;
    if (third == null || !(held.has(r) || bass.includes(r))) continue;
    const seventh = held.has((r + 11) % 12) ? 11 : held.has((r + 10) % 12) ? 10 : null;
    if (!held.has((r + 7) % 12) && seventh == null && !bass.includes(r)) continue;
    const score = [r, r + third, r + 7, seventh == null ? null : r + seventh].filter((x) => x != null && held.has(x % 12)).length
      + (bass.includes(r) ? 0.5 : 0);
    if (!best || score > best.score) best = { r, third, seventh, score };
  }
  if (!best) return null;
  const quality = best.third === 4 ? (best.seventh === 11 ? 'maj7' : best.seventh === 10 ? '7' : '')
    : (best.seventh === 11 ? 'mmaj7' : best.seventh === 10 ? 'm7' : 'm');
  return chordSym(best.r, quality);
}

/** Any part — notes or drums — silenced from `step` on. */
function cutAny(part, step) {
  if (!part) return part;
  if (isDrumPart(part)) return part.map((v, i) => (i < step ? v : false));
  return cut(part, step);
}

/**
 * Plan and write the joins of `form` into `bars` (roles per bar) and `events`. `D` is the
 * style's drums, `rng` the song's `transitions` stream, `options` the request.
 */
export function planTransitions({ form, bars, events, options, D, rng, fillPick, scale }) {
  events.transitions = [];
  const pick = (list) => list[Math.floor(rng.next() * list.length)];
  for (let si = 0; si < form.length - 1; si++) {
    const cur = form[si];
    const next = form[si + 1];
    if (cur.bars < 2) continue;
    const last = cur.to - 1;
    const bar = bars[last];
    const delta = (next.energy ?? 0.5) - (cur.energy ?? 0.5);
    const moves = [];
    const intoHook = !!next.hook && next.role !== cur.role;
    // A false ending, a build and a groove's dip bring their own run-ups.
    const ownRunUp = cur.role === 'false' || cur.type === 'build';

    const fill = () => {
      if (!options.drums.fills || bar.fill) return;
      const f = fillPick();
      bar.snare = P(f.snare);
      bar.fill = P(f.tom);
      moves.push('fill');
    };
    const pickup = () => {
      // The hook's first note, walked up to from two steps below on the last two sixteenths —
      // only where the hook is not already playing then. A step is a note of the scale or of the
      // chord sounding there that does not grind on that chord (6 Oct 2026): into A over E major
      // the walk is E, G# rather than F, G.
      const first = bars[next.from - 1]?.hook;
      const target = first && pitchesOf(first)[0];
      if (!target || (bar.hook && bar.hook.notes.slice(12).some((v) => v != null))) return;
      const out = bar.hook ? { notes: [...bar.hook.notes], lens: [...bar.hook.lens] } : blank();
      const below = (m, step) => {
        let x = m - 1;
        while (x > m - 4 && !scale.includes(pcOf(x))) x--;
        const sym = chordUnder(bar, step);
        if (!sym || grindOf(pcOf(x), sym) === 0) return x;
        const { pcs } = parseChord(sym);
        for (let y = m - 1; y > m - 6; y--) if ((scale.includes(pcOf(y)) || pcs.includes(pcOf(y))) && grindOf(pcOf(y), sym) === 0) return y;
        return x;
      };
      const second = below(target, 15);
      out.notes[14] = nameOf(below(second, 14)); out.lens[14] = 1;
      out.notes[15] = nameOf(second); out.lens[15] = 1;
      bar.hook = out;
      moves.push('pickup');
    };

    if (intoHook && delta >= 0.15 && !ownRunUp) {
      if (options.fx.riser && !bars[last - 1]?.riser) {
        bars[last - 1].riser = P(D.crash);
        events.risers.push(last);
        moves.push('riser');
      }
      const finalIn = next.final && next.lifted;
      const choices = ['dropout', 'dropout'];
      if (options.form.hardStop) choices.push('stopTime');
      if (options.fx.stutter) choices.push('stutter');
      if (finalIn && options.form.hardStop) choices.push('pause', 'pause');
      const move = pick(choices);
      if (move === 'dropout') {
        for (const role of ['kick', 'bass', 'sub', 'clap']) if (bar[role]) bar[role] = cutAny(bar[role], 8);
      } else if (move === 'stopTime' || move === 'pause') {
        const at = move === 'pause' ? 8 : 12;
        for (const role of Object.keys(bar)) if (role !== 'riser') bar[role] = cutAny(bar[role], at);
        events.stops.push({ bar: last + 1, step: at });
      } else if (move === 'stutter') {
        events.builds.push({ from: cur.to, to: cur.to, intoDrop: true, short: true });
      }
      moves.push(move);
      pickup();
    } else if (intoHook && delta > 0 && !ownRunUp) {
      fill();
      pickup();
    } else if (delta > -0.1 && !ownRunUp && cur.type !== 'groove') {
      fill();
    } else if (delta <= -0.1) {
      const hookNow = bar.hook;
      let at = -1;
      if (hookNow) for (let s = 15; s >= 0; s--) if (hookNow.notes[s] != null) { at = s; break; }
      if (options.fx.delayThrows && at >= 0 && rng.next() < 0.6) {
        events.throws.push({ bar: last + 1, step: at });
        moves.push('throw');
      } else if (bar.kick) {
        bar.kick = P(D.halfKick);
        if (bar.clap) bar.clap = P(D.halfClap);
        delete bar.ohats;
        for (const role of DRUM_ROLES.slice(5)) delete bar[role];
        moves.push('halfTimeBar');
      }
    }
    if (moves.length) events.transitions.push({ bar: cur.to, from: cur.label, to: next.label, delta: Math.round(delta * 100) / 100, moves });
  }
}
