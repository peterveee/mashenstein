// The loop-de-loop's geometry.
//
// The ride replaces the run's own scroll and the physics' own altitude for
// about a second, so what has to be true is that it hands both back exactly
// where it took them. Everything here is about the seams:
//
//   - the lap closes on the same world x it opened on, at ground level
//   - the scroll rate matches the run's at both ends, so neither seam jolts
//   - theta only ever advances, and stops dead on the closing frame
//   - every ring coin is inside the hero's box as he passes its angle
//   - the ring fits the camera band, so the ride needs no crane
//   - a bail-out throws him up on the way round and down off the underside
//
// Pure geometry, so it imports the module directly rather than driving a run.
import {
  LOOP, loopPoint, loopBodyPoint, loopCoinSpots, startLoop, stepLoop, loopSpeed, loopExitVy,
} from '../src/game/loop.js';
import { PLAYER_W, PLAYER_H, PLAYER_X, PLAYER_SPRITE_W } from '../src/game/player.js';
import { PICKUPS, makeObstacle } from '../src/game/entities.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const TAU = Math.PI * 2;
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

// ---- the ring itself --------------------------------------------------------
const CX = 1000;
{
  const bottom = loopPoint(CX, LOOP.r, 0);
  const top = loopPoint(CX, LOOP.r, Math.PI);
  const close = loopPoint(CX, LOOP.r, TAU);
  assert(near(bottom.x, CX) && near(bottom.alt, 0), 'theta 0 is the bottom of the ring, on the ground');
  assert(near(top.x, CX) && near(top.alt, 2 * LOOP.r), 'theta pi is the top, at twice the radius');
  assert(near(close.x, CX) && near(close.alt, 0), 'the lap closes exactly where it opened');
  // The direction of travel: the first quarter goes FORWARD up the near wall.
  assert(loopPoint(CX, LOOP.r, Math.PI / 2).x > CX, 'the ride runs forward into the ring, not backward');
}

// The camera band. updateCamera holds the hero without re-pinning the floor
// well past a double jump; 100px is the number the ring was sized against, and
// a radius that grows past it turns a ride into a crane.
assert(2 * LOOP.r <= 100, 'the ring fits the camera band without craning');

// ---- the seams --------------------------------------------------------------
// The run scrolls at `speed`; the ride scrolls at d(camX)/dt = v*cos(theta).
// At both ends of the lap that has to BE the run's rate, or the world visibly
// jolts as the hero enters and again as he leaves.
{
  const runSpeed = 240;
  const v = loopSpeed(runSpeed);
  assert(near(v * Math.cos(0), v), 'entry scroll rate is the full ride speed');
  assert(near(v * Math.cos(TAU), v), 'exit scroll rate is the full ride speed');
  assert(v >= runSpeed, 'the ride never runs slower than the hero was running');
  assert(near(loopSpeed(0), LOOP.minSpeed * LOOP.speedMul), 'a stalled hero still gets a full lap');

  // THE CLIMB COSTS SOMETHING. A lap at one flat rate is what gives the trick
  // away — a hero being conveyed round a circle, with nothing in the picture
  // costing him anything. Quick through the bottom, labouring over the top.
  const atBottom = loopSpeed(runSpeed, LOOP, 0);
  const atTop = loopSpeed(runSpeed, LOOP, 2 * LOOP.r);
  const atSide = loopSpeed(runSpeed, LOOP, LOOP.r);
  assert(near(atBottom, v), 'he is at full speed on the ground, so the seams stay silent');
  assert(atTop < atSide && atSide < atBottom, 'and slower the higher he gets');
  assert(atTop / atBottom < 0.8 && atTop > 0,
    `visibly slower over the top, without ever stalling (${(atTop / atBottom).toFixed(2)} of entry)`);

  // BUT THE LOOP IS NEVER A BRAKE. The pad is a boost pad and hitting one has to
  // make you faster, so the whole lap — its slowest point included — outruns the
  // ground either side of it. The first cut paid the kick out at the EXIT
  // instead and left the ride itself at a hair over the plain run; once the
  // climb took its cut, the set piece averaged out slower than the lane, and it
  // read from the seat as a thing you brake for.
  const boosted = runSpeed * (1 + LOOP.entryBoost);
  const slowestOnRing = loopSpeed(boosted, LOOP, 2 * LOOP.r);
  assert(slowestOnRing > runSpeed,
    `even the top of the ring beats plain running (${slowestOnRing.toFixed(0)} vs ${runSpeed})`);
  assert(LOOP.entryBoost > 0, 'and the pad pays its kick on contact, not at the far end');
}

