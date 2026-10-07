// LORENZO'S FISH — the ones that swim through his flood. 5 Oct 2026.
//
// From the fish bake-off (lab gallery `fish-bakeoff`, `fish-styles-bakeoff`): Peter liked all
// eight — "cut paper for the fish - i want to use all of them randomly.. perhaps even 2 at a
// time or more". So these are all of them but the FISHBOWL, which he took out again ("get rid of
// the one in the fish bowl"), each drawn in the Plumber world's CUT PAPER (no ink, every piece a
// cut-out laid on the last, with its shadow and the paper's grain), and the club sends them
// across at random, a few at a time (club.js fishOn).
//
// Each fish is paint(ctx, L, { t, beat, wag, dive }): facing right, centred on the origin, `L`
// from nose to tail; `t` seconds, `beat` the song's beat (they all keep time), `wag` its tail
// (-1..1), `dive` 0 swimming to 1 nose-down into the floor. `size` is its length in hero
// heights. drawPaperFish draws one in cut paper; the painters draw the cast's cel look, which
// the paper look is made from (src/dev/fish-styles.js shows them in other looks).

const TAU = Math.PI * 2;
const INK = '#1b1428';
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ink = (ctx, L, w = 0.035) => {
  ctx.lineWidth = Math.max(0.8, L * w);
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
};
const ellipse = (ctx, x, y, rx, ry, rot = 0) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); };
const fillStroke = (ctx, fill) => { ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); };
/**
 * A body's outline. When the look says how wide (drawPaperFish's `contour`) it is the cast's
 * contour, that width in the cast's whisper-light ink (toons.js OUTLINE, 0.32); else the ink's.
 */
const edge = (ctx, w) => {
  if (w == null) { ctx.stroke(); return; }
  ctx.save(); ctx.lineWidth = w; ctx.strokeStyle = 'rgba(26,16,40,0.32)'; ctx.stroke(); ctx.restore();
};

/** An eye: white, a pupil at `look` (fractions of the radius), a glint; `lid` 0–1 shuts it from the top. */
function eye(ctx, x, y, r, { look = [0.25, 0], pupil = 0.5, lid = 0, lidCol = '#000', white = '#ffffff' } = {}) {
  ellipse(ctx, x, y, r, r); fillStroke(ctx, white);
  const px = x + look[0] * r * (1 - pupil), py = y + look[1] * r * (1 - pupil);
  ctx.fillStyle = INK; ellipse(ctx, px, py, r * pupil, r * pupil); ctx.fill();
  ctx.fillStyle = '#ffffff'; ellipse(ctx, px - r * pupil * 0.35, py - r * pupil * 0.4, r * pupil * 0.32, r * pupil * 0.32); ctx.fill();
  if (lid > 0) {
    ctx.save();
    ellipse(ctx, x, y, r, r); ctx.clip();
    ctx.fillStyle = lidCol; ctx.fillRect(x - r, y - r, 2 * r, 2 * r * lid);
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(x - r * 0.98, y - r + 2 * r * lid); ctx.lineTo(x + r * 0.98, y - r + 2 * r * lid); ctx.stroke();
    ellipse(ctx, x, y, r, r); ctx.stroke();
  }
}

/** A fan tail at `x` (its root), `h` tall, `len` long, swung by `wag`; forked when `fork`. */
function tail(ctx, x, h, len, wag, fill, { fork = 0.35 } = {}) {
  const sw = wag * h * 0.35;
  ctx.beginPath();
  ctx.moveTo(x, -h * 0.18);
  ctx.quadraticCurveTo(x - len * 0.5, -h * 0.25 + sw * 0.5, x - len, -h * 0.5 + sw);
  ctx.quadraticCurveTo(x - len * (1 - fork), sw * 0.6, x - len, h * 0.5 + sw);
  ctx.quadraticCurveTo(x - len * 0.5, h * 0.25 + sw * 0.5, x, h * 0.18);
  ctx.closePath();
  fillStroke(ctx, fill);
}

