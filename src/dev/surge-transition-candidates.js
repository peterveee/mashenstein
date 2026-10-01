// THE SURGE — how one cabinet's look hands over to the next (bake-off, 1 Oct 2026).
//
// Peter: the Surge cycles every cabinet's backdrop, and the change should be "relatively
// dramatic" — the pixel/CRT look that opens plumber-1 was the one he named. What ships
// today is a seven-second timer on game time with a faint magenta flicker at the cut,
// not on the music at all. Every card here changes look on THE SURGE's own bar line
// instead: four bars a look at 132 BPM (7.3 s, so the pace barely moves), the change
// landing on the next bar's downbeat.
//
// Each card is the backdrop only, the way plumber-1's intro is: the lane and the hero
// stay crisp in front, on the outgoing look until the downbeat and the incoming one from
// it. The exceptions are said in their notes — a flash, a shake and a tape overlay are
// over the whole frame, because that is what they are.
//
// The pixel and CRT moves are plumber-1's own (engine/arcadeIntro.js), except that the
// picture is AVERAGED into its cells (round one's A) rather than snapped to Field
// Service's nineteen inks, which are that cabinet's colours and would turn every other
// look to mud. The other moves are the megamix visualiser's (engine/visualisers.js
// MEGAMIX_TRANSITIONS), rebuilt for backdrops and moved onto sixteenths.
import { W, H } from '../engine/renderer.js';
import {
  buildPyramid, blitLevel, pyramid, crtPass, CRT_SOFT, switchOff, blackTube,
  arcadeLandingDrop, clamp01,
} from '../engine/arcadeIntro.js';
import { TapeRewindEffect } from '../game/rewindFx.js';

export const SURGE_FX_BPM = 132;
// Four bars a look.
export const SURGE_FX_SLOT_BEATS = 16;
const SPB = 60 / SURGE_FX_BPM;

const mod = (a, n) => ((a % n) + n) % n;
const smooth = (v) => v * v * (3 - 2 * v);
function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// The game's shake (renderer.js shake): a fresh offset of up to ±power frame px on each
// axis every frame, at full strength until the last quarter second, then easing out.
function shaken(ctx, sec, power, secs, paint) {
  let dx = 0, dy = 0;
  if (sec >= 0 && sec < secs) {
    const p = power * Math.min(1, (secs - sec) * 4);
    const f = Math.floor(sec * 60);
    dx = (hash(f) * 2 - 1) * p;
    dy = (hash(f + 97) * 2 - 1) * p;
  }
  ctx.save();
  ctx.translate(dx, dy);
  paint();
  ctx.restore();
}

// A look on plumber-1's tube, averaged into cells of 2^lv frame px (1..4: 2..16 px).
function onTube(fx, i) {
  buildPyramid((g) => fx.bg(i, g), fx.base);
}
function tube(ctx, fx, lv) {
  crtPass(ctx, fx.k, (c) => blitLevel(c, lv), CRT_SOFT);
}

// A look painted at the device's density into a scratch canvas, for the moves that lay
// a whole backdrop down at an alpha: the packs set globalAlpha themselves, so it cannot
// be handed to them.
let scratch = null;
function offscreen(fx, i, paint = (j, g) => fx.bg(j, g)) {
  const w = Math.max(1, Math.round(W * fx.k)), h = Math.max(1, Math.round(H * fx.k));
  if (!scratch) scratch = document.createElement('canvas');
  if (scratch.width !== w || scratch.height !== h) { scratch.width = w; scratch.height = h; }
  const g = scratch.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, w, h);
  g.setTransform(fx.k, 0, 0, fx.k, 0, 0);
  paint(i, g);
  return scratch;
}

function wash(ctx, color, alpha) {
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = color;
  ctx.fillRect(-20, -20, W + 40, H + 40);
  ctx.restore();
}

