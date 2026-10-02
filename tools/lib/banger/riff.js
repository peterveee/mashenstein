// MAKE A BANGER — the riff: what the selected bars play, read off the song as it is
// HEARD, written down in the remix shorthand so the banger file can carry it.
//
// The desk reads it from its live draft (unsaved edits included) and the audition tool
// from a song file; both come through `extractRiff`, so there is one answer to "what is
// in bars 9–12". Browser-safe: no `node:*` imports.
//
// THE SHAPE, as stored in a banger's `export const banger = { riff }`:
//
//   { version: 1, source: { id, title, from, to, bpm }, bars: 4, grid: 16,
//     parts: [{ key, label, kind, role, voice, voiceParams, engineKeys, strip,
//               bars: ['D5:2 . F5:2 …', …] }],     // drum bars as 'x...x...'
//     stats: { quantised, detuned, transposed } }
//
// `from`/`to` are 0-based bar indices, inclusive. Parts are the lanes that sound in
// those bars; `kind` is melodic | chord | drum | gesture and `role` is hook | bass |
// chords | counter | drum | gesture.
import { readBarLane } from '../arrangement-edit.js';
import { lenKey, legacyLaneLength } from '../../../src/engine/lanes.js';
import {
  baseLane, seamFor, PERCUSSION_LANES, CHORD_LANES, MONO_LANES, VOICES, defaultAddedVoice,
} from '../../../src/data/voices.js';
import { L, P, partToL, partToP, midi, nameOf, clampMidi, blank } from './theory.js';
import { BANGER_LIMITS } from './options.js';

export const RIFF_VERSION = 1;

/**
 * The sound a lane makes, as a banger needs to carry it: a library preset id, a song's
 * own preset copy (`params`), or neither — the lane's hand-written engine body.
 * The same precedence as the desk's `laneVoiceId`: the song's copy, then the mix's
 * choice, then the composition's, then the starter an added track plays.
 */
export function laneVoiceOf(bank, mix, key) {
  const seam = seamFor(key);
  if (!seam) return { id: null, params: null };
  const vk = seam.voiceKey;
  const params = mix?.voiceParams?.[vk];
  if (params) return { id: null, params: structuredClone(params) };
  const chosen = mix?.voice?.[vk] ?? bank?.[vk];
  if (chosen) return { id: chosen, params: null };
  const independent = (mix?.layers || []).some((l) => l.key === key && l.independent);
  if (independent) return { id: defaultAddedVoice(key), params: null };
  return { id: null, params: null };
}

/**
 * The bank keys a lane's ENGINE body reads (`leadType`, `bassGain` …) — carried with
 * a riff part that has no preset, so it can sound the same on the banger's own lane.
 */
function engineKeysOf(bank, key) {
  const base = baseLane(key);
  if (base !== key || !bank) return null;
  const out = {};
  const re = new RegExp(`^${base}[A-Z]`);
  for (const [k, v] of Object.entries(bank)) {
    if (k === `${base}Voice` || k === lenKey(base)) continue;
    if (re.test(k) && ['number', 'string', 'boolean'].includes(typeof v)) out[k] = v;
  }
  return Object.keys(out).length ? out : null;
}

const semitoneOf = (hz) => 12 * Math.log2(hz / 440) + 69;

/**
 * The riff in bars `from`–`to` (0-based, inclusive).
 *
 *   bank      the bank as the desk plays it — deskBank(track.bank, mix)
 *   draft     the arrangement draft — draftOf(bank, arrangement)
 *   mix       the song's mix entry (voices, layers, strips)
 *   laneKeys  the lanes to look at — laneList(bank).map((l) => l.key)
 *   source    { id, title }
 *   heard     (key) => boolean — false for a lane muted or soloed out on the desk
 *   labelFor  (key) => string|null — what the desk calls the lane
 */
