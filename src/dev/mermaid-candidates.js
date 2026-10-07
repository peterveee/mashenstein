// MERMAID BAKE-OFF — a little mermaid who swims past in the jukebox's DEEP BLUE DISCO. 7 Oct 2026.
//
// Peter: "do a bakeoff of a little mermaid parody who could swim past" ... "or ursula". The fairy
// tale's mermaid and the tale's sea witch, not anybody's film's: no red hair on a green tail with a
// purple top, no purple witch with white hair.
//
// Round 2 (Peter: "Terrible mermaids!", and a reference: a chibi cartoon mermaid, front on, a big
// head of curling hair, dot eyes and a blush, a bandeau top, a slim body and a tail that sweeps
// round to one side into a big fin, scales on its lower part). The first round were side on and
// long; these are built on that reference instead. Front on for the whole of her appearance (she
// never turns to camera — she is facing it from the start), she drifts across the tank with her
// tail sweeping out behind her and her fin flipping on every other beat, so she never has to turn
// round either: in at one side and out at the other.
//
// Each is a mermaid for FishTank — { letter, name, description, paint(ctx, paper, L, o) } — drawn
// travelling right with her hips at the origin, `L` from the top of her hair to the bottom of her
// tail's curve, through the tank's own paper (visualisers.js tankPaper: `piece` a cut-out with its
// shadow, `strip` a strip of paper), so she is cut from the same stuff as the fish. `o` is
// { t, beat, phase }.
//
// SETTLED 7 Oct 2026 on A, B, C and E ("i would like to use a b c e to swim through once in a
// while"): they are the tank's now (src/sprites/mermaids.js), and one of them swims through every
// minute or so. D, F and G stay here for the bake-off's record.

import { drawPaperFish, FISHES } from '../game/banger/club-fish.js';
import { MERMAIDS as SHIPPED, mermaid, ribbon } from '../sprites/mermaids.js';

const TAU = Math.PI * 2;
const INK = '#1b1428';

/**
 * The tale's sea witch (Peter: "or ursula" — the tale's, not the film's: sea-green, no purple skin,
 * no white hair, no eels), built the same way: a big head under a tall seaweed beehive, heavy lids,
 * lipstick and a beauty mark, a bodice, and below the waist an octopus — six tentacles curling down
 * and round behind her, flaring and pulling in every two beats as she jets across — with a trident
 * wand that sparks on the bar line, and Lorenzo's angler at her side as her pet.
 */