/** Bubbles let go on the beat from (x, y), rising and wobbling; `n` of them a beat. */
function bubbles(ctx, x, y, L, beat, n = 2) {
  ctx.save();
  ctx.strokeStyle = 'rgba(210,250,255,0.9)';
  ctx.lineWidth = Math.max(0.6, L * 0.015);
  for (let b = 0; b < 3; b++) {
    for (let k = 0; k < n; k++) {
      const age = (((beat % 1) + 1) % 1) + b - k * 0.18;
      if (age < 0 || age > 2.4) continue;
      const r = L * (0.025 + 0.012 * ((k + b) % 3));
      ctx.globalAlpha = Math.min(1, (2.4 - age) * 1.2);
      ellipse(ctx, x + Math.sin(age * 5 + k) * L * 0.03 + k * L * 0.02, y - age * L * 0.28, r, r);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * The party shark's baby, from the neck up, drawn over the shark's body: no teeth yet, a big eye
 * and a rosy cheek, a bow on its head (`hat`, babyBow unless a bake-off passes another:
 * src/dev/baby-shark-hats.js), and a dummy in its mouth that it sucks twice a beat.
 */
function babyShark(ctx, L, { beat, wag, blink, hat = babyBow }) {
  for (const x of [-0.06, -0.01]) { ctx.beginPath(); ctx.moveTo(L * x, -L * 0.05); ctx.quadraticCurveTo(L * (x - 0.02), L * 0.0, L * x, L * 0.05); ctx.stroke(); }
  ink(ctx, L);
  hat(ctx, L, { beat, wag });
  ink(ctx, L);
  babyFace(ctx, L, { beat, wag, blink });
}

/**
 * The bow it wears: big and pink, stuck on top of its head, popping on the beat (Peter, 6 Oct
 * 2026: "i like the bow" — from the bake-off, src/dev/baby-shark-hats.js).
 */
export function babyBow(ctx, L, { beat }) {
  const pop = 1 + 0.1 * Math.exp(-(((beat % 1) + 1) % 1) * 6);
  ctx.save(); ctx.translate(L * 0.24, -L * 0.2); ctx.rotate(-0.15); ctx.scale(pop, pop);
  for (const s of [-1, 1]) {   // the tails
    ctx.beginPath(); ctx.moveTo(-L * 0.015, 0); ctx.lineTo(s * L * 0.05, L * 0.08); ctx.lineTo(s * L * 0.07, L * 0.06); ctx.lineTo(L * 0.015, 0); ctx.closePath();
    fillStroke(ctx, '#ff5d9a');
  }
  for (const s of [-1, 1]) {   // the loops
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(s * L * 0.05, -L * 0.11, s * L * 0.15, -L * 0.11, s * L * 0.14, -L * 0.02);
    ctx.bezierCurveTo(s * L * 0.14, L * 0.045, s * L * 0.05, L * 0.035, 0, 0);
    fillStroke(ctx, '#ff5d9a');
    ellipse(ctx, s * L * 0.085, -L * 0.04, L * 0.025, L * 0.014, s * -0.5); ctx.fillStyle = '#ffb3cf'; ctx.fill();
  }
  ellipse(ctx, 0, -L * 0.005, L * 0.035, L * 0.035); fillStroke(ctx, '#ff2f7d');
  ctx.restore();
}

/** The baby's face, and the fin under it. */
function babyFace(ctx, L, { beat, wag, blink }) {
  // a big eye, a rosy cheek
  if (blink) { ctx.beginPath(); ctx.moveTo(L * 0.28, -L * 0.06); ctx.quadraticCurveTo(L * 0.33, -L * 0.02, L * 0.38, -L * 0.06); ctx.stroke(); }
  else eye(ctx, L * 0.33, -L * 0.06, L * 0.07, { look: [0.35, 0.15], pupil: 0.62 });
  ellipse(ctx, L * 0.31, L * 0.045, L * 0.04, L * 0.024); ctx.fillStyle = '#ff9ec0'; ctx.fill();
  // the dummy, sucked in twice a beat: in the mouth, which is under the snout, so it points down
  // and forward off the jaw (Peter, 6 Oct 2026: "aiming downward rather than being horizontal
  // since the mouth is down") — the shield against the jaw and the ring hanging off it
  const suck = L * 0.014 * (0.5 + 0.5 * Math.cos(beat * TAU * 2));
  ctx.save(); ctx.translate(L * 0.395, L * 0.085); ctx.scale(1, 1 / BABY_CHUB); ctx.rotate(0.95); ctx.translate(-suck, 0);
  ellipse(ctx, L * 0.012, 0, L * 0.03, L * 0.072); fillStroke(ctx, '#9ad8ff');
  ellipse(ctx, L * 0.026, 0, L * 0.016, L * 0.016); fillStroke(ctx, '#6fc0f0');
  ctx.beginPath(); ctx.arc(L * 0.085, 0, L * 0.055, 0, TAU); ctx.moveTo(L * 0.117, 0); ctx.arc(L * 0.085, 0, L * 0.032, 0, TAU, true);
  fillStroke(ctx, '#ffd23f');
  ctx.restore();
  ctx.beginPath(); ctx.moveTo(L * 0.0, L * 0.12); ctx.quadraticCurveTo(L * 0.02, L * 0.22 + wag * L * 0.02, -L * 0.1, L * 0.24); ctx.lineTo(-L * 0.06, L * 0.14); ctx.closePath(); fillStroke(ctx, '#6f8aa8');
}

/** How much chubbier the baby is than its parent, top to bottom. */
const BABY_CHUB = 1.12;

/** How puffed-up a fish is on the beat: in hard on every other downbeat, letting go slowly. */
const puffOn = (beat) => {
  const ph = ((beat % 2) + 2) % 2;
  return ph < 0.12 ? ph / 0.12 : clamp01(1 - (ph - 0.12) / 1.3);
};

/**
 * The angler's body, its jaw, its teeth and its tongue (ANGLER's `jaws`, unless a bake-off passes
 * another: src/dev/angler-mouth-candidates.js). `drop(x)` is how far the chomping jaw has dropped
 * at `x` (in L) forward of its hinge at the back of the mouth.
 *
 * Side on, with no mouth to see into (Peter, 7 Oct 2026: "not have a mouth area and just show
 * teeth and tongue side on"): the head comes down to its upper lip, the lower jaw is a cut-out of
 * its own hinged at the corner, and the teeth cross between them, down from the lip above and up
 * from the jaw below. The tongue is a little one at the back, by the corner; in front of it the
 * gap between the lips is open water. Until then (the bake-off's C, 6 Oct) the mouth was a hole
 * cut out of the face with the dark of the throat behind it, and for a day the tongue filled the
 * whole gap ("seems to stretch out to be his full mouth").
 */
export function anglerJaws(ctx, L, { drop }) {
  // the lips, `u` 0 at the front to 1 at the corner: the upper from the snout, the lower from the
  // jaw's tip, which juts a little past it, both bowing down on the way back
  const bez = (a, c, b, u) => (1 - u) * (1 - u) * a + 2 * u * (1 - u) * c + u * u * b;
  const upper = (u) => [L * bez(0.44, 0.24, 0.02, u), L * bez(-0.04, 0.07, 0.07, u)];
  const lower = (u) => {
    const x = bez(0.5, 0.25, 0.02, u);
    return [L * x, L * bez(0.06, 0.12, 0.09, u) + drop(Math.max(0, x))];
  };
  const along = (lip, from, to) => {
    for (let k = 0; k <= 8; k++) { const [x, y] = lip(from + (to - from) * k / 8); ctx.lineTo(x, y); }
  };
  // the tongue: a little one, lying in the back of the jaw by the corner of the mouth and going
  // down with it, its back tucked under the head and its bottom under the jaw; in front of it
  // there is nothing between the lips but what is behind the fish (Peter, 7 Oct 2026: "tongue is
  // just in the back when teeth open there is nothing in the background")
  ctx.beginPath();
  ctx.ellipse(L * 0.085, L * 0.095 + drop(0.085), L * 0.08, L * 0.032, -0.12, 0, Math.PI * 2);
  fillStroke(ctx, '#d0607f');
  ink(ctx, L);
  // the body, the head most of it, down to the upper lip and back to the corner of the mouth
  ctx.beginPath();
  ctx.moveTo(-L * 0.32, 0);
  ctx.quadraticCurveTo(-L * 0.25, -L * 0.3, L * 0.12, -L * 0.3);
  ctx.quadraticCurveTo(L * 0.4, -L * 0.28, L * 0.44, -L * 0.04);
  along(upper, 0, 1);
  ctx.quadraticCurveTo(L * 0.0, L * 0.2, -L * 0.1, L * 0.24);
  ctx.quadraticCurveTo(-L * 0.3, L * 0.16, -L * 0.32, 0);
  ctx.closePath(); fillStroke(ctx, '#3a2f5a');
  // the lower jaw, a shade paler, hinged at the corner: out along its lip to the tip and back under the chin
  ctx.beginPath();
  ctx.moveTo(...lower(1));
  along(lower, 1, 0);
  ctx.quadraticCurveTo(L * 0.34, L * 0.3 + drop(0.34), L * 0.08, L * 0.27 + drop(0.08));
  ctx.quadraticCurveTo(-L * 0.04, L * 0.2, L * 0.02, L * 0.09);
  ctx.closePath(); fillStroke(ctx, '#45386b');
  // its snaggle teeth over the tongue: down from the lip above, up from the jaw below, crossing,
  // every one a different length
  ctx.fillStyle = '#fffbe8';
  ctx.lineWidth = Math.max(0.5, L * 0.012);
  const tooth = (bx, by, dir, h, w) => {
    ctx.beginPath(); ctx.moveTo(bx - L * w, by); ctx.lineTo(bx + L * 0.004 * dir, by + dir * L * h); ctx.lineTo(bx + L * w, by); ctx.closePath(); ctx.fill(); ctx.stroke();
  };
  for (const [u, h] of [[0.1, 0.05], [0.27, 0.09], [0.45, 0.06], [0.62, 0.085], [0.8, 0.045]]) {
    const [bx, by] = upper(u); tooth(bx, by - L * 0.01, 1, h + 0.01, 0.024);
  }
  for (const [u, h] of [[0.04, 0.065], [0.2, 0.1], [0.37, 0.07], [0.54, 0.09], [0.72, 0.05]]) {
    const [bx, by] = lower(u); tooth(bx, by + L * 0.01, -1, h + 0.01, 0.026);
  }
}

export const FISHES = Object.freeze([
  {
    letter: 'A', name: 'GOOGLY', size: 0.55,
    description: 'A chubby orange fish with one enormous googly eye whose pupil rattles about as it swims, big pink lips going BLUB on the beat, a flapping little fin.',
    paint(ctx, L, { t, beat, wag, contour }) {
      ink(ctx, L);
      const blub = Math.max(0, Math.sin((((beat % 1) + 1) % 1) * Math.PI));
      tail(ctx, -L * 0.28, L * 0.42, L * 0.22, wag, '#ff7a2e');
      // a frilly fin along the top
      ctx.beginPath(); ctx.moveTo(-L * 0.2, -L * 0.22);
      for (let k = 0; k <= 4; k++) ctx.quadraticCurveTo(-L * 0.17 + k * L * 0.07, -L * (0.4 - 0.03 * (k % 2)), -L * 0.14 + k * L * 0.07, -L * 0.27 + k * L * 0.008);
      ctx.closePath(); fillStroke(ctx, '#ff9a55');
      // the body, belly paler
      ellipse(ctx, L * 0.03, 0, L * 0.34, L * 0.29); ctx.fillStyle = '#ff8c2e'; ctx.fill();
      ctx.save(); ellipse(ctx, L * 0.03, 0, L * 0.34, L * 0.29); ctx.clip();
      ctx.fillStyle = '#ffc27a'; ellipse(ctx, L * 0.06, L * 0.2, L * 0.3, L * 0.16); ctx.fill();
      ctx.restore();
      ellipse(ctx, L * 0.03, 0, L * 0.34, L * 0.29); edge(ctx, contour);
      // the little fin, flapping fast
      ellipse(ctx, -L * 0.03, L * 0.08, L * 0.07, L * 0.04, 0.6 + Math.sin(t * 18) * 0.6); fillStroke(ctx, '#ff9a55');
      // the lips, open on the beat
      ellipse(ctx, L * 0.36, L * 0.07, L * 0.06, L * (0.04 + 0.05 * blub)); fillStroke(ctx, '#ff5f8a');
      ctx.fillStyle = '#5a1030'; ellipse(ctx, L * 0.37, L * 0.07, L * 0.025, L * (0.006 + 0.035 * blub)); ctx.fill();
      // THE EYE, its pupil rattling
      eye(ctx, L * 0.15, -L * 0.08, L * 0.15, { look: [0.6 * Math.sin(t * 7.3) + 0.2, 0.6 * Math.sin(t * 5.1 + 1)], pupil: 0.42 });
      bubbles(ctx, L * 0.42, L * 0.02, L, beat, 2);
    },
  },
  {
    // the slow one: it takes `pace` times as long as the rest to cross the room (Peter, 6 Oct
    // 2026: "could one of the fish swim slower than the rest" ... "horizontally")
    letter: 'B', name: 'PUFFER', size: 0.5, pace: 1.8,
    description: 'A worried pufferfish that blows up into a spiky ball on every other downbeat and slowly lets the air out again.',
    paint(ctx, L, { beat, wag, contour }) {
      ink(ctx, L);
      const p = puffOn(beat);
      const R = L * (0.22 + 0.11 * p);
      tail(ctx, -R * 0.92, L * 0.24, L * 0.14, wag, '#d9c040');
      // the spikes, standing up as it puffs
      ctx.save(); ctx.lineWidth = Math.max(0.8, L * 0.025);
      for (let k = 0; k < 18; k++) {
        const a = (k / 18) * TAU + 0.1;
        if (Math.cos(a) < -0.8) continue;   // none in the tail's way
        const s = L * (0.025 + 0.07 * p);
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92); ctx.lineTo(Math.cos(a) * (R + s), Math.sin(a) * (R + s)); ctx.stroke();
      }
      ctx.restore();
      ellipse(ctx, 0, 0, R, R * (0.86 + 0.14 * p)); ctx.fillStyle = '#f2d54a'; ctx.fill();
      ctx.save(); ellipse(ctx, 0, 0, R, R * (0.86 + 0.14 * p)); ctx.clip();
      ctx.fillStyle = '#fff6d0'; ellipse(ctx, R * 0.1, R * 0.62, R * 0.95, R * 0.5); ctx.fill();
      ctx.fillStyle = '#b98a2a';
      for (const [sx, sy] of [[-0.45, -0.35], [-0.1, -0.55], [-0.55, 0.05], [0.15, -0.3], [-0.3, -0.05]]) { ellipse(ctx, R * sx, R * sy, R * 0.08, R * 0.07); ctx.fill(); }
      ctx.restore();
      ellipse(ctx, 0, 0, R, R * (0.86 + 0.14 * p)); edge(ctx, contour);
      // fins, and the worried face
      ellipse(ctx, -R * 0.15, R * 0.3, L * 0.06, L * 0.035, 0.5 + 0.4 * Math.sin(beat * 9)); fillStroke(ctx, '#e8c23a');
      eye(ctx, R * 0.42, -R * 0.32, L * 0.075, { look: [0.4, -0.3], pupil: 0.5 });
      ctx.beginPath(); ctx.moveTo(R * 0.25, -R * 0.62); ctx.lineTo(R * 0.6, -R * 0.52); ctx.stroke();   // the brow, up in the middle
      ellipse(ctx, R * 0.93, R * 0.12, L * 0.03, L * (0.02 + 0.015 * (1 - p))); fillStroke(ctx, '#8a3a2a');
    },
  },
  {
    letter: 'C', name: 'SHADES', size: 0.55,
    description: 'The club fish: sunglasses, a yellow quiff of a fin, a smirk and a disco sheen, bobbing to the beat as it cruises across.',
    paint(ctx, L, { t, beat, wag, contour }) {
      ink(ctx, L);
      ctx.save();
      ctx.translate(0, -Math.abs(Math.sin(beat * Math.PI)) * L * 0.06);
      tail(ctx, -L * 0.32, L * 0.38, L * 0.2, wag, '#6b5bff', { fork: 0.55 });
      // the quiff
      ctx.beginPath(); ctx.moveTo(-L * 0.2, -L * 0.16);
      ctx.quadraticCurveTo(-L * 0.05, -L * 0.48, L * 0.18, -L * 0.3 + Math.sin(t * 6) * L * 0.02);
      ctx.quadraticCurveTo(L * 0.05, -L * 0.3, L * 0.08, -L * 0.17); ctx.closePath(); fillStroke(ctx, '#ffd23f');
      const g = ctx.createLinearGradient(-L * 0.35, 0, L * 0.4, 0);
      g.addColorStop(0, '#6b5bff'); g.addColorStop(1, '#ff4fa3');
      ellipse(ctx, L * 0.03, 0, L * 0.4, L * 0.2); ctx.fillStyle = g; ctx.fill();
      // the sheen: a glint running down the scales on the beat
      ctx.save(); ellipse(ctx, L * 0.03, 0, L * 0.4, L * 0.2); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      for (let k = 0; k < 7; k++) for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.arc(-L * 0.28 + k * L * 0.09, -L * 0.1 + j * L * 0.1 + (k % 2) * L * 0.05, L * 0.045, -1.2, 1.2); ctx.fill(); }
      const sweep = (((beat % 1) + 1) % 1) * 1.4 - 0.2;
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(L * (-0.4 + sweep * 0.8), -L * 0.3, L * 0.06, L * 0.6);
      ctx.restore();
      ellipse(ctx, L * 0.03, 0, L * 0.4, L * 0.2); edge(ctx, contour);
      // the sunglasses, and the smirk
      ctx.fillStyle = '#0b0b14';
      ctx.beginPath(); ctx.moveTo(L * 0.06, -L * 0.1); ctx.lineTo(L * 0.34, -L * 0.1); ctx.lineTo(L * 0.31, -L * 0.01); ctx.quadraticCurveTo(L * 0.2, L * 0.02, L * 0.1, -L * 0.02); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(L * 0.06, -L * 0.09); ctx.lineTo(-L * 0.06, -L * 0.07); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = Math.max(0.6, L * 0.018);
      ctx.beginPath(); ctx.moveTo(L * 0.14, -L * 0.075); ctx.lineTo(L * 0.2, -L * 0.075); ctx.stroke();
      ink(ctx, L);
      ctx.beginPath(); ctx.moveTo(L * 0.3, L * 0.07); ctx.quadraticCurveTo(L * 0.37, L * 0.08, L * 0.42, L * 0.02); ctx.stroke();
      // the side fin
      ellipse(ctx, -L * 0.02, L * 0.08, L * 0.08, L * 0.04, 0.5 + wag * 0.4); fillStroke(ctx, '#ffd23f');
      ctx.restore();
    },
  },
  {
    letter: 'D', name: 'SNORKEL', size: 0.55,
    description: 'Dressed for the flood: a diving mask with its eye huge behind the glass, an orange snorkel puffing bubbles on the beat.',
    paint(ctx, L, { beat, wag, contour }) {
      ink(ctx, L);
      tail(ctx, -L * 0.3, L * 0.36, L * 0.2, wag, '#22a59a');
      ellipse(ctx, L * 0.02, 0, L * 0.38, L * 0.24); ctx.fillStyle = '#3fd0c0'; ctx.fill();
      ctx.save(); ellipse(ctx, L * 0.02, 0, L * 0.38, L * 0.24); ctx.clip();
      ctx.fillStyle = '#2bb3a6';
      for (const x of [-0.22, -0.08]) ctx.fillRect(L * x, -L * 0.3, L * 0.06, L * 0.6);
      ctx.restore();
      ellipse(ctx, L * 0.02, 0, L * 0.38, L * 0.24); edge(ctx, contour);
      // the strap, round the back of the head
      ctx.strokeStyle = '#1f2a44'; ctx.lineWidth = Math.max(1, L * 0.04);
      ctx.beginPath(); ctx.moveTo(L * 0.08, -L * 0.12); ctx.quadraticCurveTo(-L * 0.06, -L * 0.1, -L * 0.04, L * 0.04); ctx.stroke();
      ink(ctx, L);
      // the snorkel, up from the mouth and over the head
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, L * 0.07);
      ctx.beginPath(); ctx.moveTo(L * 0.34, L * 0.08); ctx.quadraticCurveTo(L * 0.44, L * 0.02, L * 0.38, -L * 0.2); ctx.lineTo(L * 0.3, -L * 0.42); ctx.stroke();
      ctx.strokeStyle = '#ff7a2e'; ctx.lineWidth = Math.max(1.2, L * 0.045);
      ctx.beginPath(); ctx.moveTo(L * 0.34, L * 0.08); ctx.quadraticCurveTo(L * 0.44, L * 0.02, L * 0.38, -L * 0.2); ctx.lineTo(L * 0.3, -L * 0.42); ctx.stroke();
      ink(ctx, L);
      // the mask: the eye behind it twice the size, the glass tinted
      ctx.beginPath(); ctx.roundRect?.(L * 0.06, -L * 0.17, L * 0.26, L * 0.17, L * 0.06) ?? ctx.rect(L * 0.06, -L * 0.17, L * 0.26, L * 0.17);
      ctx.fillStyle = '#1f2a44'; ctx.fill(); ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.roundRect?.(L * 0.085, -L * 0.15, L * 0.21, L * 0.13, L * 0.045) ?? ctx.rect(L * 0.085, -L * 0.15, L * 0.21, L * 0.13); ctx.clip();
      ctx.fillStyle = '#bfefff'; ctx.fillRect(L * 0.08, -L * 0.16, L * 0.22, L * 0.15);
      eye(ctx, L * 0.19, -L * 0.085, L * 0.1, { look: [0.5, 0.1], pupil: 0.45 });
      ctx.fillStyle = 'rgba(120,200,255,0.25)'; ctx.fillRect(L * 0.08, -L * 0.16, L * 0.22, L * 0.15);
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.moveTo(L * 0.1, -L * 0.14); ctx.lineTo(L * 0.16, -L * 0.14); ctx.lineTo(L * 0.11, -L * 0.04); ctx.closePath(); ctx.fill();
      ctx.restore();
      ellipse(ctx, -L * 0.02, L * 0.1, L * 0.08, L * 0.04, 0.5 + wag * 0.4); fillStroke(ctx, '#22a59a');
      bubbles(ctx, L * 0.3, -L * 0.45, L, beat, 3);
    },
  },
  {
    letter: 'E', name: 'ANGLER', size: 0.6,
    description: 'From the deep end: a dark anglerfish with a huge underbite of snaggle teeth and a pink tongue, chomping as it swims, and a lamp on a stalk, glowing brighter on the beat.',
    paint(ctx, L, { t, beat, wag, jaws = anglerJaws }) {
      ink(ctx, L);
      const pulse = Math.exp(-(((beat % 1) + 1) % 1) * 4);
      // its jaw chomps as it swims, shut on the beat and dropping open between (Peter, 6 Oct 2026:
      // "can the anglers teeth, mouth/jaw move a little while moving?"): the jaw hinges at the back
      // of the mouth, so a point drops by how far forward of the hinge it is
      const gape = L * 0.08 * (0.5 - 0.5 * Math.cos(beat * TAU));
      const drop = (x) => gape * Math.max(0, Math.min(1, x / 0.52));
      const lx = L * 0.62, ly = -L * 0.38 + Math.sin(t * 3) * L * 0.04;
      // the glow first, under everything
      const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, L * (0.28 + 0.1 * pulse));
      g.addColorStop(0, `rgba(250,255,170,${0.55 + 0.35 * pulse})`); g.addColorStop(1, 'rgba(180,255,170,0)');
      ctx.fillStyle = g; ctx.fillRect(lx - L * 0.4, ly - L * 0.4, L * 0.8, L * 0.8);
      tail(ctx, -L * 0.3, L * 0.3, L * 0.18, wag, '#4a3b70', { fork: 0.2 });
      // the body, its mouth and teeth: `jaws` (src/dev/angler-mouth-candidates.js bakes off others)
      jaws(ctx, L, { t, beat, gape, drop, pulse });
      ink(ctx, L);
      // the stalk and its lamp
      ctx.beginPath(); ctx.moveTo(L * 0.18, -L * 0.29); ctx.quadraticCurveTo(L * 0.4, -L * 0.62, lx, ly); ctx.stroke();
      ellipse(ctx, lx, ly, L * (0.045 + 0.015 * pulse), L * (0.045 + 0.015 * pulse)); fillStroke(ctx, '#fff36b');
      // a small mean eye
      eye(ctx, L * 0.14, -L * 0.14, L * 0.055, { look: [0.6, 0.2], pupil: 0.55 });
      ctx.beginPath(); ctx.moveTo(L * 0.07, -L * 0.22); ctx.lineTo(L * 0.21, -L * 0.18); ctx.stroke();
      ellipse(ctx, -L * 0.08, L * 0.1, L * 0.07, L * 0.035, 0.6 + wag * 0.4); fillStroke(ctx, '#4a3b70');
    },
  },
  {
    letter: 'F', name: 'BIG LIPS', size: 0.6,
    description: 'A grumpy grouper, heavy-lidded and spotty, whose great pink lips pucker into a kiss every other beat and blow a heart.',
    paint(ctx, L, { beat, wag, contour }) {
      ink(ctx, L);
      const ph = ((beat % 2) + 2) % 2;
      const kiss = ph < 0.5 ? Math.sin((ph / 0.5) * Math.PI) : 0;
      tail(ctx, -L * 0.3, L * 0.38, L * 0.2, wag * 0.6, '#7a5a3a', { fork: 0.15 });
      ctx.beginPath(); ctx.moveTo(-L * 0.18, -L * 0.24); ctx.quadraticCurveTo(L * 0.0, -L * 0.42, L * 0.16, -L * 0.25); ctx.closePath(); fillStroke(ctx, '#6f8f4a');
      ellipse(ctx, 0, 0, L * 0.38, L * 0.27); ctx.fillStyle = '#8a6a4a'; ctx.fill();
      ctx.save(); ellipse(ctx, 0, 0, L * 0.38, L * 0.27); ctx.clip();
      ctx.fillStyle = '#c9b48a'; ellipse(ctx, L * 0.05, L * 0.22, L * 0.34, L * 0.13); ctx.fill();
      ctx.fillStyle = '#6f8f4a';
      for (const [sx, sy, r] of [[-0.2, -0.12, 0.04], [-0.05, -0.16, 0.035], [-0.25, 0.05, 0.03], [0.05, -0.05, 0.03], [-0.12, 0.0, 0.025], [0.14, -0.15, 0.025]]) { ellipse(ctx, L * sx, L * sy, L * r, L * r); ctx.fill(); }
      ctx.restore();
      ellipse(ctx, 0, 0, L * 0.38, L * 0.27); edge(ctx, contour);
      // the lips: pushed out into a pucker on the kiss
      const out = L * 0.06 * kiss;
      ellipse(ctx, L * 0.37 + out, -L * 0.005, L * (0.07 - 0.015 * kiss), L * (0.055 - 0.01 * kiss), -0.2); fillStroke(ctx, '#ff7aa0');
      ellipse(ctx, L * 0.37 + out, L * 0.085, L * (0.075 - 0.015 * kiss), L * (0.055 - 0.01 * kiss), 0.2); fillStroke(ctx, '#ff6a92');
      // the grumpy eye, and the brow over it
      eye(ctx, L * 0.17, -L * 0.1, L * 0.085, { look: [0.5, 0.2], pupil: 0.5, lid: 0.45, lidCol: '#7a5a3a' });
      ctx.lineWidth = Math.max(1.2, L * 0.05);
      ctx.beginPath(); ctx.moveTo(L * 0.07, -L * 0.21); ctx.lineTo(L * 0.27, -L * 0.17); ctx.stroke();
      ink(ctx, L);
      ellipse(ctx, -L * 0.04, L * 0.1, L * 0.09, L * 0.045, 0.5 + wag * 0.3); fillStroke(ctx, '#6f8f4a');
      // the heart it blows, rising from the kiss
      if (ph < 1.6) {
        const a = ph / 1.6, hx = L * (0.48 + 0.1 * a), hy = -L * (0.02 + 0.5 * a), r = L * 0.05;
        ctx.save(); ctx.globalAlpha = 1 - a; ctx.fillStyle = '#ff4f7a';
        ctx.beginPath(); ctx.moveTo(hx, hy + r * 0.9);
        ctx.bezierCurveTo(hx - r * 1.4, hy - r * 0.2, hx - r * 0.6, hy - r * 1.3, hx, hy - r * 0.45);
        ctx.bezierCurveTo(hx + r * 0.6, hy - r * 1.3, hx + r * 1.4, hy - r * 0.2, hx, hy + r * 0.9);
        ctx.fill(); ctx.restore();
      }
    },
  },
  {
    letter: 'G', name: 'PARTY SHARK', size: 0.95,
    description: 'A friendly shark in a party hat, grinning a mouthful of teeth and blinking on the bar. The biggest of them. '
      + 'Its baby follows it (`baby`): chubbier, a bigger eye, a big pink bow on its head and a dummy it sucks on the beat.',
    paint(ctx, L, { beat, wag, baby, babyHat, contour }) {
      ink(ctx, L);
      const blink = (((beat % 4) + 4) % 4) > 3.75;
      // the baby is a chubby one (Peter, 6 Oct 2026: "more like a baby — pacifier perhaps and some
      // sort of baby bonnet")
      if (baby) { ctx.save(); ctx.scale(1, BABY_CHUB); }
      // the tail, a crescent
      const sw = wag * L * 0.06;
      ctx.beginPath(); ctx.moveTo(-L * 0.36, 0);
      ctx.quadraticCurveTo(-L * 0.45, -L * 0.1 + sw, -L * 0.52, -L * 0.24 + sw);
      ctx.quadraticCurveTo(-L * 0.46, sw * 0.5, -L * 0.5, L * 0.16 + sw);
      ctx.quadraticCurveTo(-L * 0.42, L * 0.06 + sw, -L * 0.36, 0); ctx.closePath(); fillStroke(ctx, '#6f8aa8');
      // the dorsal fin
      ctx.beginPath(); ctx.moveTo(-L * 0.12, -L * 0.15); ctx.quadraticCurveTo(-L * 0.06, -L * 0.36, -L * 0.14, -L * 0.42); ctx.quadraticCurveTo(L * 0.02, -L * 0.3, L * 0.08, -L * 0.16); ctx.closePath(); fillStroke(ctx, '#6f8aa8');
      // the body: a torpedo, white beneath
      const body = () => {
        ctx.beginPath();
        ctx.moveTo(-L * 0.38, 0);
        ctx.quadraticCurveTo(-L * 0.2, -L * 0.2, L * 0.15, -L * 0.18);
        ctx.quadraticCurveTo(L * 0.42, -L * 0.15, L * 0.48, L * 0.0);
        ctx.quadraticCurveTo(L * 0.4, L * 0.14, L * 0.1, L * 0.16);
        ctx.quadraticCurveTo(-L * 0.2, L * 0.15, -L * 0.38, 0);
        ctx.closePath();
      };
      body(); ctx.fillStyle = '#8fa9c6'; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.fillStyle = '#f2f5fa'; ctx.beginPath(); ctx.ellipse(L * 0.1, L * 0.14, L * 0.42, L * 0.09, 0, 0, TAU); ctx.fill();
      ctx.restore();
      body(); edge(ctx, contour);
      if (baby) { babyShark(ctx, L, { beat, wag, blink, hat: babyHat }); ctx.restore(); return; }
      // the grin, all teeth
      ctx.fillStyle = '#5a1030';
      ctx.beginPath(); ctx.moveTo(L * 0.1, L * 0.04); ctx.quadraticCurveTo(L * 0.3, L * 0.13, L * 0.44, L * 0.02); ctx.quadraticCurveTo(L * 0.3, L * 0.06, L * 0.1, L * 0.04); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      for (let k = 0; k < 7; k++) {
        const x = L * (0.13 + k * 0.045), y = L * (0.05 + 0.025 * Math.sin((k / 6) * Math.PI));
        ctx.beginPath(); ctx.moveTo(x - L * 0.017, y - L * 0.005); ctx.lineTo(x, y + L * 0.035); ctx.lineTo(x + L * 0.017, y - L * 0.005); ctx.closePath(); ctx.fill();
      }
      // gills and eye
      for (const x of [-0.02, 0.03, 0.08]) { ctx.beginPath(); ctx.moveTo(L * x, -L * 0.06); ctx.quadraticCurveTo(L * (x - 0.02), L * 0.0, L * x, L * 0.06); ctx.stroke(); }
      if (blink) { ctx.beginPath(); ctx.moveTo(L * 0.24, -L * 0.07); ctx.quadraticCurveTo(L * 0.28, -L * 0.04, L * 0.32, -L * 0.07); ctx.stroke(); }
      else eye(ctx, L * 0.28, -L * 0.07, L * 0.05, { look: [0.4, 0], pupil: 0.6 });
      // the party hat
      ctx.save(); ctx.translate(L * 0.2, -L * 0.17); ctx.rotate(0.35);
      ctx.beginPath(); ctx.moveTo(-L * 0.07, 0); ctx.lineTo(0, -L * 0.2); ctx.lineTo(L * 0.07, 0); ctx.closePath(); ctx.fillStyle = '#ffd23f'; ctx.fill();
      ctx.save(); ctx.clip(); ctx.fillStyle = '#ff4fa3';
      for (let k = 0; k < 3; k++) ctx.fillRect(-L * 0.1, -L * (0.04 + k * 0.065), L * 0.2, L * 0.025);
      ctx.restore(); ctx.stroke();
      ellipse(ctx, 0, -L * 0.2, L * 0.025, L * 0.025); fillStroke(ctx, '#7cff6b');
      ctx.restore();
      ctx.beginPath(); ctx.moveTo(L * 0.0, L * 0.12); ctx.quadraticCurveTo(L * 0.02, L * 0.22 + wag * L * 0.02, -L * 0.1, L * 0.24); ctx.lineTo(-L * 0.06, L * 0.14); ctx.closePath(); fillStroke(ctx, '#6f8aa8');
    },
  },
]);

