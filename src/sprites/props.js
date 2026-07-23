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

// ------------------------------------------------------------- painters
// Each: (ctx, w, h) drawing inside [0..w] x [0..h]. Ground props sit on h.
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
    rr(ctx, cx - w * 0.225, headY - h * 0.15, w * 0.195, h * 0.185, h * 0.032);
    rr(ctx, cx + w * 0.03, headY - h * 0.15, w * 0.195, h * 0.185, h * 0.032);
    ctx.fillStyle = '#f7fbff';
    ctx.fill();
    ctx.strokeStyle = glassesColor;
    ctx.lineWidth = glassesLine;
    ctx.lineJoin = 'round';
    ctx.stroke();
    plain(ctx, '#172238', (c) => {
      c.ellipse(cx - w * 0.148, headY - h * 0.045, w * 0.034, h * 0.048, -0.12, 0, Math.PI * 2);
      c.ellipse(cx + w * 0.087, headY - h * 0.025, w * 0.034, h * 0.048, 0.18, 0, Math.PI * 2);
    });
    plain(ctx, '#fff', (c) => {
      c.arc(cx - w * 0.16, headY - h * 0.07, w * 0.011, 0, Math.PI * 2);
      c.arc(cx + w * 0.075, headY - h * 0.052, w * 0.011, 0, Math.PI * 2);
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
  drone(ctx, w, h) {
    const u = Math.max(w, h);
    stroke(ctx, 'rgba(200,200,216,0.75)', Math.max(0.5, h * 0.12), (c) => { c.moveTo(w * 0.06, h * 0.16); c.lineTo(w * 0.94, h * 0.16); });
    fineShape(ctx, '#8858c8', u, (c) => rr(c, w * 0.14, h * 0.3, w * 0.72, h * 0.56, h * 0.26));
    plain(ctx, '#f6d33c', (c) => c.arc(w * 0.36, h * 0.56, h * 0.14, 0, Math.PI * 2));
    plain(ctx, '#c8b8e8', (c) => rr(c, w * 0.56, h * 0.44, w * 0.22, h * 0.16, h * 0.06));
    stroke(ctx, '#5a3890', Math.max(0.5, h * 0.1), (c) => { c.moveTo(w * 0.28, h * 0.16); c.lineTo(w * 0.34, h * 0.32); c.moveTo(w * 0.72, h * 0.16); c.lineTo(w * 0.66, h * 0.32); });
  },
  shooterDrone(ctx, w, h) {
    PROP_PAINTERS.drone(ctx, w, h);
    plain(ctx, '#e04848', (c) => c.arc(w * 0.5, h * 0.86, Math.max(w, h) * 0.08, 0, Math.PI * 2)); // muzzle
  },
  buzzbird(ctx, w, h) {
    const u = Math.max(w, h);
    fineShape(ctx, '#f0a860', u, (c) => c.ellipse(w * 0.28, h * 0.42, w * 0.24, h * 0.34, -0.3, 0, Math.PI * 2)); // wing
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
  appliance(ctx, w, h, frame = 0) {
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
    const toastPhase = (frame % 96) * Math.PI / 48 + Math.PI / 6;
    // Spend most of the slow cycle raised, dip fully into the slot only
    // briefly, then return. Frame zero starts visibly raised in static views.
    const toastOpen = Math.pow(Math.max(0, 0.5 + Math.cos(toastPhase) * 0.5), 0.35);
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
    fineShape('#a97816', (c) => {
      c.moveTo(w * 0.16, h * 0.36);
      c.quadraticCurveTo(w * 0.17, h * 0.35, w * 0.2, h * 0.36);
      c.lineTo(w * 0.31, h * 0.39);
      c.lineTo(w * 0.32, h * 0.92);
      c.lineTo(w * 0.21, h * 0.9);
      c.quadraticCurveTo(w * 0.16, h * 0.88, w * 0.16, h * 0.82);
      c.lineTo(w * 0.16, h * 0.36);
      c.closePath();
    });
    fineShape('#f4c934', (c) => {
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
    fineShape('#ffe16a', (c) => {
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
  goldTrophy(ctx, w, h) {
    const u = Math.max(w, h);
    shape(ctx, '#f6d33c', u, (c) => {
      c.moveTo(w * 0.24, h * 0.08); c.lineTo(w * 0.76, h * 0.08);
      c.quadraticCurveTo(w * 0.72, h * 0.56, w * 0.5, h * 0.6);
      c.quadraticCurveTo(w * 0.28, h * 0.56, w * 0.24, h * 0.08);
      c.closePath();
    });
    plain(ctx, '#c8a020', (c) => { rr(c, w * 0.42, h * 0.58, w * 0.16, h * 0.22, w * 0.03); rr(c, w * 0.26, h * 0.8, w * 0.48, h * 0.16, w * 0.05); });
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
};
const PROP_FPS = { qcrate: 12, appliance: 24 };

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
  buzzbird: 2, drone: 2, shooterDrone: 2,
  printer: 2, chair: 2,
  coin: 2, battery: 2,
  capShield: 2, capMagnet: 2, capStar: 2, capAirJump: 2,
  capSpeed: 2, capLowGrav: 2, capUnpeel: 2, capRelay: 2,
  appliance: 2, cord: 2, resident: 2, dustdevil: 2,
};
export function propDetailScale(name) { return PROP_DETAIL_SCALE[name] || 1; }

// World-only visual size. Snowmen overdraw their unchanged collision boxes a
// little farther so they feel substantial without making their jumps harder.
const PROP_VISUAL_SCALE = { snowman: 1.15, snowmanBig: 1.15 };
export function propVisualScale(name) { return PROP_VISUAL_SCALE[name] || 1; }

// Refined props carry their own high-resolution hairline. The shared two-pass
// hazard rim would sit outside it as a second broad border at desktop scale,
// undoing the lighter authored contour.
const SELF_OUTLINED_PROPS = new Set([
  'cactus', 'cactusBig', 'snowman', 'snowmanBig',
  'crate', 'pipe', 'zombieWalk', 'icicle',
  'buzzbird', 'drone', 'shooterDrone', 'printer', 'chair',
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
