// Shared counters only: no renderer/audio dependencies, no per-frame logs.
export const efficiencyProfile = {
  enabled: false, entitiesConsidered: 0, entitiesCulled: 0, entitiesPainted: 0,
  audioMarginMin: Infinity, audioLate: 0, lcdHits: 0, lcdMisses: 0, lcdRepaintMs: 0, lcdBytes: 0,
};
export function setEfficiencyProfile(enabled) {
  efficiencyProfile.enabled = !!enabled;
  efficiencyProfile.audioMarginMin = Infinity;
  efficiencyProfile.audioLate = 0;
  for (const key of ['entitiesConsidered', 'entitiesCulled', 'entitiesPainted',
    'lcdHits', 'lcdMisses', 'lcdRepaintMs']) efficiencyProfile[key] = 0;
}
export function efficiencyProfileStats() { return { ...efficiencyProfile }; }
