// Musical, section-relative Spot FX. Normal desk automation, editable after generation.
import { laneFx, replaceFxRange, posOf, barStepOf } from '../../../src/data/automation.js';
import { expandOrder } from '../../../src/data/arrangements.js';
import { SECTION_EFFECTS } from '../../../src/engine/effects.js';
import { typeOf as sectionType } from './form-types.js';
import { productionFeatures } from './production.js';
import { voiceOfLane } from './expression.js';

const clone = structuredClone;
const supported = new Set(SECTION_EFFECTS.map(e => e.id));
const family = id => ['delay', 'pingpong', 'chandelay'].includes(id) ? 'echo'
  : ['reverb', 'ambience'].includes(id) ? 'room' : id;
const usable = chain => Array.isArray(chain) && chain.length && chain.every(e => supported.has(e.id));
export const SECTION_FX_PRESETS = [
  ['none', 'None'], ['pingpong', 'Ping-Pong Echo'], ['stack', 'Arp Echo Layers'],
  ['echo', 'Dotted Echo'], ['room', 'Short Room'], ['chorus', 'Stereo Chorus'],
];
export const SECTION_FX_DEFAULTS = { mode: 'style',
  firstEffect: 'none', firstPart: 'hook', firstSection: 'intro', firstRange: 'whole',
  secondEffect: 'none', secondPart: 'arp', secondSection: 'drop', secondRange: 'whole' };
export const SECTION_FX_FIELDS = [
  { key: 'mode', label: 'Section choices', type: 'select', options: [
    ['off', 'Manual Only', 'Use only the two rules below'],
    ['style', 'Style Presets', 'Use the part Spot FX saved with Use as Style'],
    ['auto', 'Style + Automatic', 'Also choose suitable section treatments for leads and arps'],
  ] },
  ...['first', 'second'].flatMap((slot, i) => [
    { key: `${slot}Effect`, label: `Rule ${i + 1} · Effect`, type: 'select', options: SECTION_FX_PRESETS,
      title: 'A deliberate effect, even on busy phrases. Arp Echo Layers uses quieter dotted-eighth repeats to overlap different notes of an arp.' },
    { key: `${slot}Part`, label: `Rule ${i + 1} · Part`, type: 'select', options: [
      ['hook', 'Main Lead'], ['arp', 'Arp'], ['counter', 'Counter Melody'], ['saws', 'Chords'],
      ['pad', 'Pad'], ['piano', 'Piano'], ['bell', 'Bell'], ['square', 'Square Lead'], ['megaSaw', 'Octave Lead'], ['choir', 'Choir'],
    ] },
    { key: `${slot}Section`, label: `Rule ${i + 1} · Section`, type: 'select', options: [
      ['intro', 'Intro'], ['verse', 'Verse'], ['chorus', 'Chorus'], ['drop', 'Drop'],
      ['build', 'Build'], ['breakdown', 'Breakdown'], ['middle8', 'Middle 8'], ['outro', 'Outro'], ['all', 'Every Section'],
    ] },
    { key: `${slot}Range`, label: `Rule ${i + 1} · Where`, type: 'select', options: [
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
  const placed = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const from = edges[i], to = edges[i + 1];
    const old = existing.find(s => s.from <= from && s.to >= to)?.chain || [];
    if (automatic && old.length) continue;
    const kinds = new Set(chain.map(e => family(e.id)));
    const merged = [...old.filter(e => !kinds.has(family(e.id))), ...clone(chain)];
    auto = replaceFxRange(auto, lane, from, to, [{ from, to, chain: merged }]);
    placed.push([barStepOf(from), barStepOf(to)]);
  }
  return { auto, placed };
}

export function applySectionEffects({ automation, options, style, form, bars, laneOf, mix, bpm, rng }) {
  const config = { ...SECTION_FX_DEFAULTS, ...options.sectionFx };
  let auto = automation;
  const decisions = [];
  const inherited = style.sectionFx?.version === 1 ? style.sectionFx.rules || [] : [];
  const requests = [];
  // Automatic goes first, followed by style presets and finally deliberate rules.
  // One automatic part per section, at most four sections, on an independent stream.
  if (config.mode === 'auto') {
    let count = 0;
    for (const f of form) {
      if (!['intro', 'verse', 'chorus', 'drop', 'breakdown', 'middle8'].includes(typeOf(f)) || count >= 4) continue;
      const choices = ['hook', 'arp'].filter(role => laneOf.has(role)
        && bars.slice(f.from - 1, f.to).some(b => b[role]?.notes?.some(n => n != null)));
      if (!choices.length) continue;
      const draw = rng.stream(`${f.role}:${f.from}`).next();
      const role = choices[Math.floor(draw * choices.length)];
      requests.push({ role, f, a: start(f), z: end(f), effect: role === 'arp' ? 'stack' : 'pingpong', origin: 'Automatic' });
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
  for (const request of requests) {
    const { role, f, a, z, origin } = request;
    const lane = laneOf.get(role);
    const entry = { role, lane, origin, section: f.label || f.role, from: barStepOf(a), to: barStepOf(z), status: 'Skipped' };
    decisions.push(entry);
    if (!lane || !bars.slice(Math.floor(a / 16), Math.ceil(z / 16)).some(b => b[role]?.notes?.some(n => n != null))) {
      entry.reason = 'Part is absent or silent in this range'; continue;
    }
    const features = productionFeatures(bars.slice(f.from - 1, f.to).map(b => b[role]), voiceOfLane(mix, lane), bpm);
    const busy = features.density > 8 || features.space < 0.12;
    const chain = request.chain || sectionEffectPreset(request.effect, busy);
    if (!usable(chain) || z <= a) { entry.reason = 'No supported effect chain or playable range'; continue; }
    entry.effects = chain.map(e => e.id);
    if (origin === 'Automatic' && ((mix.lanes[lane]?.effects || []).some(e => !e.bypass && !e.off && ['echo', 'room'].includes(family(e.id)))
      || (mix.lanes[lane]?.send?.delay || 0) >= 0.25)) {
      entry.reason = 'Existing channel ambience already treats this part'; continue;
    }
    const laid = lay(auto, lane, a, z, chain, origin === 'Automatic');
    auto = laid.auto; entry.ranges = laid.placed;
    entry.status = laid.placed.length ? 'Applied' : 'Skipped';
    entry.reason = !laid.placed.length ? 'Existing Spot FX occupy this range'
      : origin === 'Style preset' ? 'Adapted the saved part effect to the matching section'
      : busy ? 'Tempo-locked repeats or treatment on a busy phrase; reduced wet level'
      : 'Treatment placed where this part plays';
    // A later deliberate rule may replace a previous effect family; make the
    // precedence visible rather than claiming every earlier decision still plays.
    if (laid.placed.length && origin !== 'Automatic') for (const previous of decisions.slice(0, -1)) {
      if (previous.lane !== lane || previous.status !== 'Applied' || !previous.from) continue;
      const pa = posOf(...previous.from), pz = posOf(...previous.to);
      if (a < pz && z > pa && previous.effects?.some(id => id !== 'gain' && chain.some(e => family(e.id) === family(id)))) {
        previous.reason += `; overlapping effects overridden by ${origin.toLowerCase()}`;
        if (a <= pa && z >= pz) previous.status = 'Overridden';
      }
    }
  }
  return { automation: auto, report: { version: 1, mode: config.mode, decisions } };
}
