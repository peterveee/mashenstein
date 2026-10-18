// Pure helpers for authoring and snapshotting Gravity Grid encounters.
import { isGateField } from '../../data/gravity-stages.js';
export const VACUUM_SUCTION_SECONDS = 1.5;
export const VACUUM_LOADED_SECONDS = 0.4;
export const VACUUM_WARNING_SECONDS = 0.55;
export const VACUUM_PREP_SECONDS = VACUUM_SUCTION_SECONDS + VACUUM_LOADED_SECONDS + VACUUM_WARNING_SECONDS;
export const VACUUM_SOURCE_LEAD_SECONDS = 1;
export const VACUUM_SHOT_SPEED = 32;

export function vacuumAttackPhase(attack, seconds) {
  if (seconds >= attack.at) return { phase: 'launched', progress: 1 };
  const elapsed = seconds - (attack.at - VACUUM_PREP_SECONDS);
  if (elapsed < 0) return { phase: 'waiting', progress: 0 };
  if (elapsed < VACUUM_SUCTION_SECONDS) {
    return { phase: 'suction', progress: elapsed / VACUUM_SUCTION_SECONDS };
  }
  if (elapsed < VACUUM_SUCTION_SECONDS + VACUUM_LOADED_SECONDS) {
    return { phase: 'loaded', progress: (elapsed - VACUUM_SUCTION_SECONDS) / VACUUM_LOADED_SECONDS };
  }
  if (elapsed < VACUUM_PREP_SECONDS) {
    return { phase: 'telegraph', progress: (elapsed - VACUUM_SUCTION_SECONDS - VACUUM_LOADED_SECONDS) / VACUUM_WARNING_SECONDS };
  }
  return { phase: 'launched', progress: 1 };
}
export function gravityStageDataFor(stage, registry, durationSec) {
  const data = registry[stage?.id] || registry['gravity-1'];
  const errors = validateGravityStageData(data, durationSec);
  if (errors.length) throw new Error(`Invalid Gravity Grid stage ${stage?.id || '(default)'}: ${errors.join('; ')}`);
  return data;
}

export function gravityMissionStateFor(data, previous = null) {
  const ids = new Set((data.sequences || []).map(s => s.id));
  return { completed: [...new Set(previous?.completed || [])].filter(id => ids.has(id)) };
}

export function gravitySeconds(distance, speed) {
  return Math.max(0, (Number(distance) || 0) / Math.max(1, Number(speed) || 0));
}

export function gravityWorldX(seconds, playerX, speed) {
  return playerX + seconds * speed;
}

export function validateGravityStageData(data, durationSec) {
  const errors = [];
  if (!data || !(Number(durationSec) > 0)) return ['resolved layout duration must be positive'];
  const inside = (n) => Number.isFinite(n) && n >= 0 && n <= durationSec;
  const unique = (items, label) => {
    const ids = new Set();
    for (const item of items || []) {
      if (!item.id || ids.has(item.id)) errors.push(`${label} IDs must be present and unique`);
      ids.add(item.id);
    }
    return ids;
  };
  let lastGate = -Infinity;
  for (const gate of data.gates || []) {
    if (!inside(gate.at) || gate.at < lastGate) errors.push('gates must be time-ordered within the stage');
    if (gate.lane !== 0 && gate.lane !== 1) errors.push('gate lane must be 0 or 1');
    lastGate = gate.at;
  }
  unique(data.hazards, 'Hazard');
  for (const h of data.hazards || []) {
    if (!inside(h.at)) errors.push(`hazard ${h.id} is outside the stage`);
    if (h.lane !== 0 && h.lane !== 1) errors.push(`hazard ${h.id} lane must be 0 or 1`);
  }
  unique(data.vacuumAttacks, 'Vacuum attack');
  let lastVacuumAt = -Infinity;
  for (const attack of data.vacuumAttacks || []) {
    if (!inside(attack.at) || attack.at <= lastVacuumAt) errors.push(`vacuum attack ${attack.id} has invalid timing`);
    if (attack.lane !== 0 && attack.lane !== 1) errors.push(`vacuum attack ${attack.id} lane must be 0 or 1`);
    if (attack.sourceLane !== 1 - attack.lane) errors.push(`vacuum attack ${attack.id} must draw debris from the opposite rail`);
    lastVacuumAt = attack.at;
  }
  for (const gate of data.gates || []) {
    const transferSpike = (data.hazards || []).some((h) => (isGateField(h.type) || h.type === 'maintenanceRollers')
      && h.lane === 1 - gate.lane && h.at > gate.at && h.at <= gate.at + 1.8);
    if (!transferSpike) errors.push(`gate at ${gate.at} needs a spike on the rail it leaves`);
  }
  unique(data.sequences, 'Sequence');
  let lastEnd = -Infinity;
  for (const sequence of data.sequences || []) {
    if (!inside(sequence.start) || !inside(sequence.end) || sequence.end <= sequence.start
      || sequence.start <= lastEnd) errors.push(`sequence ${sequence.id} has invalid timing`);
    lastEnd = sequence.end;
  }
  if (data.gravity != null && !(data.gravity > 0 && data.gravity <= 1)) errors.push('invalid gravity scale');
  for (const h of data.hazards || []) if (h.span != null
    && (!(h.span > 0) || !inside(h.at + h.span))) errors.push(`invalid span for ${h.id}`);
  for (const cp of data.checkpoints || []) if (!inside(cp)) errors.push(`checkpoint ${cp} is outside the stage`);
  return errors;
}
