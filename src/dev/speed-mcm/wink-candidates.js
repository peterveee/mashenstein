// SPEED ZONE mid-century — THE COYOTE'S WINK, bake-off (Peter, 28 Sep 2026: "can we do a
// bake off for the smile animation of the coyote... some variation... the smile looks
// off, perhaps we don't need a smile or could have the head move left/right - be
// creative"). Every candidate is a timeline for the shipped square-on Jones figure
// (speedMcmCoyote.js jonesFrontFigure) over the paper winker's 6 s show, so the winner
// drops into JONES_MODEL.wink unchanged — including speed-3's finish, where the show sits
// still at u 5.5 blinking (`idle`) until the hero is on the pad. Gallery-only.
import {
  jonesFrontFigure, jonesFrontFrame, jonesWinkStar, jonesIdleBlink, jonesFlick,
  jonesWinkShow, jonesGrinShow, drawCoyoteModel, JONES_MODEL, part, poly, oval, smooth,
} from './coyote.js';
import { drawTextVectorCentered, textYForMid } from '../../engine/sprites.js';

const hold = (a, b, c, d, u) => smooth(a, b, u) * (1 - smooth(c, d, u));

// Frame, figure, and the wink's star when the pose has one.
function stage(ctx, t, K, u, idle, f, { star = true, extra = null, after = null } = {}) {
  f.blink = idle != null ? idle : (f.blink ?? jonesIdleBlink(u));
  f.flick = f.flick ?? jonesFlick(t);
  ctx.save();
  jonesFrontFrame(ctx);
  jonesFrontFigure(ctx, t, K, f, extra);
  if (star) jonesWinkStar(ctx, K, (u - 1.13) / 0.8);
  after?.();
  ctx.restore();
}
const wink = (u) => hold(0.8, 1.15, 2.3, 2.45, u);

// A: no smile. The brow and the wink alone; the ears prick at the wink.
function noSmile(ctx, t, K, u, idle = null) {
  stage(ctx, t, K, u, idle, {
    brow: hold(0.4, 0.7, 2.8, 3.1, u), wink: wink(u),
    tilt: 0.12 * hold(1.0, 1.3, 2.2, 2.5, u),
    flick: hold(0.85, 0.95, 1.1, 1.25, u) * 0.5,
  });
}

// B: the smirk. A closed mouth, one corner hooked up under a raised brow; the wink.
function smirk(ctx, t, K, u, idle = null) {
  stage(ctx, t, K, u, idle, {
    brow: hold(0.4, 0.7, 2.8, 3.1, u), wink: wink(u),
    smirk: hold(0.5, 0.9, 3.0, 3.4, u),
    tilt: 0.14 * hold(1.0, 1.3, 2.2, 2.5, u),
    wag: Math.sin(t * 10) * 0.7 * hold(1.2, 1.4, 2.5, 2.8, u),
  });
}

// C: look both ways. He glances left, down the road at the hero coming, then right after
// him, back square — and only then the slow wink. No smile.
function lookBoth(ctx, t, K, u, idle = null) {
  const look = -1 * hold(0.2, 0.5, 0.9, 1.15, u) + 1 * hold(1.1, 1.4, 1.8, 2.05, u);
  const w = hold(2.3, 2.6, 3.5, 3.65, u);
  stage(ctx, t, K, u, idle, {
    look, tilt: -0.1 * look,
    brow: hold(2.1, 2.4, 3.8, 4.1, u), wink: w,
  }, { star: false, after: () => jonesWinkStar(ctx, K, (u - 2.63) / 0.8) });
}

// D: Groucho. The brows bounce twice, the lids low and sly, a closed smirk, then the wink.
function groucho(ctx, t, K, u, idle = null) {
  const bounce = (a) => Math.max(0, Math.sin(((u - a) / 0.3) * Math.PI)) * (u > a && u < a + 0.3 ? 1 : 0);
  const b = bounce(0.35) + bounce(0.75);
  stage(ctx, t, K, u, idle, {
    brow: b, browR: b, lidMin: 0.46 + 0.25 * hold(0.2, 0.4, 1.0, 1.2, u),
    smirk: hold(0.3, 0.6, 3.0, 3.4, u), wink: hold(1.3, 1.6, 2.6, 2.75, u),
    tilt: 0.1 * hold(1.4, 1.7, 2.5, 2.8, u),
  }, { star: false, after: () => jonesWinkStar(ctx, K, (u - 1.63) / 0.8) });
}

