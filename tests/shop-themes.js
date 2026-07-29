// The audition catalogue contains three original motifs with two live-engine
// arrangements apiece. It remains data-only until a pair is approved.
import {
  SHOP_THEME_CANDIDATES, SHOP_THEME_RETAIL_JAZZ_CANDIDATES,
  SHOP_THEME_ORGAN_VARIANTS, SHOP_THEME_BRIGHT_ORGAN_VARIANTS,
  SHOP_THEME_DANCE_MIX_VARIANTS, SHOP_THEME_LAYAWAY_V2_VARIANTS,
  COUNTER_DANCE_MIX_THEME, SHOP_THEME_BY_ID,
} from '../src/data/shop-themes.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

assert(SHOP_THEME_CANDIDATES.length === 3, 'three shop-theme concepts are available for audition');
assert(Object.keys(SHOP_THEME_BY_ID).length === 20,
  'the original, retail-jazz and organ audition variants all have renderer ids');
for (const candidate of SHOP_THEME_CANDIDATES) {
  for (const character of ['dolores', 'gary']) {
    const bank = candidate[character];
    assert(SHOP_THEME_BY_ID[`${candidate.id}-${character}`] === bank,
      `${candidate.name} exposes its ${character} renderer id`);
    assert(bank.bpm > 0 && bank.bass.length === 32 && bank.lead.length === 32
      && bank.chords.length === 32 && bank.sections.length === 2 && bank.order.length === 4,
    `${candidate.name} ${character} is a complete two-section live music bank`);
  }
  assert(candidate.dolores !== candidate.gary
    && candidate.dolores.leadDur < candidate.gary.leadDur
    && candidate.dolores.echoLevel < candidate.gary.echoLevel,
  `${candidate.name} keeps Dolores clipped and Gary warmer`);
}
assert(SHOP_THEME_LAYAWAY_V2_VARIANTS.length === 2,
  'After-Hours Layaway has Gary and Dolores v2 alternatives');
for (const variant of SHOP_THEME_LAYAWAY_V2_VARIANTS) {
  const bank = variant.bank;
  assert(SHOP_THEME_BY_ID[variant.id] === bank && bank.organBright
    && bank.organPercussion && bank.organEcho === false,
  `${variant.name} exposes its bright dry organ renderer bank`);
  assert(bank.organDur <= 0.68
    && bank.sections.every((section) => section.organChords.filter(Boolean).length === 12),
  `${variant.name} uses short syncopated staccato organ figures`);
  assert(bank.bassGain <= 0.087,
  `${variant.name} keeps its retro bass behind the v2 organ`);
  assert(bank.sections.length === 4
    && bank.sections.reduce((total, section) => total + section.electroFx.filter(Boolean).length, 0) === 8,
  `${variant.name} has eight sparse deterministic electronic flourishes per form`);
  assert(bank.electroFxGain >= 0.016,
  `${variant.name} brings its electronic flourishes forward in the mix`);
}
assert(SHOP_THEME_RETAIL_JAZZ_CANDIDATES.length === 3,
  'the closer retail-jazz set contains three new concepts');
for (const candidate of SHOP_THEME_RETAIL_JAZZ_CANDIDATES) {
  for (const character of ['dolores', 'gary']) {
    const bank = candidate[character];
    assert(SHOP_THEME_BY_ID[`${candidate.id}-${character}`] === bank,
      `${candidate.name} exposes its ${character} renderer id`);
    assert(bank.bpm >= 110 && bank.bpm <= 118 && bank.bass.length === 32
      && bank.lead.length === 32 && bank.chords.length === 32
      && bank.organChords.length === 32,
    `${candidate.name} ${character} is a complete organ-backed retail-jazz bank`);
  }
}
assert(SHOP_THEME_ORGAN_VARIANTS.length === 3,
  'Checkout Gary and both After-Hours arrangements have organ alternatives');
for (const variant of SHOP_THEME_ORGAN_VARIANTS) {
  assert(SHOP_THEME_BY_ID[variant.id] === variant.bank,
    `${variant.name} exposes its renderer id`);
  assert(variant.bank.organChords.length === 32 && variant.bank.chords.length === 32,
  `${variant.name} adds a separate organ lane without replacing the keyboard chords`);
  assert(variant.bank.sections.every((section) => section.organChords?.length === 32),
    `${variant.name} follows the harmony through both song sections`);
}
const checkoutOrgan = SHOP_THEME_BY_ID['checkout-promenade-gary-organ'];
assert(checkoutOrgan.organChords.filter(Boolean).length === 12
  && checkoutOrgan.organDur < checkoutOrgan.chordDur
  && checkoutOrgan.organBright && checkoutOrgan.organPercussion
  && checkoutOrgan.organEcho === false,
'Checkout Gary uses twelve short, bright, dry, percussive organ stabs');
assert(SHOP_THEME_BRIGHT_ORGAN_VARIANTS.length === 2,
  'Checkout has Gary and Dolores bright-organ alternatives');
