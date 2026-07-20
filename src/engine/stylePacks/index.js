// Style packs: renderer-only modules. One draw interface, zero game logic.
// Every pack draws: bg(ctx,t,camX,cab), ground(ctx,camX,cab,obstacles), post(ctx,t).
// Hitboxes/timings are style-independent; reduced motion/flashing tame effects.
//
// `lightBg: true` opts a pack out of the GPU scene bloom. The bloom bright-pass
// (glfx.js FS_BRIGHT) keeps anything above ~0.8 luma, and the final composite
// adds it back at 0.45 — so a pale sky or paper background qualifies almost
// everywhere, gets ~1.4x its own value, and clips to flat white, erasing the
// linework and parallax layers drawn on it. Bloom cannot be threshold-tuned out
// of this: a coin (#f6d33c) sits at 0.80 luma, BELOW a pastel sky at 0.92, so no
// cutoff separates "bright detail" from "bright background". Light packs opt out
// wholesale instead; their art carries its own drawn highlights.
import { W, H } from '../renderer.js';
import { glowSprite } from '../../sprites/props.js';

const GROUND_Y = 232;

function drawGapsAwareGround(ctx, camX, cab, obstacles, colTop, colBody) {
  ctx.fillStyle = colBody;
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  ctx.fillStyle = colTop;
  ctx.fillRect(0, GROUND_Y, W, 3);
  // carve gaps
  for (const ob of obstacles || []) {
    if (ob.live && ob.def && ob.def.isGap) {
      const x = Math.round(ob.x - camX);
      ctx.fillStyle = '#08060c';
      ctx.fillRect(x, GROUND_Y, ob.w, H - GROUND_Y);
    }
  }
}

// Hills render ONCE into a seamlessly-tiling strip (|sin| has period pi*wl),
// then scroll as GPU texture blits instead of re-tracing a 60-segment path
// on the CPU every frame.
const hillCache = new Map();
// `opts.peak` swaps the rounded |sin| ridge for a triangular one with a lower
// shoulder — hills become mountains. `opts.rock` and `opts.snow` then band them:
// each fills everything above its own altitude line, clipped to the ridge
// silhouette, so only crests rising through a line pick up that color (the
// shoulders reach rock but not snow). Both lines wobble at integer multiples of
// the tile period, so they meet themselves at the seam.
//
// OVER (below) is why there is no seam line: a path edge landing exactly on
// x=0/x=period antialiases into a half-covered column, and two abutting tiles
// put two of those together — a translucent gap showing sky. Overdrawing past
// both edges (the fill clips to the canvas) keeps the edge columns fully
// opaque. Rounded hills never showed it because ridge(0) sits at ground level,
// hidden behind the near layer; a triangular shoulder crest lands at the tile
// edge and lifts that seam into open sky.
// Blits at a fractional x antialias their own dest-rect edge against the sky,
// and two abutting tiles composite that boundary pixel twice at partial alpha
// (0.5 over sky, then 0.5 over that = 0.75) — a fine translucent seam that
// appears only at some scroll offsets. So the tile carries MARGIN px of its
// neighbours' content on each side and blits MARGIN wider on both sides: the
// ridge is periodic, so the overlap agrees exactly and covers the boundary
// with opaque pixels instead of blending toward it. OVER (the path overdraw)
// must stay clear of the margin so those columns are solid too.
const MARGIN = 2;
const OVER = MARGIN + 4;
const TREE_MAX = 18; // tallest crown, reserved as tile headroom
const VOLCANO_PLX = 0.15; // must match the far hill layer's parallax factor
function parallaxHills(ctx, camX, color, yBase, amp, wl, factor, opts) {
  const period = Math.max(16, Math.round(Math.PI * wl));
  const top = yBase - amp;
  const peak = !!(opts && opts.peak);
  const snow = (opts && opts.snow) || null;
  const rock = (opts && opts.rock) || null;
  const trees = (opts && opts.trees) || null;
  // A tree standing on a crest has its base at `top`, so its crown would reach
  // above the tile and get sliced flat by the canvas edge. Give the tile that
  // much headroom and blit from there.
  const tileTop = top - (trees ? TREE_MAX : 0);
  const key = `${color}|${yBase}|${amp}|${wl}|${peak ? 1 : 0}|${rock || ''}|${snow || ''}|`
    + (trees ? trees.leaf + trees.trunk : '');
  let tile = hillCache.get(key);
  if (!tile) {
    const SS = 3;
    tile = document.createElement('canvas');
    tile.width = (period + MARGIN * 2) * SS;
    tile.height = Math.max(1, (H - tileTop) * SS);
    const x = tile.getContext('2d');
    x.scale(SS, SS);
    x.translate(MARGIN, -tileTop); // tile-local 0 is ridge x 0; the margin sits left of it
    const ridge = (px) => {
      if (!peak) return yBase - Math.abs(Math.sin(px / wl)) * amp;
      const u = (((px % period) + period) % period) / period; // px may go negative
      const main = 1 - Math.abs(u * 2 - 1);               // /\ centered in the tile
      const v = (u * 2 + 0.5) % 1;
      const side = (1 - Math.abs(v * 2 - 1)) * 0.55;      // smaller shoulder peaks
      return yBase - Math.max(main, side) * amp;
    };
    const ridgePath = () => {
      x.beginPath();
      x.moveTo(-OVER, H);
      for (let px = -OVER; px <= period + OVER; px += 2) x.lineTo(px, ridge(px));
      x.lineTo(period + OVER, H);
      x.closePath();
    };
    ridgePath();
    x.fillStyle = color;
    x.fill();
    // Altitude bands, low to high. Each re-traces the ridge to clip against:
    // restore() rolls back the clip but NOT the current path, so a second band
    // would otherwise clip itself to the first band's polygon.
    const band = (col, frac, h1, a1, h2, a2) => {
      const lineY = yBase - amp * frac;
      x.save();
      ridgePath();
      x.clip();
      x.fillStyle = col;
      x.beginPath();
      x.moveTo(-OVER, top);
      x.lineTo(period + OVER, top);
      for (let px = period + OVER; px >= -OVER; px -= 2) {
        const a = (px / period) * Math.PI * 2;
        x.lineTo(px, lineY + Math.sin(a * h1) * a1 + Math.sin(a * h2) * a2);
      }
      x.closePath();
      x.fill();
      x.restore();
    };
    if (rock) band(rock, 0.46, 2, 3.5, 5, 2);
    if (snow) band(snow, 0.62, 3, 2.5, 5, 1.5);
    // Trunk-and-crown trees along the ridge, baked in so they cost nothing per
    // frame. Each is drawn at tx-period and tx+period too: the ridge is
    // periodic, so one straddling the tile edge shows its other half on the
    // neighbouring copy. The crown is three overlapping circles rather than one
    // — a lone circle reads as a lollipop at this size.
    if (trees) {
      const n = Math.max(2, Math.round(period / 38));
      for (let i = 0; i < n; i++) {
        const j = Math.sin(i * 12.9898) * 43758.5453;
        const f = j - Math.floor(j);                    // stable 0..1 per index
        const k = Math.sin(i * 78.233 + 1.7) * 24634.6345;
        const g = k - Math.floor(k);                    // second stream: type + jitter
        const tx = ((i + 0.2 + g * 0.6) / n) * period;
        const th = 9 + f * 5;
        const by = ridge(tx) + 1;                       // bite into the hill
        for (const dx of [-period, 0, period]) {
          const cx = tx + dx;
          x.fillStyle = trees.trunk;
          x.fillRect(cx - th * 0.07, by - th * 0.55, th * 0.14, th * 0.55);
          x.fillStyle = trees.leaf;
          if (g < 0.45) {
            // pine: two stacked tiers, narrowing to a point
            const w = th * 0.34;
            x.beginPath();
            x.moveTo(cx, by - th);
            x.lineTo(cx + w * 0.72, by - th * 0.52);
            x.lineTo(cx - w * 0.72, by - th * 0.52);
            x.closePath();
            x.fill();
            x.beginPath();
            x.moveTo(cx, by - th * 0.78);
            x.lineTo(cx + w, by - th * 0.22);
            x.lineTo(cx - w, by - th * 0.22);
            x.closePath();
            x.fill();
          } else {
            // broadleaf: three overlapping circles — one alone reads as a lollipop
            const r = th * 0.30;
            x.beginPath();
            x.arc(cx, by - th * 0.72, r, 0, Math.PI * 2);
            x.arc(cx - r * 0.85, by - th * 0.52, r * 0.78, 0, Math.PI * 2);
            x.arc(cx + r * 0.85, by - th * 0.52, r * 0.78, 0, Math.PI * 2);
            x.fill();
          }
        }
      }
    }
    hillCache.set(key, tile);
  }
  const off = ((camX * factor) % period + period) % period;
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  for (let x0 = -off; x0 < W; x0 += period) {
    ctx.drawImage(tile, x0 - MARGIN, tileTop, period + MARGIN * 2, H - tileTop);
  }
  ctx.imageSmoothingEnabled = prev;
}

