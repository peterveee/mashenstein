// Gallery-only: FALLING INTO A PIT, a bake-off (16 Oct 2026).
//
// Peter: "i feel like we need better effects when we fall into a pit.. the shocked face
// is a bit boring with the 'dead' eyes..." — and, mid-way, "remember the pits aren't super
// deep often". Nothing here is wired into the run.
//
// WHAT THE RUN DOES TODAY (game/run.js takeHit's isPit branch, updatePitSink, updateDead):
// the world freezes the frame he dies; he keeps drifting forward (vx decaying by 0.22^t,
// capped at half the hole and the far wall) while he falls at the death gravity, 600; the
// startled face (faceSurprised + browRaise, toons.js poseFromPlayer) on a frozen run frame.
// THE DROP IS SHORT: the material lies 12 world px under the lip (PIT_SURFACE_Y) — 0.2s of
// fall — and a spike bed's tips only 5 (fillSurfaceY('spikes')) — 0.13s. On arrival the
// spiral death face starts its clock, a liquid takes him under (a 0.4·vy plunge decaying
// into a 12 px/s sink) and a hard fill holds him on the tips; the hold is 2.25s
// (PIT_DEATH_HOLD), then the checkpoint. The camera shows 19 px of the 38 px apron, so
// every payoff here happens at the depth he actually stops at, in view.
//
// THE CANDIDATES keep that clock: every one ends inside the same 2.25s hold. A changes only
// the face; B–E spend the first second of the hold on a coyote hang over the hole, then drop
// the same short drop. Side-on always: looking down is the head TILTED forward about the
// neck (and the pupils down), never a turn to camera. Faces are the rig's own wherever it has
// one (surprised, grim, the death face's closed lids and teeth); the pinprick pupils are an
// overlay, measured per hero off his own drawing (eyesOf), so it carries to the cast.
//
// A painter is `paint(c, heroId, s)` in world units, screen-relative (the lane kit's world
// space, ground at GROUND_Y): s = { cx, fy, w, t, fill, surf, hard, carry, phase0 } —
// cx the hero's centre at the moment of death, fy the groundline, w seconds since he died
// (0..PIT_FALL_HOLD), t a running clock, fill the hole's material id, surf the altitude he
// stops at (negative, below the lip), hard whether it holds him, carry the drift budget,
// phase0 the run frame he died on. It draws the hero and everything that goes with him.
import { drawToon } from '../sprites/toons.js';
import { layer } from '../sprites/zap.js';
import { HIT_KIT } from '../sprites/hitPictures.js';
import { GROUND_Y, applyWorld } from '../engine/camera.js';
import { getStylePack, drawPitFills } from '../engine/stylePacks/index.js';
import { CABINET_BY_ID } from '../data/cabinets.js';
import { makeObstacle } from '../game/entities.js';
import { PIT_APRON_DEPTH, PIT_FLOOR, fillSurface } from '../game/pitFill.js';

const { U, hash, clamp01, lerp, easeOut, puff, star, flame, lines, iceTint } = HIT_KIT;
const INK = '#2a2226';

// ---------------------------------------------------------------- the run's numbers
export const PIT_FALL_HOLD = 2.25;      // PIT_DEATH_HOLD
const G = 600;                          // gravityForDeath
const SCROLL = 110;                     // the lab's run speed (the hit sheets' too)
const SINK = 12, PLUNGE_MAX = 90;       // PIT_SINK_RATE, PIT_PLUNGE_MAX
const surfOf = (fill) => -Math.round(fillSurface(fill).at * PIT_APRON_DEPTH);
const LIQUID_SURF = -Math.round(PIT_FLOOR * PIT_APRON_DEPTH);   // 12 px under the lip

// The forward drift: vx decaying by 0.22 a second, only while he is in the air.
const LN_DRAG = Math.log(1 / 0.22);
const driftAt = (w, carry) => Math.min(carry, SCROLL * (1 - Math.pow(0.22, w)) / LN_DRAG);
// How far under the surface a liquid has taken him, wa seconds after he arrived at vy.
function sunk(wa, vy) {
  const p0 = Math.min(PLUNGE_MAX, Math.abs(vy) * 0.4);
  if (wa <= 0) return 0;
  if (p0 <= SINK) return SINK * wa;
  const tStar = Math.log(p0 / SINK) / Math.log(20);
  if (wa <= tStar) return p0 * (1 - Math.pow(0.05, wa)) / Math.log(20);
  return p0 * (1 - Math.pow(0.05, tStar)) / Math.log(20) + SINK * (wa - tStar);
}
// A drop from rest at alt a0 to surf, starting at w0: [alt, arrived?, wa, vy at arrival].
function drop(w, w0, a0, surf) {
  const e = Math.max(0, w - w0);
  const fallT = Math.sqrt(2 * Math.max(0, a0 - surf) / G);
  if (e < fallT) return { alt: a0 - 0.5 * G * e * e, in: false, wa: 0, e, fallT, vy: G * fallT };
  return { alt: surf, in: true, wa: e - fallT, e, fallT, vy: G * fallT };
}

