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
  assert(GAME_RIFFS.every((r) => r.bars.length === 2 && gameRiffNotes(r).length > 0), 'every riff is two bars with a tune in them');
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

if (failed) { console.error('BANGER GAME RIFFS: FAILED'); process.exit(1); }
console.log('BANGER GAME RIFFS: PASSED');
