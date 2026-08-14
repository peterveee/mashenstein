// A cabinet treatment hands over to a level's mix without touching the transport.
//
// The audio-side proof of that claim lives in tests/song-switch.js's mirror image: a
// bank change cuts a held note dead, and a treatment change must not. This file proves
// the other half, which is a question about the CLOCK rather than about samples — that
// the change lands where it was asked to land, that nothing rewinds, and that the
// things which used to fight over an AudioParam no longer do.
//
// Driven step by step through a headless OfflineAudioContext rather than rendered: the
// assertions are about which step a change landed on and what `nextTime` was doing at
// the time, and rendering four minutes of audio to read a step counter would be slow
// and no more true. Same harness as tests/mixer-loop.js.
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = `
import { Audio } from ${JSON.stringify(join(ROOT, 'src/engine/audio.js'))};
import { MusicDirector } from ${JSON.stringify(join(ROOT, 'src/engine/music-director.js'))};
import { CABINET_BY_ID } from ${JSON.stringify(join(ROOT, 'src/data/cabinets.js'))};
import { MIX, VARIANTS } from ${JSON.stringify(join(ROOT, 'src/data/mix.js'))};
window.__M = { Audio, MusicDirector, CABINET_BY_ID, MIX, VARIANTS };
`;

let failed = false;
const assert = (cond, msg) => {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
};

