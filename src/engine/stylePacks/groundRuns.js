// Shared solid spans for style-pack aprons: live gaps and tunnel roofs cut the body.
import { W } from '../renderer.js';

export function solidRuns(camX, obstacles, viewW = W) {
  const right = Math.max(0, Number.isFinite(viewW) ? viewW : W);
  const cuts = [];
  for (const ob of obstacles || []) {
    if (ob.live && ob.def && ob.def.isGap) cuts.push([ob.x - camX, ob.x - camX + ob.w]);
  }
  cuts.sort((a, b) => a[0] - b[0]);
  const runs = [];
  let open = 0;
  for (const [a, b] of cuts) {
    if (a > open) runs.push([open, Math.min(a, right)]);
    open = Math.max(open, b);
  }
  if (open < right) runs.push([open, right]);
  return runs.filter(([a, b]) => b > a);
}

// The pixel pack's apron is the ground UNDER the lane, not the lane surface.
// A tunnel roof owns that space, so foreground texture has to stop there even
// though the playable road continues across the overhang.
export function apronRuns(camX, obstacles, overhangs = [], viewW = W) {
  const cut = (overhangs || []).map((sp) => [sp.x - camX, sp.x + sp.w - camX]);
  const body = [];
  for (const [a, b] of solidRuns(camX, obstacles, viewW)) {
    let pieces = [[a, b]];
    for (const [ca, cb] of cut) {
      const next = [];
      for (const [p, q] of pieces) {
        if (ca > p) next.push([p, Math.min(q, ca)]);
        if (cb < q) next.push([Math.max(p, cb), q]);
      }
      pieces = next.filter(([p, q]) => q > p);
    }
    body.push(...pieces);
  }
  return body;
}

