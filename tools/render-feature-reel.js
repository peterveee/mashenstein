// The September feature reel, v2: what the last week added, PLAYED rather than
// panned past. One hero per cabinet, no invulnerability, 4K capture cut as native
// crops, and the game's own sound effects in sync with the picture.
//
//   MASH_DEV_URL=http://localhost:8001 node tools/render-feature-reel.js            everything
//   ... --probe [--shots=rake,goose]    contact sheets at each shot's crop + a cue log, fast
//   ... --capture-only --shots=rake     recapture shots only
//   ... --audio-only                    rebuild the soundtrack from the saved cue logs
//   ... --assemble                      cut the saved shots + soundtrack into the export
//
// Everything it writes lands in work/local/feature-reel-build/; the review copy is
// work/social/mashenstein-feature-reel-16x9.mp4. docs/FEATURE_REEL_HANDOVER.md explains
// the cut.
//
// HOW A SHOT IS MADE. The stage is loaded at a fixed seed and startAt, the render loop
// is paused, and every frame is stepped offline at exactly 60 Hz (no dropped or
// doubled frames, which live canvas capture cannot promise). The lane is STAGED: the
// spawner is stubbed and the natural hazards removed, then the shot's own objects are
// placed so they reach the hero at a chosen second. Inputs are KeyboardEvents fired on
// exact frames. Nothing is invulnerable: a hit is the game's real hit.
//
// THE SOUND. Audio.sfx is wrapped during capture and every cue the game fires is logged
// with its frame and its options. The soundtrack renders each of those cues through the
// real engine offline (tools/lib/cue-render.js) and lays it at its frame, under the
// song. Cues the game places on the beat (`inBeats`) keep their lead at 150 BPM.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { openRenderer } from './lib/render-bank-browser.js';
import { openCueRenderer } from './lib/cue-render.js';
import { wavBuffer, SR } from './lib/wav.js';
import { makeObstacle, makeDroneColumn } from '../src/game/entities.js';
import { IntroFilm } from '../src/game/intro.js';
import * as neon from '../src/data/songs/neon.js';

const ROOT = resolve(import.meta.dirname, '..');
const DIR = join(ROOT, 'work/local/feature-reel-build');
const OUT = join(ROOT, 'work/social/mashenstein-feature-reel-16x9.mp4');
const BASE = process.env.MASH_DEV_URL || 'http://localhost:8001';
const FPS = 60;
const BAR = 1.6;                 // TERMINAL VELOCITY, 150 BPM
const BEAT = BAR / 4;
const W = 1920, H = 1080;        // the export
const SW = 3840, SH = 2160;      // the capture
mkdirSync(DIR, { recursive: true });

// Crops are in 4K source pixels, always 16:9. Z2 is a native 2x (1:1 pixels, no
// resampling at all); Z15 is 1.5x, still downsampled. `cx`/`cy` is the crop's centre.
const box = (w, cx, cy) => {
  const h = Math.round(w * 9 / 16);
  const x = Math.max(0, Math.min(SW - w, Math.round(cx - w / 2)));
  const y = Math.max(0, Math.min(SH - h, Math.round(cy - h / 2)));
  return [x, y, w, h];
};
const WIDE = [0, 0, SW, SH];

