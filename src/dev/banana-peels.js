// THE BANANA PEEL, second bake-off (Peter, 7 Oct 2026: "could we do a bakeoff
// for the banana peel obstacle, still not 100% happy with it").
//
// SETTLED the same day on D, RIPE ("D") — it is props.js bananaPeel now. A–F
// stay here as the record, with the painter D replaced kept at the bottom as
// bananaPeelBefore (X in the gallery section).
//
// The first bake-off (src/dev/banana-candidates.js, 27 Aug) settled the SIZE and
// the palette — 10x6 lying on the road, lemon yellow, a warm whisper of contour
// — and every candidate here keeps all three. What it never settled is the
// ANATOMY, and that is the thing these are about. The peel it shipped grows its
// skins from a root down in the pile and carries the stalk on the END of one of
// them, so the stalk sits at a skin's tip and nothing joins the four parts:
// one strip floats above the rest, and the whole reads as yellow leaves or a
// sprouting plant more readily than as a peel.
//
// A real peel is held together by its stem. Every skin hangs from the one
// crown the stalk sits on, which is what A–F share; they differ in how that
// peel has landed (A, B, C) and in how it is finished (D, E, F — each on A's
// shape, and each portable to whichever shape wins).
//
// Every painter fills the same normalized w-by-h box standing on its floor —
// the seam PROP_PAINTERS.bananaPeel uses. The gallery draws them through
// drawWorldEntity (definePropVariant), at the size and with the treatment the
// game gives them.

import { plain, stroke } from '../sprites/props.js';

const TAU = Math.PI * 2;

// Today's colours, so A–C are judged on shape alone.
const PAL = {
  lit: '#ffe14a',
  main: '#fcd420',
  deep: '#f0c008',
  cream: '#fff0b8',
  tip: '#7a5a1e',
};
const WARM_INK = 'rgba(122,80,10,0.55)';
const HOUSE_INK = 'rgba(26,16,40,0.62)';

function fillPath(ctx, col, pathFn) {
  ctx.beginPath(); pathFn(ctx);
  ctx.fillStyle = col; ctx.fill();
}
function inked(ctx, col, pathFn, ink, width) {
  ctx.beginPath(); pathFn(ctx);
  ctx.fillStyle = col; ctx.fill();
  if (!ink) return;
  ctx.strokeStyle = ink; ctx.lineWidth = width;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.stroke();
}
function line(ctx, col, width, pathFn) {
  ctx.beginPath(); pathFn(ctx);
  ctx.strokeStyle = col; ctx.lineWidth = width; ctx.lineCap = 'round';
  ctx.stroke();
}

// A SKIN: a centreline (a quadratic from root to tip) offset along its own
// normal — the only construction that reliably puts a point on a long strip;
// it is the one the shipped painter uses. Widest near the root, where a skin
// is still attached, narrowing the whole way out. `rootF` holds the root end
// open (a band, not a needle), so it can tuck under the crown.
//
// `face(f, k)` is the same strip at `k` of its width, pushed `f` of a
// half-width toward the `top` edge — the outer face of a skin whose cream
// lining shows along its other edge, or the cream inside of one turned over.
function skin(rx, ry, kx, ky, tx, ty, halfMax, rootF = 0.85) {
  const N = 16;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, mt = 1 - t;
    const x = mt * mt * rx + 2 * mt * t * kx + t * t * tx;
    const y = mt * mt * ry + 2 * mt * t * ky + t * t * ty;
    const dx = 2 * mt * (kx - rx) + 2 * t * (tx - kx);
    const dy = 2 * mt * (ky - ry) + 2 * t * (ty - ky);
    const len = Math.hypot(dx, dy) || 1;
    const half = halfMax * Math.max(rootF * (1 - t), Math.sin(Math.PI * Math.pow(t, 0.62)));
    pts.push({ x, y, nx: -dy / len, ny: dx / len, half });
  }
  const strip = (f, k) => (c) => {
    const top = pts.map((p) => [p.x + p.nx * p.half * (f + k), p.y + p.ny * p.half * (f + k)]);
    const bot = pts.map((p) => [p.x + p.nx * p.half * (f - k), p.y + p.ny * p.half * (f - k)]);
    c.moveTo(top[0][0], top[0][1]);
    for (const [x, y] of top) c.lineTo(x, y);
    for (let i = bot.length - 1; i >= 0; i--) c.lineTo(bot[i][0], bot[i][1]);
    c.closePath();
  };
  // The browned point: a short nick continuing the taper, not a bead.
  const cap = (back = 2) => (c) => {
    const m = pts[N - back];
    c.moveTo(tx, ty);
    c.lineTo(m.x + m.nx * m.half, m.y + m.ny * m.half);
    c.quadraticCurveTo(m.x, m.y, m.x - m.nx * m.half, m.y - m.ny * m.half);
    c.closePath();
  };
  return { path: strip(0, 1), face: strip, cap, pts };
}

