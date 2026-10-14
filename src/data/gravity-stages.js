// Authored gameplay data for the Gravity Grid campaign replacement.
// Positions are seconds of camera travel, converted by GravityRunState using
// the stage's fixed base speed. Artwork reads this data but never owns it.
const gate = (at, lane) => ({ at, lane });
const hazard = (id, at, lane, type) => ({ id, at, lane, type });
// The field left on the rail behind every gate. Since 13 Oct 2026 it is the
// station's own pair (sprites/gravityProps.js) taking turns, `first` choosing
// which opens the level so the three levels do not all start the same.
export const GATE_FIELD_TYPES = Object.freeze(['plasmaVents', 'magClamps']);
export const isGateField = (type) => GATE_FIELD_TYPES.includes(type);
const forcedTransferSpikes = (prefix, gates, first = 0, delay = 1.25) => gates.map((g, i) =>
  hazard(`${prefix}-spikes-${i + 1}`, g.at + delay, 1 - g.lane, GATE_FIELD_TYPES[(i + first) % 2]));
const runGates = [gate(5, 1), gate(13, 0), gate(18.5, 1), gate(29, 0), gate(37, 1), gate(45, 0), gate(54, 1), gate(63, 0), gate(72, 1), gate(78, 0)];
const maintenanceGates = [gate(18, 1), gate(28, 0), gate(49, 1), gate(61, 0), gate(80, 1), gate(90, 0)];
const attack = (id, at, lane, type, span) => ({ id, at, lane, type, ...(span ? { span } : {}) });
const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
};

