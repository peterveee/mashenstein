// The demo bot: a reactive player good enough to showcase any stage or boss.
// Promoted from the run-complete test bot. It only speaks through Input
// press/release, and never touches Input.activity — so attract mode can tell
// the bot from a human.
import { Input } from '../engine/input.js';
import { PLAYER_W, PLAYER_H, PLAYER_SPRITE_W, VARIABLE_JUMP_CUT, jumpV } from './player.js';

// A HOLE IS THE ONE MISTAKE THE BOT MAY NOT MAKE.
//
// Everything else in the lane costs a hit and the demo carries on; a pit is
// fatal, and a fatal mistake in a watch mode ends the level in the middle,
// which is the one thing the mode exists to avoid. So the two numbers below
// are margins on the only two ways into a hole — coming down short of the far
// lip, and taking off from thin air past the near one — and every jump the bot
// takes anywhere is checked against them.
const LAND_MARGIN = 10;   // px of solid road the landing must have past the far lip
const LIP_MARGIN = 4;     // px of road the take-off must still have under it
// How long a slide is held once the chart has asked for one. Long enough for a
// drone to pass and for a barrel to meet the boot, short enough that the button
// is up again before the next beat — a punt needs a FRESH press (see the punt
// note in beatchart.js), so a slide held into one simply cannot fire.
const CHART_DUCK_HOLD = 0.28;
// What the clonk leaves him with when he bonks the villain: the rise stops and
// he drops off the hull at this (run.js's bonk branch). The bot needs the
// number to solve the flight it will really have — see `flight`.
const CLONK_VY = 20;
// The daylight a jump has to have over the top of the thing it is jumping. Two
// pixels: the hazard's height is the whole of what has to be beaten, and the
// hero's own box starts at his feet.
const CLEAR_MARGIN = 2;
// How long a shield roll refuses the jump button for (run.js sets rollT, and
// jumpPressed turns every press down while it runs).
const ROLL_LOCK = 0.65;
// WHERE THE HERO ACTUALLY IS, relative to the number the bot measures with.
//
// `px` is the hero's back — the world x his sprite is drawn from — and neither
// of the two things that hurt him is judged there. A hole opens under his
// hitbox's CENTRE (run.js's isGap branch) and a drone is met by its FRONT, so a
// bot that aims a hole with `px` is aiming six pixels short of where he falls
// and answers a flyer a whole body length after it has already hit him. Both
// offsets come off the same 12px sprite with a 2px inset either side.
const HIT_MID = (PLAYER_SPRITE_W - PLAYER_W) / 2 + PLAYER_W / 2;    // 6
const HIT_FRONT = (PLAYER_SPRITE_W - PLAYER_W) / 2 + PLAYER_W;      // 10
const HIT_BACK = (PLAYER_SPRITE_W - PLAYER_W) / 2;                  // 2
// THE LANE IS ANSWERED IN TIME, NOT IN PIXELS — see `threats`. These are the
// four moments the answer is timed against, and all four are seconds.
//
// REACT_T is the old third of a second, kept: taking off then puts the apex of
// every hero's arc on the thing. LAST_T is the frame the window shuts, and it
// is what the landing test below is allowed to be overruled by — a bad jump
// beats a hazard met standing up. DUCK_T is longer than REACT_T because the
// slide has to already be down when the flyer arrives rather than merely
// started. LAND_SETTLE is the beat between touching down and a button being
// answered: a hazard due inside it is a hazard the landing cannot answer.
const REACT_T = 0.3;
const DUCK_T = 0.4;
const LAST_T = 0.1;
const LAND_SETTLE = 0.12;
// HOW HIGH A SHOT HAS TO BE TO PASS OVER A STANDING HERO. An enemy round is a
// 5px box centred on its own alt (see the enemyShot branch in run.js) and the
// hero stands 14 tall, so anything above this misses him where he is — which
// is every drone's shot, and none of a printer's.
const SHOT_REACH = 16;

export class DemoBot {
  constructor(run) {
    this.run = run;
    this.duckHold = false;
    this.jumpHold = false;
    // Whether he has left the ground since the button went down. See the
    // landing release below — it is what makes that release once per landing
    // rather than once per frame.
    this.wasAir = false;
    this.abilityT = 1.5;
    this.abHeld = false;
    // Counts down while a chart-asked slide is held. See CHART_DUCK_HOLD.
    this.chartDuckT = 0;
    // WHICH MARK THE LAST SLIDE AND THE LAST SHOT ANSWERED.
    //
    // A cue does not stop being due once it has been played — `actionX` is a
    // place on the road and the hero stays past it — so without a memory the
    // slide simply re-arms itself the frame after it lets go, and the second
    // press lands wherever the first one's hold ran out. That is a beat broken
    // for nothing, half a beat after a beat that was kept. Cues are answered in
    // the order the road meets them, so remembering the last one is enough.
    this.duckCueKey = null;
    this.abilityCueKey = null;
  }

  /**
   * HOW MUCH ROAD A JUMP FROM HERE COVERS, in world px.
   *
   * `airtimeFor` is the hero's arc in still air. This is the arc the lane is
   * actually running under right now, and the difference is what a power-up
   * does: lowgrav stretches the flight by half again, and a `nojump` corruption
   * cuts the launch to 0.6. Both move where he comes down by more than the
   * width of a hole, so a bot that aims with the hero's paper airtime aims into
   * the hole on exactly the runs where the lane is strangest.
   */
  arcSpan() {
    const f = this.flight();
    // Aimed with the SHORTER flight when a low-gravity capsule is running out
    // under it — gravity does not care what is below him, so this one is
    // pessimistic over a hole as well. The villain's clonk is not, because the
    // run withholds it over a break (see `flight`).
    return this.spanOver(f.lapse ?? f.airtime);
  }

