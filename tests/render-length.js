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
    assert(out.scheduledCalls === out.expectedScheduleCalls,
      `${what}: the render walk scheduled every transport call`
      + ` (${out.scheduledCalls}/${out.expectedScheduleCalls})`);
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

  // An explicit desk arrangement can be longer than the composition it edits. The
  // render must size its walk and buffer from that arranged bar plan, or the last bars
  // are never scheduled and a per-bar probe reports them as silence.
  const arrangedBank = {
    bpm: 120,
    lead: [...bar(), ...bar()],
    sections: [{ lead: [...bar(), ...bar()] }],
    order: [0],
  };
  const arranged = {
    bpm: 120,
    order: Array.from({ length: 8 }, (_, i) => ({ s: 0, bars: 1, from: i % 2 })),
  };
  const arrangedOut = await renderer.render(arrangedBank, {
    arrangement: arranged, mix: null, trackId: 'arranged-render-length-probe', tail: 0.25,
  });
  assert(arrangedOut.scheduledCalls === arrangedOut.expectedScheduleCalls,
    `the arranged render walks every transport call (${arrangedOut.scheduledCalls}/${arrangedOut.expectedScheduleCalls})`);
  assert(arrangedOut.steps === 8 * 16,
    `an explicit arrangement sizes the walk from all eight bars (${arrangedOut.steps} steps)`);
  assert(arrangedOut.seconds > 16 && arrangedOut.seconds < 16.5,
    `the buffer covers the arranged form, not the two-bar composition (${arrangedOut.seconds.toFixed(2)}s)`);
  const arrangedLast = rms(arrangedOut.outL,
    Math.floor(arrangedOut.outL.length * 0.72), Math.floor(arrangedOut.outL.length * 0.92));
  assert(arrangedLast > 1e-3,
    `the arranged form is still audible near its end (${arrangedLast.toExponential(2)})`);
} finally {
  await renderer.close?.();
}

console.log(failed ? 'RENDER LENGTH: FAILED' : 'RENDER LENGTH: PASSED');
process.exit(failed ? 1 : 0);
