// Seeded pattern spawner with COMPUTED fairness. DOM-free so the headless
// fairness sim can import it directly.
import { OBSTACLES, PICKUPS, makeObstacle, makePickup } from './entities.js';
import { PUNT, HEAVY_PUNT } from './punt.js';
import { GRAVITY, BASE_JUMP_V } from './player.js';
import { randomPowerPickup } from './powerups.js';

// How much extra room a puntable prop buys the obstacle behind it, in seconds
// of travel. A punt hangs for roughly a second (see PUNT in punt.js), and this
// covers most of it, so the juggle jump is over before the next thing needs
// jumping. Seconds rather than pixels because the whole gap budget is in
// seconds and the run keeps accelerating.
const PUNT_CLEARANCE_T = 0.75;
// Read against the CONE, which is what the number above was measured on, and
// scaled to whatever the prop in hand actually hangs for. A barrel is down a
// fifth sooner (HEAVY_PUNT is a lower arc), so it buys a fifth less room — and
// that matters because barrels are in the base pattern set where cones are in
// one cabinet: a flat cone-sized clearance would have quietly thinned the
// tier-2 lane of every stage in the game to pay for an arc that is not in the
// air that long.
//
// The barrel's clearance is bought for a different reason than the cone's, and
// it is the readability half of the argument above rather than the juggle. A
// punted barrel does not come back to be jumped for — it goes up and leaves —
// but on the way out it crosses the lane ahead at head height for the best part
// of a second, through exactly the strip where the next obstacle appears. Room
// enough for it to be gone is room enough to read what comes next.
const hangOf = (tune) => (2 * tune.launchVy) / tune.gravity;
const puntClearanceT = (def) => (def && def.punt
  ? PUNT_CLEARANCE_T * (hangOf(def.punt === 'heavy' ? HEAVY_PUNT : PUNT) / hangOf(PUNT))
  : 0);
export const REACT_FLOOR = 0.25;      // seconds of reaction after previous action
export const REACT_FLOOR_MAX = 0.2;   // at highest tiers / UNPLUGGED

// Coin lattice: one spacing used both across and up, so a block reads as a
// square grid rather than a stretched one. The floor is the resting altitude of
// a coin sitting on the ground.
export const COIN_GAP = 14;
export const COIN_FLOOR = 8;

// HOW FAR A HOLE OWNS THE LANE EITHER SIDE OF ITSELF.
//
// A pit is the one hazard whose fairness is not about reaction time but about
// RUN-UP and LANDING: the near lip is where the jump has to be taken and the
// far lip is where it comes down, and neither is a place the player gets to
// choose anything. Anything standing in that window — a crate, and equally a
// COIN — takes the choice away, because a coin at the lip is a lure toward the
// hole and a coin over it is a lure into one.
//
// Two and a bit reaction runways, floored so the slowest stage still gets a
// real window. Shared rather than restated: `spawnScriptedPits` cuts holes into
// a lane the spawner has already laid, and a hole that clears its approach by a
// different number than the spawner keeps clear of one is two rules for a
// single picture.
export const pitClearance = (react, speed) => Math.max(120, react * speed * 2.4);

// A coin formation's width, known before any coin is placed so the run can be
// tested against a hole and moved WHOLE. Half a formation is the same fairness
// hole a half pattern is — worse here, because what is left of an amputated arc
// is a fragment hanging in the air with nothing to say why.
export function coinSpan(cell) {
  switch (cell.shape || 'arc') {
    case 'block': return ((cell.cols || 3) - 1) * COIN_GAP;
    case 'line':  return ((cell.n || 6) - 1) * COIN_GAP;
    case 'stair': return ((cell.n || 5) - 1) * COIN_GAP;
    default:      return ((cell.n || 7) - 1) * COIN_GAP;
  }
}

// Worst-case airtime among heroes: heavy Grumpos (gravity ×1.25).
export function worstAirtime() { return (2 * BASE_JUMP_V * 0.9) / (GRAVITY * 1.25); }

/**
 * Worst-case jump APEX, on the same deliberately pessimistic footing as
 * `worstAirtime`: the lowest jumpMult in the cast (B-33P's 0.9) crossed with
 * the heaviest gravity (Grumpos' ×1.25). No single hero is both, which is the
 * point — a height cleared by this imaginary worst hero is cleared by all of
 * them. Comes out at ~37px against a real cast minimum of 45.5 (Grumpos).
 *
 * What it is FOR: anything the player has to land on top of. A slab the one
 * heavy hero cannot reach is not a difficulty spike, it is a bug that only
 * shows up on one eighth of the relay bag.
 */