  /**
   * HOW MUCH ROAD PASSES UNDER HIM IN `T` SECONDS — at the speed he will
   * actually be doing, not the speed he is doing now.
   *
   * Half the lane's speed is a loan. A dash pays 1.8x for four tenths of a
   * second, a roll 1.25x, a stumble takes a quarter away, and `speedBoost` — a
   * pad, a loop exit, a tag — bleeds off at 0.6 a second. Multiply an airtime
   * by `run.speed` and every one of those is assumed to hold for the whole
   * flight, which is how the demo took off over the plumber's gearbox at 345
   * and landed at 192: it had spent its own dash getting to the lip.
   *
   * So the flight is integrated a slice at a time — one boundary for each thing
   * that can lapse inside it — with the boost's decay averaged across each. The
   * result is the number every hole, every stone and every landing is aimed
   * with.
   */
  spanOver(T) {
    const run = this.run;
    const p = run.player;
    // The hero's own temporary multiplier and how long it has to run. Same
    // order as the speed getter in run.js, because it is the same three states.
    const state = p.dashT > 0 ? { m: 1.8, t: p.dashT }
      : p.rollT > 0 ? { m: 1.25, t: p.rollT }
        : p.stumbleT > 0 ? { m: 0.72, t: p.stumbleT } : { m: 1, t: Infinity };
    // The lane's own: a SPEED capsule, which ends on a clock the bot can read.
    const cap = run.powerups?.active?.speed;
    const capM = run.powerups ? run.powerups.speedMultiplier() : 1;
    const b = run.speedBoost || 0;
    const plain = run.speed / (state.m * capM * (1 + b));
    const at = (t) => (t < state.t ? state.m : 1) * (cap && t < cap.t ? capM : 1)
      * (1 + Math.max(0, b - 0.6 * t));
    // One slice per thing that can lapse, evaluated at its midpoint: the states
    // are steps and the boost is a straight line, so the midpoint is exact for
    // both.
    const marks = [...new Set([0, T, Math.min(T, state.t), cap ? Math.min(T, cap.t) : T])]
      .sort((x, y) => x - y);
    let d = 0;
    for (let i = 1; i < marks.length; i++) {
      d += plain * (marks[i] - marks[i - 1]) * at((marks[i] + marks[i - 1]) / 2);
    }
    return d;
  }

  /** Every moment this jump could end at, soonest first. */
  landings() {
    const f = this.flight();
    return [f.cut, f.lapse, f.airtime].filter((t) => t != null).sort((a, b) => a - b);
  }

  /**
   * HOW HIGH HE IS `t` SECONDS INTO A JUMP TAKEN NOW, with the villain's cut in
   * it — so on a chase stage the answer describes the arc he will really fly.
   *
   * This is what turns the reaction window from a habit into a test. "Jump when
   * the thing is a third of a second away" is a rule of thumb that happens to
   * put the apex on the hazard for a whole arc, and says nothing at all about
   * an arc the villain is going to end early. Asking the height directly works
   * for both, and it is what lets the bot take off LATE under a hovering
   * copter: the rise is short, so the only part of it that clears a crate is
   * the beginning, and the beginning has to be where the crate is.
   */
  heightAt(t) {
    const a = this.arc();
    if (!a || t <= 0) return 0;
    const full = Math.max(0, a.v * t - (a.g * t * t) / 2);
    const alt = this.bonkAlt();
    if (alt == null || alt >= a.peak) return full;
    const rise = (a.v - Math.sqrt(Math.max(0, a.v * a.v - 2 * a.g * alt))) / a.g;
    if (t <= rise) return full;
    const d = t - rise;
    return Math.max(0, alt - (CLONK_VY * d + (a.g * d * d) / 2));
  }

  /**
   * WOULD A JUMP TAKEN NOW ACTUALLY CLEAR THIS? Measured across the whole of
   * the overlap rather than at first contact, because the far side of a wide
   * hazard is met further down the arc than the near side.
   */
  clears(t) {
    if (!t || t.act === 'duck') return false;
    const top = t.shot ? (t.shot.alt || 0) + 3
      : (t.ob.alt || 0) + (t.ob.def.h || 0);
    const from = Math.max(0, t.enter);
    for (let u = from; u <= Math.max(from, t.exit); u += 0.02) {
      if (this.heightAt(u) < top + CLEAR_MARGIN) return false;
    }
    return this.heightAt(Math.max(from, t.exit)) >= top + CLEAR_MARGIN;
  }

  /**
   * THE FLIGHT HE WILL ACTUALLY HAVE, which on a chase stage is not his arc.
   *
   * A bonk is a collision, and the collision takes the jump away: the head
   * meets the tub, the rise stops dead and vy goes to -20 (see the bonk branch
   * in run.js's updateEntities). That is the reward working as designed — and
   * it is also why the demo used to die on level 3-3. The bot cleared a cactus
   * with a jump it had solved on paper, the villain happened to be hovering
   * over the same stride, the arc was cut off at a third of its height, and the
   * hero came down on the cactus he was in the middle of clearing. Nothing in
   * the lane was misread; the flight simply was not the flight.
   *
   * So the villain is part of the arithmetic. When he is in a window (any mode
   * but the roam) and roughly over the hero's column, the rise is solved to the
   * height the tub sits at, the drop is solved from there at the clonk's own
   * -20, and everything downstream — where the landing falls, whether a hazard
   * arrives while he is up there — is asked of THAT flight. The bot then does
   * what a player does once they have learned this: it waits a beat and takes
   * off late, so the cut rise still carries it over the thing in the road.
   *
   * The run withholds the clonk over a hole already, so a predicted cut can be
   * wrong in the safe direction: he keeps the whole arc and lands further on.
   */
  flight() {
    const a = this.arc();
    if (!a) return { airtime: 0.55, cut: null, lapse: null };
    // A LOW-GRAVITY CAPSULE RUNNING OUT UNDER HIM. It stretches the flight by
    // half again, and it ends on its own clock: take off with two tenths left
    // on it and the arc that cleared the hole on paper comes down inside it,
    // which is how the demo went through the ice stage's second break. The
    // plain-gravity arc is the floor under that, and the floor is what a hole
    // is aimed with.
    const low = this.run.powerups?.active?.lowgrav;
    const g0 = this.run.player.gravity;
    const lapse = low && g0 > 0 && low.t < a.airtime && a.g < g0 ? (2 * a.v) / g0 : null;
    const alt = this.bonkAlt();
    if (alt == null || alt >= a.peak) return { airtime: a.airtime, cut: null, lapse };
    // Up to the tub, then off it: the rise is the arc solved for that height,
    // the fall is a body dropped from it with the clonk's own downward kick.
    //
    // EVERY ENDING IS KEPT, and the bot is pessimistic about each in turn: the
    // cut is a prediction about a villain who moves, and the run withholds the
    // clonk over a hole (see the bonk branch), so the jump may still fly its
    // full length. A flight with more than one landing in it has to be clear at
    // all of them.
    const rise = (a.v - Math.sqrt(Math.max(0, a.v * a.v - 2 * a.g * alt))) / a.g;
    const fall = (Math.sqrt(CLONK_VY * CLONK_VY + 2 * a.g * alt) - CLONK_VY) / a.g;
    return { airtime: a.airtime, cut: rise + fall, lapse };
  }

