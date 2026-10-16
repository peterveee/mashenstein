// FALLING INTO A PIT (16 Oct 2026): Peter's picks from the lab's pit-fall-bakeoff
// (src/dev/pit-fall-candidates.js, which draws its tiles with these same painters).
//
//   RAN OFF THE LIP   → E, the coyote hang: a step on thin air, stop dead, a double-take,
//                       LEAN out over the hole and look down (pinprick eyes), the gulp,
//                       then drop arms-up with the eyes squeezed shut.
//   JUMPED IN         → G2: he stops dead in mid-air the frame the run decides he is
//                       dead, one windmill of the arms, the lean and look down, the gulp,
//                       then the drop. No prediction: it hangs where the death is decided.
//   JUST SHORT        → H, fingertips: his front hand catches the far lip, he hangs by
//                       it side-on, looks up at the hand, gulps, and the fingers come off
//                       the edge 3 → 2 → 1 (no scrape marks), then he drops.
//
// And in every one THE BOTTOM ANSWERS where he stops: lava flames and smoke and a grey
// singe (never blacked out), spikes a jolt with sparks then the tips, slush a splash and
// a frost, tar a gloop and bubbles, nothing at all (Neon) a dust puff. A liquid takes him
// UNDER — he is cut off at its surface.
//
// THE RUN OWNS WHERE HE IS (game/run.js updatePitSink / updateLedgeHang: the hang, the
// drop, the sink, the grip and its slips); these painters own only how he is drawn there.
// The words are the run's floaties, said by his head (PIT_WORDS, and OUCH! off teeth),
// not drawn here.
//
// Side-on always, never a turn to camera, and nothing is cut out of him: a look down is
// the rig's own pose.lean (the whole figure about his feet) and its gaze, and the
// pinprick pupils are an overlay measured per hero off his own drawing (eyesOf), so it
// carries to the whole cast.
import { drawToon, toonHandInk } from './toons.js';
import { layer } from './zap.js';
import { HIT_KIT } from './hitPictures.js';

const { U, hash, clamp01, easeOut, puff, star, flame, lines, iceTint } = HIT_KIT;
export const PIT_INK = '#2a2226';
// WHAT HE SAYS on the gulp beat, a different one each time (never the same twice
// running). Peter likes variety: add to it freely.
export const PIT_WORDS = Object.freeze(['GULP', 'UH OH', 'HELP', 'OH NO', 'OOPS', 'YIKES']);

// ---------------------------------------------------------------- the beats
// Seconds since the death was decided. RAN: a fifth of a second still running on air,
// the double-take, the look down, the gulp, the drop at 1.0s. JUMPED: the same without
// the run, a windmill for the double-take, the drop at 0.72s.
export const PIT_HANG_RAN = Object.freeze({ RUN: 0.2, LOOK: 0.36, BACK: 0.66, DROP: 1.0 });
export const PIT_HANG_JUMPED = Object.freeze({ RUN: 0, LOOK: 0.22, BACK: 0.46, DROP: 0.72 });
// FINGERTIPS: the snap onto the lip, the double-take, the look up at the hand, the gulp,
// then the fingers: three until SCRAPE, two until LAST, one until SLIP, and he drops
// 1.5 px with each that goes. RETIMED (Peter, 16 Oct: "let him jump out if there are 3
// or 2 fingers so about .5 seconds total") so the countdown IS the ledge save's window:
// it closes as the second finger goes (LAST = run.js LEDGE_SAVE_T), and the last finger
// holds a beat longer so the let-go reads. Was SNAP .06 LOOK .2 GULP .58 SCRAPE .86 SLIP 1.08.
export const PIT_GRIP = Object.freeze({ SNAP: 0.06, LOOK: 0.12, GULP: 0.26, SCRAPE: 0.3, LAST: 0.5, SLIP: 0.65 });
// Where his feet hang, below the lip: his front hand at the top of his reach, on it.
export const PIT_GRIP_ALT = -(U - 1.5);
// How far ahead of his drawn centre the far wall is while he hangs by it.
export const PIT_GRIP_DX = 6;
// HOW FAR HIS HAND REACHES for the far lip: from his drawn centre to the wall, at the
// moment the run would otherwise declare the pit. A forward-raised arm at HERO_DRAW_H:
// the shoulder ~0.08u ahead of the centre plus the rig's 0.26u arm (toons.js armL) is
// 8 px. At that frame his feet are at lip height, so the lip is always within his
// raised hand's height; the horizontal reach is the whole test.
// 12: the arm's own 8 plus a small lunge (Peter, 16 Oct 2026, after asking for "a little bit
// more latitude for a near miss" and trying 18: "ok do 12"). Within it he LUNGES for the lip —
// run.js stepPitGrip snaps him to the wall over PIT_GRIP.SNAP — so the hand gets there.
export const LEDGE_REACH = 12;
export const pitGripSlip = (w) => (w > PIT_GRIP.SCRAPE ? 1.5 : 0) + (w > PIT_GRIP.LAST ? 1.5 : 0);
export const pitGripFingers = (w) => (w < PIT_GRIP.SCRAPE ? 3 : w < PIT_GRIP.LAST ? 2 : 1);
// THE LEDGE SAVE's mantle (game/run.js): up off the hang and over onto the ground past
// the lip. `pitMantle(q)` is where he is, q 0..1 over PIT_MANTLE_T: `up` 0..1 of the way
// from the hang to the lip (a hair over it mid-climb), `fwd` 0..1 of the way across.
export const PIT_MANTLE_T = 0.22;
export function pitMantle(q) {
  const k = clamp01(q);
  const up = k < 0.6 ? easeOut(k / 0.6) * 1.08 : 1.08 - 0.08 * ((k - 0.6) / 0.4);
  const f = clamp01((k - 0.35) / 0.65);
  return { up, fwd: f * f * (3 - 2 * f) };
}