// ---- the ride ---------------------------------------------------------------
function ride(runSpeed, dt = 1 / 60) {
  const loop = startLoop({ id: 1, x: CX - 9, w: 18 });
  assert(near(loop.cx, CX), 'the ring is centred on the pad');
  const path = [];
  let last = -1;
  let frames = 0;
  let res;
  do {
    res = stepLoop(loop, dt, runSpeed);
    assert(loop.theta > last, `theta advances every frame (frame ${frames})`);
    last = loop.theta;
    path.push({ theta: loop.theta, ...res });
    frames++;
    if (frames > 10000) break;
  } while (!res.done);
  return { loop, path, frames, dt };
}

{
  // One clean lap at a middling speed.
  const { loop, path, frames, dt } = ride(240);
  assert(near(loop.theta, TAU), 'the last step lands on exactly one turn, never past it');
  const end = path[path.length - 1];
  assert(near(end.alt, 0) && near(end.x, CX), 'the ride ends on the ground at the ring bottom');
  assert(path.every((p) => p.alt >= -1e-9), 'the hero is never below the road during the ride');
  assert(path.every((p) => p.alt <= 2 * LOOP.r + 1e-9), 'the hero never leaves the ring');
  const secs = frames * dt;
  assert(secs > 0.7 && secs < 2.2, `a lap is about a second and a half (${secs.toFixed(2)}s at 240px/s)`);
  // Not a constant crawl round: the frame-to-frame step has to change, and
  // change most between the ground and the top.
  const steps = path.map((p, i) => (i ? p.theta - path[i - 1].theta : 0)).slice(1);
  const fastest = Math.max(...steps), slowest = Math.min(...steps);
  assert(slowest / fastest < 0.75,
    `the ride is visibly faster at the bottom than the top (${(slowest / fastest).toFixed(2)})`);
}
{
  // A crawling hero and a boosted one both complete, and the fast one is quicker.
  const slow = ride(40);
  const fast = ride(420);
  assert(near(slow.loop.theta, TAU) && near(fast.loop.theta, TAU), 'the lap closes at any run speed');
  assert(fast.frames < slow.frames, 'a boosted entry takes the ring faster');
  // The floor is what stops a stumbling hero from a comically long lap.
  assert(slow.frames * slow.dt < 2.2, 'the minimum ride speed keeps a slow lap short');
}
{
  // A coarse clock must not overshoot the closing frame either.
  const { loop, path } = ride(240, 1 / 12);
  const end = path[path.length - 1];
  assert(near(loop.theta, TAU) && near(end.alt, 0), 'a long frame still closes the lap exactly');
}

