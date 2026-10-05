// Ongoing track production, chosen after the notes and sounds, before levelling.
// Ordinary mixer inserts/sends only; no extra playback path or transition automation.
import { baseLane } from '../../../src/data/voices.js';
import { midi } from './theory.js';
import { voiceOfLane } from './expression.js';

export const TRACK_EFFECTS_VERSION = 1;
export const TRACK_EFFECTS_MODES = Object.freeze([
  { id: 'style', label: 'Keep Style', description: 'Keep the saved mixer treatments' },
  { id: 'subtle', label: 'Subtle Variation', description: 'A few gentle echoes and touches of space' },
  { id: 'adventurous', label: 'Adventurous', description: 'More character, with room for the hook' },
  { id: 'overhaul', label: 'Full Overhaul', description: 'A fuller spread of stronger treatments' },
]);
export const trackEffectsMode = value => TRACK_EFFECTS_MODES.some(x => x.id === value) ? value : 'style';
export function normaliseTrackEffects(raw) {
  const known = raw?.version === undefined || raw.version === TRACK_EFFECTS_VERSION;
  return { mode: known ? trackEffectsMode(raw?.mode) : 'style', version: TRACK_EFFECTS_VERSION };
}

// Priority is musical role, never lane number. Low end, drums and source accompaniment
// are left alone in v1. Per-role draws remain stable even when another part is absent.
export const PRODUCTION_ROLES = Object.freeze(['hook', 'counter', 'arp', 'bell', 'square', 'megaSaw', 'piano', 'pad', 'choir', 'saws', 'third']);
const DELAYS = new Set(['delay', 'pingpong', 'chandelay']);
const MODULATION = new Set(['chorus', 'chorus2', 'widener', 'flanger', 'phaser']);
const ROOMS = new Set(['reverb', 'ambience']);
const active = e => !e.bypass && !e.off;
const has = (strip, ids) => (strip.effects || []).some(e => active(e) && ids.has(e.id));
const clone = value => structuredClone(value);
const round = value => Math.round(value * 1000) / 1000;

// Style limits are deliberately small, including the dry chip/robot styles.
const STYLE = {
  'big-room': { echo: 1, lush: 0.6, room: 0.5 },
  trance: { echo: 1.5, lush: 0.9, room: 0.6 },
  'future-bass': { echo: 0.8, lush: 1.3, room: 0.8 },
  synthwave: { echo: 0.9, lush: 1.6, room: 0.6 },
  eurobeat: { echo: 0.7, lush: 0.7, room: 0.4 },
  shibuya: { echo: 0.4, lush: 0.7, room: 1.4 },
  dnb: { echo: 0.8, lush: 0.7, room: 0.6 },
  electro: { echo: 0.5, lush: 0.4, room: 0.3 },
  kraftwerk: { echo: 0.5, lush: 0.3, room: 0.2 },
  megadrive: { echo: 0.35, lush: 0, room: 0.2 },
  'deep-house': { echo: 1, lush: 0.8, room: 0.7 },
  'nu-disco': { echo: 0.6, lush: 0.8, room: 0.9 },
  downtempo: { echo: 1, lush: 0.6, room: 1 },
  eurodance: { echo: 0.9, lush: 0.9, room: 0.6 },
  'italo-disco': { echo: 1, lush: 1, room: 0.6 },
  'electro-funk': { echo: 0.5, lush: 0.4, room: 0.5 },
  'french-house': { echo: 0.4, lush: 0.5, room: 0.4 },
  reggaeton: { echo: 0.8, lush: 0.6, room: 0.6 },
  moombahton: { echo: 0.8, lush: 0.5, room: 0.5 },
  merenhouse: { echo: 0.5, lush: 0.4, room: 0.6 },
  chipstep: { echo: 0.5, lush: 0, room: 0.3 },
};
const AIRY = new Set(['dreamy', 'wonder', 'nostalgic', 'euphoric', 'gothic', 'lament']);
const DRY = new Set(['funky', 'boogie', 'boss', 'hypnotic']);

