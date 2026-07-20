// Dev-only asset gallery: bundles tools/gallery-entry.js and inlines it into a
// self-contained dist/gallery.html that renders every drawable in the game.
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
const html = shell.replace('/*__BUNDLE__*/', () => safe);
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/gallery.html'), html);
console.log(`dist/gallery.html written (${(html.length / 1024).toFixed(0)} KB)`);