export const GRAVITY_STAGE_DATA = deepFreeze({
  'gravity-1': {
    gates: runGates,
    hazards: [
      ...forcedTransferSpikes('run', runGates, 0),
      hazard('intro-crate', 2, 0, 'foilCrate'), hazard('deck-laser', 10, 1, 'weldingDrone'),
      hazard('airlock-rack', 18, 0, 'coolantRadiator'), hazard('hull-cargo', 26, 1, 'fuelCell'),
      hazard('service-laser', 34, 0, 'looseToolkit'), hazard('dish-rack', 42, 1, 'valveManifold'),
      hazard('dish-crate', 50, 0, 'specimenCase'), hazard('return-laser', 59, 1, 'weldingDrone'),
      hazard('last-rack', 68, 0, 'coolantRadiator'), hazard('airlock-cargo', 81, 1, 'maintenanceBot'),
      // BUSIER (13 Oct 2026, Peter: "more obstacles" → busier levels). Spread through
      // the running stretches, at least 2 s apart on a rail, kept clear of the
      // 2.2 s before a gate, the landing after it, checkpoints, the appliance and
      // the finish; one more on the wrong rail mid-span, so a missed
      // arrow costs more than the gate field.
      hazard('deck-1', 7.75, 1, 'foilCrate'), hazard('deck-2', 9, 0, 'specimenCase'), hazard('deck-3', 15.75, 0, 'fuelCell'),
      hazard('deck-4', 21.25, 1, 'weldingDrone'), hazard('deck-5', 23.25, 1, 'coolantRadiator'), hazard('deck-6', 23.75, 0, 'valveManifold'),
      hazard('deck-7', 31.75, 0, 'specimenCase'), hazard('deck-8', 33, 1, 'foilCrate'), hazard('deck-9', 39.75, 1, 'looseToolkit'),
      hazard('deck-10', 41, 0, 'fuelCell'), hazard('deck-11', 47.75, 0, 'maintenanceBot'), hazard('deck-12', 49.5, 1, 'coolantRadiator'),
      hazard('deck-13', 56.75, 1, 'valveManifold'), hazard('deck-14', 58.5, 0, 'specimenCase'), hazard('deck-15', 65.75, 0, 'weldingDrone'),
      hazard('deck-16', 67.5, 1, 'maintenanceBot'), hazard('deck-17', 74.75, 1, 'foilCrate'),
    ],
    intro: 'JUMP AFTER THE ARROWS TO REACH THE OTHER SURFACE.',
  },
  'gravity-3': {
    name: 'LOW GRAVITY',
    gravity: 0.116,   // 0.14 × (1.22/1.34)²: the lower held arc keeps its old airtime
    jumpHeightScale: 1.22,   // 1.34 before the corridor shrank to 86 (13 Oct): the held arc tops out just under the ceiling
    floatingBolts: true,
    gates: [],
    // Coins trace the held-jump curve. The first is a complete rise and fall
    // beside the first long bed, so the level teaches its low-gravity arc
    // before asking the player to clear it. Later trails keep the currency
    // cadence alive without turning every crossing into a coin vacuum.
    coinArcs: [
      { at: 2.8, count: 10, step: 0.25 },
      { at: 10.8, count: 4, step: 0.4 },
      { at: 26.8, count: 4, step: 0.4 },
      { at: 42.8, count: 4, step: 0.4 },
      { at: 58.8, count: 4, step: 0.4 },
      { at: 82.8, count: 4, step: 0.4 },
    ],
    // Long crossings are authored as groups; each is one held jump. Smaller
    // duck obstacles sit after the landing runway, never inside an ascent.
    hazards: [
      // Three of the spike beds are live wire since 14 Oct (Peter: "replace some spikes
      // with livewires in level 3"): the same span, jumped the same way.
      attack('float-01', 4, 0, 'floatSpikes', 1.15),
      hazard('float-duck-01', 8, 0, 'looseToolkit'),
      attack('laser-01', 12, 0, 'floatLaser', 1.5),
      hazard('float-duck-02', 16, 0, 'weldingDrone'),
      attack('mixed-01-a', 20, 0, 'railPulse', 0.55),
      hazard('mixed-01-b', 20.65, 0, 'fuelCell'),
      attack('mixed-01-c', 20.85, 0, 'maintenanceRollers', 0.8),
      hazard('float-duck-03', 24, 0, 'looseToolkit'),
      attack('laser-02', 28, 0, 'floatLaser', 1.8),
      hazard('float-duck-04', 32, 0, 'weldingDrone'),
      attack('mixed-02-a', 36, 0, 'maintenanceRollers', 0.65),
      hazard('mixed-02-b', 36.75, 0, 'coolantRadiator'),
      attack('mixed-02-c', 36.95, 0, 'railPulse', 0.85),
      hazard('float-duck-05', 40, 0, 'looseToolkit'),
      attack('float-02', 44, 0, 'floatSpikes', 1.8),
      hazard('float-duck-06', 48, 0, 'weldingDrone'),
      attack('mixed-03-a', 52, 0, 'floatLaser', 0.7),
      hazard('mixed-03-b', 52.8, 0, 'specimenCase'),
      attack('mixed-03-c', 53, 0, 'maintenanceRollers', 0.8),
      hazard('float-duck-07', 56, 0, 'looseToolkit'),
      attack('laser-03', 60, 0, 'floatLaser', 1.85),
      hazard('float-duck-08', 64, 0, 'weldingDrone'),
      attack('mixed-04-a', 68, 0, 'floatSpikes', 0.6),
      hazard('mixed-04-b', 68.7, 0, 'valveManifold'),
      attack('mixed-04-c', 68.9, 0, 'floatLaser', 0.95),
      hazard('float-duck-09', 72, 0, 'looseToolkit'),
      attack('mixed-05-a', 76, 0, 'maintenanceRollers', 0.7),
      attack('mixed-05-b', 76.8, 0, 'railPulse', 1),
      hazard('float-duck-10', 80, 0, 'weldingDrone'),
      attack('laser-04', 84, 0, 'floatLaser', 1.85),
      hazard('float-duck-11', 88, 0, 'looseToolkit'),
    ],
    // Capsule pickups sit near the held-jump apex. Each is two seconds before
    // a major crossing, so a full low-gravity jump can collect it and continue
    // over the following bed; a tap stays too low.
    rewards: [
      { at: 10, lane: 0, alt: 90 }, { at: 18, lane: 0, alt: 88 },
      { at: 26, lane: 0, alt: 92 }, { at: 34, lane: 0, alt: 86 },
      { at: 42, lane: 0, alt: 90 }, { at: 50, lane: 0, alt: 84 },
      { at: 58, lane: 0, alt: 92 }, { at: 66, lane: 0, alt: 86 },
      { at: 74, lane: 0, alt: 90 }, { at: 82, lane: 0, alt: 88 },
      { at: 90, lane: 0, alt: 86 },
    ],
    intro: 'LOW GRAVITY. LONG JUMPS. LOOSE HARDWARE.',
  },
  'gravity-2': {
    name: 'MAINTENANCE MAYHEM',
    gates: maintenanceGates,
    hazards: [
      // Three attack passes: introduce, mirror, combine. No aim or selectors.
      attack('pulse-1', 5, 0, 'maintenancePulse'),
      attack('brush-1', 11, 0, 'maintenanceBrush'),
      attack('brush-2', 24, 1, 'maintenanceBrush'),
      attack('pulse-2', 38, 0, 'maintenancePulse'),
      attack('brush-3', 43, 0, 'maintenanceBrush'),
      attack('pulse-3', 55, 1, 'maintenancePulse'),
      attack('brush-4', 58, 1, 'maintenanceBrush'),
      attack('pulse-4', 70, 0, 'maintenancePulse'),
      attack('brush-5', 74, 0, 'maintenanceBrush'),
      attack('brush-6', 85, 1, 'maintenanceBrush'),
      attack('pulse-5', 87, 1, 'maintenancePulse'),
      ...maintenanceGates.map((g, i) => attack(`rollers-${i + 1}`,
        g.at + 1.25, 1 - g.lane, 'maintenanceRollers', 2.6)),
    ].sort((a, b) => a.at - b.at),
    sequences: [
      { id: 'sweep', start: 2, end: 33 },
      { id: 'scrub', start: 35, end: 66 },
      { id: 'polish', start: 68, end: 94.5 },
    ],
    rewards: [{ at: 15, lane: 0 }, { at: 33.5, lane: 0 }, { at: 46, lane: 0 },
      { at: 66.5, lane: 0 }, { at: 77, lane: 0 }],
    intro: 'THE CLEANER HAS MISTAKEN YOU FOR DEBRIS.',
  },
});

export const GRAVITY_CAMPAIGN_IDS = Object.freeze(Object.keys(GRAVITY_STAGE_DATA));
export const isGravityCampaignStage = (stage) => !!stage && !!GRAVITY_STAGE_DATA[stage.id];
