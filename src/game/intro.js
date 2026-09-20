// THE OPENING FILM.
//
// One arcade, one camera, eleven shots. It replaces five tableaux that played
// inside a 1px stroked rectangle on flat black — a wireframe rather than a
// window, with no room behind it, nothing clipped to it, and sixteen of its
// forty seconds spent on a picture that had not changed since the caption
// before.
//
// ------------------------------------------------------------------ the shape
//
// The script, the shot lengths, the camera boxes and the cue sheet are all data
// and live in src/data/jokes.js as INTRO_SHOTS. This file is the projector: it
// owns the clock, the room, the actors and the music cut, and knows nothing
// about which line is over which picture.
//
// -------------------------------------------------------------- the room is THE
//                                                                  room
// Every number here comes from HUB_ROOM and every painter from the hub's own,
// because thirty seconds after watching this arcade go dark the player walks
// into it. Same floor, same wall band, same machines at the same height, and
// each cabinet rolling its own real attract demo through cabinetScreenArt. A
// prologue set in a room the player then fails to recognise is worse than no
// room at all, and the way that failure happens is somebody retyping 212.
//
// ----------------------------------------------------------- everything is f(t)
//
// No actor in this film accumulates. The camera, the copter, the door, the eight
// arrivals and the six dying screens are all functions of the film clock alone,
// which is why seek(t) can drop the projector at any moment and get the right
// frame — the same contract CabinetDive.seek keeps, and what the screens gallery
// and the video render depend on. The old film seeded its static with
// Math.random() at enter() and could not be shot twice the same way.
//
// Particles are the one exception and are therefore garnish, never structure:
// they integrate across frames, so seek() clears them and a scrubbed frame is
// simply a frame without sparks. Nothing the story needs is ever a particle.
import { W, H, isPhonePortraitPresentation, presentationFrame, shake, setSceneGlow, setOverlayMerge } from '../engine/renderer.js';
import { Input } from '../engine/input.js';
import { Audio } from '../engine/audio.js';
import { clamp01, lerp, EASES } from '../engine/ease.js';
import { fitProse, drawCascade } from '../engine/prose.js';
import { drawTextCenteredForPresentation as drawTextCentered } from '../engine/sprites.js';
import { INTRO_FILM } from '../data/jokes.js';
import { CABINETS, TITLE_THEME, SURGE_THEME } from '../data/cabinets.js';
import {
  cabinetPalette, drawCabinetShell, drawCabinetScreen, drawScreenSweep,
  drawDeadScreen, deadScreenBurst, deadScreenArt, cabinetScreenRect, drawDoor, DOOR_PALETTES,
} from '../sprites/arcade.js';
import { drawWallBase, drawPoster } from '../sprites/backwall.js';
import {
  HUB_ROOM, drawFoodCourtFloor, drawCeilingLight, lightFlicker, LIGHT_W,
  SOCKET_TOP, cabinetScreenArt, cabinetScreenGeometry, posterLook, REFLECT_SOLE_DROP,
} from './hub/index.js';
import { openingEdge } from './hub/door-walk.js';
import {
  makeCabinetDive, DIVE_PHASES, DIVE_DURATION, DIVE_LEAP_AT, leapVoiceFor,
} from './hub/cabinet-dive.js';
import { PROP_PAINTERS, eggshellCopterArt, STRIP_PLUGGED, powerStripCordAt } from '../sprites/props.js';
import { drawMcgfnPlate } from '../sprites/mcgfn.js';
import { drawToon } from '../sprites/toons.js';
import { drawSoftContactShadow } from '../engine/shadows.js';
import {
  beginFloorReflectionBand, addFloorReflection, endFloorReflectionBand,
} from '../engine/reflections.js';
import { spawnPuff, burst, updateParticles, drawParticles, clearParticles } from '../engine/particles.js';

// ---------------------------------------------------------------------------
// THE ROOM
// ---------------------------------------------------------------------------

const FLOOR_Y = HUB_ROOM.floorY;                   // 212
const WALL_Y0 = HUB_ROOM.wallY0, WALL_Y1 = HUB_ROOM.wallY1;
const CAB_W = HUB_ROOM.cabW, CAB_H = HUB_ROOM.cabH, CAB_Y = HUB_ROOM.cabY;
const BAY = HUB_ROOM.bayPitch;                     // 88

// Where the ceiling tubes hang. Its own number rather than the hub's, because
// the hub derives its ceiling from a fixed camera zoom ("the first world y that
// is on screen") and this camera moves — a derived ceiling would slide up and
// down the wall as the film pushed in.
const CEIL_Y = 74;

// Six machines on the hub's own pitch, and the first one far enough right that
// the service door has a wall to stand in.
// The cast owns the left runway. The first machine starts well after their last
// mark, and the terminal is a separate electrical destination beyond the row.
const CAB_CX = [0, 1, 2, 3, 4, 5].map((i) => 940 + i * BAY);   // 940 … 1380

// Which machine he goes into. A fact about the room — the first PLUMBER PANIC,
// the one the game itself opens on — so it lives with the room rather than
// inside the dive that happens to use it.
const DIVE_CAB = 0;

const DOOR_CX = 62;
const DOOR_X = DOOR_CX - HUB_ROOM.doorW / 2;
// The leaf and the wall opening, in the proportions the hub uses, so the clip
// that hides an arriving hero lands on the same edge the painter draws.
const DOOR_GEOM = {
  lx: DOOR_X + HUB_ROOM.doorW * 0.165, lw: HUB_ROOM.doorW * 0.67,
  wx: DOOR_X + HUB_ROOM.doorW * 0.12, ww: HUB_ROOM.doorW * 0.76,
};

// The strip end. The socket is the hub's socket — "EIGHT HEROES. ONE SOCKET" is
// that object — and the master strip lies on the floor directly under it, so the
// shot that ends the arcade and the shot the whole game is walking towards are
// the same piece of wall.
// Kept well apart along the wall, which they were not at first: stacked, the
// former socket's 44x62 slab of flat yellow sat directly behind the strip and the whole
// climax was a tilt down into a rectangle. Three separate objects reading left to
// right — the bar he throws, the appliance that is the joke, the socket the game
// is walking towards — is also the order the final wide pans across.
const SOCKET_CX = 1860;
// The intro uses the finalized Type B / coral terminal study. It is deliberately
// wider than the hub's compact socket so the dedicated terminal insert has a
// physical destination: one white receptacle, one quiet 4x4 bank, and a small service
// mark that makes it feel like arcade infrastructure rather than a UI tile.
// The wall terminal is a destination, not a second cabinet. Keep it roughly
// half the cabinet height so the wide pull reads as a separate socket
// destination rather than one more oversized machine in the room.
// Sized against the MAN, not against the wall. At 80x52 beside a 46-unit copter
// the terminal was the biggest object in its own shot and Eggshell read as a
// toy hovering next to it — which is backwards, because the plate is the thing
// he is doing something TO.
// HIS WIDTH, NOT WIDER. Peter, 20 Sep, on the switch bake-off: "for its scale it
// should be roughly his dimensions overall." At 58x38 the plate was wider than
// his tub and read as the bigger of the two; 49x32 (0.85) is the tub's width.
const INTRO_SOCKET_W = 49, INTRO_SOCKET_H = 32;
// STRETCHED. At 56 the switch and its pilot lamp shared the left sixth with the
// first socket; at 72 the whole left quarter is switch bay, which is what the
// object the climax lands on needed. The painter lays out in fractions, so this
// is the only number that moves.
const STRIP_W = 84, STRIP_H = 10;
// CLOSER TO THE PLATE. At 1700 the bar and the terminal were 93 units apart and
// the shot had to stay wide enough to hold both, which capped how far the push
// could go on the film's most important object. Moved under the villain's own
// hover mark, it also means he drops straight down onto the rocker instead of
// sliding sideways to find it.
const STRIP_CX = 1768;
const STRIP_X = STRIP_CX - STRIP_W / 2;            // 1726 … 1810
const STRIP_Y = FLOOR_Y - STRIP_H;                 // lying on the floor
// The rocker sits at the left end of the bar — see PROP_PAINTERS.powerStrip.
const ROCKER_X = STRIP_X + STRIP_W * 0.0885;
const ROCKER_Y = STRIP_Y + STRIP_H * 0.5;



// The film's own extent, used to clamp the wall-bay and light loops. Drawing a
// bay per 130 units across an unbounded room is how a wide shot starts costing
// what a whole hub costs.
// The room has to be bigger than the widest shot, not bigger than the action.
// At -40 the door beat's own frame reached past the left end of the wall and
// put a slab of page black beside the doorway — the floor, the skirting and the
// wall all simply stopped. The runway starts at the door, but the ROOM starts
// well before it, the way a room does.
const ROOM_X0 = -620, ROOM_X1 = 2000;

// Door order. The first three out are the ones that end up PAST the machine:
// they are nearest him when he jumps, ease down while he is in the air, and
// sprint past once he is in (Clara stops nearest the glass, Grumpos on the far
// right). The last four out pull up short of it (Rusty beside the glass, Kiko
// on the far left). The marks are on FOLLOWER_PATHS by this index, so the
// line-up is set HERE.
const HERO_IDS = ['lorenzo', 'clara', 'ramon', 'grumpos', 'rusty', 'fernwick', 'b33p', 'kiko'];
// The hub's own NPC/player height, not a number of our own. The dive solves its
// arc, its crossing height and its whole perspective budget off heroH, so a film
// hero even two units short of the hub's makes the leap into the glass a
// different animation from the one the player triggers.
const HERO_H = 46;
// The entrance runway stays well clear of the cabinet bank. These are the
// marks the cast starts from before the run gathers around the machine; they
// are deliberately left of the first cabinet rather than shoulder-to-shoulder
// with it.
const HERO_X0 = 64, HERO_PITCH = 34;
const heroX = (i) => HERO_X0 + i * HERO_PITCH;     // 64 … 302

// ---------------------------------------------------------------------------
// THE CLOCK
// ---------------------------------------------------------------------------

const SHOTS = INTRO_FILM.shots;
const CAPTIONS = INTRO_FILM.captions;
const captionAt = (t) => CAPTIONS.find((c) => !c.withPrompt && t >= c.at && t < c.t1) || null;
const PROMPT_CAPTION = CAPTIONS.find((c) => c.withPrompt) || null;
const LAST = SHOTS[SHOTS.length - 1];
const ACTION_ONLY_PREVIEW = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search || '').get('introAction') === '1';

function shotAt(t) {
  if (!(t > 0)) return SHOTS[0];
  for (let i = 0; i < SHOTS.length; i++) if (t < SHOTS[i].t1) return SHOTS[i];
  return LAST;
}
const shotById = (id) => SHOTS.find((s) => s.id === id);

const T_ARRIVAL = shotById('arrival');
const T_THREAT = shotById('threat');
const T_DARK = shotById('dark');
const T_SOCKET = shotById('socket');
const T_DOORS = shotById('doors');
const T_ROLLCALL = shotById('rollcall');
const T_LINEUP = shotById('lineup');
const T_DIVE = shotById('dive');
const T_WIDE = shotById('wide');
const CABINET_CUT_AT = INTRO_FILM.cabinetCutAt ?? (T_DARK.t0 + 0.1);

// ------------------------------------------------------------- THE BAR GRID
//
// THE SURGE's downbeat is the door cut, and from there every milestone in the
// hero section is a bar or a beat rather than a number somebody liked. Taken
// off the `doors` shot's own length rather than restated from the tempo, so the
// two cannot drift: retime the shot table and the launch, the reveal, the
// takeoff and the gather all move with it.
//
// This is what the old cut was missing. The action was timed — it was simply
// timed to nothing, so the takeoff landed 18.6 beats after the music started
// and every hit in the sequence sat just off the thing it should have snapped
// to. None of that is audible as "wrong"; it just never feels choreographed.
const BAR = T_DOORS.sec;
const BEAT = BAR / 4;
const SIXTEENTH = BEAT / 4;

const DOOR_OPEN_SEC = 0.42;
const LORENZO_REVEAL_T = T_DOORS.t0 + DOOR_OPEN_SEC;
// The leaves finish their split, and he is already standing there. He holds the
// budget-cut line for the rest of the bar and launches on the next downbeat —
// a real hold, not a walk-in that happens to stop under a caption.
const LORENZO_RUN_T = T_ROLLCALL.t0;                 // bar 2
const LORENZO_IDLE_SEC = LORENZO_RUN_T - LORENZO_REVEAL_T;
const LORENZO_IDLE_T = LORENZO_RUN_T;
// One sixteenth behind him, then one per sixteenth after that. The stagger is
// small on purpose: he goes, and they go after him. Their separation on screen
// comes from where they start in the corridor, not from waiting their turn.
const GROUP_RUN_T = LORENZO_RUN_T + SIXTEENTH;
// Thirty-seconds, not sixteenths. The door is a bottleneck they are pouring
// through, not a queue they are taking turns in: at half the pitch the whole
// seven are out in a third of a second and the camera can start moving while
// the run is still gathering, which is most of what makes it feel quick.
const FOLLOWER_STAGGER = SIXTEENTH / 2;
const SCREEN_REVEAL_AT = T_LINEUP.t0;                // bar 4 — the target arrives
const DIVE_AT = T_DIVE.t0;                           // bar 5 — takeoff, on the downbeat
const DIVE_BREAK_T0 = SCREEN_REVEAL_AT;              // from here he is visibly the leader
// One beat across one bay = 194 units a second, which is the speed he arrives
// at. The old beat-and-a-half covered the same gap at two thirds of his running
// pace, so he visibly slowed down the instant his feet left the floor.
// THE LEAP IS THE HUB'S LEAP, NOT A VERSION OF IT.
//
// This used to be a bespoke `introEntry` adapter: it called into the shared
// phases and then overwrote x, feet, depth, height, pose, bulge, flash, flare,
// shatter and the whole deck on top of them. Which is to say it borrowed the
// clock and re-animated everything the clock was for — so the film's dive had
// none of the real one's timing, none of its glass flash, and a flat trajectory
// where the hub has an arc.
//
// It ran from the shared object's own start instead. `startAt: DIVE_LEAP_AT`
// skips the windup — he is arriving at a sprint, and a crouch after you have
// left the floor plays the beat backwards — and everything from the leap on is
// the animation the player triggers when they pick a cabinet themselves.
//
// The price is the one the old adapter was avoiding: the shared leap moves him
// from the CABINET's x, not from a distant mark, so he has to already be there.
// That is why his run now ends on the machine rather than a bay short of it.
const PHASE_AT = (() => {
  const out = {}; let t = 0;
  for (const p of DIVE_PHASES) { out[p.name] = { t0: t, t1: t + p.dur, dur: p.dur }; t += p.dur; }
  return out;
})();
// Everything below is relative to the frame the film starts the dive on.
const DIVE_REL = (name) => PHASE_AT[name].t0 - DIVE_LEAP_AT;
const SCREEN_VISIBLE_AT = DIVE_AT + DIVE_REL('cross');
const DIVE_END = DIVE_AT + (DIVE_DURATION - DIVE_LEAP_AT);

