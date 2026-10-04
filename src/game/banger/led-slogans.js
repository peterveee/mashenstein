// WHAT THE CLUB'S LED BOARD SAYS. 3 Oct 2026.
//
// Peter: OPEN LATE among them, and TONS of gags. Two kinds:
//
//   SLOGANS   held for a few bars, centred — nine characters at most (the board is 54 dots,
//             six a letter); anything longer scrolls instead
//   SCROLLS   crossing the board once, all the way off before the next line comes on
//
// Picked at random every time, never in a set order (Peter, 3 Oct 2026), with lines of the
// song's own STYLE mixed in — Shibuya-Kei's KAWAII and ARIGATO, Drum & Bass's REWIND.
// English only: the board's font has no kana.
//
// The arcade's own voice: staff copy that has not noticed the place shut years ago (Dolores
// never says so, and neither does the board), Gary still on the clock, the cast as regulars.
// `{BPM}` and `{TITLE}` are filled in from the song playing. Letters, digits and ! ? - . ' :
// only — that is the board's whole font.

export const LED_SLOGANS = Object.freeze([
  // the club
  'OPEN LATE', 'NO SLEEP', 'HANDS UP', 'ONE MORE', 'LOUDER!', 'ALL NIGHT', 'BASS OK?', 'DANCE!',
  'DROP IT', 'RAVE ON', 'ENCORE', 'AGAIN!', 'MORE BASS', 'LESS TALK', 'BOOM', 'WUB WUB',
  'LETS GO', 'SO LOUD', 'TOO LOUD?', 'FEEL IT', 'JUMP!', 'NO NAPS', 'HYDRATE',
  'BE NICE', 'SMILE', 'OK GO', 'NO DJ', '{BPM} BPM',
  // the arcade
  '1UP', 'HI SCORE', 'GAME ON', 'CONTINUE?', 'PLAYER 1', 'CREDITS 0',
  'TILT!', 'READY?', 'GO GO GO', 'LEVEL UP', 'BONUS!',
  // the building
  'WET FLOOR', 'MIND STEP', 'FIRE EXIT', 'NO FOOD', 'NO DRINKS', 'NO PETS', 'OPEN', 'OPEN 24H',
]);

export const LED_SCROLLS = Object.freeze([
  // the staff
  'NO REFUNDS', 'STAFF ONLY', 'NOW SERVING 0', 'PLEASE TAKE A NUMBER', 'ASK DOLORES', 'DOLORES IS ON BREAK',
  'GARY ON SHIFT', 'GARY STILL ON THE CLOCK', 'GARY: DO NOT TOUCH THE SWITCH', 'HR WOULD LIKE A WORD GARY',
  // the regulars
  'B-33P SAYS HI', 'BE KIND TO THE ROBOT', 'LORENZO PLEASE FIX THE SINK', 'NO PLUMBING ON THE DANCEFLOOR',
  'KIKO IS ON THE DOOR', 'NO WARNING SHOTS INSIDE', 'RAMON PLEASE STOP PUNCHING', 'GRUMPOS: TRY SMILING', 'GRUMPOS IS NOT DANCING',
  'RUSTY WE KNOW IT WAS YOU', 'CLARA: MIND THE PLOT HOLES', 'FERNWICK: ARROWS AT THE DOOR',
  'KIKO PLEASE STAND DOWN', 'NO BOOMERANGS', 'NO AXES ON THE FLOOR',
  // the arcade
  'INSERT COIN', 'PRESS START', 'NO RUNNING', 'NO ROBOTS?', 'PLEASE WAIT', 'NOT CLOSED',
  // the building
  'FOOD COURT CLOSES NEVER', 'TRY THE PRETZEL', 'PAWN SHOP: TOTALLY LEGAL', 'POWER IS ON. MOSTLY.',
  'MIRROR BALL IS INSURED', 'NO SMOKING EXCEPT THE MACHINE', 'LASERS: DO NOT LOOK', 'LOST: ONE SHOE',
  'FOUND: ONE SHOE', 'WE ARE NOT CLOSED', 'NO REFUNDS ON BASS', 'SPEAKERS GO TO 11', 'DROP IT LIKE ITS WARM',
  // the song
  'NOW PLAYING: {TITLE}', 'TONIGHT: {TITLE}', '{BPM} BEATS A MINUTE',
]);