/**
 * The goldfish in its bowl, from the bake-off — taken out of the club's water (Peter, 5 Oct 2026:
 * "for lorenzos fish, get rid of the one in the fish bowl please"). Kept for the bake-off's record
 * (src/dev/fish-candidates.js).
 */
export const FISHBOWL = Object.freeze({
  letter: 'H', name: 'FISHBOWL', size: 0.5,
  description: 'A goldfish swimming in its own bowl, carried across the flooded club, the water sloshing as it goes and the fish doing laps inside.',
  paint(ctx, L, { t, beat }) {
    ink(ctx, L);
    const R = L * 0.38;
    const slosh = Math.sin(t * 3.1) * 0.12;
    // the water inside
    ctx.save();
    ellipse(ctx, 0, 0, R, R); ctx.clip();
    ctx.fillStyle = 'rgba(80,190,230,0.55)';
    ctx.beginPath(); ctx.moveTo(-R, -R * 0.35 + slosh * R); ctx.lineTo(R, -R * 0.35 - slosh * R); ctx.lineTo(R, R); ctx.lineTo(-R, R); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8d9a8';
    for (let k = 0; k < 7; k++) { ellipse(ctx, -R * 0.6 + k * R * 0.2, R * 0.86, R * 0.1, R * 0.07); ctx.fill(); }
    // the goldfish doing laps
    const lap = (t * 0.45) % 1, back = lap > 0.5;
    const fx = (back ? 1 - (lap - 0.5) * 2 : lap * 2) * R * 1.0 - R * 0.5, fy = R * 0.25 + Math.sin(t * 2.3) * R * 0.1;
    ctx.save(); ctx.translate(fx, fy); ctx.scale(back ? -1 : 1, 1);
    ink(ctx, L, 0.025);
    tail(ctx, -R * 0.22, R * 0.3, R * 0.2, Math.sin(t * 12), '#ff8a3d');
    ellipse(ctx, 0, 0, R * 0.24, R * 0.15); fillStroke(ctx, '#ffa13a');
    eye(ctx, R * 0.12, -R * 0.03, R * 0.06, { look: [0.5, 0], pupil: 0.5 });
    ctx.restore();
    ctx.restore();
    // the glass: a rim, a shine, the ink
    ink(ctx, L);
    ctx.strokeStyle = 'rgba(220,250,255,0.95)'; ctx.lineWidth = Math.max(1, L * 0.03);
    ellipse(ctx, 0, 0, R, R); ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.8, L * 0.02);
    ellipse(ctx, 0, 0, R * 1.02, R * 1.02); ctx.stroke();
    ctx.fillStyle = 'rgba(220,250,255,0.9)'; ellipse(ctx, 0, -R * 0.82, R * 0.55, R * 0.1); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = Math.max(1, L * 0.03);
    ctx.beginPath(); ctx.arc(0, 0, R * 0.8, -2.6, -1.9); ctx.stroke();
    bubbles(ctx, fxLast(t, R), -R * 0.4, L * 0.6, beat, 1);
  },
});

