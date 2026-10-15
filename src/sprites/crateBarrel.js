// THE BOX AND THE BARREL, one each for the whole game (Peter, 15 Oct 2026, from the
// generic bake-off: "i think i like A & E" — the X-crate and the arcade barrel). Flat and
// front-on in the bold hand of the 15 Oct obstacles; the barrel is Kong's wood and the
// LCD tower barrel's bellied silhouette, the one he throws. sprites/props.js's `crate`
// and `barrel` paint these; src/dev/generic-crate-barrel-candidates.js keeps the rest of
// the sheet and imports its helpers back from here.
//
// Each is authored in its PAINTED ENVELOPE in world units — box x 4/3 — with the ground
// at y = h: the crate 16x15, the barrel 17x17.

import { outlined } from './outline.js';
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- the hand
const INK = '#2a1a16';
const LW = 0.55; // outline
const LWI = 0.34; // interior line
const LWF = 0.2; // fine line

// Kong's wood (LCD_BARREL_BODY / _LID), a shade and a lit step either side.
const OAK = '#a9743a', OAK_DK = '#74491f', OAK_LT = '#d9a35e';
// Crate pine: the same warm family a step lighter, so box and barrel are kin.
const PINE = '#c58c48', PINE_DK = '#8c5a26', PINE_LT = '#ecbb76', PINE_GAP = '#4e2f14';
// The frame's shaded boards: half a step down, NOT the recessed panel's PINE_DK — in
// that tone the right-hand board merged into the panel beside it and the crate lost its
// right edge (Peter, 16 Oct 2026: "we sort of lose the wood on the right edge").
const PINE_SH = '#a9733a';
// The heavy crate's stained timber.
const STAIN = '#8e5630', STAIN_DK = '#5e341a', STAIN_LT = '#bb7c48';
// Hoops and brackets: the LCD panel's print grey (LCD_PRINT 60,63,69).
const IRON = '#3c3f45', IRON_LT = '#7c828d';

function pen(c, ink, lw) {
  c.strokeStyle = ink;
  c.lineWidth = lw;
  c.lineJoin = 'round';
  c.lineCap = 'round';
}
function fs(c, fill, ink, lw) {
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (ink && lw > 0) { pen(c, ink, lw); c.stroke(); }
}
function box(c, x, y, w, h, fill, ink, lw) { c.beginPath(); c.rect(x, y, w, h); fs(c, fill, ink, lw); }
function line(c, x0, y0, x1, y1, ink, lw) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); pen(c, ink, lw); c.stroke(); }
function circ(c, x, y, r, fill, ink, lw) { c.beginPath(); c.arc(x, y, Math.max(0.01, r), 0, TAU); fs(c, fill, ink, lw); }
function ell(c, x, y, rx, ry, fill, ink, lw, rot = 0) {
  c.beginPath();
  c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
  fs(c, fill, ink, lw);
}
function rrPath(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
// Fill a path, paint `inner` clipped to it, then stroke the path's contour.
function body(c, path, fill, inner = null, ink = INK, lw = LW) {
  c.save();
  c.beginPath();
  path(c);
  c.fillStyle = fill;
  c.fill();
  if (inner) { c.clip(); inner(c); }
  c.restore();
  if (!ink) return;
  c.beginPath();
  path(c);
  pen(c, ink, lw);
  c.stroke();
}
const rect = (x, y, w, h) => (p) => p.rect(x, y, w, h);
const rrect = (x, y, w, h, r) => (p) => rrPath(p, x, y, w, h, r);
const shape = (pts) => (p) => {
  p.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]);
  p.closePath();
};

// ------------------------------------------------------------------ boxes
// The block every box shares: the full 16 wide, from just under the top to the
// ground line, corners barely softened so it reads as a solid block and two of
// them meet flush.
const BX0 = 0.45, BX1 = 15.55, BY0 = 0.45;
const bY1 = (h) => h - 0.3;
const block = (h) => rrect(BX0, BY0, BX1 - BX0, bY1(h) - BY0, 0.5);

