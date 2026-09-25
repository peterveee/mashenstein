// FROST 2 — the reindeer herd, bake-off (Peter, 24 Sep 2026: "they look a bit basic ...
// they seem to have no nose for a start! one could have a red nose as a nod to the
// flying reindeer easter egg later").
//
// Every candidate is a drop-in for the shipped deer (frostLandmarks.js `drawDeer`) and
// reaches the real herd through `setFrostDeerPainter`: same crest, same tilt, same clip
// behind the ridge's rocks, same gallop clock. Signature:
//   draw(ctx, x, y, s, phase, tilt, { i, t, redNose })
// `y` is the hooves' line, the deer faces +x, `phase` is 0..1 through the stride, `i` is
// the herd position (0 = the leader) and `redNose` asks for the Rudolph lead — the nod to
// the frost-3 sleigh flypast, whose lead wears the same nose (sleigh.js `rudolphNose`).
//
// Units are the shipped deer's: about 15 long, 21 tall to the antler tips, at s = 1.
// On the far ridge that is ~21 px long on an iPhone and ~60 on a desktop, so every
// feature here has to survive being a pixel or two: the nose is a bead, not a drawing.
import { drawFrostDeer, drawFrostDeerV1 } from '../engine/stylePacks/frostLandmarks.js';
import { rudolphNose, flypastBlink } from '../sprites/sleigh.js';

const TAU = Math.PI * 2;

function fill(ctx, color, path) { ctx.beginPath(); path(ctx); ctx.fillStyle = color; ctx.fill(); }
function stroke(ctx, color, w, path) {
  ctx.beginPath(); path(ctx);
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
}
function inked(ctx, color, ink, lw, path) {
  ctx.beginPath(); path(ctx);
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = ink; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke();
}

// A jointed leg. `ang` swings it from the hip (0 = straight down, + = forward) and
// `bend` folds the lower half at the knee/hock. Hoof as a short dark cap.
function leg(ctx, hx, hy, ang, bend, l1, l2, w, color, sock, hoof) {
  const kx = hx + Math.sin(ang) * l1, ky = hy + Math.cos(ang) * l1;
  const fx = kx + Math.sin(ang + bend) * l2, fy = ky + Math.cos(ang + bend) * l2;
  stroke(ctx, color, w, (c) => { c.moveTo(hx, hy); c.lineTo(kx, ky); c.lineTo(fx, fy); });
  if (sock) {
    const sx = kx + Math.sin(ang + bend) * l2 * 0.55, sy = ky + Math.cos(ang + bend) * l2 * 0.55;
    stroke(ctx, sock, w * 0.9, (c) => { c.moveTo(sx, sy); c.lineTo(fx, fy); });
  }
  stroke(ctx, hoof, w * 1.05, (c) => {
    c.moveTo(fx - Math.sin(ang + bend) * 0.7, fy - Math.cos(ang + bend) * 0.7); c.lineTo(fx, fy);
  });
}

// The stride as four leg angles, a rotary gallop: fore pair reaching while the hind
// pair drives, each pair a little out of step so the legs never scissor as one.
function gait(phase) {
  const a = phase * TAU;
  return {
    foreNear: 0.62 * Math.sin(a), foreFar: 0.62 * Math.sin(a - 0.5),
    hindNear: 0.55 * Math.sin(a + Math.PI * 0.9), hindFar: 0.55 * Math.sin(a + Math.PI * 0.9 - 0.5),
    // Knees fold as a leg comes forward off the ground.
    foreBend: (x) => -0.9 * Math.max(0, Math.cos(x)),
    lift: Math.max(0, Math.sin(a)) * 0.45,
  };
}

function noseAt(ctx, x, y, r, info, plain) {
  if (info && info.redNose && info.i === 0) rudolphNose(ctx, x, y, r * 1.15, flypastBlink(info.t || 0));
  else fill(ctx, plain, (c) => c.arc(x, y, r, 0, TAU));
}

