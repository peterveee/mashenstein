// Punting a light prop.
//
// Most breakables end the same way: the slide plows them, breakObstacle fires,
// and a cloud of debris is the whole story. A traffic cone is not that kind of
// object. It weighs nothing, and the honest answer to a boot arriving at speed
// is that it LEAVES — spinning up and over the hero, who passes underneath
// while it comes down behind him.
//
// This module is the arc, and it lives on its own so the gallery can drive the
// same code the run does rather than a copy of it. A bake-off that judges a
// reimplementation of the physics is judging the wrong thing.
//
// The numbers are the pickup toss's numbers (see the `p.toss` branch in
// run.js's updateEntities), because a cone leaving the ground and a coin
// leaving a smashed box are the same problem and the game already has an
// answer it likes. Gravity, restitution and x-damping are quoted from there;
// only the launch is stronger, and that is sized below.

export const PUNT = {
  // Straight from the coin toss. A second, differently-tuned gravity in the
  // same world would show up the moment a cone and a coin were airborne in the
  // same frame, which is exactly what punting a !-crate's cone would do.
  gravity: 700,
  // Apex is vy^2 / (2 * gravity), so 700 makes it vy^2 / 1400. 340 gives 82px
  // and 0.97s of hang.
  //
  // The low 203 skim came first and had to go, because the beat changed under
  // it. A cone that leads the hero, gets overtaken, and still lands behind him
  // needs time to do all three, and 0.58s of hang was not enough for any of
  // the launch/drag pairs that were tried — every one of them either never got
  // ahead or never got caught. Hang time was the binding constraint, not the
  // launch.
  launchVy: 340,
  // FORWARD, and as a fraction of the hero's own speed rather than a fixed
  // number. The first cut sent the cone backward at a flat -30, which is
  // correct physics for a boot and useless to watch: the hero runs at 160 and
  // up, so the cone left the frame in a handful of frames and the whole beat
  // was over before it registered.
  //
  // The cone is punted FORWARD at twice the hero's speed and then air-braked,
  // which is the only shape that gives all three beats. Two earlier models
  // failed, both instructive:
  //
  //   backward at a flat -30    correct physics for a boot, and unwatchable —
  //                             the hero runs at 160+, so it left the frame in
  //                             a handful of frames.
  //   speed minus a constant    never actually leads. It starts at his boot and
  //                             falls behind from frame one, so it goes up and
  //                             comes down roughly where he already is, and he
  //                             runs into it.
  //
  // Launched at 2x and dragged, it genuinely pulls out in front, the hero
  // closes as the drag bleeds it off, and he passes underneath near the top of
  // the arc. The crossover is where `vx` decays back through the run speed —
  // at `ln(boost) / drag`, which has no `speed` in it — so the pass-under
  // happens at the same instant of the flight however fast the run is. The
  // LEAD does scale with speed, which is the right way round: the faster you
  // are going, the further out in front it gets thrown.
  launchBoost: 2.0,
  // Per second, toward zero. Also what stops the cone outrunning the level.
  drag: 2.0,
  // Radians per second. Fast enough to read as tumbling at 13px tall, slow
  // enough that the white bands stay legible rather than smearing to a blur.
  spinRate: 9,
  // How fresh the slide has to be, in seconds, for contact to punt rather than
  // hurt. Read against player.duckHoldT: commit late and the boot is still
  // travelling, coast in on a slide you started early and you eat the cone.
  // 0.35 is a little over a third of the 1.0s duck window (DUCK_MAX_T).
  windowT: 0.35,
  // Below this the arc has run out and the cone is furniture again.
  restVy: 40,
  // How much forward speed a bounce keeps. Under 1 so a cone that comes down
  // during the run settles into the road instead of skating off down it.
  bounceVx: 0.72,
  // What a juggle aims for, in px above the ground. Comfortably inside a
  // standing jump's ~68px apex, so the next touch is always reachable, and low
  // enough that the cone stays in frame through a long chain.
  juggleApex: 52,
  // Forward carry on a juggle, as a multiple of the run speed. 1.0 — the cone
  // paces the hero exactly, and combined with the drag being switched off for
  // juggles (see stepPunt) it lands each hop right where it left, still in
  // reach.
  //
  // Every value above 1 was tried and they all collapse the chain to one, for
  // two different reasons that look the same from the seat: with drag on, the
  // launch bleeds away inside a single hop and the cone drops fifty pixels
  // behind; with drag off, anything faster than the run simply outruns him.
  // Either way there is no second touch. The difficulty does NOT live here —
  // it lives in the airborne gate, which makes every touch a jump you chose
  // to make.
  juggleCarry: 1.0,
  // Chain length that pays out. Five, not four: four was reachable on the
  // first or second attempt once the cone paced the hero properly, and a
  // payout you get by default is not a payout. Each extra touch is another
  // jump timed against a 0.72s hop, so the cost of the last one is real.
  juggleReward: 5,
  // Where the coin toss parks its pickups. Same reason here: a prop resting at
  // exactly 0 sits with its outline biting the road.
  restAlt: 0,
};

