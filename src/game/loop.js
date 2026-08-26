// The loop-de-loop.
//
// A ring of track standing on the lane, entered off a pad and ridden all the way
// round. It is the one thing in the game the hero does not do under his own
// physics, and that is not a shortcut — it is the only way it can work here.
// `player.y` is a scalar altitude above ONE floor (see player.js's integration)
// and the road profile is a single height per column (routeRise in routes.js),
// so neither of them can describe a surface that is above and below the hero at
// the same x. There is also no ceiling collision anywhere in the engine, so
// nothing could hold him against the inside of the ring even if the geometry
// existed. A loop is therefore a RIDE: for about a second the run drives the
// hero around a circle, and the physics gets him back at the far end.
//
// The trick that makes the ride sit inside the existing game rather than beside
// it is the camera. The hero's screen column is welded to PLAYER_X, so instead
// of moving him around the ring we move the WORLD around him:
//
//     x(theta)   = cx + r * sin(theta)      world x of the feet
//     alt(theta) = r * (1 - cos(theta))     altitude above the ground
//     camX       = x(theta) - PLAYER_X
//
// He is at PLAYER_X on every frame of the ride, exactly as he is on every frame
// of the run, so playerWorldX, the hit box, pickup collision and the coin magnet
// all keep working with nothing added to them: the ring's coins are collected by
// the ordinary pickup loop because the hero really is passing through them.
// What the player sees moving is the ring, which is anchored in the world.
//
// Two things fall out of that and both are wanted. d(camX)/dt is v*cos(theta),
// which equals v at the bottom — so the ride starts and ends at exactly the
// scroll rate of the run and neither end needs a blend. And over the top the
// world scrolls BACKWARD, which is the U-turn: it is what the manoeuvre looks
// like from a fixed camera, and Sonic's does the same thing.
//
// This module is the geometry alone and knows nothing about RunState, which is
// what lets a test drive it without a browser (see tests/loop.js).

import { PLAYER_SPRITE_W } from './player.js';

// A coin's box. Quoted rather than imported from the entity registry because
// this module is geometry and has no business reaching into the type table; the
// test asserts the two agree.
const PICKUP_W = 8;