// ------------------------------------------------------------------ B: caribou
// The real animal, simplified: dark brown body, the pale shaggy neck mane and bib that
// make a reindeer read as a reindeer rather than a deer, a pale flank stripe, white rump
// and scut, dark legs with pale socks, a long head with a dark squared muzzle and a
// black nose, an ear, and pale antlers with the forward brow tine over the face.
const CARIBOU = {
  body: '#6b4f3e', flank: '#a98c6f', mane: '#ece4d6', maneShade: '#cfc3b0', rump: '#e9e0d0',
  head: '#7a5b47', muzzle: '#4a372b', nose: '#1b1310', eye: '#140e0b',
  leg: '#4b372a', legFar: '#3b2b21', sock: '#e4dccd', hoof: '#221812',
  antler: '#d8c4a2', antlerShade: '#b39c7b', ink: 'rgba(40,30,24,0.55)',
};
function drawCaribou(ctx, x, y, s, phase, tilt, info, P = CARIBOU) {
  const g = gait(phase);
  ctx.save();
  ctx.translate(x, y - g.lift * s);
  ctx.rotate(tilt);
  ctx.scale(s, s);
  // Far legs, darker.
  leg(ctx, 4.4, -6.4, g.foreFar, g.foreBend(phase * TAU - 0.5), 3.2, 3.4, 1.05, P.legFar, null, P.hoof);
  leg(ctx, -5, -6.8, g.hindFar, -0.35, 3.3, 3.6, 1.15, P.legFar, null, P.hoof);
  // Body: deep chest, falling back to the rump.
  inked(ctx, P.body, P.ink, 0.35, (c) => {
    c.moveTo(-7.6, -8.6); c.quadraticCurveTo(-6.5, -11.4, -1, -11.2);
    c.quadraticCurveTo(4.5, -11.4, 6.4, -9.6); c.quadraticCurveTo(7.6, -7.2, 6, -5.8);
    c.quadraticCurveTo(0, -5, -6.2, -5.9); c.quadraticCurveTo(-8.2, -6.6, -7.6, -8.6); c.closePath();
  });
  // Pale flank stripe, low on the side.
  fill(ctx, P.flank, (c) => { c.ellipse(-0.6, -6.9, 5.4, 0.9, -0.03, 0, TAU); });
  // White rump patch and the scut.
  fill(ctx, P.rump, (c) => { c.ellipse(-6.9, -8.2, 1.05, 1.7, 0.25, 0, TAU); });
  fill(ctx, P.rump, (c) => { c.moveTo(-7.7, -9.6); c.lineTo(-8.9, -10.4); c.lineTo(-8.2, -9.2); c.closePath(); });
  // Neck, thick, reaching forward at the gallop, with the mane hanging under it.
  inked(ctx, P.mane, P.ink, 0.3, (c) => {
    c.moveTo(3.2, -10.6); c.quadraticCurveTo(6.5, -14.6, 9.4, -14.2);
    c.lineTo(10, -11.6); c.quadraticCurveTo(8.6, -9.2, 8.2, -7.2);
    c.lineTo(7.2, -6.2); c.lineTo(6.6, -7.3); c.lineTo(5.8, -6.4); c.lineTo(5.3, -7.6);
    c.quadraticCurveTo(4, -8.2, 3.2, -10.6); c.closePath();
  });
  stroke(ctx, P.maneShade, 0.35, (c) => { c.moveTo(6.2, -8.4); c.lineTo(7.6, -7.4); c.moveTo(7.4, -9.6); c.lineTo(8.6, -8.4); });
  // Head: long, a little down-turned, dark muzzle, black nose.
  inked(ctx, P.head, P.ink, 0.3, (c) => {
    c.moveTo(8.6, -15); c.quadraticCurveTo(10.8, -16, 12.8, -14.6);
    c.lineTo(14.6, -12.9); c.quadraticCurveTo(15, -11.8, 14, -11.5);
    c.lineTo(10.6, -11.3); c.quadraticCurveTo(8.7, -12, 8.6, -15); c.closePath();
  });
  fill(ctx, P.muzzle, (c) => { c.moveTo(12.6, -14.2); c.lineTo(14.6, -12.9); c.quadraticCurveTo(15, -11.8, 14, -11.5); c.lineTo(12.2, -11.4); c.closePath(); });
  noseAt(ctx, 14.45, -12.55, 0.62, info, P.nose);
  fill(ctx, P.eye, (c) => c.arc(11.2, -14.3, 0.42, 0, TAU));
  // Ear, laid back.
  fill(ctx, P.head, (c) => { c.moveTo(9.6, -15.3); c.lineTo(8.1, -16.9); c.lineTo(9.9, -15.9); c.closePath(); });
  // Antlers: two beams swept back and up with tines, the near one with the brow shovel
  // reaching forward over the face.
  stroke(ctx, P.antlerShade, 0.62, (c) => {
    c.moveTo(10.4, -15.6); c.quadraticCurveTo(9.2, -19.4, 6.6, -21.4);
    c.moveTo(8.7, -19.2); c.lineTo(9.8, -21.6);
    c.moveTo(7.4, -20.7); c.lineTo(7.6, -23);
  });
  stroke(ctx, P.antler, 0.72, (c) => {
    c.moveTo(10.9, -15.8); c.quadraticCurveTo(10.6, -20.2, 8.2, -22.6);
    c.moveTo(10.5, -19); c.lineTo(12, -21.2);
    c.moveTo(9.3, -21.5); c.lineTo(10, -23.8);
    c.moveTo(8.6, -22.4); c.lineTo(7, -23.6);
    // brow tine: forward and down over the face
    c.moveTo(10.9, -16.6); c.quadraticCurveTo(12.4, -17.4, 12.9, -16.3);
  });
  // Near legs.
  leg(ctx, 4, -6.3, g.foreNear, g.foreBend(phase * TAU), 3.2, 3.4, 1.15, P.leg, P.sock, P.hoof);
  leg(ctx, -5.4, -6.8, g.hindNear, -0.35, 3.3, 3.6, 1.25, P.leg, P.sock, P.hoof);
  ctx.restore();
}

