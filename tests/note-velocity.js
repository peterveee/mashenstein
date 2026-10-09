/**
 * PER-NOTE VELOCITY (8 Oct 2026) — `${lane}Velocity`, read by the scheduler and heard by the
 * rack. Every claim compares two renders that differ in the velocity alone:
 *
 *   · no array and an array of 1s are the same samples — full strength is the note as it was;
 *   · a drum struck at 0.25 is a quarter of the level, and the same sound;
 *   · an MRDR-3 preset with no `velocity` block hears it as level, like everything else;
 *   · Acid 303, whose `velocity` block cuts the filter envelope, comes out darker as well
 *     as quieter — its accent is the full-strength note;
 *   · a slide into a softer note on the same lane still glides (legato hands the note over).
 *
 * And the parts that need no browser: the key, the reader's clamping, and that `Vel` — the
 * unread arrays in speed, crypt and their remixes — is not a velocity.
 *
 *   node tests/note-velocity.js
 */
import { n } from '../src/engine/notes.js';
import { velocityKey, isVelocityKey, stepVelocity } from '../src/engine/lanes.js';
import { openRenderer } from '../tools/lib/render-bank-browser.js';

let failed = 0;
const assert = (cond, msg) => {
  if (!cond) { failed++; console.log(`FAIL: ${msg}`); } else console.log(`ok: ${msg}`);
};

// ---- the key and the reader --------------------------------------------------
assert(velocityKey('bass') === 'bassVelocity' && isVelocityKey('kickVelocity') && !isVelocityKey('kickVel')
  && !isVelocityKey('bassLen'), 'the key is `${lane}Velocity`; the old unread `Vel` arrays are not velocities');
{
  const lane = Array(32).fill(null);
  const vel = Array(32).fill(null);
  Object.assign(vel, { 0: 0.5, 1: 2, 2: -1, 3: 'x', 4: 0 });
  const bank = { bpm: 120, bass: lane, bassVelocity: vel };
  const at = (s) => stepVelocity(bank, 'bass', s);
  assert(at(0) === 0.5 && at(1) === 1 && at(2) === null && at(3) === null && at(4) === 0 && at(5) === null
    && stepVelocity({ bpm: 120, bass: lane }, 'bass', 0) === null,
  'a velocity is read as written, clamped to 1; nothing, a negative or a non-number is null — full strength');
}

// ---- rendered ------------------------------------------------------------------
const steps = (hits) => { const a = Array(32).fill(false); for (const i of hits) a[i] = true; return a; };
const notes = (map) => { const a = Array(32).fill(null); for (const [i, f] of Object.entries(map)) a[i] = f; return a; };
const fill = (idx, v) => { const a = Array(32).fill(null); for (const i of idx) a[i] = v; return a; };
const bankOf = (lanes) => ({ bpm: 120, musicTrim: 0.93, ...Object.fromEntries(Object.keys(lanes).filter((k) => !/Len$|Velocity$/.test(k))
  .map((k) => [k, typeof lanes[k][0] === 'boolean' ? Array(32).fill(false) : Array(32).fill(null)])), sections: [lanes], order: [0] });

const rms = (x) => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / x.length);
/** First difference over the signal: how much top end there is, relative to its level. */
const bright = (x) => { let d = 0; for (let i = 1; i < x.length; i++) d += (x[i] - x[i - 1]) ** 2; return Math.sqrt(d / x.length) / (rms(x) || 1); };
const peakOf = (x) => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const maxDiff = (a, b) => { let m = 0; for (let i = 0; i < Math.min(a.length, b.length); i++) m = Math.max(m, Math.abs(a[i] - b[i])); return m; };

