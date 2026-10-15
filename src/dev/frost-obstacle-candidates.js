// Gallery-only FROST FORTRESS OBSTACLE concepts — ten things that stand, roll,
// lie or fly in the lane of the snowfields, drawn in Frost's cut-paper hand.
//
// THE COMPLAINT (12 Oct 2026). Peter, after the office sheet: "can you examine
// obstacles in other cabinets … and recommend new items or replacements that fit
// in more with their style". Frost is half there already. Its own four were drawn
// for it — the snowman in his scarf and glasses, the ice crystal cluster, the
// 45° bear trap and the frozen switch — and they are the best-fitting bank in
// Act II. Everything else it deals is borrowed, and on a snowfield it shows:
//
//   * ICE_PATTERNS (data/cabinets.js) clones BASE_PATTERNS and swaps only the
//     cactus, so the shared WOODEN CRATE (stacked two high), the ROLLING WOODEN
//     BARREL, the purple ROTOR DRONE and the orange SONGBIRD all come through
//     unchanged — four of the commonest cells in the bank;
//   * the POP SPIKES are grey machine cones over a yellow-and-black hazard lip,
//     the one striped industrial mark on a cabinet the ski gate was taken off for
//     exactly that reason ("the one thing in the bank that could have come from
//     anywhere");
//   * the CAMPFIRE is already in the backdrop: frost-3's wolves sit round one
//     (stylePacks/frostWildlife.js, wolvesFire) — same ring of stones, same
//     crossed logs — and Peter's rule is that an obstacle is never something the
//     scenery already owns.
//
// THE BRIEF. Ten cold-world objects, each in a slot the lane already deals so a
// winner is a swap and not a new mechanic. Replacements for the six misfits
// first (two offers for the stack and the floor, one for each of the others),
// then two that would enrich the bank: an upright glider for the chair's ROLL
// slot, and Frost's own SHORT HURDLE to give back the slot the ski gate left.
// Nothing here repeats the backdrop — no pine, rock, glacier, keep, cabin or its
// woodpile, igloo, dog sled, groomer, beacon tower, chair lift, campfire or any
// animal (those have their own bake-offs).
//
// THE HAND. Frost's scenery is cut paper (frostWildlife.js, frostLandmarks.js):
// flat pieces, each over a hazy paper shadow a hair down and back, under a
// crayon sky (frostCrayon/) whose strokes rise to the right at HAND. A hazard has
// to self-outline where the scenery does not, so every piece here is that paper
// plus one slate ink (#26344d) at one weight: flat fill, a flat lit sliver, a
// flat shade band hatched in the crayon's direction, then the contour. No
// gradients, no blur.
//
// THE READ. What stands behind the lane is not the pale sky but the near hills:
// #84a3bf by day and #59668b at dusk (sampled off the real frame). Pale things —
// snow, frosted ice — stand off both; mid-blue ice vanishes into them, and dark
// slate vanishes at dusk. So ice here is drawn PALE with deep-blue shade, the
// dark materials are warm (bark, iron-red) rather than slate, and every candidate
// that can carries the guide's RED somewhere on it.
//
// THE COORDINATES. Each painter fills its PAINTED ENVELOPE in world units
// (obstacle-bakeoff-kit.js slotEnvelope: box x 4/3 x PROP_TALL x
// PROP_VISUAL_SCALE) with the ground line at y = h, and quantises `t` to its own
// frame ring. Porting is a 3/4 scale into sprites/props.js (its painters receive
// the box-x-tall size and the run stretches by 4/3), an OBSTACLES/DEBRIS/
// PROP_FRAMES/PROP_TALL entry, SELF_OUTLINED_PROPS (every one inks itself), and a
// swap in ICE_PATTERNS beside the cactus -> snowman one.
//
// MOTION IN THE PORT. The snowball is the one roller that SHOULD spin: draw.js's
// roll branch turns the whole raster, which is right for a ball, so its port
// draws one still frame and lets the run rotate it. The curling stone must not
// cartwheel — it glides upright, the office chair's case. The ice bolt flies
// level: its port drops the drone's bob and drift, which a quarrel in flight does
// not have. The parcels' tag, the saucer's spin and the rest are the painter's
// own frame ring.
//
// Nothing here is registered in any gameplay registry.
import { frameOf } from './obstacle-bakeoff-kit.js';

