// Starter names for scratch songs. A new song deserves something you can say out
// loud — "PINK SCOOTER" is easier to find in the drawer than "UNTITLED SONG 3",
// and the numbered fallback only ever appeared because nothing here existed.
// Pure data and arithmetic on purpose: the browser desk and the mixer server both
// import this, so it must not touch node:fs.

export const SONG_ADJECTIVES = [
  'HAPPY', 'PINK', 'ELECTRIC', 'VELVET', 'MIDNIGHT', 'GOLDEN', 'LAZY', 'NEON',
  'SILENT', 'BRAVE', 'RUSTY', 'COSMIC', 'SUGAR', 'LUCKY', 'TINY', 'THUNDER',
  'GLASS', 'WILD', 'SLEEPY', 'CRIMSON', 'HOLLOW', 'CRYSTAL', 'JOLLY', 'FROZEN',
  'SECRET', 'MARBLE', 'RUBBER', 'SILVER', 'DIZZY', 'WICKED', 'PLASTIC', 'SUNKEN',
  'PAPER', 'CHROME', 'HUNGRY', 'DRIFTING', 'BITTER', 'SALTY', 'HAUNTED', 'ROYAL',
];

export const SONG_NOUNS = [
  'DOLPHIN', 'SCOOTER', 'ENGINE', 'LANTERN', 'COMET', 'PARADE', 'HARBOUR', 'ROBOT',
  'CACTUS', 'MONSTER', 'JUKEBOX', 'PIGEON', 'ORBIT', 'TANGO', 'CANYON', 'MIRROR',
  'FALCON', 'SUNDAE', 'TIGER', 'LADDER', 'MEADOW', 'PUPPET', 'ANCHOR', 'WALTZ',
  'BEETLE', 'MARKET', 'TEMPLE', 'KITTEN', 'ROCKET', 'DIVER', 'GARDEN', 'SIREN',
  'BALLOON', 'CAROUSEL', 'TYPHOON', 'WOMBAT', 'VOLCANO', 'LULLABY', 'OWL', 'PYLON',
];

/** How many distinct names exist. Every index below this maps to its own pair. */
export const SONG_NAME_COUNT = SONG_ADJECTIVES.length * SONG_NOUNS.length;

/** The name at a position in the adjective x noun grid. Wraps, so any integer works. */
export function songNameAt(index) {
  const i = ((Math.trunc(index) % SONG_NAME_COUNT) + SONG_NAME_COUNT) % SONG_NAME_COUNT;
  return `${SONG_ADJECTIVES[Math.floor(i / SONG_NOUNS.length)]} ${SONG_NOUNS[i % SONG_NOUNS.length]}`;
}

/**
 * A starter name that is not in use yet. The first pick is random so two songs made
 * a second apart do not rhyme; if it is taken, the grid is walked from there, which
 * only ever exhausts once every pair is spoken for.
 */
export function randomSongName({ taken = [], isTaken, random = Math.random } = {}) {
  const used = new Set(taken.map((name) => String(name).trim().toUpperCase()));
  const inUse = (name) => used.has(name) || (isTaken ? !!isTaken(name) : false);
  const start = Math.floor(random() * SONG_NAME_COUNT);
  for (let step = 0; step < SONG_NAME_COUNT; step++) {
    const name = songNameAt(start + step);
    if (!inUse(name)) return name;
  }
  // Every pair is taken — vanishingly unlikely, but a name is still owed.
  return `${songNameAt(start)} ${SONG_NAME_COUNT}`;
}
