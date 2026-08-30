// Beat-locked gameplay data and spawner.  This module deliberately knows
// nothing about Audio or the DOM: RunState supplies the heard-beat callback so
// the same placement and validation code can run in deterministic tests.
import { makeObstacle, makePickup, OBSTACLES } from './entities.js';
import { HEROES } from '../data/heroes.js';
import { BASE_JUMP_V, GRAVITY, HEAVY_GRAVITY_MULT, PLAYER_W } from './player.js';

const REQUIRED_ACTIONS = new Set(['jump', 'duck', 'ability']);
const ACTION_TYPES = { jump: 'beatBar', duck: 'drone', ability: null };
const COIN_ALT = 10;
const ACTION_MARGIN = 2;
const REQUIRED_GAP_BEATS = Object.freeze({
  jumpJump: 2, jumpDuck: 2, duckJump: 1, duckDuck: 1,
});

function finiteNumber(n) { return typeof n === 'number' && Number.isFinite(n); }

/** Return a monotonically increasing beat number across a looping clock. */
export function unwrapBeat(raw, state = {}) {
  if (!finiteNumber(raw)) return null;
  const loop = Math.max(1, Number(state.loopBeats) || 1);
  if (state.lastRawBeat != null && raw < state.lastRawBeat - loop * 0.5) state.epoch = (state.epoch || 0) + loop;
  state.lastRawBeat = raw;
  return raw + (state.epoch || 0);
}

/** Stable instance identity for an authored event, including its loop pass. */
export function beatEventId(beat, event) {
  return `${Math.round(beat)}:${event.slot}:${event.action}`;
}

/** Snap a world position to the nearest beat-grid line. */
export function snapToBeatGrid(worldX, originX, pxPerBeat) {
  if (!finiteNumber(worldX) || !finiteNumber(originX) || !finiteNumber(pxPerBeat) || pxPerBeat <= 0) return worldX;
  return originX + Math.round((worldX - originX) / pxPerBeat) * pxPerBeat;
}

/** Validate an authored chart and return a sorted, frozen copy. */
export function validateBeatChart(chart, physics = {}) {
  if (!chart || !Number.isInteger(chart.loopBeats) || chart.loopBeats <= 0) {
    throw new Error('beat chart requires a positive integer loopBeats');
  }
  if (!Array.isArray(chart.events) || chart.events.length !== chart.loopBeats) {
    throw new Error('beat chart requires one event per integer beat');
  }
  const seen = new Set();
  const bySlot = [];
  for (const raw of chart.events) {
    if (!raw || !Number.isInteger(raw.slot) || raw.slot < 0 || raw.slot >= chart.loopBeats) {
      throw new Error(`beat chart slot out of range: ${raw?.slot}`);
    }
    if (seen.has(raw.slot)) throw new Error(`duplicate beat chart slot: ${raw.slot}`);
    seen.add(raw.slot);
    if (!['jump', 'duck', 'ability', 'coin'].includes(raw.action)) {
      throw new Error(`unknown beat chart action: ${raw.action}`);
    }
    if (raw.action === 'ability') {
      if (raw.type != null) throw new Error('ability beat events cannot name an obstacle type');
    } else if (REQUIRED_ACTIONS.has(raw.action)) {
      const type = raw.type || ACTION_TYPES[raw.action];
      if (!OBSTACLES[type] || OBSTACLES[type].action !== raw.action) {
        throw new Error(`invalid obstacle for ${raw.action}: ${type}`);
      }
    }
    bySlot[raw.slot] = Object.freeze({ ...raw, type: raw.type || ACTION_TYPES[raw.action] });
  }
  for (let slot = 0; slot < chart.loopBeats; slot++) {
    if (!bySlot[slot]) throw new Error(`missing beat chart slot: ${slot}`);
  }

  // Spacing is a collision-feasibility rule for physical jump/duck hazards.
  // Ability events are timing markers and impose no obstacle gap of their own.
  const actionSlots = bySlot.filter((e) => e.action === 'jump' || e.action === 'duck').map((e) => e.slot);
  const minGap = { ...REQUIRED_GAP_BEATS, ...(physics.minGapBeats || {}) };
  for (let i = 0; i < actionSlots.length; i++) {
    const a = bySlot[actionSlots[i]];
    const nextSlot = actionSlots[(i + 1) % actionSlots.length];
    const b = bySlot[nextSlot];
    const gap = (nextSlot - a.slot + chart.loopBeats) % chart.loopBeats || chart.loopBeats;
    const required = minGap[`${a.action}${b.action[0].toUpperCase()}${b.action.slice(1)}`]
      ?? minGap[`${a.action}${b.action}`]
      ?? 1;
    if (gap < required) throw new Error(`infeasible ${a.action}->${b.action} seam/gap (${gap} < ${required})`);
  }
  return Object.freeze({ loopBeats: chart.loopBeats, events: Object.freeze(bySlot) });
}

