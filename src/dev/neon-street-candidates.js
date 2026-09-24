// NEON — what stands in the road instead of a cactus (BAKE-OFF CANDIDATES). Peter, 24 Sep
// 2026: "i feel like the cactus is totally wrong here... if we are implying tokyo, what
// else could it be?" SETTLED: the panda, A1 (frog) and B3 (monkey in a hard hat) ship as
// pandaBarrier / frogBarrier / monkeyBarrier in src/sprites/props.js. The section stays
// in the lab gallery with every option until Peter retires it.
//
// Every candidate is a PROP painter in the game's own shape — (ctx, w, h), drawn into
// the obstacle's box with its base on the box's bottom edge — so the winner can go
// straight into src/sprites/props.js as a `skins` entry on the cactus (see the neon
// cabinet's `skins`): same 13x12 box, same jump, a different body.
//
// The animal barriers are the real thing: Tokyo's road works fence themselves off with
// cheerful plastic animals — frogs (kaeru, which also means "return home safely"),
// monkeys, rabbits, pandas — joined by yellow-and-black bars. They read as Japan at a
// glance and as "don't run into this" at the same time.

const INK = '#1a1028';

function shape(ctx, fill, path, line = 0.9) {
  ctx.beginPath();
  path(ctx);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = line;
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.stroke();
}
const ellipse = (x, y, rx, ry) => (c) => c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
const rrect = (x, y, w, h, r) => (c) => c.roundRect(x, y, w, h, r);

