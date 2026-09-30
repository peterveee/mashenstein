// THE ARCADE INTRO — Field Service level 1 opens INSIDE the arcade cabinet's screen.
//
// Peter, 30 Sep 2026: the hero has just jumped into the cabinet. FIELD SERVICE's bars 1-4
// are square-wave chiptune; bar 4's last beat is the POWER DOWN, a falling sine; and on
// bar 5's downbeat the paper world is fully there and the song turns modern. So for as
// long as the song is in bars 1-4 the BACKDROP is an arcade picture — the paper world cut
// to 8px cells, snapped to nineteen flat inks, on a CRT — and across the power-down beat
// the tube switches off: the picture squashes to a bright line, the line to a dot, on
// black. Bar 5 is paper. The hero and the lane are never touched: the player has already
// seen him in paper, so it is the world that transforms, not the scene (bake-off
// `field-service-pixel-intro`, card Q; the other looks are in src/dev/).
//
// COST. While it is up the backdrop is not painted at device resolution at all. It is
// painted once at 1x into a scratch canvas and halved down a pyramid (2, 4, 8, 16 px
// cells) by exact 2:1 blits — a bilinear 2:1 is a 2x2 box average, so every cell is the
// mean of what it covers and nothing shimmers as the world scrolls under a screen-fixed
// grid. The look is then one readback of the 8px level (60x23 cells a landscape frame),
// one nearest-neighbour blit, one pattern fill and a gradient. About 1-2 ms of main thread
// a frame in a headless browser, for four bars.
//
// FRAME SPACE, not the backdrop's own. run.js paints bg() under a stack of shifts and, in
// portrait, a zoom; cells measured in that space would be a different size on every
// device. So the pyramid is rendered through (frame -> backdrop) at 1x and the result is
// blitted back on the frame's own transform, which is also what makes portrait's taller
// frame come out covered.

// ------------------------------------------------------------------ scratch
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { canvas: c, ctx: c.getContext('2d'), w, h };
}

// The frame the pyramid was last built for: its visible size, and that size padded up
// to a multiple of 48 so every cell size divides it (2, 4, 8, 16 — and 6, which the
// bake-off uses).
const frame = { w: 480, h: 270, pw: 480, ph: 288 };
export function pyramidFrame() { return frame; }

let levels = null; // [L0 1x, L1 2px, L2 4px, L3 8px, L4 16px]
export function pyramid() {
  if (!levels || levels[0].w !== frame.pw || levels[0].h !== frame.ph) {
    levels = [];
    for (let k = 0; k <= 4; k++) levels.push(makeCanvas(frame.pw >> k, frame.ph >> k));
    six = null;
  }
  return levels;
}

// 6px cells are not a power of two, so they come off L0 separately and only when a look
// asks for them: a 3:1 then a 2:1 blit, the 3:1 at high smoothing quality.
let six = null, sixFresh = false;
export function levelFor(cell) {
  if (cell !== 6) return pyramid()[Math.round(Math.log2(cell))];
  if (!six) six = [makeCanvas(frame.pw / 3, frame.ph / 3), makeCanvas(frame.pw / 6, frame.ph / 6)];
  if (!sixFresh) {
    let src = pyramid()[0];
    for (const d of six) {
      d.ctx.imageSmoothingEnabled = true;
      d.ctx.imageSmoothingQuality = 'high';
      d.ctx.clearRect(0, 0, d.w, d.h);
      d.ctx.drawImage(src.canvas, 0, 0, src.w, src.h, 0, 0, d.w, d.h);
      src = d;
    }
    sixFresh = true;
  }
  return six[1];
}

// Paint the picture at 1x and halve it down. `paintBg(g)` paints in frame units onto a
// context whose transform is identity; `w` x `h` is the visible frame.
export function buildPyramid(paintBg, base, w = 480, h = 270) {
  frame.w = w; frame.h = h;
  frame.pw = Math.ceil(w / 48) * 48;
  frame.ph = Math.ceil(h / 48) * 48;
  sixFresh = false;
  const L = pyramid();
  const g = L[0].ctx;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = base;
  g.fillRect(0, 0, frame.pw, frame.ph);
  g.save();
  paintBg(g);
  g.restore();
  for (let k = 1; k < L.length; k++) {
    const d = L[k];
    d.ctx.setTransform(1, 0, 0, 1, 0, 0);
    d.ctx.imageSmoothingEnabled = true;
    d.ctx.clearRect(0, 0, d.w, d.h);
    d.ctx.drawImage(L[k - 1].canvas, 0, 0, L[k - 1].w, L[k - 1].h, 0, 0, d.w, d.h);
  }
}

