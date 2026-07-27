// Flat-cartoon vector props: obstacles, pickups, villains, scenery.
// Same language as the heroes (sprites/toons.js) — flat colors, soft dark
// outlines, no pixel grids. Each painter draws into a normalized w-by-h box,
// so art is resolution independent; painters are rasterized once into
// supersampled offscreen canvases and drawn smoothly at any size.

export const OUTLINE = 'rgba(26,16,40,0.34)';

// ------------------------------------------------------------- helpers
// Exported so sibling art modules (sprites/arcade.js) draw in the same
// language — same outline weight, same rounded-rect maths — instead of
// forking a second set that drifts.
function ol(ctx, u) { ctx.strokeStyle = OUTLINE; ctx.lineWidth = Math.max(0.55, 0.055 * u); }
export function shape(ctx, fill, u, pathFn) {
  ctx.beginPath();
  pathFn(ctx);
  ctx.fillStyle = fill;
  ctx.fill();
  ol(ctx, u);
  ctx.stroke();
}
// Hairline version for small world props. These objects are rasterized at
// extra internal detail, so a fine translucent contour survives reduction
// without turning into the broad dark border used by the older shared shape().
function fineShape(ctx, fill, u, pathFn, color = OUTLINE, scale = 0.02) {
  ctx.beginPath();
  pathFn(ctx);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(0.2, scale * u);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}
