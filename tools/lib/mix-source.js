// One song's mix, as source — the picky half of writing a song file.
//
// Moved here from `renderMixFile`, which used to write all thirty-four songs into
// src/data/mix.js. The file changed; these rules did not, and they are the reason a
// song file stays readable: a mix arrives from the desk carrying every default it
// touched and put back — `voice: {}`, `layers: []`, an empty effect chain, a channel
// at 0/0/false, a gain that a drag left at -2.5001 — and none of that is a decision.
// Written out, it would fill the file with values nobody chose and put them in the
// diff of every save.
//
// The rule throughout: a value equal to its default is left out; what is left is
// what somebody meant.
import { isDefaultMasterChain } from '../../src/engine/effects.js';
// The sends' defaults come from the engine rather than being written out again here,
// so a value equal to its default is left out and a default that drifts apart from
// the engine's cannot quietly start being saved.
import { AUX_DEFAULTS } from '../../src/engine/mixer.js';

const round = (n) => Math.round(n * 1000) / 1000;

// A parameter name is emitted as SOURCE, so anything that is not a bare identifier
// has to be quoted: the nested compressors address their bands as `mid.threshold`,
// and an unquoted dot there is a syntax error in the file the whole game reads.
const fmtKey = (k) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k));

const fmtParams = (params = {}) => Object.entries(params)
  .filter(([, v]) => v != null)
  .map(([k, v]) => `${fmtKey(k)}: ${typeof v === 'string' ? JSON.stringify(v) : round(v)}`)
  .join(', ');

const fmtEffects = (list = []) => `[${list.map((e) => {
  const bits = [`id: ${JSON.stringify(e.id)}`];
  if (e.bypass) bits.push('bypass: true');
  const p = fmtParams(e.params);
  if (p) bits.push(`params: { ${p} }`);
  return `{ ${bits.join(', ')} }`;
}).join(', ')}]`;

function laneLine(key, L, indent) {
  const parts = [];
  if (L.gain) parts.push(`gain: ${round(L.gain)}`);
  if (L.pan) parts.push(`pan: ${round(L.pan)}`);
  // Compared against 1, not against falsy: width 0 is mono, which is a decision, and
  // `if (L.width)` would drop it. There is no desk control for width — this is here
  // so a value written in by hand survives the next save.
  if (L.width != null && L.width !== 1) parts.push(`width: ${round(L.width)}`);
  if (L.mute) parts.push('mute: true');
  const send = L.send || {};
  const sendParts = [];
  // Anything but zero gets written. This used to skip `delay: 1` as "the default",
  // which is exactly how a channel's echo stayed invisible: the value the engine used
  // never reached the file. Both sends default to shut.
  if (send.delay) sendParts.push(`delay: ${round(send.delay)}`);
  if (send.reverb) sendParts.push(`reverb: ${round(send.reverb)}`);
  if (sendParts.length) parts.push(`send: { ${sendParts.join(', ')} }`);
  const eq = L.eq || {};
  const eqParts = [];
  for (const b of ['low', 'mid', 'high']) if (eq[b]) eqParts.push(`${b}: ${round(eq[b])}`);
  if (eqParts.length) parts.push(`eq: { ${eqParts.join(', ')} }`);
  if (L.effects && L.effects.length) parts.push(`effects: ${fmtEffects(L.effects)}`);
  return parts.length ? `${indent}${key}: { ${parts.join(', ')} },\n` : '';
}

/**
 * A mix as source, or **null** when it carries no decisions at all.
 *
 * Null is the important half: a song opened on the desk and left alone writes
 * `export const mix = null`, so the file says "nothing here" rather than holding a
 * shape full of defaults.
 */
