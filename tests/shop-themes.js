// The shop counter's theme — the one song the shop plays. The candidates it was
// chosen from were archived to archive/shop-auditions/ on 2 Oct 2026, with the
// assertions that described them.
import { COUNTER_DANCE_MIX_THEME } from '../src/data/shop-themes.js';
import { SONGS } from '../src/data/songs/index.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const bank = COUNTER_DANCE_MIX_THEME;
assert(bank === SONGS.shop.bank, 'the counter plays the shop song');
assert(bank.musicTrim === 2.22,
  'the live Checkout Promenade mix is raised to the shared soundtrack loudness');
assert(bank.order.length === 23
  && bank.order.slice(0, 3).join(',') === '0,1,2',
  'the Dance Mix drops the drums-only opening and adds layers every two bars');
assert(bank.bassFilteredSaw
  && bank.bassFilterOpen === 1100
  && bank.bassFilterClose === 310
  && bank.bassGain === 0.1115775,
  'the Dance Mix uses an audible low-pass-filtered sawtooth bass');
assert(bank.bassEcho === false
  && bank.bass[2] == null && bank.bass[3] != null
  && bank.sections.slice(3, 7).every((section) =>
    section.bass.some((note, step) => note != null && step % 2 === 1)),
  'the Dance Mix keeps its bass dry and pushes alternating notes onto syncopated sixteenths');
assert(bank.drumGain === 0.68 && bank.clapGain === 0.323,
  'the Dance Mix lowers its drum mix and pulls claps down further');
assert(bank.leadBright && bank.leadBrightGain === 0.16,
  'the Dance Mix gives its main melody a restrained dry octave highlight');
assert(bank.leadGain === 0.0693,
  'the Dance Mix brings its main melody forward without raising the harmony');
assert(bank.sections[0].organChords.filter(Boolean).length > 0
  && bank.sections[0].bass.filter(Boolean).length === 0
  && bank.sections[1].bass.filter(Boolean).length > 0
  && bank.sections[2].chords.filter(Boolean).length > 0
  && bank.sections[2].clap.filter(Boolean).length === 4,
  'the Dance Mix builds from organ to bass, then synth and claps');
assert(bank.sections[2].organSwoop.filter(Boolean).length === 1
  && bank.sections[8].organSwoop.filter(Boolean).length === 1,
  'smooth note-to-note organ swoops carry both Dance Mix buildups into the full form');
assert(bank.sections.slice(7, 9).every((section) =>
  section.bass.filter(Boolean).length > 0
    && section.organChords.filter(Boolean).length > 0
    && section.kick.filter(Boolean).length === 0
    && section.hats.filter(Boolean).length > 0
    && section.snare.filter(Boolean).length === 0
    && section.clap.filter(Boolean).length > 0
    && section.rim.filter(Boolean).length === 0),
  'the breakdown keeps bass, organ, light hi-hats and quiet claps without rim or drum kit');
assert(bank.order.slice(3, 11).join(',') === '3,4,5,6,3,4,5,6'
  && bank.order.slice(11, 15).join(',') === '7,7,8,8'
  && bank.order.slice(15).join(',') === '3,4,5,6,3,4,5,6',
  'two full forms surround the eight-bar Dance Mix breakdown');

console.log(failed ? 'SHOP THEMES: FAILED' : 'SHOP THEMES: PASSED');
process.exit(failed ? 1 : 0);
