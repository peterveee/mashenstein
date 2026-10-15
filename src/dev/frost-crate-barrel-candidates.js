// Gallery-only FROST FORTRESS crate and barrel: the generic platformer box and
// barrel redrawn in the snow's hand (15 Oct 2026). Peter: "a new box and barrel in
// the new style" — the picked ice blocks, parcels, giant snowball, crampons and
// caltrops sit beside the shared warehouse crate and saloon barrel.
//
// THE HAND is sprites/frostProps.js, imported rather than copied: cut pieces with
// a paper shadow a hair down and back, flat fills, crayon hatching for the shade
// band, one lit sliver, the slate ink over all of it. The box is drawn in the ice
// block's three-quarter so the stack slots match; the colours are the gondola
// cabins' yellow and red, which stand off both the white snow and the dusk slate.
//
// THE COORDINATES. Each painter fills its PAINTED ENVELOPE in world units with the
// ground at y = h: the box 16x15 (crate 12x11 x 4/3), the barrel 17x17 (13x13 x
// 4/3). The barrel is drawn still, upright and centred; the run spins the whole
// drawing about its centre as it rolls — so its frost is rime that clings all the
// way round, never a cap of snow that would roll upside down.
//
// Nothing here is registered in any gameplay registry.
import {
  INK, LW, LWI, LWF, SNOW, SNOW_SH, GOLD, GOLD_DK, GOLD_LT, LIFT, LIFT_DK, LIFT_LT,
  STEEL, STEEL_DK, STEEL_LT, jit, line, box, poly, rect, shape, rr, piece, hatch, glint, icicle, snowCap,
} from '../sprites/frostProps.js';

const frameOf = (t, n, fps) => ((Math.floor(t * fps) % n) + n) % n;

// A — SUPPLY CRATE (stack 16x15). The fortress's stores, sledged up the pass: a
// slatted crate painted the lift cabins' yellow, steel corner plates, a crust of
// snow on the lid and two icicles off its front lip; the steel catches the light.
function frostBox(c, w, h, t) {
  const f = frameOf(t, 12, 8), g = h - 0.2;
  const X0 = 0.8, X1 = 12.6, TOP = 4.6, DX = 2.8, DY = -2.2;
  // The end, going back in the cold shade, hatched.
  piece(c, shape([X1, TOP, X1 + DX, TOP + DY, X1 + DX, g + DY, X1, g]), GOLD_DK, (p) => {
    hatch(p, X1, TOP + DY, X1 + DX, g, '#8e6410', 0.85, 0.24, 3);
    line(p, X1, TOP + 5.0, X1 + DX, TOP + 5.0 + DY, INK, LWI);
  });
  // The lid.
  piece(c, shape([X0, TOP, X1, TOP, X1 + DX, TOP + DY, X0 + DX, TOP + DY]), GOLD_LT, null, { lw: LWI, shadow: false });
  // The front: two wide slats either side of a cross-batten.
  piece(c, rect(X0, TOP, X1 - X0, g - TOP), GOLD, (p) => {
    box(p, X0, g - 2.0, X1 - X0, 2.0, GOLD_DK);
    hatch(p, X0, g - 2.0, X1, g, '#a87812', 0.9, 0.22, 5);
    box(p, X0 + 2.0, TOP + 0.7, 0.7, g - TOP - 3.2, GOLD_LT);
    // The board joins.
    line(p, X0, TOP + 3.4, X1, TOP + 3.4, INK, LWF * 1.4);
    line(p, X0, TOP + 6.8, X1, TOP + 6.8, INK, LWF * 1.4);
  });
  // The cross-batten, corner to corner, a darker board nailed over the face.
  poly(c, [X0 + 1.4, g - 0.4, X0 + 1.4, g - 2.4, X1 - 1.4, TOP + 0.4, X1 - 1.4, TOP + 2.4], GOLD_DK, INK, LWI);
  // Steel corner plates, the far top one in shade.
  const plate = (x, y, sx, sy) => poly(c, [x, y, x + 2.2 * sx, y, x + 2.2 * sx, y + 0.9 * sy, x + 0.9 * sx, y + 0.9 * sy,
    x + 0.9 * sx, y + 2.2 * sy, x, y + 2.2 * sy], STEEL, INK, LWI);
  plate(X0, TOP, 1, 1);
  plate(X1, TOP, -1, 1);
  plate(X0, g, 1, -1);
  plate(X1, g, -1, -1);
  // Snow lying along the lid, two icicles off its front lip.
  snowCap(c, X0 + 0.6, X1 + 2.0, TOP + DY * 0.45, 1.5, 6, 0.3);
  icicle(c, 4.6, TOP + 0.2, 2.2, 0.6);
  icicle(c, 9.6, TOP + 0.2, 1.5, 0.5);
  // The steel catches the light.
  const s = [0, 0, 0, 0, 0.7, 1.5, 1.0, 0.4, 0, 0, 0, 0][f];
  glint(c, X0 + 0.9, TOP + 0.9, s);
}

