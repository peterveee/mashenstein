// Shared rendering for a stage's three plugs, used by the in-run HUD and the
// stage select list. Icons rather than letters: M/C/T needed a legend to be
// readable at all, and a toaster only reads as a toaster when it looks like one.
import { drawProp } from '../sprites/props.js';

// mission = the stage's own objective, challenge = the optional extra,
// toaster = the appliance.
//
// All three slots are PLUGS. The icons say how each one was EARNED, not what it
// is — which is why slot 0 is a work order and not a wall socket. The socket was
// the reward drawn in the reward's own column, so a row headed PLUGS read as one
// plug plus two other prizes instead of as three plugs earned three ways. The
// trophy already worked the right way round: it stands for CHALLENGE, not for
// coins-or-no-damage.
//
// The work order also has to cover every mission, and `reach` is only ten of the
// 27 stages — the rest are targets, cords, chase, rescue, onbeat, fuse, escape
// and blackout. That is what rules out the otherwise obvious breaker switch: it
// would depict one mission in three.
//
// The toaster slot points at plugToaster, HUD-only art, rather than at the
// `appliance` world prop it stands for. The world prop reserves the top fifth
// of its box for the toast launch and animates over 96 frames; drawn here at
// 8x8 with no frame argument it was a squashed toaster stuck on frame 0 with a
// slice sticking out of it. Same split as hudCoin/coin and cellFull/battery.
export const PLUG_ICONS = ['plugOrder', 'plugTrophy', 'plugToaster'];
export const PLUG_NAMES = ['MISSION', 'CHALLENGE', 'TOASTER'];

// Frame colours by state. Grouped rather than left as three loose constants so
// the gallery can render the row through a candidate palette without forking
// this function — see the frame colour bake-off in the gallery, which is kept
// as the record of why banked is what it is.
export const PLUG_FRAME_COLORS = {
  // Steel, not the old #f6d33c. That gold was the same hue as the TOASTER icon
  // it framed, so a banked tile was a gold border around a gold object and the
  // two merged at 8px — the same collision that sent the trophy to silver, one
  // layer out. Steel also agrees with the trophy's metal, so the frame now
  // belongs to the row rather than competing with one slot in it.
  banked: '#93a3ba',   // earned in an earlier run — yours for good
  live: '#48c848',     // on track this run, not banked until the run ends
  empty: '#3a3a48',
  // Strength of the soft outer pass; see PLUG_FRAME_HALO_LW. Overridable only
  // so the gallery can render the frame with it off for comparison.
  haloAlpha: 0.3,
};

// Corner radius as a fraction of the tile. Was 0.22, which at 8-13px left four
// visibly straight corners with a hard turn at each — the frame read as a box
// with the corners filed rather than as a rounded tile. 0.3 carries the curve
// through so the whole outline is one continuous sweep.
export const PLUG_FRAME_RADIUS = 0.3;

// Icon brightness, not just frame colour, carries banked/live/empty. The frame
// is a third-of-a-pixel hairline, so when a live icon also drew at full alpha
// the row read as "you have this" — a no-damage challenge is on track from the
// first frame, and its pip looked identical to one already banked.
export const ALPHA_BANKED = 1;
export const ALPHA_LIVE = 0.5;
export const ALPHA_EMPTY = 0.22;

export const PLUG_ROW_W = (size = 11) => size * 3 + 4;

// Which of the run's three plugs are in hand right now: already banked from an
// earlier attempt, or on track this one. The pause screen counts these and the
// mid-run goal toasts fire off the transitions, so both read the same rule —
// and it is the same rule endRun banks by, or the pause screen would promise a
// plug the results screen then withheld.
//
// The mission plug is never live mid-run: it only lands when you reach the
// socket, so a full counter is not yet a plug.
export function goalsDone(run) {
  if (run.overtime || !run.stage) return [false, false, false];
  const banked = run.save.slot.campaign.plugs[run.stage.id] || [false, false, false];
  const c = run.challenge;
  const live = [
    false,
    !!(c && !c.failed && (c.type === 'noDamage' ? run.damageTaken === 0 : c.count >= c.n)),
    run.applianceGot,
  ];
  return [0, 1, 2].map((i) => !!banked[i] || live[i]);
}

