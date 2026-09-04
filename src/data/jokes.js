// Comedy is content-budgeted: it lives here, not scattered through systems.
// Rule: absolute deadpan sincerity. Jokes never replace usable information.
// Everything is uppercase in-game — write it that way here too.

export const FAIL_MESSAGES = [
  'DEFEATED BY GEOMETRY',
  'TOO HEROIC FOR CURRENT RAM',
  'GRAVITY REMAINS UNDEFEATED',
  'UNPLUGGED FOR SCHEDULED MAINTENANCE',
  'THE FLOOR FILED A COMPLAINT',
  'RUNNING WAS THE EASY PART',
  'THE ARCADE REGRETS THIS OUTCOME',
];

// Source-specific lines only appear when that source actually caused the hit.
// Keep these out of FAIL_MESSAGES: a generic death cannot claim a particular
// object won an argument when the player may have hit something else entirely.
export const HAZARD_FAIL_MESSAGES = {
  barrel: ['A BARREL HAS WON THE ARGUMENT'],
  fireBarrel: ['A BARREL HAS WON THE ARGUMENT'],
};

// Falling in a hole gets its own pool. A fatal pit is the death a player sees
// most often on the stages that have them, so it is the one that most needs
// more than one line to say.
//
// Deadpan, and never a taunt: the player already knows they missed the jump.
// Every one of these is the ARCADE observing the outcome, which is the register
// the rest of the game's failure text is in.
export const PIT_FAIL_MESSAGES = [
  'GRAVITY REMAINS UNDEFEATED',
  'THE FLOOR WAS NOT THERE. IT HAD NEVER BEEN THERE.',
  'DOWN IS THE ONE DIRECTION THAT ALWAYS WORKS',
  'A HOLE. WORKING EXACTLY AS INTENDED.',
  'PLUMBING FAILURE. YOURS.',
  'THAT WAS A GAP. IT REMAINS A GAP.',
  'NO NOTES. TEXTBOOK DESCENT.',
];

// WHAT WAS AT THE BOTTOM, said out loud.
//
// The pool above is about the FALL and works over anything, which is why the
// tar line came out of it: a hole is filled by the cabinet now, and one of them
// is a gearbox — "THE TAR ACCEPTS ALL APPLICANTS" over a bed of cogs is the
// game describing a hazard the player is not looking at. A material that has
// its own voice gets its own lines and everything else keeps the general ones.
// Keyed by the fill id in game/pitFill.js.
export const FILL_FAIL_MESSAGES = {
  tar: [
    'THE TAR ACCEPTS ALL APPLICANTS',
    'THE TAR IS NOT A FLOOR. IT WAS NEVER A FLOOR.',
  ],
  lava: [
    'THE FLOOR WAS WARMER THAN ADVERTISED',
    'MOLTEN. BRIEFLY YOURS.',
  ],
  slush: [
    'THE WATER WAS COLD AND UNIMPRESSED',
    'BLACK ICE. NO NOTES.',
  ],
  spikes: [
    'THE SPIKES WERE LOAD-BEARING. YOU WERE NOT.',
    'EVERY TOOTH FOUND SOMETHING TO DO',
    'THAT PLATE HAS BEEN WAITING ALL SHIFT',
  ],
  gears: [
    'THE GEARBOX ACCEPTS ALL DEPOSITS',
    'MAINTENANCE WILL NOTE THE OBSTRUCTION',
    'THE MACHINE DID NOT NOTICE YOU',
  ],
};

export const RANK_LINES = {
  C: 'C. A RANK. TECHNICALLY.',
  B: 'B. THE ARCADE NODS SLOWLY.',
  A: 'A. GENUINELY GOOD. DO NOT LET IT CHANGE YOU.',
  S: 'S. THE ARCADE IS PROUD. THE ARCADE IS A BUILDING.',
  CONCERNING: 'CONCERNING. WE HAVE QUESTIONS. WE WILL NOT ASK THEM.',
};

export const TAG_LINES = {
  lorenzo: 'STANDARD PROCEDURE.',
  gnash: 'FINALLY.',
  fernwick: 'THE RECEIPT FORETOLD THIS.',
  b33p: 'LOW ON CYAN.',
  mochi: 'POYO.',
  clara: 'SUDDENLY: CLARA VAULT.',
  kiko: 'THIS IS A CRIME SCENE.',
  raymn: 'HANDS OFF. LITERALLY.',
  grumpos: 'BOY.',
};