function cappedLine(u, minimum, growth, maximum) {
  return Math.min(maximum, Math.max(minimum, growth * u));
}
export function plain(ctx, fill, pathFn) {
  ctx.beginPath();
  pathFn(ctx);
  ctx.fillStyle = fill;
  ctx.fill();
}
export function rr(ctx, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}
export function star(ctx, cx, cy, R, r, n, rot = -Math.PI / 2) {
  for (let i = 0; i < n * 2; i++) {
    const rad = i % 2 ? r : R;
    const a = rot + (i * Math.PI) / n;
    const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}
// simple round-cap line
export function stroke(ctx, col, w, pathFn) {
  ctx.beginPath();
  pathFn(ctx);
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.stroke();
}

// One HUD battery cell, laid out on a 28x18 grid and scaled into the box:
// rounded body, terminal nub on the right, lightning bolt through the middle.
// A spent cell keeps the full silhouette in outline rather than vanishing, so
// the row's length always states the maximum and the fill states what is left.
function hudCell(ctx, w, h, charged) {
  const X = (n) => (w * n) / 28, Y = (n) => (h * n) / 18;
  const body = (c) => rr(c, X(1.5), Y(2.5), X(21), Y(13), X(3.5));
  const nub = (c) => rr(c, X(23), Y(6), X(3.5), Y(6), X(1.5));
  const bolt = (c) => {
    c.moveTo(X(14), Y(5)); c.lineTo(X(10), Y(10.5)); c.lineTo(X(13), Y(10.5));
    c.lineTo(X(12), Y(14)); c.lineTo(X(16), Y(8.5)); c.lineTo(X(13), Y(8.5));
    c.closePath();
  };
  if (charged) {
    plain(ctx, '#74c947', body);
    stroke(ctx, '#4d9433', X(1.5), body);
    plain(ctx, '#74c947', nub);
    plain(ctx, '#fff', bolt);
  } else {
    stroke(ctx, 'rgba(255,255,255,0.3)', X(1.5), body);
    plain(ctx, 'rgba(255,255,255,0.18)', nub);
    plain(ctx, 'rgba(255,255,255,0.18)', bolt);
  }
}

// Cold metal for the CHALLENGE trophy, lit from the upper left — the same
// direction as coin/hudCoin, so everything in a HUD row agrees about where the
// light is. A gradient rather than a flat fill because in an 8x8 box a flat
// fill leaves nothing to separate bowl from stem from base: the whole icon
// reads as one lump.
//
// SILVER, not gold. The TOASTER plug beside it is gold — it is literally the
// GOLDEN TOASTER — and two warm metal icons in a three-slot row read as one
// smear at 8px however different their silhouettes are. Steel rather than
// white silver: the MISSION plug on the other side is a cream board, so the
// cool blue-grey is what keeps this from blurring into THAT instead. The
// row now runs cool-cream / cool-steel / warm-gold, which separates by hue
// before shape has to do any work.
function trophySilver(ctx, w, h) {
  const g = ctx.createLinearGradient(w * 0.22, 0, w * 0.86, h);
  g.addColorStop(0, '#f4f8fd');
  g.addColorStop(0.44, '#b9c4d4');
  g.addColorStop(1, '#67748a');
  return g;
}
// Cool dark contour rather than the shared purple-black OUTLINE: this draws on
// the plug row's #181820 tile, where a neutral dark edge merges with the fill
// and eats the foot.
const TROPHY_INK = 'rgba(26,34,50,0.55)';
// How far the trophy's handle loops reach from the centre, as a fraction of the
// box. Was 0.44 with a 0.48 control point, which put the widest part of the
// stroke essentially on the edge of the tile: against a bowl whose half-width is
// 0.26 the handles were the widest thing in the icon, and at plug sizes the
// trophy read as a cup with wings. 0.36 keeps the loops clearly outboard of the
// bowl — which is what stops the silhouette reverting to a tulip — without them
// being the feature.
const TROPHY_HANDLE_SPREAD = 0.36;
// Handle stroke weight, as a fraction of the box. Separate axis from the reach
// above: spread decides where the loops sit, this decides how heavy they are.
// Was 0.1, which at HUD size put a nearly one-pixel bar around a bowl whose own
// contour is a 0.028 hairline — the handles read as cast iron bolted to sheet
// metal. 0.07 still closes into a solid mark at 5px but stops out-weighing the
// cup it belongs to.
const TROPHY_HANDLE_WEIGHT = 0.07;

// ------------------------------------------------------------- painters
// Each: (ctx, w, h) drawing inside [0..w] x [0..h]. Ground props sit on h.
// The eye drone's strip length. Declared up here because both the painter and
// PROP_FRAMES need it and they must never disagree — a painter that cycles on a
// different count from the table it is rasterized against jumps at the seam.
const DRONE_EYE_FRAMES = 16;

export const PROP_PAINTERS = {
  // --- ground hazards ---------------------------------------------------
  // A thorn cactus: saguaro silhouette — fat trunk, two arms elbowing upward —
  // bristling with pale spines. This slot cycled through shrub drawings and a
  // fire before landing here; a cactus is the one desert prop whose silhouette
  // survives 13x12, because everyone already knows the shape.
  //
  // Red-orange, not green, ON PURPOSE: the guide teaches RED = AVOID, and the
  // plumber cabinet's turf is #3a9c48 — a green cactus vanishes into exactly
  // the ground it spawns on. (A red shrub was where this art began, for the
  // same reason.)
  cactus(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const base = h * 0.995;
    // A slow sway, like the whole plant is grooving to the cabinet music: the
    // body shears about its base (feet planted, top swinging) while each arm
    // bobs on its own offset of the same cycle. Shear rather than rotation so
    // the base never lifts off the ground line.
    const p = (frame % 6) * (Math.PI / 3);
    const k = 0.045 * Math.sin(p);
    ctx.save();
    ctx.transform(1, 0, -k, 1, k * base, 0);
    const armBobL = h * 0.02 * Math.sin(p + 1.1);
    const armBobR = h * 0.02 * Math.sin(p + 3.9);
    const arm = (c, x0, y0, aw, rise, dir) => {
      // an elbow: out sideways, then up, rounded at both turns
      c.moveTo(x0, y0 + aw);
      c.lineTo(x0 + dir * (aw * 1.7), y0 + aw);
      c.arcTo(x0 + dir * (aw * 2.6), y0 + aw, x0 + dir * (aw * 2.6), y0, aw * 0.9);
      c.lineTo(x0 + dir * (aw * 2.6), y0 - rise);
      c.arcTo(x0 + dir * (aw * 2.6), y0 - rise - aw, x0 + dir * (aw * 1.6), y0 - rise - aw, aw);
      c.arcTo(x0 + dir * (aw * 0.8), y0 - rise - aw, x0 + dir * (aw * 0.8), y0 - rise, aw * 0.8);
      c.lineTo(x0 + dir * (aw * 0.8), y0 - aw * 0.2);
      c.closePath();
    };
    fineShape(ctx, '#d84828', u, (c) => {
      // trunk: slightly waisted, domed top
      c.moveTo(w * 0.38, base);
      c.lineTo(w * 0.38, h * 0.3);
      c.arc(w * 0.5, h * 0.3, w * 0.12, Math.PI, 0, false);
      c.lineTo(w * 0.62, base);
      c.closePath();
      arm(c, w * 0.38, h * 0.52 + armBobL, w * 0.1, h * 0.16 - armBobL, -1); // left arm, lower
      arm(c, w * 0.62, h * 0.4 + armBobR, w * 0.1, h * 0.1 - armBobR, 1);    // right arm, higher
    });
    // Ribs: two darker grooves down the trunk, one per arm.
    stroke(ctx, '#a83020', Math.max(0.5, w * 0.045), (c) => {
      c.moveTo(w * 0.46, h * 0.26); c.lineTo(w * 0.46, base - h * 0.04);
      c.moveTo(w * 0.55, h * 0.28); c.lineTo(w * 0.55, base - h * 0.04);
      c.moveTo(w * 0.16, h * 0.42); c.lineTo(w * 0.16, h * 0.56);
      c.moveTo(w * 0.85, h * 0.32); c.lineTo(w * 0.85, h * 0.44);
    });
    // Spines: short pale ticks angling off the trunk and arm edges. These are
    // the "thorn" in thorn cactus — without them it is a red glove.
    stroke(ctx, '#f8d0a0', Math.max(0.45, w * 0.04), (c) => {
      const ticks = [
        [0.38, 0.34, -1, -0.2], [0.38, 0.62, -1, 0.15], [0.38, 0.86, -1, -0.1],
        [0.62, 0.5, 1, -0.15], [0.62, 0.74, 1, 0.2], [0.62, 0.92, 1, -0.1],
        [0.44, 0.2, -0.5, -1], [0.58, 0.2, 0.5, -1],
        [0.09, 0.38, -0.8, -0.6], [0.24, 0.38, 0.6, -0.8],
        [0.78, 0.28, -0.6, -0.8], [0.92, 0.28, 0.8, -0.6],
      ];
      for (const [tx, ty, dx, dy] of ticks) {
        c.moveTo(w * tx, h * ty);
        c.lineTo(w * (tx + dx * 0.06), h * (ty + dy * 0.06));
      }
    });
    ctx.restore();
    // A little sand mound so it grows out of the ground rather than standing
    // on it. Outside the sway shear: the ground does not dance.
    plain(ctx, '#8a2018', (c) => c.ellipse(w * 0.5, h * 0.985, w * 0.34, h * 0.04, 0, 0, Math.PI * 2));
  },
  cactusBig(ctx, w, h, frame = 0) { PROP_PAINTERS.cactus(ctx, w, h, frame); },
  // Frost Fortress swaps the desert hazard for this hostile little snowman.
  // It keeps the cactus hitbox and red "avoid" read, but belongs to the ice
  // cabinet: blue-shadowed snow, coal eyes, carrot nose, and a broad red scarf.
  // Six shivering poses move the twig arms while the bottom snowball stays
  // planted on the ground line.
  snowman(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const fineShape = (fill, pathFn) => {
      ctx.beginPath();
      pathFn(ctx);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = 'rgba(26,16,40,0.24)';
      ctx.lineWidth = Math.max(0.24, u * 0.013);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    };
    const p = (frame % 6) * (Math.PI / 3);
    const sway = Math.sin(p);
    const shiver = Math.cos(p);
    const cx = w * (0.5 + sway * 0.018);
    const bodyY = h * (0.765 + (1 - shiver) * 0.006);
    const headY = h * (0.37 - shiver * 0.012);
    const armLine = Math.max(0.55, u * 0.052);

    // Twig arms sit behind the snowballs. Their opposing wave makes the
    // shiver readable even at the ordinary 13-pixel obstacle width.
    stroke(ctx, '#513849', armLine, (c) => {
      c.moveTo(cx - w * 0.23, h * 0.58);
      c.lineTo(w * 0.12, h * (0.46 + sway * 0.035));
      c.lineTo(w * 0.035, h * (0.39 + sway * 0.055));
      c.moveTo(w * 0.12, h * (0.46 + sway * 0.035));
      c.lineTo(w * 0.07, h * (0.5 + sway * 0.02));
      c.moveTo(cx + w * 0.23, h * 0.57);
      c.lineTo(w * 0.88, h * (0.43 - sway * 0.035));
      c.lineTo(w * 0.965, h * (0.34 - sway * 0.055));
      c.moveTo(w * 0.88, h * (0.43 - sway * 0.035));
      c.lineTo(w * 0.94, h * (0.47 - sway * 0.02));
    });

    // Two simple, flat snowballs with the shared soft outline.
    fineShape('#eaf6ff', (c) => {
      c.ellipse(cx, bodyY, w * (0.34 + shiver * 0.006), h * (0.23 - shiver * 0.004), 0, 0, Math.PI * 2);
    });
    plain(ctx, '#b9d9ee', (c) => {
      c.ellipse(cx - w * 0.13, bodyY + h * 0.045, w * 0.075, h * 0.14, -0.22, 0, Math.PI * 2);
    });
    fineShape('#f7fbff', (c) => {
      c.ellipse(cx, headY, w * 0.285, h * 0.235, sway * 0.025, 0, Math.PI * 2);
    });
    plain(ctx, '#c9e3f2', (c) => {
      c.ellipse(cx - w * 0.12, headY + h * 0.03, w * 0.06, h * 0.125, -0.15, 0, Math.PI * 2);
    });

    // The scarf is deliberately broad and red: on the pale ice palette this
    // replaces the cactus's red body as the instant hazard cue.
    fineShape('#d84848', (c) => rr(c, cx - w * 0.255, h * 0.515, w * 0.51, h * 0.105, h * 0.045));
    plain(ctx, '#a83038', (c) => {
      c.moveTo(cx + w * 0.105, h * 0.585);
      c.lineTo(cx + w * (0.28 + sway * 0.025), h * 0.64);
      c.lineTo(cx + w * (0.23 + sway * 0.02), h * 0.82);
      c.lineTo(cx + w * 0.08, h * 0.69);
      c.closePath();
    });
    // A simple three-button row down the torso.
    plain(ctx, '#2b2440', (c) => {
      c.arc(cx - w * 0.012, h * 0.69, w * 0.034, 0, Math.PI * 2);
      c.arc(cx + w * 0.014, h * 0.79, w * 0.034, 0, Math.PI * 2);
      c.arc(cx - w * 0.02, h * 0.89, w * 0.034, 0, Math.PI * 2);
    });

    // Oversized rounded-rectangle glasses turn the hazard into a visual joke.
    // The pupils
    // are deliberately mismatched—both generally watch the player to the left,
    // but they cannot quite agree on where the player is.
    const glassesColor = 'rgba(55,35,76,0.78)';
    const glassesLine = cappedLine(u, 0.34, 0.022, 0.58);
    stroke(ctx, glassesColor, glassesLine, (c) => {
      c.moveTo(cx - w * 0.235, headY - h * 0.055); c.lineTo(cx - w * 0.29, headY - h * 0.085);
      c.moveTo(cx + w * 0.235, headY - h * 0.055); c.lineTo(cx + w * 0.29, headY - h * 0.085);
      c.moveTo(cx - w * 0.02, headY - h * 0.055); c.lineTo(cx + w * 0.02, headY - h * 0.055);
    });
    ctx.beginPath();
    rr(ctx, cx - w * 0.25, headY - h * 0.12, w * 0.22, h * 0.11, h * 0.032);
    rr(ctx, cx + w * 0.03, headY - h * 0.12, w * 0.22, h * 0.11, h * 0.032);
    ctx.fillStyle = '#f7fbff';
    ctx.fill();
    ctx.strokeStyle = glassesColor;
    ctx.lineWidth = glassesLine;
    ctx.lineJoin = 'round';
    ctx.stroke();
    plain(ctx, '#172238', (c) => {
      c.ellipse(cx - w * 0.148, headY - h * 0.072, w * 0.034, h * 0.048, -0.12, 0, Math.PI * 2);
      c.ellipse(cx + w * 0.087, headY - h * 0.052, w * 0.034, h * 0.048, 0.18, 0, Math.PI * 2);
    });
    plain(ctx, '#fff', (c) => {
      c.arc(cx - w * 0.16, headY - h * 0.097, w * 0.011, 0, Math.PI * 2);
      c.arc(cx + w * 0.075, headY - h * 0.079, w * 0.011, 0, Math.PI * 2);
    });
    // A darker rounded root sits inside the snow head; the carrot cone emerges
    // from it and draws over the glasses, so it is both embedded and in front.
    plain(ctx, '#c95b25', (c) => {
      c.ellipse(cx - w * 0.006, headY + h * 0.004, w * 0.045, h * 0.05, -0.08, 0, Math.PI * 2);
    });
    plain(ctx, '#ef7b32', (c) => {
      c.moveTo(cx - w * 0.006, headY - h * 0.038);
      c.lineTo(cx - w * 0.37, headY + h * (0.005 - sway * 0.008));
      c.lineTo(cx - w * 0.018, headY + h * 0.045);
      c.closePath();
    });
    // One understated crooked mouth completes the face without competing with
    // the glasses or turning into another row of coal.
    stroke(ctx, 'rgba(37,29,57,0.72)', cappedLine(u, 0.3, 0.018, 0.44), (c) => {
      c.moveTo(cx - w * 0.085, headY + h * 0.093);
      c.quadraticCurveTo(cx - w * 0.005, headY + h * 0.103, cx + w * 0.08, headY + h * 0.101);
    });
    plain(ctx, '#91b9d2', (c) => c.ellipse(w * 0.5, h * 0.985, w * 0.34, h * 0.035, 0, 0, Math.PI * 2));
  },
  snowmanBig(ctx, w, h, frame = 0) { PROP_PAINTERS.snowman(ctx, w, h, frame); },
  crate(ctx, w, h) {
    const u = Math.max(w, h);
    const fineShape = (fill, pathFn) => {
      ctx.beginPath(); pathFn(ctx);
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = 'rgba(50,30,12,0.24)';
      ctx.lineWidth = Math.max(0.12, u * 0.01);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
    };
    // Flat, rounded construction: one fine frame and one inset wooden face.
    // Depth belongs to the flying toaster; this stays in the prop language.
    fineShape('#8a6432', (c) => rr(c, w * 0.04, h * 0.05, w * 0.92, h * 0.9, w * 0.17));
    plain(ctx, '#c89858', (c) => rr(c, w * 0.09, h * 0.1, w * 0.82, h * 0.8, w * 0.14));
    plain(ctx, 'rgba(255,230,176,0.3)', (c) => rr(c, w * 0.13, h * 0.14, w * 0.74, h * 0.08, h * 0.035));
    stroke(ctx, 'rgba(106,70,30,0.48)', Math.max(0.32, w * 0.028), (c) => {
      c.moveTo(w * 0.14, h * 0.39); c.lineTo(w * 0.86, h * 0.39);
      c.moveTo(w * 0.14, h * 0.63); c.lineTo(w * 0.86, h * 0.63);
    });
    stroke(ctx, '#8a5a2a', Math.max(0.5, w * 0.055), (c) => {
      c.moveTo(w * 0.19, h * 0.22); c.lineTo(w * 0.81, h * 0.79);
      c.moveTo(w * 0.81, h * 0.22); c.lineTo(w * 0.19, h * 0.79);
    });
    plain(ctx, '#5a4020', (c) => {
      for (const [x, y] of [[0.14, 0.15], [0.86, 0.15], [0.14, 0.85], [0.86, 0.85]])
        c.arc(w * x, h * y, w * 0.025, 0, Math.PI * 2);
    });
  },
  qcrate(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const outlinedShape = (fill, pathFn, strokeStyle = 'rgba(58,38,8,0.22)',
      lineWidth = cappedLine(u, 0.12, 0.009, 0.18)) => {
      ctx.beginPath(); pathFn(ctx);
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
    };
    // Flat partner to the ordinary crate: rounded gold frame and inset face.
    // Its hairline perimeter keeps the block crisp without turning it into a
    // dark badge after the high-resolution art is reduced into the world.
    outlinedShape('#b88a18', (c) => rr(c, w * 0.04, h * 0.05, w * 0.92, h * 0.9, w * 0.18),
      'rgba(58,38,8,0.18)', cappedLine(u, 0.08, 0.006, 0.12));
    plain(ctx, '#f6d33c', (c) => rr(c, w * 0.09, h * 0.1, w * 0.82, h * 0.8, w * 0.14));
    plain(ctx, '#ffe56a', (c) => rr(c, w * 0.13, h * 0.14, w * 0.74, h * 0.1, h * 0.045));

    // One brief, dim glint every three seconds. Most of the loop is deliberately
    // quiet, so the block catches the light rather than constantly shimmering.
    const cycleFrame = frame % 36;
    if (cycleFrame >= 3 && cycleFrame <= 7) {
      const glintT = (cycleFrame - 3) / 4;
      const glintX = w * (-0.12 + glintT * 1.16);
      ctx.save();
      ctx.beginPath();
      rr(ctx, w * 0.09, h * 0.1, w * 0.82, h * 0.8, w * 0.14);
      ctx.clip();
      plain(ctx, 'rgba(255,255,235,0.18)', (c) => {
        c.moveTo(glintX - w * 0.075, h * 0.84);
        c.lineTo(glintX + w * 0.025, h * 0.16);
        c.lineTo(glintX + w * 0.09, h * 0.16);
        c.lineTo(glintX - w * 0.01, h * 0.84);
        c.closePath();
      });
      stroke(ctx, 'rgba(255,255,248,0.5)', Math.max(0.1, w * 0.008), (c) => {
        c.moveTo(glintX - w * 0.005, h * 0.74);
        c.lineTo(glintX + w * 0.065, h * 0.27);
      });
      ctx.restore();
    }

    // Hand-drawn punctuation: broad curved crown, aggressively tapered stem,
    // and an oversized oval dot. Only the upper stroke moves: its lower tip is
    // the pendulum pivot, while the dot remains completely fixed beneath it.
    const phase = cycleFrame * Math.PI / 18;
    const tilt = Math.sin(phase) * 0.085;
    ctx.save();
    ctx.translate(w * 0.5, h * 0.69);
    ctx.rotate(tilt);
    ctx.translate(0, -h * 0.17);
    outlinedShape('#82531f', (c) => {
      c.moveTo(-w * 0.11, -h * 0.25);
      c.quadraticCurveTo(-w * 0.105, -h * 0.3, -w * 0.055, -h * 0.31);
      c.lineTo(w * 0.115, -h * 0.34);
      c.quadraticCurveTo(w * 0.15, -h * 0.345, w * 0.13, -h * 0.29);
      c.lineTo(w * 0.025, h * 0.14);
      c.quadraticCurveTo(w * 0.02, h * 0.17, 0, h * 0.17);
      c.lineTo(-w * 0.025, h * 0.165);
      c.quadraticCurveTo(-w * 0.05, h * 0.16, -w * 0.075, h * 0.12);
      c.closePath();
    });
    plain(ctx, 'rgba(255,229,130,0.18)', (c) => {
      c.moveTo(-w * 0.075, -h * 0.245);
      c.quadraticCurveTo(-w * 0.065, -h * 0.27, -w * 0.035, -h * 0.275);
      c.lineTo(w * 0.055, -h * 0.29);
      c.lineTo(-w * 0.035, h * 0.11);
      c.lineTo(-w * 0.065, h * 0.105);
      c.closePath();
    });
    ctx.restore();
    outlinedShape('#82531f', (c) => c.ellipse(w * 0.5, h * 0.81, w * 0.078, h * 0.065, -0.32, 0, Math.PI * 2));
  },
  pipe(ctx, w, h) {
    const u = Math.max(w, h);
    fineShape(ctx, '#2ea8a0', u, (c) => rr(c, w * 0.14, h * 0.22, w * 0.72, h * 0.8, w * 0.08)); // shaft
    fineShape(ctx, '#3ac0b6', u, (c) => rr(c, 0, 0, w, h * 0.26, w * 0.08));                     // lip
    stroke(ctx, 'rgba(255,255,255,0.35)', Math.max(0.5, w * 0.1), (c) => { c.moveTo(w * 0.3, h * 0.34); c.lineTo(w * 0.3, h * 0.92); });
  },
  switch(ctx, w, h) {
    const u = Math.max(w, h);
    fineShape(ctx, '#b8e0f8', u, (c) => rr(c, w * 0.1, h * 0.32, w * 0.8, h * 0.6, w * 0.16)); // frozen housing
    stroke(ctx, '#e04848', Math.max(0.6, w * 0.14), (c) => { c.moveTo(w * 0.5, h * 0.6); c.lineTo(w * 0.76, h * 0.16); });
    plain(ctx, '#f6d33c', (c) => c.arc(w * 0.76, h * 0.16, w * 0.14, 0, Math.PI * 2));
  },
  beatBar(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#e04898', u, (c) => rr(c, 0, 0, w, h, Math.min(w, h) * 0.3));
    plain(ctx, '#f890c8', (c) => rr(c, w * 0.14, h * 0.08, w * 0.72, h * 0.22, h * 0.1));
  },
  barrel(ctx, w, h) {
    const u = Math.max(w, h);
    const fineShape = (fill, pathFn) => {
      ctx.beginPath(); pathFn(ctx);
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = 'rgba(42,24,10,0.32)';
      ctx.lineWidth = Math.max(0.32, u * 0.024);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
    };
    // A flat, front-on barrel: rounded silhouette, stave rhythm and hoops.
    // No top plane or receding side—the toaster owns the 3D exception.
    fineShape('#b87838', (c) => rr(c, w * 0.1, h * 0.04, w * 0.8, h * 0.92, w * 0.28));
    plain(ctx, 'rgba(216,160,88,0.42)', (c) => rr(c, w * 0.18, h * 0.1, w * 0.13, h * 0.8, w * 0.065));
    plain(ctx, 'rgba(112,60,26,0.22)', (c) => rr(c, w * 0.69, h * 0.1, w * 0.13, h * 0.8, w * 0.065));
    stroke(ctx, '#5e4e46', Math.max(0.65, h * 0.065), (c) => {
      c.moveTo(w * 0.13, h * 0.25); c.lineTo(w * 0.87, h * 0.25);
      c.moveTo(w * 0.11, h * 0.72); c.lineTo(w * 0.89, h * 0.72);
    });
    stroke(ctx, 'rgba(106,58,24,0.62)', Math.max(0.28, w * 0.025), (c) => {
      c.moveTo(w * 0.36, h * 0.1); c.lineTo(w * 0.36, h * 0.9);
      c.moveTo(w * 0.52, h * 0.08); c.lineTo(w * 0.52, h * 0.92);
      c.moveTo(w * 0.68, h * 0.1); c.lineTo(w * 0.68, h * 0.9);
    });
    stroke(ctx, 'rgba(255,220,160,0.5)', Math.max(0.3, w * 0.025), (c) => {
      c.moveTo(w * 0.2, h * 0.34); c.lineTo(w * 0.2, h * 0.62);
    });
  },
  tombstone(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#9a9ab0', u, (c) => {
      c.moveTo(w * 0.12, h);
      c.lineTo(w * 0.12, h * 0.36);
      c.arc(w * 0.5, h * 0.36, w * 0.38, Math.PI, 0);
      c.lineTo(w * 0.88, h);
      c.closePath();
    });
    stroke(ctx, '#6a6a80', Math.max(0.5, w * 0.07), (c) => {
      c.moveTo(w * 0.5, h * 0.28); c.lineTo(w * 0.5, h * 0.66);
      c.moveTo(w * 0.32, h * 0.44); c.lineTo(w * 0.68, h * 0.44);
    });
  },
  cardboardMonster(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#c8a068', u, (c) => rr(c, w * 0.06, h * 0.12, w * 0.88, h * 0.86, w * 0.14));
    // googly eyes + jagged tape mouth
    plain(ctx, '#fff', (c) => { c.ellipse(w * 0.34, h * 0.4, w * 0.13, h * 0.16, 0, 0, Math.PI * 2); c.ellipse(w * 0.66, h * 0.4, w * 0.13, h * 0.16, 0, 0, Math.PI * 2); });
    plain(ctx, '#1a1028', (c) => { c.arc(w * 0.36, h * 0.43, w * 0.06, 0, Math.PI * 2); c.arc(w * 0.68, h * 0.43, w * 0.06, 0, Math.PI * 2); });
    stroke(ctx, '#8a6a3a', Math.max(0.5, w * 0.06), (c) => {
      c.moveTo(w * 0.28, h * 0.72); c.lineTo(w * 0.42, h * 0.62);
      c.lineTo(w * 0.56, h * 0.74); c.lineTo(w * 0.72, h * 0.64);
    });
  },
  chair(ctx, w, h) {
    const u = Math.max(w, h);
    fineShape(ctx, '#3a4a5a', u, (c) => rr(c, w * 0.1, h * 0.04, w * 0.28, h * 0.66, w * 0.08)); // back
    fineShape(ctx, '#4a5a6c', u, (c) => rr(c, w * 0.08, h * 0.52, w * 0.84, h * 0.22, w * 0.08)); // seat
    stroke(ctx, '#2a3542', Math.max(0.6, w * 0.07), (c) => { c.moveTo(w * 0.5, h * 0.72); c.lineTo(w * 0.5, h * 0.86); });
    plain(ctx, '#1a1028', (c) => { c.arc(w * 0.28, h * 0.92, w * 0.1, 0, Math.PI * 2); c.arc(w * 0.72, h * 0.92, w * 0.1, 0, Math.PI * 2); });
  },
  printer(ctx, w, h) {
    const u = Math.max(w, h);
    fineShape(ctx, '#b0b0c0', u, (c) => rr(c, w * 0.04, h * 0.3, w * 0.92, h * 0.66, w * 0.12));
    plain(ctx, '#fff', (c) => rr(c, w * 0.24, h * 0.02, w * 0.52, h * 0.34, w * 0.04)); // paper
    plain(ctx, '#e04848', (c) => rr(c, w * 0.14, h * 0.52, w * 0.24, h * 0.14, h * 0.06));
    plain(ctx, '#48e0c8', (c) => c.arc(w * 0.74, h * 0.6, w * 0.08, 0, Math.PI * 2));
  },
  // A bright orange traffic cone with two white reflective bands. Small
  // footprint (10×13) so it reads easily in clusters; the Speed Zone cabinet's
  // orange ground means the white bands do the heavy lifting for visibility.
  trafficCone(ctx, w, h) {
    const u = Math.max(w, h);
    // Square base — rounded rect sitting on the ground line
    fineShape(ctx, '#e86020', u, (c) => rr(c, w * 0.14, h * 0.78, w * 0.72, h * 0.18, w * 0.06));
    // Tapered cone body
    const conePath = (c) => {
      c.moveTo(w * 0.22, h * 0.82);
      c.lineTo(w * 0.5, h * 0.08);
      c.lineTo(w * 0.78, h * 0.82);
      c.closePath();
    };
    ctx.beginPath();
    conePath(ctx);
    ctx.fillStyle = '#e86020';
    ctx.fill();
    ctx.strokeStyle = 'rgba(26,16,40,0.22)';
    ctx.lineWidth = Math.max(0.2, u * 0.012);
    ctx.lineJoin = 'round';
    ctx.stroke();
    // White reflective bands — clipped to the cone so they never poke out
    ctx.save();
    ctx.beginPath();
    conePath(ctx);
    ctx.clip();
    const bandH = h * 0.05;
    for (const by of [h * 0.55, h * 0.36]) {
      const half = w * 0.18 + (w * 0.60) * ((h * 0.82 - by) / (h * 0.74));
      plain(ctx, '#f8f8ff', (c) => {
        c.moveTo(w * 0.5 - half, by - bandH);
        c.lineTo(w * 0.5 + half, by - bandH);
        c.lineTo(w * 0.5 + half * 0.96, by + bandH);
        c.lineTo(w * 0.5 - half * 0.96, by + bandH);
        c.closePath();
      });
    }
    ctx.restore();
    // Subtle highlight stripe down the left side
    plain(ctx, 'rgba(255,255,255,0.13)', (c) => {
      c.moveTo(w * 0.26, h * 0.78);
      c.lineTo(w * 0.48, h * 0.12);
      c.lineTo(w * 0.45, h * 0.12);
      c.lineTo(w * 0.24, h * 0.78);
      c.closePath();
    });
  },
  zombieWalk(ctx, w, h) {
    const u = Math.max(w, h);
    // slouched green office zombie
    fineShape(ctx, '#5a6a8a', u, (c) => rr(c, w * 0.18, h * 0.42, w * 0.64, h * 0.42, w * 0.16));
    stroke(ctx, '#9ec89e', Math.max(0.7, w * 0.16), (c) => { c.moveTo(w * 0.2, h * 0.52); c.lineTo(w * 0.02, h * 0.44); });
    stroke(ctx, '#9ec89e', Math.max(0.7, w * 0.16), (c) => { c.moveTo(w * 0.3, h * 0.84); c.lineTo(w * 0.28, h); c.moveTo(w * 0.68, h * 0.84); c.lineTo(w * 0.7, h); });
    fineShape(ctx, '#9ec89e', u, (c) => c.arc(w * 0.5, h * 0.26, w * 0.3, 0, Math.PI * 2));
    plain(ctx, '#d83030', (c) => { c.arc(w * 0.4, h * 0.24, w * 0.06, 0, Math.PI * 2); c.arc(w * 0.62, h * 0.24, w * 0.06, 0, Math.PI * 2); });
    stroke(ctx, '#4a6a4a', Math.max(0.5, w * 0.06), (c) => { c.moveTo(w * 0.38, h * 0.4); c.lineTo(w * 0.64, h * 0.4); });
  },
  resident(ctx, w, h) {
    const u = Math.max(w, h);
    // A worried but very much ALIVE office resident: bright safety vest,
    // ordinary skin tone, glasses and a raised hand. This must never read as
    // the green, red-eyed zombie hazard standing beside it.
    shape(ctx, '#f6d33c', u, (c) => rr(c, w * 0.18, h * 0.42, w * 0.64, h * 0.42, w * 0.14));
    plain(ctx, '#48a8b8', (c) => rr(c, w * 0.42, h * 0.44, w * 0.16, h * 0.38, w * 0.03)); // vest stripe
    stroke(ctx, '#f2c9a0', Math.max(0.7, w * 0.14), (c) => { c.moveTo(w * 0.78, h * 0.54); c.lineTo(w * 0.96, h * 0.25); }); // wave
    stroke(ctx, '#3a4a5a', Math.max(0.7, w * 0.14), (c) => { c.moveTo(w * 0.32, h * 0.84); c.lineTo(w * 0.3, h); c.moveTo(w * 0.68, h * 0.84); c.lineTo(w * 0.72, h); });
    shape(ctx, '#f2c9a0', u, (c) => c.arc(w * 0.5, h * 0.25, w * 0.3, 0, Math.PI * 2));
    stroke(ctx, '#3a4a5a', Math.max(0.45, w * 0.055), (c) => { c.arc(w * 0.4, h * 0.25, w * 0.09, 0, Math.PI * 2); c.arc(w * 0.61, h * 0.25, w * 0.09, 0, Math.PI * 2); c.moveTo(w * 0.49, h * 0.25); c.lineTo(w * 0.52, h * 0.25); });
    plain(ctx, '#5a3212', (c) => rr(c, w * 0.22, h * 0.02, w * 0.56, h * 0.15, w * 0.08));
  },
  // --- flyers -----------------------------------------------------------
  // The lane runs two drones. They share one hitbox, one behaviour and one
  // palette, and differ only in what sits on top — which at a 12x7 box is the
  // entire silhouette. Which one an instance wears is fixed at spawn, so a row
  // of them is a mixed patrol rather than a repeated sticker.
  //
  // Both replace a drone that was a lozenge under a straight bar: the bar read
  // as a shelf, and nothing on it turned, so once the buzzbird beside it started
  // flapping the drone looked switched off.

  // The workhorse. Same silhouette as the old one, with the bar turned into a
  // rotor that foreshortens through its cycle and a lamp that blinks on the
  // beat. The rotor's width repeats every half turn, so a marked blade tip
  // carries the direction — it orbits the mast and lands somewhere different
  // every frame, which is what makes it spin rather than wobble.
  drone(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const ang = (frame / 6) * Math.PI * 2;
    const span = 0.12 + 0.82 * Math.abs(Math.cos(ang)); // rotor seen edge-on to flat
    const x0 = w * (0.5 - span / 2);
    const x1 = w * (0.5 + span / 2);
    // The bar's width repeats every half turn, so a marked blade tip carries the
    // direction: it orbits the mast and is in a different place every frame.
    stroke(ctx, 'rgba(200,200,216,0.75)', cappedLine(u, 0.4, 0.06, 1.3),
      (c) => { c.moveTo(x0, h * 0.16); c.lineTo(x1, h * 0.16); });
    plain(ctx, '#e8e0f8', (c) => c.arc(w * (0.5 + Math.cos(ang) * span * 0.5),
      h * (0.16 + Math.sin(ang) * 0.035), Math.max(0.3, h * 0.05), 0, Math.PI * 2));
    fineShape(ctx, '#8858c8', u, (c) => rr(c, w * 0.14, h * 0.3, w * 0.72, h * 0.56, h * 0.26));
    // Lamp blinks rather than staring — a running machine, not a painted dot.
    const lit = frame % 6 < 4;
    plain(ctx, lit ? '#f6d33c' : '#7a6a2a', (c) => c.arc(w * 0.36, h * 0.56, h * 0.14, 0, Math.PI * 2));
    plain(ctx, '#c8b8e8', (c) => rr(c, w * 0.56, h * 0.44, w * 0.22, h * 0.16, h * 0.06));
    stroke(ctx, '#5a3890', cappedLine(u, 0.35, 0.05, 1.1), (c) => {
      c.moveTo(w * 0.34, h * 0.3); c.lineTo(w * 0.4, h * 0.3);
      c.moveTo(w * 0.66, h * 0.3); c.lineTo(w * 0.6, h * 0.3);
    });
  },
  // The armed variant is the workhorse with a muzzle — it inherits the rotor and
  // the blinking lamp by construction, so the two can never drift apart.
  shooterDrone(ctx, w, h, frame = 0) {
    PROP_PAINTERS.drone(ctx, w, h, frame);
    plain(ctx, '#e04848', (c) => c.arc(w * 0.5, h * 0.86, Math.max(w, h) * 0.08, 0, Math.PI * 2)); // muzzle
  },

  // The watcher. A lens in a ring housing under a single rotor, with a thruster
  // wash beneath. Surveillance rather than delivery — the one prop in the lane
  // that looks back at you.
  //
  // Two speeds in one frame set, which is why it has sixteen frames where the
  // workhorse has six. The rotor has to blur and the eye has to drift, and those
  // are an order of magnitude apart: at the rotor's rate the lens snapped
  // between positions like something malfunctioning. So the strip is cut for the
  // SLOW half — sixteen steps across one lazy sweep, 1.3s end to end — and the
  // rotor is given five whole turns inside that. Five and sixteen share no
  // factors, so the rotor never lands twice in the same place and the two
  // motions never visibly sync up.
  droneEye(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const ph = (frame / DRONE_EYE_FRAMES) * Math.PI * 2;
    const spin = ph * 5;                                  // five turns per sweep
    const span = 0.2 + 0.6 * Math.abs(Math.cos(spin));
    stroke(ctx, 'rgba(200,200,216,0.7)', cappedLine(u, 0.4, 0.055, 1.2),
      (c) => { c.moveTo(w * (0.5 - span / 2), h * 0.14); c.lineTo(w * (0.5 + span / 2), h * 0.14); });
    // Marked blade tip, as on the workhorse. It earns its place twice: it gives
    // the rotor a direction instead of a wobble, and it is the only thing here
    // that is unique per frame — the rotor's width is an |cos| and the lens is a
    // sin, and those two symmetries line up, so without the tip frames 1 and 7
    // are the same drawing.
    plain(ctx, '#e8e0f8', (c) => c.arc(w * (0.5 + Math.cos(spin) * span * 0.5),
      h * (0.14 + Math.sin(spin) * 0.03), Math.max(0.28, h * 0.045), 0, Math.PI * 2));
    stroke(ctx, '#5a3890', cappedLine(u, 0.35, 0.05, 1.1),
      (c) => { c.moveTo(w * 0.5, h * 0.14); c.lineTo(w * 0.5, h * 0.32); });
    // Thruster wash under the housing, breathing on the slow clock so it reads
    // as the machine idling rather than as a second flicker.
    plain(ctx, `rgba(246,211,60,${(0.18 + 0.16 * (0.5 + 0.5 * Math.sin(ph))).toFixed(3)})`,
      (c) => c.ellipse(w * 0.5, h * 0.96, w * 0.26, h * 0.1, 0, 0, Math.PI * 2));
    fineShape(ctx, '#8858c8', u, (c) => c.ellipse(w * 0.5, h * 0.58, w * 0.36, h * 0.3, 0, 0, Math.PI * 2));
    // The lens drifts across and eases at each end, because sin is already
    // slowest where it turns around — a scan that pauses to look rather than a
    // metronome.
    const look = Math.sin(ph) * w * 0.06;
    plain(ctx, '#c8b8e8', (c) => c.arc(w * 0.5, h * 0.58, h * 0.2, 0, Math.PI * 2));
    plain(ctx, '#f6d33c', (c) => c.arc(w * 0.5 + look, h * 0.58, h * 0.12, 0, Math.PI * 2));
    plain(ctx, '#1a1028', (c) => c.arc(w * 0.5 + look * 1.3, h * 0.58, h * 0.05, 0, Math.PI * 2));
  },
  // Six frames of wingbeat. The drone hovers on rotors and holds still; this is
  // the one flier that is alive, and a bird that tracks across the lane without
  // moving a feather reads as a sticker. The body and head are fixed and only
  // the wing works — a whole bird bouncing inside its own sprite fights the
  // entity bob that is already moving it.
  //
  // Frame 0 is the neutral pose, identical to the old static art, because that
  // is what reduced motion holds and what every off-lane caller (debris, the
  // field guide, the gallery) draws.
  //
  // It faces LEFT. The hero runs left to right, so everything in the lane
  // travels right to left across the screen — a bird with its beak on the
  // trailing edge is flying backwards into the hero, tail first. The whole
  // painter is drawn in its original right-facing coordinates and mirrored
  // once, so the wing geometry below reads the way it was worked out.
  buzzbird(ctx, w, h, frame = 0) {
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    PROP_PAINTERS.buzzbirdBody(ctx, w, h, frame);
    ctx.restore();
  },
  buzzbirdBody(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const ph = (frame / 6) * Math.PI * 2;
    const beat = Math.sin(ph);                          // -1 down, +1 up
    // Sweep, tilt and thickness together. Height and tilt run off sin, which is
    // symmetric about the top of the stroke — on its own that makes frames 1
    // and 2 the same drawing, and the same for 4 and 5. Thickness runs off
    // SIGNED cos instead, so the downstroke and the recovery are told apart:
    // the wing is broad when it is pushing air and feathered on the way back,
    // which is both what a wing does and what keeps all six frames distinct.
    const wingY = h * (0.42 - beat * 0.24);
    const wingAngle = -0.3 - beat * 0.75;
    const wingRy = h * (0.30 - Math.cos(ph) * 0.09);
    fineShape(ctx, '#f0a860', u, (c) => c.ellipse(w * 0.28, wingY, w * 0.24, wingRy, wingAngle, 0, Math.PI * 2)); // wing
    fineShape(ctx, '#d87830', u, (c) => c.ellipse(w * 0.58, h * 0.5, w * 0.34, h * 0.36, 0, 0, Math.PI * 2));
    plain(ctx, '#f6d33c', (c) => { c.moveTo(w * 0.9, h * 0.42); c.lineTo(w, h * 0.54); c.lineTo(w * 0.88, h * 0.62); c.closePath(); });
    plain(ctx, '#1a1028', (c) => c.arc(w * 0.74, h * 0.4, w * 0.06, 0, Math.PI * 2));
  },
  icicle(ctx, w, h) {
    const u = Math.max(w, h);
    fineShape(ctx, '#b8e0f8', u, (c) => {
      c.moveTo(w * 0.1, 0); c.lineTo(w * 0.9, 0); c.lineTo(w * 0.55, h); c.closePath();
    });
    plain(ctx, '#e8f8ff', (c) => { c.moveTo(w * 0.24, h * 0.06); c.lineTo(w * 0.44, h * 0.06); c.lineTo(w * 0.4, h * 0.62); c.closePath(); });
  },
  paperwork(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#f0f0f8', u, (c) => rr(c, w * 0.06, h * 0.1, w * 0.88, h * 0.8, w * 0.08));
    stroke(ctx, '#8a8a98', Math.max(0.5, h * 0.09), (c) => {
      c.moveTo(w * 0.2, h * 0.38); c.lineTo(w * 0.8, h * 0.38);
      c.moveTo(w * 0.2, h * 0.62); c.lineTo(w * 0.66, h * 0.62);
    });
  },
  // --- pickups ----------------------------------------------------------
  coin(ctx, w, h) {
    const u = Math.max(w, h);
    const r = Math.min(w, h) * 0.46;
    const gold = ctx.createRadialGradient(w * 0.36, h * 0.29, r * 0.08, w * 0.5, h * 0.52, r);
    gold.addColorStop(0, '#fff3a0');
    gold.addColorStop(0.34, '#f8d84a');
    gold.addColorStop(1, '#d69b18');
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w * 0.44, h * 0.46, 0, 0, Math.PI * 2);
    ctx.fillStyle = gold;
    ctx.fill();
    ctx.strokeStyle = 'rgba(105,67,10,0.4)';
    ctx.lineWidth = Math.max(0.2, u * 0.018);
    ctx.stroke();

    // Fine embossed rim and stamp survive the 16-to-8 downsample as tonal
    // detail instead of becoming the thick dark washer in the old sprite.
    stroke(ctx, 'rgba(166,111,16,0.72)', Math.max(0.18, u * 0.017), (c) => {
      c.ellipse(w / 2, h / 2, w * 0.33, h * 0.35, 0, 0, Math.PI * 2);
    });
    plain(ctx, 'rgba(181,124,18,0.58)', (c) => c.ellipse(w * 0.51, h * 0.53, w * 0.105, h * 0.18, 0, 0, Math.PI * 2));
    plain(ctx, 'rgba(255,251,204,0.9)', (c) => c.ellipse(w * 0.35, h * 0.29, w * 0.075, h * 0.095, -0.45, 0, Math.PI * 2));
  },
  battery(ctx, w, h) {
    const u = Math.max(w, h);
    fineShape(ctx, '#48c848', u, (c) => rr(c, w * 0.16, h * 0.14, w * 0.68, h * 0.82, w * 0.14));
    plain(ctx, '#2a8a2a', (c) => rr(c, w * 0.34, h * 0.02, w * 0.32, h * 0.14, w * 0.05));
    plain(ctx, '#eaffea', (c) => { c.moveTo(w * 0.56, h * 0.28); c.lineTo(w * 0.36, h * 0.56); c.lineTo(w * 0.5, h * 0.56); c.lineTo(w * 0.44, h * 0.86); c.lineTo(w * 0.66, h * 0.5); c.lineTo(w * 0.5, h * 0.5); c.closePath(); });
  },
  // --- HUD-only art -----------------------------------------------------
  // The status-pill battery cells. These are NOT the `battery` pickup above:
  // that one is a chunky upright cell drawn to read as a thing lying in the
  // world, and four of them in a row at HUD size turn into a picket fence. The
  // HUD wants a lozenge — wide, low, with the bolt reading at 11 units across —
  // so it gets its own art in the panel's colour language.
  //
  // Full and empty are separate painters rather than one with a flag because
  // the sprite cache is keyed by name; a flag would collide on one entry.
  cellFull(ctx, w, h) { hudCell(ctx, w, h, true); },
  cellEmpty(ctx, w, h) { hudCell(ctx, w, h, false); },
  // The coin beside them. The world `coin` is a flat disc with a stamped
  // centre, which at 12 units in a dark panel reads as a washer; this one is a
  // lit sphere — gradient plus a warm rim — so it holds its shape and stays
  // legibly gold against the slate fill.
  hudCoin(ctx, w, h) {
    const r = Math.min(w, h) / 2;
    const g = ctx.createRadialGradient(w * 0.36, h * 0.32, r * 0.15, w * 0.5, h * 0.5, r);
    g.addColorStop(0, '#ffe07a');
    g.addColorStop(1, '#f0b419');
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, r - r / 12, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#d99a10';
    ctx.lineWidth = r / 6;
    ctx.stroke();
  },
  capShield(ctx, w, h) {
    const u = Math.max(w, h);
    fineShape(ctx, '#48a8f0', u, (c) => {
      c.moveTo(w * 0.5, h * 0.04);
      c.lineTo(w * 0.92, h * 0.24);
      c.quadraticCurveTo(w * 0.92, h * 0.8, w * 0.5, h * 0.98);
      c.quadraticCurveTo(w * 0.08, h * 0.8, w * 0.08, h * 0.24);
      c.closePath();
    });
    plain(ctx, '#d8f0ff', (c) => { c.moveTo(w * 0.5, h * 0.2); c.lineTo(w * 0.74, h * 0.32); c.quadraticCurveTo(w * 0.72, h * 0.66, w * 0.5, h * 0.78); c.closePath(); });
  },
  capMagnet(ctx, w, h) {
    const u = Math.max(w, h);
    fineShape(ctx, '#e04848', u, (c) => {
      c.arc(w * 0.5, h * 0.52, w * 0.4, Math.PI, 0);
      c.lineTo(w * 0.9, h * 0.76); c.lineTo(w * 0.62, h * 0.76);
      c.lineTo(w * 0.62, h * 0.52);
      c.arc(w * 0.5, h * 0.52, w * 0.12, 0, Math.PI, true);
      c.lineTo(w * 0.38, h * 0.76); c.lineTo(w * 0.1, h * 0.76);
      c.closePath();
    });
    plain(ctx, '#c8d8e8', (c) => { rr(c, w * 0.1, h * 0.76, w * 0.28, h * 0.2, w * 0.04); rr(c, w * 0.62, h * 0.76, w * 0.28, h * 0.2, w * 0.04); });
  },
  capStar(ctx, w, h) {
    const u = Math.max(w, h);
    fineShape(ctx, '#f6d33c', u, (c) => star(c, w / 2, h * 0.52, w * 0.48, w * 0.2, 5));
    plain(ctx, '#fff8c0', (c) => star(c, w / 2, h * 0.5, w * 0.22, w * 0.09, 5));
  },
  capAirJump(ctx, w, h) {
    const u = Math.max(w, h);
    fineShape(ctx, '#72d8f0', u, (c) => { c.moveTo(w * 0.5, h * 0.04); c.lineTo(w * 0.92, h * 0.84); c.lineTo(w * 0.5, h * 0.68); c.lineTo(w * 0.08, h * 0.84); c.closePath(); });
    plain(ctx, '#e8fbff', (c) => { c.moveTo(w * 0.5, h * 0.22); c.lineTo(w * 0.7, h * 0.62); c.lineTo(w * 0.5, h * 0.54); c.lineTo(w * 0.3, h * 0.62); c.closePath(); });
  },
  capSpeed(ctx, w, h) {
    const u = Math.max(w, h);
    fineShape(ctx, '#f89048', u, (c) => { c.moveTo(w * 0.16, h * 0.2); c.lineTo(w * 0.62, h * 0.2); c.lineTo(w * 0.46, h * 0.48); c.lineTo(w * 0.84, h * 0.48); c.lineTo(w * 0.28, h * 0.9); c.lineTo(w * 0.42, h * 0.6); c.lineTo(w * 0.1, h * 0.6); c.closePath(); });
    plain(ctx, '#fff0c8', (c) => { c.moveTo(w * 0.48, h * 0.3); c.lineTo(w * 0.66, h * 0.3); c.lineTo(w * 0.5, h * 0.5); c.lineTo(w * 0.32, h * 0.5); c.closePath(); });
  },
  capLowGrav(ctx, w, h) {
    const u = Math.max(w, h);
    fineShape(ctx, '#b888f0', u, (c) => c.arc(w / 2, h / 2, w * 0.44, 0, Math.PI * 2));
    plain(ctx, '#5c3c98', (c) => c.arc(w * 0.6, h * 0.46, w * 0.24, 0, Math.PI * 2));
    plain(ctx, '#f4e8ff', (c) => { c.arc(w * 0.27, h * 0.28, w * 0.08, 0, Math.PI * 2); c.arc(w * 0.35, h * 0.68, w * 0.05, 0, Math.PI * 2); });
  },
  capUnpeel(ctx, w, h) {
    // the potato that cannot be peeled: humble spud, unreasonable aura
    const u = Math.max(w, h);
    stroke(ctx, '#e8e8f0', Math.max(0.5, w * 0.09), (c) => c.ellipse(w * 0.5, h * 0.5, w * 0.45, h * 0.45, 0, 0, Math.PI * 2));
    fineShape(ctx, '#c89058', u, (c) => c.ellipse(w * 0.5, h * 0.54, w * 0.34, h * 0.28, 0.3, 0, Math.PI * 2));
    plain(ctx, '#8a6038', (c) => {
      c.ellipse(w * 0.38, h * 0.46, w * 0.07, h * 0.06, 0, 0, Math.PI * 2);
      c.ellipse(w * 0.62, h * 0.62, w * 0.06, h * 0.05, 0, 0, Math.PI * 2);
    });
  },
  capRelay(ctx, w, h) {
    // A relay baton, lit. Pink body rather than gold so it cannot be mistaken
    // for the score star at 8px; the gold spark at the tip is the tell that it
    // is a charge and not just another capsule.
    const u = Math.max(w, h);
    fineShape(ctx, '#f890b8', u, (c) => rr(c, w * 0.24, h * 0.12, w * 0.52, h * 0.62, w * 0.26));
    plain(ctx, '#ffd8e8', (c) => rr(c, w * 0.36, h * 0.24, w * 0.16, h * 0.34, w * 0.08));
    plain(ctx, '#f6d33c', (c) => star(c, w * 0.5, h * 0.78, w * 0.3, w * 0.12, 4));
  },
  appliance(ctx, w, h, frame = 0, finish = null) {
    const u = Math.max(w, h);
    const fineShape = (fill, pathFn) => {
      ctx.beginPath(); pathFn(ctx);
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = 'rgba(55,35,12,0.22)';
      ctx.lineWidth = Math.max(0.24, u * 0.015);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.stroke();
    };
    const wingShape = (fill, pathFn) => {
      ctx.beginPath(); pathFn(ctx);
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = 'rgba(64,61,78,0.4)';
      ctx.lineWidth = Math.max(0.34, u * 0.02);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.stroke();
    };

    // Build in the reference's three-quarter view, then flip the complete
    // construction so its body, lever and unequal wings all travel rightward.
    ctx.save();
    // The 24x20 pickup reserves its top four pixels for the toast launch.
    // Compress the appliance construction back to its intended 24x16 body and
    // bottom-anchor it inside that taller transparent canvas.
    ctx.translate(0, h * 0.2);
    ctx.scale(1, 0.8);
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    // Pitch the complete appliance toward its front-right corner. Because the
    // authored construction is mirrored, this slight counter-clockwise local
    // roll appears clockwise on screen: the near-right corner sits lower.
    ctx.translate(w * 0.5, h * 0.5);
    ctx.rotate(-0.065);
    ctx.translate(-w * 0.5, -h * 0.5);
    const phase = (frame % 12) * Math.PI / 6;
    const lift = Math.cos(phase);
    const sweep = Math.sin(phase);
    // Toast runs on its own four-second cycle, offset from the quick wing flap.
    const toastBand = Math.floor((frame % 96) / 12);
    const toastPhase = (frame % 96) * Math.PI / 48 + Math.PI / 6;
    // Spend most of the slow cycle raised, dip fully into the slot only
    // briefly, then return. Frame zero starts visibly raised in static views.
    // Band three is reserved for genuinely toastless appliances.  Previously
    // it merely landed near the bottom of the animation curve, which still
    // left a small slice visible on most wing frames.
    const toastOpen = toastBand === 3 ? 0
      : Math.pow(Math.max(0, 0.5 + Math.cos(toastPhase) * 0.5), 0.35);
    const toastRise = h * 0.48 * toastOpen;
    const toastSway = w * 0.002 * Math.sin(toastPhase);

    // Small rear wing tucked behind the toaster's top shoulder.
    ctx.save();
    ctx.translate(w * 0.34, h * 0.44);
    // This wing extends left in the authored view, so its hinge rotation must
    // oppose the foreground wing for both tips to rise and fall together.
    ctx.rotate(0.28 + lift * 0.26 - sweep * 0.02);
    ctx.scale(1.08, 1.08);
    wingShape('#d5d4dc', (c) => {
      c.moveTo(0, h * 0.08);
      c.bezierCurveTo(-w * 0.1, -h * 0.01, -w * 0.22, -h * 0.03, -w * 0.29, h * 0.01);
      c.quadraticCurveTo(-w * 0.22, h * 0.11, -w * 0.15, h * 0.11);
      c.quadraticCurveTo(-w * 0.11, h * 0.19, -w * 0.05, h * 0.15);
      c.closePath();
    });
    stroke(ctx, '#9999a8', Math.max(0.24, u * 0.014), (c) => {
      c.moveTo(-w * 0.25, h * 0.025); c.quadraticCurveTo(-w * 0.12, h * 0.06, 0, h * 0.1);
      c.moveTo(-w * 0.17, h * 0.035); c.lineTo(-w * 0.08, h * 0.135);
    });
    ctx.restore();

    // Flat reference construction: one narrow side plane, one broad face and
    // one sloped cap. Avoid a separate round centre panel.
    fineShape(finish?.back || '#a97816', (c) => {
      c.moveTo(w * 0.16, h * 0.36);
      c.quadraticCurveTo(w * 0.17, h * 0.35, w * 0.2, h * 0.36);
      c.lineTo(w * 0.31, h * 0.39);
      c.lineTo(w * 0.32, h * 0.92);
      c.lineTo(w * 0.21, h * 0.9);
      c.quadraticCurveTo(w * 0.16, h * 0.88, w * 0.16, h * 0.82);
      c.lineTo(w * 0.16, h * 0.36);
      c.closePath();
    });
    fineShape(finish?.side || '#f4c934', (c) => {
      c.moveTo(w * 0.31, h * 0.39);
      c.lineTo(w * 0.74, h * 0.35);
      c.quadraticCurveTo(w * 0.8, h * 0.34, w * 0.8, h * 0.41);
      c.lineTo(w * 0.79, h * 0.81);
      c.quadraticCurveTo(w * 0.79, h * 0.86, w * 0.73, h * 0.88);
      c.lineTo(w * 0.36, h * 0.92);
      c.quadraticCurveTo(w * 0.32, h * 0.92, w * 0.32, h * 0.88);
      c.lineTo(w * 0.31, h * 0.39);
      c.closePath();
    });
    fineShape(finish?.top || '#ffe16a', (c) => {
      c.moveTo(w * 0.17, h * 0.36);
      c.lineTo(w * 0.31, h * 0.28);
      c.quadraticCurveTo(w * 0.32, h * 0.27, w * 0.35, h * 0.27);
      c.lineTo(w * 0.68, h * 0.27);
      c.quadraticCurveTo(w * 0.7, h * 0.27, w * 0.72, h * 0.29);
      c.lineTo(w * 0.79, h * 0.34);
      c.quadraticCurveTo(w * 0.8, h * 0.36, w * 0.77, h * 0.36);
      c.lineTo(w * 0.35, h * 0.39);
      c.quadraticCurveTo(w * 0.32, h * 0.4, w * 0.3, h * 0.38);
      c.closePath();
    });
    stroke(ctx, 'rgba(178,124,22,0.55)', Math.max(0.2, u * 0.011), (c) => {
      c.moveTo(w * 0.35, h * 0.39);
      c.lineTo(w * 0.77, h * 0.36);
    });

    // The ejector lives on the narrow side plane. Its thumb rises as the
    // independent toast cycle opens, making the mechanism legible without the
    // old floating knob.
    stroke(ctx, '#6e4518', Math.max(0.26, u * 0.014), (c) => {
      c.moveTo(w * 0.235, h * 0.49);
      c.lineTo(w * 0.235, h * 0.74);
    });
    const sliderY = h * (0.67 - toastOpen * 0.13);
    fineShape('#4a2b12', (c) => rr(c, w * 0.19, sliderY, w * 0.09, h * 0.07, w * 0.022));

    // A very small travelling gleam keeps the collectible feeling prized
    // without competing with the toast or feather animation.
    const glimmer = Math.max(0, Math.sin(toastPhase * 2 - 0.45));
    ctx.save();
    ctx.globalAlpha = 0.22 + glimmer * 0.62;
    plain(ctx, '#fff8c8', (c) => star(c, w * 0.67, h * 0.56, w * (0.012 + glimmer * 0.014), w * 0.005, 4));
    ctx.restore();

    // Clip the full square slice at the slot line: at the bottom of its slow
    // cycle it is genuinely inside the casing; at the top it rises almost
    // completely clear. The tiny lateral settle keeps all 96 poses distinct.
    ctx.save();
    ctx.translate(w * 0.5, h * 0.325);
    ctx.rotate(-0.07);
    ctx.translate(-w * 0.5, -h * 0.325);
    ctx.beginPath();
    ctx.rect(0, -h, w, h * 1.335);
    ctx.clip();
    ctx.translate(toastSway, -toastRise);
    // A slight shear makes the slice lean toward the visible right-side plane
    // while its lower edge remains aligned with the slot.
    ctx.transform(1, 0, 0.07, 1, -h * 0.021, 0);
    fineShape('#93602a', (c) => rr(c, w * 0.385, h * 0.345, w * 0.23, h * 0.345, w * 0.03));
    plain(ctx, '#d9a84f', (c) => rr(c, w * 0.415, h * 0.38, w * 0.17, h * 0.275, w * 0.022));
    ctx.restore();

    // One clean recessed opening; the dark capsule carries enough depth
    // without an extra metallic rim competing with the toast.
    ctx.save();
    ctx.translate(w * 0.5, h * 0.325);
    ctx.rotate(-0.07);
    ctx.translate(-w * 0.5, -h * 0.325);
    plain(ctx, '#4a2b12', (c) => rr(c, w * 0.36, h * 0.309, w * 0.28, h * 0.036, h * 0.016));
    ctx.restore();

    // Large foreground wing wraps across the side. Separate feather tips make
    // the wing survive reduction without reverting to a thick dark outline.
    ctx.save();
    ctx.translate(w * 0.57, h * 0.52);
    ctx.rotate(-0.08 - lift * 0.31 + sweep * 0.025);
    ctx.scale(1.08, 1.08);
    wingShape('#f6f5fa', (c) => {
      c.moveTo(-w * 0.05, -h * 0.06);
      c.bezierCurveTo(w * 0.08, -h * 0.14, w * 0.21, -h * 0.15, w * 0.36, -h * 0.11);
      c.quadraticCurveTo(w * 0.4, -h * 0.04, w * 0.34, h * 0.015);
      c.quadraticCurveTo(w * 0.39, h * 0.08, w * 0.31, h * 0.12);
      c.quadraticCurveTo(w * 0.34, h * 0.2, w * 0.25, h * 0.2);
      c.quadraticCurveTo(w * 0.23, h * 0.28, w * 0.14, h * 0.23);
      c.quadraticCurveTo(w * 0.08, h * 0.29, w * 0.02, h * 0.18);
      c.closePath();
    });
    stroke(ctx, '#aaaab8', Math.max(0.24, u * 0.014), (c) => {
      c.moveTo(-w * 0.02, h * 0.02); c.quadraticCurveTo(w * 0.17, h * 0.02, w * 0.34, -h * 0.08);
      c.moveTo(w * 0.1, h * 0.04); c.lineTo(w * 0.31, h * 0.1);
      c.moveTo(w * 0.08, h * 0.08); c.lineTo(w * 0.24, h * 0.19);
      c.moveTo(w * 0.04, h * 0.1); c.lineTo(w * 0.14, h * 0.23);
    });
    ctx.restore();

    ctx.restore();
  },
  cord(ctx, w, h) {
    const u = Math.max(w, h);
    const fineShape = (fill, pathFn) => {
      ctx.beginPath(); pathFn(ctx);
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = 'rgba(26,16,40,0.28)';
      ctx.lineWidth = Math.max(0.28, u * 0.02);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.stroke();
    };
    // A loose extension-cord S: dark edging keeps the thin cable intact over
    // bright stages, while the orange centre distinguishes it from fuse wire.
    const cable = (c) => {
      c.moveTo(w * 0.18, h * 0.3);
      c.bezierCurveTo(w * 0.38, h * 0.22, w * 0.3, h * 0.8, w * 0.54, h * 0.72);
      c.bezierCurveTo(w * 0.73, h * 0.66, w * 0.64, h * 0.3, w * 0.82, h * 0.42);
    };
    stroke(ctx, 'rgba(26,16,40,0.4)', Math.max(1, h * 0.16), cable);
    stroke(ctx, '#e07820', Math.max(0.62, h * 0.085), cable);

    // Male plug at left, female socket at right. Their opposite faces make a
    // single fragment read as something that can reconnect into a longer cord.
    fineShape('#d8d8e4', (c) => rr(c, w * 0.04, h * 0.14, w * 0.17, h * 0.3, h * 0.07));
    plain(ctx, '#6a6a78', (c) => {
      rr(c, 0, h * 0.19, w * 0.055, h * 0.055, h * 0.015);
      rr(c, 0, h * 0.33, w * 0.055, h * 0.055, h * 0.015);
    });
    fineShape('#707080', (c) => rr(c, w * 0.78, h * 0.27, w * 0.2, h * 0.34, h * 0.09));
    plain(ctx, '#242430', (c) => {
      c.ellipse(w * 0.845, h * 0.44, w * 0.018, h * 0.035, 0, 0, Math.PI * 2);
      c.ellipse(w * 0.92, h * 0.44, w * 0.018, h * 0.035, 0, 0, Math.PI * 2);
    });
    plain(ctx, '#fff', (c) => c.ellipse(w * 0.815, h * 0.33, w * 0.018, h * 0.025, 0, 0, Math.PI * 2));
  },
  fuse(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#d8b088', u, (c) => rr(c, w * 0.14, h * 0.24, w * 0.72, h * 0.56, h * 0.2));
    plain(ctx, '#8a8a98', (c) => { rr(c, w * 0.02, h * 0.34, w * 0.16, h * 0.34, h * 0.06); rr(c, w * 0.82, h * 0.34, w * 0.16, h * 0.34, h * 0.06); });
    stroke(ctx, '#e04848', Math.max(0.5, h * 0.12), (c) => { c.moveTo(w * 0.28, h * 0.52); c.lineTo(w * 0.72, h * 0.52); });
  },
  boostPad(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#f6d33c', u, (c) => rr(c, 0, h * 0.1, w, h * 0.8, h * 0.35));
    plain(ctx, '#e07820', (c) => {
      for (let i = 0; i < 3; i++) {
        const x = w * (0.16 + i * 0.26);
        c.moveTo(x, h * 0.24); c.lineTo(x + w * 0.16, h * 0.5); c.lineTo(x, h * 0.76); c.closePath();
      }
    });
  },
  target(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#fff', u, (c) => c.arc(w / 2, h / 2, w * 0.46, 0, Math.PI * 2));
    plain(ctx, '#e04848', (c) => c.arc(w / 2, h / 2, w * 0.32, 0, Math.PI * 2));
    plain(ctx, '#fff', (c) => c.arc(w / 2, h / 2, w * 0.18, 0, Math.PI * 2));
    plain(ctx, '#e04848', (c) => c.arc(w / 2, h / 2, w * 0.08, 0, Math.PI * 2));
  },
  // --- scenery / villains ----------------------------------------------
  portal(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, 'rgba(72,224,200,0.28)', u, (c) => c.ellipse(w / 2, h / 2, w * 0.44, h * 0.48, 0, 0, Math.PI * 2));
    stroke(ctx, '#48e0c8', Math.max(0.7, w * 0.16), (c) => c.ellipse(w / 2, h / 2, w * 0.36, h * 0.42, 0, 0, Math.PI * 2));
    stroke(ctx, '#c8fff0', Math.max(0.5, w * 0.07), (c) => c.ellipse(w * 0.42, h * 0.4, w * 0.16, h * 0.2, -0.4, 0.6, 2.4));
  },
  eggshell(ctx, w, h) {
    const u = Math.max(w, h);
    // Don K. Eggshell: giant egg ape, red mustache, goggles, spiky shell
    shape(ctx, '#e8e0c8', u, (c) => c.ellipse(w * 0.5, h * 0.56, w * 0.34, h * 0.42, 0, 0, Math.PI * 2));
    shape(ctx, '#8a6a4a', u, (c) => { // shell back with spikes
      c.moveTo(w * 0.2, h * 0.7);
      for (let i = 0; i < 4; i++) {
        const x = w * (0.16 + i * 0.1);
        c.lineTo(x + w * 0.05, h * (0.34 - (i % 2) * 0.06));
        c.lineTo(x + w * 0.1, h * 0.62);
      }
      c.closePath();
    });
    plain(ctx, '#f2c9a0', (c) => c.ellipse(w * 0.56, h * 0.5, w * 0.2, h * 0.2, 0, 0, Math.PI * 2)); // face
    plain(ctx, '#c8e0f8', (c) => { c.ellipse(w * 0.5, h * 0.44, w * 0.07, h * 0.07, 0, 0, Math.PI * 2); c.ellipse(w * 0.64, h * 0.44, w * 0.07, h * 0.07, 0, 0, Math.PI * 2); });
    plain(ctx, '#1a1028', (c) => { c.arc(w * 0.5, h * 0.44, w * 0.03, 0, Math.PI * 2); c.arc(w * 0.64, h * 0.44, w * 0.03, 0, Math.PI * 2); });
    plain(ctx, '#c83030', (c) => { // magnificent mustache
      c.moveTo(w * 0.42, h * 0.58);
      c.quadraticCurveTo(w * 0.57, h * 0.5, w * 0.74, h * 0.58);
      c.quadraticCurveTo(w * 0.58, h * 0.68, w * 0.42, h * 0.58);
      c.closePath();
    });
  },
  dustdevil(ctx, w, h) {
    const u = Math.max(w, h);
    const fineShape = (fill, pathFn) => {
      ctx.beginPath(); pathFn(ctx);
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = 'rgba(35,23,38,0.27)';
      ctx.lineWidth = Math.max(0.18, u * 0.012);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
    };
    const detailLine = Math.max(0.16, u * 0.009);

    // A real upright-vacuum silhouette: loop grip and steel spine first, then
    // the bag/chamber, motor pod and a wide floor nozzle.
    stroke(ctx, '#3a3040', Math.max(0.34, u * 0.025), (c) => {
      c.moveTo(w * 0.41, h * 0.52);
      c.lineTo(w * 0.61, h * 0.14);
      c.quadraticCurveTo(w * 0.64, h * 0.08, w * 0.7, h * 0.07);
      c.lineTo(w * 0.79, h * 0.07);
    });
    stroke(ctx, '#aeb2bc', Math.max(0.17, u * 0.011), (c) => {
      c.moveTo(w * 0.42, h * 0.51);
      c.lineTo(w * 0.625, h * 0.145);
      c.quadraticCurveTo(w * 0.65, h * 0.1, w * 0.7, h * 0.095);
      c.lineTo(w * 0.785, h * 0.095);
    });
    fineShape('#8f2630', (c) => rr(c, w * 0.73, h * 0.035, w * 0.18, h * 0.09, w * 0.035));

    // Flexible hose loops from the motor up the spine—a strong appliance cue
    // that is quieter and more believable than the old floating plug.
    stroke(ctx, '#4b4650', Math.max(0.24, u * 0.017), (c) => {
      c.moveTo(w * 0.59, h * 0.72);
      c.bezierCurveTo(w * 0.88, h * 0.61, w * 0.79, h * 0.27, w * 0.64, h * 0.21);
    });
    stroke(ctx, '#777783', Math.max(0.1, u * 0.006), (c) => {
      c.moveTo(w * 0.59, h * 0.72);
      c.bezierCurveTo(w * 0.85, h * 0.6, w * 0.76, h * 0.3, w * 0.64, h * 0.22);
    });

    // Tapered dust chamber hangs from the spine instead of reading as a
    // featureless rounded box.
    fineShape('#9e2028', (c) => {
      c.moveTo(w * 0.3, h * 0.27);
      c.quadraticCurveTo(w * 0.32, h * 0.23, w * 0.38, h * 0.23);
      c.lineTo(w * 0.52, h * 0.27);
      c.lineTo(w * 0.59, h * 0.67);
      c.quadraticCurveTo(w * 0.57, h * 0.72, w * 0.5, h * 0.73);
      c.lineTo(w * 0.3, h * 0.7);
      c.quadraticCurveTo(w * 0.26, h * 0.68, w * 0.27, h * 0.62);
      c.closePath();
    });
    plain(ctx, '#c93a3e', (c) => {
      c.moveTo(w * 0.32, h * 0.29);
      c.lineTo(w * 0.39, h * 0.27);
      c.lineTo(w * 0.43, h * 0.66);
      c.lineTo(w * 0.32, h * 0.65);
      c.closePath();
    });
    // An amber beacon sits physically above the chamber, away from the face.
    plain(ctx, 'rgba(246,211,60,0.24)', (c) => rr(c, w * 0.325, h * 0.19, w * 0.075, h * 0.065, h * 0.02));
    fineShape('#f6d33c', (c) => rr(c, w * 0.337, h * 0.2, w * 0.052, h * 0.048, h * 0.016));

    // A quiet pair of cartoon eyes sits directly on the red chamber. Small,
    // close-set ovals with no sockets or outline register on a second look
    // instead of turning the whole appliance into a face.
    plain(ctx, '#f4eee4', (c) => {
      c.ellipse(w * 0.416, h * 0.408, w * 0.023, h * 0.032, -0.05, 0, Math.PI * 2);
      c.ellipse(w * 0.472, h * 0.41, w * 0.023, h * 0.032, 0.05, 0, Math.PI * 2);
    });
    plain(ctx, '#26313d', (c) => {
      c.ellipse(w * 0.423, h * 0.414, w * 0.0085, h * 0.012, 0, 0, Math.PI * 2);
      c.ellipse(w * 0.479, h * 0.416, w * 0.0085, h * 0.012, 0, 0, Math.PI * 2);
    });

    // Low motor housing bridges the tall chamber to the cleaning head.
    fineShape('#be3036', (c) => {
      c.moveTo(w * 0.18, h * 0.66);
      c.quadraticCurveTo(w * 0.2, h * 0.61, w * 0.29, h * 0.61);
      c.lineTo(w * 0.58, h * 0.63);
      c.quadraticCurveTo(w * 0.67, h * 0.65, w * 0.7, h * 0.74);
      c.lineTo(w * 0.69, h * 0.82);
      c.lineTo(w * 0.16, h * 0.82);
      c.closePath();
    });
    plain(ctx, '#e05252', (c) => rr(c, w * 0.23, h * 0.65, w * 0.28, h * 0.045, h * 0.018));

    // Broad wedge-shaped floor head and dark brush lip finish the read.
    fineShape('#8f1c25', (c) => {
      c.moveTo(w * 0.08, h * 0.835);
      c.lineTo(w * 0.74, h * 0.825);
      c.lineTo(w * 0.89, h * 0.9);
      c.quadraticCurveTo(w * 0.9, h * 0.95, w * 0.84, h * 0.96);
      c.lineTo(w * 0.06, h * 0.96);
      c.quadraticCurveTo(w * 0.02, h * 0.94, w * 0.04, h * 0.88);
      c.closePath();
    });
    plain(ctx, '#c9363d', (c) => {
      c.moveTo(w * 0.1, h * 0.845); c.lineTo(w * 0.72, h * 0.84);
      c.lineTo(w * 0.8, h * 0.88); c.lineTo(w * 0.08, h * 0.89); c.closePath();
    });
    plain(ctx, '#4b2730', (c) => rr(c, w * 0.06, h * 0.92, w * 0.79, h * 0.035, h * 0.014));
    // Its small transport wheels are recessed under the head; showing them
    // here adds two face-like circles without strengthening the vacuum read.
    stroke(ctx, 'rgba(238,108,108,0.65)', detailLine, (c) => {
      c.moveTo(w * 0.19, h * 0.9); c.lineTo(w * 0.68, h * 0.89);
    });
  },
  // PLUG_ICONS[1], the CHALLENGE plug. This is never a world prop: it is only
  // ever drawn at size-3 of the plug box — 10x10 in the stage-select list,
  // 8x8 in the in-run HUD, 5x5 in the Trophy Room's level records — and it
  // spends most of its life at ALPHA_EMPTY (0.22), because an unearned
  // challenge is the default state. Everything here is decided at those sizes.
  //
  // The previous drawing had no handles, so its silhouette was a tulip rather
  // than a trophy; a straight rim, so the top read as a lid; and no contour at
  // all on the stem and base, so against the plug tile's #181820 fill the foot
  // dissolved and the cup floated. The wide-narrow-wide profile below is what
  // the eye actually reads as "trophy" once the detail is gone at 5px.
  plugTrophy(ctx, w, h) {
    PROP_PAINTERS.plugTrophyAt(ctx, w, h, TROPHY_HANDLE_SPREAD);
  },
  // The trophy, with the handle reach as a parameter so it can be tuned against
  // the sizes it actually renders at. Everything else is fixed.
  plugTrophyAt(ctx, w, h, spread = TROPHY_HANDLE_SPREAD) {
    const u = Math.max(w, h);
    // Handles go down FIRST, behind the bowl, so their join is covered rather
    // than seamed — a seam is the first thing to break up at 8 pixels. Open
    // loops rather than solid ears: the hole does close at the smallest size,
    // but the round outer sweep still reads as a handle where a triangle reads
    // as a chip out of the rim.
    //
    // `spread` is how far the widest point of the loop sits from the centre, as
    // a fraction of the box. The bowl's own half-width is 0.26, so this is the
    // ratio that decides whether the handles look like part of the cup or like
    // a pair of wings bolted to it — and the stroke adds another half-linewidth
    // outside whatever it is set to.
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#8f9db2';
    ctx.lineWidth = Math.max(0.32, u * TROPHY_HANDLE_WEIGHT);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(w * (0.5 + s * 0.23), h * 0.16);
      ctx.quadraticCurveTo(w * (0.5 + s * (spread + 0.04)), h * 0.17, w * (0.5 + s * spread), h * 0.32);
      ctx.quadraticCurveTo(w * (0.5 + s * (spread - 0.04)), h * 0.44, w * (0.5 + s * 0.13), h * 0.42);
      ctx.stroke();
    }
    ctx.restore();
    // Squat, wide bowl — short enough that the star has room without having to
    // narrow the base to find it.
    fineShape(ctx, trophySilver(ctx, w, h), u, (c) => {
      c.moveTo(w * 0.24, h * 0.1);
      c.lineTo(w * 0.76, h * 0.1);
      c.quadraticCurveTo(w * 0.72, h * 0.44, w * 0.5, h * 0.52);
      c.quadraticCurveTo(w * 0.28, h * 0.44, w * 0.24, h * 0.1);
      c.closePath();
    }, TROPHY_INK, 0.028);
    // Rim band. The one horizontal that stops the top edge reading as a lid.
    plain(ctx, '#f6faff', (c) => rr(c, w * 0.25, h * 0.1, w * 0.5, h * 0.065, h * 0.028));
    // Dark star, not light: on a metal bowl the punched-out read carries much
    // further down than an embossed one, which just goes the colour of the rim
    // highlight and vanishes.
    plain(ctx, 'rgba(30,40,58,0.62)', (c) => star(c, w * 0.5, h * 0.27, u * 0.145, u * 0.06, 5));
    // Stem and a two-tier plinth, each with the same contour as the bowl so the
    // foot stays a separate object on a dark tile instead of dissolving.
    fineShape(ctx, '#a3aec0', u, (c) => rr(c, w * 0.44, h * 0.5, w * 0.12, h * 0.16, w * 0.03), TROPHY_INK, 0.026);
    fineShape(ctx, '#c3cddd', u, (c) => rr(c, w * 0.28, h * 0.64, w * 0.44, h * 0.11, w * 0.035), TROPHY_INK, 0.026);
    fineShape(ctx, '#8593a8', u, (c) => rr(c, w * 0.18, h * 0.75, w * 0.64, h * 0.16, w * 0.05), TROPHY_INK, 0.026);
  },
  // Handle-reach candidates, kept ONLY for the gallery's spread bake-off. They
  // exist because the icon lives at 5-10px and the reach cannot be judged at any
  // other size. Delete them with that section once a value is pinned.
  plugTrophyWide(ctx, w, h) { PROP_PAINTERS.plugTrophyAt(ctx, w, h, 0.44); },   // as shipped before this pass
  plugTrophyTight(ctx, w, h) { PROP_PAINTERS.plugTrophyAt(ctx, w, h, 0.30); },
  // The pre-bake-off trophy, kept ONLY so the gallery's was/is section can show
  // what changed. Nothing in the game references it; delete it with that
  // section once the new one is pinned.
  plugTrophyLegacy(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#f6d33c', u, (c) => {
      c.moveTo(w * 0.24, h * 0.08); c.lineTo(w * 0.76, h * 0.08);
      c.quadraticCurveTo(w * 0.72, h * 0.56, w * 0.5, h * 0.6);
      c.quadraticCurveTo(w * 0.28, h * 0.56, w * 0.24, h * 0.08);
      c.closePath();
    });
    plain(ctx, '#c8a020', (c) => { rr(c, w * 0.42, h * 0.58, w * 0.16, h * 0.22, w * 0.03); rr(c, w * 0.26, h * 0.8, w * 0.48, h * 0.16, w * 0.05); });
  },

  // PLUG_ICONS[2], the TOASTER plug. HUD-only art, and deliberately NOT the
  // `appliance` world prop above — the same split as hudCoin/coin and
  // cellFull/battery, for the same reason.
  //
  // The world appliance cannot serve as this icon. It reserves the top fifth
  // of its box for the toast launch and bottom-anchors the body in what is
  // left, so in an 8x8 plug tile the toaster itself only ever got 8x6.4. Worse,
  // the plug row calls drawProp with no frame, so it always drew frame 0 — and
  // frame 0 is authored to start with the toast visibly raised, which meant the
  // icon was a squashed toaster with a slice sticking out of the top of it.
  // Dropping the toast returns that reserved fifth to the body, which is
  // exactly the weight it was missing next to the trophy.
  //
  // Front-on rather than the world prop's three-quarter view: at 8px the
  // receding side plane is one ambiguous pixel column, and spending it on the
  // body instead buys the slot enough width to actually read.
  plugToaster(ctx, w, h) {
    const u = Math.max(w, h);
    const g = ctx.createLinearGradient(w * 0.15, 0, w * 0.9, h);
    g.addColorStop(0, '#f7cf62');
    g.addColorStop(0.45, '#dfa523');
    g.addColorStop(1, '#8a5f0e');
    // Feet first, so the body's contour closes over the top of them.
    plain(ctx, '#5a3c08', (c) => {
      rr(c, w * 0.18, h * 0.8, w * 0.17, h * 0.15, w * 0.04);
      rr(c, w * 0.65, h * 0.8, w * 0.17, h * 0.15, w * 0.04);
    });
    // Body fills the box. This is a HUD icon, not something standing in a
    // lane, so there is no ground line to leave headroom for.
    fineShape(ctx, g, u, (c) => rr(c, w * 0.06, h * 0.14, w * 0.88, h * 0.72, w * 0.15),
      'rgba(58,36,4,0.55)', 0.03);
    // Chrome top lip, directly analogous to the trophy's rim band: one bright
    // horizontal hard against the top edge. This is what stopped the trophy
    // reading as a flat lid and it does the same job here — a gradient alone
    // has no EDGE in it, so the body stayed a plain lozenge no matter how much
    // tone was in the fill.
    plain(ctx, '#fff0b8', (c) => rr(c, w * 0.11, h * 0.163, w * 0.78, h * 0.055, h * 0.025));
    // The slot. One dark horizontal below the lip carries the entire toaster
    // read — without it this icon is a box with a knob.
    plain(ctx, 'rgba(46,28,4,0.85)', (c) => rr(c, w * 0.19, h * 0.245, w * 0.62, h * 0.105, w * 0.045));
    // Specular pair down the lit cheek: one broad streak and one thin one
    // beside it. Two marks rather than one because a single soft band reads as
    // a smudge, where a wide-then-narrow pair reads as a curved metal face
    // catching the light — the same trick as the trophy's bowl streak.
    plain(ctx, 'rgba(255,246,214,0.6)', (c) => rr(c, w * 0.145, h * 0.44, w * 0.085, h * 0.3, w * 0.04));
    plain(ctx, 'rgba(255,246,214,0.3)', (c) => rr(c, w * 0.255, h * 0.47, w * 0.042, h * 0.25, w * 0.02));
    // Shadowed lower tier, so the body has a lit half and a dark half instead
    // of one even ramp. The trophy gets this from its plinth being a separate
    // darker shape; a single-volume toaster has to be given it.
    plain(ctx, 'rgba(58,36,4,0.32)', (c) => rr(c, w * 0.1, h * 0.72, w * 0.8, h * 0.11, w * 0.04));
    // Lever breaks the right silhouette so the box has one asymmetric tell at
    // any size, and carries its own nick of highlight so it reads as the same
    // metal rather than a sticker.
    fineShape(ctx, '#e8ae2c', u, (c) => rr(c, w * 0.82, h * 0.44, w * 0.15, h * 0.22, w * 0.05),
      'rgba(58,36,4,0.55)', 0.028);
    plain(ctx, 'rgba(255,246,214,0.55)', (c) => rr(c, w * 0.845, h * 0.47, w * 0.05, h * 0.1, w * 0.02));
  },
  // SUPERSEDED by plugOrder, and kept only so the gallery's was/is row can show
  // what the MISSION slot used to be. Not referenced by PLUG_ICONS any more.
  // Delete it alongside that gallery section.
  //
  // It was never a legibility failure — it is still the cleanest small-size
  // drawing in the set, and the notes below on why it beat the red-lever switch
  // and the plug head all still hold. It lost on MEANING: a wall socket is the
  // reward, and drawing the reward inside the column headed PLUGS made the row
  // read as one plug plus two other prizes. See plugOrder.
  //
  // The old icon it replaced spent three colours on three unrelated ideas: a
  // pale blue housing occupying only the bottom two thirds of the box, a red
  // lever at 0.14w — one pixel at HUD size — and a yellow knob the same colour
  // as the trophy sitting next to it. Nothing in it was bigger than its smallest
  // feature, which is backwards for an icon that has to survive 5x5.
  //
  // A wall socket, front-on: two slots over a round earth pin is the most
  // recognizable three-mark arrangement available, and it is the one thing in
  // the set that still resolves as three separate marks at 5px. Cream plate
  // rather than white so it sits below the trophy's rim highlight in value,
  // and cool-cream against the trophy's steel and the toaster's gold gives the
  // row three distinct hues before shape has to do any work.
  plugSocket(ctx, w, h) {
    const u = Math.max(w, h);
    fineShape(ctx, '#e6e3da', u, (c) => rr(c, w * 0.09, h * 0.05, w * 0.82, h * 0.9, w * 0.2),
      'rgba(30,22,14,0.5)', 0.03);
    plain(ctx, '#282420', (c) => {
      rr(c, w * 0.28, h * 0.2, w * 0.13, h * 0.32, w * 0.055);
      rr(c, w * 0.59, h * 0.2, w * 0.13, h * 0.32, w * 0.055);
    });
    plain(ctx, '#282420', (c) => c.arc(w * 0.5, h * 0.69, u * 0.115, 0, Math.PI * 2));
  },
  // PARKED, NOT DEAD. The runner-up for the MISSION slot: the mains plug
  // itself, prongs up, cord out of the bottom — the object the whole mechanic
  // is named after, and the only candidate that put a cool teal in the row.
  // plugSocket won on small-size legibility (three separate marks still resolve
  // at 5px, where these prongs merge), but this is kept whole and drawn in the
  // gallery so the choice can be revisited without redrawing it. Swap
  // PLUG_ICONS[0] to 'plugHead' and it ships as-is.
  plugHead(ctx, w, h) {
    const u = Math.max(w, h);
    // Prongs first so the body caps them cleanly.
    plain(ctx, '#cdd0dc', (c) => {
      rr(c, w * 0.28, h * 0.04, w * 0.13, h * 0.32, w * 0.045);
      rr(c, w * 0.59, h * 0.04, w * 0.13, h * 0.32, w * 0.045);
    });
    fineShape(ctx, '#48c8b0', u, (c) => rr(c, w * 0.14, h * 0.3, w * 0.72, h * 0.46, w * 0.15),
      'rgba(12,40,36,0.5)', 0.03);
    plain(ctx, 'rgba(230,255,248,0.5)', (c) => rr(c, w * 0.22, h * 0.37, w * 0.14, h * 0.26, w * 0.06));
    // Cord stub out of the bottom, which is what stops the body reading as a
    // plain lozenge once the prongs blur together.
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2f3a52';
    ctx.lineWidth = Math.max(0.4, u * 0.11);
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.74);
    ctx.quadraticCurveTo(w * 0.5, h * 0.9, w * 0.72, h * 0.93);
    ctx.stroke();
    ctx.restore();
  },

  // ---- MISSION-slot bake-off — A (plugOrder) WON, and ships ------------------
  // Why the socket was replaced at all: it draws the reward. The column is
  // headed PLUGS and the three icons say how each plug was earned, but slot 0
  // being a wall socket made the row read as one plug plus two other prizes
  // instead of three plugs earned three ways. The winner had to be the
  // ASSIGNMENT, not the payout.
  //
  // It also has to be generic. The mission is `reach` in only ten of the 27
  // stages — the rest are targets, cords, chase, rescue, onbeat, fuse, escape
  // and blackout — so a breaker switch depicts one mission in three. The trophy
  // beside it gets this right already: it stands for CHALLENGE, not for
  // coins-or-no-damage.
  //
  // All three candidates keep a cream or teal read so the row still separates by
  // hue before shape has to do any work, and none of them is thinner anywhere
  // than the socket's slots were — the 5px column in the Trophy Room records is
  // the gate, same as last time.

  // Candidate A, and the one that SHIPS as PLUG_ICONS[0]. Closest to the game's
  // own fiction — you clock in for a SHIFT and the briefing hands you the job —
  // and nobody looks at a clipboard and thinks they are collecting clipboards.
  //
  // Built on the same three-tier arrangement the socket won on: a mark at the
  // top, then two below it, with the tiers spaced like the socket's
  // slots-over-earth-pin rather than evenly. Cream board holds slot 0's existing
  // place in the row's hue plan, and the clip spends the cool teal the plug head
  // was liked for on the one feature that breaks the silhouette.
  plugOrder(ctx, w, h) {
    const u = Math.max(w, h);
    // Board inset at the top so the clip can sit proud of it.
    fineShape(ctx, '#e6e3da', u, (c) => rr(c, w * 0.095, h * 0.14, w * 0.81, h * 0.82, w * 0.17),
      'rgba(30,22,14,0.5)', 0.03);
    // Two ruled lines, not three. The board is barely five pixels tall in the
    // records row and a third line closes both gaps; the second runs short so
    // the pair reads as writing rather than as a grille.
    //
    // Thin and mid-tone rather than thick and near-black, which is the whole
    // difference between this reading as a board and reading as a device with a
    // screen in it. At 5px the two lines merge whatever they weigh — so they are
    // authored to merge into a soft grey TEXTURE on a still-cream board, not
    // into a black bar that takes over the tile. Same balance the socket keeps:
    // its three marks are small against a dominant plate. Below 8px the identity
    // is carried by hue and by the clip, which is what the row is designed for.
    plain(ctx, '#4a453e', (c) => {
      rr(c, w * 0.25, h * 0.42, w * 0.5, h * 0.105, w * 0.05);
      rr(c, w * 0.25, h * 0.63, w * 0.33, h * 0.105, w * 0.05);
    });
    // The clip, and the only thing crossing the top edge. This is the
    // asymmetric tell that keeps the icon off being a plain cream tile once the
    // ruled lines blur together — the same job the toaster's lever does on its
    // right-hand side.
    fineShape(ctx, '#48c8b0', u, (c) => rr(c, w * 0.28, h * 0.02, w * 0.44, h * 0.21, w * 0.07),
      'rgba(12,40,36,0.5)', 0.03);
    plain(ctx, 'rgba(230,255,248,0.5)', (c) => rr(c, w * 0.33, h * 0.06, w * 0.13, h * 0.09, w * 0.04));
  },

  // Candidate B: the finish flag. The most universal "this was the objective"
  // mark available, and the only candidate with an asymmetric silhouette — mass
  // in the top corner, pole below — which is a different kind of shape from the
  // trophy's centred cup and the toaster's filled box.
  //
  // Four cloth cells, never more: a 3x3 chequer at 5px is three pixels of
  // dither and reads as grey noise, where 2x2 keeps every cell a pixel and a
  // half on a side. Risk to judge in the 5px column is the opposite of the plug
  // head's — not marks merging, but the bottom third being bare pole, which is
  // the flaw the old switch icon had upside down.
  plugFlag(ctx, w, h) {
    const u = Math.max(w, h);
    // Pole full height, so the cloth has a hard vertical to hang off. A flag
    // without one is a rectangle.
    fineShape(ctx, '#48c8b0', u, (c) => rr(c, w * 0.12, h * 0.04, w * 0.15, h * 0.92, w * 0.055),
      'rgba(12,40,36,0.5)', 0.028);
    const cw = w * 0.33, ch = h * 0.3, cx = w * 0.25, cy = h * 0.1;
    fineShape(ctx, '#e6e3da', u, (c) => rr(c, cx, cy, cw * 2, ch * 2, w * 0.045),
      'rgba(30,22,14,0.5)', 0.03);
    // Dark cells on the diagonal. Drawn as plain rects inside the cream body so
    // the chequer never grows a contour of its own at size.
    plain(ctx, '#2b2a30', (c) => {
      c.rect(cx, cy, cw, ch);
      c.rect(cx + cw, cy + ch, cw, ch);
    });
    plain(ctx, 'rgba(230,255,248,0.45)', (c) => rr(c, w * 0.145, h * 0.12, w * 0.055, h * 0.3, w * 0.03));
  },

  // Candidate C: the objective marker. The safest of the three at 5px by
  // construction — concentric rings have no thin gaps to lose, so nothing here
  // is narrower than an eighth of the box and the icon cannot degrade into
  // fewer marks than it started with.
  //
  // The cost is flavour: it says "objective" in the abstract where the work
  // order says it in MASHENSTEIN's own voice. Also the only round silhouette in
  // the row, which cuts both ways — distinct from the toaster's box, but worth
  // checking against the trophy's bowl at 5px, and against hudCoin, which is a
  // gold disc. The teal is what keeps it off reading as currency.
  plugTarget(ctx, w, h) {
    const u = Math.max(w, h);
    fineShape(ctx, '#48c8b0', u, (c) => c.arc(w * 0.5, h * 0.5, u * 0.45, 0, Math.PI * 2),
      'rgba(12,40,36,0.5)', 0.03);
    plain(ctx, '#e6e3da', (c) => c.arc(w * 0.5, h * 0.5, u * 0.29, 0, Math.PI * 2));
    plain(ctx, '#2b2a30', (c) => c.arc(w * 0.5, h * 0.5, u * 0.13, 0, Math.PI * 2));
    // Upper-left specular, the same light direction as the trophy and the
    // toaster, so the disc reads as a domed object rather than a printed roundel.
    plain(ctx, 'rgba(230,255,248,0.4)', (c) => c.arc(w * 0.29, h * 0.25, u * 0.075, 0, Math.PI * 2));
  },
};