// B — FUEL DRUM (barrel 17x17). The generator's diesel, rolled down from the
// fortress: the lift cabins' red, two steel rolling hoops, rime clinging round
// the rim all the way round, and the bung on the lid.
function frostBarrel(c, w, h) {
  const cx = w / 2, Y0 = 1.2, Y1 = h - 1.2, HW = 6.8, R = 4.8;
  const drum = rr(cx - HW, Y0, HW * 2, Y1 - Y0, R);
  const RIBS = [Y0 + (Y1 - Y0) * 0.32, Y0 + (Y1 - Y0) * 0.68];
  piece(c, drum, LIFT, (p) => {
    // The shade band down the far side, crayon-hatched; the lit sliver down the near.
    box(p, cx + HW - 3.4, 0, 4, h, LIFT_DK);
    p.save();
    p.beginPath();
    p.rect(cx + HW - 3.4, 0, 4, h);
    p.clip();
    hatch(p, cx + HW - 3.4, 0, cx + HW + 1, h, '#8a2a20', 0.85, 0.24, 7);
    p.restore();
    box(p, cx - HW + 1.4, Y0 + 3.2, 0.8, Y1 - Y0 - 6.4, LIFT_LT);
    // The rolled chimes at the ends.
    box(p, 0, Y0, w, 1.0, LIFT_DK);
    box(p, 0, Y1 - 1.0, w, 1.0, LIFT_DK);
    // Rime: frost crusted into both chimes, a ragged white lip hanging off each
    // end — at either end of the roll it is still frost on the rim.
    for (const [y, dir, seed] of [[Y0, 1, 3], [Y1, -1, 8]]) {
      p.beginPath();
      p.moveTo(0, y);
      p.lineTo(0, y + dir * 1.0);
      for (let i = 0; i < 6; i++) {
        const x0 = (w * i) / 6, x1 = (w * (i + 1)) / 6;
        p.quadraticCurveTo((x0 + x1) / 2, y + dir * (1.5 + jit(seed, i) * 0.9), x1, y + dir * 1.0);
      }
      p.lineTo(w, y);
      p.closePath();
      p.fillStyle = SNOW;
      p.fill();
      p.strokeStyle = SNOW_SH;
      p.lineWidth = 0.22;
      p.stroke();
    }
  });
  // The steel hoops.
  for (const y of RIBS) {
    piece(c, rr(cx - HW + 0.1, y - 0.75, HW * 2 - 0.2, 1.5, 0.6), STEEL, (p) => {
      box(p, cx + HW - 3.4, 0, 4, h, STEEL_DK);
      box(p, 0, y - 0.75, w, 0.4, STEEL_LT);
    }, { lw: LWI, shadow: false });
  }
  // The bung, in the near chime.
  piece(c, rr(cx - 3.8, Y0 - 0.2, 2.2, 1.3, 0.3), STEEL, (p) => box(p, cx - 2.4, 0, 1, h, STEEL_DK), { lw: LWI, shadow: false });
  // The ink once more round the whole drum, so the silhouette is one line.
  c.beginPath();
  drum(c);
  c.strokeStyle = INK;
  c.lineWidth = LW;
  c.stroke();
}

export const CRATE_BARREL = {
  cabinet: 'frost',
  candidates: [
    { letter: 'A', id: 'frostBox', name: 'SUPPLY CRATE', slot: 'stack', paint: frostBox,
      note: 'The fortress\'s stores sledged up the pass: a slatted crate in the lift cabins\' yellow with a cross-batten, steel corner plates, snow on the lid and two icicles off the lip; a corner glints. In the ice block\'s three-quarter. Replaces the crate; stacks two high.' },
    { letter: 'B', id: 'frostBarrel', name: 'FUEL DRUM', slot: 'barrel', paint: frostBarrel,
      note: 'The generator\'s diesel rolled down from the fortress: a red drum with steel hoops and rime crusted round the rim — frost that clings, so it reads at any angle of the roll. Replaces the barrel.' },
  ],
};