// ---- the coins --------------------------------------------------------------
// They hang INSIDE the ring, in the air the hero's body sweeps through, and the
// ride collects them against a box that turns with him. Both halves are the same
// claim: the coins are where he visibly is, rather than where the engine's
// never-turning upright hit box happens to be.
{
  const spots = loopCoinSpots(CX);
  assert(spots.length === LOOP.coinCount, `the ring carries ${LOOP.coinCount} coins`);
  assert(PICKUPS.coin.w === 8 && PICKUPS.coin.h === 8, 'a coin is the 8px box the ring geometry assumes');
  const COIN = PICKUPS.coin.w;
  const a0 = LOOP.coinArc, span = TAU - a0 * 2;
  for (let k = 0; k < spots.length; k++) {
    const theta = a0 + (k / (LOOP.coinCount - 1)) * span;
    const feet = loopPoint(CX, LOOP.r, theta);
    const body = loopBodyPoint(CX, LOOP.r, theta);
    const c = spots[k];
    // The box the ride actually collects with: square, centred on his middle,
    // turning with him. (RunState.collide builds the same thing.)
    const h = PLAYER_H / 2;
    const overlap = body.x - h < c.x + COIN && body.x + h > c.x
      && body.alt - h < c.alt + COIN && body.alt + h > c.alt;
    assert(overlap, `coin ${k} is inside the hero's body as he passes it`);
    // INSIDE the ring, not on the rail. Every coin has to be nearer the middle
    // of the circle than the running surface is, or it is sitting in the track.
    const dx = c.x + COIN / 2 - (CX + PLAYER_SPRITE_W / 2);
    const dy = c.alt + COIN / 2 - LOOP.r;
    const rad = Math.sqrt(dx * dx + dy * dy);
    assert(rad + COIN / 2 < LOOP.r,
      `coin ${k} hangs clear inside the ring rather than straddling the track `
      + `(${rad.toFixed(1)} + half a coin < ${LOOP.r})`);
    assert(c.alt >= 0, `coin ${k} sits clear of the road rather than half-sunk in it`);
    // The feet stay out on the circle; only the coins come in. If these two ever
    // agreed, the inset would have been quietly lost.
    assert(Math.abs(body.alt - feet.alt) > 1 || Math.abs(body.x - feet.x - PLAYER_SPRITE_W / 2) > 1,
      `coin ${k} is offset from the running line, not sitting on it`);
  }
  // THE ONE THAT BIT. Half the ring stands BEHIND its pad, and the hero runs
  // through that ground on the way in — so a coin hanging low back there is
  // collected before the ride has begun, the lap closes one short, and the
  // full-lap bonus becomes unreachable however well the ring is ridden. Every
  // coin has to be out of reach of a hero standing on the road.
  for (let k = 0; k < spots.length; k++) {
    assert(spots[k].alt > PLAYER_H,
      `coin ${k} hangs above a standing hero, so the run-in cannot take it `
      + `(${spots[k].alt.toFixed(1)} > ${PLAYER_H})`);
  }
  // Symmetric about the top, so the ring reads as decorated rather than as a
  // formation that happens to be draped over it.
  const last = spots[spots.length - 1];
  assert(near(spots[0].alt, last.alt, 1e-9), 'the coin run starts and ends at the same height');
}

// ---- the bail-out -----------------------------------------------------------
// Jumping mid-ride lets go at the tangent. Only the vertical half is handed
// back (the run supplies the horizontal), so the sign is the whole claim.
{
  const loop = startLoop({ id: 1, x: CX - 9, w: 18 });
  loop.theta = Math.PI / 2;
  // The speed he HAS at that height, not the one he entered with — half way up
  // the climb has already taken its cut, and a bail that handed back the entry
  // speed would pay him for altitude he spent getting there.
  const vSide = loopSpeed(240, LOOP, LOOP.r);
  assert(near(loopExitVy(loop, 240), vSide), 'letting go on the near wall throws him straight up');
  assert(vSide < loopSpeed(240), 'at the speed the climb has left him with');
  loop.theta = Math.PI;
  assert(Math.abs(loopExitVy(loop, 240)) < 1e-9, 'letting go at the very top is a clean drop');
  loop.theta = Math.PI * 1.5;
  assert(loopExitVy(loop, 240) < 0, 'letting go on the far wall drops him off the underside');
  loop.theta = 0.0001;
  assert(loopExitVy(loop, 240) > 0, 'letting go at the bottom is still an upward hop');
}

// PLAYER_X is what the ride pins the hero to; if it ever stopped being the
// anchor the camera arithmetic in run.js would be measuring from the wrong post.
assert(Number.isFinite(PLAYER_X) && PLAYER_X > 0, 'the ride has a fixed screen column to pin to');

