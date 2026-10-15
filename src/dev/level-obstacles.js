// Which obstacle types each level can actually deal, worked out from the same
// data the run reads — so the lab's one-row-per-level sheet (15 Oct 2026) shows
// what ships and cannot drift from it:
//   - the lane's random bank: cabinetForStage(...).patterns (Corporate Kombat's
//     per-floor furniture included), cut to the tier the run opens it at
//     (run.js: min(2, stage index - 1 + act - 1)) and to each section's
//     tierCap/exclude from data/stage-layouts.js;
//   - a beat-locked rhythm stage's chart instead (beatchart.js ACTION_TYPES);
//   - a Gravity Grid campaign stage's authored hazards (data/gravity-stages.js).
// Holes (`gap`) and boost pads are left out: neither is a thing in the lane to
// line up. A mission or challenge that PLACES its targets (`at`, e.g. office-2's
// fire alarms, office-3's safes) is listed separately as `placed`.
import { CABINET_BY_ID, cabinetForStage } from '../data/cabinets.js';
import { resolveLayout } from '../game/layout.js';
import { OBSTACLES } from '../game/entities.js';
import { GRAVITY_STAGE_DATA } from '../data/gravity-stages.js';

const ACTION_TYPES = { jump: 'beatBar', slide: 'drone', ability: null, pit: 'gap' };
const lineable = (type) => type && type !== 'gap' && OBSTACLES[type] && !OBSTACLES[type].isBoost;

export function levelPlacedTypes(stage) {
  return [...new Set([stage.mission, stage.challenge]
    .filter((m) => m?.targetType && m.at && lineable(m.targetType)).map((m) => m.targetType))];
}

export function levelObstacleTypes(stage) {
  const cabinet = CABINET_BY_ID[stage.cabinet];
  const out = new Set();
  const add = (type) => { if (lineable(type)) out.add(type); };
  const gravity = GRAVITY_STAGE_DATA[stage.id];
  if (gravity) {
    for (const h of gravity.hazards || []) add(h.type);
    return [...out];
  }
  const chart = cabinet.mechanic === 'beat' ? cabinet.beatCharts?.[stage.index] : null;
  if (chart) {
    for (const e of chart.events || []) if (e.action !== 'coin') add(e.type || ACTION_TYPES[e.action]);
    return [...out];
  }
  const { patterns } = cabinetForStage(cabinet, stage.index);
  const tierMax = Math.min(2, stage.index - 1 + cabinet.act - 1);
  const sections = resolveLayout(stage, cabinet)?.sections || [{ tierCap: null, exclude: null }];
  for (const section of sections) {
    const cap = section.tierCap != null ? Math.min(tierMax, section.tierCap) : tierMax;
    for (const p of patterns) {
      if (p.tier > cap) continue;
      if (section.exclude && p.cells.some((c) => section.exclude.has(c.t))) continue;
      // A rotation slot (Terminal Velocity's dark-level cat) deals each of its list.
      for (const c of p.cells) for (const t of cabinet.rotations?.[c.t]?.list || [c.t]) add(t);
    }
  }
  return [...out];
}
