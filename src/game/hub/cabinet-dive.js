// THE CABINET DIVE: a hero hops off the food court floor and into the screen.
//
// Pressing USE on a cabinet used to cut straight to stage select. The hero
// never went anywhere — the room just swapped. This is the two seconds that
// were missing: he crouches, leaps at the glass, shrinks with perspective as he
// crosses it, and lands on the attract screen's own ground line at 8 pixels
// tall before running off out of frame.
//
// ---------------------------------------------------------------- the seam
//
// Nothing in here knows about the hub. Every number about the world it is
// standing in — where the machine is, where the floor is, how big a run-world
// unit is once it has been squeezed into a piece of glass — arrives as a
// parameter. That is what lets the gallery drive the SAME module at a different
// scale instead of re-staging the animation by hand, and it is the only way a
// bake-off tile can be trusted: if the tile and the game disagree, one of them
// is a copy, and the copy is always the one that is wrong.
//
// `sfx` and `shake` are injected for the same reason. The gallery passes
// neither, so a page with five of these looping is silent and still.
//
// ------------------------------------------------------------ two draw slots
//
// The hub paints the cabinet screen at station time and the hero much later, so
// a dive that crosses the glass has to change which pass draws it:
//
//   drawBehind(ctx, ...)       BEFORE the shell — the light that escapes round the
//                              machine when he goes through, so the cabinet is a
//                              silhouette against its own flash
//   drawOutside(ctx, ...)      in front of the machine — windup, leap, impact
//   screenArt(base, cabCx)     wrapped into drawCabinetScreen's `art` callback,
//                              which clips to the rounded glass and lays the
//                              scanlines and gloss OVER whatever we paint
//
// So the hero inside the screen is scanlined and glossed for free, and the
// rolling sweep bar (drawn after, outside the clip) passes over him. Both are
// correct: he is on a CRT now.
//
// ------------------------------------------------------------- seek is pure
//
// seek(t) sets every derived field from t alone, forwards or backwards. The
// gallery's filmstrip reseeks one instance eleven times out of order and must
// get eleven correct frames, so there is no accumulating particle array in
// here: sparks, dust and pixel blocks are pure functions of t and their index.
// update() owns only `t` and a cue high-water mark, which is what keeps audio
// from firing on a seek.

import { cabinetScreenRect } from '../../sprites/arcade.js';
import { drawToon, TOON_LOD_H } from '../../sprites/toons.js';
import { drawSoftContactShadow } from '../../engine/shadows.js';

// The run's own numbers, so the hero inside the glass is the size and speed the
// cabinet's actual game would draw him at rather than a guess that looks close.
const HERO_DRAW_H = 24;
const BASE_SPEED = 160;
// The hub's gait rule: one stride cycle per this many units of draw height
// travelled. Matching it means the run-off inside the screen has the same
// footfall rate as the walk that got him there, just smaller.
const GAIT_DISTANCE_PER_CYCLE = 40 / 58;
// HE LEAVES THE SCREEN THE WAY THE GAME IS PLAYED.
//
// Running off the edge was the placeholder and it taught nothing. This game is called
// running and jumping; the last thing the player sees before the machine takes them
// is the hero doing exactly that, on a cabinet whose stick is held right and whose
// jump button goes down as he leaves. It is the shortest tutorial in the game and it
// costs a fifth of a second.
//
// The fraction of the run-off spent on the ground before takeoff. Past this he is
// airborne and still travelling, so he exits up and to the right rather than
// sideways through the bezel.
// Later and lower than the first pass. At 0.55 with a 1.7-hero arc he cleared the
// top of the glass well before the edge reached him, which reads as being launched
// rather than as jumping — and a hero who leaves through the ceiling is not
// demonstrating the jump, he is demonstrating an ejector seat. Taking off later
// leaves less runway to rise in, and the lower arc keeps his head inside the
// picture until the edge takes him.
const RUNOFF_TAKEOFF = 0.62;
const RUNOFF_JUMP_H = 1.15;

// CAPTURE-ONLY PHASE OVERRIDES, read from the query at MODULE LOAD.
//
// Same intent as the __mash_dev.hideX flags, but it cannot be one of them: the
// phase table is resolved once at import — PHASE_AT, DIVE_DURATION, the
// out-clock seams and every cue time hang off it — so a flag set after boot
// would arrive long after those constants were frozen. The query string is
// there before the first module runs, which is early enough.
//
//   ?divephases=windup=0,set=0.6667
//
// Durations only, by phase name; anything not named keeps its shipped value,
// and with no query at all this is inert. Cue times are all expressed as
// AT.<phase>.t0 rather than as numbers, so they re-place themselves.
function divePhaseOverrides() {
  if (typeof window === 'undefined' || !window.location) return null;
  const raw = new URLSearchParams(window.location.search).get('divephases');
  if (!raw) return null;
  const out = {};
  for (const part of raw.split(',')) {
    const [name, value] = part.split('=');
    const n = Number(value);
    if (name && Number.isFinite(n) && n >= 0) out[name.trim()] = n;
  }
  return Object.keys(out).length ? out : null;
}
const PHASE_OVERRIDES = divePhaseOverrides();

export const DIVE_PHASES = [
  { name: 'windup', dur: 0.35 },
  { name: 'leap', dur: 0.60 },
  { name: 'cross', dur: 0.14 },
  { name: 'land', dur: 0.26 },
  { name: 'set', dur: 0.22 },
  { name: 'runoff', dur: 0.45 },
  // One beat of plain attract after he is gone, before the shutter. He clears the
  // glass at ~2.00s, so this is the whole of the pause and it is deliberately not
  // zero: cutting on the frame he vanishes reads as the game losing him.
  //
  // 0.38 rather than 0.18 so the portal breath — fired at the top of this phase —
  // has time to establish. It is a swell, loudest about half a second in, and at
  // 0.18 the shutter arrived while it was still on its way up.
  { name: 'exit', dur: 0.38 },
].map((p) => (PHASE_OVERRIDES && PHASE_OVERRIDES[p.name] != null
  ? { ...p, dur: PHASE_OVERRIDES[p.name] } : p));

export const DIVE_DURATION = DIVE_PHASES.reduce((a, p) => a + p.dur, 0); // 2.40

// HOW MUCH FASTER THE WAY OUT IS.
//
// Not a symmetry the animation owes anybody. Going in is a decision — you chose this
// machine, and the beat before the leap is part of choosing. Coming out is an
// arrival: it happens TO you, you have already had your level, and the thing you
// want is to be back on the concourse. Same shot, same curves, run at 1.9x, which
// puts it at 1.26s against the entry's 2.40s.
// TWO SPEEDS, because the exit is two different things joined at the glass.
//
// The part INSIDE the screen is a performance — a small figure running and jumping
// in a box, and the whole reason it is there is to be read. Run it at the leap's
// pace and it is over before the eye finds him. The leap OUT is the opposite: it is
// an exit, it wants to be quick, and at 1.9 it already lands right.
//
// So the out clock maps onto the entry's timeline piecewise rather than by one
// factor. Everything downstream — the camera, the cue times, `done` — goes through
// outToIn/inToOut rather than multiplying by a rate, so there is one place that
// knows how the two clocks relate.
export const OUT_SPEED_INSIDE = 1.45;   // the run and the jump on the screen
export const OUT_SPEED_LEAP = 1.9;      // through the glass and into the room
// Kept as the name the cue rate uses: the leap is the part a cue plays under.
export const OUT_SPEED = OUT_SPEED_LEAP;

// Phase start times, resolved once so phase() is a lookup rather than a scan.
const PHASE_AT = (() => {
  const out = [];
  let t = 0;
  for (const p of DIVE_PHASES) { out.push({ ...p, t0: t, t1: t + p.dur }); t += p.dur; }
  return out;
})();
const AT = Object.fromEntries(PHASE_AT.map((p) => [p.name, p]));

// Where the two halves meet on the ENTRY clock: the far side of the crossing.
const OUT_SEAM_IN = AT.cross.t1;
// How long the inside half lasts on the OUT clock.
const OUT_SEAM_T = (DIVE_DURATION - OUT_SEAM_IN) / OUT_SPEED_INSIDE;

export const DIVE_OUT_DURATION = OUT_SEAM_T + OUT_SEAM_IN / OUT_SPEED_LEAP;

