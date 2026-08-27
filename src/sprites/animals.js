// Animals: the four quadruped hazards — three dogs and a cat — that run at the
// hero and have to be jumped.
//
// Deliberately self-contained. It imports nothing from sprites/props.js, which
// is the module that REGISTERS these painters: props.js spreads the five tables
// at the bottom of this file into its own and nothing else about it moves, so
// the two files can be worked on at once without ever touching the same lines.
// The cost is the ~30 lines of drawing primitives below, which duplicate
// props.js's private ones. That is the price of the merge surface being one
// line per table, and it is worth paying — the alternative is exporting them
// from props.js and buying a circular import between the two.
//
// Everything here draws FACING LEFT. Obstacles scroll right-to-left into a hero
// who runs right, so left is toward him; and unlike the heroes, world props are
// never mirrored at draw time (drawWorldEntity in game/draw.js draws the raster
// as-is), so the orientation has to be baked into the art.
//
// The four are built on ONE rig — the same skeleton, gait solver and head
// assembly — parameterised per breed. Four hand-drawn quadrupeds would drift
// apart the first time the run cycle was retimed; one rig with four parameter
// blocks means a fix to how a hock breaks is a fix to all of them.

// --------------------------------------------------------------- primitives
// Same ink as every other prop, so an animal standing beside a crate is drawn
// in the same hand. See sprites/props.js OUTLINE — the value is repeated rather
// than imported for the reason in the header.
const OUTLINE = 'rgba(26,16,40,0.34)';

