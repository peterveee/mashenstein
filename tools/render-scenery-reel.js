// The scenery reel: every animated backdrop item in PLUMBER PANIC, SPEED ZONE and
// FROST FORTRESS, one of each kind, each one the subject of its own close-up.
//
//   MASH_DEV_URL=http://localhost:8001 node tools/render-scenery-reel.js            everything
//   ... --probe [--shots=barn,robin]    contact sheets at each shot's crop, fast
//   ... --probe --wide --shots=barn     the whole frame with a 4K grid, to find a subject
//   ... --capture-only --shots=barn     recapture shots only
//   ... --audio-only                    rebuild the soundtrack
//   ... --assemble                      cut the saved shots + soundtrack into the export
//   node tools/render-scenery-reel.js --script                                  the shot list
//
// Everything it writes lands in work/local/scenery-reel-build/; the review copy is
// work/social/mashenstein-scenery-reel-16x9.mp4.
//
// HOW A SHOT IS MADE. The capture core is tools/render-feature-reel.js's (stage loaded at
// a fixed seed and startAt, the render loop paused, every frame stepped offline at 60 Hz,
// a 4K canvas cropped). What is new here is the frame and the camera:
//   - THE FRAME IS ONLY SCENERY. No HUD (captureCleanPlate), no hero, no lane (the spawner
//     is stubbed), no coins or capsules, no speech or floaties, no relay portal, and no
//     Eggshell copter on the speed-2 chase.
//   - THE CAMERA DRIFTS. `drift` scales the run's speed: it eases from full speed down to
//     `drift` across the pre-roll and holds there for the whole shot, so the item lingers
//     in frame while its animation plays on the scenery clock (run.backgroundT), which
//     does not depend on speed. A steady speed keeps the parallax linear, so the `pan`
//     crop can follow the subject in a straight line. Items whose motion IS the scroll
//     (the rocket launch, the jet, the reindeer herd) keep drift 1.
//
// THE SOUND. Each cabinet plays under its own song, from bar 1, and every shot is cut on
// that song's bar lines. The only game cue kept is the speed trap's shutter — everything
// else the capture logs is the hidden hero's.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, copyFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { openRenderer } from './lib/render-bank-browser.js';
import { openCueRenderer } from './lib/cue-render.js';
import { wavBuffer, SR } from './lib/wav.js';
import * as plumberSong from '../src/data/songs/plumber.js';
import * as speedSong from '../src/data/songs/speed.js';
import * as frostSong from '../src/data/songs/frost.js';

const ROOT = resolve(import.meta.dirname, '..');
const DIR = join(ROOT, 'work/local/scenery-reel-build');
const OUT = join(ROOT, 'work/social/mashenstein-scenery-reel-16x9.mp4');
const BASE = process.env.MASH_DEV_URL || 'http://localhost:8001';
const FPS = 60;
const W = 1920, H = 1080;        // the export
const SW = 3840, SH = 2160;      // the capture
mkdirSync(DIR, { recursive: true });

// One segment per cabinet: its song, its hero (hidden, but the speed trap's mugshot is
// of him), and the card that opens it.
const CABS = {
  plumber: { name: 'PLUMBER PANIC', song: plumberSong, hero: 'lorenzo' },
  speed: { name: 'SPEED ZONE', song: speedSong, hero: 'rusty' },
  frost: { name: 'FROST FORTRESS', song: frostSong, hero: 'grumpos' },
};
const barOf = (cab) => 240 / CABS[cab].song.bank.bpm;

const WIDE = [0, 0, SW, SH];