/** Where the fishbowl's goldfish is across its bowl, for its bubbles. */
function fxLast(t, R) {
  const lap = (t * 0.45) % 1, back = lap > 0.5;
  return (back ? 1 - (lap - 0.5) * 2 : lap * 2) * R - R * 0.5 + (back ? -R * 0.15 : R * 0.15);
}

// ---------------------------------------------------------------- the cut-paper look
//
// The painter draws into a stand-in for the canvas that turns its fills and strokes into
// paper: a fill is a cut-out with a shadow under it and the grain over it, an outline drawn
// round a fill is left off (paper has edges, not ink), and a line drawn on its own — a smile, a
// brow — is a thin dark strip. `lite` (a slow device) leaves out the grain.

/** A fill or stroke style as [r, g, b, a], or null for a gradient or a pattern. */
function rgbOf(c) {
  if (typeof c !== 'string') return null;
  if (c[0] === '#') {
    const h = c.length === 4 ? c.slice(1).split('').map((d) => d + d).join('') : c.slice(1, 7);
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(',').map(Number);
  return [p[0], p[1], p[2], p[3] ?? 1];
}
const css = ([r, g, b, a = 1]) => `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
const luma = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;
const mix = (c, d, k) => [c[0] + (d[0] - c[0]) * k, c[1] + (d[1] - c[1]) * k, c[2] + (d[2] - c[2]) * k, c[3] ?? 1];
/**
 * A colour with its hue turned `deg` degrees round the wheel, its saturation and lightness kept
 * (HSL, not the CSS filter's matrix, which muddies a turned yellow): a grey, the eyes' white and
 * the ink, stays as it is.
 */
function turnHue(c, deg) {
  const [r, g, b] = c.map((v) => v / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d < 1e-4) return c;
  const h = (((max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60 + deg) % 360 + 360) % 360;
  const x = d * (1 - Math.abs(((h / 60) % 2) - 1));
  const [p, q, s] = h < 60 ? [d, x, 0] : h < 120 ? [x, d, 0] : h < 180 ? [0, d, x] : h < 240 ? [0, x, d] : h < 300 ? [x, 0, d] : [d, 0, x];
  return [(p + min) * 255, (q + min) * 255, (s + min) * 255, c[3] ?? 1];
}
/** The scale from the context's units to device pixels. */
const deviceScale = (t) => { try { const m = t.getTransform(); return Math.hypot(m.a, m.b) || 1; } catch { return 1; } };

/**
 * The canvas, with its fills and strokes turned into a style's. `fill(t, path)` and
 * `stroke(t, { afterFill })` get the real context with the painter's path still on it;
 * `afterFill` says this path was just filled (most outlines are), so a style that outlines its
 * own fills can leave the painter's outline off. fillRect goes to `fill` as a rectangle.
 * A painter's globalAlpha is taken as a share of the alpha the fish is drawn at, so a bubble
 * setting it to 1 fades with a fading fish rather than punching through. `gradient(css)` turns a
 * gradient's colours as they are added (a CanvasGradient is made fresh for each call, so its own
 * addColorStop can be wrapped; a stand-in that hands out one shared object is left alone).
 */
function styled(ctx, { fill, stroke, gradient }) {
  let filled = false;
  const alpha = ctx.globalAlpha ?? 1;
  return new Proxy(ctx, {
    get(t, k) {
      if (k === 'beginPath') return () => { filled = false; t.beginPath(); };
      if (gradient && (k === 'createLinearGradient' || k === 'createRadialGradient')) return (...a) => {
        const g = t[k](...a);
        if (!g || Object.prototype.hasOwnProperty.call(g, 'addColorStop')) return g;
        const add = g.addColorStop;
        g.addColorStop = (at, c) => add.call(g, at, gradient(c));
        return g;
      };
      if (k === 'fill' && fill) return (...a) => { fill(t, ...a); filled = true; };
      if (k === 'stroke' && stroke) return (...a) => stroke(t, { afterFill: filled }, ...a);
      // a rectangle filled with a gradient is a light — the angler's lamp — not a shape: as it is
      if (k === 'fillRect' && fill) return (x, y, w, h) => {
        if (typeof t.fillStyle !== 'string') { t.fillRect(x, y, w, h); return; }
        t.beginPath(); t.rect(x, y, w, h); fill(t); filled = true;
      };
      const v = t[k];
      return typeof v === 'function' ? v.bind(t) : v;
    },
    set(t, k, v) { t[k] = k === 'globalAlpha' ? v * alpha : v; return true; },
  });
}

// ---------------------------------------------------------------- textures, made once
const textures = {};
function texture(id, size, paint) {
  if (typeof document === 'undefined') return null;
  if (!textures[id]) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    paint(g, size);
    textures[id] = c;
  }
  return textures[id];
}
/** Paper grain: soft speckle, multiplied in. */
const grain = () => texture('grain', 64, (g, n) => {
  let seed = 7;
  const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 900; i++) { const v = 200 + rnd() * 55; g.fillStyle = `rgb(${v},${v - 4},${v - 10})`; g.fillRect(rnd() * n, rnd() * n, 1 + rnd() * 1.5, 1 + rnd() * 1.5); }
});

/**
 * How wide a fish's outline is, as a share of a hero's height: the cast's contour (toons.js,
 * 0.016 h), so the fish are outlined like the heroes they swim over, whatever their size (Peter,
 * 6 Oct 2026: "should we possibly have a smaller outline for all of them? They seem a bit thicker
 * than the heros"). It was 3.5% of the fish's own length, so the bigger the fish the heavier, and
 * solid where the cast's is a third ink (edge).
 */
const CONTOUR = 0.016;

/**
 * One fish in cut paper (FISHES' contract, `fish` one of them). `o.lite` leaves out the grain;
 * `o.heroH` is the height of the heroes it swims over, for its outline (CONTOUR), else the fish's
 * own size says. `o.hue` turns every colour it is cut from that many degrees round the wheel —
 * the same fish in another colourway (the jukebox's DEEP BLUE DISCO); the ink and the eyes keep theirs.
 * `o.quick` casts each piece's shadow in two hard steps rather than a blur: a blurred shadow
 * costs about a tenth of a millisecond a piece, which a tank of a dozen fish cannot afford.
 */
export function drawPaperFish(ctx, fish, L, o = {}) {
  const g = o.lite ? null : grain();
  const pattern = g && ctx.createPattern?.(g, 'repeat');
  const hue = o.hue ? (c) => turnHue(c, o.hue) : null;
  const paper = styled(ctx, {
    gradient: hue && ((c) => { const col = rgbOf(c); return col ? css(hue(col)) : c; }),
    fill(t) {
      let col = rgbOf(t.fillStyle);
      if (col && hue) col = hue(col);
      const k = deviceScale(t), lw = L * 0.035;
      t.save();
      if (col) t.fillStyle = css(mix(col, [250, 240, 222], luma(col) < 60 ? 0.05 : 0.12));
      if (o.quick) {
        // the far step first, faint, then the near one under the piece itself: the piece is
        // filled twice, which only a see-through one would show, so that one gets the near step
        if ((col?.[3] ?? 1) >= 1) {
          t.shadowColor = 'rgba(20,10,30,0.2)'; t.shadowOffsetX = k * lw * 0.8; t.shadowOffsetY = k * lw * 1.15;
          t.fill();
        }
        t.shadowColor = 'rgba(20,10,30,0.3)'; t.shadowOffsetX = k * lw * 0.35; t.shadowOffsetY = k * lw * 0.55;
      } else {
        t.shadowColor = 'rgba(20,10,30,0.45)';
        t.shadowBlur = k * lw * 1.1;
        t.shadowOffsetX = k * lw * 0.35;
        t.shadowOffsetY = k * lw * 0.55;
      }
      t.fill();
      t.restore();
      if (pattern && col && luma(col) > 40) {
        t.save(); t.clip();
        t.globalCompositeOperation = 'multiply'; t.globalAlpha *= 0.55; t.fillStyle = pattern;
        t.fillRect(-L * 2, -L * 2, L * 4, L * 4);
        t.restore();
      }
    },
    stroke(t, { afterFill }) {
      if (afterFill) return;   // paper has no outlines, only edges
      const col = rgbOf(t.strokeStyle);
      const k = deviceScale(t);
      t.save();
      t.shadowColor = o.quick ? 'rgba(20,10,30,0.3)' : 'rgba(20,10,30,0.4)';
      t.shadowBlur = o.quick ? 0 : k * L * 0.03; t.shadowOffsetY = k * L * 0.015;
      if (col && luma(col) < 60) { t.strokeStyle = css([58, 42, 48, col[3]]); t.lineWidth *= 0.9; }
      t.stroke();
      t.restore();
    },
  });
  // a dark line on its own is cut at 0.9 of its width (stroke above), so ask for a little more
  const contour = (o.heroH ?? L / fish.size) * CONTOUR / 0.9;
  fish.paint(paper, L, { ...o, contour });
}