/** Lines for one style of song, held and scrolled, mixed in with the rest. */
export const LED_STYLE_LINES = Object.freeze({
  'big-room': { hold: ['MAIN STAGE', 'BIG ROOM', 'FESTIVAL', 'BOUNCE!', 'CONFETTI'],
    scroll: ['EVERYBODY JUMP', 'WAIT FOR THE DROP', 'CONFETTI CANNON ARMED', 'ONE TWO THREE JUMP'] },
  trance: { hold: ['EUPHORIA', 'UPLIFT', 'TRANCE', 'SUNRISE', 'ETERNAL'],
    scroll: ['BREAKDOWN INCOMING', 'CLOSE YOUR EYES', 'SUPERSAWS ONLY', 'HANDS IN THE AIR AT SUNRISE'] },
  'future-bass': { hold: ['CHOPS', 'FEELS', 'SIDECHAIN', 'WOBBLE', 'SPARKLES'],
    scroll: ['VOCAL CHOPS ENGAGED', 'BIG SAWS BIG FEELS', 'PLEASE MIND THE WOBBLE'] },
  eurobeat: { hold: ['DRIFT!', 'TURBO', 'NITRO', 'REDLINE', 'FULL GAS', 'MAX SPEED'],
    scroll: ['NO DRIFTING ON THE DANCEFLOOR', 'MIND THE HAIRPIN', 'TOP SPEED ONLY', 'SHIFT UP SHIFT UP'] },
  chipstep: { hold: ['8-BIT', 'BLEEP', 'CHIPTUNE', 'WUB', 'PIXELS'],
    scroll: ['POCKET SYNTH OVERLOAD', 'ALL BLEEPS NO BLOOPS', 'PRESS START TO WOBBLE'] },
  synthwave: { hold: ['1984', 'VHS', 'MIAMI', 'SUNSET', 'NEON', 'RETRO'],
    scroll: ['DRIVING INTO THE SUNSET', 'RESPECT THE NEON GRID', 'PLEASE BE KIND REWIND'] },
  shibuya: { hold: ['KAWAII', 'ARIGATO', 'SUGOI', 'YATTA!', 'GENKI', 'TOKYO', 'SHIBUYA', 'DOMO', 'SAYONARA', 'KAWAII!'],
    scroll: ['KONNICHIWA', 'ARIGATO GOZAIMASU', 'TOKYO LOVES YOU', 'CROSSING AT SHIBUYA', 'SO KAWAII', 'DOMO ARIGATO'] },
  dnb: { hold: ['JUNGLE', 'REWIND!', 'SELECTA', 'ROLLERS', 'AMEN', '174'],
    scroll: ['PULL UP SELECTA', 'BIG UP THE JUNGLE MASSIVE', 'REWIND REWIND', 'BASS IN YOUR FACE'] },
  electro: { hold: ['ROBOT', 'BEEP BOOP', 'POP LOCK', 'ELECTRO', 'CIRCUITS'],
    scroll: ['ROBOTS WELCOME TONIGHT', 'B-33P ON THE DECKS', 'DO THE ROBOT'] },
  megadrive: { hold: ['16-BIT', 'PRESS A', 'NOW LOADING', 'PLAYER 2', 'GAME OVER?'],
    scroll: ['BLAST PROCESSING', 'BLOW ON THE CARTRIDGE', 'INSERT CARTRIDGE', 'RESET BUTTON DO NOT PRESS'] },
  'deep-house': { hold: ['DEEP', 'WAREHOUSE', 'AFTERHOURS', 'SOULFUL', 'ONE MORE'],
    scroll: ['DEEPER AND DEEPER', 'THE SUN IS COMING UP', 'NO PHOTOS ON THE DANCEFLOOR', 'JUST ONE MORE TUNE'] },
  'nu-disco': { hold: ['DISCO', 'SUNSET', 'BOOGIE', 'GROOVY', 'BALEARIC'],
    scroll: ['SUNSET ON THE TERRACE', 'ROLLER SKATES ON', 'CONGAS PLEASE', 'GLITTER IS FOREVER'] },
  downtempo: { hold: ['CHILL', 'SLOW', 'HAZY', 'RAINY', 'NIGHT'],
    scroll: ['TAKE IT SLOW', 'RAIN ON THE WINDOW', 'TURN THE LIGHTS DOWN', 'HEAVY EYES HEAVY BEATS'] },
  eurodance: { hold: ['HANDS UP', 'EURO', 'PIANO!', '1995', 'JUMP'],
    scroll: ['EVERYBODY HANDS UP', 'PIANO STABS INCOMING', 'ONE MORE CHORUS', 'THE RAVE BUS IS HERE'] },
  'italo-disco': { hold: ['ITALO', 'DISCO', 'ROBOT', 'MIDNIGHT', 'AMORE'],
    scroll: ['THE ROBOT IS IN LOVE', 'DANCING UNTIL MIDNIGHT', 'SYNTHESIZER ROMANCE', 'CIAO CIAO DISCO'] },
  'electro-funk': { hold: ['FUNK', 'BOOGIE', 'SLAP', 'GET DOWN', 'TALK BOX'],
    scroll: ['GET DOWN ON IT', 'THE BASS IS SLAPPING', 'TALK TO ME TALK BOX', 'BOOGIE ALL NIGHT'] },
  'french-house': { hold: ['FILTER', 'TOUJOURS', 'ENCORE', 'DISCO', 'PUMP'],
    scroll: ['OPEN THE FILTER', 'ENCORE UNE FOIS', 'ONE MORE LOOP', 'TOUJOURS LA FETE'] },
  reggaeton: { hold: ['DEMBOW', 'PERREO', 'FUEGO', 'DALE', 'OTRA VEZ'],
    scroll: ['DALE DALE DALE', 'PERREO HASTA ABAJO', 'FUEGO EN LA PISTA', 'OTRA VEZ OTRA VEZ'] },
});

/** A board line with the song's details filled in. */
export function fillLed(text, { title = '', bpm = 0 } = {}) {
  return text.replace('{TITLE}', String(title).toUpperCase()).replace('{BPM}', String(Math.round(bpm) || ''));
}