// ------------------------------------------------------------- cache
const cache = new Map();
const SS = 8; // supersample factor for the offscreen rasterization

export function hasProp(name) { return !!PROP_PAINTERS[name]; }

// Props that animate: name -> how many frames the painter cycles through.
// Anything absent is static. Frames are rasterized and cached individually, so
// an animated prop costs one canvas per frame per size and still draws with a
// single drawImage — no per-frame vector work in the hot loop.
export const PROP_FRAMES = {
  cactus: 6, cactusBig: 6, snowman: 6, snowmanBig: 6, qcrate: 36, appliance: 96,
  buzzbird: 6,
  drone: 6, shooterDrone: 6, droneEye: DRONE_EYE_FRAMES,
};
// A bird beats its wings faster than a cactus sways. At 16fps the six frames
// come round about 2.7 times a second, which is quick enough to read as flapping
// and slow enough that the individual poses still register.
// Rotors read as spinning only well above the flap rate — at 11fps the six
// poses strobe into a slow wobble instead of blurring. The eye drone is the
// exception and runs SLOW: its strip is cut for the lens sweep, not the rotor,
// so sixteen frames at 12fps is one unhurried 1.3s scan with the rotor's five
// turns folded inside it.
const PROP_FPS = {
  qcrate: 12, appliance: 24, buzzbird: 16,
  drone: 24, shooterDrone: 24, droneEye: 12,
};