// THE GATHER. One event, not seven arrivals: they all stop chasing on the frame
// the glass takes him, carry their speed for another beat and a half, then brake
// onto their marks together on the 'and' of two. The reactions stagger; the
// arrivals do not, because seven people wandering into position one at a time
// reads as staging and a pack pulling up together reads as a reaction.
const GATHER_CRUISE = BEAT * 0.5;
// A beat sooner than it was. The marks are fixed by the ending, so the only
// way to have the pack nearer the leader when he jumps is to give them less
// road to cover AFTER it — they run harder and brake later, and the pile-up at
// the glass lands on the 'two' of bar six instead of the 'three'.
const GATHER_ARRIVE = T_WIDE.t0 + BEAT;
const GATHER_BRAKE = GATHER_ARRIVE - SCREEN_VISIBLE_AT - GATHER_CRUISE;
// How long the pull-out takes once they are all there, leaving the rest of the
// film as a held wide.
const PULL_OUT_SEC = BEAT * 6;

// Where he leaves the ground: the machine's own mark. The shared leap carries
// him from the cabinet's x through the glass, exactly as it does when the player
// presses JUMP at a station, so the run has to deliver him there rather than a
// bay short of it.
const LORENZO_LAUNCH_X = CAB_CX[DIVE_CAB];

// ---------------------------------------------------------------------------
// THE PICTURE GATE
// ---------------------------------------------------------------------------

// The picture, and the band of black under it the caption lives in.
//
// Recomputed per frame and never at module scope. The old film wrote
// `const INTRO_TEXT_BOTTOM = H - 28` at the top of menus.js, and H is a LIVE
// BINDING: that number was whatever the frame happened to be when the module
// first loaded, and never moved again.
// What the close prompt needs under the caption: its own ink is about seven
// units at scale 1, and the rest is the margin that keeps it off the edge.
const PROMPT_BAND = 14;

function introGate() {
  const frame = presentationFrame();
  if (!isPhonePortraitPresentation()) {
    // Full bleed. There is no frame to draw and nothing to inset into: a picture
    // that runs to the edges of the screen does not need a window drawn around
    // it, and the old 1px stroke on the same flat #0b0b14 as the page read as a
    // wireframe rather than as a frame.
    //
    // The close prompt gets its own reserved band here, the way portrait has
    // always given it one. Hung off capBottom instead, it was drawn at 268 on a
    // 270-tall frame and all but a pixel of it was under the bottom edge — and
    // a landscape phone has a home indicator down there too, which is why this
    // reads safeRect rather than H.
    const promptY = Math.min(H, frame.safeRect.bottom) - PROMPT_BAND;
    return { x: 0, y: 0, w: W, h: 186, capTop: 192, capBottom: promptY - 6, promptY, portrait: false };
  }
  const safe = frame.safeRect;
  const css = (n) => n / frame.scale;
  const x = safe.left + css(10);
  const w = Math.max(160, safe.width - css(20));
  // 3:2, and that is a ceiling rather than a preference.
  //
  // Two failures bracket this number, and the second one is counter-intuitive.
  // At the landscape 2.58:1 the picture is a strip with the whole phone black
  // beneath it. But making the picture TALLER makes it worse, not better: the
  // camera solves its zoom from the shot's WIDTH, so gate height buys vertical
  // world coverage at a fixed rate — coverage = box.w x (gate.h / gate.w). At
  // 1.12 the closing pull covered six hundred and seventy world units of a room
  // that is a hundred and seventy tall, and the arcade sat in the bottom third
  // of its own ceiling.
  //
  // So the aspect is capped here and the wide shots carry narrower `portrait`
  // boxes instead. A phone sees less of the room at once; it does not see the
  // same room floating in a void.
  const h = Math.min(w * 0.68, safe.height * 0.42);
  // The caption gets a band, not the whole remainder. Handing it everything left
  // over let fitProse centre two lines in eleven hundred units of nothing, so
  // the text floated in the middle of the phone with the picture stranded at the
  // top. Sized for four lines at the largest step and no more.
  const capH = Math.min(css(112), safe.height * 0.17);
  const gap = css(16);
  // The whole group sits high rather than centred: the close prompt lives under
  // it, and so does the home indicator on every phone this ships to.
  const y = safe.top + Math.max(css(14), (safe.height - (h + gap + capH)) * 0.40);
  const capBottom = y + h + gap + capH;
  return {
    x, y, w, h,
    capTop: y + h + gap,
    capBottom,
    // Under the caption, but never under the home indicator.
    promptY: Math.min(capBottom + 12, safe.bottom - PROMPT_BAND),
    portrait: true,
  };
}

// ---------------------------------------------------------------------------
// THE CAMERA
// ---------------------------------------------------------------------------

// WHAT THE SHOT WANTS IN FRAME, rather than how far to zoom.
//
// A zoom number is a landscape number: the 2.4 that fills a 480x186 letterbox
// with one machine fills a phone's window with two thirds of one, so a shot that
// names a zoom is a shot that has to be authored twice. Naming the rectangle
// makes portrait nearly free — the gate changes shape, the shot does not, and a
// tall window simply gets the same width of arcade with more ceiling and floor.
function fitBox(box, gate) {
  const byW = box.w > 0 ? gate.w / box.w : Infinity;
  const byH = box.h > 0 ? gate.h / box.h : Infinity;
  const zoom = Math.min(byW, byH);
  return { x: box.cx, y: box.cy, zoom: Number.isFinite(zoom) && zoom > 0 ? zoom : 1 };
}

// HOW MUCH NOTHING THE PICTURE IS ALLOWED TO CONTAIN.
//
// The camera solves its zoom from the shot's WIDTH, so the taller the gate the
// more vertical room comes along for free — and a phone's gate is tall enough
// that a three-hundred-unit shot covers three hundred units of height over a
// room that is a hundred and seventy tall. Uncorrected, the arcade sinks into
// the middle of the frame with a third of the picture spent on empty floor.
//
// So the frame is nudged, never rescaled: if it has slid too far below the floor
// or too far above the ceiling it is pushed back, and if it is wide enough to
// want both at once the floor wins, because the floor is where everyone stands.
// Close-ups never reach these limits and are left exactly where they were
// authored.
const FLOOR_SLACK = 34, CEIL_SLACK = 54;

// THE FLOOR DOES NOT MOVE WHEN THE ZOOM DOES.
//
// The hub pins its ground line to a fixed screen row at every zoom, and for the
// same reason: the floor is the one thing every figure in the picture is
// standing on, so if it drifts up and down the frame as the camera pushes in,
// the whole room appears to rise and settle underneath people who are simply
// running. Authoring `cy` per shot could not avoid it — the vertical coverage a
// box gets is a function of its WIDTH, so every change of width moved the floor.
//
// So `cy` is solved from the zoom instead of stated: whatever magnification the
// shot ends up at, the floor lands on the same fraction of the picture. Only
// shots that are actually about the floor use this; the lock-off on Eggshell's
// face is eighty units of nothing but face and would be dragged down to the
// skirting by it.
// UP FROM BLACK. The film cut straight from the difficulty screen to a fully
// lit arcade, which gives the eye nothing to arrive on — and the first shot is
// the one that has to establish a whole room. Over the picture only: the first
// caption starts inside this window and does its own fade.
const FADE_IN_SEC = 1.20;

const FLOOR_PIN = 0.84;
function pinFloor(cam, gate) {
  return { ...cam, y: FLOOR_Y - gate.h * (FLOOR_PIN - 0.5) / cam.zoom };
}
function frameRoom(cam, gate) {
  const halfH = gate.h / (2 * cam.zoom);
  let y = cam.y;
  const bottom = FLOOR_Y + FLOOR_SLACK, top = CEIL_Y - CEIL_SLACK;
  if (y + halfH > bottom) y = bottom - halfH;
  if (y - halfH < top) y = Math.min(top + halfH, bottom - halfH);
  return y === cam.y ? cam : { ...cam, y };
}

// FROM THE DOOR TO THE LAST FRAME, ONE CAMERA — AND IT IS WELDED TO HIM.
//
// The old version was a five-point keyframe ladder, and it is worth recording
// exactly how it failed, because the numbers looked reasonable.
//
// Its centre travelled 180 world units in 7.6 seconds. Lorenzo averaged 43 and
// then 85. So the BACKGROUND scrolled at 24 units a second: at the wall pitch
// that is one bay crossing the frame every five seconds. Nothing in the picture
// was moving quickly, so nothing read as quick — the heroes simply drifted
// rightwards across a wall that was almost still, and the frame widened by 20%
// across the whole run, which is invisible as a zoom. The sequence was not slow.
// It was static, at speed.
//
// A side-scroller reads speed from what crosses the frame edges. So the camera
// takes its x from the runner himself, and the room streams past at exactly the
// pace he is running — 74 units a second off the mark, 125 into the jump, with a
// poster every bay and a tube in every gap to measure it against.
//
// The LEAN is the other half. The camera leads him in proportion to his speed,
// the way an operator does: standing still he sits comfortably right of centre,
// and by the time he is flat out the frame has slid forward ahead of him, which
// is both what makes the sprint feel like a sprint and what brings the target
// cabinet over the right edge a full bar before he leaves the ground.
const HERO_CAM = {
  // Hold a wider doorway composition until the ensemble has entered. The floor
  // is still pinned, but the extra room lets the reveal read as a group arrival
  // instead of a close-up that starts panning before the followers are visible.
  // lockW is the frame he jumps out of and the flight plays in: tight on the
  // machine, centred, still. finalW is only ever reached by zooming out of it.
  // finalW hugs the group: the marks sit 30 apart either side of the machine,
  // so the closing frame is the seven and the cabinet and little else.
  landscape: { doorCx: 129, doorW: 320, runW: 400, lockW: 330, finalW: 350 },
  // Portrait buys vertical coverage at a fixed rate off the box WIDTH, so a
  // landscape-sized box here fills the top third of the phone with ceiling void.
  // The tall frame therefore shows a narrower slice and lets the trailing hero
  // sit at the edge, which the action plan explicitly allows: Lorenzo and the
  // machine are the subject, the back of the pack is not.
  portrait: { doorCx: 117, doorW: 260, runW: 340, lockW: 290, finalW: 350 },
};
// How far right of centre the runner sits, as a fraction of the box. It is a
// QUARTER rather than an eighth because the picture is not just him: seven
// people are chasing him down a four-hundred-unit runway, and a frame centred
// on the leader is a frame with the chase outside it on the left.
const CAM_LEAD = 0.26;
// How many seconds of his own travel the camera looks ahead of him. This is the
// number that decides when the machine appears; it is not a taste dial.
// ...and the speed lean is small for the same reason. At 1.36 it read exactly
// as Peter described it: the camera ran off up the room ahead of Lorenzo and
// left all but a couple of the pack behind the left edge. The target cabinet
// still arrives before the jump, but it arrives because the frame is WIDE, not
// because the frame has gone on ahead without everybody.
const CAM_LOOK = 0.25;
const CAM_DOOR_CY = 170, CAM_RUN_CY = 158;

// Who the camera is on, from whichever thing owns him at t: the doorway, his own
// run, or the dive's arc once he has left the ground. One subject, one function.
//
// Safe to ask before the frame is drawn: draw() solves the camera first and then
// re-seeks the dive to the same t, so the object is never left posed for a time
// the picture is not at.
function subjectXAt(t) {
  if (t < DIVE_AT) return heroBasePosAt(t, 0).x;
  if (t < DIVE_END) {
    const d = diveAt(t);
    if (d) return d.x;
  }
  return CAB_CX[DIVE_CAB];
}

// THE FRAME IS ON THE MACHINE BEFORE HE IS.
//
// The old ending welded the camera to Lorenzo right up to the takeoff, so at the
// moment he jumped the cabinet was at 76% of a wide frame — and then spent the
// next two and a half seconds sliding to centre while the zoom opened around it.
// That drift of the machine across the screen is what read as the shot "easing
// right to left" and never landing on the thing everyone had been running at.
//
// So the last bar of the run is a HANDOVER. From the reveal, the camera stops
// following him and closes on the cabinet instead: tightening, and centring it,
// both finished on the frame his feet leave the floor. He runs into a frame that
// has already arrived. From the takeoff on, x never changes again — the flight
// plays on a still frame, and the pull-back afterwards is a pure zoom on a
// centred machine, which is the only kind of move that cannot read as a drift.
// Two beats, not the whole bar. Closing from the reveal put the leader alone in
// a shrinking frame for most of a second while the pack was still a bay back;
// starting on the 'three' keeps them in shot until the machine takes over.
const CAM_LOCK_START = DIVE_AT - BEAT * 2;
const CAM_LOCK_X = CAB_CX[DIVE_CAB];

