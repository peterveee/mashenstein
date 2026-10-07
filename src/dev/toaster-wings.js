// THE GOLDEN TOASTER'S WINGS — a gallery bake-off (Peter, 7 Oct 2026, after its top was put in
// perspective: "much better, can we see with the different wings we just had?"). The wings from
// the redesign bake-off he turned down (A–E), each on the shipped toaster as it now is.
//
// A candidate is a finish (PROP_PAINTERS.appliance's `finish` argument) with a `wings(ctx, which,
// rig)` that draws its far wing before the casing and its near wing after, in the painter's
// authored, mirrored view, using the painter's own clock (rig.lift) and axes (rig.at(s, d): s along
// the face's top edge, d back across the cap) — the wings flap in 3D through them (flapWing).
// Review only: nothing in the game reads this file.

import { GOLD_TOASTER_FINISH } from '../sprites/props.js';

const WING = '#f6f5fa', WING_FAR = '#d5d4dc', QUILL = '#aaaab8', EDGE = 'rgba(64,61,78,0.4)';

const line = (ctx, col, lw, path) => {
  ctx.beginPath(); path(ctx);
  ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
};

/**
 * A FLAPPING wing (Peter, 7 Oct 2026: "theyre just moving back and forth, not flapping"). The
 * first cut swung each wing round its root in the picture's plane, like a windscreen wiper. A wing
 * beats about the body's long axis: its span swings from out sideways up over the back and down
 * again, and seen from the side and above that changes the wing's whole shape — tall at the top of
 * the stroke, short and foreshortened as it comes out towards you, dropping across the body on
 * the downstroke.
 *
 * So the wing is drawn in 3D, in toaster lengths, and projected through the painter's own axes
 * (rig.at: LONG back along the face's top edge, DEEP back across the cap): `side` 1 is the near
 * wing, out towards the viewer, -1 the far one. Its span runs `sweep` back from straight out and is
 * raised `up + beat * lift` (rad) — the painter's clock — and its chord runs back along the body.
 * The shape is the redesign bake-off's wing: a curved leading edge out to the tip and `n` scalloped
 * feathers back along the trailing edge, with a row of coverts and the partings drawn in.
 */
function flapWing(ctx, rig, root, side, { len = 0.7, chord = 0.46, n = 4, sweep = 0.5, up = 0.5, beat = 0.8,
  fill = WING, quill = QUILL, edge = EDGE } = {}) {
  const { w, h, u, lift } = rig;
  const o = rig.at(0, 0), lng = rig.at(1, 0), dp = rig.at(0, 1);
  const back = [lng[0] - o[0], lng[1] - o[1]];                       // one toaster length, back along it
  // one length out sideways (the cap is 0.6 deep) — seen from twice as high as the body is, so a
  // wing level with the cap still shows some of its face rather than going to a line
  const out = [-(dp[0] - o[0]) / 0.6 * side, -(dp[1] - o[1]) / 0.6 * 2 * side];
  const upV = [0, -0.59 * h];                                         // one length up (the face is 0.53h for 0.9 tall)
  const phi = up + beat * lift, cs = Math.cos(sweep), sn = Math.sin(sweep);
  const span = [0, 1].map((k) => cs * (Math.cos(phi) * out[k] + Math.sin(phi) * upV[k]) + sn * back[k]);
  // the wing's own coordinates: x from 0 out to -L along the span, y across the chord (+ is back)
  const map = (x, y) => [root[0] - x * span[0] + y * back[0], root[1] - x * span[1] + y * back[1]];
  const L = len, C = len * chord, lw = Math.max(0.34, u * 0.02);
  const trail = (t) => [-L * (1 - t), -0.15 * C + 0.6 * C * t + 0.32 * C * Math.sin(Math.PI * t)];
  ctx.beginPath();
  ctx.moveTo(...map(L * 0.03, -0.3 * C));
  ctx.bezierCurveTo(...map(-L * 0.3, -0.85 * C), ...map(-L * 0.78, -0.62 * C), ...map(-L, -0.15 * C));
  for (let i = 0; i < n; i++) {
    const [ax, ay] = trail(i / n), [bx, by] = trail((i + 1) / n);
    const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1;
    ctx.quadraticCurveTo(...map((ax + bx) / 2 - dy / d * C * 0.26, (ay + by) / 2 + dx / d * C * 0.26), ...map(bx, by));
  }
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = edge; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke();
  line(ctx, quill, lw * 0.8, (c) => {
    c.moveTo(...map(-L * 0.04, -0.12 * C)); c.quadraticCurveTo(...map(-L * 0.4, -0.38 * C), ...map(-L * 0.72, -0.2 * C));
    for (let i = 1; i < n; i++) {
      const [tx, ty] = trail(i / n);
      c.moveTo(...map(tx * 0.62, ty * 0.62 - 0.12 * C)); c.lineTo(...map(tx * 0.95, ty * 0.95));
    }
  });
}