export const LOOP = {
  // Radius, in world px. The top of the ring is at 2r, so this is really a
  // camera number: 92px is inside the band updateCamera already holds without
  // re-pinning the floor (a double jump goes higher), which is why the ride
  // needs no camera work of its own. A bigger ring would crane the view and
  // the hero would shrink into a corner of it at the very moment he is doing
  // the most interesting thing in the level.
  r: 46,
  // Floor on the ride speed. The lap is driven by the hero's actual run speed
  // so a boosted entry is a faster lap, but a stumbling hero at the bottom of
  // the ramp would otherwise crawl over the top, and a loop is not a place to
  // be slow — the whole read is momentum.
  minSpeed: 180,
  // THE PAD IS A BOOST PAD. It wears the boost pad's art, it takes the boost
  // pad's contact, and it has to do the boost pad's job: hitting it makes you
  // FASTER. The first cut gave the kick at the exit instead and left the lap
  // itself running at a hair over the plain run — which, once the climb below
  // took its cut, meant the whole set piece averaged out SLOWER than the ground
  // either side of it. A loop you brake for is the wrong loop.
  //
  // Applied on contact, during the run-up to the circle, so the hero visibly
  // accelerates into the mouth and the ride starts at the speed the pad gave
  // him. Same size of kick a plain boost pad gives, for the same reason.
  entryBoost: 0.5,
  // And the ring runs hot on top of that: a lap taken at running pace looks like
  // the hero is being carried round rather than thrown round.
  speedMul: 1.3,
  // How much of that the CLIMB takes back, at the very top.
  //
  // A lap at one constant rate is the single thing that gives the trick away: it
  // is a hero being conveyed round a circle, because nothing in the picture is
  // costing him anything. What a loop looks like is momentum being spent going
  // up and handed back coming down — hard through the bottom, labouring over the
  // top, and gathering it all up again on the way down.
  //
  // A THIRD, not a half. It has to read as a climb without ever reading as a
  // stall: with the entry boost under it, the top of the ring still passes at
  // well over the hero's ordinary running speed, so the lap is quick throughout
  // and merely quickER at the bottom. That is the shape a loop actually has.
  //
  // Scaled on HEIGHT rather than solved from energy. The honest version stalls:
  // at real gravity a hero would need to enter at 400px/s to crest 92px at all,
  // and every speed below that has to be caught by a floor that flattens the
  // curve back out again exactly when it is supposed to be most obvious. Height
  // gives the same shape at every entry speed and cannot stall. Symmetric, so
  // the descent hands back precisely what the climb took.
  //
  // It costs nothing at the seams: at the bottom the factor is 1, so the ride
  // leaves at exactly the speed the run is carrying.
  climbFade: 0.35,
  // Eight coins spaced evenly along the ride, hanging INSIDE the ring — in the
  // open air the hero's body sweeps through, not out on the track where they
  // straddle the rail and half of each one is buried in the structure.
  coinCount: 8,
  // How far in from the running surface, which is not an art number: it is half
  // a hero. His feet are on the circle and his body lies toward the centre of
  // it, so this is the line his middle travels, and a coin on that line is a
  // coin he goes through.
  //
  // It only works because the ride collects against a body that TURNS with him
  // (see loopBodyPoint and the ride's branch in RunState.collide). The engine's
  // own hit box never rotates — it is upright at the top of the ring, where he
  // is upside down — so pinning the coins to that box instead is what forced
  // them out onto the rail in the first place.
  coinInset: 7,
  // The arc they occupy, in radians, measured in from the bottom at each end —
  // so the run of coins starts once he is up on the near wall and stops before
  // he is back down on the far one.
  //
  // The size of it is not taste. The far end of the ring is BEHIND the pad, and
  // the hero runs through that ground on his way in, so a coin hanging low there
  // is taken before the ride has started — the lap then closes a coin short and
  // the full-lap bonus is unreachable however well it is ridden. A third of pi
  // puts the lowest coin's box at 19px, clear of a standing hero's 14px head, so
  // every coin on the ring can only be had by riding it (or by jumping for it,
  // which is a coin honestly earned).
  coinArc: Math.PI / 3,
  // The pad pays out like a boost pad, because from the seat that is what it
  // is: a thing you ran over that gave you something.
  entryScore: 50,
  // All eight. A ride collects every coin on its own, so this is not a reward
  // for skill at the ring — it is the reward for taking the ring at all rather
  // than bailing out of it, which is the decision the bail-out creates.
  bonusScore: 250,
  // Out the far side with pace, same kick a boost pad gives, so the exit feels
  // like the ring spat him out rather than set him down.
  exitBoost: 0.35,
  // A moment's grace at the exit. The lane under a ring is swept when it is
  // placed, but a barrel rolls, and coming out of a loop into a hit taken from
  // something that arrived while you were upside down is not a fair death.
  exitIframes: 0.35,
  // Where in the stage the one loop of the run stands, as a fraction of the
  // total distance. 0.55 is deliberately between the two checkpoints (1/3 and
  // 2/3): far enough in that the stage has established its own vocabulary
  // first, and clear of both restore points so a death never puts the player
  // back on top of it.
  at: 0.55,
};

const TAU = Math.PI * 2;

/**
 * Where the feet are at `theta`, as a world x and an altitude above the ground.
 * theta = 0 is the bottom of the ring and the direction of travel is bottom →
 * right wall → top → left wall → bottom, which is the way the lane runs.
 */
export function loopPoint(cx, r, theta) {
  return { x: cx + r * Math.sin(theta), alt: r * (1 - Math.cos(theta)) };
}

/**
 * The ring's coins, in the (x, alt) frame every other pickup in the game uses.
 *
 * Ground-relative on purpose, exactly like the arc formations: `alt` is height
 * above the ground UNDER EACH COIN, and the hero's own altitude is measured the
 * same way, so on rolling terrain the ring's coins and the hero's path bend
 * together and keep meeting. A coin placed in absolute screen space would drift
 * off the ride the first time the loop landed on a slope.
 */
export function loopCoinSpots(cx, tune = LOOP) {
  const out = [];
  const n = tune.coinCount;
  const a0 = tune.coinArc;
  const span = TAU - a0 * 2;
  const w = PICKUP_W;
  for (let k = 0; k < n; k++) {
    const theta = a0 + (n === 1 ? span / 2 : (k / (n - 1)) * span);
    const p = loopBodyPoint(cx, tune.r, theta, tune);
    // Both frames are corner-based — a pickup's `x`/`alt` are its box's left and
    // bottom — so the centring is done here rather than left to the caller.
    out.push({ x: p.x - w / 2, alt: p.alt - w / 2 });
  }
  return out;
}