// How one skin is dressed. `lining` is how much of the strip's width shows the
// cream inside along one edge (+ the top edge, − the bottom); `inside` paints
// the whole skin as its cream underside with a yellow rim — a skin flopped
// over toward the viewer.
function drawSkin(ctx, sk, col, look, { lining = 0, inside = false } = {}) {
  const P = look.pal;
  inked(ctx, inside ? col : (lining ? P.cream : col), sk.path, look.ink, look.inkW);
  ctx.save();
  ctx.beginPath(); sk.path(ctx); ctx.clip();
  if (inside) fillPath(ctx, P.cream, sk.face(0, 0.58));
  else if (lining) fillPath(ctx, col, sk.face(-Math.sign(lining) * Math.abs(lining), 1));
  ctx.restore();
  if (look.ink) {   // re-ink the edge the lining fill covered
    ctx.beginPath(); sk.path(ctx);
    ctx.strokeStyle = look.ink; ctx.lineWidth = look.inkW; ctx.lineJoin = 'round'; ctx.stroke();
  }
  fillPath(ctx, P.tip, sk.cap(look.capBack || 2));
}

function smear(ctx, w, h, gy, spread = 0.42) {
  fillPath(ctx, 'rgba(8,6,12,0.15)', (c) => c.ellipse(w * 0.5, gy - h * 0.005, w * spread, h * 0.03, 0, 0, TAU));
}

// The stalk: a short dark nub, the only non-yellow mark, standing off the
// crown. Begun inside the crown so no hairline opens between them.
function stalk(ctx, look, x0, y0, x1, y1, width) {
  line(ctx, look.pal.tip, width, (c) => { c.moveTo(x0, y0); c.lineTo(x1, y1); });
  if (look.ink === HOUSE_INK) {
    ctx.save(); ctx.globalCompositeOperation = 'destination-over';
    line(ctx, look.ink, width + look.inkW * 2, (c) => { c.moveTo(x0, y0); c.lineTo(x1, y1); });
    ctx.restore();
  }
}