// ---- the climb is in the song's key -----------------------------------------
// A rising twelve-note figure playing over a track for a whole second is the one
// cue in the game that cannot be written down once: fixed semitones are in tune
// for one song and sour against the next. Worse here than most — SPEED ZONE
// walks its lap through E minor, A minor and B minor, so even ONE song has three
// answers, and the first cut used a major pentatonic against music built on the
// minor one, which is the sourest kind of near-miss.
//
// Checked against every song in the game rather than the one cabinet the loop
// ships in: the mechanism reads whatever is playing, so a song added later is
// already inside the claim.
{
  const { readdirSync } = await import('node:fs');
  const { join: joinPath, dirname: dirName } = await import('node:path');
  const { fileURLToPath: toPath } = await import('node:url');
  const songDir = joinPath(dirName(toPath(import.meta.url)), '..', 'src/data/songs');
  const join = joinPath;
  const pitchClass = (f) => ((Math.round(69 + 12 * Math.log2(f / 440)) % 12) + 12) % 12;
  // The coin cue is two square pings at 988 and 1319, and the ride collects eight
  // coins while the climb runs — interleaved, not merely simultaneous. The climb
  // owns the octave below and every key has to stay under this.
  const TOP_HZ = 850;
  let sections = 0, strays = 0, tooHigh = 0, worst = null;
  for (const file of readdirSync(songDir).filter((f) => f.endsWith('.js'))) {
    let mod;
    try { mod = await import(join(songDir, file)); } catch { continue; }
    const bank = mod.bank;
    if (!bank || !Array.isArray(bank.bass)) continue;
    for (const sec of [null, ...(bank.sections || [])]) {
      const b = sec ? { ...bank, ...sec } : bank;
      if (!Array.isArray(b.bass)) continue;
      // The same lanes and the same arithmetic Audio.songKey uses.
      const freqs = [];
      for (const lane of ['bass', 'lead', 'chords', 'arp', 'pad', 'lead2', 'lead3', 'bass2']) {
        const s = b[lane];
        if (!Array.isArray(s)) continue;
        for (const v of s) {
          if (Array.isArray(v)) { for (const n of v) if (n > 0) freqs.push(n); }
          else if (typeof v === 'number' && v > 0) freqs.push(v);
        }
      }
      if (!freqs.length) continue;
      let rootF = null;
      for (const v of b.bass) {
        const n = Array.isArray(v) ? v.find((x) => x > 0) : v;
        if (typeof n === 'number' && n > 0) { rootF = n; break; }
      }
      if (rootF == null) rootF = Math.min(...freqs);
      const classes = [...new Set(freqs.map(
        (f) => ((Math.round(12 * Math.log2(f / rootF)) % 12) + 12) % 12))].sort((x, y) => x - y);
      const semisOf = (i) => classes[i % classes.length] + 12 * Math.floor(i / classes.length);
      const span = Math.pow(2, semisOf(11) / 12);
      let r = rootF;
      while (r < 55) r *= 2;
      while (r * span > TOP_HZ && r > 55) r /= 2;
      while (r * 2 * span <= TOP_HZ) r *= 2;
      const notes = Array.from({ length: 12 }, (_, i) => r * Math.pow(2, semisOf(i) / 12));
      const inSong = new Set(freqs.map(pitchClass));
      sections++;
      for (const n of notes) if (!inSong.has(pitchClass(n))) strays++;
      if (notes[11] > TOP_HZ) { tooHigh++; if (!worst) worst = `${mod.id || file} @ ${Math.round(notes[11])}Hz`; }
    }
  }
  assert(sections > 50, `checked the whole song library (${sections} sections)`);
  assert(strays === 0, `every note of the climb is a note the song itself plays (${strays} strays)`);
  assert(tooHigh === 0, `and no key pushes the top of the run into the coins${worst ? ` (${worst})` : ''}`);
}

// ---- and so is the boost pad's telegraph ------------------------------------
// The same claim for the pad, which fires far more often than the loop ever
// will: every pad in the game plays a short rising run on the approach and a
// faster one over the payout. It used to sweep the pitch continuously, and a
// smooth ramp through a scale hits whatever it hits — measured against E minor,
// seven of the ten notes were outside the key, including a G# against the lead's
// G. Snapped now (keyedTickPitch in run.js, Audio.songLadder in the engine).
//
// Driven through the live engine rather than a copy of the arithmetic: the point
// is that the game's own ladder is in key, not that a formula here is.
{
  const bank = (await import('../src/data/songs/speed.js')).bank;
  const pitchClass = (f) => ((Math.round(69 + 12 * Math.log2(f / 440)) % 12) + 12) % 12;
  const inSong = new Set();
  for (const lane of ['bass', 'lead', 'chords', 'arp', 'pad', 'lead2', 'lead3', 'bass2']) {
    const s = bank[lane];
    if (!Array.isArray(s)) continue;
    for (const v of s) {
      if (Array.isArray(v)) { for (const n of v) if (n > 0) inSong.add(pitchClass(n)); }
      else if (typeof v === 'number' && v > 0) inSong.add(pitchClass(v));
    }
  }
  const { Audio } = await import('../src/engine/audio.js');
  Audio.bank = bank;
  Audio.step = 0;
  const ladder = Audio.songLadder(750 * 0.85, 750 * 3);
  assert(Array.isArray(ladder) && ladder.length >= 6,
    `the engine offers the pad a ladder to snap to (${ladder ? ladder.length : 0} notes)`);
  const out = ladder.filter((f) => !inSong.has(pitchClass(f)));
  assert(out.length === 0,
    `and every note on it is one the song plays (${out.length} outside the key)`);
  // The ladder must actually SPAN the ramp, or snapping silently flattens the
  // telegraph: every tick landing on the same note is in key and useless.
  assert(ladder[ladder.length - 1] / ladder[0] > 2.5,
    'and it covers the whole sweep, so the run still rises');
}

