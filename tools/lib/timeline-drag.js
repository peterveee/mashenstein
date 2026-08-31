// WHAT THE LEVEL EDITOR'S TIMELINE LETS YOU GRAB, AND WHERE IT LETS YOU PUT IT.
//
// The page owns the pointer; this owns the arithmetic — which pixel belongs to
// which set piece, and how far a thing may travel before it stops being
// something the writer will accept. It lives out here rather than in
// tools/level-editor-entry.js because it is the part with rules in it, and
// that file cannot be loaded without a browser.
//
// Positions are fractions of the stage throughout, the same currency the
// layout file speaks.

// A pin is two pixels of ink; a pointer needs more than that to catch one.
export const GRAB_PX = 8;

// Nothing here may land on 0 or 1: the writer's isFrac is exclusive at both
// ends, and a set piece on the tape is not a set piece.
const EDGE = 0.01;

// Two boundaries closer than this are a section nobody can see or click again.
export const MIN_SPAN = 0.02;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(Math.max(lo, hi), v));
const round3 = (v) => Math.round(v * 1000) / 1000;

function nearest(cands, f, tol) {
  let best = null;
  let bestD = tol;
  for (const c of cands) {
    const d = Math.abs(c.at - f);
    if (d <= bestD) { best = c; bestD = d; }
  }
  return best;
}

// What is under the pointer, if it is something with somewhere to be.
//
// `tol` is the grab radius as a fraction of the stage — the page turns GRAB_PX
// into it, because a lane's pixels only mean a fraction once you know how wide
// it was drawn. `grab` is the offset from pointer to thing, kept so a wide pit
// does not jump its centre under the cursor on the first pixel of a drag.
export function grabAt(laneId, m, f, tol) {
  if (laneId === 'setpieces') {
    // The narrow pins are tested before the wide bodies, so a toaster standing
    // over a pit is still the thing you catch. The finish dog is drawn on this
    // lane too and is deliberately absent: it is a chance, not a place, and the
    // run puts it on the tape.
    const pins = [{ kind: 'appliance', at: m.L.appliance.at }];
    if (m.L.rewindAt != null) pins.push({ kind: 'rewind', at: m.L.rewindAt });
    if (m.L.loopAt != null) pins.push({ kind: 'loop', at: m.L.loopAt });
    const pin = nearest(pins, f, tol);
    if (pin) return { kind: pin.kind, i: 0, grab: pin.at - f };
    for (const p of m.pits) {
      const from = p.x / m.totalDist;
      const to = (p.x + p.w) / m.totalDist;
      if (f >= from - tol && f <= to + tol) return { kind: 'pit', i: p.i, grab: p.at - f };
    }
    return null;
  }

  if (laneId === 'checkpoints') {
    const cp = nearest(m.L.checkpoints.map((at, i) => ({ i, at })), f, tol);
    return cp ? { kind: 'checkpoint', i: cp.i, grab: cp.at - f } : null;
  }

  if (laneId === 'sections') {
    const secs = m.L.sections || [];
    // Every span's end is a boundary except the last one's, which is the tape.
    const edge = nearest(secs.slice(0, -1).map((s, i) => ({ i, at: s.to })), f, tol);
    if (edge) return { kind: 'boundary', i: edge.i, grab: edge.at - f };
    // Away from a boundary, the body slides the whole stretch — both of its
    // edges at once. Only where it HAS both: the first section starts at the
    // start of the stage and the last one ends at the tape, and neither of
    // those is a thing anyone can move.
    const i = secs.findIndex((s) => f >= s.from && f < s.to);
    if (i > 0 && i < secs.length - 1) {
      return { kind: 'span', i, grab: secs[i].from - f, w: secs[i].to - secs[i].from };
    }
    return null;
  }

  if (laneId === 'routes') {
    // The ribbons are wide, and buildRoutes drops a road that would land on
    // another, so a body is the whole handle and there is nothing to break a
    // tie between. A crossing's stones carry no authored entry and are left
    // alone: the pit that owns them is on the lane above.
    for (const r of m.routes) {
      if (r.srcKind == null) continue;
      if (f >= r.x / m.totalDist && f <= (r.x + r.w) / m.totalDist) {
        return {
          kind: 'road', roadKind: r.srcKind, i: r.srcIndex,
          grab: r.srcAt - f, w: r.srcSpan,
        };
      }
    }
    return null;
  }

  return null;
}

// Where a grabbed thing may actually go: inside the stage, and never through
// whatever is beside it. Neighbours are walls rather than swaps — a drag that
// reordered the array under the pointer would leave the hand holding something
// else half way through the gesture.
export function dropAt(handle, m, f) {
  const wanted = f + handle.grab;

  if (handle.kind === 'pit') {
    const p = m.pits.find((q) => q.i === handle.i);
    const w = p ? p.w / m.totalDist : 0;
    return round3(clamp(wanted, EDGE, 1 - EDGE - w));
  }

  if (handle.kind === 'checkpoint') {
    const cps = m.L.checkpoints;
    const lo = handle.i > 0 ? cps[handle.i - 1] + EDGE : EDGE;
    const hi = handle.i < cps.length - 1 ? cps[handle.i + 1] - EDGE : 1 - EDGE;
    return round3(clamp(wanted, lo, hi));
  }

  if (handle.kind === 'road') {
    return round3(clamp(wanted, EDGE, 1 - EDGE - handle.w));
  }

  if (handle.kind === 'span') {
    // A stretch may slide up to its neighbours, and no further: the section
    // either side of it has to keep enough width to be seen and clicked.
    const secs = m.L.sections;
    const lo = (handle.i >= 2 ? secs[handle.i - 2].to : 0) + MIN_SPAN;
    const hi = (handle.i < secs.length - 1 ? secs[handle.i + 1].to : 1) - MIN_SPAN - handle.w;
    return round3(clamp(wanted, lo, hi));
  }

  if (handle.kind === 'boundary') {
    const secs = m.L.sections;
    const lo = (handle.i > 0 ? secs[handle.i - 1].to : 0) + MIN_SPAN;
    const hi = secs[handle.i + 1].to - MIN_SPAN;
    return round3(clamp(wanted, lo, hi));
  }

  return round3(clamp(wanted, EDGE, 1 - EDGE));
}