// THE CUT, in the order a run meets the items. `bars` is on the segment's song. `at` is
// startAt (% of the stage); `finish` drops in that many seconds before the tape instead.
// `pre` is pre-roll, `drift` the camera speed through the shot (see the header), `bgT`
// the scenery clock at frame 0; `keepRoutes` keeps the lane's floating islands. `pan` is the subject's centre in 4K px at the first and
// last frame, measured off a --probe --wide sheet; `res` renders from a bigger canvas so
// a tight crop stays 1:1.
export const shots = [
  // PLUMBER PANIC — 112 BPM, 16 bars: the whole song
  { id: 'sun', cab: 'plumber', caption: 'THE SUN', bars: 1.5, stage: 'plumber-1', at: 2, pre: 1, drift: 0.3, bgT: 60, pan: { w: 1920, from: [2770, 500], to: [2730, 490] },
    note: 'The sun: rays turning, the disc breathing.' },
  { id: 'cloudpal', cab: 'plumber', caption: 'CLOUD PAL', bars: 2, stage: 'plumber-1', at: 3, pre: 1, drift: 0.3, bgT: 135, pan: { w: 1920, from: [2545, 520], to: [2995, 540] },
    note: 'The cloud pal looks about and giggles; the flock drifts behind.' },
  { id: 'barn', cab: 'plumber', caption: 'BARN, HENS & ROBIN', bars: 2, stage: 'plumber-1', at: 5, pre: 1.5, drift: 0.3, pan: { w: 1920, from: [3040, 1110], to: [2400, 1110] }, bgT: 15.275,
    note: 'The barn: rooster vane, hoist rope, three pecking hens, and the robin popping out of the hedge at its foot.' },
  { id: 'volcano', cab: 'plumber', caption: 'VOLCANO', bars: 1.5, stage: 'plumber-1', at: 48, pre: 1.5, drift: 0.3, pan: { w: 1920, from: [1950, 720], to: [1770, 720] },
    note: 'The volcano puffs smoke.' },
  { id: 'sheep', cab: 'plumber', caption: 'SHEEPDOG', bars: 2, stage: 'plumber-1', at: 66, pre: 1.5, drift: 0.3, pan: { w: 1920, from: [2060, 1370], to: [1210, 1340] },
    note: 'The collie runs out and back; the sheep turn and scurry.' },
  { id: 'fields', cab: 'plumber', caption: 'PATCHWORK FIELDS', bars: 1.5, stage: 'plumber-1', at: 92, pre: 1.5, drift: 0.3, pan: { w: 1920, from: [2400, 1250], to: [2150, 1250] },
    note: 'The patchwork fields: cloud shadows slide over the quilt; a tiny tractor ploughs, mostly behind the near hill.' },
  { id: 'balloons', cab: 'plumber', caption: 'HOT-AIR BALLOONS', bars: 1.5, stage: 'plumber-2', at: 20, pre: 1.5, drift: 0.3, pan: { w: 1920, from: [1960, 420], to: [1793, 440] }, bgT: 39,
    note: 'A hot-air balloon: the burner fires, the passenger waves.' },
  { id: 'cottage', cab: 'plumber', caption: 'COTTAGE', bars: 2, stage: 'plumber-2', at: 57, pre: 1.5, drift: 0.3, pan: { w: 1920, from: [2190, 1460], to: [1300, 1460] },
    note: 'The pink cottage: gate swinging, Labrador wagging, hens, sunflowers, smoke.' },
  { id: 'windmill', cab: 'plumber', caption: 'WINDMILL', bars: 2, stage: 'plumber-3', at: 34, pre: 1.5, drift: 0.3, pan: { w: 1920, from: [2127, 1060], to: [1420, 1060] },
    note: 'The windmill turning on its hill.' },
  // SPEED ZONE — 128 BPM, 24 bars: one pass of the form
  { id: 'windpump', cab: 'speed', caption: 'WIND PUMP', bars: 1, stage: 'speed-1', at: 4, pre: 1.5, drift: 0.3, pan: { w: 1920, from: [1890, 560], to: [1725, 560] },
    note: 'The wind pump over its stock tank: wheel turning, rod stroking.' },
  { id: 'vultures', cab: 'speed', caption: 'VULTURES', bars: 1, stage: 'speed-1', at: 10, pre: 1.5, drift: 0.3, pan: { w: 1920, from: [2500, 470], to: [2280, 470] },
    note: 'Vultures circling on a thermal.' },
  { id: 'tumbleweed', cab: 'speed', caption: 'TUMBLEWEEDS', bars: 1, stage: 'speed-1', at: 25, pre: 1.5, drift: 0.3, pan: { w: 1920, from: [2040, 1150], to: [1910, 1180] },
    note: 'A tumbleweed bouncing along on the wind.' },
  { id: 'bigear', cab: 'speed', caption: 'THE BIG EAR', bars: 1.5, stage: 'speed-1', at: 37, pre: 1.5, drift: 0.3, bgT: 32.4, pan: { w: 1920, from: [1890, 580], to: [1650, 580] },
    note: 'The radio telescope re-aims, step and hold; the feed lamp blinks.' },
  { id: 'pumpjacks', cab: 'speed', caption: 'PUMPJACKS', bars: 1, stage: 'speed-1', at: 41.5, pre: 1.5, drift: 0.3, pan: { w: 1920, from: [2091, 760], to: [1811, 760] },
    note: 'Two pumpjacks nodding out of step.' },
  { id: 'smoke', cab: 'speed', caption: 'CAMPFIRE SMOKE', bars: 1, stage: 'speed-1', at: 49.5, pre: 1.5, drift: 0.3, pan: { w: 1920, from: [2200, 660], to: [1820, 660] },
    note: 'A campfire plume swaying on its own wind.' },
  { id: 'devil', cab: 'speed', caption: 'DUST DEVIL', bars: 1, stage: 'speed-1', at: 72.2, pre: 1.5, drift: 0.3, pan: { w: 1920, from: [2900, 640], to: [2560, 640] },
    note: 'A dust devil winding across the flats.' },
  { id: 'howl', cab: 'speed', caption: 'COYOTE: HOWL', bars: 1.5, stage: 'speed-1', at: 77, pre: 1.5, drift: 0.3, bgT: 102.2, pan: { w: 1920, from: [2000, 1060], to: [1230, 1070] },
    note: 'The coyote on its ledge howls.' },
  { id: 'turbines', cab: 'speed', caption: 'WIND TURBINES', bars: 1, stage: 'speed-1', at: 94, pre: 1.5, drift: 0.3, pan: { w: 1920, from: [3040, 560], to: [3040, 560] },
    note: 'The wind farm turning.' },
  { id: 'trap', cab: 'speed', caption: 'SMILE!', bars: 2, stage: 'speed-2', at: 2, pre: 0, drift: 1, sfx: true, pan: { w: 1920, from: [3333, 1075], to: [-100, 1075] },
    note: "The speed camera: SMILE!, the flash, then GOTCHA with Rusty's mugshot while the patrol lights go." },
  { id: 'lookout', cab: 'speed', caption: 'FIRE LOOKOUT', bars: 1, stage: 'speed-2', at: 4, pre: 1.5, drift: 0.3, pan: { w: 1920, from: [1884, 520], to: [1705, 520] },
    note: 'The fire lookout: flag flapping, windows glinting.' },
  { id: 'mast', cab: 'speed', caption: 'RADIO MAST', bars: 1, stage: 'speed-2', at: 56, pre: 1.5, drift: 0.3, pan: { w: 1920, from: [1959, 860], to: [1780, 860] },
    note: 'The radio mast, beacons blinking.' },
  { id: 'chorus', cab: 'speed', caption: 'COYOTE: CHORUS', bars: 2.5, stage: 'speed-2', at: 77, pre: 1.5, drift: 0.3, pan: { w: 1920, from: [2018, 1060], to: [650, 1060] },
    note: 'A pup on the ledge yips, then howls along with its parent.' },
  { id: 'rocket', cab: 'speed', caption: 'ROCKET LAUNCH', bars: 2.5, stage: 'speed-3', at: 3, pre: 0.5, drift: 1, pan: { w: 1920, from: [2180, 450], to: [620, 450] },
    note: 'The rocket vents, ignites, lifts off the pad and climbs out of the picture.' },
  { id: 'jet', cab: 'speed', caption: 'SUPERSONIC JET', bars: 1.5, stage: 'speed-3', at: 46, pre: 0.5, drift: 1, pan: { w: 1920, from: [860, 700], to: [3000, 640] },
    note: 'The jet goes supersonic: vapour cone, shock ring, contrail.' },
  { id: 'yawn', cab: 'speed', caption: 'COYOTE: YAWN', bars: 2, stage: 'speed-3', at: 77, pre: 1.5, drift: 0.3, pan: { w: 1920, from: [2015, 1070], to: [1025, 1090] },
    note: 'A coyote yawns and settles down on its ledge to doze.' },
  { id: 'wink', cab: 'speed', caption: 'COYOTE: WINK', bars: 1.5, stage: 'speed-3', finish: 5, pre: 5.2, drift: 1, pan: { w: 1920, from: [1850, 1150], to: [1850, 1150] },
    note: 'The coyote by the finish tape waits for the hero, then cocks a brow, winks and grins.' },
  // FROST FORTRESS — 100 BPM, 20.5 bars, then the end card
  { id: 'lift', cab: 'frost', caption: 'CHAIR LIFT', bars: 1.5, stage: 'frost-1', at: 1, pre: 0.5, drift: 0.3, pan: { w: 1920, from: [800, 700], to: [800, 700] },
    note: 'Chair-lift cabins riding down the cable into the hills.' },
  { id: 'fox', cab: 'frost', caption: 'ARCTIC FOX', bars: 2, stage: 'frost-1', at: 24, pre: 0.8, drift: 0.3, pan: { w: 1920, from: [3000, 1100], to: [2450, 1120] },
    note: 'The fox trots in, cocks its head, dives into the snow and backs out with a shake.' },
  { id: 'wolves', cab: 'frost', caption: 'WOLVES', bars: 2, stage: 'frost-1', at: 34.6, pre: 1.5, drift: 0.3, pan: { w: 1920, from: [2445, 1060], to: [1356, 1060] },
    note: 'Three wolves on a ledge: the leader howls and the others join in.' },
  { id: 'bears', cab: 'frost', caption: 'POLAR BEARS', bars: 1.5, stage: 'frost-1', at: 42, pre: 1.5, drift: 0.3, pan: { w: 1920, from: [2890, 1260], to: [2220, 1280] },
    note: 'A polar bear and her cub amble along the crest.' },
  { id: 'igloo', cab: 'frost', caption: 'IGLOO & HUSKY', bars: 1.5, stage: 'frost-1', at: 85, pre: 1.5, drift: 0.3, pan: { w: 1920, from: [2540, 1100], to: [1810, 1110] },
    note: 'The igloo steams; the husky by the door howls.' },
  { id: 'cabin', cab: 'frost', caption: 'LOG CABIN', bars: 1, stage: 'frost-2', at: 5, pre: 1.5, drift: 0.3, pan: { w: 1920, from: [1950, 1020], to: [1620, 1040] },
    note: 'The log cabin: chimney smoke, lit windows.' },
  { id: 'fortress', cab: 'frost', caption: 'FORTRESS', bars: 1, stage: 'frost-2', at: 15, pre: 1.5, drift: 0.3, pan: { w: 1920, from: [1190, 1030], to: [1030, 1040] },
    note: 'A fortress on the far ridge, its windows blinking.' },
  { id: 'reindeer', cab: 'frost', caption: 'REINDEER', bars: 1.5, stage: 'frost-2', at: 84, pre: 0.5, drift: 1, pan: { w: 1920, from: [1400, 1150], to: [2600, 1050] },
    note: 'The reindeer herd gallops along the far crest.' },
  { id: 'beacon', cab: 'frost', caption: 'BEACON TOWER', bars: 1, stage: 'frost-3', at: 35, pre: 1.5, drift: 0.3, pan: { w: 1920, from: [2151, 920], to: [1718, 900] },
    note: 'The beacon tower: signal fire, sparks, pennant.' },
  { id: 'groomer', cab: 'frost', caption: 'SNOW GROOMER', bars: 1.5, stage: 'frost-3', at: 67, pre: 1.5, drift: 0.3, pan: { w: 1920, from: [2860, 1140], to: [2420, 1180] },
    note: 'The snow groomer crawls along the crest, headlights through the snow.' },
  { id: 'blizzard', cab: 'frost', caption: 'BLIZZARD', bars: 1.5, stage: 'frost-3', at: 72, pre: 1, drift: 0.3, pan: { w: 3200, from: [1920, 1000], to: [1920, 1000] },
    note: 'The storm at its height.' },
  { id: 'aurora', cab: 'frost', caption: 'AURORA', bars: 1, stage: 'frost-3', at: 74, pre: 1.5, drift: 0.3, pan: { w: 1920, from: [2880, 540], to: [2880, 540] },
    note: 'Aurora curtains drifting and breathing.' },
  { id: 'sled', cab: 'frost', caption: 'HUSKY SLED', bars: 1.5, stage: 'frost-3', at: 76, pre: 1.5, drift: 0.3, pan: { w: 1920, from: [2100, 1170], to: [1720, 1180] },
    note: 'The husky sled with its lantern, glowing through the storm.' },
  { id: 'sleigh', cab: 'frost', caption: "SANTA'S SLEIGH", bars: 1.5, stage: 'frost-3', finish: 5, pre: 3, drift: 1, pan: { w: 1920, from: [960, 560], to: [2880, 520] },
    note: 'The sleigh arcs over the finish pole.' },
  // The feature reel's end card; the frost song tape-stops under it.
  { id: 'title', title: true, secs: 5.2, note: "The teaser's end card: marquee, swinging plug, sign-off." },
];
// --override='{"wink":{"pre":6}}' merges fields into shots for one run, for trying a
// framing or a clock without editing the table (timings still come from the table).
for (const [id, fields] of Object.entries(JSON.parse(process.argv.find((x) => x.startsWith('--override='))?.slice(11) || '{}'))) {
  const shot = shots.find((x) => x.id === id);
  if (!shot) throw new Error(`--override: no shot ${id}`);
  Object.assign(shot, fields);
}