const r = await openRenderer();
const render = async (lanes, voice) => (await r.render(bankOf(lanes), {
  mix: { voice, lanes: Object.fromEntries(Object.keys(voice).map((k) => [k.replace(/Voice$/, ''), { send: { delay: 0, reverb: 0 } }])) },
  trackId: '__velocity-test__', arrangement: { order: [0] }, songLoop: false, tail: 1,
})).outL;
try {
  const KICK = { kickVoice: 'ds909Kick' };
  const hits = [0, 8, 16, 24];
  const plain = await render({ kick: steps(hits) }, KICK);
  const full = await render({ kick: steps(hits), kickVelocity: fill(hits, 1) }, KICK);
  const soft = await render({ kick: steps(hits), kickVelocity: fill(hits, 0.25) }, KICK);
  assert(maxDiff(plain, full) < 1e-6, `full strength is the note as it was (max diff ${maxDiff(plain, full).toExponential(1)})`);
  const ratio = rms(soft) / rms(plain);
  const scaled = soft.map((x) => x / 0.25);
  assert(Math.abs(ratio - 0.25) < 0.02 && maxDiff(scaled, plain) < 0.01 * peakOf(plain),
    `a drum struck at 0.25 is a quarter of the level and the same sound (ratio ${ratio.toFixed(3)})`);

  const A2 = n('A2');
  const line = notes({ 0: A2, 8: A2, 16: A2, 24: A2 });
  const lens = fill([0, 8, 16, 24], 4);
  const MONO = { bassVoice: 'bestClassicMono' };
  const monoFull = await render({ bass: line, bassLen: lens }, MONO);
  const monoSoft = await render({ bass: line, bassLen: lens, bassVelocity: fill([0, 8, 16, 24], 0.5) }, MONO);
  const monoRatio = rms(monoSoft) / rms(monoFull);
  assert(Math.abs(monoRatio - 0.5) < 0.03 && Math.abs(bright(monoSoft) - bright(monoFull)) < 0.02 * bright(monoFull),
    `an MRDR-3 preset with no velocity block hears velocity as level only (ratio ${monoRatio.toFixed(3)})`);

  const ACID = { bassVoice: 'mrdrAcid303' };
  const acidFull = await render({ bass: line, bassLen: lens }, ACID);
  const acidSoft = await render({ bass: line, bassLen: lens, bassVelocity: fill([0, 8, 16, 24], 0.5) }, ACID);
  assert(rms(acidSoft) < rms(acidFull) * 0.95 && bright(acidSoft) < bright(acidFull) * 0.97,
    `Acid 303 struck softer is quieter AND darker — the accent is the full note (level ${(rms(acidSoft) / rms(acidFull)).toFixed(2)}, `
    + `brightness ${(bright(acidSoft) / bright(acidFull)).toFixed(2)})`);

  // A slide into a softer note on the same lane: the gate runs past the next onset, so the
  // legato preset glides. Compared with the same two notes struck apart, the slide has no
  // second attack: the level just after the second onset does not dip and rise again.
  const pair = notes({ 0: A2, 4: n('C3') });
  const slid = await render({ bass: pair, bassLen: fill([0], 4.3).map((v, i) => (i === 4 ? 2 : v)), bassVelocity: fill([4], 0.5) }, ACID);
  const struck = await render({ bass: pair, bassLen: fill([0], 3.5).map((v, i) => (i === 4 ? 2 : v)), bassVelocity: fill([4], 0.5) }, ACID);
  const stepS = 60 / 120 / 4; const at = (x, t0, t1) => rms(x.slice(Math.floor(t0 * 44100), Math.floor(t1 * 44100)));
  const gapSlid = at(slid, 4 * stepS - 0.01, 4 * stepS + 0.01); const gapStruck = at(struck, 4 * stepS - 0.01, 4 * stepS + 0.01);
  assert(gapSlid > gapStruck * 1.5, `a slide into a softer note glides without a gap (level across the onset ${gapSlid.toFixed(4)} vs ${gapStruck.toFixed(4)} struck)`);
} finally {
  await r.close();
}

if (failed) { console.log(`\nNOTE VELOCITY: ${failed} FAILED`); process.exit(1); }
console.log('\nNOTE VELOCITY: PASSED');
