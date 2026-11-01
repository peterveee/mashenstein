// The CORPORATE KOMBAT music video: the Lab's club and full-frame hero dances, cut on the
// song's bar lines. A YouTube teaser, so the office cabinet itself never appears, and neither
// does any interface: no buttons, captions, cards or menus.
//
//   MASH_DEV_URL=http://localhost:8001 node tools/render-music-video.js            everything
//   ... --probe          one frame a bar of the club take, half size, as a contact sheet
//   ... --probe=50.5 --full   those bars as full 4K stills in probe-full/ (the thumbnail's source)
//   ... --club           recapture the club take only
//   ... --dances         re-render the full-frame dances only
//   ... --slogans        re-render the words layer (and the end card) only
//   ... --assemble       cut what is on disk into the export
//
//   ... --song           re-render song.wav from office.js as the game plays it
//   ... --bars=9-25      only those bars: club-9-25.mp4 and corporate-kombat-mv-bars-9-25.mp4, a proof
//
// Everything lands in work/video/corporate-kombat-mv/. The song is rendered with office.js's
// own ARRANGEMENT (its bar order, mutes, transposes and master automation): render-track.js
// bounces the composed bank, which is an older form of the song, not the one the game plays.
//
// ONE CLOCK. Every source is rendered on the song's own timeline — frame g is song time
// g/60 — so the edit is only a choice of source per bar range, and nothing can drift.
//
// HOW THE CLUB IS FILMED. The real game, in the Lab, with office.js handed to the club as a
// pending song (its loop taken off so it runs to the outro). The render loop is paused and
// stepped at 60 Hz, as tools/render-feature-reel.js does. The club times everything off the
// AUDIO clock, so the page's AudioContext is suspended and its currentTime replaced by a
// clock that moves 1/60 s a frame; the heard latency is zero, and Audio.musicAnalysis()
// (the LED equaliser) reads the rendered song through tools/lib/song-analysis.js. Math.random
// is seeded, so a take repeats exactly. The heroes' moves are fired from CUES on exact
// frames. Moves that change the song's TIME (Ramon, Kiko, Fernwick, Rusty) are never used:
// the audio is the clean render, so they would put the picture off the music.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { analyseSong } from './lib/song-analysis.js';
import { renderBankBrowser } from './lib/render-bank-browser.js';
import { wavBuffer, dbfs } from './lib/wav.js';
import { bundleEntry, openArtPage } from './lib/art-page.js';
import { SR } from './lib/wav.js';
import * as office from '../src/data/songs/office.js';

const ROOT = resolve(import.meta.dirname, '..');
const DIR = join(ROOT, 'work/video/corporate-kombat-mv');
const SONG_WAV = join(DIR, 'song.wav');
const BASE = process.env.MASH_DEV_URL || 'http://localhost:8001';
const FPS = 60;
const BPM = office.bank.bpm;            // 118
const BAR = 240 / BPM;                  // 2.034 s
const W = 1920, H = 1080;               // the export
const SW = 3840, SH = 2160;             // the club's capture: 480x270 logical at x8
const SEED = 0x6b0b7a;
// HOW THIN THE HEROES' INK IS IN A CLOSE-UP. The rig thins its contour as the camera pushes in
// (toons.js CONTOUR taper), but it only knows about the GAME's camera: a crop of the 4K frame, or
// a dance drawn full frame, is a push-in it cannot see, so it inks the hero as if at room size and
// the line comes out a thick, soft band (Peter, 28 Oct 2026). So each close-up pins the ink scale
// (setInkScale) to its push-in times this. 1 would be the game's own rule; more is finer.
const INK_FINE = 4;
mkdirSync(DIR, { recursive: true });

/** The frame bar `b` (1-based) starts on. */
const F = (b) => Math.round((b - 1) * BAR * FPS);

// The whole song: the club to the top of bar 59, then the end card over the last two bars
// and the song's ring-out. END is the last frame + 1.
const PART = process.argv.find((a) => a.startsWith('--bars='))?.slice(7).split('-').map(Number);
const RANGE = PART ? { from: PART[0], to: PART[1] } : { from: 1, to: 59 };
const CLUB_MP4 = join(DIR, PART ? `club-${PART[0]}-${PART[1]}.mp4` : 'club.mp4');
const END = F(61) + 2 * FPS;

// Hero indices are club-fx.js HERO_MOVES' order.
const HERO = { lorenzo: 0, b33p: 1, ramon: 2, grumpos: 3, kiko: 4, clara: 5, fernwick: 6, rusty: 7 };

// THE CUE SHEET: what is done to the room, and on which bar (1-based, fractions allowed).
//   sky   — lasers from the truss: `kinds`, two patterns of two bars each. Named rather than left to
//           the club's own pick so that all five (club.js LASER_PATTERNS) are seen, each one first
//           in a tap, which is the half that lands in a wide shot
//   bolt  — THE BOLT's strike without its remix: the mirror ball spins up inside its plasma globe
//           and bursts, arcs out to the room, on the last beat before the next bar line at least
//           2 s off (club.js strikePlan) — the song is not touched
//   can   — a par can tapped: every light on the rig goes crazy and chases, the room in its colour,
//           for 2 bars (club.js tapCan). Each one opens on a shot with the rig in it
//   hold  — a hero held down until `until`
//   tap   — a hero tapped (B-33P: the room onto its CRT, and off again)
//   led   — a line on the LED board
//   dolores — Dolores (a `cleaner` moment, sweeping) tapped: she throws the broom and dances where
//           she stands for 4 bars, then legs it (club.js tapDolores). The club never sends a cleaner
//           of its own here: one came on after the bar 17 confetti and swept through the flood
//   turbo — THE TURBO HOOVER: the vacuum (a `vacuum` moment, crossing the floor) tapped, so it tears
//           off, sucking up the confetti, and blows up on the first beat at least 3 off (club.js
//           tapVacuum) in a KABOOM and a fountain of everything it swallowed
//   moment — a crowd moment (confetti, streamers, sticks, toaster, smoke, ball, moonwalk, spotlight…)
const CUES = [
  { bar: 5, do: 'sky', kinds: ['floor', 'ceiling'] },
  { bar: 7, do: 'can', k: 0 },
  { bar: 9, do: 'led', text: 'CORPORATE KOMBAT' },
  { bar: 9, do: 'sky', kinds: ['sheet', 'scissors'] },
  { bar: 9, do: 'moment', kind: 'moonwalk' },   // THE GROUP MOONWALK: Lorenzo, Rusty, B-33P, 4 bars
  { bar: 13, do: 'can', k: 1 },
  { bar: 15, do: 'hold', hero: 'grumpos', until: 17 },
  { bar: 17, do: 'moment', kind: 'confetti', options: { streamers: true } },
  { bar: 21, do: 'hold', hero: 'lorenzo', until: 25 },
  { bar: 25, do: 'can', k: 4 },
  { bar: 28.75, do: 'tap', hero: 'b33p' },
  { bar: 32.75, do: 'tap', hero: 'b33p' },
  { bar: 33, do: 'sky', kinds: ['tunnel', 'sheet'] },
  { bar: 33, do: 'can', k: 5 },   // for the ball on black: its spots thrown in the chase's colours
  { bar: 37, do: 'moment', kind: 'smoke' },
  { bar: 39.75, do: 'bolt' },   // bursts on bar 40, beat 4
  // A SQUADRON OF FLYING TOASTERS (Peter, 28 Oct 2026: "multiple toasters flying overhead"): five,
  // half a beat apart, all one way, at heights spread through the sky (fractions of it, top to heads)
  ...[0.1, 0.6, 0.3, 0.8, 0.45].map((y, k) => ({ bar: 41 + k / 8, do: 'toaster', y, dir: 1 })),
  { bar: 45, do: 'moment', kind: 'sticks' },
  { bar: 45, do: 'can', k: 2 },
  { bar: 49, do: 'moment', kind: 'moonwalk' },
  { bar: 49, do: 'sky', kinds: ['scissors', 'floor'] },
  { bar: 51, do: 'can', k: 3 },
  { bar: 53, do: 'moment', kind: 'confetti', options: { streamers: true } },
  { bar: 53, do: 'sky', kinds: ['ceiling', 'tunnel'] },
  { bar: 53, do: 'moment', kind: 'vacuum' },
  { bar: 54.25, do: 'turbo' },   // blows up on the top of bar 55
  { bar: 56, do: 'moment', kind: 'cleaner' },   // Dolores, in to sweep up the KABOOM
  { bar: 57, do: 'dolores' },
  { bar: 58, do: 'led', text: 'OUT OF OFFICE' },
];

// The song's sections, for the club's own crowd moments (club.js MOMENT_FOR) — office.js
// does not carry a form. Bars as the remix headers map them.
const FORM = [
  { role: 'intro', type: 'intro', from: 1, to: 4 },
  { role: 'build', type: 'build', from: 5, to: 8 },
  { role: 'groove', type: 'groove', from: 9, to: 16 },
  { role: 'drop', type: 'drop', from: 17, to: 24 },
  { role: 'verse', type: 'verse', from: 25, to: 32 },
  { role: 'breakdown', type: 'breakdown', from: 33, to: 40 },
  { role: 'drop2', type: 'drop', from: 41, to: 48 },
  { role: 'drop3', type: 'drop', from: 49, to: 56 },
  { role: 'outro', type: 'outro', from: 57, to: 60 },
];