// The hairline contour. Weight is a fraction of the raster's own size, so it
// thins as the sprite is rasterized larger instead of turning into the broad
// dark border a fixed width would give — the same trade the heroes' contour
// makes (see CONTOUR_TAPER in sprites/toons.js).
function ink(ctx, fill, u, pathFn, color = OUTLINE, scale = 0.019) {
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

// Fill with no contour: interior markings, shading, anything that sits INSIDE
// an already-inked silhouette and would read as a second edge if outlined.
function fill(ctx, col, pathFn) {
  ctx.beginPath();
  pathFn(ctx);
  ctx.fillStyle = col;
  ctx.fill();
}

function line(ctx, col, w, pathFn) {
  ctx.beginPath();
  pathFn(ctx);
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

// A limb segment: a round-capped taper from wide at the joint to narrow at the
// end. Drawn as a filled quad with arc caps rather than a stroked line, because
// a stroke cannot taper and an untapered dog leg reads as a pipe.
function bone(ctx, u, ax, ay, bx, by, wa, wb, col) {
  const dx = bx - ax, dy = by - ay;
  const d = Math.hypot(dx, dy) || 1e-4;
  const nx = -dy / d, ny = dx / d;
  ink(ctx, col, u, (c) => {
    c.moveTo(ax + nx * wa, ay + ny * wa);
    c.lineTo(bx + nx * wb, by + ny * wb);
    c.arc(bx, by, wb, Math.atan2(ny, nx), Math.atan2(-ny, -nx), false);
    c.lineTo(ax - nx * wa, ay - ny * wa);
    c.arc(ax, ay, wa, Math.atan2(-ny, -nx), Math.atan2(ny, nx), false);
    c.closePath();
  });
}

// Two-bone IK: given the hip and where the foot has to land, find the joint.
// `bend` (+1/-1) picks which side the joint breaks toward, and it is the one
// number separating a dog's forward-breaking elbow from its backward-breaking
// hock. Get it wrong on the hind pair and the animal reads as a table.
function joint(hx, hy, fx, fy, l1, l2, bend) {
  const dx = fx - hx, dy = fy - hy;
  const d = Math.hypot(dx, dy) || 1e-4;
  // Clamp just inside full extension: at exactly l1+l2 the square root below is
  // zero and the joint snaps dead straight for one frame, which pops.
  const dd = Math.min(d, (l1 + l2) * 0.995);
  const a = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd);
  const hgt = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const ux = dx / d, uy = dy / d;
  return { x: hx + ux * a - uy * hgt * bend, y: hy + uy * a + ux * hgt * bend };
}

const TAU = Math.PI * 2;

// ------------------------------------------------------------------- the rig
// Frame count is shared by every animal and by ANIMAL_FRAMES below. A painter
// that cycles on a different count from the table it is rasterized against
// jumps at the loop seam, so the two read one constant.
const FRAMES = 8;

// Where each foot is in the cycle. A gallop is not a walk: the pairs move
// nearly together and the whole animal leaves the ground once per cycle, so
// the two feet of a pair sit a sliver apart rather than half a cycle apart.
// Near/far offsets are what stop the legs stacking into one silhouette.
const GAIT = {
  frontNear: 0.00,
  frontFar: 0.13,
  hindNear: 0.47,
  hindFar: 0.60,
};

// One foot's position for a phase. The foot travels a flattened ellipse:
// backward along the ground while it carries weight, forward through the air
// while it does not. `reach` is the stride, `lift` how high it picks up.
function footAt(p, cx, ground, reach, lift) {
  const a = p * TAU;
  const s = Math.sin(a);
  return {
    x: cx + Math.cos(a) * reach,
    // Only the airborne half lifts; the planted half stays pinned to the floor
    // so the animal does not appear to skate.
    y: ground - Math.max(0, s) * lift,
  };
}

// --------------------------------------------------------------- the breeds
// Every number is a fraction of the painter's box, so a breed is a shape rather
// than a size and the same block draws correctly at 16px and at 400.
//
// `bend` pairs are (front, hind). Front elbows break BACKWARD relative to
// travel and hind hocks break FORWARD; because the art faces left, that comes
// out as the signs below.
const BREEDS = {
  // ---- the lean one. Cropped ears, whip tail, all reach and no bulk: the
  // silhouette is a wedge pointed at the hero. Reads fastest of the three at
  // gameplay size because the legs are thin enough to see daylight between.
  dogSnarler: {
    coat: '#3a3446', coatHi: '#4a4258', coatLo: '#26212f', belly: '#a87a4c', mark: '#b07840',
    ear: 'crop', tail: 'whip', hackles: 0, ribs: 0, collar: 'spiked',
    leg: 0.44, chest: 0.33, arch: 0.02, tuck: 0.075,
    shoulderX: 0.430, hipX: 0.800, headX: 0.290, headR: 0.128, headY: 0.365,
    muzzle: 0.115, jawDrop: 0.55, neck: 0.26,
    reach: 0.105, lift: 0.105, bob: 0.042, flex: 0.026,
    boneUp: 0.036, boneLo: 0.024, paw: 0.030, haunch: 0.105,
    teeth: 1.0, eye: '#f6d33c',
  },
  // ---- the bruiser. Low, wide, front-heavy: a head and a chest with a dog
  // attached behind. Short legs mean short reach, so the gait is a busy chop
  // rather than a lope, which is what makes it read as the heavy one.
  dogBruiser: {
    coat: '#c08a4a', coatHi: '#d09b5c', coatLo: '#95622f', belly: '#ecd6b2', mark: '#6a4420',
    ear: 'flop', tail: 'stub', hackles: 0, ribs: 0, collar: 'spiked',
    leg: 0.33, chest: 0.42, arch: -0.015, tuck: 0.028,
    shoulderX: 0.430, hipX: 0.815, headX: 0.272, headR: 0.150, headY: 0.320,
    muzzle: 0.070, jawDrop: 0.70, neck: 0.15,
    reach: 0.072, lift: 0.070, bob: 0.028, flex: 0.015,
    boneUp: 0.050, boneLo: 0.034, paw: 0.040, haunch: 0.125,
    teeth: 1.45, eye: '#e04848',
  },
  // ---- the feral one. Tall, gaunt, hackles up the whole spine and ribs
  // showing. The only dog drawn with its back ARCHED, which with the raised
  // hackles is most of why it reads as the dangerous one rather than merely
  // the big one.
  dogFeral: {
    coat: '#6a6a74', coatHi: '#7c7c86', coatLo: '#45454f', belly: '#a09a94', mark: '#2e2e36',
    ear: 'prick', tail: 'brush', hackles: 1, ribs: 1, collar: 'none',
    leg: 0.48, chest: 0.31, arch: 0.030, tuck: 0.095,
    shoulderX: 0.440, hipX: 0.805, headX: 0.305, headR: 0.126, headY: 0.360,
    muzzle: 0.130, jawDrop: 0.62, neck: 0.30,
    reach: 0.112, lift: 0.120, bob: 0.048, flex: 0.032,
    boneUp: 0.034, boneLo: 0.022, paw: 0.029, haunch: 0.100,
    teeth: 1.15, eye: '#f0f0f8',
  },
  // ---- the cat. Not a small dog: the spine ARCHES hard at the middle rather
  // than at the withers, the tail bottlebrushes straight up, the ears go FLAT
  // to the skull and the fur stands the length of the back. Those four are the
  // entire difference between a cat that is angry and a cat that is walking.
  catFury: {
    coat: '#332f3f', coatHi: '#413d50', coatLo: '#201d2a', belly: '#63607a', mark: '#8a86a0',
    ear: 'flat', tail: 'bottlebrush', hackles: 1, ribs: 0, collar: 'none',
    leg: 0.38, chest: 0.27, arch: 0.085, tuck: 0.085,
    shoulderX: 0.430, hipX: 0.780, headX: 0.235, headR: 0.118, headY: 0.345,
    muzzle: 0.048, jawDrop: 0.62, neck: 0.14,
    reach: 0.082, lift: 0.105, bob: 0.042, flex: 0.036,
    boneUp: 0.029, boneLo: 0.019, paw: 0.026, haunch: 0.095,
    teeth: 0.85, eye: '#7ce8a0',
  },
};

// ------------------------------------------------------------------ the head
// Skull, muzzle, hinged lower jaw, teeth, tongue, eye and brow. Split out
// because it is the half that carries "vicious" — the body only carries speed.
function head(ctx, w, h, u, P, hx, hy, R, gape, tilt) {
  const M = w * P.muzzle;          // how far the muzzle runs past the skull
  const sn = Math.sin(tilt), cs = Math.cos(tilt);
  // Rotate a point around the skull centre so the whole head can lean into the
  // stride without every feature needing its own trigonometry.
  const T = (dx, dy) => ({ x: hx + dx * cs - dy * sn, y: hy + dx * sn + dy * cs });

  const noseT = T(-R - M, -R * 0.18);        // tip of the nose
  const lipT = T(-R - M * 0.92, R * 0.10);   // where the upper lip ends
  const chin = T(-R - M * 0.72, R * (0.30 + 0.62 * gape * P.jawDrop));
  const jawHinge = T(R * 0.20, R * 0.46);

  // --- ears, drawn FIRST so the skull crosses their roots ------------------
  // Deliberately oversized. At a 16px box an ear drawn to life proportions is
  // two pixels of the same colour as the head behind it and simply is not
  // there; these are drawn about half again as large and the FAR one is dropped
  // to coatLo, so the pair separates into two shapes instead of one lump.
  // far shell, near shell, then the near one's inner surface. The inner is its
  // OWN path rather than a scaled copy of the outer: scaling a copy left one
  // vertex unscaled, which at any real inset still spanned the full ear and
  // painted the whole thing `mark` — the ear became a solid brown blade.
  const earPair = (near, far, inner) => {
    ink(ctx, P.coatLo, u, far);
    ink(ctx, P.coat, u, near);
    if (inner) fill(ctx, P.mark, inner);
  };
  if (P.ear === 'crop') {
    // Cropped to a blade and standing straight up — the shape that says this
    // dog belongs to someone who wanted it to look like this.
    const mk = (o, k = 1) => (c) => {
      const b = T(R * (0.42 - o), -R * 0.58);
      c.moveTo(b.x + R * 0.06 * (1 - k), b.y - R * 0.06 * (1 - k));
      c.lineTo(b.x + R * 0.24 * k, b.y - R * 1.30 * k);
      c.lineTo(b.x + R * 0.56 * k, b.y - R * 0.96 * k);
      c.lineTo(b.x + R * 0.58 * k, b.y - R * 0.10 * k);
      c.closePath();
    };
    earPair(mk(0.30), mk(0.02), mk(0.30, 0.52));
  } else if (P.ear === 'prick') {
    // Swept back — a wolf's ears go back before it commits, and forward ears on
    // a charging animal read as curious rather than as intent.
    const mk = (o, k = 1) => (c) => {
      const b = T(R * (0.30 - o), -R * 0.58);
      c.moveTo(b.x, b.y);
      c.lineTo(b.x + R * 1.24 * k, b.y - R * 0.98 * k);
      c.lineTo(b.x + R * 1.06 * k, b.y - R * 0.26 * k);
      c.lineTo(b.x + R * 0.60 * k, b.y + R * 0.10 * k);
      c.closePath();
    };
    earPair(mk(0.20), mk(-0.06), mk(0.20, 0.55));
  } else if (P.ear === 'flop') {
    // Folded forward and hanging. Only the near one is worth drawing: the far
    // ear on a flop breed is entirely behind the skull.
    const b = T(R * 0.34, -R * 0.50);
    ink(ctx, P.coatLo, u, (c) => {
      c.moveTo(b.x - R * 0.10, b.y - R * 0.10);
      c.quadraticCurveTo(b.x + R * 1.20, b.y - R * 0.30, b.x + R * 1.02, b.y + R * 0.95);
      c.quadraticCurveTo(b.x + R * 0.46, b.y + R * 1.30, b.x + R * 0.10, b.y + R * 0.42);
      c.closePath();
    });
    fill(ctx, P.mark, (c) => {
      c.moveTo(b.x + R * 0.22, b.y + R * 0.10);
      c.quadraticCurveTo(b.x + R * 0.86, b.y + R * 0.06, b.x + R * 0.74, b.y + R * 0.80);
      c.quadraticCurveTo(b.x + R * 0.40, b.y + R * 0.92, b.x + R * 0.22, b.y + R * 0.10);
      c.closePath();
    });
  } else {
    // 'flat' — pinned back flush along the skull. The cat's whole warning, and
    // the reason the head silhouette goes narrow instead of gaining triangles.
    const mk = (o, k = 1) => (c) => {
      const b = T(R * (0.14 - o), -R * 0.78);
      c.moveTo(b.x, b.y);
      c.lineTo(b.x + R * 1.30 * k, b.y + R * 0.12 * k);
      c.lineTo(b.x + R * 1.02 * k, b.y + R * 0.42 * k);
      c.lineTo(b.x + R * 0.28 * k, b.y + R * 0.40 * k);
      c.closePath();
    };
    earPair(mk(-0.30), mk(0.02), null);
    // A tuft in front of each, so the flattened ear still has an edge to catch
    // against the skull it is pressed to.
    line(ctx, P.mark, Math.max(0.2, R * 0.09), (c) => {
      const b = T(R * 0.16, -R * 0.74);
      c.moveTo(b.x + R * 0.30, b.y + R * 0.06);
      c.lineTo(b.x + R * 1.02, b.y + R * 0.16);
    });
  }

  // --- lower jaw, behind the skull so the gape opens downward --------------
  ink(ctx, P.coatLo, u, (c) => {
    c.moveTo(jawHinge.x, jawHinge.y);
    c.quadraticCurveTo(chin.x + R * 0.30, chin.y + R * 0.16, chin.x, chin.y);
    c.quadraticCurveTo(chin.x + R * 0.36, chin.y - R * 0.30, jawHinge.x - R * 0.10, jawHinge.y - R * 0.18);
    c.closePath();
  });
  // The mouth's dark interior, sitting between the jaws.
  fill(ctx, '#4a1424', (c) => {
    c.moveTo(lipT.x, lipT.y);
    c.lineTo(chin.x + R * 0.06, chin.y - R * 0.06);
    c.lineTo(jawHinge.x, jawHinge.y - R * 0.06);
    c.lineTo(jawHinge.x - R * 0.06, jawHinge.y - R * 0.34);
    c.closePath();
  });
  // Tongue: a curl in the gape. Only drawn once the mouth is open enough to
  // hold it, otherwise it prints as a red smear on the chin.
  if (gape > 0.35) {
    fill(ctx, '#e8607c', (c) => {
      const t0 = T(R * 0.02, R * (0.34 + 0.44 * gape));
      c.moveTo(t0.x, t0.y);
      c.quadraticCurveTo(t0.x - R * 0.70, t0.y + R * 0.30, t0.x - R * 0.94, t0.y - R * 0.12);
      c.quadraticCurveTo(t0.x - R * 0.60, t0.y + R * 0.14, t0.x, t0.y + R * 0.22);
      c.closePath();
    });
  }
  // Lower fangs, pointing up out of the jaw.
  const tk = R * 0.20 * P.teeth;
  fill(ctx, '#fbf6ec', (c) => {
    const a = T(-R - M * 0.62, R * (0.24 + 0.60 * gape * P.jawDrop));
    const b = T(-R - M * 0.20, R * (0.30 + 0.60 * gape * P.jawDrop));
    c.moveTo(a.x - tk * 0.5, a.y); c.lineTo(a.x, a.y - tk * 1.7); c.lineTo(a.x + tk * 0.5, a.y); c.closePath();
    c.moveTo(b.x - tk * 0.45, b.y); c.lineTo(b.x, b.y - tk * 1.35); c.lineTo(b.x + tk * 0.45, b.y); c.closePath();
  });

  // --- skull + muzzle, one silhouette --------------------------------------
  const brow = T(R * 0.10, -R * 0.94);
  const cheek = T(R * 0.92, R * 0.30);
  ink(ctx, P.coat, u, (c) => {
    c.moveTo(cheek.x, cheek.y);
    c.quadraticCurveTo(brow.x + R * 0.70, brow.y - R * 0.16, brow.x, brow.y);
    // The stop — the step from skull down onto the bridge of the muzzle. It is
    // the single line that says dog rather than bear.
    const stop = T(-R * 0.34, -R * 0.56);
    c.quadraticCurveTo(stop.x + R * 0.28, stop.y - R * 0.22, stop.x, stop.y);
    c.lineTo(noseT.x + R * 0.10, noseT.y - R * 0.22);
    c.quadraticCurveTo(noseT.x - R * 0.10, noseT.y - R * 0.10, noseT.x, noseT.y + R * 0.06);
    c.lineTo(lipT.x, lipT.y);
    c.quadraticCurveTo(T(-R * 0.20, R * 0.34).x, T(-R * 0.20, R * 0.34).y, jawHinge.x - R * 0.02, jawHinge.y - R * 0.30);
    c.quadraticCurveTo(cheek.x - R * 0.10, cheek.y + R * 0.14, cheek.x, cheek.y);
    c.closePath();
  });

  // Upper fangs, hanging down over the lip. These sit ON the muzzle silhouette,
  // which is why they are drawn after it rather than with the lower pair.
  fill(ctx, '#fbf6ec', (c) => {
    const a = T(-R - M * 0.78, R * 0.06);
    const b = T(-R - M * 0.30, R * 0.14);
    c.moveTo(a.x - tk * 0.5, a.y); c.lineTo(a.x, a.y + tk * 1.8); c.lineTo(a.x + tk * 0.5, a.y); c.closePath();
    c.moveTo(b.x - tk * 0.45, b.y); c.lineTo(b.x, b.y + tk * 1.4); c.lineTo(b.x + tk * 0.45, b.y); c.closePath();
  });

  // Muzzle top-plane lightening, so the head has a lit side like the heroes do.
  fill(ctx, 'rgba(255,246,232,0.13)', (c) => {
    const s = T(-R * 0.30, -R * 0.52);
    c.moveTo(s.x, s.y);
    c.lineTo(noseT.x + R * 0.10, noseT.y - R * 0.20);
    c.lineTo(noseT.x + R * 0.20, noseT.y + R * 0.02);
    c.quadraticCurveTo(s.x + R * 0.20, s.y + R * 0.26, s.x, s.y);
    c.closePath();
  });

  // Nose.
  ink(ctx, '#1c1620', u, (c) => {
    const n = T(-R - M * 0.94, -R * 0.10);
    c.ellipse(n.x, n.y, R * 0.19, R * 0.15, tilt + 0.3, 0, TAU);
  });

  // Eye: narrowed to a slit and set well back. A round eye on any of these
  // reads as startled; the whole expression is in how little sclera shows.
  const ey = T(-R * 0.10, -R * 0.24);
  ink(ctx, '#fdfaf4', u, (c) => c.ellipse(ey.x, ey.y, R * 0.27, R * 0.155, tilt - 0.22, 0, TAU), OUTLINE, 0.012);
  fill(ctx, '#150f1c', (c) => c.ellipse(ey.x - R * 0.05, ey.y + R * 0.01, R * 0.115, R * 0.115, 0, 0, TAU));
  fill(ctx, P.eye, (c) => c.ellipse(ey.x - R * 0.05, ey.y + R * 0.01, R * 0.145, R * 0.145, 0, 0, TAU));
  fill(ctx, '#150f1c', (c) => {
    // A vertical slit for the cat, a round pupil for the dogs — the cheapest
    // two-pixel difference that reads as a different animal.
    if (P.ear === 'flat') c.ellipse(ey.x - R * 0.05, ey.y + R * 0.01, R * 0.045, R * 0.125, 0, 0, TAU);
    else c.ellipse(ey.x - R * 0.05, ey.y + R * 0.01, R * 0.075, R * 0.075, 0, 0, TAU);
  });
  fill(ctx, 'rgba(255,255,255,0.85)', (c) => c.ellipse(ey.x - R * 0.11, ey.y - R * 0.06, R * 0.045, R * 0.04, 0, 0, TAU));

  // Brow: a heavy wedge driven down toward the nose. Same trick the heroes use
  // (see BROW_W in sprites/toons.js) — the brow is where the expression lives,
  // so it is drawn at more weight than anything else on the face.
  line(ctx, '#15101e', Math.max(0.35, R * 0.17), (c) => {
    const b0 = T(-R * 0.44, -R * 0.30), b1 = T(R * 0.30, -R * 0.62);
    c.moveTo(b0.x, b0.y); c.lineTo(b1.x, b1.y);
  });

  // Muzzle wrinkle — two short flicks over the nose. Snarl, in two strokes.
  line(ctx, 'rgba(21,16,30,0.45)', Math.max(0.22, R * 0.075), (c) => {
    const p0 = T(-R * 0.62, -R * 0.30), p1 = T(-R * 0.46, -R * 0.14);
    c.moveTo(p0.x, p0.y); c.lineTo(p0.x + R * 0.24, p0.y - R * 0.12);
    c.moveTo(p1.x, p1.y); c.lineTo(p1.x + R * 0.22, p1.y - R * 0.10);
  });
}

// ------------------------------------------------------------------ the body
// One painter for every breed. `frame` drives the whole cycle; nothing else is
// stateful, which is what lets the rasterizer cache each frame by index.
function quadruped(ctx, w, h, frame, P) {
  const u = Math.max(w, h);
  const p0 = (frame % FRAMES) / FRAMES;
  const ground = h * 0.995;

  // Body rise and spine flex. The gallop's suspension is once per cycle, so
  // both ride a single sine rather than a doubled one.
  const bob = -Math.sin(p0 * TAU + Math.PI * 0.35) * h * P.bob;
  const flex = Math.cos(p0 * TAU) * h * P.flex;

  const legLen = h * P.leg;
  const bellyY = ground - legLen + bob;
  const withersY = bellyY - h * P.chest + bob * 0.2;
  const shX = w * P.shoulderX, hpX = w * P.hipX;
  // Shoulder and hip counter-move: the animal gathers and extends along its own
  // length. Without this the legs cycle under a body that is rigid, which is
  // the single clearest tell of a cheap run cycle.
  const shoulder = { x: shX - flex * 0.5, y: bellyY - h * P.chest * 0.62 };
  const hip = { x: hpX + flex * 0.5, y: bellyY - h * P.chest * 0.50 };
  const rumpX = hpX + w * 0.075;
  const chestX = shX - w * 0.105;
  // Where the spine peaks. On the dogs that is the withers; on the cat the arch
  // is at the MIDDLE of the back, which is the whole silhouette of a cat that
  // has decided about you.
  const midX = (shX + hpX) / 2;
  // A quadratic's apex reaches only HALF way to its control point, so the
  // control sits at twice the arch we actually want. The same trap the hero
  // hair crown hit (see hairCrown in sprites/toons.js) — without the doubling
  // the cat's back humps by half what the parameter says and reads as a dog.
  const archCtrlY = withersY - h * P.arch * 2;
  // Where the spine actually is at t along the back, so the hackle ridge can
  // sit ON it rather than float over the arched breeds.
  const spineAt = (t) => {
    const a = withersY - h * P.arch * 0.55, b = archCtrlY, cc = withersY + h * 0.012;
    const mt = 1 - t;
    return mt * mt * a + 2 * mt * t * b + t * t * cc;
  };

  // ---- far pair, behind everything ---------------------------------------
  hindLeg(ctx, u, w, h, P, GAIT.hindFar, p0, hip, ground, P.coatLo, 0.9);
  frontLeg(ctx, u, w, h, P, GAIT.frontFar, p0, shoulder, ground, P.coatLo, 0.9);

  // ---- tail ---------------------------------------------------------------
  const wag = Math.sin(p0 * TAU * 2) * h * 0.045;
  const tb = { x: rumpX - w * 0.01, y: withersY + h * 0.055 };
  if (P.tail === 'whip') {
    // Streaming straight back and slightly up, the way a tail does at speed.
    ink(ctx, P.coat, u, (c) => {
      c.moveTo(tb.x - w * 0.01, tb.y + h * 0.055);
      c.quadraticCurveTo(tb.x + w * 0.14, tb.y - h * 0.02 + wag, tb.x + w * 0.20, tb.y - h * 0.30 + wag * 1.5);
      c.quadraticCurveTo(tb.x + w * 0.10, tb.y - h * 0.04 + wag, tb.x - w * 0.03, tb.y + h * 0.01);
      c.closePath();
    });
  } else if (P.tail === 'stub') {
    ink(ctx, P.coat, u, (c) => c.ellipse(tb.x + w * 0.015, tb.y + h * 0.01, w * 0.042, h * 0.062, -0.55, 0, TAU));
  } else if (P.tail === 'brush') {
    // A shaggy sweep. The fur is in the outline's own wobble rather than in
    // drawn hairs, which vanish at 17px anyway.
    ink(ctx, P.coat, u, (c) => {
      c.moveTo(tb.x - w * 0.01, tb.y + h * 0.07);
      c.quadraticCurveTo(tb.x + w * 0.15, tb.y + h * 0.02 + wag, tb.x + w * 0.185, tb.y - h * 0.26 + wag);
      c.quadraticCurveTo(tb.x + w * 0.15, tb.y - h * 0.12 + wag, tb.x + w * 0.10, tb.y - h * 0.10 + wag);
      c.quadraticCurveTo(tb.x + w * 0.08, tb.y - h * 0.02 + wag, tb.x - w * 0.03, tb.y + h * 0.02);
      c.closePath();
    });
  } else {
    // Bottlebrush. Built as a tapered CORE with fur spikes radiating off it,
    // not as one outline: the first two passes both tried to trace the whole
    // furry silhouette in a single closed path, and a single path with that
    // many reversals closes into a lumpy column detached from the animal.
    //
    // Rooted deliberately INSIDE the rump so the base is buried under the body
    // rather than butted against it. A tail that merely touches the croup shows
    // daylight at the join on whichever frame the hip swings back.
    const root = { x: rumpX - w * 0.045, y: withersY + h * 0.075 };
    const TIP = Math.min(h * 0.50, root.y - h * 0.06);
    // Leans back over the animal rather than standing like a flagpole.
    const sx = (t) => root.x + w * 0.075 * t * t + wag * t * 0.8;
    const sy = (t) => root.y - TIP * t;
    // Fur first, so the core covers its roots.
    const spikes = 9;
    ink(ctx, P.coatLo, u, (c) => {
      for (let i = 0; i < spikes; i++) {
        const t = 0.06 + 0.92 * (i / (spikes - 1));
        const bxs = sx(t), bys = sy(t);
        // Swell through the middle of the tail and taper at both ends.
        const len = w * (0.030 + 0.062 * Math.sin(Math.min(1, t * 1.12) * Math.PI));
        const dir = i % 2 ? 1 : -1;
        const lean = 0.55;   // spikes rake back down the tail, not straight out
        for (const sgn of [dir, -dir * 0.72]) {
          c.moveTo(bxs, bys - w * 0.018);
          c.lineTo(bxs + sgn * len, bys + len * lean * 0.5);
          c.lineTo(bxs, bys + w * 0.018);
          c.closePath();
        }
      }
    });
    // The core: a tapered spine from a thick root to a blunt tip.
    ink(ctx, P.coat, u, (c) => {
      const halfAt = (t) => w * (0.040 - 0.018 * t);
      c.moveTo(sx(0) - halfAt(0), sy(0));
      for (let i = 1; i <= 8; i++) { const t = i / 8; c.lineTo(sx(t) - halfAt(t), sy(t)); }
      c.arc(sx(1), sy(1), halfAt(1), Math.PI, 0);
      for (let i = 8; i >= 0; i--) { const t = i / 8; c.lineTo(sx(t) + halfAt(t), sy(t)); }
      c.closePath();
    });
    // Two bands, so the brush reads as a tail with fur on it rather than a paddle.
    line(ctx, P.coatLo, Math.max(0.22, h * 0.018), (c) => {
      for (const t of [0.36, 0.64]) {
        c.moveTo(sx(t) - w * 0.030, sy(t)); c.lineTo(sx(t) + w * 0.030, sy(t));
      }
    });
  }

  // ---- haunch, drawn before the torso so the torso's contour crosses it ----
  ink(ctx, P.coat, u, (c) => {
    c.ellipse(hip.x + w * 0.012, hip.y + h * 0.075, w * P.haunch * 0.62, h * P.haunch * 1.25, -0.12, 0, TAU);
  });

  // ---- torso --------------------------------------------------------------
  // Chest at the front, tucked waist, haunch at the back, as one closed path so
  // the contour never doubles at a seam. Named, because everything painted onto
  // the body afterwards is CLIPPED to it — belly, ribs, shoulder mass. Painted
  // free-hand they escape the silhouette, and a pale band hanging off the flank
  // is the most obvious way for flat-colour art to look broken.
  const torsoPath = (c) => {
    c.moveTo(chestX, bellyY - h * P.chest * 0.66);
    // back line: withers, then over the arch, then down to the croup
    c.quadraticCurveTo(shX - w * 0.02, withersY - h * 0.02, shX + w * 0.045, withersY - h * P.arch * 0.55);
    c.quadraticCurveTo(midX, archCtrlY, hpX - w * 0.015, withersY + h * 0.012);
    c.quadraticCurveTo(rumpX + w * 0.02, withersY + h * 0.075, rumpX - w * 0.005, bellyY - h * 0.055);
    // haunch and stifle
    c.quadraticCurveTo(hpX + w * 0.01, bellyY + h * 0.02, hpX - w * 0.075, bellyY + h * 0.005);
    // underline, tucked up hard between the last rib and the hip
    c.quadraticCurveTo(midX + w * 0.02, bellyY - h * P.tuck, shX + w * 0.035, bellyY + h * 0.012);
    // chest, the deepest point of the animal
    c.quadraticCurveTo(chestX - w * 0.045, bellyY + h * 0.005, chestX, bellyY - h * P.chest * 0.66);
    c.closePath();
  };
  ink(ctx, P.coat, u, torsoPath);
  ctx.save();
  ctx.beginPath();
  torsoPath(ctx);
  ctx.clip();

  // Belly and chest lightening — the lit underside every hero carries.
  fill(ctx, P.belly, (c) => {
    // The pale runs as a BAND along the underline, a fixed distance above it,
    // rather than as one long quadratic from the chest to the hip — that shape
    // crosses the ribs as a straight diagonal and reads as a sash.
    const band = h * 0.085;
    const under = (x) => {
      // The torso's own underline, sampled, so the band can sit parallel to it.
      const t = Math.max(0, Math.min(1, (x - (shX + w * 0.035)) / ((hpX - w * 0.075) - (shX + w * 0.035))));
      const mt = 1 - t;
      return mt * mt * (bellyY + h * 0.012) + 2 * mt * t * (bellyY - h * P.tuck) + t * t * (bellyY + h * 0.005);
    };
    const x0 = chestX + w * 0.035, x1 = hpX - w * 0.060;
    c.moveTo(x0, under(x0) + h * 0.004);
    for (let i = 1; i <= 10; i++) {
      const x = x0 + (x1 - x0) * (i / 10);
      c.lineTo(x, under(x) + h * 0.004);
    }
    for (let i = 10; i >= 0; i--) {
      const t = i / 10;
      const x = x0 + (x1 - x0) * t;
      // Thickest at the chest, thinning to nothing at the flank: the lit belly
      // of a running animal is deepest where the animal is.
      c.lineTo(x, under(x) - band * (0.35 + 0.65 * (1 - t)));
    }
    c.closePath();
  });

  // Ribs, for the gaunt one only: three arcs behind the shoulder.
  if (P.ribs) {
    line(ctx, 'rgba(21,16,30,0.20)', Math.max(0.20, h * 0.017), (c) => {
      for (let i = 0; i < 3; i++) {
        const rx = shX + w * (0.055 + i * 0.052);
        c.moveTo(rx, bellyY - h * P.chest * 0.66);
        c.quadraticCurveTo(rx - w * 0.022, bellyY - h * P.chest * 0.24, rx + w * 0.008, bellyY - h * 0.055);
      }
    });
  }

  // Shoulder mass, so the front end reads heavier than the back — true of every
  // animal here, and the reason they look like they are pulling rather than
  // being pushed.
  fill(ctx, 'rgba(255,246,232,0.11)', (c) => {
    c.ellipse(shoulder.x + w * 0.005, shoulder.y + h * 0.045, w * 0.062, h * 0.125, -0.22, 0, TAU);
  });
  ctx.restore();

  // Hackles: fur standing along the spine. Drawn as a run of leaning spikes off
  // the back line — the difference between an animal running and one hunting.
  // Irregular on purpose: an even row reads as a comb, not as fur.
  if (P.hackles) {
    ink(ctx, P.coatLo, u, (c) => {
      const N = 9;
      const x0 = shX - w * 0.045, x1 = rumpX - w * 0.02;
      c.moveTo(x0, spineAt(0) + h * 0.03);
      for (let i = 0; i < N; i++) {
        // Spacing wanders as well as height. A row of varied-height spikes on
        // an even pitch still reads as a saw blade; it is the uneven pitch that
        // makes it fur.
        const t = (i + 0.30 * Math.sin(i * 1.71)) / (N - 1);
        const bx = x0 + (x1 - x0) * Math.max(0, Math.min(1, t));
        const step = (x1 - x0) / N;
        // Two beats of jitter rather than one, so no run of three spikes ever
        // repeats and the ridge reads as fur rather than as a comb.
        const jitter = 0.58 + 0.30 * Math.abs(Math.sin(i * 2.399)) + 0.16 * Math.abs(Math.cos(i * 1.117));
        const tall = h * (0.078 - 0.030 * t) * jitter;
        // Leaning backward, as fur pushed by the animal's own speed.
        c.lineTo(bx + step * 0.60, spineAt(t) - tall);
        c.lineTo(bx + step * 0.95, spineAt(t) + h * 0.010);
      }
      c.lineTo(x1, spineAt(1) + h * 0.05);
      c.closePath();
    });
  }

  // ---- neck ---------------------------------------------------------------
  // Drawn wide and pushed well INTO both the chest and the skull. A neck that
  // merely touches them leaves a seam the contour draws twice, which at 16px is
  // a bright line across the animal's throat.
  const headR = w * P.headR;
  const neckLift = Math.sin(p0 * TAU + 1.0) * h * 0.020;
  const hx = w * P.headX + flex * 0.35;
  // Seated off its OWN parameter rather than off the withers. The ears are the
  // tallest thing any of these draw, and derived placement kept pushing them
  // through the top of the box on whichever breed was retuned last.
  const hy = h * P.headY + neckLift + bob * 0.5;
  ink(ctx, P.coat, u, (c) => {
    c.moveTo(shX + w * 0.055, withersY - h * 0.012);
    c.quadraticCurveTo(hx + headR * 0.80, hy - headR * 1.05, hx + headR * 0.15, hy - headR * 0.55);
    c.lineTo(hx + headR * 0.30, hy + headR * 0.95);
    c.quadraticCurveTo(shX - w * 0.01, bellyY - h * P.chest * 0.52, chestX + w * 0.045, bellyY - h * P.chest * 0.60);
    c.quadraticCurveTo(shX, bellyY - h * P.chest * 0.95, shX + w * 0.055, withersY - h * 0.012);
    c.closePath();
  });

  // ---- collar -------------------------------------------------------------
  // A band ACROSS the neck, with short studs standing off its outer edge. The
  // first pass hung the studs off a point beside the neck at near-white and
  // full head-radius length, which read as a handful of loose teeth floating in
  // front of the dog rather than as anything worn.
  if (P.collar === 'spiked') {
    const ax = hx + headR * 0.55, ay = hy + headR * 0.60;
    const bx2 = shoulder.x - w * 0.02, by2 = shoulder.y - h * 0.02;
    const dx = bx2 - ax, dy = by2 - ay;
    const dl = Math.hypot(dx, dy) || 1;
    const ux = dx / dl, uy = dy / dl;          // down the neck
    const px = -uy, py = ux;                   // across it
    const cx = ax + ux * dl * 0.42, cy = ay + uy * dl * 0.42;
    const halfW = headR * 0.72, halfT = headR * 0.24;
    ink(ctx, '#5a2a18', u, (c) => {
      c.moveTo(cx + px * halfW - ux * halfT, cy + py * halfW - uy * halfT);
      c.lineTo(cx - px * halfW - ux * halfT, cy - py * halfW - uy * halfT);
      c.lineTo(cx - px * halfW + ux * halfT, cy - py * halfW + uy * halfT);
      c.lineTo(cx + px * halfW + ux * halfT, cy + py * halfW + uy * halfT);
      c.closePath();
    });
    // Studs sitting ON the band. Standing them off its edge as wedges read, at
    // any size, as loose teeth floating beside the dog's throat.
    fill(ctx, '#c8c8d6', (c) => {
      for (let i = -1; i <= 1; i++) {
        const sxs = cx + px * halfW * 0.55 * i;
        const sys = cy + py * halfW * 0.55 * i;
        c.moveTo(sxs + headR * 0.09, sys);
        c.arc(sxs, sys, headR * 0.09, 0, TAU);
      }
    });
  }

  // ---- head ---------------------------------------------------------------
  // Gape and head tilt both ride the stride: the jaw snaps wider on the reach
  // and the head drives down with the front feet.
  const gape = 0.55 + 0.45 * Math.max(0, Math.sin(p0 * TAU + 0.6));
  const tilt = -0.08 + Math.sin(p0 * TAU + 0.6) * 0.12;
  head(ctx, w, h, u, P, hx, hy, headR, gape, tilt);

  // ---- near pair, in front of everything ----------------------------------
  hindLeg(ctx, u, w, h, P, GAIT.hindNear, p0, hip, ground, P.coatHi, 1);
  frontLeg(ctx, u, w, h, P, GAIT.frontNear, p0, shoulder, ground, P.coatHi, 1);

  // Dust scuffed up by whichever hind foot is planted. Cheap, and it is what
  // pins the animal to the floor instead of leaving it sliding above it.
  const scuff = Math.max(0, -Math.sin(p0 * TAU));
  if (scuff > 0.25) {
    fill(ctx, `rgba(210,196,170,${(0.28 * scuff).toFixed(3)})`, (c) => {
      c.ellipse(hpX + w * 0.05, ground - h * 0.012, w * 0.095 * scuff, h * 0.030 * scuff, 0, 0, TAU);
      c.ellipse(hpX + w * 0.15, ground - h * 0.042, w * 0.050 * scuff, h * 0.022 * scuff, 0, 0, TAU);
    });
  }
}

// A paw, angled with whatever bone arrives at it, with two toe notches. Kept
// small: an oversized paw is the fastest way to make a running animal read as a
// plush toy.
function paw(ctx, u, w, P, fx, fy, ang, col, shade) {
  const pw = w * P.paw * shade;
  ink(ctx, col, u, (c) => {
    c.ellipse(fx - Math.cos(ang) * pw * 0.15, fy - Math.sin(ang) * pw * 0.15,
      pw, pw * 0.66, ang + Math.PI / 2, 0, TAU);
  });
  fill(ctx, 'rgba(21,16,30,0.26)', (c) => {
    c.ellipse(fx - pw * 0.34, fy + pw * 0.16, pw * 0.15, pw * 0.26, 0, 0, TAU);
    c.ellipse(fx + pw * 0.04, fy + pw * 0.20, pw * 0.15, pw * 0.26, 0, 0, TAU);
  });
}

// A FRONT leg: shoulder -> elbow -> wrist -> paw. The elbow breaks BACKWARD,
// toward the tail, which with the art facing left means bend = -1. The wrist is
// the short near-vertical section above the foot, and it is what lets the leg
// fold under the animal on the gather instead of swinging like a pendulum.
function frontLeg(ctx, u, w, h, P, phase, p0, root, ground, col, shade) {
  const p = (p0 + phase) % 1;
  const f = footAt(p, root.x + w * 0.010, ground, w * P.reach, h * P.lift);
  const span = ground - root.y;
  const pastern = span * 0.15;
  // The wrist sits above the foot and slightly behind it.
  const wr = { x: f.x + (root.x - f.x) * 0.12, y: f.y - pastern };
  const l = (Math.hypot(wr.x - root.x, wr.y - root.y) + span * 0.85) / 2;
  const el = joint(root.x, root.y, wr.x, wr.y, l * 0.54, l * 0.54, -1);
  const wu = w * P.boneUp * shade, wl = w * P.boneLo * shade;
  bone(ctx, u, root.x, root.y, el.x, el.y, wu, wl * 1.15, col);
  bone(ctx, u, el.x, el.y, wr.x, wr.y, wl * 1.15, wl * 0.80, col);
  bone(ctx, u, wr.x, wr.y, f.x, f.y, wl * 0.80, wl * 0.68, col);
  paw(ctx, u, w, P, f.x, f.y, Math.atan2(f.y - wr.y, f.x - wr.x), col, shade);
}

// A HIND leg: hip -> stifle -> hock -> paw, the Z every quadruped's back leg
// makes. Solved in two passes because a single two-bone chain can only break
// one way and this one breaks both: the stifle forward, the hock backward.
// Getting that Z is most of what separates a dog from a coffee table.
function hindLeg(ctx, u, w, h, P, phase, p0, root, ground, col, shade) {
  const p = (p0 + phase) % 1;
  const f = footAt(p, root.x - w * 0.020, ground, w * P.reach, h * P.lift);
  const span = ground - root.y;
  // Pass one: place the hock, treating thigh+shank as one long bone and the
  // metatarsus (hock to foot) as the short one. The hock therefore rides high,
  // which is where a dog's actually sits.
  const met = span * 0.34;
  const hock = joint(root.x, root.y, f.x, f.y, span * 0.80, met, -1);
  // Pass two: break the thigh and shank apart at the stifle, forward.
  const stifle = joint(root.x, root.y, hock.x, hock.y, span * 0.44, span * 0.44, 1);
  const wu = w * P.boneUp * shade, wl = w * P.boneLo * shade;
  bone(ctx, u, root.x, root.y, stifle.x, stifle.y, wu * 1.25, wl * 1.20, col);
  bone(ctx, u, stifle.x, stifle.y, hock.x, hock.y, wl * 1.20, wl * 0.90, col);
  bone(ctx, u, hock.x, hock.y, f.x, f.y, wl * 0.90, wl * 0.66, col);
  paw(ctx, u, w, P, f.x, f.y, Math.atan2(f.y - hock.y, f.x - hock.x), col, shade);
}

// ------------------------------------------------------------------- exports
// The five tables sprites/props.js spreads into its own. Keeping them together
// at the bottom is what makes the registration one line each over there.
export const ANIMAL_PAINTERS = {
  dogSnarler: (ctx, w, h, frame = 0) => quadruped(ctx, w, h, frame, BREEDS.dogSnarler),
  dogBruiser: (ctx, w, h, frame = 0) => quadruped(ctx, w, h, frame, BREEDS.dogBruiser),
  dogFeral: (ctx, w, h, frame = 0) => quadruped(ctx, w, h, frame, BREEDS.dogFeral),
  catFury: (ctx, w, h, frame = 0) => quadruped(ctx, w, h, frame, BREEDS.catFury),
};

export const ANIMAL_NAMES = Object.keys(ANIMAL_PAINTERS);

export const ANIMAL_FRAMES = {
  dogSnarler: FRAMES, dogBruiser: FRAMES, dogFeral: FRAMES, catFury: FRAMES,
};

// A gallop outruns a rotor. The bruiser's short legs cycle FASTER than the
// long-legged pair, not slower: stride length and stride rate trade off, and a
// short-strided animal keeping up has to take more steps to do it.
export const ANIMAL_FPS = {
  dogSnarler: 16, dogBruiser: 18, dogFeral: 15, catFury: 20,
};

// Art height as a multiple of the collision box. The two with fur standing up
// need the headroom; the bruiser is drawn inside its box because the whole
// point of it is that it is low.
export const ANIMAL_TALL = {
  dogSnarler: 1.05, dogBruiser: 1.0, dogFeral: 1.15, catFury: 1.12,
};

// Supersampling. These carry more small detail than any other prop — teeth,
// claws, hackles, an eye highlight — inside boxes of 11 to 17px, and at 2x the
// fangs alias into the lip. 3x is what keeps them as teeth.
export const ANIMAL_DETAIL = {
  dogSnarler: 3, dogBruiser: 3, dogFeral: 3, catFury: 3,
};

// World-only visual size, on top of the standard 4/3 hazard overdraw. Same
// argument the drones already make (PROP_VISUAL_SCALE in sprites/props.js):
// these are WIDE and LOW, so the box that gives them the right footprint next
// to a 24px hero leaves them only ~13px of height to be a face in, and at speed
// that reads as a smudge in the lane rather than as the thing you must jump.
//
// Kept well under the drones' 1.35 because overdraw on a hazard is a hit that
// looked like it connected and did not, and unlike a drone these are CLOSING —
// the hero's margin for error is already the smallest in the game here. The cat
// takes the most because it is the smallest box and the fastest closer, and it
// is the one that most needs to be seen coming.
export const ANIMAL_VISUAL = {
  dogSnarler: 1.16, dogBruiser: 1.16, dogFeral: 1.16, catFury: 1.24,
};
