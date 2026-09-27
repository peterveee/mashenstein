// NEON 1 — how Mt Fuji leaves the golden hour (BAKE-OFF, not wired into the game).
// Peter, 25 Sep 2026: "we are currently fading out mt Fuji as we move along before night
// transition. I think it would better if there was a fog that covers it gradually which
// then disappears when we [go] to night. I think the fog would rise up to cover it rather
// than a simple fade. Open to suggestions or a bake off … It could move off screen I
// suppose. Technically [Fuji] is visible from Tokyo. So very very open to suggestions."
//
// Each candidate is a golden MOOD built on the shipped one: the pack's own golden sky
// with the mountain left out (neonFujiLab.skyWithoutFuji), then the candidate places the
// mountain and whatever weather it brings. Everything it paints is part of the golden
// sky, so the strike's spreading night takes it away with the sun — the "disappears when
// we turn to night" comes for free. Only F paints anything into the night.
//
// `k` is how far the exit has got, 0..1, over EXIT of the stage — finished just ahead of
// the minor turn, which lands about a tenth of the way in.
import { NEON_GOLDEN_MOOD, neonFujiLab as L } from '../engine/stylePacks/index.js';
import { GROUND_Y } from '../engine/camera.js';

export const FUJI_EXIT = [0.02, 0.095];
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (u) => { const k = clamp01(u); return k * k * (3 - 2 * k); };
export function fujiExitK(progress) {
  const [a, b] = FUJI_EXIT;
  return ease(((Number(progress) || 0) - a) / (b - a));
}
// A stage of k: `from`..`to` of the whole exit, eased.
const phase = (k, from, to) => ease((k - from) / (to - from));

function fuji(ctx, cov, { dx = 0, dy = 0, alpha = 0.9, clip = false } = {}) {
  const art = L.art();
  if (!art) return;
  const { cx } = L.place(cov);
  ctx.save();
  if (clip) { ctx.beginPath(); ctx.rect(cov.left - 20, -400, cov.width + 40, GROUND_Y + 400 + 2); ctx.clip(); }
  ctx.globalAlpha *= alpha;
  ctx.drawImage(art.canvas, cx - art.w / 2 + dx, GROUND_Y - art.h + art.pad + dy, art.w, art.h);
  ctx.restore();
}

function paper(ctx, path, fill, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  L.paperShape(ctx, path, fill, {
    pattern: L.pattern(ctx), deep: L.subtle.deep, contact: L.subtle.contact,
    deepColor: 'rgba(90,40,60,0.14)', contactColor: 'rgba(60,20,40,0.08)',
  });
  ctx.restore();
}

// A FOG BANK cut from card: a scalloped top — billows — that tapers down to the
// groundline at both ends, drifting slowly sideways on its own clock.
function fogBank(cx, halfW, topY, t, seed, scallop = 26) {
  const q = new Path2D();
  const base = GROUND_Y + 6;
  q.moveTo(cx - halfW, base);
  for (let x = -halfW; x <= halfW; x += 2) {
    const e = Math.abs(x) / halfW;
    const drift = x + t * (5 + seed) + seed * 37;
    const billow = -5 * Math.abs(Math.sin(drift * Math.PI / scallop))
      + Math.sin(drift * 0.017 + seed) * 4;
    const y = topY + billow + Math.pow(e, 5) * (base - topY);
    q.lineTo(cx + x, Math.min(base, y));
  }
  q.lineTo(cx + halfW, base);
  q.closePath();
  return q;
}

// A puffy cloud: the OUTLINE of a row of overlapping discs on a flat base — one
// contour, so the paper rim runs round the outside and never across a join.
function cloud(x, y, w, h, seed) {
  const n = Math.max(3, Math.round(w / 22));
  const discs = [];
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const r = h * (0.42 + 0.3 * Math.sin(u * Math.PI) + 0.08 * Math.sin(seed * 7 + i * 2.3));
    discs.push([x - w / 2 + u * w, y - r * 0.4, r]);
  }
  const x0 = Math.min(...discs.map(([px, , r]) => px - r));
  const x1 = Math.max(...discs.map(([px, , r]) => px + r));
  const q = new Path2D();
  q.moveTo(x0, y);
  for (let px = x0; px <= x1; px += 1.5) {
    let top = y;
    for (const [dx, dy, r] of discs) {
      const d = px - dx;
      if (Math.abs(d) < r) top = Math.min(top, dy - Math.sqrt(r * r - d * d));
    }
    q.lineTo(px, top);
  }
  q.lineTo(x1, y);
  q.closePath();
  return q;
}

// A lenticular plate: a lens with pointed ends.
function lens(cx, cy, rx, ry) {
  const q = new Path2D();
  q.moveTo(cx - rx, cy);
  q.quadraticCurveTo(cx, cy - ry * 2, cx + rx, cy);
  q.quadraticCurveTo(cx, cy + ry * 1.4, cx - rx, cy);
  q.closePath();
  return q;
}