function seaWitch(ctx, paper, L, { t, beat, phase }) {
  const u = L / 100;
  const pulse = beat * Math.PI + phase, squeeze = (1 + Math.sin(pulse)) / 2;
  const skin = '#9cc7b8', berry = '#7a1f45', arms = ['#8f2a4c', '#a8325a'];
  const head = [0, -50 * u], R = 17 * u, [hx, hy] = head;
  // the beehive, behind and over her head
  paper.piece('#4f8a3c', () => ctx.ellipse(hx - 2 * u, hy - R * 1.1, R * 0.9, R * 1.25, -0.12, 0, TAU), 0.7, true);
  paper.piece('#5f9e48', () => ctx.ellipse(hx - 6 * u, hy - R * 1.4, R * 0.3, R * 0.6, -0.12, 0, TAU), 0.2);
  // the tentacles, down and round behind her, flaring and pulling in, their tips curling
  for (let j = 0; j < 6; j++) {
    const fan = (j - 2.5) * (0.7 + 0.6 * squeeze);
    const pts = [];
    for (let k = 0; k <= 5; k++) {
      const f = k / 5;
      pts.push([(-6 + j * 2.4) * u + (fan * 6 - f * 22) * f * u + Math.sin(pulse * 0.5 - k * 0.9 + j) * f * 3 * u,
        (2 + f * (26 - Math.abs(j - 2.5) * 3) * (1.05 - 0.15 * squeeze)) * u]);
    }
    const [lx, ly] = pts[5], c = j < 3 ? -1 : 1;
    pts.push([lx + c * 3 * u, ly + 3 * u], [lx + c * 6 * u, ly + 1 * u], [lx + c * 5 * u, ly - 2 * u]);
    const half = pts.map((_, k) => Math.max(0.6, 4.4 - k * 0.55) * u);
    paper.piece(arms[j % 2], () => ribbon(ctx, pts, half), 0.6, true);
    paper.piece('#f2b6c8', () => {
      for (let k = 1; k < 5; k++) { const [x, y] = pts[k]; const r = half[k] * 0.32; ctx.moveTo(x + half[k] * 0.4 + r, y); ctx.arc(x + half[k] * 0.4, y, r, 0, TAU); }
    }, 0.1);
  }
  // her arms, going in under her shoulders: one at her side, one out with her wand
  const hand = [21 * u, -24 * u + Math.sin(t * 1.6 + phase) * u];
  paper.piece(skin, () => ribbon(ctx, [[-7 * u, -29.5 * u], [-12.5 * u, -24 * u], [-15 * u, -17 * u], [-16 * u, -10 * u]], [3.4 * u, 2.9 * u, 2.4 * u, 1.9 * u]), 0.5);
  paper.piece(skin, () => ribbon(ctx, [[7 * u, -29.5 * u], [12 * u, -28 * u], [17 * u, -27 * u], hand], [3.4 * u, 2.9 * u, 2.4 * u, 1.9 * u]), 0.5);
  // her body, a berry bodice, the octopus of her under it
  paper.piece(berry, () => ctx.ellipse(0, 2 * u, 12 * u, 7 * u, 0, 0, TAU), 0.8, true);
  paper.piece(skin, () => {
    ctx.moveTo(-6 * u, -33 * u);
    ctx.quadraticCurveTo(-12 * u, -31 * u, -11 * u, -24 * u);
    ctx.quadraticCurveTo(-8 * u, -12 * u, -10 * u, 0);
    ctx.lineTo(10 * u, 0);
    ctx.quadraticCurveTo(8 * u, -12 * u, 11 * u, -24 * u);
    ctx.quadraticCurveTo(12 * u, -31 * u, 6 * u, -33 * u);
    ctx.closePath();
  }, 0.8, true);
  paper.piece(berry, () => { ctx.moveTo(-10.4 * u, -26 * u); ctx.quadraticCurveTo(0, -30 * u, 10.4 * u, -26 * u); ctx.lineTo(9.4 * u, 0); ctx.lineTo(-9.4 * u, 0); ctx.closePath(); }, 0.4);
  // an arm at her side, and the other out with her wand
  const b = ((beat % 4) + 4) % 4, spark = b < 0.4 ? 1 - b / 0.4 : 0;
  paper.strip('#c9a04a', 1.4 * u, () => { ctx.moveTo(hand[0] - 2 * u, hand[1] + 8 * u); ctx.lineTo(hand[0] + 3 * u, hand[1] - 14 * u); }, 0.4);
  paper.strip('#c9a04a', 1.2 * u, () => {
    const [tx, ty] = [hand[0] + 3 * u, hand[1] - 14 * u];
    ctx.moveTo(tx - 3.6 * u, ty - 1.6 * u); ctx.lineTo(tx - 3.2 * u, ty + 2 * u); ctx.lineTo(tx + 3 * u, ty + 2.6 * u); ctx.lineTo(tx + 3.8 * u, ty - 1 * u);
    ctx.moveTo(tx, ty + 2.2 * u); ctx.lineTo(tx + 0.4 * u, ty - 3.2 * u);
  }, 0.3);
  paper.piece(skin, () => ctx.ellipse(hand[0], hand[1], 2.5 * u, 2.1 * u, 0, 0, TAU), 0.3);
  if (spark > 0) {
    ctx.save();
    ctx.globalAlpha *= spark;
    paper.piece('#fff3a0', () => {
      const [sx, sy] = [hand[0] + 3.4 * u, hand[1] - 18.5 * u];
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = (i % 2 ? 1.6 : 5.5) * u * (0.6 + 0.4 * spark); ctx[i ? 'lineTo' : 'moveTo'](sx + Math.cos(a) * r, sy + Math.sin(a) * r); }
      ctx.closePath();
    }, 0.2);
    ctx.restore();
  }
  paper.piece(skin, () => ctx.rect(-3.2 * u, -36 * u, 6.4 * u, 5 * u), 0.3);
  // her face: heavy purple lids over gold eyes, lipstick, a beauty mark, a fringe of the beehive
  paper.piece(skin, () => { for (const s of [-1, 1]) { ctx.moveTo(hx + s * R * 0.98 + 2.6 * u, hy + 2 * u); ctx.arc(hx + s * R * 0.98, hy + 2 * u, 2.6 * u, 0, TAU); } }, 0.3);
  paper.piece(skin, () => ctx.ellipse(hx, hy, R, R * 0.94, 0, 0, TAU), 0.8, true);
  for (const s of [-1, 1]) {
    const ex = hx + s * 6.4 * u, ey = hy + 2.4 * u;
    paper.piece('#fbf6ee', () => ctx.ellipse(ex, ey, 2.8 * u, 2.9 * u, 0, 0, TAU), 0.15);
    paper.piece('#c9a04a', () => ctx.ellipse(ex, ey + 0.4 * u, 1.8 * u, 2.2 * u, 0, 0, TAU), 0.1);
    paper.piece(INK, () => ctx.ellipse(ex, ey + 0.5 * u, 0.8 * u, 1.4 * u, 0, 0, TAU), 0.1);
    paper.piece('#6a3a8a', () => { ctx.ellipse(ex, ey - 0.3 * u, 3.2 * u, 3.1 * u, 0, Math.PI, TAU); ctx.closePath(); }, 0.15);
    paper.strip(INK, 0.9 * u, () => { ctx.moveTo(ex - 3 * u, ey - 0.3 * u); ctx.lineTo(ex + 3 * u, ey - 0.3 * u); ctx.lineTo(ex + s * 4.4 * u, ey - 2 * u); ctx.moveTo(ex - 2.6 * u, ey - 5.2 * u + s * 0.8 * u); ctx.lineTo(ex + 2.6 * u, ey - 5.2 * u - s * 0.8 * u); }, 0.1);
  }
  const my = hy + 8.6 * u;
  paper.piece('#d23a5a', () => { ctx.moveTo(hx - 4.4 * u, my - 0.6 * u); ctx.quadraticCurveTo(hx, my + 4.4 * u, hx + 4.4 * u, my - 0.6 * u); ctx.quadraticCurveTo(hx, my + 0.8 * u, hx - 4.4 * u, my - 0.6 * u); ctx.closePath(); }, 0.15);
  paper.piece(INK, () => ctx.arc(hx + 6.4 * u, my - 1.4 * u, 0.6 * u, 0, TAU), 0.05);
  paper.piece('#4f8a3c', () => {
    ctx.ellipse(hx, hy, R * 1.08, R * 1.02, 0, Math.PI * 0.95, Math.PI * 2.05);
    ctx.quadraticCurveTo(hx + R * 0.5, hy - R * 0.6, hx - R * 0.1, hy - R * 0.45);
    ctx.quadraticCurveTo(hx - R * 0.7, hy - R * 0.3, hx - R * 1.08, hy + R * 0.05);
    ctx.closePath();
  }, 0.5, true);
  paper.piece('#ff8a4b', () => {
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 + 0.3, r = i % 2 ? 1.8 * u : 4.2 * u; ctx[i ? 'lineTo' : 'moveTo'](hx + 8 * u + Math.cos(a) * r, hy - R * 1.3 + Math.sin(a) * r); }
    ctx.closePath();
  }, 0.3);
  for (const s of [-1, 1]) paper.piece('#f6eee6', () => ctx.arc(hx + s * R * 1.0, hy + 6 * u, 1.8 * u, 0, TAU), 0.3);
  // her pet: Lorenzo's angler, keeping up at her side
  const angler = FISHES.find((f) => f.name === 'ANGLER');
  ctx.save();
  ctx.translate(26 * u, 2 * u + Math.sin(t * 2.6 + phase) * 1.5 * u);
  drawPaperFish(ctx, angler, 26 * u, { t, beat, wag: Math.cos(beat * TAU), lite: true, quick: true, heroH: 48 * u });
  ctx.restore();
}

