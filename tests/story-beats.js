// Story beats: bespoke cabinet taunts, ACT-banner intro freeze, and the
// finish-line Dust Devil hold — the narrative hooks in RunState.
import { installDom } from './dom-stub.js';
const dom = installDom();

const { RunState } = await import('../src/game/run.js');
const { save } = await import('../src/engine/save.js');
const { Input } = await import('../src/engine/input.js');
const { STAGES, STAGE_BY_ID } = await import('../src/data/stages.js');
const { CABINETS, CABINET_BY_ID } = await import('../src/data/cabinets.js');
const { EGGSHELL_TAUNTS, EXIT_LINES, TAG_LINES } = await import('../src/data/jokes.js');
const { BRIEFINGS, BRIEFING_PROMPTS } = await import('../src/data/briefings.js');
const { BriefingState } = await import('../src/game/menus.js');
const { BOSSES } = await import('../src/game/boss.js');

save.load();
save.newSlot(0, 0);

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const TICK = 1 / 60;
function makeRun(stage, onEnd = () => {}) {
  const run = new RunState({
    stage, team: ['lorenzo', 'gnash', 'mochi'], save, seed: 12345, difficulty: 1, onEnd,
  });
  run.enter();
  return run;
}

// --- ACT announcement: banner text + 2s world freeze -----------------------
{
  const run = makeRun(STAGE_BY_ID['frost-1']);
  assert(run.introFreeze === 2, 'frost-1 arms a 2s intro freeze');
  assert(run.introText && run.introText.startsWith('ACT II'), `banner shows the authored ACT text (${run.introText})`);
  for (let i = 0; i < 10; i++) run.update(TICK);
  assert(run.camX === 0 && run.tRun === 0, 'world holds still during the ACT banner');
  for (let i = 0; i < 130; i++) run.update(TICK);
  assert(run.introFreeze <= 0 && run.camX > 0, 'world advances once the banner clears');

  // --- Taunts are ambient only: the cabinet's line belongs to the briefing --
  run.tauntT = 0.001;
  run.update(TICK);
  assert(run.speech && EGGSHELL_TAUNTS.includes(run.speech.text),
    `taunts come from the generic pool (${run.speech && run.speech.text})`);
  assert(run.speech.text !== CABINET_BY_ID.frost.taunt,
    'the cabinet\'s authored line does not play in-run');
}

// --- Non-ACT intro rides the speech bubble, no freeze ----------------------
{
  const run = makeRun(STAGE_BY_ID['plumber-1']);
  assert(run.introFreeze === 0, 'plumber-1 intro does not freeze the world');
  assert(run.speech && run.speech.text === STAGE_BY_ID['plumber-1'].intro,
    'plumber-1 intro shows as a speech bubble');
  // Authored speaker wins over the narrator sentinel, so the bubble gets a face
  // and a name — even though Lorenzo need not be on this run's team.
  assert(run.speech.who === 'lorenzo', 'plumber-1 intro is attributed to Lorenzo');
}

// --- An unattributed intro still falls back to the narrator sentinel -------
{
  const run = makeRun(STAGE_BY_ID['office-1']);
  assert(run.speech && run.speech.who === 'intro',
    'office-1 has no authored speaker, so it stays a narrator bubble');
}

// --- Death-restart does not replay the intro stall -------------------------
{
  const run = makeRun(STAGE_BY_ID['frost-1']);
  run.enter(); // second enter() on the same RunState = retry from checkpoint
  assert(run.introFreeze === 0, 'retrying an attempt skips the ACT banner');
}

// --- Finish-tape hold: brief camera lock + iris wipe before the results ----
{
  let result = null;
  const run = makeRun(STAGE_BY_ID['plumber-1'], (r) => { result = r; });
  for (let i = 0; i < 5; i++) run.update(TICK); // clear of enter()
  run.camX = run.finishCameraX() + 1;
  run.obstacles = []; run.projectiles = []; run.pickups = [];
  run.update(TICK);
  assert(run.finishing, 'crossing the camera threshold starts the finish run');
  let guard = 60 * 20;
  while (run.finaleT == null && !result && guard-- > 0) {
    run.obstacles = []; run.projectiles = [];
    run.update(TICK);
  }
  assert(run.finaleT != null, 'crossing the tape arms the finale hold instead of ending instantly');
  const held = run.camX;
  for (let i = 0; i < 10; i++) run.update(TICK); // < FINALE_HOLD (0.25s)
  assert(run.camX === held && result === null, 'camera locked and run unresolved mid-hold');
  for (let i = 0; i < 60 && !result; i++) run.update(TICK);
  assert(result && result.success, 'run resolves successfully after the hold');
}

// --- Briefing manifest: 27 stages briefed, 9 cabinets have prompts ---------
{
  const unbriefed = STAGES.filter((s) => !(BRIEFINGS[s.id] || []).length).map((s) => s.id);
  assert(unbriefed.length === 0, `every stage has a briefing (missing: ${unbriefed.join(', ') || 'none'})`);
  const badBlocks = Object.entries(BRIEFINGS).filter(([, blocks]) =>
    blocks.some((b) => !b.head || !b.text || b.text !== b.text.toUpperCase()));
  assert(badBlocks.length === 0, 'briefing blocks all have letterhead + uppercase body');
  const unprompted = CABINETS.filter((c) => !BRIEFING_PROMPTS[c.id]).map((c) => c.id);
  assert(unprompted.length === 0, `every cabinet has a validation prompt (missing: ${unprompted.join(', ') || 'none'})`);
}