export function worstJumpApex() {
  const v = BASE_JUMP_V * 0.9;
  return (v * v) / (2 * GRAVITY * 1.25);
}

/**
 * Slide a run of width `w` starting at `x0` out from under every hole, landing
 * side. Repeated rather than done once: pushing clear of one hole can walk the
 * run into the next, and a lane may carry two.
 */
/**
 * Take away every coin whose FORMATION reaches into a hole's clearance window.
 *
 * The other half of the rule `clearOfHoles` enforces, for coins that are
 * already in the world when the hole appears: a pattern's own gap is laid after
 * the previous pattern's coin run, and `spawnScriptedPits` cuts holes into a
 * lane the spawner filled seconds ago. Both leave coins standing on a lip that
 * did not exist when they were placed.
 *
 * By formation, never by position. An arc is 84px wide against a window
 * measured from the lip, so a positional cut takes the middle of a run and
 * leaves its far end hanging in the air with nothing to say why it stopped.
 */
export function sweepCoinsAroundHole(pickups, hx, hw, clear, view = null) {
  const doomed = new Set();
  for (const p of pickups) {
    if (!p.live || p.following || p.formation == null || !p.def.coin) continue;
    if (p.x + p.w > hx - clear && p.x < hx + hw + clear) doomed.add(p.formation);
  }
  if (!doomed.size) return;
  // NOTHING VANISHES IN PLAIN VIEW. A tunnel's mouths are cut into a lane that
  // is still being filled ahead of the camera, so this runs continuously, and a
  // run of coins winking out while the player is looking at it is a worse
  // picture than the one being fixed. So a formation with any coin ON SCREEN is
  // left where it is until it has gone by. The lane fills 200px further out
  // than the view reaches, so in practice a run is caught before it arrives.
  //
  // The window is the VIEW, not everything ahead of the camera. Keying off the
  // near edge alone meant a run whose first coin had already scrolled past was
  // protected for the rest of the stage — permanently, since nothing behind the
  // camera ever comes back — which is precisely the run standing on the lip.
  //
  // Route coins are untouched whatever happens: the line diving into a mouth
  // and the run along the road below carry no formation, because they are not
  // formations — they are the road saying where it goes.
  if (view) {
    for (const p of pickups) {
      if (p.formation != null && doomed.has(p.formation)
        && p.x + p.w > view.x && p.x < view.x + view.w) return;
    }
  }
  for (const p of pickups) if (p.formation != null && doomed.has(p.formation)) p.live = false;
}

function clearOfHoles(x0, w, holes, clear) {
  if (!holes.length) return x0;
  let x = x0;
  for (let pass = 0; pass < holes.length + 1; pass++) {
    let moved = false;
    for (const h of holes) {
      if (x + w > h.x - clear && x < h.x + h.w + clear) { x = h.x + h.w + clear; moved = true; }
    }
    if (!moved) break;
  }
  return x;
}

let nextFormationId = 1;

export class Spawner {
  constructor({ cabinet, rng, tierMax = 2, react = REACT_FLOOR, iceSlide = 0 }) {
    this.cabinet = cabinet;
    this.rng = rng;
    this.tierMax = tierMax;
    this.react = react;
    this.iceSlide = iceSlide;      // extra px of gap for slidey landings
    this.nextX = 0;
    this.lastPatternIdx = -1;
    this.lastActionX = -9999;
    this.lastActionKind = 'none';
    // Whether the last action cell was something a slide can punt. Kept apart
    // from `lastActionKind` because it is not an action CLASS — a cone is
    // still jumped like anything else. What it changes is the space AFTER.
    this.lastWasPunt = 0;
    // Patterns marked `once` that this run has already laid down, held by
    // OBJECT rather than by index. Index was the first attempt and it is fragile
    // in exactly the case that matters: The Surge's bank is the union of every
    // other cabinet's patterns, so a shared pattern object appears in it twice,
    // and two indices for one pattern is two chances to place a "once" hazard.
    // Identity cannot be fooled that way.
    this.usedOnce = new Set();
  }