// THE LEAN COMES OFF BEFORE HE JUMPS, not as he lands.
//
// The look-ahead is what brings the machine into frame on bar four, and it has
// done that job by then. Carried into the takeoff it keeps pushing the frame up
// the room, so the hero leaps from the middle of his own shot with empty floor
// ahead of him. Faded out across the last bar he runs up to the right of frame
// instead, and jumps off the end of the screen — which is the read, and which
// costs the reveal nothing because the fade starts on the frame the reveal
// happens.
const camLookAt = (t) => 1 - EASES.smooth(
  clamp01((t - SCREEN_REVEAL_AT) / Math.max(0.001, DIVE_AT - SCREEN_REVEAL_AT)));

// THE DOOR SITS LEFT, AND THE CAMERA THEN HAS TO EARN HIM BACK.
//
// The door beat is its own composition — the doorway well left of centre with
// the empty runway open to the right of it, which is the shot: that is where
// they are all about to go. The weld's own centre at the moment he launches is
// further LEFT than that, so the two cannot simply be cut between; authored as
// separate framings the camera slid backwards on his first running step and the
// doorway drifted rightwards before the run dragged it back.
//
// The max() below resolves it in the right direction. The frame HOLDS on the
// door while they pour out and open a gap, and only starts travelling once the
// weld has caught up to it — so the move reads as the camera chasing them down
// rather than as a pan that happened to be leaving anyway. A camera in a chase
// may track or hold. It may never reverse.
const doorCamCx = (k) => k.doorCx;
// Let the last follower cross before the camera begins the runway move. This
// is the reveal beat: the cast is on screen together, then the pan earns its
// speed as they leave the doorway for the cabinet.
const HERO_PAN_START_T = GROUP_RUN_T + FOLLOWER_STAGGER * (HERO_IDS.length - 1);

function heroCameraAt(t, gate) {
  const k = gate.portrait ? HERO_CAM.portrait : HERO_CAM.landscape;
  // Hold until the full cast has entered. Nothing to track yet, and a camera
  // that creeps under a standing leader hides the reveal the shot is for.
  if (t <= HERO_PAN_START_T) {
    return pinFloor(fitBox({ cx: doorCamCx(k), cy: CAM_DOOR_CY, w: k.doorW }, gate), gate);
  }
  // THE CHASE, then THE HANDOVER — one expression, so there is no seam.
  //
  // Out to runW by the reveal, so the pack is on screen while it is pouring
  // out; then, over the last bar, in to lockW and across to the machine. Both
  // curves finish on the takeoff frame, so he leaps out of a frame that has
  // already stopped.
  if (t <= DIVE_AT) {
    const runU = EASES.smoother(clamp01((t - HERO_PAN_START_T) / (CAM_LOCK_START - HERO_PAN_START_T)));
    const lockU = EASES.smoother(clamp01((t - CAM_LOCK_START) / (DIVE_AT - CAM_LOCK_START)));
    const w = lerp(lerp(k.doorW, k.runW, runU), k.lockW, lockU);
    const welded = subjectXAt(t) - CAM_LEAD * w + CAM_LOOK * camLookAt(t) * heroSpeedAt(t, 0);
    // The weld cannot simply switch on: on his first running frame the door box
    // is on the doorway and the welded box is already a hundred units up the
    // room, and the difference is a cut. So it takes hold over his first beat —
    // the camera picks him up rather than snapping to him.
    const grab = EASES.smoother(clamp01((t - HERO_PAN_START_T) / BEAT));
    // Never backwards: the weld starts from the door's own centre, and the
    // max() is the guard that keeps it true if the boxes are ever retuned.
    const chase = Math.max(doorCamCx(k), lerp(doorCamCx(k), welded, grab));
    return pinFloor(fitBox({
      // The lock target is at or ahead of anything the chase reaches, so
      // blending toward it can only move the frame forward.
      cx: lerp(chase, CAM_LOCK_X, lockU),
      cy: 0,
      w,
    }, gate), gate);
  }
  // FROM THE TAKEOFF, X IS FINISHED. The flight, the glass and the gather all
  // play on a frame that is not moving, and the only thing that happens
  // afterwards is a pull-back — a pure zoom on a centred machine, begun once he
  // is through the glass and run on the six-beat ease.
  const zoomU = EASES.smoother(clamp01((t - SCREEN_VISIBLE_AT) / PULL_OUT_SEC));
  return pinFloor(fitBox({
    cx: CAM_LOCK_X,
    cy: 0,
    w: lerp(k.lockW, k.finalW, zoomU),
  }, gate), gate);
}

function cameraAt(t, gate) {
  if (t >= T_DOORS.t0) return heroCameraAt(t, gate);
  const shot = shotAt(t);
  const spec = (gate.portrait && shot.portrait) || shot.cam;
  const place = shot.pinFloor ? pinFloor : frameRoom;
  if (!spec.to) return place(fitBox(spec.from, gate), gate);
  // A missing curve is a slightly wrong move; a thrown error is a black screen.
  const ease = EASES[spec.ease] || EASES.smooth;
  const u = ease((t - shot.t0) / shot.sec);
  return place(fitBox({
    cx: lerp(spec.from.cx, spec.to.cx, u),
    cy: lerp(spec.from.cy, spec.to.cy, u),
    w: lerp(spec.from.w, spec.to.w, u),
    h: spec.from.h ? lerp(spec.from.h, spec.to.h, u) : 0,
  }, gate), gate);
}

// ---------------------------------------------------------------------------
// THE ACTORS — every one a pure function of film time
// ---------------------------------------------------------------------------

// How lit the room is. NOT a realism dial: the power going off is no reason to
// stop the audience seeing the film, and the three shots after the cut are the
// ones with the whole cast in them. So the arcade drops to a moody quarter and
// holds there, lit by dead-screen static and whatever comes through the door.
function roomLitAt(t) {
  const off = (t - INTRO_FILM.cutAt) / 0.9;
  if (off <= 0) return 1;
  return lerp(1, 0.26, clamp01(off));
}

// Each machine dies 0.12s after the one on its left, starting 0.1s into the
// dark. The stagger is the shot: six screens going at once is a power cut, six
// going left to right is something travelling down a cord.
const CAB_DEATH_0 = 0.1, CAB_DEATH_STEP = 0.12, CAB_FLASH = 0.14;
function cabinetDeathAt(t, i) {
  const since = (t - CABINET_CUT_AT) - (CAB_DEATH_0 + i * CAB_DEATH_STEP);
  if (since < 0) return { dead: false, flash: 0, since: 0 };
  return { dead: true, flash: Math.max(0, 1 - since / CAB_FLASH), since };
}
const stripLiveAt = (t) => t < INTRO_FILM.cutAt;
// The terminal is fully live when the strip is thrown. Its sixteen cells then
// empty from the last cell back to the first, matching the left-to-right
// cabinet brownout without pretending the socket is a magic light switch. The
// dedicated insert cuts to the still-full terminal, then gives the whole bank
// its own readable last-to-first emptying beat.
// The terminal is a rapid reverse cascade, not a second static tableau. Give
// the sixteen removals just over half a second so the eye and the new per-plug
// clicks read one decisive unplugging gesture before the empty hold.
const SOCKET_EMPTY_SEC = 0.55;
function introSocketProgressAt(t) {
  const from = INTRO_FILM.socketAt;
  if (t < from) return 1;
  if (t >= T_SOCKET.t1) return 0;
  return 1 - clamp01((t - from) / SOCKET_EMPTY_SEC);
}

// THE VILLAIN'S FLIGHT, in three legs across three shots: in from the right over
// the marquees, a hover while he says his line, then a descent onto the strip.
//
// Authored against the shots' real lengths rather than a constant. The old path
// divided by a hardcoded 12 seconds inside a panel that lasted 9.5, so the exit
// sweep it carefully described was unreachable — he simply cut away mid-hover.
const COPTER_SIZE = 54;
const COPTER_HOVER = { x: 1736, y: 114 };
function copterAt(t) {
  // Keep Eggshell on screen through the throw and its follow-through: he is
  // still sitting on the bar while the bank empties, so the cause is never
  // replaced by a magical off-screen trigger.
  if (t < T_ARRIVAL.t0 || t >= T_SOCKET.t1) return null;
  // Leg 1: in from off-frame right, arriving on his mark as the shot ends.
  if (t < T_ARRIVAL.t1) {
    // easeOut, and from close in. On a symmetric curve from far off-frame he
    // spent two thirds of his own entrance outside the picture — the camera is
    // pushing in towards his mark at the same time, so the two moves subtract.
    // Decelerating onto the mark from just outside the frame puts him on screen
    // almost immediately and lets him settle rather than arrive and stop.
    const u = EASES.easeOut((t - T_ARRIVAL.t0) / T_ARRIVAL.sec);
    return {
      x: lerp(1838, COPTER_HOVER.x, u),
      y: lerp(104, COPTER_HOVER.y, u),
      size: COPTER_SIZE, seat: 0, drift: 1, tilt: 0,
    };
  }
  // Leg 2: the hover. Only the idle drift, which is added by the painter.
  if (t < SEAT_DROP_T) return { ...COPTER_HOVER, size: COPTER_SIZE, seat: 0, drift: 1, tilt: 0 };
  // Leg 3: HE SITS ON IT. No arm, no claw: he drops onto the switch end of the
  // bar and the tub's own weight throws the rocker. Option F of the switch
  // bake-off (20 Sep 2026) — the reach it replaced was a grey segment with a
  // pincer that read as a wire, a laser, a fishing line, anything but a man
  // doing something. The descent is an easeIn from a beat and a half into the
  // shot, so he hangs over the bar first and then commits, and the cut lands on
  // the frame the hull meets it.
  const k = EASES.easeIn(clamp01((t - SEAT_DROP_T) / (INTRO_FILM.cutAt - SEAT_DROP_T)));
  const since = t - INTRO_FILM.cutAt;
  if (since < 0) {
    return {
      x: lerp(COPTER_HOVER.x, SEAT_X, k),
      y: lerp(COPTER_HOVER.y, SEAT_Y, k),
      size: COPTER_SIZE, seat: k, drift: 1 - k, tilt: -0.05 * k,
    };
  }
  // THEN BACK UP. Peter, 20 Sep: "he needs to move back up once he's bonked
  // it." One small settle on the bar while the sparks fly, then he lifts off
  // again on an easeOut — quick off the bar, slowing into a hover above his
  // handiwork while the bank empties. The sway comes back with the height.
  const settle = clamp01(since / SEAT_SETTLE_SEC);
  const bounce = Math.exp(-settle * 4) * Math.sin(settle * 14) * 1.6;
  const lift = EASES.easeOut(clamp01((since - SEAT_HOLD_SEC) / LIFT_SEC));
  return {
    x: SEAT_X + LIFT_DX * lift,
    y: lerp(SEAT_Y + bounce, LIFT_Y, lift),
    size: COPTER_SIZE, seat: 1 - lift, drift: lift, tilt: -0.05 * (1 - lift),
  };
}
// Where he lands. The hull's bottom edge is Y(0.94) of the ape box drawn at
// (2,8) in the copter's 28-unit frame — props.js eggshellTub — so the seat
// puts that edge one unit into the bar's top face, over its switch end.
const COPTER_TUB_BOTTOM = 8 + 20 * 0.94;
// Dead over the rocker, derived from it rather than typed, so stretching the
// bar again cannot leave him sitting on the wrong part of it.
const SEAT_X = ROCKER_X;
const SEAT_Y = STRIP_Y + 1 - (COPTER_TUB_BOTTOM - 14) * (COPTER_SIZE / 28);
const SEAT_DROP_T = T_SOCKET.t0 + 1.4;
const SEAT_SETTLE_SEC = 0.55;
// The lift-off: a beat on the bar, then most of the drop back, a touch to the
// right so the rise is not the fall played in reverse.
const SEAT_HOLD_SEC = 0.3, LIFT_SEC = 0.9;
// 36 up, not the whole 64 he dropped: the shot's picture gate tops out around
// y 98 by then, and the full climb put his rotor on the edge of the frame.
const LIFT_Y = SEAT_Y - 36, LIFT_DX = 4;

// The service door. Its two leaves part from the middle on the downbeat and
// stay open: the arcade is dark and eight people are coming through it, and a
// door that tidies itself shut behind the first of them is a door doing the
// wrong job.
function doorOpenAt(t) {
  if (t < T_DOORS.t0) return 0;
  return EASES.easeOut((t - T_DOORS.t0) / DOOR_OPEN_SEC);
}

// MOTION IS AN INTEGRATED VELOCITY, NOT AN INTERPOLATED POSITION.
//
// This is the one thing the previous cut got structurally wrong, and it is worth
// stating plainly because it looks like a tuning problem and is not.
//
// Each runner was a cubic Hermite from x0 to x1 with an authored speed at each
// end. But a Hermite is a curve through POSITIONS: give it endpoint speeds that
// are both higher than the mean speed its span allows, and it has no choice but
// to sag in the middle to make the distance come out right. The followers ran
// ~410 units in ~7.6s — a mean of 54 — with endpoint speeds of 62 and 112, so
// they entered fast, visibly slowed halfway down the runway, and sped up again.
// On the one stretch of film whose entire job is acceleration.
//
// So author the VELOCITY and integrate it. For v(u) = v0 + (v1 - v0)·smoothstep(u)
// the integral is exact:
//
//     ∫₀^u smoothstep = u³ - u⁴/2
//
// which makes position a closed form, monotonic whenever v0 and v1 are positive,
// and C¹ at every join — which the camera needs, because it is welded to this.
// The distance now falls OUT of the speeds instead of arguing with them.
function rampPosition(x0, v0, v1, dur, u) {
  const p = clamp01(u);
  return x0 + dur * (v0 * p + (v1 - v0) * (p * p * p - (p * p * p * p) / 2));
}
const rampSpeed = (v0, v1, u) => v0 + (v1 - v0) * EASES.smooth(clamp01(u));
const rampDistance = (v0, v1, dur) => dur * (v0 + v1) / 2;