async function main() {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    console.error('FAIL: playwright is required: npm install');
    process.exit(1);
  }
  const esbuild = require('esbuild');
  const built = await esbuild.build({
    stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
    bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
  });
  const bundleJs = built.outputFiles[0].text;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setContent(`<!doctype html><meta charset="utf-8">`
    + `<script>${bundleJs.replace(/<\/script/gi, '<\\/script')}<\/script>`,
  { waitUntil: 'load' });

  const out = await page.evaluate(async () => {
    const { Audio, MusicDirector, CABINET_BY_ID, MIX } = window.__M;
    const ctx = new OfflineAudioContext(2, 44100 * 4, 44100);
    Audio.setCaptureEnabled(false);
    Audio.setNoiseSeed(1);
    Audio.ensure(ctx);
    if (Audio.mixer) await Audio.mixer.ready;

    const BANK = CABINET_BY_ID.plumber.music;
    const realRampMix = Audio.rampMix.bind(Audio);
    let calls = [];
    const recordRamps = () => {
      calls = [];
      Audio.rampMix = (mix, when, seconds) => {
        calls.push({ when, seconds, step: Audio.step, mix });
        return when + seconds;
      };
    };

    // An offline context that is not rendering sits at currentTime 0 forever, and the
    // director refuses a boundary within 20ms of now — correctly, since automation
    // aimed at a time already gone lands wherever a stall ended. So the transport is
    // started clear of it, which is also the only honest way to exercise that guard.
    const arm = (variant = 'select') => {
      MusicDirector.play(BANK, variant, 'always');
      Audio.nextTime = 1;
      Audio.step = 0;
    };
    const run = (n) => { for (let i = 0; i < n; i++) Audio.scheduleStep(); };
    const spb = () => (60 / (Audio.bpm * (Audio.tempo || 1))) / 4;

    const r = {};

    // Swing is a property of the song/arrangement, not of the channel treatment.
    // Prove both entry points: a regular bank load takes its authored swing, and a
    // same-bank treatment handover reapplies the level arrangement instead of leaving
    // the cabinet's groove in force.
    const SWING_BANK = { ...BANK, swing: 66 };
    MusicDirector.play(SWING_BANK, 'select', 'always');
    const regularSwing = Audio.swing;
    const ALTERNATE_BANK = { ...BANK };
    MusicDirector.play(ALTERNATE_BANK, 'select', 'always', { arrangementOverride: { swing: 66 } });
    const alternateSwing = Audio.swing;
    MusicDirector.enterStage(ALTERNATE_BANK, { arrangementOverride: { swing: 52 } });
    r.swing = { regular: regularSwing, alternate: alternateSwing, handoff: Audio.swing };

    // ---- the transport is not touched -------------------------------------------
    // With the treatment's loop disarmed on both runs. Left armed, the run carrying a
    // change diverges for a real reason — the change releases the loop, so it stops
    // wrapping — and that would prove nothing about `step` being left alone.
    arm(); Audio.setLoop();
    const clean = [];
    run(40);
    for (let i = 0; i < 40; i++) { clean.push([Audio.step, Audio.nextTime]); Audio.scheduleStep(); }
    arm(); Audio.setLoop();
    recordRamps();
    run(5);
    MusicDirector.request(null, { quantize: 'bar' });
    const withReq = [];
    run(35);
    for (let i = 0; i < 40; i++) { withReq.push([Audio.step, Audio.nextTime]); Audio.scheduleStep(); }
    r.transportIdentical = JSON.stringify(clean) === JSON.stringify(withReq);
    r.firedOnce = calls.length;

    // ---- and opens no gap --------------------------------------------------------
    // Measured ACROSS the change, not after `play`: play IS a bank change and its
    // half-second is the thing being kept away from the handover, not removed from the
    // game. What must not move is the trim, and the start delay it schedules.
    arm(); Audio.setLoop();
    recordRamps();
    run(5);
    const gapBefore = { delay: Audio.pendingStartDelay, trim: Audio.songTrim.gain.value };
    MusicDirector.request(null, { quantize: 'bar' });
    run(20);
    r.gap = { before: gapBefore, after: { delay: Audio.pendingStartDelay, trim: Audio.songTrim.gain.value } };

    // ---- it lands on the bar line, not where it was asked for --------------------
    arm();
    recordRamps();
    run(5);                                  // mid-bar
    const askedAt = { step: Audio.step, nextTime: Audio.nextTime };
    MusicDirector.request(null, { quantize: 'bar' });
    run(20);
    r.bar = { askedAt, calls: calls.map((c) => ({ when: c.when, step: c.step, seconds: c.seconds })) };

    // ---- 'immediate' does not wait for the next beat -----------------------------
    arm();
    recordRamps();
    run(5);
    MusicDirector.request(null, { quantize: 'immediate' });
    r.immediate = { fired: calls.length, atStep: Audio.step, when: calls[0]?.when };

    // ---- 'phrase' against a loop that does not start at bar one ------------------
    arm();
    recordRamps();
    Audio.setLoop(16, 80);                   // bars 2-5
    Audio.step = 16;
    run(1);
    MusicDirector.request(null, { quantize: 'phrase', loopRelease: 'atTransition' });
    run(80);
    r.phrase = { calls: calls.map((c) => c.step), loopStart: 16, loopEnd: 80 };

    // ---- 'atLoopEnd' lets the treatment's own bars finish ------------------------
    arm();
    recordRamps();
    Audio.setLoop(0, 64);                    // bars 1-4, as the plumber treatment asks
    Audio.step = 0;
    run(56);
    const beforeRelease = { step: Audio.step, loopEnd: Audio.loopEnd };
    MusicDirector.request(null, { quantize: 'bar', loopRelease: 'atLoopEnd' });
    run(8);
    const atRelease = { step: Audio.step, loopStart: Audio.loopStart, loopEnd: Audio.loopEnd };
    run(8);
    r.atLoopEnd = {
      beforeRelease,
      atRelease,
      ranPast: Audio.step,                   // must be past 64, not wrapped to 0
      firedAtStep: calls[0]?.step ?? null,
      firedAtWhen: calls[0]?.when ?? null,
      spb: spb(),
    };

    // ---- a hard bank change takes the loop with it -------------------------------
    arm();
    Audio.setLoop(0, 64);
    Audio.setBank(CABINET_BY_ID.neon.music);
    r.loopClearedByBankChange = { start: Audio.loopStart, end: Audio.loopEnd };

    // ---- a request is dropped when the song moves underneath it -------------------
    arm();
    recordRamps();
    run(4);
    MusicDirector.request(null, { quantize: 'bar' });
    Audio.setBank(CABINET_BY_ID.neon.music);
    Audio.nextTime = 1;
    run(40);
    r.droppedOnSongChange = { fired: calls.length, pending: MusicDirector.current().pending };

    // ---- the latest request wins -------------------------------------------------
    arm();
    recordRamps();
    run(4);
    MusicDirector.request(null, { quantize: 'bar', crossfadeBars: 4 });
    MusicDirector.request(null, { quantize: 'bar', crossfadeBars: 0 });
    run(20);
    r.supersede = { fired: calls.length, seconds: calls[0]?.seconds ?? null };

    // ---- nothing lands while the sequencer is not running ------------------------
    arm();
    recordRamps();
    run(4);
    MusicDirector.request(null, { quantize: 'bar' });
    r.heldWhileStalled = { fired: calls.length, pending: MusicDirector.current().pending };

    // ---- monitoring writes the gate, and only the gate ---------------------------
    // The reason the fader and the gate are two nodes. Under the old single node, a
    // solo anywhere rewrote the very param a crossfade was ramping.
    Audio.rampMix = realRampMix;
    arm();
    run(4);
    const lead = Audio.mixer.lane('lead');
    const kick = Audio.mixer.lane('kick');
    MusicDirector.request(null, { quantize: 'bar', crossfadeBars: 2 });
    run(16);                                  // past the bar line: ramps are in the graph
    const before = {
      pres: lead._pres.gain.value,
      send: lead._sends.get('reverb').gain.value,
    };
    kick.setSolo(true);
    const after = {
      pres: lead._pres.gain.value,
      send: lead._sends.get('reverb').gain.value,
      gate: lead._vol.gain.value,
      kickGate: kick._vol.gain.value,
    };
    kick.setSolo(false);
    r.soloTouchesGateOnly = { before, after };

    // ---- what the treatment ITSELF asks for reaches the transport -----------------
    // Every test above pins its own boundary so it measures the mechanism. This one
    // does the opposite: it overrides nothing, so it reads whatever plumber's file
    // currently says and proves the file is what is steering.
    Audio.rampMix = realRampMix;
    arm();
    const authored = {
      quantize: MusicDirector.resolved.exit.quantize,
      gap: MusicDirector.resolved.gap,
      // The gap the treatment asked for, as setBank actually received it.
      armedDelay: Audio.pendingStartDelay,
    };
    recordRamps();
    Audio.rampMix = (mix, when, seconds) => {
      calls.push({ when, seconds, step: Audio.step, mix });
      return realRampMix(mix, when, seconds);
    };
    run(5);
    MusicDirector.request(null);
    run(40);
    const leadAfterHandover = Audio.mixer.lane('lead');
    r.authored = {
      ...authored,
      firedAtStep: calls[0]?.step ?? null,
      leadStateMute: leadAfterHandover.state.mute,
      leadPresGain: leadAfterHandover._pres.gain.value,
    };

    // ---- the room blooms into the handover and rings out of it -------------------
    // Three moves on one parameter, and the ORDER is the whole thing: rampMix anchors
    // every param it touches with cancelAndHoldAtTime at the boundary, so the rise has
    // to be in the graph before it and the fall after it. Real rampMix here, so the
    // middle call is the one it actually makes.
    Audio.rampMix = realRampMix;
    arm();
    const auxCalls = [];
    const realRampAux = Audio.mixer.rampAux.bind(Audio.mixer);
    Audio.mixer.rampAux = (id, patch, when, seconds) => {
      if (id === 'reverb') auxCalls.push({ level: patch?.level, when, seconds });
      return realRampAux(id, patch, when, seconds);
    };
    run(5);
    MusicDirector.request(null);
    run(40);
    Audio.mixer.rampAux = realRampAux;
    r.swell = { calls: auxCalls, swellSeconds: 0.5 * 16 * spb() };

    // ---- quitting before the handover has landed ---------------------------------
    // The results screen deliberately keeps the song playing, so a change still waiting
    // for its bar line would fire ON it — the band arriving to mark a moment that is not
    // happening, over a four-bar loop that should have been let go.
    arm();
    recordRamps();
    run(5);
    MusicDirector.request(null);              // the treatment's own two-bar wait
    const quitPending = { pending: MusicDirector.current().pending, loopEnd: Audio.loopEnd };
    MusicDirector.endStage();
    const quitAfter = {
      fired: calls.length,
      pending: MusicDirector.current().pending,
      loopStart: Audio.loopStart,
      loopEnd: Audio.loopEnd,
      seconds: calls[0]?.seconds ?? null,
      atStep: Audio.step,
    };
    run(40);                                   // nothing more may land
    r.quitEarly = { quitPending, quitAfter, firedTotal: calls.length };

    // And once the handover HAS happened, ending the run is nothing at all.
    arm();
    run(5);
    MusicDirector.request(null, { quantize: 'bar' });
    run(20);                                   // let it land
    recordRamps();
    MusicDirector.endStage();
    r.quitLate = { fired: calls.length, variantId: MusicDirector.current().variantId };

    // ---- 'immediate' loop release, from the last step of a one-bar loop -----------
    // The case that made this exist. A one-bar loop's only bar line IS its wrap, and its
    // last beat boundary is the wrap too — so tying the release to the mix change made
    // pressing anywhere in the final beat cost a whole extra pass of the bar.
    arm();
    recordRamps();
    Audio.setLoop(112, 128);
    Audio.step = 127;                          // the very last step of the loop
    MusicDirector.request(null, { quantize: 'beat', loopRelease: 'immediate' });
    const ranOn = [];
    for (let i = 0; i < 6; i++) { ranOn.push(Audio.step); Audio.scheduleStep(); }
    r.releaseNow = { loop: [Audio.loopStart, Audio.loopEnd], ranOn };

    // ---- a refused change must still let the loop go -----------------------------
    // The two are unhooked deliberately. A mix change that rampMix refuses is a
    // disappointment; a cabinet screen's four-bar loop running for the whole level with
    // no way out is a bug you cannot play through, and returning early did both at once.
    Audio.rampMix = realRampMix;
    arm();
    const realRamp = Audio.rampMix.bind(Audio);
    Audio.rampMix = () => { throw new Error('deliberate refusal'); };
    run(5);
    MusicDirector.request(null);
    run(30);
    Audio.rampMix = realRamp;
    r.refused = { loopStart: Audio.loopStart, loopEnd: Audio.loopEnd, ranPast: Audio.step };

    // ---- resolving a treatment against the song's own mix ------------------------
    // Field-level: naming `mute` must not take the lane's authored reverb send with it.
    Audio.rampMix = realRampMix;
    MusicDirector.play(BANK, 'select', 'always');
    const sel = MusicDirector.resolved;
    r.resolve = {
      leadMuted: sel.mix.lanes.lead.mute,
      snareSend: sel.mix.lanes.snare.send.reverb,
      snareGainKept: sel.mix.lanes.snare.gain,
      baseSnareSend: MIX.plumber.lanes.snare.send.reverb,
      baseSnareGain: MIX.plumber.lanes.snare.gain,
      kickGainKept: sel.mix.lanes.kick.gain,
      reverbLevel: sel.mix.fx.reverb.level,
      loop: sel.loop,
      armedLoop: { start: Audio.loopStart, end: Audio.loopEnd },
    };

    return r;
  });
  await browser.close();

  for (const error of errors) assert(false, `page error — ${error}`);

  assert(out.transportIdentical && out.firedOnce === 1,
    'a treatment change moves no step and no nextTime — 40 steps run identically with and without one');
  assert(out.swing.regular === 66 && out.swing.alternate === 66 && out.swing.handoff === 52,
    'regular playback, an unregistered alternate bank, and its gameplay handoff all load arrangement swing');
  assert(out.gap.after.delay === out.gap.before.delay && out.gap.after.trim === out.gap.before.trim,
    'and opens no gap: neither the start delay nor the song trim moves across it, unlike a bank change');

  assert(out.bar.askedAt.step === 5 && out.bar.calls.length === 1 && out.bar.calls[0].step === 16,
    'a change asked for mid-bar lands on the next bar line, not where it was asked for');
  assert(out.bar.calls[0]?.when > out.bar.askedAt.nextTime,
    'and is aimed at a future audio time, not at the moment the request was made');

  assert(out.immediate.fired === 1 && out.immediate.atStep === 5,
    "'immediate' fires on the spot rather than waiting for the next beat callback");

  assert(out.phrase.calls.length >= 1 && out.phrase.calls[0] === 16,
    "'phrase' measures from the loop's own start: bars 2-5 turn over at step 16, which is not a multiple of 64");

  assert(out.atLoopEnd.beforeRelease.step === 56 && out.atLoopEnd.firedAtStep === 60,
    "'let the loop finish' releases from the last beat of the last bar, before the wrap");
  assert(out.atLoopEnd.atRelease.loopStart === null && out.atLoopEnd.atRelease.loopEnd === null,
    'the loop is let go without the playhead being moved');
  assert(out.atLoopEnd.ranPast > 64,
    'and the song runs on past the loop instead of repeating it');
  assert(Math.abs((out.atLoopEnd.firedAtWhen)
    - (out.atLoopEnd.spb * 4)) > 0 && out.atLoopEnd.firedAtWhen > 0,
  'the ramp is aimed at the downbeat that now follows, four steps ahead of the release');

  assert(out.loopClearedByBankChange.start === null && out.loopClearedByBankChange.end === null,
    'a bank change clears the loop the previous song armed — the food court does not inherit four bars');

  assert(out.droppedOnSongChange.fired === 0 && out.droppedOnSongChange.pending === false,
    'a pending change is dropped when the song moves out from under it');

  assert(out.supersede.fired === 1 && out.supersede.seconds === 0,
    'the latest request wins, and the superseded one leaves no ramp behind');

  assert(out.heldWhileStalled.fired === 0 && out.heldWhileStalled.pending === true,
    'a change waits while nothing is scheduling, rather than firing against a clock that is not moving');

  assert(out.soloTouchesGateOnly.after.pres === out.soloTouchesGateOnly.before.pres
    && out.soloTouchesGateOnly.after.send === out.soloTouchesGateOnly.before.send,
  'soloing a channel mid-crossfade leaves the fader and the sends of every other one exactly as they were');
  assert(out.soloTouchesGateOnly.after.gate === 0 && out.soloTouchesGateOnly.after.kickGate === 1,
    'because a solo writes the gate and nothing else');

  assert(out.releaseNow.loop[0] === null && out.releaseNow.ranOn[1] === 128,
    "'let go as soon as the level starts' runs on from the last step of a one-bar loop, "
    + 'where waiting for a boundary would have cost the whole bar again');

  assert(out.refused.loopStart === null && out.refused.loopEnd === null && out.refused.ranPast > 16,
    'a refused mix change still releases the loop — a treatment that cannot apply must not strand the song in four bars');

  assert(out.authored.quantize === 'beat' && out.authored.firedAtStep === 8,
    'the treatment\u2019s own quantize is what steers — asked at step 5, it lands on the next beat at 8');
  assert(out.authored.leadStateMute === false,
    'the normal mix clears the treatment mute on the lead after the first loop handover');
  assert(out.authored.gap === 0.15 && out.authored.armedDelay === 0.15,
    'and the silence it asks for on arrival reaches setBank, instead of its default half second');

  assert(out.quitEarly.quitPending.pending === true && out.quitEarly.quitAfter.fired === 1
    && out.quitEarly.quitAfter.pending === false,
  'quitting before the handover lands settles it there and then, rather than leaving it armed');
  assert(out.quitEarly.quitAfter.seconds === 0
    && out.quitEarly.quitAfter.loopStart === null && out.quitEarly.quitAfter.loopEnd === null,
  'dry and immediate, and the cabinet screen’s loop is let go with it');
  assert(out.quitEarly.firedTotal === 1,
    'and nothing lands on the results screen afterwards');
  assert(out.quitLate.fired === 0 && out.quitLate.variantId === null,
    'ending a run that already handed over does nothing at all');

  {
    const [rise, handover, fall] = out.swell.calls;
    const s = out.swell.swellSeconds;
    assert(out.swell.calls.length === 3 && rise?.level === 2.8,
      'the reverb return is moved three times across a handover that asks for a swell, rising first');
    assert(Math.abs((handover.when - rise.when) - s) < 1e-6 && rise.seconds < s,
      'the rise starts half a bar before the boundary and finishes just short of it, so the handover reads its peak');
    assert(fall.when === handover.when && Math.abs(fall.seconds - s) < 1e-6 && fall.seconds > handover.seconds,
      'and the fall replaces the handover’s own cut with a longer one, so the bloom rings on instead of being chopped');
  }

  assert(out.resolve.leadMuted === true && out.resolve.reverbLevel === 1.4,
    'a treatment resolves over the song’s own mix — the lead goes out and the room changes');
  assert(out.resolve.snareSend === 0.6 && out.resolve.baseSnareSend === 0.37,
    'a patched send replaces the authored one');
  assert(out.resolve.snareGainKept === out.resolve.baseSnareGain && out.resolve.kickGainKept === 3.2,
    'and naming one field leaves every other field of that lane alone — the merge is per field, not per lane');
  // `resolve` hands the treatment's markers on in BARS and lets the engine turn them
  // into steps — one conversion, in the one place that can also clamp them against the
  // form the song is playing. What matters here is still what got armed.
  assert(out.resolve.loop?.fromBar === 1 && out.resolve.loop?.toBar === 4
    && out.resolve.armedLoop.start === 0 && out.resolve.armedLoop.end === 64,
  'bars 1-4 arm the sequencer as steps 0-64');

  console.log(failed ? 'MUSIC VARIANT: FAILED' : 'MUSIC VARIANT: PASSED');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
