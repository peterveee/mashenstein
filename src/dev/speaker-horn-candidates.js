// THE CLUB SPEAKERS' HORN BAKE-OFF — what fills the top box's high-frequency slot. 5 Oct 2026.
//
// Peter pasted a spec: replace the top box's dark port with a flared rectangular horn tweeter, as
// wide as the two woofers below and 55–60% of a woofer's diameter high, "a finished, professional
// PA speaker look", no lights and no animation. A is that spec to the letter; B is the same horn
// in the club's own purples (the spec's greys were picked to "match the cabinet", which is
// #1c1733, not grey); C–F are other horns a PA has worn. Every candidate fills the same slot
// (speakers.js topBoxLayout) and is drawn on the club's own cabinets (drawSpeakerStack).
//
// SETTLED 5 Oct 2026: B is the club's horn (speakers.js PA_HORN), so A and B are drawn by the
// painter that lives there now; C–F stay here for the gallery.
//
// Each `paint(ctx, { slot, u, rr })` draws into `slot` ({ x, y, w, h }, frame px).

import { flaredHorn, HORN_SPEC as SPEC, HORN_PURPLE as PURPLE, hornBezel as bezel, hornChute as chute, hornBullet as bullet } from '../game/banger/speakers.js';

/** A constant-directivity waveguide: a rounded mouth curving in through contours to a round throat. */
function waveguide(pal) {
  return (ctx, o) => {
    const { slot, u, rr } = o;
    const m = bezel(ctx, o, pal, slot.h / 2);
    const cx = m.x + m.w / 2, cy = m.y + m.h / 2;
    const steps = 4;
    for (let i = 0; i < steps; i++) {
      const k = i / steps, w = m.w * (1 - k * 0.72), h = m.h * (1 - k * 0.5);
      const a = 1 - k;
      ctx.fillStyle = mix(pal.edge, pal.throat, k);
      rr(ctx, cx - w / 2, cy - h / 2, w, h, h / 2); ctx.fill();
      ctx.strokeStyle = pal.inset; ctx.globalAlpha = 0.25 + 0.35 * a; ctx.lineWidth = 0.5 * u; ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const r = m.h * 0.3;
    ctx.fillStyle = pal.throat;
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.25, 0, Math.PI * 2); ctx.fill();
    bullet(ctx, cx, cy, r * 0.8, pal);
  };
}

/** A bi-radial: the mouth pinched at the waist, top and bottom bowing in, to a tall diffraction slot. */
function biradial(pal) {
  return (ctx, o) => {
    const m = bezel(ctx, o, pal);
    const { u } = o;
    const cx = m.x + m.w / 2, cy = m.y + m.h / 2, pinch = m.h * 0.2;
    const mouth = () => {
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.quadraticCurveTo(cx, m.y + pinch * 2, m.x + m.w, m.y);
      ctx.lineTo(m.x + m.w, m.y + m.h);
      ctx.quadraticCurveTo(cx, m.y + m.h - pinch * 2, m.x, m.y + m.h);
      ctx.closePath();
    };
    ctx.fillStyle = pal.bezel; ctx.fillRect(m.x, m.y, m.w, m.h);
    const g = ctx.createLinearGradient(m.x, 0, m.x + m.w, 0);
    g.addColorStop(0, pal.edge); g.addColorStop(0.5, pal.throat); g.addColorStop(1, pal.edge);
    ctx.fillStyle = g; mouth(); ctx.fill();
    ctx.strokeStyle = pal.inset; ctx.lineWidth = 0.6 * u; ctx.stroke();
    // the slot, and the walls flaring off its ends
    const sw = Math.max(1.2 * u, m.w * 0.06), sh = m.h - pinch * 2.2;
    ctx.globalAlpha = 0.6; ctx.lineWidth = 0.5 * u;
    ctx.beginPath();
    for (const [x, y, ex, ey] of [[m.x, m.y, cx - sw / 2, cy - sh / 2], [m.x + m.w, m.y, cx + sw / 2, cy - sh / 2],
      [m.x, m.y + m.h, cx - sw / 2, cy + sh / 2], [m.x + m.w, m.y + m.h, cx + sw / 2, cy + sh / 2]]) {
      ctx.moveTo(x, y); ctx.quadraticCurveTo((x + ex) / 2, ey, ex, ey);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(cx - sw / 2, cy - sh / 2, sw, sh);
    ctx.fillStyle = pal.glint;
    ctx.beginPath(); ctx.arc(cx, cy - sh * 0.18, sw * 0.32, 0, Math.PI * 2); ctx.fill();
  };
}

/** A multicell: the mouth parted by vanes into a grid of little horns, each dark at its heart. */
function multicell(pal, cols = 5, rows = 2) {
  return (ctx, o) => {
    const m = bezel(ctx, o, pal);
    const { u } = o;
    ctx.fillStyle = pal.throat; ctx.fillRect(m.x, m.y, m.w, m.h);
    const vane = Math.max(0.8 * u, m.w * 0.018);
    const cw = (m.w - vane * (cols - 1)) / cols, ch = (m.h - vane * (rows - 1)) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = m.x + c * (cw + vane), y = m.y + r * (ch + vane);
        const g = ctx.createRadialGradient(x + cw / 2, y + ch / 2, 0, x + cw / 2, y + ch / 2, Math.max(cw, ch) * 0.62);
        g.addColorStop(0, pal.throat); g.addColorStop(1, pal.edge);
        ctx.fillStyle = g; ctx.fillRect(x, y, cw, ch);
      }
    }
    // the vanes catch a little light along their top edges
    ctx.fillStyle = pal.inset;
    for (let c = 1; c < cols; c++) ctx.fillRect(m.x + c * (cw + vane) - vane, m.y, vane, m.h);
    for (let r = 1; r < rows; r++) ctx.fillRect(m.x, m.y + r * (ch + vane) - vane, m.w, vane);
    ctx.fillStyle = pal.glint; ctx.globalAlpha = 0.5;
    for (let r = 1; r < rows; r++) ctx.fillRect(m.x, m.y + r * (ch + vane) - vane, m.w, Math.min(vane, 0.5 * u));
    ctx.globalAlpha = 1;
  };
}

