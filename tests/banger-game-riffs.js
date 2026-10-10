// GENER8's ZAP, the cabinet riffs (src/game/banger/game-riffs.js): each one fits the grid,
// comes back off it exactly as written, and ZAP lands one in whichever grid is on show.
import { installDom } from './dom-stub.js';
installDom();

const { GAME_RIFFS, GAME_RIFF_ODDS, gameRiffNotes, gameRiffFits, gameRiffGrid, pickGameRiff } = await import('../src/game/banger/game-riffs.js');
const { riffFromNotes, simplify, RIFF_MODES } = await import('../src/game/banger/riff.js');
const { BangerMakerState } = await import('../src/game/banger/maker.js');
const { TUNES, TUNE_LIST, TUNE_ODDS, TUNE_ODDS_DEV, tuneOdds, zapKind, tuneFits, pickTune, tuneFor } = await import('../src/game/banger/tunes.js');
const { Input } = await import('../src/engine/input.js');

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

// ---------------------------------------------------------------- the tunes everyone knows (10 Oct 2026)
{
  const names = ['TWINKLE TWINKLE', 'MARY HAD A LITTLE LAMB', 'FRERE JACQUES', 'OLD MACDONALD', 'BINGO',
    'JINGLE BELLS', 'DECK THE HALLS', 'JOY TO THE WORLD', 'GOD REST YE MERRY', 'CAROL OF THE BELLS',
    'KOROBEINIKI', 'MOUNTAIN KING', 'TOCCATA AND FUGUE', 'ODE TO JOY', 'TURKISH MARCH', 'BIG BEN', 'CAN-CAN', 'WILLIAM TELL',
    // more classics, and what Lemmings played (Peter, 10 Oct 2026)
    'FUR ELISE', 'THE ENTERTAINER', 'PACHELBEL\'S CANON', 'FIFTH SYMPHONY', 'SYMPHONY NO. 40', 'EINE KLEINE NACHTMUSIK',
    'CAN-CAN 2', 'ROUND THE MOUNTAIN', 'LONDON BRIDGE', 'O LITTLE TOWN', 'FUNERAL MARCH', 'HERE COMES THE BRIDE'];
  const froms = new Set(TUNES.map((t) => t.from));
  assert(names.every((n) => froms.has(n)) && froms.size === names.length, `every tune Peter picked is in, and nothing else (${froms.size})`);
  assert(TUNE_LIST.length === names.length && TUNE_LIST.every((t) => froms.has(t.from) && t.by), 'ZAP\'s list names each tune once, with who it is by');
  const ids = [...GAME_RIFFS, ...TUNES].map((r) => r.id);
  assert(new Set(ids).size === ids.length, 'every tune has its own id, none shared with a cabinet riff');
  assert(TUNES.every((t) => (t.bars.length === 2 || t.bars.length === 4) && gameRiffNotes(t).length > 0), 'every tune is two or four bars with notes in');
  const exact = TUNES.every((t) => {
    const g = gameRiffGrid(t);
    const back = riffFromNotes(g.notes, 'simpleSquare', 'advanced', g.lengths).parts[0].bars;
    return back.every((b, i) => b === t.bars[i]);
  });
  assert(exact, 'every tune comes back off the ADVANCED grid note for note, lengths included');
  assert(TUNES.every((t) => gameRiffFits(t, 'advanced')), 'every tune sits inside G4 to C6');
  // Every tune has two bars for each grid it can land on, and four bars except WILLIAM TELL.
  const has = (n, bars, mode) => TUNES.some((t) => t.from === n && t.bars.length === bars && tuneFits(t, mode));
  const sharp = new Set(['MOUNTAIN KING', 'TOCCATA AND FUGUE', 'TURKISH MARCH', 'FUR ELISE', 'THE ENTERTAINER', 'FUNERAL MARCH']);
  assert(names.every((n) => has(n, 2, 'advanced') && (sharp.has(n) || has(n, 2, 'simple'))),
    'every tune has two bars for ADVANCED, and for SIMPLE unless it has sharps');
  assert([...sharp].every((n) => !has(n, 2, 'simple')), `the tunes with sharps are ADVANCED only (${[...sharp].join(', ')})`);
  assert(names.filter((n) => n !== 'WILLIAM TELL').every((n) => has(n, 4, 'advanced')) && !has('WILLIAM TELL', 4, 'advanced'),
    'and four bars for a four-bar grid, all but WILLIAM TELL');
  const four = TUNES.filter((t) => t.bars.length === 4);
  assert(four.every((t) => t.bars.slice(2).join() !== t.bars.slice(0, 2).join()), 'each four-bar tune answers itself in bars 3–4');
  const tell = TUNES.filter((t) => t.from === 'WILLIAM TELL');
  assert(tell.length === 2 && tell.find((t) => t.only === 'advanced') && tell.find((t) => t.only === 'simple')
    && gameRiffNotes(tell.find((t) => t.only === 'simple')).every((n) => n.step % 2 === 0),
    'WILLIAM TELL gallops in sixteenths on ADVANCED, and at half speed on SIMPLE\'s eighths');
  let fits = true, twice = false;
  for (const mode of ['simple', 'advanced']) {
    for (const bars of [2, 4]) {
      let last = null;
      for (let k = 0; k < 60; k++) {
        const t = pickTune(mode, Math.random, last, bars);
        if (!t || t.bars.length !== bars || !tuneFits(t, mode)) fits = false;
        if (t && t.id === last) twice = true;
        last = t?.id;
      }
    }
  }
  assert(fits && !twice, 'ZAP picks a tune as long as the grid that fits it, never the same one twice running');
  // The carols are in all year: nothing about a tune looks at the date.
  assert(TUNES.every((t) => Object.keys(t).every((k) => ['id', 'from', 'bars', 'only'].includes(k))), 'the carols come up all year round');
  // SYMPHONY NO. 40 is its sixteenths too: SIMPLE has it at half speed
  const moz = TUNES.filter((t) => t.from === 'SYMPHONY NO. 40');
  assert(moz.filter((t) => t.only === 'simple').every((t) => gameRiffNotes(t).every((n) => n.step % 2 === 0)) && has('SYMPHONY NO. 40', 4, 'simple'),
    'SYMPHONY NO. 40 has its sixteenths on ADVANCED, and SIMPLE its own at half speed');
  // CAN-CAN starts on its long note, on the downbeat (Peter: "doesn't start its riff on the downbeat")
  const can = TUNES.filter((t) => t.from === 'CAN-CAN');
  assert(can.every((t) => { const n = gameRiffNotes(t); return n[0].step === 0 && n[0].len >= 6 && n.slice(1).every((x) => x.len < n[0].len); }),
    'CAN-CAN opens on its long note, on the downbeat');
  // The odds: a tune one ZAP in eight, one in two in a dev build; the cabinet riffs keep their share.
  const was = globalThis.window.__MASH_BUILD__;
  globalThis.window.__MASH_BUILD__ = undefined;
  const prod = tuneOdds();
  globalThis.window.__MASH_BUILD__ = 'dev';
  const dev = tuneOdds();
  const devKinds = [0, GAME_RIFF_ODDS + 0.01, GAME_RIFF_ODDS + TUNE_ODDS_DEV - 0.01, 0.99].map(zapKind);
  globalThis.window.__MASH_BUILD__ = was;
  assert(prod === TUNE_ODDS && dev === TUNE_ODDS_DEV && TUNE_ODDS < TUNE_ODDS_DEV && GAME_RIFF_ODDS + TUNE_ODDS_DEV < 1,
    `a tune is one ZAP in ${1 / TUNE_ODDS}, one in ${1 / TUNE_ODDS_DEV} in a dev build, and ZAP's own riffs still come up`);
  assert(devKinds.join() === 'cabinet,tune,tune,random', `a ZAP's draw lands on a cabinet riff, a tune or its own (${devKinds})`);

  const ZAP = 1;
  const maker = new BangerMakerState({ onDone: () => {}, onMade: () => {}, random: () => GAME_RIFF_ODDS + 0.01 });
  maker.enter();
  maker.mode = 'simple';
  maker.setBars(2);
  maker.press(ZAP);
  const tune = TUNES.find((t) => t.id === BangerMakerState.lastGameRiff);
  assert(tune && tuneFits(tune, 'simple') && maker.message === tune.from && maker.notes.join() === simplify(gameRiffGrid(tune).notes).join(),
    `ZAP on SIMPLE can write a tune, converted down to eighths, and the floatie names it (${maker.message})`);
  maker.mode = 'advanced';
  maker.setBars(4);
  maker.press(ZAP);
  const tune4 = TUNES.find((t) => t.id === BangerMakerState.lastGameRiff);
  assert(tune4 && tune4.bars.length === 4 && maker.notes.join() === gameRiffGrid(tune4).notes.join() && maker.message === tune4.from,
    `and on four bars of ADVANCED, a tune's four bars exactly (${maker.message})`);
}