// Frame boundaries come from the running total in seconds, so rounding never
// accumulates: every cut is within half a frame of its bar line.
const lenOf = (s) => (s.title ? s.secs : s.bars * barOf(s.cab));
const bounds = new Map();
{
  let t = 0;
  for (const s of shots) {
    const f0 = Math.round(t * FPS);
    t += lenOf(s);
    bounds.set(s.id, { f0, f1: Math.round(t * FPS) });
  }
}
const frames = (s) => bounds.get(s.id).f1 - bounds.get(s.id).f0;
const start = (id) => bounds.get(id).f0 / FPS;
const TOTAL_FRAMES = bounds.get(shots.at(-1).id).f1;
const TOTAL = TOTAL_FRAMES / FPS;
const FADE_IN = 1.0, FADE_OUT = 0.8;
const segments = Object.keys(CABS).map((cab) => {
  const list = shots.filter((s) => s.cab === cab);
  return { cab, first: list[0], last: list.at(-1), bars: list.reduce((n, s) => n + s.bars, 0) };
});

// The words over the picture: a card on each cabinet's first shot, and every shot's
// caption. Both are drawn by renderText; `at`/`dur` are seconds into the shot.
export const texts = [
  ...segments.map(({ cab, first }) => ({ shot: first.id, at: 0.15, dur: lenOf(first) - 0.35, style: 'cabinet', text: CABS[cab].name })),
  ...shots.filter((s) => s.caption).map((s) => ({ shot: s.id, at: 0.2, dur: lenOf(s) - 0.5, style: 'label', text: s.caption })),
];

