// Flat-cartoon vector heroes: one painter for every hero render site.
// Soft dark outlines, flat colors, procedural animation. Resolution
// independent — drawn at device resolution in-run (via pushOverlayDraw)
// and cached/supersampled for tiny static sites (HUD faces, hub NPCs).
// Colors come from HERO_SPRITES palettes so pixel and toon stay in sync.
import { HERO_SPRITES } from './heroes.js';

const OUTLINE = 'rgba(26,16,40,0.32)';
const pal = (id) => HERO_SPRITES[id].pal;

// rig: humanoid | blob | disc. head/back/etc select per-hero decorations.
export const TOON_SPECS = {
  lorenzo: { rig: 'humanoid', head: 'cap', nose: true, mustache: true, straps: true, plumber: true, stout: true },
  gnash: { rig: 'humanoid', head: 'jackal', mouth: 'smirk', tail: true },
  fernwick: { rig: 'humanoid', head: 'floppy', mouth: 'smile', back: 'shield', tunic: true, rollDuck: true },
  b33p: { rig: 'humanoid', head: 'dome', mouth: 'grille', cannon: true },
  mochi: { rig: 'pika' },
  chompo: { rig: 'disc' },
  gary: { rig: 'humanoid', head: 'paperhat', mouth: 'flat', nameTag: true },
  raymn: { rig: 'ray' },
  grumpos: { rig: 'humanoid', heavy: true, head: 'bald', beard: true, back: 'axe' },
};

// ---------------------------------------------------------------- helpers
function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
function outlined(ctx, fill, ow, pathFn) {
  ctx.beginPath();
  pathFn(ctx);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = ow;
  ctx.stroke();
}
// two-pass round-cap stroke: fat outline pass, then the fill pass inside
function limb(ctx, x1, y1, x2, y2, w, fill, ow) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = w + ow * 2;
  ctx.stroke();
  ctx.strokeStyle = fill;
  ctx.lineWidth = w;
  ctx.stroke();
}
function dot(ctx, x, y, r, fill) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}
// analytic 2-bone joint: where the knee/elbow sits between (x1,y1)-(x2,y2);
// dir=+1 bends toward +x, -1 toward -x. Straightens naturally when the
// target is at full reach.
function joint(x1, y1, x2, y2, seg, dir) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const d = Math.hypot(dx, dy) || 1e-6;
  const h = Math.sqrt(Math.max(0, seg * seg - (d * d) / 4));
  return [mx + (dy / d) * h * dir, my + (-dx / d) * h * dir];
}
// two-segment limb (thigh+shin / upper+forearm) with a soft joint bend
function limb2(ctx, x1, y1, x2, y2, seg, dir, w, fill, ow) {
  const [jx, jy] = joint(x1, y1, x2, y2, seg, dir);
  for (const [lw, col] of [[w + ow * 2, OUTLINE], [w, fill]]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(jx, jy);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}
// running foot path: backward along the ground during stance, lifting
// forward during swing (p in cycles; returns [x, y] with ground at y=0)
function gaitFoot(p, stride, lift) {
  const th = p * Math.PI * 2;
  return [Math.cos(th) * stride, -Math.max(0, -Math.sin(th)) * lift];
}

// Softer variant for Ray M'N's disconnected shoes. Squaring the lift curve
// gives it zero velocity at takeoff/landing, avoiding a visible pop.
function floatingFoot(p, stride, lift) {
  const th = p * Math.PI * 2;
  const airborne = Math.max(0, -Math.sin(th));
  return [Math.cos(th) * stride, -(airborne * airborne) * lift];
}

// ---------------------------------------------------------------- faces
const FACE_SEED = { lorenzo: 0.2, gnash: 1.1, fernwick: 2.4, b33p: 3.2, mochi: 4.1, chompo: 5.3, gary: 0.8, raymn: 2.9, grumpos: 4.7 };

// ------------------------------------------------------ victory routines
// The results screen holds for a while, so a single looping wiggle reads as a
// freeze-frame. Every hero runs a two-beat routine instead: their own bouncy
// signature, then a bigger move (hop / turn / bow / shimmy). Cycles are offset
// per hero by the face seed so the line-up looks like a crowd rather than one
// animation played nine times.
const CELEBRATE_MOVE = {
  lorenzo: 'hop', gnash: 'spin', fernwick: 'spin', b33p: 'shimmy', mochi: 'hop',
  chompo: 'spin', gary: 'bow', raymn: 'shimmy', grumpos: 'bow',
};
// How high the signature bounce carries each hero. The light ones leave the
// floor; Grumpos and the robot mostly rock in place.
const CELEBRATE_BOUNCE = { mochi: 0.15, chompo: 0.11, lorenzo: 0.09, raymn: 0.07, grumpos: 0.03, b33p: 0.035 };
const CEL_CYCLE = 2.6, CEL_SIG = 0.6; // seconds per loop; fraction on the signature

function celebrateMotion(id, t) {
  const seed = FACE_SEED[id] || 0;
  const c = ((t + seed * 0.4) % CEL_CYCLE) / CEL_CYCLE;
  const amp = CELEBRATE_BOUNCE[id] != null ? CELEBRATE_BOUNCE[id] : 0.055;
  const m = { lift: 0, x: 0, tilt: 0, spin: 1, squash: 0, peak: false, move: null, q: 0 };
  if (c < CEL_SIG) {
    const b = Math.sin(c * CEL_CYCLE * 6);
    m.lift = Math.abs(b) * amp;
    m.tilt = Math.sin(c * CEL_CYCLE * 3) * 0.06;
    m.squash = Math.max(0, -b) * 0.25;      // land into a knee-bend, then spring
    m.peak = b > 0.3;
    return m;
  }
  const q = (c - CEL_SIG) / (1 - CEL_SIG);  // 0..1 through the big move
  const move = CELEBRATE_MOVE[id] || 'hop';
  m.move = move; m.q = q;
  if (move === 'spin') {
    m.lift = Math.sin(q * Math.PI) * 0.17;
    m.spin = Math.cos(q * Math.PI * 2);     // squeeze through zero: a flat turn
    m.peak = true;
  } else if (move === 'bow') {
    const d = Math.sin(q * Math.PI);
    m.tilt = d * 0.26; m.x = d * 0.05; m.squash = d * 0.3; m.peak = d < 0.5;
  } else if (move === 'shimmy') {
    const w = Math.sin(q * Math.PI * 8);
    m.x = w * 0.06; m.tilt = Math.sin(q * Math.PI * 8 + 1) * 0.1;
    m.lift = Math.abs(w) * 0.05; m.peak = true;
  } else {                                   // hop: two big airborne bounds
    const arc = Math.abs(Math.sin(q * Math.PI * 2));
    m.lift = arc * 0.26; m.tilt = Math.sin(q * Math.PI * 2) * 0.09;
    m.squash = Math.max(0, 0.3 - arc) * 0.8; m.peak = arc > 0.4;
  }
  return m;
}

function expressionFor(id, pose = {}) {
  const t = pose.time || 0;
  const seed = FACE_SEED[id] || 0;
  // Two quick frames roughly every four seconds, offset per hero so the cast
  // never blinks in eerie unison. Action faces override the idle blink.
  const blinkGap = pose.menu ? 1.8 + seed * 0.08 : 3.6 + seed * 0.11;
  const blinkPhase = (t + seed) % blinkGap;
  const active = pose.kind === 'jump' || pose.kind === 'duck' || pose.kind === 'celebrate' || pose.stomp || pose.roll || pose.float;
  const joy = pose.kind === 'celebrate';
  // Celebrating faces ride the routine: at the top of a bounce the grin opens
  // into a full cheer, and between beats the eyes squeeze shut, delighted.
  const cheer = joy && celebrateMotion(id, t).peak;
  return {
    blink: !active && blinkPhase < (pose.menu ? 0.2 : 0.13),
    focus: pose.kind === 'run' || pose.kind === 'duck' || pose.roll,
    surprise: pose.kind === 'jump' && !pose.stomp,
    joy,
    cheer,
    effort: !!(pose.stomp || pose.roll || pose.headless),
    mood: id === 'gnash' || id === 'raymn' ? 'cocky'
      : id === 'fernwick' ? 'bright'
      : id === 'b33p' ? 'robot'
      : id === 'grumpos' ? 'gruff'
      : id === 'lorenzo' ? 'worried' : 'soft',
  };
}

function drawEyes(ctx, p, u, cx, cy, lod, ex = {}) {
  const sep = 0.075 * u;
  if (ex.mood === 'robot') {
    // LED eyes on the faceplate: glowing bars, no whites or pupils. They
    // squash to slits for a blink and stretch tall in surprise.
    if (ex.joy && !ex.cheer) {
      // delight, robot dialect: the LEDs bend into little ^ arcs
      ctx.strokeStyle = p.w;
      ctx.lineWidth = Math.max(1, 0.03 * u);
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + sx * sep - 0.04 * u, cy + 0.02 * u);
        ctx.quadraticCurveTo(cx + sx * sep, cy - 0.05 * u, cx + sx * sep + 0.04 * u, cy + 0.02 * u);
        ctx.stroke();
      }
      return;
    }
    const lw = 0.045 * u;
    const lh = ex.blink ? 0.011 * u : ex.surprise || ex.cheer ? 0.068 * u : 0.05 * u;
    const lookX = ex.focus ? 0.012 * u : 0;
    for (const sx of [-1, 1]) {
      outlined(ctx, p.w, Math.max(0.5, 0.015 * u), (c) =>
        roundRectPath(c, cx + sx * sep + lookX - lw, cy - lh, lw * 2, lh * 2, Math.min(lw, lh) * 0.8));
    }
    return;
  }
  if (ex.blink) {
    ctx.strokeStyle = p.e;
    ctx.lineWidth = Math.max(0.8, 0.025 * u);
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * sep - 0.035 * u, cy);
      ctx.quadraticCurveTo(cx + sx * sep, cy + 0.018 * u, cx + sx * sep + 0.035 * u, cy);
      ctx.stroke();
    }
    return;
  }
  // Happy-arc eyes: squeezed shut between cheers, the classic ^ ^ of delight.
  if (ex.joy && !ex.cheer) {
    ctx.strokeStyle = p.e;
    ctx.lineWidth = Math.max(0.9, 0.028 * u);
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * sep - 0.04 * u, cy + 0.02 * u);
      ctx.quadraticCurveTo(cx + sx * sep, cy - 0.055 * u, cx + sx * sep + 0.04 * u, cy + 0.02 * u);
      ctx.stroke();
    }
    return;
  }
  if (lod) {
    dot(ctx, cx - sep, cy, 0.032 * u, p.e);
    dot(ctx, cx + sep, cy, 0.032 * u, p.e);
    return;
  }
  for (const sx of [-1, 1]) {
    outlined(ctx, '#fff', Math.max(0.75, 0.02 * u), (c) => c.ellipse(cx + sx * sep, cy, 0.055 * u, 0.065 * u, 0, 0, Math.PI * 2));
    const lookX = ex.focus ? 0.012 * u : 0;
    const lookY = ex.surprise || ex.cheer ? -0.005 * u : 0.012 * u;
    dot(ctx, cx + sx * sep + lookX, cy + lookY, 0.026 * u, p.e);
  }
  if (!lod && ex.mood !== 'bright' && (ex.focus || ex.mood === 'cocky' || ex.mood === 'gruff')) {
    // Fernwick (mood 'bright') draws NO brows — a bare, open brow keeps him
    // sweet and lets his blond bangs frame the eyes while running.
    ctx.strokeStyle = p.e; ctx.lineWidth = Math.max(0.7, 0.018 * u);
    ctx.beginPath();
    ctx.moveTo(cx - sep - 0.05 * u, cy - 0.08 * u);
    ctx.lineTo(cx - sep + 0.045 * u, cy - (ex.mood === 'worried' ? 0.055 : 0.045) * u);
    ctx.moveTo(cx + sep - 0.045 * u, cy - 0.045 * u);
    ctx.lineTo(cx + sep + 0.05 * u, cy - 0.08 * u);
    ctx.stroke();
  }
}
function drawMouth(ctx, spec, p, u, cx, cy, ow, ex = {}) {
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1, ow * 0.7);
  ctx.beginPath();
  if (ex.joy) {
    // An actual smile: a filled D-grin that widens into a whoop on the peaks.
    const w = (ex.cheer ? 0.085 : 0.065) * u, d = (ex.cheer ? 0.075 : 0.038) * u;
    ctx.stroke();
    outlined(ctx, p.m || p.e, Math.max(0.5, ow * 0.45), (c) => {
      c.moveTo(cx - w, cy - 0.012 * u);
      c.quadraticCurveTo(cx, cy + d * 1.9, cx + w, cy - 0.012 * u);
      c.closePath();
    });
    return;
  }
  if (ex.surprise) {
    ctx.stroke();
    outlined(ctx, p.m || p.e, Math.max(0.5, ow * 0.45), (c) => c.ellipse(cx, cy, 0.035 * u, 0.045 * u, 0, 0, Math.PI * 2));
    return;
  } else if (ex.effort) {
    ctx.moveTo(cx - 0.05 * u, cy + 0.015 * u); ctx.lineTo(cx + 0.055 * u, cy - 0.005 * u);
  } else if (spec.mouth === 'smile') ctx.arc(cx, cy - 0.02 * u, 0.06 * u, 0.25 * Math.PI, 0.75 * Math.PI);
  else if (spec.mouth === 'smirk') { ctx.moveTo(cx, cy + 0.01 * u); ctx.quadraticCurveTo(cx + 0.05 * u, cy + 0.02 * u, cx + 0.08 * u, cy - 0.02 * u); }
  else if (spec.mouth === 'line') { ctx.moveTo(cx - 0.045 * u, cy); ctx.lineTo(cx + 0.045 * u, cy); }
  else if (spec.mouth === 'grille') {
    // speaker grille: three glowing ticks instead of lips
    ctx.strokeStyle = p.w;
    ctx.lineWidth = Math.max(0.7, ow * 0.5);
    for (let i = -1; i <= 1; i++) {
      ctx.moveTo(cx + i * 0.034 * u, cy - 0.018 * u);
      ctx.lineTo(cx + i * 0.034 * u, cy + 0.018 * u);
    }
  }
  else if (spec.mouth === 'flat') { ctx.moveTo(cx - 0.05 * u, cy + 0.01 * u); ctx.lineTo(cx + 0.05 * u, cy + 0.01 * u); }
  else { ctx.stroke(); return; }
  ctx.stroke();
}

