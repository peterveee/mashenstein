// The act-ending flight's handover, run headless through the real RunState:
// 3-3 runs on past its tape (the camera never stops), writes the fight's
// checkpoint once at the tape, boards the tub, slides the screen out past the
// cabinet's edge and hands the frame to the flight — and never ends the run.
import assert from 'node:assert/strict';
import { installDom } from './dom-stub.js';

installDom({ innerWidth: 390, innerHeight: 844 });
window.__mash_platform = { isDesktop: false, isIphone: true };

const { frameForViewport } = await import('../src/engine/frame.js');
const { setPresentationFrame, W } = await import('../src/engine/renderer.js');
const { RunState } = await import('../src/game/run.js');
const { save } = await import('../src/engine/save.js');
const { STAGE_BY_ID } = await import('../src/data/stages.js');
const { CABINET_BY_ID } = await import('../src/data/cabinets.js');
const { Input } = await import('../src/engine/input.js');
const { Audio } = await import('../src/engine/audio.js');

save.load(); save.newSlot(0, 0);

// A song clock for the beat-placed hop: `beat0` is where the song is when the
// run starts, advanced by the test's own frames at 129 bpm.
let songT = null;
const realSongBeat = Audio.songBeat.bind(Audio);
function fakeSong(beat0) {
  songT = beat0 == null ? null : { beat: beat0 };
  Audio.songBeat = () => (songT ? songT.beat : realSongBeat());
  Audio.bpm = 129; Audio.tempo = 1;
}

function runToHandoff({ portrait, demo = false, flightExit = true }) {
  setPresentationFrame(frameForViewport(portrait
    ? { mode: 'phone-portrait', viewportWidth: 390, viewportHeight: 844 }
    : { mode: 'landscape', viewportWidth: 844, viewportHeight: 390 }));
  const stage = STAGE_BY_ID['rhythm-3'];
  const tapes = [], handoffs = [], ends = [];
  const run = new RunState({ stage, cabinet: CABINET_BY_ID.rhythm, save, seed: 7, difficulty: 1, skipRunIn: true,
    demo, flightExit,
    onEnd: (r) => ends.push(r),
    onFlightTape: (r, extra) => tapes.push({ r, extra }),
    onFlightHandoff: (a) => handoffs.push(a) });
  run.enter();
  run.camX = run.finishCameraX() - 30;
  run.distance = run.camX;
  run.obstacles = []; run.pickups = [];
  const trace = [];
  let lastCam = run.camX;
  for (let i = 0; i < 60 * 14 && !handoffs.length && !ends.length; i++) {
    // A press after the tape must change nothing: the boarding is a picture.
    if (run.fx && run.fx.phase !== 'approach' && i % 7 === 0) { Input.press?.('jump'); Input.press?.('slide'); }
    const songBefore = Audio.songBeat();
    run.update(1 / 60);
    // The song runs at whatever warp the run leaves it at, as the engine's does.
    if (songT) songT.beat += (1 / 60) * Audio.bpm * (Audio.tempo || 1) / 60;
    Input.endFrame?.();
    assert.ok(run.camX >= lastCam - 1e-9, `the camera never runs backward (${lastCam} -> ${run.camX})`);
    lastCam = run.camX;
    trace.push({ song: songBefore, ft: run.fx?.t, phase: run.fx?.phase, cam: run.camX, hx: run.heroScreenX(), py: run.player.y, slide: run.fx?.slide || 0, tub: run.fx?.tubDx,
      seated: !!run.fx?.seated, dead: run.dead, copter: run.copter && { flyOff: !!run.copter.flyOff, escape: !!run.copter.escape, dx: run.copter.dx } });
  }
  return { run, tapes, handoffs, ends, trace };
}