  // Minimum world-px between an action obstacle and the next one, at speed px/s.
  //
  // `prevPunt` buys room after a puntable prop, and it is about READABILITY
  // rather than fairness. A punted cone hangs for about a second and the
  // player jumps to juggle it; with the ordinary gap the next obstacle arrived
  // inside that hang, so the juggle jump was the same jump he had to make
  // anyway. The trick landed as an accident rather than a decision. Pushing
  // the next obstacle past the cone's flight makes going up for it a choice
  // that costs something.
  //
  // Added on top of the fairness floor, never instead of it: this only ever
  // makes gaps larger, so the sim's own assertion is untouched.
  fairGap(speed, prevKind, nextKind, prevPunt = 0) {
    const air = worstAirtime();
    let t = this.react;
    if (prevKind === 'jump') t += air;               // must land first
    if (prevKind === 'jump' && nextKind === 'duck') t += 0.15; // can't duck mid-air
    // Seconds of hang the previous prop bought, from puntClearanceT — a number
    // now rather than a flag, since two puntable props with different arcs owe
    // different amounts of room. `true` from an older caller still reads as a
    // second, which is the cone's arc to within a rounding error.
    if (prevPunt) t += (prevPunt === true ? PUNT_CLEARANCE_T : prevPunt);
    return speed * t + this.iceSlide;
  }

  // ONCE-PER-RUN PATTERNS. `once: true` on a pattern means the lane may show it
  // at most one time in a stage, however long the stage runs.
  //
  // It exists for the banana peel, and the reason it is a pattern flag rather
  // than anything peel-specific is that the constraint is about RARITY, not
  // about bananas: a hazard whose whole joke is that you did not expect it stops
  // being funny the third time, and any future prop with that property wants the
  // same treatment. Nothing else in the cabinets uses it today.
  //
  // Filtered out of the pool rather than rolled and rejected, so the seeded
  // stream is not disturbed by a pattern that was never going to be placed —
  // and marked used only once fill() COMMITS it, since a pattern that runs into
  // the finish wall is abandoned whole and has not been shown to anybody.
  //
  // `onceGroup` widens the key from one pattern to a named family: every peel
  // pattern carries `onceGroup: 'peel'`, so laying ANY of them down spends the
  // peel for the whole run — the cap stays "one peel per run" even though the
  // peel now arrives in more than one shape. A pattern without a group still
  // keys on its own identity, which is what keeps Surge's union bank honest
  // (see the usedOnce note in reset()).
  pickPattern() {
    const pats = this.cabinet.patterns.filter((p) => p.tier <= this.tierMax
      && !(p.once && this.usedOnce.has(p.onceGroup || p)));
    if (!pats.length) return null;
    let idx = this.rng.int(0, pats.length - 1);
    if (idx === this.lastPatternIdx && pats.length > 1) idx = (idx + 1) % pats.length;
    this.lastPatternIdx = idx;
    return pats[idx];
  }

