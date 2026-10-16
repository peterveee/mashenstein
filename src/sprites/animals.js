// Animals: the four quadruped hazards — three dogs and a cat — that run at the
// hero and have to be jumped, and the rattlesnake that waits for him coiled in the road.
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
// THE DOGS MOVED OUT (24 Sep 2026). The three dogs and the finish guard are drawn
// by sprites/dogs.js — the dogs bake-off's B, CLEAN LINE: one silhouette, one fine
// line, a keyed rotary gallop — and spread into the tables below from there. The
// quadruped rig here now draws the CAT alone; its dog breed blocks went with them
// (the old dogs are kept for the gallery in src/dev/dogs-was.js).

import { OUTLINE_SCALE } from './outline.js';
import {
  CAT_PAINTERS, CAT_TYPES, CAT_FRAMES, CAT_FPS, CAT_IDLE_FRAMES, CAT_STRIKE_FRAMES, SWIPE_T, CAT_STRIKE_LEAD,
} from './neonCats.js';
import { DOG_PAINTERS, FINISH_DOG_PAINTERS as DOG_FINISH_PAINTERS, DOG_FRAMES, dogStride } from './dogs.js';
import { paintCryptPanther, cryptPantherStride } from './crypt-animals.js';
import {
  paintBobcat, bobcatStride, BOBCAT_FRAMES, BOBCAT_TALL, BOBCAT_VISUAL,
} from './bobcat.js';
import { FELINE_FRAMES, FELINE_GALLOP, felineFoot, felineBody } from './felineGait.js';

// --------------------------------------------------------------- primitives
// Same ink as every other prop, so an animal standing beside a crate is drawn
// in the same hand. See sprites/props.js OUTLINE — the value is repeated rather
// than imported for the reason in the header.
const OUTLINE = 'rgba(26,16,40,0.34)';

