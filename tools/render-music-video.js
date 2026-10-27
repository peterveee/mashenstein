// The CORPORATE KOMBAT music video: the Lab's club and full-frame hero dances, cut on the
// song's bar lines. A YouTube teaser, so the office cabinet itself never appears, and neither
// does any interface: no buttons, captions, cards or menus.
//
//   MASH_DEV_URL=http://localhost:8001 node tools/render-music-video.js            everything
//   ... --probe          one frame a bar of the club take, half size, as a contact sheet
//   ... --club           recapture the club take only
//   ... --dances         re-render the full-frame dances only
//   ... --slogans        re-render the words layer (and the end card) only
//   ... --assemble       cut what is on disk into the export
//
// Everything lands in work/video/corporate-kombat-mv/. The song is
// `node tools/render-track.js office 1 work/video/corporate-kombat-mv/song.wav --no-loop`.
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
mkdirSync(DIR, { recursive: true });

/** The frame bar `b` (1-based) starts on. */
const F = (b) => Math.round((b - 1) * BAR * FPS);

// The whole song: the club to the top of bar 59, then the end card over the last two bars
// and the song's ring-out. END is the last frame + 1.
const RANGE = { from: 1, to: 59 };
const END = F(61) + 2 * FPS;

// Hero indices are club-fx.js HERO_MOVES' order.
const HERO = { lorenzo: 0, b33p: 1, ramon: 2, grumpos: 3, kiko: 4, clara: 5, fernwick: 6, rusty: 7 };