export const EGGSHELL_TAUNTS = [
  'YOU ARE DOING VERY ADEQUATELY. I HAVE MADE A NOTE.',
  'MY IQ IS 300 AND YOURS IS A HIGH SCORE.',
  'I HAVE FILED A FORM DISPUTING THAT LAST JUMP.',
  'THIS COPTER IS FINE. THE BEEPING IS DECORATIVE.',
  'A CHILD COULD DO THIS. A CHILD DID. I FIRED HIM.',
  'THE FOURTH HEALTH BAR IS REAL. PROBABLY.',
  'I HAVE BEEN LOSING TO PLUMBERS SINCE 1986. THE STATISTICAL PROBABILITY OF YOU WINNING THIS STAGE IS AN INSULT TO MY DOCTORATE.',
  'DO YOU KNOW WHAT IT IS LIKE TO SIT IN A CLOWN-COPTER FOR FOUR DECADES? THE ERGONOMICS ARE ATROCIOUS.',
];

// Relay exit lines: the departing hero's parting shot at a portal swap, keyed
// by who is LEAVING. This used to be a two-hander — the outgoing hero set up,
// the incoming hero replied, and the button callout followed — three bubbles
// deep in a stack you are reading while dodging. The reply was the one to cut:
// the incoming hero's actual news is the callout right behind it, and by the
// time the bubbles play the player sprite has already become them, so the
// outgoing hero was talking out of someone else's body.
//
// So every line here has to stand alone — no setups waiting for a punchline.
// Each hero speaks the first time they tag out in a run and is quiet after
// that: everyone gets their moment, and a swap-heavy run does not turn into a
// conversation.
export const EXIT_LINES = {
  lorenzo: [
    'THE VALVE IS SEALED. THE REST IS YOUR PROBLEM.',
    'APPLYING INDUSTRIAL THREAD SEALANT AND LEAVING.',
    'I AM CLOCKING OUT. THE DUCTWORK KNOWS WHAT IT DID.',
  ],
  gnash: [
    'ALREADY AT THE NEXT CORNER. CATCH UP.',
    'TOO SLOW. I ALREADY PASSED THE VALVE.',
    'I FINISHED THIS SHIFT BEFORE IT STARTED.',
  ],
  fernwick: [
    'THE RECEIPT SAYS SOMEONE ELSE HANDLES THIS PART.',
    'MY PROPHECY ENDS HERE. IT WAS A SHORT PROPHECY.',
    'THE RECEIPT EXPRESSLY FORBIDS RUNNING. I GO.',
  ],
  b33p: [
    'CHASSIS POWERING DOWN. CYAN LEVEL: CRITICAL.',
    'HANDING OFF. LOGGING THIS AS A SUCCESS. IT WAS NOT.',
    'SHIFT COMPLETE. UPDATE STILL WILL NOT INSTALL.',
  ],
  mochi: [
    'POYO. (THE PIXELS WARP SLIGHTLY.)',
    'POYO.',
    'POYO? (IT IS A GOODBYE. PROBABLY.)',
  ],
  clara: [
    'SHE LEFT THE WAY SHE ARRIVED: DRAMATICALLY, AND MID-SENTENCE.',
    'TO BE CONTINUED.',
    'OUR HEROINE VANISHED. THE CROWD GASPED. (THE CROWD WAS A VENDING MACHINE.)',
  ],
  kiko: [
    'THE FILE STAYS OPEN. SO DOES THE DOOR.',
    'I HAVE LEFT MY CARD WITH THE BARREL.',
    'I AM NOT LEAVING. I AM CANVASSING.',
  ],
  raymn: [
    'HANDS OFF. LITERALLY. THEY ARE UNSECURED.',
    'MY HAND IS SELF-EMPLOYED. IT LEAVES WHEN IT WANTS.',
    'THE SHOES DID MOST OF THAT. I PROVIDED LEADERSHIP.',
  ],
  grumpos: [
    'BOY. TAKE THE FIELD.',
    'PREPARE FOR BALLISTIC DISPATCH. I AM LEAVING.',
    'THE AXE STAYS WITH ME. BOY.',
  ],
};

