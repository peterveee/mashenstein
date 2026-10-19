// One shared player controller; hero differences are stats + hooks from data.
// Physics tuned so: base jump height ~57px, airtime ~0.71s at jumpMult 1.
// `jumpMult` is a HEIGHT multiplier, not a speed one — see jumpV().
import { HERO_BY_ID } from '../data/heroes.js';
import { BASE_SPEED } from './layout.js';
import { hitPicOnJump } from '../sprites/hitPictures.js';
import { SLIP_T as BANANA_SLIP_T } from '../sprites/bananaSlip.js';

export const GRAVITY = 900;
export const BASE_JUMP_V = 320;
// Grumpos falls harder than he rises. Exported because spawner.js sizes its
// reaction runway off the worst airtime in the cast, and that worst case is
// this multiplier applied to the longest jump — one number, read in both
// places, rather than a 1.25 that has to be found twice to be changed once.
export const HEAVY_GRAVITY_MULT = 1.25;
// Air jumps launch shorter than the one off the ground, so a double is a
// reach rather than a second full arc.
export const AIR_JUMP_SCALE = 0.85;
// Variable jump: releasing above this snaps down to it. Low enough that a tap
// is visibly a hop, high enough that the cut never reads as hitting a ceiling.
export const VARIABLE_JUMP_CUT = 60;

