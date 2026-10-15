// Gallery-only FIELD SERVICE crate and barrel: the generic platformer box and
// barrel redrawn in the countryside hand (15 Oct 2026). Peter: "a new box and
// barrel in the new style" — the picked hive, scarecrow and hay bale sit beside
// the shared crate and barrel, which now look like another game's.
//
// THE HAND is sprites/plumberProps.js, imported rather than copied: one warm ink
// at LW, flat fills, one lit sliver and one shade band, saturated against the
// muted paper hills. The box is drawn in the hay bale's three-quarter (front face,
// lit top, shaded end going back up-right) so the two stack slots match.
//
// THE COORDINATES. Each painter fills its PAINTED ENVELOPE in world units with the
// ground at y = h: the box 16x15 (crate 12x11 x 4/3), the barrel 17x17 (13x13 x
// 4/3). The barrel is drawn still and upright; the run spins the whole drawing
// about its centre as it rolls, so it is drawn centred and nearly as wide as it is
// tall — a bellied cask that reads round at every angle.
//
// Nothing here is registered in any gameplay registry.
import {
  INK, LW, LWI, LWF, RED, RED_DK, RED_LT, TIMBER, TIMBER_DK, TIMBER_LT, STEEL, STEEL_DK, STEEL_LT,
  CHAR_DK, box, line, circ, ell, body, rect, shape,
} from '../sprites/plumberProps.js';

const frameOf = (t, n, fps) => ((Math.floor(t * fps) % n) + n) % n;

// A — APPLE CRATE (stack 16x15). An orchard field box: three timber slats a face
// with dark gaps between, corner posts, a heap of red apples over the rim. One
// apple's shine winks on its ring.
function plumberBox(c, w, h, t) {
  const f = frameOf(t, 10, 6), g = h - 0.2;
  const X0 = 0.8, X1 = 12.6, TOP = 4.8, DX = 2.6, DY = -2.2;
  // The end, going back in shade: two slats and a gap.
  body(c, shape([X1, TOP, X1 + DX, TOP + DY, X1 + DX, g + DY, X1, g]), TIMBER_DK, (p) => {
    for (const y of [TOP + 3.2, TOP + 6.6]) {
      p.beginPath();
      p.moveTo(X1, y); p.lineTo(X1 + DX, y + DY); p.lineTo(X1 + DX, y + DY + 0.9); p.lineTo(X1, y + 0.9);
      p.closePath();
      p.fillStyle = CHAR_DK; p.fill();
    }
  });
  // The open top: the dark inside, then the apples heaped in it.
  body(c, shape([X0, TOP, X1, TOP, X1 + DX, TOP + DY, X0 + DX, TOP + DY]), CHAR_DK, null, INK, LWI);
  const APPLES = [[3.6, TOP - 1.4], [7.0, TOP - 1.9], [10.4, TOP - 1.5], [5.4, TOP - 0.5], [9.0, TOP - 0.4], [12.6, TOP - 1.2]];
  APPLES.forEach(([x, y], i) => {
    circ(c, x, y, 1.75, RED, INK, LWI);
    // The shade band on each apple's far side, then a lit sliver.
    c.save();
    c.beginPath(); c.arc(x, y, 1.75, 0, Math.PI * 2); c.clip();
    box(c, x + 0.7, y - 2, 2, 4, RED_DK);
    c.restore();
    circ(c, x, y, 1.75, null, INK, LWI);
    ell(c, x - 0.7, y - 0.6, 0.35, 0.6, i === f ? '#ffffff' : RED_LT);
    line(c, x + 0.1, y - 1.6, x + 0.5, y - 2.4, INK, 0.36);
  });
  // The front: three slats, two gaps, the lit sliver along each slat's top edge.
  const SLATS = [[TOP, TOP + 2.9], [TOP + 3.8, TOP + 6.5], [TOP + 7.4, g]];
  body(c, rect(X0, TOP, X1 - X0, g - TOP), CHAR_DK, (p) => {
    for (const [y0, y1] of SLATS) {
      box(p, X0, y0, X1 - X0, y1 - y0, TIMBER);
      box(p, X0, y0, X1 - X0, 0.5, TIMBER_LT);
      box(p, X0, y1 - 0.6, X1 - X0, 0.6, TIMBER_DK);
    }
    // The corner posts, a stop darker, holding the slats.
    box(p, X0, TOP, 1.5, g - TOP, TIMBER_DK);
    box(p, X1 - 1.5, TOP, 1.5, g - TOP, TIMBER_DK);
  });
  for (const [y0, y1] of SLATS.slice(0, 2)) line(c, X0, y1, X1, y1, INK, LWI);
  for (const [y0] of SLATS.slice(1)) line(c, X0, y0, X1, y0, INK, LWI);
  line(c, X0 + 1.5, TOP, X0 + 1.5, g, INK, LWF);
  line(c, X1 - 1.5, TOP, X1 - 1.5, g, INK, LWF);
  // Nail heads on the posts.
  for (const [y0, y1] of SLATS) {
    const y = (y0 + y1) / 2;
    circ(c, X0 + 0.75, y, 0.22, INK);
    circ(c, X1 - 0.75, y, 0.22, INK);
  }
}