// The hairline contour. Weight is a fraction of the raster's own size, so it
// thins as the sprite is rasterized larger instead of turning into the broad
// dark border a fixed width would give — the same trade the heroes' contour
// makes (see CONTOUR_TAPER in sprites/toons.js).
// A DARKER contour for the near pair of legs, which pass in front of the torso
// in the same family of colour — fill separation alone leaves them reading as a
// smear over the body rather than as a limb in front of it. Same job the heroes
// give their contour (CONTOUR in sprites/toons.js): hold a figure off whatever
// is behind it.
//
// Darker only, NOT wider. The contour width is a fraction of the RASTER (`u`)
// while a bone's width is a fraction of the box, and on a leg this thin a
// widened stroke is most of the limb — the first attempt at 0.026 turned every
// near leg into a flat dark bar laid across the dog.
const OUTLINE_NEAR = 'rgba(18,11,30,0.55)';

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
//
// `cap` says which ends get their contour drawn. Both ends are always FILLED —
// the joint has to be solid or the limb shows a notch — but capping both with
// ink stacks two contours everywhere two segments meet, and at the sizes these
// actually draw that stack reads as a small ring bolted onto the leg. Passing
// 'far' inks only the distal end, so an elbow, stifle or hock is a continuous
// limb instead of a rivet.
function bone(ctx, u, ax, ay, bx, by, wa, wb, col, cap = 'both', edge = OUTLINE, ew = 0.019) {
  const dx = bx - ax, dy = by - ay;
  const d = Math.hypot(dx, dy) || 1e-4;
  const nx = -dy / d, ny = dx / d;
  const path = (c) => {
    c.moveTo(ax + nx * wa, ay + ny * wa);
    c.lineTo(bx + nx * wb, by + ny * wb);
    c.arc(bx, by, wb, Math.atan2(ny, nx), Math.atan2(-ny, -nx), false);
    c.lineTo(ax - nx * wa, ay - ny * wa);
    c.arc(ax, ay, wa, Math.atan2(-ny, -nx), Math.atan2(ny, nx), false);
    c.closePath();
  };
  if (cap === 'both') { ink(ctx, col, u, path, edge, ew); return; }
  // Fill the whole segment, then ink only the two long sides and the far cap —
  // the near cap is inside the previous segment and its contour is the ring.
  fill(ctx, col, path);
  ctx.beginPath();
  ctx.moveTo(ax + nx * wa, ay + ny * wa);
  ctx.lineTo(bx + nx * wb, by + ny * wb);
  ctx.arc(bx, by, wb, Math.atan2(ny, nx), Math.atan2(-ny, -nx), false);
  ctx.lineTo(ax - nx * wa, ay - ny * wa);
  ctx.strokeStyle = edge;
  ctx.lineWidth = Math.max(0.2, ew * u);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
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

// ------------------------------------------------------------------- the fur
// A run of fur along an edge: leaning, jittered spikes emitted from a
// parametric curve and closed back along it, so the whole run is ONE filled
// band rather than n loose triangles. Loose triangles at these sizes read as
// confetti sitting near the animal; a band reads as a coat on it.
//
// This exists because the same loop was already written twice by hand — the
// spine hackles and the cat's bottlebrush — and drifted apart in the writing.
// A third and fourth copy for the ruff and the rump is how a set of four
// animals ends up with four different ideas of what fur looks like.
//
// `at(t)` hands back a point AND its outward normal; see quadEdge below. Fur
// leans along the edge's own tangent, taken by finite difference, so a caller
// never has to supply a derivative.
function furRun(ctx, u, col, { at, n = 9, len, lean = 0.55, seed = 0, sink = 0 }) {
  const EPS = 0.004;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  ink(ctx, col, u, (c) => {
    const start = at(0);
    c.moveTo(start.x, start.y);
    for (let i = 0; i < n; i++) {
      // Pitch wanders as well as height. A row of varied-height spikes on an
      // even pitch still reads as a saw blade; it is the uneven pitch that
      // makes it fur.
      const t = clamp01((i + 0.30 * Math.sin(i * 1.71 + seed)) / (n - 1));
      const b = at(t);
      const a2 = at(Math.min(1, t + EPS)), a1 = at(Math.max(0, t - EPS));
      let tx = a2.x - a1.x, ty = a2.y - a1.y;
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl; ty /= tl;
      // Two beats of jitter rather than one, so no run of three spikes ever
      // repeats. `seed` offsets both, because without it every run on the same
      // animal comes out identically patterned and the eye reads the spine,
      // the ruff and the rump as three copies of one row.
      const j = 0.38 + 0.44 * Math.abs(Math.sin(i * 2.399 + seed))
        + 0.26 * Math.abs(Math.cos(i * 1.117 + seed * 0.7));
      const L = len(t) * j;
      // Lean wanders too. Height and pitch alone still leave every spike raked
      // at the same angle, which on a fine run is enough to read as machined.
      const lz = lean * (0.72 + 0.55 * Math.abs(Math.sin(i * 0.921 + seed * 1.3)));
      c.lineTo(b.x + b.nx * L + tx * L * lz, b.y + b.ny * L + ty * L * lz);
      const nb = at(clamp01((i + 1) / (n - 1)));
      c.lineTo(nb.x, nb.y);
    }
    // Back along the edge, sunk INSIDE the body, so every root is buried under
    // whatever is drawn over the run instead of showing as a seam beside it.
    for (let i = 6; i >= 0; i--) {
      const q = at(i / 6);
      c.lineTo(q.x - q.nx * sink, q.y - q.ny * sink);
    }
    c.closePath();
  });
}

// A quadratic edge with its outward normal, in the shape furRun walks. `side`
// is +1 or -1 and picks which way "outward" is: a curve does not know which of
// its two sides is the outside of the animal.
function quadEdge(x0, y0, cx, cy, x2, y2, side = 1) {
  return (t) => {
    const mt = 1 - t;
    const x = mt * mt * x0 + 2 * mt * t * cx + t * t * x2;
    const y = mt * mt * y0 + 2 * mt * t * cy + t * t * y2;
    let dx = 2 * mt * (cx - x0) + 2 * t * (x2 - cx);
    let dy = 2 * mt * (cy - y0) + 2 * t * (y2 - cy);
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    return { x, y, nx: -dy * side, ny: dx * side };
  };
}


// ------------------------------------------------------------------- the rig
// THE PLANTED GALLOP (16 Oct 2026; sprites/felineGait.js — Peter, after the dogs got
// theirs: "can we fix the other feline animals also"). The cat used to swing each foot
// round a flattened ellipse, eight frames at 20 fps, and its "planted" half moved back
// at about a fifth of the cat's own speed, so it skated. It now runs the shared feline
// gallop: every stance paw nailed to the road, sixteen frames (FELINE_FRAMES, which
// ANIMAL_FRAMES reads too — a painter cycling on a different count from its table jumps
// at the seam), stepped by the road it covers (catFuryStride, ANIMAL_STRIDE below).
// The cat's own drawing is untouched; what moves is the legs, the spine and the head.
const DEG = Math.PI / 180;

// --------------------------------------------------------------- the breeds
// Every number is a fraction of the painter's box, so a breed is a shape rather
// than a size and the same block draws correctly at 16px and at 400.
//
// `bend` pairs are (front, hind). Front elbows break BACKWARD relative to
// travel and hind hocks break FORWARD; because the art faces left, that comes
// out as the signs below.
const BREEDS = {
  // (The three dog breeds lived here until 24 Sep 2026: see sprites/dogs.js.)
  // ---- the cat. Not a small dog: the spine ARCHES hard at the middle rather
  // than at the withers, the tail bottlebrushes straight up, the ears go FLAT
  // to the skull and the fur stands the length of the back. Those four are the
  // entire difference between a cat that is angry and a cat that is walking.
  catFury: {
    coat: '#332f3f', coatHi: '#413d50', coatLo: '#201d2a', belly: '#63607a', mark: '#8a86a0',
    // The ridge reads ABOVE the coat, not below it. coatLo on this body is
    // near-black on dark and resolves as one solid mass; fur has to catch
    // light along its edge to be fur at all.
    hackle: '#4d4860',
    ear: 'flat', tail: 'bottlebrush', ribs: 0, collar: 'none',
    pelt: 'shaggy',
    fur: { spine: 1.05, ruff: 0.85, rump: 0.75 },
    leg: 0.38, chest: 0.27, arch: 0.085, tuck: 0.085,
    shoulderX: 0.430, hipX: 0.780, headX: 0.235, headR: 0.118, headY: 0.345,
    muzzle: 0.048, jawDrop: 0.62, neck: 0.14,
    // The planted gallop (sprites/felineGait.js), in the cat's own terms. Its leg
    // length for the gait is the rest height of shoulder and hip over the road, so
    // strideL and the touch-downs are in the same units the other cats use.
    //   spine     how far shoulder and hip each move along the back either side of
    //             rest, a fraction of the box (the whole back is ~0.35 of it: ±13%)
    //   archK     the arch's swing either side of rest, a fraction of `arch`
    //   bob       the body's rise through the flights, in gait leg lengths
    //   headHold  how much of that rise the head takes back out
    gallop: {
      ...FELINE_GALLOP,
      strideL: 3.0, hindTD: 0.46, foreTD: 0.50, liftF: 0.36, liftH: 0.30,
      spine: 0.023, archK: 0.55, bob: 0.13, headHold: 0.6,
    },
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
  const p0 = (frame % FELINE_FRAMES) / FELINE_FRAMES;
  const ground = h * 0.995;
  const G = P.gallop;
  const legLen = h * P.leg;
  // The gait's leg length: shoulder and hip over the road at rest, averaged.
  const gaitL = legLen + h * P.chest * 0.56;

  // Body rise and spine flex (sprites/felineGait.js): the rise peaks in BOTH flights,
  // two a stride; `fl` runs -1 at the extended flight to +1 at the gathered one.
  const body = felineBody(G, p0);
  const bob = -(body.bump - 0.5) * G.bob * gaitL;
  const fl = 2 * body.flex - 1;

  const bellyY = ground - legLen + bob;
  const withersY = bellyY - h * P.chest + bob * 0.2;
  // Shoulder and hip counter-move: the animal gathers and extends along its own
  // length. Without this the legs cycle under a body that is rigid, which is
  // the single clearest tell of a cheap run cycle. The whole torso is built off
  // these two, so the back itself shortens and lengthens — a cat's gallop is
  // mostly spine — and at rest (fl 0) it is the drawing exactly as it was.
  const shX = w * (P.shoulderX + G.spine * fl), hpX = w * (P.hipX - G.spine * fl);
  const shoulder = { x: shX, y: bellyY - h * P.chest * 0.62 };
  const hip = { x: hpX, y: bellyY - h * P.chest * 0.50 };
  // ...and the back rounds up on the gather and flattens on the extension.
  const arch = P.arch * (1 + G.archK * fl);
  // The paws, off the REST roots (where the old ellipse was centred), so a planted
  // paw holds still against the road while the shoulder or hip flexes over it.
  // Facing left: forward is -x.
  const restS = w * (P.shoulderX + 0.010), restH = w * (P.hipX - 0.020);
  const paws = {};
  for (const [k, fore, near] of [['fore', true, true], ['foreFar', true, false], ['hind', false, true], ['hindFar', false, false]]) {
    const f = felineFoot(G, p0, fore, near);
    paws[k] = { x: (fore ? restS : restH) - f.x * gaitL, y: ground - f.y * gaitL, a: f.a, stance: f.stance };
  }
  // Each leg's bones are sized off its rest span, so they hold their length all stride.
  const spanF = legLen + h * P.chest * 0.62, spanH = legLen + h * P.chest * 0.50;
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
  const archCtrlY = withersY - h * arch * 2;
  // Where the spine actually is at t along the back, so the hackle ridge can
  // sit ON it rather than float over the arched breeds.
  const spineAt = (t) => {
    const a = withersY - h * arch * 0.55, b = archCtrlY, cc = withersY + h * 0.012;
    const mt = 1 - t;
    return mt * mt * a + 2 * mt * t * b + t * t * cc;
  };

  // Fur, shared by all three runs below. Base length is a fraction of the box,
  // so a breed's `fur` numbers are strengths rather than sizes.
  //
  // A short coat gets MORE and SHORTER spikes and a shaggy one FEWER and
  // LONGER: bristle versus clumps is carried by the count as much as by the
  // length, and it is what keeps the doberman from turning into the wolf.
  const shortCoat = P.pelt === 'short';
  const furCol = P.hackle || P.coatLo;
  const FUR = h * 0.078;
  const furN = shortCoat ? 11 : 9;
  // Only the LEAN rides the stride. Re-rolling the jitter per frame would make
  // the coat flicker rather than move — these cycle at 15-20fps and every frame
  // is its own raster, so anything that reshuffles strobes.
  const furLean = 0.85 + 0.30 * Math.sin(p0 * TAU);

  // ---- rump fur, before the haunch and torso so both bury its roots -------
  if (P.fur.rump > 0) {
    furRun(ctx, u, furCol, {
      at: quadEdge(hpX - w * 0.015, withersY + h * 0.012,
        rumpX + w * 0.02, withersY + h * 0.075,
        rumpX - w * 0.005, bellyY - h * 0.055, -1),
      n: Math.round(furN * 0.7), lean: 0.30 * furLean, seed: 2.4, sink: h * 0.035,
      len: (t) => FUR * P.fur.rump * (0.9 + 0.5 * Math.sin(t * Math.PI)),
    });
  }

  // ---- far pair, behind everything ---------------------------------------
  hindLeg(ctx, u, w, h, P, paws.hindFar, hip, spanH, P.coatLo, 0.9);
  frontLeg(ctx, u, w, h, P, paws.foreFar, shoulder, spanF, P.coatLo, 0.9);

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
  } else if (P.tail === 'long') {
    // The finish dog is larger than the lane rigs but still rasterized inside
    // its unchanged box. A straight extension gets clipped at the right edge,
    // so the guard dog's tail makes one long, raised sweep and curls back over
    // the croup. It reads as a tail at gameplay size without widening the art
    // canvas or changing the collision footprint.
    ink(ctx, P.coat, u, (c) => {
      c.moveTo(tb.x - w * 0.035, tb.y + h * 0.065);
      c.quadraticCurveTo(tb.x + w * 0.075, tb.y + h * 0.095 + wag,
        w * 0.985, tb.y - h * 0.015 + wag);
      c.quadraticCurveTo(w * 0.955, tb.y - h * 0.205 + wag * 1.35,
        tb.x + w * 0.035, tb.y - h * 0.305 + wag * 1.45);
      c.quadraticCurveTo(tb.x + w * 0.075, tb.y - h * 0.135 + wag,
        tb.x - w * 0.015, tb.y + h * 0.005);
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
    c.quadraticCurveTo(shX - w * 0.02, withersY - h * 0.02, shX + w * 0.045, withersY - h * arch * 0.55);
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

  // ---- spine hackles, on top of the finished torso ------------------------
  // The ridge that says hunting rather than merely running. Roots are sunk
  // below the back line so the run reads as fur growing OUT of the animal
  // rather than as a comb laid on top of it.
  if (P.fur.spine > 0) {
    const sx0 = shX - w * 0.055, sx1 = rumpX - w * 0.02;
    furRun(ctx, u, furCol, {
      // Same three control values spineAt uses, so the ridge sits ON the back
      // at every breed instead of floating over the arched ones. The x control
      // is the midpoint, which makes x linear in t and y follow spineAt exactly.
      at: quadEdge(sx0, withersY - h * arch * 0.55,
        (sx0 + sx1) / 2, archCtrlY,
        sx1, withersY + h * 0.012, -1),
      n: furN, lean: 0.62 * furLean, seed: 0, sink: h * 0.035,
      // Tallest over the shoulder, tapering to the croup: fur stands highest
      // where the animal is heaviest.
      len: (t) => FUR * P.fur.spine * (1 - 0.38 * t),
    });
  }

  // ---- neck ---------------------------------------------------------------
  // Drawn wide and pushed well INTO both the chest and the skull. A neck that
  // merely touches them leaves a seam the contour draws twice, which at 16px is
  // a bright line across the animal's throat.
  const headR = w * P.headR;
  const neckLift = Math.sin(p0 * TAU + 1.0) * h * 0.020;
  // The head rides the shoulder along the back, but holds its height: most of the
  // body's rise is taken back out at the neck, so the eyes stay level.
  const hx = w * P.headX + (shX - w * P.shoulderX) * 0.8;
  // Seated off its OWN parameter rather than off the withers. The ears are the
  // tallest thing any of these draw, and derived placement kept pushing them
  // through the top of the box on whichever breed was retuned last.
  const hy = h * P.headY + neckLift + bob * (1 - G.headHold);
  ink(ctx, P.coat, u, (c) => {
    c.moveTo(shX + w * 0.055, withersY - h * 0.012);
    c.quadraticCurveTo(hx + headR * 0.80, hy - headR * 1.05, hx + headR * 0.15, hy - headR * 0.55);
    c.lineTo(hx + headR * 0.30, hy + headR * 0.95);
    c.quadraticCurveTo(shX - w * 0.01, bellyY - h * P.chest * 0.52, chestX + w * 0.045, bellyY - h * P.chest * 0.60);
    c.quadraticCurveTo(shX, bellyY - h * P.chest * 0.95, shX + w * 0.055, withersY - h * 0.012);
    c.closePath();
  });

  // ---- ruff, the raised scruff --------------------------------------------
  // The strongest single signal in the set, and the one none of them had. A
  // dog that has decided about you raises the neck and shoulder first; the
  // spine ridge is the continuation of it, not the start.
  //
  // Drawn AFTER the neck and BEFORE the head, so the skull sits in front of
  // the ruff and the run's forward roots disappear under it — a ruff drawn
  // last stands proud of the jaw and reads as a collar of spikes.
  if (P.fur.ruff > 0) {
    furRun(ctx, u, furCol, {
      // From behind the skull, around the back of the neck, onto the shoulder.
      // Behind the skull, over the crest of the neck, onto the shoulder. The
      // control sits ABOVE both ends so the arc crests over the withers — with
      // it below either end the normal at that end points forward instead of
      // out, and the run piles onto the ear.
      at: quadEdge(hx + headR * 0.78, hy - headR * 0.30,
        shX - w * 0.035, withersY - h * 0.075,
        shX + w * 0.115, withersY + h * 0.030, -1),
      n: furN, lean: 0.42 * furLean, seed: 5.1, sink: h * 0.05,
      // Fullest at the middle of the run, where the scruff actually is, rather
      // than even along it — an even ruff reads as a hood.
      len: (t) => FUR * P.fur.ruff * (0.55 + 0.85 * Math.sin(t * Math.PI)),
    });
  }

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
  hindLeg(ctx, u, w, h, P, paws.hind, hip, spanH, P.coatHi, 1, true);
  frontLeg(ctx, u, w, h, P, paws.fore, shoulder, spanF, P.coatHi, 1, true);

  // Dust scuffed up by the near hind as it drives off the road. Cheap, and it is
  // what pins the animal to the floor instead of leaving it sliding above it.
  const hs = paws.hind.stance;
  const scuff = hs >= 0 ? Math.sin(Math.PI * hs) : 0;
  if (scuff > 0.25) {
    const sx = paws.hind.x;
    fill(ctx, `rgba(210,196,170,${(0.28 * scuff).toFixed(3)})`, (c) => {
      c.ellipse(sx + w * 0.03, ground - h * 0.012, w * 0.095 * scuff, h * 0.030 * scuff, 0, 0, TAU);
      c.ellipse(sx + w * 0.13, ground - h * 0.042, w * 0.050 * scuff, h * 0.022 * scuff, 0, 0, TAU);
    });
  }
}

// A paw, angled with whatever bone arrives at it, with two toe notches. Kept
// small: an oversized paw is the fastest way to make a running animal read as a
// plush toy.
function paw(ctx, u, w, P, fx, fy, ang, col, shade, edge = OUTLINE, ew = 0.019) {
  const pw = w * P.paw * shade;
  ink(ctx, col, u, (c) => {
    c.ellipse(fx - Math.cos(ang) * pw * 0.15, fy - Math.sin(ang) * pw * 0.15,
      pw, pw * 0.66, ang + Math.PI / 2, 0, TAU);
  }, edge, ew);
  fill(ctx, 'rgba(21,16,30,0.26)', (c) => {
    c.ellipse(fx - pw * 0.34, fy + pw * 0.16, pw * 0.15, pw * 0.26, 0, 0, TAU);
    c.ellipse(fx + pw * 0.04, fy + pw * 0.20, pw * 0.15, pw * 0.26, 0, 0, TAU);
  });
}

// A FRONT leg: shoulder -> elbow -> wrist -> paw. The elbow breaks BACKWARD,
// toward the tail, which with the art facing left means bend = -1. The wrist is
// the short near-vertical section above the foot, and it is what lets the leg
// fold under the animal on the gather instead of swinging like a pendulum.
// `f` is the paw (quadruped's `paws`): where it is, and the gait's carpus -> paw
// angle `a` (authored facing right, so mirrored here). `span` is the leg's rest
// height, which sizes the bones so they keep their length through the stride.
function frontLeg(ctx, u, w, h, P, f, root, span, col, shade, near = false) {
  const edge = near ? OUTLINE_NEAR : OUTLINE, ew = 0.019;
  const pastern = span * 0.15;
  // The wrist sits above the paw along the gait's angle: behind it on the road,
  // folded up over it in the air.
  const wr = { x: f.x + Math.cos(f.a * DEG) * pastern, y: f.y - Math.sin(f.a * DEG) * pastern };
  const el = joint(root.x, root.y, wr.x, wr.y, span * 0.46, span * 0.46, -1);
  const wu = w * P.boneUp * shade, wl = w * P.boneLo * shade;
  bone(ctx, u, root.x, root.y, el.x, el.y, wu, wl * 1.15, col, 'far', edge, ew);
  bone(ctx, u, el.x, el.y, wr.x, wr.y, wl * 1.15, wl * 0.80, col, 'far', edge, ew);
  bone(ctx, u, wr.x, wr.y, f.x, f.y, wl * 0.80, wl * 0.68, col, 'far', edge, ew);
  paw(ctx, u, w, P, f.x, f.y, Math.atan2(f.y - wr.y, f.x - wr.x), col, shade, edge, ew);
}

// A HIND leg: hip -> stifle -> hock -> paw, the Z every quadruped's back leg
// makes. Solved in two passes because a single two-bone chain can only break
// one way and this one breaks both: the stifle forward, the hock backward.
// Getting that Z is most of what separates a dog from a coffee table.
function hindLeg(ctx, u, w, h, P, f, root, span, col, shade, near = false) {
  const edge = near ? OUTLINE_NEAR : OUTLINE, ew = 0.019;
  // Pass one: place the hock off the paw along the gait's paw -> hock angle `a`
  // (authored facing right, mirrored here): the metatarsus is the short bone, so
  // the hock rides high, which is where a cat's actually sits.
  const met = span * 0.34;
  const hock = { x: f.x - Math.cos(f.a * DEG) * met, y: f.y + Math.sin(f.a * DEG) * met };
  // Pass two: break the thigh and shank apart at the stifle, forward.
  const stifle = joint(root.x, root.y, hock.x, hock.y, span * 0.44, span * 0.44, 1);
  const wu = w * P.boneUp * shade, wl = w * P.boneLo * shade;
  bone(ctx, u, root.x, root.y, stifle.x, stifle.y, wu * 1.25, wl * 1.20, col, 'far', edge, ew);
  bone(ctx, u, stifle.x, stifle.y, hock.x, hock.y, wl * 1.20, wl * 0.90, col, 'far', edge, ew);
  bone(ctx, u, hock.x, hock.y, f.x, f.y, wl * 0.90, wl * 0.66, col, 'far', edge, ew);
  paw(ctx, u, w, P, f.x, f.y, Math.atan2(f.y - hock.y, f.x - hock.x), col, shade, edge, ew);
}

// --------------------------------------------------------------- rattlesnake
// SPEED ZONE's rattlesnake (Peter, 24 Sep: "lets add the animated rattlesnake as a new
// obstacle", from the desert ideas bake-off, src/dev/speed-ideas.js). It does not
// close like the dogs: it sits coiled in the road, rattle buzzing, and STRIKES AS YOU
// ARRIVE ("should attack just before we get to him, not after") — the run starts its
// strike clock (`strikeT`) when the hero is a beat away, so the head is out at full
// reach just before he gets there. Its box takes in the strike: the answer is the jump.
//
// REDRAWN 16 Oct 2026 (Peter, of the cobra bake-off's D, src/dev/cobra-candidates.js:
// "d for the rattlesnake is fantastic - ship it"). The snake is a TUBE now: every length
// of it — three ground rings and the neck — is one path stroked as ink halo, scale
// colour, shade band and lit band, and the diamonds are that same path stroked again
// with a dash, so the pattern runs round the body. A taller S of neck, a bigger rattle
// held straight up and buzzing, the pit viper's arrowhead. Same box, same TALL, same
// strike clock and curve. Painted in the bake-off's units (24x17, ground at y 17) and
// scaled into whatever size the raster asks for, bottom-centred.
//
// Frames 0..SNAKE_IDLE_FRAMES-1 are the idle ring (sway, rattle, tongue — whole cycles
// per second so the ring loops); the rest are the strike, picked from `strikeT` in
// draw.js the way the bear trap's snap is, so it lands on the frame it happened.
const SNAKE = {
  body: '#c9a56b', lit: '#ecd298', dark: '#7a5534', belly: '#efe0b4', head: '#b08a58',
  eye: '#f2c14a', diamond: '#6b4a2e', edge: '#f4e6bf', rattle: '#d9c9a0', rattleDark: '#9c8a68',
  tongue: '#d8323a', mouth: '#e0707a', fang: '#fffaf0', pupil: '#1a1210',
};
export const SNAKE_IDLE_FRAMES = 12;
const SNAKE_FPS = 12;                 // the idle ring: one second
export const SNAKE_STRIKE_FRAMES = 12;
export const SNAKE_STRIKE_T = 0.85;   // coil (0.2s), strike out (0.1s), hold, recoil
// Seconds from the trigger to full reach: the run fires the strike this long before
// the hero would reach the snake, so it is out as he arrives.
// 0.5, not the 0.3 that put full reach on the very frame he arrived: Peter, 24 Sep, "attack
// a little bit earlier so it reads" — it is out and held for a beat before he gets there.
export const SNAKE_STRIKE_LEAD = 0.5;
const SNAKE_FRAMES = SNAKE_IDLE_FRAMES + SNAKE_STRIKE_FRAMES;
// The drawing's own units.
const SNAKE_W = 24, SNAKE_H = 17;
// BOLD INK (Peter, 15 Oct 2026: "is their problem their outlines aren't bold enough?"):
// one solid ink, its halo on the outline dial (sprites/outline.js).
const SNAKE_INK = '#2a1d1e';
const SNAKE_HALO = 1.1 * OUTLINE_SCALE;
const snakeSmooth = (e0, e1, v) => { const k = Math.max(0, Math.min(1, (v - e0) / (e1 - e0))); return k * k * (3 - 2 * k); };
const snakeLerp = (a, b, k) => a + (b - a) * k;
function snakeStroke(ctx, color, width, path, cap = 'round', dash = null, off = 0) {
  ctx.save();
  ctx.beginPath(); path(ctx);
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = cap; ctx.lineJoin = 'round';
  if (dash) { ctx.setLineDash(dash); ctx.lineDashOffset = off; }
  ctx.stroke();
  ctx.restore();
}
function snakeFill(ctx, color, path) { ctx.beginPath(); path(ctx); ctx.fillStyle = color; ctx.fill(); }
function snakeInk(ctx, color, path, lw) {
  ctx.beginPath(); path(ctx);
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = SNAKE_INK; ctx.lineWidth = lw * OUTLINE_SCALE; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.stroke();
}
const snakeOval = (x, y, rx, ry) => (c) => c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), 0, 0, TAU);
const snakeCircle = (x, y, r) => (c) => c.arc(x, y, Math.max(0.01, r), 0, TAU);
function snakePoly(pts) {
  return (c) => { c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); };
}
// The scales: a cream edge dashed round the body, the diamond dashed inside it.
const SNAKE_PATTERN = [[SNAKE.edge, [1.5, 1.4], 0.85, 0], [SNAKE.diamond, [0.9, 2.0], 0.62, -0.3]];
// Lengths of snake, inked as ONE body: every halo first, then every colour, pattern and
// band, so where one length grows out of another there is no ink seam between them.
function snakeTubes(ctx, parts) {
  for (const { path, th } of parts) snakeStroke(ctx, SNAKE_INK, th + SNAKE_HALO, path);
  for (const { path, th } of parts) snakeStroke(ctx, SNAKE.body, th, path);
  for (const { path, th } of parts) for (const [col, dash, k, off] of SNAKE_PATTERN) snakeStroke(ctx, col, th * k, path, 'butt', dash, off);
  for (const { th, under } of parts) if (under) snakeStroke(ctx, SNAKE.dark, th * 0.3, under, 'butt');
  for (const { th, over } of parts) if (over) snakeStroke(ctx, SNAKE.lit, th * 0.28, over, 'butt');
}
// A flat ground ring, shaded under and lit on top along its near half.
const snakeRing = (cx, cy, rx, ry, th) => ({
  path: snakeOval(cx, cy, rx, ry), th,
  under: (c) => c.ellipse(cx, cy + th * 0.3, rx, ry, 0, 0.08 * Math.PI, 0.92 * Math.PI),
  over: (c) => c.ellipse(cx, cy - th * 0.26, rx, ry, 0, 0.1 * Math.PI, 0.9 * Math.PI),
});

function rattlesnake(ctx, w, h, frame = 0) {
  const P = SNAKE;
  const f = frame % SNAKE_FRAMES;
  const idle = f < SNAKE_IDLE_FRAMES;
  // Idle: one second of sway, rattle and tongue. Strike: `u` seconds into SNAKE_STRIKE_T.
  const t = idle ? f / SNAKE_FPS : 0;
  const u = idle ? -1 : ((f - SNAKE_IDLE_FRAMES + 0.5) / SNAKE_STRIKE_FRAMES) * SNAKE_STRIKE_T;
  // Strike: 0 at rest, 1 at full reach — coil back, out fast, a beat held, slower back.
  const s = idle ? 0 : u < 0.2 ? 0 : u < 0.3 ? snakeSmooth(0.2, 0.3, u)
    : u < 0.48 ? 1 : 1 - snakeSmooth(0.48, 0.85, u);
  // The crouch before it: the neck draws back into a tighter S.
  const wd = idle ? 0 : snakeSmooth(0, 0.16, u) * (1 - snakeSmooth(0.2, 0.26, u));
  const k = Math.min(w / SNAKE_W, h / SNAKE_H);
  ctx.save();
  ctx.translate((w - SNAKE_W * k) / 2, h - SNAKE_H * k);
  ctx.scale(k, k);
  const g = SNAKE_H - 0.2;

  // The rattle first, behind the coil, straight up and buzzing.
  const buzz = Math.sin(f * 2.6) * 0.35;
  ctx.save();
  ctx.translate(21.0 + buzz, g - 3.2);
  for (let r = 0; r < 5; r++) snakeInk(ctx, r % 2 ? P.rattle : P.rattleDark, snakeOval(0, -0.9 - r * 1.05, 0.95 - r * 0.08, 0.6), 0.35);
  ctx.restore();
  snakeStroke(ctx, 'rgba(255,244,216,0.7)', 0.3, (c) => { c.moveTo(22.6, g - 6.4); c.quadraticCurveTo(23.4, g - 5.4, 22.7, g - 4.4); });

  // Three ground rings, bottom first — each rests on the back of the one below.
  snakeTubes(ctx, [snakeRing(15.2, g - 1.8, 6.6, 1.7, 2.8)]);
  // RISE AND UNCOIL (Peter, 16 Oct: "could he uncoil a little?", "wouldn't he rise up a
  // bit?"). On the wind-up the coil lifts and the neck rears back and up; on the strike
  // the top ring UNWINDS into the lunge — its arc shortens by almost half and the neck
  // now leaves it from the front, so the body the strike throws is visibly the coil's.
  const rise = Math.max(wd, s * 0.7);
  const lift = 1.2 * rise;
  snakeTubes(ctx, [snakeRing(15.0, g - 3.9 - lift * 0.4, 4.8, 1.4, 2.6)]);

  // The top ring and the neck are ONE path (Peter, 16 Oct: "can we attach his neck
  // better?"): the ring's arc runs on into the neck's curve, so the neck grows out of
  // the coil with no join at all, wherever the arc ends.
  // Uncoiling: the ring stays a whole loop (an open end would show as a hook) but it
  // TIGHTENS as its length is paid out into the lunge, and the place the neck leaves it
  // travels round from the back to the front, toward the hero.
  const cx3 = 14.6 - 0.4 * s, cy3 = g - 5.7 - lift, rx3 = 3.0 - 0.9 * s, ry3 = 1.1 - 0.2 * s, th3 = 2.3;
  const a1 = -0.25 * Math.PI + 1.1 * Math.PI * s;
  const a0 = a1 - TAU;
  const start = [cx3 + rx3 * Math.cos(a1), cy3 + ry3 * Math.sin(a1)];
  const sway = Math.sin(t * TAU) * 0.5 * (1 - s);
  const up = 2.2 * wd;
  const rest = [start, [18.2 + wd, g - 10.4 - up], [10.6 + sway - wd, g - 13.2 - up], [8.6 + sway - wd * 0.6, g - 13.4 - up]];
  const hit = [start, [9.4, g - 7.8], [7.4, g - 9.8], [4.8, g - 9.2]];
  const pts = rest.map((p, i) => [snakeLerp(p[0], hit[i][0], s), snakeLerp(p[1], hit[i][1], s)]);
  const body = (c) => {
    c.ellipse(cx3, cy3, rx3, ry3, 0, a0, a1);
    c.bezierCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1]);
  };
  snakeTubes(ctx, [{
    path: body, th: th3,
    under: (c) => c.ellipse(cx3, cy3 + th3 * 0.3, rx3, ry3, 0, 0.08 * Math.PI, 0.92 * Math.PI),
    over: (c) => c.ellipse(cx3, cy3 - th3 * 0.26, rx3, ry3, 0, 0.1 * Math.PI, Math.min(0.9 * Math.PI, a1)),
  }]);

  // The head: a pit viper's arrowhead — broad jaw hinge behind the eye, narrow snout —
  // with the jaws opening as it strikes.
  const [hx, hy] = pts[3];
  const gape = Math.max(wd * 0.6, s) * 0.7;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(-0.1 + s * 0.2);
  ctx.save();
  ctx.translate(1.6, 0.6);
  ctx.rotate(-gape);
  snakeInk(ctx, P.belly, snakePoly([0.4, -0.4, -5.0, -0.1, -4.8, 0.55, 0.2, 0.9]), 0.35);
  ctx.restore();
  if (gape > 0.05) {
    snakeFill(ctx, P.mouth, snakePoly([1.8, 0.3, -3.6, 0.3, -3.5 + gape * 1.6, 0.4 + gape * 4.6]));
    snakeFill(ctx, P.fang, snakePoly([-3.0, 0.2, -2.55, 0.2, -2.85, 1.7]));
    snakeFill(ctx, P.fang, snakePoly([-1.7, 0.2, -1.25, 0.2, -1.55, 1.45]));
  }
  snakeInk(ctx, P.head, (c) => {
    c.moveTo(2.6, 0.9);
    c.quadraticCurveTo(3.2, -1.6, 1.6, -2.6);
    c.quadraticCurveTo(-0.6, -2.9, -2.2, -2.2);
    c.quadraticCurveTo(-4.0, -1.5, -4.4, -0.4);
    c.quadraticCurveTo(-4.5, 0.4, -3.6, 0.45);
    c.lineTo(1.6, 1.2);
    c.closePath();
  }, 0.45);
  snakeFill(ctx, P.lit, (c) => { c.moveTo(1.8, -2.0); c.quadraticCurveTo(-0.8, -2.7, -3.4, -1.1); c.quadraticCurveTo(-0.8, -1.8, 1.9, -1.2); c.closePath(); });
  snakeFill(ctx, P.diamond, (c) => { c.moveTo(2.4, -0.6); c.quadraticCurveTo(0.2, -1.3, -1.4, -0.7); c.quadraticCurveTo(0.4, -0.5, 2.5, 0.2); c.closePath(); });
  // Heavy brow over the eye — the scowl is most of the menace.
  snakeFill(ctx, P.dark, snakePoly([-3.2, -1.85, -0.9, -2.4, -1.3, -1.6]));
  snakeFill(ctx, P.pupil, snakeCircle(-2.0, -1.25, 0.6));
  snakeFill(ctx, P.eye, snakeCircle(-2.0, -1.25, 0.34));
  snakeFill(ctx, P.pupil, (c) => c.ellipse(-2.0, -1.25, 0.1, 0.3, 0, 0, TAU));
  snakeFill(ctx, '#ffffff', snakeCircle(-2.2, -1.42, 0.12));
  snakeFill(ctx, '#2a1a12', snakeCircle(-3.75, -0.5, 0.2));
  // The tongue flicks while it is idle, in two bursts a second.
  const flick = !idle ? 0 : Math.max(0, Math.sin(t * TAU * 2)) * ((t * 2) % 1 < 0.45 ? 1 : 0);
  if (flick > 0.1) {
    snakeStroke(ctx, P.tongue, 0.3, (c) => {
      c.moveTo(-3.8, 0.2); c.lineTo(-3.8 - flick * 2.2, 0.3);
      c.lineTo(-4.5 - flick * 2.4, -0.3); c.moveTo(-3.8 - flick * 2.2, 0.3); c.lineTo(-4.5 - flick * 2.4, 0.8);
    });
  }
  ctx.restore();
  // Strike streaks behind the lunging head.
  if (s > 0.2 && s < 0.999) {
    snakeStroke(ctx, `rgba(255,244,216,${(0.6 * s).toFixed(3)})`, 0.35, (c) => {
      c.moveTo(hx + 4, hy - 2.6); c.lineTo(hx + 8.5, hy - 3.2);
      c.moveTo(hx + 4.4, hy + 1.6); c.lineTo(hx + 8, hy + 1.8);
    });
  }
  ctx.restore();
}