// Frame hairline weight. Exported so tests can pick the three frame strokes out
// of the draw stream by width without hardcoding a number that gets art-tuned.
export const PLUG_FRAME_LW = 0.35;

// The frame goes down as two passes, not one, and this is the outer.
//
// A single 0.35px stroke is thinner than the pixel it lands in, so along the
// corner arcs its coverage of each pixel swings between nearly full and nearly
// nothing depending on exactly where the curve crosses. That is what makes the
// ring look stepped: not a lack of antialiasing, but a hairline so thin that
// the antialiasing has almost no partial coverage to work with. Widening the
// line fixes the stepping and loses the design — a 1px ring was tried and read
// as a heavy border that fought the icon inside it.
//
// So: a wide, very transparent pass underneath spreads the edge across enough
// pixels for the coverage to ramp smoothly, and the hairline on top keeps the
// ring crisp and light. Total ink is close to the single hairline's; the edge
// has roughly three times the falloff to work with.
const PLUG_FRAME_HALO_LW = 1.15;

// Built by hand rather than via ctx.roundRect, which the headless test stub
// and older canvas implementations don't provide.
function roundRectPath(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

// banked/live are [mission, challenge, toaster] boolean triples. Unearned plugs
// keep their icon at low alpha so the row always reads as three fixed slots.
//
// `icons` exists only so the asset gallery can swap one slot's art and render
// a bake-off candidate through this exact function rather than a copy of it.
// The game never passes it.
//
// `frame` is the same escape hatch for the frame palette. Also gallery-only.
export function drawPlugRow(ctx, x, y, banked, live = [false, false, false], size = 11,
  icons = PLUG_ICONS, frame = PLUG_FRAME_COLORS) {
  for (let i = 0; i < 3; i++) {
    const bx = x + i * (size + 2);
    const has = !!(banked && banked[i]);
    const now = !has && !!(live && live[i]);
    // Rounded frame at a third of a game pixel: the canvas is 480x270 upscaled
    // ~5x, so even a 1px ring read as a heavy border that fought the icon
    // inside it. Radius stays a soft nick off the corners — at a third of the
    // box the slots read as squircles rather than pills. save/restore keeps the
    // hairline from leaking — a stale lineWidth once made this row render at a
    // different weight on each screen.
    ctx.save();
    ctx.strokeStyle = has ? frame.banked : now ? frame.live : frame.empty;
    ctx.fillStyle = '#181820';
    // Round join and cap so the four corner arcs meet the straights without a
    // mitre spike — at a hairline a mitre is the one thing that renders as a
    // hard pixel and it was showing up on all four corners.
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    roundRectPath(ctx, bx + 0.2, y + 0.2, size - 0.4, size - 0.4, size * PLUG_FRAME_RADIUS);
    ctx.fill();
    // Soft outer pass, then the hairline on top. See PLUG_FRAME_HALO_LW.
    const prevFrameAlpha = ctx.globalAlpha;
    ctx.globalAlpha = prevFrameAlpha * (frame.haloAlpha ?? 0.3);
    ctx.lineWidth = PLUG_FRAME_HALO_LW;
    ctx.stroke();
    ctx.globalAlpha = prevFrameAlpha;
    ctx.lineWidth = PLUG_FRAME_LW;
    ctx.stroke();
    ctx.restore();
    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = has ? ALPHA_BANKED : now ? ALPHA_LIVE : ALPHA_EMPTY;
    drawProp(ctx, icons[i], bx + 1.5, y + 1.5, size - 3, size - 3);
    ctx.globalAlpha = prevAlpha;
  }
}
