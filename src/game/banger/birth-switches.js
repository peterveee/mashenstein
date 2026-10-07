// IT'S ALIVE! — WHAT GARY THROWS. 7 Oct 2026.
//
// Peter: "give me a bake off for the switch scene with gary when creating new bangers... i
// particularly don't love the switch". Until then Gary hauled a small knife switch down on a
// dark panel beside him (birth.js drawGary, still drawn when no `lever` is given — the
// gallery's X). These six came out of the bake-off, and Peter kept them all: "i like them
// all, so make the choice random but keep the bake off in case I want to tweak or remove
// one". So every new banger's birth draws one at random (pickBirthSwitch, menus.js), and the
// gallery's `birth-switch-bakeoff` section shows each of them. Taking one out of the game is
// taking it out of BIRTH_SWITCHES.
//
//   A BIG KNIFE SWITCH  the same idea made to read: a slate board on legs, a fat copper blade
//                       with a red knob, lamps that go red to green, the jaws crackling
//   B FLOOR LEVER       a signal-box lever out of a toothed quadrant on the floor; he hauls it
//                       back towards himself and it clunks into the last notch
//   C BIG RED BUTTON    a hazard-striped pedestal; he flips the cover, winds up and slams it
//   D PLUNGER           a tall, thin charger post between his feet, both hands on the
//                       T-bar, pushed home
//   E AMP KNOB          a combo amp with one giant chicken-head knob; he cranks it round to 11
//   F MASTER FADER      a giant channel strip; he shoves the fader to the top and the meter
//                       beside it fills with the charge
//
// A switch is { letter, name, description, caption, rig(o), back(ctx, o, rig), front?(…) }:
// o = { t, h (Gary's height), gx, base (his feet), coilX (the left coil), portrait, random,
// since (seconds since the switch landed) }. rig returns where his hands go, in screen space,
// each { at: [x, y], w } blended from where it hangs by w; first hand reaches to the screen's
// left. Hands in front of his body vanish behind it (the stand draws its arms behind the
// torso), so every grip sits clear of his chest. Everything lands on SWITCH_AT, when the
// scene plays its 'power' and the coils wake.

import { GARY_BEATS, drawBolt } from './birth.js';

const { REACH_AT, BRACE_AT, PULL_AT, SWITCH_AT, LET_GO_AT, LET_GO_S, FLASH_AT } = GARY_BEATS;
const TAU = Math.PI * 2;
const INK = '#1b1828';
const IRON = '#2c2838', IRON_HI = '#4a4466', RIVET = '#5d5774';
const COPPER = '#d08d48', COPPER_HI = '#f0b878', COPPER_DK = '#8a5a2a';
const STEEL = '#c8c8d8', STEEL_DK = '#7c7c92';
const RED = '#e8413c', RED_HI = '#ff8a7a', RED_DK = '#8e1f22';
const ALIVE = '#7cff6b', ARC = '#a8e6ff', AMBER = '#ffb02e', HAZARD = '#ffd23f';

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (v) => { const n = clamp01(v); return n * n * (3 - 2 * n); };
const lerp = (a, b, k) => a + (b - a) * k;
const rr = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
};
/** Gary's hold on it: reaching in, holding, letting go. */
const grip = (t) => (t < REACH_AT ? 0 : t < BRACE_AT ? smooth((t - REACH_AT) / (BRACE_AT - REACH_AT))
  : t < LET_GO_AT ? 1 : 1 - smooth((t - LET_GO_AT) / LET_GO_S));
/** How far it has gone: nothing until `from`, then heavy — gathering speed — home on SWITCH_AT. */
const haul = (t, from = PULL_AT) => (t >= SWITCH_AT ? 1 : t < from ? 0 : ((t - from) / (SWITCH_AT - from)) ** 2);
/** The charge the coils build, 0 at the switch to 1 at the flash. */
const charge = (t) => clamp01((t - SWITCH_AT) / (FLASH_AT - SWITCH_AT));
/** Screen point from Gary-space: x across from his feet, y up from the floor (negative), in his heights. */
const at = (o, x, y) => [o.gx + x * o.h, o.base + y * o.h];

