// CORPORATE KOMBAT style bake-off — BLOCKOUT. Not a candidate: the plan drawn in flat
// grey blocks, so the composition, the parallax and every animated part can be checked
// before any style paints over it. It is also the worked example of reading an
// officeFrame(): every field a style is handed is used here once, in painting order.
const TAU = Math.PI * 2;

const SKY = {
  morning: ['#9cc4e4', '#dfeaf2'],
  noon: ['#6fa8dc', '#cfe2f3'],
  dusk: ['#2c2a5a', '#f2a65a'],
};

function rect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

function outside(ctx, f) {
  const O = f.outside;
  const [top, low] = SKY[O.time];
  const g = ctx.createLinearGradient(0, f.glass.top, 0, f.glass.bottom);
  g.addColorStop(0, top); g.addColorStop(1, low);
  rect(ctx, 0, 0, f.W, f.H, g);
  for (const s of O.stars) rect(ctx, s.x, s.y, s.s, s.s, `rgba(255,255,255,${0.7 * s.twinkle})`);
  if (O.sun) { ctx.fillStyle = O.time === 'dusk' ? '#ffb347' : '#fff6d0'; ctx.beginPath(); ctx.arc(O.sun.x, O.sun.y, O.sun.r, 0, TAU); ctx.fill(); }
  for (const b of O.far) rect(ctx, b.x, b.top, b.w, b.base - b.top, ['#a9b4c2', '#9aa6b6', '#b6bfcb'][b.tone]);
  for (const c of O.clouds) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(c.x + c.w / 2, c.y, c.w / 2, c.h / 2, 0, 0, TAU); ctx.fill(); }
  if (O.street) {
    rect(ctx, 0, O.street.far - 4, f.W, 4, '#b8b2a6');
    rect(ctx, 0, O.street.far, f.W, O.street.near - O.street.far, '#555');
    rect(ctx, 0, O.street.near, f.W, f.wallBase - O.street.near, '#b8b2a6');
  }
  for (const b of O.near) {
    rect(ctx, b.x, b.top, b.w, b.base - b.top, ['#7d8796', '#6e7888', '#8a93a0'][b.tone]);
    if (b.roof === 'tank') rect(ctx, b.x + b.w * 0.3, b.top - 12, 10, 12, '#6b5a48');
    if (b.roof === 'billboard') rect(ctx, b.x + 8, b.top - 18, b.w - 16, 14, '#e8d36a');
    if (b.roof === 'spire') { ctx.fillStyle = '#7d8796'; ctx.beginPath(); ctx.moveTo(b.x + b.w * 0.3, b.top); ctx.lineTo(b.x + b.w / 2, b.top - 30); ctx.lineTo(b.x + b.w * 0.7, b.top); ctx.fill(); }
    for (let r = 0, y = b.top + 4; y < b.base - 4; r++, y += b.floorH) {
      for (let c = 0; c < b.cols; c++) {
        const lit = ((b.i * 13 + r * 7 + c * 3) % 10) / 10 < b.lit;
        rect(ctx, b.x + 2 + c * (b.w - 4) / b.cols, y, Math.max(1, (b.w - 4) / b.cols - 2), b.floorH * 0.5, lit ? '#ffd27a' : 'rgba(30,40,60,0.35)');
      }
    }
    if (b.shop != null) rect(ctx, b.x + 2, b.base - 16, b.w - 4, 5, ['#c0392b', '#2e8b57', '#2c5d9e', '#d4a017'][b.shop]);
  }
  for (const l of O.cityLights) rect(ctx, l.x, l.y, l.s, l.s, `rgba(255,214,140,${l.a})`);
  for (const tr of O.trees) { ctx.fillStyle = '#4f7a4a'; ctx.beginPath(); ctx.arc(tr.x, tr.y - 26 * tr.s, 12 * tr.s, 0, TAU); ctx.fill(); rect(ctx, tr.x - 1, tr.y - 16 * tr.s, 2, 16 * tr.s, '#5b4632'); }
  for (const l of O.lamps) rect(ctx, l.x, l.y - 44, 2, 44, '#333');
  for (const c of O.cars) rect(ctx, c.x, c.y - (c.kind === 'bus' ? 22 : 12), c.w, c.kind === 'bus' ? 22 : 12, c.kind === 'cab' ? '#f2c230' : c.kind === 'bus' ? '#c0392b' : '#3b6ea5');
  if (O.flyer) {
    const fl = O.flyer;
    if (fl.kind === 'blimp') { ctx.fillStyle = '#c9c9c9'; ctx.beginPath(); ctx.ellipse(fl.x, fl.y, 30, 10, 0, 0, TAU); ctx.fill(); }
    if (fl.kind === 'heli') { rect(ctx, fl.x - 10, fl.y - 4, 20, 8, '#333'); rect(ctx, fl.x - 14 * Math.cos(fl.phase * TAU), fl.y - 7, 28 * Math.abs(Math.cos(fl.phase * TAU)), 1, '#333'); }
    if (fl.kind === 'birds') for (let k = 0; k < 4; k++) rect(ctx, fl.x + k * 9, fl.y + (k % 2) * 4, 4, 1, '#333');
  }
}