// ---------------------------------------------------------------- poses
// Every pose is static in its own time (time 0): a dead run does not animate the rig, and
// the eye measurement below is keyed on the pose.
const runFrame = (phase, face = {}) => ({ kind: 'run', phase: ((phase % 1) + 1) % 1, time: 0, grounded: true, facing: 1, ...face });
// Arms up, legs together, toes pointed: the cartoon drop.
const dropPose = (face = {}) => ({
  kind: 'jump', vy: 0, time: 0, grounded: true, facing: 1, ...face,
  dance: { hands: [[0.55, -1.0], [0.75, -1.0]], feet: [[-0.06, 0], [0.06, 0]], ankles: [0.25, 0.25] },
});
// The hang: frozen mid-stride over nothing, arms out at his sides.
const hangPose = (face = {}) => ({
  kind: 'jump', vy: 0, time: 0, grounded: true, facing: 1, ...face,
  dance: { hands: [[0.45, 0.35], [-0.45, 0.4]], feet: [[-0.2, -0.02], [0.22, -0.06]], ankles: [0.2, -0.1] },
});
// Holding a sign up on a stick: front hand high, back hand at his side.
const signPose = (face = {}) => ({
  kind: 'jump', vy: 0, time: 0, grounded: true, facing: 1, ...face,
  dance: { hands: [[0.35, -1.0], [-0.3, 0.6]], feet: [[-0.06, 0], [0.06, 0]], ankles: [0.25, 0.25] },
});
// Stiff with the shock of the teeth: arms flung up, legs braced.
const yelpPose = (face = {}) => ({
  kind: 'jump', vy: 0, time: 0, grounded: true, facing: 1, ...face,
  dance: { hands: [[0.85, -1.0], [0.85, -1.0]], feet: [[-0.12, 0], [0.12, 0]], ankles: [0, 0] },
});

// The faces. SURPRISED is today's; GRIM is the rig's flat-mouthed set face (the gulp);
// SHUT borrows the death face's first beat — lids down, the teeth bared — and holds it, so
// it never reaches the spirals; DEAD is the death face proper, on its own clock.
const SURPRISED = { faceSurprised: true, browRaise: true };
const GRIM = { faceGrim: true, browRaise: true };
const SHUT = { deathFace: 0.13 };
const DEAD = (wa) => ({ deathFace: wa });

// ---------------------------------------------------------------- the eyes, measured
// Where his eye whites are, for a pose: the hero drawn twice at 8x, looking hard left and
// hard right; the pixels that change are the pupils, and the near-white flooded out from
// them is the rest of each eye. One mask per eye, in U from his feet, filled with the eye's
// own white — paint it over him and the pupil is gone; a pinprick goes back on top.
const EYES = new Map();
const MS = 8;
function eyesOf(heroId, pose) {
  const key = heroId + JSON.stringify(pose);
  if (EYES.has(key)) return EYES.get(key);
  let eyes = [];
  if (typeof document !== 'undefined') {
    const W = 60 * MS, H = 50 * MS, FX = 30, FY = 40;
    const grab = (gx) => {
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const c = cv.getContext('2d');
      c.setTransform(MS, 0, 0, MS, 0, 0);
      drawToon(c, heroId, { ...pose, gazeAmt: 1, gazeX: gx, gazeY: 0 }, FX, FY, U);
      return c.getImageData(0, 0, W, H).data;
    };
    const a = grab(-0.06), b = grab(0.06);
    const n = W * H;
    const white = (d, k) => d[k + 3] > 200 && d[k] > 205 && d[k + 1] > 205 && d[k + 2] > 205;
    const diff = (k) => Math.abs(a[k] - b[k]) + Math.abs(a[k + 1] - b[k + 1]) + Math.abs(a[k + 2] - b[k + 2]) > 90;
    const seen = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      if (seen[i] || !diff(i * 4)) continue;
      // flood: changed pixels, and white in either render
      const stack = [i]; seen[i] = 1;
      const px = [];
      while (stack.length) {
        const p = stack.pop(); px.push(p);
        const x = p % W, y = (p / W) | 0;
        for (const q of [x > 0 && p - 1, x < W - 1 && p + 1, y > 0 && p - W, y < H - 1 && p + W]) {
          if (q === false || seen[q]) continue;
          const k = q * 4;
          if (diff(k) || white(a, k) || white(b, k)) { seen[q] = 1; stack.push(q); }
        }
      }
      if (px.length < 40 || px.length > 4000) continue;
      let x0 = W, y0 = H, x1 = 0, y1 = 0, sr = 0, sg = 0, sb = 0, sn = 0, sx = 0, sy = 0;
      for (const p of px) {
        const x = p % W, y = (p / W) | 0;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        sx += x; sy += y;
        const k = p * 4;
        for (const d of [a, b]) if (white(d, k)) { sr += d[k]; sg += d[k + 1]; sb += d[k + 2]; sn++; }
      }
      if (!sn) continue;
      const col = `rgb(${Math.round(sr / sn)},${Math.round(sg / sn)},${Math.round(sb / sn)})`;
      // the mask, grown a pixel so no ring of the old pupil survives at the rim
      const mw = x1 - x0 + 3, mh = y1 - y0 + 3;
      const m = document.createElement('canvas'); m.width = mw; m.height = mh;
      const mc = m.getContext('2d');
      mc.fillStyle = col;
      for (const p of px) {
        const x = p % W - x0 + 1, y = ((p / W) | 0) - y0 + 1;
        mc.fillRect(x - 1, y - 1, 3, 3);
      }
      eyes.push({
        mask: m, x: (x0 - 1) / MS - FX, y: (y0 - 1) / MS - FY, w: mw / MS, h: mh / MS,
        cx: sx / px.length / MS - FX, cy: sy / px.length / MS - FY, r: Math.min(x1 - x0, y1 - y0) / MS / 2,
      });
    }
    // NO PUPILS TO MOVE: a face whose eyes are lights (B-33P's visor) does not glance, so
    // nothing changed. Then the eyes are the white blobs high on the figure, and the
    // pinprick is the light itself shrunk to a dot on the visor behind it.
    if (!eyes.length) {
      const seen2 = new Uint8Array(n);
      const headY = (FY - 0.5 * U) * MS;
      for (let i = 0; i < n; i++) {
        if (seen2[i] || !white(a, i * 4) || i / W > headY) continue;
        const stack = [i]; seen2[i] = 1; const px = [];
        while (stack.length) {
          const p = stack.pop(); px.push(p);
          const x = p % W, y = (p / W) | 0;
          for (const q of [x > 0 && p - 1, x < W - 1 && p + 1, y > 0 && p - W, y < H - 1 && p + W]) {
            if (q === false || seen2[q] || !white(a, q * 4)) continue;
            seen2[q] = 1; stack.push(q);
          }
        }
        if (px.length < 60 || px.length > 3000) continue;
        let x0 = W, y0 = H, x1 = 0, y1 = 0, sx = 0, sy = 0;
        for (const p of px) {
          const x = p % W, y = (p / W) | 0;
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); sx += x; sy += y;
        }
        // what is behind the light: the first solid pixel left of it
        const my = Math.round((y0 + y1) / 2);
        const k = (my * W + Math.max(0, x0 - 3)) * 4;
        // a light is set in something dark; a highlight on glass is not
        if (a[k + 3] < 200 || a[k] + a[k + 1] + a[k + 2] > 3 * 90) continue;
        const col = `rgb(${a[k]},${a[k + 1]},${a[k + 2]})`;
        const mw = x1 - x0 + 3, mh = y1 - y0 + 3;
        const m = document.createElement('canvas'); m.width = mw; m.height = mh;
        const mc = m.getContext('2d'); mc.fillStyle = col;
        for (const p of px) mc.fillRect(p % W - x0, ((p / W) | 0) - y0, 3, 3);
        eyes.push({
          led: true, mask: m, x: (x0 - 1) / MS - FX, y: (y0 - 1) / MS - FY, w: mw / MS, h: mh / MS,
          cx: sx / px.length / MS - FX, cy: sy / px.length / MS - FY, r: Math.min(x1 - x0, y1 - y0) / MS / 2,
        });
      }
    }
    // two at most, left to right
    eyes = eyes.sort((p, q) => q.w * q.h - p.w * p.h).slice(0, 2).sort((p, q) => p.cx - q.cx);
  }
  EYES.set(key, eyes);
  return eyes;
}
// The neck, where a look down tilts from: under the eyes, a little behind them.
function neckOf(heroId) {
  const e = eyesOf(heroId, runFrame(0, SURPRISED));
  if (!e.length) return { x: -0.02, y: -0.55 };
  const ex = e.reduce((s, q) => s + q.cx, 0) / e.length, ey = e.reduce((s, q) => s + q.cy, 0) / e.length;
  return { x: ex - 0.06 * U, y: ey + 0.2 * U };
}

