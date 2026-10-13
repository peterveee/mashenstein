// Level 3's background, the Martian invasion, as a video with its soundtrack.
//
// Dev tooling — never ships; writes to work/video/. Peter, 13 Oct 2026: "render
// a video of the entire of level 3 with the music … I don't want to see any
// game lane stuff or the cleaner robot or a hero … the background and the
// Martian battle recorded with the soundtrack".
//
// The station room as the level paints it (src/dev/space-look-candidates.js,
// the shipped look), with the stage's own length, gates (for the window
// layout only — the gate strips are not drawn), camera speed and finish stop
// taken from a real GravityRunState, so every invasion beat lands where it
// does in play. The camera runs the stage and then holds on the finish, as
// the game does, for --hold seconds.
//
// Usage: node tools/render-gravity-invasion.js [outPath] [--stage=3] [--from=SEC] [--fps=30] [--size=1920x1080]
//        [--ss=1] [--crf=16] [--hold=5] [--frames=N]
import { writeFileSync, mkdtempSync, mkdirSync, rmSync, renameSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname, basename, resolve } from 'path';
import { spawn } from 'child_process';
import { renderBankBrowser } from './lib/render-bank-browser.js';
import { wavBuffer } from './lib/wav.js';
import { resolveOrExit } from './lib/tracks.js';
import { bundleEntry, openArtPage } from './lib/art-page.js';
import { pipeFrames, FRAME_BUFFER_SRC } from './lib/mp4-pipe.js';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2), flags = {}, positional = [];
for (const a of argv) { const m = /^--([\w-]+)(?:=(.*))?$/.exec(a); if (m) flags[m[1]] = m[2] ?? true; else positional.push(a); }
const num = (k, d) => (flags[k] === undefined || !Number.isFinite(Number(flags[k])) ? d : Number(flags[k]));
const FPS = Math.round(num('fps', 30)), SS = Math.max(1, Math.round(num('ss', 1))), CRF = num('crf', 16), HOLD = num('hold', 5);
const size = /^(\d+)x(\d+)$/.exec(flags.size || '1920x1080');
const OUT_W = Number(size[1]), OUT_H = Number(size[2]);
const STAGE_N = Math.max(1, Math.min(3, Math.round(num('stage', 3)))), FROM = Math.max(0, num('from', 0));
const OUT = resolve(ROOT, positional[0] || `work/video/gravity-${STAGE_N}-background.mp4`);

// ---------------------------------------------------------------- the stage, as played
// Read from a real GravityRunState in a child process: its DOM stubs must not
// leak into this one, where they break the headless audio render.
import { execFileSync } from 'child_process';
const PROBE = `
// stage ${STAGE_N}
import { installDom } from './tests/dom-stub.js';
installDom();
const { GravityRunState } = await import('./src/game/gravity/state.js');
const { save } = await import('./src/engine/save.js');
const { STAGE_BY_ID } = await import('./src/data/stages.js');
const { trackIdOf } = await import('./src/data/tracks.js');
save.load(); save.newSlot(0, 0);
const run = new GravityRunState({ save, stage: STAGE_BY_ID['gravity-${STAGE_N}'], initialHeroId: 'lorenzo', difficulty: 1, seed: 1, onEnd: () => {} });
run.enter();
process.stdout.write(JSON.stringify({ length: run.totalDist, speed: run.baseSpeed(), finishCam: run.finishCameraX(), finishLine: run.finishWorldX() - run.finishCameraX(),
  gates: run.gravityGates.map((g) => ({ x: g.x, lane: g.lane, index: g.index })), track: trackIdOf(run.cabinet.music) }));
process.exit(0);
`;
const stage = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', PROBE], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').pop());
const RUN_SEC = stage.finishCam / stage.speed, SECONDS = RUN_SEC + HOLD;
const TOTAL = Math.min(Math.round((SECONDS - FROM) * FPS), Math.round(num('frames', Infinity)) || Infinity);
const track = resolveOrExit(stage.track);
console.log(`stage      gravity-${STAGE_N}: ${stage.length} long at ${stage.speed}/s, camera stops at ${RUN_SEC.toFixed(1)}s, +${HOLD}s hold`);
console.log(`frame      ${OUT_W}x${OUT_H} @ ${FPS}fps, ${TOTAL} frames (${(TOTAL / FPS).toFixed(1)}s)`);