function glassBay(ctx, f, b) {
  const G = f.glass;
  ctx.strokeStyle = '#3a3f48'; ctx.lineWidth = 2;
  for (let x = b.x0; x <= b.x1 + 0.5; x += G.mullion) { ctx.beginPath(); ctx.moveTo(x, G.top); ctx.lineTo(x, G.bottom); ctx.stroke(); }
  ctx.strokeRect(b.x0, G.top, b.x1 - b.x0, G.bottom - G.top);
  if (G.transom) { ctx.beginPath(); ctx.moveTo(b.x0, G.transom); ctx.lineTo(b.x1, G.transom); ctx.stroke(); }
  if (b.blinds > 0) {
    ctx.fillStyle = 'rgba(220,220,210,0.9)';
    const h = (G.bottom - G.top) * b.blinds;
    for (let y = G.top; y < G.top + h; y += 3) ctx.fillRect(b.x0, y, b.x1 - b.x0, 2);
  }
  if (b.revolvingDoor != null) {
    const x = b.revolvingDoor;
    rect(ctx, x - 22, G.transom, 44, G.bottom - G.transom, 'rgba(60,70,80,0.25)');
    for (let k = 0; k < 2; k++) { const a = (f.revolving + k / 4) * Math.PI; rect(ctx, x + Math.cos(a) * 20 - 1, G.transom + 4, 2, G.bottom - G.transom - 4, '#3a3f48'); }
  }
  if (G.variant === 'ribbon') rect(ctx, b.x0, G.bottom, b.x1 - b.x0, f.wallBase - G.bottom, '#cfcac0');
}

