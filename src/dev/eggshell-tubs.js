// The clown-copter's TUB, as a shape question. Gallery only.
//
// Peter, 4 Sep 2026: "maybe his vehicle is more shaped like half an egg? Give
// me a bake-off with a few options / colours." The shipped tub is a rounded
// rectangle in circus cream and red — a bucket, drawn before he was an egg
// scientist and kept through every redesign since. A half egg would say the
// same thing his name does, and it is the one part of him nobody has asked.
//
// Every option below draws into the SAME footprint the shipped tub occupies —
// the 24x20 ape box, rim at 0.58, floor at 0.94 — so the ape, his fists and
// the rim they rest on never move between tiles, and only the hull changes.
// Nothing here is registered: port a winner by copying its body into
// eggshellTub in sprites/props.js.
import { egP, egLine, egDot, rr, EG_TAU, EG_LINE, EG_LW } from '../sprites/props.js';

// The circus palette the shipped tub uses, and the alternatives the sheet asks
// about. Each is [hull, stripe, trim] — a tile changes all three at once,
// because a hull colour without its stripe is not an option anyone would ship.
export const TUB_PALETTES = {
  circus: ['#f0f0f8', '#c83030', '#d0d0dc'],
  shell: ['#e8e0c8', '#b8a888', '#cfc4a6'],
  brass: ['#e6d2a8', '#9c6b32', '#c9ab72'],
  steel: ['#c8ced8', '#5a6270', '#9aa2b0'],
  cape: ['#e9ebf2', '#23232e', '#b9bdc9'],
};

// A half egg: the wide end up at the rim, the narrow end down, so it is the
// bottom half of the egg he is named for. `taper` pulls the floor in.
function halfEgg(k, X, Y, taper = 0.52, top = 0.6, bot = 0.94) {
  const cx = X(0.5), rx = X(0.38), ty = Y(top), by = Y(bot);
  k.moveTo(cx - rx, ty);
  k.bezierCurveTo(cx - rx, ty + (by - ty) * 0.62, cx - rx * taper, by, cx, by);
  k.bezierCurveTo(cx + rx * taper, by, cx + rx, ty + (by - ty) * 0.62, cx + rx, ty);
  k.closePath();
}

const rim = (c, X, Y, trim) => egP(c, trim, (k) => rr(k, X(0.1), Y(0.58), X(0.8), Y(0.08), X(0.03)), EG_LINE, EG_LW * 0.7);
const lamps = (c, X, Y) => { egDot(c, '#f6d33c', X(0.19), Y(0.8), X(0.045), EG_LINE, EG_LW * 0.5); egDot(c, '#f6d33c', X(0.81), Y(0.8), X(0.045), EG_LINE, EG_LW * 0.5); };
const skids = (c, X, Y, hull) => { for (const sx of [0.2, 0.64]) egP(c, hull, (k) => rr(k, X(sx), Y(0.9), X(0.16), Y(0.08), X(0.02)), EG_LINE, EG_LW * 0.7); };

