// Hero sprites: 12x16 string grids composed from head/torso rows + leg frames.
// Palette keys are per-hero. Heroes are ALWAYS pixel art, in every style pack.
// o=outline, s=skin, h=hat/hair, b=body/torso, p=pants/lower, f=feet, w=white,
// e=eye, a=accent.

const LEGS_A = [
  '...pp..pp...',
  '...pp...pp..',
  '..ff.....ff.',
  '.ff.........',
];
const LEGS_B = [
  '....pppp....',
  '....pp.pp...',
  '....ff..ff..',
  '.....ff.....',
];
const LEGS_JUMP = [
  '...pp..pp...',
  '..pp....pp..',
  '.ff......ff.',
  '............',
];

function humanoid(head, torso) {
  // head: 7 rows, torso: 5 rows, legs: 4 rows -> 16
  return {
    run1: [...head, ...torso, ...LEGS_A],
    run2: [...head, ...torso, ...LEGS_B],
    jump: [...head, ...torso, ...LEGS_JUMP],
  };
}

// --- Lorenzo: purple cap with L, teal overalls, big nose, mustache ----------
const lorenzo = humanoid([
  '...hhhhhh...',
  '..hhhhhhhh..',
  '..hahhhhhh..', // cap emblem
  '...ssssss...',
  '..ssessess..',
  '..sssssnss..', // big nose (n)
  '...smmmms...', // mustache
], [
  '..bbbbbbbb..',
  '.bsbbbbbbs..',
  '.bsbppppbs..', // overall straps
  '..bpppppp...',
  '..pppppppp..',
]);
lorenzo.duck = [
  '............', '............', '............', '............',
  '............', '............', '............', '............',
  '...hhhhhh...',
  '..hahhhhhh..',
  '..ssessess..',
  '...smmmms...',
  '..bbbbbbbb..',
  '..pppppppp..',
  '..ff....ff..',
  '............',
];
lorenzo.pal = { h: '#7b4bd0', a: '#f6d33c', s: '#f2c9a0', e: '#1a1028', n: '#e8a878', m: '#5a3212', b: '#2ea8a0', p: '#22608c', f: '#5a3212', w: '#fff' };

// --- Gnash: cobalt jackal creature, red hi-tops, smirk ------------------------
const gnash = humanoid([
  '..hh.h.h....',
  '.hhhhhhhh...',
  'hhhhhhhhhh..',
  '.hhssssss...',
  '.hssessess..',
  '..sssssss...',
  '...ssmms....',
], [
  '..hhhhhh....',
  '.hhhbbhhh...',
  '..hhbbhh....',
  '...bbbb.....',
  '..bbbbbb....',
]);
gnash.duck = [
  '............', '............', '............', '............',
  '............', '............', '............', '............',
  '..hhhhhhh...',
  '.hhhhhhhhh..',
  '.hhessessh..',
  '..hsssssh...',
  '..hbbbbh....',
  '..ffbbff....',
  '..ff..ff....',
  '............',
];
gnash.pal = { h: '#4a50d2', s: '#efbd83', e: '#1a1028', m: '#a03020', b: '#4a50d2', p: '#3036a8', f: '#d83030', w: '#fff' };

// --- Fernwick: green tunic, floppy cap, blond bowl cut, tiny shield ---------
const fernwick = humanoid([
  '.....aa.....', // tuft of blond hair out the top
  '...hhhhhh...', // hat crown
  '..hhhhhhhh..',
  '.hhhhhhhhhh.', // floppy brim (widest)
  '..ssessess..', // forehead + eyes, clear of the hat
  '..ssssssss..',
  '...ssssss...',
], [
  '..wbbbbbb...', // w = shield edge on back
  '.wwbbbbbbb..',
  '.wwbbbbbbb..',
  '..wbbbbbb...',
  '...pppppp...',
]);
fernwick.duck = [
  '............', '............', '............', '............',
  '............', '............', '............', '............',
  '..hhhhhhhh..',
  '.hhhhhhhhhh.',
  '..ssessess..',
  '..wbbbbbb...',
  '.wwbbbbbbb..',
  '..bbbbbbb...',
  '..ff...ff...',
  '............',
];
fernwick.pal = { h: '#65b83f', a: '#e8bc46', s: '#f2c9a0', e: '#1a1028', b: '#65b83f', p: '#7d6032', f: '#51351f', w: '#b0793a' };

