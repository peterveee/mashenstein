// MAKE A BANGER — Modify This Take. 3 Oct 2026.
//
// A take re-made with changed settings, keeping everything the change does not reach.
// Another Take is a new seed: every part is drawn again. Modify keeps the SEED, so the
// generator makes the same song part for part — the streams (index.js) see to that —
// except where the settings, or a part asked to be re-rolled, say otherwise. Comparing
// the two part by part says exactly what the change touched, and only that comes in.
//
// THREE VERSIONS OF EACH PART, compared by fingerprint:
//
//   base    what the generator wrote for this take (`banger.prints`, stored when it was
//           made — or, on an older banger, the take made again from its recipe)
//   current what the song plays now: the music above the marker WITH the desk's
//           arrangement layer over it, which is where hand edits live
//   next    what the generator writes with the new settings
//
// next == base: the change did not reach this part, so the CURRENT one stays — hand
// edits, mix, automation and all. next != base: the new part comes in, and if current
// != base too, a hand edit is replaced; that is said, not hidden (Peter's call, 3 Oct:
// the modification wins, and he is told).
//
// EVERY PART KEEPS ITS LANE. The desk keys everything by lane — a muted bar, a fader, an
// automation lane, a note effect — so a part that stays put on its lane takes all of that
// with it. A part the change adds gets a free lane of its own family. Lane NAMES are
// therefore never part of a fingerprint: the arp is the arp on lead5 or on lead6.
//
// The SHAPE has to match: the merge is slot for slot. A change of length or form moves
// every bar, and a song whose bars have been rearranged on the desk no longer lines up
// with the generator's — both are refused with a reason, and the caller offers a rebuild.
//
// AUTO PORTAMENTO IS A FIELD OF ITS OWN. It is one setting inside a lane's Note FX
// (`noteFx.portamento`), so it has its own fingerprint and its own merge: next == base keeps the
// setting the song has now (hand edits and all), next != base replaces THAT FIELD and nothing else
// on the strip — the fader, sends, EQ, effects, an arp or a strum and the automation stay — and a
// setting the new take no longer has is removed, said so, not left behind. A conflict with a hand
// edit is reported like any other. An older take's prints have no `expression`: that reads as "none".
//
// Browser-safe: no `node:*` imports.
import { hashStr } from '../../../src/engine/rng.js';
import { LANE_KEYS } from '../../../src/engine/lanes.js';
import { baseLane } from '../../../src/data/voices.js';
import { readAutoPortamento } from '../../../src/engine/auto-portamento.js';

/** A section's keys that belong to `lane`: the lane itself and its suffixed arrays (`leadLen`). */
export const laneKeysOf = (obj, lane) => Object.keys(obj || {})
  .filter((k) => k === lane || (k.startsWith(lane) && /^[A-Z]/.test(k.slice(lane.length))));

/** A lane's data with the lane's name taken out of it — `{ '': notes, Len: lengths }`. */
const anonymous = (obj, lane) => {
  const out = {};
  for (const k of laneKeysOf(obj, lane).sort()) out[k.slice(lane.length)] = obj[k];
  return out;
};

/**
 * The song as it plays, one entry per order slot: the composition with the arrangement
 * layer over it. `entry` is the order entry itself (a section index, or an object with
 * `s` and the per-bar edits), `sec` the section it plays.
 */
export function songSlots(bank, arrangement) {
  const sections = [...(bank?.sections || []), ...(arrangement?.sections || [])];
  const order = arrangement?.order || bank?.order || [];
  return order.filter((e) => e != null).map((entry) => ({
    entry, sec: sections[typeof entry === 'number' ? entry : entry.s] || {},
  }));
}

const print = (value) => hashStr(JSON.stringify(value ?? null)).toString(16);
const notesPrint = (slots, lane) => print(slots.map((s) => anonymous(s.sec, lane)));
const voicePrint = (mix, lane) => print([mix?.voice?.[`${lane}Voice`], mix?.voiceParams?.[`${lane}Voice`]]);
const autoPrint = (arrangement, lane) => print(arrangement?.automation?.[lane]);
const masterPrint = (mix, arrangement) => print([arrangement?.automation?.__master, mix?.masterEffects]);

