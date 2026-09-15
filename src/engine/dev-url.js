import { CABINETS } from '../data/cabinets.js';

export function devFinishStartPercent(stage, leadSeconds = 5) {
  const duration = (stage && stage.durationSec) || 330;
  return Math.max(0.01, Math.min(0.99, 1 - leadSeconds / duration));
}

// Resolve the stage part of a dev URL. The compact form is cabinet number
// followed by stage number, using the same order as the cabinet registry:
// `stage=3-3` means the third cabinet's third stage.
export function devStageRoute(params) {
  const requested = params.get('stage') || params.get('level');
  const compact = /^(\d+)-(\d+)$/.exec(requested || '');

  if (!compact) {
    return { cabId: params.get('cab'), stageId: requested };
  }

  const cabinetNumber = Number(compact[1]);
  const stageNumber = Number(compact[2]);
  const cabinet = CABINETS[cabinetNumber - 1];
  if (!cabinet || stageNumber < 1) return { cabId: null, stageId: null };

  return {
    cabId: cabinet.id,
    stageId: `${cabinet.id}-${stageNumber}`,
  };
}