const arg = (k) => process.argv.includes(k);

function command(bin, args) {
  const r = spawnSync(bin, args, { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${bin} exited ${r.status}`);
}

// ---------------------------------------------------------------- capture

async function openShot(browser, shot, probe) {
  const scale = (probe ? 0.5 : 1) * (shot.res || 1);
  const page = await browser.newPage({ viewport: { width: SW * scale, height: SH * scale } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const where = shot.finish ? `finish=${shot.finish}` : `startAt=${shot.at}`;
  const q = `?mute&density=${8 * (shot.res || 1)}&goto=stage&cab=${shot.stage.split('-')[0]}&stage=${shot.stage}`
    + `&hero=${shot.hero || CABS[shot.cab].hero}&seed=${shot.seed ?? 7}&${where}`;
  await page.goto(`${BASE}/${q}`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__mash_booted && window.__mash_render_loop
    && window.__mash_state === 'RunState', null, { timeout: 30000 });
  await page.evaluate(({ shot, scale }) => {
    const run = window.__mash_cur;
    window.__mash_render_loop.pause();
    // ONLY SCENERY IN THE FRAME.
    run.captureCleanPlate = true;
    if (window.__mash_dev) { window.__mash_dev.draw = () => {}; window.__mash_dev.hideSpecialOrb = true; }
    run.say = () => {};
    run.speech = null;
    if (run.speechQueue) run.speechQueue.length = 0;
    run.floatText = () => {};
    run.floaties = [];
    if (run.relay) run.relay.portalDue = () => false;
    run.rhythmHeroVisible = () => false;
    // speed-2 is the chase: Eggshell would hover over every shot of it.
    run.copter = null;
    run.spawner.fill = () => {};
    run.dripUpdate = () => {};
    run.spawnScriptedPits = () => {};
    run.spawnApplianceMaybe = () => {};
    run.spawnScriptedRewindMaybe = () => {};
    run.spawnDogSign = () => {};
    run.obstacles.splice(0);
    // The high road's floating islands are lane, not scenery: they sweep across a
    // close-up faster than anything behind them.
    if (!shot.keepRoutes) run.routes = [];
    if (Number.isFinite(shot.bgT)) run.backgroundT = run.prevBackgroundT = shot.bgT - (shot.pre || 0);
    const A = window.__mash_audio;
    const R = window.__reel = { frame: 0, events: [], shot, scale, speedK: 1, run };
    // THE DRIFT. The run's own speed, scaled on this instance only.
    let proto = Object.getPrototypeOf(run), desc;
    while (proto && !(desc = Object.getOwnPropertyDescriptor(proto, 'speed'))) proto = Object.getPrototypeOf(proto);
    Object.defineProperty(run, 'speed', { configurable: true, get() { return desc.get.call(this) * R.speedK; } });
    const sfx = A.sfx;
    A.sfx = function (name, opt = {}) {
      let o = {};
      try { o = JSON.parse(JSON.stringify(opt || {})); } catch { /* shapes are data */ }
      R.events.push({ f: R.frame, name, opt: o });
      return sfx.call(A, name, opt);
    };
    R.out = document.createElement('canvas');
    R.out.width = 1920; R.out.height = 1080;
    R.ctx = R.out.getContext('2d');
    R.ctx.imageSmoothingEnabled = true;
    R.ctx.imageSmoothingQuality = 'high';
  }, { shot, scale });
  return { page, errors };
}

function cropAt(shot, t) {
  if (shot.pan) {
    const u = t / (frames(shot) / FPS);
    const [fx, fy] = shot.pan.from, [tx, ty] = shot.pan.to;
    const w = shot.pan.w, h = w * 9 / 16;
    const x = Math.max(0, Math.min(SW - w, fx + (tx - fx) * u - w / 2));
    const y = Math.max(0, Math.min(SH - h, fy + (ty - fy) * u - h / 2));
    return [x, y, w, h];
  }
  return shot.crop || WIDE;
}

// The camera's speed factor at frame i: full speed at the top of the pre-roll, easing
// (smoothstep) to `drift` by frame 0, then steady.
function speedK(shot, i) {
  const d = shot.drift ?? 1;
  const pre = Math.round((shot.pre || 0) * FPS);
  if (d === 1 || pre === 0) return d;
  const u = Math.min(1, Math.max(0, (i + pre) / pre));
  return 1 + (d - 1) * u * u * (3 - 2 * u);
}

// Step frames [from, to) and return frames for those `grab` picks. `grid` draws the 4K
// coordinate grid a wide probe is measured on.
async function stepFrames(page, shot, from, to, grab, fmt, outW, grid) {
  const plan = [];
  for (let i = from; i < to; i++) plan.push({ i, k: speedK(shot, i), grab: grab(i) ? cropAt(shot, i / FPS) : null });
  return page.evaluate(({ plan, fmt, outW, grid }) => {
    const R = window.__reel;
    // The run this shot opened on, even once the finish has handed the frame on.
    const run = R.run;
    const out = [];
    for (const p of plan) {
      R.frame = p.i;
      R.speedK = p.k;
      // Coins and capsules come from several places (trails, roads, drips); none of them
      // is scenery, so the list is emptied every frame and never drawn.
      if (run.pickups.length) run.pickups.length = 0;
      if (run.copter) run.copter = null;
      // The finish hands the frame to its own sequence, which resumes the loop.
      window.__mash_render_loop.pause();
      window.__mash_render_loop.stepOffline();
      if (!p.grab) continue;
      const s = R.scale;
      const [x, y, w, h] = p.grab;
      const cw = outW, ch = Math.round(outW * 9 / 16);
      if (R.out.width !== cw) { R.out.width = cw; R.out.height = ch; R.ctx.imageSmoothingQuality = 'high'; }
      R.ctx.drawImage(document.getElementById('game'), x * s, y * s, w * s, h * s, 0, 0, cw, ch);
      if (grid === 'label') {
        const c = R.ctx;
        c.save();
        c.font = `bold ${Math.round(cw / 14)}px monospace`;
        c.lineWidth = 4; c.strokeStyle = '#000'; c.fillStyle = '#ff0';
        const label = `${(run.camX / run.totalDist * 100).toFixed(1)}%`;
        c.strokeText(label, 8, cw / 12); c.fillText(label, 8, cw / 12);
        c.restore();
      } else if (grid) {
        const c = R.ctx, k = cw / w;
        c.save();
        c.strokeStyle = 'rgba(255,0,255,0.55)'; c.fillStyle = '#f0f'; c.lineWidth = 1;
        c.font = `${Math.round(cw / 60)}px monospace`;
        for (let gx = 0; gx <= 3840; gx += 240) {
          c.beginPath(); c.moveTo((gx - x) * k, 0); c.lineTo((gx - x) * k, ch); c.stroke();
          if (gx % 480 === 0) c.fillText(String(gx), (gx - x) * k + 2, cw / 50);
        }
        for (let gy = 0; gy <= 2160; gy += 240) {
          c.beginPath(); c.moveTo(0, (gy - y) * k); c.lineTo(cw, (gy - y) * k); c.stroke();
          c.fillText(String(gy), 2, (gy - y) * k - 2);
        }
        c.fillText(`f${p.i}`, cw - cw / 12, ch - 6);
        c.restore();
      }
      out.push(R.out.toDataURL(fmt, 0.9).split(',')[1]);
    }
    return out;
  }, { plan, fmt, outW, grid });
}

async function shotState(page) {
  return page.evaluate(() => {
    const run = window.__reel.run;
    const n = (v, d) => (Number.isFinite(v) ? +v.toFixed(d) : null);
    return {
      f: window.__reel.frame, speed: n(run.speed, 1), camX: n(run.camX, 0),
      prog: n(run.camX / run.totalDist * 100, 1), bgT: n(run.backgroundT, 2),
      state: window.__mash_state, blizzard: run.blizzard != null ? +(+run.blizzard).toFixed(2) : null,
      obs: run.obstacles?.length, pickups: run.pickups?.length, copter: !!run.copter, pad: n(run.flip?.t, 2),
    };
  });
}

// PROBE: step the whole shot at half resolution, keep a frame every `every` frames at its
// crop (or the whole frame, gridded, with --wide), tile them, and log the run's state.
async function probeShot(browser, shot, wide) {
  const { page, errors } = await openShot(browser, shot, true);
  const n = frames(shot);
  const pre = Math.round((shot.pre || 0) * FPS);
  const every = wide ? 24 : 12;
  const log = [];
  const tiles = [];
  try {
    for (let a = -pre; a < n; a += every) {
      const b = Math.min(n, a + every);
      const got = await stepFrames(page, shot, a, b, (i) => i >= 0 && i === a, 'image/jpeg', wide ? 960 : 640, wide);
      tiles.push(...got);
      if (a >= 0) log.push(await shotState(page));
    }
    const events = await page.evaluate(() => window.__reel.events);
    const dir = join(DIR, 'probe', shot.id + (wide ? '-wide' : ''));
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    tiles.forEach((b64, i) => writeFileSync(join(dir, `${String(i).padStart(3, '0')}.jpg`), Buffer.from(b64, 'base64')));
    const cols = wide ? 3 : 5;
    command('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '1', '-i', join(dir, '%03d.jpg'),
      '-vf', `tile=${cols}x${Math.ceil(tiles.length / cols)}:padding=4`, '-frames:v', '1',
      join(DIR, `probe-${shot.id}${wide ? '-wide' : ''}.jpg`)]);
    writeFileSync(join(DIR, `probe-${shot.id}.json`), JSON.stringify({ log, events, errors }, null, 1));
    console.log(`\n== ${shot.id} (${shot.stage} ${shot.finish ? `finish-${shot.finish}s` : `@${shot.at}`}) every ${(every / FPS).toFixed(1)} s`);
    for (const s of log) {
      console.log(`  ${(s.f / FPS).toFixed(1).padStart(4)}s  ${s.state} prog ${s.prog}% camX ${s.camX} spd ${s.speed} bgT ${s.bgT}`
        + `${s.blizzard != null ? ` snow ${s.blizzard}` : ''}${s.obs ? ` obs ${s.obs}` : ''}${s.pickups ? ` pickups ${s.pickups}` : ''}${s.copter ? ' COPTER' : ''}${s.pad != null ? ` pad ${s.pad}` : ''}`);
    }
    console.log(`  cues: ${events.map((e) => `${(e.f / FPS).toFixed(2)} ${e.name}`).join(', ') || 'none'}`);
    if (errors.length) console.log(`  page errors: ${errors.slice(0, 3).join(' | ')}`);
  } finally { await page.close(); }
}

// SCOUT: run a stage fast (2.5x) from `from`% to `to`% with nothing staged but the
// clean frame, and keep the whole picture every half second of travel, labelled with
// its progress — the map for finding hash-placed scenery (bushes, flocks, coyotes).
async function scoutStage(browser, spec) {
  const [stage, range = '1-99'] = spec.split(':');
  const [from, to] = range.split('-').map(Number);
  const cab = stage.split('-')[0];
  const shot = { id: `scout-${stage}`, cab, stage, at: from, pre: 0, drift: 2.5 };
  const { page, errors } = await openShot(browser, shot, true);
  const dir = join(DIR, 'scout', `${stage}-${from}-${to}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  let n = 0;
  try {
    for (let a = 0; ; a += 30) {
      let got;
      try { got = await stepFrames(page, shot, a, a + 30, (i) => i === a, 'image/jpeg', 480, 'label'); } catch (e) {
        console.log(`  ${stage}: stopped at tile ${n} (${e.message.split('\n')[0]})`);
        break;
      }
      writeFileSync(join(dir, `${String(n++).padStart(3, '0')}.jpg`), Buffer.from(got[0], 'base64'));
      const prog = await page.evaluate(() => window.__mash_cur.camX / window.__mash_cur.totalDist * 100);
      if (prog >= to || n > 400 || await page.evaluate(() => window.__mash_state !== 'RunState')) break;
    }
  } finally { await page.close(); }
  // Sheets of 24 (6 x 4), small enough to read one at a time.
  const all = readdirSync(dir).filter((f) => f.endsWith('.jpg')).sort();
  for (let s = 0; s * 24 < all.length; s++) {
    const part = all.slice(s * 24, s * 24 + 24);
    const list = join(dir, `sheet-${s}.txt`);
    writeFileSync(list, part.map((f) => `file '${join(dir, f)}'`).join('\n') + '\n');
    command('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list,
      '-vf', `tile=6x${Math.ceil(part.length / 6)}:padding=3`, '-frames:v', '1',
      join(DIR, `scout-${stage}-${from}-${to}-${s}.jpg`)]);
  }
  console.log(`scouted ${stage} ${from}-${to}%: ${all.length} frames${errors.length ? `; page errors: ${errors.slice(0, 2).join(' | ')}` : ''}`);
}

async function captureShot(browser, shot) {
  const { page, errors } = await openShot(browser, shot, false);
  const size = await page.evaluate(() => { const c = document.getElementById('game'); return [c.width, c.height]; });
  const res = shot.res || 1;
  if (size[0] !== SW * res || size[1] !== SH * res) throw new Error(`Expected ${SW * res}x${SH * res}, got ${size.join('x')}`);
  const n = frames(shot);
  const pre = Math.round((shot.pre || 0) * FPS);
  const mp4 = join(DIR, `${shot.id}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS),
    '-i', 'pipe:0', '-frames:v', String(n), '-vf', 'setsar=1',
    '-c:v', 'libx264', '-preset', 'medium', '-tune', 'animation', '-crf', '12', '-pix_fmt', 'yuv420p', mp4],
  { cwd: ROOT, stdio: ['pipe', 'inherit', 'inherit'] });
  let written = 0;
  try {
    for (let a = -pre; a < n; a += 4) {
      const b = Math.min(n, a + 4);
      const got = await stepFrames(page, shot, a, b, (i) => i >= 0, 'image/png', W, false);
      for (const png of got) {
        if (!ff.stdin.write(Buffer.from(png, 'base64'))) await once(ff.stdin, 'drain');
        written++;
      }
    }
    ff.stdin.end();
    const [code] = await once(ff, 'close');
    if (code !== 0) throw new Error(`ffmpeg exited ${code} for ${shot.id}`);
    if (written !== n) throw new Error(`captured ${written}/${n} frames for ${shot.id}`);
    const events = await page.evaluate(() => window.__reel.events);
    writeFileSync(join(DIR, `${shot.id}.sfx.json`), JSON.stringify(events, null, 1));
    console.log(`captured ${shot.id}: ${n} frames`);
    if (errors.length) console.log(`  page errors: ${errors.slice(0, 3).join(' | ')}`);
  } finally { await page.close(); }
}

// The end card is the feature reel's, already rendered at 5.2 s (its source script is
// gone from work/local/teaser/).
function captureTitle(shot) {
  const src = join(ROOT, 'work/local/feature-reel-build/title.mp4');
  if (!existsSync(src)) throw new Error(`no end card at ${src}: render the feature reel's title first`);
  command('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-an', '-vf', `fps=${FPS},scale=${W}:${H},setsar=1`,
    '-frames:v', String(frames(shot)), '-c:v', 'libx264', '-preset', 'medium', '-crf', '12', '-pix_fmt', 'yuv420p',
    join(DIR, `${shot.id}.mp4`)]);
}

// ---------------------------------------------------------------- text

// THE WORDS, in the game's title face:
//   'cabinet' — the first shot of each cabinet: a small yellow kicker over the white name,
//               across the top of the frame.
//   'label'   — the item's name, small and white, in the lower third (the lane is empty).
// `dy` moves a line down (or up, negative) clear of the subject.
async function renderText(browser) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.goto(`${BASE}/?mute&goto=title`, { waitUntil: 'load', timeout: 30000 });
  await page.evaluate(() => document.fonts.load("400 120px 'Lilita One'"));
  for (const [i, tx] of texts.entries()) {
    const png = await page.evaluate((tx) => {
      const c = document.createElement('canvas');
      c.width = 1920; c.height = 1080;
      const ctx = c.getContext('2d');
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
      const draw = (label, px, y, fill, maxW) => {
        ctx.letterSpacing = `${Math.round(px / 40)}px`;
        do { ctx.font = `400 ${px--}px 'Lilita One'`; } while (ctx.measureText(label).width > maxW);
        ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 8;
        ctx.lineWidth = Math.max(8, px / 9); ctx.strokeStyle = '#1c1405'; ctx.strokeText(label, 960, y);
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = fill; ctx.fillText(label, 960, y);
      };
      const dy = tx.dy || 0;
      if (tx.style === 'cabinet') {
        draw('THE SCENERY OF', 60, 118 + dy, '#ffcf33', 1200);
        draw(tx.text, 128, 248 + dy, '#ffffff', 1560);
      } else {
        draw(tx.text, 64, 1000 + dy, '#ffffff', 1500);
      }
      return c.toDataURL('image/png').split(',')[1];
    }, tx);
    writeFileSync(join(DIR, `text-${i}.png`), Buffer.from(png, 'base64'));
  }
  await page.close();
}