/**
 * A lane's Auto Portamento as it PLAYS: the setting, normalised, where it is on; nothing where it
 * is off, absent, or amounts to nothing (Amount 0 selects no connection). So "no setting",
 * "switched off" and an unset strip are one state, and a setting written with its keys in another
 * order, or without its `version`, is the same as one that was not. A setting this build cannot
 * read (malformed, or a newer version's) is kept as it stands: it is somebody's, and must show up
 * as different rather than quietly read as off.
 */
function expressionOf(mix, lane) {
  const raw = mix?.lanes?.[lane]?.noteFx?.portamento;
  const { config, diagnostic } = readAutoPortamento(raw);
  if (diagnostic) return raw;
  return config.enabled && config.amount > 0 ? config : null;
}
const expressionPrint = (mix, lane) => print(expressionOf(mix, lane));
/** What an older take's prints say about a part's expression, which is nothing: no setting. */
const NO_EXPRESSION = print(null);
// Production is independent of the fader, pan, EQ and Note FX. A modification of
// Track Effects replaces only inserts/sends, including the planner's gain reserve.
const productionOf = (mix, lane) => ({ effects: mix?.lanes?.[lane]?.effects ?? null, send: mix?.lanes?.[lane]?.send ?? null });
const productionPrint = (mix, lane) => print(productionOf(mix, lane));
function setProduction(mix, lane, value) {
  const strip = (mix.lanes[lane] ||= {});
  for (const key of ['effects', 'send']) {
    if (value[key] == null) delete strip[key]; else strip[key] = structuredClone(value[key]);
  }
}

/** The setting as the song stores it, or null where the lane has none at all. */
const portamentoOf = (mix, lane) => mix?.lanes?.[lane]?.noteFx?.portamento ?? null;

/**
 * Set one lane's `noteFx.portamento` — or, given null, take it away — and touch nothing else: not the
 * strip, not the Note FX beside it. A Note FX left empty by the removal goes with it, as it would never
 * have been there.
 */
function setPortamento(mix, lane, setting) {
  if (setting == null) {
    const fx = mix.lanes?.[lane]?.noteFx;
    if (!fx) return;
    delete fx.portamento;
    if (!Object.keys(fx).length) delete mix.lanes[lane].noteFx;
    return;
  }
  const strip = (mix.lanes[lane] ||= {});
  strip.noteFx = { ...(strip.noteFx || {}), portamento: structuredClone(setting) };
}

/**
 * The fingerprints of a generated banger, by ROLE: what Modify compares against later.
 * `{ roles: { hook: { notes, voice, auto, expression } … }, master }`.
 */
export function bangerPrints({ bank, mix, arrangement, laneOf }) {
  const slots = songSlots(bank, arrangement);
  const roles = {};
  for (const [role, lane] of Object.entries(laneOf || {})) {
    roles[role] = {
      notes: notesPrint(slots, lane), voice: voicePrint(mix, lane), auto: autoPrint(arrangement, lane),
      expression: expressionPrint(mix, lane),
      production: productionPrint(mix, lane),
    };
  }
  return { roles, master: masterPrint(mix, arrangement) };
}

/** An order entry the generator could have written: a whole two-bar section from its top. */
const plain = (e) => typeof e === 'number' || ((e.bars == null || e.bars === 2) && !e.from);

/** A part's name for a sentence: its lane label's first half, or the role. */
const nameOf = (labels, lane, role) => (labels?.[lane] || role).split(' · ')[0];

/**
 * Merge `next` (the generator's new take, same seed) into `current` (the song as saved).
 *
 *   current  { bank, mix, arrangement, banger } — banger is the recipe the take was made by
 *   next     generateBanger's output for the new settings
 *   base     the take's own prints (`banger.prints`, or a re-made base's)
 *
 * Returns `{ ok: true, bank, mix, arrangement, banger, report }`, or `{ ok: false, reason }`
 * when the shapes do not line up.
 */
