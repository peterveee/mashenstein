/**
 * AUTO PORTAMENTO — the decision, as music.
 *
 * `src/engine/auto-portamento.js` decides which connections between neighbouring melody
 * notes slide; `src/engine/lane-view.js` reads a song ahead of the transport and hands it
 * the notes as they will be heard. This is the part of the feature that is a claim about
 * MUSIC rather than about audio, and it is browserless on purpose: every assertion is a
 * decision a person could check on a stave.
 *
 *   1. the saved settings fail closed — missing, malformed and unknown-version data never
 *      switches anything on, and never yields a NaN;
 *   2. which presets can take a slide, and why the others cannot;
 *   3. the policy: touching steps slide, repeats, rests, chords and staccato do not, a held
 *      landing is the likeliest, a fast run stays articulated, repeated and transposed
 *      motifs read alike, Amount is a ceiling and zero is none, and a slide never outlasts
 *      the note it lands on;
 *   4. the plan is BESIDE the notes — nothing it is handed is written to;
 *   5. the lane view reads the arrangement the way the scheduler does: sections, the mute
 *      mask, transposition, drawn and inherited lengths, and a barrier wherever a slide
 *      must not go.
 *
 *   node tests/auto-portamento.js
 */
import {
  AUTO_PORTAMENTO_VERSION, AUTO_PORTAMENTO_POLICY, readAutoPortamento, normaliseAutoPortamento,
  autoPortamentoSettings, autoPortamentoOn, autoPortamentoSupport, autoPortamentoUnsupportedNote,
  autoPortamentoGlideSeconds, autoPortamentoShare, autoPortamentoFloor, analyseAutoPortamento,
  selectAutoPortamento, planAutoPortamento,
} from '../src/engine/auto-portamento.js';
import {
  createLaneView, autoPortamentoLane, autoPortamentoReportOf, laneEventId,
} from '../src/engine/lane-view.js';
import { sequenceValue, effectiveStepLen, stepLen, songBars } from '../src/engine/lanes.js';
import { VOICES } from '../src/data/voices.js';

let failed = 0;
const assert = (cond, msg) => {
  if (!cond) { failed++; console.log(`FAIL: ${msg}`); } else console.log(`ok: ${msg}`);
};

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const BEAT = 60 / 128;               // seconds per beat at 128 bpm
const note = (id, start, gate, midi, length = 'explicit') => ({ id, start, gate, hz: hz(midi), length });
const plan = (events, config = { enabled: true, amount: 35, glide: 40 }, spb = BEAT) =>
  planAutoPortamento(events, config, { secondsPerBeat: spb });
const pairs = (r) => r.transitions.map((t) => `${t.sourceId}>${t.destinationId}`);
const reasonOf = (r, a, b) => r.diagnostics.find((d) => d.sourceId === a && d.destinationId === b)?.reason;
const eighths = (prefix, midis, from = 0, gate = 0.5) =>
  midis.map((m, i) => note(`${prefix}${i}`, from + i * 0.5, gate, m));

// ---- 1. the saved settings fail closed -------------------------------------------------
{
  const missing = readAutoPortamento(undefined);
  assert(missing.config.enabled === false && missing.diagnostic === null,
    'missing settings mean off, with nothing to report');
  assert(readAutoPortamento(null).config.enabled === false, 'null means off');
  for (const bad of ['on', 7, true, [1, 2]]) {
    const r = readAutoPortamento(bad);
    assert(r.config.enabled === false && r.diagnostic === 'malformed',
      `malformed settings (${JSON.stringify(bad)}) mean off, and say so`);
  }
  for (const loose of [1, 'true', 'on', 'yes', {}]) {
    assert(readAutoPortamento({ enabled: loose }).config.enabled === false,
      `enabled must be the literal true — ${JSON.stringify(loose)} is not a switch`);
  }
  const defaults = readAutoPortamento({ enabled: true }).config;
  assert(defaults.amount === 35 && defaults.glide === 40 && defaults.version === 1,
    'a bare switch takes the documented defaults: Amount 35, Glide 40, version 1');
  const wild = readAutoPortamento({ enabled: true, amount: NaN, glide: Infinity }).config;
  assert(wild.amount === 35 && wild.glide === 40, 'non-finite numbers fall back to the defaults');
  const text = readAutoPortamento({ enabled: true, amount: '90', glide: null }).config;
  assert(text.amount === 35 && text.glide === 40, 'numbers that are not numbers are not read');
  const clamped = readAutoPortamento({ enabled: true, amount: 400, glide: -9 }).config;
  assert(clamped.amount === 100 && clamped.glide === 0, 'Amount and Glide clamp to 0-100');
  assert(readAutoPortamento({ enabled: true, amount: 33.6 }).config.amount === 34,
    'and are whole numbers');
  for (const version of [2, 0, '1', 1.5, -1]) {
    const r = readAutoPortamento({ enabled: true, amount: 90, version });
    assert(r.config.enabled === false && r.diagnostic === `unsupported-version:${version}`,
      `version ${JSON.stringify(version)} fails closed with a diagnostic, never read as 1`);
  }
  assert(readAutoPortamento({ enabled: true, version: 1 }).config.enabled === true,
    'version 1 is read');
  assert(autoPortamentoOn({ portamento: { enabled: true, amount: 0 } }) === false,
    'Amount 0 selects nothing, so it is off for the scheduler');
  assert(autoPortamentoOn({ portamento: { enabled: true } }) === true
    && autoPortamentoOn({ arp: { enabled: true } }) === false && autoPortamentoOn(null) === false,
  'only an enabled portamento is Auto Portamento, whatever else is on the lane');
  const made = autoPortamentoSettings({ amount: 20 });
  assert(made.enabled === true && made.amount === 20 && made.glide === 40
    && made.version === AUTO_PORTAMENTO_VERSION, 'autoPortamentoSettings writes a whole, versioned object');
  assert(normaliseAutoPortamento({ enabled: true, amount: 61 }).amount === 61,
    'normaliseAutoPortamento is the config without the diagnostic');
}