// A spike from base corners A and B up to tip T, but with the apex rounded off
// rather than drawn to a sharp point. `round` is how far back down each edge the
// rounding starts (0 = sharp, ~0.3 = soft nub).
function bluntSpike(c, ax, ay, tx, ty, bx, by, round = 0.18) {
  const p1x = ax + (tx - ax) * (1 - round), p1y = ay + (ty - ay) * (1 - round);
  const p2x = bx + (tx - bx) * (1 - round), p2y = by + (ty - by) * (1 - round);
  c.moveTo(ax, ay);
  c.lineTo(p1x, p1y);
  c.quadraticCurveTo(tx, ty, p2x, p2y);
  c.lineTo(bx, by);
  c.closePath();
}

// Head + hat + face, anchored at head center (hx, hy). Shared by the body
// rig and the face-crop sprites.
function drawHead(ctx, id, spec, p, u, ow, hx, hy, lod, pose = {}) {
  const R = (spec.heavy ? 0.22 : 0.21) * u;
  // hair/hat layers that sit BEHIND the head
  if (spec.head === 'jackal') {
    // A matched pair of tall ears, near-symmetric with just a touch of lean so
    // Gnash still reads jackal-like without looking ragged.
    for (const [side, lean, height] of [[-1, -0.05, 1.52], [1, 0.05, 1.44]]) {
      outlined(ctx, p.h, ow, (c) => bluntSpike(c,
        hx + side * R * 0.72, hy - R * 0.32,
        hx + side * R * (0.5 + lean), hy - R * height,
        hx - side * R * 0.02, hy - R * 0.74));
    }
    // A tall central spike crowns the head between the ears.
    outlined(ctx, p.h, ow, (c) => bluntSpike(c,
      hx - R * 0.4, hy - R * 0.58,
      hx + R * 0.02, hy - R * 1.6,
      hx + R * 0.42, hy - R * 0.58));
    outlined(ctx, p.h, ow, (c) => {
      c.moveTo(hx - R * 0.8, hy + R * 0.05);
      c.lineTo(hx - R * 1.22, hy + R * 0.38);
      c.lineTo(hx - R * 0.66, hy + R * 0.52);
      c.closePath();
    });
  }
  if (spec.head === 'floppy') {
    // A single long pointed tail streams behind from the back of the bandana,
    // tapering to a tip that lags and bobs with motion. Drawn BEHIND the head
    // so it reads as gathered at the back and trailing out to the side.
    const motion = pose.kind === 'run' || pose.kind === 'jump';
    const wave = motion ? Math.sin((pose.time || 0) * 7) * R * 0.2 : 0;
    // At rest the long tail drapes down his back under its own weight; running
    // and jumping fling it out behind him.
    const tipX = hx - R * (motion ? 2.35 : 1.12);
    const tipY = hy + R * (motion ? 0.05 : 1.25) + wave;
    outlined(ctx, p.h, ow, (c) => {
      c.moveTo(hx - R * 0.66, hy - R * 0.8);                                 // wide root at the back of the bandana
      c.quadraticCurveTo(hx - R * (motion ? 1.7 : 1.42), hy + R * (motion ? -0.5 : 0.28) + wave, tipX, tipY); // outer edge draping down to the point
      c.quadraticCurveTo(hx - R * (motion ? 1.5 : 0.72), hy + R * (motion ? 0.02 : 0.72) + wave, hx - R * 0.42, hy - R * 0.16); // fuller inner edge back to the bandana
      c.closePath();
    });
    if (!lod) dot(ctx, tipX, tipY, R * 0.12, p.a);
  }
  // Grumpos gets a broad chibi block-head; the softer cast keeps round heads.
  // The path is a named fn so the war paint below can clip to the silhouette.
  const blockHead = (c) => {
    c.moveTo(hx - R, hy + R * 0.18);
    c.quadraticCurveTo(hx - R * 1.02, hy - R * 0.68, hx - R * 0.46, hy - R * 0.98);
    c.quadraticCurveTo(hx, hy - R * 1.22, hx + R * 0.46, hy - R * 0.98);
    c.quadraticCurveTo(hx + R * 1.02, hy - R * 0.68, hx + R, hy + R * 0.18);
    c.lineTo(hx + R * 0.88, hy + R * 0.72);
    c.quadraticCurveTo(hx + R * 0.58, hy + R, hx, hy + R);
    c.quadraticCurveTo(hx - R * 0.58, hy + R, hx - R * 0.88, hy + R * 0.72);
    c.closePath();
  };
  if (id === 'grumpos') {
    outlined(ctx, p.s, ow, blockHead);
  } else {
    outlined(ctx, spec.head === 'dome' || spec.head === 'jackal' ? p.h : p.s, ow, (c) => c.arc(hx, hy, R, 0, Math.PI * 2));
  }
  // hats / hair ON the head
  if (spec.head === 'cap') {
    outlined(ctx, p.h, ow, (c) => { c.arc(hx, hy - R * 0.12, R * 1.02, Math.PI, 0); c.closePath(); });
    outlined(ctx, p.h, ow, (c) => c.ellipse(hx + R * 0.8, hy - R * 0.28, R * 0.5, R * 0.16, 0, 0, Math.PI * 2));
    if (!lod) {
      outlined(ctx, p.a, Math.max(0.6, ow * 0.6), (c) => c.arc(hx + R * 0.12, hy - R * 0.55, R * 0.22, 0, Math.PI * 2));
      // Tiny crossed-tool mark instead of a familiar letter emblem.
      ctx.strokeStyle = p.h; ctx.lineWidth = Math.max(0.6, ow * 0.55);
      ctx.beginPath();
      ctx.moveTo(hx + R * 0.02, hy - R * 0.65); ctx.lineTo(hx + R * 0.22, hy - R * 0.45);
      ctx.moveTo(hx + R * 0.22, hy - R * 0.65); ctx.lineTo(hx + R * 0.02, hy - R * 0.45);
      ctx.stroke();
    }
  } else if (spec.head === 'jackal') {
    // A small windswept brow tuft, not a bank of rear-facing spines.
    outlined(ctx, p.h, ow, (c) => bluntSpike(c,
      hx - R * 0.52, hy - R * 0.74,
      hx - R * 0.05, hy - R * 1.2,
      hx + R * 0.24, hy - R * 0.78));
    // A fan of quills on each side, swept up-and-out to tuck below the ear and
    // fill the crown into one clean silhouette. Two tiers for a fuller set.
    for (const side of [-1, 1]) {
      for (const [bx, by, tx, ty, ex, ey] of [
        [0.6, 0.68, 1.18, 0.88, 0.82, 0.16],    // upper quill
        [0.74, 0.26, 1.2, 0.34, 0.86, -0.24],   // lower quill
      ]) {
        outlined(ctx, p.h, ow, (c) => bluntSpike(c,
          hx + side * R * bx, hy - R * by,
          hx + side * R * tx, hy - R * ty,
          hx + side * R * ex, hy - R * ey));
      }
    }
  } else if (spec.head === 'floppy') {
    // Blond hair: a rounded mass whose crown is hidden under the bandana
    // (drawn next); it shows as a jagged fringe of bangs at the forehead and
    // as sideburns framing the temples.
    outlined(ctx, p.a, ow, (c) => {
      c.moveTo(hx - R * 0.96, hy + R * 0.06);            // left temple / sideburn
      c.quadraticCurveTo(hx - R * 1.1, hy - R * 0.74, hx - R * 0.3, hy - R * 1.04);
      c.quadraticCurveTo(hx + R * 0.42, hy - R * 1.26, hx + R * 1.0, hy - R * 0.6);
      c.quadraticCurveTo(hx + R * 1.12, hy - R * 0.28, hx + R * 0.92, hy + R * 0.06); // right temple / sideburn
      // jagged fringe of bangs across the forehead, tips clear of the eyes
      c.lineTo(hx + R * 0.74, hy - R * 0.3);
      c.lineTo(hx + R * 0.58, hy - R * 0.06);
      c.lineTo(hx + R * 0.42, hy - R * 0.32);
      c.lineTo(hx + R * 0.26, hy - R * 0.06);
      c.lineTo(hx + R * 0.08, hy - R * 0.34);
      c.lineTo(hx - R * 0.1, hy - R * 0.06);
      c.lineTo(hx - R * 0.28, hy - R * 0.34);
      c.lineTo(hx - R * 0.46, hy - R * 0.06);
      c.lineTo(hx - R * 0.64, hy - R * 0.3);
      c.lineTo(hx - R * 0.82, hy - R * 0.06);
      c.closePath();
    });
    // green bandana covering the crown like a do-rag; its front hem rides high
    // over the middle so plenty of blond bangs show, then arcs down on either
    // side toward the temples. Ribbon ends trail behind (drawn above).
    outlined(ctx, p.h, ow, (c) => {
      c.moveTo(hx - R * 1.02, hy - R * 0.22);
      c.quadraticCurveTo(hx, hy - R * 1.18, hx + R * 1.02, hy - R * 0.22);        // front hem: very high center (lots of bangs), arcing down and just past each side
      c.quadraticCurveTo(hx + R * 1.16, hy - R * 0.72, hx + R * 0.48, hy - R * 1.16); // over the crown, right side
      c.quadraticCurveTo(hx, hy - R * 1.36, hx - R * 0.48, hy - R * 1.16);        // crown top
      c.quadraticCurveTo(hx - R * 1.16, hy - R * 0.72, hx - R * 1.02, hy - R * 0.22); // down the left side
      c.closePath();
    });
  } else if (spec.head === 'dome') {
    // antenna: a stalk off the dome with a light that blinks in run cadence
    const tipY = hy - R * 1.5;
    limb(ctx, hx + R * 0.05, hy - R * 0.8, hx + R * 0.14, tipY, 0.028 * u, p.p, Math.max(0.6, ow * 0.6));
    dot(ctx, hx + R * 0.14, tipY, R * 0.13, Math.sin((pose.time || 0) * 6) > 0 ? p.a : p.w);
    // faceplate: a dark screen, not a face — the LED eyes live on it
    outlined(ctx, p.s, Math.max(0.6, ow * 0.7), (c) => roundRectPath(c, hx - R * 0.62, hy - R * 0.28, R * 1.24, R * 0.95, R * 0.3));
    if (!lod) {
      dot(ctx, hx - R * 0.3, hy - R * 0.68, R * 0.1, p.w);
      dot(ctx, hx + R * 0.3, hy - R * 0.68, R * 0.1, p.w);
      // bolt "ears" pin the dome together at the temples
      outlined(ctx, p.p, Math.max(0.5, ow * 0.5), (c) => c.arc(hx - R * 0.98, hy + R * 0.12, R * 0.16, 0, Math.PI * 2));
      outlined(ctx, p.p, Math.max(0.5, ow * 0.5), (c) => c.arc(hx + R * 0.98, hy + R * 0.12, R * 0.16, 0, Math.PI * 2));
      // specular gloss: a crescent on the upper-left of the dome plus a glint
      // dot — silver only reads as polished metal once light lands on it
      ctx.save();
      ctx.strokeStyle = '#f8fbff';
      ctx.lineCap = 'round';
      ctx.lineWidth = R * 0.19;
      ctx.beginPath();
      ctx.arc(hx, hy, R * 0.68, -2.9, -2.25);
      ctx.stroke();
      ctx.restore();
      dot(ctx, hx + R * 0.5, hy - R * 0.42, R * 0.085, '#f8fbff');
    }
  } else if (spec.head === 'paperhat') {
    outlined(ctx, p.a, ow, (c) => {
      c.moveTo(hx - R * 0.62, hy - R * 0.72);
      c.lineTo(hx - R * 0.38, hy - R * 1.35);
      c.lineTo(hx + R * 0.62, hy - R * 1.2);
      c.lineTo(hx + R * 0.5, hy - R * 0.6);
      c.closePath();
    });
  } else if (spec.head === 'bald') {
    // Intentionally bare: Grumpos's asymmetric war-paint streak is drawn
    // below. A curved crown stripe reads too easily as a hat at tiny scale.
  }
  if (spec.head === 'jackal') {
    // Front-facing muzzle matches the paired eyes; the ears, cheek tuft and
    // tail carry the animal silhouette without mixing profile/front views.
    outlined(ctx, p.s, Math.max(0.6, ow * 0.7), (c) => c.ellipse(hx + R * 0.08, hy + R * 0.4, R * 0.7, R * 0.46, 0, 0, Math.PI * 2));
    dot(ctx, hx + R * 0.08, hy + R * 0.16, R * 0.17, p.e);
  }
  if (spec.beard) {
    outlined(ctx, p.m, ow, (c) => {
      c.moveTo(hx - R * 0.92, hy + R * 0.35);
      c.quadraticCurveTo(hx - R * 0.86, hy + R * 1.02, hx, hy + R * 1.3);
      c.quadraticCurveTo(hx + R * 0.86, hy + R * 1.02, hx + R * 0.92, hy + R * 0.35);
      c.quadraticCurveTo(hx, hy + R * 0.72, hx - R * 0.92, hy + R * 0.35);
      c.closePath();
    });
  }
  if (spec.plumber) {
    // Ear and sideburn break up the perfect head circle and add a little age.
    outlined(ctx, p.s, Math.max(0.6, ow * 0.7), (c) => c.ellipse(hx - R * 0.94, hy + R * 0.08, R * 0.22, R * 0.3, 0, 0, Math.PI * 2));
    outlined(ctx, p.m, Math.max(0.5, ow * 0.55), (c) => roundRectPath(c, hx - R * 0.93, hy - R * 0.2, R * 0.2, R * 0.45, R * 0.08));
  }
  if (id === 'grumpos') {
    // Thick face paint crosses the brow and eye before continuing down the
    // body, remaining legible even when the head is rendered very small.
    // Clipped to the skull so the stroke can't poke past the silhouette.
    ctx.save();
    ctx.beginPath();
    blockHead(ctx);
    ctx.clip();
    ctx.strokeStyle = p.a; ctx.lineWidth = Math.max(1.2, R * 0.22);
    ctx.beginPath();
    ctx.moveTo(hx - R * 0.72, hy - R * 0.88);
    ctx.lineTo(hx - R * 0.42, hy - R * 0.12);
    ctx.lineTo(hx - R * 0.18, hy + R * 0.72);
    ctx.stroke();
    ctx.restore();
  }
  // face
  const ex = expressionFor(id, pose);
  // Fernwick's eyes sit a touch lower, giving him a taller, more childlike brow.
  const eyeY = hy - (id === 'fernwick' ? -0.018 : 0.015) * u;
  drawEyes(ctx, p, u, hx + 0.01 * u, eyeY, lod, ex);
  if (spec.nose) outlined(ctx, p.n, Math.max(0.6, ow * 0.7), (c) => c.arc(hx + 0.02 * u, hy + 0.055 * u, 0.055 * u, 0, Math.PI * 2));
  if (spec.mustache && !lod) {
    // Two buoyant lobes give Lorenzo a readable expression instead of a flat
    // strip pasted beneath the nose.
    outlined(ctx, p.m, Math.max(0.6, ow * 0.6), (c) => {
      c.moveTo(hx + 0.015 * u, hy + 0.075 * u);
      c.quadraticCurveTo(hx - 0.035 * u, hy + 0.035 * u, hx - 0.13 * u, hy + 0.105 * u);
      c.quadraticCurveTo(hx - 0.05 * u, hy + 0.13 * u, hx + 0.015 * u, hy + 0.1 * u);
      c.quadraticCurveTo(hx + 0.08 * u, hy + 0.13 * u, hx + 0.145 * u, hy + 0.09 * u);
      c.quadraticCurveTo(hx + 0.06 * u, hy + 0.035 * u, hx + 0.015 * u, hy + 0.075 * u);
      c.closePath();
    });
  }
  if (id === 'grumpos' && !lod) {
    // A pale mouth gap cut into the dark beard keeps the face readable. It
    // opens during surprise and tightens into a stern Dad-of-War frown.
    const mouthY = hy + R * 0.58;
    if (ex.surprise) {
      outlined(ctx, p.s, Math.max(0.55, ow * 0.55), (c) => c.ellipse(hx, mouthY, R * 0.22, R * 0.27, 0, 0, Math.PI * 2));
      dot(ctx, hx, mouthY + R * 0.04, R * 0.11, p.e);
    } else {
      outlined(ctx, p.s, Math.max(0.55, ow * 0.55), (c) => roundRectPath(c, hx - R * 0.3, mouthY - R * 0.12, R * 0.6, R * 0.25, R * 0.1));
      ctx.strokeStyle = p.e; ctx.lineWidth = Math.max(0.75, ow * 0.65);
      ctx.beginPath();
      ctx.moveTo(hx - R * 0.2, mouthY + (ex.effort ? R * 0.04 : 0));
      ctx.quadraticCurveTo(hx, mouthY - R * 0.08, hx + R * 0.2, mouthY + (ex.effort ? R * 0.04 : 0));
      ctx.stroke();
    }
  }
  if (!spec.beard && !spec.mustache && !lod) drawMouth(ctx, spec, p, u, hx + 0.01 * u, hy + 0.11 * u, ow, ex);
}

