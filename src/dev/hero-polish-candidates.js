// Gallery-only: LORENZO and RAMON, POLISHED — an idle-pose bake-off (16 Oct 2026).
//
// Peter: "lets do a bake off for a different more polished version of ramon and lorenzo
// … don't go crazy, just do the idle poses for now". So: the same two characters — same
// costume, same colours (HERO_SPRITES palettes), same front-on idle the menus use — drawn
// again from scratch with more finish. Nothing here touches TOON_SPECS or the run painter;
// NOW on the sheet is the shipped drawToon idle for comparison.
//
// Three takes per hero, built from one painter with two dials:
//   finish  'cel'  — solid ink outline, one hard shadow tone, a lit edge and spec glints
//           'soft' — no black ink: each shape outlined in a darker shade of its own
//                    colour, the shadow airbrushed — a storybook finish
//   pose    'stand' — the menu stance, tidied
//           'attitude' — the same figure given something to do while he waits
//
// THE SHADING TRICK: every part is a closed path, and its shadow is that path minus a
// copy of itself nudged up-left (light from the top-left, as the cast is lit). The
// crescent that's left is the shadow. So any shape shades itself, with no per-part
// shadow drawing, and the two finishes differ only in how that crescent is painted.
//
// Coordinates: 100 units = the figure's height, feet at (0, 0), y up is negative.

const TAU = Math.PI * 2;
// One dial for every stroke on the sheet — outline, interior lines, lit edges. 1 was the
// first draw; Peter asked for a finer line (16 Oct), 0.55 was too fine, so 0.7.
const LINE_WEIGHT = 0.7;
const INK = '#1a1028';

// Shipped palettes (src/sprites/heroes.js), with the shade tones this sheet adds.
const LOR = {
  cap: '#7b4bd0', skin: '#f2c9a0', nose: '#e8a878', hair: '#5a3212', shirt: '#2ea8a0',
  pants: '#22608c', boot: '#5a3212', belt: '#5a3212', brass: '#f6d33c', eye: '#1a1028',
  white: '#ffffff', steel: '#c9ced8', wrenchRed: '#d8453a',
};
const RAM = {
  hair: '#f6d33c', skin: '#f0c090', scarf: '#d85050', body: '#28a8a0', glove: '#f5f2e8',
  shoe: '#f06038', sole: '#f5f2e8', eye: '#171126', white: '#ffffff', brow: '#4a3a3a',
};

