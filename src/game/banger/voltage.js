import { energyOf } from '../../../tools/lib/banger/energy.js';
import { normaliseTrackEffects } from '../../../tools/lib/banger/production.js';

export const BANGER_VOLTAGES = Object.freeze([
  Object.freeze({ level: 0, label: 'Safe', goWild: 'Off', variation: 'faithful', wild: false, energy: 'lean', production: 'style', sectionFx: 'style',
    helper: 'Strict adherence to base formula' }),
  Object.freeze({ level: 1, label: 'Charged', goWild: 'Off', variation: 'faithful', wild: false, energy: 'full', production: 'subtle', sectionFx: 'subtle',
    helper: 'Boosts rhythm energy with light effects' }),
  Object.freeze({ level: 2, label: 'Surge', goWild: 'Medium', variation: 'some', wild: false, energy: 'huge', production: 'adventurous', sectionFx: 'expressive',
    helper: 'Alters pattern structures & twists effects' }),
  Object.freeze({ level: 3, label: 'Overload', goWild: 'Full', variation: 'wild', wild: true, energy: 'maximum', production: 'overhaul', sectionFx: 'wild', bpmBoost: 4,
    helper: 'Maximum chaos & wild FX' }),
]);

export function voltageLevel(value) {
  const level = Number(value);
  return Number.isInteger(level) && level >= 0 && level < BANGER_VOLTAGES.length ? level : null;
}

export function voltageSettings(value) {
  return BANGER_VOLTAGES[voltageLevel(value) ?? 1];
}

export function voltageFor(options = {}) {
  const explicit = voltageLevel(options.voltage);
  if (explicit !== null) return explicit;
  if (options.energy == null && options.production == null && options.variation == null && typeof options.wild !== 'boolean') return 1;

  const energy = energyOf(options.energy);
  const production = normaliseTrackEffects(options.production).mode;
  const variation = ['faithful', 'some', 'more', 'wild'].includes(options.variation)
    ? options.variation : (options.wild === true ? 'wild' : null);
  return BANGER_VOLTAGES.reduce((best, preset) => {
    const score = (variation && preset.variation !== variation ? 4 : 0)
      + (options.wild === true && !preset.wild ? 3 : options.wild !== true && preset.wild ? 1 : 0)
      + (options.energy != null && preset.energy !== energy ? 1 : 0)
      + (options.production != null && preset.production !== production ? 1 : 0);
    return score < best.score ? { level: preset.level, score } : best;
  }, { level: 1, score: Infinity }).level;
}