// THE EDIT, in bars [from, to). `club` is a camera on the 4K take: `zoom` (1 the whole room, 2 a
// native 1920 crop; [a, b] moves from a to b over the shot) on a hero, or on a point `at` in 4K px
// (the middle of the room if neither), panning to `to` if given. `crash` slams the shot in from
// half as close again. `black` is the mirror ball alone on black. A `dance` dances in front of an
// office `set` — one of the CORPORATE KOMBAT backdrop styles the bake-off did not pick (Peter, 28 Oct
// 2026: "seems like a waste to never show them"), never the shipped Ligne '89 lit, and no lane. `toHero` pans from `hero` to them; `follow: 'vacuum'` / 'dolores' rides with them. `dance` is a full-frame hero dance on black. No visualisers: tried in the
// first cut and dropped (Peter, 27 Oct 2026). Every shot moves, and the cutting is quick (Peter,
// 28 Oct: "a lot of static shots", "a little more hectic to match the music").
const CENTRE = [SW / 2, SH / 2];
const BALL = [1920, 440];                           // the mirror ball
const LED = [2980, 420];                            // the LED board
const RIG_L = [1100, 700], RIG_R = [2800, 700];     // the truss and its cans, with the heads under
const ROW_L = [760, 1450], ROW_R = [3080, 1450];   // the heroes' line, end to end
const C = (from, to, frame) => ({ from, to, src: 'club', frame });
const D = (from, hero, move, set) => ({ from, to: from + 1, src: 'dance', hero, move, set });
const EDIT = [
  // LOBBY MUZAK: the gang walks in; the ball comes down. Slow: the band is still filtered
  C(1, 3, { zoom: [1, 1.3], at: CENTRE, to: [1920, 800] }),
  C(3, 5, { zoom: [4.2, 4.6], follow: 'ball' }),
  // BAND RE-ENTRY: the lasers
  C(5, 6, { zoom: [1, 1.1], crash: true }),
  // the sign, then the board: a cut, not a pan, so neither is ever half in (Peter, 28 Oct 2026)
  C(6, 6.5, { zoom: [2.2, 2.4], at: [860, 300] }),
  C(6.5, 7, { zoom: [2.4, 2.2], at: [2980, 300] }),
  C(7, 8, { zoom: [1.35, 1.15], at: RIG_L, to: RIG_R }),   // the first light chase
  C(8, 8.5, { hero: 'fernwick', zoom: 2.2, crash: true }),
  C(8.5, 9, { zoom: 1.6, at: ROW_L, to: ROW_R }),
  // GROOVE: the first group moonwalk
  C(9, 10, { zoom: [1, 1.15], crash: true }),
  C(10, 11, { hero: 'lorenzo', toHero: 'rusty', zoom: 1.9 }),
  C(11, 11.5, { zoom: 2.2, at: [2700, 420], crash: true, boards: true }),      // CORPORATE KOMBAT on the board
  C(11.5, 12, { hero: 'b33p', zoom: 2.2, crash: true }),
  C(12, 13, { zoom: [1.5, 1.2], at: [1920, 1350] }),
  C(13, 14, { zoom: [1.4, 1.05], at: [1300, 1150], to: CENTRE }),
  C(14, 15, { hero: 'lorenzo', zoom: [2.3, 2] }),
  C(15, 16, { hero: 'grumpos', zoom: [2, 2.4] }),
  C(16, 17, { zoom: [1.05, 1.3] }),
  // A: the confetti
  C(17, 17.5, { zoom: 1, crash: true }),
  C(17.5, 18, { zoom: [4.2, 4.5], follow: 'ball' }),
  C(18, 18.5, { hero: 'kiko', zoom: 2.2, crash: true }),
  C(18.5, 19, { hero: 'b33p', zoom: 2.2, crash: true }),
  D(19, 'b33p', 'servo-pivot', { style: 'vapor', floor: 'lobby', camX: 300 }),
  D(20, 'rusty', 'paws-up', { style: 'crayon', floor: 'open', camX: 300 }),
  C(21, 22, { zoom: [1, 1.2], crash: true }),   // the flood
  C(22, 22.5, { hero: 'fernwick', zoom: 2.2 }),
  C(22.5, 23, { hero: 'clara', zoom: 2.2 }),
  C(23, 24, { hero: 'lorenzo', zoom: [2, 2.5] }),
  C(24, 25, { zoom: 1.7, at: [ROW_R[0], 1550], to: [ROW_L[0], 1550] }),   // along the water
  // A2: the water drains; B-33P puts the room on its CRT
  C(25, 26, { zoom: [1.25, 1], crash: true }),
  C(26, 27, { zoom: [1.05, 1.15] }),   // EGGSHELL flies through
  C(27, 29, { hero: 'b33p', zoom: [2, 2.5] }),
  C(29, 30, { zoom: [1, 1.25] }),
  C(30, 30.5, { hero: 'ramon', zoom: 2.2, crash: true }),
  C(30.5, 31, { hero: 'grumpos', zoom: 2.2, crash: true }),
  D(31, 'clara', 'rope-swing', { style: 'cutaway', floor: 'open', camX: 300 }),
  D(32, 'ramon', 'orbit-uppercut', { style: 'deco88', floor: 'exec', camX: 300 }),
  // B: the minor turn, so longer drifting moves. The ball on black, its spots chasing round in
  // the rig's colours, then the room around it
  C(33, 34, { black: true, zoom: [1.5, 1.3], at: [1920, 640] }),
  C(34, 35, { zoom: [4.2, 1.5], at: BALL, to: [1920, 1300] }),
  C(35, 36, { hero: 'ramon', zoom: [2.4, 2] }),
  C(36, 37, { zoom: 1.6, at: ROW_R, to: ROW_L }),
  C(37, 38, { zoom: [1, 1.15], crash: true }),   // the smoke
  C(38, 38.5, { hero: 'lorenzo', zoom: 2.2 }),
  C(38.5, 39, { hero: 'fernwick', zoom: 2.2 }),
  D(39, 'kiko', 'siren-sweep', { style: 'gouache88', floor: 'exec', camX: 300 }),
  // THE BOLT: pushing in on the ball as it spins up in its globe, then the room as it bursts
  C(40, 40.75, { zoom: [4.2, 4.8], follow: 'ball' }),
  C(40.75, 41.5, { zoom: [1.3, 1] }),
  // A3: the toaster, the glow sticks
  C(41.5, 42, { hero: 'kiko', zoom: 2.2, crash: true }),
  C(42, 43, { zoom: [1.3, 1.4], at: [1500, 1100], to: [2300, 1100] }),   // the toasters overhead
  C(43, 44, { hero: 'rusty', zoom: [2, 2.4] }),
  C(44, 44.5, { hero: 'b33p', zoom: 2.2, crash: true }),
  C(44.5, 45, { hero: 'grumpos', zoom: 2.2, crash: true }),
  C(45, 46, { zoom: [1, 1.15], crash: true }),
  C(46, 46.5, { hero: 'clara', zoom: 2.2, crash: true }),
  C(46.5, 47, { hero: 'fernwick', zoom: 2.2, crash: true }),
  D(47, 'fernwick', 'leaf-fan', { style: 'mcm', floor: 'open', camX: 300 }),
  C(48, 49, { zoom: [1, 1.3] }),
  // CLIMAX: the group moonwalk, the confetti
  C(49, 50, { zoom: [1, 1.15], crash: true }),
  C(50, 51, { hero: 'lorenzo', toHero: 'b33p', zoom: 1.7 }),   // along the moonwalkers
  C(51, 52, { zoom: [1.1, 1.35], at: RIG_R, to: RIG_L }),   // the light chase over the moonwalk
  C(52, 52.5, { hero: 'rusty', zoom: 2.2, crash: true }),
  C(52.5, 53, { hero: 'b33p', zoom: 2.2, crash: true }),
  // THE TURBO HOOVER: in after the confetti, tapped, tearing off, KABOOM on 55
  C(53, 54, { zoom: [1, 1.2], crash: true }),
  C(54, 55, { follow: 'vacuum', zoom: [2, 1.6] }),
  C(55, 56, { zoom: [1.15, 1] }),
  C(56, 56.5, { zoom: 2.2, at: LED, crash: true, boards: true }),   // KABOOM! on the board
  C(56.5, 57, { zoom: [1.4, 1.1], at: [1920, 900] }),
  // OUTRO: Dolores downs her broom and dances; OUT OF OFFICE on the board, then the end card
  // (the slogan layer) over black
  C(57, 58, { follow: 'dolores', zoom: [2, 2.3] }),
  C(58, 58.5, { zoom: [1.8, 1.6], at: LED }),
  C(58.5, 59, { zoom: [1.15, 1] }),
  { from: 59, to: null, src: 'black' },
];

