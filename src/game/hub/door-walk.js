// Walking through a food-court door, staged instead of cut.
//
// The hub used to swap states on the frame the hero reached a boundary — one
// frame walking, the next frame somewhere else. This gives the exit the beat it
// was missing, in the spirit of hub/cabinet-dive.js.
//
// TWO RULES, and everything here follows from them.
//
// 1. HE NEVER CHANGES SIZE. No shrink, no fade, no turning to face camera. He
//    keeps his stride and his scale and walks BEHIND the door, which eats him
//    exactly as it would eat anything else passing behind it. An earlier pass
//    had him recede into the dark and it read as falling away from the room
//    rather than stepping into one.
//
// 2. IT IS ONE CONTINUOUS MOTION FROM WHERE HE ALREADY IS. The sequence does
//    not place him anywhere. An earlier version started him at a fixed approach
//    offset, which yanked him back from wherever he had actually stopped and
//    walked him in again — he appeared to pop backwards and arrive twice. So
//    there is no keyframed position here at all: he simply keeps walking, at
//    the speed he was already walking, from the spot he was standing on, until
//    the door has him.
//
// That second rule is why this has no fixed duration. How long it takes depends
// on how far he had left to go, which is the only honest answer.

// How far past the doorway centre he has to travel before the door has taken
// him completely. Sized off the widest case: a pocket door parks its leaf on
// the side he is walking toward, so he has to clear the leaf's inner edge plus
// his own half-width. Short by a couple of units and the door shuts on a sliver
// of hero, which is worse than it sounds.
const CLEAR = 34;

// The door's own beats, which do NOT depend on how far he walked.
const SWING = 0.26;   // a hinged leaf getting out of his way
const SHUT = 0.30;    // the leaf coming back once he is through
// One beat on the shut door before the cut. Same reasoning as the dive's `exit`
// phase: cutting on the frame he vanishes reads as the game losing him rather
// than as him leaving.
const HOLD = 0.18;

// WHICH WAY HE GOES, by station, because it is a fact about the room and not
// about the mechanism. Each boundary door is in the wall it is in: you leave by
// the EXIT heading left because the EXIT is the left end of the concourse, and
// you enter the Trophy Room heading right for the same reason in reverse.
//
// The hinged pair are not boundaries but the rule still holds — their hinge is
// on the left, so their opening is on the right, and walking left would walk
// him into a door that is still swinging.
export const WALK_DIR = { exit: -1, shelf: 1, arcade: 1, backroom: 1 };

const clamp01 = (n) => Math.max(0, Math.min(1, n));
const ease = (k) => k * k * (3 - 2 * k);

// ARRIVING is the same walk played the other way: the door opens, he comes out
// from behind it and the door shuts behind him. `mode: 'out'` builds that one.
//
// Two things flip and nothing else does. He travels the opposite way, because
// the door he left by is the door he comes back through. And the door has to
// OPEN first — on the way out a pocket door was already standing open, but a
// room you have just arrived in has a shut door in it.
//
// `toX` is where he ends up: the spot the room would have spawned him on. The
// sequence walks him to it rather than the room placing him there.
export function makeDoorEntry({
  kind, doorX, toX, type, speed, gaitCycle = 46 * (40 / 58),
  dir = -(WALK_DIR[type] ?? -1), onDone = null,
}) {
  const open = kind === 'swing' ? SWING : SHUT;
  // He is behind the door until it lets him out. Starting him a clear width
  // back means the first thing the player sees is a hero already walking, not
  // one materialising in a doorway.
  const startX = doorX - dir * CLEAR;
  const target = Number.isFinite(toX) ? toX : doorX + dir * CLEAR;
  const walkStart = open * 0.55;          // step off as soon as there is a gap
  const walkDur = Math.abs(target - startX) / Math.max(1, speed);
  const clearT = walkStart + CLEAR / Math.max(1, speed);
  const duration = Math.max(walkStart + walkDur, clearT + open);

  return {
    kind, dir, type, doorX, speed, onDone, duration, mode: 'out', toX: target, t: 0,
    get done() { return this.t >= duration; },
    update(dt) { this.t += dt; },
    state() {
      const t = this.t;
      const moved = Math.min(Math.max(t - walkStart, 0), walkDur);
      const px = startX + dir * speed * moved;
      const openK = ease(clamp01(t / open));
      const shutK = ease(clamp01((t - clearT) / open));
      return {
        t,
        kind,
        dir,
        px,
        doorOpen: openK * (1 - shutK),
        walking: t <= walkStart + walkDur,
        facing: dir,
        // The room is the side he is walking TOWARD on the way in, which is the
        // opposite of the way out — see the clip note on openingEdge().
        roomSide: dir,
        // The phase follows the DOOR, not the hero. It used to flip to 'shut'
        // when he finished walking to his mark, but the leaf starts closing at
        // clearT — the moment he is out of the doorway — and he then keeps
        // walking several strides further into the room. So the shut cue landed
        // most of half a second after the door had visibly finished shutting.
        phase: t < walkStart ? 'open' : t < clearT ? 'walk' : 'shut',
        gait: ((Math.abs(px - startX) / gaitCycle) % 1 + 1) % 1,
      };
    },
  };
}

