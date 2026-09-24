// Capture the real game for the 36.2-second, 16:9 September feature reel.
// Run `MASH_DEV_URL=http://localhost:8002 node tools/render-feature-reel.js` after
// `npm run dev`. Source clips and audio remain in work/local/feature-reel-build;
// the review copy is work/social/mashenstein-feature-reel-16x9.mp4.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { openRenderer } from './lib/render-bank-browser.js';
import { wavBuffer, SR } from './lib/wav.js';
import { makeObstacle, makeDroneColumn } from '../src/game/entities.js';
import { deskBank, deskLanes, lenKey } from '../src/engine/lanes.js';
import { applyArrangement } from '../src/data/arrangements.js';
import { IntroFilm } from '../src/game/intro.js';
import * as neon from '../src/data/songs/neon.js';

const ROOT = resolve(import.meta.dirname, '..');
const DIR = join(ROOT, 'work/local/feature-reel-build');
const OUT = join(ROOT, 'work/social/mashenstein-feature-reel-16x9.mp4');
const BASE = process.env.MASH_DEV_URL || 'http://localhost:8002';
const FPS = 60;
mkdirSync(DIR, { recursive: true });

const shots = [
  { id: 'dive', seconds: 3.2, intro: true },
  { id: 'barn', seconds: 3.2, stage: 'plumber-1', at: 5, sceneryOnly: true },
  { id: 'windmill', seconds: 3.2, stage: 'plumber-3', at: 34, sceneryOnly: true },
  { id: 'rake', seconds: 1.6, stage: 'plumber-1', at: 13, obstacle: 'rake', jumps: [0.16] },
  { id: 'goose', seconds: 1.6, stage: 'plumber-2', at: 22, obstacle: 'goose', jumps: [0.12] },
  { id: 'snake', seconds: 1.6, stage: 'speed-1', at: 18, obstacle: 'rattlesnake', jumps: [0.15] },
  { id: 'camera', seconds: 1.6, trimStart: 0.8, stage: 'speed-2', at: 2 },
  { id: 'lift', seconds: 3.2, stage: 'frost-1', at: 1, obstacle: 'iceCrystals', jumps: [1.55] },
  { id: 'jet', seconds: 1.6, stage: 'speed-3', at: 46, sceneryOnly: true },
  { id: 'reindeer', seconds: 1.6, stage: 'frost-2', at: 85, sceneryOnly: true },
  { id: 'train', seconds: 6.4, stage: 'neon-2', at: 41, jumps: [0.2, 1.8, 4.35, 5.3] },
  { id: 'tower', seconds: 3.2, stage: 'neon-2', at: 49, sceneryOnly: true },
  { id: 'night', seconds: 3.2, stage: 'neon-2', at: 56, strike: true, obstacle: 'droneColumn', sceneryOnly: true },
];
const captions = [
  { start: 3.2, end: 9.45, text: 'NEW SCENERY' },
  { start: 9.6, end: 12.65, text: 'NEW OBSTACLES' },
  { start: 12.8, end: 15.85, text: 'SPEED ZONE' },
  { start: 16, end: 22.25, text: 'FROST FORTRESS' },
  { start: 22.4, end: 28.65, text: 'CATCH THE TRAIN' },
  { start: 28.8, end: 33.45, text: 'NIGHT RUN' },
];

