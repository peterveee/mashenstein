// AN OFFLINE RENDER MUST COVER THE WHOLE SONG.
//
// The offline renderer walks `scheduleStep` itself, so it needs to know how many CALLS
// a song's sixteenths amount to — one per sixteenth normally, two when the transport is
// on the half step. It used to ask the BANK: `Audio.bank?.resolution === 32 ? 2 : 1`.
//
// The bank is only one of the three things that promote the transport. A track-level or
// bar-level 1/32 arpeggiator promotes it just as hard, on a bank that still says sixteen
// — `refreshTransportResolution` is where all three are weighed. On exactly those songs
// the walk asked for half the calls the transport needed and stopped at the halfway bar,
// and because the buffer's LENGTH is worked out separately, the render came back the
// right size with its back half silent. Nothing said so.
//
// Found by narrowing a song off `resolution: 32` and rendering it either side of the
// change: the two differed by 0.83 full scale at exactly the 50% mark. The song had a
// 1/32 arp on one bar, so dropping the flag moved it from "bank says 32" to "only the arp
// says 32" — the broken case, which had been broken for every song in that state all
// along.
//
// So: same song, once with a 1/32 arp and once without. The arp changes what the second
// half SOUNDS like; it must not decide whether there is one.
import { openRenderer } from '../tools/lib/render-bank-browser.js';
import { seq } from '../src/engine/notes.js';

let failed = false;
const assert = (cond, msg) => {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
};

// Four bars of steady lead — every bar sounds, so any silent stretch is the walk
// stopping rather than the music resting. 16 slots a bar: a legacy bank, deliberately.
const bar = () => seq('C4 . E4 . G4 . E4 . C5 . G4 . E4 . C4 .');
const bank = {
  bpm: 120,
  lead: [...bar(), ...bar()],
  sections: [{ lead: [...bar(), ...bar()] }],
  order: [0, 0],
};
const arpMix = {
  lanes: {
    lead: {
      noteFx: {
        arp: { enabled: true, direction: 'up', rate: 0.5, octaves: 2, gate: 80, retrigger: 'chord' },
      },
    },
  },
};

const rms = (out, from, to) => {
  let sum = 0;
  for (let i = from; i < to; i++) sum += out[i] * out[i];
  return Math.sqrt(sum / Math.max(1, to - from));
};

const renderer = await openRenderer();
try {
  for (const [what, mix] of [['no arp', null], ['a 1/32 arp on the lead', arpMix]]) {
    const out = await renderer.render(bank, { mix, trackId: 'render-length-probe', repeat: 1, tail: 0.25 });
    const n = out.outL.length;
    const first = rms(out.outL, 0, Math.floor(n / 4));
    const last = rms(out.outL, Math.floor(n * 0.6), Math.floor(n * 0.85));
    assert(first > 1e-3, `${what}: the song starts`);
    assert(last > first / 8,
      `${what}: and is still playing three-quarters of the way through`
      + ` (${last.toExponential(2)} against ${first.toExponential(2)} at the top)`);
    if (mix) {
      assert(out.transportResolution === 32,
        'and the arp did promote the transport — otherwise this proves nothing');
    }
  }
} finally {
  await renderer.close?.();
}

console.log(failed ? 'RENDER LENGTH: FAILED' : 'RENDER LENGTH: PASSED');
process.exit(failed ? 1 : 0);
