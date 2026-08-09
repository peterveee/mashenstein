// Build the Song Mixer as a standalone static HTML page for deployment.
//
// Mirrors build-gallery.js: bundles tools/mixer-entry.js and inlines it into
// tools/mixer-shell.html, producing dist/SongMixer/index.html. Called from
// build/build.js during production builds so the mixer ships alongside the game
// on GitHub Pages.
//
// The mixer is a dev tool — on a static host it has no backend for save/render,
// and shows a notice to that effect. For the full editing experience, run
// `npm run mixer` locally.
import esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const result = await esbuild.build({
  entryPoints: [join(root, 'tools/mixer-entry.js')],
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  minify: false,               // dev tool: readable stacks beat bytes
  outdir: join(root, 'dist'),
  write: false,
  logLevel: 'info',
  define: { __MASH_STATIC_MIXER__: 'true' },
});

const js = result.outputFiles[0].text;
const shell = readFileSync(join(root, 'tools/mixer-shell.html'), 'utf8');
// </script> inside the bundle would terminate the tag early.
const safe = js.replace(/<\/script/gi, '<\\/script');
const html = shell
  .replace('/*__MIXER_DEV_USER__*/', 'false')
  .replace('/*__BUNDLE__*/', () => safe);

const outDir = join(root, 'dist', 'SongMixer');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'index.html'), html);
console.log(`dist/SongMixer/index.html written (${(html.length / 1024).toFixed(0)} KB mixer)`);