// Visual overdraw: props drawn taller than their def box, bottom-anchored, so
// the art gains stature without touching the hitbox (hazards already render
// 1.33x their box — bigger art is generous, never unfair).
export const PROP_TALL = {
  cactus: 1.55, cactusBig: 1.4, snowman: 1.55, snowmanBig: 1.4,
};
export function propTall(name) { return PROP_TALL[name] || 1; }

// Extra internal art scale for props with fine expression or reflective detail.
// Their painters receive at least a 2x box before supersampling; the world draw
// size and gameplay hitbox do not change.
const PROP_DETAIL_SCALE = {
  cactus: 2, cactusBig: 2,
  snowman: 2, snowmanBig: 2,
  crate: 2, qcrate: 2, pipe: 2, switch: 2,
  zombieWalk: 2, icicle: 2,
  buzzbird: 2, drone: 2, shooterDrone: 2, droneEye: 2,
  printer: 2, chair: 2,
  trafficCone: 2,
  coin: 2, battery: 2,
  capShield: 2, capMagnet: 2, capStar: 2, capAirJump: 2,
  capSpeed: 2, capLowGrav: 2, capUnpeel: 2, capRelay: 2,
  appliance: 2, cord: 2, resident: 2, dustdevil: 2,
  // Plug-row icons. These ship at 5-10px, which is the range this table exists
  // for: the painter gets a 2x box before supersampling, so a rim band, a
  // toaster slot and a hairline contour survive as tone instead of snapping
  // away. plugTrophyLegacy is here only to keep the gallery's was/is row an
  // honest comparison — without it the old drawing would be handicapped by a
  // rasterization difference rather than judged on the drawing.
  plugOrder: 2, plugTrophy: 2, plugToaster: 2,
  // Gallery-only: the pre-pass trophy for the was/is row, the two handle reaches
  // either side of the shipped one, and the wall socket the MISSION slot used to
  // point at. Same treatment as the shipped icon so those comparisons turn on
  // the drawing rather than on a rasterization difference. Delete each alongside
  // its gallery section.
  plugTrophyLegacy: 2, plugTrophyWide: 2, plugTrophyTight: 2, plugSocket: 2,
  // Parked MISSION-slot alternative. Keeps the shipped treatment so that if it
  // is ever swapped in it needs no other change.
  plugHead: 2,
  // The two MISSION-slot candidates that lost to plugOrder. Kept drawable for
  // the same reason as the trophy handle reaches: the bake-off section stays as
  // the record of the decision, and it has to keep rendering to be worth
  // anything. Delete them with that section.
  plugFlag: 2, plugTarget: 2,
};
export function propDetailScale(name) { return PROP_DETAIL_SCALE[name] || 1; }

