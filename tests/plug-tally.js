// The in-run HUD must show which of the stage's three plugs are already banked
// from earlier attempts (gold) versus on track right now (green), so a replay
// makes it obvious what is still worth chasing.
import { installDom } from './dom-stub.js';
installDom();

const { drawHud } = await import('../src/game/hud.js');
const { STAGES, UNLOCKS } = await import('../src/data/stages.js');
const { HERO_BY_ID } = await import('../src/data/heroes.js');
const { PLUG_FRAME_LW, ALPHA_BANKED, ALPHA_LIVE, ALPHA_EMPTY } = await import('../src/game/plugs.js');
const anyHero = Object.keys(HERO_BY_ID)[0];

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// Plug state is carried by each icon box's frame, stroked as a rounded hairline.
// The frame width is used nowhere else in the game, so it identifies the three
// frames unambiguously and they arrive in mission/challenge/toaster order. It
// comes from the source rather than a literal so art tuning cannot break this.
function recordingCtx() {
  const real = globalThis.document.createElement('canvas').getContext('2d');
  const strokes = [];
  return {
    ctx: new Proxy(real, {
      get(t, k) {
        if (k === 'stroke') return (...a) => { strokes.push({ c: t.strokeStyle, lw: t.lineWidth }); return real.stroke(...a); };
        const v = t[k];
        return typeof v === 'function' ? v.bind(t) : v;
      },
      set(t, k, v) { t[k] = v; return true; },
    }),
    tally: () => {
      const frames = strokes.filter((s) => s.lw === PLUG_FRAME_LW).map((s) => s.c);
      return [0, 1, 2].map((i) => frames[i]);
    },
  };
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
    player: { abilityCd: 0 },
    save: { slot: { campaign: { plugs: { [stage.id]: banked } } }, settings: {} },
    ...over,
  };
}

const GOLD = '#f6d33c', GREEN = '#48c848', DARK = '#3a3a48';

function tallyFor(banked, over = {}) {
  const r = recordingCtx();
  drawHud(r.ctx, mkRun(banked, over));
  return r.tally();
}

let t = tallyFor(undefined);
assert(t.join() === [DARK, DARK, DARK].join(), `fresh stage shows three empty plugs (got ${t})`);

t = tallyFor([true, false, false]);
assert(t[0] === GOLD && t[1] === DARK && t[2] === DARK, `a banked mission plug reads gold (got ${t})`);

t = tallyFor([true, true, true]);
assert(t.join() === [GOLD, GOLD, GOLD].join(), `a fully plugged stage reads all gold (got ${t})`);

// Grabbing the toaster this run lights T green while it is still unbanked.
t = tallyFor([true, false, false], { applianceGot: true });
assert(t[2] === GREEN, `toaster grabbed this run reads green (got ${t})`);

// Already-banked wins over on-track: it stays gold, not green.
t = tallyFor([true, false, true], { applianceGot: true });
assert(t[2] === GOLD, `an already-banked toaster stays gold (got ${t})`);

// Meeting the challenge target this run lights C green.
t = tallyFor([false, false, false], { challenge: { type: 'coins', n: 5, count: 5, failed: false, desc: 'GET COINS' } });
assert(t[1] === GREEN, `challenge target met this run reads green (got ${t})`);

// A failed challenge must not read as on track.
t = tallyFor([false, false, false], { challenge: { type: 'coins', n: 5, count: 5, failed: true, desc: 'GET COINS' } });
assert(t[1] === DARK, `a failed challenge does not read green (got ${t})`);

// The mission plug is never green mid-run — it only lands at the socket.
t = tallyFor([false, false, false], { mission: { type: 'targets', n: 3, count: 3 } });
assert(t[0] === DARK, `mission stays unlit mid-run even when its counter is full (got ${t})`);

// The frame is a third-of-a-pixel hairline, so colour alone cannot carry
// banked-vs-live: the icon brightness has to differ too, or an on-track plug
// looks exactly like one you already own. drawProp composites each icon with a
// single drawImage, so the alpha in force at that call is the pip's tier.
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

// Overtime has no stage and must draw no tally at all.
t = tallyFor([true, true, true], { overtime: true, stage: null, challenge: null });
assert(t.every((c) => c === undefined), 'overtime draws no plug tally');

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

console.log(failed ? 'PLUG TALLY: FAILED' : 'PLUG TALLY: PASSED');
process.exit(failed ? 1 : 0);
