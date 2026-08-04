// Silent, seamlessly looping MP4s of one thing happening in a dead arcade.
//
// Dev tooling — this never ships. Nothing in src/ imports from tools/, the build
// only bundles src/gate.js and src/main.js, and the dependency runs one way: this
// file imports from src/, never the reverse. Output lands in work/social/, which
// is gitignored.
//
// Scenes:
//   locked  an unplugged cabinet on black, its dead screen crackling with static
//   gary    black; Gary leans in once, catches your eye, panics, vanishes
//   coin    INSERT COIN flashes, then a fall of coins comes down over it
//
// All three are built around one CYCLE and rendered as a whole number of them,
// and everything that moves is a function of the position within a cycle — so the
// last frame hands off to the first and the file loops without a seam. That is
// the whole delivery format here: Instagram replays a short video forever, and a
// loop with a visible join reads as a mistake rather than as a loop.
//
// Only `locked` repeats within its own file. gary and coin are single arcs that
// open and close on black: they satisfy the seam rule for free, and both are
// events that stop being events when they happen twice.
//
// Silent on purpose. All three are about something you would hear if the arcade
// had any power left, and a caption saying so beats a soundtrack.
//
// Usage: node tools/render-loop.js [scene] [outPath] [--flags]
//   --cycle=N     seconds per repeat            (default per scene)
//   --repeats=N   how many cycles               (default per scene)
//   --fps=N       frame rate                    (default 60)
//   --size=WxH    output frame                  (default 1080x1350)
//   --reel        9:16 Instagram Reel frame     (shorthand for --size=1080x1920)
//   --zoom=N      logical frame width; bigger is further back (default per scene)
//   --coins=N     how many coins fall             (coin; default scales with frame)
//   --coins=N     how many coins fall            (coin; default 60)
//   --seed-from=ID  cabinet whose burst seed to use  (locked; default plumber)
//   --poster      hang the machine's one-sheet above it (locked; off by default)
//   --ss=N        supersample factor            (default 2)
//   --crf=N       x264 quality, lower is better (default 12)
//   --no-gpu      rasterize on CPU (fallback; much slower)
//   --frames=N    stop after N frames (smoke test)
import { mkdirSync, renameSync, rmSync, existsSync } from 'fs';
import { join, dirname, basename, resolve } from 'path';
import { bundleEntry, openArtPage } from './lib/art-page.js';
import { pipeFrames, FRAME_BUFFER_SRC } from './lib/mp4-pipe.js';
import { CABINETS } from '../src/data/cabinets.js';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');

// ---------------------------------------------------------------- arguments

