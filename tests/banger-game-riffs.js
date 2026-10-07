// GENER8's ZAP, the cabinet riffs (src/game/banger/game-riffs.js): each one fits the grid,
// comes back off it exactly as written, and ZAP lands one in whichever grid is on show.
import { installDom } from './dom-stub.js';
installDom();

const { GAME_RIFFS, GAME_RIFF_ODDS, gameRiffNotes, gameRiffFits, gameRiffGrid, pickGameRiff } = await import('../src/game/banger/game-riffs.js');
const { riffFromNotes, simplify, RIFF_MODES } = await import('../src/game/banger/riff.js');
const { BangerMakerState } = await import('../src/game/banger/maker.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// ---------------------------------------------------------------- the riffs
{
  const froms = new Set(GAME_RIFFS.map((r) => r.from));
  assert(['FIELD SERVICE', 'SPEED ZONE', 'FROST FORTRESS', 'RHYTHM BANKRUPTCY'].every((f) => froms.has(f)),
    'there is a riff from each of plumber, speed, frost and rhythm');
  assert(new Set(GAME_RIFFS.map((r) => r.id)).size === GAME_RIFFS.length, 'every riff has its own id');
  assert(['CRYPT SHIFT', 'TERMINAL VELOCITY', 'THE FOOD COURT'].every((f) => froms.has(f)), 'and from crypt, neon and the food court');
  assert(GAME_RIFFS.every((r) => (r.bars.length === 2 || r.bars.length === 4) && gameRiffNotes(r).length > 0), 'every riff is two or four bars with a tune in them');
  // four bars (Peter, 6 Oct 2026): the songs' own phrases for a four-bar grid
  const four = GAME_RIFFS.filter((r) => r.bars.length === 4);
  const fourFrom = new Set(four.map((r) => r.from));
  assert(['FIELD SERVICE', 'SPEED ZONE', 'RHYTHM BANKRUPTCY', 'CRYPT SHIFT', 'TERMINAL VELOCITY', 'THE FOOD COURT'].every((f) => fourFrom.has(f)),
    'four-bar phrases from FIELD SERVICE, SPEED ZONE, RHYTHM BANKRUPTCY, CRYPT SHIFT, TERMINAL VELOCITY and THE FOOD COURT');
  const loop = four.find((r) => r.from === 'THE FOOD COURT');
  assert(four.filter((r) => r !== loop).every((r) => r.bars.slice(2).join() !== r.bars.slice(0, 2).join())
    && loop.bars.slice(2).join() === loop.bars.slice(0, 2).join(),
    'each four-bar phrase answers itself in bars 3–4; the food court\'s two-bar loop comes in with its repeat');
  assert(four.filter((r) => gameRiffFits(r, 'simple')).length >= 4, 'four of them or more sit on SIMPLE\'s rows');
  const rnd = (() => { let x = 3; return () => ((x = (x * 16807) % 2147483647) / 2147483647); })();
  let lengthsKept = true;
  for (let k = 0; k < 40; k++) {
    if (pickGameRiff('advanced', rnd, null, 4)?.bars.length !== 4 || pickGameRiff('advanced', rnd, null, 2)?.bars.length !== 2) lengthsKept = false;
  }
  assert(lengthsKept, 'ZAP picks a riff as long as the grid: four bars for four, two for two');
  assert(GAME_RIFFS.every((r) => gameRiffFits(r, 'advanced')), 'every riff fits the ADVANCED grid, G4 to C6');
  const exact = GAME_RIFFS.every((r) => {
    const g = gameRiffGrid(r);
    const back = riffFromNotes(g.notes, 'simpleSquare', 'advanced', g.lengths).parts[0].bars;
    return back.every((b, i) => b === r.bars[i]);
  });
  assert(exact, 'every riff comes back off the ADVANCED grid note for note, lengths included');
  const simple = GAME_RIFFS.filter((r) => gameRiffFits(r, 'simple'));
  assert(simple.length >= 4 && simple.every((r) => gameRiffNotes(r).every((n) => RIFF_MODES.simple.semis.includes(n.semi))),
    'the riffs on A-minor rows fit SIMPLE too');
  assert(!gameRiffFits(GAME_RIFFS.find((r) => r.id === 'plumber-hook'), 'simple'),
    'the B-minor FIELD SERVICE hook is ADVANCED only');
  assert(pickGameRiff('simple', () => 0, simple[0].id).id !== simple[0].id, 'a riff is not picked twice running');
  assert(GAME_RIFF_ODDS > 0 && GAME_RIFF_ODDS < 1, 'ZAP still writes random riffs too');
}

// ---------------------------------------------------------------- ZAP
{
  const ZAP = 1;
  const maker = new BangerMakerState({ onDone: () => {}, onMade: () => {}, random: () => 0 });
  maker.enter();
  maker.mode = 'advanced';
  maker.press(ZAP);
  const first = GAME_RIFFS.find((r) => r.id === BangerMakerState.lastGameRiff);
  const g = gameRiffGrid(first);
  assert(first && maker.notes.join() === g.notes.join() && maker.lengths.join() === g.lengths.join(),
    'ZAP on ADVANCED can write a cabinet riff exactly');
  assert(maker.message === first.from, 'and names the cabinet it came from');
  maker.press(ZAP);
  assert(BangerMakerState.lastGameRiff !== first.id, 'the next ZAP is a different riff');

  maker.mode = 'simple';
  maker.press(ZAP);
  const riff = GAME_RIFFS.find((r) => r.id === BangerMakerState.lastGameRiff);
  const exact = gameRiffGrid(riff);
  assert(gameRiffFits(riff, 'simple') && maker.notes.join() === simplify(exact.notes).join() && !maker.simpleEdited,
    'ZAP on SIMPLE writes a riff that fits it, converted down to eighths');
  maker.setMode('advanced');
  assert(maker.notes.join() === exact.notes.join(), 'and ADVANCED has the riff as written');

  const rand = new BangerMakerState({ onDone: () => {}, onMade: () => {}, random: () => 0.99 });
  rand.enter();
  rand.mode = 'simple';
  const last = BangerMakerState.lastGameRiff;
  rand.press(ZAP);
  assert(BangerMakerState.lastGameRiff === last && rand.notes.some((n) => n >= 0), 'otherwise ZAP writes a random riff');
}

// ---------------------------------------------------------------- ZAP on four bars
{
  const ZAP = 1;
  const maker = new BangerMakerState({ onDone: () => {}, onMade: () => {}, random: () => 0 });
  maker.enter();
  maker.mode = 'advanced';
  maker.setBars(4);
  BangerMakerState.lastGameRiff = null;
  maker.press(ZAP);
  const riff = GAME_RIFFS.find((r) => r.id === BangerMakerState.lastGameRiff);
  const g = riff && gameRiffGrid(riff);
  assert(riff && riff.bars.length === 4 && maker.notes.join() === g.notes.join() && maker.lengths.join() === g.lengths.join()
    && maker.message === riff.from, 'ZAP on four bars can write a cabinet\'s four-bar phrase exactly, and names it');
}

if (failed) { console.error('BANGER GAME RIFFS: FAILED'); process.exit(1); }
console.log('BANGER GAME RIFFS: PASSED');