// LOW GRAVITY BUYS AIRTIME, NOT ALTITUDE.
//
// Every launch the button makes — the jump, the air jump, the cut — is scaled by
// the square root of the gravity scale it is flown under. Apex goes as v² / g,
// so the root cancels exactly: the jump peaks where it always peaks, and the
// only thing a lighter world changes is how long it takes to get there and back
// (1/sqrt(g): 1.24x at 0.65, 1.41x at 0.5). The spring pad was already solved
// this way (run.js springLaunch); this brings the button in line with it.
//
// It used to be the full multiplier on the arc, which doubled every jump at the
// overcharged 0.5 — a single went from 57px to 114px, past what the frame can
// hold over its own groundline on a phone, so the camera craned the floor off
// the bottom of the screen on an ordinary hop.
export function floatLaunch(gravityScale = 1) {
  const g = Number(gravityScale);
  return g > 0 ? Math.sqrt(g) : 1;
}
// ...but never before the jump has risen this long. A release inside the
// window is honoured when it closes, so the quickest flick — a sub-frame touch
// tap, a key bounced off — still gets a real hop (~21px, about 37% of a full
// jump; Sonic's floor is 38%) instead of the 2px the cut used to leave it.
// Any hold past the window is untouched: the dial above it is the same dial.
export const MIN_JUMP_RISE_T = 0.065;
// Terminal fall speed. A long drop stops accelerating before it outruns the
// player's ability to place the landing.
export const TERMINAL_VY = -520;
// A committed descent is faster than gravity earned. Named for Lorenzo's
// stomp, which is gone (17 Sep 2026) — the slide-kick is the only move that
// asks for this drop now, and it kept its own state precisely so it never
// inherited the stomp's obstacle-breaking contract.
export const STOMP_GRAVITY_MULT = 2.2;
export const SLIDE_SLAM_VY = -180;
// Landing squash timer. toons.js drives the visual squash off this same
// duration under the name SQUASH_T — they must agree or the squash outlives
// its blend. Not imported: src/sprites must not reach into src/game.
export const LANDED_T = 0.12;
// Ice landing slide (visual/control feel).
export const ICE_SLIDE_T = 0.35;
// The drop has enough time to read and settle; releasing is a touch faster so
// controls never feel sticky. Collision stays crouched through most of the
// recovery via hitH's slideAmount threshold.
export const SLIDE_IN_T = 0.14;
export const SLIDE_OUT_T = 0.1;
// How long a slide can be HELD before the hero stands back up. The slide is a
// move to get under one obstacle, not a stance: every slide pattern in
// cabinets.js places a single drone or paperwork (never a corridor), and at
// BASE_SPEED the actual pass-under lasts ~0.2s — the second is anticipation
// room for sliding early. Releasing re-arms instantly; the cost of overstaying
// is having to re-press with the hazard already overhead.
export const SLIDE_MAX_T = 1.0;
// The contact kick's whole life, in seconds: the leg snaps out over the first
// ~45% of it, holds extended while the crate comes apart, then recovers. The
// hold is what the bake-off picked ('held', 0.22s out) over a faster jab and a
// slower shove — a jab was gone before the debris, and a shove read as a push
// rather than a strike.
export const SLIDE_KICK_T = 0.34;
// How long the hero is held standing after a slide plows a box. Just past the
// kick's own 0.34s, so the leg finishes its swing on the way up and the stand
// reads as the follow-through rather than as the slide being cancelled.
export const STAND_AFTER_PLOW_T = 0.38;
// HOW LONG THE BANANA-PEEL PRATFALL LASTS — both the hop the hero is drawn
// going through (sprites/bananaSlip.js, the single source of this number: the
// picture's own length) and the stumble that slows him and holds his jump,
// which now end on the same frame because by the time the stumble lifts he is
// already back in his own stride.
//
// Read against the two clocks either side of it. The hit's own i-frames are
// 1.4s, so the slip is comfortably inside the mercy it comes with: he is
// never handed control back into a hazard he cannot yet be hurt by and then
// hurt by the next one. And the spawner's reaction floor is 0.25s of clear
// ground after any action cell, which at run speed is well short of this — so
// the peel is deliberately NOT placed as the first cell of a pair. See the
// patterns in data/cabinets.js, which give it a lane of its own.
export const SLIP_T = BANANA_SLIP_T;
// THE RUN CADENCE, in strides per second. The cycle is still wound by scroll
// speed rather than wall time, but on a square root of it, not in proportion.
// It used to be speed / 40 — 4 strides/s at base and every multiplier the run
// stacks (cabinet, ramp, SPEED, boost pad) passed straight to the legs, so the
// fastest case (SURGE's end under SPEED x1.4) spun them at 9.2 strides/s, a
// blur. Picked from the run-cadence bake-off (29 Sep 2026): row I's square
// root, with the base then raised from 3.0 to 3.5 (row J) as 3.0 read a touch
// slow — 5.3 at that same fastest case, quick but still legs. The feet
// no longer keep exact pace with the floor at speed; at this scale it does not
// read as skating.
export const RUN_CADENCE = 3.5;
// 1 = proportional to speed (the old coupling), 0 = one cadence at any speed.
export const RUN_CADENCE_EXP = 0.5;
// THE HEAVY HERO STEPS SLOWER. Grumpos takes 0.8 of the cast's strides on a
// stride lengthened to match (LOCO `heavyKnee` in toons.js), so his feet keep
// pace with the floor and he covers the same ground — the lane speed is the
// same for everyone; only his legs' tempo differs. Picked from the skirted-gait
// bake-off (29 Sep 2026): at the shared cadence on his short stride he read as
// "shuffling really fast", and a big step taken less often reads as mass.
export const HEAVY_CADENCE_MULT = 0.8;
export function gaitRate(speed, hero) {
  return RUN_CADENCE * Math.pow(Math.max(0, speed) / BASE_SPEED, RUN_CADENCE_EXP)
    * (hero && hero.heavy ? HEAVY_CADENCE_MULT : 1);
}
// The runner anchor: a fixed WORLD offset from camX, which the camera then
// magnifies into a screen position (23.3% of the frame at ZOOM 2). Everything
// right of it is runway, so this is really a reaction-time dial — the view is
// VIEW_W wide, so you see (VIEW_W - PLAYER_X) px of it, 181 here, which is
// 1.13s of warning at the 160px/s base speed.
//
// 56 rather than further left because of what is up there. The crane now
// carries the hero to the top of the frame on a double jump instead of
// shrinking them, and the HUD's left column — the battery/coin pill, x 8 out to
// ~105 — is what they would go behind when they get there. At rest their 18px
// of drawn width lands at screen x 106..142, clearing it by a pixel; the dial
// stops where the chrome starts.
//
// 59 rather than 56 because the ribbon's PLAYHEAD hangs off this too, and it is
// a harder tenant than the crane. It stands over the hero (hud.js: the strip's
// anchor is (PLAYER_X + HERO_CENTER_OFF) * camZoom) on the SAME midline as the
// status pill, so the tab and the pill are two panels sharing a row — and at
// the desktop resting zoom of 1.6 the pill's plate ended at 97.4 and the tab
// spanned 97.9-100.8. They touched. No treatment of the strip fixes that: the
// plate can be clipped back, the tab cannot, because it is where the hero is.
//
// A world pixel buys 1.6 screen px at the widest framing and more at every
// closer one, so 1.6 is the case that sets the figure: +3 puts the tab at
// 101.5-104.5, four pixels of clear sky past the pill, and the closer framings
// get more than they need. What it costs is runway, and this is the whole bill:
// 3 world px at the ramp cap (160 * 1.6 = 256px/s) is 12ms of the 0.95s the
// frame shows ahead at that zoom — 1.2%, and inside the 20ms the audio-sync
// calibration already tolerates. The chart follows on its own: beatchart.js
// places every event from the LIVE hero x, not from a captured constant.
//
// That clearance is a REST measurement. The camera scales x as well as y and
// welds the left edge to camX, so a pulled-back frame slides the hero toward
// screen 0 — at ZOOM_MIN they sit at 73 instead of 112, behind the pill. Only
// the cape/triple heights pull back that far, and they grazed it at the old
// anchor too; it is the price of the left edge staying welded.
//
// 55 on desktop (was 59; Peter, 19 Oct 2026: "keep the zoom … buy a few extra
// pixels by squishing the battery … and making the coin a little smaller"). The
// meter's segments went 0.36 -> 0.27 of its height and the coin 12 -> 10, which took
// ~7px off the pill. What sets the figure now is the beat ribbon's playhead (hud.js
// ribbonAnchor), which stands on PLAYHEAD_OFF below; see the HERO_ANCHOR table.
//
// PER MODE, NOT ONE NUMBER (Peter, 19 Oct 2026: "i want the flexibility to have the
// hero at different positions in different modes"). HERO_ANCHOR is the table and
// applyFraming (run.js) installs the entry for this device with setHeroAnchor, next
// to the zoom it goes with. A phone frames at 2.2, where the pill is nowhere near the
// playhead, so it stands further left and buys runway instead. Nothing has to be
// re-timed for it: every rhythm item is laid from the hero's LIVE world x
// (BeatSpawner.fill), so the lane moves with him — tests/beat-contact.js holds that.
// `let` and a setter for the same reason camera.js does ZOOM that way: the imports
// are live bindings, so every reader sees the new value on its next read.
// THE COLUMNS (Peter, 19 Oct 2026: "adjust the runway as much as possible … with a
// 16th note gap with 100+ coins at all times"). The rule: the playhead tab, centred
// at (PLAYER_X + PLAYHEAD_OFF) * zoom and 4px wide, starts a 16th (13px) clear of the
// status pill. On the landscape rhythm corner the coins ride in the clock's row under
// the pill (hud.js coinsBelowPill — "lets add the coins with the time"), so the pill
// is the hero disc and the meter and ends at ~55.5 whatever the count: the rule is
// (PLAYER_X + 7) * zoom >= 70.5. Each stands 5 right of that floor — Peter wanted
// him "a bit more to the right" once the playhead had moved to his centre:
//   desktop      1.6  46   (38 is the floor; Peter, 19 Oct 2026: 46, matching ZOOM IN)
//   tablet       2.0  34   (29)
//   phone        2.2  31   (26)
// desktopClose, the desktop's ZOOM IN (2.0), stands further right on purpose: Peter
// wanted the hero clear of the whole corner, the coins-and-clock row included at
// 100+ coins and 100+ seconds (its right edge ~76.5). His drawing reaches 3px left
// of his slot, so (PLAYER_X - 3) * 2 >= 76.5 + ~4 of air -> 44, and 2 more with the
// rest -> 46.
// The zoom is chosen outside a run and never changes inside one, so the hero never
// moves under items already laid.
export const HERO_ANCHOR = Object.freeze({ desktop: 46, desktopClose: 46, tablet: 34, phone: 31 });
export let PLAYER_X = HERO_ANCHOR.desktop;      // fixed world offset from camX
export function setHeroAnchor(x) { PLAYER_X = x; }
export const PLAYER_W = 8;       // hitbox (12px sprite, 2px inset)
export const PLAYER_H = 14;
export const SLIDE_H = 7;
// How wide the hero is DRAWN. The hitbox is inset inside it — 2px of shoulder
// and elbow either side that hazards are allowed to pass through, because being
// clipped by a crate your sleeve overlapped is not a hit anyone accepts.
//
// It is a separate number from PLAYER_W because the two answer different
// questions. What may HURT you is judged against the hitbox, which is mean on
// purpose. What may HOLD YOU UP is judged against this, which is generous on
// purpose: the player aims the landing with the sprite, so the sprite is what
// has to be over the ledge. See RunState.playerFootprint.
export const PLAYER_SPRITE_W = 12;
// WHERE THE RIBBON'S PLAYHEAD STANDS ON THE HERO, from the left of his slot
// (heroScreenX): one past his centre (Peter, 19 Oct 2026: "a bit closer to their
// center again", then "one position to the right so it's a little forward of the
// hero center").
export const PLAYHEAD_OFF = PLAYER_SPRITE_W / 2 + 1;
// WHERE A BEAT-LINED PICKUP IS LAID, past its line, so its CENTRE is on the playhead
// on its beat: PLAYHEAD_OFF less half its width (3 for a coin). His reach for one is
// carried forward by the same amount (run.js collide), so his hitbox front still meets
// it ~10px before its beat — the lead that lets its ping be PLACED on the beat
// (pickupLineInBeats) rather than fired an output latency late. It is then held on
// screen until its beat and pops there (popTakenCoins), so the dot crossing the
// playhead, the pop and the ping are one instant. tests/beat-contact.js.
export const beatLayOff = (w) => PLAYHEAD_OFF - w / 2;

