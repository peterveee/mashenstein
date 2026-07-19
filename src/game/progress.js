// Campaign progress: plugs, ranks, coins, mastery XP, unlocks.
import { REWARDS, MASTERY_LEVELS } from '../data/progression.js';
import { UNLOCKS, STAGES } from '../data/stages.js';
import { CABINETS } from '../data/cabinets.js';

// Coin totals reach six figures late on, where an unbroken run of digits is
// hard to read at a glance. Grouped by hand rather than via toLocaleString so
// the separator never changes with the player's locale — the glyph cache keys
// on the character, and a stray space or dot would render inconsistently.
export function formatCoins(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function totalPlugs(slot) {
  let n = 0;
  for (const arr of Object.values(slot.campaign.plugs)) n += arr.filter(Boolean).length;
  return n;
}

export function cabinetUnlocked(slot, cabId) {
  const need = UNLOCKS[cabId] ?? 0;
  return totalPlugs(slot) >= need;
}

export function finaleUnlocked(slot) {
  return totalPlugs(slot) >= UNLOCKS.finale && slot.campaign.bossesDown.surge;
}

export function computeRank(result, difficulty) {
  let pts = 0;
  if (result.success) pts++;
  if (result.challengeDone) pts++;
  if (result.applianceGot) pts++;
  if (result.damageTaken === 0) pts++;
  let rank = pts >= 4 ? 'S' : pts === 3 ? 'A' : pts === 2 ? 'B' : 'C';
  // CONCERNING: an S earned while collecting zero coins (who ARE you), or any S on UNPLUGGED.
  if (rank === 'S' && (result.coins === 0 || difficulty === 5)) rank = 'CONCERNING';
  return rank;
}

const RANK_ORDER = { C: 0, B: 1, A: 2, S: 3, CONCERNING: 4 };

export function applyResult(save, result) {
  const slot = save.slot;
  const gains = { coins: 0, plugsNew: 0, mastery: [] };
  slot.stats.runs++;

  if (result.overtime) {
    slot.overtime.best = Math.max(slot.overtime.best, result.score);
    slot.overtime.bestRelay = Math.max(slot.overtime.bestRelay, result.bestCombo);
    gains.coins += Math.floor(result.score / 100);
  } else if (result.stage) {
    const id = result.stage.id;
    const prev = slot.campaign.plugs[id] || [false, false, false];
    const now = [
      prev[0] || result.success,
      prev[1] || (result.success && result.challengeDone),
      prev[2] || result.applianceGot,
    ];
    gains.plugsNew = now.filter(Boolean).length - prev.filter(Boolean).length;
    slot.campaign.plugs[id] = now;
    if (result.success) {
      const firstClear = !prev[0];
      gains.coins += firstClear ? REWARDS.stageClear : Math.floor(REWARDS.stageClear / 3);
      if (result.challengeDone && !prev[1]) gains.coins += REWARDS.challengeBonus;
      if (result.applianceGot && !prev[2]) gains.coins += REWARDS.applianceBonus;
      if (result.corrupted && result.corrupted.length) gains.coins += REWARDS.corruptedClear;
      const rank = computeRank(result, slot.difficulty);
      const old = slot.campaign.ranks[id];
      if (!old || RANK_ORDER[rank] > RANK_ORDER[old]) slot.campaign.ranks[id] = rank;
      result.rank = rank;
      // Cabinet cleared?
      const cabStages = STAGES.filter((s) => s.cabinet === result.stage.cabinet);
      if (cabStages.every((s) => (slot.campaign.plugs[s.id] || [])[0])) slot.campaign.cleared[result.stage.cabinet] = true;
    }
  }
  gains.coins += result.coins || 0;
  slot.coins += gains.coins;
  slot.stats.coinsEarned += gains.coins;

  // Mastery XP for the team.
  for (const heroId of result.team || []) {
    const m = slot.mastery[heroId] || (slot.mastery[heroId] = { xp: 0, level: 0, equipped: [] });
    const xp = Math.floor((result.time || 60) / 6) + (result.success ? 15 : 4) + result.bestCombo * 2;
    m.xp += xp;
    while (m.level < MASTERY_LEVELS.length && m.xp >= MASTERY_LEVELS[m.level]) {
      m.level++;
      gains.mastery.push({ heroId, level: m.level });
    }
  }
  save.persist();
  return gains;
}

export function actForSlot(slot) {
  const plugs = totalPlugs(slot);
  if (plugs >= UNLOCKS.cardboard) return 3;
  if (plugs >= UNLOCKS.frost) return 2;
  return 1;
}

export function unlockedCabinets(slot) {
  return CABINETS.filter((c) => cabinetUnlocked(slot, c.id));
}

export function bossAvailable(slot, cabId) {
  // Bosses gate cabinets 3, 6, 9 (neon, rhythm, surge) once their 3 stages are cleared.
  if (!['neon', 'rhythm', 'surge'].includes(cabId)) return false;
  if (slot.campaign.bossesDown[cabId]) return false;
  return !!slot.campaign.cleared[cabId];
}