function clearTimeForHero(hero, height) {
  const g = hero.heavy ? GRAVITY * HEAVY_GRAVITY_MULT : GRAVITY;
  const launch = BASE_JUMP_V * hero.jumpMult;
  // The chart must work for a tap, not just a held variable jump.  Integrate
  // the shared trajectory until the feet clear the obstacle plus margin; this
  // mirrors the Player integrator and keeps the placement tied to real physics.
  let t = 0, y = 0, vy = launch;
  const dt = 1 / 1200;
  while (t < 2) {
    vy -= g * dt;
    y += vy * dt;
    t += dt;
    if (y >= height) return t;
    if (y <= 0 && t > dt) break;
  }
  return 2;
}

function worstClearTime(height) {
  let longest = 0;
  for (const hero of Object.values(HEROES)) {
    longest = Math.max(longest, clearTimeForHero(hero, height));
  }
  return longest;
}

// Distance between the ideal input position and the leading edge of the
// physical hazard.  It is cached by BeatSpawner per speed/type.
export function actionApproachPx(action, type, speed) {
  if (!finiteNumber(speed) || speed <= 0 || action === 'coin' || action === 'ability') return 0;
  // Ducking is resolved from the same input edge as collision.  A one-frame
  // lead keeps the drone's contact on the following update without moving it
  // a full hitbox ahead of the judged beat.
  if (action === 'duck') return speed / 60;
  const def = OBSTACLES[type];
  const clearTime = worstClearTime((def?.h || 10) + ACTION_MARGIN);
  return speed * clearTime + PLAYER_W + ACTION_MARGIN;
}

export class BeatSpawner {
  constructor({ chart, bank, react = 0.25, pitPlan = [], beatNow, playerWorldX,
    lookaheadBeats = 7, onPitAlign = null } = {}) {
    this.chart = validateBeatChart(chart);
    this.bank = bank || null;
    this.react = react;
    this.pitPlan = pitPlan;
    this.beatNow = beatNow || (() => null);
    this.playerWorldX = playerWorldX || ((worldX) => worldX + 56);
    this.lookaheadBeats = lookaheadBeats;
    this.nextX = 0;
    this.lastActionX = -9999;
    this.lastActionKind = 'none';
    this.lastWasPunt = 0;
    this.cursorBeat = null;
    this.lastRawBeat = null;
    this.beatEpoch = 0;
    this._approachCache = new Map();
    this.eventInstances = [];
    this.onPitAlign = onPitAlign;
  }

  _unwrappedBeat(raw) {
    if (!finiteNumber(raw)) return null;
    const state = {
      loopBeats: this.chart.loopBeats,
      lastRawBeat: this.lastRawBeat,
      epoch: this.beatEpoch,
    };
    const beat = unwrapBeat(raw, state);
    this.lastRawBeat = state.lastRawBeat;
    this.beatEpoch = state.epoch || 0;
    return beat;
  }

  resetFromBeat(beat = this.beatNow(), worldX = 0) {
    const unwrapped = this._unwrappedBeat(beat);
    if (!finiteNumber(unwrapped)) {
      this.cursorBeat = null;
      this.nextX = worldX;
      return false;
    }
    this.cursorBeat = Math.ceil(unwrapped + 2);
    this.nextX = worldX;
    this.eventInstances = [];
    for (const pit of this.pitPlan || []) {
      if (pit.passed) continue;
      if (pit._authoredX == null) pit._authoredX = pit.x;
      pit.x = pit._authoredX;
      pit._beatAligned = false;
      pit.spawned = false;
      pit.done = false;
    }
    return true;
  }

  _isSuppressed(actionX, event) {
    for (const pit of this.pitPlan || []) {
      if (!pit._beatAligned) continue;
      const clear = pit.clearancePx || 0;
      if (actionX >= pit.x - clear && actionX <= pit.x + pit.w + clear) return true;
      if (event.action === 'jump' && pit.crossing && actionX >= pit.x - clear
        && actionX <= pit.x + pit.w + clear) return true;
    }
    return false;
  }

  _approachPx(action, type, speed) {
    const k = `${action}:${type}:${speed}`;
    if (!this._approachCache.has(k)) this._approachCache.set(k, actionApproachPx(action, type, speed));
    return this._approachCache.get(k);
  }