// ---------------------------------------------------------------- sound

function decodeF32(path) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', path, '-vn', '-ac', '2', '-ar', String(SR),
    '-f', 'f32le', 'pipe:1'], { maxBuffer: 200 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`ffmpeg could not decode ${path}: ${r.stderr}`);
  const buf = r.stdout;
  const d = new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  return { outL: Float32Array.from({ length: d.length / 2 }, (_, i) => d[i * 2]),
    outR: Float32Array.from({ length: d.length / 2 }, (_, i) => d[i * 2 + 1]) };
}

// The only cue with something on screen to make it: the speed trap's shutter.
const SCENERY_CUES = new Set(['cameraClick']);

async function renderAudio() {
  const len = Math.round(SR * TOTAL);
  const music = [new Float32Array(len), new Float32Array(len)];
  const fx = [new Float32Array(len), new Float32Array(len)];

  // MUSIC: each cabinet's song from bar 1 under its own segment. A bar more than the
  // segment is rendered, for the tape stop at the end.
  let renderer = null;
  try {
    for (const seg of segments) {
      const song = CABS[seg.cab].song;
      const wav = join(DIR, `music-${seg.cab}.wav`);
      const bars = Math.ceil(seg.bars) + 1;
      if (!existsSync(wav) || arg('--refresh-music')) {
        renderer ||= await openRenderer();
        const mus = await renderer.render(song.bank, {
          trackId: song.id, mix: song.mix, arrangement: song.arrangement,
          range: { startStep: 0, endStep: bars * 16 }, tail: 0,
        });
        writeFileSync(wav, wavBuffer([mus.outL, mus.outR]));
      }
      const mus = decodeF32(wav);
      const m0 = Math.round(start(seg.first.id) * SR);
      const mEnd = Math.round(bounds.get(seg.last.id).f1 / FPS * SR);
      // Songs never overlap (three tempos would clash): each fades over its last 0.3 s,
      // except the last, which tape-stops over the end card.
      const fade = 0.3 * SR;
      const last = seg === segments.at(-1);
      for (let i = 0; m0 + i < mEnd && i < mus.outL.length; i++) {
        const g = last ? 1 : Math.min(1, (mEnd - (m0 + i)) / fade);
        music[0][m0 + i] = mus.outL[i] * g; music[1][m0 + i] = mus.outR[i] * g;
      }
      if (last) {
        // The tape stop: the game's squared-rate brake, darkening as it slows.
        const stopFrom = mEnd - m0;
        for (let i = 0; i < SR; i++) {
          const u = i / SR, rate = (1 - u) ** 2;
          const src = stopFrom + Math.round((1 - (1 - u) ** 3) * SR / 3);
          const cutoff = Math.max(60, 20000 * rate ** 1.5);
          const alpha = 1 - Math.exp(-2 * Math.PI * cutoff / SR);
          const j = mEnd + i;
          if (j >= len) break;
          for (let c = 0; c < 2; c++) {
            const s = (c ? mus.outR : mus.outL)[src] || 0;
            music[c][j] = i === 0 ? s : music[c][j - 1] + alpha * (s - music[c][j - 1]);
            music[c][j] *= (1 - u) ** 1.4;
          }
        }
      }
    }
  } finally { if (renderer) await renderer.close(); }

  // SCENERY CUES at their frames.
  const cues = await openCueRenderer();
  const placed = [];
  try {
    for (const shot of shots) {
      const logPath = join(DIR, `${shot.id}.sfx.json`);
      if (!shot.sfx || !existsSync(logPath)) continue;
      const t0 = start(shot.id), end = bounds.get(shot.id).f1 / FPS;
      for (const ev of JSON.parse(readFileSync(logPath, 'utf8'))) {
        if (!SCENERY_CUES.has(ev.name)) continue;
        const { inBeats, inSeconds, when, ...opt } = ev.opt || {};
        const at = t0 + ev.f / FPS + (Number.isFinite(inSeconds) ? inSeconds : 0);
        if (at < t0 || at >= end) continue;
        const buf = await cues.render(ev.name, opt, 3);
        const j0 = Math.round(at * SR), jEnd = Math.round(end * SR);
        for (let i = 0; i < buf.L.length && j0 + i < Math.min(jEnd, len); i++) {
          const g = Math.min(1, (jEnd - (j0 + i)) / (0.03 * SR));
          fx[0][j0 + i] += buf.L[i] * g; fx[1][j0 + i] += buf.R[i] * g;
        }
        placed.push(`${at.toFixed(2)} ${shot.id} ${ev.name}`);
      }
    }
  } finally { await cues.close(); }
  writeFileSync(join(DIR, 'cues-placed.txt'), placed.join('\n') + '\n');

  const MUSIC_G = 10 ** (-4 / 20), FX_G = 10 ** (-4 / 20);
  const out = [new Float32Array(len), new Float32Array(len)];
  let peak = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = Math.max(0, Math.min(1, t / FADE_IN, (TOTAL - t) / FADE_OUT));
    for (let c = 0; c < 2; c++) {
      out[c][i] = (music[c][i] * MUSIC_G + fx[c][i] * FX_G) * env;
      peak = Math.max(peak, Math.abs(out[c][i]));
    }
  }
  if (peak > 0.89) for (let i = 0; i < len; i++) { out[0][i] *= 0.89 / peak; out[1][i] *= 0.89 / peak; }
  const wav = join(DIR, 'soundtrack.wav');
  writeFileSync(wav, wavBuffer(out));
  console.log(`rendered ${wav} (${placed.length} cues, peak ${(20 * Math.log10(peak)).toFixed(1)} dB before guard)`);
  return wav;
}