// ------------------------------------------------------------------- the goose
// PLUMBER PANIC's farmyard goose (Peter, 24 Sep, from the countryside ideas bake-off,
// src/dev/plumber-ideas.js): she has decided the lane is hers and comes at the hero flat
// out — neck stretched low, beak wide open honking, wings half up and beating, orange
// feet paddling. A closer like the dogs, between the bruiser and the snarler for pace.
//
// THE NECK GROWS OUT OF THE CHEST (Peter: "draw the neck better of the goose so it
// attaches better to the body"). Body, neck and head are ONE silhouette: all three are
// stroked in ink first, then all three filled, so the fills cover every inner edge and
// the only line left is the outside of the whole bird — no seam where the neck meets
// the breast. The neck's root is wide and sunk into the chest, and it tapers to the head.
const GOOSE = {
  body: '#f4f1ea', bodyShade: '#d6d0c4', wingShade: '#c9c1b2', ink: '#2a1a16', beak: '#f08a2c',
  beakDark: '#c4611a', leg: '#f08a2c', legDark: '#c4611a',
};
// 24 frames since 16 Oct 2026 (was 10): the waddle-and-hop below, its legs on the road.
export const GOOSE_FRAMES = 24;
// ONE LINE, EVERYWHERE (Peter, 24 Sep: "finer more consistent outlines (inc. beak)"):
// every contour on the bird — silhouette, wings, beak, feet — is this width in the
// one ink. About 0.4 of a pixel in the lane, the weight of the other animals' contour.
// The silhouette is stroked at twice it and filled over, so its visible outer half matches.
// 15 Oct 2026: still one line, now SOLID and 0.55 — the 62% grey at 0.42 went soft on
// the pale hills (Peter: "is their problem their outlines aren't bold enough?").
const GOOSE_LINE = 0.55;
// Beak tip to tail, and wing tip to feet, in the drawing's own units.
const GOOSE_SPAN = { left: 16.4, right: 9.8, top: 17.2 };
// Room in front of the bird inside its box for the HONK lines past the beak (Peter, 24
// Sep) — on the beak side only, so the widening stays under the widest prop's scale, which
// the render cull is derived from (BASE_CULL_MARGIN). The box is widened to match
// (ANIMAL_VISUAL), so the goose draws the same size; it sits a hair behind the box centre.
const GOOSE_PAD = 5.5;
function gooseStroke(ctx, color, lw, path) {
  ctx.beginPath(); path(ctx);
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
}
function gooseFill(ctx, color, path) { ctx.beginPath(); path(ctx); ctx.fillStyle = color; ctx.fill(); }
function gooseInk(ctx, fill, lw, path, color = GOOSE.ink) {
  ctx.beginPath(); path(ctx);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
}
// THE WADDLE AND HOP (16 Oct 2026, the goose bake-off, src/dev/goose-waddle-candidates.js:
// "i like waddle and hop … can we have the body animation around the same as before with
// faster legs? … fix his wings? attach them better to his body"). One ring is one HOP:
// four quick waddling steps, then a wing-flapped hop that carries the rest of the road.
// The body keeps the old bird's rhythm — one ring a cycle at about the old 2.2 a second
// (GOOSE_ROAD below sets it), the same bob, nod and beak snap — while the legs, bird
// legs now (the ankle breaking BACKWARD, a webbed foot that lands flat), take two step
// cycles inside the waddle. Every foot on the road moves back at exactly the ground
// speed, and run.js steps the ring by the road covered (ANIMAL_STRIDE.goose), so the
// feet stay put.
//
// THE WINGS grow out of the shoulder: each is one shape pivoting at a root buried inside
// the body, its outline stroked everywhere but across that root, so the body's fill and
// the wing's meet with no seam; a scalloped trailing edge and a shade band along it. They
// lie folded through the waddle and open and beat once for the hop.
const GOOSE_STEP_END = 0.62;   // the waddle; the hop is the rest of the ring
const GOOSE_LEG_CYCLES = 2;    // step cycles (each foot twice) in the waddle
const GOOSE_DUTY = 0.6;        // of a step cycle, a foot on the road
const GOOSE_TD_X = -2.3;       // touch-down, from under the hip (−x is forward)
const GOOSE_HOP = 5.5;         // the hop's height, goose units
// Road per ring, in goose units: about the old cycle rate (2.2 a second) at vx −50 and
// the goose's drawn size (FIT ≈ 0.9 world per unit).
export const GOOSE_ROAD = 25;
const lerp = (a, b, k) => a + (b - a) * k;
function gooseHermite(p0, p1, m0, m1, v) {
  const v2 = v * v, v3 = v2 * v;
  return (2 * v3 - 3 * v2 + 1) * p0 + (v3 - 2 * v2 + v) * m0 + (-2 * v3 + 3 * v2) * p1 + (v3 - v2) * m1;
}
function gooseIk(ax, ay, bx, by, l1, l2, side) {
  const dx = bx - ax, dy = by - ay;
  const d = Math.hypot(dx, dy) || 1e-4;
  const dd = Math.min(d, (l1 + l2) * 0.998);
  const a = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd);
  const hh = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const ux = dx / d, uy = dy / d;
  return { x: ax + ux * a + uy * hh * side, y: ay + uy * a - ux * hh * side };
}
// A foot in the waddle: `lp` is the step-cycle phase. On the road it moves back (+x) at
// the road's speed; in the air it swings forward on a curve leaving and arriving at it.
function gooseStepFoot(lp, td) {
  const S = GOOSE_ROAD * GOOSE_STEP_END / GOOSE_LEG_CYCLES;   // road per step cycle
  const u = (((lp - td) % 1) + 1) % 1;
  const loX = GOOSE_TD_X + S * GOOSE_DUTY;
  if (u < GOOSE_DUTY) return { x: GOOSE_TD_X + S * u, y: 0, down: true };
  const v = (u - GOOSE_DUTY) / (1 - GOOSE_DUTY);
  const m = S * (1 - GOOSE_DUTY) * 0.45;
  return { x: gooseHermite(loX, GOOSE_TD_X, m, m, v), y: 1.3 * Math.pow(Math.sin(Math.PI * v), 1.2), down: false };
}
function gooseFeet(ph) {
  const step = (lp) => [gooseStepFoot(lp, 0), gooseStepFoot(lp, 0.5)];
  if (ph < GOOSE_STEP_END) return step((ph / GOOSE_STEP_END) * GOOSE_LEG_CYCLES);
  // The hop: from where the waddle left each foot to where the next waddle picks it up,
  // tucked up under the body on the way.
  const v = (ph - GOOSE_STEP_END) / (1 - GOOSE_STEP_END);
  const a = step(GOOSE_LEG_CYCLES - 1e-6), b = step(0);
  const e = v * v * (3 - 2 * v);
  return a.map((f, i) => ({
    x: lerp(f.x, b[i].x, e) + 0.8 * Math.sin(Math.PI * v),
    y: lerp(f.y, b[i].y, e) + 3.8 * Math.sin(Math.PI * v),
    down: false,
  }));
}
// The wing, folded, in the body's frame: root (buried in the body) at the shoulder, the
// leading edge back along the top to the tip, the scalloped trailing edge home. `open`
// leaves the root edge out, for the stroke.
function gooseWing(c, open) {
  if (open) c.moveTo(-1.9, -2.5); else { c.moveTo(-0.8, 0.4); c.lineTo(-1.9, -2.5); }
  c.bezierCurveTo(1.5, -4.4, 5.6, -4.4, 8.7, -4.0);
  c.quadraticCurveTo(8.4, -2.8, 7.2, -2.8);
  c.quadraticCurveTo(6.8, -1.8, 5.4, -1.8);
  c.quadraticCurveTo(4.9, -0.8, 3.4, -0.7);
  c.quadraticCurveTo(1.4, 0.6, -0.8, 0.4);
  if (!open) c.closePath();
}
const GOOSE_WING_PIVOT = { x: -1.3, y: -1.2 };
function paintGooseWing(ctx, ang, fill, shade) {
  ctx.save();
  ctx.translate(GOOSE_WING_PIVOT.x, GOOSE_WING_PIVOT.y);
  ctx.rotate(ang);
  ctx.translate(-GOOSE_WING_PIVOT.x, -GOOSE_WING_PIVOT.y);
  gooseFill(ctx, fill, (c) => gooseWing(c, false));
  ctx.save(); ctx.beginPath(); gooseWing(ctx, false); ctx.clip();
  gooseFill(ctx, shade, (c) => c.ellipse(4.4, -0.2, 6.2, 1.6, -0.12, 0, TAU));
  ctx.restore();
  gooseStroke(ctx, GOOSE.ink, GOOSE_LINE, (c) => gooseWing(c, true));
  ctx.restore();
}
function goose(ctx, w, h, frame = 0) {
  const P = GOOSE;
  const ph = (frame % GOOSE_FRAMES) / GOOSE_FRAMES;
  const u = ph * TAU;                                         // the body's own cycle, as before
  const hopV = ph < GOOSE_STEP_END ? 0 : (ph - GOOSE_STEP_END) / (1 - GOOSE_STEP_END);
  const hop = hopV > 0 ? Math.sin(Math.PI * hopV) : 0;
  const bob = Math.abs(Math.sin(u)) * 0.8 * (1 - hop) + GOOSE_HOP * hop;
  const rock = 0.05 * Math.sin(u);                            // tipping onto each foot
  const s = Math.min(w / (GOOSE_SPAN.left + GOOSE_SPAN.right + GOOSE_PAD), h / GOOSE_SPAN.top);
  ctx.save();
  ctx.translate(w - GOOSE_SPAN.right * s, h);
  ctx.scale(s, s);
  // Legs: the hip rides the body (and its rock); shin to an ankle breaking backward,
  // tarsus to a webbed foot lying flat on the road and folding toes-down in the air.
  const feet = gooseFeet(ph);
  const pivot = { x: 1.0, y: -6.2 - bob };
  const rotPt = (x, y) => {
    const c = Math.cos(rock), sn = Math.sin(rock), dx = x - pivot.x, dy = y - pivot.y;
    return { x: pivot.x + dx * c - dy * sn, y: pivot.y + dx * sn + dy * c };
  };
  for (const side of [1, 0]) {
    const f = feet[side];
    const hip = rotPt(side ? 1.2 : -0.2, -4.6 - bob);
    const fy = -f.y;
    const ank = gooseIk(hip.x, hip.y, f.x + 0.1, fy - 0.35, 3.0, 2.9, -1);
    const col = side ? P.legDark : P.leg;
    const leg = (c) => { c.moveTo(hip.x, hip.y); c.lineTo(ank.x, ank.y); c.lineTo(f.x + 0.1, fy - 0.35); };
    gooseStroke(ctx, P.ink, 1.25, leg);
    gooseStroke(ctx, col, 0.72, leg);
    const tilt = f.down ? 0 : 0.6 * Math.min(1, f.y / 1.2);
    ctx.save(); ctx.translate(f.x, fy); ctx.rotate(-tilt);
    gooseInk(ctx, col, GOOSE_LINE, (c) => { c.moveTo(0.6, -0.5); c.lineTo(-2.3, -0.1); c.lineTo(-1.9, 0.45); c.lineTo(0.5, 0.25); c.closePath(); });
    ctx.restore();
  }
  ctx.translate(pivot.x, pivot.y);
  ctx.rotate(rock);
  ctx.translate(-pivot.x, 0);
  // Folded, the wings ride the old gentle flap; for the hop they open and beat once.
  const fold = 0.06 * Math.sin(u + 1);
  const open = hop > 0 ? -0.9 * Math.sin(Math.PI * Math.min(1, hopV * 1.3)) : 0;
  // The far wing shows only as it lifts, behind the body.
  if (open < -0.05) paintGooseWing(ctx, open - 0.25, P.wingShade, P.bodyShade);
  const nb = Math.sin(u * 2) * 0.5;
  const body = (c) => {
    c.moveTo(-4.2, -2.4); c.quadraticCurveTo(-5.8, 2.8, 0.8, 3); c.quadraticCurveTo(5.8, 3, 7.2, -1);
    c.lineTo(9.2, -4.8); c.lineTo(6.4, -3.6); c.quadraticCurveTo(2, -4.4, -4.2, -2.4); c.closePath();
  };
  // Wide at the root — its top edge leaves the back, its underside leaves the breast —
  // and tapering to the head, with a slight S on the underside.
  const neck = (c) => {
    c.moveTo(-0.6, -3.8);
    c.bezierCurveTo(-4.2, -4.9, -6.4, -4.8 + nb, -10.2, -3.8 + nb);
    c.lineTo(-10.6, -1.3 + nb);
    c.bezierCurveTo(-7.4, -1.6 + nb, -5.8, -0.4, -3.2, 1.8);
    c.closePath();
  };
  const head = (c) => c.ellipse(-11.2, -2.5 + nb, 2.2, 1.7, -0.1, 0, TAU);
  // THE BEAK, drawn BEFORE the silhouette so it grows out of the head (Peter, 24 Sep:
  // "its beak is not attached cleanly and there is some red thing in its mouth, just
  // want to see the beak quacking/snapping"). Two mandibles on ONE hinge at the face,
  // their roots sunk well inside the head: the head's own outline and fill then cover
  // the join, so the only seam is the face's edge. No mouth fill — open, you see
  // through; shut, the two halves meet. It SNAPS: fully closed, then wide, twice a
  // stride, quick on the open and quicker on the shut.
  const snap = Math.max(0, Math.sin(u * 2));
  const gape = snap ** 0.55;
  const beakAt = (rot, path) => {
    ctx.save();
    ctx.translate(-12.9, -2.35 + nb);
    ctx.rotate(rot);
    gooseInk(ctx, P.beak, GOOSE_LINE, path);
    ctx.restore();
  };
  // Lower mandible first, so the upper one's edge lies over it when shut.
  beakAt(-gape * 0.42, (c) => {
    c.moveTo(1.6, 0.05); c.lineTo(-3.6, 0.1);
    c.quadraticCurveTo(-3.4, 0.75, -2.4, 0.95);
    c.lineTo(1.6, 1.2); c.closePath();
  });
  beakAt(gape * 0.3, (c) => {
    c.moveTo(1.6, -1.05); c.quadraticCurveTo(-1.6, -1.05, -4.2, 0.05);
    c.lineTo(-3.6, 0.2); c.lineTo(1.6, 0.2); c.closePath();
  });
  // HONK: three short strokes fanning out from the beak tip as it snaps open, longer the
  // wider it gapes, like the cartoon marks a shout gets. Same ink and line as the bird.
  if (gape > 0.25) {
    const k = (gape - 0.25) / 0.75;
    ctx.save();
    ctx.translate(-16.4, -2.3 + nb);
    ctx.strokeStyle = P.ink; ctx.lineWidth = GOOSE_LINE * 1.5; ctx.lineCap = 'round';
    ctx.beginPath();
    // Three separate dashes, not a chevron: each starts well clear of the beak tip.
    for (const a of [-0.75, 0, 0.75]) {
      const r0 = 1.8 + 0.4 * k, r1 = r0 + 1.2 + 1.6 * k;
      const ang = Math.PI + a;
      ctx.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0);
      ctx.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
    }
    ctx.stroke();
    ctx.restore();
  }
  // One silhouette: every outline first, then every fill over it.
  for (const part of [body, neck, head]) gooseStroke(ctx, P.ink, GOOSE_LINE * 2, part);
  for (const part of [body, neck, head]) gooseFill(ctx, P.body, part);
  ctx.save(); ctx.beginPath(); body(ctx); ctx.clip();
  gooseFill(ctx, P.bodyShade, (c) => c.ellipse(1.6, 2.8, 7.4, 2.2, 0, 0, TAU));
  ctx.restore();
  // The neck's own shadow along its underside, running into the breast shade.
  ctx.save(); ctx.beginPath(); neck(ctx); ctx.clip();
  gooseFill(ctx, P.bodyShade, (c) => {
    c.moveTo(-10.8, -1.2 + nb); c.bezierCurveTo(-7.4, -1.4 + nb, -5.8, -0.2, -3.2, 2.2);
    c.lineTo(-2.6, 0.6); c.bezierCurveTo(-5.6, -1.6, -7.6, -2.2 + nb, -10.8, -2 + nb); c.closePath();
  });
  ctx.restore();
  // THE EYE (16 Oct 2026: "position gooses eye a bit better he looks stupid"): forward on
  // the head, over the root of the beak where a goose's eye actually sits, rather than
  // mid-skull — which gave him a blank, far-set stare. (A brow was tried and dropped.)
  gooseFill(ctx, '#1a1816', (c) => c.ellipse(-11.85, -2.9 + nb, 0.44, 0.5, 0, 0, TAU));
  paintGooseWing(ctx, fold + open, P.body, P.wingShade);
  ctx.restore();
}