import {
  TAU, HAND, INK, LW, LWI, LWF, PAPER_SHADOW, SNOW, SNOW_SH, SNOW_DK, ICE, ICE_LT, ICE_MID, ICE_DK, ICE_DEEP, RED, RED_DK, RED_LT, LIFT, LIFT_DK, LIFT_LT, GOLD, GOLD_DK, GOLD_LT, BARK, BARK_DK, STEEL, STEEL_DK, STEEL_LT, GRANITE, GRANITE_DK, GRANITE_LT, LATH, LATH_DK, LATH_LT, WIRE, IRON, IRON_DK, IRON_LT, PINE_NEEDLE, jit, pen, line, fillStroke, box, circ, ell, poly, rect, shape, rrPath, rr, piece, hatch, glint, icicle, snowCap, iceBlock, parcel, giantSnowball, crampons, caltrops,
} from '../sprites/frostProps.js';

// F — THE HEATING HE UNPLUGGED: an oil-filled radiator left out in the snow,
// frozen solid, its plug lying in a drift (campfire 19x17)
function unpluggedHeater(c, w, h, t) {
  const f = frameOf(t, 8, 6), g = h - 0.2;
  const FIN_TOP = 4.0, FIN_BOT = 13.2;
  // The flex, out of the control box and round the front to the plug.
  c.beginPath();
  c.moveTo(16.6, 12.2);
  c.quadraticCurveTo(18.6, g - 0.4, 12.0, g - 0.5);
  c.lineTo(5.0, g - 0.6);
  c.quadraticCurveTo(3.6, g - 0.7, 3.2, g - 1.4);
  pen(c, INK, 0.9);
  c.stroke();
  pen(c, '#efe8dc', 0.48);
  c.stroke();
  // The feet: an H-foot under each end, on castors.
  for (const x of [4.6, 13.0]) {
    box(c, x - 1.6, FIN_BOT + 0.6, 3.2, 0.8, '#3c3f4a', INK, LWF);
    circ(c, x - 1.1, g - 0.8, 0.75, INK);
    circ(c, x + 1.1, g - 0.8, 0.75, INK);
    circ(c, x - 1.1, g - 0.8, 0.28, '#8e95a4');
    circ(c, x + 1.1, g - 0.8, 0.28, '#8e95a4');
  }
  // The handle over the top.
  c.beginPath();
  c.moveTo(4.4, FIN_TOP + 0.4);
  c.lineTo(4.4, 2.0);
  c.lineTo(12.6, 2.0);
  c.lineTo(12.6, FIN_TOP + 0.4);
  pen(c, INK, 1.0);
  c.stroke();
  pen(c, '#55596a', 0.5);
  c.stroke();
  // Seven fins, side on, red enamel: each a rounded column, lit down its left.
  for (let i = 0; i < 7; i++) {
    const x = 2.2 + i * 1.82;
    piece(c, rr(x, FIN_TOP, 1.7, FIN_BOT - FIN_TOP, 0.85), LIFT, (p) => {
      box(p, x + 1.05, FIN_TOP, 0.7, FIN_BOT - FIN_TOP, LIFT_DK);
      box(p, x + 0.3, FIN_TOP + 1.0, 0.4, FIN_BOT - FIN_TOP - 2.2, LIFT_LT);
    }, { lw: LWI, shadow: i === 0 });
  }
  // The control box on the end: a dial turned to the snowflake, and a dead lamp.
  piece(c, rr(14.6, 4.8, 3.0, 8.2, 0.6), '#efe8dc', (p) => {
    box(p, 16.6, 4.8, 1.2, 8.4, '#c9c0b0');
    hatch(p, 16.6, 4.8, 17.8, 13.0, '#a89f90', 0.8, 0.2, 21);
  }, { lw: LWI });
  circ(c, 16.0, 7.2, 1.0, '#ffffff', INK, LWF);
  line(c, 16.0, 7.2, 15.5, 6.5, INK, 0.26);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI;
    line(c, 16.0 - Math.cos(a) * 0.55, 9.6 - Math.sin(a) * 0.55, 16.0 + Math.cos(a) * 0.55, 9.6 + Math.sin(a) * 0.55, ICE_DEEP, 0.18);
  }
  // The lamp tries, now and then, and there is nothing behind it.
  circ(c, 16.0, 11.6, 0.45, f === 3 || f === 4 ? RED : '#6a2a2a', INK, 0.14);
  // Frost on every fin top, and icicles off the bottom where it thawed once.
  snowCap(c, 2.4, 14.6, FIN_TOP + 0.4, 1.0, 7, 0.4);
  ell(c, 16.1, 4.6, 1.6, 0.5, SNOW, INK, LWF);
  const ICICLES = [[3.0, 1.6], [5.0, 2.4], [6.8, 1.2], [8.6, 2.0], [10.5, 1.5], [12.4, 2.3]];
  for (const [x, len] of ICICLES) icicle(c, x, FIN_BOT, len, 0.55);
  // A drip off the longest one on the ring.
  if (f >= 4) circ(c, 5.0, FIN_BOT + 2.4 + (f - 4) * 0.5, 0.3, ICE, ICE_DEEP, 0.12);
  // The plug, face down in the snow with its pins at the hero.
  piece(c, rr(1.2, g - 3.0, 2.4, 2.2, 0.5), '#efe8dc', (p) => box(p, 1.2, g - 1.4, 2.4, 0.8, '#c9c0b0'), { lw: LWI });
  for (const y of [g - 2.5, g - 1.3]) box(c, 0.1, y, 1.2, 0.42, STEEL, INK, 0.12);
  ell(c, 2.6, g - 0.2, 2.6, 0.7, SNOW, INK, LWF);
}

