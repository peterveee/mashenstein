// THE DEEP BLUE DISCO'S MERMAIDS — the little mermaids who swim through the jukebox's DEEP BLUE DISCO now and
// then (visualisers.js FishTank). 7 Oct 2026.
//
// From the mermaid bake-off (lab gallery `mermaid-bakeoff`, src/dev/mermaid-candidates.js), after
// Peter's reference: a chibi mermaid front on, a big head of curling hair, dot eyes and a blush, a
// bandeau, a slim body and a tail that sweeps round behind her into a big fin, scaled on its lower
// part. Peter, 7 Oct 2026: "i would like to use a b c e to swim through once in a while" — so these
// are A SKY BLUE, B SUNNY, C SONGBIRD and E CLUB KID; the rest stay in the bake-off.
//
// The fairy tale's mermaid, not anybody's film's. Front on for the whole of her appearance, she
// drifts straight across the tank with her tail sweeping out behind her and her fin flipping every
// two beats, so she never has to turn round. Each is { letter, name, description, paint(ctx, paper,
// L, o) }: drawn travelling right with her hips at the origin, `L` from the top of her hair to the
// bottom of her tail's curve, through the tank's own paper (visualisers.js tankPaper), so she is
// cut from the same stuff as the fish. `o` is { t, beat, phase }.

const TAU = Math.PI * 2;
const INK = '#1b1428';

/**
 * A smooth ribbon down a spine of points, `half[i]` its half-width at each: a tail, a tentacle, an
 * arm. Its edges run through the midpoints of the offset points, so a few points make a curve.
 */
export function ribbon(ctx, pts, half) {
  const side = (s) => pts.map(([x, y], i) => {
    const [ax, ay] = pts[Math.max(0, i - 1)], [bx, by] = pts[Math.min(pts.length - 1, i + 1)];
    const dx = bx - ax, dy = by - ay, n = Math.hypot(dx, dy) || 1;
    return [x - (dy / n) * half[i] * s, y + (dx / n) * half[i] * s];
  });
  const curve = (q, first) => {
    if (first) ctx.moveTo(...q[0]); else ctx.lineTo(...q[0]);
    for (let i = 1; i < q.length - 1; i++) ctx.quadraticCurveTo(q[i][0], q[i][1], (q[i][0] + q[i + 1][0]) / 2, (q[i][1] + q[i + 1][1]) / 2);
    ctx.lineTo(...q[q.length - 1]);
  };
  curve(side(1), true);
  curve(side(-1).reverse(), false);
  ctx.closePath();
}