// ------------------------------------------------------------------- exports
// The five tables sprites/props.js spreads into its own. Keeping them together
// at the bottom is what makes the registration one line each over there.
export const ANIMAL_PAINTERS = {
  // The three dogs are sprites/dogs.js (the dogs bake-off's B, shipped 24 Sep 2026).
  ...DOG_PAINTERS,
  catFury: (ctx, w, h, frame = 0) => quadruped(ctx, w, h, frame, BREEDS.catFury),
  cryptPanther: (ctx, w, h, frame = 0) => {
    ctx.save(); ctx.scale(w / 100, h / 70);
    paintCryptPanther(ctx, (frame % FELINE_FRAMES) / FELINE_FRAMES);
    ctx.restore();
  },
  // SPEED ZONE's streak bobcat, in the bruiser's place there (sprites/bobcat.js).
  bobcat: paintBobcat,
  rattlesnake,
  goose,
  ...CAT_PAINTERS,
};

// The finish dog keeps the same three bodies, colours and gait as the lane
// dogs. Only its showcase silhouette changes: all three finish skins get a
// long tail so the larger guard reads as a complete dog when it arrives at the
// tape. The aliases remain separate so the finish-only art never leaks into a
// mid-lane encounter. Painted by sprites/dogs.js, re-exported here so props.js
// keeps its one import line.
export const FINISH_DOG_PAINTERS = DOG_FINISH_PAINTERS;

