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
import { songBlocks, barPlan, LANE_KEYS } from '../../src/engine/lanes.js';
import { trackIdOf } from '../../src/data/tracks.js';
import {
  applyArrangement, bpmOf, swingOf, loopOf, loopSteps, SWING_STRAIGHT,
} from '../../src/data/arrangements.js';
import { DEFAULT_SEED } from './render-bank-page.js';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const SR = 44100;

// Deterministic by default so a lane rendered on its own gets byte-identical noise
// to the same lane inside the full mix — that is what lets stems sum back to the mix.
// Defined with the render walk it seeds (one number, both renderers), and re-exported
// here because this is where the command-line tools have always found it.
export { DEFAULT_SEED };

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

// The page script. The render itself lives in lib/render-bank-page.js, because the
// song mixer runs the same walk in an iframe and neither copy may drift from the
// engine independently of the other. What is left here is the transport: how the
// samples get from the page back to Node.
const ENTRY = `
import { renderBankPage, interleave } from ${JSON.stringify(join(ROOT, 'tools/lib/render-bank-page.js'))};

window.__renderBank = async (args) => {
  const r = await renderBankPage(args);
  // Interleaved once here so the transfer back to Node is a single buffer.
  window.__pcm = new Uint8Array(interleave(r.outL, r.outR).buffer);
  return { bytes: window.__pcm.length, frames: r.frames, seconds: r.seconds, peak: r.peak,
    percussion: r.percussion, schedulerWork: r.schedulerWork,
    scheduledCalls: r.scheduledCalls, expectedScheduleCalls: r.expectedScheduleCalls,
    fineBars: r.fineBars, fineTickLanes: r.fineTickLanes,
    fineBarsReason: r.fineBarsReason, fineLanes: r.fineLanes,
    transportResolution: r.transportResolution };
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
    songLoop = false, fineLaneSkip = true, rearrangement = null,
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
    // The FEEL travels with the tempo, and for the same reason: both are one number the
    // desk saves onto the arrangement, and both change when every note sounds. A render
    // that applied the arranged tempo but not the arranged swing would be the same song
    // at the right speed and the wrong groove — which is worse than either alone, because
    // it sounds nearly right.
    //
    // Order is still opt-in: ordinary reference renders keep the composed form, while
    // a caller that wants the desk's arranged form passes `arrangement` explicitly.
    // That form is handed to `setArrangement` in the page, and its tempo, feel and
    // length are resolved here before the OfflineAudioContext is sized.
    // An explicit arrangement is the desk's live form, not merely metadata passed
    // to the page. Resolve the tempo, feel and bar count against it here as well as
    // in Audio.setArrangement below. Otherwise a draft that lengthens a song is
    // scheduled against the right order but the buffer is still sized from the
    // composed bank, leaving its final bars as silence.
    const arrangementId = id || '__explicit__';
    const arrangementTable = arrangement !== undefined
      ? { [arrangementId]: arrangement }
      : undefined;
    const lookupId = arrangement !== undefined ? arrangementId : id;
    const sizedBank = arrangement !== undefined
      ? applyArrangement(gated, arrangementId, arrangementTable)
      : gated;
    const played = bpmOf(gated, lookupId, arrangementTable);
    const swung = swingOf(gated, lookupId, arrangementTable);
    const forPage = played === gated.bpm && swung === (gated.swing ?? SWING_STRAIGHT)
      ? gated
      : { ...gated, bpm: played, swing: swung };
    const blocks = songBlocks(sizedBank, repeat).length;
    const arrangedFormSteps = arrangement !== undefined ? barPlan(sizedBank).length * 16 : 0;

    // The song's own start-and-loop, when the caller asked for it. Off by default, and
    // deliberately: a reference render is a claim about the ENGINE — the null test
    // compares one against a stored baseline — and giving a song markers should not be
    // able to change what that claim renders. The tools that bounce a song to listen to
    // it opt in; make-baselines does not.
    //
    // Resolved out here for the same reason the mix and the tempo are: the page holds a
    // JSON copy of the bank, and `loopOf` needs the identity that copy does not have.
    // Against the same bar count that sizes the buffer below, so the two cannot
    // disagree — the composed form unless the caller passed an explicit arrangement.
    const loop = songLoop
      ? loopSteps(loopOf(gated, lookupId, arrangementTable), barPlan(sizedBank).length)
      : null;
    // The way in once, then `repeat` passes of the loop — rather than `repeat` passes of
    // the whole form. A song with markers but no region falls back to the form from its
    // start bar, which is what it sounds like.
    const steps = loop
      ? (loop.loop
        ? loop.loop.start - loop.start + repeat * (loop.loop.end - loop.loop.start)
        : (arrangedFormSteps || blocks * 32) - loop.start)
      : arrangedFormSteps * repeat;

    // A fresh page per render: Audio is a singleton and ensure() binds one context
    // for its lifetime, so contexts cannot be swapped in place. Re-evaluating the
    // bundle costs milliseconds; relaunching the browser would cost a second.
    const errors = [];
    // Served from an https ORIGIN rather than handed over with `setContent`.
    //
    // `setContent` leaves the page on `about:blank`, whose origin is opaque and whose
    // `isSecureContext` is false — and on a page that is not a secure context Chromium
    // does not put `audioWorklet` on an AudioContext AT ALL. Not a worklet that fails to
    // produce sound: no worklet to ask. That is the real reason every worklet this project
    // has tried has "rendered silence offline" (see the notes at the top of
    // src/engine/effects.js and src/engine/voices.js, which blamed the secure-context rule
    // without noticing that this page is the thing failing it).
    //
    // Nothing is served over the network: the route fulfils the request from the bundle in
    // memory, exactly as `setContent` did, and only the URL is https. Everything that
    // rendered before renders identically — the origin is not an input to the audio — and
    // TNGR-2's worklet path becomes possible here at all.
    const html = '<!doctype html><meta charset="utf-8">'
      + `<script>${bundleJs.replace(/<\/script>/gi, '<\\/script>')}<\/script>`;
    const openPage = async () => {
      const p = await browser.newPage();
      errors.length = 0;
      p.on('pageerror', (e) => errors.push(e.message));
      await p.route('**/*', (route) => route.fulfill({
        status: 200, contentType: 'text/html', body: html,
      }));
      await p.goto('https://mashenstein.render/', { waitUntil: 'load' });
      return p;
    };
    let page = await openPage();

    // `arrangement` only when a caller named one: the key's mere presence is what
    // the page tests, and `undefined` does not reliably survive the crossing.
    const args = {
      bank: forPage, blocks, tail, seed, sampleRate: SR, mix, trackId: id,
      ...(steps ? { steps } : {}),
      ...(loop ? { loop } : {}),
      ...(arrangement !== undefined ? { arrangement } : {}),
      ...(rearrangement ? { rearrangement } : {}),
      // Normalised here so the page never has to guess: a warp is always both
      // numbers, and pitch defaults to unity rather than to tempo — the game's
      // speed burst moves the clock and leaves the key alone.
      ...(warp ? { warp: { tempo: warp.tempo ?? 1, pitch: warp.pitch ?? 1 } } : {}),
      // Only when a caller is deliberately turning it off — the page defaults to on,
      // and an ordinary render must not start carrying a switch in its arguments.
      ...(fineLaneSkip === false ? { fineLaneSkip: false } : {}),
    };

    // Two attempts at most: the just-in-time walk, then the whole walk up front.
    //
    // See the completeness check in renderBankPage. A browser that exposes
    // `OfflineAudioContext.suspend` but does not run the scheduled checkpoints
    // renders silence from the first missed one and reports nothing wrong — silence
    // being a legitimate thing to render, no downstream check can tell that from a
    // quiet song. So the walk refuses to return a short render, and this is what
    // that refusal costs: one more pass, on a FRESH page, because a partial
    // schedule cannot be finished, only replaced.
    let meta;
    let upfront = false;
    for (;;) {
      try {
        meta = await page.evaluate((a) => window.__renderBank(a), { ...args, upfront });
        break;
      } catch (err) {
        const short = /render walk incomplete/.test(err?.message || '');
        if (short && !upfront) {
          console.warn(`  just-in-time render walk did not complete — retrying with the`
            + ` whole walk up front: ${err.message}`);
          upfront = true;
          await page.close();
          page = await openPage();
          continue;
        }
        await page.close();
        throw new Error(`offline render failed: ${err.message}`
          + (errors.length ? `\n  page errors: ${errors.join('; ')}` : ''));
      }
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

    return {
      outL, outR, seconds: meta.seconds, blocks, peak: meta.peak,
      percussion: meta.percussion || [],
      scheduledCalls: meta.scheduledCalls,
      expectedScheduleCalls: meta.expectedScheduleCalls,
      // Operation counts for the walk that produced this — see work/local/bench-scheduler-work.js.
      schedulerWork: meta.schedulerWork || null,
      fineBars: meta.fineBars, fineTickLanes: meta.fineTickLanes,
      fineBarsReason: meta.fineBarsReason, fineLanes: meta.fineLanes,
      transportResolution: meta.transportResolution,
      // What was actually laid down, so a caller can say so in words rather than
      // reporting "2x form" over a render that is a way in and two passes of a loop.
      loop, steps: steps || blocks * 32,
    };
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
