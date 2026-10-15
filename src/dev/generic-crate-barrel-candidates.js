// Gallery-only GENERIC crate and barrel: the one box and the one barrel every
// cabinet shares, redrawn in the bold 15 Oct 2026 hand (solid dark outline, flat
// fills, one lit sliver and one shade band). Peter, after a per-cabinet round:
// "id rather keep them generic throughout as a constant.. esp the barrel which
// needs to be kicked deliberately (and we want it to match kong is throwing in
// the background). Just a generic box and barrel please that will work
// everywhere".
//
// SO NOTHING HERE BELONGS TO A CABINET. Warm wood, no text, no props, no
// brand. What makes one drawing sit on blue sky, sand, snow, violet night,
// neon night, the LCD's green panel and the pastel office alike is the INK:
// a solid near-black contour at LW all the way round, so the silhouette is
// carried by the line, not by contrast with whatever is behind it.
//
// THE BARREL IS KONG'S BARREL. The Rhythm Bankruptcy gorilla throws the lane
// barrel's own drawing (stylePacks/index.js, LCD_BARREL_SHAPE 'ingame'): wood
// LCD_BARREL_BODY #a9743a, lid #c48b4c, hoops in the panel's print grey,
// bellied and pulled in at both ends. Every barrel below keeps that wood, those
// hoops and that silhouette family; they differ in proportion and hoop count.
//
// THE COORDINATES. Each painter fills its PAINTED ENVELOPE in world units with
// the ground at y = h: the box 16x15 (crate 12x11 x 4/3), the barrel 17x17
// (13x13 x 4/3). The run spins the barrel about the envelope's centre
// (draw.js, rotate(-t * 6)), so every barrel is drawn centred and kept inside
// a radius of ~8.4 of it — no corner leaves the envelope at any angle. The box
// stacks two high at a 13u step, so its top 2u is overdrawn by the box above:
// nothing that matters lives there, and the bottom edge is a full solid board
// so the join between the two reads as one clean line.
//
// NO PERSPECTIVE. Every drawing is flat and front-on: no top plane, no
// receding side, no lid or end face (props.js: "the toaster owns the 3D
// exception"). The crate's bands and the barrel's chimes are flat stripes on
// the front, not edges seen from above.
//
// Static drawings: t is ignored. Nothing here is registered in any gameplay
// registry.

import {
  TAU, INK, LW, LWI, LWF, OAK, OAK_DK, OAK_LT, PINE, PINE_DK, PINE_LT, PINE_GAP, STAIN, STAIN_DK, STAIN_LT, IRON, IRON_LT, pen, fs, box, line, circ, ell, rrPath, body, rect, rrect, shape, BX0, BX1, BY0, bY1, block, crateX, cask, bandPath, staveLine, dressCask, barrelArcade,
} from '../sprites/crateBarrel.js';

// B — PLANK CRATE WITH CORNER BRACKETS. Four horizontal planks with dark gaps
// between, held at every corner by an iron L-bracket with two rivets. Reads as
// boards first, block second; the brackets are what stop it being a fence.
function cratePlank(c, w, h) {
  const Y1 = bY1(h), gap = 0.55;
  const ph = (Y1 - BY0 - 3 * gap) / 4;
  body(c, block(h), PINE_GAP, (p) => {
    for (let i = 0; i < 4; i++) {
      const y = BY0 + i * (ph + gap);
      box(p, BX0, y, BX1 - BX0, ph, PINE);
      box(p, BX0, y, BX1 - BX0, 0.55, PINE_LT);
      // A butt joint, staggered plank to plank.
      const jx = [10.6, 5.2, 11.4, 4.4][i];
      line(p, jx, y, jx, y + ph, PINE_GAP, LWF * 1.5);
      if (i < 3) line(p, BX0, y + ph, BX1, y + ph, INK, LWI);
      if (i > 0) line(p, BX0, y, BX1, y, INK, LWI);
    }
    // Shade band down the right-hand end.
    box(p, BX1 - 2.6, BY0, 3, Y1 - BY0, PINE_DK + 'b0');
  });
  // The brackets: an L at each corner, rivets light on the iron.
  const A = 4.1, T = 1.35;
  const corners = [[BX0, BY0, 1, 1], [BX1, BY0, -1, 1], [BX0, Y1, 1, -1], [BX1, Y1, -1, -1]];
  for (const [x, y, sx, sy] of corners) {
    body(c, shape([x, y, x + sx * A, y, x + sx * A, y + sy * T, x + sx * T, y + sy * T, x + sx * T, y + sy * A, x, y + sy * A]), IRON, (p) => {
      box(p, Math.min(x, x + sx * A), sy > 0 ? y : y + sy * T, A, 0.35, IRON_LT);
    }, INK, LWI);
    circ(c, x + sx * 0.7, y + sy * 0.7, 0.28, IRON_LT);
    circ(c, x + sx * (A - 0.75), y + sy * 0.68, 0.24, IRON_LT);
    circ(c, x + sx * 0.68, y + sy * (A - 0.75), 0.24, IRON_LT);
  }
  c.beginPath(); block(h)(c); pen(c, INK, LW); c.stroke();
}

