// Style packs: renderer-only modules. One draw interface, zero game logic.
// Every pack draws: bg(ctx,t,camX,cab), ground(ctx,camX,cab,obstacles), post(ctx,t).
// Hitboxes/timings are style-independent; reduced motion/flashing tame effects.
import { W, H } from '../renderer.js';

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
function parallaxHills(ctx, camX, color, yBase, amp, wl, factor) {
  const period = Math.max(16, Math.round(Math.PI * wl));
  const top = yBase - amp;
  const key = `${color}|${yBase}|${amp}|${wl}`;
  let tile = hillCache.get(key);
  if (!tile) {
    const SS = 3;
    tile = document.createElement('canvas');
    tile.width = period * SS;
    tile.height = Math.max(1, (H - top) * SS);
    const x = tile.getContext('2d');
    x.scale(SS, SS);
    x.translate(0, -top);
    x.fillStyle = color;
    x.beginPath();
    x.moveTo(0, H);
    for (let px = 0; px <= period; px += 2) {
      x.lineTo(px, yBase - Math.abs(Math.sin(px / wl)) * amp);
    }
    x.lineTo(period, H);
    x.closePath();
    x.fill();
    hillCache.set(key, tile);
  }
  const off = ((camX * factor) % period + period) % period;
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  for (let x0 = -off; x0 < W; x0 += period) {
    ctx.drawImage(tile, x0, top, period, H - top);
  }
  ctx.imageSmoothingEnabled = prev;
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
    bg(ctx, t, camX, cab) {
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
      parallaxHills(ctx, camX, cab.far, GROUND_Y, 60, 90, 0.15);
      parallaxHills(ctx, camX, cab.hills, GROUND_Y, 34, 50, 0.35);
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
      // glow outline
      ctx.strokeStyle = e.kind === 'pickup' ? 'rgba(246,211,60,0.8)' : 'rgba(232,56,248,0.8)';
      ctx.strokeRect(x - 1.5, y - 1.5, e.w + 3, e.h + 3);
    },
  };
}

function watercolorPack(settings) {
  return {
    name: 'watercolor',
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
    decorate(ctx, e, x, y) {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x, y, e.w, 2);
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

function lcdPack(settings) {
  return {
    name: 'lcd',
    bg(ctx, t, camX, cab) {
      ctx.fillStyle = '#9aa88a';
      ctx.fillRect(0, 0, W, H);
      // faint fixed segment lattice (ghost positions)
      ctx.fillStyle = 'rgba(40,48,32,0.08)';
      for (let x = 8; x < W; x += 24) for (let y = 30; y < GROUND_Y; y += 30) ctx.fillRect(x, y, 14, 10);
    },
    ground(ctx, camX, cab, obstacles) {
      ctx.fillStyle = 'rgba(40,48,32,0.85)';
      ctx.fillRect(0, GROUND_Y, W, 2);
      ctx.fillStyle = 'rgba(40,48,32,0.2)';
      for (let x = -(camX % 24); x < W; x += 24) ctx.fillRect(Math.round(x), GROUND_Y + 6, 12, 2);
      for (const ob of obstacles || []) {
        if (ob.live && ob.def && ob.def.isGap) {
          ctx.fillStyle = '#9aa88a';
          ctx.fillRect(Math.round(ob.x - camX), GROUND_Y, ob.w, 4);
          ctx.fillStyle = 'rgba(40,48,32,0.5)';
          for (let gx = 0; gx < ob.w; gx += 6) ctx.fillRect(Math.round(ob.x - camX) + gx, GROUND_Y + 8, 3, 2);
        }
      }
    },
    post(ctx, t) {
      // two-tone: darken everything toward LCD ink (cheap: translucent olive overlay)
      ctx.fillStyle = 'rgba(60,68,44,0.18)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(154,168,138,0.12)';
      ctx.fillRect(0, 0, W, H);
    },
    decorate(ctx, e, x, y) {
      // segment ghost trail
      ctx.fillStyle = 'rgba(40,48,32,0.15)';
      ctx.fillRect(x + 12, y, e.w, e.h);
    },
  };
}

function cardboardPack(settings) {
  const reducedMotion = settings && settings.reducedMotion;
  return {
    name: 'cardboard',
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
    bg(ctx, t, camX, cab) {
      // graph paper
      ctx.fillStyle = '#f4f4f8';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(120,160,220,0.25)';
      for (let x = -(camX * 0.5 % 16); x < W; x += 16) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 16) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke(); }
      // margin line + coffee ring
      ctx.strokeStyle = 'rgba(220,80,80,0.3)';
      ctx.beginPath(); ctx.moveTo(30.5, 0); ctx.lineTo(30.5, H); ctx.stroke();
      ctx.strokeStyle = 'rgba(160,110,60,0.2)';
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
          ctx.fillStyle = '#f4f4f8';
          ctx.fillRect(x, GROUND_Y - 4, ob.w, 10);
          ctx.strokeStyle = '#3a3a58';
          ctx.strokeRect(x + 0.5, GROUND_Y + 2.5, ob.w, 20); // a pit, annotated
        }
      }
    },
    post(ctx, t) {},
    decorate(ctx, e, x, y) {
      const jitterSeed = Math.floor(performance.now() / 333);
      const j = Math.sin((e.id * 31 + jitterSeed * 77) * 12.9898) * 1;
      ctx.strokeStyle = 'rgba(58,58,88,0.9)';
      ctx.strokeRect(x - 1.5 + j, y - 1.5 - j, e.w + 3, e.h + 3);
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
    bg(ctx, t, camX, cab) { pick(t).bg(ctx, t, camX, cab); },
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