  /**
   * THE HEIGHT AT WHICH THE VILLAIN TAKES THE JUMP AWAY, or null for a road
   * with nothing overhead.
   *
   * Read off the run's own two boxes rather than rebuilt from the drawing's
   * constants: the head is the 24u sprite's crown plus a few units of grace and
   * the tub is a hull with a floor, and both belong to the code that draws
   * them. Asking them where they are today is what keeps this from going stale
   * the next time either picture moves.
   *
   * Only while he is IN a window — the roam is explicitly not bonkable (see the
   * mode gate on the bonk) — and only while he is somewhere over the hero. The
   * column is judged with a stride of slack on top of the two half-widths,
   * because the question is not where he is now: it is where he will be while
   * the hero is up there, and a window is exactly the villain closing on that
   * column. Solving it on the frame's own overlap said "clear road" two frames
   * before the tub arrived, which is the frame the bot takes off on.
   */
  bonkAlt() {
    const run = this.run;
    const c = run.copter;
    if (!c || c.flyOff || c.mode === 'away' || c.hitT > 0) return null;
    if (!run.copterBox || !run.playerHeadBox) return null;
    const box = run.copterBox();
    const head = run.playerHeadBox();
    if (!box || !head) return null;
    const slack = (box.w + head.w) / 2 + run.speed * 0.15;
    if (Math.abs((box.x + box.w / 2) - (head.x + head.w / 2)) > slack) return null;
    // Both back into altitudes above the ground each is measured from, which is
    // the coordinate the arc is solved in.
    const tub = run.groundYAt(c.x) - (box.y + box.h);
    const crown = (run.playerGroundY() - head.y) - run.player.y;
    return tub - crown;
  }

  /**
   * THE ARC THIS HERO WOULD LEAVE THE GROUND IN, right now, under this lane.
   *
   * Launch speed and the gravity actually acting on him, and the two times that
   * fall out of them: `apex` is how long he takes to reach the top of the jump
   * and `airtime` is the whole flight. Both callers need the same numbers —
   * arcSpan turns airtime into road covered, finishJump aims apex at the
   * plunger — so they are solved once rather than twice.
   *
   * Null when there is nothing to solve from: no hero, or a lane that has
   * somehow taken gravity away. Callers fall back to their own guess.
   */
  arc() {
    const run = this.run;
    const p = run.player;
    const hero = p.hero;
    if (!hero) return null;
    const g = p.gravity * (run.powerups?.gravityMultiplier?.() ?? 1);
    const v = jumpV(hero) * (p.jumpScale || 1);
    if (!(g > 0) || !(v > 0)) return null;
    return { v, g, apex: v / g, airtime: 2 * v / g, peak: (v * v) / (2 * g) };
  }

  /**
   * THE LAST JUMP OF THE STAGE — the one that puts him ON the plunger.
   *
   * The finish is graded on where he is in the air when he reaches the cap, not
   * on reaching it (resolveFlip in run.js): grounded is a CLUNK worth nothing,
   * and the bands are fractions of his own peak. So a bot that simply runs at
   * the marker plays every stage's last beat as the worst grade in the game,
   * and — the reason this exists — the ending LOOKS like running into a post.
   *
   * There is exactly one press to solve for, and it is not a reaction: the cap
   * is a fixed place, so the answer is "leave the ground one apex before you
   * get there" and the top of the arc lands on the thing. Every hero clears
   * PERFECT that way, including the heavy ones — their gravity is 1.25x while
   * the grade's peak is measured at standard, which puts their own apex at 0.80
   * of it against the 0.70 the band asks for.
   *
   * Pressing a frame or two early is harmless and pressing late is survivable:
   * he is past the apex by a fraction of a pixel in the first case, and still
   * two thirds of the way up at 40% of the way through the rise in the second.
   * Nothing here refuses a jump — the finishing straight past FINISH_CLEAR is
   * clear road by construction, so there is no hole to land in.
   */
  finishJump() {
    const run = this.run;
    if (!run.finishing) return false;
    const dist = run.finishSeatX() - run.playerWorldX();
    if (dist <= 0 || !(run.speed > 0)) return false;
    const a = this.arc();
    return !!a && dist / run.speed <= a.apex;
  }

  /**
   * The holes on THIS hero's road that are not behind him yet, nearest first.
   *
   * A crossing is left out because it is not a hole you jump, it is a sequence
   * of stones you land on — the crossJump arithmetic below owns it. A tunnel
   * mouth is left out because falling into one is the way through (see the
   * isGap branch in run.js's collide). A hole belonging to another route is
   * somebody else's problem, but a LANE hole is always this hero's: he comes
   * back down to the lane off every island in the game.
   */
  holesAhead(px) {
    const out = [];
    for (const ob of this.run.obstacles) {
      if (!ob.live || !ob.def.isGap || ob.tunnel || ob.crossing) continue;
      if (ob.route && ob.route !== this.run.route) continue;
      // Both lips carried in the bot's own coordinate — the `px` at which his
      // centre crosses them — so nothing downstream has to remember the offset.
      const near = ob.x - HIT_MID;
      const far = ob.x + ob.w - HIT_MID;
      if (far < px) continue;
      out.push({ ob, near, far });
    }
    return out.sort((a, b) => a.near - b.near);
  }