// World-only visual size. Snowmen overdraw their unchanged collision boxes a
// little farther so they feel substantial without making their jumps harder.
//
// The fliers are here for readability rather than heft. A drone's box is 12x7,
// which even with the standard 1.33x hazard overdraw draws about 16x9 against a
// 24px hero — small enough that at speed it reads as a smudge in the lane
// rather than as the thing you are meant to duck or shoot. 1.35 puts it at
// roughly 22x13: unmistakable, and still visibly smaller than the hero.
//
// It stops there on purpose. This is ART over an UNCHANGED collision box, so
// every step up widens the gap between what you see and what can hit you. At
// 1.35 the total overdraw is 1.8x the box; 1.5 takes it to 2.0x, where a clean
// pass under a drone starts to look like it should have connected. The error is
// in the forgiving direction either way — you are only ever hit well inside the
// art — but a hazard that looks bigger than it bites is still a hazard you
// misjudge.
const PROP_VISUAL_SCALE = {
  snowman: 1.15, snowmanBig: 1.15,
  drone: 1.35, shooterDrone: 1.35, buzzbird: 1.35, droneEye: 1.35,
};
export function propVisualScale(name) { return PROP_VISUAL_SCALE[name] || 1; }

// Refined props carry their own high-resolution hairline. The shared two-pass
// hazard rim would sit outside it as a second broad border at desktop scale,
// undoing the lighter authored contour.
const SELF_OUTLINED_PROPS = new Set([
  'cactus', 'cactusBig', 'snowman', 'snowmanBig',
  'crate', 'pipe', 'zombieWalk', 'icicle',
  'buzzbird', 'drone', 'shooterDrone', 'printer', 'chair', 'trafficCone',
]);
export function propHazardRim(name) {
  return !SELF_OUTLINED_PROPS.has(name);
}

