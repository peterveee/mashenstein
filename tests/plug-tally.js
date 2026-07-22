// A stage's three plugs: which are already banked from earlier attempts, and
// which are on track right now. The in-run HUD no longer draws a standing
// tally — the pause screen counts them and mid-run toasts announce the
// transitions — so what has to hold is the RULE, in one place, agreeing with
// what endRun actually banks. Stage select still draws the row, and still has
// to render for every cabinet and plug state.
import { installDom } from './dom-stub.js';
installDom();

const { drawHud } = await import('../src/game/hud.js');
const { STAGES, UNLOCKS } = await import('../src/data/stages.js');
const { HERO_BY_ID } = await import('../src/data/heroes.js');
const { goalsDone, ALPHA_BANKED, ALPHA_LIVE, ALPHA_EMPTY } = await import('../src/game/plugs.js');
const anyHero = Object.keys(HERO_BY_ID)[0];

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const stage = STAGES[0];
function mkRun(banked, over = {}) {
  return {
    overtime: false, stage, distance: 10, totalDist: 100, score: 0, coins: 0,
    battery: 3, oneHit: false, maxBattery: () => 4, damageTaken: 1,
    powerups: { shieldStack: 0, active: {}, levelOf: () => 0 },
    relay: { current: anyHero, pips: 0, bestCombo: 0 },
    mission: { type: 'targets', n: 3, count: 0 },
    challenge: { type: 'coins', n: 5, count: 0, failed: false, desc: 'GET COINS' },
    applianceGot: false,
    goalToasts: [],
    player: { abilityCd: 0 },
    save: { slot: { campaign: { plugs: { [stage.id]: banked } } }, settings: {} },
    ...over,
  };
}

const done = (banked, over = {}) => goalsDone(mkRun(banked, over));

let t = done(undefined);
assert(t.join() === [false, false, false].join(), `a fresh stage holds no plugs (got ${t})`);

t = done([true, false, false]);
assert(t.join() === [true, false, false].join(), `a banked mission plug counts (got ${t})`);

t = done([true, true, true]);
assert(t.join() === [true, true, true].join(), `a fully plugged stage counts three (got ${t})`);

// Grabbing the toaster this run puts T in hand before it is banked.
t = done([true, false, false], { applianceGot: true });
assert(t[2] === true, `toaster grabbed this run counts (got ${t})`);

// Already banked stays counted whether or not it is also live this run.
t = done([true, false, true], { applianceGot: true });
assert(t[2] === true, `an already-banked toaster stays counted (got ${t})`);

// Meeting the challenge target this run counts C.
t = done([false, false, false], { challenge: { type: 'coins', n: 5, count: 5, failed: false, desc: 'GET COINS' } });
assert(t[1] === true, `challenge target met this run counts (got ${t})`);

// A failed challenge must not count, however full its counter got.
t = done([false, false, false], { challenge: { type: 'coins', n: 5, count: 5, failed: true, desc: 'GET COINS' } });
assert(t[1] === false, `a failed challenge does not count (got ${t})`);

// noDamage is on track from the first frame and only banks by surviving.
t = done([false, false, false], { challenge: { type: 'noDamage', n: 1, count: 0, failed: false, desc: 'NO DAMAGE' }, damageTaken: 0 });
assert(t[1] === true, `an unbroken no-damage challenge counts (got ${t})`);
t = done([false, false, false], { challenge: { type: 'noDamage', n: 1, count: 0, failed: false, desc: 'NO DAMAGE' }, damageTaken: 2 });
assert(t[1] === false, `a no-damage challenge with damage taken does not count (got ${t})`);

// The mission plug is never in hand mid-run — it only lands at the socket.
t = done([false, false, false], { mission: { type: 'targets', n: 3, count: 3 } });
assert(t[0] === false, `mission stays unearned mid-run even when its counter is full (got ${t})`);

// Overtime has no stage and so has no plugs to hold.
t = done([true, true, true], { overtime: true, stage: null, challenge: null });
assert(t.every((v) => v === false), 'overtime holds no plugs');

