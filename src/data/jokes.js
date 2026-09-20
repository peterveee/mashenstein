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
  rusty: 'FINALLY.',            // Gnash's, on loan, until Rusty has his own
  fernwick: 'THE RECEIPT FORETOLD THIS.',
  b33p: 'LOW ON CYAN.',
  mochi: 'POYO.',
  clara: 'SUDDENLY: CLARA VAULT.',
  kiko: 'THIS IS A CRIME SCENE.',
  ramon: 'HANDS OFF. LITERALLY.',
  grumpos: 'BOY.',
};

export const EGGSHELL_TAUNTS = [
  'YOU ARE DOING VERY ADEQUATELY. I HAVE MADE A NOTE.',
  'MY IQ IS 300 AND YOURS IS A HIGH SCORE.',
  'I HAVE FILED A FORM DISPUTING THAT LAST JUMP.',
  'THIS COPTER IS FINE. THE BEEPING IS DECORATIVE.',
  'A CHILD COULD DO THIS. A CHILD DID. I FIRED HIM.',
  'THE FOURTH HEALTH BAR IS REAL. PROBABLY.',
  'I HAVE BEEN LOSING TO PLUMBERS SINCE 1986.',
  'MY DOCTORATE IS IN STATISTICS. IT HAS NEVER ONCE HELPED.',
  'FOUR DECADES IN THIS SEAT. THE ERGONOMICS ARE ATROCIOUS.',
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
  // Rusty reads Gnash's exit lines for now; see the note on his HEROES row.
  get rusty() { return this.gnash; },
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
  ramon: [
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

export const EGGSHELL_NARRATION = [ // ambient observations for UNPLUGGED
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

// AN ANIMAL, SHOT AT. Nothing alive in this game can be shot (see the `animal`
// flag in game/entities.js), so every round that reaches one connects, is
// spent, and changes nothing — and a shot that visibly connects and says
// nothing is worse than one that misses. These are what it says instead.
//
// Same job as the copter's forcefield above, different register: the copter
// answers in paperwork because he is an adjuster, and an animal does not answer
// at all — the ARCADE observes that the attempt was noted and filed. Never a
// scolding, and never the game explaining its own rule; the joke is the animal
// being unbothered, which teaches the rule better than a sign would.
//
// One pool per species because the joke is their character, not the mechanic.
// The dogs get the most lines: they are the ones a player meets over and over,
// and the finish dog is the one they meet at their most desperate.
//
// Three angles, deliberately mixed. A pool that says "unimpressed" four ways
// goes stale inside one stage: one line is that he has seen worse, one makes it
// personal, one makes it a grudge, one is the flat refusal to react. HE, not
// IT — the joke needs him to have an inner life to be unimpressed WITH.
export const DOG_SHOT_SHORT = [
  'HE HAS BEEN SHOT AT BEFORE.',
  'NOW IT IS PERSONAL.',
  'HE WILL REMEMBER THIS.',
  'HE DID NOT FLINCH. HE NEVER FLINCHES.',
];

// The cat's whole characterisation is that she is the one you cannot
// out-think — the fastest closer in the game and the smallest box. So she does
// not escalate and she does not hold a grudge: she declines to participate.
export const CAT_SHOT_SHORT = [
  'THE CAT IS UNBOTHERED.',
  'SHE DID NOT EVEN LOOK.',
  'THE CAT WAS NOT LISTENING.',
];

// The buzzbird is a bird and not a drone, whatever the drones two rows above it
// in the registry would have you assume. It has no opinion about any of this.
export const BIRD_SHOT_SHORT = [
  'THE BIRD KEPT FLYING.',
  'NO EFFECT ON THE BIRD.',
  'THE BIRD IS NOT PART OF THIS.',
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
  get rusty() { return this.gnash; },
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
  // the serial is real to her, the way Fernwick's receipt is real to her.
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
  // The trap this pool has to stay out of is Gary and Ramon. All three sit in
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
  ramon: [
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

// THE OPENING FILM. Not panels: one arcade, one camera, eleven shots.
//
// ------------------------------------------------------------------ the clock
//
// SECONDS ARE AUTHORITATIVE; THE MUSIC IS NOT. Older notes describe shot lengths
// in beats, but this action pass stores explicit seconds and INTRO_FILM resolves
// them once, at module load. The runtime reads nothing else: it never asks
// Audio.songBeat() what time it is.
//
// That is deliberate and it is the whole reason this degrades correctly. A muted
// phone, a headless test, ?goto=intro opened before any bank has loaded, and a
// video render at a fixed 1/60 step all play exactly the same 32.20 seconds and
// cut on exactly the same frame. Driving the picture off the heard beat would
// make all four of those different films, and would make the determinism
// fingerprint in tests/intro-sequence.js impossible to write.
//
// The music is aligned to the film, not the other way round: the bank swap is
// scheduled so THE SURGE's downbeat lands on the doors shot's first frame. See IntroState
// in src/game/intro.js.
//
// ----------------------------------------------------------------- the camera
//
// `cam.from` / `cam.to` are RECTANGLES OF ARCADE, not zoom numbers — a centre in
// world units and the span the shot wants covered. The camera solves its own
// magnification from whatever picture gate it is handed, which is the entire
// reconciliation with portrait: the gate changes shape, the shot does not. One
// `from` and no `to` is a lock-off.
//
// `portrait` overrides the box for the framings that do not survive a tall
// window. Absent means the landscape box is used unchanged, which is true of
// three of the eleven.
//
// ------------------------------------------------------------------- the cues
//
// `cues[].at` is seconds into THIS shot. Each is asked for at least
// Audio.cueLeadSec() early and handed the remaining distance as `inBeats`, so
// the output latency cancels and the sound lands on the frame the picture does —
// on a laptop and on a Bluetooth speaker alike. One-shots only: the sustained
// beds (the crowd, the per-cabinet static) are edge-triggered from the film and
// live in intro.js, because a bed is not an event and does not want placing.
// THE HERO SECTION RUNS ON THE MUSIC'S OWN GRID.
//
// THE SURGE is 132bpm and its downbeat is the door cut, so a bar is 1.8181…s.
// Every beat of the entrance lands on a bar line rather than near one: the
// launch, the cabinet reveal, the takeoff, the glass crossing and the gather.
// Authored as multiples of the bar rather than as decimals, because a film
// choreographed to a tempo and a film that happens to be about the same length
// are different films, and the whole difference is in these numbers.
//
// The pre-door shots are untouched and still sum to 18.00, which is what makes
// the door cut the downbeat in the first place.
const SURGE_BEAT = 60 / 132;
const SURGE_BAR = SURGE_BEAT * 4;

export const INTRO_SHOTS = [
  {
    id: 'row',
    // The floor is the subject here too, so this one pins its ground line
    // rather than letting the box's own height decide where it lands.
    pinFloor: true,
    // Longer, and travelling no further for it, so the truck across the rank is
    // a slow look rather than a sweep — 28 units a second instead of 45. The
    // opening shot has to establish a whole room and carry the film's second
    // longest line; at 4.00s it was doing both in a hurry.
    seconds: 6.40,
    // Start on the left side of the lit rank and truck right across it. Six
    // machines, six different attract loops, six sweep bars out of phase, and
    // nothing else in frame moving.
    // In tight on the machines rather than on the room they stand in. The old
    // 560 box covered 217 units of a 170-unit room, so a third of the frame was
    // ceiling void and the cabinets sat in a band across the middle. At 380 the
    // frame crops the posters and the tubes at the top edge — you see the beams
    // coming down out of shot, which reads as a ceiling continuing rather than
    // as the picture having run out — and the truck covers more ground per
    // second because the frame it crosses is narrower.
    cam: {
      from: { cx: 1090, cy: 155, w: 380 },
      to:   { cx: 1270, cy: 155, w: 380 },
      ease: 'linear',
    },
    // A phone takes the same truck across a narrower slice: at the landscape 440
    // the 3:2 gate would cover three hundred world units of a room a hundred and
    // seventy tall, and the machines would sit in a band of ceiling.
    portrait: {
      from: { cx: 1110, cy: 155, w: 250 },
      to:   { cx: 1280, cy: 155, w: 250 },
      ease: 'linear',
    },
    cues: [{ at: 0.20, name: 'neonBuzz', gain: 0.35 }],
  },
  {
    id: 'arrival',
    seconds: 2.50,
    // WHY HE IS DOING THIS, STATED BEFORE HE DOES IT.
    //
    // The forty years are canon everywhere else in the game — the 1-1 briefing,
    // three of the taunts, the cast list — and the intro was the one place that
    // skipped them, so the next shot's "IF HE CANNOT WIN... NOBODY PLAYS" was
    // arriving as a whim rather than as the end of a grievance. He is not a man
    // with a plan; he is a man with a record.
    // He flies in over the marquees from the right; the camera cranes up and
    // pushes in to MEET him rather than waiting on him to cross a locked frame.
    cam: {
      from: { cx: 1678, cy: 138, w: 300 },
      to:   { cx: 1734, cy: 122, w: 210 },
      ease: 'smooth',
    },
    cues: [{ at: 0.00, name: 'comet', gain: 0.5 }],
  },
  {
    id: 'threat',
    seconds: 2.00,
    // The one lock-off in the film: his face, eighty units of room, no move at
    // all. A punchline needs the camera to shut up. Two beats rather than three
    // because the line is thirty-three characters — a punch is short.
    cam: { from: { cx: 1736, cy: 114, w: 118 } },
    cues: [],
  },
  {
    id: 'socket',
    // The whole cause, in one shot. The close insert on the rocker is gone: a
    // cutaway to a switch is a cutaway to a prop, and it took the villain out of
    // his own decisive moment. He flies into this frame instead, drops, and
    // SITS ON the bar — the tub's weight throws the rocker — with the terminal
    // already on screen, so the man, the rocker, the board and the bank the
    // power is leaving are one continuous piece of geography rather than four
    // shots asking to be assembled. (Switch bake-off option F, 20 Sep 2026.)
    seconds: 5.00,
    // No caption. IF HE CANNOT WIN... NOBODY PLAYS is the last thing read before
    // the arcade goes, and the picture from here to the brownout is the answer
    // to it. A line about the socket's name arriving between the two put an
    // explanation where the consequence should be.
    // A slow push from his arrival onto the board and the plate. One move, no
    // cut: the throw happens inside it.
    // TIGHTER, because the bar and the terminal now sit close enough together
    // for one frame to hold both without standing back. The push lands on the
    // switch at 260 units of arcade rather than 330 — the closest the film ever
    // gets to anything that is not a face.
    cam: {
      from: { cx: 1796, cy: 142, w: 380 },
      to:   { cx: 1804, cy: 166, w: 260 },
      ease: 'smooth',
    },
    portrait: {
      from: { cx: 1796, cy: 148, w: 280 },
      to:   { cx: 1804, cy: 166, w: 210 },
      ease: 'smooth',
    },
    cues: [
      // THE HULL HITS THE BAR, then the rocker goes under it. Two events, one
      // gesture: the comic boink of the tub landing (the chase's own bonk cue,
      // held back so it sits under the switch) and the throw itself on the
      // frame the room loses power. The old note stands — a separate contact
      // tick before the throw would read as a fumble — which is why the landing
      // is a hair ahead and not a beat.
      { at: 3.47, name: 'copterBonk', gain: 0.55 },
      { at: 3.50, name: 'stripThrow', gain: 0.95 },
      // Then sixteen quick mechanical pulls, reverse order with the visual bank.
      ...Array.from({ length: 16 }, (_, i) => ({
        at: 3.66 + i * 0.03,
        name: 'socketDrop',
        pitch: 0.90 + (i % 4) * 0.035,
        gain: 0.72,
      })),
    ],
  },
  {
    id: 'dark',
    // The floor is the subject here too, so this one pins its ground line
    // rather than letting the box's own height decide where it lands.
    pinFloor: true,
    seconds: 4.50,
    // The terminal has already emptied. Now the callback the film has been
    // holding since its own first line reaches the row: the cabinets were
    // dreaming their little electric dream, and this is the line that turns
    // that off. The static not having noticed is the joke and the picture.
    // Cut wide — the whole row, the widest the film ever is. Six screens die
    // left to right over 0.72s, each flashing white then falling to static, and
    // the ceiling tubes go with them. Then three seconds of near-silence with
    // only the intermittent coughs of the dead glass.
    // The cabinet bank runs from x=940 to x=1380; centre the brownout on its
    // midpoint rather than leaving the row biased toward the old socket side.
    cam:      { from: { cx: 1160, cy: 146, w: 620 } },
    portrait: { from: { cx: 1160, cy: 158, w: 410 } },
    cues: [
      { at: 0.10, name: 'powerDown' },
      { at: 1.30, name: 'crackle', gain: 0.5 },
    ],
  },
  {
    id: 'doors',
    // One bar. The leaves finish opening 0.42s in and Lorenzo holds the budget
    // line until the downbeat of bar two, which is the frame he launches on.
    seconds: SURGE_BAR,
    // THE SURGE's downbeat is this shot's first frame. The black centre-parting
    // service door opens fully, revealing Lorenzo already in an idle pose. He
    // holds the budget line for a beat, then starts; the other seven enter just
    // after his first steps rather than waiting for the next shot boundary.
    //
    // This first box stays on the door. The following boxes carry the runway.
    // From here to the end the framing belongs to HERO_CAMERA in intro.js: one
    // continuous move welded to Lorenzo, which a per-shot box cannot express.
    // These stay only so a caption-only shot still resolves a usable zoom.
    cam:      { from: { cx: 120, cy: 170, w: 390 } },
    portrait: { from: { cx: 125, cy: 168, w: 310 } },
    cues: [
      { at: 0.00, name: 'doorOpen' },
      { at: 0.00, name: 'boom', reverb: 0.6, reverbDecay: 2 },
    ],
  },
  {
    id: 'rollcall',
    // Two bars: the seven cross on sixteenths, the pack strings out, and the
    // first machine arrives on the downbeat of bar four.
    seconds: SURGE_BAR * 2,
    // A wide runway view keeps the whole group running at once. Their lanes are
    // spaced across the floor, with the cabinet bank still held at a distance.
    cam: {
      from: { cx: 200, cy: 170, w: 400 },
      to:   { cx: 420, cy: 168, w: 470 },
      ease: 'easeOut',
    },
    portrait: {
      from: { cx: 200, cy: 168, w: 320 },
      to:   { cx: 420, cy: 166, w: 380 },
      ease: 'easeOut',
    },
    cues: [],
  },
  {
    id: 'lineup',
    // One bar: the target is in frame and growing, and Lorenzo is at his fastest
    // through it. The takeoff is this shot's last frame.
    seconds: SURGE_BAR,
    // Said once, in the rollcall. Held over a second shot it stopped reading as
    // a line and started reading as a subtitle that had got stuck — and the
    // reveal and the run into the jump carry themselves.
    // Nobody forms a static lineup. The camera stays wide on the runners and
    // leaves a clean runway before the first cabinet.
    cam:      { from: { cx: 740, cy: 162, w: 500 } },
    portrait: { from: { cx: 740, cy: 160, w: 410 } },
    cues: [],
  },
  {
    id: 'dive',
    // One bar, and every event in it is on a beat: takeoff on the downbeat, the
    // glass crossing on the 'and' of two, the screen run-off ending by four.
    seconds: SURGE_BAR,
    // The jump and screen run carry the joke visually; leave this beat clean
    // after the shorter relay caption has had room to read.
    // The line breaks. One of them runs the length of the dead row and goes
    // INTO a machine — the relay starting on screen rather than being promised,
    // and the same leap the hub plays when the player picks a cabinet. The
    // camera goes with him and ends tight on the glass he vanishes through,
    // which is also the first thing the game proper will draw.
    cam:      { from: { cx: 852, cy: 158, w: 470 }, to: { cx: 900, cy: 158, w: 420 }, ease: 'smooth' },
    portrait: { from: { cx: 852, cy: 158, w: 400 }, to: { cx: 900, cy: 158, w: 320 }, ease: 'smooth' },
    // No cues here. The leap is the shared cabinet dive, and its sounds are
    // lifted straight off that animation's own phase table in intro.js so they
    // cannot drift out of step with the picture. A second hand-placed set would
    // be a slightly-wrong copy of them.
    cues: [],
  },
  {
    id: 'wide',
    // Two bars: the pack arrives on the 'and' of two, the reactions ripple, and
    // the camera finishes easing out over a held composition.
    seconds: SURGE_BAR * 2,
    // Stay with the first PLUMBER PANIC cabinet: the observers react on both
    // sides, the target keeps its breathing gap, and the final image has a
    // readable subject instead of turning into a room map.
    //
    // Hold on the target cabinet and the moving reaction group. The electrical
    // terminal is a separate destination and is deliberately outside this shot;
    // there is no closing pull-back.
    cam:      { from: { cx: 937, cy: 158, w: 370 } },
    portrait: { from: { cx: 941, cy: 158, w: 330 } },
    cues: [
      { at: 0.10, name: 'fizzUp' },
      { at: 0.20, name: 'coin' },
      { at: 1.55, name: 'crackle', gain: 0.4 },
    ],
  },
];

// Resolved ONCE, here, so nothing downstream ever divides by a bpm. `seconds`
// is authoritative for the action blocking pass; the beat fallback keeps older
// callers and historical shot data readable while the film is being retimed.
// THE SCRIPT IS NOT THE SHOT LIST.
//
// Captions used to hang off the shots and take their length from them, which
// tied how long a line is readable to how long a camera move happens to take.
// That is backwards, and it showed in both directions: the budget-cut line got
// 1.8 seconds and the relay line twice that for no reason either could give,
// and the switch beat — five and a half seconds of the villain's whole motive
// playing out — had nothing on screen at all, because the shot it lives in does
// not want a caption of its own.
//
// So the script is its own timeline. `at` and `sec` are absolute film seconds,
// they may span a cut or sit inside one shot, and a gap between two of them is
// as deliberate as a line. The projector still knows nothing about which line is
// over which picture; it just reads a different list.
export const INTRO_CAPTIONS = [
  // ANCHORED TO A SHOT, NEVER TO A NUMBER. These used to carry absolute film
  // seconds, and when the shot table was retimed on 20 Sep the pictures moved
  // and the lines did not: every caption ended up about 1.7s late and finished
  // inside the FOLLOWING shot, which is how the door came to open on a lit
  // Lorenzo while "THE ARCADE GOES DARK" was still on screen. Each line now
  // names the shot it belongs to and an offset into it, so retiming a shot
  // moves its caption with the picture. (The same rule the entrance blocking
  // already follows: derive, do not retype.)
  //
  // ONLY A START IS AUTHORED. Each line runs until the next one begins, and the
  // last runs to the final frame, so the band can never be empty and two lines
  // can never overlap — both were possible while every line carried its own
  // typed length. What a line needs is READING TIME, so the anchors are chosen
  // to keep every one of them at or under about 14 characters a second.
  //
  // The \n breaks are authored: these lines have a shape, and letting the
  // wrapper find its own would break them wherever the measure happened to run
  // out.
  { shot: 'row', in: 0.80, text: 'THE ARCADE. 11:58 PM.\nCABINETS DREAMING ELECTRIC DREAMS.' },
  // He flies in and holds his mark: the name lands over the arrival and the
  // lock-off on his face, and hands over exactly as the switch shot opens.
  // Half a beat before he enters, so three lines of name have the reading time
  // the arrival and the lock-off together can afford.
  { shot: 'arrival', in: -0.50, text: 'DON K. EGGSHELL, PHD.\nFORTY YEARS OF DEFEAT BY PLUMBERS.\nNEVER ON TOP.' },
  // His grievance, over the whole of the switch shot — still on screen while
  // he drops onto the bar and the arcade goes out under him.
  { shot: 'socket', in: 0, text: 'IF HE CANNOT WIN...\nNOBODY PLAYS.' },
  // The consequence, over the brownout, and off before the doors part.
  { shot: 'dark', in: 0, text: 'THE ARCADE GOES DARK.\nEGGSHELL TAKES THE CREDIT.' },
  // The two entrance lines, each given its own run of picture.
  { shot: 'doors', in: 0, text: 'DUE TO BUDGET CUTS,\nONLY ONE HERO CAN PLAY AT A TIME.' },
  // The last line holds from the moment the pack settles to the final frame,
  // across the dive and the pull-out. It comes in just inside the line-up so
  // the two entrance lines get about the same run of picture each.
  { shot: 'lineup', in: 0.90, text: 'EIGHT HEROES. ONE SOCKET.\nA RELAY BEGINS.' },
  // THE CLOSER IS NOT ON THE TIMELINE. It belongs to the close prompt, and it
  // used to be authored to end with the film — so it faded out on the last frame
  // and then snapped back at full strength underneath the prompt, which read as
  // the same line arriving twice.
  { withPrompt: true, at: Infinity, sec: 0, text: 'HISTORY WILL RECORD WHAT HAPPENS NEXT.\nPROBABLY INCORRECTLY.' },
];

export const INTRO_FILM = (() => {
  let t = 0;
  const shots = INTRO_SHOTS.map((s) => {
    const sec = Number.isFinite(s.seconds) ? s.seconds : s.beats * 60 / s.bpm;
    const out = Object.freeze({ ...s, sec, t0: t, t1: t + sec });
    t += sec;
    return out;
  });
  const at = (id) => {
    const shot = shots.find((s) => s.id === id);
    if (!shot) throw new Error(`INTRO_FILM: no shot '${id}'`);
    return shot.t0;
  };
  return Object.freeze({
    shots: Object.freeze(shots),
    // Captions resolve against the shots they name — `shot` + `in` — and each
    // one ENDS where the next begins, the last at the final frame. Nothing here
    // is a typed duration, so retiming a shot moves its line with the picture
    // and cannot open a hole in the band or overlap the line after it. A
    // caption with no shot keeps its own absolute `at`: that is the closer,
    // which belongs to the prompt rather than to the timeline.
    captions: (() => {
      const timed = INTRO_CAPTIONS.filter((c) => !c.withPrompt)
        .map((c) => ({ ...c, at: c.shot ? at(c.shot) + (c.in || 0) : c.at }))
        .sort((a, b) => a.at - b.at);
      const resolved = timed.map((c, i) => {
        const t1 = i + 1 < timed.length ? timed[i + 1].at : t;
        return Object.freeze({ ...c, sec: t1 - c.at, t1 });
      });
      const rest = INTRO_CAPTIONS.filter((c) => c.withPrompt)
        .map((c) => Object.freeze({ ...c, t1: c.at + c.sec }));
      return Object.freeze([...resolved, ...rest]);
    })(),
    duration: t,                    // 32.20
    // The two moments the rest of the film hangs off, named rather than indexed:
    // the frame the rocker clicks and the title theme dies, and the frame THE
    // SURGE's downbeat lands. Both are shot boundaries by construction, so
    // retuning a shot length moves them and nothing else has to be touched.
    cutAt: at('socket') + 3.50,     // 12.00 — physical rocker contact, in shot
    socketAt: at('socket') + 3.66,  // 12.16 — the bank starts emptying after it
    cabinetCutAt: at('dark') + 0.10,// 13.60 — socket is visibly off first
    slamAt: at('doors'),             // 18.00 — continuous hero sequence begins
  });
})();

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
// exactly once, in the opening film's first shot, which plays on new-file only
// and skips. The ending has no room to reference something most players never
// read. Thanks,
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