// ---------------------------------------------------------------- ZAP held: the list of tunes (10 Oct 2026)
{
  const ZAP = 1;
  const maker = new BangerMakerState({ onDone: () => {}, onMade: () => {}, random: () => 0.99 });
  maker.enter();
  maker.mode = 'simple';
  maker.setBars(2);
  Input.usingTouch = true;
  const L = maker.layout();
  const b = L.buttons[ZAP];
  const at = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  const step = (down, pressed = false, dt = 1 / 60) => {
    Input.pointer = { ...at, down };
    if (pressed) Input.press('pointer');
    if (!down) Input.release('pointer');
    maker.update(dt);
    if (pressed) Input.endFrame();
    if (!down) Input.endFrame();
  };
  // a tap: down and up, and ZAP fires as it lifts
  const before = maker.notes.join();
  step(true, true);
  assert(maker.notes.join() === before && !maker.chooser, 'ZAP does nothing on the press itself');
  step(false);
  assert(maker.notes.join() !== before && !maker.chooser, 'a tap on ZAP is ZAP, as it lifts');
  // held: the list opens, every tune in it
  const was = maker.notes.join();
  step(true, true);
  for (let k = 0; k < 30 && !maker.chooser; k++) step(true);
  assert(maker.chooser && maker.chooser.items.length === TUNE_LIST.length && maker.notes.join() === was,
    `ZAP held opens the list of every tune, and writes nothing (${maker.chooser?.items.length})`);
  step(false);
  assert(maker.chooser, 'and letting go leaves the list open');
  const items = maker.chooser.items;
  assert(items.find((it) => it.id === 'MOUNTAIN KING').description.endsWith('ADVANCED')
    && !items.find((it) => it.id === 'TWINKLE TWINKLE').description.includes('ADVANCED'),
    'on SIMPLE, a tune with sharps says it goes to ADVANCED');
  // picking: on this grid, as written
  maker.choose(items.findIndex((it) => it.id === 'TWINKLE TWINKLE'));
  const tw = tuneFor('TWINKLE TWINKLE', 'simple', 2).tune;
  assert(!maker.chooser && maker.mode === 'simple' && maker.notes.join() === simplify(gameRiffGrid(tw).notes).join() && maker.message === 'TWINKLE TWINKLE',
    'a tune picked off the list goes on the grid, named');
  maker.openTunes();
  assert(maker.chooser.items[maker.chooser.sel].id === 'TWINKLE TWINKLE', 'the list opens on the tune on the grid');
  // a tune with sharps takes the grid to ADVANCED
  maker.choose(maker.chooser.items.findIndex((it) => it.id === 'MOUNTAIN KING'));
  const mk = tuneFor('MOUNTAIN KING', 'advanced', 2).tune;
  assert(maker.mode === 'advanced' && maker.notes.join() === gameRiffGrid(mk).notes.join(), 'MOUNTAIN KING picked on SIMPLE goes to ADVANCED with it');
  // WILLIAM TELL has no four bars: a four-bar grid goes to two
  maker.setBars(4);
  maker.openTunes();
  assert(maker.chooser.items.find((it) => it.id === 'WILLIAM TELL').description.endsWith('2 BARS'), 'at four bars, WILLIAM TELL says it comes in two');
  maker.choose(maker.chooser.items.findIndex((it) => it.id === 'WILLIAM TELL'));
  assert(maker.bars === 2 && maker.message === 'WILLIAM TELL' && TUNES.find((t) => t.id === BangerMakerState.lastGameRiff)?.only === 'advanced',
    'and picked there, the grid goes to two bars for the gallop');
  // the list is the same on a key: confirm held on ZAP
  maker.focus.area = 'button'; maker.focus.button = ZAP;
  Input.usingTouch = false;
  Input.press('confirm'); maker.update(1 / 60); Input.endFrame();
  for (let k = 0; k < 30 && !maker.chooser; k++) maker.update(1 / 60);
  Input.release('confirm'); Input.endFrame();
  assert(maker.chooser?.picker === 4, 'the confirm key held on ZAP opens it too');
  maker.chooser = null;
  maker.update(1 / 60);
}

if (failed) { console.error('BANGER GAME RIFFS: FAILED'); process.exit(1); }
console.log('BANGER GAME RIFFS: PASSED');