// THE CUT. `bars` is the shot's length on the song's grid. `inject` places an object
// so its leading edge meets the hero `at` seconds into the shot (negative = pre-roll).
// `keys` are presses: { t, code, hold }. `pre` is pre-roll stepped before frame 0.
// `crop` is a 4K rectangle; `move` travels it to `to` over [at, at+len] on a smoothstep.
export const shots = [
  { id: 'dive', note: 'The gang running the row, then the cabinet dive, from the intro film; fading up from black in silence.', bars: 4.3 / BAR, intro: true },
  // PLUMBER PANIC — Lorenzo
  {
    id: 'rake', note: 'Lorenzo steps on a rake; the handle swings up and bonks him (a real hit). He jumps on past the barn.', bars: 2, stage: 'plumber-1', hero: 'lorenzo', at: 5, pre: 0.5,
    inject: [{ type: 'rake', at: 1.1 }],
    keys: [{ t: 2.45, code: 'Space', hold: 0.18 }],
    track: { w: 1920, heroAt: 0.3, groundAt: 0.8, wTo: 2560, heroAtTo: 0.25, at: 2.0, len: 0.8 },
  },
  {
    id: 'goose', note: 'The goose charges; Lorenzo jumps it.', bars: 1, stage: 'plumber-2', hero: 'lorenzo', at: 30, pre: 0.5,
    inject: [{ type: 'goose', at: 0.95 }],
    keys: [{ t: 0.62, code: 'Space', hold: 0.2 }],
    track: { w: 2560, heroAt: 0.26, groundAt: 0.92 },
  },
  // Close-ups ride the parallax: `pan` is the subject's centre at the first and last
  // frame, measured off a --probe --wide sheet.
  // (The balloon close-up was cut on 25 Sep: the goose shot already has the balloon in it.)
  {
    id: 'windmill', note: 'Close-up: the windmill turning on its hill.', bars: 1, stage: 'plumber-3', hero: 'lorenzo', at: 34, pre: 0.5, res: 1.5,
    pan: { w: 1600, from: [2419, 980], to: [1234, 990] },
  },
  // SPEED ZONE — Rusty
  // The jet opens the cabinet so the SPEED ZONE card has a shot of its own and the
  // RATTLESNAKES line can be up before the strike.
  {
    id: 'jet', note: 'The jet goes supersonic overhead with its vapour cone and contrail.', bars: 1, stage: 'speed-3', hero: 'rusty', at: 46, pre: 0.5,
    track: { w: 3200, heroAt: 0.15, groundAt: 0.86 },
  },
  {
    id: 'snake', note: 'Rusty meets a rattlesnake: it coils, strikes and bites (a real hit). He jumps clear.', bars: 1.5, stage: 'speed-1', hero: 'rusty', at: 18, pre: 0.5,
    inject: [{ type: 'rattlesnake', at: 0.8 }],
    keys: [{ t: 1.45, code: 'Space', hold: 0.2 }],
    track: { w: 1920, heroAt: 0.3, groundAt: 0.8, wTo: 2560, heroAtTo: 0.25, at: 1.25, len: 0.5 },
  },
  {
    id: 'camera', note: 'The SMILE! speed camera ahead of Rusty. The shot ends as it flashes.', bars: 1, stage: 'speed-2', hero: 'rusty', at: 2, pre: 0, continues: true,
    track: { w: 2560, heroAt: 0.14, groundAt: 0.9 },
  },
  // The same take, cut in on the board as it flashes: the mugshot is the joke. `pre`
  // is the camera shot's pre + its length, so the cut is continuous.
  {
    id: 'mugshot', note: "Cut-in on the board: the flash, then GOTCHA with Rusty's mugshot and a $1986 fine.", bars: 1, stage: 'speed-2', hero: 'rusty', at: 2, pre: 1.6, res: 1.5,
    pan: { w: 1440, from: [1678, 1060], to: [273, 1070] },
  },
  {
    id: 'pumpjack', note: 'Close-up: the pumpjack nodding beside the dish.', bars: 1, stage: 'speed-1', hero: 'rusty', at: 43, pre: 0.5, res: 1.5,
    pan: { w: 1440, from: [1400, 690], to: [745, 670] },
  },
  {
    id: 'coyote', note: 'Close-up: the coyote on its ledge howls as a tumbleweed rolls past.', bars: 1, stage: 'speed-1', hero: 'rusty', at: 77, pre: 0.5, res: 1.5, bgT: 102.2,
    pan: { w: 1280, from: [2381, 1010], to: [888, 1000] },
  },
  // FROST FORTRESS — Grumpos
  {
    id: 'crystals', note: 'Grumpos power-slides through the ice crystals and kicks them apart.', bars: 1, stage: 'frost-1', hero: 'grumpos', at: 1, pre: 0.5,
    inject: [{ type: 'iceCrystals', at: 0.75 }],
    keys: [{ t: 0.5, code: 'ArrowDown', hold: 0.45 }],
    track: { w: 2048, heroAt: 0.28, groundAt: 0.84 },
  },
  {
    id: 'axe', note: 'Grumpos throws the axe through a big snowman; it spins back to him.', bars: 1, stage: 'frost-1', hero: 'grumpos', at: 12, pre: 0.5,
    inject: [{ type: 'snowmanBig', at: 1.3 }],
    keys: [{ t: 0.4, code: 'KeyX', hold: 0.12 }],
    track: { w: 2560, heroAt: 0.2, groundAt: 0.82 },
  },
  {
    id: 'lift', note: 'Close-up: the chair-lift cabins riding down the cable.', bars: 1, stage: 'frost-1', hero: 'grumpos', at: 1, pre: 0.5, res: 1.5,
    pan: { w: 1440, from: [720, 640], to: [720, 660] },
  },
  {
    id: 'reindeer', note: 'Close-up: the reindeer herd gallops along the far crest behind the fortress.', bars: 1, stage: 'frost-2', hero: 'grumpos', at: 84, pre: 0.5, res: 1.5,
    pan: { w: 1600, from: [1382, 1010], to: [1745, 1370] },
  },
  // TERMINAL VELOCITY — Kiko. The song clock is pinned on every neon shot: the sky
  // strikes on beats, and only the day-to-night turn should.
  {
    id: 'flypast', note: 'Neon-1 by day: a train in day livery flies over Mt Fuji.', bars: 1.5, stage: 'neon-1', hero: 'kiko', at: 7, pre: 0.5,
    songBeat: { beat: 20, at: 0 }, crop: WIDE,
  },
  {
    id: 'strike', note: 'Lightning strikes and the day turns to night; the only thunder in the reel.', bars: 1.5, stage: 'neon-1', hero: 'kiko', at: 20, pre: 0.5,
    songBeat: { beat: 56, at: 1.0 }, crop: WIDE,
  },
  {
    id: 'panda', note: 'Kiko slide-punts the panda barrier, then the frog barrier.', bars: 2, stage: 'neon-2', hero: 'kiko', at: 20, pre: 0.5, floaties: true,
    songBeat: { beat: 100, at: 0 },
    inject: [{ type: 'pandaBarrier', at: 0.85 }, { type: 'frogBarrier', at: 2.15 }],
    keys: [{ t: 0.68, code: 'ArrowDown', hold: 0.3 }, { t: 1.98, code: 'ArrowDown', hold: 0.3 }],
    track: { w: 2048, heroAt: 0.24, groundAt: 0.8 },
  },
  // (Drone stacks were cut on 25 Sep: not new this week.)
  {
    id: 'train', note: 'Wide shot: the bullet train lands, Kiko jumps onto the roof and runs its length.', bars: 3, stage: 'neon-2', hero: 'kiko', at: 41, pre: 2.0,
    songBeat: { beat: 100, at: 0 },
    keys: [{ t: 1.9, code: 'Space', hold: 0.25 }],
    crop: WIDE,
  },
  // (The station-board cut-in was dropped on 25 Sep.)
  // The ending: the intro film's opening truck along the dreaming cabinets, with the tag
  // under them, then the title (Peter, 25 Sep: "end on the arcades dreaming shot").
  { id: 'arcade', note: "The intro film's opening shot: a slow truck along the row of cabinets dreaming electric dreams, the tag under them.", bars: 3.5, intro: true, from: 0.5 },
  { id: 'title', note: "The teaser's end card: marquee, swinging plug, sign-off; the music tape-stops.", bars: 3.25, title: true },   // held a beat longer on COMING EVENTUALLY (25 Sep)
];

// The words over the picture (see renderText). `shot` + `at` seconds into it.
export const texts = [
  { shot: 'dive', at: 2.8, dur: 1.4, style: 'callout', text: 'NEW THIS WEEK' },
  { shot: 'rake', style: 'cabinet', text: 'PLUMBER PANIC' },
  { shot: 'goose', at: 0.1, dur: 1.4, style: 'callout', text: 'ANGRY GEESE' },
  { shot: 'windmill', at: 0.1, dur: 1.4, style: 'callout', text: 'NEW SCENERY' },
  { shot: 'jet', style: 'cabinet', text: 'SPEED ZONE', dur: 1.45 },
  { shot: 'snake', at: 0.15, dur: 2.1, style: 'callout', text: 'RATTLESNAKES' },
  { shot: 'camera', at: 0.3, dur: 2.6, style: 'callout', text: 'SAY CHEESE!' },
  { shot: 'crystals', style: 'cabinet', text: 'FROST FORTRESS', dur: 1.5 },
  { shot: 'axe', at: 0.1, dur: 1.4, style: 'callout', text: 'SNOWMEN BEWARE' },
  // A whole new cabinet, not new things in an old one.
  { shot: 'flypast', style: 'cabinet', kicker: 'NEW DESTINATION', text: 'TERMINAL VELOCITY', dy: 250 },
  { shot: 'strike', at: 0.9, dur: 1.4, style: 'callout', text: 'DAY TO NIGHT' },
  { shot: 'panda', at: 0.1, dur: 2.4, style: 'callout', text: 'KICK THE ROADWORKS' },
  { shot: 'train', at: 0.2, dur: 2.2, style: 'callout', text: 'JUMP ON A TRAIN' },
  // The tag lands a line at a time: the line alone, then DIVE IN. fading up under it.
  { shot: 'arcade', at: 0.5, dur: 4.9, style: 'tag', row: 0, text: 'NEW TRICKS FOR AN OLD MALL.' },
  { shot: 'arcade', at: 2.4, dur: 3.0, style: 'tag', row: 1, text: 'DIVE IN.' },
];

