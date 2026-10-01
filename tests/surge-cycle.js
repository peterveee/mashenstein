// THE SURGE's backdrop cycles every other cabinet's SHIPPED look (stylePacks/index.js
// surgePack): the cycle names exactly the cabinets' styles, so a cabinet that changes
// style can't leave its old pack behind in the Surge (Speed's faux3d and Crypt's vhs
// once did); every slot paints with the Surge cabinet on every stage; the mid-century
// slot is the real desert rather than its generic fallback; and the baked backdrops
// are warmed before the run.
import { installDom } from './dom-stub.js';
installDom();

const { getStylePack, __testing } = await import('../src/engine/stylePacks/index.js');
const { CABINETS, CABINET_BY_ID } = await import('../src/data/cabinets.js');
const { speedMcmWarmJobs } = await import('../src/engine/stylePacks/speedMcm.js');
const { cryptGouacheWarmJobs } = await import('../src/engine/stylePacks/cryptGouache.js');
const { cryptLifeWarmJobs } = await import('../src/engine/stylePacks/cryptLife.js');
const { beginStageArtWarmup, artWarmupPending, resetArtWarmup } = await import('../src/game/art-warmup.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// A context that accepts every call and counts fills, paths and rects alike.
function recorder() {
  const counts = { fill: 0 };
  let m = { a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 };
  const target = {
    canvas: { width: 960, height: 540 },
    globalAlpha: 1, fillStyle: '#000', strokeStyle: '#000', lineWidth: 1,
    getTransform: () => ({ ...m }),
    setTransform: (a, b, c, d, e, f) => { m = { a, b, c, d, e, f }; },
    createPattern: () => ({ setTransform() {} }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    measureText: () => ({ width: 10 }),
    fill: () => { counts.fill++; },
    fillRect: () => { counts.fill++; },
  };
  const ctx = new Proxy(target, {
    get: (t, k) => (k in t ? t[k] : () => {}),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  return { ctx, counts };
}

const surge = CABINET_BY_ID.surge;
const cycle = __testing.SURGE_CYCLE;
const shipped = [...new Set(CABINETS.filter((c) => c.id !== 'surge').map((c) => c.style))].sort();
assert(JSON.stringify([...cycle].sort()) === JSON.stringify(shipped),
  `the cycle is every other cabinet's shipped style (${cycle.join(', ')} vs ${shipped.join(', ')})`);

// Each slot, on each stage, with the Surge cabinet and the song's beat — what a Surge run
// hands it. A look holds four bars; each stage opens three looks on from the last.
const { surgePhase, surgeMove, SURGE_SLOT_BEATS, SURGE_MOVES, surgeGlitches, SURGE_GLITCH_LEVELS } =
  await import('../src/engine/stylePacks/surgeCut.js');
const LEN = 11340;
const beatOf = (slot, stageIndex) => (((slot - (stageIndex - 1) * 3) % 8 + 8) % 8) * SURGE_SLOT_BEATS + 8;
const pack = getStylePack('surge', {});
cycle.forEach((name, slot) => {
  for (const stageIndex of [1, 2, 3]) {
    let threw = null;
    let fills = 0;
    const beat = beatOf(slot, stageIndex);
    for (const p of [0.05, 0.5, 0.95]) {
      const { ctx, counts } = recorder();
      ctx.__mashBackgroundCoverage = { left: 0, right: 480, width: 480 };
      try {
        pack.bg(ctx, 1, p * LEN, surge, LEN, { stageIndex, beat, progress: p }, 0, { stageIndex, progress: p, heroFrac: 0.3 });
        pack.ground(ctx, p * LEN, surge, [], [], 1, 480);
        pack.post(ctx, 1);
        pack.nightVeil();
        pack.heroLight();
      } catch (e) { threw = e; }
      fills += counts.fill;
    }
    const at = surgePhase(beat, { level: stageIndex, seed: pack.seed });
    assert(!threw && fills > 0 && cycle[at.look] === name,
      `surge-${stageIndex}'s ${name} look paints${threw ? `: ${threw.stack}` : ''}`);
  }
});

// Every move and every glitch, at every level, paints: the whole cycle on the sixteenths.
for (const level of [1, 2, 3]) {
  let threw = null;
  const seen = new Set();
  for (let beat = 0; beat < 8 * SURGE_SLOT_BEATS && !threw; beat += 0.25) {
    const ph = surgePhase(beat, { level, seed: pack.seed });
    if (ph.move) seen.add(ph.move);
    for (const g of ph.glitches) seen.add(g.kind + (g.lane ? '+lane' : ''));
    const { ctx } = recorder();
    try {
      pack.bg(ctx, 1, beat * 10, surge, LEN, { stageIndex: level, beat }, 0, { stageIndex: level, progress: 0.5 });
      pack.post(ctx, 1);
    } catch (e) { threw = e; }
  }
  assert(!threw, `surge-${level}'s moves and glitches all paint (${[...seen].join(', ')})${threw ? `: ${threw.stack}` : ''}`);
}

// The moves are drawn at random, never the same twice running; the glitches get worse
// through the act, and only from surge-2 do they reach the lane.
{
  const moves = Array.from({ length: 200 }, (_, c) => surgeMove(41, c));
  assert(moves.every((m, c) => c === 0 || m !== moves[c - 1]), 'no move plays twice running');
  assert(new Set(moves).size === Object.keys(SURGE_MOVES).length, 'every move turns up');
  const tally = (level) => {
    let n = 0, lane = 0;
    for (let slot = 0; slot < 400; slot++) for (const g of surgeGlitches(slot, level, 5, 8)) { n++; if (g.lane) lane++; }
    return { n, lane };
  };
  const [a, b, c] = [tally(1), tally(2), tally(3)];
  assert(a.n < b.n && b.n < c.n, `more glitches each stage (${a.n}, ${b.n}, ${c.n} over 400 looks)`);
  assert(a.lane === 0 && b.lane > 0 && c.lane > b.lane, `the lane is left alone on surge-1 and caught more after (${a.lane}, ${b.lane}, ${c.lane})`);
  assert(Object.keys(SURGE_GLITCH_LEVELS).join() === '1,2,3', 'three severities, one a stage');
  // surge-3 climbs through the stage, to very frequent by the finish; the others hold.
  const at = (level, progress) => {
    let n = 0;
    for (let slot = 0; slot < 400; slot++) n += surgeGlitches(slot, level, 5, 8, progress).length;
    return n / 400;
  };
  assert(at(3, 1) > at(3, 0.5) * 1.5 && at(3, 0.5) > at(3, 0) && at(3, 1) >= 11,
    `surge-3 glitches more as it goes (${at(3, 0).toFixed(1)}, ${at(3, 0.5).toFixed(1)}, ${at(3, 1).toFixed(1)} a look)`);
  assert(at(2, 1) === at(2, 0), 'surge-1 and surge-2 hold their rate through the stage');
  const early = surgeGlitches(3, 3, 5, 8, 0.2), late = surgeGlitches(3, 3, 5, 8, 0.9);
  const { surgeFlip } = await import('../src/engine/stylePacks/surgeCut.js');
  const clash = [];
  const flips = (level, progress) => {
    let n = 0;
    for (let slot = 0; slot < 400; slot++) {
      const f = surgeFlip(slot, level, 5, progress);
      if (f) { n++; if (!(f.start >= 4 && f.end <= 12)) clash.push(`${f.start}-${f.end}`); }
    }
    return n;
  };
  assert(flips(1, 1) === 0 && flips(2, 1) === 0, 'only surge-3 turns the screen over');
  assert(flips(3, 0.1) === 0, 'not in surge-3\'s opening fifth');
  assert(flips(3, 1) > flips(3, 0.4) * 1.5, `more often as surge-3 goes on (${flips(3, 0.4)}, ${flips(3, 1)} of 400 looks)`);
  assert(!clash.length, `a flip keeps clear of the moves either side${clash.length ? ` (${clash[0]})` : ''}`);
  {
    let warned = 0;
    for (let beat = 0; beat < 400 * 16; beat += 0.25) {
      const ph = surgePhase(beat, { level: 3, seed: 5, progress: 1 });
      if (ph.glitches.some((g) => g.kind === 'tear' && g.full && g.shake)) warned++;
    }
    assert(warned > 0, 'each turn is announced by a tear and a jolt');
  }
  assert(JSON.stringify(early) === JSON.stringify(late.slice(0, early.length)),
    'a look\'s glitches only gain more as the count rises; none it had change');
}

// The mid-century look paints the desert itself: only it lays the afternoon light on
// the hero, and at surge-3's close that light is dusk.
{
  const beat = beatOf(cycle.indexOf('mcm'), 3);
  const { ctx } = recorder();
  pack.bg(ctx, 1, 0.97 * LEN, surge, LEN, { stageIndex: 3, beat }, 0, { stageIndex: 3, progress: 0.97 });
  assert(/^rgba\(/.test(pack.heroLight() || ''), 'the mcm look is the shipped desert, dusk on surge-3');
}

// Both baked backdrops are queued before a Surge run, on top of its props.
resetArtWarmup();
beginStageArtWarmup({ id: 'surge-probe', style: 'surge' });
const withBakes = artWarmupPending();
resetArtWarmup();
beginStageArtWarmup({ id: 'plain-probe', style: 'pixel' });
const without = artWarmupPending();
resetArtWarmup();
const bakes = speedMcmWarmJobs().length + cryptGouacheWarmJobs().length + cryptLifeWarmJobs().length;
assert(withBakes - without === bakes, `a Surge run warms the mcm and gouache bakes (${withBakes - without} of ${bakes})`);

if (failed) process.exit(1);