export function modifyBanger({ current, next, base }) {
  const curSlots = songSlots(current.bank, current.arrangement);
  const nextSlots = songSlots(next.bank, next.arrangement);
  if (curSlots.length !== nextSlots.length) {
    return { ok: false, reason: `the new settings make a song of ${nextSlots.length * 2} bars, and this take is ${curSlots.length * 2}` };
  }
  if (!curSlots.every((s) => plain(s.entry))) {
    return { ok: false, reason: 'this take\'s bars have been rearranged on the desk, so its parts no longer line up with the generator\'s' };
  }
  const oldLanes = current.banger?.laneOf || {};
  const newLanes = next.laneOf || {};
  const baseRoles = base?.roles || {};

  // ---- where each part goes: its own lane if it had one, a free one of its family if new
  const used = new Set([...Object.values(oldLanes), ...Object.keys(current.mix?.lanes || {}), ...(current.mix?.order || [])]);
  const lane = {};
  // `expression`: parts that were given an Auto Portamento setting or a different one; `expressionOff`:
  // parts whose setting the new take no longer has; `handEditedExpression`: those among them whose own
  // setting, changed on the desk, was replaced.
  const report = {
    added: [], removed: [], replaced: [], resounded: [], handEdited: [], kept: [], skipped: [],
    expression: [], expressionOff: [], handEditedExpression: [],
    production: [], handEditedProduction: [],
    sectionFx: [], handEditedSectionFx: [],
  };
  for (const role of Object.keys(newLanes)) {
    if (oldLanes[role]) { lane[role] = oldLanes[role]; continue; }
    const want = newLanes[role];
    // A lane of the same family: a desk lane, or a layer lane past them (lead7, lead8 …),
    // which is what the generator itself reaches for once the family's lanes are taken.
    const family = baseLane(want);
    const layered = Array.from({ length: 30 }, (_, i) => `${family}${i + 2}`);
    const free = !used.has(want) ? want
      : [...LANE_KEYS.filter((k) => baseLane(k) === family), ...layered].find((k) => !used.has(k));
    if (!free) { report.skipped.push(nameOf(next.mix?.labels, want, role)); continue; }
    lane[role] = free;
    used.add(free);
  }

  // ---- what happens to each part
  const plan = [];
  for (const role of new Set([...Object.keys(oldLanes), ...Object.keys(newLanes)])) {
    const from = newLanes[role];
    const to = lane[role];
    if (!from) { plan.push({ role, act: 'remove', to: oldLanes[role] }); continue; }
    if (!to) continue;
    if (!oldLanes[role]) { plan.push({ role, act: 'add', from, to }); continue; }
    const b = baseRoles[role] || {};
    const notes = notesPrint(nextSlots, from) !== b.notes;
    const voice = voicePrint(next.mix, from) !== b.voice;
    const auto = autoPrint(next.arrangement, from) !== b.auto;
    const edited = notes && notesPrint(curSlots, to) !== b.notes;
    // Auto Portamento, field by field. `change` is set only where the new take's setting differs from the
    // one this take was generated with; `now` is what the song says today, kept for a part whose whole
    // strip is swapped below (a new sound) and whose setting the change did not reach.
    const was = b.expression ?? NO_EXPRESSION;
    const fresh = expressionOf(next.mix, from);
    const change = print(fresh) !== was
      ? { setting: portamentoOf(next.mix, from), on: fresh != null, edited: expressionPrint(current.mix, to) !== was } : null;
    const producing = [current.banger?.options?.production?.mode, next.banger?.options?.production?.mode]
      .some(mode => mode && mode !== 'style');
    const freshProduction = productionOf(next.mix, from);
    // Older fingerprints have no production field. Only an explicit opt-in reaches
    // their strips; unrelated modifications must preserve their hand edits.
    const production = producing && (b.production !== undefined
      ? print(freshProduction) !== b.production
      : next.banger?.options?.production?.mode !== (current.banger?.options?.production?.mode || 'style'))
      ? { setting: freshProduction, edited: b.production !== undefined && productionPrint(current.mix, to) !== b.production } : null;
    plan.push({ role, act: 'keep', from, to, notes, voice, auto, edited, editedAuto: auto && autoPrint(current.arrangement, to) !== b.auto, expression: change,
      production, nowProduction: productionOf(current.mix, to), now: portamentoOf(current.mix, to) });
  }

  // ---- the music: the song as it plays, with the changed parts written over it
  const sections = curSlots.map((slot, i) => {
    const sec = { ...slot.sec };
    const fresh = nextSlots[i].sec;
    for (const p of plan) {
      if (p.act === 'remove' || p.act === 'add' || p.notes) for (const k of laneKeysOf(sec, p.to)) delete sec[k];
      if (p.act === 'add' || p.notes) {
        for (const k of laneKeysOf(fresh, p.from)) sec[p.to + k.slice(p.from.length)] = fresh[k];
      }
    }
    return sec;
  });
  const bank = { ...current.bank, bpm: next.bank.bpm, sections, order: sections.map((_, i) => i) };
  for (const p of plan) {
    if (p.act === 'remove') for (const k of laneKeysOf(bank, p.to)) delete bank[k];
    if (p.act === 'add') for (const k of laneKeysOf(next.bank, p.from)) bank[p.to + k.slice(p.from.length)] = next.bank[k];
  }

  // ---- the mix: the desk's, with new parts' strips added and re-sounded parts' strips swapped
  const mix = structuredClone(current.mix || {});
  for (const key of ['lanes', 'voice', 'labels']) mix[key] ||= {};
  const take = (p) => {
    mix.lanes[p.to] = structuredClone(next.mix.lanes?.[p.from] ?? {});
    mix.voice[`${p.to}Voice`] = next.mix.voice?.[`${p.from}Voice`];
    const params = next.mix.voiceParams?.[`${p.from}Voice`];
    if (params !== undefined) (mix.voiceParams ||= {})[`${p.to}Voice`] = structuredClone(params);
    else if (mix.voiceParams) delete mix.voiceParams[`${p.to}Voice`];
    mix.labels[p.to] = next.mix.labels?.[p.from];
  };
  for (const p of plan) {
    if (p.act === 'remove') {
      delete mix.lanes[p.to]; delete mix.voice[`${p.to}Voice`]; delete mix.labels[p.to];
      if (mix.voiceParams) delete mix.voiceParams[`${p.to}Voice`];
      if (mix.order) mix.order = mix.order.filter((k) => k !== p.to);
      if (mix.layers) mix.layers = mix.layers.filter((l) => l.key !== p.to && l.from !== p.to);
    } else if (p.act === 'add') {
      take(p);
      if (mix.order && !mix.order.includes(p.to)) {
        // In the place the generator gave it: after the part it follows in the new take.
        const at = (next.mix.order || []).indexOf(p.from);
        const before = (next.mix.order || []).slice(0, Math.max(0, at)).reverse()
          .map((k) => plan.find((q) => q.from === k)?.to).find((k) => k && mix.order.includes(k));
        mix.order.splice(before ? mix.order.indexOf(before) + 1 : mix.order.length, 0, p.to);
      }
      for (const l of next.mix.layers || []) {
        if (l.key !== p.from) continue;
        const src = plan.find((q) => q.from === l.from)?.to || l.from;
        (mix.layers ||= []).push({ ...l, key: p.to, from: src });
      }
      // A layer lane the generator did not make a layer (a desk lane) needs no entry; one
      // moved off the generator's layer lane onto another needs one of its own.
      if (!LANE_KEYS.includes(p.to) && !(mix.layers || []).some((l) => l.key === p.to)) {
        (mix.layers ||= []).push({ key: p.to, from: baseLane(p.to), independent: true });
      }
    } else if (p.voice) take(p);
  }
  // Auto Portamento last, so it has the final word over a strip that was just swapped for a new sound:
  // a setting the change reached comes in as that one field (or goes, if the new take has none); one it
  // did not reach is the song's own, which the swap must not lose. Nothing else on a strip is read here.
  for (const p of plan) {
    if (p.act !== 'keep') continue;
    if (p.production) setProduction(mix, p.to, p.production.setting);
    else if (p.voice && [current.banger?.options?.production?.mode, next.banger?.options?.production?.mode].some(mode => mode && mode !== 'style')) {
      setProduction(mix, p.to, p.nowProduction);
    }
    if (p.expression) setPortamento(mix, p.to, p.expression.on ? p.expression.setting : null);
    else if (p.voice) setPortamento(mix, p.to, p.now);
  }
  if (masterPrint(next.mix, next.arrangement) !== base?.master && next.mix.masterEffects) {
    mix.masterEffects = structuredClone(next.mix.masterEffects);
  }

  // ---- the arrangement: the desk's own settings, its music now folded into the bank
  const arrangement = structuredClone(current.arrangement || {});
  delete arrangement.sections;
  delete arrangement.order;
  const auto = (arrangement.automation ||= {});
  for (const p of plan) {
    if (p.act === 'remove') delete auto[p.to];
    else if (p.act === 'add' || p.auto) {
      const a = next.arrangement?.automation?.[p.from];
      if (a) auto[p.to] = structuredClone(a); else delete auto[p.to];
    }
  }
  if (masterPrint(next.mix, next.arrangement) !== base?.master) {
    const m = next.arrangement?.automation?.__master;
    if (m) auto.__master = structuredClone(m); else delete auto.__master;
  }
  if (!arrangement.loop && next.arrangement?.loop) arrangement.loop = structuredClone(next.arrangement.loop);

  // ---- the report, and the recipe the take now answers to
  for (const p of plan) {
    const name = nameOf(p.act === 'remove' ? current.mix?.labels : next.mix?.labels, p.act === 'remove' ? p.to : p.from, p.role);
    if (p.act === 'add') report.added.push(name);
    else if (p.act === 'remove') report.removed.push(name);
    else if (p.notes) { report.replaced.push(name); if (p.edited) report.handEdited.push(name); }
    else if (p.voice) report.resounded.push(name);
    else report.kept.push(name);
    // A slide setting the change set, changed or took away — named beside whatever else happened to the part.
    if (p.act === 'keep' && p.expression) {
      (p.expression.on ? report.expression : report.expressionOff).push(name);
      if (p.expression.edited) report.handEditedExpression.push(name);
    }
    if (p.act === 'keep' && p.production) {
      report.production.push(name);
      if (p.production.edited) report.handEditedProduction.push(name);
    }
    if (p.act === 'keep' && p.auto) {
      report.sectionFx.push(name);
      if (p.editedAuto) report.handEditedSectionFx.push(name);
    }
  }
  const laneOf = {};
  for (const role of Object.keys(newLanes)) if (lane[role]) laneOf[role] = lane[role];
  const banger = { ...next.banger, laneOf };
  if (banger.sectionEffects) banger.sectionEffects = { ...banger.sectionEffects,
    decisions: banger.sectionEffects.decisions.map(e => ({ ...e, lane: lane[e.role] || e.lane })) };
  if (banger.report) {
    const remap = entries => (entries || []).map(e => ({ ...e,
      lane: lane[e.role] || lane[Object.keys(newLanes).find(role => newLanes[role] === e.lane)] }))
      .filter(e => e.lane);
    banger.report = { ...banger.report, lanes: remap(banger.report.lanes),
      expression: remap(banger.report.expression), levels: remap(banger.report.levels), lastModify: structuredClone(report) };
  }
  if (banger.trackEffects) {
    const remap = entries => entries.map(e => ({ ...e, lane: lane[e.role] || e.lane }));
    banger.trackEffects = { ...banger.trackEffects, roles: remap(banger.trackEffects.roles), applied: remap(banger.trackEffects.applied) };
  }
  return { ok: true, bank, mix, arrangement, banger, report };
}