// ---------------------------------------------------------------- colour
function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgb([r, g, b]) { return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`; }
// Shade toward a cool violet rather than black — shadows that keep the colour alive.
function shade(c, k) {
  const [r, g, b] = hex(c), t = [52, 30, 84];
  return rgb([r + (t[0] - r) * k, g + (t[1] - g) * k, b + (t[2] - b) * k]);
}
function tint(c, k) {
  const [r, g, b] = hex(c), t = [255, 250, 232];
  return rgb([r + (t[0] - r) * k, g + (t[1] - g) * k, b + (t[2] - b) * k]);
}

// ---------------------------------------------------------------- paths
const P = () => new Path2D();
function ell(x, y, rx, ry, rot = 0) { const p = P(); p.ellipse(x, y, rx, ry, rot, 0, TAU); return p; }
function poly(pts, smooth = 0) {
  // Closed path through points; `smooth` rounds every corner by that fraction.
  const p = P(), n = pts.length / 2;
  if (!smooth) { p.moveTo(pts[0], pts[1]); for (let i = 1; i < n; i++) p.lineTo(pts[i * 2], pts[i * 2 + 1]); p.closePath(); return p; }
  const pt = (i) => [pts[((i + n) % n) * 2], pts[((i + n) % n) * 2 + 1]];
  const mid = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  const s = mid(pt(0), pt(1), 0.5);
  p.moveTo(s[0], s[1]);
  for (let i = 1; i <= n; i++) {
    const a = pt(i - 1), b = pt(i), c = pt(i + 1);
    const inn = mid(b, a, smooth * 0.5), out = mid(b, c, smooth * 0.5);
    p.lineTo(inn[0], inn[1]); p.quadraticCurveTo(b[0], b[1], out[0], out[1]);
  }
  p.closePath();
  return p;
}
function moved(path, dx, dy) { const p = P(); p.addPath(path, new DOMMatrix().translate(dx, dy)); return p; }

// ---------------------------------------------------------------- the pen
// One `pen` per drawing: knows the finish and how many screen px a unit is, so a line
// never falls under a pixel at the hub's 46px.
function makePen(ctx, finish, pxPerU, lod) {
  // `lod`: drawn small (the hub, a lane) — fine interior lines and lit edges go, ink thins.
  const ink = (lw) => Math.max((lod ? lw * 0.8 : lw) * LINE_WEIGHT, 0.6 / pxPerU);
  const cel = finish === 'cel';
  return {
    cel,
    // A shape with its own shadow crescent and outline.
    part(path, base, { sx = 3, sy = 3, deep = 0.32, lw = 1.6, lit = true, line = null } = {}) {
      ctx.fillStyle = base; ctx.fill(path);
      ctx.save(); ctx.clip(path);
      const lit_ = moved(path, -sx, -sy);
      if (cel) {
        // hard crescent: shadow everywhere, then the lit copy over it
        ctx.fillStyle = shade(base, deep); ctx.fillRect(-200, -200, 400, 400);
        ctx.fillStyle = base; ctx.fill(lit_);
        if (lit && !lod) { ctx.strokeStyle = tint(base, 0.45); ctx.lineWidth = ink(0.9); ctx.stroke(moved(path, sx * 0.55, sy * 0.55)); }
      } else {
        ctx.filter = `blur(${Math.max(0.6, 2.2 * pxPerU)}px)`;
        ctx.fillStyle = shade(base, deep * 0.9); ctx.fillRect(-200, -200, 400, 400);
        ctx.fillStyle = base; ctx.fill(lit_);
        ctx.fillStyle = tint(base, 0.28); ctx.fill(moved(path, -sx * 2.2, -sy * 2.2));
        ctx.filter = 'none';
      }
      ctx.restore();
      ctx.strokeStyle = line || (cel ? INK : shade(base, 0.62));
      ctx.lineWidth = ink(cel ? lw : lw * 0.8);
      ctx.lineJoin = 'round'; ctx.stroke(path);
    },
    // A flat shape: outline only, no shading (eye whites, buttons).
    flat(path, base, lw = 1.2, line = null) {
      ctx.fillStyle = base; ctx.fill(path);
      ctx.strokeStyle = line || (cel ? INK : shade(base, 0.62));
      ctx.lineWidth = ink(cel ? lw : lw * 0.8); ctx.lineJoin = 'round'; ctx.stroke(path);
    },
    // An interior line — a seam, a crease, a mouth.
    line(path, col, lw = 1.1) {
      if (lod && lw < 1) return;
      ctx.strokeStyle = cel ? (col || INK) : shade(col || '#6a4a5a', 0.3);
      ctx.lineWidth = ink(lw); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(path);
    },
    fill(path, col) { ctx.fillStyle = col; ctx.fill(path); },
    glint(x, y, r) {
      if (lod && r < 1) return;
      ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fill(ell(x, y, r, r * 0.8, -0.5)); },
  };
}

function groundShadow(ctx, w, alpha = 0.28) {
  ctx.fillStyle = `rgba(10,6,24,${alpha})`;
  ctx.fill(ell(0, 0, w, w * 0.16));
}

// Blink: ~0.13s shut every 3.7s, with a double blink every third one.
function blinkShut(t, seed) {
  const T = 3.7, k = ((t + seed) % (T * 3) + T * 3) % (T * 3);
  const inBlink = (a) => k > a && k < a + 0.13;
  return inBlink(T * 0.8) || inBlink(T * 1.8) || inBlink(T * 2.8) || inBlink(T * 2.8 + 0.24);
}

// Eyes shared by both: a white with an ink rim, a big pupil that sits low and inward,
// a glint, and a lid that comes down for the blink and rests a touch over the top.
function eye(ctx, pen, x, y, rx, ry, { look = 0, shut = false, lid = 0.18, lidCol, side = 1 }) {
  const white = ell(x, y, rx, ry);
  if (shut) {
    const p = P(); p.moveTo(x - rx, y + ry * 0.1); p.quadraticCurveTo(x, y + ry * 0.55, x + rx, y + ry * 0.1);
    pen.line(p, INK, 1.4); return;
  }
  pen.flat(white, '#ffffff', 1.3);
  ctx.save(); ctx.clip(white);
  const px = x + look * rx * 0.28 + side * rx * 0.04, py = y + ry * 0.08;
  ctx.fillStyle = '#3a2350'; ctx.fill(ell(px, py, rx * 0.54, ry * 0.58));
  ctx.fillStyle = INK; ctx.fill(ell(px, py + ry * 0.04, rx * 0.36, ry * 0.4));
  // upper lid, the face colour, sitting over the top of the white
  ctx.fillStyle = lidCol; ctx.fillRect(x - rx * 1.2, y - ry * 1.2, rx * 2.4, ry * 2.4 * lid);
  ctx.restore();
  ctx.save(); ctx.clip(white); pen.line((() => { const l = P(); const ly = y - ry * 1.2 + ry * 2.4 * lid; l.moveTo(x - rx * 1.2, ly); l.lineTo(x + rx * 1.2, ly); return l; })(), INK, 1.2); ctx.restore();
  pen.flat(white, 'transparent', 1.3);
  pen.glint(px - rx * 0.2, py - ry * 0.3, rx * 0.2);
  pen.glint(px + rx * 0.18, py + ry * 0.2, rx * 0.09);
}

// ================================================================ LORENZO
function drawLorenzo(ctx, t, { finish, pose }) {
  const att = pose === 'attitude';
  const breath = Math.sin(t * 2.1);
  const sway = att ? Math.sin(t * 0.9) * 0.8 : 0;
  const lean = att ? 1.6 : 0;           // weight on his right foot (screen-left)
  const hipX = -lean + sway * 0.3;
  const chestY = -breath * 0.7;
  const shut = blinkShut(t, 0.6);

  groundShadow(ctx, 26);

  // ---- legs + boots
  const legL = -10 + hipX, legR = 9 + hipX * 0.4;
  const pen = ctx._pen;
  for (const [lx, ftx, lift] of [[legL, -14 - lean * 0.6, 0], [legR, 13.5, att ? 0.6 : 0]]) {
    const leg = poly([lx - 7, -26, lx + 7, -26, lx + 6.2 + (ftx - lx) * 0.18, -7 - lift, lx - 6.2 + (ftx - lx) * 0.18, -7 - lift], 0.35);
    pen.part(leg, LOR.pants, { sx: 2.5, sy: 0 });
    // turn-up cuff
    pen.part(poly([lx - 6.8 + (ftx - lx) * 0.16, -10.5 - lift, lx + 6.8 + (ftx - lx) * 0.16, -10.5 - lift, lx + 7 + (ftx - lx) * 0.18, -6.5 - lift, lx - 7 + (ftx - lx) * 0.18, -6.5 - lift], 0.5), shade(LOR.pants, 0.12), { sx: 1.5, sy: 0, lw: 1.3 });
    // boot: a toe-heavy bean, toes turned out, a pale sole under it
    const dir = Math.sign(ftx);
    const boot = P();
    const bx = ftx - dir * 1.5, by = -lift;
    boot.moveTo(bx - dir * 7.5, by - 1.5);
    boot.bezierCurveTo(bx - dir * 8, by - 8.5, bx + dir * 1, by - 9.5, bx + dir * 4.5, by - 7);
    boot.bezierCurveTo(bx + dir * 8.5, by - 6.5, bx + dir * 9.5, by - 2, bx + dir * 8.5, by - 1.2);
    boot.closePath();
    pen.part(poly([bx - 8.4, by - 2, bx + 8.4, by - 2, bx + 8.6, by + 0.4, bx - 8.6, by + 0.4], 0.6), '#d9c7a8', { sx: 0, sy: 1, lw: 1.3 });
    pen.part(boot, LOR.boot, { sx: dir * 1.5, sy: 2, deep: 0.3 });
    pen.glint(bx + dir * 3.5, by - 6.5, 1.2);
  }

  // ---- arms: back arm first (screen-right)
  const shoulderY = -52 + chestY;
  const arm = (sx, ex, ey, hx, hy, flip) => {
    const a = P();
    a.moveTo(sx - 4.5 * flip, shoulderY - 1.5);
    a.quadraticCurveTo(ex - 5.5 * flip, ey - 2, hx - 4 * flip, hy - 2);
    a.lineTo(hx + 4.5 * flip, hy - 1);
    a.quadraticCurveTo(ex + 4 * flip, ey, sx + 5 * flip, shoulderY + 5);
    a.closePath();
    return a;
  };
  const hand = (hx, hy, r, flip, fist = true) => {
    const h = P();
    h.ellipse(hx, hy, r, r * 0.92, 0, 0, TAU);
    pen.part(h, LOR.skin, { sx: flip * 1.4, sy: 1.6, deep: 0.25 });
    if (fist) {
      const k = P();
      k.moveTo(hx - flip * r * 0.1, hy - r * 0.45); k.quadraticCurveTo(hx + flip * r * 0.5, hy - r * 0.4, hx + flip * r * 0.55, hy + r * 0.05);
      k.moveTo(hx - flip * r * 0.25, hy + r * 0.15); k.quadraticCurveTo(hx + flip * r * 0.3, hy + r * 0.2, hx + flip * r * 0.45, hy + r * 0.55);
      pen.line(k, shade(LOR.skin, 0.55), 0.8);
    }
  };

  // ---- wrench (stand: hangs from the belt loop; attitude: on his shoulder)
  const wrench = (x, y, ang, s = 1) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
    const shaft = poly([-1.7, 0, 1.7, 0, 1.5, 22, -1.5, 22], 0.4);
    pen.part(shaft, LOR.wrenchRed, { sx: 0.8, sy: 0, lw: 1.2 });
    const jaw = P();
    jaw.moveTo(-2.6, 1); jaw.lineTo(-2.6, -6); jaw.lineTo(5.5, -6); jaw.lineTo(5.5, -3.2); jaw.lineTo(0.6, -3.2); jaw.lineTo(0.6, -1.2); jaw.lineTo(4, -1.2); jaw.lineTo(4, 1.2); jaw.lineTo(-2.6, 1.6); jaw.closePath();
    pen.part(jaw, LOR.steel, { sx: 0.8, sy: 0.8, lw: 1.2 });
    pen.line((() => { const q = P(); q.moveTo(-1.4, 4); q.lineTo(1.4, 4); q.moveTo(-1.4, 5.6); q.lineTo(1.4, 5.6); return q; })(), INK, 0.7);
    pen.part(ell(0, 20, 2.2, 2.2), shade(LOR.wrenchRed, 0.1), { sx: 0.5, sy: 0.5, lw: 1.1 });
    ctx.restore();
  };

  const backHand = att ? [14 + hipX * 0.2, -36 + chestY] : [24, -30 + chestY * 0.5];
  if (att) {
    // hand on hip: elbow out wide, knuckles on the belt
    const a = P();
    a.moveTo(16, shoulderY + 1); a.quadraticCurveTo(27, shoulderY + 3, 28, -42 + chestY);
    a.quadraticCurveTo(26, -36 + chestY, 17, -35 + chestY); a.lineTo(15, -40 + chestY);
    a.quadraticCurveTo(21, -42, 21, -44 + chestY); a.quadraticCurveTo(18, shoulderY + 7, 13, shoulderY + 7); a.closePath();
    pen.part(a, LOR.shirt, { sx: 2, sy: 2 });
  } else {
    pen.part(arm(17, 23, -41 + chestY, backHand[0], backHand[1] - 3, 1), LOR.shirt, { sx: 2, sy: 2 });
  }

  // ---- torso: a pear — narrow shoulders, belly out
  const tx = hipX * 0.5;
  const torso = P();
  torso.moveTo(tx - 15, shoulderY - 1);
  torso.bezierCurveTo(tx - 21, shoulderY + 4, tx - 24, -38, tx - 21, -28);
  torso.lineTo(tx + 21, -28);
  torso.bezierCurveTo(tx + 24, -38, tx + 21, shoulderY + 4, tx + 15, shoulderY - 1);
  torso.quadraticCurveTo(tx, shoulderY - 4, tx - 15, shoulderY - 1);
  torso.closePath();
  pen.part(torso, LOR.shirt, { sx: 4, sy: 3, deep: 0.3 });
  // collar: a soft V
  const collar = P(); collar.moveTo(tx - 6, shoulderY - 2.4); collar.quadraticCurveTo(tx, shoulderY + 3.5, tx + 6, shoulderY - 2.4);
  pen.line(collar, shade(LOR.shirt, 0.6), 1);

  // overalls: bib + seat, straps over the shoulders, two brass buttons
  const bibTop = -43 + chestY * 0.8;
  const over = P();
  over.moveTo(tx - 10, bibTop); over.lineTo(tx + 10, bibTop);
  over.lineTo(tx + 11.5, -35); over.bezierCurveTo(tx + 22, -35, tx + 23, -30, tx + 21, -24);
  over.lineTo(tx - 21, -24); over.bezierCurveTo(tx - 23, -30, tx - 22, -35, tx - 11.5, -35);
  over.closePath();
  pen.part(over, LOR.pants, { sx: 3, sy: 2.5, deep: 0.3 });
  // pocket on the bib
  pen.line(poly([tx - 5, bibTop + 2.5, tx + 5, bibTop + 2.5, tx + 4.5, bibTop + 7, tx - 4.5, bibTop + 7], 0.3), shade(LOR.pants, 0.55), 0.8);
  for (const s of [-1, 1]) {
    const strap = P();
    strap.moveTo(tx + s * 7.5, bibTop + 0.5); strap.lineTo(tx + s * 12.5, shoulderY - 1.5);
    strap.lineTo(tx + s * 16.5, shoulderY - 0.5); strap.lineTo(tx + s * 10.8, bibTop + 0.5); strap.closePath();
    pen.part(strap, LOR.pants, { sx: 1, sy: 1, lw: 1.2 });
    pen.part(ell(tx + s * 8.6, bibTop + 1.6, 1.9, 1.9), LOR.brass, { sx: 0.6, sy: 0.6, lw: 1.1 });
    pen.glint(tx + s * 8.6 - 0.6, bibTop + 1, 0.55);
  }
  // seam down the middle of the trousers
  pen.line((() => { const q = P(); q.moveTo(tx, -30); q.lineTo(tx, -24.5); return q; })(), shade(LOR.pants, 0.55), 0.9);
  // belt + buckle on the waist band
  pen.part(poly([tx - 22, -35, tx + 22, -35, tx + 22.4, -30.6, tx - 22.4, -30.6], 0.5), LOR.belt, { sx: 0, sy: 1, deep: 0.25, lw: 1.3 });
  pen.part(poly([tx - 3.4, -36, tx + 3.4, -36, tx + 3.4, -29.6, tx - 3.4, -29.6], 0.4), LOR.brass, { sx: 0.8, sy: 0.8, lw: 1.2 });
  pen.fill(poly([tx - 1.6, -34.2, tx + 1.6, -34.2, tx + 1.6, -31.4, tx - 1.6, -31.4], 0.3), shade(LOR.brass, 0.45));

  if (!att) wrench(tx - 13, -33.5, 0.22 + Math.sin(t * 2.1 + 0.6) * 0.03, 0.85);

  // ---- front arm (screen-left)
  if (att) {
    // wrench up over the shoulder, the tap every four seconds
    // the tap: a quick lift-and-drop of the wrench off the shoulder once every 4s
    const k = t % 4, tap = k < 0.36 ? Math.sin(k / 0.36 * Math.PI) : 0;
    const hx = tx - 16, hy = -42 + chestY - tap * 2.4;
    // the jaw rests up behind the shoulder; the shaft comes down to his fist
    const jx = tx - 29, jy = -62 + chestY - tap * 3.4;
    const ang = -Math.atan2(hx - jx, hy - jy);
    wrench(jx, jy, ang, Math.hypot(hx - jx, hy - jy) / 20);
    const a = P();
    a.moveTo(tx - 12, shoulderY - 1); a.quadraticCurveTo(tx - 27, shoulderY + 2, tx - 27, -38 + chestY);
    a.quadraticCurveTo(tx - 26, -33 + chestY, hx - 3, hy + 4); a.lineTo(hx + 2, hy - 2);
    a.quadraticCurveTo(tx - 19, -40 + chestY, tx - 20, -42 + chestY); a.quadraticCurveTo(tx - 19, shoulderY + 6, tx - 12, shoulderY + 7);
    a.closePath();
    pen.part(a, LOR.shirt, { sx: 2, sy: 2 });
    hand(hx, hy, 4.6, -1);
  } else {
    pen.part(arm(tx - 17, tx - 23, -41 + chestY, tx - 24, -30 + chestY * 0.5 - 3, -1), LOR.shirt, { sx: 2, sy: 2 });
    hand(tx - 24.5, -28.5 + chestY * 0.5, 4.8, -1);
  }
  if (!att) hand(24.5, -28.5 + chestY * 0.5, 4.8, 1);
  else hand(backHand[0] + 1, backHand[1] + 0.5, 4.4, 1);

  // ---- head
  const hb = Math.sin(t * 2.1 - 0.5) * 0.6;
  const hx = tx + (att ? -0.8 : 0), hy = -73 + hb + chestY * 0.5;
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(att ? -0.06 : 0); ctx.scale(1.15, 1.15);
  // ears
  for (const s of [-1, 1]) {
    pen.part(ell(s * 18.5, 2, 3.6, 4.6), LOR.skin, { sx: s * 1, sy: 1, deep: 0.28, lw: 1.4 });
    pen.line((() => { const q = P(); q.arc(s * 18.5, 2, 2, s > 0 ? -1.3 : 1.8, s > 0 ? 1.3 : 4.4); return q; })(), shade(LOR.skin, 0.5), 0.8);
  }
  // face: rounder at the jaw than the brow
  const face = P();
  face.moveTo(-17, -6); face.bezierCurveTo(-18.5, 6, -14, 17, 0, 17.5);
  face.bezierCurveTo(14, 17, 18.5, 6, 17, -6); face.bezierCurveTo(14, -14, -14, -14, -17, -6); face.closePath();
  pen.part(face, LOR.skin, { sx: 2.6, sy: 2.6, deep: 0.26 });
  // sideburns under the cap
  for (const s of [-1, 1]) {
    const sb = P(); sb.moveTo(s * 17.2, -7); sb.lineTo(s * 17.6, 3); sb.quadraticCurveTo(s * 15.5, 2.5, s * 14.6, -1); sb.lineTo(s * 14, -7); sb.closePath();
    pen.part(sb, LOR.hair, { sx: 0.5, sy: 0.5, lw: 1.1 });
  }
  // brows: thick, worried-determined — inner ends up
  const bl = shut ? 0.6 : 0;
  for (const s of [-1, 1]) {
    const b = P();
    b.moveTo(s * 2.2, -4.6 + bl); b.quadraticCurveTo(s * 6, -8.8 - bl, s * 11.6, -8.6 - bl);
    b.lineTo(s * 11.8, -6.2 - bl); b.quadraticCurveTo(s * 6.5, -6.4, s * 2.8, -2.4 + bl); b.closePath();
    pen.part(moved(b, 0, 2.6), LOR.hair, { sx: 0, sy: 0.6, lw: 1 });
  }
  const look = att ? -0.6 : Math.sin(t * 0.37) > 0.85 ? 0.8 : 0;
  eye(ctx, pen, -6.6, 2, 4.6, 5.6, { look, shut, side: -1, lidCol: LOR.skin, lid: 0.12 });
  eye(ctx, pen, 6.6, 2, 4.6, 5.6, { look, shut, side: 1, lidCol: LOR.skin, lid: 0.12 });
  // nose: a bulb with its own shadow and glint
  pen.part(ell(0, 8.6, 5.4, 4.5), LOR.nose, { sx: 1.6, sy: 1.8, deep: 0.3, lw: 1.3 });
  pen.glint(-1.7, 6.9, 1.1);
  // moustache: two lobes curling up at the tips
  for (const s of [-1, 1]) {
    const m = P();
    m.moveTo(s * 0.8, 11.4);
    m.bezierCurveTo(s * 4, 10.2, s * 9, 10.6, s * 11.6, 12.4);
    m.bezierCurveTo(s * 13.4, 13.8, s * 12.8, 15.8, s * 11.2, 14.6);
    m.bezierCurveTo(s * 10.4, 16.8, s * 6, 17.2, s * 3.6, 15.6);
    m.bezierCurveTo(s * 2, 16.4, s * 0.4, 15, s * 0.8, 11.4);
    m.closePath();
    pen.part(m, LOR.hair, { sx: s * 0.6, sy: 1.2, deep: 0.35, lw: 1.2 });
  }
  pen.line((() => { const q = P(); q.moveTo(-4.4, 12.4); q.quadraticCurveTo(-6.5, 12, -9, 12.9); q.moveTo(4.4, 12.4); q.quadraticCurveTo(6.5, 12, 9, 12.9); return q; })(), tint(LOR.hair, 0.4), 0.7);
  // mouth: a small worried-but-game lip under the moustache
  pen.line((() => { const q = P(); q.moveTo(-2.6, 17.4); q.quadraticCurveTo(0, 16.4, 2.6, 17.4); return q; })(), INK, 1);

  // cap: crown, a seam, a button, the badge, and the brim tipped up-right
  ctx.save(); ctx.rotate(att ? 0.1 : 0.04); ctx.translate(0, -3.4);
  const crown = P();
  crown.moveTo(-18.8, -6); crown.bezierCurveTo(-20, -24, 20, -24, 18.8, -6);
  crown.quadraticCurveTo(0, -9.6, -18.8, -6); crown.closePath();
  pen.part(crown, LOR.cap, { sx: 3, sy: 2.5, deep: 0.34 });
  pen.line((() => { const q = P(); q.moveTo(0, -20.2); q.quadraticCurveTo(-1.5, -13, -0.6, -8.4); return q; })(), shade(LOR.cap, 0.55), 0.8);
  pen.part(ell(0, -20.6, 2, 1.2), shade(LOR.cap, 0.1), { sx: 0, sy: 0.5, lw: 1 });
  pen.part(ell(-6.5, -13, 4.4, 4), LOR.white, { sx: 0.8, sy: 0.8, lw: 1.1, lit: false });
  // the badge: a hex nut
  const nut = P();
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.5; (i ? nut.lineTo : nut.moveTo).call(nut, -6.5 + Math.cos(a) * 2.7, -13 + Math.sin(a) * 2.5); }
  nut.closePath();
  pen.part(nut, LOR.cap, { sx: 0.3, sy: 0.3, lw: 0.9, lit: false });
  pen.fill(ell(-6.5, -13, 0.9, 0.85), LOR.white);
  const brim = P();
  brim.moveTo(-17, -6.4); brim.bezierCurveTo(-4, -9.5, 18, -9, 27, -5.6);
  brim.bezierCurveTo(29.5, -4, 27, -1.2, 21, -1.8); brim.bezierCurveTo(10, -3, -6, -2.8, -17, -4.2); brim.closePath();
  pen.part(brim, shade(LOR.cap, 0.08), { sx: 0, sy: -1.3, deep: 0.4 });
  pen.glint(-11, -18, 1.6);
  ctx.restore();
  ctx.restore();
}

// ================================================================ RAMON
function drawRamon(ctx, t, { finish, pose }) {
  const att = pose === 'attitude';
  const pen = ctx._pen;
  const bob = (ph, a = 1, f = 2.2) => Math.sin(t * f + ph) * a;
  const shut = blinkShut(t, 1.9);
  groundShadow(ctx, 22, 0.24);

  // ---- feet, floating just off the floor
  const tap = att ? Math.max(0, Math.sin(t * 7)) * (Math.sin(t * 0.9) > 0 ? 1 : 0) : 0;
  const shoe = (x, dir, lift) => {
    const y = -2 - lift;
    const s = P();
    s.moveTo(x - dir * 5, y + 1.2);
    s.bezierCurveTo(x - dir * 7, y - 7.5, x + dir * 2, y - 8.5, x + dir * 5, y - 5.6);
    s.bezierCurveTo(x + dir * 9.5, y - 4.5, x + dir * 10.6, y + 0.4, x + dir * 8.4, y + 1.4);
    s.closePath();
    pen.part(poly([x - 8.6 + dir * 1.4, y - 0.2, x + 8.6 + dir * 1.4, y - 0.2, x + 8.8 + dir * 1.4, y + 2.4, x - 8.8 + dir * 1.4, y + 2.4], 0.7), RAM.sole, { sx: 0, sy: 1, lw: 1.3 });
    pen.part(s, RAM.shoe, { sx: dir * 1.4, sy: 2, deep: 0.3 });
    // laces + a toe cap line
    pen.line((() => { const q = P(); q.moveTo(x - dir * 0.6, y - 6.2); q.lineTo(x + dir * 2.4, y - 5.6); q.moveTo(x - dir * 1.4, y - 4.4); q.lineTo(x + dir * 1.8, y - 3.8); q.moveTo(x + dir * 5.6, y - 5); q.quadraticCurveTo(x + dir * 5, y - 1.8, x + dir * 6.2, y + 0.4); return q; })(), RAM.sole, 0.9);
    pen.glint(x - dir * 1.5, y - 6.6, 1);
  };
  shoe(-9.5, -1, 3 + bob(0.4, 0.8));
  shoe(9.5, 1, 3 + bob(1.6, 0.8) + tap * 2.2);

  // ---- body, floating clear of the feet
  const by = -26 + bob(0.9, 1.1);
  // back fist first (screen-right when standing; both in front when arms are crossed)
  const glove = (x, y, dir, rot = 0, s = 1) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    // cuff
    pen.part(poly([-dir * 4.5, -5.4, -dir * 9.5, -6.2, -dir * 9.5, 4.8, -dir * 4.5, 5.2], 0.4), shade(RAM.glove, 0.06), { sx: 0, sy: 1, lw: 1.3 });
    const g = P();
    g.moveTo(-dir * 5.5, -5.5); g.bezierCurveTo(-dir * 2, -9.2, dir * 7.5, -8.4, dir * 8.3, -2);
    g.bezierCurveTo(dir * 8.6, 4.6, dir * 2.5, 7.8, -dir * 3, 6.8); g.bezierCurveTo(-dir * 6.4, 6, -dir * 6.8, -2.4, -dir * 5.5, -5.5); g.closePath();
    pen.part(g, RAM.glove, { sx: dir * 1.6, sy: 2, deep: 0.26 });
    // knuckle creases + the thumb across the front
    pen.line((() => { const q = P(); for (const k of [-2.6, 0.2, 3]) { q.moveTo(dir * 2.6, k); q.lineTo(dir * 6.6, k + 0.4); } return q; })(), shade(RAM.glove, 0.45), 0.8);
    pen.line((() => { const q = P(); q.moveTo(-dir * 3.2, 1.6); q.quadraticCurveTo(dir * 1, 0.6, dir * 2.4, 4); return q; })(), shade(RAM.glove, 0.5), 0.9);
    ctx.restore();
  };

  const fistY = by - 13 + bob(2.2, 1.4, 2.6);
  if (!att) glove(27, fistY + 1, 1, 0.12);

  // scarf tail behind, blowing out to screen-left
  const flap = Math.sin(t * 5.2) * 1.4, flap2 = Math.sin(t * 5.2 - 1.1) * 2;
  const neckY = by - 27;
  const tail = P();
  tail.moveTo(-6, neckY + 1);
  tail.bezierCurveTo(-14, neckY + 0 + flap * 0.5, -20, neckY + 2 + flap, -27, neckY + 0.5 + flap2);
  tail.lineTo(-25.5, neckY + 4 + flap2 * 0.8); tail.lineTo(-29, neckY + 6.5 + flap2);
  tail.bezierCurveTo(-20, neckY + 8 + flap, -13, neckY + 6, -5, neckY + 5); tail.closePath();
  pen.part(tail, shade(RAM.scarf, 0.08), { sx: 0, sy: 1.5, deep: 0.3 });

  // torso: a soft bean, wider at the hem
  const tor = P();
  tor.moveTo(-10, by - 27); tor.bezierCurveTo(-15, by - 22, -16.5, by - 6, -14, by - 1.5);
  tor.quadraticCurveTo(0, by + 2.5, 14, by - 1.5);
  tor.bezierCurveTo(16.5, by - 6, 15, by - 22, 10, by - 27); tor.quadraticCurveTo(0, by - 29, -10, by - 27); tor.closePath();
  pen.part(tor, RAM.body, { sx: 3.4, sy: 3, deep: 0.3 });
  // hoodie details: a centre zip line and a kangaroo pocket
  pen.line((() => { const q = P(); q.moveTo(0, by - 23); q.lineTo(0, by - 13); return q; })(), shade(RAM.body, 0.55), 0.9);
  const pocket = P(); pocket.moveTo(-8, by - 3); pocket.lineTo(-6, by - 10); pocket.lineTo(6, by - 10); pocket.lineTo(8, by - 3);
  pen.line(pocket, shade(RAM.body, 0.55), 0.9);
  // hem band
  pen.line((() => { const q = P(); q.moveTo(-14.6, by - 4); q.quadraticCurveTo(0, by - 0.4, 14.6, by - 4); return q; })(), shade(RAM.body, 0.55), 0.9);

  // scarf wrap at the neck + the knot
  const wrap = P();
  wrap.moveTo(-11.5, neckY - 1.5); wrap.quadraticCurveTo(0, neckY - 4.2, 11.5, neckY - 1.5);
  wrap.lineTo(11, neckY + 3.6); wrap.quadraticCurveTo(0, neckY + 6, -11, neckY + 3.6); wrap.closePath();
  pen.part(wrap, RAM.scarf, { sx: 2, sy: 1.6, deep: 0.3 });
  pen.part(ell(-6.4, neckY + 2.2, 3, 2.7), shade(RAM.scarf, 0.06), { sx: 0.8, sy: 0.8, lw: 1.2 });

  // ---- head, floating above the scarf
  const hy = by - 45 + bob(0.2, 1.2), tilt = att ? 0.07 : bob(0, 0.03, 0.8);
  ctx.save(); ctx.translate(0, hy); ctx.rotate(tilt); ctx.scale(1.12, 1.12);
  // ponytail behind on screen-left, swinging
  const sw = Math.sin(t * 2.4) * 2;
  const pony = P();
  pony.moveTo(-12, -6); pony.bezierCurveTo(-20, -6, -24, 2 + sw * 0.3, -26 + sw * 0.4, 13);
  pony.bezierCurveTo(-22, 10, -19, 6, -17.5, 9 + sw * 0.2);
  pony.bezierCurveTo(-18, 3, -15, -1, -12, 0); pony.closePath();
  pen.part(pony, RAM.hair, { sx: 1.4, sy: 1.6, deep: 0.33 });
  pen.part(ell(-13.6, -2.4, 2.6, 3.2, 0.5), RAM.scarf, { sx: 0.6, sy: 0.6, lw: 1.1 });
  // face: wide oval
  const face = ell(0, 1, 16.5, 15);
  pen.part(face, RAM.skin, { sx: 2.8, sy: 2.6, deep: 0.26 });
  // big nose, the Ramon bulb
  // hair: a mop of spikes, one tall forelock arching to screen-right
  const hair = P();
  hair.moveTo(-15.5, -6);
  hair.bezierCurveTo(-17, -11, -15, -14, -11, -15);
  hair.lineTo(-13.5, -24); hair.lineTo(-6.5, -16.5);
  hair.bezierCurveTo(-6, -26, -3, -33, -1.5, -40);       // the tall spike
  hair.bezierCurveTo(1, -30, 2.5, -24, 4, -17.5);
  hair.bezierCurveTo(9, -27, 18, -31, 25, -28);           // the forelock arching over
  hair.bezierCurveTo(21, -26, 18, -23, 17.5, -17);
  hair.bezierCurveTo(18.5, -14, 18.5, -10, 16.4, -6);
  hair.lineTo(13.5, -10.5); hair.lineTo(11, -9);
  hair.lineTo(8.5, -14); hair.lineTo(4.5, -12);
  hair.lineTo(1.5, -15.5); hair.lineTo(-2.5, -12.5);
  hair.lineTo(-6.5, -15); hair.lineTo(-10.5, -10.5); hair.closePath();
  pen.part(hair, RAM.hair, { sx: 3, sy: 3, deep: 0.33 });
  // strand lines in the spikes
  pen.line((() => { const q = P(); q.moveTo(-2.5, -30); q.quadraticCurveTo(-3.2, -22, -2, -15); q.moveTo(11, -24); q.quadraticCurveTo(8, -20, 7.5, -14); q.moveTo(-10, -12); q.lineTo(-11.5, -18); return q; })(), shade(RAM.hair, 0.45), 0.8);
  pen.glint(-8, -14, 1.3);
  pen.glint(13, -24, 1.1);
  // brows: cocky — one arched up, one flat and low
  const bl = shut ? 0.7 : 0;
  const brow = (s, up) => {
    const b = P();
    b.moveTo(s * 2.2, -3 - bl - up * 0.4); b.quadraticCurveTo(s * 6.5, -6.6 - bl - up, s * 11, -4.6 - bl - up * 1.4);
    b.lineTo(s * 11, -2.6 - bl - up * 1.4); b.quadraticCurveTo(s * 6.5, -4.4 - bl - up, s * 2.4, -1.3 - bl - up * 0.4); b.closePath();
    pen.part(moved(b, 0, s < 0 ? 0.6 : -0.6), RAM.brow, { sx: 0, sy: 0.5, lw: 0.9 });
  };
  const raise = att ? 2.4 + Math.max(0, Math.sin(t * 1.3)) * 1.2 : 1.2;
  brow(-1, 0); brow(1, raise);
  const look = att ? 0.9 : Math.sin(t * 0.43 + 1) > 0.8 ? -0.8 : 0.2;
  eye(ctx, pen, -6.2, 2.6, 4.7, 5.8, { look, shut, side: -1, lidCol: RAM.skin, lid: att ? 0.36 : 0.3 });
  eye(ctx, pen, 6.2, 2.6, 4.7, 5.8, { look, shut, side: 1, lidCol: RAM.skin, lid: 0.2 });
  // nose: small and round, so the stache reads
  pen.fill(ell(0.6, 8.6, 2.4, 1.6), shade(RAM.skin, 0.16));
  pen.glint(-0.2, 8.1, 0.7);
  // the stache: two short tufts, lighter than the mouth
  for (const s of [-1, 1]) {
    const m = P(); m.moveTo(s * 1, 10.8); m.quadraticCurveTo(s * 4.4, 9.8, s * 7, 11.2); m.quadraticCurveTo(s * 4.4, 12, s * 1, 12); m.closePath();
    pen.part(m, '#a07a5a', { sx: 0, sy: 0.4, lw: 0.7, lit: false, line: shade('#a07a5a', 0.5) });
  }
  // the smirk: up on the screen-right
  const mouth = P(); mouth.moveTo(-4.2, 13.8); mouth.quadraticCurveTo(1, 15.6, 6.4, 12.4);
  pen.line(mouth, INK, 1.2);
  pen.line((() => { const q = P(); q.moveTo(6.4, 12.4); q.lineTo(7.2, 11.4); return q; })(), INK, 1);
  ctx.restore();

  // ---- front fist(s)
  if (att) {
    // arms folded: both fists float in front of the chest, crossed
    const cy = by - 15 + bob(2.2, 0.6, 2.6);
    glove(6.5, cy, 1, -0.3, 0.95);
    glove(-6.5, cy + 2.2, -1, 0.3, 0.95);
  } else {
    glove(-27, fistY + bob(3.1, 0.6, 2.6), -1, -0.12);
  }
}

// ================================================================ ROUND 2: three more of the cast
// 16 Oct 2026, after A–C on Lorenzo and Ramon: "can i see another 2 or 3 heroes in these
// new styles". Rusty (an animal), B-33P (a machine) and Grumpos (the heavy) — the three
// builds least like the first two. Same pen, same finishes, same two poses.

// A tapered limb: a circle at each end joined by their tangents.
function capsule(x1, y1, x2, y2, r1, r2 = r1) {
  const a = Math.atan2(y2 - y1, x2 - x1), p = P();
  p.arc(x1, y1, r1, a + Math.PI / 2, a + Math.PI * 1.5);
  p.arc(x2, y2, r2, a - Math.PI / 2, a + Math.PI / 2);
  p.closePath();
  return p;
}
function strokePath(fn) { const q = P(); fn(q); return q; }

const RUS = {
  coat: '#c65a2c', cream: '#f6e7d2', mask: '#ffffff', dark: '#8e3c1c', shoe: '#c2342e',
  gold: '#f0c07a', leather: '#7a3a2a', nose: '#1a1028', cane: '#8cbf4a', caneDk: '#5a8a2a',
};
const BOT = {
  dome: '#b6c6dc', screen: '#101c33', glow: '#7ef0ff', body: '#7d8ca8', leg: '#4d5972',
  foot: '#8fa0bc', cannon: '#d4b02e', bulb: '#f6d33c', hand: '#b6c6dc',
};
const GRU = {
  skin: '#ded9d2', tat: '#c92f3b', beard: '#352523', kilt: '#765238', gold: '#d69224',
  wrap: '#cfc8bd', boot: '#5a3a28', haft: '#6a4a30', steel: '#b8c4cc', eye: '#17131a',
};

// ---------------------------------------------------------------- RUSTY
function drawRusty(ctx, t, { pose }) {
  const att = pose === 'attitude', pen = ctx._pen;
  const breath = Math.sin(t * 2.3), chestY = -breath * 0.6;
  const shut = blinkShut(t, 2.4);
  groundShadow(ctx, 24);

  // the tail: a bushy plume off the hip to screen-left, ringed, swishing
  const sw = Math.sin(t * 1.7) * 3;
  const tail = P();
  tail.moveTo(-8, -30);
  tail.bezierCurveTo(-26, -30, -36, -36 + sw * 0.3, -37 + sw, -54);
  tail.bezierCurveTo(-38 + sw, -62, -30 + sw, -64, -27 + sw * 0.8, -57);
  tail.bezierCurveTo(-26, -44, -20, -37, -8, -36);
  tail.closePath();
  ctx.save(); ctx.clip(tail);
  pen.part(tail, RUS.coat, { sx: 2.5, sy: 2.5 });
  ctx.lineWidth = 4.2; ctx.strokeStyle = RUS.dark;
  for (const k of [0.3, 0.55, 0.8]) {
    const y = -30 - k * 30, x = -18 - k * 18 + sw * k;
    ctx.beginPath(); ctx.moveTo(x - 9, y + 7); ctx.lineTo(x + 9, y - 3); ctx.stroke();
  }
  ctx.restore();
  pen.flat(tail, 'transparent', 1.6);

  // legs + runners
  for (const s of [-1, 1]) {
    pen.part(capsule(s * 7, -26, s * 8, -8, 5.4, 4.6), RUS.dark, { sx: s * 1.4, sy: 0 });
    const x = s * 9.5, y = 0, d = s;
    pen.part(poly([x - 8, y - 2, x + 8, y - 2, x + 8.2, y + 0.4, x - 8.2, y + 0.4], 0.6), RUS.cream, { sx: 0, sy: 1, lw: 1.3 });
    const sh = P();
    sh.moveTo(x - d * 6.5, y - 1.5); sh.bezierCurveTo(x - d * 7, y - 8, x + d * 1, y - 8.6, x + d * 4, y - 6.4);
    sh.bezierCurveTo(x + d * 8, y - 5.6, x + d * 9, y - 1.6, x + d * 8, y - 1.2); sh.closePath();
    pen.part(sh, RUS.shoe, { sx: d * 1.4, sy: 2 });
    pen.line(strokePath((q) => { q.moveTo(x - d * 3, y - 2.2); q.lineTo(x + d * 6, y - 2.2); }), RUS.cream, 0.9);
    pen.glint(x - d * 1.5, y - 6.2, 1);
  }

  // back arm (screen-right): hanging, or (attitude) up for the catch
  const toss = att ? (t % 2.6) / 2.6 : 0;
  const paw = (x, y, s) => {
    pen.part(capsule(x - s * 0.5, y - 3.5, x - s * 0.5, y - 2, 4.2, 4.2), RUS.leather, { sx: 0, sy: 1, lw: 1.3 });
    pen.part(ell(x, y, 4.6, 4.3), RUS.coat, { sx: s * 1.4, sy: 1.6 });
    pen.line(strokePath((q) => { q.moveTo(x + s * 1.2, y + 1.5); q.lineTo(x + s * 2.8, y + 3); q.moveTo(x - s * 0.6, y + 2.6); q.lineTo(x + s * 0.4, y + 4.2); }), shade(RUS.coat, 0.5), 0.8);
  };
  if (att) {
    pen.part(capsule(14, -50 + chestY, 22, -66, 4.6, 4), RUS.coat, { sx: 1.5, sy: 1.5 });
  } else {
    pen.part(capsule(14, -50 + chestY, 20, -34 + chestY, 4.6, 4.1), RUS.coat, { sx: 1.5, sy: 1.5 });
  }

  // body: a red coat with a darker belly, the gold belt slung low, the pouch of canes
  const body = P();
  body.moveTo(-12, -53 + chestY); body.bezierCurveTo(-18, -48, -18.5, -32, -15.5, -24);
  body.quadraticCurveTo(0, -20.5, 15.5, -24); body.bezierCurveTo(18.5, -32, 18, -48, 12, -53 + chestY);
  body.quadraticCurveTo(0, -56 + chestY, -12, -53 + chestY); body.closePath();
  pen.part(body, RUS.coat, { sx: 3.2, sy: 3 });
  // the canes in the pouch, behind the belt
  if (!att || toss < 0.999) for (const [dx, tip] of [[9.6, -49], [12.4, -46.5]]) {
    if (att && dx === 9.6) continue;   // the one he's juggling
    pen.part(capsule(dx, -28, dx + 1.2, tip, 1.3), RUS.cane, { sx: 0.6, sy: 0, lw: 1 });
    pen.line(strokePath((q) => { q.moveTo(dx - 1.2, -38); q.lineTo(dx + 1.8, -38); q.moveTo(dx - 1, tip + 5); q.lineTo(dx + 2, tip + 5); }), RUS.caneDk, 1);
  }
  const belt = P(); belt.moveTo(-17, -32); belt.quadraticCurveTo(0, -27, 17, -35); belt.lineTo(17.4, -31.5); belt.quadraticCurveTo(0, -23.2, -17.2, -28.4); belt.closePath();
  pen.part(belt, RUS.gold, { sx: 0, sy: 1, lw: 1.3 });
  pen.part(poly([7, -33, 15.5, -35, 16, -24, 8, -23], 0.4), RUS.leather, { sx: 1.4, sy: 1.4 });
  pen.line(strokePath((q) => { q.moveTo(7.6, -30); q.lineTo(15.6, -31.8); }), RUS.gold, 1);

  // front arm (screen-left), paw at the side
  pen.part(capsule(-14, -50 + chestY, -20, -34 + chestY, 4.6, 4.1), RUS.coat, { sx: 1.5, sy: 1.5 });
  paw(-20.5, -31.5 + chestY, -1);
  if (att) {
    paw(22.5, -68, 1);
    // the cane up and over: one flip every 2.6s, caught in the raised paw
    const k = toss, hgt = Math.sin(k * Math.PI) * 22;
    ctx.save(); ctx.translate(22.5, -72 - hgt); ctx.rotate(k * TAU);
    pen.part(capsule(0, -9, 0, 9, 1.4), RUS.cane, { sx: 0.6, sy: 0, lw: 1 });
    pen.line(strokePath((q) => { q.moveTo(-1.5, -3); q.lineTo(1.5, -3); q.moveTo(-1.5, 3.5); q.lineTo(1.5, 3.5); }), RUS.caneDk, 1);
    ctx.restore();
  } else paw(20.5, -31.5 + chestY, 1);

  // head
  const hb = Math.sin(t * 2.3 - 0.5) * 0.6;
  ctx.save(); ctx.translate(0, -74 + hb + chestY * 0.5); ctx.rotate(att ? 0.08 : Math.sin(t * 0.6) * 0.02);
  // ears: points with cream linings and white rims
  for (const s of [-1, 1]) {
    const ear = P(); ear.moveTo(s * 7, -15); ear.quadraticCurveTo(s * 18, -30, s * 23, -24); ear.quadraticCurveTo(s * 24, -12, s * 17, -6); ear.closePath();
    pen.part(ear, RUS.coat, { sx: s * 1.2, sy: 1.2 });
    const lin = P(); lin.moveTo(s * 10, -14); lin.quadraticCurveTo(s * 17.5, -25, s * 20.5, -22); lin.quadraticCurveTo(s * 21, -13, s * 16, -9); lin.closePath();
    pen.part(lin, RUS.cream, { sx: 0, sy: 1, lw: 1, lit: false });
  }
  // the face: wide at the cheeks, with ruff tufts
  const face = P();
  face.moveTo(-19, -4); face.bezierCurveTo(-19, -18, 19, -18, 19, -4);
  face.lineTo(22, 1); face.lineTo(18.5, 3); face.lineTo(21, 7); face.lineTo(16.5, 8.5);
  face.bezierCurveTo(12, 16, -12, 16, -16.5, 8.5);
  face.lineTo(-21, 7); face.lineTo(-18.5, 3); face.lineTo(-22, 1); face.closePath();
  pen.part(face, RUS.coat, { sx: 2.6, sy: 2.6 });
  ctx.save(); ctx.clip(face);
  // white cheek patches and the muzzle
  pen.fill(ell(-11, 7, 7.5, 5.6, 0.2), RUS.mask); pen.fill(ell(11, 7, 7.5, 5.6, -0.2), RUS.mask);
  pen.fill(ell(0, 8.6, 7.4, 5.8), RUS.mask);
  // tear streaks: the dark run from each eye to the jaw
  for (const s of [-1, 1]) {
    const st = P(); st.moveTo(s * 4.5, 1); st.quadraticCurveTo(s * 6, 9, s * 4, 16); st.lineTo(s * 8, 16); st.quadraticCurveTo(s * 10, 8, s * 9.5, 1); st.closePath();
    pen.fill(st, RUS.dark);
  }
  ctx.restore();
  // brow spots
  pen.fill(ell(-7, -8.5, 3, 2.1, 0.2), RUS.mask); pen.fill(ell(7, -8.5, 3, 2.1, -0.2), RUS.mask);
  const look = att ? 0.9 : Math.sin(t * 0.41) > 0.8 ? -0.7 : 0;
  eye(ctx, pen, -7, -1.5, 4.4, 5, { look, shut, side: -1, lidCol: RUS.coat, lid: 0.08 });
  eye(ctx, pen, 7, -1.5, 4.4, 5, { look, shut, side: 1, lidCol: RUS.coat, lid: 0.08 });
  // nose + mouth
  const nose = P(); nose.moveTo(-2.6, 5.4); nose.quadraticCurveTo(0, 4.4, 2.6, 5.4); nose.quadraticCurveTo(1.8, 8, 0, 8.4); nose.quadraticCurveTo(-1.8, 8, -2.6, 5.4); nose.closePath();
  pen.part(nose, RUS.nose, { sx: 0, sy: 0, lw: 0.8, lit: false });
  pen.glint(-0.8, 5.6, 0.6);
  pen.line(strokePath((q) => { q.moveTo(0, 8.4); q.lineTo(0, 10); q.moveTo(-3.4, 10.2); q.quadraticCurveTo(-1.6, 12.4, 0, 10); q.quadraticCurveTo(1.6, 12.4, 3.4, 10.2); }), INK, 1);
  ctx.restore();
}

// ---------------------------------------------------------------- B-33P
function drawB33p(ctx, t, { pose }) {
  const att = pose === 'attitude', pen = ctx._pen;
  const hum = Math.sin(t * 3.1) * 0.35;           // he idles on a motor, not on breath
  groundShadow(ctx, 25);

  // legs: piston legs with a knee bolt, big oval feet
  for (const s of [-1, 1]) {
    pen.part(capsule(s * 8, -28, s * 9, -6, 4.4, 4), BOT.leg, { sx: s * 1.2, sy: 0 });
    pen.part(ell(s * 8.6, -16, 3.2, 3.2), BOT.body, { sx: 0.8, sy: 0.8, lw: 1.2 });
    pen.part(poly([s * 9.5 - 9, -6, s * 9.5 + 9, -6, s * 9.5 + 10, 0, s * 9.5 - 10, 0], 0.7), BOT.foot, { sx: 1.5, sy: 1.5 });
    pen.line(strokePath((q) => { q.moveTo(s * 9.5 - 8, -2.2); q.lineTo(s * 9.5 + 8, -2.2); }), shade(BOT.foot, 0.5), 0.8);
  }
  const by = -28 + hum;
  // back arm (screen-right): a grey arm and a three-finger mitt
  const handR = att ? [17, by - 2] : [24, by - 3];
  pen.part(capsule(15, by - 23, handR[0], handR[1] - 4, 3.6, 3.2), BOT.body, { sx: 1.2, sy: 1.2 });
  pen.part(ell(15, by - 23, 4.2, 4.2), BOT.leg, { sx: 1, sy: 1 });
  const mitt = P(); mitt.moveTo(handR[0] - 4, handR[1] - 3); mitt.lineTo(handR[0] + 4, handR[1] - 3); mitt.lineTo(handR[0] + 4.6, handR[1] + 3); mitt.lineTo(handR[0] + 1.5, handR[1] + 5); mitt.lineTo(handR[0] - 1.5, handR[1] + 3); mitt.lineTo(handR[0] - 4.4, handR[1] + 4.4); mitt.closePath();
  pen.part(poly([handR[0] - 4, handR[1] - 3, handR[0] + 4, handR[1] - 3, handR[0] + 4.6, handR[1] + 3, handR[0] + 1.4, handR[1] + 5, handR[0] - 1.6, handR[1] + 3.4, handR[0] - 4.4, handR[1] + 4.4], 0.4), BOT.hand, { sx: 1, sy: 1 });

  // torso: a barrel with a chest screen, two lamps and rivets
  const tor = poly([-15, by - 26, 15, by - 26, 16.5, by - 5, 12, by + 1, -12, by + 1, -16.5, by - 5], 0.45);
  pen.part(tor, BOT.body, { sx: 3.2, sy: 3 });
  pen.line(strokePath((q) => { q.moveTo(-15.6, by - 6); q.lineTo(15.6, by - 6); }), shade(BOT.body, 0.5), 1);
  const scr = poly([-8.5, by - 21, 8.5, by - 21, 8.5, by - 11, -8.5, by - 11], 0.5);
  pen.part(scr, BOT.screen, { sx: -1, sy: -1, deep: -0.2, lw: 1.3, lit: false });
  const on = (k) => 0.55 + 0.45 * (Math.sin(t * 2.6 + k) > -0.3 ? 1 : 0);
  ctx.globalAlpha = on(0); pen.fill(ell(-3.6, by - 16, 1.9, 1.9), BOT.bulb);
  ctx.globalAlpha = on(2.4); pen.fill(ell(3.6, by - 16, 1.9, 1.9), BOT.bulb);
  ctx.globalAlpha = 1;
  for (const [rx, ry] of [[-12.5, by - 22.5], [12.5, by - 22.5], [-13.4, by - 9], [13.4, by - 9]]) pen.part(ell(rx, ry, 1, 1), shade(BOT.body, 0.1), { sx: 0.3, sy: 0.3, lw: 0.8, lit: false });

  // neck
  pen.part(poly([-5, by - 30, 5, by - 30, 5.6, by - 25, -5.6, by - 25], 0.3), BOT.leg, { sx: 1, sy: 0 });

  // the cannon arm (screen-left): banded, a dark bore; down at his side, or shouldered
  const cannon = (x, y, ang) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    pen.part(poly([-5.4, 0, 5.4, 0, 6.2, 20, -6.2, 20], 0.3), BOT.cannon, { sx: 1.6, sy: 0 });
    for (const yy of [6, 12]) pen.part(poly([-6.2, yy, 6.2, yy, 6.4, yy + 2.6, -6.4, yy + 2.6], 0.4), shade(BOT.cannon, 0.18), { sx: 0.6, sy: 0, lw: 1 });
    pen.part(ell(0, 20.4, 6.6, 2.4), shade(BOT.cannon, 0.1), { sx: 0, sy: 0.5, lw: 1.2 });
    pen.fill(ell(0, 20.6, 3.6, 1.3), BOT.screen);
    ctx.restore();
  };
  pen.part(ell(-15, by - 23, 4.6, 4.6), BOT.leg, { sx: 1, sy: 1 });
  if (att) {
    cannon(-15, by - 22, Math.PI - 0.22);
    // steam off the muzzle, drifting
    for (let i = 0; i < 3; i++) {
      const k = ((t * 0.7 + i / 3) % 1);
      ctx.globalAlpha = (1 - k) * 0.55;
      pen.fill(ell(-19 + k * 4 + Math.sin(k * 6 + i) * 1.5, by - 46 - k * 16, 2 + k * 3, 2 + k * 3), '#e8f0f8');
    }
    ctx.globalAlpha = 1;
  } else cannon(-17, by - 23, 0.12);

  // head: a dome with a face screen, eyes, grille, ear bolts, the antenna
  const hy = by - 44 + Math.sin(t * 3.1 - 0.6) * 0.4, tilt = att ? -0.08 : 0;
  ctx.save(); ctx.translate(0, hy); ctx.rotate(tilt);
  pen.part(capsule(0, -16, 0, -25, 0.9), BOT.leg, { sx: 0.4, sy: 0, lw: 1 });
  const bulbOn = Math.sin(t * 4) > 0;
  if (bulbOn) { ctx.fillStyle = 'rgba(246,211,60,0.35)'; ctx.fill(ell(0, -26.5, 4.6, 4.6)); }
  pen.part(ell(0, -26.5, 2.6, 2.6), bulbOn ? BOT.bulb : shade(BOT.bulb, 0.3), { sx: 0.6, sy: 0.6, lw: 1.1 });
  for (const s of [-1, 1]) {
    pen.part(ell(s * 17.4, 1, 2.8, 4.6), BOT.leg, { sx: s * 0.8, sy: 0.8, lw: 1.2 });
  }
  const dome = ell(0, 0, 17, 16.5);
  pen.part(dome, BOT.dome, { sx: 3, sy: 3 });
  pen.fill(ell(-8, -9, 3.4, 2, -0.6), 'rgba(255,255,255,0.75)');
  const face = poly([-12, -6, 12, -6, 12.5, 9, 9, 12, -9, 12, -12.5, 9], 0.5);
  pen.part(face, BOT.screen, { sx: -1, sy: -1, deep: -0.25, lw: 1.4, lit: false });
  ctx.save(); ctx.clip(face);
  const scan = att ? Math.sin(t * 1.4) * 2.2 : 0;
  const shut = blinkShut(t, 0.9);
  for (const s of [-1, 1]) {
    const ex = s * 5.4 + scan, ey = 1.5;
    ctx.fillStyle = 'rgba(126,240,255,0.22)'; ctx.fill(ell(ex, ey, 5.4, 5.4));
    pen.fill(shut ? poly([ex - 3.4, ey - 0.4, ex + 3.4, ey - 0.4, ex + 3.4, ey + 0.8, ex - 3.4, ey + 0.8], 0.3) : poly([ex - 3, ey - 3.6, ex + 3, ey - 3.6, ex + 3, ey + 3.6, ex - 3, ey + 3.6], 0.7), BOT.glow);
    if (!shut) pen.fill(ell(ex - 1, ey - 1.6, 0.9, 0.9), '#ffffff');
  }
  for (const gx of [-2, 0, 2]) pen.fill(poly([gx - 0.4, 7.4, gx + 0.4, 7.4, gx + 0.4, 10, gx - 0.4, 10]), BOT.glow);
  // a scanline sheen on the glass
  ctx.globalAlpha = 0.12; for (let y = -6; y < 12; y += 1.6) pen.fill(poly([-13, y, 13, y, 13, y + 0.5, -13, y + 0.5]), '#ffffff');
  ctx.globalAlpha = 1;
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------- GRUMPOS
function drawGrumpos(ctx, t, { pose }) {
  const att = pose === 'attitude', pen = ctx._pen;
  const breath = Math.sin(t * 1.6), chestY = -breath * 0.8;   // slow, heavy breathing
  const shut = blinkShut(t, 3.3);
  groundShadow(ctx, 30);

  // the axe: on his back (stand) or planted head-down in front (attitude)
  const axe = (x, y, ang, s = 1) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
    pen.part(capsule(0, -4, 0, 40, 1.8, 1.6), GRU.haft, { sx: 0.8, sy: 0 });
    for (const yy of [4, 8]) pen.line(strokePath((q) => { q.moveTo(-1.8, yy); q.lineTo(1.8, yy + 1.2); }), shade(GRU.haft, 0.5), 0.9);
    const blade = P();
    blade.moveTo(-1.5, -3); blade.lineTo(-7, -6); blade.bezierCurveTo(-15, -9, -16, 6, -13, 11);
    blade.bezierCurveTo(-11, 8, -6, 4, -1.5, 3); blade.closePath();
    pen.part(blade, GRU.steel, { sx: -1.5, sy: 1.5 });
    pen.line(strokePath((q) => { q.moveTo(-13.6, -5); q.bezierCurveTo(-15, 1, -14.6, 6, -13, 9.6); }), '#ffffff', 1);
    pen.part(ell(0, -1, 2.8, 4.4), GRU.gold, { sx: 0.6, sy: 0.6, lw: 1.1 });
    ctx.restore();
  };
  if (!att) axe(-15, -84 + chestY, -0.62, 0.95);

  // legs: wrapped shins, heavy boots
  for (const s of [-1, 1]) {
    pen.part(capsule(s * 9, -22, s * 10, -7, 6, 5), GRU.skin, { sx: s * 1.4, sy: 0 });
    ctx.save(); ctx.clip(capsule(s * 9, -22, s * 10, -7, 6, 5));
    for (let yy = -18; yy < -7; yy += 3) pen.line(strokePath((q) => { q.moveTo(s * 9 - 7, yy); q.lineTo(s * 9 + 7, yy - 1.8); }), shade(GRU.wrap, 0.4), 1);
    ctx.restore();
    const x = s * 11, d = s;
    const b = P(); b.moveTo(x - d * 7.5, -1); b.bezierCurveTo(x - d * 8, -10, x + d * 1, -10, x + d * 4, -7.5);
    b.bezierCurveTo(x + d * 9.5, -6.5, x + d * 10.5, -1.5, x + d * 9, 0); b.closePath();
    pen.part(b, GRU.boot, { sx: d * 1.6, sy: 2 });
    pen.line(strokePath((q) => { q.moveTo(x - d * 6.5, -5.5); q.quadraticCurveTo(x, -6.6, x + d * 3, -7); }), shade(GRU.boot, 0.5), 1);
  }

  // kilt: pleated, longer at the back, a gold belt with a round boss
  const kilt = poly([-17, -36, 17, -36, 20.5, -15, -20.5, -15], 0.2);
  pen.part(kilt, GRU.kilt, { sx: 2.5, sy: 0 });
  pen.line(strokePath((q) => { for (const x of [-12, -6, 0, 6, 12]) { q.moveTo(x * 0.95, -32); q.lineTo(x * 1.12, -15.5); } }), shade(GRU.kilt, 0.5), 1);

  // the torso: a big V — wide shoulders, pecs, a hint of abs; the tattoo up the right side
  const tor = P();
  tor.moveTo(-23, -61 + chestY); tor.bezierCurveTo(-27, -55, -21, -42, -16, -35);
  tor.lineTo(16, -35); tor.bezierCurveTo(21, -42, 27, -55, 23, -61 + chestY);
  tor.quadraticCurveTo(0, -66 + chestY, -23, -61 + chestY); tor.closePath();
  pen.part(tor, GRU.skin, { sx: 3.6, sy: 3 });
  pen.line(strokePath((q) => {
    q.moveTo(-13, -51 + chestY); q.quadraticCurveTo(-6, -47 + chestY, -1, -50 + chestY);
    q.moveTo(13, -51 + chestY); q.quadraticCurveTo(6, -47 + chestY, 1, -50 + chestY);
    q.moveTo(0, -48 + chestY); q.lineTo(0, -38);
    q.moveTo(-5, -44); q.lineTo(-1.5, -44.4); q.moveTo(5, -44); q.lineTo(1.5, -44.4);
    q.moveTo(-5, -40); q.lineTo(-1.5, -40.2); q.moveTo(5, -40); q.lineTo(1.5, -40.2);
  }), shade(GRU.skin, 0.45), 1);
  ctx.save(); ctx.clip(tor);
  const tat = P();
  tat.moveTo(16, -64); tat.quadraticCurveTo(9, -56, 13, -50); tat.quadraticCurveTo(18, -44, 10, -36);
  tat.lineTo(14, -35); tat.quadraticCurveTo(22, -44, 17, -51); tat.quadraticCurveTo(13, -56, 20, -63); tat.closePath();
  pen.fill(tat, GRU.tat);
  ctx.restore();
  // belt over the kilt top
  pen.part(poly([-17.5, -38, 17.5, -38, 17.8, -33, -17.8, -33], 0.4), GRU.gold, { sx: 0, sy: 1, lw: 1.3 });
  pen.part(ell(0, -35.5, 3.8, 3.4), shade(GRU.gold, 0.12), { sx: 0.8, sy: 0.8, lw: 1.2 });
  pen.part(ell(0, -35.5, 1.4, 1.2), GRU.tat, { sx: 0, sy: 0, lw: 0.8, lit: false });

  // arms: shoulder ball, a bicep, forearm with a gold bracer, a fist
  const arm = (s, hx, hy) => {
    const sx_ = s * 23, sy_ = -58 + chestY;
    const ex = s * 27, ey = -45 + chestY * 0.6;
    pen.part(capsule(sx_, sy_, ex, ey, 6.4, 5.4), GRU.skin, { sx: s * 2, sy: 2 });
    pen.part(capsule(ex, ey, hx, hy, 5.4, 4.6), GRU.skin, { sx: s * 1.6, sy: 1.6 });
    const br = capsule(ex + (hx - ex) * 0.45, ey + (hy - ey) * 0.45, ex + (hx - ex) * 0.8, ey + (hy - ey) * 0.8, 5.4, 5);
    pen.part(br, GRU.gold, { sx: s * 1, sy: 1, lw: 1.2 });
    pen.part(ell(hx, hy + 1, 5.4, 5), GRU.skin, { sx: s * 1.4, sy: 1.6 });
    pen.line(strokePath((q) => { q.moveTo(hx - s * 1, hy - 1.5); q.quadraticCurveTo(hx + s * 2.4, hy - 1.4, hx + s * 3, hy + 1.4); }), shade(GRU.skin, 0.5), 0.9);
  };
  if (att) {
    // the axe planted blade-down in front; both fists stacked on the pommel
    axe(0, 2, Math.PI, 0.95);
    arm(-1, -3, -40 + chestY * 0.5);
    arm(1, 3, -43 + chestY * 0.5);
  } else {
    arm(-1, -29, -31 + chestY * 0.4);
    arm(1, 29, -31 + chestY * 0.4);
  }

  // head: a bald egg, ears, a heavy brow, the beard, the red stripe
  const hb = Math.sin(t * 1.6 - 0.5) * 0.5;
  ctx.save(); ctx.translate(0, -76 + hb + chestY * 0.5); ctx.rotate(att ? 0.04 : 0);
  for (const s of [-1, 1]) pen.part(ell(s * 13.4, 1, 3, 4.2), GRU.skin, { sx: s * 0.8, sy: 0.8, lw: 1.3 });
  const head = P();
  head.moveTo(-13, 6); head.bezierCurveTo(-15, -6, -12, -19, 0, -19.5); head.bezierCurveTo(12, -19, 15, -6, 13, 6);
  head.quadraticCurveTo(0, 12, -13, 6); head.closePath();
  pen.part(head, GRU.skin, { sx: 2.8, sy: 2.8 });
  ctx.save(); ctx.clip(head);
  const st = P();
  st.moveTo(3, -21); st.quadraticCurveTo(7, -12, 4.6, -4); st.lineTo(7.4, -4); st.quadraticCurveTo(11, -12, 7, -21); st.closePath();
  st.moveTo(6.6, 4); st.quadraticCurveTo(9, 7, 8, 11); st.lineTo(10.4, 11); st.quadraticCurveTo(11.6, 6, 9.4, 3); st.closePath();
  pen.fill(st, GRU.tat);
  ctx.restore();
  pen.glint(-6, -13, 1.6);
  // brow ridge: one heavy scowl
  for (const s of [-1, 1]) {
    const b = P(); b.moveTo(s * 1.2, -2.4); b.lineTo(s * 9.4, -6.4); b.lineTo(s * 9.8, -4.2); b.lineTo(s * 1.6, -0.4); b.closePath();
    pen.part(b, GRU.beard, { sx: 0, sy: 0.5, lw: 0.9 });
  }
  // small, deep-set and hooded: a white sliver under the brow and a dark pupil
  for (const s of [-1, 1]) {
    const ex = s * 5, ey = 1.6;
    if (shut) { pen.line(strokePath((q) => { q.moveTo(ex - 2.6, ey); q.lineTo(ex + 2.6, ey); }), INK, 1.2); continue; }
    pen.flat(ell(ex, ey + 0.4, 2.7, 1.7), '#f4f0e8', 0.9);
    pen.fill(ell(ex + s * -0.4, ey + 0.5, 1.2, 1.4), GRU.eye);
    pen.glint(ex + s * -0.4 - 0.4, ey, 0.4);
  }
  pen.part(ell(0, 5.6, 2.6, 2.4), shade(GRU.skin, 0.08), { sx: 0.8, sy: 0.8, lw: 1 });
  // the beard: a heavy spade from ear to ear, a mouth slot showing a grimace
  const beard = P();
  beard.moveTo(-13.4, 4); beard.bezierCurveTo(-14, 14, -10, 22, 0, 24);
  beard.bezierCurveTo(10, 22, 14, 14, 13.4, 4);
  beard.quadraticCurveTo(10, 8, 6, 7.4); beard.quadraticCurveTo(0, 6, -6, 7.4); beard.quadraticCurveTo(-10, 8, -13.4, 4); beard.closePath();
  pen.part(beard, GRU.beard, { sx: 1.6, sy: 2, deep: 0.25 });
  pen.line(strokePath((q) => { q.moveTo(-6, 14); q.quadraticCurveTo(-5, 18, -3, 20); q.moveTo(5, 13); q.quadraticCurveTo(4.6, 17, 2.6, 21); }), tint(GRU.beard, 0.3), 0.8);
  const mouth = poly([-4, 10, 4, 10, 3.6, 12.4, -3.6, 12.4], 0.5);
  pen.part(mouth, '#efe8dc', { sx: 0, sy: 0, lw: 1, lit: false });
  pen.line(strokePath((q) => { q.moveTo(-3.6, 11.2); q.lineTo(3.6, 11.2); q.moveTo(0, 10); q.lineTo(0, 12.4); }), INK, 0.6);
  ctx.restore();
}

// ---------------------------------------------------------------- DON K. EGGSHELL
// 16 Oct 2026: "also do eggshell". The villain as he flies — the silver professor in the
// clown-copter tub (props.js eggshellCopterArt is NOW). His idle is the hover: the rotor
// turns, the machine bobs, the lamps breathe. Stand = fists on the rim; attitude = he
// rubs his hands together, which is the only thing a man in a flying bathtub can do.
const EGG = {
  skin: '#efc9a2', mane: '#d6dbe6', suit: '#2a2433', cape: '#c83030', shirt: '#f2efe8',
  tie: '#c83030', tub: '#f0ebdc', stripe: '#c83030', rim: '#d0d0dc', lens: '#c8e0f8',
  lamp: '#7ec0f8', mast: '#3a3a48', blade: '#4a4a5a', stache: '#c9ced8',
};
function drawEggshell(ctx, t, { pose }) {
  const att = pose === 'attitude', pen = ctx._pen;
  const shut = blinkShut(t, 1.3);
  // a smaller shadow far below: he's flying
  groundShadow(ctx, 18 - Math.sin(t * 1.8) * 1.5, 0.18);
  const lift = -8 + Math.sin(t * 1.8) * 2;
  ctx.save(); ctx.translate(0, lift); ctx.rotate(Math.sin(t * 0.9) * 0.025);

  // rotor: far blade behind him, near blade over his mane
  const hubY = -98, R = 34, sq = 0.16, a = t * 22;
  const blade = (b, front) => {
    const x2 = Math.cos(b) * R, y2 = hubY + Math.sin(b) * R * sq;
    ctx.save();
    ctx.strokeStyle = 'rgba(206,212,228,0.45)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(0, hubY, R * 0.82, R * sq * 0.82, 0, b - 1.2, b); ctx.stroke();
    ctx.restore();
    pen.part(capsule(Math.cos(b) * 3, hubY + Math.sin(b) * 3 * sq, x2, y2, 1.6, 2.2), EGG.blade, { sx: 0, sy: 0.6, lw: 1.1 });
  };
  for (const b of [a, a + Math.PI]) if (Math.sin(b) < 0) blade(b);
  pen.part(poly([-1.4, hubY, 1.4, hubY, 1.6, -78, -1.6, -78], 0.2), EGG.mast, { sx: 0.5, sy: 0, lw: 1 });

  // the cape collar: two tall red-lined wings behind his head
  for (const s of [-1, 1]) {
    const w = P();
    w.moveTo(s * 6, -46); w.bezierCurveTo(s * 14, -54, s * 22, -66, s * 28, -70);
    w.bezierCurveTo(s * 30, -60, s * 30, -48, s * 26, -38); w.lineTo(s * 8, -38); w.closePath();
    pen.part(w, EGG.suit, { sx: s * 1.5, sy: 1.5 });
    const lin = P();
    lin.moveTo(s * 9, -45); lin.bezierCurveTo(s * 15, -52, s * 21, -61, s * 26, -65);
    lin.bezierCurveTo(s * 27, -56, s * 26.5, -48, s * 24, -40); lin.lineTo(s * 10, -40); lin.closePath();
    pen.part(lin, EGG.cape, { sx: s * 1, sy: 1, lw: 1, lit: false });
  }
  // shoulders + shirt front + tie
  const sh = P();
  sh.moveTo(-24, -34); sh.bezierCurveTo(-23, -44, -14, -48, 0, -48); sh.bezierCurveTo(14, -48, 23, -44, 24, -34); sh.closePath();
  pen.part(sh, EGG.suit, { sx: 2.5, sy: 2.5 });
  const shirt = poly([-6.5, -48, 6.5, -48, 3, -34, -3, -34], 0.2);
  pen.part(shirt, EGG.shirt, { sx: 1, sy: 1, lw: 1.1, lit: false });
  for (const s of [-1, 1]) pen.part(poly([0, -45.5, s * 7.5, -49, s * 6, -43.5], 0.2), EGG.shirt, { sx: 0, sy: 0.6, lw: 1, lit: false });
  pen.part(poly([-1.6, -45, 1.6, -45, 2.4, -36, 0, -34, -2.4, -36], 0.2), EGG.tie, { sx: 0.6, sy: 0.6, lw: 1 });
  pen.part(poly([-2, -46.6, 2, -46.6, 1.4, -44.2, -1.4, -44.2], 0.3), shade(EGG.tie, 0.1), { sx: 0, sy: 0.4, lw: 0.9 });

  // head
  const hx = 0, hy = -62 + Math.sin(t * 1.8 - 0.6) * 0.5;
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(att ? -0.05 : 0);
  // the mane: a wild silver burst behind the head
  const mane = P();
  const spikes = 15;
  for (let i = 0; i <= spikes; i++) {
    const k = i / spikes, ang = Math.PI * (0.92 + k * 1.16);
    const r = 15 + (i % 2 ? 2.5 : 10 + Math.sin(i * 2.3 + t * 2.4) * 0.8) + (Math.abs(k - 0.5) < 0.2 ? 3 : 0);
    const x = Math.cos(ang) * r * 1.1, y = Math.sin(ang) * r - 1;
    if (i === 0) mane.moveTo(x, y); else mane.lineTo(x, y);
  }
  mane.lineTo(14, 4); mane.lineTo(-14, 4); mane.closePath();
  pen.part(mane, EGG.mane, { sx: 2.5, sy: 2.5, deep: 0.38 });
  for (const s of [-1, 1]) pen.part(ell(s * 12.6, 1.5, 2.6, 3.6), EGG.skin, { sx: s * 0.6, sy: 0.6, lw: 1.1 });
  const head = P();
  head.moveTo(-12, -4); head.bezierCurveTo(-12, -16, 12, -16, 12, -4);
  head.bezierCurveTo(12.5, 8, 8, 14, 0, 14.5); head.bezierCurveTo(-8, 14, -12.5, 8, -12, -4); head.closePath();
  pen.part(head, EGG.skin, { sx: 2.4, sy: 2.4 });
  // stubble on the jaw
  ctx.save(); ctx.clip(head);
  ctx.fillStyle = 'rgba(200,205,215,0.55)'; ctx.fill(ell(0, 11, 11, 6.5));
  ctx.restore();
  // a forelock of mane over the brow
  const fore = P(); fore.moveTo(-9, -10); fore.lineTo(-3, -16); fore.lineTo(-2, -9); fore.lineTo(3, -15); fore.lineTo(4, -9.5); fore.lineTo(9, -13); fore.lineTo(9.5, -8); fore.quadraticCurveTo(0, -12, -9, -8); fore.closePath();
  pen.part(fore, EGG.mane, { sx: 1, sy: 1, deep: 0.35, lw: 1.1 });
  // brows: angry, angled in
  const scowl = att ? 1.2 : 0.4;
  for (const s of [-1, 1]) {
    const b = P(); b.moveTo(s * 1.4, -4.6 + scowl); b.lineTo(s * 9.6, -8.2); b.lineTo(s * 9.8, -6.2); b.lineTo(s * 1.8, -2.4 + scowl); b.closePath();
    pen.part(b, '#9aa0ae', { sx: 0, sy: 0.4, lw: 0.9 });
  }
  // eyes behind fine rectangular specs
  const look = att ? 0.6 : Math.sin(t * 0.5) > 0.7 ? -0.8 : 0;
  for (const s of [-1, 1]) {
    const ex = s * 5.2, ey = 0;
    if (shut) pen.line(strokePath((q) => { q.moveTo(ex - 2.4, ey + 0.4); q.quadraticCurveTo(ex, ey + 1.6, ex + 2.4, ey + 0.4); }), INK, 1.1);
    else {
      pen.flat(ell(ex, ey, 2.6, 2.4), '#ffffff', 1);
      pen.fill(ell(ex + look * 0.8, ey + 0.3, 1.3, 1.5), INK);
      pen.glint(ex + look * 0.8 - 0.5, ey - 0.4, 0.45);
    }
    const lens = poly([ex - 4.4, ey - 3, ex + 4.2, ey - 3, ex + 3.8, ey + 3.2, ex - 4, ey + 3.2], 0.35);
    ctx.globalAlpha = 0.28; pen.fill(lens, EGG.lens); ctx.globalAlpha = 1;
    pen.line(lens, INK, 1);
    pen.line(strokePath((q) => { q.moveTo(ex - 3, ey - 2); q.lineTo(ex - 1.4, ey - 2.4); }), '#ffffff', 0.8);
  }
  pen.line(strokePath((q) => { q.moveTo(-0.8, -0.8); q.quadraticCurveTo(0, -1.6, 0.8, -0.8); q.moveTo(-9.2, -1); q.lineTo(-12, -0.4); q.moveTo(9.2, -1); q.lineTo(12, -0.4); }), INK, 1);
  // nose, moustache, the mouth: a thin smile when he schemes, a frown when he waits
  pen.part(ell(0, 5, 2.4, 2.6), shade(EGG.skin, 0.05), { sx: 0.8, sy: 0.8, lw: 1 });
  for (const s of [-1, 1]) {
    const m = P(); m.moveTo(s * 0.6, 7.6); m.bezierCurveTo(s * 4, 6.6, s * 8, 7.4, s * 9.4, 10.2); m.bezierCurveTo(s * 6.4, 9.8, s * 3, 10.4, s * 0.6, 9.6); m.closePath();
    pen.part(m, EGG.stache, { sx: 0, sy: 0.8, deep: 0.35, lw: 1 });
  }
  pen.line(strokePath((q) => att
    ? (q.moveTo(-4.6, 11), q.quadraticCurveTo(0, 13.8, 4.6, 11), q.lineTo(5.4, 10.2))
    : (q.moveTo(-3.6, 12.4), q.quadraticCurveTo(0, 11.2, 3.6, 12.4))), INK, 1.1);
  ctx.restore();

  // the near rotor blade over the mane
  for (const b of [a, a + Math.PI]) if (Math.sin(b) >= 0) blade(b);
  pen.part(ell(0, hubY, 3, 2), '#8a8a98', { sx: 0.5, sy: 0.5, lw: 1 });

  // the tub: cream hull, red stripes, a grey rim, two headlamps that breathe
  const hull = poly([-27, -36, 27, -36, 25, -6, 20, -2, -20, -2, -25, -6], 0.35);
  pen.part(hull, EGG.tub, { sx: 3, sy: 3, deep: 0.25 });
  ctx.save(); ctx.clip(hull);
  for (const x of [-7.5, -1.5, 4.5]) pen.fill(poly([x, -36, x + 3.6, -36, x + 3.6, 0, x, 0]), EGG.stripe);
  ctx.restore();
  pen.flat(hull, 'transparent', 1.6);
  pen.part(poly([-29, -39, 29, -39, 29, -34.5, -29, -34.5], 0.6), EGG.rim, { sx: 0, sy: 1.2 });
  const glow = 0.5 + 0.5 * Math.sin(t * 2.2);
  for (const s of [-1, 1]) {
    const lx = s * 16.5, ly = -20;
    ctx.fillStyle = `rgba(126,192,248,${0.18 + 0.18 * glow})`; ctx.fill(ell(lx, ly, 7.5, 7.5));
    pen.part(ell(lx, ly, 4.8, 4.8), EGG.lamp, { sx: -1, sy: -1, deep: 0.2, lw: 1.2, lit: false });
    pen.fill(ell(lx - 1.2, ly - 1.2, 1.6, 1.6), '#ffffff');
  }
  // rivets along the rim
  for (let x = -24; x <= 24; x += 8) pen.fill(ell(x, -36.8, 0.7, 0.7), shade(EGG.rim, 0.4));

  // hands: fists on the rim, or rubbing together above it
  const fist = (x, y, s) => {
    pen.part(ell(x, y, 4.4, 4), EGG.skin, { sx: s * 1.2, sy: 1.4 });
    pen.line(strokePath((q) => { q.moveTo(x - s * 0.4, y - 1.6); q.quadraticCurveTo(x + s * 2, y - 1.6, x + s * 2.6, y + 0.6); }), shade(EGG.skin, 0.5), 0.8);
    pen.part(capsule(x - s * 3.6, y + 0.4, x - s * 5.4, y + 0.6, 2.6), EGG.shirt, { sx: 0, sy: 0.6, lw: 1, lit: false });
  };
  if (att) {
    const rub = Math.sin(t * 9) * 1.6;
    fist(-3.4 + rub, -42, 1);
    fist(3.4 - rub, -41, -1);
  } else {
    fist(-21, -38, -1);
    fist(21, -38, 1);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- entry
const PAINTERS = { lorenzo: drawLorenzo, ramon: drawRamon, rusty: drawRusty, b33p: drawB33p, grumpos: drawGrumpos, eggshell: drawEggshell };

// Draws a candidate with its feet at (x, feet), `h` frame px tall.
export function drawPolishedHero(ctx, heroId, cand, x, feet, h, t) {
  // h is in the tile's frame px; under ~70 the figure is hub- or lane-sized
  ctx.save();
  ctx.translate(x, feet);
  const s = h / 100;
  ctx.scale(s, s);
  const m = ctx.getTransform();
  ctx._pen = makePen(ctx, cand.finish, Math.hypot(m.a, m.b), h < 70);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  PAINTERS[heroId](ctx, t, cand);
  delete ctx._pen;
  ctx.restore();
}

export const HERO_POLISH_CANDIDATES = [
  { letter: 'A', id: 'cel', name: 'CEL', finish: 'cel', pose: 'stand',
    note: 'The menu stance, drawn again: solid ink, one hard shadow tone and a lit edge on every shape, glints in the eyes.' },
  { letter: 'B', id: 'cel-attitude', name: 'CEL · ATTITUDE', finish: 'cel', pose: 'attitude',
    note: 'A’s finish with something to do — Lorenzo shoulders the wrench (a tap every four seconds), Ramon folds his arms and taps a foot.' },
  { letter: 'C', id: 'soft', name: 'STORYBOOK', finish: 'soft', pose: 'stand',
    note: 'No black ink: each shape is lined in a darker shade of its own colour, and the shadow is airbrushed.' },
];

export const POLISH_HEROES = ['lorenzo', 'ramon', 'rusty', 'b33p', 'grumpos', 'eggshell'];