// ---------------------------------------------------------------- rigs
function drawHumanoid(ctx, id, spec, p, pose, u, ow, lod) {
  if (pose.kind === 'duck' && pose.roll) return drawRoll(ctx, spec, p, pose, u, ow);
  const heavy = !!spec.heavy;
  const headR = (heavy ? 0.19 : 0.21) * u;
  const torsoHalf = (heavy ? 0.23 : spec.stout ? 0.2 : 0.17) * u;
  const legL = (heavy ? 0.24 : spec.stout ? 0.27 : 0.3) * u;
  const armL = 0.26 * u;
  const legW = (heavy ? 0.11 : 0.09) * u;
  const armW = (heavy ? 0.09 : 0.075) * u;
  const run = pose.kind === 'run';
  const jump = pose.kind === 'jump';
  const duck = pose.kind === 'duck';
  const ph = (pose.phase || 0) * Math.PI * 2;
  const s = Math.sin(ph);
  // The victory hop itself is applied to the whole rig in drawToon; here the
  // torso only lags a beat behind it, so the head trails the body.
  const cm = pose.kind === 'celebrate' ? celebrateMotion(id, pose.time || 0) : null;
  // Standing still — and the victory dance — are genuinely FRONT-ON poses,
  // not becalmed walk frames: legs hang from separate left/right hip points,
  // and the feet draw as symmetric front-facing ovals instead of profile
  // shoes. Rooted at a shared center hip, the IK flares the front thigh up
  // over the torso while the back one hides behind it — a lopsided can-can.
  const stand = !run && !jump && !duck;
  const bob = run ? -Math.abs(Math.cos(ph)) * 0.03 * u
    : cm ? Math.sin((pose.time || 0) * 6 + 1.2) * 0.016 * u
    : pose.kind === 'idle' ? Math.sin((pose.time || 0) * 2) * 0.012 * u : 0;

  let hipY = -legL * 0.92;                 // knees carry a slight standing bend
  let torsoTop = -(heavy ? 0.5 : 0.56) * u + bob;
  let headY = -(heavy ? 0.72 : 0.76) * u + bob;
  let shoulderY = -(heavy ? 0.46 : 0.5) * u + bob;
  if (duck) {
    hipY = -0.16 * u; torsoTop = -0.32 * u; headY = -0.42 * u; shoulderY = -0.27 * u;
  }
  const leanX = run ? 0.05 * u : 0;        // forward lean while running

  // feet: gait path while running, direct targets otherwise; knees via IK
  let legSeg = (duck ? 0.2 : 0.56) * legL + 0.02 * u;
  const stride = legL * 0.55, lift = legL * 0.5;
  let footF, footB, kneeF = 1, kneeB = 1;
  if (run) {
    footF = gaitFoot(pose.phase || 0, stride, lift);
    footB = gaitFoot((pose.phase || 0) + 0.5, stride, lift);
  } else if (jump) {
    if (pose.stomp) { footF = [0.06 * u, hipY + legL * 0.95]; footB = [-0.06 * u, hipY + legL * 0.95]; kneeB = -1; }
    else { footF = [0.15 * u, hipY + legL * 0.5]; footB = [-0.12 * u, hipY + legL * 0.85]; }
  } else if (duck) {
    footF = [0.19 * u, 0]; footB = [-0.19 * u, 0]; kneeB = -1;
  } else if (cm) {
    // Feet mirror under their own hips and share one tuck height — uneven
    // lifts read as a one-legged kick, not a hop.
    const air = Math.min(1, cm.lift / 0.1);
    footF = [(0.1 + 0.07 * air) * u, -air * 0.4 * legL];
    footB = [-(0.1 + 0.07 * air) * u, -air * 0.4 * legL];
    kneeB = -1;
    // Grounded beats keep the stand's near-straight hang; the segment eases
    // back to full length as the feet tuck so the knees get room to bend.
    legSeg = legSeg * air + (Math.abs(hipY) / 2 + 0.008 * u) * (1 - air);
  } else {
    // Stand: each foot directly under its own hip; the IK segment shortens
    // to just past half the hip-foot distance so the legs hang straight
    // with a whisper of outward knee rather than bowing sideways.
    footF = [0.105 * u, 0]; footB = [-0.105 * u, 0]; kneeB = -1;
    legSeg = Math.abs(hipY) / 2 + 0.008 * u;
  }

  // arms: bent at the elbow, counter-swinging the legs while running
  const armSeg = armL * 0.55;
  // Celebrating is front-on, so the arms root at the torso's shoulder
  // corners; at the run cycle's mid-chest attach, the front arm draws over
  // the torso and reads as growing out of the chest.
  const shSpread = pose.kind === 'celebrate' ? 0.92 : 0.55;
  const shF = torsoHalf * shSpread + leanX, shB = -torsoHalf * shSpread + leanX;
  // Slide a hand target out to full arm reach along its own direction, so the
  // IK draws the arm straight: arms-out poses with a mid-reach target crook
  // the elbow into a chicken wing.
  const reach = (sx, sy, [tx, ty]) => {
    const dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy) || 1;
    return [sx + (dx / d) * armSeg * 2, sy + (dy / d) * armSeg * 2];
  };
  let handF, handB, elbF = -1, elbB = -1;  // elbows trail behind by default
  if (pose.kind === 'celebrate') {
    // Victory choreography, one flavor per hero.
    const ct = pose.time || 0;
    const pump = Math.sin(ct * 6) * 0.05 * u;
    if (id === 'fernwick') {
      // champion's clasp: both hands meet overhead
      handF = [0.05 * u, shoulderY - armL * 0.95 + pump]; elbF = 1;
      handB = [-0.05 * u, shoulderY - armL * 0.95 + pump]; elbB = -1;
    } else if (id === 'gnash') {
      // one cool point at the sky, the other hand on the hip
      handF = [shF + 0.12 * u, shoulderY - armL * 0.98 + pump]; elbF = 1;
      handB = [shB - 0.13 * u, shoulderY + armL * 0.4]; elbB = -1;
    } else if (id === 'grumpos') {
      // Applause, dad-tempo — at belly height and wide: his chibi head and
      // beard swallow a chest-height clap, reading as hands behind the head.
      const sep = (0.09 + 0.15 * Math.abs(Math.sin(ct * 7))) * u;
      handF = [leanX + sep, shoulderY + armL * 0.35]; elbF = 1;
      handB = [leanX - sep, shoulderY + armL * 0.35]; elbB = -1;
    } else if (id === 'gary') {
      // a big overhead wave; the other hand stays professionally at his side
      handF = [shF + 0.08 * u + Math.sin(ct * 8) * 0.11 * u, shoulderY - armL * 0.95]; elbF = 1;
      handB = [shB - 0.04 * u, shoulderY + armL * 0.5]; elbB = -1;
    } else {
      // double fist pump, alternating (lorenzo mid-hop, b33p's free arm)
      handF = [shF + 0.15 * u, shoulderY - armL * 0.9 + pump]; elbF = 1;
      handB = [shB - 0.15 * u, shoulderY - armL * 0.9 - pump]; elbB = -1;
    }
    // On the big beat the signature gives way to the move: arms fly out for a
    // turn, sweep low for a bow, swing loose for a shimmy, punch up on a hop.
    if (cm.move === 'spin') {
      handF = [shF + 0.3 * u, shoulderY - armL * 0.25]; elbF = 1;
      handB = [shB - 0.3 * u, shoulderY - armL * 0.25]; elbB = -1;
    } else if (cm.move === 'bow') {
      handF = [shF + 0.18 * u, shoulderY + armL * 0.75]; elbF = 1;
      handB = [shB - 0.22 * u, shoulderY + armL * 0.55]; elbB = -1;
    } else if (cm.move === 'shimmy') {
      const sw = Math.sin(cm.q * Math.PI * 8) * 0.14 * u;
      handF = [shF + 0.14 * u + sw, shoulderY - armL * 0.55]; elbF = 1;
      handB = [shB - 0.14 * u + sw, shoulderY - armL * 0.55]; elbB = -1;
    } else if (cm.move === 'hop') {
      handF = [shF + 0.1 * u, shoulderY - armL * 1.05]; elbF = 1;
      handB = [shB - 0.1 * u, shoulderY - armL * 1.05]; elbB = -1;
    }
  } else if (pose.menuAction === 'wave') {
    handF = [shF + 0.15 * u, shoulderY - armL * 0.72]; elbF = 1;
    handB = [shB - 0.03 * u, shoulderY + armL * 0.8]; elbB = -1;
  } else if (pose.menuAction === 'flex') {
    handF = [shF + 0.2 * u, shoulderY - armL * 0.45]; elbF = 1;
    handB = [shB - 0.2 * u, shoulderY - armL * 0.45]; elbB = -1;
  } else if (pose.headless || pose.stomp) {
    handF = reach(shF, shoulderY, [shF + 0.16 * u, shoulderY - armL * 0.5]); elbF = 1;
    handB = reach(shB, shoulderY, [shB - 0.16 * u, shoulderY - armL * 0.5]); elbB = -1;
  } else if (run) {
    const sw = -s; // opposite phase to the legs
    handF = [shF + 0.05 * u + 0.15 * u * sw, shoulderY + armL * 0.5 - 0.04 * u * Math.abs(sw)];
    handB = [shB + 0.05 * u - 0.15 * u * sw, shoulderY + armL * 0.5 - 0.04 * u * Math.abs(sw)];
  } else if (jump) {
    handF = reach(shF, shoulderY, [shF + 0.18 * u, shoulderY - armL * 0.4]); elbF = 1;
    handB = reach(shB, shoulderY, [shB - 0.18 * u, shoulderY - armL * 0.4]); elbB = -1;
  } else if (duck) {
    handF = [shF + 0.2 * u, shoulderY + 0.12 * u]; elbF = 1;
    handB = [shB - 0.2 * u, shoulderY + 0.12 * u]; elbB = -1;
  } else {
    // arms hang at the sides, elbows ghosting outward — front-on, at ease
    handF = [shF + 0.07 * u, shoulderY + armL * 0.95]; elbF = 1;
    handB = [shB - 0.07 * u, shoulderY + armL * 0.95]; elbB = -1;
  }

  // Hand decorations (grumpos bracers, plumber gloves) draw with their own
  // arm, not as a final pass: the back hand must occlude behind the torso like
  // the rest of the back arm, or a run cycle reads as two hands clapping.
  const handDeco = (x, y) => {
    if (id === 'grumpos') {
      outlined(ctx, p.g, Math.max(0.5, ow * 0.55), (c) => c.arc(x, y, 0.058 * u, 0, Math.PI * 2));
      dot(ctx, x, y, 0.028 * u, p.s);
    } else if (spec.plumber) {
      outlined(ctx, p.w, Math.max(0.5, ow * 0.6), (c) => c.arc(x, y, 0.052 * u, 0, Math.PI * 2));
    }
  };

  // back accessories
  if (spec.tail) {
    const wag = Math.sin((pose.time || 0) * (run ? 8 : 2.6)) * 0.045 * u;
    const baseX = -torsoHalf * 0.65, baseY = hipY - 0.02 * u;
    const tipX = -0.4 * u, tipY = hipY - 0.28 * u + wag;
    outlined(ctx, p.h, ow, (c) => {
      c.moveTo(baseX, baseY - 0.065 * u);
      c.quadraticCurveTo(-0.39 * u, hipY + 0.02 * u + wag * 0.35, tipX, tipY);
      c.quadraticCurveTo(-0.32 * u, hipY - 0.15 * u + wag * 0.4, baseX, baseY + 0.065 * u);
      c.closePath();
    });
    // A small cream tip helps the tapered tail read separately from the body.
    outlined(ctx, p.s, Math.max(0.5, ow * 0.65), (c) => {
      c.moveTo(tipX, tipY);
      c.lineTo(tipX + 0.075 * u, tipY + 0.09 * u);
      c.lineTo(tipX + 0.095 * u, tipY + 0.025 * u);
      c.closePath();
    });
  }
  if (spec.back === 'axe' && !pose.axeThrown) {
    limb(ctx, 0.08 * u, shoulderY + 0.12 * u, -0.31 * u, headY - 0.27 * u, 0.06 * u, p.w, ow);
    outlined(ctx, '#b8d8f0', ow, (c) => {
      c.moveTo(-0.32 * u, headY - 0.39 * u);
      c.quadraticCurveTo(-0.52 * u, headY - 0.25 * u, -0.39 * u, headY - 0.06 * u);
      c.lineTo(-0.25 * u, headY - 0.13 * u);
      c.lineTo(-0.22 * u, headY - 0.34 * u);
      c.closePath();
    });
    if (!lod) {
      ctx.strokeStyle = '#eaf8ff'; ctx.lineWidth = Math.max(0.6, ow * 0.55);
      ctx.beginPath(); ctx.moveTo(-0.42 * u, headY - 0.25 * u); ctx.lineTo(-0.28 * u, headY - 0.19 * u); ctx.stroke();
    }
  }

  // Sandal straps over grumpos's bare feet — leather across the instep plus
  // an ankle wrap, so the pale foot reads as sandal rather than sock.
  const footDeco = (x, y) => {
    if (id !== 'grumpos') return;
    ctx.strokeStyle = p.w;
    ctx.lineWidth = Math.max(0.6, 0.022 * u);
    ctx.beginPath();
    ctx.moveTo(x - 0.05 * u, y + 0.005 * u); ctx.lineTo(x + 0.045 * u, y - 0.02 * u);
    ctx.moveTo(x - 0.045 * u, y - 0.03 * u); ctx.lineTo(x - 0.02 * u, y + 0.03 * u);
    ctx.stroke();
  };

  // Standing, legs root at their own hips and feet face the camera; in
  // motion they share the center hip and the feet read as profile shoes.
  const hipAt = (side) => (stand ? side * 0.095 * u : leanX * 0.3);
  // In profile the shoe shifts toe-ward so the ankle sits back near the heel.
  const footDx = stand ? 0 : 0.025 * u;
  // Shoe proportions: clearly longer than tall so it reads as a shoe, not a
  // circle. Radii derive from legW — the shoe must swallow the leg's round
  // end cap (legW / 2 past the ankle point) on the wider-legged rigs too.
  const capR = legW * 0.5;
  const footRx = Math.max(stand ? 0.075 * u : 0.095 * u, capR * 1.5);
  const footRy = capR + 0.008 * u;

  // The leg aims 0.02u ABOVE the foot point so its round end cap — including
  // the fat outline pass, which reaches legW/2 + ow past the endpoint — is
  // buried inside the shoe instead of poking out under the sole.
  const ankleLift = 0.02 * u;
  const drawFrontLeg = () => {
    limb2(ctx, hipAt(1), hipY, footF[0], footF[1] - ankleLift, legSeg, kneeF, legW, p.p, ow);
    outlined(ctx, p.f, Math.max(0.6, ow * 0.8), (c) => c.ellipse(footF[0] + footDx, footF[1] - 0.01 * u, footRx, footRy, 0, 0, Math.PI * 2));
    footDeco(footF[0] + footDx, footF[1] - 0.01 * u);
  };
  const drawFrontArm = () => {
    if (spec.cannon) {
      // the cannon aims dead ahead — no elbow on ordnance. Celebrating, it
      // points at the sky and pops a little victory flash instead.
      const cheer = pose.kind === 'celebrate';
      const recoil = pose.menuAction === 'aim' ? Math.abs(Math.sin((pose.time || 0) * 12)) * 0.05 * u : 0;
      const muzzleX = cheer ? shF + armL * 0.22 : shF + armL * 0.72 - recoil;
      const muzzleY = cheer ? shoulderY - armL * 0.85 : shoulderY + armL * 0.28;
      limb(ctx, shF, shoulderY, muzzleX, muzzleY, 0.12 * u, p.a, ow);
      outlined(ctx, OUTLINE, Math.max(0.6, ow * 0.5), (c) => c.arc(muzzleX, muzzleY, 0.045 * u, 0, Math.PI * 2));
      if ((pose.menuAction === 'aim' || cheer) && Math.sin((pose.time || 0) * 12) > 0.72) {
        dot(ctx, muzzleX + (cheer ? 0 : 0.08 * u), muzzleY - (cheer ? 0.09 * u : 0), 0.045 * u, p.w);
      }
    } else {
      limb2(ctx, shF, shoulderY, handF[0], handF[1], armSeg, elbF, armW, heavy ? p.s : p.b, ow);
      handDeco(handF[0], handF[1]);
    }
  };

  // back limbs — and, front-on, the front-side pair too: a front limb painted
  // over the torso roots visibly on the chest while its mirror hides behind
  // the body, so a symmetric pose reads lopsided. Exception: grumpos's
  // celebrate clap, whose arms BOTH draw in the front pass — an arm back here
  // reads as clapping from behind his back.
  const clapFront = id === 'grumpos' && pose.kind === 'celebrate';
  if (!clapFront) {
    limb2(ctx, shB, shoulderY, handB[0], handB[1], armSeg, elbB, armW, heavy ? p.s : p.b, ow);
    handDeco(handB[0], handB[1]);
    // The cannon is mounted ordnance, not a mirrored arm — behind the torso
    // its barrel vanishes into the helmet, so it always draws in front.
    if (stand && !spec.cannon) drawFrontArm();
  }
  limb2(ctx, hipAt(-1), hipY, footB[0], footB[1] - ankleLift, legSeg, kneeB, legW, p.p, ow);
  outlined(ctx, p.f, Math.max(0.6, ow * 0.8), (c) => c.ellipse(footB[0] + footDx, footB[1] - 0.01 * u, footRx, footRy, 0, 0, Math.PI * 2));
  footDeco(footB[0] + footDx, footB[1] - 0.01 * u);
  if (stand) drawFrontLeg();

  // Backpack/shield on the back: drawn after the rear arm so the rear elbow
  // tucks BEHIND it, but before the torso so the body still sits in front.
  if (spec.back === 'shield') {
    outlined(ctx, p.w, ow, (c) => c.arc(-torsoHalf - 0.08 * u, shoulderY + 0.06 * u, 0.11 * u, 0, Math.PI * 2));
    dot(ctx, -torsoHalf - 0.08 * u, shoulderY + 0.06 * u, 0.035 * u, OUTLINE);
  }

  // torso
  outlined(ctx, p.b, ow, (c) => roundRectPath(c, -torsoHalf + leanX * 0.5, torsoTop, torsoHalf * 2, (hipY + 0.05 * u) - torsoTop, torsoHalf * 0.7));
  if (id === 'grumpos' && !duck) {
    // Leather cross-straps and belt. No pauldron: a red shoulder ring merged
    // with the strap into a giant "9" at tiny scale, and the beard crowds any
    // shoulder ornament anyway — axe, beard, paint and bracers carry the look.
    ctx.strokeStyle = p.w; ctx.lineWidth = 0.065 * u;
    ctx.beginPath(); ctx.moveTo(-torsoHalf * 0.55, torsoTop + 0.01 * u); ctx.lineTo(torsoHalf * 0.2, hipY); ctx.stroke();
    ctx.strokeStyle = p.w; ctx.lineWidth = 0.035 * u;
    ctx.beginPath(); ctx.moveTo(torsoHalf * 0.55, torsoTop); ctx.lineTo(-torsoHalf * 0.15, hipY); ctx.stroke();
    // Belt and buckle are drawn later, after the legs and loincloth: painted
    // here they sit under the front leg, whose thigh crosses the belt line.
  }
  if (id === 'b33p' && !duck) {
    // Chest screen with alternating status lights, plus a hull seam at the
    // waist — the torso reads as plated machine, not a onesie.
    const px = leanX * 0.5;
    outlined(ctx, p.s, Math.max(0.5, ow * 0.55), (c) =>
      roundRectPath(c, px - torsoHalf * 0.52, torsoTop + 0.045 * u, torsoHalf * 1.04, 0.1 * u, 0.02 * u));
    const beat = Math.sin((pose.time || 0) * 5) > 0;
    dot(ctx, px - torsoHalf * 0.24, torsoTop + 0.095 * u, 0.018 * u, beat ? p.a : p.w);
    dot(ctx, px + torsoHalf * 0.24, torsoTop + 0.095 * u, 0.018 * u, beat ? p.w : p.a);
    ctx.strokeStyle = p.p;
    ctx.lineWidth = Math.max(0.6, ow * 0.5);
    ctx.beginPath();
    ctx.moveTo(px - torsoHalf * 0.85, hipY - 0.055 * u);
    ctx.lineTo(px + torsoHalf * 0.85, hipY - 0.055 * u);
    ctx.stroke();
    // hull sheen: a soft light streak down the plating beside the chest panel
    ctx.save();
    ctx.globalAlpha *= 0.75;
    ctx.strokeStyle = '#eef3f9';
    ctx.lineCap = 'round';
    ctx.lineWidth = 0.045 * u;
    ctx.beginPath();
    ctx.moveTo(px - torsoHalf * 0.68, torsoTop + 0.06 * u);
    ctx.lineTo(px - torsoHalf * 0.5, hipY - 0.075 * u);
    ctx.stroke();
    ctx.restore();
  }
  if (spec.straps && !lod && !duck) {
    // Straps and belt track the torso's run-lean shift (leanX * 0.5), else
    // they drift off-center whenever the body leans forward.
    const px = leanX * 0.5;
    ctx.strokeStyle = p.p;
    ctx.lineWidth = 0.045 * u;
    ctx.beginPath();
    ctx.moveTo(px - torsoHalf * 0.5, torsoTop + 0.01 * u); ctx.lineTo(px - torsoHalf * 0.4, torsoTop + 0.12 * u);
    ctx.moveTo(px + torsoHalf * 0.5, torsoTop + 0.01 * u); ctx.lineTo(px + torsoHalf * 0.4, torsoTop + 0.12 * u);
    ctx.stroke();
    // Tool belt and brass buckle anchor the overalls at tiny scale. The belt
    // sits a little above the hip line and stops just shy of the torso edge,
    // so it reads as wrapping the body without poking past the silhouette.
    // It follows the run bob like the torso does (same as grumpos's belt) —
    // pinned to static hipY it would detach from the bobbing body.
    const beltY = hipY - 0.115 * u + bob;
    ctx.strokeStyle = p.m; ctx.lineWidth = 0.055 * u;
    ctx.beginPath(); ctx.moveTo(px - torsoHalf * 0.88, beltY); ctx.lineTo(px + torsoHalf * 0.88, beltY); ctx.stroke();
    outlined(ctx, p.a, Math.max(0.5, ow * 0.5), (c) => roundRectPath(c, px - 0.035 * u, beltY - 0.033 * u, 0.07 * u, 0.06 * u, 0.012 * u));
  }
  if (spec.nameTag && !lod && !duck) {
    outlined(ctx, p.w, Math.max(0.6, ow * 0.5), (c) => roundRectPath(c, torsoHalf * 0.15, torsoTop + 0.05 * u, 0.09 * u, 0.06 * u, 0.01 * u));
  }

  // front limbs — in profile (run/jump/duck) the near leg and arm cross the
  // body, so they paint over the torso; front-on they already drew behind it
  if (!stand) drawFrontLeg();
  if (id === 'grumpos') {
    // Battle skirt (pteruges): belt-width at the waist, flaring OUT to a
    // wider hem, split into hanging panels by strip lines. Still short —
    // upper thigh — so the bare legs keep carrying the gait. No stride sway:
    // cloth wagging at leg frequency reads as jitter at this scale, so it
    // only drifts back while airborne.
    // Belt rides at the waist, where the torso is still full-width — at hip
    // height the roundRect corners taper and the band floats off the body.
    // Both follow the run bob (the hem at half strength, so the cloth lags a
    // beat like fabric); pinned to static hipY they detach from the body.
    // px: the torso is drawn shifted forward by the run lean — belt and
    // skirt center on that same offset, or the belly peeks out in front and
    // the band overhangs his back.
    const px = leanX * 0.5;
    const sway = jump ? 0.02 * u : 0;
    // Belt sits high on the waist: a low band leaves a long round belly above
    // it and reads chubby rather than barrel-chested.
    const beltY = hipY - 0.075 * u + bob;
    const top = beltY + 0.025 * u;
    // crouching, the hem shortens so the tucked legs and feet stay visible
    const tipY = hipY + legL * (duck ? 0.35 : 0.6) + bob * 0.5;
    const wTop = torsoHalf * 0.92;
    const wHem = torsoHalf * 1.22;
    outlined(ctx, p.w, Math.max(0.6, ow * 0.7), (c) => {
      c.moveTo(px - wTop, top);
      c.lineTo(px + wTop, top);
      c.lineTo(px + wHem + sway, tipY);
      c.lineTo(px - wHem + sway, tipY);
      c.closePath();
    });
    // panel strips sell the armored-skirt read
    ctx.strokeStyle = p.m;
    ctx.lineWidth = Math.max(0.5, ow * 0.4);
    ctx.beginPath();
    for (const f of [-0.45, 0, 0.45]) {
      ctx.moveTo(px + f * wTop, top + 0.012 * u);
      ctx.lineTo(px + f * wHem + sway, tipY - 0.008 * u);
    }
    ctx.stroke();
    // Belt over everything at the waist, so the thigh roots vanish beneath
    // it. Flush with the torso edges: narrower leaves belly/back slivers,
    // wider overhangs the silhouette — its outline covers the seam.
    outlined(ctx, p.g, Math.max(0.5, ow * 0.55), (c) => roundRectPath(c, px - torsoHalf, beltY - 0.03 * u, torsoHalf * 2, 0.065 * u, 0.02 * u));
    dot(ctx, px, beltY + 0.002 * u, 0.034 * u, p.w);
  }
  if (spec.tunic && !duck) {
    // Green tunic: the torso's flat hem flares into a short skirt over the
    // thighs, cinched by a belt. Drawn after the legs so it drapes over the
    // thigh roots (like grumpos's skirt); the belt hides the top seam. Kept
    // upper-thigh short so the gait still reads.
    const px = leanX * 0.5;
    const sway = jump ? 0.02 * u : 0;
    const beltY = hipY - 0.05 * u + bob;
    const top = beltY + 0.02 * u;
    const hemY = hipY + legL * 0.5 + bob * 0.5;
    const wTop = torsoHalf * 0.96;
    const wHem = torsoHalf * 1.3;
    outlined(ctx, p.b, ow, (c) => {
      c.moveTo(px - wTop, top);
      c.lineTo(px + wTop, top);
      c.lineTo(px + wHem + sway, hemY);
      c.quadraticCurveTo(px + sway, hemY + 0.045 * u, px - wHem + sway, hemY);
      c.closePath();
    });
    if (!lod) {
      // a soft center seam sells the drape of cloth
      ctx.save();
      ctx.globalAlpha *= 0.45;
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = Math.max(0.5, ow * 0.4);
      ctx.beginPath();
      ctx.moveTo(px + sway * 0.5, top + 0.03 * u);
      ctx.lineTo(px + sway, hemY - 0.01 * u);
      ctx.stroke();
      ctx.restore();
    }
    // belt over the waist, covering the skirt's top seam; gold buckle
    outlined(ctx, p.p, Math.max(0.5, ow * 0.6), (c) => roundRectPath(c, px - torsoHalf, beltY - 0.028 * u, torsoHalf * 2, 0.058 * u, 0.02 * u));
    outlined(ctx, p.a, Math.max(0.5, ow * 0.5), (c) => c.arc(px, beltY + 0.002 * u, 0.028 * u, 0, Math.PI * 2));
  }
  if (clapFront) {
    limb2(ctx, shB, shoulderY, handB[0], handB[1], armSeg, elbB, armW, p.s, ow);
    handDeco(handB[0], handB[1]);
    drawFrontArm();
  } else if (!stand || spec.cannon) {
    drawFrontArm();
  }

  // head (or the stump of one)
  if (pose.headless) {
    outlined(ctx, p.s, Math.max(0.6, ow * 0.8), (c) => c.ellipse(leanX * 0.5, torsoTop, 0.07 * u, 0.045 * u, 0, 0, Math.PI * 2));
  } else {
    drawHead(ctx, id, spec, p, u, ow, 0.01 * u + leanX, headY, lod, pose);
  }
}