// ------------------------------------------------------------------ THE CROWN
// The shape A, D, E and F share: a dome at the stem end with the stalk on top,
// and every skin hanging from it — two arching out and down onto the road to
// either side, one lying behind, and one flopped forward toward the viewer with
// its cream inside up. The cartoon peel, squashed into the lane's low box.
function crownPeel(ctx, w, h, look) {
  const P = look.pal;
  const X = (u) => w * u, Y = (v) => h * v;
  const gy = 0.97;
  const fat = look.fat || 1;
  if (look.slick) slick(ctx, w, h);
  smear(ctx, w, h, Y(gy));
  // Not mirror images: the left skin has slumped flatter and further, the
  // right one still holds a little arch. Matched, they read as horns.
  const back = skin(X(0.55), Y(0.50), X(0.72), Y(0.22), X(0.88), Y(0.50), h * 0.10 * fat);
  const left = skin(X(0.46), Y(0.60), X(0.20), Y(0.38), X(0.02), Y(0.93), h * 0.15 * fat);
  const right = skin(X(0.55), Y(0.58), X(0.82), Y(0.20), X(0.975), Y(0.90), h * 0.15 * fat);
  // The front skin hangs from the crown's hem and lies forward on the road,
  // inside up, across the foot of the right one. Its root goes UNDER the
  // crown, so the hem is the fold. Straight down it was a leg.
  const front = skin(X(0.51), Y(0.62), X(0.58), Y(0.98), X(0.84), Y(0.965), h * 0.13 * fat, 0.7);
  if (!look.three) drawSkin(ctx, back, P.deep, look);
  drawSkin(ctx, left, P.main, look, { lining: look.lining ?? -0.45 });
  drawSkin(ctx, right, P.main, look, { lining: look.lining ?? -0.45 });
  drawSkin(ctx, front, P.main, look, { inside: true });
  // The crown: a short dome, narrower at the top where the stem pinches it,
  // with a rounded hem rather than a cut across its foot.
  const crown = (c) => {
    c.moveTo(X(0.405), Y(0.68));
    c.bezierCurveTo(X(0.40), Y(0.42), X(0.44), Y(0.20), X(0.505), Y(0.19));
    c.bezierCurveTo(X(0.57), Y(0.20), X(0.61), Y(0.42), X(0.605), Y(0.68));
    c.quadraticCurveTo(X(0.505), Y(0.80), X(0.405), Y(0.68));
    c.closePath();
  };
  inked(ctx, P.lit, crown, look.ink, look.inkW);
  ctx.save(); ctx.beginPath(); crown(ctx); ctx.clip();
  fillPath(ctx, P.main, (c) => c.ellipse(X(0.60), Y(0.52), X(0.05), Y(0.40), -0.15, 0, TAU));
  ctx.restore();
  stalk(ctx, look, X(0.505), Y(0.26), X(0.53), Y(0.035), w * 0.058);
  if (look.spots) spots(ctx, w, h, look.spots, [[left, 4, 0.2], [left, 9, -0.1], [left, 12, 0.3], [right, 5, 0.3], [right, 9, -0.2], [back, 8, 0.1], [front, 9, 0.1]]);
  if (look.glints) glints(ctx, w, h, [left, right]);
}

// D's ripeness: sugar spots, placed on the skins' own centrelines (skin, step
// along it, offset across it) so they stay on the peel wherever a skin lies.
function spots(ctx, w, h, col, onSkins) {
  const dot = (x, y, r) => fillPath(ctx, col, (c) => c.ellipse(x, y, w * r, h * r * 1.4, 0.4, 0, TAU));
  for (const [u, v, r] of [[0.47, 0.42, 0.030], [0.55, 0.30, 0.022], [0.53, 0.56, 0.020]]) dot(w * u, h * v, r);
  onSkins.forEach(([sk, i, f], k) => {
    const p = sk.pts[i];
    dot(p.x + p.nx * p.half * f, p.y + p.ny * p.half * f, k % 2 ? 0.018 : 0.024);
  });
}

// F's wet look: a white glint along the crown and riding the upper edge of
// each arching skin, taken off the skin's own centreline so it stays on it.
function glints(ctx, w, h, skins) {
  const g = 'rgba(255,255,255,0.85)', lw = Math.max(0.4, w * 0.022);
  line(ctx, g, lw, (c) => { c.moveTo(w * 0.455, h * 0.52); c.quadraticCurveTo(w * 0.455, h * 0.34, w * 0.49, h * 0.27); });
  for (const sk of skins) {
    line(ctx, g, lw, (c) => {
      for (let i = 3; i <= 7; i++) {
        const p = sk.pts[i];
        const up = p.ny < 0 ? 1 : -1;   // whichever side of the strip faces the sky
        const x = p.x + p.nx * p.half * 0.5 * up, y = p.y + p.ny * p.half * 0.5 * up;
        if (i === 3) c.moveTo(x, y); else c.lineTo(x, y);
      }
    });
  }
}

// F's slick: a pale wet patch on the road under the peel, with one bright
// streak on it. It says SLIPPERY rather than JUMP-ME, which is the peel's one
// difference from every other ground hazard.
function slick(ctx, w, h) {
  fillPath(ctx, 'rgba(255,248,214,0.42)', (c) => c.ellipse(w * 0.5, h * 0.93, w * 0.49, h * 0.075, 0, 0, TAU));
  line(ctx, 'rgba(255,255,255,0.9)', Math.max(0.4, h * 0.035), (c) => {
    c.moveTo(w * 0.10, h * 0.935); c.quadraticCurveTo(w * 0.22, h * 0.905, w * 0.34, h * 0.905);
  });
}

