// Musical, section-relative Spot FX. Normal desk automation, editable after generation.
import { laneFx, replaceFxRange, posOf, barStepOf } from '../../../src/data/automation.js';
import { expandOrder } from '../../../src/data/arrangements.js';
import { SECTION_EFFECTS, MAX_EFFECTS, EFFECT_BY_ID } from '../../../src/engine/effects.js';
import { typeOf as sectionType } from './form-types.js';
import { productionFeatures } from './production.js';
import { voiceOfLane } from './expression.js';

import { REGION_FX_STYLES, styleSectionRequests, colourSectionChain, limitSectionEchoes, chooseSectionRequests } from './section-style-fx.js';

const clone = structuredClone;
const supported = new Set(SECTION_EFFECTS.map(e => e.id));
const family = id => ['delay', 'pingpong', 'chandelay'].includes(id) ? 'echo'
  : ['reverb', 'ambience'].includes(id) ? 'room' : id;
const usable = chain => Array.isArray(chain) && chain.length && chain.every(e => supported.has(e.id));
export const SECTION_FX_PRESETS = [
  ['none', 'None'], ['pingpong', 'Ping-Pong Echo'], ['stack', 'Arp Echo Layers'],
  ['echo', 'Dotted Echo'], ['room', 'Short Room'], ['chorus', 'Stereo Chorus'],
];
export const SECTION_FX_DEFAULTS = { mode: 'style', assignments: {},
  firstEffect: 'none', firstPart: 'hook', firstSection: 'intro', firstRange: 'whole',
  secondEffect: 'none', secondPart: 'arp', secondSection: 'drop', secondRange: 'whole' };
export const SECTION_FX_FIELDS = [
  { key: 'mode', label: 'Spot FX intensity', title: 'Style treatments, optional automatic choices, and explicit effects assigned to individual section blocks', type: 'select', options: [
    ['off', 'Manual Only', 'Use only explicit choices in the selected sections'],
    ['style', 'Style Presets', 'Use the part Spot FX saved with Use as Style'],
    ['subtle', 'Subtle', 'A couple of quiet section touches, shaped by the style and mood'],
    ['expressive', 'Expressive', 'More section contrast, with stronger echoes and modulation'],
    ['wild', 'Wild', 'Bolder treatments across up to four sections'],
    ['auto', 'Classic Automatic', 'The original automatic lead and arp echoes'],
  ] },
  ...['first', 'second'].flatMap((slot, i) => [
    { key: `${slot}Effect`, label: `Rule ${i + 1} · Effect`, type: 'select', options: SECTION_FX_PRESETS,
      title: 'A deliberate effect, even on busy phrases. Arp Echo Layers uses quieter dotted-eighth repeats to overlap different notes of an arp.' },
    { key: `${slot}Part`, label: `Rule ${i + 1} · Part`, title: 'The part treated by this legacy rule', type: 'select', options: [
      ['hook', 'Main Lead'], ['arp', 'Arp'], ['counter', 'Counter Melody'], ['saws', 'Chords'],
      ['pad', 'Pad'], ['piano', 'Piano'], ['bell', 'Bell'], ['square', 'Square Lead'], ['megaSaw', 'Octave Lead'], ['choir', 'Choir'],
    ] },
    { key: `${slot}Section`, label: `Rule ${i + 1} · Section`, title: 'Matching section kinds for this legacy rule', type: 'select', options: [
      ['intro', 'Intro'], ['verse', 'Verse'], ['chorus', 'Chorus'], ['drop', 'Drop'],
      ['build', 'Build'], ['breakdown', 'Breakdown'], ['middle8', 'Middle 8'], ['outro', 'Outro'], ['all', 'Every Section'],
    ] },
    { key: `${slot}Range`, label: `Rule ${i + 1} · Where`, title: 'The portion of each matching block treated by this legacy rule', type: 'select', options: [
      ['whole', 'Whole Section'], ['first', 'First Half'], ['second', 'Second Half'], ['last2', 'Last Two Bars'],
    ] },
  ]),
];

const typeOf = f => sectionType(f);
const start = f => posOf(f.from, 0);
const end = f => posOf(f.to + 1, 0);

/** Capture lane Spot FX by musical section and occurrence. Cross-boundary FX split
 * at the form boundary, so each piece follows its musical section in a new form. */