// The HUD must render across the states it now has to cover. The mock carries
// no tRun, which is exactly the case the animated bits have to survive.
{
  const ctx = globalThis.document.createElement('canvas').getContext('2d');
  const cases = {
    'normal run': mkRun([true, false, false]),
    'one-hit run': mkRun(undefined, { oneHit: true, maxBattery: () => 1, battery: 1 }),
    'overtime': mkRun(undefined, { overtime: true, stage: null, challenge: null, mission: { type: 'endless', desc: 'RUN' } }),
    'failed challenge': mkRun(undefined, { challenge: { type: 'coins', n: 5, count: 1, failed: true, desc: 'GET COINS' } }),
    'goal toast up': mkRun(undefined, { goalToasts: [{ text: 'BONUS: GET COINS', t: 2.4, t0: 2.4 }] }),
  };
  let threw = null;
  for (const [name, run] of Object.entries(cases)) {
    try { drawHud(ctx, run); } catch (e) { threw = `${name}: ${e.message}`; }
  }
  assert(!threw, `the HUD draws in every run state without a clock (${threw || 'no throw'})`);
}

// The frame is a third-of-a-pixel hairline, so colour alone cannot carry
// banked-vs-live in the stage select row: the icon brightness has to differ
// too, or an on-track plug looks exactly like one you already own. drawProp
// composites each icon with a single drawImage, so the alpha in force at that
// call is the pip's tier.
{
  const { drawPlugRow } = await import('../src/game/plugs.js');
  const real = globalThis.document.createElement('canvas').getContext('2d');
  const alphas = [];
  const ctx = new Proxy(real, {
    get(t, k) {
      if (k === 'drawImage') return (...a) => { alphas.push(t.globalAlpha); return real.drawImage(...a); };
      const v = t[k];
      return typeof v === 'function' ? v.bind(t) : v;
    },
    set(t, k, v) { t[k] = v; return true; },
  });
  drawPlugRow(ctx, 0, 0, [true, false, false], [false, true, false]);
  const [bankedA, liveA, emptyA] = alphas;
  assert(bankedA === ALPHA_BANKED, `a banked plug icon draws at full brightness (got ${bankedA})`);
  assert(liveA === ALPHA_LIVE, `an on-track plug icon draws dimmer than banked (got ${liveA})`);
  assert(emptyA === ALPHA_EMPTY, `an unearned plug icon stays faint (got ${emptyA})`);
  assert(ALPHA_EMPTY < ALPHA_LIVE && ALPHA_LIVE < ALPHA_BANKED,
    'the three plug tiers stay visually ordered empty < live < banked');
}