/** `c` lighter (k > 0, towards white) or darker (k < 0). */
export function tone(c, k) {
  const n = parseInt(c.slice(1), 16);
  const m = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)));
  return `#${m.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** A curl of hair: a disc with a spiral cut into it, `r` across. */
function curl(ctx, paper, col, x, y, r, turn) {
  paper.piece(col, () => ctx.arc(x, y, r, 0, TAU), 0.5);
  ctx.strokeStyle = tone(col, -0.25);
  ctx.lineWidth = r * 0.16;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let k = 0; k <= 24; k++) {
    const a = turn + k * 0.42, rr = r * (0.75 - k * 0.026);
    ctx[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.stroke();
}

/**
 * The head every candidate has, front on: big, round, a dot eye each side with its lashes, a blush
 * on each cheek, a smile (or, singing, an open mouth).
 */
function face(ctx, paper, u, look, [hx, hy], R, o) {
  paper.piece(look.skin, () => { for (const s of [-1, 1]) { ctx.moveTo(hx + s * R * 0.98 + 2.6 * u, hy + 2 * u); ctx.arc(hx + s * R * 0.98, hy + 2 * u, 2.6 * u, 0, TAU); } }, 0.3);
  paper.piece(look.skin, () => ctx.ellipse(hx, hy, R, R * 0.94, 0, 0, TAU), 0.8, true);
  for (const s of [-1, 1]) {
    const ex = hx + s * 6.4 * u, ey = hy + 2.4 * u;
    paper.piece(look.eye ?? INK, () => ctx.ellipse(ex, ey, 2.3 * u, 2.9 * u, 0, 0, TAU), 0.15);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(ex + 0.7 * u, ey - 1 * u, 0.85 * u, 0, TAU); ctx.fill();
    paper.strip(INK, 0.8 * u, () => { ctx.moveTo(ex + s * 1.8 * u, ey - 2 * u); ctx.lineTo(ex + s * 3.4 * u, ey - 3.4 * u); }, 0.1);
  }
  ctx.fillStyle = 'rgba(240,120,130,0.45)';
  ctx.beginPath();
  for (const s of [-1, 1]) { ctx.moveTo(hx + s * 9.4 * u + 2.6 * u, hy + 7 * u); ctx.ellipse(hx + s * 9.4 * u, hy + 7 * u, 2.6 * u, 1.7 * u, 0, 0, TAU); }
  ctx.fill();
  const my = hy + 8.4 * u;
  if (look.singing) {
    const b = ((o.beat % 1) + 1) % 1, open = 0.6 + 0.4 * Math.exp(-b * 4);
    paper.piece('#c23a52', () => ctx.ellipse(hx, my + 0.6 * u, 2.2 * u, 2.6 * u * open, 0, 0, TAU), 0.15);
  } else {
    paper.piece('#d8435a', () => { ctx.moveTo(hx - 3 * u, my - 0.4 * u); ctx.quadraticCurveTo(hx, my + 4 * u, hx + 3 * u, my - 0.4 * u); ctx.closePath(); }, 0.15);
    paper.piece('#ffffff', () => { ctx.moveTo(hx - 2.4 * u, my); ctx.lineTo(hx + 2.4 * u, my); ctx.lineTo(hx + 1.8 * u, my + 0.9 * u); ctx.lineTo(hx - 1.8 * u, my + 0.9 * u); ctx.closePath(); }, 0.05);
  }
}

/**
 * Long curling hair: a great mass of it behind her down past her shoulders, its ends curled, and
 * over the top of her head a cap with a fringe swept across it and a shine.
 */
function hairLong(ctx, paper, u, look, [hx, hy], R, o) {
  const col = look.hairCol, deep = tone(col, -0.16), sway = Math.sin(o.t * 2 + o.phase) * 1.2 * u;
  return {
    back() {
      paper.piece(deep, () => {
        ctx.moveTo(hx, hy - R * 1.25);
        ctx.bezierCurveTo(hx - R * 1.6, hy - R * 1.2, hx - R * 1.8, hy + R * 0.6, hx - R * 1.3 + sway, hy + R * 1.95);
        ctx.quadraticCurveTo(hx - R * 0.8, hy + R * 1.5, hx - R * 0.55, hy + R * 0.9);
        ctx.lineTo(hx + R * 0.55, hy + R * 0.9);
        ctx.quadraticCurveTo(hx + R * 0.8, hy + R * 1.5, hx + R * 1.3 + sway, hy + R * 1.95);
        ctx.bezierCurveTo(hx + R * 1.8, hy + R * 0.6, hx + R * 1.6, hy - R * 1.2, hx, hy - R * 1.25);
        ctx.closePath();
      }, 0.7, true);
      for (const s of [-1, 1]) {
        curl(ctx, paper, col, hx + s * R * 1.25 + sway, hy + R * 0.25, R * 0.42, o.t * 0.6 * s);
        curl(ctx, paper, deep, hx + s * R * 1.3 + sway, hy + R * 1.1, R * 0.36, -o.t * 0.5 * s);
        curl(ctx, paper, col, hx + s * R * 1.12 + sway, hy + R * 1.8, R * 0.3, o.t * 0.5 * s + 2);
      }
    },
    front() {
      paper.piece(col, () => {
        ctx.ellipse(hx, hy, R * 1.12, R * 1.06, 0, Math.PI * 0.92, Math.PI * 2.08);
        ctx.quadraticCurveTo(hx + R * 0.75, hy - R * 0.45, hx + R * 0.2, hy - R * 0.3);
        ctx.quadraticCurveTo(hx - R * 0.3, hy - R * 0.6, hx - R * 0.75, hy - R * 0.1);
        ctx.quadraticCurveTo(hx - R * 1.0, hy + R * 0.05, hx - R * 1.12, hy + R * 0.1);
        ctx.closePath();
      }, 0.5, true);
      paper.piece(tone(col, 0.35), () => { ctx.ellipse(hx - R * 0.45, hy - R * 0.72, R * 0.36, R * 0.12, -0.5, 0, TAU); }, 0.1);
      for (const s of [-1, 1]) curl(ctx, paper, col, hx + s * R * 1.02, hy + R * 0.1, R * 0.3, o.t * 0.4 * s + 1);
    },
  };
}

/** Short hair, for her dad: a cap of it and a quiff. */
function hairShort(ctx, paper, u, look, [hx, hy], R) {
  return {
    back() {},
    front() {
      paper.piece(look.hairCol, () => {
        ctx.ellipse(hx, hy, R * 1.05, R, 0, Math.PI * 0.95, Math.PI * 2.05);
        ctx.quadraticCurveTo(hx + R * 0.4, hy - R * 0.5, hx - R * 0.2, hy - R * 0.45);
        ctx.quadraticCurveTo(hx - R * 0.8, hy - R * 0.3, hx - R * 1.05, hy + R * 0.05);
        ctx.closePath();
      }, 0.5, true);
      paper.piece(look.hairCol, () => { ctx.moveTo(hx - R * 0.3, hy - R * 0.95); ctx.quadraticCurveTo(hx + R * 0.2, hy - R * 1.45, hx + R * 0.6, hy - R * 1.05); ctx.closePath(); }, 0.4);
    },
  };
}

/**
 * The mermaid every candidate is built on, after Peter's reference: a big head of hair, a slim
 * body, a bandeau, and a tail that sweeps down and round behind her to a big fin, scaled on its
 * lower part. A wave runs down the tail and the fin flips on every other beat; she bobs a little;
 * one arm paddles. `look` gives her colours and her hair, and `extras(ctx, paper, u, o, at)` draws
 * what is hers alone, last.
 */
export function mermaid(ctx, paper, L, o, look) {
  const { beat, phase } = o;
  const u = L / 100;
  const kick = beat * Math.PI + phase;
  const bob = Math.sin(kick) * 1.5 * u + (look.bop ? look.bop(o) * u : 0);
  ctx.save();
  ctx.translate(0, bob);
  const head = [0, -50 * u], R = 17 * u;
  const hair = (look.hair === 'short' ? hairShort : hairLong)(ctx, paper, u, look, head, R, o);
  hair.back();
  // the tail: down from her hips, round behind her and up into the fin, a wave running down it
  const spine = [[0, 0], [1, 13], [-3, 25], [-14, 32], [-27, 31], [-36, 23]]
    .map(([x, y], i) => [x * u + Math.sin(kick - i * 0.7) * i * 0.5 * u, y * u + Math.cos(kick - i * 0.7) * i * 0.35 * u]);
  const half = [9.5, 9, 7.6, 6, 4.2, 2.6].map((w) => w * u);
  const [rx, ry] = spine[5], [qx, qy] = spine[4];
  ctx.save();
  ctx.translate(rx, ry);
  ctx.rotate(Math.atan2(ry - qy, rx - qx) + Math.sin(kick - 3.2) * 0.25);
  paper.piece(look.fin, () => {
    ctx.moveTo(-1 * u, -2.4 * u);
    ctx.bezierCurveTo(6 * u, -6 * u, 14 * u, -14 * u, 22 * u, -13 * u);
    ctx.quadraticCurveTo(16 * u, -6 * u, 13 * u, -1 * u);
    ctx.quadraticCurveTo(18 * u, 3 * u, 21 * u, 10 * u);
    ctx.bezierCurveTo(13 * u, 9 * u, 6 * u, 5 * u, -1 * u, 2.4 * u);
    ctx.closePath();
  }, 0.6, true);
  ctx.strokeStyle = tone(look.fin, 0.35);
  ctx.lineWidth = 0.9 * u;
  ctx.beginPath();
  ctx.moveTo(1 * u, -0.6 * u); ctx.quadraticCurveTo(9 * u, -6 * u, 17 * u, -10 * u);
  ctx.moveTo(1 * u, 0.6 * u); ctx.quadraticCurveTo(9 * u, 3 * u, 16 * u, 7 * u);
  ctx.stroke();
  ctx.restore();
  const tail = () => ribbon(ctx, spine, half);
  paper.piece(look.tail, tail, 0.8, true);
  // scales on its lower part, paler, in rows
  ctx.save();
  ctx.beginPath(); tail(); ctx.clip();
  paper.piece(tone(look.tail, 0.42), () => ctx.rect(-60 * u, 11 * u, 80 * u, 40 * u), 0.1);
  ctx.strokeStyle = tone(look.tail, -0.05);
  ctx.lineWidth = 0.9 * u;
  ctx.beginPath();
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 11; col++) {
      const sx = (-44 + col * 5.2 + (row % 2) * 2.6) * u, sy = (14 + row * 4) * u;
      ctx.moveTo(sx + 2.6 * u, sy); ctx.arc(sx, sy, 2.6 * u, 0, Math.PI);
    }
  }
  ctx.stroke();
  ctx.restore();
  // arms: one down at her side, one out and paddling, each going in under her shoulder so the
  // body's edge comes down over its top (Peter, 7 Oct 2026: "attach arms better on mermaides
  // shoulders")
  const paddle = Math.sin(kick * 2) * 0.3;
  const armL = [[-6.5 * u, -29.5 * u], [-12 * u, -24 * u], [-15.5 * u, -17 * u], [-17 * u, -10 * u]];
  const ea = -0.5 + paddle, armR = [[6.5 * u, -29.5 * u], [12 * u, -25 * u], [16 * u, -21 * u]];
  armR.push([armR[2][0] + Math.cos(ea) * 8 * u, armR[2][1] + Math.sin(ea) * 8 * u + 6 * u]);
  for (const arm of [armL, armR]) {
    paper.piece(look.skin, () => ribbon(ctx, arm, [3.4 * u, 2.9 * u, 2.4 * u, 1.9 * u]), 0.5);
    paper.piece(look.skin, () => ctx.ellipse(arm[3][0], arm[3][1], 2.5 * u, 2.1 * u, 0, 0, TAU), 0.3);
  }
  // her body: a slim waist into the tail, shoulders, a bandeau
  paper.piece(look.skin, () => {
    ctx.moveTo(-6 * u, -33 * u);
    ctx.quadraticCurveTo(-11 * u, -31 * u, -10 * u, -24 * u);
    ctx.quadraticCurveTo(-6 * u, -12 * u, -9 * u, 2 * u);
    ctx.lineTo(9 * u, 2 * u);
    ctx.quadraticCurveTo(6 * u, -12 * u, 10 * u, -24 * u);
    ctx.quadraticCurveTo(11 * u, -31 * u, 6 * u, -33 * u);
    ctx.closePath();
  }, 0.8, true);
  // her hips: the tail's top edge dipping to a point at the front, as in the reference
  paper.piece(look.tail, () => { ctx.moveTo(-9.8 * u, -2 * u); ctx.quadraticCurveTo(-4 * u, 1 * u, 0, 5 * u); ctx.quadraticCurveTo(4 * u, 1 * u, 9.8 * u, -2 * u); ctx.lineTo(9.6 * u, 8 * u); ctx.lineTo(-9.6 * u, 8 * u); ctx.closePath(); }, 0.4, true);
  if (look.top) {
    paper.piece(look.top, () => {
      ctx.moveTo(-9.6 * u, -26 * u);
      ctx.quadraticCurveTo(-5 * u, -30 * u, 0, -26.5 * u);
      ctx.quadraticCurveTo(5 * u, -30 * u, 9.6 * u, -26 * u);
      ctx.quadraticCurveTo(10 * u, -21 * u, 8.6 * u, -19.5 * u);
      ctx.quadraticCurveTo(0, -18 * u, -8.6 * u, -19.5 * u);
      ctx.quadraticCurveTo(-10 * u, -21 * u, -9.6 * u, -26 * u);
      ctx.closePath();
    }, 0.4);
    paper.strip(tone(look.top, -0.18), 0.6 * u, () => { ctx.moveTo(0, -26.5 * u); ctx.lineTo(0, -19 * u); }, 0.05);
  }
  paper.piece(look.skin, () => ctx.rect(-3.2 * u, -36 * u, 6.4 * u, 5 * u), 0.3);
  face(ctx, paper, u, look, head, R, o);
  hair.front();
  look.extras?.(ctx, paper, u, o, { head, R, hand: armR[3], handL: armL[3], kick });
  ctx.restore();
}

/** A paper note out of her mouth, rising and drifting back over her head, `age` 0–1. */
export function note(ctx, paper, u, [mx, my], age) {
  const x = mx - 4 * u - age * 22 * u, y = my - 6 * u - age * 30 * u;
  ctx.save();
  ctx.globalAlpha *= Math.min(1, age * 6) * Math.max(0, 1 - age);
  paper.piece('#fff3c4', () => { ctx.ellipse(x, y, 2.4 * u, 1.7 * u, -0.4, 0, TAU); ctx.rect(x + 1.7 * u, y - 8.5 * u, 1 * u, 8.5 * u); ctx.rect(x + 1.7 * u, y - 8.5 * u, 3.6 * u, 1.4 * u); }, 0.3);
  ctx.restore();
}

export const MERMAIDS = Object.freeze([
  { letter: 'A', name: 'SKY BLUE (the reference)', description: 'As close to Peter’s reference as paper goes: curling sky-blue hair, a pale bandeau, a soft blue tail, its lower part scaled, its fin sweeping round behind her.',
    paint: (ctx, paper, L, o) => mermaid(ctx, paper, L, o, {
      skin: '#f6d2b4', hairCol: '#8fb0d6', top: '#cfe1f3', tail: '#7fa3cc', fin: '#9db9dc', eye: '#2a3350',
    }) },
  { letter: 'B', name: 'SUNNY', description: 'Golden curls, a coral bandeau, a turquoise tail, a starfish in her hair.',
    paint: (ctx, paper, L, o) => mermaid(ctx, paper, L, o, {
      skin: '#f6cfae', hairCol: '#f2c447', top: '#f08a7c', tail: '#2fb7a8', fin: '#5fd6c4',
      extras: (ctx, paper, u, _, { head: [hx, hy], R }) => paper.piece('#ff8a4b', () => {
        for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - 0.3, r = i % 2 ? 2 * u : 4.6 * u; ctx[i ? 'lineTo' : 'moveTo'](hx + R * 0.7 + Math.cos(a) * r, hy - R * 0.7 + Math.sin(a) * r); }
        ctx.closePath();
      }, 0.3),
    }) },
  { letter: 'C', name: 'SONGBIRD', description: 'Singing as she goes, a paper note out of her mouth on every beat, drifting up and back: dark curls, a lilac bandeau, a deep blue tail with a gold fin.',
    paint: (ctx, paper, L, o) => mermaid(ctx, paper, L, o, {
      skin: '#c98b62', hairCol: '#3a2a2a', top: '#c7a4f0', tail: '#2d4fb0', fin: '#f2c447', singing: true,
      extras: (ctx, paper, u, { beat }, { head: [hx, hy] }) => {
        const b = ((beat % 1) + 1) % 1;
        for (let n = 0; n < 2; n++) note(ctx, paper, u, [hx, hy + 9 * u], (b + n) / 2);
      },
    }) },
  { letter: 'E', name: 'CLUB KID', description: 'In from Lorenzo’s flood: shades and headphones, her head nodding on the beat. Pink hair, a black bandeau, a yellow tail.',
    paint: (ctx, paper, L, o) => mermaid(ctx, paper, L, o, {
      skin: '#e9b48f', hairCol: '#ff7ab8', top: '#2a2633', tail: '#f2c447', fin: '#ff9ad0',
      bop: ({ beat }) => -Math.exp(-(((beat % 1) + 1) % 1) * 6) * 2,
      extras: (ctx, paper, u, _, { head: [hx, hy], R }) => {
        paper.strip('#2a2633', 2.4 * u, () => ctx.ellipse(hx, hy, R * 1.16, R * 1.12, 0, Math.PI * 1.05, Math.PI * 1.95), 0.3);
        for (const s of [-1, 1]) {
          paper.piece('#2a2633', () => ctx.ellipse(hx + s * R * 1.08, hy + 2 * u, 4 * u, 5.4 * u, 0, 0, TAU), 0.4);
          paper.piece('#ff7ab8', () => ctx.ellipse(hx + s * R * 1.08, hy + 2 * u, 2 * u, 3 * u, 0, 0, TAU), 0.15);
        }
        paper.piece('#0b0b14', () => {
          for (const s of [-1, 1]) { const ex = hx + s * 6.4 * u; ctx.moveTo(ex - 4.4 * u, hy - 0.6 * u); ctx.lineTo(ex + 4.4 * u, hy - 0.6 * u); ctx.quadraticCurveTo(ex + 4 * u, hy + 5 * u, ex, hy + 5 * u); ctx.quadraticCurveTo(ex - 4 * u, hy + 5 * u, ex - 4.4 * u, hy - 0.6 * u); }
          ctx.rect(hx - 2.4 * u, hy - 0.4 * u, 4.8 * u, 1 * u);
        }, 0.3);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        for (const s of [-1, 1]) { const ex = hx + s * 6.4 * u + 1.6 * u; ctx.moveTo(ex + 1.4 * u, hy + 1 * u); ctx.ellipse(ex, hy + 1 * u, 1.4 * u, 0.6 * u, -0.4, 0, TAU); }
        ctx.fill();
      },
    }) },
]);