// A pyramid level (or any scratch of the same shape), nearest-neighbour, over the frame.
export function blitLevel(ctx, k, smooth = false) {
  blitCanvas(ctx, pyramid()[k], smooth);
}
export function blitCanvas(ctx, c, smooth = false) {
  ctx.save();
  ctx.imageSmoothingEnabled = smooth;
  ctx.drawImage(c.canvas, 0, 0, c.w, c.h, 0, 0, frame.pw, frame.ph);
  ctx.restore();
}

export function deviceScale(ctx) {
  const m = ctx.getTransform();
  return Math.hypot(m.a, m.b) || 1;
}

// One cell's worth of overlay, painted in DEVICE pixels so it is crisp at any
// presentation scale, then repeated over the frame as a pattern. Cached per size.
const tileCache = new Map();
export function cellTile(key, cw, ch, k, paint) {
  const nw = Math.max(1, Math.round(cw * k)), nh = Math.max(1, Math.round(ch * k));
  const id = `${key}|${nw}x${nh}`;
  let c = tileCache.get(id);
  if (!c) {
    c = document.createElement('canvas');
    c.width = nw; c.height = nh;
    paint(c.getContext('2d'), nw, nh);
    tileCache.set(id, c);
  }
  return c;
}
export function fillPattern(ctx, tileCanvas, cw, ch, x = 0, y = 0, w = frame.pw, h = frame.ph) {
  const p = ctx.createPattern(tileCanvas, 'repeat');
  p.setTransform(new DOMMatrix([cw / tileCanvas.width, 0, 0, ch / tileCanvas.height, 0, 0]));
  ctx.fillStyle = p;
  ctx.fillRect(x, y, w, h);
}

export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const easeInOut = (s) => (s < 0.5 ? 2 * s * s : 1 - 2 * (1 - s) * (1 - s));
export const easeIn = (s) => s * s * s;

// ------------------------------------------------------------------ the inks
// THE FIELD SERVICE ARCADE PALETTE: nineteen inks taken from the world itself. Baked
// offline by k-means over the 4px level of 31 frames across bars 1-4, whole frame, hero
// included: twelve for the bulk (sky, turf, cloud, hills, mountains), then six added by a
// farthest-point pass and NOT averaged back in, so the small things that stand out keep
// their own colour — the red house, the purple cap, a face. A runtime k-means was tried
// first and failed twice over: it averaged the roof into brown, and it ran on the first
// frame, before the house's paper sprite had baked, so there was no red to find.
// PICO-8's sixteen were tried before either: no light sky blue, and the sky turned to noise.
const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const FIELD_SERVICE_INKS = [
  '#78c6ed', '#3e8f48', '#5bac62', '#ebf3f8', '#627479', '#75a69d', '#9bb4bc', '#a86559', '#c09c84',
  '#326b73', '#523d37', '#7656ab',
  '#31a39d', '#d9cbc1', '#b2dbf1', '#954039', '#24435d', '#7f8c5d',
  // and the lane's own dark green (cabinets.js groundDark), by hand: k-means folded it
  // into the turf, and a floor you cannot tell from the hill behind it is a gameplay read lost
  '#2a7038',
].map(hexRgb);

function nearest(pal, r, g, b) {
  let best = 0, bd = Infinity;
  for (let i = 0; i < pal.length; i++) {
    const p = pal[i];
    const dr = r - p[0], dg = g - p[1], db = b - p[2];
    const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
    if (d < bd) { bd = d; best = i; }
  }
  return pal[best];
}

// A level snapped to a palette, cell by cell, no dither: every edge stays hard. The
// level comes back to the CPU for it, which is the look's one real cost.
const quant = {};
export function quantisedLevel(k, pal) {
  const L = typeof k === 'number' ? pyramid()[k] : k;
  const id = `${L.w}x${L.h}`;
  const q = quant[id] || (quant[id] = makeCanvas(L.w, L.h));
  const img = L.ctx.getImageData(0, 0, L.w, L.h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const p = nearest(pal, d[i], d[i + 1], d[i + 2]);
    d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = 255;
  }
  q.ctx.putImageData(img, 0, 0);
  return q;
}
export const inkScreen = (cell) => (c) => blitCanvas(c, quantisedLevel(levelFor(cell), FIELD_SERVICE_INKS));

