// Flat-cartoon vector props: obstacles, pickups, villains, scenery.
// Same language as the heroes (sprites/toons.js) — flat colors, soft dark
// outlines, no pixel grids. Each painter draws into a normalized w-by-h box,
// so art is resolution independent; painters are rasterized once into
// supersampled offscreen canvases and drawn smoothly at any size.

const OUTLINE = 'rgba(26,16,40,0.34)';

// ------------------------------------------------------------- helpers
function ol(ctx, u) { ctx.strokeStyle = OUTLINE; ctx.lineWidth = Math.max(0.55, 0.055 * u); }
function shape(ctx, fill, u, pathFn) {
  ctx.beginPath();
  pathFn(ctx);
  ctx.fillStyle = fill;
  ctx.fill();
  ol(ctx, u);
  ctx.stroke();
}
function plain(ctx, fill, pathFn) {
  ctx.beginPath();
  pathFn(ctx);
  ctx.fillStyle = fill;
  ctx.fill();
}
function rr(ctx, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}
function star(ctx, cx, cy, R, r, n, rot = -Math.PI / 2) {
  for (let i = 0; i < n * 2; i++) {
    const rad = i % 2 ? r : R;
    const a = rot + (i * Math.PI) / n;
    const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}
// simple round-cap line
function stroke(ctx, col, w, pathFn) {
  ctx.beginPath();
  pathFn(ctx);
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.stroke();
}

// ------------------------------------------------------------- painters
// Each: (ctx, w, h) drawing inside [0..w] x [0..h]. Ground props sit on h.
export const PROP_PAINTERS = {
  // --- ground hazards ---------------------------------------------------
  shrub(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#7a4a24', u, (c) => rr(c, w * 0.42, h * 0.72, w * 0.16, h * 0.3, w * 0.05));
    // spiky red-orange bush: overlapping lobes with thorn tips
    shape(ctx, '#d84828', u, (c) => {
      const cx = w / 2, cy = h * 0.46, R = w * 0.46;
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 - Math.PI / 2;
        const rad = i % 2 ? R * 1.16 : R * 0.72;
        const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad * 0.85;
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.closePath();
    });
    plain(ctx, '#f8a048', (c) => c.ellipse(w * 0.38, h * 0.34, w * 0.13, h * 0.1, -0.4, 0, Math.PI * 2));
    plain(ctx, '#8a2018', (c) => c.ellipse(w * 0.63, h * 0.58, w * 0.12, h * 0.1, 0.3, 0, Math.PI * 2));
  },
  shrubBig(ctx, w, h) { PROP_PAINTERS.shrub(ctx, w, h); },
  crate(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#c89858', u, (c) => rr(c, w * 0.04, h * 0.06, w * 0.92, h * 0.88, w * 0.12));
    stroke(ctx, '#8a6432', Math.max(0.6, w * 0.07), (c) => {
      c.moveTo(w * 0.12, h * 0.16); c.lineTo(w * 0.88, h * 0.84);
      c.moveTo(w * 0.88, h * 0.16); c.lineTo(w * 0.12, h * 0.84);
    });
    stroke(ctx, '#5a4020', Math.max(0.5, w * 0.05), (c) => rr(c, w * 0.04, h * 0.06, w * 0.92, h * 0.88, w * 0.12));
  },
  qcrate(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#f6d33c', u, (c) => rr(c, w * 0.04, h * 0.06, w * 0.92, h * 0.88, w * 0.14));
    plain(ctx, '#8a6432', (c) => {
      // a chunky "?"
      c.arc(w * 0.5, h * 0.36, w * 0.19, Math.PI * 0.9, Math.PI * 0.25, false);
      c.lineTo(w * 0.5, h * 0.62);
      c.lineTo(w * 0.42, h * 0.62);
      c.closePath();
    });
    plain(ctx, '#8a6432', (c) => c.arc(w * 0.47, h * 0.76, w * 0.07, 0, Math.PI * 2));
  },
  pipe(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#2ea8a0', u, (c) => rr(c, w * 0.14, h * 0.22, w * 0.72, h * 0.8, w * 0.08)); // shaft
    shape(ctx, '#3ac0b6', u, (c) => rr(c, 0, 0, w, h * 0.26, w * 0.08));                     // lip
    stroke(ctx, 'rgba(255,255,255,0.35)', Math.max(0.5, w * 0.1), (c) => { c.moveTo(w * 0.3, h * 0.34); c.lineTo(w * 0.3, h * 0.92); });
  },
  switch(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#b8e0f8', u, (c) => rr(c, w * 0.1, h * 0.32, w * 0.8, h * 0.6, w * 0.16)); // frozen housing
    stroke(ctx, '#e04848', Math.max(0.6, w * 0.14), (c) => { c.moveTo(w * 0.5, h * 0.6); c.lineTo(w * 0.76, h * 0.16); });
    plain(ctx, '#f6d33c', (c) => c.arc(w * 0.76, h * 0.16, w * 0.14, 0, Math.PI * 2));
  },
  beatBar(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#e04898', u, (c) => rr(c, 0, 0, w, h, Math.min(w, h) * 0.3));
    plain(ctx, '#f890c8', (c) => rr(c, w * 0.14, h * 0.08, w * 0.72, h * 0.22, h * 0.1));
  },
  barrel(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#b07840', u, (c) => rr(c, w * 0.06, h * 0.04, w * 0.88, h * 0.92, w * 0.3));
    stroke(ctx, '#7a4c22', Math.max(0.6, h * 0.09), (c) => {
      c.moveTo(w * 0.1, h * 0.32); c.lineTo(w * 0.9, h * 0.32);
      c.moveTo(w * 0.1, h * 0.68); c.lineTo(w * 0.9, h * 0.68);
    });
    plain(ctx, '#d09858', (c) => c.ellipse(w * 0.34, h * 0.2, w * 0.1, h * 0.07, -0.5, 0, Math.PI * 2));
  },
  tombstone(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#9a9ab0', u, (c) => {
      c.moveTo(w * 0.12, h);
      c.lineTo(w * 0.12, h * 0.36);
      c.arc(w * 0.5, h * 0.36, w * 0.38, Math.PI, 0);
      c.lineTo(w * 0.88, h);
      c.closePath();
    });
    stroke(ctx, '#6a6a80', Math.max(0.5, w * 0.07), (c) => {
      c.moveTo(w * 0.5, h * 0.28); c.lineTo(w * 0.5, h * 0.66);
      c.moveTo(w * 0.32, h * 0.44); c.lineTo(w * 0.68, h * 0.44);
    });
  },
  cardboardMonster(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#c8a068', u, (c) => rr(c, w * 0.06, h * 0.12, w * 0.88, h * 0.86, w * 0.14));
    // googly eyes + jagged tape mouth
    plain(ctx, '#fff', (c) => { c.ellipse(w * 0.34, h * 0.4, w * 0.13, h * 0.16, 0, 0, Math.PI * 2); c.ellipse(w * 0.66, h * 0.4, w * 0.13, h * 0.16, 0, 0, Math.PI * 2); });
    plain(ctx, '#1a1028', (c) => { c.arc(w * 0.36, h * 0.43, w * 0.06, 0, Math.PI * 2); c.arc(w * 0.68, h * 0.43, w * 0.06, 0, Math.PI * 2); });
    stroke(ctx, '#8a6a3a', Math.max(0.5, w * 0.06), (c) => {
      c.moveTo(w * 0.28, h * 0.72); c.lineTo(w * 0.42, h * 0.62);
      c.lineTo(w * 0.56, h * 0.74); c.lineTo(w * 0.72, h * 0.64);
    });
  },
  chair(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#3a4a5a', u, (c) => rr(c, w * 0.1, h * 0.04, w * 0.28, h * 0.66, w * 0.08)); // back
    shape(ctx, '#4a5a6c', u, (c) => rr(c, w * 0.08, h * 0.52, w * 0.84, h * 0.22, w * 0.08)); // seat
    stroke(ctx, '#2a3542', Math.max(0.6, w * 0.07), (c) => { c.moveTo(w * 0.5, h * 0.72); c.lineTo(w * 0.5, h * 0.86); });
    plain(ctx, '#1a1028', (c) => { c.arc(w * 0.28, h * 0.92, w * 0.1, 0, Math.PI * 2); c.arc(w * 0.72, h * 0.92, w * 0.1, 0, Math.PI * 2); });
  },
  printer(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#b0b0c0', u, (c) => rr(c, w * 0.04, h * 0.3, w * 0.92, h * 0.66, w * 0.12));
    plain(ctx, '#fff', (c) => rr(c, w * 0.24, h * 0.02, w * 0.52, h * 0.34, w * 0.04)); // paper
    plain(ctx, '#e04848', (c) => rr(c, w * 0.14, h * 0.52, w * 0.24, h * 0.14, h * 0.06));
    plain(ctx, '#48e0c8', (c) => c.arc(w * 0.74, h * 0.6, w * 0.08, 0, Math.PI * 2));
  },
  zombieWalk(ctx, w, h) {
    const u = Math.max(w, h);
    // slouched green office zombie
    shape(ctx, '#5a6a8a', u, (c) => rr(c, w * 0.18, h * 0.42, w * 0.64, h * 0.42, w * 0.16));
    stroke(ctx, '#9ec89e', Math.max(0.7, w * 0.16), (c) => { c.moveTo(w * 0.2, h * 0.52); c.lineTo(w * 0.02, h * 0.44); });
    stroke(ctx, '#9ec89e', Math.max(0.7, w * 0.16), (c) => { c.moveTo(w * 0.3, h * 0.84); c.lineTo(w * 0.28, h); c.moveTo(w * 0.68, h * 0.84); c.lineTo(w * 0.7, h); });
    shape(ctx, '#9ec89e', u, (c) => c.arc(w * 0.5, h * 0.26, w * 0.3, 0, Math.PI * 2));
    plain(ctx, '#d83030', (c) => { c.arc(w * 0.4, h * 0.24, w * 0.06, 0, Math.PI * 2); c.arc(w * 0.62, h * 0.24, w * 0.06, 0, Math.PI * 2); });
    stroke(ctx, '#4a6a4a', Math.max(0.5, w * 0.06), (c) => { c.moveTo(w * 0.38, h * 0.4); c.lineTo(w * 0.64, h * 0.4); });
  },
  // --- flyers -----------------------------------------------------------
  drone(ctx, w, h) {
    const u = Math.max(w, h);
    stroke(ctx, 'rgba(200,200,216,0.75)', Math.max(0.5, h * 0.12), (c) => { c.moveTo(w * 0.06, h * 0.16); c.lineTo(w * 0.94, h * 0.16); });
    shape(ctx, '#8858c8', u, (c) => rr(c, w * 0.14, h * 0.3, w * 0.72, h * 0.56, h * 0.26));
    plain(ctx, '#f6d33c', (c) => c.arc(w * 0.36, h * 0.56, h * 0.14, 0, Math.PI * 2));
    plain(ctx, '#c8b8e8', (c) => rr(c, w * 0.56, h * 0.44, w * 0.22, h * 0.16, h * 0.06));
    stroke(ctx, '#5a3890', Math.max(0.5, h * 0.1), (c) => { c.moveTo(w * 0.28, h * 0.16); c.lineTo(w * 0.34, h * 0.32); c.moveTo(w * 0.72, h * 0.16); c.lineTo(w * 0.66, h * 0.32); });
  },
  shooterDrone(ctx, w, h) {
    PROP_PAINTERS.drone(ctx, w, h);
    plain(ctx, '#e04848', (c) => c.arc(w * 0.5, h * 0.86, Math.max(w, h) * 0.08, 0, Math.PI * 2)); // muzzle
  },
  buzzbird(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#f0a860', u, (c) => c.ellipse(w * 0.28, h * 0.42, w * 0.24, h * 0.34, -0.3, 0, Math.PI * 2)); // wing
    shape(ctx, '#d87830', u, (c) => c.ellipse(w * 0.58, h * 0.5, w * 0.34, h * 0.36, 0, 0, Math.PI * 2));
    plain(ctx, '#f6d33c', (c) => { c.moveTo(w * 0.9, h * 0.42); c.lineTo(w, h * 0.54); c.lineTo(w * 0.88, h * 0.62); c.closePath(); });
    plain(ctx, '#1a1028', (c) => c.arc(w * 0.74, h * 0.4, w * 0.06, 0, Math.PI * 2));
  },
  icicle(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#b8e0f8', u, (c) => {
      c.moveTo(w * 0.1, 0); c.lineTo(w * 0.9, 0); c.lineTo(w * 0.55, h); c.closePath();
    });
    plain(ctx, '#e8f8ff', (c) => { c.moveTo(w * 0.24, h * 0.06); c.lineTo(w * 0.44, h * 0.06); c.lineTo(w * 0.4, h * 0.62); c.closePath(); });
  },
  paperwork(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#f0f0f8', u, (c) => rr(c, w * 0.06, h * 0.1, w * 0.88, h * 0.8, w * 0.08));
    stroke(ctx, '#8a8a98', Math.max(0.5, h * 0.09), (c) => {
      c.moveTo(w * 0.2, h * 0.38); c.lineTo(w * 0.8, h * 0.38);
      c.moveTo(w * 0.2, h * 0.62); c.lineTo(w * 0.66, h * 0.62);
    });
  },
  // --- pickups ----------------------------------------------------------
  coin(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#f6d33c', u, (c) => c.ellipse(w / 2, h / 2, w * 0.44, h * 0.46, 0, 0, Math.PI * 2));
    plain(ctx, '#c8a020', (c) => c.ellipse(w / 2, h / 2, w * 0.26, h * 0.3, 0, 0, Math.PI * 2));
    plain(ctx, '#fff8c0', (c) => c.ellipse(w * 0.36, h * 0.3, w * 0.1, h * 0.12, -0.5, 0, Math.PI * 2));
  },
  battery(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#48c848', u, (c) => rr(c, w * 0.16, h * 0.14, w * 0.68, h * 0.82, w * 0.14));
    plain(ctx, '#2a8a2a', (c) => rr(c, w * 0.34, h * 0.02, w * 0.32, h * 0.14, w * 0.05));
    plain(ctx, '#eaffea', (c) => { c.moveTo(w * 0.56, h * 0.28); c.lineTo(w * 0.36, h * 0.56); c.lineTo(w * 0.5, h * 0.56); c.lineTo(w * 0.44, h * 0.86); c.lineTo(w * 0.66, h * 0.5); c.lineTo(w * 0.5, h * 0.5); c.closePath(); });
  },
  capShield(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#48a8f0', u, (c) => {
      c.moveTo(w * 0.5, h * 0.04);
      c.lineTo(w * 0.92, h * 0.24);
      c.quadraticCurveTo(w * 0.92, h * 0.8, w * 0.5, h * 0.98);
      c.quadraticCurveTo(w * 0.08, h * 0.8, w * 0.08, h * 0.24);
      c.closePath();
    });
    plain(ctx, '#d8f0ff', (c) => { c.moveTo(w * 0.5, h * 0.2); c.lineTo(w * 0.74, h * 0.32); c.quadraticCurveTo(w * 0.72, h * 0.66, w * 0.5, h * 0.78); c.closePath(); });
  },
  capMagnet(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#e04848', u, (c) => {
      c.arc(w * 0.5, h * 0.52, w * 0.4, Math.PI, 0);
      c.lineTo(w * 0.9, h * 0.76); c.lineTo(w * 0.62, h * 0.76);
      c.lineTo(w * 0.62, h * 0.52);
      c.arc(w * 0.5, h * 0.52, w * 0.12, 0, Math.PI, true);
      c.lineTo(w * 0.38, h * 0.76); c.lineTo(w * 0.1, h * 0.76);
      c.closePath();
    });
    plain(ctx, '#c8d8e8', (c) => { rr(c, w * 0.1, h * 0.76, w * 0.28, h * 0.2, w * 0.04); rr(c, w * 0.62, h * 0.76, w * 0.28, h * 0.2, w * 0.04); });
  },
  capStar(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#f6d33c', u, (c) => star(c, w / 2, h * 0.52, w * 0.48, w * 0.2, 5));
    plain(ctx, '#fff8c0', (c) => star(c, w / 2, h * 0.5, w * 0.22, w * 0.09, 5));
  },
  capSlow(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#c8b8e8', u, (c) => c.arc(w / 2, h / 2, w * 0.44, 0, Math.PI * 2));
    plain(ctx, '#3a2a5a', (c) => c.arc(w / 2, h / 2, w * 0.3, 0, Math.PI * 2));
    stroke(ctx, '#fff', Math.max(0.5, w * 0.08), (c) => { c.moveTo(w / 2, h / 2); c.lineTo(w / 2, h * 0.28); c.moveTo(w / 2, h / 2); c.lineTo(w * 0.7, h * 0.56); });
  },
  capUnpeel(ctx, w, h) {
    // the potato that cannot be peeled: humble spud, unreasonable aura
    const u = Math.max(w, h);
    stroke(ctx, '#e8e8f0', Math.max(0.5, w * 0.09), (c) => c.ellipse(w * 0.5, h * 0.5, w * 0.45, h * 0.45, 0, 0, Math.PI * 2));
    shape(ctx, '#c89058', u, (c) => c.ellipse(w * 0.5, h * 0.54, w * 0.34, h * 0.28, 0.3, 0, Math.PI * 2));
    plain(ctx, '#8a6038', (c) => {
      c.ellipse(w * 0.38, h * 0.46, w * 0.07, h * 0.06, 0, 0, Math.PI * 2);
      c.ellipse(w * 0.62, h * 0.62, w * 0.06, h * 0.05, 0, 0, Math.PI * 2);
    });
  },
  appliance(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#f6d33c', u, (c) => rr(c, w * 0.08, h * 0.22, w * 0.84, h * 0.72, w * 0.16));
    plain(ctx, '#8a6432', (c) => { rr(c, w * 0.24, h * 0.06, w * 0.16, h * 0.24, w * 0.03); rr(c, w * 0.58, h * 0.06, w * 0.16, h * 0.24, w * 0.03); }); // toast
    plain(ctx, '#c8a020', (c) => rr(c, w * 0.18, h * 0.62, w * 0.4, h * 0.1, h * 0.05));
    plain(ctx, '#fff8c0', (c) => c.ellipse(w * 0.26, h * 0.38, w * 0.08, h * 0.08, 0, 0, Math.PI * 2));
  },
  fuse(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#d8b088', u, (c) => rr(c, w * 0.14, h * 0.24, w * 0.72, h * 0.56, h * 0.2));
    plain(ctx, '#8a8a98', (c) => { rr(c, w * 0.02, h * 0.34, w * 0.16, h * 0.34, h * 0.06); rr(c, w * 0.82, h * 0.34, w * 0.16, h * 0.34, h * 0.06); });
    stroke(ctx, '#e04848', Math.max(0.5, h * 0.12), (c) => { c.moveTo(w * 0.28, h * 0.52); c.lineTo(w * 0.72, h * 0.52); });
  },
  boostPad(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#f6d33c', u, (c) => rr(c, 0, h * 0.1, w, h * 0.8, h * 0.35));
    plain(ctx, '#e07820', (c) => {
      for (let i = 0; i < 3; i++) {
        const x = w * (0.16 + i * 0.26);
        c.moveTo(x, h * 0.24); c.lineTo(x + w * 0.16, h * 0.5); c.lineTo(x, h * 0.76); c.closePath();
      }
    });
  },
  target(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#fff', u, (c) => c.arc(w / 2, h / 2, w * 0.46, 0, Math.PI * 2));
    plain(ctx, '#e04848', (c) => c.arc(w / 2, h / 2, w * 0.32, 0, Math.PI * 2));
    plain(ctx, '#fff', (c) => c.arc(w / 2, h / 2, w * 0.18, 0, Math.PI * 2));
    plain(ctx, '#e04848', (c) => c.arc(w / 2, h / 2, w * 0.08, 0, Math.PI * 2));
  },
  // --- scenery / villains ----------------------------------------------
  portal(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, 'rgba(72,224,200,0.28)', u, (c) => c.ellipse(w / 2, h / 2, w * 0.44, h * 0.48, 0, 0, Math.PI * 2));
    stroke(ctx, '#48e0c8', Math.max(0.7, w * 0.16), (c) => c.ellipse(w / 2, h / 2, w * 0.36, h * 0.42, 0, 0, Math.PI * 2));
    stroke(ctx, '#c8fff0', Math.max(0.5, w * 0.07), (c) => c.ellipse(w * 0.42, h * 0.4, w * 0.16, h * 0.2, -0.4, 0.6, 2.4));
  },
  eggshell(ctx, w, h) {
    const u = Math.max(w, h);
    // Don K. Eggshell: giant egg ape, red mustache, goggles, spiky shell
    shape(ctx, '#e8e0c8', u, (c) => c.ellipse(w * 0.5, h * 0.56, w * 0.34, h * 0.42, 0, 0, Math.PI * 2));
    shape(ctx, '#8a6a4a', u, (c) => { // shell back with spikes
      c.moveTo(w * 0.2, h * 0.7);
      for (let i = 0; i < 4; i++) {
        const x = w * (0.16 + i * 0.1);
        c.lineTo(x + w * 0.05, h * (0.34 - (i % 2) * 0.06));
        c.lineTo(x + w * 0.1, h * 0.62);
      }
      c.closePath();
    });
    plain(ctx, '#f2c9a0', (c) => c.ellipse(w * 0.56, h * 0.5, w * 0.2, h * 0.2, 0, 0, Math.PI * 2)); // face
    plain(ctx, '#c8e0f8', (c) => { c.ellipse(w * 0.5, h * 0.44, w * 0.07, h * 0.07, 0, 0, Math.PI * 2); c.ellipse(w * 0.64, h * 0.44, w * 0.07, h * 0.07, 0, 0, Math.PI * 2); });
    plain(ctx, '#1a1028', (c) => { c.arc(w * 0.5, h * 0.44, w * 0.03, 0, Math.PI * 2); c.arc(w * 0.64, h * 0.44, w * 0.03, 0, Math.PI * 2); });
    plain(ctx, '#c83030', (c) => { // magnificent mustache
      c.moveTo(w * 0.42, h * 0.58);
      c.quadraticCurveTo(w * 0.57, h * 0.5, w * 0.74, h * 0.58);
      c.quadraticCurveTo(w * 0.58, h * 0.68, w * 0.42, h * 0.58);
      c.closePath();
    });
  },
  dustdevil(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#c83030', u, (c) => rr(c, w * 0.16, h * 0.28, w * 0.68, h * 0.54, w * 0.2));
    plain(ctx, '#8a1c1c', (c) => rr(c, w * 0.3, h * 0.82, w * 0.4, h * 0.16, w * 0.06)); // nozzle
    plain(ctx, '#c8d8e8', (c) => c.ellipse(w * 0.5, h * 0.48, w * 0.16, h * 0.16, 0, 0, Math.PI * 2)); // dust window
    plain(ctx, '#8a8a98', (c) => c.ellipse(w * 0.5, h * 0.48, w * 0.07, h * 0.07, 0, 0, Math.PI * 2));
    stroke(ctx, '#3a3a48', Math.max(0.5, w * 0.06), (c) => { c.moveTo(w * 0.74, h * 0.34); c.quadraticCurveTo(w * 0.96, h * 0.16, w * 0.86, h * 0.02); });
  },
  goldTrophy(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#f6d33c', u, (c) => {
      c.moveTo(w * 0.24, h * 0.08); c.lineTo(w * 0.76, h * 0.08);
      c.quadraticCurveTo(w * 0.72, h * 0.56, w * 0.5, h * 0.6);
      c.quadraticCurveTo(w * 0.28, h * 0.56, w * 0.24, h * 0.08);
      c.closePath();
    });
    plain(ctx, '#c8a020', (c) => { rr(c, w * 0.42, h * 0.58, w * 0.16, h * 0.22, w * 0.03); rr(c, w * 0.26, h * 0.8, w * 0.48, h * 0.16, w * 0.05); });
  },
};