export function extractRiff({
  bank, draft, mix = null, from, to, laneKeys, source = {}, heard = () => true, labelFor = () => null,
}) {
  const bars = to - from + 1;
  const stats = { quantised: 0, detuned: 0, transposed: 0 };
  const layers = new Map((mix?.layers || []).map((l) => [l.key, l]));
  const parts = [];
  for (const key of laneKeys) {
    const seam = seamFor(key);
    if (!seam || !heard(key)) continue;
    if ((mix?.off || []).includes(key)) continue;
    const base = baseLane(key);
    const layer = layers.get(key);
    // A linked layer's own read can be stale — arrangement deltas never pass through
    // deskBank — so it is read where its notes really are: its source lane.
    const readKey = layer && !layer.independent ? layer.from : key;
    const drum = PERCUSSION_LANES.includes(base);
    const gesture = MONO_LANES.includes(base);
    let fallbackLen = 1;
    try { fallbackLen = legacyLaneLength(bank, key) ?? 1; } catch { fallbackLen = 1; }
    const out = [];
    let notes = 0;
    let poly = 0;
    let pitchSum = 0;
    for (let b = from; b <= to; b++) {
      const plan = draft?.plan?.[b];
      const silent = !plan || (plan.off || []).includes(key) || (plan.delete || []).includes(key);
      const raw = silent ? [] : readBarLane(bank, draft, b, readKey);
      const lens = silent ? [] : readBarLane(bank, draft, b, lenKey(readKey));
      const slots = raw.length || 16;
      const ratio = 16 / slots;
      const t = plan?.transpose;
      const semis = drum ? 0 : (typeof t === 'number' ? t : (t?.[key] ?? t?.all ?? 0)) || 0;
      if (semis) stats.transposed++;
      if (drum) {
        const part = Array(16).fill(false);
        raw.forEach((v, i) => {
          if (!v) return;
          const at = i * ratio;
          if (!Number.isInteger(at)) stats.quantised++;
          const step = Math.min(15, Math.round(at));
          part[step] = true;
          notes++;
        });
        out.push(part);
        continue;
      }
      const part = blank();
      raw.forEach((v, i) => {
        if (v == null || (Array.isArray(v) && !v.length)) return;
        const at = i * ratio;
        if (!Number.isInteger(at)) stats.quantised++;
        const step = Math.round(at);
        if (step > 15 || part.notes[step] != null) return;
        const name = (hz) => {
          const exact = semitoneOf(hz) + semis;
          if (Math.abs(exact - Math.round(exact)) > 0.086) stats.detuned++;
          return nameOf(clampMidi(Math.round(exact)));
        };
        const value = Array.isArray(v)
          ? [...new Set(v.filter((hz) => hz > 0).map(name))]
          : (v > 0 ? name(v) : null);
        if (value == null || (Array.isArray(value) && !value.length)) return;
        part.notes[step] = Array.isArray(value) && value.length === 1 ? value[0] : value;
        const len = lens[i];
        const one = Array.isArray(len) ? Math.max(...len.filter((x) => x > 0), 0) : len;
        part.lens[step] = Number((((one > 0 ? one : fallbackLen)) * ratio).toFixed(4));
        notes++;
        if (Array.isArray(part.notes[step])) poly++;
        const names = Array.isArray(part.notes[step]) ? part.notes[step] : [part.notes[step]];
        pitchSum += names.reduce((s, x) => s + midi(x), 0) / names.length;
      });
      out.push(part);
    }
    if (!notes) continue;
    const kind = drum ? 'drum' : gesture ? 'gesture'
      : (CHORD_LANES.includes(base) || poly / notes >= 0.25) ? 'chord' : 'melodic';
    const meanPitch = drum ? null : pitchSum / notes;
    const voice = laneVoiceOf(bank, mix, key);
    const strip = { ...(mix?.lanes?.[key] || {}) };
    for (const k of ['gain', 'mute', 'solo', 'muted', 'soloed']) delete strip[k];
    const preset = voice.id ? VOICES[voice.id] : null;
    parts.push({
      key,
      label: labelFor(key) || preset?.label || voice.params?.label || seam.label || key,
      kind,
      role: drum ? 'drum' : gesture ? 'gesture' : kind === 'chord' ? 'chords'
        : (base === 'bass' || meanPitch < 52) ? 'bass' : 'counter',
      voice: voice.id,
      voiceParams: voice.params,
      engineKeys: (!voice.id && !voice.params) || preset?.kind === 'engine' ? engineKeysOf(bank, key) : null,
      strip: Object.keys(strip).length ? strip : null,
      meanPitch,
      bars: out.map((p) => (drum ? partToP(p) : partToL(p))),
    });
  }
  const riff = {
    version: RIFF_VERSION,
    source: { id: source.id ?? null, title: source.title ?? null, from, to, bpm: bank?.bpm ?? null },
    bars,
    grid: 16,
    parts,
    stats,
  };
  const hook = pickHook(riff);
  if (hook) for (const p of riff.parts) if (p.key === hook) p.role = 'hook';
  return riff;
}