export const ANIMAL_NAMES = Object.keys(ANIMAL_PAINTERS);

// THE STRIKERS: animals that sit still and lash out once AS THE HERO ARRIVES — the run
// starts `strikeT` when he is `lead` seconds away (run.js, the def's `strikes` flag) and
// draw.js steps the `strike` frames after the `idle` ring from it, over `t` seconds.
export const STRIKERS = {
  rattlesnake: { idle: SNAKE_IDLE_FRAMES, strike: SNAKE_STRIKE_FRAMES, t: SNAKE_STRIKE_T, lead: SNAKE_STRIKE_LEAD },
  ...Object.fromEntries(CAT_TYPES.map((type) => [type,
    { idle: CAT_IDLE_FRAMES, strike: CAT_STRIKE_FRAMES, t: SWIPE_T, lead: CAT_STRIKE_LEAD }])),
};

export const ANIMAL_FRAMES = {
  dogSnarler: DOG_FRAMES, dogBruiser: DOG_FRAMES, dogFeral: DOG_FRAMES, catFury: FELINE_FRAMES,
  cryptPanther: FELINE_FRAMES,
  bobcat: BOBCAT_FRAMES,
  rattlesnake: SNAKE_FRAMES,
  goose: GOOSE_FRAMES,
  ...Object.fromEntries(CAT_TYPES.map((t) => [t, CAT_FRAMES])),
};

