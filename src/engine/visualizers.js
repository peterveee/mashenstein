// Jukebox screensaver visuals. These are deliberately Canvas2D-native: the
// game already presents a fixed 480x270 logical backbuffer, so keeping the
// presets here makes the 2D fallback and the WebGL upload path identical.
import { Rng } from './rng.js';

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
];

const W = 480;
const H = 270;
const CX = W / 2;
const CY = H / 2;
const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const smooth = (v) => v * v * (3 - 2 * v);
const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${clamp(a)})`;
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
  }
  update(dt, a) {
    super.update(dt, a);
    for (const p of this.sparks) {
      p.life -= dt * (0.55 + this.treble);
      if (p.life <= 0) seedParticle(p, this.rng, this.focusX, this.focusY, 0.6);
      p.px = p.x; p.py = p.y;
      p.x += (p.x - this.focusX) * dt * 0.08 + Math.cos(this.t * 2 + p.hue * TAU) * dt * 22;
      p.y += (p.y - this.focusY) * dt * 0.08 + Math.sin(this.t * 1.7 + p.hue * TAU) * dt * 22;
    }
  }
  draw(ctx) {
    this.backdrop(ctx, '#050914', '#100b27');
    const fx = this.focusX;
    const fy = this.focusY;
    const core = 30 + this.bass * 26 + this.beatPulse * 12;
    this.glowDot(ctx, fx, fy, core * 3.2, this.palette[0], 0.32 + this.bass * 0.24);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let ring = 0; ring < 4; ring++) {
      ctx.strokeStyle = rgba(this.palette[ring % this.palette.length], 0.22 + this.mid * 0.15);
      ctx.lineWidth = 1 + (ring === 0 ? this.beatPulse * 2 : 0);
      ctx.beginPath(); ctx.ellipse(fx, fy, core + ring * 19, core * 0.53 + ring * 9, this.t * (ring % 2 ? -0.2 : 0.16), 0, TAU); ctx.stroke();
    }
    const coreGlow = ctx.createRadialGradient(fx - core * 0.24, fy - core * 0.3, 1, fx, fy, core);
    coreGlow.addColorStop(0, rgba('#ffffff', 0.82));
    coreGlow.addColorStop(0.14, rgba(this.palette[0], 0.72));
    coreGlow.addColorStop(0.56, rgba(this.palette[1], 0.34 + this.beatPulse * 0.24));
    coreGlow.addColorStop(1, rgba(this.palette[1], 0));
    ctx.fillStyle = coreGlow;
    ctx.beginPath(); ctx.arc(fx, fy, core, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba('#ffffff', 0.55); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(fx, fy, core * 0.62, 0.2, Math.PI * 1.45); ctx.stroke();
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = rgba(this.palette[(i + 2) % this.palette.length], 0.2 + this.treble * 0.18);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(fx, fy, core * (1.18 + i * 0.1), this.t * (0.6 + i * 0.12) + i, this.t * (0.6 + i * 0.12) + i + 0.9 + this.mid);
      ctx.stroke();
    }
    for (let i = 0; i < 7; i++) {
      const a = this.t * (0.2 + i * 0.018) + i * TAU / 7;
      const r = 69 + Math.sin(this.t * 1.2 + i) * 9;
      const x = fx + Math.cos(a) * r;
      const y = fy + Math.sin(a) * r * 0.54;
      const c = this.palette[i % this.palette.length];
      ctx.strokeStyle = rgba(c, 0.4); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(fx + Math.cos(a) * core, fy + Math.sin(a) * core * 0.54); ctx.quadraticCurveTo(x + Math.sin(a) * 14, y - Math.cos(a) * 11, x, y); ctx.stroke();
      ctx.fillStyle = rgba(c, 0.7); ctx.beginPath(); ctx.arc(x, y, 5 + (i % 2) * 2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#07101d'; ctx.fillRect(x - 2, y - 1, 4, 2);
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
    this.satellites = makePool(7);
    this.satellites.forEach((p) => {
      p.angle = this.rng.float() * TAU; p.radius = 72 + this.rng.float() * 76;
      p.size = 8 + this.rng.float() * 11; p.spin = -1 + this.rng.float() * 2;
      p.petals = 3 + Math.floor(this.rng.float() * 3); p.hue = this.rng.float();
    });
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
    }
    for (const p of this.satellites) {
      p.angle += dt * p.spin * (0.18 + this.mid * 0.55);
      p.radius += Math.sin(this.t * 0.7 + p.hue * TAU) * dt * (3 + this.bass * 8);
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
    // A swarm of smaller, lower-petal kaleidoscopes orbits the main bloom.
    // They share the palette but keep independent motion so the scene feels
    // populated rather than like one giant flower copied seven times.
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of this.satellites) {
      const sx = this.focusX + Math.cos(p.angle) * p.radius;
      const sy = this.focusY + Math.sin(p.angle) * p.radius * 0.62;
      const r = p.size * (1 + this.beatPulse * 0.45);
      const c = this.palette[Math.floor(p.hue * this.palette.length) % this.palette.length];
      this.glowDot(ctx, sx, sy, r * 2.4, c, 0.1 + this.mid * 0.1);
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(this.t * p.spin * 0.22 + p.hue * TAU);
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

class PrismaticStorm extends BaseVisualizer {
  constructor(seed, track) {
    super(seed, track); this.name = VISUALIZER_NAMES[6]; this.shards = makePool(84);
    this.shards.forEach((p) => { p.angle = this.rng.float() * TAU; p.radius = 25 + this.rng.float() * 205; p.size = 2 + this.rng.float() * 10; p.spin = -1 + this.rng.float() * 2; p.depth = 0.2 + this.rng.float() * 0.8; });
  }
  update(dt, a) {
    super.update(dt, a);
    for (const p of this.shards) { p.angle += dt * p.spin * (0.18 + this.mid * 0.9); p.radius += dt * (7 + this.beatPulse * 36) * p.depth; if (p.radius > 240) p.radius = 20 + this.rng.float() * 35; }
  }
  draw(ctx) {
    this.backdrop(ctx, '#10052c', '#020814');
    const fx = this.focusX; const fy = this.focusY; const pulse = this.beatPulse;
    for (let i = 0; i < 6; i++) { const a = this.t * (0.08 + i * 0.012) + i; this.glowDot(ctx, fx + Math.cos(a) * 45, fy + Math.sin(a) * 28, 42 + this.bass * 28, this.palette[i % 4], 0.1); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
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
      ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
    }
    for (let i = 0; i < 5; i++) { ctx.strokeStyle = rgba(this.palette[(i + 1) % 4], 0.22); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(fx, fy, 24 + i * 18 + pulse * 10, 15 + i * 10 + pulse * 6, this.t * (0.12 + i * 0.02), 0, TAU); ctx.stroke(); }
    this.glowDot(ctx, fx, fy, 50 + this.bass * 35, '#ffffff', 0.16 + pulse * 0.28);
    ctx.restore(); this.drawDust(ctx, 1.05); this.modernFinish(ctx, 0.14);
  }
}

class SingularityBloom extends BaseVisualizer {
  constructor(seed, track) {
    super(seed, track); this.name = VISUALIZER_NAMES[7]; this.orbiters = makePool(112);
    this.orbiters.forEach((p) => { p.angle = this.rng.float() * TAU; p.radius = 26 + this.rng.float() * 160; p.speed = 0.2 + this.rng.float() * 0.9; p.tilt = 0.35 + this.rng.float() * 0.38; p.z = 0.2 + this.rng.float() * 0.8; p.hue = this.rng.float(); });
  }
  update(dt, a) { super.update(dt, a); for (const p of this.orbiters) { p.angle += dt * p.speed * (0.45 + this.bass * 1.4); p.radius += Math.sin(this.t * 0.7 + p.hue * 8) * dt * 2; if (p.radius > 190) p.radius = 24; } }
  draw(ctx) {
    this.backdrop(ctx, '#08020f', '#16051f'); const fx = this.focusX; const fy = this.focusY; const core = 17 + this.bass * 19 + this.beatPulse * 8;
    this.glowDot(ctx, fx, fy, 115 + this.bass * 55, this.palette[3], 0.19 + this.bass * 0.18);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
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

export function createVisualizer(name, seed, track) {
  const index = typeof name === 'number' ? name : VISUALIZER_NAMES.indexOf(name);
  const constructors = [NeonCathedral, LiquidChrome, LaserGrid, MonsterReactor, ElectricKaleidoscope, DeepSpaceWormhole, PrismaticStorm, SingularityBloom, HolographicOcean, DataRainAscension, FractalFlame, OscilloscopeOverdrive];
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