// B — CIDER BARREL (barrel 17x17). An oak cask off the farm cart: bellied staves,
// two galvanised hoops and the chimes at both ends, a red bung on the belly.
function plumberBarrel(c, w, h) {
  const cx = w / 2, Y0 = 1.2, Y1 = h - 1.2, cy = (Y0 + Y1) / 2;
  const END = 5.4, BELLY = 7.4; // half-widths at the ends and across the belly
  const xAt = (y) => {
    const u = (y - cy) / (cy - Y0);
    return END + (BELLY - END) * (1 - u * u);
  };
  const cask = (p) => {
    p.moveTo(cx - END, Y0);
    p.lineTo(cx + END, Y0);
    p.quadraticCurveTo(cx + BELLY + (BELLY - END), cy, cx + END, Y1);
    p.lineTo(cx - END, Y1);
    p.quadraticCurveTo(cx - BELLY - (BELLY - END), cy, cx - END, Y0);
    p.closePath();
  };
  body(c, cask, TIMBER, (p) => {
    // The shade band down the far side, the lit sliver down the near.
    box(p, cx + 3.6, 0, 6, h, TIMBER_DK);
    box(p, cx - 4.9, Y0 + 1.6, 1.0, Y1 - Y0 - 3.2, TIMBER_LT);
    // Stave joints, bowing with the belly.
    p.beginPath();
    for (const s of [-0.62, -0.2, 0.22, 0.62]) {
      for (let i = 0; i <= 10; i++) {
        const y = Y0 + ((Y1 - Y0) * i) / 10;
        const x = cx + s * xAt(y);
        if (i === 0) p.moveTo(x, y); else p.lineTo(x, y);
      }
    }
    p.strokeStyle = INK; p.lineWidth = LWF * 1.3; p.stroke();
    // The chimes: the stave ends, darker, past the end hoops.
    box(p, 0, Y0, w, 1.0, TIMBER_DK);
    box(p, 0, Y1 - 1.0, w, 1.0, TIMBER_DK);
  });
  // Hoops: galvanised bands following the belly, each with its own lit edge.
  for (const [y, hh] of [[Y0 + 1.0, 1.1], [cy - 3.6, 1.4], [cy + 2.2, 1.4], [Y1 - 2.1, 1.1]]) {
    const xa = xAt(y) + 0.1, xb = xAt(y + hh) + 0.1;
    body(c, shape([cx - xa, y, cx + xa, y, cx + xb, y + hh, cx - xb, y + hh]), STEEL, (p) => {
      box(p, cx + 3.6, 0, 6, h, STEEL_DK);
      box(p, 0, y, w, 0.35, STEEL_LT);
    }, INK, LWI);
  }
  // The bung, in the belly between the hoops.
  body(c, rect(cx - 1.0, cy - 0.8, 2.0, 1.6), RED, (p) => box(p, cx + 0.3, 0, 1, h, RED_DK), INK, LWI);
  // And the outline again over the hoop ends, so the silhouette is one ink.
  c.beginPath(); cask(c);
  c.strokeStyle = INK; c.lineWidth = LW; c.lineJoin = 'round'; c.stroke();
}

export const CRATE_BARREL = {
  cabinet: 'plumber',
  candidates: [
    { letter: 'A', id: 'plumberBox', name: 'APPLE CRATE', slot: 'stack', paint: plumberBox,
      note: 'An orchard field box: timber slats with dark gaps, corner posts, a heap of red apples over the rim, one shine winking. Drawn in the hay bale\'s three-quarter so the two stack slots match. Replaces the crate; stacks two high.' },
    { letter: 'B', id: 'plumberBarrel', name: 'CIDER BARREL', slot: 'barrel', paint: plumberBarrel,
      note: 'An oak cask off the farm cart: bellied staves, galvanised hoops, dark chimes at the ends and a red bung. Drawn still and nearly round; the run rolls it. Replaces the barrel.' },
  ],
};