export const EGGSHELL_NARRATION = [ // inaccurate, for corrupted mode + UNPLUGGED
  'HE JUMPS. HE DOES NOT. I AM NOT WATCHING.',
  'THE HERO TRIPS. MAGNIFICENTLY. I ASSUME.',
  'NOTHING IS HAPPENING. NOTHING HAS EVER HAPPENED.',
  'A BARREL APPROACHES. OR A DUCK. MY NOTES ARE BAD.',
  'THIS IS THE PART WHERE THEY LOSE. ANY MOMENT NOW.',
];

// Boss hits fire every time a shot connects, so these stay short enough to read
// at a glance and clear before the next one. The long variants below are the
// rare punchline — see BOSS_LONG_CHANCE in game/boss.js.
export const BOSS_HIT_SHORT = [
  'DIRECT HIT',
  'OUCH.',
  'OW.',
  'NOTED.',
  'THAT COUNTED.',
  'FELT THAT.',
];

export const BOSS_DEFLECT_SHORT = [
  'REDIRECTED',
  'SENT BACK.',
  'RETURNED TO SENDER.',
  'OOF.',
  'THAT ALSO COUNTED.',
];

// The chase copter's forcefield, in the same register as the boss deflects
// above and in his own idiom, which is paperwork. One of them teaches the rule
// the mission wants: the shot is not the answer, the head is.
export const COPTER_DEFLECT_SHORT = [
  'DISPUTED.',
  'CLAIM DENIED.',
  'THE FIELD IS INSURED.',
  'RETURNED TO SENDER.',
  'NOT A VALID BONK.',
];

