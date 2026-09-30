// FIELD SERVICE — the pixel intro (bake-off). Peter, 30 Sep 2026: "the background of the
// opening of the Field Service level 1 to be highly pixelated but in a sharp and stylish
// way... eventually transform to the real / current paper version in time with a particular
// bar in the background music... what about if you could see dots over everything instead..
// like looking through a windscreen... go nuts but it cant be anything too expensive CPU wise
// ... on screen for 4 bars or so".
//
// THE BAR. FIELD SERVICE (src/data/songs/plumber.js) opens on four bars of square-wave intro —
// square hook, square arpeggio, square bass — with a POWER DOWN on bar 4's last beat that
// falls into bar 5, where the folk-house proper starts. That is the moment: every candidate
// holds its look through bars 1-4 and RESOLVES across that one beat, landing on paper on
// bar 5's downbeat. The gallery loops five bars at the song's 124 BPM: four of pixels, one of
// paper.
//
// WHAT IS PIXELATED is the backdrop — pack.bg(). The lane and the hero stay crisp on top of
// it, the way run.js layers a frame. Two candidates (WINDSCREEN, RAIN) are a sheet of glass
// in front of the whole picture, so they also draw an `over` pass after the hero.
//
// COST. While the effect is up the paper backdrop is NOT painted at device resolution. It
// is painted once at 1x (480x272 — a ninth of a 3x frame's pixels) and halved down a pyramid
// of 2, 4, 8 and 16 px cells by exact 2:1 blits, which a bilinear sampler turns into a true
// 2x2 box average: every cell is the mean of what it covers, so nothing shimmers as the
// world scrolls under a screen-fixed grid. A look is then one nearest-neighbour blit of a
// pyramid level plus, at most, one pattern fill or one baked overlay. Two looks (INKS,
// HALFTONE) read a small level back to the CPU (60x34 and 120x68 px). Only the resolve beat
// pays for the full paper frame, because both are on screen at once.
//
// Card Q SHIPPED (30 Sep 2026): plumber-1's opening, via src/engine/arcadeIntro.js, which
// Q here calls directly. The rest are bake-off only; every entry point takes a paintBg(ctx).

import {
  pyramid, levelFor, buildPyramid, blitLevel, blitCanvas, deviceScale, cellTile, fillPattern,
  clamp01, easeInOut, easeIn, FIELD_SERVICE_INKS, quantisedLevel, inkScreen,
  CRT_FULL, CRT_SOFT, crtPass, switchOff, blackTube, drawArcadeLook, arcadeLandingDrop,
} from '../engine/arcadeIntro.js';

export const PIXEL_INTRO_BPM = 124;
export const PIXEL_INTRO_LOOP_BARS = 5;

// The pyramid base the gallery builds: 480x270 padded to 288, which every cell size
// divides — 2, 4, 8 and 16, and 6 for round two's middle size. The pyramid, the inks and
// the CRT live in src/engine/arcadeIntro.js, which is what ships (card Q).
const FW = 480, FH = 288;

// A full-frame overlay baked once at device scale — for anything that varies across
// the frame and so cannot be a repeating cell.
const frameCache = new Map();
function frameOverlay(key, k, paint) {
  const n = Math.round(FW * k), m = Math.round(FH * k);
  const id = `${key}|${n}x${m}`;
  let c = frameCache.get(id);
  if (!c) {
    c = document.createElement('canvas');
    c.width = n; c.height = m;
    const g = c.getContext('2d');
    g.scale(n / FW, m / FH);
    paint(g);
    frameCache.set(id, c);
  }
  return c;
}


// The resolve as sixteenth notes: each step holds one sixteenth of the power-down beat
// and the last is paper. `steps` are level indices or functions.
function cascade(ctx, fx, steps) {
  const i = Math.min(steps.length, Math.floor(fx.s * (steps.length + 1)));
  if (i >= steps.length) { fx.paper(); return -1; }
  const st = steps[i];
  if (typeof st === 'function') st(ctx, fx); else blitLevel(ctx, st);
  return i;
}

