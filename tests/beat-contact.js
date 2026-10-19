// A RHYTHM COIN PINGS ON ITS BEAT, WHEREVER THE HERO STANDS.
//
// Peter, 19 Oct 2026: "the music and items MUST match perfectly it's a rhythm level
// after all and i want the flexibility to have the hero at different positions in
// different modes". The hero's column is per framing (player.js HERO_ANCHOR) and the
// beat chart lays every coin from his LIVE world x, on its line at the left of his
// slot. His hitbox front meets it ~10px before the line, and that lead is what lets
// the ping be PLACED on the beat (run.js pickupLineInBeats) instead of fired an
// output latency late — laying coins on the hitbox front instead put every ping late
// ("coins aren't placed on beat anymore"). This plays the rhythm stages through once
// per framing (desktop, desktop zoomed in, tablet, phone) and
// requires every coin met by his front to be taken BEFORE its beat with its ping
// placed on the beat, by the same lead at every column — and held on screen until
// that beat, popping on it, so what the player sees agrees with what they hear.
// Coins he comes down onto from above are left out: those he meets with his feet on
// the way down, and when is decided by the arc of his jump.
//
// One child process per framing: the device tier is resolved once and cached
// (run.js tier()), exactly as it is on a real device.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { installDom } from './dom-stub.js';

const self = fileURLToPath(import.meta.url);
// Not rhythm-3: its tempo steps at each checkpoint (bpmRamp) and the marks already in
// flight arrive up to ~0.09 of a beat late until one lookahead has passed — a known,
// argued trade (run.js, at the checkpoint's beatBpmSteps), not a placement error.
const STAGES = ['rhythm-1', 'rhythm-2'];
// The lead is 10px of travel, give or take the frame the overlap is found on: at
// these stages' tempo and speed, 0.04-0.12 of a beat.
const LEAD_MIN = 0.03, LEAD_MAX = 0.15;