// Food-court hero chatter (drawn via drawSpeech, one line per visit, cycling
// in order). Beyond the file-level deadpan rule, each pool follows:
//   - One running bit per hero, set by docs/CAST.md's summary of them. Every new
//     line is a fresh variation on that same bit, not a new trait or joke
//     type — Lorenzo is wounded professional pride about plumbing, not "guy
//     who's mad about things"; B-33P's cyan gag rides every line, even the
//     ones that could be a generic robot joke.
//   - No two lines in one hero's pool share a joke type (e.g. two "I ate the
//     [arcade object], here's its texture" lines for Miss Chomp reads as
//     repeated rather than as range).
//   - Setup-then-turn or a flat statement with a dry tag, one or two
//     sentences, under ~110 characters — the speech box wraps to 3 lines.
//   - No fourth-wall breaks: they can gripe about the food court, HR, or the
//     arcade, but not about "the player" or "the game" as external concepts.
//   - Mochi's bit is voice-only ("POYO" in varying punctuation/emphasis); a
//     bracketed stage direction has to still carry the word, not replace it.
export const HUB_LINES = {
  lorenzo: [
    'THE PIPES HERE ARE DECORATIVE. IT DISGUSTS ME.',
    'I BROUGHT A TROMBONE. FOR PLUMBING.',
    'THE PRETZEL STAND SERVES SOUP THROUGH A TAP. CRUDE, BUT HONEST.',
    'I ORDERED A CALZONE. IT ARRIVED AS A DECORATIVE PIPE. I SENT IT BACK ON PRINCIPLE.',
    'THE FOOD COURT HAS NO PROPER DRAINAGE. I HAVE FILED A COMPLAINT WITH MYSELF.',
    'SOMEONE CALLED MY WRENCH A PROP. WE ARE NOT SPEAKING.',
    'I FIXED THE VENDING MACHINE. IT NOW ONLY DISPENSES REGRET.',
    'STANDARD PLUMBING PROCEDURE DOES NOT COVER FOOD COURTS. I AM IMPROVISING.',
  ],
  gnash: [
    'I FINISHED TALKING TO YOU YESTERDAY. YOU ARE JUST NOW ARRIVING.',
    'THE SODA MACHINE IS STILL DISPENSING MY DRINK. I FINISHED IT TEN MINUTES AGO.',
    'RUN FASTER. OR AT ALL. EITHER IS FINE.',
    'I ARRIVED SO EARLY I HAD TO WAIT FOR MYSELF TO SHOW UP.',
    'THE PRETZEL LINE MOVES TOO SLOWLY. I HAVE ALREADY EATEN THREE, MENTALLY.',
    'SPIN DASHING THROUGH A FOOD COURT IS FROWNED UPON. I DID IT ANYWAY.',
    'I BEAT THE HIGH SCORE ON THE ARCADE CABINET BEFORE IT FINISHED BOOTING.',
    'I HAVE MASTERED WAITING. IT TOOK FOREVER.',
  ],
  fernwick: [
    'MY PROPHECY MENTIONS A "BUY ONE GET ONE" EVENT. DARK TIMES.',
    'THE RECEIPT FADES FURTHER EVERY DAY. AS DO WE ALL.',
    'I HAVE PREPARED FOR THIS. THE RECEIPT SAID TO.',
    'THE PROPHECY CONTAINS A COUPON. OUR DESTINY EXPIRES THURSDAY.',
    'MY PROPHECY WARNED OF A LONG LINE. IT WAS RIGHT, AS ALWAYS.',
    'THE INK IS ALMOST GONE. SO IS MY PATIENCE.',
    'I ASKED THE RECEIPT IF WE WIN. IT PRINTED A BARCODE.',
    'THE PROPHECY SAYS "SALAD ROLLS." I HAVE INTERPRETED THIS AS A MANEUVER.',
  ],
  b33p: [
    'STATUS: OPERATIONAL. CYAN: LOW. MORALE: ADEQUATE.',
    'THE VACUUM CLEANED MY BOOT SECTOR. I FEEL SEEN.',
    'UPDATE AVAILABLE. IT WILL NOT INSTALL. THIS IS FINE.',
    'CYAN LEVEL: CRITICAL. THIS HAS BEEN TRUE FOR YEARS.',
    'SCANNING FOOD COURT. RESULT: FOOD. COURT. CONFIRMED.',
    'MY LEMON CANNON REQUIRES MAINTENANCE. MY LEMON CANNON WILL NOT RECEIVE IT.',
    'ERROR 404: MORALE NOT FOUND. REPORTING ADEQUATE ANYWAY.',
    'THE PRINTER NEXT DOOR AND I HAVE MUCH IN COMMON. NEITHER OF US HAS CYAN.',
  ],
  mochi: [
    'POYO.',
    'POYO. (THE STARS LEAN CLOSER.)',
    'POYO?',
    'POYO!',
    'POYO... (A STAR WINKS OUT, POLITELY.)',
    'POYO POYO.',
    'POYO. (MOCHI FLOATS. THE ROOM FEELS SLIGHTLY MORE BLESSED.)',
    'POYO?? POYO.',
  ],
  // CLARA. Her bit is NARRATION: she lives inside a pulp adventure serial and
  // reads it out — breathless third person, past tense, chapter numbers — while
  // standing in a food court doing nothing of the kind. The rule protecting it:
  // the NARRATOR is always sincere. The gap between the prose and the premises
  // is the joke, and the moment she winks at it the whole register collapses
  // into sarcasm, which Gnash already owns. She is not a fourth-wall break:
  // the serial is real to her, the way Fernwick's receipt is real to him.
  //
  // Register check: her vocabulary is EXPEDITION prose — chapter, temple,
  // artifact, cursed, ancient, our heroine, to be continued. Swap her nouns
  // for HR nouns and every line dies, which keeps her off Gary's turf; swap
  // the narration frame away and the line should stop working, which keeps
  // her off everyone else's.
  //
  // One line per joke type, in order: the ruin / the artifact / the peril /
  // the leap / the pistol / the cliffhanger / the tense slipping / the
  // guardian / the cursed treasure / the map / the franchise / the
  // scholarship. Two pay rent on the kit — the cliffhanger jump and the
  // pistol.
  clara: [
    'CHAPTER ONE: THE FOOD COURT. ANCIENT. ABANDONED. THE PRETZEL STAND WAS STILL WARM. SHE PRESSED ON.',
    'SHE RAISED THE NAPKIN DISPENSER ALOFT. PRICELESS. MUSEUMS WOULD GO TO WAR FOR THIS. SHE KEPT IT.',
    'THE FLOOR WAS FRESHLY MOPPED. A TRAP. SHE HAD TRAINED HER WHOLE LIFE FOR THIS.',
    'ONE LEAP. IT WAS ALL SHE EVER NEEDED. SECOND JUMPS WERE FOR PEOPLE WITH DOUBTS.',
    'SHE FIRED ONCE. THE BARREL UNDERSTOOD. THE OTHER BARRELS TOOK NOTES.',
    'WOULD SHE SURVIVE THE LUNCH RUSH? FIND OUT IN THE NEXT CHAPTER. SHE WOULD. SHE ALWAYS DID.',
    'SHE SAID NOTHING. SHE WAS SAYING IT OUT LOUD. SHE WOULD DEAL WITH THAT IN CHAPTER NINE.',
    'THE GUARDIAN OF THE SERVING LINE SPOKE: "NEXT." A PROPHECY? A THREAT? SHE QUEUED, CAREFULLY.',
    'THE COINS WERE OBVIOUSLY CURSED. SHE TOOK THEM ANYWAY. THAT WAS PAGE ONE OF THE JOB.',
    'SHE CONSULTED THE MALL MAP. "YOU ARE HERE," IT SAID. THE MAP KNEW TOO MUCH.',
    'HER LIFE WAS A TRILOGY. THIS WAS THE GRITTY MIDDLE INSTALLMENT, WHERE THE PRETZELS RAN OUT.',
    'THE ANCIENTS BUILT THIS TEMPLE FOR RITUAL SNACKING. THE SIGNAGE CONFIRMED IT. SO DID THE GREASE.',
  ],
  // Her bit is JURISDICTION: a criminal investigation nobody authorised, in a
  // building where a badge means nothing, pursued with total seriousness. The
  // tournament that brought her here is MOTIVE and shows up once — it is not a
  // second joke engine.
  //
  // The trap this pool has to stay out of is Gary and Ray M'n. All three sit in
  // the bureaucratic register, so hers is kept to CRIMINAL procedure — warrant,
  // custody, evidence, scene, rights, suspect, canvass, prints, discharge —
  // words neither of them touches. Gary owns FORM in both senses already.
  // Test for a new line: swap its nouns for HR nouns. If it still works it is
  // Gary's line, not hers.
  //
  // One line per joke type, in order: the scene / rights / scope / motive /
  // suspect / use of force / witness / contradiction / pursuit / forensics /
  // absence of procedure / the plot. Two pay rent on the kit — the warning shot
  // and the double jump.
  kiko: [
    'THE SOCKET IS A CRIME SCENE. I HAVE TAPED IT OFF. NOBODY HAS RESPECTED THE TAPE.',
    'I READ THE VENDING MACHINE ITS RIGHTS. IT WAIVED THEM.',
    'MY BADGE IS VALID IN A HUNDRED AND NINETY COUNTRIES. THIS IS A BUILDING.',
    'I CAME FOR A TOURNAMENT. I FOUND A FELONY. I AM ADAPTABLE.',
    'I HAVE OPENED A FILE ON THE VACUUM. IT IS A THICK FILE.',
    'I FIRED A WARNING SHOT. THE BARREL HAD ALREADY BEEN WARNED. TWICE.',
    'I ASKED DOLORES WHERE SHE WAS THAT NIGHT. SHE SAID "NEXT."',
    'GARY IS A PERSON OF INTEREST AND ALSO A PERSON WHO IS DECEASED. BOTH ARE TRUE.',
    'THE SUSPECT FLED VERTICALLY. I AM TRAINED FOR THAT.',
    'I DUSTED THE POWER STRIP FOR PRINTS. IT HAD FORTY YEARS OF THEM.',
    'NO ONE IN THIS BUILDING HAS ASKED TO SEE A WARRANT. I FIND THAT CONCERNING.',
    'I HAVE A SUSPECT, A MOTIVE AND A CONFESSION. I STILL HAVE TO DO THE PAPERWORK.',
  ],
  chompo: [
    'I ATE THE MENU. THE SPECIALS WERE DELICIOUS.',
    'THE FOOD COURT IS MY HOMELAND. I AM ITS QUEEN.',
    'I TRIED TO EAT THE SCORE COUNTER AGAIN. IT IS CHEWY, DARLING.',
    'I SAMPLED THE ARCADE CABINET. IT WAS CRUNCHY BUT UNSATISFYING.',
    'MY POSTURE REMAINS EXCELLENT DESPITE HAVING EATEN A DOOR.',
    'THE VENDING MACHINE OWES ME AN APOLOGY AND A REFUND.',
    'I CONSIDERED EATING GARY. HE DECLINED POLITELY. I RESPECTED THAT.',
    'THE MENU WAS DELICIOUS. THE PRICES WERE NOT.',
    'THE COUNTER WOMAN AND I HAVE HISTORY. I MAINTAIN I WAS WITHIN MY RIGHTS.',
    'I HAVE A TAB AT THE SERVING LINE. SHE HAS A LEDGER. WE ARE AT AN IMPASSE.',
  ],
  gary: [
    'HR SAYS BEING DECEASED IS NOT APPROVED LEAVE. I HAVE APPEALED.',
    'MY COWORKERS SENT A FAREWELL CARD. IT SAYS "SEE YOU MONDAY."',
    'THE PAWN SHOP IS LEGALLY DISTINCT. FROM WHAT? EXACTLY.',
    'I AM STILL RESPONSIBLE FOR THE PHYSICAL SWITCHES. DEATH DID NOT UPDATE THE ROSTER.',
    'HR SAYS LOGGING INTO A DIGITAL ENVIRONMENT DOES NOT CONSTITUTE A COMMUTE. MY TIME-CARD IS COMPLICATED.',
    'THE VENDING MACHINE UNIONIZED WITHOUT ME. I FEEL LEFT OUT.',
    'MY DESK IS STILL RESERVED. I APPRECIATE THE GESTURE, HR.',
    'I HAUNT THE PAWN SHOP DURING BUSINESS HOURS ONLY. IT IS POLICY.',
    'MY DEATH CERTIFICATE MISSPELLED MY NAME. HR SAYS I MAY STILL BE ALIVE.',
    'TECHNICALLY I NEVER CLOCKED OUT. LEGALLY THIS IS A GRAY AREA.',
  ],
  raymn: [
    'THE LIMB INSPECTOR LEFT WITHOUT COMPLETING THE FORM.',
    'MY HAND IS SELF-EMPLOYED. WE HAVE A PROFESSIONAL ARRANGEMENT.',
    'THE SHOES DO MOST OF THE RUNNING. I PROVIDE LEADERSHIP.',
    'MY HAND FILED FOR OVERTIME. I AM STAYING OUT OF IT.',
    'THE FOOD COURT HAS NO RAILING FOR PEOPLE WITH OPTIONAL LIMBS. NOTED.',
    'I ROCKET-PUNCHED A PRETZEL. IT WAS WORTH THE PAPERWORK.',
    'MY SHOES WANT A RAISE. THEY DO MOST OF THE WORK.',
    'THE INSURANCE FORM STILL SAYS "OPTIONAL." I STAND BY IT.',
  ],
  grumpos: [
    'BOY.',
    'THE AXE RETURNS. USUALLY. TODAY IT RETURNED.',
    'I THREW LORENZO EARLIER. HE CALLED IT STANDARD PROCEDURE.',
    'THE AXE MISSED THE HOOK. BOY LAUGHED. WORTH IT.',
    'BOY WANTED A PRETZEL. I SAW THE PRICE. WE ARE HUNTING INSTEAD.',
    'I THREW THE AXE AT THE COMPLAINTS BOX. COMPLAINT RESOLVED.',
    'BOY ASKED FOR A PRETZEL. BOY GOT A PRETZEL. THIS IS THE JOB.',
  ],
  // DOLORES. The rule that makes her work is that she never acknowledges the
  // arcade is dead — not as denial, which would be sad, but as a shift that has
  // not ended yet. The lunch rush is coming. Everything is portioned. She is
  // ready. Gary is deceased and knows it; the Dust Devil is haunted and enjoys
  // it; Dolores is simply still on, and nobody has come to relieve her.
  //
  // She never asks a question she wants answered, and she never completes the
  // thought that would give the game away. The gap is the joke.
  dolores: [
    'NEXT.',
    'TAKE A NUMBER. THE DISPENSER IS EMPTY. TAKE ONE ANYWAY.',
    'NOW SERVING ZERO. PLEASE HAVE YOUR NUMBER READY.',
    'WE STOPPED DOING NACHOS. DO NOT ASK ME AGAIN.',
    'THE LUNCH RUSH IS AT NOON. I HAVE PORTIONED FOR FORTY.',
    'ONE PER CUSTOMER. I DO NOT MAKE THE POLICY. I ENFORCE IT.',
    'THE LAMPS STAY ON UNTIL CLOSING.',
    'I GO ON BREAK AT SIX. IT HAS NOT BEEN SIX YET.',
    'HANDS OFF THE GUARD. IT IS THE ONLY CLEAN THING IN HERE.',
    'YOU WANT THE SHIELD, YOU QUEUE LIKE EVERYONE ELSE.',
    'I HAVE NOT BEEN RELIEVED. MY TILL REMAINS OPEN.',
    'SOMEBODY UNPLUGGED SOMETHING. NOT MY SECTION.',
  ],
};

