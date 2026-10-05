import { SKIRT_LEGS, tameSkirt } from './dance-legs.js';
import { drawDiscoBall } from './mirrorball.js';
import { drawBeachBall, BEACH_BALL_COLOURS, BEACH_BALL_COLOURS_2 } from './beachball.js';
import { PARTY_BEATS, CLEANERS, DOLORES_DANCE_BEATS, DOLORES_FLING_BEATS, DOLORES_RUN_BEATS, VACUUM_TURBO_BEATS, partyAge, partyAlive, partyHero, drawPartyFront, scrapY, vacuumWalk, cleanerWalk, drawScraps, makeScrap } from './club-party.js';
import { ClubVoices } from './club-voices.js';
import { PADS, SHOUTS, HIT_GAINS, CLAP_OVER_DB, playPad, playToy, startRiser, rollHit, clapsAt, CLAP_FILLS } from './club-hits.js';
import { VOICES, voiceGain, baseLane } from '../../data/voices.js';
import { dbToGain } from '../../engine/mixer.js';
import { clubCrt } from './club-crt.js';
import { FISHES, drawPaperFish } from './club-fish.js';
import { drawSpeakerStack } from './speakers.js';
export { SKIRT_LEGS } from './dance-legs.js';
// THE BANGER LAB'S CLUB — one of the player's songs, played live. 3 Oct 2026.
//
// What a song from the Lab's list opens into, in place of the jukebox's visualiser: a
// nightclub with the heroes on its dance floor (Peter's brief, built from the mock-up in
// work/local/lab-stage-mock). Tap a hero and, on the next beat, they do their title-parade
// move while their move changes the music for a bar — a master effect section, the same
// machinery a song's own Spot FX play on. Tap a part icon and that part goes or comes back
// on the next beat ("NO DRUMS" / "YES DRUMS"). A back button in the corner; the song's name
// and how to play it show for the first few seconds, then fade. Nothing else on screen.
//
// The room: a truss of par cans, THE BANGER LAB in neon, haze, lasers in bursts, a mirror
// ball that drops on its wire and throws light, speaker stacks, and the food court's glossy
// tiled floor lit Saturday Night Fever style — every tile its own colour, faint, pulsing on
// the beat, reshuffled each bar, never the same colour as a neighbour. The heroes are drawn
// by the game's own painter (sprites/toons.js) and their moves are its title-parade poses.
//
// The live controls (club-fx.js) touch only what the club owns and put everything back on
// the way out: the master's effect sections and each channel's monitoring gate.
//
// 5 Oct 2026 (Peter): the floor got more to play. Held heroes are DRAGGED to play their move
// (club-fx.js), Fernwick draws the bow and lets go to land THE DROP, B-33P swaps the whole
// band onto the 8-Bit Sound Set and back — and the room onto a CRT with it (club-crt.js) —
// and the mixer's sound buttons swap one part's instrument (club-voices.js). The DANCE FLOOR
// is four pads across — a siren, a clap, a crowd's shout and an air horn, each on the next
// sixteenth (club-hits.js) — and touching it wakes the bottom buttons. Each move changes the
// room the way it changes the music. The heroes stand anywhere: their places are drawn afresh
// each visit, and in portrait nobody swaps.
import { W, H, bakeSS, screen, visualiserFrame, setVisualiserFullscreen } from '../../engine/renderer.js';
import { frameRate } from '../../engine/loop.js';
import { Input } from '../../engine/input.js';
import { Audio } from '../../engine/audio.js';
import { isTransitioning } from '../../engine/states.js';
import { TITLE_FONT, drawTextCenteredForPresentation as drawTextCentered, textWidth, textYForMid } from '../../engine/sprites.js';
import { portraitMenuActive, portraitMenuSafeTop, portraitMenuSafeBottom, portraitMenuTextCentered, portraitMenuTextY, portraitMenuFit } from '../../engine/portrait-menu.js';
import { drawToon, titleParadeAction, toonInkTop } from '../../sprites/toons.js';
// The heroes' dances come from the gallery's shared list, so the club always offers the same
// moves the gallery previews.
import { HERO_DANCE_LAB_CANDIDATES, heroDancePose } from '../../dev/hero-dance-candidates.js';
import { songFor, bangerTitle, keepMixer } from './store.js';
import { drawPlayerMarker, MARKER_R, MARKER_GAP } from '../player-marker.js';
import { LED_SLOGANS, LED_SCROLLS, LED_STYLE_LINES, fillLed } from './led-slogans.js';
import {
  HERO_MOVES, PARTS, nextBeatAt, nextSixteenthAt, nextBarAt, nextTwoOrFourAt, landingFor, playMove, startHold, dragHold, endHold, setPartLevel,
  releaseClub, moveSeconds, gridReady, setSpeed, stepTime, startChipGate, endChipGate, CHIP_GATE_EVERY, throwBeat, echoLevel,
  stopTape, nextStopStep, partOf, partGain, startWobble, setWobble, endWobble,
} from './club-fx.js';

const BODY_FONT = "'Fredoka', 'Trebuchet MS', 'Segoe UI', system-ui, sans-serif";
const DISCO = ['#ff4fa3', '#ffd23f', '#3fb8ff', '#7cff6b', '#b06bff'];
const LASER = ['#3dff6e', '#ff3355', '#36e6ff'];
const CANS = [0.06, 0.18, 0.38, 0.62, 0.82, 0.94];
/** How far down from the top of the room a par can's lens is, in strokes (`u`): where its beam starts. */
const LENS_Y = 14.5;   // under the truss (8), its clamp and stem, and the can's body: the light comes out of the bulb
/** Where a par can hangs from its stem and tilts, down from the top of the room in strokes. */
const CAN_PIVOT_Y = 10;
/** Where a laser on the rig sits, down from the top of the room in strokes: in the truss itself,
 *  so its beams come out of the scaffolding (Peter, 5 Oct 2026: "a little bit under it"). */
const RIG_Y = 5;
/** Seconds the song's name and the instructions stay up, and how long they take to go. */
const INTRO_S = 4.5;
const INTRO_FADE_S = 0.8;
/** The mixer icon stays bright this long after it is used, then fades to a hint. */
const ICONS_AWAKE_S = 3;
const ICONS_ASLEEP = 0.18;
/** The walk-in: when the first pair sets off, how far apart the pairs go, and the pace (screen widths a second). */
const WALK_DELAY_S = 0.3;
const WALK_STAGGER_S = 0.3;
const WALK_SPEED = 0.26;
/** The mirror ball drops this long after the club appears: last of all, once the song's
 *  name and the instructions have faded (Peter, 3 Oct 2026). */
const BALL_ENTER_S = INTRO_S + INTRO_FADE_S;
/** The dancing: the first hero starts this many bars in, the rest join a bar apart, and each changes dance every few bars. */
const DANCE_START_BARS = 2;
const DANCE_JOIN_BARS = 1;
const DANCE_CHANGE_BARS = [4, 8];
const REFLECT_CLUB_ALPHA = 0.32;
const REFLECT_SQUASH = 0.72;   // as src/engine/reflections.js
const REFLECT_SCALE = 0.5;     // the cache's resolution against the screen's
const REFLECT_EVERY = 3;       // frames between refreshes of it
const MIX_K = 1.7;

/** The LED board: its size in dots, and what it says. */
export const LED_COLS = 72, LED_ROWS = 7;   // wider (Peter, 3 Oct 2026)
const LED_EQ_BARS = 24;           // the board as a graphic equaliser: bars of three dots (two lit, a gap)
const LED_HOLD_BARS = 4;          // each slogan's bars on the board
const LED_SCROLL_COLS_S = 22;     // how fast a scroller crosses, in dots a second
const LED_SCROLL_CHANCE = 0.35, LED_STYLE_CHANCE = 0.35;
const LED_RECENT = 12;            // lines not to repeat until this many others have been up
const LED_TEXT_CACHE_MAX = 24;    // older strips can be rebaked; keep phone canvas memory bounded
/** 5x7 capitals, digits and a little punctuation: each row a 5-bit mask, top to bottom. */
const LED_FONT = {
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30], E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17], I: [14, 4, 4, 4, 4, 4, 14],
  J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16], Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4], U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31],
  3: [31, 2, 4, 2, 1, 17, 14], 4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14],
  6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8], 8: [14, 17, 17, 14, 17, 17, 14],
  9: [14, 17, 17, 15, 1, 2, 12],
  ' ': [0, 0, 0, 0, 0, 0, 0], '!': [4, 4, 4, 4, 4, 0, 4], '?': [14, 17, 1, 2, 4, 0, 4],
  '-': [0, 0, 0, 31, 0, 0, 0], '.': [0, 0, 0, 0, 0, 12, 12], "'": [4, 4, 8, 0, 0, 0, 0],
  ':': [0, 12, 12, 0, 12, 12, 0], '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8], '/': [1, 1, 2, 4, 8, 16, 16],
};
/** A line of LED text's width in dots (five a letter, one between). */
const ledWidth = (text) => text.length * 6 - 1;
/** The Mexican wave: how far through its bar the last column starts, and each jump's length (bars). */
const WAVE_SPREAD = 0.75, WAVE_JUMP = 0.25;
/** The song's title, from a tap on the mirror ball: in, held, out (seconds). */
const TITLE_IN_S = 0.5, TITLE_HOLD_S = 4, TITLE_OUT_S = 1;
// the soles sit this far below the floor line on a 46-unit hero (the food court's REFLECT_SOLE_DROP)
const REFLECT_SOLE_DROP = 1.5;

/**
 * The heroes in skirts — Kiko's split dress, Clara's dress, Fernwick's tunic, Grumpos's kilt.
 * A dance's footwork flares a skirt out (Peter, 3 Oct 2026: not liked), so theirs keeps the
 * arms and the sway and swaps the legs for one of three small things, picked afresh at each
 * change of dance: TAP one foot on the beat, STAND with both feet planted, or HOP on the spot.
 * Grumpos only ever stands — arms going, feet planted, being grumpy about it.
 */
const SKIRTED = new Set(['kiko', 'clara', 'fernwick', 'grumpos']);
const ARMS_ONLY_HEROES = new Set(['grumpos']);

/** Now and then a hero sits a few bars out — back to the idle bob — before dancing again. */
const REST_CHANCE = 0.25;
const REST_BARS = [2, 4];
/**
 * Grumpos mostly stands there bopping, and only dances now and then (Peter, 3 Oct 2026):
 * he joins in standing, sits most changes out, for longer, and his dances are short.
 */
const GRUMPY = Object.freeze({ hero: 'grumpos', rest: 0.8, restBars: [4, 8], danceBars: [2, 3] });
/**
 * THE CROWD MOMENTS — things happen in the room: a beach ball bouncing across on the
 * heroes' heads, confetti, glow sticks thrown up. They come on the song's SECTION
 * CHANGES (Peter, 3 Oct 2026): confetti into a drop or a chorus, glow sticks into a
 * build, the beach ball into a breakdown, a verse or a middle 8 — and one at random only if
 * nothing has happened for a while. Silent: the music is the player's.
 */
const MOMENT_FOR = {   // 'big' is confetti (the CO2 jets were tried and taken out, Peter, 3 Oct 2026)
  drop: 'big', drop2: 'big', drop3: 'big', reprise: 'big', chorus: 'big',
  build: 'sticks', build2: 'sticks', preChorus: 'sticks',
  breakdown: 'ball', verse: 'ball', middle8: 'ball', groove: 'ball',
};
const MOMENT_QUIET_BARS = 16;
/** THE SMOKE MACHINE: a blast across the floor from one side, on a timer of its own. */
const SMOKE_FIRST_BARS = 10;
const SMOKE_GAP_BARS = [12, 20];
const SMOKE_S = 5;
export const CLUB_MOMENTS = Object.freeze(['ball', 'confetti', 'streamers', 'sticks']);
const MOMENT_S = { ball: 0, confetti: 4.2, streamers: 4.8, sticks: 3.2 };   // the ball runs on beats instead
/** How many glow sticks the crowd throws up (Peter, 5 Oct 2026: "more glow sticks"; it was 7), and on a slow device. */
const STICKS = 18, STICKS_LITE = 10;
const FLOOR_CONFETTI_MAX = 130;   // how much confetti may pool on the floor before somebody must clean it
const CLEAN_CHANCE = 0.5;         // the chance a confetti drop sends a cleaner (Dolores or the vacuum)
const BALL_BOUNCES = 12;   // laser beams thrown off the mirror ball, per corner beam
// The ball HOPS HEAD TO HEAD, from off the floor to off the floor (Peter, 5 Oct 2026: it only
// ever came down on one hero). And not like clockwork ("I don't want the ball to be that
// consistent... maybe vary height and skip more"): each crossing draws its own path when it
// starts — how many heroes each hop skips, how many beats it hangs in the air, how high it
// goes. A hop is BALL_HOP[step] for a step of 1–4 heroes: the beats it may take, so it
// always lands on a beat, and a longer hop has the time to go higher.
const BALL_HOP = { 1: [2], 2: [2, 4], 3: [4], 4: [4, 6] };
const BALL_STEP_WEIGHTS = [[1, 0.15], [2, 0.4], [3, 0.3], [4, 0.15]];
// Now and then a second, smaller ball follows the first a bar behind, landing on the bars the
// first is in the air (Peter, 5 Oct 2026: "smaller, perhaps 2 can go across one after the
// other occasionally").
const BALL_SPAWN_BEATS = 4;
const BALL_PAIR_CHANCE = 0.3;
const BALL_R = 0.3;   // of a hero's height (was 0.43 until 5 Oct 2026)
/**
 * THE RALLY (Peter, 5 Oct 2026). A tap on a beach ball knocks it back up, high, to come down
 * on a head nearer the middle of the floor, with a BOING a step up the song's scale; keep it
 * up for RALLY_SMASH taps and the last one smashes it into the mirror ball — CLANG, the ball
 * spins and flares, confetti. A second tap on the same ball within DOUBLE_TAP_S pops it.
 */
const RALLY_SMASH = 8;
const DOUBLE_TAP_S = 0.35;
const VOLLEY_H = [1.35, 1.7];   // a knock's height, in heroes
/**
 * THE SPEAKERS, THE RIG AND THE LASERS, played (Peter, 5 Oct 2026: "I LIKE THE SPEAKERS AND THE
 * LIGHTS AND THE LASERS"). A tap on a speaker drops a sub BOOM on the next beat — the cones punch
 * out, the room jolts; held longer than SPEAKER_HOLD_S it is a bass BOOST (the bass and the kick
 * up SPEAKER_BOOST, the cones pumping) and dragged up a WOBBLE on it, eighths, as deep as the drag.
 * A tap on a par can on the rig: the lights go crazy for LIGHT_SHOW_BEATS — every can and beam
 * bright, each its own colour and chasing each other round, the floor chasing with them. A
 * tap up in the room, over the heads: lasers fire from the stage and sweep up and out of the picture.
 */
const SPEAKER_HOLD_S = 0.25;
const SPEAKER_BOOST = 1.8;
const LIGHT_SHOW_BEATS = 8;
/**
 * The laser patterns a tap up top picks between (drawLaserSweep): the FLOOR's fans sweeping up
 * and out of the top, the CEILING's sweeping down and out of the bottom, the SHEET — a flat fan
 * from the truss turning on its side from pointing down, through edge-on (in your eyes), to
 * pointing up — the SCISSORS, two fans from the floor's corners crossing back and forth, and the
 * TUNNEL, a spinning cone of beams from the truss onto the floor. All from the truss or the floor.
 */
const LASER_PATTERNS = Object.freeze(['floor', 'ceiling', 'sheet', 'scissors', 'tunnel']);
/** A tapped laser pattern `k` of the way through, faded: the tap's last over its final `tail`,
 *  one with another to follow cut to it on the bar line in half a beat. */
const laserOut = (L, k, tail) => (L.last ? (k > 1 - tail ? (1 - k) / tail : 1) : Math.min(1, (1 - k) * LASER_SWEEP_BEATS * 2));
const LASER_SWEEP_BEATS = 8;   // each pattern two bars (Peter, 5 Oct 2026: "slower", then "double their length")
/** How many patterns one tap plays back to back, a new one on the bar line every LASER_SWEEP_BEATS
 *  (Peter, 5 Oct 2026: "double or repeat or cycle"): four bars of lasers a tap. */
const LASER_CYCLE = 2;
/** The moments that never happen under Lorenzo's water — and go when it comes in. */
const DRY_MOMENTS = Object.freeze(['ball', 'confetti', 'streamers', 'fountain']);
/** A tap on the MIRROR ball (not a drag): how fast it is set spinning, in turns of its phase a second. */
const BALL_TAP_SPIN = 34;
/** A held clap: how long the pad is held before its pattern starts — a tap is the one clap. */
const CLAP_HOLD_S = 0.3;
/** Four-bar strobe bursts, with 12–16 quiet bars between them. */
const STROBE_BARS = 4;
const STROBE_FIRST_BARS = 8;
const STROBE_GAP_BARS = [12, 16];
/** Two crisp pulses per heard beat; no flashing outside the burst or in reduced motion. */
export function strobePulse(beat, startBeat, reduced = false) {
  const age = beat - startBeat;
  if (reduced || !Number.isFinite(age) || age < 0 || age >= STROBE_BARS * 4) return 0;
  const phase = (age * 2) % 1;
  return Math.max(0, 1 - phase / 0.24) * Math.min(1, (STROBE_BARS * 4 - age) * 2);
}
/** A held move tapped rather than held still plays for this much of a bar. */
const MIN_HOLD_BARS = 0.5;
/** How far a held hero is dragged for the whole of its range, in hero heights. */
const DRAG_SPAN = 1.6;
/** The snare roll under Fernwick's draw: a hit every 4, then 2, then every sixteenth, a bar each. */
const ROLL_EVERY = [4, 2, 1];
/** A floor pad's flash on its tile and its word over the floor (seconds). */
const PAD_FLASH_S = 0.45, PAD_WORD_S = 0.8;
/** Grumpos's echo, drawn: each ghost is seen until the next repeat (his echo's `every`, in beats). */
const GHOST_BEATS = 0.75;
/**
 * LORENZO'S FISH (Peter, 5 Oct 2026: "if we hold down the flood effect on lorenzo enough, a fish
 * should swim past"): every FISH_EVERY_BEATS he stays held, fish swim across the flooded room —
 * FISH_SHOAL says how many at once, each one of the seven (club-fish.js, in cut paper: "i want
 * to use all of them randomly.. perhaps even 2 at a time or more"), a beat or so apart, each the
 * other way to the last, taking FISH_CROSS_BEATS. Let go and the water drains — and any fish
 * still in the room dives for the floor before it does, FISH_DIVE_S, and is gone through it with
 * a splash: down the drain, and every drain leads to the sea. The first shoal sets off as his
 * card starts to fade (CAPTION_FADE_BEATS; Peter, 5 Oct 2026), the rest FISH_EVERY_BEATS apart.
 */
const FISH_EVERY_BEATS = 8;
/** A move's card is up four beats; it starts to fade this far in (drawCaption). */
const CAPTION_FADE_BEATS = 2.8;
const CAPTION_BEATS = 4;
const FISH_CROSS_BEATS = 6;
const FISH_DIVE_S = 0.55;
const FISH_SPLASH_S = 0.7;
/** How many fish come at once: [how many, its chance]. */
const FISH_SHOAL = Object.freeze([[1, 0.45], [2, 0.35], [3, 0.2]]);
/**
 * THE BABY SHARK (Peter, 5 Oct 2026: "what if a baby shark followed the main shark"): the PARTY
 * SHARK never swims alone — a little one, BABY_SHARK of its size, follows it across BABY_SHARK_BEATS
 * behind, a touch lower in the water, its tail going twice as fast.
 */
const BABY_SHARK = 0.45, BABY_SHARK_BEATS = 0.75;