const FOG = ['#e8c4d2', '#f5d6cc', '#fff0dc'];

// The night Fuji for F: the same mountain in the moon's light — rock gone to ink, snow a
// dim lilac — with a cyan rim of city glow along its edge.
let nightArt = null;
function nightFuji() {
  if (nightArt) return nightArt;
  const art = L.art();
  if (!art || typeof document === 'undefined') return null;
  const pad = 16;
  const scale = art.canvas.width / art.w;
  const tint = document.createElement('canvas');
  tint.width = art.canvas.width; tint.height = art.canvas.height;
  const g = tint.getContext('2d');
  g.drawImage(art.canvas, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = 'rgba(16,10,44,0.74)';
  g.fillRect(0, 0, tint.width, tint.height);
  const c = document.createElement('canvas');
  c.width = tint.width + pad * 2 * scale; c.height = tint.height + pad * 2 * scale;
  const h = c.getContext('2d');
  h.shadowColor = 'rgba(56,216,248,0.9)';
  h.shadowBlur = 7 * scale;
  h.drawImage(tint, pad * scale, pad * scale);
  h.shadowBlur = 2 * scale;
  h.drawImage(tint, pad * scale, pad * scale);
  nightArt = { canvas: c, w: art.w + pad * 2, h: art.h + pad * 2, pad: art.pad + pad };
  return nightArt;
}

export const FUJI_EXIT_CANDIDATES = [
  {
    id: 'shipped', label: '0 · today — the fade',
    blurb: 'What ships: the mountain fades over 3%–20% of the stage, so it is still half there when the strike takes the day.',
    shipped: true,
  },
  {
    id: 'fog', label: 'A · paper fog rises',
    blurb: 'Three banks of cut-paper fog rise from the horizon, back to front, the back one last over the summit. '
      + 'The billows drift. The strike takes the fog with the day.',
    paint(ctx, t, k, cov) {
      const { cx, h, half } = L.place(cov);
      fuji(ctx, cov);
      const banks = [[1.2, -h - 12, 0.0, 0.8, 0], [1.08, -h * 0.66, 0.1, 0.9, 1], [0.98, -h * 0.34, 0.2, 1, 2]];
      banks.forEach(([wf, top, from, to, i]) => {
        const u = phase(k, from, to);
        if (u <= 0) return;
        const y = GROUND_Y + 8 + (top - 8) * u;
        paper(ctx, fogBank(cx + (i - 1) * 18, half * wf, y, t, i), FOG[i], 0.97);
      });
    },
  },
  {
    id: 'mist', label: 'B · soft mist rises',
    blurb: 'Not paper: a soft wall of warm mist rises up the mountain, feathered at the top and the ends, '
      + 'swallowing the foot first and the snowcap last.',
    paint(ctx, t, k, cov) {
      const { cx, h, half } = L.place(cov);
      fuji(ctx, cov);
      if (k <= 0) return;
      const top = GROUND_Y - (h + 30) * k;
      const feather = 34;
      const w = half * 1.25;
      const off = document.createElement('canvas');
      // Cheap enough for a gallery card; the game would bake it.
      off.width = Math.ceil(w * 2); off.height = Math.ceil(GROUND_Y - top + feather + 8);
      const o = off.getContext('2d');
      const g = o.createLinearGradient(0, 0, 0, feather * 2);
      g.addColorStop(0, 'rgba(255,232,214,0)');
      g.addColorStop(1, 'rgba(255,232,214,0.98)');
      o.fillStyle = g; o.fillRect(0, 0, off.width, off.height);
      // Feathered ends: a horizontal fade laid over the vertical one.
      const ends = o.createLinearGradient(0, 0, off.width, 0);
      ends.addColorStop(0, 'rgba(0,0,0,0)'); ends.addColorStop(0.18, 'rgba(0,0,0,1)');
      ends.addColorStop(0.82, 'rgba(0,0,0,1)'); ends.addColorStop(1, 'rgba(0,0,0,0)');
      o.globalCompositeOperation = 'destination-in';
      o.fillStyle = ends; o.fillRect(0, 0, off.width, off.height);
      ctx.drawImage(off, cx - w, top - feather);
    },
  },
  {
    id: 'hat', label: 'C · hat cloud, then fog',
    blurb: 'Fuji\'s own weather: a lenticular "hat" cloud (kasagumo) forms on the summit and settles down over the '
      + 'snowcap while paper fog rises to meet it from below.',
    paint(ctx, t, k, cov) {
      const { cx, h, half } = L.place(cov);
      fuji(ctx, cov);
      const grow = phase(k, 0, 0.55);
      const settle = phase(k, 0.35, 1);
      const fog = phase(k, 0.3, 1);
      if (fog > 0) {
        const y = GROUND_Y + 8 + (-h * 0.82 - 8) * fog;
        paper(ctx, fogBank(cx - 10, half * 1.12, y, t, 1), FOG[1], 0.97);
        const y2 = GROUND_Y + 8 + (-h * 0.3 - 8) * fog;
        paper(ctx, fogBank(cx + 14, half, y2, t, 2), FOG[2], 0.97);
      }
      if (grow <= 0) return;
      const summit = GROUND_Y - h;
      const plates = [[58, 6, -8], [78, 8, 0], [96, 9, 9], [108, 10, 19], [116, 11, 30]];
      const shown = 2 + Math.round(3 * settle);
      plates.slice(0, shown).reverse().forEach(([rx, ry, dy], i, arr) => {
        const j = arr.length - 1 - i;
        const bob = Math.sin(t * 0.6 + j) * 0.8;
        const fill = j % 2 ? '#f7dce4' : '#fdeef0';
        paper(ctx, lens(cx + j * 2, summit + dy * (0.35 + 0.65 * settle) + bob, rx * grow, ry), fill,
          j >= 2 ? phase(settle, (j - 2) / 3, (j - 1) / 3) : 1);
      });
    },
  },
  {
    id: 'clouds', label: 'D · clouds blow in',
    blurb: 'A bank of paper clouds blows in from the right on the wind and parks over the mountain, top row first; '
      + 'the last row drags a low fog bank in under it.',
    paint(ctx, t, k, cov) {
      const { cx, h } = L.place(cov);
      fuji(ctx, cov);
      const rests = [
        [0, -h + 6, 120, 44], [-70, -h * 0.72, 130, 46], [80, -h * 0.7, 140, 46],
        [-180, -h * 0.4, 150, 48], [10, -h * 0.4, 170, 50], [190, -h * 0.38, 150, 46],
        [-250, -h * 0.12, 140, 44], [-80, -h * 0.1, 170, 46], [110, -h * 0.1, 170, 46], [270, -h * 0.12, 140, 44],
      ];
      const low = phase(k, 0.45, 1);
      if (low > 0) paper(ctx, fogBank(cx, L.place(cov).half * 1.1, GROUND_Y + 8 + (-h * 0.3 - 8) * low, t, 2), FOG[2], 0.97);
      const enter = cov.left + cov.width + 120;
      rests.forEach(([rx, ry, w, hh], i) => {
        const u = phase(k, i * 0.055, i * 0.055 + 0.5);
        if (u <= 0) return;
        const x0 = enter + i * 30;
        const x = x0 + (cx + rx - x0) * u + Math.sin(t * 0.5 + i) * 2;
        paper(ctx, cloud(x, GROUND_Y + ry + hh * 0.3, w * 1.35, hh * 1.1, i), FOG[(i + 1) % 3], 0.98);
      });
    },
  },
  {
    id: 'sink', label: 'E · sinks behind the horizon',
    blurb: 'We are driving away from it, so it goes DOWN: the mountain slides slowly below the far skyline, '
      + 'the snowcap last. No fade and no weather.',
    paint(ctx, t, k, cov) {
      const { h } = L.place(cov);
      fuji(ctx, cov, { dy: (h + 6) * k, clip: true });
    },
  },
  {
    id: 'slide', label: 'F · drifts off to the left',
    blurb: 'It passes: the mountain drifts left like a very far layer and leaves the picture before the turn.',
    paint(ctx, t, k, cov) {
      const { cx, half } = L.place(cov);
      fuji(ctx, cov, { dx: -(cx - cov.left + half + 10) * k });
    },
  },
  {
    id: 'night', label: 'G · stays into the night',
    blurb: 'Fuji really is visible from Tokyo, so it stays. The strike turns it with the sky: rock to ink, snow '
      + 'to moonlit lilac, a cyan rim of city glow. The whole level if you like — or it could still sink later.',
    paint(ctx, t, k, cov) { fuji(ctx, cov); },
    night(ctx, t, cov) {
      const art = nightFuji();
      if (!art) return;
      const { cx } = L.place(cov);
      ctx.drawImage(art.canvas, cx - art.w / 2, GROUND_Y - art.h + art.pad, art.w, art.h);
    },
  },
];

// The golden mood a candidate paints for a frame; the shipped one for '0'.
export function fujiExitGoldenMood(cand) {
  if (cand.shipped) return NEON_GOLDEN_MOOD;
  return {
    ...NEON_GOLDEN_MOOD,
    skyExtra(ctx, t, camX, context) {
      L.skyWithoutFuji(ctx, t, camX, context);
      cand.paint(ctx, t, fujiExitK(context?.progress), L.coverage(ctx));
    },
  };
}
// The night mood after the strike: plain night, or with G's mountain in it.
export function fujiExitNightMood(cand) {
  if (!cand.night) return null;
  return { id: 'night', skyLayer: 'far', skyExtra: (ctx, t) => cand.night(ctx, t, L.coverage(ctx)) };
}