// The gravity actually acting on a hero. One reader for the `heavy` flag, so
// the four places that used to spell out the conditional cannot drift apart.
export function gravityFor(hero) {
  return hero && hero.heavy ? GRAVITY * HEAVY_GRAVITY_MULT : GRAVITY;
}

/**
 * THE LAUNCH SPEED THAT DELIVERS THE HEIGHT THE HERO'S CARD PROMISES.
 *
 * `jumpMult` is a HEIGHT multiplier. x1.10 means the hero clears 10% more than
 * the 57px base, and nothing else. The square lives in this one function.
 *
 * It used to scale the LAUNCH SPEED, and apex goes as v² — so the ±10% band the
 * cast select printed was a −19%/+21% band in the air. Top to bottom the cast
 * spread 46px to 69px, 1.51x, behind numbers claiming 1.22x. Nobody reading the
 * card could have known; the stat had to be measured to be believed. Inverting
 * it here makes the readout the thing it always said it was, and pulls the
 * spread back to 51–63.
 *
 * `heavy` is folded in for the same reason. Grumpos' ×1.25 gravity ate a fifth
 * of his apex while his card still read x1.00, which made him the lowest jumper
 * in the game via a stat with no number anywhere. Compensating the launch
 * spends HEAVY on AIRTIME alone: he reaches exactly what every other x1.00 hero
 * reaches and gets up and back down in 0.64s against their 0.71s. The weight is
 * still in the hands, it is just no longer in the ceiling.
 *
 * NOT applied to AIR_JUMP_SCALE or `jumpScale`. Those two are speed scales on
 * purpose and stay that way: neither is ever printed as a percentage, and a
 * second jump that reaches 0.72 of the first is the reach-not-a-second-arc
 * shape the double was tuned to.
 */
