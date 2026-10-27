// WHICH DESK BOOTS WINDOWS 3.1 FOR office-2's TA-DA, and which stretch of the floor is kept free
// of blue screens round it. One place, because two things have to agree: the backdrop paints it
// (index.js) and the run only plays the ta-da if there is a monitor to turn (run.js: Peter,
// 26 Oct, "dont play tada if monitor isn't going to show").
import { officeFrame, FACTORS, OFFICE_ZOOM } from '../officeClimb.js';
import { OFFICE_CORRIDORS, officeLandmarks, officeFurnitureCuts } from './progression.js';
import { deskMonitorX, deskBlueScreen } from './win31.js';

// The desks on screen from a second before the ta-da to the end of the Windows monitor's hold, in
// the furniture's own absolute coordinates: [a, b] or null. `tadaCam` is the camera the ta-da is
// predicted to land at.
const NO_BLUE_BEFORE = 350, NO_BLUE_AFTER = 950;
export function noBlueZone(floor, tadaCam) {
  if (tadaCam == null) return null;
  const rate = (OFFICE_CORRIDORS[floor].mid.factor ?? FACTORS.mid) * OFFICE_ZOOM;
  return [(tadaCam - NO_BLUE_BEFORE) * rate - 60, (tadaCam + NO_BLUE_AFTER) * rate + 540];
}

/** Whether this desk's monitor is a blue screen at the moment, given the stretch kept clear. */
export function blueNow(d, midShift, zone) {
  if (!deskBlueScreen(d)) return false;
  const ax = deskMonitorX(d) + midShift;
  return !(zone && ax > zone[0] && ax < zone[1]);
}

/**
 * The desk (its evacKey) whose monitor turns to Windows when the camera is at `cam`: an empty
 * desk on a green terminal, clear of every cut, nearest 300 across the picture. Null when none
 * is on show then, which is also the answer to "should the ta-da play at all".
 */
export function win31Pick(floor, cam, totalDist, coverage = { left: -64, right: 544 }) {
  if (!OFFICE_CORRIDORS[floor] || !Number.isFinite(cam) || !Number.isFinite(totalDist)) return null;
  const at = officeFrame(floor, cam, 0, coverage, OFFICE_CORRIDORS[floor]);
  at.totalDist = totalDist;
  const zone = noBlueZone(floor, cam);
  const cuts = officeFurnitureCuts(at, officeLandmarks(floor, cam, totalDist));
  const clear = (x) => !cuts.some(([a, b]) => x > a - 8 && x < b + 8);
  let pick = null;
  for (const [lo, hi] of [[150, 430], [60, 450]]) {
    for (const m of at.mid.items) if (m.kind === 'cubicles') for (const d of m.desks) {
      const mx = deskMonitorX(d);
      if (d.occupied || blueNow(d, at.mid.shift, zone) || mx < lo || mx > hi || !clear(mx)) continue;
      if (!pick || Math.abs(mx - 300) < Math.abs(deskMonitorX(pick) - 300)) pick = d;
    }
    if (pick) break;
  }
  return pick ? pick.evacKey : null;
}