// --- B-33P: silver dome, arm cannon, LED eyes — the only cyan left on him is
// the LEDs, which is exactly what "LOW ON CYAN" should look like -------------
const b33p = humanoid([
  '...hhhhhh...',
  '..hhhhhhhh..',
  '..hwhhhhwh..',
  '..hhhhhhhh..',
  '..wseewsse..',
  '..ssssssss..',
  '...ssssss...',
], [
  '..bbbbbbba..',
  '.bbbbbbbaaa.', // arm cannon (a)
  '.bbbbbbbaaa.',
  '..bbbbbba...',
  '..pppppp....',
]);
b33p.duck = [
  '............', '............', '............', '............',
  '............', '............', '............', '............',
  '...hhhhhh...',
  '..hwhhhhwh..',
  '..wseewsse..',
  '..bbbbbbaaa.',
  '.bbbbbbbaaa.',
  '..bbbbbba...',
  '..ff...ff...',
  '............',
];
// s doubles as the screen/faceplate color: dark hull navy with glowing eyes,
// not flesh — b33p is a robot, and the toon faceplate inherits this directly.
// Steel hull: reads tin-toy robot, frees saturated blue for gnash, and lets the
// gold cannon act as the accent colour.
//
// It used to be a true neutral grey and washed out badly — on the title screen,
// in the food court and in a run. Two reasons, and only one of them is about
// this sprite. Every other hero carries a saturated hue (teal, blue, green,
// pink, orange, red), so a character with NO chroma at all does not read as
// "metal" beside them, it reads as unfinished. And the three greys sat close
// enough in value that the dome, the torso and the legs merged into one shape at
// hub scale.
//
// So: a cool cast in the metal, and the darks pushed down to separate hull from
// limbs. Held short of an actual blue — Gnash is the blue one, and the point is
// still bare steel rather than paint. His one warm note stays the gold gun-arm,
// which has much more punch against a cool hull than it had against neutral
// grey. Being a bit drab is on-brand for a robot who reports LOW ON CYAN; being
// invisible is not.
// `hand`: the toon rig's hands default to the face colour, which for a robot
// whose "face" is a near-black faceplate put two dark blobs on the ends of his
// grey arms — and since his arms draw behind the torso, all you saw was the
// blob. Chrome manipulators in the hull colour instead.
// `arm`: the gun-arm's UPPER segment, a step down from the barrel's `a`. The
// whole limb is one colour so it reads as a single articulated weapon, and this
// shade is deliberately close — far enough apart and it goes back to looking
// like two objects, which is what the two-tone grey-and-yellow version did.
b33p.pal = { h: '#b6c6dc', s: '#101c33', e: '#7ef0ff', m: '#7ef0ff', b: '#7d8ca8', p: '#4d5972', f: '#8fa0bc', w: '#e8f8ff', a: '#f6d33c', hand: '#b6c6dc', arm: '#d4b02e' };

// --- Mochi: pink puffball, stubby arms, red feet -----------------------------
const mochi = {
  run1: [
    '............', '............',
    '....bbbb....',
    '..bbbbbbbb..',
    '.bbbbbbbbbb.',
    '.bbebbbbeb..',
    'abbbbbbbbbba',
    '.bbbbmmbbbb.',
    '.bbbbbbbbbb.',
    '..bbbbbbbb..',
    '...bbbbbb...',
    '..ff....ff..',
    '..fff..fff..',
    '............', '............', '............',
  ],
  duck: null,
};
mochi.run2 = mochi.run1.map((r, i) => (i === 11 ? '...ff..ff...' : i === 12 ? '...ffffff...' : r));
mochi.jump = mochi.run1.map((r, i) => (i === 11 ? '..f......f..' : i === 12 ? '..ff....ff..' : r));
mochi.duck = [
  '............', '............', '............', '............',
  '............', '............', '............', '............',
  '....bbbb....',
  '..bbbbbbbb..',
  '.bbebbbbeb..',
  'abbbbmmbbba',
  '.bbbbbbbbb..',
  '..bbbbbbb...',
  '..ff....ff..',
  '............',
];
// Coral electric-mascot Poyo: coral body, purple accents (ears/cowlick/star
// tail), pink cheeks. b/e/m/a/f/w feed the pixel grid; belly/ear/cheek/star feed
// the vector 'pika' rig in toons.js.
mochi.pal = { b: '#ff6f5e', e: '#2a1622', m: '#8e2f42', a: '#ffc4b8', f: '#ff6f5e', w: '#fff', belly: '#ffc4b8', ear: '#7a4bb0', cheek: '#ff4d7d', star: '#7a4bb0' };