export function jumpV(hero) {
  return BASE_JUMP_V * Math.sqrt(hero.jumpMult * (hero.heavy ? HEAVY_GRAVITY_MULT : 1));
}

export function jumpHeightFor(hero) {
  const v = jumpV(hero);
  return (v * v) / (2 * gravityFor(hero));
}
export function airtimeFor(hero) {
  return (2 * jumpV(hero)) / gravityFor(hero);
}

// How fast a hero who came in under a train's lintel mid-air is brought down to
// the ceiling, in px/s: about 8px a frame, a drop rather than a teleport.
const CEILING_PULL = 480;

export class Player {
  constructor(heroId, mods = []) {
    this.mods = mods;
    this.abilityCooldowns = Object.create(null);
    this.abilityReadyCuedBy = Object.create(null);
    this.setHero(heroId);
    this.y = 0;           // height of feet above ground (positive = up)
    this.vy = 0;
    this.jumps = 0;
    // The gravity scale the last update ran under, so a press between updates
    // launches for the world it is about to fly in (see floatLaunch).
    this.gravityScale = 1;
    // Which jump face to wear while airborne (toons.js expressionFor's `jf`
    // lookup) — rolled fresh per hop by run.js's rollJumpFace, not here.
    //
    // 2 (determined) rather than 0, and it has to be a face rollJumpFace could
    // actually have picked: a spring throws the hero without rolling anything,
    // so whatever is sitting here is what he wears on the way up. At 0 that was
    // the surprised face — the one reserved for falling — on the first launch
    // of every run.
    this.jumpFace = 2;
    this.powerJumpBonus = 0;
    this.sliding = false;
    this.slideAmount = 0; // visual crouch blend: 0 standing, 1 fully planted
    this.slideDirection = 0;
    this.slideHoldT = 0;      // how long the current slide has been held
    // The contact kick. Counts DOWN from SLIDE_KICK_T on the frame a slide
    // plows a crate; poseFromPlayer turns it into the front leg's extension.
    // A timer rather than a flag because the pose is a snap out and a slower
    // recovery, and the leg has to be somewhere definite on every frame in
    // between.
    this.slideKickT = 0;
    // A short, forced stand — set when a slide finishes something off, so the
    // hero gets up rather than riding the slide through the debris. Counts
    // down on its own and does NOT touch slideSpent: holding the key through it
    // resumes the slide the moment it expires.
    this.standT = 0;
    // One cone juggle per trip through the air. Cleared on landing, so the
    // count on screen is the number of jumps the player spent rather than the
    // number of frames two boxes happened to overlap for.
    this.airJuggled = false;
    this.airJuggled = false;
    this.slideSpent = false;  // window used up; release to re-arm
    this.floating = false;
    this.iframes = 0;
    this.catHitT = 0;
    this.catIframesT = 0;
    this.anim = 0;
    // Down pressed during a real jump: fast descent now, ordinary slide-kick
    // on contact.
    this.slideSlamming = false;
    // A tap must still produce a readable grounded kick after the landing.
    this.landingSlideT = 0;
    this.dashT = 0;
    // A boost pad's kick, for the ART only: it leans the runner into the
    // acceleration and streaks the floor past them. It is not dashT — a dash
    // grants i-frames and hero ghosts, and a floor pad grants neither.
    this.boostT = 0;
    this.rollT = 0;
    this.compressT = 0;
    this.stumbleT = 0;
    // The banana-peel pratfall. Separate from stumbleT, which is the CONTROL
    // penalty (slower, no jump) and is also spent by the shield-bash roll — this
    // is the ART, and only a peel ever sets it. Kept as its own clock so the
    // tumble can outlast or undercut the penalty later without either one
    // having to explain itself to the other. See RunState.slip and drawHeroSprite.
    this.slipT = 0;
    this.rollBashed = false;
    this.rollDeflectUsed = false;
    this.deflectFlashT = 0;
    this.powerPoseT = 0;
    this.powerType = null;
    // True for the one frame the current hero's cooldown times out. A flag rather
    // than a return value because three call sites in run.js drive this update,
    // and all three want the same one cue.
    this.abilityReadyEdge = false;
    this.fistThrown = false;
    this.axeThrown = false;
    this.wrenchThrown = false;   // Lorenzo's belt loop, empty while the tool is out
    // Rusty's dispenser: which of his two canes sits in the throwing slot. Flipped
    // by run.js on every throw and NOT reset by a hero swap — the dispenser is
    // a worn thing, and it should be in whatever state he left it.
    this.stickParity = 0;
    this.headless = 0;    // Gary
    this.assemblyGraceUsed = 0;
    this.grounded = true;
    // Counts down from MIN_JUMP_RISE_T on every jump; the variable-jump cut
    // waits for it.
    this.jumpRiseT = 0;
    // Airborne because something threw him, not because he jumped. See launch().
    this.launched = false;
    // THE FALL FACE, and where it is measured from.
    //
    // `fallRef*` is the surface he last had his feet on — a WORLD point, x as
    // well as y, because the lane rolls and the x is what lets the drop be
    // measured against the ground's own descent rather than against a flat
    // line. RunState owns both (it is the only thing that knows where a floor
    // is); they live here so the rewind's field-by-field snapshot has one place
    // to find them, and so nothing about the player is state kept off to one
    // side. See RunState.updateFallFace.
    this.fallRefX = 0;
    this.fallRefY = 0;
    this.fallFace = false;
    this.slideT = 0;      // ice landing slide (visual/control feel)
    this.landedT = 0;     // landing squash timer (visual only)
    // Seconds since this hero's death face started, or null while alive. The
    // face is a three-beat animation (toons.js DEATH_FACE_TIMING) and the run
    // is the only thing that knows when the beat begins, which is NOT always
    // the killing frame: a pit death starts it on ARRIVAL, so the fall keeps
    // its startled face all the way down and the spirals land with the crunch.
    // Visual only, and null-not-zero because zero is a valid first frame.
    this.deathT = null;
    // The incoming hero's arrival, set by whoever ran them through a portal.
    // Visual only, and deliberately NOT cleared by setHero: setHero is the
    // thing that starts it. See drawHeroSprite.
    this.tagFlashT = 0;
    // THE LIVE WIRE'S JOLT (sprites/zap.js): seconds left of it, and whether this one
    // is the X-ray. Visual only — the damage, the i-frames and the hitstop are takeHit's.
    this.zapT = 0;
    this.blastT = 0;   // dynamite in the face: sprites/blast.js, BLAST_T
    // HIT PICTURES (sprites/hitPictures.js): which picture the last ordinary hit is
    // showing ({ family, variant }), seconds left of it (picture plus its after), and
    // the last variant each family showed, so a family with two never repeats one.
    this.hitPic = null;
    this.hitPicT = 0;
    this.hitPicPrev = {};
    this.zapXray = false;
  }

