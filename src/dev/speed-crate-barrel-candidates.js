// Gallery-only SPEED ZONE crate and barrel: the generic platformer box and
// barrel redrawn in the mid-century road's hand (15 Oct 2026). Peter: "a new box
// and barrel in the new style" — the picked prickly pear, dynamite, barrel cactus,
// smudge pot and sawhorse sit beside the shared warehouse crate and saloon barrel.
//
// THE HAND is sprites/speedProps.js, imported rather than copied: printed as the
// backdrop is — a slipped ink KEY plate under flat colour plates, one shade band,
// one lit sliver, the dry-brush grain — front-on and flat, as the dynamite and the
// smudge pot are. Period: the desert road trip of the late '80s.
//
// THE COORDINATES. Each painter fills its PAINTED ENVELOPE in world units with the
// ground at y = h: the box 16x15 (crate 12x11 x 4/3), the barrel 17x17 (13x13 x
// 4/3). The barrel is drawn still, upright and centred; the run spins the whole
// drawing about its centre as it rolls.
//
// Nothing here is registered in any gameplay registry.
import {
  burst, INK, TOMATO, TOMATO_DK, TOMATO_LT, MUSTARD, MUSTARD_DK, MUSTARD_LT, CREAM, CREAM_DK,
  CHROME, CHROME_DK, CHROME_LT, REFLECT, TEAL, TEAL_DK, BLACK, BLACK_LT,
  oval, rect, rrect, poly, key, keyFine, plate, fill, grain, rule, contour, glint,
} from '../sprites/speedProps.js';

const frameOf = (t, n, fps) => ((Math.floor(t * fps) % n) + n) % n;

// A — ICE CHEST (stack 16x15). The road-trip cooler fallen off a station wagon:
// a teal tub, a cream lid proud of it, a chrome latch and side handle. The latch
// catches the sun on its ring.
function speedBox(c, w, h, t) {
  const f = frameOf(t, 12, 6), g = h - 0.3;
  const TUB = rrect(1.4, 6.0, 12.6, g - 6.0, 1.0);
  const LID = rrect(0.8, 2.6, 13.8, 3.9, 1.1);
  const HANDLE = rrect(14.0, 8.6, 1.4, 3.2, 0.5);
  const LATCH = rrect(6.2, 4.8, 3.0, 2.8, 0.5);
  key(c, TUB, LID, HANDLE);
  keyFine(c, LATCH);
  plate(c, HANDLE, CHROME_DK);
  plate(c, TUB, TEAL, (p) => {
    // The shade band down the left, as the backdrop splits its masses.
    p.fillStyle = TEAL_DK;
    p.fillRect(0, 0, 2.6, h);
    // The tub's moulded foot, a band in shade.
    p.fillRect(0, g - 1.5, w, 1.5);
    // The lit sliver down the sun side.
    p.fillStyle = '#5cc6bc';
    p.fillRect(12.2, 7.0, 0.55, g - 9.0);
    grain(p, 0.16);
  });
  // A cream stripe moulded round the tub: the period's two-tone.
  plate(c, rect(1.4, 9.4, 12.6, 1.4), CREAM, (p) => {
    p.fillStyle = CREAM_DK;
    p.fillRect(0, 0, 2.6, h);
  });
  contour(c, rect(1.4, 9.4, 12.6, 1.4), 0.24, 0.7);
  plate(c, LID, CREAM, (p) => {
    p.fillStyle = CREAM_DK;
    p.fillRect(0, 0, 2.2, h);
    p.fillRect(0, 5.4, w, 1.2);
    p.fillStyle = '#ffffff';
    p.fillRect(3.0, 3.2, 10.6, 0.5);
    grain(p, 0.12);
  });
  contour(c, LID, 0.3, 0.85);
  plate(c, LATCH, CHROME, (p) => {
    p.fillStyle = CHROME_DK;
    p.fillRect(6.2, 0, 0.9, h);
    p.fillStyle = REFLECT;
    p.fillRect(6.2, 6.0, 3.0, 0.7);
  });
  if (f === 3) glint(c, 8.6, 5.2, 1.7);
}