// fx, handed to every draw:
//   u        beats from the downbeat the change lands on (negative before it)
//   sec      the same in seconds
//   out, in  the outgoing and incoming looks' indices
//   change   which change this is, counting from the first (seeds the shuffles)
//   bg(i, g, dy = 0, scrub = 0)  look i's backdrop, dy frame px down, camera scrub px back
//   world(i, g)                  the lane, the hero and the look's post pass, for look i
//   k        device px per frame px;  base  the colour a picture is laid on;  t  seconds
export const SURGE_FX_CANDIDATES = [
  {
    letter: 'A', id: 'now', name: 'NOW — the shipped seven-second timer',
    note: 'What ships: the pack under the Surge picks a look off game time every 7 s, with a faint magenta '
      + 'slice flicker for the last quarter second. Not on the music; the bar strip shows how far off it drifts.',
    now: true,
  },
  {
    letter: 'B', id: 'power-down', name: 'POWER DOWN',
    note: 'Plumber-1\'s own move, every four bars. On 4.3 the look crunches onto the tube (2, 4, 8 px on the '
      + 'sixteenths), on 4.4 the set switches off to black, and on 5.1 the next look lands like a sheet: the 8 px '
      + 'drop and the game\'s shake.',
    lead: 2, tail: 0.6,
    draw(ctx, fx) {
      if (fx.u < -1) {
        onTube(fx, fx.out);
        tube(ctx, fx, [1, 2, 3, 3][Math.min(3, Math.floor((fx.u + 2) * 4))]);
        fx.world(fx.out, ctx);
      } else if (fx.u < 0) {
        onTube(fx, fx.out);
        switchOff(ctx, fx.u + 1, () => tube(ctx, fx, 3), blackTube(ctx));
        fx.world(fx.out, ctx);
      } else {
        shaken(ctx, fx.sec, 3, 0.25, () => {
          fx.bg(fx.in, ctx, arcadeLandingDrop(fx.sec));
          fx.world(fx.in, ctx);
        });
      }
    },
  },
  {
    letter: 'C', id: 'power-cycle', name: 'POWER CYCLE',
    note: 'The set goes off and comes back on another channel. On 4.4 the look switches off to black; on 5.1 '
      + 'the tube powers up (a dot, a line, the picture) on the next look in 16 px blocks, with a heavier shake, '
      + 'and it sharpens 16, 8, 4, 2 px on the sixteenths of beat 1 into the full look.',
    lead: 1, tail: 1.5,
    draw(ctx, fx) {
      if (fx.u < 0) {
        switchOff(ctx, fx.u + 1, () => fx.bg(fx.out, ctx), blackTube(ctx));
        fx.world(fx.out, ctx);
        return;
      }
      shaken(ctx, fx.sec, 4, 0.3, () => {
        onTube(fx, fx.in);
        if (fx.u < 0.5) switchOff(ctx, 1 - fx.u / 0.5, () => tube(ctx, fx, 4), blackTube(ctx));
        else tube(ctx, fx, 4 - Math.min(3, Math.floor((fx.u - 0.5) * 4)));
        fx.world(fx.in, ctx);
      });
    },
  },
  {
    letter: 'D', id: 'flash-cut', name: 'FLASH CUT',
    note: 'A hard cut on the downbeat inside a white flash that peaks exactly on it, and a shake as it lands. '
      + 'The flash is over the whole frame, lane and hero included. Costs nothing.',
    lead: 0.75, tail: 0.75,
    draw(ctx, fx) {
      const i = fx.u < 0 ? fx.out : fx.in;
      shaken(ctx, fx.sec, 4, 0.3, () => {
        fx.bg(i, ctx);
        fx.world(i, ctx);
      });
      const near = 1 - Math.abs(fx.u) / 0.75;
      wash(ctx, '#fff6ec', Math.pow(near, 2.2) * 0.85);
    },
  },
  {
    letter: 'E', id: 'beat-stutter', name: 'BEAT STUTTER',
    note: 'The last two beats chop between the two looks on the sixteenths, the odds tipping toward the new one '
      + 'and the last two chops committed to it, a white tick on every flip. One look a frame, so it is cheap.',
    lead: 2, tail: 0,
    draw(ctx, fx) {
      const steps = 8;
      const f = (fx.u + 2) / 2 * steps;
      const step = Math.min(steps - 1, Math.floor(f));
      const onNew = (s) => s >= steps - 2 || (s > 0 && hash(fx.change * 31 + s) < 0.15 + s * 0.1);
      fx.bg(onNew(step) ? fx.in : fx.out, ctx);
      fx.world(fx.out, ctx);
      if (step === 0 || onNew(step) !== onNew(step - 1)) wash(ctx, '#ffffff', Math.pow(1 - (f - step), 5) * 0.35);
    },
  },
  {
    letter: 'F', id: 'block-shatter', name: 'BLOCK SHATTER',
    note: 'The next look arrives in 16 x 9 blocks over the last two beats, a batch every sixteenth, each batch '
      + 'lit at the edges as it lands; the last block falls on the downbeat. Two looks a frame for those beats.',
    lead: 2, tail: 0,
    draw(ctx, fx) {
      const cols = 16, rows = 9, steps = 8;
      const f = (fx.u + 2) / 2 * steps;
      const step = Math.min(steps, Math.floor(f + 1e-6));
      const n = cols * rows;
      const order = Array.from({ length: n }, (_, i) => i)
        .sort((a, b) => hash(fx.change * 977 + a) - hash(fx.change * 977 + b));
      const shown = Math.round(step / steps * n);
      const cw = W / cols, ch = H / rows;
      const boxes = (start, end, inset) => {
        for (let i = start; i < end; i++) {
          const c = order[i];
          ctx.rect((c % cols) * cw + inset, Math.floor(c / cols) * ch + inset, cw - inset * 2, ch - inset * 2);
        }
      };
      fx.bg(fx.out, ctx);
      if (shown) {
        ctx.save();
        ctx.beginPath();
        boxes(0, shown, -0.25);
        ctx.clip();
        fx.bg(fx.in, ctx);
        ctx.restore();
        const glow = (1 - (f - step)) * 0.8;
        if (glow > 0.02 && step > 0) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = `rgba(255,236,200,${glow.toFixed(3)})`;
          ctx.lineWidth = 1.25;
          ctx.beginPath();
          boxes(Math.round((step - 1) / steps * n), shown, 0.5);
          ctx.stroke();
          ctx.restore();
        }
      }
      fx.world(fx.out, ctx);
    },
  },
  {
    letter: 'G', id: 'tape-rewind', name: 'TAPE REWIND',
    note: 'The death rewind\'s tape, as a change of cassette. Over the last two beats the look scrubs backwards, '
      + 'goes soft, and tears sideways in bands; on the downbeat it cuts to the next look with a shake and the '
      + 'tape clears over a beat. The tape overlay is over the whole frame.',
    lead: 2, tail: 1,
    draw(ctx, fx) {
      const tape = fx.tape || (fx.tape = new TapeRewindEffect());
      let a;
      if (fx.u < 0) {
        a = smooth((fx.u + 2) / 2);
        // Painted at 1x and laid back at 2 px, smoothed: a tape is softer than the set.
        buildPyramid((g) => fx.bg(fx.out, g, 0, 1400 * a * a), fx.base);
        const src = pyramid()[1];
        ctx.save();
        // What a band torn sideways uncovers: the dead black of the tape.
        ctx.fillStyle = '#050607';
        ctx.fillRect(0, 0, W, H);
        ctx.imageSmoothingEnabled = true;
        const band = 6;
        for (let y = 0; y < H; y += band) {
          const tear = Math.sin(y * 0.07 + fx.t * 9) * 10 * a
            + (hash(Math.floor(y / band) * 7 + Math.floor(fx.t * 24)) * 2 - 1) * 16 * a * a;
          ctx.drawImage(src.canvas, 0, y / 2, src.w, band / 2, tear, y, W, band);
        }
        ctx.restore();
        fx.world(fx.out, ctx);
      } else {
        a = Math.pow(1 - fx.u, 2);
        shaken(ctx, fx.sec, 3, 0.25, () => {
          fx.bg(fx.in, ctx);
          fx.world(fx.in, ctx);
        });
      }
      // TapeRewindEffect fades itself in and out off tick(); here its level is the move's.
      tape._t = 0.22 * clamp01(a);
      tape._runT = fx.t;
      tape.render(ctx, W, H);
    },
  },
  {
    letter: 'H', id: 'zoom-through', name: 'ZOOM THROUGH',
    note: 'The camera punches through the old look: it magnifies past you over a beat and a half, fading, with '
      + 'the next look standing behind it, and lands with a shake on the downbeat. Two looks a frame for those beats.',
    lead: 1.5, tail: 0.3,
    draw(ctx, fx) {
      if (fx.u >= 0) {
        shaken(ctx, fx.sec, 3, 0.25, () => {
          fx.bg(fx.in, ctx);
          fx.world(fx.in, ctx);
        });
        return;
      }
      const k = smooth((fx.u + 1.5) / 1.5);
      const shot = offscreen(fx, fx.out);
      fx.bg(fx.in, ctx);
      ctx.save();
      const cx = W * 0.5, cy = H * 0.42, s = 1 + k * k * 2.6;
      ctx.translate(cx, cy);
      ctx.scale(s, s);
      ctx.translate(-cx, -cy);
      ctx.globalAlpha = 1 - k;
      ctx.drawImage(shot, 0, 0, W, H);
      ctx.restore();
      fx.world(fx.out, ctx);
    },
  },
];