  setHero(heroId) {
    this.heroId = heroId;
    this.hero = HERO_BY_ID[heroId];
    this.slideSlamming = false;
    this.landingSlideT = 0;
    this.dashT = 0;
    // A boost pad's kick, for the ART only: it leans the runner into the
    // acceleration and streaks the floor past them. It is not dashT — a dash
    // grants i-frames and hero ghosts, and a floor pad grants neither.
    this.boostT = 0;
    this.rollT = 0;
    this.compressT = 0;
    this.stumbleT = 0;
    this.slipT = 0;
    this.rollBashed = false;
    this.rollDeflectUsed = false;
    this.deflectFlashT = 0;
    this.powerPoseT = 0;
    this.powerType = null;
    this.fistThrown = false;
    this.axeThrown = false;
    this.wrenchThrown = false;   // Lorenzo's belt loop, empty while the tool is out
    this.sliding = false;
    this.slideAmount = 0;
    this.slideDirection = 0;
    this.slideKickT = 0;
    this.standT = 0;
    this.slideHoldT = 0;
    this.slideSpent = false;
    // The reaction belongs to the hero who took the swipe. Ordinary i-frames
    // still protect the newly tagged hero through a relay swap.
    this.catHitT = 0;
    this.catIframesT = 0;
  }

  get abilityCd() { return this.abilityCooldowns[this.heroId] || 0; }
  set abilityCd(value) { this.abilityCooldowns[this.heroId] = Math.max(0, value); }

  // Whether the ready cue has already been fired for the cooldown the current
  // hero is serving. Per hero for the same reason the cooldown is: the bench
  // recharges alongside you, and a single flag would let one hero's cue stand
  // in for another's. Set when the cue is SCHEDULED, which is a little before
  // the cooldown actually ends — see run.cueAbilityReady.
  get abilityReadyCued() { return !!this.abilityReadyCuedBy[this.heroId]; }
  set abilityReadyCued(value) { this.abilityReadyCuedBy[this.heroId] = !!value; }

