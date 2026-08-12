// Focused contracts for the differentiated hero powers and run-only controls.
import { installDom } from './dom-stub.js';
installDom();

const { Input } = await import('../src/engine/input.js');
const { Player, PLAYER_X } = await import('../src/game/player.js');
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
player.ducking = true;
player.update(5, { held: (action) => action === 'duck' }, { speed: 160 });
assert(player.ducking && !player.rolling, 'ordinary duck can be held without becoming a roll');

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
assert(run.player.rolling && run.player.abilityCd === HERO_BY_ID.fernwick.ability.cooldown,
  'Fernwick power starts a finite roll and cooldown');
run.player.grounded = false;
run.player.abilityCd = 0;
run.useAbility();
assert(run.player.abilityCd === 0, 'shield roll cannot start or consume cooldown in the air');

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
for (const id of ['lorenzo', 'gnash', 'fernwick', 'b33p', 'mochi', 'kiko', 'raymn', 'grumpos']) {
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

selectHero('lorenzo');
const smashCrate = makeObstacle('crate', run.camX + PLAYER_X + 20);
run.obstacles = [smashCrate];
run.useAbility();
assert(!smashCrate.live, 'Lorenzo ground power performs a short-range wrench smash');
run.player.abilityCd = 0; run.player.grounded = false; run.player.vy = 20; run.useAbility();
assert(run.player.stomping && run.player.vy < 0, 'Lorenzo air power initiates a stomp');

selectHero('gnash'); run.useAbility();
assert(run.player.dashT > 0, 'Gnash power starts the spin dash');

selectHero('b33p'); run.useAbility();
assert(run.projectiles.some((p) => p.type === 'pellet'), 'B-33P power fires a pellet');

selectHero('mochi'); run.useAbility();
assert(run.player.compressT === 1 && run.player.hitH < 14, 'Mochi power compresses the hitbox');

selectHero('kiko'); run.useAbility();
const shot = run.projectiles.find((p) => p.type === 'pellet');
assert(!!shot, 'Kiko power fires a warning shot');
// The two shooters are told apart by DATA on the hero row, not by an id check
// downstream: hers is slower and fatter than B-33P's, and it carries her id so
// the impact plays her burst and the renderer finds her ki blue.
assert(shot.size > 1 && shot.vx < run.speed + 260,
  "the warning shot is fatter and slower than B-33P's lemon");
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