// out clock -> entry clock. Runs backwards, at whichever rate that half uses.
function outToIn(t) {
  if (t < OUT_SEAM_T) return DIVE_DURATION - t * OUT_SPEED_INSIDE;
  return OUT_SEAM_IN - (t - OUT_SEAM_T) * OUT_SPEED_LEAP;
}
// ...and back, for placing cues on the out clock by naming the entry moment.
function inToOut(m) {
  if (m >= OUT_SEAM_IN) return (DIVE_DURATION - m) / OUT_SPEED_INSIDE;
  return OUT_SEAM_T + (OUT_SEAM_IN - m) / OUT_SPEED_LEAP;
}

// The eleven samples the filmstrip reads. Placed ON the beats rather than on an
// even grid — an evenly spaced strip spends four cells on the flight and none
// on the crossing, which is the only frame anyone actually argues about.
// When the leap itself begins, for callers that want to start there — the jump
// route skips the windup entirely. Exported so the hub names the moment rather than
// knowing the phase table.
export const DIVE_LEAP_AT = AT.leap.t0;

export const DIVE_KEYFRAMES = [
  { t: 0.00, label: 'stand' },
  { t: 0.20, label: 'crouch' },
  { t: 0.35, label: 'launch' },
  { t: 0.55, label: 'rise' },
  { t: 0.78, label: 'apex' },
  { t: 0.95, label: 'GLASS' },
  { t: 1.05, label: 'through' },
  { t: 1.18, label: 'land' },
  { t: 1.45, label: 'set' },
  { t: 1.78, label: 'run' },
  { t: 2.08, label: 'gone' },
];

// ------------------------------------------------------------------ variants
//
// Three ingredients, not three animations. `hop` is the motion, `pull` is the
// screen reaching out, `pixel` is the dissolve — and they layer over ONE
// timeline, so adding an ingredient never re-times the others. Floats rather
// than booleans so the answer can be a blend: the winner of this bake-off is
// quite likely "the hop, with a bit of pull", which a set of checkboxes cannot
// express.
export const DIVE_VARIANTS = [
  { id: 'hop', label: 'HOP', hop: 1, pull: 0, pixel: 0 },
  { id: 'hop-pull', label: 'HOP + PULL', hop: 1, pull: 1, pixel: 0 },
  { id: 'hop-pixel', label: 'HOP + PIXEL', hop: 1, pull: 0, pixel: 1 },
  { id: 'full', label: 'ALL THREE', hop: 1, pull: 0.7, pixel: 0.8 },
  // The control. Almost no arc: the screen does all the work, which is the
  // version to beat if the athletic leap turns out to be the wrong read.
  { id: 'grab', label: 'PULL + PIXEL', hop: 0.35, pull: 1, pixel: 1 },
  // Same leap, a much harder camera. `zoom` is the push-in gain (the others use the
  // hub's own 0.22, which takes the room from 1.3 to 1.6); 2.2 takes it to 4.2, so
  // the machine goes from one of nine in a row to most of the frame.
  //
  // `aim` is what makes that legible. The hub frames on its FLOOR — camY is solved
  // so the floor line stays put — and at 1.6 the glass still lands mid-frame for
  // free. Past about 2.5 it does not: the floor stays pinned and the screen climbs
  // out of the top of the picture. So a hard push has to re-aim at the glass as it
  // goes, and `aim: 1` is that. The four above keep aim 0 and are pixel-identical
  // to before.
  { id: 'hop-zoom', label: 'HOP + BIG PUSH', hop: 1, pull: 0, pixel: 0, zoom: 2.2 },
];
// The push-in ladder, as a MULTIPLIER on the room's own zoom: 1 is no push at all,
// 3 takes the concourse's 1.3 to 3.9 and the machine fills the frame. Offered as a
// menu of its own rather than as more variants, because it is an independent axis —
// any combination of the three ingredients can be shot at any of these.
export const DIVE_ZOOMS = [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3];
// 1.75 is the chosen rung: the concourse's 1.3 goes to 2.28, which is enough for
// the glass to be worth looking into without the room disappearing.
export const DEFAULT_DIVE_ZOOM = 1.75;

// How hard the camera re-aims at the glass, derived from how hard it is pushing.
//
// The hub frames on its floor line, which puts the glass mid-frame for free up to
// about 1.5x and then stops working: the floor holds, the machine grows, and the
// screen climbs out of the top of the picture. So the aim is not a taste setting on
// a variant — it is what any hard push REQUIRES, and deriving it here means every
// rung of DIVE_ZOOMS is watchable without anyone remembering to set a second number.
export function aimForZoom(mult) {
  return clamp01((mult - 1.5) / 0.8);
}

export const DIVE_VARIANT_BY_ID = Object.fromEntries(DIVE_VARIANTS.map((v) => [v.id, v]));
export const DEFAULT_DIVE_VARIANT = 'hop';

function variantOf(v) {
  if (!v) return DIVE_VARIANT_BY_ID[DEFAULT_DIVE_VARIANT];
  if (typeof v === 'string') return DIVE_VARIANT_BY_ID[v] || DIVE_VARIANT_BY_ID[DEFAULT_DIVE_VARIANT];
  return v;
}

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
// A hex colour at an alpha, for the flare's gradients. Takes the cabinet's own
// screen colour rather than a constant, so each machine flashes its own light.
function withAlpha(hex, a) {
  const h = String(hex).replace('#', '');
  const n = h.length === 3
    ? h.split('').map((c) => parseInt(c + c, 16))
    : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  if (n.some((v) => !Number.isFinite(v))) return `rgba(207,233,255,${a.toFixed(3)})`;
  return `rgba(${n[0]},${n[1]},${n[2]},${a.toFixed(3)})`;
}
const lerp = (a, b, u) => a + (b - a) * u;
const smooth = (u) => { const x = clamp01(u); return x * x * (3 - 2 * x); };
const easeOut = (u) => 1 - (1 - clamp01(u)) ** 2;
const easeIn = (u) => clamp01(u) ** 2;
// WHERE THE GLINT IS, rather than when it happens.
//
// The first cut placed two pops by hand, on the takeoff and on the crossing, and
// that is not how chrome works. A ball does not flash because it is moving: a
// sphere translating under a light keeps its highlight in the same place on its
// own face. What makes real chrome flash is passing THROUGH the angle where the
// surface normal bisects the light and the eye — a mirror sweeping past the
// specular direction is dark, then blinding, then dark again.
//
// On this deck exactly one motion crosses that angle: the push AWAY from the
// player. Going over, the ball's lit top cap rotates into view — which is why the
// painter already slides the catch-light up as `fwd` grows — and somewhere around
// three quarters of full push the tube lines up with the eye. The lean does not
// qualify: swinging right slides the highlight across the ball's face (the tube is
// now up and to the LEFT of it) without ever pointing it at anybody, which is a
// travelling highlight, and deckControls draws it as one.
//
// So the glint is a lobe in PUSH, not an event in time. The stick crosses it twice
// — once shoving over, once being released — so a dive gets two flashes with
// nothing placed by hand, each lasting exactly as long as the stick takes to sweep
// through the band (about 0.1s at these rates). Holding the stick at full push
// sits PAST the lobe and is dark, which is right: the alignment is an angle you
// pass through, not a position you park on.
//
// The pull TOWARD the player gets nothing, and that is the honest answer rather
// than a gap: pulled toward you the cap tilts away, the tube's reflection slides
// off the back of the ball and the chrome goes duller, not brighter. The way in
// flashes and the way out does not.
const GLINT_AT = 0.72, GLINT_BAND = 0.26;
const ballGlint = (fwd) => {
  const d = (fwd - GLINT_AT) / GLINT_BAND;
  return d <= -1 || d >= 1 ? 0 : 1 - d * d;
};
// Progress through one named phase, 0 before it and 1 after.
const at = (t, name) => clamp01((t - AT[name].t0) / AT[name].dur);
// When his feet take his weight inside the glass: a quarter of the way through the
// landing. Stated once because two things read it — the pose stops being airborne
// here, and the pixel dissolve has to be finished here. Two literals would drift,
// and the drift would show as a hero standing on the ground in pieces.
const GROUNDED_FRAC = 0.25;
const GROUNDED_AT = AT.land.t0 + AT.land.dur * GROUNDED_FRAC;

// ------------------------------------------------------------------ the dive

export function makeCabinetDive(opts) {
  return new CabinetDive(opts);
}