export function mixEntrySource(entry, indent = '') {
  const e = entry || {};
  const i2 = `${indent}  `;
  const i3 = `${indent}    `;
  const lanes = Object.entries(e.lanes || {})
    .map(([k, L]) => laneLine(k, L, i3)).filter(Boolean).join('');
  // Every master starts EMPTY. An empty chain is a starting point, not a decision,
  // and writing it out would put a masterEffects line in every song in the game for a
  // bus nobody has put anything on.
  const masterFx = isDefaultMasterChain(e.masterEffects) ? null : e.masterEffects;
  const layers = (e.layers || []).filter((l) => l && l.key && l.from);
  const off = (e.off || []).filter(Boolean);
  const order = (e.order || []).filter(Boolean);
  const voice = e.voice && Object.keys(e.voice).length ? e.voice : null;
  const voiceParams = e.voiceParams && Object.keys(e.voiceParams).length ? e.voiceParams : null;

  let body = '';
  if (e.master) body += `${i2}master: ${round(e.master)},\n`;
  if (e.masterPan) body += `${i2}masterPan: ${round(e.masterPan)},\n`;
  if (e.limiter) body += `${i2}limiter: true,\n`;
  // Only a chain with something in it reaches the file. Emptying a master puts it back
  // where it started, and where it started is not a line in mix.js — the `[]` branch
  // that used to record "the seed was taken off" has nothing left to record.
  if (masterFx?.length) body += `${i2}masterEffects: ${fmtEffects(masterFx)},\n`;
  if (layers.length) {
    body += `${i2}layers: [${layers
      .map((l) => `{ key: ${JSON.stringify(l.key)}, from: ${JSON.stringify(l.from)}`
        + `${l.independent ? ', independent: true' : ''}`
        + `${l.label ? `, label: ${JSON.stringify(l.label)}` : ''} }`)
      .join(', ')}],\n`;
  }
  if (off.length) body += `${i2}off: ${JSON.stringify(off)},\n`;
  // The desk's track order, written only once a drag has actually moved something. A
  // song nobody has reordered has no line here and takes the engine's order, so this
  // key appearing in a diff means someone decided the strips sit somewhere else.
  if (order.length) body += `${i2}order: ${JSON.stringify(order)},\n`;
  if (voice) body += `${i2}voice: ${JSON.stringify(voice)},\n`;
  if (voiceParams) body += `${i2}voiceParams: ${JSON.stringify(voiceParams)},\n`;
  if (e.fx) {
    const auxLine = (a = {}, defaults) => {
      const p = [];
      for (const [k, d] of Object.entries(defaults)) {
        if (k === 'eq' || k === 'effects') continue;
        if (a[k] != null && a[k] !== d) p.push(`${k}: ${typeof a[k] === 'boolean' ? a[k] : round(a[k])}`);
      }
      const eq = a.eq || {};
      const eqBits = ['low', 'mid', 'high'].filter((b) => eq[b]).map((b) => `${b}: ${round(eq[b])}`);
      if (eqBits.length) p.push(`eq: { ${eqBits.join(', ')} }`);
      if (a.effects && a.effects.length) p.push(`effects: ${fmtEffects(a.effects)}`);
      return p.length ? `{ ${p.join(', ')} }` : null;
    };
    const bits = [];
    for (const [aux, defaults] of Object.entries(AUX_DEFAULTS)) {
      const line = auxLine(e.fx[aux], defaults);
      if (line) bits.push(`${aux}: ${line}`);
    }
    if (bits.length) body += `${i2}fx: { ${bits.join(', ')} },\n`;
  }
  if (lanes) body += `${i2}lanes: {\n${lanes}${i2}},\n`;

  return body ? `{\n${body}${indent}}` : null;
}

// ---- variants: the same song, heard another way -----------------------------------
//
// A patch plays by the opposite rule to a mix, and it has to.
//
// In a mix an omitted field means "default" — that is the whole point of everything
// above, and it is what keeps a song file a list of decisions instead of a wall of
// zeroes. In a PATCH an omitted field means "leave this alone", so the two readings of a
// missing `mute` are "not muted" and "don't touch the mute", which are not the same
// answer. Run a patch through mixEntrySource and every decision that happens to equal a
// default disappears: `mute: false` is the whole of "bring the lead back in", and it is
// unwritable there. So is a send closed to zero, and a pan returned to centre.
//
// Two serializers, two rules. This one emits every key the patch carries and nothing it
// does not.

const fmtVal = (v) => (typeof v === 'string' ? JSON.stringify(v)
  : typeof v === 'boolean' ? String(v) : round(v));

// What a treatment may carry. An allowlist rather than a list of things to strip, so a
// field added to a mix one day is inert in a variant until somebody has decided it can
// move at a bar line — see Audio.rampMix for which of them actually can.
const PATCH_TOP_KEYS = new Set(['master', 'masterPan', 'masterEffects', 'fx', 'lanes']);
const PATCH_LANE_KEYS = new Set(['gain', 'pan', 'width', 'mute', 'send', 'eq', 'effects']);
const PATCH_AUX_KEYS = new Set(['level', 'pan', 'eq', 'effects']);
const WHENS = ['level1', 'level2', 'level3', 'boss', 'cleared', 'always'];
const QUANTIZE = ['immediate', 'beat', 'bar', 'phrase'];
const LOOP_RELEASE = ['immediate', 'atTransition', 'atLoopEnd'];
const EXIT_KEYS = ['quantize', 'crossfadeBars', 'loopRelease', 'swellBars', 'swellTo', 'treatBars'];