// ---------------------------------------------------------------- B — TOSSED
// The same peel landed on its side: stem end to the left with the stalk
// pointing back the way it came, the skins trailing away to the right — one
// arching over and flopping onto the road, one behind, one turned over in
// front. A head and a tail rather than a peak, so it has a direction.
function tossedPeel(ctx, w, h, look) {
  const P = look.pal;
  const X = (u) => w * u, Y = (v) => h * v;
  smear(ctx, w, h, Y(0.97));
  const back = skin(X(0.28), Y(0.56), X(0.64), Y(0.38), X(0.985), Y(0.62), h * 0.11);
  const over = skin(X(0.26), Y(0.50), X(0.58), Y(0.00), X(0.90), Y(0.90), h * 0.16);
  const front = skin(X(0.28), Y(0.76), X(0.50), Y(1.02), X(0.74), Y(0.93), h * 0.14);
  drawSkin(ctx, back, P.deep, look);
  drawSkin(ctx, over, P.main, look, { lining: -0.45 });
  // The crown on its side: a dome lying down, pointing left.
  const crown = (c) => {
    c.moveTo(X(0.10), Y(0.58));
    c.bezierCurveTo(X(0.16), Y(0.40), X(0.30), Y(0.36), X(0.38), Y(0.48));
    c.bezierCurveTo(X(0.42), Y(0.58), X(0.42), Y(0.78), X(0.34), Y(0.86));
    c.bezierCurveTo(X(0.24), Y(0.92), X(0.12), Y(0.80), X(0.10), Y(0.58));
    c.closePath();
  };
  inked(ctx, P.lit, crown, look.ink, look.inkW);
  ctx.save(); ctx.beginPath(); crown(ctx); ctx.clip();
  fillPath(ctx, P.main, (c) => c.ellipse(X(0.24), Y(0.88), X(0.16), Y(0.12), 0, 0, TAU));
  ctx.restore();
  drawSkin(ctx, front, P.main, look, { inside: true });
  stalk(ctx, look, X(0.135), Y(0.58), X(0.025), Y(0.43), w * 0.058);
}

// ----------------------------------------------------------- C — INSIDE OUT
// Flat on the road with every skin turned back, so what faces up is the cream
// inside — the one mark no other yellow thing in the game has, and the one that
// says PEEL rather than banana or coin. The crown stands up out of the middle
// carrying the stalk, which is all the silhouette it has; it is the lowest and
// widest of the six.
function insideOutPeel(ctx, w, h, look) {
  const P = look.pal;
  const X = (u) => w * u, Y = (v) => h * v;
  smear(ctx, w, h, Y(0.97), 0.46);
  // Three skins of unequal length at unequal angles. Four matched ones made a
  // starfish, which is the flat peel's standing risk.
  const back = skin(X(0.55), Y(0.64), X(0.72), Y(0.40), X(0.93), Y(0.50), h * 0.12);
  const frontL = skin(X(0.46), Y(0.74), X(0.24), Y(0.96), X(0.015), Y(0.80), h * 0.16);
  const frontR = skin(X(0.54), Y(0.76), X(0.70), Y(1.00), X(0.88), Y(0.95), h * 0.14);
  drawSkin(ctx, back, P.deep, look, { inside: true });
  const crown = (c) => {
    c.moveTo(X(0.425), Y(0.80));
    c.bezierCurveTo(X(0.42), Y(0.52), X(0.45), Y(0.34), X(0.505), Y(0.33));
    c.bezierCurveTo(X(0.56), Y(0.34), X(0.59), Y(0.52), X(0.585), Y(0.80));
    c.closePath();
  };
  inked(ctx, P.lit, crown, look.ink, look.inkW);
  ctx.save(); ctx.beginPath(); crown(ctx); ctx.clip();
  fillPath(ctx, P.main, (c) => c.ellipse(X(0.585), Y(0.60), X(0.045), Y(0.34), -0.15, 0, TAU));
  ctx.restore();
  drawSkin(ctx, frontL, P.main, look, { inside: true });
  drawSkin(ctx, frontR, P.main, look, { inside: true });
  stalk(ctx, look, X(0.505), Y(0.40), X(0.53), Y(0.12), w * 0.058);
}

const LOOK = (w, h, extra = {}) => ({ pal: PAL, ink: WARM_INK, inkW: Math.max(0.2, Math.max(w, h) * 0.020), ...extra });

