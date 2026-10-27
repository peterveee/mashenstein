// A deliberately narrow undo path: only existing track gain/pan values may differ.
// Routing, automation, effects, voices and lane topology retain the full apply path.
const equal = (a, b) => {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length
    && keys.every(key => Object.hasOwn(b, key) && equal(a[key], b[key]));
};

export function channelLevelUndo(before, after) {
  const { lanes: oldLanes = {}, ...oldRest } = before;
  const { lanes: newLanes = {}, ...newRest } = after;
  if (!equal(oldRest, newRest) || !equal(Object.keys(oldLanes).sort(), Object.keys(newLanes).sort())) return null;
  const changes = [];
  for (const key of Object.keys(oldLanes)) {
    const { gain: oldGain = 0, pan: oldPan = 0, ...oldSettings } = oldLanes[key];
    const { gain = 0, pan = 0, ...settings } = newLanes[key];
    if (!equal(oldSettings, settings) || ![oldGain, oldPan, gain, pan].every(Number.isFinite)) return null;
    if (oldGain !== gain || oldPan !== pan) changes.push({ key,
      ...(oldGain !== gain ? { gain } : {}), ...(oldPan !== pan ? { pan } : {}) });
  }
  return changes;
}
