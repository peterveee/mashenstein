// THE SURGE's opening, surge-1 only (13 Oct 2026). Peter: "would like the first surge
// level to start off plain black with a single line for the ground and the foreground
// lines to indicate movement and then for all this to start at the beginning of bar 8
// … just the 1st level to introduce the effect. the sound track will kick in on bar 8".
// Then: "make it 4 bars … keep the first 4 area relatively simple.. no pits, some simple
// obstacles to jump over.. then on bar 5 go over the top with the glitches for half a
// bar before settling - just a hint of whats coming up ahead".
//
// So for the song's first four bars the Surge pack paints this instead of its cycle: a
// black frame, one thin line for the ground (broken where the lane is) and dashes
// streaming past under it at three depths. On the downbeat of bar 5 the cycle starts
// on its first look under half a bar of everything at once (surgeCut.js surgeBurst),
// then settles. run.js decides when bar 5 is, once per run, and hands it over as
// scene.surgeIntro; surge-1's layout keeps its opening 8% to plain jumps, no pits.
import { GROUND_Y } from '../camera.js';
import { W } from '../renderer.js';
import { solidRuns } from './groundRuns.js';
export { SURGE_BPM } from './surgeCut.js';

// Bar 5's downbeat, in beats from the song's start.
export const SURGE_INTRO_BEATS = 16;

const LINE = '#e8f0f4';
// Foreground streaks under the line: [depth below the ground, parallax, alpha, dash, gap].
const STREAKS = [
  [7, 1.15, 0.55, 14, 30],
  [15, 1.45, 0.4, 22, 46],
  [27, 1.9, 0.28, 34, 70],
];
const hash = (i) => { const s = Math.sin(i * 91.7 + 13.1) * 43758.5453; return s - Math.floor(s); };

function coverage(ctx) {
  const c = ctx.__mashBackgroundCoverage;
  return c && Number.isFinite(c.left) ? c : { left: 0, width: W };
}

export const SURGE_INTRO = Object.freeze({
  name: 'surge-intro',
  dark: true,
  bg(ctx) {
    const cov = coverage(ctx);
    ctx.fillStyle = '#000';
    ctx.fillRect(cov.left - 20, -400, cov.width + 40, 1200);
  },
  ground(ctx, camX, cab, obstacles, overhangs, t = 0, viewW = W, portraitViewW = null) {
    const drawW = Number.isFinite(portraitViewW) ? portraitViewW : viewW;
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.fillRect(-20, GROUND_Y, drawW + 40, 400);
    ctx.fillStyle = LINE;
    for (const [a, b] of solidRuns(camX, obstacles, drawW)) ctx.fillRect(a, GROUND_Y - 0.4, b - a, 0.8);
    // The streaks: fixed to the world at their own depth, so the nearer rows rush.
    for (const [dy, f, alpha, dash, gap] of STREAKS) {
      const step = dash + gap, off = camX * f;
      ctx.globalAlpha = alpha;
      for (let k = Math.floor(off / step) - 1; k * step - off < drawW + step; k++) {
        const len = dash * (0.6 + hash(k + dy) * 0.8);
        const x = k * step - off + hash(k * 3 + dy) * gap * 0.5;
        ctx.fillRect(x, GROUND_Y + dy, len, 0.6);
      }
    }
    ctx.restore();
  },
  post() {},
});