// ---- 2. which presets can take a slide ------------------------------------------------
{
  const asks = (id) => autoPortamentoSupport(VOICES[id]);
  assert(asks('syncRazorLead').supported, 'a sustained MRDR-3 lead takes a slide');
  assert(asks('mrdrConcertFlute').supported && asks('bestRobotVox').supported,
    'so do the sustained MRDR-3 winds and voices the Lab uses');
  const piano = asks('mrdrElectricGrand');
  assert(!piano.supported && piano.reason === 'decays',
    'a piano dies away before the next note, so there is nothing to slide');
  const pluck = asks('roundMono2');
  assert(!pluck.supported && pluck.reason === 'decays', 'a CRLS-1 with no sustain is refused for the same reason');
  const wavetable = asks('tngrWireHarp');
  assert(!wavetable.supported && wavetable.reason === 'engine',
    'a worklet family that has no hand-over yet is refused honestly');
  assert(!asks('toneSquare').supported, 'and so is the chip channel');
  assert(!autoPortamentoSupport(null).supported && autoPortamentoSupport(null).reason === 'no-voice',
    'a lane with no instrument has nothing to slide');
  assert(autoPortamentoSupport({ synth: 'CRLS-1', options: { envelope: { sustain: 0.8 } } }).supported
    && autoPortamentoSupport({ synth: 'MonoSynth', options: { envelope: { sustain: 0.8 } } }).supported,
  'a sustained pooled Tone lead takes a slide, under either of its names');
  assert(autoPortamentoSupport({ synth: 'CRLS-1', kind: 'drum', options: {} }).reason === 'unpitched'
    && autoPortamentoSupport({ kind: 'noise' }).reason === 'unpitched',
  'drums and noise are refused as unpitched');
  const builtIn = autoPortamentoSupport(VOICES.engSquare);
  assert(!builtIn.supported && builtIn.reason === 'engine',
    "the engine's own hand-written voices are pitched, but not played by the rack — refused as that, not as drums");
  for (const id of ['mrdrElectricGrand', 'tngrWireHarp', 'toneSquare']) {
    assert(autoPortamentoUnsupportedNote(asks(id)).length > 10,
      `${id} is refused with a sentence the desk can show`);
  }
  assert(autoPortamentoLane('lead') && autoPortamentoLane('lead4') && autoPortamentoLane('bass')
    && autoPortamentoLane('leadHarm'), 'melody lanes and their layers can be slid');
  assert(!autoPortamentoLane('chords') && !autoPortamentoLane('organChords')
    && !autoPortamentoLane('kick') && !autoPortamentoLane('sweeps'),
  'chord, drum and gesture lanes cannot');
}