  get gravity() { return gravityFor(this.hero); }
  get maxJumps() {
    let m = this.hero.maxJumps;
    if (this.mods.includes('cape')) m += 1;
    m += this.powerJumpBonus;
    return m;
  }
  get hitH() { return (this.sliding || this.slideAmount > 0.35 || this.rollT > 0 || this.compressT > 0) ? SLIDE_H : PLAYER_H; }
  get hitW() {
    let w = PLAYER_W;
    if (this.compressT > 0) w = 5;
    return w;
  }
  get rolling() { return this.rollT > 0; }
  get invincible() { return this.iframes > 0 || this.dashT > 0; }

  /**
   * Commit a player-initiated airborne jump to the universal slide-kick.
   *
   * A spring launch and a ledge fall deliberately do not qualify: `launched`
   * distinguishes the former and `jumps === 0` the latter. The move only
   * changes the descent; collision remains ordinary until the landing starts
   * the grounded slide window.
   */
  slidePressed() {
    if (this.grounded || this.launched || this.jumps <= 0 || this.slideSlamming
      || this.rolling || this.compressT > 0
      || this.stumbleT > 0 || this.slipT > 0) return false;
    this.slideSlamming = true;
    this.floating = false;
    this.sliding = false;
    this.slideAmount = 0;
    this.slideDirection = -1;
    this.vy = Math.min(this.vy, SLIDE_SLAM_VY);
    return true;
  }

  // Start the short grounded follow-through. Kept on Player so ordinary
  // ground catches (including route surfaces) and base-ground landings share
  // exactly the same kick timing and hitbox state.
  startLandingSlide() {
    this.slideSlamming = false;
    this.standT = 0;
    this.slideKickT = SLIDE_KICK_T;
    this.landingSlideT = SLIDE_KICK_T;
    this.slideHoldT = 0;
    this.slideSpent = false;
    this.sliding = true;
    this.slideDirection = 1;
    this.slideAmount = 1;
  }

  clearSlideState() {
    this.slideSlamming = false;
    this.landingSlideT = 0;
    this.slideKickT = 0;
  }

  // The timed slide window. Holding past SLIDE_MAX_T stands the hero up under a
  // held key; the key must come up before another slide arms. Ability slides
  // (rollT / compressT) bypass this — they carry their own timers.
  slideWindow(holdSlide, dt) {
    if (this.standT > 0) this.standT = Math.max(0, this.standT - dt);
    if (!holdSlide) {
      this.slideHoldT = 0;
      this.slideSpent = false;
      return false;
    }
    if (this.slideSpent) return false;
    // Getting up after a plow. Deliberately NOT slideSpent, which would demand
    // the key come up before another slide armed — that stranded anyone who
    // holds slide through a run of hazards, standing them up into the next one
    // with no way to get back down. A timer stands him up and hands the slide
    // straight back.
    if (this.standT > 0) return false;
    this.slideHoldT += dt;
    if (this.slideHoldT >= SLIDE_MAX_T) {
      this.slideSpent = true;
      return false;
    }
    return true;
  }

  // The kick runs down on its own clock, not the slide's: the leg has to finish
  // its swing even if the slide ends or the hero stands up mid-recovery, or a
  // crate broken on the last frame of a slide leaves the leg snapped out and
  // then teleports it home.
  tickSlideKick(dt) {
    if (this.slideKickT > 0) this.slideKickT = Math.max(0, this.slideKickT - dt);
  }

  // The kick as a 0..1 extension, shaped here rather than in the painter: the
  // timer is this class's, and a sprite that had to divide by SLIDE_KICK_T
  // would be reaching into the run to find out how long a kick is.
  //
  // Fast OUT, slower home — the snap takes the first 45% of the timer and the
  // recovery the rest. A symmetric curve reads as the leg waving rather than
  // striking, which is the whole difference between a kick and a kick-shaped
  // wobble.
  get slideKick() {
    if (this.slideSlamming) return 1;
    if (this.slideKickT <= 0) return 0;
    const age = 1 - this.slideKickT / SLIDE_KICK_T;
    return age < 0.45 ? age / 0.45 : Math.max(0, 1 - (age - 0.45) / 0.55);
  }

  updateSlideBlend(dt, target) {
    const before = this.slideAmount;
    const duration = target ? SLIDE_IN_T : SLIDE_OUT_T;
    this.slideAmount = Math.max(0, Math.min(1,
      before + (target ? 1 : -1) * dt / duration));
    this.slideDirection = this.slideAmount > before ? 1
      : this.slideAmount < before ? -1 : 0;
  }

