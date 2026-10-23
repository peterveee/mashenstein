// THE AUDIO RESTART (Audio.rebuildRealtimeContext as the guard's RESTART lever; 22 Oct 2026).
//
// Peter, from the iPad: "I just want silence once the sound starts to sound bad… and then for
// audio to restart after". The restart closes the whole AudioContext — its backlog with it —
// and builds a new one with the song where its clock was. Live in headless WebKit, silently,
// with the game's settings (deep sleep, pool trim, song-change fade), mid-song:
//
//   1. The old context is closed and the new one is running; the mixer is ready.
//   2. The song is heard again on the new context, a few steps on from where it was.
//   3. A sound effect plays on the new context.
//   4. The FIRST restart is the game's warm one (23 Oct 2026): haltAudio, then
//      buildHaltedContext — the context built but not started, the mixer ready and the song's
//      worklet lanes made while it stands still — then resumeContext. The mixer and the lanes
//      are ready BEFORE the context runs; then the song and a cue are heard as in 2 and 3.
//   5. THE KICK (Audio.kickContext — the game's RESTART since 23 Oct 2026, Peter: "with
//      restartmode=kick it is fine"): the same context suspended, quiet, resumed. Checked first,
//      on the rebuilt context while it plays: the context is the same object and running, the
//      song goes on from where it was and a cue plays.
//   6. WebKit runs only a few realtime contexts at once, and a context made while an old one
//      still holds its place never starts (work/local/_probe-ctx-variants.mjs): the restart
//      waits for the close. A SECOND restart in the same page still leaves headless WebKit's
//      third context suspended — on a device that is the tap prompt's case (main.js
//      audioRestart), so here it is checked to be built, closed-behind and ready, and whether
//      it ran is reported, not asserted.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = false;
const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); failed = true; } else console.log('ok:', msg); };

const ENTRY = `
import { Audio } from ${JSON.stringify(join(ROOT, 'src/engine/audio.js'))};
import * as MIXER from ${JSON.stringify(join(ROOT, 'src/engine/mixer.js'))};
import * as VE from ${JSON.stringify(join(ROOT, 'src/engine/voices.js'))};
import * as GRAVITY from ${JSON.stringify(join(ROOT, 'src/data/songs/gravity.js'))};
window.run = async () => {
  // Silent: every context's speakers are reached through a gain of 0.
  const conn = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (d, ...r) {
    if (d instanceof AudioDestinationNode && !(d.context instanceof OfflineAudioContext) && !this.__sink) {
      if (!d.__mute) { const z = d.context.createGain(); z.gain.value = 0; z.__sink = true; conn.call(z, d); d.__mute = z; }
      return conn.call(this, d.__mute, ...r);
    }
    return conn.call(this, d, ...r);
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const heard = async (ms) => {
    const an = Audio.ctx.createAnalyser(); an.fftSize = 1024; Audio.master.connect(an);
    const buf = new Float32Array(1024); let peak = 0; const end = performance.now() + ms;
    while (performance.now() < end) { await wait(40); an.getFloatTimeDomainData(buf); for (const v of buf) peak = Math.max(peak, Math.abs(v)); }
    try { Audio.master.disconnect(an); } catch {}
    return peak;
  };
  MIXER.setParkMutedEffects(true); MIXER.setDeepSleep(true); VE.setTrimIdleSlots(true);
  Audio.setMrdrQuality('phone'); Audio.setMixerMeteringEnabled(false); Audio.setCaptureEnabled(false); Audio.setSilentLaneSkip(true);
  Audio.fadeSongChanges = true;
  Audio.ensure(); await Audio.ctx.resume(); if (Audio.mixer) await Audio.mixer.ready;
  Audio.setBank(GRAVITY.bank, GRAVITY.mix, GRAVITY.arrangement);
  await wait(2500);
  const before = await heard(2000);
  let kick = null;
  const out = [];
  for (let i = 0; i < 2; i++) {
    if (i === 1) {
      // The kick, on the first rebuilt context while it plays.
      const kickCtx = Audio.ctx; const kickStepBefore = Audio.step;
      const kickState = await Promise.race([Audio.kickContext(600), wait(5000).then(() => 'timeout')]);
      const kickAfter = await heard(2000);
      kick = { state: kickState, same: Audio.ctx === kickCtx, running: Audio.ctx?.state, stepBefore: kickStepBefore, stepAfter: Audio.step, after: kickAfter };
      Audio.sfx('jump'); kick.sfx = await heard(600);
      await wait(500);
    }
    const old = Audio.ctx; const stepBefore = Audio.step;
    const t0 = performance.now();
    let ok, warm = null;
    if (i === 0) {
      // The game's path (main.js audioRestart, 'warm'): built standing still, warmed, then started.
      ok = await Promise.race([Audio.haltAudio(), wait(8000).then(() => 'timeout')]);
      if (ok === true) {
        const builtOk = await Promise.race([Audio.buildHaltedContext({ deadlineMs: 8000 }), wait(9000).then(() => 'timeout')]);
        const stateBeforeStart = Audio.ctx?.state;
        const mixerReadyBeforeStart = await Promise.race([Audio.mixer?.ready?.then(() => true), wait(10).then(() => false)]);
        warm = { builtOk, stateBeforeStart, mixerReadyBeforeStart, warmed: Audio.lastWarm, warmMs: Math.round(performance.now() - t0) };
        Audio.resumeContext();
      }
    } else {
      ok = await Promise.race([Audio.rebuildRealtimeContext(), wait(8000).then(() => 'timeout')]);
    }
    const built = performance.now() - t0;
    const running = await Audio.contextRunning(2500);
    const ready = await Promise.race([Audio.mixer?.ready?.then(() => true), wait(5000).then(() => false)]);
    const after = await heard(3000);
    Audio.sfx('jump');
    const sfx = await heard(600);
    out.push({ ok, built: Math.round(built), oldState: old.state, fresh: Audio.ctx !== old, running, state: Audio.ctx.state, ready, stepBefore, stepAfter: Audio.step, after, sfx, warm });
    await wait(1500);
  }
  return { before, kick, out };
};`;