// ---- 3. the policy, as music ---------------------------------------------------------
{
  // Touching C→D slides: a pickup into a held note is the likeliest slide there is.
  const pickup = plan([note('c', 0, 0.5, 60), note('d', 0.5, 2.0, 62)]);
  assert(pairs(pickup).join() === 'c>d' && pickup.transitions[0].reason === 'pickup-landing',
    'touching C→D slides, and it is read as a pickup into a held note');
  assert(pickup.transitions[0].direction === 'up' && pickup.transitions[0].articulation === 'legato',
    'it carries its direction and the legato articulation');

  // A repeated pitch never slides, and does not stop its neighbours.
  const repeat = plan([note('a', 0, 0.5, 60), note('b', 0.5, 0.5, 60), note('c', 1, 1.5, 62)]);
  assert(reasonOf(repeat, 'a', 'b') === 'repeat' && !pairs(repeat).includes('a>b'),
    'repeated C→C cannot slide');
  assert(pairs(repeat).includes('b>c'), 'but the note after it still can');

  // A clear rest blocks a connection — and ends the phrase, so the notes after it are a
  // new one that can slide among themselves.
  const rest = plan([note('a', 0, 0.5, 60), note('b', 0.5, 0.5, 62), note('c', 1, 0.5, 64),
    note('d', 4, 0.5, 65), note('e', 4.5, 2, 67)], { enabled: true, amount: 100, glide: 40 });
  assert(!pairs(rest).includes('c>d') && reasonOf(rest, 'c', 'd') === 'rest',
    'a clear rest blocks a connection');
  assert(pairs(rest).includes('d>e'), 'and the phrase after it is planned on its own');

  // A chord is a barrier: nothing slides into it or out of it, and nothing slides across.
  const chord = plan([note('a', 0, 0.5, 60), { barrier: 'chord' }, note('b', 1, 1, 62)]);
  assert(chord.transitions.length === 0 && reasonOf(chord, 'a', 'b') === 'chord',
    'a chord blocks a connection, and the diagnostic says why');
  const dyad = plan([note('a', 0, 0.5, 60), note('b', 0.5, 0.5, 62), { barrier: 'voice' },
    note('c', 1, 0.5, 64), note('d', 1.5, 2, 65)]);
  assert(pairs(dyad).every((p) => p === 'a>b' || p === 'c>d'),
    'a change of instrument is a barrier: no pair spans it');

  // Explicit short notes keep their staccato however regular the grid is.
  const staccato = [0, 1, 2, 3].map((i) => note(`s${i}`, i * 0.5, 0.1, 60 + 2 * i));
  const stac = plan(staccato, { enabled: true, amount: 100, glide: 100 });
  assert(stac.transitions.length === 0
    && ['s0>s1', 's1>s2', 's2>s3'].every((k) => reasonOf(stac, ...k.split('>')) === 'explicit-staccato'),
  'a regular grid of explicit staccato notes is never bridged, at any Amount');

  // The bounded exception: a regular run of INHERITED gates may bridge a little more.
  const run = (length, gate = 0.34, spacing = 0.5, spb = BEAT) => plan(
    [0, 1, 2, 3].map((i) => note(`r${i}`, i * spacing, gate, 60 + 2 * i, length)),
    { enabled: true, amount: 100, glide: 40 }, spb);
  assert(run('inherited').candidates.some((c) => c.eligible),
    'a regular run of inherited gates may bridge a gap of a third of a pulse');
  assert(!run('explicit').candidates.some((c) => c.eligible)
    && reasonOf(run('explicit'), 'r0', 'r1') === 'explicit-staccato',
  'the very same notes with DRAWN lengths do not');
  assert(!run(null).candidates.some((c) => c.eligible),
    'and missing provenance reads as the stricter rule');
  assert(!run('inherited', 0.34, 0.5, 60 / 50).candidates.some((c) => c.eligible),
    'a bridged silence is capped at 80 ms however slow the tempo makes a third of a pulse');
  const ragged = plan([note('x0', 0, 0.34, 60, 'inherited'), note('x1', 0.5, 0.34, 62, 'inherited'),
    note('x2', 1.05, 0.34, 64, 'inherited'), note('x3', 1.5, 0.34, 65, 'inherited')]);
  assert(reasonOf(ragged, 'x1', 'x2') !== 'near-step' && !pairs(ragged).includes('x1>x2'),
    'an irregular onset cannot borrow the exception');

  // A fast run stays articulated; the held note it lands on is the one that slides.
  const fast = [60, 62, 64, 65, 67, 69, 71, 72].map((m, i) => note(`f${i}`, i * 0.25, 0.25, m));
  fast.push(note('land', 2, 2, 74));
  const fastPlan = plan(fast);
  assert(pairs(fastPlan).join() === 'f7>land',
    'the interior of a fast run keeps its attacks and the held landing takes the slide');
  const fastMax = plan(fast, { enabled: true, amount: 100, glide: 40 });
  const landing = fastMax.diagnostics.find((d) => d.destinationId === 'land');
  const interior = fastMax.diagnostics.filter((d) => d.destinationId !== 'land' && d.score != null);
  assert(landing.selected && landing.score > 2 * Math.max(...interior.map((d) => d.score)),
    'even at Amount 100 the landing outranks every interior note of the run by a wide margin');

  // A phrase with nothing worth a slide gets none at an ordinary Amount — the budget is a
  // ceiling, not a quota — and only a high Amount lowers the floor for what it has.
  const gabble = [60, 62, 64, 65, 67, 69, 71].map((m, i) => note(`g${i}`, i * 0.25, 0.25, m));
  const gabbled = plan(gabble);
  assert(['g0>g1', 'g1>g2', 'g2>g3', 'g3>g4', 'g4>g5'].every((k) => reasonOf(gabbled, ...k.split('>')) === 'weak')
    && gabbled.qualifying === 1 && gabbled.transitions.length === 1,
  'inside a bare fast run every attack is kept at the default Amount; only the run\'s last note can take a slide');
  const gabbleHigh = plan(gabble, { enabled: true, amount: 100, glide: 40 });
  assert(gabbleHigh.qualifying > gabbled.qualifying && gabbleHigh.transitions.length > 1,
    'and a high Amount lowers the floor for what the run has');
  assert(autoPortamentoFloor(35) > autoPortamentoFloor(100), 'the floor is lower at the top of the dial');
  const leapy = plan([note('a', 0, 0.5, 60), note('b', 0.5, 0.5, 70), note('c', 1, 0.5, 71)]);
  assert(!pairs(leapy).includes('a>b') && reasonOf(leapy, 'a', 'b') === 'weak',
    'a leap of a tenth in the middle of a line is not worth a slide, and the diagnostic says so');

  // Intervals: a step beats a skip beats a leap; over an octave is refused.
  const rank = (semis) => plan([note('a', 0, 0.5, 60), note('b', 0.5, 0.5, 60 + semis)],
    { enabled: true, amount: 100, glide: 40 }).candidates[0];
  assert(rank(2).score > rank(4).score && rank(4).score > rank(9).score,
    'a step ranks above a skip, and a skip above a leap');
  assert(rank(13).eligible === false && rank(13).reason === 'wide-leap'
    && rank(12).eligible === true, 'more than an octave is refused; an octave is not');
  assert(rank(-3).eligible && rank(-3).semitones < 0, 'a falling slide is judged like a rising one');
}