/** A pair: the far wing before the casing, the near one after, from roots on the cap (s along it, d across). */
const pair = (o, near = [0.55, 0.15], far = [0.55, 0.85], farLen = o.len) => (ctx, which, rig) => {
  if (which === 'rear') flapWing(ctx, rig, rig.at(...far), -1, { ...o, len: farLen, fill: WING_FAR });
  else flapWing(ctx, rig, rig.at(...near), 1, o);
};

const candidate = (letter, name, note, wings) => ({ letter, name, note, finish: { ...GOLD_TOASTER_FINISH, wings } });

export const TOASTER_WING_CANDIDATES = [
  { letter: '0', name: 'TODAY (ships)', note: 'The wings it has now: one big wing wrapped across its side, a small one tucked behind its shoulder.', finish: GOLD_TOASTER_FINISH },
  candidate('A', 'AFTER DARK',
    'Redesign A’s pair: big four-feather wings rising out of the top of the cap, one each side of the slot — the classic flying toaster.',
    pair({ len: 0.95, chord: 0.46, n: 4, sweep: 0.5, up: 0.2, beat: 1.1 })),
  candidate('B', 'BIG SCALLOP',
    'Redesign B’s wing: one broad three-scallop wing with a darker edge from high on the side, sweeping back, and a smaller one over the back.',
    (ctx, which, rig) => {
      const o = { chord: 0.55, n: 3, sweep: 0.75, up: 0.1, beat: 1, edge: 'rgba(90,54,8,0.7)' };
      if (which === 'rear') flapWing(ctx, rig, rig.at(0.5, 0.85), -1, { ...o, len: 0.8, fill: WING_FAR });
      else {
        const [x, y] = rig.at(0.42, 0);
        flapWing(ctx, rig, [x, y + rig.h * 0.12], 1, { ...o, len: 1.05 });
      }
    }),
  candidate('C', 'ANGEL',
    'Redesign C’s wings: long, narrow, five feathers each, sweeping well back past the toaster.',
    pair({ len: 1.3, chord: 0.36, n: 5, sweep: 0.6, up: 0.2, beat: 1.1 })),
  candidate('D', 'BIRD',
    'Redesign D’s spread, now a bird’s beat: wings straight out from the top, no sweep, a full stroke — they all but meet overhead, then drop below the body’s top.',
    pair({ len: 1.05, chord: 0.5, n: 4, sweep: 0.15, up: 0.3, beat: 1.25 }, [0.5, 0.2], [0.5, 0.8])),
  candidate('E', 'STUBBY',
    'Redesign E’s wings: short, round and three-feathered with a darker edge, beating hard.',
    pair({ len: 0.6, chord: 0.62, n: 3, sweep: 0.4, up: 0.25, beat: 1, edge: 'rgba(80,47,6,0.75)' }, [0.55, 0.2], [0.55, 0.7])),
];