function hang(ctx, f, h) {
  switch (h.kind) {
    case 'lift': {
      rect(ctx, h.x - 3, h.y - 3, h.w + 6, h.h + 3, '#8a8f98');
      rect(ctx, h.x, h.y, h.w, h.h, '#ffe9a8');
      const gap = h.open * h.w / 2;
      rect(ctx, h.x, h.y, h.w / 2 - gap, h.h, '#b8bcc4');
      rect(ctx, h.x + h.w / 2 + gap, h.y, h.w / 2 - gap, h.h, '#b8bcc4');
      rect(ctx, h.x + h.w / 2 - 7, h.y - 14, 14, 9, '#222');
      ctx.fillStyle = '#ff9a3c'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center'; ctx.fillText(h.label, h.x + h.w / 2, h.y - 7);
      break;
    }
    case 'clock': {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(h.cx, h.cy, h.r, 0, TAU); ctx.fill(); ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5; ctx.stroke();
      const hand = (a, l, w) => { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(h.cx, h.cy); ctx.lineTo(h.cx + Math.sin(a) * l, h.cy - Math.cos(a) * l); ctx.stroke(); };
      hand(f.clock.hourA, h.r * 0.5, 1.6); hand(f.clock.minuteA, h.r * 0.8, 1.1);
      ctx.strokeStyle = '#c0392b'; hand(f.clock.secondA, h.r * 0.85, 0.6);
      break;
    }
    default: {
      rect(ctx, h.x, h.y, h.w, h.h, { logo: '#2c3e50', poster: '#e8dcc0', whiteboard: '#fafafa', painting: '#a0522d', portrait: '#c9a227', door: '#8b6b4a', extinguisher: '#c0392b', trophyCase: '#6b4a2e', bookshelf: '#5a3d26' }[h.kind] || '#999');
      if (h.label) {
        ctx.fillStyle = h.kind === 'logo' ? '#fff' : '#222'; ctx.textAlign = 'center';
        ctx.font = `bold ${h.kind === 'logo' ? 20 : 5}px sans-serif`;
        ctx.fillText(h.label, h.x + h.w / 2, h.y + (h.kind === 'logo' ? h.h / 2 + 7 : 8));
      }
    }
  }
}

function mid(ctx, f, m) {
  const b = m.base;
  switch (m.kind) {
    case 'cubicles':
      for (const d of m.desks) {
        if (d.occupied) {
          const y = b - 34 - 8 + d.dy - d.pop * 12;
          ctx.fillStyle = '#7a5a44'; ctx.beginPath(); ctx.arc(d.x + 20, y, 5, 0, TAU); ctx.fill();
          if (d.pop) rect(ctx, d.x + 13, y + 5, 14, 10, '#4a6fa5');
        }
        rect(ctx, d.x, b - 34, d.w - 1, 34, '#8e98a8');
        rect(ctx, d.x, b - 34, d.w - 1, 2, '#6c7686');
      }
      break;
    case 'boardroom':
      for (const c of m.chairs) {
        rect(ctx, c.x - 7, b - 46, 14, 46, '#3a2a20');
        if (c.sitter) { ctx.fillStyle = '#c99a72'; ctx.beginPath(); ctx.arc(c.x, b - 40 + c.nod * 4, 5, 0, TAU); ctx.fill(); }
      }
      rect(ctx, m.x0, b - 26, m.x1 - m.x0, 5, '#5a3a22');
      rect(ctx, m.x0 + 10, b - 21, 4, 21, '#5a3a22'); rect(ctx, m.x1 - 14, b - 21, 4, 21, '#5a3a22');
      if (m.easel) rect(ctx, m.x1 + 6, b - 50, 24, 30, '#fafafa');
      break;
    default: {
      const S = { reception: [m.w, 34], turnstiles: [m.w, 26], sofa: [m.w, 26], sculpture: [40, 60], plant: { ficus: [30, 60], palm: [40, 70], snake: [16, 34], bonsai: [18, 38] }[m.variant] || [30, 60], cooler: [14, 44], copier: [m.w, 30], cabinet: [20, 44], desk: [m.w, 30], globe: [18, 34], tallclock: [20, 70] }[m.kind] || [20, 20];
      const [w, h] = S;
      rect(ctx, m.x, b - h, w, h, m.kind === 'plant' ? '#4f7a4a' : '#6c6a66');
      if (m.kind === 'cooler' && m.bubble >= 0) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(m.x + 7, b - 30 - m.bubble * 12, 2, 0, TAU); ctx.fill(); }
      if (m.kind === 'copier' && m.scan >= 0) rect(ctx, m.x + 2 + m.scan * (w - 6), b - h, 2, 3, '#7fffd4');
      if (m.kind === 'tallclock') rect(ctx, m.x + 9 + m.swing * 4, b - 30, 2, 14, '#c9a227');
    }
  }
}