// A — CLASSIC X-CRATE. The platformer crate everyone knows, said loudly: a
// light frame of four boards, a darker recessed panel of planks, and the X
// brace across it. Lit sliver along the top board, shade band down the right.
function crateX(c, w, h) {
  const Y1 = bY1(h), F = 2.3;
  const iX0 = BX0 + F, iX1 = BX1 - F, iY0 = BY0 + F, iY1 = Y1 - F;
  body(c, block(h), PINE, (p) => {
    // The recessed panel and its plank joints.
    box(p, iX0, iY0, iX1 - iX0, iY1 - iY0, PINE_DK);
    for (const y of [iY0 + (iY1 - iY0) / 3, iY0 + (2 * (iY1 - iY0)) / 3]) line(p, iX0, y, iX1, y, PINE_GAP, LWF * 1.4);
    // The X: two boards, each its own outlined band, the second over the first.
    const bw = 1.05;
    for (const [ax, ay, bx2, by2] of [[iX0, iY1, iX1, iY0], [iX0, iY0, iX1, iY1]]) {
      const dx = bx2 - ax, dy = by2 - ay, L = Math.hypot(dx, dy);
      const nx = (-dy / L) * bw, ny = (dx / L) * bw;
      p.save();
      p.beginPath(); p.rect(iX0, iY0, iX1 - iX0, iY1 - iY0); p.clip();
      body(p, shape([ax + nx - dx * 0.1, ay + ny - dy * 0.1, bx2 + nx + dx * 0.1, by2 + ny + dy * 0.1,
        bx2 - nx + dx * 0.1, by2 - ny + dy * 0.1, ax - nx - dx * 0.1, ay - ny - dy * 0.1]), PINE, (q) => {
        box(q, iX0 + (iX1 - iX0) * 0.62, 0, 20, h, PINE_DK + '80');
      }, INK, LWI);
      p.restore();
    }
    // Lit sliver on the top board, shade on the right board. The shade is the board
    // itself, cut to its mitres like the left one — as a full-height band it ran up
    // through the end of the top board and read as a separate plank nailed on
    // (Peter, 16 Oct 2026: "still not totally happy with the plank on the right side").
    box(p, BX0, BY0, BX1 - BX0, 0.7, PINE_LT);
    p.beginPath();
    shape([iX1, iY0, BX1 + 1, BY0 - 1, BX1 + 1, Y1 + 1, iX1, iY1])(p);
    p.fillStyle = PINE_SH;
    p.fill();
    box(p, BX0, Y1 - 0.8, BX1 - BX0, 0.8, PINE_SH);
  });
  // The frame's inner edge.
  box(c, iX0, iY0, iX1 - iX0, iY1 - iY0, null, INK, LWI);
  // Frame board mitres at the corners.
  for (const [x0, y0, x1, y1] of [[BX0, BY0, iX0, iY0], [BX1, BY0, iX1, iY0], [BX0, Y1, iX0, iY1], [BX1, Y1, iX1, iY1]]) line(c, x0, y0, x1, y1, INK, LWF);
  // Nails, one per corner.
  for (const [x, y] of [[BX0 + 1.15, BY0 + 1.15], [BX1 - 1.15, BY0 + 1.15], [BX0 + 1.15, Y1 - 1.15], [BX1 - 1.15, Y1 - 1.15]]) circ(c, x, y, 0.32, INK);
}
// ---------------------------------------------------------------- barrels
// The bellied cask as a parabola in y: half-width END at both ends, BELLY across
// the middle. A quadratic Bezier with its control at 2*BELLY-END traces it
// exactly, so the path and xAt() are the same curve.
function cask(cx, cy, HH, END, BELLY) {
  const xAt = (y) => {
    const u = (y - cy) / HH;
    return END + (BELLY - END) * (1 - u * u);
  };
  const ctl = 2 * BELLY - END;
  const path = (p) => {
    p.moveTo(cx - END, cy - HH);
    p.lineTo(cx + END, cy - HH);
    p.quadraticCurveTo(cx + ctl, cy, cx + END, cy + HH);
    p.lineTo(cx - END, cy + HH);
    p.quadraticCurveTo(cx - ctl, cy, cx - END, cy - HH);
    p.closePath();
  };
  return { xAt, path };
}
// A band that follows the belly between y0 and y1 (a hoop, a lit stave...).
function bandPath(cx, xAt, y0, y1, s0 = -1, s1 = 1, steps = 8) {
  return (p) => {
    for (let i = 0; i <= steps; i++) {
      const y = y0 + ((y1 - y0) * i) / steps;
      const x = cx + s1 * xAt(y);
      if (i === 0) p.moveTo(x, y); else p.lineTo(x, y);
    }
    for (let i = steps; i >= 0; i--) {
      const y = y0 + ((y1 - y0) * i) / steps;
      p.lineTo(cx + s0 * xAt(y), y);
    }
    p.closePath();
  };
}
// A stave joint at fraction s of the half-width, bowing with the belly.
function staveLine(p, cx, xAt, y0, y1, s) {
  for (let i = 0; i <= 10; i++) {
    const y = y0 + ((y1 - y0) * i) / 10;
    const x = cx + s * xAt(y);
    if (i === 0) p.moveTo(x, y); else p.lineTo(x, y);
  }
}
// The standard dressing: shade band down the right, a lit stave on the left,
// stave joints, then iron hoops at the given centre fractions of HH.
function dressCask(c, cx, cy, HH, xAt, path, { staves, hoops, hoopH, lit = [-0.74, -0.5], shade = 0.5 }) {
  const Y0 = cy - HH, Y1 = cy + HH;
  body(c, path, OAK, (p) => {
    p.beginPath(); bandPath(cx, xAt, Y0, Y1, shade, 1.2)(p); p.fillStyle = OAK_DK; p.fill();
    p.beginPath(); bandPath(cx, xAt, Y0 + 1.4, Y1 - 1.4, lit[0], lit[1])(p); p.fillStyle = OAK_LT; p.fill();
    p.beginPath();
    for (const s of staves) staveLine(p, cx, xAt, Y0, Y1, s);
    pen(p, INK, LWF * 1.4); p.stroke();
  });
  for (const u of hoops) {
    const y0 = cy + u * HH - hoopH / 2, y1 = y0 + hoopH;
    body(c, bandPath(cx, xAt, y0, y1, -1.06, 1.06), IRON, (p) => {
      box(p, 0, y0, 40, Math.min(0.42, hoopH * 0.3), IRON_LT);
    }, INK, LWI);
  }
  // The outline again over the hoop ends, so the silhouette is one ink.
  c.beginPath(); path(c); pen(c, INK, LW); c.stroke();
}