// C — LID-BAND CRATE. Vertical planks between a flat, darker band across the top
// and a foot band across the bottom, a nail at each plank end. The plainest
// block of the four: no brace, no iron, the bands do the framing.
function crateBand(c, w, h) {
  const Y1 = bY1(h), LID = 3.3, FOOT = 2.5;
  const n = 5, pw = (BX1 - BX0) / n;
  body(c, block(h), PINE, (p) => {
    // Plank joints and a lit edge on each plank's left.
    for (let i = 0; i < n; i++) {
      const x = BX0 + i * pw;
      box(p, x + 0.25, BY0, 0.45, Y1 - BY0, PINE_LT + 'a0');
      if (i) line(p, x, BY0, x, Y1, INK, LWI);
    }
    // Shade band down the right.
    box(p, BX1 - 2.4, BY0, 3, Y1 - BY0, PINE_DK + 'a8');
    // The lid band: a step darker, its own lit sliver on top.
    body(p, rect(BX0 - 1, BY0 - 1, BX1 - BX0 + 2, LID + 1), PINE_DK, (q) => {
      box(q, BX0, BY0, BX1 - BX0, 0.65, PINE);
      box(q, BX1 - 2.4, BY0, 3, LID, '#00000026');
    }, INK, LWI);
    // The foot band.
    body(p, rect(BX0 - 1, Y1 - FOOT, BX1 - BX0 + 2, FOOT + 1), PINE_DK, (q) => {
      box(q, BX0, Y1 - FOOT, BX1 - BX0, 0.5, PINE);
      box(q, BX1 - 2.4, Y1 - FOOT, 3, FOOT, '#00000026');
    }, INK, LWI);
  });
  // Nails: two on each band, then one per plank where it meets each band.
  for (let i = 0; i < n; i++) {
    const x = BX0 + (i + 0.5) * pw;
    circ(c, x, BY0 + LID * 0.6, 0.28, INK);
    circ(c, x, Y1 - FOOT * 0.5, 0.28, INK);
  }
  c.beginPath(); block(h)(c); pen(c, INK, LW); c.stroke();
}

// D — HEAVY CRATE. Stained dark timber, a thick frame, a panel of planks and
// two iron straps wrapped over it top to bottom with a bolt where each crosses
// the frame. Darker on purpose — the "this one is solid" box — but still warm
// enough to separate from a night sky, and the ink keeps the block whole.
function crateHeavy(c, w, h) {
  const Y1 = bY1(h), F = 1.9;
  const iX0 = BX0 + F, iX1 = BX1 - F, iY0 = BY0 + F, iY1 = Y1 - F;
  body(c, block(h), STAIN, (p) => {
    box(p, iX0, iY0, iX1 - iX0, iY1 - iY0, STAIN_DK);
    // Panel planks, each with a lit edge.
    const pn = 3, ph = (iY1 - iY0) / pn;
    for (let i = 0; i < pn; i++) {
      const y = iY0 + i * ph;
      box(p, iX0, y + 0.25, iX1 - iX0, ph - 0.5, STAIN);
      box(p, iX0, y + 0.25, iX1 - iX0, 0.45, STAIN_LT);
    }
    box(p, BX0, BY0, BX1 - BX0, 0.7, STAIN_LT);
    box(p, BX1 - 2.6, BY0, 3, Y1 - BY0, '#00000038');
  });
  box(c, iX0, iY0, iX1 - iX0, iY1 - iY0, null, INK, LWI);
  // Two straps, top to bottom, with a lit sliver.
  for (const sx of [3.6, 10.6]) {
    body(c, rect(sx, BY0, 1.8, Y1 - BY0), IRON, (p) => box(p, sx, BY0, 0.4, Y1 - BY0, IRON_LT), INK, LWI);
    for (const y of [BY0 + F / 2, Y1 - F / 2]) circ(c, sx + 0.9, y, 0.38, IRON_LT, INK, LWF);
  }
  c.beginPath(); block(h)(c); pen(c, INK, LW); c.stroke();
}


