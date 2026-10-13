// NOTHING OUTSIDE THE STATION POPS IN OR OUT ON SCREEN (Peter, 13 Oct 2026:
// "we must not have background items popping in or out while on screen").
//
// Walks whole Gravity Grid stages frame by frame through the room painter with
// the outside trace on (src/dev/space-life.js OUTSIDE_TRACE): every object
// outside — craft, planets, outposts, shelves and buttes, the saucer, the
// astronaut — logs its name and view-space x each frame. An object whose whole
// width is inside the frame must still be there next frame (within a frame's
// travel), and must have been there the frame before. Fading things (aurora,
// meteors, the shooting star) are exempt by construction: they are not traced.
import { installDom } from './dom-stub.js';
installDom();
const { SPACE_LOOKS, drawSpaceRoom } = await import('../src/dev/space-look-candidates.js');
const { OUTSIDE_TRACE } = await import('../src/dev/space-life.js');

let failed = false;
const fails = [];
const VIEW = 480 / 1.6 + 60, SPEED = 150, FPS = 60, SLACK = 9;
const ctx = (() => {
  const noop = () => {}, g = { addColorStop: noop };
  return new Proxy({ globalAlpha: 1, createLinearGradient: () => g, createRadialGradient: () => g, measureText: () => ({ width: 0 }) },
    { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
})();
const gates = [5, 13, 18.5, 29, 37, 45, 54, 63, 72, 78].map((at, index) => ({ x: 59 + at * SPEED, lane: (index + 1) % 2, index }));
for (const [id, stage] of [['plateau-occasional', 1], ['plateau-occasional', 3], ['life-jade', 1]]) {
  const look = SPACE_LOOKS[id];
  const seconds = 96, length = seconds * SPEED;
  let prev = null;
  OUTSIDE_TRACE.on = true;
  for (let f = 0; f < seconds * FPS; f++) {
    const t = f / FPS, cam = t * SPEED;
    OUTSIDE_TRACE.frame = [];
    drawSpaceRoom(ctx, look, { cam, view: VIEW, top: -200, bottom: 60, time: t, gates, length, stage });
    const now = OUTSIDE_TRACE.frame;
    // 'boom' is an explosion: an event, and anything it covers may go with it.
    const booms = now.filter((o) => o.name === 'boom');
    const blownUp = (o) => booms.some((b) => Math.abs(b.x - o.x) < b.half + o.half);
    // Above the windows' top (-134 less a saucer's height) is out of sight too.
    const inside = (o) => o.name !== 'boom' && !(o.y != null && o.y < -150) && o.x - o.half > 0 && o.x + o.half < VIEW - 60;
    const near = (list, o, dx) => list.some((p) => p.name === o.name && Math.abs(p.x - o.x) <= dx);
    if (prev) {
      // Scenery scrolls with the camera, so allow one frame of scroll as well.
      const dx = SLACK + SPEED / FPS;
      // An object marked `ending` is exploding: its going is the picture.
      for (const o of prev) if (inside(o) && !o.ending && !blownUp(o) && !near(now, o, dx)) fails.push(`${id}/${stage} t=${t.toFixed(2)}: ${o.name} at x=${o.x.toFixed(0)} vanished on screen`);
      for (const o of now) if (inside(o) && !near(prev, o, dx)) fails.push(`${id}/${stage} t=${t.toFixed(2)}: ${o.name} at x=${o.x.toFixed(0)} appeared on screen`);
    }
    prev = now;
  }
  OUTSIDE_TRACE.on = false;
}
if (fails.length) { failed = true; for (const f of fails.slice(0, 25)) console.error('FAIL:', f); console.error(`(${fails.length} in all)`); }
else console.log('ok: nothing outside appears or vanishes on screen through three whole stages, the invasion included');
console.log(failed ? 'SPACE NO-POPOUT: FAILED' : 'SPACE NO-POPOUT: PASSED');
process.exit(failed ? 1 : 0);