for (const variant of SHOP_THEME_BRIGHT_ORGAN_VARIANTS) {
  const bank = variant.bank;
  assert(SHOP_THEME_BY_ID[variant.id] === bank && bank.organBright && bank.organPercussion,
    `${variant.name} exposes its bright drawbar renderer bank`);
  assert(bank.bass80s && bank.bassRepeat === 0
    && bank.bassGain >= 0.112 && bank.bassDur <= 1.08,
  `${variant.name} uses an audible short 1980s synth bass without the bounce`);
  assert(bank.organGliss.filter(Boolean).length === 0
    && bank.sections.reduce((total, section) => total + section.organGliss.filter(Boolean).length, 0) === 2
    && bank.twinkle.filter(Boolean).length === 3
    && bank.twinkleDur < 1,
  `${variant.name} glisses into the halfway lift and once at the end of the eight-bar form`);
}
const danceMix = SHOP_THEME_DANCE_MIX_VARIANTS[0];
assert(SHOP_THEME_DANCE_MIX_VARIANTS.length === 1
  && SHOP_THEME_BY_ID[danceMix.id] === danceMix.bank,
  'Checkout Gary exposes its bright-organ Dance Mix renderer bank');
// They used to be ONE object: `COUNTER_DANCE_MIX_THEME` was a pointer straight at
// the audition's bank. That meant two track ids sharing one bank, and since a mix is
// looked up by bank identity, only one of their two saved mixes could ever apply —
// the audition's was dead weight in the file. One file per song ended the sharing:
// same music, two songs, each with its own mix.
assert(COUNTER_DANCE_MIX_THEME !== danceMix.bank,
  'the shop theme and the audition it came from are separate songs now');
assert(JSON.stringify(COUNTER_DANCE_MIX_THEME) === JSON.stringify(danceMix.bank),
  'and until one of them is edited they still play exactly the same music');
assert(danceMix.bank.musicTrim === 2.22,
  'the live Checkout Promenade mix is raised to the shared soundtrack loudness');
assert(danceMix.bank.order.length === 23
  && danceMix.bank.order.slice(0, 3).join(',') === '0,1,2',
  'the Dance Mix drops the drums-only opening and adds layers every two bars');
assert(danceMix.bank.bassFilteredSaw
  && danceMix.bank.bassFilterOpen === 1100
  && danceMix.bank.bassFilterClose === 310
  && danceMix.bank.bassGain === 0.1115775,
  'the Dance Mix uses an audible low-pass-filtered sawtooth bass');
assert(danceMix.bank.bassEcho === false
  && danceMix.bank.bass[2] == null && danceMix.bank.bass[3] != null
  && danceMix.bank.sections.slice(3, 7).every((section) =>
    section.bass.some((note, step) => note != null && step % 2 === 1)),
  'the Dance Mix keeps its bass dry and pushes alternating notes onto syncopated sixteenths');
assert(danceMix.bank.drumGain === 0.68 && danceMix.bank.clapGain === 0.323,
  'the Dance Mix lowers its drum mix and pulls claps down further');
assert(danceMix.bank.leadBright && danceMix.bank.leadBrightGain === 0.16,
  'the Dance Mix gives its main melody a restrained dry octave highlight');
assert(danceMix.bank.leadGain === 0.0693,
  'the Dance Mix brings its main melody forward without raising the harmony');
assert(danceMix.bank.sections[0].organChords.filter(Boolean).length > 0
  && danceMix.bank.sections[0].bass.filter(Boolean).length === 0
  && danceMix.bank.sections[1].bass.filter(Boolean).length > 0
  && danceMix.bank.sections[2].chords.filter(Boolean).length > 0
  && danceMix.bank.sections[2].clap.filter(Boolean).length === 4,
  'the Dance Mix builds from organ to bass, then synth and claps');
assert(danceMix.bank.sections[2].organSwoop.filter(Boolean).length === 1
  && danceMix.bank.sections[8].organSwoop.filter(Boolean).length === 1,
  'smooth note-to-note organ swoops carry both Dance Mix buildups into the full form');
assert(danceMix.bank.sections.slice(7, 9).every((section) =>
  section.bass.filter(Boolean).length > 0
    && section.organChords.filter(Boolean).length > 0
    && section.kick.filter(Boolean).length === 0
    && section.hats.filter(Boolean).length > 0
    && section.snare.filter(Boolean).length === 0
    && section.clap.filter(Boolean).length > 0
    && section.rim.filter(Boolean).length === 0),
  'the breakdown keeps bass, organ, light hi-hats and quiet claps without rim or drum kit');
assert(danceMix.bank.order.slice(3, 11).join(',') === '3,4,5,6,3,4,5,6'
  && danceMix.bank.order.slice(11, 15).join(',') === '7,7,8,8'
  && danceMix.bank.order.slice(15).join(',') === '3,4,5,6,3,4,5,6',
  'two full forms surround the eight-bar Dance Mix breakdown');

console.log(failed ? 'SHOP THEMES: FAILED' : 'SHOP THEMES: PASSED');
process.exit(failed ? 1 : 0);
