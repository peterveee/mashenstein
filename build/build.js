// Build two deliberately separate entry points:
//   gate.js -> inlined into index.html, small enough to decide whether an
//              iPhone may play before any game code or assets are requested.
//   game.js -> requested only after that gate permits the platform.
//
// tools/archive-release.js combines the pair for durable historical snapshots;
// the deployed current build remains split so a browser-only iPhone never
// downloads or evaluates the game.
import esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const watch = process.argv.includes('--watch');

const options = {
  entryPoints: {
    gate: join(root, 'src/gate.js'),
    game: join(root, 'src/main.js'),
  },
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  minify: !watch,
  sourcemap: watch ? 'inline' : false,
  // We write both public outputs ourselves after putting the gate into the
  // template. In watch mode esbuild's serve layer also exposes its in-memory
  // outputs; park those under a private URL so raw /game.js cannot shadow the
  // stamped dist/game.js that enables dev mode.
  outdir: watch ? join(root, 'dist/.esbuild') : join(root, 'dist'),
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
function emitAppShell(html, gameJs) {
  const dist = join(root, 'dist');
  // Version = a hash of the page itself, so sw.js changes its own bytes on
  // every real change to the game and stays byte-identical when nothing moved.
  // That byte difference is the only thing a browser checks to decide a worker
  // is new, and a version that churned on every build (a timestamp, say) would
  // reinstall the worker for nothing.
  const version = createHash('sha1').update(html).update(gameJs).digest('hex').slice(0, 10);
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
    // iPhone landscape is enforced by the lifecycle overlay. Keeping the
    // manifest open lets installed iPad and Android builds rotate freely.
    orientation: 'any',
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

function output(result, name) {
  const found = result.outputFiles.find((file) => file.path.endsWith(`/${name}.js`));
  if (!found) throw new Error(`esbuild did not produce ${name}.js`);
  return found.text;
}

function emit(result) {
  const gateJs = output(result, 'gate');
  const gameJs = buildStamp() + output(result, 'game');
  const timestamp = buildTimestamp();
  const template = readFileSync(join(root, 'build/template.html'), 'utf8')
    .replaceAll('__BUILD_TIMESTAMP__', timestamp);
  // Inline safely: </script> inside the gate would terminate the tag early.
  const safeGate = gateJs.replace(/<\/script/gi, '<\\/script');
  const html = template.replace('/*__GATE_BUNDLE__*/', () => safeGate);
  mkdirSync(join(root, 'dist'), { recursive: true });
  writeFileSync(join(root, 'dist/index.html'), html);
  writeFileSync(join(root, 'dist/game.js'), gameJs);
  console.log(`dist/index.html written (${(html.length / 1024).toFixed(0)} KB gate)`);
  console.log(`dist/game.js written (${(gameJs.length / 1024).toFixed(0)} KB game)`);

  // Watch builds deliberately skip the service worker: a network-first worker
  // is still one more thing between a save and a refresh, and the dev server
  // has nothing to keep current. With no sw.js to fetch, registration 404s
  // and gives up.
  if (!watch) emitAppShell(html, gameJs);

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