// ---------------------------------------------------------------- assemble

function assemble(wav) {
  const list = join(DIR, 'clips.txt');
  writeFileSync(list, shots.map((s) => `file '${join(DIR, `${s.id}.mp4`)}'`).join('\n') + '\n');
  const joined = join(DIR, 'joined.mp4');
  command('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list,
    '-vf', `fps=${FPS},format=yuv420p`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '12', joined]);
  const inputs = ['-i', joined, '-i', wav];
  const filters = [];
  let last = '0:v';
  texts.forEach((tx, i) => {
    const a = start(tx.shot) + tx.at, b = a + tx.dur;
    inputs.push('-loop', '1', '-t', String(TOTAL), '-i', join(DIR, `text-${i}.png`));
    filters.push(`[${i + 2}:v]format=rgba,fade=t=in:st=${a.toFixed(3)}:d=0.22:alpha=1,`
      + `fade=t=out:st=${(b - 0.28).toFixed(3)}:d=0.28:alpha=1[c${i}]`);
    filters.push(`[${last}][c${i}]overlay=0:0:enable='between(t,${a.toFixed(3)},${b.toFixed(3)})'[v${i}]`);
    last = `v${i}`;
  });
  filters.push(`[${last}]fade=t=in:st=0:d=${FADE_IN},fade=t=out:st=${(TOTAL - FADE_OUT).toFixed(3)}:d=${FADE_OUT},format=yuv420p[v]`);
  mkdirSync(join(ROOT, 'work/social'), { recursive: true });
  command('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filters.join(';'),
    '-map', '[v]', '-map', '1:a:0', '-t', TOTAL.toFixed(3), '-r', String(FPS),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', OUT]);
  console.log(`${OUT}  ${TOTAL.toFixed(2)} s`);
}

