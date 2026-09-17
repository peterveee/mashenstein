// SEPARATE MUSIC AND SFX STEMS OFF A REAL PLAYTHROUGH, plus a cue sheet.
//
// The question this exists to answer is "is that cue actually on the beat", and
// no single mixed recording can answer it: the two sounds are summed by the time
// they reach a file, and an ear that already suspects a cue is late is not
// evidence. So the bot plays a stage for real, on the dev server, while two taps
// sit on the buses — one on musicGain, one on sfxGain — and write the same span
// of time to two files, sample-for-sample aligned by construction because they
// are fed by one context and started on one frame.
//
// Drop the three on a timeline at unity and they sum back to what the speakers
// got — musicGain, sfxGain and the solo bus are the only things feeding master
// at unity, so the sum is the master bus by construction. The one exception is
// the reversed-audio output the rewind power-up plays, which bypasses master
// entirely and so appears in none of the three.
//
// Line the blast up against the kick and the answer is in front of you.
//
// Usage: node tools/record-stage-stems.js [stage] [hero] [seed] [outDir]
//   node tools/record-stage-stems.js rhythm-1 lorenzo 7
//
// Needs the dev server on :8001 (npm run dev). Runs in real time — a rhythm
// stage is about ninety seconds — because the game is genuinely playing.
//
// WHAT IS NOT IN THE SFX STEM. The blast's echo send returns through songTrim,
// which is on the music side of the graph (see the echoBus note in audio.js), so
// a cue's room lands in the music stem rather than the SFX one. It is a tail at
// 0.039 of the cue, well under anything you would measure a transient against,
// but it is why the SFX stem sounds drier than the game.
import { writeFileSync, mkdirSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const PW = '/Users/Peter/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';

const [, , stage = 'rhythm-1', hero = 'lorenzo', seed = '7', outArg = null] = process.argv;
const DIR = outArg || `work/stems/${stage}-gameplay`;
const URL_BASE = 'http://localhost:8001';

const { chromium } = await import(PW);

// 32-BIT FLOAT, at whatever rate the context actually chose.
//
// Float because a bus tap is not a master: musicGain measured over full scale on
// the first capture, and a 16-bit write clamped it — so the file showed square
// tops that the game does not have, on the one kind of file whose entire job is
// to be believed. Float stores what the bus actually carried, however hot, and
// every editor reads it.
//
// The rate is read rather than assumed. Not tools/lib/wav.js: that writes a
// fixed 44100 header, and this context came back at 48000, which would have
// written the capture 8% slow — which on a file about timing is the one bug that
// matters most.
function wav(chans, rate) {
  const nch = chans.length, frames = chans[0].length;
  const bytes = frames * nch * 4;
  const out = new Uint8Array(68 + bytes);
  const v = new DataView(out.buffer);
  const tag = (s, at) => { for (let i = 0; i < s.length; i++) v.setUint8(at + i, s.charCodeAt(i)); };
  // WAVE_FORMAT_IEEE_FLOAT (3) needs an 18-byte fmt chunk and a fact chunk to be
  // read back by everything rather than by most things.
  tag('RIFF', 0); v.setUint32(4, 60 + bytes, true); tag('WAVE', 8);
  tag('fmt ', 12); v.setUint32(16, 18, true); v.setUint16(20, 3, true);
  v.setUint16(22, nch, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate * nch * 4, true); v.setUint16(32, nch * 4, true); v.setUint16(34, 32, true);
  v.setUint16(36, 0, true);
  tag('fact', 38); v.setUint32(42, 4, true); v.setUint32(46, frames, true);
  tag('data', 50); v.setUint32(54, bytes, true);
  let at = 58;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < nch; c++) { v.setFloat32(at, chans[c][i], true); at += 4; }
  }
  return Buffer.from(out.subarray(0, at));
}

const q = new URLSearchParams({ goto: 'attract', stage, hero, seed });
const url = `${URL_BASE}/?${q}`;