export function captureSectionEffects(mod) {
  const form = mod.banger?.form || [];
  const rules = [];
  const plan = expandOrder(mod.arrangement?.order || mod.bank?.order || []);
  for (const [role, lane] of Object.entries(mod.banger?.laneOf || {})) {
    if (role.startsWith('riff:')) continue;
    let source = mod.arrangement?.automation;
    // Legacy per-bar snapshots are the fallback beneath modern Spot FX sections.
    for (let b = 0; b < plan.length; b++) {
      const chain = plan[b].inlineFx?.[lane];
      if (usable(chain)) source = lay(source, lane, b * 16, (b + 1) * 16, chain, true).auto;
    }
    for (const fx of laneFx(source, lane)) {
      if (!usable(fx.chain)) continue;
      form.forEach((f, index) => {
        const a = Math.max(start(f), fx.from), z = Math.min(end(f), fx.to);
        if (z <= a) return;
        const type = typeOf(f);
        const peers = form.filter(p => typeOf(p) === type);
        rules.push({ role, section: type, occurrence: peers.indexOf(f),
          occurrences: peers.length, from: (a - start(f)) / (end(f) - start(f)),
          to: (z - start(f)) / (end(f) - start(f)), chain: clone(fx.chain),
          sourceSection: f.label || f.role, sourceIndex: index });
      });
    }
  }
  return { version: 1, rules };
}

export function sectionEffectPreset(id, busy = false) {
  const delay = (effect, division, feedback, wet) => [{ id: effect, params: { sync: 1, division, feedback, wet } }];
  const chains = {
    pingpong: delay('pingpong', 0.5, busy ? 0.22 : 0.32, busy ? 0.2 : 0.28),
    // Three sixteenths shifts a common four-note arp against itself, so its
    // different pitches overlap instead of a quarter-note echo doubling the cycle.
    stack: delay('pingpong', 0.75, 0.38, busy ? 0.22 : 0.28),
    echo: delay('delay', 0.75, 0.3, busy ? 0.18 : 0.26),
    room: [{ id: 'reverb', params: { decay: 1.1, preDelay: 0.015, wet: 0.2 } }],
    chorus: [{ id: 'chorus2', params: { rateSync: 0, frequency: 0.65, delayMs: 16, depth: 0.35, width: 0.8, feedback: 0, wet: 0.2 } }],
  };
  return chains[id] ? [...chains[id], { id: 'gain', params: { gain: -2 } }] : null;
}

/** Merge a treatment with existing transition chains, replacing matching effect
 * families. Splitting at boundaries retains the other effects and channel fades/cuts. */
function lay(auto, lane, a, z, chain, automatic) {
  const existing = laneFx(auto, lane);
  const edges = [...new Set([a, z, ...existing.flatMap(s => [s.from, s.to]).filter(p => p > a && p < z)])].sort((x, y) => x - y);
  const placed = [], skips = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const from = edges[i], to = edges[i + 1];
    const old = existing.find(s => s.from <= from && s.to >= to)?.chain || [];
    const kinds = new Set(chain.map(e => family(e.id)));
    if (automatic && old.length && (automatic !== 'compatible' || old.some(e => kinds.has(family(e.id))))) continue;
    const merged = [...old.filter(e => !kinds.has(family(e.id))), ...clone(chain)];
    if (merged.length > MAX_EFFECTS) { skips.push({ from: barStepOf(from), to: barStepOf(to), reason: `Effect chain exceeds ${MAX_EFFECTS} effects` }); continue; }
    auto = replaceFxRange(auto, lane, from, to, [{ from, to, chain: merged }]);
    placed.push([barStepOf(from), barStepOf(to)]);
  }
  return { auto, placed, skips };
}