/** The part that carries the tune — the one every drop is built around. */
export function pickHook(riff, wanted = 'auto') {
  const melodic = riff.parts.filter((p) => p.kind === 'melodic' || p.kind === 'chord');
  if (wanted && wanted !== 'auto' && melodic.some((p) => p.key === wanted)) return wanted;
  let best = null;
  for (const p of melodic) {
    const parsed = p.bars.map((s) => L(s));
    const names = parsed.flatMap((b) => b.notes.filter((v) => v != null).map((v) => (Array.isArray(v) ? v[v.length - 1] : v)));
    if (!names.length) continue;
    const distinct = new Set(names).size;
    const mean = names.reduce((s, x) => s + midi(x), 0) / names.length;
    const score = 2 * distinct + Math.min(names.length, 16) / 4 + (mean >= 60 ? 2 : 0)
      + (baseLane(p.key) === 'lead' ? 1.5 : 0) - (p.kind === 'chord' ? 3 : 0) - (mean < 52 ? 4 : 0);
    if (!best || score > best.score) best = { key: p.key, score };
  }
  return best?.key ?? null;
}

/** Everything wrong with a riff, as sentences. Empty means a banger can be made from it. */
export function validateRiff(riff) {
  const issues = [];
  if (!riff || typeof riff !== 'object') return ['there is no riff'];
  if (!Number.isInteger(riff.bars) || riff.bars < 1) issues.push('a riff is at least one bar');
  else if (riff.bars > BANGER_LIMITS.maxRiffBars) issues.push(`a riff is at most ${BANGER_LIMITS.maxRiffBars} bars — pick a shorter stretch`);
  const parts = Array.isArray(riff.parts) ? riff.parts : [];
  if (!parts.length) issues.push('nothing plays in those bars');
  else if (!parts.some((p) => p.kind === 'melodic' || p.kind === 'chord')) {
    issues.push('those bars are only drums — a banger needs a tune to build on');
  }
  for (const p of parts) {
    if (!p || typeof p.key !== 'string' || !seamFor(p.key)) { issues.push(`"${p?.key}" is not a lane`); continue; }
    if (!Array.isArray(p.bars) || p.bars.length !== riff.bars) { issues.push(`${p.key} does not have ${riff.bars} bars`); continue; }
    try { for (const s of p.bars) (p.kind === 'drum' ? P : L)(s); } catch (err) { issues.push(`${p.key}: ${err.message}`); }
  }
  return issues;
}

/** The riff's parts with their bars parsed back into parts. */
export function parseRiff(riff) {
  return riff.parts.map((p) => ({ ...p, parsed: p.bars.map((s) => (p.kind === 'drum' ? P(s) : L(s))) }));
}

/** One line for the dialog: what the riff is. */
export function riffSummary(riff) {
  const hook = riff.parts.find((p) => p.role === 'hook');
  return {
    bars: riff.bars,
    parts: riff.parts.length,
    hook: hook?.key ?? null,
    hookLabel: hook?.label ?? null,
    drums: riff.parts.filter((p) => p.kind === 'drum').length,
    quantised: riff.stats?.quantised || 0,
    detuned: riff.stats?.detuned || 0,
  };
}