const start = (id) => {
  let t = 0;
  for (const s of shots) { if (s.id === id) return t; t += s.bars * BAR; }
  throw new Error(`no shot ${id}`);
};
const TOTAL = shots.reduce((n, s) => n + s.bars * BAR, 0);
const FADE_IN = 1.0, FADE_OUT = 0.8;
// The dive starts this far before takeoff: a silent run-up while the picture fades up.
const DIVE_LEAD = 2.3;   // the gang's run-up along the row, one continuous shot
const arg = (k) => process.argv.includes(k);

function command(bin, args) {
  const r = spawnSync(bin, args, { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${bin} exited ${r.status}`);
}

// ---------------------------------------------------------------- capture

async function openShot(browser, shot, probe) {
  // `res` renders a close-up from a bigger canvas: 1.5 is a 5760-wide frame, so a
  // 1280-wide crop of the 4K composition is still 1:1 pixels.
  const scale = (probe ? 0.5 : 1) * (shot.res || 1);
  const page = await browser.newPage({ viewport: { width: SW * scale, height: SH * scale } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const q = `?mute&density=${8 * (shot.res || 1)}&goto=stage&cab=${shot.stage.split('-')[0]}&stage=${shot.stage}`
    + `&hero=${shot.hero}&seed=${shot.seed ?? 7}&startAt=${shot.at}`;
  await page.goto(`${BASE}/${q}`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__mash_booted && window.__mash_render_loop
    && window.__mash_state === 'RunState', null, { timeout: 30000 });
  const injects = (shot.inject || []).map((it) => {
    const objs = it.type === 'droneColumn' ? makeDroneColumn(0, it.rungs || 3)
      : [makeObstacle(it.type, 0)];
    for (const o of objs) o.id += 100000 + Math.round(Math.random() * 1e5);
    return { at: it.at, objs };
  });
  await page.evaluate(({ shot, injects, scale, crop }) => {
    const run = window.__mash_cur;
    const loop = window.__mash_render_loop;
    loop.pause();
    run.captureCleanPlate = true;
    if (window.__mash_dev) { window.__mash_dev.draw = () => {}; window.__mash_dev.hideSpecialOrb = true; }
    run.say = () => {};
    run.speech = null;
    if (run.speechQueue) run.speechQueue.length = 0;
    if (!shot.floaties) { run.floatText = () => {}; run.floaties = []; }
    // One hero for the whole shot: no relay portal may come due.
    if (run.relay) run.relay.portalDue = () => false;
    // A close-up on scenery has no hero in it: at the frame's edge he is only ever a
    // sliced-off cap or a pair of ears.
    if (shot.pan) run.rhythmHeroVisible = () => false;
    // `bgT` sets the scenery clock at frame 0, for a close-up that has to catch an
    // ambient loop at the right moment (the coyote howls on a 5 s cycle).
    if (Number.isFinite(shot.bgT)) run.backgroundT = run.prevBackgroundT = shot.bgT - (shot.pre || 0);
    if (!shot.keepLane) {
      // The lane is staged. Nothing new spawns, and nothing already placed survives
      // except the coins — a rake nobody asked for is how the last cut had three.
      run.spawner.fill = () => {};
      run.dripUpdate = () => {};
      run.spawnScriptedPits = () => {};
      run.spawnApplianceMaybe = () => {};
      run.spawnScriptedRewindMaybe = () => {};
      run.spawnDogSign = () => {};
      run.obstacles.splice(0);
      // Coins stay (they are the game's own trail), capsules go: a power-up bubble
      // round the hero is somebody else's shot.
      for (let i = run.pickups.length - 1; i >= 0; i--) {
        if (!/coin|battery/i.test(run.pickups[i].type)) run.pickups.splice(i, 1);
      }
    }
    const A = window.__mash_audio;
    const R = window.__reel = { frame: 0, events: [], calls: {}, injects, shot, scale, crop };
    const sfx = A.sfx;
    A.sfx = function (name, opt = {}) {
      let o = {};
      try { o = JSON.parse(JSON.stringify(opt || {})); } catch { /* shapes are data */ }
      R.events.push({ f: R.frame, name, opt: o });
      return sfx.call(A, name, opt);
    };
    if (shot.songBeat) {
      // THE SONG CLOCK, ON THE FRAME. A muted page still runs the song's clock in
      // REAL time, and a 4K frame takes far longer to step than 1/60 s — so the
      // neon sky (which strikes on beats 56 and 176) struck wherever the render
      // speed happened to put it. Pinned here: `beat` falls at `at` seconds into
      // the shot and the clock runs at 150 BPM from there.
      const { beat, at } = shot.songBeat;
      A.songBeat = () => beat + (R.frame / 60 - at) * 2.5;
    }
    // THE FOLLOWING CROP. The camera rises and falls with the road, so a fixed crop
    // loses the hero off the bottom on a slope. This puts the GROUND UNDER HIM (not
    // his feet: a jump must not drag the frame up) at `groundAt` of the crop's height,
    // through the game's own transform — screen y = (y - floorY)·z + 232 + pan, in the
    // 480x270 logical frame, x8 at 4K — eased so a step in the road is a drift.
    R.track = (frame) => {
      const tr = shot.track;
      const u = tr.at == null ? 0 : Math.min(1, Math.max(0, (frame / 60 - tr.at) / (tr.len || 1)));
      const e = u * u * (3 - 2 * u);
      const w = tr.w + ((tr.wTo ?? tr.w) - tr.w) * e;
      const h = w * 9 / 16;
      const z = Number.isFinite(run.prevCamZoom) ? run.prevCamZoom : run.camZoom;
      const pan = Number.isFinite(run.prevCamPan) ? run.prevCamPan : run.camPan;
      const floorY = Number.isFinite(run.prevCamFloorY) ? run.prevCamFloorY : run.camFloorY;
      const gy = ((run.playerGroundY() - floorY) * z + 232 + (pan || 0)) * 8;
      const want = gy - (tr.groundAt ?? 0.8) * h;
      R.ty = R.ty == null ? want : R.ty + (want - R.ty) * (1 - Math.exp(-1 / 60 / (tr.ease ?? 0.3)));
      const hx = (run.heroScreenX ? run.heroScreenX() : 59) * z * 8;
      const heroAt = tr.heroAt + ((tr.heroAtTo ?? tr.heroAt) - tr.heroAt) * e;
      const x = Math.max(0, Math.min(3840 - w, hx - heroAt * w));
      const y = Math.max(0, Math.min(2160 - h, R.ty));
      return [x, y, w, h];
    };
    R.key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup',
      { code, key: code === 'Space' ? ' ' : code, bubbles: true }));
    R.out = document.createElement('canvas');
    R.out.width = 1920 * (shot.probeW || 1); R.out.height = 1080 * (shot.probeW || 1);
    R.ctx = R.out.getContext('2d');
    R.ctx.imageSmoothingEnabled = true;
    R.ctx.imageSmoothingQuality = 'high';
  }, { shot, injects, scale, crop: shot.crop });
  return { page, errors };
}

function cropAt(shot, t) {
  if (shot.pan) {
    // A close-up on background scenery. Parallax layers slide at a constant rate, so
    // the crop slides with them: `from`/`to` are the subject's centre at the first
    // and last frame (4K px), `w` the crop width.
    const u = t / (shot.bars * BAR);
    const [fx, fy] = shot.pan.from, [tx, ty] = shot.pan.to;
    const w = shot.pan.w, h = w * 9 / 16;
    const x = Math.max(0, Math.min(SW - w, fx + (tx - fx) * u - w / 2));
    const y = Math.max(0, Math.min(SH - h, fy + (ty - fy) * u - h / 2));
    return [x, y, w, h];
  }
  const c = shot.crop || WIDE;
  if (!shot.move) return c;
  const u = Math.min(1, Math.max(0, (t - shot.move.at) / shot.move.len));
  const e = u * u * (3 - 2 * u);
  const w = c[2] + (shot.move.to[2] - c[2]) * e;
  return [c[0] + (shot.move.to[0] - c[0]) * e, c[1] + (shot.move.to[1] - c[1]) * e, w, w * 9 / 16];
}

// Step frames [from, to) and return PNG/JPEG frames for those listed in `grab`.
async function stepFrames(page, shot, from, to, grab, fmt, outW) {
  const plan = [];
  for (let i = from; i < to; i++) {
    const t = i / FPS;
    const keys = [];
    for (const k of shot.keys || []) {
      const d = Math.round(k.t * FPS), u = Math.round((k.t + (k.hold ?? 0.12)) * FPS);
      if (i === d) keys.push([k.code, true]);
      if (i === u) keys.push([k.code, false]);
    }
    const inj = [];
    (shot.inject || []).forEach((it, n) => {
      // Placed 1.5 s before contact (or at the top of the pre-roll if later).
      const place = Math.max(-Math.round((shot.pre || 0) * FPS), Math.round((it.at - 1.5) * FPS));
      if (i === place) inj.push(n);
    });
    plan.push({ i, keys, inj, grab: grab(i) ? (shot.track ? 'track' : cropAt(shot, t)) : null });
  }
  return page.evaluate(({ plan, fmt, outW }) => {
    const R = window.__reel;
    const run = window.__mash_cur;
    const out = [];
    for (const p of plan) {
      R.frame = p.i;
      for (const [code, down] of p.keys) R.key(code, down);
      for (const n of p.inj) {
        const it = R.injects[n];
        const px = run.playerWorldX();
        const lead = it.at - p.i / 60;
        for (const o of it.objs) {
          const closing = run.speed - (o.vx || 0);
          o.x = px + 7 + closing * lead;
          run.obstacles.push(o);
        }
      }
      window.__mash_render_loop.stepOffline();
      // A hit is the game's real hit, stagger and all, but a 1.4 s blink reads as the
      // hero missing from the shot. The reel keeps the first half second of it.
      const cap = R.shot.maxIframes ?? 0.45;
      if (run.player.iframes > cap) run.player.iframes = cap;
      const rect = p.grab === 'track' ? R.track(p.i) : p.grab;
      if (p.grab) {
        const s = R.scale;
        const [x, y, w, h] = rect;
        const cw = outW, ch = Math.round(outW * 9 / 16);
        if (R.out.width !== cw) { R.out.width = cw; R.out.height = ch; R.ctx.imageSmoothingQuality = 'high'; }
        R.ctx.drawImage(document.getElementById('game'), x * s, y * s, w * s, h * s, 0, 0, cw, ch);
        out.push(R.out.toDataURL(fmt, 0.9).split(',')[1]);
      }
    }
    return out;
  }, { plan, fmt, outW });
}

async function shotState(page) {
  return page.evaluate(() => {
    const run = window.__mash_cur;
    const p = run.player;
    return {
      f: window.__reel.frame, speed: +run.speed.toFixed(1), px: +run.playerWorldX().toFixed(1),
      y: +(p.y ?? 0).toFixed(1), grounded: !!p.grounded, iframes: +(p.iframes || 0).toFixed(2),
      hero: run.relay?.current, battery: run.battery ?? run.health ?? null,
      obs: run.obstacles.filter((o) => o.live !== false && o.x - run.playerWorldX() < 260)
        .map((o) => `${o.type}@${(o.x - run.playerWorldX()).toFixed(0)}${o.punted ? '*' : ''}${o.broken ? 'x' : ''}`).join(' '),
    };
  });
}

// PROBE: step the whole shot fast at half resolution, keep a frame every 0.2 s AT ITS
// CROP, tile them, and log the hero's state and every cue fired. Framing is what goes
// wrong, and a 4K recapture is the slow way to learn it.
async function probeShot(browser, shot) {
  const { page, errors } = await openShot(browser, shot, true);
  const n = Math.round(shot.bars * BAR * FPS);
  const pre = Math.round((shot.pre || 0) * FPS);
  const every = 12;
  const log = [];
  const frames = [];
  try {
    for (let a = -pre; a < n; a += every) {
      const b = Math.min(n, a + every);
      const got = await stepFrames(page, shot, a, b, (i) => i >= 0 && i === a, 'image/jpeg', shot.wideProbe ? 960 : 640);
      frames.push(...got);
      if (a >= 0) log.push(await shotState(page));
    }
    const events = await page.evaluate(() => window.__reel.events);
    const dir = join(DIR, 'probe', shot.id);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    frames.forEach((b64, i) => writeFileSync(join(dir, `${String(i).padStart(3, '0')}.jpg`), Buffer.from(b64, 'base64')));
    command('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '1', '-i', join(dir, '%03d.jpg'),
      '-vf', `tile=${shot.wideProbe ? 4 : 5}x${Math.ceil(frames.length / (shot.wideProbe ? 4 : 5))}:padding=4`, '-frames:v', '1', join(DIR, `probe-${shot.id}${shot.wideProbe ? '-wide' : ''}.jpg`)]);
    writeFileSync(join(DIR, `probe-${shot.id}.json`), JSON.stringify({ log, events, errors }, null, 1));
    console.log(`\n== ${shot.id} (${shot.hero} ${shot.stage} @${shot.at}) — every 0.2 s`);
    for (const s of log) console.log(`  ${(s.f / FPS).toFixed(1).padStart(4)}s  y${String(s.y).padStart(6)} ${s.grounded ? 'G' : 'a'} if${s.iframes} spd${s.speed} ${s.hero} | ${s.obs}`);
    console.log(`  cues: ${events.map((e) => `${(e.f / FPS).toFixed(2)} ${e.name}${e.opt.hero ? `/${e.opt.hero}` : ''}`).join(', ')}`);
    if (errors.length) console.log(`  page errors: ${errors.slice(0, 3).join(' | ')}`);
  } finally { await page.close(); }
}

async function captureShot(browser, shot) {
  const { page, errors } = await openShot(browser, shot, false);
  const size = await page.evaluate(() => { const c = document.getElementById('game'); return [c.width, c.height]; });
  const res = shot.res || 1;
  if (size[0] !== SW * res || size[1] !== SH * res) throw new Error(`Expected ${SW * res}x${SH * res}, got ${size.join('x')}`);
  const n = Math.round(shot.bars * BAR * FPS);
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
      const got = await stepFrames(page, shot, a, b, (i) => i >= 0, 'image/png', W);
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
    console.log(`captured ${shot.id}: ${n} frames; cues ${events.map((e) => `${(e.f / FPS).toFixed(2)} ${e.name}`).join(', ')}`);
    if (errors.length) console.log(`  page errors: ${errors.slice(0, 3).join(' | ')}`);
  } finally { await page.close(); }
}

// The cabinet dive, from the intro film. Picture stepped offline like the rest; its
// sound captured live with the music bus down (the dive's own SFX graph and cue
// clock: leap voice, boom with its room, portal breath).
async function captureDive(browser, shot) {
  // The cabinet dive, from the intro film, stepped offline like every other shot. Its
  // cues are LOGGED on their frames rather than recorded live: a live recording could
  // not be lined up with the picture, and it carried the hub's run-up under the fade.
  // Before takeoff there is nothing — the reel opens on silence.
  const n = Math.round(shot.bars * BAR * FPS);
  // `from` is the film time to start at; the dive starts DIVE_LEAD before its takeoff.
  const from = shot.from ?? IntroFilm.DIVE_AT - DIVE_LEAD;
  const page = await browser.newPage({ viewport: { width: SW, height: SH } });
  await page.goto(`${BASE}/?mute&density=8&goto=intro`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__mash_booted && window.__mash_render_loop
    && window.__mash_state === 'IntroState', null, { timeout: 30000 });
  await page.evaluate((t0) => {
    window.__mash_render_loop.pause();
    window.__mash_cur.captureCleanPlate = true;
    window.__mash_cur.seek(t0);
    const A = window.__mash_audio;
    const R = window.__reel = { frame: 0, events: [] };
    const log = (prefix, fn) => function (name, opt = {}) {
      let o = {};
      try { o = JSON.parse(JSON.stringify(opt || {})); } catch { /* data only */ }
      R.events.push({ f: R.frame, name: prefix + name, opt: o });
      return fn.call(A, name, opt);
    };
    A.sfx = log('', A.sfx);
    A.voiceSfx = log('voice:', A.voiceSfx);
  }, from);
  const mp4 = join(DIR, `${shot.id}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS),
    '-i', 'pipe:0', '-frames:v', String(n), '-vf', `scale=${W}:${H}:flags=lanczos,setsar=1`,
    '-c:v', 'libx264', '-preset', 'medium', '-tune', 'animation', '-crf', '12', '-pix_fmt', 'yuv420p', mp4],
  { cwd: ROOT, stdio: ['pipe', 'inherit', 'inherit'] });
  try {
    for (let a = 0; a < n; a += 3) {
      const got = await page.evaluate(({ a, k }) => {
        const pngs = [];
        for (let j = 0; j < k; j++) {
          window.__reel.frame = a + j;
          window.__mash_render_loop.stepOffline();
          pngs.push(document.getElementById('game').toDataURL('image/png').split(',')[1]);
        }
        return pngs;
      }, { a, k: Math.min(3, n - a) });
      for (const png of got) if (!ff.stdin.write(Buffer.from(png, 'base64'))) await once(ff.stdin, 'drain');
    }
    ff.stdin.end();
    await once(ff, 'close');
    const events = await page.evaluate(() => window.__reel.events);
    writeFileSync(join(DIR, `${shot.id}.sfx.json`), JSON.stringify(events, null, 1));
    console.log(`captured ${shot.id}: ${n} frames; cues ${events.map((e) => `${(e.f / FPS).toFixed(2)} ${e.name}`).join(', ')}`);
  } finally { await page.close(); }
}