// ------------------------------------------------------------------ C: storybook
// Warmer and rounder, the Christmas-card reindeer: a big head, a button nose, a
// catch-light in the eye, a cream bib, and curly three-tine antlers. Friendlier than B,
// less of a wild animal, closer to the sleigh team's cartoon.
const STORY = {
  body: '#9a6a48', bib: '#f1e3c8', belly: '#d9b88f', head: '#a4734f', snout: '#d9b88f',
  nose: '#241712', eye: '#1b120d', glint: '#ffffff', leg: '#6d4a33', legFar: '#56392a',
  hoof: '#2a1c14', antler: '#7a5436', tail: '#f5eee2', ink: 'rgba(52,36,26,0.6)',
};
function drawStorybook(ctx, x, y, s, phase, tilt, info, P = STORY) {
  const g = gait(phase);
  ctx.save();
  ctx.translate(x, y - g.lift * s);
  ctx.rotate(tilt);
  ctx.scale(s, s);
  leg(ctx, 4, -6.2, g.foreFar, g.foreBend(phase * TAU - 0.5), 3.1, 3.3, 1.2, P.legFar, null, P.hoof);
  leg(ctx, -4.6, -6.4, g.hindFar, -0.3, 3.1, 3.4, 1.3, P.legFar, null, P.hoof);
  inked(ctx, P.body, P.ink, 0.4, (c) => c.ellipse(-0.2, -8.6, 7, 3.6, -0.06, 0, TAU));
  fill(ctx, P.belly, (c) => c.ellipse(0.4, -6.4, 4.8, 1.3, 0, 0, TAU));
  // Tail tuft, cocked up.
  inked(ctx, P.tail, P.ink, 0.3, (c) => c.ellipse(-7.4, -10.4, 1.2, 0.8, -0.6, 0, TAU));
  // Neck and bib.
  inked(ctx, P.body, P.ink, 0.4, (c) => {
    c.moveTo(3.6, -11); c.quadraticCurveTo(6.4, -14.2, 8.8, -13.6);
    c.lineTo(9, -10.6); c.quadraticCurveTo(7.4, -9, 6.4, -6.6); c.closePath();
  });
  fill(ctx, P.bib, (c) => { c.ellipse(6.9, -9.2, 1.5, 2.4, -0.4, 0, TAU); });
  // Head: round, with a rounded snout and a button nose.
  inked(ctx, P.head, P.ink, 0.4, (c) => c.ellipse(10.2, -14.2, 2.7, 2.3, 0.15, 0, TAU));
  inked(ctx, P.snout, P.ink, 0.35, (c) => c.ellipse(12.6, -13, 1.7, 1.25, 0.25, 0, TAU));
  noseAt(ctx, 14, -12.7, 0.8, info, P.nose);
  fill(ctx, P.eye, (c) => c.arc(10.6, -15, 0.62, 0, TAU));
  fill(ctx, P.glint, (c) => c.arc(10.8, -15.2, 0.22, 0, TAU));
  // Ears.
  inked(ctx, P.head, P.ink, 0.3, (c) => { c.moveTo(8.4, -15.6); c.lineTo(6.6, -16.8); c.lineTo(8.8, -16.6); c.closePath(); });
  // Curly antlers, three tines a side.
  stroke(ctx, P.antler, 0.75, (c) => {
    for (const [bx, lean] of [[9.2, -0.2], [10.6, 0.2]]) {
      c.moveTo(bx, -16.3); c.quadraticCurveTo(bx - 1 + lean, -19.5, bx - 3 + lean, -21.2);
      c.moveTo(bx - 0.7 + lean, -18.4); c.quadraticCurveTo(bx + 0.8 + lean, -19.2, bx + 1 + lean, -20.6);
      c.moveTo(bx - 1.9 + lean, -20.2); c.quadraticCurveTo(bx - 0.9 + lean, -21.4, bx - 1 + lean, -22.8);
    }
  });
  leg(ctx, 3.6, -6.2, g.foreNear, g.foreBend(phase * TAU), 3.1, 3.3, 1.3, P.leg, null, P.hoof);
  leg(ctx, -5, -6.4, g.hindNear, -0.3, 3.1, 3.4, 1.4, P.leg, null, P.hoof);
  ctx.restore();
}

