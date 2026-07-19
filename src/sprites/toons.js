// Flat-cartoon vector heroes: one painter for every hero render site.
// Bold dark outlines, flat colors, procedural animation. Resolution
// independent — drawn at device resolution in-run (via pushOverlayDraw)
// and cached/supersampled for tiny static sites (HUD faces, hub NPCs).
// Colors come from HERO_SPRITES palettes so pixel and toon stay in sync.
import { HERO_SPRITES } from './heroes.js';

const OUTLINE = '#1a1028';
const pal = (id) => HERO_SPRITES[id].pal;

// rig: humanoid | blob | disc. head/back/etc select per-hero decorations.
export const TOON_SPECS = {
  lorenzo: { rig: 'humanoid', head: 'cap', nose: true, mustache: true, straps: true },
  gnash: { rig: 'humanoid', head: 'quills', mouth: 'smirk' },
  fernwick: { rig: 'humanoid', head: 'floppy', mouth: 'smile', back: 'shield', rollDuck: true },
  b33p: { rig: 'humanoid', head: 'dome', mouth: 'line', cannon: true },
  mochi: { rig: 'blob' },
  chompo: { rig: 'disc' },
  gary: { rig: 'humanoid', head: 'paperhat', mouth: 'flat', nameTag: true },
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

// ---------------------------------------------------------------- faces
function drawEyes(ctx, p, u, cx, cy, lod) {
  const sep = 0.075 * u;
  if (lod) {
    dot(ctx, cx - sep, cy, 0.032 * u, p.e);
    dot(ctx, cx + sep, cy, 0.032 * u, p.e);
    return;
  }
  for (const sx of [-1, 1]) {
    outlined(ctx, '#fff', Math.max(0.75, 0.02 * u), (c) => c.ellipse(cx + sx * sep, cy, 0.055 * u, 0.065 * u, 0, 0, Math.PI * 2));
    dot(ctx, cx + sx * sep, cy + 0.012 * u, 0.026 * u, p.e);
  }
}
function drawMouth(ctx, spec, p, u, cx, cy, ow) {
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1, ow * 0.7);
  ctx.beginPath();
  if (spec.mouth === 'smile') ctx.arc(cx, cy - 0.02 * u, 0.06 * u, 0.25 * Math.PI, 0.75 * Math.PI);
  else if (spec.mouth === 'smirk') { ctx.moveTo(cx, cy + 0.01 * u); ctx.quadraticCurveTo(cx + 0.05 * u, cy + 0.02 * u, cx + 0.08 * u, cy - 0.02 * u); }
  else if (spec.mouth === 'line') { ctx.moveTo(cx - 0.045 * u, cy); ctx.lineTo(cx + 0.045 * u, cy); }
  else if (spec.mouth === 'flat') { ctx.moveTo(cx - 0.05 * u, cy + 0.01 * u); ctx.lineTo(cx + 0.05 * u, cy + 0.01 * u); }
  else { ctx.stroke(); return; }
  ctx.stroke();
}

