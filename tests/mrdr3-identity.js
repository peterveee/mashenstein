/*
 * The MRDR-3 identity contract — docs/MRDR-3-worklet-spec.md §1.1 and §9.1.
 *
 * Two dispatch identities exist during this project and only one of them may ever be
 * seen by a player. That is a rule about a string, which means nothing enforces it unless
 * something checks, and the failure mode if nobody does is the worst kind: a scaffold
 * ships, looks deliberate, and has to be supported.
 *
 * Browserless on purpose. Every claim here is about the catalogue and about source text,
 * and a claim provable without launching Chromium should be.
 *
 * What is claimed:
 *
 *   1. the scaffold cannot ship — no factory preset, no tracked song, no player-facing
 *      picker carries `MRDR-3 AW`
 *   2. family behaviour asks the family — the editors, the patch share format and the
 *      lane chorus stage go through `isMrdrVoice`
 *   3. the two exceptions stay exact, and they are the load-bearing half: renderer
 *      dispatch, and the native-only cache/planner/tail-cull machinery an AW lane must
 *      never enter (§10)
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VOICES } from '../src/data/voices.js';
import '../src/data/imported/index.js';
import { listTracks, resolveTrack } from '../src/data/tracks.js';
import {
  MRDR3_NATIVE, MRDR3_AW, MRDR3_SYNTHS, isMrdrSynth, isMrdrVoice, isMrdrAw,
} from '../src/engine/mrdr3/identity.js';
import { awVoices, awVoiceOf, awViewOf, awApproved } from '../src/dev/mrdr3-aw.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));

// ---- the predicate itself ---------------------------------------------------------
assert(isMrdrSynth(MRDR3_NATIVE) && isMrdrSynth(MRDR3_AW),
  'isMrdrSynth covers both identities');
assert(!isMrdrSynth('TNGR-2') && !isMrdrSynth('KNDO-5') && !isMrdrSynth(undefined),
  'isMrdrSynth refuses everything else, including nothing at all');
assert(isMrdrVoice({ synth: MRDR3_AW }) && !isMrdrVoice(null) && !isMrdrVoice({}),
  'isMrdrVoice is null-safe, which every call site relies on');
assert(isMrdrAw({ synth: MRDR3_AW }) && !isMrdrAw({ synth: MRDR3_NATIVE }),
  'isMrdrAw separates the backends where a caller genuinely needs to know');
assert(MRDR3_SYNTHS.length === 2 && Object.isFrozen(MRDR3_SYNTHS),
  'the identity list is frozen — it is a fact, not a place to add engines');

// ---- 1. the scaffold cannot ship ---------------------------------------------------
const factory = Object.values(VOICES).filter((v) => isMrdrVoice(v));
assert(factory.length > 0, `the library still has MRDR-3 presets (${factory.length})`);
const shipped = factory.filter((v) => v.synth === MRDR3_AW);
assert(shipped.length === 0,
  `NO factory preset carries the AW identity (found ${shipped.map((v) => v.id).join(', ') || 'none'})`);

// A tracked song must never name it either. Songs bind voices through their own keys, so
// the check is on the raw text of every registered bank rather than on a resolved object:
// a string is what would actually be committed.
const bad = [];
for (const track of listTracks()) {
  let bank = null;
  try { bank = resolveTrack(track.id)?.bank; } catch { /* a track that will not resolve is not a track carrying AW */ }
  if (!bank) continue;
  if (JSON.stringify(bank).includes(MRDR3_AW)) bad.push(track.id);
}
assert(bad.length === 0,
  `no registered song carries the AW identity (${bad.join(', ') || 'none do'})`);

// And the catalogue source itself, which is what a careless save would land in.
assert(!read('src/data/voices.js').includes(MRDR3_AW),
  'src/data/voices.js does not mention the AW identity at all');