export const INTRO_PANELS = [
  { text: 'THE ARCADE. 11:58 PM. EVERY CABINET DREAMING ITS LITTLE ELECTRIC DREAM.' },
  { text: 'DON K. EGGSHELL, PHD, UNPLUGS THE MASTER POWER STRIP. "IF I CANNOT WIN... NOBODY PLAYS." HIS VACUUM IS ALSO CHARGING. PRIORITIES.' },
  { text: 'DUE TO BUDGET CUTS, THE ARCADE CAN ONLY RENDER ONE HERO AT A TIME. THE HEROES ACCEPT THIS WITH GRACE. AND ONE FORM COMPLAINT.' },
  { text: 'EIGHT HEROES. ONE SOCKET. A RELAY BEGINS. THIS IS THE MOST IMPORTANT CRISIS IN HISTORY. EVERYONE AGREES.' },
];

export const FINALE_BEATS = [
  'THE HEROES REACH THE SOCKET.',
  'EGGSHELL BLOCKS IT WITH HIS ENTIRE BODY. HE BEGINS HIS ULTIMATE MONOLOGUE. IT AUTOSCROLLS.',
  'THE HEROES PLUG THE EXTENSION CORD INTO HIS CLOWN-COPTER.',
  'NOTHING HAPPENS. THE WALL SWITCH IS OFF.',
  'GARY CASUALLY FLIPS THE SWITCH. HR WILL CITE HIM FOR UNAUTHORIZED INITIATIVE.',
  'EGGSHELL, WARMED BY WALL-SOCKET ELECTRICITY: "SO THIS IS THE WARMTH I NEVER GOT."',
  'DUST DEVIL 9000 PRINTS AN EMPLOYEE OF THE MONTH CERTIFICATE FROM SOMEWHERE IT SHOULD NOT CONTAIN A PRINTER.',
  'THE POWER STRIP WAS PLUGGED INTO ITSELF THE ENTIRE TIME. NOBODY ADDRESSES THIS.',
  'THE LIGHTS GO OFF. THE POWER STRIP DOES NOT.',
];