/** Read actual note lengths, polyphony and release tails in bars where the part plays.
 * Occupancy runs across bar boundaries; silent bars elsewhere don't make a busy lead
 * look sparse. This is a rule-based description, not an audio measurement. */
export function productionFeatures(bars, voice, bpm) {
  const envelopes = [voice?.options?.envelope, voice?.global?.vca,
    ...Object.values(voice?.layer || {}).filter(x => x && typeof x === 'object')].filter(Boolean);
  const releases = [...envelopes.map(e => e.release), voice?.release].filter(Number.isFinite);
  const release = Math.max(0, ...releases);
  const attack = Math.max(0, ...envelopes.map(e => e.attack).filter(Number.isFinite));
  const stepSeconds = 15 / bpm;
  const sounding = new Set(); const playing = new Set();
  let events = 0, lengths = 0, notes = 0, pitch = 0;
  bars.forEach((part, b) => {
    if (!part?.notes) return;
    part.notes.forEach((v, i) => {
      if (v == null) return;
      playing.add(b); events++;
      const writtenLength = Math.max(1, Number(part.lens?.[i]) || 1);
      const length = voice?.fixedLength > 0 ? Math.min(writtenLength, voice.fixedLength / stepSeconds) : writtenLength;
      lengths += length;
      const chord = Array.isArray(v) ? v : [v];
      for (const n of chord) { pitch += midi(n); notes++; }
      const start = b * 16 + i;
      for (let s = start; s < Math.min(bars.length * 16, start + length + release / stepSeconds); s++) sounding.add(s);
    });
  });
  const occupied = [...sounding].filter(s => playing.has(Math.floor(s / 16))).length;
  return { events, density: events / Math.max(1, playing.size), meanSteps: lengths / Math.max(1, events),
    polyphony: notes / Math.max(1, events), meanPitch: pitch / Math.max(1, notes),
    space: Math.max(0, 1 - occupied / Math.max(1, playing.size * 16)), release, attack,
    pluck: /pluck|bell|piano|keys|mallet/i.test(voice?.category || '') || envelopes.some(e => e.sustain === 0),
    wide: [voice?.chorus, voice?.global?.chorus].some(c => typeof c === 'number' ? c > 0 : (c?.mix ?? c?.wet ?? 0) > 0)
      || (voice?.options?.oscillator?.spread || 0) >= 20 };
}

/** Every authored source effect/send (including an explicit zero or bypass) is a choice. */
function authored(part) {
  return !!part?.strip && (Object.hasOwn(part.strip, 'effects') || Object.hasOwn(part.strip, 'send'));
}

function choose(pool, u) {
  const total = pool.reduce((n, x) => n + x.weight, 0);
  let point = u * total;
  for (const x of pool) { point -= x.weight; if (point < 0) return x; }
  return pool.at(-1);
}