// E: the salute. The near paw comes up smart to the brow as he winks, and down again.
function salute(ctx, t, K, u, idle = null) {
  stage(ctx, t, K, u, idle, {
    salute: hold(0.5, 0.85, 2.4, 2.8, u), wink: wink(u),
    brow: hold(0.9, 1.1, 2.4, 2.7, u), smirk: 0.6 * hold(0.9, 1.2, 2.6, 3.0, u),
    tilt: -0.08 * hold(0.85, 1.0, 2.3, 2.6, u),
  });
}

// F: the sign — the Jones gag. A placard on a stick pops up beside him (SHOW-OFF!), he
// looks at it, looks at us, and it goes down. The wink over the top of it.
function sign(ctx, t, K, u, idle = null) {
  const pop = hold(0.3, 0.55, 3.3, 3.6, u);
  const overshoot = u > 0.3 && u < 0.75 ? Math.sin(((u - 0.3) / 0.45) * Math.PI) * 0.12 : 0;
  const look = 0.8 * hold(0.7, 0.9, 1.3, 1.5, u);
  const extra = (pass) => {
    if (pop <= 0.01) return;
    const rise = (1 - pop) * 16 - overshoot * 6;
    ctx.save();
    ctx.translate(0, rise);
    // The stick in his near paw, the board beside his head.
    part(ctx, pass, poly([3.1, -2.5, 3.9, -2.5, 11.4, -19.5, 10.6, -19.6]), K.dark);
    part(ctx, pass, poly([7.4, -28.6, 19.4, -29.4, 19.7, -19.8, 7.7, -19.2]), K.cream);
    if (pass === 'paint') {
      ctx.save();
      ctx.translate(13.55, -24.25);
      ctx.rotate(-0.05);
      drawTextVectorCentered(ctx, 'SHOW', 0, textYForMid(-1.7, 0.2, 'bold'), K.tip, 0.2, 'bold');
      drawTextVectorCentered(ctx, 'OFF!', 0, textYForMid(1.8, 0.2, 'bold'), K.tip, 0.2, 'bold');
      ctx.restore();
    }
    part(ctx, pass, oval(3.6, -2.4, 1.0, 0.6), K.coat);
    ctx.restore();
  };
  stage(ctx, t, K, u, idle, {
    look, tilt: -0.06 * look,
    brow: hold(1.6, 1.9, 3.0, 3.3, u), wink: hold(1.8, 2.1, 2.9, 3.05, u),
  }, { star: false, extra, after: () => jonesWinkStar(ctx, K, (u - 2.13) / 0.8) });
}

// G: licks his chops. He eyes the hero hungrily — lids down, looking left — runs his
// tongue along his mouth, then remembers himself and winks.
function lick(ctx, t, K, u, idle = null) {
  const L = hold(0.5, 0.7, 1.7, 1.9, u);
  stage(ctx, t, K, u, idle, {
    look: -0.7 * hold(0.1, 0.4, 1.9, 2.2, u), lidMin: 0.46 + 0.2 * hold(0.1, 0.4, 1.9, 2.2, u),
    lick: L, lickX: Math.sin((u - 0.6) * 5.5),
    brow: hold(2.1, 2.4, 3.6, 3.9, u), wink: hold(2.3, 2.6, 3.4, 3.55, u),
  }, { star: false, after: () => jonesWinkStar(ctx, K, (u - 2.63) / 0.8) });
}