function command(bin, args) {
  const r = spawnSync(bin, args, { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${bin} exited ${r.status}`);
}

async function recordShotRealtime(browser, shot) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(`${BASE}/?goto=intro`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__mash_booted && window.__mash_state === 'IntroState',
    { timeout: 30000 });
  // The stage shortcut skips briefing; let its first render and fonts settle.
  await page.waitForTimeout(350);
  await page.evaluate(async (t0) => {
    window.__mash_cur.seek(t0);
    await window.__mash_audio.ctx?.resume();
    window.__mash_audio.setMuted(false);
    if (window.__mash_audio.musicGain) window.__mash_audio.musicGain.gain.value = 0;
  }, IntroFilm.DIVE_AT - 0.8);
  const raw = join(DIR, `${shot.id}.webm`);
  const downloadPromise = page.waitForEvent('download', { timeout: Math.ceil((shot.seconds + 15) * 1000) });
  await page.evaluate(({ id, seconds, fps }) => {
    const canvas = document.getElementById('game');
    const stream = canvas.captureStream(fps);
    const audio = window.__mash_audio.captureStream();
    if (audio) for (const track of audio.getAudioTracks()) stream.addTrack(track);
    const rec = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp8,opus',
      videoBitsPerSecond: 20_000_000,
    });
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${id}.webm`;
      a.click();
    };
    rec.start(200);
    setTimeout(() => rec.stop(), seconds * 1000);
  }, { id: shot.id, seconds: shot.seconds, fps: FPS });
  const download = await downloadPromise;
  await download.saveAs(raw);
  await page.close();
  console.log(`captured intro dive audio (${shot.seconds}s)`);
}