// ---- Amount is a ceiling, and zero is none -------------------------------------------
{
  const phrase = (n) => [...eighths('m', Array.from({ length: n }, (_, i) => 60 + (i % 5)), 0)];
  const long = phrase(16);
  const counts = [0, 10, 35, 60, 80, 100].map((amount) =>
    plan(long, { enabled: true, amount, glide: 40 }).transitions.length);
  assert(counts[0] === 0, 'Amount 0 selects no connection');
  assert(counts.every((c, i) => i === 0 || c >= counts[i - 1]),
    `raising Amount never takes a slide away (${counts.join(' ≤ ')})`);
  assert(counts[5] <= Math.floor(0.4 * 15) && counts[2] <= Math.round(0.15 * 15),
    'a phrase spends at most 40% of its transitions at the top and about 15% at the default');
  assert(plan(long, { enabled: false, amount: 100 }).transitions.length === 0,
    'a switch that is off selects nothing whatever Amount says');

  // Adjacent selected transitions share a note: never at a normal Amount, two at most above.
  const adjacency = (amount) => {
    const r = plan(long, { enabled: true, amount, glide: 40 });
    const at = r.transitions.map((t) => Number(t.sourceId.slice(1))).sort((a, b) => a - b);
    let run = 1; let longest = at.length ? 1 : 0;
    for (let i = 1; i < at.length; i++) { run = at[i] === at[i - 1] + 1 ? run + 1 : 1; longest = Math.max(longest, run); }
    return longest;
  };
  assert(adjacency(35) <= 1 && adjacency(70) <= 1, 'at ordinary settings no two selected transitions touch');
  assert(adjacency(100) <= 2, 'at a high Amount at most two follow one another');

  // Short phrases may take ONE strong candidate; a phrase with nothing that qualifies takes none.
  assert(plan([note('a', 0, 0.5, 60), note('b', 0.5, 2, 62)]).transitions.length === 1,
    'a two-note phrase can take its one strong slide');
  assert(plan([note('a', 0, 0.5, 60), note('b', 0.5, 0.5, 60), note('c', 1, 0.5, 60)])
    .transitions.length === 0, 'a phrase of repeated notes is given no slide just because slides were asked for');
}