// COMING TO A STOP IS A SKID, NOT AN EASE. Constant deceleration: v(u) = v·(1-u),
// so position is x0 + dur·v·(u - u²/2) and the run covers exactly dur·v/2. The
// previous shape was 1 - smoothstep, which has the same distance but spends its
// last third creeping toward the mark — seven people drifting to a halt as if
// the floor had turned to treacle. A runner pulling up hard decelerates evenly
// and is simply stopped; the abrupt end IS the read.
function brakePosition(x0, v, dur, u) {
  const p = clamp01(u);
  return x0 + dur * v * (p - p * p / 2);
}
const brakeDistance = (v, dur) => dur * v / 2;

// HOW THE CAST ARRIVES.
//
// At full split the visible threshold is about x=75. Lorenzo is centred just
// inside the room so the reveal shows his complete idle silhouette rather than
// leaving the left half behind the door clip.
const DOOR_START_X = 68;
const GAIT_CYCLE = HERO_H * (40 / 58);
const gaitOf = (x, x0) => (((Math.abs(x - x0) / GAIT_CYCLE) % 1) + 1) % 1;

// Lorenzo: one hold, then ONE accelerating run to the launch point. No separate
// "break" leg — he was never in a line to break out of. His end speed is solved
// from the distance rather than guessed at, which is why the launch lands on the
// bay mark instead of near it.
const LORENZO_V0 = 125;
const LORENZO_RUN_DUR = DIVE_AT - LORENZO_RUN_T;
const LORENZO_V1 = 2 * (LORENZO_LAUNCH_X - DOOR_START_X) / LORENZO_RUN_DUR - LORENZO_V0;

// The seven. Each crosses the doorway a sixteenth after the one before, from its
// own place in the corridor, and accelerates from its first visible step to its
// own cruise. Every cruise is under Lorenzo's, so none of them can read as the
// leader before the jump — which is a property of the numbers here, not a clamp
// applied later.
//
// The speeds are what place the marks, and the split in the ladder is the
// staging: the front three are quick enough to carry past the machine and pull
// up on the far side, the back four pile in short of it. Nobody may stop within
// a hero's width of the glass, so the thing they were all chasing is the one
// clear object in the final frame.
// THEY DO NOT ALL RUN THE SAME RACE.
//
// v0 and v1 are both per hero now, and the ladder is deliberately not sorted:
// the fifth one out is the quickest of them and finishes second, the last one
// out finishes fourth, and the fourth finishes last. Four of them change places
// on the way. A field where nobody passes anybody is a field moving as one
// object, which is the thing the hops were added to break and the speeds were
// quietly putting back.
//
// Every one of them accelerates by the same 28% across the run — the variety is
// in the pace, not in who is trying.
// Deliberately uneven, in both the corridor places they start from and the
// speeds they settle at. Evenly spaced starts and an evenly stepped ladder gave
// evenly spaced marks, and seven figures at a constant pitch reads as a row of
// pegs rather than as a group of people who happened to stop where they stopped.
// THE FINISH. The first four out of the door pull up SHORT of the machine —
// they see him leave the floor and brake on that frame, each for their own
// length of skid. The last three are ON SCREEN for the jump: they have eased
// right down behind him and are jogging while he is in the air, and the moment
// the glass takes him they BURST, sprint past the screen one after another and
// skid to a stop on the far side. Nobody crosses in front of the picture while
// he is in flight; three people cross it, fast, in the second after.
//
// Every runner is a chain of velocity segments — ramp, ease, hold, burst — with
// one skid at the end, and the mark is the authored thing: v1 is solved so that
// the whole chain lands on it. Per-hero `react`, `skid`, `ease`, `burst` and
// `late` keep the seven from doing any of it in unison.
const NEAR_SKID = BEAT * 1.6;                          // a near runner's stop, before `skid` scales it
const FAR_BURST = BEAT;                                // how long the sprint past the glass builds
const FAR_SKID = BEAT * 1.4;                           // and the stop after it, before `skid` scales it
const FOLLOWER_PATHS = [
  // The far three, first out. ease: the fraction of their sprint they are down
  // to when he jumps — a walk, because they then have to hold it behind the
  // machine until his run inside the screen has finished, and nobody crosses
  // the picture while he is in it. go: how long after THAT each launches.
  // burst: the fraction of the sprint they go past at.
  { x0: 20, v0: 138, wave: 'far', mark: 1000, ease: 0.20, go: 0.00, burst: 1.15, skid: 1.00, late: 0.00 },
  { x0: 6, v0: 142, wave: 'far', mark: 1040, ease: 0.20, go: 0.22, burst: 1.22, skid: 0.85, late: 0.18 },
  { x0: -8, v0: 132, wave: 'far', mark: 1080, ease: 0.22, go: 0.42, burst: 1.30, skid: 1.15, late: 0.40 },
  // The near four, last out. react: how late they see him leave the floor.
  { x0: -18, v0: 132, wave: 'near', mark: 878, react: 0.00, skid: 1.00 },
  { x0: -30, v0: 128, wave: 'near', mark: 848, react: 0.09, skid: 0.80 },
  { x0: -44, v0: 122, wave: 'near', mark: 818, react: 0.04, skid: 1.30 },
  { x0: -58, v0: 114, wave: 'near', mark: 788, react: 0.13, skid: 1.75 },
].map((p, i, all) => {
  const t0 = GROUP_RUN_T + i * FOLLOWER_STAGGER;
  const near = p.wave === 'near';
  const rank = all.slice(0, i).filter((q) => q.wave === p.wave).length;
  // The chain, as [duration, speed-in factor, speed-out factor] on v1 — every
  // segment's distance is linear in v1, which is what makes the mark solvable.
  const brakeAt = near ? DIVE_AT + p.react : DIVE_END + p.go + FAR_BURST;
  const settle = near ? brakeAt + NEAR_SKID * p.skid : brakeAt + FAR_SKID * p.skid + p.late;
  const brake = settle - brakeAt;
  const chain = near
    ? [[brakeAt - t0, null, 1]]
    : [[SCREEN_REVEAL_AT - t0, null, 1], [DIVE_AT - SCREEN_REVEAL_AT, 1, p.ease],
      [DIVE_END + p.go - DIVE_AT, p.ease, p.ease], [FAR_BURST, p.ease, p.burst]];
  const vOut = near ? 1 : p.burst;                   // the factor the skid starts from
  // distance = v0·d0/2 + v1·( d0/2 + Σ d·(a+b)/2 + brake·vOut/2 )
  let coef = chain[0][0] / 2 + brake * vOut / 2;
  for (const [d, fa, fb] of chain.slice(1)) coef += d * (fa + fb) / 2;
  const v1 = (p.mark - p.x0 - chain[0][0] * p.v0 / 2) / coef;
  // Now lay the segments out in time with their speeds and start positions.
  const segs = [];
  let t = t0, x = p.x0;
  chain.forEach(([d, fa, fb], k) => {
    const vA = k === 0 ? p.v0 : v1 * fa, vB = v1 * fb;
    segs.push({ t0: t, t1: t + d, x0: x, vA, vB });
    x = rampPosition(x, vA, vB, d, 1); t += d;
  });
  const vBrake = v1 * vOut;
  return {
    ...p, t0, rank, v1, vBrake, segs, brakeAt, brake, settle,
    runEnd: segs[0].t1, atBrake: x,
    target: x + brakeDistance(vBrake, brake),
  };
});

function heroPosAt(t, i) {
  return heroBasePosAt(t, i);
}

function heroBasePosAt(t, i) {
  if (i === 0) {
    if (t < LORENZO_REVEAL_T) {
      return { x: DOOR_START_X, moving: false, ref: DOOR_START_X, since: 0 };
    }
    if (t < LORENZO_RUN_T) {
      return { x: DOOR_START_X, moving: false, ref: DOOR_START_X, since: t - LORENZO_REVEAL_T };
    }
    const u = (t - LORENZO_RUN_T) / LORENZO_RUN_DUR;
    return {
      x: rampPosition(DOOR_START_X, LORENZO_V0, LORENZO_V1, LORENZO_RUN_DUR, u),
      moving: t < DIVE_AT,
      ref: DOOR_START_X,
      since: t >= DIVE_AT ? t - DIVE_AT : t - LORENZO_REVEAL_T,
    };
  }
  const path = FOLLOWER_PATHS[i - 1];
  if (t < path.t0) return { x: path.x0, moving: false, ref: path.x0, since: 0 };
  for (const sg of path.segs) {
    if (t < sg.t1) {
      return {
        x: rampPosition(sg.x0, sg.vA, sg.vB, sg.t1 - sg.t0, (t - sg.t0) / (sg.t1 - sg.t0)),
        moving: true, ref: path.x0, since: 0,
      };
    }
  }
  if (t < path.settle) {
    return {
      x: brakePosition(path.atBrake, path.vBrake, path.brake, (t - path.brakeAt) / path.brake),
      moving: true, ref: path.x0, since: 0,
    };
  }
  return { x: path.target, moving: false, ref: path.target, since: t - path.settle };
}

// How fast a runner is actually going, which the camera reads to decide how far
// ahead of him to look.
function heroSpeedAt(t, i) {
  if (i === 0) {
    if (t < LORENZO_RUN_T || t >= DIVE_AT) return 0;
    return rampSpeed(LORENZO_V0, LORENZO_V1, (t - LORENZO_RUN_T) / LORENZO_RUN_DUR);
  }
  const path = FOLLOWER_PATHS[i - 1];
  if (t < path.t0 || t >= path.settle) return 0;
  for (const sg of path.segs) {
    if (t < sg.t1) return rampSpeed(sg.vA, sg.vB, (t - sg.t0) / (sg.t1 - sg.t0));
  }
  return path.vBrake * (1 - clamp01((t - path.brakeAt) / path.brake));
}

// TWO OF THEM HOP ON THE WAY.
//
// Seven people sprinting in perfect lockstep is a chorus line. One arc each, at
// a time of its own and a height of its own, deliberately not on the same beat
// as each other — the point is that the group stops moving as one object.
//
// A parabola in film time, like everything else here: it cannot drift, and a
// seek lands mid-hop with the hero at exactly the height playing to that moment
// would have put him.
// All seven, once each, and no two alike: the times are scattered rather than
// stepped, and the heights and durations vary with them. Two hops looked like
// two people being singled out; seven on an even cadence would be a chorus line
// again, which is the thing this is for.
const HERO_HOPS = [
  { i: 1, t0: GROUP_RUN_T + 0.62, dur: 0.44, h: HERO_H * 0.30 },
  { i: 2, t0: GROUP_RUN_T + 1.94, dur: 0.40, h: HERO_H * 0.25 },
  { i: 3, t0: GROUP_RUN_T + 1.17, dur: 0.47, h: HERO_H * 0.34 },
  { i: 4, t0: GROUP_RUN_T + 2.71, dur: 0.42, h: HERO_H * 0.28 },
  { i: 5, t0: GROUP_RUN_T + 0.88, dur: 0.37, h: HERO_H * 0.22 },
  { i: 6, t0: GROUP_RUN_T + 2.29, dur: 0.45, h: HERO_H * 0.31 },
  { i: 7, t0: GROUP_RUN_T + 1.56, dur: 0.39, h: HERO_H * 0.26 },
];
function heroHopAt(t, i) {
  const hop = HERO_HOPS.find((h) => h.i === i);
  if (!hop) return 0;
  const u = (t - hop.t0) / hop.dur;
  if (u <= 0 || u >= 1) return 0;
  return hop.h * 4 * u * (1 - u);
}

function heroArrivalT(i) {
  return i === 0 ? DIVE_AT : FOLLOWER_PATHS[i - 1].settle;
}
function heroOnStageT(i) {
  return i === 0 ? LORENZO_REVEAL_T : FOLLOWER_PATHS[i - 1].t0;
}

// THE LEAP INTO THE MACHINE.
//
// The film used to end on eight people applauding in front of a dead row, which
// is the cast congratulating itself for having walked in. Instead the line
// breaks and one of them goes to work: Lorenzo runs the length of the row and
// dives into a cabinet, which is the same leap the hub plays when the player
// picks one, and the seven he leaves behind turn to watch him go.
//
// The dive owns a clock of its own, so it is driven by seek() off film time
// rather than ticked — `diveAt(t)` is the same shape as `copterAt(t)`: ask for
// the object at t, get it posed for t, or get null.
// Where he is when the target comes into frame and he is unmistakably the one
// out front. Read off the run rather than restated, because the run is now a
// single curve and a second copy of its midpoint would be a second thing to
// keep true.
const DIVE_BREAK = {
  t0: DIVE_BREAK_T0,
  x0: rampPosition(DOOR_START_X, LORENZO_V0, LORENZO_V1, LORENZO_RUN_DUR,
    (DIVE_BREAK_T0 - LORENZO_RUN_T) / LORENZO_RUN_DUR),
  x1: LORENZO_LAUNCH_X,
  dur: DIVE_AT - DIVE_BREAK_T0,
};