// The last beat does not end when its line does. A pause after the ending, and
// then HR files its objection in fine print — the campaign is over, the
// paperwork is not, and OVERTIME is the thing nobody signed off on. It reads as
// a disclaimer because it is drawn as one: small, muted, late.
export const FINALE_CODA = 'HR HAS APPROVED NOTHING THAT HAPPENS FROM HERE ON.';

// THE BOW, AND THE LAST WORDS IN THE GAME.
//
// The campaign is one hero at a time by budget, so the cast has never stood in
// a line together on a story screen. The curtain call is the payoff for that
// rule: eight of them, one row, all cheering at once.
//
// The thanks are sincere, and they are still staff copy — nine screens of HR
// memos cannot end on a sentence in a different voice, so the gratitude comes
// from the cast (who mean it) and the fine print comes from the building (which
// does not). Same disclaimer beat as FINALE_CODA above, one screen later.
//
// Two sentences, and it took two false thirds to get there. A middle sentence
// about the arcade being closed argued with the campaign the player just won;
// one about the cabinets dreaming again leaned on a phrase that is on screen
// exactly once, in intro panel 1, which plays on new-file only and skips. The
// ending has no room to reference something most players never read. Thanks,
// then an invitation, and nothing that has to be remembered to land.
export const FINALE_THANKS_TITLE = 'THANK YOU FOR PLAYING';
export const FINALE_THANKS = 'THE ENTIRE CAST THANKS YOU FOR YOUR PATRONAGE. YOU ARE WELCOME HERE ANY NIGHT.';
export const FINALE_SIGNOFF = 'HR APPROVED THE GRATITUDE. ONLY THE GRATITUDE.';

export const DIFFICULTIES = [
  { id: 1, name: 'BREEZY', desc: 'FOR RELAXING.' },
  { id: 2, name: 'SPICY', desc: 'FOR THE BOLD.' },
  { id: 3, name: 'SERIOUS BUSINESS', desc: 'WE CAN NO LONGER BE RESPONSIBLE.' },
  { id: 4, name: 'ULTRA MAXIMUM DELUXE', desc: 'PLEASE SIGN THE WAIVER.' },
  { id: 5, name: 'UNPLUGGED', desc: 'NO. GENUINELY. NO.' },
];

export const PAWN_LINES = [
  'EVERYTHING IS GENTLY HAUNTED. PRICES REFLECT THIS.',
  'NO REFUNDS. THE ITEMS REFUSE TO LEAVE ANYWAY.',
  'I ALSO WORK HERE. NOBODY QUESTIONS THIS.',
];