// ---- motifs read alike wherever they are and however high ---------------------------
{
  const motif = (prefix, from, shift) => [
    note(`${prefix}0`, from, 0.5, 60 + shift), note(`${prefix}1`, from + 0.5, 0.5, 62 + shift),
    note(`${prefix}2`, from + 1, 0.5, 64 + shift), note(`${prefix}3`, from + 1.5, 0.5, 65 + shift),
    note(`${prefix}4`, from + 2, 0.5, 67 + shift), note(`${prefix}5`, from + 2.5, 2, 72 + shift),
  ];
  // Two statements of one figure, the second a fifth up and three bars later, a rest between.
  const both = plan([...motif('p', 0, 0), ...motif('q', 16, 7)]);
  const shape = (prefix) => both.transitions.filter((t) => t.sourceId.startsWith(prefix))
    .map((t) => `${t.sourceId.slice(1)}>${t.destinationId.slice(1)}:${t.reason}`).join();
  assert(shape('p') === shape('q') && shape('p').length > 0,
    `a figure and its transposition get the same slides (${shape('p')})`);
  // Back to back at the same bar position, the two statements still agree.
  const joined = plan([...motif('p', 0, 0), ...motif('q', 4, 0)]);
  const count = (prefix) => joined.transitions.filter((t) => t.sourceId.startsWith(prefix)).length;
  assert(count('p') > 0 && count('p') === count('q'), 'a figure stated twice in a row is slid the same both times');

  // A figure that repeats INSIDE one phrase — one unbroken run of eight notes' worth of the
  // same four — is taken whole or not at all: every transition of one shape is chosen, or
  // none is, so its repeats cannot be treated differently from one another.
  const cycle = [60, 62, 64, 62];
  const run = Array.from({ length: 24 }, (_, i) => note(`m${i}`, i * 0.5, 0.5, cycle[i % 4]));
  for (const amount of [35, 60, 100]) {
    const analysis = analyseAutoPortamento(run, { secondsPerBeat: BEAT, glide: 40 });
    const chosen = selectAutoPortamento(analysis, { enabled: true, amount, glide: 40 });
    const shapes = new Map();
    for (const c of analysis.candidates.filter((x) => x.eligible)) {
      const e = shapes.get(c.key) || { all: 0, taken: 0 };
      e.all++;
      if (chosen.transitions.some((t) => t.sourceId === c.sourceId)) e.taken++;
      shapes.set(c.key, e);
    }
    assert(chosen.transitions.length > 0 && [...shapes.values()].every((e) => e.taken === 0 || e.taken === e.all),
      `at Amount ${amount} every repeat of a figure is slid or none is`);
  }
}

// ---- the slide itself ------------------------------------------------------------------
{
  const seconds = (semitones, glide, destinationSeconds, spb = BEAT) =>
    autoPortamentoGlideSeconds({ semitones, glide, secondsPerBeat: spb, destinationSeconds });
  assert(seconds(2, 40, 2) > 0.03 && seconds(2, 40, 2) < 0.07, 'the default slide is tens of milliseconds');
  assert(seconds(2, 100, 10, 1) === 0.14, 'and never longer than 140 ms');
  assert(seconds(2, 100, 0.2) <= 0.3 * 0.2 + 1e-12,
    'or 30% of the note it lands on — the cap is applied last');
  assert(seconds(2, 40, 0.02) === 0, 'where fewer than 8 ms are left there is no slide, not a squeezed one');
  assert(seconds(7, 40, 2) > seconds(1, 40, 2) && seconds(2, 100, 2) > seconds(2, 0, 2),
    'a wider interval and a higher Glide both take longer');
  assert(seconds(2, 40, 2, 0.25) < seconds(2, 40, 2, 0.5), 'a faster tempo gets a shorter slide');
  const chosen = plan([note('a', 0, 0.5, 60), note('b', 0.5, 0.12, 62)], { enabled: true, amount: 100, glide: 100 });
  assert(chosen.transitions.every((t) => t.glideSeconds <= 0.3 * 0.12 * BEAT + 1e-12),
    'a planned slide never outlasts a third of the note it arrives at');
  assert(autoPortamentoShare(0) === 0 && autoPortamentoShare(35) === 0.15 && autoPortamentoShare(100) === 0.4,
    'the share of a phrase Amount may spend runs 0, 15% at the default and 40% at the top');
  assert(autoPortamentoShare(50) > autoPortamentoShare(35) && autoPortamentoShare(35) > autoPortamentoShare(10),
    'and only ever grows');

  // The gate that has to reach the destination: never shorter than drawn, and no further
  // than the destination plus a couple of milliseconds where it has to be stretched.
  const handoff = AUTO_PORTAMENTO_POLICY.handoffSeconds / BEAT;
  const stretched = plan([note('a', 0, 0.4, 60), note('b', 0.5, 2, 62)]).transitions[0];
  assert(Math.abs(stretched.sourceGateEndBeat - (0.5 + handoff)) < 1e-9,
    'a source that stops short is carried through the destination plus a 2 ms hand-off');
  const overlapping = plan([note('a', 0, 0.6, 60), note('b', 0.5, 2, 62)]).transitions[0];
  assert(overlapping.sourceGateEndBeat === 0.6,
    'a source that already overlaps keeps the end it was drawn with');
  assert(plan([note('a', 0, 0.5, 60), note('b', 0.5, 2, 62)]).transitions.every((t) => t.sourceGateEndBeat >= 0.5),
    'no gate is ever shortened');
}