// E — THE ARCADE BARREL. Front-on, bellied, two dark hoops a third of the way
// in from each end, five staves, the lit stave left and the shade right. The
// lane barrel's own recipe (props.js) at full ink: the closest thing to "the
// barrel" there is.
function barrelArcade(c, w, h) {
  const cx = w / 2, cy = h / 2, HH = 7.25, END = 4.3, BELLY = 7.4;
  const { xAt, path } = cask(cx, cy, HH, END, BELLY);
  dressCask(c, cx, cy, HH, xAt, path, {
    staves: [-0.6, -0.2, 0.2, 0.6], hoops: [-0.56, 0.56], hoopH: 1.55,
  });
}

export {
  TAU, INK, LW, LWI, LWF, OAK, OAK_DK, OAK_LT, PINE, PINE_DK, PINE_LT, PINE_GAP, STAIN, STAIN_DK, STAIN_LT, IRON, IRON_LT, pen, fs, box, line, circ, ell, rrPath, body, rect, rrect, shape, BX0, BX1, BY0, bY1, block, crateX, cask, bandPath, staveLine, dressCask, barrelArcade,
};

// props.js hands these the raster size; the envelope is scaled onto it.
const envelope = (paint, ew, eh) => (ctx, w, h) => {
  ctx.save();
  ctx.scale(w / ew, h / eh);
  paint(ctx, ew, eh);
  ctx.restore();
};
export const paintCrate = outlined(envelope(crateX, 16, 15));
export const paintBarrel = outlined(envelope(barrelArcade, 17, 17));