/**
 * The same punt, thrown at something that WEIGHS something — and, unlike the
 * cone, thrown AWAY.
 *
 * The cone's arc is a boomerang. It is launched out in front, the air brake
 * hands it back, the hero passes underneath it and it lands behind him: three
 * beats, all of them about the cone STAYING in the player's world so it can be
 * juggled. Everything in PUNT above is tuned to that.
 *
 * A barrel does the opposite, and the opposite is the whole idea. It arrives
 * rolling right-to-left, the boot REVERSES it, and from that moment it is
 * travelling left-to-right faster than the hero can run — so it pulls away, it
 * keeps pulling away, and it leaves the frame. The hazard is not destroyed and
 * not resolved; it is SENT SOMEWHERE ELSE, which is a boot's honest answer to a
 * heavy rolling thing and reads as one from the seat.
 *
 * That single sentence is where every number below comes from:
 *
 *   drag 0          the air brake is what brings the cone back, so a prop that
 *                   must never come back cannot have it. `vx` holds at the
 *                   launch speed for the whole flight and the whole roll-out.
 *   launchBoost 1.7 the departure rate. 0.7x the run in relative terms, so it
 *                   clears a 240px frame in about 1.7 seconds — long enough to
 *                   watch it bound away, short enough that it is gone before
 *                   the next thing needs looking at.
 *   bounceVx 1      the bounce keeps its speed. At 0.6 two touchdowns dropped
 *                   it to 1.02x the run, which is a barrel pacing the hero to
 *                   the horizon instead of leaving him.
 *   launchVy 270    52px of apex, and 0.77s of hang. It has to LEAVE THE
 *                   GROUND — "kick it and it rolls off" is a nudge, not a boot
 *                   — and 52 + the barrel's own 13 is what keeps it under the
 *                   96px roof of the tunnel it may be punted inside.
 *   spinRate -6     NEGATIVE, because it is now rolling the other way. draw.js
 *                   turns a roller by `-spin`, so a leftward roll is a positive
 *                   rate and a rightward one is this. 6 rad/s against a 6.5px
 *                   radius is the rate a barrel rolls at 40px/s — the speed it
 *                   arrived at — so the flight leaves at exactly the tumble it
 *                   came in with, and only the DIRECTION has flipped.
 *   rollOut         what happens when the bouncing stops: it does not stop.
 *                   See stepPunt — the prop settles onto the road and keeps its
 *                   forward speed, rolling out of the frame under its own
 *                   steam.
 *   rollSpinMax 14  and the roll-out spins at its actual travel rate, capped.
 *                   Uncapped, 340px/s over a 6.5px radius is 52 rad/s: fifty
 *                   degrees a frame, which strobes and smears the bands the
 *                   barrel is read by. 14 is fast enough to read as fleeing.
 *
 * `windowT` is deliberately not here. The timing read is the SKILL and it is
 * the same skill on both props: a boot that has to be fresher for a barrel than
 * for a cone is a skill nobody can carry between the two.
 *
 * One thing that is NOT in here, because it is not physics: a heavy prop does
 * not juggle. There is nothing to juggle — it is gone. `juggleApex` and
 * `juggleCarry` above are the cone's numbers and only the cone's; they are
 * inherited by the spread and never read on this path.
 */
export const HEAVY_PUNT = {
  ...PUNT,
  launchVy: 270,
  launchBoost: 1.7,
  drag: 0,
  bounceVx: 1,
  spinRate: -6,
  rollOut: true,
  rollSpinMax: 14,
};

/**
 * Which arc an obstacle leaves on. `def.punt` carries it: `true` is the cone's,
 * and any other truthy value names a heavier one — so the def reads as what the
 * thing IS ("punt: 'heavy'") rather than as a second parallel flag that can
 * disagree with the first.
 */
export function puntTuneFor(ob) {
  return ob && ob.def && ob.def.punt === 'heavy' ? HEAVY_PUNT : PUNT;
}

/**
 * How hard a contact at `heldT` into the slide punts, 0..1.
 *
 * Linear, and deliberately not eased: this is a skill readout, and a curve
 * would make the difference between a good and a great input hard to feel.
 * Full power at the instant the slide starts, falling to nothing at windowT.
 */
export function puntPower(heldT, tune = PUNT) {
  const w = tune.windowT;
  if (!(w > 0)) return 0;
  return Math.max(0, Math.min(1, 1 - (Number(heldT) || 0) / w));
}

/**
 * Launch `ob`. `runSpeed` is the hero's current world speed — the arc is
 * plotted against it, not against a constant.
 *
 * `roll` is set per-instance rather than on the def, which the draw path has
 * always supported and nothing has ever used — see the `e.roll || e.def.roll`
 * branch. `spin` rides alongside it so the tumble starts from zero on the
 * frame of contact instead of snapping to the shared global rotation.
 */
