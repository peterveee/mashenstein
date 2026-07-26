// Jukebox screensaver visuals. These are deliberately Canvas2D-native: the
// game already presents a fixed 480x270 logical backbuffer, so keeping the
// presets here makes the 2D fallback and the WebGL upload path identical.
import { Rng } from './rng.js';
import { drawToon } from '../sprites/toons.js';
import { drawApplianceFinish, drawProp, hasProp, propFrames, propFps } from '../sprites/props.js';

export const VISUALIZER_NAMES = [
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

class BaseVisualizer {
  constructor(seed, track = {}) {
    this.seed = seed >>> 0;
    this.rng = new Rng(this.seed);
    this.track = track;
    this.palette = pickPalette(this.rng);
    this.t = 0;
    this.beat = 0;
    this.prevBeat = 0;
    this.beatPhase = 0;
    this.beatPulse = 0;
    this.bass = 0;
    this.mid = 0;
    this.treble = 0;
    this.analysis = null;
    this.focusPhase = this.rng.float() * TAU;
    this.focusX = CX;
    this.focusY = CY;
    this.dust = makePool(96);
    this.dust.forEach((p) => seedDust(p, this.rng));
    this.name = 'VISUALIZER';
  }

  update(dt, analysis = {}) {
    this.t += Math.max(0, dt);
    this.analysis = analysis;
    this.prevBeat = this.beat;
    this.beat = Number.isFinite(analysis.beat)
      ? analysis.beat
      : this.t * ((this.track.bpm || 112) / 60);
    this.beatPhase = Number.isFinite(analysis.beatPhase)
      ? analysis.beatPhase
      : ((this.beat % 1) + 1) % 1;
    this.beatPulse = Number.isFinite(analysis.beatPulse)
      ? analysis.beatPulse
      : Math.pow(1 - this.beatPhase, 5);
    this.bass = clamp(analysis.bass ?? 0.25);
    this.mid = clamp(analysis.mid ?? 0.2);
    this.treble = clamp(analysis.treble ?? 0.15);
    // The focal object drifts through a soft Lissajous path. It is intentionally
    // restrained so the motion feels designed rather than camera-shaky.
    this.focusX = CX + Math.sin(this.t * 0.31 + this.focusPhase) * (25 + this.bass * 18);
    this.focusY = CY + Math.cos(this.t * 0.23 + this.focusPhase * 0.7) * (14 + this.mid * 13);
    for (const p of this.dust) {
      p.life -= dt * (0.08 + this.treble * 0.28);
      if (p.life <= 0) seedDust(p, this.rng);
      p.px = p.x; p.py = p.y;
      p.x += Math.sin(this.t * (0.35 + p.z * 0.4) + p.hue * TAU) * dt * (4 + this.mid * 12);
      p.y -= dt * (2 + this.bass * 8) * p.z;
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
      ctx.lineWidth = 0.45 + p.z * (0.7 + this.beatPulse * 1.2);
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

class NeonCathedral extends BaseVisualizer {
  constructor(seed, track) { super(seed, track); this.name = VISUALIZER_NAMES[0]; this.sparks = makePool(72); this.sparks.forEach((p) => seedParticle(p, this.rng)); }
  update(dt, a) {
    super.update(dt, a);
    for (const p of this.sparks) {
      p.life -= dt * (0.38 + this.treble * 0.9);
      if (p.life <= 0) seedParticle(p, this.rng, this.focusX, this.focusY - 23, 0.55);
      p.px = p.x; p.py = p.y;
      p.x += (p.x - this.focusX) * dt * (0.16 + this.beatPulse * 0.55);
      p.y += (p.y - (this.focusY - 23)) * dt * (0.14 + this.beatPulse * 0.4);
    }
  }
  draw(ctx) {
    this.backdrop(ctx, '#030713', '#170c33');
    const horizon = this.focusY - 24;
    const focusX = this.focusX;
    const pulse = this.beatPulse;
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
      ctx.ellipse(focusX, horizon, 22 + i * 13 + pulse * 8, 7 + i * 5, Math.sin(this.t * 0.4 + i) * 0.08, 0, TAU);
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

class LiquidChrome extends BaseVisualizer {
  constructor(seed, track) { super(seed, track); this.name = VISUALIZER_NAMES[1]; }
  draw(ctx) {
    this.backdrop(ctx, '#050615', '#160b2b');
    // A very slow camera orbit gives the whole chrome field a sense of mass.
    // The tiny bass term lets the rotation lean into louder sections without
    // turning the scene into a distracting spin.
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(this.t * 0.018 + this.bass * 0.008 * Math.sin(this.t * 0.35));
    ctx.translate(-CX, -CY);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const blobs = 5;
    for (let i = 0; i < blobs; i++) {
      const a = this.t * (0.18 + i * 0.021) + i * 1.26;
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
        const y = this.focusY + (lane - 2.5) * 21 + Math.sin(x * 0.024 + this.t * (0.9 + lane * 0.05)) * (15 + this.mid * 23) + Math.sin(x * 0.057 - this.t * 0.6) * 8;
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
      const a = this.t * (0.24 + i * 0.03) + i * 1.7;
      ctx.strokeStyle = rgba(this.palette[(i + 2) % this.palette.length], 0.18 + this.treble * 0.16);
      ctx.lineWidth = 1 + this.treble * 1.6;
      ctx.beginPath();
      ctx.ellipse(this.focusX + Math.cos(a) * 22, this.focusY + Math.sin(a) * 14, 95 + i * 15, 34 + i * 8, a * 0.25, a, a + 1.4);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba('#ffffff', 0.28 + this.treble * 0.24);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(95 + Math.sin(this.t * 0.7) * 20, 72 + Math.cos(this.t * 0.5) * 11);
    ctx.bezierCurveTo(165, 52, 250, 88 + this.mid * 22, 382 + Math.cos(this.t * 0.8) * 18, 62 + this.bass * 20);
    ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', 0.12 + this.beatPulse * 0.2);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(this.focusX, this.focusY, 120 + this.bass * 30, 53 + this.mid * 14, Math.sin(this.t * 0.2) * 0.4, 0, TAU); ctx.stroke();
    ctx.restore();
    this.drawDust(ctx, 0.62);
    ctx.restore();
    this.modernFinish(ctx, 0.16);
  }
}

class LaserGrid extends BaseVisualizer {
  constructor(seed, track) { super(seed, track); this.name = VISUALIZER_NAMES[2]; }
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
      const h = 12 + v * (50 + this.bass * 70) + this.beatPulse * (i % 3 === 0 ? 18 : 5);
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
    if (this.beatPulse > 0.02) {
      ctx.strokeStyle = rgba(this.palette[3], this.beatPulse * 0.65);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(sunX, horizon + (sunY - 84) * 0.35, 35 + (1 - this.beatPulse) * 160, 10 + (1 - this.beatPulse) * 45, 0, 0, TAU); ctx.stroke();
    }
    ctx.restore();
    this.drawDust(ctx, 0.82);
    this.modernFinish(ctx, 0.2);
  }
}

class MonsterReactor extends BaseVisualizer {
  constructor(seed, track) {
    super(seed, track); this.name = VISUALIZER_NAMES[3]; this.sparks = makePool(70);
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
      const travel = (this.t * p.speed + p.phase) % 1;
      p.x = -105 + travel * (W + 210);
      p.y = p.lane + Math.sin(this.t * (0.55 + i * 0.12) + p.phase * TAU) * (12 + i * 4);
    }
    const lead = this.reactors[0];
    for (const p of this.sparks) {
      p.life -= dt * (0.55 + this.treble);
      if (p.life <= 0) seedParticle(p, this.rng, lead.x, lead.y, 0.6);
      p.px = p.x; p.py = p.y;
      p.x += (p.x - lead.x) * dt * 0.08 + Math.cos(this.t * 2 + p.hue * TAU) * dt * 22;
      p.y += (p.y - lead.y) * dt * 0.08 + Math.sin(this.t * 1.7 + p.hue * TAU) * dt * 22;
    }
  }
  draw(ctx) {
    this.backdrop(ctx, '#050914', '#100b27');
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let reactorIndex = 0; reactorIndex < this.reactors.length; reactorIndex++) {
      const reactor = this.reactors[reactorIndex];
      if (!reactor.active) continue;
      const fx = reactor.x; const fy = reactor.y;
      const core = (30 + this.bass * 26 + this.beatPulse * 12) * reactor.scale;
      this.glowDot(ctx, fx, fy, core * 3.2, this.palette[reactorIndex % this.palette.length], 0.32 + this.bass * 0.24);
      for (let ring = 0; ring < 4; ring++) {
        ctx.strokeStyle = rgba(this.palette[(ring + reactorIndex) % this.palette.length], 0.22 + this.mid * 0.15);
        ctx.lineWidth = 1 + (ring === 0 ? this.beatPulse * 2 : 0);
        ctx.beginPath(); ctx.ellipse(fx, fy, core + ring * 19 * reactor.scale, core * 0.53 + ring * 9 * reactor.scale, this.t * (ring % 2 ? -0.2 : 0.16), 0, TAU); ctx.stroke();
      }
      const coreGlow = ctx.createRadialGradient(fx - core * 0.24, fy - core * 0.3, 1, fx, fy, core);
      coreGlow.addColorStop(0, rgba('#ffffff', 0.82));
      coreGlow.addColorStop(0.14, rgba(this.palette[reactorIndex % this.palette.length], 0.72));
      coreGlow.addColorStop(0.56, rgba(this.palette[(reactorIndex + 1) % this.palette.length], 0.34 + this.beatPulse * 0.24));
      coreGlow.addColorStop(1, rgba(this.palette[(reactorIndex + 1) % this.palette.length], 0));
      ctx.fillStyle = coreGlow;
      ctx.beginPath(); ctx.arc(fx, fy, core, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba('#ffffff', 0.55); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(fx, fy, core * 0.62, 0.2, Math.PI * 1.45); ctx.stroke();
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = rgba(this.palette[(i + 2 + reactorIndex) % this.palette.length], 0.2 + this.treble * 0.18);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(fx, fy, core * (1.18 + i * 0.1), this.t * (0.6 + i * 0.12) + i, this.t * (0.6 + i * 0.12) + i + 0.9 + this.mid);
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

class ElectricKaleidoscope extends BaseVisualizer {
  constructor(seed, track) {
    super(seed, track); this.name = VISUALIZER_NAMES[4]; this.symmetry = 12; this.lastPhrase = -1;
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
      p.angle += dt * p.spin * (p.orbitRate + this.mid * 0.72 + this.beatPulse * 0.3);
      // The satellites breathe radially across a much wider envelope than the
      // central bloom. At the outer crest their x/y positions can slip just
      // beyond the logical canvas before being pulled back into formation.
      p.radius = p.slotRadius
        + Math.sin(this.t * p.travelRate + p.travelPhase) * (p.travelDistance + this.bass * 18)
        + this.beatPulse * (8 + this.bass * 16);
      p.rotation += dt * p.spin * (1.45 + this.mid * 0.42);
      p.mergeFlash = Math.max(0, p.mergeFlash - dt * 2.8);
    }
  }
  draw(ctx) {
    this.backdrop(ctx, '#050516', '#170b2d');
    const petals = this.symmetry;
    const radius = 34 + this.bass * 36 + this.beatPulse * 10;
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
    ctx.strokeStyle = rgba('#ffffff', 0.4 + this.beatPulse * 0.3); ctx.lineWidth = 1;
    for (let i = 0; i < petals; i += 2) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(i * TAU / petals) * 112, Math.sin(i * TAU / petals) * 78); ctx.stroke(); }
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = rgba(this.palette[(i + 1) % this.palette.length], 0.16 + this.treble * 0.14);
      ctx.lineWidth = 1 + this.beatPulse;
      ctx.beginPath(); ctx.arc(0, 0, radius * (0.7 + i * 0.32), this.t * 0.16 + i, this.t * 0.16 + i + 1.8); ctx.stroke();
    }
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.72);
    core.addColorStop(0, rgba('#ffffff', 0.9));
    core.addColorStop(0.18, rgba(this.palette[0], 0.5));
    core.addColorStop(1, rgba(this.palette[0], 0));
    ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, 0, radius * 0.72, 0, TAU); ctx.fill();
    ctx.restore();
    this.glowDot(ctx, this.focusX, this.focusY, radius * 2.2, this.palette[1], 0.18 + this.beatPulse * 0.2);
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
      const r = p.size * (1 + this.beatPulse * 0.45 + p.mergeFlash * 0.18);
      const c = this.palette[Math.floor(p.hue * this.palette.length) % this.palette.length];
      this.glowDot(ctx, sx, sy, r * (2.4 + p.mergeFlash * 1.2), c, (0.1 + this.mid * 0.1) * alpha);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(sx, sy);
      // Fast, unmistakable full rotations: the satellites should read as
      // rotating kaleidoscopes, not petals that merely breathe in place.
      ctx.rotate(p.rotation);
      const satellitePulse = 1 + Math.sin(this.t * (1.8 + p.orbitRate * 3) + p.phase) * (0.05 + this.treble * 0.045);
      ctx.scale(satellitePulse, 1 / satellitePulse);
      for (let i = 0; i < p.petals; i++) {
        ctx.save(); ctx.rotate(i * TAU / p.petals);
        ctx.fillStyle = rgba(this.palette[(i + Math.floor(p.hue * 4)) % this.palette.length], 0.2 + this.treble * 0.16);
        ctx.strokeStyle = rgba(c, 0.35 + this.treble * 0.25); ctx.lineWidth = 0.7 + this.beatPulse * 0.7;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(r * 0.65, -r * 0.35, r * 1.5, 0); ctx.quadraticCurveTo(r * 0.65, r * 0.35, 0, 0); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = rgba('#ffffff', 0.35 + this.beatPulse * 0.3); ctx.beginPath(); ctx.arc(0, 0, 1.5 + this.beatPulse * 1.4, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    this.drawDust(ctx, 0.75);
    this.modernFinish(ctx, 0.16);
  }
}

class DeepSpaceWormhole extends BaseVisualizer {
  constructor(seed, track) {
    super(seed, track); this.name = VISUALIZER_NAMES[5]; this.stars = makePool(90);
    this.stars.forEach((p) => { p.z = this.rng.float(); p.life = 0.3 + this.rng.float() * 0.7; p.hue = this.rng.float(); });
  }
  update(dt, a) {
    super.update(dt, a);
    const speed = 0.16 + this.bass * 0.6 + this.beatPulse * 0.42;
    for (const p of this.stars) {
      p.px = p.x; p.py = p.y;
      p.z -= dt * speed;
      if (p.z <= 0.015) { p.z = 0.9 + this.rng.float() * 0.2; p.hue = this.rng.float(); }
      const angle = p.hue * TAU + this.t * (0.08 + p.life * 0.12);
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
      ctx.beginPath(); ctx.ellipse(this.focusX, this.focusY, 28 + i * 21 + this.beatPulse * 9, 12 + i * 9, this.t * (0.08 + i * 0.01), 0, TAU); ctx.stroke();
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
      ctx.beginPath(); ctx.arc(this.focusX, this.focusY, 54 + this.treble * 52, this.t * 0.7, this.t * 0.7 + 1.1); ctx.stroke();
    }
    ctx.fillStyle = '#01030c';
    ctx.beginPath(); ctx.arc(this.focusX, this.focusY, 13 + this.beatPulse * 5, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba('#ffffff', 0.28 + this.beatPulse * 0.3);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(this.focusX, this.focusY, 17 + this.beatPulse * 6, 0, TAU); ctx.stroke();
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

class PrismaticStorm extends BaseVisualizer {
  constructor(seed, track) {
    super(seed, track); this.name = VISUALIZER_NAMES[6]; this.shards = makePool(84);
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
    for (const p of this.shards) {
      p.angle += dt * p.spin * (0.18 + this.mid * 0.9);
      p.radius += dt * (7 + this.beatPulse * 36) * p.depth;
      p.rotation += dt * p.turn * (0.55 + this.treble * 1.1 + this.beatPulse * 0.25);
      if (p.radius > 240) p.radius = 20 + this.rng.float() * 35;
    }
  }
  draw(ctx) {
    this.backdrop(ctx, '#10052c', '#020814');
    const fx = this.focusX; const fy = this.focusY; const pulse = this.beatPulse;
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
      roundedTrianglePath(ctx, x, y, s, p.rotation, 0.25 + this.beatPulse * 0.04);
      ctx.fill();
      ctx.strokeStyle = rgba('#ffffff', 0.22 + this.treble * 0.24 + this.beatPulse * 0.18);
      ctx.lineWidth = 0.45 + this.beatPulse * 0.7;
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
    this.name = VISUALIZER_NAMES[14];
    this.orbs = this.shards;
  }
  draw(ctx) {
    this.backdrop(ctx, '#06172a', '#12052b');
    const fx = this.focusX; const fy = this.focusY; const pulse = this.beatPulse;
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

class SingularityBloom extends BaseVisualizer {
  constructor(seed, track) {
    super(seed, track); this.name = VISUALIZER_NAMES[7]; this.orbiters = makePool(112);
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
    this.bloomScale = 0.72 + swell * (2.7 + this.bass * 0.35) + this.beatPulse * 0.12;
    for (const p of this.orbiters) { p.angle += dt * p.speed * (0.45 + this.bass * 1.4); p.radius += Math.sin(this.t * 0.7 + p.hue * 8) * dt * 2; if (p.radius > 190) p.radius = 24; }
  }
  draw(ctx) {
    this.backdrop(ctx, '#08020f', '#16051f'); const fx = this.focusX; const fy = this.focusY; const core = 17 + this.bass * 19 + this.beatPulse * 8;
    this.glowDot(ctx, fx, fy, (115 + this.bass * 55) * this.bloomScale, this.palette[3], 0.19 + this.bass * 0.18);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.translate(fx, fy); ctx.scale(this.bloomScale, this.bloomScale); ctx.translate(-fx, -fy);
    for (let i = 0; i < 11; i++) { ctx.strokeStyle = rgba(this.palette[i % 4], 0.1 + this.mid * 0.12); ctx.lineWidth = 1 + (i === 0 ? this.beatPulse * 3 : 0); ctx.beginPath(); ctx.ellipse(fx, fy, 30 + i * 8 + this.bass * 18, 8 + i * 3, this.t * (0.18 + i * 0.011), 0, TAU); ctx.stroke(); }
    for (const p of this.orbiters) { const x = fx + Math.cos(p.angle) * p.radius; const y = fy + Math.sin(p.angle) * p.radius * p.tilt; const px = fx + Math.cos(p.angle - 0.06) * p.radius; const py = fy + Math.sin(p.angle - 0.06) * p.radius * p.tilt; ctx.strokeStyle = rgba(this.palette[Math.floor(p.hue * 4) % 4], 0.2 + this.treble * 0.8); ctx.lineWidth = 0.5 + p.z * 1.3; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke(); }
    const g = ctx.createRadialGradient(fx - core * 0.3, fy - core * 0.3, 0, fx, fy, core * 2.2); g.addColorStop(0, '#ffffff'); g.addColorStop(0.12, rgba(this.palette[1], 0.9)); g.addColorStop(0.36, rgba(this.palette[2], 0.5)); g.addColorStop(1, rgba(this.palette[2], 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx, fy, core * 2.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#010107'; ctx.beginPath(); ctx.arc(fx, fy, core, 0, TAU); ctx.fill(); ctx.strokeStyle = rgba('#ffffff', 0.5 + this.beatPulse * 0.3); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(fx, fy, core + 4 + this.beatPulse * 5, 0, TAU); ctx.stroke();
    ctx.restore(); this.drawDust(ctx, 1.1); this.modernFinish(ctx, 0.2);
  }
}

class HolographicOcean extends BaseVisualizer {
  constructor(seed, track) { super(seed, track); this.name = VISUALIZER_NAMES[8]; this.motes = makePool(80); this.motes.forEach((p) => { p.x = this.rng.float() * W; p.y = 70 + this.rng.float() * 150; p.px = p.x; p.py = p.y; p.z = this.rng.float(); p.hue = this.rng.float(); }); }
  update(dt, a) { super.update(dt, a); for (const p of this.motes) { p.px = p.x; p.py = p.y; p.x += Math.sin(this.t * (0.4 + p.z) + p.hue * 8) * dt * 8; p.y -= dt * (2 + p.z * 5); if (p.y < 58) { p.y = 235; p.x = this.rng.float() * W; } } }
  draw(ctx) {
    this.backdrop(ctx, '#02192b', '#050625'); const horizon = this.focusY + 14; const sunX = this.focusX + 36 * Math.sin(this.t * 0.22); const sunY = 76 + Math.cos(this.t * 0.31) * 12;
    this.glowDot(ctx, sunX, sunY, 60 + this.bass * 35, this.palette[1], 0.3 + this.mid * 0.16);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let row = 0; row < 18; row++) { const p = row / 18; const y = horizon + p * p * 150; const amp = 3 + p * (12 + this.bass * 26) + this.beatPulse * 5; ctx.strokeStyle = rgba(this.palette[(row + 1) % 4], 0.12 + p * 0.22 + this.mid * 0.1); ctx.lineWidth = 0.65 + p * 1.1; ctx.beginPath(); for (let x = -20; x <= W + 20; x += 12) { const wave = Math.sin(x * 0.028 + this.t * (1.2 + p) + row * 0.45) * amp + Math.sin(x * 0.065 - this.t * 0.7) * amp * 0.25; if (x === -20) ctx.moveTo(x, y + wave); else ctx.lineTo(x, y + wave); } ctx.stroke(); }
    for (let i = 0; i < 9; i++) { const y = horizon - 28 + i * 9 + Math.sin(this.t * 0.8 + i) * 4; ctx.strokeStyle = rgba(this.palette[i % 4], 0.15 + this.treble * 0.2); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y + Math.sin(this.t + i) * 5); ctx.stroke(); }
    for (const p of this.motes) { ctx.fillStyle = rgba(this.palette[Math.floor(p.hue * 4) % 4], 0.18 + p.z * 0.55); ctx.beginPath(); ctx.arc(p.x, p.y, 0.6 + p.z * 1.15, 0, TAU); ctx.fill(); }
    ctx.fillStyle = rgba('#ffffff', 0.35 + this.beatPulse * 0.3); ctx.beginPath(); ctx.arc(sunX, sunY, 12 + this.bass * 10, 0, TAU); ctx.fill(); ctx.restore();
    this.drawDust(ctx, 0.9); this.modernFinish(ctx, 0.15);
  }
}

class DataRainAscension extends BaseVisualizer {
  constructor(seed, track) { super(seed, track); this.name = VISUALIZER_NAMES[9]; this.streams = Array.from({ length: 38 }, () => ({ x: this.rng.float() * W, y: this.rng.float() * H, speed: 20 + this.rng.float() * 90, length: 5 + Math.floor(this.rng.float() * 15), phase: this.rng.float(), brightness: 0.2 + this.rng.float() * 0.8 })); }
  update(dt, a) { super.update(dt, a); for (const s of this.streams) { s.y += dt * s.speed * (0.55 + this.treble * 1.5); if (s.y - s.length * 7 > H) { s.y = -this.rng.float() * 90; s.x = this.rng.float() * W; } } }
  draw(ctx) {
    this.backdrop(ctx, '#020610', '#071b25'); const fx = this.focusX; const fy = this.focusY; this.glowDot(ctx, fx, fy, 95 + this.bass * 55, this.palette[0], 0.14 + this.beatPulse * 0.22);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const s of this.streams) { for (let i = 0; i < s.length; i++) { const y = s.y - i * 7; const a = s.brightness * (1 - i / s.length) * (0.22 + this.treble * 0.65); ctx.fillStyle = rgba(this.palette[Math.floor((s.phase + i * 0.13) * 4) % 4], a); const w = 1 + ((i + Math.floor(this.t * 12 * s.phase)) % 3); ctx.fillRect(s.x + Math.sin(i * 2.4 + s.phase * 7) * 3, y, w, 2.3); } }
    for (let i = 0; i < 10; i++) { ctx.strokeStyle = rgba(this.palette[i % 4], 0.14 + this.mid * 0.12); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(fx, fy, 18 + i * 12 + this.beatPulse * 9, this.t * (0.2 + i * 0.01) + i, this.t * (0.2 + i * 0.01) + i + 1.2); ctx.stroke(); }
    ctx.fillStyle = '#eaffff'; polygonPath(ctx, fx, fy, 12 + this.bass * 9, 6, this.t * 0.5); ctx.fill(); ctx.restore(); this.drawDust(ctx, 1.2); this.modernFinish(ctx, 0.18);
  }
}

class FractalFlame extends BaseVisualizer {
  constructor(seed, track) { super(seed, track); this.name = VISUALIZER_NAMES[10]; this.branches = makePool(68); this.branches.forEach((p) => { p.angle = this.rng.float() * TAU; p.radius = 16 + this.rng.float() * 100; p.length = 25 + this.rng.float() * 100; p.spin = -1 + this.rng.float() * 2; p.z = 0.25 + this.rng.float() * 0.75; p.hue = this.rng.float(); }); }
  update(dt, a) { super.update(dt, a); for (const p of this.branches) { p.angle += dt * p.spin * (0.2 + this.mid); p.radius += dt * (4 + this.bass * 20); if (p.radius > 125) p.radius = 12 + this.rng.float() * 18; } }
  draw(ctx) {
    this.backdrop(ctx, '#1b0506', '#10021c'); const fx = this.focusX; const fy = this.focusY; const core = 15 + this.bass * 24 + this.beatPulse * 8;
    this.glowDot(ctx, fx, fy, 100 + this.bass * 40, this.palette[2], 0.24 + this.bass * 0.18);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const p of this.branches) { const x = fx + Math.cos(p.angle) * p.radius; const y = fy + Math.sin(p.angle) * p.radius * 0.72; const len = p.length * (0.7 + this.treble * 0.8 + this.beatPulse * 0.3); const tipX = x + Math.cos(p.angle + Math.sin(this.t * 1.4 + p.hue * 7) * 0.5) * len; const tipY = y + Math.sin(p.angle + Math.sin(this.t * 1.4 + p.hue * 7) * 0.5) * len * 0.55; ctx.strokeStyle = rgba(this.palette[Math.floor(p.hue * 4) % 4], 0.22 + p.z * 0.45); ctx.lineWidth = 0.5 + p.z * 1.6; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo(x, y, tipX, tipY); ctx.stroke(); if (p.z > 0.45) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tipX + Math.cos(p.angle + 1.2) * 12, tipY + Math.sin(p.angle + 1.2) * 8); ctx.stroke(); } }
    for (let i = 0; i < 7; i++) { ctx.strokeStyle = rgba(this.palette[i % 4], 0.2 + this.beatPulse * 0.15); ctx.lineWidth = 1 + (i === 0 ? this.beatPulse * 2 : 0); ctx.beginPath(); ctx.arc(fx, fy, core + i * 10, this.t * (0.2 + i * 0.03), this.t * (0.2 + i * 0.03) + 1.4 + this.mid); ctx.stroke(); }
    const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, core); g.addColorStop(0, '#fff5d6'); g.addColorStop(0.22, rgba(this.palette[1], 0.95)); g.addColorStop(0.7, rgba(this.palette[3], 0.45)); g.addColorStop(1, rgba(this.palette[3], 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx, fy, core, 0, TAU); ctx.fill(); ctx.restore();
    this.drawDust(ctx, 1.15); this.modernFinish(ctx, 0.16);
  }
}

class OscilloscopeOverdrive extends BaseVisualizer {
  constructor(seed, track) {
    super(seed, track);
    this.name = VISUALIZER_NAMES[11];
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
    const amp = 29 + this.bass * 31 + this.mid * 18 + this.beatPulse * 8;
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
      p.x += (p.x - this.focusX) * dt * (0.14 + this.beatPulse * 0.7) + Math.cos(this.t * 2.4 + p.hue * TAU) * dt * 13;
      p.y += (p.y - this.focusY) * dt * (0.11 + this.beatPulse * 0.54) + Math.sin(this.t * 2 + p.hue * TAU) * dt * 13;
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
      ctx.strokeStyle = rgba(this.palette[i % this.palette.length], 0.09 + this.beatPulse * 0.2);
      ctx.lineWidth = 0.7 + (i % 4 === 0 ? this.beatPulse * 2.4 : 0);
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
        ctx.lineWidth = 0.55 + (1 - p.age) * (1.35 + this.beatPulse * 2.2);
        ctx.beginPath(); ctx.moveTo(p.x, p.y + offset + wobble); ctx.lineTo(n.x, n.y + offset + wobble); ctx.stroke();
      }
      const head = this.trace[headIndex];
      this.glowDot(ctx, head.x, head.y + offset, 12 + this.treble * 10, this.palette[band % this.palette.length], 0.12 + this.beatPulse * 0.18);
      ctx.fillStyle = rgba('#ffffff', 0.42 + this.beatPulse * 0.42); ctx.beginPath(); ctx.arc(head.x, head.y + offset, 1.4 + this.beatPulse * 1.8, 0, TAU); ctx.fill();
      ctx.restore();
    }
    for (let i = 0; i < 5; i++) { ctx.strokeStyle = rgba(this.palette[(i + 2) % this.palette.length], 0.18 + this.mid * 0.1); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(fx, fy, 26 + i * 15 + this.beatPulse * 10, rotation * (i + 1), rotation * (i + 1) + 1.5); ctx.stroke(); }
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) { const alpha = p.life * (0.24 + this.treble * 0.85); ctx.strokeStyle = rgba(this.palette[Math.floor(p.hue * this.palette.length) % this.palette.length], alpha); ctx.lineWidth = 0.5 + p.z * (0.8 + this.beatPulse * 1.6); ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke(); }
    ctx.restore();
    this.drawDust(ctx, 1.25); this.modernFinish(ctx, 0.18);
  }
}

class ArcadeArtGallery extends BaseVisualizer {
  constructor(seed, track) {
    super(seed, track);
    this.name = VISUALIZER_NAMES[12];
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
    const heroIds = ['lorenzo', 'gnash', 'fernwick', 'b33p', 'mochi', 'chompo', 'raymn', 'grumpos'];
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
    // A bespoke black-box exhibition space: no shared visualizer gradient,
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
    // depth without becoming another grid-based visualizer.
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
      ctx.globalAlpha = 1;
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
// and a deep blue hangar wash) so the toasters feel like a new visualizer, not
// another pass over an existing preset's background.
class ToasterSkyParade extends BaseVisualizer {
  constructor(seed, track) {
    super(seed, track);
    this.name = VISUALIZER_NAMES[13];
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
      // later random stunt schedule, so the visualizer announces itself before
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
        ctx.globalAlpha = (0.035 + this.beatPulse * 0.025) * (5 - trail) * (0.4 + p.depth * 0.6);
        ctx.translate(tx, ty);
        ctx.rotate(p.rotation * (1 - trail * 0.035));
        ctx.scale(scale * (1 - trail * 0.035), scale * (1 - trail * 0.035));
        this.drawAppliance(ctx, p, frame);
        ctx.restore();
      }
      this.glowDot(ctx, p.drawX, p.drawY, Math.max(w, h) * (0.65 + this.beatPulse * 0.25), color, 0.05 + p.depth * 0.07);
      ctx.save();
      ctx.globalAlpha = 1;
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

export function createVisualizer(name, seed, track) {
  const index = typeof name === 'number' ? name : VISUALIZER_NAMES.indexOf(name);
  const constructors = [NeonCathedral, LiquidChrome, LaserGrid, MonsterReactor, ElectricKaleidoscope, DeepSpaceWormhole, PrismaticStorm, SingularityBloom, HolographicOcean, DataRainAscension, FractalFlame, OscilloscopeOverdrive, ArcadeArtGallery, ToasterSkyParade, ChromaBubblestorm];
  const Ctor = constructors[Math.max(0, index) % constructors.length];
  return new Ctor(seed >>> 0, track);
}

// `random` is injectable so tests can prove the no-immediate-repeat rule
// without relying on global Math.random state.
export function pickVisualizer(previous = -1, random = Math.random) {
  let next = Math.floor(random() * VISUALIZER_NAMES.length) % VISUALIZER_NAMES.length;
  if (VISUALIZER_NAMES.length > 1 && next === previous) next = (next + 1 + Math.floor(random() * (VISUALIZER_NAMES.length - 1))) % VISUALIZER_NAMES.length;
  return next;
}