// The dogs' and the three running cats' rates here are overwritten below (THE PLANTED
// GALLOP'S CLOCK): derived from each one's stride and speed, not chosen.
// A gallop outruns a rotor. The bruiser's short legs cycle FASTER than the
// long-legged pair, not slower: stride length and stride rate trade off, and a
// short-strided animal keeping up has to take more steps to do it.
export const ANIMAL_FPS = {
  dogSnarler: 16, dogBruiser: 18, dogFeral: 15, catFury: 20,
  cryptPanther: 12,
  bobcat: 16,
  rattlesnake: SNAKE_FPS,
  goose: 22, // overwritten below: the waddle-and-hop's clock
  ...Object.fromEntries(CAT_TYPES.map((t) => [t, CAT_FPS])),
};

// Art height as a multiple of the collision box. The two with fur standing up
// need the headroom; the bruiser is drawn inside its box because the whole
// point of it is that it is low.
export const ANIMAL_TALL = {
  dogSnarler: 1.05, dogBruiser: 1.0, dogFeral: 1.15, catFury: 1.12,
  cryptPanther: 1.0,
  bobcat: BOBCAT_TALL,
  // The snake's neck and rattle stand over a box kept at the height of its coil; 1.45
  // (was 1.25) since 16 Oct, headroom for the head rearing up on the wind-up.
  rattlesnake: 1.45,
  goose: 1.35,
  // The swiping cats sit up over a box the height of their haunches (the bake-off's slot).
  ...Object.fromEntries(CAT_TYPES.map((t) => [t, 1.45])),
  // The lucky cat's beckoning paw and bigger head stand taller than the others; the
  // art is taller, the box is the same.
  catManeki: 1.75,
};