// The roulette: every change a different move from B-H, in a fixed shuffled order, so
// the eight looks meet a different one each time round.
const ROULETTE = ['power-down', 'flash-cut', 'block-shatter', 'power-cycle', 'zoom-through', 'beat-stutter',
  'tape-rewind'].map((id) => SURGE_FX_CANDIDATES.find((c) => c.id === id));
SURGE_FX_CANDIDATES.push({
  letter: 'I', id: 'roulette', name: 'ROULETTE — B to H in turn',
  note: 'Every change a different one of B-H, in a fixed order: power down, flash, shatter, power cycle, zoom, '
    + 'stutter, tape. Seven moves round eight looks, so each pair meets a different move every time round.',
  pick: (change) => ROULETTE[mod(change, ROULETTE.length)],
});

// THE RANDOM ROULETTE (round two, Peter 1 Oct: "I love I, but I would like it to be
// random"): every change draws one of B-H at random, never the move it just played. The
// draw is seeded per run, so a frame can be painted from the clock alone.
export function randomMove(seed, change) {
  const pick = (c) => Math.floor(hash(seed * 7919 + c * 104.729) * ROULETTE.length);
  let i = pick(change);
  if (change > 0 && i === pick(change - 1)) i = (i + 1 + Math.floor(hash(seed + change) * (ROULETTE.length - 1))) % ROULETTE.length;
  return ROULETTE[i];
}

