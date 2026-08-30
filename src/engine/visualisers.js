// Jukebox screensaver visuals. These are deliberately Canvas2D-native: the
// game already presents a fixed 480x270 logical backbuffer, so keeping the
// presets here makes the 2D fallback and the WebGL upload path identical.
import { Rng } from './rng.js';
import { screen } from './renderer.js';
import { TITLE_FONT, onGameFontsChanged, drawText, textWidth } from './sprites.js';
import { drawToon } from '../sprites/toons.js';
import { drawApplianceFinish, drawProp, hasProp, propFrames, propFps } from '../sprites/props.js';

export const VISUALISER_NAMES = [
  'NEON CATHEDRAL',
  'LIQUID CHROME',
  'LASER GRID AFTER DARK',
  'MONSTER REACTOR',
  'ELECTRIC KALEIDOSCOPE',
  'DEEP-SPACE WORMHOLE',
  'PRISMATIC STORM',
  'SINGULARITY BLOOM',
  'HOLOGRAPHIC OCEAN',
  'DATA RAIN ASCENSION',
  'FRACTAL FLAME',
  'OSCILLOSCOPE OVERDRIVE',
  'ARCADE ART GALLERY',
  'TOASTER SKY PARADE',
  'CHROMA BUBBLESTORM',
  'EMERALD CODE RAIN',
  'ACID JULIA DIVE',
  'HYPER-VECTOR TUNNEL',
  'NEBULA RIBBON DRIFT',
  'GLASS BLOB EQUALIZER',
  'HALF-PIPE HORIZON',
  'ASTRAL TRAVEL',
  // Not a scene of its own: a DJ that plays the rest of the pack, one 16-bar
  // phrase each, and mixes between them on the downbeat. Kept last so every
  // index above stays where it was.
  'VJ MEGAMIX',
];

const W = 480;
const H = 270;
const CX = W / 2;
const CY = H / 2;
const SPECIAL_TOASTER_FINISHES = [
  { id: 'silver', back: '#74879b', side: '#bdcad8', top: '#edf4ff' },
  { id: 'red', back: '#8d1e31', side: '#d94653', top: '#ff9aa0' },
  { id: 'blue', back: '#214e99', side: '#3b7ed4', top: '#8fc9ff' },
];
const TOASTER_SKY_SCHEMES = [
  { top: '#07142c', mid: '#071b2a', bottom: '#02050d', accent: '#63f3ff' },
  { top: '#071d3b', mid: '#063542', bottom: '#020d16', accent: '#48e0c8' },
  { top: '#180b3a', mid: '#21104e', bottom: '#080318', accent: '#b388ff' },
  { top: '#310a3c', mid: '#321044', bottom: '#0c0312', accent: '#ff70c8' },
];
const TAU = Math.PI * 2;
const RING_ROTATION_TRANSITION_BEATS = 1;
const RING_ROTATION_INTERVALS = [4, 8, 16];
const RING_ROTATION_MIN = Math.PI / 2;
const RING_ROTATION_MAX = Math.PI;
// How much movement survives total silence. A scene that stops dead reads as a
// dropped frame rather than a quiet passage, so the floor keeps everything
// drifting; the remaining range is what the song's own loudness buys back.
const MOTION_FLOOR = 0.34;
// Seconds-ish easing on the movement multiplier. Slow enough that one loud
// transient cannot jolt the picture, fast enough to land inside a bar.
const MOTION_EASE = 2.2;
// How much of the beat punch survives a section with no kit in it. Not zero:
// the bar line is still a real musical event, and the picture should breathe on
// it — it just should not hit like a snare that nobody played.
const PULSE_FLOOR = 0.18;
// Kit presence eases more slowly than loudness. Drums arriving or leaving is a
// structural change, so it should read as the arrangement turning a corner
// rather than as the picture reacting to one bar.
const GROOVE_EASE = 1.4;
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const smooth = (v) => v * v * (3 - 2 * v);
const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${clamp(a)})`;
};
const mixHex = (a, b, t) => {
  const from = parseInt(a.slice(1), 16); const to = parseInt(b.slice(1), 16);
  const mix = (shift) => Math.round(((from >> shift) & 255) + (((to >> shift) & 255) - ((from >> shift) & 255)) * t);
  return `#${[16, 8, 0].map((shift) => mix(shift).toString(16).padStart(2, '0')).join('')}`;
};
const pickPalette = (rng) => rng.pick([
  ['#48e0c8', '#c9a0ff', '#f6d33c', '#ff5d9e'],
  ['#63f3ff', '#6b7cff', '#ff70c8', '#fff1a8'],
  ['#d7ff83', '#48e0c8', '#f6d33c', '#c9a0ff'],
  ['#ff7b5c', '#ffd166', '#63f3ff', '#b388ff'],
]);

function makePool(count) {
  return Array.from({ length: count }, () => ({ x: 0, y: 0, px: 0, py: 0, z: 0, life: 0, hue: 0 }));
}

function seedParticle(p, rng, cx = CX, cy = CY, spread = 1) {
  const a = rng.float() * TAU;
  const r = 20 + rng.float() * 220 * spread;
  p.x = cx + Math.cos(a) * r;
  p.y = cy + Math.sin(a) * r * 0.58;
  p.px = p.x;
  p.py = p.y;
  p.z = 0.15 + rng.float() * 0.9;
  p.life = 0.3 + rng.float() * 0.7;
  p.hue = rng.float();
}

function seedDust(p, rng) {
  p.x = rng.float() * W;
  p.y = rng.float() * H;
  p.px = p.x;
  p.py = p.y;
  p.z = 0.25 + rng.float() * 0.75;
  p.life = 0.35 + rng.float() * 0.65;
  p.hue = rng.float();
}

// An offscreen canvas, or null where there is no real one. The createImageData
// probe is the whole point and must not be softened to a typeof check: under
// tests/dom-stub.js the context is a proxy that answers every unknown property
// with a no-op, so a preset asking "did I get a canvas?" is told yes and then
// accumulates a buffer nobody can read. Worse, the stub records every draw call
// into an unbounded array, and the megamix long-run test draws tens of
// thousands of frames. createImageData allocates but forces no GPU readback, so
// this costs nothing in the browser where it succeeds.
function makeSurface(w, h) {
  if (typeof document === 'undefined') return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const probe = ctx.createImageData?.(2, 2);
    if (!probe?.data || probe.data.length !== 16) return null;
    return { canvas, ctx };
  } catch { return null; }
}

// Value noise on a fixed lattice. Seeded from a literal rather than from any
// preset's rng so the field is identical in every instance and consumes nobody's
// stream — two presets asking for the same coordinate get the same answer, and a
// preset's own seeded structure stays reproducible.
const NOISE_SIZE = 64;
const NOISE_MASK = NOISE_SIZE - 1;
const NOISE_TABLE = (() => {
  const table = new Float32Array(NOISE_SIZE * NOISE_SIZE * NOISE_SIZE);
  const noiseRng = new Rng(0x9e3779b9);
  for (let i = 0; i < table.length; i++) table[i] = noiseRng.float();
  return table;
})();
const noiseAt = (x, y, z) => NOISE_TABLE[
  (((z & NOISE_MASK) * NOISE_SIZE) + (y & NOISE_MASK)) * NOISE_SIZE + (x & NOISE_MASK)
];

function valueNoise3(x, y, z) {
  const xi = Math.floor(x); const yi = Math.floor(y); const zi = Math.floor(z);
  const tx = smooth(x - xi); const ty = smooth(y - yi); const tz = smooth(z - zi);
  const lerp = (a, b, t) => a + (b - a) * t;
  const y0 = lerp(
    lerp(noiseAt(xi, yi, zi), noiseAt(xi + 1, yi, zi), tx),
    lerp(noiseAt(xi, yi + 1, zi), noiseAt(xi + 1, yi + 1, zi), tx), ty);
  const y1 = lerp(
    lerp(noiseAt(xi, yi, zi + 1), noiseAt(xi + 1, yi, zi + 1), tx),
    lerp(noiseAt(xi, yi + 1, zi + 1), noiseAt(xi + 1, yi + 1, zi + 1), tx), ty);
  return lerp(y0, y1, tz);
}

// A baked radial falloff, one canvas per colour and size bucket. glowDot() is
// the right tool for the ten or so lights a preset places by hand; it allocates
// a gradient per call, which is why the current busiest preset paints under a
// hundred orbs. A preset wanting hundreds blits these instead. Bounded and
// cleared wholesale the way the code-rain atlases are: the callers quantise
// their colours, so the map holds a small fixed set and the guard only covers a
// density change mid-session.
const glowSprites = new Map();
const GLOW_STEPS = [8, 12, 18, 26, 38];

function glowSprite(hex, px) {
  const size = GLOW_STEPS.reduce((best, step) => (Math.abs(step - px) < Math.abs(best - px) ? step : best), GLOW_STEPS[0]);
  const key = `${hex}:${size}`;
  const cached = glowSprites.get(key);
  if (cached !== undefined) return cached;
  const made = makeSurface(size, size);
  if (!made) {
    glowSprites.set(key, null);
    return null;
  }
  const half = size / 2;
  const g = made.ctx.createRadialGradient(half, half, 0, half, half, half);
  g.addColorStop(0, rgba(hex, 1));
  g.addColorStop(0.35, rgba(hex, 0.42));
  g.addColorStop(1, rgba(hex, 0));
  made.ctx.fillStyle = g;
  made.ctx.fillRect(0, 0, size, size);
  if (glowSprites.size > 48) glowSprites.clear();
  const sprite = { canvas: made.canvas, size };
  glowSprites.set(key, sprite);
  return sprite;
}

class BaseVisualiser {
  constructor(seed, track = {}) {
    this.seed = seed >>> 0;
    this.rng = new Rng(this.seed);
    this.track = track;
    this.palette = pickPalette(this.rng);
    this.t = 0;
    this.beat = 0;
    this.ringRotation = 0;
    this.ringRotationRng = this.rng.stream('ring-rotation');
    this.ringRotationEvents = [];
    this.ringRotationTotal = 0;
    this.ringRotationNextBeat = this.ringRotationRng.pick(RING_ROTATION_INTERVALS);
    this.prevBeat = 0;
    this.beatPhase = 0;
    this.beatPulse = 0;
    this.bass = 0;
    this.mid = 0;
    this.treble = 0;
    this.level = 0;
    this.dynamics = 1;
    this.motion = 1;
    this.flow = 0;
    this.drums = 1;
    this.drumless = false;
    this.groove = 1;
    this.pulse = 0;
    this.analysis = null;
    this.focusPhase = this.rng.float() * TAU;
    this.focusX = CX;
    this.focusY = CY;
    this.dust = makePool(96);
    this.dust.forEach((p) => seedDust(p, this.rng));
    this.name = 'VISUALISER';
    // What the corner tag says, when that is not simply the preset's name. Only
    // the megamix uses it, to announce whichever record it currently has up.
    this.label = null;
    // Mirror of the `globalAlpha` the caller set before calling draw(). Almost
    // everything here paints with rgba() fills, which the context alpha already
    // scales — but a handful of places ASSIGN globalAlpha mid-frame, and those
    // would otherwise punch through a fade at full strength. Multiply by this
    // wherever globalAlpha is assigned rather than inherited. It matters twice:
    // the jukebox's fade in and out of the screensaver, and the megamix, which
    // paints two presets in one frame at different weights.
    this.frameAlpha = 1;
  }

  ringRotationAt(beat) {
    const safeBeat = Math.max(0, Number.isFinite(beat) ? beat : 0);
    while (this.ringRotationNextBeat <= safeBeat) {
      const event = {
        beat: this.ringRotationNextBeat,
        baseRotation: this.ringRotationTotal,
        turn: this.ringRotationRng.range(RING_ROTATION_MIN, RING_ROTATION_MAX),
      };
      this.ringRotationEvents.push(event);
      this.ringRotationTotal += event.turn;
      this.ringRotationNextBeat += this.ringRotationRng.pick(RING_ROTATION_INTERVALS);
    }
    // Hold the added phase between events. At each event boundary, ease to
    // the newly chosen angle over one beat. The
    // preset-specific `t` rotations continue underneath this, so the focal
    // rings retain their existing slight motion between dramatic turns.
    for (let i = this.ringRotationEvents.length - 1; i >= 0; i--) {
      const event = this.ringRotationEvents[i];
      if (event.beat <= safeBeat) {
        const transition = Math.min(1, (safeBeat - event.beat) / RING_ROTATION_TRANSITION_BEATS);
        return event.baseRotation + event.turn * transition;
      }
    }
    return 0;
  }

  update(dt, analysis = {}) {
    this.t += Math.max(0, dt);
    this.analysis = analysis;
    this.prevBeat = this.beat;
    this.beat = Number.isFinite(analysis.beat)
      ? analysis.beat
      : this.t * ((this.track.bpm || 112) / 60);
    // Choose a seeded 4/8/16-beat hold and a 90–180 degree turn for each
    // event. The added phase holds between boundaries, then transitions to the
    // new angle over one beat; it remains reproducible for a given seed.
    this.ringRotation = this.ringRotationAt(this.beat);
    this.beatPhase = Number.isFinite(analysis.beatPhase)
      ? analysis.beatPhase
      : ((this.beat % 1) + 1) % 1;
    this.beatPulse = Number.isFinite(analysis.beatPulse)
      ? analysis.beatPulse
      : Math.pow(1 - this.beatPhase, 5);
    this.bass = clamp(analysis.bass ?? 0.25);
    this.mid = clamp(analysis.mid ?? 0.2);
    this.treble = clamp(analysis.treble ?? 0.15);
    // Overall loudness. `level` is the broadband amplitude of the mix right now;
    // `dynamics` is that level against the song's own recent peak, so a quiet
    // passage reads quiet whether the master is hot or gentle. Both default to
    // "full tilt" when the analysis omits them, which keeps every preset
    // pixel-identical to its pre-loudness behaviour under a bare feed.
    this.level = clamp(analysis.level ?? 0.5);
    this.dynamics = clamp(analysis.dynamics ?? 1);
    // One movement multiplier the presets fold into their speed terms, and a
    // clock that advances at that rate. A preset drives its continuous drift
    // from `flow` instead of `t` to slow down through a breakdown and run at its
    // designed speed once the song is back up; at dynamics 1 the two are equal.
    const motionTarget = MOTION_FLOOR + (1 - MOTION_FLOOR) * this.dynamics;
    this.motion += (motionTarget - this.motion) * Math.min(1, Math.max(0, dt) * MOTION_EASE);
    this.flow += Math.max(0, dt) * this.motion;
    // How much kit is under the section, counted off the sequencer rather than
    // guessed at from the spectrum, and a `drumless` flag for the bars that
    // arrange the drums out entirely.
    this.drums = clamp(analysis.drums ?? 1);
    this.drumless = analysis.drumless === true;
    // A single kit onset, full on the frame a drum is heard. `pulse` is the
    // beat grid weighted by how much kit is under it — right for choreography
    // that wants to sit ON the beat whether or not it was played. `hit` is the
    // opposite: the drum itself, at the moment it lands, and nothing on the
    // beats nobody played. Defaults to 0, so a feed without it is unchanged.
    this.hit = clamp(analysis.hit ?? 0);
    this.groove += (this.drums - this.groove) * Math.min(1, Math.max(0, dt) * GROOVE_EASE);
    // `beatPulse` is the procedural clock: it keeps ticking on the beat whether
    // or not anything is playing it, which is right for choreography and wrong
    // for impact. `pulse` is that same tick weighted by the kit actually under
    // it, so a drumless section stops punching and starts flowing while the
    // beat-locked set pieces stay on the grid where they belong.
    this.pulse = this.beatPulse * (PULSE_FLOOR + (1 - PULSE_FLOOR) * this.groove);
    // The focal object drifts through a soft Lissajous path. It is intentionally
    // restrained so the motion feels designed rather than camera-shaky, and it
    // draws in toward centre as the song quietens rather than touring the frame.
    this.focusX = CX + Math.sin(this.flow * 0.31 + this.focusPhase) * (25 + this.bass * 18) * this.motion;
    this.focusY = CY + Math.cos(this.flow * 0.23 + this.focusPhase * 0.7) * (14 + this.mid * 13) * this.motion;
    for (const p of this.dust) {
      p.life -= dt * (0.08 + this.treble * 0.28);
      if (p.life <= 0) seedDust(p, this.rng);
      p.px = p.x; p.py = p.y;
      p.x += Math.sin(this.flow * (0.35 + p.z * 0.4) + p.hue * TAU) * dt * (4 + this.mid * 12) * this.motion;
      p.y -= dt * (2 + this.bass * 8) * p.z * this.motion;
      if (p.y < -8) { p.y = H + 8; p.x = this.rng.float() * W; p.px = p.x; p.py = p.y; }
    }
  }

  spectrumValue(analysis, i, count = 24) {
    const spectrum = analysis?.spectrum;
    if (!spectrum || !spectrum.length) return 0.2 + 0.16 * Math.sin(this.t * 2 + i * 0.77);
    const at = Math.min(spectrum.length - 1, Math.floor(i / count * spectrum.length));
    return spectrum[at] / 255;
  }