export const EGGSHELL_TUBS = [
  {
    id: 'bucket', name: 'THE BUCKET (SHIPS)', pal: 'circus',
    note: 'The rounded rectangle he has always flown: three vertical stripes, a trim rim, two lamps, two skids. The reference.',
    paint(c, X, Y, [hull, stripe, trim]) {
      skids(c, X, Y, hull);
      egP(c, hull, (k) => rr(k, X(0.12), Y(0.6), X(0.76), Y(0.34), X(0.07)), EG_LINE, EG_LW);
      for (const sx of [0.24, 0.46, 0.68]) egP(c, stripe, (k) => rr(k, X(sx), Y(0.66), X(0.08), Y(0.24), X(0.01)));
      rim(c, X, Y, trim); lamps(c, X, Y);
    },
  },
  {
    id: 'halfegg', name: 'HALF EGG', pal: 'shell',
    note: 'The bottom half of an egg, wide at the rim and drawn in to the floor. The shape his name has been asking for, in eggshell cream with a shell-brown band.',
    paint(c, X, Y, [hull, stripe, trim]) {
      skids(c, X, Y, hull);
      egP(c, hull, (k) => halfEgg(k, X, Y), EG_LINE, EG_LW);
      egP(c, stripe, (k) => { k.moveTo(X(0.14), Y(0.7)); k.quadraticCurveTo(X(0.5), Y(0.78), X(0.86), Y(0.7)); k.lineTo(X(0.86), Y(0.76)); k.quadraticCurveTo(X(0.5), Y(0.84), X(0.14), Y(0.76)); k.closePath(); });
      rim(c, X, Y, trim); lamps(c, X, Y);
    },
  },
  {
    id: 'halfegg-crack', name: 'HALF EGG, CRACKED RIM', pal: 'shell',
    note: 'The same hull with the rim broken into a zigzag, as though he is sitting in the shell he came out of. The only option that is a joke on its own.',
    paint(c, X, Y, [hull, stripe, trim]) {
      skids(c, X, Y, hull);
      egP(c, hull, (k) => halfEgg(k, X, Y, 0.52, 0.63), EG_LINE, EG_LW);
      egP(c, trim, (k) => {
        const pts = [0.62, 0.58, 0.64, 0.57, 0.63, 0.59, 0.62];
        k.moveTo(X(0.11), Y(0.66));
        pts.forEach((y, i) => k.lineTo(X(0.11 + (i + 1) * 0.111), Y(y)));
        k.lineTo(X(0.89), Y(0.7)); k.lineTo(X(0.11), Y(0.7)); k.closePath();
      }, EG_LINE, EG_LW * 0.7);
      lamps(c, X, Y);
    },
  },
  {
    id: 'halfegg-circus', name: 'HALF EGG, CIRCUS', pal: 'circus',
    note: 'The half-egg hull in the colours he flies today, so the shape can be judged without the palette changing under it. Stripes follow the curve rather than standing upright.',
    paint(c, X, Y, [hull, stripe, trim]) {
      skids(c, X, Y, hull);
      egP(c, hull, (k) => halfEgg(k, X, Y), EG_LINE, EG_LW);
      c.save();
      c.beginPath(); halfEgg(c, X, Y); c.clip();
      for (const sx of [0.24, 0.46, 0.68]) egP(c, stripe, (k) => k.rect(X(sx), Y(0.58), X(0.08), Y(0.4)));
      c.restore();
      rim(c, X, Y, trim); lamps(c, X, Y);
    },
  },
  {
    id: 'halfegg-brass', name: 'HALF EGG, BRASS', pal: 'brass',
    note: 'Warm brass with a dark band and rivets: a machine he built rather than a prop he borrowed. The most "professor" of the palettes.',
    paint(c, X, Y, [hull, stripe, trim]) {
      skids(c, X, Y, hull);
      egP(c, hull, (k) => halfEgg(k, X, Y), EG_LINE, EG_LW);
      egP(c, stripe, (k) => { k.moveTo(X(0.13), Y(0.72)); k.quadraticCurveTo(X(0.5), Y(0.8), X(0.87), Y(0.72)); k.lineTo(X(0.87), Y(0.77)); k.quadraticCurveTo(X(0.5), Y(0.85), X(0.13), Y(0.77)); k.closePath(); });
      for (const sx of [0.22, 0.35, 0.5, 0.65, 0.78]) egDot(c, trim, X(sx), Y(0.66), X(0.014));
      rim(c, X, Y, trim); lamps(c, X, Y);
    },
  },
  {
    id: 'halfegg-steel', name: 'HALF EGG, STEEL', pal: 'steel',
    note: 'Cold steel with a dark band. Reads as equipment, and is the only option that does not look like it belongs to a circus.',
    paint(c, X, Y, [hull, stripe, trim]) {
      skids(c, X, Y, hull);
      egP(c, hull, (k) => halfEgg(k, X, Y), EG_LINE, EG_LW);
      egP(c, stripe, (k) => { k.moveTo(X(0.13), Y(0.71)); k.quadraticCurveTo(X(0.5), Y(0.79), X(0.87), Y(0.71)); k.lineTo(X(0.87), Y(0.78)); k.quadraticCurveTo(X(0.5), Y(0.86), X(0.13), Y(0.78)); k.closePath(); });
      rim(c, X, Y, trim); lamps(c, X, Y);
    },
  },
  {
    id: 'halfegg-cape', name: 'HALF EGG, CAPE BLACK', pal: 'cape',
    note: 'The cape\'s own two inks: near-white hull, black band. He and his machine finally match, which is either the point or too much of it.',
    paint(c, X, Y, [hull, stripe, trim]) {
      skids(c, X, Y, hull);
      egP(c, hull, (k) => halfEgg(k, X, Y), EG_LINE, EG_LW);
      egP(c, stripe, (k) => { k.moveTo(X(0.13), Y(0.7)); k.quadraticCurveTo(X(0.5), Y(0.78), X(0.87), Y(0.7)); k.lineTo(X(0.87), Y(0.77)); k.quadraticCurveTo(X(0.5), Y(0.85), X(0.13), Y(0.77)); k.closePath(); });
      rim(c, X, Y, trim); lamps(c, X, Y);
    },
  },
  {
    id: 'eggcup', name: 'EGG CUP', pal: 'shell',
    note: 'The half egg on a stem and foot, like a boiled egg served for breakfast. The silliest silhouette and the only one that changes his outline against the sky.',
    paint(c, X, Y, [hull, stripe, trim]) {
      egP(c, trim, (k) => rr(k, X(0.36), Y(0.9), X(0.28), Y(0.06), X(0.02)), EG_LINE, EG_LW * 0.7);
      egP(c, trim, (k) => rr(k, X(0.45), Y(0.84), X(0.1), Y(0.08), X(0.02)));
      egP(c, hull, (k) => halfEgg(k, X, Y, 0.42, 0.6, 0.86), EG_LINE, EG_LW);
      egP(c, stripe, (k) => { k.moveTo(X(0.16), Y(0.7)); k.quadraticCurveTo(X(0.5), Y(0.77), X(0.84), Y(0.7)); k.lineTo(X(0.84), Y(0.75)); k.quadraticCurveTo(X(0.5), Y(0.82), X(0.16), Y(0.75)); k.closePath(); });
      rim(c, X, Y, trim); lamps(c, X, Y);
    },
  },
];

const BY_ID = Object.fromEntries(EGGSHELL_TUBS.map((t) => [t.id, t]));
// The tub only — the gallery hands this to the shipped copter as a `tub` part,
// so the ape above it is the real drawing and not a stand-in.
export const eggshellTubPart = (id) => (c, X, Y) => {
  const t = BY_ID[id];
  if (!t) throw new Error(`unknown tub: ${id}`);
  t.paint(c, X, Y, TUB_PALETTES[t.pal]);
};