if (process.argv[2] === '--child') {
  const framing = process.argv[3], stageId = process.argv[4];
  const tier = framing === 'desktopClose' ? 'desktop' : framing;
  installDom();
  globalThis.window.__mash_platform = {
    isDesktop: tier === 'desktop', isIphone: tier === 'phone', isAndroidPhone: false,
  };
  const { RunState } = await import('../src/game/run.js');
  const { save } = await import('../src/engine/save.js');
  const { DemoBot } = await import('../src/game/bot.js');
  const { STAGES: ALL } = await import('../src/data/stages.js');
  const { CABINET_BY_ID } = await import('../src/data/cabinets.js');
  const { Audio } = await import('../src/engine/audio.js');
  const player = await import('../src/game/player.js');
  save.load(); save.newSlot(0, 0);
  save.settings.zoomIn = framing === 'desktopClose';
  const stage = ALL.find((s) => s.id === stageId);
  let beat = 0;
  Audio.sourceBank = CABINET_BY_ID[stage.cabinet].music;
  Audio.songBeat = () => beat;
  let result = null;
  const run = new RunState({
    stage, team: ['lorenzo', 'rusty', 'clara'], save, seed: 101, difficulty: 1, devInvuln: true,
    onEnd: (r) => { result = r; },
  });
  run.enter();
  const offs = [];
  const TICK = 1 / 60;
  let pinged = null;
  const realSfx = Audio.sfx;
  Audio.sfx = function (name, opt = {}) {
    if (name === 'coin') pinged = opt.inBeats;
    return realSfx.call(this, name, opt);
  };
  const onPickup = run.onPickup.bind(run);
  run.onPickup = (p) => {
    pinged = 'none';
    const r = onPickup(p);
    // Only coins met by his FRONT — taken within a frame's travel of the hitbox front.
    // A coin he comes down onto from above is met by his feet, late, wherever it was
    // laid: that is the jump's arc, not the coin's placement.
    const front = run.playerWorldX() + (player.PLAYER_SPRITE_W + player.PLAYER_W) / 2 + player.beatLayOff(p.w);
    if (p.type === 'coin' && Number.isFinite(p.actionBeat) && p.x >= front - run.speed * TICK * 1.5) {
      const lead = p.actionBeat - run.rhythmBeatForJudging();
      // [how far before its beat it was taken, the inBeats its ping was placed at]
      offs.push([lead, typeof pinged === 'number' ? pinged : null]);
      held.add(p);
    }
    return r;
  };
  // And when each of those coins leaves the screen: on its beat (run.js popTakenCoins).
  const held = new Set(), pops = [];
  const watchPops = () => {
    for (const p of held) {
      if (p.live) continue;
      held.delete(p);
      pops.push(run.rhythmBeatForJudging() - p.actionBeat);
    }
  };
  const bot = new DemoBot(run);
  for (let t = 0; !result && t < 60 * 60 * 4; t++) {
    beat += TICK * run.laneBpm() / 60;
    bot.update(TICK); run.update(TICK); watchPops();
  }
  console.log(JSON.stringify({ anchor: player.PLAYER_X, offs, pops }));
  process.exit(0);
}

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; } else console.log('ok:', msg);
}
const { HERO_ANCHOR } = await import('../src/game/player.js');
const anchors = new Set();
const leadsBy = [];
for (const tier of ['desktop', 'desktopClose', 'tablet', 'phone']) {
  for (const stageId of STAGES) {
    const r = spawnSync('node', [self, '--child', tier, stageId], { encoding: 'utf8', maxBuffer: 64 << 20 });
    if (r.status !== 0) { assert(false, `${tier} ${stageId}: run crashed\n${r.stderr}`); continue; }
    const { anchor, offs, pops } = JSON.parse(r.stdout.trim().split('\n').pop());
    anchors.add(anchor);
    assert(anchor === HERO_ANCHOR[tier], `${tier} ${stageId}: the hero stands at the ${tier} column (${anchor})`);
    const bad = offs.filter(([lead, ping]) => lead < LEAD_MIN || lead > LEAD_MAX
      || ping == null || Math.abs(ping - lead) > 1e-9);
    const leads = offs.map(([lead]) => lead);
    const lo = Math.min(...leads), hi = Math.max(...leads);
    assert(offs.length > 20 && bad.length === 0,
      `${tier} ${stageId}: all ${offs.length} chart coins taken ${(lo * 1000).toFixed(0)}-${(hi * 1000).toFixed(0)}‰ `
      + `of a beat early with the ping placed on the beat`
      + `${bad.length ? `; bad: ${bad.slice(0, 6).map(([l, p]) => `${(l * 1000).toFixed(0)}/${p == null ? 'fired' : (p * 1000).toFixed(0)}`).join(' ')}` : ''}`);
    leadsBy.push([tier, stageId, lo, hi]);
    // Popped on the frame its beat arrives: never before, at most a frame after.
    const offPops = pops.filter((o) => o < -1e-9 || o > 0.045);
    assert(pops.length > 20 && offPops.length === 0,
      `${tier} ${stageId}: and all ${pops.length} stay on screen until their beat and pop on it`
      + `${offPops.length ? ` (off: ${offPops.slice(0, 6).map((o) => (o * 1000).toFixed(0)).join(' ')}‰)` : ''}`);
  }
}
for (const stageId of STAGES) {
  const rows = leadsBy.filter((r) => r[1] === stageId);
  const spread = Math.max(...rows.map((r) => r[2])) - Math.min(...rows.map((r) => r[2]));
  assert(spread < 0.02, `${stageId}: the same lead at every hero column (earliest leads within ${(spread * 1000).toFixed(0)}‰)`);
}
assert(anchors.size === new Set(Object.values(HERO_ANCHOR)).size && anchors.size > 1,
  `the hero stood at ${anchors.size} different columns across the framings (${[...anchors].join(', ')})`);

// AND FAR ENOUGH AHEAD FOR A SLOW EAR. On Bluetooth or a positive AUDIO SYNC the ping
// needs more warning than the hitbox front's 10px, or it cannot be scheduled early
// enough and rings late (run.js coinReachAheadPx). Asked of the method directly with
// a stand-in clock: headless runs have no audio context, so they never exercise it.
{
  installDom();
  const { RunState } = await import('../src/game/run.js');
  const { Audio, CUE_ONSET_LEAD } = await import('../src/engine/audio.js');
  const { PLAYER_SPRITE_W, PLAYER_W } = await import('../src/game/player.js');
  const ctx0 = Audio.ctx, heard0 = Audio.heardLatencySec;
  Audio.ctx = {};
  const fake = { beatLock: true, speed: 160, laneBpm: () => 124 };
  for (const lat of [0.01, 0.06, 0.2]) {
    Audio.heardLatencySec = () => lat;
    const extra = RunState.prototype.coinReachAheadPx.call(fake);
    const leadSec = ((PLAYER_SPRITE_W + PLAYER_W) / 2 + extra) / fake.speed;
    const need = lat + CUE_ONSET_LEAD.coin;
    assert(leadSec >= need, `a ${lat * 1000}ms ear: the coin is taken ${(leadSec * 1000).toFixed(0)}ms ahead, `
      + `enough to place its ping (${(need * 1000).toFixed(0)}ms)`);
  }
  Audio.ctx = ctx0; Audio.heardLatencySec = heard0;
}

if (failed) { console.error('BEAT-CONTACT: FAILED'); process.exit(1); }
console.log('BEAT-CONTACT: PASSED');