  /**
   * Thrown, rather than jumping. A spring pad's arc.
   *
   * Separate from jumpPressed because it is not a jump in any of the ways that
   * matter: it costs no jump from the budget, it ignores the hero's jumpMult
   * (the pad is the same machine whoever stands on it — a road it can only
   * throw half the cast onto is a broken road), and the variable-jump cut does
   * not apply to it. One air jump is left in hand deliberately: the pad chooses
   * the road, the player still gets to place the landing on it.
   */
  launch(vy) {
    this.vy = vy;
    this.grounded = false;
    this.launched = true;
    this.clearSlideState();
    this.standT = 0;
    this.sliding = false;
    this.slideDirection = -1;
    this.jumps = 1;
  }

  jumpPressed(audio) {
    if (this.rollT > 0 || this.stumbleT > 0 || this.slipT > 0 || this.slideSlamming) return false;
    if (this.grounded || this.jumps < this.maxJumps) {
      if (!this.grounded && this.jumps === 0) this.jumps = 1; // walked off a ledge
      this.vy = jumpV(this.hero) * (this.jumpScale || 1) * (this.jumps > 0 ? AIR_JUMP_SCALE : 1)
        * floatLaunch(this.gravityScale);
      this.jumpRiseT = MIN_JUMP_RISE_T;
      this.launched = false;
      this.clearSlideState();
      this.standT = 0;
      this.jumps++;
      this.grounded = false;
      this.sliding = false;
      this.slideDirection = -1;
      audio && audio.sfx(this.jumps > 1 ? 'jump2' : 'jump');
      // Jumping out of the ice block shatters it there and then (sprites/hitPictures.js).
      if (this.hitPic && this.hitPicT > 0) this.hitPicT = hitPicOnJump(this.hitPic, this.hitPicT);
      return true;
    }
    return false;
  }