// ---- 2. family behaviour asks the family -------------------------------------------
const editor = read('tools/mixer-voice-editor.js');
assert(editor.includes("from '../src/engine/mrdr3/identity.js'")
  && !/[!=]==\s*'MRDR-3'/.test(editor),
  'the voice editor asks isMrdrVoice and has no exact-identity guard left');
const patch = read('tools/mrdr3-patch.js');
assert(patch.includes('isMrdrVoice(voice)') && patch.includes('isMrdrVoice(data.voice)'),
  'the patch share format is the FAMILY\'s — either backend may share and receive one');
// The `engine` field is a wire-format marker rather than a voice guard, and stays the
// family's name: a patch shared from an AW lane is the same payload as a native one.
assert(/data\.engine !== 'MRDR-3'/.test(patch),
  'and its wire `engine` marker stays one name, because there is only one patch format');
assert(read('tools/mixer-synth-full.js').includes('isMrdrSynth(kit.engine?.())'),
  'the full editor\'s share button asks the family');

// ---- 3. the two exceptions stay exact ----------------------------------------------
const voices = read('src/engine/voices.js');
// The CLAIM is that the engine reaches for both halves — the family predicate and the
// exact identity — not that they arrive on one line. Pinning the import statement made
// this fail the moment the list grew, which is the second time an assertion here has
// described a spelling rather than a rule.
assert(/from '\.\/mrdr3\/identity\.js'/.test(voices)
  && voices.includes('isMrdrVoice') && voices.includes('MRDR3_NATIVE'),
  'the engine imports both halves of the distinction');
