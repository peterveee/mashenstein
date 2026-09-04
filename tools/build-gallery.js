// Dev-only asset gallery: bundles tools/gallery-entry.js and inlines it into
// two self-contained pages that between them render every drawable in the game.
// Mirrors build/build.js (same esbuild options, same inline-the-bundle trick)
// so the gallery boots from file:// with no server and no network.
// Usage: node tools/build-gallery.js   (or: npm run gallery)
import esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const result = await esbuild.build({
  entryPoints: [join(root, 'tools/gallery-entry.js')],
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  minify: false, // dev tool: readable stacks matter more than bytes
  outdir: join(root, 'dist'),
  write: false,
  logLevel: 'info',
});

const js = result.outputFiles[0].text;
const shell = readFileSync(join(root, 'tools/gallery-shell.html'), 'utf8');
// </script> inside the bundle would terminate the tag early.
const safe = js.replace(/<\/script/gi, '<\\/script');

// ONE bundle, two pages. The bundle defines every section; the mode stamped
// into <body> decides which half of them attaches to the document (see PAGE
// in gallery-entry.js). Splitting at build time rather than at source keeps
// the two pages provably in step: same code, same controls, same helpers.
const PAGES = [
  {
    mode: 'main',
    file: 'gallery.html',
    heading: 'ASSET GALLERY',
    headingTc: 'Asset Gallery',
    subtitle: 'production reference · click any tile to save a PNG',
  },
  {
    mode: 'lab',
    file: 'gallery-lab.html',
    heading: 'LAB &amp; BAKE-OFFS',
    headingTc: 'Lab &amp; Bake-offs',
    subtitle: 'open art questions · click any tile to save a PNG',
  },
];

mkdirSync(join(root, 'dist'), { recursive: true });
for (const page of PAGES) {
  let html = shell;
  // Assert every placeholder actually landed: a silent no-op replace here
  // would ship a page stamped with the wrong mode, i.e. a duplicate.
  for (const [token, value] of [
    ['__MODE__', page.mode],
    ['__HEADING_TC__', page.headingTc],
    ['__HEADING__', page.heading],
    ['__SUBTITLE__', page.subtitle],
  ]) {
    if (!html.includes(token)) throw new Error(`gallery shell is missing ${token}`);
    html = html.split(token).join(value);
  }
  html = html.replace('/*__BUNDLE__*/', () => safe);
  writeFileSync(join(root, 'dist', page.file), html);
  console.log(`dist/${page.file} written (${(html.length / 1024).toFixed(0)} KB)`);
}

const capeResult = await esbuild.build({
  entryPoints: [join(root, 'tools/eggshell-cape-gallery-entry.js')],
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  minify: false,
  write: false,
  logLevel: 'info',
});
const capeShell = readFileSync(join(root, 'tools/eggshell-cape-gallery-shell.html'), 'utf8');
const capeJs = capeResult.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
if (!capeShell.includes('/*__BUNDLE__*/')) throw new Error('cape gallery shell is missing the bundle placeholder');
writeFileSync(join(root, 'dist', 'eggshell-cape-bakeoff.html'), capeShell.replace('/*__BUNDLE__*/', capeJs));
console.log('dist/eggshell-cape-bakeoff.html written');
