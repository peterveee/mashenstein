import { mkdtempSync, mkdirSync, renameSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir, cpus } from 'node:os';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const LOGICAL_W = 480;
const LOGICAL_H = 270;
const require = createRequire(import.meta.url);

function argNumber(value, fallback, name) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) throw new Error(`${name} must be a finite number`);
  return number;
}

function spawnChecked(bin, args, label, children = null) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'inherit', 'inherit'] });
    children?.add(child);
    child.once('error', (error) => reject(new Error(`${label}: ${error.message}`)));
    child.once('close', (code) => {
      children?.delete(child);
      code === 0 ? resolvePromise() : reject(new Error(`${label}: exited ${code ?? 'after signal'}`));
    });
  });
}

/** Deterministic fixed-step Canvas2D render shared by bank and file audio CLIs. */
export async function renderVisualiserVideo(options) {
  const {
    analysis, audioPath, visualIndex, seed = 0x7042ade, bpm = 120, fps = 60,
    startFrame = 0, frameCount = analysis?.length, outW = 1920, outH = 1080,
    ss = 2, pixel = false, pixelScale = 4, crf = 12,
    workers = Math.min(4, Math.max(1, cpus().length - 4)), fade = 0,
    noGpu = false, keep = false, out, overlay = null, onProgress = () => {},
  } = options || {};
  if (!Array.isArray(analysis) || !analysis.length) throw new Error('analysis must contain frames from time zero');
  if (!audioPath || !existsSync(audioPath)) throw new Error(`audio file not found: ${audioPath || ''}`);
  const fpsN = Math.round(argNumber(fps, 60, '--fps'));
  const from = Math.round(argNumber(startFrame, 0, '--startFrame'));
  const count = Math.round(argNumber(frameCount, analysis.length, '--frameCount'));
  if (fpsN < 1 || from < 0 || count < 1 || from + count > analysis.length) throw new Error('render frame range is outside the analysis table');
  if (pixel && overlay) throw new Error('lyric overlays require a full-resolution render; remove --pixel');
  const width = Math.round(argNumber(outW, 1920, 'outW'));
  const height = Math.round(argNumber(outH, 1080, 'outH'));
  const supersample = Math.max(1, Math.round(argNumber(ss, 2, '--ss')));
  const workerCount = Math.max(1, Math.round(argNumber(workers, 1, '--workers')));
  if (width % 2 || height % 2 || width < 2 || height < 2) throw new Error('output dimensions must be positive even integers');
  if (!out) throw new Error('out path is required');

  const work = mkdtempSync(join(tmpdir(), 'mash-visualiser-render-'));
  const destination = resolve(out);
  mkdirSync(dirname(destination), { recursive: true });
  const partial = join(dirname(destination), `.${basename(destination)}.${process.pid}.partial`);
  const entry = join(work, 'entry.js');
  const bundledImport = (path) => JSON.stringify(resolve(ROOT, path));
  writeFileSync(entry, `
import { createVisualiser } from ${bundledImport('src/engine/visualisers.js')};
${overlay ? `import { drawLyrics } from ${JSON.stringify(resolve(overlay.modulePath))};` : ''}
window.__mkVisualiser = (index, seed, track) => createVisualiser(index, seed, track);
${overlay ? 'window.__drawLyrics = drawLyrics;' : ''}
`);

  let browsers = [];
  const children = new Set();
  let interrupted = false;
  const onInterrupt = () => {
    interrupted = true;
    for (const child of children) { try { child.kill('SIGTERM'); } catch {} }
    for (const browser of browsers) browser.close().catch(() => {});
  };
  process.on('SIGINT', onInterrupt);
  try {
    let esbuild; let chromium;
    try { esbuild = require('esbuild'); ({ chromium } = require('playwright')); }
    catch { throw new Error('video rendering needs esbuild and Playwright; run npm install'); }
    const bundle = await esbuild.build({ entryPoints: [entry], bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent' });
    const bundleJs = bundle.outputFiles[0].text.replace(/<\/script>/g, '<\\/script>');
    const fontFamily = overlay?.fontFamily || 'Lilita One';
    const needsFont = !!overlay;
    const fontData = overlay?.fontPath ? readFileSync(overlay.fontPath).toString('base64') : '';
    const localFont = fontData ? `<style>@font-face{font-family:'${fontFamily}';src:url(data:font/ttf;base64,${fontData}) format('truetype');font-weight:400;font-display:block}</style>` : '';
    const html = `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lilita+One&family=Fredoka:wght@400..600&family=Permanent+Marker&family=Jost:wght@400..800&display=swap">${localFont}<style>html,body{margin:0;background:#000}</style><script>${bundleJs}<\/script>`;
    const useGpu = !noGpu;
    const gpuArgs = ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'];
    const ranges = [];
    const bounds = Array.from({ length: workerCount + 1 }, (_, i) => Math.round(count * i / workerCount));
    for (let i = 0; i < workerCount; i++) if (bounds[i + 1] > bounds[i]) ranges.push({ from: from + bounds[i], to: from + bounds[i + 1], path: join(work, `segment-${i}.mp4`) });

    async function renderRange(range) {
      if (interrupted) throw new Error('render interrupted by SIGINT');
      const browser = await chromium.launch({ args: useGpu ? gpuArgs : [] });
      browsers.push(browser);
      if (interrupted) { await browser.close(); browsers = browsers.filter((item) => item !== browser); throw new Error('render interrupted by SIGINT'); }
      const page = await browser.newPage({ viewport: { width: 64, height: 64 } });
      await page.setContent(html, { waitUntil: 'load' });
      if (needsFont) {
        await page.evaluate(() => Promise.all([document.fonts.load("400 32px 'Lilita One'")]));
        const loaded = await page.evaluate(() => document.fonts.check("400 32px 'Lilita One'"));
        if (!loaded) throw new Error('Lilita One font is unavailable. Connect to Google Fonts or install a local font and retry.');
      } else await page.evaluate((faces) => Promise.all(faces.map((face) => document.fonts.load(face).catch(() => {}))), ["400 32px 'Lilita One'", "500 12px 'Fredoka'", "400 12px 'Permanent Marker'", "600 12px 'Jost'", "700 12px 'Jost'"]);

      await page.evaluate(({ index, seedValue, tempo, frameRate, outWidth, outHeight, scale, skip, overlayData, family, start }) => {
        const draw = document.createElement('canvas'); draw.width = outWidth * scale; draw.height = outHeight * scale;
        const dctx = draw.getContext('2d', { alpha: false });
        const fit = Math.max(draw.width / 480, draw.height / 270);
        dctx.setTransform(fit, 0, 0, fit, (draw.width - 480 * fit) / 2, (draw.height - 270 * fit) / 2);
        dctx.lineJoin = 'round'; dctx.lineCap = 'round'; dctx.imageSmoothingEnabled = true; dctx.imageSmoothingQuality = 'high';
        const out = scale === 1 ? draw : document.createElement('canvas');
        let octx = dctx;
        if (scale !== 1) { out.width = outWidth; out.height = outHeight; octx = out.getContext('2d', { alpha: false }); octx.imageSmoothingEnabled = true; octx.imageSmoothingQuality = 'high'; }
        const vis = window.__mkVisualiser(index, seedValue, { bpm: tempo }); const dt = 1 / frameRate;
        const advance = (a) => { a.spectrum = Uint8Array.from(a.spectrum); vis.update(dt, a); };
        for (const a of skip) advance(a);
        dctx.fillStyle = '#000'; dctx.fillRect(0, 0, 480, 270); vis.draw(dctx);
        if (scale !== 1) octx.drawImage(draw, 0, 0, outWidth, outHeight);
        let frameCursor = start;
        window.__batch = (chunk) => {
          const pngs = [];
          for (let n = 0; n < chunk.length; n++) {
            const a = chunk[n]; advance(a);
            dctx.fillStyle = '#000'; dctx.fillRect(0, 0, 480, 270); vis.draw(dctx);
            if (scale !== 1) octx.drawImage(draw, 0, 0, outWidth, outHeight);
            if (window.__drawLyrics && overlayData) {
              octx.save(); octx.setTransform(1, 0, 0, 1, 0, 0);
              window.__drawLyrics(octx, outWidth, outHeight, frameCursor / frameRate, overlayData.lines, a, overlayData.title || '', family, overlayData.duration || 0);
              octx.restore();
            }
            pngs.push(out.toDataURL('image/png').slice('data:image/png;base64,'.length));
            frameCursor++;
          }
          return pngs;
        };
      }, { index: visualIndex, seedValue: seed >>> 0, tempo: bpm, frameRate: fpsN, outWidth: width, outHeight: height, scale: supersample,
        skip: analysis.slice(0, range.from), overlayData: overlay ? { lines: overlay.lines || [], title: overlay.title || '', duration: overlay.duration || 0 } : null, family: fontFamily, start: range.from });

      const ffmpeg = process.env.FFMPEG || 'ffmpeg';
      const ffArgs = ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fpsN), '-i', 'pipe:0'];
      if (pixel) ffArgs.push('-vf', `scale=${width * pixelScale}:${height * pixelScale}:flags=neighbor`);
      ffArgs.push(
        '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2',
        '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-an', '-f', 'mp4', range.path);
      const ff = spawn(ffmpeg, ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
      children.add(ff);
      let ffError = null;
      const ffDone = new Promise((resolvePromise) => { ff.once('error', (error) => { ffError = error; resolvePromise(-1); }); ff.once('close', resolvePromise); });
      ff.stdin.on('error', (error) => { ffError = error; });
      const write = (buffer) => new Promise((resolvePromise, reject) => {
        if (ffError) return reject(ffError);
        if (ff.stdin.write(buffer)) return resolvePromise();
        const clean = () => {
          ff.stdin.removeListener('drain', onDrain);
          ff.stdin.removeListener('error', onError);
          ff.removeListener('close', onClose);
        };
        const onDrain = () => { clean(); resolvePromise(); };
        const onError = (error) => { clean(); reject(error); };
        const onClose = (code, signal) => { clean(); reject(ffError || new Error(`frame encoder closed before accepting a frame (${code ?? signal})`)); };
        ff.stdin.once('drain', onDrain);
        ff.stdin.once('error', onError);
        ff.once('close', onClose);
      });
      try {
        for (let frame = range.from; frame < range.to; frame += 20) {
          if (interrupted) throw new Error('render interrupted by SIGINT');
          const pngs = await page.evaluate((chunk) => window.__batch(chunk), analysis.slice(frame, Math.min(frame + 20, range.to)));
          for (const png of pngs) await write(Buffer.from(png, 'base64'));
          onProgress(pngs.length);
        }
      } catch (error) { ff.stdin.destroy(); throw error; }
      finally { await browser.close(); browsers = browsers.filter((item) => item !== browser); }
      ff.stdin.end();
      const status = await ffDone; children.delete(ff);
      if (status !== 0) throw new Error(`frame encoder failed: ${ffError?.message || `exit ${status}`}`);
    }

    await Promise.all(ranges.map(renderRange));
    if (interrupted) throw new Error('render interrupted by SIGINT');
    const listPath = join(work, 'segments.txt');
    writeFileSync(listPath, ranges.map((range) => `file '${range.path}'\n`).join(''));
    const seconds = count / fpsN;
    const audioArgs = [];
    if (from > 0) audioArgs.push('-ss', (from / fpsN).toFixed(6));
    audioArgs.push('-i', resolve(audioPath));
    const muxArgs = ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listPath, ...audioArgs, '-c:v', 'copy'];
    if (fade > 0) muxArgs.push('-af', `afade=t=out:st=${Math.max(0, seconds - fade).toFixed(3)}:d=${fade}`);
    muxArgs.push('-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-movflags', '+faststart', '-shortest', '-f', 'mp4', partial);
    await spawnChecked(process.env.FFMPEG || 'ffmpeg', muxArgs, 'audio/video mux', children);
    if (interrupted) throw new Error('render interrupted by SIGINT');
    if (!existsSync(partial)) throw new Error('ffmpeg reported success but wrote no output');
    renameSync(partial, destination);
    return { out: destination, frameCount: count, duration: seconds, startFrame: from, workers: ranges.length };
  } catch (error) {
    for (const child of children) { try { child.kill('SIGTERM'); } catch {} }
    await Promise.allSettled(browsers.map((browser) => browser.close()));
    try { rmSync(partial, { force: true }); } catch {}
    if (interrupted) throw new Error('render interrupted by SIGINT');
    throw error;
  } finally {
    process.removeListener('SIGINT', onInterrupt);
    if (!keep) rmSync(work, { recursive: true, force: true });
  }
}
