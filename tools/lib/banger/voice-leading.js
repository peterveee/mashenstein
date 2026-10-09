// MAKE A BANGER — voice leading: the chord parts' coloured chords, each voiced to move least from
// the one before (7 Oct 2026, generator v9).
//
// theory.js `voicing` places every chord on its own: the close inversion whose average sits nearest
// the part's centre. For a triad that is already what a player would do (C E G → B D G). For the
// coloured chords — add9, maj7, m7, m9 — it is not: it stacks them into semitone clusters (B3 C4
// under a Cmaj7, F#4 G4 under a Gmaj7) and flips inversion from one chord to the next. Peter heard
// three ways of the same drops (work/auditions/voice-leading/) and chose this one.
//
// So, after every bar is written, each coloured chord on the saws, pad, piano and choir is
// re-voiced: of the close inversions within BAND semitones of the part's centre (lifted with its
// section), only those with the fewest neighbouring semitones, and of those the one that moves
// least from the chord before (a little pull back toward the centre breaking ties). Triads and
// open voicings (an octave or more across — the breakdown's) stay as they were placed.
//
// A run starts afresh — nearest the centre — at each section and at every repeat of its
// progression, so a loop plays the same each time round and nothing before a section reaches into
// it. The hook as written on the breakdown piano (`asWritten`) is the riff's own notes and is never
// touched.
//
// Browser-safe: no `node:*` imports.
import { midi, nameOf, isDrumPart } from './theory.js';

/** The roles whose chords are voice-led — the chord parts the generator voices itself. */
export const VOICE_LED_ROLES = Object.freeze(['saws', 'pad', 'piano', 'choir']);
/** How far, in semitones, a voiced chord's average may sit from its part's centre. */
const BAND = 4;
/** Motion is the measure; this much of the distance from the centre breaks ties. */
const PULL = 0.25;

const avg = (n) => n.reduce((a, b) => a + b, 0) / n.length;
/** Neighbouring notes a semitone apart. */
const clusters = (n) => n.slice(1).filter((m, i) => m - n[i] === 1).length;

/** Semitones moved between two voicings: voice by voice when they have as many notes, else each note to its nearest. */
function motion(from, to) {
  if (from.length === to.length) return from.reduce((s, m, i) => s + Math.abs(m - to[i]), 0);
  const near = (x, set) => Math.min(...set.map((s) => Math.abs(s - x)));
  return (to.reduce((s, m) => s + near(m, from), 0) + from.reduce((s, m) => s + near(m, to), 0)) / 2;
}

function isPlainTriad(pcs) {
  if (pcs.length !== 3) return false;
  return pcs.some((r) => {
    const iv = pcs.map((p) => (p - r + 12) % 12).sort((a, b) => a - b).join();
    return iv === '0,4,7' || iv === '0,3,7';
  });
}

/** Every close-position voicing of a set of pitch classes — each rotation, stacked inside an octave, at every octave. */
function closeVoicings(pcs) {
  const out = [];
  for (let r = 0; r < pcs.length; r++) {
    const rot = [...pcs.slice(r), ...pcs.slice(0, r)];
    for (let oct = 1; oct <= 7; oct++) {
      const notes = [rot[0] + 12 * oct];
      let m = notes[0];
      for (const pc of rot.slice(1)) {
        m += 1;
        while (m % 12 !== pc) m++;
        notes.push(m);
      }
      out.push(notes);
    }
  }
  return out;
}

/**
 * The voicing of `pcs` (sorted pitch classes) a coloured chord takes after `prev` (midi notes, or
 * null to start a run), near `centre` (midi). Null when no close voicing sits within the band.
 */
export function leadVoicing(pcs, centre, prev) {
  const band = closeVoicings(pcs).filter((n) => Math.abs(avg(n) - centre) <= BAND);
  if (!band.length) return null;
  const fewest = Math.min(...band.map(clusters));
  let best = null;
  for (const n of band) {
    if (clusters(n) > fewest) continue;
    const off = Math.abs(avg(n) - centre);
    const score = prev ? motion(prev, n) + PULL * off : off;
    if (!best || score < best.score) best = { notes: n, score };
  }
  return best.notes;
}

const chordsIn = (part) => (part && !isDrumPart(part) ? part.notes.filter((v) => Array.isArray(v) && v.length >= 3) : []);
const pcsOf = (notes) => [...new Set(notes.map((m) => ((m % 12) + 12) % 12))].sort((a, b) => a - b);

/**
 * The bars a run starts afresh on (1-based): each section's first bar, then every repeat of its
 * progression — the shortest period (1, 2, 4 or 8 bars) the role's chords repeat at in it.
 */
function restartsOf(bars, form, role) {
  const sig = (bar1) => chordsIn(bars[bar1 - 1]?.[role]).map((v) => pcsOf(v.map(midi)).join(',')).join('|');
  const out = new Set();
  for (const f of form) {
    const period = [1, 2, 4, 8].find((p) => {
      for (let b = f.from; b + p <= f.to; b++) if (sig(b) !== sig(b + p)) return false;
      return true;
    }) || 8;
    for (let b = f.from; b <= f.to; b += period) out.add(b);
  }
  return out;
}

/**
 * Voice-lead the coloured chords of the finished bars, in place. `centres` is the recipe's;
 * `liftOf(bar1)` the semitones a bar's section is lifted by; `asWritten` holds `${bar0}:${role}`
 * for a chord part playing the riff as written. Returns how many chords were re-voiced.
 */
export function voiceLeadChords(bars, form, { centres, liftOf = () => 0, asWritten = new Set(), fixed = [] } = {}) {
  let moved = 0;
  for (const role of VOICE_LED_ROLES) {
    if (!centres?.[role]) continue;
    // A role playing one fixed shape on purpose (Chord Memory, sections.js) is not re-voiced:
    // moving its chords to the nearest inversion is exactly what the shape is there not to do.
    if (fixed.includes(role)) continue;
    const centre = midi(centres[role]);
    const restarts = restartsOf(bars, form, role);
    let prev = null;
    for (let b = 0; b < bars.length; b++) {
      if (restarts.has(b + 1)) prev = null;
      const part = bars[b][role];
      if (!part || isDrumPart(part)) continue;
      if (asWritten.has(`${b}:${role}`)) { prev = null; continue; }
      let notesOut = null;
      for (let i = 0; i < part.notes.length; i++) {
        const v = part.notes[i];
        if (!Array.isArray(v) || v.length < 3) continue;
        const notes = v.map(midi).sort((x, y) => x - y);
        const open = notes[notes.length - 1] - notes[0] >= 12;
        const pcs = pcsOf(notes);
        const coloured = !open && pcs.length === notes.length && !isPlainTriad(pcs);
        let played = notes;
        if (coloured) {
          const led = leadVoicing(pcs, centre + liftOf(b + 1), prev);
          if (led && led.join() !== notes.join()) {
            // A bar's part may be shared with another bar (a section worked out once): copied before it changes.
            notesOut ||= [...part.notes];
            notesOut[i] = led.map(nameOf);
            played = led;
            moved++;
          }
        }
        prev = open ? null : played;
      }
      if (notesOut) bars[b][role] = { ...part, notes: notesOut };
    }
  }
  return moved;
}
