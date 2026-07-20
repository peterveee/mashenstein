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
  fernwick: { rig: 'humanoid', head: 'floppy', mouth: 'smile', back: 'shield', rollDuck: true },
  b33p: { rig: 'humanoid', head: 'dome', mouth: 'line', cannon: true },
  mochi: { rig: 'blob' },
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
  if (!lod && (ex.focus || ex.mood === 'cocky' || ex.mood === 'gruff')) {
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
  else if (spec.mouth === 'flat') { ctx.moveTo(cx - 0.05 * u, cy + 0.01 * u); ctx.lineTo(cx + 0.05 * u, cy + 0.01 * u); }
  else { ctx.stroke(); return; }
  ctx.stroke();
}

// Head + hat + face, anchored at head center (hx, hy). Shared by the body
// rig and the face-crop sprites.
function drawHead(ctx, id, spec, p, u, ow, hx, hy, lod, pose = {}) {
  const R = (spec.heavy ? 0.22 : 0.21) * u;
  // hair/hat layers that sit BEHIND the head
  if (spec.head === 'jackal') {
    // Tall uneven ears and cheek fur make Gnash a jackal-like speed creature,
    // deliberately avoiding the familiar hedgehog/quill silhouette.
    for (const [side, lean, height] of [[-1, -0.12, 1.55], [1, 0.08, 1.35]]) {
      outlined(ctx, p.h, ow, (c) => {
        c.moveTo(hx + side * R * 0.62, hy - R * 0.35);
        c.lineTo(hx + side * R * (0.58 + lean), hy - R * height);
        c.lineTo(hx + side * R * 0.12, hy - R * 0.66);
        c.closePath();
      });
    }
    outlined(ctx, p.h, ow, (c) => {
      c.moveTo(hx - R * 0.8, hy + R * 0.05);
      c.lineTo(hx - R * 1.22, hy + R * 0.38);
      c.lineTo(hx - R * 0.66, hy + R * 0.52);
      c.closePath();
    });
  }
  if (spec.head === 'floppy') {
    // Long pointed cap streaming behind him. The tip lags and bobs slightly
    // with motion, giving Fernwick a distinct silhouette at gameplay scale.
    const motion = pose.kind === 'run' || pose.kind === 'jump';
    const wave = motion ? Math.sin((pose.time || 0) * 7) * R * 0.2 : 0;
    const tipX = hx - R * (motion ? 2.1 : 1.75);
    const tipY = hy + R * (motion ? 0.02 : 0.32) + wave;
    outlined(ctx, p.h, ow, (c) => {
      c.moveTo(hx - R * 0.2, hy - R * 0.82);
      c.quadraticCurveTo(hx - R * 1.15, hy - R * 0.95, tipX, tipY);
      c.quadraticCurveTo(hx - R * 1.25, hy - R * 0.12, hx - R * 0.48, hy - R * 0.36);
      c.closePath();
    });
    if (!lod) dot(ctx, tipX, tipY, R * 0.13, p.a);
  }
  // Grumpos gets a broad chibi block-head; the softer cast keeps round heads.
  if (id === 'grumpos') {
    outlined(ctx, p.s, ow, (c) => {
      c.moveTo(hx - R, hy + R * 0.18);
      c.quadraticCurveTo(hx - R * 1.02, hy - R * 0.68, hx - R * 0.46, hy - R * 0.98);
      c.quadraticCurveTo(hx, hy - R * 1.22, hx + R * 0.46, hy - R * 0.98);
      c.quadraticCurveTo(hx + R * 1.02, hy - R * 0.68, hx + R, hy + R * 0.18);
      c.lineTo(hx + R * 0.88, hy + R * 0.72);
      c.quadraticCurveTo(hx + R * 0.58, hy + R, hx, hy + R);
      c.quadraticCurveTo(hx - R * 0.58, hy + R, hx - R * 0.88, hy + R * 0.72);
      c.closePath();
    });
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
    outlined(ctx, p.h, ow, (c) => {
      c.moveTo(hx - R * 0.45, hy - R * 0.78);
      c.lineTo(hx - R * 0.05, hy - R * 1.18);
      c.lineTo(hx + R * 0.12, hy - R * 0.82);
      c.closePath();
    });
  } else if (spec.head === 'floppy') {
    // blond bowl cut peeking under a green cap
    outlined(ctx, p.a, ow, (c) => { c.arc(hx, hy + R * 0.02, R * 1.04, Math.PI, 0); c.closePath(); });
    outlined(ctx, p.h, ow, (c) => { c.arc(hx, hy - R * 0.28, R * 1.0, Math.PI, 0); c.closePath(); });
  } else if (spec.head === 'dome') {
    // faceplate + running lights
    outlined(ctx, p.s, Math.max(0.6, ow * 0.7), (c) => roundRectPath(c, hx - R * 0.62, hy - R * 0.28, R * 1.24, R * 0.95, R * 0.3));
    if (!lod) { dot(ctx, hx - R * 0.3, hy - R * 0.68, R * 0.1, p.w); dot(ctx, hx + R * 0.3, hy - R * 0.68, R * 0.1, p.w); }
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
    ctx.strokeStyle = p.a; ctx.lineWidth = Math.max(1.2, R * 0.22);
    ctx.beginPath();
    ctx.moveTo(hx - R * 0.72, hy - R * 0.88);
    ctx.lineTo(hx - R * 0.42, hy - R * 0.12);
    ctx.lineTo(hx - R * 0.18, hy + R * 0.72);
    ctx.stroke();
  }
  // face
  const ex = expressionFor(id, pose);
  const eyeY = hy - 0.015 * u;
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
  const legSeg = (duck ? 0.2 : 0.56) * legL + 0.02 * u;
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
    // Airborne, the legs tuck and split; grounded, they bend into the bounce.
    const air = Math.min(1, cm.lift / 0.1);
    footF = [(0.07 + 0.1 * air) * u, -air * 0.34 * legL];
    footB = [(-0.07 - 0.07 * air) * u, -air * 0.52 * legL];
    kneeB = -1;
  } else {
    footF = [0.07 * u, 0]; footB = [-0.07 * u, 0]; kneeB = -1;
  }

  // arms: bent at the elbow, counter-swinging the legs while running
  const armSeg = armL * 0.55;
  const shF = torsoHalf * 0.55 + leanX, shB = -torsoHalf * 0.55 + leanX;
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
      // applause, dad-tempo: hands part and meet at chest height
      const sep = (0.04 + 0.15 * Math.abs(Math.sin(ct * 7))) * u;
      handF = [leanX + sep, shoulderY - armL * 0.4]; elbF = 1;
      handB = [leanX - sep, shoulderY - armL * 0.4]; elbB = -1;
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
    handF = [shF + 0.16 * u, shoulderY - armL * 0.5]; elbF = 1;
    handB = [shB - 0.16 * u, shoulderY - armL * 0.5]; elbB = -1;
  } else if (run) {
    const sw = -s; // opposite phase to the legs
    handF = [shF + 0.05 * u + 0.15 * u * sw, shoulderY + armL * 0.5 - 0.04 * u * Math.abs(sw)];
    handB = [shB + 0.05 * u - 0.15 * u * sw, shoulderY + armL * 0.5 - 0.04 * u * Math.abs(sw)];
  } else if (jump) {
    handF = [shF + 0.18 * u, shoulderY - armL * 0.4]; elbF = 1;
    handB = [shB - 0.18 * u, shoulderY - armL * 0.4]; elbB = -1;
  } else if (duck) {
    handF = [shF + 0.2 * u, shoulderY + 0.12 * u]; elbF = 1;
    handB = [shB - 0.2 * u, shoulderY + 0.12 * u]; elbB = -1;
  } else {
    handF = [shF + 0.03 * u, shoulderY + armL * 0.92];
    handB = [shB - 0.03 * u, shoulderY + armL * 0.92];
  }

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
  if (spec.back === 'shield') {
    outlined(ctx, p.w, ow, (c) => c.arc(-torsoHalf - 0.08 * u, shoulderY + 0.06 * u, 0.11 * u, 0, Math.PI * 2));
    dot(ctx, -torsoHalf - 0.08 * u, shoulderY + 0.06 * u, 0.035 * u, OUTLINE);
  } else if (spec.back === 'axe' && !pose.axeThrown) {
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

  // back limbs
  limb2(ctx, shB, shoulderY, handB[0], handB[1], armSeg, elbB, armW, heavy ? p.s : p.b, ow);
  limb2(ctx, leanX * 0.3, hipY, footB[0], footB[1], legSeg, kneeB, legW, p.p, ow);
  outlined(ctx, p.f, Math.max(0.6, ow * 0.8), (c) => c.ellipse(footB[0] + 0.02 * u, footB[1] - 0.01 * u, 0.075 * u, 0.045 * u, 0, 0, Math.PI * 2));

  // torso
  outlined(ctx, p.b, ow, (c) => roundRectPath(c, -torsoHalf + leanX * 0.5, torsoTop, torsoHalf * 2, (hipY + 0.05 * u) - torsoTop, torsoHalf * 0.7));
  if (id === 'grumpos' && !duck) {
    // Bright one-sided pauldron, belt and crossed straps sell the toy-like
    // Dad-of-War silhouette more clearly than a field of muddy leather.
    outlined(ctx, p.a, Math.max(0.6, ow * 0.7), (c) => c.arc(-torsoHalf * 0.78, shoulderY + 0.02 * u, 0.115 * u, 0, Math.PI * 2));
    outlined(ctx, p.s, Math.max(0.5, ow * 0.55), (c) => c.arc(-torsoHalf * 0.78, shoulderY + 0.02 * u, 0.052 * u, 0, Math.PI * 2));
    ctx.strokeStyle = p.a; ctx.lineWidth = 0.065 * u;
    ctx.beginPath(); ctx.moveTo(-torsoHalf * 0.55, torsoTop + 0.01 * u); ctx.lineTo(torsoHalf * 0.2, hipY); ctx.stroke();
    ctx.strokeStyle = p.w; ctx.lineWidth = 0.035 * u;
    ctx.beginPath(); ctx.moveTo(torsoHalf * 0.55, torsoTop); ctx.lineTo(-torsoHalf * 0.15, hipY); ctx.stroke();
    outlined(ctx, p.g, Math.max(0.5, ow * 0.55), (c) => roundRectPath(c, -torsoHalf * 0.95, hipY - 0.025 * u, torsoHalf * 1.9, 0.065 * u, 0.02 * u));
    dot(ctx, 0, hipY + 0.005 * u, 0.034 * u, p.w);
  }
  if (spec.straps && !lod && !duck) {
    ctx.strokeStyle = p.p;
    ctx.lineWidth = 0.045 * u;
    ctx.beginPath();
    ctx.moveTo(-torsoHalf * 0.5, torsoTop + 0.01 * u); ctx.lineTo(-torsoHalf * 0.4, torsoTop + 0.12 * u);
    ctx.moveTo(torsoHalf * 0.5, torsoTop + 0.01 * u); ctx.lineTo(torsoHalf * 0.4, torsoTop + 0.12 * u);
    ctx.stroke();
    // Tool belt and brass buckle anchor the overalls at tiny scale.
    ctx.strokeStyle = p.m; ctx.lineWidth = 0.055 * u;
    ctx.beginPath(); ctx.moveTo(-torsoHalf * 0.82, hipY - 0.035 * u); ctx.lineTo(torsoHalf * 0.82, hipY - 0.035 * u); ctx.stroke();
    outlined(ctx, p.a, Math.max(0.5, ow * 0.5), (c) => roundRectPath(c, -0.035 * u, hipY - 0.068 * u, 0.07 * u, 0.06 * u, 0.012 * u));
  }
  if (spec.nameTag && !lod && !duck) {
    outlined(ctx, p.w, Math.max(0.6, ow * 0.5), (c) => roundRectPath(c, torsoHalf * 0.15, torsoTop + 0.05 * u, 0.09 * u, 0.06 * u, 0.01 * u));
  }

  // front limbs
  limb2(ctx, leanX * 0.3, hipY, footF[0], footF[1], legSeg, kneeF, legW, p.p, ow);
  outlined(ctx, p.f, Math.max(0.6, ow * 0.8), (c) => c.ellipse(footF[0] + 0.02 * u, footF[1] - 0.01 * u, 0.075 * u, 0.045 * u, 0, 0, Math.PI * 2));
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
  }

  if (id === 'grumpos') {
    // Chunky gold-bound bracers make the tiny hands readable.
    outlined(ctx, p.g, Math.max(0.5, ow * 0.55), (c) => c.arc(handB[0], handB[1], 0.058 * u, 0, Math.PI * 2));
    outlined(ctx, p.g, Math.max(0.5, ow * 0.55), (c) => c.arc(handF[0], handF[1], 0.058 * u, 0, Math.PI * 2));
    dot(ctx, handB[0], handB[1], 0.028 * u, p.s);
    dot(ctx, handF[0], handF[1], 0.028 * u, p.s);
  } else if (spec.plumber) {
    // Cream work gloves make the swinging hands distinct from the sleeves.
    outlined(ctx, p.w, Math.max(0.5, ow * 0.6), (c) => c.arc(handB[0], handB[1], 0.052 * u, 0, Math.PI * 2));
    outlined(ctx, p.w, Math.max(0.5, ow * 0.6), (c) => c.arc(handF[0], handF[1], 0.052 * u, 0, Math.PI * 2));
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
  let open = pose.kind === 'jump' ? 0.72 : pose.kind === 'duck' ? 0.18 : 0.35;
  if (pose.menuAction === 'chomp') open = 0.2 + 0.8 * Math.abs(Math.sin((pose.time || 0) * 10));
  else if (pose.kind === 'celebrate') open = 0.35 + 0.6 * Math.abs(Math.sin((pose.time || 0) * 7)); // chomping the air in triumph
  else if (pose.kind === 'run') open = 0.5 + 0.5 * Math.sin(2 * ph);
  const half = 0.1 * Math.PI + open * 0.2 * Math.PI;
  // tiny legs under the disc, feet on the gait path so they lift naturally
  const p01 = pose.phase || 0;
  const gF = pose.kind === 'run' ? gaitFoot(p01, 0.08 * u, 0.06 * u) : [0, 0];
  const gB = pose.kind === 'run' ? gaitFoot(p01 + 0.5, 0.08 * u, 0.06 * u) : [0, 0];
  limb(ctx, -0.1 * u, cy + r * 0.6, -0.1 * u + gB[0], -0.03 * u + gB[1], 0.055 * u, p.p, ow);
  limb(ctx, 0.1 * u, cy + r * 0.6, 0.1 * u + gF[0], -0.03 * u + gF[1], 0.055 * u, p.p, ow);
  outlined(ctx, p.f, Math.max(0.6, ow * 0.8), (c) => c.ellipse(-0.1 * u + gB[0], -0.025 * u + gB[1], 0.07 * u, 0.04 * u, 0, 0, Math.PI * 2));
  outlined(ctx, p.f, Math.max(0.6, ow * 0.8), (c) => c.ellipse(0.1 * u + gF[0], -0.025 * u + gF[1], 0.07 * u, 0.04 * u, 0, 0, Math.PI * 2));
  // the disc with its mouth wedge (opens toward travel, +x)
  outlined(ctx, p.b, ow, (c) => {
    c.arc(0, cy, r, half, Math.PI * 2 - half);
    c.lineTo(0, cy);
    c.closePath();
  });
  // one big eye
  if (ex.blink) {
    ctx.strokeStyle = p.e; ctx.lineWidth = Math.max(0.8, ow);
    ctx.beginPath(); ctx.moveTo(0.02 * u, cy - r * 0.45); ctx.lineTo(0.13 * u, cy - r * 0.45); ctx.stroke();
  } else if (lod) dot(ctx, 0.06 * u, cy - r * 0.45, 0.035 * u, p.e);
  else {
    outlined(ctx, '#fff', Math.max(0.75, 0.02 * u), (c) => c.ellipse(0.07 * u, cy - r * 0.45, 0.06 * u, 0.07 * u, 0, 0, Math.PI * 2));
    dot(ctx, 0.08 * u, cy - r * 0.43, 0.028 * u, p.e);
    if (id === 'chompo') {
      ctx.strokeStyle = p.e; ctx.lineWidth = Math.max(0.7, ow);
      ctx.beginPath(); ctx.moveTo(0.105 * u, cy - r * 0.5); ctx.lineTo(0.14 * u, cy - r * 0.57); ctx.stroke();
    }
  }
  if (id === 'chompo') {
    const by = cy - r * 0.92;
    outlined(ctx, p.a, ow, (c) => c.ellipse(-0.07 * u, by, 0.1 * u, 0.06 * u, -0.45, 0, Math.PI * 2));
    outlined(ctx, p.a, ow, (c) => c.ellipse(0.07 * u, by, 0.1 * u, 0.06 * u, 0.45, 0, Math.PI * 2));
    dot(ctx, 0, by, 0.04 * u, p.m);
  }
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
  if (spec.rig === 'blob') drawBlob(ctx, heroId, p, pose, u, ow, lod);
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
