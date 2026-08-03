// Offline renderer that runs THE GAME'S OWN ENGINE, rather than a copy of it.
//
// tools/lib/render-bank.js reimplements src/engine/audio.js sample-by-sample in
// plain JS, because Node has no Web Audio. That mirror has to be hand-updated
// every time a voice changes, and it has already drifted twice (its echo send
// defaults to 'all' where the engine is effectively 'melodic'; its music gain is
// frozen at 0.7 instead of reading the setting).
//
// This module removes the mirror from the equation: it bundles src/, runs it in
// headless Chromium under an OfflineAudioContext, and pulls the PCM back out. The
// render IS the game, by construction — a voice change lands in the WAVs, stems and
// videos the moment it lands in the engine, with nothing to keep in step.
//
// Chromium is build tooling only. Nothing here ships; players get the same static
// bundle they always did.
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { tmpdir } from 'os';
import { readFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { songBlocks, LANE_KEYS } from '../../src/engine/lanes.js';
import { trackIdOf } from '../../src/data/tracks.js';
import { bpmOf } from '../../src/data/arrangements.js';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const SR = 44100;

// Deterministic by default so a lane rendered on its own gets byte-identical noise
// to the same lane inside the full mix — that is what lets stems sum back to the mix.
export const DEFAULT_SEED = 0x5eed1;

// Lane gating works by removing the other lanes from the bank — and from every
// section, or a section would hand them straight back — which is how a single-lane
// stem is rendered.
function gateLanes(bank, lanes) {
  if (!lanes) return bank;
  const strip = (o) => {
    const out = { ...o };
    for (const k of LANE_KEYS) if (!lanes.has(k)) delete out[k];
    return out;
  };
  const gated = strip(bank);
  if (bank.sections) gated.sections = bank.sections.map(strip);
  return gated;
}

// The page script. Kept as a string rather than a file so the whole driver reads in
// one place; esbuild resolves its imports against the repo root.
const ENTRY = `
import { Audio } from ${JSON.stringify(join(ROOT, 'src/engine/audio.js'))};
import { MIX } from ${JSON.stringify(join(ROOT, 'src/data/mix.js'))};

window.__renderBank = async ({ bank, blocks, tail, seed, sampleRate, mix, trackId, arrangement, warp }) => {
  // The bank arrives carrying the tempo it is PLAYED at — resolved in Node, where a
  // track id still means something, so a song the desk has retuned renders at the
  // tempo it was retuned to. See the note over \`render\`.
  //
  // A warp is NOT a tempo: setWarp scales the step clock while the mix's delay and
  // pre-delay times stay baked against the bank's own bpm, which is exactly what the
  // game does to a song under a speed burst or a star. Rendering a warp as a bpm
  // change would re-time those echoes and hide the drift the render exists to audition.
  const spb = (60 / bank.bpm) / 4 / (warp ? warp.tempo : 1);   // seconds per 16th step
  const steps = blocks * 32;
  const N = Math.ceil((steps * spb + tail) * sampleRate);
  const ctx = new OfflineAudioContext(2, N, sampleRate);

  Audio.setCaptureEnabled(false);   // the rewind recorder is realtime-only
  Audio.setNoiseSeed(seed);
  Audio.ensure(ctx);

  // The reverb builds its impulse response by rendering noise through its own
  // offline context. That has to finish before this render starts, or the aux is
  // silent for the whole track.
  if (Audio.mixer) await Audio.mixer.ready;

  // The mix is always resolved HERE and passed to setBank explicitly, never left to
  // the engine's own bank-identity lookup. The bank crossed into this page as JSON,
  // so it is a different object than the one in the module registry and identity
  // matching would silently find nothing — which is exactly the bug this replaced.
  // An undefined mix means "use what is saved for this track"; null means "none".
  const entry = mix !== undefined ? mix : (trackId ? (MIX[trackId] || null) : null);
  Audio.setBank(bank, entry);

  // Through the desk's own door, when a caller asks for one. \`setBank\` takes an
  // arrangement as an argument and builds the bank in one go; \`setArrangement\` patches
  // a bank that is already playing, which is the path every note and bar edit on the
  // desk takes and therefore the path worth being able to render. Omitted, nothing is
  // called and the render is exactly what it always was.
  if (arrangement !== undefined) Audio.setArrangement(arrangement);

  // After setBank: setBank re-reads the mix, and the warp has to be the last word
  // on the clock before the first step is scheduled.
  if (warp) Audio.setWarp(warp.tempo, warp.pitch);

  // setBank opens the song half a second in, with a short fade, because live
  // playback has to mute whatever was left in the lookahead window. An offline
  // render starts from silence anyway, so take the song from sample zero at full
  // trim — otherwise every WAV would carry a 0.5s gap and a fade-in.
  Audio.nextTime = 0;
  Audio.songTrim.gain.cancelScheduledValues(0);
  Audio.songTrim.gain.setValueAtTime(Audio.musicTrim, 0);

  for (let i = 0; i < steps; i++) Audio.scheduleStep();

  const buf = await ctx.startRendering();
  const L = buf.getChannelData(0);
  const R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;

  let peak = 0;
  for (let i = 0; i < L.length; i++) {
    const a = Math.abs(L[i]), b = Math.abs(R[i]);
    if (a > peak) peak = a;
    if (b > peak) peak = b;
  }

  // Interleave once here so the transfer back to Node is a single buffer.
  const inter = new Float32Array(L.length * 2);
  for (let i = 0; i < L.length; i++) { inter[i * 2] = L[i]; inter[i * 2 + 1] = R[i]; }
  window.__pcm = new Uint8Array(inter.buffer);

  // The kit timeline the sequencer just laid down, in seconds from zero. This is
  // the engine's own tally — the same one the live jukebox reads — so a rendered
  // video reacts to the drums dropping out on exactly the bar they do, without
  // anything downstream having to reimplement the arrangement. Small enough
  // (a few thousand numbers for a long song) to ride back with the metadata.
  const percussion = Array.from(Audio._percPending || []);

  return { bytes: window.__pcm.length, frames: L.length, seconds: L.length / sampleRate, peak, percussion };
};

// Handed back as a file download rather than a base64 string over CDP. A two-minute
// stereo track is ~42MB of float; base64ing that in slices took minutes, where the
// browser's own download path moves it as binary in about a second.
window.__pcmDownload = () => {
  const blob = new Blob([window.__pcm], { type: 'application/octet-stream' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'pcm.bin';
  document.body.appendChild(a);
  a.click();
};
`;

/**
 * Open a reusable renderer. Batch callers (render-stems, the shop audition sets)
 * should open once and render many — a Chromium launch is ~1s and dwarfs the render
 * itself for short tracks.
 */
export async function openRenderer({ headless = true } = {}) {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    throw new Error('playwright is required for audio renders: npm install');
  }
  const esbuild = require('esbuild');
  const built = await esbuild.build({
    stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
    bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
  });
  const bundleJs = built.outputFiles[0].text;
  const browser = await chromium.launch({ headless });

  async function render(bank, {
    repeat = 1, lanes = null, tail = 2.0, seed = DEFAULT_SEED, mix, trackId, arrangement, warp,
  } = {}) {
    const gated = gateLanes(bank, lanes);
    // Resolved in Node, where bank identity still holds; the page cannot do this
    // because the bank reaches it as JSON.
    const id = trackId !== undefined ? trackId : trackIdOf(bank);
    // The tempo the song is played at, written onto the bank before it crosses. The
    // desk saves a retuned tempo onto the song's arrangement, and the page cannot look
    // one up — `trackIdOf` on a JSON copy finds nothing, which is why the mix is
    // resolved out here too. Sizing the buffer from the composed tempo while the
    // engine played the arranged one would cut a slowed-down song off before its end.
    //
    // Tempo only. The rest of an arrangement — the order it plays its sections in, and
    // any layer sections — is still NOT applied to an offline render, for the same
    // bank-identity reason: `plumber` and `megamix` both render in their composed order
    // rather than the arranged one. That gap predates this and is deliberately left
    // alone here; closing it changes what every existing render sounds like.
    const played = bpmOf(gated, id);
    const forPage = played === gated.bpm ? gated : { ...gated, bpm: played };
    const blocks = songBlocks(gated, repeat).length;

    // A fresh page per render: Audio is a singleton and ensure() binds one context
    // for its lifetime, so contexts cannot be swapped in place. Re-evaluating the
    // bundle costs milliseconds; relaunching the browser would cost a second.
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setContent(
      `<!doctype html><meta charset="utf-8">`
      + `<script>${bundleJs.replace(/<\/script>/gi, '<\\/script>')}<\/script>`,
      { waitUntil: 'load' },
    );

    let meta;
    try {
      meta = await page.evaluate(
        (args) => window.__renderBank(args),
        // `arrangement` only when a caller named one: the key's mere presence is what
        // the page tests, and `undefined` does not reliably survive the crossing.
        {
          bank: forPage, blocks, tail, seed, sampleRate: SR, mix, trackId: id,
          ...(arrangement !== undefined ? { arrangement } : {}),
          // Normalised here so the page never has to guess: a warp is always both
          // numbers, and pitch defaults to unity rather than to tempo — the game's
          // speed burst moves the clock and leaves the key alone.
          ...(warp ? { warp: { tempo: warp.tempo ?? 1, pitch: warp.pitch ?? 1 } } : {}),
        },
      );
    } catch (err) {
      await page.close();
      throw new Error(`offline render failed: ${err.message}`
        + (errors.length ? `\n  page errors: ${errors.join('; ')}` : ''));
    }

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.evaluate(() => window.__pcmDownload()),
    ]);
    const tmp = join(tmpdir(), `mash-pcm-${process.pid}-${blocks}-${meta.frames}.bin`);
    await download.saveAs(tmp);
    await page.close();
    const pcm = readFileSync(tmp);
    unlinkSync(tmp);
    if (pcm.length !== meta.bytes) {
      throw new Error(`offline render transfer truncated: got ${pcm.length} of ${meta.bytes} bytes`);
    }

    const inter = new Float32Array(pcm.buffer, pcm.byteOffset, meta.frames * 2);
    const outL = new Float32Array(meta.frames);
    const outR = new Float32Array(meta.frames);
    for (let i = 0; i < meta.frames; i++) { outL[i] = inter[i * 2]; outR[i] = inter[i * 2 + 1]; }

    return { outL, outR, seconds: meta.seconds, blocks, peak: meta.peak, percussion: meta.percussion || [] };
  }

  // isAlive because a long-lived caller keeps this handle warm for hours — see the
  // mixer. Chromium can go away underneath it (a crash, a sleep, someone's pkill),
  // and every render after that fails on a browser that is not there any more.
  return { render, close: () => browser.close(), isAlive: () => browser.isConnected() };
}

/** One-shot convenience. Same shape as renderBank(), plus a second channel. */
export async function renderBankBrowser(bank, opts = {}) {
  const r = await openRenderer();
  try {
    return await r.render(bank, opts);
  } finally {
    await r.close();
  }
}
