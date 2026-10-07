// THE BOLT'S ATTRACT BAKE-OFF — how the Lab club's reroll button gets itself noticed (Peter,
// 7 Oct 2026: "a little attraction effect on the lightning icon to attract attention ... Button
// should fade in if dimmed and a glisten or do something so user notice it. Icon may need to
// change"). Every look fades the button up for the moment (club.js, boltAttractAlpha); what it
// does with the moment is the candidate:
//
//   A GLINT        a shine sweeps across the disc, and a star twinkles on the bolt's tip
//   B CHARGE       the bolt fills with gold from its point up, then flashes and throws sparks
//   C PING         two rings go out from the rim, one on each of the first two beats
//   D JIGGLE       the button hops and wobbles on each of three beats
//   E CRACKLE      little arcs crackle round the rim and the bolt flickers
//   F SPIN ARROW   a new icon: the bolt inside a reroll arrow, which spins once round it
//   G GOLD         the bolt turns gold on a soft glow, pulsing on the beat
//
// Each `paint(ctx, o)` draws the whole button (bolt-button.js `o`); `k` -1 is the button at rest,
// as every look but F draws it today.
//
// SETTLED 7 Oct 2026 on A, the glint ("A is my favourite"), once a visit near the start "once
// things settle" — bolt-button.js drawBoltButton. The rest stay here for the gallery.

import { boltDisc, boltPath, drawBoltPlain, drawBoltButton } from '../game/banger/bolt-button.js';

const TAU = Math.PI * 2;
const GOLD = '#ffd54a', GOLD_HI = '#fff3c0';
const live = (k, a, b) => k >= a && k < b;
const ease = (v) => 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, v)));
/** How far into its beat the moment is (k runs over four beats). */
const beatIn = (k) => (k * 4) % 1;

function star(ctx, x, y, s) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, d = i % 2 ? s * 0.22 : s;
    ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  ctx.closePath(); ctx.fill();
}

const glint = drawBoltButton;   // A shipped: bolt-button.js draws it

const charge = (ctx, o) => {
  const { x, y, r, k, alpha, beat } = o;
  boltDisc(ctx, o);
  ctx.fillStyle = o.ink; boltPath(ctx, x, y, r); ctx.fill();
  if (k >= 0) {
    // the gold rises from the point (bottom) to the top over the first two beats
    const fill = ease(k / 0.5), top = y + r * 0.64 - fill * r * 1.28;
    ctx.save(); ctx.beginPath(); ctx.rect(x - r, top, r * 2, r * 2); ctx.clip();
    ctx.globalAlpha = alpha * Math.min(1, (1 - k) / 0.25);           // ...and drains back to silver at the end
    ctx.fillStyle = GOLD; boltPath(ctx, x, y, r); ctx.fill();
    ctx.restore();
    // full: a flash and sparks thrown off the disc
    if (k >= 0.5) {
      const f = (k - 0.5) / 0.5;
      ctx.save();
      ctx.globalAlpha = alpha * (1 - f);
      const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 2);
      g.addColorStop(0, 'rgba(255,230,140,0.7)'); g.addColorStop(1, 'rgba(255,230,140,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2, 0, TAU); ctx.fill();
      ctx.strokeStyle = GOLD_HI; ctx.lineWidth = r * 0.09; ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * TAU + 0.3, d0 = r * (1.05 + f * 0.9), d1 = d0 + r * 0.3 * (1 - f);
        ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * d0, y + Math.sin(a) * d0); ctx.lineTo(x + Math.cos(a) * d1, y + Math.sin(a) * d1); ctx.stroke();
      }
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
};

const ping = (ctx, o) => {
  const { x, y, r, k, alpha, u } = o;
  drawBoltPlain(ctx, k >= 0 ? { ...o, rim: '#f2f3fa' } : o);
  if (k < 0) return;
  ctx.save();
  for (const at of [0, 0.25]) {
    const f = (k - at) / 0.5;
    if (f < 0 || f > 1) continue;
    ctx.globalAlpha = alpha * (1 - f) * 0.9;
    ctx.strokeStyle = '#eceef4'; ctx.lineWidth = (1.4 - f) * u;
    ctx.beginPath(); ctx.arc(x, y, r * (1 + f * 1.1), 0, TAU); ctx.stroke();
  }
  ctx.restore();
};

const jiggle = (ctx, o) => {
  const { x, y, k } = o;
  if (!live(k, 0, 0.75)) { drawBoltPlain(ctx, o); return; }
  const p = beatIn(k), fall = Math.exp(-p * 5);
  const s = 1 + 0.2 * fall, a = 0.28 * Math.sin(p * Math.PI * 3) * fall;
  ctx.save();
  ctx.translate(x, y - o.r * 0.18 * Math.sin(Math.PI * Math.min(1, p * 2.5))); ctx.rotate(a); ctx.scale(s, s);
  drawBoltPlain(ctx, { ...o, x: 0, y: 0 });
  ctx.restore();
};

/** A cheap, repeatable random: the crackle changes every frame-ish, the same at the same moment. */
const hash = (n) => { const v = Math.sin(n * 127.1) * 43758.5453; return v - Math.floor(v); };