/**
 * Where the middle of the hero is at `theta` — his feet on the circle, his body
 * lying toward the centre of it.
 *
 * This is the point the ride collects against, and it is the whole reason the
 * ring's coins can hang inside the loop instead of out on the rail. The engine's
 * hit box is an upright rectangle standing on the feet and it NEVER turns: at
 * the top of the ring it sticks up out through the track while the hero it is
 * supposed to describe hangs down inside. Anything placed to meet that box has
 * to be placed where the hero visibly is not.
 *
 * The x carries the half-sprite offset the hero's own box carries, since the
 * ride pins his sprite's left edge to the circle rather than his middle.
 */
export function loopBodyPoint(cx, r, theta, tune = LOOP) {
  const feet = loopPoint(cx, r, theta);
  // Unit vector from the feet toward the ring's centre: upright at the bottom,
  // pointing straight down at the top, sideways on the walls.
  const nx = -Math.sin(theta);
  const ny = Math.cos(theta);
  const d = tune.coinInset;
  return { x: feet.x + PLAYER_SPRITE_W / 2 + nx * d, alt: feet.alt + ny * d };
}

/**
 * Arm a ride. Not riding yet: `pending` holds until the hero's own running
 * carries him to the bottom of the circle, so the ride starts from the exact
 * point theta = 0 describes instead of snapping him there from wherever the pad
 * happened to be touched. The pad is a few px wide and the hero is 12, so
 * contact can happen up to a body-width early.
 */
export function startLoop(ob, tune = LOOP) {
  return {
    obId: ob.id,
    cx: ob.x + ob.w / 2,
    r: tune.r,
    theta: 0,
    pending: true,
    got: 0,
    total: tune.coinCount,
    // How far up the climb the sound has got. -1 is "nothing has sounded yet";
    // the run advances it a rung at a time as he covers the ring.
    rung: -1,
  };
}

/**
 * How fast the ride turns, in world px/s along the ring.
 *
 * `alt` is how high up the ring he currently is. Pass it and the climb is paid
 * for — quick through the bottom, labouring over the top; leave it out and this
 * is the entry speed, which is what the seams and the placement arithmetic want.
 */
export function loopSpeed(runSpeed, tune = LOOP, alt = 0) {
  const base = Math.max(Number(runSpeed) || 0, tune.minSpeed) * tune.speedMul;
  const climb = Math.max(0, Math.min(1, alt / (2 * tune.r)));
  return base * (1 - tune.climbFade * climb);
}

/**
 * One frame of the ride. Returns the point to put the hero at, and whether the
 * lap has closed.
 *
 * The last step is clamped to exactly TAU rather than allowed to overshoot: the
 * exit hands the hero back to the physics at alt(theta), and a theta a hair past
 * the bottom of the circle is an altitude a hair BELOW the ground, which lands
 * him inside the road.
 */
export function stepLoop(loop, dt, runSpeed, tune = LOOP) {
  // Read at the height he is at NOW, so the frame he is about to travel is
  // costed at the speed he currently has rather than the one he entered with.
  const v = loopSpeed(runSpeed, tune, loopPoint(0, loop.r, loop.theta).alt);
  loop.theta = Math.min(TAU, loop.theta + (v / loop.r) * dt);
  const done = loop.theta >= TAU;
  const p = loopPoint(loop.cx, loop.r, loop.theta);
  return { x: p.x, alt: p.alt, done };
}

/**
 * The velocity a hero leaving the ring at `theta` carries away with him — the
 * tangent, which is what a bail-out is.
 *
 * Only the vertical component is wanted. The horizontal one is the run itself
 * and the run never stops, so handing it back would double it; what the jump
 * buys is the height, and on the left-hand half of the ring (theta > pi) the
 * sine is negative and the hero is thrown DOWNWARD off the underside, which is
 * the honest answer for letting go while inverted.
 */
export function loopExitVy(loop, runSpeed, tune = LOOP) {
  const alt = loopPoint(0, loop.r, loop.theta).alt;
  return loopSpeed(runSpeed, tune, alt) * Math.sin(loop.theta);
}
