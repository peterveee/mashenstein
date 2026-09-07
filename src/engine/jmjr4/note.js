/*
 * JMJR-4 — one sung note: the syllable compiled, the singers built, the envelope, the
 * scoop, the morph, the hum, the ending consonant.
 *
 * The rack is the note engine: it decides poly/mono/legato, holds notes for the desk
 * keyboard, owns the vibrato LFO and the lane's chorus. This file builds exactly what one
 * key press at one pitch is, and hands back the handles the rack needs to release it.
 */
import { renderIr } from './dsp.js';
import { syllable, onsetSeconds } from './syll.js';

/** The most singers a key can have. The 4 in the name. */
export const JMJR4_MAX_UNISON = 4;
/** The M anti-resonator's place, the one every hum and every morph to MMM reaches. */
export const HUM_PLACE = 1000;
/** How long a note with no known length is compiled for: the rack's own backstop for a
 * held note nobody released (voices.js HOLD_SECONDS), so a key held past it goes quiet
 * rather than ringing until the context dies. Breakpoints only, so the length is free. */
export const HOLD_SECONDS = 30;

/**
 * Up to four singers on one key, each a different person: its own detune (cents, before
 * SPREAD scales it), its own tract size, its own pressure offset, its own noise seed.
 */
/**
 * The UNISON sources of one key: a detune in cents (scaled by SPREAD/20 by the rack) and an
 * open-quotient offset, so each source has its own pulse shape as well as its own pitch.
 * They share the key's tract — see renderIr's `unison`. The per-source tract scale the
 * prototype had (each singer a whole tract of its own) went with the cost: it was four
 * notes per key, and the choir it exists for missed the budget by half again.
 */
export function singerVariants(n) {
  const v = [[0, 0, 7], [-7, -0.02, 3], [6, 0.03, 11], [-3, 0.01, 5]];
  return v.slice(0, Math.max(1, Math.min(JMJR4_MAX_UNISON, n))).map(([cents, oqd, seed]) => ({ cents, oqd, seed }));
}

const firstFrame = (f) => (Array.isArray(f[0]) ? f[0] : f);

/**
 * The formant target a morph aims at, blended from the syllable's own vowel to the
 * MORPH TO vowel by `amount` (0..1), or null when there is no morph.
 */
export function morphTarget(data, baseVowel, morphTo, amount) {
  if (!(amount > 0) || !morphTo || !data.phonemes[morphTo]) return null;
  const a = firstFrame(data.phonemes[baseVowel].f);
  const b = firstFrame(data.phonemes[morphTo].f);
  return [0, 1, 2].map((i) => a[i] * (1 - amount) + b[i] * amount);
}

/** How nasal the morph position is: the base's own nasality moving to the target's. */
export function morphNasal(data, baseVowel, morphTo, amount, voiceNasal = 0) {
  const nasalOf = (v) => (data.phonemes[v]?.nasal ? 1 : 0);
  const blended = nasalOf(baseVowel) * (1 - amount) + (morphTo ? nasalOf(morphTo) : nasalOf(baseVowel)) * amount;
  return Math.max(voiceNasal, blended);
}

/**
 * Build one singer of one note.
 *
 *   at, hz, dur     when, what pitch (this singer's own, spread applied), how long; `dur`
 *                   null for a held note the rack will release itself
 *   velocity        0..1, into the glottal pressure the way a key strike is
 *   syl             { onset, vowel, ending, tie } from parseSyllable
 *   patch           compileJmjr4's patch: { ctl, amp, morph, bend, bendTime, nasal, … }
 *   variant         one of singerVariants(), with cents already scaled by SPREAD
 *   dest            where the singer's signal goes (the note's summing point)
 *   flutterSource   the note-on's shared flutter sines, or null
 *   glideFrom       Hz the pitch glides in from over `glideTime` (mono/legato), or null
 *   onsetSilent     true when the previous step tied its vowel over: no onset consonant
 *   noAttack        true for a legato note: the envelope starts at its sustain level, so the
 *                   note continues the one before it rather than striking again
 *
 * Returns { handle, ending, env, oscs, sources, end, release, stopSources } — `handle` is
 * renderIr's, with retarget/nasalise/release for the rack's live morph and note-off, and
 * `stopSources` is the only safe way to stop the lot at once.
 */
