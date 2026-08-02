// What a mix AMOUNTS TO, once everything src/data/mix.js cannot hold is taken out.
//
// The desk asks one question constantly — has this song changed away from the file? —
// and the only honest way to answer it is to reduce both sides to what a save would
// actually write and compare those. That reduction lived inside tools/mixer-entry.js
// as a hand-written list of fields, beside a second hand-written list of fields in the
// serialiser, and the two drifted: the sends (`fx`) were missing from this side
// entirely, and a channel's effect chain was missing whenever the channel was
// otherwise at unity. A reverb decay, a return level, a send's EQ or a chorus added to
// an untouched lane therefore left Save reading "Saved — matches the file" with the
// button disabled. The change lived in one browser's localStorage and nowhere else:
// the desk went on sounding right, the game never heard it, and the day the draft went
// away, so did the mix.
//
// So it lives here, on its own, where tests/mix.js can hold it and `renderMixFile` to
// each other in both directions: two mixes that render to different files must have
// different signatures (or the desk cannot see a change it is being asked to save),
// and two that render to the same file must have the same one (or it cries wolf).
import { laneSettings } from '../../src/data/mix.js';
import { AUX_DEFAULTS } from '../../src/engine/mixer.js';
import { isDefaultMasterChain } from '../../src/engine/effects.js';

// The three decimals the serialiser rounds to, so the file is the arbiter of what
// counts as a different number: a drag that leaves 0.1234 behind writes 0.123, and a
// song already holding 0.123 has not been changed by it.
const r3 = (n) => (typeof n === 'number' ? Math.round(n * 1000) / 1000 : n);

/** An effect's parameters as the file holds them — nulls dropped, numbers rounded. */
function paramsSig(params) {
  const out = {};
  for (const [k, v] of Object.entries(params || {})) if (v != null) out[k] = r3(v);
  return Object.keys(out).length ? out : undefined;
}

/**
 * An effect chain as the file holds it: no empty `params` object, no `bypass: false`.
 *
 * One function because a chain hangs off three different things — a channel, a send
 * and the master — and all three are written out the same way.
 */
export function chainSig(list) {
  if (!list?.length) return undefined;
  return list.map((e) => {
    const params = paramsSig(e.params);
    return { id: e.id, ...(e.bypass ? { bypass: true } : {}), ...(params ? { params } : {}) };
  });
}

/**
 * One channel, in a fixed shape, holding only what the file can carry.
 *
 * Fixed rather than spread from the entry, because these are compared with
 * JSON.stringify: two lanes that say the same thing in a different key order are not
 * two different lanes. A send at an explicit 0 is the same as no send at all — the
 * file writes neither, and the engine reads both as shut.
 */
export function laneSig(L) {
  const s = laneSettings(L);
  const send = {};
  for (const id of Object.keys(AUX_DEFAULTS)) send[id] = r3(s.send[id] || 0);
  const chain = chainSig(L?.effects);
  return {
    gain: r3(s.gain || 0),
    pan: r3(s.pan || 0),
    width: r3(s.width ?? 1),
    mute: !!s.mute,
    send,
    eq: { low: r3(s.eq.low || 0), mid: r3(s.eq.mid || 0), high: r3(s.eq.high || 0) },
    ...(chain ? { effects: chain } : {}),
  };
}

const LANE_BARE = JSON.stringify(laneSig(null));

/**
 * The sends, against their defaults.
 *
 * Touching a send at all writes the whole of AUX_DEFAULTS into the mix — see the
 * desk's `editFx` — so comparing the stored object would call every song you had once
 * opened a reverb on dirty. What counts is a value that has MOVED: a decay, a return
 * level, three EQ bands, a mute, and the return's own effect chain.
 *
 * Walked in AUX_DEFAULTS' key order, so both sides of a comparison are built the same
 * way round whatever order the draft happens to be in.
 */
export function fxSig(fx) {
  const out = {};
  for (const [id, def] of Object.entries(AUX_DEFAULTS)) {
    const patch = fx?.[id];
    if (!patch) continue;
    const bits = {};
    for (const k of Object.keys(def)) {
      if (k === 'eq') continue;
      const v = r3(patch[k] ?? def[k]);
      if (v !== r3(def[k])) bits[k] = v;
    }
    const eq = {};
    for (const b of ['low', 'mid', 'high']) if (patch.eq?.[b]) eq[b] = r3(patch.eq[b]);
    if (Object.keys(eq).length) bits.eq = eq;
    const chain = chainSig(patch.effects);
    if (chain) bits.effects = chain;
    if (Object.keys(bits).length) out[id] = bits;
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * A whole song's mix, reduced to its decisions. `null` for a mix that carries none —
 * which is what "Reset every channel" leaves behind, and what the file leaves out.
 */
export function mixSignature(m) {
  if (!m) return null;
  const lanes = {};
  for (const [k, L] of Object.entries(m.lanes || {})) {
    const s = laneSig(L);
    if (JSON.stringify(s) !== LANE_BARE) lanes[k] = s;
  }
  const out = {
    master: r3(m.master || 0), masterPan: r3(m.masterPan || 0), limiter: !!m.limiter, lanes,
  };
  const fx = fxSig(m.fx);
  if (fx) out.fx = fx;
  if (m.voice && Object.keys(m.voice).length) out.voice = { ...m.voice };
  if (m.voiceParams && Object.keys(m.voiceParams).length) out.voiceParams = JSON.parse(JSON.stringify(m.voiceParams));
  // Every untouched master starts empty, and the serialiser will not write an empty
  // chain — so a master somebody merely opened is not a change, and neither is one
  // they put an effect on and took straight back off.
  if (m.masterEffects && !isDefaultMasterChain(m.masterEffects)) {
    out.masterEffects = chainSig(m.masterEffects) || [];
  }
  // The song's SHAPE — tracks duplicated onto it, tracks taken off it. Not a balance
  // decision like everything above, but a decision the file carries, so it is compared
  // like one: a mix whose only change is a deleted crash is still a mix to save.
  // Independent pattern lanes also keep their mode and display label; ordinary
  // duplicate layers still reduce to key/from exactly as before.
  const layers = (m.layers || []).filter((l) => l && l.key && l.from)
    .map((l) => ({ key: l.key, from: l.from,
      ...(l.independent ? { independent: true } : {}), ...(l.label ? { label: l.label } : {}) }));
  const off = (m.off || []).filter(Boolean);
  if (layers.length) out.layers = layers;
  if (off.length) out.off = off;
  if (!out.master && !out.masterPan && !out.limiter && !out.voice && !out.voiceParams && !out.masterEffects
      && !out.fx && !out.layers && !out.off && !Object.keys(lanes).length) return null;
  return out;
}

/** Would saving `a` write anything the file does not already say in `b`? */
export const mixChanged = (a, b) => JSON.stringify(mixSignature(a)) !== JSON.stringify(mixSignature(b));