  _alignPits(beat, playerX, pxPerBeat) {
    if (!this.pitPlan?.length) return;
    // The stage authors specify an approximate world position.  Snap each
    // unspawned set piece to the same grid used by chart actions, preserving
    // its local placement while making the required jump musical.
    const origin = playerX - beat * pxPerBeat;
    for (const pit of this.pitPlan) {
      if (pit.passed || pit._beatAligned || !finiteNumber(pit.x)) continue;
      if (pit._authoredX == null) pit._authoredX = pit.x;
      const speed = speedFromPx(pxPerBeat, this.bank?.bpm || 120);
      const approach = actionApproachPx('jump', pit.crossing ? 'gap' : 'gap', speed);
      const target = pit._authoredX - approach;
      // Ordinary pits snap to the nearest authored jump event.  Crossing
      // starts use that same grid, then own a fixed two-beat action cadence.
      let actionBeat = Math.round(beat + (target - playerX) / pxPerBeat);
      const candidates = [];
      const minBeat = Math.ceil(beat + 2);
      for (let n = Math.floor(actionBeat) - this.chart.loopBeats; n <= Math.ceil(actionBeat) + this.chart.loopBeats; n++) {
        const e = this.chart.events[((n % this.chart.loopBeats) + this.chart.loopBeats) % this.chart.loopBeats];
        if (e?.action === 'jump' && n >= minBeat) candidates.push(n);
      }
      if (candidates.length) actionBeat = candidates.reduce((a, n) =>
        Math.abs(n - actionBeat) < Math.abs(a - actionBeat) ? n : a, candidates[0]);
      else actionBeat = Math.max(minBeat, actionBeat);
      const actionX = origin + actionBeat * pxPerBeat;
      pit.actionBeat = actionBeat;
      pit.actionX = actionX;
      pit.x = actionX + approach;
      pit._beatAligned = true;
      if (pit.crossing) {
        pit.actionBeats = Array.from({ length: pit.crossing.jumps }, (_, i) => actionBeat + i * 2);
        const spacing = 2 * pxPerBeat;
        const hop = spacing * 0.45;
        const tread = spacing * 0.55;
        pit.crossing.x = pit.x;
        pit.crossing.hop = hop;
        pit.crossing.tread = tread;
        pit.crossing.w = pit.crossing.jumps * hop + (pit.crossing.jumps - 1) * tread;
        pit.crossing.actionBeats = pit.actionBeats.slice();
        pit.crossing.stones = [];
        for (let i = 0; i < pit.crossing.jumps - 1; i++) {
          pit.crossing.stones.push({ x: pit.x + (i + 1) * hop + i * tread, w: tread });
        }
        pit.w = pit.crossing.w;
      }
      pit.clearancePx = speed * (pit.crossing ? Math.max(this.react, 0.82 * 1.15) : this.react);
      this.onPitAlign?.(pit);
    }
  }

  /** Same positional surface as Spawner.fill, with an injected beat clock. */
  fill(worldX, speed, obstacles, pickups, jumpHeightFn, stopX = Infinity) {
    const raw = this.beatNow();
    const beat = this._unwrappedBeat(raw);
    if (!finiteNumber(beat)) return;
    const pxPerBeat = speed * 60 / ((this.bank?.bpm || 120));
    const playerX = this.playerWorldX(worldX);
    if (this.cursorBeat == null) this.resetFromBeat(beat, worldX);
    // A long render/audio jump can leave the old lookahead cursor behind the
    // heard clock. Re-anchor atomically instead of replaying dozens of stale
    // loop instances behind the player.
    if (this.cursorBeat < beat - 1) this.resetFromBeat(beat, worldX);
    this._alignPits(beat, playerX, pxPerBeat);
    const horizon = beat + this.lookaheadBeats;
    while (this.cursorBeat <= horizon) {
      const slot = ((this.cursorBeat % this.chart.loopBeats) + this.chart.loopBeats) % this.chart.loopBeats;
      const event = this.chart.events[slot];
      const actionX = playerX + (this.cursorBeat - beat) * pxPerBeat;
      const id = beatEventId(this.cursorBeat, event);
      // Ability events are timing markers for future charts, not physical
      // hazards. They still advance the monotonic cursor and are exposed in
      // `eventInstances` for a HUD/authoring surface to render.
      if (event.action === 'ability') {
        if (actionX + 8 > stopX) {
          this.nextX = stopX;
          return;
        }
        if (!this._isSuppressed(actionX, event)) {
          this.eventInstances.push({
            live: true, chartEventId: id, chartAction: 'ability', chartSlot: event.slot,
            actionBeat: this.cursorBeat, actionX,
          });
        }
        this.lastActionX = actionX;
        this.lastActionKind = event.action;
        this.nextX = Math.max(this.nextX, actionX);
        this.cursorBeat++;
        continue;
      }
      const type = event.type || ACTION_TYPES[event.action];
      const approach = this._approachPx(event.action, type, speed);
      const x = actionX + approach;
      const width = event.action === 'coin' ? 8 : (OBSTACLES[type]?.w || 8);
      if (x + width > stopX) {
        this.nextX = stopX;
        return;
      }
      if (!this._isSuppressed(actionX, event)) {
        if (event.action === 'coin') {
          const coin = makePickup('coin', actionX, COIN_ALT);
          coin.chartEventId = id;
          coin.chartAction = 'coin';
          coin.chartSlot = event.slot;
          coin.actionBeat = this.cursorBeat;
          coin.actionX = actionX;
          coin.formationId = id;
          pickups.push(coin);
        } else {
          const ob = makeObstacle(type, x);
          ob.chartEventId = id;
          ob.chartAction = event.action;
          ob.chartSlot = event.slot;
          ob.actionBeat = this.cursorBeat;
          ob.actionX = actionX;
          obstacles.push(ob);
          this.lastActionX = actionX;
          this.lastActionKind = event.action;
        }
      }
      this.nextX = Math.max(this.nextX, x + width);
      this.cursorBeat++;
    }
  }
}

function speedFromPx(pxPerBeat, bpm) { return pxPerBeat * bpm / 60; }
