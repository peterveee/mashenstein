// THE CEILING (mixer.js CEILING) and the Lab's MASTER fader, on a live graph in a real browser:
// a song switches the ceiling on with `ceiling: true` and every other song has it off; under its
// threshold it hands back what it is given (its make-up gain taken back off); twelve dB of overs
// come out under full scale; its meter reads what goes in; and setMasterLevel is a gain ahead of
// it that no song change moves.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { openLiveBrowser } from './lib/live-browser.js';

const bundle = await build({ stdin: { contents: `import {Audio} from './src/engine/audio.js'; import {bank,mix} from './src/data/songs/rhythm.js'; window.audio = Audio; window.rhythm = {bank,mix};`,
  resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife' });
const host = await openLiveBrowser();
const { browser, origin } = host;
try {
  const page = await browser.newPage();
  await page.goto(origin);
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const r = await page.evaluate(async () => {
    const A = window.audio;
    A.setMixerMeteringEnabled(false);   // as the game has it
    A.ensure();
    await A.ctx.resume();
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const out = {};
    // a song with it, then a song without: applyMix decides, every time
    A.applyMix(window.rhythm.bank, { ...window.rhythm.mix, master: 0, masterEffects: [], ceiling: true });
    out.onWithFlag = A.mixer.ceilingOn;
    A.applyMix(window.rhythm.bank, window.rhythm.mix);
    out.offWithout = !A.mixer.ceilingOn;
    // a steady tone straight into a strip, the song's bus open, and songOut (after the ceiling) read
    A.applyMix(window.rhythm.bank, { ...window.rhythm.mix, master: 0, masterEffects: [], ceiling: true });
    A.songTrim.gain.cancelScheduledValues(0);
    A.songTrim.gain.value = 1;
    const osc = A.ctx.createOscillator();
    osc.frequency.value = 220;
    const amp = A.ctx.createGain();
    osc.connect(amp); amp.connect(A.musicBus); osc.start();
    const tap = A.ctx.createAnalyser(); tap.fftSize = 2048; A.songOut.connect(tap);
    const buf = new Float32Array(2048);
    const read = async () => {
      await wait(250);
      let inPk = 0, outPk = 0, red = 0;
      for (let k = 0; k < 6; k++) {
        await wait(40);
        const m = A.mixer.ceilingLevels();
        inPk = Math.max(inPk, ...m.peaks); red = Math.min(red, m.reduction);
        tap.getFloatTimeDomainData(buf);
        for (const v of buf) outPk = Math.max(outPk, Math.abs(v));
      }
      return { inPk, outPk, red };
    };
    const quiet = 0.3;
    amp.gain.value = quiet;
    out.quiet = await read();
    // then 12 dB over full scale at the ceiling, from what the quiet tone measured there
    const loud = quiet * 10 ** (12 / 20) / out.quiet.inPk;
    amp.gain.value = loud;
    out.loud = await read();
    // the MASTER fader: ahead of the ceiling, so half is half going in; and no song change moves it
    amp.gain.value = quiet;
    A.mixer.setMasterLevel(0.5);
    out.half = await read();
    A.applyMix(window.rhythm.bank, { ...window.rhythm.mix, master: 0, masterEffects: [], ceiling: true });
    out.halfAfterApply = await read();
    A.mixer.setMasterLevel(1);
    // out: the meter reads nothing, and the same loud tone goes straight past
    A.mixer.setCeiling(false);
    amp.gain.value = loud;
    out.offLoud = await read();
    osc.stop();
    clearInterval(A.timer); await A.ctx.close();
    return out;
  });
  const db = (v) => 20 * Math.log10(v);
  assert(r.onWithFlag && r.offWithout, 'a song with `ceiling: true` has it on, a song without has it off');
  assert(Math.abs(db(r.quiet.outPk) - db(r.quiet.inPk)) < 0.2 && r.quiet.red === 0,
    `under the threshold the ceiling is a wire (${db(r.quiet.inPk).toFixed(2)} in, ${db(r.quiet.outPk).toFixed(2)} out, ${r.quiet.red})`);
  assert(db(r.loud.inPk) > 8 && db(r.loud.outPk) < -0.5 && r.loud.red < -6,
    `12 dB over goes in and comes out under full scale (${db(r.loud.inPk).toFixed(2)} in, ${db(r.loud.outPk).toFixed(2)} out, ${r.loud.red.toFixed(2)} dB)`);
  assert(Math.abs(db(r.half.inPk) - (db(r.quiet.inPk) - 6.02)) < 0.3,
    `MASTER at a half: 6 dB less into the ceiling (${db(r.half.inPk).toFixed(2)})`);
  assert(Math.abs(db(r.halfAfterApply.inPk) - db(r.half.inPk)) < 0.2, 'and no song change moves it');
  assert(r.offLoud.inPk === 0 && db(r.offLoud.outPk) > 6, `switched out: no meter, and nothing held down (${db(r.offLoud.outPk).toFixed(2)})`);
  console.log('ok: the Lab ceiling and MASTER fader', JSON.stringify({
    quiet: [db(r.quiet.inPk), db(r.quiet.outPk)].map((v) => +v.toFixed(2)),
    loud: [db(r.loud.inPk), db(r.loud.outPk), r.loud.red].map((v) => +v.toFixed(2)),
  }));
} finally {
  await host.close();
}