// ---------------------------------------------------------------- text

// THE WORDS. Two kinds, both in the game's title face across the top of the frame
// (every shot keeps the hero's lane in the lower half):
//   'cabinet' — the first shot of each cabinet: a small yellow NEW IN over the name.
//   'callout' — what a shot is showing off, in the title's yellow.
// Each fades in and out; `at` is seconds into its shot.
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
      // `dy` drops a line clear of something the shot has at the top (the flypast train).
      const dy = tx.dy || 0;
      if (tx.style === 'tag') {
        // Under the cabinets, in the lower third: the question before the title.
        // `row` 0 is the upper line, 1 the one under it.
        draw(tx.text, 112, 780 + (tx.row || 0) * 120, '#ffcf33', 1650);
      } else if (tx.style === 'cabinet') {
        // kicker defaults to NEW IN; a new cabinet says so instead.
        draw(tx.kicker || 'NEW IN', 76, 128 + dy, '#ffcf33', 1200);
        draw(tx.text, 128, 258 + dy, '#ffffff', 1560);
      } else {
        draw(tx.text, 104, 190 + dy, '#ffcf33', 1600);
      }
      return c.toDataURL('image/png').split(',')[1];
    }, tx);
    writeFileSync(join(DIR, `text-${i}.png`), Buffer.from(png, 'base64'));
  }
  // The tag before the title: the question, on black, pushing in.
  for (const shot of shots.filter((s) => s.card)) {
    const png = await page.evaluate((card) => {
      // One line or several, all at the size the widest one fits, stacked about the middle.
      const lines = Array.isArray(card) ? card : [card];
      const c = document.createElement('canvas');
      c.width = 3840; c.height = 2160;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 3840, 2160);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      let px = 300;
      ctx.letterSpacing = '8px';
      const widest = () => Math.max(...lines.map((l) => ctx.measureText(l).width));
      do { ctx.font = `400 ${px--}px 'Lilita One'`; } while (widest() > 3000);
      const gap = px * 1.25;
      lines.forEach((label, i) => {
        const y = 1080 + (i - (lines.length - 1) / 2) * gap;
        ctx.lineWidth = 14; ctx.strokeStyle = '#2a1e05'; ctx.strokeText(label, 1932, y + 12);
        ctx.fillStyle = '#a8791f'; ctx.fillText(label, 1932, y + 12);
        ctx.strokeText(label, 1920, y);
        ctx.fillStyle = '#ffcf33'; ctx.fillText(label, 1920, y);
      });
      return c.toDataURL('image/png').split(',')[1];
    }, shot.card);
    const still = join(DIR, `${shot.id}.png`);
    writeFileSync(still, Buffer.from(png, 'base64'));
    const dur = shot.bars * BAR, n = Math.round(dur * FPS);
    command('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-framerate', String(FPS), '-t', String(dur), '-i', still,
      '-vf', `zoompan=z='1+0.06*on/${n}':d=${n}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${W}x${H}:fps=${FPS},`
        + `fade=t=in:st=0:d=0.3,format=yuv420p`,
      '-frames:v', String(n), '-c:v', 'libx264', '-preset', 'medium', '-crf', '12', join(DIR, `${shot.id}.mp4`)]);
  }
  await page.close();
  // The end card is the teaser's own: the marquee on its bad circuit, the plug
  // swinging and sparking, COMING SOON fading up, the whole card to black.
  const titleSecs = shots.find((s) => s.title).bars * BAR;
  if (!existsSync(join(DIR, 'title.mp4')) || arg('--refresh-title')) {
    command('node', ['work/local/teaser/titleclip.mjs', String(titleSecs), join(DIR, 'title.mp4')]);
  }
}