const RIPE = {
  lit: '#ffd648',
  main: '#f6c414',
  deep: '#e4ac0c',
  cream: '#fbe7ae',
  tip: '#4e3214',
};

export const BANANA_PEELS = [
  { letter: 'A', name: 'THE CROWN',
    paint: (ctx, w, h) => crownPeel(ctx, w, h, LOOK(w, h)),
    description: 'Every skin hangs from the one crown the stalk stands on: two arch out and down onto the road, one lies behind, one flops forward showing its cream inside. Today’s colours and contour.' },
  { letter: 'B', name: 'TOSSED',
    paint: (ctx, w, h) => tossedPeel(ctx, w, h, LOOK(w, h)),
    description: 'The same peel landed on its side: stem end left, stalk pointing back, the skins trailing right — one arching over onto the road. A head and a tail rather than a peak.' },
  { letter: 'C', name: 'INSIDE OUT',
    paint: (ctx, w, h) => insideOutPeel(ctx, w, h, LOOK(w, h)),
    description: 'Flat on the road with every skin turned back, cream insides up — the mark no coin or banana has. The crown and stalk stand out of the middle. Lowest and widest.' },
  { letter: 'D', name: 'RIPE',
    paint: (ctx, w, h) => crownPeel(ctx, w, h, LOOK(w, h, { pal: RIPE, spots: 'rgba(92,56,18,0.8)', capBack: 3 })),
    description: 'A’s shape, eaten a day later: deeper yellow, sugar spots, longer browned tips and a darker stalk. Spots are the quickest “banana” there is and they part it from the coin yellow.' },
  { letter: 'E', name: 'INKED',
    paint: (ctx, w, h) => crownPeel(ctx, w, h, LOOK(w, h, { ink: HOUSE_INK, inkW: Math.max(0.3, Math.max(w, h) * 0.034), fat: 1.25, three: true, lining: -0.32 })),
    rim: true,
    description: 'A’s shape drawn the way the crate and the cone are: three fat skins, the house dark contour and the shared hazard rim. Fewer, bigger marks — reads as a hazard, gives up the clean flat look.' },
  { letter: 'F', name: 'SLICK',
    paint: (ctx, w, h) => crownPeel(ctx, w, h, LOOK(w, h, { glints: true, slick: true })),
    description: 'A, wet: white glints on the crown and skins, and a pale slick on the road under it with a streak of shine. Says SLIPPERY, which is the one thing the peel does that no other hazard does.' },
];