// Supersampling. This is NOT the only multiplier: rasterize() applies its own
// SS (8, in sprites/props.js) on top, so the cached canvas is
// def.w * detail * 8 pixels wide — 256 for the snarler at detail 2, not 32.
//
// What it has to clear is the DEVICE footprint, and three multipliers sit
// between the def box and the screen:
//
//   the 4/3 hazard overdraw x propVisualScale   1.56x
//   the camera, applyWorld's ctx.scale(z, z)    1.6x desktop / 2.0 tablet / 2.2 phone
//   the adaptive backbuffer density             1x to 5x (STANDARD_RUNGS, renderer.js)
//
// So a 16-unit dog is 120 to 286 device pixels wide in play — never the 25 its
// def box suggests. At detail 2 the 256px raster is downsampled at every rung
// a player is realistically on, and magnified 1.06x only on a density-5 iPad
// at its most zoomed, which is not a visible difference.
//
// 2, not the 3 this shipped at, and the reason is memory rather than looks:
// because of the SS(8) above, each step costs more than it appears. 3 holds
// 7.4MB resident for a cabinet's two animals against 3.3MB at 2, for headroom
// on one rung nobody can see. 2 also matches every other refined prop in the
// set (see tests/props.js), so there is one rule here rather than an exception.
//
// If ZOOM_PHONE (game/run.js) or the density ladder moves, re-derive against
// that 286px worst case rather than adjusting this by eye.
// 1.5 since 16 Oct 2026 for the running animals: the planted gallop doubled their rings
// to 16 frames, and Peter A/B'd 2 against 1.5 and 1 at the sharpest any player sees them
// (lab animal-detail-ab: "i can't even tell.. lets go with 1.5") — which buys the memory
// back (the wolf's ring 4.4MB -> 2.5MB, the bobcat's 6.0 -> 3.4).
export const ANIMAL_DETAIL = {
  dogSnarler: 1.5, dogBruiser: 1.5, dogFeral: 1.5, catFury: 1.5, goose: 1.5,
  cryptPanther: 1.5,
  bobcat: 1.5,
  // One, not two: the snake's ring is 24 frames, and at two it would hold four times
  // the pixels of a dog's eight for a drawing that is mostly flat tone.
  rattlesnake: 1,
  // One, as the snake: a 36-frame ring.
  ...Object.fromEntries(CAT_TYPES.map((t) => [t, 1])),
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
  // The feral is the wolf since 16 Oct, drawn bigger on a bigger box (18x13, was 17x12;
  // 1.22, was 1.16 — Peter: "his size a little larger", "bigger hit box is fine").
  dogSnarler: 1.16, dogBruiser: 1.16, dogFeral: 1.22, catFury: 1.24,
  // The panther has the cat's 11x9 collision box; draw its long body at the
  // selected gallery size without making the jump timing harder.
  cryptPanther: 1.7,
  // UNDER 1: the bobcat's 29x13 box already covers his head and body over the whole
  // stride (only the tail, tufts and paws overhang it), so the art is not blown up past
  // it the way the dogs' is.
  bobcat: BOBCAT_VISUAL,
  // Drawn at its box: its box already takes in the strike.
  rattlesnake: 1,
  ...Object.fromEntries(CAT_TYPES.map((t) => [t, 1])),
  // 1.1 for the bird, times the room its honk lines need (GOOSE_PAD): same size on screen.
  goose: 1.1 * (16.4 + 9.8 + 5.5) / (16.4 + 9.8),
};