class CabinetDive {
  constructor({
    cab, heroId, variant, dir = 'in',
    cabX, cabY, cabW, cabH, style,
    floorY, heroH, startX, facing = 1,
    insideGroundY, insideUnit,
    camStart = 0, zoomGain = 0.22, zoomOverride = null, startAt = 0,
    sfx = null, voiceSfx = null, voiceReverse = null, shake = null,
  }) {
    this.cab = cab;
    this.heroId = heroId;
    // 'in' is the leap into the screen; 'out' is the same shot run backwards —
    // see seek(). Nothing else in here branches on it.
    this.dir = dir === 'out' ? 'out' : 'in';
    this.v = variantOf(variant);
    this.cabX = cabX; this.cabY = cabY; this.cabW = cabW; this.cabH = cabH;
    this.style = style;
    this.floorY = floorY;
    this.heroH = heroH;
    this.startX = startX ?? cabX;
    this.facing = facing;
    this.camStart = camStart;
    // An EXPLICIT pick beats everything — it is somebody standing at the menu
    // choosing a rung, and a variant quietly overriding that would make the
    // ladder do nothing on the one variant that has an opinion. Then the
    // variant's own push, then the caller's default.
    this.zoomGain = zoomOverride != null ? zoomOverride : (this.v.zoom ?? zoomGain);
    this.sfx = sfx;
    this.voiceSfx = voiceSfx;
    this.voiceReverse = voiceReverse;
    this.shake = shake;

    // The glass, measured in the caller's own space. Local to the cabinet, so
    // both slots can rebuild it from whatever x the draw pass hands them and
    // the dive can never drift from the clip by a rounding.
    const g = cabinetScreenRect(cabX - cabW / 2, cabY, cabW, cabH, style);
    this.glass = g;
    this.glassCx = g.x + g.w / 2;
    this.insideGroundY = insideGroundY;
    this.insideUnit = insideUnit;

    // How small he ends up, and therefore how much perspective there is to
    // spend. The inside height is the run's own hero height scaled by whatever
    // one world unit became on this piece of glass — 8.64px on a chibi cabinet.
    this.insideH = Math.max(1, HERO_DRAW_H * insideUnit);
    this.k = Math.max(1.2, heroH / this.insideH);
    // Where the glass plane sits in depth: the height at which drawToon drops
    // to its simplified rig. Crossing exactly there hides the silhouette
    // change under the impact flash instead of popping it mid-flight.
    this.crossH = Math.min(heroH * 0.9, Math.max(this.insideH * 1.2, TOON_LOD_H));
    this.dCross = Math.log(heroH / this.crossH) / Math.log(this.k);

    // 0.62 of a hero was the first pass, and at that height his head cleared
    // the top of the machine at mid-flight: a hero going OVER a cabinet, not
    // into one. 0.38 keeps the whole arc inside the upper cabinet's band, so
    // every frame of the leap is aimed at the glass.
    this.arcH = heroH * 0.38 * lerp(0.28, 1, this.v.hop);
    // Feet at the moment of crossing: standing on the screen's ground line,
    // less the drop the landing phase still has to spend.
    this.groundInside = g.y + insideGroundY;
    this.feetCross = this.groundInside - this.crossH * 0.35;

    // STARTING PART WAY IN, for the route that does not need the windup.
    //
    // Pressing USE is a standing start: the crouch is the anticipation that turns a
    // stand into a decision, and without it the leap comes from nowhere. Pressing
    // JUMP is not — the player has already done the anticipating, the hub has
    // already launched its own hop and played its own jump cue, and a hero who
    // crouches AFTER leaving the floor is playing the beat backwards.
    //
    // So that route starts the clock at the leap and the windup simply never
    // happens. Cues before the start are marked as spent rather than fired, or the
    // crouch's scuff would arrive under a hero already in the air.
    this.t = startAt;
    this.done = false;
    // Its own length, because the two directions no longer share one.
    this.duration = this.dir === 'out' ? DIVE_OUT_DURATION : DIVE_DURATION;
    this.cueIdx = 0;
    const table = this.dir === 'out' ? OUT_CUES : CUES;
    while (this.cueIdx < table.length && table[this.cueIdx].t < startAt) this.cueIdx++;
    this.seek(this.t);
  }

  phase() {
    if (this.dir === 'out') {
      const m = outToIn(this.t);
      for (const p of PHASE_AT) if (m < p.t1) return `out:${p.name}`;
      return 'out:exit';
    }
    for (const p of PHASE_AT) if (this.t < p.t1) return p.name;
    return 'exit';
  }

  // Every drawn quantity, from t alone. Nothing here reads previous state.
  // THE WAY OUT IS THE WAY IN, RUN BACKWARDS.
  //
  // This is the payoff for seek() being pure. A dive-out is not a second animation
  // to keep in step with the first — it is this one evaluated at DURATION - t, so
  // the arc, the perspective, the flash, the camera and the glass crossing are the
  // same curves by construction and cannot drift apart when one of them is tuned.
  //
  // Four things must NOT reverse, and they are the whole of the special case:
  //
  //   facing   he runs INTO the screen going right, so coming out he faces left
  //            until he is through, then turns to land facing the room.
  //   vy       the derivative of a reversed curve is its negative; without this
  //            the air stretch says "falling" while he is rising.
  //   cues     played backwards a rising sweep is still a rising sweep. The out
  //            direction has its own table — see OUT_CUES.
  //   phase    the names are the entry's, so out reports its own (see phase()).
  seek(t) {
    if (this.dir === 'out') {
      this._seekIn(outToIn(t));
      this.t = t;
      this.done = t >= DIVE_OUT_DURATION;
      this.vy = -this.vy;
      // Facing flips at the glass: inward while he is still in the picture,
      // outward once he is through it and arriving in the room.
      this.facing = this.inside ? -1 : 1;
      this.pose.facing = this.facing;
      this.pose.vy = this.vy;
      // HE IS PLEASED TO BE BACK. From the moment his feet take the concourse
      // floor, and not a frame before — the crossing is still something happening
      // to him, and a hero grinning on his way through a pane of glass is one who
      // knew it was coming.
      //
      // `faceJoy` and not `celebrate`: a face-only mood, so he keeps the landing
      // and settle the mirror gives him instead of breaking into a victory routine
      // on a hub floor. The surprise is cleared in the same breath, or the two
      // would be arguing over the same mouth.
      if (t >= OUT_LAND) {
        this.pose.faceSurprised = false;
        this.pose.faceJoy = true;
      }
      this._outDeck(t);
      this.glint = ballGlint(this.stickFwd);
      return;
    }
    this._seekIn(t);
    // Derived from the deck rather than set inside it, so the flash cannot drift
    // out of step with the stick it is supposed to be coming off — and so the
    // exit, whose deck is written forwards rather than mirrored, gets the same
    // rule for free instead of a second copy of it.
    this.glint = ballGlint(this.stickFwd);
  }

  // THE DECK ON THE WAY OUT, on the OUT clock — not mirrored.
  //
  // Everything else about the exit is the entry reversed, and the deck is the one
  // thing that must not be: reversed, the stick would be shoved AWAY from the player
  // at the moment he is coming toward them, and the jump button would go down as he
  // drops into the screen rather than as he leaps out of it. Both would be telling
  // the player the opposite of what is happening.
  //
  // So it is written forwards, against the exit's own beats: running left inside,
  // then the stick pulled DOWN toward the player — out of the screen is the
  // direction he is going — with the button on the leap itself, and everything
  // released once he is through the glass and standing in the room.
  _outDeck(t) {
    const cross = OUT_CROSS;                 // when he comes through the glass
    const gather = 0.30;                     // how long he winds up before it
    this.stick = 0;
    this.stickFwd = 0;
    this.button = 0;
    if (t < cross - gather) {
      // Still inside and heading for the front: stick over to the LEFT, because
      // that is the way he is running in the picture.
      this.stick = -(0.35 + 0.65 * easeOut(clamp01(t / Math.max(0.01, cross - gather)) * 3));
      return;
    }
    const u = clamp01((t - (cross - gather)) / gather);
    const outAmt = clamp01((t - cross) / 0.25);
    const release = 1 - smooth(outAmt);
    // Pulled toward the player, hard, and let go once he is out.
    this.stickFwd = -smooth(u) * release;
    this.stick = -(1 - smooth(u)) * 0.8 * release;
    // The button on the leap, the same shape the entry's takeoff uses.
    const press = (t - (cross - 0.08)) / 0.16;
    if (press > 0) this.button = clamp01(1 - Math.abs(press - 0.5) * 1.6);
  }

