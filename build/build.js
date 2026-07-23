// Build: bundle src/main.js (IIFE) and inline it into template.html -> dist/index.html.
// The dist file is fully self-contained and works from file://.
//
// It is not the ONLY file in dist/ any more: an installed game also gets a
// service worker, an app icon and a web manifest (see emitAppShell below).
// Those are additions, not dependencies — index.html on its own, off a USB
// stick, still boots and plays exactly as before.
import esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const watch = process.argv.includes('--watch');

const options = {
  entryPoints: [join(root, 'src/main.js')],
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  minify: !watch,
  sourcemap: watch ? 'inline' : false,
  // We inline the bundle into template.html ourselves, so nothing is written
  // by esbuild -- but ctx.serve() still refuses an entry point that has no
  // output path to map requests onto, so name one it will never write to.
  outdir: join(root, 'dist'),
  write: false,
  logLevel: 'info',
};

// Dev-only build stamp. Computed inside emit() so every watch rebuild carries a
// fresh time, and omitted entirely from `npm run build` — the published
// dist/index.html has no stamp, so the title screen draws nothing.
function buildStamp() {
  if (!watch) return '';
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const s = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} `
    + `${p(d.getHours())}:${p(d.getMinutes())}`;
  return `window.__MASH_BUILD__=${JSON.stringify(s)};\n`;
}

function buildTimestamp() {
  return new Date().toISOString();
}

// The icon sizes the platforms actually ask for: 180 is what iOS wants for a
// Home Screen tile, 192 and 512 are what a web manifest is expected to offer.
// Rendered from the game's own drawing code by tools/render-icon.js.
const ICONS = [180, 192, 512];

// Everything an INSTALLED copy needs and a loose index.html does not: the
// service worker that keeps a Home Screen launch current, the icon iOS shows
// instead of a screenshot of whatever the page looked like when it was added,
// and the manifest that tells Android the same things the <meta> tags tell iOS.
// Each piece degrades to nothing if it is missing.
function emitAppShell(html) {
  const dist = join(root, 'dist');
  // Version = a hash of the page itself, so sw.js changes its own bytes on
  // every real change to the game and stays byte-identical when nothing moved.
  // That byte difference is the only thing a browser checks to decide a worker
  // is new, and a version that churned on every build (a timestamp, say) would
  // reinstall the worker for nothing.
  const version = createHash('sha1').update(html).digest('hex').slice(0, 10);
  const sw = readFileSync(join(root, 'build/sw.js'), 'utf8').replace('__VERSION__', version);
  writeFileSync(join(dist, 'sw.js'), sw);

  const icons = ICONS.filter((size) => {
    const src = join(root, `build/icons/icon-${size}.png`);
    if (!existsSync(src)) return false;
    copyFileSync(src, join(dist, `icon-${size}.png`));
    return true;
  });
  if (icons.length < ICONS.length) {
    console.warn('build/icons: missing sizes — run `node tools/render-icon.js`');
  }

  writeFileSync(join(dist, 'manifest.webmanifest'), JSON.stringify({
    name: 'MASHENSTEIN: The Unpluggening',
    short_name: 'MASHENSTEIN',
    description: 'A game stitched together from parts of other games.',
    start_url: './',
    scope: './',
    display: 'standalone',
    orientation: 'landscape',
    background_color: '#0b0b14',
    theme_color: '#0b0b14',
    icons: icons.map((size) => ({
      src: `icon-${size}.png`, sizes: `${size}x${size}`, type: 'image/png',
      purpose: size === 512 ? 'any maskable' : 'any',
    })),
  }, null, 2));
  console.log(`dist/sw.js + manifest written (build ${version})`);
  return version;
}

function emit(result) {
  const js = result.outputFiles[0].text;
  const template = readFileSync(join(root, 'build/template.html'), 'utf8')
    .replace('__BUILD_TIMESTAMP__', buildTimestamp());
  // Inline safely: </script> inside the bundle would terminate the tag early.
  const safe = js.replace(/<\/script/gi, '<\\/script');
  // Stamp goes ahead of the bundle so it is set before any module code reads it.
  const html = template.replace('/*__BUNDLE__*/', () => buildStamp() + safe);
  mkdirSync(join(root, 'dist'), { recursive: true });
  writeFileSync(join(root, 'dist/index.html'), html);
  console.log(`dist/index.html written (${(html.length / 1024).toFixed(0)} KB)`);

  // Watch builds deliberately skip the service worker: a network-first worker
  // is still one more thing between a save and a refresh, and the dev server
  // has nothing to keep current. With no sw.js to fetch, registration 404s
  // and gives up.
  if (!watch) emitAppShell(html);

  // Versioned outputs driven by releases/versions.json.
  // Each key becomes a dist/<version>/index.html served by GitHub Pages.
  const manifestPath = join(root, 'releases/versions.json');
  if (existsSync(manifestPath)) {
    const versions = JSON.parse(readFileSync(manifestPath, 'utf8'));
    for (const [version, entry] of Object.entries(versions)) {
      // JSON has no comments, and a "_comment" key is no help here because
      // every key becomes a directory -- it would publish dist/_comment/. So
      // an entry is either the bare filename or {file, note}, and the note
      // rides along with the version it explains rather than sitting in a
      // sibling file that drifts out of sync. Nothing but a human reads it.
      const filename = typeof entry === 'string' ? entry : entry?.file;
      if (!filename) {
        console.warn(`releases/versions.json: ${version} has no file, skipping`);
        continue;
      }
      const src = join(root, 'releases', filename);
      if (!existsSync(src)) {
        console.warn(`releases/versions.json: ${filename} not found, skipping ${version}`);
        continue;
      }
      const destDir = join(root, 'dist', version);
      mkdirSync(destDir, { recursive: true });
      copyFileSync(src, join(destDir, 'index.html'));
      console.log(`dist/${version}/index.html written from releases/${filename}`);
    }
  }
}

if (watch) {
  const ctx = await esbuild.context({
    ...options,
    plugins: [{
      name: 'emit-html',
      setup(build) {
        build.onEnd((result) => { if (!result.errors.length) emit(result); });
      },
    }],
  });
  await ctx.watch();
  const { hosts, port } = await ctx.serve({ servedir: join(root, 'dist') });
  console.log(`dev server: http://${hosts[0] ?? 'localhost'}:${port}/`);
} else {
  emit(await esbuild.build(options));
}