export function startPunt(ob, runSpeed = 160, tune = PUNT) {
  // EVERY punt is the same launch. An earlier cut scaled height with the
  // timing, so a sharp input threw the cone higher — it was dropped in the
  // bake-off along with the taller arcs. Timing still decides whether you
  // punt at all (see puntPower, and the window it is read against); what it
  // no longer does is decide how far. The skill stays binary and legible,
  // and the cone behaves the same way every time you beat the window, which
  // is what makes it a thing you can learn to expect.
  ob.punted = true;
  ob.vy = tune.launchVy;
  ob.vx = Math.max(0, Number(runSpeed) || 0) * tune.launchBoost;
  ob.spin = 0;
  ob.spinV = tune.spinRate;
  ob.roll = true;
  return ob;
}

/**
 * Knock an already-airborne prop back up. The juggle.
 *
 * A juggle knocks the prop back to the SAME height every time, rather than
 * adding a fixed lift to wherever it happened to be hit. Adding a lift
 * escalates: catch it high and it goes higher, and a chain of five walks the
 * cone up out of the frame and out of reach. Aiming at a height instead makes
 * the chain stable — every touch resets it to the same reachable arc, and how
 * long the run goes is down to the player rather than to gravity.
 *
 * The forward carry is RESTORED, not killed, and that is the whole reason a
 * chain is possible. Killing it was the obvious first move — a juggle is a
 * header, not another boot — and it made the second touch unreachable: the
 * cone stopped dead in world terms while the hero kept running at 160, so it
 * was ten metres behind him before it came down. Re-launching it at nearly the
 * punt's own speed keeps it travelling with him, and the drag still bleeds it
 * off between touches, so a long chain drifts backward and ends on its own.
 */
export function juggle(ob, runSpeed = 160, tune = PUNT) {
  ob.juggles = (ob.juggles || 0) + 1;
  // Aim for juggleApex, but never give less than a real hop: caught high, the
  // cone still needs enough air for the hero to get under it again, and
  // without a floor a late touch is a tap that drops straight back down.
  ob.vy = Math.sqrt(2 * tune.gravity * Math.max(22, tune.juggleApex - ob.alt));
  ob.vx = Math.max(0, Number(runSpeed) || 0) * tune.juggleCarry;
  ob.spinV = (ob.spinV || tune.spinRate) * 1.2;
  return ob.juggles;
}

/**
 * One frame of flight. Mirrors the pickup toss: integrate, bounce with loss,
 * damp the slide, and stop fussing once the bounce is smaller than the eye can
 * see. Returns true while the cone is still moving.
 */
export function stepPunt(ob, dt, tune = PUNT) {
  if (!ob.punted) return false;
  ob.x += ob.vx * dt;
  ob.alt += ob.vy * dt;
  ob.vy -= tune.gravity * dt;
  // Air brake — but only on the OPENING punt. That launch goes out at twice
  // the run and the drag is what brings it back into reach, which is the whole
  // pass-under.
  //
  // A juggle is the opposite problem. It is already travelling at the hero's
  // speed, and dragging that bled it from 160 to 47 inside a single hop —
  // the cone landed fifty pixels behind him and a second touch was impossible
  // however well it was timed. Once it is in a chain the cone paces him
  // exactly, and the chain ends when the player misses rather than when the
  // physics quietly takes it away.
  if (!ob.juggles) ob.vx -= ob.vx * tune.drag * dt;
  ob.spin = (ob.spin || 0) + (ob.spinV || 0) * dt;
  if (ob.alt <= tune.restAlt) {
    ob.alt = tune.restAlt;
    ob.vy = -ob.vy * 0.35;
    ob.vx *= tune.bounceVx;
    ob.spinV *= 0.5;
    if (ob.vy < tune.restVy) {
      ob.vy = 0;
      if (tune.rollOut) {
        // IT DOES NOT STOP. The bouncing is over, but a barrel that has been
        // kicked the other way down the road is still a barrel rolling down the
        // road — it settles onto the ground and carries on out of the frame at
        // the speed the boot gave it. `vx` survives untouched (there is no drag
        // on this tune, and the bounce kept its speed), so the departure rate
        // the launch set is the departure rate for good.
        //
        // The spin stops being a tumble and becomes a ROLL, so it is taken from
        // the travel rather than from what is left of the launch: the bounces
        // have halved `spinV` twice by now, and a barrel sliding down the road
        // barely turning is the one thing that would read as ice. Capped, or a
        // prop moving this fast strobes — see rollSpinMax.
        const radius = Math.max(1, (ob.w || 13) / 2);
        const rate = Math.min(tune.rollSpinMax || Math.abs(tune.spinRate),
          Math.abs(ob.vx) / radius);
        ob.spinV = ob.vx >= 0 ? -rate : rate;
        // Whoever is integrating this prop must keep doing so — see the
        // `rolledOut` flag its owner sets off this return value.
        ob.rolledOut = true;
        return true;
      }
      // Down for good. `punted` STAYS true — it is what keeps the cone
      // harmless, and a cone that turned back into a hazard the moment it
      // stopped rolling would punish you for the thing you just did well.
      ob.vx = 0;
      ob.spinV = 0;
      return false;
    }
  }
  return true;
}
