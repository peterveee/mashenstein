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

// The lightning bolt, in the 28x18 cell grid both battery drawings are laid out
// on, so the HUD cell and the world pickup are the same mark and can only ever
// be fixed together.
//
// Placed by CENTROID, not by bounding box. A bolt is a diagonal with its mass in
// the broad upper-left arm and a thin tail trailing below-right, so a placement
// that centres its extents leaves the shape itself reading low and left of the
// cell it sits in. These points put the centroid on the body's centre of (12, 9)
// — the earlier bounding-box placement had it at (13, 9.5), which is invisible
// at 11px of HUD cell and unmissable at pickup size.
const BOLT_PTS = [[13, 4.5], [9, 10], [12, 10], [11, 13.5], [15, 8], [12, 8]];
const boltPath = (c, X, Y) => {
  BOLT_PTS.forEach(([bx, by], i) => (i ? c.lineTo(X(bx), Y(by)) : c.moveTo(X(bx), Y(by))));
  c.closePath();
};

// Where the world battery's art sits inside its painter box. The HUD art spans
// X 1.5..26.5 and Y 2.5..15.5 of the cell grid — 25 units by 13 — so the pickup
// takes the box's full width and lets that aspect decide its height, centred.
// Shared with BATTERY_FOCUS below so the drawing and anything aiming at the
// drawing are reading off one layout.
const batteryGrid = (w, h) => {
  const AW = w * 0.96, AH = AW * (13 / 25);
  return {
    X: (n) => w * 0.02 + ((n - 1.5) / 25) * AW,
    Y: (n) => (h - AH) / 2 + ((n - 2.5) / 13) * AH,
  };
};
// The centre of the battery's CELL, as fractions of its painter box — the point
// an effect should radiate from. Not the box centre and not the silhouette's:
// the nub hangs off the right, which drags both about a pixel right of the green
// cell the eye actually tracks. On an 8px sprite that is 11% of its width, and a
// halo centred there visibly leaks out from beside the battery instead of from
// inside it. Vertically the cell is already the box centre; only x moves.
export const BATTERY_FOCUS = (() => {
  const { X, Y } = batteryGrid(1, 1);
  return { x: X(12), y: Y(9) };
})();

