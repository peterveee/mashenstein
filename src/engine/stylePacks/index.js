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

function parallaxHills(ctx, camX, color, yBase, amp, wl, factor) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 8) {
    const wx = (x + camX * factor);
    const y = yBase - Math.abs(Math.sin(wx / wl)) * amp;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
}

function skyGrad(ctx, c0, c1) {
  const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  g.addColorStop(0, c0); g.addColorStop(1, c1);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, GROUND_Y);
}

// ---------------------------------------------------------------------------
function pixelPack(settings) {
  return {
    name: 'pixel',
    bg(ctx, t, camX, cab) {
      skyGrad(ctx, cab.sky[0], cab.sky[1]);
      // clouds
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
      // paper grain: sparse dot lattice
      ctx.fillStyle = 'rgba(120,100,80,0.06)';
      for (let y = 0; y < H; y += 4) {
        for (let x = (y % 8 === 0 ? 0 : 2); x < W; x += 6) ctx.fillRect(x, y, 1, 1);
      }
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
      // scanlines
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
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