// ---------------------------------------------------------------------------- glitches
// THE CABINET GLITCHING OUT (round two). Between the changes the picture is not left
// alone: it crunches to pixels, tears, rolls on its tube, drops out to black and bleeds
// another cabinet's look through, in bands or across the whole screen, every glitch
// starting and ending on a sixteenth. It gets worse through the act. surge-1 is a
// cabinet with a loose connection: a glitch or two a look, short, in bands, the lane
// left alone. surge-2 glitches every look, longer and sometimes whole-screen, and the
// odd one reaches down over the lane. By surge-3 it is failing: several at once, up to
// a bar long, rolls and blackouts, the lane caught most of the time, each hit with a
// jolt. The hero is never glitched — he is where the player is looking.
export const SURGE_GLITCH_LEVELS = {
  1: { per: [0, 1, 1, 1, 2], lens: [0.25, 0.5, 0.5, 1], full: 0, lane: 0, shake: 0,
    kinds: ['tear', 'pixel', 'flicker', 'ghost'] },
  2: { per: [1, 1, 2, 2, 3], lens: [0.25, 0.5, 1, 1, 2], full: 0.3, lane: 0.25, shake: 0,
    kinds: ['tear', 'pixel', 'pixel', 'flicker', 'ghost', 'blocks', 'roll'] },
  3: { per: [2, 3, 3, 4, 5], lens: [0.25, 0.5, 1, 2, 2, 4], full: 0.55, lane: 0.7, shake: 2.5,
    kinds: ['tear', 'pixel', 'pixel', 'flicker', 'ghost', 'blocks', 'roll', 'roll'] },
};