// ------------------------------------------------------------------ the CRT
// An aperture grille of R, G and B phosphor stripes, one logical px each, with every third
// row a dark scanline gap. Multiplied over the picture.
export function grilleTile(g, n, m) {
  const cols = ['rgb(255,95,85)', 'rgb(95,255,110)', 'rgb(100,120,255)'];
  for (let i = 0; i < 3; i++) {
    g.fillStyle = cols[i];
    g.fillRect(Math.round(i * n / 3), 0, Math.round((i + 1) * n / 3) - Math.round(i * n / 3), m);
  }
  g.fillStyle = 'rgba(0,0,0,0.45)';
  g.fillRect(0, Math.round(m * 2 / 3), n, m - Math.round(m * 2 / 3));
}
// The softer grille that ships: the same stripes tinted rather than saturated, and a
// lighter scanline, so the flat inks under it stay flat.
export function grilleSoftTile(g, n, m) {
  const cols = ['rgb(255,176,166)', 'rgb(176,255,184)', 'rgb(180,190,255)'];
  for (let i = 0; i < 3; i++) {
    g.fillStyle = cols[i];
    g.fillRect(Math.round(i * n / 3), 0, Math.round((i + 1) * n / 3) - Math.round(i * n / 3), m);
  }
  g.fillStyle = 'rgba(0,0,0,0.28)';
  g.fillRect(0, Math.round(m * 2 / 3), n, m - Math.round(m * 2 / 3));
}
export const CRT_FULL = { grille: grilleTile, key: 'grille', lift: 0.30, bloom: 0.10, vignette: 0.55 };
export const CRT_SOFT = { grille: grilleSoftTile, key: 'grilleSoft', lift: 0.40, bloom: 0.10, vignette: 0.38 };

