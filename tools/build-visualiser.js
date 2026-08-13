// The file-driven visualiser, as one self-contained page: bundles
// tools/visualiser-entry.js and inlines it into dist/visualiser.html, which opens
// from file:// with no server (the file picker and File.arrayBuffer() both work
// there — nothing is fetched).
//
// Mirrors tools/build-gallery.js, same esbuild options, same inline-the-bundle
// trick, with one addition: MASHENSTEIN's cast does not go in this page.
// src/engine/visualisers.js imports ../sprites/toons.js and ../sprites/props.js at
// module scope, so simply declining to offer ARCADE ART GALLERY and TOASTER SKY
// PARADE would leave every hero painter in the bundle anyway. The plugin below
// resolves both modules to tools/lib/no-sprites.js, and the entry excludes the
// two presets from every path that deals one — including VJ MEGAMIX's deck.
//
// buildVisualiserHtml is exported so tools/mixer.js serves the same page from the
// same configuration rather than a second copy of it.
// Usage: node tools/build-visualiser.js   (or: npm run visualiser)
import esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Resolve the sprite modules to a stub, by resolved PATH rather than by import
 * specifier — the same module is reachable as '../sprites/toons.js' from
 * src/engine and as '../../sprites/props.js' from src/engine/stylePacks, and an
 * alias keyed on the specifier would catch one and miss the other.
 */
const stripSprites = (root) => ({
  name: 'strip-sprites',
  setup(build) {
    const stub = join(root, 'tools/lib/no-sprites.js');
    build.onResolve({ filter: /sprites[/\\](toons|props)\.js$/ }, (args) => {
      if (args.importer.includes('no-sprites.js')) return null;
      return { path: stub };
    });
  },
});

export async function buildVisualiserHtml(root) {
  const result = await esbuild.build({
    entryPoints: [join(root, 'tools/visualiser-entry.js')],
    bundle: true,
    format: 'iife',
    target: ['es2020'],
    minify: false, // dev tool: readable stacks matter more than bytes
    outdir: join(root, 'dist'),
    write: false,
    logLevel: 'warning',
    plugins: [stripSprites(root)],
  });
  // </script> inside the bundle would terminate the tag early.
  const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const shell = readFileSync(join(root, 'tools/visualiser-shell.html'), 'utf8');
  return shell.replace('/*__BUNDLE__*/', () => js);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const html = await buildVisualiserHtml(root);
  mkdirSync(join(root, 'dist'), { recursive: true });
  writeFileSync(join(root, 'dist/visualiser.html'), html);
  console.log(`dist/visualiser.html written (${(html.length / 1024).toFixed(0)} KB)`);
}