export function propFrames(name) { return PROP_FRAMES[name] || 1; }
export function propFps(name) { return PROP_FPS[name] || 11; }

// Rasterize any vector painter into the shared cache at SS x its logical size.
// The key is the caller's whole identity — name, size, and anything else that
// changes the pixels (a frame index here, a palette id in sprites/arcade.js).
export function rasterize(key, w, h, paintFn) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * SS));
  c.height = Math.max(1, Math.round(h * SS));
  const x = c.getContext('2d');
  x.scale(SS, SS);
  x.lineJoin = 'round';
  x.lineCap = 'round';
  paintFn(x, w, h);
  cache.set(key, c);
  return c;
}

// Cached vector prop rasterized at SS x its logical size.
export function propSprite(name, w, h, frame = 0) {
  const f = frame % propFrames(name);
  const paint = PROP_PAINTERS[name];
  if (!paint) return null;
  const detail = propDetailScale(name);
  const rw = w * detail, rh = h * detail;
  return rasterize(`${name}|${w}x${h}|${detail}x|${f}`, rw, rh, (x) => paint(x, rw, rh, f));
}

// Flat silhouette of a prop in one color — used for hazard rim outlines.
export function propTinted(name, w, h, color, frame = 0) {
  const f = frame % propFrames(name);
  const key = `${name}|${w}x${h}|${color}|${f}`;
  if (cache.has(key)) return cache.get(key);
  const src = propSprite(name, w, h, f);
  if (!src) return null;
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  cache.set(key, c);
  return c;
}