  // Fill entities up to worldX + lookahead. Returns arrays of new entities.
  //
  // `stopX` is a hard wall the lane is not allowed to cross — the finish
  // marker's clear approach. Nothing is placed on it, near it or past it: a
  // pattern that would reach the wall is abandoned WHOLE rather than trimmed to
  // fit, because half a pattern is a fairness hole (the half that got cut may
  // have been the coins the jump was for, or the platform the spikes needed).
  // The last thing the player sees before the flagpole is empty ground, which
  // is the only thing that reads as a finishing straight.
  fill(worldX, speed, obstacles, pickups, jumpHeightFn, stopX = Infinity) {
    const lookahead = Math.min(worldX + 480 + 200, stopX);
    while (this.nextX < lookahead) {
      const pat = this.pickPattern();
      if (!pat) { this.nextX += 200; continue; }
      let baseX = this.nextX;
      let lastX = baseX;
      // Staged, not pushed: the pattern only joins the world once it is known to
      // fit inside the wall, so an over-running one leaves nothing behind.
      const obs = [], picks = [];
      // The fairness cursors move as cells are placed and must not be left
      // advanced by a pattern that gets thrown away.
      const actionX = this.lastActionX, actionKind = this.lastActionKind;
      const wasPunt = this.lastWasPunt;
      // Coins are laid AFTER the obstacles, not in cell order, because where a
      // formation may go depends on where the holes ended up — and a gap moves:
      // `fairGap` can push it right of the dx the pattern asked for, so a coin
      // run placed on the way past would be measured against a hole that is not
      // there yet.
      const coinCells = [];
      for (const cell of pat.cells) {
        if (cell.t === 'coins') { coinCells.push(cell); continue; }
        const def = OBSTACLES[cell.t];
        if (!def) continue;
        let x = baseX + cell.dx;
        const cellW = cell.t === 'gap' ? (cell.w || def.w) : def.w;
        // Fairness: enforce spacing from the previous action-required cell.
        if (def.action !== 'none') {
          const minX = this.lastActionX
            + this.fairGap(speed, this.lastActionKind, def.action, this.lastWasPunt);
          if (x < minX) x = minX;
          this.lastActionX = x + cellW;
          this.lastActionKind = def.action;
          this.lastWasPunt = puntClearanceT(def);
        }
        const ob = makeObstacle(cell.t, x, { n: cell.n });
        if (cell.t === 'gap') ob.w = cellW;
        // Altitude. A def's `alt` is its home; a cell's `y` may override it,
        // but ONLY for `action: 'none'` flyers — targets, prize crates, the
        // shooter, the switch — where where-it-hangs is legitimate authored
        // variety. A `duck` flyer's altitude IS its contract: the underside
        // has to sit where the duck clears it and the stand does not, so a
        // pattern cannot move it (a drone lifted to y 26 would sail over a
        // standing hero and stop being an obstacle at all). For years every
        // `y` here was dead — the guard was `def.alt == null` and every flyer
        // declares an alt — so the pattern lists were authoring altitudes
        // nothing read. Authors owe reachability on prize/target cells: keep
        // the box's bottom under the worst hero's jump reach (see the
        // authored-altitude block in tests/standing-hazards.js).
        if (!def.ground) {
          if (def.alt == null) ob.alt = cell.y || 12;
          else if (cell.y != null && def.action === 'none') ob.alt = cell.y;
        }
        obs.push(ob);
        lastX = Math.max(lastX, x + ob.w);
      }
      // NO COIN OVER A HOLE, AND NONE ON EITHER LIP.
      //
      // Moved rather than trimmed: a run pushed past the landing is still the
      // shape the pattern drew, and it is now somewhere the player arrives with
      // a jump in hand. Trimming leaves the tail of an arc floating over the
      // pit — which is the picture this rule exists to delete.
      const holes = obs.filter((o) => o.def.isGap).map((o) => ({ x: o.x, w: o.w }));
      for (const cell of coinCells) {
        const x = clearOfHoles(baseX + cell.dx, coinSpan(cell) + PICKUPS.coin.w,
          holes, pitClearance(this.react, speed));
        lastX = Math.max(lastX, x + this.spawnCoins(x, cell, picks, jumpHeightFn));
      }
      // The far edge of everything this pattern laid down, coins included.
      let right = lastX;
      for (const p of picks) right = Math.max(right, p.x + (p.w || 8));
      if (right > stopX) {
        this.lastActionX = actionX;
        this.lastActionKind = actionKind;
        this.lastWasPunt = wasPunt;
        this.nextX = stopX;      // the lane is closed from here to the marker
        return;
      }
      for (const ob of obs) obstacles.push(ob);
      for (const p of picks) pickups.push(p);
      // A hole clears its APPROACH as well as its landing, and the approach was
      // laid by the pattern before this one — which knew nothing about a gap
      // that had not been chosen yet. `clearOfHoles` can only move what this
      // pattern is placing; this takes back what is already down.
      const clear = pitClearance(this.react, speed);
      for (const h of holes) sweepCoinsAroundHole(pickups, h.x, h.w, clear, { x: worldX, w: 480 });
      // Committed, so a `once` pattern is now spent for this run — and with it
      // its whole onceGroup, if it names one. Above the stopX bail-out on
      // purpose — see pickPattern.
      if (pat.once) this.usedOnce.add(pat.onceGroup || pat);
      // Gap to the next pattern: random but never below the fairness floor.
      // The next pattern may open with a duck obstacle, so budget for the worst case.
      const roll = this.rng.range(90, 220);
      const fair = this.fairGap(speed, this.lastActionKind, 'duck', this.lastWasPunt);
      this.nextX = Math.max(lastX, this.lastActionX) + Math.max(roll, fair);
    }
  }