  backdrop(ctx, top = '#050719', bottom = '#120b2e') {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, top); g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  glowDot(ctx, x, y, r, color, alpha = 0.5) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, r));
    g.addColorStop(0, rgba(color, alpha));
    g.addColorStop(0.45, rgba(color, alpha * 0.28));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }

  drawDust(ctx, alpha = 0.5) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.dust) {
      const a = p.life * alpha * (0.25 + this.treble * 0.8);
      ctx.strokeStyle = rgba(this.palette[Math.floor(p.hue * this.palette.length) % this.palette.length], a);
      // The shared bed thickens on the kit, not on the bar line, so a drumless
      // section draws the dust as steady threads rather than a flickering pulse.
      ctx.lineWidth = 0.45 + p.z * (0.7 + this.pulse * 1.2);
      ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
      if (p.z > 0.72) {
        ctx.fillStyle = rgba('#ffffff', a * 0.6);
        ctx.beginPath(); ctx.arc(p.x, p.y, 0.5 + p.z * 0.55, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }

  modernFinish(ctx, strength = 0.26) {
    // No scanlines, grain, barrel warp, or faux CRT treatment. This is a
    // clean cinematic edge falloff that keeps neon legible on a small canvas.
    const g = ctx.createRadialGradient(CX, CY, 70, CX, CY, 300);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.72, 'rgba(0,0,0,0.02)');
    g.addColorStop(1, `rgba(0,0,0,${strength})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  draw(ctx) {
    this.backdrop(ctx);
    this.modernFinish(ctx);
  }
}

class NeonCathedral extends BaseVisualiser {
  constructor(seed, track) { super(seed, track); this.name = VISUALISER_NAMES[0]; this.sparks = makePool(72); this.sparks.forEach((p) => seedParticle(p, this.rng)); }
  update(dt, a) {
    super.update(dt, a);
    for (const p of this.sparks) {
      p.life -= dt * (0.38 + this.treble * 0.9);
      if (p.life <= 0) seedParticle(p, this.rng, this.focusX, this.focusY - 23, 0.55);
      p.px = p.x; p.py = p.y;
      // Quiet passages hold the sparks near the aperture instead of throwing
      // them at the frame edge, so the portal reads as banked rather than idle.
      p.x += (p.x - this.focusX) * dt * (0.16 + this.pulse * 0.55) * this.motion;
      p.y += (p.y - (this.focusY - 23)) * dt * (0.14 + this.pulse * 0.4) * this.motion;
    }
  }
  draw(ctx) {
    this.backdrop(ctx, '#030713', '#170c33');
    const horizon = this.focusY - 24;
    const focusX = this.focusX;
    const pulse = this.pulse;
    this.glowDot(ctx, focusX, horizon, 90 + this.bass * 55, this.palette[1], 0.22 + this.bass * 0.2);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    // A stacked portal aperture gives the cathedral a deep, polished focal
    // point before the larger architecture rushes past it.
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = rgba(this.palette[(i + 1) % this.palette.length], 0.16 + pulse * 0.1);
      ctx.lineWidth = 1 + pulse * 1.8;
      ctx.beginPath();
      ctx.ellipse(focusX, horizon, 22 + i * 13 + pulse * 8, 7 + i * 5, this.ringRotation + Math.sin(this.t * 0.4 + i) * 0.08, 0, TAU);
      ctx.stroke();
    }
    // Thin volumetric beams make the beat feel like a camera flying through
    // light rather than a collection of flat lines.
    for (let i = 0; i < 6; i++) {
      const x = i < 3 ? i * 54 : W - (i - 3) * 54;
      ctx.strokeStyle = rgba(this.palette[i % 2], 0.045 + this.bass * 0.05);
      ctx.lineWidth = 8 + this.bass * 7;
      ctx.beginPath(); ctx.moveTo(focusX, horizon); ctx.lineTo(x, 0); ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const z = (i + ((this.beat * 0.5) % 1)) / 12;
      const w = 18 + Math.pow(z, 1.7) * (290 + this.bass * 100);
      const h = 8 + Math.pow(z, 1.45) * (94 + this.bass * 42);
      ctx.strokeStyle = rgba(this.palette[i % 3], 0.2 + (1 - z) * 0.48);
      ctx.lineWidth = 1 + (1 - z) * 1.4;
      ctx.beginPath();
      ctx.moveTo(focusX - w, horizon - h * 0.15);
      ctx.bezierCurveTo(focusX - w * 0.98, horizon - h, focusX - w * 0.45, horizon - h * 1.18, focusX, horizon - h * 0.15);
      ctx.bezierCurveTo(focusX + w * 0.45, horizon - h * 1.18, focusX + w * 0.98, horizon - h, focusX + w, horizon - h * 0.15);
      ctx.stroke();
    }
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 6; i++) {
        const c = this.palette[(i + (side < 0 ? 1 : 0)) % this.palette.length];
        ctx.strokeStyle = rgba(c, 0.36 - i * 0.035);
        ctx.lineWidth = 1.1 + pulse * 1.8;
        ctx.beginPath();
        ctx.moveTo(focusX + side * (20 + i * 9), H + 8);
        ctx.bezierCurveTo(focusX + side * (36 + i * 20), 210, focusX + side * (70 + i * 29), 154, focusX + side * (108 + i * 39), horizon - 4);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = rgba(this.palette[2], 0.22 + this.mid * 0.3);
    for (let i = 0; i < 9; i++) {
      const y = horizon + Math.pow(i / 9, 1.7) * 175;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    for (const p of this.sparks) {
      ctx.strokeStyle = rgba(this.palette[Math.floor(p.hue * this.palette.length) % this.palette.length], p.life * (0.35 + this.treble));
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
    }
    const wave = this.analysis?.waveform;
    if (wave?.length) {
      ctx.strokeStyle = rgba('#ffffff', 0.2 + this.treble * 0.35);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 4) {
        const sample = wave[Math.min(wave.length - 1, Math.floor(x / W * wave.length))] / 255 - 0.5;
        const y = horizon - 30 + sample * (12 + this.treble * 24);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
    this.drawDust(ctx, 0.7);
    this.modernFinish(ctx, 0.18);
  }
}

class LiquidChrome extends BaseVisualiser {
  constructor(seed, track) { super(seed, track); this.name = VISUALISER_NAMES[1]; }
  draw(ctx) {
    this.backdrop(ctx, '#050615', '#160b2b');
    // A very slow camera orbit gives the whole chrome field a sense of mass.
    // The tiny bass term lets the rotation lean into louder sections without
    // turning the scene into a distracting spin. Every continuous term here runs
    // off `flow` rather than `t`, so the chrome congeals through a quiet passage
    // and comes back up to speed with the song.
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(this.flow * 0.018 + this.bass * 0.008 * Math.sin(this.flow * 0.35));
    ctx.translate(-CX, -CY);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const blobs = 5;
    for (let i = 0; i < blobs; i++) {
      const a = this.flow * (0.18 + i * 0.021) + i * 1.26;
      const x = this.focusX + Math.sin(a * 1.4) * (72 + this.mid * 34) + Math.cos(a * 0.7) * 34;
      const y = this.focusY + Math.cos(a * 1.1) * (40 + this.bass * 28) + Math.sin(a) * 20;
      const r = 28 + this.spectrumValue(this.analysis, i) * 16 + this.bass * 25;
      this.glowDot(ctx, x, y, r * 2.2, this.palette[i % this.palette.length], 0.18 + this.mid * 0.22);
      const g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.35, 1, x, y, r);
      g.addColorStop(0, rgba('#ffffff', 0.62));
      g.addColorStop(0.12, rgba(this.palette[i % this.palette.length], 0.75));
      g.addColorStop(0.55, rgba(this.palette[(i + 1) % this.palette.length], 0.24));
      g.addColorStop(1, rgba('#000000', 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    ctx.lineCap = 'round';
    for (let lane = 0; lane < 6; lane++) {
      const c = this.palette[(lane + 1) % this.palette.length];
      ctx.strokeStyle = rgba(c, 0.16 + this.treble * 0.18);
      ctx.lineWidth = 2 + this.treble * 2;
      ctx.beginPath();
      for (let x = -20; x <= W + 20; x += 18) {
        const y = this.focusY + (lane - 2.5) * 21 + Math.sin(x * 0.024 + this.flow * (0.9 + lane * 0.05)) * (15 + this.mid * 23) + Math.sin(x * 0.057 - this.flow * 0.6) * 8;
        if (x < 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // Specular arcs and a moving glass highlight push the blobs away from
    // "glowing circles" toward liquid objects with a real surface.
    for (let i = 0; i < 4; i++) {
      const a = this.flow * (0.24 + i * 0.03) + i * 1.7;
      ctx.strokeStyle = rgba(this.palette[(i + 2) % this.palette.length], 0.18 + this.treble * 0.16);
      ctx.lineWidth = 1 + this.treble * 1.6;
      ctx.beginPath();
      ctx.ellipse(this.focusX + Math.cos(a) * 22, this.focusY + Math.sin(a) * 14, 95 + i * 15, 34 + i * 8, a * 0.25, a, a + 1.4);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba('#ffffff', 0.28 + this.treble * 0.24);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(95 + Math.sin(this.flow * 0.7) * 20, 72 + Math.cos(this.flow * 0.5) * 11);
    ctx.bezierCurveTo(165, 52, 250, 88 + this.mid * 22, 382 + Math.cos(this.flow * 0.8) * 18, 62 + this.bass * 20);
    ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', 0.12 + this.pulse * 0.2);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(this.focusX, this.focusY, 120 + this.bass * 30, 53 + this.mid * 14, Math.sin(this.flow * 0.2) * 0.4, 0, TAU); ctx.stroke();
    ctx.restore();
    this.drawDust(ctx, 0.62);
    ctx.restore();
    this.modernFinish(ctx, 0.16);
  }
}

class LaserGrid extends BaseVisualiser {
  constructor(seed, track) { super(seed, track); this.name = VISUALISER_NAMES[2]; }
  draw(ctx) {
    this.backdrop(ctx, '#18082a', '#03050e');
    const horizon = 126;
    const sunX = this.focusX;
    const sunY = 84 + (this.focusY - CY) * 0.65;
    this.glowDot(ctx, sunX, sunY, 58 + this.bass * 30, this.palette[2], 0.26);
    const sun = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, 38 + this.bass * 12);
    sun.addColorStop(0, rgba('#ffffff', 0.94));
    sun.addColorStop(0.16, rgba(this.palette[2], 0.9));
    sun.addColorStop(0.55, rgba(this.palette[3], 0.35));
    sun.addColorStop(1, rgba(this.palette[3], 0));
    ctx.fillStyle = sun;
    ctx.beginPath(); ctx.arc(sunX, sunY, 38 + this.bass * 12, 0, TAU); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    // Floating horizon haze and a laser contour make the skyline feel
    // dimensional instead of like a flat equalizer pasted on a grid.
    const haze = ctx.createLinearGradient(0, horizon - 22, 0, horizon + 20);
    haze.addColorStop(0, rgba(this.palette[0], 0));
    haze.addColorStop(0.5, rgba(this.palette[0], 0.18 + this.bass * 0.12));
    haze.addColorStop(1, rgba(this.palette[0], 0));
    ctx.fillStyle = haze; ctx.fillRect(0, horizon - 22, W, 42);
    ctx.strokeStyle = rgba(this.palette[0], 0.26 + this.bass * 0.25); ctx.lineWidth = 1;
    for (let i = -12; i <= 12; i++) {
      ctx.beginPath(); ctx.moveTo(CX + i * 19, horizon); ctx.lineTo(CX + i * 72, H); ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const z = (i + (this.beat * 0.5 % 1)) / 12;
      const y = horizon + Math.pow(z, 1.8) * (H - horizon + 8);
      ctx.strokeStyle = rgba(this.palette[1], 0.12 + (1 - z) * 0.26);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    const bars = 30;
    const bw = W / bars;
    for (let i = 0; i < bars; i++) {
      const v = this.spectrumValue(this.analysis, i, bars);
      const h = 12 + v * (50 + this.bass * 70) + this.pulse * (i % 3 === 0 ? 18 : 5);
      ctx.fillStyle = rgba(this.palette[i % 3], 0.3 + v * 0.52);
      ctx.fillRect(i * bw + 1, horizon - h, Math.max(2, bw - 2), h);
    }
    ctx.strokeStyle = rgba('#ffffff', 0.22 + this.mid * 0.25);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < bars; i++) {
      const v = this.spectrumValue(this.analysis, i, bars);
      const x = i * bw + bw * 0.5;
      const y = horizon - 10 - v * (46 + this.bass * 65);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    if (this.pulse > 0.02) {
      ctx.strokeStyle = rgba(this.palette[3], this.pulse * 0.65);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(sunX, horizon + (sunY - 84) * 0.35, 35 + (1 - this.pulse) * 160, 10 + (1 - this.pulse) * 45, 0, 0, TAU); ctx.stroke();
    }
    ctx.restore();
    this.drawDust(ctx, 0.82);
    this.modernFinish(ctx, 0.2);
  }
}

class MonsterReactor extends BaseVisualiser {
  constructor(seed, track) {
    super(seed, track); this.name = VISUALISER_NAMES[3]; this.sparks = makePool(70);
    this.sparks.forEach((p) => seedParticle(p, this.rng, CX, CY, 0.8));
    this.reactors = makePool(3);
    this.reactors.forEach((p, i) => {
      p.phase = this.rng.float();
      p.speed = 0.042 + this.rng.float() * 0.026;
      p.lane = 54 + i * 79 + this.rng.float() * 22;
      p.scale = 0.66 + this.rng.float() * 0.38;
      p.x = CX; p.y = CY; p.active = i === 0;
    });
  }
  update(dt, a) {
    super.update(dt, a);
    const reactorCount = 1 + (Math.floor(this.beat / 16) % 3);
    for (let i = 0; i < this.reactors.length; i++) {
      const p = this.reactors[i];
      if (i === 0) {
        p.active = true;
        p.x = this.focusX;
        p.y = this.focusY;
        continue;
      }
      p.active = i < reactorCount;
      // The escort reactors cross on `flow`, so a breakdown slows their drift
      // across the frame rather than teleporting them when the song returns.
      const travel = (this.flow * p.speed + p.phase) % 1;
      p.x = -105 + travel * (W + 210);
      p.y = p.lane + Math.sin(this.flow * (0.55 + i * 0.12) + p.phase * TAU) * (12 + i * 4);
    }
    const lead = this.reactors[0];
    for (const p of this.sparks) {
      p.life -= dt * (0.55 + this.treble);
      if (p.life <= 0) seedParticle(p, this.rng, lead.x, lead.y, 0.6);
      p.px = p.x; p.py = p.y;
      p.x += ((p.x - lead.x) * 0.08 + Math.cos(this.flow * 2 + p.hue * TAU) * 22) * dt * this.motion;
      p.y += ((p.y - lead.y) * 0.08 + Math.sin(this.flow * 1.7 + p.hue * TAU) * 22) * dt * this.motion;
    }
  }
  draw(ctx) {
    this.backdrop(ctx, '#050914', '#100b27');
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let reactorIndex = 0; reactorIndex < this.reactors.length; reactorIndex++) {
      const reactor = this.reactors[reactorIndex];
      if (!reactor.active) continue;
      const fx = reactor.x; const fy = reactor.y;
      const core = (30 + this.bass * 26 + this.pulse * 12) * reactor.scale;
      this.glowDot(ctx, fx, fy, core * 3.2, this.palette[reactorIndex % this.palette.length], 0.32 + this.bass * 0.24);
      for (let ring = 0; ring < 4; ring++) {
        ctx.strokeStyle = rgba(this.palette[(ring + reactorIndex) % this.palette.length], 0.22 + this.mid * 0.15);
        ctx.lineWidth = 1 + (ring === 0 ? this.pulse * 2 : 0);
        ctx.beginPath(); ctx.ellipse(fx, fy, core + ring * 19 * reactor.scale, core * 0.53 + ring * 9 * reactor.scale, this.ringRotation + this.t * (ring % 2 ? -0.2 : 0.16), 0, TAU); ctx.stroke();
      }
      const coreGlow = ctx.createRadialGradient(fx - core * 0.24, fy - core * 0.3, 1, fx, fy, core);
      coreGlow.addColorStop(0, rgba('#ffffff', 0.82));
      coreGlow.addColorStop(0.14, rgba(this.palette[reactorIndex % this.palette.length], 0.72));
      coreGlow.addColorStop(0.56, rgba(this.palette[(reactorIndex + 1) % this.palette.length], 0.34 + this.pulse * 0.24));
      coreGlow.addColorStop(1, rgba(this.palette[(reactorIndex + 1) % this.palette.length], 0));
      ctx.fillStyle = coreGlow;
      ctx.beginPath(); ctx.arc(fx, fy, core, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba('#ffffff', 0.55); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(fx, fy, core * 0.62, this.ringRotation + 0.2, this.ringRotation + Math.PI * 1.45); ctx.stroke();
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = rgba(this.palette[(i + 2 + reactorIndex) % this.palette.length], 0.2 + this.treble * 0.18);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(fx, fy, core * (1.18 + i * 0.1), this.ringRotation + this.t * (0.6 + i * 0.12) + i, this.ringRotation + this.t * (0.6 + i * 0.12) + i + 0.9 + this.mid);
        ctx.stroke();
      }
      for (let i = 0; i < 7; i++) {
        const a = this.t * (0.2 + i * 0.018) + i * TAU / 7;
        const r = (69 + Math.sin(this.t * 1.2 + i) * 9) * reactor.scale;
        const x = fx + Math.cos(a) * r;
        const y = fy + Math.sin(a) * r * 0.54;
        const c = this.palette[(i + reactorIndex) % this.palette.length];
        ctx.strokeStyle = rgba(c, 0.4); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(fx + Math.cos(a) * core, fy + Math.sin(a) * core * 0.54); ctx.quadraticCurveTo(x + Math.sin(a) * 14, y - Math.cos(a) * 11, x, y); ctx.stroke();
        ctx.fillStyle = rgba(c, 0.7); ctx.beginPath(); ctx.arc(x, y, (5 + (i % 2) * 2) * reactor.scale, 0, TAU); ctx.fill();
        ctx.fillStyle = '#07101d'; ctx.fillRect(x - 2, y - 1, 4, 2);
      }
    }
    for (const p of this.sparks) {
      ctx.strokeStyle = rgba(this.palette[Math.floor(p.hue * this.palette.length) % this.palette.length], p.life * (0.3 + this.treble));
      ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
    }
    ctx.restore();
    this.drawDust(ctx, 0.85);
    this.modernFinish(ctx, 0.2);
  }
}

class ElectricKaleidoscope extends BaseVisualiser {
  constructor(seed, track) {
    super(seed, track); this.name = VISUALISER_NAMES[4]; this.symmetry = 12; this.lastPhrase = -1;
    this.satellites = makePool(16);
    this.satellites.forEach((p) => {
      p.angle = this.rng.float() * TAU; p.radius = 96 + this.rng.float() * 70;
      // Larger satellites read as little kaleidoscopes in their own right,
      // while the seeded radial throw lets some of them brush the frame edge.
      p.size = 11 + this.rng.float() * 13;
      p.spin = (this.rng.float() < 0.5 ? -1 : 1) * (0.65 + this.rng.float() * 1.1);
      p.orbitRate = 0.22 + this.rng.float() * 0.34;
      p.travelDistance = 58 + this.rng.float() * 55;
      p.travelRate = 0.34 + this.rng.float() * 0.48;
      p.travelPhase = this.rng.float() * TAU;
      p.phase = this.rng.float() * TAU;
      p.petals = 3 + Math.floor(this.rng.float() * 3); p.hue = this.rng.float();
      p.active = false;
      p.spawn = false;
      p.morphT = 1;
      p.mergeTarget = -1;
      p.mergeT = 1;
      p.rotation = p.phase;
      p.mergeFromRotation = p.rotation;
      p.mergeFlash = 0;
      p.slotAngle = p.angle;
      p.slotRadius = p.radius;
    });
    this.satellites[0].active = true;
    this.satellites[1].active = true;
    this.satelliteCount = 2;
    this.satelliteTarget = 2;
    this.satelliteCycle = [2, 4, 8, 16, 8, 4, 2];
    this.satelliteMorphSeconds = 0.72;
  }
  satelliteSlot(p, index, count) {
    // Keep the little blooms on a broad, slightly irregular ring. The slot is
    // deterministic for a given seed, so duplicating and merging feels like a
    // designed choreography rather than freshly shuffled particles.
    const n = ((this.seed >>> ((index % 4) * 8)) & 255) / 255;
    p.slotAngle = index * TAU / count + (n - 0.5) * 0.28;
    p.slotRadius = 108 + ((index * 29 + (this.seed & 31)) % 57) + n * 18;
  }
  angleLerp(from, to, t) {
    const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
    return from + delta * t;
  }
  setSatelliteTarget(target) {
    target = Math.max(2, Math.min(16, target));
    if (target === this.satelliteTarget) return;
    const active = [];
    for (let i = 0; i < this.satellites.length; i++) {
      if (this.satellites[i].active && this.satellites[i].mergeTarget < 0) active.push(i);
    }
    const current = active.length || this.satelliteCount;
    if (target > current) {
      // First fan the existing blooms into their new slots, then duplicate
      // them from their current positions. New copies fade in as they arrive.
      for (let i = 0; i < current; i++) {
        const p = this.satellites[active[i]];
        p.fromAngle = p.angle; p.fromRadius = p.radius; p.morphT = 0; p.spawn = false;
        this.satelliteSlot(p, i, target);
      }
      for (let i = current; i < target; i++) {
        const parent = this.satellites[active[i % current]];
        const p = this.satellites[i];
        p.active = true; p.spawn = true; p.morphT = 0; p.mergeTarget = -1;
        p.fromAngle = parent.angle; p.fromRadius = parent.radius;
        p.angle = parent.angle; p.radius = parent.radius;
        p.rotation = parent.rotation;
        p.spin = parent.spin * (i % 2 ? -1 : 1);
        p.hue = (parent.hue + (i - current + 1) / Math.max(1, target)) % 1;
        this.satelliteSlot(p, i, target);
      }
    } else {
      // Choose evenly spread survivors. Every surplus bloom is paired with a
      // survivor on the opposite side of the ring, then flies there and locks
      // its rotation before disappearing: a visible 2 -> 1 synchronisation.
      const survivors = [];
      for (let i = 0; i < target; i++) survivors.push(active[Math.floor(i * current / target)]);
      for (let i = 0; i < target; i++) {
        const p = this.satellites[survivors[i]];
        p.fromAngle = p.angle; p.fromRadius = p.radius; p.morphT = 0; p.spawn = false;
        this.satelliteSlot(p, i, target);
      }
      const half = Math.floor(target / 2);
      const survivorSet = new Set(survivors);
      let extraIndex = 0;
      for (const id of active) {
        if (survivorSet.has(id)) continue;
        const extra = this.satellites[id];
        const partner = survivors[(extraIndex + half) % target];
        extraIndex++;
        extra.mergeTarget = partner;
        extra.mergeT = 0;
        extra.fromAngle = extra.angle; extra.fromRadius = extra.radius;
        extra.mergeFromRotation = extra.rotation;
        extra.spawn = false;
      }
    }
    this.satelliteCount = target;
    this.satelliteTarget = target;
  }
  update(dt, a) {
    super.update(dt, a);
    const phrase = Math.floor(this.beat / 8);
    // Re-cut the mirror count only on phrase boundaries: the geometry can
    // breathe with the song without strobing or tearing mid-bar. The seeded
    // walk deliberately visits both denser and sparser arrangements (8–24).
    if (phrase !== this.lastPhrase) {
      this.lastPhrase = phrase;
      const step = ((phrase * 5 + (this.seed >>> 0)) % 9 + 9) % 9;
      this.symmetry = 8 + step * 2;
      this.setSatelliteTarget(this.satelliteCycle[phrase % this.satelliteCycle.length]);
    }
    for (const p of this.satellites) {
      if (!p.active) continue;
      if (p.mergeTarget >= 0) {
        const partner = this.satellites[p.mergeTarget];
        p.mergeT = Math.min(1, p.mergeT + dt / this.satelliteMorphSeconds);
        const t = smooth(p.mergeT);
        p.angle = this.angleLerp(p.fromAngle, partner.angle, t);
        p.radius += (partner.radius - p.radius) * Math.min(1, dt * 8);
        p.rotation = this.angleLerp(p.mergeFromRotation, partner.rotation, t);
        p.size += (partner.size - p.size) * Math.min(1, dt * 7);
        if (p.mergeT >= 1) {
          p.active = false;
          p.mergeTarget = -1;
          partner.mergeFlash = Math.max(partner.mergeFlash, 1);
        }
        continue;
      }
      if (p.morphT < 1) {
        p.morphT = Math.min(1, p.morphT + dt / this.satelliteMorphSeconds);
        const t = smooth(p.morphT);
        p.angle = this.angleLerp(p.fromAngle, p.slotAngle, t);
        p.radius += (p.slotRadius - p.radius) * Math.min(1, dt * 8);
        if (p.morphT >= 1) p.spawn = false;
      }
      p.angle += dt * p.spin * (p.orbitRate + this.mid * 0.72 + this.pulse * 0.3) * this.motion;
      // The satellites breathe radially across a much wider envelope than the
      // central bloom. At the outer crest their x/y positions can slip just
      // beyond the logical canvas before being pulled back into formation, and
      // the excursion narrows toward the slot radius as the song quietens.
      p.radius = p.slotRadius
        + Math.sin(this.flow * p.travelRate + p.travelPhase) * (p.travelDistance + this.bass * 18) * this.motion
        + this.pulse * (8 + this.bass * 16);
      p.rotation += dt * p.spin * (1.45 + this.mid * 0.42) * this.motion;
      p.mergeFlash = Math.max(0, p.mergeFlash - dt * 2.8);
    }
  }
  draw(ctx) {
    this.backdrop(ctx, '#050516', '#170b2d');
    const petals = this.symmetry;
    const radius = 34 + this.bass * 36 + this.pulse * 10;
    ctx.save(); ctx.translate(this.focusX, this.focusY); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < petals; i++) {
      ctx.save();
      ctx.rotate(i * TAU / petals + this.t * 0.08);
      const c = this.palette[i % this.palette.length];
      ctx.fillStyle = rgba(c, 0.18 + this.mid * 0.18);
      ctx.strokeStyle = rgba(c, 0.4 + this.treble * 0.25);
      ctx.lineWidth = 1 + this.treble * 1.4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(radius * 0.55, -radius * (0.35 + this.spectrumValue(this.analysis, i, petals) * 0.4), radius * 1.8, -radius * 0.16);
      ctx.quadraticCurveTo(radius * 1.15, radius * 0.44, 0, 0);
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.strokeStyle = rgba('#ffffff', 0.4 + this.pulse * 0.3); ctx.lineWidth = 1;
    for (let i = 0; i < petals; i += 2) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(i * TAU / petals) * 112, Math.sin(i * TAU / petals) * 78); ctx.stroke(); }
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = rgba(this.palette[(i + 1) % this.palette.length], 0.16 + this.treble * 0.14);
      ctx.lineWidth = 1 + this.pulse;
      ctx.beginPath(); ctx.arc(0, 0, radius * (0.7 + i * 0.32), this.ringRotation + this.t * 0.16 + i, this.ringRotation + this.t * 0.16 + i + 1.8); ctx.stroke();
    }
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.72);
    core.addColorStop(0, rgba('#ffffff', 0.9));
    core.addColorStop(0.18, rgba(this.palette[0], 0.5));
    core.addColorStop(1, rgba(this.palette[0], 0));
    ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, 0, radius * 0.72, 0, TAU); ctx.fill();
    ctx.restore();
    this.glowDot(ctx, this.focusX, this.focusY, radius * 2.2, this.palette[1], 0.18 + this.pulse * 0.2);
    // A musical swarm of smaller, lower-petal kaleidoscopes orbits the main
    // bloom. It expands 2 -> 4 -> 8 -> 16, then contracts again; surplus
    // blooms visibly travel to a distant partner and synchronize before they
    // merge away.
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of this.satellites) {
      if (!p.active) continue;
      const sx = this.focusX + Math.cos(p.angle) * p.radius;
      const sy = this.focusY + Math.sin(p.angle) * p.radius * 0.62;
      const mergeT = p.mergeTarget >= 0 ? smooth(p.mergeT) : 0;
      const birthT = p.spawn ? smooth(p.morphT) : 1;
      const alpha = (p.mergeTarget >= 0 ? 1 - mergeT * 0.55 : 1) * (0.2 + birthT * 0.8);
      const r = p.size * (1 + this.pulse * 0.45 + p.mergeFlash * 0.18);
      const c = this.palette[Math.floor(p.hue * this.palette.length) % this.palette.length];
      this.glowDot(ctx, sx, sy, r * (2.4 + p.mergeFlash * 1.2), c, (0.1 + this.mid * 0.1) * alpha);
      ctx.save();
      ctx.globalAlpha = this.frameAlpha * alpha;
      ctx.translate(sx, sy);
      // Fast, unmistakable full rotations: the satellites should read as
      // rotating kaleidoscopes, not petals that merely breathe in place.
      ctx.rotate(p.rotation);
      const satellitePulse = 1 + Math.sin(this.t * (1.8 + p.orbitRate * 3) + p.phase) * (0.05 + this.treble * 0.045);
      ctx.scale(satellitePulse, 1 / satellitePulse);
      for (let i = 0; i < p.petals; i++) {
        ctx.save(); ctx.rotate(i * TAU / p.petals);
        ctx.fillStyle = rgba(this.palette[(i + Math.floor(p.hue * 4)) % this.palette.length], 0.2 + this.treble * 0.16);
        ctx.strokeStyle = rgba(c, 0.35 + this.treble * 0.25); ctx.lineWidth = 0.7 + this.pulse * 0.7;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(r * 0.65, -r * 0.35, r * 1.5, 0); ctx.quadraticCurveTo(r * 0.65, r * 0.35, 0, 0); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = rgba('#ffffff', 0.35 + this.pulse * 0.3); ctx.beginPath(); ctx.arc(0, 0, 1.5 + this.pulse * 1.4, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    this.drawDust(ctx, 0.75);
    this.modernFinish(ctx, 0.16);
  }
}

class DeepSpaceWormhole extends BaseVisualiser {
  constructor(seed, track) {
    super(seed, track); this.name = VISUALISER_NAMES[5]; this.stars = makePool(90);
    this.stars.forEach((p) => { p.z = this.rng.float(); p.life = 0.3 + this.rng.float() * 0.7; p.hue = this.rng.float(); });
  }
  update(dt, a) {
    super.update(dt, a);
    // Flight speed down the tunnel is the whole read of this preset, so it takes
    // the movement multiplier directly: a breakdown coasts, a chorus flies.
    const speed = (0.16 + this.bass * 0.6 + this.pulse * 0.42) * this.motion;
    for (const p of this.stars) {
      p.px = p.x; p.py = p.y;
      p.z -= dt * speed;
      if (p.z <= 0.015) { p.z = 0.9 + this.rng.float() * 0.2; p.hue = this.rng.float(); }
      const angle = p.hue * TAU + this.flow * (0.08 + p.life * 0.12);
      const r = (1 - p.z) * 205;
      p.x = this.focusX + Math.cos(angle) * r;
      p.y = this.focusY + Math.sin(angle) * r * 0.54;
    }
  }
  draw(ctx) {
    this.backdrop(ctx, '#020511', '#0b1231');
    // Slow nebula volumes sit behind the stars, giving the tunnel colored
    // atmosphere instead of an empty black void.
    for (let i = 0; i < 4; i++) {
      const a = this.t * (0.12 + i * 0.025) + i * 1.9;
      const x = this.focusX + Math.cos(a) * (44 + i * 26);
      const y = this.focusY + Math.sin(a * 1.2) * (26 + i * 13);
      this.glowDot(ctx, x, y, 44 + this.mid * 26, this.palette[(i + 1) % this.palette.length], 0.1 + this.mid * 0.08);
    }
    this.glowDot(ctx, this.focusX, this.focusY, 75 + this.bass * 50, this.palette[1], 0.22 + this.bass * 0.18);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = rgba(this.palette[i % this.palette.length], 0.13 + this.mid * 0.12);
      ctx.beginPath(); ctx.ellipse(this.focusX, this.focusY, 28 + i * 21 + this.pulse * 9, 12 + i * 9, this.ringRotation + this.t * (0.08 + i * 0.01), 0, TAU); ctx.stroke();
    }
    for (const p of this.stars) {
      const alpha = clamp((1 - p.z) * 1.1) * (0.25 + this.treble * 0.9);
      ctx.strokeStyle = rgba(this.palette[Math.floor(p.hue * this.palette.length) % this.palette.length], alpha);
      ctx.lineWidth = 0.6 + (1 - p.z) * 1.8;
      ctx.beginPath(); ctx.moveTo(this.focusX + (p.x - this.focusX) * 0.82, this.focusY + (p.y - this.focusY) * 0.82); ctx.lineTo(p.x, p.y); ctx.stroke();
    }
    if (this.treble > 0.16) {
      ctx.strokeStyle = rgba(this.palette[3], this.treble * 0.45);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(this.focusX, this.focusY, 54 + this.treble * 52, this.ringRotation + this.t * 0.7, this.ringRotation + this.t * 0.7 + 1.1); ctx.stroke();
    }
    ctx.fillStyle = '#01030c';
    ctx.beginPath(); ctx.arc(this.focusX, this.focusY, 13 + this.pulse * 5, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba('#ffffff', 0.28 + this.pulse * 0.3);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(this.focusX, this.focusY, 17 + this.pulse * 6, 0, TAU); ctx.stroke();
    ctx.restore();
    this.drawDust(ctx, 0.9);
    this.modernFinish(ctx, 0.18);
  }
}

function polygonPath(ctx, x, y, radius, sides, rotation = 0) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rotation + i * TAU / sides;
    const px = x + Math.cos(a) * radius;
    const py = y + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function roundedTrianglePath(ctx, x, y, radius, rotation = 0, corner = 0.24) {
  const a0 = rotation - Math.PI / 2;
  const a1 = a0 + TAU / 3;
  const a2 = a1 + TAU / 3;
  const x0 = x + Math.cos(a0) * radius; const y0 = y + Math.sin(a0) * radius;
  const x1 = x + Math.cos(a1) * radius; const y1 = y + Math.sin(a1) * radius;
  const x2 = x + Math.cos(a2) * radius; const y2 = y + Math.sin(a2) * radius;
  const q = clamp(corner, 0.08, 0.34);
  const d = radius * q;
  const edge = radius * Math.sqrt(3);
  const t = d / edge;
  const v0oX = x0 + (x1 - x0) * t; const v0oY = y0 + (y1 - y0) * t;
  const v1iX = x1 + (x0 - x1) * t; const v1iY = y1 + (y0 - y1) * t;
  const v1oX = x1 + (x2 - x1) * t; const v1oY = y1 + (y2 - y1) * t;
  const v2iX = x2 + (x1 - x2) * t; const v2iY = y2 + (y1 - y2) * t;
  const v2oX = x2 + (x0 - x2) * t; const v2oY = y2 + (y0 - y2) * t;
  const v0iX = x0 + (x2 - x0) * t; const v0iY = y0 + (y2 - y0) * t;
  ctx.beginPath();
  ctx.moveTo(v0oX, v0oY);
  ctx.lineTo(v1iX, v1iY); ctx.quadraticCurveTo(x1, y1, v1oX, v1oY);
  ctx.lineTo(v2iX, v2iY); ctx.quadraticCurveTo(x2, y2, v2oX, v2oY);
  ctx.lineTo(v0iX, v0iY); ctx.quadraticCurveTo(x0, y0, v0oX, v0oY);
  ctx.closePath();
}

class PrismaticStorm extends BaseVisualiser {
  constructor(seed, track) {
    super(seed, track); this.name = VISUALISER_NAMES[6]; this.shards = makePool(84);
    this.shards.forEach((p) => {
      p.angle = this.rng.float() * TAU; p.radius = 25 + this.rng.float() * 205;
      p.size = 2 + this.rng.float() * 10; p.spin = -1 + this.rng.float() * 2;
      p.rotation = this.rng.float() * TAU;
      p.turn = (this.rng.float() - 0.5) * 2.4;
      p.depth = 0.2 + this.rng.float() * 0.8;
    });
  }
  update(dt, a) {
    super.update(dt, a);
    // Shared with Chroma Bubblestorm below: the outward throw and the tumble
    // both scale with loudness, so the storm settles into a slow swirl when the
    // song drops out and re-erupts on the way back in.
    for (const p of this.shards) {
      p.angle += dt * p.spin * (0.18 + this.mid * 0.9) * this.motion;
      p.radius += dt * (7 + this.pulse * 36) * p.depth * this.motion;
      p.rotation += dt * p.turn * (0.55 + this.treble * 1.1 + this.pulse * 0.25) * this.motion;
      if (p.radius > 240) p.radius = 20 + this.rng.float() * 35;
    }
  }
  draw(ctx) {
    this.backdrop(ctx, '#10052c', '#020814');
    const fx = this.focusX; const fy = this.focusY; const pulse = this.pulse;
    for (let i = 0; i < 6; i++) { const a = this.t * (0.08 + i * 0.012) + i; this.glowDot(ctx, fx + Math.cos(a) * 45, fy + Math.sin(a) * 28, 42 + this.bass * 28, this.palette[i % 4], 0.1); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < 14; i++) {
      const a = i * TAU / 14 + this.t * 0.16; const length = 260 + this.bass * 34;
      ctx.strokeStyle = rgba(this.palette[i % 4], 0.12 + this.bass * 0.2); ctx.lineWidth = 1 + pulse * 2;
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + Math.cos(a) * length, fy + Math.sin(a) * length * 0.66); ctx.stroke();
      ctx.fillStyle = rgba(this.palette[i % 4], 0.22 + pulse * 0.18); ctx.beginPath(); ctx.arc(fx + Math.cos(a) * length, fy + Math.sin(a) * length * 0.66, 1.5 + pulse * 2, 0, TAU); ctx.fill();
    }
    for (const p of this.shards) {
      const x = fx + Math.cos(p.angle) * p.radius; const y = fy + Math.sin(p.angle) * p.radius * 0.62;
      const s = p.size * (1 + (1 - p.depth) * 0.8 + pulse * 0.7); const color = this.palette[Math.floor(p.depth * 4) % 4];
      this.glowDot(ctx, x, y, s * 3.2, color, 0.08 + p.depth * 0.12);
      ctx.fillStyle = rgba(color, 0.25 + p.depth * 0.55 + this.treble * 0.2);
      roundedTrianglePath(ctx, x, y, s, p.rotation, 0.25 + this.pulse * 0.04);
      ctx.fill();
      ctx.strokeStyle = rgba('#ffffff', 0.22 + this.treble * 0.24 + this.pulse * 0.18);
      ctx.lineWidth = 0.45 + this.pulse * 0.7;
      ctx.stroke();
    }
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = rgba(this.palette[(i + 1) % 4], 0.22);
      ctx.lineWidth = 1.2;
      roundedTrianglePath(ctx, fx, fy, 24 + i * 18 + pulse * 10, this.t * (0.12 + i * 0.02), 0.2);
      ctx.stroke();
    }
    this.glowDot(ctx, fx, fy, 50 + this.bass * 35, '#ffffff', 0.16 + pulse * 0.28);
    ctx.restore(); this.drawDust(ctx, 1.05); this.modernFinish(ctx, 0.14);
  }
}

// A circular sibling to Prismatic Storm. It keeps the same outward-moving
// musical storm field, but replaces every shard and centre motif with orbs.
class ChromaBubblestorm extends PrismaticStorm {
  constructor(seed, track) {
    super(seed, track);
    this.name = VISUALISER_NAMES[14];
    this.orbs = this.shards;
  }
  draw(ctx) {
    this.backdrop(ctx, '#06172a', '#12052b');
    const fx = this.focusX; const fy = this.focusY; const pulse = this.pulse;
    for (let i = 0; i < 6; i++) {
      const a = this.t * (0.08 + i * 0.012) + i;
      this.glowDot(ctx, fx + Math.cos(a) * 45, fy + Math.sin(a) * 28,
        42 + this.bass * 28, this.palette[i % 4], 0.1);
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) {
      const a = i * TAU / 14 + this.t * 0.16;
      const length = 260 + this.bass * 34;
      ctx.strokeStyle = rgba(this.palette[i % 4], 0.12 + this.bass * 0.2);
      ctx.lineWidth = 1 + pulse * 2;
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + Math.cos(a) * length, fy + Math.sin(a) * length * 0.66); ctx.stroke();
    }
    for (const p of this.orbs) {
      const x = fx + Math.cos(p.angle) * p.radius;
      const y = fy + Math.sin(p.angle) * p.radius * 0.62;
      const r = p.size * (1 + (1 - p.depth) * 0.8 + pulse * 0.7);
      const color = this.palette[Math.floor(p.depth * 4) % 4];
      this.glowDot(ctx, x, y, r * 3.4, color, 0.09 + p.depth * 0.13);
      const orb = ctx.createRadialGradient(x - r * 0.3, y - r * 0.32, 0, x, y, r);
      orb.addColorStop(0, rgba('#ffffff', 0.78));
      orb.addColorStop(0.25, rgba(color, 0.76));
      orb.addColorStop(1, rgba(color, 0.06));
      ctx.fillStyle = orb;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba('#ffffff', 0.24 + this.treble * 0.24 + pulse * 0.18);
      ctx.lineWidth = 0.45 + pulse * 0.7;
      ctx.stroke();
    }
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = rgba(this.palette[(i + 1) % 4], 0.22);
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(fx, fy, 24 + i * 18 + pulse * 10, 0, TAU); ctx.stroke();
    }
    this.glowDot(ctx, fx, fy, 50 + this.bass * 35, '#ffffff', 0.16 + pulse * 0.28);
    ctx.restore(); this.drawDust(ctx, 1.05); this.modernFinish(ctx, 0.14);
  }
}

class SingularityBloom extends BaseVisualiser {
  constructor(seed, track) {
    super(seed, track); this.name = VISUALISER_NAMES[7]; this.orbiters = makePool(112);
    this.bloomScale = 0.72;
    this.bloomCycleBars = 12;
    this.bloomSwellBars = 4;
    this.orbiters.forEach((p) => { p.angle = this.rng.float() * TAU; p.radius = 26 + this.rng.float() * 160; p.speed = 0.2 + this.rng.float() * 0.9; p.tilt = 0.35 + this.rng.float() * 0.38; p.z = 0.2 + this.rng.float() * 0.8; p.hue = this.rng.float(); });
  }
  update(dt, a) {
    super.update(dt, a);
    // One musical swell spans a phrase: the galaxy grows from a compact core,
    // exceeds the logical frame, then contracts back to its singularity.
    const cycleBeats = this.bloomCycleBars * 4;
    const swellBeats = this.bloomSwellBars * 4;
    const cycleBeat = ((this.beat % cycleBeats) + cycleBeats) % cycleBeats;
    const swell = cycleBeat < swellBeats ? Math.sin(Math.PI * cycleBeat / swellBeats) : 0;
    this.bloomScale = 0.72 + swell * (2.7 + this.bass * 0.35) + this.pulse * 0.12;
    for (const p of this.orbiters) { p.angle += dt * p.speed * (0.45 + this.bass * 1.4); p.radius += Math.sin(this.t * 0.7 + p.hue * 8) * dt * 2; if (p.radius > 190) p.radius = 24; }
  }
  draw(ctx) {
    this.backdrop(ctx, '#08020f', '#16051f'); const fx = this.focusX; const fy = this.focusY; const core = 17 + this.bass * 19 + this.pulse * 8;
    this.glowDot(ctx, fx, fy, (115 + this.bass * 55) * this.bloomScale, this.palette[3], 0.19 + this.bass * 0.18);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.translate(fx, fy); ctx.scale(this.bloomScale, this.bloomScale); ctx.translate(-fx, -fy);
    for (let i = 0; i < 11; i++) { ctx.strokeStyle = rgba(this.palette[i % 4], 0.1 + this.mid * 0.12); ctx.lineWidth = 1 + (i === 0 ? this.pulse * 3 : 0); ctx.beginPath(); ctx.ellipse(fx, fy, 30 + i * 8 + this.bass * 18, 8 + i * 3, this.ringRotation + this.t * (0.18 + i * 0.011), 0, TAU); ctx.stroke(); }
    for (const p of this.orbiters) { const x = fx + Math.cos(p.angle) * p.radius; const y = fy + Math.sin(p.angle) * p.radius * p.tilt; const px = fx + Math.cos(p.angle - 0.06) * p.radius; const py = fy + Math.sin(p.angle - 0.06) * p.radius * p.tilt; ctx.strokeStyle = rgba(this.palette[Math.floor(p.hue * 4) % 4], 0.2 + this.treble * 0.8); ctx.lineWidth = 0.5 + p.z * 1.3; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke(); }
    const g = ctx.createRadialGradient(fx - core * 0.3, fy - core * 0.3, 0, fx, fy, core * 2.2); g.addColorStop(0, '#ffffff'); g.addColorStop(0.12, rgba(this.palette[1], 0.9)); g.addColorStop(0.36, rgba(this.palette[2], 0.5)); g.addColorStop(1, rgba(this.palette[2], 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx, fy, core * 2.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#010107'; ctx.beginPath(); ctx.arc(fx, fy, core, 0, TAU); ctx.fill(); ctx.strokeStyle = rgba('#ffffff', 0.5 + this.pulse * 0.3); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(fx, fy, core + 4 + this.pulse * 5, 0, TAU); ctx.stroke();
    ctx.restore(); this.drawDust(ctx, 1.1); this.modernFinish(ctx, 0.2);
  }
}

class HolographicOcean extends BaseVisualiser {
  constructor(seed, track) { super(seed, track); this.name = VISUALISER_NAMES[8]; this.motes = makePool(80); this.motes.forEach((p) => { p.x = this.rng.float() * W; p.y = 70 + this.rng.float() * 150; p.px = p.x; p.py = p.y; p.z = this.rng.float(); p.hue = this.rng.float(); }); }
  update(dt, a) { super.update(dt, a); for (const p of this.motes) { p.px = p.x; p.py = p.y; p.x += Math.sin(this.t * (0.4 + p.z) + p.hue * 8) * dt * 8; p.y -= dt * (2 + p.z * 5); if (p.y < 58) { p.y = 235; p.x = this.rng.float() * W; } } }
  draw(ctx) {
    this.backdrop(ctx, '#02192b', '#050625'); const horizon = this.focusY + 14; const sunX = this.focusX + 36 * Math.sin(this.t * 0.22); const sunY = 76 + Math.cos(this.t * 0.31) * 12;
    this.glowDot(ctx, sunX, sunY, 60 + this.bass * 35, this.palette[1], 0.3 + this.mid * 0.16);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let row = 0; row < 18; row++) { const p = row / 18; const y = horizon + p * p * 150; const amp = 3 + p * (12 + this.bass * 26) + this.pulse * 5; ctx.strokeStyle = rgba(this.palette[(row + 1) % 4], 0.12 + p * 0.22 + this.mid * 0.1); ctx.lineWidth = 0.65 + p * 1.1; ctx.beginPath(); for (let x = -20; x <= W + 20; x += 12) { const wave = Math.sin(x * 0.028 + this.t * (1.2 + p) + row * 0.45) * amp + Math.sin(x * 0.065 - this.t * 0.7) * amp * 0.25; if (x === -20) ctx.moveTo(x, y + wave); else ctx.lineTo(x, y + wave); } ctx.stroke(); }
    for (let i = 0; i < 9; i++) { const y = horizon - 28 + i * 9 + Math.sin(this.t * 0.8 + i) * 4; ctx.strokeStyle = rgba(this.palette[i % 4], 0.15 + this.treble * 0.2); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y + Math.sin(this.t + i) * 5); ctx.stroke(); }
    for (const p of this.motes) { ctx.fillStyle = rgba(this.palette[Math.floor(p.hue * 4) % 4], 0.18 + p.z * 0.55); ctx.beginPath(); ctx.arc(p.x, p.y, 0.6 + p.z * 1.15, 0, TAU); ctx.fill(); }
    ctx.fillStyle = rgba('#ffffff', 0.35 + this.pulse * 0.3); ctx.beginPath(); ctx.arc(sunX, sunY, 12 + this.bass * 10, 0, TAU); ctx.fill(); ctx.restore();
    this.drawDust(ctx, 0.9); this.modernFinish(ctx, 0.15);
  }
}

class DataRainAscension extends BaseVisualiser {
  constructor(seed, track) { super(seed, track); this.name = VISUALISER_NAMES[9]; this.streams = Array.from({ length: 38 }, () => ({ x: this.rng.float() * W, y: this.rng.float() * H, speed: 20 + this.rng.float() * 90, length: 5 + Math.floor(this.rng.float() * 15), phase: this.rng.float(), brightness: 0.2 + this.rng.float() * 0.8 })); }
  // Fall speed carries the loudness: quiet sections leave the rain hanging.
  update(dt, a) { super.update(dt, a); for (const s of this.streams) { s.y += dt * s.speed * (0.55 + this.treble * 1.5) * this.motion; if (s.y - s.length * 7 > H) { s.y = -this.rng.float() * 90; s.x = this.rng.float() * W; } } }
  draw(ctx) {
    this.backdrop(ctx, '#020610', '#071b25'); const fx = this.focusX; const fy = this.focusY; this.glowDot(ctx, fx, fy, 95 + this.bass * 55, this.palette[0], 0.14 + this.pulse * 0.22);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const s of this.streams) { for (let i = 0; i < s.length; i++) { const y = s.y - i * 7; const a = s.brightness * (1 - i / s.length) * (0.22 + this.treble * 0.65); ctx.fillStyle = rgba(this.palette[Math.floor((s.phase + i * 0.13) * 4) % 4], a); const w = 1 + ((i + Math.floor(this.t * 12 * s.phase)) % 3); ctx.fillRect(s.x + Math.sin(i * 2.4 + s.phase * 7) * 3, y, w, 2.3); } }
    for (let i = 0; i < 10; i++) { ctx.strokeStyle = rgba(this.palette[i % 4], 0.14 + this.mid * 0.12); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(fx, fy, 18 + i * 12 + this.pulse * 9, this.ringRotation + this.t * (0.2 + i * 0.01) + i, this.ringRotation + this.t * (0.2 + i * 0.01) + i + 1.2); ctx.stroke(); }
    ctx.fillStyle = '#eaffff'; polygonPath(ctx, fx, fy, 12 + this.bass * 9, 6, this.t * 0.5); ctx.fill(); ctx.restore(); this.drawDust(ctx, 1.2); this.modernFinish(ctx, 0.18);
  }
}

class FractalFlame extends BaseVisualiser {
  constructor(seed, track) { super(seed, track); this.name = VISUALISER_NAMES[10]; this.branches = makePool(68); this.branches.forEach((p) => { p.angle = this.rng.float() * TAU; p.radius = 16 + this.rng.float() * 100; p.length = 25 + this.rng.float() * 100; p.spin = -1 + this.rng.float() * 2; p.z = 0.25 + this.rng.float() * 0.75; p.hue = this.rng.float(); }); }
  // The flame keeps its shape when quiet but stops climbing and curling.
  update(dt, a) { super.update(dt, a); for (const p of this.branches) { p.angle += dt * p.spin * (0.2 + this.mid) * this.motion; p.radius += dt * (4 + this.bass * 20) * this.motion; if (p.radius > 125) p.radius = 12 + this.rng.float() * 18; } }
  draw(ctx) {
    this.backdrop(ctx, '#1b0506', '#10021c'); const fx = this.focusX; const fy = this.focusY; const core = 15 + this.bass * 24 + this.pulse * 8;
    this.glowDot(ctx, fx, fy, 100 + this.bass * 40, this.palette[2], 0.24 + this.bass * 0.18);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const p of this.branches) { const x = fx + Math.cos(p.angle) * p.radius; const y = fy + Math.sin(p.angle) * p.radius * 0.72; const len = p.length * (0.7 + this.treble * 0.8 + this.pulse * 0.3); const tipX = x + Math.cos(p.angle + Math.sin(this.t * 1.4 + p.hue * 7) * 0.5) * len; const tipY = y + Math.sin(p.angle + Math.sin(this.t * 1.4 + p.hue * 7) * 0.5) * len * 0.55; ctx.strokeStyle = rgba(this.palette[Math.floor(p.hue * 4) % 4], 0.22 + p.z * 0.45); ctx.lineWidth = 0.5 + p.z * 1.6; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo(x, y, tipX, tipY); ctx.stroke(); if (p.z > 0.45) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tipX + Math.cos(p.angle + 1.2) * 12, tipY + Math.sin(p.angle + 1.2) * 8); ctx.stroke(); } }
    for (let i = 0; i < 7; i++) { ctx.strokeStyle = rgba(this.palette[i % 4], 0.2 + this.pulse * 0.15); ctx.lineWidth = 1 + (i === 0 ? this.pulse * 2 : 0); ctx.beginPath(); ctx.arc(fx, fy, core + i * 10, this.ringRotation + this.t * (0.2 + i * 0.03), this.ringRotation + this.t * (0.2 + i * 0.03) + 1.4 + this.mid); ctx.stroke(); }
    const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, core); g.addColorStop(0, '#fff5d6'); g.addColorStop(0.22, rgba(this.palette[1], 0.95)); g.addColorStop(0.7, rgba(this.palette[3], 0.45)); g.addColorStop(1, rgba(this.palette[3], 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx, fy, core, 0, TAU); ctx.fill(); ctx.restore();
    this.drawDust(ctx, 1.15); this.modernFinish(ctx, 0.16);
  }
}

class OscilloscopeOverdrive extends BaseVisualiser {
  constructor(seed, track) {
    super(seed, track);
    this.name = VISUALISER_NAMES[11];
    this.trace = Array.from({ length: 180 }, (_, i) => ({ u: i / 179, x: CX, y: CY, age: 1 }));
    this.particles = makePool(120);
    this.particles.forEach((p) => seedParticle(p, this.rng, CX, CY, 0.9));
    this.smoke = makePool(34);
    this.smoke.forEach((p) => {
      p.x = CX + (this.rng.float() - 0.5) * 180; p.y = CY + (this.rng.float() - 0.5) * 100;
      p.px = p.x; p.py = p.y; p.z = 0.25 + this.rng.float() * 0.75; p.life = this.rng.float(); p.hue = this.rng.float();
    });
  }
  update(dt, a) {
    super.update(dt, a);
    const wave = a?.waveform;
    const amp = 29 + this.bass * 31 + this.mid * 18 + this.pulse * 8;
    const head = (this.t * (0.19 + this.bass * 0.05)) % 1;
    for (const p of this.trace) {
      const sample = wave?.length ? wave[Math.min(wave.length - 1, Math.floor(p.u * wave.length))] / 255 - 0.5 : Math.sin(p.u * TAU * 4 - this.t * 4) * 0.35;
      p.x = this.focusX - 192 + p.u * 384;
      p.y = this.focusY + sample * amp * 1.7 + Math.sin(p.u * TAU * 3 - this.t * 3.2) * (5 + this.treble * 9);
      p.age = (head - p.u + 1) % 1;
    }
    for (const p of this.particles) {
      p.life -= dt * (0.28 + this.treble * 0.85);
      if (p.life <= 0) seedParticle(p, this.rng, this.focusX, this.focusY, 0.78);
      p.px = p.x; p.py = p.y;
      p.x += (p.x - this.focusX) * dt * (0.14 + this.pulse * 0.7) + Math.cos(this.t * 2.4 + p.hue * TAU) * dt * 13;
      p.y += (p.y - this.focusY) * dt * (0.11 + this.pulse * 0.54) + Math.sin(this.t * 2 + p.hue * TAU) * dt * 13;
    }
    for (const p of this.smoke) {
      p.life -= dt * (0.08 + this.treble * 0.16);
      if (p.life <= 0) {
        p.x = this.focusX + (this.rng.float() - 0.5) * 150; p.y = this.focusY + 30 + this.rng.float() * 42;
        p.px = p.x; p.py = p.y; p.z = 0.25 + this.rng.float() * 0.75; p.life = 0.45 + this.rng.float() * 0.55; p.hue = this.rng.float();
      }
      p.px = p.x; p.py = p.y;
      p.x += Math.sin(this.t * (0.35 + p.z * 0.4) + p.hue * TAU) * dt * (8 + this.mid * 12);
      p.y -= dt * (3 + p.z * 8 + this.bass * 7);
    }
  }
  draw(ctx) {
    this.backdrop(ctx, '#03050e', '#120722');
    const fx = this.focusX; const fy = this.focusY; const rotation = this.t * 0.16 + Math.sin(this.t * 0.37) * 0.08;
    this.glowDot(ctx, fx, fy, 90 + this.bass * 55, this.palette[1], 0.16 + this.bass * 0.2);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of this.smoke) {
      const color = this.palette[Math.floor(p.hue * this.palette.length) % this.palette.length];
      this.glowDot(ctx, p.x, p.y, 10 + p.z * 18 + this.mid * 8, color, p.life * 0.055);
    }
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(fx, fy); ctx.rotate(rotation); ctx.translate(-fx, -fy);
    for (let i = 0; i < 16; i++) {
      const a = i * TAU / 16; const length = 170 + this.bass * 105 + (i % 3) * 24;
      ctx.strokeStyle = rgba(this.palette[i % this.palette.length], 0.09 + this.pulse * 0.2);
      ctx.lineWidth = 0.7 + (i % 4 === 0 ? this.pulse * 2.4 : 0);
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + Math.cos(a) * length, fy + Math.sin(a) * length * 0.62); ctx.stroke();
    }
    // Seven copies of the trace fan out around the focal point. Each copy has
    // a slightly different phase and offset, so the screen reads as a bank of
    // oscilloscopes rather than one enlarged waveform.
    const oscillations = 7;
    const headIndex = Math.floor(((this.t * (0.19 + this.bass * 0.05)) % 1) * (this.trace.length - 1));
    for (let band = 0; band < oscillations; band++) {
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(band * TAU / oscillations + Math.sin(this.t * 0.3 + band) * 0.035);
      ctx.translate(-fx, -fy);
      const offset = (band - (oscillations - 1) / 2) * (5 + this.mid * 5);
      for (let i = 0; i < this.trace.length - 1; i++) {
        const p = this.trace[i]; const n = this.trace[i + 1];
        const wobble = Math.sin(this.t * (1.1 + band * 0.04) + p.u * TAU * 2.5 + band) * (2 + this.treble * 5);
        const fade = 0.06 + (1 - ((p.age + n.age) * 0.5)) * (0.38 + this.treble * 0.48);
        ctx.strokeStyle = rgba(this.palette[(i + band + 1) % this.palette.length], fade);
        ctx.lineWidth = 0.55 + (1 - p.age) * (1.35 + this.pulse * 2.2);
        ctx.beginPath(); ctx.moveTo(p.x, p.y + offset + wobble); ctx.lineTo(n.x, n.y + offset + wobble); ctx.stroke();
      }
      const head = this.trace[headIndex];
      this.glowDot(ctx, head.x, head.y + offset, 12 + this.treble * 10, this.palette[band % this.palette.length], 0.12 + this.pulse * 0.18);
      ctx.fillStyle = rgba('#ffffff', 0.42 + this.pulse * 0.42); ctx.beginPath(); ctx.arc(head.x, head.y + offset, 1.4 + this.pulse * 1.8, 0, TAU); ctx.fill();
      ctx.restore();
    }
    for (let i = 0; i < 5; i++) { ctx.strokeStyle = rgba(this.palette[(i + 2) % this.palette.length], 0.18 + this.mid * 0.1); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(fx, fy, 26 + i * 15 + this.pulse * 10, this.ringRotation + rotation * (i + 1), this.ringRotation + rotation * (i + 1) + 1.5); ctx.stroke(); }
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) { const alpha = p.life * (0.24 + this.treble * 0.85); ctx.strokeStyle = rgba(this.palette[Math.floor(p.hue * this.palette.length) % this.palette.length], alpha); ctx.lineWidth = 0.5 + p.z * (0.8 + this.pulse * 1.6); ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke(); }
    ctx.restore();
    this.drawDust(ctx, 1.25); this.modernFinish(ctx, 0.18);
  }
}

class ArcadeArtGallery extends BaseVisualiser {
  constructor(seed, track) {
    super(seed, track);
    this.name = VISUALISER_NAMES[12];
    // These are the same vector painters used by the game world, deliberately
    // drawn at a much larger logical size so their fine outlines and highlights
    // survive the screensaver's full-screen presentation.
    const props = [];
    // A full coin constellation: 66 individually phased, half-size coins,
    // each with its own orbit, turn, and occasional
    // starburst rather than behaving like a repeated texture.
    for (let i = 0; i < 66; i++) props.push(['coin', 10, 10, i % 3 === 0]);
    props.push(
      ['battery', 19, 22], ['battery', 21, 24], ['battery', 23, 26],
      ['cactusBig', 24, 28], ['snowmanBig', 24, 28], ['barrel', 24, 24],
      ['drone', 28, 18], ['buzzbird', 28, 18], ['cardboardMonster', 26, 21],
      ['icicle', 18, 29], ['printer', 25, 18], ['chair', 25, 21], ['trafficCone', 22, 28],
    );
    // Three differently sized copies of every pickup keep the reel focused on
    // the game's actual power-up language instead of a single repeated icon.
    for (const asset of ['capStar', 'capShield', 'capMagnet', 'capSpeed', 'capAirJump', 'capLowGrav', 'capUnpeel', 'capRelay']) {
      for (let version = 0; version < 3; version++) {
        const size = 19 + version * 2;
        props.push([asset, size, size, version === 0]);
      }
    }
    // The useful stuff gets an intentionally denser cluster than the novelty
    // props: batteries, shields and magnets should feel like the centrepiece
    // of an arcade collection, not one item among dozens of coins.
    for (let i = 0; i < 6; i++) {
      const size = 18 + (i % 3) * 3;
      props.push(['battery', size, size + 3, i % 2 === 0]);
      props.push(['capShield', size + 1, size + 1, i % 2 === 1]);
      props.push(['capMagnet', size + 1, size + 1, i % 2 === 0]);
    }
    this.artifacts = props.map(([asset, w, h, sparkle = false], i) => {
      const p = {
        asset, w, h, sparkle,
        angle: i * TAU / props.length + (this.rng.float() - 0.5) * 0.18,
        fieldX: clamp((i + 0.5) / props.length * W + (this.rng.float() - 0.5) * 90, 0, W),
        fieldY: 18 + this.rng.float() * (H - 36),
        // Some pieces live almost on the core display while others still make
        // wide fly-bys, giving the centre real depth instead of an empty hole.
        radius: i % 7 === 0
          ? 34 + this.rng.float() * 22
          : 62 + this.rng.float() * 101,
        orbitSpeed: (0.12 + this.rng.float() * 0.38) * (this.rng.float() < 0.5 ? -1 : 1),
        // 1.2–4.2 rad/s makes a complete 360° turn easy to read, while the
        // different signs and rates keep the gallery from marching in lockstep.
        spin: (1.2 + this.rng.float() * 3.0) * (this.rng.float() < 0.5 ? -1 : 1),
        phase: this.rng.float() * TAU,
        travelPhase: this.rng.float() * TAU,
        travelSpeed: 0.16 + this.rng.float() * 0.34,
        travel: 20 + this.rng.float() * 100,
        scaleRate: 0.5 + this.rng.float() * 1.35,
        // A gallery should feel curated in depth, not like every object was
        // stamped from one display card. Keep a real small-to-large spread
        // before the breathing and beat accents are applied.
        galleryScale: 0.52 + this.rng.float() * 1.35,
        hue: this.rng.float(),
        depth: 0.35 + this.rng.float() * 0.65,
      };
      p.baseRadius = p.radius;
      p.rotation = this.rng.float() * TAU;
      p.coinRain = asset === 'coin';
      if (p.coinRain) {
        p.rainX = this.rng.float() * W;
        p.rainY = -this.rng.float() * (H + 60);
        p.rainSpeed = 20 + this.rng.float() * 44;
        p.rainDrift = (this.rng.float() - 0.5) * 9;
        p.rainSpin = (0.7 + this.rng.float() * 6.1) * (this.rng.chance(0.5) ? -1 : 1);
        p.coinFlip = this.rng.float() * TAU;
        p.rotation = 0;
      }
      return p;
    });
    // Gary and Dolores own the periodic floor cameo below; keeping them out of
    // this rotating reel lets their entrance read as an event, not another
    // spinning gallery card.
    const heroIds = ['lorenzo', 'gnash', 'fernwick', 'b33p', 'clara', 'kiko', 'raymn', 'grumpos'];
    this.heroes = heroIds.map((heroId, i) => ({
      heroId,
      angle: i * TAU / heroIds.length + (this.rng.float() - 0.5) * 0.22,
      fieldX: clamp((i + 0.5) / heroIds.length * W + (this.rng.float() - 0.5) * 80, 0, W),
      fieldY: 24 + this.rng.float() * (H - 48),
      radius: i % 3 === 0
        ? 28 + this.rng.float() * 18
        : 55 + this.rng.float() * 72,
      orbitSpeed: (0.16 + this.rng.float() * 0.25) * (this.rng.float() < 0.5 ? -1 : 1),
      spin: (0.35 + this.rng.float() * 1.0) * (this.rng.float() < 0.5 ? -1 : 1),
      phase: this.rng.float() * TAU,
      travelPhase: this.rng.float() * TAU,
      travelSpeed: 0.14 + this.rng.float() * 0.25,
      travel: 18 + this.rng.float() * 48,
      scaleRate: 0.7 + this.rng.float() * 0.9,
      galleryScale: 0.48 + this.rng.float() * 1.8,
      animRate: 0.78 + this.rng.float() * 0.62,
      animClock: this.rng.float() * 5.6,
      hue: this.rng.float(),
    }));
    this.heroes.forEach((p) => { p.baseRadius = p.radius; p.rotation = this.rng.float() * TAU; });
    // The gallery remains a dark exhibition space, but its walls now open onto
    // a genuinely dense night sky. These stars are a field, not a central
    // nebula, so the art can still travel freely across the entire screen.
    this.galleryStars = makePool(240);
    for (const star of this.galleryStars) {
      star.x = this.rng.float() * W;
      star.y = this.rng.float() * (H - 12);
      star.radius = 0.28 + this.rng.float() * 1.35;
      star.phase = this.rng.float() * TAU;
      star.rate = 0.45 + this.rng.float() * 1.8;
      star.hue = this.rng.float();
      star.depth = 0.25 + this.rng.float() * 0.75;
    }
    this.galleryWorlds = [
      { x: 66, y: 57, r: 8, color: '#5ca8f5', shade: '#122b67', phase: 0.2, rate: 0.22, speed: 13 },
      { x: 406, y: 48, r: 10, color: '#d9dce6', shade: '#6e7180', phase: 1.7, rate: 0.17, speed: 9, moon: true },
      { x: 387, y: 188, r: 9, color: '#ee8a52', shade: '#6a2441', phase: 3.1, rate: 0.19, speed: 16, ring: true },
      { x: 148, y: 206, r: 7, color: '#c77cff', shade: '#3a155e', phase: 4.4, rate: 0.27, speed: 11 },
      { x: 250, y: 35, r: 6, color: '#72e7c8', shade: '#155b5b', phase: 5.3, rate: 0.31, speed: 18 },
    ];
    // A slow, shared drift keeps the background cast reading as one living
    // swarm crossing the exhibition space, while their own rings and poses
    // prevent them from ever marching in lockstep.
    this.heroSwarmPhase = this.rng.float() * TAU;
    this.heroSwarmX = 0;
    this.heroSwarmY = 0;
    this.galleryOrbitX = CX;
    this.galleryOrbitY = CY;
    this.floorTread = 0;
    // One staff cameo every eight 4/4 bars. It is deliberately a foreground
    // pass, separate from the orbiting cast, so the run reads as a little
    // stage-side performance along the bottom of the gallery.
    this.galleryRunner = {
      active: false,
      heroId: 'gary',
      direction: 1,
      x: -38,
      lift: 0,
      jumpPhase: 0,
      // Keep the much larger foreground rig visibly on the gallery floor,
      // rather than letting its shoes disappear behind the bottom crop.
      groundY: H - 16,
      size: 102,
      backgroundFade: 0,
      faceMode: 'focus',
    };
  }
  artGalleryBackdrop(ctx) {
    // A bespoke black-box exhibition space: no shared visualiser gradient,
    // no space tunnel, and no central nebula for the objects to orbit.
    ctx.fillStyle = '#030309';
    ctx.fillRect(0, 0, W, H);

    const room = ctx.createLinearGradient(0, 0, 0, H);
    room.addColorStop(0, 'rgba(22,20,38,0.48)');
    room.addColorStop(0.58, 'rgba(10,12,26,0.38)');
    room.addColorStop(1, 'rgba(1,2,7,0.9)');
    ctx.fillStyle = room;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const star of this.galleryStars) {
      const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(this.t * star.rate + star.phase));
      const color = this.palette[Math.floor(star.hue * this.palette.length) % this.palette.length];
      ctx.fillStyle = rgba(color, (0.16 + star.depth * 0.36) * twinkle);
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius * (0.72 + twinkle * 0.45), 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // A handful of off-centre worlds give the starfield depth without turning
    // it back into a nebula or a central orbiting composition.
    for (const world of this.galleryWorlds) {
      const x = world.x;
      const y = world.y + Math.cos(this.t * world.rate * 0.76 + world.phase) * 2;
      if (world.ring) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-0.24);
        ctx.strokeStyle = rgba('#ffd4a1', 0.54);
        ctx.lineWidth = 2.1;
        ctx.beginPath(); ctx.ellipse(0, 0, world.r * 1.72, world.r * 0.48, 0, 0, TAU); ctx.stroke();
        ctx.restore();
      }
      const g = ctx.createRadialGradient(x - world.r * 0.34, y - world.r * 0.38, world.r * 0.08, x, y, world.r * 1.08);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.18, world.color);
      g.addColorStop(0.68, world.color);
      g.addColorStop(1, world.shade);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, world.r, 0, TAU); ctx.fill();
      if (world.moon) {
        ctx.save();
        ctx.fillStyle = 'rgba(77,80,94,0.28)';
        for (let i = 0; i < 6; i++) {
          const a = world.phase + i * 1.72;
          ctx.beginPath();
          ctx.arc(x + Math.cos(a) * world.r * 0.48, y + Math.sin(a) * world.r * 0.42,
            2 + (i % 3) * 1.5, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // A low, receding gallery floor gives the objects a sense of scale and
    // depth without becoming another grid-based visualiser.
    const floorY = H * 0.77;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(151,132,205,0.13)';
    ctx.lineWidth = 0.7;
    // Fresh rails emerge at the horizon and expand toward the viewer, making
    // the gallery floor read as a slow perspective treadmill.
    for (let i = 0; i < 11; i++) {
      const p = (i / 11 + this.floorTread) % 1;
      const y = floorY + Math.pow(p, 1.65) * (H - floorY + 42);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    const vanishX = W * 0.5 + Math.sin(this.t * 0.18) * 24;
    for (let i = -6; i <= 6; i++) {
      ctx.beginPath();
      ctx.moveTo(vanishX + i * 13, floorY);
      ctx.lineTo(vanishX + i * 86, H + 12);
      ctx.stroke();
    }
    ctx.restore();

  }
  update(dt, a) {
    super.update(dt, a);
    this.heroSwarmX = Math.sin(this.t * 0.23 + this.heroSwarmPhase) * 58
      + Math.sin(this.t * 0.47 + this.heroSwarmPhase * 1.7) * 22;
    this.heroSwarmY = Math.cos(this.t * 0.19 + this.heroSwarmPhase * 0.8) * 38
      + Math.sin(this.t * 0.39 + this.heroSwarmPhase) * 16;
    // The old gallery's lively orbital choreography remains, but its centre
    // is now invisible and slowly traverses the room rather than being drawn
    // as a nebula. Props and cast therefore move as a coherent roaming swarm.
    this.galleryOrbitX = CX + this.heroSwarmX;
    this.galleryOrbitY = CY + this.heroSwarmY;
    this.floorTread = (this.floorTread + dt * (0.16 + this.bass * 0.12)) % 1;
    // 32 beats is eight 4/4 bars. The runner gets two bars to cross, then the
    // gallery breathes for six before the next staff member enters.
    const runnerCycle = Math.floor(this.beat / 32);
    const runnerBeat = ((this.beat % 32) + 32) % 32;
    const runner = this.galleryRunner;
    runner.active = runnerBeat < 8;
    runner.heroId = runnerCycle % 2 ? 'dolores' : 'gary';
    runner.direction = runnerCycle % 2 ? -1 : 1;
    // One restrained expression change per full crossing: Gary warms into a
    // smile, while Dolores' patience runs out halfway across the gallery.
    const secondHalf = runnerBeat >= 4;
    runner.faceMode = runner.heroId === 'gary'
      ? (secondHalf ? 'joy' : 'focus')
      : (secondHalf ? 'annoyed' : 'focus');
    if (runner.active) {
      // Ease the rest of the gallery down only while the staff cameo is in
      // view, then restore it before the next six-bar gap.
      const enter = smooth(clamp(runnerBeat / 0.7));
      const leave = smooth(clamp((8 - runnerBeat) / 0.7));
      runner.backgroundFade = Math.min(enter, leave);
      const cross = clamp(runnerBeat / 8);
      runner.x = runner.direction > 0
        ? -38 + (W + 76) * cross
        : W + 38 - (W + 76) * cross;
      runner.jumpPhase = clamp(this.beatPhase);
      runner.lift = Math.sin(runner.jumpPhase * Math.PI) * 23;
    } else runner.backgroundFade = 0;
    for (const p of this.artifacts) {
      if (p.coinRain) {
        p.rainY += dt * p.rainSpeed * (0.82 + this.bass * 0.32);
        p.rainX += dt * p.rainDrift + Math.sin(this.t * 0.8 + p.phase) * dt * 3;
        if (p.rainY > H + p.h) {
          p.rainY = -p.h - this.rng.float() * 45;
          p.rainX = this.rng.float() * W;
        }
        if (p.rainX < -p.w) p.rainX = W + p.w;
        else if (p.rainX > W + p.w) p.rainX = -p.w;
        p.coinFlip += dt * p.rainSpin * (0.8 + this.treble * 0.35);
        p.rotation = 0;
        continue;
      }
      p.angle += dt * p.orbitSpeed * (0.7 + this.mid * 0.8);
      const travel = 0.5 + 0.5 * Math.sin(this.t * p.travelSpeed + p.travelPhase);
      // The outer half of the cycle deliberately pushes art beyond the frame,
      // then reels it back into the gallery like a deep-space fly-by.
      p.radius = p.baseRadius + travel * p.travel + this.beatPulse * (3 + p.depth * 5);
      p.rotation += dt * p.spin * (0.82 + this.treble * 1.25 + this.beatPulse * 0.08);
    }
    for (const p of this.heroes) {
      p.angle += dt * p.orbitSpeed * (0.8 + this.mid * 0.65);
      const travel = 0.5 + 0.5 * Math.sin(this.t * p.travelSpeed + p.travelPhase);
      p.radius = p.baseRadius + travel * p.travel + this.beatPulse * 3;
      p.rotation += dt * p.spin * (0.72 + this.treble * 0.85);
      // Every cast member runs a little looping animation clip. The clip
      // changes pose over time instead of ever falling back to a cached stand
      // image: run -> jump -> duck -> celebrate, then back to run.
      p.animClock += dt * p.animRate * (1 + this.mid * 0.16 + this.beatPulse * 0.03);
    }
    // Distant worlds are coin-sized details that continuously cross the room;
    // on exiting they re-enter at a new height rather than sitting as large,
    // fixed background illustrations.
    for (const world of this.galleryWorlds) {
      world.x += dt * world.speed * (0.8 + this.mid * 0.25);
      if (world.x > W + world.r) {
        world.x = -world.r;
        world.y = 18 + this.rng.float() * (H - 54);
      }
    }
  }
  draw(ctx) {
    this.artGalleryBackdrop(ctx);
    const pulse = this.beatPulse;

    // The shared centre is intentionally invisible: it restores the lively
    // orbital movement without putting a nebula or other centre graphic back.
    for (const p of this.artifacts) {
      if (!hasProp(p.asset)) continue;
      const x = p.coinRain ? p.rainX : clamp(this.galleryOrbitX + Math.cos(p.angle) * p.radius, -p.w, W + p.w);
      const y = p.coinRain ? p.rainY : clamp(this.galleryOrbitY + Math.sin(p.angle) * p.radius * 0.72, -p.h, H + p.h);
      const breathe = 0.82 + 0.18 * Math.sin(this.t * p.scaleRate + p.phase) + pulse * 0.07;
      const scale = p.galleryScale * (0.78 + p.depth * 0.3) * breathe;
      // A cosine-width squash sells a full spatial turn without needing a
      // second raster: the icon narrows toward edge-on, then opens again.
      const turnWidth = p.coinRain
        ? 0.16 + 0.84 * Math.abs(Math.cos(p.coinFlip))
        : 0.42 + 0.58 * Math.abs(Math.cos(p.rotation));
      const frameCount = propFrames(p.asset);
      const frame = Math.floor(this.t * propFps(p.asset) + p.phase * 2) % frameCount;
      const color = this.palette[Math.floor(p.hue * this.palette.length) % this.palette.length];
      this.glowDot(ctx, x, y, Math.max(p.w, p.h) * p.galleryScale * (0.62 + pulse * 0.18), color,
        0.06 + p.depth * 0.07);
      ctx.save();
      // The art itself stays opaque; the cameo uses one foreground overlay
      // below, so all gallery content fades together rather than turning into
      // individually translucent sprites.
      ctx.globalAlpha = this.frameAlpha;
      ctx.translate(x, y);
      ctx.rotate(p.coinRain ? 0 : p.rotation);
      ctx.scale(scale * turnWidth, scale);
      drawProp(ctx, p.asset, -p.w / 2, -p.h / 2, p.w, p.h, frame);
      ctx.restore();
      if (p.sparkle && (pulse > 0.58 || Math.sin(this.t * 3.4 + p.phase) > 0.72)) {
        const star = 2.5 + pulse * 3.5;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(x, y);
        ctx.rotate(-p.rotation * 0.7);
        ctx.strokeStyle = rgba('#fff9c7', 0.45 + pulse * 0.5);
        ctx.lineWidth = 0.7 + pulse * 0.8;
        ctx.lineCap = 'round';
        for (let ray = 0; ray < 4; ray++) {
          const a = ray * Math.PI / 2 + this.t * 0.8;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * star * 0.35, Math.sin(a) * star * 0.35);
          ctx.lineTo(Math.cos(a) * star, Math.sin(a) * star);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // The main cast roams independently behind the staff cameo.
    for (let i = 0; i < this.heroes.length; i++) {
      const p = this.heroes[i];
      const h = (25 + this.mid * 5 + (i % 3) * 1.5) * p.galleryScale;
      const x = clamp(this.galleryOrbitX + Math.cos(p.angle) * p.radius, -h * 0.3, W + h * 0.3);
      const y = clamp(this.galleryOrbitY + Math.sin(p.angle) * p.radius * 0.7, h * 0.32, H - 6);
      const heroScale = 0.88 + 0.14 * Math.sin(this.t * p.scaleRate + p.phase) + pulse * 0.04;
      const heroTurn = 0.58 + 0.42 * Math.abs(Math.cos(p.rotation));
      const clip = p.animClock % 5.6;
      const kind = clip < 2.8 ? 'run' : clip < 3.8 ? 'jump' : clip < 4.6 ? 'duck' : 'celebrate';
      const phase = (p.animClock * (1.2 + i * 0.07) + p.phase / TAU) % 1;
      const pose = {
        kind,
        phase,
        time: p.animClock + p.phase,
        grounded: kind !== 'jump',
        vy: kind === 'jump' ? Math.sin(p.animClock * 2.1 + p.phase) * 260 : 0,
        duckAmount: kind === 'duck' ? 0.8 + 0.2 * Math.sin(p.animClock * 3 + p.phase) : 0,
        // Celebration rigs use the same full-body motion as the cast reel;
        // explicitly select the reworked style so none of the poses are static.
        celebrateStyle: kind === 'celebrate' ? 'reworked' : undefined,
        facing: i % 2 ? -1 : 1,
      };
      p.poseKind = kind;
      p.posePhase = phase;
      const color = this.palette[Math.floor(p.hue * this.palette.length) % this.palette.length];
      this.glowDot(ctx, x, y - h * 0.22, h * 0.78, color,
        0.07 + pulse * 0.08);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(p.rotation);
      ctx.scale(heroScale * heroTurn, heroScale);
      drawToon(ctx, p.heroId, pose, 0, h * 0.42, h, {
        alpha: 1,
      });
      ctx.restore();
    }

    // Keep the entire gallery reel solid at rest.  When Gary or Dolores
    // arrives, this single eased black veil only takes the edge off the
    // backdrop, props, heroes, and highlights as one layer. The runner's own
    // brighter floor glow does the real foreground separation.
    const runner = this.galleryRunner;
    if (runner.backgroundFade > 0) {
      ctx.save();
      ctx.fillStyle = rgba('#030713', runner.backgroundFade * 0.22);
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // Gary and Dolores take turns in a proper floor-level run, jumping on each
    // beat. This is drawn last among the gallery figures so the cameo remains
    // legible against the dense art reel behind it.
    if (runner.active) {
      const feetY = runner.groundY - runner.lift;
      const rising = runner.jumpPhase < 0.5;
      const runTime = this.beat * 0.5;
      this.glowDot(ctx, runner.x, runner.groundY - 3, 72, runner.heroId === 'gary' ? '#ff7b5c' : '#63f3ff', 0.46 + pulse * 0.2);
      drawToon(ctx, runner.heroId, {
        kind: runner.lift > 1 ? 'jump' : 'run',
        phase: (this.beat * 0.5) % 1,
        time: runTime,
        grounded: runner.lift <= 1,
        vy: (rising ? -1 : 1) * (130 + runner.lift * 11),
        facing: runner.direction,
        faceJoy: runner.faceMode === 'joy',
        faceSurprised: false,
        annoyed: runner.faceMode === 'annoyed' ? 0.85 : 0,
        madStyle: Math.floor(this.beat / 4) % 4,
      }, runner.x, feetY, runner.size, { alpha: 0.7 + runner.backgroundFade * 0.3 });
    }

    this.drawDust(ctx, 1.05);
    this.modernFinish(ctx, 0.15);
  }
}

// A dedicated flight deck for the game's animated appliance prop. This scene
// deliberately has its own silhouette language (runway lights, launch rails,
// and a deep blue hangar wash) so the toasters feel like a new visualiser, not
// another pass over an existing preset's background.
class ToasterSkyParade extends BaseVisualiser {
  constructor(seed, track) {
    super(seed, track);
    this.name = VISUALISER_NAMES[13];
    this.toasters = makePool(72);
    for (const p of this.toasters) this.resetToaster(p, true);
    // Opening beat: one larger hero toaster makes the first pass and loop,
    // then the rest of the flock is released in a staggered swarm behind it.
    const configureIntroToaster = (p, { delay, y, scale, speed, loopStart, loopRadius, lead = false }) => {
      p.introLead = lead;
      p.introChoreo = true;
      p.entryDelay = delay;
      p.x = -52;
      p.baseY = y;
      p.y = y;
      p.speed = speed;
      p.scale = scale;
      p.bob = 0;
      p.loopEligible = false;
      p.rollCycle = 999;
      p.rollOffset = p.rollDuration;
      p.introLoopStart = loopStart;
      p.introLoopDuration = lead ? 2.15 : 1.55;
      p.introLoopRadius = loopRadius;
    };
    configureIntroToaster(this.toasters[0], {
      delay: 0, y: H * 0.52, scale: 2.15, speed: 132, loopStart: 1.25, loopRadius: 50, lead: true,
    });
    configureIntroToaster(this.toasters[1], {
      delay: 3.45, y: H * 0.34, scale: 1.55, speed: 118, loopStart: 4.15, loopRadius: 35,
    });
    configureIntroToaster(this.toasters[2], {
      delay: 4.85, y: H * 0.67, scale: 1.78, speed: 124, loopStart: 5.75, loopRadius: 39,
    });
    for (let i = 3; i < this.toasters.length; i++) {
      const p = this.toasters[i];
      // A quick succession of small waves makes the flock build after the
      // three intro loops instead of snapping onto the screen all at once.
      p.entryDelay = 7.3 + (i - 3) / (this.toasters.length - 3) * 3.7 + this.rng.float() * 0.18;
      p.x = -55 - this.rng.float() * 90;
    }
    this.specialToasterTimer = 10 + this.rng.float() * 5;
    this.specialToasterColor = 0;
    this.skyParticles = makePool(220);
    for (const p of this.skyParticles) this.resetSkyParticle(p, true);
  }

  resetToaster(p, initial = false) {
    p.x = initial ? -70 + this.rng.float() * (W + 150) : -55 - this.rng.float() * 125;
    p.baseY = 22 + this.rng.float() * (H - 67);
    p.speed = 32 + this.rng.float() * 76;
    p.scale = 0.55 + this.rng.float() * 1.55;
    p.bob = 3 + this.rng.float() * (7 + this.mid * 9);
    p.bobRate = 0.8 + this.rng.float() * 1.9;
    p.phase = this.rng.float() * TAU;
    // Toasters enter upright. Their full spatial rolls are scheduled as rare,
    // staggered stunts instead of becoming a permanently rotating cloud.
    p.rotation = 0;
    p.rollCycle = 6.2 + this.rng.float() * 6.5;
    p.rollDuration = 0.82 + this.rng.float() * 0.62;
    p.rollOffset = p.rollDuration + this.rng.float() * (p.rollCycle - p.rollDuration);
    p.rollDirection = -1;
    p.rollActive = false;
    // A sparse second stunt: these few toasters fly an actual loop-the-loop
    // through the hangar rather than only rolling on their forward path.
    p.loopEligible = this.rng.chance(0.12);
    p.loopCycle = 8.5 + this.rng.float() * 6.5;
    p.loopDuration = 1.15 + this.rng.float() * 0.55;
    p.loopOffset = p.loopDuration + this.rng.float() * (p.loopCycle - p.loopDuration);
    p.loopRadius = 20 + this.rng.float() * 26;
    p.loopDirection = -1;
    p.loopActive = false;
    p.loopEver = false;
    p.drawX = p.x;
    p.drawY = p.baseY;
    p.depth = 0.25 + this.rng.float() * 0.75;
    p.hue = this.rng.float();
    p.framePhase = this.rng.float() * 96;
    // The wing flap stays continuous, but toast launches are rare individual
    // events so the sky is not filled with permanently raised slices.
    p.hasToast = this.rng.chance(0.2);
    p.toastCycle = 2.4 + this.rng.float() * 8.6;
    p.toastDuration = 0.55 + this.rng.float() * 1.8;
    p.toastOffset = this.rng.float() * p.toastCycle;
    p.toastPopping = false;
    p.toastBand = p.hasToast ? 0 : 3; // raised slice, or the painter's hidden phase
    p.specialColor = null;
    p.specialFinish = null;
    p.introLead = false;
    p.introChoreo = false;
    p.introLoopStart = Infinity;
    p.introLoopDuration = 0;
    p.introLoopRadius = 0;
    p.entryDelay = 0;
  }

  launchSpecialToaster() {
    // Reuse one of the flock as a fresh left-edge launch.  This guarantees an
    // unmistakable single special toaster instead of quietly colouring a few
    // ordinary ones already in the air.
    const launchable = this.toasters.filter((p) => !p.introLead && p.entryDelay <= 0);
    let p = launchable[0] || this.toasters.find((p) => !p.introLead) || this.toasters[0];
    for (const candidate of launchable) if (candidate.x > p.x) p = candidate;
    this.resetToaster(p);
    p.specialFinish = SPECIAL_TOASTER_FINISHES[this.specialToasterColor++ % SPECIAL_TOASTER_FINISHES.length];
    p.specialColor = p.specialFinish.id;
  }

  drawAppliance(ctx, p, frame) {
    if (p.specialFinish) drawApplianceFinish(ctx, -12.5, -10.5, 25, 21, frame, p.specialFinish);
    else drawProp(ctx, 'appliance', -12.5, -10.5, 25, 21, frame);
  }

  resetSkyParticle(p, initial = false) {
    p.x = initial ? this.rng.float() * (W + 20) : -8 - this.rng.float() * 30;
    p.y = 10 + this.rng.float() * (H - 30);
    p.px = p.x;
    p.py = p.y;
    p.vx = 20 + this.rng.float() * 80;
    p.vy = (this.rng.float() - 0.5) * 8;
    p.size = 0.35 + this.rng.float() * 1.7;
    p.life = p.maxLife = 0.5 + this.rng.float() * 2.4;
    p.hue = this.rng.float();
    p.z = 0.2 + this.rng.float() * 0.8;
  }

  toasterBackdrop(ctx) {
    const schemeT = (this.t * 0.055) % TOASTER_SKY_SCHEMES.length;
    const schemeIndex = Math.floor(schemeT);
    const blend = smooth(schemeT - schemeIndex);
    const from = TOASTER_SKY_SCHEMES[schemeIndex];
    const to = TOASTER_SKY_SCHEMES[(schemeIndex + 1) % TOASTER_SKY_SCHEMES.length];
    const top = mixHex(from.top, to.top, blend);
    const mid = mixHex(from.mid, to.mid, blend);
    const bottom = mixHex(from.bottom, to.bottom, blend);
    const accent = mixHex(from.accent, to.accent, blend);
    ctx.fillStyle = bottom;
    ctx.fillRect(0, 0, W, H);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, top);
    sky.addColorStop(0.52, mid);
    sky.addColorStop(1, bottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    const horizon = H * 0.66 + Math.sin(this.t * 0.23) * 3;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const wash = ctx.createRadialGradient(CX, horizon, 3, CX, horizon, 270);
    wash.addColorStop(0, rgba(accent, 0.14 + this.bass * 0.12));
    wash.addColorStop(0.45, rgba(accent, 0.045 + this.mid * 0.03));
    wash.addColorStop(1, rgba('#000000', 0));
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, W, H);

    // Parallel launch rails and moving runway dashes establish left-to-right
    // travel without borrowing the grid or horizon treatment of other presets.
    ctx.strokeStyle = rgba(accent, 0.16 + this.bass * 0.08);
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = 30 + i * 43 + Math.sin(this.t * (0.2 + i * 0.03)) * 2;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    for (let i = -1; i < 18; i++) {
      const x = ((i * 43 + this.t * (26 + this.bass * 35)) % (W + 70)) - 35;
      const y = horizon + ((i * 17) % 40) - 20;
      ctx.strokeStyle = rgba(accent, 0.1 + this.beatPulse * 0.16);
      ctx.lineWidth = 0.7 + this.beatPulse * 0.8;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 16 + this.bass * 14, y); ctx.stroke();
    }
    ctx.restore();

    // Suspended cables make the upper third read as a hangar ceiling.
    ctx.save();
    ctx.strokeStyle = 'rgba(112,166,210,0.17)';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 6; i++) {
      const x = i * 100 - 40;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.quadraticCurveTo(x + 28, 26 + i * 2, x + 74, 44 + Math.sin(this.t * 0.4 + i) * 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  update(dt, a) {
    super.update(dt, a);
    this.specialToasterTimer -= dt;
    if (this.specialToasterTimer <= 0) {
      if (this.toasters.some((p) => p.specialColor)) {
        // Hold the next launch until the current special has flown off.
        this.specialToasterTimer = 1;
      } else {
        this.launchSpecialToaster();
        this.specialToasterTimer = 12 + this.rng.float() * 8;
      }
    }
    for (const p of this.toasters) {
      if (p.entryDelay > 0) {
        p.entryDelay = Math.max(0, p.entryDelay - dt);
        if (p.entryDelay > 0) continue;
      }
      p.x += dt * p.speed * (0.78 + this.bass * 0.45 + this.beatPulse * 0.08);
      if (p.x > W + 72) this.resetToaster(p);
      p.y = p.baseY
        + Math.sin(this.t * p.bobRate + p.phase) * p.bob
        - this.beatPulse * (3 + p.depth * 8);
      // The opening leader has a clean flight line; its loop supplies all of
      // the vertical motion, rather than reading as a bounce before or during
      // the stunt.
      if (p.introChoreo) p.y = p.baseY;
      const rollClock = (this.t + p.rollOffset) % p.rollCycle;
      if (rollClock < p.rollDuration) {
        p.rollActive = true;
        const rollT = smooth(rollClock / p.rollDuration);
        p.rotation = p.rollDirection * TAU * rollT;
      } else {
        p.rollActive = false;
        p.rotation = 0;
      }
      p.drawX = p.x;
      p.drawY = p.y;
      const loopClock = (this.t + p.loopOffset) % p.loopCycle;
      if (p.loopEligible && loopClock < p.loopDuration) {
        p.loopActive = true;
        p.loopEver = true;
        const loopT = smooth(loopClock / p.loopDuration);
        const loopAngle = TAU * loopT;
        p.drawX += p.loopDirection * (1 - Math.cos(loopAngle)) * p.loopRadius * 0.65;
        p.drawY -= Math.sin(loopAngle) * p.loopRadius;
        p.rotation = p.loopDirection * loopAngle;
      } else p.loopActive = false;
      // The opening lead gets one deliberately large loop, independent of the
      // later random stunt schedule, so the visualiser announces itself before
      // the swarm joins.
      const introLoopT = (this.t - p.introLoopStart) / p.introLoopDuration;
      if (p.introChoreo && introLoopT >= 0 && introLoopT < 1) {
        p.loopActive = true;
        p.loopEver = true;
        const loopAngle = TAU * smooth(introLoopT);
        // A real circular loop starts and ends on the same horizontal flight
        // line. It travels bottom -> right -> top -> left -> bottom, which is
        // anti-clockwise on screen, before returning to its forward path.
        p.drawX += Math.sin(loopAngle) * p.introLoopRadius;
        p.drawY += (Math.cos(loopAngle) - 1) * p.introLoopRadius;
        p.rotation = -loopAngle;
      }
      const toastClock = (this.t + p.toastOffset) % p.toastCycle;
      p.toastPopping = p.hasToast && toastClock < p.toastDuration;
      p.toastBand = p.toastPopping
        ? Math.min(7, Math.floor(toastClock / p.toastDuration * 8))
        : p.hasToast ? 0 : 3;
    }
    for (const p of this.skyParticles) {
      p.life -= dt * (0.36 + this.treble * 0.45);
      p.px = p.x; p.py = p.y;
      p.x += dt * p.vx * (0.72 + this.bass * 0.55);
      p.y += dt * (p.vy + Math.sin(this.t * 1.4 + p.hue * TAU) * 2);
      if (p.life <= 0 || p.x > W + 12) this.resetSkyParticle(p);
    }
  }

  draw(ctx) {
    this.toasterBackdrop(ctx);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // Fine particles are round, never square, and leave a short luminous wake.
    for (const p of this.skyParticles) {
      const alpha = clamp(p.life / p.maxLife) * (0.16 + this.treble * 0.54);
      const color = this.palette[Math.floor(p.hue * this.palette.length) % this.palette.length];
      ctx.strokeStyle = rgba(color, alpha * 0.55);
      ctx.lineWidth = p.size * 0.7;
      ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.fillStyle = rgba(color, alpha);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.65 + this.beatPulse * 0.5), 0, TAU); ctx.fill();
    }
    ctx.restore();

    for (const p of this.toasters) {
      if (p.entryDelay > 0) continue;
      const scale = p.scale * (0.95 + 0.09 * Math.sin(this.t * 1.8 + p.phase) + this.beatPulse * 0.16);
      const w = 25 * scale;
      const h = 21 * scale;
      // Appliance frames are interleaved as 12 wing poses x 8 toast poses.
      // Keep the wing pose on its ordinary 24fps clock while selecting a
      // toastless toasters use the concealed band; toast-bearing ones hold a
      // raised slice until their occasional pop sweeps through all eight poses.
      const wingFrame = Math.floor(this.t * propFps('appliance') + p.framePhase) % 12;
      const frame = wingFrame + p.toastBand * 12;
      const color = this.palette[Math.floor(p.hue * this.palette.length) % this.palette.length];
      // Four ghosted positions read as a trail while retaining crisp moving art.
      for (let trail = 4; trail >= 1; trail--) {
        const tx = p.drawX - p.speed * trail * 0.018;
        const ty = p.drawY + Math.sin(this.t * p.bobRate + p.phase - trail * 0.12) * p.bob * 0.18;
        ctx.save();
        ctx.globalAlpha = this.frameAlpha * (0.035 + this.beatPulse * 0.025) * (5 - trail) * (0.4 + p.depth * 0.6);
        ctx.translate(tx, ty);
        ctx.rotate(p.rotation * (1 - trail * 0.035));
        ctx.scale(scale * (1 - trail * 0.035), scale * (1 - trail * 0.035));
        this.drawAppliance(ctx, p, frame);
        ctx.restore();
      }
      this.glowDot(ctx, p.drawX, p.drawY, Math.max(w, h) * (0.65 + this.beatPulse * 0.25), color, 0.05 + p.depth * 0.07);
      ctx.save();
      ctx.globalAlpha = this.frameAlpha;
      ctx.translate(p.drawX, p.drawY);
      ctx.rotate(p.rotation);
      ctx.scale(scale, scale);
      this.drawAppliance(ctx, p, frame);
      ctx.restore();
    }
    this.drawDust(ctx, 0.75);
    this.modernFinish(ctx, 0.12);
  }
}

// The film's title sequence photographed its glyphs through a mirror, which is
// why the katakana read backwards. That mirroring is the one detail that
// separates this from "green letters falling", so the kana set is rasterized
// flipped and the readable latin set is kept upright beside it in the atlas.
const RAIN_KANA = 'ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ0123456789:.=*+-<>';
const RAIN_LATIN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ?!';
const RAIN_CELL_W = 12;
const RAIN_ROW_H = 12;
const RAIN_COLS = Math.ceil(W / RAIN_CELL_W);
const RAIN_ROWS = Math.ceil(H / RAIN_ROW_H) + 2;
// The atlas cell is wider than the layout cell: half-width katakana fall back
// to whatever font the platform has for them, and a wider glyph should overhang
// its column rather than get clipped at the raster edge.
const RAIN_BOX = 16;
const RAIN_FONT_PX = 14;
// The kana are a terminal face; the decoded words are the game speaking, so
// they come through in the marquee's own voice. Lilita One is wider than the
// mono at the same em, hence the smaller size — a decoded word should sit in
// the column, not shoulder its neighbours out of the way.
const RAIN_KANA_FONT = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const RAIN_WORD_PX = 12.5;
const RAIN_TIER_ALPHA = [0.62, 0.82, 0.94, 1];
const RAIN_WORDS = ['MASHENSTEIN', 'UNPLUGGENING', 'INSERT COIN', 'PLAYER ONE', 'FREE PLAY', 'HIGH SCORE', 'GAME OVER', 'WAKE UP'];
const rainAtlases = new Map();

// One raster for the whole preset, blitted per glyph. Per-frame fillText would
// re-rasterize ~500 vector outlines every frame; this is the same trade the
// menu text makes in sprites.js, for the same reason.
function rainAtlas(tiers, ss) {
  const key = `${ss}|${tiers.join(',')}`;
  const cached = rainAtlases.get(key);
  if (cached) return cached;
  const glyphs = RAIN_KANA + RAIN_LATIN;
  const cell = Math.ceil(RAIN_BOX * ss);
  const canvas = document.createElement('canvas');
  canvas.width = cell * glyphs.length;
  canvas.height = cell * tiers.length;
  const x = canvas.getContext('2d');
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  for (let tier = 0; tier < tiers.length; tier++) {
    x.fillStyle = tiers[tier];
    for (let i = 0; i < glyphs.length; i++) {
      const kana = i < RAIN_KANA.length;
      x.font = kana ? `${RAIN_FONT_PX * ss}px ${RAIN_KANA_FONT}` : `400 ${RAIN_WORD_PX * ss}px ${TITLE_FONT}`;
      x.save();
      x.translate(i * cell + cell / 2, tier * cell + cell / 2);
      if (kana) x.scale(-1, 1);
      x.fillText(glyphs[i], 0, 0);
      x.restore();
    }
  }
  // Seeded tone is snapped to a handful of steps, so this map holds a small
  // fixed set. The guard is only there for a density change mid-session.
  if (rainAtlases.size > 8) rainAtlases.clear();
  const atlas = { canvas, cell };
  rainAtlases.set(key, atlas);
  return atlas;
}

// The marquee face is a webfont that lands after first paint, so an atlas baked
// against the fallback has to go the moment the real face arrives — the same
// contract the menu glyph cache lives under.
onGameFontsChanged(() => rainAtlases.clear());

function rainLatinIndex(ch) {
  const at = RAIN_LATIN.indexOf(ch);
  return at < 0 ? -1 : RAIN_KANA.length + at;
}

class EmeraldCodeRain extends BaseVisualiser {
  constructor(seed, track) {
    super(seed, track);
    this.name = VISUALISER_NAMES[15];
    // The field only works monochrome, so the seeded palette is spent on which
    // green it is — emerald through jade — rather than on four hues. Snapped to
    // five steps so every seed shares one of five cached atlases.
    const tone = Math.floor(this.rng.float() * 5) / 4;
    this.tiers = [
      mixHex('#159442', '#0f9377', tone),
      mixHex('#2ae067', '#22ddad', tone),
      mixHex('#9dffc0', '#99ffe8', tone),
      mixHex('#e9fff0', '#e6fffb', tone),
    ];
    // Layout is seeded from the main stream; everything that churns per frame
    // draws from its own, so a replayed seed lays the columns out identically.
    this.rainRng = this.rng.stream('code-rain');
    this.grid = new Uint8Array(RAIN_COLS * RAIN_ROWS);
    for (let i = 0; i < this.grid.length; i++) this.grid[i] = this.rng.int(0, RAIN_KANA.length - 1);
    this.columns = Array.from({ length: RAIN_COLS }, (_, i) => {
      const c = { x: i * RAIN_CELL_W + RAIN_CELL_W / 2, flicker: this.rng.float() * TAU };
      this.resetColumn(c, this.rng);
      // Opening frame starts mid-fall so the screen is never empty on entry.
      c.head = this.rng.range(-RAIN_ROWS * 0.5, RAIN_ROWS);
      c.wait = this.rng.range(0, 0.35);
      return c;
    });
    this.mutateAcc = 0;
    this.lastPhrase = -1;
  }

  resetColumn(c, rng) {
    c.head = -rng.range(0, 8);
    c.speed = rng.range(7, 26);
    c.len = Math.round(rng.range(6, 22));
    c.depth = rng.range(0.45, 1);
    c.wait = rng.range(0, 0.8);
    c.word = null;
    c.spins = null;
    return c;
  }

  update(dt, a) {
    super.update(dt, a);
    const step = Math.max(0, dt);
    // Glyphs churn in place. Treble drives the rate, so hi-hats read as the
    // screen thinking rather than as one more brightness bump. The accumulator
    // is capped because a long dt (a tab regaining focus) should not spend a
    // frame rewriting the whole grid.
    this.mutateAcc = Math.min(this.mutateAcc + step * (25 + this.treble * 220) * this.motion, 240);
    while (this.mutateAcc >= 1) {
      this.mutateAcc -= 1;
      this.grid[Math.floor(this.rainRng.float() * this.grid.length)] = this.rainRng.int(0, RAIN_KANA.length - 1);
    }
    // A section with no kit in it has a downbeat on paper and nothing playing
    // it, and a field that snaps to that grid anyway reads as marching to a beat
    // the listener cannot hear. With the drums out the columns go back to
    // drizzling in on their own timers, and fall into step again when the kit
    // comes back — which is the arrangement arriving, drawn.
    const downbeat = !this.drumless && Math.floor(this.beat) !== Math.floor(this.prevBeat);
    // Columns fall and glyphs churn at the song's own loudness, so a breakdown
    // leaves the screen legible and nearly still instead of racing through it.
    const fall = (0.5 + this.bass * 0.85 + this.pulse * 0.45) * this.motion;
    for (let i = 0; i < this.columns.length; i++) {
      const c = this.columns[i];
      if (c.wait > 0) {
        // A downbeat drops a share of the waiting columns in at once, so the
        // field visibly restarts on the beat instead of drizzling at random.
        if (downbeat && this.rainRng.chance(0.3)) c.wait = 0;
        else { c.wait -= step; continue; }
      }
      // Each column reads its own spectrum band, which makes the rain lean
      // with the mix without ever looking like a bar graph.
      const band = 0.7 + this.spectrumValue(this.analysis, i, RAIN_COLS) * 0.8;
      c.head += step * c.speed * fall * (c.word ? 0.45 : band);
      if (c.spins) this.spinLetters(c, step);
      if (c.head - c.len > RAIN_ROWS) this.resetColumn(c, this.rainRng);
    }
    // Every four bars, one column decodes out of the noise into a readable word
    // and falls slower than the rest. Seeded from the phrase index rather than
    // drawn live, so the same seed spells the same things in the same places.
    // A message is only special while it is alone, so a phrase whose predecessor
    // is still falling — long word, slow tempo — simply doesn't get one.
    const phrase = Math.floor(this.beat / 16);
    if (phrase !== this.lastPhrase && !this.columns.some((c) => c.word)) {
      this.lastPhrase = phrase;
      const word = RAIN_WORDS[((phrase * 7 + (this.seed >>> 11)) >>> 0) % RAIN_WORDS.length];
      const c = this.columns[((phrase * 11 + (this.seed >>> 5)) >>> 0) % this.columns.length];
      c.word = word;
      c.len = word.length;
      c.head = -this.rainRng.range(0, 3);
      c.speed = this.rainRng.range(9, 13);
      c.depth = 1;
      c.wait = 0;
      // One spin state per letter, staggered so the word never turns in unison.
      c.spins = Array.from({ length: word.length }, () => ({
        angle: 0,
        rate: 0,
        wait: this.rainRng.range(0.4, 5),
      }));
    }
  }

  // Letters in a decoded word turn on their own vertical axis now and then,
  // like a card on a string: the glyph narrows to an edge, shows its back, and
  // comes round again. One full turn per event rather than a continuous spin,
  // so the word stays readable most of the time.
  spinLetters(c, step) {
    for (const s of c.spins) {
      if (s.angle > 0) {
        s.angle += step * s.rate * (1 + this.pulse * 0.5);
        if (s.angle >= TAU) {
          s.angle = 0;
          s.wait = this.rainRng.range(1.2, 6);
        }
        continue;
      }
      s.wait -= step;
      if (s.wait > 0) continue;
      s.angle = 1e-4;
      s.rate = this.rainRng.range(4.5, 8.5);
    }
  }

  // The atlas is a pure function of (tone, density), so building it inside
  // draw() keeps the preset's no-state-in-draw contract that lets the video
  // tool render frame ranges in parallel workers.
  glyphAtlas(ctx) {
    if (typeof document === 'undefined') return null;
    // The context arrives pre-scaled to device pixels — by screen.px in the
    // game, by the output ratio in tools/render-video.js, which never runs a
    // resize. Reading the transform covers both; otherwise a 1080p render
    // would blit a 2x raster into a 4x frame and only the glyphs would be soft.
    let density = screen.px || 1;
    if (typeof ctx.getTransform === 'function') {
      const m = ctx.getTransform();
      if (m && Number.isFinite(m.a) && Number.isFinite(m.b)) density = Math.max(density, Math.hypot(m.a, m.b));
    }
    return rainAtlas(this.tiers, Math.max(2, Math.min(8, Math.ceil(density * 1.25))));
  }

  draw(ctx) {
    this.backdrop(ctx, '#000406', '#010b06');
    const atlas = this.glyphAtlas(ctx);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // A slow wash on the drifting focal point, so a flat grid still has a
    // centre of gravity, plus a scan band that sweeps a bar at a time.
    this.glowDot(ctx, this.focusX, this.focusY, 130 + this.bass * 70, this.tiers[1], 0.045 + this.pulse * 0.06);
    const scanY = ((this.beat / 16) % 1) * (H + 80) - 40;
    const scan = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
    scan.addColorStop(0, rgba(this.tiers[1], 0));
    scan.addColorStop(0.5, rgba(this.tiers[1], 0.03 + this.mid * 0.03));
    scan.addColorStop(1, rgba(this.tiers[1], 0));
    ctx.fillStyle = scan;
    ctx.fillRect(0, scanY - 30, W, 60);
    if (atlas) {
      for (let i = 0; i < this.columns.length; i++) {
        const c = this.columns[i];
        if (c.wait > 0) continue;
        const headRow = Math.floor(c.head);
        // Per-column flicker and a soft falloff away from the focal point stop
        // forty identical columns from reading as wallpaper.
        const flicker = 0.84 + Math.sin(this.flow * 7.3 + c.flicker) * 0.16;
        const near = 1 - clamp(Math.abs(c.x - this.focusX) / W) * 0.4;
        const lit = c.depth * flicker * near * clamp(0.86 + this.treble * 0.3 + this.pulse * 0.16, 0, 1.15);
        for (let trail = 0; trail < c.len; trail++) {
          const row = headRow - trail;
          if (row < 0 || row * RAIN_ROW_H > H + RAIN_ROW_H) continue;
          let glyph;
          if (c.word) {
            // The word reads downward as it falls, so the head carries its
            // last letter and the tail its first.
            glyph = rainLatinIndex(c.word[c.len - 1 - trail]);
            if (glyph < 0) continue;
          } else {
            glyph = this.grid[(((row % RAIN_ROWS) + RAIN_ROWS) % RAIN_ROWS) * RAIN_COLS + i];
          }
          // A message holds its brightness the length of the word; ordinary
          // trails fall away fast, which is what gives the field its depth.
          const fade = c.word ? 1 - trail / (c.len * 2.4) : Math.pow(1 - trail / c.len, 1.35);
          const tier = trail === 0 ? 3 : trail < 2 ? 2 : trail < 5 ? 1 : 0;
          const y = row * RAIN_ROW_H + RAIN_ROW_H * 0.5;
          ctx.globalAlpha = this.frameAlpha * clamp(fade * lit * RAIN_TIER_ALPHA[tier]);
          // A turning letter is the same blit squeezed on x by the cosine of
          // its angle, which is what a flat card rotating about a vertical axis
          // actually projects to. Edge-on it vanishes; past that it reads
          // reversed, exactly as the back of the card would.
          const turn = c.spins ? c.spins[c.len - 1 - trail].angle : 0;
          if (turn > 0) {
            const face = Math.cos(turn);
            ctx.save();
            ctx.translate(c.x, y);
            ctx.scale(face, 1);
            // The edge of a turning card catches the light for an instant.
            ctx.globalAlpha = clamp(ctx.globalAlpha * (1 + (1 - Math.abs(face)) * 0.8));
            ctx.drawImage(atlas.canvas, glyph * atlas.cell, tier * atlas.cell, atlas.cell, atlas.cell,
              -RAIN_BOX * 0.5, -RAIN_BOX * 0.5, RAIN_BOX, RAIN_BOX);
            ctx.restore();
          } else {
            ctx.drawImage(atlas.canvas, glyph * atlas.cell, tier * atlas.cell, atlas.cell, atlas.cell,
              c.x - RAIN_BOX * 0.5, y - RAIN_BOX * 0.5, RAIN_BOX, RAIN_BOX);
          }
          if (trail === 0) {
            ctx.globalAlpha = this.frameAlpha;
            this.glowDot(ctx, c.x, y, 8 + this.pulse * 5, this.tiers[2], 0.22 * lit);
          }
        }
      }
      ctx.globalAlpha = this.frameAlpha;
    }
    // The shared dust is palette-coloured, which would put pink and gold motes
    // in a field that only works in one hue. Same pool, one green.
    for (const p of this.dust) {
      ctx.fillStyle = rgba(this.tiers[p.z > 0.7 ? 2 : 1], p.life * (0.05 + this.treble * 0.14));
      ctx.fillRect(p.x, p.y, 1, 1 + p.z);
    }
    ctx.restore();
    this.modernFinish(ctx, 0.3);
  }
}

// The one genuinely per-pixel preset in the pack: a real escape-time Julia set,
// re-solved every frame. The field is two thirds of the logical canvas and gets
// scaled up on composite. That is not a shortcut for its own sake — measured on
// a 2x screen, this size costs 6.4ms a frame and the full 480x270 costs 11.9ms,
// which is 71% of a 60fps budget for one preset, and the megamix can put a
// second preset in the same frame.
//
// What the magnification costs is structure, not just sharpness: at this size
// the finest filigree is never computed rather than computed and blurred. That
// is the trade, and it is a real one — see the composite blit in draw(), which
// commits to it by turning smoothing off rather than half-hiding it.
const JULIA_W = 320;
const JULIA_H = 180;
// Complex-plane width of the view at zoom 1. Julia sets live inside |z| < 2, so
// this frames the whole thing before the dive starts.
const JULIA_VIEW = 3.0;
// Octaves per second, and how many of them one dive is worth. Deliberately a
// constant: the brief wants a fixed hypnotic plunge, so the mix bends it by a
// tenth at most and never drives it.
const JULIA_PLUNGE_RATE = 0.6;
const JULIA_PLUNGE_OCTAVES = 3.6;
const JULIA_BLEND_TIME = 0.85;
// Per-frame survival of the trail buffer. The higher figure is held through a
// layer change so the outgoing fractal lingers long enough to cross-fade.
const JULIA_TRAIL_FADE = 0.84;
const JULIA_BLEND_FADE = 0.94;
// What a settled pixel sums to once the geometric series of past frames has
// converged. The per-frame contribution is derived from the fade to hold this
// steady, because a fixed one does not: a fade of 0.84 sums to six times what
// the frame put in, which turns a field with any breadth to it into white paste.
const JULIA_TRAIL_GAIN = 1.8;
// Damped spring for the sub-bass twist. It has to be *stiff*: settled inside a
// quarter second, because four-on-the-floor at 124bpm is a kick every 0.48s and
// a spring slower than that never gets home before the next one. Measured at the
// original 1.25Hz the displacement simply accumulated and sat there — a
// permanent lean, not a snap. Damped to overshoot once on the way back, which is
// what reads as elastic rather than as a slider being dragged. Displacement is
// normalised to roughly ±1 and converted per frame into a real shift in c,
// against what the camera can survive at that depth.
const JULIA_SPRING = 500;
const JULIA_DAMP = 16;
const JULIA_WARP_LIMIT = 1.2;
const JULIA_BANDS = 3.1;
// Budgets for how far the geometry may slide under the camera, in field pixels:
// one for a full-force sub-bass twist, one for the idle wander. Both are turned
// into a shift in c per frame — see sensitivity().
const JULIA_TWIST_PIXELS = 52;
const JULIA_DRIFT_PIXELS = 9;
// Absolute ceiling on |δc| regardless of what the pixel budget allows. At zoom 1
// the camera can survive an enormous shove, but past about this the seed stops
// being the shape it was chosen for and every constant looks like the same blob.
const JULIA_TWIST_MAX = 0.075;
// How much of the frame a dive target should have filigree in, at depth. Well
// under half: the void is half the composition, and a target that fills more
// than this is in a thicket the field resolves as dust.
const JULIA_TARGET_FILL = 0.38;
// Iteration range. The floor sets how bold the filaments are — pushed higher and
// the field resolves structure finer than a pixel, which lands as dust rather
// than as crystal. The ceiling buys that detail back as the view narrows.
const JULIA_ITER_MIN = 46;
const JULIA_ITER_MAX = 78;
// Output gain, so a bright field still has headroom to accumulate additively in
// the trail buffer without clipping to flat white on the first frame.
const JULIA_GAIN = 1;
// c values chosen for the shapes the geometry has to make: interlocking
// seahorses, lightning dendrites, dense spiral shells. Small |c| gives a fat
// blobby set that looks like a lava lamp at every zoom level, so none are here.
const JULIA_SEEDS = [
  { r: -0.7269, i: 0.1889 },   // dendrite lightning
  { r: -0.75, i: 0.1085 },     // seahorse valley
  { r: -0.8, i: 0.156 },       // thick seahorse tails
  { r: 0.285, i: 0.01 },       // near-Siegel spiral shells
  { r: -0.70176, i: -0.3842 }, // interlocking spirals
  { r: -0.835, i: -0.2321 },   // fine crystalline filigree
  { r: -0.1, i: 0.651 },       // Douady rabbit ears
  { r: 0.355, i: 0.355 },      // twisted galaxy arms
];
const ACID_HEX = ['#00ff00', '#00ffff', '#7c28ff', '#ff00ff'];
const ACID_RAMP = ACID_HEX.map((hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
});
const LOG2E = Math.LOG2E;

class AcidJuliaDive extends BaseVisualiser {
  constructor(seed, track) {
    super(seed, track);
    this.name = VISUALISER_NAMES[16];
    // The acid ramp is the whole point of the preset, so the shared dust and the
    // core glow take it instead of a seeded pack palette.
    this.palette = ACID_HEX;
    // Structure is seeded from its own stream; per-frame jitter has another, so
    // a replayed seed dives through the same fractal regardless of frame rate.
    this.juliaRng = this.rng.stream('julia');
    this.acidRng = this.rng.stream('julia-acid');
    const pick = this.juliaRng.pick(JULIA_SEEDS);
    this.cBase = { r: pick.r, i: pick.i };
    this.driftPhase = this.juliaRng.float() * TAU;
    this.driftRate = 0.06 + this.juliaRng.float() * 0.05;
    this.warp = 0;
    this.warpVel = 0;
    this.warpAngle = this.juliaRng.float() * TAU;
    this.zoomLog = 0;
    this.center = this.pickCenter();
    this.blend = 1;
    this.hueShift = this.juliaRng.float();
    this.flash = 0;
    this.flashSwap = 0;
    this.whiteHeat = 0;
    this.bassEnv = 0.25;
    this.trebleEnv = 0.15;
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.lut = new Uint8Array(512 * 3);
    this.buffers = null;
    this.buffersTried = false;
    this.renderedT = -1;
  }

  // A point on the Julia set itself, found by inverse iteration: z -> ±sqrt(z-c)
  // is attracted to the boundary from almost any start. Aiming the dive at a
  // boundary point is what keeps fresh filigree arriving forever — aim at the
  // interior or the exterior and a few seconds in the screen is flat colour.
  boundaryPoint() {
    const c = this.cBase;
    let zr = this.juliaRng.range(-1, 1);
    let zi = this.juliaRng.range(-1, 1);
    for (let n = 0; n < 48; n++) {
      const dr = zr - c.r;
      const di = zi - c.i;
      const m = Math.hypot(dr, di);
      let sr = Math.sqrt(Math.max(0, (m + dr) * 0.5));
      let si = Math.sqrt(Math.max(0, (m - dr) * 0.5));
      if (di < 0) si = -si;
      // Which of the two roots is taken is the random walk. Both land on the
      // set, so the choice picks *where* on it rather than whether.
      if (this.juliaRng.chance(0.5)) { sr = -sr; si = -si; }
      zr = sr; zi = si;
    }
    return { x: zr, y: zi };
  }

  // Distance from a point to the set, in field pixels. Same estimate the kernel
  // makes; kept separate and out of line because the kernel's copy is the
  // hottest loop in the pack and should not be paying for a call per pixel.
  boundaryPixels(zr, zi, cr, ci, maxIter, perPixel) {
    let zr2 = zr * zr;
    let zi2 = zi * zi;
    let er = 1;
    let ei = 0;
    let n = 0;
    while (n < maxIter && zr2 + zi2 < 256) {
      const ndr = 2 * (zr * er - zi * ei);
      ei = 2 * (zr * ei + zi * er);
      er = ndr;
      zi = 2 * zr * zi + ci;
      zr = zr2 - zi2 + cr;
      zr2 = zr * zr;
      zi2 = zi * zi;
      n++;
    }
    if (n >= maxIter) return Infinity; // inside the set: black, same as far away
    const mod = Math.sqrt(zr2 + zi2);
    const grad = Math.sqrt(er * er + ei * ei);
    return grad > 1e-12 ? mod * Math.log(mod) / grad * perPixel : Infinity;
  }

  // Fraction of a coarse grid across the frame that would have a lit filament in
  // it, at the given depth.
  litFraction(x, y, zoom) {
    const scale = JULIA_VIEW / JULIA_W / zoom;
    const perPixel = 1 / scale;
    const stepX = scale * (JULIA_W / 12);
    const stepY = scale * (JULIA_H / 8);
    let lit = 0;
    for (let sy = -4; sy <= 4; sy++) {
      for (let sx = -6; sx <= 6; sx++) {
        if (this.boundaryPixels(x + sx * stepX, y + sy * stepY, this.cBase.r, this.cBase.i, JULIA_ITER_MAX, perPixel) < 2.5) lit++;
      }
    }
    return lit / 117;
  }

  // Not every boundary point is worth diving at. Plenty sit on the outside of a
  // big smooth lobe, where the far side of the frame is empty black for the
  // whole six seconds, and plenty sit inside a thicket that resolves into dust
  // the field cannot draw. Both are what an unbiased inverse iteration hands
  // back most of the time. So: take a handful of candidates, look at how much of
  // the frame each one fills at the depth the dive will actually reach, and keep
  // the one nearest a target that is neither bare nor solid. One coarse grid per
  // six seconds, and it decides what the preset looks like.
  pickCenter() {
    const zoom = Math.pow(2, JULIA_PLUNGE_OCTAVES * 0.7);
    let best = null;
    let bestMiss = Infinity;
    for (let tries = 0; tries < 8; tries++) {
      const candidate = this.boundaryPoint();
      const miss = Math.abs(this.litFraction(candidate.x, candidate.y, zoom) - JULIA_TARGET_FILL);
      if (miss < bestMiss) { bestMiss = miss; best = candidate; }
      if (miss < 0.06) break;
    }
    return best;
  }

  // How far the camera's own boundary point moves for a unit shift in c, in
  // complex units, measured by carrying dz/dc alongside dz/dz0 down the orbit.
  //
  // This is the number that makes the twist workable. The camera is parked on a
  // point of the set found to full double precision, and a point that deep is
  // not slightly sensitive to c — it can be a million times more sensitive to c
  // than to its own position. The shove that folds the geometry gorgeously at
  // zoom 1 hurls the entire set off a 20x screen and leaves the dive staring
  // into black. Measuring the figure per frame is what lets the twist be
  // expressed as "slide the geometry about this far" and stay true at any depth.
  sensitivity(cr, ci, maxIter) {
    let zr = this.center.x;
    let zi = this.center.y;
    let er = 1;
    let ei = 0;
    let wr = 0;
    let wi = 0;
    for (let n = 0; n < maxIter && zr * zr + zi * zi < 256; n++) {
      const ndr = 2 * (zr * er - zi * ei);
      ei = 2 * (zr * ei + zi * er);
      er = ndr;
      const nwr = 2 * (zr * wr - zi * wi) + 1;
      wi = 2 * (zr * wi + zi * wr);
      wr = nwr;
      const nzi = 2 * zr * zi + ci;
      zr = zr * zr - zi * zi + cr;
      zi = nzi;
    }
    const grad = Math.hypot(er, ei);
    const resp = Math.hypot(wr, wi);
    return Number.isFinite(grad) && Number.isFinite(resp) && grad > 1e-12 ? resp / grad : 1e9;
  }

  update(dt, a) {
    super.update(dt, a);
    // The spring is integrated explicitly, so a stalled tab handing back a
    // half-second dt has to be clamped or it detonates.
    const step = clamp(dt, 0, 1 / 20);
    // Rising-edge detectors. The bands arrive already smoothed, so a "hit" is
    // how far one has jumped above its own slower follower — that fires on the
    // kick drum's attack instead of staying latched for the whole bar.
    const bassJump = Math.max(0, this.bass - this.bassEnv);
    this.bassEnv += (this.bass - this.bassEnv) * clamp(step * (this.bass > this.bassEnv ? 16 : 3));
    const trebleJump = Math.max(0, this.treble - this.trebleEnv);
    this.trebleEnv += (this.treble - this.trebleEnv) * clamp(step * (this.treble > this.trebleEnv ? 22 : 4.5));

    if (bassJump > 0.05) {
      // Sub-bass shoves c sharply, in a direction that itself walks a sine, so
      // consecutive hits fold the geometry different ways instead of pumping it
      // along one axis. Same impulse drives the speaker-cabinet shake.
      this.warpAngle = Math.sin(this.flow * 0.83 + this.driftPhase) * Math.PI;
      this.warpVel += (bassJump + this.beatPulse * 0.12) * 42;
      this.shake = clamp(this.shake + bassJump * 2.6 + this.bass * 0.2);
    }
    this.warpVel += (-JULIA_SPRING * this.warp - JULIA_DAMP * this.warpVel) * step;
    this.warp = clamp(this.warp + this.warpVel * step, -JULIA_WARP_LIMIT, JULIA_WARP_LIMIT);

    if (trebleJump > 0.055) {
      // Half the hi-hats throw the palette to its opposite phase, half blow the
      // outermost trails to white. Alternating beats doing only one of them:
      // a snare that always does the same trick stops registering as an event.
      this.flash = 1;
      this.flashSwap = this.acidRng.chance(0.5) ? 1 : 0;
    }
    this.flash = Math.max(0, this.flash - step * 7.5);
    this.whiteHeat = clamp(this.treble * 0.12 + (this.flashSwap ? 0 : this.flash));

    this.hueShift = (this.hueShift + step * (0.05 + this.mid * 0.07) * this.motion) % 1;
    this.driftPhase += step * this.driftRate * this.motion;
    this.zoomLog += step * JULIA_PLUNGE_RATE * (1 + this.bass * 0.12) * this.motion;
    this.blend = Math.min(1, this.blend + step / JULIA_BLEND_TIME);
    if (this.zoomLog >= JULIA_PLUNGE_OCTAVES) {
      // Doubles run out of mantissa eventually and the fractal turns to mush, so
      // the dive restarts on a fresh boundary point rather than zooming into a
      // pixelated wall. Nothing pops: the trail buffer is still holding the
      // outgoing layer and streams it outward while the new one blooms in, which
      // is the cross-fade — and it costs no second escape-time pass per frame.
      this.zoomLog = 0;
      this.center = this.pickCenter();
      this.blend = 0;
    }

    this.shake = Math.max(0, this.shake - step * 5.5);
    // Squared, so a light kick barely moves and a drop rattles: the point is to
    // read as a CRT sat on top of the speaker, not as a wobbly camera operator.
    const jitter = this.shake * this.shake * 4.5;
    this.shakeX = (this.acidRng.float() * 2 - 1) * jitter;
    this.shakeY = (this.acidRng.float() * 2 - 1) * jitter * 0.7;
  }

  surface(w, h) {
    if (typeof document === 'undefined') return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      return ctx ? { canvas, ctx } : null;
    } catch { return null; }
  }

  // Built on first draw, never in the constructor: this module is imported into
  // Node by the render tools and by the test suite, where there is no real
  // canvas. A preset that throws at construction takes the whole jukebox down.
  ensureBuffers() {
    if (this.buffersTried) return this.buffers !== null;
    this.buffersTried = true;
    const field = this.surface(JULIA_W, JULIA_H);
    const trail = this.surface(W, H);
    const image = field?.ctx.createImageData?.(JULIA_W, JULIA_H);
    if (!field || !trail || !image?.data || image.data.length !== JULIA_W * JULIA_H * 4) return false;
    // Opaque once. The kernel rewrites every pixel's RGB each frame and never
    // touches alpha again.
    image.data.fill(255);
    this.buffers = { field, trail, image };
    return true;
  }

  // The trail is a running accumulation, which makes it the one piece of this
  // preset's state that lives in draw() rather than update(). Two callers care:
  // the jukebox, where an empty buffer means the preset visibly fades up from
  // nothing on entry, and render-video, whose parallel workers replay update()
  // alone and would each start a segment with no trail. Both are fixed by
  // seeding the buffer with what a settled one would hold — the same field,
  // stamped at the scales and alphas the geometric fade would have left it at.
  // It is an approximation for exactly as long as it matters: real frames are
  // 80% of the buffer within ten frames.
  warmTrail() {
    const { field, trail } = this.buffers;
    const ctx = trail.ctx;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.globalCompositeOperation = 'lighter';
    for (let back = 24; back >= 1; back--) {
      const scale = Math.pow(1.004, back);
      const gw = W * scale;
      const gh = H * scale;
      ctx.globalAlpha = JULIA_TRAIL_GAIN * (1 - JULIA_TRAIL_FADE) * Math.pow(JULIA_TRAIL_FADE, back);
      ctx.drawImage(field.canvas, (W - gw) * 0.5, (H - gh) * 0.5, gw, gh);
    }
    ctx.restore();
  }

  // Hue only — brightness is per-pixel, from the distance estimate. Rebuilt each
  // frame so the ramp can cycle and flash, and read as a table so the inner loop
  // never does a colour conversion.
  //
  // Two halves. 0-255 is the plain ramp; 256-511 is the same ramp mixed toward
  // white by the current heat, which the kernel selects for pixels sitting on a
  // filament core. That is the whole white-hot treble flash: one branch and the
  // same two lookups, instead of a blend per channel per pixel.
  buildLut() {
    const lut = this.lut;
    const shift = this.hueShift + (this.flashSwap ? this.flash * 0.5 : 0);
    const heat = this.whiteHeat;
    for (let i = 0; i < 256; i++) {
      // sqrt spreads the low end so the neon bands stay evenly spaced along a
      // filament instead of bunching into one glare against the boundary.
      const slot = ((shift + Math.sqrt(i / 255) * JULIA_BANDS) % 1) * ACID_RAMP.length;
      const from = ACID_RAMP[Math.floor(slot) % ACID_RAMP.length];
      const to = ACID_RAMP[(Math.floor(slot) + 1) % ACID_RAMP.length];
      const f = smooth(slot - Math.floor(slot));
      const o = i * 3;
      for (let ch = 0; ch < 3; ch++) {
        const hue = (from[ch] + (to[ch] - from[ch]) * f) * JULIA_GAIN;
        lut[o + ch] = hue;
        lut[o + 768 + ch] = hue + (255 - hue) * heat;
      }
    }
  }

  renderField() {
    const { field, image } = this.buffers;
    const data = image.data;
    // The warp punches the scale as well as c, so a sub-bass hit collapses the
    // whole frame inward or blooms it outward depending on which way the spring
    // is travelling — the same event, seen twice.
    const zoom = Math.pow(2, this.zoomLog) * Math.max(0.3, 1 + this.warp * 0.28);
    const scale = JULIA_VIEW / JULIA_W / zoom;
    // Detail has to be bought back as the view narrows or the deep end of the
    // dive resolves into a handful of fat filaments.
    const maxIter = Math.round(clamp(JULIA_ITER_MIN + this.zoomLog * 7, JULIA_ITER_MIN, JULIA_ITER_MAX));
    const inv = 1 / maxIter;
    // Turn "the geometry may slide this many field pixels" into "c may move this
    // far", against what this camera can actually survive at this depth.
    const slide = scale / Math.max(1e-12, this.sensitivity(this.cBase.r, this.cBase.i, maxIter));
    const reach = this.warp * Math.min(JULIA_TWIST_PIXELS * slide, JULIA_TWIST_MAX);
    const drift = Math.min(JULIA_DRIFT_PIXELS * slide, JULIA_TWIST_MAX * 0.25);
    const cr = this.cBase.r + Math.cos(this.driftPhase) * drift + Math.cos(this.warpAngle) * reach;
    const ci = this.cBase.i + Math.sin(this.driftPhase * 1.31) * drift + Math.sin(this.warpAngle) * reach;
    const ox = this.center.x;
    const oy = this.center.y;
    const lut = this.lut;
    const halfW = JULIA_W * 0.5;
    const halfH = JULIA_H * 0.5;
    // The distance estimate comes out in complex units; filaments want to be a
    // fixed number of *pixels* wide however far down the dive we are.
    const perPixel = 1 / scale;
    let p = 0;
    for (let py = 0; py < JULIA_H; py++) {
      const y0 = (py - halfH) * scale + oy;
      for (let px = 0; px < JULIA_W; px++) {
        let zr = (px - halfW) * scale + ox;
        let zi = y0;
        let zr2 = zr * zr;
        let zi2 = zi * zi;
        // Derivative of the orbit against its own start, carried along so an
        // escaping pixel can be told how far it is from the set, rather than
        // only how long it took to leave.
        let er = 1;
        let ei = 0;
        let n = 0;
        // Periodicity bail-out. Interior orbits fall onto an attracting cycle
        // within a few steps; without this check every interior pixel pays the
        // full iteration count, which at depth is most of the frame's cost.
        let hr = zr;
        let hi = zi;
        let span = 8;
        let mark = 8;
        while (n < maxIter && zr2 + zi2 < 256) {
          const ndr = 2 * (zr * er - zi * ei);
          ei = 2 * (zr * ei + zi * er);
          er = ndr;
          zi = 2 * zr * zi + ci;
          zr = zr2 - zi2 + cr;
          zr2 = zr * zr;
          zi2 = zi * zi;
          n++;
          const dr = zr - hr;
          const di = zi - hi;
          if (dr * dr + di * di < 1e-14) { n = maxIter; break; }
          if (n === mark) { hr = zr; hi = zi; span <<= 1; mark = n + span; }
        }
        let o = 0;
        let bright = 0;
        if (n < maxIter) {
          const mod = Math.sqrt(zr2 + zi2);
          const lm = Math.log(mod);
          const grad = Math.sqrt(er * er + ei * ei);
          // Distance to the set itself, converted to pixels. Escape *time* alone
          // paints the exterior in bands, and at this field resolution those
          // alias into confetti wherever the filigree is finer than a pixel.
          // Distance draws the boundary as a stroke that stays clean however
          // fine the structure under it gets — which is the crystalline edge the
          // whole preset is for.
          const dn = grad > 1e-12 ? mod * lm / grad * perPixel : 1e9;
          // A tight core for the crystal edge, plus a narrow halo to carry the
          // colour bands a little way out from it. Both fall off fast: the field
          // accumulates additively in the trail buffer, so anything with breadth
          // to it lands on screen several times over.
          const halo = 1 / (1 + dn * 0.7);
          bright = 1 / (1 + dn * dn * 0.5) + halo * halo * 0.7;
          if (bright > 1) bright = 1;
          // Continuous escape value drives the hue. Raw iteration counts band
          // the exterior into a staircase; this gives the ramp a smooth curve.
          const s = (n + 1 - Math.log(lm) * LOG2E) * inv;
          o = (s <= 0 ? 0 : s >= 1 ? 255 : (s * 255) | 0) * 3;
          // Filament cores read from the white-hot half of the table.
          if (bright > 0.62) o += 768;
        }
        data[p] = lut[o] * bright;
        data[p + 1] = lut[o + 1] * bright;
        data[p + 2] = lut[o + 2] * bright;
        p += 4;
      }
    }
    field.ctx.putImageData(image, 0, 0);
  }

  advanceTrail() {
    const { field, trail } = this.buffers;
    const ctx = trail.ctx;
    // The trail canvas is never cleared. Each frame its own contents are copied
    // back very slightly enlarged and a little dimmer, so old frames bleed
    // outward *along* the plunge and decay like ink in water rather than sitting
    // still and smearing. `copy` does the fade and the growth in one pass.
    const fade = this.blend < 1 ? JULIA_BLEND_FADE : JULIA_TRAIL_FADE - this.treble * 0.06;
    const grow = 1.004 + this.bass * 0.006;
    const gw = W * grow;
    const gh = H * grow;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.globalCompositeOperation = 'copy';
    ctx.globalAlpha = fade;
    ctx.drawImage(trail.canvas, (W - gw) * 0.5, (H - gh) * 0.5, gw, gh);
    // A fresh layer arrives slightly oversized and settles inward as it fades
    // up, so it reads as coming toward the camera like everything else.
    const ease = smooth(this.blend);
    const nw = W * (1 + (1 - ease) * 0.3);
    const nh = H * (1 + (1 - ease) * 0.3);
    // Derived from the fade rather than fixed, so a settled pixel always sums to
    // the same place. It also means the slow fade held through a layer change
    // automatically feeds the incoming fractal in gently instead of doubling the
    // exposure at exactly the moment two layers are on screen at once.
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = JULIA_TRAIL_GAIN * (1 - fade) * (0.4 + 0.6 * ease);
    ctx.drawImage(field.canvas, (W - nw) * 0.5, (H - nh) * 0.5, nw, nh);
    ctx.restore();
  }

  draw(ctx) {
    // Pure #000000, always. Every other layer here is additive on top of it.
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
    if (!this.ensureBuffers()) {
      // No ImageData available (Node, headless tools). Still a valid member of
      // the pack: core, dust, vignette, no throw.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      this.glowDot(ctx, this.focusX, this.focusY, 62 + this.bass * 48, ACID_HEX[1], 0.2 + this.beatPulse * 0.12);
      ctx.restore();
      this.drawDust(ctx, 0.6);
      this.modernFinish(ctx, 0.3);
      return;
    }
    // Guarded on the clock so the cross-fade between two presets, which draws
    // both of them in one frame, cannot advance the trail twice.
    if (this.renderedT !== this.t) {
      const cold = this.renderedT < 0;
      this.renderedT = this.t;
      this.buildLut();
      this.renderField();
      if (cold) this.warmTrail();
      this.advanceTrail();
    }
    // Blitted a few pixels oversized so the shake offset never drags a black
    // edge into frame.
    //
    // Smoothing OFF, alone among the blits here. The field is solved well below
    // the density it is shown at, and a smoothed magnification of it lands in
    // the worst place available: too soft to be pixel art, too stepped to pass
    // as continuous, because the trail feedback below resamples its own output
    // every frame and crystallises the block edges back up faster than the
    // filtering can knock them down. Nearest-neighbour commits instead — the
    // structure is the same size either way, so this is the same picture read
    // as deliberate rather than as a compromise, and it costs nothing.
    // The trail's own accumulation stays smoothed; that is what makes it bleed.
    const bleed = 5;
    const bleedY = bleed * H / W;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.buffers.trail.canvas,
      this.shakeX - bleed, this.shakeY - bleedY, W + bleed * 2, H + bleedY * 2);
    ctx.globalCompositeOperation = 'lighter';
    // One soft core, so the middle of the dive is not dead black on the frames
    // where the camera is passing between filaments. The only non-fractal colour
    // on screen, and it stays under a tenth alpha for that reason.
    const core = ACID_HEX[Math.floor(this.hueShift * ACID_HEX.length) % ACID_HEX.length];
    this.glowDot(ctx, CX + this.shakeX, CY + this.shakeY, 40 + this.bass * 46, core, 0.05 + this.beatPulse * 0.09);
    ctx.restore();
    this.drawDust(ctx, 0.45);
    this.modernFinish(ctx, 0.3);
  }
}

// ---------------------------------------------------------------------------
// HYPER-VECTOR TUNNEL — the Winamp/Geiss/MilkDrop feedback warp.
//
// The whole preset is one idea: draw a little, then draw the LAST frame back on
// top of itself slightly rotated and scaled, forever. Geiss's tunnels were a
// per-pixel UV distortion; drawImage is affine-only, so a single blit can only
// spin the whole plane at one rate. Three concentric clipped bands, each with
// its own scale and twist, buy back the thing that actually reads as a vortex:
// the middle of the screen rushing at a different rate from the edge.
//
// The buffer runs at 320x180 and is upscaled. That is not a compromise — the
// warp is soft by construction, and the upscale IS the bloom.
const PLASMA_W = 320;
const PLASMA_H = 180;
const PLASMA_HEX = ['#4df0ff', '#ff4de0', '#b6ff4d', '#f4faff'];
// How much of the previous frame survives, and how bright the layer feeding it
// is allowed to be. These two are one decision, not two: a pixel that is
// re-drawn every frame settles at roughly INK / (1 - DECAY), so at 0.88 the
// fresh layer is multiplied about eight times over. Draw the vectors at the
// brightness you want to SEE and the tunnel ramps to white within a second.
const PLASMA_DECAY = 0.88;
const PLASMA_INK = 0.13;
const PLASMA_BANDS = 3;
// Zooms land on a beat and hold. A continuous zoom reads as drifting; a
// quantised one reads as cut to the music, which is the Geiss signature.
const PLASMA_ZOOM_LADDER = [1.006, 1.014, 1.022, 1.011, 1.030, 1.017];
const PLASMA_LISSAJOUS = [[3, 2], [5, 4], [3, 4], [5, 2], [7, 4]];
// Frames of feedback stamped on the first draw, so the tunnel opens settled
// instead of fading up out of black. Sixteen leaves 0.88^16, about an eighth of
// the brightness still to accumulate — invisible on entry in the jukebox, but
// render-video's workers each start a segment cold, and a measurable dip landed
// on exactly the frames where one worker's range began. Thirty is inside two
// percent, and the cost is a one-off few milliseconds on the first draw only.
const PLASMA_WARM_FRAMES = 30;

class HyperVectorTunnel extends BaseVisualiser {
  constructor(seed, track) {
    super(seed, track);
    this.name = VISUALISER_NAMES[17];
    // The neon set is the point of the homage, so it replaces the seeded pack
    // palette outright — drawDust and the core glow read from it too.
    this.palette = PLASMA_HEX;
    this.plasmaRng = this.rng.stream('plasma');
    this.sparkRng = this.rng.stream('plasma-spark');
    this.spokes = this.plasmaRng.int(5, 9);
    this.twistDir = this.plasmaRng.chance(0.5) ? 1 : -1;
    // Inner band zooms hardest and twists least, outer band the reverse. The
    // slight scale spread between bands is also where the colour fringing comes
    // from: a hue laid down fifteen frames ago sits at a different radius in
    // each band, which is how MilkDrop got its chromatic edges too.
    this.bandZoom = [1.5, 1.0, 0.62];
    this.bandTwist = [0.45, 1.0, 1.65];
    this.zoom = 1.012;
    this.zoomTarget = 1.012;
    this.zoomIndex = this.plasmaRng.int(0, PLASMA_ZOOM_LADDER.length - 1);
    this.twist = 0;
    this.lissPhase = 0;
    this.lissRatio = this.plasmaRng.pick(PLASMA_LISSAJOUS);
    this.lissPhrase = -1;
    this.bloomGain = 0.4;
    this.bassEnv = 0.25;
    this.trebleEnv = 0.15;
    this.sparks = makePool(48);
    for (const p of this.sparks) this.seedSpark(p, true);
    this.buffers = null;
    this.buffersTried = false;
    this.renderedT = -1;
    // Real state, so a test can prove the guard below actually guards.
    this.feedbackAdvances = 0;
  }

  seedSpark(p, cold = false) {
    const rng = cold ? this.plasmaRng : this.sparkRng;
    p.hue = rng.float();
    p.x = rng.float() * TAU;                    // angle
    p.y = cold ? rng.float() * 90 : 4 + rng.float() * 10;  // radius
    p.z = 42 + rng.float() * 78;                // speed
    p.life = cold ? rng.float() : 1;
  }

  update(dt, a) {
    super.update(dt, a);
    // A backgrounded tab hands back one enormous dt. Every integrator here is
    // explicit, so clamp once and use the clamped value throughout.
    const step = clamp(dt, 0, 1 / 20);
    const crossed = Math.floor(this.beat) !== Math.floor(this.prevBeat);
    if (crossed) {
      this.zoomIndex = (this.zoomIndex + 1 + this.plasmaRng.int(0, 2)) % PLASMA_ZOOM_LADDER.length;
      // Quantised in value, eased in time. The ladder rung is chosen on the
      // beat; getting there is smooth, so the picture never tears.
      this.zoomTarget = 1 + (PLASMA_ZOOM_LADDER[this.zoomIndex] - 1) * (0.5 + this.bass);
    }
    // The kick itself, not the beat grid it sits on: a bar with no drum under it
    // gets the ladder but not the surge.
    const bassJump = Math.max(0, this.bass - this.bassEnv);
    this.bassEnv += (this.bass - this.bassEnv) * clamp(step * 5, 0, 1);
    this.zoom += (this.zoomTarget + this.hit * 0.02 + bassJump * 0.05 - this.zoom) * clamp(step * 8, 0, 1);
    this.twist += step * (0.16 * this.twistDir + this.bass * 0.9 * this.twistDir) * this.motion;
    this.lissPhase += step * (0.35 + this.mid * 0.9) * this.motion;
    // A new figure every 8 bars, so the geometry has a shape you can follow
    // rather than churning continuously.
    const phrase = Math.floor(this.beat / 32);
    if (phrase !== this.lissPhrase) {
      this.lissPhrase = phrase;
      this.lissRatio = this.plasmaRng.pick(PLASMA_LISSAJOUS);
    }
    const trebleJump = Math.max(0, this.treble - this.trebleEnv);
    this.trebleEnv += (this.treble - this.trebleEnv) * clamp(step * 7, 0, 1);
    if (trebleJump > 0.055) {
      let budget = 12;
      for (const p of this.sparks) {
        if (budget <= 0) break;
        if (p.life <= 0.06) { this.seedSpark(p); budget--; }
      }
    }
    for (const p of this.sparks) {
      p.y += step * p.z * (1 + this.treble * 2) * this.motion;
      p.life -= step * (0.5 + this.treble * 0.8);
      if (p.y > 210 || p.life <= 0) p.life = 0;
    }
    this.bloomGain += (0.35 + this.bass * 0.5 + this.pulse * 0.6 - this.bloomGain) * clamp(step * 4, 0, 1);
  }

  ensureBuffers() {
    if (this.buffersTried) return this.buffers !== null;
    this.buffersTried = true;
    const a = makeSurface(PLASMA_W, PLASMA_H);
    const b = makeSurface(PLASMA_W, PLASMA_H);
    const bloom = makeSurface(PLASMA_W >> 1, PLASMA_H >> 1);
    if (!a || !b || !bloom) return false;
    for (const s of [a, b]) {
      s.ctx.fillStyle = '#030308';
      s.ctx.fillRect(0, 0, PLASMA_W, PLASMA_H);
    }
    this.buffers = { front: a, back: b, bloom };
    return true;
  }

  // The fresh vector layer, in buffer coordinates. Everything the feedback loop
  // will smear for the next fifteen frames is laid down here exactly once.
  paintVectors(ctx, px, py) {
    const scale = PLASMA_W / W;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    // Starburst. Aimed by the shared ring choreography so it turns on the same
    // 4/8/16-beat holds the rest of the pack turns on.
    const reach = (26 + this.mid * 52 + this.pulse * 30) * scale;
    for (let i = 0; i < this.spokes; i++) {
      const ang = this.ringRotation + this.twist * 0.3 + (i / this.spokes) * TAU;
      const c = this.palette[i % this.palette.length];
      ctx.strokeStyle = rgba(c, PLASMA_INK * (1 + this.mid * 0.8));
      ctx.lineWidth = (0.8 + this.pulse * 1.6) * scale;
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(ang) * 5 * scale, py + Math.sin(ang) * 5 * scale);
      ctx.lineTo(px + Math.cos(ang) * reach, py + Math.sin(ang) * reach);
      ctx.stroke();
    }
    // Lissajous figure. Sampled densely enough that the polyline reads as a
    // curve once the feedback has smeared it.
    const [rx, ry] = this.lissRatio;
    const ax = (48 + this.mid * 44) * scale;
    const ay = (30 + this.bass * 34) * scale;
    ctx.strokeStyle = rgba(this.palette[1], PLASMA_INK * (0.9 + this.mid * 0.7));
    ctx.lineWidth = (0.7 + this.mid * 1.1) * scale;
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const u = (i / 120) * TAU;
      const x = px + Math.sin(u * rx + this.lissPhase) * ax;
      const y = py + Math.sin(u * ry + this.lissPhase * 0.7) * ay;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // Treble sparks, as short radial streaks rather than dots — the feedback
    // gives them their tails, so they only need to be a hint of motion.
    for (const p of this.sparks) {
      if (p.life <= 0) continue;
      const c = this.palette[Math.floor(p.hue * this.palette.length) % this.palette.length];
      const cos = Math.cos(p.x); const sin = Math.sin(p.x);
      const r0 = p.y * scale;
      const r1 = (p.y + 7 + this.treble * 9) * scale;
      ctx.strokeStyle = rgba(c, p.life * PLASMA_INK * (1.1 + this.treble * 1.2));
      ctx.lineWidth = (0.5 + p.life * 0.9) * scale;
      ctx.beginPath();
      ctx.moveTo(px + cos * r0, py + sin * r0);
      ctx.lineTo(px + cos * r1, py + sin * r1);
      ctx.stroke();
    }
    ctx.restore();
  }

  advanceFeedback() {
    const { front, back } = this.buffers;
    const ctx = back.ctx;
    const px = (this.focusX / W) * PLASMA_W;
    const py = (this.focusY / H) * PLASMA_H;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    // Opaque, so the decay converges on the background instead of silting up
    // toward grey the way an alpha-only fade does.
    ctx.fillStyle = '#030308';
    ctx.fillRect(0, 0, PLASMA_W, PLASMA_H);
    ctx.imageSmoothingEnabled = true;
    const outer = Math.hypot(PLASMA_W, PLASMA_H);
    for (let i = 0; i < PLASMA_BANDS; i++) {
      const rIn = (i / PLASMA_BANDS) * outer * 0.5;
      const rOut = ((i + 1) / PLASMA_BANDS) * outer * 0.5 + 1;
      ctx.save();
      ctx.beginPath();
      ctx.arc(px, py, rOut, 0, TAU);
      if (rIn > 0) ctx.arc(px, py, rIn, 0, TAU, true);
      ctx.clip();
      ctx.translate(px, py);
      ctx.rotate(this.twist * this.bandTwist[i] * 0.06);
      const z = 1 + (this.zoom - 1) * this.bandZoom[i];
      ctx.scale(z, z);
      ctx.translate(-px, -py);
      ctx.globalAlpha = PLASMA_DECAY;
      ctx.drawImage(front.canvas, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    this.paintVectors(ctx, px, py);
    // The bloom is built from the finished frame but deliberately NOT written
    // back into it. Feeding an additive blur into the same buffer it was taken
    // from makes the loop gain exceed one, and the whole screen ramps to white
    // in about a second — the failure this decay was chosen to avoid, arriving
    // by a different door. It gets composited against the frame in draw().
    const { bloom } = this.buffers;
    const bw = PLASMA_W >> 1; const bh = PLASMA_H >> 1;
    bloom.ctx.setTransform(1, 0, 0, 1, 0, 0);
    bloom.ctx.globalCompositeOperation = 'source-over';
    bloom.ctx.globalAlpha = 1;
    bloom.ctx.clearRect(0, 0, bw, bh);
    bloom.ctx.imageSmoothingEnabled = true;
    bloom.ctx.drawImage(back.canvas, 0, 0, bw, bh);
    this.buffers.front = back;
    this.buffers.back = front;
    this.feedbackAdvances++;
  }

  // Stamp a settled tunnel on the first draw. Two callers need it: the jukebox,
  // where an empty buffer means the preset visibly fades up out of black on
  // entry, and render-video, whose parallel workers each replay update() alone
  // to reach their range and would otherwise all open on an empty screen.
  //
  // The buffer's memory is roughly 1/(1 - DECAY), about eight frames, so thirty
  // stamps settle it comfortably. Worth knowing if a brightness step at a
  // worker's first frame ever sends you back here: one was measured and traced
  // instead to segment encoding, in a preset with no buffer to warm at all.
  warmFeedback() {
    for (let i = 0; i < PLASMA_WARM_FRAMES; i++) this.advanceFeedback();
    this.feedbackAdvances = 0;
  }

  draw(ctx) {
    this.backdrop(ctx, '#030308', '#050310');
    if (!this.ensureBuffers()) {
      // No real canvas. Still a member of the pack: the vector layer straight to
      // frame, no feedback, no throw.
      this.paintVectors(ctx, this.focusX, this.focusY);
      this.drawDust(ctx, 0.5);
      this.modernFinish(ctx, 0.3);
      return;
    }
    // Guarded on the clock, because a cross-fade draws both records in one
    // frame and the tunnel must not advance twice on a single tick.
    if (this.renderedT !== this.t) {
      const cold = this.renderedT < 0;
      this.renderedT = this.t;
      if (cold) this.warmFeedback();
      this.advanceFeedback();
    }
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.buffers.front.canvas, 0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = clamp(this.bloomGain) * 0.34 * this.frameAlpha;
    ctx.drawImage(this.buffers.bloom.canvas, 0, 0, W, H);
    ctx.globalAlpha = this.frameAlpha;
    // The present frame, crisp, on top of its own soft history. That contrast
    // is the entire read of the preset: everything old is a smear, everything
    // now has an edge.
    ctx.globalCompositeOperation = 'lighter';
    const [rx, ry] = this.lissRatio;
    const hx = this.focusX + Math.sin(this.lissPhase * rx) * (48 + this.mid * 44);
    const hy = this.focusY + Math.sin(this.lissPhase * ry * 0.7) * (30 + this.bass * 34);
    this.glowDot(ctx, hx, hy, 7 + this.mid * 11, this.palette[3], 0.5 + this.pulse * 0.4);
    this.glowDot(ctx, this.focusX, this.focusY, 26 + this.bass * 40, this.palette[0], 0.16 + this.pulse * 0.2);
    ctx.restore();
    this.drawDust(ctx, 0.5);
    this.modernFinish(ctx, 0.3);
  }
}

// ---------------------------------------------------------------------------
// NEBULA RIBBON DRIFT — the iTunes Magnetosphere homage.
//
// Magnetosphere's trick was never particle COUNT, it was that the cloud had
// weight: it compressed as the bass built and burst on the kick. So the physics
// is the feature here and the count is just enough to read as volume.
//
// Two things keep it cheap. Every particle is a blit from a baked glow sprite
// rather than a gradient allocated per frame, and there is no depth sort at all
// — everything composites with 'lighter', which is commutative, so sorting
// hundreds of particles every frame would buy exactly nothing. Depth instead
// comes from rendering the far half into a quarter-size buffer, where the
// upscale blur IS the depth of field.
const NEBULA_COUNT = 420;
const NEBULA_FAR = 250;
const NEBULA_FAR_W = 160;
const NEBULA_FAR_H = 90;
const NEBULA_RIBBONS = 3;
// The ribbon is a filled strip, not a stroked curve, so its smoothness is node
// count and nothing else — at 34 the outside of a wide coil reads as a polygon.
const NEBULA_NODES = 52;
const NEBULA_COOL = ['#6ec8ff', '#a98cff', '#4de0ff', '#dfe8ff'];
const NEBULA_WARM = ['#ffc857', '#ff7a5c', '#ffd98a', '#fff2d8'];
// Soft on purpose. The Julia dive springs at 500/16 because it had to settle
// inside a quarter second under four-on-the-floor; this cloud should breathe
// across a bar, so it is roughly twenty times looser.
const NEBULA_SPRING = 26;
const NEBULA_DAMP = 3.4;
const NEBULA_SHOCK_SPEED = 260;
// Only particles inside this band of the expanding shell take the impulse. That
// is what makes a detonation read as a sphere travelling outward rather than as
// the whole cloud scaling up at once.
const NEBULA_SHOCK_BAND = 26;
const NEBULA_FOV = 260;

class NebulaRibbonDrift extends BaseVisualiser {
  constructor(seed, track) {
    super(seed, track);
    this.name = VISUALISER_NAMES[18];
    this.nebulaRng = this.rng.stream('nebula');
    this.shimmerRng = this.rng.stream('nebula-shimmer');
    this.palette = NEBULA_COOL.slice();
    this.heat = 0;
    this.paletteStep = 0;
    this.squeeze = 0;
    this.shockR = 0;
    this.shockE = 0;
    this.detonations = 0;
    this.trebleEnv = 0.15;
    this.yaw = this.nebulaRng.float() * TAU;
    this.pitch = 0;
    // Which beats of the bar this seed detonates on. A song is not obliged to
    // put a kick on all four, and neither is the picture.
    this.kickBeats = this.nebulaRng.pick([[0], [0, 2], [0, 2, 3]]);
    this.cloud = Array.from({ length: NEBULA_COUNT }, () => ({
      wx: 0, wy: 0, wz: 0, vx: 0, vy: 0, vz: 0, hx: 0, hy: 0, hz: 0, hue: 0, far: false,
    }));
    this.cloud.forEach((p, i) => {
      // Even shell, not a uniform cube: the cube corners would read as a box.
      const u = this.nebulaRng.float() * 2 - 1;
      const ang = this.nebulaRng.float() * TAU;
      const rad = 46 + this.nebulaRng.float() * 74;
      const flat = Math.sqrt(Math.max(0, 1 - u * u));
      p.hx = Math.cos(ang) * flat * rad;
      p.hy = u * rad * 0.78;
      p.hz = Math.sin(ang) * flat * rad;
      p.wx = p.hx; p.wy = p.hy; p.wz = p.hz;
      p.hue = this.nebulaRng.float();
      p.far = i < NEBULA_FAR;
    });
    this.ribbons = Array.from({ length: NEBULA_RIBBONS }, (_, i) => ({
      phase: this.nebulaRng.float() * TAU,
      tilt: (this.nebulaRng.float() * 2 - 1) * 0.6,
      radius: 62 + this.nebulaRng.float() * 46,
      seed: this.nebulaRng.float() * 40,
      near: i === NEBULA_RIBBONS - 1,
      nodes: Array.from({ length: NEBULA_NODES }, () => ({ x: 0, y: 0, s: 0 })),
    }));
    this.far = null;
    this.farTried = false;
    this.renderedT = -1;
  }

  // Allocation-free: every caller reads the fields straight back off `this.proj`
  // before the next call overwrites them.
  project(x, y, z, out) {
    const cy = Math.cos(this.yaw); const sy = Math.sin(this.yaw);
    const cp = Math.cos(this.pitch); const sp = Math.sin(this.pitch);
    const rx = x * cy - z * sy;
    const rz = x * sy + z * cy;
    const ry = y * cp - rz * sp;
    const dz = y * sp + rz * cp;
    const s = NEBULA_FOV / (NEBULA_FOV + dz);
    out.x = CX + rx * s;
    out.y = CY + ry * s;
    out.s = s;
    return out;
  }

  update(dt, a) {
    super.update(dt, a);
    const step = clamp(dt, 0, 1 / 20);
    // Camera drift takes `motion`; the physics below deliberately does not.
    // A quiet passage should slow the CAMERA down, not change how a spring
    // behaves — springs that ease with the mix stop reading as mass.
    this.yaw += step * 0.14 * this.motion;
    this.pitch = Math.sin(this.flow * 0.19) * 0.28;
    this.squeeze += (this.bass - this.squeeze) * clamp(step * 2.2, 0, 1);
    const trebleJump = Math.max(0, this.treble - this.trebleEnv);
    this.trebleEnv += (this.treble - this.trebleEnv) * clamp(step * 7, 0, 1);
    // The walk has to come back. Treble transients arrive far more often than
    // once a second, so a rise this size against a slow fall just pins the
    // palette at the warm end and the cool half of it is never seen.
    this.heat = clamp(this.heat + trebleJump * 0.7 - step * 0.85);
    // Quantised before it reaches glowSprite. A continuously varying hex would
    // mint a new baked canvas every frame and thrash the cache; eight steps is
    // invisible at these alphas and holds the map to a fixed handful.
    this.paletteStep = Math.round(this.heat * 7) / 7;
    for (let i = 0; i < this.palette.length; i++) {
      this.palette[i] = mixHex(NEBULA_COOL[i], NEBULA_WARM[i], this.paletteStep);
    }
    // Detonation comes off the sequencer's own kit tally, never off beatPulse.
    // beatPulse keeps ticking through a section with the drums arranged out, and
    // a nebula bursting where nobody played a drum is exactly the failure the
    // kit-weighted signals exist to prevent.
    const crossed = Math.floor(this.beat) !== Math.floor(this.prevBeat);
    const slot = ((Math.floor(this.beat) % 4) + 4) % 4;
    if (crossed && !this.drumless && this.groove > 0.35 && this.kickBeats.includes(slot)) {
      this.shockR = 0;
      this.shockE = 0.55 + this.bass * 0.8 + this.drums * 0.5;
      this.detonations++;
    }
    if (this.shockE > 0) {
      this.shockR += step * NEBULA_SHOCK_SPEED * this.shockE;
      this.shockE = Math.max(0, this.shockE - step * 1.1);
      if (this.shockR > 320) this.shockE = 0;
    }
    const pull = 1 - this.squeeze * 0.55;
    for (const p of this.cloud) {
      const hx = p.hx * pull; const hy = p.hy * pull; const hz = p.hz * pull;
      p.vx += (hx - p.wx) * NEBULA_SPRING * step;
      p.vy += (hy - p.wy) * NEBULA_SPRING * step;
      p.vz += (hz - p.wz) * NEBULA_SPRING * step;
      if (this.shockE > 0) {
        const r = Math.hypot(p.wx, p.wy, p.wz) || 0.0001;
        if (Math.abs(r - this.shockR) < NEBULA_SHOCK_BAND) {
          const kick = this.shockE * 210 * step;
          p.vx += (p.wx / r) * kick;
          p.vy += (p.wy / r) * kick;
          p.vz += (p.wz / r) * kick;
        }
      }
      const damp = 1 / (1 + NEBULA_DAMP * step);
      p.vx *= damp; p.vy *= damp; p.vz *= damp;
      p.wx += p.vx * step; p.wy += p.vy * step; p.wz += p.vz * step;
    }
  }

  ensureFar() {
    if (this.farTried) return this.far !== null;
    this.farTried = true;
    this.far = makeSurface(NEBULA_FAR_W, NEBULA_FAR_H);
    return this.far !== null;
  }

  // Ribbon nodes in screen space for the current camera. Written into the
  // ribbon's own preallocated node list rather than returned, so a frame
  // allocates nothing.
  layoutRibbon(ribbon, scale = 1) {
    const proj = { x: 0, y: 0, s: 0 };
    const coil = 0.4 + this.mid * 1.1;
    for (let i = 0; i < NEBULA_NODES; i++) {
      const u = i / (NEBULA_NODES - 1);
      const ang = ribbon.phase + u * TAU * 1.6 + this.flow * 0.22;
      const r = ribbon.radius * (0.55 + 0.45 * Math.sin(u * Math.PI));
      // Mids drive the turbulence amplitude, which is what coils a smooth helix
      // into a knot when the arrangement gets busy.
      const n = valueNoise3(u * 3.1 + ribbon.seed, ribbon.seed, this.flow * coil);
      const wob = (n - 0.5) * (26 + this.mid * 62);
      const x = Math.cos(ang) * r + wob;
      const y = (u - 0.5) * 128 * ribbon.tilt + wob * 0.5;
      const z = Math.sin(ang) * r;
      this.project(x, y, z, proj);
      const node = ribbon.nodes[i];
      node.x = proj.x * scale;
      node.y = proj.y * scale;
      node.s = proj.s;
    }
  }

  // A tapered strip: down one edge, back up the other. Both ends pinch to
  // nothing so the ribbon has no cut-off, and the whole body takes one gradient.
  paintRibbon(ctx, ribbon, alpha, scale = 1) {
    const nodes = ribbon.nodes;
    let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
    for (const n of nodes) {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    }
    if (!Number.isFinite(minX) || maxX - minX < 0.01) return;
    const half = (i) => {
      const u = i / (NEBULA_NODES - 1);
      return Math.sin(Math.PI * u) * (3.2 + this.mid * 3.4) * nodes[i].s * scale;
    };
    const normal = (i) => {
      const a = nodes[Math.max(0, i - 1)];
      const b = nodes[Math.min(NEBULA_NODES - 1, i + 1)];
      const dx = b.x - a.x; const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      return [-dy / len, dx / len];
    };
    ctx.beginPath();
    for (let i = 0; i < NEBULA_NODES; i++) {
      const [nx, ny] = normal(i); const h = half(i);
      const x = nodes[i].x + nx * h; const y = nodes[i].y + ny * h;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    for (let i = NEBULA_NODES - 1; i >= 0; i--) {
      const [nx, ny] = normal(i); const h = half(i);
      ctx.lineTo(nodes[i].x - nx * h, nodes[i].y - ny * h);
    }
    ctx.closePath();
    const g = ctx.createLinearGradient(minX, minY, maxX, maxY);
    g.addColorStop(0, rgba(this.palette[0], alpha * 0.85));
    g.addColorStop(0.5, rgba('#ffffff', alpha * 0.5));
    g.addColorStop(1, rgba(this.palette[1], alpha * 0.85));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = rgba('#ffffff', alpha * (0.12 + this.pulse * 0.3));
    ctx.lineWidth = 0.5 * scale;
    ctx.stroke();
  }

  paintCloud(ctx, far, scale = 1) {
    const proj = { x: 0, y: 0, s: 0 };
    for (const p of this.cloud) {
      if (p.far !== far) continue;
      this.project(p.wx, p.wy, p.wz, proj);
      if (proj.s <= 0.02) continue;
      const shimmer = 0.55 + 0.45 * Math.sin(p.hue * TAU + this.flow * 9);
      const alpha = clamp(proj.s * (0.18 + this.treble * 0.62) * shimmer);
      if (alpha < 0.012) continue;
      const hex = this.palette[Math.floor(p.hue * this.palette.length) % this.palette.length];
      const px = 9 + proj.s * (far ? 15 : 9) + this.pulse * 5;
      const sprite = glowSprite(hex, px);
      const x = proj.x * scale; const y = proj.y * scale;
      if (!sprite) {
        // No baked sprite (headless). Falls back to the hand-placed light so the
        // preset still composes rather than drawing nothing.
        this.glowDot(ctx, x, y, px * 0.5 * scale, hex, alpha);
        continue;
      }
      const size = px * scale;
      ctx.globalAlpha = alpha * this.frameAlpha;
      ctx.drawImage(sprite.canvas, x - size * 0.5, y - size * 0.5, size, size);
    }
    ctx.globalAlpha = this.frameAlpha;
  }

  // Rebuilt wholesale from update() state, so it is idempotent — unlike the
  // tunnel's feedback buffer this holds no history and drawing it twice yields
  // the same pixels. The clock guard is purely an optimisation for the frames
  // where a cross-fade paints this preset twice.
  buildFar() {
    const ctx = this.far.ctx;
    const scale = NEBULA_FAR_W / W;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, NEBULA_FAR_W, NEBULA_FAR_H);
    ctx.globalCompositeOperation = 'lighter';
    for (const ribbon of this.ribbons) {
      if (ribbon.near) continue;
      this.layoutRibbon(ribbon, scale);
      this.paintRibbon(ctx, ribbon, 0.5, scale);
    }
    const keepAlpha = this.frameAlpha;
    this.frameAlpha = 1;
    this.paintCloud(ctx, true, scale);
    this.frameAlpha = keepAlpha;
    ctx.globalAlpha = 1;
  }

  draw(ctx) {
    // The void is pure black and opaque. Everything else is additive on it.
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (this.ensureFar()) {
      if (this.renderedT !== this.t) {
        this.renderedT = this.t;
        this.buildFar();
      }
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 0.9 * this.frameAlpha;
      ctx.drawImage(this.far.canvas, 0, 0, W, H);
      ctx.globalAlpha = this.frameAlpha;
    } else {
      for (const ribbon of this.ribbons) {
        if (ribbon.near) continue;
        this.layoutRibbon(ribbon);
        this.paintRibbon(ctx, ribbon, 0.4);
      }
      this.paintCloud(ctx, true);
    }
    for (const ribbon of this.ribbons) {
      if (!ribbon.near) continue;
      this.layoutRibbon(ribbon);
      this.paintRibbon(ctx, ribbon, 0.75);
    }
    this.paintCloud(ctx, false);
    // The compressed heart, so the middle of the cloud has somewhere to burst
    // from rather than being a hole.
    this.glowDot(ctx, CX, CY, 26 + this.bass * 44, this.palette[0], 0.1 + this.pulse * 0.22);
    // The shell, fading as it goes. It has to die out well before it reaches the
    // frame edge: a ring still carrying weight out there stops reading as a
    // shockwave leaving the cloud and starts reading as a circle drawn round the
    // picture, which is what it did at a flat alpha.
    const reach = clamp(1 - this.shockR / 210);
    if (this.shockE > 0.01 && reach > 0.01) {
      ctx.strokeStyle = rgba(this.palette[2], clamp(this.shockE * reach * reach * 0.4));
      ctx.lineWidth = (0.6 + this.shockE * 1.4) * reach;
      ctx.beginPath();
      ctx.ellipse(CX, CY, this.shockR, this.shockR * 0.74, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
    this.drawDust(ctx, 0.55);
    this.modernFinish(ctx, 0.34);
  }
}

// ---------------------------------------------------------------------------
// GLASS BLOB EQUALIZER — the Windows Media Player homage.
//
// Not to be confused with LIQUID CHROME, which orbits five SEPARATE glowing
// blobs. This one is a single fused surface with a bargraph behind it, which is
// the actual WMP silhouette.
//
// The surface is a real metaball isosurface, marched RADIALLY: 96 rays out from
// the centre, each walked until the field crosses the threshold. A per-pixel
// raymarch would be the textbook approach and is what the modern references all
// do, but it costs roughly twenty times the Julia dive's per-pixel kernel and
// then has to be upscaled from a small buffer — soft edges, which is the exact
// opposite of the crisp glass the look depends on. Marching outward instead
// yields an ordered closed loop that smooths into a spline and stays sharp at
// any device density, for a fraction of the arithmetic.
//
// The one thing it cannot do is let a lobe break off and float away, because
// every radius is single-valued from the centre. That is an acceptable trade
// for a body that is meant to hold together anyway.
const BLOB_RAYS = 96;
const BLOB_SAMPLES = 14;
const BLOB_BALLS = 7;
const BLOB_ISO = 1;
const BLOB_MAX_R = 108;
const EQ_BARS = 28;
const EQ_SEGMENTS = 14;
const EQ_GRAVITY = 1.6;
const EQ_HANG = 0.35;
const BLOB_TEMPS = ['#28e0a0', '#ff4fd0', '#ffb347', '#6a5cff'];

class GlassBlobEqualizer extends BaseVisualiser {
  constructor(seed, track) {
    super(seed, track);
    this.name = VISUALISER_NAMES[19];
    this.blobRng = this.rng.stream('glass-blob');
    this.balls = Array.from({ length: BLOB_BALLS }, () => ({
      ang: this.blobRng.float() * TAU,
      rate: 0.16 + this.blobRng.float() * 0.4,
      // Spread matters more than it looks. Clustered tight against the centre
      // every ball's falloff overlaps every other, the field goes radially
      // symmetric and the marched surface comes out a circle — which is a lot
      // of arithmetic to arrive at something arc() draws for free. Pushed out
      // to a good fraction of the radius, the lobes actually read.
      dist: 18 + this.blobRng.float() * 46,
      weight: 300 + this.blobRng.float() * 520,
      seed: this.blobRng.float() * 30,
      x: 0,
      y: 0,
    }));
    // Preallocated: the contour is rebuilt every frame and must not allocate.
    this.radii = new Float32Array(BLOB_RAYS);
    this.peaks = new Float32Array(EQ_BARS);
    this.peakVel = new Float32Array(EQ_BARS);
    this.peakHold = new Float32Array(EQ_BARS);
    this.bars = new Float32Array(EQ_BARS);
    this.rippleT = 0;
    this.rippleE = 0;
    this.temp = 0;
    this.spec = 0;
    this.trebleEnv = 0.15;
    this.radius = 52;
  }

  // One bar of the graph. Deliberately not spectrumValue(): that walks the bins
  // linearly, and this song's energy all lives in the bottom eighth of them, so
  // a linear bargraph lights its first few columns and leaves two thirds of the
  // width permanently dead. Bars are spaced logarithmically the way every real
  // analyser spaces them, which is also how the ear spaces them.
  bandValue(i) {
    const spectrum = this.analysis?.spectrum;
    if (!spectrum || !spectrum.length) return 0.25 + 0.2 * Math.sin(this.t * 2 + i * 0.7);
    const lo = Math.pow(spectrum.length, i / EQ_BARS) - 1;
    const hi = Math.pow(spectrum.length, (i + 1) / EQ_BARS) - 1;
    const from = Math.min(spectrum.length - 1, Math.floor(lo));
    const to = Math.min(spectrum.length, Math.max(from + 1, Math.ceil(hi)));
    let peak = 0;
    for (let k = from; k < to; k++) if (spectrum[k] > peak) peak = spectrum[k];
    return peak / 255;
  }

  field(x, y) {
    let sum = 0;
    for (const b of this.balls) {
      const dx = x - b.x; const dy = y - b.y;
      sum += b.weight / (dx * dx + dy * dy + 24);
    }
    return sum;
  }

  update(dt, a) {
    super.update(dt, a);
    const step = clamp(dt, 0, 1 / 20);
    this.radius += ((46 + this.bass * 30) - this.radius) * clamp(step * 3, 0, 1);
    for (const b of this.balls) {
      b.ang += step * b.rate * this.motion;
      const wob = valueNoise3(b.seed, this.flow * 0.5, b.seed * 0.5) - 0.5;
      const d = b.dist * (1 + wob * 0.5);
      b.x = Math.cos(b.ang + this.ringRotation) * d;
      b.y = Math.sin(b.ang + this.ringRotation) * d * 0.82;
    }
    // Ripples ride the kit, so a section arranged without drums stops wobbling
    // and just floats.
    this.rippleT += step;
    this.rippleE = Math.max(this.rippleE - step * 2.4, this.pulse * 0.9 + this.hit * 0.5);
    const trebleJump = Math.max(0, this.treble - this.trebleEnv);
    this.trebleEnv += (this.treble - this.trebleEnv) * clamp(step * 7, 0, 1);
    this.spec = Math.max(this.spec - step * 7, trebleJump * 6);
    this.temp = clamp(this.temp + trebleJump * 0.9 - step * 0.12);
    for (let i = 0; i < EQ_BARS; i++) {
      const v = clamp(this.bandValue(i));
      this.bars[i] = v;
      // Hardware bargraph behaviour: snap up, hang, then accelerate down. A
      // linear fall reads as a slider; the hang and the acceleration are what
      // make it read as a physical cap dropping.
      if (v > this.peaks[i]) {
        this.peaks[i] = v;
        this.peakVel[i] = 0;
        this.peakHold[i] = EQ_HANG;
      } else if (this.peakHold[i] > 0) {
        this.peakHold[i] -= step;
      } else {
        this.peakVel[i] += EQ_GRAVITY * step;
        this.peaks[i] = Math.max(0, this.peaks[i] - this.peakVel[i] * step);
      }
    }
    // Marched here rather than in draw(): it depends on nothing but the state
    // settled above, and a cross-fade frame that painted this preset twice
    // would otherwise march the whole surface twice for identical numbers.
    this.buildContour();
  }

  // March each ray outward and take the first crossing of the threshold. The
  // ripple is applied to the THRESHOLD rather than to the ball positions: that
  // wobbles the skin like jelly without the balls visibly swimming about.
  buildContour() {
    const scale = this.radius / 52;
    for (let i = 0; i < BLOB_RAYS; i++) {
      const ang = (i / BLOB_RAYS) * TAU;
      const cos = Math.cos(ang); const sin = Math.sin(ang) * 0.86;
      const ripple = Math.sin(ang * 3 + this.rippleT * 7) * this.rippleE * 0.3
        + Math.sin(ang * 5 - this.rippleT * 4.4) * this.rippleE * 0.18;
      const iso = BLOB_ISO * (1 - ripple);
      let lo = 4; let hi = BLOB_MAX_R * scale;
      let found = hi;
      for (let s = 1; s <= BLOB_SAMPLES; s++) {
        const r = (s / BLOB_SAMPLES) * hi;
        if (this.field(cos * r, sin * r) < iso) { found = r; lo = ((s - 1) / BLOB_SAMPLES) * hi; break; }
      }
      // One bisection pass off the bracketing samples. The march is coarse on
      // purpose and this is what keeps the outline from stepping.
      for (let k = 0; k < 4; k++) {
        const mid = (lo + found) * 0.5;
        if (this.field(cos * mid, sin * mid) < iso) found = mid; else lo = mid;
      }
      this.radii[i] = found;
    }
  }

  // Catmull-Rom through the marched points, emitted as cubic Beziers. The loop
  // is closed by construction, so the wrap-around indices just work.
  contourPath(ctx, grow = 0, dy = 0) {
    const pt = (i) => {
      const k = ((i % BLOB_RAYS) + BLOB_RAYS) % BLOB_RAYS;
      const ang = (k / BLOB_RAYS) * TAU;
      const r = this.radii[k] + grow;
      return [CX + Math.cos(ang) * r, CY + Math.sin(ang) * r * 0.86 + dy];
    };
    ctx.beginPath();
    const [sx, sy] = pt(0);
    ctx.moveTo(sx, sy);
    for (let i = 0; i < BLOB_RAYS; i++) {
      const [x0, y0] = pt(i - 1);
      const [x1, y1] = pt(i);
      const [x2, y2] = pt(i + 1);
      const [x3, y3] = pt(i + 2);
      ctx.bezierCurveTo(
        x1 + (x2 - x0) / 6, y1 + (y2 - y0) / 6,
        x2 - (x3 - x1) / 6, y2 - (y3 - y1) / 6,
        x2, y2);
    }
    ctx.closePath();
  }

  drawGrid(ctx) {
    const horizon = H * 0.58;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(this.palette[0], 0.1 + this.mid * 0.1);
    ctx.lineWidth = 0.6;
    for (let i = 0; i < 15; i++) {
      const z = (i + ((this.beat * 0.25) % 1)) / 15;
      const y = horizon + Math.pow(z, 1.8) * (H - horizon);
      ctx.globalAlpha = (1 - z) * 0.5 * this.frameAlpha;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.globalAlpha = 0.28 * this.frameAlpha;
    for (let i = -8; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(this.focusX + i * 6, horizon);
      ctx.lineTo(CX + i * 58, H);
      ctx.stroke();
    }
    ctx.globalAlpha = this.frameAlpha;
    ctx.restore();
  }

  // Inset from the bottom, not flush to it: in fullscreen the canvas is
  // cover-cropped and a bargraph on the edge is the first thing a tall phone
  // eats.
  drawEqualizer(ctx) {
    const bottom = H - 26;
    const height = 74;
    const slot = W / (EQ_BARS + 2);
    const barW = slot * 0.66;
    const left = slot;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const bright = 0.3 + this.mid * 0.5;
    for (let i = 0; i < EQ_BARS; i++) {
      const x = left + i * slot;
      const v = this.bars[i];
      // Three zone rects rather than fourteen segment rects, with one grille
      // laid over the lot below. Same picture, a third of the fills.
      const zones = [
        [0, 0.55, this.palette[0]],
        [0.55, 0.82, this.palette[2] || this.palette[1]],
        [0.82, 1, '#ff5f6d'],
      ];
      for (const [from, to, hex] of zones) {
        if (v <= from) continue;
        const top = Math.min(v, to);
        const y0 = bottom - top * height;
        const y1 = bottom - from * height;
        ctx.fillStyle = rgba(hex, bright);
        ctx.fillRect(x, y0, barW, y1 - y0);
      }
      const py = bottom - this.peaks[i] * height;
      ctx.fillStyle = rgba('#ffffff', 0.5 + this.treble * 0.4);
      ctx.fillRect(x, py - 1.5, barW, 1.6);
    }
    ctx.restore();
    // The grille: dark lines across the whole block, which is what turns a
    // solid bar into lit segments.
    ctx.save();
    ctx.fillStyle = 'rgba(4,7,12,0.85)';
    for (let s = 1; s < EQ_SEGMENTS; s++) {
      const y = bottom - (s / EQ_SEGMENTS) * height;
      ctx.fillRect(left, y - 0.6, W - left * 2 + barW, 1.2);
    }
    ctx.restore();
  }

  drawBlob(ctx) {
    const hexA = BLOB_TEMPS[Math.floor(this.temp * 3.999) % BLOB_TEMPS.length];
    const hexB = BLOB_TEMPS[(Math.floor(this.temp * 3.999) + 1) % BLOB_TEMPS.length];
    const body = mixHex(hexA, hexB, (this.temp * 4) % 1);
    // Contact shadow, so the glass sits in the scene instead of floating on it.
    ctx.save();
    this.contourPath(ctx, 1.5, 4);
    ctx.fillStyle = 'rgba(2,4,8,0.4)';
    ctx.fill();
    ctx.restore();
    ctx.save();
    this.contourPath(ctx);
    const g = ctx.createLinearGradient(CX - 70, CY - 60, CX + 70, CY + 60);
    g.addColorStop(0, rgba(body, 0.9));
    g.addColorStop(0.55, rgba(mixHex(body, '#04060c', 0.45), 0.86));
    g.addColorStop(1, rgba(mixHex(body, '#000000', 0.7), 0.9));
    ctx.fillStyle = g;
    ctx.fill();
    // Subsurface scatter: light bleeding through the thin side, offset away
    // from the key.
    ctx.globalCompositeOperation = 'lighter';
    const sss = ctx.createRadialGradient(CX - 22, CY - 20, 3, CX - 10, CY - 6, this.radius * 1.5);
    sss.addColorStop(0, rgba('#ffffff', 0.5));
    sss.addColorStop(0.35, rgba(body, 0.3));
    sss.addColorStop(1, rgba(body, 0));
    ctx.fillStyle = sss;
    ctx.fill();
    ctx.restore();
    // Clipped passes: the specular band and the chrome sweep both need to stop
    // at the silhouette.
    ctx.save();
    this.contourPath(ctx);
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    const spec = ctx.createLinearGradient(CX - 60, CY - 62, CX + 20, CY - 6);
    spec.addColorStop(0, rgba('#ffffff', 0));
    spec.addColorStop(0.5, rgba('#ffffff', 0.28 + clamp(this.spec) * 0.5));
    spec.addColorStop(1, rgba('#ffffff', 0));
    ctx.fillStyle = spec;
    ctx.fillRect(CX - 130, CY - 130, 260, 260);
    const sweepAng = this.flow * 0.3;
    const chrome = ctx.createLinearGradient(
      CX + Math.cos(sweepAng) * -90, CY + Math.sin(sweepAng) * -90,
      CX + Math.cos(sweepAng) * 90, CY + Math.sin(sweepAng) * 90);
    chrome.addColorStop(0, rgba('#000000', 0));
    chrome.addColorStop(0.42, rgba(this.palette[1], 0.16));
    chrome.addColorStop(0.52, rgba('#ffffff', 0.3));
    chrome.addColorStop(0.62, rgba(this.palette[0], 0.16));
    chrome.addColorStop(1, rgba('#000000', 0));
    ctx.fillStyle = chrome;
    ctx.fillRect(CX - 130, CY - 130, 260, 260);
    ctx.restore();
    // Rim, then the same rim twice more nudged apart in cyan and magenta. Two
    // extra strokes is all the dispersion needs to read.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    this.contourPath(ctx);
    ctx.strokeStyle = rgba('#ffffff', 0.4 + clamp(this.spec) * 0.4);
    ctx.lineWidth = 0.9;
    ctx.stroke();
    const split = 0.6 + this.treble * 1.1;
    this.contourPath(ctx, split);
    ctx.strokeStyle = rgba('#4df0ff', 0.1 + this.treble * 0.3);
    ctx.lineWidth = 0.7;
    ctx.stroke();
    this.contourPath(ctx, -split);
    ctx.strokeStyle = rgba('#ff4de0', 0.1 + this.treble * 0.3);
    ctx.stroke();
    ctx.restore();
  }

  draw(ctx) {
    this.backdrop(ctx, '#0d1219', '#04060b');
    this.drawGrid(ctx);
    this.drawEqualizer(ctx);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    this.glowDot(ctx, CX, CY, this.radius * 2.1, this.palette[0], 0.1 + this.mid * 0.16);
    ctx.restore();
    this.drawBlob(ctx);
    this.drawDust(ctx, 0.5);
    this.modernFinish(ctx, 0.22);
  }
}

// ---------------------------------------------------------------------------
// HALF-PIPE HORIZON — the camera down inside a checkered trough, flying forward.
//
// A homage to the faux-3D special stages: sky above the lip, a checkerboard
// wrapping up both walls, rings and spheres rushing past, and the whole horizon
// rolling into a banked turn every few phrases. The pack already had a particle
// cloud with a real camera and a flat horizon grid; nothing in it had put the
// viewer INSIDE a surface and flown it forward.
//
// The geometry is a trick worth stating plainly, because it is what makes this
// cheap. Every point of the trough sits at (theta, z) on a cylinder, and the
// perspective divide scales x and y by the same k = FOV / (FOV + z). A circle
// scaled uniformly is still a circle, and rolling the frame about the vanishing
// point turns a circle into a circle too — so each constant-depth row of the
// pipe lands on screen as a plain CIRCULAR ARC of radius R*k. The whole pipe
// draws with ctx.arc rather than as a subdivided quad mesh: no faceting on the
// near end where the cells are 70px wide, no hairline seams between neighbours,
// and a couple of hundred path points a frame instead of a couple of thousand.
//
// Row depth is chosen in SCREEN space the way LASER GRID picks its grid lines,
// not evenly in z. Even-in-z is the technically honest perspective and it looks
// wrong here: it spends twelve of eighteen rows on sub-pixel slivers stacked at
// the horizon, which shimmer as they scroll and buy nothing. A power curve on k
// spreads the rows from about 1.6px at the vanishing point to 11px at the bottom
// of the frame, which is what the eye actually reads as depth.
// ---------------------------------------------------------------------------

const PIPE_R = 300;
const PIPE_FOV = 420;
// The vanishing point. Everything converges here and the bank rolls about it,
// so it is the one fixed landmark in the frame.
const PIPE_HORIZON = 104;
// How close the vanishing point is ever allowed to get to an edge of the logical
// frame. The bend swings that point around (CX, PIPE_HORIZON), and `roll` carries
// the corkscrew as well as the bank — so at a full turn it ORBITS the anchor at
// the bend's radius. With only 104px of headroom above the horizon, the default
// bend of 118 already put it off the top of the frame during a screw. The cap
// below keeps it inside this inset, whatever the roll is doing.
const PIPE_EDGE_MARGIN = 34;
// How far the picture's CONTENTS fade back when a song quietens, as opposed to how
// far the ride slows. `motion` already handles the speed — but the rings, gates and
// wall lights were driven entirely by the beat, so through a fade they went on
// flashing at full strength over a pipe that was visibly slowing down. Presence is
// the missing half: what is on the ride recedes with the song instead of only what
// the ride is doing. Floored, like motion is, because a picture that goes to
// nothing reads as a fault rather than as an ending.
const PIPE_PRESENCE_FLOOR = 0.28;
const PIPE_PRESENCE_EASE = 1.6;
const PIPE_LIMIT_EASE = 1.8;
// Eye height above the trough floor, as a fraction of the way up a lip that
// stands 1.31 radii tall. Low enough to be down IN the pipe rather than flying
// over it, high enough that the far trough stays visible through a turn.
const PIPE_CAM_H = 175;
// 75 degrees either side of the trough, which puts the lip R*(1-cos) = 222 units
// above the floor against an eye at 175 — just over the viewer's head. This is
// the number that decides whether the scene is a half-pipe or a tunnel: past
// about 90 degrees the walls curve back OVER the camera, the sky closes to a
// narrow wedge, and the whole thing reads as a funnel being flown down.
const PIPE_THETA = 1.31;
const PIPE_COLS = 12;
// How far the trough sits in its own shadow, and how much the lips catch the sky.
// The pair is what makes the barrel read as round; turned off, the pipe is the flat
// ribbon it used to be.
const PIPE_TROUGH_SHADE = 0.42;
const PIPE_LIP_LIFT = 0.1;
const PIPE_ROWS = 18;
// Rows carried on PAST the near boundary. Each row is a circle, so the surface
// stops at an arc that curves back up before it reaches the bottom corners of
// the frame — and the wall beside the camera, which is what belongs in those
// corners, lives on rows the ladder would otherwise never reach. Eight extra
// rows carry the arc to a radius of 560px, well outside the frame diagonal.
// They are enormous and almost entirely clipped, which is why they are cheap.
const PIPE_OVER = 8;
const PIPE_TOTAL = PIPE_ROWS + PIPE_OVER;
const PIPE_K_MAX = 0.96;
const PIPE_DEPTH_POW = 1.8;
// Checker rows per beat. The ride is locked to the song's own tempo rather than
// to wall time, so a slow track cruises and a fast one rushes. At 128bpm this is
// a row every five frames, and a checker period every nine — a row crosses the
// whole eighteen-row ladder in three beats. The ceiling is aliasing: the pattern
// would start to crawl backwards somewhere past a row per two frames, which is
// four times quicker than this.
const PIPE_ROWS_PER_BEAT = 7;
// Lateral bend at the horizon, in screen pixels. Expressed in screen space on
// purpose: the racer-style `curve * z * z` grows without bound as z runs to the
// vanishing point, which would throw the far end of the track off the frame.
const PIPE_BEND = 168;
const PIPE_BEND_POW = 2.2;
const PIPE_ROLL_MAX = 0.6;
const PIPE_BANK_EASE = 1.5;
// Twice the rate the ride opened at. Sixteen and thirty-two beats read as a
// track that mostly runs straight; on eight and sixteen the path is always
// going somewhere, which is what the special stages actually feel like.
const PIPE_BANK_HOLDS = [8, 16];
// Corkscrews. Every so often the track stops banking and simply rolls all the
// way over, following a helix of rings around the inside of the barrel. The
// geometry gets this for free: every row is a circle drawn about the vanishing
// point, so a roll of TAU is no more work than a roll of 0.2.
// On the bar grid like everything else, but drawn from three lengths rather than
// two so a screw keeps drifting in and out of phase with the banking instead of
// always arriving on the same boundary as a turn.
const PIPE_SPIRAL_HOLDS = [8, 16, 24];
// One ring of a corkscrew trail: how far back down the pipe the next ring sits,
// and how far round the barrel it has wound by the time it gets there.
const PIPE_TRAIL_STRIDE = 0.068;
const PIPE_TRAIL_WIND = 0.42;
const PIPE_SPIRAL_BEATS = 8;
// How far the ring trail winds between the horizon and the lens during one.
const PIPE_HELIX = 1.5;
const PIPE_HELIX_EASE = 1.6;
// The colour walk runs on its own clock, half the bank's, so the scheme and the
// turns drift in and out of phase instead of always landing together.
const PIPE_SCHEME_HOLDS = [8, 16];
const PIPE_SCHEME_EASE = 0.55;
const PIPE_SCHEME_KEYS = ['sky', 'haze', 'dark', 'light', 'lip', 'sun'];
// Steps the blend is quantised to before it reaches glowSprite. A tint that
// drifted continuously would bake a fresh canvas every frame and thrash the
// cache the code rain and the nebula share; six steps is invisible at these
// sizes and holds the map to a fixed handful.
const PIPE_TINT_STEPS = 6;
const PIPE_GROUPS = 10;
// Sized for the biggest formation, not the average one: a full ring of rings
// wants sixteen points around the barrel. Most groups use three or four of these
// slots, and `count` is what the painter walks — the rest cost an array entry.
const PIPE_PER_GROUP = 16;
const PIPE_OBJ_LIFT = 34;
const PIPE_OBJ_SIZE = 26;
const PIPE_GATES = 4;
const PIPE_MOTES = 210;
// Longest streak a mote may draw. The outer ones ride nearly three radii out, so
// as they pass the lens their screen radius can move most of the frame's width
// in a single frame — a true motion blur, and a hard diagonal scratch across the
// picture. The cap keeps the streak reading as speed instead of as a scratch.
const PIPE_MOTE_STREAK = 34;
// ---------------------------------------------------------------------------
// What the desk is allowed to turn.
//
// Every value here is the preset's own shipped number, so a lab instance built
// with the defaults is the shipped preset — not a near copy of it, the same
// picture frame for frame. tests/visualisers.js holds that claim.
//
// The three interval knobs read 0 as AUTO and -1 as OFF rather than as a number
// of beats. AUTO leaves the seeded schedule alone, drawing from the rng stream
// exactly as it always did, which is what makes the default identical rather
// than merely similar.
// ---------------------------------------------------------------------------
// About two thirds of a second from one end of the knob's range to the other.
const PIPE_WIDTH_EASE = 3;
// Smootherstep: zero first AND second derivative at both ends, so a move that uses
// it has nothing to jerk at either edge and still arrives at its target instead of
// forever approaching it. The turns run on this; so does the width drift.
const sCurve = (t) => t * t * t * (t * (t * 6 - 15) + 10);
// How long the pipe holds a width before drifting to another — the same two or
// four bars the bank and the colour walk run on, so everything that changes about
// the ride changes on a musical boundary you can hear coming.
const PIPE_WIDTH_HOLDS = [8, 16];
// The outer bounds of the drift, in absolute half-angle. Below the minimum the
// checker stops reading as a pipe you are inside and becomes a strip down the
// middle of the frame; above the maximum the barrel opens out past the frame and
// the far wall stops being visible at all. PIPE WIDTH sits between them as the
// width the ride KEEPS COMING BACK TO, not as a limit.
// How much of the ride's pace comes from a fixed reference rather than from the
// song's own tempo. Straight beat-rate meant an 80bpm track travelled at two
// thirds the speed of a 120bpm one and read as crawling — the pipe is a journey,
// and a journey has a pace of its own that the music rides on top of. Blending
// toward 2.0 beats/s (120bpm) lifts the slow tracks much more than it touches the
// fast ones, which is exactly where the problem was.
const PIPE_RATE_REFERENCE = 2.0;
const PIPE_RATE_ANCHOR = 0.4;
// How often the drift simply returns to the knob instead of picking a new width.
// Too high and the pipe reads as one size with occasional excursions; too low and
// the knob stops meaning anything.
const PIPE_WIDTH_HOME = 0.18;
const PIPE_WIDTH_MIN = 0.5;
const PIPE_WIDTH_MAX = 2.0;
const PIPE_AUTO = 0;
const PIPE_OFF = -1;
const PIPE_TUNE = {
  speed: PIPE_ROWS_PER_BEAT,
  rings: PIPE_GROUPS,
  streaks: PIPE_MOTES,
  turnEvery: PIPE_AUTO,
  turnAmount: 1,
  turnEase: 0.55,
  depth: 1,
  settle: 1,
  widthDrift: 0.7,
  screwEvery: PIPE_AUTO,
  colourEvery: PIPE_AUTO,
  width: PIPE_THETA,
  columns: PIPE_COLS,
};
export const HALF_PIPE_CONTROLS = [
  { key: 'speed', label: 'SPEED', min: 0.5, max: 16, step: 0.5 },
  { key: 'rings', label: 'RINGS', min: 0, max: 26, step: 1 },
  { key: 'streaks', label: 'SKY', min: 0, max: 480, step: 30 },
  { key: 'screwEvery', label: 'CORKSCREW', min: PIPE_OFF, max: 64, step: 4, unit: 'beats' },
  { key: 'turnEvery', label: 'TURN EVERY', min: PIPE_OFF, max: 48, step: 4, unit: 'beats' },
  { key: 'turnAmount', label: 'TURN HARD', min: 0, max: 2.4, step: 0.2 },
  // What fraction of the phrase is spent TURNING, the rest being held over at full
  // lean. Low is a quick decisive move into a long hold; 1 is turning continuously
  // and never sitting in a corner.
  { key: 'turnEase', label: 'TURN TIME', min: 0.15, max: 1, step: 0.05 },
  // Cross-barrel shading. 0 is the flat ribbon; above 1 the trough goes deeper
  // than a real half-pipe would, which is sometimes the more striking picture.
  { key: 'depth', label: 'DEPTH', min: 0, max: 2, step: 0.1 },
  // How much the picture fades back as a song quietens. 0 keeps every ring at
  // full strength through a fade-out, which is what it used to do.
  { key: 'settle', label: 'SETTLE', min: 0, max: 1.6, step: 0.1 },
  // How far either side of PIPE WIDTH the tube may wander, as a fraction of the
  // room between it and the hard bounds. 0 holds the knob's width for ever; 1 can
  // reach 0.5 and 2.0, though the bell draw means it rarely does.
  { key: 'widthDrift', label: 'WIDTH DRIFT', min: 0, max: 1, step: 0.05 },
  { key: 'colourEvery', label: 'COLOUR', min: PIPE_OFF, max: 48, step: 4, unit: 'beats' },
  { key: 'width', label: 'PIPE WIDTH', min: 0.5, max: 2.7, step: 0.1 },
  { key: 'columns', label: 'CHECKS', min: 4, max: 26, step: 2 },
];
export const HALF_PIPE_DEFAULTS = () => ({ ...PIPE_TUNE });
// How far past the near boundary something rides before it is recycled. u = 1 is
// the lens, and a ring there is still visible down in the trough.
const PIPE_PAST_LENS = 1.1;
const PIPE_SCHEMES = [
  { sky: '#0a1b46', haze: '#20408c', dark: '#13398a', light: '#e2ecff', lip: '#8fd6ff', sun: '#ffd166' },
  { sky: '#28093c', haze: '#5a1c74', dark: '#6b1f8f', light: '#ffe6fb', lip: '#ff70c8', sun: '#ffb3f0' },
  { sky: '#032329', haze: '#0b5c58', dark: '#0d6d6a', light: '#dcfff4', lip: '#48e0c8', sun: '#d7ff83' },
  { sky: '#360e12', haze: '#8c2430', dark: '#a12a35', light: '#ffe9d6', lip: '#ffd166', sun: '#ff7b5c' },
  { sky: '#1a0836', haze: '#472a9c', dark: '#4a2fb0', light: '#e8e2ff', lip: '#b388ff', sun: '#63f3ff' },
  { sky: '#03301c', haze: '#12734a', dark: '#158552', light: '#e6ffe8', lip: '#d7ff83', sun: '#fff1a8' },
  { sky: '#2e1503', haze: '#96550f', dark: '#ad620f', light: '#fff3dd', lip: '#ffb347', sun: '#fff1a8' },
];

class HalfPipeHorizon extends BaseVisualiser {
  constructor(seed, track, tune) {
    super(seed, track);
    this.name = VISUALISER_NAMES[20];
    // Merged rather than replaced: a desk that knows about six knobs must not be
    // able to drop the four it has not heard of.
    this.tune = { ...PIPE_TUNE, ...(tune || null) };
    // The live half-angle, which chases the knob rather than being it. Every arc
    // in the frame is drawn from this, so a step change would deform the whole
    // pipe between one frame and the next — and a checkerboard that jumps width
    // reads as a glitch rather than as an adjustment. Seeded to the target so an
    // untouched instance never eases at all.
    this.width = this.tune.width;
    // The knob is the CEILING, and the drift only ever narrows from it. Held as a
    // fraction so turning PIPE WIDTH down still means what it says.
    this.widthBase = this.tune.width;
    this.widthFrom = 1;
    this.widthTarget = 1;
    this.widthFromBeat = 0;
    this.widthHold = PIPE_WIDTH_HOLDS[0];
    this.pipeRng = this.rng.stream('half-pipe');
    this.bankRng = this.rng.stream('half-pipe-bank');
    this.schemeRng = this.rng.stream('half-pipe-scheme');
    // Its own stream, like every other schedule here: sharing one would make the
    // width drift reshuffle the turns, and two rides with the same seed would stop
    // matching the moment either changed.
    this.widthRng = this.rng.stream('half-pipe-width');
    this.widthNextBeat = this.nextHold(this.widthRng, PIPE_WIDTH_HOLDS, 0);
    // The scheme is a walk, not a fixture. A single palette held for the whole
    // record turns a nine-minute jukebox sit into one picture; blending to the
    // next one every eight or sixteen beats makes the ride travel somewhere.
    this.schemeIndex = this.schemeRng.int(0, PIPE_SCHEMES.length - 1);
    this.schemeFrom = { ...PIPE_SCHEMES[this.schemeIndex] };
    this.schemeTo = PIPE_SCHEMES[this.schemeIndex];
    this.schemeBlend = 1;
    this.schemeNextBeat = this.nextHold(this.schemeRng, PIPE_SCHEME_HOLDS, this.tune.colourEvery);
    this.scheme = { ...this.schemeFrom };
    this.palette = [this.scheme.lip, this.scheme.light, this.scheme.sun, this.scheme.dark];
    // Six tints: two off the live scheme's own sun and lip, two white-hot
    // versions of those, and two off a scheme three steps along the walk — a
    // colour the picture is deliberately NOT wearing, so the orbs read against
    // the checker instead of disappearing into it.
    this.tints = ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'];
    this.altIndex = (this.schemeIndex + 3) % PIPE_SCHEMES.length;
    this.altFrom = { sun: PIPE_SCHEMES[this.altIndex].sun, lip: PIPE_SCHEMES[this.altIndex].lip };
    this.altTo = PIPE_SCHEMES[this.altIndex];
    this.applyScheme();
    this.beatRate = Math.max(0.6, (this.track.bpm || 112) / 60);
    this.scroll = 0;
    this.rowRate = 0;
    // A phrase clock of its own. `beat` restarts every time a jukebox song
    // loops, and a schedule read straight off it would either stall for a whole
    // song or fire a turn on every wrap.
    this.phraseBeat = 0;
    this.bankNextBeat = this.nextHold(this.bankRng, PIPE_BANK_HOLDS, this.tune.turnEvery);
    this.bankTarget = 0;
    this.curve = 0;
    // The bend's angular velocity. A spring needs somewhere to keep it, and
    // starting it at zero is exactly what makes a corner ease IN.
    this.bankFrom = 0;
    this.bankFromBeat = 0;
    this.bankHold = PIPE_BANK_HOLDS[0];
    this.bankRoll = 0;
    this.presence = 1;
    this.bendAmp = 0;
    this.bendLimit = PIPE_BEND * 4;
    this.roll = 0;
    this.spiralRng = this.rng.stream('half-pipe-spiral');
    // Whole turns of the barrel, accumulated. Kept separate from the bank so the
    // bank stays a bounded lean and this stays an unbounded count of rolls, and
    // so a test can tell a corkscrew from an over-enthusiastic corner.
    this.spiral = 0;
    this.spiralFrom = 0;
    this.spiralTo = 0;
    this.spiralBeat = 0;
    this.spiralDir = 1;
    this.spiralActive = false;
    this.spirals = 0;
    this.spiralNextBeat = this.nextHold(this.spiralRng, PIPE_SPIRAL_HOLDS, this.tune.screwEvery);
    this.helix = 0;
    this.trailMode = false;
    this.rollCos = 1;
    this.rollSin = 0;
    this.rows = Array.from({ length: PIPE_TOTAL + 1 }, () => ({ cx: CX, cy: PIPE_HORIZON, r: 0, k: 0, u: 0 }));
    this.cellDark = new Array(PIPE_TOTAL).fill(this.scheme.dark);
    this.cellLight = new Array(PIPE_TOTAL).fill(this.scheme.light);
    this.parityBase = 0;
    this.groups = Array.from({ length: Math.max(0, Math.round(this.tune.rings)) }, (_, g, all) => {
      const group = {
        u: (g + 0.5) / Math.max(1, Math.round(this.tune.rings)),
        kind: 0, count: 0, span: 0, centre: 0, spin: 0, spinRate: 0, tint: 0, stride: 0, wind: 0,
        sx: new Array(PIPE_PER_GROUP).fill(CX),
        sy: new Array(PIPE_PER_GROUP).fill(PIPE_HORIZON),
        ss: new Array(PIPE_PER_GROUP).fill(0),
        // Per-member fade. The brightness used to be one number for the whole
        // group, which is why a trail could be deleted at full strength.
        sf: new Array(PIPE_PER_GROUP).fill(0),
      };
      this.seedGroup(group);
      return group;
    });
    this.halfPulse = 0;
    // Sky motes. These live in PIPE space, not screen space, which is the whole
    // point: they roll with the barrel through a corkscrew and streak past the
    // lens like everything else, where a screen-space starfield would sit dead
    // still while the world turned over. They ride outside the tube radius, and
    // they are painted UNDER the pipe — so the surface occludes the ones that
    // are behind it for free, and only the sky keeps its stars.
    this.motes = Array.from({ length: Math.max(0, Math.round(this.tune.streaks)) }, () => ({
      u: 0, theta: 0, rho: 0, speed: 1, hue: 0, x: 0, y: 0, px: 0, py: 0, k: 0,
    }));
    this.motes.forEach((m, i) => { this.seedMote(m); m.u = (i + 0.5) / this.motes.length; });
    this.gates = Array.from({ length: PIPE_GATES }, () => ({ u: 0, punch: 0, cx: CX, cy: PIPE_HORIZON, r: 0, k: 0 }));
    // Scratch for update()'s own projections. draw() reads the results and
    // writes nothing: the video renderer's workers replay update() alone to
    // reach a frame, so a field touched during a paint would desync a segment.
    this.scratch = { cx: 0, cy: 0, r: 0, k: 0, u: 0 };
  }

  /**
   * How long until the next event on one of the seeded schedules. AUTO draws from
   * the rng exactly as the shipped preset does — which is why an untouched lab
   * instance is not merely similar to it but identical. OFF parks the schedule
   * past any song, so nothing fires and nothing is drawn from the stream either.
   */
  nextHold(rng, holds, every) {
    if (every === PIPE_OFF) return Number.MAX_SAFE_INTEGER;
    return every > 0 ? every : rng.pick(holds);
  }

  applyScheme() {
    const t = smooth(clamp(this.schemeBlend));
    for (const key of PIPE_SCHEME_KEYS) {
      this.scheme[key] = mixHex(this.schemeFrom[key], this.schemeTo[key], t);
    }
    this.palette[0] = this.scheme.lip;
    this.palette[1] = this.scheme.light;
    this.palette[2] = this.scheme.sun;
    this.palette[3] = this.scheme.dark;
    // The ring and sphere tints come off a QUANTISED blend rather than the live
    // one: these are the only colours that reach glowSprite's baked-canvas cache.
    const q = Math.round(t * PIPE_TINT_STEPS) / PIPE_TINT_STEPS;
    const sun = mixHex(this.schemeFrom.sun, this.schemeTo.sun, q);
    const lip = mixHex(this.schemeFrom.lip, this.schemeTo.lip, q);
    this.tints[0] = sun;
    this.tints[1] = mixHex(sun, '#ffffff', 0.45);
    this.tints[2] = lip;
    this.tints[3] = mixHex(lip, '#ffffff', 0.45);
    // The contrast pair walks alongside on the same blend, so it never steps.
    this.tints[4] = mixHex(this.altFrom.sun, this.altTo.sun, q);
    this.tints[5] = mixHex(this.altFrom.lip, this.altTo.lip, q);
  }

  /**
   * Take a changed knob while the picture is running. Pools grow and shrink in
   * place rather than being rebuilt, so turning the ring count up does not
   * restart the ones already on their way down the pipe — the desk is meant to be
   * played with while the song is going, and a rebuild on every click would be a
   * strobe. The schedules are re-armed from the CURRENT phrase beat, so a change
   * lands within a bar instead of whenever the old hold happened to run out.
   */
  applyTune(next) {
    const before = this.tune;
    this.tune = { ...this.tune, ...(next || null) };
    this.resizePool(this.groups, this.tune.rings, () => {
      const group = {
        u: this.pipeRng.float(), kind: 0, count: 0, span: 0, centre: 0, spin: 0, spinRate: 0,
        tint: 0, stride: 0, wind: 0,
        sx: new Array(PIPE_PER_GROUP).fill(CX),
        sy: new Array(PIPE_PER_GROUP).fill(PIPE_HORIZON),
        ss: new Array(PIPE_PER_GROUP).fill(0),
        // Per-member fade. The brightness used to be one number for the whole
        // group, which is why a trail could be deleted at full strength.
        sf: new Array(PIPE_PER_GROUP).fill(0),
      };
      this.seedGroup(group);
      return group;
    });
    this.resizePool(this.motes, this.tune.streaks, () => {
      const mote = { u: 0, theta: 0, rho: 0, speed: 1, hue: 0, x: 0, y: 0, px: 0, py: 0, k: 0 };
      this.seedMote(mote);
      mote.u = this.pipeRng.float();
      return mote;
    });
    if (this.tune.turnEvery !== before.turnEvery) {
      this.bankNextBeat = this.phraseBeat + this.nextHold(this.bankRng, PIPE_BANK_HOLDS, this.tune.turnEvery);
    }
    if (this.tune.colourEvery !== before.colourEvery) {
      this.schemeNextBeat = this.phraseBeat + this.nextHold(this.schemeRng, PIPE_SCHEME_HOLDS, this.tune.colourEvery);
    }
    if (this.tune.screwEvery !== before.screwEvery) {
      this.spiralNextBeat = this.phraseBeat + this.nextHold(this.spiralRng, PIPE_SPIRAL_HOLDS, this.tune.screwEvery);
    }
    return this.tune;
  }

  resizePool(pool, count, make) {
    const want = Math.max(0, Math.round(count));
    while (pool.length > want) pool.pop();
    while (pool.length < want) pool.push(make());
  }

  seedGroup(group) {
    group.spin = this.pipeRng.float() * TAU;
    group.spinRate = this.pipeRng.range(3.4, 6.2);
    group.stride = 0;
    group.wind = 0;
    group.kind = this.pipeRng.chance(0.5) ? 0 : 1;
    group.count = this.pipeRng.int(3, 5);
    group.span = 0.24;
    group.centre = this.pipeRng.range(-0.3, 0.3);
    if (this.trailMode) {
      // One trail winding around the barrel, laid back down the pipe. This is
      // the thing the roll is following, so it wants to be most of what is on
      // screen; the short clusters are there to keep the field from reading as
      // a single rigid helix and nothing else.
      group.kind = 0;
      if (this.pipeRng.chance(0.72)) {
        group.count = this.pipeRng.int(10, 14);
        group.span = 0;
        group.stride = PIPE_TRAIL_STRIDE;
        group.wind = this.spiralDir * PIPE_TRAIL_WIND;
        group.centre = this.pipeRng.range(-0.4, 0.4);
      } else {
        group.count = this.pipeRng.int(2, 3);
        group.span = 0.3;
        group.centre = this.pipeRng.range(-1, 1);
      }
      group.tint = this.pipeRng.int(0, 3);
      return;
    }
    // Weighted rather than uniform: the complete hoop is the rarest formation in
    // the set. It is the biggest thing the field ever does, and one every dozen
    // groups reads as a set piece where one in six read as wallpaper.
    const roll = this.pipeRng.float();
    if (roll < 0.08) {
      // A complete circle all the way round the barrel — the hoop you fly
      // through rather than a row you fly past. Evenly spaced over a whole turn,
      // so the last slot sits one gap from the first and the circle closes.
      group.kind = 0;
      group.count = PIPE_PER_GROUP;
      group.span = TAU / PIPE_PER_GROUP;
      group.centre = 0;
    } else if (roll < 0.34) {
      // A swarm of orbs down in the trough, thrown wide as it reaches the lens.
      group.kind = 1;
      group.count = this.pipeRng.int(9, 13);
      group.span = this.pipeRng.range(0.26, 0.44);
      group.centre = this.pipeRng.range(-0.6, 0.6);
    } else if (roll < 0.52) {
      // Past the lip entirely, out over the open top of the pipe. Nothing is
      // holding these up — they hang in the sky and sweep overhead as the ride
      // reaches them, which is the one move a closed tunnel could never make.
      group.span = 0.26;
      group.centre = (this.pipeRng.chance(0.5) ? 1 : -1) * this.pipeRng.range(1.6, 2.6);
    } else if (roll < 0.66) {
      // A short trail running back down the pipe, the corkscrew's move used
      // straight: no wind, so it reads as a lane rather than a helix.
      group.count = this.pipeRng.int(6, 9);
      group.span = 0;
      group.stride = PIPE_TRAIL_STRIDE * 0.8;
      group.centre = this.pipeRng.range(-1.1, 1.1);
    } else if (roll < 0.8) {
      group.span = 0.3;
      group.centre = (this.pipeRng.chance(0.5) ? 1 : -1) * this.pipeRng.range(0.8, 1.35);
    } else if (roll < 0.92) {
      group.span = (this.width * 1.7) / Math.max(1, group.count - 1);
      group.centre = 0;
    }
    // Orbs favour the contrast pair; rings stay on the scheme's own metal.
    group.tint = group.kind === 1 && this.pipeRng.chance(0.6)
      ? 4 + this.pipeRng.int(0, 1)
      : this.pipeRng.int(0, 3);
  }

  seedMote(m) {
    m.u = 0.004;
    // Weighted into the open arc above the lip rather than spread evenly round
    // the barrel: an even spread puts half the pool behind the checker, where the
    // surface paints straight over it and the work buys nothing. The quarter that
    // still goes anywhere is what keeps some of them emerging from behind the
    // wall instead of every one hanging in clear air.
    m.theta = this.pipeRng.chance(0.76)
      ? (this.pipeRng.chance(0.5) ? 1 : -1) * this.pipeRng.range(this.width + 0.06, Math.PI)
      : this.pipeRng.range(-Math.PI, Math.PI);
    m.rho = PIPE_R * this.pipeRng.range(1.05, 2.9);
    m.speed = this.pipeRng.range(0.55, 1.35);
    m.hue = this.pipeRng.float();
    m.k = 0;
  }

  drawMotes(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const m of this.motes) {
      if (m.k <= 0) continue;
      // The outer motes spend most of their run far outside the frame; skipping
      // them is most of what this pool costs.
      if (m.x < -40 || m.x > W + 40 || m.y < -40 || m.y > H + 40) continue;
      const a = clamp(m.u * 5) * (0.16 + m.k * 2.4) * (0.5 + this.treble * 0.7);
      if (a < 0.012) continue;
      const tint = this.tints[Math.floor(m.hue * this.tints.length) % this.tints.length];
      // Most of them streak; only the far ones are still points. The streak is
      // the frame's own travel, so it lengthens as they come at you rather than
      // being drawn at some invented length.
      if (m.k > 0.05) {
        ctx.strokeStyle = rgba(tint, a);
        ctx.lineWidth = 0.4 + m.k * 2.2;
        ctx.beginPath(); ctx.moveTo(m.px, m.py); ctx.lineTo(m.x, m.y); ctx.stroke();
      } else {
        ctx.fillStyle = rgba(tint, a);
        ctx.fillRect(m.x - 0.5, m.y - 0.5, 1.1, 1.1);
      }
    }
    ctx.restore();
  }

  // Where a constant-depth ring of the pipe lands on screen: a circle of radius
  // R*k, its centre carrying both the track's lateral bend and the bank.
  // u is deliberately not clamped to 1. The nearest boundary runs slightly past
  // the lens so the trough always exits below the frame; clamped, it would bob
  // between y=257 and y=272 as the rows recycled and flash a strip of sky along
  // the bottom of the screen once per row.
  rowAt(u, out) {
    const k = Math.pow(Math.max(0, u), PIPE_DEPTH_POW) * PIPE_K_MAX;
    // Read off the frame's cached pair. rowAt is called a few hundred times a
    // frame once the trails and the sky motes are in, and the roll cannot change
    // between those calls.
    const c = this.rollCos; const s = this.rollSin;
    // max(0, ...) is load-bearing, not defensive: the nearest boundary sits past
    // the lens with k > K_MAX, and a fractional power of a negative base is NaN.
    // The amplitude is capped in update() so the vanishing point (k = 0, where this
    // power term is 1 and the offset is at its largest) stays inside the frame.
    const ox = this.bendAmp * Math.pow(Math.max(0, 1 - k / PIPE_K_MAX), PIPE_BEND_POW);
    const oy = (PIPE_CAM_H - PIPE_R) * k;
    out.cx = CX + ox * c - oy * s;
    out.cy = PIPE_HORIZON + ox * s + oy * c;
    out.r = PIPE_R * k;
    out.k = k;
    out.u = u;
    return out;
  }

  // Screen angle of a point at tube angle `theta`. theta 0 is the trough, which
  // sits directly below the row centre; positive theta climbs the right wall.
  phi(theta) { return Math.PI / 2 - theta + this.roll; }

  update(dt, a) {
    super.update(dt, a);
    const step = Math.max(0, dt);
    const advance = this.beat - this.prevBeat;
    // Tempo measured off the beat clock rather than taken from track.bpm, so the
    // ride still keeps time when the analysis is driving the beat.
    if (step > 0 && advance > 0 && advance < 4) {
      this.beatRate += (clamp(advance / step, 0.6, 6) - this.beatRate) * clamp(step * 2.5, 0, 1);
    }
    // A song loop hands back a beat count that jumps backwards; a big forward
    // jump is the same event seen from the other side. Neither is a phrase.
    if (advance > 0 && advance < 8) this.phraseBeat += advance;
    while (this.phraseBeat >= this.bankNextBeat) {
      const hold = this.nextHold(this.bankRng, PIPE_BANK_HOLDS, this.tune.turnEvery);
      this.bankNextBeat += hold;
      // Departs from wherever the lean actually IS, so a target that changes mid
      // turn continues from there rather than snapping back to start.
      this.bankFrom = this.curve;
      this.bankFromBeat = this.phraseBeat;
      this.bankHold = hold;
      // Roughly a third of the phrases straighten out. A track that is always
      // turning reads as a wobble; the straights are what sell the corners. The
      // leans that DO happen are big ones — a timed curve can afford them, where a
      // chase had to keep them modest to stay smooth.
      this.bankTarget = this.bankRng.chance(0.3)
        ? 0
        : (this.bankRng.chance(0.5) ? 1 : -1) * this.bankRng.range(0.62, 1);
    }
    while (this.phraseBeat >= this.schemeNextBeat) {
      this.schemeNextBeat += this.nextHold(this.schemeRng, PIPE_SCHEME_HOLDS, this.tune.colourEvery);
      // Departs from wherever the walk currently IS, not from the last scheme's
      // endpoint, so a hold that lands mid-blend still leaves without a snap.
      this.schemeFrom = { ...this.scheme };
      this.altFrom = { sun: this.tints[4], lip: this.tints[5] };
      this.schemeIndex = (this.schemeIndex + 1 + this.schemeRng.int(0, PIPE_SCHEMES.length - 2)) % PIPE_SCHEMES.length;
      this.schemeTo = PIPE_SCHEMES[this.schemeIndex];
      this.altIndex = (this.schemeIndex + 3) % PIPE_SCHEMES.length;
      this.altTo = PIPE_SCHEMES[this.altIndex];
      this.schemeBlend = 0;
    }
    this.schemeBlend = Math.min(1, this.schemeBlend + step * PIPE_SCHEME_EASE);
    this.applyScheme();

    // The turn is a TIMED CURVE between two leans, not a chase toward one.
    //
    // Three attempts at this, and the difference matters. A one-pole has its
    // greatest angular velocity in its first frame — it eases out but never in, so
    // every corner starts with a flick. A critically damped spring fixes the flick
    // but asymptotes: it spends the whole phrase approaching a lean it never quite
    // reaches, which is smooth and gutless. What a big move actually needs is to
    // leave from rest, ARRIVE, and sit there.
    //
    // So: smootherstep from the old lean to the new one over a musical duration.
    // Zero first AND second derivative at both ends, so there is nothing to jerk at
    // either edge, and it genuinely reaches 1 — the remainder of the phrase is
    // spent held over at full lean, which is what reads as commitment. Run in BEAT
    // space rather than seconds so the move lands with the phrase whatever the
    // tempo is.
    const turnBeats = Math.max(0.5, this.bankHold * this.tune.turnEase);
    const t = clamp((this.phraseBeat - this.bankFromBeat) / turnBeats);
    const eased = sCurve(t);
    this.curve = this.bankFrom + (this.bankTarget - this.bankFrom) * eased;
    // The horizon roll is DERIVED from the bend rather than chased separately.
    // Both used to ease toward the same signed target on the same clock, which is
    // the same thing right up until the two disagree — and a roll that leads or
    // lags the bend reads as a camera tilting rather than as a pipe turning, which
    // is the whole illusion. Deriving it makes disagreeing impossible.
    this.bankRoll = this.curve * PIPE_ROLL_MAX * this.tune.turnAmount;

    if (!this.spiralActive && this.phraseBeat >= this.spiralNextBeat) {
      this.spiralActive = true;
      this.spiralBeat = 0;
      this.spirals++;
      this.spiralDir = this.spiralRng.chance(0.5) ? 1 : -1;
      this.spiralFrom = this.spiral;
      this.spiralTo = this.spiral + this.spiralDir * TAU;
      // Formations laid from here on are single winding trails. Groups recycle
      // every three beats or so at this speed, so the trail assembles itself
      // over the first bar of the roll rather than snapping into place.
      this.trailMode = true;
      this.spiralNextBeat = this.phraseBeat + PIPE_SPIRAL_BEATS
        + this.nextHold(this.spiralRng, PIPE_SPIRAL_HOLDS, this.tune.screwEvery);
    }
    if (this.spiralActive) {
      if (advance > 0 && advance < 8) this.spiralBeat += advance;
      const p = clamp(this.spiralBeat / PIPE_SPIRAL_BEATS);
      // Eased in and out, so the barrel does not start and stop dead. A full TAU
      // means the roll lands exactly where it started and the scene is none the
      // wiser — which is why this can accumulate forever without drifting.
      this.spiral = this.spiralFrom + (this.spiralTo - this.spiralFrom) * smooth(p);
      if (p >= 1) { this.spiral = this.spiralTo; this.spiralActive = false; this.trailMode = false; }
    }
    // The horizon orb breathes on the half-bar, not the beat. On the beat it
    // competes with the rings and the gates, which are already there; at half
    // the rate it reads as the thing the whole ride is heading toward rather
    // than as one more flashing light. Same kit weighting as `pulse`, so a
    // section with the drums arranged out swells rather than throbs.
    const halfPhase = (((this.beat * 0.5) % 1) + 1) % 1;
    this.halfPulse = Math.pow(1 - halfPhase, 4) * (PULSE_FLOOR + (1 - PULSE_FLOOR) * this.groove);
    this.helix += ((this.spiralActive ? PIPE_HELIX : 0) - this.helix) * clamp(step * PIPE_HELIX_EASE, 0, 1);
    // Eased slowly on purpose: this should read as the picture settling over a
    // phrase, not as a meter following the level.
    const wantPresence = PIPE_PRESENCE_FLOOR + (1 - PIPE_PRESENCE_FLOOR) * this.dynamics;
    this.presence += (wantPresence - this.presence) * clamp(step * PIPE_PRESENCE_EASE, 0, 1);
    // `settle` scales the whole effect, so 0 is exactly the old behaviour.
    this.settle = 1 - this.tune.settle * (1 - this.presence);

    this.roll = this.bankRoll + this.spiral;
    this.rollCos = Math.cos(this.roll);
    this.rollSin = Math.sin(this.roll);

    // How far the bend may reach in the direction it is currently leaning, before
    // the vanishing point would come within PIPE_EDGE_MARGIN of an edge. A ray-box
    // clip from the anchor along the roll direction — cheap, and exact rather than
    // the worst-case circle, so a sideways lean still gets the full bend it has
    // room for and only a lean toward the low ceiling is shortened.
    const want = this.curve * PIPE_BEND * this.tune.turnAmount;
    const dir = want < 0 ? -1 : 1;
    const rx = this.rollCos * dir; const ry = this.rollSin * dir;
    let reach = PIPE_BEND * 4;
    if (rx > 1e-6) reach = Math.min(reach, (W - PIPE_EDGE_MARGIN - CX) / rx);
    else if (rx < -1e-6) reach = Math.min(reach, (PIPE_EDGE_MARGIN - CX) / rx);
    if (ry > 1e-6) reach = Math.min(reach, (H - PIPE_EDGE_MARGIN - PIPE_HORIZON) / ry);
    else if (ry < -1e-6) reach = Math.min(reach, (PIPE_EDGE_MARGIN - PIPE_HORIZON) / ry);
    reach = Math.max(0, reach);
    // Tightens instantly and relaxes slowly. Easing BOTH ways would let the limit
    // lag behind a fast screw and allow exactly the overshoot this exists to stop;
    // easing neither would pulse the bend as the screw came round.
    this.bendLimit = reach < this.bendLimit
      ? reach
      : this.bendLimit + (reach - this.bendLimit) * clamp(step * PIPE_LIMIT_EASE, 0, 1);
    this.bendAmp = clamp(want, -this.bendLimit, this.bendLimit);

    // The pipe narrows and opens again on its own schedule.
    //
    // The knob stays the widest it will ever be — this only ever takes width AWAY,
    // so PIPE WIDTH still means "as wide as this" rather than "somewhere near
    // this". Same timed S-curve the turns use, over a longer hold, so the tube
    // arrives at a width and travels at it for a while instead of pulsing.
    while (this.phraseBeat >= this.widthNextBeat) {
      const hold = this.nextHold(this.widthRng, PIPE_WIDTH_HOLDS, 0);
      this.widthNextBeat += hold;
      this.widthFrom = this.widthTarget;
      this.widthFromBeat = this.phraseBeat;
      this.widthHold = hold;
      // Never above 1: 1 IS the knob. A third of the time it opens right back out,
      // so the narrow stretches read as somewhere the pipe went rather than as the
      // width it now happens to be.
      // Drawn around the knob rather than away from it, and drawn from a BELL
      // rather than flat: three uniforms averaged land near the middle far more
      // often than near either end, so the ride spends most of its time at or
      // beside the width it was set to and only occasionally goes right out to
      // the wide or narrow extreme. A flat draw here made every width equally
      // likely, which reads as the pipe having no home to return to.
      //
      // The two sides are scaled independently so the knob keeps its meaning
      // wherever it sits: DRIFT is a fraction of the room available in each
      // direction, not a fixed amount that would fall off one end.
      const base = Math.max(0.01, this.widthBase);
      const drift = this.tune.widthDrift;
      const low = Math.max(PIPE_WIDTH_MIN, base - drift * (base - PIPE_WIDTH_MIN));
      const high = Math.min(PIPE_WIDTH_MAX, base + drift * (PIPE_WIDTH_MAX - base));
      const bell = (this.widthRng.float() + this.widthRng.float()) / 2;
      // And a third of the time it simply comes home, which is what makes the
      // knob read as the song's own width rather than as one option among many.
      const want = this.widthRng.chance(PIPE_WIDTH_HOME)
        ? base
        : (bell < 0.5 ? low + (base - low) * (bell * 2) : base + (high - base) * ((bell - 0.5) * 2));
      this.widthTarget = want / base;
    }
    this.widthBase += (this.tune.width - this.widthBase) * clamp(step * PIPE_WIDTH_EASE, 0, 1);
    const wt = clamp((this.phraseBeat - this.widthFromBeat) / Math.max(0.5, this.widthHold * 0.6));
    this.width = this.widthBase * (this.widthFrom + (this.widthTarget - this.widthFrom) * sCurve(wt));
    // max(), not a plain blend: this exists to stop slow songs crawling, and a
    // blend would have paid for that by SLOWING every fast one. Below the
    // reference it lifts; at or above it, it leaves the tempo alone.
    const paced = Math.max(this.beatRate,
      this.beatRate + (PIPE_RATE_REFERENCE - this.beatRate) * PIPE_RATE_ANCHOR);
    this.rowRate = paced * this.tune.speed * this.motion;
    const travel = step * this.rowRate;
    this.scroll += travel;
    const du = travel / PIPE_ROWS;

    const frac = this.scroll - Math.floor(this.scroll);
    for (let b = 0; b <= PIPE_TOTAL; b++) this.rowAt((b + frac) / PIPE_ROWS, this.rows[b]);
    // Every cell fades into the horizon haze rather than fading to transparent:
    // the sky behind is a gradient, and an alpha ramp would let it show through
    // the dark squares and wash the checker out from underneath.
    for (let i = 0; i < PIPE_TOTAL; i++) {
      // Sunk toward the horizon haze as the song quietens, so the tube recedes
      // rather than the whole frame simply being dimmed — a global alpha would take
      // the sky down with it and read as somebody turning the brightness off.
      const lit = clamp(0.08 + this.rows[i + 1].u * 1.2) * (0.62 + 0.38 * this.settle);
      this.cellDark[i] = mixHex(this.scheme.haze, this.scheme.dark, lit);
      this.cellLight[i] = mixHex(this.scheme.haze, this.scheme.light, lit);
    }
    // Parity is carried in TRACK space, not screen space. Keyed off the screen
    // row it would flip every square at once each time a row recycled, which
    // strobes instead of scrolling.
    this.parityBase = ((-Math.floor(this.scroll) % 2) + 2) % 2;

    for (const g of this.groups) {
      g.u += du;
      g.spin += step * g.spinRate * this.motion;
      // Past the lens, not past the frame edge: a group at u = 1 is still on
      // screen down in the trough, so recycling there would pop it out in view.
      //
      // Measured against the LAST member rather than the first. A cluster has
      // stride 0 and the two are the same number, but a corkscrew trail is ten
      // to fourteen rings laid back down the pipe at 0.068 apart — most of the
      // pipe's whole length — and testing the front of that deletes the entire
      // trail while its tail is still halfway down the barrel, in full view. The
      // wrap subtracts the trail's own length too, so the group re-enters with
      // its front ring at the horizon and assembles itself coming towards you,
      // which is what seedGroup's own comment says it is for.
      const span = (g.count - 1) * g.stride;
      let guard = 0;
      while (g.u - span > PIPE_PAST_LENS && guard++ < 4) {
        g.u -= PIPE_PAST_LENS + span;
        this.seedGroup(g);
      }
      for (let j = 0; j < g.count; j++) {
        // A formation with a stride lays its members back DOWN the pipe instead
        // of across it, one behind the next, so a single group is a whole trail
        // receding to the horizon rather than a row rushing at you.
        const uj = g.u - j * g.stride;
        if (uj <= 0.002) { g.ss[j] = 0; g.sf[j] = 0; continue; }
        // Fades UP out of the horizon and back DOWN into the lens, on the
        // member's own depth. There was only ever a fade up, so a ring reached
        // the near end at full brightness and was simply removed — visible as a
        // blink whenever that happened to land while it was still on screen,
        // which depended on where it sat around the barrel. Hence "sometimes".
        g.sf[j] = clamp(uj * 6) * clamp((PIPE_PAST_LENS - uj) * 7);
        const row = this.rowAt(uj, this.scratch);
        // `+ spiral` is what makes a corkscrew read as FOLLOWING the rings: the
        // camera roll and the ring angle advance by the same amount, so the trail
        // holds its place in frame while the barrel turns underneath it. Between
        // corkscrews spiral is a whole multiple of TAU, so this term vanishes.
        // `wind` is the trail's own twist around the barrel; `helix` is the
        // depth wind the corkscrew adds to everything else while it runs.
        const theta = g.centre + (j - (g.count - 1) / 2) * g.span + g.wind * j
          + this.spiral + this.spiralDir * (1 - uj) * this.helix;
        const angle = this.phi(theta);
        const rho = (PIPE_R - PIPE_OBJ_LIFT) * row.k;
        g.sx[j] = row.cx + Math.cos(angle) * rho;
        g.sy[j] = row.cy + Math.sin(angle) * rho;
        g.ss[j] = PIPE_OBJ_SIZE * row.k;
      }
    }

    for (const m of this.motes) {
      m.u += du * m.speed;
      if (m.u > PIPE_PAST_LENS) this.seedMote(m);
      const row = this.rowAt(m.u, this.scratch);
      const angle = this.phi(m.theta);
      m.px = m.x; m.py = m.y;
      m.x = row.cx + Math.cos(angle) * m.rho * row.k;
      m.y = row.cy + Math.sin(angle) * m.rho * row.k;
      m.k = row.k;
      // A freshly seeded mote has no previous position; without this it draws a
      // streak all the way from wherever the last one died.
      if (m.u <= 0.005) { m.px = m.x; m.py = m.y; }
      const dx = m.x - m.px; const dy = m.y - m.py;
      const len = Math.hypot(dx, dy);
      if (len > PIPE_MOTE_STREAK) {
        const f = PIPE_MOTE_STREAK / len;
        m.px = m.x - dx * f;
        m.py = m.y - dy * f;
      }
    }

    // Gates land on the bar line, and only where the kit is actually playing —
    // the same rule the nebula detonates on, for the same reason.
    const crossed = Math.floor(this.beat) !== Math.floor(this.prevBeat);
    const slot = ((Math.floor(this.beat) % 4) + 4) % 4;
    if (crossed && slot === 0 && !this.drumless && this.groove > 0.3) {
      const free = this.gates.find((gate) => gate.u <= 0);
      if (free) { free.u = 0.0001; free.punch = 0.5 + this.bass * 0.6; }
    }
    for (const gate of this.gates) {
      if (gate.u <= 0) continue;
      gate.u += du;
      gate.punch = Math.max(0, gate.punch - step * 1.4);
      if (gate.u > PIPE_PAST_LENS) { gate.u = 0; continue; }
      const row = this.rowAt(gate.u, this.scratch);
      gate.cx = row.cx; gate.cy = row.cy; gate.k = row.k;
      gate.r = Math.max(0, (PIPE_R - 12) * row.k);
    }
  }

  pipeArc(ctx, row, fromTheta, toTheta) {
    ctx.arc(row.cx, row.cy, Math.max(0, row.r), this.phi(fromTheta), this.phi(toTheta), true);
  }

  /**
   * Shade one row band ACROSS the barrel, so the tube reads as round.
   *
   * The distance fade in update() already darkens rows toward the horizon, which
   * gives depth ALONG the pipe — but every column at a given depth was the same
   * colour, and a cylinder lit flat across its width reads as a painted ribbon
   * rather than as a surface you are inside. This is the missing cue: the trough
   * sits in its own shadow while the lips catch the sky, which is what a real
   * half-pipe does and what tells the eye the checker is curving away.
   *
   * A gradient rather than per-cell fills, deliberately: shading cell by cell
   * would double the fill count that the single-strip trick above exists to
   * avoid. Two gradients a row costs nothing and the shading is smooth instead
   * of banded. Endpoints are the two lip positions on this row's arc, so the
   * shading rolls with the pipe rather than sitting level on the screen.
   */
  barrelShade(ctx, row, base, edge) {
    const depth = this.tune.depth;
    if (!depth || !(row.r > 0)) return base;
    const a = this.phi(-edge); const b = this.phi(edge);
    const grad = ctx.createLinearGradient(
      row.cx + row.r * Math.cos(a), row.cy + row.r * Math.sin(a),
      row.cx + row.r * Math.cos(b), row.cy + row.r * Math.sin(b),
    );
    // Toward the scheme's own sky rather than toward black: an occlusion tint
    // borrowed from the palette stays in the picture, where black just makes a
    // grey smear across it.
    const trough = mixHex(base, this.scheme.sky, clamp(PIPE_TROUGH_SHADE * depth));
    const lip = mixHex(base, this.scheme.light, clamp(PIPE_LIP_LIFT * depth));
    grad.addColorStop(0, lip);
    grad.addColorStop(0.5, trough);
    grad.addColorStop(1, lip);
    return grad;
  }

  drawPipe(ctx) {
    const edge = this.width;
    const cols = Math.max(2, Math.round(this.tune.columns));
    const stepTheta = (edge * 2) / cols;
    for (let i = 0; i < PIPE_TOTAL; i++) {
      const far = this.rows[i]; const near = this.rows[i + 1];
      // One strip for the dark half of the checker, then only the light squares
      // on top. Half the fills of a cell-by-cell mesh, and same-coloured
      // neighbours never meet at a seam because they are one path.
      ctx.beginPath();
      this.pipeArc(ctx, far, -edge, edge);
      ctx.arc(near.cx, near.cy, Math.max(0, near.r), this.phi(edge), this.phi(-edge), false);
      ctx.closePath();
      ctx.fillStyle = this.barrelShade(ctx, near, this.cellDark[i], edge);
      ctx.fill();
      ctx.fillStyle = this.barrelShade(ctx, near, this.cellLight[i], edge);
      for (let c = (i + this.parityBase) & 1; c < cols; c += 2) {
        const t0 = -edge + c * stepTheta;
        const t1 = t0 + stepTheta;
        ctx.beginPath();
        this.pipeArc(ctx, far, t0, t1);
        ctx.arc(near.cx, near.cy, Math.max(0, near.r), this.phi(t1), this.phi(t0), false);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // The wall doubles as the equalizer: each column of the checker is a wedge
  // running away to the vanishing point, lit by its own band of the spectrum.
  drawSpectrum(ctx) {
    const edge = this.width;
    const cols = Math.max(2, Math.round(this.tune.columns));
    const stepTheta = (edge * 2) / cols;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let c = 0; c < cols; c++) {
      const v = this.spectrumValue(this.analysis, c, cols);
      if (v < 0.06) continue;
      const a0 = this.phi(-edge + c * stepTheta);
      const a1 = this.phi(-edge + (c + 1) * stepTheta);
      ctx.beginPath();
      for (let b = 0; b <= PIPE_TOTAL; b++) {
        const row = this.rows[b];
        const x = row.cx + Math.cos(a0) * row.r;
        const y = row.cy + Math.sin(a0) * row.r;
        if (b === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      for (let b = PIPE_TOTAL; b >= 0; b--) {
        const row = this.rows[b];
        ctx.lineTo(row.cx + Math.cos(a1) * row.r, row.cy + Math.sin(a1) * row.r);
      }
      ctx.closePath();
      ctx.fillStyle = rgba(this.scheme.lip, (0.04 + v * (0.16 + this.pulse * 0.12)) * this.settle);
      ctx.fill();
    }
    ctx.restore();
  }

  drawLip(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 1.1;
    for (const side of [-this.width, this.width]) {
      const angle = this.phi(side);
      const cos = Math.cos(angle); const sin = Math.sin(angle);
      ctx.beginPath();
      for (let b = 0; b <= PIPE_TOTAL; b++) {
        const row = this.rows[b];
        const x = row.cx + cos * row.r;
        const y = row.cy + sin * row.r;
        if (b === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(this.scheme.lip, 0.3 + this.mid * 0.3);
      ctx.stroke();
    }
    ctx.restore();
  }

  // The vanishing point is where every new row of the checker is born, at full
  // contrast, one row at a time — the one place the scroll can be caught in the
  // act. So the horizon gets a light source sitting on it: a source-over veil in
  // the haze colour that the rows genuinely emerge FROM, and an additive orb on
  // top of that which swells on the beat. Everything that spawns at the horizon
  // is drawn under it and fades in over its first sixth of the ride, so nothing
  // is ever seen to pop into existence.
  drawHorizonOrb(ctx) {
    // Sits on the FAR ROW's centre, not on the frame's. As the track bends, the
    // point the rows converge on swings out to the side by as much as the bend
    // allows; an orb pinned to the middle of the screen would drift off the seam
    // it exists to cover exactly when the turn is at its hardest.
    const seam = this.rows[0];
    const swell = this.halfPulse * 0.6 + this.bass * 0.18;
    const r = 17 + this.bass * 7 + swell * 12;
    // The veil's job is to hide the seam where each new row is born; the light
    // on top of it is what makes the horizon somewhere to be heading.
    const veil = ctx.createRadialGradient(seam.cx, seam.cy, 0, seam.cx, seam.cy, r * 3.4);
    veil.addColorStop(0, rgba(this.scheme.haze, 0.96));
    veil.addColorStop(0.36, rgba(this.scheme.haze, 0.66));
    veil.addColorStop(1, rgba(this.scheme.haze, 0));
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const core = ctx.createRadialGradient(seam.cx, seam.cy, 0, seam.cx, seam.cy, r);
    core.addColorStop(0, rgba('#ffffff', 0.3 + swell * 0.26));
    core.addColorStop(0.28, rgba(this.scheme.sun, 0.24 + swell * 0.18));
    core.addColorStop(0.7, rgba(this.scheme.lip, 0.09));
    core.addColorStop(1, rgba(this.scheme.lip, 0));
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(seam.cx, seam.cy, r, 0, TAU); ctx.fill();
    this.glowDot(ctx, seam.cx, seam.cy, r * 2.4, this.scheme.sun, 0.06 + swell * 0.09);
    ctx.restore();
  }

  drawGates(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const gate of this.gates) {
      if (gate.u <= 0) continue;
      ctx.lineWidth = 0.9 + gate.k * (2.2 + gate.punch * 3);
      // Fades up out of the horizon orb rather than appearing on top of it.
      ctx.strokeStyle = rgba(gate.punch > 0.05 ? '#ffffff' : this.scheme.sun,
        (0.16 + gate.punch * 0.6) * (1 - gate.u * 0.35) * clamp(gate.u * 6) * this.settle);
      ctx.beginPath();
      ctx.arc(gate.cx, gate.cy, gate.r, this.phi(-this.width), this.phi(this.width), true);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawObjects(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const g of this.groups) {
      const tint = this.tints[g.tint];
      const base = (0.34 + this.pulse * 0.4 + this.hit * 0.26) * this.settle;
      for (let j = 0; j < g.count; j++) {
        const size = g.ss[j];
        if (size < 0.4) continue;
        const bright = base * g.sf[j];
        if (bright <= 0.002) continue;
        const x = g.sx[j]; const y = g.sy[j];
        if (g.kind === 0) {
          // Rings spin edge-on and back, the way the ones they are quoting do.
          const face = Math.abs(Math.cos(g.spin + j * 0.7));
          ctx.lineWidth = Math.max(0.5, size * 0.3);
          ctx.strokeStyle = rgba(tint, bright);
          ctx.beginPath();
          ctx.ellipse(x, y, Math.max(0.4, size * (0.16 + face * 0.84)), size, this.roll, 0, TAU);
          ctx.stroke();
          if (size > 6) {
            ctx.strokeStyle = rgba('#ffffff', bright * 0.45);
            ctx.lineWidth = Math.max(0.4, size * 0.11);
            ctx.stroke();
          }
        } else {
          const sprite = glowSprite(tint, size * 2.2);
          if (sprite) {
            const d = size * 2.4;
            ctx.globalAlpha = clamp(bright * 1.3) * this.frameAlpha;
            ctx.drawImage(sprite.canvas, x - d / 2, y - d / 2, d, d);
            ctx.globalAlpha = this.frameAlpha;
          } else {
            this.glowDot(ctx, x, y, size * 1.2, tint, bright);
          }
          ctx.fillStyle = rgba('#ffffff', bright * 0.5);
          ctx.beginPath();
          ctx.arc(x, y, Math.max(0.4, size * 0.3), 0, TAU);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  draw(ctx) {
    this.backdrop(ctx, this.scheme.sky, this.scheme.haze);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    this.glowDot(ctx, CX, PIPE_HORIZON - 6, 66 + this.bass * 34, this.scheme.sun, 0.2 + this.bass * 0.16);
    // Painted through the roll, about the vanishing point the pipe banks around.
    // A level haze band under a leaning pipe reads as the camera tilting rather
    // than as the track turning, which is the entire illusion.
    ctx.translate(CX, PIPE_HORIZON);
    ctx.rotate(this.roll);
    const haze = ctx.createLinearGradient(0, -26, 0, 18);
    haze.addColorStop(0, rgba(this.scheme.lip, 0));
    haze.addColorStop(0.5, rgba(this.scheme.lip, 0.1 + this.mid * 0.1));
    haze.addColorStop(1, rgba(this.scheme.lip, 0));
    ctx.fillStyle = haze;
    ctx.fillRect(-W, -26, W * 2, 44);
    ctx.restore();
    // Sky motes go under the pipe: they belong to the air above the lip, and the
    // near rows cover the lower frame anyway.
    this.drawDust(ctx, 0.4);
    this.drawMotes(ctx);
    this.drawPipe(ctx);
    this.drawSpectrum(ctx);
    this.drawLip(ctx);
    this.drawHorizonOrb(ctx);
    this.drawGates(ctx);
    this.drawObjects(ctx);
    this.modernFinish(ctx, 0.24);
  }
}

// ---------------------------------------------------------------------------
// ASTRAL TRAVEL — flying INTO the light instead of past it.
//
// The other tunnels in the pack are built out of rings: a shape at a depth, then
// the same shape further back, and the illusion is in the spacing. This one has
// no rings at all. It draws the light itself as a strand — one continuous
// filament that starts as a hair beside the vanishing point, coils outward as it
// comes at the camera, and sweeps out past the frame. Nothing is ever drawn
// toward the vanishing point; the convergence falls out of the projection, which
// is why every strand aims at the same place without being told to.
//
// The geometry worth stating, because everything else follows from it: a strand
// is a helix of CONSTANT world radius around the travel axis. Its screen radius
// is therefore FOV·R/z — a couple of pixels off centre when it is far away, and
// far outside the frame by the time it arrives. The twist per unit depth is what
// turns a spoke into a curve, and it has to be read together with the flight
// speed: the SHAPE is twist times the depth on screen, but the RATE the whole
// picture rotates is twist times how fast the camera is moving. A tight coil
// flown quickly is a spinning wheel, not a journey — so the coil is deep and the
// flight is slow, and the sense of speed is carried by the motes, which run at
// several times the camera.
//
// There is not one straight line in it. Strands and motes are both sampled off
// the same helix and traced as splines, and the shared dust bed — which paints
// two-point streaks — is deliberately not drawn.
//
// No offscreen buffers, no feedback: every frame is rebuilt from update() state
// alone, so drawing it twice yields the same pixels and the megamix can blend it
// like any other record. The glow is five passes of the same tapered strip, which
// is cheaper here than a bloom buffer and holds a hard edge on the core where a
// blur would smear it.
// Population. The fills are additive strips of real screen area, so this is the
// preset's whole cost curve — 56 looked no denser than this and measured a third
// slower.
const ASTRAL_STRANDS = 48;
// Smoothness is node count, spacing and the spline together. The strand turns
// twist·Δz between samples, so at this coil a bare polyline draws the inner
// spiral as a visible hexagon however the nodes are spaced.
const ASTRAL_NODES = 30;
// Zoomed right in. This is the one number that decides whether the preset reads
// as a view of a tunnel or as being inside one: at 195 the whole corridor sat in
// frame with room around it, and at 340 a strand arrives already too big to see
// the end of.
const ASTRAL_FOV = 340;
const ASTRAL_NEAR = 26;
// Shallow on purpose. A deep field puts most of its strands too far away to be
// anything but hair round the vanishing point; cutting it keeps the population in
// the range where it is actually travelling past the camera.
const ASTRAL_FAR = 1050;
// Screen radius at which a strand's near end is safely outside the frame.
// Sampling any closer buys nothing but enormous coordinates: at z→0 the
// projection runs away, and a polygon a hundred thousand pixels wide is a real
// cost in the rasteriser for pixels nobody sees.
const ASTRAL_EDGE = 720;
// The colour wheel is angular, not random: hue comes from where a strand sits
// around the axis, so neighbours agree and the frame reads as one prism rather
// than as confetti. Ordered the way light disperses — aqua through blue, violet,
// rose, amber, back to white-gold. Nothing holds its colour: the whole wheel
// turns under the field, so every strand cycles through all six as the song runs.
const ASTRAL_WHEEL = ['#5ef0dd', '#7cc8ff', '#b98cff', '#ff6fae', '#ff9d5c', '#ffe6a4'];
// Motes are ribbons too, just thin and fast ones — they ride the same helix and
// are traced the same way, because a straight dash in this picture reads as a
// scratch on the lens.
const ASTRAL_MOTES = 90;
const ASTRAL_MOTE_NODES = 7;
// World spacing of the knots that ride each strand. They are pinned to WORLD
// depth, not to the strand, so the camera advancing slides them outward along the
// curve and off the edge of the frame. This is the whole answer to why a tunnel
// of smooth ribbons can still read as a picture: a ribbon whose shape does not
// change frame to frame gives the eye nothing to measure travel against, and one
// bright point moving along it gives it everything.
const ASTRAL_BEAD_SPACING = 150;
// The bloom, as concentric strips of the same strand rather than a blurred
// buffer. Widths are multiples of the strand's own perspective half-width, so the
// glow narrows into the distance along with the light making it. `cap` is in
// pixels and matters: without it the outer layers scale with the strand, and a
// close pass grows a great translucent wedge whose straight edge is the one thing
// in the frame that looks drawn rather than lit.
const ASTRAL_LAYERS = [
  { spread: 3.4, cap: 10, alpha: 0.05 },
  { spread: 2.1, cap: 13, alpha: 0.09 },
  { spread: 1.3, cap: 17, alpha: 0.16 },
  { spread: 0.8, cap: 99, alpha: 0.5 },
  // The ridge. Without an inner layer a wide strand is a flat slab of colour with
  // a hairline down it; this is the bright middle a real beam has, and it is what
  // stops the near passes reading as grey tape.
  { spread: 0.34, cap: 99, alpha: 0.55 },
];
// World units per second at rest. See the note on rotation above. This is a
// read together with the twist, because the two multiply: the rate the picture
// ROTATES is twist times this. Slowing the flight to fix a spinning screen was
// the wrong half of the product — it bought a calm picture that nobody was
// traveling through. Uncoiling the helix instead buys the same calm rotation at
// four times the speed, which is what a fly-through needs.
const ASTRAL_SPEED = 75;
// How fast a launched mote runs, at rush 1. Independent of the camera: these are
// the only things in the picture with any pace, which is what makes them read as
// shooting past a slow flight rather than as the whole scene speeding up.
const ASTRAL_MOTE_SPEED = 150;

// Traces a polyline as a quadratic spline through its own midpoints, forward or
// back along the same buffers. Node count alone cannot fix the coil: the corners
// appear exactly where the picture is densest, and doubling the nodes to hide
// them doubles five fills per strand. Curving through the midpoints costs nothing
// and removes them outright.
function astralSpline(ctx, xs, ys, back) {
  const n = xs.length;
  if (back) {
    for (let i = n - 2; i > 0; i--) {
      ctx.quadraticCurveTo(xs[i], ys[i], (xs[i] + xs[i - 1]) * 0.5, (ys[i] + ys[i - 1]) * 0.5);
    }
    ctx.lineTo(xs[0], ys[0]);
    return;
  }
  for (let i = 1; i < n - 1; i++) {
    ctx.quadraticCurveTo(xs[i], ys[i], (xs[i] + xs[i + 1]) * 0.5, (ys[i] + ys[i + 1]) * 0.5);
  }
  ctx.lineTo(xs[n - 1], ys[n - 1]);
}

const astralHue = (t) => {
  const u = (((t % 1) + 1) % 1) * ASTRAL_WHEEL.length;
  const i = Math.floor(u);
  return mixHex(ASTRAL_WHEEL[i % ASTRAL_WHEEL.length], ASTRAL_WHEEL[(i + 1) % ASTRAL_WHEEL.length], u - i);
};

class AstralTravel extends BaseVisualiser {
  constructor(seed, track) {
    super(seed, track);
    this.name = VISUALISER_NAMES[21];
    this.palette = ASTRAL_WHEEL;
    this.astralRng = this.rng.stream('astral');
    this.spin = this.astralRng.chance(0.5) ? 1 : -1;
    // Distance travelled, in world units. The helices are fixed in world space,
    // so this is the only thing that moves — every strand's angle is read off it.
    this.cam = 0;
    this.speed = ASTRAL_SPEED;
    this.warp = 0;
    // A rotation kick per drum, decaying over about a beat. The base drift is
    // almost nothing now, so what turns the picture is the kit: the field leans
    // into every hit and coasts between them, which is the difference between
    // moving in time with the song and merely moving while it plays.
    this.rollKick = 0;
    this.breath = 0;
    this.roll = 0;
    this.hueShift = this.astralRng.float();
    this.fov = ASTRAL_FOV;
    // Where the corridor is aimed, and where it is aimed AT. The camera chases
    // the wander rather than sitting on it, which is the whole difference between
    // steering through the field and the field sliding around underneath: the lag
    // is what makes a turn read as weight.
    this.aimX = CX;
    this.aimY = CY;
    // Bearings are dealt on the golden angle rather than drawn at random. A
    // uniform draw clumps — a dozen strands land in one quadrant and the opposite
    // side of the frame goes empty for a bar — and because strands are recycled
    // forever, one accumulator keeps the field evenly spread for the whole song
    // without any bookkeeping about where the others are.
    this.spawnAng = this.astralRng.float() * TAU;
    this.strands = Array.from({ length: ASTRAL_STRANDS }, () => this.seedStrand({
      nodes: Array.from({ length: ASTRAL_NODES }, () => ({ x: 0, y: 0, h: 0, nx: 0, ny: 0 })),
    }, true));
    this.motes = Array.from({ length: ASTRAL_MOTES }, () => this.seedMote({}, true));
    this.prevHit = 0;
    // Something in the air before the first downbeat lands, so the preset does not
    // open on bare strands.
    this.launchMotes(14);
    // Scratch edges for the strip being painted. Preallocated because paintStrand
    // runs five times per strand per frame and a frame must not allocate.
    this.edge = {
      ax: new Float64Array(ASTRAL_NODES), ay: new Float64Array(ASTRAL_NODES),
      bx: new Float64Array(ASTRAL_NODES), by: new Float64Array(ASTRAL_NODES),
      mx: new Float64Array(ASTRAL_MOTE_NODES), my: new Float64Array(ASTRAL_MOTE_NODES),
    };
  }

  // `cold` seeds a strand somewhere along the whole corridor, so the first frame
  // opens on a field already in flight rather than on empty space filling up.
  // Every later respawn drops in beyond the far plane instead.
  seedStrand(s, cold = false) {
    const rng = this.astralRng;
    this.spawnAng += 2.39996 + (rng.float() - 0.5) * 0.5;
    s.ang = this.spawnAng;
    // Biased inward: a handful of wide strands sweep the corners while most stay
    // near the axis, which is what gives the knot at the centre its density.
    s.radius = 10 + Math.pow(rng.float(), 1.8) * 210;
    s.twist = (0.0009 + rng.float() * 0.0026) * this.spin;
    // Deliberately SHORTER than the corridor. A strand that spans the whole depth
    // is the same curve on screen from one frame to the next — its far end is
    // always at the vanishing point and its near end always off the edge — and a
    // shape that never changes is a picture you are looking at. Ends that arrive,
    // sweep out and leave are half of what makes it a place you are moving
    // through; the knots below are the other half.
    s.length = ASTRAL_FAR * (0.45 + rng.float() * 0.6);
    s.z = cold
      ? ASTRAL_NEAR + rng.float() * (ASTRAL_FAR - ASTRAL_NEAR)
      : ASTRAL_FAR + rng.float() * 400;
    s.width = 1.4 + rng.float() * 3.4;
    s.bright = 0.42 + rng.float() * 0.58;
    // A small hue offset off the angular wheel, so strands sitting on the same
    // bearing do not come out identically coloured.
    s.tint = (rng.float() - 0.5) * 0.14;
    // Where this strand's knots sit in world depth. Seeded per strand so they do
    // not all arrive in step, which would read as a pulse rather than as travel.
    s.beadPhase = rng.float() * ASTRAL_BEAD_SPACING;
    s.hex = ASTRAL_WHEEL[0];
    s.hexFar = ASTRAL_WHEEL[0];
    s.hexNear = ASTRAL_WHEEL[0];
    return s;
  }

  // One mote, aimed and lit. `cold` is the constructor's first fill, which leaves
  // the pool empty and waiting for the first drum rather than opening on a shower
  // nobody played.
  seedMote(p, cold = false) {
    const rng = this.astralRng;
    p.ang = rng.float() * TAU;
    p.radius = 6 + Math.pow(rng.float(), 1.4) * 330;
    p.z = ASTRAL_FAR * (0.55 + rng.float() * 0.42);
    p.hue = rng.float();
    p.bright = 0.4 + rng.float() * 0.6;
    // The spread is what you overtake. It is also the only pace in the picture, so
    // it runs well above the camera rather than around it.
    p.rush = 2.6 + rng.float() * 5.4;
    p.twist = (0.0032 + rng.float() * 0.009) * this.spin;
    p.alive = !cold;
    return p;
  }

  // Fire up to `count` of them. Whatever is still flying is left alone: a mote
  // that gets recycled mid-flight snaps to a new bearing, and a field of those
  // reads as flicker rather than as rhythm.
  launchMotes(count) {
    let budget = count;
    for (const p of this.motes) {
      if (budget <= 0) break;
      if (p.alive) continue;
      this.seedMote(p);
      budget--;
    }
  }

  update(dt, a) {
    super.update(dt, a);
    const step = clamp(dt, 0, 1 / 20);
    // Cruising speed follows the arrangement, not the transient: loudness sets
    // where the flight settles and the eased `motion` keeps a single stab from
    // jolting the camera.
    const target = ASTRAL_SPEED * (0.55 + this.motion * 0.55) * (0.8 + this.bass * 0.4);
    this.speed += (target - this.speed) * clamp(step * 1.5, 0, 1);
    // The surge. A kit hit is an event, so it gets an envelope of its own that
    // decays over about a beat rather than being folded into the cruise — and at
    // this speed the surge is most of the travel, so the corridor advances in
    // time with the drums instead of at a constant crawl.
    this.warp = Math.max(this.warp - step * this.warp * 2.2, this.hit * 0.85);
    this.rollKick = Math.max(this.rollKick - step * this.rollKick * 3, this.hit * 0.9);
    const advance = step * this.speed * (1 + this.warp * 2.4 + this.bass * 0.25);
    this.cam += advance;
    this.roll += step * (0.003 + this.mid * 0.012 + this.rollKick * 0.18) * this.spin * this.motion;
    // The breath. `pulse` is a spike — right for a knot flaring as it passes,
    // wrong for a ribbon, which should swell and settle rather than flicker. One
    // pole on it is the difference between the strands pulsing and the strands
    // strobing.
    this.breath += (this.pulse - this.breath) * clamp(step * 7, 0, 1);
    // The wheel turns under everything. Slow enough to be a drift rather than a
    // strobe, and fastest when the arrangement is busy.
    this.hueShift += step * (0.022 + this.mid * 0.07);
    // Two sines per axis, deliberately incommensurate, so the path never repeats
    // on a bar and the flight has no visible loop.
    const wanderX = CX + Math.sin(this.flow * 0.21 + this.focusPhase) * (44 + this.mid * 24) * this.motion
      + Math.sin(this.flow * 0.11 + 1.7) * 18 * this.motion;
    const wanderY = CY + Math.cos(this.flow * 0.17 + this.focusPhase * 0.7) * (26 + this.bass * 16) * this.motion
      + Math.cos(this.flow * 0.08 + 0.6) * 11 * this.motion;
    this.aimX += (wanderX - this.aimX) * clamp(step * 1.7, 0, 1);
    this.aimY += (wanderY - this.aimY) * clamp(step * 1.7, 0, 1);
    // The pump. Dollying the lens on the beat moves every strand at once, which is
    // a breath the whole picture takes rather than a flash laid over it.
    this.fov = ASTRAL_FOV * (1 + this.breath * 0.13 + this.bass * 0.09 + this.warp * 0.24);
    for (const s of this.strands) {
      s.z -= advance;
      if (s.z + s.length < ASTRAL_NEAR) this.seedStrand(s);
    }
    // Motes are fired, not fed. Everything in the pool that is not currently
    // flying is simply not drawn, so a bar with no kit under it goes quiet in the
    // picture as well as in the mix.
    if (this.hit > 0.35 && this.prevHit <= 0.35) this.launchMotes(3 + Math.round(this.hit * 9));
    else if (this.drumless && Math.floor(this.beat) !== Math.floor(this.prevBeat)) this.launchMotes(2);
    this.prevHit = this.hit;
    const moteStep = step * ASTRAL_MOTE_SPEED * (0.7 + this.treble * 0.9) * this.motion;
    for (const p of this.motes) {
      if (!p.alive) continue;
      p.z -= moteStep * p.rush;
      if (p.z < ASTRAL_NEAR) p.alive = false;
    }
  }

  // Where the whole field is pointing. The shared ring choreography turns it on
  // the pack's 4/8/16-beat holds, so this rolls with everything else rather than
  // only on its own clock.
  rollAt() {
    return this.roll + this.ringRotation * 0.22;
  }

  // Fills the strand's own node list — position, half-width, and the normal each
  // pass needs to build its strip. Returns false when there is nothing on screen
  // to draw, which is the common case for a strand still behind the far plane.
  layout(s, roll) {
    const fov = this.fov;
    const zNear = Math.max(ASTRAL_NEAR, (fov * s.radius) / ASTRAL_EDGE, s.z);
    const zFar = Math.min(ASTRAL_FAR, s.z + s.length);
    if (!(zFar > zNear * 1.02)) return false;
    const ratio = zFar / zNear;
    const span = zFar - zNear;
    const nodes = s.nodes;
    // How the nodes are spread along the strand is a straight trade. Geometric in
    // depth is linear on SCREEN — the right answer for a gentle strand, where the
    // picture is all radial reach. But the angle a strand turns between two nodes
    // is twist times their depth gap, so on a tight coil geometric spacing puts
    // its widest gaps exactly where the curve is sharpest, and the inner spiral
    // comes out as a fan of straight chords. Linear in depth is uniform in ANGLE,
    // which is what that strand needs. So each strand is placed on the blend its
    // own coil asks for, by total turn.
    const coil = clamp(Math.abs(s.twist) * span / 5);
    for (let i = 0; i < ASTRAL_NODES; i++) {
      const u = i / (ASTRAL_NODES - 1);
      const z = zNear + (zNear * Math.pow(ratio, Math.pow(u, 0.75)) - zNear) * (1 - coil)
        + span * u * coil;
      const ang = s.ang + s.twist * (z + this.cam) + roll;
      const k = fov / z;
      const r = s.radius * k;
      const node = nodes[i];
      node.x = this.aimX + Math.cos(ang) * r;
      node.y = this.aimY + Math.sin(ang) * r;
      // Perspective width, pinched at both ends so the strand has no cut edge — it
      // fades into the vanishing point at one end and out of frame at the other.
      // Capped, because the near end of a close pass is otherwise a slab.
      node.h = Math.min(18, Math.max(0.16, s.width * k * 1.9 * (1 + this.breath * 0.24)))
        * Math.pow(Math.sin(Math.PI * u), 0.4);
    }
    for (let i = 0; i < ASTRAL_NODES; i++) {
      const a = nodes[Math.max(0, i - 1)];
      const b = nodes[Math.min(ASTRAL_NODES - 1, i + 1)];
      const dx = b.x - a.x; const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      nodes[i].nx = -dy / len;
      nodes[i].ny = dx / len;
    }
    // Hue off the bearing of the strand's midpoint, so the wheel turns with the
    // field instead of being painted onto the screen. The two neighbours either
    // side of it are the dispersion: a strand is a different colour where it
    // leaves the vanishing point than where it passes the camera.
    const mid = nodes[ASTRAL_NODES >> 1];
    const bearing = Math.atan2(mid.y - this.aimY, mid.x - this.aimX) / TAU + s.tint + this.hueShift;
    s.hex = astralHue(bearing);
    s.hexFar = astralHue(bearing + 0.3);
    s.hexNear = astralHue(bearing - 0.22);
    return true;
  }

  // The light ramp along a strand, shared by every pass: nearly nothing at the
  // vanishing point, brightest in the middle distance, easing off as it leaves the
  // frame. A strand that stayed bright to its last node would read as a line
  // someone cropped. `hex` overrides the dispersion, for the white core.
  // Built once per strand and reused by every pass, with the pass's own weight
  // applied through globalAlpha. Baking the alpha into the stops instead meant a
  // gradient object and three colour strings per pass — five times the work for
  // the same ramp, and it showed in the frame time.
  strandGradient(ctx, s, hex = null) {
    const near = s.nodes[0];
    const far = s.nodes[ASTRAL_NODES - 1];
    if (Math.hypot(far.x - near.x, far.y - near.y) < 0.6) return rgba(hex || s.hex, 0.6);
    const g = ctx.createLinearGradient(far.x, far.y, near.x, near.y);
    g.addColorStop(0, rgba(hex || s.hexFar, 0.1));
    g.addColorStop(0.42, rgba(hex || s.hex, 1));
    g.addColorStop(1, rgba(hex || s.hexNear, 0.22));
    return g;
  }

  // Nested strips, widest and faintest first. One wide strip at low alpha was the
  // obvious way to fake the bloom and it does not work: a flat fill has a hard
  // edge, so a strand ends up inside a visible grey wedge. Stacking them
  // additively puts the falloff ACROSS the strand where a blur would have put it,
  // for five fills and no buffer.
  paintStrand(ctx, s, alpha) {
    const nodes = s.nodes;
    const { ax, ay, bx, by } = this.edge;
    // The two widest passes are the expensive ones — they are the biggest area in
    // the frame — and on a thin or faint strand they are also the two nobody can
    // see. Spending them only where there is a beam wide enough to have a halo is
    // most of this preset's cost back, at no visible difference.
    const from = (alpha < 0.2 || s.width < 2) ? 2 : 0;
    const paint = this.strandGradient(ctx, s);
    ctx.fillStyle = paint;
    for (let li = from; li < ASTRAL_LAYERS.length; li++) {
      const layer = ASTRAL_LAYERS[li];
      const a = alpha * layer.alpha;
      if (a < 0.004) continue;
      ctx.globalAlpha = a * this.frameAlpha;
      for (let i = 0; i < ASTRAL_NODES; i++) {
        const n = nodes[i]; const h = Math.min(layer.cap, n.h * layer.spread);
        ax[i] = n.x + n.nx * h; ay[i] = n.y + n.ny * h;
        bx[i] = n.x - n.nx * h; by[i] = n.y - n.ny * h;
      }
      ctx.beginPath();
      ctx.moveTo(ax[0], ay[0]);
      astralSpline(ctx, ax, ay, false);
      ctx.lineTo(bx[ASTRAL_NODES - 1], by[ASTRAL_NODES - 1]);
      astralSpline(ctx, bx, by, true);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = this.frameAlpha;
  }

  paintCore(ctx, s, alpha) {
    const nodes = s.nodes;
    const { ax, ay } = this.edge;
    for (let i = 0; i < ASTRAL_NODES; i++) { ax[i] = nodes[i].x; ay[i] = nodes[i].y; }
    ctx.strokeStyle = this.strandGradient(ctx, s, '#ffffff');
    ctx.globalAlpha = alpha * this.frameAlpha;
    ctx.lineWidth = 0.6 + this.pulse * 0.7;
    ctx.beginPath();
    ctx.moveTo(ax[0], ay[0]);
    astralSpline(ctx, ax, ay, false);
    ctx.stroke();
    ctx.globalAlpha = this.frameAlpha;
  }

  // The knots riding one strand. Their world depth is fixed, so `zb + cam` — and
  // with it the bearing — is constant for the life of the knot: it is a material
  // point on the helix, and the only thing that changes is how close it is.
  drawBeads(ctx, s, roll, alpha) {
    const first = Math.ceil((this.cam + Math.max(ASTRAL_NEAR, s.z) - s.beadPhase) / ASTRAL_BEAD_SPACING);
    const last = Math.floor((this.cam + Math.min(ASTRAL_FAR, s.z + s.length) - s.beadPhase) / ASTRAL_BEAD_SPACING);
    for (let i = first; i <= last; i++) {
      const world = s.beadPhase + i * ASTRAL_BEAD_SPACING;
      const zb = world - this.cam;
      if (zb < ASTRAL_NEAR) continue;
      const r = (s.radius * this.fov) / zb;
      if (r > ASTRAL_EDGE) continue;
      const ang = s.ang + s.twist * world + roll;
      const x = this.aimX + Math.cos(ang) * r;
      const y = this.aimY + Math.sin(ang) * r;
      // Square in depth: a knot is a hint at the far end and a flare by the time
      // it passes, which is the acceleration the eye actually reads as speed. Kept
      // small — at disc size these stop being knots in a light and become a field
      // of bubbles floating in front of one.
      const depth = clamp(1 - zb / ASTRAL_FAR);
      const size = 0.45 + depth * depth * (2.4 + this.pulse * 1.6);
      // Weighted by where it sits along its own strand, so a knot fades out with
      // the light carrying it instead of hanging in the air after the tip has gone.
      const along = Math.sin(Math.PI * clamp((zb - s.z) / s.length));
      const a = alpha * along * (0.22 + depth * 0.7);
      if (a < 0.01) continue;
      ctx.fillStyle = rgba(s.hex, a * 0.45);
      ctx.beginPath(); ctx.arc(x, y, size * 1.9, 0, TAU); ctx.fill();
      ctx.fillStyle = rgba('#ffffff', a * (0.35 + this.pulse * 0.4));
      ctx.beginPath(); ctx.arc(x, y, size * 0.6, 0, TAU); ctx.fill();
    }
  }

  // A mote is a short length of its own helix, so it curves with everything else
  // and a jump stretches it further round the coil rather than into a spike. The
  // path is built once and stroked twice — wide and faint, then thin and hot —
  // which is the same glow the strands get, at two operations instead of five.
  drawMotes(ctx, roll) {
    const trail = 110 + this.treble * 180 + this.warp * 420;
    const { mx, my } = this.edge;
    ctx.lineCap = 'round';
    for (const p of this.motes) {
      if (!p.alive) continue;
      const z0 = Math.max(ASTRAL_NEAR, p.z);
      // Seven nodes have to carry the whole streak, so the trail is cut to the
      // depth over which the mote's own coil turns about a radian and a half —
      // beyond that the spline starts cutting chords across its own curve.
      const z1 = Math.min(ASTRAL_FAR, z0 + Math.min(trail * (0.4 + p.rush * 0.3), 1.6 / Math.abs(p.twist)));
      if (!(z1 > z0 * 1.02)) continue;
      if ((p.radius * this.fov) / z0 > ASTRAL_EDGE) continue;
      const ratio = z1 / z0;
      for (let i = 0; i < ASTRAL_MOTE_NODES; i++) {
        const z = z0 * Math.pow(ratio, i / (ASTRAL_MOTE_NODES - 1));
        const ang = p.ang + p.twist * (z + this.cam) + roll;
        const r = (p.radius * this.fov) / z;
        mx[i] = this.aimX + Math.cos(ang) * r;
        my[i] = this.aimY + Math.sin(ang) * r;
      }
      const depth = clamp(1 - z0 / ASTRAL_FAR);
      const alpha = p.bright * depth * (0.16 + this.treble * 0.5 + this.pulse * 0.16);
      if (alpha < 0.012) continue;
      const hex = astralHue(p.hue + this.hueShift);
      ctx.beginPath();
      ctx.moveTo(mx[0], my[0]);
      astralSpline(ctx, mx, my, false);
      ctx.strokeStyle = rgba(hex, alpha * 0.3);
      ctx.lineWidth = 1.1 + depth * 2.6;
      ctx.stroke();
      ctx.strokeStyle = rgba(hex, alpha);
      ctx.lineWidth = 0.35 + depth * 0.9;
      ctx.stroke();
    }
  }

  draw(ctx) {
    // Black, opaque, and no gradient: the corridor is empty space, and any lift in
    // the background greys out the one thing the preset is made of.
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
    const roll = this.rollAt();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'round';
    // The haze. Three soft lights placed around the axis on the same wheel the
    // strands read from, so the quadrants of the frame carry the colour that the
    // strands crossing them are about to be.
    for (let i = 0; i < 3; i++) {
      const ang = roll * 0.6 + (i / 3) * TAU;
      const hex = astralHue(ang / TAU + this.hueShift);
      this.glowDot(ctx, this.aimX + Math.cos(ang) * 130, this.aimY + Math.sin(ang) * 95,
        140 + this.bass * 70, hex, 0.06 + this.mid * 0.07);
    }
    // Deliberately NOT off `level`: broadband amplitude runs around 0.04 on these
    // banks, so a picture keyed to it sits at its floor for the whole song. The
    // bands and the kit are where the loudness actually is.
    const strength = 0.36 + this.bass * 0.24 + this.mid * 0.15 + this.breath * 0.28;
    for (const s of this.strands) {
      if (!this.layout(s, roll)) continue;
      // Both ends of a strand's life are faded rather than cut. Without the second
      // term a strand spends its last second as a pointed leaf floating in open
      // frame — the far tip is all that is left of it, and a lone tip that does not
      // reach the vanishing point reads as debris rather than as light.
      const born = clamp((ASTRAL_FAR - s.z) / 200);
      const leaving = clamp((s.z + s.length - ASTRAL_NEAR) / 520);
      const alpha = clamp(s.bright * strength * born * leaving);
      if (alpha < 0.004) continue;
      this.paintStrand(ctx, s, alpha);
      this.paintCore(ctx, s, alpha * (0.32 + this.pulse * 0.3));
      if (alpha > 0.12) this.drawBeads(ctx, s, roll, alpha);
    }
    this.drawMotes(ctx, roll);
    // The knot the strands come out of. It is a light, not a hole: the darkness in
    // the middle of the reference picture is where the strands cross, and that is
    // drawn by the strands themselves.
    this.glowDot(ctx, this.aimX, this.aimY, 18 + this.bass * 34 + this.warp * 46,
      '#ffffff', 0.16 + this.pulse * 0.3);
    this.glowDot(ctx, this.aimX, this.aimY, 58 + this.bass * 74,
      astralHue(roll / TAU + this.hueShift + 0.5), 0.1 + this.mid * 0.16);
    ctx.restore();
    // No drawDust: the shared bed paints two-point streaks, and a straight line is
    // the one mark this picture does not contain. The motes are its dust.
    this.modernFinish(ctx, 0.36);
  }
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// VJ MEGAMIX — the pack playing itself.
//
// One preset holds the screen for a full 16-bar phrase, then the next is cued in
// and the two are mixed. Every blend LANDS on the downbeat rather than starting
// on one, so the incoming scene is already up and running as the phrase turns
// over; the two chop transitions move in eighth notes on top of that.
//
// There are no offscreen buffers here. Every preset lays an opaque backdrop and
// then adds its light on top of it, so painting the incoming preset over the
// outgoing one at alpha p is already a true A*(1-p) + B*p crossfade — its
// additive layers land at exactly the same weight as its backdrop. The same
// fact lets a clip path or a context transform carry the wipes for free. Two
// presets in one frame is the whole cost, which is what the jukebox's own
// swipe-switch has always paid.
// ---------------------------------------------------------------------------

// A full 16-bar phrase per record.
export const MEGAMIX_CYCLE_BEATS = 64;
// Dev audition cycle. A move lands every four bars instead of every sixteen,
// and the list is walked in order rather than shuffled: long enough to see both
// records settle either side of the blend, short enough that the whole set goes
// past in about eighty seconds rather than five and a half minutes.
export const MEGAMIX_AUDITION_BEATS = 16;
// How far ahead the next record is cued. It updates unseen for this long before
// the blend starts, so it arrives with its particle fields already moving rather
// than from a standing start. Must be at least as long as the longest blend, and
// is clamped to the cycle so the short audition cycle cues at the boundary.
const MEGAMIX_PLAN_LEAD = 8;

// Dev-only audition switch, reached from the dev menu's VISUALISERS list and
// from ?goto=soundtest&audition. Both of those live behind Dev.enabled, which is
// only ever true in an `npm run dev` build — so a shipped bundle has no way to
// turn this on, exactly like every other dev surface.
let megamixAudition = false;
export function setMegamixAudition(on) { megamixAudition = !!on; }
// Reaches every corner from anywhere the drifting focal point can be.
const MEGAMIX_COVER_R = 320;
const MEGAMIX_SHATTER_COLS = 16;
const MEGAMIX_SHATTER_ROWS = 9;
// Both quantized transitions move in eighth notes: fast enough to read as a
// chop, slow enough that every step is unmistakably ON something.
const MEGAMIX_CHOP_STEPS = 8;
const MEGAMIX_VENETIAN_STRIPS = 9;
// Nearly opaque on purpose: the readout has to stay readable through FLASH CUT,
// which by design fills the frame with light at the exact moment you are trying
// to read which move just fired.
const MEGAMIX_READOUT_PLATE = 'rgba(3,4,12,0.88)';

// `beats` is how long the move takes; `align` says which instant of it the
// downbeat is — the end for a blend, the middle for a cut. `solo` marks the
// moves that never put two presets in the same frame.
export const MEGAMIX_TRANSITIONS = [
  {
    name: 'DISSOLVE',
    beats: 4,
    run(ctx, mix, from, to, p) {
      const k = smooth(p);
      if (k < 0.995) mix.paint(ctx, from, 1);
      mix.paint(ctx, to, k);
    },
  },
  {
    name: 'DOUBLE EXPOSURE',
    beats: 4,
    run(ctx, mix, from, to, p) {
      // Both records go down additively on a black bed, so the middle of the
      // blend is the light of two scenes at once rather than one backdrop
      // quietly hiding the other. The bump is what makes it bloom through the
      // handover instead of passing through a muddy halfway house.
      const k = smooth(p);
      const bump = 1 + Math.sin(p * Math.PI) * 0.55;
      ctx.save();
      ctx.globalAlpha = mix.baseAlpha;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      mix.paint(ctx, from, Math.min(1, (1 - k) * bump));
      mix.paint(ctx, to, Math.min(1, k * bump));
      ctx.restore();
    },
  },
  {
    name: 'BLOCK SHATTER',
    beats: 4,
    run(ctx, mix, from, to, p) {
      mix.paint(ctx, from, 1);
      const order = mix.shatterOrder;
      const step = Math.min(MEGAMIX_CHOP_STEPS, Math.floor(p * MEGAMIX_CHOP_STEPS + 1e-6));
      const shown = Math.round(step / MEGAMIX_CHOP_STEPS * order.length);
      if (!shown) return;
      const cw = W / MEGAMIX_SHATTER_COLS;
      const ch = H / MEGAMIX_SHATTER_ROWS;
      const boxes = (start, end, inset) => {
        for (let i = start; i < end; i++) {
          const c = order[i];
          ctx.rect((c % MEGAMIX_SHATTER_COLS) * cw + inset, Math.floor(c / MEGAMIX_SHATTER_COLS) * ch + inset,
            cw - inset * 2, ch - inset * 2);
        }
      };
      ctx.save();
      ctx.beginPath();
      // A quarter pixel of overlap, so neighbouring blocks cannot leave a
      // hairline of the outgoing preset standing between them.
      boxes(0, shown, -0.25);
      ctx.clip();
      mix.paint(ctx, to, 1);
      ctx.restore();
      // The batch that just landed keeps a lit edge for the rest of its eighth,
      // which is what makes the chop read as ON the note rather than merely
      // coincident with it.
      const glow = (1 - (p * MEGAMIX_CHOP_STEPS - step)) * 0.5;
      if (glow <= 0.02) return;
      ctx.save();
      ctx.globalAlpha = mix.baseAlpha;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(mix.palette[2], glow);
      ctx.lineWidth = 1;
      ctx.beginPath();
      boxes(Math.round((step - 1) / MEGAMIX_CHOP_STEPS * order.length), shown, 0.5);
      ctx.stroke();
      ctx.restore();
    },
  },
  {
    name: 'VENETIAN',
    beats: 2,
    run(ctx, mix, from, to, p) {
      mix.paint(ctx, from, 1);
      const k = smooth(p);
      if (k <= 0.001) return;
      // Each blind opens a little after the one above it, and alternate blinds
      // open from opposite edges, so this reads as slats rather than as one
      // curtain that happens to have been cut into strips.
      const sh = H / MEGAMIX_VENETIAN_STRIPS;
      const stagger = 0.45;
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < MEGAMIX_VENETIAN_STRIPS; i++) {
        const local = smooth(clamp((k - i / (MEGAMIX_VENETIAN_STRIPS - 1) * stagger) / (1 - stagger)));
        if (local <= 0) continue;
        const w = W * local;
        ctx.rect(i % 2 ? W - w : 0, i * sh - 0.25, w, sh + 0.5);
      }
      ctx.clip();
      mix.paint(ctx, to, 1);
      ctx.restore();
    },
  },
  {
    name: 'IRIS',
    beats: 2,
    run(ctx, mix, from, to, p) {
      mix.paint(ctx, from, 1);
      const k = smooth(p);
      const r = k * MEGAMIX_COVER_R;
      if (r < 1) return;
      ctx.save();
      ctx.beginPath();
      ctx.arc(mix.focusX, mix.focusY, r, 0, TAU);
      ctx.clip();
      mix.paint(ctx, to, 1);
      ctx.restore();
      // A lit rim on the opening, brightest while it is small: without it the
      // new scene arrives as a hole cut in the old one.
      ctx.save();
      ctx.globalAlpha = mix.baseAlpha;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(mix.palette[1], 0.55 * (1 - k));
      ctx.lineWidth = 1.5 + (1 - k) * 3;
      ctx.beginPath();
      ctx.arc(mix.focusX, mix.focusY, r, 0, TAU);
      ctx.stroke();
      ctx.restore();
    },
  },
  {
    name: 'RADAR SWEEP',
    beats: 4,
    run(ctx, mix, from, to, p) {
      mix.paint(ctx, from, 1);
      if (p <= 0.002) return;
      // One full turn per bar, with the leading edge lit: the wedge is a beam
      // that repaints the screen as it passes.
      const a0 = mix.sweepFrom;
      const a1 = a0 + TAU * p;
      const ex = CX + Math.cos(a1) * MEGAMIX_COVER_R;
      const ey = CY + Math.sin(a1) * MEGAMIX_COVER_R;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.arc(CX, CY, MEGAMIX_COVER_R, a0, a1);
      ctx.closePath();
      ctx.clip();
      mix.paint(ctx, to, 1);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = mix.baseAlpha;
      ctx.globalCompositeOperation = 'lighter';
      const beam = ctx.createLinearGradient(CX, CY, ex, ey);
      beam.addColorStop(0, rgba(mix.palette[2], 0));
      beam.addColorStop(0.35, rgba(mix.palette[2], 0.5));
      beam.addColorStop(1, rgba(mix.palette[2], 0));
      ctx.strokeStyle = beam;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.restore();
    },
  },
  {
    name: 'PUSH',
    beats: 2,
    run(ctx, mix, from, to, p) {
      // Two whole frames side by side, each clipped to its own share of the
      // screen: the outgoing record slides off and drags the incoming one on.
      const k = smooth(p);
      const dx = mix.pushX * W * k;
      const dy = mix.pushY * H * k;
      const band = (ox, oy, child) => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(ox, oy, W, H);
        ctx.clip();
        ctx.translate(ox, oy);
        mix.paint(ctx, child, 1);
        ctx.restore();
      };
      band(-dx, -dy, from);
      band(mix.pushX * W - dx, mix.pushY * H - dy, to);
      const seamX = (mix.pushX > 0 ? W : 0) - dx;
      const seamY = (mix.pushY > 0 ? H : 0) - dy;
      ctx.save();
      ctx.globalAlpha = mix.baseAlpha;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(mix.palette[3], 0.5);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (mix.pushX) { ctx.moveTo(seamX, 0); ctx.lineTo(seamX, H); } else { ctx.moveTo(0, seamY); ctx.lineTo(W, seamY); }
      ctx.stroke();
      ctx.restore();
    },
  },
  {
    name: 'ZOOM THROUGH',
    beats: 4,
    run(ctx, mix, from, to, p) {
      // The outgoing scene magnifies past the camera while the incoming one
      // holds still behind it. A push through, not a zoom out.
      const k = smooth(p);
      mix.paint(ctx, to, 1);
      if (k >= 0.995) return;
      const s = 1 + k * 2.2;
      ctx.save();
      ctx.translate(mix.focusX, mix.focusY);
      ctx.scale(s, s);
      ctx.translate(-mix.focusX, -mix.focusY);
      mix.paint(ctx, from, 1 - k);
      ctx.restore();
    },
  },
  {
    name: 'BEAT STUTTER',
    beats: 4,
    solo: true,
    run(ctx, mix, from, to, p) {
      // Never a blend: the two records simply alternate on the eighth, with the
      // odds ramping toward the new one and the last two chops committed to it,
      // so the chop lands rather than trailing off. One preset per frame makes
      // this the cheap way to mix as well as the most obviously rhythmic.
      const step = Math.min(MEGAMIX_CHOP_STEPS - 1, Math.floor(p * MEGAMIX_CHOP_STEPS));
      const onNew = mix.stutterMask[step];
      mix.paint(ctx, onNew ? to : from, 1);
      if (step === 0 || onNew !== mix.stutterMask[step - 1]) {
        mix.wash(ctx, '#ffffff', Math.pow(1 - (p * MEGAMIX_CHOP_STEPS - step), 5) * 0.28);
      }
    },
  },
  {
    name: 'FLASH CUT',
    beats: 1.5,
    align: 'centre',
    solo: true,
    run(ctx, mix, from, to, p) {
      // The only hard cut in the set, and the flash peaks exactly on it: the eye
      // is still recovering when the new scene arrives, which is what makes a
      // cut this abrupt read as intentional rather than as a dropped frame.
      mix.paint(ctx, p < 0.5 ? from : to, 1);
      const near = 1 - Math.abs(p - 0.5) * 2;
      mix.wash(ctx, mixHex('#ffffff', mix.palette[1], 0.3), Math.pow(near, 2.2) * 0.7);
    },
  },
];

const MEGAMIX_SOLO_TRANSITIONS = MEGAMIX_TRANSITIONS.filter((move) => move.solo);
const MEGAMIX_INDEX = VISUALISER_NAMES.indexOf('VJ MEGAMIX');
const MEGAMIX_ROSTER = VISUALISER_NAMES.map((_, index) => index).filter((index) => index !== MEGAMIX_INDEX);

/**
 * The two presets that put MASHENSTEIN's cast and appliances on screen.
 *
 * Named here rather than left to be worked out, because the modules they draw
 * from — ../sprites/toons.js and ../sprites/props.js — are imported at module
 * scope. Declining to OFFER these two does not keep the characters out of a
 * bundle; a build that wants them gone has to strip those modules as well, and
 * then it must not deal these presets to anything, or the pack draws nothing.
 * tools/build-visualiser.js does both halves.
 */
export const SPRITE_VISUALISERS = ['ARCADE ART GALLERY', 'TOASTER SKY PARADE'];

// Which presets the pack will DEAL. Not which it can build: createVisualiser
// stays a plain lookup, because the game's dev menu addresses presets by index
// and an excluded one would silently become its neighbour. This governs the two
// paths that choose for you — the jukebox's shuffle and the megamix's deck.
let excludedVisualisers = new Set();

/**
 * Take presets out of circulation for this build. The game never calls it; a
 * host that has stripped the sprite modules does, at boot, once.
 */
export function setExcludedVisualisers(names = []) {
  excludedVisualisers = new Set(
    names.map((name) => (typeof name === 'number' ? name : VISUALISER_NAMES.indexOf(name)))
      .filter((index) => index >= 0),
  );
}

export function isVisualiserExcluded(index) {
  return excludedVisualisers.has(index);
}
// Presets whose frame is expensive enough that painting two of them at once is a
// real risk on a phone. With one of these on either deck the mixer sticks to the
// transitions that only ever paint ONE record per frame.
const MEGAMIX_HEAVY = new Set(['ACID JULIA DIVE', 'ASTRAL TRAVEL']
  .map((name) => VISUALISER_NAMES.indexOf(name))
  .filter((index) => index >= 0));

class VjMegamix extends BaseVisualiser {
  constructor(seed, track) {
    super(seed, track);
    this.name = VISUALISER_NAMES[MEGAMIX_INDEX];
    this.rosterRng = this.rng.stream('megamix-roster');
    this.mixRng = this.rng.stream('megamix-mix');
    this.childRng = this.rng.stream('megamix-child');
    // Latched at construction rather than read per frame, so toggling the dev
    // switch never changes a mixer that is already running.
    this.audition = megamixAudition;
    this.cycleBeats = this.audition ? MEGAMIX_AUDITION_BEATS : MEGAMIX_CYCLE_BEATS;
    this.auditionStep = 0;
    this.roster = [];
    this.currentIndex = this.takeNextIndex();
    this.current = this.spawn(this.currentIndex);
    this.plan = null;
    this.lastTransition = null;
    // Its own phrase clock. `beat` restarts when a song loops and the
    // screensaver can be opened mid-song, so this one is derived from that but
    // only ever moves forward. See update() for what it does with a jump.
    this.mixBeat = 0;
    this.switchBeat = this.cycleBeats;
    this.baseAlpha = 1;
    this.label = `MEGAMIX / ${this.current.name}`;
    // Re-rolled for every handover, so the same move never lands twice the same
    // way: which blocks fall in which order, which chops keep the old record,
    // where the sweep starts, which way the push travels.
    this.shatterOrder = [];
    this.stutterMask = [];
    this.sweepFrom = 0;
    this.pushX = 1;
    this.pushY = 0;
    this.rollTransitionShape();
  }

  spawn(index) {
    return createVisualiser(index, (this.childRng.next() * 0xffffffff) >>> 0, this.track);
  }

  // Dealt from a shuffled deck rather than picked at random: one pass plays
  // every preset in the pack exactly once before any of them comes round again.
  takeNextIndex() {
    if (!this.roster.length) {
      // An audition deals the WHOLE pack, expensive presets included. It cannot
      // lose the move it is auditioning to the heavy-preset substitution —
      // pickTransition() bypasses that rule outright in this mode — and the
      // costly pairings are exactly the ones worth watching the frame rate
      // through, which is the other half of what this bench is for.
      // Excluded presets never reach the deck, in an audition too: a build that
      // stripped the sprite modules cannot draw them, and "the whole pack" means
      // the whole pack that exists in this build.
      this.roster = this.rosterRng.shuffle(MEGAMIX_ROSTER.filter((index) => !isVisualiserExcluded(index)));
      // A reshuffle must not put the record that is already on the deck back on
      // top of the pile.
      if (this.roster.length > 1 && this.roster[0] === this.currentIndex) this.roster.push(this.roster.shift());
    }
    return this.roster.shift();
  }

  rollTransitionShape() {
    const cells = MEGAMIX_SHATTER_COLS * MEGAMIX_SHATTER_ROWS;
    this.shatterOrder = this.mixRng.shuffle(Array.from({ length: cells }, (_, i) => i));
    this.stutterMask = Array.from({ length: MEGAMIX_CHOP_STEPS }, (_, i) => (
      i >= MEGAMIX_CHOP_STEPS - 2 || this.mixRng.chance((i + 1) / (MEGAMIX_CHOP_STEPS + 1)) ? 1 : 0
    ));
    this.sweepFrom = this.mixRng.float() * TAU;
    const dir = this.mixRng.int(0, 3);
    this.pushX = dir === 0 ? 1 : dir === 1 ? -1 : 0;
    this.pushY = dir === 2 ? 1 : dir === 3 ? -1 : 0;
  }

  pickTransition(nextIndex) {
    // An audition walks the list in order and shows every move exactly once per
    // pass, which is the whole point of it — nothing is skipped or repeated.
    if (this.audition) {
      const move = MEGAMIX_TRANSITIONS[this.auditionStep % MEGAMIX_TRANSITIONS.length];
      this.auditionStep++;
      this.lastTransition = move;
      return move;
    }
    const pool = MEGAMIX_HEAVY.has(nextIndex) || MEGAMIX_HEAVY.has(this.currentIndex)
      ? MEGAMIX_SOLO_TRANSITIONS
      : MEGAMIX_TRANSITIONS;
    let move = this.mixRng.pick(pool);
    // Never the same move twice running. Half the point of the set is that you
    // cannot predict how the next record is going to arrive.
    if (pool.length > 1 && move === this.lastTransition) move = pool[(pool.indexOf(move) + 1) % pool.length];
    this.lastTransition = move;
    return move;
  }

  cue(boundary) {
    const index = this.takeNextIndex();
    const transition = this.pickTransition(index);
    this.rollTransitionShape();
    // A blend finishes on the downbeat, so the new scene is established as the
    // phrase turns over. A cut puts its own moment — the frame inside the
    // flash where the picture changes — on it instead.
    const startBeat = transition.align === 'centre'
      ? boundary - transition.beats * 0.5
      : boundary - transition.beats;
    return { index, transition, incoming: this.spawn(index), startBeat, endBeat: startBeat + transition.beats };
  }

  transitionAmount() {
    const plan = this.plan;
    if (!plan || this.mixBeat <= plan.startBeat) return 0;
    return clamp((this.mixBeat - plan.startBeat) / (plan.endBeat - plan.startBeat));
  }

  update(dt, analysis) {
    super.update(dt, analysis);
    let step = this.beat - this.prevBeat;
    // A song that loops hands back a beat count that restarts, and the first
    // frame can arrive a long way into a song. Keep only the sub-beat remainder
    // in those cases: the phrase clock loses the jump but stays locked to the
    // song's downbeats, which is the half the transitions are aimed at.
    if (!(step >= 0) || step > 4) step = ((step % 1) + 1) % 1;
    this.mixBeat += step;
    this.current.update(dt, analysis);
    const lead = Math.min(MEGAMIX_PLAN_LEAD, this.cycleBeats);
    if (!this.plan && this.mixBeat >= this.switchBeat - lead) this.plan = this.cue(this.switchBeat);
    if (this.plan) {
      this.plan.incoming.update(dt, analysis);
      if (this.mixBeat >= this.plan.endBeat) {
        this.current = this.plan.incoming;
        this.currentIndex = this.plan.index;
        this.switchBeat += this.cycleBeats;
        this.plan = null;
      }
    }
    // The corner tag names whichever record is actually on screen, and changes
    // hands halfway through the blend.
    const showing = this.plan && this.transitionAmount() >= 0.5 ? this.plan.incoming : this.current;
    this.label = `MEGAMIX / ${showing.name}`;
  }

  // One preset, painted at a weight. `frameAlpha` goes along with the context
  // alpha so the few presets that assign globalAlpha mid-frame stay inside the
  // blend instead of punching through it at full strength.
  paint(ctx, child, alpha) {
    const a = this.baseAlpha * alpha;
    if (!(a > 0.002)) return;
    ctx.save();
    ctx.globalAlpha = a;
    child.frameAlpha = a;
    child.draw(ctx);
    child.frameAlpha = 1;
    ctx.restore();
  }

  wash(ctx, color, alpha) {
    const a = this.baseAlpha * alpha;
    if (!(a > 0.004)) return;
    ctx.save();
    ctx.globalAlpha = clamp(a);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // Dev audition readout. Deliberately plain and top-anchored: the jukebox's own
  // titles own the bottom corners, and a move cannot be judged against chrome
  // that sits in the middle of the picture it is trying to show.
  auditionReadout(ctx) {
    const move = this.plan ? this.plan.transition : this.lastTransition;
    if (!move) return;
    const p = this.transitionAmount();
    const step = ((this.auditionStep - 1) % MEGAMIX_TRANSITIONS.length + MEGAMIX_TRANSITIONS.length)
      % MEGAMIX_TRANSITIONS.length;
    const title = `${String(step + 1).padStart(2, '0')}/${MEGAMIX_TRANSITIONS.length}  ${move.name}`;
    const detail = `${move.beats} BEATS  ${move.align === 'centre' ? 'CUT ON' : 'LANDS ON'} THE DOWNBEAT`
      + `${move.solo ? '  SOLO' : ''}`;
    const pair = `${this.current.name} > ${this.plan ? this.plan.incoming.name : '...'}`;
    const scale = 0.8;
    const barW = 200;
    const line = (text, y, color, s = scale) => drawText(ctx, text, (W - textWidth(text, s)) * 0.5, y, color, s, 'ui', MEGAMIX_READOUT_PLATE);
    ctx.save();
    ctx.globalAlpha = this.baseAlpha;
    line(title, 12, '#ffffff');
    line(detail, 24, '#7be0d0', 0.6);
    line(pair, 34, '#c9a0ff', 0.6);
    // The bar is the move's own progress, with a tick per beat of it, so a
    // transition that drifts off the grid shows up here rather than by eye.
    const barX = (W - barW) * 0.5;
    ctx.fillStyle = MEGAMIX_READOUT_PLATE;
    ctx.fillRect(barX - 2, 44, barW + 4, 7);
    ctx.fillStyle = '#48e0c8';
    ctx.fillRect(barX, 46, barW * p, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    for (let beat = 1; beat < move.beats; beat++) ctx.fillRect(barX + barW * (beat / move.beats), 45, 1, 5);
    ctx.restore();
  }

  draw(ctx) {
    // Whatever the jukebox's own fade has set is the ceiling for both records.
    this.baseAlpha = ctx.globalAlpha;
    const p = this.transitionAmount();
    if (!this.plan || p <= 0) this.paint(ctx, this.current, 1);
    else this.plan.transition.run(ctx, this, this.current, this.plan.incoming, p);
    if (this.audition) this.auditionReadout(ctx);
  }
}

/**
 * The half-pipe with its constants exposed. Deliberately NOT a member of
 * VISUALISER_NAMES: the pack is what the game deals and what the mixer plays, and
 * a preset whose picture depends on where somebody left ten sliders is neither.
 * It is reached only from the desk's own Visualiser panel, which is where the
 * sliders are — the same line the gallery's bake-off sections hold.
 */
export function createHalfPipeLab(seed, track, tune) {
  return new HalfPipeHorizon(seed >>> 0, track, tune);
}

export function createVisualiser(name, seed, track) {
  const index = typeof name === 'number' ? name : VISUALISER_NAMES.indexOf(name);
  const constructors = [NeonCathedral, LiquidChrome, LaserGrid, MonsterReactor, ElectricKaleidoscope, DeepSpaceWormhole, PrismaticStorm, SingularityBloom, HolographicOcean, DataRainAscension, FractalFlame, OscilloscopeOverdrive, ArcadeArtGallery, ToasterSkyParade, ChromaBubblestorm, EmeraldCodeRain, AcidJuliaDive, HyperVectorTunnel, NebulaRibbonDrift, GlassBlobEqualizer, HalfPipeHorizon, AstralTravel, VjMegamix];
  const Ctor = constructors[Math.max(0, index) % constructors.length];
  return new Ctor(seed >>> 0, track);
}

// `random` is injectable so tests can prove the no-immediate-repeat rule
// without relying on global Math.random state.
export function pickVisualiser(previous = -1, random = Math.random) {
  const pack = VISUALISER_NAMES.map((_, index) => index).filter((index) => !isVisualiserExcluded(index));
  if (!pack.length) return 0;
  let at = Math.floor(random() * pack.length) % pack.length;
  if (pack.length > 1 && pack[at] === previous) at = (at + 1 + Math.floor(random() * (pack.length - 1))) % pack.length;
  return pack[at];
}