// THE BEAT ON THE CAMERA, from bar `from`: every shot (club and dance) kicks in by `bar` on the
// downbeat of every `every`th bar, and settles. Never more than one a bar (Peter, 28 Oct 2026: a kick
// on every beat was "too much"); none in the filtered intro, the minor turn or the outro.
const PUNCH = [
  { from: 1, bar: 0 },
  { from: 5, bar: 0.03, every: 2 },
  { from: 17, bar: 0.045, every: 1 },
  { from: 25, bar: 0.03, every: 2 },
  { from: 33, bar: 0 },
  { from: 41, bar: 0.045, every: 1 },
  { from: 57, bar: 0 },
];
// Camera shake where the song hits, `amp` a fraction of the frame, dying away over a second.
// Toned down (Peter, 29 Oct 2026: "tone down a little of the jittery camera effects"): about
// 60% of the first cut's size, and swaying at 60% of its rate, so it rocks rather than buzzes.
const SHAKES = [{ bar: 17, amp: 0.015 }, { bar: 40.75, amp: 0.025 }, { bar: 49, amp: 0.018 }, { bar: 53, amp: 0.018 }, { bar: 55, amp: 0.03 }];
// A white flash over everything as a section lands (THE BOLT brings its own).
const FLASHES = [{ bar: 5, a: 0.8 }, { bar: 9, a: 0.5 }, { bar: 17, a: 0.9 }, { bar: 25, a: 0.5 },
  { bar: 41, a: 0.6 }, { bar: 49, a: 0.9 }, { bar: 53, a: 0.7 }, { bar: 55, a: 1 }];
const CRASH = 10;   // frames a crash-in takes to land
// EGGSHELL FLIES THROUGH (Peter, 28 Oct 2026): the villain in his copter, drawn into the club's own
// frame (so every camera move and crop carries him), across the room over the heads from `from` to
// `to` (4K px) between bars `bar` and `to` bars, banked into the way he is going. `size` is his box.
const FLYBYS = [{ bar: 26, until: 27, from: [-500, 680], to: [4340, 500], size: 600 }];
function flybyAt(g) {
  for (const fb of FLYBYS) {
    const a = F(fb.bar), b = F(fb.until);
    if (g < a || g >= b) continue;
    const k = (g - a) / (b - a);
    return { x: fb.from[0] + (fb.to[0] - fb.from[0]) * k, y: fb.from[1] + (fb.to[1] - fb.from[1]) * k + Math.sin(g * 0.21) * 18,
      size: fb.size, tilt: Math.sign(fb.to[0] - fb.from[0]) * 0.16, rotor: g >> 1 };
  }
  return null;
}

function punchAt(g) {
  // F() rounds a bar line to the nearest frame, so it can land half a frame early
  const bar = g / FPS / BAR + 1, n = Math.floor(bar + 0.5 / (BAR * FPS));
  const p = PUNCH.findLast((x) => n >= x.from);
  if (!p.bar || (n - p.from) % p.every) return 1;
  return 1 + p.bar * Math.exp(-Math.max(0, bar - n) * BAR / 0.12);   // seconds since the downbeat
}
function shakeAt(g) {
  let amp = 0;
  for (const s of SHAKES) {
    const age = (g - F(s.bar)) / FPS;
    if (age >= 0 && age < 1.5) amp = Math.max(amp, s.amp * Math.exp(-age / 0.35));
  }
  return { amp, dx: amp * SW / 2 * (0.6 * Math.sin(g * 0.55) + 0.4 * Math.sin(g * 1.05 + 2)),
    dy: amp * SH / 2 * (0.6 * Math.sin(g * 0.8 + 1) + 0.4 * Math.sin(g * 1.3)) };
}
function flashAt(g) {
  let a = 0;
  for (const f of FLASHES) { const age = g - F(f.bar); if (age >= 0 && age < 10) a = Math.max(a, f.a * (1 - age / 10) ** 2); }
  return a;
}

// THE SLOGANS: full-screen phrases in the game's title face, slammed in on the beat — office
// talk over a club night. Each is shown whole (in as many lines as set it biggest) from `at` beats
// into its bar for `beats` beats (Peter, 28 Oct: one phrase split across screens was hard to read),
// drifting — a very slow push and turn. Only the big moments (`tilt`) snap over to a new angle,
// once, halfway (Peter, 28 Oct 2026: "only once in a while for big moments"). `card` puts it on a
// solid colour, full frame, instead of over the picture. `small` sets it low and smaller, over a
// hero's solo dance, after a beat of them on their own.
const SLOGANS = [
  { bar: 1, text: 'YOUR CALL IS IMPORTANT TO US', beats: 8 },
  { bar: 3, text: 'PLEASE HOLD', beats: 4 },
  { bar: 4, at: 2, text: 'CORPORATE KOMBAT', beats: 2, card: '#ff4fa3' },
  { bar: 9, text: 'CLOCK IN', beats: 2 },
  { bar: 13, text: 'GREEN LIGHT', beats: 3 },
  { bar: 15, text: "LET'S CIRCLE BACK", beats: 4 },
  { bar: 16, at: 2, text: 'SYNERGY!', beats: 2, card: '#ffcf33', tilt: true },
  { bar: 19, at: 1.5, text: 'PERFORMANCE REVIEW', beats: 2.5, small: true },
  { bar: 20, at: 1.5, text: 'EMPLOYEE OF THE MONTH', beats: 2.5, small: true },
  { bar: 21, text: 'DEEP DIVE', beats: 4 },
  { bar: 27, text: 'HOSTILE TAKEOVER', beats: 3, tilt: true },
  { bar: 29, text: 'TURN IT OFF AND ON AGAIN', beats: 6 },
  { bar: 34, text: 'MANDATORY FUN', beats: 4 },
  { bar: 37, text: 'FIRE DRILL!', beats: 3 },
  { bar: 41, text: 'HOT DESKING', beats: 3 },
  { bar: 45, text: 'TEAM BUILDING', beats: 4 },
  { bar: 48, at: 2, text: 'OVERTIME!', beats: 2, card: '#48e0c8', tilt: true },
  { bar: 49, text: 'MOVING FORWARD', beats: 3 },
  { bar: 53, text: 'RAISE THE ROOF', beats: 4 },
  { bar: 58, text: "LET'S TAKE THIS OFFLINE", beats: 2 },
  { bar: 58, at: 2, text: 'OUT OF OFFICE', beats: 2, card: '#ff4fa3' },
];
// ...and the end card, from the top of bar 59: Gary at his switch, thrown on beat 3 to put the
// marquee on, the song a beat later, COMING SOON on bar 60; then all of it fades out over
// `fadeOut` s to `black` s of true black at the very end.
const END_CARD = { from: 59, thrown: 59.5, title: 59.75, soon: 60, fadeOut: 0.8, black: 0.25 };