// ------------------------------------------------- X — THE PEEL D REPLACED
// props.js bananaPeel as it was until 7 Oct 2026, moved here unchanged so the
// section can keep showing what was beaten. fineShape is props.js's own.
function fineShape(ctx, fill, u, pathFn, color, scale) {
  ctx.beginPath();
  pathFn(ctx);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(0.2, scale * u);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

// THE BANANA PEEL, drawn from the flat-vector reference Peter brought in.
//
// It is a peel LYING on the road with one skin risen out of the pile carrying
// the stalk — not the Mario Kart item standing on its base, which is what the
// first three passes drew. That earlier shape read (it has a real silhouette)
// and it was never right, and the bake-off in src/dev/banana-candidates.js is
// where seven of them were put side by side to find out why. Three things
// separate this one from all of those, and each is deliberate:
//
//   NO CONTOUR — or as near as this game can afford. Every other prop here is
//     outlined; this one separates its parts by TONE, four warm values from
//     cream to deep orange, and the absence of the dark hairline is most of
//     why it reads clean rather than busy. What survives is a whisper of warm
//     contour, kept for one specific reason: Speed Zone's road is #c88848 and
//     Frost's is near-white, and an unoutlined warm prop disappears into the
//     first and floats on the second. At 0.014 it is a separation, not a
//     border — an eighth the weight the cactus carries.
//   WARM, NOT LEMON. Golds and oranges instead of the #f2e42c the earlier
//     passes used. It separates from turf better and it stops the prop reading
//     as the same yellow as a coin, which at lane size was a real confusion.
//   ONE TALL ARC. Not a fan of equal skins around a stub. A single sweeping
//     skin rises out of the pile and carries the stalk at its top, everything
//     else lies down around it. That is what buys a silhouette while keeping
//     the prop low — a peak without a tower.
//
// The stalk is a chunky dark block rather than a taper, and it is doing more
// work than its size suggests: it is the only non-warm mark in the drawing and
// it sits at the top of the silhouette, which is where the eye lands.
export function bananaPeelBefore(ctx, w, h) {
  const gy = h * 0.97;
  // THE CONTOUR, and it is a real decision rather than a default.
  //
  // The reference has no outline at all, and drawn that way the peel loses its
  // lower edge into Speed Zone's road — #c88848 is close enough to the peel's
  // own yellow that the skins resting on the ground simply merge with it. The
  // first attempt at a fix went the other way and was so faint that the
  // OVERLAPS stopped reading: four skins on top of each other became one
  // silhouette with a stalk. The house dark (rgba(26,16,40,.34), what the
  // cactus and crate wear) works but goes grey against this much yellow, and
  // anything heavier turns the prop into a sticker with a brown border.
  //
  // Warm, mid-weight, is the one that does both jobs: it separates the peel
  // from every ground in the game AND separates the skins from each other,
  // while still reading as flat vector art rather than as an outlined sprite.
  const INK = 'rgba(122,80,10,0.55)';
  const P = {
    lit: '#ffe14a',    // the arc's lit face
    main: '#fcd420',   // the two skins reaching left — the colour of the thing
    deep: '#f0c008',   // the lobe lying behind and right
    tip: '#7a5a1e',    // stalk, and the point on each outer end
  };

  // A SKIN: a centreline offset along its own normal, which is the only way
  // that reliably gives a long strip a point on the end. Hand-placed edge
  // curves were tried against both references and every one came out a
  // rounded lump — two curves do not hold their relationship as a path bends,
  // and this drawing is nothing BUT long thin strips with points on them.
  //
  // `floor` holds the strip open at both ends instead of closing to a point.
  // The two reaching skins want the point; the arc, which has the stalk
  // balanced on its top, wants a band.
  const skin = (rx, ry, kx, ky, tx, ty, halfMax, rootF = 0.9, tipF = 0) => {
    const N = 16;
    const top = [], bot = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, mt = 1 - t;
      const x = mt * mt * rx + 2 * mt * t * kx + t * t * tx;
      const y = mt * mt * ry + 2 * mt * t * ky + t * t * ty;
      const dx = 2 * mt * (kx - rx) + 2 * t * (tx - kx);
      const dy = 2 * mt * (ky - ry) + 2 * t * (ty - ky);
      const len = Math.hypot(dx, dy) || 1;
      // Widest nearer the root than the middle: a peeled skin is broadest
      // where it is still attached and narrows the whole way out.
      //
      // The two floors are what hold the strip OPEN at each end, and `rootF`
      // in particular is not cosmetic. A plain sine closes both ends to a
      // point, and a peel built that way has no pile in the middle — every
      // strip meets its neighbours at a needle, so the arc's own blunt foot
      // had nothing covering it and stuck out below the drawing. A fat root
      // is what makes the centre a mass the arc can grow out of.
      const floor = rootF * (1 - t) + tipF * t;
      const half = halfMax * Math.max(floor, Math.sin(Math.PI * Math.pow(t, 0.62)));
      top.push([x - dy / len * half, y + dx / len * half]);
      bot.push([x + dy / len * half, y - dx / len * half]);
    }
    // The root end is ROUNDED rather than closed with a straight line across
    // the two edges. A flat cut there is a hard vertical edge in the middle of
    // the pile — it reads as a strip that has been guillotined, which is the
    // one thing none of the references has. The nose bulges out along the
    // reverse tangent by about its own half-width.
    const nx = rx - kx, ny = ry - ky;
    const nl = Math.hypot(nx, ny) || 1;
    const nose = halfMax * rootF * 0.9;
    const path = (c) => {
      c.moveTo(top[0][0], top[0][1]);
      for (const [x, y] of top) c.lineTo(x, y);
      for (let i = bot.length - 1; i >= 0; i--) c.lineTo(bot[i][0], bot[i][1]);
      c.quadraticCurveTo(rx + nx / nl * nose, ry + ny / nl * nose, top[0][0], top[0][1]);
      c.closePath();
    };
    // The browned point on the outer end, cut back along the strip so it is a
    // wedge continuing the taper rather than a bead stuck on the tip.
    const cap = (c) => {
      // An eighth of the strip, not a fifth. At N-3 the browned end ran a
      // fifth of the way back down the skin and read as a dagger blade; in
      // both references it is a short dark nick on the very point.
      const m = N - 2;
      c.moveTo(tx, ty);
      c.lineTo(top[m][0], top[m][1]);
      c.quadraticCurveTo((top[m][0] + bot[m][0]) / 2, (top[m][1] + bot[m][1]) / 2,
        bot[m][0], bot[m][1]);
      c.closePath();
    };
    return { path, cap };
  };

  // Contact smear, so the peel sits ON the road rather than above it.
  plain(ctx, 'rgba(8,6,12,0.15)', (c) => {
    c.ellipse(w * 0.48, gy - h * 0.005, w * 0.42, h * 0.03, 0, 0, Math.PI * 2);
  });

  // THE FOUR PARTS, back to front. `k` below is height above the road as a
  // fraction of the box, and the parts that sit HIGH are the ones lying
  // further away — the reference is drawn at a shallow plan angle, and that
  // is the only depth cue in it. Nothing here is floating.
  const K = (k) => gy - h * k;
  // ORDER MATTERS, and it is the fix for the arc's foot. A strip built from a
  // centreline has a blunt end, and the arc's belongs INSIDE the pile — drawn
  // last it stood proud of everything and its flat foot read as a separate
  // slab dropped into the middle of the drawing. So the arc goes down third
  // and the lower reaching skin goes over it, exactly as in the reference,
  // where that skin passes in front of the arc's base.
  const parts = [
    // The lobe lying behind and to the right. Deeper yellow, which is what
    // pushes it back — and FLAT: fattened it becomes a teardrop sitting beside
    // the peel instead of a skin tucked behind it.
    { s: skin(w * 0.530, K(0.24), w * 0.780, K(0.36), w * 0.985, K(0.20), h * 0.092), col: P.deep, cap: true },
    // The upper skin reaching LEFT. The thinnest thing in the drawing — this
    // is the strip that, with the arc's inner edge, encloses the open lens of
    // background that the reference is really built around. Fatten it and the
    // gap closes and the whole peel becomes one solid mass.
    { s: skin(w * 0.570, K(0.54), w * 0.34, K(0.70), w * 0.020, K(0.47), h * 0.056, 0.7), col: P.main, cap: true },
    // THE ARC. Rises out of the pile and carries the stalk, LEANING right the
    // whole way rather than going up straight and kinking over at the top —
    // the control point sits right of the chord, which is what turns a hook
    // into the smooth cant the reference has.
    // Rooted DEEP and narrow at the foot: a fat root here pushes its rounded
    // nose out from under the skin that is meant to be covering it, and the
    // bulge reads as a notch in the middle of the pile.
    { s: skin(w * 0.500, K(0.215), w * 0.552, K(0.56), w * 0.655, K(0.865), w * 0.052, 0.72, 0.44), col: P.lit },
    // The lower skin reaching left, thicker and resting on the road. Last, so
    // it covers the arc's foot.
    { s: skin(w * 0.580, K(0.19), w * 0.36, K(0.24), w * 0.070, K(0.11), h * 0.098, 0.95), col: P.main, cap: true },
  ];
  for (const { s: sk, col, cap } of parts) {
    fineShape(ctx, col, Math.max(w, h), sk.path, INK, 0.020);
    if (cap) plain(ctx, P.tip, sk.cap);
  }

  // The stalk: a short dark NUB tilted off the top of the arc. In both
  // references it is barely a tenth of the height and it does its work by
  // being the only dark mark in an otherwise entirely yellow drawing — drawn
  // longer it stops being part of the peel and becomes a brown peg leaning
  // against it.
  // It continues the arc's own lean rather than setting off at its own angle,
  // which is what made it read as a peg propped against the peel.
  // Started BELOW the arc's point so the two overlap. Begun at the point
  // itself, the round cap left a hairline of background between stalk and
  // peel, and the nub read as a brown capsule hovering over the tip.
  stroke(ctx, P.tip, Math.max(0.45, w * 0.034), (c) => {
    c.moveTo(w * 0.646, K(0.815));
    c.lineTo(w * 0.674, K(0.930));
  });
}
