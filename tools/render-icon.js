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
import { drawToonFace } from '${join(root, 'src/sprites/toons.js').replace(/\\/g, '/')}';

window.paintIcon = (ctx, S, hero) => {
  // Plum, lit from the middle: the shutter sticker's colour, so the icon and
  // the first thing the game draws are recognisably the same object.
  const bg = ctx.createRadialGradient(S * 0.5, S * 0.42, S * 0.05, S * 0.5, S * 0.5, S * 0.72);
  bg.addColorStop(0, '#4a2668');
  bg.addColorStop(1, '#1b1029');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, S, S);

  // Arcade CRT scanlines, barely there — texture at 512, invisible at 60.
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  const band = Math.max(2, Math.round(S / 64));
  for (let y = 0; y < S; y += band * 2) ctx.fillRect(0, y, S, band);

  // A gold token with the face on it. Gold because Lorenzo is a dark purple cap
  // on a dark plum ground otherwise, and at 60px that is one shape, not a face
  // — and gold is already the game's own colour for its name.
  //
  // Everything lives inside a 0.4 radius: that is the safe zone a maskable icon
  // is allowed to keep, so Android can crop this to a circle, a squircle or a
  // teardrop and iOS can round the corners, and none of them clip him.
  const R = S * 0.40;
  const disc = ctx.createRadialGradient(S * 0.42, S * 0.36, S * 0.04, S * 0.5, S * 0.5, R * 1.1);
  disc.addColorStop(0, '#ffe07a');
  disc.addColorStop(1, '#eda227');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, R, 0, Math.PI * 2);
  ctx.fill();
  // The teal every button and plate in the game is outlined in. It rides just
  // outside the token, on the plum, where it is the one cool colour on the
  // tile — a dark rim between gold and plum would be invisible against a
  // background that is already that colour.
  ctx.lineWidth = S * 0.012;
  ctx.strokeStyle = '#48e0c8';
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, R * 1.075, 0, Math.PI * 2);
  ctx.stroke();

  drawToonFace(ctx, hero, S * 0.175, S * 0.15, S * 0.65, S * 0.65);
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
  // Rendered natively at each size rather than downscaled from one big one:
  // the art is vector, so the small sizes get their own honest rasterisation
  // instead of a blur of the 512.
  const dataUrl = await page.evaluate(([S, hero]) => {
    const c = document.getElementById('c');
    c.width = S; c.height = S;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, S, S);
    window.paintIcon(ctx, S, hero);
    return c.toDataURL('image/png');
  }, [size, HERO]);
  const png = Buffer.from(dataUrl.split(',')[1], 'base64');
  writeFileSync(join(root, `build/icons/icon-${size}.png`), png);
  console.log(`build/icons/icon-${size}.png (${(png.length / 1024).toFixed(1)} KB)`);
}

await browser.close();