// ---------------------------------------------------------------- poses
// Every pose is static in its own time (time 0): a dead run does not animate the rig,
// and the eye measurement below is keyed on the pose.
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
// Stiff with the shock of the teeth: arms flung up, legs braced.
const yelpPose = (face = {}) => ({
  kind: 'jump', vy: 0, time: 0, grounded: true, facing: 1, ...face,
  dance: { hands: [[0.85, -1.0], [0.85, -1.0]], feet: [[-0.12, 0], [0.12, 0]], ankles: [0, 0] },
});
// Hanging off the far lip by his front hand.
const gripPose = (face = {}) => ({
  kind: 'jump', vy: 0, time: 0, grounded: true, facing: 1, ...face,
  dance: { hands: [[0.6, -1.0], [0.6, -1.0]], feet: [[-0.04, -0.02], [0.08, 0]], ankles: [0.35, 0.1] },
});
export const PIT_POSES = Object.freeze({ runFrame, dropPose, hangPose, yelpPose, gripPose });

// The faces. SURPRISED is the fall face; GRIM the rig's flat-mouthed set face (the
// gulp); SHUT the death face's first beat — lids down, teeth bared — held, so it never
// reaches the spirals; DEAD the death face proper, on its own clock.
const SURPRISED = { faceSurprised: true, browRaise: true };
const GRIM = { faceGrim: true, browRaise: true };
const SHUT = { deathFace: 0.13 };
const DEAD = (wa) => ({ deathFace: wa });
export const PIT_FACES = Object.freeze({ SURPRISED, GRIM, SHUT, DEAD });

// The double-take: two quick snaps of the whole figure, back-forward, settling.
export const pitTakeJitter = (e) => (e < 0 || e > 0.2 ? 0 : 0.1 * Math.sin(e * 62) * (1 - e / 0.2));