// ------------------------------------------------------------------ D: cut paper
// SHIPPED on 25 Sep: the painter moved into frostLandmarks.js as the herd's own deer.

// ------------------------------------------------------------------ the table
export const REINDEER_CANDIDATES = [
  {
    letter: 'A', id: 'v1', name: 'THE FIRST DEER — before this bake-off',
    note: 'What frost-2 drew until 25 Sep: a body, a head, swept antlers and no nose.',
    draw: (ctx, x, y, s, phase, tilt) => drawFrostDeerV1(ctx, x, y, s, phase, tilt),
  },
  {
    letter: 'B', id: 'caribou', name: 'CARIBOU — the real animal, simplified',
    note: 'Pale shaggy neck mane and bib, flank stripe, white rump, dark legs with pale socks, a long head '
      + 'with a dark muzzle and black nose, an ear, and pale antlers with a brow tine over the face. Jointed '
      + 'legs in a rotary gallop.',
    draw: drawCaribou,
  },
  {
    letter: 'C', id: 'storybook', name: 'STORYBOOK — the Christmas-card reindeer',
    note: 'Rounder and friendlier: a big head with a catch-light in the eye, a rounded snout with a button '
      + 'nose, a cream bib, a cocked tail tuft and curly three-tine antlers. Closest to the sleigh team\'s cartoon.',
    draw: drawStorybook,
  },
  {
    letter: 'D', id: 'paper', name: 'CUT PAPER — SHIPS (without the red nose)',
    note: 'SHIPS, 25 Sep 2026: "Let\'s do D - drop the red nose though." B\'s anatomy cut from flat paper: no '
      + 'ink line, each piece over a hazy paper shadow, colours pulled toward the far ridge. Now the game\'s own '
      + 'deer (frostLandmarks.js drawDeer); the red-nosed tile stays only as the option that was offered.',
    draw: (ctx, x, y, s, phase, tilt, info) => drawFrostDeer(ctx, x, y, s, phase, tilt, {
      nose: info && info.redNose && info.i === 0
        ? (c, nx, ny, r) => rudolphNose(c, nx, ny, r * 1.15, flypastBlink(info.t || 0)) : null,
    }),
  },
  // THE ANTLERS, round two (Peter, 25 Sep 2026, after asking whether anything made them
  // stand out against the snow: "Let me see both options for the antlers"). D's cream strips sit on the pale sky above the crest and all but
  // vanish. Both options are the shipped deer with only the antlers changed, through
  // drawFrostDeer's `antler` seam.
  {
    letter: 'E', id: 'antler-brown', antlerStudy: true, name: 'D WITH BROWN ANTLERS',
    note: 'The shipped deer with antlers in the first deer\'s mid-brown (#6a5240): a dark cut strip against the '
      + 'pale sky, the way the old herd read. Loses the pale-antler caribou note.',
    draw: (ctx, x, y, s, phase, tilt) => drawFrostDeer(ctx, x, y, s, phase, tilt, {
      antler: { fill: '#6a5240' },
    }),
  },
  {
    letter: 'F', id: 'antler-edged', antlerStudy: true, name: 'D WITH EDGED CREAM ANTLERS',
    note: 'The shipped cream antlers laid on a dark brown paper backing a hair wider on each side, so the pale '
      + 'strip keeps its colour and gets an outline against the sky.',
    draw: (ctx, x, y, s, phase, tilt) => drawFrostDeer(ctx, x, y, s, phase, tilt, {
      antler: { edge: '#4e3c30', edgeWidth: 0.35 },
    }),
  },
];