export function applySectionEffects({ automation, options, style, form, bars, laneOf, mix, bpm, rng }) {
  const config = { ...SECTION_FX_DEFAULTS, ...options.sectionFx };
  let auto = automation;
  const decisions = [];
  const inherited = style.sectionFx?.version === 1 ? style.sectionFx.rules || [] : [];
  const requests = [];
  // Automatic goes first, followed by style presets and finally deliberate rules.
  // One automatic part per section, at most four sections, on an independent stream.
  const intensity = { subtle: { count: 2, wet: 0.6 }, expressive: { count: 3, wet: 0.85 }, wild: { count: 4, wet: 1.15 } }[config.mode];
  const styleId = style.base || style.id;
  const trance = intensity && styleId === 'trance';
  const styled = intensity && REGION_FX_STYLES.has(styleId);
  if (trance) {
    // Cover the three musical jobs before adding a second occurrence of any one.
    const candidates = [];
    const active = (f, role) => laneOf.has(role)
      && bars.slice(f.from - 1, f.to).some(b => b[role]?.notes?.some(n => n != null));
    const dark = ['dark', 'moody', 'gothic'].includes(options.mood);
    const airy = ['dreamy', 'euphoric', 'nostalgic', 'wonder'].includes(options.mood);
    for (const f of form) {
      const kind = typeOf(f);
      let role, chain, treatment;
      if (kind === 'build') {
        role = ['arp', 'saws', 'hook'].find(r => active(f, r));
        treatment = 'Trance build opening';
        chain = [{ id: 'filter', params: { type: 'lowpass',
          frequency: config.mode === 'subtle' ? 1800 : dark ? 450 : 800,
          Q: 0.7, sweep: 1, sweepTo: dark ? 6500 : 12000 } }];
      } else if (kind === 'breakdown' || kind === 'middle8') {
        role = ['pad', 'choir', 'saws'].find(r => active(f, r));
        treatment = 'Trance breakdown space';
        chain = [{ id: 'reverb', params: { decay: airy ? 3.2 : 2.4, preDelay: 0.025, wet: 0.14 } }];
      } else if (['intro', 'verse', 'drop', 'chorus', 'outro'].includes(kind) && active(f, 'arp')) {
        role = 'arp';
        treatment = 'Trance dotted arp echo';
        chain = [{ id: 'delay', params: { sync: 1, division: 0.75, feedback: 0.24, wet: 0.16 } }];
      }
      if (role) candidates.push({ role, f, a: start(f), z: end(f), chain, treatment,
        wetScale: intensity.wet, origin: 'Automatic', styled: true });
    }
    requests.push(...chooseSectionRequests(candidates, intensity.count, rng));
  }
  if (styled) {
    const candidates = styleSectionRequests({ id: styleId, form, kindOf: typeOf, start, end,
      mode: config.mode, wetScale: intensity.wet, active: (f, role) => laneOf.has(role)
        && bars.slice(f.from - 1, f.to).some(b => b[role]?.notes?.some(n => n != null)) });
    requests.push(...chooseSectionRequests(candidates, intensity.count, rng));
  }
  if (!trance && !styled && (config.mode === 'auto' || intensity)) {
    let count = 0;
    for (const f of form) {
      if (!['intro', 'verse', 'chorus', 'drop', 'breakdown', 'middle8'].includes(typeOf(f)) || count >= (intensity?.count ?? 4)) continue;
      const choices = ['hook', 'arp'].filter(role => laneOf.has(role)
        && bars.slice(f.from - 1, f.to).some(b => b[role]?.notes?.some(n => n != null)));
      if (!choices.length) continue;
      const draw = rng.stream(`${f.role}:${f.from}`).next();
      const role = choices[Math.floor(draw * choices.length)];
      let effect = role === 'arp' ? 'stack' : 'pingpong';
      if (intensity) {
        const styleId = style.base || style.id || '';
        if (/lo-?fi|disco|funk|shibuya/.test(styleId)) effect = 'room';
        else if (['dreamy', 'nostalgic', 'bittersweet'].includes(options.mood)) effect = 'chorus';
        else if (['dark', 'moody', 'gothic'].includes(options.mood)) effect = 'echo';
      }
      // Short accents leave room for the hook; quiet sections can carry a longer texture.
      const quiet = ['intro', 'breakdown', 'middle8'].includes(typeOf(f));
      const a = intensity && !quiet ? Math.max(start(f), end(f) - 32) : start(f);
      requests.push({ role, f, a, z: end(f), effect, wetScale: intensity?.wet, origin: 'Automatic' });
      count++;
    }
  }
  if (config.mode !== 'off') for (const rule of inherited) {
    const peers = form.filter(f => typeOf(f) === rule.section);
    const matches = peers.filter((f, i) => i % Math.max(1, rule.occurrences || 1) === (rule.occurrence || 0));
    if (!matches.length) decisions.push({ role: rule.role, origin: 'Style preset', section: rule.section,
      status: 'Skipped', reason: 'No matching section in this form' });
    for (const f of matches) requests.push({ ...rule, f,
      a: start(f) + Math.round(rule.from * (end(f) - start(f))),
      z: start(f) + Math.round(rule.to * (end(f) - start(f))), origin: 'Style preset' });
  }
  for (const slot of ['first', 'second']) {
    const effect = config[`${slot}Effect`];
    if (effect === 'none') continue;
    const role = config[`${slot}Part`], which = config[`${slot}Section`], range = config[`${slot}Range`];
    const matches = form.filter(f => which === 'all' || typeOf(f) === which);
    if (!matches.length) decisions.push({ role, origin: `Rule ${slot === 'first' ? 1 : 2}`, section: which,
      status: 'Skipped', reason: 'No matching section in this form' });
    for (const f of matches) {
      let a = start(f), z = end(f);
      const half = a + Math.floor((f.to - f.from + 1) / 2) * 16;
      if (range === 'first') z = half;
      if (range === 'second') a = half;
      if (range === 'last2') a = Math.max(a, z - 32);
      requests.push({ role, f, a, z, effect, origin: `Rule ${slot === 'first' ? 1 : 2}` });
    }
  }
  for (const f of form) for (const [assignmentIndex, row] of (config.assignments?.[f.id] || []).entries()) {
    const [a, z] = sectionEffectRange(f, row.range);
    if (row.enabled === false) {
      decisions.push({ role: row.part, section: f.label, sectionId: f.id, assignmentIndex, origin: 'Section choice',
        from: barStepOf(a), to: barStepOf(z), chain: clone(row.chain), status: 'Disabled', reason: 'Assignment switched off' });
      continue;
    }
    requests.push({ role: row.part, f, a, z, chain: row.chain, effect: row.legacyEffect, assignmentIndex, origin: 'Section choice' });
  }
  for (const request of requests) {
    const { role, f, a, z, origin } = request;
    const lane = laneOf.get(role);
    const entry = { role, lane, origin, section: f.label || f.role, sectionId: f.id, assignmentIndex: request.assignmentIndex, chain: clone(request.chain), from: barStepOf(a), to: barStepOf(z), status: 'Skipped' };
    decisions.push(entry);
    if (!lane || !bars.slice(Math.floor(a / 16), Math.ceil(z / 16)).some(b => b[role]?.notes?.some(n => n != null))) {
      entry.reason = 'Part is absent or silent in this range'; continue;
    }
    const features = productionFeatures(bars.slice(f.from - 1, f.to).map(b => b[role]), voiceOfLane(mix, lane), bpm);
    const busy = features.density > 8 || features.space < 0.12;
    const chain = request.chain ? clone(request.chain) : sectionEffectPreset(request.effect, busy);
    if (origin === 'Automatic' && intensity) colourSectionChain(chain, options.mood);
    if (request.styled) {
      const strip = mix.lanes[lane] || {};
      const treatmentFamily = family(chain[0].id);
      if ((strip.effects || []).some(e => !e.bypass && !e.off && chain.some(effect => family(e.id) === family(effect.id)))) {
        entry.reason = 'This part already has the same kind of insert effect'; continue;
      }
      // Existing send ambience is kept; the extra section layer is deliberately quiet.
      const send = treatmentFamily === 'echo' ? strip.send?.delay : treatmentFamily === 'room' ? strip.send?.reverb : 0;
      for (const effect of chain) if (typeof effect.params?.wet === 'number') {
        effect.params.wet *= (send >= 0.25 ? 0.5 : 1) * (busy ? 0.65 : 1);
      }
    }
    if (!usable(chain) || z <= a) { entry.reason = 'No supported effect chain or playable range'; continue; }
    if (request.wetScale) for (const effect of chain) {
      if (typeof effect.params?.wet === 'number') effect.params.wet *= request.wetScale;
      if (effect.id === 'rhythmgate') effect.params.depth *= Math.min(1, request.wetScale);
      if (effect.id === 'gain') effect.params.gain *= Math.min(1, request.wetScale);
    }
    if (origin === 'Automatic' && intensity) {
      const returnMix = mix.fx?.delay;
      const send = returnMix?.mute ? 0 : (mix.lanes[lane]?.send?.delay || 0) * (returnMix?.level ?? 1);
      limitSectionEchoes(chain, { mode: config.mode, busy, send });
    }
    entry.chain = clone(chain);
    entry.effects = chain.map(e => e.id);
    if (origin === 'Automatic' && !request.styled && ((mix.lanes[lane]?.effects || []).some(e => !e.bypass && !e.off && ['echo', 'room'].includes(family(e.id)))
      || (mix.lanes[lane]?.send?.delay || 0) >= 0.25)) {
      entry.reason = 'Existing channel ambience already treats this part'; continue;
    }
    const laid = lay(auto, lane, a, z, chain, origin === 'Automatic' ? (request.styled ? 'compatible' : true) : false);
    auto = laid.auto; entry.ranges = laid.placed;
    if (laid.skips.length) entry.skips = laid.skips;
    entry.status = laid.placed.length ? 'Applied' : 'Skipped';
    entry.reason = !laid.placed.length ? 'Existing Spot FX occupy this range or the effect chain limit was reached'
      : request.styled ? request.treatment + (busy ? '; reduced wet level for a busy phrase' : '')
      : origin === 'Style preset' ? 'Adapted the saved part effect to the matching section'
      : origin === 'Section choice' && !request.legacyEffect ? 'Explicit section settings applied'
      : busy ? 'Tempo-locked repeats or treatment on a busy phrase; reduced wet level'
      : 'Treatment placed where this part plays';
    if (laid.skips.length) entry.reason += `; ${laid.skips.length} subranges skipped at the effect chain limit`;
    // A later deliberate rule may replace a previous effect family; make the
    // precedence visible rather than claiming every earlier decision still plays.
    if (laid.placed.length && origin !== 'Automatic') for (const previous of decisions.slice(0, -1)) {
      if (previous.lane !== lane || previous.status !== 'Applied' || !previous.from) continue;
      const pa = posOf(...previous.from), pz = posOf(...previous.to);
      if (a < pz && z > pa && previous.effects?.some(id => id !== 'gain' && chain.some(e => family(e.id) === family(id)))) {
        previous.reason += `; overlapping effects overridden by ${origin.toLowerCase()}`;
        if (a <= pa && z >= pz && previous.effects.filter(id => id !== 'gain').every(id => chain.some(e => family(e.id) === family(id)))) previous.status = 'Overridden';
      }
    }
  }
  return { automation: auto, report: { version: 1, mode: config.mode, decisions } };
}