// The yellow-and-black hazard band every barrier stands on.
function hazardFoot(ctx, x, y, w, h) {
  shape(ctx, '#f6d33c', rrect(x, y, w, h, 1));
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 1);
  ctx.clip();
  ctx.fillStyle = INK;
  for (let s = x - h; s < x + w; s += 3.2) {
    ctx.beginPath();
    ctx.moveTo(s, y + h);
    ctx.lineTo(s + 1.4, y + h);
    ctx.lineTo(s + 1.4 + h, y);
    ctx.lineTo(s + h, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// Two dot eyes and a smile — every barrier animal has the same friendly face.
function face(ctx, cx, cy, s, { cheeks = '#ff8fb0', eyeGap = 0.26 } = {}) {
  ctx.fillStyle = INK;
  for (const dx of [-eyeGap, eyeGap]) {
    ctx.beginPath();
    ctx.arc(cx + dx * s, cy - 0.04 * s, 0.07 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = cheeks;
  ctx.globalAlpha = 0.8;
  for (const dx of [-0.36, 0.36]) {
    ctx.beginPath();
    ctx.ellipse(cx + dx * s, cy + 0.1 * s, 0.08 * s, 0.05 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.arc(cx, cy + 0.06 * s, 0.12 * s, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}

// A single animal barrier: a head on a short body on the hazard foot.
function animalBarrier(ctx, w, h, { body, belly, ears }) {
  const foot = h * 0.18;
  hazardFoot(ctx, w * 0.06, h - foot, w * 0.88, foot);
  // The body: a squat rounded post.
  shape(ctx, body, rrect(w * 0.2, h * 0.5, w * 0.6, h * 0.34, w * 0.14));
  shape(ctx, belly, ellipse(w * 0.5, h * 0.68, w * 0.18, h * 0.12), 0.6);
  // The head, with its ears behind it.
  const cx = w * 0.5;
  const cy = h * 0.34;
  const s = w * 0.9;
  ears(ctx, cx, cy, s);
  shape(ctx, body, ellipse(cx, cy, s * 0.46, s * 0.36));
  return { cx, cy, s };
}

// A yellow construction hard hat, sat on a head at (cx, cy) of size s.
function hardHat(ctx, cx, cy, s, rise = 0.3) {
  const y = cy - rise * s;
  ctx.beginPath();
  ctx.ellipse(cx, y, 0.36 * s, 0.22 * s, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = '#f6d33c';
  ctx.fill();
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = INK;
  ctx.stroke();
  shape(ctx, '#f6d33c', rrect(cx - 0.44 * s, y - 0.02 * s, 0.88 * s, 0.07 * s, 0.03 * s), 0.7);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillRect(cx - 0.04 * s, y - 0.19 * s, 0.08 * s, 0.15 * s);
}

export function frogBarrier(ctx, w, h, { green = '#48b84a', belly = '#e8f8c8', hat = false } = {}) {
  const { cx, cy, s } = animalBarrier(ctx, w, h, {
    body: green, belly,
    // A frog's "ears" are its eyes, bulging on top of the head.
    ears: (c, x, y, k) => {
      for (const dx of [-0.24, 0.24]) {
        shape(c, green, ellipse(x + dx * k, y - 0.3 * k, 0.15 * k, 0.13 * k));
        shape(c, '#ffffff', ellipse(x + dx * k, y - 0.31 * k, 0.09 * k, 0.08 * k), 0.5);
        c.fillStyle = INK;
        c.beginPath(); c.arc(x + dx * k, y - 0.3 * k, 0.045 * k, 0, Math.PI * 2); c.fill();
      }
    },
  });
  // The wide frog grin instead of the dot-eyed face.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(cx, cy - 0.02 * s, 0.26 * s, 0.12 * Math.PI, 0.88 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = '#ff8fb0';
  ctx.globalAlpha = 0.8;
  for (const dx of [-0.32, 0.32]) {
    ctx.beginPath(); ctx.ellipse(cx + dx * s, cy + 0.08 * s, 0.07 * s, 0.045 * s, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (hat) hardHat(ctx, cx, cy, s, 0.3);
}

export function monkeyBarrier(ctx, w, h, { brown = '#a8642e', mask = '#f6d2a8', hat = false } = {}) {
  const { cx, cy, s } = animalBarrier(ctx, w, h, {
    body: brown, belly: mask,
    ears: (c, x, y, k) => {
      for (const dx of [-0.46, 0.46]) {
        shape(c, brown, ellipse(x + dx * k, y, 0.14 * k, 0.14 * k));
        shape(c, mask, ellipse(x + dx * k, y, 0.08 * k, 0.08 * k), 0.4);
      }
    },
  });
  // The monkey's pale face mask.
  shape(ctx, mask, ellipse(cx, cy + 0.03 * s, 0.32 * s, 0.25 * s), 0.6);
  face(ctx, cx, cy, s, { cheeks: '#ff7a8a', eyeGap: 0.14 });
  if (hat) hardHat(ctx, cx, cy, s, 0.26);
}

export function rabbitBarrier(ctx, w, h, { white = '#f4f0f4', belly = '#ffd8e4', inner = '#ff9ab8', hat = false } = {}) {
  const { cx, cy, s } = animalBarrier(ctx, w, h, {
    body: white, belly,
    // Tall ears — the one candidate drawn taller than its box, and the ears are all
    // it spends up there: thin, and above the part you would run into.
    ears: (c, x, y, k) => {
      for (const dx of [-0.16, 0.16]) {
        shape(c, white, ellipse(x + dx * k, y - 0.5 * k, 0.09 * k, 0.3 * k));
        shape(c, inner, ellipse(x + dx * k, y - 0.48 * k, 0.045 * k, 0.2 * k), 0.4);
      }
    },
  });
  face(ctx, cx, cy, s, { eyeGap: 0.2 });
  if (hat) hardHat(ctx, cx, cy, s, 0.26);
}

export function pandaBarrier(ctx, w, h) {
  const white = '#f6f6f2';
  const { cx, cy, s } = animalBarrier(ctx, w, h, {
    body: white, belly: '#e2e2de',
    ears: (c, x, y, k) => {
      for (const dx of [-0.34, 0.34]) shape(c, '#2a2a30', ellipse(x + dx * k, y - 0.26 * k, 0.12 * k, 0.12 * k));
    },
  });
  // The eye patches, then eyes inside them.
  ctx.fillStyle = '#2a2a30';
  for (const dx of [-0.17, 0.17]) {
    ctx.beginPath(); ctx.ellipse(cx + dx * s, cy - 0.02 * s, 0.1 * s, 0.08 * s, dx * 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  for (const dx of [-0.17, 0.17]) {
    ctx.beginPath(); ctx.arc(cx + dx * s, cy - 0.03 * s, 0.03 * s, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.ellipse(cx, cy + 0.1 * s, 0.05 * s, 0.035 * s, 0, 0, Math.PI * 2); ctx.fill();
}

// Two little frogs holding up a striped bar between them — the barricade as a whole
// fence rather than one post. The widest read of the set, in the same box.
export function frogBarricade(ctx, w, h) {
  const green = '#48b84a';
  // The bar.
  const barY = h * 0.42;
  hazardFoot(ctx, w * 0.12, barY, w * 0.76, h * 0.16);
  for (const px of [w * 0.14, w * 0.86]) {
    // A post each end, standing on its own foot.
    shape(ctx, '#f6d33c', rrect(px - w * 0.1, h * 0.84, w * 0.2, h * 0.16, 1));
    shape(ctx, green, rrect(px - w * 0.07, h * 0.5, w * 0.14, h * 0.36, w * 0.06));
    shape(ctx, green, ellipse(px, h * 0.34, w * 0.13, h * 0.13));
    for (const dx of [-0.055, 0.055]) {
      shape(ctx, '#ffffff', ellipse(px + dx * w, h * 0.22, w * 0.045, h * 0.05), 0.4);
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(px + dx * w, h * 0.22, w * 0.02, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.arc(px, h * 0.34, w * 0.06, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  }
}

// The set, in the order the gallery shows it. `size` is the art over the 13x12 box.
// Round two (Peter, 24 Sep: "i like the panda barricade, introduce that... can we do a
// few more variations on the other animals? no vending machine or red lantern"): the
// panda ships; the others come in their other colours and in hard hats.
export const NEON_STREET_CANDIDATES = [
  { id: 'panda', name: 'SHIPS · panda barrier', paint: pandaBarrier, size: 1.5,
    note: 'In the game from 24 Sep: the regular among the neon lane\'s cactus swaps.' },
  { id: 'frog', name: 'SHIPS · A1 frog barrier', paint: frogBarrier, size: 1.5,
    note: 'Kaeru — the classic, and a pun: "kaeru" also means "return home (safely)".' },
  { id: 'frog-yellow', name: 'A2 · yellow frog', size: 1.5,
    paint: (c, w, h) => frogBarrier(c, w, h, { green: '#f2c230', belly: '#fff4c8' }),
    note: 'The same frog in safety yellow — it matches its own hazard foot.' },
  { id: 'frog-hat', name: 'A3 · frog in a hard hat', size: 1.5,
    paint: (c, w, h) => frogBarrier(c, w, h, { hat: true }),
    note: 'On the job: a construction helmet between the eyes.' },
  { id: 'monkey', name: 'B1 · monkey barrier', paint: monkeyBarrier, size: 1.5,
    note: 'Saru, the other common one. Brown with a pale face mask and round ears.' },
  { id: 'monkey-snow', name: 'B2 · snow monkey', size: 1.5,
    paint: (c, w, h) => monkeyBarrier(c, w, h, { brown: '#c8c2bc', mask: '#ff9a9a' }),
    note: 'The Japanese macaque: grey fur and the famous red face.' },
  { id: 'monkey-hat', name: 'SHIPS · B3 monkey in a hard hat', size: 1.5,
    paint: (c, w, h) => monkeyBarrier(c, w, h, { hat: true }),
    note: 'The site foreman.' },
  { id: 'rabbit', name: 'C1 · rabbit barrier', paint: rabbitBarrier, size: 1.5,
    note: 'Usagi. White and pink; its ears rise above the box, thin, above the part you would hit.' },
  { id: 'rabbit-pink', name: 'C2 · pink rabbit', size: 1.5,
    paint: (c, w, h) => rabbitBarrier(c, w, h, { white: '#ffc4d8', belly: '#fff0f4', inner: '#ff6f9a' }),
    note: 'All pink — the loudest of the set.' },
  { id: 'rabbit-hat', name: 'C3 · rabbit in a hard hat', size: 1.5,
    paint: (c, w, h) => rabbitBarrier(c, w, h, { hat: true }),
    note: 'The ears come out through the helmet, which is the joke.' },
  { id: 'fence', name: 'E · frog barricade', paint: frogBarricade, size: 1.5,
    note: 'Two little frogs holding a striped bar between them: the barrier as a whole fence.' },
];
