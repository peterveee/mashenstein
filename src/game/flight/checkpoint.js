// A pending act-ending flight per stage. Stage rewards are deferred until
// victory; the record holds the unbanked runner result, never live hazards.
//
// Records live in campaign.pendingFlights[stageId]. The first build kept one
// record in campaign.pendingFlight; it is still read (and moved on the next
// write) so a fight saved by that build resumes rather than being lost.
import { ACT_ENDINGS } from './acts.js';

// Checkpoints: 0 the tape, 1 halfway, 2 BACKUP POWER (Act III only).
const VALID = (p, stageId) => p?.version === 1 && p.stageId === stageId && p.result?.stage?.id === stageId
  && p.result.success === true && Number.isFinite(p.seed)
  && [0, 1].concat(ACT_ENDINGS[stageId]?.act === 3 ? [2] : []).includes(p.checkpoint);

export function readFlightCheckpoint(slot, stageId = 'rhythm-3') {
  const c = slot?.campaign;
  const p = c?.pendingFlights?.[stageId] ?? (c?.pendingFlight?.stageId === stageId ? c.pendingFlight : null);
  return VALID(p, stageId) ? p : null;
}

function store(save, stageId, pending) {
  const c = save.slot.campaign;
  if (!c.pendingFlights || typeof c.pendingFlights !== 'object') c.pendingFlights = {};
  c.pendingFlights[stageId] = pending;
  if (c.pendingFlight?.stageId === stageId) delete c.pendingFlight;
}
function current(save, stageId) {
  const c = save.slot.campaign;
  return c?.pendingFlights?.[stageId] ?? (c?.pendingFlight?.stageId === stageId ? c.pendingFlight : null);
}
function drop(save, stageId) {
  const c = save.slot.campaign;
  if (c.pendingFlights) delete c.pendingFlights[stageId];
  if (c.pendingFlight?.stageId === stageId) delete c.pendingFlight;
}

// At the tape. `extra.laneTempo` is the song's warp there, so a fight resumed
// from the cabinet screen plays at the tempo the stage had ramped to.
export function beginFlightCheckpoint(save, result, seed, extra = {}) {
  const stageId = result?.stage?.id || 'rhythm-3';
  const pending = { version: 1, stageId, seed: seed >>> 0,
    checkpoint: 0, result: JSON.parse(JSON.stringify(result)), flightSeconds: 0, flightHits: 0,
    laneTempo: Number.isFinite(extra.laneTempo) ? extra.laneTempo : null,
    // UNPLUGGED (and a corrupted run): the flight is one hit too.
    oneHit: extra.oneHit === true };
  store(save, stageId, pending); save.persist(); return pending;
}

export function saveFlightMidpoint(save, pending, seconds, hits, checkpoint = 1) {
  if (current(save, pending.stageId) !== pending) return;
  pending.checkpoint = Math.max(pending.checkpoint || 0, checkpoint);
  pending.flightSeconds = seconds; pending.flightHits = hits;
  save.persist();
}

// Leaving mid-fight keeps the checkpoint but not a forgiving count: the time
// and hits so far go into the record, so quitting and resuming costs the same
// as retrying would have.
export function saveFlightProgress(save, pending, seconds, hits) {
  if (current(save, pending.stageId) !== pending) return;
  pending.flightSeconds = seconds; pending.flightHits = hits;
  save.persist();
}

// applyResult persists the deletion and boss flag together with the rewards.
// Keeping the old record until this transaction means an interrupted vignette
// always resumes from a valid checkpoint, never an already-paid runner result.
export function finishFlightCheckpoint(save, pending, apply, seconds, hits) {
  if (current(save, pending.stageId) !== pending) return null;
  const result = { ...pending.result, reason: null, time: (pending.result.time || 0) + seconds,
    damageTaken: (pending.result.damageTaken || 0) + hits };
  // TAKE NO DAMAGE covers the whole stage, the flight included.
  if (hits > 0 && pending.result.stage?.challenge?.type === 'noDamage') result.challengeDone = false;
  drop(save, pending.stageId);
  const cab = ACT_ENDINGS[pending.stageId]?.cabinet || 'rhythm';
  const c = save.slot.campaign;
  if (!c.bossesDown || typeof c.bossesDown !== 'object') c.bossesDown = {};
  c.bossesDown[cab] = true;
  return { result, gains: apply(save, result) };
}

// The attempt is over without a win: UNPLUGGED's one hit, or RESTART from the
// pause card. The record goes, and the runner result is settled as the failed
// run it now is, through the same applyResult a failed run takes.
export function abandonFlightCheckpoint(save, pending, apply, reason, seconds = 0, hits = 0) {
  if (current(save, pending.stageId) !== pending) return null;
  const result = { ...pending.result, success: false, reason,
    time: (pending.result.time || 0) + seconds,
    damageTaken: (pending.result.damageTaken || 0) + hits,
    challengeDone: false,
    // A failed run is not paid the clock's seconds at the tape.
    coins: Math.max(0, (pending.result.coins || 0) - (pending.result.timeBonusCoins || 0)),
    timeBonusCoins: 0, timeLeft: null };
  drop(save, pending.stageId);
  if (!apply) { save.persist(); return { result, gains: null }; }
  return { result, gains: apply(save, result) };
}