// They all pull up together, and then the reaction RIPPLES. That is the way
// round it has to be: a pack braking in unison reads as one response to one
// event, while seven people arriving one at a time reads as seven cues being
// fired. Stagger what they do, not when they get there.
//
// Each starts an eighth after the one before, holds the celebration for half a
// second, and falls through into the animated joyful idle underneath — which
// keeps running under the close prompt on the presentation clock, so the last
// frame of the film is not a freeze.
const OBSERVER_TARGET_OFFSETS = FOLLOWER_PATHS.map((p) => p.target - CAB_CX[DIVE_CAB]);
const OBSERVER_RIPPLE = SIXTEENTH * 2;
// Three of them celebrate and keep celebrating; the rest simply stop and watch.
// Seven people cheering is a curtain call — three, among four who are just
// standing there, is a reaction.
const CELEBRANTS = new Set(['grumpos', 'clara', 'b33p']);
function observerReactionAt(t, i) {
  if (i <= 0 || !CELEBRANTS.has(HERO_IDS[i])) return null;
  const path = FOLLOWER_PATHS[i - 1];
  const age = t - (path.settle + path.rank * OBSERVER_RIPPLE);
  if (age < 0) return null;
  return {
    kind: 'celebrate', menu: true, grounded: true,
    time: age + i * 0.09, phase: (age + i * 0.09) % 1, facing: 1, faceJoy: true,
  };
}
function observerPosAt(t, i, base = heroBasePosAt(t, i)) {
  return i <= 0 ? base : base;
}

// Built once and never ticked. Keyed on the frame revision because the screen
// geometry it solves reads the live H — the same reason the caption block keeps
// a key rather than a value.
let DIVE = null;
let DIVE_KEY = null;
function diveAt(t) {
  if (t < DIVE_AT || t >= DIVE_END) return null;
  const key = presentationFrame().revision;
  if (DIVE_KEY !== key || !DIVE) {
    const x = CAB_CX[DIVE_CAB] - CAB_W / 2;
    const glass = cabinetScreenRect(x, CAB_Y, CAB_W, CAB_H);
    const g = cabinetScreenGeometry(glass.w, glass.h);
    DIVE = makeCabinetDive({
      cab: CABINETS[DIVE_CAB], heroId: HERO_IDS[0],
      cabX: CAB_CX[DIVE_CAB], cabY: CAB_Y, cabW: CAB_W, cabH: CAB_H,
      floorY: FLOOR_Y, heroH: HERO_H, startX: LORENZO_LAUNCH_X, facing: 1,
      insideGroundY: g.groundY, insideUnit: g.unit,
      // Straight into the leap. No windup: he does not arrive at a sprint and
      // then crouch.
      startAt: DIVE_LEAP_AT,
      // Silent by construction. Its own cue firing is high-water-mark with a
      // cursor seek() cannot re-arm, so the leap's sounds are authored on the
      // shot's cue sheet with everything else in the film.
      sfx: null, voiceSfx: null, voiceReverse: null, shake: null,
    });
    DIVE_KEY = key;
  }
  DIVE.seek(DIVE_LEAP_AT + (t - DIVE_AT));
  return DIVE;
}

// THE ONE MACHINE THAT COMES BACK ON.
//
// He cannot dive into a dead cabinet: there is nothing behind the glass, and
// the interior the dive paints would be tinted to the dead screen's near-black
// and simply not be there. So the machine he picks wakes as he runs at it —
// which is the better picture anyway. The film ends on one lit cabinet in a
// dead row, which is the whole game stated in one frame.
const DIVE_WAKE = 0.35;
function diveCabWakeAt(t) {
  return clamp01((t - (DIVE_AT - DIVE_WAKE)) / DIVE_WAKE);
}

// Where the breaking hero is before the leap takes over.
function diveRunAt(t) {
  if (t < DIVE_BREAK.t0) return null;
  if (t >= DIVE_AT) return null;
  return heroBasePosAt(t, 0).x;
}

// Presence, not arrival: 1 once he is revealed through the doorway and worth
// drawing a contact shadow under. He holds in an idle pose before the first
// running step, so this is only the short ramp that keeps the shadow from
// snapping on under the door.
function heroLandedAt(t, i) {
  return clamp01((t - heroOnStageT(i)) / 0.12);
}

// ---------------------------------------------------------------------------
// PAINTERS
// ---------------------------------------------------------------------------

// THE WALL, AND WHY THE POSTERS ARE NOT ON A GRID OF THEIR OWN.
//
// This used to be ten drawWallBay('posters') tiles on a 130-unit pitch while the
// machines stood on the hub's 88. Two pitches that never agree: posters drifted
// over the gaps and behind the marquees, a bay at a time, and the room stopped
// being the food court a dozen units into the opening truck.
//
// The hub's rule is one poster per machine, centred on it, at one height — and
// its own source says why: tiled three to a span of wall they read as wallpaper,
// hung one per cabinet they read as belonging to something. So the film hangs
// them on the CABINET grid and simply keeps going across the empty runway, which
// gives the run something to measure its speed against without putting cabinets
// where the blocking needs clear floor.
//
// Blank comes free. drawPoster paints sheet and art plate only when `pal.motif`
// is undefined — no star plate, no genre badge, no wordmark — so the intro's
// one-sheets are the hub's object with nothing printed on it.
const POSTER_W = HUB_ROOM.posterW, POSTER_H = HUB_ROOM.posterH;
const POSTER_Y = HUB_ROOM.posterTopY;
// A muted sheet with a dark plate: the hub's own defaults, stated here so the
// film does not inherit a cabinet's chassis colour it has no machine for.
const POSTER_PAL = { body: '#5a4a7a', screen: '#101018' };

// ONE POSTER, ONE MACHINE, AND NOWHERE ELSE.
//
// The hang rule is not a pitch, it is a relationship: a one-sheet advertises the
// thing underneath it. Continuing the rhythm across the empty runway looked
// tidier and was wrong — a poster over bare floor is advertising nothing, and a
// row of them is wallpaper again by a different route. The runway keeps the
// ceiling fixtures, which DO run the length of the room, and nothing else.
const POSTER_XS = CAB_CX;

// Every bay position in [x0, x1] on the machines' own phase. The ceiling runs
// the whole room on this grid the way the concourse does; only the posters are
// restricted to the machines.
function bayXsIn(x0, x1) {
  const out = [];
  const k0 = Math.floor((x0 - CAB_CX[0]) / BAY);
  const k1 = Math.ceil((x1 - CAB_CX[0]) / BAY);
  for (let k = k0; k <= k1; k++) out.push(CAB_CX[0] + k * BAY);
  return out;
}

function drawRoom(ctx, t, view, lit, straightLight = false) {
  const wallH = WALL_Y1 - WALL_Y0;
  // A ceiling. The hub never needs one — its camera is pinned and the wall runs
  // off the top of every frame — but this one pulls back to seven hundred units
  // of arcade, and at that width the frame is taller than the room. Without a
  // plane up here the closing shot has a band of void above the wall, which
  // reads as the picture having run out rather than as a room.
  ctx.fillStyle = '#141020';
  ctx.fillRect(ROOM_X0, WALL_Y0 - 200, ROOM_X1 - ROOM_X0, 200);
  drawWallBase(ctx, ROOM_X0, WALL_Y0, ROOM_X1 - ROOM_X0, wallH);
  // One blank one-sheet per MACHINE, centred on it. posterLook gives the same
  // alternating hang the concourse has, off the poster's own x, so the row is
  // not a set of perfectly level rectangles.
  for (const px of POSTER_XS) {
    if (px + POSTER_W < view.x0 || px - POSTER_W > view.x1) continue;
    const look = posterLook(px);
    drawPoster(ctx, px, POSTER_Y, POSTER_W, POSTER_H, {
      pal: POSTER_PAL, tilt: look.tilt, torn: look.torn, seed: look.seed, lit,
    });
  }
  // Ceiling tubes on the hub's cabinet-gap pitch, each flickering on its own
  // clock. The intro row begins at x=560, so a legacy 60-unit origin put the
  // fixtures hundreds of units left of the machines during the opening shot.
  //
  // They go OUT, and hard — not down to the room's ambient. The strip is the
  // room's master, so a ceiling still glowing over six dead machines would say
  // the cut had only reached the games. But the room around them does not go
  // out with them: the three shots after this have the whole cast in them, and
  // the power being off is no reason to stop the audience seeing the film. So
  // the emissive thing dies and the ambient fill stays, which is the difference
  // between a dark room and a black screen.
  const tubes = Math.max(0, (lit - 0.26) / 0.74);
  // The wide room benefits from the hub's slight beam lean, but the close
  // Eggshell reveal needs the fixture over him to read as a light pointing
  // down. `drawCeilingLight` takes its lean from the view arguments, so feed it
  // a centred reference only for this close treatment.
  const lightViewW = view.x1 - view.x0;
  // Gap-phased off the first machine and running the WHOLE room, the way the
  // concourse does it — including the runway, which is where the cast spends
  // most of the film and which a fixed fifteen-fixture loop starting at the
  // cabinets left entirely unlit.
  let i = -1;
  for (const gx of bayXsIn(ROOM_X0 - BAY, ROOM_X1 + BAY)) {
    i++;
    const x = gx - BAY / 2;
    if (x + LIGHT_W < view.x0 || x - LIGHT_W > view.x1) continue;
    // drawCeilingLight expects the fixture's position relative to the visible
    // world window for beam lean. Keep the fixture itself in world space while
    // deriving that relative position per frame, so landscape and portrait
    // pans keep the beams attached to their tubes.
    const lightViewX = straightLight
      ? lightViewW * 0.5 - LIGHT_W * 0.5
      : x - view.x0;
    drawCeilingLight(ctx, x, CEIL_Y, tubes * lightFlicker(t, i), lightViewX, lightViewW);
  }
  // drawFoodCourtFloor fills from x=0 in whatever space it is called in, and
  // reads its offset argument ONLY for the tile phase — the hub calls it in
  // screen space, where x=0 is the left edge of the view. Called in world space
  // here, that put the floor and the skirting from world 0 rightwards, so the
  // 620 units of room left of the doorway had no floor at all: a black wedge
  // beside the door on the widest frame. Translating to the room's left edge
  // fixes the origin; the phase argument stays ROOM_X0 so the tile indices are
  // still the world's own.
  ctx.save();
  ctx.translate(ROOM_X0, 0);
  drawFoodCourtFloor(ctx, FLOOR_Y, ROOM_X1 - ROOM_X0, ROOM_X0);
  ctx.restore();
}

// THE WEDGE. The corridor behind the service door still has power, so opening it
// throws a slab of light across the dead arcade — and that is the shot: eight
// people are about to walk in out of the one lit place left in the building.
//
// Drawn as a flat quad on the floor rather than a gradient cone, because the
// room is flat-shaded and a soft volumetric here would be the only thing in the
// film pretending to be lit from somewhere. It only appears once the lights are
// down; before the cut there is nothing for it to contrast against.
function drawDoorLight(ctx, open, lit) {
  if (open <= 0 || lit > 0.5) return;
  const x0 = DOOR_X + 3, x1 = DOOR_X + HUB_ROOM.doorW - 3;
  const centre = (x0 + x1) * 0.5;
  const throwTo = 96 * open;                      // how far down the floor
  const floorHalf = throwTo * 0.52;
  ctx.save();
  ctx.globalAlpha = 0.16 * open;
  ctx.fillStyle = '#ffe9b8';
  ctx.beginPath();
  ctx.moveTo(x0, HUB_ROOM.doorY + 6);
  ctx.lineTo(x1, HUB_ROOM.doorY + 6);
  // Keep the beam centred under the doorway. The old asymmetric throw made
  // Eggshell's light look like a diagonal spotlight aimed across the room.
  ctx.lineTo(centre + floorHalf, FLOOR_Y);
  ctx.lineTo(centre - floorHalf, FLOOR_Y);
  ctx.closePath();
  ctx.fill();
  // A brighter core inside the opening itself, so the doorway reads as a hole
  // into somewhere rather than a dark panel.
  ctx.globalAlpha = 0.3 * open;
  ctx.fillRect(x0, HUB_ROOM.doorY + 6, x1 - x0, HUB_ROOM.doorH - 8);
  ctx.restore();
}

