/*
 * The scheduler survives an arpeggiated chord lane — rendered through the real engine.
 *
 * Split out of tests/note-fx.js because it is the only part of it that opens a browser,
 * and note-fx.js is otherwise a browserless suite worth running on every push. A whole
 * suite marked "browser" is a suite the fast gate skips, so the two hundred processor
 * assertions next door would have gone with it. See browserSuites in tests/run-all.js.
 */
let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// tests/note-fx.js is the processor in isolation. This is the shape that took the desk
// down: an arpeggiator hands `at()` ONE event per tick, `at()` collapses a one-event
// plan to a bare frequency, and the hand-written chord bodies were written for arrays.
// With no voice preset on the lane — the default — the rack declines the note and the
// fallback body is exactly what runs. Rendered through the real engine because no
// processor-level assertion can see which body the frequency lands in; a regression
// here throws inside scheduleStep and the render rejects.
{
  const { openRenderer } = await import('../tools/lib/render-bank-browser.js');
  const rest = new Array(31).fill(null);
  const bank = {
    bpm: 120,
    sections: [{ chords: [[220, 277, 330], ...rest], organChords: [[220, 330], ...rest] }],
    order: [{
      s: 0,
      noteFx: {
        chords: { mode: 'on', arp: { enabled: true, rate: 0.5, direction: 'up',
          retrigger: 'chord', gate: 80, octaves: 1 } },
        organChords: { mode: 'on', arp: { enabled: true, rate: 0.5, direction: 'up',
          retrigger: 'chord', gate: 80, octaves: 1 } },
      },
    }],
  };
  const renderer = await openRenderer();
  try {
    const r = await renderer.render(bank, { repeat: 1, mix: null, trackId: null });
    assert(r.peak > 0.001,
      'an arpeggiated chord lane with no voice preset renders sound through the'
      + ` hand-written bodies (peak ${r.peak.toFixed(4)})`);
  } catch (err) {
    assert(false, `an arpeggiated chord lane must not kill the scheduler: ${err.message}`);
  } finally {
    await renderer.close();
  }
}

console.log(failed ? '\nNOTE FX RENDER: FAILED' : '\nNOTE FX RENDER: PASSED');
process.exit(failed ? 1 : 0);