// Union of two offset silhouettes in one cached canvas — the hazard rim
// becomes a single drawImage per color instead of two.
export function propRimPair(name, w, h, color, axis, frame = 0) {
  const f = frame % propFrames(name);
  const key = `${name}|${w}x${h}|rim|${color}|${axis}|${f}`;
  if (cache.has(key)) return cache.get(key);
  const sil = propTinted(name, w, h, color, f);
  if (!sil) return null;
  const pad = propDetailScale(name) * SS;
  const c = document.createElement('canvas');
  c.width = sil.width + 2 * pad;
  c.height = sil.height + 2 * pad;
  const x = c.getContext('2d');
  const [dx, dy] = axis === 'x' ? [pad, 0] : [0, pad];
  x.drawImage(sil, pad - dx, pad - dy);
  x.drawImage(sil, pad + dx, pad + dy);
  cache.set(key, c);
  return c;
}

// Soft radial glow (for power capsules and other shiny things) — cached.
export function glowSprite(color, r = 16) {
  const key = `glow|${color}|${r}`;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = r * 2 * 4;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(r * 4, r * 4, r, r * 4, r * 4, r * 4);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, c.width, c.height);
  cache.set(key, c);
  return c;
}

// A soft 4-point sparkle (for coin twinkles and anything shiny) — cached.
export function sparkSprite(color) {
  const key = `spark|${color}`;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  x.translate(32, 32);
  x.fillStyle = color;
  for (const rot of [0, Math.PI / 2]) {
    x.save();
    x.rotate(rot);
    x.beginPath();
    x.moveTo(-30, 0);
    x.quadraticCurveTo(0, -5, 30, 0);
    x.quadraticCurveTo(0, 5, -30, 0);
    x.closePath();
    x.globalAlpha = 0.9;
    x.fill();
    x.restore();
  }
  x.globalAlpha = 1;
  x.beginPath();
  x.arc(0, 0, 5, 0, Math.PI * 2);
  x.fill();
  cache.set(key, c);
  return c;
}

// Convenience: draw a vector prop smoothly into a logical-coordinate box.
export function drawProp(ctx, name, x, y, w, h, frame = 0) {
  const spr = propSprite(name, w, h, frame);
  if (!spr) return false;
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(spr, x, y, w, h);
  ctx.imageSmoothingEnabled = prev;
  return true;
}

// A rare visualizer-only appliance finish still uses the original vector
// painter, so only its authored casing planes change colour—not the toast,
// wings, outlines, or transparent bounds as with a post-process tint.
export function drawApplianceFinish(ctx, x, y, w, h, frame, finish) {
  const f = frame % propFrames('appliance');
  const detail = propDetailScale('appliance');
  const rw = w * detail, rh = h * detail;
  const spr = rasterize(`appliance|${w}x${h}|${detail}x|${f}|finish:${finish.id}`,
    rw, rh, (paintCtx) => PROP_PAINTERS.appliance(paintCtx, rw, rh, f, finish));
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(spr, x, y, w, h);
  ctx.imageSmoothingEnabled = prev;
  return true;
}