// H: the head-shake. A slow sorry-pal shake of the head — left, right, left — the ears
// swinging with it, then a wink to say he's fine. No mouth moves.
function shake(ctx, t, K, u, idle = null) {
  const on = hold(0.25, 0.45, 1.75, 2.0, u);
  const look = on * Math.sin((u - 0.25) * Math.PI * 2 * 1.2) * 0.9;
  stage(ctx, t, K, u, idle, {
    look, tilt: -0.12 * look, lidMin: 0.46 + 0.35 * on,
    brow: hold(2.0, 2.3, 3.4, 3.7, u), wink: hold(2.2, 2.5, 3.3, 3.45, u),
  }, { star: false, after: () => jonesWinkStar(ctx, K, (u - 2.53) / 0.8) });
}

const withShow = (show) => ({ ...JONES_MODEL, wink: show });
export const WINK_CANDIDATES = [
  { id: '0', name: 'THE GRIN (was shipped)', show: jonesGrinShow,
    note: 'The first cut: brow up, the wink with a star, the wide toothy Wile E. grin and a glint off a tooth. Peter: "the smile looks off".' },
  { id: 'A', name: 'NO SMILE', show: noSmile,
    note: 'The brow and the wink alone, the ears pricking at the wink; the mouth never moves.' },
  { id: 'B', name: 'THE SMIRK', show: smirk,
    note: 'A closed mouth with one corner hooked up and a dimple, under the raised brow; the wink; the tail wags.' },
  { id: 'C', name: 'LOOK BOTH WAYS', show: lookBoth,
    note: 'He glances left down the road at the hero coming, then right after him, back square — then the slow wink. No smile.' },
  { id: 'D', name: 'GROUCHO', show: groucho,
    note: 'Both brows bounce twice under low sly lids, a closed smirk, then the wink.' },
  { id: 'E', name: 'THE SALUTE', show: salute,
    note: 'The near paw comes up smart to the brow as he winks — a job well done — and down again.' },
  { id: 'F', name: 'THE SIGN', show: sign,
    note: 'The Jones gag: a placard on a stick pops up beside him — SHOW-OFF! — he looks at it, then winks at us over it.' },
  { id: 'G', name: 'LICKS HIS CHOPS', show: lick,
    note: 'He eyes the hero hungrily, lids down, and runs his tongue along his mouth — then remembers himself and winks.' },
  { id: 'H', name: 'HEAD-SHAKE', show: shake,
    note: 'A slow sorry-pal shake of the head, the ears swinging with it, eyes half shut — then a wink to say no hard feelings.' },
  { id: 'C+D', name: 'WATCHES THE HERO, THEN GROUCHO — SHIPS', show: jonesWinkShow,
    note: 'SHIPPED 28 Sep ("his head should be following the movement of the hero, then when he lands he faces forward and '
      + 'we get the wink with the groucho and smirk"): his head follows the hero in (see "at the finish"), turns square on '
      + 'as the hero lands, then both brows bounce twice under sly lids, a closed smirk, and the wink.' },
];

// One candidate on its ledge at 3.6x, looped on the 6 s show; `finish` plays the finish's
// wait instead (blinking 3 s, then the show once, then still).
export function drawWinkCandidate(ctx, t, cand, pal, P, ledge, W = 480, H = 270, finish = false) {
  ctx.fillStyle = pal.sky[2];
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = pal.sky[4];
  ctx.fillRect(0, H * 0.45, W, H * 0.55);
  ctx.fillStyle = pal.near.fill;
  ctx.fillRect(0, H * 0.82, W, H * 0.18);
  ctx.save();
  ctx.translate(W / 2, H * 0.84);
  ctx.scale(3.6 * (W / 480), 3.6 * (W / 480));
  ledge(ctx, 0, 0, pal, P);
  let mode = 'wink';
  let since = null;
  let look = 0;
  if (finish) {
    // A hero coming in from the left, passing him, and landing on the pad to his right.
    mode = 'winkWait';
    const k = ((t % 10) + 10) % 10;
    since = k < 3 ? null : k - 3;
    look = k < 3 ? -1 + 1.8 * smooth(0, 3, k) : 0.8;
  }
  drawCoyoteModel(ctx, t, 0, -12.4, 1, pal.coyote, withShow(cand.show), { mode, since, pace: 1, look });
  ctx.restore();
}
