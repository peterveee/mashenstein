// Trophy Workshop: physical progress, free practice attacks, and hero swapping.
import { installDom } from './dom-stub.js';
installDom();

const { Input } = await import('../src/engine/input.js');
const { defaultSlot } = await import('../src/engine/save.js');
const { STAGES } = await import('../src/data/stages.js');
const { HubState, TrophyRoomState } = await import('../src/game/hub/index.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const slot = defaultSlot();
for (const stage of STAGES.slice(0, 5)) slot.campaign.plugs[stage.id] = [true, false, true];
slot.campaign.ranks[STAGES[0].id] = 'S';
slot.campaign.ranks[STAGES[1].id] = 'CONCERNING';
slot.campaign.bossesDown.neon = true;
slot.campaign.bossesDown.rhythm = true;
slot.playtimeSec = 7380;
slot.stats.runs = 42;
slot.stats.deaths = 7;
slot.stats.deathsByHero.lorenzo = 5;
slot.stats.distanceTraveled = 123456;
slot.stats.coinsEarned = 9876;
slot.stats.powerupsCollected = 31;
slot.stats.appliancesFound = 12;
slot.overtime.best = 7654;
slot.overtime.bestRelay = 9;
const save = { slot, settings: { reducedFlashing: false } };

let hero = 'lorenzo', returned = 0, opened = 0;
const flow = {
  heroId: () => hero,
  setHero: (id) => { hero = id; },
  toHub: () => { returned++; },
  openTrophyRoom: () => { opened++; },
};

const hub = new HubState({ save, flow });
hub.interact({ type: 'shelf' });
assert(opened === 1, 'the food-court trophy shelf opens the workshop instead of dialogue');

const room = new TrophyRoomState({ save, flow });
room.enter();
assert(Input.context === 'workshop', 'the workshop installs its own movement-and-attack input context');
assert(room.toasterCount() === 5, 'the physical toaster case reflects recovered appliances');
assert(room.sRankCount() === 2, 'the S-rank cup includes S and CONCERNING ranks');
assert(room.defeatedBosses().map((b) => b.id).join(',') === 'neon,rhythm',
  'the boss case reflects defeated bosses');
const records = room.cabinetRecords();
assert(records.length === 9 && records.reduce((n, r) => n + r.plugs, 0) === 10,
  'the cabinet record wall reflects plug progress across all nine cabinets');
assert(records[0].rank === 'CONCERNING', 'cabinet plaques carry the best earned rank');
const statPages = room.statPages();
assert(statPages[0].rows.some(([label, value]) => label === 'TIME PLAYED' && value === '2H 3M'),
  'the career board shows formatted time played');
assert(statPages[1].rows.some(([label, value]) => label === 'LIVES LOST' && value === '7'),
  'the wear-and-tear board shows lives lost');
assert(statPages[1].rows.some(([label, value]) => label === 'CLUMSIEST' && value === 'LORENZO x5'),
  'the records board identifies the hero with the most losses');
room.px = 108;
Input.press('confirm'); room.update(1 / 60); Input.release('confirm'); Input.endFrame();
assert(room.recordsPage === 1, 'interacting with the physical records board flips its page');
room.cycleRecords(-1);
assert(room.recordsPage === 0, 'the records board can flip backward too');

room.px = 300;
Input.press('ability'); room.update(1 / 60); Input.release('ability'); Input.endFrame();
assert(room.hits === 1 && room.dummyHitT > 0 && room.player.abilityCd === 0,
  'an ability hits and animates the dummy without starting a cooldown');
Input.press('ability'); room.update(1 / 60); Input.release('ability'); Input.endFrame();
assert(room.hits === 2 && room.chain === 2 && room.bestChain === 2,
  'the training dummy accepts immediate attacks and builds a hit chain');

room.px = 190;
Input.press('confirm'); room.update(1 / 60); Input.release('confirm'); Input.endFrame();
assert(hero === 'gnash' && room.player.heroId === 'gnash', 'the podium swaps the active hub hero');
room.queueInteraction('podiumPrev', 190); room.usePending();
assert(hero === 'lorenzo' && room.player.heroId === 'lorenzo', 'the podium can also cycle to the previous hero');
room.update(2.1);
assert(room.chain === 0 && room.bestChain === 2, 'an expired chain resets while preserving the session best');

const ctx = document.createElement('canvas').getContext('2d');
room.draw(ctx);
assert(true, 'the populated workshop renders safely');

Input.press('back'); room.update(1 / 60); Input.release('back'); Input.endFrame();
assert(returned === 1, 'back returns to the food court');
room.exit();
Input.clearAll();

console.log(failed ? 'TROPHY WORKSHOP: FAILED' : 'TROPHY WORKSHOP: PASSED');
process.exit(failed ? 1 : 0);