export function makeDoorWalk({
  kind, doorX, fromX, type, speed, gaitCycle = 46 * (40 / 58), openFrom = 1,
  dir = WALK_DIR[type] ?? -1, onDone = null,
}) {
  // Everything he has left to cover: the ground between him and the doorway,
  // plus the run past it that puts him behind the door. At his own walking
  // speed, so the sequence is indistinguishable from the walk it continues.
  // A caller can hand us a station with no position — a synthetic one from a
  // test, most obviously. Without geometry there is no walk to time, so fall
  // back to the door's own beats rather than propagating a NaN into the clock,
  // which would leave the sequence permanently not-done and hang the room.
  const measurable = Number.isFinite(doorX) && Number.isFinite(fromX);
  const travel = measurable ? Math.abs(doorX - fromX) + CLEAR : CLEAR;
  const clearT = travel / Math.max(1, speed);
  const duration = clearT + SHUT + HOLD;

  return {
    kind,
    dir,
    type,
    doorX,
    fromX,
    speed,
    onDone,
    duration,
    t: 0,
    get done() { return this.t >= duration; },
    update(dt) { this.t += dt; },

    state() {
      const t = this.t;
      // Position: one straight line at one speed. No easing, because easing is
      // what a keyframed walk looks like and this is meant to look like the
      // walk he was already doing.
      const px = fromX + dir * speed * Math.min(t, clearT);
      const walking = t < clearT;
      const shutK = clamp01((t - clearT) / SHUT);
      // A pocket door was already standing open — proximity opened it long ago.
      // A hinged one has to get out of his way, and does it while he walks,
      // never as a pause: its hinge is on the far side from his exit, so he is
      // not waiting on it even if he started with his nose against the frame.
      // A pocket door is usually already open when he gets here, but the
      // sensor is deliberately short-range now, so it can still be on its way.
      // Carry on from wherever it actually is rather than snapping it open.
      const slideOpen = openFrom + (1 - openFrom) * ease(clamp01(t / 0.18));
      const doorOpen = kind === 'slide'
        ? slideOpen * (1 - ease(shutK))
        : ease(clamp01(t / SWING)) * (1 - ease(shutK));
      return {
        t,
        kind,
        dir,
        px,
        doorOpen,
        walking,
        facing: dir,
        // On the way OUT the room is behind him — the side he came from.
        roomSide: -dir,
        phase: walking ? 'walk' : shutK < 1 ? 'shut' : 'hold',
        // Distance-driven on the SAME cadence as the room's own gait clock
        // (PLAYER_H * GAIT_DISTANCE_PER_CYCLE in hub/index.js), so his legs
        // carry straight on at the rate they were already turning over instead
        // of switching to some rate of this sequence's own invention.
        gait: ((Math.abs(px - fromX) / gaitCycle) % 1 + 1) % 1,
      };
    },
  };
}

// WHERE THE DOOR STOPS AND THE DARK BEGINS, in the painter's own units.
//
// Returns the x the hero passes behind; the caller clips him to the near side
// of it. Clipping is the same picture as drawing him under an opaque leaf and
// does not need paintDoor split open to get at the draw order.
//
// `geom` is DOOR_BOX.leaf and .well in destination units. The maths mirrors the
// painters in sprites/arcade.js and has to keep mirroring them: the slide
// translates its leaf by 0.92 of its width, the swing foreshortens toward its
// hinge, and both of those numbers live over there.
//
// The two doors hide him behind different things. A POCKET DOOR parks its leaf
// clear of the opening, inside the wall, and walking behind that parked leaf is
// what a pocket is for. A HINGED DOOR keeps its leaf across the hinge half of
// its own aperture, so there is nothing to hide behind on that side — the far
// jamb is what takes him.
//
// It keys off ROOM SIDE, never off which way the hero happens to be walking.
// The same doorway hides him on the same side whether he is leaving through it
// or arriving out of it; only his direction of travel flips, and keying the
// clip off that put the arriving hero on the wrong side of his own door.
export function openingEdge(kind, openAmt, roomSide, geom, slideDir = -roomSide) {
  const { lx, lw, wx, ww } = geom;
  if (kind === 'slide') {
    const slideX = lx + slideDir * openAmt * lw * 0.92;
    return slideDir < 0 ? slideX + lw : slideX;
  }
  return roomSide < 0 ? wx + ww : wx;
}
