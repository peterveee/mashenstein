// Focused contracts for the differentiated hero powers and run-only controls.
import { installDom } from './dom-stub.js';
installDom();

const { Input } = await import('../src/engine/input.js');
const { Player, PLAYER_X, SLIDE_MAX_T } = await import('../src/game/player.js');
const { RunState } = await import('../src/game/run.js');
const { makeObstacle } = await import('../src/game/entities.js');
const { save } = await import('../src/engine/save.js');
const { HERO_BY_ID } = await import('../src/data/heroes.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// Right/D are contextual powers; legacy keys remain aliases.
Input.setContext('default');
assert(Input.actionForKey('ArrowRight') === 'right' && Input.actionForKey('KeyD') === 'right', 'Right/D navigate outside runs');
Input.setContext('run');
assert(Input.actionForKey('ArrowRight') === 'ability' && Input.actionForKey('KeyD') === 'ability', 'Right/D activate power during runs');
assert(Input.actionForKey('KeyX') === 'ability' && Input.actionForKey('ShiftLeft') === 'ability', 'X/Shift remain power aliases');
Input.press('ability');
Input.setContext('default');
assert(!Input.held('ability') && !Input.pressed('ability'), 'context transitions clear held and pending power input');

const idleInput = { held: () => false };
const player = new Player('fernwick');
player.rollT = 0.65;
player.update(0.64, idleInput, { speed: 160 });
assert(player.rolling, 'Fernwick roll remains active before 0.65 seconds');
player.update(0.02, idleInput, { speed: 160 });
assert(!player.rolling, 'Fernwick roll ends after 0.65 seconds');
player.sliding = true;
// Held for less than SLIDE_MAX_T on purpose. Past that the slide window closes and the
// hero stands up under a held key — see slideWindow in player.js — which is a claim about
// how long a slide lasts, not about this one. What is checked here is that holding slide
// never promotes it into a roll, so the hold has to stay inside the window to ask it.
player.update(SLIDE_MAX_T / 2, { held: (action) => action === 'slide' }, { speed: 160 });
assert(player.sliding && !player.rolling, 'ordinary slide can be held without becoming a roll');

save.load();
save.newSlot(0, 0);
const stage = {
  id: 'hero-test', cabinet: 'plumber', index: 1,
  mission: { type: 'reach', desc: 'TEST' }, challenge: { type: 'coins', n: 99, desc: 'TEST' },
  durationSec: 40, applianceAt: 0.5, applianceHigh: false,
};
const run = new RunState({ stage, save, seed: 81, difficulty: 1, skipRunIn: true, onEnd: () => {} });
run.enter();
run.relay.current = 'fernwick';
run.player.setHero('fernwick');
run.powerups.shieldStack = 0;
run.useAbility();
{
  const arrow = run.projectiles.find((p) => p.type === 'arrow');
  assert(arrow && arrow.holdT > 0 && !run.player.rolling && run.player.abilityCd === HERO_BY_ID.fernwick.ability.cooldown,
    'Fernwick power queues a held arrow (no roll) and starts the cooldown');
  assert(run.player.powerPoseT >= arrow.holdT, 'the aim pose outlasts the hold, so the arrow leaves while she is still drawing');
}

// Cooldowns are stored per hero instead of being reset by swaps.
run.player.grounded = true;
run.player.abilityCd = 3;
run.player.setHero('gnash');
run.player.abilityCd = 2;
run.player.setHero('fernwick');
assert(run.player.abilityCd === 3, 'portal-style hero changes preserve each hero cooldown');

// Base roll does not protect against an unbreakable ground hazard.
run.player.abilityCd = 0;
run.useAbility();
const cells = run.battery;
run.obstacles = [makeObstacle('pipe', run.camX + PLAYER_X)];
run.collide();
assert(run.battery === cells - 1, 'base shield roll is not general invincibility');

// Shield Bash breaks one allowed ground hazard and causes a stumble.
run.player.iframes = 0;
run.player.mods.push('bash');
run.modIds.push('bash');
run.player.rollT = 0.65;
run.player.rollBashed = false;
const crate = makeObstacle('crate', run.camX + PLAYER_X);
run.obstacles = [crate];
run.collide();
assert(!crate.live && run.player.stumbleT > 0 && !run.player.rolling, 'Shield Bash breaks one ground hazard and ends in a stumble');

// Every hero definition is now active and Tune-Up applies through shared cooldown setup.
for (const id of ['lorenzo', 'gnash', 'fernwick', 'b33p', 'clara', 'kiko', 'raymn', 'grumpos']) {
  run.relay.current = id;
  run.player.setHero(id);
  assert(!!run.player.hero.ability, `${id} has an active power definition`);
}

function selectHero(id) {
  run.relay.current = id;
  run.player.setHero(id);
  run.player.abilityCd = 0;
  run.player.grounded = true;
  run.obstacles = [];
  run.projectiles = [];
}

// LORENZO THROWS THE WRENCH (10 Sep 2026, replacing the stomp/smash). Nothing
// leaves on the press — the tool is queued with a hold and spawns at the hand on
// the gesture's release, the same bargain the bow and the axe keep — so the
// assertion is that a projectile exists and is still in his fist, not that a
// crate broke on the frame he pressed.
selectHero('lorenzo');
run.useAbility();
const wrench = run.projectiles.find((p) => p.art === 'wrench');
assert(!!wrench, 'Lorenzo power queues the pipe wrench');
assert(wrench.holdT > 0, 'and nothing leaves on the press — it is still in his fist');
assert(wrench.type === 'axe', 'it flies the axe return: out, hover, home');
// The belt loop empties only once it is actually away.
run.updateProjectiles(0.001);
assert(!run.player.wrenchThrown, 'the belt still has it while the throw is winding up');

selectHero('gnash'); run.useAbility();
assert(run.player.dashT > 0, 'Gnash power starts the spin dash');

selectHero('b33p'); run.useAbility();
assert(run.projectiles.some((p) => p.type === 'pellet'), 'B-33P power fires a pellet');

selectHero('kiko'); run.useAbility();
const shot = run.projectiles.find((p) => p.type === 'pellet');
assert(!!shot, 'Kiko power fires a warning shot');
// The three shooters are told apart by DATA on the hero row, not by an id
// check downstream: Kiko's is slower and fatter than B-33P's, and it carries
// her id so the impact plays her burst and the renderer finds her ki blue.
assert(shot.size > 1 && shot.vx < run.speed + 260,
  "the warning shot is fatter and slower than B-33P's lemon");

selectHero('clara'); run.useAbility();
const slugs = run.projectiles.filter((p) => p.type === 'pellet');
// Two pistols, so the ordinary pull is a PAIR: shotBurst on the row, a fixed
// 16px stagger, same vx so the gap holds in flight.
assert(slugs.length === 2 && slugs[0].x - slugs[1].x === 16 && slugs[0].vx === slugs[1].vx,
  'Clara power fires a double-tap pair of slugs');
// Same data seam, third weapon: the fastest and smallest of the three, and it
// carries her id so the impact plays her ricochet and the renderer finds her
// brass tracer.
assert(slugs.every((s) => s.size < 1 && s.vx > run.speed + 260 && s.contactHero === 'clara'),
  "the pistol slugs are smaller and faster than B-33P's lemon");
assert(shot.contactHero === 'kiko', 'the warning shot knows who fired it');
let shotDrawError = null;
try { run.draw(document.createElement('canvas').getContext('2d')); } catch (err) { shotDrawError = err; }
assert(!shotDrawError, `the ki orb renders safely${shotDrawError ? ` (${shotDrawError.message})` : ''}`);

selectHero('raymn'); run.useAbility();
assert(run.projectiles.some((p) => p.type === 'fist'), "Ray M'N power throws his rocket fist");

selectHero('grumpos'); run.useAbility();
assert(run.projectiles.some((p) => p.type === 'axe'), 'Grumpos power throws his axe');

run.bench.tuneup = 3;
selectHero('gnash'); run.useAbility();
assert(Math.abs(run.player.abilityCd - HERO_BY_ID.gnash.ability.cooldown * 0.7) < 0.001,
  'Hero Tune-Up reduces the shared cooldown for every active kit');

run.exit();
console.log(failed ? 'HERO-KITS: FAILED' : 'HERO-KITS: PASSED');
process.exit(failed ? 1 : 0);
