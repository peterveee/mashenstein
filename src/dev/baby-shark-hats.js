// BABY SHARK BAKE-OFF — what the party shark's baby wears. 6 Oct 2026.
//
// Peter, of the frilled pink bonnet it got the same day: "i don't love the bonnet - give me a few
// different options".
//
// SETTLED 6 Oct 2026 on C, the big bow ("i like the bow"): it is the club's now
// (club-fish.js babyBow). The rest stay here for the bake-off's record, with the old bonnet. Each is a `hat` for club-fish.js babyShark — paint(ctx, L, { beat, wag }),
// in the baby's own frame (facing right, `L` nose to tail, its body already drawn), before its
// eye, cheek and dummy go on over it. They are drawn in cut paper like everything else in the
// flood, so a fill is a cut-out and a dark line on its own is a thin strip.
//
// Landmarks on the baby, in L: the top of its head runs from (0.15, -0.18) to (0.37, -0.12), the
// eye sits at (0.33, -0.06) and is 0.07 across, the gills at x -0.06 and -0.01, the belly 0.15
// under the middle, and the dummy's ring out at (0.53, 0.05).

import { babyBow } from '../game/banger/club-fish.js';

const TAU = Math.PI * 2;
const ink = (ctx, L, w = 0.035) => {
  ctx.lineWidth = Math.max(0.8, L * w);
  ctx.strokeStyle = '#1b1428';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
};
const ellipse = (ctx, x, y, rx, ry, rot = 0) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); };
const fillStroke = (ctx, fill) => { ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); };
/** 1 on the beat, falling away fast: for a hop or a pop. */
const onBeat = (beat) => Math.exp(-(((beat % 1) + 1) % 1) * 6);

/** A dome over the crown, from just behind the head to just over the eye. */
function crown(ctx, L, { back = 0.09, front = 0.39, top = -0.345, base = -0.14 } = {}) {
  const mid = (back + front) / 2;
  ctx.beginPath();
  ctx.moveTo(L * back, L * base);
  ctx.quadraticCurveTo(L * (back - 0.01), L * top, L * mid, L * top);
  ctx.quadraticCurveTo(L * (front - 0.01), L * top, L * front, L * base);
  ctx.closePath();
}

function beanie(ctx, L, { beat }) {
  // the pompom, hopping on the beat
  ellipse(ctx, L * 0.235, -L * (0.37 + 0.035 * onBeat(beat)), L * 0.062, L * 0.062); fillStroke(ctx, '#fff3c4');
  crown(ctx, L); fillStroke(ctx, '#a8e6c8');
  crown(ctx, L);
  ctx.save(); ctx.clip(); ctx.fillStyle = '#f4fff9';
  for (const y of [-0.3, -0.235]) ctx.fillRect(0, L * y, L * 0.5, L * 0.032);
  ctx.restore();
  // the cuff, turned up and ribbed
  ctx.beginPath();
  ctx.moveTo(L * 0.07, -L * 0.19); ctx.quadraticCurveTo(L * 0.24, -L * 0.225, L * 0.41, -L * 0.185);
  ctx.lineTo(L * 0.41, -L * 0.115); ctx.quadraticCurveTo(L * 0.24, -L * 0.155, L * 0.07, -L * 0.125);
  ctx.closePath(); fillStroke(ctx, '#7fd1aa');
  ctx.save(); ctx.lineWidth = Math.max(0.6, L * 0.014); ctx.strokeStyle = '#5fb48c';
  for (let k = 1; k < 8; k++) {
    const x = 0.07 + k * 0.0425, dy = 0.03 * Math.sin((k / 8) * Math.PI);
    ctx.beginPath(); ctx.moveTo(L * x, -L * (0.19 + dy)); ctx.lineTo(L * x, -L * (0.125 + dy)); ctx.stroke();
  }
  ctx.restore();
}

function kissCurl(ctx, L, { beat }) {
  // one curl, springing up off the crown and swaying in time
  ctx.save(); ctx.translate(L * 0.25, -L * 0.15); ctx.rotate(Math.sin(beat * Math.PI) * 0.2);
  ctx.lineWidth = Math.max(1.2, L * 0.05); ctx.strokeStyle = '#4a3020'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-L * 0.05, -L * 0.1, L * 0.02, -L * 0.21, L * 0.085, -L * 0.165);
  ctx.bezierCurveTo(L * 0.13, -L * 0.12, L * 0.075, -L * 0.065, L * 0.045, -L * 0.11);
  ctx.stroke();
  ctx.restore();
}