/**
 * Everything wrong with a set of variants, as sentences. Empty means it is fine.
 *
 * Checked when the desk saves rather than when the game plays: a treatment that cannot
 * work should fail in front of the person writing it, not go quiet in a level six
 * screens away from the thing that caused it.
 */
export function validateVariants(variants) {
  const errs = [];
  for (const [name, raw] of Object.entries(variants || {})) {
    const list = Array.isArray(raw) ? raw : [raw];
    if (!list.length) { errs.push(`"${name}" has no treatments in it`); continue; }
    const seen = new Set();
    list.forEach((t, i) => {
      const at = `"${name}"[${i}]`;
      const when = t.when ?? 'always';
      if (!WHENS.includes(when)) errs.push(`${at}: "${when}" is not a condition — one of ${WHENS.join(', ')}`);
      if (seen.has(when)) errs.push(`${at}: "${when}" is listed twice, and only the first can ever play`);
      seen.add(when);
      if (when === 'always' && i !== list.length - 1) {
        errs.push(`${at}: "always" matches everything, so nothing listed after it can ever play`);
      }
      for (const k of Object.keys(t.patch || {})) {
        if (!PATCH_TOP_KEYS.has(k)) errs.push(`${at}: "${k}" changes the song itself and cannot move while it plays`);
      }
      for (const [lane, L] of Object.entries(t.patch?.lanes || {})) {
        for (const k of Object.keys(L || {})) {
          if (!PATCH_LANE_KEYS.has(k)) errs.push(`${at}: lane ${lane} has no mix control called "${k}"`);
        }
      }
      for (const [aux, A] of Object.entries(t.patch?.fx || {})) {
        for (const k of Object.keys(A || {})) {
          if (!PATCH_AUX_KEYS.has(k)) errs.push(`${at}: ${aux} "${k}" rebuilds the effect rather than moving it`);
        }
      }
      if (t.loop && !(t.loop.fromBar >= 1 && t.loop.toBar >= t.loop.fromBar)) {
        errs.push(`${at}: bars ${t.loop.fromBar}-${t.loop.toBar} are not a range`);
      }
      // A treatment may start somewhere other than the top — the cabinet screen coming
      // in on bar 5 while the level plays the song's own intro from bar 1. It cannot
      // start AFTER the loop it is arming, or the bars it names are ones it will never
      // reach. No upper bound here: how many bars the song has is not a question this
      // file can answer, and the engine clamps what it is handed.
      if (t.loop?.startBar != null
        && !(t.loop.startBar >= 1 && (t.loop.fromBar == null || t.loop.startBar <= t.loop.fromBar))) {
        errs.push(`${at}: starting at bar ${t.loop.startBar} never reaches the loop at bar ${t.loop.fromBar}`);
      }
      if (t.treatment && !Array.isArray(t.treatment)) {
        errs.push(`${at}: "treatment" is a list of effects, not ${typeof t.treatment}`);
      }
      for (const e of t.treatment || []) {
        if (!e || typeof e.id !== 'string') errs.push(`${at}: a treatment effect has no id`);
      }
      if ((t.treatment || []).length > 6) {
        errs.push(`${at}: ${t.treatment.length} effects on the treatment leg — the slot holds 6`);
      }
      if (t.gap != null && !(t.gap >= 0 && t.gap <= 2)) {
        errs.push(`${at}: a ${t.gap}s gap before the treatment starts is not a length of silence`);
      }
      if (t.exit?.treatBars != null && !(t.exit.treatBars >= 0 && t.exit.treatBars <= 8)) {
        errs.push(`${at}: a ${t.exit.treatBars}-bar treatment fade is not a length`);
      }
      if (t.exit?.swellBars != null && !(t.exit.swellBars >= 0 && t.exit.swellBars <= 4)) {
        errs.push(`${at}: a ${t.exit.swellBars}-bar reverb swell is not a length`);
      }
      if (t.exit?.swellTo != null && !(t.exit.swellTo >= 0 && t.exit.swellTo <= 8)) {
        errs.push(`${at}: a reverb return of ${t.exit.swellTo} at the peak of the swell is out of range`);
      }
      const lr = t.exit?.loopRelease;
      if (lr != null && !LOOP_RELEASE.includes(lr)) {
        errs.push(`${at}: "${lr}" is not a loop release — one of ${LOOP_RELEASE.join(', ')}`);
      }
      const q = t.exit?.quantize;
      if (q != null && !(QUANTIZE.includes(q) || (typeof q === 'number' && q > 0))) {
        errs.push(`${at}: "${q}" is not a boundary — one of ${QUANTIZE.join(', ')}, or a number of bars`);
      }
    });
    // No `always` entry required. The engine already falls back to the song's own saved
    // mix when nothing matches (see resolve in music-director.js), and demanding one here
    // banned the most obvious thing the conditions are FOR: treating the first visit
    // specially and leaving every other visit alone. The two rules above are real — a
    // duplicate condition can never play, and nothing after `always` can either.
  }
  return errs;
}