function drawRoll(ctx, spec, p, pose, u, ow) {
  const r = 0.26 * u;
  const band = p.p === p.b ? p.h : p.p; // contrast stripe in the hero's palette
  ctx.save();
  ctx.translate(0, -r - 0.01 * u);
  ctx.rotate((pose.time || 0) * 14);
  outlined(ctx, p.b, ow, (c) => c.arc(0, 0, r, 0, Math.PI * 2));
  ctx.strokeStyle = band;
  ctx.lineWidth = 0.07 * u;
  ctx.beginPath();
  ctx.moveTo(-r * 0.8, 0); ctx.lineTo(r * 0.8, 0);
  ctx.moveTo(0, -r * 0.8); ctx.lineTo(0, r * 0.8);
  ctx.stroke();
  ctx.restore();
  // speed arcs trailing behind
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1, ow * 0.6);
  ctx.globalAlpha *= 0.45;
  ctx.beginPath(); ctx.arc(-r * 1.5, -r, r * 0.45, -0.6, 0.6); ctx.stroke();
  ctx.beginPath(); ctx.arc(-r * 1.9, -r, r * 0.3, -0.6, 0.6); ctx.stroke();
  ctx.globalAlpha /= 0.45;
}

function drawBlob(ctx, id, p, pose, u, ow, lod) {
  const t = pose.time || 0;
  const ph = (pose.phase || 0) * Math.PI * 2;
  const duck = pose.kind === 'duck';
  let rx = 0.36 * u, ry = 0.34 * u, cy = -0.4 * u;
  if (duck && pose.roll) {
    ctx.save();
    ctx.translate(0, -0.27 * u);
    ctx.rotate((t || 0) * 12);
    outlined(ctx, p.b, ow, (c) => c.arc(0, 0, 0.29 * u, 0, Math.PI * 2));
    outlined(ctx, p.a, Math.max(0.6, ow * 0.8), (c) => c.arc(-0.29 * u, 0, 0.06 * u, 0, Math.PI * 2));
    outlined(ctx, p.a, Math.max(0.6, ow * 0.8), (c) => c.arc(0.29 * u, 0, 0.06 * u, 0, Math.PI * 2));
    drawEyes(ctx, p, u, 0, -0.05 * u, lod, expressionFor(id, { ...pose, effort: true }));
    outlined(ctx, p.m, Math.max(0.6, ow * 0.5), (c) => c.ellipse(0, 0.09 * u, 0.05 * u, 0.035 * u, 0, 0, Math.PI * 2));
    ctx.restore();
    return;
  }
  if (duck) { rx = 0.4 * u; ry = 0.22 * u; cy = -0.25 * u; }
  if (pose.kind === 'run') { const b = Math.sin(2 * ph) * 0.03 * u; ry += b; rx -= b * 0.7; }
  // celebrate: a joyful squash-and-stretch jiggle, arms up like the float pose
  if (pose.kind === 'celebrate') { const b = Math.sin(t * 7); ry *= 1 + 0.1 * b; rx *= 1 - 0.08 * b; cy -= 0.03 * u * Math.max(0, b); }
  ctx.save();
  if (pose.float) {
    ctx.rotate(0.08 * Math.sin(t * 5));
    cy -= 0.03 * u * (1 + Math.sin(t * 9)) * 0.5;
  }
  // feet stubs peeking below
  const step = pose.kind === 'run' ? Math.sin(ph) * 0.06 * u : 0;
  outlined(ctx, p.f, Math.max(0.6, ow * 0.8), (c) => c.ellipse(-0.13 * u + step, -0.035 * u, 0.07 * u, 0.045 * u, 0, 0, Math.PI * 2));
  outlined(ctx, p.f, Math.max(0.6, ow * 0.8), (c) => c.ellipse(0.13 * u - step, -0.035 * u, 0.07 * u, 0.045 * u, 0, 0, Math.PI * 2));
  // body
  outlined(ctx, p.b, ow, (c) => c.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2));
  // arm nubs (rotate up while floating)
  const nubY = pose.float || pose.kind === 'celebrate' ? cy - ry * 0.55 : cy + ry * 0.15;
  outlined(ctx, p.a, Math.max(0.6, ow * 0.8), (c) => c.arc(-rx - 0.01 * u, nubY, 0.07 * u, 0, Math.PI * 2));
  outlined(ctx, p.a, Math.max(0.6, ow * 0.8), (c) => c.arc(rx + 0.01 * u, nubY, 0.07 * u, 0, Math.PI * 2));
  // face lives on the body
  const ex = expressionFor(id, pose);
  drawEyes(ctx, p, u, 0.01 * u, cy - ry * 0.15, lod, ex);
  if (ex.joy) {
    // Mochi grins with her whole face; the grin widens on every peak.
    const w = (ex.cheer ? 0.085 : 0.06) * u, d = (ex.cheer ? 0.08 : 0.04) * u;
    outlined(ctx, p.m, Math.max(0.6, ow * 0.5), (c) => {
      c.moveTo(0.01 * u - w, cy + ry * 0.28);
      c.quadraticCurveTo(0.01 * u, cy + ry * 0.28 + d * 1.9, 0.01 * u + w, cy + ry * 0.28);
      c.closePath();
    });
  } else if (ex.surprise || pose.float) {
    outlined(ctx, p.m, Math.max(0.6, ow * 0.5), (c) => c.ellipse(0.01 * u, cy + ry * 0.3, 0.045 * u, 0.055 * u, 0, 0, Math.PI * 2));
  } else if (ex.blink) {
    ctx.strokeStyle = p.m; ctx.lineWidth = Math.max(0.8, ow * 0.65);
    ctx.beginPath(); ctx.arc(0.01 * u, cy + ry * 0.25, 0.05 * u, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  } else {
    outlined(ctx, p.m, Math.max(0.6, ow * 0.5), (c) => c.ellipse(0.01 * u, cy + ry * 0.3, 0.05 * u, 0.035 * u, 0, 0, Math.PI * 2));
  }
  ctx.restore();
}