// Stage select shows per-stage and per-cabinet counts; it must render for every
// cabinet across empty / partial / complete plug states without throwing.
{
  const { StageSelectState } = await import('../src/game/hub/index.js');
  const { CABINETS } = await import('../src/data/cabinets.js');
  const { stagesForCabinet } = await import('../src/data/stages.js');
  const { totalPlugs } = await import('../src/game/progress.js');
  const ctx = globalThis.document.createElement('canvas').getContext('2d');

  const fill = (kind) => {
    const plugs = {};
    for (const s of STAGES) {
      plugs[s.id] = kind === 'full' ? [true, true, true] : kind === 'partial' ? [true, false, true] : [false, false, false];
    }
    return plugs;
  };

  let threw = null;
  for (const kind of ['empty', 'partial', 'full']) {
    for (const cab of CABINETS) {
      const slot = { coins: 0, campaign: { plugs: fill(kind), ranks: {}, cleared: {}, bossesDown: {} } };
      const st = new StageSelectState({ save: { slot }, cab, flow: {} });
      st.enter();
      try { st.draw(ctx); } catch (e) { threw = `${kind}/${cab.id}: ${e.message}`; }
    }
  }
  assert(!threw, `stage select renders for every cabinet and plug state (${threw || 'no throw'})`);

  // Rows are sized from the option count, so the list has to stay inside the
  // panel in the loaded case as well as the empty one — six rows is the ceiling
  // (three stages, BOSS, CORRUPTED MODE, BACK) and it must not push the last
  // row's blurb down into the bottom status strip.
  const { H } = await import('../src/engine/renderer.js');
  let worst = 0, worstCab = '', worstRows = 0;
  for (const cab of CABINETS) {
    const slot = { coins: 0, campaign: { plugs: fill('full'), ranks: {}, cleared: { [cab.id]: true }, bossesDown: {} } };
    const st = new StageSelectState({ save: { slot }, cab, flow: {} });
    st.enter();
    const rows = st.options().length;
    const bottom = st.listY + rows * st.rowH;
    if (bottom > worst || (bottom === worst && rows > worstRows)) { worst = bottom; worstRows = rows; worstCab = cab.id; }
  }
  assert(worstRows === 6, `a boss cabinet with corrupted mode open reaches the six-row case (got ${worstRows} at ${worstCab})`);
  assert(worst <= H - 16, `the fullest stage list clears the status strip: ${worstCab} ends at ${worst.toFixed(1)} of ${H - 16}`);

  // The per-cabinet denominator must be three per stage, and the totals must
  // agree with progress.totalPlugs rather than being counted a second way.
  const slot = { coins: 0, campaign: { plugs: fill('partial'), ranks: {}, cleared: {}, bossesDown: {} } };
  const cab = CABINETS[0];
  const cabStages = stagesForCabinet(cab.id);
  const cabGot = cabStages.reduce((n, s) => n + slot.campaign.plugs[s.id].filter(Boolean).length, 0);
  assert(cabGot === cabStages.length * 2, `partial fill gives 2 of 3 per stage (${cabGot}/${cabStages.length * 3})`);
  assert(totalPlugs(slot) === STAGES.length * 2, `campaign total agrees with progress.totalPlugs (${totalPlugs(slot)})`);

  // The denominator shown to the player must be reachable: plugging everything
  // has to land exactly on MAX_PLUGS, or the hub advertises a target that can
  // never be hit. This is what catches a stage being added without the ceiling.
  const { MAX_PLUGS } = await import('../src/game/progress.js');
  const maxed = { coins: 0, campaign: { plugs: fill('full'), ranks: {}, cleared: {}, bossesDown: {} } };
  assert(totalPlugs(maxed) === MAX_PLUGS, `a fully plugged campaign hits the advertised ceiling (${totalPlugs(maxed)}/${MAX_PLUGS})`);
  assert(MAX_PLUGS >= UNLOCKS.finale, `the finale gate (${UNLOCKS.finale}) is inside the ceiling (${MAX_PLUGS})`);
}

// Stages inside a cabinet open in order, one plug at a time. The rule has to
// stay reachable from a blank save: every cabinet's first stage is open, and
// every later one is opened by the row above it and nothing else.
{
  const { stageUnlocked, prevStage } = await import('../src/game/progress.js');
  const { CABINETS } = await import('../src/data/cabinets.js');
  const { stagesForCabinet } = await import('../src/data/stages.js');
  const blank = { campaign: { plugs: {} } };

  for (const cab of CABINETS) {
    const [first] = stagesForCabinet(cab.id);
    assert(prevStage(first) === null && stageUnlocked(blank, first),
      `${cab.id}: the cabinet's first stage is open on a blank save`);
  }
  const later = STAGES.filter((s) => s.index > 1);
  assert(later.every((s) => !stageUnlocked(blank, s)),
    `every stage past the first is locked on a blank save (${later.length} checked)`);

  // One plug is the whole bar — and it need not be the mission plug, so a
  // toaster grabbed on a failed run still moves you forward.
  const s2 = STAGES.find((s) => s.id === 'plumber-2'), s3 = STAGES.find((s) => s.id === 'plumber-3');
  const toasterOnly = { campaign: { plugs: { 'plumber-1': [false, false, true] } } };
  assert(stageUnlocked(toasterOnly, s2), 'a toaster-only plug on stage 1 opens stage 2');
  assert(!stageUnlocked(toasterOnly, s3), 'stage 2 does not open until stage 2 itself is plugged');

  // Gates are per-cabinet: plugs in one cabinet never open another's stage 2.
  const elsewhere = { campaign: { plugs: {} } };
  for (const s of STAGES) if (s.id !== 'plumber-1') elsewhere.campaign.plugs[s.id] = [true, true, true];
  assert(!stageUnlocked(elsewhere, s2), 'a fully plugged campaign minus stage 1 still locks stage 2');
}

console.log(failed ? 'PLUG TALLY: FAILED' : 'PLUG TALLY: PASSED');
process.exit(failed ? 1 : 0);
