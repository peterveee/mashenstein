// Build the Song Mixer as a standalone static HTML page for deployment.
//
// Mirrors build-gallery.js: bundles tools/mixer-entry.js and inlines it into
// tools/mixer-shell.html, producing dist/SongMixer/index.html. Called from
// build/build.js during production builds so the mixer ships alongside the game
// on GitHub Pages.
//
// TWO documents, not one. index.html is the desk; render-frame.html is a second,
// unbound copy of the audio engine that the desk loads in a hidden iframe to bounce
// a WAV through — see tools/mixer-render-entry.js for why that cannot be the same
// document. They ship together or not at all: a desk whose Render WAV button 404s is
// worse than one without the button.
//
// On a static host the mixer still has no backend for saving songs to the repo, and
// says so. What it CAN do here, and could not before, is get your work out: the WAV
// and the MIDI are made in the browser and downloaded. For the full editing
// experience, run `npm run mixer` locally.
import esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MIXER_BRAND } from './mixer-brand.js';
import { writeImportedIndex } from './lib/imported-index.js';

const here = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Bundle one entry point and inline it into a shell's `/*__BUNDLE__*\/` slot. */
async function inlined(root, entry, shell, define) {
  const result = await esbuild.build({
    entryPoints: [join(root, entry)],
    bundle: true,
    format: 'iife',
    target: ['es2020'],
    minify: false,               // dev tool: readable stacks beat bytes
    outdir: join(root, 'dist'),
    write: false,
    logLevel: 'warning',
    ...(define ? { define } : {}),
  });
  // </script> inside the bundle would terminate the tag early.
  const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  return readFileSync(join(root, shell), 'utf8').replace('/*__BUNDLE__*/', () => js);
}

/**
 * Write dist/SongMixer/ — the desk and its render frame.
 *
 * @returns {Promise<{index: number, frame: number}>} the two sizes, in KB
 */
export async function buildSongMixer(root = here) {
  // The song list first, for the reason tools/mixer.js's buildPage() does it: the two
  // generated indexes are a directory scan, and the bundle imports them by name. On a
  // fresh clone work/scratch/index.js does not exist at all until this writes the empty
  // one, and esbuild cannot resolve an import to a file that is not there — which is a
  // production build failing over the disposable drawer's contents.
  writeImportedIndex(root);
  const html = (await inlined(root, 'tools/mixer-entry.js', 'tools/mixer-shell.html',
    { __MASH_STATIC_MIXER__: 'true' }))
    .replaceAll('/*__MIXER_BRAND__*/', () => MIXER_BRAND)
    .replace('/*__MIXER_DEV_USER__*/', 'false');
  const frame = await inlined(root, 'tools/mixer-render-entry.js', 'tools/mixer-render-shell.html');

  const outDir = join(root, 'dist', 'SongMixer');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.html'), html);
  writeFileSync(join(outDir, 'render-frame.html'), frame);
  return { index: Math.round(html.length / 1024), frame: Math.round(frame.length / 1024) };
}

// `node tools/build-mixer-static.js` builds it on its own; build/build.js imports the
// function instead, so the two cannot emit different things.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { index, frame } = await buildSongMixer();
  console.log(`dist/SongMixer/index.html written (${index} KB mixer)`);
  console.log(`dist/SongMixer/render-frame.html written (${frame} KB engine)`);
}
