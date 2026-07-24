// TapeRewindEffect — VHS rewind overlay drawn directly on top of the scene.
// No canvas snapshot needed; all effects are self-contained composite draws.
//
// Usage:
//   const fx = new TapeRewindEffect();
//   fx.start();  fx.stop();
//   fx.tick(dt);  // call every frame from update()
//   fx.render(ctx, W, H);  // call from draw() when fx.visible

const FADE_IN = 0.22;
const FADE_OUT = 0.45;

export class TapeRewindEffect {
  constructor() {
    this._active = false;
    this._t = 0;
    this._runT = 0;
    this._noiseCanvas = null;
  }

  get visible() { return this._t > 0; }

  start() { this._active = true; }
  stop() { this._active = false; }

  tick(dt) {
    if (this._active) {
      this._t = Math.min(FADE_IN, this._t + dt);
    } else if (this._t > 0) {
      this._t = Math.max(0, this._t - dt / FADE_OUT);
    }
    this._runT += dt;
  }

  // ---- render (pure overlay, drawn on top of existing canvas) ---------------
  render(ctx, w, h) {
    if (this._t <= 0) return;
    const a = this._t / FADE_IN;

    // 1. Blue/cyan colour wash over the whole frame.
    ctx.fillStyle = `rgba(10,18,48,${0.22 * a})`;
    ctx.fillRect(0, 0, w, h);

    // 2. Scanlines scrolling upward — thin white stripes at 3px spacing.
    const scanOff = (this._runT * 55) % 3;
    ctx.fillStyle = `rgba(255,255,255,${0.07 * a})`;
    for (let y = scanOff; y < h; y += 3) ctx.fillRect(0, y, w, 0.5);
    ctx.fillStyle = `rgba(0,0,0,${0.10 * a})`;
    for (let y = scanOff + 3; y < h; y += 6) ctx.fillRect(0, y, w, 0.5);

    // 3. Tracking bands — bright horizontal streaks sweeping downward.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const speed = 1.3 + i * 0.7;
      const y0 = (this._runT * 90 * speed + i * 73) % (h + 18) - 9;
      const bw = 3 + i;
      ctx.fillStyle = `rgba(200,210,240,${0.24 * a})`;
      ctx.fillRect(0, y0, w, bw * 0.6);
      ctx.fillStyle = `rgba(160,180,220,${0.10 * a})`;
      ctx.fillRect(0, y0 - bw * 1.2, w, bw * 1.0);
      ctx.fillStyle = `rgba(120,140,200,${0.06 * a})`;
      ctx.fillRect(0, y0 - bw * 2.5, w, bw * 1.6);
    }
    ctx.restore();

    // 4. Fine noise grain tiled across the frame.
    this._drawNoise(ctx, w, h, a * 0.09);

    // 5. OSD counter: REW « MM:SS:FF top-right.
    this._drawOsd(ctx, w, a);

    // 6. Vignette — radial darkening toward edges.
    const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.38, w / 2, h / 2, w * 0.72);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, `rgba(0,0,0,${0.30 * a})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  // ---- internals -----------------------------------------------------------
  _drawNoise(ctx, w, h, alpha) {
    if (alpha <= 0) return;
    const N = 128;
    if (!this._noiseCanvas) {
      this._noiseCanvas = document.createElement('canvas');
      this._noiseCanvas.width = N;
      this._noiseCanvas.height = N;
      const nc = this._noiseCanvas.getContext('2d');
      const img = nc.createImageData(N, N);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255;
        img.data[i] = v;
        img.data[i + 1] = v;
        img.data[i + 2] = v;
        img.data[i + 3] = 80;
      }
      nc.putImageData(img, 0, 0);
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    for (let y = 0; y < h; y += N)
      for (let x = 0; x < w; x += N)
        ctx.drawImage(this._noiseCanvas, x, y);
    ctx.restore();
  }

  _drawOsd(ctx, w, a) {
    if (a <= 0.1) return;
    const pad = 8;
    const sec = Math.floor(this._runT);
    const frames = Math.floor((this._runT - sec) * 24);
    const mm = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss = String(sec % 60).padStart(2, '0');
    const ff = String(frames).padStart(2, '0');
    const text = `REW \xAB ${mm}:${ss}:${ff}`;
    ctx.save();
    ctx.globalAlpha = a * 0.82;
    ctx.font = 'bold 8px monospace';
    ctx.textBaseline = 'top';
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(w - tw - pad - 6, pad, tw + 12, 13);
    const blink = Math.floor(this._runT * 2) % 2 === 0;
    ctx.fillStyle = '#e0f0ff';
    ctx.fillText(blink ? text : text.replace(/:/g, ' '), w - tw - pad, pad + 2);
    ctx.restore();
  }
}