// Head + hat + face, anchored at head center (hx, hy). Shared by the body
// rig and the face-crop sprites.
function drawHead(ctx, id, spec, p, u, ow, hx, hy, lod) {
  const R = (spec.heavy ? 0.19 : 0.21) * u;
  // hair/hat layers that sit BEHIND the head
  if (spec.head === 'quills') {
    for (const [dx, dy] of [[-0.05, -0.16], [-0.09, -0.04], [-0.07, 0.09]]) {
      outlined(ctx, p.h, ow, (c) => {
        c.moveTo(hx + dx * u, hy + dy * u);
        c.lineTo(hx + (dx - 0.17) * u, hy + (dy + 0.03) * u);
        c.lineTo(hx + dx * u, hy + (dy + 0.1) * u);
        c.closePath();
      });
    }
  }
  if (spec.head === 'floppy') {
    // droopy cap tip hanging behind
    outlined(ctx, p.h, ow, (c) => {
      c.moveTo(hx - R * 0.3, hy - R * 0.75);
      c.quadraticCurveTo(hx - R * 1.7, hy - R * 0.9, hx - R * 1.45, hy + R * 0.15);
      c.quadraticCurveTo(hx - R * 1.1, hy - R * 0.35, hx - R * 0.45, hy - R * 0.4);
      c.closePath();
    });
  }
  // the head ball (robot dome is hat-colored)
  outlined(ctx, spec.head === 'dome' ? p.h : p.s, ow, (c) => c.arc(hx, hy, R, 0, Math.PI * 2));
  // hats / hair ON the head
  if (spec.head === 'cap') {
    outlined(ctx, p.h, ow, (c) => { c.arc(hx, hy - R * 0.12, R * 1.02, Math.PI, 0); c.closePath(); });
    outlined(ctx, p.h, ow, (c) => c.ellipse(hx + R * 0.8, hy - R * 0.28, R * 0.5, R * 0.16, 0, 0, Math.PI * 2));
    if (!lod) outlined(ctx, p.a, Math.max(0.6, ow * 0.6), (c) => c.arc(hx + R * 0.12, hy - R * 0.55, R * 0.22, 0, Math.PI * 2));
  } else if (spec.head === 'quills') {
    outlined(ctx, p.h, ow, (c) => { c.arc(hx, hy - R * 0.1, R * 1.02, Math.PI * 0.95, Math.PI * 0.05); c.closePath(); });
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
    ctx.strokeStyle = p.a;
    ctx.lineWidth = 0.06 * u;
    ctx.beginPath();
    ctx.arc(hx, hy, R * 0.86, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();
  }
  if (spec.beard) {
    outlined(ctx, p.m, ow, (c) => c.ellipse(hx, hy + R * 0.62, R * 0.95, R * 0.7, 0, 0, Math.PI * 2));
  }
  // face
  const eyeY = hy - 0.015 * u;
  drawEyes(ctx, p, u, hx + 0.01 * u, eyeY, lod);
  if (spec.nose) outlined(ctx, p.n, Math.max(0.6, ow * 0.7), (c) => c.arc(hx + 0.02 * u, hy + 0.055 * u, 0.055 * u, 0, Math.PI * 2));
  if (spec.mustache && !lod) {
    outlined(ctx, p.m, Math.max(0.6, ow * 0.6), (c) => roundRectPath(c, hx - 0.1 * u, hy + 0.085 * u, 0.24 * u, 0.055 * u, 0.03 * u));
  }
  if (!spec.beard && !spec.mustache && !lod) drawMouth(ctx, spec, p, u, hx + 0.01 * u, hy + 0.11 * u, ow);
}

// ---------------------------------------------------------------- rigs
function drawHumanoid(ctx, id, spec, p, pose, u, ow, lod) {
  if (pose.kind === 'duck' && spec.rollDuck) return drawRoll(ctx, p, pose, u, ow);
  const heavy = !!spec.heavy;
  const headR = (heavy ? 0.19 : 0.21) * u;
  const torsoHalf = (heavy ? 0.23 : 0.17) * u;
  const legL = (heavy ? 0.24 : 0.3) * u;
  const armL = 0.26 * u;
  const legW = (heavy ? 0.11 : 0.09) * u;
  const armW = (heavy ? 0.09 : 0.075) * u;
  const run = pose.kind === 'run';
  const jump = pose.kind === 'jump';
  const duck = pose.kind === 'duck';
  const ph = (pose.phase || 0) * Math.PI * 2;
  const s = Math.sin(ph);
  const bob = run ? -Math.abs(Math.cos(ph)) * 0.03 * u
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
  } else {
    footF = [0.07 * u, 0]; footB = [-0.07 * u, 0]; kneeB = -1;
  }

  // arms: bent at the elbow, counter-swinging the legs while running
  const armSeg = armL * 0.55;
  const shF = torsoHalf * 0.55 + leanX, shB = -torsoHalf * 0.55 + leanX;
  let handF, handB, elbF = -1, elbB = -1;  // elbows trail behind by default
  if (pose.headless || pose.stomp) {
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
  if (spec.back === 'shield') {
    outlined(ctx, p.w, ow, (c) => c.arc(-torsoHalf - 0.08 * u, shoulderY + 0.06 * u, 0.11 * u, 0, Math.PI * 2));
    dot(ctx, -torsoHalf - 0.08 * u, shoulderY + 0.06 * u, 0.035 * u, OUTLINE);
  } else if (spec.back === 'axe') {
    limb(ctx, 0.04 * u, shoulderY + 0.04 * u, -0.26 * u, headY - 0.18 * u, 0.05 * u, p.w, ow);
    outlined(ctx, '#b8d8f0', ow, (c) => {
      c.moveTo(-0.26 * u, headY - 0.26 * u);
      c.quadraticCurveTo(-0.4 * u, headY - 0.14 * u, -0.26 * u, headY - 0.02 * u);
      c.closePath();
    });
  }

  // back limbs
  limb2(ctx, shB, shoulderY, handB[0], handB[1], armSeg, elbB, armW, p.b, ow);
  limb2(ctx, leanX * 0.3, hipY, footB[0], footB[1], legSeg, kneeB, legW, p.p, ow);
  outlined(ctx, p.f, Math.max(0.6, ow * 0.8), (c) => c.ellipse(footB[0] + 0.02 * u, footB[1] - 0.01 * u, 0.075 * u, 0.045 * u, 0, 0, Math.PI * 2));

  // torso
  outlined(ctx, p.b, ow, (c) => roundRectPath(c, -torsoHalf + leanX * 0.5, torsoTop, torsoHalf * 2, (hipY + 0.05 * u) - torsoTop, torsoHalf * 0.7));
  if (spec.straps && !lod && !duck) {
    ctx.strokeStyle = p.p;
    ctx.lineWidth = 0.045 * u;
    ctx.beginPath();
    ctx.moveTo(-torsoHalf * 0.5, torsoTop + 0.01 * u); ctx.lineTo(-torsoHalf * 0.4, torsoTop + 0.12 * u);
    ctx.moveTo(torsoHalf * 0.5, torsoTop + 0.01 * u); ctx.lineTo(torsoHalf * 0.4, torsoTop + 0.12 * u);
    ctx.stroke();
  }
  if (spec.nameTag && !lod && !duck) {
    outlined(ctx, p.w, Math.max(0.6, ow * 0.5), (c) => roundRectPath(c, torsoHalf * 0.15, torsoTop + 0.05 * u, 0.09 * u, 0.06 * u, 0.01 * u));
  }

  // front limbs
  limb2(ctx, leanX * 0.3, hipY, footF[0], footF[1], legSeg, kneeF, legW, p.p, ow);
  outlined(ctx, p.f, Math.max(0.6, ow * 0.8), (c) => c.ellipse(footF[0] + 0.02 * u, footF[1] - 0.01 * u, 0.075 * u, 0.045 * u, 0, 0, Math.PI * 2));
  if (spec.cannon) {
    // the cannon aims dead ahead — no elbow on ordnance
    limb(ctx, shF, shoulderY, shF + armL * 0.72, shoulderY + armL * 0.28, 0.12 * u, p.a, ow);
    outlined(ctx, OUTLINE, Math.max(0.6, ow * 0.5), (c) => c.arc(shF + armL * 0.72, shoulderY + armL * 0.28, 0.045 * u, 0, Math.PI * 2));
  } else {
    limb2(ctx, shF, shoulderY, handF[0], handF[1], armSeg, elbF, armW, p.b, ow);
  }

  // head (or the stump of one)
  if (pose.headless) {
    outlined(ctx, p.s, Math.max(0.6, ow * 0.8), (c) => c.ellipse(leanX * 0.5, torsoTop, 0.07 * u, 0.045 * u, 0, 0, Math.PI * 2));
  } else {
    drawHead(ctx, id, spec, p, u, ow, 0.01 * u + leanX, headY, lod);
  }
}

function drawRoll(ctx, p, pose, u, ow) {
  const r = 0.26 * u;
  ctx.save();
  ctx.translate(0, -r - 0.01 * u);
  ctx.rotate((pose.time || 0) * 14);
  outlined(ctx, p.h, ow, (c) => c.arc(0, 0, r, 0, Math.PI * 2));
  ctx.strokeStyle = p.a;
  ctx.lineWidth = 0.07 * u;
  ctx.beginPath();
  ctx.moveTo(-r * 0.8, 0); ctx.lineTo(r * 0.8, 0);
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
  if (duck) { rx = 0.42 * u; ry = 0.24 * u; cy = -0.26 * u; }
  else if (pose.kind === 'run') { const b = Math.sin(2 * ph) * 0.03 * u; ry += b; rx -= b * 0.7; }
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
  const nubY = pose.float ? cy - ry * 0.55 : cy + ry * 0.15;
  outlined(ctx, p.a, Math.max(0.6, ow * 0.8), (c) => c.arc(-rx - 0.01 * u, nubY, 0.07 * u, 0, Math.PI * 2));
  outlined(ctx, p.a, Math.max(0.6, ow * 0.8), (c) => c.arc(rx + 0.01 * u, nubY, 0.07 * u, 0, Math.PI * 2));
  // face lives on the body
  drawEyes(ctx, p, u, 0.01 * u, cy - ry * 0.15, lod);
  outlined(ctx, p.m, Math.max(0.6, ow * 0.5), (c) => c.ellipse(0.01 * u, cy + ry * 0.3, 0.05 * u, 0.035 * u, 0, 0, Math.PI * 2));
  ctx.restore();
}

function drawDisc(ctx, id, p, pose, u, ow, lod) {
  const ph = (pose.phase || 0) * Math.PI * 2;
  const duck = pose.kind === 'duck';
  const r = (duck ? 0.3 : 0.34) * u;
  const cy = duck ? -0.32 * u : -0.44 * u;
  let open = 0.35;
  if (pose.kind === 'run') open = 0.5 + 0.5 * Math.sin(2 * ph);
  if (duck) open = 0.15;
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
  if (lod) dot(ctx, 0.06 * u, cy - r * 0.45, 0.035 * u, p.e);
  else {
    outlined(ctx, '#fff', Math.max(0.75, 0.02 * u), (c) => c.ellipse(0.07 * u, cy - r * 0.45, 0.06 * u, 0.07 * u, 0, 0, Math.PI * 2));
    dot(ctx, 0.08 * u, cy - r * 0.43, 0.028 * u, p.e);
  }
}

// ---------------------------------------------------------------- API
export function drawToon(ctx, heroId, pose = {}, cx, feetY, h, opts = {}) {
  const spec = TOON_SPECS[heroId];
  if (!spec) return;
  const p = pal(heroId);
  const u = h;
  const ow = Math.max(0.6, 0.032 * h); // subtle outline, not a marker pen
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
  if (pose.facing === -1) ctx.scale(-1, 1);
  if (pose.lean) ctx.rotate(pose.lean);
  ctx.scale(sx, sy);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (spec.rig === 'blob') drawBlob(ctx, heroId, p, pose, u, ow, lod);
  else if (spec.rig === 'disc') drawDisc(ctx, heroId, p, pose, u, ow, lod);
  else drawHumanoid(ctx, heroId, spec, p, pose, u, ow, lod);
  ctx.restore();
}

// Head-and-face render fitted to a w-by-h box (HUD cells, portal crops).
export function drawToonFace(ctx, heroId, x, y, w, h) {
  const spec = TOON_SPECS[heroId];
  if (!spec) return;
  const p = pal(heroId);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (spec.rig === 'humanoid') {
    // head+hat spans ~0.5u; fit that span to the box height
    const u = (h * 0.92) / 0.5;
    const ow = Math.max(0.6, 0.032 * (h * 2));
    drawHead(ctx, heroId, spec, p, u, ow, x + w / 2, y + h * 0.62, false);
  } else {
    // blob/disc: the body IS the face — draw the whole toon fitted
    drawToon(ctx, heroId, { kind: 'idle', time: 0 }, x + w / 2, y + h * 1.18, h * 1.45);
  }
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
    kind: player.ducking ? 'duck' : (!player.grounded ? 'jump' : 'run'),
    phase: player.anim % 1,
    time: t,
    vy: player.vy,
    grounded: player.grounded,
    squash: Math.max(0, Math.min(1, (player.landedT || 0) / 0.12)),
    lean: player.dashT > 0 ? 0.26 * Math.min(1, player.dashT / 0.2) : 0,
    roll: player.ducking && !!hero.duckIsRoll,
    float: !!player.floating,
    stomp: !!player.stomping,
    headless: player.headless > 0,
    facing: 1,
  };
}