// THE PLANTED GALLOP'S CLOCK (16 Oct 2026; sprites/dogs.js gallopPose). A dog's ring is
// stepped by how far it has actually run, not by a fixed rate: the stride is the road
// that passes under a planted foot in one cycle, at the size the dog is drawn, and the
// run advances `gaitPh` by |vx| / stride (run.js), so the feet stay on the road at any
// speed — the finish guard's included, which accelerates. ANIMAL_FPS is the same clock
// at the def's own vx, for anything that draws a dog without a run (menus, gallery).
// The boxes and speeds mirror game/entities.js (dogSnarler, dogBruiser, dogFeral,
// finishDog); change them together.
const DOG_BOXES = {
  dogSnarler: ['snarler', 16, 11, 62],
  dogBruiser: ['bruiser', 15, 10, 38],
  dogFeral: ['feral', 18, 13, 68],
};
const FINISH_BOX = [22, 15];
const FINISH_OF = { finishSnarler: 'dogSnarler', finishBruiser: 'dogBruiser', finishFeral: 'dogFeral' };
export const ANIMAL_STRIDE = {};
for (const [name, [breed, w, h, v]] of Object.entries(DOG_BOXES)) {
  ANIMAL_STRIDE[name] = dogStride(breed, false, w, h, ANIMAL_TALL[name], ANIMAL_VISUAL[name]);
  ANIMAL_FPS[name] = DOG_FRAMES * v / ANIMAL_STRIDE[name];
}
for (const [alias, base] of Object.entries(FINISH_OF)) {
  ANIMAL_STRIDE[alias] = dogStride(DOG_BOXES[base][0], true, FINISH_BOX[0], FINISH_BOX[1], ANIMAL_TALL[base], ANIMAL_VISUAL[base]);
}
// The three running cats on the feline planted gallop (sprites/felineGait.js), the same
// clock: each rig turns its stride into world units at the size it is drawn — the box x
// 4/3 x VISUAL wide, and x TALL as well in height. Boxes and speeds mirror
// game/entities.js (catFury, cryptPanther, bobcat); change them together.
const FELINE_BOXES = {
  catFury: [11, 9, 78],
  cryptPanther: [11, 9, 78],
  bobcat: [29, 13, 38],
};
const FELINE_STRIDE = {
  // The quadruped is drawn in fractions of its box: its gait leg is a height.
  catFury: (w, h, n) => {
    const P = BREEDS.catFury;
    return P.gallop.strideL * (P.leg + P.chest * 0.56) * h * 4 / 3 * ANIMAL_TALL[n] * ANIMAL_VISUAL[n];
  },
  cryptPanther: (w, h, n) => cryptPantherStride(w * 4 / 3 * ANIMAL_VISUAL[n]),
  bobcat: (w, h, n) => bobcatStride(w, ANIMAL_VISUAL[n]),
};
for (const [name, [w, h, v]] of Object.entries(FELINE_BOXES)) {
  ANIMAL_STRIDE[name] = FELINE_STRIDE[name](w, h, name);
  ANIMAL_FPS[name] = FELINE_FRAMES * v / ANIMAL_STRIDE[name];
}

// The goose on the same clock (the waddle-and-hop, goose() above): GOOSE_ROAD goose units
// of road a ring, at the scale goose() fits itself to its art box. Box and speed mirror
// game/entities.js (goose, 16x11, vx −50).
{
  const [w, h, v] = [16, 11, 50];
  const fit = Math.min(w * 4 / 3 * ANIMAL_VISUAL.goose / (GOOSE_SPAN.left + GOOSE_SPAN.right + GOOSE_PAD),
    h * 4 / 3 * ANIMAL_TALL.goose * ANIMAL_VISUAL.goose / GOOSE_SPAN.top);
  ANIMAL_STRIDE.goose = GOOSE_ROAD * fit;
  ANIMAL_FPS.goose = GOOSE_FRAMES * v / ANIMAL_STRIDE.goose;
}

// Cycles per second of an entity's gallop right now: the road it covers over its
// stride, or — waiting at the post, not moving — the def's own rate in place.
export function animalGaitRate(e) {
  const name = e.skin || e.def?.sprite || e.type;
  const stride = ANIMAL_STRIDE[name];
  if (!stride) return 0;
  const v = Math.abs(e.vx || 0);
  const base = FINISH_OF[name] || name;
  return v > 1e-3 && !e.waiting ? v / stride : (ANIMAL_FPS[base] || 15) / (ANIMAL_FRAMES[base] || DOG_FRAMES);
}
// Advance `gaitPh` (cycles) by dt — run.js, wherever a galloper moves. draw.js picks the
// ring's frame from it; anything drawn without a run falls back to the ANIMAL_FPS clock.
export function stepGait(e, dt) {
  const r = animalGaitRate(e);
  if (!r) return;
  if (e.gaitPh == null) e.gaitPh = e.bobPhase || 0;
  e.gaitPh += r * dt;
}
