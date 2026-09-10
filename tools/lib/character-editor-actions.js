import { HERO_BY_ID } from '../../src/data/heroes.js';

// Attack previews are adapters over the existing painter actions. The editor
// never invents a second weapon drawing: it supplies the same menuAction and
// timer fields used by gameplay and gallery renders.
const ACTIONS = Object.freeze({
  bow: { key: 'bow', label: 'Longbow draw', duration: 1.1, release: .5 },
  wrench: { key: 'wrench', label: 'Pipe wrench throw', duration: .8, release: .56 },
  axe: { key: 'axe', label: 'Returning axe throw', duration: .8, release: .56 },
  bundle: { key: 'bundle', label: 'Cane bundle throw', duration: .8, release: .198 },
  shoot: { key: 'shoot', label: 'Shoot', duration: .8, release: .3 },
  fist: { key: 'fist', label: 'Rocket fist throw', duration: .8, release: .3 },
});

function abilityType(id) { return HERO_BY_ID[id]?.ability?.type || null; }

export function actionOptions(id, spec = {}) {
  const candidates = [spec.ranged, spec.bundle ? 'bundle' : null, spec.axeThrow ? 'axe' : null, (spec.cannon || spec.pistol || spec.kiblast) ? 'shoot' : null, abilityType(id)];
  const type = candidates.find((candidate) => candidate && ACTIONS[candidate]);
  const action = ACTIONS[type];
  return action ? [{ ...action }] : [];
}

export function actionFor(id, spec = {}, key = null) {
  const options = actionOptions(id, spec);
  return options.find((item) => item.key === key) || options[0] || null;
}

export function actionPose(basePose, descriptor, phase = 0) {
  if (!descriptor) return basePose;
  const q = Math.max(0, Math.min(1, Number(phase) || 0));
  const elapsed = q * descriptor.duration;
  const released = elapsed >= descriptor.release;
  const pose = {
    ...basePose,
    kind: 'run',
    grounded: true,
    menuAction: descriptor.key === 'fist' ? undefined : 'aim',
    actionTime: elapsed,
  };
  if (descriptor.key === 'axe') pose.axeThrown = released;
  if (descriptor.key === 'wrench') pose.wrenchThrown = released;
  if (descriptor.key === 'bundle') pose.axeThrown = released;
  if (descriptor.key === 'fist') {
    pose.headless = released;
    pose.fistThrown = released;
    pose.menu = true;
  }
  return pose;
}