// G — ICE BOLT: a crossbow quarrel with a head of ice and red flights, loosed
// from the fortress walls, at head height (low 22x13)
function iceBolt(c, w, h, t) {
  const f = frameOf(t, 8, 12), g = h;
  // The art's foot is the slide's headroom (artLift), so the bolt flies along it.
  const y = g - 3.4;
  // Rime streaming off it, back along the line it came.
  for (let i = 0; i < 4; i++) {
    const k = ((f + i * 2) % 8) / 8;
    circ(c, 15.0 + k * 6.4, y - 0.4 + (i % 2 ? 0.9 : -0.7) * k, 0.4 + k * 0.6, `rgba(247,251,255,${0.95 - k * 0.7})`, INK, 0.1);
  }
  // The flights: three red vanes, turning on the shaft as it spins. The ones
  // turned away are drawn first, in shade; there are always two to see.
  const spin = (f / 8) * TAU;
  const vane = (a, near) => {
    const tip = Math.sin(a) * 2.8;
    poly(c, [14.6, y, 17.6, y + tip * 0.8, 20.4, y + tip, 20.6, y + tip * 0.2, 19.0, y],
      near ? RED : RED_DK, INK, LWF);
    if (near) line(c, 15.4, y + tip * 0.2, 19.6, y + tip * 0.75, RED_LT, 0.2);
  };
  const vanes = [0, 1, 2].map((k) => spin + (k / 3) * TAU);
  for (const a of vanes) if (Math.cos(a) < 0) vane(a, false);
  // The shaft, ash with a dark wrap at each end.
  line(c, 4.6, y, 21.0, y, INK, 1.5);
  line(c, 4.6, y, 21.0, y, '#d9b98a', 0.9);
  line(c, 4.6, y - 0.18, 21.0, y - 0.18, '#f2dcb4', 0.2);
  for (const x of [5.6, 14.0]) box(c, x, y - 0.55, 0.9, 1.1, BARK_DK);
  box(c, 20.6, y - 0.5, 0.8, 1.0, RED_DK, INK, 0.12);
  for (const a of vanes) if (Math.cos(a) >= 0) vane(a, true);
  // The head: a long faceted point of ice, lit face up, cold face under, a ridge.
  piece(c, shape([0.2, y, 3.2, y - 2.0, 7.4, y - 1.2, 7.4, y + 1.2, 3.2, y + 2.0]), ICE, (p) => {
    poly(p, [0.2, y, 3.2, y + 2.0, 7.4, y + 1.2, 7.4, y], ICE_MID);
    hatch(p, 0, y, 7, y + 2, ICE_DK, 0.7, 0.18, 31);
    line(p, 0.6, y - 0.05, 6.6, y - 0.05, ICE_LT, 0.3);
  }, { lw: LWI });
  // The point glints as it turns.
  if (f === 2 || f === 6) glint(c, 0.6, y, 1.3);
}