// ---------------------------------------------------------------- the hero, drawn
// `o`: { pin, look: [gx, gy] (pinprick offset, U), tilt (rad, + = chin down), jitter (rad),
//        sx, sy (stretch about his feet), soot: [color, amt], ice (amt), clipY (world y he is
//        cut off below: the surface of what swallows him) }.
function hero(c, heroId, x, fy, pose, o = {}) {
  const box = [x - 1.5 * U, fy - 2.3 * U, x + 1.5 * U, fy + 0.4 * U];
  const eyes = o.pin ? eyesOf(heroId, pose) : null;
  // Squeezed shut: the rig's own lids do it, except on a face of lights, which gets a pair
  // of > < chevrons lit where its eyes were.
  const squint = pose.deathFace === SHUT.deathFace
    ? eyesOf(heroId, { ...pose, deathFace: undefined, ...SURPRISED }).filter((e) => e.led) : [];
  const L = layer(41, c, box, (q) => {
    q.save();
    if (o.sx || o.sy) { q.translate(x, fy); q.scale(o.sx || 1, o.sy || 1); q.translate(-x, -fy); }
    drawToon(q, heroId, pose, x, fy, U);
    if (eyes) {
      const [gx, gy] = o.look || [0, 0];
      for (const e of eyes) {
        q.drawImage(e.mask, x + e.x, fy + e.y, e.w, e.h);
        q.fillStyle = INK;
        if (e.led) { q.fillStyle = '#e8fbff'; q.shadowColor = '#7fe4ff'; q.shadowBlur = 1.2 * U / 24 * 2; }
        q.beginPath(); q.arc(x + e.cx + gx * U, fy + e.cy + gy * U, e.led ? Math.max(0.6, e.r * 0.4) : Math.max(0.42, e.r * 0.3), 0, Math.PI * 2); q.fill();
        q.shadowBlur = 0;
      }
    }
    squint.forEach((e, i) => {
      const dir = i === 0 ? 1 : -1, ex = x + e.cx, ey = fy + e.cy, r = Math.max(0.9, e.r * 0.9);
      q.strokeStyle = '#bff3ff'; q.lineWidth = 0.6; q.lineCap = 'round'; q.lineJoin = 'round';
      q.beginPath(); q.moveTo(ex - dir * r, ey - r * 0.8); q.lineTo(ex + dir * r * 0.7, ey); q.lineTo(ex - dir * r, ey + r * 0.8); q.stroke();
    });
    q.restore();
  });
  if (o.soot && o.soot[1] > 0) {
    L.o.save(); L.o.globalCompositeOperation = 'source-atop'; L.o.globalAlpha = o.soot[1];
    L.o.fillStyle = o.soot[0]; L.o.fillRect(0, 0, L.w, L.h); L.o.restore();
  }
  if (o.ice > 0) iceTint(L, o.ice);
  // back to the canvas: the body as it is, the head turned about the neck
  const m = c.getTransform();
  const dev = (wx, wy) => [m.a * wx + m.c * wy + m.e, m.b * wx + m.d * wy + m.f];
  const tilt = (o.tilt || 0) + (o.jitter || 0);
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  if (o.clipY != null) { const [, cy] = dev(0, o.clipY); c.beginPath(); c.rect(0, 0, 1e5, cy); c.clip(); }
  if (!tilt) {
    c.drawImage(L.cv, 0, 0, L.w, L.h, L.x, L.y, L.w, L.h);
  } else {
    const nk = neckOf(heroId);
    const [px, py] = dev(x + nk.x * (o.sx || 1), fy + nk.y * (o.sy || 1));
    c.save(); c.beginPath(); c.rect(0, py - 1, 1e5, 1e5); c.clip();
    c.drawImage(L.cv, 0, 0, L.w, L.h, L.x, L.y, L.w, L.h);
    c.restore();
    c.save(); c.translate(px, py); c.rotate(tilt); c.translate(-px, -py);
    c.beginPath(); c.rect(0, 0, 1e5, py); c.clip();
    c.drawImage(L.cv, 0, 0, L.w, L.h, L.x, L.y, L.w, L.h);
    c.restore();
  }
  c.restore();
}