// ---- and now the real thing -------------------------------------------------
// The geometry above is only half the claim. The ride REPLACES two systems for a
// second — the scroll and the integrator — and the failures that would matter
// are all in the handover rather than in the circle: a hero left airborne, a
// camera left behind, a ring whose coins the ordinary pickup loop never sees.
// So this drives the actual bundle into an actual run and rides an actual loop.
import esbuild from 'esbuild';
import { installDom } from './dom-stub.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dom = installDom();
const { outputFiles } = await esbuild.build({
  entryPoints: [join(root, 'src/main.js')],
  bundle: true, format: 'iife', write: false, target: ['es2022'], logLevel: 'silent',
});
try {
  new Function(outputFiles[0].text)();
} catch (e) {
  console.error('BOOT THREW:', e);
  process.exit(1);
}

function frames(n, dt = 16.7) { for (let i = 0; i < n; i++) dom.frame(dt); }

// The same walk into a stage the routes and smoke suites take.
frames(5);
dom.key('Enter'); frames(30);
dom.key('Enter'); frames(30);
for (let i = 0; i < 9; i++) { dom.key('Enter'); frames(12); }
frames(40);
globalThis.window.__mash_cur.px = globalThis.window.__mash_cur.stations().find((s) => s.type === 'cabinet').x;
frames(2);
dom.key('Enter'); frames(40);
dom.key('Enter'); frames(40);
dom.key('Enter'); frames(30);
dom.key('Enter'); frames(30);

const run = globalThis.window.__mash_cur;
if (!/(^|_)RunState$/.test(globalThis.window.__mash_state || '')) {
  console.error('FAIL: could not reach a run; got', globalThis.window.__mash_state);
  process.exit(1);
}
for (let i = 0; i < 400 && run.camX <= 0; i++) frames(1);
assert(run.camX > 0, 'reached a live, scrolling run');

// The ride is not a property of the SPEED ZONE — the cabinet only decides where
// one is PLACED. Planting it by hand in whatever stage the menus landed on tests
// the mechanism rather than the level data, and keeps this suite off the
// unlock ladder.
// Far enough out that the RUN's own trigger is what plants it, at the distance
// it really plants at. Dropping one in close by hand was what hid Peter's crate:
// near the camera the lane is already filled and the sweep has everything to
// look at, while the real set piece lands out past the spawner's frontier where
// the patterns around it do not exist yet.
function plantLoop(ahead = 620) {
  run.loop = null;
  run.loopSpawned = false;
  run.loopAt = run.camX + ahead;
  let pad = null;
  for (let i = 0; i < 900 && !pad; i++) {
    run.player.iframes = 99;
    frames(1);
    // The one ahead of him and unclaimed: a spent pad from an earlier ride can
    // still be in the list, and picking that one up would test nothing.
    pad = run.obstacles.find((o) => o.live && o.def.isLoop && !o.used && o.x > run.camX) || null;
  }
  return pad;
}
// Nothing in the unswept stretch of the approach may end the test with a death;
// what is under test is the ring, not this stage's cactuses.
function runIn(guard = () => false, max = 600) {
  for (let i = 0; i < max; i++) {
    run.player.iframes = 99;
    frames(1);
    if (guard()) return true;
  }
  return false;
}

