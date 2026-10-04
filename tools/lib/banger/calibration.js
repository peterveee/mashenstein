// Browser-safe lookup for the offline phrase measurements. No rendering at generation time.
import { baseLane, VOICES } from '../../../src/data/voices.js';
import { midi } from './theory.js';
export const CALIBRATION_VERSION = 1;
export const canonical = value => JSON.stringify(value, (key, v) => v && typeof v === 'object' && !Array.isArray(v)
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
export function fingerprint(value) {
  const s = canonical(value); let a = 2166136261, b = 5381;
  for (let i = 0; i < s.length; i++) { a = Math.imul(a ^ s.charCodeAt(i), 16777619); b = Math.imul(b, 33) ^ s.charCodeAt(i); }
  return `${(a >>> 0).toString(36)}-${(b >>> 0).toString(36)}-${s.length}`;
}
export function measurementStrip(strip = {}) {
  const out = { ...strip, gain: 0 };
  for (const k of ['mute', 'solo', 'muted', 'soloed']) delete out[k];
  return out;
}
export const profileKey = ({ voice, lane, strip, fx, curve }) => fingerprint({ version: CALIBRATION_VERSION,
  voice, lane: baseLane(lane), strip: measurementStrip(strip), fx: fx || {}, curve: curve || null });
export const referenceKey = ref => fingerprint({ ref, voice: VOICES[ref.voice?.id] || null });

// Mean pitch, log duration, log onset rate and simultaneous note count. Silence is
// excluded from the rate: a verse with rests should not have its notes boosted.
export function phraseFeatures(bars, bpm) {
  let pitch = 0, notes = 0, seconds = 0, events = 0, activeSteps = 0;
  for (const bar of bars) {
    if (!bar || Array.isArray(bar)) continue;
    const occupied = new Set();
    bar.notes.forEach((v, i) => {
      if (v == null) return;
      const ns = Array.isArray(v) ? v : [v];
      const len = Number(bar.lens?.[i]) > 0 ? Number(bar.lens[i]) : 1;
      for (const n of ns) { pitch += midi(n); notes++; }
      seconds += len * 15 / bpm; events++;
      for (let j = i; j < Math.min(16, i + len); j++) occupied.add(j);
    });
    activeSteps += occupied.size;
  }
  return events ? [pitch / notes, Math.log2(seconds / events),
    Math.log2(events / Math.max(activeSteps * 15 / bpm, 0.01)), notes / events] : null;
}
export function interpolateProfile(profile, features) {
  if (!profile?.validated || !features) return null;
  const scales = [12, 1.5, 1.5, 1];
  const ranked = profile.samples.map(s => ({ ...s, distance: Math.sqrt(features.reduce((sum, x, i) =>
    sum + ((x - s.features[i]) / scales[i]) ** 2, 0)) })).sort((a, b) => a.distance - b.distance).slice(0, 4);
  if (!ranked.length || ranked[0].distance > 2) return null; // don't extrapolate far outside the bench
  const exact = ranked[0].distance < 1e-6;
  const picked = exact ? ranked.slice(0, 1) : ranked;
  let weight = 0, residual = 0;
  for (const s of picked) { const w = 1 / Math.max(0.01, s.distance ** 2); weight += w; residual += w * s.residual; }
  return { residual: residual / weight, peakDb: Math.max(...picked.map(s => s.peakDb)), distance: ranked[0].distance };
}
export function measuredPart({ data, voice, lane, strip, fx, curve, bars, bpm, predicted }) {
  if (data?.version !== CALIBRATION_VERSION || !Number.isFinite(predicted)) return null;
  const profile = data.profiles[profileKey({ voice, lane, strip, fx, curve })];
  const estimate = interpolateProfile(profile, phraseFeatures(bars, bpm));
  return estimate ? { ...estimate, lufs: predicted + estimate.residual } : null;
}