// ------------------------------------------------------------- cache
const cache = new Map();
const SS = 8; // supersample factor for the offscreen rasterization

export function hasProp(name) { return !!PROP_PAINTERS[name]; }

// Cached vector prop rasterized at SS x its logical size.
export function propSprite(name, w, h) {
  const key = `${name}|${w}x${h}`;
  if (cache.has(key)) return cache.get(key);
  const paint = PROP_PAINTERS[name];
  if (!paint) return null;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * SS));
  c.height = Math.max(1, Math.round(h * SS));
  const x = c.getContext('2d');
  x.scale(SS, SS);
  x.lineJoin = 'round';
  x.lineCap = 'round';
  paint(x, w, h);
  cache.set(key, c);
  return c;
}

// Flat silhouette of a prop in one color — used for hazard rim outlines.
export function propTinted(name, w, h, color) {
  const key = `${name}|${w}x${h}|${color}`;
  if (cache.has(key)) return cache.get(key);
  const src = propSprite(name, w, h);
  if (!src) return null;
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  cache.set(key, c);
  return c;
}

// Union of two offset silhouettes in one cached canvas — the hazard rim
// becomes a single drawImage per color instead of two.
export function propRimPair(name, w, h, color, axis) {
  const key = `${name}|${w}x${h}|rim|${color}|${axis}`;
  if (cache.has(key)) return cache.get(key);
  const sil = propTinted(name, w, h, color);
  if (!sil) return null;
  const c = document.createElement('canvas');
  c.width = sil.width + 2 * SS;
  c.height = sil.height + 2 * SS;
  const x = c.getContext('2d');
  const [dx, dy] = axis === 'x' ? [SS, 0] : [0, SS];
  x.drawImage(sil, SS - dx, SS - dy);
  x.drawImage(sil, SS + dx, SS + dy);
  cache.set(key, c);
  return c;
}

