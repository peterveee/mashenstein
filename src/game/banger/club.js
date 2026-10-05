import { SKIRT_LEGS, tameSkirt } from './dance-legs.js';
import { drawDiscoBall } from './mirrorball.js';
import { drawBeachBall, BEACH_BALL_COLOURS, BEACH_BALL_COLOURS_2 } from './beachball.js';
import { PARTY_BEATS, CLEANERS, partyAge, partyAlive, partyHero, drawPartyFront, scrapY } from './club-party.js';
import { ClubVoices } from './club-voices.js';
import { PADS, SHOUTS, playPad, startRiser, rollHit } from './club-hits.js';
import { clubCrt } from './club-crt.js';
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
import { songFor, bangerTitle } from './store.js';
import { drawPlayerMarker, MARKER_R, MARKER_GAP } from '../player-marker.js';
import { LED_SLOGANS, LED_SCROLLS, LED_STYLE_LINES, fillLed } from './led-slogans.js';
import {
  HERO_MOVES, PARTS, nextBeatAt, nextSixteenthAt, nextBarAt, landingFor, playMove, startHold, dragHold, endHold, setPartLevel,
  releaseClub, moveSeconds, gridReady, setSpeed, stepTime,
} from './club-fx.js';

const BODY_FONT = "'Fredoka', 'Trebuchet MS', 'Segoe UI', system-ui, sans-serif";
const DISCO = ['#ff4fa3', '#ffd23f', '#3fb8ff', '#7cff6b', '#b06bff'];
const LASER = ['#3dff6e', '#ff3355', '#36e6ff'];
const CANS = [0.06, 0.18, 0.38, 0.62, 0.82, 0.94];
/** Seconds the song's name and the instructions stay up, and how long they take to go. */
const INTRO_S = 4.5;
const INTRO_FADE_S = 0.8;
/** The mixer icon stays bright this long after it is used, then fades to a hint. */
const ICONS_AWAKE_S = 3;
const ICONS_ASLEEP = 0.18;
/** The mixer panel closes itself after this long untouched. */
const MIXER_IDLE_S = 5;
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
const MOMENT_S = { ball: 0, confetti: 4.2, streamers: 4.8, sticks: 2.8 };   // the ball runs on beats instead
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
    this.section = null;       // the section of the song playing, by index into its form
    this.waveAt = -Infinity;   // when the last Mexican wave started (on the song's loop)
    this.lastBeat = null;
    this.focus = 0;            // keyboard / pad focus: the floor's slots, then the part icons, then back
    this.boxes = { heroes: [], mixer: null, panel: null, faders: [], sounds: [], back: null, ball: null, led: null, floor: null };
    // The sound swaps: B-33P's 8-BIT and the mixer's sound buttons (club-voices.js).
    this.voices = new ClubVoices(this.song, this.rec);
    this.padHits = [];         // floor pads struck: { pad, x, y, when (audio), t }
    this.seenTouches = new Set();   // the fingers on the glass already answered for (update)
    this.buttonsAt = -Infinity; // the floor woke the bottom buttons: a tap on it, or the pointer over it
    this.echo = null;          // Grumpos's boomerang in flight: { when } (audio time the beat was thrown)
    this.punch = null;         // Ramon's stutter: { grab (beat), slice (beats) } — the dancers loop with it
    this.bow = null;           // Fernwick's draw: { riser, step0, rollStep, until } while it builds
    this.landing = null;       // ...and the drop it lands: { at (audio), section } until it is heard
    this.crowd = null;         // ...and the crowd's crouch and jump for it: { since, release, land } (audio times)
    this.speedBack = null;     // Rusty let go: { notBefore } until the song's own speed is back on a beat
    this.layout = null;        // the floor's measures, from the last draw (the drag's scale)
    Audio.setBank(this.song.bank, this.song.mix, this.song.arrangement, { startAtBeginning: true });
    Input.setMenuButtons();
    // Into the whole-screen frame now, behind the closed shutter, so the switch is never seen.
    this.fitScreen();
  }

  /** The pencil: off to the riff grid with this song. */
  edit() {
    if (!this.onEdit) return;
    this.onEdit(this.rec, this.pending);
  }

  /** A tap on the mirror ball: the song's title fades in under it for a while. */
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
    // the song's own instruments back, Fernwick's riser faded, and the rest (releaseClub)
    this.voices?.release();
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
    if (this.holding) this.letGo();
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
    this.holding.held = startHold(move, at);
    if (move.slices) this.punch = { grab: this.beatAt(when), slice: move.slices[this.holding.held.slice] };
    if (move.draw) this.drawBow(move, at, when);
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
    if (move.speeds) this.speedBack = { notBefore: Math.max(h.min, this.heardNow()) };
    else endHold(at, h.held);
    for (const m of [this.queued, this.acting]) if (m && m.i === h.i && m.dur === Infinity) m.dur = Math.max(0, end - m.when);
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
      this.queued.what = on ? (hifi ? 'the band leaves 8-bit — tap again to go back' : move.what)
        : (hifi ? 'the band is back on 8-bit' : 'the band is back in full colour');
      return;
    }
    if (move.echo) this.echo = { when };
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

  /** Ball `n` of crossing `m` as points on the floor: { x, at (beats from its start), h, head }. */
  ballPath(m, n, r) {
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

  /** A crowd moment, starting now. */
  startMoment(kind, options = {}) {
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
      this.floorConfetti = [...this.floorConfetti, ...Array.from({ length: 26 }, (_, k) => ({
        x: W * (0.03 + 0.94 * Math.random()), dy: Math.random(),
        colour: DISCO[k % DISCO.length], at: this.t + m.life * (0.45 + 0.4 * Math.random()),
      }))].slice(-FLOOR_CONFETTI_MAX);
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
      m.sticks = Array.from({ length: 7 }, (_, k) => ({
        x: 0.12 + 0.76 * (k / 6) + (Math.random() - 0.5) * 0.08, colour: [...LASER, '#ff4fa3', '#ffd23f'][k % 5],
        vy: 1.5 + Math.random() * 0.45,                    // up to about half the screen
        vx: (Math.random() - 0.5) * 0.25, spin: (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 6),
        delay: k * 0.07,
      }));
    }
    this.moments.push(m);
    this.lastMoment = kind;
    return true;
  }

  updateParty() {
    // once the cleaner has been through, the floor is clean
    const sweeping = this.moments.find((m) => CLEANERS.includes(m.kind)) || null;
    if (this.sweeping && !sweeping) this.floorConfetti = [];
    this.sweeping = sweeping;
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
    if (this.t - this.lastLedTap < 0.35) {
      this.lastLedTap = -Infinity;
      this.popup = null;
      this.led = {
        text: `${Math.round(this.song.bpm || 120)} BPM`,
        scroll: false,
        start: this.t,
        dur: LED_HOLD_BARS * this.barSeconds(),
      };
    } else this.lastLedTap = this.t;
  }

  /**
   * Double-tap the club-name sign: on to the next section of the song (the last goes round
   * to the first). The engine holds the seek to the end of the bar playing, so it lands
   * like a live deck — and the section's own moment fires as it arrives. Tapping again
   * before it lands steps on from the queued section, not the one still playing.
   */
  tapClubSign() {
    if (this.t - this.lastSignTap >= 0.35) { this.lastSignTap = this.t; return; }
    this.lastSignTap = -Infinity;
    const form = this.song.form || [];
    if (form.length < 2) return;
    const next = ((this.skipTo ?? this.section ?? -1) + 1) % form.length;
    this.skipTo = next;
    Audio.setStepAtBoundary((form[next].from - 1) * 16);
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
    setPartLevel(this.song, p.id, v, null, 0.03);
    if (was > 0 && v === 0) this.popup = { text: `NO ${p.label}`, t: this.t };
    if (was === 0 && v > 0) this.popup = { text: `YES ${p.label}`, t: this.t };
    this.iconsAt = this.t;
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
    if (this.t >= this.smokeAt) {
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
    if (this.crowd?.land != null && this.heardNow() > this.crowd.land + this.barSeconds() / 2) this.crowd = null;
    if (this.echo) {
      const e = HERO_MOVES.find((m) => m.echo)?.echo;
      if (!e || this.heardNow() > this.echo.when + (e.repeats + 1) * e.every * this.barSeconds() / 4) this.echo = null;
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
    if (this.t >= this.momentAt) {
      const pick = CLUB_MOMENTS.filter((k) => k !== this.lastMoment);
      this.startMoment(pick[Math.floor(Math.random() * pick.length)]);
      this.momentAt = this.t + this.barSeconds() * MOMENT_QUIET_BARS;
    }
    this.moments = this.moments.filter((m) => PARTY_BEATS[m.kind]
      ? partyAlive(m, this.beat()) : this.t < m.t0 + m.life);
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
      if (!this.seenTouches.has(id)) { this.seenTouches.add(id); freshTouches.push(tch); }
    }
    for (const id of [...this.seenTouches]) if (!Input.touches?.has(id)) this.seenTouches.delete(id);
    // A mouse over the dance floor keeps the bottom buttons awake (Peter, 5 Oct 2026).
    if (!Input.usingTouch && inside(this.boxes.floor)) this.buttonsAt = this.t;
    // A fader under the finger follows it until it lets go.
    if (this.dragging != null) {
      if (Input.held('pointer')) this.levelFromY(this.dragging, y);
      else this.dragging = null;
    }
    if (this.mixerOpen && this.dragging == null && this.t - this.iconsAt > MIXER_IDLE_S) this.mixerOpen = false;

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
        if (s >= 0) { this.mixSel = s; this.nextSound(s); }
        else if (k >= 0) { this.dragging = k; this.mixSel = k; this.levelFromY(k, y); }
        else if (!inside(this.boxes.panel)) this.openMixer(false);   // a tap outside closes it
      }
      Input.endFrame();
      return;
    }

    // the floor's slots (left to right; in portrait the back row first), the mixer, back, the
    // pencil, and the SAVE button while the song is not kept yet. Up and down belong to a
    // hero held on the keys: they are its drag.
    const targets = HERO_MOVES.length + 3 + (this.pending ? 1 : 0);
    const keyHold = this.holding && this.holding.source !== 'pointer';
    if (Input.pressed('right') || (!keyHold && Input.pressed('down'))) this.focus = (this.focus + 1) % targets;
    if (Input.pressed('left') || (!keyHold && Input.pressed('up'))) this.focus = (this.focus + targets - 1) % targets;
    const key = Input.pressed('confirm') ? 'confirm' : Input.pressed('jump') ? 'jump' : null;
    if (key) {
      if (this.focus < HERO_MOVES.length) this.pressHero(this.formationOrder[this.focus] ?? this.focus, key);
      else if (this.focus === HERO_MOVES.length) this.openMixer(true);
      else if (this.focus === HERO_MOVES.length + 1) this.back();
      else if (this.focus === HERO_MOVES.length + 2) this.edit();
      else if (this.focus === HERO_MOVES.length + 3) this.savePressed();
      else this.back();
    }
    // A SECOND FINGER on the dance floor plays its pad (the fingers are counted above).
    if (!Input.pressed('pointer')) {
      const f = this.boxes.floor;
      for (const tch of freshTouches) {
        if (f && tch.x0 >= f.x && tch.x0 <= f.x + f.w && tch.y0 >= f.y && tch.y0 <= f.y + f.h) this.hitPad(tch.x0, tch.y0);
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
      else if (ball && Math.hypot(x - ball.x, y - ball.y) < ball.r * 1.6) this.showTitle();
      else {
        const h = this.boxes.heroes.findIndex(inside);
        if (h >= 0) { this.focus = Math.max(0, this.formationOrder.indexOf(h)); this.pressHero(h, 'pointer'); }
        else if (inside(this.boxes.floor)) this.hitPad(x, y);
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
    if (!h?.held || !(move.drag || move.slices || move.speeds)) return;
    let delta = h.delta;
    if (h.source === 'pointer') {
      const span = (this.layout?.toonH || 60) * DRAG_SPAN;
      const y = (h.touch != null ? Input.touches?.get(h.touch)?.y : null) ?? Input.pointer.y;
      delta = Math.max(-1, Math.min(1, (h.y0 - y) / span));
    } else {
      if (Input.pressed('up')) delta = Math.min(1, delta + 1 / 3);
      if (Input.pressed('down')) delta = Math.max(-1, delta - 1 / 3);
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
  hitPad(x, y) {
    const f = this.boxes.floor;
    this.buttonsAt = this.t;
    if (!f) return;
    const zone = Math.max(0, Math.min(PADS.length - 1, Math.floor((x - f.x) / (f.w / PADS.length))));
    const pad = PADS[zone];
    // the shout is a different word each time it is struck: HEY!, HO!, YEAH!, WOO!, OI!
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
      playPad(ctx, Audio.musicBus, pad.id, when, { tonic: tonic || 220, sixteenth: spb, word });
    }
    if (word) this.shoutNext = SHOUTS.indexOf(word);
    this.padHits = [...this.padHits.filter((p) => this.t - p.t < PAD_WORD_S + 1),
      { pad: pad.id, col: pad.col, label: word?.word || pad.label, zone, x, y, when, t: this.t }];
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

  /** A neon sign, drawn once (glow and all) and reused. */
  neon(text, size, colour) {
    const ss = bakeSS();
    const key = `${text}|${size}|${colour}|${ss}`;
    if (!this.bakes.has(key)) {
      const probe = document.createElement('canvas').getContext('2d');
      probe.font = `${size}px ${TITLE_FONT}`;
      const w = probe.measureText(text).width + size * 1.6;
      const h = size * 2;
      const c = document.createElement('canvas');
      c.width = Math.ceil(w * ss); c.height = Math.ceil(h * ss);
      const g = c.getContext('2d');
      g.scale(ss, ss);
      g.font = `${size}px ${TITLE_FONT}`;
      g.textBaseline = 'middle'; g.lineJoin = 'round';
      g.shadowColor = colour; g.shadowBlur = size * 0.7;
      g.strokeStyle = colour; g.lineWidth = size * 0.11;
      g.strokeText(text, size * 0.8, h / 2);
      g.strokeText(text, size * 0.8, h / 2);
      g.shadowBlur = 0;
      g.strokeStyle = '#ffffff'; g.lineWidth = size * 0.035;
      g.strokeText(text, size * 0.8, h / 2);
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
    this.layout = { toonH, floorRef, cellW };     // a held hero's drag is measured in its height
    // the dance floor itself — the tiles from the front row's feet down — is the pads
    this.boxes.floor = { x: sx, y: floorRef, w: sw, h: stageBot - floorRef };
    const now = this.heardNow();
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

    // the room
    const bg = ctx.createLinearGradient(0, stageTop, 0, stageBot);
    bg.addColorStop(0, '#0f0d24'); bg.addColorStop(0.7, '#1a1236'); bg.addColorStop(1, '#120d26');
    ctx.fillStyle = bg;
    ctx.fillRect(sx, stageTop, sw, sh);

    // neon on the back wall, flickering now and then
    {
      const flick = (seed) => (hash(Math.floor(t * 9) + seed, 1, 2) > 0.94 ? 0.25 : 1);
      const a = this.neon('THE BANGER LAB', portrait ? 24 * P : 14, '#ff4fa3');
      // Both signs hang from the truss on two cables, on solid boards, rather than floating
      // in the air (Peter, 3 Oct 2026).
      const hang = (x, y, w, h, fill, edge) => {
        const top = stageTop + 8 * u + 3 * u;
        ctx.strokeStyle = '#3a3448'; ctx.lineWidth = 0.8 * u;
        ctx.beginPath();
        ctx.moveTo(x + w * 0.15, top); ctx.lineTo(x + w * 0.15, y);
        ctx.moveTo(x + w * 0.85, top); ctx.lineTo(x + w * 0.85, y);
        ctx.stroke();
        ctx.fillStyle = fill; rr(ctx, x, y, w, h, 1.5 * u); ctx.fill();
        ctx.strokeStyle = edge; ctx.lineWidth = 0.8 * u; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x + 1.5 * u, y + 0.8 * u, w - 3 * u, 0.8 * u);
      };
      const ns = portrait ? 24 * P : 14;
      const ax = portrait ? sw / 2 - a.w / 2 : safeL + 34, ay = (portrait ? stageTop + 44 * P : stageTop + 34) - a.h / 2;
      this.boxes.sign = { x: ax + ns * 0.3, y: ay + a.h / 2 - ns * 0.9, w: a.w - ns * 0.6, h: ns * 1.8 };
      hang(ax + ns * 0.3, ay + a.h / 2 - ns * 0.9, a.w - ns * 0.6, ns * 1.8, '#130f1f', '#2e2640');
      ctx.globalAlpha = flick(0) * (0.85 + 0.15 * pulse);
      ctx.drawImage(a.img, ax, ay, a.w, a.h);
      ctx.globalAlpha = 1;
      // the red dot-matrix board where OPEN LATE was in neon
      const pitch = portrait ? 2.2 * P : 1.4;
      const bw = (LED_COLS + 2) * pitch;
      const bx = portrait ? sw - bw - 8 * P : sw - safeR - bw - 12;
      const by = stageTop + (portrait ? 84 * P : 34) - (LED_ROWS + 2) * pitch / 2;
      const bh = (LED_ROWS + 2) * pitch;
      hang(bx - 2 * pitch, by - 2 * pitch, bw + 4 * pitch, bh + 4 * pitch, '#16121c', '#3a3248');
      this.boxes.led = { x: bx - 2 * pitch, y: by - 2 * pitch, w: bw + 4 * pitch, h: bh + 4 * pitch };
      this.ledAt = { x: bx, y: by, pitch };   // where it is painted again over the CRT
      this.drawLed(ctx, bx, by, pitch);
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
    for (let i = 0; i < 4; i++) {
      const ox = sx + sw * CANS[i + 1];
      const len = (floorRef - stageTop) * 1.15;
      const aim = -Math.atan2(sx + sw / 2 - ox, len);
      const ang = Math.sin(t * 0.5 + i * 2.1) * 0.45 * (1 - drawn) + aim * drawn;
      ctx.save();
      ctx.translate(ox, stageTop + 7 * u);
      ctx.rotate(ang);
      const g = ctx.createLinearGradient(0, 0, 0, len);
      g.addColorStop(0, accent + '40'); g.addColorStop(1, accent + '00');
      ctx.globalAlpha = 0.35 + 0.65 * pulse;
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
          const col = under ? accent : DISCO[grid[r][c]];
          ctx.globalAlpha = under ? 0.24 + 0.16 * pulse : 0.07 + 0.07 * pulse;
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
      for (const can of CANS) {
        const fx = sx + sw * can, fy = stageTop + 7 * u;
        ctx.beginPath();
        ctx.moveTo(fx - 3 * u, fy); ctx.lineTo(fx + 3 * u, fy);
        ctx.lineTo(fx + sw * 0.18, stageBot); ctx.lineTo(fx - sw * 0.18, stageBot);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }

    this.drawSpeakers(ctx, rig, u, pulse);
    // LASERS, in bursts — one bar in four — over the speakers and behind the heroes. The
    // bursts take turns between two rigs (Peter, 3 Oct 2026): fans from the bottom corners on
    // the floor, and an overhead rig on the truss raking down across the floor.
    if (barN % 4 === 0 && Math.floor(barN / 4) % 2 === 1) {
      const fade = Math.min(1, beatF + (beatN % 4) > 0 ? 1 : beatF * 8) * (0.55 + 0.45 * pulse);
      const ey = stageTop + 12 * u;
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
      const ballUp = ball && t - this.ballAt > this.barSeconds() * 0.8;
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
          // the bounces: weaker than the beam that made them, and dying away as they go
          // (Peter, 3 Oct 2026)
          // — a dozen of them, off the turning facets at uneven lengths (Peter: more beams)
          for (let k = 0; k < (this.lite ? BALL_BOUNCES / 2 : BALL_BOUNCES); k++) {
            const ang = t * 1.3 * (dir > 0 ? 1 : -1) + k * (Math.PI * 2 / BALL_BOUNCES) + (dir > 0 ? 0 : 0.26) + 0.18 * Math.sin(k * 2.7);
            const reach = sw * (0.4 + 0.4 * ((k * 0.618) % 1));
            const x2 = hx + Math.cos(ang) * reach, y2 = hy + Math.sin(ang) * reach;
            const g = ctx.createLinearGradient(hx, hy, x2, y2);
            g.addColorStop(0, colour); g.addColorStop(1, colour + '00');
            ctx.strokeStyle = g;
            beam(hx, hy, x2, y2, fade * 0.4);
          }
          ctx.strokeStyle = colour;
          ctx.globalAlpha = fade; ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(hx, hy, 1.6 * u, 0, Math.PI * 2); ctx.fill();
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
    CANS.forEach((f, i) => {
      const cx = sx + sw * f, cy = stageTop + th + 1.5 * u;
      ctx.fillStyle = '#16131f';
      rr(ctx, cx - 3.2 * u, cy - 2.5 * u, 6.4 * u, 5.5 * u, 1.2 * u); ctx.fill();
      ctx.globalAlpha = 0.45 + 0.55 * pulse;
      ctx.fillStyle = acting ? accent : DISCO[(((i + beatN) % DISCO.length) + DISCO.length) % DISCO.length];
      ctx.beginPath(); ctx.ellipse(cx, cy + 3 * u, 2.6 * u, 1.3 * u, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    });

    this.drawBall(ctx, { portrait, P, u, t, sx, sw, sh, stageTop, pulse, accent, beat });


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
      const box = { x: hx - cellW / 2 + 2, y: floorY - toonH - 6, w: cellW - 4, h: toonH + 14, floorY };
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
    // What the move playing does to the room, over all of it (drawMoveRoom).
    this.drawMoveRoom(ctx, { u, t, sx, sw, stageTop, stageBot, floorRef, toonH, beat, pulse, drawn });
    // Illuminate the cast and floor too; captions and controls are painted afterwards.
    if (strobe > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(224,242,255,${strobe * 0.18})`;
      ctx.fillRect(sx, stageTop, sw, sh);
      ctx.restore();
    }
    // B-33P's 8-BIT, seen: while the band plays on the 8-Bit set, the room is on a CRT — all
    // of it but the UI, which is painted from here on (club-crt.js; Peter, 5 Oct 2026).
    if (this.voices?.swappedNow && !this.voices.eightBit
      && clubCrt(ctx, { top: stageTop, bottom: stageBot, toonH, lite: this.lite }) && this.ledAt) {
      // ...but the LED board says things, so it is painted again over the tube, crisp
      this.drawLed(ctx, this.ledAt.x, this.ledAt.y, this.ledAt.pitch);
    }
    // the floor pads' words, over the tube: they are what the player just did
    this.drawPadWords(ctx, { toonH, stageBot });
    // the move just made, and whose it was
    let capSince = this.caption ? (this.heardNow() - this.caption.when) / (this.caption.bar / 4) : Infinity;
    // a held move's caption stays up while it is held
    if (this.caption && this.holding?.i === this.caption.i) capSince = Math.min(capSince, 1);
    if (capSince < 4) {
      // a move's own name and line — or, for B-33P's toggle, which way it went
      const m = { ...HERO_MOVES[this.caption.i], ...(this.caption.title ? { move: this.caption.title } : {}),
        ...(this.caption.what ? { what: this.caption.what } : {}) };
      const since = capSince;
      const a = 1 - Math.max(0, (since - 2.8) / 1.2);
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
      const w2 = ctx.measureText(m.what).width;
      const pw = Math.max(w1, w2) + big;
      ctx.globalAlpha *= 0.62;
      ctx.fillStyle = '#0b0b14';
      rr(ctx, -pw / 2, -big * 1.5, pw, big * 2.4, big * 0.45); ctx.fill();
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
      ctx.fillText(m.what, 0, small * 1.65);
      ctx.restore();
    }

    this.popupY = floorRef - toonH - (portrait ? 24 * P : 10);
    this.drawControls(ctx, { portrait, P, u, stageTop, stageBot, safeL, safeR });
    this.drawIntro(ctx, { portrait, P, stageTop, stageBot });
    this.drawTitle(ctx, { portrait, P });
    if (this.savePrompt) this.drawSavePrompt(ctx);
    ctx.restore();
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
    if (move.onTwoOrFour && a.plan && Number.isFinite(a.dur) && a.dur > 0) {
      const hits = a.plan.hits || 1, len = a.dur / hits;
      const into = this.heardNow() - a.when;
      const h = Math.floor(into / len);
      if (h >= 0 && h < hits) {
        const u = into / len - h;
        const start = this.beatAt(a.when + h * len);
        return start + (len * 4 / a.bar) * (u - u * u / 2);
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
    const e = this.echo;
    const spec = HERO_MOVES.find((m) => m.echo)?.echo;
    if (!e || !spec || !this.heroSprites?.length || typeof ctx.getTransform !== 'function') return;
    let m;
    try { m = ctx.getTransform(); } catch { return; }
    const beatS = this.barSeconds() / 4, now = this.heardNow();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (let k = 1; k <= spec.repeats; k++) {
      const age = (now - (e.when + k * spec.every * beatS)) / beatS;
      if (age < 0 || age >= GHOST_BEATS) continue;
      ctx.globalAlpha = 0.55 * 0.72 ** (k - 1) * (1 - age / GHOST_BEATS) ** 0.6;
      const dx = (k % 2 ? -1 : 1) * cellW * (0.28 + 0.1 * age) * m.a;
      for (const hs of this.heroSprites) {
        if (hs?.last && hs.canvas?.width) ctx.drawImage(hs.canvas, hs.last.x + dx, hs.last.y, hs.last.w, hs.last.h);
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
      const level = this.holding?.i === a.i ? this.holding.held?.level ?? move.drag.start : move.drag.start;
      const depth = 1 - Math.max(0, Math.min(1, level));
      const fade = Math.min(1, (now - a.when) * 6);
      ctx.globalAlpha = fade * (0.14 + 0.3 * depth);
      ctx.fillStyle = '#0b5f6a';
      ctx.fillRect(sx, stageTop, sw, sh);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(150,255,235,1)';
      ctx.lineWidth = 0.9 * u;
      for (let j = 0; j < 6; j++) {
        ctx.globalAlpha = fade * (0.05 + 0.05 * (1 - depth));
        const y0 = floorRef + (j + 0.5) / 6 * (stageBot - floorRef);
        ctx.beginPath();
        for (let x = sx; x <= sx + sw; x += 6 * u) {
          const y = y0 + Math.sin(x * 0.045 / u + t * 2.2 + j * 1.7) * 2.2 * u + Math.sin(x * 0.11 / u - t * 1.3 + j) * u;
          if (x === sx) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      for (let k = 0; k < (this.lite ? 10 : 18); k++) {
        const rise = ((t * (0.12 + 0.1 * hash(k, 2, 9)) + hash(k, 5, 1)) % 1);
        const x = sx + sw * ((hash(k, 7, 3) + Math.sin(t * 0.8 + k) * 0.01 + 1) % 1);
        const y = floorRef - rise * (floorRef - stageTop);
        const r = (1.2 + 2.4 * hash(k, 1, 4)) * u;
        ctx.globalAlpha = fade * 0.55 * Math.min(1, rise * 6, (1 - rise) * 4);
        ctx.strokeStyle = '#bff8ff'; ctx.lineWidth = 0.6 * u;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 3.4, 4.8); ctx.stroke();
      }
    }
    if (move?.slices && this.punch) {
      const phase = (((beat - this.punch.grab) % this.punch.slice) + this.punch.slice) % this.punch.slice / this.punch.slice;
      ctx.globalAlpha = (beat >= this.punch.grab ? 0.12 : 0) * Math.exp(-phase * 9);
      ctx.fillStyle = '#ffe2d0';
      ctx.fillRect(sx, stageTop, sw, sh);
    }
    if (move?.onTwoOrFour && Number.isFinite(a.dur) && a.dur > 0) {
      const hits = a.plan?.hits || 1, len = a.dur / hits;
      const into = now - a.when;
      const u2 = into / len - Math.floor(into / len);
      if (into >= 0 && into < a.dur) {
        ctx.globalAlpha = 0.82 * u2 ** 1.3;
        ctx.fillStyle = '#05040c';
        ctx.fillRect(sx, stageTop, sw, sh);
      }
    }
    if (this.lightsBack != null && now >= this.lightsBack && now - this.lightsBack < 0.22) {
      ctx.globalAlpha = 0.28 * (1 - (now - this.lightsBack) / 0.22);
      ctx.fillStyle = '#fff6e0';
      ctx.fillRect(sx, stageTop, sw, sh);
    }
    if (move?.drop) {
      const fade = Math.min(1, (now - a.when) * 8, (a.when + a.dur - now) * 8);
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
    const thump = (kick == null ? pulse : kick) * (this.levels.drums > 0 ? 1 : 0);
    const cone = (cx, cy, r, push) => {
      ctx.fillStyle = '#07060c';
      ctx.beginPath(); ctx.arc(cx, cy, r * 1.06, 0, Math.PI * 2); ctx.fill();
      const g = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.25, r * 0.1, cx, cy, r);
      g.addColorStop(0, '#3a3450'); g.addColorStop(1, '#141120');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, r * (0.8 + 0.24 * push), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 0.8 * u;
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#24203a';
      ctx.beginPath(); ctx.arc(cx, cy, r * (0.22 + 0.24 * push), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath(); ctx.arc(cx - r * 0.08, cy - r * 0.1, r * 0.1, 0, Math.PI * 2); ctx.fill();
      // the hit itself: a ring flashing round the cone
      if (push > 0.25) {
        ctx.strokeStyle = `rgba(201,160,255,${0.7 * push})`; ctx.lineWidth = 1.4 * u;
        ctx.beginPath(); ctx.arc(cx, cy, r * (1.02 + 0.08 * push), 0, Math.PI * 2); ctx.stroke();
      }
    };
    // a strong kick jolts the cabinets
    const jolt = thump > 0.6 ? (thump - 0.6) * 2.5 * u : 0;
    rig.xs.forEach((x0) => {
      const x = x0 + (Math.random() - 0.5) * jolt;
      const cx = x + rig.w / 2;
      // the sub, on the floor: one big woofer
      const sy = rig.floor - rig.subH;
      ctx.fillStyle = '#1a1530';
      rr(ctx, x, sy, rig.w, rig.subH, 2 * u); ctx.fill();
      ctx.strokeStyle = 'rgba(201,160,255,0.22)'; ctx.lineWidth = u; ctx.stroke();
      cone(cx, sy + rig.subH * 0.5, Math.min(rig.w * 0.42, rig.subH * 0.4), thump);
      // the top cabinet: two mids and a horn
      const ty = rig.top;
      ctx.fillStyle = '#1c1733';
      rr(ctx, x + rig.w * 0.04, ty, rig.w * 0.92, rig.topH - 2 * u, 2 * u); ctx.fill();
      ctx.strokeStyle = 'rgba(201,160,255,0.22)'; ctx.stroke();
      cone(cx - rig.w * 0.2, ty + rig.topH * 0.62, rig.w * 0.16, thump * 0.7);
      cone(cx + rig.w * 0.2, ty + rig.topH * 0.62, rig.w * 0.16, thump * 0.7);
      ctx.fillStyle = '#1d1930';
      rr(ctx, cx - rig.w * 0.24, ty + rig.topH * 0.12, rig.w * 0.48, rig.topH * 0.24, rig.topH * 0.1); ctx.fill();
      ctx.fillStyle = '#07060c';
      rr(ctx, cx - rig.w * 0.14, ty + rig.topH * 0.17, rig.w * 0.28, rig.topH * 0.14, rig.topH * 0.06); ctx.fill();
      // a little power light
      ctx.fillStyle = `rgba(124,255,107,${0.5 + 0.5 * thump})`;
      ctx.beginPath(); ctx.arc(x + rig.w * 0.86, sy + rig.subH * 0.9, 1.2 * u, 0, Math.PI * 2); ctx.fill();
    });
  }

  /** The crowd moments, over the heroes — and the smoke, round them (`back` and `front`). */
  drawMoments(ctx, layer, { u, floorRef, toonH, stageTop, stageBot = H, beat = 0 }) {
    // the last drop's confetti on the floor — Dolores's broom draws what is left while she sweeps
    const landed = (this.floorConfetti || []).filter((sc) => this.t >= sc.at);
    if (layer === 'back' && !this.moments.some((m) => CLEANERS.includes(m.kind))) {
      for (const sc of landed) {
        ctx.globalAlpha = Math.min(1, (this.t - sc.at) * 4);
        ctx.fillStyle = sc.colour;
        ctx.fillRect(sc.x, scrapY(floorRef, toonH, stageBot, u, sc.dy), 2 * u, u);
      }
      ctx.globalAlpha = 1;
    }
    for (const m of this.moments) {
      const k = this.t - m.t0;
      if (PARTY_BEATS[m.kind]) {
        if (layer === 'front') drawPartyFront(ctx, m, beat, { width: W, u, floorRef, toonH, stageTop, stageBot, scraps: landed });
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
          const r = toonH * BALL_R;
          const path = this.ballPath(m, n, r);
          const ballBeat = age - n * BALL_SPAWN_BEATS;
          const hop = path.findIndex((p) => p.at > ballBeat);   // the landing it is flying to
          if (ballBeat < 0 || hop < 1) continue;
          const from = path[hop - 1], to = path[hop], hopBeats = to.at - from.at;
          const bf = (ballBeat - from.at) / hopBeats;   // through this hop, 0 to 1
          const x = from.x + (to.x - from.x) * bf;
          const headY = floorRef - toonH * 1.05 - r;
          const y = headY - Math.sin(Math.PI * bf) * toonH * to.h;
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.beginPath(); ctx.ellipse(x, floorRef + 2 * u, r * (0.7 + 0.3 * (1 - Math.sin(Math.PI * bf))), r * 0.18, 0, 0, Math.PI * 2); ctx.fill();
          // the VINYL ball from the bake-off (beachball.js), squashing on each head it lands on
          const fromHead = Math.min(bf, 1 - bf) * hopBeats;   // beats either side of a landing
          drawBeachBall(ctx, x, y, r, { spin: ballBeat * 0.9 + n * 2, dir: m.dir, squash: Math.max(0, 1 - fromHead / 0.3),
            colours: n ? BEACH_BALL_COLOURS_2 : BEACH_BALL_COLOURS });
        }
      }
      if (m.ribbons) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, (m.life - k) / 0.9));
        ctx.lineCap = 'round';
        for (const ribbon of m.ribbons) {
          const age = k - ribbon.delay;
          if (age <= 0) continue;
          const x = (ribbon.side < 0 ? 0 : W) - ribbon.side * W * ribbon.reach * (1 - Math.exp(-age * 1.2))
            + Math.sin(age * 1.6 + ribbon.phase) * 9 * u;
          const y = stageTop + 6 * u + (floorRef - stageTop) * (0.035 * age + 0.045 * age * age) * ribbon.drift;
          const length = ribbon.length * u * Math.min(1, age * 3);
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

  drawBall(ctx, { portrait, P, u, t, sx, sw, sh, stageTop, pulse, accent, beat }) {
    const bar = 4 * 60 / (this.song.bpm || 120);
    const since = t - this.ballAt;
    const dropT = bar * 0.8;
    const p = Math.max(0, Math.min(1, since / dropT));
    const ease = 1 - Math.pow(1 - p, 3);
    const settle = since > dropT ? Math.exp(-(since - dropT) * 5) * Math.sin((since - dropT) * 18) : 0;
    const br = (portrait ? 40 * P : 20) * (this.ballScale || 1);
    const hang = portrait ? 172 * P : 46;   // lower (Peter, 3 Oct 2026)
    const bx = sx + sw / 2;
    const mountY = stageTop + 9 * u;
    // Dip down and spring back on the first beat of every even-numbered bar (2, 4, 6...).
    const barPulse = ((beat - 4) % 8 + 8) % 8;
    const bobBeats = 0.5;
    const bob = barPulse < bobBeats ? Math.sin(Math.PI * barPulse / bobBeats) * br * 0.12 : 0;
    const by = mountY - br * 2 + (hang + br * 2) * ease + settle * (portrait ? 8 * P : 4) + bob;
    this.boxes.ball = { x: bx, y: by, r: br };
    const rot = t * 1.3;
    const shine = Math.max(0, Math.min(1, (since - dropT * 0.6) / (bar * 0.5)));
    if (shine > 0) {
      const N = portrait ? 44 : 38;
      for (let k = 0; k < N; k++) {
        const fa = hash(k, 12.9898, 0), fb = hash(k, 78.233, 1);
        const x = sx + (((fa + rot * 0.045) % 1 + 1) % 1) * sw;
        const y = stageTop + 12 * u + fb * (sh - 16 * u);
        const tw = 0.55 + 0.45 * Math.sin(t * 7 + k * 1.7);
        const size = (1 + (k % 3) * 0.6) * u;
        ctx.globalAlpha = shine * tw * (0.55 + 0.45 * pulse);
        ctx.fillStyle = k % 5 === 0 ? accent : '#ffffff';
        ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
        // more of the spots drawn back to the ball as faint beams (Peter, 3 Oct 2026)
        if (k % 3 === 0) {
          ctx.globalAlpha = shine * 0.11 * tw;
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = size * 0.8;
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(x, y); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#24202f';
    rr(ctx, bx - 4 * u, mountY - 3 * u, 8 * u, 5 * u, 1.2 * u); ctx.fill();
    ctx.strokeStyle = 'rgba(200,200,216,0.55)'; ctx.lineWidth = 0.75 * u;
    ctx.beginPath(); ctx.moveTo(bx, mountY + 2 * u); ctx.lineTo(bx, by - br); ctx.stroke();
    ctx.fillStyle = '#5a5670';
    ctx.fillRect(bx - 1.5 * u, by - br - 2 * u, 3 * u, 2.5 * u);
    const halo = ctx.createRadialGradient(bx, by, br * 0.8, bx, by, br * 2.2);
    halo.addColorStop(0, `rgba(255,255,255,${0.16 + 0.14 * pulse})`); halo.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(bx, by, br * 2.2, 0, Math.PI * 2); ctx.fill();
    // the ball itself: the DISCO look from the bake-off (mirrorball.js)
    drawDiscoBall(ctx, bx, by, br, { t, pulse, accent, hits: this.ballHits, bands: this.lite ? 11 : 16 });
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
    const mx = portrait ? W - 32 * P : W - safeR - 16;
    const my = portrait ? portraitMenuSafeBottom() - 34 * P : stageBot - 16;
    {
      const focused = this.focus === HERO_MOVES.length && !Input.usingTouch;
      this.boxes.mixer = { x: mx - r * 1.4, y: my - r * 1.4, w: r * 2.8, h: r * 2.8 };
      disc(mx, my, r, focused ? 1 : iconAlpha);
      ctx.strokeStyle = focused ? '#c9a0ff' : this.mixerOpen ? '#f0c040' : 'rgba(240,192,64,0.7)';
      ctx.lineWidth = 0.8 * u;
      ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.stroke();
      // three faders, their caps at different heights
      ctx.strokeStyle = '#ffe08a'; ctx.fillStyle = '#ffe08a'; ctx.lineWidth = 0.9 * u;
      [[-0.38, 0.2], [0, -0.25], [0.38, 0.05]].forEach(([dx, cap]) => {
        const fx = mx + dx * r;
        ctx.beginPath(); ctx.moveTo(fx, my - r * 0.5); ctx.lineTo(fx, my + r * 0.5); ctx.stroke();
        ctx.fillRect(fx - r * 0.14, my + cap * r - r * 0.08, r * 0.28, r * 0.16);
      });
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
      ctx.strokeStyle = focused ? '#c9a0ff' : 'rgba(240,192,64,0.7)';
      ctx.lineWidth = 0.8 * u;
      ctx.beginPath(); ctx.arc(ex, my, r, 0, Math.PI * 2); ctx.stroke();
      // the pencil, on a slant: body, ferrule, and the sharpened point at the bottom left
      ctx.save();
      ctx.translate(ex, my);
      ctx.rotate(Math.PI / 4);
      const len = r * 1.15, w = r * 0.32;
      ctx.fillStyle = '#ffe08a';
      ctx.fillRect(-w / 2, -len / 2, w, len * 0.72);
      ctx.fillStyle = '#e07a8a';
      ctx.fillRect(-w / 2, -len / 2 - w * 0.55, w, w * 0.55);
      ctx.fillStyle = '#f0d0a0';
      ctx.beginPath(); ctx.moveTo(-w / 2, len * 0.22); ctx.lineTo(w / 2, len * 0.22); ctx.lineTo(0, len / 2 + w * 0.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3a3a52';
      ctx.beginPath(); ctx.moveTo(-w * 0.18, len / 2 - w * 0.25); ctx.lineTo(w * 0.18, len / 2 - w * 0.25); ctx.lineTo(0, len / 2 + w * 0.2); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    // SAVE, the pencil's twin on its right while the song is not kept yet: the same disc
    // and the same idle fade as the mixer and the pencil, with a floppy in the save's own
    // teal (Peter, 4 Oct 2026).
    this.boxes.save = null;
    if (this.pending) {
      const ex = portrait ? 32 * P : safeL + 16;
      const sx = ex + r * 2.8 + (portrait ? 10 * P : 8);
      const focused = this.focus === HERO_MOVES.length + 3 && !Input.usingTouch;
      this.boxes.save = { x: sx - r * 1.4, y: my - r * 1.4, w: r * 2.8, h: r * 2.8 };
      disc(sx, my, r, focused ? 1 : iconAlpha);
      ctx.strokeStyle = focused ? '#c9a0ff' : 'rgba(72,224,200,0.7)';
      ctx.lineWidth = 0.8 * u;
      ctx.beginPath(); ctx.arc(sx, my, r, 0, Math.PI * 2); ctx.stroke();
      // the floppy save icon, the way everyone draws it: a blue body with the 3.5" corner cut
      // well in, a silver shutter hung from the top edge with its read slot, and a white label
      // on the lower half. The body is the one dark mass and the shutter and label the two
      // lights, so at icon size it reads as a floppy rather than one tan card with lines on it.
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
      ctx.fillStyle = '#3f7fd6';
      ctx.fill();
      ctx.strokeStyle = 'rgba(11,11,20,0.5)';
      ctx.lineWidth = Math.max(0.5, r * 0.06);
      ctx.stroke();
      const shL = -f * 0.52, shR = f * 0.38, shT = -f, shB = -f * 0.22;
      ctx.fillStyle = '#e4e8f2';
      ctx.fillRect(shL, shT, shR - shL, shB - shT);
      const slotW = (shR - shL) * 0.24;
      ctx.fillStyle = '#1c2a44';
      ctx.fillRect(shR - slotW * 1.55, shT + f * 0.16, slotW, shB - shT - f * 0.28);
      const lbL = -f * 0.74, lbR = f * 0.74, lbT = f * 0.06, lbB = f * 0.92;
      ctx.fillStyle = '#f7f9fd';
      ctx.fillRect(lbL, lbT, lbR - lbL, lbB - lbT);
      ctx.strokeStyle = 'rgba(60,80,120,0.7)';
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
    // under the ball in landscape; over it in portrait, where the back row stands just below
    const bx = W / 2 - boxW / 2;
    const by = portrait ? ball.y - ball.r - 5 * P - boxH : ball.y + ball.r + 7;
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
    const lines = ['NOW PLAYING', bangerTitle(this.rec), 'TAP A HERO FOR THEIR MOVE — HOLD AND DRAG SOME',
      'TAP THE FLOOR FOR HITS · THE MIXER SETS LEVELS AND SOUNDS'];
    const fs = portrait ? [13 * P, 17 * P, 13 * P, 13 * P] : [7, 10, 7.5, 7.5];
    const lh = portrait ? 26 * P : 13;
    ctx.save();
    ctx.font = `${fs[1]}px ${TITLE_FONT}`;
    const boxW = Math.min(W - 16, Math.max(portrait ? 344 * P : 236, ctx.measureText(lines[1]).width + 24));
    const boxH = lh * 4 + (portrait ? 24 * P : 12);
    // High in the room, under the sign and clear of the heroes' heads (the ball waits for it)
    const bx = W / 2 - boxW / 2, by = stageTop + (portrait ? 96 * P : 56);
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