for (const portrait of [true, false]) {
  const tag = portrait ? 'portrait' : 'landscape';
  const { run, tapes, handoffs, ends, trace } = runToHandoff({ portrait });
  assert.equal(ends.length, 0, `${tag}: the run is never ended — the flight takes it over`);
  assert.equal(tapes.length, 1, `${tag}: the checkpoint is written once, at the tape`);
  const r = tapes[0].r;
  assert.equal(r.success, true); assert.equal(r.reason, 'FLIGHT CHECKPOINT'); assert.equal(r.stage.id, 'rhythm-3');
  assert.equal(r.coins >= r.timeBonusCoins, true, `${tag}: the clock's coins are in the held result`);
  assert.ok(Number.isFinite(tapes[0].extra.laneTempo), `${tag}: the tempo at the tape travels with it`);
  assert.equal(handoffs.length, 1, `${tag}: the frame is handed over once`);
  const bandW = run.fx.bandW;
  assert.ok(handoffs[0].scroll >= W + bandW, `${tag}: handed over once the passage fills the screen`);
  assert.ok(handoffs[0].scrollV > 0, `${tag}: the passage arrives moving`);
  const phases = [...new Set(trace.map((t) => t.phase).filter(Boolean))];
  assert.deepEqual(phases, ['approach', 'board', 'slide'], `${tag}: phases in order (${phases})`);
  assert.ok(trace.every((t) => !t.dead), `${tag}: nothing reaches him`);
  const firstSlide = trace.findIndex((t) => t.phase === 'slide');
  assert.ok(trace[firstSlide].seated, `${tag}: he is in the tub before the screen leaves`);
  assert.ok(trace.every((t) => !t.copter || !t.copter.flyOff), `${tag}: Eggshell never flies off — he is chased`);
  assert.ok(trace.filter((t) => t.phase === 'board' || t.phase === 'slide').every((t) => t.copter?.escape), `${tag}: Eggshell is escaping after the tape`);
  // The tub never runs into him: while his feet are on the road it is clear of
  // him (its half-width 13 and his 6 apart), and it is under him before he lands.
  const hx = 37;   // PLAYER_X 31 + HERO_CENTER_OFF 6 on a phone; 52 on desktop
  const ground = trace.filter((t) => (t.phase === 'board' || t.phase === 'approach') && !t.seated && t.py <= 0.01 && Number.isFinite(t.tub));
  const gap = Math.min(...ground.map((t) => t.tub - (t.hx + 6)));
  assert.ok(gap > 18, `${tag}: the tub stays clear of him on the road (closest ${gap.toFixed(1)}u)`);
  console.log(`ok: ${tag}: closest the tub comes while he runs: ${gap.toFixed(1)}u`);
  // His column moves smoothly: no frame jumps more than a few world units.
  for (let i = 1; i < trace.length; i++) {
    assert.ok(Math.abs(trace[i].hx - trace[i - 1].hx) < 4, `${tag}: his column never jumps (${trace[i - 1].hx} -> ${trace[i].hx} at ${i})`);
    assert.ok(Math.abs(trace[i].py - trace[i - 1].py) < 8, `${tag}: his height never jumps (${trace[i - 1].py} -> ${trace[i].py} at ${i})`);
  }
  // The road keeps its speed through the slide: inside camera + slide = run speed.
  const z = run.camZoom;
  for (let i = firstSlide + 1; i < trace.length; i++) {
    const road = (trace[i].cam - trace[i - 1].cam) * z + (trace[i].slide - trace[i - 1].slide);
    assert.ok(Math.abs(road - run.speed * z / 60) < 0.05, `${tag}: road speed holds through the slide (${road} vs ${run.speed * z / 60})`);
  }
  console.log(`ok: ${tag}: tape -> tub -> edge -> flight in ${trace.length} frames, one checkpoint, no end, smooth column`);
}

// ON THE BEAT, at its latest: a tape just after a beat line puts the hop almost
// a whole beat later, and the tub still has to be clear of him until he jumps.
for (const frac of [0.02, 0.5, 0.95]) {
  const { trace, run } = (() => { fakeSong(null); const probe = runToHandoff({ portrait: true });
    // Re-run with the song placed so the tape lands `frac` into a beat.
    const tapeFrame = probe.trace.findIndex((t) => t.phase === 'board');
    const probeTempo = Audio.tempo || 1;
    fakeSong(100 + frac - tapeFrame / 60 * 129 / 60 * probeTempo);
    return runToHandoff({ portrait: true }); })();
  const fx = run.fx;
  // The song's beat phase on the first frame of the hop (within a frame of a line).
  const hop = trace.find((t) => t.phase === 'board' && t.ft >= fx.hopAt);
  const beatAt = ((hop.song % 1) + 1) % 1;
  assert.ok(Math.min(beatAt, 1 - beatAt) < 0.08, `hop lands on a beat line (frac ${frac}: ${beatAt.toFixed(3)})`);
  const ground = trace.filter((t) => t.phase === 'board' && !t.seated && t.py <= 0.01 && Number.isFinite(t.tub));
  const gap = Math.min(...ground.map((t) => t.tub - (t.hx + 6)));
  assert.ok(gap > 18, `tape ${frac} into a beat: the tub stays clear of him (closest ${gap.toFixed(1)}u, hop at ${fx.hopAt.toFixed(2)}s)`);
  console.log(`ok: tape ${frac} into a beat: hop at ${fx.hopAt.toFixed(2)}s on the beat, tub closest ${gap.toFixed(1)}u`);
}
fakeSong(null);

// Not for demos (attract, bot-play): they keep the pole.
{
  const { run, tapes, handoffs } = runToHandoff({ portrait: false, demo: true });
  assert.equal(run.fx, null, 'a demo never arms the flight');
  assert.equal(tapes.length + handoffs.length, 0, 'a demo writes no checkpoint');
}
console.log('FLIGHT EXIT: PASSED');