// ---------------------------------------------------------------- dressing
const SWEAT = '#8fd3ff', SWEAT_INK = '#2f6688';
// A bead of sweat flicked off the back of his head: e seconds since it left.
function sweat(c, heroId, x, fy, e) {
  if (e < 0 || e > 0.45) return;
  const nk = neckOf(heroId);
  const x0 = x + nk.x - 0.12 * U, y0 = fy + nk.y - 0.42 * U;
  const px = x0 - 26 * e, py = y0 - 22 * e + 110 * e * e;
  const ang = Math.atan2(-22 + 220 * e, -26);
  c.save(); c.globalAlpha *= 1 - clamp01((e - 0.32) / 0.13);
  c.translate(px, py); c.rotate(ang - Math.PI / 2);
  c.beginPath(); c.moveTo(0, -1.9); c.quadraticCurveTo(1.1, 0, 0, 1.0); c.quadraticCurveTo(-1.1, 0, 0, -1.9);
  c.fillStyle = SWEAT; c.fill(); c.strokeStyle = SWEAT_INK; c.lineWidth = 0.35; c.stroke();
  c.restore();
}
// Little hand-lettered word: "gulp", "ouch".
function word(c, text, x, y, a = 1, size = 5, col = '#ffffff', rot = -0.12) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a;
  c.translate(x, y); c.rotate(rot);
  c.font = `900 ${size}px "Arial Black", Impact, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.lineJoin = 'round'; c.lineWidth = 1.3; c.strokeStyle = INK; c.strokeText(text, 0, 0);
  c.fillStyle = col; c.fillText(text, 0, 0);
  c.restore();
}
// The double-take: two quick snaps of the head, back-forward, settling.
const takeJitter = (e) => (e < 0 || e > 0.2 ? 0 : 0.2 * Math.sin(e * 62) * (1 - e / 0.2));
// The run's own bursts at the surface (updatePitSink): ten pale bits off teeth, twelve grey
// off a liquid, thrown up and falling back.
function arrivalBurst(c, x, y, e, hard) {
  const n = hard ? 10 : 12, life = hard ? 0.45 : 0.5, sp = hard ? 60 : 70;
  for (let i = 0; i < n; i++) {
    const l = life * (0.6 + 0.6 * hash(i * 4.1 + 3));
    if (e < 0 || e > l) continue;
    const a = -Math.PI * (0.1 + 0.8 * hash(i * 1.3 + 3)), s = sp * (0.4 + 0.6 * hash(i * 2.9 + 3));
    const px = x + Math.cos(a) * s * e, py = y + Math.sin(a) * s * e + 45 * e * e;
    c.fillStyle = hard ? `rgba(185,196,208,${1 - e / l})` : `rgba(138,132,150,${1 - e / l})`;
    c.fillRect(px - 0.75, py - 0.75, 1.5, 1.5);
  }
}
// Speed streaks above a falling body, fading once he stops.
function streaks(c, x, top, bottom, a) {
  if (a <= 0 || bottom - top < 1) return;
  c.save(); c.globalAlpha *= a; c.lineCap = 'round';
  for (const [dx, k] of [[-4.5, 0.75], [0, 1], [4.5, 0.6]]) {
    const y0 = lerp(bottom, top, k);
    c.strokeStyle = INK; c.lineWidth = 1.1; c.beginPath(); c.moveTo(x + dx, y0); c.lineTo(x + dx, bottom); c.stroke();
    c.strokeStyle = '#ffffff'; c.lineWidth = 0.55; c.beginPath(); c.moveTo(x + dx, y0); c.lineTo(x + dx, bottom); c.stroke();
  }
  c.restore();
}
// The little sign on a stick.
function sign(c, x, y, text, a = 1, rot = 0) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a;
  c.translate(x, y); c.rotate(rot);
  c.strokeStyle = INK; c.lineWidth = 0.5;
  c.fillStyle = '#b07a44'; c.fillRect(-0.55, -1, 1.1, 10.5); c.strokeRect(-0.55, -1, 1.1, 10.5);
  c.fillStyle = '#f4ead2'; c.fillRect(-8, -7, 16, 7.5); c.lineWidth = 0.6; c.strokeRect(-8, -7, 16, 7.5);
  c.font = '900 5px "Arial Black", Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#c0282c'; c.fillText(text, 0, -3.1);
  c.restore();
}

// ---------------------------------------------------------------- NOW
function paintNow(c, heroId, s) {
  const d = drop(s.w, 0, 0, s.surf);
  const dx = driftAt(Math.min(s.w, d.fallT), s.carry);
  const alt = d.in && !s.hard ? s.surf - sunk(d.wa, d.vy) : d.alt;
  const x = s.cx + dx, y = s.fy - alt;
  hero(c, heroId, x, y, runFrame(s.phase0, d.in ? DEAD(d.wa) : SURPRISED));
  if (d.in) arrivalBurst(c, x, s.fy - s.surf, d.wa, s.hard);
}

// ---------------------------------------------------------------- A — the face only
// Today's fall to the letter, a living face through it: the double-take at the lip,
// pinprick pupils on the way down, a bead of sweat flicked off as he lands, the gulp, then
// eyes squeezed shut and teeth bared as it takes him — the face he goes under with.
function paintA(c, heroId, s) {
  const d = drop(s.w, 0, 0, s.surf);
  const dx = driftAt(Math.min(s.w, d.fallT), s.carry);
  const alt = d.in && !s.hard ? s.surf - sunk(d.wa, d.vy) : d.alt;
  const x = s.cx + dx, y = s.fy - alt;
  const wa = d.in ? d.wa : -1;
  const GULP = 0.28, SHUT_AT = 0.62;
  let pose, o = {};
  if (s.w < 0.08) { pose = runFrame(s.phase0, SURPRISED); o.jitter = takeJitter(s.w); }
  else if (wa < GULP) { pose = runFrame(s.phase0, SURPRISED); o.pin = true; o.look = [0.01, 0.018]; }
  else if (wa < SHUT_AT) { pose = runFrame(s.phase0, GRIM); o.pin = true; }
  else pose = runFrame(s.phase0, SHUT);
  hero(c, heroId, x, y, pose, o);
  if (d.in) {
    arrivalBurst(c, x, s.fy - s.surf, d.wa, s.hard);
    sweat(c, heroId, x, y, wa - 0.04);
    const g = wa - GULP;
    if (g > 0 && g < SHUT_AT - GULP) word(c, 'gulp', x + 9, y - 1.15 * U, 1 - clamp01((g - 0.24) / 0.1), 4.5);
  }
}

// ---------------------------------------------------------------- B — the coyote hang
// The beats of the hang, in seconds since he died. The whole thing fits the same 2.25s hold:
// a second over the hole, the 0.2s drop, the rest at the bottom.
const H = { RUN: 0.2, LOOK: 0.36, BACK: 0.66, DROP: 1.0 };
// One frame of the hang-and-drop: where he is and how he is drawn. `face` hooks let C–E
// change a beat without restating the clock.
function hangState(heroId, s) {
  const w = s.w;
  const legs = w < H.RUN ? runFrame(s.phase0 + w * 3.2, SURPRISED) : null;   // still running on air
  const dx = driftAt(Math.min(w, H.RUN), s.carry);
  const d = drop(w, H.DROP, 0, s.surf);
  const alt = d.in && !s.hard ? s.surf - sunk(d.wa, d.vy) : d.alt;
  const st = { dx, alt, d, wa: d.in ? d.wa : -1, falling: w >= H.DROP && !d.in, o: {} };
  if (w < H.RUN) { st.pose = legs; st.beat = 'run'; }
  else if (w < H.LOOK) { st.pose = hangPose(SURPRISED); st.o.jitter = takeJitter(w - H.RUN); st.beat = 'take'; }
  else if (w < H.BACK) {
    const q = clamp01((w - H.LOOK) / 0.08) * (1 - clamp01((w - H.BACK + 0.06) / 0.06));
    st.pose = hangPose(SURPRISED); st.o.pin = true; st.o.tilt = 0.5 * easeOut(q); st.o.look = [0.012, 0.03 * q]; st.beat = 'look';
  } else if (w < H.DROP) { st.pose = hangPose(GRIM); st.o.pin = true; st.beat = 'gulp'; }
  else { st.pose = dropPose(SHUT); st.beat = d.in ? 'in' : 'drop'; if (!d.in) { st.o.sx = 0.92; st.o.sy = 1.1; } }
  return st;
}
function paintHang(c, heroId, s, { gulpWord = true } = {}) {
  const st = hangState(heroId, s);
  const x = s.cx + st.dx, y = s.fy - st.alt;
  hero(c, heroId, x, y, st.pose, st.o);
  if (st.beat === 'gulp' && gulpWord) word(c, 'gulp', x + 9, y - 1.15 * U, 1 - clamp01((s.w - H.DROP + 0.08) / 0.08), 4.5);
  sweat(c, heroId, x, y, s.w - H.BACK - 0.03);
  if (st.d.in) arrivalBurst(c, x, s.fy - s.surf, st.wa, s.hard);
  return { ...st, x, y };
}
const paintB = (c, heroId, s) => { paintHang(c, heroId, s); };

// ---------------------------------------------------------------- C — whistle and puff
// B, and the drop gets its cartoon: streaks above him from where he hung, then a dust puff
// out either side where he stops and a little "poof" rising out of the hole past the lip.
function paintC(c, heroId, s) {
  const st = paintHang(c, heroId, s);
  const topY = s.fy - 1.05 * U;                               // the top of his head as he hung
  if (s.w >= H.DROP) {
    const fade = st.d.in ? 1 - clamp01(st.wa / 0.18) : 1;
    streaks(c, st.x, topY, st.y - 1.15 * U, fade);
  }
  if (st.d.in) {
    const e = st.wa, sy = s.fy - s.surf;
    for (const [side, k] of [[-1, 0], [1, 1]]) {
      const q = clamp01(e / 0.45);
      puff(c, st.x + side * (3 + 9 * easeOut(q)), sy - 1 - 2 * q, 1.4 + 2.4 * easeOut(q), 1 - clamp01((e - 0.2) / 0.3));
      void k;
    }
    // the poof, rising out of the hole
    const r = clamp01((e - 0.05) / 0.6);
    if (r > 0 && r < 1) {
      // behind him, off his back, so it never sits on his face
      const py = lerp(sy - 3, s.fy - 9, easeOut(r)), px = st.x - 11 - 3 * r;
      puff(c, px, py, 2 + 2.5 * r, 1 - clamp01((r - 0.55) / 0.45));
      word(c, 'poof', px - 1, py - 5.5, 1 - clamp01((r - 0.5) / 0.4), 4, '#ffffff', 0.08);
    }
  }
}

// ---------------------------------------------------------------- D — a tiny sign
// B, but the gulp is a sign: he pulls a little HELP! out of nowhere and holds it up on a
// stick over his head, and keeps holding it up as he drops — the sign is the last of him to
// go under. On the teeth it turns round to OUCH.
function paintD(c, heroId, s) {
  const w = s.w;
  const holding = w >= H.BACK + 0.04;
  if (!holding) { paintHang(c, heroId, s, { gulpWord: false }); return; }
  const st = hangState(heroId, s);
  const x = s.cx + st.dx, y = s.fy - st.alt;
  const face = w < H.DROP ? GRIM : SHUT;
  const o = { ...st.o, tilt: 0, jitter: 0, pin: w < H.DROP };
  if (st.falling) { o.sx = 0.92; o.sy = 1.1; }
  hero(c, heroId, x, y, signPose(face), o);
  sweat(c, heroId, x, y, w - H.BACK - 0.03);
  if (st.d.in) arrivalBurst(c, x, s.fy - s.surf, st.wa, s.hard);
  const pop = easeOut(clamp01((w - H.BACK - 0.04) / 0.08));
  const flip = s.hard && st.d.in;
  const text = flip && st.wa > 0.06 ? 'OUCH!' : 'HELP!';
  const wob = flip ? 0.25 * Math.sin(st.wa * 40) * Math.exp(-st.wa * 6) : 0.06 * Math.sin(w * 9);
  // the stick in his raised hand, which on these rigs comes up behind his head
  sign(c, x - 0.24 * U, y - 0.9 * U - 9.5 - 3 * (1 - pop), text, pop, wob);
}

// ---------------------------------------------------------------- E — the bottom answers
// B, and what is at the bottom has its say where he stops. A liquid now takes him UNDER —
// he is cut off at its surface rather than drawn over it, as the run does today.
//   lava    flames flick up round him, smoke puffs off the surface, and what is left of him
//           above it goes singed grey (smoky, never blacked out).
//   spikes  he lands, and jolts straight up off them stiff as a board, pinprick-eyed and
//           yelping, an "ouch" burst of sparks under him; then down onto the tips, eyes shut.
//   slush   a splash ring and a crown of drops, and he frosts over pale blue as he goes down.
//   tar     a dull gloop and a dust puff; when he has gone, two slow bubbles come up.
const LAVA_SMOKE = '#77717a';
function paintE(c, heroId, s) {
  const fill = s.fill;
  if (fill === 'spikes' || s.hard) { paintESpikes(c, heroId, s); return; }
  const st = hangState(heroId, s);
  const x = s.cx + st.dx, y = s.fy - st.alt;
  const sy = s.fy - s.surf;            // the surface, world y
  const e = st.wa;
  const o = { ...st.o, clipY: sy + 0.6 };
  if (fill === 'lava' && e >= 0) o.soot = [LAVA_SMOKE, 0.42 * clamp01(e / 0.12)];
  if (fill === 'slush' && e >= 0) o.ice = 0.85 * clamp01(e / 0.25);
  hero(c, heroId, x, y, st.pose, o);
  if (st.beat === 'gulp') word(c, 'gulp', x + 9, y - 1.15 * U, 1 - clamp01((s.w - H.DROP + 0.08) / 0.08), 4.5);
  sweat(c, heroId, x, y, s.w - H.BACK - 0.03);
  if (e < 0) return;
  if (fill === 'lava') {
    // flames licking up round him
    for (const [dx, h0, ph] of [[-5, 9, 0], [5.5, 11, 1.7], [0.5, 7, 3.1]]) {
      const life = clamp01(1 - (e - 0.05) / 0.55);
      if (life <= 0) continue;
      const g = easeOut(clamp01(e / 0.07)) * life;
      const fl = 1 + 0.25 * Math.sin(s.t * 47 + ph) + 0.12 * Math.sin(s.t * 83 + ph);
      flame(c, x + dx, sy + 0.5, 2.0 * g, h0 * g * fl);
    }
    // smoke off the surface, rising
    for (let k = 0; k < 5; k++) {
      const age = e - 0.06 - k * 0.12;
      if (age < 0 || age > 0.7) continue;
      const q = age / 0.7;
      puff(c, x + (k % 2 ? 8 : -8) + (hash(k * 3.1) - 0.5) * 3 - 4 * q, sy - 2 - 14 * q, 1.3 + 2.6 * q, 0.9 * (1 - q), k % 2 === 0);
    }
  } else if (fill === 'slush') {
    // a splash ring on the surface and a crown of drops
    const q = clamp01(e / 0.4);
    if (q < 1) {
      c.save(); c.globalAlpha *= 1 - q;
      c.strokeStyle = '#e8f7ff'; c.lineWidth = 0.9;
      c.beginPath(); c.ellipse(x, sy, 4 + 10 * easeOut(q), 1 + 1.6 * easeOut(q), 0, 0, Math.PI * 2); c.stroke();
      c.restore();
    }
    for (let i = 0; i < 9; i++) {
      const life = 0.4 + 0.15 * hash(i * 2.7);
      if (e > life) continue;
      const side = i % 2 ? 1 : -1, vx = side * (20 + 30 * hash(i * 1.9)), vy = -(50 + 40 * hash(i * 5.3));
      const px = x + side * 3 + vx * e, py = sy + vy * e + 260 * e * e;
      if (py > sy + 1) continue;
      c.fillStyle = '#f4fbff'; c.strokeStyle = '#5b8fb0'; c.lineWidth = 0.3;
      c.beginPath(); c.arc(px, py, 0.9, 0, Math.PI * 2); c.fill(); c.stroke();
    }
  } else {
    // tar (and whatever else is liquid): a dull gloop, a dust puff, and bubbles after
    for (let i = 0; i < 7; i++) {
      const life = 0.32;
      if (e > life) continue;
      const side = i % 2 ? 1 : -1, vx = side * (12 + 18 * hash(i * 1.7)), vy = -(30 + 30 * hash(i * 4.3));
      const px = x + side * 2 + vx * e, py = sy + vy * e + 240 * e * e;
      if (py > sy + 1) continue;
      c.fillStyle = '#2a2430'; c.beginPath(); c.arc(px, py, 0.9 + 0.4 * hash(i), 0, Math.PI * 2); c.fill();
    }
    for (const side of [-1, 1]) {
      const q = clamp01(e / 0.45);
      puff(c, x + side * (3 + 8 * easeOut(q)), sy - 1 - 2 * q, 1.2 + 2.2 * easeOut(q), 0.95 * (1 - clamp01((e - 0.15) / 0.35)));
    }
    for (const [at, dx] of [[0.75, -2], [1.0, 2.5]]) {
      const b = (e - at) / 0.22;
      if (b < 0 || b > 1) continue;
      c.save(); c.globalAlpha *= b < 0.8 ? 1 : 1 - (b - 0.8) / 0.2;
      c.strokeStyle = '#7d7590'; c.lineWidth = 0.5; c.fillStyle = '#3a3242';
      c.beginPath(); c.arc(x + dx, sy - 0.3, 0.6 + 1.3 * b, Math.PI, 0); c.fill(); c.stroke();
      c.restore();
    }
  }
}
function paintESpikes(c, heroId, s) {
  const st = hangState(heroId, s);
  if (st.wa < 0) { paintHang(c, heroId, s); return; }
  const e = st.wa;
  const sy = s.fy - s.surf;
  // the jolt: straight up off the tips and back
  const J = 0.42;
  const up = e < J ? 4 * 7 * (e / J) * (1 - e / J) : 0;
  const x = s.cx + st.dx, y = sy - up;
  if (e < J) hero(c, heroId, x, y, yelpPose(SURPRISED), { pin: true, sx: 0.94, sy: 1.08 });
  else hero(c, heroId, x, y, dropPose(SHUT), {});
  // the "ouch" burst: sparks thrown off the tips under him, and the word
  if (e < 0.3) {
    const a = 1 - e / 0.3;
    lines(c, x, sy - 0.5, 2.5 + 6 * e, 6 + 14 * e, [-Math.PI * 0.92, -Math.PI * 0.72, -Math.PI * 0.5, -Math.PI * 0.28, -Math.PI * 0.08], a, '#ffe680');
    star(c, x - 6 - 10 * e, sy - 3 - 6 * e, 1.6 * a + 0.4, e * 9);
    star(c, x + 6 + 10 * e, sy - 4 - 7 * e, 1.4 * a + 0.4, -e * 9);
  }
  word(c, 'OUCH!', x + 11, y - 1.25 * U - 2 * easeOut(clamp01(e / 0.1)), easeOut(clamp01(e / 0.06)) * (1 - clamp01((e - 0.55) / 0.15)), 5.5, '#ffe680', -0.16);
}

// ---------------------------------------------------------------- the candidates
export const PIT_FALL_NOW = {
  letter: 'NOW', id: 'now', name: 'today’s fall',
  note: 'What the run does: he keeps drifting forward off the lip and drops the 12 px to the material (5 px to a spike bed’s tips) in a fifth of a second, '
    + 'on a frozen run frame wearing the startled face; on arrival the spiral death face starts and a liquid takes him down in front of itself.',
  paint: paintNow,
};
export const PIT_FALL = [
  { letter: 'A', id: 'face', name: 'FACE SEQUENCE ONLY', paint: paintA,
    note: 'Today’s fall exactly, with a living face: a double-take at the lip, pupils gone to pinpricks on the way down, a bead of sweat flicked off as he lands, '
      + '“gulp”, then eyes squeezed shut and teeth bared as it takes him. No spirals — that is the face he goes under with.' },
  { letter: 'B', id: 'coyote', name: 'COYOTE HANG', paint: paintB,
    note: 'Runs a step on thin air, stops dead over the hole, double-takes, tilts his head DOWN at it (side-on, the head turned about the neck, pupils to pinpricks), '
      + 'looks back up with the gulp face and a bead of sweat, then drops — arms up, eyes squeezed, teeth bared — the same short drop. A second over the hole, all inside today’s 2.25s hold.' },
  { letter: 'C', id: 'whistle', name: 'B + STREAK AND POOF', paint: paintC,
    note: 'B, and the drop gets its cartoon: speed streaks above him from where he hung, then a dust puff out either side where he stops and a little “poof” rising out of the hole past the lip. '
      + 'Sound idea: a short slide-whistle down over the 0.2s drop (pitched to the depth, not a long fall), then a soft “poof” instead of today’s plop.' },
  { letter: 'D', id: 'sign', name: 'B + A TINY SIGN', paint: paintD,
    note: 'B, but the gulp is a sign: he pulls a little HELP! out of nowhere and holds it up on a stick over his head as he drops — the last of him to go under. On a spike bed it wobbles round to OUCH!' },
  { letter: 'E', id: 'payoff', name: 'B + THE BOTTOM ANSWERS', paint: paintE,
    note: 'B, and what is at the bottom has its say where he stops. Lava: flames flick up round him, smoke off the surface, what is left of him above it goes singed grey. '
      + 'Spikes: he jolts straight up off them, pinprick-eyed, OUCH! and a burst of sparks, then down onto the tips, eyes shut. Slush: a splash ring and a crown of drops, and he frosts over as he goes. '
      + 'Tar: a dull gloop, a dust puff, two slow bubbles when he has gone. A liquid takes him UNDER — cut off at its surface rather than drawn over it.' },
];

// ---------------------------------------------------------------- the tile
// One cabinet strip per row at in-run size (zoom 2, the obstacle kit's frame, cropped to the
// bottom of the screen so the 19 px of apron the run shows are all in it), two heroes each,
// each running into his own copy of a real gap carved by the pack's own ground() and filled
// by the run's own drawPitFills, at the same moment, on a loop. The world freezes as they
// die, as the run's does. The fail banner the run puts up on arrival is left off.
export const PIT_FALL_ROWS = {
  mixed: [
    { cabinet: 'plumber', stageIndex: 1, camX: 600, label: 'FIELD SERVICE · tar (the default)', heroes: ['lorenzo', 'clara'] },
    { cabinet: 'rhythm', stageIndex: 1, camX: 600, label: 'RHYTHM BANKRUPTCY · spikes', heroes: ['b33p', 'kiko'] },
  ],
  speed: [{ cabinet: 'speed', stageIndex: 1, camX: 600, label: 'SPEED ZONE · lava', heroes: ['lorenzo', 'clara'] },
    { cabinet: 'speed', stageIndex: 2, camX: 1500, label: 'SPEED ZONE 2 · lava', heroes: ['b33p', 'kiko'] }],
  rhythm: [{ cabinet: 'rhythm', stageIndex: 1, camX: 600, label: 'RHYTHM BANKRUPTCY · spikes', heroes: ['lorenzo', 'clara'] },
    { cabinet: 'rhythm', stageIndex: 1, camX: 1400, label: 'RHYTHM BANKRUPTCY · spikes', heroes: ['b33p', 'kiko'] }],
  frost: [{ cabinet: 'frost', stageIndex: 1, camX: 600, label: 'FROST FORTRESS · slush', heroes: ['lorenzo', 'clara'] },
    { cabinet: 'frost', stageIndex: 2, camX: 1400, label: 'FROST FORTRESS 2 · slush', heroes: ['b33p', 'kiko'] }],
  plumber: [{ cabinet: 'plumber', stageIndex: 1, camX: 600, label: 'FIELD SERVICE · tar (the default)', heroes: ['lorenzo', 'clara'] },
    { cabinet: 'plumber', stageIndex: 3, camX: 2200, label: 'FIELD SERVICE 3 · tar', heroes: ['b33p', 'kiko'] }],
};
export const PIT_LANE = Object.freeze({ top: 122, h: 148, gap: 2 });
export const pitLaneHeight = (rows) => rows.length * PIT_LANE.h + (rows.length - 1) * PIT_LANE.gap;
const T_LIP = 0.9;                       // run-in before the lip
export const PIT_FALL_LOOP = T_LIP + PIT_FALL_HOLD + 0.4;
const HERO_XS = [62, 168];               // where each hero is (world units) when he goes in
const GAP_W = 56;
const TOTAL = 6000;
const packs = new Map();
function packFor(cab, row) {
  const key = `${cab.id}:${row.stageIndex ?? 1}`;
  if (!packs.has(key)) packs.set(key, getStylePack(cab.style, { stageIndex: row.stageIndex ?? 1 }));
  return packs.get(key);
}
const shakeAt = (e, amp, dur, t) => {
  if (e < 0 || e > dur) return [0, 0];
  const p = amp * Math.min(1, (dur - e) * 4), n = Math.floor(t * 60);
  return [(hash(n) * 2 - 1) * p, (hash(n + 0.5) * 2 - 1) * p];
};

export function drawPitFallTile(ctx, t, cand, rows) {
  const tl = ((t % PIT_FALL_LOOP) + PIT_FALL_LOOP) % PIT_FALL_LOOP;
  const w = tl - T_LIP;
  const { top, h, gap } = PIT_LANE;
  rows.forEach((row, i) => {
    const cab = CABINET_BY_ID[row.cabinet];
    const pack = packFor(cab, row);
    const fill = cab.pitFill || 'tar';
    const surf = fill === 'none' ? LIQUID_SURF - 30 : surfOf(fill);
    const hard = !!fillSurface(fill).hard;
    const camX = (row.camX ?? 600) + SCROLL * Math.min(tl, T_LIP);
    const y0 = i * (h + gap);
    // the run's shakes: 7 for 0.4s at the lip; 3 (4 on teeth) for ~0.23s on arrival
    const fallT = cand.id === 'now' || cand.id === 'face' ? Math.sqrt(2 * -surf / G) : H.DROP + Math.sqrt(2 * -surf / G);
    const s1 = shakeAt(w, 7, 0.4, t), s2 = shakeAt(w - fallT, hard ? 4 : 3, hard ? 0.24 : 0.22, t);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, y0, 480, h); ctx.clip();
    ctx.translate(s1[0] + s2[0], y0 - top + s1[1] + s2[1]);
    ctx.fillStyle = cab.sky?.[0] || '#000';
    ctx.fillRect(-20, 0, 520, 290);
    const bc = { stageIndex: row.stageIndex ?? 1, progress: camX / TOTAL };
    pack.bg?.(ctx, t, camX, cab, TOTAL, null, 0, bc);
    ctx.save();
    applyWorld(ctx, 2, 0);
    const lipAt = (hx) => (row.camX ?? 600) + SCROLL * T_LIP + hx - 4;
    const obs = row.heroes.map((_, k) => ({ ...makeObstacle('gap', lipAt(HERO_XS[k])), fill }));
    pack.ground?.(ctx, camX, cab, obs, [], t);
    drawPitFills(ctx, camX, cab, obs, t, true, null, 480, cab.groundDark);
    row.heroes.forEach((heroId, k) => {
      const hx = HERO_XS[k];
      if (w < 0) {
        drawToon(ctx, heroId, runFrame(tl * 1.7), hx, GROUND_Y, U);
        return;
      }
      if (w > PIT_FALL_HOLD) return;           // the hole, empty: then the checkpoint
      const lip = hx - 4;
      cand.paint(ctx, heroId, {
        cx: hx, fy: GROUND_Y, w, t, fill, surf, hard,
        carry: Math.min(GAP_W * 0.5, 40, lip + GAP_W - hx - 12),
        phase0: T_LIP * 1.7,
      });
    });
    ctx.restore();
    pack.post?.(ctx, t);
    ctx.restore();
    if (row.label) {
      ctx.save();
      ctx.font = '600 7px ui-monospace, Menlo, monospace';
      ctx.fillStyle = 'rgba(16,14,22,0.72)';
      ctx.fillRect(4, y0 + 4, ctx.measureText(row.label).width + 6, 10);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(row.label, 7, y0 + 11.5);
      ctx.restore();
    }
  });
}