// H — SNOW SAUCER: a red plastic sledging dish, flung off a slope, spinning in (high 22x13)
function snowSaucer(c, w, h, t) {
  const f = frameOf(t, 8, 12);
  const spin = (f / 8) * TAU;
  // It wobbles as it flies, like any flung disc, and shows us its dish.
  const tilt = -0.2 + 0.08 * Math.sin(spin);
  const cx = 10.4, cy = 6.0, RX = 8.2, RY = 4.0;
  // Powder thrown off its rim, trailing back the way it came.
  for (let i = 0; i < 4; i++) {
    const k = ((f + i * 2) % 8) / 8;
    circ(c, cx + RX + 0.4 + k * 3.2, cy + 1.6 - i * 0.8 + k * 0.5, 0.5 + k * 0.7, `rgba(247,251,255,${0.95 - k * 0.6})`, INK, 0.12);
  }
  // A rope handle at angle a on the rim: a loop standing proud of it.
  const handle = (a) => {
    const x = Math.cos(a) * (RX + 0.2), y = Math.sin(a) * RY;
    c.save();
    c.translate(x, y);
    c.rotate(Math.atan2(Math.sin(a) * RY, Math.cos(a) * RX));
    c.beginPath();
    c.ellipse(0.6, 0, 1.3, 0.75, 0, 0, TAU);
    pen(c, INK, 0.75);
    c.stroke();
    pen(c, GOLD, 0.36);
    c.stroke();
    c.restore();
  };
  c.save();
  c.translate(cx, cy);
  c.rotate(tilt);
  // The handles on the far side of the rim go behind the dish.
  for (const a of [spin, spin + Math.PI]) if (Math.sin(a) < 0) handle(a);
  // The disc's thickness, in shade under the rim.
  ell(c, 0, 1.1, RX, RY, LIFT_DK, INK, LW);
  // The flat rim, then the dish sunk inside it: its far wall in shadow, its floor
  // lit, a little powder caught in the bottom.
  piece(c, (p) => p.ellipse(0, 0, RX, RY, 0, 0, TAU), LIFT, (p) => {
    ell(p, 0.2, 0.3, RX * 0.74, RY * 0.7, LIFT_DK, INK, LWF);
    ell(p, 0.2, 0.95, RX * 0.68, RY * 0.52, LIFT);
    hatch(p, -RX, -RY, RX, RY * 0.2, '#8f2a20', 1.1, 0.2, 17);
    ell(p, 0.2, 0.95, RX * 0.6, RY * 0.4, LIFT);
    ell(p, 1.6, 1.4, 2.0, 0.65, SNOW, INK, 0.12);
    // The sheen on the near rim, going round with the spin.
    const a = spin;
    p.beginPath();
    p.ellipse(0, 0, RX - 0.5, RY - 0.4, 0, Math.PI * 0.15 + a * 0.25, Math.PI * 0.55 + a * 0.25);
    pen(p, LIFT_LT, 0.55);
    p.stroke();
  }, { lw: LW, shadow: false });
  for (const a of [spin, spin + Math.PI]) if (Math.sin(a) >= 0) handle(a);
  c.restore();
  // Two speed strokes behind it.
  for (let i = 0; i < 2; i++) {
    const k = ((f + i * 4) % 8) / 8;
    const y = 3.4 + i * 5.6;
    line(c, 19.4 + k * 1.4, y, 21.6 + k * 1.4, y, 'rgba(38,52,77,0.55)', 0.3);
  }
}