// ---- the plan is beside the notes, and the same every time -------------------------
{
  const events = [...eighths('n', [60, 62, 64, 65], 0), note('end', 2, 2, 72)];
  const frozen = JSON.stringify(events);
  for (const e of events) Object.freeze(e);
  const first = plan(events, { enabled: true, amount: 100, glide: 60 });
  assert(JSON.stringify(events) === frozen, 'nothing the planner is handed is written to');
  const again = plan(events, { enabled: true, amount: 100, glide: 60 });
  assert(JSON.stringify(first) === JSON.stringify(again),
    'the same notes and settings give the same answer, with no randomness at play time');
  assert(first.diagnostics.every((d) => typeof d.reason === 'string' && d.reason.length > 0),
    'every candidate, chosen or not, carries a reason');
  const none = analyseAutoPortamento([], { secondsPerBeat: BEAT });
  assert(none.candidates.length === 0, 'an empty lane has nothing to plan');
  assert(plan([note('only', 0, 1, 60)]).transitions.length === 0, 'a single note has no neighbour');
  assert(plan(events, { enabled: true, amount: 100 }, 0).transitions.length === 0,
    'and a tempo that is not a tempo plans nothing rather than a NaN');
}

// ---- 5. the lane view reads the arrangement the way the scheduler does ----------------
{
  const LEAD = (voice, fill) => {
    const lead = new Array(32).fill(null); const len = new Array(32).fill(null);
    fill(lead, len);
    return { lead, leadLen: len, leadVoice: voice };
  };
  const stepsOf = (lead, len, list) => list.forEach(([slot, midi, steps]) => {
    lead[slot] = hz(midi); if (steps != null) len[slot] = steps;
  });

  // A bank with two sections, the second a different voice and the first transposed by the
  // arrangement, a muted bar, and notes with and without drawn lengths.
  const s0 = LEAD('syncRazorLead', (l, n) => stepsOf(l, n, [[0, 60, 2], [2, 62, 2], [4, 64, 2], [6, 65, 6]]));
  const s1 = LEAD('mrdrConcertFlute', (l, n) => stepsOf(l, n, [[0, 67, null], [1, 69, null], [2, 71, null]]));
  const bank = {
    bpm: 128, leadVoice: 'syncRazorLead', sections: [s0, s1],
    order: [0, { s: 0, bars: 2, transpose: 5 }, 1, { s: 0, bars: 1, off: ['lead'] }],
  };
  const view = createLaneView({ bank, mix: null, resolution: 16, formSteps: songBars(bank).length * 16 });
  const events = view.events('lead');
  const notes = events.filter((e) => !e.barrier);

  const first = notes[0];
  assert(first.id === laneEventId('lead', 0, 16) && first.id === 'lead@0'
    && first.start === 0 && first.gate === 0.5 && first.length === 'explicit',
  'an event has a stable id, its start and gate in beats, and where its length came from');
  assert(Math.abs(first.hz - hz(60)) < 1e-9, 'its pitch is the sounding pitch');

  // The bar the arrangement transposes is heard transposed: the planner reads what is heard.
  const bar2 = notes.find((e) => e.id === 'lead@32');
  assert(bar2 && Math.abs(bar2.hz - hz(65)) < 1e-9,
    'a bar transposed by the arrangement is read at the transposed pitch');
  // Section 1's lane carries no drawn lengths: they are the lane's own default, and say so.
  const flute = notes.filter((e) => e.voice === 'mrdrConcertFlute');
  assert(flute.length === 3 && flute.every((e) => e.length === 'inherited'),
    'notes with no drawn length are marked as inheriting the lane default');
  assert(Math.abs(flute[0].len - effectiveStepLen(s1, 'lead', 0, 16)) < 1e-12
    && Math.abs(flute[0].gate * 4 - flute[0].len) < 1e-12,
  'and their gate is exactly the one the scheduler would give them');
  // A different instrument is a barrier, and the muted bar is silence.
  const barriers = events.filter((e) => e.barrier).map((e) => e.barrier);
  assert(barriers.includes('voice'), 'a change of instrument puts a barrier between the notes');
  assert(!notes.some((e) => e.start >= 3 * 4 && e.start < 4 * 4),
    'a bar the mute mask silences has no notes in it');

  // Every step reads exactly what the scheduler reads out of the same section.
  const bars = songBars(bank);
  let compared = 0; let agree = true;
  for (let step = 0; step < bars.length * 16; step++) {
    const at = view.resolve('lead', step);
    const bar = bars[Math.floor(step / 16) % bars.length];
    const s = (step % 16) + bar.half * 16;
    const masked = bar.off?.includes('lead');
    const value = masked ? null : sequenceValue(bar.b, 'lead', s, 16);
    if ((at.kind === 'note') !== (value > 0)) agree = false;
    if (at.kind === 'note') {
      compared++;
      const shift = typeof bar.bar.transpose === 'number' ? bar.bar.transpose : 0;
      if (Math.abs(at.hz - value * 2 ** (shift / 12)) > 1e-9) agree = false;
      if (Math.abs(at.len - effectiveStepLen(bar.b, 'lead', s, 16)) > 1e-12) agree = false;
      if (at.explicit !== (stepLen(bar.b, 'lead', s, 16) != null)) agree = false;
    }
  }
  assert(compared > 8 && agree, `the view agrees with the scheduler's own reads on all ${compared} notes`);

  // The plan, indexed by tick: which note slides into which.
  const planned = view.plan('lead', { enabled: true, amount: 100, glide: 40 }, { secondsPerBeat: BEAT });
  const tied = [...planned.byTick.values()].filter((e) => e.out);
  assert(tied.length > 0 && tied.every((e) => planned.byId.get(e.out.to).into?.from === e.id),
    'each slide is recorded on both of its notes: the source knows where it goes, the destination where from');
  assert(tied.every((e) => e.out.toLen > 0 && e.out.toHz > 0 && e.out.toTick > e.tick),
    'and a source remembers what its destination was, so an edit that moves it can be told');
  assert(planned.byTick.get(0).into === null && planned.byTick.get(0).id === 'lead@0',
    'the first note of a lane has nothing to slide from');
  assert(Object.isFrozen(bank) === false && JSON.stringify(bank.sections[0].lead) === JSON.stringify(s0.lead),
    'planning left the song alone');
}

