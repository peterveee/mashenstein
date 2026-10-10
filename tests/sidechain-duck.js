// SIDECHAIN DUCK — MEASURED OFF THE SAMPLES.
//
// A Sidechain Duck (makeSidechainDuck in src/engine/effects.js) dips its track every time
// the TRIGGER track has a note, from the sequencer's notes rather than the trigger's audio
// (the hook in Audio.scheduleStep, through mixer.duckTriggers/keyHit). Rendered in Chromium
// through an OfflineAudioContext, like tests/group-buses.js, and read as a GAIN: each claim
// compares a ducked render with the same song unducked, least-squares over a millisecond.
//
//   1. A WIRE when it hears nothing: keyed to a track the song does not have, or at DEPTH
//      0, it is the same samples as no duck at all.
//   2. THE SHAPE: down over ATTACK, ending on the hit; back up over RELEASE in a straight
//      line; exactly unity between hits.
//   3. A MUTED TRIGGER STILL DUCKS, with the desk's silent-lane skip on (Peter, 10 Oct
//      2026) — and the kick it ducks for is not heard.
//   4. A BAR THE ARRANGEMENT TAKES THE KICK OUT OF does not duck.
//   5. A FROZEN TRIGGER ducks from its notes: the same samples as the live one.
//   6. SWING: a hit on a swung sixteenth ducks late with it.
//   7. HITS CLOSER THAN THE RELEASE: the next one starts from where the line had got to.
//   8. ON A GROUP BUS it ducks every member.
//   9. IN A SPOT FX SECTION it ducks inside the section and nowhere else.
//  10. STEMS still sum to the mix: a stem render keeps the trigger in, muted.
//  11. ON THE GRID (TRIGGER Every 1/4 and the rest): it pumps on every beat whatever the kick
//      plays, and on a kick on every beat it is the same samples as keyed to the kick.
//  12. THE RHYTHMIC GATE'S LONG RAMPS ARE STRAIGHT LINES TOO. Until 10 Oct 2026 a ramp that
//      crossed a sixteenth edge held still until the edge and then jumped (the gate's anchor
//      at each edge was a set, not a ramp): the Lab's pump sat at 0.35 for a sixteenth and
//      leapt to 0.84. Now its swell is the duck's line on Every 1/4, and a DECAY across an
//      edge closes in a straight line rather than staying open and dropping.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openRenderer } from '../tools/lib/render-bank-browser.js';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = `
import * as Tone from 'tone';
import { Audio } from ${JSON.stringify(join(ROOT, 'src/engine/audio.js'))};
window.__Audio = Audio;
window.__Tone = Tone;
`;

let failed = false;
const assert = (cond, msg) => {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
};

// 120 BPM: a sixteenth is 0.125 s, a beat 0.5 s and a bar 2 s.
const SPB = 0.125;
const SR = 44100;

const { chromium } = require('playwright');
const esbuild = require('esbuild');
const built = await esbuild.build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
  bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
});
const html = '<!doctype html><meta charset="utf-8">'
  + `<script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}<\/script>`;
const browser = await chromium.launch({ headless: true, args: ['--mute-audio'] });
const errors = [];

async function freshPage(label) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  await page.route('**/*', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: html }));
  await page.goto('https://mashenstein.render/', { waitUntil: 'load' });
  return page;
}

/** One render, channel 0 back as a plain array. `skip` is the desk's silent-lane skip;
 * `frozenKick` freezes the kick as silent PCM, so only its notes are left to duck from. */
async function render(label, { bank, mix = null, arrangement, steps = 32, seconds = 4.5, skip = true, frozenKick = false }) {
  const page = await freshPage(label);
  const out = await page.evaluate(async (c) => {
    const Audio = window.__Audio;
    const ctx = new OfflineAudioContext(2, 44100 * c.seconds, 44100);
    Audio.setCaptureEnabled(false);
    Audio.setNoiseSeed(1);
    Audio.ensure(ctx);
    if (Audio.mixer) await Audio.mixer.ready;
    Audio.setSilentLaneSkip(c.skip);
    Audio.setBank(c.bank, c.mix, c.arrangement ?? undefined);
    if (c.frozenKick) Audio.setFrozenLane('kick', { left: new Float32Array(44100 * c.seconds) });
    Audio.nextTime = 0;
    Audio.songTrim.gain.cancelScheduledValues(0);
    Audio.songTrim.gain.setValueAtTime(Audio.musicTrim, 0);
    for (let i = 0; i < c.steps; i++) Audio.scheduleStep();
    const buf = await ctx.startRendering();
    return Array.from(buf.getChannelData(0));
  }, { bank, mix, arrangement, steps, seconds, skip, frozenKick });
  await page.close();
  return out;
}

const maxDiff = (a, b, from = 0, to = Infinity) => {
  let m = 0;
  for (let i = Math.floor(from * SR); i < Math.min(a.length, Math.floor(to * SR)); i++) {
    m = Math.max(m, Math.abs(a[i] - b[i]));
  }
  return m;
};
/** The gain that takes `plain` to `ducked` around `t`, least-squares over ±half a millisecond. */
const gainAt = (ducked, plain, t, half = 0.0005) => {
  let num = 0, den = 0;
  for (let i = Math.floor((t - half) * SR); i <= Math.ceil((t + half) * SR); i++) {
    num += ducked[i] * plain[i]; den += plain[i] * plain[i];
  }
  return den > 0 ? num / den : NaN;
};
const near = (x, want, tol = 0.03) => Math.abs(x - want) < tol;
const fmt = (xs) => xs.map((x) => x.toFixed(3)).join(', ');

const rest = () => new Array(32).fill(null);
const off = () => new Array(32).fill(false);
// A bass held through each bar, so every millisecond has a level to compare.
const held = (hz) => {
  const notes = rest(); const lens = rest();
  for (const s of [0, 16]) { notes[s] = hz; lens[s] = 16; }
  return [notes, lens];
};
const [bassN, bassL] = held(220);
const [leadN, leadL] = held(660);
const kickOn = (steps) => { const k = off(); for (const s of steps) k[s] = true; return k; };
const FOUR = [0, 4, 8, 12, 16, 20, 24, 28];
const bank = (kick, extra = {}) => ({ bpm: 120, bass: bassN, bassLen: bassL, kick, order: [{ s: 0, bars: 2 }], ...extra });
const DUCK = { id: 'duck', params: { trigger: 'kick', depth: 0.65, attack: 0.01, hold: 0, release: 0.16 } };
const FLOOR = 1 - 0.65;
const kickMuted = { kick: { mute: true } };
const ducked = (lanes = {}) => ({ lanes: { ...kickMuted, bass: { effects: [DUCK] }, ...lanes } });

try {
  const four = bank(kickOn(FOUR));
  const plain = await render('plain', { bank: four, mix: { lanes: kickMuted } });

  // ---- 1. a wire when it hears nothing --------------------------------------------------
  {
    const deaf = await render('deaf', { bank: four, mix: { lanes: { ...kickMuted,
      bass: { effects: [{ id: 'duck', params: { ...DUCK.params, trigger: 'snare' } }] } } } });
    assert(maxDiff(plain, deaf) === 0,
      `keyed to a track the song does not have, it is the same samples (max diff ${maxDiff(plain, deaf)})`);
    const flat = await render('depth0', { bank: four, mix: { lanes: { ...kickMuted,
      bass: { effects: [{ id: 'duck', params: { ...DUCK.params, depth: 0 } }] } } } });
    assert(maxDiff(plain, flat) === 0, `at DEPTH 0 it is the same samples (max diff ${maxDiff(plain, flat)})`);
  }

  // ---- 2. the shape; 3. a muted trigger still ducks ----------------------------------------
  const duck = await render('duck', { bank: four, mix: ducked() });
  {
    const hits = [0.5, 1, 1.5, 2, 2.5, 3, 3.5];
    const onHit = hits.map((t) => gainAt(duck, plain, t + 0.0006));
    const midAttack = hits.map((t) => gainAt(duck, plain, t - 0.005));
    const midRelease = hits.map((t) => gainAt(duck, plain, t + 0.08));
    assert(onHit.every((g) => near(g, FLOOR)),
      `every kick lands with the bass all the way down, ${FLOOR.toFixed(2)} (${fmt(onHit)})`);
    assert(midAttack.every((g) => near(g, 1 - 0.65 / 2)),
      `the way down starts ATTACK before the kick: halfway there 5 ms before it (${fmt(midAttack)})`);
    assert(midRelease.every((g) => near(g, FLOOR + 0.65 / 2)),
      `and comes back up in a straight line: halfway 80 ms after it (${fmt(midRelease)})`);
    const between = Math.max(...hits.map((t) => maxDiff(duck, plain, t + 0.161, t + 0.5 - 0.011)));
    assert(between < 1e-6, `between hits it is exactly unity (worst ${between.toExponential(2)})`);
    // Every claim above was against a kick muted on the desk, with its silent-lane skip on.
    // That it is not heard: the same samples as a song whose kick never plays.
    const noKick = await render('nokick', { bank: bank(off()), mix: null });
    assert(maxDiff(plain, noKick) < 1e-6,
      `a kick muted on the desk still ducks the bass, and is not heard (max diff to no kick ${maxDiff(plain, noKick).toExponential(2)})`);
  }

  // ---- 4. a bar the arrangement takes the kick out of ------------------------------------
  {
    const arranged = bank(kickOn(FOUR), { order: [{ s: 0, bars: 1 }, { s: 0, bars: 1, from: 1, off: ['kick'] }] });
    const p = await render('arr:plain', { bank: arranged, mix: { lanes: kickMuted } });
    const d = await render('arr:duck', { bank: arranged, mix: ducked() });
    assert(near(gainAt(d, p, 1.5006), FLOOR), 'in the bar with the kick it ducks');
    const bar2 = maxDiff(d, p, 2.0, 4.0);
    assert(bar2 < 1e-6, `in the bar the arrangement takes the kick out of, it does not (max diff ${bar2.toExponential(2)})`);
  }

  // ---- 5. a frozen trigger ---------------------------------------------------------------
  {
    const frozen = await render('frozen', { bank: four, mix: { lanes: { bass: { effects: [DUCK] } } }, frozenKick: true });
    const d = maxDiff(duck, frozen);
    assert(d < 1e-6, `a frozen kick (silent PCM, not muted) ducks from its notes exactly as the live one (max diff ${d.toExponential(2)})`);
  }

  // ---- 6. swing ------------------------------------------------------------------------------
  {
    // A kick on the fourth sixteenth — an off one — at a swing of 66: late by
    // 0.125 × 16/50 = 40 ms, at 0.415 s rather than 0.375 s.
    const swung = bank(kickOn([3]), { swing: 66 });
    const p = await render('swing:plain', { bank: swung, mix: { lanes: kickMuted } });
    const d = await render('swing:duck', { bank: swung, mix: ducked() });
    const late = gainAt(d, p, 0.4156);
    const grid = gainAt(d, p, 0.375);
    assert(near(late, FLOOR) && near(grid, 1, 1e-4),
      `a swung kick ducks late with the swing: ${late.toFixed(3)} at 0.415 s, ${grid.toFixed(4)} on the straight grid`);
  }

  // ---- 7. hits closer than the release -------------------------------------------------
  {
    const roll = bank(kickOn([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]));
    const p = await render('roll:plain', { bank: roll, mix: { lanes: kickMuted } });
    const d = await render('roll:duck', { bank: roll, mix: ducked() });
    // 115 ms into a 160 ms release, the line is at 0.35 + 0.65 × 115/160 = 0.817, and the
    // next hit's ATTACK starts there: halfway down it is 0.584.
    const reached = FLOOR + 0.65 * (0.115 / 0.16);
    const atStart = [4, 8, 12].map((k) => gainAt(d, p, k * SPB - 0.0102, 0.0002));
    const halfway = [4, 8, 12].map((k) => gainAt(d, p, k * SPB - 0.005));
    const onHit = [4, 8, 12].map((k) => gainAt(d, p, k * SPB + 0.0006));
    assert(atStart.every((g) => near(g, reached)) && halfway.every((g) => near(g, (reached + FLOOR) / 2))
      && onHit.every((g) => near(g, FLOOR)),
      `a hit inside the last one's release starts from where the line had got to (${fmt(atStart)} → ${fmt(halfway)} → ${fmt(onHit)})`);
    let jump = 0;
    for (let t = 0.2; t < 1.9; t += 0.001) jump = Math.max(jump, Math.abs(gainAt(d, p, t + 0.001) - gainAt(d, p, t)));
    assert(jump < 0.08, `and the line never jumps (largest step per ms ${jump.toFixed(3)})`);
  }

  // ---- 8. on a group bus -------------------------------------------------------------------
  {
    const both = bank(kickOn(FOUR), { lead: leadN, leadLen: leadL });
    const group = { lanes: { ...kickMuted, bass: { group: 'group1' }, lead: { group: 'group1' } } };
    const p = await render('group:plain', { bank: both, mix: group });
    const d = await render('group:duck', { bank: both, mix: { ...group, groups: { group1: { effects: [DUCK] } } } });
    const g = [0.5, 1, 1.5, 2.5].map((t) => gainAt(d, p, t + 0.0006));
    assert(g.every((x) => near(x, FLOOR)), `a duck on a group bus ducks its members together (${fmt(g)})`);
  }

  // ---- 9. in a Spot FX section ----------------------------------------------------------
  {
    const d = await render('section', { bank: four, mix: { lanes: kickMuted }, arrangement: { automation: {
      bass: { fx: [{ from: [1, 8], to: [2, 0], chain: [DUCK] }] },
    } } });
    const inside = [1.5].map((t) => gainAt(d, plain, t + 0.0006));
    assert(inside.every((x) => near(x, FLOOR)), `inside the section it ducks (${fmt(inside)})`);
    const before = maxDiff(d, plain, 0, 0.98);
    const after = maxDiff(d, plain, 2.17, 4.0);
    assert(before < 1e-6 && after < 1e-6,
      `outside it, the same samples (before ${before.toExponential(2)}, after ${after.toExponential(2)})`);
  }

  // ---- 11. on the grid -----------------------------------------------------------------
  {
    const grid = (trigger) => ({ lanes: { ...kickMuted, bass: { effects: [{ id: 'duck', params: { ...DUCK.params, trigger } }] } } });
    const same = await render('grid:four', { bank: four, mix: grid('1/4') });
    assert(maxDiff(duck, same) === 0,
      `Every 1/4 on a kick on every beat is the same samples as keyed to the kick (max diff ${maxDiff(duck, same)})`);
    const sparse = bank(kickOn([0, 16]));
    const p = await render('grid:plain', { bank: sparse, mix: { lanes: kickMuted } });
    const d = await render('grid:1/4', { bank: sparse, mix: grid('1/4') });
    const beats = [0.5, 1, 1.5, 2.5, 3, 3.5].map((t) => gainAt(d, p, t + 0.0006));
    assert(beats.every((g) => near(g, FLOOR)),
      `with the kick only on the one, Every 1/4 still pumps on every beat (${fmt(beats)})`);
    const e = await render('grid:1/8', { bank: sparse, mix: grid('1/8') });
    const offs = [0.25, 0.75, 1.25].map((t) => gainAt(e, p, t + 0.0006));
    assert(offs.every((g) => near(g, FLOOR, 0.05)), `Every 1/8 pumps on the off-beats too (${fmt(offs)})`);
  }

  // ---- 12. the Rhythmic Gate's long ramps --------------------------------------------------
  {
    const gateOn = (params) => ({ lanes: { ...kickMuted, bass: { effects: [{ id: 'rhythmgate', params }] } } });
    // The Lab's pump (tools/lib/banger/fx.js GATES.pump): a 160 ms swell, longer than the
    // 125 ms sixteenth at 120 BPM.
    const pump = await render('gate:pump', { bank: four, mix: gateOn({ division: 1, gateLength: 1, attack: 0.16, decay: 0.02, depth: 0.65 }) });
    const swell = [0.5, 1, 1.5].map((t) => gainAt(pump, plain, t + 0.06));
    assert(swell.every((g) => near(g, FLOOR + 0.65 * 0.06 / 0.16)),
      `the Lab pump swells in a straight line across the sixteenth edge: ${fmt(swell)} 60 ms after the beat, not 0.35`);
    const asDuck = await render('gate:asduck', { bank: four, mix: { lanes: { ...kickMuted,
      bass: { effects: [{ id: 'duck', params: { trigger: '1/4', depth: 0.65, attack: 0.02, hold: 0, release: 0.16 } }] } } } });
    const d = maxDiff(pump, asDuck, 0.1, 4);
    assert(d < 1e-4, `and it is the duck's line on Every 1/4 with the same shape (max diff ${d.toExponential(2)})`);
    // A 1/8 gate open for 135 ms whose 60 ms DECAY runs across the 125 ms edge.
    const close = await render('gate:decay', { bank: four, mix: gateOn({ division: 0.5, gateLength: 0.54, attack: 0.001, decay: 0.06, depth: 1 }) });
    const half = [0.25, 0.5, 0.75].map((t) => gainAt(close, plain, t + 0.105));
    assert(half.every((g) => near(g, 0.5)), `a DECAY across a sixteenth edge closes in a straight line: halfway, ${fmt(half)}`);
  }
} finally {
  await browser.close();
}