// THE CUE SHEET: what is done to the room, and on which bar (1-based, fractions allowed).
//   sky   — lasers from the truss (two patterns, two bars each)
//   can   — a par can's light show, in its colour
//   hold  — a hero held down until `until`
//   tap   — a hero tapped (B-33P: the room onto its CRT, and off again)
//   led   — a line on the LED board
//   moment — a crowd moment (confetti, streamers, sticks, toaster, smoke, ball, moonwalk, spotlight…)
const CUES = [
  { bar: 5, do: 'sky' },
  { bar: 7, do: 'can', k: 0 },
  { bar: 9, do: 'led', text: 'CORPORATE KOMBAT' },
  { bar: 9, do: 'sky' },
  { bar: 13, do: 'can', k: 1 },
  { bar: 15, do: 'hold', hero: 'grumpos', until: 17 },
  { bar: 17, do: 'moment', kind: 'confetti', options: { streamers: true } },
  { bar: 21, do: 'hold', hero: 'lorenzo', until: 25 },
  { bar: 28.75, do: 'tap', hero: 'b33p' },
  { bar: 32.75, do: 'tap', hero: 'b33p' },
  { bar: 33, do: 'sky' },
  { bar: 37, do: 'moment', kind: 'smoke' },
  { bar: 41, do: 'moment', kind: 'toaster' },
  { bar: 45, do: 'moment', kind: 'sticks' },
  { bar: 45, do: 'can', k: 2 },
  { bar: 49, do: 'moment', kind: 'moonwalk' },
  { bar: 49, do: 'sky' },
  { bar: 51, do: 'can', k: 3 },
  { bar: 53, do: 'moment', kind: 'confetti', options: { streamers: true } },
  { bar: 53, do: 'sky' },
  { bar: 57, do: 'led', text: 'OUT OF OFFICE' },
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

// THE EDIT, in bars [from, to). `club` is framed `wide` (the whole room), on a hero at `zoom`
// (2 is a native 1920 crop of the 4K frame), or on a point `at` in 4K px. `dance` is a
// full-frame hero dance on black. No visualisers: tried in the first cut and dropped (Peter,
// 27 Oct 2026).
const BALL = [1920, 440];   // the mirror ball, in the 4K frame
const EDIT = [
  // LOBBY MUZAK: the gang walks in; the ball comes down
  { from: 1, to: 3, src: 'club', frame: 'wide' },
  { from: 3, to: 5, src: 'club', frame: { at: BALL, zoom: 2 } },
  // BAND RE-ENTRY: the lasers
  { from: 5, to: 7, src: 'club', frame: 'wide' },
  { from: 7, to: 9, src: 'club', frame: { hero: 'fernwick', zoom: 2 } },
  // GROOVE
  { from: 9, to: 11, src: 'club', frame: 'wide' },
  { from: 11, to: 13, src: 'club', frame: { hero: 'clara', zoom: 2 } },
  { from: 13, to: 15, src: 'club', frame: 'wide' },
  { from: 15, to: 17, src: 'club', frame: { hero: 'grumpos', zoom: 2 } },
  // A
  { from: 17, to: 18, src: 'club', frame: 'wide' },
  { from: 18, to: 19, src: 'club', frame: { hero: 'kiko', zoom: 2 } },
  { from: 19, to: 20, src: 'dance', hero: 'b33p', move: 'servo-pivot' },
  { from: 20, to: 21, src: 'dance', hero: 'rusty', move: 'paws-up' },
  { from: 21, to: 23, src: 'club', frame: 'wide' },
  { from: 23, to: 25, src: 'club', frame: { hero: 'lorenzo', zoom: 2 } },
  // A2: the water drains; B-33P puts the room on its CRT
  { from: 25, to: 27, src: 'club', frame: 'wide' },
  { from: 27, to: 29, src: 'club', frame: { hero: 'b33p', zoom: 2 } },
  { from: 29, to: 31, src: 'club', frame: 'wide' },
  { from: 31, to: 32, src: 'dance', hero: 'clara', move: 'rope-swing' },
  { from: 32, to: 33, src: 'dance', hero: 'ramon', move: 'orbit-uppercut' },
  // B: the minor turn
  { from: 33, to: 35, src: 'club', frame: 'wide' },
  { from: 35, to: 37, src: 'club', frame: { hero: 'ramon', zoom: 2 } },
  { from: 37, to: 39, src: 'club', frame: 'wide' },
  { from: 39, to: 40, src: 'dance', hero: 'kiko', move: 'siren-sweep' },
  { from: 40, to: 41, src: 'dance', hero: 'grumpos', move: 'beard-bounce' },
  // A3: the toaster, the glow sticks
  { from: 41, to: 43, src: 'club', frame: 'wide' },
  { from: 43, to: 45, src: 'club', frame: { hero: 'rusty', zoom: 2 } },
  { from: 45, to: 47, src: 'club', frame: 'wide' },
  { from: 47, to: 49, src: 'club', frame: { hero: 'kiko', zoom: 2 } },
  // CLIMAX: the group moonwalk, the confetti
  { from: 49, to: 51, src: 'club', frame: 'wide' },
  { from: 51, to: 53, src: 'club', frame: { hero: 'lorenzo', zoom: 2 } },
  { from: 53, to: 55, src: 'club', frame: 'wide' },
  { from: 55, to: 56, src: 'dance', hero: 'fernwick', move: 'leaf-fan' },
  { from: 56, to: 57, src: 'dance', hero: 'lorenzo', move: 'valve-twist' },
  // OUTRO, then the end card (the slogan layer draws it; this is under it)
  { from: 57, to: 59, src: 'club', frame: 'wide' },
  { from: 59, to: null, src: 'black' },
];

// THE SLOGANS: full-screen words in the game's title face, slammed in on the beat — office
// talk over a club night. `at` is beats into the bar; each word replaces the last, and the
// last holds until `until` beats. `card` puts them on a solid colour, full frame, instead of
// over the picture.
const SLOGANS = [
  { bar: 1, words: [[0, 'YOUR CALL'], [2, 'IS IMPORTANT'], [4, 'TO US']], until: 6 },
  { bar: 3, words: [[0, 'PLEASE'], [2, 'HOLD']], until: 4 },
  { bar: 4, words: [[2, 'CORPORATE'], [3, 'KOMBAT']], until: 4, card: '#ff4fa3' },
  { bar: 9, words: [[0, 'CLOCK IN']], until: 2 },
  { bar: 13, words: [[0, 'GREEN'], [1, 'LIGHT']], until: 3 },
  { bar: 15, words: [[0, "LET'S"], [1, 'CIRCLE'], [2, 'BACK']], until: 4 },
  { bar: 16, words: [[2, 'SYNERGY!']], until: 4, card: '#ffcf33' },
  { bar: 19, words: [[0, 'PERFORMANCE'], [2, 'REVIEW']], until: 4 },
  { bar: 20, words: [[0, 'EMPLOYEE'], [2, 'OF THE'], [3, 'MONTH']], until: 4 },
  { bar: 21, words: [[0, 'DEEP'], [1, 'DIVE']], until: 4 },
  { bar: 29, words: [[0, 'DIGITAL'], [2, 'TRANSFORMATION']], until: 4 },
  { bar: 33, words: [[0, 'MANDATORY'], [2, 'FUN']], until: 4 },
  { bar: 37, words: [[0, 'FIRE'], [1, 'DRILL!']], until: 3 },
  { bar: 41, words: [[0, 'HOT'], [1, 'DESKING']], until: 3 },
  { bar: 45, words: [[0, 'TEAM'], [2, 'BUILDING']], until: 4 },
  { bar: 48, words: [[2, 'OVERTIME!']], until: 4, card: '#48e0c8' },
  { bar: 49, words: [[0, 'MOVING'], [2, 'FORWARD']], until: 4 },
  { bar: 53, words: [[0, 'EXCEEDS'], [2, 'EXPECTATIONS']], until: 4 },
  { bar: 57, words: [[0, "LET'S TAKE THIS"], [2, 'OFFLINE']], until: 4 },
  { bar: 58, words: [[2, 'OUT OF'], [3, 'OFFICE']], until: 4, card: '#ff4fa3' },
];
// ...and the end card, from the top of bar 59: the marquee, the song, COMING SOON a bar later.
const END_CARD = { from: 59, soon: 60, fadeOut: 0.8 };

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

async function openClub(browser, scale, frames) {
  const page = await browser.newPage({ viewport: { width: SW * scale, height: SH * scale } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(INIT, SEED);
  await page.goto(`${BASE}/?mute&density=${8 * scale}&goto=lab`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => window.__mash_booted && window.__mash_render_loop
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
      } else if (cue.do === 'can') c.tapCan(cue.k);
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
    plan.push({ g, cues, frame: grab(g) });
  }
  return page.evaluate(({ plan, outW, scale, SW, SH }) => {
    const R = window.__mv;
    const c = window.__mash_cur;
    const canvas = document.getElementById('game');
    if (!R.out) { R.out = document.createElement('canvas'); R.ctx = R.out.getContext('2d'); }
    const outs = [];
    for (const p of plan) {
      R.frame = p.g;
      window.__mvClock = R.t0 + p.g / 60;
      for (const cue of p.cues) R.act(cue);
      window.__mash_render_loop.stepOffline();
      if (!p.frame) continue;
      let rect = [0, 0, SW, SH];
      if (p.frame !== 'wide' && p.frame.at) {
        const w = SW / p.frame.zoom, h = SH / p.frame.zoom;
        const [x, y] = p.frame.at;
        rect = [Math.max(0, Math.min(SW - w, x - w / 2)), Math.max(0, Math.min(SH - h, y - h / 2)), w, h];
      } else if (p.frame !== 'wide') {
        const b = c.boxes.heroes[p.frame.i];
        const w = SW / p.frame.zoom, h = SH / p.frame.zoom;
        // the hero's box in the 480x270 frame, x8 at 4K; their middle a little above centre
        const cx = b ? (b.x + b.w / 2) * 8 : SW / 2, cy = b ? (b.y + b.h * 0.55) * 8 : SH / 2;
        // eased, so a dance's sway is not a shaky camera
        R.cam = R.cam && R.cam.i === p.frame.i ? R.cam : { i: p.frame.i, x: cx, y: cy };
        R.cam.x += (cx - R.cam.x) * 0.08; R.cam.y += (cy - R.cam.y) * 0.08;
        rect = [Math.max(0, Math.min(SW - w, R.cam.x - w / 2)), Math.max(0, Math.min(SH - h, R.cam.y - h / 2)), w, h];
      }
      const ow = outW, oh = Math.round(outW * 9 / 16);
      if (R.out.width !== ow) { R.out.width = ow; R.out.height = oh; }
      R.ctx.imageSmoothingEnabled = true; R.ctx.imageSmoothingQuality = 'high';
      R.ctx.drawImage(canvas, rect[0] * scale, rect[1] * scale, rect[2] * scale, rect[3] * scale, 0, 0, ow, oh);
      outs.push(R.out.toDataURL('image/png').split(',')[1]);
    }
    return outs;
  }, { plan, outW, scale, SW, SH });
}

function framingAt(g) {
  for (const e of EDIT) {
    if (g >= F(e.from) && (e.to == null || g < F(e.to))) {
      if (e.src !== 'club') return 'wide';   // the take covers the whole range; the cut picks
      if (e.frame === 'wide') return 'wide';
      return e.frame.at ? { at: e.frame.at, zoom: e.frame.zoom } : { i: HERO[e.frame.hero], zoom: e.frame.zoom };
    }
  }
  return 'wide';
}

async function probeClub(browser) {
  const total = F(RANGE.to);
  const { page, errors } = await openClub(browser, 0.5, total);
  const dir = join(DIR, 'probe');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  let n = 0;
  try {
    for (let b = 1; b < RANGE.to; b++) {
      // up to a beat into bar b, then one frame, wide
      const at = F(b) + Math.round(BAR * FPS / 4);
      const from = b === 1 ? 0 : F(b - 1) + Math.round(BAR * FPS / 4) + 1;
      const pngs = await stepClub(page, from, at + 1, (g) => (g === at ? 'wide' : null), 960, 0.5);
      writeFileSync(join(dir, `${String(n++).padStart(3, '0')}.png`), Buffer.from(pngs[0], 'base64'));
    }
    const state = await page.evaluate(() => {
      const c = window.__mash_cur, A = window.__mash_audio;
      return { beat: A.songBeat(), bar: A.songBeat() / 4 + 1, heroes: c.boxes.heroes.map((b) => b && [b.x, b.y, b.w, b.h].map(Math.round)) };
    });
    console.log(JSON.stringify(state));
    command('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '1', '-i', join(dir, '%03d.png'),
      '-vf', 'tile=4x6:padding=4', '-frames:v', '1', join(DIR, 'probe-club.jpg')]);
    console.log(join(DIR, 'probe-club.jpg'));
    if (errors.length) console.log(`page errors: ${errors.slice(0, 5).join(' | ')}`);
  } finally { await page.close(); }
}

async function captureClub(browser) {
  const g0 = F(RANGE.from), g1 = F(RANGE.to);
  const { page, errors } = await openClub(browser, 1, g1);
  const size = await page.evaluate(() => { const c = document.getElementById('game'); return [c.width, c.height]; });
  if (size[0] !== SW || size[1] !== SH) throw new Error(`Expected ${SW}x${SH}, got ${size.join('x')}`);
  const out = join(DIR, 'club.mp4');
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
    console.log(`club.mp4: frames ${g0}–${g1} (bars ${RANGE.from}–${RANGE.to - 1})`);
    const missed = await page.evaluate(() => window.__mv.missed);
    if (missed.length) console.log(`cues the club refused: ${missed.join(', ')}`);
    if (errors.length) console.log(`page errors: ${errors.slice(0, 5).join(' | ')}`);
  } finally { await page.close(); }
}