// Renderer dispatch. The whole point of the two identities is that this line chooses
// between them, so it must name one exactly — never the family, and never an `auto`.
assert(/if \(v && v\.synth === MRDR3_NATIVE\) \{/.test(voices),
  'renderer dispatch names ONE identity exactly (§9.1 — no `auto` router)');
assert(!/isMrdrVoice\(v\)\s*\)\s*\{[\s\S]{0,200}_playLayer/.test(voices),
  'and never dispatches to _playLayer on the family predicate');

// The native-only machinery. This is the assertion that keeps §10's "bypass by
// construction" true: widening any of these to the family would silently put AW lanes
// back into the note cache, and it would look like it was working.
const NATIVE_ONLY = [
  ['estimateMrdrEventCost', /estimateMrdrEventCost[\s\S]{0,400}?v\.synth !== MRDR3_NATIVE/],
  ['mrdrDryFingerprint', /function mrdrDryFingerprint[\s\S]{0,300}?v\.synth !== MRDR3_NATIVE/],
  ['_cacheableLayer', /_cacheableLayer\([\s\S]{0,600}?v\.synth !== MRDR3_NATIVE/],
];
for (const [name, re] of NATIVE_ONLY) {
  assert(re.test(voices), `${name} stays NATIVE-ONLY — an AW lane never reaches it (§10)`);
}
assert(/if \(v\?\.synth === MRDR3_NATIVE\) \{[\s\S]{0,400}?mrdrDryFingerprint/.test(voices),
  'refresh() keeps its cache half native-only');
// The CLAIM is that the chorus branch asks the family predicate, not that the condition
// contains nothing else — the same stage is shared with WNDR-9 and KNDO-5, and
// pinning the exact expression made this fail the moment another synth joined it. What
// must not happen is the chorus branch reverting to an exact-identity check.
assert(/if \(isMrdrVoice\(v\)[^)]*\)[\s\S]{0,400}?_updateMrdrLaneStage/.test(voices),
  'and its lane-chorus half on the family, because §7 shares that stage between backends');

// Nothing in the engine may reach the cache through the family predicate. This is the
// single most important line in the file: it is the difference between "AW does not use
// the cache" as an intention and as a fact.
const CACHE_CALLS = /isMrdrVoice\([^)]*\)[\s\S]{0,200}?(noteCache|prepareNoteCache|_cacheEntry|_layerCacheEntry|_recordMrdrTailOpportunity|_unisonCap|_filterStageCap)/;
assert(!CACHE_CALLS.test(voices),
  'no family-predicate branch reaches the cache, the planner, tail culling or the quality caps');

// ---- 4. the dev view: derived by value, empty until a preset crosses ---------------
assert(awVoices().length === 0,
  `no preset has crossed yet, so the AW view is empty (${awVoices().length}) — the correct`
  + ' Phase 1 state, and the row that changes it is an approval');
const canonical = VOICES.bestVowelPad;
const view = awViewOf(canonical);
assert(view !== canonical && view.synth === MRDR3_AW && canonical.synth === MRDR3_NATIVE,
  'a view is a NEW object — an id-only handle would resolve back to the native preset and'
  + ' quietly play the wrong renderer, which looks exactly like the two backends agreeing');
assert(view.id === canonical.id && JSON.stringify(view.layer) === JSON.stringify(canonical.layer),
  'and carries the canonical payload unchanged — one patch library, not two');
assert(view.level === canonical.level && view.peak === canonical.peak,
  'falling back to the native calibration until an AW level has been measured');
assert(awViewOf({ ...canonical, mrdrAw: { approved: true, level: 0.5, peak: 0.9 } }).level === 0.5,
  'and preferring the staged AW calibration once there is one');
assert(!awApproved({ ...canonical, synth: MRDR3_AW, mrdrAw: { approved: true } }),
  'approval is a property of the CANONICAL preset, so a view cannot approve itself');
assert(awVoiceOf('bestVowelPad') === null,
  'and an unapproved id yields nothing rather than an unvetted view');
assert(!read('src/data/voices.js').includes('mrdr3-aw')
  && !read('src/engine/voices.js').includes('dev/mrdr3-aw'),
  'neither the catalogue nor the engine imports the dev view');

// ---- 5. the bench control is a bench control ---------------------------------------
//
// The desk gets a switch because the desk is the bench (§9.2). What must stay true is
// that it is SESSION-ONLY and reaches nothing that outlives the session: a flag written
// to storage, or into a song, is how a scaffold ships by accident.
const entry = read('tools/mixer-entry.js');
assert(/setMrdrComparisonBackend\(/.test(entry) && /mrdr3aw/.test(entry),
  'the desk exposes the comparison switch, so nobody has to type it into a console');
assert(!/localStorage[^\n]*mrdr|mrdr[^\n]*localStorage/i.test(entry),
  'and never persists it — a reload comes back native');
const identitySrc = read('src/engine/mrdr3/identity.js');
assert(/let comparison = null;/.test(identitySrc)
  && !/localStorage|sessionStorage/.test(identitySrc),
  'the override is module state and reaches no storage at all');
// The engine may READ the override in front of dispatch — that is where it belongs — but
// nothing may SET it from inside the engine, and nothing that writes a song may see it.
assert(!read('src/engine/voices.js').includes('setMrdrComparisonBackend'),
  'the engine reads the override but cannot set it');
assert(!read('tools/lib/mix-source.js').includes('mrdrComparison'),
  'and the writer that saves a song has never heard of it');
// ---- AND IT IS A LIVE CONTROL ------------------------------------------------------
//
// AW has no offline path — notes go to a port, and port delivery is not ordered against
// startRendering() — so the override applied to an OfflineAudioContext does not render
// the AW instrument, it renders silence. That was not theoretical: the note cache gives
// every eligible note its own offline context, so with the switch on, each of those asked
// for a worklet lane, built the 407 ms table pyramid on the main thread, and cached the
// silence it got. A quarter-second main-thread stall with the transport playing starves
// the note scheduler, and a starved scheduler is an audible crack.
{
  const from = voices.indexOf('  play(laneKey, voiceId, freq, {');
  const head = from < 0 ? '' : voices.slice(from, from + 3000);
  assert(/typeof this\.ctx\?\.startRendering === 'function'/.test(head)
    && /offline \? VOICES\[voiceId\] : mrdrComparisonVoice\(VOICES\[voiceId\]\)/.test(head),
    'the comparison override is read on a LIVE context only — offline it would render'
    + ' silence and charge a pyramid build to the main thread for it');
}

// ---- 5. a lane that has stopped working says so ------------------------------------
//
// An AW lane fills silence when its DSP throws rather than taking the song down with it.
// That is the right behaviour and it makes the failure invisible — the part goes quiet and
// nothing else changes, which is indistinguishable from a part with nothing to play. Three
// things have to hold for "it cut out after a while" to be answerable at all.
{
  const controller = read('src/engine/mrdr3/controller.js');
  const worklet = read('src/engine/mrdr3/worklet.js');
  const entry = read('tools/mixer-entry.js');

  // THE ONE THAT BIT. `port.onmessage` is a single slot: assigning it replaced the fault
  // handler and never put it back, so the first health probe permanently cost that lane
  // its ability to report that its DSP had thrown. A bug triggered BY looking.
  const health = controller.slice(
    controller.indexOf('export function mrdr3Health'),
    controller.indexOf('export function releaseMrdr3Lane'),
  );
  assert(health.length > 0 && !/port\.onmessage\s*=/.test(health)
    && /addEventListener\('message'/.test(health)
    && /removeEventListener\('message'/.test(health),
    'the health probe LISTENS rather than taking the port\'s one onmessage slot, so asking'
    + ' a lane how it is does not destroy its ability to answer');

  assert(/addEventListener\('message'[\s\S]{0,900}?type\s*!==\s*'fault'/.test(worklet)
    && !/const seen = node\.port\.onmessage/.test(worklet),
    'and the fault handler is a listener too, so nothing downstream can take its place');
  assert(/if \(healed\) return;[\s\S]{0,400}?type: 'panic'/.test(worklet),
    'a faulted lane panics ONCE to clear its state rather than filling silence for ever');

  // Polled and written down, because nobody is watching the console at the moment it goes.
  // The column table moved out with the CSV it describes — see tools/mixer-loop-log.js.
  const loopLog = read('tools/mixer-loop-log.js');
  for (const col of ['awBackend', 'awLanes', 'awGroups', 'awQueued', 'awFaults',
    'awUnresponsive', 'awDetached', 'awDropped']) {
    assert(new RegExp(`'${col}'`).test(loopLog), `the diagnostics CSV carries ${col}`);
  }
  assert(/function pollMrdr3Diagnostics\(/.test(entry)
    && /mrdr3LaneReport\(Audio\.ctx\)/.test(entry)
    && /pollMrdr3Diagnostics\(\);\s*\n\s*watchSilentTransport\(\);\s*\n\s*perfDiag\.sample\(\);/.test(entry)
    && /const HEALTH_TICK_MS = 250/.test(entry)
    && /setInterval\(checkAudioHealth, HEALTH_TICK_MS\)/.test(entry),
    'the desk polls every AW lane on the same heartbeat that samples everything else');
  // ---- the note cache must not render a struggling desk into silence ---------
  //
  // The trickle's clock brake has three bands: healthy renders, borderline holds, and
  // DROWNING renders anyway — the last on the grounds that a song which has never warmed
  // cannot get meaningfully worse and warming is the only way out. That was measured and
  // it is right for a cold start.
  //
  // It is wrong after an EDIT. Editing purges that voice's buffers while the transport is
  // running: the cache goes cold mid-flight, the backlog jumps, and the offline renders
  // draining it compete with live playback for the same CPU. Measured on a real session —
  // 107 notes queued, the audio clock at 0.698 and then 0.650, ending in silence. It can
  // get worse, and the escape is what let it.
  const trickle = voices.slice(voices.indexOf('function trickleAllowed('),
    voices.indexOf('export function createNoteCacheState'));
  assert(trickle.length > 200, 'the trickle brake is where this test thinks it is');
  assert(/state\.clockOk = healthy \|\| \(!state\.everHealthy && ratio < TRICKLE_DROWNING_CLOCK\);/.test(trickle),
    'the drowning escape applies only while this playback has NEVER seen a healthy clock —'
    + ' once it has, a collapse is load rather than coldness and more rendering is not the'
    + ' cure');
  assert(/if \(healthy\) state\.everHealthy = true;/.test(trickle),
    'and a healthy sample is what closes it');
  assert(/state\.everHealthy = false;/.test(voices)
    && /playbackSince = performance\.now\(\);[\s\S]{0,300}?everHealthy = false;/.test(voices),
    'each playback earns its own verdict — starting the transport clears it');

  // ---- the log must not simply STOP -----------------------------------------
  //
  // The desk's silence watchdog calls silence a fault only while output is EXPECTED —
  // the sequencer having just booked a note. That is blind to the opposite failure, where
  // the sequencer stops booking anything: nothing is expected, so silence is correct, so
  // no fault is raised, and because rows are written on events and laps the log simply
  // ends. A real session went quiet after a few edits and finished with a row saying OK.
  assert(/function watchSilentTransport\(/.test(entry)
    && /appendDiagnosticEvent\('TRANSPORT RUNNING, NOTHING SCHEDULED'/.test(entry)
    && /Audio\.outputExpected\?\.\(\)/.test(entry),
    'a transport that is playing while nothing is scheduled writes a row saying so');
  assert(/pollMrdr3Diagnostics\(\);\s*\n\s*watchSilentTransport\(\);/.test(entry)
    && /setInterval\(checkAudioHealth, HEALTH_TICK_MS\)/.test(entry),
    'and it runs off the 250ms health timer, which does not stop when the scheduler does');

  assert(/appendDiagnosticEvent\('MRDR-3 AW LANE DEAD'/.test(entry)
    && /appendDiagnosticEvent\('MRDR-3 AW DSP THREW'/.test(entry)
    && /appendDiagnosticEvent\('MRDR-3 AW LANE DETACHED'/.test(entry)
    && /if \(key === mrdr3DiagReported\) return;/.test(entry),
    'and raises a row on the TRANSITION — once, not once a second, or the moment it broke'
    + ' is buried under the seconds that followed');
}

// ---- 6. a lane is not "connected" unless something received it ---------------------
//
// A DISCONNECTED AudioWorkletNode IS NOT RENDERED — nothing pulls it, so `process()` is
// never called. That failure does not look like a crash from the outside, which is what
// made it expensive: the port still answers, so health reports arrive saying nothing is
// wrong; `schedule()` still queues, so the backlog climbs without bound; and `late`,
// `steals` and `groups` freeze, because `applyDue` only runs inside `process`.
//
// Measured on barber-7-copy: queued 122 -> 599 over two minutes, late stuck at 38, steals
// at 55, groups at 4, faults 0, context running, audio clock at 1.00.
//
// The cause was a booking made while the lane's destination was momentarily absent. The
// block disconnected the node first and then set `connected = true` whether or not `dry`
// or `wet` existed, so it never ran again and the lane was silent for the session.
{
  // Both method bodies, taken from their DECLARATIONS rather than from the first mention:
  // each is referred to by name in a comment hundreds of lines earlier.
  const bodyOf = (decl, end) => {
    const from = voices.indexOf(decl);
    return from < 0 ? '' : voices.slice(from, voices.indexOf(end, from));
  };
  const tngr2 = bodyOf('  _playTngr2Node(v, {', '  _playMrdr3Aw(v, {');
  const mrdr3 = bodyOf('  _playMrdr3Aw(v, {', '  _queueMrdr3(');
  const both = [['MRDR-3', mrdr3], ['TNGR-2', tngr2]];
  for (const [name, block] of both) {
    assert(block.length > 400, `${name}: the lane booking is where this test thinks it is`);
    // Two accepted spellings of the same question. MRDR-3 resolves the pair into named
    // destinations first, because it also has to remember WHICH pair it attached to —
    // see the assertion below — and TNGR-2 still asks it of the arguments directly.
    assert(/const canAttach = !!dry \|\| !!\(echo && wet\);/.test(block)
      || /const canAttach = !!dryDest \|\| !!wetDest;/.test(block),
      `${name}: the booking asks whether there is anywhere to attach to`);
    // The claim is that no path sets `connected = true` without that being true first.
    const marks = block.split('lane.connected = true;');
    assert(marks.length === 2 && /canAttach &&/.test(marks[0].slice(-600)),
      `${name}: and marks the lane connected in exactly one place, guarded by it`);
  }
  // ---- AND "CONNECTED" HAS TO NAME WHAT IT IS CONNECTED TO -------------------------
  //
  // The same failure has a second door. A lane whose destination is REPLACED — the gates
  // are cut and rebuilt on every re-bank, and a voice change on the desk comes back
  // through setBank — is wired to a node that no longer reaches anything, while a boolean
  // `connected` still says the work is done. Nothing pulls the node from then on, which
  // is the same unrendered silence arrived at from the other side. So the pair is written
  // down and compared, the way `_pool` already treats a different dry/wet as a different
  // graph.
  assert(/lane\.dryDest = dryDest;/.test(mrdr3) && /lane\.wetDest = wetDest;/.test(mrdr3),
    'MRDR-3: the booking writes down which destination pair it attached to');
  assert(/lane\.dryDest !== dryDest \|\| lane\.wetDest !== wetDest/.test(mrdr3),
    'MRDR-3: and a note whose destination has moved re-points the lane rather than'
    + ' trusting a boolean that cannot know');

  // ---- AND NO LANE OUTLIVES THE RACK STILL OWING IT --------------------------------
  //
  // The other door again, from the lifecycle side. The lane book is keyed on the CONTEXT,
  // so a lane the disposing rack leaves behind is a lane the NEXT rack inherits — still
  // marked connected, still wired to the gates `_cutLaneGates` has just cut.
  //
  // The two instruments answer that differently, and the difference is the point. TNGR-2
  // releases its context outright. MRDR-3 must not: building a lane structured-clones the
  // table pyramid and the noise set into the processor, and the desk re-banks on a stop,
  // a voice change or an apply — so releasing ten lanes and rebuilding them a bar later
  // charges ten clones to a rendering audio thread, which is audible as a crack. What it
  // owes instead is that nothing is left OWING: the queue is panicked, the patch re-syncs
  // on the next note, the output re-points when the gate has moved, and only lanes
  // nothing has played for a while are actually released.
  {
    const from = voices.indexOf('  dispose() {');
    const body = from < 0 ? '' : voices.slice(from, voices.indexOf('\n  }\n', from));
    assert(/releaseTngr2Context\(this\.ctx\)/.test(body),
      'TNGR-2 releases its lanes when the rack is disposed');
    assert(/mrdr3PanicAll\(this\.ctx/.test(body)
      && /releaseIdleMrdr3Lanes\(this\.ctx/.test(body),
      'and MRDR-3 clears every lane\'s queue and reaps only the idle ones, because'
      + ' rebuilding a lane is a clone of the pyramid and the desk re-banks constantly');
    assert(!/releaseMrdr3Context\(this\.ctx/.test(body),
      'and does NOT tear its lanes down wholesale on a re-bank — the node the last bar'
      + ' played is the node the next bar wants');
  }

  // The chorus rebuild must not swallow the key either: leaving `chorusKey` updated after
  // a rebuild that could not attach would skip the retry just as permanently.
  assert(!/lane\.chorusKey = chorusKey;\n    \}/.test(tngr2),
    'and a chorus rebuild that could not attach leaves the key alone, so the next note'
    + ' tries again rather than finding the work already marked done');
}

console.log(failed
  ? `\nMRDR-3 IDENTITY: ${failed} FAILED`
  : '\nMRDR-3 IDENTITY: OK');
process.exit(failed ? 1 : 0);
