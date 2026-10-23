// PERIODICWAVE CACHES ARE FINITE AND NEVER EVICT (23 Oct 2026). WebKit keeps every PeriodicWave
// a context ever built (~580 KB each; work/local/_probe-webkit-node-churn.mjs), so a cache that
// drops its oldest and builds again is a leak. Each live cache quantises its key instead:
//   · phase waves (vibrato LFO starts): 16 phases a waveform
//   · hard-sync tables: the ratio to an eighth of a semitone, and past the cap the nearest
//     table of the same shape and width, never a new one
//   · JMJR-4's glottal waves: the pitch to a semitone on a live context (an offline render keeps
//     the hertz, and its sound, exactly)
import assert from 'node:assert/strict';
const { phasedWave, hardSyncTable } = await import('../src/engine/voices.js');
const { glottalWave } = await import('../src/engine/jmjr4/dsp.js');

const liveCtx = () => { const c = { made: 0, sampleRate: 48000, createPeriodicWave(re, im) { c.made++; return { re: [...re], im: [...im] }; } }; return c; };

{
  const ctx = liveCtx();
  for (let i = 0; i < 20000; i++) for (const t of ['sine', 'triangle', 'square', 'sawtooth']) phasedWave(ctx, t, Math.random() * 2 * Math.PI);
  assert.ok(ctx.made <= 4 * 16, `20 000 random phases on four waveforms build at most 64 waves (${ctx.made})`);
  const a = phasedWave(ctx, 'sine', 0.01), b = phasedWave(ctx, 'sine', 2 * Math.PI - 0.01);
  assert.equal(a, b, 'a phase a hair either side of zero is the same wave');
  console.log(`ok: phase waves: ${ctx.made} built for 80 000 asks`);
}
{
  const ctx = liveCtx();
  for (let i = 0; i < 20000; i++) hardSyncTable(ctx, 'sawtooth', 1 + Math.random() * 7, 0.5);
  assert.ok(ctx.made <= 192, `20 000 sweeping sync ratios build at most the cap (${ctx.made})`);
  const before = ctx.made;
  for (let i = 0; i < 5000; i++) hardSyncTable(ctx, 'sawtooth', 1 + Math.random() * 7, 0.5);
  assert.equal(ctx.made, before, 'and nothing more after it — the nearest table serves');
  const t = liveCtx();
  assert.equal(hardSyncTable(t, 'sawtooth', 2.37), hardSyncTable(t, 'sawtooth', 2.371), 'ratios inside an eighth of a semitone share a table');
  console.log(`ok: sync tables: ${before} built for 25 000 asks`);
}
{
  const ctx = liveCtx();
  for (let i = 0; i < 5000; i++) glottalWave(ctx, 0.6, -6, 80 + Math.random() * 400);
  assert.ok(ctx.made <= 33, `5000 spoken pitches from 80 to 480 Hz build a wave per semitone at most (${ctx.made})`);
  const off = { ...liveCtx(), startRendering() {} };
  off.createPeriodicWave = (re, im) => { off.made = (off.made || 0) + 1; return { re, im }; };
  glottalWave(off, 0.6, -6, 101); glottalWave(off, 0.6, -6, 103);
  assert.equal(off.made, 2, 'an offline render keeps its hertz: two pitches inside a semitone are two waves');
  console.log(`ok: glottal waves: ${ctx.made} built for 5000 asks live`);
}
console.log('WAVE CACHES FINITE: PASSED');