// ---- a clean lap ------------------------------------------------------------
{
  const pad = plantLoop();
  assert(!!pad, 'the set piece plants a pad');
  const ringCoins = run.pickups.filter((p) => p.live && p.loopId === pad.id);
  assert(ringCoins.length === LOOP.coinCount, `and hangs its ${LOOP.coinCount} coins on it`);
  assert(run.loopSpawned, 'and marks itself done, so the run gets exactly one');

  // THE ONE PETER CAUGHT, and the reason the sweep runs every frame instead of
  // once. The lane is filled ahead of the camera on its own clock and its
  // frontier sits behind where the ring lands, so a sweep that ran only at
  // planting time cleared ground the patterns had not been laid on yet — and a
  // crate turned up afterwards standing in the mouth, on the pad, inside the
  // loop.
  //
  // Laid by hand rather than waited for. The spawner would eventually do this on
  // some seed and some stage, but a test that depends on which one is a test
  // that passes for the wrong reason nine times in ten; putting the crate there
  // deliberately asks the actual question, which is whether the ring's ground
  // stays clear of things that arrive AFTER it.
  {
    const cx = pad.x + pad.w / 2;
    const planted = makeObstacle('crate', cx - 6, {});
    run.obstacles.push(planted);
    frames(1);
    assert(!planted.live, 'a hazard laid in the ring afterwards is swept back out');
  }

  // And nothing the lane lays of its own accord survives there either, watched
  // all the way in rather than sampled at one moment.
  let intruder = null;
  const started = runIn(() => {
    if (!intruder) {
      const cx = pad.x + pad.w / 2;
      intruder = run.obstacles.find((o) => o.live && !o.def.isLoop
        && (o.def.action !== 'none' || o.def.isGap)
        && o.x + o.w > pad.x - 60 && o.x < cx + LOOP.r + 90) || null;
    }
    return run.loop && !run.loop.pending;
  });
  assert(started, 'running over the pad starts the ride');
  assert(!intruder, `nothing is ever laid in the ring's ground${intruder ? ` (a ${intruder.type} was)` : ''}`);
  // The pad paid on contact, and it is still paying: a boost that drains while
  // he is on the rails would have him enter fast and leave at a crawl.
  assert(run.speedBoost > 0, 'the pad has already boosted him by the time the ride starts');
  const boostAtEntry = run.speedBoost;
  run.player.iframes = 0;

  const camAtEntry = run.camX;
  let maxAlt = 0, maxGot = 0, lastTheta = -1, monotonic = true, pinned = true;
  let inverted = false, wentBack = false;
  let prevCam = run.camX;
  const rungs = [];
  for (let i = 0; i < 400 && run.loop; i++) {
    frames(1);
    if (!run.loop) break;
    if (run.loop.theta <= lastTheta) monotonic = false;
    lastTheta = run.loop.theta;
    maxAlt = Math.max(maxAlt, run.player.y);
    maxGot = Math.max(maxGot, run.loop.got);
    // The claim the whole scheme rests on: the world is placed around the hero,
    // so his own world x stays exactly one screen column ahead of the camera.
    if (Math.abs(run.playerWorldX() - (run.camX + PLAYER_X)) > 1e-6) pinned = false;
    if (run.player.y > 2 * LOOP.r - 2) inverted = true;
    if (run.camX < prevCam) wentBack = true;
    prevCam = run.camX;
    if (run.loop.rung >= 0 && run.loop.rung !== rungs[rungs.length - 1]) rungs.push(run.loop.rung);
  }
  assert(monotonic, 'the ride only ever goes forward round the ring');
  assert(pinned, "the hero's screen column never moves during the ride");
  assert(inverted, `he reaches the top of the ring (${maxAlt.toFixed(0)}px up)`);
  assert(wentBack, 'the world scrolls backward over the top — the U-turn is visible');
  assert(run.pickups.filter((p) => p.live && p.loopId === pad.id).length === 0,
    'the ride takes every coin on the ring');
  // The climb sounded, all the way up, one rung at a time and never twice.
  assert(rungs.length > 6, `the climb plays a real run of notes (${rungs.length})`);
  assert(rungs.every((r, i) => i === 0 || r > rungs[i - 1]), 'each rung is higher than the last');
  assert(rungs[rungs.length - 1] >= 10, `and gets to the top of the figure (rung ${rungs[rungs.length - 1]})`);
  // The bonus is the claim that matters, and it is a sharper one than the tally:
  // the ring's last coin sits a few degrees short of the bottom and is collected
  // on the very frame the lap closes, so a ride that ended before the pickups
  // were swept would come up one short here every single time.
  assert(run.floaties.some((f) => /FULL LOOP/.test(f.text)),
    `a completed lap pays out, last coin included (${maxGot + 1}/${LOOP.coinCount} seen live)`);

  assert(run.loop === null, 'the ride ends on its own');
  assert(run.player.grounded && run.player.y === 0, 'and puts him back on the road, standing');
  assert(run.player.jumps === 0 && !run.player.launched, 'with a full jump budget, not one spent by the ride');
  assert(run.speedBoost >= boostAtEntry, 'still carrying its speed, not drained by the lap');
  assert(Math.abs(run.camX - camAtEntry) < LOOP.r,
    'the lap ends where it began — a loop is not progress through the stage');
  // And the run keeps running.
  const before = run.camX;
  run.player.iframes = 99; frames(30);
  assert(run.camX > before && !run.dead, 'the world scrolls normally again afterwards');
}