const browser = await chromium.launch({
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--use-angle=metal', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { const t = m.text(); if (/^\[(audio|stems)\]/.test(t)) console.log(t); });

console.log('->', url);
await page.goto(url);
await page.waitForFunction(() => window.__mash_booted, null, { timeout: 30000 });
await page.waitForFunction(() => window.__mash_state === 'AttractState', null, { timeout: 30000 });
// The run itself, not the state around it: the taps have to be live before the
// first bar, and AttractState exists a moment before RunState does.
await page.waitForFunction(() => window.__mash_cur?.run?.beatLock === true, null, { timeout: 30000 });

// ---- The taps.
//
// AudioWorklet rather than ScriptProcessor. The game is running 60fps of
// gameplay on the main thread while this records, and a main-thread tap drops
// buffers under exactly that load — which would put SILENT GAPS in a file whose
// job is to show where sounds fall. The worklet runs on the audio thread and
// cannot be starved by a long frame.
const rate = await page.evaluate(async () => {
  const A = window.__mash_audio;
  const ctx = A.ctx;
  const src = `
    class Tap extends AudioWorkletProcessor {
      constructor() {
        super();
        this.chunks = [];
        this.frames = 0;
        this.t0 = null;
        this.port.onmessage = (e) => {
          if (e.data !== 'flush') return;
          const L = new Float32Array(this.frames), R = new Float32Array(this.frames);
          let at = 0;
          for (const [l, r] of this.chunks) { L.set(l, at); R.set(r, at); at += l.length; }
          this.port.postMessage({ L, R, t0: this.t0, frames: this.frames }, [L.buffer, R.buffer]);
          this.chunks = [];
        };
      }
      process(inputs) {
        const inp = inputs[0];
        // An input with no connected source renders as zero channels, not as a
        // buffer of zeros. Writing silence for those frames keeps the two stems
        // the same length and the same span of time, which is the whole promise
        // of the pair.
        const n = 128;
        const l = inp && inp[0] ? inp[0].slice() : new Float32Array(n);
        const r = inp && inp[1] ? inp[1].slice() : l.slice();
        if (this.t0 === null) this.t0 = currentTime;
        this.chunks.push([l, r]);
        this.frames += l.length;
        return true;
      }
    }
    registerProcessor('stem-tap', Tap);
  `;
  const blobUrl = URL.createObjectURL(new Blob([src], { type: 'application/javascript' }));
  await ctx.audioWorklet.addModule(blobUrl);

  // A tap is a BRANCH off the bus, never an insert: the bus still reaches master
  // exactly as it did, and the game sounds the same while it is being recorded.
  // The sink at zero gain is only there because a node outside the path to the
  // destination is not pulled, and an unpulled worklet never sees a sample.
  const sink = ctx.createGain(); sink.gain.value = 0; sink.connect(ctx.destination);
  const mk = (bus) => {
    const n = new AudioWorkletNode(ctx, 'stem-tap', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2] });
    bus.connect(n); n.connect(sink);
    return n;
  };
  window.__tapMusic = mk(A.musicGain);
  window.__tapSfx = mk(A.sfxGain);

  // A THIRD STEM FOR THE CUES UNDER EXAMINATION, off on their own.
  //
  // The mixed SFX stem cannot answer a question about one transient: a rhythm
  // stage fires four coins a second, and both an eye on a waveform and a peak
  // picker land on whichever cue is loudest nearby rather than the one asked
  // about. The first pass measured the coin CONTROL at sd 27ms for exactly that
  // reason — the method was reading its neighbours.
  //
  // So the named cues get their own bus. sfx() builds every layer against
  // A.sfxGain as it runs, synchronously, so swapping that field around the call
  // routes that one firing and nothing else. The bus carries the same level the
  // real one does, and sums into master alongside it, so the game is unchanged
  // and the three stems still add up to what the speakers got.
  const solo = (window.__soloCues || 'boom,boxKick').split(',');
  const soloBus = ctx.createGain();
  soloBus.gain.value = A.levels.sfx;
  soloBus.connect(A.master);
  window.__tapSolo = mk(soloBus);
  window.__soloBus = soloBus;

  // ---- The cue sheet.
  //
  // The stems show WHERE a sound is; this shows where the game MEANT to put it.
  // Together they separate the two failures that sound identical: a cue placed
  // on the wrong beat, and a cue placed on the right one that the output path
  // then delivered late. Wrapping sfx() rather than instrumenting the engine
  // keeps this entirely in the harness.
  window.__cues = [];
  const realSfx = A.sfx.bind(A);
  A.sfx = (name, opt = {}) => {
    const before = A.ctx.currentTime;
    const isSolo = solo.includes(name);
    const keep = A.sfxGain;
    if (isSolo) A.sfxGain = soloBus;
    let out;
    try { out = realSfx(name, opt); } finally { A.sfxGain = keep; }
    window.__cues.push({
      name,
      // When the engine decided to start it. cueStart is cleared inside sfx(),
      // so it is recomputed here from the same call it was given.
      at: Number.isFinite(opt.inBeats) ? A.cueTimeInBeats(opt.inBeats, name) : before,
      fired: before,
      inBeats: Number.isFinite(opt.inBeats) ? opt.inBeats : null,
      beat: A.songBeat(),
      gain: opt.gain ?? null,
      solo: isSolo,
    });
    return out;
  };
  return ctx.sampleRate;
});
console.log(`[stems] taps live at ${rate}Hz`);

// Play it out. The bot drives; this only watches for the run ending.
const t0 = Date.now();
// Sampled while the run is alive, because a run that has ended has already been
// torn down and cannot be asked how it went. `beatCombo` resets on every missed
// beat, so the best and the last together say whether the bot played it clean.
let play = null;
while (Date.now() - t0 < 300000) {
  await page.waitForTimeout(500);
  const st = await page.evaluate(() => {
    const r = window.__mash_cur?.run;
    if (!r) return { done: true };
    return { done: false, combo: r.beatCombo, score: r.score, judged: r.beatJudgeConsumed?.size ?? 0 };
  });
  if (st.done) break;
  play = { best: Math.max(play?.best ?? 0, st.combo), last: st.combo, score: st.score, judged: st.judged };
}
const secs = ((Date.now() - t0) / 1000).toFixed(1);