async function recordShotSmooth(browser, shot) {
  const page = await browser.newPage({ viewport: { width: 3840, height: 2160 } });
  const q = shot.intro
    ? '?mute&density=8&goto=intro'
    : `?mute&density=8&goto=stage&cab=${shot.stage.split('-')[0]}&stage=${shot.stage}&invuln&seed=7&startAt=${shot.at}`;
  await page.goto(`${BASE}/${q}`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction((intro) => window.__mash_booted && window.__mash_render_loop
    && window.__mash_state === (intro ? 'IntroState' : 'RunState'), shot.intro, { timeout: 30000 });
  await page.evaluate(({ sceneryOnly, intro, introAt }) => {
    window.__mash_render_loop.pause();
    if (intro) {
      window.__mash_cur.captureCleanPlate = true;
      window.__mash_cur.seek(introAt);
    } else {
      const run = window.__mash_cur;
      run.captureCleanPlate = true;
      if (window.__mash_dev) window.__mash_dev.draw = () => {};
      run.floaties = [];
      run.floatText = () => {};
      run.speech = null;
      run.say = () => {};
      // Capture only: keep the hero's authored jumps but avoid hitstop, camera
      // shake and the failed-bonus state if a background obstacle brushes him.
      run.takeHit = () => {};
      if (sceneryOnly) run.rhythmHeroVisible = () => false;
    }
  }, { sceneryOnly: !!shot.sceneryOnly, intro: !!shot.intro, introAt: IntroFilm.DIVE_AT - 0.8 });
  const canvasSize = await page.evaluate(() => {
    const c = document.getElementById('game');
    return [c.width, c.height];
  });
  if (canvasSize[0] !== 3840 || canvasSize[1] !== 2160)
    throw new Error(`Expected native 4K game render, got ${canvasSize.join('x')}`);
  if (shot.obstacle) {
    const x = await page.evaluate(() => window.__mash_cur.playerWorldX());
    const objects = shot.obstacle === 'droneColumn'
      ? makeDroneColumn(x + 115, 3)
      : [makeObstacle(shot.obstacle, x + (shot.id === 'lift' ? 250 : 115))];
    for (const o of objects) o.id += 100000;
    await page.evaluate((items) => { window.__mash_cur.obstacles.push(...items); }, objects);
  }
  const count = Math.round(shot.seconds * FPS);
  const skip = Math.round((shot.trimStart ?? 0) * FPS);
  const mp4 = join(DIR, `${shot.id}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe',
    '-framerate', String(FPS), '-i', 'pipe:0', '-frames:v', String(count),
    '-vf', 'scale=1920:1080:flags=lanczos,setsar=1',
    '-c:v', 'libx264', '-preset', 'medium', '-tune', 'animation', '-crf', '12',
    '-pix_fmt', 'yuv420p', mp4], { cwd: ROOT, stdio: ['pipe', 'inherit', 'inherit'] });
  const jumps = (shot.jumps || []).map((t) => Math.round(t * FPS));
  const strike = shot.strike ? Math.round(0.9 * FPS) : -1;
  let frameIndex = 0;
  try {
    for (let at = -skip; at < count; at += 3) {
      const batchCount = Math.min(3, count - at);
      const frames = await page.evaluate(({ at, batchCount, jumps, strike }) => {
        const pngs = [];
        const loop = window.__mash_render_loop;
        for (let n = 0; n < batchCount; n++) {
          const i = at + n;
          if (jumps.includes(i)) window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true }));
          if (jumps.some((j) => i === j + 8)) window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', key: ' ', bubbles: true }));
          if (i === strike) {
            const sky = window.__mash_cur.neonSky;
            if (sky) { sky.turned = true; sky.strikeT = 0; sky.strikeFrom = null; }
          }
          loop.stepOffline();
          if (i >= 0) pngs.push(document.getElementById('game').toDataURL('image/png').split(',')[1]);
        }
        return pngs;
      }, { at, batchCount, jumps, strike });
      for (const png of frames) {
        if (!ff.stdin.write(Buffer.from(png, 'base64'))) await once(ff.stdin, 'drain');
        frameIndex++;
      }
    }
    ff.stdin.end();
    const [code] = await once(ff, 'close');
    if (code !== 0) throw new Error(`ffmpeg exited ${code} for ${shot.id}`);
    if (frameIndex !== count) throw new Error(`Captured ${frameIndex}/${count} frames for ${shot.id}`);
  } finally { await page.close(); }
  console.log(`captured ${shot.id}: ${count} fixed 60 fps simulation frames`);
}

async function renderTitle(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(`${BASE}/?goto=title`, { waitUntil: 'load', timeout: 30000 });
  const png = await page.evaluate(async () => {
    await document.fonts.load("400 112px 'Lilita One'");
    const canvas = document.createElement('canvas');
    canvas.width = 1920; canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    let px = 148;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.letterSpacing = '2px';
    do { ctx.font = `400 ${px--}px 'Lilita One'`; }
    while (ctx.measureText('MASHENSTEIN').width > 1120);
    ctx.lineJoin = 'round'; ctx.lineWidth = 7; ctx.strokeStyle = '#2a1e05';
    ctx.strokeText('MASHENSTEIN', 965, 565);
    ctx.fillStyle = '#a8791f'; ctx.fillText('MASHENSTEIN', 965, 565);
    ctx.strokeText('MASHENSTEIN', 960, 560);
    ctx.fillStyle = '#ffcf33'; ctx.fillText('MASHENSTEIN', 960, 560);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  writeFileSync(join(DIR, 'title.png'), Buffer.from(png, 'base64'));
  await page.evaluate(() => document.fonts.load("600 40px 'Fredoka'"));
  for (let i = 0; i < captions.length; i++) {
    const captionPng = await page.evaluate((label) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1920; canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      ctx.font = "600 38px 'Fredoka'";
      const w = ctx.measureText(label).width + 52;
      ctx.fillStyle = 'rgba(8,9,22,0.72)';
      ctx.beginPath(); ctx.roundRect(72, 66, w, 68, 16); ctx.fill();
      ctx.fillStyle = '#f5f3fb';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 98, 101);
      return canvas.toDataURL('image/png').split(',')[1];
    }, captions[i].text);
    writeFileSync(join(DIR, `caption-${i}.png`), Buffer.from(captionPng, 'base64'));
  }
  await page.close();
}

async function recordIsolatedClick(browser) {
  const page = await browser.newPage();
  await page.goto(`${BASE}/?goto=title`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__mash_booted && window.__mash_audio, { timeout: 30000 });
  await page.evaluate(async () => {
    await window.__mash_audio.ctx?.resume();
    window.__mash_audio.setMuted(false);
    if (window.__mash_audio.musicGain) window.__mash_audio.musicGain.gain.value = 0;
  });
  const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
  await page.evaluate(() => {
    const stream = window.__mash_audio.captureStream();
    const rec = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    const chunks = [];
    rec.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    rec.onstop = () => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob(chunks, { type: 'audio/webm' }));
      link.download = 'camera-click.webm';
      link.click();
    };
    rec.start(100);
    setTimeout(() => window.__mash_audio.sfx('clickHard'), 120);
    setTimeout(() => rec.stop(), 800);
  });
  const download = await downloadPromise;
  await download.saveAs(join(DIR, 'camera-click.webm'));
  await page.close();
}

function decodeF32(path, seconds) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', path, '-vn', '-ac', '2', '-ar', String(SR),
    '-t', String(seconds), '-f', 'f32le', 'pipe:1'], { maxBuffer: 40 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`ffmpeg could not decode ${path}: ${r.stderr}`);
  const buf = r.stdout;
  return new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

function isolatedSongLanes(bank, arrangement, keep) {
  const arranged = applyArrangement(bank, neon.id, { [neon.id]: arrangement });
  const all = deskLanes(deskBank(arranged, neon.mix), 1).map((lane) => lane.key);
  const strip = (section) => {
    const out = { ...section };
    for (const key of all) if (!keep.has(key)) {
      delete out[key];
      delete out[lenKey(key)];
    }
    return out;
  };
  return {
    bank: { ...strip(bank), sections: bank.sections?.map(strip) },
    arrangement: { ...arrangement, sections: arrangement.sections?.map(strip) },
  };
}

async function renderAudio() {
  const renderer = await openRenderer();
  let solo, full;
  try {
    const isolated = isolatedSongLanes(neon.bank, neon.arrangement, new Set(['lead5', 'lead8']));
    solo = await renderer.render(isolated.bank, {
      trackId: neon.id, mix: neon.mix, arrangement: isolated.arrangement,
      lanes: new Set(['lead5', 'lead8']), range: { startStep: 48 * 16, endStep: 52 * 16 }, tail: 0,
    });
    full = await renderer.render(neon.bank, {
      trackId: neon.id, mix: neon.mix, arrangement: neon.arrangement,
      range: { startStep: 44 * 16, endStep: 60 * 16 }, tail: 0,
    });
  } finally { await renderer.close(); }
  const frames = Math.round(SR * 36.2);
  writeFileSync(join(DIR, 'solo-bars-49-52.wav'), wavBuffer([solo.outL, solo.outR]));
  const outL = new Float32Array(frames), outR = new Float32Array(frames);
  const soloFrames = Math.min(Math.round(6.4 * SR), solo.outL.length);
  const fullFrames = Math.min(Math.round(25.6 * SR), full.outL.length);
  for (let i = 0; i < soloFrames; i++) {
    const j = Math.round(3.2 * SR) + i;
    outL[j] = solo.outL[i];
    outR[j] = solo.outR[i];
  }
  for (let i = 0; i < fullFrames; i++) {
    const j = Math.round(9.6 * SR) + i;
    outL[j] = full.outL[i];
    outR[j] = full.outR[i];
  }
  // The dive capture uses the game's own SFX graph and cue clock, including the
  // cabinet-specific leap voice, boom's room tail and portal breath. The music
  // bus was muted for that capture; music begins only after the dive.
  const dive = decodeF32(join(DIR, 'dive.webm'), 3.2);
  for (let i = 0; i < Math.min(dive.length / 2, frames); i++) {
    const gain = i / SR < 2.7 ? 0.95 : Math.max(0, 0.95 * (3.2 - i / SR) / 0.5);
    outL[i] += dive[i * 2] * gain;
    outR[i] += dive[i * 2 + 1] * gain;
  }
  // A separate dry shutter stem, placed at the visible camera flash. No stage
  // capture audio is mixed into the reel.
  const click = decodeF32(join(DIR, 'camera-click.webm'), 0.8);
  writeFileSync(join(DIR, 'camera-click.wav'), wavBuffer([
    Float32Array.from({ length: click.length / 2 }, (_, i) => click[i * 2]),
    Float32Array.from({ length: click.length / 2 }, (_, i) => click[i * 2 + 1]),
  ]));
  const clickAt = Math.round(15.43 * SR);
  for (let i = 0; i < click.length / 2 && clickAt + i < frames; i++) {
    outL[clickAt + i] += click[i * 2] * 0.34;
    outR[clickAt + i] += click[i * 2 + 1] * 0.34;
  }
  // Use the same squared rate and darkening idea as the in-game tape brake, but
  // end at zero: the rewind-release cue spins up again, whereas this is the end card.
  for (let i = 0; i < SR; i++) {
    const u = i / SR, rate = (1 - u) ** 2;
    const source = Math.max(0, fullFrames - Math.round(SR / 3)
      + Math.round((1 - (1 - u) ** 3) * SR / 3));
    const cutoff = Math.max(60, 20000 * rate ** 1.5);
    const alpha = 1 - Math.exp(-2 * Math.PI * cutoff / SR);
    const j = Math.round(SR * 35.2) + i;
    if (i === 0) { outL[j] = full.outL[source] || 0; outR[j] = full.outR[source] || 0; }
    else {
      outL[j] = outL[j - 1] + alpha * ((full.outL[source] || 0) - outL[j - 1]);
      outR[j] = outR[j - 1] + alpha * ((full.outR[source] || 0) - outR[j - 1]);
    }
    const fade = (1 - u) ** 1.4;
    outL[j] *= fade; outR[j] *= fade;
  }
  let peak = 0;
  for (let i = 0; i < frames; i++) peak = Math.max(peak, Math.abs(outL[i]), Math.abs(outR[i]));
  if (peak > 0.95) for (let i = 0; i < frames; i++) {
    outL[i] *= 0.95 / peak; outR[i] *= 0.95 / peak;
  }
  const wav = join(DIR, 'soundtrack.wav');
  writeFileSync(wav, wavBuffer([outL, outR]));
  console.log(`rendered ${wav}`);
  return wav;
}

async function main() {
  const selected = process.argv.find((a) => a.startsWith('--shots='))?.slice(8).split(',') || null;
  const captureOnly = process.argv.includes('--capture-only');
  const audioOnly = process.argv.includes('--audio-only');
  const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    for (const shot of audioOnly ? [] : shots) if (!selected || selected.includes(shot.id)) {
      if (shot.intro && (!existsSync(join(DIR, `${shot.id}.webm`)) || process.argv.includes('--refresh-dive-audio')))
        await recordShotRealtime(browser, shot);
      await recordShotSmooth(browser, shot);
    }
    if (!captureOnly && (!existsSync(join(DIR, 'camera-click.webm')) || process.argv.includes('--refresh-click')))
      await recordIsolatedClick(browser);
    if (!captureOnly && !audioOnly) await renderTitle(browser);
  }
  finally { await browser.close(); }
  if (captureOnly) return;
  const wav = await renderAudio();
  if (audioOnly) return;
  const list = join(DIR, 'clips.txt');
  writeFileSync(list, shots.map((shot) => `file '${join(DIR, `${shot.id}.mp4`)}'`).join('\n') + '\n');
  const joined = join(DIR, 'joined.mp4');
  command('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', joined]);
  const titlePng = join(DIR, 'title.png');
  const filters = ['[0:v]tpad=stop_mode=clone:stop_duration=1[v0]'];
  captions.forEach((caption, i) => {
    filters.push(`[v${i}][${i + 3}:v]overlay=enable='between(t,${caption.start},${caption.end})':shortest=1[v${i + 1}]`);
  });
  filters.push(`[v${captions.length}][2:v]overlay=enable='between(t,33.6,36.2)':shortest=1[v]`);
  command('ffmpeg', ['-y', '-loglevel', 'error', '-i', joined, '-i', wav,
    '-loop', '1', '-i', titlePng,
    ...captions.flatMap((_, i) => ['-loop', '1', '-i', join(DIR, `caption-${i}.png`)]),
    '-filter_complex', filters.join(';'), '-map', '[v]', '-map', '1:a:0',
    '-t', '36.2', '-r', String(FPS), '-c:v', 'libx264', '-preset', 'slow', '-crf', '12',
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', OUT]);
  console.log(OUT);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
