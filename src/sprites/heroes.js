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

// --- Gnash: cobalt quills, red hi-tops, smirk --------------------------------
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
gnash.pal = { h: '#2050d8', s: '#f2c9a0', e: '#1a1028', m: '#a03020', b: '#f2c9a0', p: '#2050d8', f: '#d83030', w: '#fff' };

// --- Fernwick: green tunic, floppy cap, blond bowl cut, tiny shield ---------
const fernwick = humanoid([
  '....hhhh....',
  '...hhhhhh...',
  '..hhhhhhhh..',
  '...aaaaaa...', // blond hair
  '..asessesa..',
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
  '....hhhh....',
  '..aaaaaaaa..',
  '..asessesa..',
  '..wbbbbbb...',
  '.wwbbbbbbb..',
  '..bbbbbbb...',
  '..ff...ff...',
  '............',
];
fernwick.pal = { h: '#2e8c3c', a: '#e8c860', s: '#f2c9a0', e: '#1a1028', b: '#2e8c3c', p: '#8c6432', f: '#5a3212', w: '#b0793a' };

// --- B-33P: cyan dome, arm cannon, dot eyes ----------------------------------
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
b33p.pal = { h: '#30b8d8', s: '#f2c9a0', e: '#1a1028', b: '#2078c8', p: '#185890', f: '#30b8d8', w: '#e8f8ff', a: '#f6d33c' };

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
mochi.pal = { b: '#f890b8', e: '#1a1028', m: '#d84860', a: '#f8b8d0', f: '#d83030', w: '#fff' };

// --- Chompo: yellow wedge-mouth disc WITH LEGS -------------------------------
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
chompo.pal = { b: '#f6d33c', e: '#1a1028', p: '#c8a020', f: '#e07820', w: '#fff' };

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
gary.pal = { a: '#e8e8f0', s: '#9ec89e', e: '#d83030', m: '#4a6a4a', b: '#c85028', p: '#3a3a48', f: '#3a3a48', w: '#fff' };
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
grumpos.pal = { s: '#e8b890', a: '#c83030', e: '#1a1028', m: '#7a5a40', b: '#b89878', p: '#6a4a38', f: '#4a3228', w: '#8a6a4a' };

export const HERO_SPRITES = { lorenzo, gnash, fernwick, b33p, mochi, chompo, gary, grumpos };
