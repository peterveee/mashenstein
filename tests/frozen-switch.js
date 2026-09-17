// THE FROZEN SWITCH, ITS HOLE AND ITS PRIZE — one prop in three pieces, and the
// rule that they live and die together.
//
// The switch is frost's own mechanic: touch it (or shoot it) and the break it
// stands in front of is bridged. It only ever ships as half of a pair — a
// `switch` cell and a `gap` cell, a jump's length apart, in the same pattern —
// and on its own it is a prop that offers a bridge over solid ground.
//
// It came apart because the lane's sweeps all key on `def.action` and the pair
// answers that two ways: the hole is `action: 'jump'`, the switch is
// `action: 'none'`. A route's entry/exit window, a scripted pit's clearance and
// a portal's approach each took the hole and left the switch. The fix is a link
// written when the pattern is laid (Spawner.fill) and read in two places
// (gateOf/retireOrphanSwitches/openGates in run.js); this holds all three ends.
//
// The third piece is the capsule hanging over the break (spawnGatedPrize). It
// is laid with the pattern rather than handed out on the trigger, because that
// is the lesson: a prize you can see over a hole you cannot land in, and a
// switch back up the road that is the only way to have it.
import { installDom } from './dom-stub.js';
installDom();

const { Spawner, REACT_FLOOR, pitClearance } = await import('../src/game/spawner.js');
const { CABINETS, CABINET_BY_ID } = await import('../src/data/cabinets.js');
const { makeObstacle, makePickup, isOpenGap, OBSTACLES } = await import('../src/game/entities.js');
const { RunState } = await import('../src/game/run.js');
const { save } = await import('../src/engine/save.js');
const { Input } = await import('../src/engine/input.js');
const { PLAYER_X } = await import('../src/game/player.js');
const { Rng } = await import('../src/engine/rng.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// --- the authored data -----------------------------------------------------
// Nothing may ship a switch with no hole behind it. The run has a reading for
// one (openGates falls back to the next break ahead), but it is a fallback for
// a pattern nobody has written yet, not a licence to write one.
let switchCells = 0, unpaired = 0;
for (const cab of CABINETS) {
  for (const pat of cab.patterns || []) {
    const cells = pat.cells || [];
    for (let i = 0; i < cells.length; i++) {
      if (cells[i].t !== 'switch') continue;
      switchCells++;
      if (!cells.slice(i + 1).some((c) => c.t === 'gap')) unpaired++;
    }
  }
}
assert(switchCells > 0, `the cabinets still author the switch (${switchCells} cells)`);
assert(unpaired === 0, 'every authored switch cell is followed by a gap cell in the same pattern');

// --- the link the spawner writes -------------------------------------------
const frost = CABINET_BY_ID.frost;
const speed = 160 * (1 + (frost.speedBonus || 0));
let laid = 0, linked = 0, linkedToItsOwnHole = 0;
for (let seed = 0; seed < 60; seed++) {
  const spawner = new Spawner({
    cabinet: frost, rng: new Rng(seed).stream('spawn'), tierMax: 2,
    react: REACT_FLOOR, iceSlide: 14,
  });
  spawner.nextX = 300;
  const obstacles = [], pickups = [];
  for (let worldX = 0; worldX < 20000; worldX += 480) {
    spawner.fill(worldX, speed, obstacles, pickups, () => 45);
  }
  for (const ob of obstacles) {
    if (!ob.def.isSwitch) continue;
    laid++;
    if (ob.gateId == null) continue;
    linked++;
    const gate = obstacles.find((o) => o.id === ob.gateId);
    // Behind the switch and within one pattern's reach — the pairing must be
    // the hole this switch was authored with, not the next one in the stage.
    if (gate && gate.def.isGap && gate.x > ob.x && gate.x - ob.x < 300) linkedToItsOwnHole++;
  }
}
assert(laid > 0, `the spawner deals switches on frost (${laid} in 60 lanes)`);
assert(linked === laid, `every dealt switch carries a gateId (${linked}/${laid})`);
assert(linkedToItsOwnHole === laid, 'and every gateId names the hole from its own pattern');

// --- the run's half: retire, and bridge only your own hole ------------------
save.load();
save.newSlot(0, 0);

function bareRun(seed = 7) {
  const r = new RunState({
    stage: {
      id: 'frost-test', cabinet: 'frost', index: 2,
      mission: { type: 'reach', desc: 'TEST' },
      challenge: { type: 'coins', n: 9999, desc: 'TEST' },
      durationSec: 40, applianceAt: 0.5, applianceHigh: false,
    },
    team: ['lorenzo', 'rusty', 'clara'],
    save, seed, difficulty: 1, devInvuln: true, onEnd: () => {},
  });
  r.enter();
  return r;
}

{
  const run = bareRun();
  const far = run.viewRightX() + 400;
  const sw = makeObstacle('switch', far);
  const hole = makeObstacle('gap', far + 60);
  sw.gateId = hole.id;
  run.obstacles.length = 0;
  run.obstacles.push(sw, hole);

  run.retireOrphanSwitches();
  assert(sw.live && hole.live, 'a switch whose hole is still there is left alone');

  hole.live = false;            // a sweep takes the hole, as they all may
  run.retireOrphanSwitches();
  assert(!sw.live, 'a switch whose hole was swept is retired with it');
}

{
  // NOTHING VANISHES IN PLAIN VIEW. The same rule retireExit states: a switch
  // already on screen stays on screen, however dead its hole is.
  const run = bareRun();
  const near = run.viewRightX() - 20;
  const sw = makeObstacle('switch', near);
  const hole = makeObstacle('gap', near + 60);
  sw.gateId = hole.id;
  hole.live = false;
  run.obstacles.length = 0;
  run.obstacles.push(sw, hole);
  run.retireOrphanSwitches();
  assert(sw.live, 'an orphaned switch already in the frame is not deleted under the player');
}

{
  // The bridge goes over the switch's OWN hole — never the next one in the
  // stage, which is how one orphan used to make the next.
  const run = bareRun();
  const sw = makeObstacle('switch', 1000);
  const mine = makeObstacle('gap', 1060);
  const somebodyElses = makeObstacle('gap', 9000);
  sw.gateId = mine.id;
  run.obstacles.length = 0;
  run.obstacles.push(sw, mine, somebodyElses);
  run.openGates(sw);
  assert(mine.live && mine.bridged === true,
    'hitting the switch bridges the hole it belongs to — and LEAVES it there, '
    + 'because the crossing is ice laid in the break rather than the break being deleted');
  assert(!isOpenGap(mine), 'a bridged break is not a gap to anything that plays the game');
  assert(somebodyElses.live, 'and leaves a hole further down the stage alone');

  const spent = makeObstacle('switch', 2000);
  spent.gateId = 999999;        // its hole is gone
  const next = makeObstacle('gap', 2400);
  run.obstacles.push(spent, next);
  run.openGates(spent);
  assert(next.live && !next.bridged, 'a switch with no hole left spends its bridge on nothing');
}

// --- and no sign, because the block does not need one -----------------------
// A LEVER had to be taught: it was one 8px machine among a cabinet full of
// them, doing nothing you could see, for a hole you had not met yet — so the
// first one in a stage got a HIT! board a run-up in front of it. A coin block
// with a power symbol on it is taught by the genre, so the sign is gone and so
// is the entity behind it.
{
  assert(!OBSTACLES.switchSign, 'the switch sign is retired from the registry');
  assert(typeof RunState.prototype.signSwitches !== 'function',
    'and nothing in the run still lays one');
}

// --- and the whole thing, on a real frost lane -----------------------------
// The sweeps that broke the pair only run inside a live stage: the route
// windows, the scripted pit clearance, the portal approach. So play frost-3 —
// the stage with two scripted pits, an island, a sky fork and a relay portal —
// and hold the invariant every frame: no switch the player can SEE is standing
// over a hole that is not there.
{
  const TICK = 1 / 60;
  let visibleOrphans = 0, retired = 0, seen = 0, frames = 0;
  for (let seed = 0; seed < 4; seed++) {
    const run = new RunState({
      stage: {
        id: 'frost-3', cabinet: 'frost', index: 3,
        mission: { type: 'reach', desc: 'TEST' },
        challenge: { type: 'coins', n: 9999, desc: 'TEST' },
        durationSec: 90, applianceAt: 0.5, applianceHigh: false,
        pits: [{ at: 0.37, w: 60 }, { at: 0.74, w: 64 }],
      },
      team: ['lorenzo', 'rusty', 'clara'],
      save, seed: 1000 + seed, difficulty: 1, devInvuln: true, onEnd: () => {},
    });
    run.enter();
    const known = new Map();    // switch id -> was it ever live?
    let done = false, ticks = 0;
    while (!done && ticks < 60 * 200) {
      ticks++; frames++;
      // The same reactive bot the run-complete integration uses.
      const px = run.camX + PLAYER_X;
      let nearest = null;
      for (const ob of run.obstacles) {
        if (!ob.live || ob.def.action === 'none') continue;
        if (ob.x + ob.w < px) continue;
        if (!nearest || ob.x < nearest.x) nearest = ob;
      }
      if (run.player.grounded && nearest && nearest.def.action === 'jump'
        && (nearest.x - px) < run.speed * 0.30 && (nearest.x - px) > -8) Input.press('jump');
      else if (run.player.grounded) Input.release('jump');
      run.update(TICK);
      const viewRight = run.viewRightX();
      for (const ob of run.obstacles) {
        if (!ob.def.isSwitch || ob.gateId == null) continue;
        if (ob.live) {
          known.set(ob.id, true);
          seen++;
          if (ob.x <= viewRight && !run.gateOf(ob)) visibleOrphans++;
        } else if (known.get(ob.id) && !ob.broken) {
          known.set(ob.id, false);
          retired++;
        }
      }
      if (run.distance >= run.totalDist) done = true;
    }
  }
  assert(seen > 0, `switches reached the lane on frost-3 (${seen} switch-frames over ${frames} frames)`);
  assert(visibleOrphans === 0,
    `no switch was ever visible with its hole gone (${visibleOrphans} frames)`);
  console.log(`note: ${retired} switch(es) retired with a swept hole across 4 lanes`);
}

// --- the pair has to READ, and portrait is the tightest frame it reads in ----
// The switch's payoff is watching the bridge close the hole in front of you, so
// the hole has to be on screen at the moment the switch is hit. Portrait shows
// far less lane than landscape (zoom 3.5), so it is the frame that sets the
// spacing — 121px of lane ahead of the hero against the pattern's 120.
{
  const renderer = await import('../src/engine/renderer.js');
  const { frameForViewport, defaultFrame } = await import('../src/engine/frame.js');
  const portraitFrame = frameForViewport({
    mode: 'phone-portrait', viewportWidth: 390, viewportHeight: 844,
    safeInsets: { top: 59, right: 0, bottom: 34, left: 0 }, revision: 1,
  });
  renderer.setPresentationFrame(portraitFrame);
  const run = bareRun(11);
  // Re-asserted per tick: entering a stage re-reads the presentation frame.
  for (let i = 0; i < 90; i++) { renderer.setPresentationFrame(portraitFrame); run.update(1 / 60); }
  const ahead = run.viewRightX() - run.playerWorldX();
  assert(Math.abs(run.camZoom - 3.5) < 0.01, `portrait really is at zoom 3.5 (${run.camZoom.toFixed(2)})`);
  // THE SEPARATION, not the raw dx. Cell dx is measured from the PATTERN's
  // origin and only the first two shapes happen to start with the block there —
  // one leads in with a coin arc, another with a drone — so reading the gap's dx
  // alone measures the wrong distance and passes patterns that put the hole
  // half a screen past the thing that opens it. (It caught one: a wide-break
  // shape authored at dx 168 with the block at 0.)
  const holeDx = Math.max(...frost.patterns
    .filter((p) => (p.cells || []).some((c) => c.t === 'switch'))
    .map((p) => p.cells.find((c) => c.t === 'gap').dx
      - p.cells.find((c) => c.t === 'switch').dx));
  assert(holeDx <= ahead,
    `the hole is on screen when the switch is hit, in PORTRAIT (dx ${holeDx} <= ${ahead.toFixed(0)}px of lane)`);
  renderer.setPresentationFrame(defaultFrame());
}

// --- a hop reaches it, and the hop lands short of the lip -------------------
// The switch sits at a height a tap can reach. That is the whole reason the
// hole can sit as close as 120: a max jump travels 122-161px at frost speed and
// would come down in the break, and at alt 46 a max jump was the only way to
// touch it at all.
{
  const { HEROES } = await import('../src/data/heroes.js');
  const { jumpV, gravityFor, PLAYER_H, VARIABLE_JUMP_CUT } = await import('../src/game/player.js');
  const sw = OBSTACLES.switch;
  const lip = Math.min(...frost.patterns
    .filter((p) => (p.cells || []).some((c) => c.t === 'switch'))
    .map((p) => p.cells.find((c) => c.t === 'gap').dx
      - p.cells.find((c) => c.t === 'switch').dx));
  // The rule the authored-altitude block states (tests/standing-hazards.js): a
  // box is reachable when its BOTTOM is under the worst hero's head at apex.
  // The old constant here was 37, which is the worst APEX — the head is a
  // PLAYER_H above that — so it was measuring the wrong end of the hero and
  // holding the block down at a height a tap could reach by accident.
  const { worstJumpApex } = await import('../src/game/spawner.js');
  const reach = worstJumpApex() + PLAYER_H;
  assert(sw.alt < reach,
    `the switch is inside the worst hero's reach (bottom ${sw.alt} under ${reach.toFixed(1)})`);
  const DT = 1 / 60;
  // The shortest hold that touches it, per hero: how much of a hop the switch
  // actually costs, and where that hop comes down.
  const hop = (hero, hold) => {
    const speed = 160 * (1 + (frost.speedBonus || 0)) * hero.speedMult;
    const g = gravityFor(hero), v0 = jumpV(hero);
    let y = 0, vy = v0, t = 0, touched = false;
    while (y >= 0 || t === 0) {
      if (t > hold && hero.variableJump && vy > VARIABLE_JUMP_CUT) vy = VARIABLE_JUMP_CUT;
      if (y + PLAYER_H >= sw.alt && y <= sw.alt + sw.h) touched = true;
      vy -= g * DT; y += vy * DT; t += DT;
      if (y < 0) break;
    }
    return { touched, land: t * speed };
  };
  let worstHold = 0, worstLanding = 0, unreachable = [];
  for (const hero of Object.values(HEROES)) {
    let found = null;
    for (let hold = 0; hold <= 0.5 && !found; hold += DT) {
      const h = hop(hero, hold);
      if (h.touched) found = { hold, land: h.land };
    }
    if (!found) { unreachable.push(hero.id || hero.name); continue; }
    worstHold = Math.max(worstHold, found.hold);
    worstLanding = Math.max(worstLanding, found.land);
  }
  assert(unreachable.length === 0,
    `every hero can touch the switch (${unreachable.join(', ') || 'all 8'})`);
  // A PRESS, NOT A TAP, and not a held jump either. At 26 the longest minimum
  // hold in the cast was 33ms, which is one frame of intent; the block is
  // something you go for now. The ceiling stays 100ms — past that it is the
  // max-jump input that used to land heroes in the hole.
  assert(worstHold >= 0.05 && worstHold <= 0.1,
    `it costs a press, not a tap and not a held jump (longest minimum hold ${(worstHold * 1000).toFixed(0)}ms)`);
  assert(worstLanding < lip,
    `that hop lands clear of the near lip (${worstLanding.toFixed(0)}px against ${lip})`);
}

// --- it is a BLOCK, and it is HIT rather than broken ------------------------
// It was a lever on a post for three rounds. A lever has to be taught — hence
// the sign that used to stand in front of the first one — and a coin block with
// a power symbol on it does not. It takes the coin block's own box (qcrate's
// 12x11) at the lever's own alt, so the bottom of it, which is the number the
// hop was tuned against, has not moved.
{
  const def = OBSTACLES.switch;
  const qcrate = OBSTACLES.qcrate;
  assert(def.stand === undefined,
    'the switch is not a post any more — the block floats, the way a coin block does');
  assert(!def.bob, 'and it does not bob — a machine is not a prize hovering');
  assert(def.breakable === false && def.throwable === true,
    'a hit throws it rather than breaking it');
  assert(def.w === qcrate.w && def.h === qcrate.h,
    `the BOX is the coin block's box (${def.w}x${def.h}), which is what the player already knows how to hit`);
  assert(def.alt === 36,
    'and it hangs at 36 — high enough that reaching it is a decision, low enough '
    + 'that the jump which reaches it still lands short of the hole it opens');

  const run = bareRun(21);
  const sw = makeObstacle('switch', 1000);
  const hole = makeObstacle('gap', 1120);
  hole.w = 60;
  sw.gateId = hole.id;
  run.obstacles.length = 0;
  run.obstacles.push(sw, hole);

  run.throwSwitch(sw);
  assert(sw.live === true, 'a thrown switch STAYS in the lane');
  assert(sw.broken !== true, 'it is not broken — there is no debris and nothing is removed');
  assert(sw.thrown === true && sw.thrownT === 0, 'it is marked thrown, with its own swing clock');
  assert(hole.live && hole.bridged === true, 'and the bridge went in — over a hole that is still there');

  // Spent. A post the player runs back through — or one the collision loop
  // reaches twice on the frame it fires — must not open a second gate.
  const second = makeObstacle('gap', 1400);
  run.obstacles.push(second);
  run.throwSwitch(sw);
  assert(second.live, 'throwing a spent switch again opens nothing');
}

// --- the prize over the hole -----------------------------------------------
// It is laid WITH the pattern, not handed out when the switch is hit: a capsule
// hanging over a break you cannot land in is the lesson. Skip the switch and
// you run past a prize you can see and cannot have.
{
  const { COIN_FLOOR } = await import('../src/game/spawner.js');
  const { PICKUPS } = await import('../src/game/entities.js');
  let holes = 0, prized = 0, offCentre = 0, wrongAlt = 0, unlinked = 0;
  for (let seed = 0; seed < 40; seed++) {
    const spawner = new Spawner({
      cabinet: frost, rng: new Rng(seed).stream('spawn'), tierMax: 2,
      react: REACT_FLOOR, iceSlide: 14,
    });
    spawner.nextX = 300;
    const obstacles = [], pickups = [];
    for (let worldX = 0; worldX < 20000; worldX += 480) {
      spawner.fill(worldX, speed, obstacles, pickups, () => 45);
    }
    for (const sw of obstacles) {
      if (!sw.def.isSwitch || sw.gateId == null) continue;
      holes++;
      const hole = obstacles.find((o) => o.id === sw.gateId);
      const prize = pickups.find((p) => p.gated && p.gateId === sw.gateId);
      if (!prize) continue;
      prized++;
      if (Math.abs((prize.x + (PICKUPS[prize.type]?.w || 8) / 2) - (hole.x + hole.w / 2)) > 1) offCentre++;
      if (prize.alt !== COIN_FLOOR) wrongAlt++;
      if (prize.type === 'capRewind') unlinked++;
    }
  }
  assert(holes > 0 && prized === holes, `every switch hole carries a prize (${prized}/${holes})`);
  assert(offCentre === 0, 'each one hangs dead centre of the break');
  assert(wrongAlt === 0, 'at coin height, so a bridge leaves it standing on the new ground');
  assert(unlinked === 0, "and never a rewind capsule — the stage's one rewind is scripted");
}

// It has to be OUT OF REACH while the hole is open, or the lesson is a lie and
// the prize is just a coin. The arc that clears the break passes high over it.
{
  const { PICKUPS } = await import('../src/game/entities.js');
  const { HEROES } = await import('../src/data/heroes.js');
  const { jumpV, gravityFor, PLAYER_H } = await import('../src/game/player.js');
  const pat = frost.patterns.find((p) => (p.cells || []).some((c) => c.t === 'switch'));
  const gap = pat.cells.find((c) => c.t === 'gap');
  const prizeDx = gap.dx + gap.w / 2;         // centre of the break
  const prizeTop = 8 + (PICKUPS.capShield?.h || 8);
  const DT = 1 / 60;
  let grabbed = [];
  for (const hero of Object.values(HEROES)) {
    const heroSpeed = 160 * (1 + (frost.speedBonus || 0)) * hero.speedMult;
    const g = gravityFor(hero);
    // Held jump from the near lip — the jump that clears the hole.
    let y = 0, vy = jumpV(hero), x = gap.dx;
    while (y >= 0) {
      if (x >= prizeDx - 4 && x <= prizeDx + 4 && y <= prizeTop && y + PLAYER_H >= 8) {
        grabbed.push(hero.id || hero.name);
        break;
      }
      vy -= g * DT; y += vy * DT; x += heroSpeed * DT;
    }
  }
  assert(grabbed.length === 0,
    `nobody collects the prize by jumping the hole (${grabbed.join(', ') || 'all 8 pass over it'})`);
}

// --- and the prize dies with its BLOCK, not just with its hole --------------
// The failure Peter photographed: a capsule hovering over an open pit with
// nothing in the lane to explain it. The prize knew its hole and nothing else,
// so a sweep that took the block — a portal column takes `action: 'none'`
// things in a narrower window than the hole 120px on ever enters — left the
// promise standing with no way to keep it. About one lane in forty.
{
  // The spawner stamps both ends of the tie.
  let prizes = 0, blocked = 0;
  for (let seed = 0; seed < 30; seed++) {
    const spawner = new Spawner({
      cabinet: frost, rng: new Rng(seed).stream('spawn'), tierMax: 2,
      react: REACT_FLOOR, iceSlide: 14,
    });
    spawner.nextX = 300;
    const obstacles = [], pickups = [];
    for (let worldX = 0; worldX < 20000; worldX += 480) {
      spawner.fill(worldX, speed, obstacles, pickups, () => 45);
    }
    for (const p of pickups) {
      if (!p.gated) continue;
      prizes++;
      const block = obstacles.find((o) => o.id === p.blockId);
      if (block && block.def.isSwitch && block.gateId === p.gateId) blocked++;
    }
  }
  assert(prizes > 0 && blocked === prizes,
    `every gated prize names the block that opens it (${blocked}/${prizes})`);

  // Swept block, open hole: the prize goes with it.
  const run = bareRun(31);
  const far = run.viewRightX() + 400;
  const block = makeObstacle('switch', far);
  const hole = makeObstacle('gap', far + 120);
  hole.w = 60;
  block.gateId = hole.id;
  const prize = makePickup('capShield', hole.x + hole.w / 2 - 4, 8);
  prize.gated = true;
  prize.gateId = hole.id;
  prize.blockId = block.id;
  run.obstacles.length = 0;
  run.obstacles.push(block, hole);
  run.pickups.length = 0;
  run.pickups.push(prize);

  run.retireOrphanSwitches();
  assert(prize.live !== false, 'while the block stands, the prize over the hole stands');

  block.live = false;                       // a portal column takes the block
  run.retireOrphanSwitches();
  assert(prize.live === false,
    'a prize whose block was swept goes with it — never left hovering over an open pit');
  assert(hole.live, 'and the hole itself is untouched: a pit with no prize is still a pit');
}

{
  // The happy ending looks the same from the retire pass's side — block spent,
  // hole dead as a gap — so `bridged` is what tells them apart.
  const run = bareRun(32);
  const far = run.viewRightX() + 400;
  const block = makeObstacle('switch', far);
  const hole = makeObstacle('gap', far + 120);
  hole.w = 60;
  block.gateId = hole.id;
  const prize = makePickup('capShield', hole.x + hole.w / 2 - 4, 8);
  prize.gated = true;
  prize.gateId = hole.id;
  prize.blockId = block.id;
  run.obstacles.length = 0;
  run.obstacles.push(block, hole);
  run.pickups.length = 0;
  run.pickups.push(prize);

  run.openGates(block);
  block.live = false;                       // spent and gone, however it goes
  run.retireOrphanSwitches();
  assert(prize.live !== false,
    'a prize standing on a BRIDGED hole survives its block — that is the reward');
}

{
  // NOTHING VANISHES IN PLAIN VIEW, here as everywhere else in this pass.
  const run = bareRun(33);
  const near = run.viewRightX() - 30;
  const block = makeObstacle('switch', near - 120);
  const hole = makeObstacle('gap', near);
  hole.w = 60;
  block.gateId = hole.id;
  const prize = makePickup('capShield', hole.x + hole.w / 2 - 4, 8);
  prize.gated = true;
  prize.gateId = hole.id;
  prize.blockId = block.id;
  block.live = false;
  run.obstacles.length = 0;
  run.obstacles.push(block, hole);
  run.pickups.length = 0;
  run.pickups.push(prize);
  run.retireOrphanSwitches();
  assert(prize.live !== false,
    'a prize already in the frame is not deleted under the player, block or no block');
}

// --- bridged keeps it, swept takes it --------------------------------------
{
  const run = bareRun(9);
  const far = run.viewRightX() + 400;
  const sw = makeObstacle('switch', far);
  const hole = makeObstacle('gap', far + 120);
  hole.w = 60;
  sw.gateId = hole.id;
  const prize = makePickup('capShield', hole.x + hole.w / 2 - 4, 8);
  prize.gated = true;
  prize.gateId = hole.id;
  run.obstacles.length = 0;
  run.obstacles.push(sw, hole);
  run.pickups.length = 0;
  run.pickups.push(prize);

  run.retireOrphanSwitches();
  assert(prize.live !== false && sw.live, 'while the hole is open, prop and prize both stand');

  run.openGates(sw);
  assert(hole.bridged === true && hole.live, 'hitting the switch bridges the hole and marks it');
  run.retireOrphanSwitches();
  assert(prize.live !== false,
    'a BRIDGED hole keeps its prize — it is now standing on the ground you made');

  // The other ending: a sweep takes the hole, and the whole prop goes.
  const run2 = bareRun(10);
  const far2 = run2.viewRightX() + 400;
  const sw2 = makeObstacle('switch', far2);
  const hole2 = makeObstacle('gap', far2 + 120);
  hole2.w = 60;
  sw2.gateId = hole2.id;
  const prize2 = makePickup('capShield', hole2.x + hole2.w / 2 - 4, 8);
  prize2.gated = true;
  prize2.gateId = hole2.id;
  run2.obstacles.length = 0;
  run2.obstacles.push(sw2, hole2);
  run2.pickups.length = 0;
  run2.pickups.push(prize2);
  hole2.live = false;                    // swept, not bridged
  run2.retireOrphanSwitches();
  assert(!sw2.live, 'a swept hole takes the switch');
  assert(prize2.live === false,
    'and the prize with it — a free capsule in the road is what the drip ledger exists to refuse');
}

// The prize joins the power ledger as soon as the lane lays it, so the drip
// does not drop a second capsule beside one already on screen.
{
  const run = bareRun(12);
  run.pickups.length = 0;
  run.drip.lastPowerX = -9999;
  const prize = makePickup('capShield', 5000, 8);
  prize.gated = true;
  run.pickups.push(prize);
  run.notePatternPrizes();
  assert(run.drip.lastPowerX >= 5000 - 1, 'the gated prize is written into the power ledger');
  assert(prize.ledgered === true, 'and only once, however many frames it lives for');
}

// A switch is worth a hole: the sweep window that takes one is wider than the
// pattern's own spacing, which is why this pairing cannot be an author's job.
const switchToHole = Math.min(...frost.patterns
  .filter((p) => (p.cells || []).some((c) => c.t === 'switch'))
  .map((p) => p.cells.find((c) => c.t === 'gap').dx
    - p.cells.find((c) => c.t === 'switch').dx));
assert(pitClearance(REACT_FLOOR, speed) >= switchToHole,
  `a scripted pit's clearance (${pitClearance(REACT_FLOOR, speed).toFixed(0)}px) still reaches as far as the`
  + ` ${switchToHole}px between a switch and its hole — the sweep can take one and leave the other`);
assert(OBSTACLES.switch.action === 'none' && OBSTACLES.gap.action === 'jump',
  'the pair still answers def.action two different ways — the reason the link exists');

process.exit(failed ? 1 : 0);