// ---------------------------------------------------------------- the script

// docs/scenery-reel-script.md, GENERATED from the shot table: every shot with stills
// (from its capture, or its last probe), caption, stage and the line to adjust.
function writeScript() {
  const src = readFileSync(new URL(import.meta.url), 'utf8').split('\n');
  const lineOf = (needle) => src.findIndex((l) => l.includes(needle)) + 1;
  const link = (needle) => `[render-scenery-reel.js:${lineOf(needle)}](../tools/render-scenery-reel.js#L${lineOf(needle)})`;
  const clock = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;
  const stills = join(DIR, 'script');
  mkdirSync(stills, { recursive: true });
  const out = ['# MASHENSTEIN scenery reel: shooting script', '',
    'GENERATED by `node tools/render-scenery-reel.js --script` from the shot table in',
    '`tools/render-scenery-reel.js`. Do not hand-edit: change the line named in each shot\'s',
    '**Adjust** entry and regenerate this file.', '',
    `**Length** ${clock(TOTAL)} · **Shots** ${shots.length - 1} + end card · **Picture** 1920×1080, 60 fps · `
    + '**Export** `work/social/mashenstein-scenery-reel-16x9.mp4`', '',
    'Stills are the first, middle and last frames of each shot (from its capture, or from its last probe),',
    'in `work/local/scenery-reel-build/script/`. They are made on each run and are not tracked.', ''];
  for (const seg of segments) {
    const song = CABS[seg.cab].song;
    out.push(`## ${CABS[seg.cab].name}`, '',
      `${song.title} at ${song.bank.bpm} BPM (1 bar = ${barOf(seg.cab).toFixed(3)} s), ${seg.bars} bars from bar 1.`, '');
    out.push('| # | Shot | Time | Bars | Stage | Camera |', '| --- | --- | --- | --- | --- | --- |');
    for (const s of shots.filter((x) => x.cab === seg.cab)) {
      const n = shots.indexOf(s) + 1;
      const where = s.finish ? `${s.stage}, ${s.finish} s before the tape` : `${s.stage} @${s.at}%`;
      const cam = `${(s.drift ?? 1) === 1 ? 'full speed' : `drift ${s.drift}`}${s.pan ? `, ${(SW / s.pan.w).toFixed(1)}× close-up` : ', whole frame'}`;
      out.push(`| ${n} | [${s.caption}](#${n}-${s.id}) | ${clock(start(s.id))} | ${s.bars} | ${where} | ${cam} |`);
    }
    out.push('');
    for (const s of shots.filter((x) => x.cab === seg.cab)) {
      const n = shots.indexOf(s) + 1;
      out.push(`### ${n}. ${s.id}`, '');
      const jpg = join(stills, `${s.id}.jpg`);
      const mp4 = join(DIR, `${s.id}.mp4`);
      const probeDir = join(DIR, 'probe', s.id);
      rmSync(jpg, { force: true });
      if (existsSync(mp4)) {
        const f = frames(s);
        spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', mp4, '-vf',
          `select='eq(n\\,2)+eq(n\\,${Math.round(f / 2)})+eq(n\\,${f - 2})',scale=480:-1,tile=3x1:padding=6`,
          '-frames:v', '1', '-q:v', '3', jpg]);
      } else if (existsSync(probeDir)) {
        // A probe keeps only the shot's own frames (never the pre-roll).
        const body = readdirSync(probeDir).filter((f) => f.endsWith('.jpg')).sort();
        const pick = [body[0], body[Math.floor(body.length / 2)], body.at(-1)].filter(Boolean);
        spawnSync('ffmpeg', ['-y', '-v', 'error', ...pick.flatMap((f) => ['-i', join(probeDir, f)]), '-filter_complex',
          `${pick.map((_, i) => `[${i}:v]scale=480:-1[s${i}]`).join(';')};${pick.map((_, i) => `[s${i}]`).join('')}hstack=inputs=${pick.length}`,
          '-frames:v', '1', '-q:v', '3', jpg]);
      }
      if (existsSync(jpg)) out.push(`![${s.id}](../work/local/scenery-reel-build/script/${s.id}.jpg)`, '');
      out.push(`**${s.caption}.** ${s.note}`, '', `Adjust: ${link(`id: '${s.id}', `)}`, '');
    }
  }
  out.push('## End card', '', shots.at(-1).note, '',
    '## Rebuild', '', '```sh',
    'MASH_DEV_URL=http://localhost:8001 node tools/render-scenery-reel.js --probe --shots=<id>         # contact sheet at the crop',
    'MASH_DEV_URL=http://localhost:8001 node tools/render-scenery-reel.js --probe --wide --shots=<id>  # whole frame, 4K grid',
    'MASH_DEV_URL=http://localhost:8001 node tools/render-scenery-reel.js --capture-only --shots=<id>',
    'MASH_DEV_URL=http://localhost:8001 node tools/render-scenery-reel.js --assemble                   # text + soundtrack + cut',
    'node tools/render-scenery-reel.js --script                                                        # this file',
    '```', '');
  writeFileSync(join(ROOT, 'docs/scenery-reel-script.md'), out.join('\n'));
  console.log('docs/scenery-reel-script.md');
}