// ---- 10. stems still sum ---------------------------------------------------------------
{
  const renderer = await openRenderer();
  try {
    const song = bank(kickOn(FOUR));
    const mix = { lanes: { bass: { effects: [DUCK] } } };
    const full = await renderer.render(song, { mix, trackId: null, tail: 0.5 });
    const bassStem = await renderer.render(song, { mix, trackId: null, tail: 0.5, lanes: new Set(['bass']) });
    const kickStem = await renderer.render(song, { mix, trackId: null, tail: 0.5, lanes: new Set(['kick']) });
    const bare = await renderer.render(song, { mix: null, trackId: null, tail: 0.5, lanes: new Set(['bass']) });
    let residual = 0, energy = 0;
    for (let n = 0; n < full.outL.length; n++) {
      residual += (bassStem.outL[n] + kickStem.outL[n] - full.outL[n]) ** 2;
      energy += full.outL[n] ** 2;
    }
    const db = 10 * Math.log10(residual / energy);
    assert(db < -90, `the bass and kick stems of a ducked song sum to its mix (residual ${db.toFixed(1)} dB)`);
    const g = gainAt(bassStem.outL, bare.outL, 0.5006);
    assert(near(g, FLOOR), `and the bass stem is ducked on its own (${g.toFixed(3)} on the second kick)`);
  } finally {
    await renderer.close();
  }
}

if (errors.length) { console.error('page errors:', errors); failed = true; }
console.log(failed ? 'SIDECHAIN DUCK: FAILED' : 'SIDECHAIN DUCK: PASSED');
process.exit(failed ? 1 : 0);