/** A lamp: dark glass when off, a glowing bead when on. */
function lamp(ctx, x, y, r, colour, on) {
  if (on > 0) {
    ctx.save(); ctx.globalAlpha = on;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
    g.addColorStop(0, colour + '99'); g.addColorStop(1, colour + '00');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, TAU); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x, y, r * 1.3, 0, TAU); ctx.fill();
  ctx.fillStyle = on > 0.5 ? colour : '#3a3548'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  if (on > 0.5) { ctx.fillStyle = '#ffffffcc'; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, TAU); ctx.fill(); }
}
/** The shower off a contact as it closes: `since` seconds after SWITCH_AT. */
function sparks(ctx, random, x, y, since, h, n = 12) {
  if (since < 0 || since >= 0.5) return;
  ctx.save();
  ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = h * 0.014; ctx.lineCap = 'round';
  ctx.globalAlpha = 1 - since / 0.5;
  for (let i = 0; i < n; i++) {
    const a = random() * TAU, r0 = h * 0.03, r1 = h * (0.08 + random() * 0.16) * (0.4 + since * 2);
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.stroke();
  }
  const f = ctx.createRadialGradient(x, y, 0, x, y, h * 0.16);
  f.addColorStop(0, 'rgba(255,240,180,0.9)'); f.addColorStop(1, 'rgba(255,240,180,0)');
  ctx.fillStyle = f; ctx.beginPath(); ctx.arc(x, y, h * 0.16, 0, TAU); ctx.fill();
  ctx.restore();
}
/** Little arcs crackling at a live contact while the charge builds. */
function crackle(ctx, o, x, y, r) {
  if (o.t < SWITCH_AT || o.t >= FLASH_AT) return;
  const c = charge(o.t);
  for (let i = 0; i < 2; i++) {
    if (o.random() > 0.35 + c * 0.4) continue;
    const a = o.random() * TAU;
    drawBolt(ctx, o.random, x, y, x + Math.cos(a) * r, y + Math.sin(a) * r, { spread: r * 0.5, width: o.h * 0.008, colour: ARC });
  }
}
/** A cable from a point on the switch back to the coil's foot. */
function cable(ctx, o, x, y) {
  ctx.strokeStyle = '#3a3448'; ctx.lineWidth = o.h * 0.025;
  ctx.beginPath(); ctx.moveTo(x, y);
  ctx.quadraticCurveTo(lerp(x, o.coilX, 0.5), o.base + o.h * 0.03, o.coilX + o.h * 0.12, o.base - o.h * 0.04); ctx.stroke();
}
function rivets(ctx, x, y, w, h, r, inset) {
  ctx.fillStyle = RIVET;
  for (const [sx, sy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    ctx.beginPath(); ctx.arc(x + inset + sx * (w - inset * 2), y + inset + sy * (h - inset * 2), r, 0, TAU); ctx.fill();
  }
}
/** A stick between two points, round-ended, with a highlight down one side. */
function bar(ctx, x0, y0, x1, y1, w, fill, hi) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = fill; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  if (hi) {
    const n = Math.hypot(x1 - x0, y1 - y0) || 1, ox = (y0 - y1) / n * w * 0.22, oy = (x1 - x0) / n * w * 0.22;
    ctx.strokeStyle = hi; ctx.lineWidth = w * 0.28;
    ctx.beginPath(); ctx.moveTo(x0 + ox, y0 + oy); ctx.lineTo(x1 + ox, y1 + oy); ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

// ------------------------------------------------------------------ A: the big knife switch
const KNIFE = { hinge: [-0.55, -0.6], L: 0.3, up: -0.65, down: 0.9 };
const knifeAngle = (t) => lerp(KNIFE.up, KNIFE.down, haul(t));
const knifeTip = (o, a) => {
  const [hx, hy] = at(o, ...KNIFE.hinge);
  return [hx + Math.cos(a) * KNIFE.L * o.h, hy + Math.sin(a) * KNIFE.L * o.h];
};
const bigKnife = {
  letter: 'A', name: 'BIG KNIFE SWITCH',
  description: 'Today’s idea made to read: a slate board on legs, a fat copper blade with a red knob, a lamp that goes red to green, and the jaws crackling while it charges.',
  rig: (o) => ({ hands: [{ at: knifeTip(o, knifeAngle(o.t)), w: grip(o.t) }], lean: o.t >= PULL_AT && o.t < LET_GO_AT ? 0.06 : 0 }),
  back(ctx, o) {
    const { h, t } = o;
    const [bx, by] = at(o, -0.62, -0.98), bw = 0.36 * h, bh = 0.68 * h;
    cable(ctx, o, bx + bw * 0.3, by + bh);
    // legs
    ctx.fillStyle = '#1b1828';
    for (const lx of [0.15, 0.85]) ctx.fillRect(bx + bw * lx - h * 0.02, by + bh, h * 0.04, o.base - by - bh);
    ctx.fillRect(bx + bw * 0.05, o.base - h * 0.02, bw * 0.9, h * 0.02);
    // the board
    ctx.fillStyle = IRON; rr(ctx, bx, by, bw, bh, h * 0.03); ctx.fill();
    ctx.strokeStyle = IRON_HI; ctx.lineWidth = h * 0.018; rr(ctx, bx, by, bw, bh, h * 0.03); ctx.stroke();
    rivets(ctx, bx, by, bw, bh, h * 0.014, h * 0.035);
    // the lamps: red while it is dead, green once it's thrown
    const live = t >= SWITCH_AT;
    const pulse = live ? 0.75 + 0.25 * Math.sin(t * 18) : 1;
    lamp(ctx, bx + bw * 0.35, by + h * 0.08, h * 0.03, RED, live ? 0 : 1);
    lamp(ctx, bx + bw * 0.65, by + h * 0.08, h * 0.03, ALIVE, live ? pulse : 0);
    // the jaws the blade drops into
    const a = knifeAngle(t), [hx, hy] = at(o, ...KNIFE.hinge);
    const ja = KNIFE.down, jr = KNIFE.L * h * 0.62, jx = hx + Math.cos(ja) * jr, jy = hy + Math.sin(ja) * jr;
    const nx = -Math.sin(ja), ny = Math.cos(ja);
    ctx.fillStyle = COPPER_DK; ctx.beginPath(); ctx.arc(jx, jy, h * 0.05, 0, TAU); ctx.fill();
    // the blade, its handle, and the knob
    const tip = knifeTip(o, a), cx = hx + Math.cos(a) * KNIFE.L * h * 0.74, cy = hy + Math.sin(a) * KNIFE.L * h * 0.74;
    bar(ctx, hx, hy, cx, cy, h * 0.055, COPPER, COPPER_HI);
    bar(ctx, cx, cy, tip[0], tip[1], h * 0.045, '#2a2235');
    for (const s of [-1, 1]) {
      ctx.fillStyle = COPPER;
      ctx.save(); ctx.translate(jx + nx * s * h * 0.042, jy + ny * s * h * 0.042); ctx.rotate(ja);
      ctx.fillRect(-h * 0.05, -h * 0.014, h * 0.1, h * 0.028); ctx.restore();
    }
    ctx.fillStyle = STEEL_DK; ctx.beginPath(); ctx.arc(hx, hy, h * 0.045, 0, TAU); ctx.fill();
    ctx.fillStyle = STEEL; ctx.beginPath(); ctx.arc(hx, hy, h * 0.025, 0, TAU); ctx.fill();
    ctx.fillStyle = RED_DK; ctx.beginPath(); ctx.arc(tip[0], tip[1], h * 0.068, 0, TAU); ctx.fill();
    ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(tip[0] - h * 0.008, tip[1] - h * 0.008, h * 0.056, 0, TAU); ctx.fill();
    ctx.fillStyle = RED_HI; ctx.beginPath(); ctx.arc(tip[0] - h * 0.025, tip[1] - h * 0.025, h * 0.018, 0, TAU); ctx.fill();
    sparks(ctx, o.random, jx, jy, o.since, h);
    crackle(ctx, o, jx, jy, h * 0.1);
  },
};

// ------------------------------------------------------------------ B: the floor lever
const LEVER = { pivot: [-0.3, -0.07], L: 0.64, off: -0.3, on: 0.1 };
const leverAngle = (t) => lerp(LEVER.off, LEVER.on, haul(t));
const leverTop = (o, a, k = 1) => {
  const [px, py] = at(o, ...LEVER.pivot);
  return [px + Math.sin(a) * LEVER.L * o.h * k, py - Math.cos(a) * LEVER.L * o.h * k];
};
const floorLever = {
  letter: 'B', name: 'FLOOR LEVER',
  description: 'A signal-box lever out of a toothed quadrant on the floor. He leans out for it and hauls it back towards himself, and it clunks into the last notch; the lamp on the frame goes green.',
  rig: (o) => {
    const t = o.t;
    // out to it, then back with it
    const lean = t < BRACE_AT ? -0.07 * smooth((t - REACH_AT) / (BRACE_AT - REACH_AT)) : t < SWITCH_AT ? lerp(-0.07, 0.08, haul(t, BRACE_AT)) : t < LET_GO_AT ? 0.08 : 0.08 * (1 - smooth((t - LET_GO_AT) / LET_GO_S));
    return { hands: [{ at: leverTop(o, leverAngle(t), 0.9), w: grip(t) }], lean };
  },
  back(ctx, o) {
    const { h, t } = o;
    const [px, py] = at(o, ...LEVER.pivot);
    cable(ctx, o, px - h * 0.12, o.base - h * 0.03);
    // the quadrant: a cheek plate rising out of the frame, a steel rim with a notch at each end
    const qr = 0.32 * h, a0 = -Math.PI / 2 + LEVER.off - 0.14, a1 = -Math.PI / 2 + LEVER.on + 0.14;
    ctx.fillStyle = '#383349';
    ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, qr + h * 0.02, a0, a1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = STEEL_DK; ctx.lineWidth = h * 0.035;
    ctx.beginPath(); ctx.arc(px, py, qr, a0, a1); ctx.stroke();
    ctx.fillStyle = INK;
    for (const a of [LEVER.off, LEVER.on]) {
      ctx.save(); ctx.translate(px + Math.sin(a) * qr, py - Math.cos(a) * qr); ctx.rotate(a);
      ctx.fillRect(-h * 0.012, -h * 0.02, h * 0.024, h * 0.03); ctx.restore();
    }
    // the frame it all stands in, with a lamp on its face
    const fx0 = px - h * 0.2, fw = h * 0.36, fy = o.base - h * 0.16;
    ctx.fillStyle = IRON; rr(ctx, fx0, fy, fw, o.base - fy, h * 0.02); ctx.fill();
    ctx.fillStyle = IRON_HI; ctx.fillRect(fx0, fy, fw, h * 0.022);
    rivets(ctx, fx0, fy, fw, o.base - fy, h * 0.012, h * 0.03);
    const live = t >= SWITCH_AT;
    lamp(ctx, px - h * 0.1, fy + h * 0.085, h * 0.032, live ? ALIVE : RED, 1);
    // the lever: steel, a red grip, a chrome knob
    const a = leverAngle(t);
    const top = leverTop(o, a), g0 = leverTop(o, a, 0.78);
    bar(ctx, px, py, g0[0], g0[1], h * 0.045, STEEL_DK, STEEL);
    bar(ctx, g0[0], g0[1], top[0], top[1], h * 0.062, RED, RED_HI);
    ctx.fillStyle = STEEL; ctx.beginPath(); ctx.arc(top[0], top[1], h * 0.035, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(px + Math.sin(a) * qr, py - Math.cos(a) * qr); ctx.rotate(a);
    ctx.fillStyle = STEEL; ctx.fillRect(-h * 0.03, -h * 0.022, h * 0.06, h * 0.044);
    ctx.fillStyle = STEEL_DK; ctx.fillRect(-h * 0.03, h * 0.008, h * 0.06, h * 0.014); ctx.restore();
    ctx.fillStyle = STEEL_DK; ctx.beginPath(); ctx.arc(px, py, h * 0.04, 0, TAU); ctx.fill();
    // the clunk into the notch: a jolt of sparks where the latch drops
    const nx = px + Math.sin(LEVER.on) * qr, ny = py - Math.cos(LEVER.on) * qr;
    sparks(ctx, o.random, nx, ny, o.since, h, 8);
    crackle(ctx, o, px - h * 0.12, o.base - h * 0.04, h * 0.08);
  },
};

// ------------------------------------------------------------------ C: the big red button
const BTN = { x: -0.37, top: -0.5, w: 0.22 };
const FLIP_AT = 0.3, WIND_AT = 0.42;
/** The cover's angle about its far hinge: shut (0), flicked up past upright, settling open. */
const coverAngle = (t) => {
  if (t < FLIP_AT) return 0;
  const f = t - FLIP_AT;
  if (f < 0.14) return -smooth(f / 0.14) * 1.95;
  return -1.95 + 0.12 * Math.exp(-(f - 0.14) * 9) * Math.sin((f - 0.14) * 40);   // bangs open and rattles
};
const bigButton = {
  letter: 'C', name: 'BIG RED BUTTON', caption: 'PRESSING THE BUTTON',
  description: 'A hazard-striped pedestal with a red mushroom button under a flip cover. He flicks the cover open, winds his fist up and slams it.',
  rig: (o) => {
    const t = o.t, h = o.h;
    const edge = at(o, BTN.x + BTN.w / 2 + 0.01, BTN.top - 0.08), up = at(o, -0.28, -0.8), down = at(o, BTN.x, BTN.top - 0.06);
    let p;
    if (t < FLIP_AT) p = edge;
    else if (t < WIND_AT) p = [lerp(edge[0], edge[0] - h * 0.03, smooth((t - FLIP_AT) / 0.12)), lerp(edge[1], edge[1] - h * 0.1, smooth((t - FLIP_AT) / 0.12))];
    else if (t < PULL_AT + 0.1) { const k = smooth((t - WIND_AT) / (PULL_AT + 0.1 - WIND_AT)); p = [lerp(edge[0] - h * 0.03, up[0], k), lerp(edge[1] - h * 0.1, up[1], k)]; }
    else if (t < SWITCH_AT) { const k = ((t - PULL_AT - 0.1) / (SWITCH_AT - PULL_AT - 0.1)) ** 2; p = [lerp(up[0], down[0], k), lerp(up[1], down[1], k)]; }
    else p = down;
    return { hands: [{ at: p, w: grip(t) }], lean: t >= SWITCH_AT - 0.06 && t < LET_GO_AT ? 0.05 : 0, squash: t >= SWITCH_AT && t < SWITCH_AT + 0.12 ? 0.08 : 0 };
  },
  back(ctx, o) {
    const { h, t } = o;
    const [cx, top] = at(o, BTN.x, BTN.top), w = BTN.w * h;
    cable(ctx, o, cx - h * 0.04, o.base - h * 0.03);
    // the column and its foot
    ctx.fillStyle = IRON; ctx.fillRect(cx - h * 0.05, top + h * 0.1, h * 0.1, o.base - top - h * 0.1);
    ctx.fillStyle = IRON_HI; ctx.fillRect(cx - w * 0.6, o.base - h * 0.035, w * 1.2, h * 0.035);
    // the housing, hazard-striped
    const hy = top, hh = h * 0.11;
    ctx.save(); rr(ctx, cx - w / 2, hy, w, hh, h * 0.015); ctx.clip();
    ctx.fillStyle = HAZARD; ctx.fillRect(cx - w / 2, hy, w, hh);
    ctx.fillStyle = INK;
    for (let s = -w; s < w * 1.2; s += h * 0.06) {
      ctx.beginPath(); ctx.moveTo(cx - w / 2 + s, hy + hh); ctx.lineTo(cx - w / 2 + s + h * 0.03, hy + hh); ctx.lineTo(cx - w / 2 + s + h * 0.03 + hh, hy); ctx.lineTo(cx - w / 2 + s + hh, hy); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = h * 0.012; rr(ctx, cx - w / 2, hy, w, hh, h * 0.015); ctx.stroke();
    // the button: proud until the slam, squashed flat after
    const press = t >= SWITCH_AT ? 1 : 0;
    const bh = h * (0.065 - 0.04 * press), bw = w * 0.36;
    ctx.fillStyle = '#3a3548'; ctx.fillRect(cx - bw * 1.15, hy - h * 0.015, bw * 2.3, h * 0.02);
    ctx.fillStyle = RED_DK; ctx.beginPath(); ctx.ellipse(cx, hy - h * 0.012, bw, bh, 0, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = RED; ctx.beginPath(); ctx.ellipse(cx - bw * 0.06, hy - h * 0.016, bw * 0.88, bh * 0.86, 0, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = RED_HI; ctx.beginPath(); ctx.ellipse(cx - bw * 0.35, hy - h * 0.012 - bh * 0.55, bw * 0.22, bh * 0.18, -0.3, 0, TAU); ctx.fill();
    // the lamp ring round it: green once it's pressed
    if (press) {
      const g = ctx.createRadialGradient(cx, hy, 0, cx, hy, w);
      g.addColorStop(0, ALIVE + '66'); g.addColorStop(1, ALIVE + '00');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, hy, w, 0, TAU); ctx.fill();
    }
    // the cover, hinged at the far edge, clear with a frame
    const ca = coverAngle(t), hx = cx - w / 2, cw = w, ch = h * 0.085;
    ctx.save(); ctx.translate(hx, hy - h * 0.005); ctx.rotate(ca);
    ctx.fillStyle = 'rgba(168,230,255,0.22)'; ctx.fillRect(0, -ch, cw, ch);
    ctx.strokeStyle = '#d8ecff'; ctx.lineWidth = h * 0.014; ctx.strokeRect(0, -ch, cw, ch);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(cw * 0.12, -ch * 0.82, cw * 0.18, ch * 0.5);
    ctx.restore();
    ctx.fillStyle = STEEL_DK; ctx.beginPath(); ctx.arc(hx, hy - h * 0.005, h * 0.018, 0, TAU); ctx.fill();
    // the slam: a shock ring and sparks
    if (o.since >= 0 && o.since < 0.4) {
      const f = o.since / 0.4;
      ctx.save(); ctx.globalAlpha = 1 - f; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = h * 0.02 * (1 - f);
      ctx.beginPath(); ctx.ellipse(cx, hy, w * (0.5 + f * 1.2), w * (0.18 + f * 0.4), 0, 0, TAU); ctx.stroke(); ctx.restore();
    }
    sparks(ctx, o.random, cx, hy - h * 0.02, o.since, h, 8);
    crackle(ctx, o, cx - h * 0.04, o.base - h * 0.04, h * 0.08);
  },
};

// ------------------------------------------------------------------ D: the plunger
// A TALL, THIN POST, so his legs show (Peter, 7 Oct 2026: the charger box "covering his entire
// lower body", then "can the plunger be tall and thin so you can still see his legs? or off to
// his side maybe?"). Two takes while he picks: IN FRONT, the post stands between his feet and
// both hands drive the T-bar home; AT HIS SIDE, it stands out on his right (the screen's left)
// and one hand drives a short handle home.
const POST = { w: 0.09, foot: 0.02 };
const PLUNGE = { front: { x: 0, rest: -0.5, home: -0.32, top: -0.27, half: 0.28 },
  side: { x: -0.38, rest: -0.66, home: -0.46, top: -0.4, half: 0.07 } };
const plungeY = (t, p) => {
  // he hauls it UP a touch on the brace, then drives it home
  const lift = t >= BRACE_AT && t < PULL_AT ? smooth((t - BRACE_AT) / (PULL_AT - BRACE_AT)) * 0.04 : t >= PULL_AT && t < SWITCH_AT ? 0.04 : 0;
  return lerp(p.rest - lift, p.home, haul(t));
};
/** The post: a planked charger standing on the floor, its rod out of the cap to the handle. */
function plungerPost(ctx, o, p) {
  const { h, t } = o;
  const [cx, top] = at(o, p.x, p.top), y = at(o, p.x, plungeY(t, p))[1];
  const w = POST.w * h, x0 = cx - w / 2, foot = o.base + POST.foot * h, ph = foot - top;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.ellipse(cx, foot, w * 1.2, h * 0.022, 0, 0, TAU); ctx.fill();
  // the rod, and the handle across his hands
  bar(ctx, cx, top, cx, y, h * 0.03, STEEL_DK, STEEL);
  bar(ctx, cx - p.half * h, y, cx + p.half * h, y, h * 0.045, '#3a2a22', '#6a4a36');
  // the post: planked wood, a cap, a lamp and a stencilled bolt
  ctx.fillStyle = '#7a4a2a'; rr(ctx, x0, top, w, ph, h * 0.015); ctx.fill();
  ctx.strokeStyle = '#5a3420'; ctx.lineWidth = h * 0.008;
  for (const k of [0.66, 0.86]) { ctx.beginPath(); ctx.moveTo(x0, top + ph * k); ctx.lineTo(x0 + w, top + ph * k); ctx.stroke(); }
  ctx.strokeStyle = INK; ctx.lineWidth = h * 0.012; rr(ctx, x0, top, w, ph, h * 0.015); ctx.stroke();
  ctx.fillStyle = '#9a6238'; ctx.fillRect(x0 - h * 0.018, top - h * 0.02, w + h * 0.036, h * 0.04);
  ctx.strokeStyle = INK; ctx.lineWidth = h * 0.01; ctx.strokeRect(x0 - h * 0.018, top - h * 0.02, w + h * 0.036, h * 0.04);
  lamp(ctx, cx, top + ph * 0.17, h * 0.022, t >= SWITCH_AT ? ALIVE : RED, 1);
  ctx.fillStyle = HAZARD;
  const sy = top + ph * 0.42, s = h * 0.05;
  ctx.beginPath(); ctx.moveTo(cx + s * 0.25, sy - s); ctx.lineTo(cx - s * 0.45, sy + s * 0.1); ctx.lineTo(cx, sy + s * 0.1);
  ctx.lineTo(cx - s * 0.25, sy + s); ctx.lineTo(cx + s * 0.45, sy - s * 0.1); ctx.lineTo(cx, sy - s * 0.1); ctx.closePath(); ctx.fill();
  // terminals on the cap's ends
  const ends = [x0 - h * 0.012, x0 + w + h * 0.012];
  for (const tx of ends) { ctx.fillStyle = COPPER; ctx.fillRect(tx - h * 0.014, top - h * 0.045, h * 0.028, h * 0.028); }
  sparks(ctx, o.random, cx, top - h * 0.02, o.since, h, 10);
  for (const tx of ends) crackle(ctx, o, tx, top - h * 0.04, h * 0.07);
}
const plunger = {
  letter: 'D', name: 'PLUNGER', caption: 'PUSHING THE PLUNGER',
  description: 'A tall, thin charger post standing between his feet, both hands on the T-bar: he hoists it a touch, then drives it home. The post’s lamp goes green and the terminals crackle.',
  rig: (o) => {
    const p = PLUNGE.front, y = plungeY(o.t, p), w = grip(o.t);
    return {
      hands: [{ at: at(o, -p.half + 0.04, y), w }, { at: at(o, p.half - 0.04, y), w }],
      squash: o.t >= SWITCH_AT && o.t < LET_GO_AT ? 0.06 : 0,
    };
  },
  back(ctx, o) { cable(ctx, o, o.gx, o.base); },
  front(ctx, o) { plungerPost(ctx, o, PLUNGE.front); },
};
/** The other take on D, at his side: not in BIRTH_SWITCHES until Peter picks it. */
export const PLUNGER_AT_SIDE = {
  letter: 'D', name: 'PLUNGER AT HIS SIDE', caption: 'PUSHING THE PLUNGER',
  description: 'The same tall, thin charger post standing out at his side, between him and the coil: one hand on a short handle, hoisted a touch and driven home.',
  rig: (o) => {
    const p = PLUNGE.side, y = plungeY(o.t, p), w = grip(o.t);
    return {
      hands: [{ at: at(o, p.x, y - 0.015), w }],
      lean: o.t >= SWITCH_AT - 0.06 && o.t < LET_GO_AT ? 0.04 : 0,
      squash: o.t >= SWITCH_AT && o.t < LET_GO_AT ? 0.06 : 0,
    };
  },
  back(ctx, o) { cable(ctx, o, at(o, PLUNGE.side.x, 0)[0], o.base); plungerPost(ctx, o, PLUNGE.side); },
};

// ------------------------------------------------------------------ E: the amp knob
const AMP = { x0: -0.66, x1: -0.25, top: -0.68, dial: [-0.45, -0.47], R: 0.115 };
const ZERO = Math.PI * 0.75, ELEVEN = Math.PI * 2.25;          // 7:30 round the top to 4:30
const knobAngle = (t) => lerp(ZERO, ELEVEN, t >= SWITCH_AT ? 1 : t < BRACE_AT ? 0 : smooth((t - BRACE_AT) / (SWITCH_AT - BRACE_AT)));
const ampKnob = {
  letter: 'E', name: 'AMP KNOB', caption: 'TURNING IT UP TO 11',
  description: 'A combo amp with one giant chicken-head knob. He takes the pointer and cranks it round the top from 0 to 11; the scale lights up behind it and the grille throbs once it is alive.',
  rig: (o) => {
    const [dx, dy] = at(o, ...AMP.dial), a = knobAngle(o.t), r = AMP.R * o.h * 0.62;
    const lean = o.t >= BRACE_AT && o.t < LET_GO_AT ? -0.05 * Math.min(1, (o.t - BRACE_AT) / 0.1) : 0;
    return { hands: [{ at: [dx + Math.cos(a) * r, dy + Math.sin(a) * r], w: grip(o.t) }], lean };
  },
  back(ctx, o) {
    const { h, t } = o;
    const [x0, top] = at(o, AMP.x0, AMP.top), x1 = at(o, AMP.x1, 0)[0], w = x1 - x0, bh = o.base - top;
    cable(ctx, o, x0 + w * 0.2, o.base - h * 0.02);
    // the carry handle, the cab, the corners
    ctx.strokeStyle = INK; ctx.lineWidth = h * 0.03;
    ctx.beginPath(); ctx.moveTo(x0 + w * 0.3, top); ctx.quadraticCurveTo(x0 + w * 0.5, top - h * 0.07, x0 + w * 0.7, top); ctx.stroke();
    ctx.fillStyle = '#1e1b26'; rr(ctx, x0, top, w, bh, h * 0.025); ctx.fill();
    // the grille, throbbing once it's alive
    const gy = top + bh * 0.5, gh = bh * 0.44;
    const alive = t >= FLASH_AT, thump = alive ? Math.max(0, Math.sin(t * Math.PI * 4)) : 0;
    ctx.fillStyle = '#3a3446'; rr(ctx, x0 + h * 0.03, gy, w - h * 0.06, gh, h * 0.015); ctx.fill();
    ctx.strokeStyle = '#2a2535'; ctx.lineWidth = h * 0.006;
    for (let k = 0; k < 1; k += 0.12) { ctx.beginPath(); ctx.moveTo(x0 + h * 0.03, gy + gh * k); ctx.lineTo(x0 + w - h * 0.03, gy + gh * k); ctx.stroke(); }
    if (alive || t >= SWITCH_AT) {
      const g = ctx.createRadialGradient(x0 + w / 2, gy + gh / 2, 0, x0 + w / 2, gy + gh / 2, w * 0.5);
      const c = alive ? ALIVE : ARC;
      g.addColorStop(0, c + (alive ? (40 + Math.round(thump * 60)).toString(16) : '30')); g.addColorStop(1, c + '00');
      ctx.fillStyle = g; ctx.fillRect(x0 + h * 0.03, gy, w - h * 0.06, gh);
    }
    // the control panel, gold
    const py = top + h * 0.03, ph = bh * 0.5 - h * 0.06;
    ctx.fillStyle = '#c9a44a'; rr(ctx, x0 + h * 0.03, py, w - h * 0.06, ph, h * 0.012); ctx.fill();
    ctx.fillStyle = '#e8c870'; ctx.fillRect(x0 + h * 0.03, py, w - h * 0.06, h * 0.012);
    // the scale round the dial: 0 to 11, lit up to where the pointer is
    const [dx, dy] = at(o, ...AMP.dial), R = AMP.R * h, a = knobAngle(t);
    for (let i = 0; i <= 11; i++) {
      const ta = lerp(ZERO, ELEVEN, i / 11), lit = a >= ta - 0.01;
      ctx.strokeStyle = lit ? (i >= 10 ? RED : '#2a1e10') : '#8a7038';
      ctx.lineWidth = h * (i >= 10 ? 0.02 : 0.013);
      ctx.beginPath(); ctx.moveTo(dx + Math.cos(ta) * R * 1.25, dy + Math.sin(ta) * R * 1.25);
      ctx.lineTo(dx + Math.cos(ta) * R * 1.48, dy + Math.sin(ta) * R * 1.48); ctx.stroke();
    }
    ctx.fillStyle = '#2a1e10'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold ${h * 0.075}px 'Fredoka', 'Trebuchet MS', sans-serif`;
    ctx.fillText('11', dx + Math.cos(ELEVEN) * R * 1.55 + h * 0.03, dy + Math.sin(ELEVEN) * R * 1.55 + h * 0.01);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    // the knob: a black skirt and a chicken-head pointer with a white line
    ctx.fillStyle = '#111018'; ctx.beginPath(); ctx.arc(dx, dy, R, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(dx, dy); ctx.rotate(a);
    ctx.fillStyle = '#26232f';
    ctx.beginPath(); ctx.moveTo(-R * 0.55, -R * 0.42); ctx.lineTo(R * 1.12, -R * 0.16); ctx.lineTo(R * 1.12, R * 0.16); ctx.lineTo(-R * 0.55, R * 0.42); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#f2f2f6'; ctx.lineWidth = h * 0.014; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(R * 0.1, 0); ctx.lineTo(R * 1.02, 0); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.restore();
    // and the lamp: red standby, green once it's up
    lamp(ctx, x0 + w - h * 0.07, py + h * 0.05, h * 0.024, t >= SWITCH_AT ? ALIVE : RED, 1);
    sparks(ctx, o.random, dx + Math.cos(ELEVEN) * R * 1.3, dy + Math.sin(ELEVEN) * R * 1.3, o.since, h, 8);
    crackle(ctx, o, x0 + w * 0.2, o.base - h * 0.03, h * 0.08);
  },
};

// ------------------------------------------------------------------ F: the master fader
const FADER = { x: -0.37, lo: -0.34, hi: -0.76, x0: -0.54, x1: -0.2, top: -0.9 };
const faderY = (t) => lerp(FADER.lo, FADER.hi, haul(t, BRACE_AT));
const masterFader = {
  letter: 'F', name: 'MASTER FADER', caption: 'PUSHING THE FADER UP',
  description: 'A giant channel strip standing on the floor. He shoves the fader from the bottom to the top, and the meter beside it fills with the charge, the top light going green when it’s alive.',
  rig: (o) => ({ hands: [{ at: at(o, FADER.x + 0.02, faderY(o.t)), w: grip(o.t) }], lean: o.t >= BRACE_AT && o.t < LET_GO_AT ? -0.04 : 0 }),
  back(ctx, o) {
    const { h, t } = o;
    const [x0, top] = at(o, FADER.x0, FADER.top), x1 = at(o, FADER.x1, 0)[0], w = x1 - x0;
    cable(ctx, o, x0 + w * 0.3, o.base - h * 0.02);
    // the strip on its plinth
    ctx.fillStyle = '#1b1828'; ctx.fillRect(x0 - h * 0.02, o.base - h * 0.05, w + h * 0.04, h * 0.05);
    ctx.fillStyle = '#2e2a3c'; rr(ctx, x0, top, w, o.base - h * 0.05 - top, h * 0.025); ctx.fill();
    ctx.strokeStyle = IRON_HI; ctx.lineWidth = h * 0.014; rr(ctx, x0, top, w, o.base - h * 0.05 - top, h * 0.025); ctx.stroke();
    // a row of little knobs up top, for the look of a channel
    for (const k of [0.3, 0.7]) {
      ctx.fillStyle = '#16131f'; ctx.beginPath(); ctx.arc(x0 + w * k, top + h * 0.06, h * 0.03, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#d8d8e4'; ctx.lineWidth = h * 0.008; ctx.beginPath(); ctx.moveTo(x0 + w * k, top + h * 0.06); ctx.lineTo(x0 + w * k, top + h * 0.035); ctx.stroke();
    }
    // the slot and its scale
    const [fx, lo] = at(o, FADER.x, FADER.lo), hi = at(o, 0, FADER.hi)[1];
    ctx.fillStyle = '#0c0a12'; rr(ctx, fx - h * 0.012, hi - h * 0.02, h * 0.024, lo - hi + h * 0.04, h * 0.012); ctx.fill();
    ctx.strokeStyle = '#6a6680'; ctx.lineWidth = h * 0.006;
    for (let k = 0; k <= 1.001; k += 0.125) { const y = lerp(lo, hi, k); ctx.beginPath(); ctx.moveTo(fx + h * 0.03, y); ctx.lineTo(fx + h * 0.05, y); ctx.stroke(); }
    // the meter beside it: fills with the charge, the top light green once it's alive
    const c = charge(t), alive = t >= FLASH_AT, n = 10, mx = at(o, FADER.x0 + 0.06, 0)[0];
    for (let i = 0; i < n; i++) {
      const y = lerp(lo, hi, i / (n - 1)), on = alive ? 1 : (i + 1) / n <= c + 0.001;
      const col = i >= n - 1 ? ALIVE : i >= n - 3 ? AMBER : ARC;
      ctx.fillStyle = on ? col : '#1d1a2c';
      ctx.fillRect(mx - h * 0.025, y - h * 0.015, h * 0.05, h * 0.03);
    }
    // the cap: wide, grey, a white line across
    const y = faderY(t), cy = at(o, 0, y)[1], cw = h * 0.16, ch = h * 0.07;
    ctx.fillStyle = INK; rr(ctx, fx - cw / 2, cy - ch / 2 + h * 0.008, cw, ch, h * 0.012); ctx.fill();
    ctx.fillStyle = '#a8a8ba'; rr(ctx, fx - cw / 2, cy - ch / 2, cw, ch, h * 0.012); ctx.fill();
    ctx.fillStyle = '#d4d4e2'; ctx.fillRect(fx - cw / 2 + h * 0.008, cy - ch / 2 + h * 0.006, cw - h * 0.016, ch * 0.3);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(fx - cw / 2 + h * 0.01, cy - h * 0.005, cw - h * 0.02, h * 0.01);
    sparks(ctx, o.random, fx, hi - h * 0.03, o.since, h, 8);
    crackle(ctx, o, x0 + w * 0.3, o.base - h * 0.03, h * 0.08);
  },
};

export const BIRTH_SWITCHES = Object.freeze([bigKnife, floorLever, bigButton, plunger, ampKnob, masterFader]);

/** What Gary throws this time: any of them, at random. */
export function pickBirthSwitch(random = Math.random) {
  return BIRTH_SWITCHES[Math.min(BIRTH_SWITCHES.length - 1, Math.floor(random() * BIRTH_SWITCHES.length))];
}