function rng(seed) {
  let a = Math.floor(seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The glitches of one look's four bars, in beats from its downbeat. They keep clear of
// the changes either side (the first beat and a half, the last two), which are moves of
// their own.
export function surgeGlitches(slot, level, seed, count) {
  const L = SURGE_GLITCH_LEVELS[level] || SURGE_GLITCH_LEVELS[1];
  const r = rng(seed * 131 + slot * 17 + level * 7 + 0.5);
  const n = L.per[Math.floor(r() * L.per.length)];
  const out = [];
  for (let i = 0; i < n; i++) {
    const len = L.lens[Math.floor(r() * L.lens.length)];
    const start = 1.5 + Math.floor(r() * (14 - len - 1.5) * 4) / 4;
    const full = r() < L.full;
    const lane = r() < L.lane;
    // A band: somewhere in the backdrop, or reaching down over the lane.
    const h = 14 + r() * 60;
    const y = lane ? GROUND_FRAME_Y - h * (0.3 + r() * 0.5) : r() * (GROUND_FRAME_Y - h - 6);
    out.push({
      kind: L.kinds[Math.floor(r() * L.kinds.length)],
      start, len, lane,
      rect: full ? null : { x: 0, y, w: W, h: lane ? H - y : h },
      lv: 2 + Math.floor(r() * 3),
      other: mod(slot + 1 + Math.floor(r() * (count - 1)), count),
      seed: r() * 1000,
      shake: L.shake,
    });
  }
  return out;
}
// Where the lane's top edge sits in the 480 x 270 frame.
const GROUND_FRAME_Y = 232;

function clipTo(ctx, rect) {
  if (!rect) return;
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
}

// One glitch over what is already painted. `paint(i, g)` is look i's picture: the
// backdrop, and the lane too when the glitch reaches it. q is 0..1 through it, b the
// beat inside it.
function drawGlitch(ctx, fx, g, b, paint) {
  const q = b / g.len;
  const tick = Math.floor(b * 8); // 32nds
  ctx.save();
  clipTo(ctx, g.rect);
  switch (g.kind) {
    case 'pixel': {
      buildPyramid((c) => paint(fx.look, c), fx.base);
      tube(ctx, fx, g.lv);
      break;
    }
    case 'roll': {
      // The picture loses vertical hold: it rolls up the tube, a black frame bar
      // between one copy and the next, on the CRT.
      buildPyramid((c) => paint(fx.look, c), fx.base);
      const off = (q * (1 + Math.floor(g.seed) % 2) * (H + 14)) % (H + 14);
      crtPass(ctx, fx.k, (c) => {
        c.fillStyle = '#050607';
        c.fillRect(0, 0, W, H);
        c.save(); c.translate(0, -off); blitLevel(c, 1, true); c.restore();
        c.save(); c.translate(0, H + 14 - off); blitLevel(c, 1, true); c.restore();
      }, CRT_SOFT);
      break;
    }
    case 'tear': {
      const shot = offscreen(fx, fx.look, paint);
      const band = 4 + (Math.floor(g.seed) % 3) * 2;
      ctx.fillStyle = '#050607';
      ctx.fillRect(0, 0, W, H);
      for (let y = 0; y < H; y += band) {
        const k = hash(g.seed + Math.floor(y / band) * 3.1 + tick * 11.7);
        const dx = (k * 2 - 1) * (k > 0.55 ? 34 : 7);
        ctx.drawImage(shot, 0, y * fx.k, shot.width, band * fx.k, dx, y, W, band);
      }
      break;
    }
    case 'flicker': {
      // Power stuttering: the picture drops to black on some 32nds, not all.
      if (hash(g.seed + tick * 5.3) < 0.55) { ctx.fillStyle = '#050607'; ctx.fillRect(0, 0, W, H); }
      break;
    }
    case 'ghost': {
      // Another cabinet's picture bleeding through, shivering on the 32nds.
      ctx.translate((hash(g.seed + tick) * 2 - 1) * 3, 0);
      paint(g.other, ctx);
      break;
    }
    case 'blocks': {
      // Blocks of the picture drop out, a fresh scatter every eighth: half to black,
      // half to another cabinet.
      const cols = 16, rows = 9, cw = W / cols, ch = H / rows;
      const e = Math.floor(b * 2);
      const pick = (c, salt) => hash(g.seed + c * 1.37 + e * 91.1 + salt);
      ctx.fillStyle = '#050607';
      for (let c = 0; c < cols * rows; c++) {
        if (pick(c, 0) < 0.12) ctx.fillRect((c % cols) * cw, Math.floor(c / cols) * ch, cw, ch);
      }
      ctx.beginPath();
      for (let c = 0; c < cols * rows; c++) {
        if (pick(c, 0) >= 0.12 && pick(c, 3) < 0.14) ctx.rect((c % cols) * cw, Math.floor(c / cols) * ch, cw, ch);
      }
      ctx.clip();
      paint(g.other, ctx);
      break;
    }
  }
  ctx.restore();
}

// Round two's cards: the random roulette, glitching at each stage's severity.
export const SURGE_GLITCH_CANDIDATES = [1, 2, 3].map((level) => ({
  letter: `J${level}`, id: `glitch-${level}`, random: true, level,
  name: `surge-${level} — random moves, ${['', 'a loose connection', 'glitching every look', 'failing'][level]}`,
  note: [
    '',
    'A glitch or two a look, a beat at most, in bands; the lane left alone.',
    'Every look glitches, up to two beats, sometimes the whole screen, and now and then a glitch reaches over the lane.',
    'Several at once, up to a bar, rolls and blackouts, the lane caught most of the time, and every hit jolts the screen.',
  ][level],
}));

// Where the bar line is, and which move is under way. `beat` is quarter notes from the
// top of the loop; `count` how many looks the cycle has.
export function surgeFxPhase(beat, count) {
  const n = Math.floor(beat / SURGE_FX_SLOT_BEATS);
  const inSlot = beat - n * SURGE_FX_SLOT_BEATS;
  return { n, look: mod(n, count), bar: Math.floor(inSlot / 4) + 1, beatInBar: inSlot % 4 };
}

// One frame of a card. Returns the move under way (null between them), for the strip.
//   o.level  1-3 to glitch between the changes at that stage's severity (round two)
//   o.seed   the run's seed, for the random roulette and the glitches
//   o.lane(i, g), o.hero(g)  the world split, so a glitch can take the lane but not him
export function drawSurgeFx(ctx, cand, o) {
  const { beat, count } = o;
  const ph = surgeFxPhase(beat, count);
  const moveFor = (change) => (cand.random ? randomMove(o.seed || 1, change) : cand.pick ? cand.pick(change) : cand);
  const next = moveFor(ph.n + 1), last = moveFor(ph.n);
  const toNext = (ph.n + 1) * SURGE_FX_SLOT_BEATS - beat;
  const since = beat - ph.n * SURGE_FX_SLOT_BEATS;
  let move = null, u = 0, change = 0;
  if (toNext <= next.lead) { move = next; u = -toNext; change = ph.n + 1; }
  else if (since < last.tail) { move = last; u = since; change = ph.n; }
  if (!move) {
    const live = o.level
      ? surgeGlitches(ph.n, o.level, o.seed || 1, count).filter((g) => since >= g.start && since < g.start + g.len)
      : [];
    if (!live.length) {
      o.bg(ph.look, ctx);
      o.world(ph.look, ctx);
      return { ...ph, move: null };
    }
    const fx = { ...o, look: ph.look };
    // A glitch's first instant jolts the screen at surge-3.
    const jolt = live.reduce((m, g) => (g.shake ? Math.min(m, since - g.start) : m), Infinity);
    shaken(ctx, jolt * SPB, live[0].shake || 0, 0.18, () => {
      const backdrop = (i, g) => o.bg(i, g);
      const withLane = (i, g) => { o.bg(i, g); o.lane(i, g); };
      o.bg(ph.look, ctx);
      for (const g of live) if (!g.lane) drawGlitch(ctx, fx, g, since - g.start, backdrop);
      o.lane(ph.look, ctx);
      for (const g of live) if (g.lane) drawGlitch(ctx, fx, g, since - g.start, withLane);
      o.hero(ph.look, ctx);
    });
    return { ...ph, move: null, glitch: true };
  }
  const fx = {
    ...o, u, sec: u * SPB, change,
    out: mod(change - 1, count), in: mod(change, count),
  };
  // The tape keeps its own grain canvas; give it one per card, not one per frame.
  fx.tape = o.state.tape || (o.state.tape = new TapeRewindEffect());
  ctx.save();
  move.draw(ctx, fx);
  ctx.restore();
  return { ...ph, move, u };
}