const argv = process.argv.slice(2);
const flags = {};
const positional = [];
for (const arg of argv) {
  const m = /^--([\w-]+)(?:=(.*))?$/.exec(arg);
  if (m) flags[m[1]] = m[2] === undefined ? true : m[2];
  else positional.push(arg);
}
const num = (key, fallback) => {
  const v = flags[key];
  if (v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// The coin arc's timeline, in seconds, defined here rather than in the painter
// because the scene's CYCLE has to be derived from it — the clip is over when the
// last coin has left the frame, and how long that takes depends on the frame. It
// is injected into the browser bundle so there is still only one copy.
//
// refAspect is the frame these numbers were tuned against (4:5). A taller frame
// scales the fall durations to keep the speed constant, and the tail moves with
// them; see fallScale in buildCoinPool.
const COIN_TIMELINE = {
  blinkUntil: 1.0,
  fadeEnd: 1.35,
  spawnFrom: 1.15,
  spawnUntil: 3.1,
  minDur: 0.5,
  maxDur: 1.15,
  blinkPeriod: 0.34,
  textY: 0.76,
  tail: 0.25,      // black held after the last coin leaves
  refAspect: 0.8,
};

// Per-scene defaults.
//
// The rhythm: locked runs two 3.4s cycles, so the finished clip is exactly two
// flashes with a long pause either side of each — pause, flash, pause, flash. The
// cadence is a deliberate lie about the game's own burst clock; see the note in
// the painter below. gary runs at 2.8s: the pop-in
// and the exit are as short as they can be and still register, and the held shock
// is the longest beat because it is the one the viewer is meant to read.
//
// The locked scene does not hang the poster: on an unplugged machine that sheet
// loses its motif and prints as a near-black rectangle, which is the correct
// picture and worth having in a still, but in a clip where the only event is on
// the glass it is a third of the frame doing nothing.
//
// It is `bare` — one machine, on black, and nothing else. No wall, no floor, no
// neighbours, no vignette. The concourse version of this shot went through a close
// framing and then a wide row of dead machines, and losing the room outright beats
// both: with the walls in, the eye has furniture to look at and the burst is one
// event among several, where on black the only thing that is not black is the glass
// doing it.
//
// And it is framed a long way back — 320 logical units across against the stills'
// 144, so the machine is a seventh of the picture. A small object in a lot of
// nothing is what an unplugged arcade actually feels like, and it leaves most of
// the frame for a caption.
const SCENES = {
  locked: {
    cycle: 3.4, repeats: 2, zoom: 320, aspect: 0.8, poster: false,
    bare: true, neighbours: 0,
  },
  // ONE appearance, not a repeat, and mostly black around it. Gary leaning in
  // three times in eight seconds turned a joke into a mechanism — the second time
  // you know it is coming and the third is a screensaver, where the whole gag is a
  // thing you were not expecting to be looking back at you.
  //
  // So the black is the point, not filler. 9.8s of clip for 1.568s of Gary: he is
  // absent for 84% of it, which is what keeps him from reading as frequent when the
  // file is played on repeat — the tail of one pass and the lead of the next put
  // over eight seconds of nothing between two appearances.
  //
  //   2.616s  black          (0.616 original lead + 2)
  //   1.568s  Gary           (BEATS, absolute, unchanged)
  //   5.616s  black          (0.616 original tail + 5)
  //
  // The beats are in SECONDS, so this padding does not touch the performance and
  // `--cycle=N` re-dials the trailing black rather than stretching him. Anything
  // below GARY_LEAD + GARY_ACTION (4.184s) starts cutting the exit off.
  gary: { cycle: 9.8, repeats: 1, zoom: 100, aspect: 0.8 },
  // One 4.5s cycle, not a short repeat: this one is an arc that opens and closes
  // on black, which also means it repeats cleanly without being built as a loop.
  //
  // 60 coins, down from 150. At 150 the fall closed into a solid curtain — the
  // individual coin stopped being legible, and with it the flip, the depth banding
  // and the face, which are the only things in the shot worth looking at. Fewer,
  // read as coins, beats more, read as gold rain.
  // No cycle here: the coin arc's length is derived from COIN_TIMELINE and the
  // frame it is being drawn into. See sceneCycle below.
  coin: { repeats: 1, zoom: 100, aspect: 0.8, coins: 60 },
};

const [sceneArg = 'locked', outArg = null] = positional;
if (!SCENES[sceneArg]) {
  console.error(`unknown scene "${sceneArg}" — try one of: ${Object.keys(SCENES).join(', ')}`);
  process.exit(1);
}
const scene = SCENES[sceneArg];

const FPS = Math.max(1, Math.round(num('fps', 60)));
const REPEATS = Math.max(1, Math.round(num('repeats', scene.repeats)));
const SS = Math.max(1, Math.round(num('ss', 2)));
const CRF = num('crf', 12);
const USE_GPU = flags.gpu !== 'false' && !flags['no-gpu'];
const sizeArg = typeof flags.size === 'string' ? /^(\d+)x(\d+)$/.exec(flags.size) : null;
if (flags.size && !sizeArg) {
  console.error(`--size must look like 1080x1350, got "${flags.size}"`);
  process.exit(1);
}
// --reel is the 9:16 Instagram Reels / Stories frame. It is a shorthand for
// --size=1080x1920 and nothing more, because of how the logical frame is derived
// below: the scene composes for whatever aspect it is handed.
const REEL = flags.reel === true || flags.reel === 'true';
const OUT_W = sizeArg ? Number(sizeArg[1]) : 1080;
const OUT_H = sizeArg ? Number(sizeArg[2])
  : REEL ? 1920 : Math.round(1080 / scene.aspect);
if (OUT_W % 2 || OUT_H % 2) {
  console.error(`--size must be even in both axes for yuv420p, got ${OUT_W}x${OUT_H}`);
  process.exit(1);
}

// How much room is in shot, as the logical width of the frame. Bigger is further
// back.
//
// The logical HEIGHT follows the output's own aspect rather than the scene's, so
// a scene composes natively for whatever frame it is asked for instead of being
// cover-cropped out of a 4:5 layout. That is what makes --reel a one-word change:
// at 9:16 the coin fall gets a taller column to fall down and the cabinet gets
// more black around it, rather than both losing their sides to a crop.
//
// scene.aspect survives only as the DEFAULT output shape, used to pick OUT_H when
// neither --size nor --reel says otherwise.
const ZOOM = Math.max(40, num('zoom', scene.zoom));
const LOGICAL = { w: ZOOM, h: (ZOOM * OUT_H) / OUT_W };

// The coin scene's length is computed, not declared: last spawn, plus the slowest
// coin's crossing at this frame's height, plus the black tail. At 4:5 that lands
// on the 4.5s it used to hardcode; at 9:16 it grows to fit the taller fall instead
// of cutting coins off mid-air.
const COIN_FALL_SCALE = (LOGICAL.h / (LOGICAL.w / COIN_TIMELINE.refAspect));
// Scaled with the frame for the same reason the durations are: a taller column
// holds more coins at the same on-screen density, and a count fixed per clip means
// a 9:16 reel is the same fall spread thinner.
const COIN_COUNT = Math.max(1, Math.round(
  num('coins', (scene.coins ?? 60) * COIN_FALL_SCALE)));
const sceneCycle = sceneArg === 'coin'
  ? COIN_TIMELINE.spawnUntil + COIN_TIMELINE.maxDur * COIN_FALL_SCALE + COIN_TIMELINE.tail
  : scene.cycle;
const CYCLE = Math.max(0.2, num('cycle', sceneCycle));
// --poster puts the machine's one-sheet back above it (locked scene only).
const POSTER = flags.poster === true || flags.poster === 'true'
  ? true
  : (scene.poster !== false && !flags['no-poster']);
const SEED_FROM = typeof flags['seed-from'] === 'string' ? flags['seed-from'] : 'plumber';
// How many coins fall (coin scene only). Exposed because it is the one dial in
// these clips whose right value is a judgement about the finished frame rather
// than something the geometry decides — see the note on the scene default.
const COINS = Math.max(1, Math.round(num('coins', scene.coins ?? 260)));
if (!CABINETS.some((c) => c.id === SEED_FROM)) {
  console.error(`unknown cabinet "${SEED_FROM}" — try one of: ${CABINETS.map((c) => c.id).join(', ')}`);
  process.exit(1);
}

// The frame count has to be a whole number of cycles or the loop has a seam.
const PER_CYCLE = Math.max(1, Math.round(CYCLE * FPS));
const FULL = PER_CYCLE * REPEATS;
const TOTAL = Math.min(FULL, Math.round(num('frames', Infinity)) || Infinity);
const OUT = resolve(ROOT, outArg || `work/social/loop-${sceneArg}.mp4`);

console.log(`scene      ${sceneArg}`);
console.log(`loop       ${PER_CYCLE} frames x ${REPEATS} = ${TOTAL} frames, `
  + `${(TOTAL / FPS).toFixed(2)}s at ${FPS}fps, silent`);
console.log(`frame      ${OUT_W}x${OUT_H} from ${LOGICAL.w}x${LOGICAL.h.toFixed(0)} logical (zoom ${ZOOM})`);
if (TOTAL !== FULL) console.log(`           (--frames cut this short, so it will NOT loop cleanly)`);

// ------------------------------------------------------------- the painters

const ENTRY = `
import { drawToon, setInk } from '../src/sprites/toons.js';
import { cabinetPalette, deadScreenBurst } from '../src/sprites/arcade.js';
import { CABINET_BY_ID } from '../src/data/cabinets.js';
import { PROP_PAINTERS } from '../src/sprites/props.js';
import { Rng } from '../src/engine/rng.js';
import { drawTextCentered, textWidth } from '../src/engine/sprites.js';
import {
  paintConcourse, burstTime, burstPeriod, BURST_WINDOW, pose,
} from './lib/concourse-art.js';

${FRAME_BUFFER_SRC}

// ================================================================== locked
// An unplugged machine, crackling.
//
// The cadence is a deliberate lie and the only one in this scene. deadScreenBurst
// holds the static on for 0.42s out of a period of 6.5-11.7s, which is right for
// a room you walk through — a machine that pops once in a while is unsettling
// where one that pops constantly is a screensaver. It is useless as a video: 94%
// of a truthful clip is a still photograph, which on a feed reads as a broken
// upload rather than as a dead arcade.
//
// So the clip cuts out the dead air instead of speeding the burst up. The clock
// is walked from just before the burst window through it and a little past, then
// jumped back — every burst plays at its true 0.42s length and its true 18Hz
// noise stepping, there are just no minutes of nothing in between. Compressing
// the period instead would have given a fast chattering crackle, which is a
// different and worse thing.
//
// One burst per cycle, sitting dead centre of it. Two cycles is therefore two
// flashes, evenly spread, with a pause on both sides of each.
function paintLocked(ctx, LW, LH, cab, u, cycle, framing) {
  const seed = cabinetPalette(cab, false).seed;
  // Where the one burst in this cycle sits. Centred, so the quiet before it and
  // the quiet after it are the same length and the finished clip reads as evenly
  // spaced flashes rather than as a stutter with a gap after it.
  const LEAD = (cycle - BURST_WINDOW) / 2;
  // burstTime(seed, 0) is the instant the window opens; a whole period is added
  // so the clock stays positive across the lead-in.
  const t = burstTime(seed, 0) + burstPeriod(seed) - LEAD + u;
  const amt = deadScreenBurst(t, seed, false);
  // The room dims as the glass crackles, as if the burst is drawing what little
  // current is left. This is framing rather than something the hub models — but
  // it is the fiction's own premise, and it is what stops the frames between
  // bursts being byte-identical stills.
  const breathe = 0.05 * Math.sin((u / cycle) * Math.PI * 2);
  paintConcourse(ctx, LW, LH, {
    cab, locked: true, t, ambient: 0.52 * (1 - 0.22 * amt) + breathe, ...framing,
  });
}

// ==================================================================== gary
// Black. Gary leans in from off screen, finds you looking back, and goes.
//
// Every beat is a real rig control rather than a bespoke drawing: he enters and
// exits on x, and the panic is pose.faceSurprised — the rig's own surprise face,
// which widens the eyes, rounds the mouth and lifts the brows. He is drawn taller
// than the frame with his feet well below it, so the frame bottom cuts him at the
// waist. That is the whole trick: nothing here is a special "peeking" pose, it is
// the standing rig pushed most of the way out of shot.
//
// He stays FRONT ON. An earlier pass yawed him to camera with pose.turn on the
// eye-contact beat, which is a real control and the wrong one here — a
// three-quarter torso reads as a character in a scene, where front-on reads as
// something looking directly at you, and that is the entire joke. It also put his
// hip into a shape nobody could parse, which the waist crop now removes anyway.
//
// The background is nothing at all. A wall and a corner post to hide behind is the
// literal reading of poking your head round something, but it puts scenery in a
// clip whose only subject is a face — and the frame edge is already a perfectly
// good thing to appear from.
//
// He is the right character for it twice over: he is the one who knows he is dead
// and files it under someone else's problem, and he is the one who, in the finale,
// turns out to have had hands all along.
// SECONDS, not fractions of the cycle. This is the one scene whose timing is
// absolute, and it has to be: the clip is mostly black, and the black is a dial —
// how long Gary stays away governs how often he reads as happening, which is the
// whole joke — while the performance itself is fixed tuning that must not move
// when that dial does. As fractions, lengthening the clip to space him out stretched
// the pop-in and the flee along with it and turned a jump-scare into a slow fade.
//
// So: --cycle=N sets how long the CLIP is and the trailing black absorbs the
// difference. Gary always arrives GARY_LEAD in and always performs for the same
// 1.568s.
//
// [name, seconds]. Snappy — everything except the held shock is as short as it can
// be and still register: the pop-in and the exit are the fastest beats, and the
// hold is the longest, because it is the one the viewer is meant to read. These are
// the original fractions multiplied by the 2.8s cycle they were tuned at, so the
// performance is unchanged to the frame.
const BEATS = [
  ['lean', 0.308],
  ['look', 0.420],
  ['jolt', 0.140],
  ['held', 0.476],
  ['flee', 0.224],
];
const GARY_ACTION = BEATS.reduce((n, [, d]) => n + d, 0);   // 1.568s
// Black before he arrives. 0.616 of it is the lead the centred version had; the
// rest is deliberate dead air. See the scene default for the pairing with the tail.
const GARY_LEAD = 2.616;
// u is seconds into the cycle.
function beatAt(u) {
  let from = GARY_LEAD;
  if (u < from) return { name: 'empty', k: 0 };
  for (const [name, dur] of BEATS) {
    if (u < from + dur) return { name, k: (u - from) / dur };
    from += dur;
  }
  return { name: 'empty', k: 0 };
}
const easeOut = (k) => 1 - (1 - k) * (1 - k);
const easeIn = (k) => k * k;

function paintGary(ctx, LW, LH, u, cycle, t) {
  const b = beatAt(u);

  ctx.fillStyle = '#000';
  ctx.fillRect(-LW * 0.2, -LH * 0.2, LW * 1.4, LH * 1.4);

  // Where he is, as a fraction: 0 fully off frame, 1 fully leaning in.
  // kick is the startle — a short upward jolt, because a flinch goes up before it
  // goes anywhere else.
  let lean = 0;
  let kick = 0;
  let shocked = false;
  if (b.name === 'lean') lean = easeOut(b.k);
  else if (b.name === 'look') lean = 1;
  else if (b.name === 'jolt') {
    // A flinch, not a retreat. He barely moves; the shock is on his face, and the
    // leaving is a separate and much faster beat.
    lean = 1 - easeIn(b.k) * 0.05;
    kick = Math.sin(b.k * Math.PI);
    shocked = true;
  } else if (b.name === 'held') {
    lean = 0.95;
    // Settling out of the jolt, so the held beat is not a frozen frame.
    kick = Math.max(0, 1 - b.k * 3) * 0.35;
    shocked = true;
  } else if (b.name === 'flee') {
    lean = 0.95 * (1 - easeIn(b.k));
    shocked = true;
  }

  if (lean > 0.001) {
    // Sized and placed so the frame bottom lands on his waist. Measured off a
    // render rather than reasoned about: from the drawn top, his hat clears the
    // nominal height by about 0.105h, his chin sits at 0.386h and his waist at
    // 0.73h. Solving those for "waist on the bottom edge" puts the feet at
    // LH + 0.27h — well below the frame, which is the point. Cropping here is what
    // removes the hip: below the waist the rig is a standing pose seen from far too
    // close, and it read as a shape rather than as a body.
    // Sized off the WIDTH, not the height. At 4:5 these are the same number
    // (0.95 LH == 1.1875 LW) but only one of them survives a change of frame: key
    // it to LH and a 9:16 reel makes him half again as tall while the frame stays
    // 1080 wide, which puts his head through both sides. How big a character is
    // reads against the width he is standing in.
    const h = LW * 1.1875;
    // Half a head across, front on. This is NOT the 0.15h measured while he was
    // yawed 34 degrees — a turned head is narrower in projection, and reusing that
    // figure once he faced front put his stopping position far enough left that the
    // frame edge cut the side of his face off.
    const headR = h * 0.21;
    const hidden = -headR * 1.35;        // wholly off the left edge
    // He stops with a slice of himself still off the left edge. He is leaning past
    // something to look at you, not walking on stage; travelling to a third of the
    // frame made it a stride, and a shorter move is a snappier one for free.
    const shown = headR * 0.75;
    const x = hidden + lean * (shown - hidden);
    // Vertical placement still keys off LH, because what it is solving for is
    // "waist on the bottom edge" — see the measurements above. In a taller frame
    // that leaves more black over his head, which is where a Reel wants space
    // anyway: Instagram puts its own UI across the top of the screen.
    const feetY = LH + 0.27 * h - kick * LH * 0.018;
    // Thinner outlines than production, and a brow only once he needs one.
    //
    // The contours: the cast's are soft, translucent and sized to survive being
    // 24px tall over moving scenery; at ten times that on flat black they read as
    // a heavy border drawn round him. Same reasoning as tools/render-icon.js,
    // which thins them for the Home Screen tile.
    //
    // The brow: he leans in with a bare, neutral forehead and gets brows at the
    // instant he reacts, which is most of what sells the reaction. They are the
    // rig's startled shape (pose.browRaise, both lifted and level) rather than
    // its focus shape, which drives the inner ends down and reads as a glare —
    // wrong expression, and it was on his face from the first frame.
    //
    // Tamed, too: Gary's brow ink is his own red eye colour, and at full width
    // and saturation it is a pair of scarlet bars that read as furious.
    setInk(shocked
      ? { body: 0.42, face: 0.5, brow: 1.4, browA: 0.88, browL: 0.5 }
      : { body: 0.42, face: 0.5 });
    // No turn. Front-on is the shot.
    drawToon(ctx, 'gary', pose('idle', t, {
      facing: 1,
      faceSurprised: shocked,
      browRaise: shocked,
    }), x, feetY, h);
    setInk({});
  }
}

// ===================================================================== coin
// INSERT COIN flashes, then the arcade gets paid all at once.
//
// Not a loop in the sense the other two scenes are, but the same machinery: it
// opens on black and ends on black, so treating the whole arc as ONE cycle makes
// it repeat cleanly anyway. Timeline, in seconds:
//
//   0.0            black; INSERT COIN blinking, low in the frame
//   1.0 - 1.35     the prompt holds on and fades out — before any coin nears it
//   1.15           first coins start falling, sparse
//   1.15 - 3.1     the fall builds; spawn density rises the whole way
//   3.1            last coin spawns
//   ~4.25          the last one leaves the bottom of the frame
//   4.25 - 4.5     black
//
// Depth is done the way the jukebox visualizers do it: one z per coin driving
// size, fall speed and opacity together, so the far ones are small, slow and dim
// and the near ones are large, fast and bright. Sorted by z once at build time, so
// near coins draw over far ones without a per-frame sort.
//
// The face is rasterized ONCE into an offscreen plate and blitted per coin rather
// than running the painter fifty times a frame — two gradients per coin per frame
// is the one thing here that would actually be slow, and props.js caches its own
// painters for exactly this reason. The spin is then a horizontal squash of that
// plate over a constant-width edge, which is how a flat coin turns: when the face
// narrows to nothing the edge is what is left, and past ninety degrees the scale
// goes negative and mirrors it, which is the back.
// The prompt is gone BEFORE the first coin gets near it — the fall arriving over
// live text reads as an accident. Worst case is the biggest, fastest coin: it
// crosses in COIN_MIN_DUR and reaches the caption line at about 0.72 of that, so
// the earliest any coin touches the text is SPAWN_FROM + 0.72 * COIN_MIN_DUR =
// 1.51s. The fade finishes at 1.35s. That margin is thin — it is the first thing
// to recheck if these timings are compressed any further.
const COIN = ${JSON.stringify(COIN_TIMELINE)};
const COIN_BLINK_UNTIL = COIN.blinkUntil;
const COIN_FADE_END = COIN.fadeEnd;
const COIN_SPAWN_FROM = COIN.spawnFrom;
const COIN_SPAWN_UNTIL = COIN.spawnUntil;
const COIN_MIN_DUR = COIN.minDur;
const COIN_MAX_DUR = COIN.maxDur;
// Faster blink than the 0.55s first cut. The prompt only has a second before it
// starts going, and at 0.55s that is barely one on-off — too few to read as
// blinking rather than as one flicker. At 0.34 it gets three.
const COIN_BLINK_PERIOD = COIN.blinkPeriod;
const COIN_TEXT_Y = COIN.textY;   // bottom third
const COIN_PLATE_PX = 512;

// One plate per depth band, each baked at its own brightness.
//
// Depth was first done with globalAlpha, which is wrong and looks it: a distant
// coin came out see-through, so the coins behind it showed through the ones in
// front and the whole fall read as ghosts rather than as depth. Distance darkens
// an object, it does not make it transparent. Baking the darkening INTO the plate
// with source-atop keeps every coin opaque and costs four canvases in total,
// against one composite per coin per frame if it were done live.
const COIN_SHADES = [1, 0.78, 0.58, 0.42];
const coinPlates = [];
function coinFacePlate(band) {
  if (!coinPlates[band]) {
    const cv = document.createElement('canvas');
    cv.width = COIN_PLATE_PX;
    cv.height = COIN_PLATE_PX;
    const c = cv.getContext('2d');
    c.lineJoin = 'round';
    c.lineCap = 'round';
    PROP_PAINTERS.coin(c, COIN_PLATE_PX, COIN_PLATE_PX);
    const shade = COIN_SHADES[band];
    if (shade < 1) {
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = 'rgba(0,0,0,' + (1 - shade).toFixed(3) + ')';
      c.fillRect(0, 0, COIN_PLATE_PX, COIN_PLATE_PX);
      c.globalCompositeOperation = 'source-over';
    }
    coinPlates[band] = cv;
  }
  return coinPlates[band];
}

let coinPool = null;
function buildCoinPool(LW, LH, count) {
  if (coinPool) return coinPool;
  const fallScale = LH / (LW / ${COIN_TIMELINE.refAspect});
  const rng = new Rng(0xc01a5 >>> 0);
  const coins = [];
  for (let i = 0; i < count; i++) {
    const u = count > 1 ? i / (count - 1) : 0;
    // sqrt spacing of the start times makes the RATE climb: the derivative of
    // sqrt shrinks as u grows, so starts bunch up toward the end and the fall
    // thickens into a sea instead of arriving at a constant drizzle.
    const start = COIN_SPAWN_FROM + (COIN_SPAWN_UNTIL - COIN_SPAWN_FROM) * Math.sqrt(u);
    const z = rng.float();
    coins.push({
      start,
      z,
      x: rng.range(-0.06, 1.06) * LW,
      drift: rng.range(-0.02, 0.02) * LW,
      // Small. The coin painter is drawn for a pickup a few pixels across in a
      // run, and blown up to a third of the frame it stops reading as a coin —
      // the stamp becomes a shape and the highlight becomes a blob. Kept under a
      // seventh of the frame width, the whole spread reads as loose change.
      d: (0.035 + z * 0.105) * LW,
      // Scaled by how much taller this frame is than the 4:5 the durations were
      // tuned against, so a coin falls at the same SPEED in any frame rather than
      // crossing every frame in the same time. Without it a 9:16 reel is the same
      // fall played 1.4x faster, which streaks.
      dur: (COIN_MAX_DUR - z * (COIN_MAX_DUR - COIN_MIN_DUR)) * fallScale,
      spinRate: rng.range(0.9, 2.1),
      spinPhase: rng.float(),
      // Nearest band is brightest. Four bands rather than a continuum because
      // each one is a baked canvas.
      band: Math.min(COIN_SHADES.length - 1, Math.floor((1 - z) * COIN_SHADES.length)),
    });
  }
  coins.sort((a, b) => a.z - b.z);
  coinPool = coins;
  return coins;
}

function spinCoin(ctx, cx, cy, d, turns, band) {
  const face = Math.cos(turns * Math.PI * 2);
  const shade = COIN_SHADES[band];
  ctx.save();
  // The edge, always this wide. Under the face, so it only shows when the face is
  // narrow enough to stop covering it. Shaded to match its own plate.
  const edgeW = Math.max(0.35, d * 0.085);
  const mix = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.round(((n >> 16) & 255) * shade);
    const g = Math.round(((n >> 8) & 255) * shade);
    const b = Math.round((n & 255) * shade);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  };
  const edge = ctx.createLinearGradient(cx - edgeW / 2, 0, cx + edgeW / 2, 0);
  edge.addColorStop(0, mix('#a06f12'));
  edge.addColorStop(0.45, mix('#f0cc42'));
  edge.addColorStop(1, mix('#8d5f0e'));
  ctx.fillStyle = edge;
  ctx.beginPath();
  ctx.ellipse(cx, cy, edgeW / 2, d * 0.47, 0, 0, Math.PI * 2);
  ctx.fill();
  if (Math.abs(face) > 0.02) {
    ctx.translate(cx, cy);
    ctx.scale(face, 1);
    ctx.drawImage(coinFacePlate(band), -d / 2, -d / 2, d, d);
  }
  ctx.restore();
}

function paintCoin(ctx, LW, LH, u, cycle, count) {
  ctx.fillStyle = '#000';
  ctx.fillRect(-LW * 0.2, -LH * 0.2, LW * 1.4, LH * 1.4);
  const coins = buildCoinPool(LW, LH, count);

  // The prompt, behind the fall so the coins pass in front of it. Blinks the way
  // an attract screen blinks — hard on and off, no crossfade — then holds on and
  // goes as the first coins arrive over it.
  let textA = 0;
  if (u < COIN_BLINK_UNTIL) textA = ((u / COIN_BLINK_PERIOD) % 1) < 0.62 ? 1 : 0;
  else if (u < COIN_FADE_END) {
    textA = 1 - (u - COIN_BLINK_UNTIL) / (COIN_FADE_END - COIN_BLINK_UNTIL);
  }
  if (textA > 0.004) {
    const s = Math.min(LH * 0.055, (LW * 0.80) / textWidth('INSERT COIN', 1, 'title'));
    ctx.save();
    ctx.globalAlpha = textA;
    drawTextCentered(ctx, 'INSERT COIN', LW * 0.5, LH * COIN_TEXT_Y, '#f6d33c', s, 'title');
    ctx.restore();
  }

  for (const c of coins) {
    const k = (u - c.start) / c.dur;
    if (k <= 0 || k >= 1) continue;
    // Top of the travel is a coin-height above the frame, bottom a coin-height
    // below, so nothing pops into or out of existence inside the picture.
    const y = -c.d * 0.6 + k * (LH + c.d * 1.2);
    spinCoin(ctx, c.x + c.drift * k, y, c.d, c.spinPhase + u * c.spinRate, c.band);
  }
}

// ==================================================================== driver
window.__init = (cfg) => {
  const { scene, outW, outH, ss, fps, perCycle, logicalW, logicalH, seedFrom } = cfg;
  const fb = makeFrameBuffer(outW, outH, ss);
  const cab = CABINET_BY_ID[seedFrom];
  const cycle = perCycle / fps;
  const framing = {
    poster: cfg.poster, groundAt: cfg.groundAt,
    neighbours: cfg.neighbours, spacing: cfg.spacing, bare: cfg.bare,
  };
  // Logical-to-output cover fit, resolved once. Matched aspects make it uniform.
  const fit = Math.max((outW * ss) / logicalW, (outH * ss) / logicalH);
  const offX = ((outW * ss) - logicalW * fit) / 2;
  const offY = ((outH * ss) - logicalH * fit) / 2;

  const drawFrame = (frame) => {
    // Everything downstream is a function of the position WITHIN a cycle, which
    // is what makes the last frame hand off to the first.
    const u = (frame % perCycle) / fps;
    fb.hx.setTransform(1, 0, 0, 1, 0, 0);
    fb.hx.fillStyle = '#08050e';
    fb.hx.fillRect(0, 0, fb.hi.width, fb.hi.height);
    fb.hx.setTransform(fit, 0, 0, fit, offX, offY);
    if (scene === 'locked') paintLocked(fb.hx, logicalW, logicalH, cab, u, cycle, framing);
    else if (scene === 'coin') paintCoin(fb.hx, logicalW, logicalH, u, cycle, cfg.coins);
    else paintGary(fb.hx, logicalW, logicalH, u, cycle, u);
    fb.reduce();
  };

  // One warm-up frame, discarded. Chromium rasterizes a canvas's first draw on a
  // different path — the surface is only promoted to GPU acceleration once it has
  // been drawn to — so without this the opening frame differs by a few subpixels.
  // Same note as render-video.js.
  drawFrame(0);

  window.__batch = (from, count) => {
    const pngs = [];
    for (let f = from; f < from + count; f++) {
      drawFrame(f);
      pngs.push(fb.png());
    }
    return pngs;
  };
};
`;

// ----------------------------------------------------------------- render

const bundleJs = await bundleEntry(ENTRY, join(ROOT, 'tools'));
let browser;
let page;
try {
  ({ browser, page } = await openArtPage(bundleJs, { gpu: USE_GPU }));
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
console.log(`workers    1${USE_GPU ? ', GPU rasterization' : ', CPU rasterization'}`);

await page.evaluate((cfg) => window.__init(cfg), {
  scene: sceneArg, outW: OUT_W, outH: OUT_H, ss: SS, fps: FPS,
  perCycle: PER_CYCLE, logicalW: LOGICAL.w, logicalH: LOGICAL.h,
  seedFrom: SEED_FROM, poster: POSTER,
  groundAt: scene.groundAt ?? null, neighbours: scene.neighbours ?? 1,
  spacing: scene.spacing ?? null, bare: scene.bare === true,
  coins: COINS,
});

mkdirSync(dirname(OUT), { recursive: true });
// An mp4 has no moov atom until the encode finishes, so writing straight to the
// destination would leave an unopenable file there for the whole render — and
// take out a previous good version from the first byte. Same directory, so the
// rename into place is atomic.
const PARTIAL = join(dirname(OUT), `.${basename(OUT)}.partial`);
try {
  await pipeFrames({ page, total: TOTAL, fps: FPS, crf: CRF, outPath: PARTIAL });
} catch (err) {
  await browser.close();
  rmSync(PARTIAL, { force: true });
  console.error(`\n${err.message}`);
  process.exit(1);
}
await browser.close();
if (!existsSync(PARTIAL)) {
  console.error('ffmpeg reported success but wrote no file');
  process.exit(1);
}
renameSync(PARTIAL, OUT);
console.log(`\nwrote      ${OUT}  (${(TOTAL / FPS).toFixed(2)}s, silent)`);
