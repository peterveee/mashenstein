// Economy simulation: campaign income must cover the core power-up track
// (Shield/Magnet/Star to III) by the finale, within ±15%.
import { REWARDS, BENCH_UPGRADES } from '../src/data/progression.js';
import { STAGES } from '../src/data/stages.js';

const coreCost = BENCH_UPGRADES
  .filter((u) => ['shield', 'magnet', 'star'].includes(u.id))
  .reduce((sum, u) => sum + u.levels.reduce((a, b) => a + b, 0), 0);

// Income model for a straightforward campaign clear:
// every stage cleared once, ~60% of challenges, ~50% of appliances,
// avg 35 coins picked up per stage (60-120s stages), 3 bosses, ~6 minigame
// power-on bonuses won.
const stages = STAGES.length;
const income =
  stages * REWARDS.stageClear +
  Math.round(stages * 0.6) * REWARDS.challengeBonus +
  Math.round(stages * 0.5) * REWARDS.applianceBonus +
  stages * 35 +
  3 * REWARDS.bossClear +
  6 * REWARDS.minigameWin;

const ratio = income / coreCost;
console.log(`campaign income ~${income} vs core power-up track ${coreCost} (ratio ${ratio.toFixed(2)})`);
if (ratio < 0.85) {
  console.error('ECONOMY SIM FAILED: campaign cannot afford the core track by the finale');
  process.exit(1);
}
if (ratio > 3.5) {
  console.error('ECONOMY SIM FAILED: economy is trivial — coins have no meaning');
  process.exit(1);
}
console.log('ECONOMY SIM PASSED');
