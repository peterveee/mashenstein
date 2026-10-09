// THE MIXER'S ICONS — the head of each strip on the Lab club's mixer panel: a part's (drums,
// bass, chords, lead) over its MUTE and SOLO, a speaker over the MASTER strip, and the tempo's
// over the PITCH strip.
//
// Each is `(g, x, y, r, o)`: centred on (x, y), `r` the strip's icon size (the panel's own
// units, club.js drawControls), in the ink the caller has set as both strokeStyle and fillStyle
// (silver while the part is heard, OFF_INK while it is not) and at its lineWidth. `o` carries
// `u` (the screen's line unit), `beat` (the beat as heard), `on` (whether the part is heard) and
// `cut` (the panel's colour, for anything knocked out of a solid icon).
//
// The set is A from the bake-off (Peter, 7 Oct 2026; src/dev/mixer-icon-candidates.js): the
// instruments, outlined — a snare with its sticks crossed on the head, a bass guitar, the keys F
// to B (four white, three black), two beamed quavers, a metronome on a plinth — in the strip's
// own fine line, as the icons before it were. The shapes take their line as a fraction of r, so
// the bake-off draws them heavier from the same code.

const TAU = Math.PI * 2;

function rrect(g, x, y, w, h, rad) {
  g.beginPath();
  g.moveTo(x + rad, y); g.arcTo(x + w, y, x + w, y + h, rad); g.arcTo(x + w, y + h, x, y + h, rad);
  g.arcTo(x, y + h, x, y, rad); g.arcTo(x, y, x + w, y, rad); g.closePath();
}
const seg = (g, x1, y1, x2, y2) => { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
const dot = (g, x, y, rad) => { g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill(); };
/** Round caps and joins, the line `k` of the icon's size. */
const pen = (g, r, k = 0.12) => { g.lineWidth = r * k; g.lineCap = 'round'; g.lineJoin = 'round'; };

// ------------------------------------------------------------------------------------- shapes

/**
 * The bass guitar's body, a figure of eight about the y axis: the lower bout (centre c1, radius
 * r1) and the upper (c2, r2), joined at the waist where the two circles cross.
 */
function guitarBody(g, c1, r1, c2, r2) {
  const d = c1 - c2, a = (d * d + r1 * r1 - r2 * r2) / (2 * d), h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const wy = c1 - a;                                   // the waist
  const l1 = Math.atan2(wy - c1, -h), r1a = Math.atan2(wy - c1, h);
  const l2 = Math.atan2(wy - c2, -h), r2a = Math.atan2(wy - c2, h);
  g.beginPath();
  g.arc(0, c1, r1, r1a, l1 + TAU, false);             // round the bottom, right waist to left
  g.arc(0, c2, r2, l2, r2a + TAU, false);             // round the top, left waist to right
  g.closePath();
}

/**
 * The bass guitar, head up and to the right, in its own units (r = 1): `solid` fills it and
 * knocks out the pickup and bridge, otherwise it is outlined. `nod` tips it, in radians.
 */
export function bassGuitar(g, x, y, r, { solid = false, cut = '#0e0e18', nod = 0, lw = 0.12 } = {}) {
  g.save();
  g.translate(x, y); g.rotate(Math.PI / 4 + nod); g.scale(r, r); g.translate(0, 0.06);
  g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round';
  const neckL = -0.065, neckW = 0.13, neckT = -0.8, neckB = -0.04;
  if (solid) {
    guitarBody(g, 0.55, 0.32, 0.13, 0.23); g.fill();
    g.fillRect(neckL, neckT, neckW, neckB - neckT + 0.05);
    rrect(g, -0.115, -1.02, 0.23, 0.26, 0.06); g.fill();
    for (const py of [-0.95, -0.84]) { dot(g, -0.17, py, 0.045); dot(g, 0.17, py, 0.045); }
    g.fillStyle = cut;
    g.fillRect(-0.13, 0.36, 0.26, 0.075);              // the pickup
    g.fillRect(-0.1, 0.63, 0.2, 0.06);                  // the bridge
  } else {
    guitarBody(g, 0.55, 0.32, 0.13, 0.23);
    g.stroke();
    g.beginPath(); g.moveTo(neckL, neckB); g.lineTo(neckL, neckT); g.moveTo(neckL + neckW, neckT); g.lineTo(neckL + neckW, neckB); g.stroke();
    rrect(g, -0.115, -1.02, 0.23, 0.24, 0.06); g.stroke();
    g.lineWidth = lw * 0.8;
    for (const py of [-0.95, -0.86]) { seg(g, -0.115, py, -0.19, py); seg(g, 0.115, py, 0.19, py); }
    g.fillRect(-0.13, 0.37, 0.26, 0.07);
    g.fillRect(-0.1, 0.64, 0.2, 0.05);
  }
  g.restore();
}

/**
 * Two beamed quavers. `lift` raises each head (0–1, its own hop); `heads` 'note' or 'x'; `stem`
 * and `beam` their thicknesses, of r.
 */
export function quavers(g, x, y, r, { k = 1, lift = [0, 0], heads = 'note', stem = 0.11 * k, beam = 0.19 * k } = {}) {
  const hs = [[-0.4, 0.5], [0.38, 0.36]], beamT = [-0.56, -0.7];
  const rx = 0.22 * k, ry = 0.155 * k, stemW = stem, beamH = beam;
  const stemX = (hx) => hx + (heads === 'x' ? 0.15 : rx * 0.92);
  hs.forEach(([hx, hy], i) => {
    const dy = -lift[i] * 0.14;
    const sx = stemX(hx), headY = (hy + dy) * r;
    if (heads === 'x') {
      g.lineWidth = r * 0.1;
      const s = 0.15 * r;
      seg(g, x + hx * r - s, y + headY - s, x + hx * r + s, y + headY + s);
      seg(g, x + hx * r - s, y + headY + s, x + hx * r + s, y + headY - s);
    } else {
      g.beginPath(); g.ellipse(x + hx * r, y + headY, rx * r, ry * r, -0.4, 0, TAU); g.fill();
    }
    g.lineWidth = stemW * r;
    seg(g, x + sx * r, y + headY - (heads === 'x' ? 0.12 : 0.04) * r, x + sx * r, y + (beamT[i] + dy) * r);
  });
  // the beam, slanting up to the right, riding with the heads
  const x1 = x + stemX(hs[0][0]) * r - stemW * r / 2, x2 = x + stemX(hs[1][0]) * r + stemW * r / 2;
  const y1 = y + (beamT[0] - lift[0] * 0.14) * r, y2 = y + (beamT[1] - lift[1] * 0.14) * r;
  g.beginPath(); g.moveTo(x1, y1 - 0.02 * r); g.lineTo(x2, y2 - 0.02 * r); g.lineTo(x2, y2 + beamH * r); g.lineTo(x1, y1 + beamH * r); g.closePath(); g.fill();
}

/** A snare drum and its two sticks resting on the head; `lift` raises each stick (0–1). */
export function snare(g, x, y, r, { lift = [0, 0], lw = 0.12, tip = 0.075 } = {}) {
  const hy = y - r * 0.06, by = y + r * 0.46, rx = r * 0.62, ry = r * 0.2;
  pen(g, r, lw);
  g.beginPath(); g.ellipse(x, hy, rx, ry, 0, 0, TAU); g.stroke();
  g.beginPath(); g.moveTo(x - rx, hy); g.lineTo(x - rx, by); g.ellipse(x, by, rx, ry, 0, Math.PI, 0, true); g.lineTo(x + rx, hy); g.stroke();
  // the lugs between the hoops, on the drum's curve
  g.lineWidth = r * lw * 0.75;
  for (const k of [-0.6, 0, 0.6]) {
    const curve = ry * Math.sqrt(1 - k * k);
    seg(g, x + k * rx, hy + curve + r * 0.1, x + k * rx, by + curve - r * 0.06);
  }
  // the sticks, crossed above the head, each turning up about its butt end
  g.lineWidth = r * lw;
  [[-1, lift[0]], [1, lift[1]]].forEach(([s, l]) => {
    const bx = x + s * r * 0.74, byy = y - r * 0.84;      // the butt, in the hand
    const a = Math.atan2(r * 0.66, -s * r * 0.86) + s * l * 0.5;
    const len = r * 1.08, tx = bx + Math.cos(a) * len, ty = byy + Math.sin(a) * len;
    seg(g, bx, byy, tx, ty);
    dot(g, tx, ty, r * tip);
  });
}

/**
 * Piano keys: `n` white keys, and a black key on each boundary in `black` (1 is the one after the
 * first white key; the default puts them where C to G has them). `down` fills white keys (0–1 each).
 */
export function pianoKeys(g, x, y, r, { n = 5, w = 1.56, h = 1.02, lw = 0.11, down = null, black = [1, 2, 4] } = {}) {
  const W = r * w, Hh = r * h, l = x - W / 2, t = y - Hh / 2, kw = W / n;
  pen(g, r, lw);
  if (down) {
    for (let i = 0; i < n; i++) if (down[i] > 0) {
      g.save(); g.globalAlpha *= 0.55 * down[i]; g.fillRect(l + kw * i, t + Hh * 0.08, kw, Hh * 0.92); g.restore();
    }
  }
  rrect(g, l, t, W, Hh, r * 0.1); g.stroke();
  for (let i = 1; i < n; i++) seg(g, l + kw * i, t + Hh * 0.6, l + kw * i, t + Hh);
  for (let i = 1; i < n; i++) if (black.includes(i)) g.fillRect(l + kw * i - kw * 0.3, t, kw * 0.6, Hh * 0.6);
}

/** A metronome on a plinth, outlined, its arm swinging out to a side each beat; `plinth` and `weight` of r. */
export function metronome(g, x, y, r, beat, { lw = 0.12, solid = false, cut = '#0e0e18', plinth = 0.17, weight = [0.26, 0.18] } = {}) {
  const swing = 0.4 * Math.cos(Math.PI * beat);
  const by = y + r * 0.6, ty = y - r * 0.6;
  pen(g, r, lw);
  g.beginPath();
  g.moveTo(x - r * 0.48, by); g.lineTo(x - r * 0.17, ty); g.lineTo(x + r * 0.17, ty); g.lineTo(x + r * 0.48, by);
  g.closePath();
  if (solid) g.fill(); else g.stroke();
  g.fillRect(x - r * 0.62, by - r * 0.02, r * 1.24, r * plinth);    // the plinth
  const pivot = by - r * 0.24, arm = r * 1.0;
  const ax = x + Math.sin(swing) * arm, ay = pivot - Math.cos(swing) * arm;
  const wx = x + Math.sin(swing) * arm * 0.62, wy = pivot - Math.cos(swing) * arm * 0.62;
  if (solid) {                                          // the arm, with a knocked-out edge so it reads on the body
    g.save(); g.strokeStyle = cut; g.lineWidth = r * 0.26; seg(g, x, pivot, ax, ay); g.restore();
  }
  seg(g, x, pivot, ax, ay);
  g.save(); g.translate(wx, wy); g.rotate(swing);
  if (solid) { g.fillStyle = cut; g.fillRect(-r * 0.19, -r * 0.14, r * 0.38, r * 0.28); g.restore(); g.save(); g.translate(wx, wy); g.rotate(swing); }
  g.fillRect(-r * weight[0] / 2, -r * weight[1] / 2, r * weight[0], r * weight[1]);
  g.restore();
}

/** A loudspeaker, outlined — its box, its cone, and two waves off it; the line `lw` of r. */
export function speaker(g, x, y, r, { lw = 0.12 } = {}) {
  pen(g, r, lw);
  const bx = x - r * 0.6, cx = x - r * 0.26, mx = x + r * 0.08;
  g.beginPath();
  g.moveTo(bx, y - r * 0.22); g.lineTo(cx, y - r * 0.22); g.lineTo(mx, y - r * 0.56);
  g.lineTo(mx, y + r * 0.56); g.lineTo(cx, y + r * 0.22); g.lineTo(bx, y + r * 0.22);
  g.closePath(); g.stroke();
  seg(g, cx, y - r * 0.22, cx, y + r * 0.22);
  for (const rad of [0.3, 0.56]) { g.beginPath(); g.arc(mx, y, r * rad, -0.85, 0.85); g.stroke(); }
}

// ----------------------------------------------------------------------------------- the set

/** The caller's line, as a fraction of the icon's size: the strip's own fine line. */
const fine = (g, r) => g.lineWidth / r;

export const MIXER_ICONS = Object.freeze({
  drums: (g, x, y, r) => { g.save(); snare(g, x, y, r, { lw: fine(g, r), tip: 0.06 }); g.restore(); },
  bass: (g, x, y, r) => { g.save(); bassGuitar(g, x, y, r, { lw: fine(g, r) }); g.restore(); },
  // F to B: four white keys, a black one between each
  chords: (g, x, y, r) => { g.save(); pianoKeys(g, x, y, r, { n: 4, w: 1.36, h: 0.98, black: [1, 2, 3], lw: fine(g, r) }); g.restore(); },
  lead: (g, x, y, r) => {
    g.save();
    const lw = fine(g, r);
    pen(g, r, lw); quavers(g, x, y, r, { stem: lw, beam: 0.14 });
    g.restore();
  },
  master: (g, x, y, r) => { g.save(); speaker(g, x, y, r, { lw: fine(g, r) }); g.restore(); },
  tempo: (g, x, y, r, { beat = 0 } = {}) => {
    g.save(); metronome(g, x, y, r, beat, { lw: fine(g, r), plinth: 0.11, weight: [0.22, 0.15] }); g.restore();
  },
});

/** The set the mixer had until 7 Oct 2026, kept for the gallery's bake-off (X). */
export const MIXER_ICONS_BEFORE = Object.freeze({
  // a drum
  drums: (g, x, y, r) => {
    g.beginPath(); g.ellipse(x, y - r * 0.28, r * 0.55, r * 0.2, 0, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(x - r * 0.55, y - r * 0.28); g.lineTo(x - r * 0.55, y + r * 0.3);
    g.ellipse(x, y + r * 0.3, r * 0.55, r * 0.2, 0, Math.PI, 0, true); g.lineTo(x + r * 0.55, y - r * 0.28); g.stroke();
  },
  // a bass wave
  bass: (g, x, y, r) => {
    g.beginPath();
    for (let k = 0; k <= 16; k++) {
      const px = x - r * 0.6 + k / 16 * r * 1.2;
      const py = y + Math.sin(k / 16 * Math.PI * 2) * r * 0.32;
      if (k) g.lineTo(px, py); else g.moveTo(px, py);
    }
    g.stroke();
  },
  // keys
  chords: (g, x, y, r) => { for (const dx of [-0.42, 0, 0.42]) g.strokeRect(x + dx * r - r * 0.17, y - r * 0.45, r * 0.34, r * 0.9); },
  // a note
  lead: (g, x, y, r) => {
    g.beginPath(); g.ellipse(x - r * 0.18, y + r * 0.32, r * 0.22, r * 0.16, -0.4, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(x + r * 0.03, y + r * 0.3); g.lineTo(x + r * 0.03, y - r * 0.5);
    g.quadraticCurveTo(x + r * 0.35, y - r * 0.35, x + r * 0.42, y - r * 0.1); g.stroke();
  },
  // the metronome: a body narrowing to its top, and the arm swinging out to a side each beat
  tempo: (g, x, y, r, { beat = 0 } = {}) => {
    const swing = 0.42 * Math.cos(Math.PI * (beat || 0));
    const by = y + r * 0.5, ty = y - r * 0.55;
    g.beginPath();
    g.moveTo(x - r * 0.5, by); g.lineTo(x - r * 0.2, ty); g.lineTo(x + r * 0.2, ty); g.lineTo(x + r * 0.5, by);
    g.closePath(); g.stroke();
    const pivot = by - r * 0.18, arm = r * 0.82;
    const ax = x + Math.sin(swing) * arm, ay = pivot - Math.cos(swing) * arm;
    g.beginPath(); g.moveTo(x, pivot); g.lineTo(ax, ay); g.stroke();
    const wx = x + Math.sin(swing) * arm * 0.6, wy = pivot - Math.cos(swing) * arm * 0.6;
    g.fillRect(wx - r * 0.11, wy - r * 0.08, r * 0.22, r * 0.16);
  },
});