// ---------------------------------------------------------------- audio: the song, looped as in play
// One pass of the loop after the way in is ~120 s, which covers the stage.
const { outL, outR, seconds, peak } = await renderBankBrowser(track.bank, { repeat: Math.max(1, Math.ceil(SECONDS / 110)), trackId: track.id });
if (seconds < TOTAL / FPS) { console.error(`the song rendered ${seconds.toFixed(1)}s, need ${(TOTAL / FPS).toFixed(1)}s — raise repeat`); process.exit(1); }
console.log(`audio      ${track.title}: ${seconds.toFixed(1)}s rendered, peak ${peak.toFixed(3)}`);
const work = mkdtempSync(join(tmpdir(), 'mash-invasion-'));
const wavPath = join(work, 'song.wav');
writeFileSync(wavPath, wavBuffer([outL, outR], peak > 0 ? 0.9 / peak : 1));
const cleanup = () => rmSync(work, { recursive: true, force: true });

// ---------------------------------------------------------------- frames
const ENTRY = `
import { SPACE_LOOKS, drawSpaceRoom } from '../src/dev/space-look-candidates.js';
import { GROUND_Y, applyWorld, screenYFor } from '../src/engine/camera.js';
${FRAME_BUFFER_SRC}
window.__init = (cfg) => {
  const { outW, outH, ss, fps, st } = cfg;
  const fb = makeFrameBuffer(outW, outH, ss);
  const look = SPACE_LOOKS['plateau-occasional'];
  const Z = 1.25, k = (outW * ss) / 480, logicalH = (outH * ss) / k, view = 480 / Z;
  const pan = (logicalH - 270) / 2;
  const floor = screenYFor(GROUND_Y, Z) + pan;
  const drawFrame = (f) => {
    const t = f / fps + cfg.from, cam = Math.min(t * st.speed, st.finishCam);
    const x = fb.hx;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.fillStyle = look.bg; x.fillRect(0, 0, outW * ss, outH * ss);
    x.setTransform(k, 0, 0, k, 0, 0);
    applyWorld(x, Z, pan);
    x.translate(0, GROUND_Y);
    drawSpaceRoom(x, look, { cam, view: view + 60, top: -floor / Z - 20, bottom: (logicalH - floor) / Z + 20, time: t,
      gates: st.gates, length: st.length, stage: cfg.stage, finishCam: st.finishCam, noGates: true,
      holdT: Math.max(0, t - st.finishCam / st.speed), speed: st.speed, finishLine: st.finishLine });
    fb.reduce();
  };
  drawFrame(0);
  window.__batch = (from, count) => { const out = []; for (let f = from; f < from + count; f++) { drawFrame(f); out.push(fb.png()); } return out; };
};
`;
const bundleJs = await bundleEntry(ENTRY, join(ROOT, 'tools'));
let browser, page;
try { ({ browser, page } = await openArtPage(bundleJs, { gpu: flags.gpu !== 'false' })); }
catch (err) { cleanup(); console.error(err.message); process.exit(1); }
await page.evaluate((cfg) => window.__init(cfg), { outW: OUT_W, outH: OUT_H, ss: SS, fps: FPS, st: stage, from: FROM, stage: STAGE_N });

mkdirSync(dirname(OUT), { recursive: true });
const PARTIAL = join(dirname(OUT), `.${basename(OUT)}.partial`);
const silent = join(work, 'silent.mp4');
let last = 0;
try {
  await pipeFrames({ page, total: TOTAL, fps: FPS, crf: CRF, outPath: silent,
    onProgress: (done) => { if (done - last >= FPS * 10 || done === TOTAL) { last = done; process.stdout.write(`\rframes     ${done}/${TOTAL}`); } } });
} catch (err) { await browser.close(); cleanup(); console.error(`\n${err.message}`); process.exit(1); }
await browser.close();

// ---------------------------------------------------------------- mux
console.log('\nencoding   muxing audio…');
const dur = TOTAL / FPS, FADE = Math.min(2.5, HOLD);
const mux = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', silent, ...(FROM > 0 ? ['-ss', FROM.toFixed(3)] : []), '-i', wavPath, '-c:v', 'copy',
  '-af', `afade=t=out:st=${Math.max(0, dur - FADE).toFixed(3)}:d=${FADE}`,
  '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-movflags', '+faststart', '-shortest', '-f', 'mp4', PARTIAL], { stdio: ['ignore', 'inherit', 'inherit'] });
const code = await new Promise((done) => { mux.on('error', () => done(-1)); mux.on('close', done); });
cleanup();
if (code !== 0 || !existsSync(PARTIAL)) { rmSync(PARTIAL, { force: true }); console.error(`ffmpeg mux failed (${code})`); process.exit(1); }
renameSync(PARTIAL, OUT);
console.log(`wrote      ${OUT}  (${dur.toFixed(1)}s)`);
process.exit(0);