// One cabinet, lit or dying or dead. The lit path feeds drawCabinetScreen the
// machine's own attract demo, so the opening shot of the arcade is six real
// games running rather than six coloured rectangles.
// `artT` is the PRESENTATION clock, not the film's. The screen state — which
// machines are dead, the flash, the wake ramp — stays on film time so the film
// stays seekable; only the attract picture itself runs on the clock that keeps
// going under the close prompt. Without the split the last thing on screen is a
// lit cabinet playing a frozen frame while everyone around it is still moving.
function drawFilmCabinet(ctx, t, i, dive = null, wake = 0, artT = t) {
  const cab = CABINETS[i];
  const x = CAB_CX[i] - CAB_W / 2;
  const death = cabinetDeathAt(t, i);
  if (!death.dead) {
    const pal = cabinetPalette(cab);
    drawCabinetShell(ctx, x, CAB_Y, CAB_W, CAB_H, pal);
    const scr = drawCabinetScreen(ctx, x, CAB_Y, CAB_W, CAB_H, pal, undefined,
      cabinetScreenArt(cab, artT + i * 1.7, pal.seed));
    if (scr) drawScreenSweep(ctx, scr, artT + i * 1.3, pal.seed);
    return;
  }
  // Woken for the dive, or dead like the rest of the row. Before the leap the
  // target only comes back as a brownout: dead glass remains underneath a dim,
  // fighting attract picture instead of snapping fully lit at the first frame
  // of the wake ramp.
  const off = cabinetPalette(cab, false);
  const on = cabinetPalette(cab, true);
  // The machine he is going into paints in three layers: what is behind the
  // glass, the shell with the stick he has just grabbed, and the picture being
  // pulled into the entry point. Every other machine is only ever the shell.
  const amt = Math.max(deadScreenBurst(t + i * 1.9, off.seed), death.flash);
  if (dive) dive.drawBehind(ctx, CAB_CX[i], { tint: off.screen, floorY: FLOOR_Y });
  drawCabinetShell(ctx, x, CAB_Y, CAB_W, CAB_H, off, undefined,
    dive ? { stickLean: dive.stick, stickFwd: dive.stickFwd, buttonPress: dive.button, glint: dive.glint } : undefined);
  if (dive) {
    drawCabinetShell(ctx, x, CAB_Y, CAB_W, CAB_H, on, undefined,
      { stickLean: dive.stick, stickFwd: dive.stickFwd, buttonPress: dive.button, glint: dive.glint });
    drawCabinetScreen(ctx, x, CAB_Y, CAB_W, CAB_H, on, undefined,
      dive.screenArt(cabinetScreenArt(cab, t, on.seed), CAB_CX[i]));
  } else if (wake >= 1) {
    // Once Lorenzo has crossed the glass, PLUMBER PANIC stays on. The final
    // reaction is a payoff on the awakened machine, not a second brownout.
    drawCabinetShell(ctx, x, CAB_Y, CAB_W, CAB_H, on);
    const scr = drawCabinetScreen(ctx, x, CAB_Y, CAB_W, CAB_H, on, undefined,
      cabinetScreenArt(cab, artT, on.seed));
    if (scr) drawScreenSweep(ctx, scr, artT, on.seed);
  } else if (wake > 0) {
    // Coming back on: the attract loop fights its way up through the static the
    // rest of the row is still making. The shell and dead screen are left in
    // place; only a restrained layer of the live cabinet is allowed through.
    drawDeadScreen(ctx, x, CAB_Y, CAB_W, CAB_H, t, off.seed, undefined, amt);
    ctx.save();
    ctx.globalAlpha = 0.18 + 0.55 * clamp01(wake);
    const scr = drawCabinetScreen(ctx, x, CAB_Y, CAB_W, CAB_H, on, undefined,
      cabinetScreenArt(cab, t, on.seed));
    if (scr) drawScreenSweep(ctx, scr, t, on.seed);
    ctx.restore();
  } else {
    drawDeadScreen(ctx, x, CAB_Y, CAB_W, CAB_H, t, off.seed, undefined, amt);
  }
  if (death.flash > 0) {
    // The collapse: the picture goes white and falls in before the glass gives
    // up. Drawn over the dead screen rather than instead of it, so the static
    // is already running underneath as the flash clears.
    const scr = cabinetScreenRect(x, CAB_Y, CAB_W, CAB_H);
    ctx.save();
    ctx.globalAlpha = death.flash * 0.85;
    ctx.fillStyle = '#f4f6ff';
    const squeeze = 1 - death.flash;
    ctx.fillRect(scr.x, scr.y + scr.h * 0.5 * squeeze, scr.w, scr.h * (1 - squeeze));
    ctx.restore();
  }
}

// The cords. Not the `cord` prop — that is an S-shaped pickup with a male plug
// on one end, a different object that happens to share a word. These are runs
// with a real sag between two known points, so their geometry is a function of
// where the cabinets are and there is no fixed box to cache them under.
//
// Same idiom as paintConduit's loose wires on the back wall: a quadratic with a
// sag term, stroked twice — a dark edge so the cable survives over a bright
// floor, then the colour.
function cable(ctx, x0, y0, x1, y1, sag, colour, width) {
  const path = (c) => {
    c.moveTo(x0, y0);
    c.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + sag, x1, y1);
  };
  ctx.lineCap = 'round';
  ctx.beginPath(); path(ctx);
  ctx.strokeStyle = 'rgba(16,11,26,0.5)'; ctx.lineWidth = width * 2.1; ctx.stroke();
  ctx.beginPath(); path(ctx);
  ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.stroke();
}

function introRoundRect(ctx, x, y, w, h, r, fill, stroke = null, line = 1) {
  const q = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + q, y);
  ctx.lineTo(x + w - q, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + q);
  ctx.lineTo(x + w, y + h - q);
  ctx.quadraticCurveTo(x + w, y + h, x + w - q, y + h);
  ctx.lineTo(x + q, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - q);
  ctx.lineTo(x, y + q);
  ctx.quadraticCurveTo(x, y, x + q, y);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = line; ctx.stroke(); }
}

function drawIntroSocket(ctx, cx, topY, progress = 1) {
  // The plate is drawn by ONE painter, shared with the gallery's own study —
  // see src/sprites/mcgfn.js for why. The film's job here is only to say where
  // it hangs and how full the bank is.
  drawMcgfnPlate(ctx, cx - INTRO_SOCKET_W / 2, topY, INTRO_SOCKET_W, INTRO_SOCKET_H,
    clamp01(progress));
}

// THE CORDS, AND WHERE THEY GO.
//
// Split in two, because the strip and the vacuum are no longer allowed in a
// shot with the cabinets in it. The arcade row gets the cable geography that
// belongs to the machines; the powerboard, the appliance and the feed up to the
// terminal belong to the terminal insert and to Eggshell's room, both of which
// are cut away from the row by design.
//
// Not the `cord` prop — that is an S-shaped pickup with a male plug on one end,
// a different object that happens to share a word. These are runs with a real
// sag between two known points, so their geometry is a function of where the
// cabinets are and there is no fixed box to cache them under.

