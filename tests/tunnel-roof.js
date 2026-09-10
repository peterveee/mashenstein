// THE ROOF OF A TUNNEL IS NOT SOMEWHERE A HOLE MAY BE.
//
// A tunnel is a low road with the lane running over the top of it, so that lane
// is the upper of two paths and it is the one surface on a stage that cannot
// carry a fatal break: there is a floor ninety-six pixels underneath it. The
// ways in are `tunnelOpenings` — the mouth, the mid-span holes, the roof gap —
// and every one of them is a gap obstacle carrying `tunnel`, which is what stops
// falling through it being the death a hole usually is.
//
// An ORDINARY lane pit over the same stretch carries no such thing. `collide`'s
// isGap branch kills for it, `tunnelMouthAt` does not recognise it as a way in,
// and the renderers do not agree it exists — the roof slab draws straight across
// a break it was never told about. Scripted pits are authored clear of a
// cabinet's tunnels (spawnScriptedPits says so in as many words); nothing was
// covering the spawn BAG, and plumber deals a tier-2 `gap` pattern from the same
// bank as its crates. About one plumber-3 run in eight cut a tar pit into the
// roof of its own underground section.
//
// Two claims, over real headless runs across many seeds and all three
// difficulties: no lane pit is ever LIVE inside a tunnel's span, and none ever
// reaches the frame. The second is the weaker-looking one and it is the reason
// the sweep may retire these outright rather than through `retireExit`: the lane
// is filled some six hundred pixels ahead of a three-hundred-pixel view, so one
// of these is always cut off screen and always swept on the frame it is laid.
import { installDom } from './dom-stub.js';
installDom();

const { RunState } = await import('../src/game/run.js');
const { save } = await import('../src/engine/save.js');
const { Input } = await import('../src/engine/input.js');
const { DemoBot } = await import('../src/game/bot.js');
const { STAGES } = await import('../src/data/stages.js');
const { CABINET_BY_ID } = await import('../src/data/cabinets.js');
const { W } = await import('../src/engine/renderer.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

save.load();
save.newSlot(0, 0);

const TICK = 1 / 60;
const MAX_TICKS = 60 * 60 * 4;
const TEAM = ['lorenzo', 'gnash', 'clara'];
const SEEDS = 14;

// Every stage of every cabinet that declares a tunnel. Plumber is the one that
// also deals a pit from its bag, which is what made this reachable — but the
// claim is about the mechanism, not about the one cabinet that exposed it.
const PLAY = STAGES.filter((s) => (CABINET_BY_ID[s.cabinet].tunnels || []).length);
assert(PLAY.length > 0, `there are stages with tunnels to test (${PLAY.length})`);

let live = 0;
let onScreen = 0;
let tunnelsSeen = 0;
// The closest any of them ever came to the right edge of the frame.
let lead = Infinity;
const worst = [];

for (const stage of PLAY) {
  for (const difficulty of [0, 1, 2]) {
    for (let seed = 1; seed <= SEEDS; seed++) {
      let result = null;
      const run = new RunState({
        stage, team: TEAM, save, seed: seed * 7919 + difficulty, difficulty,
        onEnd: (r) => { result = r; },
      });
      run.enter();
      const bot = new DemoBot(run);
      let sawTunnel = false;
      let ticks = 0;
      while (!result && ticks < MAX_TICKS) {
        ticks++;
        bot.update(TICK);
        run.update(TICK);
        const tunnels = run.routes.filter((r) => r.kind === 'tunnel');
        if (tunnels.length) sawTunnel = true;
        for (const ob of run.obstacles) {
          // A mouth, a mid-span hole and the roof gap all carry `tunnel`, and a
          // route's own furniture carries `route`. What is left is the lane's.
          if (!ob.live || !ob.def || !ob.def.isGap || ob.tunnel || ob.route) continue;
          for (const r of tunnels) {
            if (ob.x + ob.w <= r.x || ob.x >= r.x + r.w) continue;
            live++;
            // Measured the way the renderer measures it.
            const viewRight = run.camX + W / run.camZoom;
            lead = Math.min(lead, ob.x - viewRight);
            if (ob.x <= viewRight && ob.x + ob.w >= run.camX) {
              onScreen++;
              if (worst.length < 6) {
                worst.push(`${stage.id} d${difficulty} seed ${seed}: pit `
                  + `${ob.x.toFixed(0)}..${(ob.x + ob.w).toFixed(0)} in the roof of a tunnel `
                  + `spanning ${r.x.toFixed(0)}..${(r.x + r.w).toFixed(0)}`);
              }
            }
          }
        }
      }
      if (sawTunnel) tunnelsSeen++;
      bot.releaseAll();
      Input.endFrame();
    }
  }
}

const runs = PLAY.length * 3 * SEEDS;
// Not every tunnel-declaring stage ends up with one — buildRoutes drops a road
// that would collide with the set piece next to it, which is why plumber-2 has
// a crossing where its chamber is authored. What the suite may not do is pass
// on nothing.
assert(tunnelsSeen > 0, `runs that actually built a tunnel: ${tunnelsSeen}/${runs}`);
for (const w of worst) console.error('  ', w);
assert(onScreen === 0,
  `no lane pit in a tunnel roof ever reaches the frame (${onScreen} in ${runs} runs)`);
// AND NONE IS EVER WITHIN REACH OF ONE, which is the residue this leaves and
// the honest way to state it. The sweep only looks at a route once it is inside
// the lane's own fill window, and a pattern that starts inside that window may
// lay a cell a few pixels past it — so a pit can exist over a roof for the
// handful of frames before its tunnel comes into range. It is half a screen
// beyond the right edge the whole time and gone long before the camera is near
// it. If this margin ever goes soft, the window has stopped being a technicality.
assert(lead === Infinity || lead > 240,
  `and any that briefly exist stand well beyond the frame `
  + `(closest approach ${lead === Infinity ? 'n/a' : `${lead.toFixed(0)}px past the right edge`}, `
  + `${live} in ${runs} runs)`);

process.exit(failed ? 1 : 0);