// ---- barriers: chord, Note FX, an unsupported sound, a jump ------------------------------
{
  const lead = new Array(32).fill(null); const len = new Array(32).fill(null);
  [[0, 60], [2, 62], [4, 64], [6, 65]].forEach(([slot, m]) => { lead[slot] = hz(m); len[slot] = 2; });
  lead[8] = [hz(60), hz(64)]; len[8] = [2, 2];                   // a dyad
  [[10, 67], [12, 69], [14, 71]].forEach(([slot, m]) => { lead[slot] = hz(m); len[slot] = 2; });
  const base = { bpm: 128, leadVoice: 'syncRazorLead', sections: [{ lead, leadLen: len }], order: [0] };
  const kinds = (b, mix = null) => createLaneView({ bank: b, mix, resolution: 16, formSteps: 32 })
    .events('lead');

  const withChord = kinds(base);
  const at = withChord.findIndex((e) => e.barrier === 'chord');
  assert(at > 0 && withChord[at - 1].id === 'lead@6' && withChord[at + 1].id === 'lead@10',
    'a chord is a barrier between the notes either side of it');
  const slid = createLaneView({ bank: base, mix: null, resolution: 16, formSteps: 32 })
    .plan('lead', { enabled: true, amount: 100, glide: 40 }, { secondsPerBeat: BEAT });
  assert(!slid.transitions.some((t) => t.sourceId === 'lead@6' || t.destinationId === 'lead@10'),
    'so nothing slides into or out of it');

  const arped = kinds(base, { lanes: { lead: { noteFx: { arp: { enabled: true, rate: 1 } } } } });
  assert(arped.every((e) => e.barrier),
    'a lane whose Note FX generate its notes has no melody to read — no note in it at all');
  const barArped = kinds({ ...base, order: [0, { s: 0, bars: 1, noteFx: { lead: { mode: 'on', arp: { enabled: true } } } }] },
    null);
  assert(barArped.some((e) => !e.barrier), 'a bar override only reaches its own bar');
  const mixed = createLaneView({
    bank: { ...base, order: [0, { s: 0, bars: 1, noteFx: { lead: { mode: 'on', arp: { enabled: true, rate: 1 } } } }] },
    mix: null, resolution: 16, formSteps: 48,
  }).events('lead');
  assert(mixed.some((e) => e.barrier === 'fx') && mixed.some((e) => !e.barrier),
    'a bar that arpeggiates is a barrier and the bars around it are still melody');

  const piano = kinds({ ...base, leadVoice: 'mrdrElectricGrand' });
  assert(piano.every((e) => e.barrier),
    'a sound that cannot take a slide puts no note in the view, so no neighbour tries');

  // A jump in the transport — Rearrange's cut — is a barrier.
  const jumpy = createLaneView({
    bank: base, mix: null, resolution: 16, formSteps: 32,
    position: (step) => ({ sourceStep: step < 8 ? step : step + 8, slice: step < 8 ? '0:0' : '1:0',
      mute: false, semitones: 0, harmonise: null }),
  }).events('lead');
  assert(jumpy.some((e) => e.barrier === 'discontinuity'),
    'the places a rearranged song jumps are barriers, so a slide never joins notes the song never wrote side by side');
}