export const SECTION_FX_PARTS = SECTION_FX_FIELDS.find(f => f.key === 'firstPart').options;
export const SECTION_FX_RANGES = SECTION_FX_FIELDS.find(f => f.key === 'firstRange').options;
export function sectionEffectRange(f, range = 'whole') {
  let a = start(f), z = end(f);
  const half = a + Math.floor((f.to - f.from + 1) / 2) * 16;
  if (range === 'first') z = half;
  if (range === 'second') a = half;
  if (range === 'last2') a = Math.max(a, z - 32);
  return [a, z];
}
/** Old rules retain their density-sensitive policy until a parameter is edited. */
export function expandSectionRules(config = {}, form) {
  const assignments = clone(config.assignments || {});
  for (const slot of ['first', 'second']) {
    const effect = config[`${slot}Effect`];
    if (!effect || effect === 'none') continue;
    for (const f of form) if (config[`${slot}Section`] === 'all' || typeOf(f) === config[`${slot}Section`]) {
      (assignments[f.id] ||= []).push({ part: config[`${slot}Part`] || 'hook', range: config[`${slot}Range`] || 'whole',
        presetId: `generic:${effect}`, legacyEffect: effect, enabled: true });
    }
  }
  return assignments;
}
export function normaliseSectionAssignments(raw, issues) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { issues.push('Section assignments must be keyed by section identity'); return out; }
  for (const [id, rows] of Object.entries(raw)) {
    if (!id || id.length > 160 || !Array.isArray(rows) || rows.length > MAX_EFFECTS) { issues.push('Invalid section identity or too many effect rows'); continue; }
    const valid = [];
    for (const row of rows) {
      if (!row || !SECTION_FX_PARTS.some(([p]) => p === row.part) || !SECTION_FX_RANGES.some(([r]) => r === row.range)) { issues.push('Invalid section effect part or range'); continue; }
      const legacy = SECTION_FX_PRESETS.some(([p]) => p !== 'none' && p === row.legacyEffect);
      if (!legacy && (!usable(row.chain) || row.chain.length > MAX_EFFECTS || !row.chain.every(e =>
        (e.params == null || (typeof e.params === 'object' && !Array.isArray(e.params))) && Object.entries(e.params || {}).every(([k,v]) => EFFECT_BY_ID[e.id].params.includes(k) && ((typeof v === 'number' && Number.isFinite(v)) || typeof v === 'boolean' || (typeof v === 'string' && v.length <= 128)))))) {
        issues.push('Invalid or oversized section effect chain'); continue;
      }
      valid.push({ part: row.part, range: row.range, enabled: row.enabled !== false,
        ...(typeof row.presetId === 'string' ? { presetId: row.presetId } : {}),
        ...(legacy ? { legacyEffect: row.legacyEffect } : { chain: clone(row.chain) }) });
    }
    if (valid.length) Object.defineProperty(out, id, { value: valid, enumerable: true, writable: true, configurable: true });
  }
  return out;
}
