// The demo bot: a reactive player good enough to showcase any stage or boss.
// Promoted from the run-complete test bot. It only speaks through Input
// press/release, and never touches Input.activity — so attract mode can tell
// the bot from a human.
import { Input } from '../engine/input.js';
import { PLAYER_W, PLAYER_SPRITE_W, BASE_JUMP_V } from './player.js';

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
    const run = this.run;
    const a = this.arc();
    return a ? a.airtime * run.speed : 0.55 * run.speed;
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
    const v = BASE_JUMP_V * (p.jumpScale || 1) * hero.jumpMult;
    if (!(g > 0) || !(v > 0)) return null;
    return { v, g, apex: v / g, airtime: 2 * v / g };
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

  /** Would a landing at `x` be on road? */
  landsWell(x, holes) {
    for (const h of holes) {
      if (x > h.near - LIP_MARGIN && x < h.far + LAND_MARGIN) return false;
    }
    return true;
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

    // nearest action-required obstacle ahead. NOT the holes: a hole is the one
    // hazard whose answer is a place rather than a reaction (pitAim), and the
    // reaction window would fire at a third of a second out whatever the hole's
    // width and whatever this hero's arc — which is how a bot that clears every
    // crate in the game still runs into the second break on the plumber's road.
    let nearest = null;
    for (const ob of run.obstacles) {
      if (!ob.live || ob.def.action === 'none' || ob.def.isGap) continue;
      if (ob.x + ob.w < px - 8) continue;
      if (!nearest || ob.x < nearest.x) nearest = ob;
    }

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
    const chaseJump = copter && copter.cooldown <= 0 && (copter.x - px) < 70 && (copter.x - px) > -10;

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
    if (crossing && run.player.grounded) {
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
      crossJump = (px + span >= aim && px + span <= landTo)
        || (px + span >= landFrom && edgeOut < span * 0.3)
        || edgeOut < span * 0.06;
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

    // The ordinary lane hazard: jump when it is a third of a second out. On a
    // beat cabinet the mark says when instead.
    const laneJump = run.beatLock
      ? !!(cueDue && cue.chartAction === 'jump')
      : !!(nearest && nearest.def.action === 'jump'
        && (nearest.x - px) < sp * 0.3 && (nearest.x - px) > -8);

    // AND THE JUMPS NOBODY ASKED FOR — a coin up in the air, the mission's
    // copter. These are the ones that used to kill the demo: the copter on
    // RHYTHM 3 rides straight over a hole, so a bot that hops for it takes off
    // a third of a second early and comes down in the break it was about to
    // clear. Optional means optional: taken only when the landing is road, and
    // on a beat cabinet only when he will be standing again before the next
    // mark — an airborne hero cannot answer a beat.
    const optional = !!(grab || chaseJump) && this.landsWell(px + span, holes)
      && (!run.beatLock || !cue || px + span < cue.actionX - 8);

    // jump: held through the arc. A jump that would land in a hole is refused
    // whatever asked for it — a hit costs the demo a moment and a fall costs it
    // the rest of the level.
    // The last jump of the stage outranks everything: there is nothing left in
    // the lane to answer, and it is the one press the ending is graded on.
    const wantJump = this.finishJump() ? true
      : crossing ? crossJump
        : (pitJump || (laneJump && this.landsWell(px + span, holes)) || optional);
    if (!run.player.grounded) {
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
      : nearest && nearest.def.action === 'duck' && (nearest.x - px) < sp * 0.4 && run.player.grounded;
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
    const pitNear = holes.some((h) => h.near - px < span * 1.2 && h.far > px - 20);
    if (run.beatLock) {
      const key = cue ? `${cue.chartAction}:${Math.round(cue.actionX)}` : null;
      if (cueDue && cue.chartAction === 'ability' && key !== this.abilityCueKey
        && this.abilityT <= 0 && run.player.abilityCd <= 0) {
        Input.press('ability');
        this.abHeld = true;
        this.abilityT = 0.2;
        this.abilityCueKey = key;
      }
    } else if (hero && hero.ability && !crossing && !pitNear
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