// Poyo's rig: the same round squishy silhouette as the blob, re-skinned as a
// coral electric-mascot — rounded purple-tipped ears, a small purple cowlick, a
// star-tipped tail that trails behind, and pink cheeks that bob + squash on the
// run. Palette pulls body/belly/ear/cheek/star from HERO_SPRITES.mochi.pal.
function pikaEyes(ctx, p, u, cx, cy, lod, ex) {
  const sep = 0.11 * u;
  if (lod) { dot(ctx, cx - sep, cy, 0.045 * u, p.e); dot(ctx, cx + sep, cy, 0.045 * u, p.e); return; }
  if (ex.blink) {
    ctx.strokeStyle = p.e; ctx.lineWidth = Math.max(0.9, 0.025 * u); ctx.lineCap = 'round';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * sep - 0.04 * u, cy);
      ctx.quadraticCurveTo(cx + sx * sep, cy + 0.02 * u, cx + sx * sep + 0.04 * u, cy);
      ctx.stroke();
    }
    return;
  }
  if (ex.joy && !ex.cheer) { // ^ ^ delight
    ctx.strokeStyle = p.e; ctx.lineWidth = Math.max(1, 0.03 * u); ctx.lineCap = 'round';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * sep - 0.045 * u, cy + 0.02 * u);
      ctx.quadraticCurveTo(cx + sx * sep, cy - 0.06 * u, cx + sx * sep + 0.045 * u, cy + 0.02 * u);
      ctx.stroke();
    }
    return;
  }
  const rY = ex.surprise || ex.cheer ? 0.085 : 0.07;
  for (const sx of [-1, 1]) {
    outlined(ctx, p.e, Math.max(0.5, 0.012 * u), (c) => c.ellipse(cx + sx * sep, cy, 0.05 * u, rY * u, 0, 0, Math.PI * 2));
    dot(ctx, cx + sx * sep - 0.016 * u, cy - 0.022 * u, 0.02 * u, p.w);
  }
}