export function buildJmjr4Note(ctx, {
  data, at, hz, dur = null, velocity = 0.8, syl, patch, variants = null, dest,
  flutterSource = null, glideFrom = null, glideTime = 0, onsetSilent = false, noAttack = false,
}) {
  const amp = patch.amp;
  const sources = variants?.length ? variants : singerVariants(1);
  const variant = sources[0];
  const oqAt = (d) => Math.min(0.75, Math.max(0.3, (patch.ctl.oq ?? 0.5) * (1 - 0.3 * (velocity - 0.6)) + (d || 0)));
  const ctl = Object.assign({}, patch.ctl, {
    oq: oqAt(variant.oqd),
    seed: (variant.seed || 7) + (Math.round(hz * 31) % 997),
  });
  const unison = sources.map((s) => ({ ratio: Math.pow(2, (s.cents || 0) / 1200), oq: oqAt(s.oqd) }));
  const rel = Math.max(0.003, amp.release);
  const hold = dur != null ? Math.max(0.05, dur) + rel + 0.05 : HOLD_SECONDS;
  const onset = onsetSilent ? [] : syl.onset;
  const vowel = syl.vowel;
  const isNasalVowel = !!data.phonemes[vowel]?.nasal;

  // MORPH: with MORPH TIME the note starts on its own vowel and glides to the target after
  // the onset; without it, it sits at the target from the first sample, which is a compile
  // with the target's formants in the vowel's place.
  const target = patch.morph?.target || null;
  const sweep = !!target && (patch.morph.time || 0) > 0;
  const voiceNasal = patch.nasal || 0;
  const baseNasal = Math.max(voiceNasal, isNasalVowel ? 1 : 0);
  const targetNasal = target ? Math.max(voiceNasal, patch.morph.nasal ?? 0) : baseNasal;
  // A live hum is compiled at the vowels' amplitude: the phoneme table's amp 0.22 is for an
  // M as a consonant, and the murmur is levelled by its own path.
  const override = target && !sweep ? { f: target, amp: 1 } : isNasalVowel ? { amp: 1 } : null;
  const ir = syllable(data, { onset, vowel, ending: [], hz, hold, ctl, vowelOverride: override });

  // per-note ADSR in front of the destination: attack to 1, decay towards sustain, held
  // there; the release is the phrase gate's own fade (handle.release)
  const atk = Math.max(0.003, amp.attack);
  const dec = Math.max(0.003, amp.decay);
  const sus = Math.min(1, Math.max(0, amp.sustain ?? 1));
  const env = ctx.createGain();
  if (noAttack) {
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(Math.max(sus, 1e-4), at + 0.012);
  } else {
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(1, at + atk);
    if (sus < 1) env.gain.setTargetAtTime(Math.max(sus, 1e-4), at + atk, dec / 4);
  }
  env.connect(dest);

  // The nasal path (two IIR nodes and a pole per place) is built only when this note can
  // reach it: a hum, a nasal voice, or a morph towards MMM. Phase 0 measured it at ~5 ms of
  // main-thread build per note-on when built unconditionally.
  const needsNasal = baseNasal > 0 || targetNasal > 0 || isNasalVowel;
  const handle = renderIr(ctx, ir, {
    start: at, destination: env, nasalPlaces: needsNasal ? [HUM_PLACE] : [], flutterSource, unison,
  });
  const compiledNasal = isNasalVowel ? 1 : 0;
  if (!sweep && targetNasal !== compiledNasal) handle.nasalise(HUM_PLACE, targetNasal, at + 0.001, 0.002);

  // GLIDE from the key before wins over BEND; BEND is the scoop a singer takes into a note
  // each source lands on its own detune (jmjr4Ratio), or a glide would fold the unison
  if (glideFrom && glideTime > 0) {
    for (const o of handle.oscs) {
      const r = o.jmjr4Ratio ?? 1;
      o.frequency.cancelScheduledValues(at);
      o.frequency.setValueAtTime(Math.max(1, glideFrom * r), at);
      o.frequency.exponentialRampToValueAtTime(hz * r, at + glideTime);
    }
  } else if ((patch.bend || 0) !== 0 && (patch.bendTime || 0) > 0) {
    for (const o of handle.oscs) {
      const r = o.jmjr4Ratio ?? 1;
      o.frequency.cancelScheduledValues(at);
      o.frequency.setValueAtTime(hz * r * Math.pow(2, patch.bend / 12), at);
      o.frequency.exponentialRampToValueAtTime(hz * r, at + patch.bendTime);
    }
  }
  if (sweep) {
    const t = at + onsetSeconds(data, onset) + 0.02;
    handle.retarget(target, t, 0, patch.morph.time);
    handle.nasalise(HUM_PLACE, targetNasal, t, 0, patch.morph.time);
  }

  // The ending consonant, when the note's length is known: compiled from the vowel it
  // leaves, at the moment the note ends, so a "dum" closes on its M.
  let ending = null;
  if (dur != null && syl.ending?.length) {
    const eir = syllable(data, { onset: [], vowel, ending: syl.ending, hz, hold: 0.05, ctl });
    ending = renderIr(ctx, eir, { start: at + Math.max(0.05, dur), destination: env, nasalPlaces: [] });
  }

  return {
    handle,
    ending,
    env,
    oscs: handle.oscs,
    sources: ending ? [...handle.sources, ...ending.sources] : handle.sources,
    end: dur != null ? at + Math.max(0.05, dur) + rel + 0.05 : at + hold,
    release(t) { handle.release(t, rel); if (ending) ending.stop(t + rel + 0.02); },
    /*
     * Stop every source of this note at `t` — through the HANDLES, never by walking the raw
     * list. A note's sources are not all booked to the same end any more: the aspiration
     * noise stops when the breath does, the bursts and the voice bar stop when they are
     * over, and the spec's rule is that the last stop() wins, so calling stop() on the raw
     * node at the note's tail would UN-STOP the ones that had already finished and run them
     * for the whole note. `handle.stop` goes through `cut`, which only ever moves a stop
     * earlier. The rack's held-note record carries this so its release and its panic have
     * one thing to call. See dsp.js's `ends`/`cut`.
     */
    stopSources(t) { handle.stop(t); if (ending) ending.stop(t); },
  };
}