// ---------------------------------------------------------------- sound

function decodeF32(path, seconds) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', path, '-vn', '-ac', '2', '-ar', String(SR),
    '-t', String(seconds), '-f', 'f32le', 'pipe:1'], { maxBuffer: 80 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`ffmpeg could not decode ${path}: ${r.stderr}`);
  const buf = r.stdout;
  return new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

// Cues nobody should hear in a reel: interface ticks and anything the capture itself
// provoked by staging (none so far — listed here if one turns up).
const SKIP_CUES = new Set([]);

async function renderAudio() {
  const frames = Math.round(SR * TOTAL);
  const music = [new Float32Array(frames), new Float32Array(frames)];
  const fx = [new Float32Array(frames), new Float32Array(frames)];
  const firstPlay = start(shots[1].id);
  const titleAt = start('title');

  // MUSIC: TERMINAL VELOCITY from bar 45, landing on the first gameplay bar line.
  const musicWav = join(DIR, 'music-bus.wav');
  const bars = Math.ceil((TOTAL - firstPlay) / BAR) + 1;
  let mus;
  if (existsSync(musicWav) && !process.argv.includes('--refresh-music')) {
    const d = decodeF32(musicWav, bars * BAR + 1);
    mus = { outL: Float32Array.from({ length: d.length / 2 }, (_, i) => d[i * 2]),
      outR: Float32Array.from({ length: d.length / 2 }, (_, i) => d[i * 2 + 1]) };
  } else {
    const renderer = await openRenderer();
    try {
      mus = await renderer.render(neon.bank, {
        trackId: neon.id, mix: neon.mix, arrangement: neon.arrangement,
        range: { startStep: 44 * 16, endStep: (44 + bars) * 16 }, tail: 0,
      });
    } finally { await renderer.close(); }
    writeFileSync(musicWav, wavBuffer([mus.outL, mus.outR]));
  }
  const m0 = Math.round(firstPlay * SR);
  const mEnd = Math.round(titleAt * SR);
  for (let i = 0; m0 + i < mEnd && i < mus.outL.length; i++) {
    music[0][m0 + i] = mus.outL[i]; music[1][m0 + i] = mus.outR[i];
  }
  // The tape stop, over the first second of the end card: the game's squared-rate
  // brake, darkening as it slows, ending at zero.
  const stopFrom = mEnd - m0;
  for (let i = 0; i < SR; i++) {
    const u = i / SR, rate = (1 - u) ** 2;
    const src = stopFrom + Math.round((1 - (1 - u) ** 3) * SR / 3);
    const cutoff = Math.max(60, 20000 * rate ** 1.5);
    const alpha = 1 - Math.exp(-2 * Math.PI * cutoff / SR);
    const j = mEnd + i;
    if (j >= frames) break;
    for (let c = 0; c < 2; c++) {
      const s = (c ? mus.outR : mus.outL)[src] || 0;
      music[c][j] = i === 0 ? s : music[c][j - 1] + alpha * (s - music[c][j - 1]);
      music[c][j] *= (1 - u) ** 1.4;
    }
  }

  // GAMEPLAY: every cue the game fired, through the real engine, at its frame.
  const cues = await openCueRenderer();
  const cache = new Map();
  const placed = [];
  try {
    for (const shot of shots) {
      const logPath = join(DIR, `${shot.id}.sfx.json`);
      // A close-up on scenery is the scenery's moment: the hero is out of frame, so
      // his landings and pickups would be sounds with nothing on screen to make them.
      if (shot.title || shot.card || (shot.pan && !shot.sfx) || !existsSync(logPath)) continue;
      const t0 = start(shot.id);
      const len = shot.bars * BAR;
      for (const ev of JSON.parse(readFileSync(logPath, 'utf8'))) {
        if (SKIP_CUES.has(ev.name)) continue;
        const { inBeats, inSeconds, when, ...opt } = ev.opt || {};
        const lead = Number.isFinite(inSeconds) ? inSeconds : Number.isFinite(inBeats) ? inBeats * BEAT : 0;
        const at = ev.f / FPS + lead;
        if (at < 0 || at >= len) continue;
        const key = `${ev.name}|${JSON.stringify(opt)}`;
        if (!cache.has(key)) cache.set(key, await cues.render(ev.name, opt, 3));
        const buf = cache.get(key);
        const j0 = Math.round((t0 + at) * SR);
        // A cue ends with its shot: a cut is a cut, and a tail running into the next
        // cabinet reads as that cabinet's sound. A short fade stops it clicking.
        // …unless the next shot is the same take (`continues`): then the tail rides the cut.
        const next = shots[shots.indexOf(shot) + 1];
        const jEnd = Math.round((t0 + len + (shot.continues && next ? next.bars * BAR : 0)) * SR);
        for (let i = 0; i < buf.L.length && j0 + i < Math.min(jEnd, frames); i++) {
          const g = Math.min(1, (jEnd - (j0 + i)) / (0.03 * SR));
          fx[0][j0 + i] += buf.L[i] * g; fx[1][j0 + i] += buf.R[i] * g;
        }
        placed.push(`${(t0 + at).toFixed(2)} ${shot.id} ${ev.name}${opt.hero ? `/${opt.hero}` : ''}`);
      }
    }
  } finally { await cues.close(); }
  writeFileSync(join(DIR, 'cues-placed.txt'), placed.join('\n') + '\n');
  writeFileSync(join(DIR, 'sfx-bus.wav'), wavBuffer(fx));

  // THE MIX. Music sits a little under the effects, which are the point of the reel;
  // both fade in from and out to silence with the picture.
  const MUSIC_G = 10 ** (-4 / 20), FX_G = 10 ** (-4 / 20);   // effects down 3 dB (Peter, 25 Sep)
  const out = [new Float32Array(frames), new Float32Array(frames)];
  let peak = 0;
  for (let i = 0; i < frames; i++) {
    const t = i / SR;
    const env = Math.min(1, t / FADE_IN, (TOTAL - t) / FADE_OUT);
    for (let c = 0; c < 2; c++) {
      out[c][i] = (music[c][i] * MUSIC_G + fx[c][i] * FX_G) * Math.max(0, env);
      peak = Math.max(peak, Math.abs(out[c][i]));
    }
  }
  if (peak > 0.95) for (let i = 0; i < frames; i++) { out[0][i] *= 0.95 / peak; out[1][i] *= 0.95 / peak; }
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
    const a = start(tx.shot) + (tx.at ?? 0.1), b = a + (tx.dur ?? 1.5 * BAR);
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

// docs/feature-reel-script.md, GENERATED from the tables above and the last build:
// every shot with a strip of stills, its text, the cues heard under it, and the line
// in this file to change. `node tools/render-feature-reel.js --script` rewrites it.
function writeScript() {
  const src = readFileSync(new URL(import.meta.url), 'utf8').split('\n');
  const lineOf = (needle) => src.findIndex((l) => l.includes(needle)) + 1;
  const ref = (needle) => `tools/render-feature-reel.js:${lineOf(needle)}`;
  const link = (needle) => `[${ref(needle).split('/').pop()}](../${ref(needle).split(':')[0]}#L${lineOf(needle)})`;
  const clock = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;
  const stills = join(DIR, 'script');
  mkdirSync(stills, { recursive: true });
  const placed = existsSync(join(DIR, 'cues-placed.txt'))
    ? readFileSync(join(DIR, 'cues-placed.txt'), 'utf8').trim().split('\n').map((l) => l.split(' '))
    : [];
  const keyName = { Space: 'jump', ArrowDown: 'slide / kick', KeyX: 'ability' };
  const out = [];
  out.push('# MASHENSTEIN feature reel: shooting script', '',
    'GENERATED by `node tools/render-feature-reel.js --script` from the shot and text tables in',
    '`tools/render-feature-reel.js` and the last build\'s cue logs. Do not hand-edit: change the line',
    'named in each shot\'s **Adjust** entry, rebuild, and regenerate this file.', '',
    `**Length** ${TOTAL.toFixed(1)} s · **Tempo** 150 BPM, 1 bar = ${BAR} s · **Picture** 1920×1080, 60 fps · `
    + '**Export** `work/social/mashenstein-feature-reel-16x9.mp4`', '',
    'The stills are the first, middle and last frames of each shot, from `work/local/feature-reel-build/script/`.',
    'They are made on each run and are not tracked.', '');
  out.push('## Whole-reel settings', '',
    '| Setting | Now | Adjust |', '| --- | --- | --- |',
    `| Fade up from black / down to black | ${FADE_IN} s / ${FADE_OUT} s | ${link('const FADE_IN')} |`,
    `| Silent run-up before the dive's takeoff | ${DIVE_LEAD} s | ${link('const DIVE_LEAD =')} |`,
    `| Music | TERMINAL VELOCITY from bar 45, from the first gameplay shot to the title | ${link('startStep: 44 * 16')} |`,
    `| Music and effects levels | music −4 dB, effects −4 dB | ${link('const MUSIC_G')} |`,
    `| Cues never used | ${[...SKIP_CUES].join(', ') || 'none'} | ${link('const SKIP_CUES')} |`,
    `| Text style (size, colour, position) | cabinet: NEW IN 76 px over the name at 128 px; callout: 104 px yellow; top of frame | ${link("if (tx.style === 'cabinet')")} |`,
    '');
  out.push('## The cut', '');
  let t = 0;
  shots.forEach((shot, n) => {
    const len = shot.bars * BAR;
    const t0 = t; t += len;
    out.push(`### ${n + 1}. ${shot.id}: ${clock(t0)} to ${clock(t)} (${shot.bars} bar${shot.bars === 1 ? '' : 's'})`, '');
    const mp4 = join(DIR, `${shot.id}.mp4`);
    if (existsSync(mp4)) {
      const jpg = join(stills, `${shot.id}.jpg`);
      const frames = Math.round(len * FPS);
      spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', mp4, '-vf',
        `select='eq(n\\,2)+eq(n\\,${Math.round(frames / 2)})+eq(n\\,${frames - 2})',scale=480:-1,tile=3x1:padding=6`,
        '-frames:v', '1', '-q:v', '3', jpg]);
      out.push(`![${shot.id}](../work/local/feature-reel-build/script/${shot.id}.jpg)`, '');
    }
    out.push(shot.note || '', '');
    const rows = [];
    if (shot.stage) {
      rows.push(['Stage', `${shot.stage}, ${shot.hero}, from ${shot.at}% of the stage, ${shot.pre ?? 0} s of pre-roll`]);
      if (shot.inject?.length) rows.push(['Placed on the lane', shot.inject.map((i) => `${i.type}${i.rungs ? ` ×${i.rungs}` : ''} reaches the hero at ${i.at} s`).join('; ')]);
      if (shot.keys?.length) rows.push(['Inputs', shot.keys.map((k) => `${keyName[k.code] || k.code} at ${k.t} s (held ${k.hold ?? 0.12} s)`).join('; ')]);
      if (shot.track) rows.push(['Framing', `follows the hero, ${(SW / shot.track.w).toFixed(2)}× zoom, hero ${Math.round(shot.track.heroAt * 100)}% across, ground ${Math.round((shot.track.groundAt ?? 0.8) * 100)}% down`
        + (shot.track.wTo ? `; zooms to ${(SW / shot.track.wTo).toFixed(2)}× from ${shot.track.at} s` : '')]);
      else if (shot.pan) rows.push(['Framing', `close-up, ${(SW / shot.pan.w).toFixed(2)}× zoom, rendered at ${shot.res || 1}×; pans from (${shot.pan.from}) to (${shot.pan.to}) in 4K px; hero hidden, hero cues muted`]);
      else rows.push(['Framing', 'the whole frame']);
      if (shot.songBeat) rows.push(['Song clock', `beat ${shot.songBeat.beat} at ${shot.songBeat.at} s (neon strikes on beats 56 and 176)`]);
      if (Number.isFinite(shot.bgT)) rows.push(['Scenery clock', `${shot.bgT} s at frame 0`]);
      if (shot.floaties) rows.push(['Floating text', 'on (the game\'s own asides show)']);
      if (shot.continues) rows.push(['Cut', 'continuous with the next shot; cue tails carry across']);
    } else if (shot.card) rows.push(['Card', `"${[].concat(shot.card).join(' / ')}" in Lilita One on black, pushing in`]);
    else if (shot.title) rows.push(['Card', '`work/local/teaser/titleclip.mjs`, rendered at this length']);
    else if (shot.intro) rows.push(['Source', 'the intro film from the dive\'s takeoff; its own cues, logged on their frames']);
    const words = texts.map((x, i) => ({ ...x, i })).filter((x) => x.shot === shot.id);
    for (const w of words) {
      const a = t0 + (w.at ?? 0.1), b = a + (w.dur ?? 1.5 * BAR);
      rows.push(['Text', `${w.style === 'cabinet' ? `${w.kicker || 'NEW IN'} / **${w.text}**` : `**${w.text}**`}, ${clock(a)} to ${clock(b)} · ${link(`text: '${w.text}'`)}`]);
    }
    const heard = placed.filter(([, id]) => id === shot.id).map(([at, , name]) => `${name} ${(+at - t0).toFixed(2)} s`);
    if (shot.stage || shot.intro) rows.push(['Cues heard', heard.length ? heard.join(', ') : (shot.pan ? 'none (music only)' : 'none')]);
    rows.push(['Adjust', link(`id: '${shot.id}', `)]);
    out.push('| | |', '| --- | --- |', ...rows.map(([k, v]) => `| ${k} | ${v} |`), '');
  });
  out.push('## Rebuild', '', '```sh',
    'MASH_DEV_URL=http://localhost:8001 node tools/render-feature-reel.js --probe --shots=<id>        # quick contact sheet + cue log',
    'MASH_DEV_URL=http://localhost:8001 node tools/render-feature-reel.js --probe --wide --shots=<id> # find scenery for a close-up',
    'MASH_DEV_URL=http://localhost:8001 node tools/render-feature-reel.js --capture-only --shots=<id>',
    'MASH_DEV_URL=http://localhost:8001 node tools/render-feature-reel.js --assemble                  # text + soundtrack + cut',
    'node tools/render-feature-reel.js --script                                                       # this file',
    '```', '', 'More on how shots are made is in `docs/FEATURE_REEL_HANDOVER.md`.', '');
  writeFileSync(join(ROOT, 'docs/feature-reel-script.md'), out.join('\n'));
  console.log('docs/feature-reel-script.md');
}