const esbuild = require('esbuild');
const built = await esbuild.build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' }, bundle: true, format: 'iife', write: false, logLevel: 'silent' });
const html = `<!doctype html><meta charset="utf-8"><script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}</script>`;
const { webkit } = require('playwright');
const browser = await webkit.launch();
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('https://mashenstein.live/', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: html }));
  await page.goto('https://mashenstein.live/');
  const { before, kick, out } = await page.evaluate(() => window.run());
  assert(errors.length === 0, `no page errors${errors.length ? `: ${errors[0]}` : ''}`);
  assert(before > 0.01, `the song is heard before (peak ${before.toFixed(3)})`);
  assert(kick.state === 'running' && kick.same && kick.running === 'running', `kick: the same context is running again (${kick.state})`);
  assert(kick.after > 0.01, `kick: the song is heard again (peak ${kick.after.toFixed(3)})`);
  assert(kick.stepAfter > kick.stepBefore && kick.stepAfter - kick.stepBefore < 96, `kick: the song went on from where it was (step ${kick.stepBefore} → ${kick.stepAfter})`);
  assert(kick.sfx > 0.01, `kick: a sound effect plays after it (peak ${kick.sfx.toFixed(3)})`);
  out.forEach((r, i) => {
    const n = i + 1;
    assert(r.ok === true && r.fresh && r.oldState === 'closed', `restart ${n}: the old context is closed and a new one built in ${r.built} ms`);
    assert(r.ready, `restart ${n}: the mixer is ready`);
    if (r.warm) {
      assert(r.warm.builtOk === true, `restart ${n}: built warm (buildHaltedContext ${r.warm.builtOk}) in ${r.warm.warmMs} ms`);
      // Headless WebKit starts a fresh context by itself (autoplay allowed); a device that
      // needs a tap leaves it suspended, which is the case the warm-up is for. Reported.
      console.log(`note: restart ${n}: the warmed context was ${r.warm.stateBeforeStart} before resumeContext; warm-up ${JSON.stringify(r.warm.warmed)}`);
      assert(r.warm.mixerReadyBeforeStart, `restart ${n}: the mixer's worklets were ready before the context was started`);
      assert(r.warm.warmed?.complete && r.warm.warmed.lanes > 0, `restart ${n}: the song's worklet lanes were built before the start (${r.warm.warmed?.lanes})`);
    }
    if (n === 1 || r.running) {
      assert(r.running && r.state === 'running', `restart ${n}: the new context is running (${r.state})`);
      assert(r.after > 0.01, `restart ${n}: the song is heard again (peak ${r.after.toFixed(3)})`);
      assert(r.stepAfter > r.stepBefore && r.stepAfter - r.stepBefore < 96, `restart ${n}: the song went on from where it was (step ${r.stepBefore} → ${r.stepAfter})`);
      assert(r.sfx > 0.01, `restart ${n}: a sound effect plays on the new context (peak ${r.sfx.toFixed(3)})`);
    } else {
      console.log(`note: restart ${n}: the new context is ${r.state} — headless WebKit's third context; the game asks for a tap here`);
    }
  });
} finally {
  await browser.close();
}
console.log(failed ? 'AUDIO RESTART: FAILED' : 'AUDIO RESTART: PASSED');
if (failed) process.exitCode = 1;