/** The bonnet it had first, which this bake-off replaced: a cap over the crown, a frill round its brim and a band across it, tied under the chin. */
export function babyBonnet(ctx, L, { wag }) {
  for (let k = 0; k < 6; k++) {
    const q = k / 5;
    ellipse(ctx, L * (0.335 + 0.09 * q + 0.01 * Math.sin(q * Math.PI)), L * (-0.325 + 0.18 * q), L * 0.036, L * 0.036); fillStroke(ctx, '#fff6fa');
  }
  ctx.beginPath();
  ctx.moveTo(L * 0.08, -L * 0.13);
  ctx.quadraticCurveTo(L * 0.06, -L * 0.33, L * 0.22, -L * 0.345);
  ctx.quadraticCurveTo(L * 0.36, -L * 0.34, L * 0.39, -L * 0.17);
  ctx.quadraticCurveTo(L * 0.24, -L * 0.08, L * 0.08, -L * 0.13);
  ctx.closePath(); fillStroke(ctx, '#ffb3cf');
  ctx.save(); ctx.lineWidth = Math.max(1, L * 0.03); ctx.strokeStyle = '#ff7fb0';
  ctx.beginPath(); ctx.moveTo(L * 0.27, -L * 0.335); ctx.quadraticCurveTo(L * 0.33, -L * 0.25, L * 0.31, -L * 0.125); ctx.stroke();
  ctx.restore();
  // its ribbon, down the cheek and tied in a bow under the chin, the ends trailing
  const bx = L * 0.225, by = L * 0.2, trail = wag * L * 0.02;
  ctx.beginPath(); ctx.moveTo(L * 0.2, -L * 0.12); ctx.lineTo(L * 0.245, -L * 0.115); ctx.lineTo(bx + L * 0.012, by); ctx.lineTo(bx - L * 0.012, by); ctx.closePath(); fillStroke(ctx, '#ff7fb0');
  for (const [dx, k] of [[-0.08, 1], [-0.03, -1]]) {
    ctx.beginPath(); ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + L * dx * 0.5, by + L * 0.05, bx + L * dx, by + L * 0.11 + trail * k);
    ctx.lineTo(bx + L * (dx + 0.03), by + L * 0.1 + trail * k);
    ctx.quadraticCurveTo(bx + L * dx * 0.2, by + L * 0.04, bx, by); ctx.closePath(); fillStroke(ctx, '#ff7fb0');
  }
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + s * L * 0.07, by - L * 0.07, bx + s * L * 0.085, by - L * 0.005);
    ctx.quadraticCurveTo(bx + s * L * 0.07, by + L * 0.05, bx, by); ctx.closePath(); fillStroke(ctx, '#ff7fb0');
  }
  ellipse(ctx, bx, by, L * 0.022, L * 0.022); fillStroke(ctx, '#ff5d9a');
}

function mobCap(ctx, L, { wag }) {
  // a puff of white cotton gathered on a ribbon, frilled all the way round
  ctx.beginPath(); ctx.moveTo(L * 0.05, -L * 0.15);
  ctx.bezierCurveTo(L * 0.0, -L * 0.44, L * 0.46, -L * 0.44, L * 0.43, -L * 0.14); ctx.closePath();
  fillStroke(ctx, '#fffaf2');
  ctx.save(); ctx.lineWidth = Math.max(0.6, L * 0.014); ctx.strokeStyle = '#e3d6c4';
  for (const x of [0.15, 0.24, 0.33]) { ctx.beginPath(); ctx.moveTo(L * x, -L * 0.19); ctx.quadraticCurveTo(L * (x + 0.02), -L * 0.26, L * (x + 0.005), -L * 0.31); ctx.stroke(); }
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(L * 0.05, -L * 0.185); ctx.quadraticCurveTo(L * 0.24, -L * 0.215, L * 0.43, -L * 0.18);
  ctx.lineTo(L * 0.43, -L * 0.145); ctx.quadraticCurveTo(L * 0.24, -L * 0.18, L * 0.05, -L * 0.15);
  ctx.closePath(); fillStroke(ctx, '#ff9ec0');
  // a little bow at the back, its ends trailing
  for (const s of [-1, 1]) { ellipse(ctx, L * 0.04, -L * (0.17 + s * 0.035), L * 0.035, L * 0.022, s * 0.6); fillStroke(ctx, '#ff9ec0'); }
  ctx.beginPath(); ctx.moveTo(L * 0.04, -L * 0.17); ctx.lineTo(-L * 0.04, -L * 0.13 + wag * L * 0.02); ctx.lineTo(-L * 0.03, -L * 0.115 + wag * L * 0.02); ctx.closePath(); fillStroke(ctx, '#ff9ec0');
  // the frill
  for (let k = 0; k <= 9; k++) {
    const q = k / 9;
    ellipse(ctx, L * (0.035 + 0.41 * q), L * (-0.135 - 0.03 * Math.sin(q * Math.PI)), L * 0.03, L * 0.03); fillStroke(ctx, '#ffffff');
  }
}

