// Render the Home Screen icon from the game's own art.
//
// iOS shows a screenshot of the page if a site offers no apple-touch-icon, so
// an installed MASHENSTEIN used to sit on the home screen as an unreadable
// 60px thumbnail of the title screen. This draws Lorenzo — the face on the
// shutter, the one in the parade — at each size the platforms ask for, using
// the same vector painter the game uses, so the icon can never drift from the
// art the way a hand-exported PNG would.
//
// Dev tool, not part of `npm run build`: it needs a browser. Run it when the
// cast's look changes.
//   node tools/render-icon.js            -> build/icons/icon-{180,192,512}.png
import esbuild from 'esbuild';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIZES = [180, 192, 512];
const HERO = 'lorenzo';

// Playwright is not a dependency of this repo (see .claude/skills/verify).
// Resolve it out of the npx cache, installing it there on first run.
function loadPlaywright() {
  const globs = execFileSync('sh', ['-c',
    'ls -d ~/.npm/_npx/*/node_modules/playwright 2>/dev/null | head -1'],
  { encoding: 'utf8' }).trim();
  if (!globs) {
    console.error('playwright not cached — run `npx playwright install chromium` first');
    process.exit(1);
  }
  return createRequire(join(globs, 'package.json'))(join(globs, 'index.js'));
}

// The painter runs in the browser, where the game's drawing code expects to be.
const ENTRY = `
import { drawToonFace, setInk } from '${join(root, 'src/sprites/toons.js').replace(/\\/g, '/')}';

window.paintIcon = (ctx, S, hero) => {
  // Full-bleed arcade teal gives Lorenzo's purple cap and warm face clean
  // contrast without spending a third of the tile on a token-shaped frame.
  const bg = ctx.createLinearGradient(0, 0, S, S);
  bg.addColorStop(0, '#2aa9a7');
  bg.addColorStop(0.52, '#12657a');
  bg.addColorStop(1, '#082c49');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, S, S);

  // A broad cabinet-light bloom keeps the face bright through circular and
  // squircle masks while the corners retain enough depth to define the tile.
  const glow = ctx.createRadialGradient(S * 0.34, S * 0.24, 0, S * 0.42, S * 0.42, S * 0.72);
  glow.addColorStop(0, 'rgba(116,240,211,0.34)');
  glow.addColorStop(0.58, 'rgba(41,164,168,0.08)');
  glow.addColorStop(1, 'rgba(4,18,37,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, S, S);

  // Arcade CRT scanlines, barely there — texture at 512, invisible at 60.
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  const band = Math.max(2, Math.round(S / 64));
  for (let y = 0; y < S; y += band * 2) ctx.fillRect(0, y, S, band);

  // Icon art needs a single crisp silhouette. Production's deliberately soft,
  // translucent contours blend into moving scenery; on a static Home Screen
  // tile they look like several misregistered copies of the same edge. Use
  // thinner but fully opaque icon ink, without changing normal game rendering.
  setInk({ body: 0.38, face: 0.42, alpha: 5, brow: 1, browA: 1, browL: 0.15 });
  //
  // The in-game directional-light pass also adds volume that is useful in play
  // but too busy here, so this crop is flat-lit.
  // Centre Lorenzo's FACE rather than the total ink bounds. His long bill
  // carries the silhouette far to the right; centring that silhouette parked
  // his eyes, nose and moustache visibly left of the token centre.
  drawToonFace(ctx, hero, S * 0.10, S * 0.05, S * 0.90, S * 0.90, { light: false });
};
`;

const bundle = await esbuild.build({
  stdin: { contents: ENTRY, resolveDir: root, loader: 'js' },
  bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
});

const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<body style="margin:0"><canvas id="c"></canvas></body>');
await page.addScriptTag({ content: bundle.outputFiles[0].text });

mkdirSync(join(root, 'build/icons'), { recursive: true });
for (const size of SIZES) {
  // Supersample every requested size independently, then reduce it once with
  // high-quality filtering. Curves stay smooth without depending on a 512px
  // master or accumulating multiple resize passes.
  const dataUrl = await page.evaluate(([S, hero]) => {
    const scale = 4;
    const hi = document.createElement('canvas');
    hi.width = hi.height = S * scale;
    const hx = hi.getContext('2d');
    hx.scale(scale, scale);
    window.paintIcon(hx, S, hero);

    const c = document.getElementById('c');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, S, S);
    ctx.drawImage(hi, 0, 0, S, S);
    return c.toDataURL('image/png');
  }, [size, HERO]);
  const png = Buffer.from(dataUrl.split(',')[1], 'base64');
  writeFileSync(join(root, `build/icons/icon-${size}.png`), png);
  console.log(`build/icons/icon-${size}.png (${(png.length / 1024).toFixed(1)} KB)`);
}

await browser.close();