  _seekIn(t) {
    this.t = t;
    const v = this.v;

    // ---- depth 0 (on the floor) .. 1 (on the scene plane inside the glass)
    let d = 0;
    if (t >= AT.leap.t0) {
      if (t < AT.cross.t0) d = this.dCross * easeIn(at(t, 'leap'));
      else if (t < AT.land.t0) d = lerp(this.dCross, 0.94, easeOut(at(t, 'cross')));
      else d = lerp(0.94, 1, clamp01(at(t, 'land') * 1.6));
    }
    this.depth = d;
    this.h = this.heroH * Math.pow(this.k, -d);
    this.inside = t >= AT.cross.t0;

    // ---- horizontal
    // `pull` drags him toward the glass centre ahead of the arc: the screen
    // takes him rather than him aiming for it.
    const stepIn = smooth(at(t, 'windup'));
    let x = lerp(this.startX, this.cabX, stepIn);
    if (t >= AT.leap.t0) {
      const u = at(t, 'leap');
      // At full pull his path is noticeably not the parabola he launched on —
      // he is being taken off his own arc, which is the read.
      const aim = lerp(easeOut(u), smooth(u * 1.6), v.pull);
      x = lerp(this.cabX, this.glassCx, aim);
    }
    if (t >= AT.cross.t0) x = this.glassCx;
    // Inside the glass he runs right, in the run's own units.
    this.runX = 0;
    this.runJump = 0;
    if (t >= AT.runoff.t0) {
      const u = at(t, 'runoff') * AT.runoff.dur;
      const speed = BASE_SPEED * this.insideUnit;
      // 0.1s to get going, so he sets off rather than teleporting into a sprint.
      this.runX = speed * (u - Math.min(u, 0.1) * 0.5);
      // ...and the takeoff. `runJump` is how far off the screen's own floor he is,
      // rising and decelerating — he is still going up when the glass edge takes
      // him, which is what makes it read as leaving rather than as landing.
      const j = clamp01((at(t, 'runoff') - RUNOFF_TAKEOFF) / (1 - RUNOFF_TAKEOFF));
      if (j > 0) this.runJump = this.insideH * RUNOFF_JUMP_H * (2 * j - j * j);
    }
    this.x = x;

    // ---- feet
    let feet = this.floorY;
    if (t >= AT.leap.t0 && t < AT.cross.t0) {
      const u = at(t, 'leap');
      feet = lerp(this.floorY, this.feetCross, easeIn(u) * 0.5 + easeOut(u) * 0.5)
        - this.arcH * 4 * u * (1 - u);
    } else if (t >= AT.cross.t0 && t < AT.land.t0) {
      feet = this.feetCross;
    } else if (t >= AT.land.t0) {
      feet = lerp(this.feetCross, this.groundInside, easeOut(at(t, 'land') * 1.25));
    }
    // The run-off's own jump, on top of wherever the landing left him.
    if (this.runJump > 0) feet -= this.runJump;
    this.feetY = feet;

    // vy as the real derivative of that curve, so drawToon's air stretch
    // answers the arc it is actually on instead of a hand-picked number.
    if (t >= AT.leap.t0 && t < AT.cross.t0) {
      const e = 1 / 120;
      const a = this.feetAt(t - e), b = this.feetAt(t + e);
      this.vy = -(b - a) / (2 * e);
    } else this.vy = 0;

    // ---- pose
    let kind = 'idle', grounded = true, squash = 0, lean = 0;
    if (t < AT.leap.t0) {
      // A full unit of squash, not half. LAND_SQUASH_Y is 0.28, so 0.55 takes
      // 15% off his height — against an idle stance that is not a crouch, it is
      // a stand with rounder shoulders, and the anticipation that makes the
      // leap read as a decision was simply not visible.
      squash = easeIn(at(t, 'windup'));
    } else if (t < AT.land.t0) {
      kind = 'jump'; grounded = false;
      // No squash in the air. LAND_SQUASH is a flatten-and-widen for an arrival,
      // and holding the crouch's value into the first frames of the leap drew a
      // squat, splayed figure at the exact moment he should be at full stretch —
      // it read as the hero lying down. The anticipation ends when he leaves
      // the floor; the arc and the air stretch carry it from there.
      squash = 0;
      lean = 0.14 * smooth(at(t, 'leap')) * v.hop;
    } else if (t < AT.set.t0) {
      const u = at(t, 'land');
      kind = u < GROUNDED_FRAC ? 'jump' : 'idle';
      grounded = u >= GROUNDED_FRAC;
      squash = 0.62 * Math.sin(Math.PI * clamp01((u - 0.2) / 0.8));
    } else if (t < AT.runoff.t0) {
      kind = 'idle';
    } else {
      // Running, then airborne for the last of it. vy is measured off the jump curve
      // so the air stretch answers the real arc, the same way the entry leap does.
      const airborne = this.runJump > 0;
      kind = airborne ? 'jump' : 'run';
      grounded = !airborne;
      if (airborne) {
        const e = 1 / 120;
        this.vy = (this.runJumpAt(t + e) - this.runJumpAt(t - e)) / (2 * e);
      }
    }
    this.pose = {
      kind, grounded, vy: this.vy, squash, lean,
      facing: this.facing, time: t,
      phase: this.gaitPhase(t),
      menu: false,
      // THE FACE FOR GOING THROUGH A PANE OF GLASS. On from the takeoff until he is
      // standing inside — the whole airborne stretch plus the crossing — because
      // that is the part where something is happening TO him rather than by him.
      // It drops the moment his feet take his weight, so the hero who gets up and
      // runs off is composed again; a permanently startled hero is a cartoon, and
      // this only reads as a reaction if it ends.
      faceSurprised: t >= AT.leap.t0 && t < GROUNDED_AT,
    };

    // ---- the pixel dissolve, 0..1, peaking across the plane
    //
    // He is WHOLE by the time he is standing. The dissolve is a thing that happens
    // to him going through the glass, not a state he is in afterwards — a hero who
    // is still made of blocks while he stands on the ground inside has not arrived,
    // he has glitched. So the reassembly is pinned to the same instant the pose
    // becomes grounded (GROUNDED_AT below) rather than to a decay rate that happened
    // to land near it, and it is hard zero from there on.
    this.shatter = v.pixel * clamp01(
      t < AT.cross.t0
        ? (at(t, 'leap') - 0.8) / 0.2
        : t < AT.land.t0 ? 1
          : 1 - clamp01((t - AT.land.t0) / (GROUNDED_AT - AT.land.t0)),
    );
    // ---- the screen's own reaction, 0..1
    // Cubed was too shy: it left the screen doing nothing at all for the first
    // two-thirds of the leap and then arriving late. Squared starts the glass
    // working while he is still on his way up, which is what "it is pulling him in"
    // has to look like.
    this.bulge = v.pull * clamp01(
      t < AT.cross.t0 ? at(t, 'leap') ** 2 : 1 - at(t, 'cross'),
    );
    // A flash, not a white-out. At 0.85 across the whole glass the crossing
    // frame was a white rectangle — it hid the pop it was meant to cover AND
    // everything else, so there was nothing to judge. Peaks lower and leaves
    // faster, which is what a tube hit actually looks like.
    // A flash, not a white-out. At 0.85 across the whole glass the crossing
    // frame was a white rectangle — it hid the pop it was meant to cover AND
    // everything else, so there was nothing to judge. Peaks lower and leaves
    // faster, which is what a tube hit actually looks like.
    this.flash = t >= AT.cross.t0 && t < AT.land.t0 ? 0.55 * (1 - at(t, 'cross')) ** 1.6 : 0;
    // ---- the room's half of it, 0..1
    //
    // The glass flash says the picture was hit. This says the ROOM saw it: light
    // escaping round the back of the machine, so for a moment the cabinet is a
    // silhouette against its own event rather than a lit object in a lit room.
    // Starts building in the last of the leap — the machine takes the light before
    // he arrives, which is what makes the arrival feel caused rather than timed.
    // ---- the joystick, -1..1
    //
    // Nobody is standing at this machine — he is inside it. That is exactly why the
    // stick moving is worth drawing: an unattended control working by itself is the
    // clearest way to say the hero is in there driving, and it costs one number.
    //
    // It follows what he is DOING, not a canned wiggle: a flick on the takeoff, held
    // over while he runs off to the right inside the glass, and released to centre
    // once he is gone. Anything else and the machine is playing a different game
    // from the one on its screen.
    this.stick = 0;
    this.stickFwd = 0;
    if (t >= AT.leap.t0 && t < AT.cross.t0) {
      // INTO the screen is forward, not sideways. He is going away from the player,
      // so the stick goes away from the player — pushed over the top and held there
      // for the flight, which is the direction the whole leap is in.
      this.stickFwd = smooth(at(t, 'leap') * 2.2);
    } else if (t >= AT.cross.t0 && t < AT.runoff.t0) {
      // Released once he is through. The hand comes off; the machine is his now.
      this.stickFwd = 1 - smooth(clamp01((t - AT.cross.t0) / 0.22));
    } else if (t >= AT.runoff.t0 && t < AT.exit.t0) {
      // ...and then all the way right, because now he is running.
      this.stick = 0.35 + 0.65 * easeOut(at(t, 'runoff') * 3);
    } else if (t >= AT.exit.t0) {
      // AND THE HAND COMES OFF. The paragraph above says the stick is "released
      // to centre once he is gone" and it never was: `at()` saturates past its
      // own phase, so the last frame of the run-off held all the way right for
      // the whole of the exit and beyond. That is a machine nobody is playing
      // sitting with its stick shoved over — visible for as long as the pause
      // lasts. A sprung stick returns on its own, so it eases back rather than
      // snapping on the frame he vanishes.
      this.stick = 1 - smooth(clamp01((t - AT.exit.t0) / 0.18));
    }

    // ---- the jump button, 0..1
    //
    // Down on the takeoff and released a beat later, so the button and the hero's
    // feet leave the floor on the same frame. This is the other half of the lesson:
    // the stick says where, the button says up.
    this.button = 0;
    if (t >= AT.runoff.t0) {
      const press = (at(t, 'runoff') - RUNOFF_TAKEOFF) / 0.16;
      if (press > 0) this.button = clamp01(1 - Math.abs(press - 0.5) * 1.6);
    }

    this.flare = t < AT.cross.t0
      ? 0.35 * easeIn(clamp01((at(t, 'leap') - 0.72) / 0.28))
      : 1 - easeIn(clamp01((t - AT.cross.t0) / 0.55));

    this.done = t >= DIVE_DURATION;
  }

