// THE LAB'S SONG NAMES — a word that sounds like the mood, then a noun. 3 Oct 2026.
//
// Peter: name a made song from its MOOD rather than from the desk's general new-song names
// (song-names.js) — a bittersweet one might be LEMON or UNSENT rather than plain SAD. So
// each mood has its own first words, short and said-out-loud, chosen to suggest the mood
// sideways rather than spell it out; the nouns are one shared pool. Every mood gets a few
// thousand pairs, so a long list of songs never runs out or repeats.
//
// One word each side, letters only (the title reads NAME (STYLE/MOOD), and the tests hold
// names to two plain words).
import { randomSongName } from '../../../tools/lib/song-names.js';
import { firstMood } from '../../../tools/lib/banger/moods.js';

export const MOOD_WORDS = Object.freeze({
  anthemic: ['ROARING', 'BLAZING', 'TOWERING', 'MIGHTY', 'GLORIOUS', 'SKYWARD', 'MASSIVE', 'STADIUM',
    'TITAN', 'BOOMING', 'GRAND', 'UNITED', 'CHAMPION', 'CROWNED', 'ENDLESS', 'HOMEWARD', 'HEADLINE',
    'ARENA', 'HANDSUP', 'ANTHEM', 'BEACON', 'SUMMIT', 'FOREVER', 'THUNDER'],
  uplifting: ['SOARING', 'BRIGHT', 'FLOATING', 'AIRBORNE', 'SUNLIT', 'LIFTED', 'WINGED', 'BUOYANT',
    'RADIANT', 'SKYBLUE', 'FEATHER', 'HELIUM', 'DAWNING', 'UPWARD', 'GLOWING', 'KITE', 'SOLAR',
    'CLOUDLESS', 'SHINING', 'MORNING', 'WARM', 'GOLDEN', 'BREEZY', 'HIGHER'],
  euphoric: ['GIDDY', 'DIZZY', 'ELATED', 'STARRY', 'FIZZY', 'SPARKLING', 'FIREWORK', 'LASER', 'RAPTURE',
    'ULTRA', 'HYPER', 'FEVER', 'NEON', 'BLISS', 'TURBO', 'MEGA', 'SHIMMER', 'GLITTER', 'CANDY',
    'DAZZLE', 'WHIRLING', 'RUSH', 'SUPERNOVA', 'CONFETTI'],
  moody: ['SMOKY', 'BROODING', 'DUSKY', 'HAZY', 'RAINY', 'SULKY', 'FOGGY', 'MUTED', 'PENSIVE', 'LONELY',
    'VELVET', 'AFTERHOURS', 'SHADOWED', 'DRIZZLE', 'OVERCAST', 'MOONLIT', 'QUIET', 'SIDEWAYS', 'BLUE',
    'INKY', 'STREETLIGHT', 'CLOUDED', 'SLATE', 'LATE'],
  dark: ['SHADOW', 'OBSIDIAN', 'VOID', 'RAVEN', 'MIDNIGHT', 'ASHEN', 'CHARRED', 'SINISTER', 'FERAL',
    'VENOM', 'PHANTOM', 'GRIM', 'CRYPTIC', 'ECLIPSE', 'BLACKOUT', 'SMOULDER', 'IRON', 'HOLLOW',
    'SUNLESS', 'NIGHTFALL', 'PITCH', 'SERPENT', 'COLD', 'UNDERTOW'],
  heroic: ['VALIANT', 'NOBLE', 'FEARLESS', 'GALLANT', 'BOLD', 'IRONCLAD', 'LEGEND', 'STALWART',
    'DAUNTLESS', 'CHARGING', 'QUEST', 'SHIELD', 'KNIGHT', 'UNBROKEN', 'LIONHEART', 'VICTOR',
    'RALLYING', 'STEADFAST', 'BRAVE', 'SUMMIT', 'BANNER', 'SWORD', 'DRAGON', 'TRIUMPH'],
  nostalgic: ['FADED', 'POLAROID', 'CASSETTE', 'VINTAGE', 'SEPIA', 'DUSTY', 'YESTERDAY', 'ARCADE',
    'SUMMER', 'BACKSEAT', 'ATTIC', 'WORN', 'AMBER', 'RETRO', 'PASTEL', 'HOMETOWN', 'WALKMAN',
    'DRIVEIN', 'MIXTAPE', 'REWIND', 'PENNY', 'SCHOOLYARD', 'POSTCARD', 'OLDEN'],
  funky: ['GROOVY', 'SLINKY', 'STRUTTING', 'ELASTIC', 'RUBBER', 'BOUNCY', 'SWAGGER', 'SLICK', 'GREASY',
    'JIVE', 'COOL', 'STOMPING', 'POPPING', 'WOBBLY', 'SASSY', 'DAPPER', 'SNAPPY', 'LOOSE', 'BRASSY',
    'DOWNTOWN', 'WAHWAH', 'STRUT', 'SLAPBACK', 'FUZZ'],
  gothic: ['CANDLELIT', 'CATHEDRAL', 'BELFRY', 'WRAITH', 'VAMPIRE', 'MOURNING', 'CRIMSON', 'GRAVEYARD',
    'THORNED', 'VEILED', 'GARGOYLE', 'MOONLESS', 'HAUNTED', 'CROW', 'WIDOW', 'CRYPT', 'SPECTRAL',
    'BONE', 'NIGHTSHADE', 'COFFIN', 'LACE', 'TOLLING', 'ROSARY', 'GHOST'],
  bittersweet: ['WISTFUL', 'AFTERGLOW', 'FADING', 'LAST', 'TENDER', 'ACHING', 'FAREWELL', 'AUTUMN',
    'GOODBYE', 'ALMOST', 'UNSENT', 'MELTING', 'SUNDOWN', 'PALE', 'DISTANT', 'WILTED', 'BRUISED',
    'LEMON', 'EMBER', 'LONGING', 'KEEPSAKE', 'HALFLIT', 'SALTED', 'ONCE'],
  disco: ['MIRRORBALL', 'GLITTER', 'SEQUIN', 'VELOUR', 'SPANGLED', 'PLATFORM', 'STUDIO', 'ROLLER',
    'FOXY', 'SATIN', 'STARDUST', 'SPARKLE', 'DIAMOND', 'FEVER', 'SATURDAY', 'STROBE', 'NIGHTLIFE',
    'SILVER', 'HUSTLE', 'GLAM', 'POLYESTER', 'BOOGIE', 'FLARED', 'GOLDLEAF'],
  sunshine: ['SUNNY', 'LEMONADE', 'BEACH', 'POPSICLE', 'BREEZY', 'SEASIDE', 'MARMALADE', 'HONEY',
    'TANGERINE', 'DAISY', 'PICNIC', 'HAMMOCK', 'SUNKISSED', 'PEACHY', 'SANDY', 'BUTTERCUP',
    'BUBBLEGUM', 'SUNDAY', 'CITRUS', 'SKYLARK', 'SUMMER', 'PARASOL', 'SHERBET', 'POOLSIDE'],
  doowop: ['SWEETHEART', 'MOONLIGHT', 'MILKSHAKE', 'CHERRY', 'DREAMBOAT', 'SODA', 'PROMNIGHT',
    'STREETCORNER', 'CRUISING', 'CHROME', 'DINER', 'STARLIGHT', 'TEENAGE', 'LOVESICK', 'BUBBLE',
    'DARLING', 'HARMONY', 'RIBBON', 'MALTED', 'LETTERMAN', 'BOBBYSOX', 'SLOWDANCE', 'LIPSTICK', 'DOLL'],
  lament: ['WEEPING', 'MOURNFUL', 'FORSAKEN', 'GRIEVING', 'WINTER', 'SORROW', 'ASHES', 'REQUIEM',
    'ELEGY', 'LOST', 'BROKEN', 'WILLOW', 'TEARDROP', 'FALLEN', 'LONESOME', 'EMPTY', 'SILENT',
    'GREYING', 'CANDLE', 'RAINFALL', 'WILTING', 'DIRGE', 'EBBING', 'SHROUDED'],
  lofi: ['SLEEPY', 'MELLOW', 'FUZZY', 'DUSTY', 'COZY', 'RAINY', 'VINYL', 'CRACKLE', 'STUDY', 'LAZY',
    'SOFT', 'SUNDAY', 'MUFFLED', 'TAPE', 'HAZY', 'TEACUP', 'BEDROOM', 'PILLOW', 'SNOOZE', 'DRIZZLE',
    'SLIPPER', 'HUSHED', 'BLANKET', 'CHILL'],
  dreamy: ['CLOUDY', 'FLOATY', 'LILAC', 'PASTEL', 'MOONBEAM', 'STARLIT', 'GAUZY', 'SILKEN', 'DRIFTING',
    'SLUMBER', 'FEATHER', 'LUCID', 'OPAL', 'MISTY', 'SHIMMER', 'CANDYFLOSS', 'HALO', 'ECHO',
    'NEBULA', 'SWIRL', 'DAYDREAM', 'MARSHMALLOW', 'PILLOWY', 'SOFTFOCUS'],
  wonder: ['STARRY', 'COSMIC', 'MAGIC', 'ENCHANTED', 'CRYSTAL', 'AURORA', 'GALAXY', 'ORBITAL',
    'MYSTIC', 'MARVEL', 'MIRACLE', 'CURIOUS', 'TWINKLING', 'FABLED', 'SECRET', 'HIDDEN', 'FAIRY',
    'CELESTIAL', 'PRISM', 'LUMINOUS', 'MOONSTONE', 'WONDROUS', 'ODYSSEY', 'STARGAZER'],
  lounge: ['COCKTAIL', 'MARTINI', 'VELVET', 'SMOOTH', 'SUAVE', 'SILK', 'TUXEDO', 'PENTHOUSE', 'OLIVE',
    'BOSSA', 'CHAMPAGNE', 'MAHOGANY', 'SATIN', 'BAMBOO', 'TIKI', 'POOLSIDE', 'CASINO', 'CABANA',
    'SWANKY', 'RITZY', 'SOIREE', 'SIPPING', 'ESPRESSO', 'HIGHBALL'],
  boogie: ['STOMPING', 'JUMPING', 'BOOGALOO', 'ROLLING', 'BOUNCING', 'HOPPING', 'SHAKY', 'WIGGLY',
    'JIVING', 'TWISTING', 'ROCKIN', 'HOTFOOT', 'SKIPPING', 'RATTLING', 'SHIMMY', 'BOPPING', 'ZIPPY',
    'KICKING', 'TAPPING', 'SNAPPING', 'SWINGING', 'HOPSCOTCH', 'JOYRIDE', 'BARRELHOUSE'],
  boss: ['FINAL', 'RAGING', 'MEGA', 'ULTIMATE', 'DOOM', 'FURY', 'TURBO', 'OVERLORD', 'TYRANT',
    'INFERNO', 'CRUSHER', 'MOLTEN', 'BERSERK', 'ARMOURED', 'HYPER', 'VOLCANIC', 'RUMBLING', 'MECHA',
    'GIGA', 'OMEGA', 'SHOWDOWN', 'WARLORD', 'STOMPER', 'KAIJU'],
  flamenco: ['DUENDE', 'SAFFRON', 'SCARLET', 'SULTRY', 'SUNBAKED', 'SIERRA', 'FIERY', 'SIESTA',
    'FANDANGO', 'MATADOR', 'ALHAMBRA', 'CORDOBA', 'SEVILLE', 'DESERT', 'PEPPER', 'RUBY', 'COPPER',
    'MANTILLA', 'CASTANET', 'BOLERO', 'CARNATION', 'TERRACE', 'MIDSUMMER', 'COURTYARD'],
  hypnotic: ['SPIRAL', 'LOOPING', 'PENDULUM', 'ORBITAL', 'PULSING', 'ENDLESS', 'MANTRA', 'CIRCLING',
    'STROBE', 'TICKING', 'RIPPLE', 'ECHOING', 'CLOCKWORK', 'WHIRLPOOL', 'TUNNEL', 'MAGNETIC',
    'SPINNING', 'KALEIDO', 'DRONING', 'GLIDING', 'ROTARY', 'METRONOME', 'TIDAL', 'SWAYING'],
  fiesta: ['CARNIVAL', 'MAMBO', 'SALSA', 'MANGO', 'PAPAYA', 'TROPICAL', 'PINATA', 'MARACA', 'CONGA',
    'SAMBA', 'SIZZLING', 'MERENGUE', 'CUMBIA', 'COCONUT', 'HAMMOCK', 'CABANA', 'LIMBO', 'PARTY',
    'SUNSHINE', 'SHIMMY', 'SPICY', 'CANDELA', 'HAVANA', 'FUEGO'],
  soulful: ['GOSPEL', 'SUNDAY', 'TESTIFY', 'HALLELUJAH', 'AMEN', 'SPIRIT', 'CHOIR', 'PRAISE', 'HEAVENLY',
    'UPLIFT', 'GRACE', 'BLESSED', 'SANCTIFIED', 'REVIVAL', 'JUBILEE', 'GLORY', 'WARMHEARTED', 'SOULFUL',
    'HUMBLE', 'GOLDEN', 'KINDRED', 'HOMECOMING', 'RAPTUROUS', 'BELOVED'],
  mystery: ['SECRET', 'SHADOWY', 'CLOAKED', 'MASKED', 'HIDDEN', 'SNEAKY', 'TIPTOE', 'WHISPER', 'NOIR',
    'TRENCHCOAT', 'FOGBOUND', 'AGENT', 'CIPHER', 'CODED', 'LOCKED', 'COVERT', 'DOUBLECROSS', 'ALIBI',
    'STAKEOUT', 'KEYHOLE', 'MIDNIGHT', 'UNSOLVED', 'PRIVATE', 'CLUE'],
  playful: ['CHEEKY', 'WACKY', 'ZANY', 'GOOFY', 'GIGGLING', 'TOPSY', 'TICKLED', 'NOODLE', 'BOINGY',
    'SQUEAKY', 'WIBBLE', 'MISCHIEF', 'PRANKSTER', 'CARTOON', 'BANANA', 'JELLYBEAN', 'CUSTARD', 'PUDDLE',
    'TIPTOE', 'SILLY', 'LOONY', 'HICCUP', 'SPRINGY', 'DOODLE'],
});