  /**
   * EVERYTHING THAT WILL MEET THE HERO, IN THE ORDER IT MEETS HIM — in TIME.
   *
   * The lane rule used to be "answer the thing when it is a third of a second
   * of ROAD away", and road is not time for half of this cast of hazards. A
   * feral dog runs AT him at 68 on top of the lane's own speed, a rolling chair
   * at 34, a barrel at 40: a window measured in pixels opens on all three about
   * a fifth of a second later than it believes it has, which is most of the
   * margin the window was worth. And a shot is not in the lane at all — it is a
   * projectile closing at 70 against the run, and the bot never saw one, which
   * is the whole of why the office stages used to shoot the demo to death.
   *
   * So every hazard is reduced to the same two numbers: `enter`, the seconds
   * until it touches his front, and `exit`, the seconds until his back is clear
   * of it. Both fall out of the CLOSING speed — the lane's, plus whatever the
   * thing is doing under its own steam — and a drifting flyer's amplitude is
   * paid into both ends, because a drone that has wandered 4px toward him
   * arrives 4px early.
   *
   * A hole is left out because a hole is a place, not a moment — pitAim owns it.
   *
   * AND THE THINGS THAT ONLY EXIST WHEN HE LEAVES THE GROUND. A buzzbird asks
   * for nothing — `action: 'none'`, because a hero who keeps running passes
   * underneath it — but it still hurts, and it hangs at exactly the height of
   * a jump taken for a coin. Those come back as `air`: never a reason to press
   * anything, always a reason not to be up there. A target or a switch is left
   * out because contact with one BREAKS it (see the isTarget branch in
   * collide), which is the mission rather than a mistake.
   */
  threats(px, sp) {
    const run = this.run;
    const out = [];
    const front = px + HIT_FRONT;
    const back = px + HIT_BACK;
    // How high this hero's own jump actually gets him, plus his height: a flyer
    // above that line cannot be reached by any arc he has, and treating it as
    // a hazard would refuse jumps for nothing.
    const reach = (this.arc()?.peak ?? 40) + PLAYER_H;
    for (const ob of run.obstacles) {
      if (!ob.live || ob.def.isGap || ob.punted) continue;
      let act = ob.def.action;
      if (act === 'none') {
        if (ob.def.ground || ob.def.isTarget || ob.def.isSwitch) continue;
        if ((ob.alt || 0) > reach) continue;
        act = 'air';
      } else if (act !== 'jump' && act !== 'duck') continue;
      if (ob.route && ob.route !== run.route) continue;
      const drift = ob.def.airDrift ? ob.def.airDrift.amp : 0;
      // Only the half of its motion that closes on him counts. A prop drifting
      // AWAY does not buy the bot time it can spend, because the drift is a
      // wander and the next half of it comes back.
      const closing = sp + Math.max(0, -(ob.vx || 0));
      const exit = (ob.x + ob.w + drift - back) / closing;
      if (exit < 0) continue;
      out.push({ act, ob, enter: (ob.x - drift - front) / closing, exit });
    }
    for (const pr of run.projectiles || []) {
      if (!pr.live || pr.type !== 'enemyShot' || pr.alt > SHOT_REACH) continue;
      const closing = sp + Math.abs(pr.vx || 0);
      const exit = (pr.x + 5 - back) / closing;
      if (exit < 0) continue;
      // A round is jumped, never ducked: a printer fires at 8 and the box it
      // fires reaches from 6 to 11, which is over a slide's 7px head and under
      // a standing hero's 14. Getting off the ground is the only answer.
      out.push({ act: 'jump', shot: pr, enter: (pr.x - front) / closing, exit });
    }
    return out.sort((a, b) => a.enter - b.enter);
  }

  /**
   * IS THE WHOLE FLIGHT CLEAR? — the test every jump the level did not ask for
   * has to pass.
   *
   * An airborne hero has spent his answer. He cannot slide under the drone that
   * arrives while he is up there, and he cannot press anything on the frame he
   * lands, so a hazard due inside LAND_SETTLE of the touchdown is a hazard he
   * meets standing still with the button still coming up. `skip` is the threat
   * the jump is FOR, if any: the lane's own hazard is not a reason to refuse
   * the jump that clears it.
   *
   * A jump hazard in the middle of the flight is allowed on purpose — that is
   * what the arc is for, and refusing it would ground the bot on any road busy
   * enough to always have something on it. A duck hazard is not: there is no
   * height at which a slide gets made in the air. Nor is a flyer, which is only
   * dangerous BECAUSE he is up there.
   */
  flightClear(threats, airtime, skip = null) {
    const ends = this.landings();
    for (const t of threats) {
      if (t === skip || t.exit < 0) continue;
      if (t.enter > airtime + LAND_SETTLE) continue;
      // A slide and a flyer are answered by not being in the air at all.
      if (t.act !== 'jump') return false;
      // A hazard to jump is cleared by the middle of a flight and met by the
      // end of one — at EITHER end, when the villain might take the arc away.
      for (const end of ends) {
        if (t.enter > end * 0.75 && t.enter < end + LAND_SETTLE) return false;
      }
    }
    return true;
  }

  /**
   * IS EVERY LANDING THIS JUMP COULD HAVE ON ROAD?
   *
   * A jump does not have one landing any more. A capsule can lapse in the air,
   * the villain can take the rise away, a boost can run dry — so what a take-off
   * really buys is a RANGE of places to come down in, and a hole anywhere in
   * that range is a hole he might land in. Checking the middle of the range is
   * how the demo went into the ice stage's second break: the arithmetic said it
   * would stop short of the near lip, the low-gravity capsule carried it forty
   * pixels further, and forty pixels further was the hole.
   */
  landingsSafe(px, holes) {
    const f = this.flight();
    // The bonk's cut is deliberately not in this range. The run withholds the
    // clonk when there is a hole in the next stride (see the bonk branch), so
    // over a break the flight is the whole arc, and counting the short landing
    // here would refuse honest jumps under a hovering villain.
    const lo = px + this.spanOver(f.lapse ?? f.airtime);
    const hi = px + this.spanOver(f.airtime);
    for (const h of holes) {
      // The whole range, not its ends: on the ice stage both ends of a
      // low-gravity jump cleared the break — one short of the near lip, one
      // past the far one — and every landing between them was the hole.
      if (hi > h.near - LIP_MARGIN && lo < h.far + LAND_MARGIN) return false;
    }
    return !this.strandsAtCrossing(lo) && !this.strandsAtCrossing(hi);
  }