function bearHat(ctx, L) {
  // a fleecy cap with two round ears
  for (const x of [0.13, 0.32]) {
    ellipse(ctx, L * x, -L * 0.32, L * 0.062, L * 0.062); fillStroke(ctx, '#b07a4a');
    ellipse(ctx, L * x, -L * 0.32, L * 0.032, L * 0.032); ctx.fillStyle = '#ffb3c6'; ctx.fill();
  }
  ctx.beginPath(); ctx.moveTo(L * 0.035, -L * 0.03);
  ctx.quadraticCurveTo(L * 0.0, -L * 0.33, L * 0.22, -L * 0.34);
  ctx.quadraticCurveTo(L * 0.4, -L * 0.33, L * 0.41, -L * 0.15);
  ctx.quadraticCurveTo(L * 0.2, -L * 0.13, L * 0.035, -L * 0.03);
  ctx.closePath(); fillStroke(ctx, '#c89a6a');
  // the rim, cream, round the front
  ctx.save(); ctx.lineWidth = Math.max(1.2, L * 0.045); ctx.strokeStyle = '#fff1d6';
  ctx.beginPath(); ctx.moveTo(L * 0.035, -L * 0.03); ctx.quadraticCurveTo(L * 0.2, -L * 0.13, L * 0.41, -L * 0.15); ctx.stroke();
  ctx.restore();
}

function bib(ctx, L, { wag }) {
  // a bib hung under the chin, its top bound in pink along the jaw and tied in a little bow at the
  // back of the neck, swinging a little
  ctx.save(); ctx.translate(L * 0.26, L * 0.08); ctx.rotate(wag * 0.05);
  const shape = (g) => {
    ctx.beginPath(); ctx.moveTo(-L * (0.15 + g), L * 0.0);
    ctx.quadraticCurveTo(0, L * 0.06, L * (0.15 + g), -L * 0.03);
    ctx.bezierCurveTo(L * (0.17 + g), L * (0.14 + g), L * (0.1 + g), L * (0.22 + g), 0, L * (0.22 + g));
    ctx.bezierCurveTo(-L * (0.11 + g), L * (0.22 + g), -L * (0.17 + g), L * (0.14 + g), -L * (0.15 + g), 0);
    ctx.closePath();
  };
  shape(0.02); fillStroke(ctx, '#ff9ec0');
  shape(0); fillStroke(ctx, '#ffffff');
  ctx.beginPath(); ctx.moveTo(-L * 0.16, -L * 0.005); ctx.quadraticCurveTo(0, L * 0.065, L * 0.16, -L * 0.035);
  ctx.lineTo(L * 0.16, -L * 0.005); ctx.quadraticCurveTo(0, L * 0.095, -L * 0.16, L * 0.025); ctx.closePath();
  fillStroke(ctx, '#ff9ec0');
  for (const s of [-1, 1]) { ellipse(ctx, -L * 0.17, -L * (0.005 + s * 0.03), L * 0.03, L * 0.018, s * 0.7); fillStroke(ctx, '#ff9ec0'); }
  ellipse(ctx, -L * 0.17, -L * 0.005, L * 0.016, L * 0.016); fillStroke(ctx, '#ff7fb0');
  // a heart on it
  const r = L * 0.035, hy = L * 0.13;
  ctx.beginPath(); ctx.moveTo(0, hy + r * 0.9);
  ctx.bezierCurveTo(-r * 1.4, hy - r * 0.2, -r * 0.6, hy - r * 1.3, 0, hy - r * 0.45);
  ctx.bezierCurveTo(r * 0.6, hy - r * 1.3, r * 1.4, hy - r * 0.2, 0, hy + r * 0.9);
  ctx.closePath(); ctx.fillStyle = '#ff5d9a'; ctx.fill();
  ctx.restore();
}

export const BABY_SHARK_HATS = Object.freeze([
  { letter: 'A', name: 'KNIT BEANIE', paint: beanie,
    description: 'A striped mint beanie with a turned-up ribbed cuff and a pompom that hops on the beat.' },
  { letter: 'B', name: 'KISS CURL', paint: kissCurl,
    description: 'No hat: one curl of hair springing up off its head, swaying in time. The cartoon baby’s one curl.' },
  { letter: 'C', name: 'BIG BOW', paint: babyBow,
    description: 'A big pink bow stuck on top of its head, popping on the beat.' },
  { letter: 'D', name: 'FRILLY CAP', paint: mobCap,
    description: 'A puff of white cotton gathered on a pink ribbon and frilled all the way round, a little bow at the back. No ties.' },
  { letter: 'E', name: 'BEAR HAT', paint: bearHat,
    description: 'A fleecy brown cap with two round bear ears and a cream rim.' },
  { letter: 'F', name: 'BIB', paint: bib,
    description: 'No hat: a white bib under its chin, bound in pink and tied in a little bow at the back, a heart on it.' },
  { letter: 'G', name: 'CURL + BIB', paint: (ctx, L, o) => { bib(ctx, L, o); kissCurl(ctx, L, o); },
    description: 'B and F together: the one curl on top and the bib under its chin.' },
]);