// Six cabinet feeds leave their sides and drop to the floor before the next
// cabinet, then run away along the ground to the right. No cable is allowed to
// span the cabinet faces or hide behind the row, and none of them terminates on
// screen: the board is off frame, which is exactly where it now lives.
function drawCabinetCords(ctx, live, toX) {
  const colour = live ? '#c9662a' : '#6c4a33';
  for (let i = 0; i < 6; i++) {
    const anchorX = CAB_CX[i] + (i % 2 ? 3 : -3);
    const anchorY = CAB_Y + CAB_H * (0.52 + (i % 3) * 0.035);
    const nextLeft = i < 5 ? CAB_CX[i + 1] - CAB_W * 0.5 : anchorX + 18;
    const dropX = Math.min(anchorX + CAB_W * 0.62, nextLeft - 4);
    // A hair of floor depth per cord so six of them bundling to the right read
    // as six cables rather than one thick stripe along the skirting.
    const floorY = FLOOR_Y - 1 - (i % 3);
    cable(ctx, anchorX, anchorY, dropX, floorY, 5 + (i % 3) * 2, colour, 1.1);
    // Straight along the floor and out of shot. Zero sag: a cable lying on the
    // ground has nothing to hang from.
    cable(ctx, dropX, floorY, toX, floorY, 0, colour, 1.1);
    // Where it lands, so the drop reads as touching down rather than stopping.
    ctx.save();
    ctx.globalAlpha = live ? 0.34 : 0.24;
    ctx.fillStyle = '#211a21';
    ctx.beginPath(); ctx.ellipse(dropX, floorY + 1, 3.0, 1.15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// The end of the run, and the only place the board and the appliance appear in
// the arcade at all: the terminal insert, which never shares a frame with a
// cabinet. The bundle arrives from the left out of shot, where the row is.
function drawTerminalSet(ctx, live, fromX) {
  const colour = live ? '#c9662a' : '#6c4a33';
  // SIX FEEDS INTO SIX PLUGS — one per machine. They used to be three cables
  // stopping dead on the bar's top face, which never said the arcade was
  // plugged into this thing; now each one ends inside a plug body, and the
  // painter owns where those are (powerStripCordAt). Drawn before the strip so
  // a cable cannot cross the front of its own plug: it arrives from behind the
  // bar and disappears into it.
  for (let i = 0; i < STRIP_PLUGGED.length; i++) {
    const [px, py] = powerStripCordAt(STRIP_W, STRIP_H, i);
    // IN FRONT OF THE BAR, NOT BEHIND IT. Each cable runs in along the floor a
    // little nearer the camera than the strip's own base and only then turns up
    // into its plug — at FLOOR_Y - 1 the whole run was inside the bar's
    // silhouette and six cords vanished into a grey block. A hair of depth per
    // cord so they read as six cables rather than one stripe along the skirting.
    const floorY = FLOOR_Y + 1 + (i % 3) * 0.9;
    cable(ctx, fromX, floorY, STRIP_X + px - 3, floorY, 0, colour, 1.1);
    cable(ctx, STRIP_X + px - 3, floorY, STRIP_X + px, STRIP_Y + py, 0, colour, 1.1);
  }
  // THE TRUNK UP TO MCGFN-1. It used to leave the plate's bottom-left corner,
  // which read as a wire taped to the edge of a sign; it now hangs from a gland
  // in the middle of the plate's underside and swings down to the bar's outlet,
  // so the plate is something the arcade is WIRED INTO rather than something a
  // cable happens to touch. Peter, 20 Sep: "should the cable dangle down from
  // the middle perhaps rather than the corner?"
  const glandX = SOCKET_CX, glandY = SOCKET_TOP + INTRO_SOCKET_H;
  // THE PLATE IS ON THE WALL, so its cord does what a cord on a wall does: it
  // hangs STRAIGHT DOWN to the floor under its own weight, and only then turns
  // towards the bar with a small curve where it lands. The single swooping
  // catenary it replaces read as a washing line strung between two posts.
  // Thicker than the feeds, because it is the one carrying all of them — and it
  // is the cable the finale's punchline is about.
  // ONE PATH, not two cables meeting at a point: the corner where it reaches
  // the floor is a real bend with the same radius the cabinet feeds turn on.
  const trunk = live ? '#d8792f' : '#6c4a33';
  const landY = FLOOR_Y - 1.5;
  const endX = STRIP_X + STRIP_W, endY = STRIP_Y + STRIP_H * 0.5;
  const BEND = 13;
  const path = (c) => {
    c.moveTo(glandX, glandY + 3.5);
    c.lineTo(glandX, landY - BEND);
    // Down into the turn and away along the floor, then a long easy curve into
    // the bar's outlet rather than a straight line at it.
    c.quadraticCurveTo(glandX, landY, glandX - BEND, landY);
    c.quadraticCurveTo((glandX + endX) / 2 - 6, landY + 1.5, endX, endY);
  };
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); path(ctx);
  ctx.strokeStyle = 'rgba(16,11,26,0.5)'; ctx.lineWidth = 1.9 * 2.1; ctx.stroke();
  ctx.beginPath(); path(ctx);
  ctx.strokeStyle = trunk; ctx.lineWidth = 1.9; ctx.stroke();
  ctx.restore();
  // The gland itself: a small moulded collar under the plate that the cord
  // disappears into, drawn over the cord's end so the join is a fitting and not
  // a line stopping at an edge.
  introRoundRect(ctx, glandX - 3.4, glandY - 1.6, 6.8, 5.2, 1.4, '#2b2830', '#14121a', 0.8);
  introRoundRect(ctx, glandX - 2.2, glandY + 2.6, 4.4, 2.4, 1.1, '#3a3642', null, 0);

  ctx.save();
  ctx.translate(STRIP_X, STRIP_Y);
  // The painter direct, not drawProp: the cache bakes at the size it is asked
  // for, and this camera gets to five times magnification on this object. A
  // cached bake would be the one soft thing in the film's sharpest shot.
  PROP_PAINTERS.powerStrip(ctx, STRIP_W, STRIP_H, live ? 0 : 1);
  ctx.restore();
}

// The villain. eggshellCopterArt is a vector painter and is called directly for
// the same reason the strip is: the camera reaches eight times magnification on
// his face in the third shot.
const ROTOR_FPS = 22;
function drawCopter(ctx, t, c) {
  // Rotor on FILM time, not on the song. The old film asked Audio.songBeat()
  // for the blade frame, which made the picture depend on what the music was
  // doing — so the same second of film drew differently on a muted phone, in a
  // test, and in a video render, and none of them could be shot twice alike.
  const frame = Math.floor(t * ROTOR_FPS);
  // The idle sway is airborne only: it fades out over the descent and is gone
  // once the hull is on the bar.
  const driftX = Math.sin(t * 1.2) * c.size * 0.05 * c.drift;
  const driftY = Math.sin(t * 1.7) * c.size * 0.035 * c.drift;
  const x = c.x + driftX, y = c.y + driftY;
  ctx.save();
  // The tilt is about his centre: the bar's switch end is a bump under one
  // corner of the hull, so he sits a hair off level.
  ctx.translate(x, y); ctx.rotate(c.tilt); ctx.translate(-c.size / 2, -c.size / 2);
  eggshellCopterArt(ctx, c.size, c.size, frame, { face: copterFace(t) });
  ctx.restore();
}

// His face over the film: bored on the way in, smug through the threat, fixed
// on the bar while he drops, and GLOATING the moment he is sitting on it — the
// power is off and he did it with his backside. Peter, 20 Sep: "he should have
// a relevant facial expression when he does it." A cycle would have him mugging
// at nothing during the one shot that is only his face.
function copterFace(t) {
  const sat = t >= INTRO_FILM.cutAt;
  const mood = sat ? 'gloat' : t >= T_SOCKET.t0 ? 'really' : t >= T_THREAT.t0 ? 'smirk' : 'flat';
  return {
    look: sat ? -0.2 : t >= T_SOCKET.t0 ? -0.8 : Math.sin(t * 0.9) * 0.5,
    mood,
    blink: t % 3.7 > 3.54 ? 1 : 0,
    twitch: [Math.sin(t * 3.1) * 0.3, Math.sin(t * 3.7 + 0.8) * 0.3],
  };
}

// The eight clear the doorway at a run and stay in motion until the relay has
// resolved. Running and standing are the same rig — `kind: 'run'` with the
// stride driven off ground covered — so nobody changes character between the
// entrance and Lorenzo's break.
function drawHeroes(ctx, t, view) {
  const open = doorOpenAt(t);
  const dive = diveAt(t);
  const breakRun = diveRunAt(t);
  // Who they are all looking at, once one of them breaks for a machine: him
  // while he is running and leaping, and the machine that swallowed him after.
  // They do not go back to looking at nothing — the last thing this cast does
  // is watch the relay start.
  const gone = t >= DIVE_AT;
  const watchX = dive ? dive.x : breakRun != null ? breakRun : gone ? CAB_CX[DIVE_CAB] : null;
  const swallowed = dive ? dive.inside : gone;
  // Where the centre-parting threshold has got to. A hero still behind this is
  // inside the corridor, and gets clipped to the opening rather than drawn over
  // either door leaf.
  const edge = open > 0
    ? openingEdge('split', open, 1, DOOR_GEOM, -1)
    : DOOR_X + HUB_ROOM.doorW;
  // Lorenzo owns the downstage/front layer from the first running frame. The
  // world-space lead is what makes him first, and this paint order keeps a
  // near shoulder from hiding him when the lanes briefly converge at the
  // doorway or during the pull-ahead.
  const order = [...HERO_IDS.keys()].slice(1).concat(0);
  for (const i of order) {
    const a = heroLandedAt(t, i);
    if (a <= 0) continue;
    // The one who breaks for the machine stops being a member of the line: the
    // dive paints him while it runs, and after it he is INSIDE — the film does
    // not get him back, which is the point of the shot.
    if (i === 0 && t >= DIVE_AT) continue;
    const { moving, ref, since } = heroPosAt(t, i);
    const x = i === 0 && breakRun != null ? breakRun : heroPosAt(t, i).x;
    if (x + HERO_H < view.x0 || x - HERO_H > view.x1) continue;
    let pose;
    if (i === 0 && breakRun != null) {
      // Running out of the line, not in from the door: the stride is measured
      // from where he left rather than from the doorway he came through.
      pose = { kind: 'run', menu: true, grounded: true, time: t, phase: gaitOf(x, DIVE_BREAK.x0), facing: 1 };
    } else if (moving && i > 0 && watchX != null) {
      pose = {
        kind: 'run', menu: true, grounded: true, time: t,
        phase: gaitOf(x, ref), facing: 1,
      };
    } else if (watchX != null) {
      // Everyone else tracks him, and the turn travels down the line at the
      // speed he is running: each of them is looking LEFT, back down the row he
      // is coming along, until he draws level, and after him once he is past.
      // Surprised while he is on the floor, pleased once the glass takes him —
      // seven people watching the relay start is the reaction shot.
      const passed = watchX >= x;
      const reaction = swallowed ? observerReactionAt(t, i) : null;
      pose = reaction
        ? {
          // The gathered cast does not freeze after the dive. Each hero starts
          // a beat later, then loops the shared celebration motion with his own
          // approved move, facing the cabinet that just took Lorenzo.
          ...reaction,
          facing: passed ? 1 : -1,
        }
        : {
          kind: 'idle', menu: true, grounded: true, time: since,
          phase: (since * 0.55 + i * 0.21) % 1,
          facing: passed ? 1 : -1,
          faceSurprised: passed && !swallowed,
          faceJoy: swallowed,
        };
    } else if (moving) {
      pose = { kind: 'run', menu: true, grounded: true, time: t, phase: gaitOf(x, ref), facing: 1 };
    } else {
      // Before the door releases them, keep the cast quiet and unperformed.
      pose = { kind: 'idle', menu: true, phase: (since * 0.55 + i * 0.21) % 1, time: since, grounded: true };
    }
    // Still in the doorway: clip to the near side of the opening so he emerges
    // from behind the leaf rather than sliding over the top of it. Clipped in x
    // only and never scaled — walking through a door is an occlusion, not a
    // perspective trick.
    const hidden = x - HERO_H * 0.5 < edge;
    if (hidden) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(edge, CEIL_Y, view.x1 - edge + HERO_H, FLOOR_Y - CEIL_Y + 2);
      ctx.clip();
    }
    const hop = i > 0 && moving ? heroHopAt(t, i) : 0;
    if (hop > 0) {
      // Airborne: the rig needs to know, or he runs along in mid-air. vy off the
      // arc's own derivative so drawToon's air stretch answers the real curve.
      const e = 1 / 120;
      pose = {
        ...pose, kind: 'jump', grounded: false,
        vy: -(heroHopAt(t + e, i) - heroHopAt(t - e, i)) / (2 * e),
      };
    }
    drawToon(ctx, HERO_IDS[i], pose, x, FLOOR_Y - hop, HERO_H);
    if (hidden) ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// THE FILM
// ---------------------------------------------------------------------------

export class IntroState {
  static portraitMode = 'frame';

  constructor({ onDone }) { this.onDone = onDone; }

  enter() {
    this.t = 0;
    this.closeHoldT = 0;
    this.finished = false;
    this.awaitingClose = false;
    this.didCut = false;
    this.crowdOn = false;
    this.cueIdx = 0;
    this.staticOn = [false, false, false, false, false, false];
    this.blocks = [];
    this.blockKey = null;
    this.cues = buildCueSheet();
    clearParticles();
    Input.setMenuButtons();
    // The marquees and the dead-screen static both want to bloom, and the cut
    // wants a flash that is brighter than white. Turned off again in exit() —
    // the title screen's contract.
    setSceneGlow(true);
    setOverlayMerge(true);
    // Every entry path sounds the same. On the real new-file route the title
    // nocturne has been playing since the title screen and is left alone; via
    // ?goto=intro, the dev menu or the prose walk there is no bank at all, and
    // the film used to run forty seconds in total silence.
    if (Audio.sourceBank !== TITLE_THEME) Audio.setBank(TITLE_THEME);
  }

  exit() {
    // The old film had no exit() at all, so leaving by any route that was not
    // its own close — the dev menu, a state swap — left the crowd cheering
    // underneath whatever came next.
    Audio.stopCrowdCheer();
    setSceneGlow(false);
    setOverlayMerge(false);
    clearParticles();
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    Audio.stopCrowdCheer();
    this.onDone();
  }

  // Drop the projector at an exact film time. Pure in everything the picture is
  // made of; the edge-triggered sound is re-armed to match, and particles are
  // cleared because they are the one thing that cannot be recreated from t.
  seek(t) {
    this.t = Math.max(0, Math.min(INTRO_FILM.duration, t));
    this.closeHoldT = 0;
    this.awaitingClose = this.t >= INTRO_FILM.duration;
    this.cueIdx = this.cues.findIndex((c) => c.t > this.t);
    if (this.cueIdx < 0) this.cueIdx = this.cues.length;
    this.didCut = this.t >= INTRO_FILM.cutAt;
    for (let i = 0; i < 6; i++) this.staticOn[i] = false;
    if (this.crowdOn) { Audio.stopCrowdCheer(); this.crowdOn = false; }
    clearParticles();
  }

  update(dt) {
    if (this.finished) { Input.endFrame(); return; }
    if (Input.pressed('back')) { this.finish(); Input.endFrame(); return; }
    if (Input.pressed('confirm') || Input.pressed('jump') || Input.pressed('pointer')) {
      if (this.awaitingClose) { this.finish(); Input.endFrame(); return; }
      // A tap advances to the next SHOT rather than closing the film — the
      // behaviour the old one had per beat, kept. Only `back` skips out.
      this.advance();
      Input.endFrame();
      return;
    }
    const prev = this.t;
    this.t = Math.min(INTRO_FILM.duration, this.t + Math.max(0, dt));
    if (this.t >= INTRO_FILM.duration) {
      if (prev < INTRO_FILM.duration) this.closeHoldT = 0;
      else this.closeHoldT += Math.max(0, dt);
      this.awaitingClose = true;
    }
    this.runFilm(prev, this.t);
    updateParticles(dt);
    Input.endFrame();
  }

  advance() {
    const shot = shotAt(this.t);
    const prev = this.t;
    this.t = Math.min(INTRO_FILM.duration, shot.t1);
    if (this.t >= INTRO_FILM.duration) {
      this.awaitingClose = true;
      this.closeHoldT = 0;
    }
    // Walk the sheet past the skipped span FIRST, so those cues are spent rather
    // than played. Without it, tapping through the roll call dumps all seven
    // pops into a single frame. A cue landing exactly on the new time survives —
    // jumping to the door shot should still open the door.
    this.spendCuesBefore(this.t);
    this.runFilm(prev, this.t);
  }

  spendCuesBefore(t) {
    while (this.cueIdx < this.cues.length && this.cues[this.cueIdx].t < t) this.cueIdx++;
  }

  // Everything that happens BECAUSE time passed, as opposed to everything that
  // is simply true at a time. Three things qualify, and they are all sound.
  runFilm(prev, t) {
    if (!this.didCut && t >= INTRO_FILM.cutAt) { this.didCut = true; this.cut(); }
    this.fireCues(prev, t);
    this.updateBeds(t);
    this.spawnFx(prev, t);
  }

  // THE CUT — one call does all three halves of it.
  //
  //   THE TITLE DIES. setBank ramps songTrim and every sounding lane gate to
  //   zero over SONG_FADE. The ramp is on songTrim, which sits downstream of the
  //   reverb and echo RETURNS, so the nocturne's tails go with the notes and
  //   nothing is left ringing over the silence. That is why this is one setBank
  //   call and not a fade followed by a start.
  //
  //   THE HOLE. `gap` is the silence setBank opens before the new downbeat, and
  //   that silence IS the dark shot. Asked for as the remaining dark less the
  //   output latency: setBank places the downbeat on the audio clock and the ear
  //   hears it heardLatencySec() later, so without the subtraction a Bluetooth
  //   speaker lands the slam a fifth of a second after the door has gone.
  //
  //   THE SLAM. The step counter resets, so the first thing heard is bar one,
  //   beat one, on the frame the door shot opens.
  //
  // Computed from the film clock rather than from a constant, so a tap that
  // skipped part of the reach still puts the downbeat on the door's first frame.
  cut() {
    const lead = Audio.heardLatencySec?.() ?? 0;
    const gap = Math.max(0.05, INTRO_FILM.slamAt - INTRO_FILM.cutAt - lead);
    Audio.setBank(SURGE_THEME, undefined, undefined, { gap });
  }

  // Placed rather than fired. The film knows every cue is coming — it is a film
  // — so each is asked for at least cueLeadSec() early and handed the remaining
  // distance in beats of whatever tempo is in force, and the output latency
  // cancels. Firing on the frame the picture lands is late by that whole
  // latency, by a different amount on every machine.
  fireCues(prev, t) {
    const leadSec = Audio.cueLeadSec?.() ?? 0.2;
    const bpm = (Audio.bpm || 112) * (Audio.tempo || 1);
    while (this.cueIdx < this.cues.length) {
      const c = this.cues[this.cueIdx];
      if (c.t > t + leadSec) break;
      this.cueIdx++;
      if (c.t < prev) continue;                  // skipped past: spend, do not fire
      const inBeats = Math.max(0, c.t - t) * bpm / 60;
      // The leap's voice is a song-engine preset on the SFX bus rather than a
      // cue — which is what makes going into a plumbing cabinet sound like a
      // plumbing cabinet. Same placement, a different door into the engine.
      const { voice, ...opt } = c.opt;
      if (voice) Audio.voiceSfx?.(c.name, { ...opt, inBeats });
      else Audio.sfx(c.name, { ...opt, inBeats });
    }
  }

  // The sustained beds. A bed is not an event: it has no moment to be placed on,
  // so it is edge-triggered off the picture rather than scheduled like a cue.
  updateBeds(t) {
    // Per-cabinet static, on the rising edge of that machine's own burst. Six
    // screens coughing on six different clocks is the sound of the dark shot.
    const dark = t >= CABINET_CUT_AT && t < shotById('doors').t0 + 1.2;
    for (let i = 0; i < 6; i++) {
      const seed = cabinetPalette(CABINETS[i], false).seed;
      const on = dark && cabinetDeathAt(t, i).dead
        && deadScreenBurst(t + i * 1.9, seed) > 0;
      if (on && !this.staticOn[i]) Audio.sfx('static', { gain: 0.34 });
      this.staticOn[i] = on;
    }
    const wantCrowd = t >= shotById('lineup').t0;
    if (wantCrowd && !this.crowdOn) {
      Audio.startCrowdCheer({ reverb: 0.85, reverbDecay: 6 });
      this.crowdOn = true;
    }
  }

  // Garnish. Everything here is a one-shot particle emission on a crossing, and
  // nothing the story needs depends on any of it — a scrubbed frame is simply a
  // frame without sparks.
  spawnFx(prev, t) {
    const crossed = (at) => prev < at && t >= at;
    if (crossed(INTRO_FILM.cutAt)) {
      shake(4, 0.25);
      // Contacts parting UNDER HIM. The rocker itself cannot tween — the strip
      // painter branches hard on live/dead and it is the hub's painter, not
      // ours — and the hull is covering it anyway, so the throw gets its moment
      // from the arc: hot sparks squirting out from under both ends of the tub
      // on the exact frame the room loses power, with a few white-hot ones at
      // the switch end where the contacts actually are.
      const hullY = STRIP_Y + 1;
      burst(SEAT_X - 16, hullY, 9, 46, 0.34, '#ffe6b0', 1.1, 90);
      burst(SEAT_X + 16, hullY, 7, 40, 0.3, '#ffe6b0', 1.0, 90);
      burst(ROCKER_X, hullY, 5, 30, 0.26, '#fff6dc', 1.3, 60);
    }
    for (let i = 0; i < 6; i++) {
      const at = CABINET_CUT_AT + CAB_DEATH_0 + i * CAB_DEATH_STEP;
      if (!crossed(at)) continue;
      const scr = cabinetScreenRect(CAB_CX[i] - CAB_W / 2, CAB_Y, CAB_W, CAB_H);
      burst(scr.x + scr.w / 2, scr.y + scr.h / 2, 5, 34, 0.3, '#cfe9ff', 1.1, 60);
    }
    if (crossed(T_DOORS.t0)) shake(5, 0.3);
    for (let i = 0; i < HERO_IDS.length; i++) {
      if (!crossed(heroArrivalT(i))) continue;
      // Dust off the floor where each one plants. Deterministic spread is not
      // worth the ceremony here: this is the only place in the film that does
      // not have to reproduce, because none of it survives a seek anyway.
      const px = heroPosAt(heroArrivalT(i), i).x;
      spawnPuff(px - 4, FLOOR_Y - 2, -14, -7, 0.5, '#6d6480', 2.2);
      spawnPuff(px + 4, FLOOR_Y - 2, 14, -7, 0.5, '#6d6480', 2.2);
    }
  }

  // Caption layout, cached per shot and per presentation. A subtitle must never
  // reflow underneath itself while it fades, and the key carries the frame MODE
  // as well as its revision because a landscape phone has safe insets too.
  block(i, gate) {
    const key = `${gate.portrait ? 'p' : 'l'}:${presentationFrame().revision}`;
    if (this.blockKey !== key) { this.blocks = []; this.blockKey = key; }
    if (!this.blocks[i]) {
      this.blocks[i] = fitProse(CAPTIONS[i].text, gate.w - 48, gate.capBottom - gate.capTop);
    }
    return this.blocks[i];
  }

  // The caption's own clock, IN SECONDS. The old one divided the beat time by
  // 0.42 and scaled the result into CASCADE_ALL, which put the reveal past the
  // last line's landing within one frame of the beat starting — so the per-line
  // stagger and rise the cascade was written for never played once.
  captionAlpha(caption, into) {
    // The closer is authored to finish exactly as the film does, so it is still
    // standing when the close prompt appears rather than having been read and
    // then sat under for three seconds.
    if (this.awaitingClose) return 1;
    const fadeIn = clamp01(into / 0.18);
    const fadeOut = clamp01((caption.sec - into) / 0.35);
    return Math.min(fadeIn, fadeOut);
  }

  draw(ctx) {
    if (this.finished) return;
    const gate = introGate();
    const t = this.t;
    // The film clock stops at its authored end, but the final reaction must not
    // freeze underneath the close prompt. Keep a separate presentation clock
    // for the grounded celebration/idle rig; seek() resets it so the authored
    // film remains deterministic while the user is deciding when to close.
    const motionT = this.awaitingClose ? t + this.closeHoldT : t;
    const shot = shotAt(t);
    const cam = cameraAt(t, gate);
    const lit = roomLitAt(t);
    // Kept for the scrubber and the layout tests: both want to know where the
    // picture actually landed in this frame, and recomputing it outside the
    // draw is how the two get to disagree.
    this.gate = gate;
    this.cam = cam;

    ctx.fillStyle = '#07070d';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    // The clip the old film never had: without it the villain flew about outside
    // the picture for the first second and a half of his entrance.
    ctx.beginPath();
    ctx.rect(gate.x, gate.y, gate.w, gate.h);
    ctx.clip();
    // Translate and scale only — no rotation, no skew — which is what the floor
    // reflection band needs to take its fast path.
    ctx.translate(gate.x + gate.w / 2, gate.y + gate.h / 2);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);

    const halfW = gate.w / (2 * cam.zoom), halfH = gate.h / (2 * cam.zoom);
    const view = {
      x0: cam.x - halfW, x1: cam.x + halfW,
      y0: cam.y - halfH, y1: cam.y + halfH,
    };

    const dive = diveAt(t);
    // The socket insert now sits between Eggshell's service room and the
    // cabinet brownout. Keep it out of the cutaway so the terminal is actually
    // shown before the arcade row goes dark.
    // ONE ROOM, all the way through. Eggshell used to fly into a separate
    // service set so the switch could be shown without a cabinet behind it —
    // but the terminal end of the arcade already has no cabinets in it, so the
    // second room was solving a framing problem with a location. He arrives over
    // the socket end of the room the whole film is set in, and throws the
    // switch there.
    const cutawayRoom = false;
    const socketShot = shot.id === 'socket';
    {
      drawRoom(ctx, t, view, lit, shot.id === 'arrival' || shot.id === 'threat');
      if (socketShot) {
        // The terminal gets its own full-screen insert, and it is the only
        // place in the arcade the board and the appliance are allowed to
        // appear at all. The explicit branch keeps a future camera adjustment
        // from accidentally putting a machine behind them.
        drawTerminalSet(ctx, stripLiveAt(t), view.x0 - 20);
        drawIntroSocket(ctx, SOCKET_CX, SOCKET_TOP, introSocketProgressAt(t));
      } else {
        // Everywhere else the cords simply leave: the board is off frame, and
        // the opening truck and the brownout wide no longer travel to it.
        drawCabinetCords(ctx, stripLiveAt(t), view.x1 + 40);
      }
    }
    if (!socketShot && !cutawayRoom) {
      for (let i = 0; i < 6; i++) {
        if (CAB_CX[i] + CAB_W < view.x0 || CAB_CX[i] - CAB_W > view.x1) continue;
        drawFilmCabinet(ctx, t, i, dive && i === DIVE_CAB ? dive : null,
          i === DIVE_CAB ? diveCabWakeAt(t) : 0, motionT);
      }
    }
    if (view.x0 < DOOR_X + HUB_ROOM.doorW + 120 && view.x1 > DOOR_X) {
      const open = doorOpenAt(t);
      drawDoorLight(ctx, open, lit);
      drawDoor(ctx, DOOR_X, HUB_ROOM.doorY, HUB_ROOM.doorW, HUB_ROOM.doorH,
        DOOR_PALETTES.service, t, open);
    }

    // One band for the whole floor. Overlapping figures in separate bands sum
    // their alphas, and eight heroes shoulder to shoulder is exactly that case.
    //
    // Skipped when the floor is not on screen or the camera is close: the band
    // sizes a scratch canvas off the device pixels under it, and the reach shot
    // reaches five times magnification on a picture with no floor in it at all.
    const wantMirror = view.y1 > FLOOR_Y && cam.zoom < 3;
    // PIVOT BELOW THE LINE, NOT ON IT. The cast's soles paint about 1.5 units
    // under FLOOR_Y — that is what makes a hero read as planted rather than
    // perched. A mirror pivoting on the line itself folds the shoe back onto
    // its own sole, and the upright and the reflection appear to share one
    // foot. Same drop the concourse uses, imported so it cannot drift.
    const band = wantMirror ? beginFloorReflectionBand(ctx, FLOOR_Y + REFLECT_SOLE_DROP, { height: 34 }) : null;
    const heroSubjects = (c) => drawHeroes(c, motionT, view);
    // Order in a band IS depth: what goes in later is painted over what came
    // before. The row is bolted to the floor and stands behind everyone, the
    // copter crosses in front of it, and the cast is nearest.
    if (band) {
      addFloorReflection(band, {
        draw: (c) => {
          if (socketShot || cutawayRoom) return;
          for (let i = 0; i < 6; i++) {
            if (CAB_CX[i] + CAB_W < view.x0 || CAB_CX[i] - CAB_W > view.x1) continue;
            drawFilmCabinet(c, t, i, dive && i === DIVE_CAB ? dive : null,
              i === DIVE_CAB ? diveCabWakeAt(t) : 0, motionT);
          }
        },
        height: CAB_H, anchorX: (view.x0 + view.x1) / 2, wide: view.x1 - view.x0, lift: 0,
      }, { track: false });
      const mirrorCopter = copterAt(t);
      // His mirror has to be FOUND, not stated: he is the one subject in the
      // film that never touches the floor, and the gap is the whole point of
      // drawing it.
      if (mirrorCopter) {
        addFloorReflection(band, {
          draw: (c) => drawCopter(c, t, mirrorCopter),
          height: COPTER_SIZE, anchorX: mirrorCopter.x,
          lift: FLOOR_Y + REFLECT_SOLE_DROP - (mirrorCopter.y + COPTER_SIZE / 2),
        });
      }
      addFloorReflection(band, {
        draw: heroSubjects, height: HERO_H,
        anchorX: (view.x0 + view.x1) / 2, wide: view.x1 - view.x0, lift: 0,
      });
    }
    heroSubjects(ctx);
    // The diver, painted by the dive rather than by the line: it owns his arc
    // from the windup to the moment the glass takes him.
    if (dive) dive.drawOutside(ctx, CAB_CX[DIVE_CAB], { lit: 1 });
    for (let i = 0; i < HERO_IDS.length; i++) {
      const a = heroLandedAt(t, i);
      if (i === 0 && t >= DIVE_AT) continue;
      if (a > 0) {
        const sx = i === 0 && diveRunAt(t) != null ? diveRunAt(t) : heroPosAt(t, i).x;
        drawSoftContactShadow(ctx, sx, FLOOR_Y, HERO_H * 0.3, HERO_H * 0.07, { alpha: 0.4 * a });
      }
    }
    if (band) endFloorReflectionBand(band);

    const copter = copterAt(t);
    if (copter) drawCopter(ctx, t, copter);

    drawParticles(ctx);
    ctx.restore();

    if (t < FADE_IN_SEC) {
      ctx.save();
      ctx.globalAlpha = 1 - EASES.smoother(t / FADE_IN_SEC);
      ctx.fillStyle = '#07070d';
      ctx.fillRect(gate.x, gate.y, gate.w, gate.h);
      ctx.restore();
    }

    // The caption, outside the clip and unscaled: it is type on the print, not
    // something in the room, and it is the one thing on screen that must be
    // exactly as legible in a wide shot as in a close-up.
    if (!ACTION_ONLY_PREVIEW) {
      // The script runs on its own clock, so a line may sit inside one shot,
      // span a cut, or simply not be there — the reveal, the jump and the glass
      // are all deliberately clean.
      const caption = this.awaitingClose ? PROMPT_CAPTION : captionAt(t);
      if (caption) {
        const block = this.block(CAPTIONS.indexOf(caption), gate);
        const into = this.awaitingClose ? this.closeHoldT : t - caption.at;
        drawCascade(ctx, block, gate.capTop, gate.capBottom - gate.capTop,
          '#e8e8f0', into, this.captionAlpha(caption, into));
      }
    }

    if (this.awaitingClose) {
      drawTextCentered(ctx,
        Input.isTouchDevice() ? 'TAP TO CLOSE' : 'PRESS ENTER OR CLICK TO CLOSE',
        W / 2, gate.promptY, '#8a8492', 1);
    }
  }
}

// Every one-shot in the film, flattened to absolute film seconds and sorted, so
// firing is a single walk of an index rather than a scan of eleven shots' lists.
function buildCueSheet() {
  const out = [];
  for (const shot of SHOTS) {
    for (const c of shot.cues) {
      const { at, name, ...opt } = c;
      out.push({ t: shot.t0 + at, name, opt });
    }
  }
  // THE DIVE'S OWN SOUND, on the film's clock.
  //
  // The object is still built silent, because its firing is high-water-mark with
  // a cursor seek() cannot re-arm — so a scrubbed frame would either miss its
  // sounds or replay them. Instead the leap's cues are lifted onto this sheet at
  // the shared animation's own phase times: they stay placed rather than fired,
  // they survive a seek, and they cannot drift out of step with the picture,
  // because changing DIVE_PHASES moves both.
  const leap = leapVoiceFor(CABINETS[DIVE_CAB].id);
  out.push(
    { t: DIVE_AT, name: leap.id, opt: { ...leap, voice: true } },
    { t: DIVE_AT + DIVE_REL('cross'), name: 'boom', opt: { gain: 0.74, reverb: 1.7, reverbDecay: 3.5 } },
    { t: DIVE_AT + DIVE_REL('set'), name: 'land', opt: { gain: 1.29, pitch: 1.6 } },
    { t: DIVE_AT + DIVE_REL('runoff') + PHASE_AT.runoff.dur * 0.55, name: 'jump', opt: { gain: 0.85, pitch: 1.55 } },
    { t: DIVE_AT + DIVE_REL('exit'), name: 'portal', opt: { gain: 2.65, shapeRef: 'PORTAL_BREATH' } },
  );
  out.sort((a, b) => a.t - b.t);
  return out;
}

// Exported for the tests and the scrubber: the film's own vocabulary, so a test
// can assert on where the camera is without reaching into a running instance.
export const IntroFilm = {
  shotAt, cameraAt, introGate, fitBox,
  copterAt, doorOpenAt, heroLandedAt, cabinetDeathAt, roomLitAt, stripLiveAt,
  heroArrivalT, heroOnStageT, heroPosAt, heroSpeedAt, subjectXAt,
  observerPosAt, observerReactionAt, introSocketProgressAt, heroX, buildCueSheet,
  diveAt, diveRunAt, diveCabWakeAt, DIVE_AT, DIVE_END, DIVE_BREAK, DIVE_CAB,
  LORENZO_REVEAL_T, LORENZO_RUN_T, LORENZO_IDLE_T, GROUP_RUN_T,
  LORENZO_V0, LORENZO_V1, LORENZO_LAUNCH_X, FOLLOWER_PATHS,
  GATHER_ARRIVE, GATHER_BRAKE, HERO_PAN_START_T, PULL_OUT_SEC, BAR, BEAT, SIXTEENTH,
  NEAR_SKID, FAR_BURST, FAR_SKID,
  FOLLOWER_STAGGER,
  HERO_IDS, CAB_CX, BAY, FLOOR_Y, STRIP_CX, SOCKET_CX, POSTER_XS, bayXsIn,
  heroHopAt, HERO_HOPS,
  SCREEN_REVEAL_AT, SCREEN_VISIBLE_AT,
  cutAt: INTRO_FILM.cutAt, cabinetCutAt: CABINET_CUT_AT,
  SEAT_X, SEAT_Y, SEAT_DROP_T, SEAT_HOLD_SEC, LIFT_SEC, LIFT_Y, ROCKER_X,
};