// I — CURLING STONE gliding in over the ice, red handle up, turning slowly (roll 16x13)
function curlingStone(c, w, h, t) {
  const f = frameOf(t, 16, 8), g = h - 0.2;
  // The curl: the stone turns over the ring — the flecks go round and the handle
  // swings — because a stone that is not turning is not curling.
  const turn = (f / 16) * TAU;
  const TOP = g - 7.6;
  // Its reflection in the ice, and the shavings off the running band.
  ell(c, 8.0, g - 0.1, 7.2, 0.7, 'rgba(255,255,255,0.55)');
  for (let i = 0; i < 3; i++) {
    const k = ((f + i * 5) % 16) / 16;
    circ(c, 1.6 - k * 1.6, g - 0.6 - k * 1.8 + i * 0.3, 0.34 + k * 0.2, ICE_LT, INK, 0.1);
  }
  // The body: a squat polished granite round — domed top, the widest part a dark
  // striking band, rounding under to the running band.
  const body = (p) => {
    p.moveTo(4.0, g);
    p.quadraticCurveTo(0.2, g - 0.2, 0.3, g - 3.4);
    p.quadraticCurveTo(0.4, TOP + 0.8, 4.6, TOP);
    p.quadraticCurveTo(8.0, TOP - 0.7, 11.4, TOP);
    p.quadraticCurveTo(15.6, TOP + 0.8, 15.7, g - 3.4);
    p.quadraticCurveTo(15.8, g - 0.2, 12.0, g);
    p.closePath();
  };
  piece(c, body, GRANITE, (p) => {
    box(p, 0, g - 4.4, 16, 1.6, GRANITE_DK);
    box(p, 0, g - 1.2, 16, 1.4, GRANITE_DK);
    hatch(p, 12.0, TOP, 16, g, '#69727f', 0.9, 0.22, 23);
    p.beginPath();
    p.moveTo(2.4, TOP + 1.4);
    p.quadraticCurveTo(5.0, TOP + 0.2, 9.0, TOP + 0.4);
    pen(p, GRANITE_LT, 0.8);
    p.stroke();
    // A few flecks in the granite, turning with the stone.
    for (let i = 0; i < 6; i++) {
      const a = turn + i * 2.4;
      circ(p, 8 + Math.cos(a) * (2.6 + (i % 3) * 2.0), TOP + 2.4 + (i % 3) * 1.4, 0.2, i % 2 ? '#6d7684' : '#eef1f5');
    }
  });
  // The handle: a red gooseneck on its bolt, swung round by the curl — a few
  // degrees either way, so it is never seen end-on and the red never goes.
  const reach = 3.8 * Math.cos(0.55 * Math.sin(turn));
  const dir = 1;
  const hx = 8.0, hy = TOP - 2.6;
  ell(c, hx, TOP - 0.2, 2.0, 0.55, '#3d4452', INK, LWF);
  box(c, hx - 0.7, hy, 1.4, TOP - hy, RED_DK, INK, LWF);
  c.beginPath();
  c.moveTo(hx + 0.4 * dir, hy + 0.3);
  c.lineTo(hx - reach, hy);
  c.quadraticCurveTo(hx - reach - 1.1 * dir, hy + 0.2, hx - reach - 0.9 * dir, hy + 1.8);
  pen(c, INK, 2.0);
  c.stroke();
  pen(c, RED, 1.3);
  c.stroke();
  c.beginPath();
  c.moveTo(hx, hy - 0.25);
  c.lineTo(hx - reach * 0.9, hy - 0.35);
  pen(c, RED_LT, 0.32);
  c.stroke();
  // Speed strokes on the ice behind it.
  for (let i = 0; i < 2; i++) {
    const k = ((f + i * 8) % 16) / 16;
    line(c, 15.0 + k * 0.6, g - 1.6 - i * 2.4, 16.0, g - 1.6 - i * 2.4, 'rgba(38,52,77,0.5)', 0.3);
  }
}

