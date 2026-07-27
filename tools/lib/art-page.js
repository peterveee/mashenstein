// A headless Canvas2D page that draws with the game's own painters.
//
// Shared by the promo tools (render-social.js, render-cabinet-reel.js). Same
// shape as render-icon.js — bundle an entry that imports from src/, run it in
// headless Chromium, draw to a real canvas — with the two things those tools
// need and the icon does not: webfonts, and GPU rasterization.
//
// Fonts matter here because promo art carries type. The posters set their own
// wordmarks, the menu board sets a whole menu, and every scene tile is labelled.
// src/engine/sprites.js measures each glyph once and caches the advance, so text
// drawn before the faces land is not merely in the wrong face — it is spaced for
// Trebuchet and stays that way for the life of the page. So the page waits for
// the faces and then checks that they actually arrived, rather than trusting a
// resolved promise (see the long comment at sprites.js' font hook for why
// document.fonts.ready alone is not enough).
import { createRequire } from 'module';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);

// The same stylesheet and face list the boot gate uses (src/gate.js). Kept in
// step by hand: a face the game loads and this does not is a face the promo art
// silently renders in Trebuchet.
export const FONT_URL = 'https://fonts.googleapis.com/css2?family=Lilita+One&family=Fredoka:wght@400..600&family=Permanent+Marker&display=swap';
export const FONT_FACES = [
  "400 32px 'Lilita One'",
  "500 12px 'Fredoka'",
  "600 12px 'Fredoka'",
  "400 12px 'Permanent Marker'",
];

// Headless Chromium rasterizes Canvas2D on the CPU by default (SwiftShader),
// which for supersampled 1080p+ frames full of gradients is the most expensive
// thing these tools do — see .claude/skills/render-video/SKILL.md, measured at
// ~5.6x end to end on the video render.
const GPU_ARGS = ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'];

export async function bundleEntry(source, resolveDir) {
  const esbuild = require('esbuild');
  const out = await esbuild.build({
    stdin: { contents: source, resolveDir, loader: 'js' },
    bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
  });
  return out.outputFiles[0].text;
}

// Opens the page and returns it with the game's faces guaranteed usable.
// Throws if they never arrive — silently shipping mis-spaced type in the wrong
// face is worse than failing, because nothing downstream can detect it.
export async function openArtPage(bundleJs, { gpu = true, fontTimeoutMs = 15000 } = {}) {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    throw new Error('playwright is required: npm install');
  }
  const browser = await chromium.launch({ args: gpu ? GPU_ARGS : [] });
  const page = await browser.newPage({ viewport: { width: 64, height: 64 } });
  await page.setContent(
    `<!doctype html><meta charset="utf-8">`
    + `<link rel="stylesheet" href="${FONT_URL}">`
    + `<style>html,body{margin:0;background:#000}</style>`
    + `<script>${bundleJs.replace(/<\/script>/g, '<\\/script>')}<\/script>`,
    { waitUntil: 'load' },
  );

  const fonts = await page.evaluate(async ({ faces, timeout }) => {
    // A @font-face is only fetched once something renders with it, and this page
    // renders only to canvas. Asking for the faces by name is what starts the
    // download; the race is the bound on a slow or offline font response.
    await Promise.race([
      Promise.all(faces.map((f) => document.fonts.load(f).catch(() => {}))),
      new Promise((done) => setTimeout(done, timeout)),
    ]);
    return faces.map((f) => ({ face: f, ok: document.fonts.check(f) }));
  }, { faces: FONT_FACES, timeout: fontTimeoutMs });

  const missing = fonts.filter((f) => !f.ok).map((f) => f.face);
  if (missing.length) {
    await browser.close();
    throw new Error(
      `webfonts did not load, so every label would be set in the fallback face `
      + `and spaced for it: ${missing.join(', ')}\n`
      + `  ${FONT_URL}\n  (these renders need network access the first time; check the connection)`,
    );
  }
  return { browser, page };
}

// Draws one image supersampled and reduces it once with high-quality filtering,
// the same approach render-icon.js uses. `painter` is the name of a function the
// bundle put on window; it receives (ctx, w, h, arg) already scaled so it can
// draw in logical units.
export async function paintPng(page, painter, { w, h, logicalW, logicalH, ss = 2, arg = null }) {
  const dataUrl = await page.evaluate(({ name, w, h, lw, lh, ss, arg }) => {
    const hi = document.createElement('canvas');
    hi.width = w * ss;
    hi.height = h * ss;
    const hx = hi.getContext('2d', { alpha: false });
    // Cover, not stretch: scale by the larger ratio and centre the overflow, so
    // a logical frame whose aspect does not match the output crops rather than
    // distorts. Matched aspects make this a plain uniform scale.
    const fit = Math.max(hi.width / lw, hi.height / lh);
    hx.setTransform(fit, 0, 0, fit, (hi.width - lw * fit) / 2, (hi.height - lh * fit) / 2);
    hx.lineJoin = 'round';
    hx.lineCap = 'round';
    hx.imageSmoothingEnabled = true;
    hx.imageSmoothingQuality = 'high';
    window[name](hx, lw, lh, arg);

    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const octx = out.getContext('2d', { alpha: false });
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = 'high';
    octx.drawImage(hi, 0, 0, w, h);
    return out.toDataURL('image/png');
  }, { name: painter, w, h, lw: logicalW, lh: logicalH, ss, arg });
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

export function writePng(path, buf) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buf);
  return buf.length;
}

export { join };
