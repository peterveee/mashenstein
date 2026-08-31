// Beat-locked gameplay data and spawner.  This module deliberately knows
// nothing about Audio or the DOM: RunState supplies the heard-beat callback so
// the same placement and validation code can run in deterministic tests.
import { makeObstacle, makePickup, OBSTACLES } from './entities.js';
import { HEROES } from '../data/heroes.js';
import { worstAirtime } from './spawner.js';
import { BASE_JUMP_V, GRAVITY, HEAVY_GRAVITY_MULT, PLAYER_W } from './player.js';

const REQUIRED_ACTIONS = new Set(['jump', 'duck', 'ability']);
const ACTION_TYPES = { jump: 'beatBar', duck: 'drone', ability: null, pit: 'gap' };
const COIN_ALT = 10;
const ACTION_MARGIN = 2;
// How wide the judge's on-beat window is, in beats either side of the line.
// It lives here rather than in the judge because the chart has to be authored
// against it: a hole the player can fall into WHILE being scored on beat is a
// chart that disagrees with its own scoreboard. See pitWindowBeats.
export const ON_BEAT_WINDOW = 0.18;
// A CHART PIT is a hole in the loop, and its width is in BEATS of lane travel
// rather than pixels — the same argument crossingLayout makes in game/routes.js
// for sizing stones in seconds. The chart is a musical object; a fixed pixel
// width would be a different fraction of a jump at every speed this cabinet is
// ever run at, and the whole point of a beat lane is that the answer does not
// change. Half a beat at RHYTHM BANKRUPTCY's 124bpm and base speed comes out at
// 56px, which is the game's ordinary gap — that is the number this was chosen
// to land on, not a coincidence.
export const PIT_BEATS = 0.5;
// A COIN RUN'S SUBDIVISION. Four to the beat is sixteenths, which is the fastest
// figure this song's own parts play and the fastest a running hero can take a
// row of pickups without the cue turning into a buzz — the coin sting climbs a
// step per coin off the combo (see RunState.collect), so a run of four is a
// four-note fill in the song's own time rather than one sound repeated.
export const COIN_DIV = 4;
// THE FILLS THIS CABINET PLAYS, rarest last. A coin slot is a quarter by
// default — one coin on the line, which is most of them — and `run`/`div` turn
// it into a figure. The 32nd is eight coins fourteen world px apart at this
// cabinet's tempo and speed, which lands on COIN_GAP, the pitch every other
// coin run in the game is laid at; the shared number is what keeps a fill
// reading as coins rather than as a bar of pink.
export const COIN_FILLS = Object.freeze({
  eighth: { run: 2, div: 2 },
  sixteenth: { run: 4, div: 4 },
  thirtysecond: { run: 8, div: 8 },
});
// HOW MUCH ROAD A COIN RUN LEAVES IN FRONT OF A HOLE, in seconds of travel.
//
// It is `pitClearance`'s own window (spawner.js: the default 0.25s reaction
// times 2.4), converted to seconds so it can be checked on a chart that has a
// tempo but no speed. The rule it enforces is the one spawnScriptedPits argues
// at length and that a single coin on the beat grid could never break: the lips
// of a hole are the two places the player does not choose anything, so a row of
// pickups running up to one is a lure toward a fatal hazard. A coin ON the beat
// is always more than a beat clear of the nearest lip; a run of four is three
// quarters of a beat longer, which is enough to reach.
export const COIN_RUN_PIT_CLEAR_SEC = 0.25 * 2.4;
// ACTION-FREE LANE AFTER A RESYNC, in beats, and it is the one number the
// spawner and the judge must agree on: the spawner lays nothing that ASKS AN
// INPUT inside it and the judge scores nothing inside it. Two beats is a beat
// to hear the clock and a beat to move — enough for a bar you jump, and not
// enough for a hole. A stage cut with holes gets four, because a checkpoint
// restore drops the player back into the lane already running and stages.js's
// own rule for where a fatal hole may stand is that it lands at least a second
// and a half after the restore, never on top of it. Four beats at 124bpm is
// 1.9s.
//
// The runway is action-free, not EMPTY. Four beats of bare road after every
// checkpoint restore read as the lane being broken — the coins are the part of
// the chart that asks nothing of the player, so they are laid straight through
// it (from one beat out, a breath rather than a wall) and the restore opens
// onto a lane that is already playing its song.
export const LANE_RUNWAY_BEATS = 2;
export const PIT_LANE_RUNWAY_BEATS = 4;
const REQUIRED_GAP_BEATS = Object.freeze({
  jumpJump: 2, jumpDuck: 2, duckJump: 1, duckDuck: 1,
  // A HOLE IS A JUMP THAT CANNOT BE SHORTENED, so it takes the jump's spacing on
  // both sides. The one asymmetry is the pair either side of a landing: coming
  // OUT of a hole the hero is still in the air a good part of the next beat, so
  // a duck one beat later is an input he has no feet on the ground to make
  // (pitDuck: 2) — while ducking and then jumping a beat later is the same
  // ground-to-air move duckJump already allows.
  jumpPit: 2, pitJump: 2, pitPit: 2, pitDuck: 2, duckPit: 1,
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

/**
 * A chart pit's geometry at a given lane speed.
 *
 * `w` is the hole. `approach` is how far past the input position its near lip
 * stands, and it is HALF THE SLACK rather than a clearance the way every other
 * action's approach is: the hero takes off at the action point and the least
 * airborne hero in the cast (worstAirtime — B-33P's arc under Grumpos' gravity,
 * which is nobody) travels `travel` before his feet are back down, so centring
 * the break in that flight hands the player the same margin for jumping early
 * as for jumping late. That symmetry is the whole reason a hole can sit on a
 * beat grid at all: the grid is a line, and a hazard whose only fair takeoff is
 * on one side of it is not on the beat, it is just before it.
 */
export function pitLayout(speed, bpm, beats = PIT_BEATS) {
  const pxPerBeat = speed * 60 / (bpm || 120);
  const w = pxPerBeat * beats;
  const travel = worstAirtime() * speed;
  return { beats, w, approach: Math.max(PLAYER_W, (travel - w) / 2) };
}

/**
 * Half the takeoff slack a pit of this width leaves, in BEATS.
 *
 * Speed cancels — both the flight and the hole scale with it — so this is a
 * property of the chart and its tempo alone, which is what makes it something
 * the validator can check. THE CONTRACT: it must be at least ON_BEAT_WINDOW, or
 * the cabinet can score a jump as on-beat and drop the player in the hole it
 * was scored against.
 */
export function pitWindowBeats(beats = PIT_BEATS, bpm = 120) {
  const beatSec = 60 / (bpm || 120);
  return (worstAirtime() - beats * beatSec) / (2 * beatSec);
}

/** How much empty lane this chart is given after a start or a resync, in beats. */
export function laneRunwayBeats(chart) {
  return chart?.events?.some((e) => e.action === 'pit')
    ? PIT_LANE_RUNWAY_BEATS : LANE_RUNWAY_BEATS;
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
    if (!['jump', 'duck', 'pit', 'ability', 'coin'].includes(raw.action)) {
      throw new Error(`unknown beat chart action: ${raw.action}`);
    }
    if (raw.action !== 'coin' && raw.every != null) {
      // The judge reads the chart and the spawner reads the chart, and they
      // agree because every slot means the same thing on every pass. A skipped
      // JUMP would break that agreement — the lane would lay nothing and the
      // scoreboard would still demand it — so the cadence is a coin's alone.
      throw new Error(`only a coin fill may skip loops (slot ${raw.slot} is a ${raw.action})`);
    }
    if (raw.action === 'ability') {
      if (raw.type != null) throw new Error('ability beat events cannot name an obstacle type');
    } else if (raw.action === 'coin') {
      // A coin slot may be a RUN: `run: 4` lays four coins across the beat at
      // `div` to the beat instead of one on the line. It has to stay inside its
      // own beat — the grid is what keeps every coin clear of the lips either
      // side of it, and a run that reached into the next slot would be laying
      // pickups through whatever that slot is.
      const n = raw.run ?? 1;
      const div = raw.div ?? COIN_DIV;
      if (!Number.isInteger(n) || n < 1) throw new Error(`coin run must be a positive integer: ${raw.run}`);
      if (!Number.isInteger(div) || div < 1) throw new Error(`coin subdivision must be a positive integer: ${raw.div}`);
      if ((n - 1) / div >= 1) throw new Error(`coin run at slot ${raw.slot} overruns its own beat (${n} at 1/${div})`);
      // HOW OFTEN THE FIGURE PLAYS, in loop passes. The chart is fixed and
      // repeats, so without this every fill fires every time round — which is
      // fine for the common ones and wrong for a 32nd, whose whole character is
      // being rare. Counted off the loop pass rather than drawn from the RNG:
      // this cabinet's note says it never relies on a random pattern draw, and
      // a figure that arrives on a schedule can be learned.
      const every = raw.every ?? 1;
      if (!Number.isInteger(every) || every < 1) {
        throw new Error(`coin fill cadence must be a positive integer of loops: ${raw.every}`);
      }
      if (every > 1 && n === 1) throw new Error(`a single coin has no cadence to skip (slot ${raw.slot})`);
    } else if (raw.action === 'pit') {
      if (raw.type != null && raw.type !== 'gap') throw new Error('a pit beat event is a gap and nothing else');
      const beats = raw.beats ?? PIT_BEATS;
      if (!(typeof beats === 'number' && Number.isFinite(beats) && beats > 0)) {
        throw new Error(`pit width must be a positive number of beats: ${raw.beats}`);
      }
      // Only checkable once the tempo is known, which is why BeatSpawner hands
      // its bank's bpm down here. A bare validateBeatChart(chart) still checks
      // shape and spacing; it just cannot check the window.
      if (physics.bpm) {
        const window = pitWindowBeats(beats, physics.bpm);
        if (window < ON_BEAT_WINDOW) {
          throw new Error(`pit at slot ${raw.slot} is wider than the on-beat window `
            + `(${window.toFixed(3)} < ${ON_BEAT_WINDOW} beats of slack)`);
        }
      }
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

  // A COIN RUN MAY NOT REACH A HOLE. Only checkable with a tempo, like the pit
  // window above, and for the same reason: the geometry is in seconds and the
  // chart is in beats. Both ends are speed-independent — the run's length, the
  // pit's approach and the clearance all scale with the lane — so one check
  // covers every speed the cabinet is ever run at.
  if (physics.bpm) {
    const beatSec = 60 / physics.bpm;
    const clearBeats = COIN_RUN_PIT_CLEAR_SEC / beatSec;
    const runs = bySlot.filter((e) => e.action === 'coin' && (e.run ?? 1) > 1);
    const pits = bySlot.filter((e) => e.action === 'pit');
    for (const r of runs) {
      const tail = r.slot + ((r.run ?? 1) - 1) / (r.div ?? COIN_DIV);
      for (const p of pits) {
        // Where the near lip stands, in beats past the pit's own slot.
        const lip = p.slot + pitWindowBeats(p.beats ?? PIT_BEATS, physics.bpm);
        const gap = ((lip - tail) % chart.loopBeats + chart.loopBeats) % chart.loopBeats;
        if (gap < clearBeats) {
          throw new Error(`coin run at slot ${r.slot} runs up to the hole at slot ${p.slot} `
            + `(${gap.toFixed(2)} beats of road, needs ${clearBeats.toFixed(2)})`);
        }
      }
    }
  }

  // Spacing is a collision-feasibility rule for physical jump/duck hazards.
  // Ability events are timing markers and impose no obstacle gap of their own.
  const actionSlots = bySlot.filter((e) => e.action === 'jump' || e.action === 'duck'
    || e.action === 'pit').map((e) => e.slot);
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
    this.chart = validateBeatChart(chart, { bpm: bank?.bpm });
    this.bank = bank || null;
    this.runwayBeats = laneRunwayBeats(this.chart);
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
    this.actionFreeUntilBeat = null;
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
      this.actionFreeUntilBeat = null;
      this.nextX = worldX;
      return false;
    }
    // Coins from one beat out; actions only past the runway. See the
    // LANE_RUNWAY_BEATS note: the runway is action-free, not empty.
    this.cursorBeat = Math.ceil(unwrapped) + 1;
    this.actionFreeUntilBeat = unwrapped + this.runwayBeats;
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
      const minBeat = Math.ceil(beat + this.runwayBeats);
      for (let n = Math.floor(actionBeat) - this.chart.loopBeats; n <= Math.ceil(actionBeat) + this.chart.loopBeats; n++) {
        const e = this.chart.events[((n % this.chart.loopBeats) + this.chart.loopBeats) % this.chart.loopBeats];
        // A pit slot is a jump slot as far as a set piece is concerned: both ask
        // for the same input, so a crossing may land on either and the one it
        // lands on gets suppressed under it by _isSuppressed.
        if ((e?.action === 'jump' || e?.action === 'pit') && n >= minBeat) candidates.push(n);
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
      // THE RUNWAY IS ACTION-FREE, NOT EMPTY. A slot that asks an input is
      // skipped outright inside it — skipped, never deferred, so the judge's
      // matching silence (advanceBeatJudging primes past the same runway)
      // stays honest. A coin slot falls through and is laid: it asks nothing,
      // and it is what makes a checkpoint restore open onto a lane that is
      // already playing rather than onto four beats of bare road.
      if (this.actionFreeUntilBeat != null && this.cursorBeat < this.actionFreeUntilBeat
        && event.action !== 'coin') {
        this.cursorBeat++;
        continue;
      }
      const actionX = playerX + (this.cursorBeat - beat) * pxPerBeat;
      const id = beatEventId(this.cursorBeat, event);
      // Ability events are timing markers for future charts, not physical
      // hazards. They still advance the monotonic cursor and are exposed in
      // `eventInstances` for a HUD/authoring surface to render. Coin fills are
      // also mirrored there below: pickup collection is gameplay state, while
      // the ribbon must keep each subdivision alive until its own clock tick.
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
      const pit = event.action === 'pit'
        ? pitLayout(speed, this.bank?.bpm, event.beats) : null;
      const approach = pit ? pit.approach : this._approachPx(event.action, type, speed);
      const x = actionX + approach;
      // Widest the slot can ever be, cadence ignored: the finish wall is an
      // all-or-nothing boundary and must not admit a figure on the strength of
      // this pass being a quiet one.
      const coinRunW = event.action === 'coin'
        ? ((event.run ?? 1) - 1) * (pxPerBeat / (event.div ?? COIN_DIV)) + 8 : 0;
      const width = pit ? pit.w : (event.action === 'coin' ? coinRunW : (OBSTACLES[type]?.w || 8));
      if (x + width > stopX) {
        this.nextX = stopX;
        return;
      }
      if (!this._isSuppressed(actionX, event)) {
        if (pit) {
          // A HOLE THE LOOP CUTS, once every time round, on the grid.
          //
          // No coin sweep here, and that is arithmetic rather than an omission:
          // the chart's resolution is one beat, the break is centred in a flight
          // shorter than a beat, and the spacing table keeps every other action
          // two beats away — so the nearest slot a coin can occupy is already
          // clear of both lips. A coin on a lip is a lure toward a hole
          // (spawnScriptedPits argues it at length); one on the far side is the
          // landing paying you, which is the good version of the same beat.
          const hole = makeObstacle('gap', x, {});
          hole.w = pit.w;
          // No `fill`. A chart pit is an ordinary hole and wears the cabinet's
          // own material, the way every hole the Spawner lays does; naming one
          // here would route it through the set-piece pass instead (see
          // drawPitFills' ownOnly split) for no reason but that a chart cut it.
          hole.chartEventId = id;
          // 'jump', not 'pit'. The judge and the beat ribbon speak in INPUTS —
          // a hole and a bar ask the player for the same thing, and a ribbon
          // that drew them differently would be teaching a distinction the
          // controls do not have.
          hole.chartAction = 'jump';
          hole.chartSlot = event.slot;
          hole.actionBeat = this.cursorBeat;
          hole.actionX = actionX;
          obstacles.push(hole);
          this.lastActionX = actionX;
          this.lastActionKind = 'jump';
        } else if (event.action === 'coin') {
          // One coin on the line, or a RUN of them across it at `div` to the
          // beat. Spaced off pxPerBeat rather than off COIN_GAP: these are notes
          // before they are pickups, and a fixed pixel gap would be a different
          // rhythm at every speed the cabinet runs at.
          // The loop pass this beat falls in. Anchored to the heard clock's own
          // zero, so a resync re-phases the cadence rather than preserving it —
          // which is the right trade: the alternative is carrying a counter
          // across a lane rebuild that has just thrown away everything else.
          const pass = Math.floor(this.cursorBeat / this.chart.loopBeats);
          const n = (event.every ?? 1) > 1 && pass % event.every !== 0 ? 1 : (event.run ?? 1);
          const step = pxPerBeat / (event.div ?? COIN_DIV);
          for (let i = 0; i < n; i++) {
            const coin = makePickup('coin', actionX + i * step, COIN_ALT);
            coin.chartEventId = n > 1 ? `${id}:${i}` : id;
            coin.chartAction = 'coin';
            coin.chartSlot = event.slot;
            // Preserve the subdivision as musical time as well as world
            // distance. The beat ribbon reads this field directly; stamping
            // every coin with the run's first beat made a regular fill look
            // bunched and uneven even though the pickups themselves were laid
            // at the right spacing.
            coin.actionBeat = this.cursorBeat + i / (event.div ?? COIN_DIV);
            coin.actionX = actionX + i * step;
            // ONE formation for the whole run, so a hole's sweep takes it whole
            // — half a run left hanging beside a lip is the fragment problem
            // sweepCoinsAroundHole exists to prevent.
            coin.formationId = id;
            pickups.push(coin);
            this.eventInstances.push({
              live: true,
              chartEventId: coin.chartEventId,
              chartAction: 'coin',
              chartSlot: event.slot,
              actionBeat: coin.actionBeat,
              actionX: coin.actionX,
              formationId: id,
            });
          }
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
