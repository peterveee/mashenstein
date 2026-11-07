// STAIRS A/B — a dev toggle between two staircase framings. 6 Nov 2026.
//
// Peter is choosing how the camera frames the 95/128 steps:
//   RE-PIN — the anchor re-pins on the steps, so the world moves past a standing hero;
//   CRANE  — today's framing: the crane alone holds the steps.
// run.js anchorFreeBand() reads camStairs.rePin every frame, so Dev menu ▸ RUN ▸ STAIRS takes
// effect on the next frame, no restart. The choice is remembered per browser (localStorage),
// read once here so the per-frame reader never touches storage.
//
// Remove this file and the menu row once he has chosen.

const KEY = 'mash-dev-cam-stairs';

let rePin = true;
try { rePin = localStorage.getItem(KEY) !== 'crane'; } catch { rePin = true; }

/** RE-PIN, unless the dev menu has picked CRANE in this browser. */
export const camStairs = {
  get rePin() { return rePin; },
  set rePin(v) {
    rePin = !!v;
    try { if (rePin) localStorage.removeItem(KEY); else localStorage.setItem(KEY, 'crane'); } catch { /* not remembered */ }
  },
};