// J — SNOW FENCE: a run of red lath snow fence on two stakes, drifted up on the
// windward side (hurdle 21x12)
function snowFence(c, w, h, t) {
  const f = frameOf(t, 8, 8), g = h - 0.2;
  // The split feet are box x 2 and 14; the box sits 2.5 in from the envelope.
  const P0 = 4.5, P1 = 16.5;
  const TOPW = 2.6, BOTW = 7.6; // the two runs of twisted wire
  // The drift banked against the far (windward) side, behind the laths.
  c.beginPath();
  c.moveTo(P0 + 1, g);
  c.quadraticCurveTo(10.5, g - 6.6, P1 + 4.0, g);
  c.closePath();
  fillStroke(c, SNOW_SH, INK, LWF);
  // The laths: thin, uneven, painted red, the paint worn off some tops.
  for (let i = 0; i < 9; i++) {
    const x = P0 + 0.5 + i * 1.32;
    const top = 2.6 + jit(3, i) * 1.2;
    piece(c, (p) => {
      p.moveTo(x, g);
      p.lineTo(x, top + 0.5);
      p.lineTo(x + 0.45, top);
      p.lineTo(x + 0.9, top + 0.5);
      p.lineTo(x + 0.9, g);
      p.closePath();
    }, i % 3 === 1 ? LATH_DK : LATH, (p) => {
      box(p, x, top, 0.3, g, LATH_LT);
      if (i % 4 === 2) box(p, x, top, 1, 1.4, '#e9d7c0');
    }, { lw: LWF, shadow: false });
  }
  // The twisted wire binding the laths, run between the stakes.
  for (const y of [TOPW, BOTW]) {
    c.beginPath();
    c.moveTo(P0, y + 0.2);
    c.lineTo(P1, y);
    pen(c, WIRE, 0.42);
    c.stroke();
    c.beginPath();
    for (let x = P0 + 0.4; x < P1; x += 0.9) {
      c.moveTo(x, y - 0.25);
      c.lineTo(x + 0.45, y + 0.35);
    }
    pen(c, '#8e95a4', 0.16);
    c.stroke();
  }
  // The two stakes, taller than the fence, hammered in.
  for (const x of [P0, P1]) {
    piece(c, rect(x - 0.8, 0.6, 1.6, g - 0.6), BARK, (p) => box(p, x + 0.2, 0, 0.6, h, BARK_DK), { lw: LWI });
    snowCap(c, x - 0.7, x + 0.7, 0.9, 0.7, x, 0.3);
  }
  // Snow on the near side, drifted against the foot.
  c.beginPath();
  c.moveTo(0.2, g);
  c.quadraticCurveTo(3.4, g - 2.0, 9.0, g);
  c.closePath();
  fillStroke(c, SNOW, INK, LWF);
  // Spindrift blowing through the gaps toward the hero.
  for (let i = 0; i < 3; i++) {
    const k = ((f + i * 3) % 8) / 8;
    const y = 4.0 + i * 2.0;
    const x = P0 + 6 - k * 9;
    line(c, x, y, x + 1.4, y, 'rgba(247,251,255,0.95)', 0.42);
    line(c, x, y + 0.3, x + 1.4, y + 0.3, 'rgba(38,52,77,0.25)', 0.16);
  }
}