  // Feet at an arbitrary t, for the vy derivative. Kept separate from seek so
  // sampling it cannot disturb the frame being built.
  feetAt(t) {
    if (t <= AT.leap.t0) return this.floorY;
    if (t >= AT.cross.t0) return this.feetCross;
    const u = at(t, 'leap');
    return lerp(this.floorY, this.feetCross, easeIn(u) * 0.5 + easeOut(u) * 0.5)
      - this.arcH * 4 * u * (1 - u);
  }

  // How high the run-off jump is at an arbitrary t, so its velocity can be measured
  // without disturbing the frame being built.
  runJumpAt(t) {
    if (t < AT.runoff.t0) return 0;
    const j = clamp01((at(t, 'runoff') - RUNOFF_TAKEOFF) / (1 - RUNOFF_TAKEOFF));
    return j > 0 ? this.insideH * RUNOFF_JUMP_H * (2 * j - j * j) : 0;
  }

  gaitPhase(t) {
    if (t < AT.runoff.t0) return 0;
    const dist = this.runX / Math.max(0.001, this.insideH);
    return (dist / GAIT_DISTANCE_PER_CYCLE) % 1;
  }

  update(dt) {
    // __mash_dev.holdDiveAt: capture-only, the same pattern as the hub's
    // hideSpecialOrb/hideNpcs flags. The dive's clock stops at the given
    // dive-relative time instead of running out to DIVE_DURATION, so `done`
    // never fires: the dive keeps owning the screen, the hub's ordinary avatar
    // never pops back in front of the machine, and the cabinet's own attract
    // art carries on animating live. That turns the exit-phase beat into a hold
    // of any length a cut needs, rather than a 0.38s window to hit.
    const hold = typeof window !== 'undefined' && window.__mash_dev
      ? window.__mash_dev.holdDiveAt : null;
    const next = this.t + dt;
    this.seek(hold != null && this.dir !== 'out' ? Math.min(next, hold) : next);
    this.fireCues();
  }

  // Cues on a high-water mark, so they fire once going forward and never on a
  // seek — which is what lets the gallery share this class without making noise.
  fireCues() {
    const cues = this.dir === 'out' ? OUT_CUES : CUES;
    while (this.cueIdx < cues.length && this.t >= cues[this.cueIdx].t) {
      const c = cues[this.cueIdx++];
      if (this.sfx && c.sfx) for (const [name, o] of c.sfx) this.sfx(name, o);
      // A cue may name a SONG-ENGINE PRESET instead of a hand-built one. The
      // gallery injects neither callback, so a page of these is still silent.
      if (this.voiceSfx && c.voice) for (const [id, o] of c.voice) this.voiceSfx(id, o);
      if (this.voiceReverse && c.voiceReverse) {
        for (const [id, o] of c.voiceReverse) this.voiceReverse(id, o);
      }
      // The leap's cue is the CABINET's, so it is resolved at fire time rather than
      // baked into the table — one dive class, nine possible sounds.
      if (this.voiceSfx && c.leapVoice) {
        const v = leapVoiceFor(this.cab && this.cab.id);
        this.voiceSfx(v.id, { ...v, id: undefined, seconds: AT.leap.dur });
      }
      if (c.shake && this.shake) this.shake(c.shake[0], c.shake[1]);
    }
  }

  // ------------------------------------------------------------------ camera
  //
  // `gain` and `aim` travel with the shot rather than being read off a hub
  // constant, so a variant can carry its own camera the same way it carries its own
  // ingredients — and the hub has one place to read them from.
  camera() {
    // ONE CURVE FOR THE WHOLE SHOT, not two joined at the crossing.
    //
    // This used to smoothstep to 1 by the impact and then start a separate linear
    // creep, which is a camera that arrives, stops, and sets off again — and at the
    // 1.75 push that gear change is exactly where the eye is, because it lands on
    // the same frame as the flash. A single smootherstep over the whole dive has
    // zero velocity AND zero acceleration at both ends, so the move begins, passes
    // through the crossing and settles without a seam anywhere in it.
    //
    // It still reaches most of its distance by the impact — smootherstep is past
    // 0.85 at the crossing's share of the run — so the framing at the moment that
    // matters is what it was; only the getting there changed.
    // Mirrored for the way out, so the camera pulls BACK off the machine on the
    // same curve it pushed in on.
    const clock = this.dir === 'out' ? outToIn(this.t) : this.t;
    const u = clamp01(clock / (DIVE_DURATION * 0.86));
    const push = u * u * u * (u * (u * 6 - 15) + 10);   // smootherstep
    return {
      amt: push,
      focusX: this.glassCx,
      // The middle of the glass — where a hard push has to point.
      focusY: this.glass.y + this.glass.h / 2,
      gain: this.zoomGain,
      // Only what the VARIANT insists on. The derivation belongs to whoever knows
      // the EFFECTIVE push, and that is not this object: the hub substitutes its own
      // gain in portrait, so an aim computed from this.zoomGain described a shot
      // that was not being taken — 0.31 of a re-aim on a 3x push, which is the
      // framing failure aim exists to prevent. See layout().
      aimOverride: this.v.aim ?? null,
    };
  }

  // Deliberately unclamped: the push-in wants to walk the camera past the ends
  // of the concourse, and every fill in the hub spans the view rather than the
  // world — the wall and floor are camera-space rects across [0, viewW], and
  // drawFoodCourtFloor tiles correctly at a negative offset — so there is
  // nothing behind the clamp to protect.
  //
  // AIMED AT WHERE IT IS GOING, not at where it would be if it stopped here.
  //
  // This chased a moving target. The destination is `focusX - viewW / 2`, and viewW
  // SHRINKS as the zoom grows — so early in the push the target is far to the left
  // (96 - 184 = -88) with a small blend weight, and late it is close (96 - 105 = -9.5)
  // with full weight. The product peaks in between: measured, the camera ran out to
  // -19.1 and then came back to -9.5, seven frames of visible reversal that read as
  // a drift right and a settle.
  //
  // `finalViewW` is the view at the END of the push, so the target is fixed and the
  // path to it is monotonic. The endpoint is unchanged — at amt 1 the two agree by
  // definition — it is only the journey that stops doubling back.
  camX(viewW, finalViewW = viewW) {
    const { amt, focusX } = this.camera();
    const target = focusX - finalViewW / 2;
    return this.camStart + (target - this.camStart) * Math.min(1, amt);
  }