// ---------------------------------------------------------------- the eyes, measured
// Where his eye whites are, for a pose: the hero drawn twice at 8x, looking hard left and
// hard right; the pixels that change are the pupils, and the near-white flooded out from
// them is the rest of each eye. One mask per eye, in U from his feet, filled with the
// eye's own white — paint it over him and the pupil is gone; a pinprick goes back on top.
//
// Keyed on the pose WITHOUT its lean or gaze: a lean is a rotation of the whole figure
// about his feet, so the masks are measured upright once and turned with him when drawn
// (see drawPitHero), and the gaze is what the measurement varies anyway. That keeps the
// cache to a handful of entries per hero — each costs two 8x draws and a flood.
const EYES = new Map();
const MS = 8;
// The legs are left out of the key too: H's dangling feet kick every frame, and where his
// feet are says nothing about where his eyes are.
const eyeKey = (heroId, bare) => heroId + JSON.stringify(bare.dance ? { ...bare, dance: { ...bare.dance, feet: 0, ankles: 0 } } : bare);
export function eyesOf(heroId, pose) {
  const { gazeAmt, gazeX, gazeY, lean, ...bare } = pose;
  void gazeAmt; void gazeX; void gazeY; void lean;
  const key = eyeKey(heroId, bare);
  if (EYES.has(key)) return EYES.get(key);
  let eyes = [];
  if (typeof document !== 'undefined') {
    const W = 60 * MS, H = 50 * MS, FX = 30, FY = 40;
    const grab = (gx) => {
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const c = cv.getContext('2d');
      c.setTransform(MS, 0, 0, MS, 0, 0);
      drawToon(c, heroId, { ...bare, gazeAmt: 1, gazeX: gx, gazeY: 0 }, FX, FY, U);
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
// The back of his neck, where the sweat bead leaves from: under the eyes, a little behind.
function neckOf(heroId) {
  const e = eyesOf(heroId, runFrame(0, SURPRISED));
  if (!e.length) return { x: -0.02, y: -0.55 };
  const ex = e.reduce((s, q) => s + q.cx, 0) / e.length, ey = e.reduce((s, q) => s + q.cy, 0) / e.length;
  return { x: ex - 0.06 * U, y: ey + 0.2 * U };
}
// THE MEASUREMENTS, AHEAD OF TIME. Each one is a few milliseconds, and the pit is the
// one moment a hitch would be seen, so the run asks for them one at a time while he is
// still running (game/run.js). Returns true once everything this hero's fall can ask
// for is in the cache.
const WARM = [
  () => runFrame(0, SURPRISED), () => hangPose(SURPRISED), () => hangPose(GRIM),
  () => gripPose(SURPRISED), () => gripPose(GRIM), () => yelpPose(SURPRISED), () => dropPose(SURPRISED),
];
export function warmPitFall(heroId) {
  for (const make of WARM) {
    const pose = make();
    const { gazeAmt, gazeX, gazeY, lean, ...bare } = pose;
    void gazeAmt; void gazeX; void gazeY; void lean;
    if (EYES.has(eyeKey(heroId, bare))) continue;
    eyesOf(heroId, pose);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------- the hero, drawn
// `o`: { pin, look: [gx, gy] (where the pupils go, U; + y is down), jitter (rad: the
//        double-take, a quick rock of the whole figure), sx, sy (stretch about his feet),
//        soot: [color, amt], ice (amt), clipY (world y he is cut off below: the surface of
//        what swallows him) }.
// Lean is stepped at 0.025 rad so a lean in progress does not redraw a new figure every
// frame for no visible gain.
export function drawPitHero(c, heroId, x, fy, pose0, o = {}) {
  const lean = Math.round(((pose0.lean || 0) + (o.jitter || 0)) / 0.025) * 0.025;
  const pose = { ...pose0, lean: lean || undefined };
  if (o.look && (o.look[0] || o.look[1])) Object.assign(pose, { gazeAmt: 1, gazeX: o.look[0], gazeY: o.look[1] });
  const box = [x - 1.5 * U, fy - 2.3 * U, x + 1.5 * U, fy + 0.4 * U];
  const eyes = o.pin ? eyesOf(heroId, pose) : null;
  // Squeezed shut: the rig's own lids do it, except on a face of lights, which gets a
  // pair of > < chevrons lit where its eyes were.
  const squint = pose.deathFace === SHUT.deathFace
    ? eyesOf(heroId, { ...pose, deathFace: undefined, ...SURPRISED }).filter((e) => e.led) : [];
  const L = layer(41, c, box, (q) => {
    q.save();
    if (o.sx || o.sy) { q.translate(x, fy); q.scale(o.sx || 1, o.sy || 1); q.translate(-x, -fy); }
    drawToon(q, heroId, pose, x, fy, U);
    // the overlays turn with him, about his feet, as the rig's lean does
    if (lean && (eyes?.length || squint.length)) { q.translate(x, fy); q.rotate(lean); q.translate(-x, -fy); }
    if (eyes) {
      const [gx, gy] = o.look || [0, 0];
      for (const e of eyes) {
        q.drawImage(e.mask, x + e.x, fy + e.y, e.w, e.h);
        q.fillStyle = PIT_INK;
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
  // back to the canvas whole, cut off only at the surface of what swallows him
  const m = c.getTransform();
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  if (o.clipY != null) { const cy = m.d * o.clipY + m.f; c.beginPath(); c.rect(0, 0, 1e5, cy); c.clip(); }
  c.drawImage(L.cv, 0, 0, L.w, L.h, L.x, L.y, L.w, L.h);
  c.restore();
}

// ---------------------------------------------------------------- dressing
const SWEAT = '#8fd3ff', SWEAT_INK = '#2f6688';
// A bead of sweat flicked off the back of his head: e seconds since it left.
export function pitSweat(c, heroId, x, fy, e) {
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

// ---------------------------------------------------------------- the bottom answers
// Where he stops, the material has its say. `e` is seconds since he met it (< 0: not
// yet, he is drawn as he is). s = { fill, hard, surfY (world y of the surface), t }.
// A liquid clips him at its surface and tints what is left; a hard fill throws him up
// off the tips from `restY`, where he comes to rest on them. Nothing (fill 'none') is a
// dust puff where the light gives out and he carries on down, uncut.
//   lava    flames flick up round him, smoke off the surface, the rest of him singed grey.
//   spikes  he jolts straight up off them stiff as a board, pinprick-eyed, a burst of
//   gears   sparks under him; then down onto the tips, eyes shut.
//   slush   a splash ring and a crown of drops, and he frosts over pale blue.
//   tar     a dull gloop and a dust puff; when he has gone, two slow bubbles come up.
// `word(text, x, y, alpha, size, colour, rot)`, when given, letters the OUCH! by hand
// (the lab's tiles); the run says it as a floatie instead.
const LAVA_SMOKE = '#77717a';
export const PIT_JOLT_T = 0.42;
export const pitJoltUp = (e) => (e >= 0 && e < PIT_JOLT_T ? 4 * 7 * (e / PIT_JOLT_T) * (1 - e / PIT_JOLT_T) : 0);
export function drawPitBottom(c, heroId, s, { x, y, e, pose, o = {}, restY = null, after = dropPose(SHUT), word = null }) {
  const fill = s.fill;
  const sy = s.surfY;
  if (s.hard) {
    if (e < 0) { drawPitHero(c, heroId, x, y, pose, o); return; }
    const ry = restY ?? sy;
    // the jolt: straight up off the tips and back
    const yy = ry - pitJoltUp(e);
    if (e < PIT_JOLT_T) drawPitHero(c, heroId, x, yy, yelpPose(SURPRISED), { pin: true, sx: 0.94, sy: 1.08 });
    else drawPitHero(c, heroId, x, yy, after, {});
    // the "ouch" burst: sparks thrown off the tips under him
    if (e < 0.3) {
      const a = 1 - e / 0.3;
      lines(c, x, sy - 0.5, 2.5 + 6 * e, 6 + 14 * e, [-Math.PI * 0.92, -Math.PI * 0.72, -Math.PI * 0.5, -Math.PI * 0.28, -Math.PI * 0.08], a, '#ffe680');
      star(c, x - 6 - 10 * e, sy - 3 - 6 * e, 1.6 * a + 0.4, e * 9);
      star(c, x + 6 + 10 * e, sy - 4 - 7 * e, 1.4 * a + 0.4, -e * 9);
    }
    if (word) word('OUCH!', x - 11, yy - 1.25 * U - 2 * easeOut(clamp01(e / 0.1)), easeOut(clamp01(e / 0.06)) * (1 - clamp01((e - 0.55) / 0.15)), 5.5, '#ffe680', -0.16);
    return;
  }
  const none = fill === 'none';
  const oo = none ? { ...o } : { ...o, clipY: sy + 0.6 };
  if (fill === 'lava' && e >= 0) oo.soot = [LAVA_SMOKE, 0.42 * clamp01(e / 0.12)];
  if (fill === 'slush' && e >= 0) oo.ice = 0.85 * clamp01(e / 0.25);
  drawPitHero(c, heroId, x, y, pose, oo);
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
    // smoke off the surface, rising either side of him
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
    // tar (and whatever else is liquid): a dull gloop, a dust puff, and bubbles after.
    // Nothing at all: the dust puff alone.
    if (!none) {
      for (let i = 0; i < 7; i++) {
        const life = 0.32;
        if (e > life) continue;
        const side = i % 2 ? 1 : -1, vx = side * (12 + 18 * hash(i * 1.7)), vy = -(30 + 30 * hash(i * 4.3));
        const px = x + side * 2 + vx * e, py = sy + vy * e + 240 * e * e;
        if (py > sy + 1) continue;
        c.fillStyle = '#2a2430'; c.beginPath(); c.arc(px, py, 0.9 + 0.4 * hash(i), 0, Math.PI * 2); c.fill();
      }
    }
    for (const side of [-1, 1]) {
      const q = clamp01(e / 0.45);
      puff(c, x + side * (3 + 8 * easeOut(q)), sy - 1 - 2 * q, 1.2 + 2.2 * easeOut(q), 0.95 * (1 - clamp01((e - 0.15) / 0.35)));
    }
    if (!none) {
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
}

// ---------------------------------------------------------------- the figure on each beat
// The coyote hang, beat by beat: what he is drawn as `w` seconds after the death on beat
// table T (RAN or JUMPED). `windmill` swaps the double-take for one turn of the arms;
// `arrived` is whether he has met the material yet. { pose, o, beat }.
export function pitHangFigure(T, w, phase0 = 0, windmill = false, arrived = false) {
  const o = {};
  if (w < T.RUN) return { pose: runFrame(phase0 + w * 3.2, SURPRISED), o, beat: 'run' };   // still running on air
  if (w < T.LOOK) {
    if (windmill) {
      // one turn of both arms, opposite each other, as he stops dead
      const th = -Math.PI / 2 + 2 * Math.PI * clamp01((w - T.RUN) / (T.LOOK - T.RUN));
      const pose = { ...hangPose(SURPRISED), dance: { ...hangPose().dance, hands: [[0.7 * Math.cos(th), 0.95 * Math.sin(th)], [0.7 * Math.cos(th + Math.PI), 0.95 * Math.sin(th + Math.PI)]] } };
      return { pose, o, beat: 'take' };
    }
    o.jitter = pitTakeJitter(w - T.RUN);
    return { pose: hangPose(SURPRISED), o, beat: 'take' };
  }
  if (w < T.BACK) {
    const q = clamp01((w - T.LOOK) / 0.08) * (1 - clamp01((w - T.BACK + 0.06) / 0.06));
    // leaning out over the hole to look down into it: the whole figure, about his feet
    o.pin = true; o.look = [0.014, 0.034 * q];
    return { pose: hangPose({ ...SURPRISED, lean: 0.3 * easeOut(q) }), o, beat: 'look' };
  }
  if (w < T.DROP) { o.pin = true; return { pose: hangPose(GRIM), o, beat: 'gulp' }; }
  if (!arrived) { o.sx = 0.92; o.sy = 1.1; }
  return { pose: dropPose(SHUT), o, beat: arrived ? 'in' : 'drop' };
}
// Fingertips, beat by beat, while he still has hold of the lip. { pose, o, beat }.
export function pitGripFigure(w) {
  const o = {};
  let pose, beat;
  const kick = 0.05 * Math.sin(w * 28);
  if (w < PIT_GRIP.SNAP) { pose = gripPose(SURPRISED); beat = 'snap'; }
  else if (w < PIT_GRIP.LOOK) { pose = gripPose(SURPRISED); o.jitter = pitTakeJitter(w - PIT_GRIP.SNAP); beat = 'take'; }
  else if (w < PIT_GRIP.GULP) {
    const q = clamp01((w - PIT_GRIP.LOOK) / 0.05) * (1 - clamp01((w - PIT_GRIP.GULP + 0.04) / 0.04));
    pose = gripPose(SURPRISED); o.pin = true; o.look = [0.022, -0.034 * q];   // up at the hand: eyes only
    beat = 'look';
  } else { pose = gripPose(GRIM); o.pin = true; beat = 'gulp'; }
  if (w >= PIT_GRIP.SNAP) pose = { ...pose, dance: { ...pose.dance, feet: [[-0.04 + kick, -0.02], [0.08 - kick, 0]] } };
  return { pose, o, beat };
}

// The colour of his front hand at the top of the grip, read off his own drawing (skin,
// glove or metal), for the fingertips curled over the lip.
const HAND = new Map();
function handColour(heroId) {
  if (HAND.has(heroId)) return HAND.get(heroId);
  let col = '#f0c8a0';
  if (typeof document !== 'undefined') {
    // drawn with the hands up and with them down: what only the first has is his arms,
    // and the top of that is the hand
    const W = 60 * MS, Hh = 50 * MS, FX = 30, FY = 40;
    const grab = (pose) => {
      const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
      const q = cv.getContext('2d'); q.setTransform(MS, 0, 0, MS, 0, 0);
      drawToon(q, heroId, pose, FX, FY, U);
      return q.getImageData(0, 0, W, Hh).data;
    };
    const up = grab(gripPose());
    const down = grab({ ...gripPose(), dance: { ...gripPose().dance, hands: [[0.15, 0.95], [0.15, 0.95]] } });
    const px = [];
    let top = Hh;
    for (let y = 0; y < Hh; y++) for (let x = FX * MS; x < W; x++) {
      const k = (y * W + x) * 4;
      if (up[k + 3] < 250 || down[k + 3] > 10) continue;
      if (up[k] + up[k + 1] + up[k + 2] < 200) continue;
      px.push([y, k]); top = Math.min(top, y);
    }
    const count = new Map();
    for (const [y, k] of px) {
      if (y > top + 0.12 * U * MS) continue;
      const key = `${up[k] >> 3},${up[k + 1] >> 3},${up[k + 2] >> 3}`;
      count.set(key, (count.get(key) || 0) + 1);
    }
    let best = null, n = 0;
    for (const [k, v] of count) if (v > n) { n = v; best = k; }
    if (best) col = `rgb(${best.split(',').map((v) => (+v << 3) + 4).join(',')})`;
  }
  HAND.set(heroId, col);
  return col;
}
// The fingers over the lip at `wall`, on the groundline `fy`: three, two, one.
export function drawPitFingertips(c, heroId, wall, fy, n) {
  // In the hand's own ink, as toons.js draws a hand (Peter, 16 Oct: "the finger outline is
  // thick compared to his body/face"): the soft 32% contour, stroked UNDER the fill so only
  // its outer half shows — a hair, as round the rest of him, not a black ring.
  // Live from the rig (toons.js toonHandInk) so it follows the ink scale, the phone's
  // ink boost and any change to the hands' ring.
  const ink = toonHandInk(U);
  c.save(); c.fillStyle = handColour(heroId); c.strokeStyle = ink.color; c.lineWidth = ink.w * 2;
  c.lineJoin = 'round';
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const x = wall + 0.5 + i * 1.15;
    c.moveTo(x + 0.75, fy - 0.2); c.ellipse(x, fy - 0.2, 0.75, 1.0, 0, 0, Math.PI * 2);
  }
  c.stroke(); c.fill();
  c.restore();
}

// ---------------------------------------------------------------- the run's entry point
// The whole picture for one frame, at the place the run has put him: feet at (x, fy).
// s = { kind: 'E' | 'G2' | 'H', w (seconds since it was decided), e (seconds since he met
//       the material, < 0 not yet), fill, hard, surfY (world y of the surface), lipY (the
//       groundline), wall (x of the far wall, for H's fingers), t (a running clock),
//       phase0 (the run frame he went in on), mantle (0..1 while a ledge save climbs out,
//       else null) }.
export function drawPitFall(c, heroId, x, fy, s) {
  if (s.mantle != null) { drawPitMantle(c, heroId, x, fy, s); return; }
  if (s.kind === 'H') {
    const holding = s.e < 0;
    const fig = holding ? pitGripFigure(s.w) : { pose: dropPose(SHUT), o: {} };
    drawPitBottom(c, heroId, s, { x, y: fy, e: s.e, pose: fig.pose, o: fig.o, restY: fy });
    if (holding) drawPitFingertips(c, heroId, s.wall, s.lipY, pitGripFingers(s.w));
    pitSweat(c, heroId, x, fy, s.w - PIT_GRIP.GULP - 0.02);
    return;
  }
  const jumped = s.kind === 'G2';
  const T = jumped ? PIT_HANG_JUMPED : PIT_HANG_RAN;
  const fig = pitHangFigure(T, s.w, s.phase0 || 0, jumped, s.e >= 0);
  drawPitBottom(c, heroId, s, { x, y: fy, e: s.e, pose: fig.pose, o: fig.o, restY: fy });
  pitSweat(c, heroId, x, fy, s.w - T.BACK - (jumped ? 0.02 : 0.03));
}
// THE LEDGE SAVE, drawn: still on the lip by the fingers for the first part of the pull,
// then the knees come up as he rolls over it, then he is running.
function drawPitMantle(c, heroId, x, fy, s) {
  const q = s.mantle;
  if (q < 0.45) {
    // No fingers left on the lip: his hands go with him the frame he pulls (Peter,
    // 16 Oct — the lip's fingertips lingering into the climb "looks odd").
    drawPitHero(c, heroId, x, fy, gripPose(GRIM), { sy: 1 - 0.12 * (q / 0.45) });
  } else if (q < 0.85) {
    drawPitHero(c, heroId, x, fy, { kind: 'jump', vy: 120, time: 0, grounded: false, facing: 1, ...SURPRISED }, {});
  } else {
    drawPitHero(c, heroId, x, fy, runFrame(s.phase0 || 0), {});
  }
}