// --- Briefing screen: the memo cascades in, then confirm to proceed --------
{
  let launched = false;
  const st = new BriefingState({
    cab: CABINET_BY_ID.frost, stage: STAGE_BY_ID['frost-1'], onDone: () => { launched = true; },
  });
  st.enter();
  assert(st.pieces.length === 3 && st.pieces[0].text.startsWith('MISSION:'),
    'frost-1 briefing = mission line + 2 memo blocks');
  st.update(TICK);
  assert(!st.landed() && !launched, 'the memo is still landing; no early launch');
  Input.press('confirm'); st.update(TICK); Input.release('confirm'); st.update(TICK);
  assert(st.landed() && !launched, 'first confirm lands the whole memo');
  Input.press('confirm'); st.update(TICK); Input.release('confirm');
  assert(launched, 'second confirm launches the stage');
}

// --- Relay exit lines: one voice per swap, once per hero per run -----------
{
  assert(Object.keys(EXIT_LINES).length === 8, 'every hero has exit lines');
  for (const [id, lines] of Object.entries(EXIT_LINES)) {
    assert(TAG_LINES[id], `exit lines for ${id} use a real hero id`);
    assert(lines.length && lines.every((l) => typeof l === 'string' && l.length),
      `${id} exit lines are non-empty strings`);
  }

  // A player past the one-time tutorials — those rightly outrank flavour once.
  save.slot.tutor = { firstPortal: true, firstSwitch: true, firstAbility: true };
  const run = makeRun(STAGE_BY_ID['plumber-1']);
  for (let i = 0; i < 5; i++) run.update(TICK);
  run.relay.current = 'lorenzo';
  run.relay.next = 'gnash';
  run.doSwitch();
  assert(run.speech && run.speech.who === 'lorenzo' && EXIT_LINES.lorenzo.includes(run.speech.text),
    'the departing hero speaks at the swap');
  // Nothing queues behind it: the HUD's ability panel already names the
  // incoming hero's power, so no button tip repeats it.
  assert(!run.speechQueue.length,
    'nothing follows the exit line — the incoming hero does not reply');
  run.speech.t = 0.001;
  run.update(TICK);
  assert(!run.speech, 'the bubble clears rather than handing off to a button tip');

  // Second time around, lorenzo has said his piece: the swap is silent.
  run.relay.current = 'lorenzo';
  run.relay.next = 'gnash';
  run.doSwitch();
  assert(!run.speech && !run.speechQueue.length,
    'a hero only says goodbye once per run');
}

// --- Relay bias: scripted links surface often, not once-in-seven -----------
{
  const { Relay } = await import('../src/game/relay.js');
  const { Rng } = await import('../src/engine/rng.js');
  const { HEROES } = await import('../src/data/heroes.js');
  const succOf = Object.fromEntries(HEROES.map((h, i) => [h.id, HEROES[(i + 1) % HEROES.length].id]));
  const relay = new Relay(new Rng(777), { tags: 0 });
  let scripted = 0;
  const N = 300;
  for (let i = 0; i < N; i++) {
    const r = relay.switchHero();
    if (succOf[r.from] === r.to) scripted++;
  }
  assert(scripted / N > 0.3, `biased draw lands authored hand-offs often (${scripted}/${N})`);
  assert(scripted / N < 0.95, `bag still shuffles — hand-offs are not every swap (${scripted}/${N})`);
}

// --- Portals are scheduled per stage: 3 heroes short, 4 heroes long --------
{
  const { Relay, portalSchedule } = await import('../src/game/relay.js');
  const { Rng } = await import('../src/engine/rng.js');
  // Runs finish early because speed ramps; count only the portals that land
  // before the real finish, since a portal scheduled past the end never spawns.
  const realSeconds = (durationSec) => {
    let d = 0, t = 0;
    const dt = 1 / 60, target = durationSec * 1.05;
    while (d < target) { d += Math.min(1.6, 1 + 0.03 * Math.sqrt(t)) * dt; t += dt; }
    return t;
  };
  for (const [durationSec, heroes] of [[60, 3], [90, 4], [120, 4]]) {
    const sch = portalSchedule(durationSec);
    const real = realSeconds(durationSec);
    const taken = sch.filter((s) => s < real).length;
    assert(taken + 1 === heroes,
      `a ${durationSec}s stage runs ${heroes} heroes (${taken} handoffs at ${sch.map((s) => s.toFixed(0)).join('/')}s of ~${real.toFixed(0)}s)`);
    // Nobody should arrive for a token few seconds at the death.
    assert(real - sch[sch.length - 1] > 20,
      `the last hero of a ${durationSec}s stage gets a real closing stretch (${(real - sch[sch.length - 1]).toFixed(0)}s)`);
  }
  // OVERTIME has no known length, so it keeps the endless cadence.
  const endless = new Relay(new Rng(1), { tags: 0 }, null);
  endless.update(11);
  assert(endless.portalDue(), 'unscheduled (OVERTIME) relay still spawns portals on a timer');
}

// --- New authored lines are actually reachable -----------------------------
assert(EGGSHELL_TAUNTS.some((l) => l.includes('LOSING TO PLUMBERS SINCE 1986')), 'the 40-year grudge taunt is in the pool');
assert(BOSSES.rhythm.subtitle && BOSSES.rhythm.subtitle.includes('HE HAS TO CLEAN YOU'), 'Dust Devil boss carries its subtitle');

console.log(failed ? 'STORY-BEATS: FAILED' : 'STORY-BEATS: PASSED');
process.exit(failed ? 1 : 0);