// ---------------------------------------------------------------- main

async function main() {
  const selected = process.argv.find((a) => a.startsWith('--shots='))?.slice(8).split(',') || null;
  const pick = (s) => !selected || selected.includes(s.id);
  if (arg('--script')) { writeScript(); return; }
  const probe = arg('--probe'), captureOnly = arg('--capture-only');
  const audioOnly = arg('--audio-only'), assembleOnly = arg('--assemble');
  const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    if (probe) {
      // --wide: the whole frame, bigger tiles — for finding where a piece of scenery
      // is before framing a close-up on it.
      const wide = arg('--wide');
      for (const s of shots) {
        if (!pick(s) || !s.stage) continue;
        await probeShot(browser, wide ? { ...s, track: null, pan: null, crop: WIDE, res: 1, wideProbe: true } : s);
      }
      return;
    }
    if (assembleOnly) await renderText(browser);
    if (!audioOnly && !assembleOnly) {
      for (const s of shots) {
        if (!pick(s)) continue;
        if (s.intro) await captureDive(browser, s);
        else if (s.stage) await captureShot(browser, s);
      }
      if (captureOnly) return;
      await renderText(browser);
    }
  } finally { await browser.close(); }
  if (probe || captureOnly) return;
  const wav = arg('--keep-audio') && existsSync(join(DIR, 'soundtrack.wav')) ? join(DIR, 'soundtrack.wav') : await renderAudio();
  if (audioOnly) return;
  assemble(wav);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