/** Read-only planner. The result records a clean decision as well as every treatment. */
export function planTrackEffects({ style, options, mix, bars, laneOf, riffParts, hookKey, bpm, rng, combo = null, protectedLanes = null }) {
  const mode = trackEffectsMode(options.production?.mode);
  const result = { version: TRACK_EFFECTS_VERSION, mode, roles: [], applied: [] };
  if (mode === 'style') return result;
  const overhaul = mode === 'overhaul';
  const bold = mode === 'adventurous' || overhaul;
  const profile = STYLE[style.id] || STYLE[style.base] || STYLE['big-room'];
  const airy = AIRY.has(options.mood) ? 1.3 : DRY.has(options.mood) ? 0.7 : 1;
  // Existing prominent production consumes the same budget as new production.
  const strips = Object.values(mix.lanes || {});
  let echoes = strips.filter(s => (s.effects || []).some(e => active(e) && DELAYS.has(e.id) && (e.params?.mix ?? e.params?.wet ?? 0.35) >= 0.2) || (s.send?.delay || 0) >= 0.4).length;
  let widths = strips.filter(s => (s.effects || []).some(e => active(e) && MODULATION.has(e.id)
    && (e.id === 'widener' ? (e.params?.width ?? 0.7) >= 0.85 : (e.params?.wet ?? 0.5) >= 0.3))).length;
  let rooms = strips.filter(s => has(s, ROOMS)).length;
  let changed = 0;
  const limit = overhaul ? 8 : bold ? 4 : 2;
  const byKey = new Map(riffParts.map(p => [p.key, p]));
  for (const role of PRODUCTION_ROLES) {
    const random = rng.stream(role); const draws = [random.next(), random.next(), random.next()];
    const lane = laneOf instanceof Map ? laneOf.get(role) : laneOf[role];
    if (!lane || !mix.lanes?.[lane]) continue;
    const strip = mix.lanes[lane];
    const voice = voiceOfLane(mix, lane);
    const f = productionFeatures(bars.map(b => b?.[role]), voice, bpm);
    const entry = { role, lane, treatment: 'clean', reason: 'Kept upfront', features: f, effects: [], sends: null, headroomDb: 0 };
    result.roles.push(entry);
    const sourceHook = role === 'hook' && authored(byKey.get(hookKey));
    if (combo) { entry.treatment = 'protected'; entry.reason = 'Preserved the tuned Sound Combo'; continue; }
    if (protectedLanes?.has(lane)) { entry.treatment = 'protected'; entry.reason = 'Preserved the Sound Palette channel'; continue; }
    if (sourceHook && !bold) { entry.treatment = 'protected'; entry.reason = 'Subtle mode preserves the authored riff effects'; continue; }
    // Adventurous can complement a source strip. An explicitly bypassed insert still
    // protects its own family, rather than locking every unrelated effect out.
    const occupiedFamily = ids => has(strip, ids) || (sourceHook && (byKey.get(hookKey).strip.effects || []).some(e => ids.has(e.id)));
    if (baseLane(lane) === 'bass' || f.meanPitch < 48) { entry.reason = 'Kept the low end clear'; continue; }
    if (!voice || !f.events) { entry.reason = 'No supported instrument or sounding phrase'; continue; }
    if (changed >= limit) { entry.reason = 'Left room for the other tracks'; continue; }
    const lead = ['hook', 'square', 'megaSaw', 'third', 'counter'].includes(role);
    const busy = f.density > 8 || f.space < 0.12;
    const pool = [{ id: 'clean', weight: overhaul ? 0.2 : bold ? 0.7 : 1.8, reason: busy ? 'Busy notes or long tails: kept clear' : 'Kept upfront' }];
    // A short, sparse phrase earns echoes. Never stack another delay insert.
    if (!occupiedFamily(DELAYS) && (strip.send?.delay || 0) < 0.4 && f.polyphony <= 1.2 && f.density <= 8 && f.space >= 0.2 && f.release <= 0.8 && echoes < (overhaul ? 4 : bold ? 2 : 1)) {
      pool.push({ id: 'echo', weight: profile.echo * (f.pluck ? 1.5 : 1), reason: 'Short notes leave room for rhythmic repeats' });
    }
    // Adventurous also gives a simple held hook movement, without widening an
    // already-wide instrument or layering another modulation insert.
    if ((role !== 'hook' || bold) && !occupiedFamily(MODULATION) && !f.wide && (f.meanSteps >= 3 || ['pad', 'saws', 'choir'].includes(role)) && widths < (overhaul ? 4 : bold ? 2 : 1) && profile.lush) {
      pool.push({ id: 'lush', weight: profile.lush * airy, reason: 'Held notes suit gentle stereo movement' });
    }
    if (!occupiedFamily(ROOMS) && (strip.send?.reverb || 0) <= 0.35 && !busy && f.release <= 0.8 && rooms < (overhaul ? 3 : 1)) {
      pool.push({ id: 'room', weight: profile.room * airy * (lead ? 0.7 : 1), reason: 'A restrained room gives this part some space' });
    }
    // Choosing Adventurous should make a suitable main lead audibly different;
    // supporting parts retain the dry lottery and the overall treatment budgets.
    const candidatePool = bold && role === 'hook' && pool.length > 1 ? pool.slice(1) : pool;
    if (pool.length === 1) pool[0].reason = busy ? 'Busy notes or long tails: no suitable extra treatment'
      : 'No suitable extra treatment: existing effects, instrument width or song budgets';
    const treatment = choose(candidatePool, draws[0]);
    entry.treatment = treatment.id; entry.reason = treatment.reason;
    if (treatment.id === 'clean') {
      // Busy generated parts can also turn DOWN inherited ambience. Source sends and
      // insert chains remain protected; a dry choice is not permission to delete them.
      if (busy && !sourceHook && !has(strip, DELAYS) && !has(strip, ROOMS)
        && ((strip.send?.delay || 0) > 0 || (strip.send?.reverb || 0) > 0.12)) {
        entry.treatment = 'upfront';
        entry.sends = { delay: 0, reverb: Math.min(strip.send?.reverb || 0, 0.12) };
        entry.reason = 'Busy notes or long tails: reduced the inherited ambience';
        result.applied.push(entry); changed++;
      }
      continue;
    }
    const strength = (overhaul ? [0.24, 0.28, 0.32] : bold ? [0.14, 0.16, 0.18] : [0.09, 0.1, 0.12])[Math.floor(draws[1] * 3)];
    if (treatment.id === 'echo') {
      const division = draws[2] < 0.55 ? 0.5 : 0.75;
      const feedback = round(overhaul ? 0.36 : bold ? 0.24 : 0.17);
      const shared = mix.fx?.delay;
      // The shared return must explicitly match timing AND remain restrained. Otherwise
      // Advanced Delay supplies filtered repeats without changing anybody else's return.
      if (shared?.sync === 1 && shared.division === division && (shared.feedback ?? 0.3) <= 0.3) {
        entry.sends = { delay: round(strength) };
      } else {
        entry.sends = { delay: 0 };
        entry.effects.push({ id: 'chandelay', params: { sync: 1, division, feedback, tone: 3500, pan: role === 'hook' ? 0 : 0.15, mix: round(strength), sweep: 0 } });
      }
      entry.reason += division === 0.5 ? ' (eighth-note echo)' : ' (dotted-eighth echo)';
      entry.headroomDb = 1.5; echoes++;
    } else if (treatment.id === 'lush') {
      entry.effects.push({ id: 'chorus2', params: { rateSync: 0, frequency: 0.65, delayMs: 16, depth: overhaul ? 0.55 : bold ? 0.4 : 0.25, width: 0.8, feedback: 0, tone: 6500, wet: round(strength) } });
      entry.headroomDb = 2; widths++;
    } else {
      // A local short room avoids changing the shared (often long) reverb for the song.
      entry.sends = { reverb: 0 };
      entry.effects.push({ id: 'reverb', params: { decay: overhaul ? 2 : bold ? 1.2 : 0.7, preDelay: 0.015, low: -6, mid: 0, high: -3, width: 0.8, wet: round(strength) } });
      entry.headroomDb = 1; rooms++;
    }
    // A visible gain insert reserves headroom even when the fallback level model cannot
    // predict chorus/reverb. It survives levelling; it is NOT a measured loudness offset.
    entry.effects.push({ id: 'gain', params: { gain: -entry.headroomDb } });
    result.applied.push(entry); changed++;
  }
  return result;
}

export function applyTrackEffects(args) {
  const plan = planTrackEffects(args);
  for (const entry of plan.applied) {
    const strip = args.mix.lanes[entry.lane];
    if (entry.sends) strip.send = { ...(strip.send || {}), ...entry.sends };
    if (entry.effects.length) strip.effects = [...(strip.effects || []), ...clone(entry.effects)];
  }
  return plan;
}