// ---- the engine reads Rearrange's order, not the song's -----------------------------------------
{
  const { installDom } = await import('./dom-stub.js');
  installDom();
  const { Audio } = await import('../src/engine/audio.js');
  const lead = new Array(32).fill(null); const len = new Array(32).fill(null);
  [[0, 60], [2, 62], [4, 64], [6, 65]].forEach(([slot, m]) => { lead[slot] = hz(m); len[slot] = 2; });
  lead[8] = hz(67); len[8] = 8;
  lead[20] = hz(64); len[20] = 4;                          // a note in the song's SECOND bar
  const bank = { bpm: 120, leadVoice: 'syncRazorLead', sections: [{ lead, leadLen: len }], order: [0, 0] };
  // Two passes of the first bar, then one pass of the second bar's slice, a tone up.
  const recipe = {
    source: { steps: 64 }, output: { steps: 48 },
    operations: [{ from: 0, length: 16, repeats: 2 }, { from: 16, length: 16, repeats: 1, transpose: 2 }],
  };
  const sys = Object.assign(Object.create(Object.getPrototypeOf(Audio)), {
    bank, mixEntry: null, transportResolution: 16, rearrangement: recipe, bpm: 120, tempo: 1, _tick: 0,
  });
  const view = sys._portamentoView();
  const events = view.events('lead');
  const notes = events.filter((e) => !e.barrier);
  assert(view.ticks === 48, 'the pass is the OUTPUT length of the recipe, not the length of the song');
  assert(notes.filter((e) => e.step < 32).length === 10 && notes.length === 11,
    'the first slice, repeated, is read twice: ten notes across the first two bars, and the next slice adds its one');
  assert(events.filter((e) => e.barrier === 'discontinuity').length >= 1
    && events.findIndex((e) => e.barrier === 'discontinuity') > 0,
  'and the jump between one repeat and the next is a barrier — a slide never joins notes the song never wrote side by side');
  // The slice that follows is the song's second bar at the same pitches, transposed by the recipe.
  const again = view.resolve('lead', 0); const second = view.resolve('lead', 16);
  assert(again.kind === 'note' && Math.abs(again.hz - hz(60)) < 1e-9 && second.kind === 'note'
    && Math.abs(second.hz - hz(60)) < 1e-9, 'a repeat of the opening reads the opening again');
  const third = view.resolve('lead', 36);
  assert(third.kind === 'note' && Math.abs(third.hz - hz(66)) < 1e-9 && third.len === 4,
    'and the next slice reads the second bar of the source, at the pitch the recipe transposes it to');
  // A recipe that mutes a slice is silence there, and a harmony op shifts by the recipe's key.
  sys.rearrangement = { ...recipe, operations: [{ from: 0, length: 16, repeats: 1, mute: true }, recipe.operations[1]] };
  sys._portaView = null;
  assert(sys._portamentoView().events('lead').every((e) => e.barrier || e.step >= 16),
    'a muted slice has no notes in it');
}

// ---- the desk's question, asked of a song that is not playing ---------------------------------
{
  const lead = new Array(32).fill(null); const len = new Array(32).fill(null);
  [[0, 60], [2, 62], [4, 64], [6, 65]].forEach(([slot, m]) => { lead[slot] = hz(m); len[slot] = 2; });
  lead[8] = hz(67); len[8] = 8;
  const bank = { bpm: 128, leadVoice: 'syncRazorLead', sections: [{ lead, leadLen: len }], order: [0] };
  const asks = (over = {}) => autoPortamentoReportOf({
    bank: { ...bank, ...over.bank }, mix: over.mix ?? null, key: over.key ?? 'lead', secondsPerBeat: BEAT,
  });
  assert(autoPortamentoReportOf({ bank: null, key: 'lead', secondsPerBeat: BEAT }) === null,
    'with no song there is nothing to report');
  const lane = asks({ key: 'kick' });
  assert(!lane.supported && lane.reason === 'lane', 'a drum lane is not one a slide can sit on');
  const piano = asks({ bank: { leadVoice: 'mrdrElectricGrand' } });
  assert(!piano.supported && piano.reason === 'decays' && piano.eligible === 0,
    'a sound that dies away is reported as one, with nothing on offer');
  const off = asks();
  assert(off.supported && off.eligible > 0 && off.chosen === 0,
    'a lane that has not been switched on is asked at the default Amount: connections on offer, none used');
  const on = asks({ mix: { lanes: { lead: { noteFx: { portamento: { enabled: true, amount: 35, glide: 40, version: 1 } } } } } });
  assert(on.chosen > 0 && on.chosen <= on.eligible && on.eligible === off.eligible,
    'and one that is on reports what its settings use, out of the same offer');
  const none = autoPortamentoReportOf({
    bank: { bpm: 128, leadVoice: 'syncRazorLead', order: [0],
      sections: [{ lead: [hz(60), null, hz(60), null, hz(60)].concat(new Array(27).fill(null)), leadLen: new Array(32).fill(2) }] },
    key: 'lead', secondsPerBeat: BEAT,
  });
  assert(none.supported && none.eligible === 0 && none.chosen === 0,
    'a supported lane with nothing to slide reports none — "No suitable connections" is a true answer, not an error');
}

console.log(failed ? `\nAUTO PORTAMENTO: ${failed} FAILED` : '\nAUTO PORTAMENTO: PASSED');
process.exit(failed ? 1 : 0);