// One HUD battery cell, laid out on a 28x18 grid and scaled into the box:
// rounded body, terminal nub on the right, lightning bolt through the middle.
// A spent cell keeps the full silhouette in outline rather than vanishing, so
// the row's length always states the maximum and the fill states what is left.
function hudCell(ctx, w, h, charged) {
  const X = (n) => (w * n) / 28, Y = (n) => (h * n) / 18;
  const body = (c) => rr(c, X(1.5), Y(2.5), X(21), Y(13), X(3.5));
  const nub = (c) => rr(c, X(23), Y(6), X(3.5), Y(6), X(1.5));
  const bolt = (c) => boltPath(c, X, Y);
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
    // Tapered cone body with a BLUNT top. A real cone is moulded, not
    // sharpened — and a true point is the first thing to vanish at gameplay
    // size anyway, so the apex was spending its only pixel on a spike. The
    // straight sides run to y=0.19 and a short quadratic caps them, which puts
    // the crown at about 0.13h and leaves a dome roughly a twelfth of the box
    // across.
    const conePath = (c) => {
      c.moveTo(w * 0.22, h * 0.82);
      c.lineTo(w * 0.458, h * 0.19);
      c.quadraticCurveTo(w * 0.5, h * 0.075, w * 0.542, h * 0.19);
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
    // Bands sit lower on the body: high up they crowded the tip and left
    // the widest, most visible part of the cone plain orange.
    for (const by of [h * 0.60, h * 0.44]) {
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

    // A fine embossed rim survives the 16-to-8 downsample as tonal detail
    // instead of becoming the thick dark washer in the old sprite. No centre
    // stamp: at pickup size it read as an odd dark oval, not an engraving.
    stroke(ctx, 'rgba(166,111,16,0.72)', Math.max(0.18, u * 0.017), (c) => {
      c.ellipse(w / 2, h / 2, w * 0.33, h * 0.35, 0, 0, Math.PI * 2);
    });
    plain(ctx, 'rgba(255,251,204,0.9)', (c) => c.ellipse(w * 0.35, h * 0.29, w * 0.075, h * 0.095, -0.45, 0, Math.PI * 2));
  },
  // Laid out landscape with the terminal on the RIGHT, the same way round as
  // the HUD's `cellFull`: a pickup that points one way and the meter it feeds
  // pointing the other made the player read them as two different objects.
  //
  // Drawn on hudCell's own 28x18 grid rather than on eyeballed fractions of the
  // box, so the two are the same battery at two sizes. That matters because the
  // pickup's def box is SQUARE (8x8): fitting the art to that box turns a
  // battery into a lozenge, and the family resemblance goes with it. Instead the
  // art takes the box's full width and lets its height fall where the HUD
  // proportions put it — around half the box — with PROP_VISUAL_SCALE paying
  // back the presence that flatter silhouette costs. The chunky pickup greens
  // stay: this one still has to hold up as a thing in the world.
  battery(ctx, w, h) {
    const u = Math.max(w, h);
    const { X, Y } = batteryGrid(w, h);
    fineShape(ctx, '#48c848', u, (c) => rr(c, X(1.5), Y(2.5), X(22.5) - X(1.5), Y(15.5) - Y(2.5), (X(5) - X(1.5))));
    plain(ctx, '#2a8a2a', (c) => rr(c, X(23), Y(6), X(26.5) - X(23), Y(12) - Y(6), X(3) - X(1.5)));
    plain(ctx, '#eaffea', (c) => boltPath(c, X, Y));
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
  // The coin beside them. The world `coin` is a flat disc with an embossed
  // rim, which at 12 units in a dark panel reads as a washer; this one is a
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
  // The speed ramp. Bake-off winner (candidate A, black and gold): the drawing
  // lives with the other candidates further down so the section that decided
  // it stays honest, and this is the one line that ships it. The pre-bake-off
  // pad is kept as boostPadLegacy.
  boostPad(ctx, w, h, frame = 0) { PROP_PAINTERS.rampChevron(ctx, w, h, frame); },
  // The spring. Sibling to the boost pad and drawn to be read as one: same
  // black-and-gold, same chevrons, same "run over it and it pays out" contract.
  // The one difference is the axis, and every mark here is about that axis —
  // the coil, the chevrons and the plate all point UP, because what this thing
  // sells is a road two hundred pixels above the one you are on, and a player
  // has about a sixth of a second to decide whether they want it.
  //
  // Unlike the ramp it stands PROUD of the floor rather than sunk into it. A
  // recess says "the floor does something here"; a spring is a machine bolted
  // on top of the floor, and the silhouette is the only thing that will survive
  // being seen at lane speed. PROP_TALL buys the height for it.
  springPad(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    // The cycle is a WIND-UP, not a loop of equal frames. It compresses through
    // most of it — accelerating, so the tension reads as building rather than
    // as a bar sliding — and then fires, overshooting past its own rest height
    // before settling. A plain sine would give it a bounce with no moment in
    // it, and the moment is the whole reason a player looks at it twice.
    const p = (frame % 8) / 8;
    const wind = Math.min(1, p / 0.62);
    const open = p > 0.62 ? (p - 0.62) / 0.38 : 0;
    const squash = p <= 0.62
      ? 1 - 0.34 * wind * wind
      : 0.66 + 0.34 * open + 0.22 * Math.sin(open * Math.PI);
    // Base plate: the bit bolted to the floor, always at full width.
    fineShape(ctx, '#171c2b', u, (c) => rr(c, 0, h * 0.82, w, h * 0.18, h * 0.03),
      'rgba(6,6,14,0.65)', 0.018);
    plain(ctx, 'rgba(120,132,164,0.35)', (c) => rr(c, w * 0.02, h * 0.82, w * 0.96, h * 0.04, h * 0.02));
    // Coil. Three turns drawn as flat bars rather than a helix — at 16px wide a
    // traced spiral is mush, and stacked bars that move together read as a
    // spring the moment they compress.
    const coilTop = h * (0.82 - 0.5 * squash), coilH = h * 0.82 - coilTop;
    for (let i = 0; i < 3; i++) {
      const y = coilTop + (coilH * (i + 0.15)) / 3;
      plain(ctx, i % 2 ? '#8a6a12' : '#f6d33c',
        (c) => rr(c, w * 0.28, y, w * 0.44, coilH * 0.2, coilH * 0.08));
    }
    // The plate you actually hit, riding on top of the coil.
    fineShape(ctx, '#171c2b', u, (c) => rr(c, w * 0.06, coilTop - h * 0.13, w * 0.88, h * 0.15, h * 0.04),
      'rgba(6,6,14,0.65)', 0.018);
    plain(ctx, '#f6d33c', (c) => rr(c, w * 0.1, coilTop - h * 0.115, w * 0.8, h * 0.05, h * 0.02));
    // Two chevrons climbing off the plate, brightest at the moment it fires.
    // 45 degrees exactly, same rule the ramp's chase follows.
    const cw = w * 0.3, ct = h * 0.09;
    for (let i = 0; i < 2; i++) {
      const cy = coilTop - h * (0.2 + i * 0.16) - open * h * 0.1;
      // They brighten as it winds and go white at the release, so the pad is
      // saying "about to" for most of the cycle and "now" for the rest of it.
      plain(ctx, open > 0 ? '#fff6d0' : `rgba(246,211,60,${(0.5 + 0.4 * wind - i * 0.3).toFixed(3)})`, (c) => {
        c.moveTo(w / 2 - cw, cy);
        c.lineTo(w / 2, cy - cw);
        c.lineTo(w / 2 + cw, cy);
        c.lineTo(w / 2 + cw - ct, cy);
        c.lineTo(w / 2, cy - cw + ct);
        c.lineTo(w / 2 - cw + ct, cy);
        c.closePath();
      });
    }
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

  // ==================================================================
  // BAKE-OFF CANDIDATES — GALLERY ONLY. Nothing in src/ draws these yet.
  // Each one is a complete prop painter with real cached frames, so what
  // the gallery animates is exactly what would ship the moment a name is
  // swapped into an entity def (the ramps) or into drawPortal(). Delete a
  // losing candidate together with its gallery section.
  //
  // Every painter here is FLAT-FILL ONLY — no canvas gradients. The frame
  // test in tests/props.js traces animated painters through a recording
  // proxy, and a proxy has no gradient object to add stops to.
  // ==================================================================

  // --- SPEED RAMP ---------------------------------------------------
  // The shipped boostPad is a 14x4 decal: a yellow lozenge with three
  // static chevrons. At lane speed it is a smear on the floor, it never
  // announces itself on approach, and because nothing about it moves it
  // never confirms that it fired. Each candidate keeps that 14x4 hitbox
  // exactly and buys presence on the one axis a floor pad has spare —
  // HEIGHT, via PROP_TALL's bottom-anchored overdraw — plus motion.

  // A — SHIPS as boostPad. The pad, done properly, and nothing above it: the
  // whole thing is the pad, and the whole animation happens inside it.
  //
  // Black and gold, borrowed from the gate candidate's marquee. Gold-on-gold
  // was the first pass's weakness — an orange chevron on a yellow deck is a
  // two-step of the same hue, so at lane speed the pad collapsed into one warm
  // smear and the chase inside it was invisible. Gold on near-black is the
  // widest value gap the palette has, so the chevrons stay separate marks all
  // the way down to the 5px they occupy on screen.
  //
  // The earlier version threw fading darts up off the leading edge. They read
  // well but they were art OUTSIDE the pad, above the floor line, on a prop
  // that cannot hurt you and does not want that much attention.
  // It is a TRENCH, not a slab. The pad sat proud of the floor casting a
  // shadow, which put a 9px kerb in a lane the hero runs flat along; sunk in,
  // it stops being an obstacle-shaped thing that happens not to be one. The
  // recess is drawn rather than cut — a prop painter cannot carve the ground —
  // so everything here is doing the job an actual hole would: a dark well, a
  // lit rim on the FAR side only (light comes from above and in front, so a
  // real trench catches it on its back wall), no bottom contour and no cast
  // shadow. A drop shadow is the one mark that would give it away as sitting
  // on top, which is why the pad no longer has one.
  rampChevron(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const p = (frame % 8) / 8;
    // Sunk further than the first trench pass. The mouth starts a third of the
    // way down the cell and the well runs off the BOTTOM of the raster, so the
    // ground itself is what ends the drawing — the art carries no bottom edge
    // of its own to give away that it is a decal sat on the floor.
    const top = h * 0.46, band = h * 0.9;
    // The floor's own lip, above the recess: a thin dark line the ground
    // appears to break along.
    plain(ctx, 'rgba(10,8,18,0.45)', (c) => rr(c, 0, top - h * 0.11, w, h * 0.14, h * 0.04));
    // Corners stay nearly square. A rounded box is an OBJECT sitting on the
    // floor; a cut in the floor has crisp ends, and that one difference did
    // more for the recess than any amount of shading.
    fineShape(ctx, '#171c2b', u, (c) => rr(c, 0, top, w, band, h * 0.07), 'rgba(6,6,14,0.65)', 0.018);
    // Far wall catching the light, and a gold rail sat on it. One rail, not
    // two: two boxed the chevrons in and the pad read as a crate lid.
    plain(ctx, 'rgba(120,132,164,0.35)', (c) => rr(c, w * 0.015, top + h * 0.02, w * 0.97, h * 0.09, h * 0.03));
    plain(ctx, '#f6d33c', (c) => rr(c, w * 0.03, top + h * 0.075, w * 0.94, h * 0.04, h * 0.02));
    // Chevrons. Every sloped edge is EXACTLY 45 degrees: the arm's horizontal
    // run is half the chevron's height, and the inner edge is the outer edge
    // translated straight back along x, which preserves both slopes exactly.
    // The painter box and the world draw box share an aspect ratio, so 45 in
    // here is still 45 on screen. Chunk comes from the thickness `t`, not from
    // steepening the arms — a fatter dart was the old failure.
    // The band ends exactly at the ground line, and the chevron is exactly as
    // tall as the band — so the POINT lands dead centre of what you can see.
    // Running the band off the bottom of the cell looked more like a trench but
    // pushed every point down into the last quarter of the visible mark, which
    // is the one thing a chevron cannot survive.
    const dx = w * 0.03, dy = top + h * 0.16, dw = w * 0.94, dh = h - dy;
    const run = dh * 0.5, t = dh * 0.5, step = w * 0.23;
    ctx.save();
    ctx.beginPath();
    rr(ctx, dx, dy, dw, dh, h * 0.05);
    ctx.clip();
    for (let i = -1; i < 5; i++) {
      const cx = dx + (i + p) * step;
      plain(ctx, '#f6d33c', (c) => {
        c.moveTo(cx - run, dy);
        c.lineTo(cx, dy + run);
        c.lineTo(cx - run, dy + dh);
        c.lineTo(cx - run - t, dy + dh);
        c.lineTo(cx - t, dy + run);
        c.lineTo(cx - run - t, dy);
        c.closePath();
      });
    }
    ctx.restore();
    // The leading lip flashes on the half-cycle the chevrons arrive at it, so
    // the pad has a beat as well as a direction.
    plain(ctx, p < 0.5 ? '#fff6d0' : 'rgba(255,246,208,0.35)',
      (c) => rr(c, w * 0.9, dy + dh * 0.06, w * 0.045, dh * 0.88, h * 0.04));
  },

  // The pad as it shipped before the bake-off, kept drawable so the WAS tile
  // in that section stays an honest comparison rather than showing the new art
  // twice. Delete it with the section.
  boostPadLegacy(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#f6d33c', u, (c) => rr(c, 0, h * 0.1, w, h * 0.8, h * 0.35));
    plain(ctx, '#e07820', (c) => {
      for (let i = 0; i < 3; i++) {
        const x = w * (0.16 + i * 0.26);
        c.moveTo(x, h * 0.24); c.lineTo(x + w * 0.16, h * 0.5); c.lineTo(x, h * 0.76); c.closePath();
      }
    });
  },

  // B: stop drawing a decal and draw a RAMP. The silhouette itself says
  // "up and forward" before any colour does, which is the one thing a flat
  // pad can never do — and it is the only candidate whose shape survives
  // being seen for a sixth of a second.
  rampWedge(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const p = (frame % 8) / 8;
    const lip = h * 0.26;
    const deck = (c) => {
      c.moveTo(w * 0.02, h * 0.96);
      c.lineTo(w * 0.14, h * 0.72);
      c.quadraticCurveTo(w * 0.55, lip + h * 0.02, w * 0.88, lip);
      c.lineTo(w * 0.96, lip + h * 0.12);
      c.lineTo(w * 0.96, h * 0.96);
      c.closePath();
    };
    plain(ctx, 'rgba(16,10,28,0.28)', (c) => c.ellipse(w * 0.5, h * 0.985, w * 0.5, h * 0.04, 0, 0, Math.PI * 2));
    fineShape(ctx, '#f6d33c', u, deck, 'rgba(44,28,8,0.5)', 0.02);
    ctx.save();
    ctx.beginPath();
    deck(ctx);
    ctx.clip();
    // Shaded body along the FLOOR, not under the deck surface. The first pass
    // shaded everything below the top curve, which left a hairline of gold
    // around a solid orange lump — the wedge lost the one thing it was drawn
    // for, which is a lit surface climbing away from a dark base.
    plain(ctx, '#c08420', (c) => {
      c.moveTo(0, h);
      c.lineTo(0, h * 0.86);
      c.quadraticCurveTo(w * 0.55, h * 0.62, w, h * 0.5);
      c.lineTo(w, h);
      c.closePath();
    });
    // Chevrons climbing the deck, sheared to lie along the slope rather than
    // standing upright on a ramp that is not flat.
    for (let i = -1; i < 5; i++) {
      const q = (i + p) / 4;
      const tx = w * (0.04 + q * 0.9);
      const ty = h * 0.9 - q * (h * 0.9 - lip) + h * 0.12;
      plain(ctx, '#e07820', (c) => {
        c.moveTo(tx, ty - h * 0.16);
        c.lineTo(tx + w * 0.1, ty - h * 0.05);
        c.lineTo(tx, ty + h * 0.06);
        c.lineTo(tx - w * 0.05, ty + h * 0.06);
        c.lineTo(tx + w * 0.05, ty - h * 0.05);
        c.lineTo(tx - w * 0.05, ty - h * 0.16);
        c.closePath();
      });
    }
    ctx.restore();
    plain(ctx, '#fff6d0', (c) => rr(c, w * 0.78, lip - h * 0.04, w * 0.19, h * 0.09, h * 0.04));
    for (let i = 0; i < 3; i++) {
      const q = (p + i / 3) % 1;
      plain(ctx, `rgba(255,232,140,${(0.95 - q * 0.72).toFixed(2)})`,
        (c) => rr(c, w * (0.62 + q * 0.36), lip - h * (0.06 + q * 0.24),
          w * (0.14 + 0.12 * (1 - q)), h * 0.05, h * 0.025));
    }
  },

  // C: a floor vent with a turbine under it. The only candidate that is a
  // MACHINE rather than a marking — it is doing something whether or not
  // anyone is standing on it, and the plume gives it a silhouette above the
  // floor that survives being scrolled past.
  rampTurbine(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const a = (frame % 8) * (Math.PI / 8);
    const p = (frame % 8) / 8;
    const top = h * 0.6;
    const cx = w * 0.5, cy = top + h * 0.19;
    const r = Math.min(w * 0.26, h * 0.16); // the window the fan lives inside
    plain(ctx, 'rgba(16,10,28,0.28)', (c) => c.ellipse(w * 0.5, h * 0.985, w * 0.5, h * 0.045, 0, 0, Math.PI * 2));
    // Plume first: it belongs behind the housing it is coming out of. Tapered
    // and warm-bright at the mouth — the first pass drew flat discs at 25%
    // alpha, which over a dark lane is smoke, not thrust.
    for (let i = 0; i < 3; i++) {
      const q = (p + i / 3) % 1;
      plain(ctx, `rgba(190,255,244,${(0.8 - q * 0.66).toFixed(2)})`,
        (c) => rr(c, cx - w * (0.1 + q * 0.2), top - q * h * 0.55 - h * 0.04,
          w * (0.2 + q * 0.4), h * 0.07, h * 0.035));
    }
    fineShape(ctx, '#2b2a30', u, (c) => rr(c, 0, top, w, h * 0.37, h * 0.07), 'rgba(10,8,18,0.55)', 0.022);
    plain(ctx, '#141420', (c) => c.arc(cx, cy, r * 1.16, 0, Math.PI * 2));
    // The fan is CLIPPED to its window. Unclipped, four blades on a 4px-tall
    // pad throw a pinwheel out the top of the housing and the thing stops
    // reading as a vent at all.
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      plain(ctx, '#48c8b0', (c) => c.ellipse(r * 0.52, 0, r * 0.5, r * 0.24, 0.45, 0, Math.PI * 2));
    }
    ctx.restore();
    plain(ctx, '#e6e3da', (c) => c.arc(cx, cy, r * 0.2, 0, Math.PI * 2));
    // Two slats across the window, so it reads as a vent you are looking INTO
    // rather than a propeller bolted to the floor.
    plain(ctx, 'rgba(20,18,30,0.7)', (c) => {
      c.rect(cx - r * 1.2, cy - r * 0.5, r * 2.4, r * 0.16);
      c.rect(cx - r * 1.2, cy + r * 0.34, r * 2.4, r * 0.16);
    });
    plain(ctx, '#f6d33c', (c) => rr(c, w * 0.03, top + h * 0.32, w * 0.94, h * 0.05, h * 0.025));
    for (let i = 0; i < 2; i++) {
      const q = (p + i / 2) % 1;
      plain(ctx, `rgba(255,255,255,${(0.85 - q * 0.7).toFixed(2)})`,
        (c) => c.arc(w * (0.26 + i * 0.48), top - q * h * 0.5, w * 0.05, 0, Math.PI * 2));
    }
  },

  // D: the loudest option — a gate you run THROUGH. Its art is as tall as
  // the hero, so it is legible from the far edge of the screen and the
  // player can commit to the lane early. The cost is that a 24px structure
  // over a 4px hitbox is the biggest art-to-box lie in the game; it is only
  // defensible because a boost pad cannot hurt you.
  rampGate(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const p = (frame % 8) / 8;
    const chev = (c, cx, y0, y1) => {
      const m = (y0 + y1) / 2;
      c.moveTo(cx, y0);
      c.lineTo(cx + w * 0.1, m);
      c.lineTo(cx, y1);
      c.lineTo(cx - w * 0.05, y1);
      c.lineTo(cx + w * 0.05, m);
      c.lineTo(cx - w * 0.05, y0);
      c.closePath();
    };
    plain(ctx, 'rgba(16,10,28,0.28)', (c) => c.ellipse(w * 0.5, h * 0.985, w * 0.5, h * 0.03, 0, 0, Math.PI * 2));
    fineShape(ctx, '#f6d33c', u, (c) => rr(c, w * 0.06, h * 0.9, w * 0.88, h * 0.075, h * 0.035),
      'rgba(44,28,8,0.5)', 0.016);
    ctx.save();
    ctx.beginPath();
    rr(ctx, w * 0.06, h * 0.9, w * 0.88, h * 0.075, h * 0.035);
    ctx.clip();
    for (let i = -1; i < 4; i++) plain(ctx, '#e07820', (c) => chev(c, w * (0.06 + (i + p) * 0.3), h * 0.9, h * 0.975));
    ctx.restore();
    for (const px of [w * 0.04, w * 0.82]) {
      fineShape(ctx, '#2b2a30', u, (c) => rr(c, px, h * 0.24, w * 0.14, h * 0.68, w * 0.05),
        'rgba(10,8,18,0.55)', 0.016);
      plain(ctx, '#48c8b0', (c) => rr(c, px + w * 0.03, h * 0.27, w * 0.08, h * 0.6, w * 0.035));
    }
    fineShape(ctx, '#1f2436', u, (c) => rr(c, 0, h * 0.05, w, h * 0.2, h * 0.045), 'rgba(8,8,16,0.55)', 0.016);
    ctx.save();
    ctx.beginPath();
    rr(ctx, w * 0.04, h * 0.08, w * 0.92, h * 0.14, h * 0.03);
    ctx.clip();
    for (let i = -1; i < 4; i++) plain(ctx, '#f6d33c', (c) => chev(c, w * (0.04 + (i + p) * 0.3), h * 0.08, h * 0.22));
    ctx.restore();
    // Chasing bulbs: one lit, advancing. A marquee is the arcade's own way
    // of saying "this way", which is the fiction the whole game sits in.
    for (let i = 0; i < 5; i++) {
      const lit = i === Math.floor(p * 8) % 5;
      plain(ctx, lit ? '#fff6d0' : 'rgba(246,211,60,0.35)',
        (c) => c.arc(w * (0.12 + i * 0.19), h * 0.27, w * (lit ? 0.055 : 0.04), 0, Math.PI * 2));
    }
  },

  // --- OBJECTIVE FLAG -----------------------------------------------
  // The existing plugFlag is a 2x2 chequer on a pole, authored for the 5px
  // MISSION slot and static. These four are the same idea drawn to be seen:
  // every one of them ripples, and every one is authored SQUARE so it still
  // works as a plug-row icon if it ends up back there instead of, or as
  // well as, standing in the world.

  // A: the classic, waving. Chequer cloth on a teal pole with a gold
  // finial, the sheet twisting on a travelling wave rather than sliding.
  flagWave(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const ph = ((frame % 8) / 8) * Math.PI * 2;
    flagPole(ctx, w, h, u);
    fineShape(ctx, '#f6d33c', u, (c) => c.arc(w * 0.16, h * 0.075, w * 0.09, 0, Math.PI * 2),
      'rgba(50,34,6,0.5)', 0.026);
    chequerCloth(ctx, u, w * 0.2, h * 0.12, w * 0.97, h * 0.62, h * 0.055, ph, frame % 8);
  },

  // B: not a race flag at all — a pennant with the game's own lightning
  // bolt on it. The most asymmetric silhouette of the four and the only one
  // that reads as ENERGY rather than as a finish line, which matters when
  // the thing being marked is a plug socket.
  flagPennant(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const ph = ((frame % 8) / 8) * Math.PI * 2;
    const x0 = w * 0.2, x1 = w * 0.99, y0 = h * 0.1, y1 = h * 0.6;
    const amp = h * 0.06;
    flagPole(ctx, w, h, u);
    const pennant = (c) => {
      c.moveTo(x0, y0);
      c.quadraticCurveTo(x0 + (x1 - x0) * 0.5, y0 + Math.sin(ph) * amp * 1.6,
        x1, (y0 + y1) / 2 + Math.sin(ph + 1.2) * amp * 2);
      c.quadraticCurveTo(x0 + (x1 - x0) * 0.5, y1 + Math.sin(ph + 0.6) * amp * 1.6, x0, y1);
      c.closePath();
    };
    fineShape(ctx, '#48c8b0', u, pennant, 'rgba(10,34,30,0.55)', 0.028);
    ctx.save();
    ctx.beginPath();
    pennant(ctx);
    ctx.clip();
    // The bolt shears with the snap instead of sitting flat on a moving
    // sheet — a printed mark that ignores the cloth is what makes a waving
    // flag read as a sticker.
    const k = Math.sin(ph + 0.4) * 0.14;
    ctx.save();
    ctx.transform(1, 0, k, 1, -k * (y0 + y1) / 2, 0);
    plain(ctx, '#e6e3da', (c) => {
      const bx = x0 + (x1 - x0) * 0.24, by = y0 + (y1 - y0) * 0.14;
      const bw = (x1 - x0) * 0.34, bh = (y1 - y0) * 0.72;
      c.moveTo(bx + bw * 0.62, by);
      c.lineTo(bx, by + bh * 0.56);
      c.lineTo(bx + bw * 0.44, by + bh * 0.56);
      c.lineTo(bx + bw * 0.3, by + bh);
      c.lineTo(bx + bw, by + bh * 0.38);
      c.lineTo(bx + bw * 0.5, by + bh * 0.38);
      c.closePath();
    });
    ctx.restore();
    plain(ctx, 'rgba(230,255,248,0.4)', (c) => c.rect(x0, y0, (x1 - x0) * 0.07, y1 - y0));
    ctx.restore();
  },

  // C: flag plus a rotating beacon. The lamp sweeps a full turn over the
  // eight frames, so this is the only candidate with motion that does not
  // depend on the cloth — it still animates at 5px, where a ripple has
  // nowhere to happen.
  flagBeacon(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const f = frame % 8;
    const beam = (f / 8) * Math.PI * 2;
    // Two cones, not one: a short bright throw inside a longer soft one. A
    // single low-alpha wedge a whole box long went olive over the lane and
    // read as a stain rather than as light.
    plain(ctx, 'rgba(255,214,90,0.16)', (c) => {
      c.moveTo(w * 0.16, h * 0.13);
      c.arc(w * 0.16, h * 0.13, w * 0.72, beam - 0.3, beam + 0.3);
      c.closePath();
    });
    plain(ctx, 'rgba(255,238,170,0.34)', (c) => {
      c.moveTo(w * 0.16, h * 0.13);
      c.arc(w * 0.16, h * 0.13, w * 0.36, beam - 0.24, beam + 0.24);
      c.closePath();
    });
    flagPole(ctx, w, h, u);
    chequerCloth(ctx, u, w * 0.2, h * 0.34, w * 0.96, h * 0.74, h * 0.045, (f / 8) * Math.PI * 2, f);
    plain(ctx, '#2b2a30', (c) => rr(c, w * 0.05, h * 0.13, w * 0.22, h * 0.07, w * 0.025));
    fineShape(ctx, Math.cos(beam) > 0.35 ? '#fff6d0' : '#f6d33c', u,
      (c) => c.arc(w * 0.16, h * 0.14, w * 0.11, Math.PI, 0), 'rgba(50,34,6,0.5)', 0.026);
  },

  // D: the literal reading of the name. Cream cloth carrying the plug the
  // whole mechanic is named after — the only candidate that says WHICH
  // objective, not just that there is one. Judge whether the prongs survive
  // the ripple, since that is where it can fall apart.
  flagPlug(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const ph = ((frame % 8) / 8) * Math.PI * 2;
    const x0 = w * 0.2, x1 = w * 0.97, y0 = h * 0.12, y1 = h * 0.62;
    const amp = h * 0.055;
    flagPole(ctx, w, h, u);
    fineShape(ctx, '#f6d33c', u, (c) => c.arc(w * 0.16, h * 0.075, w * 0.09, 0, Math.PI * 2),
      'rgba(50,34,6,0.5)', 0.026);
    const cloth = (c) => clothPath(c, x0, y0, x1, y1, amp, ph);
    fineShape(ctx, '#e6e3da', u, cloth, 'rgba(30,22,14,0.5)', 0.028);
    ctx.save();
    ctx.beginPath();
    cloth(ctx);
    ctx.clip();
    const cx = x0 + (x1 - x0) * 0.52;
    const cy = (y0 + y1) / 2 + clothWave(0.52, ph, amp);
    const s = (y1 - y0) * 0.62;
    // Prongs proud of the body, body clearly narrower than it is wide, cord
    // thin. Every one of those is what keeps this off reading as one dark
    // blob once the sheet is moving and the whole mark is 4px across.
    plain(ctx, '#2f8f84', (c) => {
      c.rect(cx - s * 0.3, cy - s * 0.54, s * 0.16, s * 0.44);
      c.rect(cx + s * 0.14, cy - s * 0.54, s * 0.16, s * 0.44);
    });
    plain(ctx, '#2b2a30', (c) => rr(c, cx - s * 0.46, cy - s * 0.14, s * 0.92, s * 0.5, s * 0.14));
    stroke(ctx, '#2b2a30', Math.max(0.18, u * 0.032), (c) => {
      c.moveTo(cx + s * 0.1, cy + s * 0.36);
      c.quadraticCurveTo(cx + s * 0.56, cy + s * 0.46, cx + s * 0.6, cy + s * 0.04);
    });
    plain(ctx, 'rgba(24,16,34,0.14)', (c) => {
      const bu = (0.1 + ((frame % 8) / 8) * 0.9) % 1;
      c.rect(x0 + (x1 - x0) * bu - (x1 - x0) * 0.08, y0 - amp * 2, (x1 - x0) * 0.16, (y1 - y0) + amp * 4);
    });
    ctx.restore();
    ctx.beginPath();
    cloth(ctx);
    ctx.strokeStyle = 'rgba(30,22,14,0.5)';
    ctx.lineWidth = Math.max(0.2, u * 0.028);
    ctx.stroke();
  },

  // --- RELAY PORTAL -------------------------------------------------
  // The shipped portal is three ellipses: a translucent teal blob, a ring,
  // and a highlight arc, pulsed 2px by drawPortal(). It is the hinge of the
  // whole run — you change hero through it — and it currently looks like a
  // decal. All four candidates are drawn into the same 12x40-ish column so
  // the pass-through box stays where the player has learned it is; what
  // changes is entirely what happens INSIDE that column.

  // A: a built object. Posts, a dome and a thickness, with the energy as a
  // membrane climbing the opening. Reads as ARCHITECTURE — something the
  // arcade installed — which is the most legible thing to run at.
  portalArch(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const p = (frame % 12) / 12;
    // Opening widened to 60% of the column and the crown flattened. The first
    // pass was a 52%-wide semicircular arch with a gold cap on top, which from
    // any distance was a bottle, not a doorway.
    const ix0 = w * 0.2, ix1 = w * 0.8, itop = h * 0.16, ibot = h * 0.98;
    plain(ctx, 'rgba(72,224,200,0.24)', (c) => c.ellipse(w * 0.5, h * 0.985, w * 0.52, h * 0.026, 0, 0, Math.PI * 2));
    fineShape(ctx, '#48c8b0', u, (c) => archPath(c, w * 0.03, w * 0.97, h * 0.04, h * 0.99),
      'rgba(10,34,30,0.55)', 0.012);
    plain(ctx, '#2f8f84', (c) => archPath(c, w * 0.12, w * 0.88, h * 0.1, h * 0.99));
    ctx.save();
    ctx.beginPath();
    archPath(ctx, ix0, ix1, itop, ibot);
    ctx.clip();
    plain(ctx, '#0d3336', (c) => c.rect(0, 0, w, h));
    for (let i = 0; i < 6; i++) {
      const q = ((i / 6) + p) % 1;
      const s = Math.sin(q * Math.PI);
      plain(ctx, `rgba(196,255,244,${(0.28 + 0.6 * s).toFixed(2)})`,
        (c) => c.ellipse(w * 0.5, ibot - q * (ibot - itop), w * 0.3 * (0.55 + 0.45 * s), h * 0.02, 0, 0, Math.PI * 2));
    }
    plain(ctx, 'rgba(210,255,246,0.32)', (c) => rr(c, w * 0.43, itop, w * 0.14, ibot - itop, w * 0.07));
    ctx.restore();
    ctx.beginPath();
    archPath(ctx, ix0, ix1, itop, ibot);
    ctx.strokeStyle = 'rgba(8,26,26,0.5)';
    ctx.lineWidth = Math.max(0.2, u * 0.012);
    ctx.stroke();
    plain(ctx, 'rgba(230,255,248,0.45)', (c) => rr(c, w * 0.06, h * 0.4, w * 0.05, h * 0.42, w * 0.025));
    // Gold sill rather than a gold crown: it reads as a threshold you step
    // over, and it is the mark that anchors the whole thing to the floor.
    plain(ctx, '#f6d33c', (c) => rr(c, w * 0.06, h * 0.93, w * 0.88, h * 0.055, h * 0.022));
    plain(ctx, 'rgba(10,34,30,0.4)', (c) => {
      for (const [rx, ry] of [[0.105, 0.24], [0.895, 0.24], [0.105, 0.88], [0.895, 0.88]]) {
        c.moveTo(w * rx + w * 0.035, h * ry);
        c.arc(w * rx, h * ry, w * 0.035, 0, Math.PI * 2);
      }
    });
  },

  // B: no object at all — a tear. White-hot core, teal bleed, a magenta
  // fringe down one edge, and a jagged outline that re-cuts itself every
  // frame. The most "this should not be here" of the four, and the only one
  // whose edges never settle.
  portalRift(ctx, w, h, frame = 0) {
    const f = frame % 12;
    // Eleven samples a side, joined by curves rather than straight segments.
    // The first pass used seven and lineTo, which is fine at the 14px the lane
    // draws — and reads as a stack of faceted slabs the moment anything draws
    // it bigger, which the credits hand-off does. Facet length scales with the
    // draw size; a curve does not.
    const N = 11;
    const jag = (i, seed) => Math.sin((i * 2.7 + f * 1.31 + seed) * 1.7) * w * 0.055;
    const rift = (grow, off = 0) => (c) => {
      const pts = [];
      for (let side = -1; side <= 1; side += 2) {
        for (let n = 0; n <= N; n++) {
          const i = side < 0 ? n : N - n;
          const t01 = i / N;
          const taper = Math.sin(t01 * Math.PI);
          // Both the width and the jitter fade out at the ends, so the cut
          // closes to a point instead of a blunt stub.
          const half = (w * 0.145 * Math.pow(taper, 0.75) + w * 0.012) * grow;
          const x = w * 0.5 + off + side * half + jag(i, side * 3) * taper;
          const y = h * (0.03 + t01 * 0.94);
          // The two tips are entered twice: a repeated control point pulls the
          // smoothing onto it, so the ends stay sharp while everything between
          // them rounds off.
          if (i === 0 || i === N) pts.push([x, y]);
          pts.push([x, y]);
        }
      }
      smoothClosedPath(c, pts);
    };
    // A dark halo under everything, and a dark core surround inside the teal.
    // Neither shows on the packs the rift was drawn against — over crypt or
    // neon they are invisible — and both are what saves it on the light ones.
    // The read test put this over all nine cabinets and the white core simply
    // disappeared into the doodle sheet and the frost sky: a light-on-light
    // shape with no dark anywhere in it has nothing to be seen against, and
    // this is the one prop in the game the player has to aim at.
    plain(ctx, 'rgba(16,10,28,0.3)', rift(2.7));
    plain(ctx, 'rgba(72,224,200,0.16)', rift(2.3));
    // Chromatic fringe: the same cut, offset a twentieth of the column, so
    // the edge separates into colour the way a bad signal does.
    plain(ctx, 'rgba(232,116,214,0.3)', rift(1.3, -w * 0.05));
    plain(ctx, 'rgba(72,224,200,0.62)', rift(1.25));
    plain(ctx, 'rgba(10,52,54,0.85)', rift(0.78));
    plain(ctx, '#eafff8', rift(0.46));
    for (let i = 0; i < 3; i++) {
      const q = ((f / 12) + i / 3) % 1;
      plain(ctx, `rgba(234,255,248,${(0.75 * (1 - q)).toFixed(2)})`,
        (c) => c.arc(w * (0.5 + (i - 1) * 0.22 * q), h * (0.9 - q * 0.8), w * 0.05, 0, Math.PI * 2));
    }
  },

  // C: a column of spinning rings. Each ring is one horizontal ellipse
  // whose width tracks its own phase, so the stack reads as one surface
  // rotating rather than as nine separate hoops. No frame, no housing —
  // pure effect, and the cheapest of the four to read at true size.
  portalRings(ctx, w, h, frame = 0) { portalRingsArt(ctx, w, h, frame); },

  // The two AFTERMATH strips of the shipped portal. Both are the same drawing
  // as portalRings with a state argument — see portalRingsArt for what each
  // state does and why they exist as separate cached painters rather than as
  // extra frames on the live cycle.
  portalRingsSpent(ctx, w, h, frame = 0) {
    portalRingsArt(ctx, w, h, 0, { spend: frame / (PORTAL_SPEND_FRAMES - 1) });
  },
  portalRingsWilt(ctx, w, h, frame = 0) {
    portalRingsArt(ctx, w, h, 0, { wilt: frame / (PORTAL_WILT_FRAMES - 1) });
  },

  // D: the fiction, taken literally. MASHENSTEIN is an arcade and the
  // mechanic is called plugging in — so the way through is a screen on a
  // plinth with a cable running out of it. Vortex, scanlines, a live LED.
  // The only candidate that could not belong to any other game.
  portalTube(ctx, w, h, frame = 0) {
    const u = Math.max(w, h);
    const p = (frame % 12) / 12;
    plain(ctx, 'rgba(16,10,28,0.3)', (c) => c.ellipse(w * 0.5, h * 0.985, w * 0.5, h * 0.022, 0, 0, Math.PI * 2));
    stroke(ctx, '#48c8b0', Math.max(0.35, w * 0.085), (c) => {
      c.moveTo(w * 0.24, h * 0.94);
      c.quadraticCurveTo(w * -0.08, h * 0.88, w * 0.04, h * 0.99);
    });
    // Wider, squarer plinth and a squarer bezel. Round corners on a tall
    // silver slab is a phone; an arcade tube is a heavy frame with a small
    // radius, and it needs a base you can see it is bolted to.
    fineShape(ctx, '#2b2a30', u, (c) => rr(c, w * 0.02, h * 0.85, w * 0.96, h * 0.14, h * 0.012),
      'rgba(8,8,16,0.55)', 0.012);
    fineShape(ctx, '#8f9bb0', u, (c) => rr(c, w * 0.02, h * 0.02, w * 0.96, h * 0.85, w * 0.09),
      'rgba(26,34,50,0.6)', 0.014);
    plain(ctx, '#39414f', (c) => rr(c, w * 0.08, h * 0.05, w * 0.84, h * 0.79, w * 0.07));
    const sx = w * 0.13, sy = h * 0.075, sw = w * 0.74, sh = h * 0.75;
    plain(ctx, '#0d1c24', (c) => rr(c, sx, sy, sw, sh, w * 0.06));
    ctx.save();
    ctx.beginPath();
    rr(ctx, sx, sy, sw, sh, w * 0.06);
    ctx.clip();
    ctx.save();
    ctx.translate(sx + sw / 2, sy + sh / 2);
    for (let i = 0; i < 5; i++) {
      const q = ((i / 5) + p) % 1;
      stroke(ctx, `rgba(72,224,200,${(0.85 * q).toFixed(2)})`, Math.max(0.25, w * 0.06),
        (c) => c.ellipse(0, 0, sw * (0.06 + 0.42 * (1 - q)), sh * (0.04 + 0.46 * (1 - q)), 0,
          p * 6.3 + i, p * 6.3 + i + 4.2));
    }
    plain(ctx, '#eafff8', (c) => c.ellipse(0, 0, sw * 0.1, sh * 0.05, 0, 0, Math.PI * 2));
    ctx.restore();
    plain(ctx, 'rgba(8,20,26,0.32)', (c) => {
      for (let y = sy; y < sy + sh; y += h * 0.035) c.rect(sx, y, sw, h * 0.013);
    });
    ctx.restore();
    plain(ctx, p < 0.5 ? '#f6d33c' : 'rgba(246,211,60,0.3)',
      (c) => c.arc(w * 0.5, h * 0.92, w * 0.055, 0, Math.PI * 2));
  },
};

// ------------------------------------------------- relay portal states
// How long the two aftermath strips are, in frames and in seconds. The frame
// counts are what the raster cache stores; the times are what drawPortal()
// divides elapsed seconds by. They live here rather than at the call site
// because the strips are cut for them: six frames over a third of a second is
// a discharge, six frames over half a second is a wilt, and swapping either
// number without recutting the other would change what the drawing means.
export const PORTAL_SPEND_FRAMES = 6, PORTAL_SPEND_TIME = 0.34;
export const PORTAL_WILT_FRAMES = 6, PORTAL_WILT_TIME = 0.5;
// Where the discharge ends and the collapse begins, as a fraction of a spend.
// The blowout is deliberately shorter than one frame's worth of the strip is
// wide: it has to land entirely on frame 0 so the brightest moment is the
// frame the hero is standing in the doorway, not the one after it.
const PORTAL_FLASH = 0.2;
// props.js otherwise hardcodes every colour. The portal is the exception
// because its aftermath is a continuous fade of the SAME hardware rather than
// a second palette — writing out six darkened variants of five colours would
// be thirty constants nobody could keep in step with the live five.
function portalRgb(c) {
  const n = parseInt(String(c).replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function portalMix(a, b, t) {
  const A = portalRgb(a), B = portalRgb(b);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`;
}
const PORTAL_INK = '#12262a';   // what dead portal hardware darkens toward

// The shipped relay portal, in three states.
//
// LIVE (both zeroes) is the drawing as authored: a bolted plate with thirteen
// hoops of light standing on it.
//
// SPEND is a hero going THROUGH. It opens on a white blowout — the shaft and
// every hoop overdriven for one frame — and then the hoops sink into the slot
// and go out, leaving the plinth dark. The hoops do not fade in place: they
// are pulled down into the thing they came out of, because a doorway that has
// just been used should look emptied rather than switched off. The three that
// appear to come forward with the hero are particles, thrown by the run — a
// cached sprite cannot follow something that has left its own box.
//
// WILT is a hero going OVER. No flash, nothing discharges: the column simply
// sags — the stack compresses toward the plate, the hoops narrow and dim, the
// shaft thins out. The plinth stays mostly lit, because nothing was spent. It
// has to read as clearly DIFFERENT from a spend at a glance and while moving
// off the back of the frame, which is the whole reason it is a separate strip
// rather than a shorter spend.
//
// Both are separate painters rather than extra frames on portalRings because
// propSprite() takes frame indices modulo PROP_FRAMES — a seventh frame on a
// twelve-frame cycle would silently be frame 0 of the live loop.
function portalRingsArt(ctx, w, h, frame = 0, state = {}) {
  // spend is null for a LIVE portal and 0..1 for one being spent — a spend of
  // exactly 0 is the discharge frame, not the live drawing, so the two cannot
  // share a value.
  const { spend = null, wilt = 0 } = state;
  const s = spend == null ? 0 : spend;
  const u = Math.max(w, h);
  const p = (frame % 12) / 12;
  const RINGS = 13;             // thirteen thin hoops, not nine fat ones
  const BASE_Y = h * 0.945;
  const WIDEST = 0.44;          // half-width of the widest ring, in w
  // The blowout, and how far the hoops have collapsed. The flash is gone by
  // the second frame of the strip; the sink runs the whole length of it.
  const flash = spend == null ? 0 : Math.max(0, 1 - s / PORTAL_FLASH);
  const sink = s;
  // How dead the hardware looks. A spend kills it; a miss only dims it,
  // because a portal nobody used has not spent anything.
  const plinthOff = Math.min(1, s * 0.85 + wilt * 0.3);
  const lampOff = Math.min(1, s * 1.15 + wilt * 0.45);
  const dark = (c, amount) => portalMix(c, PORTAL_INK, amount);
  // The base is a BOLTED PLATE, not a disc. An ellipse of light under a
  // column of light is more of the same substance, so it floated: it read as
  // the bottom ring rather than as the thing the rings come out of. This is
  // hard-edged, flat-bottomed, wider than the widest ring (0.88w), and it
  // has a front face and two feet — a fabricated object sitting ON a floor,
  // which is the only way a stack of light gets anchored to one.
  plain(ctx, 'rgba(10,26,28,0.35)', (c) => rr(c, w * 0.03, h * 0.975, w * 0.94, h * 0.022, h * 0.008));
  // Feet first, so the plate's own contour closes over their tops.
  plain(ctx, dark('#2a6f68', plinthOff * 0.7), (c) => {
    rr(c, w * 0.07, BASE_Y + h * 0.03, w * 0.12, h * 0.045, h * 0.008);
    rr(c, w * 0.81, BASE_Y + h * 0.03, w * 0.12, h * 0.045, h * 0.008);
  });
  // Front face: the thickness you are looking at slightly from above.
  fineShape(ctx, dark('#2f8f84', plinthOff * 0.7), u,
    (c) => rr(c, w * 0.05, BASE_Y + h * 0.006, w * 0.9, h * 0.045, h * 0.01),
    'rgba(8,30,28,0.6)', 0.01);
  // Top plate, proud of the front face on both sides so it reads as a lip.
  // It takes the discharge: the rim is the part of the hardware closest to the
  // slot, so it is the part that should look overdriven when the slot blows.
  fineShape(ctx, flash > 0 ? portalMix('#48c8b0', '#ffffff', flash * 0.8) : dark('#48c8b0', plinthOff * 0.75), u,
    (c) => rr(c, w * 0.01, BASE_Y - h * 0.022, w * 0.98, h * 0.034, h * 0.009),
    'rgba(8,30,28,0.6)', 0.01);
  // The slot the column rises out of, and the light standing in it.
  plain(ctx, 'rgba(8,38,40,0.8)', (c) => rr(c, w * 0.33, BASE_Y - h * 0.016, w * 0.34, h * 0.018, h * 0.006));
  if (lampOff < 1) {
    ctx.globalAlpha = 1 - lampOff;
    // The slot flares wider than its own light for the length of the flash —
    // this is the only place the discharge has anywhere to go.
    const lampW = w * (0.28 + 0.34 * flash);
    plain(ctx, '#c8fff0', (c) => rr(c, w * 0.5 - lampW / 2, BASE_Y - h * 0.013, lampW, h * 0.009, h * 0.004));
    ctx.globalAlpha = 1;
  }
  // The shaft of light, stopping ON the plinth rather than running through it.
  // It blows out with the flash, then goes down with the hoops.
  const shaftAlpha = Math.max(0, (0.16 + 0.5 * flash) * (1 - sink) * (1 - wilt * 0.88));
  const shaftTop = h * 0.07 + (BASE_Y - h * 0.165) * Math.max(sink, wilt * 0.5);
  if (shaftAlpha > 0.01) {
    const shaftW = w * (0.2 + 0.14 * flash);
    plain(ctx, `rgba(200,255,240,${shaftAlpha.toFixed(3)})`,
      (c) => rr(c, w * 0.5 - shaftW / 2, shaftTop, shaftW, Math.max(0, BASE_Y - h * 0.025 - shaftTop), w * 0.1));
  }
  for (let i = 0; i < RINGS; i++) {
    const t01 = i / (RINGS - 1);
    const a = p * Math.PI * 2 + t01 * 3.2;
    // Where this hoop sits, once the state has had its way with it. A spend
    // drags every hoop down onto the slot; a wilt compresses the stack toward
    // the plate without moving the bottom of it, which is what makes one read
    // as draining and the other as slumping.
    const y0 = h * 0.075 + t01 * (BASE_Y - h * 0.11);
    const y = y0 + (BASE_Y - h * 0.02 - y0) * (sink * sink * (1 - t01 * 0.35) + wilt * 0.5);
    // Wide hoops narrow as they go: the column closes as much as it falls.
    const halfW = w * (0.14 + (WIDEST - 0.14) * Math.abs(Math.cos(a)))
      * (1 - sink * 0.85) * (1 - wilt * 0.42) * (1 + flash * 0.08);
    if (halfW < w * 0.01) continue;
    const ring = (c) => c.ellipse(w * 0.5, y, halfW, h * 0.015, 0, 0, Math.PI * 2);
    // BOTH passes fade together. Fading only the bright one leaves the dark
    // backing behind at full strength — a spent portal ended on a grey smear
    // standing where the column had been, and a wilted one went muddy rather
    // than dim, because the separation pass was outliving the thing it was
    // separating.
    ctx.globalAlpha = Math.max(0, (1 - sink) * (1 - wilt * 0.62));
    // A dark pass under every ring. Over crypt or neon it is invisible; over
    // the doodle sheet and the frost sky it is the only reason the pale half
    // of the stack does not dissolve into the background. Same two-pass trick
    // the plug row's frame uses, and the same reason. Kept only a little
    // wider than the hoop it backs — at twice the width it stopped reading as
    // separation and started reading as a thick grey donut with a bright
    // core, which is what made the column look coarse rather than fine.
    stroke(ctx, 'rgba(10,30,34,0.28)', Math.max(0.3, w * 0.058), ring);
    // Lit half and shadowed half. The flash overrides both — a discharge has
    // no near side and far side — and the wilt drags both toward the dim
    // teal, so the stack loses its contrast before it loses its shape.
    const lit = Math.cos(a) > 0 ? '#c8fff0' : '#3fa9a0';
    const col = flash > 0 ? portalMix(lit, '#ffffff', flash)
      : wilt > 0 ? portalMix(lit, '#2a6f68', wilt * 0.8) : lit;
    // The discharge is BLOOM, not weight. Widening the hoop's own stroke was
    // the first attempt and it read as the hoops getting chunky — a thicker
    // white band is a fatter object, not a brighter one. Light spills OUTWARD
    // instead: two wide, faint passes of the same colour around the hoop, with
    // the core stroke left at exactly the width it has when the portal is
    // idle. Nothing about the hoop changes except what surrounds it.
    if (flash > 0) {
      const core = ctx.globalAlpha;
      for (const [mult, a01] of [[4.4, 0.1], [2.2, 0.26]]) {
        ctx.globalAlpha = core * flash * a01;
        stroke(ctx, col, Math.max(0.4, w * 0.034 * mult), ring);
      }
      ctx.globalAlpha = core;
    }
    stroke(ctx, col, Math.max(0.2, w * 0.034), ring);
    ctx.globalAlpha = 1;
  }
  // The two loose sparks orbiting the column. They are the first thing to go
  // in either state: they are the portal's idle fidget, and a portal that has
  // discharged or given up is not fidgeting.
  const sparkAlpha = Math.max(0, 1 - Math.max(sink * 2.2, wilt * 1.6));
  if (sparkAlpha > 0.01) {
    ctx.globalAlpha = sparkAlpha;
    for (let i = 0; i < 2; i++) {
      const a = p * Math.PI * 2 * (i ? -1 : 1) + i * 2.1;
      plain(ctx, flash > 0 ? '#ffffff' : '#fff6d0',
        (c) => c.arc(w * (0.5 + 0.42 * Math.cos(a)), h * (0.3 + i * 0.34 + 0.06 * Math.sin(a)), w * 0.04, 0, Math.PI * 2));
    }
    ctx.globalAlpha = 1;
  }
}

// ------------------------------------------- bake-off candidate helpers
// Shared by the flag and portal candidates above. Hoisted function
// declarations, so they can live next to the block they serve rather than
// at the top of a file whose other helpers are all shipped.

// The height of a rippling sheet at 0..1 across it. Amplitude grows toward
// the fly end, because the hoist is nailed to a pole and cannot move.
function clothWave(t01, phase, amp) {
  return Math.sin(phase + t01 * 4.6) * amp * (0.25 + t01);
}

// One cloth outline. The bottom edge runs the same wave a fifth of a cycle
// behind the top one, so the sheet TWISTS instead of sliding up and down as
// a rigid band. Control points are placed so each quadratic passes through
// the sampled midpoint.
function clothPath(c, x0, y0, x1, y1, amp, phase) {
  const dx = x1 - x0;
  const top = (t01) => y0 + clothWave(t01, phase, amp);
  const bot = (t01) => y1 + clothWave(t01, phase + 0.9, amp);
  c.moveTo(x0, top(0));
  for (let i = 1; i <= 4; i++) {
    const a = (i - 1) / 4, b = i / 4, m = (a + b) / 2;
    c.quadraticCurveTo(x0 + dx * m, top(m) * 2 - (top(a) + top(b)) / 2, x0 + dx * b, top(b));
  }
  c.lineTo(x1, bot(1));
  for (let i = 4; i >= 1; i--) {
    const a = i / 4, b = (i - 1) / 4, m = (a + b) / 2;
    c.quadraticCurveTo(x0 + dx * m, bot(m) * 2 - (bot(a) + bot(b)) / 2, x0 + dx * b, bot(b));
  }
  c.closePath();
}

// Cream sheet, two dark cells on the diagonal, a travelling fold shadow,
// and the contour restated on top so the ripple keeps an edge over the dark
// cells at any size. The cells ride the local wave rather than sitting flat.
function chequerCloth(ctx, u, x0, y0, x1, y1, amp, phase, frame) {
  const cloth = (c) => clothPath(c, x0, y0, x1, y1, amp, phase);
  fineShape(ctx, '#e6e3da', u, cloth, 'rgba(30,22,14,0.5)', 0.028);
  ctx.save();
  ctx.beginPath();
  cloth(ctx);
  ctx.clip();
  const cw = (x1 - x0) / 2, ch = (y1 - y0) / 2;
  plain(ctx, '#2b2a30', (c) => {
    for (const [ix, iy] of [[0, 0], [1, 1]]) {
      const shift = clothWave((ix + 0.5) / 2, phase, amp);
      const ry = iy === 0 ? y0 - amp * 1.5 : y0 + ch;
      c.rect(x0 + ix * cw, ry + shift, cw, ch + amp * 1.5);
    }
  });
  plain(ctx, 'rgba(24,16,34,0.14)', (c) => {
    const bu = (0.1 + (frame / 8) * 0.9) % 1;
    c.rect(x0 + (x1 - x0) * bu - (x1 - x0) * 0.08, y0 - amp * 2, (x1 - x0) * 0.16, (y1 - y0) + amp * 4);
  });
  ctx.restore();
  ctx.beginPath();
  cloth(ctx);
  ctx.strokeStyle = 'rgba(30,22,14,0.5)';
  ctx.lineWidth = Math.max(0.2, u * 0.028);
  ctx.stroke();
}

// The shared pole: full height, teal, with a lit left edge. A flag without
// a hard vertical to hang off is a rectangle.
function flagPole(ctx, w, h, u) {
  fineShape(ctx, '#3ba894', u, (c) => rr(c, w * 0.09, h * 0.06, w * 0.14, h * 0.92, w * 0.055),
    'rgba(10,34,30,0.55)', 0.026);
  plain(ctx, 'rgba(230,255,248,0.45)', (c) => rr(c, w * 0.115, h * 0.16, w * 0.05, h * 0.3, w * 0.025));
}

// A closed path through `pts` with every corner rounded off: each point is used
// as a quadratic control and the curve passes through the midpoints between
// them. Straight segments between sampled points look identical to this at the
// size a prop is authored for and fall apart as facets the moment something
// draws it larger, because facet length scales with the draw and curvature
// does not. Repeat a point to hold a corner sharp.
function smoothClosedPath(c, pts) {
  const n = pts.length;
  if (n < 3) return;
  const mid = (i, j) => [(pts[i][0] + pts[j][0]) / 2, (pts[i][1] + pts[j][1]) / 2];
  const [sx, sy] = mid(n - 1, 0);
  c.moveTo(sx, sy);
  for (let i = 0; i < n; i++) {
    const [mx, my] = mid(i, (i + 1) % n);
    c.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  c.closePath();
}

// A doorway outline: two uprights closed by a semicircular head.
function archPath(c, x0, x1, top, bottom) {
  const r = (x1 - x0) / 2;
  c.moveTo(x0, bottom);
  c.lineTo(x0, top + r);
  c.arc(x0 + r, top + r, r, Math.PI, 0, false);
  c.lineTo(x1, bottom);
  c.closePath();
}

// ------------------------------------------------------------- cache
const cache = new Map();
const SS = 8; // supersample factor for the offscreen rasterization

// Which drawing the relay portal ships. Every place that paints a portal —
// the run, the tutorial, the credits hand-off, the menu legend — reads this,
// so swapping the art is one edit rather than four that can drift apart.
export const PORTAL_SPRITE = 'portalRings';
// Its aftermath: the strip played when a hero goes THROUGH one, and the strip
// played when one goes over the top. Both are cut to portalRings' geometry, so
// they are named next to it — swapping PORTAL_SPRITE to another candidate means
// cutting these two again, not just repointing them.
export const PORTAL_SPENT_SPRITE = 'portalRingsSpent';
export const PORTAL_WILT_SPRITE = 'portalRingsWilt';
// The box the portal is AUTHORED in. Every caller sizes off this rather than
// picking its own width: the old portal was an ellipse and did not care how it
// was stretched, but a cut with a taper and a jitter does — the credits were
// drawing it 22 wide by 40 tall, which is 1.7x the authored proportion, and it
// fattened every curve into a slab.
export const PORTAL_ART_W = 14, PORTAL_ART_H = 44;
export const portalArtWidth = (h) => Math.round(h * (PORTAL_ART_W / PORTAL_ART_H));

export function hasProp(name) { return !!PROP_PAINTERS[name]; }

// Props that animate: name -> how many frames the painter cycles through.
// Anything absent is static. Frames are rasterized and cached individually, so
// an animated prop costs one canvas per frame per size and still draws with a
// single drawImage — no per-frame vector work in the hot loop.
export const PROP_FRAMES = {
  cactus: 6, cactusBig: 6, snowman: 6, snowmanBig: 6, qcrate: 36, appliance: 96,
  buzzbird: 6,
  drone: 6, shooterDrone: 6, droneEye: DRONE_EYE_FRAMES,
  // Bake-off candidates. Eight frames for the ramps and flags — one chevron
  // cell and one cloth cycle respectively, so the loop point is the art's own
  // period rather than an arbitrary count. The portals get twelve: they are
  // the largest art in the set and a six-frame vortex strobes.
  boostPad: 8,
  springPad: 8,
  rampChevron: 8, rampWedge: 8, rampTurbine: 8, rampGate: 8,
  flagWave: 8, flagPennant: 8, flagBeacon: 8, flagPlug: 8,
  portalArch: 12, portalRift: 12, portalRings: 12, portalTube: 12,
  // Not loops. These two are STRIPS: frame 0 is the moment of the event and
  // the last frame is where the drawing rests until it scrolls off. drawPortal
  // clamps into them off a timer rather than cycling them off the clock.
  portalRingsSpent: PORTAL_SPEND_FRAMES, portalRingsWilt: PORTAL_WILT_FRAMES,
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
  // Bake-off candidates. The ramps run fast: a chevron chase reads as speed
  // only when it outruns the lane scroll. Cloth is the opposite — a flag
  // ripple at 16fps is a flutter, at 10 it is a wave. The portals sit in
  // between, slow enough that the vortex turns rather than flickers.
  boostPad: 16,
  springPad: 16,
  rampChevron: 16, rampWedge: 16, rampTurbine: 20, rampGate: 14,
  flagWave: 10, flagPennant: 10, flagBeacon: 10, flagPlug: 10,
  portalArch: 12, portalRift: 14, portalRings: 12, portalTube: 12,
};

// Visual overdraw: props drawn taller than their def box, bottom-anchored, so
// the art gains stature without touching the hitbox (hazards already render
// 1.33x their box — bigger art is generous, never unfair).
export const PROP_TALL = {
  cactus: 1.55, cactusBig: 1.4, snowman: 1.55, snowmanBig: 1.4,
  // Speed ramp candidates over the unchanged 14x4 boostPad box. This is the
  // entire proposal for three of the four: the pad cannot get wider without
  // lying about where the boost starts, so everything it gains it gains
  // upward. rampGate takes that furthest — 4.5 puts its art at roughly the
  // hero's own height, which is the point of it and also the objection to it.
  // The winner ships at 1.35, down from the 2.4 it was proposed at. 2.4 was
  // headroom for the thrown darts; 1.7 was that minus the darts; 1.35 is the
  // trench, which wants to be a groove in the floor rather than a kerb the
  // hero appears to be about to trip over. The hitbox is still 14x4.
  // 1.15, down again from 1.35. Nothing can be drawn BELOW the ground line, so
  // "deeper in the floor" only ever means "less of it standing above the
  // floor" — the depth is bought by making the whole mark flatter, not by
  // moving it down. The hitbox is still 14x4.
  boostPad: 1.15,
  // A spring stands ON the floor rather than in it, and the whole point of the
  // mark is the height it promises. 3.2 over the 16x6 hitbox gives it 19px of
  // visible machine above a lane the hero is 14px tall in.
  springPad: 3.2,
  rampChevron: 1.15, rampWedge: 3, rampTurbine: 3.25, rampGate: 4.5,
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
  // Bake-off candidates. The ramps and flags are small enough to need the
  // double box — a flag's chequer at 5px and a chevron's inner notch are
  // exactly the marks this table exists to keep. The portals are NOT here on
  // purpose: at 14x44 they are already the biggest vector art in the game, and
  // doubling them would quadruple a twelve-frame cache for detail SS is
  // already resolving.
  boostPad: 2, boostPadLegacy: 2,
  springPad: 2,
  rampChevron: 2, rampWedge: 2, rampTurbine: 2, rampGate: 2,
  flagWave: 2, flagPennant: 2, flagBeacon: 2, flagPlug: 2,
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
  // The battery keeps the HUD's 25:13 proportions inside a square 8x8 def box,
  // so its art only fills about half the box's height. Without this it reads as
  // a smaller pickup than the coin it spawns beside, which is backwards — it is
  // the more valuable of the two.
  //
  // Capped at 1.15 rather than pushed further, and the cap comes from the
  // HITBOX, not from taste. Overdraw on a HAZARD is generous — art wider than
  // the box means a hit that looked like it should have connected does not. On a
  // PICKUP the same overdraw runs the other way: art you can visibly touch
  // without collecting. The standard 4/3 inflation already puts this at ~11.5px
  // of drawing across an 8px box, about 1.8px of overhang a side, which is in
  // the same range as the coin beside it. 1.3 took it past 13px and made the
  // battery the one pickup whose nose you could run through for nothing.
  battery: 1.15,
  snowman: 1.15, snowmanBig: 1.15,
  drone: 1.35, shooterDrone: 1.35, buzzbird: 1.35, droneEye: 1.35,
};
export function propVisualScale(name) { return PROP_VISUAL_SCALE[name] || 1; }
// The largest any prop's art is scaled up from its box. Culling needs it: an
// entity whose BOX is off screen can still have ink on it, and the bound has to
// come from the art rather than from a number someone guessed once.
export function maxPropVisualScale() {
  let m = 1;
  for (const v of Object.values(PROP_VISUAL_SCALE)) if (v > m) m = v;
  return m;
}

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

// Props whose painter centres its art in the box instead of standing it on the
// box floor. Nearly everything here is a ground prop, so the draw path anchors
// art to the bottom — correct for a cactus, wrong for the battery, whose HUD
// proportions leave the box half empty ABOVE and BELOW the drawing. Anchored to
// the floor, that spare room all collects on top: the art rides ~3px high of its
// own hitbox, and anything the draw path centres on the box — the heal halo —
// centres 3px below the thing it is meant to be haloing.
const BOX_CENTRED_PROPS = new Set(['battery']);
export function propBoxCentred(name) { return BOX_CENTRED_PROPS.has(name); }

export function propFrames(name) { return PROP_FRAMES[name] || 1; }
export function propFps(name) { return PROP_FPS[name] || 11; }

// --- cache accounting -------------------------------------------------------
// Every entry in this cache is a canvas that is never freed, and every one of
// them is built lazily on the first frame that draws it. Both of those are
// things worth being able to see a number for: the resident total says how
// close a long session is to the canvas memory iOS will eventually take back,
// and a creation that happens while the visible world is being drawn IS the
// hitch — a 96-frame appliance walking on screen rasterizes a fresh canvas on
// ~96 consecutive frames.
//
// Resident bytes and creations are counted always: they only tick when a canvas
// is built, which is rare, and eviction will need the total. Hits and misses
// are per-draw and so are gated behind the profiler.
let cacheBytes = 0;
let cacheCreations = 0;
let cacheProfile = null;
// Set while the visible world is being painted, so a creation can be blamed on
// the frame the player was watching rather than on warm-up.
let inVisibleDraw = false;

export function setPropCacheProfile(on) {
  cacheProfile = on ? { hits: 0, misses: 0, creations: 0, visibleMisses: 0, bytes: 0 } : null;
}
// Session totals and per-window counters are named apart on purpose: they answer
// different questions (how much is resident overall vs what did THIS window
// build), and folding them into one `creations` key let the zeroed profile
// fallback silently overwrite the real total.
export function propCacheStats() {
  const p = cacheProfile;
  return {
    entries: cache.size,
    residentBytes: cacheBytes,
    creations: cacheCreations,
    hits: p ? p.hits : 0,
    misses: p ? p.misses : 0,
    windowCreations: p ? p.creations : 0,
    visibleMisses: p ? p.visibleMisses : 0,
    windowBytes: p ? p.bytes : 0,
  };
}
export function resetPropCacheProfile() { if (cacheProfile) setPropCacheProfile(true); }
// run.js brackets its world/actor painting with this. Anything built inside the
// bracket was art the game needed before it had been prepared.
export function setPropDrawPhase(on) { inVisibleDraw = on; }

// Drop every cached canvas whose prop is not named in `keepNames`. Keys all
// begin `name|`, so the prop is the prefix; glow and spark entries are keyed by
// colour rather than by prop and are a few KB each, so they stay.
//
// This exists because warming a stage up front is the opposite trade from
// building art lazily: it removes the hitch and raises the resident total, and
// nothing here was ever freed. One stage is ~56MB of canvas, and the code has
// a comment elsewhere about iOS reclaiming canvas memory out from under a page
// that holds too much — so the ceiling has to be a real one.
export function evictPropsExcept(keepNames) {
  let freed = 0;
  for (const [key, c] of cache) {
    const cut = key.indexOf('|');
    const name = cut < 0 ? key : key.slice(0, cut);
    if (name === 'glow' || name === 'spark' || keepNames.has(name)) continue;
    freed += c.width * c.height * 4;
    cache.delete(key);
  }
  cacheBytes -= freed;
  return freed;
}

function cacheGet(key) {
  const hit = cache.get(key);
  if (cacheProfile) { if (hit) cacheProfile.hits++; else cacheProfile.misses++; }
  return hit;
}

function cacheSet(key, c) {
  cacheBytes += c.width * c.height * 4;
  cacheCreations++;
  if (cacheProfile) {
    cacheProfile.creations++;
    cacheProfile.bytes += c.width * c.height * 4;
    if (inVisibleDraw) cacheProfile.visibleMisses++;
  }
  cache.set(key, c);
  return c;
}

// Rasterize any vector painter into the shared cache at SS x its logical size.
// The key is the caller's whole identity — name, size, and anything else that
// changes the pixels (a frame index here, a palette id in sprites/arcade.js).
export function rasterize(key, w, h, paintFn) {
  const hit = cacheGet(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * SS));
  c.height = Math.max(1, Math.round(h * SS));
  const x = c.getContext('2d');
  x.scale(SS, SS);
  x.lineJoin = 'round';
  x.lineCap = 'round';
  paintFn(x, w, h);
  cacheSet(key, c);
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
  const hit = cacheGet(key);
  if (hit) return hit;
  const src = propSprite(name, w, h, f);
  if (!src) return null;
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  cacheSet(key, c);
  return c;
}

// Union of two offset silhouettes in one cached canvas — the hazard rim
// becomes a single drawImage per color instead of two.
export function propRimPair(name, w, h, color, axis, frame = 0) {
  const f = frame % propFrames(name);
  const key = `${name}|${w}x${h}|rim|${color}|${axis}|${f}`;
  const hit = cacheGet(key);
  if (hit) return hit;
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
  cacheSet(key, c);
  return c;
}

// Soft radial glow (for power capsules and other shiny things) — cached.
export function glowSprite(color, r = 16) {
  const key = `glow|${color}|${r}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = r * 2 * 4;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(r * 4, r * 4, r, r * 4, r * 4, r * 4);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, c.width, c.height);
  cacheSet(key, c);
  return c;
}

// A soft 4-point sparkle (for coin twinkles and anything shiny) — cached.
export function sparkSprite(color) {
  const key = `spark|${color}`;
  const hit = cacheGet(key);
  if (hit) return hit;
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
  cacheSet(key, c);
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

// A rare visualiser-only appliance finish still uses the original vector
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
