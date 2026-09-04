// THE VILLAIN PLAYS THE SAME GAME AT EVERY FRAMING.
//
// The chase mission is won by putting something into the underside of a flying
// tub: the hero's head out of a jump, or a barrel off the boot. Both of those
// are WORLD physics — a punted barrel tops out at the same altitude and travels
// at the same multiple of the run speed whatever the camera is doing — so
// anything about the copter that is quoted in SCREEN terms turns the same input
// into a different outcome on each machine.
//
// It had two. His altitude band was hung off the rhythm ribbon, which sits at a
// fixed frame y, so the sky under it was worth 85 world units at the 1.6
// framing and 59 at 2.0: the roam ran 50..81 at NORMAL and 50..55 at ZOOM IN,
// and since a punted barrel only reaches alt 61, the same perfect kick landed
// on one framing and never on the other. And his cruise was a share of the
// frame (VIEW_W * 0.58), so he sat 115 world units ahead of the hero at NORMAL
// and 80 at ZOOM IN, which met the barrel at a different point of its arc.
// Measured with every barrel punted perfectly, the pair cost 6% of kicks
// against 55% on speed-2, and 22% against 63% on cardboard-3.
//
// So this suite plays the chase stages at both desktop framings and asserts the
// two things a player would call fair: he flies at the same altitudes, and the
// same kick connects the same number of times.
import { installDom } from './dom-stub.js';
installDom();

const { RunState, ZOOM_NORMAL, ZOOM_CLOSE } = await import('../src/game/run.js');
const { save } = await import('../src/engine/save.js');
const { DemoBot } = await import('../src/game/bot.js');
const { STAGES } = await import('../src/data/stages.js');
const { CABINET_BY_ID } = await import('../src/data/cabinets.js');
const { Audio } = await import('../src/engine/audio.js');
const { bank: rhythmBank } = await import('../src/data/songs/rhythm.js');
const { startPunt, puntTuneFor, HEAVY_PUNT } = await import('../src/game/punt.js');
const { OBSTACLES } = await import('../src/game/entities.js');
const { COPTER_HULL } = await import('../src/game/draw.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

save.load(); save.newSlot(0, 0);
const TICK = 1 / 60, MAX = 60 * 60 * 4;
const CHASES = STAGES.filter((s) => s.mission.type === 'chase');

// The highest copter alt a punted barrel can touch, from the arc rather than
// from a number typed twice — the same derivation run.js makes.
const REACH = HEAVY_PUNT.launchVy ** 2 / (2 * HEAVY_PUNT.gravity)
  + OBSTACLES.barrel.h - COPTER_HULL.floor;

/**
 * One run with PERFECT KICKS: every heavy barrel is punted the frame it reaches
 * the hero's boot, on exactly the launch the slide kick gives it. The bot plays
 * the rest of the stage, so the copter is doing everything a live run makes him
 * do — passes, dodges, recoils — rather than hovering in a vacuum.
 */
function play(stage, zoomIn, seed) {
  save.settings.zoomIn = zoomIn;
  const cab = CABINET_BY_ID[stage.cabinet];
  const beat = cab.mechanic === 'beat';
  let t = 0;
  Audio.sourceBank = beat ? cab.music : null;
  if (beat) Audio.songBeat = () => (t * rhythmBank.bpm) / 60;
  let result = null;
  const run = new RunState({
    stage, team: ['lorenzo', 'gnash', 'clara'], save, seed, difficulty: 1,
    onEnd: (r) => { result = r; },
  });
  run.enter();
  const bot = new DemoBot(run);
  const kicked = new Set();
  const tally = { kicks: 0, hits: 0, altMin: Infinity, altMax: -Infinity };
  let ticks = 0;
  while (!result && ticks < MAX) {
    ticks++; t += TICK;
    bot.update(TICK); run.update(TICK);
    const pb = run.playerBox();
    for (const ob of run.obstacles) {
      if (!ob.live || ob.punted || ob.def?.punt !== 'heavy') continue;
      if (ob.x < pb.x + pb.w + 6 && ob.x + ob.w > pb.x - 2) {
        startPunt(ob, run.speed, puntTuneFor(ob));
        ob.puntCued = true;
        kicked.add(ob);
        tally.kicks++;
      }
    }
    for (const ob of kicked) if (ob.copterHit) { tally.hits++; kicked.delete(ob); }
    const c = run.copter;
    // The arrival is a flight in from off the edge and the exit is a departure;
    // neither is the roam this is about.
    if (c && !c.flyOff && c.arrived) {
      tally.altMin = Math.min(tally.altMin, c.alt);
      tally.altMax = Math.max(tally.altMax, c.alt);
    }
  }
  return tally;
}

function sweep(stage, zoomIn) {
  const out = { kicks: 0, hits: 0, altMin: Infinity, altMax: -Infinity };
  for (let s = 1; s <= 8; s++) {
    const r = play(stage, zoomIn, s * 101);
    out.kicks += r.kicks; out.hits += r.hits;
    out.altMin = Math.min(out.altMin, r.altMin);
    out.altMax = Math.max(out.altMax, r.altMax);
  }
  return out;
}

for (const stage of CHASES) {
  const near = sweep(stage, false);   // NORMAL, 1.6
  const far = sweep(stage, true);     // ZOOM IN, 2.0
  // The roam is a world band, so the heights he uses are the same heights. A
  // couple of units of slack for the one thing that is honestly a screen fact:
  // on the cabinet with a rooftop gorilla he dips under its chin, and a chin is
  // painted at a frame y.
  const slack = stage.id === 'rhythm-3' ? 20 : 2;
  assert(Math.abs(near.altMax - far.altMax) <= 2,
    `${stage.id}: he tops out at the same altitude at both framings `
    + `(${near.altMax.toFixed(0)} vs ${far.altMax.toFixed(0)})`);
  assert(Math.abs(near.altMin - far.altMin) <= slack,
    `${stage.id}: and bottoms out at the same one `
    + `(${near.altMin.toFixed(0)} vs ${far.altMin.toFixed(0)})`);
  // AND HE IS NEVER OUT OF THE SHOT'S REACH. The top of the band is what makes
  // the mission possible with freight rather than only with a jump.
  assert(near.altMax <= REACH && far.altMax <= REACH,
    `${stage.id}: a punted barrel reaches him at his highest (band tops at `
    + `${Math.max(near.altMax, far.altMax).toFixed(0)}, a barrel reaches ${REACH.toFixed(0)})`);
  // The streams are not identical — VIEW_W still decides how far ahead the
  // spawner fills — so this is a rate, not a count. It used to be 6% against
  // 55%; a tenth of the kicks is far tighter than that and still tolerates the
  // different roads.
  const rate = (r) => (r.kicks ? r.hits / r.kicks : 0);
  assert(near.kicks > 4 && far.kicks > 4, `${stage.id}: the sweep actually kicked barrels `
    + `(${near.kicks} / ${far.kicks})`);
  assert(Math.abs(rate(near) - rate(far)) <= 0.1,
    `${stage.id}: the same perfect kick connects at the same rate `
    + `(${(100 * rate(near)).toFixed(0)}% vs ${(100 * rate(far)).toFixed(0)}%)`);
}

console.log(failed ? 'COPTER FAIRNESS: FAILED' : 'COPTER FAIRNESS: PASSED');
process.exit(failed ? 1 : 0);
