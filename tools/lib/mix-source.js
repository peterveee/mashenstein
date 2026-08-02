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