// A picture on the tube: phosphor stripes multiplied over it, the picture screened back
// for brightness, a bloom off the 16px level, and a vignette. `k` is device px per frame px.
export function crtPass(ctx, k, picture, o) {
  picture(ctx);
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  fillPattern(ctx, cellTile(o.key, 3, 3, k, o.grille), 3, 3);
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = o.lift;
  picture(ctx);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = o.bloom;
  blitLevel(ctx, 4, true);
  ctx.restore();
  const cx = frame.w / 2, cy = frame.h / 2, hd = Math.hypot(cx, cy);
  const v = ctx.createRadialGradient(cx, cy, hd * 0.44, cx, cy, hd * 1.09);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, `rgba(0,0,0,${o.vignette})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, frame.pw, frame.ph);
}

// The set switching off, across the power-down beat (s 0..1): the picture squashes to a
// line through the middle (the first 60%), then the line pulls in to a dot and goes. What
// shows around it is `behind` — the black of a dead tube, or the paper world.
export function switchOff(ctx, s, screen, behind) {
  behind();
  const a = clamp01(s / 0.6), b = clamp01((s - 0.6) / 0.4);
  const sy = Math.max(0.006, 1 - easeIn(a) * 0.994);
  const sx = 1 - easeIn(b) * 0.99;
  const cx = frame.w / 2, cy = frame.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sx, sy);
  ctx.translate(-cx, -cy);
  ctx.globalAlpha = 1 - b * 0.6;
  screen();
  // the flare comes only as the picture becomes a line: a tall band of white reads as a
  // bar across the screen, not as a tube dying
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = clamp01((0.25 - sy) / 0.2) * (1 - b);
  ctx.fillStyle = '#e8f4ff';
  ctx.fillRect(0, 0, frame.pw, frame.ph);
  ctx.restore();
}
export const blackTube = (ctx) => () => { ctx.fillStyle = '#050607'; ctx.fillRect(0, 0, frame.pw, frame.ph); };

// ------------------------------------------------------------------ the shipped look
// Where the song is, as the look's resolve: 0 through bars 1-4 (beats 0-15, and before the
// song's first beat), rising 0..1 across the power-down beat (15-16), and null from bar 5
// on — paper, and no effect at all. Beats are Audio.songBeat()'s: quarter notes from the
// top of the song.
export const ARCADE_INTRO_POWER_DOWN_BEAT = 15;
export function arcadeIntroResolve(beat) {
  if (!Number.isFinite(beat) || beat >= ARCADE_INTRO_POWER_DOWN_BEAT + 1) return null;
  return beat < ARCADE_INTRO_POWER_DOWN_BEAT ? 0 : beat - ARCADE_INTRO_POWER_DOWN_BEAT;
}

// THE LANDING, on bar 5's downbeat (bake-off round four, card T; Peter, 30 Sep 2026). Not
// a shake across the power-down — the tube dying is a falling gesture, and a shake would
// jitter the line — but one hit as the paper lands and the band comes in: the paper
// backdrop slapped down like a cut-out sheet onto the table (dropped in from 8 frame px
// above, falling in 0.09 s, one bounce of a px and a half, settled by 0.3 s; lane and hero
// untouched), and the game's own screen shake at the act card's weight over the whole
// picture. `since` is seconds after the downbeat; the drop is a frame-px offset for bg().
export const ARCADE_LANDING_SECS = 0.3;
export const ARCADE_LANDING_SHAKE = { power: 3, secs: 0.25 };
export function arcadeLandingDrop(since) {
  if (!(since >= 0) || since >= ARCADE_LANDING_SECS) return 0;
  if (since < 0.09) { const u = since / 0.09; return -8 * (1 - u * u); }
  const u = (since - 0.09) / (ARCADE_LANDING_SECS - 0.09);
  return 1.5 * Math.sin(u * Math.PI) * (1 - u);
}

// The backdrop as the arcade picture, on a context already in FRAME units (0..w x 0..h).
export function drawArcadeLook(ctx, s, k) {
  const screen = () => crtPass(ctx, k, inkScreen(8), CRT_SOFT);
  if (s <= 0) screen(); else switchOff(ctx, s, screen, blackTube(ctx));
}

// THE FIRST FRAMES, AHEAD OF TIME. Everything this look does the first time it does it
// costs more than it will again: the pyramid's scratch canvases are allocated, the grille
// tile is painted at the device's density, the first readback of a GPU canvas is taken,
// the browser compiles a pipeline for each blend and pattern it has not drawn with yet —
// and the backdrop, painted at 1x into the pyramid, bakes a 1x copy of every cached sheet
// it blits (hills, the barn). Then, on 5.1, the paper frame bakes the barn at the device's
// density, the first time the barn has been drawn there. All of it once a session, all of
// it on frames the player is watching: the hitch Peter felt going into plumber-1 the first
// time (1 Oct 2026). So RunState.enter, behind the shutter, runs it all through once on a
// scratch the size and density of the frame, and throws the scratch away.
//
//   w, h      the frame, in frame units; k its device px per unit
//   paintBg   (g) => the backdrop, as the arcade picture will paint it
//   paintPaper(g) => the backdrop as 5.1 will first paint it (the barn in view)
export function warmArcadeIntro({ w, h, k, paintBg, paintPaper, fill }) {
  if (typeof document === 'undefined' || typeof DOMMatrix === 'undefined') return;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * k));
  c.height = Math.max(1, Math.round(h * k));
  const g = c.getContext('2d');
  if (!g) return;
  const base = new DOMMatrix([k, 0, 0, k, 0, 0]);
  g.setTransform(base);
  g.save(); paintPaper(g); g.restore();
  for (const s of [0, 0.3, 0.8]) {
    g.setTransform(base);
    drawArcadeIntroBackdrop(g, { base, w, h, s, paintBg, fill });
  }
  c.width = 0; c.height = 0;
}

// The run's entry point, called in place of style.bg().
//
//   ctx      the frame's context, with the backdrop's own transform on it
//   base     the FRAME's transform (frame units -> device), captured before the
//            backdrop's shifts and zoom went on
//   w, h     the visible frame, in frame units
//   s        arcadeIntroResolve(beat)
//   paintBg  (g) => style.bg(g, ...), painting in the backdrop's own space
//   fill     what the picture is laid on (the cabinet's sky)
export function drawArcadeIntroBackdrop(ctx, { base, w, h, s, paintBg, fill }) {
  const local = ctx.getTransform();
  // frame -> backdrop, at 1x: the backdrop's transform with the frame's taken off
  const toLocal = base.inverse().multiply(local);
  buildPyramid((g) => {
    // The painters read their visible band off the context they are handed
    // (__mashBackgroundCoverage and friends): hand the scratch the same answers.
    for (const key of Object.keys(g)) if (key.startsWith('__')) delete g[key];
    for (const key of Object.keys(ctx)) if (key.startsWith('__')) g[key] = ctx[key];
    g.setTransform(toLocal);
    paintBg(g);
  }, fill, w, h);
  ctx.save();
  ctx.setTransform(base);
  ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
  drawArcadeLook(ctx, s, deviceScale(ctx));
  ctx.restore();
}