/** A fresh order of the heroes on the floor: anyone may stand anywhere (Peter, 5 Oct 2026). */
function shuffledFloor(n, random = Math.random) {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

const hash = (a, b, n) => { const v = Math.sin(a * 91.7 + b * 47.3 + n * 13.1) * 43758.5; return v - Math.floor(v); };

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function releaseCanvas(canvas) {
  if (!canvas || typeof canvas.width !== 'number' || typeof canvas.height !== 'number') return;
  try { canvas.width = canvas.height = 0; } catch {}
}

// The part icons: a drum, a bass wave, keys, a note.
const ICON = {
  drums: (g, x, y, r) => {
    g.beginPath(); g.ellipse(x, y - r * 0.28, r * 0.55, r * 0.2, 0, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(x - r * 0.55, y - r * 0.28); g.lineTo(x - r * 0.55, y + r * 0.3);
    g.ellipse(x, y + r * 0.3, r * 0.55, r * 0.2, 0, Math.PI, 0, true); g.lineTo(x + r * 0.55, y - r * 0.28); g.stroke();
  },
  bass: (g, x, y, r) => {
    g.beginPath();
    for (let k = 0; k <= 16; k++) {
      const px = x - r * 0.6 + k / 16 * r * 1.2;
      const py = y + Math.sin(k / 16 * Math.PI * 2) * r * 0.32;
      if (k) g.lineTo(px, py); else g.moveTo(px, py);
    }
    g.stroke();
  },
  chords: (g, x, y, r) => { for (const dx of [-0.42, 0, 0.42]) g.strokeRect(x + dx * r - r * 0.17, y - r * 0.45, r * 0.34, r * 0.9); },
  lead: (g, x, y, r) => {
    g.beginPath(); g.ellipse(x - r * 0.18, y + r * 0.32, r * 0.22, r * 0.16, -0.4, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(x + r * 0.03, y + r * 0.3); g.lineTo(x + r * 0.03, y - r * 0.5);
    g.quadraticCurveTo(x + r * 0.35, y - r * 0.35, x + r * 0.42, y - r * 0.1); g.stroke();
  },
};

export class BangerClubState {
  static portraitMode = 'frame';
  static tameSkirtForTest = tameSkirt;

  /** `rec` is the kept song to play; `onBack` is where the back button goes. */
  /** `onEdit(rec)` is the pencil: the riff grid on this song, to change it and remake it. */
  /** `pending` is a song not kept yet — `{ kind: 'new'|'edit'|'starter', song }` — with a SAVE
   *  button beside the pencil and a save-or-not prompt on the way out. `onSave(asNew)` keeps it
   *  and returns the kept recipe; a successful save from the Back prompt also calls `onBack`.
   *  `onDiscard()` leaves without saving. */
  constructor({ rec, onBack, onEdit = null, pending = null, onSave = null, onDiscard = null }) {
    this.rec = rec;
    this.onBack = onBack;
    this.onEdit = onEdit;
    this.pending = pending;
    this.onSave = onSave;
    this.onDiscard = onDiscard;
    this.bakes = new Map();
  }

  enter() {
    this.t = 0;
    this.song = this.pending ? this.pending.song : songFor(this.rec);
    this.savePrompt = null;    // { options: [{label, asNew, discard}], sel } while it asks
    // Moves run on the AUDIO clock, not a beat count: the song loops, and its step count
    // goes back to the top when it does.
    this.queued = null;        // { i, when, bar } — a hero waiting for the beat they go on
    this.acting = null;        // { i, when, bar } — a hero doing their move, from `when`
    this.caption = null;       // { i, when, bar }
    this.holding = null;       // { i, source } — a held move, while its hero is held down
    // Each part's fader, 0–1 (club-fx.js setPartLevel). 0 is NO DRUMS.
    this.levels = Object.fromEntries(PARTS.map((p) => [p.id, 1]));
    this.mixerOpen = false;
    this.mixSel = 0;           // the fader the keys move
    this.dragging = null;      // the fader under the finger
    this.popup = null;         // { text, t }
    this.iconsAt = 0;          // when the mixer was last used
    this.ballAt = Infinity;    // when the ball last started its drop
    this.titleAt = -Infinity;  // when the ball was last tapped for the song's title
    this.lite = false;         // the lighter room for a slow device (update)
    this.frameMs = 16;
    this.led = null;           // the LED board's line now: { text, scroll, start, dur }
    this.ledRecent = [];
    this.ballScale = 0.85 + Math.random() * 0.3;   // a slightly different ball every visit
    // When the club came out from behind the screen transition: the walk-in, the ball's
    // drop and the intro run from here, so none of them happens behind the shutter.
    this.shownAt = null;
    // THE DANCING: each hero's eight regular gallery dances, plus Lorenzo's occasional
    // moonwalk; the order they join in (random), and, once joined, the dance they are on and
    // when they next change it.
    this.dancers = HERO_MOVES.map((m) => ({
      moves: HERO_DANCE_LAB_CANDIDATES.filter((d) => d.hero === m.hero),
      move: null, joinAt: Infinity, changeAt: Infinity, resting: false, last: null, legs: 'stand',
      hero: m.hero, skirted: SKIRTED.has(m.hero),
    }));
    // Who stands where: slot k of the floor holds hero formationOrder[k] — left to right, and
    // in portrait the back row first. Drawn afresh every visit, holds and taps mixed.
    this.formationOrder = shuffledFloor(HERO_MOVES.length);
    this.formationSwap = null;
    this.formationShuffleAt = Infinity;
    this.danceOrder = HERO_MOVES.map((_, i) => i).sort(() => Math.random() - 0.5);
    this.moments = [];         // the crowd moments in the room now
    this.momentAt = Infinity;  // when the next one comes
    this.smokeAt = Infinity;   // when the smoke machine next goes off
    this.strobeBeat = -Infinity;
    this.strobeNextBeat = Infinity;
    this.reduceMotion = typeof window !== 'undefined'
      && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.lastMoment = null;
    this.partyNextBeat = 32;
    this.partyTurn = 0;
    this.cleanerBeat = Infinity;
    this.cleanerKind = 'cleaner';
    this.floorConfetti = [];   // what the last confetti drop left on the floor
    this.sweeping = null;
    this.cleanerCooldown = -Infinity;
    this.lastDropCue = null;
    this.dropJumpNext = true;
    this.lastSoloHero = -1;
    this.lastSignTap = -Infinity;
    this.lastLedTap = -Infinity;
    this.skipTo = null;        // the section a double-tap on the sign has queued, until it lands
    this.seekBeat = null;      // the song's beat last frame, to see a seek land (followSeek)
    this.skipLit = null;       // { dir, until }: the transport skip button lit until its jump is heard
    this.paused = false;       // the transport's PAUSE (Audio.setPlayerPaused)
    this.section = null;       // the section of the song playing, by index into its form
    this.waveAt = -Infinity;   // when the last Mexican wave started (on the song's loop)
    this.lastBeat = null;
    this.focus = 0;            // keyboard / pad focus: the floor's slots, then the part icons, then back
    this.boxes = { heroes: [], mixer: null, transport: [], panel: null, faders: [], sounds: [], reset: null, back: null, ball: null, led: null, floor: null };
    // The sound swaps: B-33P's 8-BIT and the mixer's sound buttons (club-voices.js).
    this.voices = new ClubVoices(this.song, this.rec);
    this.padHits = [];         // floor pads struck: { pad, x, y, when (audio), t }
    // the air horn's bake-off: ?airhorn=<letter> plays that variant (club-hits.js HORN_VARIANTS)
    this.hornVariant = typeof window !== 'undefined' && typeof URLSearchParams !== 'undefined'
      ? (new URLSearchParams(window.location?.search || '').get('airhorn') || '').toUpperCase() || null : null;
    this.seenTouches = new Set();   // the fingers on the glass already answered for (update)
    this.clapHold = null;      // the clap pad held: { touch, since, firstWhen, x, y, step, barN, fillIn, fill }
    this.gateBar = null;       // the bar line the 8-bit gate last looked at, and whether it is chopping
    this.gating = false;
    this.ballSpots = [];       // where each beach ball was drawn last frame: what a tap is tested against
    this.rally = 0;            // taps on the beach ball since it came on
    this.lastBallTap = null;   // { m, n, t, x, y, r } — a second tap soon after is a double: it pops
    this.smash = null;         // the rally's last knock, on its way to the mirror ball: { m, n, t }
    this.flinch = null;        // a hero under a ball that popped: { x, t }
    this.spinPhase = 0;        // the mirror ball spun round by a smash or a finger: extra turn, and how fast
    this.spinV = 0;
    this.ballSwing = { a: 0, va: 0, stretch: 1, vs: 0 };   // ...swung on its wire: angle (rad), stretch, and their speeds
    this.ballGrab = null;      // ...held: { touch, dx, dy, lastX, vSpin } while a finger has it
    this.ballAnchor = null;    // where its wire hangs from, as last drawn: { x, y, len, r }
    this.mirrorFlashAt = -Infinity;
    this.buttonsAt = -Infinity; // the floor woke the bottom buttons: a tap on it, or the pointer over it
    this.echoes = [];          // Grumpos's boomerangs in flight: { when (audio, the beat thrown), wet, feedback }
    this.throwing = null;      // ...and held: { i, held, step (the next 2 or 4), first, until } while he throws
    this.stops = [];           // Kiko's tape stops, booked: { from, until, hits } (audio) — the room goes dark across each
    this.stopping = null;      // ...and held: { i, held, step (where the next may come), firstUntil, until } while he stops it
    this.fish = [];            // Lorenzo's fish: { born (audio), dir, h, look, dive: { at, x, y } | null, splashed }
    this.doloresSpot = null;   // where Dolores was drawn last frame: what a tap on her is tested against
    this.speakerHold = null;   // a finger on a speaker: { touch, t0, y0, boosted } until it lifts
    this.boost = null;         // ...held: { lanes, lfo, depth } while the bass is boosted
    this.boomAt = -Infinity;   // ...tapped: when its BOOM lands (audio) — the cones punch, the room jolts
    this.lightShow = null;     // a par can tapped: { col, at (audio) } — the room in its colour
    this.laserSweep = null;    // up top tapped: { col, at (audio), dir } — the truss lasers across the room
    this.laserTurn = 0;
    this.punch = null;         // Ramon's stutter: { grab (beat), slice (beats) } — the dancers loop with it
    this.bow = null;           // Fernwick's draw: { riser, step0, rollStep, until } while it builds
    this.landing = null;       // ...and the drop it lands: { at (audio), section } until it is heard
    this.crowd = null;         // ...and the crowd's crouch and jump for it: { since, release, land } (audio times)
    this.speedBack = null;     // Rusty let go: { notBefore } until the song's own speed is back on a beat
    this.layout = null;        // the floor's measures, from the last draw (the drag's scale)
    Audio.setBank(this.song.bank, this.song.mix, this.song.arrangement, { startAtBeginning: true });
    this.mixerDirty = false;
    this.restoreMixer();
    Input.setMenuButtons();
    // Into the whole-screen frame now, behind the closed shutter, so the switch is never seen.
    this.fitScreen();
  }

  /** The pencil: off to the riff grid with this song. */
  edit() {
    if (!this.onEdit) return;
    this.onEdit(this.rec, this.pending);
  }

  /** The song's title, fading in under the mirror ball for a while: a tap on the club sign. */
  showTitle() {
    const k = this.t - this.titleAt;
    // tapped again while it is up, it stays up rather than fading out and in again
    this.titleAt = k > TITLE_IN_S && k < TITLE_IN_S + TITLE_HOLD_S ? this.t - TITLE_IN_S : this.t;
  }

  fitScreen() {
    if (typeof window === 'undefined') return;
    // Against the 16:9 picture (W x 270), not the live W/H: in portrait H is the tall frame's,
    // and a window a hair wider than that frame turned the cover crop on, which put the
    // landscape frame back, which turned it off — the floor flicking between the two layouts
    // every frame (seen in headless Chromium at 390x844, 5 Oct 2026).
    setVisualiserFullscreen(window.innerWidth / Math.max(1, window.innerHeight) > W / 270 + 0.01);
  }

  // The song plays on back in the Lab (Peter, 3 Oct 2026) — with every part back in and no
  // move left on — and stops there when it is chosen again or the Lab is left.
  exit() {
    setVisualiserFullscreen(false);
    // a pause belongs to this room: the Lab carries on playing the song
    if (this.paused) { this.paused = false; Audio.setPlayerPaused(false); }
    if (this.mixerDirty) this.saveMixer();
    // A kept song goes on playing as it was left — its sounds and 8-BIT are kept with it (store.js
    // keepMixer), and the Lab plays it so — and one not kept goes back to its own instruments.
    // Fernwick's riser faded, and the rest put back (releaseClub).
    if (this.pending || !this.rec) this.voices?.release();
    this.bow?.riser?.stop();
    this.bow = null;
    releaseClub(this.song);
    this.releaseRenderResources();
  }

  /** Drop this room's private backing stores as soon as the player leaves it. */
  releaseRenderResources() {
    for (const value of this.bakes.values()) {
      releaseCanvas(value?.getContext ? value : value?.canvas || value?.img || value?.c);
    }
    this.bakes.clear();
    for (const sprite of this.heroSprites || []) releaseCanvas(sprite?.canvas);
    releaseCanvas(this.reflectCache?.canvas);
    releaseCanvas(this.hazeLayer);
    this.heroSprites = [];
    this.reflectCache = null;
    this.hazeLayer = null;
    this.moments = [];
    this.floorConfetti = [];
    this.ballHits = [];
    this.fish = [];
    this.echoes = [];
  }

  /** Now, on the clock moves are scheduled on, as heard — or the screen's own clock. */
  heardNow() {
    return Audio.ctx ? Audio.ctx.currentTime - Audio.heardLatencySec() : this.t;
  }

  /** Seconds in a bar of this song. */
  barSeconds() {
    return (4 * 60) / ((this.song.bpm || 120) * (Audio.tempo || 1));
  }

  /** The beat the music is on, as heard — the room moves to this. */
  beat() {
    const b = Audio.songBeat();
    return Number.isFinite(b) ? b : this.t * (this.song.bpm || 120) / 60;
  }

  /** The beat (on the clock beat() reads) that audio time `when` will be heard on. */
  beatAt(when) {
    return this.beat() + (when - this.heardNow()) * 4 / this.barSeconds();
  }

  /** Where in the song the heard beat is: the engine's count, round the song's length. */
  songPos() {
    const bars = (this.song.form || []).reduce((m, f) => Math.max(m, f.to || 0), 0);
    const b = this.beat();
    return bars > 0 ? ((b % (bars * 4)) + bars * 4) % (bars * 4) : b;
  }

  // ------------------------------------------------------------------ input
  /**
   * A hero pressed. A held move goes in on the next sixteenth and stays while `source`
   * (the pointer, or the key that pressed it) is held; a trigger waits for the next beat.
   */
  pressHero(i, source = 'pointer') {
    if (this.paused) return;   // the floor holds still under a pause
    if (this.holding) this.letGo();
    // Grumpos's last throws and Kiko's last stops end for another hero's move: one booked after
    // it would cut it
    if (this.throwing && this.throwing.i !== i) this.throwing = null;
    if (this.stopping && this.stopping.i !== i) this.stopping = null;
    const move = HERO_MOVES[i];
    if (!move.hold) { this.tapHero(i); return; }
    const at = nextSixteenthAt();
    const bar = at ? 16 * at.spb : this.barSeconds();
    const when = at ? at.when : this.heardNow();
    this.queued = { i, when, bar, dur: Infinity };
    // `min` is the earliest it may come out: a tap still gets half a bar of it. A drag is
    // measured from where the finger went down (`y0`); `delta` is how far, ±1 the whole range.
    // On glass the hold is THIS finger's (`touch`, the newest down): another finger tapping
    // the floor's pads meanwhile neither moves the drag nor keeps the hold alive.
    const touch = source === 'pointer' && Input.touches?.size ? [...Input.touches.keys()].at(-1) : null;
    this.holding = { i, source, touch, min: when + bar * MIN_HOLD_BARS, y0: Input.pointer?.y ?? 0, delta: 0 };
    if (move.speeds) this.speedBack = null;
    this.holding.held = startHold(move, at, Math.random, { song: this.song, levels: this.levels });
    if (move.slices) this.punch = { grab: this.beatAt(when), slice: move.slices[this.holding.held.slice] };
    if (move.draw) this.drawBow(move, at, when);
    if (move.backbeat) {
      // Grumpos: the first throw on the next 2 or 4, and one on every 2 and 4 after (throwsOn)
      const first = nextTwoOrFourAt();
      this.throwing = { i, held: this.holding.held, step: first ? first.step : null, first: first ? first.when : when, until: Infinity };
    }
    if (move.stops) {
      // Kiko: the first stop is the tap's, on the next 2 or 4 by its plan (kikoPlan); held, the
      // tape stops again from its end, as the drag says (stopsOn). He acts from the stop.
      const first = landingFor(move);
      if (first) {
        playMove(move, first);
        const until = first.when + moveSeconds(move, first.spb, first.plan);
        this.stops = [...this.stops.filter((x) => this.heardNow() < x.until + 0.5), { from: first.when, until, hits: first.plan?.hits || 1 }];
        this.queued.when = first.when;
        this.queued.plan = first.plan;
        this.stopping = { i, held: this.holding.held, step: first.step + Math.round((until - first.when) / first.spb), firstUntil: until, until: Infinity };
      }
    }
    // Lorenzo held again while his water drains: the room floods again, fish and all
    if (move.drain) this.fish = this.fish.filter((f) => f.dive);
  }

  /**
   * GRUMPOS, HELD: a throw on every 2 and 4 (club-fx.js throwBeat), booked a moment ahead in
   * time order, until the beat he was let go on — the first always, so a tap is one throw.
   * Each throw's echoes are seen as ghosts (drawEchoGhosts), as loud as the drag has them.
   */
  throwsOn() {
    const w = this.throwing, ctx = Audio.ctx;
    if (!w) return;
    if (!ctx || w.step == null || !Number.isFinite(Audio.nextTime)) { if (w.until !== Infinity) this.throwing = null; return; }
    const spb = this.barSeconds() / 16;
    for (let n = 0; n < 4; n++) {
      let t = stepTime(w.step);
      if (t == null) return;
      // a long frame or a seek left the count behind: on from the next 2 or 4
      if (t < ctx.currentTime - 0.05 || t > ctx.currentTime + 2 * this.barSeconds()) {
        const at = nextTwoOrFourAt();
        if (!at) return;
        w.step = at.step; t = at.when;
      }
      if (t > ctx.currentTime + 0.08) return;
      if (t >= w.until) { this.throwing = null; return; }
      throwBeat(w.held, t, spb);
      const beatS = 4 * spb, e = HERO_MOVES[w.i].echo;
      this.echoes = [...this.echoes.filter((x) => this.heardNow() <= x.when + (e.repeats + 1) * e.every * beatS),
        { when: t, ...echoLevel(w.held) }];
      w.step += 8;
    }
  }

  /**
   * KIKO, HELD: after the tap's own stop, the tape stops again on the pattern the drag has
   * (club-fx.js HERO_MOVES `stops`), each booked a moment ahead in time order (stopTape), until
   * the beat he was let go on. The room goes dark across each stop and the lights slam back on
   * with the music (drawMoveRoom), and the dancers wind down with it (danceBeat).
   */
  stopsOn() {
    const w = this.stopping, ctx = Audio.ctx;
    if (!w) return;
    if (!ctx || w.step == null || !Number.isFinite(Audio.nextTime)) { if (w.until !== Infinity) this.stopping = null; return; }
    const move = HERO_MOVES[w.i];
    const spb = this.barSeconds() / 16;
    for (let n = 0; n < 8; n++) {
      const pattern = move.stops[w.held?.stop ?? move.stopStart ?? 0];
      const step = nextStopStep(w.step, pattern);
      const t = stepTime(step);
      if (t == null) return;
      // a long frame stepped over it, or a seek moved the count: on from where the music is
      if (t < ctx.currentTime - 0.05) { w.step = step + 1; continue; }
      if (t > ctx.currentTime + 2 * this.barSeconds()) { w.step = Audio.step; continue; }
      if (t > ctx.currentTime + 0.08) return;
      if (t >= w.until) { this.stopping = null; return; }
      const until = stopTape(move, t, spb, pattern[2]);
      if (until == null) return;
      this.stops = [...this.stops.filter((x) => this.heardNow() < x.until + 0.5), { from: t, until, hits: 1 }];
      // let go already: he acts until the last stop's music is back
      if (this.acting?.i === w.i && Number.isFinite(this.acting.dur)) this.acting.dur = Math.max(this.acting.dur, until - this.acting.when);
      w.step = step + Math.max(1, Math.round(pattern[2] * 4));
    }
  }

  /**
   * LORENZO'S FISH (FISH_EVERY_BEATS): one more in the flooded room every so long he is held,
   * each across the room the other way. Let go and every fish still swimming dives for the
   * floor as the water starts to go (his `drain`), splashing through it with a bloop.
   */
  fishOn() {
    const a = this.acting, move = a && HERO_MOVES[a.i];
    const now = this.heardNow(), beatS = this.barSeconds() / 4;
    const flooded = !!move?.drain && !a.drain && now >= a.when;
    if (flooded) {
      const since = now - a.when - CAPTION_FADE_BEATS * beatS;
      const due = since < 0 ? 0 : 1 + Math.floor(since / (FISH_EVERY_BEATS * beatS));
      while ((a.fishN ?? 0) < due) {
        a.fishN = (a.fishN ?? 0) + 1;
        this.shoal(now, beatS);
      }
    }
    for (const f of this.fish) {
      // a fish not yet in the room when the water goes never comes; one in it dives — each a
      // moment after the last, so the bloops run down the shoal
      if (!flooded && !f.dive && now < f.born) f.gone = true;
      if (!flooded && !f.dive && !f.gone && now - f.born < FISH_CROSS_BEATS * beatS) {
        f.dive = { at: Math.max(now, move?.drain && a.drain ? a.drain.from : now) + f.lag };
      }
      if (f.dive && f.splashed == null && now >= f.dive.at + FISH_DIVE_S) {
        f.splashed = now;
        if (Audio.ctx && Audio.musicBus) playToy(Audio.ctx, Audio.musicBus, 'bloop', Audio.ctx.currentTime);
      }
    }
    this.fish = this.fish.filter((f) => !f.gone && (f.splashed != null ? now - f.splashed < FISH_SPLASH_S
      : !!f.dive || now - f.born < FISH_CROSS_BEATS * beatS));
  }

  /**
   * A shoal into the flooded room: FISH_SHOAL's how many, each a different one of the seven and
   * not the last one seen, a beat or so apart at heights of their own, each the other way to
   * the one before — and the PARTY SHARK's baby after it (BABY_SHARK).
   */
  shoal(now, beatS, random = Math.random) {
    let q = random(), n = 1;
    for (const [k, w] of FISH_SHOAL) { if ((q -= w) < 0) { n = k; break; } }
    const kinds = [];
    while (kinds.length < n) {
      const k = Math.floor(random() * FISHES.length);
      if (!kinds.includes(k) && k !== this.lastFish) kinds.push(k);
    }
    this.lastFish = kinds.at(-1);
    const band = random();
    kinds.forEach((kind, j) => {
      this.fishCount = (this.fishCount ?? 0) + 1;
      const f = {
        kind, born: now + j * beatS * (0.6 + random() * 0.8),
        dir: this.fishCount % 2 ? 1 : -1,
        // heights spread through the water over the heroes, a shoal's apart
        h: (band + j / n) % 1,
        lag: j * 0.12 + random() * 0.08, dive: null, splashed: null,
      };
      this.fish.push(f);
      if (FISHES[kind]?.name === 'PARTY SHARK') {
        this.fish.push({ ...f, baby: true, born: f.born + BABY_SHARK_BEATS * beatS, h: Math.min(1, f.h + 0.12), lag: f.lag + 0.06 });
        this.showLed('DOO DOO DOO');   // (Peter, 5 Oct 2026: "less obvious")
      }
    });
  }

  /**
   * Fernwick draws: the riser and the snare roll start on the sixteenth (club-hits.js), and
   * the crowd starts to sink into a crouch — on its own clock, as the drop will be a seek.
   */
  drawBow(move, at, when) {
    const ctx = Audio.ctx;
    const seconds = (move.drawBars || 4) * this.barSeconds();
    const tonic = typeof Audio.songTonic === 'function' ? Audio.songTonic(0) : null;
    this.bow?.riser?.stop();
    this.bow = {
      riser: ctx && at && Audio.musicBus ? startRiser(ctx, Audio.musicBus, when, seconds, { tonic: tonic || 220 }) : null,
      step0: at ? at.step : 0, rollStep: at ? at.step : 0, until: null,
    };
    this.crowd = { since: this.heardNow(), release: null, land: null };
    this.landing = null;
  }

  /**
   * Fernwick lets go: the arrow lands on the next bar line. The song jumps there to its next
   * drop or chorus (dropTarget), the bow's filter opens on it, the riser and the roll stop dead
   * on it, and the crowd — crouched while he drew — jumps on it.
   */
  loose(h) {
    const at = nextBarAt();
    const end = at ? at.when : this.heardNow();
    endHold(at, h.held);
    const form = this.song.form || [];
    const target = this.dropTarget();
    if (at && target != null && form[target]) {
      Audio.setStepAtBoundary((form[target].from - 1) * 16);
      this.skipTo = target;
    }
    this.landing = { at: end, section: target };
    if (this.bow) { this.bow.riser?.land(end); this.bow.until = end; }
    if (this.crowd) { this.crowd.release = this.heardNow(); this.crowd.land = end; }
    for (const m of [this.queued, this.acting]) if (m && m.i === h.i && m.dur === Infinity) m.dur = Math.max(0, end - m.when);
  }

  /** Where Fernwick's drop lands: the song's next drop or chorus, round to the top — this
   *  one again if it is the only one — or, in a song with none, simply its next section. */
  dropTarget() {
    const form = this.song.form || [];
    if (!form.length) return null;
    const cur = this.skipTo ?? this.section ?? -1;
    const at = (k) => (((cur + k) % form.length) + form.length) % form.length;
    for (let k = 1; k <= form.length; k++) if (MOMENT_FOR[form[at(k)].role] === 'big') return at(k);
    return at(1);
  }

  /** The drop is heard: confetti and streamers, and the strobe. Once. */
  dropLanded() {
    if (!this.landing) return;
    this.landing = null;
    this.bow = null;
    this.startMoment('confetti', { streamers: true });
    this.momentAt = this.t + this.barSeconds() * MOMENT_QUIET_BARS;
    if (!this.reduceMotion) {
      this.strobeBeat = Math.floor(this.beat());
      this.strobeNextBeat = Math.max(this.strobeNextBeat, this.strobeBeat + 4 * (STROBE_BARS + STROBE_GAP_BARS[0]));
    }
  }

  /** The crowd's crouch and jump for Fernwick's draw, on its own clock: a `draw` moment (club-party.js) and its age. */
  crowdMotion() {
    const c = this.crowd;
    if (!c) return null;
    const bps = 4 / this.barSeconds();
    const age = (this.heardNow() - c.since) * bps;
    const releaseAge = c.release == null ? null : (c.release - c.since) * bps;
    const jumpAt = c.land == null ? null : Math.max(releaseAge ?? 0, (c.land - c.since) * bps);
    return { m: { kind: 'draw', beat0: 0, beats: jumpAt == null ? Infinity : jumpAt + 1, jumpAt, releaseAge }, age };
  }

  /** The held hero let go: the effect out on the next beat. */
  letGo() {
    const h = this.holding;
    this.holding = null;
    if (!h) return;
    const move = HERO_MOVES[h.i];
    if (move.draw) { this.loose(h); return; }
    // Out on the next BEAT after the release, so it ends with the music rather than
    // wherever the finger lifted (Peter, 3 Oct 2026) — it went in on a sixteenth, at once.
    let at = nextBeatAt();
    // Let go too soon (a tap): it stays in until its half bar is up
    // ...and still out on a beat: the first one at or after it.
    if (at && at.when < h.min - 1e-4) {
      const beatS = 4 * at.spb;
      at = { ...at, when: at.when + Math.ceil((h.min - at.when) / beatS - 1e-6) * beatS };
    }
    const end = at ? at.when : Math.max(this.heardNow(), h.min);
    // Rusty's speed comes back on that beat too, but a transport warp cannot be booked at an
    // audio time: update() makes it in the frame where the next step to schedule is the beat.
    // Grumpos throws up to it (throwsOn) — and once, however soon he was let go.
    let out = null;
    if (move.speeds) this.speedBack = { notBefore: Math.max(h.min, this.heardNow()) };
    else if (move.backbeat) { if (this.throwing?.i === h.i) this.throwing.until = Math.max(end, this.throwing.first + 1e-3); }
    else if (move.stops) {
      // Kiko: a tap is the one stop; held, no stop starts from the next beat on, and he acts
      // until the music is back from the last
      if (this.stopping?.i === h.i) {
        const back = Math.max(nextBeatAt()?.when ?? this.heardNow(), this.stopping.firstUntil);
        this.stopping.until = back;
        out = Math.max(back, ...this.stops.map((x) => x.until));
      }
    }
    else out = endHold(at, h.held);
    // Lorenzo's water drains from that beat (club-fx.js endHold): the move lasts until it has
    const drain = move.drain && out != null && out > end ? { from: end, until: out, level: h.held?.level ?? move.drag.start } : null;
    const over = drain ? drain.until : move.stops && out != null ? out : end;
    for (const m of [this.queued, this.acting]) {
      if (!m || m.i !== h.i || m.dur !== Infinity) continue;
      m.dur = Math.max(0, over - m.when);
      if (drain) m.drain = drain;
    }
  }

  tapHero(i) {
    const move = HERO_MOVES[i];
    const at = landingFor(move);
    const bar = at ? 16 * at.spb : this.barSeconds();
    const when = at ? at.when : this.heardNow() + (1 - (((this.beat() % 1) + 1) % 1)) * bar / 4;
    // `bar` is a bar of this song (the caption's clock); `dur` is how long the move lasts.
    this.queued = { i, when, bar, dur: at ? moveSeconds(move, at.spb, at.plan) : bar * (move.bars || 1), plan: at?.plan || null };
    if (move.toggle) {
      // B-33P: the band onto the 8-Bit set (or back) from the next bar line — club-voices.js
      // makes the swap; the caption says which way it went.
      const on = this.voices.toggle();
      const hifi = this.voices.eightBit;
      this.queued.title = on === !hifi ? '8-BIT' : 'HI-FI';
      this.queued.what = on ? (hifi ? 'the band leaves 8-bit, tap again to go back' : move.what)
        : (hifi ? 'the band is back on 8-bit' : 'the band is back in HD');
      return;
    }
    if (move.echo) this.echoes = [...this.echoes, { when, ...echoLevel(null) }];
    // the moment the music comes back after Kiko's tape stop: the lights slam back on with it
    if (move.onTwoOrFour) this.lightsBack = when + this.queued.dur;
    if (at) playMove(move, at, { song: this.song, levels: this.levels });
  }

  /** A fresh path for one ball across a row of `perRow` heroes: hops of { k, beats, h }, k the
   *  hero it lands on counted in the order it travels (-1 before the first, perRow past the
   *  last: off the floor), `beats` the hop's length and `h` its height in heroes. */
  static ballHops(perRow) {
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    const step = () => { let q = Math.random(); for (const [n, w] of BALL_STEP_WEIGHTS) if ((q -= w) < 0) return n; return 2; };
    // heights in heroes, kept under the old big bounce (1.25) so it stays below the LED sign
    const hop = (k, beats) => ({ k, beats, h: Math.max(0.4, Math.min(1.3, (0.35 + beats * 0.17) * (0.6 + Math.random() * 0.8))) });
    const hops = [{ k: -1, beats: 0, h: 0 }];
    for (let k = Math.floor(Math.random() * 3); k < perRow; k += step()) {
      hops.push(hop(k, hops.length === 1 ? pick([2, 4]) : pick(BALL_HOP[Math.min(4, k - hops[hops.length - 1].k)])));
    }
    hops.push(hop(perRow, pick([2, 4])));
    return hops;
  }

  /**
   * Ball `n` of crossing `m` as points on the floor: { x, at (beats from its start), h, head }
   * — or, once the ball has been knocked about by a tap, its own (`m.points`), whose points may
   * also carry `lift`: how high over the heads they are, in heroes.
   */
  ballPath(m, n, r) {
    if (m.points?.[n]) return m.points[n];
    const { heroL, cellW, perRow } = this.ballLayout || { heroL: 4, cellW: (W - 8) / 8, perRow: 8 };
    const off = 2 * r + 4;
    let at = 0;
    return m.paths[n].map(({ k, beats, h }) => {
      at += beats;
      const head = k >= 0 && k < perRow;
      const x = head ? heroL + cellW * ((m.dir > 0 ? k : perRow - 1 - k) + 0.5)
        : (k < 0) === (m.dir > 0) ? -off : W + off;
      return { x, at, h, head };
    });
  }

  /** The beach ball under a point, as it was last drawn: its spot, or null. */
  /**
   * A tap on Dolores while she sweeps (club-party.js m.quit): she flings the broom away, dances
   * where she stands, then runs off the nearer side — or, dancing already, keeps at it for
   * DOLORES_DANCE_BEATS from now. The LED board says so. True when she took the tap.
   */
  tapDolores(x, y) {
    const s = this.doloresSpot;
    if (!s?.m || !this.moments.includes(s.m)) return false;
    if (Math.abs(x - s.x) > s.h * 0.34 || y < s.floor - s.h * 1.05 || y > s.floor + s.h * 0.08) return false;
    const m = s.m, beat = this.beat(), age = partyAge(m, beat);
    if (!partyAlive(m, beat)) return false;
    if (s.running) return true;   // on her way out: nothing will stop her now
    const was = m.beats;
    if (m.quit) m.quit.dance = Math.max(m.quit.dance, age - m.quit.from - DOLORES_FLING_BEATS + DOLORES_DANCE_BEATS);
    else {
      m.quit = { from: age, dance: DOLORES_DANCE_BEATS, out: s.x < W / 2 ? -1 : 1, sweptTo: s.x + m.dir * s.h * 0.4 };
      this.showLed('DOLORES IS ON BREAK');
    }
    // her moment lasts till she is off the floor, and the next party moment waits for it
    m.beats = m.quit.from + DOLORES_FLING_BEATS + m.quit.dance + DOLORES_RUN_BEATS;
    m.life = (m.life || 0) + (m.beats - was) * this.barSeconds() / 4;
    this.partyNextBeat += m.beats - was;
    return true;
  }

  /**
   * THE MIRROR BALL, GRABBED (Peter, 5 Oct 2026: "allow the disco ball to be dragged and
   * spun"): it follows the finger on its wire — swung out to either side, pulled down or let up
   * a little — and the finger's sideways travel turns it under it. Let go, it swings back to
   * hanging straight and keeps the spin it was given.
   */
  grabBall(x, y) {
    const b = this.boxes.ball;
    if (!b) return;
    const touch = Input.touches?.size ? [...Input.touches.keys()].at(-1) : null;
    this.ballGrab = { touch, dx: x - b.x, dy: y - b.y, lastX: x, x0: x, y0: y, t0: this.t, moved: 0, vSpin: 0 };
    this.spinV = 0;
  }

  /** The grabbed ball following its finger, or swinging free back to straight down (grabBall). */
  ballOn(dt) {
    const s = this.ballSwing, a = this.ballAnchor, g = this.ballGrab;
    if (g) {
      const down = g.touch != null ? Input.touches?.has(g.touch) : Input.held('pointer');
      const p = g.touch != null ? Input.touches?.get(g.touch) : Input.pointer;
      // dragged off the picture, or much further than its wire goes: it slips out of the hand
      // (Peter, 5 Oct 2026: it "sort of gets stuck")
      const slipped = !p || p.x < 0 || p.x > W || p.y < 0 || p.y > H
        || (a && Math.hypot(p.x - g.dx - a.x, p.y - g.dy - a.y) > Math.max(a.len, a.r * 2) * 2.2);
      if (down && !slipped && p && a && a.len > a.r) {
        const px = p.x - g.dx, py = p.y - g.dy;
        const ang = Math.max(-1.35, Math.min(1.35, Math.atan2(px - a.x, Math.max(1, py - a.y))));
        const stretch = Math.max(0.6, Math.min(1.7, Math.hypot(px - a.x, py - a.y) / a.len));
        const step = Math.max(dt, 1 / 240);
        // how fast the finger is swinging it, smoothed and kept to a throw a wire could take
        s.va = Math.max(-6, Math.min(6, s.va * 0.5 + ((ang - s.a) / step) * 0.5)); s.a = ang;
        s.vs = Math.max(-3, Math.min(3, s.vs * 0.5 + ((stretch - s.stretch) / step) * 0.5)); s.stretch = stretch;
        // the surface goes with the finger: a turn of `dx / r` radians, the ball turning 0.6 a
        // unit of phase (mirrorball.js)
        const turn = (p.x - g.lastX) / (0.6 * a.r);
        this.spinPhase += turn;
        g.moved = Math.max(g.moved, Math.hypot(p.x - g.x0, p.y - g.y0));
        g.vSpin = g.vSpin * 0.6 + (turn / step) * 0.4;
        g.lastX = p.x;
        return;
      }
      this.ballGrab = null;
      this.spinV = Math.max(-24, Math.min(24, g.vSpin));
      // just a tap: it spins really fast (Peter, 5 Oct 2026), whichever way it was going
      if (g.moved < 3 && this.t - g.t0 < 0.35) {
        this.spinV = BALL_TAP_SPIN * (Math.sign(this.spinV) || 1);
        this.mirrorFlashAt = this.t;
      }
    }
    // swinging free: a pendulum on its wire, damped, and the wire springing back
    if (!a || dt <= 0) return;
    const L = Math.max(10, a.len * s.stretch);
    s.va += (-(900 / L) * Math.sin(s.a) - 2.2 * s.va) * dt;
    s.a += s.va * dt;
    // never over the top of its mount
    if (Math.abs(s.a) > 1.45) { s.a = Math.sign(s.a) * 1.45; s.va *= -0.3; }
    s.vs += (-90 * (s.stretch - 1) - 9 * s.vs) * dt;
    s.stretch += s.vs * dt;
    if (Math.abs(s.a) < 1e-4 && Math.abs(s.va) < 1e-3) { s.a = 0; s.va = 0; }
  }

  /**
   * THE TURBO HOOVER (Peter, 5 Oct 2026): a tap on the vacuum cleaner revs it up — it tears off
   * across the rest of the floor (club-party.js vacuumWalk) with its motor whining up, sucking in
   * the confetti for a good way ahead of it and any beach ball in the air — and backfires out of
   * the far side, the lot coming back out of it as a confetti fountain (vacuumOn). True when it
   * took the tap.
   */
  tapVacuum(x, y) {
    const s = this.vacuumSpot;
    if (!s?.m || !this.moments.includes(s.m) || s.m.turbo) return false;
    if (Math.abs(x - s.x) > s.w * 0.7 || y < s.floor - s.h * 1.1 || y > s.floor + s.h * 0.15) return false;
    const m = s.m, beat = this.beat(), age = partyAge(m, beat);
    if (!partyAlive(m, beat)) return false;
    // it blows up on a beat, the first at least VACUUM_TURBO_BEATS off (Peter, 5 Oct 2026: "a
    // proper explode sound in time to the music"), and runs till then
    const beatS = this.barSeconds() / 4, ctx = Audio.ctx;
    const next = nextBeatAt();
    let when = next ? next.when : this.heardNow() + VACUUM_TURBO_BEATS * beatS;
    while (when - this.heardNow() < VACUUM_TURBO_BEATS * beatS - 1e-3) when += beatS;
    m.turbo = { from: age, p0: vacuumWalk(m, beat).progress, beats: this.beatAt(when) - beat };
    m.beats = age + m.turbo.beats + 0.25;
    if (ctx && Audio.musicBus) {
      playToy(ctx, Audio.musicBus, 'turbo', ctx.currentTime, { seconds: Math.max(0.1, when - ctx.currentTime) });
      playToy(ctx, Audio.musicBus, 'blast', Math.max(when, ctx.currentTime));
    }
    // every beach ball still up goes into it
    for (const bm of this.moments) if (bm.kind === 'ball' && !bm.sucked) bm.sucked = { at: this.t };
    this.showLed('TURBO!');
    return true;
  }

  /** Once a frame: the turbo hoover out of the far side — the backfire, and its confetti fountain. */
  vacuumOn() {
    for (const m of this.moments) {
      if (m.kind !== 'vacuum' || !m.turbo || m.turbo.fired) continue;
      const walk = vacuumWalk(m, this.beat());
      if (walk.turbo == null || walk.turbo < 1) continue;
      m.turbo.fired = true;
      this.startMoment('fountain', { side: m.dir > 0 ? 1 : -1 });
      // the BLAST is heard now (tapVacuum put it on this beat): the room jolts with it
      this.boomAt = this.heardNow();
      this.showLed('KABOOM!');
    }
  }

  ballUnder(x, y) {
    let best = null, bd = Infinity;
    for (const s of this.ballSpots || []) {
      const d = Math.hypot(x - s.x, y - s.y);
      if (d < s.r * 1.8 && d < bd) { best = s; bd = d; }
    }
    return best;
  }

  /**
   * A tap that may be on a beach ball. A second tap on the same ball within DOUBLE_TAP_S pops
   * it — where it is now, or where the first tap found it, since the first sent it flying —
   * and any other tap on one knocks it back up. True when a ball took the tap.
   */
  tapBall(x, y) {
    const last = this.lastBallTap;
    const soon = last && this.t - last.t < DOUBLE_TAP_S;
    let spot = this.ballUnder(x, y);
    if (!spot && soon && Math.hypot(x - last.x, y - last.y) < last.r * 2.5) {
      spot = (this.ballSpots || []).find((s) => s.m === last.m && s.n === last.n) || null;
    }
    if (!spot) return false;
    if (soon && last.m === spot.m && last.n === spot.n) {
      this.lastBallTap = null;
      this.popBall(spot);
      return true;
    }
    this.lastBallTap = { m: spot.m, n: spot.n, t: this.t, x, y, r: spot.r };
    this.volley(spot);
    return true;
  }

  /** The note of the rally's `n`th boing: the song's scale climbed a step a tap, from its tonic. */
  rallyFreq(n) {
    const key = typeof Audio.songKey === 'function' ? Audio.songKey(0) : null;
    const classes = key?.classes?.length >= 5 ? key.classes : [0, 2, 3, 5, 7, 8, 10];
    let root = key?.root > 0 ? key.root : 220;
    while (root < 330) root *= 2;
    while (root >= 660) root /= 2;
    const i = Math.max(0, n - 1);
    return root * 2 ** ((classes[i % classes.length] + 12 * Math.floor(i / classes.length)) / 12);
  }

  /** The audio time of the song's next sixteenth that can still be played, or null. */
  nextPlayableSixteenth() {
    const ctx = Audio.ctx;
    if (!ctx || !Audio.bank || !Audio.musicBus || !Number.isFinite(Audio.nextTime)) return null;
    const spb = this.barSeconds() / 16;
    return Audio.nextTime + Math.ceil((ctx.currentTime + 0.012 - Audio.nextTime) / spb) * spb;
  }

  /**
   * A beach ball knocked back up: from where it is, high, and down on a beat on a head nearer
   * the middle of the floor, then hopping on from there — or, on the rally's RALLY_SMASHth
   * knock, up into the mirror ball and off it, down to the floor and away.
   */
  volley(spot) {
    const { m, n, r } = spot;
    const L = this.ballLayout || { heroL: 4, cellW: (W - 8) / 8, perRow: 8 };
    const beatS = this.barSeconds() / 4;
    const ballBeat = (this.t - m.t0) / beatS - n * BALL_SPAWN_BEATS;
    const past = this.ballPath(m, n, r).filter((p) => p.at <= ballBeat);
    const here = { x: spot.x, at: ballBeat, h: 0, head: false, lift: spot.lift, hit: true };
    const land = Math.ceil(ballBeat + 1.5);
    this.rally += 1;
    const smash = this.rally >= RALLY_SMASH && this.boxes.ball;
    let next;
    if (smash) {
      const mb = this.boxes.ball;
      const liftAt = (y) => (spot.headY - y) / spot.toonH;
      const away = spot.x < mb.x ? W + 2 * r + 4 : -2 * r - 4;
      next = [{ x: mb.x, at: land, h: 0.2, head: false, lift: liftAt(mb.y + mb.r + r * 0.6), clang: true },
        { x: away, at: land + 3, h: 0.5, head: false, lift: liftAt((this.layout?.floorRef ?? spot.headY) - r) }];
      this.smash = { m, n, t: m.t0 + (n * BALL_SPAWN_BEATS + land) * beatS };
    } else {
      const col = Math.max(0, Math.min(L.perRow - 1, Math.floor((spot.x - L.heroL) / L.cellW)));
      const dir = spot.x < L.heroL + L.cellW * L.perRow / 2 ? 1 : -1;
      const reach = 1 + Math.floor(Math.random() * Math.max(1, Math.min(3, Math.floor(L.perRow / 2))));
      const target = Math.max(0, Math.min(L.perRow - 1, col + dir * reach));
      const h = VOLLEY_H[0] + Math.random() * (VOLLEY_H[1] - VOLLEY_H[0]);
      next = [{ x: L.heroL + L.cellW * (target + 0.5), at: land, h, head: true, lift: 0 }, ...this.hopsFrom(target, dir, land, r)];
    }
    m.points = m.points || [];
    m.points[n] = [...past, here, ...next];
    this.ballLife(m);
    // the boing, on the song's next sixteenth, a step up the scale for every knock
    const when = this.nextPlayableSixteenth();
    if (when != null) playToy(Audio.ctx, Audio.musicBus, 'boing', when, { freq: this.rallyFreq(this.rally) });
    this.padHits = [...this.padHits.filter((p) => this.t - p.t < PAD_WORD_S + 1),
      { pad: 'rally', col: '#ffcf24', label: smash ? 'SMASH!' : `${this.rally}!`, zone: -1, x: spot.x, y: spot.y, when: when ?? this.heardNow(), t: this.t }];
    if (this.rally >= 2 && !smash) this.showLed(`RALLY ${this.rally}`);
    if (smash) this.rally = 0;
  }

  /** Hops on from hero column `col` in direction `dir`, the first landing `at` beats in, until off the floor. */
  hopsFrom(col, dir, at, r) {
    const L = this.ballLayout || { heroL: 4, cellW: (W - 8) / 8, perRow: 8 };
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    const out = [];
    let c = col, t = at;
    for (let guard = 0; guard < 16; guard++) {
      const step = 1 + Math.floor(Math.random() * 3);
      const nc = c + dir * step;
      if (nc < 0 || nc >= L.perRow) {
        out.push({ x: nc < 0 ? -2 * r - 4 : W + 2 * r + 4, at: t + pick([2, 4]), h: 0.6, head: false, lift: 0 });
        return out;
      }
      const beats = pick(BALL_HOP[Math.min(4, step)]);
      t += beats;
      out.push({ x: L.heroL + L.cellW * (nc + 0.5), at: t, head: true, lift: 0,
        h: Math.max(0.4, Math.min(1.3, (0.35 + beats * 0.17) * (0.6 + Math.random() * 0.8))) });
      c = nc;
    }
    return out;
  }

  /** A crossing's life, from its balls' paths as they are now (a knock lengthens one). */
  ballLife(m) {
    const beatS = this.barSeconds() / 4;
    let end = 0;
    for (let n = 0; n < (m.balls || 1); n++) {
      if (m.popped?.[n]) continue;
      end = Math.max(end, n * BALL_SPAWN_BEATS + (this.ballPath(m, n, 1).at(-1)?.at || 0));
    }
    m.life = end > 0 ? Math.max(this.t - m.t0, end * beatS + 0.2) : this.t - m.t0;
  }

  /** A double tap: the ball pops — a crack, its colours burst out, the hero under it flinches. */
  popBall(spot) {
    const { m, n } = spot;
    m.popped = m.popped || [];
    m.popped[n] = true;
    const colours = n ? BEACH_BALL_COLOURS_2 : BEACH_BALL_COLOURS;
    this.moments.push({ kind: 'pop', t0: this.t, life: 1.3, x: spot.x, y: spot.y, r: spot.r,
      bits: Array.from({ length: 28 }, (_, k) => ({ a: (k / 28) * Math.PI * 2 + Math.random() * 0.4, v: 0.5 + Math.random() * 0.9,
        spin: (Math.random() - 0.5) * 16, colour: colours[(k * 2) % colours.length], w: 0.6 + Math.random() * 0.6 })) });
    this.flinch = { x: spot.x, t: this.t };
    if (Audio.ctx && Audio.musicBus) playToy(Audio.ctx, Audio.musicBus, 'pop', Audio.ctx.currentTime);
    if (this.smash?.m === m && this.smash.n === n) this.smash = null;
    this.rally = 0;
    this.ballLife(m);
  }

  /** The rally's smash arriving at the mirror ball: CLANG, the ball spun round and flaring, confetti. */
  smashed() {
    const s = this.smash;
    this.smash = null;
    if (!s || s.m.popped?.[s.n]) return;
    const tonic = typeof Audio.songTonic === 'function' ? Audio.songTonic(0) : null;
    if (Audio.ctx && Audio.musicBus) playToy(Audio.ctx, Audio.musicBus, 'clang', Audio.ctx.currentTime, { tonic: tonic || 220 });
    this.spinV = 9;
    this.mirrorFlashAt = this.t;
    this.startMoment('confetti', { streamers: true });
    this.showLed('SMASH!');
  }

  /**
   * THE CLAP, HELD: once the clap pad has been held CLAP_HOLD_S, claps on the 2 and the 4 on
   * the song's grid, a fill in the last beat every two to four bars (club-hits.js clapsAt),
   * booked a little ahead — until the finger lifts. A tap is only the one clap.
   */
  clapOn() {
    const h = this.clapHold;
    if (!h) return;
    const down = h.touch != null ? Input.touches?.has(h.touch) : Input.held('pointer');
    if (!down) { this.clapHold = null; return; }
    if (this.t - h.since < CLAP_HOLD_S) return;
    const ctx = Audio.ctx;
    if (!ctx || !Audio.musicBus || !Number.isFinite(Audio.nextTime)) return;
    const spb = this.barSeconds() / 16;
    if (h.step == null) h.step = Audio.step + Math.round((h.firstWhen - Audio.nextTime) / spb) + 1;
    for (let k = 0; k < 64; k++) {
      const t = stepTime(h.step);
      if (t == null || t > ctx.currentTime + 0.12) break;
      const inBar = ((Math.round(h.step) % 16) + 16) % 16;
      if (inBar === 0) {
        h.barN += 1;
        h.fill = h.barN >= h.fillIn ? CLAP_FILLS[Math.floor(Math.random() * CLAP_FILLS.length)] : null;
        if (h.fill) { h.barN = 0; h.fillIn = 2 + Math.floor(Math.random() * 3); }
      }
      if (clapsAt(inBar, h.fill) && t >= ctx.currentTime) {
        playPad(ctx, Audio.musicBus, 'clap', t, { hand: this.clapHand(), level: this.drumScale() });
        // CLAP! on every one (Peter, 5 Oct 2026), each a little to one side so they do not stack
        const pad = PADS.find((p) => p.id === 'clap');
        const toonH = this.layout?.toonH || 60;
        this.padHits = [...this.padHits.filter((p) => this.t - p.t < PAD_WORD_S + 1),
          { pad: 'clap', col: pad.col, label: pad.label, zone: h.zone, x: h.x + (Math.random() - 0.5) * toonH * 0.5,
            y: h.y - Math.random() * toonH * 0.15, when: t, t: this.t }];
      }
      h.step += 1;
    }
  }

  /**
   * How loud the floor's clap is against where the DRUMS fader is (Peter, 5 Oct 2026: "should
   * probably reduce if drum volume has been lowered"): the fader's own curve, and never quite
   * gone, so a clap with the drums out is still a faint one.
   */
  drumScale() { return Math.max(0.15, partGain(this.levels?.drums ?? 1)); }

  /**
   * The band's own clap for the CLAP pad (club-voices.js clapVoice), played on the engine as the
   * song's drums are, CLAP_OVER_DB over its lane — handed to club-hits.js's clap, which puts the
   * crowd and the hall round it. Null (the pad's own slaps instead) with no engine to play it on.
   */
  clapHand() {
    const id = this.voices?.clapVoice?.();
    const v = id && VOICES[id];
    const rack = Audio.voices;
    if (!v || v.kind !== 'drum' || typeof rack?.play !== 'function') return null;
    // the pad's level node multiplies by HIT_GAINS.clap: the hand is levelled through it
    const gain = voiceGain(v, 'clap') * dbToGain(v.trim ?? 0) * dbToGain(CLAP_OVER_DB) / HIT_GAINS.clap;
    return (out, when) => {
      try {
        // `preview`: its own hit, kept out of the song's choke groups
        return rack.play('clubClap', id, 440, { time: when, gain, dry: out, wet: null, echo: false, preview: true }) !== false;
      } catch { return false; }
    };
  }

  /**
   * B-33P's 8-BIT GATE (club-fx.js CHIP_GATE): while the band is on the 8-Bit set, the last bar
   * of every CHIP_GATE_EVERY is the whole mix chopped into sixteenths. Looked at once a bar
   * line, in the frame where the downbeat is the next step to schedule, so it goes in and out
   * on the bar; never while a hero's move has the master, which it would cut short.
   */
  gateOn() {
    if (!Audio.ctx || !Audio.mixer?.scheduleBarEffects || !Number.isFinite(Audio.nextTime)) return;
    if (Audio.step % 16 !== 0) return;
    const bar = Math.round(Audio.step / 16);
    if (this.gateBar === bar) return;
    this.gateBar = bar;
    // Only a move with a master section of its own (a `chain`) has the master. B-33P's swap,
    // Clara's holes and Rusty's speed never touch it, and counting them left the gate on for
    // good: B-33P tapped in a gate bar to leave 8-bit had the gate's way out skipped.
    const onMaster = (m) => !!(m && HERO_MOVES[m.i]?.chain);
    const busy = onMaster(this.acting) || onMaster(this.holding) || onMaster(this.queued);
    if (this.gating) {
      this.gating = false;
      if (!busy) endChipGate(Audio.nextTime);
    }
    const chip = this.voices?.swappedNow && this.voices.swapped && !this.voices.eightBit;
    if (chip && !busy && ((bar % CHIP_GATE_EVERY) + CHIP_GATE_EVERY) % CHIP_GATE_EVERY === CHIP_GATE_EVERY - 1) {
      startChipGate(Audio.nextTime, this.barSeconds() / 16);
      this.gating = true;
    }
  }

  /** A crowd moment, starting now. */
  /** Whether the room is under Lorenzo's water — flooded, or still draining. */
  underwater() {
    const a = this.acting;
    return !!(a && HERO_MOVES[a.i]?.drain && this.heardNow() >= a.when);
  }

  startMoment(kind, options = {}) {
    // nothing thrown about under water: no beach ball, confetti or streamers (Peter, 5 Oct 2026)
    if (DRY_MOMENTS.includes(kind) && this.underwater()) return false;
    // never a second beach ball while one is still crossing
    if (kind === 'ball' && this.moments.some((mm) => mm.kind === 'ball')) return false;
    const beatS = this.barSeconds() / 4;
    const balls = kind === 'ball' && Math.random() < BALL_PAIR_CHANCE ? 2 : 1;
    const m = { kind, t0: this.t, life: kind === 'smoke' ? SMOKE_S : MOMENT_S[kind], dir: Math.random() < 0.5 ? 1 : -1 };
    if (kind === 'ball') {
      const perRow = this.ballLayout ? this.ballLayout.perRow : 8;
      m.balls = balls;
      m.paths = Array.from({ length: balls }, () => BangerClubState.ballHops(perRow));
      m.beats = Math.max(...m.paths.map((hops, n) => n * BALL_SPAWN_BEATS + hops.reduce((sum, h) => sum + h.beats, 0)));
      m.life = m.beats * beatS + 0.2;
    }
    if (PARTY_BEATS[kind]) {
      if (this.moments.some(m => PARTY_BEATS[m.kind] && partyAlive(m, this.beat())
        || m.kind === 'ball' && this.t < m.t0 + m.life)) return false;
      m.beat0 = this.beat(); m.beats = PARTY_BEATS[kind];
      if (kind === 'drop-jump') { m.jumpAt = options.jumpAt ?? 4; m.beats = m.jumpAt + 1; }
      if (kind === 'spotlight') {
        m.hero = (this.lastSoloHero + 1 + Math.floor(Math.random() * (HERO_MOVES.length - 1))) % HERO_MOVES.length;
        this.lastSoloHero = m.hero;
      }
      m.life = m.beats * beatS;
      this.partyNextBeat = this.beat() + m.beats + 32;
    }
    if (kind === 'ball') {
      if (this.moments.some(m => PARTY_BEATS[m.kind] && partyAlive(m, this.beat())
        || m.kind === 'ball' && this.t < m.t0 + m.life)) return false;
      this.partyNextBeat = this.beat() + m.beats + 32;
    }
    if (kind === 'fountain') {
      // THE VACUUM'S BACKFIRE: everything it sucked up blown back out of the far side, up and
      // over the floor — and some of it landing back where it was swept from
      // a big one (Peter, 5 Oct 2026: "a much bigger confetti explosion"): three waves, right
      // across the room and up near the roof
      m.life = 3.6;
      m.side = options.side || 1;
      m.bits = Array.from({ length: this.lite ? 160 : 280 }, (_, k) => ({
        colour: DISCO[k % DISCO.length], vx: -m.side * (0.1 + Math.random() * 1.15), vy: 0.8 + Math.random() * 1.9,
        spin: (Math.random() - 0.5) * 18, delay: (k % 3) * 0.12 + Math.random() * 0.1, w: 0.8 + Math.random() * 1,
      }));
      this.floorConfetti = [...this.floorConfetti, ...Array.from({ length: 40 }, (_, k) => makeScrap(
        m.side > 0 ? W * (0.55 + 0.42 * Math.random()) : W * (0.03 + 0.42 * Math.random()), Math.random(),
        DISCO[k % DISCO.length], this.t + 1 + Math.random() * 0.8))].slice(-FLOOR_CONFETTI_MAX);
    }
    if (kind === 'smoke') {
      m.puffs = Array.from({ length: 28 }, (_, k) => ({
        born: k * 0.045 + Math.random() * 0.03, speed: 0.55 + Math.random() * 0.35,
        lift: 0.4 + Math.random() * 0.8, size: 0.8 + Math.random() * 0.5, front: k % 3 === 0,
      }));
    }
    if (kind === 'confetti') {
      // Some of it stays on the floor, landing as the drop settles, until somebody comes for
      // it: Dolores with her broom or the vacuum cleaner, now and then (Peter, 3 Oct 2026) —
      // not after every drop, so it is allowed to pool, drop on drop, up to a limit.
      // It lands in drifts: most of a drop round a few spots, the rest anywhere.
      const drifts = Array.from({ length: 4 }, () => 0.1 + 0.8 * Math.random());
      this.floorConfetti = [...this.floorConfetti, ...Array.from({ length: 26 }, (_, k) => makeScrap(
        W * (k % 5 < 3 ? Math.max(0.02, Math.min(0.98, drifts[k % 4] + (Math.random() + Math.random() - 1) * 0.08)) : 0.03 + 0.94 * Math.random()),
        Math.random(), DISCO[k % DISCO.length], this.t + m.life * (0.45 + 0.4 * Math.random())))].slice(-FLOOR_CONFETTI_MAX);
      if (this.beat() >= this.cleanerCooldown && (Math.random() < CLEAN_CHANCE || this.floorConfetti.length >= FLOOR_CONFETTI_MAX * 0.7)) {
        this.cleanerBeat = this.beat() + m.life / beatS + 4;
        this.cleanerKind = CLEANERS[Math.floor(Math.random() * CLEANERS.length)];
      }
      m.bits = Array.from({ length: 72 }, (_, k) => {
        const side = k % 2 ? 1 : -1;
        return {
          side, colour: DISCO[k % DISCO.length], spin: (Math.random() - 0.5) * 14, phase: Math.random() * 6,
          vx: side * -(0.18 + Math.random() * 0.32), vy: 0.15 + Math.random() * 0.35, delay: Math.random() * 0.35,
          w: 0.6 + Math.random() * 0.7,
        };
      });
    }
    // Streamers have their own quiet-time slot, and sometimes ride with a confetti drop.
    // Explicit options also let a preview select confetti alone or the combined burst.
    if (kind === 'streamers' || kind === 'confetti' && (options.streamers ?? Math.random() < 0.5)) {
      m.ribbons = Array.from({ length: this.lite ? 12 : 20 }, (_, i) => ({
        side: i % 2 ? 1 : -1, colour: DISCO[i % DISCO.length],
        reach: 0.2 + Math.random() * 0.38, delay: Math.random() * 0.45,
        length: 22 + Math.random() * 28, phase: Math.random() * Math.PI * 2,
        curl: 2 + Math.random() * 3, drift: 0.7 + Math.random() * 0.6,
      }));
    }
    if (kind === 'sticks') {
      // right across the floor, in three ragged waves, so they are all back down by the end
      const n = this.lite ? STICKS_LITE : STICKS;
      m.sticks = Array.from({ length: n }, (_, k) => ({
        x: 0.06 + 0.88 * (k / (n - 1)) + (Math.random() - 0.5) * 0.05, colour: [...LASER, '#ff4fa3', '#ffd23f', '#b06bff'][k % 6],
        vy: 1.3 + Math.random() * 0.6,                     // up to about half the screen
        vx: (Math.random() - 0.5) * 0.25, spin: (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 6),
        delay: (k % 3) * 0.2 + Math.random() * 0.1,
      }));
    }
    this.moments.push(m);
    this.lastMoment = kind;
    return true;
  }

  updateParty() {
    // once the cleaner has been through, the floor is clean — all but what Dolores never got to,
    // if she walked off the job (tapDolores)
    const sweeping = this.moments.find((m) => CLEANERS.includes(m.kind)) || null;
    if (this.sweeping && !sweeping) {
      // ...and anything still in the air lands after it: the vacuum's backfire throws a fountain
      // of it back out, landing a second or so after the vacuum has gone
      const q = this.sweeping.quit, dir = this.sweeping.dir;
      this.floorConfetti = this.floorConfetti.filter((sc) => sc.at > this.t || (q && (dir > 0 ? sc.x >= q.sweptTo : sc.x <= q.sweptTo)));
    }
    this.sweeping = sweeping;
    if (sweeping?.quit && !sweeping.quit.told && cleanerWalk(sweeping, this.beat()).running != null) {
      sweeping.quit.told = true;
      this.showLed('DOLORES HAS LEFT THE BUILDING');
    }
    if (this.shownAt == null || this.t - this.shownAt < 10) return;
    // Fernwick has the crowd: no other party moment while the bow is drawn and the drop lands.
    if (this.crowd) return;
    const beat = this.beat(), pos = this.songPos();
    const form = this.song.form || [];
    const upcoming = form.find(f => /^drop/.test(f.role || '') && (f.from - 1) * 4 > pos
      && (f.from - 1) * 4 - pos <= 4);
    if (upcoming) {
      const remaining = (upcoming.from - 1) * 4 - pos;
      const cue = Math.round(beat + remaining);
      if (cue !== this.lastDropCue) {
        this.lastDropCue = cue;
        // Make the full-crowd jump a special beat by using alternate drops.
        // If another major moment blocks it, keep it ready for the next drop.
        if (this.dropJumpNext && this.startMoment('drop-jump', { jumpAt: remaining })) {
          this.dropJumpNext = false;
        } else if (!this.dropJumpNext) this.dropJumpNext = true;
      }
    }
    // Let a major moment finish before the next one, and start on a beat.
    if (beat % 1 > 0.15 || this.moments.some(m => PARTY_BEATS[m.kind] && partyAlive(m, beat)
      || m.kind === 'ball' && this.t < m.t0 + m.life)) return;
    if (beat >= this.cleanerBeat) {
      if (this.startMoment(this.cleanerKind || 'cleaner')) { this.cleanerBeat = Infinity; this.cleanerCooldown = beat + 96; }
    } else if (beat >= this.partyNextBeat) {
      this.startMoment(['ball', 'spotlight', 'bubbles'][this.partyTurn++ % 3]);
    }
  }

  updateFormation() {
    if (this.shownAt == null) return;
    const beat = this.beat();
    if (this.formationSwap) {
      if (beat < this.formationSwap.beat0 + this.formationSwap.beats) return;
      const { slotA, slotB } = this.formationSwap;
      [this.formationOrder[slotA], this.formationOrder[slotB]] = [this.formationOrder[slotB], this.formationOrder[slotA]];
      this.formationSwap = null;
      this.formationShuffleAt = beat + 4 * (20 + Math.floor(Math.random() * 13));
      return;
    }
    if (beat < this.formationShuffleAt || beat % 1 > 0.15 || this.queued || this.acting || this.holding) return;
    // In portrait nobody changes places (Peter, 5 Oct 2026): the two rows stand where they
    // walked in. In landscape any two neighbours may swap — the holds and the taps used to
    // keep to their own halves of the floor, and no longer have halves.
    if (portraitMenuActive()) {
      this.formationShuffleAt = beat + 4 * (20 + Math.floor(Math.random() * 13));
      return;
    }
    const pairs = Array.from({ length: Math.max(0, this.formationOrder.length - 1) }, (_, i) => [i, i + 1]);
    if (!pairs.length) {
      this.formationShuffleAt = beat + 4 * (20 + Math.floor(Math.random() * 13));
      return;
    }
    const [slotA, slotB] = pairs[Math.floor(Math.random() * pairs.length)];
    this.formationSwap = {
      heroA: this.formationOrder[slotA], heroB: this.formationOrder[slotB],
      slotA, slotB, beat0: beat, beats: 4,
    };
    this.formationShuffleAt = Infinity;
  }

  tapLedBoard() {
    // A tap turns the board into a graphic equaliser for a few bars (drawLedEq), and another
    // puts its words back (Peter, 5 Oct 2026: it took a double tap, and one "does nothing").
    this.popup = null;
    if (this.led?.eq && this.t < this.led.start + this.led.dur) { this.led = null; return; }
    this.led = { text: '', eq: true, scroll: false, start: this.t, dur: LED_HOLD_BARS * this.barSeconds() };
  }


  /**
   * Double-tap the club-name sign: on to the next section of the song (the last goes round
   * to the first). The engine holds the seek to the end of the bar playing, so it lands
   * like a live deck — and the section's own moment fires as it arrives. Tapping again
   * before it lands steps on from the queued section, not the one still playing.
   */
  tapClubSign() {
    // ...and a tap on it shows the song's title (Peter, 5 Oct 2026; it was the mirror ball's)
    this.showTitle();
    if (this.t - this.lastSignTap >= 0.35) { this.lastSignTap = this.t; return; }
    this.lastSignTap = -Infinity;
    this.skipSection(1);
  }

  /**
   * THE TRANSPORT's skips, beside the mixer: `dir` 1 on to the next section (the last goes
   * round to the first), -1 back to the one before (the first starts itself again). Like the
   * sign, the seek waits for the end of the bar playing, and a second press before it lands
   * steps on from the queued section. The pressed button stays lit until the jump is heard.
   */
  skipSection(dir) {
    const form = this.song.form || [];
    if (form.length < 2) return false;
    const cur = this.skipTo ?? this.section ?? -1;
    const target = dir > 0 ? (cur + 1) % form.length : Math.max(0, cur - 1);
    this.skipTo = target;
    const at = nextBarAt();
    Audio.setStepAtBoundary((form[target].from - 1) * 16);
    this.skipLit = at ? { dir, until: at.when } : null;
    return true;
  }

  /**
   * A SEEK landing (the transport's skips, a double-tap on the sign, Fernwick's drop) jumps the
   * song's beat count. What is happening in the room carries on through it on the room's own
   * clock — Dolores sweeping, the vacuum, a spotlight, a formation change — and what is due
   * next stays as far off as it was, rather than all of it vanishing or firing at once (Peter,
   * 5 Oct 2026: "we shouldn't skip the event currently happening"). The crowd's drop jump is
   * the exception: it is pinned to a drop in the song, so it goes with the song.
   */
  followSeek(dt) {
    const b = Audio.songBeat();
    const prev = this.seekBeat;
    this.seekBeat = Number.isFinite(b) ? b : null;
    if (prev == null || this.seekBeat == null || this.shownAt == null) return;
    const jump = b - prev - (this.paused ? 0 : dt * 4 / this.barSeconds());
    if (Math.abs(jump) < 1) return;
    for (const m of this.moments) if (m.beat0 != null && m.kind !== 'drop-jump') m.beat0 += jump;
    if (this.formationSwap) this.formationSwap.beat0 += jump;
    for (const k of ['partyNextBeat', 'cleanerBeat', 'cleanerCooldown', 'strobeBeat', 'strobeNextBeat', 'formationShuffleAt']) this[k] += jump;
  }

  /** PLAY / PAUSE: the whole sound of the club holds on the sample it stopped on (Audio.setPlayerPaused). */
  togglePause() {
    this.paused = !this.paused;
    Audio.setPlayerPaused(this.paused);
    if (this.paused && this.holding) this.letGo();
    if (!this.paused) Audio.sfx('ui');
  }

  /** The focus index of the transport's first button: after the pencil, and SAVE when it shows. */
  transportFocus() {
    return HERO_MOVES.length + 3 + (this.pending ? 1 : 0);
  }

  /** A transport button: `k` 0 back, 1 play/pause, 2 forward. */
  pressTransport(k) {
    if (!(k >= 0 && k <= 2)) return;
    this.iconsAt = this.t;
    if (k === 1) { this.togglePause(); return; }
    if (this.skipSection(k === 0 ? -1 : 1) && !this.paused) Audio.sfx('ui');
  }

  /**
   * Each hero joins the dancing on cue, then changes dance at random every few bars — or,
   * now and then, sits a couple of bars out on the idle bob before dancing again.
   */
  updateDancers() {
    const bar = this.barSeconds();
    const bars = ([lo, hi]) => bar * (lo + Math.floor(Math.random() * (hi - lo + 1)));
    for (const d of this.dancers) {
      if (!d.moves.length || this.t < d.joinAt) continue;
      const joining = d.move == null && !d.resting;
      if (!joining && this.t < d.changeAt) continue;
      const grumpy = d.hero === GRUMPY.hero;
      if (grumpy ? !d.resting : !joining && !d.resting && Math.random() < REST_CHANCE) {
        if (!grumpy || joining || Math.random() < GRUMPY.rest) {
          d.last = d.move;
          d.move = null;
          d.resting = true;
          d.changeAt = this.t + bars(grumpy ? GRUMPY.restBars : REST_BARS);
          continue;
        }
      }
      // and half the time he just keeps standing there
      if (grumpy && d.resting && Math.random() < 0.5) { d.changeAt = this.t + bars(GRUMPY.restBars); continue; }
      const was = d.move || d.last;
      const others = d.moves.filter((m) => m !== was);
      d.move = others[Math.floor(Math.random() * others.length)] || d.moves[0];
      d.resting = false;
      d.legs = ARMS_ONLY_HEROES.has(d.hero) ? 'stand'
        : d.skirted && d.move?.letter === 'C' && d.move.labLegs === 'hop' ? 'hop'
          : SKIRT_LEGS[Math.floor(Math.random() * SKIRT_LEGS.length)];
      d.changeAt = this.t + bars(grumpy ? GRUMPY.danceBars : DANCE_CHANGE_BARS);
    }
  }

  /** The parts that are up at all — for anything that asks which are playing. */
  get parts() { return new Set(PARTS.filter((p) => this.levels[p.id] > 0).map((p) => p.id)); }

  /** A part's fader moved: heard at once; NO / YES when it reaches or leaves the bottom. */
  setLevel(k, level) {
    const p = PARTS[k];
    const was = this.levels[p.id];
    const v = level < 0.04 ? 0 : Math.min(1, Math.round(level * 100) / 100);
    this.levels[p.id] = v;
    this.mixerDirty = true;
    setPartLevel(this.song, p.id, v, null, 0.03);
    if (was > 0 && v === 0) this.popup = { text: `NO ${p.label}`, t: this.t };
    if (was === 0 && v > 0) this.popup = { text: `YES ${p.label}`, t: this.t };
    this.iconsAt = this.t;
  }

  /**
   * THE MIXER, KEPT (Peter, 5 Oct 2026: "save the mixer settings, esp since we can now change
   * the presets"): the four faders and each part's sound, on the song's own record (store.js
   * keepMixer) — saved as they change, once a finger lets go of a fader, and put back when the
   * song is opened here again. A song not saved yet holds them until it is.
   */
  saveMixer() {
    this.mixerDirty = false;
    if (this.pending || !this.rec) { this.mixerDirty = true; return; }
    keepMixer(this.rec, { levels: { ...this.levels }, sounds: this.voices?.picksNamed() || { own: {}, swap: {} } });
  }

  /** The song's kept mixer back on: its faders at once, its sounds from the first note. */
  restoreMixer() {
    const m = this.rec?.mixer;
    if (!m) return;
    for (const p of PARTS) {
      const v = Number(m.levels?.[p.id]);
      if (!Number.isFinite(v)) continue;
      this.levels[p.id] = Math.max(0, Math.min(1, v));
      setPartLevel(this.song, p.id, this.levels[p.id], null, 0.005);
    }
    this.voices?.restorePicks(m.sounds);
  }

  /** Every fader up and every sound the song's own — what a take arrives with. */
  get mixerPlain() { return PARTS.every((p) => this.levels[p.id] === 1) && (this.voices?.own ?? true); }

  /**
   * RESET on the mixer panel (Peter, 5 Oct 2026: "a restore button … to go back to the default
   * levels and patches"): every fader back up, every part back on the song's own sound, at once —
   * and the kept mixer taken off the song's record (keepMixer drops a plain one).
   */
  resetMixer() {
    if (this.mixerPlain) { Audio.sfx('uiBad'); return; }
    for (const p of PARTS) {
      this.levels[p.id] = 1;
      setPartLevel(this.song, p.id, 1, null, 0.03);
    }
    this.voices?.reset();
    this.saveMixer();
    this.popup = { text: 'MIXER RESET', t: this.t };
    this.iconsAt = this.t;
    Audio.sfx('ui');
  }

  /** A finger down on a speaker: held for the bass, or let go at once for a BOOM (speakersOn). */
  pressSpeaker(x, y) {
    const k = (this.boxes.speakers || []).findIndex((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    if (k < 0) return false;
    const touch = Input.touches?.size ? [...Input.touches.keys()].at(-1) : null;
    this.speakerHold = { touch, t0: this.t, x0: x, y0: y, boosted: false };
    return true;
  }

  /** Once a frame: a speaker held becomes the BOOST, and its drag the wobble; let go, it ends — or BOOMs. */
  speakersOn() {
    const h = this.speakerHold;
    if (!h) return;
    const down = h.touch != null ? Input.touches?.has(h.touch) : Input.held('pointer');
    const p = h.touch != null ? Input.touches?.get(h.touch) : Input.pointer;
    if (down && p) {
      if (!h.boosted && this.t - h.t0 > SPEAKER_HOLD_S) {
        h.boosted = true;
        this.startBoost();
        // said, so it is noticed: BASS! where the finger is, and on the LED board
        this.showLed('BASS BOOST');
        this.padHits = [...this.padHits.filter((p) => this.t - p.t < PAD_WORD_S + 1),
          { pad: 'speaker', col: '#c9a0ff', label: 'BASS!', zone: -1, x: h.x0, y: h.y0, when: this.heardNow(), t: this.t }];
      }
      // the drag, either way, is the wobble's depth (Peter, 5 Oct 2026: he dragged and saw nothing)
      if (h.boosted) this.wobble(Math.min(1, Math.hypot(p.x - h.x0, p.y - h.y0) / ((this.layout?.toonH || 60) * DRAG_SPAN * 0.75)), p);
      return;
    }
    this.speakerHold = null;
    if (h.boosted) this.endBoost(); else this.boom();
  }

  /** The sub BOOM on the next beat: heard, and the cones and the room with it. */
  boom() {
    const ctx = Audio.ctx;
    const at = nextBeatAt();
    const when = at ? at.when : this.heardNow();
    if (ctx && Audio.musicBus) playToy(ctx, Audio.musicBus, 'boom', Math.max(when, ctx.currentTime));
    this.boomAt = when;
  }

  /** The lanes the BOOST lifts: the bass's and the kick's, each with its monitor gate. */
  boostLanes() {
    const mixer = Audio.mixer;
    if (!mixer?.lane) return [];
    return (this.song?.mix?.order || [])
      .filter((key) => partOf(key) === 'bass' || baseLane(key) === 'kick')
      .map((key) => ({ key, part: partOf(key), gate: mixer.lane(key)?._monitorNode?.gain }))
      .filter((l) => l.gate);
  }

  startBoost() {
    const ctx = Audio.ctx;
    const lanes = this.boostLanes();
    this.boost = { lanes, wobbling: false, amount: 0 };
    if (!ctx) return;
    for (const l of lanes) l.gate.setTargetAtTime(partGain(this.levels[l.part] ?? 1) * SPEAKER_BOOST, ctx.currentTime, 0.04);
  }

  /** The drag on a held speaker: a wobble on the boosted bass, in eighths, `amount` 0–1 deep. */
  wobble(amount, at = null) {
    const b = this.boost, ctx = Audio.ctx;
    if (!b) return;
    if (amount > 0.12 && !(b.amount > 0.12)) {
      // said where the finger is, as BASS! was, and on the LED board
      this.showLed('WOBBLE');
      if (at) this.padHits = [...this.padHits.filter((p) => this.t - p.t < PAD_WORD_S + 1),
        { pad: 'speaker', col: '#7cff6b', label: 'WOBBLE!', zone: -1, x: at.x, y: at.y, when: this.heardNow(), t: this.t }];
    }
    b.amount = amount;
    if (!ctx) return;
    // the wub: the whole mix through a low-pass opening and shutting every eighth (club-fx.js),
    // in from the next beat so it sits on the grid, and as deep as the drag after that
    if (!b.wobbling && amount > 0.12) b.wobbling = startWobble(amount, nextBeatAt());
    else if (b.wobbling) setWobble(amount);
  }

  endBoost() {
    const b = this.boost, ctx = Audio.ctx;
    this.boost = null;
    if (!b || !ctx) return;
    const at = nextBeatAt();
    const when = at ? at.when : ctx.currentTime;
    for (const l of b.lanes) l.gate.setTargetAtTime(partGain(this.levels[l.part] ?? 1), when, 0.03);
    // the wobble out on the same beat — unless a hero's move has had the master since
    if (b.wobbling && !(this.acting && HERO_MOVES[this.acting.i]?.chain)) endWobble(at);
  }

  /** A par can on the rig tapped: the room flashes and chases in its colour (drawLightShow). */
  tapCan(k) {
    const can = this.boxes.cans?.[k];
    if (!can) return;
    this.lightShow = { col: can.col, at: this.heardNow() };
  }

  /** A tap up in the room, over the heads and under the truss: the lasers fire and sweep up and away. */
  tapSky(x, y) {
    const tops = this.boxes.heroes.filter(Boolean).map((b) => b.y);
    const heads = tops.length ? Math.min(...tops) : this.layout?.floorRef ?? H;
    if (!(y < heads) || y < (this.layout?.stageTop ?? 0) + 4) return false;
    // a different pattern each time, never the one showing or the last one again (Peter, 5 Oct
    // 2026: "I want some variation on the lasers when we click on it") — and LASER_CYCLE of them,
    // one after another, each in the next colour
    const showing = this.laserState(this.heardNow())?.kind;
    const kinds = [];
    while (kinds.length < LASER_CYCLE) {
      const avoid = [...kinds, showing, kinds.length ? null : this.lastLaser];
      const free = LASER_PATTERNS.filter((k) => !avoid.includes(k));
      kinds.push(free[Math.floor(Math.random() * free.length)]);
    }
    this.lastLaser = kinds.at(-1);
    const turn = this.laserTurn;
    this.laserTurn += kinds.length;
    this.laserSweep = { kinds, cols: kinds.map((_, n) => LASER[(turn + n) % LASER.length]), at: this.heardNow(), dir: x < W / 2 ? 1 : -1 };
    return true;
  }

  /** The fader `k` set from a pointer height. */
  levelFromY(k, y) {
    const f = this.boxes.faders[k];
    if (!f) return;
    this.setLevel(k, (f.bot - y) / (f.bot - f.top));
  }

  openMixer(open = !this.mixerOpen) {
    this.mixerOpen = open;
    this.dragging = null;
    this.iconsAt = this.t;
    Audio.sfx('ui');
  }

  back() {
    // A banger not kept yet asks on the way out: SAVE / UPDATE / SAVE AS NEW / DON'T SAVE.
    if (this.pending) { this.openSavePrompt(true); return; }
    this.onBack?.(this.rec);
  }

  /** The SAVE button beside the pencil. A brand-new banger saves straight away; an
   *  edit asks first, so UPDATE is a choice rather than a slip of the thumb. */
  savePressed() {
    if (!this.pending) return;
    if (this.pending.kind !== 'new') { this.openSavePrompt(false); return; }
    const rec = this.onSave?.(false);
    if (rec) {
      this.rec = rec;
      this.pending = null;
      this.saveMixer();
      this.popup = { text: 'SAVED', t: this.t };
      Audio.sfx('uiConfirm');
    } else {
      this.popup = { text: 'SONG LIST FULL - DELETE ONE FIRST', t: this.t };
      Audio.sfx('uiBad');
    }
  }

  /**
   * The choices a pending song is offered. On the way OUT (`closing`) the last is DON'T
   * SAVE; a successful save also returns to the Lab. From the SAVE button, CANCEL just
   * hides the box and a successful save stays on the floor (Peter, 4 Oct 2026).
   */
  openSavePrompt(closing = false) {
    const kind = this.pending.kind;
    const last = closing ? { label: "DON'T SAVE", discard: true } : { label: 'CANCEL', cancel: true };
    const options = kind === 'edit'
      ? [{ label: 'UPDATE', asNew: false }, { label: 'SAVE AS NEW', asNew: true }, last]
      : kind === 'starter'
        ? [{ label: 'SAVE AS NEW', asNew: true }, last]
        : [{ label: 'SAVE', asNew: false }, last];
    this.savePrompt = { closing, options, sel: options.length - 1 };
    Audio.sfx('uiBad');
  }

  answerSavePrompt(choice) {
    const closing = this.savePrompt?.closing === true;
    this.savePrompt = null;
    if (choice.cancel) { Audio.sfx('ui'); return; }   // just hide it; the club carries on
    if (choice.discard) { this.onDiscard?.(); return; }
    const rec = this.onSave?.(choice.asNew);
    if (rec) {
      this.rec = rec;
      this.pending = null;
      this.saveMixer();
      this.popup = { text: 'SAVED', t: this.t };
      Audio.sfx('uiConfirm');
      if (closing) this.onBack?.(rec);
    } else {
      // the list is full: the song stays pending, so back can offer DON'T SAVE
      this.popup = { text: 'SONG LIST FULL - DELETE ONE FIRST', t: this.t };
      Audio.sfx('uiBad');
    }
  }

  updateSavePrompt() {
    const p = this.savePrompt;
    const g = this.savePromptLayout();
    const ptr = Input.pointer;
    const hit = (r) => Input.pressed('pointer') && ptr.x >= r.x && ptr.x <= r.x + r.w && ptr.y >= r.y && ptr.y <= r.y + r.h;
    if (Input.pressed('left') || Input.pressed('right') || Input.pressed('up') || Input.pressed('down')) {
      const dir = (Input.pressed('right') || Input.pressed('down')) ? 1 : -1;
      p.sel = (p.sel + dir + p.options.length) % p.options.length;
      Audio.sfx('ui');
    }
    if (Input.pressed('back') || Input.pressed('slide')) { this.savePrompt = null; Audio.sfx('ui'); }
    else {
      const i = p.options.findIndex((_, k) => hit(g.buttons[k]));
      if (i >= 0) this.answerSavePrompt(p.options[i]);
      else if (Input.pressed('confirm')) this.answerSavePrompt(p.options[p.sel]);
    }
    Input.endFrame();
  }

  update(dt) {
    this.t += dt;
    // A SLOW DEVICE gets a lighter room (Peter, 3 Oct 2026: slowdown on the phone): the frame
    // time, smoothed, switches it on past ~24ms and off again under ~19ms.
    // `dt` is the fixed simulation tick (1/60s), even when rendering has fallen
    // behind. Read the loop's measured presentation rate so the lighter room
    // actually engages on a slow phone. Until the first sample, keep the default.
    const fps = frameRate();
    const observedFrameMs = fps > 0 ? 1000 / fps : dt * 1000;
    this.frameMs = (this.frameMs ?? 16) * 0.95 + Math.min(100, observedFrameMs) * 0.05;
    if (!this.lite && this.frameMs > 24) this.lite = true;
    else if (this.lite && this.frameMs < 19) this.lite = false;
    // THE WHOLE SCREEN on a wide landscape display — a phone on its side — rather than the
    // 16:9 picture with bars down the sides (Peter, 3 Oct 2026): the jukebox visualiser's
    // cover crop, which keeps the full width and trims the top and bottom, and draw() lays
    // the room out in what is left, the heroes kept clear of the notch. Set in enter(),
    // behind the closed shutter — switched in view it shows a frame stretched — and here
    // only when the phone is turned.
    this.fitScreen();
    if (this.shownAt == null && !isTransitioning()) {
      this.shownAt = this.t;
      this.strobeNextBeat = this.reduceMotion ? Infinity : Math.ceil(Math.max(0, this.beat()) / 4) * 4 + STROBE_FIRST_BARS * 4;
      // the mirror ball comes in last, once the heroes have walked on
      this.ballAt = this.t + BALL_ENTER_S;
      const bar = this.barSeconds();
      this.danceOrder.forEach((i, k) => { this.dancers[i].joinAt = this.t + bar * (DANCE_START_BARS + k * DANCE_JOIN_BARS); });
      this.formationShuffleAt = this.beat() + 4 * (20 + Math.floor(Math.random() * 13));
      this.momentAt = this.t + bar * MOMENT_QUIET_BARS;
      this.smokeAt = this.t + bar * SMOKE_FIRST_BARS;
    }
    this.followSeek(dt);
    if (!this.paused && this.t >= this.smokeAt) {
      this.startMoment('smoke');
      const [lo, hi] = SMOKE_GAP_BARS;
      this.smokeAt = this.t + this.barSeconds() * (lo + Math.floor(Math.random() * (hi - lo + 1)));
    }
    // THE WAVE: when the song loops back, the heroes jump one after another across the floor,
    // arms up, over a bar — a Mexican wave (Peter, 3 Oct 2026). The loop is seen as the heard
    // beat jumping back.
    // The engine's beat count runs on through every repeat of the song, so the position in
    // the song is that count round the song's length.
    {
      const b = this.beat() < 0 ? null : this.songPos();   // the count-in reads negative: not the song yet
      // only a jump back from the song's last bars counts — not the clock settling at the start
      const end = (this.song.form || []).reduce((m, f) => Math.max(m, f.to || 0), 0) * 4;
      if (b != null && this.lastBeat != null && b < this.lastBeat - 2 && (!end || this.lastBeat > end - 8) && this.shownAt != null) this.waveAt = this.t;
      this.lastBeat = b;
    }
    // A section change, as heard: its moment, on the downbeat it changes on.
    {
      const form = this.song.form || [];
      const bar = Math.floor(this.songPos() / 4) + 1;   // round the song: every repeat gets its moments
      const si = form.findIndex((f) => bar >= f.from && bar <= f.to);
      if (si !== this.section) {
        // Fernwick's drop arriving brings its own moment (dropLanded), not the section's
        if (this.landing && si === this.landing.section) this.dropLanded();
        else {
          const kind = this.section != null && si >= 0 && this.shownAt != null ? MOMENT_FOR[form[si].role] : null;
          if (kind) {
            this.startMoment(kind === 'big' ? 'confetti' : kind);
            this.momentAt = this.t + this.barSeconds() * MOMENT_QUIET_BARS;
          }
        }
        this.section = si;
        this.skipTo = null;
      }
      // a drop back to the top of the section it was in (or a song with no sections) is
      // only heard, not seen in the form
      if (this.landing && this.heardNow() >= this.landing.at + 0.05) this.dropLanded();
    }
    // The sound swaps land on their bar line (club-voices.js), and say so on the LED board.
    {
      const landed = this.voices.update();
      if (landed) this.voicesLanded(landed);
    }
    // Rusty let go: the song's own speed back, on the beat — or now, if a long frame missed it.
    if (this.speedBack && (gridReady(4, this.speedBack.notBefore)
      || this.heardNow() - this.speedBack.notBefore > this.barSeconds() / 4 + 0.3)) {
      setSpeed(1);
      this.speedBack = null;
    }
    this.rollOn();
    this.clapOn();
    this.throwsOn();
    this.stopsOn();
    this.gateOn();
    this.fishOn();
    if (this.smash && this.t >= this.smash.t) this.smashed();
    this.ballOn(dt);
    this.speakersOn();
    this.vacuumOn();
    // the mixer kept once a fader is let go (saveMixer)
    if (this.mixerDirty && this.dragging == null && !this.pending) this.saveMixer();
    this.spinPhase += dt * this.spinV;
    this.spinV *= Math.exp(-dt * 0.9);
    if (this.rally && !this.moments.some((m) => m.kind === 'ball')) this.rally = 0;
    if (this.crowd?.land != null && this.heardNow() > this.crowd.land + this.barSeconds() / 2) this.crowd = null;
    if (this.echoes.length) {
      const e = HERO_MOVES.find((m) => m.echo)?.echo;
      const beatS = this.barSeconds() / 4;
      this.echoes = e ? this.echoes.filter((x) => this.heardNow() <= x.when + (e.repeats + 1) * e.every * beatS) : [];
    }
    this.updateDancers();
    this.updateParty();
    this.updateFormation();
    if (!this.reduceMotion && this.beat() >= this.strobeNextBeat) {
      // Stay on the downbeat even when a frame arrives just after it. Following a
      // suspended tab, begin at the current bar rather than replaying old bursts.
      this.strobeBeat = Math.floor(this.beat() / 4) * 4;
      const [lo, hi] = STROBE_GAP_BARS;
      this.strobeNextBeat = this.strobeBeat + 4 * (STROBE_BARS + lo + Math.floor(Math.random() * (hi - lo + 1)));
    }
    if (!this.paused && this.t >= this.momentAt) {
      const pick = CLUB_MOMENTS.filter((k) => k !== this.lastMoment);
      this.startMoment(pick[Math.floor(Math.random() * pick.length)]);
      this.momentAt = this.t + this.barSeconds() * MOMENT_QUIET_BARS;
    }
    // the water coming in takes the beach balls, the confetti and the streamers with it
    if (this.underwater()) this.moments = this.moments.filter((m) => !DRY_MOMENTS.includes(m.kind));
    this.moments = this.moments.filter((m) => (PARTY_BEATS[m.kind]
      ? partyAlive(m, this.beat())
      // streamers stay until the last has fallen out of the picture (drawMoments)
      : this.t < m.t0 + m.life || (m.ribbons && !m.ribbonsOut && this.t < m.t0 + 16)));
    const now = this.heardNow();
    if (this.holding && (!Input.held(this.holding.source)
      || (this.holding.touch != null && !Input.touches?.has(this.holding.touch)))) this.letGo();
    if (this.holding) this.dragHeld();
    if (this.queued && now >= this.queued.when) {
      this.acting = this.queued;
      this.caption = this.queued;
      this.queued = null;
    }
    if (this.acting && now >= this.acting.when + this.acting.dur) this.acting = null;

    const { x, y } = Input.pointer;
    const inside = (b) => b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
    // THE FINGERS ON THE GLASS. Input gives the glass one 'pointer' press, for the first finger
    // down; another landing while it is still down — a pad struck while a hero is held — gets
    // none. So the club counts the fingers itself, every frame (whatever has the keys), and
    // the floor answers a new one below.
    const freshTouches = [];
    for (const [id, tch] of Input.touches || []) {
      if (!this.seenTouches.has(id)) { this.seenTouches.add(id); freshTouches.push([id, tch]); }
    }
    for (const id of [...this.seenTouches]) if (!Input.touches?.has(id)) this.seenTouches.delete(id);
    // A mouse over the dance floor keeps the bottom buttons awake (Peter, 5 Oct 2026).
    if (!Input.usingTouch && inside(this.boxes.floor)) this.buttonsAt = this.t;
    // A fader under the finger follows it until it lets go.
    if (this.dragging != null) {
      if (Input.held('pointer')) this.levelFromY(this.dragging, y);
      else this.dragging = null;
    }
    // The mixer panel stays open until it is closed — its icon, a tap outside it, or Enter / Back
    // (Peter, 5 Oct 2026: "dont auto hide the mixing panel").

    if (this.savePrompt) { this.updateSavePrompt(); return; }

    if (this.mixerOpen) {
      // THE MIXER PANEL owns the keys while it is open: left/right a fader, up/down its level,
      // and the ability key (X, or Shift) the selected part's next sound.
      if (Input.pressed('right')) this.mixSel = (this.mixSel + 1) % PARTS.length;
      if (Input.pressed('left')) this.mixSel = (this.mixSel + PARTS.length - 1) % PARTS.length;
      if (Input.pressed('up')) this.setLevel(this.mixSel, this.levels[PARTS[this.mixSel].id] + 0.1);
      if (Input.pressed('down')) this.setLevel(this.mixSel, this.levels[PARTS[this.mixSel].id] - 0.1);
      if (Input.pressed('ability') || Input.pressed('jump')) this.nextSound(this.mixSel);
      if (Input.pressed('confirm') || Input.pressed('back')) this.openMixer(false);
      else if (Input.pressed('pointer')) {
        const s = this.boxes.sounds.findIndex(inside);
        const k = this.boxes.faders.findIndex(inside);
        const tr = this.boxes.transport.findIndex(inside);
        if (this.boxes.reset && inside(this.boxes.reset)) this.resetMixer();
        else if (s >= 0) { this.mixSel = s; this.nextSound(s); }
        else if (k >= 0) { this.dragging = k; this.mixSel = k; this.levelFromY(k, y); }
        else if (tr >= 0) this.pressTransport(tr);   // the transport sits beside the mixer, open or shut
        else if (!inside(this.boxes.panel)) this.openMixer(false);   // a tap outside closes it
      }
      Input.endFrame();
      return;
    }

    // the floor's slots (left to right; in portrait the back row first), the mixer, back, the
    // pencil, the SAVE button while the song is not kept yet, then the transport's three. Up
    // and down belong to a hero held on the keys: they are its drag.
    const tBase = this.transportFocus();
    const targets = tBase + 3;
    const keyHold = this.holding && this.holding.source !== 'pointer';
    if (Input.pressed('right') || (!keyHold && Input.pressed('down'))) this.focus = (this.focus + 1) % targets;
    if (Input.pressed('left') || (!keyHold && Input.pressed('up'))) this.focus = (this.focus + targets - 1) % targets;
    const key = Input.pressed('confirm') ? 'confirm' : Input.pressed('jump') ? 'jump' : null;
    if (key) {
      if (this.focus < HERO_MOVES.length) this.pressHero(this.formationOrder[this.focus] ?? this.focus, key);
      else if (this.focus === HERO_MOVES.length) this.openMixer(true);
      else if (this.focus === HERO_MOVES.length + 1) this.back();
      else if (this.focus === HERO_MOVES.length + 2) this.edit();
      else if (this.focus >= tBase) this.pressTransport(this.focus - tBase);
      else if (this.focus === HERO_MOVES.length + 3) this.savePressed();
      else this.back();
    }
    if (Input.pressed('pause')) this.togglePause();
    // A SECOND FINGER on the dance floor plays its pad (the fingers are counted above).
    if (!Input.pressed('pointer')) {
      const f = this.boxes.floor;
      for (const [id, tch] of freshTouches) {
        if (this.tapDolores(tch.x0, tch.y0) || this.tapVacuum(tch.x0, tch.y0)) continue;
        if (f && tch.x0 >= f.x && tch.x0 <= f.x + f.w && tch.y0 >= f.y && tch.y0 <= f.y + f.h) this.hitPad(tch.x0, tch.y0, id);
      }
    }
    if (Input.pressed('pointer')) {
      const ball = this.boxes.ball;
      if (inside(this.boxes.led)) this.tapLedBoard();
      else if (inside(this.boxes.sign)) this.tapClubSign();
      else if (inside(this.boxes.back)) this.back();
      else if (inside(this.boxes.mixer)) this.openMixer(true);
      else if (inside(this.boxes.edit)) this.edit();
      else if (inside(this.boxes.save)) this.savePressed();
      else if (this.boxes.transport.some(inside)) this.pressTransport(this.boxes.transport.findIndex(inside));
      else if (this.tapBall(x, y)) { /* the beach ball took it */ }
      else if (this.tapDolores(x, y)) { /* Dolores joins in */ }
      else if (this.tapVacuum(x, y)) { /* the turbo hoover */ }
      else if (ball && Math.hypot(x - ball.x, y - ball.y) < ball.r * 1.6) this.grabBall(x, y);
      else {
        const h = this.boxes.heroes.findIndex(inside);
        const can = (this.boxes.cans || []).findIndex(inside);
        if (can >= 0) this.tapCan(can);
        else if (h >= 0) { this.focus = Math.max(0, this.formationOrder.indexOf(h)); this.pressHero(h, 'pointer'); }
        else if (this.pressSpeaker(x, y)) { /* a speaker: tapped, or held for the bass */ }
        else if (inside(this.boxes.floor)) this.hitPad(x, y, [...(Input.touches?.keys() || [])].at(-1) ?? null);
        else if (this.tapSky(x, y)) { /* up in the room: the lasers */ }
      }
    }
    // A finger dragging a held hero can read as the menus' swipe back: not while it is held.
    if (Input.pressed('back') && this.holding?.source !== 'pointer') this.back();
    Input.endFrame();
  }

  /**
   * The held hero, dragged: up from where the finger went down plays the move up, down plays
   * it down (club-fx.js dragHold), a whole drag DRAG_SPAN hero heights; on the keys, each up
   * or down a third of the way.
   */
  dragHeld() {
    const h = this.holding;
    const move = h && HERO_MOVES[h.i];
    if (!h?.held || !(move.drag || move.slices || move.speeds || move.holes || move.stops)) return;
    let delta = h.delta;
    if (h.source === 'pointer') {
      const span = (this.layout?.toonH || 60) * DRAG_SPAN;
      const y = (h.touch != null ? Input.touches?.get(h.touch)?.y : null) ?? Input.pointer.y;
      delta = Math.max(-1, Math.min(1, (h.y0 - y) / span));
    } else {
      // a key press is one notch of the move's own scale: a step of Clara's hole or Kiko's
      // stops, a third of the rest
      const steps = move.holes ? [move.holes.length, move.holeStart] : move.stops ? [move.stops.length, move.stopStart] : null;
      const notch = steps ? 1 / Math.max(1, steps[1] ?? 0, steps[0] - 1 - (steps[1] ?? 0)) : 1 / 3;
      if (Input.pressed('up')) delta = Math.min(1, delta + notch);
      if (Input.pressed('down')) delta = Math.max(-1, delta - notch);
    }
    if (delta === h.delta) return;
    h.delta = delta;
    const at = nextSixteenthAt();
    if (dragHold(h.held, delta, at) && move.slices && at) this.punch = { grab: this.beatAt(at.when), slice: move.slices[h.held.slice] };
  }

  /** The mixer's sound button for part `k`: its next sound, from the next bar line. */
  nextSound(k) {
    const part = PARTS[k]?.id;
    if (!part) return;
    this.iconsAt = this.t;
    Audio.sfx(this.voices.next(part) ? 'ui' : 'uiBad');
  }

  /** A sound swap has landed: the LED board says what the band is playing now. */
  voicesLanded(landed) {
    if (landed.part) this.mixerDirty = true;
    if (landed.part) {
      const label = PARTS.find((p) => p.id === landed.part)?.label || '';
      this.showLed(`${label}: ${landed.label}`);
    } else this.showLed(landed.swapped !== this.voices.eightBit ? '8-BIT MODE' : 'HI-FI MODE');
  }

  /** A line of the club's own on the LED board, now: held two bars, or scrolled once across. */
  showLed(text) {
    const t = String(text).toUpperCase();
    const scroll = ledWidth(t) > LED_COLS;
    this.led = { text: t, scroll, start: this.t, dur: scroll ? (LED_COLS + ledWidth(t)) / LED_SCROLL_COLS_S : 2 * this.barSeconds() };
  }

  /**
   * A tap on the dance floor: the pad under it — four across, the siren, the clap, the shout
   * and the horn (club-hits.js) — struck on the song's next sixteenth, and the bottom buttons
   * woken.
   */
  hitPad(x, y, touch = null) {
    const f = this.boxes.floor;
    this.buttonsAt = this.t;
    if (this.paused) return;   // a tap still wakes the buttons
    if (!f) return;
    const zone = Math.max(0, Math.min(PADS.length - 1, Math.floor((x - f.x) / (f.w / PADS.length))));
    const pad = PADS[zone];
    // the shout is a different word each time it is struck, round SHOUTS (club-hits.js)
    const word = pad.id === 'shout' ? SHOUTS[((this.shoutNext ?? -1) + 1) % SHOUTS.length] : null;
    const ctx = Audio.ctx;
    let when = this.heardNow();
    if (ctx && Audio.bank && Audio.musicBus && Number.isFinite(Audio.nextTime)) {
      // the first sixteenth on the song's grid that can still be played: the grid runs back
      // from the sequencer's write head as well as on from it
      const spb = this.barSeconds() / 16;
      when = Audio.nextTime + Math.ceil((ctx.currentTime + 0.012 - Audio.nextTime) / spb) * spb;
      // one strike of a pad per sixteenth, however many taps land on it
      if (this.padHits.some((p) => p.pad === pad.id && Math.abs(p.when - when) < 1e-3)) return;
      const tonic = typeof Audio.songTonic === 'function' ? Audio.songTonic(0) : null;
      // the siren rises to a bar line: the next one at least two beats on
      let until = null;
      if (pad.id === 'siren') {
        const step = Audio.step + Math.round((when - Audio.nextTime) / spb);
        let line = Math.ceil(step / 16) * 16;
        if (line - step < 8) line += 16;
        until = Audio.nextTime + (line - Audio.step) * spb;
      }
      playPad(ctx, Audio.musicBus, pad.id, when, { tonic: tonic || 220, sixteenth: spb, word, until, variant: this.hornVariant,
        hand: pad.id === 'clap' ? this.clapHand() : null, level: pad.id === 'clap' ? this.drumScale() : 1 });
    }
    if (word) this.shoutNext = SHOUTS.indexOf(word);
    this.padHits = [...this.padHits.filter((p) => this.t - p.t < PAD_WORD_S + 1),
      { pad: pad.id, col: pad.col, label: word?.word || pad.label, zone, x, y, when, t: this.t }];
    // the clap, held, goes on into its pattern (clapOn)
    if (pad.id === 'clap') this.clapHold = { touch, since: this.t, firstWhen: when, x, y, zone, step: null, barN: 0, fillIn: 2 + Math.floor(Math.random() * 3), fill: null };
  }

  /**
   * Fernwick's snare roll: hits on the song's grid, a bar of quarters, a bar of eighths, then
   * sixteenths, louder as it goes — booked a little ahead, and none on or after the drop.
   */
  rollOn() {
    const b = this.bow, ctx = Audio.ctx;
    if (!b || !ctx || !Audio.musicBus || !Number.isFinite(Audio.nextTime)) return;
    for (let n = 0; n < 64; n++) {
      const t = stepTime(b.rollStep);
      if (t == null || t > ctx.currentTime + 0.12) break;
      if (b.until != null && t >= b.until - 1e-3) { b.rollStep = Infinity; break; }
      const s = b.rollStep - b.step0;
      const every = ROLL_EVERY[Math.min(ROLL_EVERY.length - 1, Math.floor(s / 16))];
      if (s % every === 0 && t >= ctx.currentTime) rollHit(ctx, Audio.musicBus, t, 0.35 + 0.65 * Math.min(1, s / 48));
      b.rollStep += 1;
    }
  }

  // ------------------------------------------------------------------ drawing
  /**
   * THE LED BOARD (Peter, 3 Oct 2026): the red dot-matrix kind, a slogan held for a few
   * bars at a time — OPEN LATE among them — and now and then a short one that scrolls
   * across once. The unlit board is baked; the lit dots are drawn each frame.
   */
  /**
   * The board's next line, picked at random (never one of the last few): a scroll about one
   * time in three, and about a third of the time one of the song's own style's lines. A held
   * line stays LED_HOLD_BARS; a scroll lasts exactly as long as it takes to cross the board
   * and leave it, so it is never cut off.
   */
  nextLed(start) {
    const song = { title: this.rec?.name || '', bpm: this.song?.bpm || 0 };
    const style = LED_STYLE_LINES[this.rec?.style] || { hold: [], scroll: [] };
    const scroll = Math.random() < LED_SCROLL_CHANCE;
    const own = Math.random() < LED_STYLE_CHANCE;
    let pool = scroll ? (own && style.scroll.length ? style.scroll : LED_SCROLLS) : (own && style.hold.length ? style.hold : LED_SLOGANS);
    const fresh = pool.filter((l) => !this.ledRecent.includes(l));
    if (fresh.length) pool = fresh;
    const line = pool[Math.floor(Math.random() * pool.length)];
    this.ledRecent = [...this.ledRecent.slice(-(LED_RECENT - 1)), line];
    const text = fillLed(line, song);
    const scrolls = scroll || ledWidth(text) > LED_COLS;
    const dur = scrolls ? (LED_COLS + ledWidth(text)) / LED_SCROLL_COLS_S : LED_HOLD_BARS * this.barSeconds();
    return { text, scroll: scrolls, start, dur };
  }

  ledText() {
    if (!this.led || this.t < this.led.start) this.led = this.nextLed(this.t);
    for (let n = 0; this.t >= this.led.start + this.led.dur && n < 50; n++) this.led = this.nextLed(this.led.start + this.led.dur);
    const { text, scroll, start } = this.led;
    if (scroll) return { text, offset: LED_COLS - Math.floor((this.t - start) * LED_SCROLL_COLS_S) };
    return { text, offset: Math.floor((LED_COLS - ledWidth(text)) / 2) };
  }

  drawLed(ctx, x, y, pitch) {
    const ss = bakeSS();
    const key = `led|${pitch}|${ss}`;
    const w = (LED_COLS + 2) * pitch, h = (LED_ROWS + 2) * pitch;
    if (!this.bakes.has(key)) {
      const c = document.createElement('canvas');
      c.width = Math.ceil(w * ss); c.height = Math.ceil(h * ss);
      const g = c.getContext('2d');
      g.scale(ss, ss);
      g.fillStyle = '#0a0608'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#2a2230'; g.lineWidth = Math.max(0.6, pitch * 0.4); g.strokeRect(0, 0, w, h);
      g.fillStyle = '#2a0c0c';
      for (let r = 0; r < LED_ROWS; r++) for (let col = 0; col < LED_COLS; col++) {
        g.beginPath(); g.arc((col + 1.5) * pitch, (r + 1.5) * pitch, pitch * 0.36, 0, Math.PI * 2); g.fill();
      }
      this.bakes.set(key, c);
    }
    ctx.drawImage(this.bakes.get(key), x, y, w, h);
    const { text, offset } = this.ledText();
    if (this.led?.eq) { this.drawLedEq(ctx, x, y, pitch); return; }
    // The lit dots of a line are baked once into a strip (glow and all) and then only
    // slid across: they were hundreds of rects a frame, a fifth of the club's time on a phone
    // (Peter, 3 Oct 2026: slowdown in the lab).
    const skey = `ledtext|${text}|${pitch}|${ss}`;
    let strip = this.bakes.get(skey);
    if (!strip) {
      const w = ledWidth(text) * pitch + pitch * 2, h = (LED_ROWS + 2) * pitch;
      const c = document.createElement('canvas');
      c.width = Math.ceil(w * ss); c.height = Math.ceil(h * ss);
      const g = c.getContext('2d');
      g.scale(ss, ss);
      const d = pitch * 0.72;
      const dots = [];
      let cx = 0;
      for (const ch of text) {
        const glyph = LED_FONT[ch] || LED_FONT[' '];
        for (let gc = 0; gc < 5; gc++) for (let r = 0; r < LED_ROWS; r++) if (glyph[r] & (16 >> gc)) dots.push(cx + gc, r);
        cx += 6;
      }
      // a dot at column k sits at pitch * (k + 1.5) from the strip's left, less one pitch of margin
      g.fillStyle = '#ff2a1a'; g.globalAlpha = 0.22;
      for (let i = 0; i < dots.length; i += 2) g.fillRect((dots[i] + 0.5) * pitch, (dots[i + 1] + 0.5) * pitch, pitch * 2, pitch * 2);
      g.globalAlpha = 1; g.fillStyle = '#ff5a3c';
      for (let i = 0; i < dots.length; i += 2) g.fillRect((dots[i] + 1.5) * pitch - d / 2, (dots[i + 1] + 1.5) * pitch - d / 2, d, d);
      strip = { c, w, h };
      let oldestKey = null, oldestStrip = null, strips = 0;
      for (const [k, value] of this.bakes) {
        if (!k.startsWith('ledtext|')) continue;
        strips++;
        if (oldestKey == null) { oldestKey = k; oldestStrip = value; }
      }
      if (strips >= LED_TEXT_CACHE_MAX && oldestKey != null) {
        releaseCanvas(oldestStrip?.c);
        this.bakes.delete(oldestKey);
      }
      this.bakes.set(skey, strip);
    }
    ctx.save();
    ctx.beginPath(); ctx.rect(x + pitch, y, LED_COLS * pitch, h);
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(strip.c, x + offset * pitch, y, strip.w, strip.h);
    ctx.restore();
  }

  /**
   * THE BOARD AS A GRAPHIC EQUALISER, double-tapped (Peter, 5 Oct 2026: not the BPM, "something a
   * bit more fun"): LED_EQ_BARS bars of the music as it is heard, lows on the left, each two dots
   * wide with a gap, and a peak dot over each falling slowly back. Read off the song's analyser
   * (Audio.musicAnalysis); with none, it bounces on the beat. Each bar is a baked column.
   */
  drawLedEq(ctx, x, y, pitch) {
    const ss = bakeSS();
    const col = (h) => {
      const key = `ledeq|${h}|${pitch}|${ss}`;
      let c = this.bakes.get(key);
      if (!c) {
        c = document.createElement('canvas');
        const w = 4 * pitch, hh = (LED_ROWS + 2) * pitch;
        c.width = Math.ceil(w * ss); c.height = Math.ceil(hh * ss);
        const g = c.getContext('2d');
        g.scale(ss, ss);
        const d = pitch * 0.72;
        const lit = [];
        for (let r = 0; r < LED_ROWS; r++) if (h < 0 ? r === -h - 1 : r >= LED_ROWS - h) lit.push(r);
        g.fillStyle = '#ff2a1a'; g.globalAlpha = 0.22;
        for (const r of lit) for (let k = 0; k < 2; k++) g.fillRect((k + 0.5) * pitch, (r + 0.5) * pitch, pitch * 2, pitch * 2);
        g.globalAlpha = 1; g.fillStyle = '#ff5a3c';
        for (const r of lit) for (let k = 0; k < 2; k++) g.fillRect((k + 1.5) * pitch - d / 2, (r + 1.5) * pitch - d / 2, d, d);
        this.bakes.set(key, c);
      }
      return c;
    };
    const an = typeof Audio.musicAnalysis === 'function' && Audio.ctx ? Audio.musicAnalysis() : null;
    const spec = an?.spectrum;
    const peaks = (this.ledPeaks ||= new Float32Array(LED_EQ_BARS));
    const dt = Math.max(0, Math.min(0.1, this.t - (this.ledPeaksAt ?? this.t)));
    this.ledPeaksAt = this.t;
    const beat = this.beat();
    const top = spec?.length ? spec.length * 0.7 - 1 : 0;
    const bin = (b) => Math.floor(1 + top * ((2 ** ((b / LED_EQ_BARS) * 6) - 1) / 63));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let b = 0; b < LED_EQ_BARS; b++) {
      let v;
      if (spec?.length) {
        let m = 0;
        for (let k = bin(b), hi = Math.max(bin(b) + 1, bin(b + 1)); k < hi; k++) m = Math.max(m, spec[k] || 0);
        v = (m / 255) ** 1.5;
      } else v = (0.35 + 0.35 * Math.sin(beat * Math.PI * 0.5 + b * 0.55)) * (0.6 + 0.4 * Math.exp(-(((beat % 1) + 1) % 1) * 3));
      const h = Math.max(0, Math.min(LED_ROWS, Math.round(v * LED_ROWS)));
      peaks[b] = Math.max(h, peaks[b] - dt * 5);
      const cx = x + b * 3 * pitch;
      if (h > 0) ctx.drawImage(col(h), cx, y, 4 * pitch, (LED_ROWS + 2) * pitch);
      const p = Math.round(peaks[b]);
      if (p > h) ctx.drawImage(col(-(LED_ROWS - p) - 1), cx, y, 4 * pitch, (LED_ROWS + 2) * pitch);
    }
    ctx.restore();
  }

  /**
   * The rig's light show (tapCan; Peter, 5 Oct 2026: "go crazy and bright and start chasing each
   * other in lots of different colors"), now: how far it has faded (`k`), the sixteenth it is on
   * (`step`, the chase), and `colour(i)` — light i's colour this sixteenth, every light a different
   * one and each passing its colour on to the next, the tapped can's leading.
   */
  lightShowState(now) {
    const s = this.lightShow;
    if (!s) return null;
    const beats = (now - s.at) / (this.barSeconds() / 4);
    if (beats < 0) return null;
    if (beats >= LIGHT_SHOW_BEATS) { this.lightShow = null; return null; }
    const step = Math.floor(beats * 4);
    const lead = Math.max(0, DISCO.indexOf(s.col));
    return { col: s.col, k: Math.min(1, (LIGHT_SHOW_BEATS - beats) / 2), step, beats,
      colour: (i) => DISCO[(((lead + i - step) % DISCO.length) + DISCO.length) % DISCO.length] };
  }

  /**
   * The tapped lasers now (tapSky): the pattern playing, its colour, `q` beats into it, and whether
   * it is the last of the tap's cycle; null once they are done.
   */
  laserState(now) {
    const S = this.laserSweep;
    if (!S) return null;
    const beats = (now - S.at) / (this.barSeconds() / 4);
    if (beats < 0) return null;
    const n = Math.floor(beats / LASER_SWEEP_BEATS);
    if (n >= S.kinds.length) { this.laserSweep = null; return null; }
    const kind = S.kinds[n];
    return { kind, col: S.cols[n], dir: S.dir, from: kind === 'ceiling' ? 'ceiling' : 'floor',
      q: beats - n * LASER_SWEEP_BEATS, last: n === S.kinds.length - 1 };
  }

  /** Whether the mirror ball is down on its wire, where a laser can find it (it drops in last). */
  ballUp() {
    return !!this.boxes.ball && this.t - this.ballAt > this.barSeconds() * 0.8;
  }

  /**
   * How far along a laser from (ex, ey) it first meets the mirror ball — the ball hangs in the
   * rig's own plane — or null if it misses it within `len`. (dx, dy) is the on-screen part of the
   * beam's direction in the room, a unit vector whose third part points out of the screen.
   */
  laserMeetsBall(ex, ey, dx, dy, len) {
    const b = this.boxes.ball;
    if (!b || !this.ballUp()) return null;
    const mx = ex - b.x, my = ey - b.y;
    const p = mx * dx + my * dy, c = mx * mx + my * my - b.r * b.r;
    if (c <= 0 || p >= 0) return null;   // inside it, or heading away from it
    const disc = p * p - c;
    if (disc < 0) return null;
    const s = -p - Math.sqrt(disc);
    return s <= len ? s : null;
  }

  /**
   * Laser light thrown off the turning mirror ball from (hx, hy): a dozen beams off its facets at
   * uneven lengths, weaker than the beam that made them and dying away as they go (Peter, 3 Oct
   * 2026), and the white-hot point where it lands. Draws in whatever mode the caller set.
   */
  ballSpray(ctx, hx, hy, colour, a, sw, u, turn = 1, offset = 0) {
    for (let k = 0; k < (this.lite ? BALL_BOUNCES / 2 : BALL_BOUNCES); k++) {
      const ang = this.t * 1.3 * turn + k * (Math.PI * 2 / BALL_BOUNCES) + offset + 0.18 * Math.sin(k * 2.7);
      const reach = sw * (0.4 + 0.4 * ((k * 0.618) % 1));
      const x2 = hx + Math.cos(ang) * reach, y2 = hy + Math.sin(ang) * reach;
      const g = ctx.createLinearGradient(hx, hy, x2, y2);
      g.addColorStop(0, colour); g.addColorStop(1, colour + '00');
      ctx.strokeStyle = g;
      if (!this.lite) {
        ctx.globalAlpha = 0.04 * a; ctx.lineWidth = 3.5 * u;
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(x2, y2); ctx.stroke();
      }
      ctx.globalAlpha = 0.3 * a; ctx.lineWidth = 0.7 * u;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(x2, y2); ctx.stroke();
    }
    ctx.globalAlpha = a; ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(hx, hy, 1.6 * u, 0, Math.PI * 2); ctx.fill();
  }

  /**
   * The tapped lasers that met the mirror ball this frame (Peter, 5 Oct 2026: "those lights don't
   * seem to reflect in the disco ball. can they?"): they stop on it, the mirrors they land on light
   * up in their colour (drawDiscoBall's `hits`), and the ball throws them on round the room.
   */
  laserOnBall(ctx, hits, colour, sw, u) {
    if (!hits.length) return;
    const every = Math.ceil(hits.length / 6);
    hits.forEach((h, i) => { if (i % every === 0) this.ballHits.push({ x: h.x, y: h.y, colour, a: h.a }); });
    const a = Math.min(1, Math.max(...hits.map((h) => h.a)));
    const hx = hits.reduce((sum, h) => sum + h.x, 0) / hits.length, hy = hits.reduce((sum, h) => sum + h.y, 0) / hits.length;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    this.ballSpray(ctx, hx, hy, colour, a, sw, u);
    ctx.restore();
  }

  /**
   * THE LASER SWEEP (tapSky; Peter, 5 Oct 2026: "come out sweep up and out of the screen... not
   * swing side to side", and "from the ceiling or floor? mix it up"). Three emitters fire — on the
   * stage floor behind the heroes, or on the truss — their fans coming out pointed at the floor
   * (or the ceiling) right in front of them, opening, and sweeping away from it, slowly then
   * faster: from the floor UP and out of the top of the picture, from the ceiling DOWN and out of
   * the bottom, the side ones out past the walls, the middle one both ways. LASER_SWEEP_BEATS, in
   * one colour, spots where they land while they still point at the floor (or the ceiling).
   */
  drawLaserSweep(ctx, { sx, sw, stageTop, floorRef, u, now }) {
    const L = this.laserState(now);
    if (!L) return;
    const q = L.q;
    const hits = [];   // where its beams meet the mirror ball (laserOnBall)
    if (L.kind === 'sheet' || L.kind === 'scissors' || L.kind === 'tunnel') {
      this.drawLaserPattern(ctx, L, q, { sx, sw, stageTop, floorRef, u }, hits);
      this.laserOnBall(ctx, hits, L.col, sw, u);
      return;
    }
    const k = q / LASER_SWEEP_BEATS;
    const rise = k ** 1.4;                         // the sweep, gathering speed
    const open = Math.min(1, k * 4);                // the fans opening as they come out
    const fade = Math.min(1, q * 10) * laserOut(L, k, 0.2);
    const ceiling = L.from === 'ceiling';
    // the ceiling's beams are the floor's turned upside down: angles from straight up (or down)
    const flip = ceiling ? -1 : 1;
    const ey = ceiling ? stageTop + RIG_Y * u : floorRef - 4 * u;
    const near = ceiling ? stageTop + 2 * u : floorRef + 6 * u;   // where a beam pointed back lands
    const reach = Math.max(sw, floorRef - stageTop) * 2.2;
    // [x, start, end]: angles from straight away, clockwise — pointed back at its own surface,
    // round to away from it and out
    const fans = [[0.15, 0.8, -0.3], [0.5, 0.95, -0.15], [0.5, -0.95, 0.15], [0.85, -0.8, 0.3]];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = L.col; ctx.fillStyle = L.col;
    for (const [f, a0, a1] of fans) {
      const ex = sx + sw * f;
      const mid = Math.PI * (a0 + (a1 - a0) * rise);
      for (let b = 0; b < 6; b++) {
        const ang = mid + (b - 2.5) * 0.085 * open;
        const dx = Math.sin(ang), dy = -Math.cos(ang) * flip;
        // pointed back at the floor (or ceiling) it lands in a spot; away, it goes out of the
        // picture — unless the mirror ball is in the way
        const back = ceiling ? dy < -0.05 : dy > 0.05;
        let len = back ? Math.min(reach, Math.abs((near - ey) / dy)) : reach;
        const hit = this.laserMeetsBall(ex, ey, dx, dy, len);
        if (hit != null) { len = hit; hits.push({ x: ex + dx * len, y: ey + dy * len, a: fade }); }
        const x2 = ex + dx * len, y2 = ey + dy * len;
        if (!this.lite) {
          ctx.globalAlpha = 0.12 * fade; ctx.lineWidth = 3.5 * u;
          ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(x2, y2); ctx.stroke();
        }
        ctx.globalAlpha = 0.85 * fade; ctx.lineWidth = 0.75 * u;
        ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(x2, y2); ctx.stroke();
        if (back && hit == null) {
          ctx.globalAlpha = 0.55 * fade;
          ctx.beginPath(); ctx.ellipse(x2, y2, 3 * u, 1 * u, 0, 0, Math.PI * 2); ctx.fill();
        }
      }
      // the emitter, flaring as it fires
      ctx.globalAlpha = fade * (0.6 + 0.4 * Math.max(0, 1 - q * 2));
      ctx.beginPath(); ctx.arc(ex, ey, (2 + 2 * Math.max(0, 1 - q * 3)) * u, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    this.laserOnBall(ctx, hits, L.col, sw, u);
  }



  /**
   * The other laser patterns (LASER_PATTERNS), `q` beats in:
   *
   *   SHEET     three emitters on the truss, each throwing a flat fan of beams. The fan
   *             turns on its side about the line across the room: pointing down at the floor in
   *             front, then turning towards you — flattening, edge-on, into one bright line at eye
   *             level, where the room flashes, the beams in your eyes — and on round until it
   *             fans upwards (Peter: "imagine holding a flat object in front of you... and you
   *             slowly twist it"). Drawn as it would be seen: each beam's direction in the room,
   *             the part of it coming at you foreshortened away, and brighter the more it is.
   *   SCISSORS  two fans from the floor's corners crossing back and forth, twice.
   *   TUNNEL    a hollow cone of beams from the middle of the truss down onto the floor, turning,
   *             opening and closing.
   *
   * Every one comes from the truss or the floor — never out of the middle of the air (Peter).
   */
  drawLaserPattern(ctx, L, q, { sx, sw, stageTop, floorRef, u }, hits = []) {
    const k = q / LASER_SWEEP_BEATS;
    const fade = Math.min(1, q * 10) * laserOut(L, k, 0.15);
    const reach = Math.max(sw, floorRef - stageTop) * 2.4;
    const beam = (x1, y1, x2, y2, a) => {
      if (!this.lite) {
        ctx.globalAlpha = Math.min(1, 0.13 * a); ctx.lineWidth = 3.5 * u;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      ctx.globalAlpha = Math.min(1, 0.85 * a); ctx.lineWidth = 0.75 * u;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    };
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = L.col; ctx.fillStyle = L.col;
    if (L.kind === 'sheet') {
      // the fan's tilt: -80° (at the floor) round through 0 (at you) to +80° (up), taking its
      // time at either end and turning through your eyes
      const e = k * k * (3 - 2 * k);
      const phi = (-80 + 160 * (0.35 * k + 0.65 * e)) * Math.PI / 180;
      // on the truss: every laser comes from the scaffolding or the floor, never the air (Peter)
      const ey = stageTop + RIG_Y * u;
      for (const f of [0.2, 0.5, 0.8]) {
        const ex = sx + sw * f;
        for (let b = 0; b < 9; b++) {
          const th = ((b - 4) / 4) * 1.05;
          // the beam in the room: across (x), up (y) and at you (z)
          const dx = Math.sin(th), dy = Math.cos(th) * Math.sin(phi), dz = Math.cos(th) * Math.cos(phi);
          if (Math.hypot(dx, dy) < 1e-3) continue;
          // `reach` along it in the room, or as far as the mirror ball
          const a = fade * (0.55 + 1.1 * Math.max(0, dz));
          const hit = this.laserMeetsBall(ex, ey, dx, -dy, reach);
          const s = hit ?? reach;
          beam(ex, ey, ex + dx * s, ey - dy * s, a);
          if (hit != null) hits.push({ x: ex + dx * s, y: ey - dy * s, a: Math.min(1, a) });
        }
        ctx.globalAlpha = fade;
        ctx.beginPath(); ctx.arc(ex, ey, 2.2 * u, 0, Math.PI * 2); ctx.fill();
      }
      // edge-on at eye level: the beams in your eyes
      const glare = Math.exp(-((phi / 0.16) ** 2));
      if (glare > 0.02) {
        ctx.globalAlpha = 0.3 * glare * fade;
        ctx.fillRect(sx, stageTop, sw, floorRef + 60 * u - stageTop);
      }
    } else if (L.kind === 'scissors') {
      const ey = floorRef - 3 * u;
      const swing = Math.sin(k * Math.PI * 4 - Math.PI / 2);   // across and back, twice
      for (const [ex, side] of [[sx, 1], [sx + sw, -1]]) {
        for (let b = 0; b < 6; b++) {
          const ang = -Math.PI / 2 + side * (0.25 + 0.55 * (0.5 + 0.5 * swing) + (b - 2.5) * 0.07);
          const hit = this.laserMeetsBall(ex, ey, Math.cos(ang), Math.sin(ang), reach);
          const s = hit ?? reach;
          beam(ex, ey, ex + Math.cos(ang) * s, ey + Math.sin(ang) * s, fade);
          if (hit != null) hits.push({ x: ex + Math.cos(ang) * s, y: ey + Math.sin(ang) * s, a: fade });
        }
        ctx.globalAlpha = fade;
        ctx.beginPath(); ctx.arc(ex, ey, 2.2 * u, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      // the tunnel: from the middle of the truss, a hollow cone of beams down onto the floor,
      // turning, opening and closing — drawn as it is seen, each beam as it sits on the cone,
      // brighter coming round towards you, landing in spots
      const ex = sx + sw / 2, ey = stageTop + RIG_Y * u;
      const spin = q * Math.PI * 0.9;
      const half = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(q * Math.PI));   // the cone's half-angle, opening and closing
      const drop = floorRef + 4 * u - ey;
      for (let b = 0; b < 18; b++) {
        const psi = spin + (b / 18) * Math.PI * 2;
        const dx = Math.sin(half) * Math.cos(psi), down = Math.cos(half), dz = Math.sin(half) * Math.sin(psi);
        // down to the floor, as far across as the cone has opened by the time it gets there — or
        // onto the mirror ball, hanging in the middle of it, while the cone is narrow
        const a = fade * (0.5 + 0.8 * Math.max(0, dz));
        const hit = this.laserMeetsBall(ex, ey, dx, down, drop / down);
        const s = hit ?? drop / down;
        const x2 = ex + dx * s, y2 = ey + down * s;
        beam(ex, ey, x2, y2, a);
        if (hit != null) { hits.push({ x: x2, y: y2, a: Math.min(1, a) }); continue; }
        ctx.globalAlpha = 0.5 * fade;
        ctx.beginPath(); ctx.ellipse(x2, y2, 3 * u, 1 * u, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = fade;
      ctx.beginPath(); ctx.arc(ex, ey, 3 * u, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  /** A neon sign, drawn once (glow and all) and reused. */
  neon(text, size, colour) {
    const ss = bakeSS();
    const key = `${text}|${size}|${colour}|${ss}`;
    if (!this.bakes.has(key)) {
      const probe = document.createElement('canvas').getContext('2d');
      probe.font = `${size}px ${TITLE_FONT}`;
      const m = probe.measureText(text);
      const w = m.width + size * 1.6;
      const h = size * 2;
      // 'middle' centres the em box, not the letters: a caps-only title font sits well off
      // the board's centre. Put the ink's own middle on h/2 (Peter, 6 Oct 2026).
      const ink = Number.isFinite(m.actualBoundingBoxAscent) && Number.isFinite(m.actualBoundingBoxDescent)
        ? (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2 : 0;
      const c = document.createElement('canvas');
      c.width = Math.ceil(w * ss); c.height = Math.ceil(h * ss);
      const g = c.getContext('2d');
      g.scale(ss, ss);
      g.font = `${size}px ${TITLE_FONT}`;
      g.textBaseline = ink ? 'alphabetic' : 'middle'; g.lineJoin = 'round';
      g.shadowColor = colour; g.shadowBlur = size * 0.7;
      g.strokeStyle = colour; g.lineWidth = size * 0.11;
      g.strokeText(text, size * 0.8, h / 2 + ink);
      g.strokeText(text, size * 0.8, h / 2 + ink);
      g.shadowBlur = 0;
      g.strokeStyle = '#ffffff'; g.lineWidth = size * 0.035;
      g.strokeText(text, size * 0.8, h / 2 + ink);
      this.bakes.set(key, { img: c, w, h });
    }
    return this.bakes.get(key);
  }

  /** A soft round glow in `colour`, baked once at 128px and then only scaled: radial gradients cost on a phone. */
  glowSprite(colour) {
    const key = `glow|${colour}`;
    if (!this.bakes.has(key)) {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const g = c.getContext('2d');
      const lg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      lg.addColorStop(0, colour); lg.addColorStop(1, colour + '00');
      g.fillStyle = lg; g.fillRect(0, 0, 128, 128);
      this.bakes.set(key, c);
    }
    return this.bakes.get(key);
  }

  /** The truss across the top, drawn once. */
  truss(sw, th, u) {
    const ss = bakeSS();
    const key = `truss|${sw}|${th}|${ss}`;
    if (!this.bakes.has(key)) {
      const c = document.createElement('canvas');
      c.width = Math.ceil(sw * ss); c.height = Math.ceil((th + 6 * u) * ss);
      const g = c.getContext('2d');
      g.scale(ss, ss);
      g.strokeStyle = '#4a4660'; g.lineWidth = 0.9 * u;
      g.beginPath(); g.moveTo(0, u); g.lineTo(sw, u); g.moveTo(0, th); g.lineTo(sw, th); g.stroke();
      g.lineWidth = 0.5 * u; g.beginPath();
      for (let x = 0; x < sw; x += th) { g.moveTo(x, u); g.lineTo(x + th / 2, th); g.lineTo(x + th, u); }
      g.stroke();
      this.bakes.set(key, c);
    }
    return this.bakes.get(key);
  }

  draw(ctx) {
    this.ballHits = [];   // where lasers land on the mirror ball this frame
    const portrait = portraitMenuActive();
    // Portrait is the mock-up's phone layout at the game's width; u scales its strokes.
    const P = portrait ? W / 390 : 1;
    const u = portrait ? 1.9 * P : 1;
    const t = this.t;
    const beat = this.beat();
    const beatF = ((beat % 1) + 1) % 1;
    const beatN = Math.floor(beat);
    const barN = Math.floor(beat / 4);
    const pulse = Math.exp(-beatF * 6);
    const acting = this.acting ? HERO_MOVES[this.acting.i] : null;
    const accent = acting ? acting.col : '#c9a0ff';

    // Landscape draws into the part of the picture on screen — all of it, or under a cover
    // crop (update) the full width with the top and bottom trimmed — and keeps the heroes,
    // the sign and the buttons clear of the notch.
    const stageTop = portrait ? portraitMenuSafeTop() : visualiserFrame.top;
    const stageBot = portrait ? H : visualiserFrame.bottom;
    const safeL = portrait ? 0 : screen.safeLeft || 0, safeR = portrait ? 0 : screen.safeRight || 0;
    const sx = 0, sw = W, sh = stageBot - stageTop;
    const k270 = portrait ? 1 : sh / 270;   // landscape sizes are for the full 270
    const floorRef = portrait ? portraitMenuSafeBottom() - 110 * P : stageBot - Math.round(46 * k270);
    // bigger in landscape, and standing in front of the speakers (Peter, 3 Oct 2026)
    const toonH = portrait ? 96 * P : Math.round(66 * k270);
    const rows = portrait ? 2 : 1;
    const perRow = HERO_MOVES.length / rows;
    // The back row stands two heroes' heights behind the front, on a riser.
    // (in portrait the back row stands up on the speakers, taller than a riser: Peter, 3 Oct 2026)
    const rowGap = toonH * (portrait ? 2.35 : 2);
    // THE SPEAKERS: a giant stack each side — a sub cabinet with one big woofer under a top
    // cabinet of two mids and a horn. In landscape they stand fully on screen at the edges,
    // and the heroes dance BETWEEN them, so the woofers are seen (Peter, 3 Oct 2026); in
    // portrait there are FOUR, one under each hero of the back row, who stand on top of them
    // (Peter, 3 Oct 2026) — the stacks are exactly a row's height, so their tops are its floor.
    // Where the heroes stand: the whole width, in front of the speakers, clear of the notch.
    const heroL = portrait ? sx : safeL + 4;
    const cellW = (portrait ? sw : W - heroL - safeR - 4) / perRow;
    this.ballLayout = { heroL, cellW, perRow };   // where the beach ball lands
    this.layout = { toonH, floorRef, cellW, stageTop };   // a held hero's drag is measured in its height
    // the dance floor itself — the tiles from the front row's feet down — is the pads
    this.boxes.floor = { x: sx, y: floorRef, w: sw, h: stageBot - floorRef };
    const now = this.heardNow();
    // a par can tapped: the room in its colour for a while (tapCan)
    const show = this.lightShowState(now);
    // Fernwick's draw, 0 to 1 across his drawBars, while the bow is drawn and until it lands
    const bowMove = HERO_MOVES.find((m) => m.draw);
    const drawn = this.crowd && this.bow
      ? Math.max(0, Math.min(1, (now - this.crowd.since) / ((bowMove?.drawBars || 4) * this.barSeconds()))) : 0;
    const rig = (() => {
      if (portrait) {
        const w = cellW * 0.8;
        return { w, subH: rowGap * 0.6, topH: rowGap * 0.4, floor: floorRef, top: floorRef - rowGap,
          xs: Array.from({ length: perRow }, (_, c) => heroL + cellW * (c + 0.5) - w / 2) };
      }
      const w = 54 * k270, subH = 84 * k270, topH = 56 * k270;
      // in from the notch / island / home bar so the stacks are never under them; the heroes may
      // stand a little in front of them
      return { w, subH, topH, floor: floorRef, top: floorRef - subH - topH, xs: [safeL + 4, W - safeR - 4 - w] };
    })();

    ctx.save();
    ctx.fillStyle = '#0f0d24';
    ctx.fillRect(0, 0, W, H);
    // a speaker's BOOM jolts the room, and only the room: undone before the buttons
    const boomK = now >= this.boomAt ? Math.exp(-(now - this.boomAt) * 7) : 0;
    const joltX = boomK > 0.02 ? Math.sin((now - this.boomAt) * 70) * 3.5 * u * boomK : 0;
    // ...and, held for the bass, the room thumps down on every kick
    const bassThump = this.boost ? Math.max(0, (this.kickThump() ?? pulse) - 0.5) * 2 : 0;
    const joltY = (boomK > 0.02 ? Math.cos((now - this.boomAt) * 55) * 2.5 * u * boomK : 0) + bassThump * 2 * u;
    ctx.translate(joltX, joltY);

    // the room
    const bg = ctx.createLinearGradient(0, stageTop, 0, stageBot);
    bg.addColorStop(0, '#0f0d24'); bg.addColorStop(0.7, '#1a1236'); bg.addColorStop(1, '#120d26');
    ctx.fillStyle = bg;
    ctx.fillRect(sx, stageTop, sw, sh);

    // where a sign's cable meets the truss: clamped on after the truss is drawn, over its chord
    const rigClamps = [];
    // neon on the back wall, flickering now and then
    {
      const flick = (seed) => (hash(Math.floor(t * 9) + seed, 1, 2) > 0.94 ? 0.25 : 1);
      const a = this.neon('THE BANGER LAB', portrait ? 24 * P : 14, '#ff4fa3');
      // Both signs hang from the truss on two cables, on solid boards, rather than floating
      // in the air (Peter, 3 Oct 2026).
      // ...from the truss's bottom chord (8u) itself, each cable clamped on there and running
      // straight into the board — no eye (Peter, 5 Oct 2026: "just connect cleanly")
      const hang = (x, y, w, h, fill, edge) => {
        const top = stageTop + 8 * u;
        ctx.strokeStyle = '#3a3448'; ctx.lineWidth = 0.8 * u;
        ctx.beginPath();
        for (const cx of [x + w * 0.15, x + w * 0.85]) { ctx.moveTo(cx, top); ctx.lineTo(cx, y); rigClamps.push(cx); }
        ctx.stroke();
        ctx.fillStyle = fill; rr(ctx, x, y, w, h, 1.5 * u); ctx.fill();
        ctx.strokeStyle = edge; ctx.lineWidth = 0.8 * u; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x + 1.5 * u, y + 0.8 * u, w - 3 * u, 0.8 * u);
      };
      const ns = portrait ? 24 * P : 14;
      // the red dot-matrix board where OPEN LATE was in neon, its board (frame and all, LED_COLS
      // + 6 pitches) exactly as wide as the club sign's, in both orientations (Peter, 5 Oct 2026);
      // drawn first, so its cables run behind the club sign
      const pitch = (a.w - ns * 0.6) / (LED_COLS + 6);
      const bw = (LED_COLS + 2) * pitch;
      const bx = portrait ? sw - bw - 8 * P : sw - safeR - bw - 12;
      // in portrait, well below the club sign (Peter, 5 Oct 2026: "move the led down a fair bit")
      const by = stageTop + (portrait ? 108 * P : 34) - (LED_ROWS + 2) * pitch / 2;
      const bh = (LED_ROWS + 2) * pitch;
      hang(bx - 2 * pitch, by - 2 * pitch, bw + 4 * pitch, bh + 4 * pitch, '#16121c', '#3a3248');
      this.boxes.led = { x: bx - 2 * pitch, y: by - 2 * pitch, w: bw + 4 * pitch, h: bh + 4 * pitch };
      this.ledAt = { x: bx, y: by, pitch };   // where it is painted again over the CRT
      this.drawLed(ctx, bx, by, pitch);
      // in portrait the club sign sits left, just clear of the back button (Peter, 5 Oct 2026)
      const ax = portrait ? 62 * P - ns * 0.3 : safeL + 34, ay = (portrait ? stageTop + 44 * P : stageTop + 34) - a.h / 2;
      this.boxes.sign = { x: ax + ns * 0.3, y: ay + a.h / 2 - ns * 0.9, w: a.w - ns * 0.6, h: ns * 1.8 };
      hang(ax + ns * 0.3, ay + a.h / 2 - ns * 0.9, a.w - ns * 0.6, ns * 1.8, '#130f1f', '#2e2640');
      ctx.globalAlpha = flick(0) * (0.85 + 0.15 * pulse);
      ctx.drawImage(a.img, ax, ay, a.w, a.h);
      ctx.globalAlpha = 1;
    }

    // HAZE: seven huge soft puffs, drawn into a small layer (a fifth of the room's size) and
    // laid over the room in one go. Painted straight onto the screen they were a fifth of the
    // club's time on a phone — in portrait each is hundreds of pixels across (Peter, 3 Oct 2026:
    // slowdown in the lab). The gradients are smooth, so the small layer loses nothing.
    {
      const HZ = 0.22;
      const lw = Math.max(8, Math.ceil(sw * HZ)), lh = Math.max(8, Math.ceil((stageBot - stageTop) * HZ));
      let hc = this.hazeLayer;
      if (!hc || hc.width !== lw || hc.height !== lh) {
        hc = this.hazeLayer = document.createElement('canvas'); hc.width = lw; hc.height = lh;
      }
      const hg = hc.getContext('2d');
      hg.clearRect(0, 0, lw, lh);
      const puff = this.glowSprite('#aaa0d2');
      const haze = this.lite ? 4 : 7;
      hg.globalAlpha = 0.10;
      for (let i = 0; i < haze; i++) {
        const fa = hash(i, 31.7, 0);
        const r = (60 + 50 * ((fa * 5.1) % 1)) * u;
        const span = sw + 2 * r;
        const x = sx - r + (((fa * span) + t * (4 + i) * u) % span);
        const y = stageTop + (0.25 + 0.6 * ((fa * 3.7) % 1)) * (floorRef - stageTop);
        hg.drawImage(puff, (x - r - sx) * HZ, (y - r - stageTop) * HZ, r * 2 * HZ, r * 2 * HZ);
      }
      ctx.drawImage(hc, sx, stageTop, sw, stageBot - stageTop);
    }

    // beams from the par cans, swinging, flaring on the beat — and while Fernwick draws, all
    // swinging in to meet on the middle of the floor, where the drop will land
    // (the light show swings every can's beam, fast and wide, each its own colour)
    // Each can tilts with its beam, hung from one stem (Peter, 5 Oct 2026: "they were angled
    // before which i preferred"); the two end cans, dark outside a light show, lean in to the floor.
    const len = (floorRef - stageTop) * 1.15;
    const lensD = (LENS_Y - CAN_PIVOT_Y) * u;
    const canAng = CANS.map((f, j) => {
      const aim = -Math.atan2(sx + sw / 2 - (sx + sw * f), len);
      if (show) return Math.sin(t * 2.8 + j * 1.7) * 0.75;
      if (j === 0 || j === CANS.length - 1) return aim * 0.6;
      return Math.sin(t * 0.5 + (j - 1) * 2.1) * 0.45 * (1 - drawn) + aim * drawn;
    });
    const canLens = CANS.map((f, j) => ({ x: sx + sw * f - Math.sin(canAng[j]) * lensD, y: stageTop + CAN_PIVOT_Y * u + Math.cos(canAng[j]) * lensD }));
    for (let i = 0; i < (show ? CANS.length : 4); i++) {
      const j = show ? i : i + 1;
      const ox = sx + sw * CANS[j];
      ctx.save();
      // from the can's lens, not the truss above it (Peter, 5 Oct 2026: "lights dont originate
      // from the bulbs")
      ctx.translate(ox, stageTop + CAN_PIVOT_Y * u);
      ctx.rotate(canAng[j]);
      ctx.translate(0, lensD);
      const beamCol = show ? show.colour(i) : accent;
      const g = ctx.createLinearGradient(0, 0, 0, len);
      g.addColorStop(0, beamCol + (show ? '90' : '40')); g.addColorStop(1, beamCol + '00');
      ctx.globalAlpha = show ? (show.step % CANS.length === i ? 1 : 0.75) * show.k : 0.35 + 0.65 * pulse;
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(-3 * u, 0); ctx.lineTo(3 * u, 0); ctx.lineTo(18 * u, len); ctx.lineTo(-18 * u, len); ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // THE FLOOR: the food court's glossy tiles, each a faint light
    {
      const size = (stageBot - floorRef) / 2;
      const cols = Math.ceil(sw / size) + 1;
      const x0 = sx + (sw - cols * size) / 2;
      const actingX = this.acting && this.boxes.heroes[this.acting.i]
        ? this.boxes.heroes[this.acting.i].x + this.boxes.heroes[this.acting.i].w / 2 : null;
      const floorRowY = this.acting && portrait ? this.boxes.heroes[this.acting.i]?.floorY : null;
      // the pads struck and heard: the tile under the finger flashes in its pad's colour, and
      // the rest of that pad's quarter of the floor with it, fainter
      const padFlash = this.padHits.filter((h) => now >= h.when && now - h.when < PAD_FLASH_S);
      const padZone = (x) => Math.floor((x - sx) / (sw / PADS.length));
      // This bar's colours: random, never a neighbour's.
      const grid = [];
      for (let r = 0; r < 2; r++) {
        grid.push([]);
        for (let c = 0; c < cols; c++) {
          const taken = new Set([grid[r][c - 1], grid[r - 1]?.[c - 1], grid[r - 1]?.[c], grid[r - 1]?.[c + 1]]);
          const free = DISCO.map((_, k) => k).filter((k) => !taken.has(k));
          grid[r].push(free[Math.floor(hash(c, r, barN * 7.31) * free.length) % free.length]);
        }
      }
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < cols; c++) {
          const x = x0 + c * size, y = floorRef + r * size;
          ctx.fillStyle = (c + r) % 2 ? '#15112a' : '#1d1836';
          ctx.fillRect(x, y, size, size);
          const under = r === 0 && actingX != null && (floorRowY == null || floorRowY >= floorRef - 1)
            && Math.abs(x + size / 2 - actingX) < size * 0.9;
          const chased = !!show;
          const hot = show && (((c + r * 2 - show.step) % 5) + 5) % 5 === 0;
          const col = chased ? show.colour(c + r * 3) : under ? accent : DISCO[grid[r][c]];
          ctx.globalAlpha = chased ? (hot ? 0.6 : 0.3 + 0.15 * pulse) * show.k : under ? 0.24 + 0.16 * pulse : 0.07 + 0.07 * pulse;
          ctx.fillStyle = col; ctx.fillRect(x, y, size, size);
          // the tile's own light: a baked glow, scaled (the gradient reached 0.65 of the tile)
          ctx.globalAlpha = (under ? 0.2 : 0.05) + 0.09 * pulse;
          ctx.save(); ctx.beginPath(); ctx.rect(x, y, size, size); ctx.clip();
          ctx.drawImage(this.glowSprite(col), x + size / 2 - size * 0.65, y + size / 2 - size * 0.65, size * 1.3, size * 1.3);
          ctx.restore();
          let flash = 0, flashCol = null;
          for (const h of padFlash) {
            const k = 1 - (now - h.when) / PAD_FLASH_S;
            const on = h.x >= x && h.x < x + size && h.y >= y && h.y < y + size ? k
              : padZone(x + size / 2) === h.zone ? k * 0.4 : 0;
            if (on > flash) { flash = on; flashCol = h.col; }
          }
          if (flash > 0) {
            ctx.globalAlpha = 0.7 * flash;
            ctx.fillStyle = flashCol; ctx.fillRect(x, y, size, size);
            ctx.globalAlpha = 0.85 * flash;
            ctx.save(); ctx.beginPath(); ctx.rect(x, y, size, size); ctx.clip();
            ctx.drawImage(this.glowSprite(flashCol), x + size / 2 - size * 0.65, y + size / 2 - size * 0.65, size * 1.3, size * 1.3);
            ctx.restore();
          }
          ctx.globalAlpha = 1;
          ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.8 * u;
          ctx.strokeRect(x, y, size, size);
        }
      }
      const sheen = ctx.createLinearGradient(0, floorRef, 0, stageBot);
      sheen.addColorStop(0, 'rgba(255,255,255,0.10)'); sheen.addColorStop(0.35, 'rgba(255,255,255,0.02)');
      sheen.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = sheen; ctx.fillRect(sx, floorRef, sw, stageBot - floorRef);
      ctx.fillStyle = '#2a2342'; ctx.fillRect(sx, floorRef - 1.5 * u, sw, 2 * u);
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(sx, floorRef - 1.5 * u, sw, 0.6 * u);
    }

    // All the truss lamps snap white together, with broad beams through the haze.
    const strobe = strobePulse(beat, this.strobeBeat, this.reduceMotion);
    if (strobe > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = strobe * 0.42;
      const beam = ctx.createLinearGradient(0, stageTop, 0, stageBot);
      beam.addColorStop(0, 'rgba(224,242,255,0.8)');
      beam.addColorStop(1, 'rgba(224,242,255,0)');
      ctx.fillStyle = beam;
      for (const { x: fx, y: fy } of canLens) {
        ctx.beginPath();
        ctx.moveTo(fx - 3 * u, fy); ctx.lineTo(fx + 3 * u, fy);
        ctx.lineTo(fx + sw * 0.18, stageBot); ctx.lineTo(fx - sw * 0.18, stageBot);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }

    if (show) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.26 * Math.exp(-((show.beats * 2) % 1) * 5) * show.k;
      ctx.fillStyle = show.colour(0);
      ctx.fillRect(sx, stageTop, sw, sh);
      ctx.restore();
    }
    // a speaker held and dragged: the room throbs with the wobble, in eighths
    if (this.boost?.amount > 0.1) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.16 * this.boost.amount * (0.5 + 0.5 * Math.cos((((beat * 2) % 1) + 1) % 1 * Math.PI * 2));
      ctx.fillStyle = '#7849cb';
      ctx.fillRect(sx, stageTop, sw, sh);
      ctx.restore();
    }
    this.drawSpeakers(ctx, rig, u, pulse);
    this.drawLaserSweep(ctx, { sx, sw, stageTop, floorRef, u, now });
    // LASERS, in bursts — one bar in four — over the speakers and behind the heroes. The
    // bursts take turns between two rigs (Peter, 3 Oct 2026): fans from the bottom corners on
    // the floor, and an overhead rig on the truss raking down across the floor.
    if (barN % 4 === 0 && Math.floor(barN / 4) % 2 === 1) {
      const fade = Math.min(1, beatF + (beatN % 4) > 0 ? 1 : beatF * 8) * (0.55 + 0.45 * pulse);
      const ey = stageTop + RIG_Y * u;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      [0.25, 0.5, 0.75].forEach((f, j) => {
        const ex = sx + sw * f;
        const colour = acting ? accent : LASER[(((Math.floor(barN / 4) + j) % 3) + 3) % 3];
        // the whole fan sweeps side to side, snapping a step on each beat
        const sweep = Math.sin(t * 1.3 + j * 2.1) * 0.55 + ((beatN % 4) - 1.5) * 0.08 * (j % 2 ? -1 : 1);
        ctx.strokeStyle = colour;
        for (let k = 0; k < 5; k++) {
          const ang = Math.PI / 2 + sweep + (k - 2) * 0.13;
          // down to the floor, where it lands as a spot and glances back up off the gloss
          const len = (floorRef - ey) / Math.max(0.2, Math.sin(ang));
          const x2 = ex + Math.cos(ang) * len, y2 = ey + Math.sin(ang) * len;
          if (!this.lite) {   // the wide soft glow of each beam, dropped on a slow device
            ctx.globalAlpha = 0.10 * fade; ctx.lineWidth = 3.5 * u;
            ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(x2, y2); ctx.stroke();
          }
          ctx.globalAlpha = 0.75 * fade; ctx.lineWidth = 0.7 * u;
          ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(x2, y2); ctx.stroke();
          const bx2 = x2 + Math.cos(ang) * len * 0.35, by2 = y2 - Math.sin(ang) * len * 0.35;
          const bg = ctx.createLinearGradient(x2, y2, bx2, by2);
          bg.addColorStop(0, colour); bg.addColorStop(1, colour + '00');
          ctx.strokeStyle = bg; ctx.globalAlpha = 0.3 * fade; ctx.lineWidth = 0.7 * u;
          ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(bx2, by2); ctx.stroke();
          ctx.strokeStyle = colour;
          ctx.globalAlpha = 0.5 * fade; ctx.fillStyle = colour;
          ctx.beginPath(); ctx.ellipse(x2, y2, 3 * u, 1 * u, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = fade; ctx.fillStyle = colour;
        ctx.beginPath(); ctx.arc(ex, ey, 2 * u, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
    } else if (barN % 8 < 2) {
      // The floor rig plays for two bars now, the second fading out (Peter, 3 Oct 2026),
      // and one beam from each corner is aimed at the mirror ball and bounces off it.
      const q = beat - (barN - (barN % 8)) * 4;              // beats into the burst, 0–8
      const env = q < 0.125 ? q * 8 : q < 4 ? 1 : 1 - (q - 4) / 4;
      const fade = Math.max(0, env) * (0.55 + 0.45 * pulse);
      const ey = floorRef - 3 * u;
      const ball = this.boxes.ball;
      const ballUp = this.ballUp();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const beam = (x1, y1, x2, y2, a) => {
        if (!this.lite) {
          ctx.globalAlpha = 0.10 * a; ctx.lineWidth = 3.5 * u;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }
        ctx.globalAlpha = 0.75 * a; ctx.lineWidth = 0.7 * u;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      };
      // from the very edges of the screen (Peter, 3 Oct 2026)
      for (const [ex, dir] of [[sx, 1], [sx + sw, -1]]) {
        const colour = acting ? accent : LASER[(((Math.floor(barN / 8) + (dir > 0 ? 0 : 1)) % 3) + 3) % 3];
        const snap = (beatN % 4) * 0.12;
        const sweep = Math.sin(t * 1.7 + (dir > 0 ? 0 : 1.3)) * 0.35;
        ctx.strokeStyle = colour;
        for (let k = 0; k < 6; k++) {
          const ang = -Math.PI / 2 + dir * (0.15 + k * 0.16 + snap + sweep * 0.8);
          // long enough to reach the top of a tall portrait screen too
          const reach = Math.max(sw, stageBot - stageTop) * 1.5;
          beam(ex, ey, ex + Math.cos(ang) * reach, ey + Math.sin(ang) * reach, fade);
          // and its reflection in the glossy floor: the fan mirrored down, faint, dying away
          const rl = (stageBot - ey) * 1.6;
          const rx = ex + Math.cos(ang) * rl, ry = ey - Math.sin(ang) * rl;
          const rg = ctx.createLinearGradient(ex, ey, rx, ry);
          rg.addColorStop(0, colour); rg.addColorStop(1, colour + '00');
          ctx.strokeStyle = rg;
          beam(ex, ey, rx, ry, fade * 0.3);
          ctx.strokeStyle = colour;
        }
        if (ballUp) {
          // straight at the ball, and off it in a spray that turns with the ball
          const dx = ball.x - ex, dy = ball.y - ball.r * 0.2 - ey, d = Math.hypot(dx, dy);
          const hx = ex + dx * (1 - ball.r / d), hy = ey + dy * (1 - ball.r / d);
          beam(ex, ey, hx, hy, fade);
          // the mirrors it lands on light up in its colour (drawDiscoBall)
          this.ballHits.push({ x: hx, y: hy, colour, a: fade });
          // the bounces: a dozen, turning with the ball (ballSpray; Peter: more beams)
          this.ballSpray(ctx, hx, hy, colour, fade, sw, u, dir > 0 ? 1 : -1, dir > 0 ? 0 : 0.26);
          ctx.strokeStyle = colour;
        }
        ctx.globalAlpha = fade; ctx.fillStyle = colour;
        ctx.beginPath(); ctx.arc(ex, ey, 2 * u, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // low smoke over the floor, and its glow on the beat
    for (let i = 0; i < 5; i++) {
      const r = 70 * u;
      const span = sw + 2 * r;
      const x = sx - r + ((i / 5 * span + t * 9 * u * (i % 2 ? 1 : 0.6)) % span);
      const g = ctx.createRadialGradient(x, floorRef, 0, x, floorRef, r);
      g.addColorStop(0, 'rgba(190,180,230,0.13)'); g.addColorStop(1, 'rgba(190,180,230,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(x, floorRef, r, r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
    }
    {
      const fg = ctx.createLinearGradient(0, floorRef - 24 * u, 0, floorRef);
      fg.addColorStop(0, accent + '00'); fg.addColorStop(1, accent + '55');
      ctx.globalAlpha = 0.3 + 0.7 * pulse;
      ctx.fillStyle = fg;
      ctx.fillRect(sx, floorRef - 24 * u, sw, 24 * u);
      ctx.globalAlpha = 1;
    }

    // the truss and its par cans
    const th = 8 * u;
    ctx.drawImage(this.truss(sw, th, u), sx, stageTop, sw, th + 6 * u);
    // a clamp round the bottom chord: what the signs' cables and the cans hang from — plain, no
    // bolt dot or highlight (Peter, 5 Oct 2026: "dont like the dots", "too much")
    const clamp = (cx, w) => {
      ctx.fillStyle = '#3a364c';
      rr(ctx, cx - w / 2, stageTop + th - 1.4 * u, w, 2.8 * u, 0.8 * u); ctx.fill();
    };
    for (const cx of rigClamps) clamp(cx, 3 * u);
    this.boxes.cans = [];
    CANS.forEach((f, i) => {
      const cx = sx + sw * f, cy = stageTop + (LENS_Y - 3) * u;
      // each can's colour as it is now — what a tap on it plays (tapCan)
      const own = DISCO[(((i + beatN) % DISCO.length) + DISCO.length) % DISCO.length];
      this.boxes.cans.push({ x: cx - 9 * u, y: stageTop, w: 18 * u, h: th + 12 * u, col: own });
      // a clamp on the chord, one stem down from it, and the can tilted on the stem with its beam
      const pivotY = stageTop + CAN_PIVOT_Y * u;
      ctx.fillStyle = '#4a4660';
      ctx.fillRect(cx - 0.45 * u, stageTop + th, 0.9 * u, pivotY - stageTop - th + 0.6 * u);
      ctx.save();
      ctx.translate(cx, pivotY); ctx.rotate(canAng[i]); ctx.translate(-cx, -pivotY);
      ctx.fillStyle = '#16131f';
      rr(ctx, cx - 3.2 * u, cy - 1.6 * u, 6.4 * u, 4.6 * u, 1.2 * u); ctx.fill();
      ctx.globalAlpha = show ? ((i + show.step) % 2 ? 1 : 0.7) * show.k + (1 - show.k) * (0.45 + 0.55 * pulse) : 0.45 + 0.55 * pulse;
      ctx.fillStyle = show ? show.colour(i) : acting ? accent : own;
      ctx.beginPath(); ctx.ellipse(cx, cy + 3 * u, 2.6 * u, 1.3 * u, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
      clamp(cx, 3.6 * u);
    });

    this.drawBall(ctx, { portrait, P, u, t, sx, sw, sh, stageTop, pulse, accent, beat, show });


    this.drawMoments(ctx, 'back', { portrait, P, u, floorRef, toonH, stageTop, stageBot, beat });
    const party = this.moments.filter(m => PARTY_BEATS[m.kind] && partyAlive(m, beat));
    const solo = party.find(m => m.kind === 'spotlight');
    if (solo) {
      const age = partyAge(solo, beat);
      ctx.fillStyle = `rgba(0,0,12,${0.48 * Math.min(1, age * 2, (solo.beats - age) * 2)})`;
      ctx.fillRect(0, stageTop, W, stageBot - stageTop);
    }
    // THE HEROES
    this.boxes.heroes = [];
    // Painted after the loop: the front row's reflections first, in one pass, then the heroes.
    const paints = [], mirrors = [];
    const formationSlots = new Array(HERO_MOVES.length);
    this.formationOrder.forEach((hero, slot) => { formationSlots[hero] = slot; });
    // Slot k: left to right along a row, and in portrait the back row (on the speakers) first.
    const slotPosition = slot => {
      const r = portrait ? Math.floor(slot / perRow) : 0, c = portrait ? slot % perRow : slot;
      return { r, c, cx: heroL + cellW * (c + 0.5), floorY: portrait ? floorRef - (rows - 1 - r) * rowGap : floorRef };
    };
    // The beat the dancing follows: the music's, except where a move bends time for the room —
    // Ramon's stutter loops it, Kiko's tape stop winds it down (danceBeat).
    const danceBeat = this.danceBeat(beat);
    // Fernwick has the crowd while he draws: its crouch and jump (crowdMotion), not the party's.
    const crowd = this.crowdMotion();
    // Grumpos's echo, seen: ghosts of the floor thrown out one side and back the other, behind
    // the heroes, from the sprites they were last drawn with.
    this.drawEchoGhosts(ctx, cellW);
    HERO_MOVES.forEach((m, i) => {
      // Where each stands is the formation's: drawn afresh each visit, swapped now and then in landscape.
      const slot = formationSlots[i] ?? i;
      const { r, c, cx } = slotPosition(slot);
      let floorY = slotPosition(slot).floorY;
      // THE WALK-IN: on the way in they walk on from the sides — the left half from the
      // left, the right half from the right, the middle ones first so nobody crosses — and
      // stand on their spot facing the middle of the floor.
      const half = perRow / 2;
      const fromLeft = c < half;
      const dir = fromLeft ? 1 : -1;
      const rank = fromLeft ? half - 1 - c : c - half;
      const startX = fromLeft ? -cellW * 0.6 : W + cellW * 0.6;
      const shown = this.shownAt == null ? 0 : t - this.shownAt;
      const walkedIn = Math.max(0, shown - WALK_DELAY_S - rank * WALK_STAGGER_S - r * 0.12) * W * WALK_SPEED;
      const walkingIn = walkedIn < Math.abs(cx - startX);
      let formationWalk = null;
      const swap = this.formationSwap;
      if (swap && (swap.heroA === i || swap.heroB === i)) {
        const fromSlot = swap.heroA === i ? swap.slotA : swap.slotB;
        const toSlot = swap.heroA === i ? swap.slotB : swap.slotA;
        const from = slotPosition(fromSlot), to = slotPosition(toSlot);
        const progress = Math.max(0, Math.min(1, (beat - swap.beat0) / swap.beats));
        const ease = progress * progress * (3 - 2 * progress);
        const distance = Math.hypot(to.cx - from.cx, to.floorY - from.floorY) || 1;
        const lane = Math.sin(Math.PI * progress) * Math.min(toonH * 0.55, cellW * 0.32);
        const side = swap.heroA === i ? 1 : -1;
        formationWalk = { from, to, progress, ease,
          laneX: -(to.floorY - from.floorY) / distance * lane * side,
          laneY: (to.cx - from.cx) / distance * lane * side };
      }
      const walking = walkingIn || !!formationWalk;
      const hx = formationWalk
        ? formationWalk.from.cx + (formationWalk.to.cx - formationWalk.from.cx) * formationWalk.ease + formationWalk.laneX
        : walkingIn ? startX + dir * walkedIn : cx;
      if (formationWalk) floorY = formationWalk.from.floorY + (formationWalk.to.floorY - formationWalk.from.floorY) * formationWalk.ease + formationWalk.laneY;
      const walked = formationWalk
        ? formationWalk.progress * Math.hypot(formationWalk.to.cx - formationWalk.from.cx, formationWalk.to.floorY - formationWalk.from.floorY)
        : walkedIn;
      // A hero is tapped from the legs up: the box stops above the shoes, so all of the dance
      // floor is its pads (Peter, 5 Oct 2026: "allow the full range of them to be chosen").
      const box = { x: hx - cellW / 2 + 2, y: floorY - toonH - 6, w: cellW - 4, h: toonH + 6 - toonH * 0.08, floorY };
      this.boxes.heroes[i] = box;
      if (solo?.hero === i && !walking) {
        const fade = Math.min(1, partyAge(solo, beat) * 2, (solo.beats - partyAge(solo, beat)) * 2);
        // Straight down from the rig over the hero (Peter, 5 Oct 2026: it didn't quite hit them).
        // It used to fan out from the middle of the truss, so for anyone off-centre the cone
        // was aimed at their feet and leant away from their head — and its pool, half again a
        // hero's height across, lit the neighbours too. Now the cone stands over the hero and
        // the pool is one dancer wide.
        const spread = toonH * 0.55;
        const beam = ctx.createLinearGradient(hx, stageTop, hx, floorY);
        beam.addColorStop(0, `rgba(255,244,193,${0.05 * fade})`);
        beam.addColorStop(1, `rgba(255,244,193,${0.3 * fade})`);
        ctx.fillStyle = beam;ctx.beginPath();ctx.moveTo(hx - 4 * u, stageTop);
        ctx.lineTo(hx - spread, floorY);ctx.lineTo(hx + spread, floorY);
        ctx.lineTo(hx + 4 * u, stageTop);ctx.closePath();ctx.fill();
        ctx.fillStyle = `rgba(255,240,180,${0.25 * fade})`;
        ctx.beginPath();ctx.ellipse(hx, floorY, spread, toonH * 0.1, 0, 0, Math.PI * 2);ctx.fill();
      }
      const isActing = this.acting?.i === i && !walking;
      const isQueued = this.queued?.i === i;
      const focused = this.focus === slot && !Input.usingTouch && !walking;
      // B-33P stays lit for as long as the band is on his 8-bit (or about to be)
      const lit = m.toggle && this.voices?.swapped;
      const ground = () => {
      if (isActing || isQueued || lit) {
        const r0 = toonH * 0.75;
        const sp = ctx.createRadialGradient(hx, floorY - toonH * 0.45, 0, hx, floorY - toonH * 0.45, r0);
        sp.addColorStop(0, m.col + '88'); sp.addColorStop(0.6, m.col + '33'); sp.addColorStop(1, m.col + '00');
        ctx.globalAlpha = isActing ? 0.6 + 0.4 * pulse : isQueued ? 0.3 + 0.25 * Math.sin(t * 12) : 0.35 + 0.25 * pulse;
        ctx.fillStyle = sp;
        ctx.beginPath(); ctx.arc(hx, floorY - toonH * 0.45, r0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(hx, floorY + 1, toonH * 0.22, toonH * 0.045, 0, 0, Math.PI * 2); ctx.fill();
      };
      let pose = { kind: 'idle', grounded: true, menu: true, time: t + i * 0.37, squash: pulse * 0.08 };
      let lift = 0;
      // the stride integrated from the distance walked, so the feet keep their footing
      if (walking) pose = { kind: 'run', grounded: true, menu: true, time: t, phase: (walked / (toonH * 1.15)) % 1 };
      // the back row in portrait comes in over the speaker tops, a hop from one to the next
      if (walkingIn && portrait && floorY < floorRef - 1) {
        const hop = Math.abs(Math.sin(Math.PI * (walked + cellW * 0.5) / cellW));
        lift += hop * toonH * 0.45;
        if (hop > 0.15) pose = { kind: 'jump', grounded: false, menu: true, time: t, vy: Math.cos(Math.PI * (walked + cellW * 0.5) / cellW) * 200 };
      }
      // dancing, once they have joined in — to the beat as heard
      const dancer = this.dancers[i];
      let dance = !walking && dancer.move ? heroDancePose(dancer.move, danceBeat) : null;
      if (dance) {
        const mv = dancer.move;
        if (mv.move === 'tap' || mv.move === 'tap-sway' || mv.move === 'slow-tap') {
          // the quiet tapping moves wear their own legs, whoever is dancing them — as the gallery
          // shows; Grumpos's slow tap once every `tapEvery` beats
          dance = tameSkirt(dance, mv.labLegs || 'tap', danceBeat / (mv.tapEvery || 1));
          if (mv.alternateTap && Math.floor(danceBeat / 4) % 2 === 1 && dance.dance.feet) {
            dance.dance.feet = dance.dance.feet.slice().reverse().map(([fx, fy]) => [-fx, fy]);
            dance.dance.ankles = dance.dance.ankles.slice().reverse();
          }
        } else if (dancer.skirted) dance = tameSkirt(dance, dancer.legs, danceBeat);
      }
      if (dance) pose = dance;
      if (!walking && !isActing && crowd) {
        const changed = partyHero(crowd.m, crowd.age, m.hero, i, pose);
        pose = changed.pose; lift += changed.lift * toonH;
        if (pose !== dance) dance = pose;
      } else if (!walking && !isActing) for (const moment of party) {
        const changed = partyHero(moment, beat, m.hero, i, pose);
        pose = changed.pose; lift += changed.lift * toonH;
        if (pose !== dance && (moment.kind === 'drop-jump' || moment.kind === 'spotlight' && moment.hero === i)) dance = pose;
      }
      // BONK: a hero the beach ball comes down on reacts — a start, a duck, then back to it
      // (Peter, 3 Oct 2026). Every head a ball comes down on.
      if (!walking) {
        const beatS = this.barSeconds() / 4, br = toonH * BALL_R;
        for (const bm of this.moments) {
          if (bm.kind !== 'ball') continue;
          for (let b = 0; b < (bm.balls || 1); b++) {
            if (bm.popped?.[b]) continue;
            for (const land of this.ballPath(bm, b, br)) {
              if (!land.head) continue;
              const since = t - (bm.t0 + (b * BALL_SPAWN_BEATS + land.at) * beatS);
              if (since < 0 || since > beatS * 1.5) continue;
              // only the front row: it is their heads the ball comes down on
              if (r !== rows - 1 || Math.abs(hx - land.x) > cellW * 0.5) continue;
              const k = 1 - since / (beatS * 1.5);
              pose = { ...pose, faceSurprised: true, headTurn: 18 * k,
                squash: 0.18 * Math.sin(Math.PI * Math.min(1, since / (beatS * 0.6))) * k };
            }
          }
        }
      }
      // a ball popped over a hero's head: they flinch
      if (!walking && this.flinch && t - this.flinch.t < 0.6 && r === rows - 1 && Math.abs(hx - this.flinch.x) < cellW * 0.7) {
        const k = 1 - (t - this.flinch.t) / 0.6;
        pose = { ...pose, faceSurprised: true, headTurn: -22 * k, squash: 0.22 * k };
      }
      // the wave: each column in turn, an eighth of a bar apart, a beat-long jump with arms up
      const wk = (t - this.waveAt) / this.barSeconds() - (c / perRow) * WAVE_SPREAD;
      if (wk >= 0 && wk < WAVE_JUMP && !walking && !isActing && !crowd && !party.some(m => m.kind === 'drop-jump')) {
        const up = Math.sin(Math.PI * (wk / WAVE_JUMP));
        lift += up * toonH * 0.45;
        const base = pose.dance || { ankles: [0, 0], pointAngle: null, shoulderLift: 0 };
        pose = { ...pose, kind: pose.dance ? pose.kind : 'stand', dance: { ...base, hands: [[0.4, -1.05], [0.4, -1.05]], pointAngle: null } };
      }
      if (isActing) {
        if (dance) pose = { kind: 'idle', grounded: true, menu: true, time: t + i * 0.37 };
        const run = this.heardNow() - this.acting.when;
        // a held move loops the hero's move for as long as it is held
        const p = Number.isFinite(this.acting.dur) ? Math.min(1, run / this.acting.dur) : (run / this.acting.bar) % 1;
        const a = titleParadeAction(m.hero, t, (p * 2) % 1);
        pose = { ...pose, ...a.pose, kind: a.pose.kind || 'idle', phase: (t * 1.6) % 1, time: t };
        if (!a.pose.kind && !a.pose.menuAction && !a.pose.float && !a.pose.headless) pose.kind = 'celebrate';
        lift = a.feetLift * toonH;
      }
      // PAUSED, everyone just stands there: their own idle, their resting face, no dance, no
      // move, no grin (Peter, 5 Oct 2026: "when we pause the heroes should all revert to their
      // regular idle pose... not smiling, just there neutral expressions").
      if (this.paused && !walking) {
        pose = { kind: 'idle', grounded: true, menu: true, time: t + i * 0.37 };
        dance = null;
        lift = 0;
      }
      // The right half faces left: the painter draws a hero facing right, so it is
      // mirrored round its own middle.
      const face = (ctx, fn, ax = hx) => {
        if (dir > 0) { fn(); return; }
        ctx.save(); ctx.translate(ax, 0); ctx.scale(-1, 1); ctx.translate(-ax, 0); fn(); ctx.restore();
      };
      // A dance sways the whole hero (shift, bounce, tilt round the feet), as the lab draws it.
      const body = (ctx, feetY, ax = hx) => {
        ctx.save();
        if (!dance || isActing) { drawToon(ctx, m.hero, pose, ax, feetY, toonH); ctx.restore(); return; }
        ctx.save();
        ctx.translate(ax + pose.shift * toonH, feetY - pose.bounce * toonH);
        ctx.rotate(pose.tilt);
        drawToon(ctx, m.hero, pose, 0, 0, toonH);
        ctx.restore();
        ctx.restore();
      };
      // the front row is mirrored in the gloss
      if (floorY >= floorRef - 1) {
        mirrors.push({ floorY, draw: (c) => { try { face(c, () => body(c, floorY - lift)); } catch {} }, height: toonH, anchorX: hx, lift });
      }
      paints.push({ floorY, draw: () => {
        ground();
        try {
          // through the hero's own sprite, refreshed every other frame (every third on a slow
          // device) and laid down at whole device pixels — see heroSprite
          this.heroSprite(ctx, i, hx, floorY - lift, toonH, dir,
            (c, ax, ay) => face(c, () => body(c, ay, ax), ax),
            () => face(ctx, () => body(ctx, floorY - lift)));
        } catch {
          ctx.fillStyle = m.col; ctx.fillRect(hx - 8 * u, floorY - toonH, 16 * u, toonH);
        }
        // the food court's gold wedge over the hero you are on, bobbing as it does there —
        // just over this hero's own head (the top of their ink), riding their dance's bounce
        if (focused) {
          const k = toonH / 48;
          const headY = floorY - lift - toonInkTop(m.hero) * toonH - (dance && !isActing ? pose.bounce * toonH : 0);
          drawPlayerMarker(ctx, hx, headY - MARKER_GAP * k + Math.sin(t * 2.6) * 1.3 * k, MARKER_R * k);
        }
      } });
    });
    // THE REFLECTIONS: the food court's painter — mirrored round the soles, faded out down
    // the floor and laid once — rather than a flat squashed copy (Peter, 3 Oct 2026). Fainter
    // than the food court's, on a floor that is mostly dark gloss.
    // Drawn at HALF resolution into a cache that is refreshed every third frame, and laid
    // down once a frame: the food court's painter redrew the whole front row and composited a
    // full-width band at full density every frame, a fifth of the club's time on a phone
    // (Peter, 3 Oct 2026: slowdown in the lab).
    this.drawReflections(ctx, mirrors.sort((a, b) => a.floorY - b.floorY), floorRef + REFLECT_SOLE_DROP * toonH / 46, toonH);
    for (const paint of paints.sort((a, b) => a.floorY - b.floorY)) paint.draw();

    this.drawMoments(ctx, 'front', { portrait, P, u, floorRef, toonH, stageTop, stageBot, beat });
    // Lorenzo's caption goes UNDER his water, its bubbles and its fish (Peter, 5 Oct 2026: they
    // "should fly in front of the instruction panel when we are under water")
    const flooded = !!(this.caption && HERO_MOVES[this.caption.i]?.drain);
    if (flooded) this.drawCaption(ctx, { portrait, P, stageTop });
    // What the move playing does to the room, over all of it (drawMoveRoom).
    this.drawMoveRoom(ctx, { u, t, sx, sw, stageTop, stageBot, floorRef, toonH, beat, pulse, drawn });
    // Illuminate the cast and floor too; captions and controls are painted afterwards.
    if (strobe > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(224,242,255,${strobe * 0.18})`;
      ctx.fillRect(sx, stageTop, sw, sh);
      ctx.restore();
    }
    ctx.translate(-joltX, -joltY);
    // B-33P's 8-BIT, seen: while the band plays on the 8-Bit set, the room is on a CRT — all
    // of it but the UI, which is painted from here on (club-crt.js; Peter, 5 Oct 2026).
    if (this.voices?.swappedNow && !this.voices.eightBit
      && clubCrt(ctx, { top: stageTop, bottom: stageBot, toonH, lite: this.lite }) && this.ledAt) {
      // ...but the LED board says things, so it is painted again over the tube, crisp
      this.drawLed(ctx, this.ledAt.x, this.ledAt.y, this.ledAt.pitch);
    }
    // the floor pads' words, over the tube: they are what the player just did
    this.drawPadWords(ctx, { toonH, stageBot });
    if (!flooded) this.drawCaption(ctx, { portrait, P, stageTop });

    this.popupY = floorRef - toonH - (portrait ? 24 * P : 10);
    this.drawControls(ctx, { portrait, P, u, stageTop, stageBot, safeL, safeR });
    this.drawIntro(ctx, { portrait, P, stageTop, stageBot });
    this.drawTitle(ctx, { portrait, P });
    if (this.savePrompt) this.drawSavePrompt(ctx);
    ctx.restore();
  }

  /**
   * The move just made, and whose it was: its name and its line, for four beats. A held move's
   * stays up while it is held — but Lorenzo's goes in its own time, under the water, and his
   * first fish set off as it starts to fade (fishOn; Peter, 5 Oct 2026).
   */
  drawCaption(ctx, { portrait, P, stageTop }) {
    let capSince = this.caption ? (this.heardNow() - this.caption.when) / (this.caption.bar / 4) : Infinity;
    if (this.caption && this.holding?.i === this.caption.i && !HERO_MOVES[this.caption.i].drain) capSince = Math.min(capSince, 1);
    if (capSince < CAPTION_BEATS) {
      // a move's own name and line — or, for B-33P's toggle, which way it went
      const m = { ...HERO_MOVES[this.caption.i], ...(this.caption.title ? { move: this.caption.title } : {}),
        ...(this.caption.what ? { what: this.caption.what } : {}) };
      const what = m.what.toUpperCase();   // in capitals, as the rest of the club's words are (Peter, 5 Oct 2026)
      const since = capSince;
      const a = 1 - Math.max(0, (since - CAPTION_FADE_BEATS) / (CAPTION_BEATS - CAPTION_FADE_BEATS));
      const pop = 1 + 0.25 * Math.exp(-since * 4);
      const big = portrait ? 40 * P : 20, small = portrait ? 15 * P : 8;
      ctx.save();
      ctx.globalAlpha = Math.max(0, a);
      ctx.translate(W / 2, stageTop + (portrait ? 262 * P : 96));
      ctx.scale(pop, pop);
      ctx.textAlign = 'center';
      ctx.font = `${big}px ${TITLE_FONT}`;
      const w1 = ctx.measureText(`${m.move}!`).width;
      ctx.font = `500 ${small}px ${BODY_FONT}`;
      // too wide for the screen at its biggest (in capitals, in portrait): broken at its dash
      const fits = ctx.measureText(what).width + big <= (W - 16) / 1.25;
      const lines = fits ? [what] : what.split(/\s+—\s+/);
      const w2 = Math.max(...lines.map((l) => ctx.measureText(l).width));
      const pw = Math.max(w1, w2) + big;
      const lineH = small * 1.3;
      ctx.globalAlpha *= 0.62;
      ctx.fillStyle = '#0b0b14';
      rr(ctx, -pw / 2, -big * 1.5, pw, big * 2.4 + lineH * (lines.length - 1), big * 0.45); ctx.fill();
      ctx.globalAlpha = Math.max(0, a);
      ctx.font = `600 ${small}px ${BODY_FONT}`;
      ctx.fillStyle = m.col;
      ctx.fillText(m.name, 0, -big * 0.95);
      ctx.font = `${big}px ${TITLE_FONT}`;
      ctx.lineWidth = big * 0.15; ctx.strokeStyle = '#0b0b14';
      ctx.strokeText(`${m.move}!`, 0, 0);
      ctx.fillStyle = m.col;
      ctx.fillText(`${m.move}!`, 0, 0);
      ctx.font = `500 ${small}px ${BODY_FONT}`;
      ctx.fillStyle = '#c8c8d8';
      lines.forEach((l, k) => ctx.fillText(l, 0, small * 1.65 + lineH * k));
      ctx.restore();
    }
  }

  /**
   * The beat the heroes dance to: the music's own, except where a move bends time for the
   * room. ROCKET FIST loops the floor with the stutter, slice after slice; POWER DOWN winds
   * the dancers down with the tape (speed falling to nothing across each stop: the distance
   * travelled is u − u²/2 of it), and they are back on the beat when the music is.
   */
  danceBeat(beat) {
    const a = this.acting;
    const move = a && HERO_MOVES[a.i];
    if (!move) return beat;
    if (move.slices && this.punch && beat >= this.punch.grab) {
      return this.punch.grab + ((beat - this.punch.grab) % this.punch.slice);
    }
    if (move.onTwoOrFour) {
      const now = this.heardNow();
      const s = this.stops.find((x) => now >= x.from && now < x.until);
      if (s) {
        const hits = s.hits || 1, len = (s.until - s.from) / hits;
        const h = Math.floor((now - s.from) / len), u = (now - s.from) / len - h;
        return this.beatAt(s.from + h * len) + (len * 4 / this.barSeconds()) * (u - u * u / 2);
      }
    }
    return beat;
  }

  /**
   * GRUMPOS'S ECHO, SEEN: each repeat of his boomerang throws a ghost of the whole floor,
   * out to one side and then the other as the ping-pong does, fading repeat by repeat. Drawn
   * behind the heroes from the sprites they were last laid down with (heroSprite).
   */
  drawEchoGhosts(ctx, cellW) {
    const spec = HERO_MOVES.find((m) => m.echo)?.echo;
    if (!this.echoes.length || !spec || !this.heroSprites?.length || typeof ctx.getTransform !== 'function') return;
    let m;
    try { m = ctx.getTransform(); } catch { return; }
    const beatS = this.barSeconds() / 4, now = this.heardNow();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const e of this.echoes) {
      // as loud as they were thrown: brighter for a wetter echo, each falling as its feedback does
      const loud = Math.min(1.5, ((e.wet ?? 0.35) / 0.35) ** 0.8);
      for (let k = 1; k <= spec.repeats; k++) {
        const age = (now - (e.when + k * spec.every * beatS)) / beatS;
        if (age < 0 || age >= GHOST_BEATS) continue;
        ctx.globalAlpha = Math.min(0.85, 0.55 * loud * Math.max(0.3, e.feedback ?? 0.5) ** (k - 1) * (1 - age / GHOST_BEATS) ** 0.6);
        const dx = (k % 2 ? -1 : 1) * cellW * (0.28 + 0.1 * age) * m.a;
        for (const hs of this.heroSprites) {
          if (hs?.last && hs.canvas?.width) ctx.drawImage(hs.canvas, hs.last.x + dx, hs.last.y, hs.last.w, hs.last.h);
        }
      }
    }
    ctx.restore();
  }

  /**
   * WHAT EACH MOVE DOES TO THE ROOM, over all of it, before the captions (Peter, 5 Oct 2026:
   * the moves should look like what they do). Each one only while it plays:
   *
   *   UNDERWATER    the room goes under: a teal wash as deep as the drag, light rippling
   *                 across the floor, bubbles rising
   *   ROCKET FIST   a punch of light at the top of every repeat
   *   POWER DOWN    the lights die with the tape, and slam back on with the music
   *   PLOT HOLE     the room goes dark but for the floor, which flashes on the kick
   *   SPEED BOOST   streaks across the room going fast; a cold blue for slow-mo
   *   LONGBOW       the room lifts from the floor up as the bow is drawn
   *
   * (and 8-BIT puts the whole room on a CRT, after all of these: club-crt.js).
   */
  drawMoveRoom(ctx, { u, t, sx, sw, stageTop, stageBot, floorRef, toonH, beat, pulse, drawn }) {
    const a = this.acting;
    const move = a && HERO_MOVES[a.i];
    const now = this.heardNow();
    const sh = stageBot - stageTop;
    ctx.save();
    if (move?.hero === 'lorenzo') {
      const level = this.holding?.i === a.i ? this.holding.held?.level ?? move.drag.start : a.drain?.level ?? move.drag.start;
      const depth = 1 - Math.max(0, Math.min(1, level));
      const fade = Math.min(1, (now - a.when) * 6);
      // the water: to the ceiling while he is held; let go, it drains down to the floor and away
      // (club-fx.js endHold glides the music back out over the same time)
      const out = a.drain ? Math.max(0, Math.min(1, (now - a.drain.from) / Math.max(1e-3, a.drain.until - a.drain.from))) : 0;
      const water = 1 - out * out * (3 - 2 * out);
      const surf = stageBot - sh * water;
      const wave = (x, j = 0) => Math.sin(x * 0.045 / u + t * 2.2 + j * 1.7) * 2.2 * u + Math.sin(x * 0.11 / u - t * 1.3 + j) * u;
      ctx.globalAlpha = fade * (0.14 + 0.3 * depth);
      ctx.fillStyle = '#0b5f6a';
      if (water >= 1) ctx.fillRect(sx, stageTop, sw, sh);
      else if (water > 0) {
        ctx.beginPath();
        ctx.moveTo(sx, stageBot);
        for (let x = sx; x <= sx + sw + 6 * u; x += 6 * u) ctx.lineTo(x, surf + wave(x));
        ctx.lineTo(sx + sw, stageBot);
        ctx.closePath(); ctx.fill();
        // the surface going down
        ctx.globalAlpha = fade * 0.55 * Math.min(1, water * 6);
        ctx.strokeStyle = '#bff8ff'; ctx.lineWidth = 1.1 * u;
        ctx.beginPath();
        for (let x = sx; x <= sx + sw + 6 * u; x += 6 * u) { if (x === sx) ctx.moveTo(x, surf + wave(x)); else ctx.lineTo(x, surf + wave(x)); }
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(150,255,235,1)';
      ctx.lineWidth = 0.9 * u;
      for (let j = 0; j < 6; j++) {
        ctx.globalAlpha = fade * (0.05 + 0.05 * (1 - depth));
        const y0 = floorRef + (j + 0.5) / 6 * (stageBot - floorRef);
        if (y0 < surf + 3 * u) continue;
        ctx.beginPath();
        for (let x = sx; x <= sx + sw; x += 6 * u) {
          const y = y0 + wave(x, j);
          if (x === sx) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      for (let k = 0; k < (this.lite ? 10 : 18); k++) {
        const rise = ((t * (0.12 + 0.1 * hash(k, 2, 9)) + hash(k, 5, 1)) % 1);
        const x = sx + sw * ((hash(k, 7, 3) + Math.sin(t * 0.8 + k) * 0.01 + 1) % 1);
        const y = floorRef - rise * (floorRef - stageTop);
        if (y < surf + 4 * u) continue;
        const r = (1.2 + 2.4 * hash(k, 1, 4)) * u;
        ctx.globalAlpha = fade * 0.55 * Math.min(1, rise * 6, (1 - rise) * 4);
        ctx.strokeStyle = '#bff8ff'; ctx.lineWidth = 0.6 * u;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 3.4, 4.8); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    this.drawFish(ctx, { u, sx, sw, stageTop, stageBot, floorRef, toonH });
    if (move?.slices && this.punch) {
      const phase = (((beat - this.punch.grab) % this.punch.slice) + this.punch.slice) % this.punch.slice / this.punch.slice;
      ctx.globalAlpha = (beat >= this.punch.grab ? 0.12 : 0) * Math.exp(-phase * 9);
      ctx.fillStyle = '#ffe2d0';
      ctx.fillRect(sx, stageTop, sw, sh);
    }
    // Kiko's stops: the lights die with the tape, each one, and slam back on with the music
    for (const s of this.stops) {
      const len = (s.until - s.from) / (s.hits || 1), into = now - s.from;
      if (into >= 0 && now < s.until && len > 0) {
        ctx.globalAlpha = 0.82 * (into / len - Math.floor(into / len)) ** 1.3;
        ctx.fillStyle = '#05040c';
        ctx.fillRect(sx, stageTop, sw, sh);
      }
      if (now >= s.until && now - s.until < 0.22) {
        ctx.globalAlpha = 0.28 * (1 - (now - s.until) / 0.22);
        ctx.fillStyle = '#fff6e0';
        ctx.fillRect(sx, stageTop, sw, sh);
      }
    }
    if (this.lightsBack != null && now >= this.lightsBack && now - this.lightsBack < 0.22) {
      ctx.globalAlpha = 0.28 * (1 - (now - this.lightsBack) / 0.22);
      ctx.fillStyle = '#fff6e0';
      ctx.fillRect(sx, stageTop, sw, sh);
    }
    if (move?.holes) {
      // as dark as the hole is deep: the drag's bottom (the kick alone) darkest
      const depth = 1 - (this.holding?.i === a.i ? (this.holding.held?.hole ?? move.holeStart) : move.holeStart) / (move.holes.length - 1);
      const fade = Math.min(1, (now - a.when) * 8, (a.when + a.dur - now) * 8) * (0.55 + 0.6 * depth);
      const kick = this.kickThump() ?? pulse;
      ctx.globalAlpha = 0.58 * Math.max(0, fade);
      ctx.fillStyle = '#05040c';
      ctx.fillRect(sx, stageTop, sw, floorRef - stageTop);
      ctx.globalAlpha = 0.58 * Math.max(0, fade) * (1 - 0.85 * kick);
      ctx.fillRect(sx, floorRef, sw, stageBot - floorRef);
    }
    {
      const speed = Audio.tempo || 1;
      if (speed > 1.01) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.7 * u;
        const k = Math.min(1, (speed - 1) / 0.15);
        for (let j = 0; j < (this.lite ? 8 : 14); j++) {
          const y = stageTop + sh * (0.12 + 0.8 * hash(j, 3, 7));
          const len = sw * (0.08 + 0.1 * hash(j, 9, 2));
          const x = sx + sw * 1.2 - ((t * sw * (1.4 + hash(j, 4, 4)) + hash(j, 6, 5) * sw * 1.4) % (sw * 1.4));
          ctx.globalAlpha = 0.16 * k;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
      } else if (speed < 0.99) {
        ctx.globalAlpha = 0.22 * Math.min(1, (1 - speed) / 0.5);
        ctx.fillStyle = '#1c3c78';
        ctx.fillRect(sx, stageTop, sw, sh);
      }
    }
    if (drawn > 0) {
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, stageBot, 0, stageTop);
      g.addColorStop(0, 'rgba(255,226,150,0.5)'); g.addColorStop(0.55, 'rgba(255,226,150,0.12)'); g.addColorStop(1, 'rgba(255,226,150,0)');
      ctx.globalAlpha = 0.45 * drawn * (0.8 + 0.2 * pulse);
      ctx.fillStyle = g;
      ctx.fillRect(sx, stageTop, sw, sh);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  /**
   * Lorenzo's fish (fishOn): swimming across the flooded room with a wag and a bob — or, the
   * water going, diving nose-first for the floor and through it, a ring spreading on the tiles.
   */
  drawFish(ctx, { u, sx, sw, stageTop, stageBot, floorRef, toonH }) {
    if (!this.fish.length) return;
    const now = this.heardNow(), beatS = this.barSeconds() / 4;
    const floorY = floorRef + (stageBot - floorRef) * 0.45;
    // They swim in the water ABOVE the heroes — clear of the highest head, bob and fins and all —
    // and only come down among them diving for the floor once the water goes (Peter, 5 Oct
    // 2026: "not ... so close to the heroes heads and definitely no overlap until the water is
    // released"). `h` is how far down that band a fish swims, 0 the top.
    // Below the club sign and the LED board, down to just over the heads (Peter: "below the
    // signs and then can get closer to the heros heads").
    const heads = Math.min(floorRef - toonH, ...this.boxes.heroes.filter(Boolean).map((b) => b.y));
    const signs = Math.max(stageTop, ...[this.boxes.sign, this.boxes.led].filter(Boolean).map((b) => b.y + b.h));
    const swimAt = (f, time, L) => {
      const p = (time - f.born) / (FISH_CROSS_BEATS * beatS);
      const bottom = heads - L * 0.68 - toonH * 0.02;
      const top = Math.min(bottom, signs + L * 0.5 + toonH * 0.04);
      return {
        x: f.dir > 0 ? sx - L + p * (sw + 2 * L) : sx + sw + L - p * (sw + 2 * L),
        y: top + (bottom - top) * f.h + Math.sin(time * 2.6 + f.born * 7) * L * 0.18,
      };
    };
    ctx.save();
    for (const f of this.fish) {
      const fish = FISHES[f.kind] || FISHES[0];
      const L = toonH * fish.size * (f.baby ? BABY_SHARK : 1);
      if (now < f.born) continue;
      let { x, y } = swimAt(f, now, L);
      let tip = 0, s = 1, alpha = 1;
      if (f.dive && now >= f.dive.at) {
        const from = swimAt(f, f.dive.at, L);
        const k = Math.min(1, (now - f.dive.at) / FISH_DIVE_S);
        x = from.x + f.dir * L * 1.2 * k;
        y = from.y + (floorY - from.y) * k * k;
        tip = Math.min(1.2, k * 2.4);
        // through the floor: smaller and gone as it goes in
        if (k > 0.75) { s = 1 - (k - 0.75) / 0.25 * 0.7; alpha = 1 - (k - 0.75) / 0.25; }
        if (f.splashed != null) {
          const age = (now - f.splashed) / FISH_SPLASH_S;
          ctx.strokeStyle = '#bff8ff';
          for (const lag of [0, 0.25]) {
            const q = age - lag;
            if (q <= 0 || q >= 1) continue;
            ctx.globalAlpha = 0.7 * (1 - q);
            ctx.lineWidth = Math.max(0.6 * u, L * 0.05);
            ctx.beginPath(); ctx.ellipse(x, floorY, L * (0.25 + q * 0.95), L * (0.08 + q * 0.3), 0, 0, Math.PI * 2); ctx.stroke();
          }
          // a few drops thrown up
          if (age < 0.5) {
            ctx.fillStyle = '#bff8ff';
            for (let d = 0; d < 5; d++) {
              const vx = (d - 2) * 0.35, q = age / 0.5;
              ctx.globalAlpha = 0.8 * (1 - q);
              ctx.beginPath(); ctx.arc(x + vx * L * q, floorY - L * (0.9 - 0.25 * Math.abs(d - 2)) * Math.sin(Math.PI * q), Math.max(u * 0.6, L * 0.035), 0, Math.PI * 2); ctx.fill();
            }
          }
          continue;
        }
      }
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.scale(f.dir * s, s);
      ctx.rotate(tip);
      drawPaperFish(ctx, fish, L, { t: now, beat: this.beat(), wag: Math.sin(now * (f.baby ? 26 : 13) + f.born * 5), dive: tip / 1.2, lite: this.lite });
      ctx.restore();
    }
    ctx.restore();
  }

  /** The floor pads' words, popping up from where the floor was tapped, as each is heard. */
  drawPadWords(ctx, { toonH, stageBot }) {
    const now = this.heardNow();
    ctx.save();
    for (const h of this.padHits) {
      const k = (now - h.when) / PAD_WORD_S;
      if (k < 0 || k >= 1) continue;
      const size = Math.max(9, toonH * 0.2);
      ctx.globalAlpha = Math.min(1, (1 - k) * 2.5);
      ctx.font = `${size * (1 + 0.25 * Math.exp(-k * 10))}px ${TITLE_FONT}`;
      ctx.textAlign = 'center';
      const y = Math.min(h.y, stageBot - size) - size * 0.6 - k * toonH * 0.5;
      ctx.lineWidth = size * 0.16; ctx.strokeStyle = '#0b0b14';
      ctx.strokeText(h.label, h.x, y);
      ctx.fillStyle = h.col;
      ctx.fillText(h.label, h.x, y);
    }
    ctx.restore();
  }

  /**
   * How hard the kick is hitting, as heard: 1 on a kick, falling away over a couple of
   * sixteenths. Read off the song's own kick lane (bank.sections[order[...]].kick, a step
   * each). Null for a song with no kick lane to read.
   */
  kickThump() {
    const b = this.song.bank;
    const per = b?.sections?.[0]?.kick?.length;
    if (!per || !Array.isArray(b.order) || !b.order.length) return null;
    const step = this.beat() * 4;
    for (let back = 0; back < 16; back++) {
      const s0 = Math.floor(step) - back;
      if (s0 < 0) break;
      const sec = b.sections[b.order[Math.floor(s0 / per) % b.order.length]];
      if (sec?.kick?.[s0 % per]) return Math.exp(-(step - s0) * 0.9);
    }
    return 0;
  }

  /** The giant speaker stacks, cones pumping on the kick. */
  drawSpeakers(ctx, rig, u, pulse) {
    // In time with the song's own KICK, not a smoothed level: punched out on every kick it
    // plays (two-step, four on the floor, whatever the style has) and falling back between.
    // Still with the drums pulled out on the mixer.
    const kick = this.kickThump();
    let thump = (kick == null ? pulse : kick) * (this.levels.drums > 0 ? 1 : 0);
    // held for the bass the cones pump harder, and wobble with it; a BOOM punches them right out
    const now = this.heardNow();
    if (this.boost) {
      thump = Math.min(1.5, thump * 1.5);
      if (this.boost.amount > 0.04) {
        const ph = (((this.beat() * 2) % 1) + 1) % 1;
        thump = Math.max(thump, this.boost.amount * (0.5 + 0.5 * Math.cos(ph * Math.PI * 2)) * 1.2);
      }
    }
    thump = Math.max(thump, (now >= this.boomAt ? Math.exp(-(now - this.boomAt) * 4) : 0) * 1.6);
    this.boxes.speakers = rig.xs.map((x) => ({ x, y: rig.top, w: rig.w, h: rig.floor - rig.top }));
    // a strong kick jolts the cabinets
    const jolt = thump > 0.6 ? (thump - 0.6) * 2.5 * u : 0;
    rig.xs.forEach((x0) => drawSpeakerStack(ctx, x0 + (Math.random() - 0.5) * jolt, rig, u, thump, { boost: !!this.boost }));
  }

  /**
   * THE FLOOR SHAKES (Peter, 5 Oct 2026: "when we tap the speakers or are in bass boost or
   * wobble, the confettie should bounce if thers any on the floor"): how high each scrap on the
   * floor is bouncing now — thrown up by a BOOM (a speaker's, or the vacuum's) and bouncing a few
   * times as it settles; hopping on every kick while the bass is boosted; on the wobble's eighths
   * as deep as it is dragged. Each scrap has its own spring. Null while nothing shakes the floor;
   * else (sc) => [lift (px), turn (radians)] for drawScraps.
   */
  scrapHop(u) {
    const now = this.heardNow(), since = now - this.boomAt;
    const boom = since >= 0 && since < 1.4 ? since : null;
    const kick = this.boost && this.levels.drums > 0 ? this.kickThump() ?? Math.exp(-((this.beat() % 1 + 1) % 1) * 6) : 0;
    const wob = this.boost?.amount > 0.04 ? this.boost.amount : 0;
    if (boom == null && !kick && !wob) return null;
    const eighth = (((this.beat() * 2) % 1) + 1) % 1;
    const frac = (v) => v - Math.floor(v);
    return (sc) => {
      const r = frac(sc.x * 0.137 + sc.dy * 3.1), r2 = frac(sc.x * 0.071 + sc.dy * 5.3);
      let lift = 0;
      if (boom != null) {
        const t = boom - r2 * 0.04;
        if (t > 0) lift += (7 + 7 * r) * Math.exp(-t * 3.2) * Math.abs(Math.sin(Math.PI * t / (0.26 + 0.08 * r)));
      }
      if (kick) lift += (2.5 + 3 * r) * 4 * kick * (1 - kick);
      if (wob) lift += wob * (2.5 + 3 * r2) * Math.sin(Math.PI * eighth);
      return [lift * u, lift * (r2 - 0.5) * 0.12];
    };
  }

  /** The crowd moments, over the heroes — and the smoke, round them (`back` and `front`). */
  drawMoments(ctx, layer, { u, floorRef, toonH, stageTop, stageBot = H, beat = 0 }) {
    if (layer === 'front') this.ballSpots = [];
    // the last drop's confetti on the floor — Dolores's broom draws what is left while she sweeps
    const landed = (this.floorConfetti || []).filter((sc) => this.t >= sc.at);
    const glint = Math.exp(-(((beat % 1) + 1) % 1) * 6);   // the foil scraps wink on the beat
    const hop = landed.length ? this.scrapHop(u) : null;    // ...and bounce when the floor shakes
    if (layer === 'back' && !this.moments.some((m) => CLEANERS.includes(m.kind))) {
      drawScraps(ctx, landed.map((sc) => ({ sc, x: sc.x, y: scrapY(floorRef, toonH, stageBot, u, sc.dy), alpha: Math.min(1, (this.t - sc.at) * 4) })),
        u, { glint, lite: this.lite, hop });
    }
    if (layer === 'front') { this.doloresSpot = null; this.vacuumSpot = null; }
    for (const m of this.moments) {
      const k = this.t - m.t0;
      if (PARTY_BEATS[m.kind]) {
        if (layer === 'front') {
          const spot = drawPartyFront(ctx, m, beat, { width: W, u, floorRef, toonH, stageTop, stageBot, scraps: landed, glint, lite: this.lite, hop });
          if (m.kind === 'cleaner' && spot) this.doloresSpot = { ...spot, m };
          if (m.kind === 'vacuum' && spot) this.vacuumSpot = { ...spot, m };
        }
        continue;
      }
      if (m.kind === 'smoke') {
        // the machine's blast: puffs out of a nozzle on the floor, billowing across and
        // rising a little as they slow, thinning into the haze
        const nx = m.dir > 0 ? -6 * u : W + 6 * u;
        for (const p of m.puffs) {
          if (p.front !== (layer === 'front')) continue;
          const age = k - p.born;
          if (age <= 0) continue;
          const go = 1 - Math.exp(-age * 0.9);
          const x = nx + m.dir * W * p.speed * go;
          const y = floorRef - 4 * u - toonH * p.lift * go * 0.6;
          const r = toonH * (0.15 + 0.75 * go) * p.size;
          const a = Math.max(0, Math.min(1, age * 4) * (1 - age / (m.life - p.born))) * (p.front ? 0.26 : 0.46);
          if (a <= 0) continue;
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, `rgba(220,215,240,${a})`); g.addColorStop(1, 'rgba(220,215,240,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }
        continue;
      }
      if (layer !== 'front') continue;
      if (m.kind === 'ball') {
        // A beach ball crosses the room — now and then a second follows it a bar behind.
        const beatS = this.barSeconds() / 4;
        const age = k / beatS;
        for (let n = 0; n < (m.balls || 1); n++) {
          if (m.popped?.[n]) continue;
          const r = toonH * BALL_R;
          const path = this.ballPath(m, n, r);
          const ballBeat = age - n * BALL_SPAWN_BEATS;
          const hop = path.findIndex((p) => p.at > ballBeat);   // the landing it is flying to
          if (ballBeat < 0 || hop < 1) continue;
          const from = path[hop - 1], to = path[hop], hopBeats = to.at - from.at;
          const bf = (ballBeat - from.at) / hopBeats;   // through this hop, 0 to 1
          let x = from.x + (to.x - from.x) * bf;
          const headY = floorRef - toonH * 1.05 - r;
          // over the heads by an arc — and, for a ball knocked from the air or into the mirror
          // ball, from the height it was at to the height it is going to (`lift`)
          let y = headY - ((1 - bf) * (from.lift || 0) + bf * (to.lift || 0)) * toonH - Math.sin(Math.PI * bf) * toonH * to.h;
          // the turbo hoover has it: down and into the nozzle, shrinking, and gone
          let rr2 = r;
          if (m.sucked) {
            const v = this.vacuumSpot;
            const q = Math.min(1, (this.t - m.sucked.at) / 0.6);
            if (q >= 1 || !v) { (m.popped ||= [])[n] = true; continue; }
            x += (v.nozzle - x) * q * q; y += (v.floor - v.h * 0.35 - y) * q * q;
            rr2 = r * (1 - 0.85 * q);
          }
          if (!m.sucked) (this.ballSpots ||= []).push({ m, n, x, y, r, headY, toonH, lift: (headY - y) / toonH });
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.beginPath(); ctx.ellipse(x, floorRef + 2 * u, r * (0.7 + 0.3 * (1 - Math.sin(Math.PI * bf))), r * 0.18, 0, 0, Math.PI * 2); ctx.fill();
          // the VINYL ball from the bake-off (beachball.js), squashing on each head it lands on
          // (and on the hand that knocks it, and on the mirror ball)
          const fromHead = Math.min(from.head || from.hit ? bf * hopBeats : 9, to.head || to.clang ? (1 - bf) * hopBeats : 9);
          drawBeachBall(ctx, x, y, rr2, { spin: ballBeat * 0.9 + n * 2 + (m.sucked ? (this.t - m.sucked.at) * 20 : 0), dir: m.dir, squash: Math.max(0, 1 - fromHead / 0.3),
            colours: n ? BEACH_BALL_COLOURS_2 : BEACH_BALL_COLOURS });
        }
      }
      if (m.kind === 'fountain' && layer === 'front') {
        // from the far side, low on the floor, up and over, spinning, and down
        const ex = m.side > 0 ? W + 4 * u : -4 * u, ey = floorRef + toonH * 0.3;
        // the bang: a flash where it comes out
        if (k < 0.35) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const fl = ctx.createRadialGradient(ex, ey, 0, ex, ey, toonH * 2.4);
          fl.addColorStop(0, `rgba(255,250,235,${0.8 * (1 - k / 0.35)})`); fl.addColorStop(1, 'rgba(255,250,235,0)');
          ctx.fillStyle = fl;
          ctx.fillRect(ex - toonH * 2.4, ey - toonH * 2.4, toonH * 4.8, toonH * 4.8);
          ctx.restore();
        }
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, (m.life - k) / 0.6));
        for (const b of m.bits) {
          const q = k - b.delay;
          if (q <= 0) continue;
          const bx = ex + b.vx * W * 0.55 * q;
          const by = ey - b.vy * toonH * 2.6 * q + toonH * 2.4 * q * q;
          if (by > stageBot + 10 * u) continue;
          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(b.spin * q);
          ctx.fillStyle = b.colour;
          ctx.fillRect(-2.2 * u * b.w, -1.2 * u, 4.4 * u * b.w, 2.4 * u);
          ctx.restore();
        }
        ctx.restore();
      }
      if (m.kind === 'pop') {
        // a popped ball: a white crack of a ring, and its colours flung out and falling
        const ring = Math.min(1, k / 0.15);
        if (ring < 1) {
          ctx.save();
          ctx.globalAlpha = 1 - ring;
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2 * u;
          ctx.beginPath(); ctx.arc(m.x, m.y, m.r * (1 + ring * 1.4), 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        }
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, (m.life - k) / 0.5));
        for (const b of m.bits) {
          const go = 1 - Math.exp(-k * 5);
          const bx = m.x + Math.cos(b.a) * b.v * toonH * 0.9 * go;
          const by = m.y + Math.sin(b.a) * b.v * toonH * 0.9 * go + k * k * toonH * 1.6;
          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(b.spin * k);
          ctx.fillStyle = b.colour;
          ctx.fillRect(-2.2 * u * b.w, -1.2 * u, 4.4 * u * b.w, 2.4 * u);
          ctx.restore();
        }
        ctx.restore();
      }
      if (m.ribbons) {
        // The streamers do not fade: they fall until they are out of the bottom of the picture,
        // and the moment lasts until the last of them is (Peter, 5 Oct 2026: they faded out
        // before they got to the bottom).
        ctx.save();
        ctx.lineCap = 'round';
        let out = k > 0.5;
        for (const ribbon of m.ribbons) {
          const age = k - ribbon.delay;
          if (age <= 0) { out = false; continue; }
          const x = (ribbon.side < 0 ? 0 : W) - ribbon.side * W * ribbon.reach * (1 - Math.exp(-age * 1.2))
            + Math.sin(age * 1.6 + ribbon.phase) * 9 * u;
          const y = stageTop + 6 * u + (floorRef - stageTop) * (0.035 * age + 0.045 * age * age) * ribbon.drift;
          const length = ribbon.length * u * Math.min(1, age * 3);
          if (y - length > stageBot) continue;   // fallen out of the picture
          out = false;
          // A twisting paper strip: the curl alternates broad colour and a thin lit edge.
          // Short connected segments keep this cheap even when confetti is also flying.
          let px = x, py = y;
          for (let j = 1; j <= 12; j++) {
            const f = j / 12, twist = ribbon.phase + f * Math.PI * 4 + age * 3;
            const nx = x + Math.sin(twist) * ribbon.curl * u * f + ribbon.side * length * f * 0.28;
            const ny = y - length * f;
            ctx.strokeStyle = ribbon.colour;
            ctx.lineWidth = u * (0.6 + 2 * Math.abs(Math.cos(twist)));
            ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 0.45 * u;
            ctx.stroke();
            px = nx; py = ny;
          }
        }
        ctx.restore();
        m.ribbonsOut = out;
      }
      if (m.kind === 'confetti') {
        // from the two top corners, fluttering down over the floor
        const fade = Math.min(1, (m.life - k) / 0.8);
        ctx.globalAlpha = Math.max(0, fade);
        for (const b of m.bits) {
          const q = k - b.delay;
          if (q <= 0) continue;
          const x = (b.side < 0 ? 0 : W) + b.vx * W * (1 - Math.exp(-q * 1.6)) + Math.sin(q * 3 + b.phase) * 8 * u;
          const y = stageTop + 10 * u + b.vy * H * 0.25 * (1 - Math.exp(-q * 3)) + q * q * 0.06 * H + q * 0.12 * H;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(b.spin * q);
          ctx.scale(1, Math.cos(q * 7 + b.phase));
          ctx.fillStyle = b.colour;
          ctx.fillRect(-2 * u * b.w, -1.2 * u, 4 * u * b.w, 2.4 * u);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }
      if (m.kind === 'sticks') {
        // thrown up from the crowd, spinning, and back down
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const st of m.sticks) {
          const q = k - st.delay;
          if (q <= 0) continue;
          const x = st.x * W + st.vx * W * q;
          const y = stageBot + 6 * u - (st.vy * H * 0.55 * q - 0.5 * H * 0.95 * q * q);
          if (y > stageBot + 20 * u) continue;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(st.spin * q);
          ctx.strokeStyle = st.colour; ctx.lineCap = 'round';
          ctx.globalAlpha = 0.35; ctx.lineWidth = 5 * u;
          ctx.beginPath(); ctx.moveTo(-7 * u, 0); ctx.lineTo(7 * u, 0); ctx.stroke();
          ctx.globalAlpha = 1; ctx.lineWidth = 2 * u;
          ctx.beginPath(); ctx.moveTo(-7 * u, 0); ctx.lineTo(7 * u, 0); ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
      }
    }
  }

  drawBall(ctx, { portrait, P, u, t, sx, sw, sh, stageTop, pulse, accent, beat, show = null }) {
    const bar = 4 * 60 / (this.song.bpm || 120);
    const since = t - this.ballAt;
    const dropT = bar * 0.8;
    const p = Math.max(0, Math.min(1, since / dropT));
    const ease = 1 - Math.pow(1 - p, 3);
    const settle = since > dropT ? Math.exp(-(since - dropT) * 5) * Math.sin((since - dropT) * 18) : 0;
    const br = (portrait ? 40 * P : 20) * (this.ballScale || 1);
    const hang = portrait ? 192 * P : 46;   // lower (Peter, 3 Oct 2026; portrait lower again, 5 Oct)
    // in portrait, under the middle of the club sign, clear of the LED board (Peter, 5 Oct 2026)
    const sign = this.boxes.sign;
    const bx0 = portrait && sign ? sign.x + sign.w / 2 : sx + sw / 2;
    // The whole rig — drop bar, clamp, motor, wire and ball — comes down together from above
    // the screen and lands on the truss, rather than the ball dropping from a mount already
    // there (Peter, 5 Oct 2026: "perhaps the entire set up can descend into place")
    const lift = (1 - ease) * (stageTop + 9 * u + hang + br + 2 * u);
    const mountY = stageTop + 9 * u - lift;
    // Dip down and spring back on the first beat of every even-numbered bar (2, 4, 6...).
    const barPulse = ((beat - 4) % 8 + 8) % 8;
    const bobBeats = 0.5;
    const bob = barPulse < bobBeats ? Math.sin(Math.PI * barPulse / bobBeats) * br * 0.12 : 0;
    const by0 = mountY + hang + settle * (portrait ? 8 * P : 4) + bob;
    // DRAGGED AND SPUN (grabBall, ballOn): swung on its wire from the mount, the wire a little
    // elastic; at rest, straight down
    const swing = this.ballSwing;
    const len0 = by0 - mountY;
    this.ballAnchor = { x: bx0, y: mountY, len: len0, r: br };
    const bx = bx0 + Math.sin(swing.a) * len0 * swing.stretch;
    const by = mountY + Math.cos(swing.a) * len0 * swing.stretch;
    this.boxes.ball = { x: bx, y: by, r: br };
    // a rally smashed into it spins it on, and it flares (club.js smashed)
    const tt = t + (this.spinPhase || 0);
    const flare = Math.max(0, 1 - (t - (this.mirrorFlashAt ?? -Infinity)) / 1.4);
    const rot = tt * 1.3;
    const shine = Math.max(0, Math.min(1, (since - dropT * 0.6) / (bar * 0.5)));
    if (shine > 0) {
      const N = portrait ? 44 : 38;
      for (let k = 0; k < N; k++) {
        const fa = hash(k, 12.9898, 0), fb = hash(k, 78.233, 1);
        const x = sx + (((fa + rot * 0.045) % 1 + 1) % 1) * sw;
        const y = stageTop + 12 * u + fb * (sh - 16 * u);
        const tw = 0.55 + 0.45 * Math.sin(t * 7 + k * 1.7);
        const size = (1 + (k % 3) * 0.6) * u;
        // in a light show on the rig (tapCan) the ball throws its colours round the room,
        // chasing as the lamps do (Peter, 5 Oct 2026: "those lights don't seem to reflect in the
        // disco ball")
        const lit = show && k % 4 !== 0 && hash(k, 5.17, 3) < show.k;
        const spot = lit ? show.colour(k) : k % 5 === 0 ? accent : '#ffffff';
        ctx.globalAlpha = Math.min(1, shine * tw * (0.55 + 0.45 * pulse) * (1 + flare) * (lit ? 1.5 : 1));
        ctx.fillStyle = spot;
        ctx.beginPath(); ctx.arc(x, y, size * (lit ? 1.25 : 1), 0, Math.PI * 2); ctx.fill();
        // more of the spots drawn back to the ball as faint beams (Peter, 3 Oct 2026)
        if (k % 3 === 0) {
          ctx.globalAlpha = shine * (lit ? 0.18 : 0.11) * tw;
          ctx.strokeStyle = spot; ctx.lineWidth = size * 0.8;
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(x, y); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }
    // THE RIGGING (Peter, 5 Oct 2026: "attach the discoball cable a bit better to the
    // scaffolding"): a drop bar from the truss's top chord to its bottom one (truss: chords at u
    // and 8u), a clamp round the bottom chord, the ball's motor hung under it on a short rod,
    // and the wire off the motor's shaft — no box floating under the truss
    // ...and all of it behind both signs: clipped out of their boards (Peter, 5 Oct 2026: "send
    // the mirror ball cable to the back of both")
    ctx.save();
    const boards = [this.boxes.sign, this.boxes.led].filter(Boolean);
    if (boards.length) {
      ctx.beginPath(); ctx.rect(sx - sw, stageTop - sh, sw * 3, sh * 3);
      for (const b of boards) ctx.rect(b.x, b.y, b.w, b.h);
      ctx.clip('evenodd');
    }
    const chordY = stageTop + 8 * u - lift;
    ctx.strokeStyle = '#4a4660'; ctx.lineWidth = 0.9 * u;
    ctx.beginPath(); ctx.moveTo(bx0, stageTop + u - lift); ctx.lineTo(bx0, chordY); ctx.stroke();
    ctx.fillStyle = '#3a364c';
    rr(ctx, bx0 - 2.6 * u, chordY - 1.8 * u, 5.2 * u, 3.6 * u, 1 * u); ctx.fill();
    ctx.fillStyle = '#5a5670'; ctx.fillRect(bx0 - 0.5 * u, chordY + 1.8 * u, u, 1.6 * u);
    const motorY = chordY + 3.4 * u, motorH = 3.6 * u;
    ctx.fillStyle = '#24202f';
    rr(ctx, bx0 - 3.2 * u, motorY, 6.4 * u, motorH, 1.2 * u); ctx.fill();
    ctx.strokeStyle = '#3a364c'; ctx.lineWidth = 0.6 * u; ctx.stroke();
    ctx.fillStyle = '#5a5670'; ctx.fillRect(bx0 - 0.6 * u, motorY + motorH, 1.2 * u, 1.2 * u);
    const shaftY = motorY + motorH + 1.2 * u;
    ctx.strokeStyle = 'rgba(200,200,216,0.55)'; ctx.lineWidth = 0.75 * u;
    // the wire runs straight into the cap, no eye (Peter, 5 Oct 2026: "just connect cleanly")
    const topX = bx - Math.sin(swing.a) * (br + 2 * u), topY = by - Math.cos(swing.a) * (br + 2 * u);
    ctx.beginPath(); ctx.moveTo(bx0, shaftY); ctx.lineTo(topX, topY); ctx.stroke();
    ctx.restore();
    const halo = ctx.createRadialGradient(bx, by, br * 0.8, bx, by, br * 2.2);
    halo.addColorStop(0, `rgba(255,255,255,${0.16 + 0.14 * pulse})`); halo.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(bx, by, br * 2.2, 0, Math.PI * 2); ctx.fill();
    // the ball itself: the DISCO look from the bake-off (mirrorball.js) — turned with its wire,
    // so its top stays on the cord however it is swung (Peter, 5 Oct 2026)
    ctx.save();
    ctx.translate(bx, by); ctx.rotate(-swing.a); ctx.translate(-bx, -by);
    drawDiscoBall(ctx, bx, by, br, { t: tt, pulse, accent, hits: this.ballHits, bands: this.lite ? 11 : 16,
      lights: show && { colour: show.colour, k: show.k, step: show.step } });
    ctx.fillStyle = '#5a5670';
    ctx.fillRect(bx - 1.5 * u, by - br - 2 * u, 3 * u, 2.5 * u);
    ctx.restore();
    if (flare > 0) {
      const fl = ctx.createRadialGradient(bx, by, br * 0.5, bx, by, br * 3);
      fl.addColorStop(0, `rgba(255,255,255,${0.55 * flare})`); fl.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = fl;
      ctx.beginPath(); ctx.arc(bx, by, br * 3, 0, Math.PI * 2); ctx.fill();
    }
    const glint = Math.pow(Math.max(0, Math.sin(t * 2.3)), 20);
    if (glint > 0.05) {
      const gx = bx - br * 0.4, gy = by - br * 0.45, gl = br * 0.9 * glint;
      ctx.strokeStyle = `rgba(255,255,255,${glint})`; ctx.lineWidth = u;
      ctx.beginPath(); ctx.moveTo(gx - gl, gy); ctx.lineTo(gx + gl, gy); ctx.moveTo(gx, gy - gl); ctx.lineTo(gx, gy + gl); ctx.stroke();
    }
  }

  drawControls(ctx, { portrait, P, u, stageTop, stageBot = H, safeL = 0, safeR = 0 }) {
    const t = this.t;
    const disc = (cx, cy, r, alpha) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(11,11,20,0.78)';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    };
    // THE MIXER: a small icon in the bottom-right corner — bright for a while after it is
    // used, then faint — that opens a panel of faders, one a part. A tap on the dance floor,
    // or a mouse over it, wakes it and its neighbours too (Peter, 5 Oct 2026).
    const awake = t - Math.max(this.iconsAt, this.buttonsAt ?? -Infinity);
    const iconAlpha = this.mixerOpen || awake < ICONS_AWAKE_S ? 1
      : Math.max(ICONS_ASLEEP, 1 - (awake - ICONS_AWAKE_S) / 0.8 * (1 - ICONS_ASLEEP));
    // Landscape's panel is drawn MIX_K times its old size (Peter, 3 Oct 2026: much bigger).
    const L = (v) => v * MIX_K;
    const r = portrait ? 20 * P : 11;
    // The bottom row's buttons are SILVER, the back button's family — the gold lost
    // (Peter, 5 Oct 2026). A rim, the rim lit (in use), and the icon.
    const RIM = 'rgba(206,208,222,0.7)', RIM_ON = '#f2f3fa', ICON_INK = '#dcdee8';
    const mx = portrait ? W - 32 * P : W - safeR - 16;
    const my = portrait ? portraitMenuSafeBottom() - 34 * P : stageBot - 16;
    {
      const focused = this.focus === HERO_MOVES.length && !Input.usingTouch;
      this.boxes.mixer = { x: mx - r * 1.4, y: my - r * 1.4, w: r * 2.8, h: r * 2.8 };
      disc(mx, my, r, focused ? 1 : iconAlpha);
      ctx.strokeStyle = focused ? '#c9a0ff' : this.mixerOpen ? RIM_ON : RIM;
      ctx.lineWidth = 0.8 * u;
      ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.stroke();
      // three faders, their caps at different heights
      ctx.strokeStyle = ICON_INK; ctx.fillStyle = ICON_INK; ctx.lineWidth = 0.9 * u;
      [[-0.38, 0.2], [0, -0.25], [0.38, 0.05]].forEach(([dx, cap]) => {
        const fx = mx + dx * r;
        ctx.beginPath(); ctx.moveTo(fx, my - r * 0.5); ctx.lineTo(fx, my + r * 0.5); ctx.stroke();
        ctx.fillRect(fx - r * 0.14, my + cap * r - r * 0.08, r * 0.28, r * 0.16);
      });
      ctx.globalAlpha = 1;
    }
    // THE TRANSPORT, in a row on the mixer's left: back a section, PLAY / PAUSE, on a section.
    // The same discs and the same idle fade as the mixer — except under a pause, when they
    // stay bright (Peter, 5 Oct 2026). A skip's button stays lit until its jump is heard, and
    // PLAY's rim while the song is held.
    this.boxes.transport = [];
    {
      const step = r * 2.8 + (portrait ? 10 * P : 8);
      const tBase = this.transportFocus();
      const lit = this.skipLit && this.heardNow() < this.skipLit.until ? this.skipLit.dir : 0;
      for (let k = 0; k < 3; k++) {
        const cx = mx - (3 - k) * step;
        const focused = this.focus === tBase + k && !Input.usingTouch;
        const on = k === 1 ? this.paused : lit === (k === 0 ? -1 : 1);
        this.boxes.transport.push({ x: cx - r * 1.4, y: my - r * 1.4, w: r * 2.8, h: r * 2.8 });
        disc(cx, my, r, focused || this.paused ? 1 : iconAlpha);
        ctx.strokeStyle = focused ? '#c9a0ff' : on ? RIM_ON : RIM;
        ctx.lineWidth = 0.8 * u;
        ctx.beginPath(); ctx.arc(cx, my, r, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = ICON_INK;
        const tri = (tip, base, h) => {
          ctx.beginPath(); ctx.moveTo(cx + tip, my); ctx.lineTo(cx + base, my - h); ctx.lineTo(cx + base, my + h); ctx.closePath(); ctx.fill();
        };
        if (k === 1 && this.paused) tri(r * 0.5, -r * 0.34, r * 0.46);   // PLAY, nudged right to sit centred
        else if (k === 1) {                                                 // PAUSE
          ctx.fillRect(cx - r * 0.32, my - r * 0.42, r * 0.22, r * 0.84);
          ctx.fillRect(cx + r * 0.1, my - r * 0.42, r * 0.22, r * 0.84);
        } else {
          // a bar and a triangle pointing at it: back to the bar on the left, on to the right
          const s = k === 0 ? -1 : 1;
          ctx.fillRect(cx + s * r * 0.3 - (s < 0 ? r * 0.14 : 0), my - r * 0.4, r * 0.14, r * 0.8);
          tri(s * r * 0.3, -s * r * 0.36, r * 0.4);
        }
      }
      ctx.globalAlpha = 1;
    }
    // THE PENCIL, bottom left, the mixer's twin: change this song's riff, style or mood and
    // remake it (Peter, 3 Oct 2026).
    this.boxes.edit = null;
    if (this.onEdit) {
      const ex = portrait ? 32 * P : safeL + 16;
      const focused = this.focus === HERO_MOVES.length + 2 && !Input.usingTouch;
      this.boxes.edit = { x: ex - r * 1.4, y: my - r * 1.4, w: r * 2.8, h: r * 2.8 };
      disc(ex, my, r, focused ? 1 : iconAlpha);
      ctx.strokeStyle = focused ? '#c9a0ff' : RIM;
      ctx.lineWidth = 0.8 * u;
      ctx.beginPath(); ctx.arc(ex, my, r, 0, Math.PI * 2); ctx.stroke();
      // the pencil, in silver, on a slant from its eraser (top right) to its point (bottom
      // left): a rounded eraser, a ribbed ferrule, a hexagonal barrel read as three faces
      // (lit, mid, shade), the sharpened wood with its scalloped collar, and the lead
      ctx.save();
      ctx.translate(ex, my);
      ctx.rotate(Math.PI / 4);
      const len = r * 1.42, w = r * 0.4, top = -len / 2, tip = len / 2;
      const ferT = top + len * 0.14, ferB = ferT + len * 0.12, woodT = tip - len * 0.3;
      ctx.fillStyle = '#c4c6d4';                                   // eraser, rounded
      ctx.beginPath();
      ctx.moveTo(-w / 2, ferT); ctx.lineTo(-w / 2, top + w * 0.3);
      ctx.quadraticCurveTo(-w / 2, top, 0, top); ctx.quadraticCurveTo(w / 2, top, w / 2, top + w * 0.3);
      ctx.lineTo(w / 2, ferT); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8e91a6';                                   // ferrule
      ctx.fillRect(-w / 2, ferT, w, ferB - ferT);
      ctx.fillStyle = '#e8e9f1';
      ctx.fillRect(-w / 2, ferT + (ferB - ferT) * 0.4, w, (ferB - ferT) * 0.2);
      const face = w / 3;                                          // the barrel's three faces
      [['#f4f5fa', -w / 2], ['#d2d4e0', -w / 2 + face], ['#a3a6ba', -w / 2 + face * 2]].forEach(([c, fx]) => {
        ctx.fillStyle = c; ctx.fillRect(fx, ferB, face + 0.2, woodT - ferB);
      });
      ctx.fillStyle = '#ece8e0';                                   // the sharpened wood, scalloped where it meets the paint
      ctx.beginPath();
      ctx.moveTo(-w / 2, woodT);
      ctx.quadraticCurveTo(-w / 3, woodT + w * 0.22, -w / 6, woodT);
      ctx.quadraticCurveTo(0, woodT + w * 0.22, w / 6, woodT);
      ctx.quadraticCurveTo(w / 3, woodT + w * 0.22, w / 2, woodT);
      ctx.lineTo(0, tip); ctx.closePath(); ctx.fill();
      const leadT = tip - len * 0.11;                              // the lead
      ctx.fillStyle = '#4a4c60';
      ctx.beginPath(); ctx.moveTo(-w * 0.5 * (tip - leadT) / (tip - woodT), leadT);
      ctx.lineTo(w * 0.5 * (tip - leadT) / (tip - woodT), leadT); ctx.lineTo(0, tip); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    // SAVE, the pencil's twin on its right while the song is not kept yet: the same disc
    // and the same idle fade as the mixer and the pencil (Peter, 4 Oct 2026), and since
    // 5 Oct their silver ("can our floppy disk icon be monochrome to match the other buttons").
    this.boxes.save = null;
    if (this.pending) {
      const ex = portrait ? 32 * P : safeL + 16;
      const sx = ex + r * 2.8 + (portrait ? 10 * P : 8);
      const focused = this.focus === HERO_MOVES.length + 3 && !Input.usingTouch;
      this.boxes.save = { x: sx - r * 1.4, y: my - r * 1.4, w: r * 2.8, h: r * 2.8 };
      disc(sx, my, r, focused ? 1 : iconAlpha);
      ctx.strokeStyle = focused ? '#c9a0ff' : RIM;
      ctx.lineWidth = 0.8 * u;
      ctx.beginPath(); ctx.arc(sx, my, r, 0, Math.PI * 2); ctx.stroke();
      // the floppy save icon, the way everyone draws it, in the pencil's greys (Peter: "gray
      // scale - black and white is a bit too stark"): a mid-grey body with the 3.5" corner cut
      // well in, a silver shutter hung from the top edge with its read slot, and a pale label
      // on the lower half.
      ctx.save();
      ctx.translate(sx, my);
      const f = r * 0.64, cut = f * 0.5, rad = f * 0.14;
      ctx.beginPath();
      ctx.moveTo(-f + rad, -f);
      ctx.lineTo(f - cut, -f);
      ctx.lineTo(f, -f + cut);
      ctx.lineTo(f, f - rad);
      ctx.arcTo(f, f, f - rad, f, rad);
      ctx.lineTo(-f + rad, f);
      ctx.arcTo(-f, f, -f, f - rad, rad);
      ctx.lineTo(-f, -f + rad);
      ctx.arcTo(-f, -f, -f + rad, -f, rad);
      ctx.closePath();
      ctx.fillStyle = '#8e91a6';
      ctx.fill();
      ctx.strokeStyle = 'rgba(11,11,20,0.5)';
      ctx.lineWidth = Math.max(0.5, r * 0.06);
      ctx.stroke();
      const shL = -f * 0.52, shR = f * 0.38, shT = -f, shB = -f * 0.22;
      ctx.fillStyle = '#d2d4e0';
      ctx.fillRect(shL, shT, shR - shL, shB - shT);
      const slotW = (shR - shL) * 0.24;
      ctx.fillStyle = '#4a4c60';
      ctx.fillRect(shR - slotW * 1.55, shT + f * 0.16, slotW, shB - shT - f * 0.28);
      const lbL = -f * 0.74, lbR = f * 0.74, lbT = f * 0.06, lbB = f * 0.92;
      ctx.fillStyle = '#eceef4';
      ctx.fillRect(lbL, lbT, lbR - lbL, lbB - lbT);
      ctx.strokeStyle = '#a3a6ba';
      ctx.lineWidth = Math.max(0.4, r * 0.05);
      ctx.beginPath();
      const ly1 = lbT + (lbB - lbT) * 0.36, ly2 = lbT + (lbB - lbT) * 0.68;
      ctx.moveTo(lbL + f * 0.16, ly1); ctx.lineTo(lbR - f * 0.16, ly1);
      ctx.moveTo(lbL + f * 0.16, ly2); ctx.lineTo(lbR - f * 0.16, ly2);
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    this.boxes.faders = [];
    this.boxes.sounds = [];
    this.boxes.panel = null;
    this.boxes.reset = null;
    if (this.mixerOpen) {
      // under each fader its SOUND button: the part's instrument, a tap for the next one
      // (club-voices.js) — the panel grew a row for them (Peter, 5 Oct 2026)
      const pw = portrait ? W * 0.84 : L(156), ph = portrait ? 232 * P : Math.min(L(112), my - r - 6 - stageTop - 8);
      const px = portrait ? (W - pw) / 2 : W - safeR - 10 - pw;
      const py = (portrait ? my - r - 16 * P : my - r - 6) - ph;
      this.boxes.panel = { x: px, y: py, w: pw, h: ph };
      ctx.fillStyle = 'rgba(11,11,20,0.9)';
      rr(ctx, px, py, pw, ph, portrait ? 16 * P : L(7)); ctx.fill();
      ctx.strokeStyle = 'rgba(240,192,64,0.45)'; ctx.lineWidth = 0.8 * u; ctx.stroke();
      // RESET: a tab on the panel's top edge — every fader up, every sound the song's own.
      // Dim while there is nothing to reset.
      {
        const plain = this.mixerPlain;
        const fs = portrait ? 11 * P : L(4.4);
        ctx.font = `700 ${fs}px ${BODY_FONT}`;
        const tw = ctx.measureText('RESET').width + fs * 1.8, th = fs * 2;
        // at the LEFT end: the right end sits under the LED board in landscape
        const tx = px + (portrait ? 14 * P : L(6)), ty = py - th * 0.82;
        this.boxes.reset = { x: tx, y: ty - th * 0.3, w: tw, h: th * 1.3 };
        ctx.fillStyle = 'rgba(11,11,20,0.9)';
        rr(ctx, tx, ty, tw, th, th / 2); ctx.fill();
        ctx.strokeStyle = plain ? 'rgba(240,192,64,0.25)' : 'rgba(240,192,64,0.7)'; ctx.lineWidth = 0.8 * u; ctx.stroke();
        ctx.fillStyle = plain ? '#6a6a7c' : '#ffe08a';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('RESET', tx + tw / 2, ty + th / 2);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      }
      const pad = portrait ? 12 * P : L(6);
      const cw = (pw - pad * 2) / PARTS.length;
      const iconY = py + (portrait ? 26 * P : L(11));
      const chipH = portrait ? 24 * P : L(9), chipY = py + ph - (portrait ? 10 * P : L(4)) - chipH;
      const labelY = chipY - (portrait ? 9 * P : L(3.5));
      const top = py + (portrait ? 52 * P : L(22)), bot = labelY - (portrait ? 22 * P : L(9.5));
      PARTS.forEach((p, k) => {
        const cx = px + pad + cw * (k + 0.5);
        const level = this.levels[p.id];
        const sel = this.mixSel === k && !Input.usingTouch;
        this.boxes.faders.push({ x: cx - cw / 2, y: top - 8 * u, w: cw, h: bot - top + 16 * u, top, bot });
        // the part's icon over its fader
        ctx.strokeStyle = level > 0 ? '#ffe08a' : '#5a5a68'; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 0.9 * u;
        ICON[p.id](ctx, cx, iconY, (portrait ? 13 * P : L(6.5)));
        // the track, lit up to the cap
        const tw = portrait ? 6 * P : L(3);
        const capY = bot - (bot - top) * level;
        ctx.fillStyle = '#1d1a2c';
        rr(ctx, cx - tw / 2, top, tw, bot - top, tw / 2); ctx.fill();
        if (level > 0) {
          ctx.fillStyle = 'rgba(240,192,64,0.75)';
          rr(ctx, cx - tw / 2, capY, tw, bot - capY, tw / 2); ctx.fill();
        }
        // the cap
        const capW = portrait ? 34 * P : L(16), capH = portrait ? 14 * P : L(6);
        ctx.fillStyle = level > 0 ? '#f0c040' : '#3a3a52';
        rr(ctx, cx - capW / 2, capY - capH / 2, capW, capH, capH * 0.35); ctx.fill();
        if (sel) { ctx.strokeStyle = '#c9a0ff'; ctx.lineWidth = u; ctx.stroke(); }
        ctx.fillStyle = level > 0 ? '#c8c8d8' : '#e04848';
        ctx.font = `600 ${portrait ? 11 * P : L(5.5)}px ${BODY_FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(p.label, cx, labelY);
        // the sound button: its name shrunk to fit, pulsing while it waits for the bar line
        const chipW = cw - (portrait ? 8 * P : L(3));
        const box = { x: cx - chipW / 2, y: chipY, w: chipW, h: chipH };
        this.boxes.sounds.push(box);
        const waiting = this.voices?.waiting(p.id);
        ctx.fillStyle = '#1d1a2c';
        rr(ctx, box.x, box.y, box.w, box.h, chipH / 2); ctx.fill();
        ctx.strokeStyle = waiting ? `rgba(240,192,64,${0.5 + 0.5 * Math.sin(t * 10)})` : 'rgba(240,192,64,0.45)';
        ctx.lineWidth = (waiting ? 1.2 : 0.8) * u;
        if (sel) ctx.strokeStyle = '#c9a0ff';
        ctx.stroke();
        const name = this.voices?.label(p.id) || '';
        let fs = portrait ? 10 * P : L(3.8);
        ctx.font = `600 ${fs}px ${BODY_FONT}`;
        const room = chipW - chipH * 0.6;
        const wide = ctx.measureText(name).width;
        if (wide > room) { fs = Math.max(fs * 0.6, fs * room / wide); ctx.font = `600 ${fs}px ${BODY_FONT}`; }
        ctx.fillStyle = waiting ? '#f0c040' : '#ffe08a';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, cx, chipY + chipH / 2, room);
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
      });
    }
    // NO DRUMS / YES DRUMS: a popup over the icons when a part is switched
    if (this.popup && t - this.popup.t < 1.4) {
      const k = t - this.popup.t;
      const a = Math.min(1, 1.4 - k) * Math.min(1, k * 8);
      const size = portrait ? 26 * P : 14;
      // over the room, above the front row's heads — or above the mixer panel while it is
      // open — drifting up as it goes
      const panel = this.boxes.panel;
      const px = panel && !portrait ? panel.x + panel.w / 2 : W / 2;
      const py = (panel ? Math.min(this.popupY, panel.y - size * 0.6) : this.popupY) - size * 0.3 * k;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      ctx.font = `${size}px ${TITLE_FONT}`;
      ctx.lineWidth = size * 0.18; ctx.strokeStyle = '#0b0b14';
      ctx.strokeText(this.popup.text, px, py);
      ctx.fillStyle = this.popup.text.startsWith('NO') ? '#e04848' : '#f0c040';
      ctx.fillText(this.popup.text, px, py);
      ctx.restore();
    }
    // back: a round button in the top-left corner
    {
      const rb = portrait ? 20 * P : 10;
      // level with the middle of THE BANGER LAB sign (drawn at stageTop + 34 in landscape)
      const bx = portrait ? 30 * P : safeL + 15, by = portrait ? stageTop + 44 * P : stageTop + 34;
      const focused = this.focus === HERO_MOVES.length + 1 && !Input.usingTouch;
      this.boxes.back = { x: bx - rb * 1.4, y: by - rb * 1.4, w: rb * 2.8, h: rb * 2.8 };
      disc(bx, by, rb, 1);
      ctx.strokeStyle = focused ? '#c9a0ff' : 'rgba(200,200,216,0.45)'; ctx.lineWidth = 0.8 * u;
      ctx.beginPath(); ctx.arc(bx, by, rb, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#c8c8d8'; ctx.lineWidth = 1.6 * u; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(bx + rb * 0.15, by - rb * 0.42); ctx.lineTo(bx - rb * 0.3, by); ctx.lineTo(bx + rb * 0.15, by + rb * 0.42); ctx.stroke();
      ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
      ctx.globalAlpha = 1;
    }
  }

  /**
   * One hero, drawn through a sprite of their own (Peter, 3 Oct 2026: slowdown in the lab).
   * The sprite — the hero standing on a point near the bottom of a small canvas, at the
   * screen's own density — is redrawn every second frame (every third on a slow device) and
   * laid down every frame at whole device pixels, so a dance moves at 30 frames a second for
   * half the drawing, with the position still every frame. `paint(c, x, feetY)` draws the hero
   * on `c` standing at that point; `direct` is the plain way, when there is no transform to
   * work from.
   */
  heroSprite(ctx, i, hx, feetY, toonH, dir, paint, direct) {
    if (typeof ctx.getTransform !== 'function' || typeof document === 'undefined') { direct(); return; }
    let m;
    try { m = ctx.getTransform(); } catch { direct(); return; }
    if (!m || !Number.isFinite(m.a) || m.b !== 0 || m.c !== 0 || !(m.a > 0) || !(m.d > 0)) { direct(); return; }
    const SW = toonH * 2.4, SH = toonH * 1.9, AY = toonH * 1.6;       // size; where the feet are from the top
    const pw = Math.ceil(SW * m.a), ph = Math.ceil(SH * m.d);
    this.heroSprites = this.heroSprites || [];
    let hs = this.heroSprites[i];
    if (!hs) hs = this.heroSprites[i] = { canvas: document.createElement('canvas'), key: '', n: i };
    const key = `${pw}|${ph}|${dir}`;
    const every = this.lite ? 3 : 2;
    if (hs.key !== key || (hs.n++ % every) === 0) {
      if (hs.canvas.width !== pw || hs.canvas.height !== ph) { hs.canvas.width = pw; hs.canvas.height = ph; }
      hs.key = key;
      const o = hs.canvas.getContext('2d');
      o.setTransform(1, 0, 0, 1, 0, 0);
      o.clearRect(0, 0, pw, ph);
      o.setTransform(m.a, 0, 0, m.d, (SW / 2) * m.a, AY * m.d);
      paint(o, 0, 0);
      o.setTransform(1, 0, 0, 1, 0, 0);
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // where it went, for Grumpos's echo ghosts (drawEchoGhosts)
    hs.last = { x: Math.round(m.a * hx + m.e - (SW / 2) * m.a), y: Math.round(m.d * feetY + m.f - AY * m.d), w: pw, h: ph };
    ctx.drawImage(hs.canvas, hs.last.x, hs.last.y);
    ctx.restore();
  }

  /**
   * The front row's mirror image in the gloss: the food court's recipe (mirrored round the
   * soles, squashed, faded out down the floor) rendered into a half-resolution cache that is
   * refreshed every REFLECT_EVERY frames, then laid down with one drawImage.
   */
  drawReflections(ctx, mirrors, floorY, height) {
    if (!mirrors.length || typeof ctx.getTransform !== 'function') return;
    let m;
    try { m = ctx.getTransform(); } catch { return; }
    if (!m || !Number.isFinite(m.a) || m.b !== 0 || m.c !== 0 || typeof document === 'undefined') return;
    const span = Math.abs(height * REFLECT_SQUASH * m.d);
    const y0 = Math.max(0, Math.floor(m.d * floorY + m.f));
    const cw = ctx.canvas.width;
    const half = REFLECT_SCALE;
    const w = Math.max(1, Math.ceil(cw * half)), h = Math.max(1, Math.ceil(span * half) + 1);
    let rc = this.reflectCache;
    if (!rc) rc = this.reflectCache = { canvas: document.createElement('canvas'), tick: 0, key: '' };
    const key = `${w}|${h}|${y0}|${m.a}|${m.d}`;
    const fresh = rc.key !== key || rc.tick++ % (this.lite ? REFLECT_EVERY * 2 : REFLECT_EVERY) === 0;
    if (fresh) {
      if (rc.canvas.width !== w || rc.canvas.height !== h) { rc.canvas.width = w; rc.canvas.height = h; }
      rc.key = key;
      const o = rc.canvas.getContext('2d');
      o.setTransform(1, 0, 0, 1, 0, 0);
      o.clearRect(0, 0, w, h);
      for (const sub of mirrors) {
        o.setTransform(m.a * half, 0, 0, m.d * half, m.e * half, (m.f - y0) * half);
        o.translate(0, floorY); o.scale(1, -REFLECT_SQUASH); o.translate(0, -floorY);
        sub.draw(o);
      }
      o.setTransform(1, 0, 0, 1, 0, 0);
      o.globalCompositeOperation = 'destination-out';
      const g = o.createLinearGradient(0, 0, 0, span * half);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.3, 'rgba(0,0,0,0.62)');
      g.addColorStop(0.6, 'rgba(0,0,0,0.94)'); g.addColorStop(1, 'rgba(0,0,0,1)');
      o.fillStyle = g; o.fillRect(0, 0, w, h);
      o.globalCompositeOperation = 'source-over';
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = REFLECT_CLUB_ALPHA;
    ctx.drawImage(rc.canvas, 0, 0, w, h, 0, y0, cw, h / half);
    ctx.restore();
  }

  /** Where the save prompt's buttons sit: two or three, centred, stacked on a phone. */
  savePromptLayout() {
    const portrait = portraitMenuActive();
    const n = this.savePrompt.options.length;
    const pad = portrait ? 22 : 20, gap = portrait ? 14 : 14;
    if (!portrait) {
      const bw = n === 3 ? 104 : 110, bh = 32;
      const total = n * bw + (n - 1) * gap;
      const w = Math.max(280, total + pad * 2);
      const h = 116;
      const x = Math.round((W - w) / 2), y = Math.round((H - h) / 2);
      const bx = Math.round(W / 2 - total / 2);
      const by = y + h - bh - 18;
      return { portrait, x, y, w, h, buttons: this.savePrompt.options.map((_, i) => ({ x: bx + i * (bw + gap), y: by, w: bw, h: bh })) };
    }
    const w = Math.min(W - screen.safeLeft - screen.safeRight - 32, 440);
    const x = (W - w) / 2;
    const bh = 64;
    const h = 116 + n * (bh + gap) + 28;
    const y = portraitMenuSafeTop() + Math.round((portraitMenuSafeBottom() - portraitMenuSafeTop() - h) / 2);
    const buttons = this.savePrompt.options.map((_, i) => ({ x: x + pad, y: y + 108 + i * (bh + gap), w: w - pad * 2, h: bh }));
    return { portrait, x, y, w, h, buttons };
  }

  /** One save-prompt answer: its plate, label, and the selection ring on the one picked. */
  drawSavePromptButton(ctx, r, label, picked, portrait) {
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    rr(ctx, r.x, r.y, r.w, r.h, portrait ? 10 : 5); ctx.fill();
    ctx.strokeStyle = picked ? '#c9a0ff' : '#48e0c8';
    ctx.lineWidth = portrait ? 2 : 1;
    rr(ctx, r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1, portrait ? 10 : 5); ctx.stroke();
    const ink = picked ? '#c9a0ff' : '#48e0c8';
    if (portrait) {
      const s = portraitMenuFit(label, 2, r.w - 20, 'bold');
      portraitMenuTextCentered(ctx, label, r.x + r.w / 2, portraitMenuTextY(r.y + r.h / 2, s, 'bold'), ink, s, 'bold');
    } else {
      const s = Math.min(1.25, (r.w - 12) / Math.max(1, textWidth(label, 1, 'bold')));
      drawTextCentered(ctx, label, r.x + r.w / 2, textYForMid(r.y + r.h / 2, s, 'bold'), ink, s, 'bold');
    }
    if (picked) {
      const pad = portrait ? 5 : 3;
      ctx.strokeStyle = '#c9a0ff';
      ctx.lineWidth = portrait ? 3 : 1.5;
      rr(ctx, r.x - pad, r.y - pad, r.w + 2 * pad, r.h + 2 * pad, (portrait ? 10 : 5) + pad); ctx.stroke();
    }
  }

  /** SAVE THIS BANGER? over the room — the club's own box, on the way out before saving. */
  drawSavePrompt(ctx) {
    const g = this.savePromptLayout();
    const p = this.savePrompt;
    ctx.fillStyle = 'rgba(2,3,10,0.78)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#0b0b14';
    rr(ctx, g.x, g.y, g.w, g.h, g.portrait ? 12 : 5); ctx.fill();
    ctx.strokeStyle = '#48e0c8';
    ctx.lineWidth = g.portrait ? 2 : 1;
    rr(ctx, g.x + 0.5, g.y + 0.5, g.w - 1, g.h - 1, g.portrait ? 12 : 5); ctx.stroke();
    const title = 'SAVE THIS BANGER?';
    const line = bangerTitle(this.rec);
    if (g.portrait) {
      const ts = portraitMenuFit(title, 2.1, g.w - 36, 'title');
      portraitMenuTextCentered(ctx, title, W / 2, portraitMenuTextY(g.y + 54, ts, 'title'), '#48e0c8', ts, 'title');
      const ls = portraitMenuFit(line, 1.4, g.w - 36);
      portraitMenuTextCentered(ctx, line, W / 2, portraitMenuTextY(g.y + 98, ls), '#c8c8d8', ls);
    } else {
      const ts = Math.min(1.4, (g.w - 28) / Math.max(1, textWidth(title, 1, 'title')));
      drawTextCentered(ctx, title, W / 2, textYForMid(g.y + 20, ts, 'title'), '#48e0c8', ts, 'title');
      const ls = Math.min(1, (g.w - 28) / Math.max(1, textWidth(line, 1)));
      drawTextCentered(ctx, line, W / 2, textYForMid(g.y + 44, ls), '#c8c8d8', ls);
    }
    g.buttons.forEach((r, i) => this.drawSavePromptButton(ctx, r, p.options[i].label, p.sel === i, g.portrait));
  }

  /** The song's name, faded in under the mirror ball when it is tapped. */
  drawTitle(ctx, { portrait, P }) {
    const k = this.t - this.titleAt;
    const ball = this.boxes.ball;
    if (!ball || !(k >= 0) || k > TITLE_IN_S + TITLE_HOLD_S + TITLE_OUT_S) return;
    const a = Math.min(k / TITLE_IN_S, 1, (TITLE_IN_S + TITLE_HOLD_S + TITLE_OUT_S - k) / TITLE_OUT_S);
    const title = bangerTitle(this.rec);
    const fs = portrait ? [10 * P, 13 * P] : [7, 10];
    const lh = portrait ? 18 * P : 13;
    ctx.save();
    ctx.font = `${fs[1]}px ${TITLE_FONT}`;
    const boxW = Math.min(W - 16, ctx.measureText(title).width + (portrait ? 32 * P : 24));
    const boxH = lh * 2 + (portrait ? 12 * P : 10);
    // under the ball — in portrait too, now the ball hangs low and the signs fill the space over
    // it (Peter, 5 Oct 2026: "the messages displayed need to come down lower in portrait")
    const bx = W / 2 - boxW / 2;
    const by = ball.y + ball.r + (portrait ? 8 * P : 7);
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = 'rgba(11,11,20,0.82)';
    rr(ctx, bx, by, boxW, boxH, portrait ? 16 * P : 7); ctx.fill();
    ctx.strokeStyle = 'rgba(201,160,255,0.45)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `500 ${fs[0]}px ${BODY_FONT}`;
    ctx.fillStyle = '#8f8b9e';
    ctx.fillText('NOW PLAYING', W / 2, by + (portrait ? 6 * P : 5) + lh * 0.5, boxW - 16);
    ctx.font = `${fs[1]}px ${TITLE_FONT}`;
    ctx.fillStyle = '#48e0c8';
    ctx.fillText(title, W / 2, by + (portrait ? 6 * P : 5) + lh * 1.5, boxW - 16);
    ctx.restore();
  }

  /** The song's name and how to play, over the room for the first few seconds. */
  drawIntro(ctx, { portrait, P, stageTop, stageBot }) {
    const shown = this.shownAt == null ? 0 : this.t - this.shownAt;
    const a = 1 - Math.max(0, Math.min(1, (shown - INTRO_S) / INTRO_FADE_S));
    if (a <= 0) return;
    // how to play, simply: tap (or click) anything or anyone, and an encouragement — mostly SEE
    // WHAT HAPPENS, now and then MIX IT UP, picked once a visit (Peter, 5 Oct 2026)
    this.introNudge ??= Math.random() < 1 / 3 ? 'MIX IT UP!' : 'SEE WHAT HAPPENS!';
    const lines = ['NOW PLAYING', bangerTitle(this.rec),
      `${Input.isTouchDevice() ? 'TAP' : 'CLICK'} ANYTHING OR ANYONE`, this.introNudge];
    const fs = portrait ? [13 * P, 17 * P, 13 * P, 13 * P] : [7, 10, 7.5, 7.5];
    const lh = portrait ? 26 * P : 13;
    ctx.save();
    ctx.font = `${fs[1]}px ${TITLE_FONT}`;
    const boxW = Math.min(W - 16, Math.max(portrait ? 240 * P : 160, ctx.measureText(lines[1]).width + 24));
    const boxH = lh * lines.length + (portrait ? 24 * P : 12);
    // High in the room, under the signs and clear of the heroes' heads (the ball waits for it);
    // in portrait below the LED board (Peter, 5 Oct 2026)
    const bx = W / 2 - boxW / 2, by = stageTop + (portrait ? 140 * P : 56);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(11,11,20,0.82)';
    rr(ctx, bx, by, boxW, boxH, portrait ? 16 * P : 7); ctx.fill();
    ctx.strokeStyle = 'rgba(201,160,255,0.45)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    lines.forEach((l, i) => {
      ctx.font = i === 1 ? `${fs[1]}px ${TITLE_FONT}` : `500 ${fs[i]}px ${BODY_FONT}`;
      ctx.fillStyle = i === 0 ? '#8f8b9e' : i === 1 ? '#48e0c8' : '#c8c8d8';
      ctx.fillText(l, W / 2, by + (portrait ? 12 * P : 6) + lh * (i + 0.5), boxW - 16);
    });
    ctx.restore();
  }
}