  // ------------------------------------------------------------- slot: behind
  //
  // Called BEFORE the shell, so everything here is light the machine is standing in
  // front of. Three pieces, all cheap: a broad bloom the cabinet occludes, a hotter
  // core right behind the glass, and a pool thrown down onto the floor — without the
  // floor the flash reads as a sticker pasted behind the machine rather than as a
  // light source in the room.
  //
  // `tint` is the cabinet's own screen colour, so the plumber flashes green and the
  // frost cabinet flashes blue: it is THAT machine's light, not a generic white pop.
  drawBehind(ctx, cabCx, { tint = '#cfe9ff', floorY = null } = {}) {
    const f = this.flare;
    if (!(f > 0.01)) return;
    const dx = cabCx - this.cabX;
    const cx = this.glassCx + dx;
    const cy = this.glass.y + this.glass.h / 2;
    ctx.save();
    // Additive, so it reads as light rather than as white paint over the wall.
    ctx.globalCompositeOperation = 'lighter';
    const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, this.cabW * 2.2);
    bloom.addColorStop(0, withAlpha(tint, 0.55 * f));
    bloom.addColorStop(0.45, withAlpha(tint, 0.16 * f));
    bloom.addColorStop(1, withAlpha(tint, 0));
    ctx.fillStyle = bloom;
    ctx.fillRect(cx - this.cabW * 2.2, cy - this.cabW * 2.2, this.cabW * 4.4, this.cabW * 4.4);
    // The core: tight, white-hot, and only at the height of the glass.
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, this.cabW * 0.8);
    core.addColorStop(0, `rgba(255,255,255,${(0.7 * f).toFixed(3)})`);
    core.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = core;
    ctx.fillRect(cx - this.cabW * 0.8, cy - this.cabW * 0.8, this.cabW * 1.6, this.cabW * 1.6);
    if (floorY != null) {
      // Light on the floor, wider than it is tall — a pool, not a ball.
      const pool = ctx.createRadialGradient(cx, floorY, 0, cx, floorY, this.cabW * 1.6);
      pool.addColorStop(0, withAlpha(tint, 0.34 * f));
      pool.addColorStop(1, withAlpha(tint, 0));
      ctx.save();
      ctx.translate(cx, floorY);
      ctx.scale(1, 0.34);
      ctx.translate(-cx, -floorY);
      ctx.fillStyle = pool;
      ctx.fillRect(cx - this.cabW * 1.6, floorY - this.cabW * 1.6, this.cabW * 3.2, this.cabW * 3.2);
      ctx.restore();
    }
    ctx.restore();
  }

  // -------------------------------------------------------------- slot: front
  drawOutside(ctx, cabCx, { lit = 1 } = {}) {
    const dx = cabCx - this.cabX; // the caller's screen-space offset for this machine
    if (!this.inside) {
      const x = this.x + dx;
      // The shadow shrinks and fades with depth rather than switching off, so
      // the floor keeps hold of him for as long as he is still on it.
      const near = 1 - clamp01(this.depth / Math.max(0.001, this.dCross));
      if (near > 0.02) {
        drawSoftContactShadow(ctx, x, this.floorY, this.h * 0.46 * near, this.h * 0.13 * near,
          { alpha: 0.44 * near, ink: '4,3,9' });
      }
      this.paintHero(ctx, x, this.feetY, this.h, { lit });
    }
    if (this.t >= AT.cross.t0 && this.t < AT.set.t0) this.paintImpact(ctx, dx);
  }

  // --------------------------------------------------------------- slot: glass
  //
  // Wraps whatever the cabinet was already showing. `base` may be null — a
  // headless attract scene falls back to the genre motif — and the dive simply
  // plays over whatever came out.
  screenArt(base, cabCx) {
    return (c, cw, ch) => {
      // THE PICTURE IS WHAT GETS PULLED. The first pass drew the attract art flat
      // and ringed over it, which is decoration laid on a still image — the screen
      // looked like it had a graphic on it, not like it was doing something. Now the
      // art itself is scaled into the entry point, so the whole picture funnels in
      // and the rings are riding something that is already moving.
      const b = this.bulge;
      if (b > 0.01 && base) {
        c.save();
        const fx = cw / 2, fy = ch * 0.45;
        c.translate(fx, fy);
        // Toward the viewer and inward at once: it reads as the glass being drawn
        // out into a funnel rather than as a zoom.
        c.scale(1 + 0.55 * b, 1 - 0.30 * b);
        c.translate(-fx, -fy);
        base(c, cw, ch);
        c.restore();
      } else if (base) {
        base(c, cw, ch);
      }
      // Origin is the glass top-left here, so everything below is glass-local.
      if (this.bulge > 0.01) this.paintBulge(c, cw, ch);
      if (this.inside) {
        const fx = this.glassCx - this.glass.x + this.runX;
        const fy = this.feetY - this.glass.y;   // feetY already carries the jump
        this.paintHero(c, fx, fy, this.h, { lit: 1, glassH: ch });
        if (this.t >= AT.land.t0 && this.t < AT.set.t0) this.paintDust(c, fx, fy);
      }
      if (this.flash > 0) {
        c.globalAlpha = this.flash;
        c.fillStyle = '#fff';
        c.fillRect(0, 0, cw, ch);
        c.globalAlpha = 1;
        // The tear: one bright row dropping down the tube, the tell that the
        // picture was hit rather than merely brightened.
        const ty = ch * easeOut(at(this.t, 'cross'));
        c.fillStyle = 'rgba(255,255,255,0.9)';
        c.fillRect(0, ty, cw, 1);
      }
    };
  }

  // ------------------------------------------------------------------ pieces

  // One hero, whole or in bits. The dissolve renders him once and blits the
  // result as blocks streaming toward the entry point, so the pixels are his
  // actual pixels rather than a coloured confetti that happens to be near him.
  paintHero(ctx, cx, feetY, h, { lit = 1, glassH = 0 } = {}) {
    // Drawn through the pinch: taller and narrower the harder the screen is pulling,
    // about his own feet. A body that does not deform while the picture around it
    // funnels is a body the effect is happening NEAR rather than TO — and the
    // stretch is what makes the last few frames before the glass read as being
    // taken rather than as arriving.
    const squeeze = this.v.pull * this.bulge;
    if (squeeze > 0.02) {
      ctx.save();
      ctx.translate(cx, feetY);
      ctx.scale(1 - 0.34 * squeeze, 1 + 0.55 * squeeze);
      ctx.translate(-cx, -feetY);
      this._paintHeroBody(ctx, cx, feetY, h, { lit, glassH });
      ctx.restore();
      return;
    }
    this._paintHeroBody(ctx, cx, feetY, h, { lit, glassH });
  }

  _paintHeroBody(ctx, cx, feetY, h, { lit = 1, glassH = 0 } = {}) {
    if (this.shatter <= 0.02) {
      drawToon(ctx, this.heroId, this.pose, cx, feetY, h, { lit });
      return;
    }
    const s = clamp01(this.shatter);
    const buf = heroBuffer(ctx, this.heroId, this.pose, h, lit);
    if (!buf) { drawToon(ctx, this.heroId, this.pose, cx, feetY, h, { lit }); return; }
    const { canvas, scale, w, hh } = buf;
    // Chunky on purpose: a fine grid reads as a dissolve to noise, where a
    // coarse one reads as the picture being taken apart into pixels.
    const cell = Math.max(2, Math.round(h * 0.13));
    const cols = Math.max(1, Math.ceil(w / cell));
    const rows = Math.max(1, Math.ceil(hh / cell));
    const left = cx - w / 2, top = feetY - hh;
    // Where the blocks are heading: the middle of the glass if we are outside
    // it, the hero's own centre once we are in.
    const aimY = glassH ? glassH * 0.45 : this.glass.y + this.glass.h * 0.45 - top;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let r = 0; r < rows; r++) {
      for (let cI = 0; cI < cols; cI++) {
        const i = r * cols + cI;
        // Deterministic per-block jitter — no RNG, so a seek is reproducible.
        const n = ((i * 2654435761) >>> 0) / 4294967296;
        const delay = n * 0.55;
        const k = clamp01((s - delay) / (1 - delay));
        if (k <= 0) { // still part of the body
          ctx.drawImage(canvas, cI * cell * scale, r * cell * scale, cell * scale, cell * scale,
            left + cI * cell, top + r * cell, cell, cell);
          continue;
        }
        const bx = left + cI * cell;
        const by = top + r * cell;
        const tx = cx + (n - 0.5) * h * 0.3;
        const ty = top + aimY;
        ctx.globalAlpha = 1 - k * 0.65;
        ctx.drawImage(canvas, cI * cell * scale, r * cell * scale, cell * scale, cell * scale,
          lerp(bx, tx, easeIn(k)), lerp(by, ty, easeIn(k)), cell, cell);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // The screen reaching out. Rings swelling at the entry point, plus a darker
  // draw-in at the rim, so the picture reads as being pulled into a funnel
  // rather than simply flashing.
  paintBulge(ctx, cw, ch) {
    const b = this.bulge;
    const cx = cw / 2, cy = ch * 0.45;
    ctx.save();
    // A dark vignette closing in from the edges. This is what sells a funnel: the
    // rim of the picture goes away first, so the centre reads as further off rather
    // than merely brighter. Without it the rings were a sticker on flat art.
    const rim = ctx.createRadialGradient(cx, cy, cw * 0.12, cx, cy, cw * 0.72);
    rim.addColorStop(0, 'rgba(0,0,0,0)');
    rim.addColorStop(1, `rgba(0,0,0,${(0.62 * b).toFixed(3)})`);
    ctx.fillStyle = rim;
    ctx.fillRect(0, 0, cw, ch);
    // Five rings rather than three, travelling further and faster, so at full pull
    // there is always one crossing the glass instead of a gap between gestures.
    for (let i = 0; i < 5; i++) {
      const u = clamp01(b * 1.45 - i * 0.16);
      if (u <= 0) continue;
      const r = lerp(cw * 0.03, cw * 0.78, u);
      ctx.globalAlpha = 0.72 * (1 - u) ** 0.8 * b;
      ctx.strokeStyle = i % 2 ? '#ffffff' : '#dff3ff';
      ctx.lineWidth = Math.max(0.5, cw * 0.035 * (1 - u));
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * (ch / cw), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // The pinch: a bright core the hero is about to arrive through, with a halo so
    // it reads as a hole with light coming out of it rather than as a white dot.
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, cw * 0.26 * b);
    core.addColorStop(0, `rgba(255,255,255,${(0.95 * b * b).toFixed(3)})`);
    core.addColorStop(0.35, `rgba(223,243,255,${(0.45 * b * b).toFixed(3)})`);
    core.addColorStop(1, 'rgba(223,243,255,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = core;
    ctx.fillRect(cx - cw * 0.26 * b, cy - cw * 0.26 * b, cw * 0.52 * b, cw * 0.52 * b);
    ctx.restore();
  }

  // Sparks and a ring, drawn OUTSIDE the glass so the crossing is doing work in
  // both passes at once. That simultaneity is what hides the clip switching on.
  paintImpact(ctx, dx) {
    const age = this.t - AT.cross.t0;
    const life = 0.30;
    if (age > life) return;
    const u = clamp01(age / life);
    const cx = this.glassCx + dx, cy = this.glass.y + this.glass.h * 0.45;
    ctx.save();
    // ring
    ctx.globalAlpha = 0.42 * (1 - u) ** 1.5;
    ctx.strokeStyle = '#eaf6ff';
    ctx.lineWidth = Math.max(0.4, 1.1 * (1 - u));
    ctx.beginPath();
    // Inside the glass, not over the machine. An earlier pass let this reach
    // 0.95 of the glass in both axes — a 66-unit ellipse on a 48-unit cabinet,
    // which read as a grey halo hung on the chassis rather than as the picture
    // being hit. The impact belongs to the screen; the shell is just furniture.
    ctx.ellipse(cx, cy, lerp(this.glass.w * 0.10, this.glass.w * 0.52, easeOut(u)),
      lerp(this.glass.h * 0.10, this.glass.h * 0.48, easeOut(u)), 0, 0, Math.PI * 2);
    ctx.stroke();
    // twelve shards on a golden-angle fan — even coverage without an RNG
    for (let i = 0; i < 12; i++) {
      const ang = i * 2.39996;
      const speed = 15 + ((i * 37) % 14);
      const r = speed * age;
      const px = cx + Math.cos(ang) * r;
      const py = cy + Math.sin(ang) * r * 0.7 + 90 * age * age;
      ctx.globalAlpha = (1 - u) * 0.9;
      ctx.fillStyle = i % 3 === 0 ? '#fff' : '#9fe4ff';
      ctx.fillRect(px, py, 1.1, 1.1);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  paintDust(ctx, fx, fy) {
    const age = this.t - AT.land.t0;
    if (age > 0.22) return;
    const u = clamp01(age / 0.22);
    ctx.save();
    ctx.globalAlpha = 0.8 * (1 - u);
    ctx.fillStyle = '#e6f2ff';
    for (let i = 0; i < 3; i++) {
      const dir = i === 1 ? 0 : i === 0 ? -1 : 1;
      ctx.fillRect(fx + dir * (1 + u * 4), fy - u * 2.2 - 0.5, 1, 1);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ------------------------------------------------------------------- audio
//
// Placed on the phase edges. `launch` rather than `jump` on purpose: `jump` is
// the ordinary hub hop and this must not sound like one. The only shake in the
// whole dive is the crossing — a hop should not rattle the room, and the
// landing happens inside a television.
// ---- LEVELS ARE SET AGAINST EACH OTHER, not chosen one at a time.
//
// TRIMMED AS A SET, TWICE. The balance below was judged good and the whole thing
// judged loud, so every cue came down by the SAME amount rather than being re-picked
// one at a time — 2.4 dB, then a further 2.2 dB, for 4.6 dB (x0.59) off where it
// started. That is the only way to make a mix quieter without also making it a
// different mix: touch one number and you have changed the balance you just approved.
//
// The reverb and delay sends are untouched by a trim and do not need to be: they are
// proportional, so quieting the source quiets its tail by exactly as much.
//
// Rendered through tools/render-cues.js and read as RMS, because peak is the wrong
// question when comparing a 0.04s tick with a 2.2s ribbon. Where they land:
//
//   boom (the crossing)   -34.6   the bang: still the hit, no longer the shout
//   the leap's preset     -35.1   the lead gesture, level with the bang
//   portal breath (exit)  -41.8   a swell under the shutter, not a transient
//   dash (the crouch)     -43.6
//   land (inside)         -49.1   the smallest on purpose: a cabinet speaker
//
// The hierarchy is the point: every one of these came up, and they came up by
// DIFFERENT amounts so the order they arrive in is still the order you hear.
const CUES = [
  { t: 0.00, sfx: [['dash', { gain: 0.82, pitch: 1.25 }]] },
  // THE LEAP IS THE CABINET'S OWN SOUND. Not a buildCue case and not one preset —
  // LEAP_VOICE maps each machine to a song-engine preset fired through
  // Audio.voiceSfx onto the SFX bus. Whichever it is, it is stretched to the leap
  // phase's own length, so its gesture tops out on the frame he goes through the
  // glass rather than at some tempo the cabinet behind him happens to be playing at.
  { t: AT.leap.t0, leapVoice: true },
  // ONE BOOM, not two cues stacked. impact + crackle was a knock with a fizz on top
  // of it — two small sounds trying to add up to a big one, and they never did. boom
  // is a single event with its own body and tail, which is what going through a pane
  // of glass is. The shake is unchanged and still the only one in the dive.
  {
    t: AT.cross.t0,
    // HEAVY ROOM, and deliberately no louder for it. reverb 2.4 into a 3.5s decay
    // takes the tail from 1.82s to 3.24s while the RMS stays put — the bang is not
    // bigger, it is somewhere bigger, which is the difference between a loud noise
    // and going through a wall into a hall. The tail runs well past the dive's own
    // end and into stage select, which is the space on the other side.
    sfx: [['boom', { gain: 0.74, reverb: 1.7, reverbDecay: 3.5 }]],
    shake: [1.4, 0.16],
  },
  // Small, far away, pitched up: he is eight pixels tall and coming out of a
  // cabinet speaker.
  { t: AT.set.t0, sfx: [['land', { gain: 1.29, pitch: 1.60 }]] },
  // HIS JUMP OFF THE EDGE. The same cue the game fires when you press jump, which
  // is the entire point of showing the jump at all — the player hears the sound
  // they are about to be making. Pitched up and quiet for the same reason `land`
  // is: it is happening inside a cabinet, several feet away, to somebody eight
  // pixels tall.
  {
    t: AT.runoff.t0 + AT.runoff.dur * RUNOFF_TAKEOFF,
    sfx: [['jump', { gain: 0.85, pitch: 1.55 }]],
  },
  // PORTAL BREATH, not the shipped portal. The plain cue has a knock in the middle of
  // its seam and a flash on the crossing — both right for a level STARTING, both
  // wrong here: by 2.02s the hero is gone, the glass has already been hit, and one
  // more percussive arrival under the shutter is a thing arriving when nothing is.
  // The breath takes out both transients and leaves only the air moving.
  //
  // Named rather than inlined so the engine, the audition sheet and this all read one
  // object — see PORTAL_BREATH in engine/audio.js. The hub resolves it (the dive
  // deliberately does not import the audio engine; the gallery drives this file too).
  //
  // 3.2 because the breath is 3.3dB quieter than the cue it replaces at the same
  // gain: no thump and no flash is less signal, and matching by number rather than by
  // level would have quietly demoted it.
  { t: AT.exit.t0, sfx: [['portal', { gain: 2.65, shapeRef: 'PORTAL_BREATH' }]] },
];

// -------------------------------------------------- the leap's voice, per cabinet
//
// The dive is one animation, but the sound of going into a machine is that
// MACHINE'S sound — a plumbing cabinet and a racing cabinet do not swallow you the
// same way. So the leap cue is a table rather than a constant, keyed by cabinet id,
// falling back to the plumber's sweep for any cabinet that has not been given one.
//
// Each entry is a voiceSfx() option bag. `seconds` is always the leap phase's own
// length, so whichever preset is chosen, its gesture finishes on the frame the hero
// goes through the glass.
const LEAP_VOICE = {
  // Empty ON PURPOSE, and kept rather than deleted. Data Ribbon won the leap for the
  // whole cast, so there is nothing to override — but the seam that made nine
  // answers possible costs one lookup, and the question "does a racing cabinet
  // swallow you like a plumbing one" is the sort that reopens. An entry here is one
  // line whenever it does.
};
// One ribbon, cast-wide. A long ascending gesture with animated sidebands and three
// ghosted echoes built into the preset itself (taps at 0, 0.13, 0.29) — which is why
// the delay send is light: it already arrives with its own repeats, and a heavy send
// on top of them smears the ribbon instead of placing it.
// The entry cue's own length. The exit reverses THIS, so the two are the same
// gesture and the number cannot drift between them.
const LEAP_SECONDS = AT.leap.dur;

// WHAT HAS TO BE RENDERED BEFORE THE EXIT CAN MAKE A SOUND, named once so every
// place that warms it is warming the same thing.
//
// The exit cue is an offline render (see Audio.voiceSfxReverse) and therefore cannot
// be made on the frame it is wanted — the first call is always silent. The hub warms
// it on entry, which covers a player walking to a machine, and misses entirely the
// dev route that drops straight into a level: nothing had entered the hub, so the
// first exit played nothing and every one after it played fine. So the run paths warm
// it too — starting a stage is the only way to reach the cue that ends one.
export const EXIT_CUE = { id: 'dataRibbon', seconds: LEAP_SECONDS };

const DEFAULT_LEAP_VOICE = {
  id: 'dataRibbon',
  gain: 0.94,
  delay: 0.3, delayTime: 0.26, delayFeedback: 0.3,
};

export function leapVoiceFor(cabId) {
  return LEAP_VOICE[cabId] || DEFAULT_LEAP_VOICE;
}

// ---- THE WAY OUT'S OWN SOUND ------------------------------------------------
//
// Not the entry's cues reversed, because a cue played backwards is not its own
// opposite: Data Ribbon RISES, and running the animation backwards does not make it
// fall. So the exit gets a descending preset — the Synare disc-drum fall, 3 kHz down
// to 60 over a second and a half, which is the library's natural inverse of an
// ascending ribbon.
//
// Times are on the OUT clock, which runs 0 -> DIVE_DURATION while the mirrored
// animation runs backwards underneath it. So `cross` here is the same glass, arrived
// at from the other side.
// Placed by naming the ENTRY moment and asking where it lands on the out clock —
// which is the only way that survives the two halves running at different rates.
const OUT_CROSS = inToOut(AT.cross.t1);
const OUT_LAND = inToOut(AT.leap.t0);

// How much of the arrival smile the DIVE itself already covers: from his feet
// taking the concourse to the last frame of the animation. Exported so the hub can
// subtract it and think in one number — the total length of the smile — rather than
// in an overhang that silently changes meaning every time the exit is re-timed.
export const DIVE_OUT_SMILE = Math.max(0, DIVE_OUT_DURATION - OUT_LAND);

const OUT_CUES = [
  // THE ENTRY CUE, BACKWARDS. Literally — Data Ribbon rendered offline and its
  // samples flipped, not a descending preset chosen to stand in for one. A reversed
  // rise is a swell that ends at a cliff: the attack lands where the original's
  // decay was, and the tail leads into it. Nothing else sounds like that, and it is
  // exactly the shape of coming out of somewhere.
  //
  // It is fired a little BEFORE the glass, not on it, because its loud moment is at
  // the end — a reversed cue has to start early enough for its own arrival to land
  // on the event. Audio.warmVoiceReverse has it rendered long before now (the hub
  // does it on entry); if it somehow is not ready, the boom below still carries the
  // moment and the exit is quieter rather than silent.
  // Fired at the very top of the exit and scheduled backwards from its own hit —
  // see Audio.voiceSfxReverse's `landAt`. The swell has to arrive when his FEET DO,
  // not when he leaves the glass: the glass already has the boom, and a reversed
  // rise that peaks in mid-air peaks on nothing. OUT_LAND is that moment.
  {
    t: 0,
    voiceReverse: [['dataRibbon', {
      seconds: LEAP_SECONDS, gain: 1.15, landAt: OUT_LAND,
      // Played at the exit's own speed, so the cue is as long as the gesture. At
      // rate 1 it ran 0.958s against a 0.316s leap — three times too long, and it
      // read as a separate event happening near the hero rather than as his.
      rate: OUT_SPEED,
      delay: 0.3, delayTime: 0.26, delayFeedback: 0.3,
    }]],
  },
  // The same jump, going the other way: he leaps OUT through the glass, so the cue
  // lands with the button press on the deck. Not pitched as high as the inside one —
  // by now he is arriving in the room at full size, not performing in a box.
  { t: Math.max(0, OUT_CROSS - 0.08), sfx: [['jump', { gain: 0.95, pitch: 1.12 }]] },
  // The machine letting go of him: the same boom and the same room, a touch softer
  // than the way in — coming out is a release, not an impact.
  {
    t: OUT_CROSS,
    // Softer than the way in, and softer again than it was. Going in, the glass
    // is hit; coming out it is only let go of, and the room is what is left.
    sfx: [['boom', { gain: 0.38, reverb: 1.7, reverbDecay: 3.5 }]],
    shake: [1.0, 0.14],
  },
  // Landing on the concourse floor: the hub's own weight, not the small far-away
  // tick the inside landing gets. He is full size here and standing on tile.
  { t: OUT_LAND, sfx: [['land', { gain: 1.1, pitch: 0.92 }]] },
];

// ----------------------------------------------------------- the hero buffer
//
// One offscreen canvas, reused. The dissolve needs the hero as a raster to cut
// into blocks, and re-allocating a canvas per frame per tile with five of these
// looping in the gallery is exactly the kind of cost that makes a bake-off page
// unusable. Sized to the largest hero drawn so far and never shrunk.
let BUF = null;
function heroBuffer(ctx, heroId, pose, h, lit) {
  const scale = 3; // supersampled, so the blocks keep their edges when blitted
  const w = Math.ceil(h * 1.6), hh = Math.ceil(h * 1.25);
  try {
    if (!BUF || BUF.w < w || BUF.h < hh) {
      const c = (typeof document !== 'undefined') ? document.createElement('canvas') : null;
      if (!c) return null;
      c.width = Math.ceil(w * scale); c.height = Math.ceil(hh * scale);
      BUF = { canvas: c, ctx: c.getContext('2d'), w, h: hh };
    }
    const b = BUF;
    b.ctx.setTransform(1, 0, 0, 1, 0, 0);
    b.ctx.clearRect(0, 0, b.canvas.width, b.canvas.height);
    b.ctx.save();
    b.ctx.scale(scale, scale);
    // Feet on the bottom edge, centred: the block grid reads straight off this.
    drawToon(b.ctx, heroId, pose, w / 2, hh, h, { lit });
    b.ctx.restore();
    return { canvas: b.canvas, scale, w, hh };
  } catch {
    return null; // headless: fall back to an undissolved hero
  }
}