// F — PAIRED HOOPS. Flat and front-on like the rest (no lid, no end face: the
// toaster owns the 3D exception): a slightly taller cask with its hoops in
// PAIRS, a thin chime hoop right at each end and a broad quarter hoop inside
// it, and the belly left clear. Four hoops but no middle band, so it never
// turns into a striped ball when it spins; the clear belly is the spot to kick.
function barrelPaired(c, w, h) {
  const cx = w / 2, cy = h / 2, HH = 7.35, END = 4.15, BELLY = 7.2;
  const { xAt, path } = cask(cx, cy, HH, END, BELLY);
  const Y0 = cy - HH, Y1 = cy + HH;
  body(c, path, OAK, (p) => {
    p.beginPath(); bandPath(cx, xAt, Y0, Y1, 0.5, 1.2)(p); p.fillStyle = OAK_DK; p.fill();
    p.beginPath(); bandPath(cx, xAt, Y0 + 1.4, Y1 - 1.4, -0.74, -0.5)(p); p.fillStyle = OAK_LT; p.fill();
    p.beginPath();
    for (const s of [-0.62, -0.2, 0.2, 0.6]) staveLine(p, cx, xAt, Y0, Y1, s);
    pen(p, INK, LWF * 1.4); p.stroke();
  });
  // Hoops clipped to the cask, so the chime hoops cannot notch the corners.
  c.save(); c.beginPath(); path(c); c.clip();
  for (const [u, hh] of [[-0.89, 1.05], [-0.52, 1.5], [0.52, 1.5], [0.89, 1.05]]) {
    const y0 = cy + u * HH - hh / 2, y1 = y0 + hh;
    body(c, bandPath(cx, xAt, y0, y1, -1.1, 1.1), IRON, (p) => {
      box(p, 0, y0, 40, Math.min(0.42, hh * 0.3), IRON_LT);
    }, INK, LWI);
  }
  c.restore();
  c.beginPath(); path(c); pen(c, INK, LW); c.stroke();
}

// G — THE FAT ONE. A cartoon cask: nearly round, belly the full width of the
// envelope, two chunky hoops and a big oval shine. The most "boot me" of the
// four — it already looks like it wants to roll.
function barrelFat(c, w, h) {
  const cx = w / 2, cy = h / 2, HH = 6.85, END = 4.75, BELLY = 8.05;
  const { xAt, path } = cask(cx, cy, HH, END, BELLY);
  // Ends softened: a rounded cap rather than the crisp chime.
  const fat = (p) => {
    const r = 1.1;
    p.moveTo(cx - END + r, cy - HH);
    p.lineTo(cx + END - r, cy - HH);
    p.quadraticCurveTo(cx + END, cy - HH, cx + END + 0.35, cy - HH + 0.8);
    p.quadraticCurveTo(cx + 2 * BELLY - END + 0.4, cy, cx + END + 0.35, cy + HH - 0.8);
    p.quadraticCurveTo(cx + END, cy + HH, cx + END - r, cy + HH);
    p.lineTo(cx - END + r, cy + HH);
    p.quadraticCurveTo(cx - END, cy + HH, cx - END - 0.35, cy + HH - 0.8);
    p.quadraticCurveTo(cx - (2 * BELLY - END) - 0.4, cy, cx - END - 0.35, cy - HH + 0.8);
    p.quadraticCurveTo(cx - END, cy - HH, cx - END + r, cy - HH);
    p.closePath();
  };
  const Y0 = cy - HH, Y1 = cy + HH;
  body(c, fat, OAK, (p) => {
    p.beginPath(); bandPath(cx, xAt, Y0 - 1, Y1 + 1, 0.42, 1.3)(p); p.fillStyle = OAK_DK; p.fill();
    p.beginPath();
    for (const s of [-0.38, 0.06]) staveLine(p, cx, xAt, Y0, Y1, s);
    pen(p, INK, LWF * 1.4); p.stroke();
    // End chimes, a step darker.
    box(p, 0, Y0, w, 0.9, OAK_DK);
    box(p, 0, Y1 - 0.9, w, 0.9, OAK_DK);
  });
  for (const u of [-0.5, 0.5]) {
    const y0 = cy + u * HH - 1.05, y1 = y0 + 2.1;
    body(c, bandPath(cx, xAt, y0, y1, -1.04, 1.04), IRON, (p) => box(p, 0, y0, 40, 0.5, IRON_LT), INK, LWI);
  }
  // The shine: a big oval on the upper-left belly, between the hoops.
  ell(c, cx - 4.1, cy - 0.2, 0.95, 1.9, OAK_LT, null, 0, 0.12);
  ell(c, cx - 4.35, cy - 1.0, 0.38, 0.62, '#f6d7a2', null, 0, 0.12);
  c.beginPath(); fat(c); pen(c, INK, LW); c.stroke();
}