function floorAndSlab(ctx, f) {
  const P = f.floorPlane;
  rect(ctx, 0, P.top, f.W, P.bottom - P.top, { marble: '#d8d2c8', carpet: '#6d7a8c', parquet: '#9a6a3e' }[P.variant]);
  // Shearing joints: one per 32 px of the lane's own distance.
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
  const k = P.shiftTop / P.shiftBottom || 0.24;
  for (let u = Math.floor(P.shiftBottom / 32) * 32 - 64; u < P.shiftBottom + f.W + 600; u += 32) {
    const xb = u - P.shiftBottom;
    const xt = u * k - P.shiftTop;
    ctx.beginPath(); ctx.moveTo(xt, P.top); ctx.lineTo(xb, P.bottom); ctx.stroke();
  }
  const S = f.slab;
  rect(ctx, 0, S.top, f.W, f.H - S.top, '#5e5a56');
  rect(ctx, 0, S.top, f.W, 3, '#3e3a36');
}

export const STYLE = {
  id: 'blockout',
  name: 'BLOCKOUT — the plan in flat blocks (not a candidate)',
  note: 'The shared composition in grey blocks, to check the layout, the parallax and the moving parts before any style paints it.',
  paint(ctx, f) {
    // 1. outside, then the wall on top with the glass bays left open
    outside(ctx, f);
    const wallC = { lobby: '#cdc6b8', open: '#e4e0d6', exec: '#7a5236' }[f.floor];
    for (const b of f.wall.bays) {
      if (b.type === 'wall') rect(ctx, b.x0, f.ceilingY, b.x1 - b.x0, f.wallBase - f.ceilingY, wallC);
      else {
        // above and below the glass is wall too
        rect(ctx, b.x0, f.ceilingY, b.x1 - b.x0, f.glass.top - f.ceilingY, wallC);
        rect(ctx, b.x0, f.glass.bottom, b.x1 - b.x0, f.wallBase - f.glass.bottom, wallC);
      }
    }
    if (f.wall.cradle) {
      const c = f.wall.cradle;
      // drawn before the mullions would be more correct; it is outside the glass
      rect(ctx, c.x, c.y, c.w, 8, '#555');
      rect(ctx, c.x + 4, 0, 1, c.y, '#333'); rect(ctx, c.x + c.w - 5, 0, 1, c.y, '#333');
      rect(ctx, c.x + 20 + c.swipe * 10, c.y - 14, 4, 14, '#2c5d9e');
    }
    for (const b of f.wall.bays) if (b.type === 'glass') glassBay(ctx, f, b);
    for (const c of f.wall.columns) rect(ctx, c.x, f.ceilingY, c.w, f.wallBase - f.ceilingY, '#9a958c');
    for (const h of f.wall.hangs) hang(ctx, f, h);
    // 2. ceiling and lights
    rect(ctx, 0, 0, f.W, f.ceilingY, '#bdb8ae');
    for (const l of f.lights) {
      if (l.variant === 'tube') rect(ctx, l.x - 22, f.ceilingY - 4, 44, 4, l.on > 0.5 ? '#fffbe6' : '#888');
      else {
        rect(ctx, l.x, f.ceilingY, 1, l.y - f.ceilingY, '#333');
        ctx.fillStyle = l.variant === 'globe' ? '#fffbe6' : '#2e5e3e'; ctx.beginPath(); ctx.arc(l.x, l.y, 6, 0, TAU); ctx.fill();
      }
    }
    // 3. floor plane and slab, then the furniture standing on it
    floorAndSlab(ctx, f);
    for (const m of f.mid.items) mid(ctx, f, m);
  },
  paintFront(ctx, f) {
    for (const it of f.front) {
      ctx.fillStyle = 'rgba(30,30,36,0.55)';
      if (it.kind === 'pillar') ctx.fillRect(it.x, 0, it.w, f.H);
      else { ctx.beginPath(); ctx.ellipse(it.x, f.H + 6, 40, 34, 0, 0, TAU); ctx.fill(); }
    }
  },
};