// ------------------------------------------------------------------ overlays
// A: nothing. B: glass tiles. Bevel + grout + a gloss corner, per cell.
function glassTile(g, n) {
  const e = Math.max(1, Math.round(n * 0.07));
  g.fillStyle = 'rgba(255,255,255,0.20)';
  g.fillRect(0, 0, n, e); g.fillRect(0, 0, e, n);
  g.fillStyle = 'rgba(0,0,0,0.22)';
  g.fillRect(0, n - e, n, e); g.fillRect(n - e, 0, e, n);
  g.fillStyle = 'rgba(16,24,20,0.30)';
  const grout = Math.max(1, Math.round(n * 0.035));
  g.fillRect(0, n - grout, n, grout); g.fillRect(n - grout, 0, grout, n);
  const gr = g.createLinearGradient(0, 0, n * 0.6, n * 0.6);
  gr.addColorStop(0, 'rgba(255,255,255,0.22)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(e, e); g.lineTo(n * 0.62, e); g.lineTo(e, n * 0.62); g.closePath(); g.fill();
}

// LED: a dark board with a round hole per cell. `r` is the hole as a fraction of the cell.
function ledTile(r, ink = '#07090c') {
  return (g, n) => {
    g.fillStyle = ink;
    g.fillRect(0, 0, n, n);
    g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.arc(n / 2, n / 2, n * r, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'source-over';
  };
}

// Cross-stitch on aida: linen everywhere except an X of thread, which is left clear
// for the cell colour to show through, then shaded as twisted floss.
function stitchTile(g, n) {
  g.fillStyle = 'rgba(239,230,211,0.62)';
  g.fillRect(0, 0, n, n);
  // aida holes at the corners
  g.fillStyle = 'rgba(90,70,40,0.35)';
  const h = n * 0.09;
  for (const [x, y] of [[0, 0], [n, 0], [0, n], [n, n]]) { g.beginPath(); g.arc(x, y, h, 0, Math.PI * 2); g.fill(); }
  const inset = n * 0.12, lw = n * 0.46;
  g.globalCompositeOperation = 'destination-out';
  g.lineCap = 'round';
  g.lineWidth = lw;
  g.beginPath(); g.moveTo(inset, inset); g.lineTo(n - inset, n - inset); g.stroke();
  g.beginPath(); g.moveTo(n - inset, inset); g.lineTo(inset, n - inset); g.stroke();
  g.globalCompositeOperation = 'source-over';
  // the under stitch (\) shaded, then the top stitch (/) crossing it with a shadow
  g.lineWidth = n * 0.06;
  g.strokeStyle = 'rgba(0,0,0,0.20)';
  g.beginPath(); g.moveTo(inset + lw * 0.2, inset - lw * 0.1); g.lineTo(n - inset + lw * 0.2, n - inset - lw * 0.1); g.stroke();
  g.save();
  g.beginPath(); g.rect(0, 0, n, n); g.clip();
  g.strokeStyle = 'rgba(0,0,0,0.16)';
  g.lineWidth = lw;
  g.beginPath(); g.moveTo(n - inset + n * 0.05, inset + n * 0.05); g.lineTo(inset + n * 0.05, n - inset + n * 0.05); g.stroke();
  g.restore();
  g.strokeStyle = 'rgba(255,255,255,0.30)';
  g.lineWidth = n * 0.07;
  g.beginPath(); g.moveTo(n - inset - lw * 0.18, inset - lw * 0.05); g.lineTo(inset - lw * 0.18, n - inset - lw * 0.05); g.stroke();
}

// Toy bricks: seams and a stud per cell.
function brickTile(g, n) {
  const e = Math.max(1, Math.round(n * 0.06));
  g.fillStyle = 'rgba(255,255,255,0.18)';
  g.fillRect(0, 0, n, e); g.fillRect(0, 0, e, n);
  g.fillStyle = 'rgba(0,0,0,0.32)';
  g.fillRect(0, n - e, n, e); g.fillRect(n - e, 0, e, n);
  const cx = n / 2, cy = n / 2, r = n * 0.29;
  g.fillStyle = 'rgba(0,0,0,0.22)';
  g.beginPath(); g.ellipse(cx + n * 0.05, cy + n * 0.08, r, r * 0.95, 0, 0, Math.PI * 2); g.fill();
  g.lineWidth = Math.max(1, n * 0.07);
  g.strokeStyle = 'rgba(255,255,255,0.50)';
  g.beginPath(); g.arc(cx, cy, r, Math.PI * 0.9, Math.PI * 1.75); g.stroke();
  g.strokeStyle = 'rgba(0,0,0,0.30)';
  g.beginPath(); g.arc(cx, cy, r, -Math.PI * 0.1, Math.PI * 0.75); g.stroke();
}

// The windscreen: the black ceramic FRIT band a real windscreen has round its edge —
// solid at the glass edge, breaking into a hex dot screen whose dots shrink toward the
// middle — plus the dot patch behind the mirror mount, and a sheen across the glass.
function paintFrit(g) {
  const P = 5.2, RMAX = P * 0.62, ROWH = P * 0.866;
  const top = (y) => clamp01(1 - (y - 12) / 62) * (y < 12 ? 1.6 : 1);
  const side = (x) => {
    const d = Math.min(x, FW - x);
    return clamp01(1 - (d - 4) / 40) * (d < 4 ? 1.6 : 1);
  };
  const mirror = (x, y) => {
    // a trapezoid hanging from the top centre, 84 wide at the top, 52 at y 58
    const half = 42 - (y / 58) * 16;
    const dx = Math.abs(x - FW / 2) - half;
    const inside = Math.max(dx, y - 58);
    return clamp01(1 - inside / 14);
  };
  g.fillStyle = '#0b0c0e';
  for (let row = 0, y = 0; y < FH + P; row++, y = row * ROWH) {
    const off = (row & 1) ? P / 2 : 0;
    for (let x = off; x < FW + P; x += P) {
      const f = Math.max(top(y), side(x), mirror(x, y));
      if (f <= 0.02) continue;
      const r = RMAX * Math.min(1, Math.sqrt(f));
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
  }
  // the glass itself: one long diagonal sheen and a faint tint toward the top
  const tint = g.createLinearGradient(0, 0, 0, FH);
  tint.addColorStop(0, 'rgba(40,70,90,0.18)');
  tint.addColorStop(0.5, 'rgba(40,70,90,0.0)');
  g.fillStyle = tint;
  g.fillRect(0, 0, FW, FH);
  g.save();
  g.translate(300, 40);
  g.rotate(-0.55);
  const sh = g.createLinearGradient(0, -40, 0, 40);
  sh.addColorStop(0, 'rgba(255,255,255,0)');
  sh.addColorStop(0.45, 'rgba(255,255,255,0.10)');
  sh.addColorStop(0.55, 'rgba(255,255,255,0.13)');
  sh.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = sh;
  g.fillRect(-400, -40, 800, 80);
  g.restore();
}

// Rain on the glass: a fixed scatter of drops, each a little lens showing the world
// sharp and upside down while everything around it is the out-of-focus pixel blur.
const DROPS = (() => {
  let s = 1234567;
  const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  const out = [];
  for (let i = 0; i < 38; i++) {
    const r = 3 + Math.pow(rnd(), 2.2) * 9;
    out.push({ x: rnd() * FW, y: rnd() * 250, r, v: rnd() < 0.3 ? 4 + rnd() * 10 : 0 });
  }
  return out;
})();

// ------------------------------------------------------------------ candidates
// under(ctx, fx) replaces the backdrop; over(ctx, fx), if present, is glass in front of
// the hero. fx = { t, beat, s, k, paper() }, s being the resolve (0 through bars 1-4).
export const PIXEL_INTRO_CANDIDATES = [
  {
    letter: 'A', id: 'blocks', name: 'BLOCKS',
    note: 'Plain 8px mosaic, 60 across: the average colour of every cell. Resolves 8 → 4 → 2 → paper on the power-down\'s sixteenths.',
    under(ctx, fx) { cascade(ctx, fx, [3, 2, 1]); },
  },
  {
    letter: 'B', id: 'glass-tiles', name: 'GLASS TILES',
    note: '16px, 30 across, each block a bevelled glass tile with grout and a gloss corner. Resolves 16 → 8 → 4 → 2 → paper, the tiles shrinking with it.',
    under(ctx, fx) {
      const i = cascade(ctx, fx, [4, 3, 2, 1]);
      if (i < 0) return;
      const cell = 1 << [4, 3, 2, 1][i];
      if (cell >= 4) fillPattern(ctx, cellTile('glass', cell, cell, fx.k, glassTile), cell, cell);
    },
  },
  {
    letter: 'C', id: 'inks', name: 'FLAT INKS',
    note: '8px cells posterised to nineteen flat colours taken from the paper world itself — no in-between shades, so every edge is hard and the sky bands. (PICO-8\'s palette was tried: it has no light sky blue, and the sky turned to noise.) Reads 60x36 px back per frame. Resolves via 4px inks, then 2px full colour, then paper.',
    under(ctx, fx) {
      cascade(ctx, fx, [
        (c) => blitCanvas(c, quantisedLevel(3, FIELD_SERVICE_INKS)),
        (c) => blitCanvas(c, quantisedLevel(2, FIELD_SERVICE_INKS)),
        1,
      ]);
    },
  },
  {
    letter: 'D', id: 'led', name: 'LED BOARD',
    note: 'A stadium screen: one round lamp per 8px cell on a black board, a bloom that kicks on every beat. On the power-down the lamps go dark and turn into holes the paper world shows through, which swell open.',
    under(ctx, fx) {
      if (fx.s > 0) {
        fx.paper();
        const r = 0.40 + 0.34 * easeInOut(fx.s);
        const rb = Math.round(r * 40) / 40;
        if (rb < 0.71) fillPattern(ctx, cellTile(`led${rb}`, 8, 8, fx.k, ledTile(rb, '#0b0d10')), 8, 8);
        return;
      }
      ctx.fillStyle = '#07090c';
      ctx.fillRect(0, 0, FW, FH);
      blitLevel(ctx, 3);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.10;
      blitLevel(ctx, 3);
      ctx.restore();
      fillPattern(ctx, cellTile('led0.42', 8, 8, fx.k, ledTile(0.42)), 8, 8);
      const kick = Math.exp(-(fx.beat % 1) * 5);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.10 + 0.20 * kick;
      blitLevel(ctx, 4, true);
      ctx.restore();
    },
  },
  {
    letter: 'E', id: 'halftone', name: 'HALFTONE PRINT',
    note: 'A comic-book print: dots on a 45° screen on cream stock, each the colour under it and bigger the darker it is, so shadows close up solid. Reads 120x68 px back per frame. On the power-down the dots swell until they close, then paper.',
    under(ctx, fx) {
      const swellT = clamp01(fx.s / 0.5);
      if (fx.s >= 0.75) { fx.paper(); return; }
      if (fx.s >= 0.5) { blitLevel(ctx, 2); return; }
      const L = pyramid()[2];
      const d = L.ctx.getImageData(0, 0, L.w, L.h).data;
      ctx.fillStyle = '#f3ead6';
      ctx.fillRect(0, 0, FW, FH);
      const P = 7, R = P * 0.5, c = Math.SQRT1_2;
      const paths = new Map();
      const swell = 1 + 0.9 * easeIn(swellT);
      // lattice in the rotated frame (u,v), mapped to x = (u - v)c, y = (u + v)c
      const span = Math.ceil((FW + FH) / P / c) + 2;
      for (let i = -span; i <= span; i++) {
        for (let j = -span; j <= span; j++) {
          const u = i * P, v = j * P;
          const x = (u - v) * c, y = (u + v) * c;
          if (x < -P || x > FW + P || y < -P || y > FH + P) continue;
          const sx = Math.min(L.w - 1, Math.max(0, Math.floor(x / 4)));
          const sy = Math.min(L.h - 1, Math.max(0, Math.floor(y / 4)));
          const o = (sy * L.w + sx) * 4;
          const r8 = d[o], g8 = d[o + 1], b8 = d[o + 2];
          const luma = (0.2126 * r8 + 0.7152 * g8 + 0.0722 * b8) / 255;
          const rad = R * (0.92 + 0.75 * (1 - luma)) * swell;
          // one path per (colour, radius) bucket: a few dozen fills, not two thousand
          const key = `${r8 >> 4},${g8 >> 4},${b8 >> 4}`;
          let p = paths.get(key);
          if (!p) paths.set(key, p = { path: new Path2D(), col: `rgb(${(r8 & 0xf0) + 8},${(g8 & 0xf0) + 8},${(b8 & 0xf0) + 8})` });
          p.path.moveTo(x + rad, y);
          p.path.arc(x, y, rad, 0, Math.PI * 2);
        }
      }
      for (const p of paths.values()) { ctx.fillStyle = p.col; ctx.fill(p.path); }
    },
  },
  {
    letter: 'F', id: 'windscreen', name: 'WINDSCREEN',
    note: 'Looking out through the car: 8px blocks beyond the glass, and the black dot FRIT a real windscreen has round its edge and behind the mirror, over everything, hero included. On the power-down the glass lifts away up the frame as the blocks resolve.',
    under(ctx, fx) { cascade(ctx, fx, [3, 2, 1]); },
    over(ctx, fx) {
      const frit = frameOverlay('frit', fx.k, paintFrit);
      const lift = easeIn(fx.s) * FH * 1.05;
      ctx.drawImage(frit, 0, -lift, FW, FH);
    },
  },
  {
    letter: 'G', id: 'rain', name: 'RAIN + WIPER',
    note: 'A wet windscreen: the world out of focus as 8px blocks, and every raindrop a lens showing it sharp and upside down — a peek at the paper world before it arrives. The power-down is one sweep of the wiper, paper behind the blade.',
    under(ctx, fx) {
      blitLevel(ctx, 3);
      if (fx.s > 0) {
        const th = -Math.PI + Math.PI * easeInOut(fx.s);
        ctx.save();
        ctx.beginPath(); ctx.moveTo(240, 330); ctx.arc(240, 330, 480, -Math.PI, th, false); ctx.closePath();
        ctx.clip();
        fx.paper();
        ctx.restore();
      }
    },
    over(ctx, fx) {
      const L0 = pyramid()[0];
      const th = -Math.PI + Math.PI * easeInOut(fx.s);
      for (const dr of DROPS) {
        const y = dr.v ? ((dr.y + fx.t * dr.v) % 270) : dr.y;
        const x = dr.x, r = dr.r;
        if (fx.s > 0 && Math.atan2(y - 330, x - 240) < th) continue; // wiped
        const ry = r * 1.08;
        ctx.save();
        ctx.beginPath(); ctx.ellipse(x, y, r, ry, 0, 0, Math.PI * 2); ctx.clip();
        // the lens: a wide-angle, upside-down view of the horizon band behind it —
        // hills on top, sky underneath — which is what makes a drop read as water
        const sw = Math.min(FW, r * 2 * 9), shh = sw * 0.62;
        const sx = Math.max(0, Math.min(FW - sw, x - sw / 2));
        const sy = Math.max(0, Math.min(FH - shh, 196 - shh * 0.55));
        ctx.translate(x, y);
        ctx.scale(-1, -1);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(L0.canvas, sx, sy, sw, shh, -r, -ry, r * 2, ry * 2);
        ctx.restore();
        ctx.save();
        // a dark refraction rim all round, heaviest on top
        ctx.lineWidth = Math.max(0.7, r * 0.2);
        ctx.strokeStyle = 'rgba(8,22,30,0.38)';
        ctx.beginPath(); ctx.ellipse(x, y, r * 0.92, ry * 0.92, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(8,22,30,0.35)';
        ctx.beginPath(); ctx.ellipse(x, y, r * 0.9, ry * 0.9, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
        // the caustic: light gathered along the bottom inside edge
        ctx.lineWidth = Math.max(0.6, r * 0.12);
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath(); ctx.ellipse(x, y + ry * 0.05, r * 0.72, ry * 0.72, 0, Math.PI * 0.22, Math.PI * 0.78); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath(); ctx.ellipse(x - r * 0.34, y - ry * 0.45, r * 0.2, r * 0.12, -0.6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      if (fx.s > 0 && fx.s < 1) {
        const px = 240, py = 330;
        const ex = px + Math.cos(th) * 470, ey = py + Math.sin(th) * 470;
        const bx = px + Math.cos(th) * 150, by = py + Math.sin(th) * 150;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#1b1d20'; ctx.lineWidth = 3.2;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = '#050506'; ctx.lineWidth = 5.5;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(bx - Math.sin(th) * 1.5, by + Math.cos(th) * 1.5); ctx.lineTo(ex - Math.sin(th) * 1.5, ey + Math.cos(th) * 1.5); ctx.stroke();
        ctx.restore();
      }
    },
  },
  {
    letter: 'H', id: 'crt', name: 'CRT',
    note: '8px blocks on an old telly: RGB aperture-grille stripes, scanline gaps, bloom and a vignette. The power-down is the set switching off — the picture collapses to a bright line, then a dot — with the paper world standing behind the screen.',
    under(ctx, fx) {
      const screen = () => crtPass(ctx, fx.k, (c) => blitLevel(c, 3), CRT_FULL);
      if (fx.s <= 0) screen(); else switchOff(ctx, fx.s, screen, fx.paper);
    },
  },
  {
    letter: 'I', id: 'cross-stitch', name: 'CROSS-STITCH',
    note: 'A sampler: every 8px cell one X of floss on linen aida. Pixels that suit a folk-house tune and the cabinet\'s handmade paper. Resolves 8 → 4 (smaller stitches) → 2 → paper.',
    under(ctx, fx) {
      const i = cascade(ctx, fx, [3, 2, 1]);
      if (i < 0) return;
      const cell = 1 << [3, 2, 1][i];
      if (cell >= 4) fillPattern(ctx, cellTile('stitch', cell, cell, fx.k, stitchTile), cell, cell);
    },
  },
  {
    letter: 'J', id: 'bricks', name: 'TOY BRICKS',
    note: 'The world built out of 8px plastic bricks, a stud on each. Resolves 8 → 4 → 2 → paper, the bricks shrinking with it.',
    under(ctx, fx) {
      const i = cascade(ctx, fx, [3, 2, 1]);
      if (i < 0) return;
      const cell = 1 << [3, 2, 1][i];
      if (cell >= 4) fillPattern(ctx, cellTile('brick', cell, cell, fx.k, brickTile), cell, cell);
    },
  },
];

// ROUND TWO (30 Sep 2026). Peter liked A, C and H, and gave the story: the hero has just
// jumped INTO an arcade cabinet's screen. Bars 1-4 are chiptune, the power-down on 4.4 is a
// falling sine, and on 5.1 the paper world is fully there and the song turns modern. So
// round two puts C's flat inks on H's tube, uses the tube switching off as the change —
// the falling sine made visible — and pixelates the WHOLE frame, hero and lane included,
// because whoever jumped into the game is in the game. `whole` asks the driver to paint
// the world into the pyramid too; `paper` then means the paper frame with the hero in it.
export const PIXEL_INTRO_ROUND_TWO = [
  {
    letter: 'K', id: 'inks-crt-8', name: 'INKS ON A CRT, 8px', whole: true,
    note: 'C inside H, the whole frame: the nineteen Field Service inks (C\'s palette), hero included, so he keeps his purple cap and the house its red roof, on a softer tube. 4.4: the set switches off — picture to a line, line to a dot — with the paper world, and the paper hero, standing behind it.',
    under(ctx, fx) {
      const screen = () => crtPass(ctx, fx.k, inkScreen(8), CRT_SOFT);
      if (fx.s <= 0) screen(); else switchOff(ctx, fx.s, screen, fx.paper);
    },
  },
  {
    letter: 'L', id: 'inks-crt-8-black', name: 'INKS ON A CRT, 8px — off to black',
    whole: true,
    note: 'K, but the tube dies into black rather than onto the world: the line and the dot on a dark screen for the power-down beat, and the paper world CUTS in hard on the 5.1 downbeat, with the song.',
    under(ctx, fx) {
      const screen = () => crtPass(ctx, fx.k, inkScreen(8), CRT_SOFT);
      if (fx.s <= 0) screen(); else switchOff(ctx, fx.s, screen, blackTube(ctx));
    },
  },
  {
    letter: 'M', id: 'inks-crt-6', name: 'INKS ON A CRT, 6px', whole: true,
    note: 'K at 6px cells, 80 across: the hero nine cells tall rather than seven, so he reads as a sprite rather than a smudge. Same switch-off.',
    under(ctx, fx) {
      const screen = () => crtPass(ctx, fx.k, inkScreen(6), CRT_SOFT);
      if (fx.s <= 0) screen(); else switchOff(ctx, fx.s, screen, fx.paper);
    },
  },
  {
    letter: 'N', id: 'inks-crt-4', name: 'INKS ON A CRT, 4px', whole: true,
    note: 'K at 4px, 120 across: detailed 16-bit rather than chunky 8-bit. Same switch-off.',
    under(ctx, fx) {
      const screen = () => crtPass(ctx, fx.k, inkScreen(4), CRT_SOFT);
      if (fx.s <= 0) screen(); else switchOff(ctx, fx.s, screen, fx.paper);
    },
  },
  {
    letter: 'O', id: 'inks-whole-8', name: 'INKS, 8px, no tube', whole: true,
    note: 'C over the whole frame with no CRT, for judging what the tube adds. Resolves the way C did: 4px inks, 2px colour, paper, one sixteenth each.',
    under(ctx, fx) {
      cascade(ctx, fx, [inkScreen(8), inkScreen(4), 1]);
    },
  },
  {
    letter: 'P', id: 'blocks-crt-8', name: 'BLOCKS ON A CRT, 8px', whole: true,
    note: 'A inside H, the whole frame: averaged blocks, soft in-between shades, on the same soft tube, for comparing against K\'s flat inks. Same switch-off.',
    under(ctx, fx) {
      const screen = () => crtPass(ctx, fx.k, (c) => blitLevel(c, 3), CRT_SOFT);
      if (fx.s <= 0) screen(); else switchOff(ctx, fx.s, screen, fx.paper);
    },
  },
];

// ROUND THREE (30 Sep 2026). Peter picked L, but with the hero and the lane left alone:
// "they have already seen him NOT pixelated before this, so I want it to be like the
// background is transforming, not the entire scene". So L again with only bg() on the
// tube; the lane and the hero are painted crisp over it, over the dead black tube on 4.4,
// and over the paper world when it cuts in on 5.1.
export const PIXEL_INTRO_ROUND_THREE = [
  {
    letter: 'Q', id: 'inks-crt-8-black-bg', name: 'L, backdrop only — SHIPPED',
    note: 'L with the hero and the lane crisp: only the backdrop is the arcade screen. 4.4: the backdrop\'s tube dies to a line and a dot on black while Lorenzo keeps running on his lane in front of it; 5.1: the paper world cuts in behind him.',
    // THE SHIPPED CODE, not a copy of it.
    under(ctx, fx) { drawArcadeLook(ctx, fx.s, fx.k); },
  },
];

// ROUND FOUR (30 Sep 2026): THE LANDING. Q is the look; these are what happens ON 5.1, the
// downbeat the paper lands and the band comes in. Peter asked whether to shake the screen
// across the transition. Not during the power-down (the tube dying is a falling gesture and
// a shake is an impact: it jitters the line instead of letting it go) — but ON the downbeat,
// one hit. `land(ctx, since, paint)` draws the paper frame for the first second after 5.1
// (`since` in seconds); `paint` = { bg, world, base }.
//
// R is the game's own shake — renderer.js shake(power, duration): a uniform jitter of
// `power` px, easing out over its last quarter second — at the act card's weight, so what
// ships is one call. S is a paper sheet slapped onto the table: the backdrop only, dropped
// in from above and settling with one small bounce, lane and hero untouched. T is both.
const shakeAt = (since, power = 3, dur = 0.25) => {
  const left = dur - since;
  if (left <= 0) return [0, 0];
  const p = power * Math.min(1, left * 4);
  // The game rolls fresh dice every frame; here the dice are the frame number, so a
  // paused gallery holds one offset rather than a different one per repaint.
  const f = Math.floor(since * 60);
  const h = (n) => { let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
  return [(h(f * 2 + 1) * 2 - 1) * p, (h(f * 2 + 2) * 2 - 1) * p];
};
// The drop: 8 px above, falling in 0.09 s (ease-in, it is DROPPED), then one bounce of a
// px and a half that settles by 0.3 s. The shipped curve (T shipped), shared with the run.
const dropAt = arcadeLandingDrop;
const landFrame = (ctx, paint, { drop = 0, shake = [0, 0] }) => {
  ctx.save();
  ctx.fillStyle = '#050607';
  ctx.fillRect(-20, -20, FW + 40, FH + 40);
  ctx.translate(shake[0], shake[1]);
  ctx.fillStyle = paint.base;
  ctx.fillRect(0, 0, FW, FH);
  ctx.save();
  ctx.translate(0, drop);
  paint.bg(ctx);
  ctx.restore();
  paint.world(ctx);
  ctx.restore();
};
export const PIXEL_INTRO_ROUND_FOUR = [
  {
    letter: 'R', id: 'land-shake', name: 'Q + SHAKE on 5.1',
    note: 'The game\'s own screen shake — shake(3, 0.25), the act card\'s weight — fired on the 5.1 downbeat as the paper lands. The whole picture: backdrop, lane, hero.',
    under(ctx, fx) { drawArcadeLook(ctx, fx.s, fx.k); },
    land(ctx, since, paint) { landFrame(ctx, paint, { shake: shakeAt(since) }); },
  },
  {
    letter: 'S', id: 'land-drop', name: 'Q + PAPER DROP on 5.1',
    note: 'The paper backdrop is slapped down like a cut-out sheet onto the table: dropped in from 8px above on 5.1, one small bounce, settled by 0.3s. Only the backdrop moves; Lorenzo and the lane hold still.',
    under(ctx, fx) { drawArcadeLook(ctx, fx.s, fx.k); },
    land(ctx, since, paint) { landFrame(ctx, paint, { drop: dropAt(since) }); },
  },
  {
    letter: 'T', id: 'land-drop-shake', name: 'Q + DROP + SHAKE on 5.1 — SHIPPED',
    note: 'S and R together: the sheet drops and the whole picture takes the hit.',
    under(ctx, fx) { drawArcadeLook(ctx, fx.s, fx.k); },
    land(ctx, since, paint) { landFrame(ctx, paint, { drop: dropAt(since), shake: shakeAt(since) }); },
  },
];

// Where in the five-bar loop `t` falls: beat (0-20), resolve s, and a label.
export function pixelIntroPhase(t) {
  const beat = (t * PIXEL_INTRO_BPM / 60) % (PIXEL_INTRO_LOOP_BARS * 4);
  const s = beat < 15 ? 0 : beat < 16 ? beat - 15 : 1;
  return { beat, s, bar: Math.floor(beat / 4) + 1, beatInBar: Math.floor(beat % 4) + 1 };
}

// Per-candidate timings, milliseconds of main-thread work, smoothed.
export const pixelIntroCost = {};

// One frame. paintBg(ctx) paints the backdrop in the context's current space;
// paintWorld(ctx) paints what stands in front of it (lane, hero).
export function drawPixelIntro(ctx, cand, { t, paintBg, paintWorld = null, base = '#78c8f0', measure = false }) {
  const ph = pixelIntroPhase(t);
  // The first second after 5.1, for a look that does something as the paper lands.
  const since = (ph.beat - 16) * 60 / PIXEL_INTRO_BPM;
  if (ph.s >= 1 && cand.land && since >= 0 && since < 1) {
    cand.land(ctx, since, { bg: paintBg, world: paintWorld || (() => {}), base });
    return ph;
  }
  if (ph.s >= 1) {
    const t0 = measure ? performance.now() : 0;
    paintBg(ctx);
    if (measure) {
      const c = pixelIntroCost.paper || (pixelIntroCost.paper = { n: 0, bg: 0 });
      c.n++;
      c.bg += performance.now() - t0;
    }
    if (paintWorld) paintWorld(ctx);
    return ph;
  }
  const t0 = measure ? performance.now() : 0;
  // A whole-frame look paints the world into the pyramid with the backdrop, and its
  // `paper` is the whole paper frame; the world is then not painted again on top.
  const whole = !!cand.whole && !!paintWorld;
  const paintAll = whole ? (g) => { paintBg(g); paintWorld(g); } : paintBg;
  buildPyramid(paintAll, base);
  const t1 = measure ? performance.now() : 0;
  const fx = {
    t, beat: ph.beat, s: ph.s, k: deviceScale(ctx),
    paper: () => { ctx.save(); paintAll(ctx); ctx.restore(); },
  };
  ctx.save();
  cand.under(ctx, fx);
  ctx.restore();
  const t2 = measure ? performance.now() : 0;
  if (paintWorld && !whole) paintWorld(ctx);
  const t3 = measure ? performance.now() : 0;
  if (cand.over) { ctx.save(); cand.over(ctx, fx); ctx.restore(); }
  if (measure && ph.s === 0) {
    const t4 = performance.now();
    const c = pixelIntroCost[cand.id] || (pixelIntroCost[cand.id] = { n: 0, pyramid: 0, look: 0 });
    c.n++;
    c.pyramid += t1 - t0;
    c.look += (t2 - t1) + (t4 - t3);
  }
  return ph;
}