const [A, B, C, E] = SHIPPED;

/** The whole line-up, A–G, for the bake-off's section: the shipped four with the rest. */
export const MERMAIDS = Object.freeze([
  A, B, C,
  { letter: 'D', name: 'TOASTER TREASURE', description: 'Off home with her treasure from the wreck: a little silver toaster held out in front of her, toast popping up out of it on the bar line. Silver hair, a mint bandeau, a sea-green tail.',
    paint: (ctx, paper, L, o) => mermaid(ctx, paper, L, o, {
      skin: '#f3d6c6', hairCol: '#dfe3ee', top: '#9ee6c8', tail: '#3c9c6c', fin: '#7fd9a8', eye: '#2c4c44',
      extras: (ctx, paper, u, { beat }, { hand }) => {
        const b = ((beat % 4) + 4) % 4, pop = b < 0.2 ? b / 0.2 : b < 1 ? 1 : Math.max(0, 1 - (b - 1) / 0.5);
        const [tx, ty] = [hand[0] + 6 * u, hand[1] - 3 * u];
        paper.piece('#e0b26a', () => ctx.rect(tx - 4.5 * u, ty - 9 * u - pop * 6 * u, 9 * u, 9 * u), 0.3);
        paper.piece('#d9dde3', () => { ctx.moveTo(tx - 8 * u, ty + 6 * u); ctx.lineTo(tx - 8 * u, ty - 4 * u); ctx.quadraticCurveTo(tx, ty - 9 * u, tx + 8 * u, ty - 4 * u); ctx.lineTo(tx + 8 * u, ty + 6 * u); ctx.closePath(); }, 0.6, true);
        paper.piece('#3a3a44', () => ctx.rect(tx - 4.5 * u, ty - 6.2 * u, 9 * u, 1.4 * u), 0.15);
        paper.piece('#c4ccd8', () => ctx.rect(tx + 4.5 * u, ty - 1 * u, 2.4 * u, 4.4 * u), 0.15);
        paper.piece('#f3d6c6', () => ctx.ellipse(hand[0], hand[1], 2.5 * u, 2.1 * u, 0, 0, TAU), 0.3);
      },
    }) },
  E,
  { letter: 'F', name: 'MERDAD', description: 'Her dad, by mistake: a merman with a big beard and a moustache, short hair and a quiff, a bit of a belly, a shell necklace and an orange tail, doing his best.',
    paint: (ctx, paper, L, o) => mermaid(ctx, paper, L, o, {
      skin: '#e8b48c', hair: 'short', hairCol: '#7a5a3a', top: null, tail: '#ef7f3a', fin: '#f5b06a', eye: '#3a2a1a',
      extras: (ctx, paper, u, _, { head: [hx, hy], R }) => {
        paper.piece('#e8b48c', () => ctx.ellipse(0, -9 * u, 9.6 * u, 8 * u, 0, 0, TAU), 0.4, true);
        paper.piece('#7a5a3a', () => {
          ctx.moveTo(hx - R * 0.95, hy + 1 * u);
          ctx.quadraticCurveTo(hx - R * 0.9, hy + R * 1.35, hx, hy + R * 1.45);
          ctx.quadraticCurveTo(hx + R * 0.9, hy + R * 1.35, hx + R * 0.95, hy + 1 * u);
          ctx.quadraticCurveTo(hx + R * 0.5, hy + R * 0.55, hx, hy + R * 0.6);
          ctx.quadraticCurveTo(hx - R * 0.5, hy + R * 0.55, hx - R * 0.95, hy + 1 * u);
          ctx.closePath();
        }, 0.4);
        paper.piece('#6a4a2c', () => { ctx.moveTo(hx, hy + 6.4 * u); ctx.quadraticCurveTo(hx - 5 * u, hy + 4.6 * u, hx - 7.4 * u, hy + 8.4 * u); ctx.quadraticCurveTo(hx - 3.4 * u, hy + 7.6 * u, hx, hy + 8.4 * u); ctx.quadraticCurveTo(hx + 3.4 * u, hy + 7.6 * u, hx + 7.4 * u, hy + 8.4 * u); ctx.quadraticCurveTo(hx + 5 * u, hy + 4.6 * u, hx, hy + 6.4 * u); ctx.closePath(); }, 0.3);
        paper.piece('#f3d2bd', () => { for (const sx of [-6, -2, 2, 6]) { ctx.moveTo(sx * u + 1.6 * u, -27 * u + Math.abs(sx) * 0.3 * u); ctx.arc(sx * u, -27 * u + Math.abs(sx) * 0.3 * u, 1.6 * u, 0, TAU); } }, 0.3);
      },
    }) },
  { letter: 'G', name: 'SEA WITCH', paint: seaWitch,
    description: 'The tale’s sea witch instead: sea-green under a tall seaweed beehive, heavy purple lids, lipstick and a beauty mark, an octopus below the waist — six tentacles curling round behind her, flaring and pulling in every two beats — a trident wand that sparks on the bar line, and Lorenzo’s angler at her side as her pet.' },
]);