function drawPika(ctx, id, p, pose, u, ow, lod) {
  const t = pose.time || 0;
  const ph = (pose.phase || 0) * Math.PI * 2;
  const kind = pose.kind;
  const duck = kind === 'duck';
  const celebrate = kind === 'celebrate';
  const acc = p.ear || p.a;          // purple accent (ears + cowlick)
  const star = p.star || acc;        // tail star
  const belly = p.belly || p.a;
  const cheek = p.cheek || p.m;

  let rx = 0.34 * u, ry = 0.35 * u, cy = -0.4 * u;
  if (duck) { rx = 0.4 * u; ry = 0.22 * u; cy = -0.25 * u; }
  else if (kind === 'run') { const b = Math.sin(2 * ph) * 0.03 * u; ry += b; rx -= b * 0.7; }
  else if (kind === 'idle') { cy -= 0.012 * u * (1 + Math.sin(t * 3)) * 0.5; }
  if (celebrate) { const b = Math.sin(t * 7); ry *= 1 + 0.1 * b; rx *= 1 - 0.08 * b; cy -= 0.03 * u * Math.max(0, b); }

  ctx.save();
  // Ears make the silhouette taller than the rest of the cast; scale the whole
  // rig down a touch (about the feet baseline at y=0) so Poyo's total height
  // sits in line with the other heroes.
  ctx.scale(0.9, 0.9);
  if (pose.float) {
    ctx.rotate(0.06 * Math.sin(t * 5));
    cy -= 0.03 * u * (1 + Math.sin(t * 9)) * 0.5;
  }
  const armsUp = pose.float || celebrate;

  // tail: star-tipped stalk, drawn on the LEFT in rig space so it trails behind
  // (the drawToon wrapper mirrors the whole rig with facing, keeping it correct).
  if (!duck) {
    const wag = Math.sin(t * 4 + (kind === 'run' ? ph : 0)) * 0.05;
    ctx.save();
    ctx.translate(-rx * 0.7, cy + ry * 0.35);
    ctx.scale(-1, 1);
    const s = u;
    ctx.strokeStyle = OUTLINE; ctx.lineCap = 'round';
    ctx.lineWidth = 0.1 * s + ow * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0.02 * s);
    ctx.quadraticCurveTo(0.16 * s, -0.02 * s, 0.2 * s, -0.2 * s + wag * s);
    ctx.stroke();
    ctx.strokeStyle = p.b; ctx.lineWidth = 0.1 * s; ctx.stroke();
    const tx = 0.2 * s, ty = -0.24 * s + wag * s, R = 0.1 * s, r2 = 0.04 * s;
    outlined(ctx, star, ow * 0.9, (c) => {
      for (let i = 0; i < 10; i++) {
        const ang = -Math.PI / 2 + (i * Math.PI) / 5;
        const rad = i % 2 ? r2 : R;
        const px = tx + Math.cos(ang) * rad, py = ty + Math.sin(ang) * rad;
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.closePath();
    });
    ctx.restore();
  }

  // ears: rounded purple-tipped, splayed outward. They stay UP while ducking
  // (just a little shorter), poking above the flattened head — drawn before the
  // body, so the wide duck body would otherwise swallow anything drooped down.
  {
    const baseY = cy - ry * 0.78;
    const earLen = (duck ? 0.22 : 0.3) * u;
    for (const side of [-1, 1]) {
      const baseX = side * rx * 0.5;
      const lean = side * 0.12 * u;
      const wob = celebrate ? 0.03 * u * Math.max(0, Math.sin(t * 7)) : 0;
      const tipX = baseX + lean + side * 0.06 * u;
      const tipY = baseY - earLen - wob;
      const halfBase = 0.11 * u, halfTip = 0.075 * u;
      const earPath = (c) => {
        c.moveTo(baseX - side * halfBase, baseY + 0.02 * u);
        c.quadraticCurveTo(baseX + lean * 0.3 - side * halfTip, (baseY + tipY) / 2, tipX - side * halfTip, tipY + 0.03 * u);
        c.quadraticCurveTo(tipX + side * 0.005 * u, tipY - 0.07 * u, tipX + side * halfTip, tipY + 0.03 * u);
        c.quadraticCurveTo(baseX + lean * 0.5 + side * halfTip, (baseY + tipY) / 2, baseX + side * halfBase, baseY + 0.02 * u);
        c.closePath();
      };
      outlined(ctx, p.b, ow, earPath);
      // purple cap over the top ~third around the tip
      ctx.save();
      ctx.beginPath(); earPath(ctx); ctx.clip();
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.rect(tipX - 0.2 * u, tipY - 0.1 * u, 0.4 * u, 0.26 * u); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = ow;
      ctx.beginPath(); earPath(ctx); ctx.stroke();
    }
    // small purple cowlick curl between the ears — kept upright in every pose
    const tuftY = cy - ry * 0.86;
    const sway = Math.sin(t * 3 + 1) * 0.02 * u + (kind === 'run' ? Math.sin(ph) * 0.012 * u : 0);
    outlined(ctx, acc, ow * 0.9, (c) => {
      c.moveTo(-0.055 * u, tuftY + 0.04 * u);
      c.quadraticCurveTo(-0.075 * u, tuftY - 0.1 * u, 0.01 * u + sway, tuftY - 0.15 * u);
      c.quadraticCurveTo(0.065 * u + sway, tuftY - 0.17 * u, 0.055 * u + sway * 0.6, tuftY - 0.1 * u);
      c.quadraticCurveTo(0.03 * u, tuftY - 0.1 * u, 0.04 * u, tuftY - 0.04 * u);
      c.quadraticCurveTo(0.05 * u, tuftY + 0.01 * u, 0.055 * u, tuftY + 0.04 * u);
      c.closePath();
    });
  }

  // feet stubs
  const step = kind === 'run' ? Math.sin(ph) * 0.06 * u : 0;
  outlined(ctx, p.b, ow, (c) => c.ellipse(-0.14 * u + step, -0.03 * u, 0.08 * u, 0.05 * u, 0, 0, Math.PI * 2));
  outlined(ctx, p.b, ow, (c) => c.ellipse(0.14 * u - step, -0.03 * u, 0.08 * u, 0.05 * u, 0, 0, Math.PI * 2));

  // body + lighter belly
  outlined(ctx, p.b, ow, (c) => c.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2));
  ctx.save();
  ctx.beginPath(); ctx.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = belly;
  ctx.beginPath(); ctx.ellipse(0, cy + ry * 0.42, rx * 0.72, ry * 0.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // arm nubs (rotate up while floating / celebrating)
  const nubY = armsUp ? cy - ry * 0.5 : cy + ry * 0.2;
  outlined(ctx, p.b, Math.max(0.6, ow * 0.9), (c) => c.arc(-rx - 0.005 * u, nubY, 0.08 * u, 0, Math.PI * 2));
  outlined(ctx, p.b, Math.max(0.6, ow * 0.9), (c) => c.arc(rx + 0.005 * u, nubY, 0.08 * u, 0, Math.PI * 2));

  // face — rides a small bounce on the run; cheeks lag + squash for a jiggle.
  // Kept subtle: the body already squashes at the same frequency, so a large
  // face offset on top reads as the features sliding around the head.
  const ex = expressionFor(id, pose);
  const faceBob = kind === 'run' ? Math.sin(2 * ph) * 0.012 * u : 0;
  const faceY = cy - ry * 0.08 + faceBob;
  pikaEyes(ctx, p, u, 0, faceY, lod, ex);
  const jig = kind === 'run' ? Math.sin(2 * ph - 0.7) : 0;
  const cheekY = faceY + 0.11 * u + jig * 0.018 * u;
  const cheekRx = 0.05 * u * (1 + jig * 0.1);
  const cheekRy = 0.05 * u * (1 - jig * 0.1);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 0.24 * u, cheekY, cheekRx, cheekRy, 0, 0, Math.PI * 2);
    ctx.fillStyle = cheek; ctx.fill();
  }
  if (!lod) dot(ctx, 0, faceY + 0.08 * u, 0.012 * u, p.e);
  if (ex.joy || ex.surprise) {
    outlined(ctx, p.m, Math.max(0.6, 0.014 * u), (c) => c.ellipse(0, faceY + 0.15 * u, 0.05 * u, ex.cheer ? 0.06 * u : 0.04 * u, 0, 0, Math.PI * 2));
  } else {
    ctx.strokeStyle = p.m; ctx.lineWidth = Math.max(0.8, 0.02 * u); ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-0.05 * u, faceY + 0.12 * u);
    ctx.quadraticCurveTo(-0.025 * u, faceY + 0.16 * u, 0, faceY + 0.13 * u);
    ctx.quadraticCurveTo(0.025 * u, faceY + 0.16 * u, 0.05 * u, faceY + 0.12 * u);
    ctx.stroke();
  }

  ctx.restore();
}

// ------------------------------------------------- Miss Chomp (v8a spec)
// Flat-illustration vector look authored as SVG path data in a 240x340 space
// (body centre (120,148), R=96), replayed through canvas. Long red flow hair
// with a translucent sheet draped over her back, two lashed eyes (no brows),
// pink bow. Legs/feet are excluded from the spec and keep the rig's gait.
const CHOMPO_PATHS = {
  hairA: 'M158,54 C126,14 58,14 30,50 C0,82 -6,156 8,232 C18,264 40,282 62,274 C46,230 44,150 60,98 C38,114 28,74 50,50 C80,16 130,18 158,54 Z',
  hairB: 'M152,58 C124,22 58,22 34,54 C6,84 0,152 16,226 C26,258 44,276 62,268 C50,226 48,150 62,100 C42,114 34,76 54,54 C82,22 126,24 152,58 Z',
  hairC: 'M120,40 C78,44 42,68 28,150',
  hairOver: 'M108,98 C50,118 16,178 24,250 C42,224 66,216 92,222 C74,182 74,140 94,110 C84,128 92,110 108,98 Z',
  hairOverHi: 'M98,116 C56,140 38,190 40,244',
  hairFront: 'M136,54 C108,46 78,58 64,92 C56,140 62,210 80,258 C74,206 78,138 96,94 C112,68 126,60 136,54 Z',
  hairFrontHi: 'M120,66 C96,74 82,104 78,170',
  bowL: 'M130,42 C104,20 96,42 100,52 C108,64 126,52 130,46 Z',
  bowR: 'M130,42 C156,20 164,42 160,52 C152,64 134,52 130,46 Z',
  bowShade: 'M130,42 C104,26 100,40 102,50 C112,42 122,44 130,46 Z',
};
// Eye groups, each uniformly scaled about its own centre (far = left, near =
// right). Lid is body-coloured for the half-lidded look; brows intentionally
// omitted per spec.
const CHOMPO_EYES = [
  { cx: 112, cy: 110, k: 0.95, rx: 19, ry: 23, pupil: [120, 115, 10], glint: [116, 111, 3.4],
    lid: 'M93,110 Q112,88 133,108 Q134,100 112,95 Q93,98 93,110 Z',
    lash: 'M92,106 Q112,84 134,104', lashW: 4,
    tips: 'M132,100 L142,95 M128,92 L136,84', tipW: 2.6 },
  { cx: 162, cy: 98, k: 0.72, rx: 25, ry: 30, pupil: [170, 104, 13], glint: [165, 99, 4.5],
    lid: 'M137,98 Q162,74 187,96 Q188,86 162,80 Q137,84 137,98 Z',
    lash: 'M136,94 Q162,68 189,92', lashW: 5,
    tips: 'M188,90 L200,84 M184,80 L194,71 M176,73 L182,62', tipW: 3 },
];

// Minimal absolute-command SVG path replayer (M/L/C/Q/Z — all the spec uses).
function specPath(ctx, d) {
  ctx.beginPath();
  const re = /([MLCQZ])([^MLCQZ]*)/g;
  let m;
  while ((m = re.exec(d))) {
    const n = (m[2].match(/-?[\d.]+/g) || []).map(Number);
    if (m[1] === 'M') ctx.moveTo(n[0], n[1]);
    else if (m[1] === 'L') for (let i = 0; i < n.length; i += 2) ctx.lineTo(n[i], n[i + 1]);
    else if (m[1] === 'C') for (let i = 0; i < n.length; i += 6) ctx.bezierCurveTo(n[i], n[i + 1], n[i + 2], n[i + 3], n[i + 4], n[i + 5]);
    else if (m[1] === 'Q') for (let i = 0; i < n.length; i += 4) ctx.quadraticCurveTo(n[i], n[i + 1], n[i + 2], n[i + 3]);
    else ctx.closePath();
  }
}
function specFill(ctx, d, fill, alpha = 1) {
  specPath(ctx, d);
  ctx.globalAlpha = alpha; ctx.fillStyle = fill; ctx.fill(); ctx.globalAlpha = 1;
}
function specStroke(ctx, d, stroke, w, alpha = 1) {
  specPath(ctx, d);
  ctx.globalAlpha = alpha; ctx.strokeStyle = stroke; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.stroke(); ctx.globalAlpha = 1;
}
// Body pie wedge: mouth opens right; arc runs the long way round (spec:
// A96,96 0 1 0). Upper and lower lip angles are independent so the jaw can
// chomp Pac-Man-style while the top lip stays put. When the jaw meets the top
// lip the wedge vanishes and she is a full circle — a true Pac-Man shut.
function chompoBodyPath(ctx, thetaUp, thetaLo) {
  ctx.beginPath();
  if (thetaUp + thetaLo < 0.02) {
    ctx.arc(120, 148, 96, 0, Math.PI * 2);
    ctx.closePath();
    return;
  }
  ctx.moveTo(120, 148);
  ctx.arc(120, 148, 96, -thetaUp, thetaLo, true);
  ctx.closePath();
}