/** The second word: one pool for every mood, short and concrete. */
export const MOOD_NOUNS = Object.freeze([
  'DOLPHIN', 'SCOOTER', 'ENGINE', 'LANTERN', 'COMET', 'PARADE', 'HARBOUR', 'ROBOT', 'CACTUS', 'MONSTER',
  'JUKEBOX', 'PIGEON', 'ORBIT', 'TANGO', 'CANYON', 'MIRROR', 'FALCON', 'SUNDAE', 'TIGER', 'LADDER',
  'MEADOW', 'PUPPET', 'ANCHOR', 'WALTZ', 'BEETLE', 'MARKET', 'TEMPLE', 'KITTEN', 'ROCKET', 'DIVER',
  'GARDEN', 'SIREN', 'BALLOON', 'CAROUSEL', 'TYPHOON', 'WOMBAT', 'VOLCANO', 'LULLABY', 'OWL', 'PYLON',
  'ARCADE', 'GALAXY', 'MOTEL', 'HIGHWAY', 'SATELLITE', 'RIVER', 'ISLAND', 'TRAIN', 'SUBMARINE', 'ZEPPELIN',
  'FERRIS', 'POSTCARD', 'TELEPHONE', 'RADIO', 'CASSETTE', 'PIXEL', 'JOYSTICK', 'CIRCUIT', 'FIREFLY', 'MOTH',
  'JELLYFISH', 'OCTOPUS', 'PELICAN', 'FLAMINGO', 'PANTHER', 'COYOTE', 'MAMMOTH', 'GECKO', 'RACCOON', 'BADGER',
  'LIGHTHOUSE', 'TOWER', 'BRIDGE', 'TUNNEL', 'ROOFTOP', 'BALCONY', 'ALLEY', 'PIER', 'BOARDWALK', 'SKYLINE',
  'CASTLE', 'FORTRESS', 'CHAPEL', 'OBSERVATORY', 'GREENHOUSE', 'LAUNDROMAT', 'DINER', 'CINEMA', 'BALLROOM', 'GARAGE',
  'COMPASS', 'TELESCOPE', 'HOURGLASS', 'METEOR', 'NEBULA', 'GLACIER', 'DESERT', 'JUNGLE', 'TUNDRA', 'LAGOON',
  'SPARROW', 'HERON', 'MAGPIE', 'PEACOCK', 'STALLION', 'BUFFALO', 'GORILLA', 'PENGUIN', 'WALRUS', 'NARWHAL',
  'KEYTAR', 'DRUMKIT', 'TRUMPET', 'BANJO', 'ACCORDION', 'TAMBOURINE', 'MICROPHONE', 'AMPLIFIER', 'SPEAKER', 'TURNTABLE',
]);

/** How many names one mood can make. */
export const moodNameCount = (mood) => (MOOD_WORDS[mood]?.length || 0) * MOOD_NOUNS.length;

/**
 * A name for a song made in `mood` that is not in use yet: one of the mood's words and a
 * noun, the first pick random, then walked from there until a free one turns up. A mood
 * with no words of its own (an unknown id) falls back to the desk's general names.
 */
export function moodSongName({ mood, taken = [], random = Math.random } = {}) {
  // a MOOD PAIR is named for the mood it starts in
  const words = MOOD_WORDS[mood] ?? MOOD_WORDS[firstMood(mood)];
  if (!words) return randomSongName({ taken, random });
  const used = new Set(taken.map((n) => String(n).trim().toUpperCase()));
  const count = words.length * MOOD_NOUNS.length;
  const start = Math.floor(random() * count);
  for (let step = 0; step < count; step++) {
    const i = (start + step) % count;
    const word = words[i % words.length], noun = MOOD_NOUNS[Math.floor(i / words.length)];
    if (word === noun) continue;
    const name = `${word} ${noun}`;
    if (!used.has(name)) return name;
  }
  return randomSongName({ taken, random });
}
