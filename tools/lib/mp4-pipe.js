// Frame capture straight into an x264 pipe, shared by the video render tools.
//
// The page is expected to expose `window.__batch(from, count)` returning an array
// of base64 PNGs — the same contract render-video.js uses. ffmpeg is started
// before the first frame and fed over a pipe, so encoding overlaps capture and a
// 1080p render never lands on disk as a pile of PNGs.
import { spawn } from 'child_process';

// -tune animation is aimed squarely at flat cel-style content like this art:
// stronger deblocking across the big smooth sky and wall gradients, which is
// where 8-bit banding would otherwise show, without eating the hard vector edges.
export function x264Args({ fps, crf, outPath, extra = [] }) {
  return [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-i', 'pipe:0',
    ...extra,
    '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', String(crf),
    '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
    '-an', '-f', 'mp4', outPath,
  ];
}

// Renders `total` frames out of the page and into `outPath`. Returns the number
// of bytes piped. Throws if ffmpeg fails — the caller owns cleanup, because each
// tool has its own scratch directory and its own idea of what a partial file is.
export async function pipeFrames({
  page, total, fps, crf, outPath, extra = [], batch = 20, onProgress = null,
}) {
  const ff = spawn('ffmpeg', x264Args({ fps, crf, outPath, extra }),
    { stdio: ['pipe', 'inherit', 'inherit'] });

  let ffError = null;
  const ffDone = new Promise((done) => {
    ff.on('error', (err) => { ffError = err; done(-1); });
    ff.on('close', (code) => done(code));
  });
  ff.stdin.on('error', (err) => { ffError = ffError || err; });

  const write = (buf) => new Promise((done, fail) => {
    if (ffError) { fail(ffError); return; }
    if (ff.stdin.write(buf)) done();
    else ff.stdin.once('drain', done);
  });

  let bytes = 0;
  let drawn = 0;
  const startedAt = process.hrtime.bigint();
  for (let i = 0; i < total; i += batch) {
    const count = Math.min(batch, total - i);
    const pngs = await page.evaluate(([from, n]) => window.__batch(from, n), [i, count]);
    for (const png of pngs) {
      const buf = Buffer.from(png, 'base64');
      bytes += buf.length;
      await write(buf);
    }
    drawn += pngs.length;
    const elapsed = Number(process.hrtime.bigint() - startedAt) / 1e9;
    if (onProgress) onProgress(drawn, total, drawn / elapsed);
    else {
      process.stdout.write(`\rframes     ${drawn}/${total} (${((drawn / total) * 100).toFixed(0)}%) `
        + `${(drawn / elapsed).toFixed(1)} fps, eta ${((elapsed / drawn) * (total - drawn)).toFixed(0)}s   `);
    }
  }

  ff.stdin.end();
  const status = await ffDone;
  process.stdout.write(`\rframes     ${drawn}/${total} drawn, ${(bytes / 1e6).toFixed(0)}MB piped`
    + ' '.repeat(24) + '\n');
  if (status !== 0) {
    throw new Error(`ffmpeg failed (${ffError ? ffError.message : `exit ${status}`})`);
  }
  return bytes;
}

// A page-side supersampled frame buffer: draw into `hi` at ss x the output, then
// reduce once with high-quality filtering into `out`. Returned as source text
// because it has to be evaluated inside the browser bundle, where the tools build
// their own painters — a function passed across the CDP bridge would lose its
// closure over the canvases.
export const FRAME_BUFFER_SRC = `
function makeFrameBuffer(outW, outH, ss) {
  const hi = document.createElement('canvas');
  hi.width = outW * ss;
  hi.height = outH * ss;
  const hx = hi.getContext('2d', { alpha: false });
  hx.lineJoin = 'round';
  hx.lineCap = 'round';
  hx.imageSmoothingEnabled = true;
  hx.imageSmoothingQuality = 'high';
  const out = document.createElement('canvas');
  out.width = outW;
  out.height = outH;
  const octx = out.getContext('2d', { alpha: false });
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = 'high';
  return {
    hi, hx, out,
    reduce() { octx.drawImage(hi, 0, 0, outW, outH); },
    png() { return out.toDataURL('image/png').slice('data:image/png;base64,'.length); },
  };
}
`;