  // Coin formations. Every shape is anchored on the ground line at COIN_FLOOR
  // and clamped to the current hero's jump envelope, so anything laid down here
  // is reachable by construction — the same guarantee the arc always had.
  // Returns the formation's width in px so fill() can advance past it.
  spawnCoins(x0, cell, pickups, jumpHeightFn) {
    const hMax = (jumpHeightFn ? jumpHeightFn() : 45) * 0.85;
    // Every coin carries the id of the run it belongs to, so a formation can be
    // taken away whole later. `spawnScriptedPits` cuts holes into a lane that is
    // already laid, and without this it could only sweep by position — which is
    // how an arc came to be left as a fragment hanging at the lip of a pit. A
    // formation is one thing; anything that removes part of it removes all of it.
    const fid = nextFormationId++;
    const put = (dx, alt) => {
      const c = makePickup('coin', x0 + dx, COIN_FLOOR + alt);
      c.formation = fid;
      pickups.push(c);
    };
    switch (cell.shape || 'arc') {
      // The jump parabola itself. n IS the shape: four coins sample the hump
      // coarsely enough to read as a triangle, seven or more as a curve.
      case 'arc': {
        const n = cell.n || 7;
        for (let i = 0; i < n; i++) {
          const t = n === 1 ? 0.5 : i / (n - 1);
          put(i * COIN_GAP, hMax * Math.sin(Math.PI * t));
        }
        return (n - 1) * COIN_GAP;
      }
      // A slab you punch through on the way up. Rows are clamped to the jump
      // envelope, so a short hero never sees a row they cannot touch.
      case 'block': {
        const cols = cell.cols || 3;
        const rows = Math.min(cell.rows || 3, 1 + Math.floor(hMax / COIN_GAP));
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) put(c * COIN_GAP, r * COIN_GAP);
        }
        return (cols - 1) * COIN_GAP;
      }
      // A flat run along the ground: pure reward, no input, a breather between
      // two hazards. Reads as a straight line precisely because it is one.
      case 'line': {
        const n = cell.n || 6;
        for (let i = 0; i < n; i++) put(i * COIN_GAP, 0);
        return (n - 1) * COIN_GAP;
      }
      // A ramp climbing one coin per step, which telegraphs the jump before the
      // player reaches it. Clamped flat once the steps top out the envelope.
      case 'stair': {
        const n = cell.n || 5;
        for (let i = 0; i < n; i++) put(i * COIN_GAP, Math.min(i * COIN_GAP, hMax));
        return (n - 1) * COIN_GAP;
      }
      default: return 0;
    }
  }
}

// Two capsules must never share a screen. The timed drip is spaced out on its
// own (12-18s apart is thousands of world px), but !-box prizes come from a
// different clock entirely, and a prize landing on top of a drip capsule — or
// two boxes paying out in a row — is what puts a pair side by side. Every
// capsule source reports through notePower/canPlacePower so the rule holds
// across sources rather than within each one.
export const POWER_MIN_GAP = 480;   // one screen of world px

// Capsule/battery drip spawner (kept separate from patterns; verified reachable).
// Every drop the drip makes — capsule or cell — wears the same 8px box, so one
// width covers both wall tests below.
const DRIP_W = PICKUPS.battery.w;

export class DripSpawner {
  constructor(rng, benchLevels) {
    this.rng = rng;
    this.bench = benchLevels;
    this.capsuleTimer = this.rng.range(12, 18);
    this.batteryTimer = this.rng.range(20, 30);
    this.lastPowerX = -1e9;   // finite so it survives a snapshot round-trip
    this.lastPowerType = null;
  }

  // Would a capsule placed here be at least a screen clear of the last one?
  canPlacePower(x) { return x >= this.lastPowerX + POWER_MIN_GAP; }

  // Where a capsule actually came to rest (tossed prizes travel before they
  // settle), so the next one measures from the thing the player will see.
  notePower(x, type) {
    if (x <= this.lastPowerX) return;
    this.lastPowerX = x;
    this.lastPowerType = type;
  }

  // `stopX` is the same wall Spawner.fill respects — the finish marker's clear
  // approach. The drip used to ignore it, and it drops FURTHER out than the
  // pattern lane does, so the last capsule or cell of a stage could land inside
  // the finishing straight: it scrolled in, it was collectable, and then it was
  // deleted the moment the finish armed. Holding rather than skipping matches
  // the crowding rule below, and both tests are made before the type is rolled
  // so a hold cannot disturb the seeded order of prizes.
  update(dt, worldX, pickups, oneHit, batteryFull = false, stopX = Infinity, allowRewind = true, banned = null) {
    this.capsuleTimer -= dt;
    this.batteryTimer -= dt;
    if (this.capsuleTimer <= 0) {
      const x = worldX + 480 + 60;
      // Too close to a prize that just dropped: hold the capsule rather than
      // skip it, and retry shortly — the world scrolls the gap open in about a
      // second, so the drip keeps its cadence instead of losing a beat.
      if (!this.canPlacePower(x) || x + DRIP_W > stopX) {
        this.capsuleTimer = 0.5;
      } else {
        this.capsuleTimer = this.rng.range(12, 18);
        const type = randomPowerPickup(this.rng, this.lastPowerType, { allowRewind, banned });
        pickups.push(makePickup(type, x, 34));
        this.notePower(x, type);
      }
    }
    if (!oneHit && this.batteryTimer <= 0) {
      const x = worldX + 480 + 100;
      if (x + DRIP_W > stopX) {
        this.batteryTimer = 0.5;
      } else {
        this.batteryTimer = this.rng.range(20, 30);
        if (!batteryFull) pickups.push(makePickup('battery', x, 10));
      }
    }
  }
}