// Soft radial glow (for power capsules and other shiny things) — cached.
export function glowSprite(color, r = 16) {
  const key = `glow|${color}|${r}`;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = r * 2 * 4;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(r * 4, r * 4, r, r * 4, r * 4, r * 4);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, c.width, c.height);
  cache.set(key, c);
  return c;
}

// A soft 4-point sparkle (for coin twinkles and anything shiny) — cached.
export function sparkSprite(color) {
  const key = `spark|${color}`;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  x.translate(32, 32);
  x.fillStyle = color;
  for (const rot of [0, Math.PI / 2]) {
    x.save();
    x.rotate(rot);
    x.beginPath();
    x.moveTo(-30, 0);
    x.quadraticCurveTo(0, -5, 30, 0);
    x.quadraticCurveTo(0, 5, -30, 0);
    x.closePath();
    x.globalAlpha = 0.9;
    x.fill();
    x.restore();
  }
  x.globalAlpha = 1;
  x.beginPath();
  x.arc(0, 0, 5, 0, Math.PI * 2);
  x.fill();
  cache.set(key, c);
  return c;
}

// Convenience: draw a vector prop smoothly into a logical-coordinate box.
export function drawProp(ctx, name, x, y, w, h) {
  const spr = propSprite(name, w, h);
  if (!spr) return false;
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(spr, x, y, w, h);
  ctx.imageSmoothingEnabled = prev;
  return true;
}