// ---- Pull it back.
const meta = await page.evaluate(async () => {
  const grab = (node) => new Promise((res) => {
    node.port.onmessage = (e) => res(e.data);
    node.port.postMessage('flush');
  });
  const m = await grab(window.__tapMusic);
  const s = await grab(window.__tapSfx);
  const b = await grab(window.__tapSolo);
  // One interleaved blob for all three rather than three transfers: the point of
  // the set is that they are the same span, and handing them over together is
  // the cheapest way to keep that true.
  const frames = Math.min(m.frames, s.frames, b.frames);
  const all = new Float32Array(frames * 6);
  all.set(m.L.subarray(0, frames), 0);
  all.set(m.R.subarray(0, frames), frames);
  all.set(s.L.subarray(0, frames), frames * 2);
  all.set(s.R.subarray(0, frames), frames * 3);
  all.set(b.L.subarray(0, frames), frames * 4);
  all.set(b.R.subarray(0, frames), frames * 5);
  window.__pcm = new Uint8Array(all.buffer);
  const blob = new Blob([window.__pcm], { type: 'application/octet-stream' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'stems.bin';
  document.body.appendChild(a);
  const dl = new Promise((r) => setTimeout(r, 0));
  a.click();
  await dl;
  return {
    frames,
    t0: m.t0,
    sfxT0: s.t0,
    cues: window.__cues,
    latency: window.__mash_audio.heardLatencySec(),

  };
});

const download = await page.waitForEvent('download', { timeout: 60000 });
const tmp = await download.path();
const raw = readFileSync(tmp);
const f32 = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
const n = meta.frames;
const musicL = f32.subarray(0, n), musicR = f32.subarray(n, n * 2);
const sfxL = f32.subarray(n * 2, n * 3), sfxR = f32.subarray(n * 3, n * 4);
const soloL = f32.subarray(n * 4, n * 5), soloR = f32.subarray(n * 5, n * 6);

mkdirSync(DIR, { recursive: true });
writeFileSync(join(DIR, '1-music.wav'), wav([musicL, musicR], rate));
writeFileSync(join(DIR, '2-sfx.wav'), wav([sfxL, sfxR], rate));
writeFileSync(join(DIR, '3-box-blast.wav'), wav([soloL, soloR], rate));

// The cue sheet, in the stems' own time base: sample 0 of both files is the
// first frame the taps saw, so every cue is placed against that and a DAW's
// playhead reads the same number this column does.
const rows = ['name,sample,seconds,song_beat,in_beats,gain'];
for (const c of meta.cues) {
  const off = (c.at - meta.t0) * rate;
  if (off < 0 || off > n) continue;
  rows.push([c.name, Math.round(off), (off / rate).toFixed(4),
    c.beat == null ? '' : c.beat.toFixed(4),
    c.inBeats == null ? '' : c.inBeats.toFixed(4),
    c.gain == null ? '' : c.gain].join(','));
}
writeFileSync(join(DIR, 'cues.csv'), rows.join('\n') + '\n');

try { unlinkSync(tmp); } catch { /* playwright cleans its own temp on close */ }
await browser.close();

const peak = (ch) => { let p = 0; for (const x of ch) { const a = Math.abs(x); if (a > p) p = a; } return p; };
const pm = Math.max(peak(musicL), peak(musicR)), ps = Math.max(peak(sfxL), peak(sfxR));
const pb = Math.max(peak(soloL), peak(soloR));
const db = (x) => (x > 0 ? (20 * Math.log10(x)).toFixed(1) : '-inf');

const dur = (n / rate).toFixed(1);
console.log(`\n${DIR}`);
console.log(`  1-music.wav   ${dur}s  peak ${db(pm)}dBFS${pm > 1 ? '  OVER FULL SCALE' : ''}`);
console.log(`  2-sfx.wav     ${dur}s  peak ${db(ps)}dBFS   (everything except the box blast)`);
console.log(`  3-box-blast.wav ${dur}s  peak ${db(pb)}dBFS  (the blast alone, same span)`);
console.log(`  cues.csv      ${rows.length - 1} cues`);
console.log(`\nplayed ${secs}s, tap drift music->sfx ${((meta.sfxT0 - meta.t0) * 1000).toFixed(3)}ms, `
  + `output latency ${(meta.latency * 1000).toFixed(1)}ms`);
if (play) {
  console.log(`bot: ${play.judged} chart beats played clean, best streak ${play.best}, `
    + `streak at the finish ${play.last}, score ${play.score}`);
}