// ---- bailing out mid-lap ----------------------------------------------------
{
  const pad = plantLoop();
  const started = runIn(() => run.loop && !run.loop.pending);
  if (!started || !pad) {
    console.error('  bail-out setup state:', JSON.stringify({
      state: globalThis.window.__mash_state, dead: run.dead, finishing: run.finishing,
      camX: Math.round(run.camX), totalDist: Math.round(run.totalDist),
      loopAt: run.loopAt == null ? null : Math.round(run.loopAt),
      loopSpawned: run.loopSpawned, pad: !!pad,
    }));
  }
  assert(started && !!pad, 'a third ride starts for the bail-out');
  run.player.iframes = 0;
  // Round to the near wall, where letting go throws him clear.
  for (let i = 0; i < 400 && run.loop && run.loop.theta < Math.PI / 2; i++) frames(1);
  assert(run.loop && run.loop.theta >= Math.PI / 2, 'and reaches the near wall');
  const altAtBail = run.player.y;
  const bailRung = run.loop.rung;
  dom.key('ArrowUp'); frames(1);
  assert(run.loop === null, 'jumping lets go of the ring');
  assert(!run.player.grounded, 'he leaves it airborne');
  assert(run.player.vy > 0, 'thrown upward off the near wall, along the tangent');
  assert(Math.abs(run.player.y - altAtBail) < 20, 'from the height he was at, not teleported');
  assert(run.player.launched, 'drawn as a hero in flight rather than a hero falling');
  // The climb stops where he let go. It is a run of one-shots for exactly this
  // reason — there is no sustained voice left ringing over a hero who is now
  // falling out of the ring.
  assert(bailRung > 0 && bailRung < 11,
    `the climb was cut off partway up rather than finishing (rung ${bailRung})`);
  // And he comes down, on his feet, alive — a bail costs the coins and nothing else.
  const gotAtBail = run.pickups.filter((p) => p.live && p.loopId === pad.id).length;
  assert(gotAtBail > 0, 'with coins still on the ring he gave up');
  let landed = false;
  for (let i = 0; i < 300 && !landed; i++) {
    run.player.iframes = 99;
    frames(1);
    if (run.player.grounded) landed = true;
  }
  assert(landed && !run.dead, 'and lands back in the lane, alive');
}

// ---- jumping over the pad ---------------------------------------------------
// The gate is `grounded`, so this is a claim about the pad, not about timing:
// airborne contact is not contact. Poked directly rather than by trying to land
// a jump on an exact frame, because the frame is not what is being tested.
//
// LAST, and it has to stay last. This is the one block that teleports the camera
// to put the hero where it wants him, which leaves the spawner's cursors and the
// lane behind them somewhere the run would never have got to on its own — and
// anything driven afterwards inherits that. It cost an afternoon once already.
{
  const pad = plantLoop();
  assert(!!pad, 'a second set piece plants for the miss');
  // Stand the hero in the air, directly over the pad.
  run.camX = pad.x - PLAYER_X - 2;
  run.player.grounded = false;
  run.player.y = 20;
  run.collide();
  assert(run.loop === null, 'sailing over the pad does not start a ride');
  assert(!pad.used, 'and leaves the pad unclaimed rather than spending it');
  // Nothing is taken off him for it: the ring's coins are simply still there.
  assert(run.pickups.filter((p) => p.live && p.loopId === pad.id).length === LOOP.coinCount,
    'the ring keeps its coins, and missing it costs only them');
  assert(!run.dead, 'and missing a loop is not fatal');
  run.player.grounded = true; run.player.y = 0;
  // Carried past it, the telegraph says the chance has gone.
  run.camX = pad.x + pad.w + 40;
  frames(2);
  assert(pad.missed, "the pad's telegraph reports the miss");
}

console.log(failed ? '\nLOOP TESTS FAILED' : '\nAll loop tests passed');
process.exit(failed ? 1 : 0);
