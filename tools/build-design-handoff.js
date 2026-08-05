// Bundles one self-contained character spec page per hero for Claude Design.
// Same inline-the-bundle trick as tools/build-gallery.js, so each page boots
// from file:// with no server and no network — which is also what Design's CSP
// requires. One bundle serves every hero; the shell picks which via __HERO_ID__.
//
// Usage: node tools/build-design-handoff.js [heroId ...]   (default: lorenzo grumpos)
import esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HEROES } from '../src/data/heroes.js';
import { HERO_DRAW_H } from '../src/game/draw.js';
import { W as FRAME_W, H as FRAME_H } from '../src/engine/renderer.js';
import { ZOOM } from '../src/engine/camera.js';
import { INTRO_ZOOM_START } from '../src/game/tutorial.js';
import { TOON_SPECS } from '../src/sprites/toons.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'work/local/design-handoff');

const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['lorenzo', 'grumpos'];
for (const id of ids) {
  if (!TOON_SPECS[id]) {
    console.error(`unknown hero '${id}' — have: ${Object.keys(TOON_SPECS).join(', ')}`);
    process.exit(1);
  }
}

const result = await esbuild.build({
  entryPoints: [join(root, 'tools/design-handoff-entry.js')],
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  minify: false,
  outdir: join(root, 'work/local'),
  write: false,
  logLevel: 'warning',
});
// </script> inside the bundle would terminate the tag early.
const bundle = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const shell = readFileSync(join(root, 'tools/design-handoff-shell.html'), 'utf8');

// Same arithmetic the page does, so the prose in the brief cannot contradict the
// cards: hero height in the frame, scaled by renderer.js's letterbox fit.
const heroCssPx = (vw, vh) => HERO_DRAW_H * ZOOM * Math.min(vw / FRAME_W, vh / FRAME_H);
const sizeRange = `${Math.round(heroCssPx(852, 393))}–${Math.round(heroCssPx(2560, 1440))} CSS px`;

mkdirSync(outDir, { recursive: true });
const written = [];
for (const id of ids) {
  const hero = HEROES.find((h) => h.id === id);
  const name = hero ? hero.name : id.toUpperCase();
  const html = shell
    .replaceAll('__GROUP__', 'Characters')
    .replaceAll('__NAME__', name)
    .replaceAll('__ID__', id)
    .replaceAll('__GEOM_JSON__', JSON.stringify({
      heroDrawH: HERO_DRAW_H, zoom: ZOOM, frameW: FRAME_W, frameH: FRAME_H,
      tutorialZoom: INTRO_ZOOM_START,
    }))
    .replaceAll('__SIZE_RANGE__', sizeRange)
    .replace('/*__BUNDLE__*/', () => bundle);
  const path = join(outDir, `${id}.html`);
  writeFileSync(path, html);
  written.push([path, html.length]);
  console.log(`${path} (${(html.length / 1024).toFixed(0)} KB)`);
}
console.log(`\n${written.length} page(s) in work/local/design-handoff/`);