// ---------------------------------------------------------------- the dances

// A hero dancing, full frame, on plain black: the club's own dance (hero-dance-candidates.js),
// on the song's beat.
const DANCE_ENTRY = `
import { HERO_DANCE_LAB_CANDIDATES, drawHeroDance } from './src/dev/hero-dance-candidates.js';
window.danceFrames = (hero, move, beats, w, h) => {
  const cand = HERO_DANCE_LAB_CANDIDATES.find((c) => c.hero === hero && c.move === move);
  if (!cand) throw new Error('no dance ' + hero + '/' + move);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  return beats.map((beat) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
    drawHeroDance(ctx, cand, beat, w / 2, h * 0.92, h * 0.78);
    return c.toDataURL('image/png').split(',')[1];
  });
};
`;

async function renderDances() {
  const { browser, page } = await openArtPage(await bundleEntry(DANCE_ENTRY, ROOT));
  try {
    for (const e of EDIT.filter((x) => x.src === 'dance')) {
      const out = join(DIR, `dance-${e.hero}-${e.move}-${e.from}.mp4`);
      const ff = x264(out);
      for (let a = F(e.from); a < F(e.to); a += 20) {
        const beats = [];
        for (let g = a; g < Math.min(F(e.to), a + 20); g++) beats.push(g / FPS * BPM / 60);
        const pngs = await page.evaluate(({ hero, move, beats, W, H }) => window.danceFrames(hero, move, beats, W, H),
          { hero: e.hero, move: e.move, beats, W, H });
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
function word(f, w, h) {
  const punch = 1 + 0.32 * Math.pow(1 - Math.min(1, f.age / 7), 3);
  ctx.save();
  if (f.card) { ctx.fillStyle = f.card; ctx.fillRect(0, 0, w, h); }
  ctx.translate(w / 2, h / 2);
  ctx.rotate((hash(f.n) - 0.5) * 0.09);
  ctx.scale(punch, punch);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.letterSpacing = '6px';
  const px = fit(f.text, w * 0.86, h * 0.34);
  if (f.card) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillText(f.text, 10, 14);
    ctx.fillStyle = '#1c1405'; ctx.fillText(f.text, 0, 0);
  } else {
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 34; ctx.shadowOffsetY = 12;
    ctx.lineWidth = Math.max(10, px / 8); ctx.strokeStyle = '#1c1405'; ctx.strokeText(f.text, 0, 0);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = f.n % 2 ? '#ffffff' : '#ffcf33'; ctx.fillText(f.text, 0, 0);
  }
  ctx.restore();
}
function endCard(f, w, h) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalAlpha = f.fade;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.letterSpacing = '8px';
  const punch = 1 + 0.18 * Math.pow(1 - Math.min(1, f.age / 9), 3);
  ctx.save();
  ctx.translate(w / 2, h * 0.4); ctx.scale(punch, punch);
  const px = fit('MASHENSTEIN', w * 0.8, h * 0.3);
  const d = Math.round(px / 22);
  ctx.lineWidth = Math.max(8, px / 14); ctx.strokeStyle = '#2a1e05';
  ctx.strokeText('MASHENSTEIN', d, d); ctx.fillStyle = '#a8791f'; ctx.fillText('MASHENSTEIN', d, d);
  ctx.strokeText('MASHENSTEIN', 0, 0); ctx.fillStyle = '#ffcf33'; ctx.fillText('MASHENSTEIN', 0, 0);
  ctx.restore();
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
    if (f) (f.end ? endCard : word)(f, w, h);
    return c.toDataURL('image/png').split(',')[1];
  });
};
`;

/** What the words layer shows on frame g: a word, the end card, or null. */
function sloganAt(g) {
  const beatF = BAR * FPS / 4;
  const endAt = F(END_CARD.from);
  if (g >= endAt) {
    const left = (END - g) / FPS;
    return { end: true, age: g - endAt, soon: g - F(END_CARD.soon), fade: Math.max(0, Math.min(1, left / END_CARD.fadeOut)) };
  }
  let n = 0;
  for (const s of SLOGANS) {
    const at = (beats) => F(s.bar) + Math.round(beats * beatF);
    for (let k = 0; k < s.words.length; k++, n++) {
      const a = at(s.words[k][0]);
      const b = k + 1 < s.words.length ? at(s.words[k + 1][0]) : at(s.until);
      if (g >= a && g < b) return { text: s.words[k][1], age: g - a, n, card: s.card || null };
    }
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
  const g0 = F(RANGE.from);
  const inputs = [];
  const parts = [];
  const input = (path) => {
    if (!existsSync(path)) throw new Error(`missing ${path}`);
    let k = inputs.findIndex((x) => x.at(-1) === path);
    if (k < 0) { inputs.push(['-i', path]); k = inputs.length - 1; }
    return k;
  };
  EDIT.forEach((e, n) => {
    const a = F(e.from), b = e.to == null ? END : F(e.to);
    let k, s = 0;
    if (e.src === 'club') { k = input(join(DIR, 'club.mp4')); s = a - g0; }
    else if (e.src === 'black') {
      inputs.push(['-f', 'lavfi', '-i', `color=c=black:s=${W}x${H}:r=${FPS}:d=${((b - a) / FPS + 1).toFixed(3)}`]);
      k = inputs.length - 1;
    } else k = input(join(DIR, `dance-${e.hero}-${e.move}-${e.from}.mp4`));
    parts.push(`[${k}:v]trim=start_frame=${s}:end_frame=${s + b - a},setpts=PTS-STARTPTS,fps=${FPS},scale=${W}:${H},setsar=1[p${n}]`);
  });
  const words = input(join(DIR, 'slogans.mov'));
  const a = input(SONG_WAV);
  const dur = END / FPS;
  const filter = [...parts,
    `${EDIT.map((_, n) => `[p${n}]`).join('')}concat=n=${EDIT.length}:v=1:a=0[cut]`,
    `[${words}:v]format=rgba,setpts=PTS-STARTPTS[w]`,
    '[cut][w]overlay=0:0:format=auto:eof_action=pass,format=yuv420p[v]',
    `[${a}:a]atrim=start=0:duration=${dur.toFixed(6)},asetpts=PTS-STARTPTS,afade=t=out:st=${(dur - 1.2).toFixed(3)}:d=1.2[a]`];
  const out = join(DIR, 'corporate-kombat-music-video.mp4');
  command('ffmpeg', ['-y', '-loglevel', 'error', ...inputs.flat(), '-filter_complex', filter.join(';'),
    '-map', '[v]', '-map', '[a]', '-frames:v', String(END), '-r', String(FPS), '-c:v', 'libx264', '-preset', 'slow', '-crf', '14',
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', out]);
  console.log(`${out}  ${dur.toFixed(2)} s`);
}

// ---------------------------------------------------------------- main

async function main() {
  if (!existsSync(SONG_WAV)) throw new Error(`render the song first: node tools/render-track.js office 1 ${SONG_WAV} --no-loop`);
  const only = ['--probe', '--club', '--dances', '--slogans', '--assemble'].filter(arg);
  const want = (k) => !only.length || only.includes(k);
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