// A single volcano, pinned to one spot in the level rather than tiled: it lives
// in the far range's parallax, so its background x is chosen to put it at screen
// centre exactly when the camera reaches `atCam`. Drawn between the far and near
// hill layers, so the near hills cut off its base and it sits *in* the range.
// `pal` is the far range's own green/rock, so the volcano is built from the
// same three-band recipe as its neighbours (green lower slopes -> slate -> cap)
// with a scorched summit where they carry snow. Reading as one of the range
// rather than a separate prop matters more than volcano detail at this scale,
// so the flows stay narrow and haze-desaturated instead of bright orange.
function drawVolcano(ctx, t, camX, atCam, pal, reduced) {
  const cx = W / 2 + (atCam - camX) * VOLCANO_PLX;
  const hgt = 112, halfBase = 88, notch = 11;
  if (cx + halfBase < -20 || cx - halfBase > W + 20) return; // off screen
  const apex = GROUND_Y - hgt;
  const lip = apex + 4;
  const cone = () => {
    ctx.beginPath();
    ctx.moveTo(cx - halfBase, GROUND_Y);
    ctx.lineTo(cx - notch, apex);
    ctx.lineTo(cx - notch * 0.42, lip);   // crater dip, so the summit is not flat
    ctx.lineTo(cx + notch * 0.42, lip);
    ctx.lineTo(cx + notch, apex);
    ctx.lineTo(cx + halfBase, GROUND_Y);
    ctx.closePath();
  };
  cone();
  ctx.fillStyle = pal.green;
  ctx.fill();
  const band = (col, frac, h1, a1) => {
    const lineY = GROUND_Y - hgt * frac;
    ctx.save();
    cone();
    ctx.clip();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(cx - halfBase, apex - 2);
    ctx.lineTo(cx + halfBase, apex - 2);
    for (let px = halfBase; px >= -halfBase; px -= 3) {
      ctx.lineTo(cx + px, lineY + Math.sin(px / halfBase * Math.PI * h1) * a1);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  band(pal.rock, 0.46, 2, 3.5);
  band('#41485a', 0.74, 3, 2.2); // basalt cap where the range wears snow
  // Crater glow, then a single flow down each flank. The bright band travels on
  // `t`, so the lava reads as creeping without the silhouette moving.
  ctx.fillStyle = '#33313f';                 // dark crater mouth
  ctx.beginPath();
  ctx.ellipse(cx, lip, notch * 0.46, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c4552c';                 // lava sitting in it
  ctx.beginPath();
  ctx.ellipse(cx, lip + 0.4, notch * 0.3, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Flows are clipped to the cone (otherwise they run off the silhouette and
  // across the green hills as taut wires) and wander as they descend, so they
  // read as molten rather than as cable.
  ctx.save();
  cone();
  ctx.clip();
  // Each flow is a tapering ribbon rather than a column of fillRects — stacked
  // rects stair-step visibly at this scale. Three nested ribbons (cooled crust,
  // body, hot core) share one centreline; the core's width rides a wave that
  // travels on `t`, which is what makes the lava look like it is running.
  const flow = (dir, seed, len) => {
    const slope = halfBase / hgt;
    const pts = [];
    for (let s = 0; s <= len; s += 1.5) {
      const f = s / hgt;
      const drift = dir * (notch * 0.25 + s * slope * 0.38 * Math.pow(f, 0.7));
      const wander = Math.sin(f * 5.5 + seed) * 4 + Math.sin(f * 13 + seed * 2) * 1.8;
      const w = 3.8 - (s / len) * 2.2;                 // taper to a tip
      const pulse = reduced ? 0.55 : 0.40 + 0.32 * (Math.sin(f * 9 - t * 2 + seed) + 1) / 2;
      pts.push({ x: cx + drift + wander, y: lip + s, w, cw: w * pulse });
    }
    const ribbon = (key, scale, col) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const half = (p[key] * scale) / 2;
        if (i === 0) ctx.moveTo(p.x - half, p.y); else ctx.lineTo(p.x - half, p.y);
      }
      for (let i = pts.length - 1; i >= 0; i--) {
        const p = pts[i];
        ctx.lineTo(p.x + (p[key] * scale) / 2, p.y);
      }
      ctx.closePath();
      ctx.fill();
    };
    ribbon('w', 1, '#8f3f26');      // cooled crust
    ribbon('w', 0.7, '#c4552c');    // body
    ribbon('cw', 1, '#e89a4e');     // hot core
  };
  flow(1, 1.2, hgt * 0.46);
  flow(-1, 3.1, hgt * 0.3);
  ctx.restore();
  // smoke: pale and thin, tinted toward the sky so it sits back in the haze
  if (!reduced) {
    for (let i = 0; i < 4; i++) {
      const p = (t * 0.14 + i * 0.25) % 1;
      ctx.fillStyle = `rgba(168,174,186,${(1 - p) * 0.26})`;
      ctx.beginPath();
      ctx.arc(cx + p * 24, apex - 5 - p * 44, 4 + p * 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Per-frame gradient construction is surprisingly costly at device res —
// cache gradients by their color stops (they are reusable frame to frame).
const gradCache = new Map();
function skyGrad(ctx, c0, c1) {
  const key = c0 + '|' + c1;
  let g = gradCache.get(key);
  if (!g) {
    g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    g.addColorStop(0, c0);
    g.addColorStop(1, c1);
    gradCache.set(key, g);
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, GROUND_Y);
}

// Full-screen textures (scanlines, dot lattices) as tiny repeating patterns:
// one GPU-tiled fill instead of thousands of per-frame fillRects.
const patCache = new Map();
function patternFill(ctx, key, tw, th, paint) {
  let pat = patCache.get(key);
  if (!pat) {
    const c = document.createElement('canvas');
    c.width = tw;
    c.height = th;
    paint(c.getContext('2d'));
    pat = ctx.createPattern(c, 'repeat');
    patCache.set(key, pat);
  }
  if (pat) {
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
  }
}

// A repeating texture that covers the WHOLE screen every frame is cheaper
// baked once into a backbuffer-sized layer and blitted than re-tiled by the
// rasterizer each frame (measured: 3.3ms -> 0.4ms per fill). Re-bakes only
// when the backbuffer is resized.
const bakeCache = new Map();
function bakedFill(ctx, key, tw, th, paint) {
  const cv = ctx.canvas;
  let baked = bakeCache.get(key);
  if (!baked || baked.width !== cv.width || baked.height !== cv.height) {
    baked = document.createElement('canvas');
    baked.width = cv.width;
    baked.height = cv.height;
    const c = baked.getContext('2d');
    c.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
    const tile = document.createElement('canvas');
    tile.width = tw;
    tile.height = th;
    paint(tile.getContext('2d'));
    const pat = c.createPattern(tile, 'repeat');
    if (!pat) return;
    c.fillStyle = pat;
    c.fillRect(0, 0, W, H);
    bakeCache.set(key, baked);
  }
  ctx.drawImage(baked, 0, 0, W, H);
}

// --- level-1 sky pals: a plain, dignified sun (suns don't bop) and a nosy
// cartoon cloud that wanders the whole sky, drifts in and out of view, looks
// around with big eyes, and reacts to hero hits — gasping in sympathy or,
// just as often, laughing. Game code pings sunShock() from takeHit.
let cloudShockT = 0, cloudLaughT = 0, cloudLastT = 0;
export function sunShock() {
  if (Math.random() < 0.55) cloudLaughT = 1.7;
  else cloudShockT = 1.4;
}

function drawStaticSun(ctx, t) {
  // Animated but dignified: it slowly arcs across the sky like a day passing,
  // its rays rotate and breathe, and its halo pulses. It does not bop.
  const sx = (t * 3.2) % (W + 150);
  const x = W + 60 - sx;                              // drifts right to left
  const u = (x - W / 2) / (W / 2);
  const y = 32 + 26 * u * u;                          // shallow day-arc
  const breathe = 1 + 0.06 * Math.sin(t * 1.1);
  ctx.save();
  ctx.translate(x, y);
  // halo
  ctx.beginPath();
  ctx.arc(0, 0, 30 * breathe, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(248,200,64,${0.14 + 0.05 * Math.sin(t * 1.7)})`;
  ctx.fill();
  // rays: slow rotation, alternating lengths that shimmer
  ctx.fillStyle = '#f8c840';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + t * 0.18;
    const r2 = (23 + (i % 2) * 4 + 1.6 * Math.sin(t * 2.3 + i)) * breathe;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a - 0.1) * 17, Math.sin(a - 0.1) * 17);
    ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
    ctx.lineTo(Math.cos(a + 0.1) * 17, Math.sin(a + 0.1) * 17);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 0, 15 * breathe, 0, Math.PI * 2);
  ctx.fillStyle = '#f6d33c';
  ctx.fill();
  ctx.strokeStyle = 'rgba(26,16,40,0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawCloudPal(ctx, t, reduced) {
  if (t < cloudLastT) { cloudShockT = 0; cloudLaughT = 0; } // new run: compose yourself
  const dt = Math.max(0, Math.min(0.1, t - cloudLastT));
  cloudLastT = t;
  if (cloudShockT > 0) cloudShockT -= dt;
  if (cloudLaughT > 0) cloudLaughT -= dt;
  const laughing = cloudLaughT > 0;
  const shocked = !laughing && cloudShockT > 0;

  // Wandering path: crosses the whole sky slowly, then exits and stays gone
  // for a stretch before floating back in from the left.
  const x = ((t * 13) % (W + 190)) - 95;
  if (x < -45 || x > W + 45) return; // off having a private moment
  let y = 48 + Math.sin(t * 0.33) * 20 + Math.sin(t * 0.9) * 4;
  let jx = 0;
  if (!reduced && laughing) { y -= Math.abs(Math.sin(t * 15)) * 3; jx = Math.sin(t * 21) * 1.2; }
  if (!reduced && shocked) jx = Math.sin(t * 26) * 1.2;

  ctx.save();
  ctx.translate(x + jx, y);
  // puffy body
  ctx.beginPath();
  for (const [px, py, rx, ry] of [[-15, 3, 10, 8], [0, -5, 13, 10], [15, 3, 10, 8], [0, 4, 17, 9]]) {
    ctx.moveTo(px + rx, py);
    ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
  }
  ctx.fillStyle = '#f8f8ff';
  ctx.fill();
  ctx.strokeStyle = 'rgba(26,16,40,0.2)';
  ctx.lineWidth = 1.1;
  ctx.stroke();

  // idle micro-expressions: every ~8s slot, briefly giggle or doze
  const slot = Math.floor(t / 8);
  const hash = Math.abs(Math.sin(slot * 127.13));
  const inSlot = t - slot * 8 < 1.6;
  const idle = (!laughing && !shocked && inSlot) ? (hash < 0.25 ? 'giggle' : hash < 0.45 ? 'sleepy' : 'normal') : 'normal';

  // eyes
  ctx.lineCap = 'round';
  const gx = shocked || laughing ? 0 : Math.sin(t * 0.6) * 1.7 - 1.1;
  const gy = shocked || laughing ? 0 : Math.cos(t * 0.45) * 1.3 + 1.0;
  const blink = !laughing && !shocked && idle === 'normal' && Math.sin(t * 1.3) > 0.995;
  for (const sx of [-1, 1]) {
    const ex = sx * 6.5, ey = -4;
    if (laughing) {
      // happy closed arcs: ^ ^
      ctx.strokeStyle = '#1a1028';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ex, ey + 2, 3.4, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      continue;
    }
    const er = shocked ? 5.4 : 4.2;
    ctx.beginPath();
    ctx.ellipse(ex, ey, er * 0.85, blink ? 0.8 : idle === 'sleepy' ? er * 0.55 : er, 0, 0, Math.PI * 2);
    // white-on-white-cloud: the eye whites need a REAL outline or only the
    // pupils read and the gaze looks unmoored
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = 'rgba(26,16,40,0.85)';
    ctx.lineWidth = 1.25;
    ctx.stroke();
    if (!blink) {
      ctx.beginPath();
      ctx.arc(ex + gx, ey + gy + (idle === 'sleepy' ? 1.2 : 0), shocked ? 1.1 : 2, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1028';
      ctx.fill();
    }
    if (idle === 'sleepy') { // heavy lid
      ctx.beginPath();
      ctx.ellipse(ex, ey - er * 0.45, er * 0.9, er * 0.45, 0, Math.PI, 0);
      ctx.fillStyle = '#f8f8ff';
      ctx.fill();
    }
  }
  // brows
  if (shocked) {
    ctx.strokeStyle = '#1a1028';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-10, -11); ctx.lineTo(-4, -13.5);
    ctx.moveTo(10, -11); ctx.lineTo(4, -13.5);
    ctx.stroke();
  }
  // mouth
  if (laughing) {
    // wide-open cackle + tongue + a squeezed-out tear
    ctx.beginPath();
    ctx.ellipse(0, 4.5, 4.6, 4 + Math.abs(Math.sin(t * 15)) * 1.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#7a3020';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 6.8, 2.6, 1.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#f890b8';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-10.5, -1 + Math.sin(t * 7) * 1.2, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = '#8ac8f0';
    ctx.fill();
  } else if (shocked) {
    ctx.beginPath();
    ctx.ellipse(0, 5.5, 3.4, 4.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#7a3020';
    ctx.fill();
  } else if (idle === 'giggle') {
    ctx.beginPath();
    ctx.ellipse(0, 4, 3.2, 2.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#7a3020';
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, 2.5, 6.5, 0.25 * Math.PI, 0.75 * Math.PI);
    ctx.strokeStyle = '#1a1028';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(248,120,80,0.3)';
    ctx.beginPath();
    ctx.ellipse(-9.5, 2, 2.4, 1.4, 0, 0, Math.PI * 2);
    ctx.ellipse(9.5, 2, 2.4, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
function pixelPack(settings) {
  return {
    name: 'pixel',
    bg(ctx, t, camX, cab, totalDist) {
      skyGrad(ctx, cab.sky[0], cab.sky[1]);
      if (cab.id === 'plumber') {
        drawStaticSun(ctx, t);
        drawCloudPal(ctx, t, settings && settings.reducedMotion);
      }
      // clouds (drift across the sun — it doesn't mind)
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 0; i < 5; i++) {
        const cx = ((i * 137 - camX * 0.2) % (W + 60)) - 30;
        const cy = 30 + (i * 37) % 60;
        ctx.fillRect(Math.round(cx), cy, 34, 8);
        ctx.fillRect(Math.round(cx) + 6, cy - 5, 20, 5);
      }
      // PLUMBER PANIC's far layer is a snow-capped range; the near green hills
      // stay rounded so the two layers read as distance, not repetition. It gets
      // extra amplitude because the near layer eats the bottom third of it —
      // at the shared amp of 60 the caps barely cleared the green.
      if (cab.id === 'plumber') {
        // Rock and snow are haze-desaturated toward the sky rather than true
        // brown/white: distance reads better, and it keeps the cap under the
        // bloom bright-pass. Pure white snow (#eef6ff, luma .96) sailed past
        // the smoothstep(0.8, 0.97) cutoff in glfx.js and glowed like neon.
        parallaxHills(ctx, camX, cab.far, GROUND_Y, 96, 90, 0.15,
          { peak: true, rock: '#5e6e7c', snow: '#b9c8d8' });
      } else {
        parallaxHills(ctx, camX, cab.far, GROUND_Y, 60, 90, 0.15);
      }
      // Overtime runs have no midpoint (totalDist is Infinity), so no volcano.
      if (cab.id === 'plumber' && Number.isFinite(totalDist) && totalDist > 0) {
        drawVolcano(ctx, t, camX, totalDist * 0.5,
          { green: cab.far, rock: '#5e6e7c' }, settings && settings.reducedMotion);
      }
      parallaxHills(ctx, camX, cab.hills, GROUND_Y, 34, 50, 0.35,
        cab.id === 'plumber' ? { trees: { leaf: '#3c8c4c', trunk: '#6b4a30' } } : null);
    },
    ground(ctx, camX, cab, obstacles) {
      drawGapsAwareGround(ctx, camX, cab, obstacles, cab.ground, cab.groundDark);
      // scrolling ground ticks
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      for (let x = -(camX % 24); x < W; x += 24) ctx.fillRect(Math.round(x), GROUND_Y + 8, 10, 2);
    },
    post() {},
  };
}

function faux3dPack(settings) {
  return {
    name: 'faux3d',
    bg(ctx, t, camX, cab) {
      skyGrad(ctx, cab.sky[0], cab.sky[1]);
      // chunky "pre-rendered" sun with gradient shading
      const g = ctx.createRadialGradient(380, 60, 6, 380, 60, 30);
      g.addColorStop(0, '#fff0c0'); g.addColorStop(1, 'rgba(248,192,96,0)');
      ctx.fillStyle = g; ctx.fillRect(340, 20, 80, 80);
      parallaxHills(ctx, camX, cab.far, GROUND_Y, 50, 110, 0.12);
      // loop-de-loop background props
      ctx.strokeStyle = 'rgba(160,104,48,0.5)';
      ctx.lineWidth = 4;
      for (let i = 0; i < 2; i++) {
        const lx = ((i * 340 - camX * 0.3) % (W + 160)) - 80;
        ctx.beginPath(); ctx.arc(lx, GROUND_Y - 40, 28, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.lineWidth = 1;
    },
    ground(ctx, camX, cab, obstacles) {
      // pseudo-3D checkered road
      ctx.fillStyle = cab.groundDark;
      ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
      for (let row = 0; row < 5; row++) {
        const y = GROUND_Y + row * 8;
        const size = 16 + row * 8;
        const off = (camX * (1 + row * 0.25)) % (size * 2);
        for (let x = -off; x < W; x += size * 2) {
          ctx.fillStyle = row % 2 === 0 ? cab.ground : cab.groundDark;
          ctx.fillRect(Math.round(x), y, size, 8);
        }
      }
      for (const ob of obstacles || []) {
        if (ob.live && ob.def && ob.def.isGap) {
          ctx.fillStyle = '#08060c';
          ctx.fillRect(Math.round(ob.x - camX), GROUND_Y, ob.w, H - GROUND_Y);
        }
      }
      ctx.fillStyle = '#f6d33c';
      ctx.fillRect(0, GROUND_Y, W, 2);
    },
    post(ctx, t) {
      // soft vertical sheen, very "rendered in 1994"
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(255,255,255,0.05)');
      g.addColorStop(0.5, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.12)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    },
    decorate(ctx, e, x, y) {
      // fake drop shadow = instant pre-rendered look
      if (e.def && (e.def.ground || e.alt < 20)) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x + 2, GROUND_Y + 2, e.w, 3);
      }
    },
  };
}

function neonPack(settings) {
  return {
    name: 'neon',
    dark: true,
    bg(ctx, t, camX, cab) {
      skyGrad(ctx, cab.sky[0], cab.sky[1]);
      // starfield
      ctx.fillStyle = '#8888c8';
      for (let i = 0; i < 40; i++) {
        const sx = (i * 97 - camX * 0.05) % W;
        const sy = (i * 61) % (GROUND_Y - 60);
        ctx.fillRect(Math.round(sx < 0 ? sx + W : sx), sy, 1, 1);
      }
      // wireframe skyline
      ctx.strokeStyle = '#e838f8';
      for (let i = 0; i < 8; i++) {
        const bx = ((i * 90 - camX * 0.25) % (W + 100)) - 50;
        const bh = 40 + (i * 53) % 70;
        ctx.strokeRect(Math.round(bx) + 0.5, GROUND_Y - bh + 0.5, 36, bh);
        ctx.strokeStyle = i % 2 ? '#38d8f8' : '#e838f8';
      }
      // horizon grid
      ctx.strokeStyle = 'rgba(56,216,248,0.4)';
      for (let i = 0; i < 6; i++) {
        const y = GROUND_Y - 4 - i * 3;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
    },
    ground(ctx, camX, cab, obstacles) {
      ctx.fillStyle = '#0c0c20';
      ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
      ctx.strokeStyle = '#38d8f8';
      ctx.beginPath(); ctx.moveTo(0, GROUND_Y + 0.5); ctx.lineTo(W, GROUND_Y + 0.5); ctx.stroke();
      for (let x = -(camX % 40); x < W; x += 40) {
        ctx.strokeStyle = 'rgba(56,216,248,0.35)';
        ctx.beginPath(); ctx.moveTo(x, GROUND_Y); ctx.lineTo(x - 20, H); ctx.stroke();
      }
      for (const ob of obstacles || []) {
        if (ob.live && ob.def && ob.def.isGap) {
          ctx.fillStyle = '#000';
          ctx.fillRect(Math.round(ob.x - camX), GROUND_Y, ob.w, H - GROUND_Y);
        }
      }
    },
    post(ctx, t) {
      ctx.fillStyle = 'rgba(56,16,88,0.1)';
      ctx.fillRect(0, 0, W, H);
    },
    decorate(ctx, e, x, y) {
      // Additive bloom around the art rather than a rectangle around the
      // hitbox — round props stay round, and the light still reads as neon.
      const color = e.kind === 'pickup' ? 'rgba(246,211,60,0.5)' : 'rgba(232,56,248,0.45)';
      const r = Math.max(e.w, e.h) * 0.85 + 5;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(glowSprite(color, r), x + e.w / 2 - r, y + e.h / 2 - r, r * 2, r * 2);
      ctx.restore();
    },
  };
}

function watercolorPack(settings) {
  return {
    name: 'watercolor',
    lightBg: true,
    bg(ctx, t, camX, cab) {
      skyGrad(ctx, cab.sky[0], cab.sky[1]);
      // soft wash blobs
      for (let i = 0; i < 6; i++) {
        const bx = ((i * 120 - camX * 0.1) % (W + 120)) - 60;
        const by = 30 + (i * 47) % 80;
        const g = ctx.createRadialGradient(bx, by, 4, bx, by, 40);
        g.addColorStop(0, 'rgba(255,255,255,0.25)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(bx - 40, by - 40, 80, 80);
      }
      // blotchy hills with irregular edges
      for (const [color, yb, amp, wl, f] of [[cab.far, GROUND_Y, 66, 130, 0.12], [cab.hills, GROUND_Y, 40, 70, 0.3]]) {
        ctx.globalAlpha = 0.7;
        parallaxHills(ctx, camX, color, yb, amp, wl, f);
        ctx.globalAlpha = 0.4;
        parallaxHills(ctx, camX + 13, color, yb + 4, amp, wl * 1.1, f);
        ctx.globalAlpha = 1;
      }
    },
    ground(ctx, camX, cab, obstacles) {
      ctx.globalAlpha = 0.85;
      drawGapsAwareGround(ctx, camX, cab, obstacles, cab.ground, cab.groundDark);
      ctx.globalAlpha = 1;
    },
    post(ctx, t) {
      // paper grain: sparse dot lattice (tiled pattern — one fill)
      patternFill(ctx, 'paperGrain', 6, 8, (c) => {
        c.fillStyle = 'rgba(120,100,80,0.06)';
        c.fillRect(0, 0, 1, 1);
        c.fillRect(2, 4, 1, 1);
      });
      ctx.fillStyle = 'rgba(255,250,240,0.05)';
      ctx.fillRect(0, 0, W, H);
    },
  };
}

function vhsPack(settings) {
  const reduced = settings && settings.reducedFlashing;
  return {
    name: 'vhs',
    dark: true,
    bg(ctx, t, camX, cab) {
      skyGrad(ctx, cab.sky[0], cab.sky[1]);
      parallaxHills(ctx, camX, cab.far, GROUND_Y, 55, 100, 0.15);
      parallaxHills(ctx, camX, cab.hills, GROUND_Y, 32, 56, 0.35);
      // fog
      ctx.fillStyle = 'rgba(140,120,160,0.12)';
      ctx.fillRect(0, GROUND_Y - 40, W, 40);
    },
    ground(ctx, camX, cab, obstacles) {
      drawGapsAwareGround(ctx, camX, cab, obstacles, cab.ground, cab.groundDark);
    },
    post(ctx, t) {
      // scanlines (tiled pattern — one fill)
      patternFill(ctx, 'vhsScan', 1, 3, (c) => {
        c.fillStyle = 'rgba(0,0,0,0.18)';
        c.fillRect(0, 0, 1, 1);
      });
      // chroma edges
      ctx.fillStyle = 'rgba(255,0,80,0.05)';
      ctx.fillRect(1, 0, W, H);
      ctx.fillStyle = 'rgba(0,255,240,0.05)';
      ctx.fillRect(-1, 0, W, H);
      // tracking wobble band (disabled under reduced flashing)
      if (!reduced) {
        const y = (t * 40) % (H + 30) - 15;
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(0, y, W, 8);
      }
      ctx.fillStyle = '#e8e8f0';
      ctx.fillRect(W - 46, H - 14, 4, 6); // "PLAY ▶" glyph-ish
      ctx.beginPath();
      ctx.moveTo(W - 38, H - 14); ctx.lineTo(W - 38, H - 8); ctx.lineTo(W - 32, H - 11);
      ctx.closePath(); ctx.fill();
    },
  };
}

// Game & Watch. The whole illusion is that there is no renderer — just ink
// segments switching on and off behind a green polarizer. Tinting colored
// sprites gets you mud; the panel has to actually *convert* the frame, which
// post() does with blend modes (no per-pixel readback, so it stays cheap).
const LCD_PANEL = '#96a479';   // backlit pea-green
const LCD_INK = '#242a1a';     // switched-on segment
function lcdPack(settings) {
  const reduced = settings && settings.reducedFlashing;
  return {
    name: 'lcd',
    // The panel converts the *background* to two tones; the cast — hero,
    // hazards, pickups — draws on top of it in colour, as the lit things you
    // are meant to track.
    actorsAbovePost: true,
    bg(ctx, t, camX, cab) {
      // Bright backlight. post() only ever darkens, so the panel has to start
      // near-white or the whole screen lands in mud.
      skyGrad(ctx, '#e8eede', '#d2dcc2');
      ctx.fillStyle = '#d2dcc2';
      ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
      // Printed backplate art — silkscreened on the glass, so it does NOT
      // scroll. That stillness is most of what reads as "LCD handheld".
      // Kept as thin outlines: printed art must never mass up enough to be
      // mistaken for a lit segment (i.e. for something that can kill you).
      // Alphas are tuned against post()'s contrast curve: printed art has to
      // land in the greys, well clear of the black a lit segment goes to.
      ctx.strokeStyle = 'rgba(40,48,30,0.5)';
      ctx.fillStyle = 'rgba(40,48,30,0.4)';
      for (let i = 0; i < 7; i++) {
        const bx = 22 + i * 68, bh = 26 + (i % 3) * 14;
        ctx.strokeRect(bx + 0.5, GROUND_Y - bh + 0.5, 29, bh);
        for (let wy = GROUND_Y - bh + 6; wy < GROUND_Y - 6; wy += 9) ctx.fillRect(bx + 6, wy, 4, 3);
      }
      ctx.fillStyle = 'rgba(40,48,30,0.42)';
      for (let i = 0; i < 5; i++) { // cloud + sun segments, unlit
        ctx.fillRect(40 + i * 96, 26, 26, 9);
        ctx.fillRect(46 + i * 96, 21, 14, 5);
      }
      ctx.strokeStyle = 'rgba(40,48,30,0.55)';
      ctx.beginPath(); ctx.arc(W - 54, 40, 13, 0, Math.PI * 2); ctx.stroke();
      // Bezel: printed frame around the active area.
      ctx.strokeStyle = 'rgba(40,48,30,0.6)';
      ctx.lineWidth = 2;
      ctx.strokeRect(5, 5, W - 10, H - 10);
      ctx.lineWidth = 1;
    },
    ground(ctx, camX, cab, obstacles) {
      ctx.fillStyle = LCD_INK;
      ctx.fillRect(0, GROUND_Y, W, 3);
      // Motion has to quantize to segment pitch — smooth scroll is the one
      // thing a segment display physically cannot do.
      const PITCH = 16;
      const step = Math.round(camX / PITCH) * PITCH;
      ctx.fillStyle = 'rgba(36,42,26,0.5)';
      for (let x = -(step % PITCH); x < W; x += PITCH) ctx.fillRect(Math.round(x), GROUND_Y + 7, 8, 3);
      for (const ob of obstacles || []) {
        if (ob.live && ob.def && ob.def.isGap) {
          const x = Math.round(ob.x - camX);
          ctx.fillStyle = '#8d9b70';
          ctx.fillRect(x, GROUND_Y, ob.w, 5);
          ctx.fillStyle = LCD_INK;
          ctx.fillRect(x, GROUND_Y, 2, 16);
          ctx.fillRect(x + ob.w - 2, GROUND_Y, 2, 16);
        }
      }
    },
    post(ctx, t) {
      // The conversion. A segment is on or off, so the frame has to be pushed
      // toward two tones — a translucent tint just mutes colour into mud, it
      // never removes it.
      // 1. strip hue. This pass is non-negotiable and there is no cheap
      // substitute: multiplying by the olive panel alone leaves saturated
      // sprites saturated (a blue hero just becomes a navy hero).
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, W, H);
      // 2. crush the midtones: color-burn against a light grey plunges them
      // while leaving the backlight untouched — a segment display's S-curve.
      ctx.globalCompositeOperation = 'color-burn';
      ctx.fillStyle = '#cfcfcf';
      ctx.fillRect(0, 0, W, H);
      // 3. tint: whites become glass, blacks become ink.
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = LCD_PANEL;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      // Cell gaps: the dark lattice between liquid-crystal segments.
      bakedFill(ctx, 'lcdCells', 3, 3, (c) => {
        c.fillStyle = 'rgba(30,36,20,0.16)';
        c.fillRect(2, 0, 1, 3);
        c.fillRect(0, 2, 3, 1);
      });
      if (!reduced) {
        // 1Hz backlight flicker — tiny, but it stops the panel looking printed.
        ctx.fillStyle = `rgba(255,255,255,${0.012 + Math.sin(t * 6.3) * 0.012})`;
        ctx.fillRect(0, 0, W, H);
      }
    },
    decorate(ctx, e, x, y) {
      // Segment ghosting: the cell the shape just left hasn't fully relaxed.
      // An outline, not a filled box — it trails, it doesn't duplicate.
      ctx.strokeStyle = 'rgba(36,42,26,0.18)';
      ctx.strokeRect(Math.round(x) - 8.5, Math.round(y) + 0.5, e.w, e.h);
    },
  };
}

function cardboardPack(settings) {
  const reducedMotion = settings && settings.reducedMotion;
  return {
    name: 'cardboard',
    lightBg: true,
    bg(ctx, t, camX, cab) {
      skyGrad(ctx, cab.sky[0], cab.sky[1]);
      const wob = reducedMotion ? 0 : Math.sin(t * 2) * 1.5;
      // cardboard cutout hills with corrugation ticks
      parallaxHills(ctx, camX, cab.far, GROUND_Y + wob, 56, 120, 0.15);
      ctx.fillStyle = 'rgba(90,64,32,0.3)';
      for (let x = 0; x < W; x += 10) ctx.fillRect(x, GROUND_Y - 60 + Math.round(wob), 2, 6);
      parallaxHills(ctx, camX, cab.hills, GROUND_Y - wob, 34, 60, 0.35);
      // a "distant" castle that is obviously four inches tall, on a stick
      const cx = ((300 - camX * 0.4) % (W + 200)) - 100;
      ctx.fillStyle = '#b89058';
      ctx.fillRect(cx, GROUND_Y - 40, 24, 20);
      ctx.fillRect(cx + 2, GROUND_Y - 46, 5, 6);
      ctx.fillRect(cx + 17, GROUND_Y - 46, 5, 6);
      ctx.fillStyle = '#8a6a4a';
      ctx.fillRect(cx + 11, GROUND_Y - 20, 3, 20); // the visible stick
    },
    ground(ctx, camX, cab, obstacles) {
      drawGapsAwareGround(ctx, camX, cab, obstacles, cab.ground, cab.groundDark);
      ctx.fillStyle = 'rgba(90,64,32,0.4)';
      for (let x = -(camX % 10); x < W; x += 10) ctx.fillRect(Math.round(x), GROUND_Y + 4, 2, 5);
    },
    post(ctx, t) {
      ctx.fillStyle = 'rgba(200,160,104,0.05)';
      ctx.fillRect(0, 0, W, H);
    },
    decorate(ctx, e, x, y) {
      // visible tape corner
      ctx.fillStyle = 'rgba(232,232,240,0.5)';
      ctx.fillRect(x - 1, y - 1, 4, 3);
    },
  };
}

function doodlePack(settings) {
  return {
    name: 'doodle',
    lightBg: true,
    bg(ctx, t, camX, cab) {
      // graph paper — a warm off-white, not near-#fff, so blue ink reads
      ctx.fillStyle = '#eceadf';
      ctx.fillRect(0, 0, W, H);
      ctx.lineWidth = 1;
      // Minor cells, then a heavier rule every 4th to give the page structure.
      const ox = camX * 0.5 % 16;
      for (let i = 0, x = -ox; x < W; i++, x += 16) {
        ctx.strokeStyle = Math.round((camX * 0.5 - ox) / 16 + i) % 4 === 0 ? 'rgba(88,132,200,0.55)' : 'rgba(88,132,200,0.3)';
        ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke();
      }
      for (let y = 0, i = 0; y < H; y += 16, i++) {
        ctx.strokeStyle = i % 4 === 0 ? 'rgba(88,132,200,0.55)' : 'rgba(88,132,200,0.3)';
        ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke();
      }
      // margin line + coffee ring
      ctx.strokeStyle = 'rgba(210,70,70,0.55)';
      ctx.beginPath(); ctx.moveTo(30.5, 0); ctx.lineTo(30.5, H); ctx.stroke();
      ctx.strokeStyle = 'rgba(150,100,50,0.35)';
      ctx.beginPath(); ctx.arc(((400 - camX * 0.2) % (W + 100)), 60, 18, 0, Math.PI * 2); ctx.stroke();
    },
    ground(ctx, camX, cab, obstacles) {
      // wobbly ballpoint ground line, re-jittered at ~3fps
      const jitterSeed = Math.floor(performance.now() / 333);
      ctx.strokeStyle = '#3a3a58';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 12) {
        const j = Math.sin((x + jitterSeed * 77) * 12.9898) * 1.5;
        if (x === 0) ctx.moveTo(x, GROUND_Y + j); else ctx.lineTo(x, GROUND_Y + j);
      }
      ctx.stroke();
      ctx.lineWidth = 1;
      for (const ob of obstacles || []) {
        if (ob.live && ob.def && ob.def.isGap) {
          const x = Math.round(ob.x - camX);
          ctx.fillStyle = '#eceadf';
          ctx.fillRect(x, GROUND_Y - 4, ob.w, 10);
          ctx.strokeStyle = '#3a3a58';
          ctx.strokeRect(x + 0.5, GROUND_Y + 2.5, ob.w, 20); // a pit, annotated
        }
      }
    },
    post(ctx, t) {},
    decorate(ctx, e, x, y) {
      // A biro underline instead of a box: still reads as margin-doodle
      // annotation, but never cages the art. Jitter is per-entity, so it
      // sits still instead of twitching every frame.
      const j = Math.sin(e.id * 12.9898) * 1.2;
      const by = y + e.h + 2;
      ctx.strokeStyle = 'rgba(58,58,88,0.75)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 1, by + j * 0.3);
      ctx.quadraticCurveTo(x + e.w / 2, by + 2.5 - j, x + e.w + 1, by + j * 0.3);
      ctx.stroke();
    },
  };
}

function surgePack(settings) {
  // Cycles through the other packs with glitch cuts (crossfades under reduced flashing).
  const packs = [pixelPack(settings), faux3dPack(settings), neonPack(settings), watercolorPack(settings), vhsPack(settings), lcdPack(settings), cardboardPack(settings), doodlePack(settings)];
  const reduced = settings && settings.reducedFlashing;
  const period = 7; // seconds per style
  function pick(t) { return packs[Math.floor(t / period) % packs.length]; }
  return {
    name: 'surge',
    dark: true,
    // Read fresh each frame by the run's draw, so the cast is held back past
    // post() only while the cycle is sitting on a pack that converts the frame.
    get actorsAbovePost() { return pick(this._t || 0).actorsAbovePost === true; },
    // Same deal for the bloom gate: the cycle passes through the light packs,
    // and their backgrounds clip just as hard here as they do standalone.
    get lightBg() { return pick(this._t || 0).lightBg === true; },
    bg(ctx, t, camX, cab, totalDist) { pick(t).bg(ctx, t, camX, cab, totalDist); },
    ground(ctx, camX, cab, obstacles) { pick(this._t || 0).ground(ctx, camX, cab, obstacles); },
    post(ctx, t) {
      this._t = t;
      pick(t).post(ctx, t);
      const phase = (t % period) / period;
      if (!reduced && phase > 0.96) {
        // glitch cut: horizontal slice offsets
        ctx.fillStyle = 'rgba(232,56,248,0.15)';
        for (let i = 0; i < 5; i++) ctx.fillRect(0, (i * 61 + t * 200) % H, W, 3);
      }
    },
    decorate(ctx, e, x, y) {
      const p = pick(this._t || 0);
      if (p.decorate) p.decorate(ctx, e, x, y);
    },
  };
}

const FACTORIES = {
  pixel: pixelPack, faux3d: faux3dPack, neon: neonPack, watercolor: watercolorPack,
  vhs: vhsPack, lcd: lcdPack, cardboard: cardboardPack, doodle: doodlePack, surge: surgePack,
};

export function getStylePack(name, settings) {
  const f = FACTORIES[name] || FACTORIES.pixel;
  const s = settings || {};
  const pack = f(s);
  // Accessibility: high-contrast outlines on every obstacle, in every style.
  if (s.highContrast) {
    const inner = pack.decorate;
    pack.decorate = (ctx, e, x, y) => {
      if (inner) inner(ctx, e, x, y);
      if (e.kind === 'obstacle') {
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.strokeRect(x - 0.5, y - 0.5, e.w + 1, e.h + 1);
      }
    };
  }
  if (!pack.decorate) pack.decorate = null;
  return pack;
}
