// Trophy Room: a side-scrolling progress gallery, practice target, and hero swapping.
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
slot.campaign.bestScore[STAGES[0].id] = 12345;
slot.campaign.storyFlags.sawEnding = true;
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
assert(room.camX() === 0, 'the trophy room opens at the overall-status end of the gallery');
assert(room.defeatedBosses().map((b) => b.id).join(',') === 'neon,rhythm',
  'the boss case reflects defeated bosses');
const levelRecords = room.levelRecords();
const allLevelRecords = levelRecords.flatMap((group) => group.levels);
assert(levelRecords.length === 9 && allLevelRecords.length === STAGES.length,
  'the gallery contains a record for every campaign level');
assert(allLevelRecords[0].plugs === 2 && allLevelRecords[0].rank === 'S' && allLevelRecords[0].score === 12345,
  'each level record reports plugs, best rank, and best score');
assert(allLevelRecords[0].plugStates.join(',') === 'true,false,true',
  'each compact level row retains the three individual plug icons');
const statGroups = room.statGroups();
const allStats = statGroups.flatMap((group) => group.rows);
assert(statGroups.length === 3 && statGroups.every((group) => group.rows.length === 3) && allStats.length === 9,
  'the unified career board is a compact three-by-three');
assert(allStats.some(([label, value]) => label === 'TIME PLAYED' && value === '2:03:00'),
  'the career board shows H:MM:SS playtime');
assert(allStats.some(([label, value]) => label === 'LIVES LOST' && value === '7'),
  'the career board shows lives lost');
assert(allStats.some(([label, value]) => label === 'CLUMSIEST' && value === 'LORENZO x5'),
  'the career board identifies the hero with the most losses');
assert(allStats.some(([label, value]) => label === 'OVERTIME RECORD' && value === '7,654'),
  'the career board clearly labels the endless-mode record');
assert(statGroups.find((group) => group.title === 'COLLECTION').rows
  .some(([label, value]) => label === 'TOASTERS FOUND' && value === '12'),
  'the toaster total is clearly named and grouped under collection');
assert(statGroups.find((group) => group.title === 'CAREER').rows.map(([label]) => label).join(',')
  === 'LIVES LOST,LIFETIME COINS,CLUMSIEST',
  'career stats lead with lives lost');
assert(statGroups.find((group) => group.title === 'COLLECTION').rows.map(([label]) => label).join(',')
  === 'LEVELS CLEARED,PLUGS,TOASTERS FOUND',
  'collection stats progress from levels to plugs to toasters');
assert(!allStats.some(([label]) => label === 'BEST RELAY'),
  'the obsolete always-zero relay record is not displayed');

room.px = 200;
Input.pointer.x = 420;
Input.pointer.y = 210;
Input.press('pointer');
room.update(0.4); Input.endFrame();
const firstTouchStep = room.px - 200;
room.update(0.4);
const secondTouchStep = room.px - 200 - firstTouchStep;
Input.release('pointer'); Input.endFrame();
assert(firstTouchStep === 56, 'a held trophy-room touch starts at the precise base pace');
assert(secondTouchStep > firstTouchStep, 'holding touch in the trophy room accelerates walking');
room.walkTarget = null;
room.update(1 / 60);
assert(room.moving === false, 'the trophy-room hero returns to idle after walking stops');

const beforeRemoteAttack = room.px;
assert(Input.actionForKey('ShiftLeft') === 'ability' && Input.actionForKey('ShiftRight') === 'ability',
  'both Shift keys retain their attack mapping in the trophy room');
Input.press('ability'); room.update(1 / 60); Input.release('ability'); Input.endFrame();
assert(room.px === beforeRemoteAttack && room.walkTarget === null && room.hits === 0,
  'an out-of-range Shift attack never starts walking toward the target');

room.px = 1110;
Input.press('ability'); room.update(1 / 60); Input.release('ability'); Input.endFrame();
assert(room.hits === 1 && room.dummyHitT > 0 && room.player.abilityCd === 0,
  'an ability hits and animates the dummy without starting a cooldown');
Input.press('ability'); room.update(1 / 60); Input.release('ability'); Input.endFrame();
assert(room.hits === 2 && room.chain === 2 && room.bestChain === 2,
  'the training dummy accepts immediate attacks and builds a hit chain');

room.px = 1060;
Input.press('confirm'); room.update(1 / 60); Input.release('confirm'); Input.endFrame();
assert(hero === 'gnash' && room.player.heroId === 'gnash', 'the podium swaps the active hub hero');
room.queueInteraction('podiumPrev', 1060); room.usePending();
assert(hero === 'lorenzo' && room.player.heroId === 'lorenzo', 'the podium can also cycle to the previous hero');
room.update(2.1);
assert(room.chain === 0 && room.bestChain === 2, 'an expired chain resets while preserving the session best');

const ctx = document.createElement('canvas').getContext('2d');
room.draw(ctx);
assert(true, 'the populated workshop renders safely');

const blankSave = { slot: defaultSlot(), settings: { reducedFlashing: false } };
const blankRoom = new TrophyRoomState({ save: blankSave, flow });
blankRoom.enter(); blankRoom.draw(ctx);
assert(blankRoom.defeatedBosses().length === 0, 'an empty management archive reveals no future boss trophies');
const blankStats = blankRoom.statGroups().flatMap((group) => group.rows);
assert(blankStats.some(([label, value]) => label === 'BEST LEVEL SCORE' && value === '—')
  && !blankStats.some(([label]) => label.includes('OVERTIME')),
  'an unfinished file shows a spoiler-free best-level score instead of Overtime');
blankRoom.exit();

const clickExitRoom = new TrophyRoomState({ save: blankSave, flow });
clickExitRoom.enter();
Input.pointer.x = 24;
Input.pointer.y = 108;
Input.press('pointer');
clickExitRoom.update(1 / 60);
Input.endFrame();
assert(returned === 1, 'tapping the trophy-room exit sign returns to the food court immediately');
Input.release('pointer'); Input.endFrame();

room.px = 34;
Input.press('left'); room.update(0.1); Input.release('left'); Input.endFrame();
assert(returned === 2, 'walking through the trophy-room exit door returns to the food court');
room.exit();
Input.clearAll();

console.log(failed ? 'TROPHY WORKSHOP: FAILED' : 'TROPHY WORKSHOP: PASSED');
process.exit(failed ? 1 : 0);