// ============================================================== the bake-off
export const BAKEOFF = {
  cabinet: 'frost',
  title: 'FROST FORTRESS — obstacles for the snow (bake-off)',
  note: 'Frost’s own four fit — the snowman, the ice crystals, the bear trap and the frozen switch were drawn for it. '
    + 'Everything else is borrowed: the wooden crate, the rolling barrel, the purple rotor drone and the orange songbird '
    + 'come straight through BASE_PATTERNS, the pop spikes are grey machine cones over a hazard stripe, and the campfire '
    + 'is already in the backdrop, where frost-3’s wolves sit round one. Ten cold-world objects in Frost’s cut paper: '
    + 'a replacement for each misfit (two for the stack and the floor), then a glider and a hurdle the snow has never had. '
    + 'Pick letters.',
  // One strip of the real frame per entry; stageIndex and camX pick the scenery.
  // Day, the low sun, and dusk: the three lights a hazard has to stand off.
  strips: [
    { label: 'FROST FORTRESS 1 · DAY', stageIndex: 1, camX: 600 },
    { label: 'FROST FORTRESS 2 · LOW SUN', stageIndex: 2, camX: 1400 },
    { label: 'FROST FORTRESS 3 · DUSK', stageIndex: 3, camX: 2200 },
  ],
  // The detail row's panels: what is behind a lane hazard (the near hills, not
  // the sky — sampled off the real frame), the road, and what is under it.
  swatches: [
    { sky: '#84a3bf', ground: '#cae1ef', under: '#9dbbd9' },
    { sky: '#7d99bf', ground: '#c3d8ea', under: '#92aecd' },
    { sky: '#59668b', ground: '#9fadca', under: '#7382a5' },
  ],
  // What the cabinet deals today, through the real run painter: [type, x].
  control: [['snowman', 4], ['bearTrap', 24], ['crate', 78], ['snowmanBig', 96], ['iceCrystals', 120], ['switch', 120],
    ['drone', 142], ['barrel', 160], ['campfire', 182], ['buzzbird', 186], ['popSpikes', 208]],
  candidates: [
    { letter: 'A', id: 'iceBlocks', name: 'ICE BLOCKS', slot: 'stack', paint: iceBlock,
      note: 'Blocks of lake ice cut with a saw — striations, bubbles rising in trails, a crack, frost on the top edge. '
        + 'The crate, in the cabinet’s own material; shatters like the crystals. Shown single and two high.' },
    { letter: 'B', id: 'parcels', name: 'SLEIGH PARCELS', slot: 'stack', paint: parcel,
      note: 'The presents that fell off frost-3’s sleigh: red paper printed with snowflakes, a gold ribbon and bow, '
        + 'a tag turning in the wind. Red = AVOID for free. The risk: a present can read as a prize.' },
    { letter: 'C', id: 'giantSnowball', name: 'GIANT SNOWBALL', slot: 'barrel', paint: giantSnowball,
      note: 'Rolls at you with what it picked up — pine needles, and a red scarf wound in with its fringed end '
        + 'flapping out. The one roller whose spin is RIGHT: the run already turns the barrel’s raster, so the port is one still frame.' },
    { letter: 'D', id: 'crampons', name: 'CRAMPONS', slot: 'floor', paint: crampons,
      note: 'A dropped pair lying points-up, front points raking at the hero, a red strap tangled over the frame and '
        + 'a glint running along the points. Frost’s spike plate, with a reason to be on a mountain.' },
    { letter: 'E', id: 'caltrops', name: 'CALTROPS', slot: 'floor', paint: caltrops,
      note: 'The fortress’s own floor hazard: four iron caltrops strewn across the road, rusted red, one point always '
        + 'up, rime on the shoulders, frost glinting off the tips in turn. Spikes with a reason to be outside a keep.' },
    { letter: 'F', id: 'unpluggedHeater', name: 'THE HEATING', slot: 'campfire', paint: unpluggedHeater,
      note: 'The taunt’s punchline — I UNPLUGGED THE HEATING TOO: a red oil-filled radiator out in the snow, frozen, '
        + 'icicles off its fins, the dial on the snowflake, its plug face down in a drift. The cold one, where the fire was.' },
    { letter: 'G', id: 'iceBolt', name: 'ICE BOLT', slot: 'low', paint: iceBolt,
      note: 'A crossbow quarrel loosed from the fortress walls: a long head of faceted ice, red flights spinning on '
        + 'the shaft, rime streaming behind. At head height, pointed at you — slide under. Replaces the rotor drone.' },
    { letter: 'H', id: 'snowSaucer', name: 'SNOW SAUCER', slot: 'high', paint: snowSaucer,
      note: 'A red plastic sledging dish flung off a slope, spinning and wobbling in over the jump, rope handles going '
        + 'round, powder off its rim. Replaces the songbird: not an animal, and red on every sky.' },
    { letter: 'I', id: 'curlingStone', name: 'CURLING STONE', slot: 'roll', paint: curlingStone,
      note: 'The ice mechanic’s own heavy: polished granite, red gooseneck handle, gliding in UPRIGHT and curling as '
        + 'it comes, shavings off the running band. NEW to frost — the chair’s ROLL slot (12x10, vx −34), with an upright glide.' },
    { letter: 'J', id: 'snowFence', name: 'SNOW FENCE', slot: 'hurdle', paint: snowFence,
      note: 'A run of red lath fence wired between two stakes, drifted up on the far side, spindrift blowing through. '
        + 'Gives back the short hurdle the ski gate took with it — in the snow’s own hand.' },
  ],
};

export { frameOf };