/** The report as one line for a toast. */
export function describeModify(report) {
  const bits = [];
  if (report.added.length) bits.push(`added ${report.added.join(', ')}`);
  if (report.replaced.length) bits.push(`rewrote ${report.replaced.join(', ')}`);
  if (report.resounded.length) bits.push(`new sound on ${report.resounded.join(', ')}`);
  if (report.expression?.length) bits.push(`Auto Portamento set on ${report.expression.join(', ')}`);
  if (report.expressionOff?.length) bits.push(`Auto Portamento taken off ${report.expressionOff.join(', ')}`);
  if (report.production?.length) bits.push(`Track Effects changed on ${report.production.join(', ')}`);
  if (report.handEditedProduction?.length) bits.push(`replaced edited effects on ${report.handEditedProduction.join(', ')}`);
  if (report.sectionFx?.length) bits.push(`Spot FX / automation changed on ${report.sectionFx.join(', ')}`);
  if (report.handEditedSectionFx?.length) bits.push(`replaced edited automation on ${report.handEditedSectionFx.join(', ')}`);
  if (report.removed.length) bits.push(`took out ${report.removed.join(', ')}`);
  if (!bits.length) return 'nothing in the music changed';
  return `${bits.join(' · ')} — ${report.kept.length} part${report.kept.length === 1 ? '' : 's'} kept as they were`;
}