  update(dt, input, world) {
    this.anim += dt * (world ? gaitRate(world.speed, this.hero) : 8);
    if (this.iframes > 0) this.iframes -= dt;
    if (this.catHitT > 0) this.catHitT = Math.max(0, this.catHitT - dt);
    if (this.catIframesT > 0) this.catIframesT = Math.max(0, this.catIframesT - dt);
    // The bench recharges alongside the hero you are holding, so the moment a
    // cooldown reaches zero is recorded rather than announced here: only the
    // CURRENT hero's edge is worth a sound, and only when time ran it down. A
    // cooldown zeroed by hand — the tutorial does it in four places, a rewind
    // restores one wholesale — is not a recharge and must stay silent.
    //
    // Cleared here rather than by whoever reads it, so the flag means "timed out
    // on THIS frame" no matter which of the run's three update paths drives it.
    this.abilityReadyEdge = false;
    this.gravityScale = world?.gravityScale ?? 1;
    for (const id of Object.keys(this.abilityCooldowns)) {
      const was = this.abilityCooldowns[id];
      const now = Math.max(0, was - dt);
      this.abilityCooldowns[id] = now;
      if (was > 0 && now <= 0 && id === this.heroId) this.abilityReadyEdge = true;
    }
    if (this.dashT > 0) this.dashT -= dt;
    if (this.boostT > 0) this.boostT -= dt;
    this.tickSlideKick(dt);
    if (this.rollT > 0) {
      this.rollT -= dt;
      if (this.rollT <= 0 && this.mods.includes('bash')) this.stumbleT = 0.3;
    }
    if (this.compressT > 0) this.compressT -= dt;
    if (this.stumbleT > 0) this.stumbleT -= dt;
    if (this.slipT > 0) this.slipT -= dt;
    if (this.deflectFlashT > 0) this.deflectFlashT -= dt;
    if (this.tagFlashT > 0) this.tagFlashT -= dt;
    if (this.zapT > 0) this.zapT -= dt;
    if (this.blastT > 0) this.blastT -= dt;
    if (this.hitPicT > 0) { this.hitPicT -= dt; if (this.hitPicT <= 0) this.hitPic = null; }
    if (this.powerPoseT > 0) this.powerPoseT -= dt;
    if (this.headless > 0) {
      this.headless -= dt;
      this.iframes = Math.max(this.iframes, 0.05);
    }
    if (this.slideT > 0) this.slideT -= dt;
    if (this.landedT > 0) this.landedT -= dt;
    if (this.landingSlideT > 0) this.landingSlideT = Math.max(0, this.landingSlideT - dt);

    const holdJump = input.held('jump');
    const holdSlide = input.held('slide');

    // Variable jump: release early = short hop. `launched` is exempt, and has
    // to be: the cut is a contract about the JUMP BUTTON — hold it for height,
    // let go for a hop — and a spring pad is not the jump button. Without the
    // exemption a hero who happened not to be holding jump when he ran over a
    // pad had his 200px arc clipped to 60 on the very next frame, which reads
    // as the pad simply not working.
    // The cut also waits out MIN_JUMP_RISE_T, so a flick is a hop and not a
    // twitch. Checked before the countdown so the window is whole frames of
    // rise: four at 60fps, 67ms.
    // The cut is a launch too, so it is floated the same way: a hop is the same
    // height in a light world, not a taller one.
    const cut = VARIABLE_JUMP_CUT * floatLaunch(this.gravityScale);
    if (!world?.sustainedJump && !holdJump && !this.launched && this.jumpRiseT <= 0 && this.vy > cut && this.hero.variableJump) this.vy = cut;
    if (this.jumpRiseT > 0) this.jumpRiseT -= dt;

    // Float (hero.canFloat): hold jump while falling caps fall speed.
    const floatCap = -60;
    this.floating = !this.grounded && holdJump && this.hero.canFloat && this.vy < 0;
    const minVy = this.slideSlamming ? TERMINAL_VY
      : (this.compressT > 0 ? -70 : (this.floating ? floatCap : TERMINAL_VY));

    if (!this.grounded) {
      // The low-gravity deck has a long, steerable-by-hold ascent for every
      // hero. Releasing brakes upward momentum instead of snapping velocity;
      // descent then uses the same gentle gravity. No extra latched state is
      // needed, so checkpoints and rewind preserve the arc normally.
      const releaseBrake = world?.sustainedJump && !holdJump && !this.launched
        && this.jumpRiseT <= 0 && this.vy > 0 ? 5 : 1;
      this.vy -= this.gravity * (world?.gravityScale ?? 1) * dt
        * (this.slideSlamming ? STOMP_GRAVITY_MULT : releaseBrake);
      if (this.vy < minVy) this.vy = minVy;
      this.y += this.vy * dt;
      // A CEILING, when the world has one. Only Neon has: a hero who does not
      // jump onto a train runs INTO it, and the roof he failed to board is now
      // over his head. `world.ceiling` is his maximum altitude in that car —
      // derived from the roof's own rise and his own height, so the hop he gets
      // is whatever the geometry actually leaves him (see neonTrainHeadroom).
      //
      // It is a CAP, not a cancel: the jump still happens, it just runs out of
      // room. That is what makes it read as a thump rather than as a dead
      // button, and it is the whole of the feedback — no cue, because the
      // animation through the windows is the thing worth watching.
      const ceiling = world?.ceiling;
      if (Number.isFinite(ceiling) && this.y > ceiling) {
        // Rising INTO it this frame: stop dead, which is the bonk. Already above
        // it — he jumped at the doorway and came in under the lintel mid-air —
        // is pulled down to it over a few frames rather than teleported, the
        // shell and the roof clip hiding whatever of him is up in the bodywork.
        if (this.y - this.vy * dt <= ceiling + 0.01) this.y = ceiling;
        else this.y = Math.max(ceiling, this.y - CEILING_PULL * dt);
        if (this.vy > 0) this.vy = 0;
      }
      if (this.y <= 0) {
        this.y = 0;
        this.grounded = true;
        this.jumps = 0;
        // Back on the ground: the next juggle costs a fresh jump.
        this.airJuggled = false;
        this.launched = false;
        const wasSlideSlam = this.slideSlamming;
        this.slideSlamming = false;
        this.vy = 0;
        this.landedT = LANDED_T;
        if (world && world.ice) this.slideT = ICE_SLIDE_T;
        if (wasSlideSlam) {
          this.startLandingSlide();
        } else {
          this.sliding = this.slideWindow(holdSlide, dt) && this.rollT <= 0;
          this.updateSlideBlend(dt, this.sliding);
        }
        return { landed: true, slideKickLand: wasSlideSlam };
      }
      this.updateSlideBlend(dt, false);
    } else {
      const landingSlide = this.landingSlideT > 0 && this.standT <= 0 && this.rollT <= 0;
      if (landingSlide) {
        // A released Down still owns the short landing kick. Count this as a
        // fresh slide for puntPower; a held Down naturally continues into the
        // ordinary slide window after the guaranteed timer expires.
        this.slideHoldT += dt;
        this.sliding = true;
      } else {
        this.sliding = this.slideWindow(holdSlide, dt) && this.rollT <= 0;
      }
      this.updateSlideBlend(dt, this.sliding);
    }
    return { landed: false, slideKickLand: false };
  }

  // World-space hitbox (bottom at groundY - y).
  /**
   * Where the feet will be, in units above the ground, `t` seconds from now — assuming
   * no further input. 0 means standing on it.
   *
   * Ballistic rather than a simulation: it cannot know about a jump that has not been
   * pressed yet. That bounds what it is good for — it is only worth asking over a span
   * short enough that the arc is already decided. See RunState.updatePortal.
   */
  feetAt(t, gravityScale = 1) {
    if (this.grounded) return 0;
    return Math.max(0, this.y + this.vy * t - 0.5 * this.gravity * gravityScale * t * t);
  }

  box(camX, groundY, screenX = PLAYER_X) {
    const x = camX + screenX;
    const bottom = groundY - this.y;
    return { x: x + (PLAYER_SPRITE_W - this.hitW) / 2, y: bottom - this.hitH, w: this.hitW, h: this.hitH };
  }
}