// B — OIL DRUM (barrel 17x17). A tomato 55-gallon drum off a road-works truck:
// two rolling hoops pressed into it in chrome with the turquoise sky in them, a
// mustard band round the belly, a bung on the lid rim.
function speedBarrel(c, w, h) {
  const cx = w / 2, Y0 = 1.2, Y1 = h - 1.2, HW = 6.9;
  const DRUM = rrect(cx - HW, Y0, HW * 2, Y1 - Y0, 4.4);
  const RIB_Y = [Y0 + (Y1 - Y0) * 0.31, Y0 + (Y1 - Y0) * 0.69];
  const ribs = RIB_Y.map((y) => rrect(cx - HW + 0.25, y - 0.7, HW * 2 - 0.5, 1.4, 0.7));
  const BUNG = rrect(cx - 0.6, Y0 - 0.5, 2.2, 1.1, 0.3);
  key(c, DRUM, ...ribs, BUNG);
  plate(c, BUNG, CHROME_DK);
  plate(c, DRUM, TOMATO, (p) => {
    p.fillStyle = TOMATO_DK;
    p.fillRect(cx - HW - 1, 0, 2.8, h);
    // The rolled chimes at the ends, a step darker.
    p.fillRect(0, Y0, w, 1.0);
    p.fillRect(0, Y1 - 1.0, w, 1.0);
    p.fillStyle = TOMATO_LT;
    p.fillRect(cx + HW - 1.7, Y0 + 3.4, 0.55, Y1 - Y0 - 6.8);
    // The belly band, mustard, between the hoops.
    p.fillStyle = MUSTARD;
    p.fillRect(0, h / 2 - 1.3, w, 2.6);
    p.fillStyle = MUSTARD_DK;
    p.fillRect(cx - HW - 1, h / 2 - 1.3, 2.8, 2.6);
    p.fillStyle = MUSTARD_LT;
    p.fillRect(0, h / 2 - 1.3, w, 0.45);
    grain(p, 0.16);
  });
  rule(c, [cx - HW + 0.3, h / 2 - 1.3, cx + HW - 0.3, h / 2 - 1.3], 0.24, INK, 0.7);
  rule(c, [cx - HW + 0.3, h / 2 + 1.3, cx + HW - 0.3, h / 2 + 1.3], 0.24, INK, 0.7);
  for (const [i, rib] of ribs.entries()) {
    const y = RIB_Y[i];
    plate(c, rib, CHROME, (p) => {
      p.fillStyle = CHROME_DK;
      p.fillRect(0, 0, cx - HW + 2.0, h);
      p.fillStyle = REFLECT;
      p.fillRect(0, y - 0.1, w, 0.55);
      p.fillStyle = CHROME_LT;
      p.fillRect(0, y - 0.7, w, 0.3);
    });
    contour(c, rib, 0.24, 0.8);
  }
}

export const CRATE_BARREL = {
  cabinet: 'speed',
  candidates: [
    { letter: 'A', id: 'speedBox', name: 'ICE CHEST', slot: 'stack', paint: speedBox,
      note: 'The road-trip cooler off a station wagon\'s roof: a teal tub with a cream two-tone stripe, a cream lid proud of it, a chrome latch that catches the sun. Printed over the slipped ink key like the dynamite. Replaces the crate; stacks two high.' },
    { letter: 'B', id: 'speedBarrel', name: 'OIL DRUM', slot: 'barrel', paint: speedBarrel,
      note: 'A tomato 55-gallon drum off a road-works truck: chrome rolling hoops with the turquoise sky in them, a mustard belly band, a bung on the rim. Drawn still and near-square; the run rolls it. Replaces the barrel.' },
  ],
};