const arg = (k) => process.argv.includes(k);
function command(bin, args) {
  const r = spawnSync(bin, args, { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${bin} exited ${r.status}`);
}
function x264(out, extra = []) {
  return spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', 'pipe:0',
    ...extra, '-vf', 'setsar=1', '-c:v', 'libx264', '-preset', 'medium', '-tune', 'animation', '-crf', '12',
    '-pix_fmt', 'yuv420p', out], { cwd: ROOT, stdio: ['pipe', 'inherit', 'inherit'] });
}

function decodeMono(path) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', path, '-ac', '1', '-ar', String(SR), '-f', 'f32le', 'pipe:1'],
    { maxBuffer: 200 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`ffmpeg could not decode ${path}`);
  return new Float32Array(r.stdout.buffer.slice(r.stdout.byteOffset, r.stdout.byteOffset + r.stdout.byteLength));
}

// ---------------------------------------------------------------- the club

// Before any of the game's code: a seeded Math.random, no sound out of the page, and the
// realtime AudioContext's clock replaced by window.__mvClock once that is set.
const INIT = (seed) => {
  let s = seed >>> 0;
  Math.random = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const d = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, 'currentTime');
  Object.defineProperty(BaseAudioContext.prototype, 'currentTime', {
    configurable: true,
    get() { return window.__mvClock != null && this instanceof AudioContext ? window.__mvClock : d.get.call(this); },
  });
  const connect = AudioNode.prototype.connect;
  const sinks = new WeakMap();
  AudioNode.prototype.connect = function (dest, ...rest) {
    if (dest instanceof AudioDestinationNode) {
      let g = sinks.get(dest.context);
      if (!g) { g = dest.context.createGain(); g.gain.value = 0; connect.call(g, dest); sinks.set(dest.context, g); }
      return connect.call(this, g, ...rest);
    }
    return connect.call(this, dest, ...rest);
  };
};

// The game's own bundle, built here rather than taken from the dev server, so the page can reach
// the rig's ink dial: the same entry and the same Lab calibration split as build/build.js, plus
// one line that hands setInkScale to the window.
let gameJs = null;
async function gameBundle() {
  if (gameJs) return gameJs;
  const { default: esbuild } = await import('esbuild');
  const out = await esbuild.build({
    stdin: {
      contents: `import './src/main.js';
import { setInkScale } from './src/sprites/toons.js';
import { eggshellCopterArt } from './src/sprites/props.js';
window.__mvInk = setInkScale;
window.__mvEgg = eggshellCopterArt;`,
      resolveDir: ROOT, loader: 'js',
    },
    bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'error',
    plugins: [{
      name: 'banger-calibration-split',
      setup(b) {
        b.onResolve({ filter: /calibration-data\.js$/ }, (args) => (
          args.importer.endsWith('/banger/lazy.js') ? undefined
            : { path: join(ROOT, 'src/game/banger/calibration-shim.js') }));
      },
    }],
  });
  gameJs = `window.__MASH_BUILD__="music video";${out.outputFiles[0].text}`;
  return gameJs;
}

async function openClub(browser, scale, frames) {
  const page = await browser.newPage({ viewport: { width: SW * scale, height: SH * scale } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(INIT, SEED);
  const body = await gameBundle();
  await page.route(/\/game\.js(\?|$)/, (route) => route.fulfill({ contentType: 'text/javascript', body }));
  await page.goto(`${BASE}/?mute&density=${8 * scale}&goto=lab`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => window.__mash_booted && window.__mash_render_loop && window.__mvInk
    && /SoundTestState$/.test(window.__mash_cur?.constructor?.name || ''), null, { timeout: 120000 });

  // The song's analysis, one reading a frame, for the LED equaliser.
  const mono = decodeMono(SONG_WAV);
  const an = analyseSong(mono, BPM, [], { fps: FPS, frames, sampleRate: SR, spectrumBytes: true });
  const bins = an[0].spectrum.length;
  const spec = new Uint8Array(frames * bins);
  an.forEach((a, i) => spec.set(a.spectrum, i * bins));
  const bands = an.map((a) => [a.bass, a.mid, a.treble, a.level, a.dynamics]);

  const song = {
    bank: office.bank, mix: { ...office.mix, ceiling: true },
    arrangement: { ...office.arrangement, loop: undefined },
    bpm: BPM, form: FORM,
  };
  await page.evaluate(({ songJson, spec64, bins, bands }) => {
    const loop = window.__mash_render_loop;
    loop.pause();
    // the page's lifecycle (lifecycle.js sync) resumes the loop on a state change; it stays paused
    loop.resume = () => {};
    const A = window.__mash_audio;
    window.__mvClock = A.ctx.currentTime;
    A.ctx.suspend?.();
    if (window.__mash_dev) { window.__mash_dev.draw = () => {}; window.__mash_dev.hideSpecialOrb = true; }
    const raw = atob(spec64);
    const spec = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) spec[i] = raw.charCodeAt(i);
    const R = window.__mv = { frame: -1, spec, bins, bands, holdUntil: -1, missed: [] };
    A.heardLatencySec = () => 0;
    A.musicAnalysis = () => {
      const g = Math.max(0, Math.min(bands.length - 1, R.frame));
      const [bass, mid, treble, level, dynamics] = bands[g];
      return { bass, mid, treble, level, dynamics, spectrum: spec.subarray(g * bins, (g + 1) * bins),
        beat: A.songBeat(), beatPhase: 0, beatPulse: 0, drums: 1 };
    };
    const song = JSON.parse(songJson);
    window.__mash_cur.openClub({ name: 'CORPORATE KOMBAT', style: null, mood: null }, { song, from: null });
  }, { songJson: JSON.stringify(song), spec64: Buffer.from(spec).toString('base64'), bins, bands });

  // Step on until the club is up and the song is in; then find the clock time of its beat 0.
  await page.evaluate(() => {
    const loop = window.__mash_render_loop;
    for (let n = 0; n < 600; n++) {
      window.__mvClock += 1 / 60;
      loop.stepOffline();
      const c = window.__mash_cur;
      if (/BangerClubState$/.test(c?.constructor?.name || '') && window.__mash_audio.bank) break;
    }
    const c = window.__mash_cur;
    if (!/BangerClubState$/.test(c?.constructor?.name || '')) throw new Error('the club never opened');
    // club-party.js PARTY_BEATS' kinds
    const PARTY = ['spotlight', 'bubbles', 'cleaner', 'vacuum', 'drop-jump', 'moonwalk'];
    const A = window.__mash_audio;
    const spb = 60 / (A.bpm * (A.tempo || 1)) / 4;
    const R = window.__mv;
    R.t0 = A.nextTime - A.step * spb;
    if (!(R.t0 >= window.__mvClock - 1e-6)) throw new Error(`the song started before the clock took it (${R.t0} < ${window.__mvClock})`);
    // No interface: the room and its own signs only.
    for (const k of ['drawControls', 'drawIntro', 'drawTitle', 'drawSavePrompt', 'drawCaption', 'drawPadWords', 'drawTip']) c[k] = () => {};
    c.focus = -99;
    // The sign says CLUB MASHENSTEIN, in its neon and on its own CRT tube.
    const sign = (t) => (t === 'THE BANGER LAB' ? 'CLUB MASHENSTEIN' : t);
    const neon = c.neon.bind(c), pixels = c.neonPixels.bind(c);
    c.neon = (text, ...rest) => neon(sign(text), ...rest);
    c.neonPixels = (text, ...rest) => pixels(sign(text), ...rest);
    // THE BOLT, staged: no new take is made, and the burst lands back in this club — the flash,
    // the ring and the arcs drawn off it as a new take's club would (drawStrike), the song untouched.
    c.makeReroll = () => { c.rerollTake = { commit() {} }; };
    c.rerollNow = () => { c.rerolling = 0; c.strikeAt = c.t; };
    // THE BALL ON BLACK: the mirror ball's drawing kept each frame (its transform and its own
    // arguments), so a `black` shot can play it again on its own over nothing — the ball, its
    // spots thrown round the room and their faint beams back to it
    const drawBall = c.drawBall;
    c.drawBall = function (ctx, o) { R.ball = { m: ctx.getTransform(), o }; return drawBall.call(this, ctx, o); };
    // The framing [cx, cy, w, h] (4K px) the least changed — zoomed out round its middle to take
    // the sign and the board in whole, moved down to put them above it, or zoomed in round its
    // middle to put them either side — that cuts neither of them at its edge.
    R.tidy = (rect) => {
      const SW = 3840, SH = 2160, pad = 40;
      const boxes = [c.boxes.sign, c.boxes.led].filter(Boolean).map((b) =>
        ({ l: b.x * 8 - pad, t: b.y * 8 - pad, r: (b.x + b.w) * 8 + pad, b: (b.y + b.h) * 8 + pad }));
      const edges = ([cx, cy, w, h]) => {
        const l = Math.max(0, Math.min(SW - w, cx - w / 2)), t = Math.max(0, Math.min(SH - h, cy - h / 2));
        return { l, t, r: l + w, b: t + h };
      };
      const cut = (q) => { const e = edges(q); return boxes.filter((b) =>
        b.l < e.r && b.r > e.l && b.t < e.b && b.b > e.t && !(b.l >= e.l && b.r <= e.r && b.t >= e.t && b.b <= e.b)); };
      const bad = cut(rect);
      if (!bad.length) return rect;
      const [cx, cy, w, h] = rect, tries = [];
      // out, round the middle
      const hw = Math.max(...bad.map((b) => Math.max(cx - b.l, b.r - cx)), w / 2);
      const hh = Math.max(...bad.map((b) => Math.max(cy - b.t, b.b - cy)), h / 2);
      const wOut = Math.min(SW, Math.max(2 * hw, 2 * hh * 16 / 9));
      tries.push({ q: [cx, cy, wOut, wOut * 9 / 16], cost: Math.log(wOut / w) });
      // down, below them
      const top = Math.max(...bad.map((b) => b.b));
      if (top + h <= SH) tries.push({ q: [cx, top + h / 2, w, h], cost: Math.max(0, top - edges(rect).t) / h });
      // in, round the middle, between them
      if (bad.every((b) => cx < b.l || cx > b.r)) {
        const wIn = 2 * Math.min(...bad.map((b) => (cx < b.l ? b.l - cx : cx - b.r)));
        tries.push({ q: [cx, cy, wIn, wIn * 9 / 16], cost: Math.abs(Math.log(w / wIn)) });
      }
      const ok = tries.filter((x) => !cut(x.q).length).sort((p, q) => p.cost - q.cost);
      return ok.length ? ok[0].q : rect;
    };
    R.ballOnBlack = (w, h) => {
      if (!R.bk) R.bk = document.createElement('canvas');
      if (R.bk.width !== w) { R.bk.width = w; R.bk.height = h; }
      const x = R.bk.getContext('2d');
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
      if (R.ball) { x.setTransform(R.ball.m); drawBall.call(c, x, R.ball.o); }
      return R.bk;
    };
    // A held hero stays held until the cue sheet lets go.
    const letGo = c.letGo.bind(c);
    c.letGo = () => { if (R.frame < R.holdUntil) return; R.holdUntil = -1; letGo(); };
    // The cue sheet's actions.
    R.act = (cue) => {
      const L = c.layout || {};
      if (cue.do === 'led') c.showLed(cue.text);
      else if (cue.do === 'sky') {
        const tops = c.boxes.heroes.filter(Boolean).map((b) => b.y);
        const y = ((L.stageTop ?? 0) + Math.min(...tops)) / 2;
        if (!c.tapSky(cue.x ?? 200, y)) throw new Error('tapSky missed');
        if (cue.kinds) { c.laserSweep.kinds = cue.kinds; c.lastLaser = cue.kinds.at(-1); }
      } else if (cue.do === 'bolt') c.strike();
      else if (cue.do === 'dolores') {
        const d = c.doloresSpot;
        if (!d || !c.tapDolores(d.x, d.floor - d.h / 2)) R.missed.push(`dolores at bar ${cue.bar}`);
      } else if (cue.do === 'turbo') {
        const v = c.vacuumSpot;
        if (!v || !c.tapVacuum(v.x, v.floor - v.h / 2)) R.missed.push(`turbo at bar ${cue.bar}`);
      }
      else if (cue.do === 'toaster') {
        if (c.startMoment('toaster') === false) R.missed.push(`toaster at bar ${cue.bar}`);
        else Object.assign(c.moments.at(-1), { dir: cue.dir, y0: cue.y, y1: cue.y + 0.05 });
      }
      else if (cue.do === 'can') c.tapCan(cue.k);
      else if (cue.do === 'tap') c.tapHero(cue.i);
      else if (cue.do === 'hold') { R.holdUntil = cue.untilFrame; c.pressHero(cue.i, 'cue'); }
      else if (cue.do === 'moment') {
        // a party moment refuses while the club's own is still on: the cue sheet's wins
        if (PARTY.includes(cue.kind)) c.moments = c.moments.filter((m) => !PARTY.includes(m.kind));
        if (c.startMoment(cue.kind, cue.options || {}) === false) R.missed.push(`${cue.kind} at bar ${cue.bar}`);
      }
    };
  });
  return { page, errors };
}

// Step club frames [from, to) on the song's clock. `grab(g)` says how to frame g: null (no
// picture), 'wide', a { i (hero), zoom } or an { at: [x, y] (4K px), zoom }. Returns base64 PNGs at `outW`.
async function stepClub(page, from, to, grab, outW, scale) {
  const plan = [];
  for (let g = from; g < to; g++) {
    const cues = CUES.filter((c) => F(c.bar) === g).map((c) => ({
      ...c, i: HERO[c.hero], untilFrame: c.until != null ? F(c.until) : null,
    }));
    plan.push({ g, cues, frame: grab(g), egg: flybyAt(g) });
  }
  return page.evaluate(({ plan, outW, scale, SW, SH, fine }) => {
    const R = window.__mv;
    const c = window.__mash_cur;
    const canvas = document.getElementById('game');
    if (!R.out) { R.out = document.createElement('canvas'); R.ctx = R.out.getContext('2d'); }
    const outs = [];
    for (const p of plan) {
      R.frame = p.g;
      window.__mvClock = R.t0 + p.g / 60;
      for (const cue of p.cues) R.act(cue);
      const f = p.frame === 'wide' ? { at: [SW / 2, SH / 2], zoom: 1 } : p.frame;
      // a push-in is one the rig cannot see: its ink is pinned to it (INK_FINE), from the game's own
      // at the whole room to zoom x INK_FINE from a native crop (2) in
      window.__mvInk(f && f.zoom > 1 ? (f.zoom < 2 ? 1 + (f.zoom - 1) * (2 * fine - 1) : f.zoom * fine) : null);
      c.cleanerBeat = Infinity;   // no cleaner but the cue sheet's
      window.__mash_render_loop.stepOffline();
      if (!f) continue;
      // the game canvas may be WebGL, with no 2D context to draw him on: he flies over a copy of it
      let shot = canvas;
      if (p.egg) {
        if (!R.eg) R.eg = document.createElement('canvas');
        if (R.eg.width !== canvas.width) { R.eg.width = canvas.width; R.eg.height = canvas.height; }
        const e = p.egg, x = R.eg.getContext('2d');
        x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(canvas, 0, 0);
        x.save(); x.setTransform(scale, 0, 0, scale, 0, 0);
        x.translate(e.x, e.y); x.rotate(e.tilt); x.translate(-e.size / 2, -e.size / 2);
        window.__mvEgg(x, e.size, e.size, e.rotor);
        x.restore();
        shot = R.eg;
      }
      const kick = f.kick || 1;
      let w = SW * kick / f.zoom, h = SH * kick / f.zoom;
      let x, y;
      if (f.at) [x, y] = f.at;
      else {
        // the hero's box in the 480x270 frame, x8 at 4K; their middle a little above centre
        const mid = (i) => { const b = c.boxes.heroes[i]; return b ? [(b.x + b.w / 2) * 8, (b.y + b.h * 0.55) * 8] : [SW / 2, SH / 2]; };
        // `follow: 'ball'` keeps the mirror ball in the middle, wherever it is on its way down
        const ball = f.follow === 'ball' && c.boxes.ball, v = !ball && f.follow && c[f.follow + 'Spot'];
        const [ax, ay] = ball ? [ball.x * 8, ball.y * 8] : v ? [v.x * 8, (v.floor - v.h * 0.8) * 8] : mid(f.i), [bx, by] = f.j != null ? mid(f.j) : [ax, ay];
        const cx = ax + (bx - ax) * f.s, cy = ay + (by - ay) * f.s;
        // eased, so a dance's sway is not a shaky camera
        if (!R.cam || R.cam.shot !== f.shot) R.cam = { shot: f.shot, x: cx, y: cy };
        R.cam.x += (cx - R.cam.x) * 0.08; R.cam.y += (cy - R.cam.y) * 0.08;
        x = R.cam.x; y = R.cam.y;
      }
      // THE SIGN AND THE BOARD, whole or not at all (Peter, 28 Oct 2026: not cut off at the frame's
      // edge, unless the shot is on one of them): the framing nudged the least that does it
      if (!f.black && !f.boards) {
        const t = R.tidy([x, y, w, h]);
        if (!R.fix || R.fix.shot !== f.shot) R.fix = { shot: f.shot, d: t.map((v, k) => v - [x, y, w, h][k]) };
        else R.fix.d = R.fix.d.map((v, k) => v + (t[k] - [x, y, w, h][k] - v) * 0.25);
        x += R.fix.d[0]; y += R.fix.d[1]; w += R.fix.d[2]; h = w * 9 / 16;
      }
      w /= kick; h /= kick;
      x += f.dx || 0; y += f.dy || 0;
      const rect = [Math.max(0, Math.min(SW - w, x - w / 2)), Math.max(0, Math.min(SH - h, y - h / 2)), w, h];
      const ow = outW, oh = Math.round(outW * 9 / 16);
      if (R.out.width !== ow) { R.out.width = ow; R.out.height = oh; }
      R.ctx.imageSmoothingEnabled = true; R.ctx.imageSmoothingQuality = 'high';
      const src = f.black ? R.ballOnBlack(canvas.width, canvas.height) : shot;
      // motion blur: a fast move (a punch, a crash, a shake) is the average of the crops it swept
      // through since the last frame of the shot
      const prev = R.prev && R.prev.shot === f.shot ? R.prev.rect : rect;
      const d = Math.max(...rect.map((v, k) => Math.abs(v - prev[k])));
      const n = Math.min(10, Math.max(1, Math.ceil(d / 12)));
      for (let k = 0; k < n; k++) {
        const t = (k + 1) / n;
        const r = rect.map((v, j) => prev[j] + (v - prev[j]) * t);
        R.ctx.globalAlpha = 1 / (k + 1);
        R.ctx.drawImage(src, r[0] * scale, r[1] * scale, r[2] * scale, r[3] * scale, 0, 0, ow, oh);
      }
      R.ctx.globalAlpha = 1;
      R.prev = { shot: f.shot, rect };
      outs.push(R.out.toDataURL('image/png').split(',')[1]);
    }
    return outs;
  }, { plan, outW, scale, SW, SH, fine: INK_FINE });
}

/** The camera on frame g: the shot's move, crash, the beat's punch and any shake. */
function framingAt(g) {
  const n = EDIT.findIndex((e) => g >= F(e.from) && (e.to == null || g < F(e.to)));
  const e = EDIT[n];
  if (!e || e.src !== 'club') return 'wide';   // the take covers the whole range; the cut picks
  const fr = e.frame === 'wide' ? {} : e.frame;
  const a = F(e.from), k = g - a;
  const s = (1 - Math.cos(Math.PI * k / (F(e.to) - a))) / 2;   // eased in and out
  const lerp = (u, v) => u + (v - u) * s;
  const z = Array.isArray(fr.zoom) ? fr.zoom : [fr.zoom ?? 1, fr.zoom ?? 1];
  // the framing (`zoom`), and on top of it the beat's kicks (`kick`), which tidy() leaves alone
  const sh = shakeAt(g);
  const kick = (fr.crash && k < CRASH ? 1 + 0.5 * (1 - k / CRASH) ** 3 : 1) * punchAt(g) * (1 + sh.amp);
  const zoom = lerp(z[0], z[1]) * kick;
  const at = fr.hero || fr.follow ? null : fr.to ? [lerp(fr.at[0], fr.to[0]), lerp(fr.at[1], fr.to[1])] : fr.at ?? CENTRE;
  return { shot: n, black: fr.black, boards: fr.boards, kick, follow: fr.follow, i: fr.hero ? HERO[fr.hero] : undefined, j: fr.toHero ? HERO[fr.toHero] : undefined, s, at, zoom, dx: sh.dx, dy: sh.dy };
}

// --probe: a wide frame a beat into every bar, half size. --probe=40.2,40.5,… : those bars instead.
async function probeClub(browser) {
  const list = process.argv.find((a) => a.startsWith('--probe='))?.slice(8).split(',').map(Number);
  const ats = (list ?? Array.from({ length: RANGE.to - 1 }, (_, k) => k + 1.25)).map(F).sort((a, b) => a - b);
  const full = arg('--full'), scale = full ? 1 : 0.5, outW = SW * scale / 2;
  const { page, errors } = await openClub(browser, scale, ats.at(-1) + 1);
  const dir = join(DIR, full ? 'probe-full' : 'probe');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  let n = 0, from = 0;
  try {
    for (const at of ats) {
      for (; from < at; from += 60) await stepClub(page, from, Math.min(at, from + 60), () => null, outW, scale);
      const pngs = await stepClub(page, at, at + 1, () => 'wide', full ? SW : outW, scale);
      from = at + 1;
      const lasers = await page.evaluate(() => { const c = window.__mash_cur; const L = c.laserState(c.heardNow()); return L ? `${L.kind} ${L.q.toFixed(1)}` : '-'; });
      console.log(`${String(n).padStart(3, '0')}  bar ${(at / FPS / BAR + 1).toFixed(2)}  lasers ${lasers}`);
      writeFileSync(join(dir, `${String(n++).padStart(3, '0')}.png`), Buffer.from(pngs[0], 'base64'));
    }
    const state = await page.evaluate(() => {
      const c = window.__mash_cur, A = window.__mash_audio;
      return { sign: c.boxes.sign, led: c.boxes.led, ball: c.boxes.ball, beat: A.songBeat(), bar: A.songBeat() / 4 + 1, heroes: c.boxes.heroes.map((b) => b && [b.x, b.y, b.w, b.h].map(Math.round)) };
    });
    console.log(JSON.stringify(state));
    if (full) return;   // the frames themselves are the point
    command('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '1', '-i', join(dir, '%03d.png'),
      '-vf', 'tile=4x6:padding=4', '-frames:v', '1', join(DIR, 'probe-club.jpg')]);
    console.log(join(DIR, 'probe-club.jpg'));
    if (errors.length) console.log(`page errors: ${errors.slice(0, 5).join(' | ')}`);
  } finally { await page.close(); }
}

// --look: the close-ups at three ink settings, side by side, to choose INK_FINE by eye.
async function lookClub(browser) {
  const shots = EDIT.filter((e) => e.src === 'club' && e.frame?.hero).slice(0, 6);
  const last = F(shots.at(-1).from) + 60;
  const { page } = await openClub(browser, 1, last + 1);
  const fines = [1, INK_FINE, INK_FINE * 2];
  const dir = join(ROOT, 'work/local/ckmv/look');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  try {
    let at = 0;
    for (const e of shots) {
      const g = F(e.from) + 60;
      for (let a = at; a < g; a += 30) await stepClub(page, a, Math.min(g, a + 30), () => null, W, 1);
      at = g;
      const pngs = await page.evaluate(({ g, i, zoom, fines, SW, SH, W }) => {
        const R = window.__mv, c = window.__mash_cur, canvas = document.getElementById('game');
        const out = document.createElement('canvas'); out.width = W; out.height = W * 9 / 16;
        const o = out.getContext('2d');
        return fines.map((f) => {
          R.frame = g; window.__mvClock = R.t0 + g / 60;
          window.__mvInk(zoom * f);
          window.__mash_render_loop.stepOffline();
          const b = c.boxes.heroes[i];
          const w = SW / zoom, h = SH / zoom;
          const x = Math.max(0, Math.min(SW - w, (b.x + b.w / 2) * 8 - w / 2));
          const y = Math.max(0, Math.min(SH - h, (b.y + b.h * 0.55) * 8 - h / 2));
          o.drawImage(canvas, x, y, w, h, 0, 0, out.width, out.height);
          return out.toDataURL('image/png').split(',')[1];
        });
      }, { g, i: HERO[e.frame.hero], zoom: [].concat(e.frame.zoom)[0], fines, SW, SH, W });
      pngs.forEach((png, k) => writeFileSync(join(dir, `${e.frame.hero}-${fines[k]}.png`), Buffer.from(png, 'base64')));
      at = g + fines.length;
    }
    console.log(`${dir}: ${shots.map((e) => e.frame.hero).join(', ')} at ink ${fines.join(' / ')}`);
  } finally { await page.close(); }
}

async function captureClub(browser) {
  const g0 = F(RANGE.from), g1 = F(RANGE.to);
  const { page, errors } = await openClub(browser, 1, g1);
  const size = await page.evaluate(() => { const c = document.getElementById('game'); return [c.width, c.height]; });
  if (size[0] !== SW || size[1] !== SH) throw new Error(`Expected ${SW}x${SH}, got ${size.join('x')}`);
  const out = CLUB_MP4;
  const ff = x264(out);
  let written = 0;
  const t = Date.now();
  try {
    // the bars before the cut: stepped, not filmed
    for (let a = 0; a < g0; a += 30) await stepClub(page, a, Math.min(g0, a + 30), () => null, W, 1);
    for (let a = g0; a < g1; a += 4) {
      const pngs = await stepClub(page, a, Math.min(g1, a + 4), framingAt, W, 1);
      for (const png of pngs) {
        if (!ff.stdin.write(Buffer.from(png, 'base64'))) await once(ff.stdin, 'drain');
        written++;
      }
      if (written % 240 === 0) console.log(`club ${written}/${g1 - g0} frames, ${((Date.now() - t) / 1000).toFixed(0)} s`);
    }
    ff.stdin.end();
    const [code] = await once(ff, 'close');
    if (code !== 0) throw new Error(`ffmpeg exited ${code}`);
    if (written !== g1 - g0) throw new Error(`captured ${written}/${g1 - g0} club frames`);
    console.log(`${out}: frames ${g0}–${g1} (bars ${RANGE.from}–${RANGE.to - 1})`);
    const missed = await page.evaluate(() => window.__mv.missed);
    if (missed.length) console.log(`cues the club refused: ${missed.join(', ')}`);
    if (errors.length) console.log(`page errors: ${errors.slice(0, 5).join(' | ')}`);
  } finally { await page.close(); }
}

// ---------------------------------------------------------------- the dances

// A hero dancing, full frame, on plain black: the club's own dance (hero-dance-candidates.js),
// on the song's beat.
const SET_STYLES = ['vapor', 'crayon', 'cutaway', 'deco88', 'gouache88', 'mcm'];
const DANCE_ENTRY = `
import { HERO_DANCE_LAB_CANDIDATES, drawHeroDance } from './src/dev/hero-dance-candidates.js';
import { setInkScale } from './src/sprites/toons.js';
import { officeFrame } from './src/dev/office-styles/plan.js';
import { GROUND_Y } from './src/engine/camera.js';
${SET_STYLES.map((id) => `import { STYLE as S_${id} } from './src/dev/office-styles/${id}.js';`).join('\n')}
const SETS = { ${SET_STYLES.map((id) => `${id}: S_${id}`).join(', ')} };
// The office behind the dancer: the style's own floor at 480x270, pushed in (SET_ZOOM) about its
// ground line so the dancer's feet land on it, and darkened a touch so the hero leads.
const SET_ZOOM = 1.5;
function paintSet(ctx, set, w, h) {
  const st = SETS[set.style];
  ctx.save();
  ctx.translate(w / 2, h * 0.92); ctx.scale(w / 480 * SET_ZOOM, w / 480 * SET_ZOOM); ctx.translate(-240, -GROUND_Y);
  ctx.beginPath(); ctx.rect(0, 0, 480, 270); ctx.clip();
  const frame = officeFrame(set.floor, set.camX, set.t);
  st.paint(ctx, frame);
  if (st.paintFront) st.paintFront(ctx, frame);
  ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(0, 0, w, h);
}
window.danceFrames = (hero, move, beats, zooms, w, h, ink, sets) => {
  const cand = HERO_DANCE_LAB_CANDIDATES.find((c) => c.hero === hero && c.move === move);
  if (!cand) throw new Error('no dance ' + hero + '/' + move);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  return beats.map((beat, k) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
    ctx.translate(w / 2, h / 2); ctx.scale(zooms[k], zooms[k]); ctx.translate(-w / 2, -h / 2);
    if (sets) paintSet(ctx, sets[k], w, h);
    setInkScale(ink);
    drawHeroDance(ctx, cand, beat, w / 2, h * 0.92, h * 0.78);
    setInkScale(null);
    return c.toDataURL('image/png').split(',')[1];
  });
};
`;

// The dance's hero (78% of the frame) against the same hero in the club's wide shot (66 of
// 270 logical px): the push-in its ink is pinned to.
const DANCE_PUSH = 0.78 / (66 / 270);

// --sets: one frame from the middle of each dance on a set, to work/local/ckmv/sets, to look at.
async function lookSets() {
  const { browser, page } = await openArtPage(await bundleEntry(DANCE_ENTRY, ROOT));
  const dir = join(ROOT, 'work/local/ckmv/sets');
  mkdirSync(dir, { recursive: true });
  try {
    // --sets=31:0,400,800 : bar 31's set at each of those camX instead, to find it a better spot
    const only = process.argv.find((a) => a.startsWith('--sets='))?.slice(7).split(':');
    for (const e of EDIT.filter((x) => x.src === 'dance' && x.set && (!only || x.from === Number(only[0])))) {
      const g = F(e.from + 0.5);
      for (const camX of only ? only[1].split(',').map(Number) : [e.set.camX + 60]) {
        const [png] = await page.evaluate(({ hero, move, beat, W, H, ink, set }) => window.danceFrames(hero, move, [beat], [1.05], W, H, ink, [set]),
          { hero: e.hero, move: e.move, beat: g / FPS * BPM / 60, W, H, ink: DANCE_PUSH * INK_FINE, set: { ...e.set, camX, t: g / FPS } });
        writeFileSync(join(dir, `${e.from}-${e.hero}-${e.set.style}${only ? `-${camX}` : ''}.png`), Buffer.from(png, 'base64'));
      }
    }
    console.log(dir);
  } finally { await browser.close(); }
}

async function renderDances() {
  const { browser, page } = await openArtPage(await bundleEntry(DANCE_ENTRY, ROOT));
  try {
    for (const e of EDIT.filter((x) => x.src === 'dance')) {
      const out = join(DIR, `dance-${e.hero}-${e.move}-${e.from}.mp4`);
      const ff = x264(out);
      for (let a = F(e.from); a < F(e.to); a += 20) {
        const beats = [], zooms = [], sets = e.set ? [] : null;
        for (let g = a; g < Math.min(F(e.to), a + 20); g++) {
          beats.push(g / FPS * BPM / 60);
          // the set drifts past behind, as the run's camera would carry it
          if (sets) sets.push({ ...e.set, camX: e.set.camX + (g - F(e.from)) / FPS * 60, t: g / FPS });
          // a slow push over the bar, kicked on the beat like the club's camera
          zooms.push((1 + 0.12 * (g - F(e.from)) / (F(e.to) - F(e.from))) * punchAt(g));
        }
        const pngs = await page.evaluate(({ hero, move, beats, zooms, W, H, ink, sets }) => window.danceFrames(hero, move, beats, zooms, W, H, ink, sets),
          { hero: e.hero, move: e.move, beats, zooms, W, H, ink: DANCE_PUSH * INK_FINE, sets });
        for (const png of pngs) if (!ff.stdin.write(Buffer.from(png, 'base64'))) await once(ff.stdin, 'drain');
      }
      ff.stdin.end();
      await once(ff, 'close');
      console.log(out);
    }
  } finally { await browser.close(); }
}

// ---------------------------------------------------------------- the slogans

// The words layer: one frame of transparency a frame, full length, over the cut. A word is
// set as big as the frame takes it in the game's title face, punched in on its beat; a card is
// the same on a solid colour. The end card is the marquee's MASHENSTEIN, the song's name, and
// COMING SOON.
const SLOGAN_ENTRY = `
import { drawToon } from './src/sprites/toons.js';
import { BIRTH_SWITCHES } from './src/game/banger/birth-switches.js';
import { SWITCH_AT, FLASH_AT } from './src/game/banger/birth.js';
const FACE = "'Lilita One'";
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
let c, ctx;
function fit(text, maxW, maxPx) {
  let px = maxPx;
  ctx.font = '400 ' + px + 'px ' + FACE;
  const w = ctx.measureText(text).width;
  if (w > maxW) px = Math.floor(px * maxW / w);
  ctx.font = '400 ' + px + 'px ' + FACE;
  return px;
}
// A phrase in one, two or three lines, whichever sets it biggest: { rows, px }.
const layouts = new Map();
function layout(text, w, h) {
  if (layouts.has(text)) return layouts.get(text);
  const words = text.split(' ');
  ctx.font = '400 100px ' + FACE; ctx.letterSpacing = '4px';
  const width = (r) => ctx.measureText(r).width;
  const splits = [[words.join(' ')]];
  for (let i = 1; i < words.length; i++) {
    splits.push([words.slice(0, i).join(' '), words.slice(i).join(' ')]);
    for (let j = i + 1; j < words.length; j++) {
      splits.push([words.slice(0, i).join(' '), words.slice(i, j).join(' '), words.slice(j).join(' ')]);
    }
  }
  let best = null;
  for (const rows of splits) {
    const px = Math.min(100 * w * 0.82 / Math.max(...rows.map(width)), rows.length === 1 ? h * 0.34 : h * 0.62 / rows.length);
    if (!best || px > best.px * 1.04) best = { rows, px };
  }
  layouts.set(text, best);
  return best;
}
function word(f, w, h) {
  const { rows, px } = layout(f.text, w, h);
  // slammed in, then drifting: a slow push and a slow turn the whole time, a degree or so. A big
  // moment (tilt) comes in at an angle and snaps ONCE to the other way halfway
  const k = f.age / f.len;
  let angle, scale;
  if (f.tilt) {
    const a0 = (hash(f.n) - 0.5) * 0.12, a1 = -Math.sign(a0 || 1) * (0.04 + hash(f.n + 7) * 0.05);
    const swing = 1 - Math.pow(1 - Math.max(0, Math.min(1, (f.age - f.len / 2) / 6)), 3);
    angle = a0 + (a1 - a0) * swing;
    scale = (1 + 0.2 * Math.pow(1 - Math.min(1, f.age / 7), 3)) * (1 + 0.05 * k);
  } else {
    const a = (hash(f.n) < 0.5 ? -1 : 1) * 0.018;
    angle = a * (1 - 2 * k);
    scale = (1 + 0.1 * Math.pow(1 - Math.min(1, f.age / 7), 3)) * (1 + 0.04 * k);
  }
  if (f.small) scale *= 0.55;
  ctx.save();
  if (f.card) { ctx.fillStyle = f.card; ctx.fillRect(0, 0, w, h); }
  ctx.translate(w / 2, f.small ? h * 0.8 : h / 2);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.font = '400 ' + px + 'px ' + FACE; ctx.letterSpacing = (px * 0.04) + 'px';
  const lh = px * 0.95, y0 = -(rows.length - 1) * lh / 2;
  rows.forEach((row, k) => {
    const y = y0 + k * lh;
    if (f.card) {
      ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillText(row, 10, y + 14);
      ctx.fillStyle = '#1c1405'; ctx.fillText(row, 0, y);
    } else {
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 34; ctx.shadowOffsetY = 12;
      ctx.lineWidth = Math.max(10, px / 8); ctx.strokeStyle = '#1c1405'; ctx.strokeText(row, 0, y);
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = (f.n + k) % 2 ? '#ffffff' : '#ffcf33'; ctx.fillText(row, 0, y);
    }
  });
  ctx.restore();
}
// GARY THROWS THE SWITCH (Peter, 28 Oct 2026: "gary make an appearance at the end"): still on
// the clock, by the big knife switch out of the Lab's birth (birth-switches.js), and he hauls it
// down as he does there — the marquee comes on with it. \`t\` is his time on birth.js's beats.
// He is painted as the game paints him on a big screen (Peter, 29 Oct 2026: "render gary at high
// resolution"): in the 480x270 logical frame, scaled up, so the painter's ink thins for the zoom
// instead of drawing a 475-unit giant's heavy, soft contour. On a layer of his own, so the fade
// takes him and the switch whole — the painter sets its own globalAlpha, and see-through limbs
// over a see-through body is what fading him shape by shape looked like.
let garyLayer;
function endGary(f, w, h, t) {
  if (!garyLayer) garyLayer = document.createElement('canvas');
  garyLayer.width = w; garyLayer.height = h;
  const gctx = garyLayer.getContext('2d');
  const S = h / 270;
  gctx.setTransform(S, 0, 0, S, 0, 0);
  paintGary(gctx, f, w / S, h / S, t);
  return garyLayer;
}
function paintGary(ctx, f, w, h, t) {
  const gh = h * 0.44, base = h * 0.95;
  let seed = 7 + Math.floor(f.age);
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const o = { t, h: gh, base, coilX: -gh * 0.6, portrait: false, gx: w * 0.18, random, since: t - SWITCH_AT };
  const lever = BIRTH_SWITCHES[0], rig = lever.rig(o);
  lever.back?.(ctx, o, rig);
  const rest = [0.7, 0.85];
  const reach = (i, [x, y]) => [(i ? x - o.gx - 0.1 * gh : o.gx - x - 0.1 * gh) / (0.26 * gh), (y - base + 0.511 * gh) / (0.256 * gh)];
  const hands = [0, 1].map((i) => {
    const g = rig.hands?.[i];
    if (!g || !(g.w > 0)) return rest;
    const to = reach(i, g.at);
    return rest.map((v, j) => v + (to[j] - v) * g.w);
  });
  drawToon(ctx, 'gary', {
    kind: 'stand', time: t, phase: 0, grounded: true, facing: 1, squash: rig.squash || 0, lean: rig.lean || 0,
    dance: { hands, ankles: [0, 0], pointAngle: null, shoulderLift: 0, elbows: rig.elbows },
    armsInFront: !!rig.armsInFront, faceSurprised: t >= SWITCH_AT && t < FLASH_AT, faceJoy: t >= FLASH_AT,
  }, o.gx, base, gh);
  lever.front?.(ctx, o, rig);
}
function endCard(f, w, h) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalAlpha = f.fade;
  const t = f.gary / 60 + SWITCH_AT, on = t - SWITCH_AT;
  ctx.drawImage(endGary(f, w, h, t), 0, 0);
  // dark until the switch lands; then on with the title sign's stutter, twice, and holding
  const lit = on < 0 ? 0.1 : on < 0.06 || (on > 0.12 && on < 0.18) ? 1 : on < 0.18 ? 0.25 : 1;
  ctx.globalAlpha = f.fade * lit;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  const punch = on < 0 ? 1 : 1 + 0.18 * Math.pow(1 - Math.min(1, on * 60 / 9), 3);
  ctx.save();
  ctx.translate(w / 2, h * 0.4); ctx.scale(punch, punch);
  // the title screen's marquee (menus.js drawRetainedMarquee), in its proportions: gold on a
  // darker gold drop, outlined, and stitched together out of parts — six cross-stitches across
  // the word (Peter, 28 Oct 2026: "the stitched together look from the title screen")
  ctx.letterSpacing = '0px';
  const px = fit('MASHENSTEIN', w * 0.8, h * 0.3);
  ctx.letterSpacing = (px * 0.014) + 'px';
  const ink = px * 5.95 / 8.2, logoW = ctx.measureText('MASHENSTEIN').width;
  const d = ink * 0.057;
  ctx.lineWidth = Math.max(8, px / 14); ctx.strokeStyle = '#2a1e05';
  ctx.strokeText('MASHENSTEIN', d, d); ctx.fillStyle = '#a8791f'; ctx.fillText('MASHENSTEIN', d, d);
  ctx.strokeText('MASHENSTEIN', 0, 0); ctx.fillStyle = '#ffcf33'; ctx.fillText('MASHENSTEIN', 0, 0);
  const top = -ink / 2 + ink * 0.025, bot = -ink / 2 + ink * 0.78, xw = ink * 0.305;
  ctx.strokeStyle = 'rgba(42,30,5,0.85)'; ctx.lineWidth = ink * 0.053; ctx.lineCap = 'butt';
  for (let i = 0; i < 6; i++) {
    const sx = -logoW / 2 + logoW * (i + 0.5) / 6 - xw / 2;
    ctx.beginPath(); ctx.moveTo(sx, top); ctx.lineTo(sx + xw, bot); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx + xw, top); ctx.lineTo(sx, bot); ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = f.fade * (f.title > 0 ? Math.min(1, f.title / 8) : 0);
  ctx.letterSpacing = '6px';
  fit('CORPORATE KOMBAT', w * 0.6, h * 0.085);
  ctx.fillStyle = '#ffffff'; ctx.fillText('CORPORATE KOMBAT', w / 2, h * 0.62);
  if (f.soon > 0) {
    ctx.globalAlpha = f.fade * Math.min(1, f.soon / 24);
    fit('COMING SOON', w * 0.5, h * 0.07);
    ctx.fillStyle = '#ff4fa3'; ctx.fillText('COMING SOON', w / 2, h * 0.77);
  }
  ctx.restore();
}
window.sloganFrames = (frames, w, h) => {
  if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; ctx = c.getContext('2d'); }
  return frames.map((f) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (f?.end) endCard(f, w, h);
    else if (f?.text) word(f, w, h);
    if (f?.flash) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = 'rgba(255,255,255,' + f.flash + ')'; ctx.fillRect(0, 0, w, h); }
    return c.toDataURL('image/png').split(',')[1];
  });
};
`;

/** What the words layer shows on frame g: a word and/or a flash, the end card, or null. */
function sloganAt(g) {
  const word = wordAt(g), flash = flashAt(g);
  return flash ? { ...word, flash } : word;
}
function wordAt(g) {
  const beatF = BAR * FPS / 4;
  const endAt = F(END_CARD.from);
  if (g >= endAt) {
    const left = (END - g) / FPS;
    return { end: true, age: g - endAt, gary: g - F(END_CARD.thrown), title: g - F(END_CARD.title), soon: g - F(END_CARD.soon),
      fade: Math.max(0, Math.min(1, (left - END_CARD.black) / END_CARD.fadeOut)) };
  }
  for (const [n, s] of SLOGANS.entries()) {
    const a = F(s.bar) + Math.round((s.at ?? 0) * beatF), b = a + Math.round(s.beats * beatF);
    if (g < a || g >= b) continue;
    const age = g - a, beat = Math.floor(age / beatF + 1e-6);
    return { text: s.text, n, age, len: b - a, beat, beatAge: age - Math.round(beat * beatF), card: s.card || null, tilt: !!s.tilt, small: !!s.small };
  }
  return null;
}

async function renderSlogans() {
  const { browser, page } = await openArtPage(await bundleEntry(SLOGAN_ENTRY, ROOT));
  const out = join(DIR, 'slogans.mov');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', 'pipe:0',
    '-c:v', 'qtrle', '-pix_fmt', 'argb', out], { cwd: ROOT, stdio: ['pipe', 'inherit', 'inherit'] });
  try {
    const [blank] = await page.evaluate(({ W, H }) => window.sloganFrames([null], W, H), { W, H });
    const blankBuf = Buffer.from(blank, 'base64');
    for (let a = 0; a < END; a += 30) {
      const fs = [];
      for (let g = a; g < Math.min(END, a + 30); g++) fs.push(sloganAt(g));
      const pngs = fs.some(Boolean)
        ? await page.evaluate(({ fs, W, H }) => window.sloganFrames(fs, W, H), { fs, W, H }) : null;
      for (let k = 0; k < fs.length; k++) {
        const buf = pngs && fs[k] ? Buffer.from(pngs[k], 'base64') : blankBuf;
        if (!ff.stdin.write(buf)) await once(ff.stdin, 'drain');
      }
    }
    ff.stdin.end();
    const [code] = await once(ff, 'close');
    if (code !== 0) throw new Error(`ffmpeg exited ${code} on the words layer`);
    console.log(out);
  } finally { await browser.close(); }
}

// ---------------------------------------------------------------- the cut

function assemble() {
  const lo = F(RANGE.from), hi = PART ? F(RANGE.to) : END;
  const inputs = [];
  const parts = [];
  const input = (path) => {
    if (!existsSync(path)) throw new Error(`missing ${path}`);
    let k = inputs.findIndex((x) => x.at(-1) === path);
    if (k < 0) { inputs.push(['-i', path]); k = inputs.length - 1; }
    return k;
  };
  const shots = EDIT.map((e) => ({ e, a: Math.max(lo, F(e.from)), b: Math.min(hi, e.to == null ? END : F(e.to)) }))
    .filter((x) => x.b > x.a);
  shots.forEach(({ e, a, b }, n) => {
    let k, s = 0;
    if (e.src === 'club') { k = input(CLUB_MP4); s = a - lo; }
    else if (e.src === 'black') {
      inputs.push(['-f', 'lavfi', '-i', `color=c=black:s=${W}x${H}:r=${FPS}:d=${((b - a) / FPS + 1).toFixed(3)}`]);
      k = inputs.length - 1;
    } else { k = input(join(DIR, `dance-${e.hero}-${e.move}-${e.from}.mp4`)); s = a - F(e.from); }
    parts.push(`[${k}:v]trim=start_frame=${s}:end_frame=${s + b - a},setpts=PTS-STARTPTS,fps=${FPS},scale=${W}:${H},setsar=1[p${n}]`);
  });
  const words = input(join(DIR, 'slogans.mov'));
  const a = input(SONG_WAV);
  const dur = (hi - lo) / FPS, fade = PART ? 0.3 : 1.2;
  const filter = [...parts,
    `${shots.map((_, n) => `[p${n}]`).join('')}concat=n=${shots.length}:v=1:a=0[cut]`,
    `[${words}:v]trim=start_frame=${lo}:end_frame=${hi},format=rgba,setpts=PTS-STARTPTS[w]`,
    '[cut][w]overlay=0:0:format=auto:eof_action=pass,format=yuv420p[v]',
    `[${a}:a]atrim=start=${(lo / FPS).toFixed(6)}:duration=${dur.toFixed(6)},asetpts=PTS-STARTPTS,afade=t=out:st=${(dur - fade).toFixed(3)}:d=${fade}[a]`];
  const out = join(DIR, PART ? `corporate-kombat-mv-bars-${RANGE.from}-${RANGE.to}.mp4` : 'corporate-kombat-music-video.mp4');
  command('ffmpeg', ['-y', '-loglevel', 'error', ...inputs.flat(), '-filter_complex', filter.join(';'),
    '-map', '[v]', '-map', '[a]', '-frames:v', String(hi - lo), '-r', String(FPS), '-c:v', 'libx264', '-preset', 'slow', '-crf', '14',
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', out]);
  console.log(`${out}  ${dur.toFixed(2)} s`);
}

// ---------------------------------------------------------------- the song

// The song as the game plays it: the arranged form, once through, then the tail.
async function renderSong() {
  const { outL, outR, seconds, peak } = await renderBankBrowser(office.bank, {
    trackId: 'office', mix: office.mix, arrangement: office.arrangement, songLoop: false, repeat: 1,
  });
  mkdirSync(DIR, { recursive: true });
  writeFileSync(SONG_WAV, wavBuffer([outL, outR], 1));
  console.log(`${SONG_WAV}: ${seconds.toFixed(2)} s, peak ${dbfs(peak)}`);
}

// ---------------------------------------------------------------- main

async function main() {
  if (arg('--look')) {
    const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
    try { await lookClub(browser); } finally { await browser.close(); }
    return;
  }
  if (process.argv.some((a) => a === '--sets' || a.startsWith('--sets='))) return lookSets();
  if (process.argv.some((a) => a.startsWith('--probe='))) process.argv.push('--probe');
  const only = ['--song', '--probe', '--club', '--dances', '--slogans', '--assemble'].filter(arg);
  const want = (k) => !only.length || only.includes(k);
  if (want('--song') && (only.length || !existsSync(SONG_WAV))) await renderSong();
  if (!existsSync(SONG_WAV)) throw new Error(`render the song first: node tools/render-music-video.js --song`);
  if (arg('--probe') || want('--club')) {
    const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
    try {
      if (arg('--probe')) await probeClub(browser);
      else await captureClub(browser);
    } finally { await browser.close(); }
  }
  if (arg('--probe')) return;
  if (want('--dances')) await renderDances();
  if (want('--slogans')) await renderSlogans();
  if (want('--assemble')) assemble();
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