// Her special-move bite: one deliberate, dramatic CHOMP per cycle — a fast gape,
// a beat held wide, then a hard SNAP shut and a rest closed. Reads as a bite
// rather than the steady sinusoid of the run chomp. Returns open amount 0..1.
function biteWave(cyc) {
  const q = cyc - Math.floor(cyc);
  if (q < 0.34) { const a = q / 0.34; return 1 - (1 - a) * (1 - a); }  // slow gape open (ease-out)
  if (q < 0.66) return 1;                                              // long dramatic hold wide
  if (q < 0.73) { const a = (0.73 - q) / 0.07; return a * a; }         // hard SNAP shut
  return 0;                                                            // hold shut
}
// Spec radial gradient (38%/32%, r 75% of the 192px body box); flat fallback
// for contexts without gradients (Node test stub) and tiny LOD renders.
function chompoBodyFill(ctx, p, lod) {
  if (lod || !ctx.createRadialGradient) return p.b;
  const g = ctx.createRadialGradient(96.96, 113.44, 0, 96.96, 113.44, 144);
  g.addColorStop(0, p.hi); g.addColorStop(0.58, p.b); g.addColorStop(1, p.sh);
  return g;
}
function chompoEye(ctx, p, e, bodyFill, lod, blink) {
  ctx.save();
  ctx.translate(e.cx, e.cy); ctx.scale(e.k, e.k); ctx.translate(-e.cx, -e.cy);
  if (blink) { // closed: the lash line arc plus her lash tips, so a blink still reads glam
    specStroke(ctx, e.lash, p.e, e.lashW);
    if (!lod) specStroke(ctx, e.tips, p.e, e.tipW);
    ctx.restore();
    return;
  }
  ctx.beginPath(); ctx.ellipse(e.cx, e.cy, e.rx, e.ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = p.w; ctx.fill();
  ctx.globalAlpha = 0.5; ctx.strokeStyle = p.sh; ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1;
  dot(ctx, e.pupil[0], e.pupil[1], e.pupil[2], p.e);
  dot(ctx, e.glint[0], e.glint[1], e.glint[2], p.w);
  if (!lod) {
    specFill(ctx, e.lid, bodyFill);        // half-lidded, body-coloured
    specStroke(ctx, e.lash, p.e, e.lashW);
    specStroke(ctx, e.tips, p.e, e.tipW);
  }
  ctx.restore();
}

function drawDisc(ctx, id, p, pose, u, ow, lod) {
  const ph = (pose.phase || 0) * Math.PI * 2;
  const duck = pose.kind === 'duck';
  const r = (duck ? 0.3 : 0.34) * u;
  const cy = duck ? -0.31 * u : -0.44 * u;
  if (duck && pose.roll) {
    ctx.save();
    ctx.translate(0, cy);
    ctx.rotate((pose.time || 0) * 13);
    const half = 0.16 * Math.PI;
    outlined(ctx, p.b, ow, (c) => {
      c.arc(0, 0, r, half, Math.PI * 2 - half);
      c.lineTo(0, 0);
      c.closePath();
    });
    dot(ctx, r * 0.35, -r * 0.45, 0.035 * u, p.e);
    if (id === 'chompo') {
      outlined(ctx, p.a, ow, (c) => c.ellipse(-0.13 * u, -r * 0.75, 0.1 * u, 0.06 * u, -0.5, 0, Math.PI * 2));
      outlined(ctx, p.a, ow, (c) => c.ellipse(0.02 * u, -r * 0.82, 0.1 * u, 0.06 * u, 0.5, 0, Math.PI * 2));
    }
    ctx.restore();
    return;
  }
  const ex = expressionFor(id, pose);
  // Pac-Man mouth with a fixed TOP lip: the upper angle holds the spec's idle
  // 15° while only the jaw (lower lip) swings. The jaw travels from -15° (flush
  // against the top lip — mouth FULLY closed, she becomes a circle) down to a
  // wide bite, twice a stride. Idle matches the spec's static 15/15 look.
  const upDeg = duck ? 10 : 15;
  let loDeg = duck ? 10 : 15;
  const mt = pose.time || 0;
  // Special move (HAZARD BITE): one deliberate CHOMP per ~0.6s — a wide gape,
  // a held beat, then a hard SNAP shut. The hold + snap read nothing like the
  // run's gentle steady chew. Both are paced by TIME (not stride) so the
  // speed is controllable and never frantic.
  if (pose.menuAction === 'chomp') loDeg = -upDeg + 57 * biteWave(mt * 1.7); // wide bite, just short of exposing a leg — snappy, ~0.6s a cycle
  else if (pose.kind === 'run') loDeg = -upDeg + 40 * (0.5 - 0.5 * Math.cos(mt * 11)); // gentle chew, ~1.75/s
  else if (pose.kind === 'celebrate') loDeg = -upDeg + 50 * Math.abs(Math.sin(mt * 6)); // chomping the air in triumph
  else if (pose.kind === 'jump') loDeg = 32;
  const thetaUp = upDeg * Math.PI / 180, thetaLo = loDeg * Math.PI / 180;

  // Walk: the head/body/hair bob up and down with each step (feet stay planted,
  // the legs stretch), and squash-and-stretch in sync — tall at footfall, fat at
  // mid-stride — so she reads as a character walking, not a disc vibrating in
  // place. Matches the humanoid cast's -|cos| bob for a consistent gait.
  const bob = pose.kind === 'run' ? -Math.abs(Math.cos(ph)) * 0.03 * u
    : pose.kind === 'idle' ? Math.sin((pose.time || 0) * 2) * 0.008 * u : 0;
  const squash = pose.kind === 'run' ? (0.5 - Math.abs(Math.cos(ph))) * 0.06 : Math.sin((pose.time || 0) * 2.2) * 0.012;
  const pivotY = cy + r * 0.9;
  ctx.save();
  ctx.translate(0, pivotY); ctx.scale(1 + squash, 1 - squash); ctx.translate(0, -pivotY);

  // local -> spec space: spec body centre (120,148) R=96 maps onto (0,cy) r
  const s = r / 96;
  const spec = (fn) => {
    ctx.save();
    ctx.translate(0, cy); ctx.scale(s, s); ctx.translate(-120, -148);
    fn();
    ctx.restore();
  };

  // Hair bounce: the masses ride the stride with follow-through — they lag the
  // body squash and the back mass swings farther than the front lock (spec px).
  const t0 = pose.time || 0;
  const hairBack = pose.kind === 'run' ? Math.sin(ph - 1.1) * 9 : Math.sin(t0 * 2.2 - 0.6) * 2.5;
  const hairFrontB = pose.kind === 'run' ? Math.sin(ph - 0.7) * 4.5 : Math.sin(t0 * 2.2 - 0.3) * 1.5;

  // 1. hair behind the body (spec draw order). Widened for volume but SHORTENED
  // vertically (y<1) so the back mass doesn't hang past her body. Rides the bob.
  ctx.save();
  ctx.translate(0, bob);
  spec(() => {
    ctx.translate(0, hairBack);
    ctx.translate(94, 40); ctx.scale(1.2, 0.95); ctx.translate(-94, -40);
    specFill(ctx, CHOMPO_PATHS.hairA, p.hairShade);
    specFill(ctx, CHOMPO_PATHS.hairB, p.hair);
    if (!lod) specStroke(ctx, CHOMPO_PATHS.hairC, p.hairLight, 4, 0.6);
  });
  ctx.restore();

  // 2. legs — excluded from the spec; the rig's own gait. Sized against the
  // humanoid cast (legW 0.09u): a touch slimmer at 0.07u, and reaching a
  // lower ankle so the pumps plant as deep as everyone else's soles — at the
  // old 0.055u / -0.05u ankle she read as hovering above the ground line.
  const p01 = pose.phase || 0;
  const gF = pose.kind === 'run' ? gaitFoot(p01, 0.08 * u, 0.06 * u) : [0, 0];
  const gB = pose.kind === 'run' ? gaitFoot(p01 + 0.5, 0.08 * u, 0.06 * u) : [0, 0];
  // legs stop at the ANKLE so the shoe, drawn on top, meets them cleanly
  // instead of the leg poking through it
  const ankleY = -0.03 * u;
  const hipY = cy + r * 0.6 + bob;   // hips ride the bob; feet stay planted, so legs stretch
  limb(ctx, -0.1 * u, hipY, -0.1 * u + gB[0], ankleY + gB[1], 0.07 * u, p.p, ow);
  limb(ctx, 0.1 * u, hipY, 0.1 * u + gF[0], ankleY + gF[1], 0.07 * u, p.p, ow);
  // high-heel pumps drawn BELOW the ankle (over the leg ends): pointed toe up
  // front, a lifted arch, and a thin stiletto heel planting on the ground
  // (y~0). Scaled up ~15% about the ankle to stay in proportion with the
  // thicker legs.
  const heel = (ax, ay) => {
    const gy = ay + 0.065 * u; // sole plants slightly into the ground line (y=0)
    ctx.save();
    ctx.translate(ax, ay); ctx.scale(1.15, 1.15); ctx.translate(-ax, -ay);
    outlined(ctx, p.f, Math.max(0.6, ow * 0.8), (c) => {
      c.moveTo(ax - 0.03 * u, ay + 0.004 * u);                                          // heel top, back of the ankle
      c.quadraticCurveTo(ax + 0.016 * u, ay - 0.014 * u, ax + 0.05 * u, ay + 0.012 * u); // vamp over the instep
      c.lineTo(ax + 0.094 * u, gy - 0.004 * u);                                         // pointed toe at the ground
      c.lineTo(ax + 0.032 * u, gy);                                                     // ball of the foot
      c.quadraticCurveTo(ax - 0.004 * u, gy - 0.03 * u, ax - 0.026 * u, gy);            // arch lifts to the heel tip
      c.lineTo(ax - 0.036 * u, gy);                                                     // stiletto base (thin)
      c.closePath();                                                                    // heel column up to the ankle
    });
    ctx.restore();
  };
  heel(-0.1 * u + gB[0], ankleY + gB[1]);
  heel(0.1 * u + gF[0], ankleY + gF[1]);

  ctx.save();
  ctx.translate(0, bob);
  spec(() => {
    const bodyFill = chompoBodyFill(ctx, p, lod);
    // 3. body + clipped belly shadow and top-left sheen
    chompoBodyPath(ctx, thetaUp, thetaLo);
    ctx.fillStyle = bodyFill;
    ctx.fill();
    if (!lod) {
      ctx.save();
      chompoBodyPath(ctx, thetaUp, thetaLo);
      ctx.clip();
      ctx.globalAlpha = 0.35; ctx.fillStyle = p.sh;
      ctx.beginPath(); ctx.ellipse(120, 235, 120, 80, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.22; ctx.fillStyle = p.w;
      ctx.beginPath(); ctx.ellipse(72, 92, 46, 38, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    // Red lips framing the mouth: a cupid's-bow upper lip (two peaks + a central
    // dip) and a fuller lower lip, filled between the mouth line and a bulged
    // face-side profile along each wedge edge. Skips the fully-shut circle.
    if (!lod && thetaUp + thetaLo >= 0.02) {
      const LIP = p.lip || '#d0202e', LIPSH = p.lipShade || p.aDark;
      // prof = [radius, face-side offset]; the mouth-side edge sits at offset 0
      const lip = (ang, perp, prof) => {
        const c = Math.cos(ang), s = Math.sin(ang), px = Math.cos(perp), py = Math.sin(perp);
        const pt = (rad, off) => [120 + c * rad + px * off, 148 + s * rad + py * off];
        ctx.beginPath();
        let a = pt(prof[0][0], 0); ctx.moveTo(a[0], a[1]);               // inner, on the mouth line
        a = pt(prof[prof.length - 1][0], 0); ctx.lineTo(a[0], a[1]);     // out to the rim
        for (let i = prof.length - 1; i >= 0; i--) { a = pt(prof[i][0], prof[i][1]); ctx.lineTo(a[0], a[1]); } // face-side profile back
        ctx.closePath();
        ctx.fillStyle = LIP; ctx.fill();
        ctx.strokeStyle = LIPSH; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6; ctx.stroke(); ctx.globalAlpha = 1;
      };
      ctx.save(); ctx.lineJoin = 'round';
      lip(-thetaUp, -thetaUp - Math.PI / 2, [[58, 2], [69, 13], [76, 6], [83, 13], [93, 2]]); // cupid's-bow upper lip
      lip(thetaLo, thetaLo + Math.PI / 2, [[58, 2], [74, 11], [93, 2]]);                       // fuller lower lip
      ctx.restore();
    }
    // 4-5. hair in front: translucent sheet over her back, then the face lock
    // (bouncing gentler than the back mass — follow-through, not lockstep)
    ctx.save();
    ctx.translate(0, hairFrontB);
    specFill(ctx, CHOMPO_PATHS.hairOver, p.hair, 0.5);
    if (!lod) specStroke(ctx, CHOMPO_PATHS.hairOverHi, p.hairLight, 3.5, 0.5);
    specFill(ctx, CHOMPO_PATHS.hairFront, p.hair);
    if (!lod) specStroke(ctx, CHOMPO_PATHS.hairFrontHi, p.hairLight, 4, 0.55);
    ctx.restore();
    // 6. eyes (far then near), on top of the hair
    for (const e of CHOMPO_EYES) chompoEye(ctx, p, e, bodyFill, lod, ex.blink);
    // 7. bow (spec rotate(-8°) plus a small flutter so it isn't frozen)
    const flutter = (pose.kind === 'run' ? Math.sin(2 * ph) : Math.sin((pose.time || 0) * 2)) * 0.05;
    ctx.save();
    ctx.translate(130, 40); ctx.rotate(-8 * Math.PI / 180 + flutter); ctx.translate(-130, -40);
    specFill(ctx, CHOMPO_PATHS.bowL, p.a);
    specFill(ctx, CHOMPO_PATHS.bowR, p.a);
    specFill(ctx, CHOMPO_PATHS.bowShade, p.aDark, 0.4);
    dot(ctx, 130, 45, 9, p.aDark);
    ctx.restore();
  });
  ctx.restore(); // end walk bob

  ctx.restore(); // end squash-and-stretch
}

// Raymn's head, drawn about (hx, hy): an oversized, windswept parody quiff.
// Its broad silhouette is intentional — it must remain recognizable even in
// the menu parade. Split out of drawRay so face crops can show the head alone.
function drawRayHead(ctx, id, p, pose, u, ow, hx, hy, lod, run) {
  const hairFlop = Math.sin((pose.time || 0) * (run ? 8 : 2.5)) * 0.025 * u;
  outlined(ctx, p.s, ow, (c) => c.arc(hx, hy, 0.17 * u, 0, Math.PI * 2));
  outlined(ctx, p.a, ow, (c) => {
    c.moveTo(hx - 0.17 * u, hy - 0.02 * u);
    c.quadraticCurveTo(hx - 0.31 * u, hy - 0.09 * u, hx - 0.28 * u, hy + 0.13 * u + hairFlop);
    c.quadraticCurveTo(hx - 0.21 * u, hy + 0.03 * u + hairFlop, hx - 0.09 * u, hy - 0.34 * u);
    c.quadraticCurveTo(hx - 0.05 * u, hy - 0.38 * u, hx - 0.015 * u, hy - 0.17 * u);
    c.quadraticCurveTo(hx + 0.08 * u, hy - 0.31 * u, hx + 0.21 * u, hy - 0.29 * u);
    c.quadraticCurveTo(hx + 0.23 * u, hy - 0.23 * u, hx + 0.14 * u, hy - 0.16 * u);
    c.quadraticCurveTo(hx + 0.23 * u, hy - 0.1 * u, hx + 0.19 * u, hy - 0.025 * u + hairFlop * 0.3);
    c.quadraticCurveTo(hx + 0.02 * u, hy - 0.15 * u, hx - 0.18 * u, hy - 0.07 * u);
    c.closePath();
  });
  const ex = expressionFor(id, pose);
  drawEyes(ctx, p, u, hx + 0.02 * u, hy - 0.01 * u, lod, ex);
  if (!lod) drawMouth(ctx, { mouth: 'smirk' }, p, u, hx + 0.02 * u, hy + 0.08 * u, ow, ex);
}

function drawRay(ctx, id, p, pose, u, ow, lod) {
  const ph = (pose.phase || 0) * Math.PI * 2;
  const run = pose.kind === 'run';
  const duck = pose.kind === 'duck';
  // Two distinct footfalls per cycle: each shoe travels backward along the
  // floor, then lifts and swings forward. The torso settles on contact.
  const footF = run ? floatingFoot(pose.phase || 0, 0.115 * u, 0.082 * u) : [0, 0];
  const footB = run ? floatingFoot((pose.phase || 0) + 0.5, 0.115 * u, 0.082 * u) : [0, 0];
  const bob = run ? -Math.abs(Math.sin(ph)) * 0.028 * u : 0;
  const cy = (duck ? -0.3 : -0.5) * u + bob;
  const handSwing = run ? Math.cos(ph) * 0.075 * u : 0;
  const handLift = run ? Math.sin(ph) * 0.035 * u : 0;
  // Floating shoes—no connecting legs.
  const backShoeX = -0.13 * u + footB[0], backShoeY = -0.04 * u + footB[1];
  const frontShoeX = 0.13 * u + footF[0], frontShoeY = -0.04 * u + footF[1];
  const backTilt = -0.08 - (run ? Math.sin(ph) * 0.1 : 0);
  const frontTilt = 0.08 + (run ? Math.sin(ph) * 0.1 : 0);
  outlined(ctx, p.w, Math.max(0.5, ow * 0.55), (c) => c.ellipse(backShoeX - 0.015 * u, backShoeY - 0.04 * u, 0.07 * u, 0.04 * u, backTilt, 0, Math.PI * 2));
  outlined(ctx, p.f, ow, (c) => c.ellipse(backShoeX, backShoeY, 0.125 * u, 0.063 * u, backTilt, 0, Math.PI * 2));
  outlined(ctx, p.w, Math.max(0.5, ow * 0.55), (c) => c.ellipse(frontShoeX - 0.015 * u, frontShoeY - 0.04 * u, 0.07 * u, 0.04 * u, frontTilt, 0, Math.PI * 2));
  outlined(ctx, p.f, ow, (c) => c.ellipse(frontShoeX, frontShoeY, 0.125 * u, 0.063 * u, frontTilt, 0, Math.PI * 2));
  // Torso and scarf.
  outlined(ctx, p.b, ow, (c) => roundRectPath(c, -0.2 * u, cy - 0.16 * u, 0.4 * u, 0.32 * u, 0.1 * u));
  outlined(ctx, p.m, ow, (c) => roundRectPath(c, -0.23 * u, cy - 0.12 * u, 0.46 * u, 0.07 * u, 0.03 * u));
  const scarfLag = run ? Math.sin(ph + 0.7) * 0.035 * u : 0;
  ctx.fillStyle = p.m; ctx.beginPath(); ctx.moveTo(-0.18 * u, cy - 0.08 * u); ctx.quadraticCurveTo(-0.31 * u, cy - 0.01 * u + scarfLag, -0.4 * u, cy + 0.01 * u + scarfLag); ctx.lineTo(-0.18 * u, cy + 0.04 * u); ctx.fill();
  drawRayHead(ctx, id, p, pose, u, ow, 0, cy - 0.31 * u, lod, run);
  // Floating gloves—hide the throwing glove until it returns.
  const handY = cy + 0.02 * u;
  const cheer = pose.kind === 'celebrate';
  // Celebrating, both gloves go up and the front one waves — being floating
  // hands, they wave with the whole glove.
  const backHandY = cheer ? cy - 0.5 * u : handY + handLift;
  outlined(ctx, p.w, ow, (c) => c.ellipse(-0.32 * u - handSwing, backHandY, 0.105 * u, 0.095 * u, -0.12, 0, Math.PI * 2));
  if (cheer) {
    const waveX = Math.sin((pose.time || 0) * 8) * 0.1 * u;
    outlined(ctx, p.w, ow, (c) => c.ellipse(0.28 * u + waveX, cy - 0.62 * u, 0.105 * u, 0.095 * u, 0.12, 0, Math.PI * 2));
  } else if (!pose.headless) outlined(ctx, p.w, ow, (c) => c.ellipse(0.32 * u + handSwing, handY - handLift, 0.105 * u, 0.095 * u, 0.12, 0, Math.PI * 2));
  else if (pose.menu) {
    const orbit = (pose.time || 0) * 8;
    outlined(ctx, p.w, ow, (c) => c.arc(0.5 * u + Math.sin(orbit) * 0.08 * u, handY - 0.16 * u - Math.abs(Math.cos(orbit)) * 0.08 * u, 0.105 * u, 0, Math.PI * 2));
  }
}

// ------------------------------------------------- thrown-ability projectiles
// The in-flight fist and axe reuse the on-body art — same palette, same
// two-pass outline — so the weapon stays the same object once it leaves the
// hero instead of morphing into a generic projectile.
export function drawRocketFist(ctx, x, y, t, returning = false) {
  const p = pal('raymn');
  const u = 40;
  const ow = Math.max(0.5, 0.016 * u);
  ctx.save();
  ctx.translate(x, y);
  if (returning) ctx.scale(-1, 1);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // a flicker of rocket exhaust off the wrist
  const flick = 1 + 0.35 * Math.sin((t || 0) * 40);
  outlined(ctx, p.f, Math.max(0.4, ow * 0.5), (c) => {
    c.moveTo(-0.09 * u, -0.045 * u);
    c.lineTo(-0.2 * u * flick, 0);
    c.lineTo(-0.09 * u, 0.045 * u);
    c.closePath();
  });
  // the glove itself: the same ellipse the ray rig wears on the body
  outlined(ctx, p.w, ow, (c) => c.ellipse(0, 0, 0.105 * u, 0.095 * u, 0.12, 0, Math.PI * 2));
  ctx.restore();
}

export function drawThrownAxe(ctx, x, y, rot) {
  const p = pal('grumpos');
  const u = 24;
  const ow = Math.max(0.5, 0.03 * u);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot || 0);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // the shoulder axe's handle and blade, re-centered on its spin axis
  limb(ctx, 0.26 * u, 0.41 * u, -0.13 * u, -0.24 * u, 0.06 * u, p.w, ow);
  outlined(ctx, '#b8d8f0', ow, (c) => {
    c.moveTo(-0.14 * u, -0.36 * u);
    c.quadraticCurveTo(-0.34 * u, -0.22 * u, -0.21 * u, -0.03 * u);
    c.lineTo(-0.07 * u, -0.1 * u);
    c.lineTo(-0.04 * u, -0.31 * u);
    c.closePath();
  });
  ctx.strokeStyle = '#eaf8ff';
  ctx.lineWidth = Math.max(0.6, ow * 0.55);
  ctx.beginPath();
  ctx.moveTo(-0.24 * u, -0.22 * u);
  ctx.lineTo(-0.1 * u, -0.16 * u);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- API
export function drawToon(ctx, heroId, pose = {}, cx, feetY, h, opts = {}) {
  const spec = TOON_SPECS[heroId];
  if (!spec) return;
  const p = pal(heroId);
  const u = h;
  const ow = Math.max(0.3, 0.016 * h); // whisper-light contour
  const lod = h < 16;
  let sx = 1, sy = 1;
  if (!pose.grounded && pose.kind === 'jump') {
    const st = pose.stomp ? 0.25 : Math.min(0.18, Math.abs(pose.vy || 0) / 700);
    sy = 1 + st;
    sx = 1 - 0.6 * st;
  }
  const q = pose.squash || 0;
  if (q > 0) { sy *= 1 - 0.28 * q; sx *= 1 + 0.32 * q; }
  ctx.save();
  if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
  ctx.translate(cx, feetY);
  // The victory routine drives the whole rig — hop, sway, turn and squash —
  // so humanoid, blob, disc and ray all dance off the same clock.
  const cm = pose.kind === 'celebrate' ? celebrateMotion(heroId, pose.time || 0) : null;
  if (cm) ctx.translate(cm.x * u, -cm.lift * u);
  if (pose.facing === -1) ctx.scale(-1, 1);
  if (pose.lean) ctx.rotate(pose.lean);
  if (cm) {
    if (cm.tilt) ctx.rotate(cm.tilt);
    // a flat turn-around: squeeze the sprite through zero width and back
    if (cm.spin !== 1) sx *= (cm.spin < 0 ? -1 : 1) * Math.max(0.12, Math.abs(cm.spin));
    if (cm.squash) { sy *= 1 - 0.24 * cm.squash; sx *= 1 + 0.2 * cm.squash; }
  }
  ctx.scale(sx, sy);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (spec.rig === 'pika') drawPika(ctx, heroId, p, pose, u, ow, lod);
  else if (spec.rig === 'blob') drawBlob(ctx, heroId, p, pose, u, ow, lod);
  else if (spec.rig === 'disc') drawDisc(ctx, heroId, p, pose, u, ow, lod);
  else if (spec.rig === 'ray') drawRay(ctx, heroId, p, pose, u, ow, lod);
  else drawHumanoid(ctx, heroId, spec, p, pose, u, ow, lod);
  ctx.restore();
}

// The raw face paint: nominal framing per rig. Extents vary a lot between
// heroes (hats, ears, whiskers), so drawToonFace measures this and refits.
function paintFace(ctx, heroId, spec, x, y, w, h) {
  const p = pal(heroId);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // head+hat spans ~0.5u; fit that span to the box height
  const u = (h * 0.92) / 0.5;
  const ow = Math.max(0.6, 0.032 * (h * 2));
  if (spec.rig === 'humanoid') {
    drawHead(ctx, heroId, spec, p, u, ow, x + w / 2, y + h * 0.62, false);
  } else if (spec.rig === 'ray') {
    // ray has a real head on a floating body — crop to the head like a humanoid
    drawRayHead(ctx, heroId, p, { kind: 'idle', time: 0 }, u, ow, x + w / 2, y + h * 0.62, false, false);
  } else {
    // blob/disc: the body IS the face — draw the whole toon fitted
    drawToon(ctx, heroId, { kind: 'idle', time: 0 }, x + w / 2, y + h * 1.18, h * 1.45);
  }
}

// Ink bounds of paintFace, in fractions of its own w-by-h box. Measured once
// per hero on an oversized scratch canvas (so anything spilling past the box
// still registers) and cached; falls back to the nominal box if pixels can't
// be read (headless stubs).
const FACE_FIT = new Map();
const FIT_R = 64; // nominal box size used for the measurement render
function faceFit(heroId, spec) {
  if (FACE_FIT.has(heroId)) return FACE_FIT.get(heroId);
  const nominal = { x: 0, y: 0, w: 1, h: 1 };
  let fit = nominal;
  try {
    const c = document.createElement('canvas');
    c.width = c.height = FIT_R * 3;
    const x = c.getContext('2d');
    x.save();
    paintFace(x, heroId, spec, FIT_R, FIT_R, FIT_R, FIT_R);
    x.restore();
    const { data } = x.getImageData(0, 0, c.width, c.height);
    if (data.length === c.width * c.height * 4) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let py = 0; py < c.height; py++) {
        for (let px = 0; px < c.width; px++) {
          if (data[(py * c.width + px) * 4 + 3] < 8) continue; // ignore AA dust
          if (px < x0) x0 = px;
          if (px > x1) x1 = px;
          if (py < y0) y0 = py;
          if (py > y1) y1 = py;
        }
      }
      if (x1 >= x0) {
        fit = {
          x: (x0 - FIT_R) / FIT_R,
          y: (y0 - FIT_R) / FIT_R,
          w: (x1 - x0 + 1) / FIT_R,
          h: (y1 - y0 + 1) / FIT_R,
        };
      }
    }
  } catch { /* no canvas: keep nominal framing */ }
  FACE_FIT.set(heroId, fit);
  return fit;
}

// Head-and-face render fitted to a w-by-h box (HUD cells, portal crops).
// Every hero is scaled and centered so its whole silhouette lands inside the
// box with a hair of breathing room — no clipped hats, ears, or chins.
const FACE_PAD = 0.04; // fraction of the box left empty on each side
export function drawToonFace(ctx, heroId, x, y, w, h) {
  const spec = TOON_SPECS[heroId];
  if (!spec) return;
  const fit = faceFit(heroId, spec);
  // paintFace scales everything off h and centers on w/2, so the ink lands at
  // this size and offset regardless of how wide the box is.
  const inkW = fit.w * h, inkH = fit.h * h;
  const cx = w / 2 + (fit.x + fit.w / 2 - 0.5) * h;
  const cy = (fit.y + fit.h / 2) * h;
  const s = Math.min((1 - FACE_PAD * 2) * w / inkW, (1 - FACE_PAD * 2) * h / inkH);
  ctx.save();
  // put the measured ink center on the box center, then scale it to fit
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(s, s);
  ctx.translate(-cx, -cy);
  paintFace(ctx, heroId, spec, 0, 0, w, h);
  ctx.restore();
}

// Cached supersampled canvases for static small sites.
const toonCache = new Map();
const SS = 6;
function cached(key, w, h, paint) {
  if (toonCache.has(key)) return toonCache.get(key);
  const c = document.createElement('canvas');
  c.width = Math.max(1, w * SS);
  c.height = Math.max(1, h * SS);
  const x = c.getContext('2d');
  x.scale(SS, SS);
  paint(x);
  toonCache.set(key, c);
  return c;
}
export function toonFaceSprite(heroId, w, h) {
  return cached(`${heroId}|face|${w}x${h}`, w, h, (x) => drawToonFace(x, heroId, 0, 0, w, h));
}
export function toonStandSprite(heroId, w, h) {
  return cached(`${heroId}|stand|${w}x${h}`, w, h, (x) => drawToon(x, heroId, { kind: 'idle', time: 0, grounded: true }, w / 2, h - 0.5, h * 0.96));
}

// Derive a draw pose from the shared Player controller.
export function poseFromPlayer(player, t) {
  const hero = player.hero || {};
  return {
    kind: (player.ducking || player.rolling || player.compressT > 0) ? 'duck' : (!player.grounded ? 'jump' : 'run'),
    phase: player.anim % 1,
    time: t,
    vy: player.vy,
    grounded: player.grounded,
    squash: Math.max(0, Math.min(1, (player.landedT || 0) / 0.12)),
    lean: player.dashT > 0 ? 0.26 * Math.min(1, player.dashT / 0.2) : 0,
    roll: !!player.rolling,
    float: !!player.floating,
    stomp: !!player.stomping,
    headless: player.headless > 0 || player.fistThrown,
    axeThrown: !!player.axeThrown,
    facing: 1,
  };
}