// H — KONG'S OWN. The LCD tower barrel's proportions and layout exactly
// (lcdBarrelPath 'ingame', RX 8 RY 7 scaled to fit the spin radius): lying on
// its side, a snapped silhouette with the ends pulled in on a shoulder, hoops
// standing upright near each end, staves running the way it rolls, the lit
// stave along the top and a seam shade along the bottom. At rest it is the
// barrel the gorilla holds overhead; spun, it is the one he threw.
function barrelKong(c, w, h) {
  const cx = w / 2, cy = h / 2;
  const k = 0.88, RX = 8 * k, RY = 7 * k;
  const END = 2 * k, SH = 1 * k, r = 2 * k, a = 4 * k;
  const L = cx - RX, R = cx + RX, T = cy - RY, B = cy + RY;
  const top = [[L, END], [L + r, SH], [cx - a, 0], [cx + a, 0], [R - r, SH], [R, END]];
  const sil = (p) => {
    p.moveTo(top[0][0], T + top[0][1]);
    for (const [px, i] of top) p.lineTo(px, T + i);
    for (let j = top.length - 1; j >= 0; j--) p.lineTo(top[j][0], B - top[j][1]);
    p.closePath();
  };
  body(c, sil, OAK, (p) => {
    // Seam shade along the bottom, lit stave along the top.
    box(p, L, B - 2.9, 2 * RX, 3, OAK_DK);
    box(p, cx - a - 1.5, T + 1.0, 2 * a + 3, 1.25, OAK_LT);
    // Stave joints running the length.
    for (const u of [0.34, 0.66]) line(p, L, T + 2 * RY * u, R, T + 2 * RY * u, INK, LWF * 1.4);
  });
  // Hoops upright at the shoulders, where his hands close on it.
  const hoopIn = 4.4 * k, hw = 1.45;
  for (const hx of [cx - RX + hoopIn - hw / 2, cx + RX - hoopIn - hw / 2]) {
    c.save(); c.beginPath(); sil(c); c.clip();
    box(c, hx, T - 1, hw, 2 * RY + 2, IRON);
    box(c, hx, T - 1, 0.42, 2 * RY + 2, IRON_LT);
    line(c, hx, T - 1, hx, B + 1, INK, LWI);
    line(c, hx + hw, T - 1, hx + hw, B + 1, INK, LWI);
    c.restore();
  }
  c.beginPath(); sil(c); pen(c, INK, LW); c.stroke();
}

export const GENERIC_CRATE_BARREL = {
  candidates: [
    { letter: 'A', id: 'crateX', name: 'X-CRATE', slot: 'stack', paint: crateX,
      note: 'The classic platformer crate, loud: light four-board frame, darker plank panel, the X brace across it, a nail at each corner. Lit top board, shaded right board. Stacks flush two high.' },
    { letter: 'B', id: 'cratePlank', name: 'BRACKET CRATE', slot: 'stack', paint: cratePlank,
      note: 'Four horizontal planks with dark gaps and staggered butt joints, an iron L-bracket with rivets at every corner. Reads as boards held together; the brackets carry the block at a distance.' },
    { letter: 'C', id: 'crateBand', name: 'BAND CRATE', slot: 'stack', paint: crateBand,
      note: 'The plainest block: five vertical planks between a darker flat top band and a foot band (front-on stripes, not a lid seen from above), a nail where each plank meets a band. No brace, no iron, nothing to read but box.' },
    { letter: 'D', id: 'crateHeavy', name: 'HEAVY CRATE', slot: 'stack', paint: crateHeavy,
      note: 'Dark stained timber, a thick frame round a plank panel and two iron straps wrapped top to bottom with a bolt at each end. The solid one; still warm against a night sky.' },
    { letter: 'E', id: 'barrelArcade', name: 'ARCADE BARREL', slot: 'barrel', paint: barrelArcade,
      note: 'Kong\'s wood front-on: bellied, pulled in at both ends, two dark hoops a third in, four stave joints, lit stave left, shade right. The lane barrel\'s recipe at full ink.' },
    { letter: 'F', id: 'barrelPaired', name: 'PAIRED-HOOP BARREL', slot: 'barrel', paint: barrelPaired,
      note: 'Flat and front-on, a touch taller: hoops in pairs — a thin chime hoop at each end and a broad one inside it — with the belly left clear. No middle band, so it never spins into a striped ball.' },
    { letter: 'G', id: 'barrelFat', name: 'FAT BARREL', slot: 'barrel', paint: barrelFat,
      note: 'The cartoon one: nearly round, belly the full envelope, two chunky hoops, dark chimes and a big oval shine. Already looks like it wants to roll — and to be booted.' },
    { letter: 'H', id: 'barrelKong', name: 'KONG\'S BARREL', slot: 'barrel', paint: barrelKong,
      note: 'The LCD tower barrel\'s exact layout (lcdBarrelPath \'ingame\'): on its side, snapped shoulders, hoops upright near the ends, staves along its length, lit top and shaded bottom. At rest it is the one the gorilla holds.' },
  ],
};
