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
import { W, H, bakeSS, screen, visualiserFrame, setVisualiserFullscreen } from '../../engine/renderer.js';
import { Input } from '../../engine/input.js';
import { Audio } from '../../engine/audio.js';
import { isTransitioning } from '../../engine/states.js';
import { TITLE_FONT } from '../../engine/sprites.js';
import { portraitMenuActive, portraitMenuSafeTop, portraitMenuSafeBottom } from '../../engine/portrait-menu.js';
import { drawToon, titleParadeAction, toonInkTop } from '../../sprites/toons.js';
// The heroes' dances, three each, from the lab where they are still being worked on
// (gallery: hero dances). Imported from there so the club dances whatever the lab has now.
import { HERO_DANCE_CANDIDATES, heroDancePose } from '../../dev/hero-dance-candidates.js';
import { songFor, bangerTitle } from './store.js';
import { drawPlayerMarker, MARKER_R, MARKER_GAP } from '../player-marker.js';
import { beginFloorReflectionBand, addFloorReflection, endFloorReflectionBand } from '../../engine/reflections.js';
import {
  HERO_MOVES, PARTS, nextBeatAt, nextSixteenthAt, landingFor, playMove, startHold, endHold, setPartLevel, releaseClub, moveSeconds,
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
const MIX_K = 1.7;
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
export const SKIRT_LEGS = Object.freeze(['tap', 'stand', 'hop']);
const ARMS_ONLY_HEROES = new Set(['grumpos']);
const SKIRT_STANCE = 0.085;   // a planted foot, from the middle (the dances' own stance is 0.1)
const SKIRT_TAP = 0.035;      // how high the tapping toe comes up
const SKIRT_HOP = 0.045;      // how high a hop goes, as a share of the hero's height
function tameSkirt(pose, legs, beat) {
  const f = ((beat % 1) + 1) % 1;
  const planted = [[SKIRT_STANCE, 0], [-SKIRT_STANCE, 0]];
  // No feet: the painter stands them as it does at idle, legs straight under the hem
  // (a dance's feet slacken the legs for its kicks, and bowed knees show under a kilt).
  let feet = null, ankles = [0, 0], bounce = pose.bounce * 0.5;
  if (legs === 'tap') {
    // up through the back half of the beat, down on it
    const up = f > 0.5 ? Math.sin((f - 0.5) * 2 * Math.PI) : 0;
    feet = [[SKIRT_STANCE + 0.01, -SKIRT_TAP * up], planted[1]];
    ankles = [-0.4 * up, 0];
  } else if (legs === 'hop') {
    // off the floor between beats, landing on each one
    bounce = SKIRT_HOP * Math.sin(f * Math.PI);
  }
  return { ...pose, bounce, dance: { ...pose.dance, feet, ankles } };
}

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
export const CLUB_MOMENTS = Object.freeze(['ball', 'confetti', 'sticks']);
const MOMENT_S = { ball: 0, confetti: 4.2, sticks: 2.8 };   // the ball runs on beats instead
const BALL_BEATS = 10;
/** A held move tapped rather than held still plays for this much of a bar. */
const MIN_HOLD_BARS = 0.5;

const hash = (a, b, n) => { const v = Math.sin(a * 91.7 + b * 47.3 + n * 13.1) * 43758.5; return v - Math.floor(v); };

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
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
  constructor({ rec, onBack, onEdit = null }) {
    this.rec = rec;
    this.onBack = onBack;
    this.onEdit = onEdit;
    this.bakes = new Map();
  }

  enter() {
    this.t = 0;
    this.song = songFor(this.rec);
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
    this.ballScale = 0.85 + Math.random() * 0.3;   // a slightly different ball every visit
    // When the club came out from behind the screen transition: the walk-in, the ball's
    // drop and the intro run from here, so none of them happens behind the shutter.
    this.shownAt = null;
    // THE DANCING: each hero's three dances, the order they join in (random), and — once
    // they have joined — the dance they are on and when they next change it.
    this.dancers = HERO_MOVES.map((m) => ({
      moves: HERO_DANCE_CANDIDATES.filter((d) => d.hero === m.hero),
      move: null, joinAt: Infinity, changeAt: Infinity, resting: false, last: null, legs: 'stand',
      hero: m.hero, skirted: SKIRTED.has(m.hero),
    }));
    this.danceOrder = HERO_MOVES.map((_, i) => i).sort(() => Math.random() - 0.5);
    this.moments = [];         // the crowd moments in the room now
    this.momentAt = Infinity;  // when the next one comes
    this.smokeAt = Infinity;   // when the smoke machine next goes off
    this.lastMoment = null;
    this.section = null;       // the section of the song playing, by index into its form
    this.focus = 0;            // keyboard / pad focus: heroes, then the part icons, then back
    this.boxes = { heroes: [], mixer: null, panel: null, faders: [], back: null, ball: null };
    Audio.setBank(this.song.bank, this.song.mix, this.song.arrangement, { startAtBeginning: true });
    Input.setMenuButtons();
    // Into the whole-screen frame now, behind the closed shutter, so the switch is never seen.
    this.fitScreen();
  }

  /** The pencil: off to the riff grid with this song. */
  edit() {
    if (!this.onEdit) return;
    this.onEdit(this.rec);
  }

  /** A tap on the mirror ball: the song's title fades in under it for a while. */
  showTitle() {
    const k = this.t - this.titleAt;
    // tapped again while it is up, it stays up rather than fading out and in again
    this.titleAt = k > TITLE_IN_S && k < TITLE_IN_S + TITLE_HOLD_S ? this.t - TITLE_IN_S : this.t;
  }

  fitScreen() {
    if (typeof window === 'undefined') return;
    setVisualiserFullscreen(window.innerWidth / Math.max(1, window.innerHeight) > W / H + 0.01);
  }

  // The song plays on back in the Lab (Peter, 3 Oct 2026) — with every part back in and no
  // move left on — and stops there when it is chosen again or the Lab is left.
  exit() {
    setVisualiserFullscreen(false);
    releaseClub(this.song);
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
    // `min` is the earliest it may come out: a tap still gets half a bar of it.
    this.holding = { i, source, min: when + bar * MIN_HOLD_BARS };
    if (at) startHold(move, at);
  }

  /** The held hero let go: the effect out on the next beat. */
  letGo() {
    const h = this.holding;
    this.holding = null;
    if (!h) return;
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
    endHold(at);
    for (const m of [this.queued, this.acting]) if (m && m.i === h.i && m.dur === Infinity) m.dur = Math.max(0, end - m.when);
  }

  tapHero(i) {
    const move = HERO_MOVES[i];
    const at = landingFor(move);
    const bar = at ? 16 * at.spb : this.barSeconds();
    const when = at ? at.when : this.heardNow() + (1 - (((this.beat() % 1) + 1) % 1)) * bar / 4;
    // `bar` is a bar of this song (the caption's clock); `dur` is how long the move lasts.
    this.queued = { i, when, bar, dur: at ? moveSeconds(move, at.spb, at.plan) : bar * (move.bars || 1) };
    if (at) playMove(move, at, { song: this.song, levels: this.levels });
  }

  /** A crowd moment, starting now. */
  startMoment(kind) {
    const beatS = this.barSeconds() / 4;
    const m = { kind, t0: this.t, life: kind === 'ball' ? BALL_BEATS * beatS + 0.2 : kind === 'smoke' ? SMOKE_S : MOMENT_S[kind], dir: Math.random() < 0.5 ? 1 : -1 };
    if (kind === 'smoke') {
      m.puffs = Array.from({ length: 28 }, (_, k) => ({
        born: k * 0.045 + Math.random() * 0.03, speed: 0.55 + Math.random() * 0.35,
        lift: 0.4 + Math.random() * 0.8, size: 0.8 + Math.random() * 0.5, front: k % 3 === 0,
      }));
    }
    if (kind === 'confetti') {
      m.bits = Array.from({ length: 72 }, (_, k) => {
        const side = k % 2 ? 1 : -1;
        return {
          side, colour: DISCO[k % DISCO.length], spin: (Math.random() - 0.5) * 14, phase: Math.random() * 6,
          vx: side * -(0.18 + Math.random() * 0.32), vy: 0.15 + Math.random() * 0.35, delay: Math.random() * 0.35,
          w: 0.6 + Math.random() * 0.7,
        };
      });
    }
    if (kind === 'sticks') {
      m.sticks = Array.from({ length: 7 }, (_, k) => ({
        x: 0.12 + 0.76 * (k / 6) + (Math.random() - 0.5) * 0.08, colour: [...LASER, '#ff4fa3', '#ffd23f'][k % 5],
        vy: 1.5 + Math.random() * 0.45,                    // up to about half the screen vx: (Math.random() - 0.5) * 0.25, spin: (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 6),
        delay: k * 0.07,
      }));
    }
    this.moments.push(m);
    this.lastMoment = kind;
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
      d.legs = ARMS_ONLY_HEROES.has(d.hero) ? 'stand' : SKIRT_LEGS[Math.floor(Math.random() * SKIRT_LEGS.length)];
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
    this.onBack?.();
  }

  update(dt) {
    this.t += dt;
    // THE WHOLE SCREEN on a wide landscape display — a phone on its side — rather than the
    // 16:9 picture with bars down the sides (Peter, 3 Oct 2026): the jukebox visualiser's
    // cover crop, which keeps the full width and trims the top and bottom, and draw() lays
    // the room out in what is left, the heroes kept clear of the notch. Set in enter(),
    // behind the closed shutter — switched in view it shows a frame stretched — and here
    // only when the phone is turned.
    this.fitScreen();
    if (this.shownAt == null && !isTransitioning()) {
      this.shownAt = this.t;
      // the mirror ball comes in last, once the heroes have walked on
      this.ballAt = this.t + BALL_ENTER_S;
      const bar = this.barSeconds();
      this.danceOrder.forEach((i, k) => { this.dancers[i].joinAt = this.t + bar * (DANCE_START_BARS + k * DANCE_JOIN_BARS); });
      this.momentAt = this.t + bar * MOMENT_QUIET_BARS;
      this.smokeAt = this.t + bar * SMOKE_FIRST_BARS;
    }
    if (this.t >= this.smokeAt) {
      this.startMoment('smoke');
      const [lo, hi] = SMOKE_GAP_BARS;
      this.smokeAt = this.t + this.barSeconds() * (lo + Math.floor(Math.random() * (hi - lo + 1)));
    }
    // A section change, as heard: its moment, on the downbeat it changes on.
    {
      const form = this.song.form || [];
      const bar = Math.floor(this.beat() / 4) + 1;
      const si = form.findIndex((f) => bar >= f.from && bar <= f.to);
      if (si !== this.section) {
        const kind = this.section != null && si >= 0 && this.shownAt != null ? MOMENT_FOR[form[si].role] : null;
        if (kind) {
          this.startMoment(kind === 'big' ? 'confetti' : kind);
          this.momentAt = this.t + this.barSeconds() * MOMENT_QUIET_BARS;
        }
        this.section = si;
      }
    }
    this.updateDancers();
    if (this.t >= this.momentAt) {
      const pick = CLUB_MOMENTS.filter((k) => k !== this.lastMoment);
      this.startMoment(pick[Math.floor(Math.random() * pick.length)]);
      this.momentAt = this.t + this.barSeconds() * MOMENT_QUIET_BARS;
    }
    this.moments = this.moments.filter((m) => this.t < m.t0 + m.life);
    const now = this.heardNow();
    if (this.holding && !Input.held(this.holding.source)) this.letGo();
    if (this.queued && now >= this.queued.when) {
      this.acting = this.queued;
      this.caption = this.queued;
      this.queued = null;
    }
    if (this.acting && now >= this.acting.when + this.acting.dur) this.acting = null;

    const { x, y } = Input.pointer;
    const inside = (b) => b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
    // A fader under the finger follows it until it lets go.
    if (this.dragging != null) {
      if (Input.held('pointer')) this.levelFromY(this.dragging, y);
      else this.dragging = null;
    }
    if (this.mixerOpen && this.dragging == null && this.t - this.iconsAt > MIXER_IDLE_S) this.mixerOpen = false;

    if (this.mixerOpen) {
      // THE MIXER PANEL owns the keys while it is open: left/right a fader, up/down its level.
      if (Input.pressed('right')) this.mixSel = (this.mixSel + 1) % PARTS.length;
      if (Input.pressed('left')) this.mixSel = (this.mixSel + PARTS.length - 1) % PARTS.length;
      if (Input.pressed('up')) this.setLevel(this.mixSel, this.levels[PARTS[this.mixSel].id] + 0.1);
      if (Input.pressed('down')) this.setLevel(this.mixSel, this.levels[PARTS[this.mixSel].id] - 0.1);
      if (Input.pressed('confirm') || Input.pressed('back')) this.openMixer(false);
      else if (Input.pressed('pointer')) {
        const k = this.boxes.faders.findIndex(inside);
        if (k >= 0) { this.dragging = k; this.mixSel = k; this.levelFromY(k, y); }
        else if (!inside(this.boxes.panel)) this.openMixer(false);   // a tap outside closes it
      }
      Input.endFrame();
      return;
    }

    const targets = HERO_MOVES.length + (this.onEdit ? 3 : 2);   // the heroes, the mixer, back, the pencil
    if (Input.pressed('right') || Input.pressed('down')) this.focus = (this.focus + 1) % targets;
    if (Input.pressed('left') || Input.pressed('up')) this.focus = (this.focus + targets - 1) % targets;
    const key = Input.pressed('confirm') ? 'confirm' : Input.pressed('jump') ? 'jump' : null;
    if (key) {
      if (this.focus < HERO_MOVES.length) this.pressHero(this.focus, key);
      else if (this.focus === HERO_MOVES.length) this.openMixer(true);
      else if (this.focus === HERO_MOVES.length + 2) this.edit();
      else this.back();
    }
    if (Input.pressed('pointer')) {
      const ball = this.boxes.ball;
      if (inside(this.boxes.back)) this.back();
      else if (inside(this.boxes.mixer)) this.openMixer(true);
      else if (inside(this.boxes.edit)) this.edit();
      else if (ball && Math.hypot(x - ball.x, y - ball.y) < ball.r * 1.6) this.showTitle();
      else {
        const h = this.boxes.heroes.findIndex(inside);
        if (h >= 0) { this.focus = h; this.pressHero(h, 'pointer'); }
      }
    }
    if (Input.pressed('back')) this.back();
    Input.endFrame();
  }

  // ------------------------------------------------------------------ drawing
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
    const rowGap = toonH * 2;
    // THE SPEAKERS: a giant stack each side — a sub cabinet with one big woofer under a top
    // cabinet of two mids and a horn. In landscape they stand fully on screen at the edges,
    // and the heroes dance BETWEEN them, so the woofers are seen (Peter, 3 Oct 2026); in
    // portrait the screen is too narrow for that, and they stand behind the front row.
    const rig = (() => {
      const w = portrait ? 88 * P : 54 * k270;
      const subH = portrait ? 150 * P : 84 * k270, topH = portrait ? 104 * P : 56 * k270;
      const xs = portrait ? [-w * 0.12, W - w * 0.88] : [4, W - 4 - w];
      return { w, subH, topH, floor: floorRef, top: floorRef - subH - topH, xs };
    })();
    // Where the heroes stand: the whole width, in front of the speakers, clear of the notch.
    const heroL = portrait ? sx : safeL + 4;
    const cellW = (portrait ? sw : W - heroL - safeR - 4) / perRow;

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
      const b = this.neon('OPEN LATE', portrait ? 13 * P : 8, '#36e6ff');
      ctx.globalAlpha = flick(0) * (0.85 + 0.15 * pulse);
      if (portrait) ctx.drawImage(a.img, sw / 2 - a.w / 2, stageTop + 44 * P - a.h / 2, a.w, a.h);
      else ctx.drawImage(a.img, safeL + 34, stageTop + 34 - a.h / 2, a.w, a.h);
      ctx.globalAlpha = flick(5);
      if (portrait) ctx.drawImage(b.img, sw - b.w - 8 * P, stageTop + 84 * P - b.h / 2, b.w, b.h);
      else ctx.drawImage(b.img, sw - safeR - b.w - 12, stageTop + 34 - b.h / 2, b.w, b.h);
      ctx.globalAlpha = 1;
    }

    // haze
    for (let i = 0; i < 7; i++) {
      const fa = hash(i, 31.7, 0);
      const r = (60 + 50 * ((fa * 5.1) % 1)) * u;
      const span = sw + 2 * r;
      const x = sx - r + (((fa * span) + t * (4 + i) * u) % span);
      const y = stageTop + (0.25 + 0.6 * ((fa * 3.7) % 1)) * (floorRef - stageTop);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(170,160,210,0.10)'); g.addColorStop(1, 'rgba(170,160,210,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }

    // beams from the par cans, swinging, flaring on the beat
    for (let i = 0; i < 4; i++) {
      const ox = sx + sw * CANS[i + 1];
      const ang = Math.sin(t * 0.5 + i * 2.1) * 0.45;
      const len = (floorRef - stageTop) * 1.15;
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
          const lg = ctx.createRadialGradient(x + size / 2, y + size / 2, 0, x + size / 2, y + size / 2, size * 0.65);
          lg.addColorStop(0, col); lg.addColorStop(1, col + '00');
          ctx.globalAlpha = (under ? 0.2 : 0.05) + 0.09 * pulse;
          ctx.fillStyle = lg; ctx.fillRect(x, y, size, size);
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
        const colour = acting ? accent : LASER[(Math.floor(barN / 4) + j) % 3];
        // the whole fan sweeps side to side, snapping a step on each beat
        const sweep = Math.sin(t * 1.3 + j * 2.1) * 0.55 + ((beatN % 4) - 1.5) * 0.08 * (j % 2 ? -1 : 1);
        ctx.strokeStyle = colour;
        for (let k = 0; k < 5; k++) {
          const ang = Math.PI / 2 + sweep + (k - 2) * 0.13;
          const len = (H - ey) * 1.6;
          const x2 = ex + Math.cos(ang) * len, y2 = ey + Math.sin(ang) * len;
          ctx.globalAlpha = 0.10 * fade; ctx.lineWidth = 3.5 * u;
          ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.globalAlpha = 0.75 * fade; ctx.lineWidth = 0.7 * u;
          ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(x2, y2); ctx.stroke();
        }
        ctx.globalAlpha = fade; ctx.fillStyle = colour;
        ctx.beginPath(); ctx.arc(ex, ey, 2 * u, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
    } else if (barN % 4 === 0) {
      const fade = Math.min(1, beatF + (beatN % 4) > 0 ? 1 : beatF * 8) * (0.55 + 0.45 * pulse);
      const ey = floorRef - 3 * u;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      // from the very edges of the screen (Peter, 3 Oct 2026)
      for (const [ex, dir] of [[sx, 1], [sx + sw, -1]]) {
        const colour = acting ? accent : LASER[(Math.floor(barN / 2) + (dir > 0 ? 0 : 1)) % 3];
        const snap = (beatN % 4) * 0.12;
        const sweep = Math.sin(t * 1.7 + (dir > 0 ? 0 : 1.3)) * 0.35;
        ctx.strokeStyle = colour;
        for (let k = 0; k < 6; k++) {
          const ang = -Math.PI / 2 + dir * (0.15 + k * 0.16 + snap + sweep * 0.8);
          const x2 = ex + Math.cos(ang) * sw * 1.3, y2 = ey + Math.sin(ang) * sw * 1.3;
          ctx.globalAlpha = 0.10 * fade; ctx.lineWidth = 3.5 * u;
          ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.globalAlpha = 0.75 * fade; ctx.lineWidth = 0.7 * u;
          ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(x2, y2); ctx.stroke();
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
      ctx.fillStyle = acting ? accent : DISCO[(i + beatN) % DISCO.length];
      ctx.beginPath(); ctx.ellipse(cx, cy + 3 * u, 2.6 * u, 1.3 * u, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    });

    this.drawBall(ctx, { portrait, P, u, t, sx, sw, sh, stageTop, pulse, accent, beatN });

    // In portrait the back row stands on a riser of its own.
    if (portrait) {
      const ry = floorRef - rowGap;
      ctx.fillStyle = 'rgba(11,11,20,0.55)';
      ctx.fillRect(sx, ry, sw, 10 * P);
      ctx.fillStyle = accent + '55';
      ctx.fillRect(sx, ry, sw, 1.5 * P);
    }

    this.drawMoments(ctx, 'back', { portrait, P, u, floorRef, toonH, stageTop, stageBot });
    // THE HEROES
    this.boxes.heroes = [];
    // Painted after the loop: the front row's reflections first, in one pass, then the heroes.
    const paints = [], mirrors = [];
    HERO_MOVES.forEach((m, i) => {
      // Holds on the left, one-shots on the right: in landscape that is the list in order;
      // in portrait each row takes two of each, the holds on its left.
      let r = 0, c = i;
      if (portrait) {
        const holds = HERO_MOVES.filter((h) => h.hold).length;
        const shot = i >= holds;
        const k = shot ? i - holds : i;
        r = Math.floor(k / 2);
        c = (shot ? perRow / 2 : 0) + (k % 2);
      }
      const cx = heroL + cellW * (c + 0.5);
      const floorY = portrait ? floorRef - (rows - 1 - r) * rowGap : floorRef;
      const box = { x: heroL + cellW * c + 2, y: floorY - toonH - 6, w: cellW - 4, h: toonH + 14, floorY };
      this.boxes.heroes.push(box);
      // THE WALK-IN: on the way in they walk on from the sides — the left half from the
      // left, the right half from the right, the middle ones first so nobody crosses — and
      // stand on their spot facing the middle of the floor.
      const half = perRow / 2;
      const fromLeft = c < half;
      const dir = fromLeft ? 1 : -1;
      const rank = fromLeft ? half - 1 - c : c - half;
      const startX = fromLeft ? -cellW * 0.6 : W + cellW * 0.6;
      const shown = this.shownAt == null ? 0 : t - this.shownAt;
      const walked = Math.max(0, shown - WALK_DELAY_S - rank * WALK_STAGGER_S - r * 0.12) * W * WALK_SPEED;
      const walking = walked < Math.abs(cx - startX);
      const hx = walking ? startX + dir * walked : cx;
      const isActing = this.acting?.i === i && !walking;
      const isQueued = this.queued?.i === i;
      const focused = this.focus === i && !Input.usingTouch && !walking;
      const ground = () => {
      if (isActing || isQueued) {
        const r0 = toonH * 0.75;
        const sp = ctx.createRadialGradient(hx, floorY - toonH * 0.45, 0, hx, floorY - toonH * 0.45, r0);
        sp.addColorStop(0, m.col + '88'); sp.addColorStop(0.6, m.col + '33'); sp.addColorStop(1, m.col + '00');
        ctx.globalAlpha = isActing ? 0.6 + 0.4 * pulse : 0.3 + 0.25 * Math.sin(t * 12);
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
      // dancing, once they have joined in — to the beat as heard
      const dancer = this.dancers[i];
      let dance = !walking && dancer.move ? heroDancePose(dancer.move, beat) : null;
      if (dance && dancer.skirted) dance = tameSkirt(dance, dancer.legs, beat);
      if (dance) pose = dance;
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
      const face = (ctx, fn) => {
        if (dir > 0) { fn(); return; }
        ctx.save(); ctx.translate(hx, 0); ctx.scale(-1, 1); ctx.translate(-hx, 0); fn(); ctx.restore();
      };
      // A dance sways the whole hero (shift, bounce, tilt round the feet), as the lab draws it.
      const body = (ctx, feetY) => {
        if (!dance || isActing) { drawToon(ctx, m.hero, pose, hx, feetY, toonH); return; }
        ctx.save();
        ctx.translate(hx + pose.shift * toonH, feetY - pose.bounce * toonH);
        ctx.rotate(pose.tilt);
        drawToon(ctx, m.hero, pose, 0, 0, toonH);
        ctx.restore();
      };
      // the front row is mirrored in the gloss
      if (floorY >= floorRef - 1) {
        mirrors.push({ draw: (c) => { try { face(c, () => body(c, floorY - lift)); } catch {} }, height: toonH, anchorX: hx, lift });
      }
      paints.push(() => {
        ground();
        try {
          face(ctx, () => body(ctx, floorY - lift));
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
      });
    });
    // THE REFLECTIONS: the food court's painter — mirrored round the soles, faded out down
    // the floor and laid once — rather than a flat squashed copy (Peter, 3 Oct 2026). Fainter
    // than the food court's, on a floor that is mostly dark gloss.
    const band = beginFloorReflectionBand(ctx, floorRef + REFLECT_SOLE_DROP * toonH / 46, { height: toonH, alpha: REFLECT_CLUB_ALPHA });
    if (band) {
      for (const sub of mirrors) addFloorReflection(band, sub);
      endFloorReflectionBand(band);
    }
    for (const paint of paints) paint();

    this.drawMoments(ctx, 'front', { portrait, P, u, floorRef, toonH, stageTop, stageBot, beat });
    // the move just made, and whose it was
    let capSince = this.caption ? (this.heardNow() - this.caption.when) / (this.caption.bar / 4) : Infinity;
    // a held move's caption stays up while it is held
    if (this.caption && this.holding?.i === this.caption.i) capSince = Math.min(capSince, 1);
    if (capSince < 4) {
      const m = HERO_MOVES[this.caption.i];
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
    for (const m of this.moments) {
      const k = this.t - m.t0;
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
        // across in BALL_BEATS beats, bouncing off the heroes' heads on every beat
        const beatS = this.barSeconds() / 4;
        const p = k / (BALL_BEATS * beatS);
        const r = toonH * 0.2;
        const x0 = m.dir > 0 ? -r : W + r;
        const x = x0 + m.dir * (W + 2 * r) * p;
        const bf = ((beat % 1) + 1) % 1;
        const headY = floorRef - toonH * 1.05 - r;
        const y = headY - Math.sin(Math.PI * bf) * toonH * 0.9;
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath(); ctx.ellipse(x, floorRef + 2 * u, r * (0.7 + 0.3 * (1 - Math.sin(Math.PI * bf))), r * 0.18, 0, 0, Math.PI * 2); ctx.fill();
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(m.dir * (x - x0) / r);
        const cols = ['#ff3355', '#ffffff', '#ffd23f', '#ffffff', '#3fb8ff', '#ffffff'];
        cols.forEach((c, i) => {
          ctx.fillStyle = c;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, i * Math.PI / 3, (i + 1) * Math.PI / 3); ctx.closePath(); ctx.fill();
        });
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2); ctx.fill();
        const sh = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
        sh.addColorStop(0, 'rgba(255,255,255,0.45)'); sh.addColorStop(1, 'rgba(0,0,0,0.25)');
        ctx.fillStyle = sh;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
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

  drawBall(ctx, { portrait, P, u, t, sx, sw, sh, stageTop, pulse, accent, beatN }) {
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
    const by = mountY - br * 2 + (hang + br * 2) * ease + settle * (portrait ? 8 * P : 4);
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
        if (k % 7 === 0) {
          ctx.globalAlpha = shine * 0.08 * tw;
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
    ctx.fillStyle = '#1c1a26';
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.clip();
    const TINTS = ['#ff4fa3', '#3fb8ff', '#ffd23f', accent];
    const BANDS = 18, LONS = 34;
    for (let i = 0; i < BANDS; i++) {
      const lat = -Math.PI / 2 + (i + 0.5) * Math.PI / BANDS;
      const ry = by + br * Math.sin(lat);
      const ringR = br * Math.cos(lat);
      const tileH = br * Math.PI / BANDS * 0.8;
      const n = Math.max(6, Math.round(LONS * Math.cos(lat)));
      for (let j = 0; j < n; j++) {
        const lon = (j + (i % 2) * 0.5) / n * Math.PI * 2 + rot;
        const facing = Math.cos(lon);
        if (facing <= 0.02) continue;
        const tx = bx + ringR * Math.sin(lon);
        const tileW = ringR * (Math.PI * 2 / n) * facing * 0.8;
        const hr = hash(i, j, 3);
        const light = facing * Math.max(0.15, Math.cos(lat + 0.55));
        const flash = Math.pow(Math.max(0, Math.cos(lon - 0.55)), 14) * Math.max(0, Math.cos(lat + 0.45));
        const floorSide = Math.sin(lat) > 0.25 && hr < 0.32 + 0.25 * pulse;
        let fill;
        if (flash > 0.35) fill = '#ffffff';
        else if (floorSide) fill = DISCO[(i * 3 + j + beatN) % DISCO.length];
        else if (hr < 0.13 && light > 0.3) fill = TINTS[(i + j) % TINTS.length];
        else {
          const c = Math.round(80 + 175 * Math.min(1, 0.18 + 0.75 * light + 0.12 * hr));
          fill = `rgb(${c},${c},${Math.min(255, c + 18)})`;
        }
        ctx.globalAlpha = (hr < 0.13 || floorSide) && flash <= 0.35 ? 0.82 : 1;
        ctx.fillStyle = fill;
        ctx.fillRect(tx - tileW / 2, ry - tileH / 2, tileW, tileH);
        if (light > 0.25) {
          ctx.globalAlpha = 0.35 * light;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(tx - tileW / 2, ry - tileH / 2, tileW, Math.max(0.4, tileH * 0.16));
        }
      }
    }
    ctx.globalAlpha = 1;
    const shade = ctx.createRadialGradient(bx - br * 0.4, by - br * 0.45, br * 0.05, bx, by, br * 1.05);
    shade.addColorStop(0, 'rgba(255,255,255,0.55)'); shade.addColorStop(0.18, 'rgba(255,255,255,0.08)');
    shade.addColorStop(0.7, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = shade;
    ctx.fillRect(bx - br, by - br, br * 2, br * 2);
    ctx.restore();
    ctx.fillStyle = '#5a5670';
    ctx.fillRect(bx - u, by + br - 0.5 * u, 2 * u, 2.5 * u);
    ctx.strokeStyle = accent; ctx.globalAlpha = 0.55 + 0.3 * pulse; ctx.lineWidth = u;
    ctx.beginPath(); ctx.arc(bx, by, br - 0.5 * u, 0.1, 1.5); ctx.stroke();
    ctx.globalAlpha = 1;
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
    // used, then faint — that opens a panel of faders, one a part.
    const awake = t - this.iconsAt;
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
    this.boxes.faders = [];
    this.boxes.panel = null;
    if (this.mixerOpen) {
      const pw = portrait ? W * 0.84 : L(156), ph = portrait ? 196 * P : Math.min(L(98), my - r - 6 - stageTop - 8);
      const px = portrait ? (W - pw) / 2 : W - safeR - 10 - pw;
      const py = (portrait ? my - r - 16 * P : my - r - 6) - ph;
      this.boxes.panel = { x: px, y: py, w: pw, h: ph };
      ctx.fillStyle = 'rgba(11,11,20,0.9)';
      rr(ctx, px, py, pw, ph, portrait ? 16 * P : L(7)); ctx.fill();
      ctx.strokeStyle = 'rgba(240,192,64,0.45)'; ctx.lineWidth = 0.8 * u; ctx.stroke();
      const pad = portrait ? 12 * P : L(6);
      const cw = (pw - pad * 2) / PARTS.length;
      const iconY = py + (portrait ? 26 * P : L(11));
      const top = py + (portrait ? 52 * P : L(22)), bot = py + ph - (portrait ? 34 * P : L(15));
      const labelY = py + ph - (portrait ? 13 * P : L(5));
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
    const lines = ['NOW PLAYING', bangerTitle(this.rec), 'TAP A HERO: THEY DO THEIR MOVE ON THE NEXT BEAT',
      'THE MIXER, BOTTOM RIGHT, SETS EACH PART\'S LEVEL'];
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