// --- Miss Chomp: yellow wedge-mouth heroine WITH LEGS ------------------------
const chompo = {
  run1: [
    '............', '............',
    '....bbbb....',
    '..bbbbbbbb..',
    '.bbbebbbbb..',
    '.bbbbbbbb...',
    '.bbbbbb.....', // mouth open (wedge)
    '.bbbb.......',
    '.bbbbbb.....',
    '.bbbbbbbb...',
    '.bbbbbbbbb..',
    '..bbbbbbbb..',
    '...pp..pp...',
    '..ff....ff..',
    '............', '............',
  ],
};
chompo.run2 = chompo.run1.map((r, i) => {
  if (i === 6) return '.bbbbbbbb...';
  if (i === 7) return '.bbbbbbb....'; // mouth mid-chomp
  if (i === 12) return '....pppp....';
  if (i === 13) return '...ff.ff....';
  return r;
});
chompo.jump = chompo.run1.map((r, i) => (i === 12 ? '..pp....pp..' : i === 13 ? '.ff......ff.' : r));
chompo.duck = [
  '............', '............', '............', '............',
  '............', '............', '............', '............',
  '....bbbb....',
  '..bbbebbbb..',
  '.bbbbbbbb...',
  '.bbbb.......',
  '.bbbbbbbb...',
  '..bbbbbbbb..',
  '..ff....ff..',
  '............',
];
// Tokens per the Miss Chomp v8a design spec: body gradient (hi->b->sh), red
// flow hair (hair/hairShade/hairLight), pink bow (a/aDark), ink eyes (e).
chompo.pal = {
  b: '#f79a2b', e: '#20140a', p: '#c25e14', f: '#f0609f', a: '#f0609f', m: '#c63c77', w: '#fff',
  hi: '#ffcb63', sh: '#c25e14', hair: '#d8382f', hairShade: '#8e1d1a', hairLight: '#f58a78', aDark: '#c63c77',
  lip: '#d81f3f', lipShade: '#9e1230',
};

// --- Gary: zombie in a fast-food uniform, detachable head --------------------
const gary = humanoid([
  '...aaaaaa...',
  '..aaaaaaaa..', // little paper hat
  '...ssssss...',
  '..ssessess..',
  '..ssssssss..',
  '...sssmss...',
  '...ssssss...',
], [
  '..bbbbbbbb..',
  '.sbbbwbbbs..', // name tag (w)
  '.sbbbbbbbs..',
  '..bbbbbb....',
  '..pppppp....',
]);
gary.duck = [
  '............', '............', '............', '............',
  '............', '............', '............', '............',
  '...aaaaaa...',
  '..ssessess..',
  '...sssmss...',
  '..bbbbbbbb..',
  '.sbbbwbbbs..',
  '..bbbbbb....',
  '..ff...ff...',
  '............',
];
// `hair` is a deeper shade of the same sickly green as his skin (s), so the mop
// under the paper hat reads as hair and not as a second hat. Multi-letter keys
// are toon-only — the pixel renderer looks up single characters.
gary.pal = { a: '#e8e8f0', s: '#9ec89e', e: '#d83030', m: '#4a6a4a', b: '#c85028', p: '#3a3a48', f: '#3a3a48', w: '#fff', hair: '#4f7a4f' };
gary.headless = gary.run1.map((r, i) => (i < 7 ? '............' : r));

// --- Grumpos: huge, bald, red stripe, axe on back ----------------------------
const grumpos = humanoid([
  '...ssssss...',
  '..ssssssss..',
  '..sassssss..', // red stripe (a)
  '..sasessess.',
  '..ssssssss..',
  '..ssmmmmss..', // beard
  '...mmmmmm...',
], [
  '.wbbbbbbbb..', // axe handle (w) over shoulder
  '.wbbbbbbbbb.',
  '.wbsbbbbsb..',
  '..bbbbbbbb..',
  '..pppppppp..',
]);
grumpos.duck = [
  '............', '............', '............', '............',
  '............', '............', '............', '............',
  '...ssssss...',
  '..sasessess.',
  '..ssmmmmss..',
  '.wbbbbbbbb..',
  '.wbbbbbbbbb.',
  '..bbbbbbbb..',
  '..ff....ff..',
  '............',
];
// Bare legs and sandal-skin feet (a shade off the torso so limbs still read);
// the toon layer straps the sandals in leather on top.
grumpos.pal = { s: '#ded9d2', a: '#c92f3b', e: '#17131a', m: '#352523', b: '#ded9d2', p: '#cfc8bd', f: '#d6d0c8', w: '#765238', g: '#d69224' };

// Ray M'N is vector-drawn in play; these grids provide palette/fallback data.
const raymn = { ...gary, pal: { s: '#f0c090', a: '#f6d33c', e: '#171126', m: '#d85050', b: '#28a8a0', p: '#7048a8', f: '#f06038', w: '#f5f2e8' } };

// Dolores never runs a stage, so like Ray M'n she borrows Gary's grids and
// brings only a palette — the toon layer is the only thing that ever draws her.
// The uniform is institutional mint (b) under a cream apron (a): the two
// colours a cafeteria has always been, and neither of them is a colour any
// cabinet in the concourse uses, so she does not read as belonging to a
// machine. `hair` is the set grey the net goes over.
const dolores = { ...gary, pal: { s: '#e0a884', a: '#e4dccc', e: '#171126', m: '#8a4a52', b: '#6fa89c', p: '#3a3a48', f: '#2e2a38', w: '#fff', hair: '#b4aac0' } };

export const HERO_SPRITES = { lorenzo, gnash, fernwick, b33p, mochi, chompo, gary, raymn, grumpos, dolores };
