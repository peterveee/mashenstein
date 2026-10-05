// THE CLUB'S SPEAKER STACKS — one cabinet pair, the sub on the floor and the top box over it.
//
// Out of club.js drawSpeakers (5 Oct 2026) so the gallery can draw the club's own cabinets for
// the horn bake-off (src/dev/speaker-horn-candidates.js): the club decides how hard the cones
// push and where the stack stands; this draws it. `horn` paints the top box's high-frequency
// slot — PA_HORN since 5 Oct 2026; PORT_HORN is the one it replaced.

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/** A woofer, `push` 0–1.5 out of the box on the kick. */
export function drawCone(ctx, cx, cy, r, push, u) {
  ctx.fillStyle = '#07060c';
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.06, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.25, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#3a3450'); g.addColorStop(1, '#141120');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, r * (0.8 + 0.24 * push), 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 0.8 * u;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#24203a';
  ctx.beginPath(); ctx.arc(cx, cy, r * (0.22 + 0.24 * push), 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath(); ctx.arc(cx - r * 0.08, cy - r * 0.1, r * 0.1, 0, Math.PI * 2); ctx.fill();
  // the hit itself: a ring flashing round the cone
  if (push > 0.25) {
    ctx.strokeStyle = `rgba(201,160,255,${0.7 * push})`; ctx.lineWidth = 1.4 * u;
    ctx.beginPath(); ctx.arc(cx, cy, r * (1.02 + 0.08 * push), 0, Math.PI * 2); ctx.stroke();
  }
}

/**
 * Where the top box's two mids sit, and so the slot over them: `mids` the woofers' centres and
 * radius, `slot` the box a horn fills — as wide as the two woofers' outer rims, and 58% of one
 * woofer's diameter high (the horn spec, 5 Oct 2026), centred between the box's top and the
 * woofers' tops.
 */
export function topBoxLayout(x, rig) {
  const cx = x + rig.w / 2, ty = rig.top;
  const r = rig.w * 0.16, my = ty + rig.topH * 0.62;
  const mids = [{ cx: cx - rig.w * 0.2, cy: my, r }, { cx: cx + rig.w * 0.2, cy: my, r }];
  const rim = r * 1.06;
  const w = (rig.w * 0.2 + rim) * 2;
  const gapTop = ty + 2, gapBot = my - rim - 2;
  const h = Math.min(rim * 2 * 0.58, (gapBot - gapTop) * 0.9);
  return { cx, ty, mids, slot: { x: cx - w / 2, y: (gapTop + gapBot) / 2 - h / 2, w, h } };
}

/** The horn it replaced: a dark port in a rounded bezel (club.js until 5 Oct 2026). Drawn off the rig, not the slot. */
export function PORT_HORN(ctx, { cx, ty, rig }) {
  ctx.fillStyle = '#1d1930';
  rr(ctx, cx - rig.w * 0.24, ty + rig.topH * 0.12, rig.w * 0.48, rig.topH * 0.24, rig.topH * 0.1); ctx.fill();
  ctx.fillStyle = '#07060c';
  rr(ctx, cx - rig.w * 0.14, ty + rig.topH * 0.17, rig.w * 0.28, rig.topH * 0.14, rig.topH * 0.06); ctx.fill();
}

// THE HORN (Peter's spec, 5 Oct 2026; B in the bake-off, src/dev/speaker-horn-candidates.js):
// a flared rectangular horn tweeter in the slot, its mouth falling in to a throat with a bullet in
// it, in the cabinet's own purples. The spec's greys (HORN_SPEC) were A. Each horn painter takes
// `{ slot, u, rr }` and draws into `slot`.
export const HORN_SPEC = { bezel: '#1C1D22', inset: '#2C2D35', edge: '#16171B', throat: '#0A0A0C', bullet: '#282930', glint: '#454752' };
export const HORN_PURPLE = { bezel: '#1c1733', inset: '#30285a', edge: '#1a1530', throat: '#07060c', bullet: '#2a2442', glint: '#4c4470' };

/** The bezel every candidate sits in: a solid frame and a 1px inset line just inside its edge. */
export function hornBezel(ctx, { slot, u, rr }, pal, r = slot.h * 0.18) {
  ctx.fillStyle = pal.bezel;
  rr(ctx, slot.x, slot.y, slot.w, slot.h, r); ctx.fill();
  ctx.strokeStyle = pal.inset; ctx.lineWidth = u;
  rr(ctx, slot.x + u / 2, slot.y + u / 2, slot.w - u, slot.h - u, Math.max(0, r - u / 2)); ctx.stroke();
  const b = Math.max(1.4 * u, slot.h * 0.14);
  return { x: slot.x + b, y: slot.y + b, w: slot.w - 2 * b, h: slot.h - 2 * b };
}

/** The recess's fall into the throat: the edge colour at top and bottom, the throat's at the middle. */
export function hornChute(ctx, m, pal) {
  const g = ctx.createLinearGradient(0, m.y, 0, m.y + m.h);
  g.addColorStop(0, pal.edge); g.addColorStop(0.5, pal.throat); g.addColorStop(1, pal.edge);
  return g;
}

/** The phase plug: a small dome with a soft highlight dot up top. */
export function hornBullet(ctx, cx, cy, r, pal) {
  ctx.fillStyle = pal.bullet;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = pal.glint;
  ctx.beginPath(); ctx.arc(cx - r * 0.18, cy - r * 0.42, r * 0.34, 0, Math.PI * 2); ctx.fill();
}

const quad = (ctx, pts) => { ctx.beginPath(); ctx.moveTo(...pts[0]); for (const p of pts.slice(1)) ctx.lineTo(...p); ctx.closePath(); };

/** The spec's horn: a rectangular mouth flaring in to a throat, four walls, a bullet in the middle. */
export function flaredHorn(pal) {
  return (ctx, o) => {
    const m = hornBezel(ctx, o, pal);
    const { u } = o;
    ctx.fillStyle = hornChute(ctx, m, pal);
    ctx.fillRect(m.x, m.y, m.w, m.h);
    const tw = m.w * 0.42, th = m.h * 0.46, cx = m.x + m.w / 2, cy = m.y + m.h / 2;
    const t = { x: cx - tw / 2, y: cy - th / 2, w: tw, h: th };
    const TL = [m.x, m.y], TR = [m.x + m.w, m.y], BR = [m.x + m.w, m.y + m.h], BL = [m.x, m.y + m.h];
    const tTL = [t.x, t.y], tTR = [t.x + t.w, t.y], tBR = [t.x + t.w, t.y + t.h], tBL = [t.x, t.y + t.h];
    // the walls: the top catches a little of the room, the sides fall away darker
    ctx.fillStyle = 'rgba(255,255,255,0.025)'; quad(ctx, [TL, TR, tTR, tTL]); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; quad(ctx, [TL, tTL, tBL, BL]); ctx.fill(); quad(ctx, [TR, BR, tBR, tTR]); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; quad(ctx, [BL, tBL, tBR, BR]); ctx.fill();
    ctx.strokeStyle = pal.inset; ctx.globalAlpha = 0.7; ctx.lineWidth = 0.6 * u;
    ctx.beginPath();
    for (const [a, b] of [[TL, tTL], [TR, tTR], [BR, tBR], [BL, tBL]]) { ctx.moveTo(...a); ctx.lineTo(...b); }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = pal.throat;
    ctx.fillRect(t.x, t.y, t.w, t.h);
    hornBullet(ctx, cx, cy, th * 0.42, pal);
  };
}

/** The club's horn: the spec's, in purple. */
export const PA_HORN = flaredHorn(HORN_PURPLE);

/**
 * One stack at `x`: the sub, the top box, its two mids and its horn, the BOOST glow round both
 * boxes and the power light. `thump` is how far the cones are out (club.js drawSpeakers).
 */
export function drawSpeakerStack(ctx, x, rig, u, thump, { boost = false, horn = PA_HORN } = {}) {
  const cx = x + rig.w / 2;
  // the sub, on the floor: one big woofer
  const sy = rig.floor - rig.subH;
  ctx.fillStyle = '#1a1530';
  rr(ctx, x, sy, rig.w, rig.subH, 2 * u); ctx.fill();
  ctx.strokeStyle = 'rgba(201,160,255,0.22)'; ctx.lineWidth = u; ctx.stroke();
  drawCone(ctx, cx, sy + rig.subH * 0.5, Math.min(rig.w * 0.42, rig.subH * 0.4), thump, u);
  // the top cabinet: two mids and a horn
  const ty = rig.top;
  ctx.fillStyle = '#1c1733';
  rr(ctx, x + rig.w * 0.04, ty, rig.w * 0.92, rig.topH - 2 * u, 2 * u); ctx.fill();
  ctx.strokeStyle = 'rgba(201,160,255,0.22)'; ctx.lineWidth = 0.8 * u; ctx.stroke();
  const lay = topBoxLayout(x, rig);
  for (const m of lay.mids) drawCone(ctx, m.cx, m.cy, m.r, thump * 0.7, u);
  ctx.save();
  horn(ctx, { ...lay, rig, u, rr });
  ctx.restore();
  // held for the bass, the cabinets glow with it
  if (boost) {
    ctx.strokeStyle = `rgba(201,160,255,${Math.min(1, 0.45 + 0.5 * thump)})`; ctx.lineWidth = 1.8 * u;
    rr(ctx, x, sy, rig.w, rig.subH, 2 * u); ctx.stroke();
    rr(ctx, x + rig.w * 0.04, ty, rig.w * 0.92, rig.topH - 2 * u, 2 * u); ctx.stroke();
  }
  // a little power light
  ctx.fillStyle = `rgba(124,255,107,${0.5 + 0.5 * thump})`;
  ctx.beginPath(); ctx.arc(x + rig.w * 0.86, sy + rig.subH * 0.9, 1.2 * u, 0, Math.PI * 2); ctx.fill();
}