/** An acoustic lens: the recess behind a stack of slightly bowed louvres. */
function acousticLens(pal, slats = 4) {
  return (ctx, o) => {
    const m = bezel(ctx, o, pal);
    const { u } = o;
    ctx.fillStyle = chute(ctx, m, pal); ctx.fillRect(m.x, m.y, m.w, m.h);
    const pitch = m.h / slats, t = pitch * 0.48, bow = m.h * 0.08;
    for (let i = 0; i < slats; i++) {
      const y = m.y + pitch * (i + 0.5) - t / 2;
      ctx.fillStyle = pal.bezel;
      ctx.beginPath();
      ctx.moveTo(m.x, y); ctx.quadraticCurveTo(m.x + m.w / 2, y + bow, m.x + m.w, y);
      ctx.lineTo(m.x + m.w, y + t); ctx.quadraticCurveTo(m.x + m.w / 2, y + t + bow, m.x, y + t);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = pal.glint; ctx.globalAlpha = 0.55; ctx.lineWidth = 0.5 * u;
      ctx.beginPath(); ctx.moveTo(m.x, y); ctx.quadraticCurveTo(m.x + m.w / 2, y + bow, m.x + m.w, y); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  };
}

function mix(a, b, k) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(',')})`;
}

export const HORN_CANDIDATES = Object.freeze([
  { letter: 'A', name: 'THE SPEC', paint: flaredHorn(SPEC),
    description: 'Peter’s spec to the letter: a rectangular horn as wide as the two woofers and 58% of one high, #1C1D22 bezel with a 1px #2C2D35 inset, the recess falling from #16171B to #0A0A0C at the throat, a #282930 bullet with a #454752 dot.' },
  { letter: 'B', name: 'THE SPEC, IN PURPLE', paint: flaredHorn(PURPLE),
    description: 'The same horn, drawn in the cabinet’s own purples rather than neutral greys, so it sits in the box rather than on it.' },
  { letter: 'C', name: 'WAVEGUIDE', paint: waveguide(PURPLE),
    description: 'A modern line-array waveguide: a rounded mouth curving in through contours to a round throat and its dome.' },
  { letter: 'D', name: 'BI-RADIAL', paint: biradial(PURPLE),
    description: 'The big touring horn of the 80s: the mouth pinched at the waist, walls flaring off a tall diffraction slot.' },
  { letter: 'E', name: 'MULTICELL', paint: multicell(PURPLE),
    description: 'A vintage multicell: the mouth parted by vanes into ten little horns, a grid where the woofers are rounds.' },
  { letter: 'F', name: 'ACOUSTIC LENS', paint: acousticLens(PURPLE),
    description: 'A horn behind a stack of bowed louvres, the old hi-fi acoustic lens — slats across the slot, no bullet showing.' },
]);