function patchLaneLine(key, L, indent) {
  const parts = [];
  for (const k of ['gain', 'pan', 'width', 'mute']) {
    if (L[k] !== undefined) parts.push(`${k}: ${fmtVal(L[k])}`);
  }
  if (L.send !== undefined) {
    parts.push(`send: { ${Object.entries(L.send || {}).filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${fmtKey(k)}: ${round(v)}`).join(', ')} }`);
  }
  if (L.eq !== undefined) {
    parts.push(`eq: { ${['low', 'mid', 'high'].filter((b) => L.eq[b] !== undefined)
      .map((b) => `${b}: ${round(L.eq[b])}`).join(', ')} }`);
  }
  if (L.effects !== undefined) parts.push(`effects: ${fmtEffects(L.effects)}`);
  return parts.length ? `${indent}${key}: { ${parts.join(', ')} },\n` : '';
}

function patchSource(patch, indent) {
  const i2 = `${indent}  `;
  const i3 = `${indent}    `;
  let body = '';
  if (patch.master !== undefined) body += `${i2}master: ${round(patch.master)},\n`;
  if (patch.masterPan !== undefined) body += `${i2}masterPan: ${round(patch.masterPan)},\n`;
  if (patch.masterEffects !== undefined) body += `${i2}masterEffects: ${fmtEffects(patch.masterEffects)},\n`;
  if (patch.fx !== undefined) {
    const bits = [];
    for (const [aux, A] of Object.entries(patch.fx || {})) {
      const p = [];
      for (const k of ['level', 'pan']) if (A[k] !== undefined) p.push(`${k}: ${round(A[k])}`);
      if (A.eq !== undefined) {
        p.push(`eq: { ${['low', 'mid', 'high'].filter((b) => A.eq[b] !== undefined)
          .map((b) => `${b}: ${round(A.eq[b])}`).join(', ')} }`);
      }
      if (A.effects !== undefined) p.push(`effects: ${fmtEffects(A.effects)}`);
      if (p.length) bits.push(`${aux}: { ${p.join(', ')} }`);
    }
    if (bits.length) body += `${i2}fx: { ${bits.join(', ')} },\n`;
  }
  if (patch.lanes !== undefined) {
    const lanes = Object.entries(patch.lanes || {})
      .map(([k, L]) => patchLaneLine(k, L || {}, i3)).filter(Boolean).join('');
    if (lanes) body += `${i2}lanes: {\n${lanes}${i2}},\n`;
  }
  return body ? `{\n${body}${indent}}` : '{}';
}

/**
 * A song's variants as source, or **null** when none of them says anything.
 *
 * Same null contract as mixEntrySource: a song with no cabinet treatment writes
 * `export const variants = null` rather than an empty shape.
 */
export function variantsSource(variants, indent = '') {
  const names = Object.entries(variants || {}).filter(([, raw]) => {
    const list = Array.isArray(raw) ? raw : [raw];
    return list.some((t) => t && (t.patch || t.loop || t.gap != null || t.treatment?.length));
  });
  if (!names.length) return null;
  const i2 = `${indent}  `;
  const i3 = `${indent}    `;
  const i4 = `${indent}      `;
  let body = '';
  for (const [name, raw] of names) {
    const list = Array.isArray(raw) ? raw : [raw];
    body += `${i2}${fmtKey(name)}: [\n`;
    for (const t of list) {
      const bits = [`${i4}when: ${JSON.stringify(t.when ?? 'always')},\n`];
      if (t.loop) bits.push(`${i4}loop: { fromBar: ${t.loop.fromBar}, toBar: ${t.loop.toBar} },\n`);
      if (t.treatment?.length) bits.push(`${i4}treatment: ${fmtEffects(t.treatment)},\n`);
      if (t.gap != null) bits.push(`${i4}gap: ${round(t.gap)},\n`);
      if (t.patch) bits.push(`${i4}patch: ${patchSource(t.patch, i4)},\n`);
      const exit = EXIT_KEYS.filter((k) => t.exit?.[k] != null)
        .map((k) => `${k}: ${fmtVal(t.exit[k])}`);
      if (exit.length) bits.push(`${i4}exit: { ${exit.join(', ')} },\n`);
      body += `${i3}{\n${bits.join('')}${i3}},\n`;
    }
    body += `${i2}],\n`;
  }
  return `{\n${body}${indent}}`;
}