  /** Would a landing at `x` be on road? */
  landsWell(x, holes) {
    for (const h of holes) {
      if (x > h.near - LIP_MARGIN && x < h.far + LAND_MARGIN) return false;
    }
    return !this.strandsAtCrossing(x);
  }

  /**
   * WOULD A LANDING AT `x` EAT A CROSSING'S TAKE-OFF WINDOW?
   *
   * A crossing's first hop is launched from a short stretch of lane — the span
   * of road from which this hero's arc comes down on the first stone — and that
   * stretch is not somewhere to be arriving. Land in the last few frames of it
   * and the button is still coming up as the window shuts; land past it and all
   * that is left is the jump from the lip, which is the arc that sails clean
   * over the stone. That is how the demo went into the speed lap's crossing:
   * nothing was misjudged at the crossing at all, a crate two hundred pixels
   * earlier had simply held it in the air through the whole window.
   *
   * So the window joins the holes: it is a place a jump may not put him. The
   * lane hazard that wanted the jump is answered with a hit instead, which is
   * the trade this whole file exists to make.
   */
  strandsAtCrossing(x) {
    const run = this.run;
    if (run.route && run.route.crossing) return false;   // already on it
    const ob = run.obstacles.find((o) => o.live && o.crossing
      && o.x + o.w > x && o.x - x < run.speed * 1.2);
    if (!ob) return false;
    const stone = ob.crossing.stones.find((st) => st.x >= ob.crossing.x - 1);
    if (!stone) return false;
    const span = this.arcSpan();
    // The last moment a take-off still lands on the stone, and the frames
    // before it he needs to have his feet down for.
    const shut = stone.x + stone.w * 0.92 - span;
    // ...and the far end of the no-landing zone is the stone itself, not the
    // lip. Between the two there is only the break: a jump that comes down
    // there — the coin hop that started this — is not stranded, it is already
    // falling.
    return x > shut - run.speed * 0.12 && x < stone.x + stone.w * 0.22;
  }

  /**
   * WHERE TO LEAVE THE GROUND FOR A HOLE.
   *
   * The take-off window is bounded both ways — too early comes down short of
   * the far lip, too late has no ground left to push off — so there is a span
   * of road that works and the bot aims at the middle of it, the point furthest
   * from both ways of dying. On a beat cabinet the chart has already MARKED the
   * take-off (`actionX`, the beat the hole is cut against), so that mark is the
   * aim instead: playing the hole anywhere else is playing it off the beat, and
   * the whole point of the cabinet is that the beat is the answer. It is still
   * clamped into the window — a mark the hero in the lane cannot reach is a
   * mark the bot may not take literally.
   */
  pitAim(hole, span) {
    const from = hole.far + LAND_MARGIN - span;
    // A frame of travel short of the lip: the press is answered on the NEXT
    // update, and a take-off ordered from the last solid pixel is ordered from
    // a hero who is already over the hole by the time the jump happens.
    const to = hole.near - LIP_MARGIN - this.run.speed / 60;
    if (from > to) return to;   // wider than his arc: jump at the lip and hope
    const marked = this.run.beatLock && Number.isFinite(hole.ob.actionX)
      ? hole.ob.actionX : (from + to) / 2;
    return Math.min(to, Math.max(from, marked));
  }

  /**
   * THE NEXT THING THE CHART ASKS FOR, on a beat cabinet.
   *
   * A rhythm stage is not a lane to be read — it is a score, and every piece the
   * spawner lays carries the beat it is answered on and the world x that beat
   * falls at (`actionX`, see beatchart.js). So the bot on these stages does not
   * react at all: it plays the marks. That is what makes it perfect here rather
   * than merely good, and it is also what makes it score — a press at `actionX`
   * is a press on the line the judge is measuring against.
   */
  chartCue(px) {
    const run = this.run;
    if (!run.beatLock) return null;
    const late = run.speed * 0.25;
    let best = null;
    for (const ob of run.obstacles) {
      if (!ob.live || !Number.isFinite(ob.actionX)) continue;
      const act = ob.chartAction;
      if (act !== 'jump' && act !== 'duck' && act !== 'ability') continue;
      if (ob.x + ob.w < px - 8) continue;        // answered, or gone by
      if (ob.actionX < px - late) continue;      // the beat is missed; let it go
      if (!best || ob.actionX < best.actionX) best = ob;
    }
    return best;
  }