// ---------------------------------------------------------------- main

async function main() {
  const selected = process.argv.find((a) => a.startsWith('--shots='))?.slice(8).split(',') || null;
  const pick = (s) => !selected || selected.includes(s.id);
  if (arg('--script')) { writeScript(); return; }
  const probe = arg('--probe'), captureOnly = arg('--capture-only');
  const audioOnly = arg('--audio-only'), assembleOnly = arg('--assemble');
  if (!probe && !audioOnly && !process.argv.some((a) => a.startsWith('--scout='))) {
    // Only the end card may be unfinished: every other shot needs its capture.
    for (const s of shots) if (!s.title && !s.pan && !s.crop && !arg('--allow-wide')) console.log(`note: ${s.id} has no pan yet (whole frame)`);
  }
  const browser = (audioOnly) ? null
    : await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const scouts = process.argv.filter((a) => a.startsWith('--scout=')).map((a) => a.slice(8));
    if (scouts.length) { for (const s of scouts) await scoutStage(browser, s); return; }
    if (probe) {
      const wide = arg('--wide');
      for (const s of shots) {
        if (!pick(s) || s.title) continue;
        await probeShot(browser, wide ? { ...s, pan: null, crop: WIDE, res: 1 } : s, wide);
      }
      return;
    }
    if (!audioOnly && !assembleOnly) {
      for (const s of shots) {
        if (!pick(s)) continue;
        if (s.title) captureTitle(s);
        else await captureShot(browser, s);
      }
      if (captureOnly) return;
    }
    if (!audioOnly) await renderText(browser);
  } finally { if (browser) await browser.close(); }
  if (probe || captureOnly) return;
  const wav = arg('--keep-audio') && existsSync(join(DIR, 'soundtrack.wav')) ? join(DIR, 'soundtrack.wav') : await renderAudio();
  if (audioOnly) return;
  assemble(wav);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