const crackle = (ctx, o) => {
  const { x, y, r, k, alpha, t, u } = o;
  const flick = k >= 0 && live(k, 0, 0.8) ? hash(Math.floor(t * 24)) : 0;
  drawBoltPlain(ctx, flick > 0.5 ? { ...o, ink: '#ffffff', rim: '#e6d6ff' } : o);
  if (!live(k, 0, 0.8)) return;
  const frame = Math.floor(t * 18);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#e6d6ff'; ctx.lineWidth = 0.8 * u; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.shadowColor = '#c9a0ff'; ctx.shadowBlur = r * 0.4;
  for (let i = 0; i < 3; i++) {
    const a = hash(frame * 3 + i) * TAU, len = r * (0.5 + 0.4 * hash(frame * 7 + i));
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    for (let j = 1; j <= 4; j++) {
      const d = r + len * j / 4, wob = (hash(frame * 11 + i * 5 + j) - 0.5) * 0.6;
      ctx.lineTo(x + Math.cos(a + wob * 0.5) * d, y + Math.sin(a + wob * 0.5) * d);
    }
    ctx.stroke();
  }
  ctx.restore();
};

const spinArrow = (ctx, o) => {
  const { x, y, r, k, alpha, u } = o;
  boltDisc(ctx, o);
  // the reroll arrow: three quarters of a circle and its head, spinning once through the moment
  const spin = k >= 0 ? ease(k / 0.6) * TAU : 0;
  const R = r * 0.64, a0 = -Math.PI * 0.35 + spin, a1 = a0 + Math.PI * 1.55;
  ctx.strokeStyle = o.ink; ctx.fillStyle = o.ink; ctx.lineWidth = 1.1 * u; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y, R, a0, a1); ctx.stroke();
  const hx = x + Math.cos(a1) * R, hy = y + Math.sin(a1) * R, ta = a1 + Math.PI / 2, h = r * 0.24;
  ctx.beginPath();
  ctx.moveTo(hx + Math.cos(ta) * h, hy + Math.sin(ta) * h);
  ctx.lineTo(hx + Math.cos(ta + 2.3) * h * 0.85, hy + Math.sin(ta + 2.3) * h * 0.85);
  ctx.lineTo(hx + Math.cos(ta - 2.3) * h * 0.85, hy + Math.sin(ta - 2.3) * h * 0.85);
  ctx.closePath(); ctx.fill();
  // the bolt inside, a little smaller, white at the end of the spin
  const lit = k >= 0.5 && k < 0.85 ? Math.sin(Math.PI * (k - 0.5) / 0.35) : 0;
  ctx.fillStyle = lit > 0.3 ? '#ffffff' : o.ink;
  boltPath(ctx, x, y, r * 0.62); ctx.fill();
  if (lit > 0) { ctx.save(); ctx.globalAlpha = alpha * lit; ctx.fillStyle = '#ffffff'; star(ctx, x + r * 0.12, y - r * 0.38, r * 0.34 * lit); ctx.restore(); }
  ctx.globalAlpha = 1;
};

const gold = (ctx, o) => {
  const { x, y, r, k, alpha, beat } = o;
  if (k < 0) { drawBoltPlain(ctx, o); return; }
  const env = Math.min(1, k / 0.1, (1 - k) / 0.25), pulse = Math.exp(-(((beat % 1) + 1) % 1) * 4);
  ctx.save();
  ctx.globalAlpha = alpha * env * (0.45 + 0.4 * pulse);
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.7);
  g.addColorStop(0, 'rgba(255,213,74,0.8)'); g.addColorStop(0.55, 'rgba(255,213,74,0.25)'); g.addColorStop(1, 'rgba(255,213,74,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.7, 0, TAU); ctx.fill();
  ctx.restore();
  boltDisc(ctx, { ...o, rim: env > 0.5 ? GOLD : o.rim });
  ctx.fillStyle = o.ink; boltPath(ctx, x, y, r); ctx.fill();
  ctx.globalAlpha = alpha * env;
  const s = 1 + 0.12 * pulse;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = GOLD; boltPath(ctx, 0, 0, r); ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
};

export const BOLT_ATTRACT_CANDIDATES = Object.freeze([
  { letter: 'A', name: 'GLINT', paint: glint, description: 'A shine sweeps across the disc, top left to bottom right, and a star twinkles on the bolt’s tip as it passes.' },
  { letter: 'B', name: 'CHARGE', paint: charge, description: 'The bolt fills with gold from its point up over two beats, then flashes and throws sparks off the disc.' },
  { letter: 'C', name: 'PING', paint: ping, description: 'The rim lights and two rings go out from it, one on each of the first two beats.' },
  { letter: 'D', name: 'JIGGLE', paint: jiggle, description: 'The button hops and wobbles on each of three beats, like an app icon asking to be pressed.' },
  { letter: 'E', name: 'CRACKLE', paint: crackle, description: 'Little lilac arcs crackle off the rim and the bolt flickers white, the Tesla coil’s.' },
  { letter: 'F', name: 'SPIN ARROW', paint: spinArrow, description: 'A new icon: the bolt inside a reroll arrow. In the moment the arrow spins once round it and the bolt sparkles.' },
  { letter: 'G', name: 'GOLD', paint: gold, description: 'The bolt turns gold on a soft gold glow, the rim gold too, pulsing on each beat.' },
]);