  update(dt) {
    const run = this.run;
    if (run.dead || run.paused) { this.releaseAll(); return; }
    // The stage is over and the finale hold owns the frame: the hero is on the
    // pole or on the cap, nothing reads input, and a button left down would be
    // held into whatever comes next. Let go and stop.
    if (run.finaleT != null) { this.releaseAll(); return; }
    // WHERE HE ACTUALLY IS, not where the camera would have him.
    //
    // `camX + PLAYER_X` is the same number for the whole of normal play and the
    // wrong one for both scripted runs: through the finishing straight the world
    // holds still and the HERO crosses the screen (heroScreenX), so a bot
    // measuring from the camera watched a frozen picture in which nothing ever
    // got any closer — it stopped answering the last hazards of every stage and
    // could not see the marker it was running at. playerWorldX is the number the
    // run's own collisions use.
    const px = run.playerWorldX();
    const sp = run.speed;

    // How far this jump would carry him, and every hole it could carry him into.
    const span = this.arcSpan();
    const holes = this.holesAhead(px);
    // The hole he can still take off FOR — one whose near lip is in front of
    // him. Past that lip there is nothing left to push off and the arithmetic
    // has nothing to say.
    const hole = holes.find((h) => px <= h.near - LIP_MARGIN) || null;

    // WHAT IS COMING AND WHEN, nearest in time first (see `threats`). NOT the
    // holes: a hole is the one hazard whose answer is a place rather than a
    // reaction (pitAim), and the reaction window would fire at a third of a
    // second out whatever the hole's width and whatever this hero's arc — which
    // is how a bot that clears every crate in the game still runs into the
    // second break on the plumber's road.
    const threats = this.threats(px, sp);
    // THE ONE HE IS ACTUALLY ANSWERING is the first of them, whatever it is.
    // Looking past it for something jumpable is how a bot jumps into the drone
    // it was supposed to slide under.
    const next = threats.find((t) => t.act !== 'air' && t.exit > -0.05) || null;
    const airtime = this.flight().airtime;

    // something worth jumping FOR: elevated mission pickups / targets / copter
    let grab = null;
    for (const p of run.pickups) {
      if (!p.live) continue;
      const want = p.def.appliance || p.def.cord || p.def.power || p.def.resident || (p.def.coin && p.alt > 24);
      if (!want) continue;
      const dx = p.x - px;
      if (dx > 8 && dx < sp * 0.32 && p.alt > 16) { grab = p; break; }
    }
    if (!grab) {
      for (const ob of run.obstacles) {
        if (!ob.live || !ob.def.isTarget) continue;
        const dx = ob.x - px;
        if (dx > 8 && dx < sp * 0.32 && ob.alt > 16) { grab = ob; break; }
      }
    }
    const copter = run.mission && run.mission.type === 'chase' ? run.copter : null;
    // He comes into reach for about a bar at a time now, so the jump is taken
    // while he is overhead — and ONLY with a clear stride beyond the landing.
    // The optional gate below already refuses a jump that lands in a hole, but
    // that is not enough here: the window can open a stride short of a break,
    // and a bot that lands cleanly and immediately has to jump again arrives at
    // the edge with no run-up. Looking a third of a second past the landing is
    // what keeps the demo out of the hole.
    // AND ONLY WHILE THE GOAL STILL WANTS IT. Past the third bonk every extra
    // one pays coins instead of progress, and a demo that keeps hunting a bonus
    // spends the rest of the level jumping at a moving target and taking the
    // hits that go with it — on cardboard-3 that cost it so much ground the
    // stage stopped reaching its own ending. The bot plays the mission.
    const chaseJump = copter && copter.mode === 'hover'
      && run.copterBonks < (run.mission.n || 0)
      && Math.abs(copter.x - px - 6) < 10;

    // A STEPPING-STONE CROSSING, which the lane's own rule cannot play.
    //
    // Everywhere else "jump when the hazard is a third of a second away" is
    // enough, because the landing is a lane: any arc that clears the thing is a
    // good arc. On a crossing the landing is a stone, so an arc can be too LONG
    // as easily as too short — and the cast's airtimes differ by half again, so
    // there is no one moment to press at. The bot does what the player does:
    // aims at the middle of the next stone, and takes off at the point its own
    // arc lands there.
    //
    // It also has to override the lane rule rather than sit beside it. The
    // break is a gap obstacle like any other, so the ordinary reaction window
    // would fire at the lip — the one takeoff point that throws the longer
    // jumpers clean over the first stone.
    const stone = run.route && run.route.crossing ? run.route : null;
    const ahead = stone ? null : run.obstacles.find((ob) => ob.live && ob.crossing
      && ob.x + ob.w > px && ob.x - px < sp * 0.9);
    const crossing = stone ? stone.crossing : (ahead ? ahead.crossing : null);
    let crossJump = false;
    let cutJump = false;
    if (crossing) {
      // The edge he leaves from: the far end of the stone he is on, or the near
      // lip of the break he is running at.
      const edge = stone ? stone.x + stone.w : crossing.x;
      const next = crossing.stones.find((st) => st.x >= edge - 1);
      // A fifth of the way onto the stone: the EARLIEST safe landing, not the
      // middle of it. Aiming at the middle is what a long jumper does anyway,
      // and it strands the short ones — Grumpos' arc does not reach the middle
      // of a stone from the lane at all, so the press never came and he ran off
      // the lip. Taking off as soon as the arc clears the near edge is the one
      // rule that fits every hero: a longer arc simply lands further along the
      // same stone.
      //
      // Past the last stone the landing is the lane again, and a little way
      // onto it — the far lip is the one place on a crossing where landing
      // short is landing in the hole.
      // WHERE IT WOULD LIKE TO LAND, and where it will settle for.
      //
      // Aiming at the near edge is enough arithmetic and not enough margin: the
      // lane's speed can change while he is in the air — a SPEED burst running
      // out mid-arc takes a fifth off the jump — and an arc aimed at the first
      // fifth of a stone then comes down in front of it. So the bot aims at the
      // middle when its arc reaches that far, and takes the earliest safe shot
      // only when the ground is running out.
      const aim = next ? next.x + next.w * 0.5 : crossing.x + crossing.w + 16;
      const landFrom = next ? next.x + next.w * 0.22 : crossing.x + crossing.w + 14;
      // The far end of the landing, so an arc that would sail over the stone
      // waits instead of taking off early. Nothing bounds the last hop: past
      // the crossing the landing is the lane, and there is no such thing as
      // too far.
      const landTo = next ? next.x + next.w * 0.92 : Infinity;
      // AND A LAST CHANCE AT THE EDGE. A jump taken from the very lip is a bad
      // jump for some heroes and it is a jump; running off the end is a fall
      // for all of them. Only fires when the ground is about to run out, which
      // is where the bot ends up if a lane obstacle held it in the air through
      // its own window.
      const edgeOut = edge - px;
      // AND THE WINDOW CLOSES FROM THE FAR SIDE TOO, which is how the demo went
      // into the gearbox on a boosted lap. A crossing's takeoff window is a
      // span of road, and on the speed cabinet the ROAD MOVES UNDER IT: a boost
      // stretches the arc while he stands on the stone, so the landing walks
      // forward off the far end of the target between one frame and the next.
      // Waiting for the middle of the stone then means never jumping at all,
      // and what is left is the edge fallback — a jump whose arc sails clean
      // over the stone it was aimed at. So the last frame at which the landing
      // is still ON the stone is itself a reason to go.
      const closing = px + span + sp * 0.05 > landTo;
      crossJump = run.player.grounded
        && ((px + span >= aim && px + span <= landTo)
          || (px + span >= landFrom && px + span <= landTo
            && (closing || edgeOut < span * 0.3))
          || edgeOut < span * 0.06);
      // AND THE ONE PLACE THE BUTTON IS LET GO OF EARLY.
      //
      // Everywhere else the jump is held for its whole arc, because a released
      // button is a cut jump (VARIABLE_JUMP_CUT) and a cut jump is how a hero
      // ends up in a hole. On a crossing the cut is the only control the bot has
      // over RANGE, and range is the whole problem: hit a boost pad on the
      // approach and the same press that cleared the stone a moment ago now
      // sails past its far edge, and there is no later frame to take off from
      // that fixes it. So while a hop is in the air over a break, the arc it
      // would have if the button went up NOW is solved every frame, and the
      // button goes up on the first frame that arc comes down on the stone.
      // The stone he is actually flying at, which is not the one the take-off
      // rule names: `next` is read off the edge he left, and once he is over
      // the break he has no route and that edge is the whole crossing's near
      // lip, a stone or two behind him.
      const target = run.player.grounded ? next
        : crossing.stones.find((st) => st.x + st.w > px + PLAYER_SPRITE_W);
      if (!run.player.grounded && this.jumpHold && target
        && run.player.vy > VARIABLE_JUMP_CUT && run.player.hero?.variableJump) {
        const a = this.arc();
        const g = a ? a.g : run.player.gravity;
        const y = Math.max(0, run.player.y);
        const fall = (v) => (v + Math.sqrt(v * v + 2 * g * y)) / g;
        const cutLand = px + this.spanOver(fall(VARIABLE_JUMP_CUT));
        const fullLand = px + this.spanOver(fall(run.player.vy));
        const from = target.x + target.w * 0.22;
        const to = target.x + target.w * 0.92;
        cutJump = fullLand > to && cutLand >= from && cutLand <= to;
      }
    }

    // WHAT THE CHART ASKS FOR, on a beat cabinet. Read before the lane rules
    // below because on these stages it REPLACES them: the marks are the level.
    const cue = this.chartCue(px);
    // A press is ordered from where the hitbox will be, not from where the
    // sprite starts: a duck answered at `actionX` on the nose is answered a
    // body length after the drone has already met his face. The lead is well
    // inside the judge's on-beat window, so it is still the beat being played.
    //
    // ...OR THE THING IS SIMPLY HERE, whatever the mark says. A drone wanders
    // (`airDrift`, ±4px) and a duck's approach is a single frame of road, so
    // the mark and the hitbox can disagree by more than the lead — a slide
    // ordered on the mark alone met the drone that had drifted back toward him.
    // The mark is what the bot plays; this is what keeps it honest.
    //
    // A hole is not answered here at all even though it wears a jump mark: the
    // mark is only one of the two things its take-off has to satisfy, and
    // pitAim is where both are reconciled.
    const cueDue = !!cue && !cue.def.isGap
      && (px >= cue.actionX - HIT_FRONT
        || px + HIT_FRONT + (cue.def.airDrift?.amp || 0) + sp / 60 >= cue.x);

    // THE HOLE, WHICH IS NOT A REACTION. Its take-off point is a place on the
    // road (pitAim), so the press is "have I reached it" rather than "is it
    // close" — and once reached it stays true, so a bot that was in the air
    // through its own window presses on the frame it lands.
    const pitJump = !!hole && px >= this.pitAim(hole, span);

    // AND THE LANDING HAS TO BE SOMEWHERE, which the reaction window on its own
    // never asked. Hazards arrive in clusters — a barrier and a chair a stride
    // apart, two crates in a row — and an arc taken the moment the FIRST one
    // came into the window comes down on the second one every time. Waiting is
    // the fix and it is free: the road keeps coming, so a take-off held for a
    // few frames lands that much further past the pair. LAST_T is the floor
    // under the wait — a jump taken too late still beats standing still.
    const landingClear = !next || this.flightClear(threats, airtime, next);
    // The ordinary lane hazard: jump when it is a third of a second out. On a
    // beat cabinet the mark says when instead.
    const laneJump = run.beatLock
      ? !!(cueDue && cue.chartAction === 'jump')
      : !!(next && next.act === 'jump' && next.enter < REACT_T
        && (this.clears(next) || next.enter <= LAST_T)
        && (landingClear || next.enter <= LAST_T));

    // AND THE JUMPS NOBODY ASKED FOR — a coin up in the air, the mission's
    // copter. These are the ones that used to kill the demo: the copter on
    // RHYTHM 3 rides straight over a hole, so a bot that hops for it takes off
    // a third of a second early and comes down in the break it was about to
    // clear. Optional means optional: taken only when the landing is road, and
    // on a beat cabinet only when he will be standing again before the next
    // mark — an airborne hero cannot answer a beat.
    //
    // AND THE SAME GOES FOR EVERY OTHER HAZARD ON THE ROAD, which is the half
    // of this the holes rule never covered. Level 3-3's copter hangs over the
    // hero for about a bar, and a chart that lays a slide two beats later does
    // not care that he is in the air for the villain: he came down onto the
    // drone with the button still on its way up. flightClear is that whole
    // argument — nothing may arrive between the take-off and a beat past the
    // landing — and it costs the demo a bonk it can take on the next pass.
    const optional = !!(grab || chaseJump) && this.landingsSafe(px, holes)
      && (!chaseJump || this.landsWell(px + span + sp * 0.35, holes))
      && this.flightClear(threats, airtime)
      && (!run.beatLock || !cue || px + span + HIT_FRONT + sp * LAND_SETTLE < cue.actionX);

    // jump: held through the arc. A jump that would land in a hole is refused
    // whatever asked for it — a hit costs the demo a moment and a fall costs it
    // the rest of the level.
    // The last jump of the stage outranks everything: there is nothing left in
    // the lane to answer, and it is the one press the ending is graded on.
    const wantJump = this.finishJump() ? true
      : crossing ? crossJump
        : (pitJump || (laneJump && this.landingsSafe(px, holes)) || optional);
    if (cutJump) {
      // The one deliberate short hop in the bot: see the crossing block.
      if (this.jumpHold) { Input.release('jump'); this.jumpHold = false; }
      this.wasAir = true;
    } else if (!run.player.grounded) {
      // keep holding — releasing early cuts the jump short (VARIABLE_JUMP_CUT)
      this.wasAir = true;
    } else if (this.jumpHold && this.wasAir) {
      // A LANDING LETS GO ONCE, even when the next jump is already wanted.
      //
      // The jump is an EDGE, not a level: holding the button through a landing
      // presses nothing. In the lane that never showed, because the reason to
      // jump had always passed by the time he came down — on a crossing it is
      // the normal case, since the next stone is wanted from the moment he
      // lands on this one, and he ran off the end of the last stone with the
      // button still held from the jump that got him there.
      //
      // ONCE PER LANDING, gated on having actually been in the air. Releasing
      // on every grounded frame the button is held turns a sustained press into
      // a one-frame tap, and a tap is cut to VARIABLE_JUMP_CUT the same frame:
      // the heroes with a variable jump hopped two pixels, over and over, all
      // the way into the hole.
      Input.release('jump');
      this.jumpHold = false;
      this.wasAir = false;
    } else if (wantJump) {
      if (!this.jumpHold) { Input.press('jump'); this.jumpHold = true; }
    } else if (this.jumpHold) {
      Input.release('jump');
      this.jumpHold = false;
    }

    // duck under low flyers (and stomp with stomp-heroes in boss fights)
    //
    // On a beat cabinet the slide is a MARK like every other press, and it is
    // held for a fixed stretch rather than for as long as the flyer is in
    // front of him: a barrel slot is answered with the same button and needs
    // the button back up before the next beat, because a punt only fires off a
    // fresh press (see the punt note in beatchart.js).
    if (run.beatLock) {
      const key = cue ? `${cue.chartAction}:${Math.round(cue.actionX)}` : null;
      if (cueDue && cue.chartAction === 'duck' && this.chartDuckT <= 0
        && !this.duckHold && key !== this.duckCueKey) {
        this.chartDuckT = CHART_DUCK_HOLD;
        this.duckCueKey = key;
      }
      this.chartDuckT = Math.max(0, this.chartDuckT - dt);
    }
    const duckWanted = run.beatLock
      ? this.chartDuckT > 0
      : !!(next && next.act === 'duck' && next.enter < DUCK_T && run.player.grounded);
    const stompWanted = run.bossCab && run.player.hero && run.player.hero.stomp && !run.player.grounded && run.player.vy < 60;
    if (duckWanted || stompWanted) {
      if (!this.duckHold) { Input.press('duck'); this.duckHold = true; }
    } else if (this.duckHold) {
      Input.release('duck');
      this.duckHold = false;
    }

    // abilities: fire at real targets, off cooldown, at a human-ish rate
    this.abilityT -= dt;
    if (this.abHeld) { Input.release('ability'); this.abHeld = false; }
    const hero = run.player.hero;
    // NOT DURING A CROSSING. Fernwick's ability is a ROLL, and a roll refuses
    // the jump button for half a second (see jumpPressed) — fired on the
    // approach it eats the whole takeoff window and the run ends in the teeth
    // with the button held down. Nothing on a crossing is worth shooting at
    // anyway: the sweep has cleared the lane either side of it.
    //
    // NOR ANYWHERE NEAR A HOLE, for a reason the crossing guard above only
    // half covers. Lorenzo's ability is a SLAM — it sets vy to -180 and drops
    // him out of whatever arc he was in (see the stomp branch in run.js) — so
    // fired mid-flight over a break it turns a jump that was clearing the hole
    // into a fall straight down it. That is exactly how the demo used to die on
    // the plumber's second stage. On a beat cabinet the chart says when to
    // shoot, so nothing here has an opinion at all.
    //
    // AND NOT WITH A HAZARD ALREADY ON ITS WAY, which is the general form of
    // both guards above. Two of the eight abilities take the jump button away
    // for longer than a hazard takes to arrive: a roll refuses it outright for
    // ROLL_LOCK, and a slam spends the arc. Fired a stride before a crate on
    // the cardboard lap, the roll simply ate the take-off — the bot pressed
    // jump for fifteen straight frames and stood there — and the demo lost the
    // level to a move it chose. So the road has to be clear for as long as the
    // move costs, and a stomp waits for the ground: on the ground it is the
    // wrench smash, which is the half of that ability that breaks things
    // without moving him.
    const pitNear = holes.some((h) => h.near - px < span * 1.2 && h.far > px - 20);
    const locks = hero && hero.ability
      && (hero.ability.type === 'roll' ? ROLL_LOCK : 0);
    const abilityBusy = !!(locks && next && next.enter < locks + REACT_T)
      || !!(hero && hero.ability && hero.ability.type === 'stomp' && !run.player.grounded && !run.bossCab);
    if (run.beatLock) {
      const key = cue ? `${cue.chartAction}:${Math.round(cue.actionX)}` : null;
      if (cueDue && cue.chartAction === 'ability' && key !== this.abilityCueKey
        && this.abilityT <= 0 && run.player.abilityCd <= 0) {
        Input.press('ability');
        this.abHeld = true;
        this.abilityT = 0.2;
        this.abilityCueKey = key;
      }
    } else if (hero && hero.ability && !crossing && !pitNear && !abilityBusy
      && this.abilityT <= 0 && run.player.abilityCd <= 0) {
      const threat = run.bossCab || run.obstacles.some((ob) =>
        ob.live && (ob.def.shoots || ob.def.isTarget || (ob.def.breakable && ob.def.ground)) &&
        ob.x - px > 20 && ob.x - px < 180);
      if (threat) {
        Input.press('ability');
        this.abHeld = true;
        this.abilityT = hero.ability.type === 'dash' ? 4 : 1.1;
      }
    }
  }

  releaseAll() {
    this.chartDuckT = 0;
    if (this.jumpHold) { Input.release('jump'); this.jumpHold = false; }
    if (this.duckHold) { Input.release('duck'); this.duckHold = false; }
    if (this.abHeld) { Input.release('ability'); this.abHeld = false; }
  }
}
